#!/usr/bin/env node
/* ==========================================================================
   SITE TEST SUITE
   Runs against the generated output, so it tests what actually deploys.
       npm test
   Exits non-zero on any failure, which is what the pre-push hook checks.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { isPending } from '../lib/routes.mjs';
import { CLUB } from '../lib/club.mjs';

const ROOT = process.cwd();
let pass = 0;
const fails = [];
const warns = [];

const ok = (name) => { pass++; };
const fail = (name, detail) => fails.push(`${name}${detail ? ` - ${detail}` : ''}`);
const warn = (name) => warns.push(name);
function check(name, cond, detail) { cond ? ok(name) : fail(name, detail); }

const htmlFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || ['node_modules', 'src', 'legacy', 'prototypes', 'recovery', 'migrations', 'scripts', 'design', 'newsletter', 'youtube'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    // Search Console verification files are bare tokens by design.
    else if (e.name.endsWith('.html') && !/^google[0-9a-f]+\.html$/.test(e.name)) {
      htmlFiles.push(path.relative(ROOT, p));
    }
  }
})(ROOT);

console.log(`Testing ${htmlFiles.length} generated pages\n`);

const pages = new Map();
for (const f of htmlFiles) pages.set(f, fs.readFileSync(path.join(ROOT, f), 'utf8'));

/* Attribute values are escaped in the output, so a length measured on the raw
   markup counts "&#39;" as six characters instead of one. */
const unesc = (s) => String(s)
  .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/* ---- 1. Document structure ---- */
for (const [f, h] of pages) {
  const isControl = f === 'control.html';
  check(`${f}: doctype`, /^<!doctype html>/i.test(h));
  check(`${f}: lang attribute`, /<html lang="en-GB">/.test(h));
  check(`${f}: has a title`, /<title>[^<]{5,}<\/title>/.test(h));
  check(`${f}: has meta description`, /<meta name="description" content="[^"]{20,}"/.test(h));
  check(`${f}: has canonical`, /<link rel="canonical" href="https:\/\//.test(h));

  /* Description length. Under ~120 characters a search engine pads the snippet
     with whatever text it scrapes off the page; over ~155 it truncates
     mid-sentence. Ten pages used to ship the retired site's copy, running from
     74 to 158, so this is measured rather than trusted. Measured UNESCAPED:
     every apostrophe in "Sue's Angels FC" is six characters as &#39; and would
     otherwise inflate the count past the limit on its own.

     The control panel is exempt: it is noindex and has no snippet to get
     wrong. */
  if (!isControl) {
    const dm = h.match(/<meta name="description" content="([^"]*)"/);
    const dtext = dm ? unesc(dm[1]) : '';
    check(`${f}: meta description 120-155 chars`,
      dtext.length >= 120 && dtext.length <= 155, `${dtext.length} chars`);
  }

  /* A share card with no alt text is unreadable to anyone using a screen
     reader on the platform that unfurls it. No page had one. */
  check(`${f}: og:image has alt text`, /<meta property="og:image:alt" content="[^"]{5,}"/.test(h));
  check(`${f}: has viewport`, /name="viewport"/.test(h));

  const h1s = (h.match(/<h1[\s>]/g) || []).length;
  // The control panel is a single-page app: the auth gate and the app view are
  // mutually exclusive, and a `hidden` container is removed from the
  // accessibility tree, so exactly one h1 is exposed at a time.
  const expectedH1 = isControl ? 2 : 1;
  check(`${f}: expected h1 count`, h1s === expectedH1, `found ${h1s}, expected ${expectedH1}`);

  if (!isControl) {
    check(`${f}: has skip link`, /class="skip"/.test(h));
    /* Both assertions predate the July rebuild and had gone stale against the
       shipped markup: the home shell emits `<main id="main" tabindex="-1">`
       (the attribute is what lets the skip link move focus) and its footer is
       `.ft2`, not the retired `.ftr`. Matching the element and the id rather
       than an exact string keeps the check honest without pinning it to one
       attribute set. */
    check(`${f}: has main landmark`, /<main id="main"[\s>]/.test(h));
    check(`${f}: has footer`, /<footer[^>]*class="(ftr|ft2)"/.test(h));
  }
  // Heading order must not skip a level
  const levels = [...h.matchAll(/<h([1-6])[\s>]/g)].map((m) => +m[1]);
  let skipped = null;
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1) { skipped = `h${levels[i - 1]} -> h${levels[i]}`; break; }
  }
  check(`${f}: no skipped heading level`, !skipped, skipped);
}

/* ---- 2. Escaped entities leaking into visible text ---- */
for (const [f, h] of pages) {
  const bad = h.match(/&amp;(middot|rsquo|ndash|mdash|times|rarr|larr|hellip|ldquo|rdquo);/g);
  check(`${f}: no double-escaped entities`, !bad, bad ? bad.slice(0, 3).join(', ') : '');
}

/* ---- 3. Images: alt attributes and resolvable sources ---- */
const missingAssets = new Set();
for (const [f, h] of pages) {
  const imgs = [...h.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  const noAlt = imgs.filter((t) => !/\salt=/.test(t));
  check(`${f}: every img has alt`, noAlt.length === 0, noAlt.length ? `${noAlt.length} without alt` : '');

  const noDims = imgs.filter((t) => !/\swidth=/.test(t) || !/\sheight=/.test(t));
  if (noDims.length) warn(`${f}: ${noDims.length} img without width/height (layout shift risk)`);

  for (const m of h.matchAll(/(?:src|srcset)="(\/[^"]+?)"/g)) {
    const src = m[1].split(/[?#]/)[0].split(' ')[0];
    if (!src.startsWith('/')) continue;
    if (!fs.existsSync(path.join(ROOT, src.slice(1)))) missingAssets.add(`${f} -> ${src}`);
  }
}
check('all referenced assets exist', missingAssets.size === 0,
  [...missingAssets].slice(0, 6).join('; '));

/* ---- 4. Internal links resolve ----
   Split two ways while the site is rebuilt page by page. A link to a route
   still awaiting its rebuild is expected to 404 locally and is counted, not
   failed; anything else is a real broken link. Without the split the suite
   reported one deliberate decision as fourteen failures, which is the fastest
   way to teach yourself to ignore a red test. */
const brokenLinks = new Set();
const pendingLinks = new Set();
for (const [f, h] of pages) {
  for (const m of h.matchAll(/href="(\/[^"#?]*)"/g)) {
    const href = m[1];
    if (href === '/') continue;
    if (href.startsWith('/api/')) continue;
    const target = href.slice(1);
    if (fs.existsSync(path.join(ROOT, target))) continue;
    if (isPending(target)) pendingLinks.add(href);
    else brokenLinks.add(`${f} -> ${href}`);
  }
}
check('no broken internal links', brokenLinks.size === 0,
  [...brokenLinks].slice(0, 8).join('; '));
if (pendingLinks.size) {
  warn(`${pendingLinks.size} links point at routes awaiting rebuild (expected): `
    + `${[...pendingLinks].slice(0, 6).join(' ')}${pendingLinks.size > 6 ? ' ...' : ''}`);
}

/* ---- 5. Structured data parses ---- */
let schemaCount = 0;
for (const [f, h] of pages) {
  for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); schemaCount++; }
    catch (e) { fail(`${f}: schema JSON invalid`, e.message); }
  }
}
ok(`${schemaCount} structured-data blocks parse`);
console.log(`  ${schemaCount} JSON-LD blocks valid`);

/* ---- 6. Asset version consistency ----
   Mixed ?v= values across pages was a recurring production bug. */
const versions = new Set();
for (const [, h] of pages) {
  for (const m of h.matchAll(/sa\.(?:css|js)\?v=([a-z0-9]+)/g)) versions.add(m[1]);
}
check('one asset version across all pages', versions.size === 1,
  `found ${versions.size}: ${[...versions].join(', ')}`);

/* ---- 7. Overflow guards ---- */
const css = fs.readFileSync(path.join(ROOT, 'sa.css'), 'utf8');
const homeCssSheet = fs.readFileSync(path.join(ROOT, 'home.css'), 'utf8');
check('html has overflow-x hidden', /html\s*\{[^}]*overflow-x:\s*hidden/.test(css));
const rawMinmax = [...css.matchAll(/minmax\((\d+px)/g)];
check('no fixed-px minmax without min() guard', rawMinmax.length === 0,
  rawMinmax.length ? `${rawMinmax.length} unguarded minmax` : '');

/* ---- 8. Reduced motion honoured ---- */
check('prefers-reduced-motion block present', /@media \(prefers-reduced-motion: reduce\)/.test(css));
check('atmosphere animation stops on reduced motion',
  /prefers-reduced-motion[\s\S]{0,400}\.atmos__blob\s*\{\s*animation:\s*none/.test(css));

/* ---- 9. Themes ---- */
/* There is one theme. These three used to assert the opposite: that a light
   theme existed, that the head script restored a stored preference, and that
   the page advertised both schemes to the browser. The club is black and
   orange, so 81 light rules, the switcher and the stored preference are gone,
   and the assertions now guard that they stay gone. A stray light rule is how
   the control panel came to render cream on a machine set to light mode. */
check('no light theme in either stylesheet',
  !/\[data-theme=['"]light['"]\]/.test(css) && !/\[data-theme=['"]light['"]\]/.test(homeCssSheet));
check('no theme switcher ships',
  ![...pages.values()].some((h) => /data-theme-toggle/.test(h)));

/* The rebuilt site is dark by default and turns light ONLY when the visitor
   asks: home.css has no prefers-color-scheme rule and the boot script reads
   data-theme from localStorage and nothing else.

   This used to assert the opposite, because the retired design followed the
   system. The control panel's sheet still carried three of those blocks after
   the rebuild, so on a machine set to light mode the panel alone rendered
   cream while all 20 public pages stayed black and orange. Asserting the rule
   on BOTH sheets is what keeps the two consistent; asserting it on one is how
   they drifted. */
for (const [name, sheet] of [['sa.css', css], ['home.css', homeCssSheet]]) {
  check(`${name}: theme is chosen, not inherited from the system`,
    !/@media \(prefers-color-scheme:/.test(sheet.replace(/\/\*[\s\S]*?\*\//g, '')));
}
check('boot script marks that JS ran', /classList\.add\('js'\)/.test(pages.get('index.html')));
check('boot script no longer restores a theme', !/sa-theme/.test(pages.get('index.html')));
check('page declares a single colour scheme',
  [...pages.values()].every((h) => /<meta name="color-scheme" content="dark">/.test(h)));

/* ---- 10. Contrast on the text tokens ---- */
function lum(hex) {
  const c = hex.replace('#', '');
  const v = [0, 2, 4].map((i) => {
    const s = parseInt(c.slice(i, i + 2), 16) / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
function ratio(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
const PAIRS = [
  ['dark: body text on canvas', '#F7F5F2', '#000000', 4.5],
  ['dark: muted text on canvas', '#A8A8B3', '#000000', 4.5],
  ['dark: subtle text on canvas', '#82828F', '#000000', 4.5],
  ['dark: brand text on canvas', '#FF8B53', '#000000', 4.5],
  ['dark: text on brand button', '#1A0A02', '#FF7034', 4.5],
  ['light: body text on canvas', '#14100D', '#FFF8F3', 4.5],
  ['light: muted text on canvas', '#5A5048', '#FFF8F3', 4.5],
  ['light: subtle text on canvas', '#7A6E64', '#FFF8F3', 4.5],
  ['light: brand text on canvas', '#C2410C', '#FFF8F3', 4.5],
  ['light: text on brand button', '#1A0A02', '#FF7034', 4.5],
];
for (const [name, fg, bg, min] of PAIRS) {
  const r = ratio(fg, bg);
  check(`contrast sa.css ${name} (${r.toFixed(2)}:1 >= ${min})`, r >= min, `${r.toFixed(2)}:1`);
}

/* ---- 10b. Contrast on the REBUILT palette, read from the shipped sheet ----
   The list above is a set of literal hexes from sa.css, which now serves only
   the control panel and the routes still awaiting rebuild. Every page a
   visitor sees loads home.css, whose palette is different in every value, and
   nothing was checking it: the check passed while the rebuilt light theme put
   dark ink on a dark data panel, because neither colour appeared in the list.

   So read the tokens out of the generated sheet instead of restating them. A
   token that changes now changes the test with it. */
{
  /* Read from the SOURCE, not from home.css. The shipped sheet is minified
     now, so a regex looking for a newline inside :root{} found nothing and
     the whole suite died on an undefined token. The values are identical
     either way, and the point of this block was never to test formatting: it
     was to stop the palette being restated in the test and drifting. */
  const homeCss = fs.readdirSync(path.join(ROOT, 'src', 'styles-home'))
    .filter((f) => f.endsWith('.css')).sort()
    .map((f) => fs.readFileSync(path.join(ROOT, 'src', 'styles-home', f), 'utf8'))
    .join('\n');
  const block = (re) => (re.exec(homeCss) || [, ''])[1];
  const toks = (s) => Object.fromEntries(
    [...s.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
  const dark = toks(block(/:root\s*\{([\s\S]*?)\n\}/));
  const light = { ...dark, ...toks(block(/html\[data-theme="light"\]\s*\{([\s\S]*?)color-scheme:\s*light;/)) };

  /* Composite a token onto a solid backdrop. Values here are either #rrggbb
     or an rgba() lift, and a lift has to be flattened before its luminance
     means anything. */
  const solid = (v, onto) => {
    const m = /rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.]+))?\s*\)/.exec(v);
    if (!m) return v;
    const [r, g, b] = [+m[1], +m[2], +m[3]];
    const a = m[4] === undefined ? 1 : +m[4];
    const bg = [1, 3, 5].map((i) => parseInt(onto.replace('#', '').slice(i - 1, i + 1), 16));
    const mix = [r, g, b].map((c, i) => Math.round(c * a + bg[i] * (1 - a)));
    return `#${mix.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
  };
  const resolve = (t, k, onto) => {
    let v = t[k];
    for (let i = 0; i < 4 && /^var\(/.test(v || ''); i++) v = t[/var\((--[\w-]+)\)/.exec(v)[1]];
    return solid(v, onto);
  };

  for (const [mode, t] of [['dark', dark], ['light', light]]) {
    const canvas = t['--navy-deep'];
    const slab = t['--slab-top'];
    for (const [label, tok, on] of [
      ['body text on canvas', '--fg', canvas],
      ['secondary text on canvas', '--ink-2', canvas],
      ['tertiary text on canvas', '--ink-3', canvas],
      ['brand text on canvas', '--volt-text', canvas],
      // The data panels: this pair is what the slab bug broke.
      ['body text on data panel', '--fg', slab],
      ['secondary text on data panel', '--ink-2', slab],
      ['tertiary text on data panel', '--ink-3', slab],
    ]) {
      const fg = resolve(t, tok, on);
      const r = ratio(fg, on);
      check(`contrast home.css ${mode}: ${label} (${r.toFixed(2)}:1)`, r >= 4.5,
        `${fg} on ${on} = ${r.toFixed(2)}:1`);
    }
    // Dark ink on the orange fill, in both themes.
    const onBrand = ratio(resolve(t, '--text-on-brand', t['--volt']), t['--volt']);
    check(`contrast home.css ${mode}: text on brand (${onBrand.toFixed(2)}:1)`, onBrand >= 4.5,
      `${onBrand.toFixed(2)}:1`);
  }
}

/* ---- 11. Forms are labelled and accessible ---- */
for (const [f, h] of pages) {
  const inputs = [...h.matchAll(/<(input|textarea|select)\b[^>]*>/g)].map((m) => m[0]);
  for (const t of inputs) {
    if (/type="(hidden|submit|button)"/.test(t)) continue;
    const id = (t.match(/\sid="([^"]+)"/) || [])[1];
    const labelled = id ? h.includes(`for="${id}"`) : false;
    const aria = /aria-label=|aria-labelledby=/.test(t);
    /* A <label> that wraps its control is a valid association too. Counted
       rather than matched inside a fixed window: the old 400-character
       lookback failed on a label whose icon markup pushed the input out of
       range, which is a property of the icon and not of the labelling. */
    const idx = h.indexOf(t);
    const before = h.slice(0, idx);
    const opens = (before.match(/<label\b/g) || []).length;
    const closes = (before.match(/<\/label>/g) || []).length;
    const wrapped = opens > closes;
    if (!labelled && !aria && !wrapped) fail(`${f}: unlabelled form control`, t.slice(0, 80));
  }
  if (/data-enquiry/.test(h)) {
    check(`${f}: enquiry form has an error summary`, /data-error-summary/.test(h));
    check(`${f}: enquiry form has a status region`, /role="status"/.test(h));
  }
}

/* ---- 12. Security posture in the deployed config ---- */
const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const hdrs = vercel.headers.find((x) => x.source === '/(.*)').headers.map((x) => x.key);
for (const k of ['Content-Security-Policy', 'Strict-Transport-Security', 'X-Content-Type-Options', 'Referrer-Policy']) {
  check(`header ${k} set`, hdrs.includes(k));
}
const csp = vercel.headers[0].headers.find((x) => x.key === 'Content-Security-Policy').value;
check('CSP has object-src none', /object-src 'none'/.test(csp));
check('CSP has frame-ancestors', /frame-ancestors/.test(csp));
/* The panel swaps its two screens with the `hidden` property, and `hidden` is
   only a browser default that any author `display` rule outranks. Both screens
   set display: grid on themselves, so for a while neither could be hidden at
   all: the app shell rendered under the login card when signed out, and the
   login card stayed on top of the panel after a successful sign-in. The
   blanket rule is the fix; this is here so removing it fails loudly. */
{
  const cpCss = fs.readFileSync(path.join(ROOT, 'control.css'), 'utf8');
  check('control panel enforces the hidden attribute',
    /\[hidden\]\s*\{[^}]*display:\s*none\s*!important/.test(cpCss));
  /* And the two screens it applies to are still the two screens. */
  const cpHtml = pages.get('control.html') || '';
  check('control panel still has both screens', /id="cp-gate"/.test(cpHtml) && /id="cp-app"[^>]*hidden/.test(cpHtml));

  /* The panel's stylesheet is the panel's. It used to be bundled into sa.css,
     so every visitor to the website downloaded the whole control panel's
     styling to render a page that cannot show a pixel of it. If a panel class
     reappears in sa.css this has silently regressed. */
  const publicCss = fs.readFileSync(path.join(ROOT, 'sa.css'), 'utf8');
  check('panel CSS is not in the public bundle',
    !/\.cp-side|\.cp-nav__item|\.mform__|\.pitch__grass/.test(publicCss),
    'control panel styling has leaked back into sa.css');
  check('control.html links its own stylesheet',
    /href="\/control\.css\?v=/.test(cpHtml));
  /* And it still links the shared one, because it uses .btn, .panel, .field,
     .modal and .tabs from it. Dropping that link is how the panel becomes
     unstyled while every test above still passes. */
  check('control.html still links the shared stylesheet',
    /href="\/sa\.css\?v=/.test(cpHtml));
}

check('control panel is noindex in headers',
  vercel.headers.some((x) => x.source === '/control.html' && x.headers.some((y) => y.key === 'X-Robots-Tag')));
check('control panel page is noindex', /noindex/.test(pages.get('control.html')));

/* No service-role key may ever appear in shipped output. */
const shipped = ['sa.js', 'control.js', ...htmlFiles];
for (const f of shipped) {
  const body = fs.readFileSync(path.join(ROOT, f), 'utf8');
  check(`${f}: no service-role key`, !/service_role|sb_secret_|SUPABASE_SERVICE/.test(body));
}

/* ---- 12b. The league page agrees with itself ----
   The league page renders the club's season twice from the same source: once
   as a row in the division table, once as W/D/L letters on each month of
   results. They must match.

   They did not. Three of the eighteen league games were awarded as walkovers
   and carry no score, so comparing +undefined to +undefined produced neither
   a win nor a defeat and fell through to a draw. The page showed three draws
   against a published record of W18 D0 L0. This is the same class of bug
   that npm run verify exists to catch, but it lived in the rendering rather
   than in the dataset, so only a check on the output could see it. */
{
  const h = pages.get('league.html');
  if (h) {
    /* The club appears as an is-us row in both the division table and the
       scorer chart, so anchor on the table's own position cell rather than
       on the class, which would otherwise match whichever came first. */
    const row = /<tr[^>]*class="[^"]*is-us[^"]*"[^>]*>([\s\S]*?)<\/tr>/g;
    let cells = [];
    for (const m of h.matchAll(row)) {
      if (!m[1].includes('lg-tbl__pos')) continue;
      cells = [...m[1].matchAll(/<td[^>]*>([^<]*)<\/td>/g)].map((x) => x[1].trim());
      break;
    }
    // Position is the first cell; P W D L are the four that follow the club.
    const nums = cells.filter((c) => /^-?\d+$/.test(c)).map(Number).slice(1);
    const letters = [...h.matchAll(/class="lg-f lg-f--(\w)"/g)].map((m) => m[1]);
    const tally = (x) => letters.filter((l) => l === x).length;
    const [played, won, drawn, lost] = nums;
    check('league page: form letters match the table row',
      letters.length === played && tally('w') === won && tally('d') === drawn && tally('l') === lost,
      `table says P${played} W${won} D${drawn} L${lost}, `
      + `letters say ${letters.length} games W${tally('w')} D${tally('d')} L${tally('l')}`);
    // A walkover has no scoreline, and must not be printed as one.
    const woRows = (h.match(/class="lg-res[^"]*is-wo/g) || []).length;
    check('league page: walkovers marked, not scored', !/lg-res__score">\s*-\s*</.test(h),
      `${woRows} walkover rows`);
  }
}

/* ---- 12c. No helper's return value printed as page text ----
   auraFor() returns the NAME of an atmosphere variant, to be passed into
   sitePreMain(). Concatenated beside it instead, it printed the bare word
   "ember" into the top of the records page as visible text. The mistake is
   silent: valid HTML, no broken link, nothing a structural check would see,
   and it looked like a rendering glitch rather than a bug in a template.

   Any of these words standing alone as body text is that mistake. */
for (const [f, h] of pages) {
  const body = h.slice(h.indexOf('<body'));
  const stray = ['ember', 'fold', 'silk', 'swirl']
    .filter((w) => new RegExp(`>\\s*${w}\\s*<`, 'i').test(body));
  check(`${f}: no aura variant name printed as text`, stray.length === 0, stray.join(', '));
}

/* ---- 12d. Every class a page uses is defined by a sheet that page loads ----
   The CSS split gave each page its own band, which introduced a failure mode
   the single sheet could not have: a component defined in one band and used
   by another page renders completely unstyled, with no error anywhere. The
   records page shipped its filter strip as three words of plain text because
   .lg-chip was defined in the league band.

   So resolve each page's own stylesheets and check the classes it actually
   uses against them. Shared components have to live in the core, which is
   exactly the rule the split needs and cannot enforce on its own. */
{
  const sheetCache = new Map();
  const classesIn = (file) => {
    if (!sheetCache.has(file)) {
      let text = '';
      try { text = fs.readFileSync(path.join(ROOT, file), 'utf8'); } catch { /* missing */ }
      sheetCache.set(file, new Set([...text.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1])));
    }
    return sheetCache.get(file);
  };
  /* State classes are added by script at runtime and legitimately have no
     rule of their own on some pages; utility classes come from the shell. */
  const RUNTIME = /^(is-|has-|js$|no-js)/;
  // Everything defined by any shipped stylesheet, band or core.
  const elsewhere = new Set();
  for (const s of fs.readdirSync(ROOT).filter((f) => f.endsWith('.css'))) {
    for (const c of classesIn(s)) elsewhere.add(c);
  }
  let checked = 0;
  const missing = [];
  for (const [f, h] of pages) {
    const sheets = [...h.matchAll(/<link rel="stylesheet" href="\/([^?"]+)/g)].map((m) => m[1]);
    if (!sheets.length) continue;
    const defined = new Set();
    for (const s of sheets) for (const c of classesIn(s)) defined.add(c);
    const used = new Set();
    for (const m of h.matchAll(/\sclass="([^"]+)"/g)) {
      for (const c of m[1].trim().split(/\s+/)) if (c && !RUNTIME.test(c)) used.add(c);
    }
    checked++;
    /* A class defined NOWHERE is a leftover hook in the markup: untidy, but
       it styles nothing on any page and never looked different. A class
       defined in a band this page does NOT load is the split bug: it is
       styled somewhere, so it works on one page and silently does not on
       this one. Only the second is a failure. */
    const gaps = [...used]
      .filter((c) => !defined.has(c))
      .filter((c) => elsewhere.has(c));
    if (gaps.length) missing.push(`${f}: ${gaps.slice(0, 6).join(' ')}`);
  }
  check(`no page uses a class defined only in another page's stylesheet (${checked} pages)`,
    missing.length === 0, missing.slice(0, 3).join(' | '));
}

/* ---- 12e. A scoreline shown without a venue reads our way round ----
   Matches are stored home-goals-first, which is right wherever the two clubs
   appear in home-away order beside the score. On a card that says only
   "v Balham Bteckerz" it inverts every away result, and fifteen of the
   club's thirty matches were away: the record for the biggest win in the
   club's history was displayed as "0-12".

   Any card whose label claims a win must show at least as many goals for as
   against, and a defeat the reverse. That is checkable from the output
   alone. */
{
  const h = pages.get('records.html');
  if (h) {
    const bad = [];
    for (const m of h.matchAll(/<li class="rc-card"[\s\S]*?<\/li>/g)) {
      const card = m[0];
      const score = (/class="rc-card__v">(\d+)-(\d+)</.exec(card) || []);
      if (!score.length) continue;
      const [, us, them] = score.map(Number);
      const label = (/class="rc-card__l">([^<]*)/.exec(card) || [, ''])[1].toLowerCase();
      if (/win|won/.test(label) && us < them) bad.push(`"${label.trim()}" shows ${us}-${them}`);
      if (/defeat|lost/.test(label) && us > them) bad.push(`"${label.trim()}" shows ${us}-${them}`);
    }
    check('records: win and defeat cards read from the club\'s side',
      bad.length === 0, bad.join(', '));
  }
}

/* ---- 13. Robots and sitemap ---- */
const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
/* Counted against what was actually built rather than a fixed floor. A
   hard-coded "more than 50" was written for the finished site and turns into
   a standing failure the moment the build is deliberately partial; covering
   every built page is the invariant that holds at any size. */
const publicPages = [...pages.keys()].filter((f) => f !== 'control.html' && f !== '404.html');
check('sitemap covers every built page', sitemapUrls.length >= publicPages.length,
  `${sitemapUrls.length} urls for ${publicPages.length} public pages`);
check('sitemap excludes control panel', !sitemap.includes('control.html'));
check('sitemap excludes 404', !sitemap.includes('404.html'));
const robots = fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8');
check('robots references the sitemap', robots.includes('sitemap.xml'));
check('robots disallows the control panel', /Disallow:\s*\/control\.html/.test(robots));

// Every sitemap URL must exist on disk
const missingFromDisk = sitemapUrls.filter((u) => {
  const rel = u.replace(/^https?:\/\/[^/]+\//, '');
  return rel && !fs.existsSync(path.join(ROOT, rel));
});
check('every sitemap URL exists', missingFromDisk.length === 0, missingFromDisk.slice(0, 4).join(', '));

/* ---- 13b. Share cards ----
   og:image must be one absolute URL that resolves. Two failure modes worth
   catching: a card referenced but never generated (the tool is run by hand,
   not by the build, so the two can fall out of step), and the site origin
   prefixed onto an already-absolute URL, which yields a tag containing two
   URLs and unfurls as nothing at all. */
const badOg = [];
const ogSeen = new Set();
for (const [f, h] of pages) {
  const m = h.match(/<meta property="og:image" content="([^"]*)"/);
  if (!m) { badOg.push(`${f}: no og:image`); continue; }
  const url = unesc(m[1]);
  ogSeen.add(url);
  if ((url.match(/https?:\/\//g) || []).length !== 1 || !url.startsWith('http')) {
    badOg.push(`${f}: malformed og:image "${url.slice(0, 70)}"`);
    continue;
  }
  /* Only our own origin can be checked on disk; a Supabase-hosted album cover
     is verified by the link checker's own rules, not here. */
  if (url.startsWith('https://www.suesangelsfc.co.uk/')) {
    const rel = url.replace('https://www.suesangelsfc.co.uk/', '');
    if (!fs.existsSync(path.join(ROOT, rel))) badOg.push(`${f}: og:image missing on disk (${rel})`);
  }
}
check('every og:image is one resolvable URL', badOg.length === 0, badOg.slice(0, 4).join(' | '));
/* One card for the whole site was the bug this replaced. */
check('share cards are not all identical', ogSeen.size >= 15, `${ogSeen.size} distinct`);

/* ---- 14. Performance budgets ----
   Gzipped bytes, because that is what a visitor actually downloads: Vercel
   compresses all four of these, and they come down to roughly a fifth of
   source.

   These were raw-byte budgets, which measured the wrong thing. The build
   concatenates and does not minify, so a raw budget prices the explanatory
   comments this codebase deliberately keeps rather than the code, and it had
   already been raised once for that reason alone (sa.js, 40 to 48). Comments
   compress to almost nothing, so a gzip budget tracks real weight and stops
   punishing the thing that makes this repo readable.

   home.css used to carry every rebuilt page's band, so it grew by one file
   per page and its budget was raised twice to keep pace. That made the budget
   meaningless: it measured how many pages had been built, not how heavy any
   one of them was. The sheet is now core-only, and each page links its own
   band from src/styles-home/pages, so this number stops moving as pages are
   added and starts meaning something again.

   sa.js went 18 -> 22 when the stats table landed. It is now carrying five
   pages' worth of behaviour (squad filters, the profile's season tabs and
   scrubable plot, card tilt, the stats table's sort, search and per-start
   switch) and every page downloads all of it, even though each block returns
   immediately when its markup is absent. The same split this file now does
   for CSS is the fix, and worth doing before this budget is raised again. */
/* home.css 24 -> 26. This one is a real growth, not a drift: components used
   by more than one page have to live in the core, and moving the chip strip,
   the crest fallback, the icon primitive and the prose block out of the band
   files is what made them correct on every page instead of only the page they
   happened to be written for. The per-page total below is the figure that
   guards weight, and it did not move. */
/* control.js 16 -> 24, once, rather than a kilobyte at a time.

   Two features landed that the panel genuinely lacked: match video, which the
   website had rendered on three pages for months with no way to write the
   field, and a real fixture form replacing a raw JSON textarea that asked a
   volunteer to invent a row key and hand-type a JSON document. Replacing JSON
   textareas with forms costs code; that is the trade being made deliberately.

   This budget also guards something different from the other three.
   control.js is behind auth, noindex, and fetched by a handful of people a
   season, never by a visitor to the website. Weight here costs almost nobody
   anything.

   If it approaches 24 the answer is NOT another raise. control.js ships all
   thirteen modules to someone who opens one, so the fix is to split it and
   load a module when its panel is first shown, exactly as the CSS was split
   per page. Raise this again and that work is being deferred, not avoided. */
/* sa.js 22 -> 24: the cookie consent banner and analytics loader are back.
   The retired site had both and the rebuild dropped them, which left the live
   site with no consent banner at all - a compliance problem rather than a
   missing nicety. Nothing third-party is fetched before the visitor chooses,
   so the weight buys a request that never happens rather than one that does. */
/* control.js 24 -> 30, and this is the LAST raise. The match editor now
   records what the retired one did - positions, the formation and a pitch,
   goal minutes and types, set-piece sources, cards, clean sheets, penalties
   saved and missed - and that is functionality coming back rather than drift,
   which is why it is allowed at all.

   But the number has gone 16, 18, 24, 30 in one sitting, and the reason has
   been the same every time: this file ships all thirteen modules to somebody
   who opens one. The next module added here must come with the split, not
   another line in this comment. */
/* control.js 30 -> 18, and sa.css 28 -> 22. THE SPLIT HAPPENED.

   The comment above said the next module added here had to come with it, and
   it did. Two things changed and both are structural rather than a diet:

   The panel's own stylesheet left sa.css. It was src/styles/70-control.css,
   inside the sheet every public page links, so a visitor reading the fixtures
   list downloaded the entire control panel's styling to render a page that
   cannot show a pixel of it. control.html links control.css on its own now.

   And the two heaviest modules left control.js: the match form (the pitch,
   the position codes, the pickers, five tabs) and the photograph tagger. They
   are fetched the first time their panel is opened and cached from then on,
   so signing in to read the inbox downloads neither.

   The numbers below are therefore ceilings over a smaller thing, not a raise.
   Each chunk gets its own, with a little headroom, and they guard different
   things. control.js is what everybody downloads on sign-in, so it is the one
   that matters and it is the one that got smaller: 32 -> 14KB.
   The chunk ceilings guard against a module quietly becoming enormous, not
   against the panel having features. A new panel goes in src/admin/lazy/ with
   its own line here. Adding one to control.js means everybody downloads it
   forever, which is the mistake this split exists to undo. */
/* THE BUILD MINIFIES NOW, so every one of these came down and none of them
   is a raise. Measured, before and after:

     sa.js      28 -> 15   (13.6 shipped)      home.css   26 -> 17  (15.3)
     sa.css     22 -> 13   (11.3)              control.js 17 -> 11  (9.5)
     control.css 9 -> 5    (3.6)               control-match.js 23 -> 14 (12.8)

   The comments this codebase is written around were being downloaded by
   every visitor, and they are for whoever reads the repository next. They
   stay in src/ and they no longer ship. A first visit to the home page is
   about twenty kilobytes lighter than it was this morning.

   The headroom above each shipped size is deliberate and small. A budget with
   nothing in reserve gets raised the first time anybody adds a feature, which
   is how the old sa.js ceiling went 18 -> 22 -> 24 -> 26 -> 28 while the file
   it guarded was half prose. These are close enough that a real regression
   trips them and a comment never can. */
const BUDGET = {
  'sa.css': 13,
  'home.css': 17,
  /* 15 -> 16, and stated rather than slipped in, because the paragraph above
     names exactly this as the failure mode.

     What bought it: 386 bytes for the home page's next-match card advancing
     itself. The build picks the next fixture correctly at the moment it runs
     and that answer is wrong from the first whistle of that match until
     somebody publishes again, which between two pre-season friendlies is a
     week of the front page leading with a game that has been played under a
     countdown reading "Kick-off". Trimmed first: the countdown was folded
     into the same block rather than querying the same card twice.
     Deliberately NOT bought by loosening anything else.

     This is the trade the ceiling exists to force somebody to write down. If
     the next raise cannot name its 400 bytes this plainly, it is drift, and
     the right answer then is to split sa.js per page the way the stylesheets
     already are: this feature ships to 101 pages to run on one. */
  'sa.js': 16,
  'control.css': 5,
  'control.js': 11,
  /* The heaviest, and fairly: the pitch, the position names, five tabs, the
     goal detail (what it was struck with, where from, what the ball was doing,
     who made it and how), and the composer that turns a coach's bullets into a
     match report. Fetched only by somebody who has opened Fixtures or Results,
     which is a handful of people a season. */
  'control-match.js': 14,
  /* News, gallery, recognition, badges and sponsors. The album editor is the
     weight: photographs visible, removable, reorderable and taggable in the
     album itself, four operations that all have to keep the parallel tag list
     in step. */
  'control-content.js': 11,
  /* Squad status is a fact about a player IN A SEASON, which is what stops
     "Retained for 26/27" being a string somebody has to remember to change
     and stops a trial lasting the rest of a career. The screen carries a
     season bar, reads three stored shapes, and works out new / retained /
     back at the club rather than asking anybody to keep them true. */
  'control-squad.js': 6,
  'control-coaches.js': 4,
  'control-photos.js': 4,
  /* Takes a player's picture straight from the gallery: the club has already
     tagged who is in six hundred photographs, and the site was making
     somebody find one on a phone and upload it again. The list is built from
     the albums rather than shipped in the seed, so nothing extra reaches a
     panel visitor who never opens this screen. */
  'control-photos-donations.js': 4,
  'control-pipeline.js': 4,
  'control-covers.js': 4,
  'control-video.js': 3,
  'control-hero.js': 3,
};
for (const [f, kb] of Object.entries(BUDGET)) {
  const raw = fs.readFileSync(path.join(ROOT, f));
  const size = zlib.gzipSync(raw, { level: 9 }).length / 1024;
  check(`${f} within ${kb}KB gzipped`, size <= kb,
    `${size.toFixed(1)}KB gzipped, ${(raw.length / 1024).toFixed(0)}KB raw`);
}

/* ---- A page band actually contains its page's styling ----
   p-player.css was silently reduced to a 2KB fragment when a second source
   file emitted the same name, and every player profile shipped unstyled while
   all 2,018 checks passed. Size alone would not have caught it either: the
   fragment was valid CSS. What catches it is asking whether the band contains
   the classes its page actually uses. */
{
  const BANDS = [
    ['p-player.css', ['pf-hero', 'pf-stat', 'pf-tabs']],
    ['p-squad.css', ['sq-cards', 'pc__shot', 'sq-grp']],
    ['p-campaign.css', ['camp__strip', 'camp__tip']],
    ['p-matches.css', ['mt-']],
    ['p-league.css', ['lg-']],
    ['p-stats.css', ['st-']],
  ];
  for (const [file, needles] of BANDS) {
    const css = fs.existsSync(path.join(ROOT, file))
      ? fs.readFileSync(path.join(ROOT, file), 'utf8') : '';
    const missing = needles.filter((n) => !css.includes(n));
    check(`${file}: carries its page's styling`, css.length > 4000 && !missing.length,
      !css.length ? 'missing entirely'
        : missing.length ? `no rules for ${missing.join(', ')}` : `only ${css.length} bytes`);
  }
}

/* ---- Positions are one list ----
   They were three: club.mjs knew 21 codes, the player profile knew 26, the
   control panel offered 22. The club's archive contains team sheets using RDM
   and LAM, which two of the three had never heard of, so a player page printed
   the raw code beside a proper name. */
{
  const seedJs = fs.readFileSync(path.join(ROOT, 'control-seed.js'), 'utf8');
  const seed = JSON.parse(seedJs.replace(/^window\.SA_SEED=/, '').replace(/;\s*$/, ''));
  const codes = new Set((seed.positions || []).map((p) => p.code));
  check('the panel is given the position list', codes.size >= 25, `${codes.size} positions`);

  /* Every position code in any stored team sheet must be one the site can
     name. This is the check that would have caught RDM. */
  const used = new Set();
  const live = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'recovered-live.json'), 'utf8'));
  for (const row of live.matches || []) {
    for (const s2 of (row.data || {}).starters || []) {
      for (const c of s2.positions || []) used.add(c);
    }
  }
  const orphans = [...used].filter((c) => !codes.has(c));
  check('every position in the archive has a full name', orphans.length === 0,
    orphans.length ? `no name for ${orphans.join(', ')}` : '');

  /* And nothing published is a bare code where a NAME belongs.

     The pitch diagram is exempt and deliberately so: a marker disc cannot hold
     "Left centre back", and a pitch diagram is the one place in football where
     everybody reads the short form. Those carry a <title> with the full name,
     which is asserted below. Everywhere else, a code printed as a position is
     the bug this list exists to stop. */
  for (const [f, h] of pages) {
    if (!f.startsWith('players/')) continue;
    const prose = h.replace(/<svg[\s\S]*?<\/svg>/g, '');
    const bare = prose.match(/>(?:RDM|LDM|LAM|RAM|LCM|RCM|LCB|RCB|CDM|CAM|LWB|RWB)</g);
    check(`${f}: no bare position codes in text`, !bare,
      bare ? `${bare.length} raw codes printed as a position name` : '');
    /* A code on the diagram must still be readable to a screen reader. */
    const marks = (h.match(/<text[^>]*>(?:<title>[^<]+<\/title>)?[A-Z]{2,3}<\/text>/g) || []);
    const silent = marks.filter((t) => !/<title>/.test(t));
    check(`${f}: every pitch marker names its position`, silent.length === 0,
      silent.length ? `${silent.length} markers with no title` : '');
  }

  /* Every position needs somewhere to stand, or the panel draws a team sheet
     with a player missing from the pitch. */
  const noXY = (seed.positions || []).filter((p) => typeof p.x !== 'number' || typeof p.y !== 'number');
  check('every position has a place on the pitch', noXY.length === 0,
    noXY.map((p) => p.code).join(', '));
}

/* ---- The split stays split ----
   Every one of these is a way the panel could quietly go back to shipping
   everything to everybody, or to shipping half of itself and breaking.

   READ FROM THE SOURCE, not from the shipped bundle. Everything here is a
   claim about the SHAPE of the code - which module lives in which file, what
   is published before what, whether a re-render replaces its body - and the
   shipped bundle is minified now, so every one of those regexes was matching
   against renamed variables and collapsed whitespace. They did not fail
   loudly either: half of them were negative assertions, which a rename turns
   green while proving nothing at all.

   What genuinely belongs against the OUTPUT stays there below: that the
   chunk URLs were stamped, that every chunk named is a file that exists, and
   that each one is cache-busted. Those are facts about the build, not about
   the source, and they are read back from `control.js` as shipped. */
{
  const srcDir = path.join(ROOT, 'src', 'admin');
  const core = fs.readdirSync(srcDir).filter((f) => f.endsWith('.js')).sort()
    .map((f) => fs.readFileSync(path.join(srcDir, f), 'utf8')).join('\n');
  const matchChunk = fs.readFileSync(path.join(srcDir, 'lazy', '10-match.js'), 'utf8');
  const shippedCore = fs.readFileSync(path.join(ROOT, 'control.js'), 'utf8');

  /* The heavy modules are NOT in the core. */
  check('match form is not in the control.js core',
    !/M\.results\s*=\s*function/.test(core) && !/PITCH_XY/.test(core),
    'the match form has moved back into the bundle everybody downloads');
  check('photo tagger is not in the control.js core', !/M\.phototag\s*=\s*function/.test(core));

  /* The core knows where they are and what they own. A chunk file listed in
     CHUNK_OF but never emitted would make its panel permanently unopenable. */
  check('core maps its panels to chunks', /CHUNK_OF\s*=\s*\{[^}]*results:\s*'match'/.test(core));
  /* Read off the SHIPPED core, because this is what the build stamped. The
     object is written by the generator and then minified, so its keys lose
     their quotes: parsed by pattern rather than by JSON.parse, which is what
     broke the whole suite the first time this file was minified. */
  const urls = shippedCore.match(/window\.CP_CHUNKS\s*=\s*(\{[^}]*\})/);
  check('build stamps hashed chunk URLs into the core', !!urls);
  if (urls) {
    const parsed = Object.fromEntries(
      [...urls[1].matchAll(/["']?([a-z-]+)["']?\s*:\s*["']([^"']+)["']/g)].map((m) => [m[1], m[2]]));
    check('chunk URL map is not empty', Object.keys(parsed).length > 0, urls[1].slice(0, 60));
    for (const [name, url] of Object.entries(parsed)) {
      check(`chunk ${name} is emitted at ${url.split('?')[0]}`,
        fs.existsSync(path.join(ROOT, url.split('?')[0])));
      check(`chunk ${name} is cache-busted`, /\?v=[0-9a-f]{8}$/.test(url));
    }
    /* Every panel the core defers must have a chunk to defer to. */
    for (const owner of core.match(/CHUNK_OF\s*=\s*\{([^}]*)\}/)[1].matchAll(/'([a-z]+)'/g)) {
      check(`deferred panel maps to a real chunk: ${owner[1]}`, !!parsed[owner[1]]);
    }
  }

  /* A chunk borrows the shell's helpers. If it ever declares its own copy of
     one, the two drift and the panel gets two different confirm dialogs. */
  check('match chunk borrows the shell helpers', /var U = window\.CPU;/.test(matchChunk));
  check('match chunk registers into the shared registry', /var M = window\.CPM;/.test(matchChunk));
  check('core publishes the helper set before any chunk can run',
    /window\.CPU\s*=\s*\{/.test(core) && core.indexOf('window.CPU') < core.indexOf('function render(key)'));

  /* Routing cannot ask M whether a panel exists any more: nothing lazy is in
     M until it has been downloaded, so a bookmarked #results would bounce to
     the dashboard. */
  /* Every module attaches its listeners to the panel body and relies on
     events bubbling up from the rows it draws. Emptying that element with
     innerHTML leaves the listeners on it, so each refresh stacked another
     copy: two renders in, one click saved twice. Saving refreshes, so it
     compounded. The body element is replaced now. */
  check('a re-render replaces the panel body rather than emptying it',
    /cloneNode\(false\)/.test(core) && !/\bbody\.innerHTML = '';/.test(core),
    'module listeners stack up on every refresh, so one click saves twice');

  /* No em dashes, anywhere the panel can write them. The club's copy rule
     applies to text the panel GENERATES as much as to text a developer types:
     the match report builder writes sentences straight onto the website.

     Checked on the SHIPPED files, deliberately. This one is about the bytes
     that reach a browser, and it is the only assertion here that gets
     STRONGER after minification: comments are gone, so a match can only be
     an em dash in real copy rather than one a developer wrote in an aside. */
  for (const f of fs.readdirSync(ROOT).filter((x) => /^control(-[a-z-]+)?\.js$/.test(x))) {
    const body = fs.readFileSync(path.join(ROOT, f), 'utf8');
    check(`${f}: no em dashes`, !body.includes('\u2014'),
      'the panel would write one into the club\'s copy');
  }

  check('routing does not gate on a module being loaded',
    !/M\[start\]\s*\?/.test(core) && /known\(start\)/.test(core),
    'a deferred panel would fall back to the dashboard when opened by URL');
}

/* What a visitor actually downloads on a cold load: the core plus the one
   band that page links. This is the figure the old home.css budget was
   reaching for, and unlike that one it does not drift as the site grows. */
const gz = (f) => zlib.gzipSync(fs.readFileSync(path.join(ROOT, f)), { level: 9 }).length / 1024;
const coreKb = gz('home.css');
const overBand = [];
const bandsSeen = new Set();
for (const [f, h] of pages) {
  const m = h.match(/href="\/(p-[a-z-]+\.css)\?/);
  if (!h.includes('href="/home.css')) continue;
  if (!m) { overBand.push(`${f} links no page band`); continue; }
  bandsSeen.add(m[1]);
  const total = coreKb + gz(m[1]);
  if (total > 34) overBand.push(`${f} ${total.toFixed(1)}KB`);
}
check('every page under 34KB gzipped CSS', overBand.length === 0, overBand.slice(0, 4).join(', '));
console.log(`  CSS per page: core ${coreKb.toFixed(1)}KB + band, ${bandsSeen.size} bands`);

/* A band nothing links is dead weight in the repo and a sign a page was
   renamed without its stylesheet following. */
const orphanBands = fs.readdirSync(ROOT)
  .filter((f) => /^p-[a-z-]+\.css$/.test(f))
  .filter((f) => !bandsSeen.has(f));
check('no unlinked page stylesheet', orphanBands.length === 0, orphanBands.join(', '));
/* HTML, gzipped, for the same reason the asset budgets are: it is what the
   visitor downloads. A raw budget on generated HTML prices REPETITION, and
   repetition is what markup compresses away almost entirely. The league page
   is the proof: 140KB raw across a 90-result division archive, 11KB over the
   wire, which is less than the homepage at 94KB raw. Failing that page for
   being 20KB over a raw ceiling would have meant deleting real content to
   satisfy a number that had no bearing on what anyone downloads.

   The raw figure is still printed, because DOM size costs parse and layout
   time even when it compresses to nothing, and a page drifting up there is
   worth seeing. That is what pushed the badge on this page down to one node
   from two. */
const heavy = [];
const rawHeavy = [];
for (const [f, h] of pages) {
  const raw = Buffer.byteLength(h) / 1024;
  const gz = zlib.gzipSync(Buffer.from(h), { level: 9 }).length / 1024;
  if (gz > 22) heavy.push(`${f} ${gz.toFixed(1)}KB gz`);
  if (raw > 160) rawHeavy.push(`${f} ${raw.toFixed(0)}KB raw`);
}
check('no page over 22KB of gzipped HTML', heavy.length === 0, heavy.slice(0, 5).join(', '));
check('no page over 160KB of raw HTML (DOM size)', rawHeavy.length === 0, rawHeavy.slice(0, 5).join(', '));

const heroKb = fs.statSync(path.join(ROOT, 'assets/hero/kit-crest-1344.webp')).size / 1024;
check('hero image under 250KB', heroKb < 250, `${heroKb.toFixed(0)}KB`);

/* ---- 15. Fonts self-hosted, no third-party requests ---- */
/* src only. An href is a destination the visitor may choose to follow, not a
   request the page makes, so the two were never the same check: conflating
   them meant every outbound link the club published had to be added to an
   allowlist, and the list fell behind reality twice. Outbound links get their
   own check below, on the thing that actually matters about them. */
/* The CSP's own frame-src is the allowlist for embeds, so it is read from
   vercel.json rather than repeated here: a frame this check permits is a frame
   the browser will actually load, and the two cannot drift apart.

   An embedded player is a deliberate inclusion the club chose and the CSP
   sanctions, not a hotlinked asset. A YouTube THUMBNAIL is the opposite, and
   stays banned: i.ytimg.com is not in img-src, so one would render as a broken
   image and hand a third party a request from every visitor who never pressed
   play. That is why the video cards draw the crest instead. */
const frameSrc = (csp.match(/frame-src ([^;]*)/) || [, ''])[1]
  .split(/\s+/).filter((s) => s.startsWith('http'));
for (const [f, h] of pages) {
  const framed = new Set([...h.matchAll(/<iframe\b[^>]*\bsrc="(https?:\/\/[^"]+)"/g)].map((m) => m[1]));
  const ext = [...h.matchAll(/src="(https?:\/\/[^"]+)"/g)]
    .map((m) => m[1])
    .filter((u) => !u.startsWith('https://www.suesangelsfc.co.uk'))
    // The club's own Supabase storage bucket holds the matchday photography
    // and is explicitly allowed by the CSP, so it is not a third party.
    .filter((u) => !u.startsWith('https://hvbquuvxcswylyguplfb.supabase.co'))
    .filter((u) => !(framed.has(u) && frameSrc.some((o) => u.startsWith(o))));
  check(`${f}: no third-party asset requests`, ext.length === 0, ext.slice(0, 3).join(', '));
}

/* Outbound links: https only, and anything opening in a new tab carries
   rel="noopener" so the destination cannot reach back through window.opener. */
const badOutbound = [];
for (const [f, h] of pages) {
  for (const m of h.matchAll(/<a\b[^>]*href="(https?:\/\/[^"]+)"[^>]*>/g)) {
    const [tag, url] = m;
    if (url.startsWith('http://')) badOutbound.push(`${f}: insecure ${url}`);
    if (/target="_blank"/.test(tag) && !/rel="[^"]*noopener/.test(tag)) {
      badOutbound.push(`${f}: no rel=noopener on ${url}`);
    }
  }
}
check('outbound links are https and safely targeted', badOutbound.length === 0,
  badOutbound.slice(0, 3).join('; '));

/* ---- 15b. No unverified social channel is linked ----
   Each entry in CLUB.socials carries `live`, set from an actual HTTP check.
   YouTube's handle returns 404 while a control request to a real channel
   returns 200, so it is marked live:false and must not be published: it is
   referenced by the footer on every page and by three call-to-action buttons
   on the live and videos pages, and the site it would replace has no YouTube
   link at all, so shipping it would ADD a dead link to 100 pages. */
{
  const dead = CLUB.socials.filter((s) => s.live === false).map((s) => s.href);
  const offenders = [];
  for (const [f, h] of pages) {
    for (const href of dead) if (h.includes(href)) offenders.push(`${f} -> ${href}`);
  }
  check('no page links an unverified social channel',
    offenders.length === 0, offenders.slice(0, 3).join(', '));
  /* And the verified ones ARE published, so "fix" never means "delete". */
  const liveHrefs = CLUB.socials.filter((s) => s.live !== false).map((s) => s.href);
  const home = pages.get('index.html') || '';
  check('every verified social is linked from the home page',
    liveHrefs.every((u) => home.includes(u.replace(/\/$/, ''))),
    liveHrefs.filter((u) => !home.includes(u.replace(/\/$/, ''))).join(', '));
}


/* ---- 15c. Restored platform features ----
   Three things the retired site had and the rebuild dropped: a cookie consent
   banner, analytics, and a service worker. The banner is the one that matters
   legally, and it had been missing from the live site entirely. */
{
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  /* The placeholder appears in the file's own comment as well as the code, so
     a string-pattern replace stamped the comment and left the cache name
     literal - which would give every deploy the same cache and defeat the
     point of versioning it. */
  check('service worker has no unstamped placeholder', !sw.includes('__CACHE__'));
  const cacheName = (sw.match(/const CACHE = '([^']+)'/) || [])[1] || '';
  check('service worker cache is keyed to the build',
    cacheName === `sa-${(pages.get('index.html').match(/sa\.js\?v=([a-z0-9]+)/) || [])[1]}`,
    cacheName);
  check('service worker never caches the control panel or the API',
    /control\.html/.test(sw) && /\/api\//.test(sw));

  /* Two readings of the same file, and they answer different questions.

     The SHIPPED bundle answers "does this reach a browser": the consent
     banner's id, the global the site tracks through, the service worker's
     path. Those are strings, and minification cannot touch a string.

     The SOURCE answers "is the code shaped the way it has to be": that the
     analytics loader returns early unless consent was granted. That claim is
     about a function by name, and the shipped bundle no longer has names. */
  const saJs = fs.readFileSync(path.join(ROOT, 'sa.js'), 'utf8');
  const saSrc = fs.readdirSync(path.join(ROOT, 'src', 'scripts'))
    .filter((f) => f.endsWith('.js')).sort()
    .map((f) => fs.readFileSync(path.join(ROOT, 'src', 'scripts', f), 'utf8')).join('\n');

  check('consent banner ships', /sa-consent/.test(saJs));
  check('saTrack is defined', /window\.saTrack\s*=/.test(saJs));
  /* Nothing third-party may be requested before the visitor has chosen. */
  check('analytics loads only inside the consent gate',
    /function startAnalytics\(\)[\s\S]{0,160}read\(\) !== 'granted'/.test(saSrc));
  /* And the shipped bundle names no third-party host the club has not
     agreed to. This is the assertion that would actually catch a regression:
     a script tag built from a literal URL cannot hide behind a renamed
     function the way the check above could.

     Google Analytics and the Meta pixel are here on purpose and neither is
     fetched until the visitor has chosen; that is what the consent gate
     above is. Anything else appearing in this list is a new third party
     nobody decided on, which is exactly the thing worth failing over. */
  const ALLOWED_THIRD_PARTY = [
    'googletagmanager.com',   // Google Analytics, inside the gate
    'connect.facebook.net',   // Meta pixel, inside the gate
  ];
  const hosts = [...saJs.matchAll(/["'](https?:\/\/[^"']+)["']/g)].map((m) => m[1])
    .filter((u) => !/suesangelsfc\.co\.uk|schema\.org|w3\.org|supabase\.co/.test(u))
    .filter((u) => !ALLOWED_THIRD_PARTY.some((h) => u.includes(h)));
  check('no undeclared third-party URL in the public bundle', hosts.length === 0,
    [...new Set(hosts)].slice(0, 3).join(', '));
  check('service worker is registered', /serviceWorker\.register\(["']\/sw\.js["']/.test(saJs));
  /* No page may ship the banner in its markup: it is built by script, so a
     JavaScript failure cannot leave a hidden dialog on the page. */
  check('no page ships the consent banner in markup',
    ![...pages.values()].some((h) => /id="sa-consent"/.test(h)));
}

/* ==========================================================================
   HOUSE STYLE IN PUBLISHED COPY

   The club types its match reports and bios into the control panel, on a
   phone or pasted out of somewhere else, so the typography that arrives is
   whatever that somewhere else used. src/lib/prose.mjs settles it once as the
   text enters the build. These three assert the result rather than the rule,
   because the rule passing is not the same as the page being right.
   ========================================================================== */
{
  const emDash = [];
  const division = [];
  for (const [f, h] of pages) {
    /* The house list names ·, ’ and – as the literals to use. An em dash is
       not on it, and 52 of them arrived with six pasted match reports. */
    if (h.includes('—')) emDash.push(f);
    /* League Ten and League Eight. "Division" is what everybody types out of
       habit from the league they played in before, and it reached 17 places
       across 8 pages, including a fact label whose own value said League
       Eight beside it. */
    if (/\bDivision\b/.test(h)) division.push(f);
  }
  check('no em dash in any published page', emDash.length === 0,
    emDash.slice(0, 4).join(', '));
  check('no page calls the league a Division', division.length === 0,
    division.slice(0, 4).join(', '));

  /* THE PANEL'S PROMISE. Its report box is labelled "What the website
     publishes" and the button beside it says clearing that box falls back to
     the coach's notes. Both were untrue: every match page read the notes and
     the article reached no page at all, so around 25,000 characters of
     finished writing sat in the records unpublished.

     Asserted against the built pages, not against the template, because the
     template read a real field and still published the wrong one. */
  const live = JSON.parse(fs.readFileSync(
    path.join(ROOT, 'src', 'data', 'recovered-live.json'), 'utf8'));
  const { house } = await import(path.join(ROOT, 'src', 'lib', 'prose.mjs'));
  const flat = (s) => String(s).replace(/&#?\w+;/g, '').replace(/[^a-z0-9]+/gi, '').toLowerCase();
  const built = [...pages].filter(([f]) => f.startsWith('matches/'))
    .map(([f, h]) => [f, flat(h)]);
  const unpublished = [];
  for (const row of live.matches || []) {
    const article = String(row.data?.polishedReport || '').trim();
    if (article.length <= 200) continue;
    /* Probed from the last paragraph: the first is preceded by a markdown
       heading the renderer lifts into an <h3>, which moves every offset. */
    const tail = flat(house(article).split(/\n\s*\n/).pop()).slice(0, 70);
    if (!tail) continue;
    if (!built.some(([, h]) => h.includes(tail))) unpublished.push(row.key);
  }
  check('every written match report reaches its page', unpublished.length === 0,
    unpublished.join(', '));
}

/* ==========================================================================
   AN ALBUM IS OF A MATCH

   Seven albums hold 606 photographs of seven games, and nothing joined them
   to the games: no report offered its photographs and no album offered its
   report. Each album also RE-TYPED the fixture, the competition and the date
   into its title, two of the seven lost the separator on the way in, and the
   date field held the afternoon of the upload rather than the day of the
   match, so all seven read June 2026 for an autumn and a winter of football.
   ========================================================================== */
{
  const { buildDataset } = await import(path.join(ROOT, 'src', 'lib', 'dataset.mjs'));
  const data = buildDataset();
  const albums = data.galleries || [];

  const unresolved = albums.filter((g) => !g.matchId && g.category === 'Matchday');
  check('every matchday album resolves to a match', unresolved.length === 0,
    unresolved.map((g) => g.title.slice(0, 40)).join(', '));

  /* The resolution has to be RIGHT, not merely present: an album pointing at
     the wrong game would pass a presence check and publish a scoreline from
     somebody else's afternoon. Its own title still carries the score that was
     typed at upload, so the two are compared. */
  const wrong = albums.filter((g) => {
    if (!g.matchId) return false;
    const said = String(g.title).match(/(\d+)\s*-\s*(\d+)/);
    return said && g.scoreline !== `${said[1]}-${said[2]}`;
  });
  check('each album resolves to the match its title names', wrong.length === 0,
    wrong.map((g) => `${g.title.slice(0, 30)} -> ${g.matchId}`).join(', '));

  /* Dated by the match, not by the upload. */
  const uploadDated = albums.filter((g) => g.matchId && g.shownDate !== g.matchIso);
  check('albums are dated by their match', uploadDated.length === 0,
    uploadDated.map((g) => g.matchId).join(', '));

  /* Both directions. A link one way only is how the gallery was reachable
     from nowhere but its own index.

     THE FLOOR MATTERS. Written as "every linked album links back", these two
     passed 0 of 0 the moment the resolver stopped resolving, which is the
     exact failure they exist to catch. They assert a count as well. */
  const linked = albums.filter((g) => g.matchId);
  check('the albums actually resolve to matches', linked.length >= 7,
    `${linked.length} resolved, expected at least 7`);
  const albumToMatch = linked.filter((g) => {
    const h = pages.get(`gallery/${g.slug}.html`);
    return h && h.includes(`href="${g.matchHref}"`);
  });
  const matchToAlbum = linked.filter((g) => {
    const m = data.played.find((x) => x.id === g.matchId);
    const h = m && pages.get(`matches/${m.slug}.html`);
    return h && h.includes(`/gallery/${g.slug}.html`);
  });
  check('every album links to its match report',
    albumToMatch.length === linked.length,
    `${albumToMatch.length}/${linked.length}`);
  check('every match with an album links to it',
    matchToAlbum.length === linked.length,
    `${matchToAlbum.length}/${linked.length}`);

  /* ONE SPELLING PER GROUND. Sixteen strings were stored for about nine
     grounds, so the same pitch read three ways across three match reports.

     Compared on a flattened key rather than against the list in venues.json,
     because a check that only knows the corrections already made cannot catch
     the next variant. Two venues differing solely in case, punctuation or
     spacing are the same ground written twice. */
  const seenVenue = new Map();
  const dupes = [];
  for (const m of [...data.played, ...(data.fixtures || [])]) {
    if (!m.venue) continue;
    const flat = m.venue.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const first = seenVenue.get(flat);
    if (first === undefined) seenVenue.set(flat, m.venue);
    else if (first !== m.venue) dupes.push(`${JSON.stringify(first)} / ${JSON.stringify(m.venue)}`);
  }
  check('no ground is spelled two ways', dupes.length === 0,
    [...new Set(dupes)].slice(0, 3).join(', '));
  check('venues are all recognised', (data.unknownVenues || []).length === 0,
    (data.unknownVenues || []).join(', '));

  /* The bug this replaces: a competition swallowed into the fixture line
     because the title had no separator to split on. */
  const gal = pages.get('gallery.html') || '';
  const swallowed = [...gal.matchAll(/class="gl-card__fixture">([^<]+)</g)]
    .map((m) => unesc(m[1]))
    .filter((s) => /\b(League (Ten|Eight)|Trophy|County Cup)\b/.test(s));
  check('no gallery card puts the competition in the fixture',
    swallowed.length === 0, swallowed.slice(0, 2).join(' | '));
}

/* ==========================================================================
   EVERY DRAWN FIGURE AGREES WITH THE FIGURE BESIDE IT

   The site draws 477 proportional bars and 91 gauges, every one of them from
   the match records. A bar is the only thing on a page that can be wrong
   without looking wrong: the number beside it stays right while the bar it
   sits in stops meaning anything. These compare the two.
   ========================================================================== */
{
  /* A RANK OUTSIDE ITS OWN POPULATION. The squad-comparison band ranks a
     player against those who started a match, and ranked the eight who
     started none against them anyway, so the Starts row on eight player pages
     read "28th of 27". */
  const impossible = [];
  for (const [f, h] of pages) {
    for (const m of h.matchAll(/<i>(\d+)(?:st|nd|rd|th) of (\d+)<\/i>/g)) {
      if (Number(m[1]) > Number(m[2])) impossible.push(`${f}: ${m[1]} of ${m[2]}`);
    }
  }
  check('no rank falls outside the group it names', impossible.length === 0,
    impossible.slice(0, 3).join(', '));

  /* The stats table: each bar against the top figure in its own column. */
  const st = pages.get('stats.html') || '';
  const tbl = [...st.matchAll(/--w:\s*([\d.]+)%"[^>]*>\s*<\/i>\s*<\/span>\s*<b>([\d.]+)<\/b>/g)]
    .map((m) => ({ pct: Number(m[1]), val: Number(m[2]) }));
  const tblMax = Math.max(0, ...tbl.map((r) => r.val));
  const tblBad = tbl.filter((r) => Math.abs((r.val / tblMax) * 100 - r.pct) > 1);
  check('every stats-table bar matches its figure',
    tbl.length > 0 && tblBad.length === 0,
    tbl.length ? `${tblBad.length} of ${tbl.length} disagree` : 'no bars found');

  /* The player profile bars, including the "26 of 30" under a percentage. */
  const PF = /<li class="pf-bar">\s*<span class="pf-bar__k">([^<]*)<\/span>\s*<span class="pf-bar__v">\s*<span data-count="([^"]*)">[^<]*<\/span>\s*(?:<i>([^<]*)<\/i>)?\s*<\/span>\s*<span class="pf-bar__track"[^>]*>\s*<i style="--w:([\d.]+)%">/g;
  let pfSeen = 0;
  const pfBad = [];
  for (const [f, h] of pages) {
    const rows = [...h.matchAll(PF)].map((m) => ({
      raw: m[2], sub: m[3] || '', pct: Number(m[4]),
    }));
    if (!rows.length) continue;
    pfSeen += rows.length;
    const counts = rows.filter((r) => !r.raw.includes('%'));
    const sum = counts.reduce((t, r) => t + (Number(r.raw) || 0), 0);
    for (const r of rows) {
      if (r.raw.includes('%')) {
        const said = parseFloat(r.raw);
        if (Math.abs(said - r.pct) > 1) pfBad.push(`${f} ${r.raw} drawn ${r.pct}%`);
        const of = r.sub.match(/(\d+)\s+of\s+(\d+)/);
        if (of && Math.abs((Number(of[1]) / Number(of[2])) * 100 - said) > 1) {
          pfBad.push(`${f} "${r.sub}" is not ${r.raw}`);
        }
      } else if (sum) {
        const want = (Number(r.raw) / sum) * 100;
        if (Math.abs(want - r.pct) > 1.2) pfBad.push(`${f} ${r.raw} drawn ${r.pct}%, expected ${want.toFixed(1)}%`);
      }
    }
  }
  check('every player-profile bar matches its figure',
    pfSeen > 0 && pfBad.length === 0,
    pfSeen ? pfBad.slice(0, 2).join('; ') : 'no bars found');

  /* THE SAME ROW, THE SAME NUMBER. The position list printed a weighted slot
     count to the eye and a match count to a screen reader, so one row gave
     two figures in two units. */
  const split = [];
  for (const [f, h] of pages) {
    for (const m of h.matchAll(/<span class="pf-heatlist__n">([\d.]+)<\/span>[\s\S]{0,120}?<span class="sr-only">([^<]*)<\/span>/g)) {
      if (!m[2].includes(m[1])) split.push(`${f}: shows ${m[1]}, says "${m[2].trim().slice(0, 40)}"`);
    }
  }
  check('the position list reads the same to the eye and to a screen reader',
    split.length === 0, split.slice(0, 2).join('; '));
}

/* ==========================================================================
   THE PANEL AND THE SITE AGREE ABOUT A SHAPE

   The panel writes a record and the site reads it. Nothing forces the two to
   use the same field name, and when they drift the failure is silent: the
   page falls back to something plausible and nobody sees a broken thing.
   Both of these were found that way.
   ========================================================================== */
{
  const { buildDataset: bd } = await import(path.join(ROOT, 'src', 'lib', 'dataset.mjs'));
  const data2 = bd();

  /* THE DONATE LINK. The panel writes `stripeLink`; the record in production
     holds `clubUrl` from an older version of the screen; the page read
     neither and fell back to a link hard-coded in the template, which
     happened to be the same address. A donate button that is right by
     coincidence is a donate button that goes wrong silently. */
  const rowsRaw = JSON.parse(fs.readFileSync(
    path.join(ROOT, 'src', 'data', 'recovered-live.json'), 'utf8'));
  const donateRow = (rowsRaw.player_photos || []).find((r) => r.key === 'donate:config');
  const stored = donateRow && (donateRow.data.stripeLink || donateRow.data.link || donateRow.data.clubUrl);
  if (stored) {
    check('the stored donate link is the one published',
      String(data2.donate.stripeLink) === String(stored),
      `stored ${stored}, dataset ${data2.donate.stripeLink}`);
    const causePage = pages.get('sepsis.html') || '';
    check('the cause page carries the stored donate link',
      causePage.includes(stored), 'falls back to the template default');
  }

  /* NAMING SOMEBODY IS NOT A STATISTIC. Player stats are competitive-only,
     because a friendly counts towards nothing. Names were read off the same
     list, so anybody who has only played a friendly had no row and appeared
     on his own team sheet as "No. 901" - which is the exact thing the panel's
     trialist screen exists to prevent. */
  const named = [...pages].filter(([f]) => f.startsWith('matches/'))
    .filter(([, h]) => /<b>No\. \d+<\/b>/.test(h))
    .map(([f]) => f);
  check('no team sheet prints a shirt number instead of a name',
    named.length === 0, named.slice(0, 3).join(', '));
}

/* ==========================================================================
   EVERY SERVERLESS ROUTE THAT SPENDS SOMETHING IS GATED

   /api/claude proxies a paid API. Its comment claimed only the club's own
   site could reach it; the code allowed any request with no Origin header,
   which is every script, every curl and every server. It has been harmless
   only because ANTHROPIC_API_KEY has never been set, which is one environment
   variable away from an open proxy.

   Asserted on the source, because there is no built artefact for a serverless
   function: a route that spends money or deploys the site has to ask the
   database who is calling, the way /api/publish does.
   ========================================================================== */
{
  const GATED = ['api/claude.js', 'api/publish.js'];
  for (const f of GATED) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    check(`${f} asks the database who is calling`,
      src.includes('rpc/is_club_admin'), 'no is_club_admin check');
    check(`${f} refuses a request with no bearer token`,
      /authorization/i.test(src) && /401/.test(src), 'no token check');
  }
}

/* ---- Report ---- */
console.log(`\n${'='.repeat(66)}`);
if (warns.length) {
  console.log(`\n${warns.length} warning(s):`);
  warns.slice(0, 10).forEach((w) => console.log(`  ! ${w}`));
}
if (fails.length) {
  console.log(`\n${fails.length} FAILURE(S):`);
  fails.forEach((f) => console.log(`  x ${f}`));
  console.log(`\n${pass} passed, ${fails.length} failed`);
  process.exit(1);
}
console.log(`\nAll ${pass} checks passed.`);
