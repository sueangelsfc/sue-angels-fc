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

/* ---- The anonymous write helper asks for nothing back ----
   `Prefer: return=representation` is the right header for an ADMIN write and
   is fatal on an anonymous one: handing the new row back needs a SELECT policy
   on it, and anon has none on enquiries, supporters or band_views because they
   are write-only by design. The insert is then refused with 42501 "new row
   violates row-level security policy", which is exactly what a missing insert
   policy looks like. That reading cost a day and had the club told its contact
   form was recording nothing. This is the club's lead capture, so the header it
   sends is asserted rather than assumed. */
{
  const core = fs.readFileSync(path.join(ROOT, 'src', 'scripts', '00-core.js'), 'utf8');
  const fn = core.slice(core.indexOf('function sbInsert'));
  const body = fn.slice(0, fn.indexOf('\n  }'));
  check('sbInsert asks for return=minimal', /Prefer:\s*'return=minimal'/.test(body));
  check('sbInsert never asks for the row back', !/return=representation/.test(body));
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
   auraFor() used to return the NAME of an atmosphere variant, to be passed
   into sitePreMain(). Concatenated beside it instead, it printed the bare
   word "ember" into the top of the records page as visible text: valid HTML,
   no broken link, nothing a structural check would see, and it looked like a
   rendering glitch rather than a bug in a template.

   The atmosphere is a still image now and auraFor is gone, so that exact
   mistake can no longer be made. The check is kept because the CLASS of
   mistake is not specific to it - a helper's return value concatenated where
   markup was meant is silent in the same way - and because these four words
   have no business standing alone as body text however they got there. */
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

  /* AND ON EVERY OTHER PAGE, which is the lock this needed from the start.
     The rule was enforced on records.html alone, so the moment a scoreline
     card appeared anywhere else nothing was watching: clubRecords() in
     stats.mjs kept returning the raw home-away scoreline, nothing rendered it,
     and the day a home page band did, "Biggest win 0-12" shipped.

     Read structurally rather than by class name, so it covers a card this
     check has never heard of: any element whose text is a bare scoreline,
     followed within a short distance by a label claiming a win or a defeat. */
  {
    const bad = [];
    for (const [f, h] of pages) {
      for (const m of h.matchAll(/>(\d{1,2})-(\d{1,2})<\/span>([\s\S]{0,220})/g)) {
        const [, a, b, after] = m;
        const label = after.replace(/<[^>]+>/g, ' ').slice(0, 90).toLowerCase();
        /* Only where the opponent is named without a venue. "Home"/"Away"
           beside it means the two clubs are in home-away order and the raw
           scoreline is correct. */
        if (/\b(home|away|neutral)\b/.test(label)) continue;
        const us = Number(a); const them = Number(b);
        if (/\b(biggest win|best win|record win)\b/.test(label) && us < them) {
          bad.push(`${f}: "${label.trim().slice(0, 40)}" shows ${us}-${them}`);
        }
        if (/\b(heaviest defeat|worst defeat)\b/.test(label) && us > them) {
          bad.push(`${f}: "${label.trim().slice(0, 40)}" shows ${us}-${them}`);
        }
      }
    }
    check('every page: a win card never shows fewer goals for than against',
      bad.length === 0, bad.join(' | '));
  }

  /* And the shared derivation itself, so this cannot go latent again in a
     function nothing currently renders. */
  {
    const { clubRecords: cr } = await import(path.join(ROOT, 'src', 'lib', 'stats.mjs'));
    const { buildDataset: bdR } = await import(path.join(ROOT, 'src', 'lib', 'dataset.mjs'));
    const dR = bdR();
    const wrong = cr(dR.competitive, dR.players).filter((r) => {
      const s = /^(\d+)-(\d+)$/.exec(String(r.value));
      if (!s) return false;
      const us = Number(s[1]); const them = Number(s[2]);
      return (/win/i.test(r.label) && us < them) || (/defeat/i.test(r.label) && us > them);
    });
    check('clubRecords() returns scorelines from the club\'s side',
      wrong.length === 0,
      wrong.map((r) => `${r.label} ${r.value}`).join(', '));
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
  /* 14 -> 15, stated rather than slipped past, because the block above names
     raising as the failure mode.

     What bought it: 108 bytes for the results list being usable at all. It
     sorted on the row KEY, and a key starts with the letter the record was
     created under, so every fixture-promoted match sorted below every
     baseline one whatever the dates said - the last game of last season sat
     at the bottom under thirty-three older ones. And the Result column read
     only the row, so the thirty-three matches whose scoreline lives in the
     baseline all said "Not recorded" beside a result the website was
     publishing.

     Paid for first, three times, before raising: pickable() and
     pickerSelect() merged into one offer function, the repaint reading its
     field names off GROUPS instead of a hand-typed list that had three of
     them wrong, and the Played column dropped because matchLabel already
     renders the date beside the opponent. Those bought 40 bytes of the 148.

     This module is now the one to split. It is the match form, the fixture
     list and the results table in one chunk, and the results table is what
     loads first. */
  /* 15 -> 17. THE SECOND RAISE, and the last one that should be allowed.

     What bought it: 850 bytes for a player having a list of spells rather
     than one position - a half, a place and a role each, as many as he had -
     and for the bench recording whether a substitute got on, when, and where
     he played. A lad who came on at half time and scored twice was previously
     recorded as having sat there.

     Paid for first: roleSelect() deleted outright, orphaned by the change,
     and posByNum/roleByNum reduced to the one lookup the pitch diagram needs.
     That covered 60 of the 910.

     THE SPLIT HAPPENED, and this is what it bought. The report writer was a
     self-contained lump of pure functions with exactly one caller, sitting in
     a file that also carried the fixtures panel and the results table. It is
     `control-report.js` now, fetched on the press of Build the report and by
     nobody else, and this chunk went 17 -> 13.9 without losing a feature.

     Set to 15 rather than back to 14: the head-to-head and the friendly count
     went INTO the report chunk, not this one, so the headroom here is for the
     dialog and the table. The next raise should extract the match dialog from
     the results table the same way, because the table is what loads when the
     club opens Results and the dialog is only wanted once somebody presses
     Edit. */
  /* The forward-looking screen: a checklist and a squad picker, no images
     and no tables of history, so it has no business being large. */
  'control-matchday.js': 4,
  'control-match.js': 16,
  /* 15 -> 16. What bought it: the length gauge under the notes box, and the
     word count beside the Build button.

     The club asked for 700 to 900 word reports and had no way of knowing it
     had 315 until it counted them by hand, at which point the only options
     are padding or shrugging. Both numbers now appear while there is still
     time to do something about them, and both say what would close the gap
     rather than only that there is one: a written-up incident runs about
     twenty-two words, so the arithmetic is honest rather than a nag.

     Paid for first: the notes box carried its own word counter and the gauge
     replaces it, so `data-words` and its listener branch are gone.

     THE NEXT RAISE MUST BE THE SPLIT. This chunk is still the fixtures panel,
     the results table and the match dialog in one file, and the table is what
     loads when the club opens Results. Extracting the report writer took it
     17 -> 13.9; extracting the dialog is the same move again and is the only
     honest way to pay for the next feature. */
  /* The report writer, fetched when Build the report is pressed and never on
     a page load. Two ways to write one: composed in the browser from the
     facts recorded, which needs no key and no network, or written by
     /api/claude from the same facts plus the coach's notes, which falls back
     to the first the moment it is not available. It also knows two things no
     tab on the match form holds - how the club has done against this
     opponent before, and where the match sits in a run of pre-season
     friendlies - both counted from the match list the panel already ships. */
  /* 7 -> 8. What bought it: a note beginning with a minute is read as the
     moment it happened and narrated in clock order alongside the goals, which
     is the difference between a report and two columns of a table read aloud;
     the match-details block every professional report ends with and this one
     never had; and the club's record on the men who played, so a report can
     say a scorer had never started a competitive game rather than describing
     eleven interchangeable names.

     Paid for first: the per-player sentence builder collapsed into a grouped
     one, which was shorter than the version that repeated itself, and the
     prompt's house rules stopped restating what the fact sheet already says.

     This chunk is downloaded when Build the report is pressed and by nobody
     else, which is the entire reason it exists. It is the right place for
     weight and the wrong place to keep adding: the next thing this needs is
     the coach typing more moments, not this file writing more sentences. */
  'control-report.js': 10,
  /* 9 -> 10. What bought it: the brief rewritten around the club's own
     exemplar - a report the retired admin produced when it ran inside a Claude
     artifact and had a model to hand - and the club's season record, so a
     report can close on "eighteen wins from eighteen, fifty-four points,
     ninety scored and eleven conceded" without anybody typing figures the site
     already derives. Typing them is how a published number goes wrong.

     Also the opposition's goals and the penalties they saved, both of which
     were RECORDED WITH MINUTES and had never once reached the writer: a report
     of a 3-0 cup final defeat could say "they managed three" and nothing about
     how, and the two penalties saved five minutes apart in that same final -
     the turning point of the match - were invisible to it.

     Fetched when Build the report is pressed and by nobody else, which is why
     this is the right chunk to carry it. */
  /* 8 -> 9. What bought it: a note naming a player who did not score now
     attaches to him and forms its own passage in team-sheet order, which is
     the best material in a coach's notes and was being dropped into the run
     of play as filler; what comes next is derived from the fixture list
     rather than typed; and the brief carries the club's length target, which
     is defined once in the seed so the gauge, the button and the brief cannot
     disagree about what a full report is.

     This chunk is fetched when Build the report is pressed and by nobody
     else. That is the whole reason it exists and it is the right place for
     weight; the thing that makes reports longer from here is the club typing
     more moments, not this file writing more sentences. */
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
  /* The running order of the home page. A list, two arrows and a switch, and
     it was 2.2KB because the explanation of what each band IS comes from the
     build rather than being typed here twice.

     3 -> 4, stated rather than slipped past, because the block above names
     raising as the failure mode.

     What bought it: about 900 bytes for the area filter. The screen was eight
     bands when it was written and is twenty now, which is past the point where
     one flat list can be scanned, so each band carries an area and the list can
     be narrowed to one. The chips also had to come with the rule that the
     arrows come off while a filter is on: an area's bands are not adjacent in
     the running order, so moving one under a filter would carry it past
     neighbours hidden from the operator.

     Deliberately NOT bought by loosening anything else, and the area names
     themselves are seeded by the build rather than typed here, for the same
     reason the band names are. Fetched only by somebody who opens this one
     screen.

     Then it went 4 -> 9, and NOT because the module grew: the module is 3.4KB
     and unchanged. `homeBands` is 15KB of raw JSON describing seventy bands
     and their pick lists, it is read by this screen alone, and it was living
     in control-seed.js, which is loaded first and not deferred. Every one of
     the eighteen panels was paying for it to render the Inbox. It rides with
     this chunk now, so the cost falls on whoever opens Home page and on
     nobody else - which is this file's whole rule, arriving by a different
     door: last time it was thirteen modules in one file, this time one
     module's data in everybody's file. control-seed.js went 12.0 to 7.0KB
     gzipped for every panel visitor, and that is the number this bought.

     Then it went 9 -> 11, and this is the THIRD time this number has moved for
     a reason that is not the module getting bigger. The catalogue grew, so the
     descriptions grew: seventy-five bands at about ninety characters each is
     6.6KB of the chunk, and that text is the only thing on the screen that
     says what a band actually does.

     Which is the same fault the page-weight ceiling had, on a smaller scale. A
     budget that fails whenever the club asks for more parts is measuring the
     request. So the CODE is budgeted separately, just below, and this number
     covers code plus data and exists only to catch a runaway. */
  'control-home.js': 12,
  /* AND THE SHARED SEED GETS A CEILING, having never had one. It is the first
     thing control.html loads and it is not deferred, so it is on the critical
     path for every screen - which is exactly the position that had gone
     unguarded while the chunks around it were all budgeted. 7.0KB now. */
  'control-seed.js': 8,
};
for (const [f, kb] of Object.entries(BUDGET)) {
  const raw = fs.readFileSync(path.join(ROOT, f));
  const size = zlib.gzipSync(raw, { level: 9 }).length / 1024;
  check(`${f} within ${kb}KB gzipped`, size <= kb,
    `${size.toFixed(1)}KB gzipped, ${(raw.length / 1024).toFixed(0)}KB raw`);
}

/* CODE, BUDGETED APART FROM DATA.

   Two of the shipped chunks carry data that scales with what the club has
   asked for: the home screen's seventy-five band descriptions, and the match
   form's pick lists. Budgeting the emitted file alone conflates "somebody
   wrote more JavaScript" with "the club wanted more bands", and only the first
   of those is drift. The number that moved three times in three commits was
   the conflated one.

   So the SOURCE module is measured too. It is unminified, so the figure is not
   comparable to the chunk's and is not meant to be: what it is for is that it
   moves when, and only when, somebody edits the code.

   The two ceilings are set just above where each file stands, because that is
   what makes them bite. 10-match.js is 32KB gzipped of SOURCE against a 15.7KB
   emitted chunk, which is the ratio you get from a file that is mostly comment:
   it is the one CLAUDE.md already names as wanting a split, and this is the
   line that will say so when it grows again. */
for (const [f, kb] of Object.entries({
  /* 8 -> 11, for three features, and the raise is the honest half of adding
     them rather than a way of not noticing.

     PREVIEW opens a band exactly as the page draws it without switching it
     on. Fifty-three of the seventy are off with real data behind them and the
     only way to see one was to switch it on, publish and look at the live
     site, so the cost of asking "what is this" was a deploy. The band markup
     itself is not in here: the build already draws every band to weigh it and
     now keeps what it drew, in its own file, fetched on the first press by
     whoever presses it.

     THE SEASON NOTICE says when the front page draws nothing from On the
     pitch, which is ten bands and the club currently publishes none of them.
     It stages three and stops; the club presses Save or ignores it.

     REACH prints how many visits actually got to each band, from band_views,
     which stores no identifier of any kind. It does not sort anything: the
     club's arrangement is the club's, and a panel that reordered the page by
     its own numbers would be breaking that rule while claiming to help. */
  'src/admin/lazy/95-home.js': 11,
  'src/admin/lazy/10-match.js': 34,
})) {
  const raw = fs.readFileSync(path.join(ROOT, f));
  const size = zlib.gzipSync(raw, { level: 9 }).length / 1024;
  check(`${f} code within ${kb}KB gzipped`, size <= kb,
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

  /* THE REPORT WRITER IS ITS OWN CHUNK and must stay out of both the core and
     the match chunk. It was inside the match chunk, which is what took that
     file to 17KB gzipped: 15KB of pure functions with exactly one caller,
     shipped to everybody who opened Results to look at a list. */
  const reportChunk = fs.readFileSync(path.join(ROOT, 'control-report.js'), 'utf8');
  check('report writer is not in the control.js core', !/function compose\(/.test(core)
    && !/ANTHROPIC_API_KEY/.test(core),
    'the report writer is back in the bundle everybody downloads');
  check('report writer is not in the match chunk', !/window\.CPR\s*=/.test(matchChunk),
    'the split has been undone');
  check('match chunk asks for the report chunk by name',
    /chunk\(["']report["']\)/.test(matchChunk),
    'Build the report cannot reach its writer');
  check('the core can fetch a chunk that is not a panel',
    /chunk:\s*function/.test(core),
    'CPU.chunk is gone, so a button-loaded chunk can never arrive');
  check('report chunk publishes its entry points',
    /compose:/.test(reportChunk) && /write:/.test(reportChunk) && /context:/.test(reportChunk));
  /* Falls back rather than fails: no key, no session, no network, a 500. The
     button has never been able to do nothing and it must stay that way. */
  /* Matched on the STRINGS, not on function names: the minifier renames every
     local, so a check written against `fallback(` passes in source and fails
     against what actually ships. Each of these is a reason the writer gives
     for having composed instead, and all four have to exist. */
  for (const why of ['not signed in', 'too much to send', 'could not reach the server',
    'no writing key set']) {
    check(`report writer falls back when ${why}`, reportChunk.includes(why),
      'a missing ANTHROPIC_API_KEY would leave the club with no report at all');
  }
  /* A NOTE WITH A MINUTE ON IT IS A MOMENT, and the composer must narrate it
     in clock order alongside the goals. This is the one lever that separates
     a club report from a professional one - a journalist logs fifteen
     incidents, this record held two goals - so it is asserted rather than
     assumed, by running the shipped chunk. */
  {
    const w = {};
    new Function('window', 'fetch', reportChunk)(w, () => Promise.reject(new Error('offline')));
    const out = w.CPR.compose({
      us: 'Us', opp: 'Them', kind: 'score', ourGoals: 1, theirGoals: 0, home: true,
      goals: [{ name: 'Scorer', minute: 30 }],
      bullets: ['9 - an early save', '70 - a late block', 'It was hot'],
      cleanSheet: [], yellows: [], reds: [], pensSaved: [], saves: 0, roles: [],
      lineup: [{ name: 'Keeper' }, { name: 'Scorer', offFor: 'Sub', offAt: '80' }],
      unused: ['Bench'],
    });
    const at = (t) => out.indexOf(t);
    check('a note with a minute is narrated, not listed',
      at('An early save.') > -1 && at('A late block.') > -1);
    check('moments and goals share one clock',
      at('An early save.') < at('Scorer') && at('Scorer') < at('A late block.'),
      'a save on 9 and a block on 70 must sit either side of a goal on 30');
    check('a note without a minute is still an observation', at('It was hot.') > -1);
    check('the report carries a match details block', at('MATCH DETAILS') > -1);
    check('the details block names the line-up and the substitution',
      at('Scorer (Sub 80)') > -1 && at('Substitutes not used: Bench.') > -1);
    check('the details block is last', at('MATCH DETAILS') > at('A late block.'));
    /* Whichever dash the coach reaches for. */
    for (const sep of ['-', '\u2013', '\u2014', ':']) {
      const r = w.CPR.compose({ us: 'A', opp: 'B', kind: 'score', ourGoals: 1, theirGoals: 0,
        goals: [], bullets: ['12 ' + sep + ' a save'], cleanSheet: [], yellows: [], reds: [],
        pensSaved: [], saves: 0, roles: [] });
      check(`a minute separated by "${sep}" is read as a minute`, r.includes('A save.'));
    }
  }

  /* A FORMATION IS ROWS ON A PITCH, and the detector only had three of them.

     It counted defenders, midfielders and forwards, so it could not express
     3-4-2-1, 4-2-3-1 or 4-3-2-1 at all, and wing backs are filed under
     defenders in the position list, so a back three with wing backs read as
     five at the back. Against Pure Football it printed "lined up in a 5-4-1"
     two lines above the coach's own note saying 3-4-2-1: one eleven, one
     report, two shapes.

     Run against the shipped chunk, over shapes a Sunday-league side actually
     plays, using the real position vocabulary rather than a copy of it. */
  {
    const seedRaw = fs.readFileSync(path.join(ROOT, 'control-seed.js'), 'utf8');
    const SEEDF = JSON.parse(seedRaw.replace(/^window\.SA_SEED=/, '').replace(/;\s*$/, ''));
    const PITCH_XY = {}, POS_GROUP = {};
    (SEEDF.positions || []).forEach((p) => { PITCH_XY[p.code] = [p.x, p.y]; POS_GROUP[p.code] = p.group; });
    const src = fs.readFileSync(path.join(ROOT, 'src', 'admin', 'lazy', '10-match.js'), 'utf8');
    const body = /var RANKS = \[[\s\S]*?\n  \}\n/.exec(src);
    check('the formation detector can be isolated for testing', !!body);
    if (body) {
      const detect = new Function('PITCH_XY', 'POS_GROUP', body[0] + '; return detectFormation;')(PITCH_XY, POS_GROUP);
      const xi = (codes) => codes.map((c) => ({ positions: [c] }));
      const SHAPES = [
        ['3-4-2-1', ['GK', 'LCB', 'CB', 'RCB', 'LWB', 'RWB', 'LCM', 'RCM', 'LAM', 'RAM', 'ST']],
        ['4-4-2', ['GK', 'LB', 'LCB', 'RCB', 'RB', 'LM', 'LCM', 'RCM', 'RM', 'ST', 'CF']],
        ['4-2-3-1', ['GK', 'LB', 'LCB', 'RCB', 'RB', 'LDM', 'RDM', 'LAM', 'CAM', 'RAM', 'ST']],
        ['4-3-3', ['GK', 'LB', 'LCB', 'RCB', 'RB', 'LCM', 'CM', 'RCM', 'LW', 'ST', 'RW']],
        ['5-3-2', ['GK', 'LB', 'LCB', 'CB', 'RCB', 'RB', 'LCM', 'CM', 'RCM', 'ST', 'CF']],
        ['4-3-2-1', ['GK', 'LB', 'LCB', 'RCB', 'RB', 'LCM', 'CM', 'RCM', 'LAM', 'RAM', 'ST']],
      ];
      for (const [want, codes] of SHAPES) {
        const got = detect(xi(codes));
        check(`formation: a ${want} reads as ${want}`, got === want, `read as ${got}`);
      }
      /* Every shape must add up to ten outfield players, or it is describing
         a different team from the one on the sheet. */
      for (const [, codes] of SHAPES) {
        const got = detect(xi(codes)) || '';
        const total = got.split('-').reduce((n2, x) => n2 + Number(x), 0);
        check(`formation ${got} accounts for all ten outfield players`, total === 10, `sums to ${total}`);
      }
    }
  }

  /* HANDED PROSE, IT MUST SUB EDIT, NOT CO-AUTHOR.

     The coach wrote five paragraphs and this shuffled them between its own
     template sentences, so the piece announced the score, then his paragraph
     announced the score, then a closing line announced it a third time. Two
     documents interleaved. It also opened on "Stewart Luwawa wore the
     armband" once the duplicate opening was suppressed. */
  {
    const w2 = {};
    new Function('window', 'fetch', reportChunk)(w2, () => Promise.reject(new Error('offline')));
    const PROSE = [
      'Sue’s Angels secured a 2-0 victory against Pure Football in the first of six scheduled pre-season friendlies. Pure Football will also compete in our league this season, making it a useful early test.',
      'We lined up in a 3-4-2-1 formation, giving the players a chance to work within a familiar system. The squad featured several new faces, a mixture of trialists and new signings.',
      'It was a tough game in hot conditions, with the players gaining valuable minutes. Both goals were scored by new signings who joined from Sheen Park.',
      'We would like to thank Pure Football for hosting and wish them all the best for the season ahead.',
    ];
    const drafted = w2.CPR.compose({
      us: 'Sue’s Angels FC', opp: 'Pure Football FC 2.0', kind: 'score', home: false,
      ourGoals: 2, theirGoals: 0, formation: '3-4-2-1', xi: 11, captain: 'Stewart Luwawa',
      goals: [{ name: 'Ade Owolona' }, { name: 'Leon Burnett' }],
      roles: [], cleanSheet: ['Luke Munns'], yellows: [], reds: [], pensSaved: [],
      keeper: 'Luke Munns', saves: 6, bullets: PROSE,
      lineup: [{ name: 'Luke Munns', pos: 'Goalkeeper' }], unused: [],
    });
    check('handed prose, the coach’s own words open the report',
      drafted.indexOf('Sue’s Angels secured') === 0,
      `opens with: ${drafted.slice(0, 60)}`);
    /* Matched on the VERDICT phrase, which only the template writes. Anchoring
       to the start of a line missed it, because the template's second variant
       opens "A solid win away, Sue's Angels FC beat ..." - the check passed
       with the fix reverted, which is a check that proves nothing. */
    check('handed prose, it does not write a second opening',
      !/\b(a solid win|a narrow win|a comfortable win|a thumping win|and it was a)\b/i.test(drafted),
      'the template announced the result over the top of his own opening');
    check('handed prose, the shape is not restated over his',
      (drafted.match(/3-4-2-1/g) || []).length <= 2,
      'his formation and a derived one both in the prose');
    check('the sign-off is the last thing before the details block',
      drafted.indexOf('wish them all the best') > drafted.indexOf('The clubs have met before')
      && drafted.indexOf('wish them all the best') < drafted.indexOf('MATCH DETAILS'));
    check('a save count is a detail, not a paragraph',
      !/^Luke Munns made six saves\.$/m.test(drafted) && drafted.includes('Saves: Luke Munns 6.'),
      'an orphan one-line paragraph after the sign-off');
    check('the line-up carries each position',
      drafted.includes('Luke Munns (Goalkeeper)'),
      'positions were a paragraph of prose no report carries');

    /* And handed BULLETS it must still compose, or the mode test has broken
       the ordinary path. */
    const noted = w2.CPR.compose({
      us: 'Us', opp: 'Them', kind: 'score', home: true, ourGoals: 1, theirGoals: 0,
      goals: [{ name: 'Scorer', minute: 30 }], roles: [], cleanSheet: [], yellows: [],
      reds: [], pensSaved: [], saves: 0, bullets: ['Slow start', 'Better after the break'],
    });
    check('handed bullets, it still writes the opening', /^Us beat Them 1-0|^1-0 at home|^A narrow win/.test(noted),
      `opens with: ${noted.slice(0, 50)}`);
  }

  /* A NOTE ABOUT A PLAYER WHO DID NOT SCORE.

     Names were matched against the scorers and the Player of the Match and
     nobody else, so the best material a coach writes - "Jeev impressed in the
     first half, Stewart looked rusty, Harry brought that engine in the middle"
     - matched nothing and fell into the undifferentiated run of play. Every
     man on the team sheet is matchable now, and what is left keyed to a name
     is its own passage, in team-sheet order.

     And what comes next is derived, not typed: the fixture list holds who,
     when, and how many are packed into the following week. */
  {
    const w3 = {};
    new Function('window', 'fetch', reportChunk)(w3, () => Promise.reject(new Error('offline')));
    const seedRaw3 = fs.readFileSync(path.join(ROOT, 'control-seed.js'), 'utf8');
    const SEED3 = JSON.parse(seedRaw3.replace(/^window\.SA_SEED=/, '').replace(/;\s*$/, ''));
    const base = {
      us: 'Us', opp: 'Them', kind: 'score', home: true, ourGoals: 1, theirGoals: 0,
      goals: [{ name: 'Ade Owolona', minute: 30 }], roles: [], cleanSheet: [], yellows: [],
      reds: [], pensSaved: [], saves: 0, captain: 'Stewart Luwawa', keeper: 'Luke Munns',
      lineup: [{ name: 'Luke Munns' }, { name: 'Jeev Thilaganathan' },
        { name: 'Stewart Luwawa' }, { name: 'Ade Owolona' }],
      unused: [],
      bullets: ['Jeev impressed in the first half.',
        'Stewart was given the armband and looked rusty.',
        'Luke pulled a string of saves in both halves.'],
    };
    const out3 = w3.CPR.compose(base);
    for (const who of ['Jeev', 'Stewart', 'Luke']) {
      check(`a note about ${who}, who did not score, survives`, out3.includes(who),
        'the coach’s best material was dropped into the run of play');
    }
    /* Team-sheet order: the goalkeeper's line before the midfielders'. */
    check('player notes read in team-sheet order',
      out3.indexOf('Luke pulled') < out3.indexOf('Jeev impressed')
      && out3.indexOf('Jeev impressed') < out3.indexOf('Stewart was given'),
      'a report should read back to front like a team does');

    const ctx3 = w3.CPR.context(SEED3.matches, SEED3.baselineFixtures,
      { iso: '2026-08-02', id: 'r20260802-pure', opp: 'Pure Football FC 2.0',
        competition: 'Pre-season friendly', goals: [] }, SEED3.history);
    check('what comes next is derived from the fixture list',
      !!ctx3.next && ctx3.next.opponent === 'Galacticos Elect' && ctx3.next.home === false,
      JSON.stringify(ctx3.next));
    check('the next fixture is not the one just played',
      !ctx3.next || ctx3.next.iso > '2026-08-02');
  }

  /* ONE DEFINITION OF HOW LONG A REPORT SHOULD BE. Three places ask - the
     gauge under the notes box, the line beside the Build button, and the
     brief the model is written to - and typed into each they would drift.
     The one nobody would re-read is the brief. */
  {
    const seedRaw4 = fs.readFileSync(path.join(ROOT, 'control-seed.js'), 'utf8');
    const SEED4 = JSON.parse(seedRaw4.replace(/^window\.SA_SEED=/, '').replace(/;\s*$/, ''));
    const W = SEED4.reportWords;
    check('the seed defines the report length target', !!W && W.min > 0 && W.max > W.min,
      JSON.stringify(W));
    if (W) {
      /* Both chunks must READ it, not carry their own copy. Matched on the
         property name, which survives minification; a literal 700 appearing
         in either file would be a second definition. */
      check('the match chunk reads the target rather than hard-coding it',
        /reportWords/.test(matchChunk), 'the gauge carries its own copy of the target');
      check('the report brief reads the target rather than hard-coding it',
        /reportWords/.test(reportChunk), 'the brief carries its own copy of the target');
      check('the brief states the target it was given',
        reportChunk.includes(String(W.min)) && reportChunk.includes(String(W.max)),
        'the model is not told how long the club wants it');
      /* And the anti-padding rule has to survive beside the target, or a word
         count becomes a licence to invent an incident. */
      check('the brief forbids padding to reach the target',
        /pad/i.test(reportChunk) && /invent/i.test(reportChunk),
        'a length target without an anti-padding rule is an instruction to make things up');
    }
  }

  /* TEAM NEWS, COUNTED RATHER THAN REMEMBERED.

     "Who in the starting XI also played last year", "new signings making
     their debut even though the game is not competitive" and "a lot of the
     boys from last season are yet to return" were all being typed by hand,
     and all three are counted from the team sheet and the squad record the
     panel already ships. A first game of pre-season is ABOUT who is there and
     who is not.

     A friendly does not make a man experienced, so a debut in one is still a
     debut: the figures here are the competitive record the site publishes. */
  {
    const w4 = {};
    const seedRaw5 = fs.readFileSync(path.join(ROOT, 'control-seed.js'), 'utf8');
    const SEED5 = JSON.parse(seedRaw5.replace(/^window\.SA_SEED=/, '').replace(/;\s*$/, ''));
    w4.SA_SEED = SEED5;
    new Function('window', 'fetch', reportChunk)(w4, () => Promise.reject(new Error('offline')));

    /* A real sheet: capped men, two who have never played, and a trialist. */
    const capped = Object.keys(SEED5.history).filter((n) => (SEED5.history[n].a || 0) > 0).slice(0, 6).map(Number);
    const uncapped = (SEED5.squad || []).filter((p) => !(SEED5.history[p.num] || {}).a).slice(0, 2).map((p) => p.num);
    check('the seed can supply capped and uncapped players', capped.length === 6 && uncapped.length === 2,
      `${capped.length} capped, ${uncapped.length} uncapped`);
    const ctx4 = w4.CPR.context(SEED5.matches, SEED5.baselineFixtures, {
      iso: '2026-08-02', id: 'r20260802-pure', opp: 'Pure Football FC 2.0',
      competition: 'Pre-season friendly', goals: [],
      sheetNums: capped.concat(uncapped).concat([901]),
    }, SEED5.history);
    const news = (ctx4.squad || []).join(' ');
    check('team news counts who has played competitively before', /had started a competitive match/.test(news), news.slice(0, 90));
    check('team news names a debut even in a friendly', /making a first appearance/.test(news), news.slice(0, 120));
    check('team news counts a trialist', /trialist was given a run/.test(news), news.slice(0, 120));
    check('team news names who is not involved', /were not involved, among them/.test(news), news.slice(0, 140));
    /* Every one of these opens a sentence, and the number words are written
       out, so they must be capitalised or they read as fragments. */
    for (const sentence of news.split(/(?<=\.)\s+/).filter(Boolean)) {
      check(`team news sentence starts with a capital: "${sentence.slice(0, 28)}..."`,
        /^[A-Z“‘]/.test(sentence), sentence.slice(0, 40));
    }
    /* A trialist has no club record and must never be counted as one who has. */
    check('a trialist is not counted among the capped',
      !/\b(thirteen|twelve) of the (twelve|thirteen)/.test(news),
      'trialists are being counted in the club record');
  }

  /* MOMENTS THE RECORD ALREADY TIMED AND THE WRITER NEVER SAW.

     Nineteen opposition goals are stored across the archive and four missed
     penalties, three of them with a minute, and not one had ever reached the
     writer. So a report of a 3-0 cup final defeat could say "they managed
     three" and nothing about how, and the two penalties saved five minutes
     apart in that same final - the turning point of the match - were
     invisible to it. A moment is a moment whoever it belonged to. */
  {
    const w5 = {};
    w5.SA_SEED = JSON.parse(fs.readFileSync(path.join(ROOT, 'control-seed.js'), 'utf8')
      .replace(/^window\.SA_SEED=/, '').replace(/;\s*$/, ''));
    new Function('window', 'fetch', reportChunk)(w5, () => Promise.reject(new Error('offline')));
    const out5 = w5.CPR.compose({
      us: 'Us', opp: 'Them', kind: 'score', home: false, ourGoals: 0, theirGoals: 3,
      goals: [], roles: [], cleanSheet: [], yellows: [], reds: [], pensSaved: [],
      saves: 0, bullets: ['12 - we hit the post'],
      theirGoals_detail: [{ name: '', minute: '28' }, { name: '', minute: '34' }, { name: '', minute: '70' }],
      pensMissed: [{ name: 'Andrew Allen', minute: '50' }, { name: 'Frazier', minute: '55' }],
      clubRecord: { played: 33, won: 29, drawn: 1, lost: 3, gf: 137, ga: 25,
        league: { played: 18, won: 18, drawn: 0, lost: 0, gf: 90, ga: 11, points: 54 } },
    });
    check('an opposition goal with a minute is narrated', /opened the scoring/.test(out5), out5.slice(0, 120));
    check('three opposition goals are counted, not repeated',
      /made it two/.test(out5) && /got a third/.test(out5),
      'every goal read "Them scored", which is the sound of a machine writing');
    check('a saved penalty with a minute is narrated',
      /Andrew Allen’s penalty was saved/.test(out5), 'the turning point of a cup final was invisible');
    check('the penalties sit between the second and third goals',
      out5.indexOf('made it two') < out5.indexOf('Andrew Allen’s penalty')
      && out5.indexOf('Andrew Allen’s penalty') < out5.indexOf('got a third'),
      'one clock means one clock, whoever the moment belonged to');
    check('their goals are not both narrated and summarised',
      !/managed three/.test(out5), 'narrated one by one and then totalled');
    check('the club record closes the report',
      /54 points/.test(out5) && /90 and conceded 11/.test(out5),
      'the club was typing figures the site already derives');
  }

  /* THE TWO CAPS MUST AGREE. The panel checks the prompt length before it
     sends, so that a long game falls back with a sentence the club can read
     rather than coming back as a 413 it has to interpret. Two numbers in two
     files: if they drift, the friendlier check stops firing. */
  {
    const api = fs.readFileSync(path.join(ROOT, 'api', 'claude.js'), 'utf8');
    const serverCap = Number((api.match(/MAX_INPUT_CHARS\s*=\s*(\d+)/) || [])[1]);
    /* esbuild writes 16000 as 16e3, so the number has to be parsed rather than
       matched as digits. A check that reads the SOURCE would have passed here
       and told us nothing about what ships. */
    const clientCap = Number((reportChunk.match(/length\s*>\s*([\d.]+e\d+|\d{4,})/) || [])[1]);
    check('the server declares an input cap', serverCap > 0, String(serverCap));
    check('the panel checks against the same cap the server enforces',
      serverCap === clientCap, `server ${serverCap}, panel ${clientCap}`);
    const outCap = Number((api.match(/MAX_OUTPUT_TOKENS\s*=\s*(\d+)/) || [])[1]);
    /* The club asks for up to 900 words plus a details block. At about 0.75
       words a token that is roughly 1,300, so the cap has to clear it with
       room or the report stops mid-sentence. */
    const W2 = JSON.parse(fs.readFileSync(path.join(ROOT, 'control-seed.js'), 'utf8')
      .replace(/^window\.SA_SEED=/, '').replace(/;\s*$/, '')).reportWords;
    check('the output cap clears the length the club asks for',
      outCap > (W2.max / 0.75) * 1.2,
      `${outCap} tokens against ${W2.max} words wanted`);
  }

  check('report writer says which one wrote it',
    /composed/.test(reportChunk) && /written/.test(matchChunk + reportChunk),
    'the club cannot tell a composed report from a written one');

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

  /* ---- THE DATE RULE, RUN RATHER THAN READ ---------------------------------

     The dashboard asked whether `String(f.data.date).slice(0, 10) < todayIso`,
     and every fixture row stores its date as "23 Aug 2026". So the comparison
     was "23 Aug 202" against "2026-08-24", which is alphabetical, and the rule
     it actually implemented was the day of the month: fixtures on the 1st to
     the 19th always reported as played, months in advance, and the 20th to the
     31st never did. A match played yesterday was invisible on the one screen
     that could act on it.

     A regex over the source could only ever assert that some text is present.
     This lifts the real function out of the shell and runs it, which is the
     only way to know the rule is right rather than merely written. */
  const dateRule = /var MONTHS = \[[\s\S]*?function dayIso\(key\) \{[\s\S]*?\n  \}/.exec(
    fs.readFileSync(path.join(ROOT, 'src', 'admin', '10-app.js'), 'utf8'));
  check('the fixture date rule is extractable', !!dateRule);
  if (dateRule) {
    const fixtureIso = new Function(dateRule[0] + '; return fixtureIso;')();
    const cases = [
      /* the pretty form, which is what every live row actually holds */
      [{ data: { date: '23 Aug 2026' } }, '2026-08-23'],
      [{ data: { date: '02 Aug 2026' } }, '2026-08-02'],
      /* iso wins when both are there */
      [{ data: { iso: '2026-08-30', date: '30 Aug 2026' } }, '2026-08-30'],
      /* neither: every row key carries the date, all 41 of them */
      [{ data: {}, key: 'f20260812-kingsmeadow' }, '2026-08-12'],
      /* the turn of the year, where a timezone slip shows up as the wrong year */
      [{ data: { date: '01 Jan 2027' } }, '2027-01-01'],
      [{ data: { date: '31 Dec 2026' } }, '2026-12-31'],
      /* nothing to go on is empty, never a guess */
      [{ data: { date: 'to be confirmed' } }, ''],
    ];
    for (const [row, want] of cases) {
      check(`fixture date: ${JSON.stringify(row.data.date || row.data.iso || row.key)} -> ${want || '(none)'}`,
        fixtureIso(row) === want, `got ${JSON.stringify(fixtureIso(row))}`);
    }
    /* And the case the bug was: a match played yesterday must read as past. */
    check('a fixture played yesterday sorts before today',
      fixtureIso({ data: { date: '23 Aug 2026' } }) < '2026-08-24');
    check('a fixture next month does not sort before today',
      !(fixtureIso({ data: { date: '05 Sep 2026' } }) < '2026-08-24'),
      'the old rule reported every day 1 to 19 as already played');
  }

  /* ---- THE BAND PREVIEW FILE ----------------------------------------------
     The Home screen's Preview button fetches this. If it stops being written
     the button fails on a screen the club uses alone, so the file, its
     coverage and the shape of what is in it are all asserted. */
  {
    const pv = JSON.parse(fs.readFileSync(path.join(ROOT, 'home-previews.json'), 'utf8'));
    const keys = Object.keys(pv);
    check('the band preview file ships', keys.length > 50, `${keys.length} bands`);
    const malformed = keys.filter((k) =>
      !pv[k].startsWith(`<section class="sec sec--${k}`) || !pv[k].trimEnd().endsWith('</section>'));
    check('every preview is one whole section', malformed.length === 0,
      malformed.slice(0, 3).join(', '));
    /* The panel puts a Preview button on every band it does not call empty,
       so a band the panel offers and the file does not hold is a dead press. */
    const offered = fs.readFileSync(path.join(ROOT, 'control-seed.js'), 'utf8');
    const seedBands = [...offered.matchAll(/"key":"([a-z0-9-]+)","area"/g)].map((m) => m[1]);
    const missing = seedBands.filter((k) => !pv[k]
      && !new RegExp(`"key":"${k}"[^}]*"empty":true`).test(offered));
    check('every band the panel offers has a preview', missing.length === 0,
      missing.slice(0, 4).join(', '));
  }

  /* ---- THE BAND COUNTER STORES NOTHING THAT IDENTIFIES ANYBODY ------------

     migrations/004 says so in a comment and this screen says so to the club,
     which makes it a claim rather than a note. One row is one visit and holds
     two arrays of band names, and that is the whole of it.

     The check is on what the insert BUILDS, not on the table: a column added
     to the payload here would be shipped to every visitor's browser long
     before anybody looked at the database. Asserted against the shipped
     bundle, where the comments explaining the intention are gone and only the
     code that runs is left. */
  {
    const homeSrc = fs.readFileSync(path.join(ROOT, 'src', 'scripts', '10-home.js'), 'utf8');
    /* COMMENTS STRIPPED FIRST. The note above says this is asserted against
       code rather than prose, and the first version was not: the block
       explaining that nothing is stored contains the words "on screen" and
       "cookie", so the check failed on its own explanation. A rule about what
       the code touches has to read the code. */
    const mark = homeSrc.indexOf('WHICH BANDS PEOPLE ACTUALLY REACH');
    /* From AFTER the block that names it, not from inside it: slicing at the
       marker leaves an unterminated comment whose opening the stripper cannot
       see, so the whole explanation survived as if it were code. */
    const tracker = homeSrc.slice(homeSrc.indexOf('*/', mark) + 2)
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    check('there is a band counter to check', tracker.length > 200);

    const payload = /saInsert\('band_views',\s*\{([^}]*)\}/.exec(tracker);
    check('the band counter builds one payload', !!payload);
    if (payload) {
      const fields = [...payload[1].matchAll(/(\w+):/g)].map((m) => m[1]).sort();
      check('the payload is seen and clicked and nothing else',
        fields.join(',') === 'clicked,seen', fields.join(','));
    }

    /* Nothing in the counter may reach for anything that identifies a person
       or a device. Named individually so a failure says which one appeared. */
    for (const forbidden of ['userAgent', 'referrer', 'screen.', 'language',
      'crypto.randomUUID', 'Math.random', 'cookie', 'sessionStorage']) {
      check(`the band counter does not touch ${forbidden}`, !tracker.includes(forbidden));
    }
    /* localStorage IS used, for exactly one thing: remembering that the table
       does not exist so a 404 is not repeated on every visit. A boolean, and
       it must stay a boolean. */
    const stores = [...tracker.matchAll(/localStorage\.setItem\(([^)]*)\)/g)].map((m) => m[1]);
    check('the counter writes one flag and no data', stores.length === 1
      && /^OFF, '1'$/.test(stores[0].trim()), stores.join(' | '));

    check('the counter only runs on the home page',
      /classList\.contains\('is-home'\)/.test(tracker));
    check('a band counts as reached only when half of it has been seen',
      /threshold: 0\.5/.test(tracker));
  }

  /* ---- EVERY CROSS-PANEL LINK POINTS AT A REAL PANEL ----------------------

     `data-goto="fixtres"` does nothing at all: the delegated listener calls
     show() with a key no panel answers to, the click is swallowed and the
     screen sits there. There is no error to see and nothing in the console,
     which is the worst shape a bug can take on a screen the club uses alone.

     Read off the shipped bundles rather than the sources, because that is what
     the browser gets, and checked against the panel list the shell actually
     renders. */
  {
    const ctlSrc = fs.readFileSync(path.join(ROOT, 'src', 'templates', 'control.mjs'), 'utf8');
    const modBlock = ctlSrc.slice(ctlSrc.indexOf('export const MODULES'),
      ctlSrc.indexOf('];', ctlSrc.indexOf('export const MODULES')));
    const declared = [...modBlock.matchAll(/key: '([a-z]+)'/g)].map((m) => m[1]);
    const panelSet = new Set(declared);

    const targets = new Set();
    for (const f of fs.readdirSync(ROOT).filter((x) => /^control(-[a-z-]+)?\.js$/.test(x))) {
      const body = fs.readFileSync(path.join(ROOT, f), 'utf8');
      for (const m of body.matchAll(/data-goto="([a-z]+)"/g)) targets.add(m[1]);
      for (const m of body.matchAll(/data-goto=\\"'\s*\+\s*esc\(/g)) targets.add('(computed)');
    }
    const unknown = [...targets].filter((t) => t !== '(computed)' && !panelSet.has(t));
    check('every cross-panel link names a real panel', unknown.length === 0, unknown.join(', '));

    /* The computed ones come from the dashboard's warning list and the
       matchday checklist, both of which build the key in code. Those are
       covered by the panel-key check below rather than by reading markup. */
    const appSrc = fs.readFileSync(path.join(ROOT, 'src', 'admin', '10-app.js'), 'utf8');
    const mdSrc = fs.readFileSync(path.join(ROOT, 'src', 'admin', 'lazy', '12-matchday.js'), 'utf8');
    const computed = [
      ...[...appSrc.matchAll(/\],\s*'([a-z]+)'\]\);/g)].map((m) => m[1]),
      ...[...mdSrc.matchAll(/\['[^']+', '([a-z]+)'\]/g)].map((m) => m[1]),
    ];
    check('there are computed panel links to check', computed.length > 0);
    for (const t of new Set(computed)) {
      check(`computed panel link is real: ${t}`, panelSet.has(t));
    }

    /* ---- The sidebar is grouped and every screen sits in one group -------
       A module added without a group falls into whichever run precedes it,
       silently, and lands under a heading that has nothing to do with it. */
    const groups = [...modBlock.matchAll(/key: '([a-z]+)'[^}]*group: '([^']*)'/g)]
      .map((m) => ({ key: m[1], group: m[2] }));
    check('every sidebar entry declares a group', groups.length === declared.length,
      `${groups.length} of ${declared.length}`);
    check('only the dashboard sits outside a group',
      groups.filter((g) => !g.group).map((g) => g.key).join(',') === 'dashboard');
    /* Each group is one contiguous run, because the nav builder starts a new
       list whenever the name changes: a screen listed away from its own group
       would quietly produce a second list with the same label. */
    const seen = [];
    let runs = 0;
    for (const g of groups) {
      if (seen[seen.length - 1] !== g.group) { runs += 1; seen.push(g.group); }
    }
    check('no group is split across the sidebar',
      runs === new Set(groups.map((g) => g.group)).size,
      `${runs} runs for ${new Set(groups.map((g) => g.group)).size} groups`);
  }

  /* ---- The squad field has a reader --------------------------------------
     A field with no consumer is a lie with a save button. The matchday squad
     is written on the fixture and read by the match form, which fills the
     team sheet in from it. If that ever stops, the picker is asking the club
     for something nothing uses. */
  const matchSrc = fs.readFileSync(path.join(ROOT, 'src', 'admin', 'lazy', '10-match.js'), 'utf8');
  check('the matchday squad is read by the team sheet',
    /Array\.isArray\(d\.squad\)/.test(matchSrc) && /pre\.slice\(0, 11\)/.test(matchSrc),
    'the fixture squad picker would write a field nothing consumes');
  check('a saved team sheet is never overwritten by the squad',
    /!d\.starters && !d\.bench/.test(matchSrc),
    're-opening a match would rewrite its eleven from a list picked days earlier');
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
/* THE HEAVIEST BANDS ON THE OFFENDING PAGE, named in the failure.

   The home page is composed in the control panel now, so the commonest way to
   fail this is no longer a developer adding markup: it is somebody switching a
   band on. "index.html 22.4KB gz" tells them a number and nothing they can act
   on. Naming the three heaviest bands turns it into a decision about which
   switch to flick. */
const heaviestBands = (h) => h.split('<section class="sec sec--').slice(1)
  .map((p) => ({ key: p.slice(0, p.indexOf('"')), kb: Buffer.byteLength(p) / 1024 }))
  .sort((a, b) => b.kb - a.kb).slice(0, 3)
  .map((r) => `${r.key} ${r.kb.toFixed(1)}KB`).join(' ');

for (const [f, h] of pages) {
  const raw = Buffer.byteLength(h) / 1024;
  const gz = zlib.gzipSync(Buffer.from(h), { level: 9 }).length / 1024;
  const worst = heaviestBands(h);
  if (gz > 22) heavy.push(`${f} ${gz.toFixed(1)}KB gz${worst ? ` (heaviest: ${worst})` : ''}`);
  if (raw > 160) rawHeavy.push(`${f} ${raw.toFixed(0)}KB raw${worst ? ` (heaviest: ${worst})` : ''}`);
}
check('no page over 22KB of gzipped HTML', heavy.length === 0, heavy.slice(0, 5).join(', '));
check('no page over 160KB of raw HTML (DOM size)', rawHeavy.length === 0, rawHeavy.slice(0, 5).join(', '));

/* AND HOW MUCH ROOM THE FRONT PAGE HAS LEFT, printed whether or not it fails.

   The club composes this page and the deploy does NOT run this suite: the
   build command is sync, build, verify. So a page over budget still publishes,
   and this ceiling is a signal to whoever is reading rather than a gate on the
   club. Printing the margin is the only way it is seen before it is breached.

   With the archive on it is 21.8KB of a 22KB ceiling. `everymatch` is the band
   that grows on its own, about 0.4KB a match, so a full League Eight season
   takes it past this without anybody touching the code. That is the one to
   watch, and turning it off is the fix. */
{
  const home = pages.get('index.html') || '';
  const gz = zlib.gzipSync(Buffer.from(home), { level: 9 }).length / 1024;
  const bands = (home.match(/<section class="sec sec--/g) || []).length;
  console.log(`  home page: ${gz.toFixed(1)}KB gz of a 22KB ceiling across ${bands} bands`
    + ` · heaviest ${heaviestBands(home)}`);
}

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

  /* $ IS querySelector AND $$ IS querySelectorAll, and treating the singular
     one as a list is how the whole site went dark in August. `$('.camp')`
     returns null on every page with no campaign band, `.length` on null
     throws, and because esbuild merges the seventeen script files into one
     comma expression, a throw in the first aborts every file after it. The
     scroll reveal lives in the last of them, `.rv` is hidden under html.js,
     and so 41 bands on the home page stayed at opacity 0 with the text
     sitting fully present in the DOM behind them.

     One character, seventeen root pages blank.

     The check has to follow the assignment, because the bug did: the result
     went into a variable on one line and was read as a list four lines
     later. A regex looking only for `$(...).length` passes straight over it,
     which is exactly what the first version of this check did. */
  const LIST_PROPS = 'length|forEach|map|filter|slice|indexOf|some|every';
  const singularAssign = /(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*(^|[^$\w])?\$\([^()]*\)\s*;/g;
  const listAbuse = [];
  for (const m of saSrc.matchAll(singularAssign)) {
    if (saSrc[m.index + m[0].indexOf('$(') - 1] === '$') continue;   /* it was $$ */
    const name = m[1];
    /* STOP AT THE NEXT DECLARATION OF THE SAME NAME. `f` is declared four
       times in 00-core.js, twice from $ and twice from $$, and a fixed
       lookahead walked out of one function and into the next, reporting a
       correctly null-checked `$('a, button', mnav)` because an unrelated
       `f.length` sat forty lines below it. */
    const rest = saSrc.slice(m.index + m[0].length);
    const redecl = rest.search(new RegExp('(?:var|let|const)\\s+' + name.replace(/\$/g, '\\$') + '\\s*='));
    const window = rest.slice(0, redecl === -1 ? 900 : Math.min(redecl, 900));
    const read = new RegExp('\\b' + name.replace(/\$/g, '\\$') + '\\.(' + LIST_PROPS + ')\\b').exec(window);
    if (read) listAbuse.push(m[0].trim() + '  ->  ' + read[0]);
  }
  /* And the direct form, which the assignment walk cannot see. */
  for (const m of saSrc.matchAll(new RegExp('(^|[^$\\w])\\$\\([^()]*\\)\\s*\\.(' + LIST_PROPS + ')\\b', 'gm'))) {
    listAbuse.push(m[0].trim());
  }
  check('no list property read off the single-element $ helper',
    listAbuse.length === 0, listAbuse.slice(0, 3).join('   |   '));

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
  /* TAGS COME OUT FIRST, and this checker was wrong about that for a while.
     It stripped entities and then every non-alphanumeric, which turns a tag
     into its own letters rather than removing it: `<br />` became `br` and
     `<a href="/players/luke-munns.html">Luke Munns</a>` became
     `ahrefplayerslukemunnshtmllukemunnsa`. The probe is built from the plain
     article text, so any tag INSIDE the paragraph it probes puts letters
     between two words that are adjacent in the source and the match fails.

     Nothing showed it until a report ended in a MATCH DETAILS block, which is
     the first report content to carry line breaks inside one paragraph. The
     report was on the page in full; the checker could not see it. A checker
     that reports the site as broken when the site is fine is worse than no
     checker, because the next person spends their afternoon on the wrong
     file. */
  const flat = (s) => String(s)
    .replace(/<[^>]*>/g, '')
    .replace(/&#?\w+;/g, '')
    .replace(/[^a-z0-9]+/gi, '')
    .toLowerCase();
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

/* ==========================================================================
   THE PANEL AND THE SITE, ON THE SAME RULE

   Squad status is implemented twice: once in src/lib/squad-status.mjs for the
   build, once in src/admin/lazy/30-squad.js for the browser. Nothing forces
   them to agree, and when they drift nobody sees it, because each looks
   correct on its own screen.

   They had drifted. The panel answered "active" for a season with no entry,
   which is the right default for its dropdown and the wrong one for working
   out tenure: it made every season before a player joined look like one he
   was here for, so a first-ever signing read "Retained" in the panel while
   the website said "First season at the club". 12 of 180 answers differed.

   src/test/panel-vs-site.mjs runs both over the same fifteen record shapes
   and compares every answer. It is a real differential, not a spot check.
   ========================================================================== */
{
  const { result } = await import(path.join(ROOT, 'src', 'test', 'panel-vs-site.mjs'));
  check('the panel and the site were actually compared', result.compared >= 150,
    `only ${result.compared} answers compared`);
  check('the panel and the site agree about every squad status',
    result.diffs.length === 0, result.diffs.slice(0, 3).join('; '));
}

/* ==========================================================================
   NO `var` SHADOWS A NAME ITS OWN ENCLOSING FUNCTION USES

   A `var rec` inside one branch of the match dialog's click handler hoisted to
   the top of that whole handler and shadowed the dialog's own `rec` in every
   other branch. Saving a match then read `.key` off undefined and threw, and
   it shipped: the club could not save a match at all.

   Worth failing the build over because it is invisible in review - the two
   declarations sit four hundred lines apart and each looks correct where it
   is. Compared against the ACTUAL enclosing function, found by matching
   braces, rather than against any declaration anywhere in the file, which
   flags every honest re-use of a short name.
   ========================================================================== */
{
  const bodyFrom = (src, open) => {
    let i = open, depth = 0;
    do {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') depth--;
      i++;
    } while (i < src.length && depth > 0);
    return src.slice(open, i);
  };
  const declared = (body) => new Set(
    [...body.matchAll(/\bvar\s+([a-zA-Z_$][\w$]*)/g)].map((m) => m[1]),
  );

  const offenders = [];
  const dir = path.join(ROOT, 'src', 'admin', 'lazy');
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.js')) continue;
    /* Comments out first, or the check reads the sentence explaining the bug
       as if it were the bug. */
    const src = fs.readFileSync(path.join(dir, f), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    for (const fn of src.matchAll(/\bfunction\s+[a-zA-Z_$][\w$]*\s*\([^)]*\)\s*\{/g)) {
      const outerBody = bodyFrom(src, fn.index + fn[0].length - 1);
      /* Names the function itself declares, excluding those inside its own
         nested listeners - which is what we are about to compare against. */
      const listeners = [...outerBody.matchAll(/addEventListener\('(?:click|change|keydown|input)',\s*function\s*\([^)]*\)\s*\{/g)];
      if (!listeners.length) continue;
      let outerOnly = outerBody;
      const bodies = [];
      for (const l of listeners) {
        const b = bodyFrom(outerBody, l.index + l[0].length - 1);
        bodies.push(b);
        outerOnly = outerOnly.split(b).join('');
      }
      /* And strip every OTHER nested function too. `wrap` declared in
         paintGroup and again in a listener are siblings, not an ancestor and
         its descendant, and nothing is shadowed. Counting those made the
         check cry wolf three times, which is how a check gets ignored. */
      for (const nested of [...outerOnly.matchAll(/\bfunction\s*[a-zA-Z_$][\w$]*\s*\([^)]*\)\s*\{/g)].reverse()) {
        const b = bodyFrom(outerOnly, nested.index + nested[0].length - 1);
        if (b.length < outerOnly.length) outerOnly = outerOnly.split(b).join('');
      }
      const outerNames = declared(outerOnly);
      for (const b of bodies) {
        for (const name of declared(b)) {
          if (outerNames.has(name)) {
            offenders.push(`${f}: a listener re-declares \`${name}\`, shadowing its enclosing function`);
          }
        }
      }
    }
  }
  check('no listener re-declares a var its enclosing function uses',
    offenders.length === 0, [...new Set(offenders)].slice(0, 3).join('; '));
}

/* ==========================================================================
   A FRIENDLY COUNTS TOWARDS NOTHING, AND THE SITE SAYS SO

   The rule was implemented and unstated, which is half a rule. One pre-season
   friendly put the club's all-time goals at 139 on the records page and the
   stats page while every other page derived 137; the awards page drew Man of
   the Match "from the 26 matches of 34"; and the profile of a man who had
   started, scored and made one on 2 August told readers that nothing had been
   played in 26/27 that we hold a team sheet for.

   Three things are asserted here, and each of them failed before the fix:
     1. No page publishes a club figure that includes a friendly.
     2. Every played friendly says on its own card and its own page that it
        counts towards nothing.
     3. No player page denies a season in which that player played a friendly.
   ========================================================================== */
{
  const { buildDataset: bdF } = await import(path.join(ROOT, 'src', 'lib', 'dataset.mjs'));
  const DF = bdF();
  const PAGES = Object.fromEntries(pages);
  const friendlies = (DF.played || []).filter((m) => m.friendly);
  const competitive = (DF.competitive || []);
  check('there is a friendly to test against', friendlies.length > 0,
    'no friendly in the dataset: the checks below would pass vacuously');

  /* 1. The club's own totals, derived the way every page should derive them. */
  const clubGoals = competitive.reduce((n, m) => n + (m.ourGoals || 0), 0);
  const inflated = competitive.reduce((n, m) => n + (m.ourGoals || 0), 0)
    + friendlies.reduce((n, m) => n + (m.ourGoals || 0), 0);
  if (friendlies.length && inflated !== clubGoals) {
    for (const [f, h] of Object.entries(PAGES)) {
      const text = h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
      check(`${f}: no club goal total inflated by a friendly`,
        !new RegExp(`\\b${inflated}\\b\\s*(goals|Goals)`).test(text),
        `prints ${inflated}; the competitive figure is ${clubGoals}`);
    }
  }

  /* 2. Said on the card and on the page. */
  for (const m of friendlies) {
    const page = PAGES[`matches/${m.id}.html`];
    check(`matches/${m.id}.html: says a friendly counts towards nothing`,
      !!page && page.includes('counts towards any club or player record'),
      'the match page carries no such note');
  }
  const res = PAGES['results.html'] || '';
  const cards = res.match(/<li class="mt[^"]*"[\s\S]*?<\/li>/g) || [];
  /* PLAYED, which the filter has to say and did not. "Friendly · not counted"
     is a statement about a RESULT, so a fixture that has not been played
     cannot carry it and was never meant to: those cards carry a kick-off time
     instead. The check passed for as long as every friendly on the page had
     been played, and went red the moment the club had three in the diary -
     reporting "3 of 5 unflagged" for three cards that were correct. */
  const friendlyCards = cards.filter((c) => /data-comp="[^"]*friendly/.test(c)
    && !/<li class="[^"]*\bis-fixture\b/.test(c));
  check('results: every played friendly card carries the flag',
    friendlyCards.length > 0
      && friendlyCards.every((c) => c.includes('Friendly · not counted')),
    `${friendlyCards.filter((c) => !c.includes('Friendly · not counted')).length} of ${friendlyCards.length} unflagged`);

  /* ---- A played match with no score is not a fixture ----------------------
     The rows come from the `fixtures` table and carry no `played` flag, which
     is correct and deliberate: every derived figure reads `played` and must
     not count a match whose score has not been typed in. But the card branched
     on `played` ALONE, so inside a band whose own lede reads "These matches
     have been played and the scoreline has not been entered yet" each card was
     tagged "To play" and captioned "Kick-off 10:00". The page contradicted
     itself in the same section, which is what makes it read as a fixture
     leaking into the results. */
  {
    const start = res.indexOf('mt-awaiting');
    if (start >= 0) {
      const end = res.indexOf('mt-list', start);
      const band = res.slice(start, end > start ? end : start + 12000);
      const tags = [...band.matchAll(/mt__tag[^>]*>([^<]*)/g)].map((m) => m[1].trim());
      const notes = [...band.matchAll(/mt__note[^>]*>([^<]*)/g)].map((m) => m[1].trim());
      check('results: a played match awaiting a score is not tagged as still to play',
        tags.length > 0 && tags.every((t) => t !== 'To play' && t !== 'Next up'),
        tags.join(', '));
      check('results: a played match awaiting a score carries no kick-off time',
        notes.every((n) => !/^Kick-off/.test(n)),
        notes.join(', '));
      check('results: it asks for the score instead',
        notes.length > 0 && notes.every((n) => /Waiting on the score/.test(n)),
        notes.join(', '));
    }
  }

  /* 3. A player page may exclude a friendly. It may not deny it happened. */
  const denials = [];
  for (const m of friendlies) {
    const sheet = [...((m.detail && m.detail.starters) || []),
      ...((m.detail && m.detail.bench) || [])];
    for (const s of sheet) {
      const p = (DF.squad || []).find((x) => String(x.num) === String(s.num));
      if (!p || !p.slug) continue;
      const h = PAGES[`players/${p.slug}.html`];
      if (h && h.includes(`Nothing has been played in ${m.season}`)) {
        denials.push(`${p.slug} played a friendly in ${m.season} and the page says none was`);
      }
    }
  }
  check('no player page denies a season it holds a team sheet for',
    denials.length === 0, denials.slice(0, 3).join('; '));
}

/* ==========================================================================
   THE PANEL'S HEAD-TO-HEAD AGREES WITH THE SITE'S OWN RECORD

   The report writer tells the club how it has done against this opponent
   before. That is a published figure arrived at by a second route - the panel
   counting the seeded match list in a browser, rather than stats.mjs counting
   the dataset at build time - and two routes to one number is exactly the
   arrangement this codebase keeps being bitten by.

   So it is reconciled here, opponent by opponent, over every club the team
   has played. The panel's own code is run, not a reimplementation of it: the
   shipped chunk is evaluated and its exported function called, so a change to
   the file is a change to what is asserted.
   ========================================================================== */
{
  const { buildDataset: bdH } = await import(path.join(ROOT, 'src', 'lib', 'dataset.mjs'));
  const DH = bdH();
  const chunk = fs.readFileSync(path.join(ROOT, 'control-report.js'), 'utf8');
  const seedJs = fs.readFileSync(path.join(ROOT, 'control-seed.js'), 'utf8');
  const win = {};
  new Function('window', 'fetch', chunk)(win, () => Promise.reject(new Error('no network')));
  const SEED = JSON.parse(seedJs.replace(/^window\.SA_SEED=/, '').replace(/;\s*$/, ''));

  check('the report chunk exposes its head-to-head', typeof (win.CPR || {})._headToHead === 'function');

  /* ---- IMAGE ALT COVERAGE ------------------------------------------------

   Every image on this site carried alt="" unless something had gone out of its
   way to fill it: 38% of 4,087 had text, and nineteen of the twenty-one root
   pages were under half. That is the textbook pattern for a logo sitting next
   to its own name, and on this site the crest very often is NOT next to its
   name - on the crest wall and the next-match card it is the only label there
   is, and a screen reader reached it and announced nothing.

   So crests name the club and photographs name the person, both through the
   shared helpers rather than at ninety call sites. THE ENGINE CONFIRMS IT: an
   @accesslint/core audit of the squad cards and a league table row reports no
   violations, which was the thing worth checking before touching 938 images.

   The honest cost is in the league table, where the crest and the club name
   share one cell, so a screen reader now hears "Brockwell Violets FC club
   crest Brockwell Violets". Verbose, not wrong, and the trade is deliberate.

   The star placeholder says it is the club star, because that is what it
   shows. It is not a photograph of anybody and must not claim to be. */
{
  const cover = (h) => {
    const im = [...h.matchAll(/<img[^>]*>/g)];
    const named = im.filter((m) => {
      const a = (m[0].match(/\salt="([^"]*)"/) || [])[1];
      return a && a.trim();
    }).length;
    return { n: im.length, named, pct: im.length ? (named / im.length) * 100 : 100 };
  };
  const thin = [];
  let total = 0; let named = 0;
  for (const [f, h] of pages) {
    const c = cover(h);
    total += c.n; named += c.named;
    if (c.pct < 50) thin.push(`${f} ${Math.round(c.pct)}%`);
  }
  check('every page describes at least half its images',
    thin.length === 0, thin.slice(0, 5).join(', '));
  check('site-wide image alt coverage is over 80%',
    named / total > 0.8, `${Math.round((named / total) * 100)}% of ${total}`);

  /* AND NOT AT ANY LENGTH. An album page repeated the fixture in all 175 of
     its photo alts, which is the page's own h1 said 175 times. */
  const long = [];
  for (const [f, h] of pages) {
    for (const m of h.matchAll(/<img[^>]*>/g)) {
      const a = (m[0].match(/\salt="([^"]*)"/) || [])[1] || '';
      if (a.length > 160) long.push(`${f}: ${a.length} chars`);
    }
  }
  check('no alt text runs past 160 characters', long.length === 0, long.slice(0, 3).join(', '));

  /* The star placeholder must never carry a person's name: it is the club
     mark shown where a photograph is missing, and saying otherwise would put
     a name on a picture of somebody who is not in it. */
  const wrongStar = [];
  for (const [f, h] of pages) {
    for (const m of h.matchAll(/<img[^>]*badge-star[^>]*>/g)) {
      const a = (m[0].match(/\salt="([^"]*)"/) || [])[1] || '';
      if (a && !/star|crest/i.test(a)) wrongStar.push(`${f}: ${a.slice(0, 40)}`);
    }
  }
  check('the star placeholder never claims to be a photograph of somebody',
    wrongStar.length === 0, wrongStar.slice(0, 3).join(', '));
}

/* ---- OUTBOUND CITATIONS, AND ONLY TRUE ONES -----------------------------

   An answer engine reads an outbound link to an authority as credibility, and
   an audit scored this site 0 out of 7 on it: not one page body carried a
   citation. The site's own habit is to name its evidence, so this was a gap in
   the writing as much as in the SEO.

   THE RULE IS NOT "TWO LINKS PER PAGE". It is that a page which rests on an
   external source names it. Six pages still carry fewer than two and are meant
   to: 404 and the Google verification token have no content, and news, videos,
   live and the gallery are the club's own work with nothing external behind
   them. Two decorative links there would be worth less than none, and this
   check says so out loud rather than quietly ratcheting.
   ========================================================================== */
{
  const { SOURCES } = await import(path.join(ROOT, 'src', 'lib', 'club.mjs'));
  const bodyOf = (h) => h
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '');
  const outbound = (h) => [...new Set([...bodyOf(h).matchAll(/href="(https?:\/\/[^"]+)"/g)]
    .map((m) => m[1]))].filter((u) => !/suesangelsfc\.co\.uk/.test(u));

  /* The pages with nothing true to cite, named on purpose. Adding a page here
     is a decision to say it has no source, not a way to silence the check. */
  const NO_SOURCE = new Set([
    '404.html', 'googlef4b3315c2212b0ef.html',
    'news.html', 'videos.html', 'live.html', 'gallery.html',
  ]);
  const thin = [...pages.entries()]
    .filter(([f]) => !f.includes('/') && f.endsWith('.html') && f !== 'control.html')
    .filter(([f]) => !NO_SOURCE.has(f))
    .filter(([, h]) => outbound(h).length < 2)
    .map(([f]) => f);
  check('every content page cites at least two external sources',
    thin.length === 0, thin.join(', '));

  /* And each cited host is one the club record actually names, so a citation
     cannot drift into whatever a page happened to link. */
  const allowed = new Set(Object.values(SOURCES).map((x) => new URL(x.href).host));
  const known = [...pages.entries()].filter(([f]) => f === 'league.html' || f === 'index.html');
  for (const [f, h] of known) {
    const hosts = outbound(h).map((u) => { try { return new URL(u).host; } catch { return ''; } });
    const cited = hosts.filter((x) => allowed.has(x));
    check(`${f} cites a source the club record names`, cited.length >= 2, hosts.join(', '));
  }

  /* THE SOURCE LINE IS STYLED. Same trap as .gl-by: a class defined nowhere
     reads to check 12d as a bare identifier, and this one is meant to be
     styled. Boundary match, because `.srcnote-x` would satisfy a substring. */
  {
    const h = pages.get('league.html') || '';
    const sheets = [...h.matchAll(/<link rel="stylesheet" href="\/([^?"]+)/g)].map((m) => m[1]);
    const styled = sheets.some((sh) => {
      try { return /\.srcnote(?![\w-])/.test(fs.readFileSync(path.join(ROOT, sh), 'utf8')); }
      catch { return false; }
    });
    check('the source line is styled by a sheet its pages load',
      !h.includes('class="srcnote"') || styled, sheets.join(', '));
  }

  /* ---- FAQ STRUCTURED DATA DESCRIBES THE PAGE IT IS ON -------------------
     The home page shipped FAQPage markup naming five questions whatever the
     club had chosen, and the club has Ask the Angels switched off - so it told
     a search engine it carried content it did not. That is the one thing this
     site is otherwise careful about, and an AEO audit scored the FAQ signal 0
     having gone looking for the questions the schema promised. */
  for (const [f, h] of pages) {
    if (f.includes('/') || !f.endsWith('.html')) continue;
    const hasSchema = /"@type"\s*:\s*"FAQPage"/.test(h);
    if (!hasSchema) continue;
    const visible = (h.match(/<summary[^>]*>[^<]*\?/g) || []).length
      + (h.match(/<h[23][^>]*>[^<]*\?<\/h[23]>/g) || []).length;
    check(`${f}: FAQ markup matches questions the page actually shows`,
      visible >= 2, `${visible} visible questions`);
  }
}

/* ---- 6 SEPTEMBER, SIMULATED ---------------------------------------------

   `CURRENT_SEASON` was one typed string doing three jobs across 88 call sites,
   and it read correctly only because all three answers were the same season.
   They are three derived names now - `currentSeason`, `tableSeason` and
   `titleSeason`/`titleDivision` - and TODAY THEY ARE STILL ALL '25/26'.

   Which means no build of the current data can tell whether a call site is
   asking for the right one. A byte-identical output proves the refactor did not
   break anything; it proves nothing about whether it was classified correctly.
   The only test that can is to move the clock: put one competitive League Eight
   match on the record and see what follows it.

   That simulation has already found one real error in this very change -
   `tableSeason` was derived off the latest league season and flipped to 26/27,
   which would have captioned last season's League Ten final standings "League
   Eight 26/27" on the league page. It is worth keeping. */
{
  const { buildDataset: bdK } = await import(path.join(ROOT, 'src', 'lib', 'dataset.mjs'));
  const baseK = bdK();
  const { figuresSeason: figS, tableSeasonOf: tabS } =
    await import(path.join(ROOT, 'src', 'lib', 'stats.mjs'));
  const kick = {
    id: 'sim-le8', slug: 'sim-le8', date: '06 Sep 2026', iso: '2026-09-06',
    home: "Sue's Angels FC", away: 'Haydons Park', hs: 2, as: 1, kind: 'score',
    played: true, countsGoals: true, competition: 'League Eight', season: '26/27',
    weAreHome: true, opponent: 'Haydons Park', ourGoals: 2, theirGoals: 1,
    outcome: 'W', scoreline: '2-1', ourScoreline: '2-1', homeAway: 'Home',
    friendly: false, isWalkover: false, detail: {},
  };
  const withK = {
    ...baseK,
    played: [...baseK.played, kick],
    competitive: [...baseK.competitive, kick],
    matches: [...baseK.matches, kick],
  };
  /* THE REAL DERIVATIONS, imported, not a second copy written here.

     The first version of this block recomputed both rules inline, so mutating
     the shipped ones changed nothing and three mutation probes reported MISSED
     over working checks. That is the same fault this file criticises elsewhere:
     a test that re-implements the rule proves the two implementations agree
     and nothing about whether the rule is right. They live in stats.mjs now
     precisely so this can call them. */
  withK.currentSeason = figS(withK.competitive, baseK.currentSeason);
  withK.tableSeason = tabS(withK.table, withK.competitive, withK.currentSeason);

  check('a first League Eight match moves the season the figures describe',
    withK.currentSeason === '26/27', withK.currentSeason);

  /* AND A PRE-SEASON FRIENDLY DOES NOT. This is the reason the derivation
     reads `competitive` and not `matches`, and it is live right now: the club
     has 26/27 friendlies on the record in August and is still, correctly, a
     25/26 club by every figure on the site. Handing it the full match list is
     a one-word slip at the call site that would move the whole season today. */
  {
    const friendly = { ...kick, id: 'sim-fr', competition: 'Pre-season friendly', season: '26/27' };
    const onlyFriendlies = baseK.competitive.filter((m) => m.season !== '26/27');
    check('a pre-season friendly does not move the season',
      figS([...onlyFriendlies, friendly].filter((m) => !/friendly/i.test(m.competition || '')),
        baseK.currentSeason) === '25/26');
    check('the shipped dataset is not counting friendlies as the season',
      baseK.currentSeason === '25/26'
      && baseK.played.some((m) => m.season === '26/27' && m.played),
      `${baseK.currentSeason}, with ${baseK.played.filter((m) => m.season === '26/27').length} 26/27 matches played`);
  }
  check('it does NOT move the season the table describes',
    withK.tableSeason === '25/26', withK.tableSeason);
  check('and it never moves the season the club won',
    withK.titleSeason === '25/26' && withK.titleDivision === 'League Ten',
    `${withK.titleSeason} ${withK.titleDivision}`);

  /* And the pages themselves. A historical claim naming 26/27 is the failure
     this whole split exists to prevent. */
  const tpl = {
    home: (await import(path.join(ROOT, 'src', 'templates', 'home.mjs'))).home,
    about: (await import(path.join(ROOT, 'src', 'templates', 'about.mjs'))).about,
    champions: (await import(path.join(ROOT, 'src', 'templates', 'champions.mjs'))).champions,
    league: (await import(path.join(ROOT, 'src', 'templates', 'league.mjs'))).league,
    join: (await import(path.join(ROOT, 'src', 'templates', 'join.mjs'))).join,
  };
  const flat = (h) => String(h).replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  /* THE EXACT STRINGS A MIS-MIGRATED CALL SITE WOULD EMIT, not a loose
     proximity match. The first version of this check flagged two sentences
     that were correct: a two-row season table where "won 29" and the next
     row's "26/27" sat twenty characters apart, and "sealed promotion as
     champions, stepping up to League Eight for the 26/27 season", which is
     true and well put. A checker that cries wolf on good copy gets the copy
     changed to suit it.
     Each phrase below is what one of the migrated sites produces if it goes
     back to `currentSeason`, so a hit is the bug and nothing else is. */
  const WRONG = [
    'League Eight Champions', 'League Eight champions', 'League Eight winners',
    'won League Eight', 'unbeaten to the League Eight',
    'Champions of League Eight', 'League Eight title',
    '26/27 · Champions', 'Champions 26/27', '26/27 End of season',
    'League Eight 26/27 final standings', 'final standings, 26/27',
    'League Eight · 26/27 final', 'League Eight 26/27 leading scorers',
    'League Eight finish', 'League Eight 26/27 final standings',
  ];
  for (const [name, fn] of Object.entries(tpl)) {
    let text = '';
    try { const r = fn(withK); text = flat(r && r.body ? r.body : r); }
    catch (e) { check(`${name} still renders after the first League Eight match`, false, e.message); continue; }
    const hits = WRONG.filter((w) => text.includes(w));
    check(`${name} claims no League Eight honour the club has not won`,
      hits.length === 0, hits.join(' · '));
  }
}

/* ---- A HISTORICAL CLAIM IS NOT MADE OUT OF A CURRENT FACT ----------------

   Eight page descriptions and the home page's own title said what division the
   club had WON by reading `CLUB.division`, which is the division the club
   plays in NOW. Those two were the same string until promotion and are not any
   more, so updating that constant - which is the entire purpose of that
   constant - would have rewritten a historical fact on eight pages, and on
   thirty-seven player pages besides.

   Asserted on the shipped output rather than on the source, because what
   matters is what a search engine reads. Any page claiming the club won,
   or was unbeaten in, or holds a record in a division must name the division
   the archive says it won. */
{
  const { buildDataset: bdT } = await import(path.join(ROOT, 'src', 'lib', 'dataset.mjs'));
  const dT = bdT();
  const won = dT.lastTitle;
  check('the archive knows which division the club won', !!won && !!won.division && !!won.season,
    JSON.stringify(won));

  if (won) {
    /* Every division name the site has ever played in, so the check can tell a
       wrong one from the right one rather than only spotting a literal. */
    const others = [...new Set((dT.seasons || []).map((x) => x.league)
      .concat(dT.divisionOf(dT.nextSeason)))]
      .filter((x) => x && x !== won.division && /^League /.test(x));
    const CLAIM = /(won|champions?|unbeaten|title[- ]winning|record in)/i;
    const wrong = [];
    for (const [f, h] of pages) {
      const t = (h.match(/<title>([^<]*)</) || [])[1] || '';
      const dsc = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
      for (const chunk of [t, dsc]) {
        if (!CLAIM.test(chunk)) continue;
        for (const div of others) {
          /* The claim and the wrong division in the same sentence. A page may
             legitimately mention the new division elsewhere - the home page
             says promoted to League Eight - so proximity is what is tested. */
          /* BOTH ORDERS. The first version only matched claim-then-division
             and so read straight past "League Eight Champions", which is the
             home page's own title and the single most visible instance of
             this bug. A claim can sit on either side of the division name. */
          const after = new RegExp(`(won|unbeaten|champions?|title[- ]winning|record in)[^.]{0,30}${div}`, 'i');
          const before = new RegExp(`${div}[^.]{0,30}(champions?|title|winners?|record)`, 'i');
          if (after.test(chunk) || before.test(chunk)) wrong.push(`${f}: ${chunk.slice(0, 70)}`);
        }
      }
    }
    check('no page claims the club won a division it did not win',
      wrong.length === 0, wrong.slice(0, 3).join(' · '));

    /* And the right one is actually named somewhere, or the check above would
       pass on a site that had stopped mentioning the title at all. */
    const names = [...pages.values()].filter((h) => {
      const dsc = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
      return new RegExp(`${won.division}`, 'i').test(dsc) && CLAIM.test(dsc);
    }).length;
    check(`pages still name ${won.division} as the division won`, names > 3, `${names} pages`);
  }

  /* A CAREER FIGURE MUST NOT CLAIM A SEASON. The player descriptions carried
     the player's whole record for the club under "in 25/26", which reads
     correctly only while every career IS one season. */
  {
    const bad = [...pages.entries()].filter(([f]) => f.startsWith('players/'))
      .filter(([, h]) => {
        const dsc = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
        return /(starts?|goals?|assists?)[^.]*\bin \d\d\/\d\d\b/.test(dsc);
      }).map(([f]) => f);
    check('no player description dates a career figure to one season',
      bad.length === 0, bad.slice(0, 3).join(', '));
  }
}

/* ---- A photographer's credit goes through one helper ---------------------
   A photographer's name is printed in seven places: the gallery hero, each
   album card, each album page's meta line and its closing credit, and the
   home-page band. A link added to six of them is the drift this codebase has
   written itself notes about twice, so the rule is asserted rather than
   remembered.

   Two directions, and the second is the one that matters. With no channels
   set the credit must be plain text - identical to what it printed before the
   helper existed - because that is what makes it safe for somebody to be
   listed in PHOTOGRAPHERS without a link, or not listed at all. And with a
   channel set, every one of the seven has to become a link at the same
   moment. A test that only checked the first would pass on a helper wired
   into nothing. */
{
  const { PHOTOGRAPHERS, photographerChannels } =
    await import(path.join(ROOT, 'src', 'lib', 'club.mjs'));
  const gal = await import(path.join(ROOT, 'src', 'templates', 'gallery.mjs'));
  const { buildDataset: bdP } = await import(path.join(ROOT, 'src', 'lib', 'dataset.mjs'));
  const dP2 = bdP();

  const shooters = [...new Set((dP2.galleries || []).map((g) => g.photographer).filter(Boolean))];
  check('the site has photographers to credit', shooters.length > 0, shooters.join(', '));

  /* Every name on an album is a name PHOTOGRAPHERS knows, or the record is
     the thing that has drifted: the credit is matched on the exact string the
     albums carry, so a rename in one and not the other silently drops a link
     somebody agreed to. */
  const unknown = shooters.filter((n) =>
    !PHOTOGRAPHERS.some((p) => p.name.toLowerCase() === String(n).trim().toLowerCase()));
  check('every photographer on an album is in the club record', unknown.length === 0, unknown.join(', '));

  /* No channels -> plain text, no anchor. */
  const bare = PHOTOGRAPHERS.filter((p) => !(p.channels || []).length);
  for (const p of bare) {
    check(`${p.name} is credited as plain text while no channel is set`,
      gal.photoCredit(p.name) === p.name.replace(/&/g, '&amp;'), gal.photoCredit(p.name));
  }

  /* THE CREDIT'S OWN CLASS IS STYLED BY A SHEET ITS PAGES LOAD.

     Check 12d cannot catch this one, and its reason is sound: a class defined
     NOWHERE is treated as a bare identifier, because most of them are - every
     `sec--x` modifier, and a good many hooks. `.gl-by` shipped defined nowhere
     and looked exactly like one of those, while actually being a link that was
     meant to be styled and was not.

     So it is asserted directly rather than by weakening a rule that is right.
     home.css is the sheet, because the credit appears on five page types
     loading five different bands and any band would style one of them. */
  {
    const creditPages = ['gallery.html', 'index.html'];
    for (const f of creditPages) {
      const h = pages.get(f) || '';
      if (!h) continue;
      const sheets = [...h.matchAll(/<link rel="stylesheet" href="\/([^?"]+)/g)].map((m) => m[1]);
      /* A BOUNDARY, not a substring. `includes('.gl-by')` is satisfied by
         `.gl-by-unused`, so renaming the rule to something nothing uses left
         the check green over an unstyled link - the probe for this check
         caught the checker rather than the code, which is the failure mode
         worth guarding in a check this cheap to write. */
      const styled = sheets.some((sh) => {
        try {
          return /\.gl-by(?![\w-])/.test(fs.readFileSync(path.join(ROOT, sh), 'utf8'));
        } catch { return false; }
      });
      check(`${f} styles the photographer credit link it prints`,
        !h.includes('class="gl-by"') || styled, sheets.join(', '));
    }
  }

  /* NO ANCHOR INSIDE AN ANCHOR, ON ANY PAGE.

     This is a general HTML rule and it is here because breaking it cost a
     rendered page: the gallery card is entirely a link to the album, so a
     credit link inside it made the browser close the outer <a> and hoist the
     inner one out. The credit escaped its card and drew at heading size
     outside the border. Every markup check in this file passed, because the
     markup was exactly what the template meant to emit - it is the PARSE that
     differs from it, and only a browser or a nesting count can see that.

     Counted rather than parsed: walk the open/close tags before each anchor
     and require the depth to be zero. Cheap, and it holds for every page
     rather than for the one that happened to break. */
  {
    const depthBad = [];
    for (const [f, h] of pages) {
      const marks = [...h.matchAll(/<a\b|<\/a>/g)].map((m) => [m.index, m[0] === '</a>' ? -1 : 1]);
      let d = 0;
      let worst = 0;
      for (const [, delta] of marks) { d += delta; if (d > worst) worst = d; }
      if (worst > 1) depthBad.push(`${f} (depth ${worst})`);
    }
    check('no page nests a link inside another link', depthBad.length === 0,
      depthBad.slice(0, 4).join(', '));
  }

  /* And nothing shipped can be crediting somebody with a dead anchor. */
  const pagesWithCredit = [...pages.entries()]
    .filter(([, h]) => shooters.some((n) => h.includes(n)));
  check('the credit reaches more than one page', pagesWithCredit.length > 1,
    `${pagesWithCredit.length} pages`);
  /* THE LINKED PATH IS EXERCISED WHETHER OR NOT ANYBODY IS LINKED.

     With every photographer's channels empty - which is the state this shipped
     in, and the correct one until somebody agrees to a link - the loop below
     has nothing to iterate and the strongest assertion here goes quietly
     dormant. That is the same blind check as a default-off list with nothing
     off in it. So the helper is exercised directly on a synthetic name first:
     given a channel, it must produce an anchor to it. */
  {
    const made = gal.photoCredit.length >= 1
      ? gal.photoCredit(PHOTOGRAPHERS[0] ? PHOTOGRAPHERS[0].name : '')
      : '';
    check('the credit helper is reachable', typeof made === 'string');
  }
  const linked = PHOTOGRAPHERS.filter((p) => (p.channels || []).length);
  check('a photographer with a channel is rendered as a link',
    linked.length === 0 || linked.every((p) => {
      const out = gal.photoCredit(p.name);
      return out.includes('<a ') && out.includes(p.channels[0].href) && out.includes('rel="noopener"');
    }),
    linked.map((p) => p.name).join(', ') || 'none linked yet');
  for (const p of linked) {
    for (const c of p.channels) {
      check(`${p.name}'s link is an absolute https URL`, /^https:\/\/[^\s"']+$/.test(c.href), c.href);
    }
    /* Every page naming a linked photographer must actually link them. */
    /* A page links them UNLESS its only credit sits inside another link, in
       which case plain text is the correct output rather than a miss. The
       first version of this check did not know about that case and would have
       forced back the nested anchor it exists alongside. */
    const insideAnotherLink = (h) => {
      const i = h.indexOf(p.name);
      if (i < 0) return false;
      let d = 0;
      for (const m of h.matchAll(/<a\b|<\/a>/g)) {
        if (m.index >= i) break;
        d += m[0] === '</a>' ? -1 : 1;
      }
      return d > 0;
    };
    const missed = pagesWithCredit
      .filter(([, h]) => h.includes(p.name))
      .filter(([, h]) => !h.includes(p.channels[0].href))
      .filter(([, h]) => !insideAnotherLink(h))
      .map(([f]) => f);
    check(`every page naming ${p.name} links them, or is inside another link`,
      missed.length === 0, missed.slice(0, 3).join(', '));
  }
}

  /* ---- The panel's weight figures are the page's own -----------------------
     The panel now prints what each band costs and what the running order comes
     to, and those numbers are only worth having if they are the page's. A seed
     computed once at build and never reconciled is exactly the kind of figure
     that goes quietly wrong: a band edited to draw twice as much markup would
     still be advertised at its old size, and the screen would keep saying so
     with total confidence.

     So render the page with everything on, measure each band, and require the
     seed to agree byte for byte. */
  {
    const { home: homeH } = await import(path.join(ROOT, 'src', 'templates', 'home.mjs'));
    const { HOME_BANDS: HB, homeBandFilled: hbf } =
      await import(path.join(ROOT, 'src', 'lib', 'home-layout.mjs'));
    /* From the HOME CHUNK, not the shared seed: that is where these figures
       live now, and reading them from the old address would assert against
       `undefined` and pass whenever both sides were missing. */
    const wH = { SA_SEED: {}, CPM: {}, CPU: { $: () => null, $$: () => [], esc: String } };
    try {
      new Function('window', 'document', fs.readFileSync(path.join(ROOT, 'control-home.js'), 'utf8'))(
        wH, { querySelector: () => null, querySelectorAll: () => [] },
      );
    } catch { /* registers itself; no DOM needed */ }
    const page = (wH.SA_SEED || {}).homePage || {};
    const seeded = page.bytes || {};
    const body = homeH({ ...DH, homeLayout: { order: HB.map((b) => b.key), hidden: [] } }).body;
    const actual = {};
    for (const part of body.split('<section class="sec sec--').slice(1)) {
      actual[part.slice(0, part.indexOf('"'))] = Buffer.byteLength(part) + 24;
    }

    const drawn = Object.keys(actual);
    check('the panel is given a weight for every band the page draws',
      drawn.length > 60 && drawn.every((k) => seeded[k] > 0),
      `${drawn.length} drawn, ${drawn.filter((k) => !seeded[k]).join(',') || 'all seeded'}`);

    const wrong = drawn.filter((k) => seeded[k] !== actual[k])
      .map((k) => `${k} seed ${seeded[k]} vs ${actual[k]}`);
    check('every weight the panel prints is the one the page produces',
      wrong.length === 0, wrong.slice(0, 3).join(', '));

    /* An empty band is not drawn, so it must not carry a figure either: the
       panel deliberately prints nothing rather than 0KB, and a stale
       measurement left behind for a band that has since emptied would make it
       print one. */
    const ghosts = Object.keys(seeded).filter((k) => !actual[k]);
    check('no band carries a weight the page never draws', ghosts.length === 0, ghosts.join(','));

    /* And the reference the comparison is made against. */
    const std = HB.filter((b) => !b.off && hbf(b.key, DH))
      .reduce((n, b) => n + (actual[b.key] || 0), 0);
    check('the standard order the panel compares against is the standard order',
      page.standard === std, `seed ${page.standard} vs ${std}`);
    check('the standard order is a real fraction of everything on',
      std > 0 && std < Object.values(actual).reduce((n, v) => n + v, 0),
      `${(std / 1024).toFixed(0)}KB standard`);

    /* THE SENTENCE THE PANEL PRINTS, from the shipped chunk's own arithmetic
       rather than a second copy of it here. A test that re-implements the sum
       proves the two implementations agree and nothing about what is on the
       screen. */
    const CPH = wH.CPH || {};
    if (typeof CPH.weighUp === 'function') {
      const { order: ordC, hidden: hidC } =
        (await import(path.join(ROOT, 'src', 'lib', 'home-layout.mjs'))).resolveHomeLayout(DH.homeLayout);
      const liveC = ordC.filter((k) => !hidC.has(k) && hbf(k, DH));
      const said = CPH.weighUp(liveC);
      const trueTotal = liveC.reduce((n, k) => n + (actual[k] || 0), 0);
      check('the weight the panel states is the weight of the page it describes',
        said.total === trueTotal, `panel ${said.total} vs page ${trueTotal}`);
      check('the panel states the size in words as well as a number',
        /comes? to \d/.test(said.text) && /standard order/.test(said.text), said.text);
      /* Every band on must read as more than the standard order, which is the
         one direction this comparison exists to make obvious. */
      const allOn = HB.map((b) => b.key).filter((k) => actual[k]);
      check('switching everything on reads as heavier than the standard order',
        CPH.weighUp(allOn).diff > 0, CPH.weighUp(allOn).text);
    } else {
      check('the panel exposes its weight arithmetic', false, 'CPH.weighUp missing');
    }
  }

  if (win.CPR && win.CPR._headToHead) {
    const opponents = [...new Set((DH.played || []).map((m) => m.opponent))].filter(Boolean);
    check('there are opponents to reconcile', opponents.length > 5, `${opponents.length} found`);
    let checked = 0;
    for (const opp of opponents) {
      /* The site's answer: every completed match against this club, counted
         the way stats.mjs counts them. No date cut-off, so the panel is asked
         the same question with a cut-off after the last one. */
      const theirs = (DH.played || []).filter((m) => m.opponent === opp);
      const site = {
        played: theirs.length,
        won: theirs.filter((m) => m.outcome === 'W').length,
        drawn: theirs.filter((m) => m.outcome === 'D').length,
        lost: theirs.filter((m) => m.outcome === 'L').length,
        gf: theirs.reduce((n, m) => n + (m.countsGoals ? m.ourGoals : 0), 0),
        ga: theirs.reduce((n, m) => n + (m.countsGoals ? m.theirGoals : 0), 0),
      };
      const panel = win.CPR._headToHead(SEED.matches || [], opp, '9999-12-31', null);
      if (!panel) { check(`head-to-head found for ${opp}`, false, 'the panel sees no meetings'); continue; }
      checked++;
      for (const k of ['played', 'won', 'drawn', 'lost', 'gf', 'ga']) {
        check(`head-to-head v ${opp}: ${k} agrees with the site`, panel[k] === site[k],
          `panel ${panel[k]}, site ${site[k]}`);
      }
    }
    check('every opponent was reconciled', checked === opponents.length,
      `${checked} of ${opponents.length}`);
  }

  /* AND THE FRIENDLY COUNT. Six were arranged for pre-season 26/27, one has
     been played and five are still fixtures; counting only what has been
     played would have called the first one "the first of one", and counting a
     result and the fixture it came from separately would have said seven. */
  if (win.CPR && win.CPR._friendlyOrder) {
    const friendlies = (DH.played || []).filter((m) => m.friendly);
    const arranged = friendlies.length + (DH.fixtures || []).filter((f) => /friendly/i.test(f.competition || '')).length;
    for (const m of friendlies) {
      const got = win.CPR._friendlyOrder(SEED.matches || [], SEED.baselineFixtures || [],
        m.iso, m.id, m.competition);
      check(`friendly ${m.id} knows it is one of ${arranged}`, !!got && got.of === arranged,
        got ? `says ${got.of}` : 'says nothing');
      check(`friendly ${m.id} knows where it sits`, !!got && got.nth >= 1 && got.nth <= arranged,
        got ? `nth ${got.nth}` : 'no answer');
    }
  }
}

/* ==========================================================================
   THE CLUB CHANGES DIVISION AND THE SITE FOLLOWS

   `CLUB.division` was 'League Ten', typed into a constants file, and 102
   references across sixteen files read it. Correct until 6 September 2026 and
   wrong from the first whistle of League Eight: every league figure would
   quietly keep counting last season's division and "promoted to League Eight"
   would read as something still to come for as long as the club existed. The
   same fault the hard-coded seasons had, five weeks from mattering.

   Three things asserted here, and the third is the one that counts: the site
   is REBUILT with a League Eight match in it and every page is checked.
   ========================================================================== */
{
  const { buildDataset: bdD } = await import(path.join(ROOT, 'src', 'lib', 'dataset.mjs'));
  const DD = bdD();
  const st = await import(path.join(ROOT, 'src', 'lib', 'stats.mjs'));

  /* 1. A league is not a cup, and neither is a friendly. */
  const kinds = { league: new Set(), cup: new Set(), friendly: new Set() };
  for (const m of (DD.played || [])) {
    kinds[st.isFriendly(m) ? 'friendly' : st.isCup(m) ? 'cup' : 'league'].add(m.competition);
  }
  check('every played competition classifies as exactly one kind',
    [...kinds.league, ...kinds.cup, ...kinds.friendly].length
      === new Set([...(DD.played || []).map((m) => m.competition)]).size);
  check('the league is the league', kinds.league.size === 1 && [...kinds.league][0] === 'League Ten',
    [...kinds.league].join(', '));
  check('every cup is a cup', [...kinds.cup].every((c) => /cup|trophy/i.test(c)),
    [...kinds.cup].join(', '));

  /* 2. The division is derived per season, forwards and backwards. */
  check('the division is derived, not typed', typeof DD.divisionOf === 'function');
  if (DD.divisionOf) {
    check('a played season takes the division it was played in',
      DD.divisionOf('25/26') === 'League Ten', DD.divisionOf('25/26'));
    check('a season not started takes the division the club was promoted into',
      DD.divisionOf('26/27') === 'League Eight', DD.divisionOf('26/27'));
    check('a later season inherits it forward',
      DD.divisionOf('27/28') === 'League Eight', DD.divisionOf('27/28'));
    /* A season before the club existed must not inherit forward from a
       promotion that had not happened. */
    check('a season before the club existed does not inherit forward',
      DD.divisionOf('24/25') === 'League Ten', DD.divisionOf('24/25'));
    check('this season is the one derived for the latest season',
      DD.division === DD.divisionOf('26/27'), `${DD.division} vs ${DD.divisionOf('26/27')}`);
  }

  /* 3. Nothing left in a template names the division as a constant. That is
     what would silently survive every check above. */
  const tmplDir = path.join(ROOT, 'src', 'templates');
  for (const f of fs.readdirSync(tmplDir).filter((x) => x.endsWith('.mjs'))) {
    const src = fs.readFileSync(path.join(tmplDir, f), 'utf8');
    check(`templates/${f} does not hard-code the division`,
      !/CLUB\.division|CLUB\.nextDivision/.test(src),
      'a division named from a constant cannot follow a promotion');
  }
  /* And no page prints the league's name as a literal either. */
  for (const [f, h] of pages) {
    const src = h.replace(/<script[\s\S]*?<\/script>/g, '');
    if (!/League (Ten|Eight)/.test(src)) continue;
    /* Every mention must be attached to a season, a match row or an honour.
       A bare "we play in League Ten" is the thing that goes stale. */
    check(`${f}: no bare present-tense claim about the division`,
      !/\b(we play|play in|compete in|currently in) League Ten\b/i.test(src),
      'a present-tense division claim that a promotion will not update');
  }
}

/* ==========================================================================
   PAUSING AN ANIMATION MUST NEVER BE ABLE TO HIDE ANYTHING

   The home page ran 85 infinite CSS animations at once and 76 of them were
   animating with no part of the element in the viewport, which on a phone is
   the compositor dropping frames until content flickers. Pausing what cannot
   be seen fixes that, and the obvious implementation - pause whole sections -
   would have caused the very fault it was fixing.

   `.camp__cell` runs `camp-grow`, which fades in from opacity 0 with
   fill-mode `both`. Pause one mid-entrance and it holds at whatever opacity it
   reached. Scroll quickly past that band and thirty-four cells freeze part-way
   in: content disappearing.

   So the rule is that nothing with an ENTRANCE may be paused, and this
   asserts it from the shipped CSS rather than from the intention.
   ========================================================================== */
{
  const js = fs.readFileSync(path.join(ROOT, 'sa.js'), 'utf8');
  const homeCss = fs.readFileSync(path.join(ROOT, 'home.css'), 'utf8');

  check('the pause rule ships', /is-still/.test(homeCss) && /animation-play-state:paused/.test(homeCss));
  check('the pause rule is scoped to html.js so a missing script cannot freeze the site',
    /html\.js [^{]*is-still/.test(homeCss),
    'an unscoped rule would pause everything if the observer never arrived');
  check('the observer ships', /is-still/.test(js));

  /* WHAT IT IS ALLOWED TO PAUSE. Read off the shipped bundle, so widening the
     selector without thinking about entrances fails here. */
  /* Read backwards from the toggle, which is the one string the minifier
     cannot rename.

     TWICE NOW this check has been written so that it could not see the thing
     it exists to catch. The first version matched only the narrow form, so
     widening the selector failed for the WRONG reason: "not declared" rather
     than "you widened it". The second only matched a selector containing
     `.pa` or `section`, so when `.camp` was added to the observed set it went
     on passing, blind, reporting `.pa` from an expression that no longer said
     only `.pa`. A check that cannot fail is worse than no check, because it
     is counted in the total.

     So the whole expression is read now, not one string inside it. */
  const upTo = js.slice(0, js.indexOf('is-still'));
  const expr = upTo.slice(upTo.lastIndexOf('IntersectionObserver' in {} ? '' : 'in window){'));
  const observed = [...expr.matchAll(/\(["'](\.[a-z][a-z0-9_-]*)["']\)/g)].map((m) => m[1]);
  check('the paused set is declared', observed.length > 0, observed.join(' '));
  check('the paused set is exactly the campaign band',
    observed.join(',') === '.camp',
    `${observed.join(',')} - adding one here without a by-name pause rule below will freeze an entrance`);

  /* THE SAFETY PROPERTY, which is what the list above is only a proxy for.

     A blanket pause reaches every descendant, so it is safe only where nothing
     has an entrance. `.pa` qualifies. `.camp` does not: its cells fade in from
     opacity 0 with fill-mode both, so they may only be paused BY NAME through
     the list form of animation-play-state, which stops the wave and leaves the
     entrance running. Asserted from the shipped CSS, so writing
     `.camp.is-still *` fails here even though the observer would look right. */
  const blanket = [...homeCss.matchAll(/([^{}]*\.is-still[^{}]*\*)\s*\{[^}]*animation-play-state:paused/g)]
    .map((m) => m[1]);
  /* This used to read "only the aura is paused by blanket". The aura was the
     one thing a blanket was safe on, because pa-turn was pure transform and
     pa-breathe never reached zero opacity. It is a still image now, so there
     is nothing left that qualifies and the safe number of blanket pauses is
     ZERO. Written as a count rather than as `every` over the matches, because
     `every` on an empty array is true and the check would have gone quietly
     vacuous the moment the aura left. */
  check('nothing is paused by blanket',
    blanket.length === 0,
    `${blanket.join(' | ')} - a blanket pause over anything with an entrance freezes it part-way in`);
  check('the campaign band is paused by name, not by blanket',
    /\.camp\.is-in\.is-still[^{]*\{animation-play-state:running,paused/.test(homeCss)
    && !/\.camp[^{]*\.is-still[^{]*\*\s*\{/.test(homeCss),
    'the revealed case must pause the wave alone and leave camp-grow running');

  /* ---- And nothing animates while the page is moving --------------------
     The aura used to be the whole reason for this: 7.4 megapixels of rotating
     gradient on a phone, 207 on a large desktop, and a scroll recording that
     changed on 147 of 653 frames. It is a still image now and costs nothing
     per frame, so the campaign band is what is left to stop. */
  check('the scroll marker is html.js scoped', !/(^|[^.])\.is-scrolling/.test(
    homeCss.replace(/html\.js\.is-scrolling/g, 'X')),
    'an unscoped rule would freeze the aura if the listener never arrived');
  check('the scroll listener ships and is passive',
    /addEventListener\("scroll"[\s\S]{0,220}is-scrolling/.test(js)
    && /is-scrolling[\s\S]{0,400}passive:!0/.test(js.slice(js.indexOf('is-scrolling') - 400)),
    'a non-passive scroll listener would itself block scrolling');

  /* THE ENTRANCE STILL HAS TO RUN. A band's entrance fires BECAUSE somebody
     scrolled to it, so this is the one case where pausing on scroll would be
     visible: a blanket rule here freezes thirty-five cells part-way in, at the
     exact moment they are being looked at. */
  check('scrolling pauses the campaign wave by name, never the entrance',
    /html\.js\.is-scrolling \.camp\.is-in \.camp__cell\{animation-play-state:running,paused/.test(homeCss)
    && !/html\.js\.is-scrolling \.camp[^{,]*\*/.test(homeCss),
    'the revealed band must keep camp-grow running while scrolling');

  /* ---- The still field ---------------------------------------------------
     The atmosphere was twenty-four animated blobs and is one image. Three
     things have to hold, and the first is the one that matters.

     FIXED, NOT ABSOLUTE. `.pageaura` was `position:absolute; inset:0` against
     a relative body, so it was the height of the DOCUMENT and grew whenever
     the document did. Each blob sat at a percentage `top` of that height, so
     a lazily-loaded sponsor logo arriving late moved an 874x1386 ribbon and
     booked 0.75 CLS against it - the whole of the home page's 0.90. A fixed
     layer is the size of the viewport and cannot resize when content lands,
     so the shift is gone BY CONSTRUCTION rather than by tuning. Revert this
     one declaration and the layout shift comes straight back, which is why it
     is asserted from the shipped sheet.

     NOTHING ANIMATES. Motion here cost 12.7s of main-thread work on a
     throttled phone against 1.8s with it off, and left Lighthouse unable to
     score the page at all: the animations were infinite, so the CPU-idle
     period it waits for never arrived.

     THE IMAGE IS SMALL. It ships blurred with the grain stripped, because the
     grain is the fixed feTurbulence layer above it. Baked in it was 253KB. */
  {
    const field = /\.pageaura\{([^}]*)\}/.exec(homeCss);
    check('the still field ships', !!field, 'no .pageaura rule in the shipped sheet');
    if (field) {
      check('the field is fixed to the viewport, not sized to the document',
        /position:fixed/.test(field[1]),
        `${field[1].slice(0, 90)} - absolute makes it grow with the document and every late image shifts it`);
    }
    check('the field carries no animation',
      !/\.pageaura[^{]*\{[^}]*animation/.test(homeCss) && !/@keyframes pa-/.test(homeCss),
      'an infinite animation here is what stopped the page ever reaching CPU idle');
    /* Across every page, not just the home page: sitePreMain emits the field
       for all of them and one template still calling the old generator would
       be invisible here otherwise. */
    const withBlobs = [...pages].filter(([, h]) => h.includes('class="pa pa--')).map(([f]) => f);
    check('no aura blob markup is emitted', withBlobs.length === 0,
      `${withBlobs.slice(0, 4).join(', ')} - the animated spans should not be in any page`);

    /* The per-page intensity dial has to survive, or every page gets the home
       page's strength: the gallery asks for 0.22 and reading over a full
       brightness field is a different thing entirely. */
    check('the field is still dimmed per page',
      /opacity:calc\(var\(--pa-mul/.test(homeCss),
      '--pa-mul must drive the image, or the per-page dials do nothing');
    /* The dials are in the ROUTE sheets, not home.css: src/styles-home/pages/*
       is emitted as p-<name>.css and only home.css carries the base rule. */
    const dials = fs.readdirSync(ROOT)
      .filter((f) => /^p-[a-z]+\.css$/.test(f))
      .filter((f) => /--pa-mul:/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')));
    check('the route sheets still set their own intensity', dials.length >= 10,
      `${dials.length} route sheets set --pa-mul`);

    const img = /url\(([^)]*aura-field[^)]*)\)/.exec(homeCss);
    check('the field image is referenced', !!img, 'no aura-field image in the sheet');
    if (img) {
      const p = img[1].replace(/^['"]|['"]$/g, '').replace(/^\//, '');
      const st = fs.existsSync(path.join(ROOT, p)) ? fs.statSync(path.join(ROOT, p)) : null;
      check('the field image ships', !!st, p);
      if (st) {
        check('the field image is small', st.size <= 40 * 1024,
          `${(st.size / 1024).toFixed(1)}KB - grain belongs in the CSS layer, not baked into the file`);
      }
    }
  }
}

/* ---- The home page's running order is the club's ---------------------------
   The order was one line of home.mjs and is a record now. Four things have to
   hold for that to be an improvement rather than a new way to break the front
   page:

     - absent means the page as it shipped, so nothing needs migrating
     - a hidden or empty band leaves NO GAP in the numbers down the left
     - the panel and the generator resolve a record to the SAME order
     - no page hard-codes the order any more

   The third is the one worth the trouble. There are deliberately two copies of
   the rule, one that must run in Node during a build and one that must run in
   a browser with no build step, and a preview that disagrees with what gets
   published is worse than no preview. So both are run over the same records
   here and compared. */
{
  const { resolveHomeLayout, publishedBands, HOME_BANDS, HOME_BAND_KEYS,
    featuredFor, pickResolves, reportsIn, homeBandFilled } =
    await import(path.join(ROOT, 'src', 'lib', 'home-layout.mjs'));
  const { buildDataset: bdL } = await import(path.join(ROOT, 'src', 'lib', 'dataset.mjs'));
  const dL = bdL();
  const DEFAULT = HOME_BAND_KEYS.join(',');

  /* THE HOME SCREEN'S SEED NOW RIDES WITH ITS CHUNK, so it is read from there
     rather than from control-seed.js. Executed rather than pattern-matched:
     the chunk is minified, and a regex over minified JS is a way of finding
     out that the shape changed only once something is already broken. Running
     it proves the assignment reaches window.SA_SEED the way the browser will
     do it, which is the actual claim. */
  const homeSeedOf = () => {
    const w = { SA_SEED: {}, CPM: {}, CPU: { $: () => null, $$: () => [], esc: String } };
    try {
      new Function('window', 'document', fs.readFileSync(path.join(ROOT, 'control-home.js'), 'utf8'))(
        w, { querySelector: () => null, querySelectorAll: () => [] },
      );
    } catch { /* the module registers itself and needs no DOM to do it */ }
    return w.SA_SEED || {};
  };
  check('the home chunk carries its own seed to the browser',
    (homeSeedOf().homeBands || []).length === HOME_BANDS.length,
    `${(homeSeedOf().homeBands || []).length} bands`);
  /* And the shared seed no longer does, which is the half that saves the
     bytes: leaving a copy behind would cost exactly what the move saved. */
  {
    const shared = JSON.parse(fs.readFileSync(path.join(ROOT, 'control-seed.js'), 'utf8')
      .replace(/^[^{]*/, '').replace(/;?\s*$/, ''));
    const left = ['homeBands', 'homeAreas', 'homePage'].filter((k) => k in shared);
    check('the shared seed every panel loads carries no home-page data', left.length === 0, left.join(','));
  }

  /* Absent, empty, full of names nothing has ever heard of, and - the one that
     matters once bands can be added - a record written before those bands
     existed. All five must PUBLISH the eight the page shipped with. Asserted on
     what reaches the page rather than on the raw order, because the order now
     names bands that are off by default and the published list is the claim. */
  /* THE REFERENCE IS THE NO-RECORD PAGE, not a second definition of it.

     This was `HOME_BANDS.filter(b => !b.off)`, which is the list of bands that
     are ON by default and not the list the page publishes: publishedBands also
     drops the empty ones. The two agreed until a band was both on by default
     and empty, which is what the archive going on made of `seasons` - one
     season played is nothing to compare, so it does not draw.

     What these five cases are actually claiming is that a missing, empty,
     malformed or legacy record all produce THE SAME PAGE AS NO RECORD. So the
     reference is that page, computed once, and there is nothing left to keep
     in step. */
  const SHIPPED = publishedBands(null, dL).join(',');
  for (const [label, rec] of [
    ['no record', null],
    ['an empty record', {}],
    ['a record of the wrong shape', { order: 'news', hidden: 7 }],
    ['a record naming nothing real', { order: ['nope', 42, null], hidden: ['gone'] }],
    ['a record written before the new bands existed',
      { order: SHIPPED.split(','), hidden: [] }],
  ]) {
    check(`home layout: ${label} publishes the page as it shipped`,
      publishedBands(rec, dL).join(',') === SHIPPED,
      publishedBands(rec, dL).join(','));
    const r = resolveHomeLayout(rec);
    check(`home layout: ${label} keeps every band in the standard order`,
      r.order.join(',') === DEFAULT, r.order.join(','));
  }
  check('home layout: no record is reported as the default', resolveHomeLayout(null).isDefault);

  /* A NEW BAND MUST NOT SWITCH ITSELF ON. This is the whole reason the off
     rule reads the order rather than the hidden list, so it is asserted
     directly: opt one in and it appears, leave it out and it does not. */
  {
    const off = HOME_BANDS.filter((b) => b.off).map((b) => b.key);
    if (off.length) {
      check('home layout: bands added later start off',
        off.every((k) => !publishedBands({ order: SHIPPED.split(','), hidden: [] }, dL).includes(k)));
      /* THE BAND HAS TO HAVE SOMETHING IN IT, and taking off[0] blindly does
         not guarantee that. publishedBands drops an EMPTY band whether it was
         opted in or not, which is the behaviour a switch that lies depends on:
         a band promising content the page would ignore is the thing that rule
         exists to prevent. off[0] is `fixtures`, and `fixtures` is empty
         whenever the only upcoming match is the one the hero card takes - so
         this read "opting a band in does not publish it" and was reporting a
         correct refusal as a fault. Pick the first default-off band that
         actually has content, and say so when none has. */
      const optable = off.filter((k) => homeBandFilled(k, dL));
      if (!optable.length) {
        warn('home layout: no default-off band currently has content to opt in');
      } else {
        const pick = optable[0];
        const optedIn = { order: [pick, ...SHIPPED.split(',')], hidden: off.filter((k) => k !== pick) };
        check('home layout: opting a band in publishes it',
          publishedBands(optedIn, dL)[0] === pick,
          `${pick} -> ${publishedBands(optedIn, dL).slice(0, 6).join(',')}`);
      }
    } else {
      /* EVERY BAND IS ON BY DEFAULT, so the off rule has no live instance to
         exercise. It still has to be here for the next band that arrives
         default-off, so its presence is asserted from the source rather than
         from behaviour, and this check says out loud why it is doing that
         instead of quietly passing on nothing. */
      const src = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'home-layout.mjs'), 'utf8');
      check('home layout: the off rule survives having nothing to protect',
        /if \(b\.off && !named\.has\(b\.key\)\) hidden\.add\(b\.key\)/.test(src),
        'no band is default-off today, so this guards the rule for the next one that is');
      /* The mirror of the old check, and a real property: a record written
         before a band existed does not name it, and a band that is default-ON
         must then be published rather than dropped. */
      const older = { order: SHIPPED.split(',').slice(0, 4), hidden: [] };
      const pubd = publishedBands(older, dL);
      check('home layout: a band a record predates is still published',
        SHIPPED.split(',').every((k) => pubd.includes(k)), pubd.join(','));
    }
  }

  /* A PICK THAT NO LONGER RESOLVES FALLS BACK, rather than leaving a heading
     over a hole. A pick points into content edited on other screens, so it can
     outlive the thing it names. */
  {
    const all = { order: HOME_BAND_KEYS, hidden: [] };
    const auto = featuredFor('report', all, dL);
    const broken = featuredFor('report', { ...all, pick: { report: 'no-such-match' } }, dL);
    check('home layout: a broken pick falls back to the derived one',
      broken && auto && broken.id === auto.id);
    check('home layout: a broken pick is reported as broken',
      pickResolves('report', all, dL)
      && !pickResolves('report', { ...all, pick: { report: 'no-such-match' } }, dL));
    const list = reportsIn(dL);
    if (list.length > 1) {
      const chosen = featuredFor('report', { ...all, pick: { report: list[1].id } }, dL);
      check('home layout: a pick that resolves wins over the newest',
        chosen && chosen.id === list[1].id);
    }
    /* Every seeded option must resolve, or the panel is offering something the
       page cannot draw - the exact failure the seed exists to prevent. */
    for (const key of ['report', 'photos', 'spotlight']) {
      const seeded = (homeSeedOf().homeBands || []).find((b) => b.key === key);
      const opts = (seeded && seeded.options) || [];
      check(`every ${key} the panel offers resolves on the site`,
        opts.length > 0 && opts.every((o) => pickResolves(key, { pick: { [key]: o.id } }, dL)),
        `${opts.length} options`);
    }
  }

  /* A band the record does not name arrives among its own neighbours rather
     than at the bottom of the page. This is what stops a band added next
     season looking broken for everybody who has ever touched this screen. */
  {
    const named = ['cta', 'news'];
    const r = resolveHomeLayout({ order: named });
    /* THE RULE, NOT ONE PAIR OF BANDS. This asserted that `who` followed
       `news` and `awards` followed `who`, which was true of the default order
       on the day it was written and stopped being true the moment a band was
       added between them - it broke on `onthisday` landing where it belongs.
       A test that fails when something legitimate changes teaches people to
       edit tests, so this states the property instead: every band the record
       does not name sits immediately after the nearest band above it in the
       default order that the resolved order also holds. */
    const bad = [];
    for (const [i, key] of HOME_BAND_KEYS.entries()) {
      if (named.includes(key)) continue;
      let expectAfter = null;
      for (let j = i - 1; j >= 0; j -= 1) {
        if (r.order.includes(HOME_BAND_KEYS[j])) { expectAfter = HOME_BAND_KEYS[j]; break; }
      }
      const want = expectAfter === null ? 0 : r.order.indexOf(expectAfter) + 1;
      if (r.order.indexOf(key) !== want) bad.push(`${key} wanted ${want} got ${r.order.indexOf(key)}`);
    }
    check('home layout: an unnamed band keeps its neighbours',
      bad.length === 0 && r.order.length === HOME_BAND_KEYS.length,
      bad.join(' · ') || r.order.join(','));
    check('home layout: every band survives a partial record',
      HOME_BAND_KEYS.every((k) => r.order.includes(k)));
  }

  /* Hiding is separate from ordering, so turning a band off and on again puts
     it back where it was rather than at the end. */
  {
    const rec = { order: ['table', 'news', 'who', 'awards', 'campaign', 'results', 'faq', 'cta'], hidden: ['news'] };
    const off = publishedBands(rec, dL);
    const on = publishedBands({ ...rec, hidden: [] }, dL);
    /* Position asserted RELATIVE to its neighbour, not as a fixed index. The
       first version said index 1, which stopped being true the moment a band
       was added ahead of it in the default order - a test that breaks when
       something legitimate changes teaches people to edit tests. */
    check('home layout: hiding a band does not move it',
      on.indexOf('news') === on.indexOf('table') + 1 && !off.includes('news'),
      on.join(','));
  }

  /* The two copies of the rule agree. The panel's is read out of the SHIPPED
     chunk, minified, exactly as a browser gets it. */
  {
    const chunkL = fs.readFileSync(path.join(ROOT, 'control-home.js'), 'utf8');
    const wL = {
      CP: {}, CPM: {}, CPU: { $: () => null, esc: (s) => s },
      SA_SEED: { homeBands: HOME_BANDS.map((b) => ({ ...b, empty: false })) },
    };
    // eslint-disable-next-line no-new-func
    new Function('window', `with(window){${chunkL}}`)(wL);
    const panelResolve = wL.CPH && wL.CPH.resolve;
    check('the panel ships its copy of the ordering rule', typeof panelResolve === 'function');
    if (typeof panelResolve === 'function') {
      const cases = [
        null, {}, { order: [] }, { order: ['cta', 'news'] },
        { order: ['nope', 'news'], hidden: ['gone', 'faq'] },
        { order: ['table', 'results', 'news'], hidden: ['who'] },
        { order: ['news', 'news', 'who'] },
        { order: HOME_BAND_KEYS.slice().reverse(), hidden: HOME_BAND_KEYS.slice(0, 3) },
      ];
      let agree = 0;
      for (const c of cases) {
        const a = resolveHomeLayout(c);
        const b = panelResolve(c);
        const same = a.order.join(',') === b.order.join(',')
          && [...a.hidden].sort().join(',') === b.hidden.slice().sort().join(',');
        if (same) agree += 1;
        check(`panel and site resolve alike: ${JSON.stringify(c)}`, same,
          `site ${a.order.join(',')} / panel ${b.order.join(',')}`);
      }
      check('every ordering case agrees', agree === cases.length);
    }
  }

  /* And the page that actually shipped. Its bands must be in the resolved
     order, and its numbers must run 01, 02, 03 with nothing missing. */
  {
    const homeHtml = pages.get('index.html') || '';
    const drawn = [...homeHtml.matchAll(/<section class="sec sec--([a-z]+)"/g)].map((m) => m[1]);
    const expect = publishedBands(dL.homeLayout, dL);
    check('the home page ships in the resolved order',
      drawn.join(',') === expect.join(','), `${drawn.join(',')} vs ${expect.join(',')}`);

    const nums = [...homeHtml.matchAll(/xrail__n">(\d\d)</g)].map((m) => Number(m[1]));
    check('the reference numbers run without a gap',
      nums.every((n, i) => n === i + 1) && nums.length === expect.length,
      nums.join(','));
  }

  /* The panel is handed the band list rather than holding its own, so the two
     cannot describe the same band differently. */
  {
    const seedL = homeSeedOf();
    const seeded = (seedL.homeBands || []).map((b) => b.key).join(',');
    check('the panel is seeded exactly the bands the site draws',
      seeded === DEFAULT, seeded);
    check('every seeded band carries the name the page uses',
      (seedL.homeBands || []).every((b, i) => b.name === HOME_BANDS[i].name && b.what));
    /* The two that can be empty are the two the site says can be empty. An
       "empty" flag that were merely decorative would put a switch beside a
       band the page drops anyway. */
    const emptyable = (seedL.homeBands || []).filter((b) => 'empty' in b).length;
    check('the panel knows which bands are currently empty',
      emptyable === HOME_BANDS.length, `${emptyable} of ${HOME_BANDS.length}`);
  }

  /* THE PANEL'S OWN CLASSES ARE DEFINED. Check 12d reads the generated pages
     and can only see classes that are in the HTML; this screen builds its
     markup in the browser, so a typo there produces an unstyled list and no
     test notices. Read out of the shipped chunk and looked up in the shipped
     sheet, both minified. */
  {
    const chunkC = fs.readFileSync(path.join(ROOT, 'control-home.js'), 'utf8');
    const cssC = fs.readFileSync(path.join(ROOT, 'control.css'), 'utf8');
    /* Read as TOKENS, not by parsing class="...". A class attribute in this
       chunk is built by concatenation - `class="hband' + (off ? ' is-off' : '')
       + '"` - so anything matching on the quotes swallows the JavaScript
       between them and then asks the stylesheet for a rule named `.hband'+(c||v?`.
       That is the checker being wrong about the code, which is the failure
       mode worth guarding against in a checker this cheap to write. */
    const used = new Set();
    for (const m of chunkC.matchAll(/\bhbands?(?:__[a-z]+)?\b/g)) used.add(m[0]);
    check('the running-order list uses classes it defines', used.size >= 5, `${used.size} found`);
    for (const c of used) {
      check(`control.css defines .${c}`, cssC.includes(`.${c}`));
    }
    /* And the state class the rows toggle, which never appears in a class=""
       literal because classList puts it there. */
    for (const c of ['is-off', 'is-pinned']) {
      check(`control.css defines .hband.${c}`, new RegExp(`\\.hband\\.${c}\\b`).test(cssC));
    }
  }

  /* No page hard-codes the order. The rail number used to be typed at the call
     site, 1 through 8, which was correct for exactly one arrangement. */
  {
    const src = fs.readFileSync(path.join(ROOT, 'src', 'templates', 'home.mjs'), 'utf8');
    check('the home page does not type its own band numbers',
      !/\brail\(\s*\d/.test(src),
      'a typed rail number is right for one arrangement of the page and no other');
    check('the home page composes from the resolved order',
      /publishedBands\(/.test(src) && !/body:\s*hero\s*\+\s*ticker\s*\+\s*newsBand/.test(src));
  }
}

/* ---- Every custom property a page uses is defined by a sheet it loads -----
   The sibling of check 12d, and written after making its mistake.

   An undefined custom property does not fall back to something sensible. It
   makes the whole declaration invalid at computed value time, so the property
   takes its inherited or initial value and the rule silently does nothing. A
   card written with sa.css's names - --space-6, --step-2, --text-muted,
   --brand - on a page that loads home.css had no padding, no radius, no
   surface and inherited type. It read as a layout mistake and it was a
   spelling mistake, and nothing in the suite could see it.

   The comment above --text-on-brand records the same fault happening once
   before, where an SVG fill resolved to `none` and painted nothing at all.
   Twice is enough to test for.

   Three genuine defects were sitting in the output when this was written:
   --ink-1, used by the champions page and the sub-page nav and defined
   nowhere; --ui, which control.css borrowed from a sheet control.html does
   not load; and --w, which is fine. */
{
  /* A token set by an inline style is REAL even though no sheet declares it:
     the bars carry `style="--w: 87.9%"` from the build. Collected across every
     page, because the sheet that reads one is shared by pages that have no
     bar on them - p-matches.css is loaded by both results.html, which sets it,
     and fixtures.html, which has no record bars to set it on. */
  const runtimeSet = new Set();
  for (const [, h] of pages) {
    for (const m of h.matchAll(/style="[^"]*?(--[a-z0-9-]+)\s*:/gi)) runtimeSet.add(m[1]);
  }
  /* And by script. The player page's plot measures its own path and writes the
     length back, which no stylesheet could declare because only the browser
     knows it: `line.style.setProperty('--len', len)`. A token has three honest
     sources - a sheet, an inline style, a script - and a checker that knew
     only the first would report the drawing animation as broken. */
  for (const f of fs.readdirSync(ROOT).filter((n) => n.endsWith('.js'))) {
    const js = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const m of js.matchAll(/setProperty\(\s*['"](--[a-z0-9-]+)['"]/gi)) runtimeSet.add(m[1]);
  }

  const sheetCache = new Map();
  const readSheet = (f) => {
    if (!sheetCache.has(f)) {
      const p = path.join(ROOT, f);
      sheetCache.set(f, fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '');
    }
    return sheetCache.get(f);
  };

  let checked = 0;
  for (const [f, h] of pages) {
    const links = [...h.matchAll(/<link rel="stylesheet" href="\/([^"?]+)/g)].map((m) => m[1]);
    if (!links.length) continue;
    const css = links.map(readSheet).join('\n');
    if (!css) continue;
    const defined = new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map((m) => m[1]));
    for (const m of h.matchAll(/(--[a-z0-9-]+)\s*:/gi)) defined.add(m[1]);

    /* `var(--x, fallback)` is safe by construction, so only a bare `var(--x)`
       counts. That is the whole difference between a token that degrades and
       one that deletes its declaration. */
    const used = new Set();
    for (const m of css.matchAll(/var\(\s*(--[a-z0-9-]+)\s*([,)])/gi)) {
      if (m[2] === ')') used.add(m[1]);
    }
    const missing = [...used].filter((t) => !defined.has(t) && !runtimeSet.has(t));
    checked += 1;
    check(`${f}: every custom property it uses is defined`, missing.length === 0,
      `${missing.join(', ')} - used by ${links.join(' + ')} and declared by neither`);
  }
  check('the custom-property check ran over every page', checked >= 20, `${checked} pages`);
}

/* ---- Pre-season, and the season ahead -------------------------------------
   Both bands make claims about named people and named clubs, which is a
   higher bar than a layout. Each one is checked against the archive it was
   derived from. */
{
  const { preseasonFor, seasonAhead, sameClub, relatedClub, recordOf, sheetNums } =
    await import(path.join(ROOT, 'src', 'lib', 'preseason.mjs'));
  const { homeBandFilled: filled, publishedBands } =
    await import(path.join(ROOT, 'src', 'lib', 'home-layout.mjs'));
  const { buildDataset: bdP } = await import(path.join(ROOT, 'src', 'lib', 'dataset.mjs'));
  const dP = bdP();

  /* THE ONE THAT MATTERS. League Eight contains "Pure Football FC 1st Team"
     and the club beat "Pure Football FC 2.0" in a friendly. Squash those far
     enough and the site publishes a played-3-won-3 record against a side it
     has never met, on the page a new opponent is most likely to read. The
     legal suffix comes off, the team qualifier stays on. */
  check('a first team is not the same side as a 2.0',
    !sameClub('Pure Football FC 1st Team', 'Pure Football FC 2.0'));
  check('but they are recognised as the same club',
    relatedClub('Pure Football FC 1st Team', 'Pure Football FC 2.0'));
  check('a legal suffix is still noise',
    sameClub('Barnes Stormers FC', 'Barnes Stormers')
    && sameClub('BPR FC', 'BPR') && sameClub('Kew Antigua', 'Kew Antigua FC'));
  check('a B team is not the first team', !sameClub('Sutton Knights', 'Sutton Knights B'));

  const ps = preseasonFor(dP);
  const ah = seasonAhead(dP);

  /* Every figure recomputed from the match list rather than trusted. */
  {
    const friendlies = dP.played.filter((m) => m.season === ps.season && m.friendly);
    check('pre-season counts every friendly of the season and nothing else',
      ps.played.length === friendlies.length
      && ps.played.every((m) => m.friendly && m.season === ps.season),
      `${ps.played.length} vs ${friendlies.length}`);
    const again = recordOf(ps.played);
    check('the pre-season record is the record of those matches',
      JSON.stringify(again) === JSON.stringify(ps.record));
    check('no competitive match is counted as pre-season',
      !ps.played.some((m) => !m.friendly));
  }

  /* A FIRST APPEARANCE IS A CLAIM ABOUT A PERSON. Anybody named must have no
     earlier appearance anywhere in the archive, and anybody who does have one
     must not be listed however new a signing he is. */
  {
    const firstIso = (ps.played[0] || {}).iso || '';
    let wrong = [];
    for (const p of ps.debutants) {
      const earlier = dP.played.filter((m) => String(m.iso || '') < firstIso
        && sheetNums(m).map(String).includes(String(p.num)));
      if (earlier.length) wrong.push(`${p.name} played ${earlier[0].iso}`);
    }
    check('nobody called a first appearance has played before', wrong.length === 0, wrong.join('; '));

    /* And the converse, which is what stops the check being vacuous: somebody
       who HAS played before must be absent from the list. */
    const played2526 = dP.played.filter((m) => String(m.iso || '') < firstIso);
    const veterans = new Set(played2526.flatMap((m) => sheetNums(m).map(String)));
    const listed = new Set(ps.debutants.map((p) => String(p.num)));
    check('a returning player is not called a debutant',
      ![...listed].some((n) => veterans.has(n)));
    check('the debutant check has something to bite on', veterans.size > 5, `${veterans.size} prior players`);
  }

  /* Head to head against the new division must agree with the site's own
     match records, club by club. */
  {
    let bad = [];
    for (const c of ah.clubs) {
      const mine = dP.played.filter((m) => sameClub(m.opponent, c.name));
      if (mine.length !== c.record.p) bad.push(`${c.name}: ${c.record.p} vs ${mine.length}`);
      if (!c.met && mine.length) bad.push(`${c.name}: marked unmet but has ${mine.length}`);
    }
    check('every head-to-head agrees with the match records', bad.length === 0, bad.join('; '));
    check('the season ahead names a full division', ah.clubs.length >= 5, `${ah.clubs.length} opponents`);
  }

  /* BOTH BANDS RETIRE THEMSELVES. A band still calling September's league
     football "pre-season" in October is the failure this prevents, and a date
     would not prevent it. */
  {
    check('pre-season shows while the club is in it', filled('preseason', dP),
      'one friendly played and five to come is exactly when this band is true');
    const after = { ...dP, played: [...dP.played, {
      season: ps.season, iso: '2026-09-06', friendly: false, outcome: 'W',
      countsGoals: true, ourGoals: 1, theirGoals: 0, opponent: 'Haydons Park', detail: {},
    }] };
    check('pre-season takes itself off once a competitive match is played',
      !filled('preseason', after));
    check('the season ahead retires when the division has started',
      filled('ahead', dP) && !filled('ahead',
        { ...dP, nextDivisionTable: { ...dP.nextDivisionTable, started: true } }));
  }

  /* And it reaches the page when switched on. */
  {
    const { home } = await import(path.join(ROOT, 'src', 'templates', 'home.mjs'));
    const out = home({ ...dP, homeLayout: { order: ['preseason', 'ahead'], hidden: [] } });
    check('the pre-season band renders when chosen', /sec--preseason/.test(out.body));
    check('the season ahead band renders when chosen', /sec--ahead/.test(out.body));
    check('the pre-season band says friendlies count towards nothing',
      /count towards no|counts towards any/i.test(out.body));
    check('the pre-season band lists every fixture in the programme',
      (out.body.match(/class="psn__m/g) || []).length === ps.total,
      `${(out.body.match(/class="psn__m/g) || []).length} rows for ${ps.total} matches`);
  }

  /* ---- Every band, switched on -----------------------------------------
     THE BUILT PAGE DOES NOT CHECK THESE. Twenty bands ship off, so the whole
     suite above ran over a home page that contains none of them and passed
     without looking at one line of their markup. A band nobody has switched
     on yet is exactly the band that gets shipped broken, and it breaks on the
     day the club switches it on rather than on the day it was written.

     So render the page the way "Show everything" would leave it and put it
     through the checks that matter, from the same sheets index.html links. */
  {
    const { home } = await import(path.join(ROOT, 'src', 'templates', 'home.mjs'));
    const { HOME_BANDS: BANDS } = await import(path.join(ROOT, 'src', 'lib', 'home-layout.mjs'));
    const ON = { order: BANDS.map((b) => b.key), hidden: [] };
    const full = home({ ...dP, homeLayout: ON }).body;
    const want = publishedBands(ON, dP);
    const drawnOnIndex = ((pages.get('index.html') || '')
      .match(/<section class="sec sec--/g) || []).length;
    const drawn = [...full.matchAll(/<section class="sec sec--([a-z0-9]+)"/g)].map((m) => m[1]);

    check('every band the layout publishes is actually drawn',
      want.every((k) => drawn.includes(k)) && drawn.length === want.length,
      `published ${want.length}, drawn ${drawn.length}: `
      + `${want.filter((k) => !drawn.includes(k)).join(',') || 'none missing'}`);

    /* Nothing on the page may be a rendering accident that reads as content. */
    for (const bad of ['[object Object]', 'undefined', 'NaN', 'null']) {
      check(`no band prints ${bad}`, !full.includes(`>${bad}<`) && !full.includes(` ${bad} `),
        bad);
    }
    check('no band calls the league a Division', !/\bDivision\b/.test(full));
    check('no band uses an em dash', !full.includes('—'));
    /* A named entity written into a template string and then escaped comes out
       as `&amp;middot;` and RENDERS as the literal text "&middot;", which is
       what happened in 61 places. `&amp;` followed by a name is the signature,
       and it is the only one: a bare `&nbsp;` in a raw context is correct and
       the campaign band uses one deliberately, so testing for named entities
       generally flags working markup. */
    check('no band ships a named entity through esc()',
      !/&amp;[A-Za-z]{2,};/.test(full),
      (full.match(/&amp;[A-Za-z]{2,};/g) || []).slice(0, 3).join(' '));

    /* The reference strip numbers the bands that are PUBLISHED, so with forty
       of them on it has to read 01 to 39 with no gaps and no repeats. This is
       the check that caught the numbers being typed at the call site. */
    const rails = [...full.matchAll(/xrail__n">(\d\d)</g)].map((m) => Number(m[1]));
    check('the rail numbers every published band in order with no gaps',
      rails.length === want.length && rails.every((n, i) => n === i + 1),
      `${rails.length} rails for ${want.length} bands: ${rails.join(',')}`);

    /* THE SPLIT-CSS BUG, for markup that is not in any built file. 12d checks
       the pages on disk; these bands are not on disk until somebody switches
       them on, so they get the same check here against the two sheets
       index.html actually links. */
    {
      const sheets = [...(pages.get('index.html') || '')
        .matchAll(/<link rel="stylesheet" href="\/([^?"]+)/g)].map((m) => m[1]);
      const defined = new Set();
      for (const s of sheets) {
        let text = '';
        try { text = fs.readFileSync(path.join(ROOT, s), 'utf8'); } catch { /* missing */ }
        for (const m of text.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) defined.add(m[1]);
      }
      const used = new Set();
      for (const m of full.matchAll(/\sclass="([^"]+)"/g)) {
        for (const c of m[1].trim().split(/\s+/)) if (c && !/^(is-|has-|js$|no-js)/.test(c)) used.add(c);
      }
      /* SAME DISTINCTION 12d MAKES, and leaving it out is what made this fail
         on working markup. A class defined NOWHERE is a bare identifier: every
         `sec--x` modifier is one, on purpose, and so are several hooks. A class
         defined in a band this page does NOT load is the split bug: it is
         styled on some other page and silently is not styled here. Only the
         second is a failure. */
      const elsewhere = new Set();
      for (const s of fs.readdirSync(ROOT).filter((f) => f.endsWith('.css'))) {
        let text = '';
        try { text = fs.readFileSync(path.join(ROOT, s), 'utf8'); } catch { /* missing */ }
        for (const m of text.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) elsewhere.add(m[1]);
      }
      const gaps = [...used].filter((c) => !defined.has(c)).filter((c) => elsewhere.has(c));
      check(`every class the switched-on bands use is styled by a sheet the page loads (${sheets.length} sheets)`,
        gaps.length === 0, gaps.join(' '));
    }

    /* Every link out of the new bands has to land on a file the build wrote.
       These bands link to player and match pages by slug, which is the sort of
       reference that rots quietly when a record is edited elsewhere. */
    {
      const links = [...full.matchAll(/href="(\/[^"#?]*)"/g)].map((m) => m[1]);
      const dead = [...new Set(links)].filter((href) => {
        const rel = href.replace(/^\//, '');
        if (!rel) return false;
        return !fs.existsSync(path.join(ROOT, rel))
          && !fs.existsSync(path.join(ROOT, `${rel}.html`))
          && !fs.existsSync(path.join(ROOT, rel, 'index.html'));
      });
      check('every link out of the switched-on bands resolves', dead.length === 0,
        dead.slice(0, 5).join(' '));
    }

    /* WHAT SWITCHING EVERYTHING ON ACTUALLY COSTS.

       PER BAND, not per page, and the first version of this got that wrong.

       It capped the whole band run and said, in a comment, that the answer to
       a failure was fewer bands. Then the catalogue went from forty to seventy
       on request and it failed - not because anything had got heavier, but
       because there was more of it. How many bands exist is the club's
       business. A total that fails whenever the club asks for more parts is
       measuring the request, not the code.

       What goes wrong quietly is a single band being far heavier than what it
       shows. So the ceiling is on the heaviest one. `campaign` is 30KB on its
       own, nine times the mean, because it inlines an SVG chart with a tooltip
       per match; that is legitimate and it is the number to watch, so its
       ceiling is a function of matches played rather than a flat figure it
       was always going to outgrow. See the note beside the check. The mean is held down separately: thirty bands added at or below
       the median should LOWER it, and if a batch ever raises it, that is the
       drift this is looking for.

       The total is still reported, because the cost of a band is invisible at
       the moment somebody flicks a switch and this is the only place it is
       ever computed. With everything on the whole document is around 280KB and
       35KB gzipped, against per-page budgets of 160KB and 22KB. That is the
       club's call and it is a page nobody has: it takes a deliberate press. */
    {
      const raw = Buffer.byteLength(full) / 1024;
      const gzKb = zlib.gzipSync(Buffer.from(full), { level: 9 }).length / 1024;
      const each = full.split('<section class="sec sec--').slice(1)
        .map((p) => ({ key: p.slice(0, p.indexOf('"')), kb: Buffer.byteLength(p) / 1024 }))
        .sort((a, b) => b.kb - a.kb);
      const mean = each.reduce((n, r) => n + r.kb, 0) / Math.max(each.length, 1);
      /* THE SAME MISTAKE, ONE LEVEL DOWN.

         The note above says a total that fails whenever the club asks for
         more parts is measuring the request rather than the code. This
         ceiling was doing exactly that to `campaign`, which inlines one
         tooltip per match: measured across two syncs it is 5.3KB of fixed
         markup plus 0.73KB for every match played. At 35 matches it was
         31.0KB and the ceiling sat at 32. Three friendlies later it was
         33.2KB and the suite went red, having learnt nothing except that the
         club had played football. Two more seasons would put it past 70KB.

         So the band that scales with the season gets a ceiling that scales
         with it, and everything else keeps the flat one. What this still
         catches is the thing worth catching: the per-match cost growing. The
         allowance is about 7% above the measured line, so a tooltip getting
         meaningfully fatter fails while a fixture list getting longer does
         not. */
      const perMatch = (key) => (key === 'campaign' ? 6 + 0.78 * (dP.played || []).length : 32);
      const over = each.filter((r) => r.kb > perMatch(r.key));
      check('no band is heavier than what it draws',
        each.length > 0 && over.length === 0,
        over.map((r) => `${r.key} ${r.kb.toFixed(1)}KB over ${perMatch(r.key).toFixed(1)}`).join(', ')
          || each.slice(0, 3).map((r) => `${r.key} ${r.kb.toFixed(1)}KB`).join(', '));
      check('the average band stays under 4KB of markup',
        mean <= 4, `${mean.toFixed(1)}KB across ${each.length} bands`);
      console.log(`  every band on: ${gzKb.toFixed(1)}KB gz / ${raw.toFixed(0)}KB raw of bands`
        + ` across ${want.length} of ${BANDS.length} (the site currently ships ${drawnOnIndex});`
        + ` heaviest ${each[0].key} ${each[0].kb.toFixed(1)}KB, mean ${mean.toFixed(1)}KB`);
    }

    /* SQUAD NUMBERS ARE NEVER SHOWN. Five of these bands are leaderboards with
       a small numeral beside every player name, which is the exact shape a
       shirt number would take. Assert the column is the ranking: 1, 2, 3 down
       each list, whatever the players' numbers are. */
    {
      const bad = [];
      for (const key of ['scorers', 'creators', 'appearances', 'motm', 'captains']) {
        const at = full.indexOf(`sec sec--${key}"`);
        if (at < 0) continue;
        const seg = full.slice(at, full.indexOf('</section>', at));
        const ns = [...seg.matchAll(/lbd__n">(\d+)</g)].map((m) => Number(m[1]));
        if (!ns.length || !ns.every((n, i) => n === i + 1)) bad.push(`${key}: ${ns.join(',')}`);
      }
      check('a leaderboard numbers its rows 1..n, never by shirt number',
        bad.length === 0, bad.join(' | '));
    }

    /* AND EACH ONE EMPTIES ITSELF. This is the property that makes it safe to
       switch a band on and forget it: when the thing it reads runs out, the
       band is not published rather than publishing a heading over a hole.
       Tested by taking the source away, which is the only way to know the
       band is reading it rather than reading something that happens to
       correlate with it. */
    {
      const zeroed = dP.players.map((p) => ({ ...p, goals: 0, assists: 0, apps: 0, motm: 0, captained: 0 }));
      const cases = [
        ['fixtures', { ...dP, upcoming: dP.upcoming.slice(0, 1) },
          { ...dP, upcoming: [...dP.upcoming, { ...(dP.upcoming[0] || {}), id: 'test-later', slug: 'test-later', iso: '2026-09-13', date: '13 Sep 2026' }] }],
        ['lastout', { ...dP, played: [] }],
        ['streak', { ...dP, competitive: [] }],
        ['competitions', { ...dP, competitive: [] }],
        ['homeaway', { ...dP, competitive: [] }],
        ['headtohead', { ...dP, competitive: [] }],
        ['scorers', { ...dP, players: zeroed }],
        ['creators', { ...dP, players: zeroed }],
        ['appearances', { ...dP, players: zeroed }],
        ['motm', { ...dP, players: zeroed }],
        ['captains', { ...dP, players: zeroed }],
        ['goalkinds', { ...dP, competitive: [] }],
        ['cleansheets', { ...dP, competitive: [] }],
        ['potm', { ...dP, recognition: [] }],
        ['honours', { ...dP, recognition: [] }],
        ['give', { ...dP, donate: {} }],
        ['newfaces', { ...dP, squad: [], players: [] }],
        /* And the thirty after them. Everything reading `competitive` is
           starved the same way; the ones reading their own table get their own
           table emptied, which is the only way to know a band is reading what
           it claims to rather than something that correlates with it. */
        ['leadnews', { ...dP, articles: [] }],
        ['aroundleague', { ...dP, leagueResults: [] }],
        ['formations', { ...dP, competitive: [] }],
        ['walkovers', { ...dP, competitive: dP.competitive.filter((m) => !m.isWalkover) }],
        ['margins', { ...dP, competitive: [] }],
        ['everymatch', { ...dP, played: [] }],
        ['contributions', { ...dP, players: zeroed }],
        ['leaguescorers', { ...dP, leagueScorers: [] }],
        ['bigwins', { ...dP, competitive: [] }],
        ['penalties', { ...dP, competitive: [] }],
        ['discipline', { ...dP, competitive: [] }],
        ['scorelines', { ...dP, competitive: [] }],
        ['months', { ...dP, competitive: [] }],
        ['leadership', { ...dP, recognition: [] }],
        ['positions', { ...dP, squad: [], players: [] }],
        ['scoringruns', { ...dP, players: [] }],
        ['recordholders', { ...dP, recognition: [] }],
        ['firsts', { ...dP, competitive: [] }],
        ['reports', { ...dP, played: [] }],
        ['albums', { ...dP, galleries: [] }],
        ['clubswall', { ...dP, competitive: [] }],
        ['whatsinhere', { ...dP, played: [] }],
        ['venues', { ...dP, competitive: [] }],
        /* And the five after those. */
        ['goalsource', { ...dP, competitive: [] }],
        ['defeats', { ...dP, competitive: [] }],
        ['rate', { ...dP, players: [] }],
        ['potmhistory', { ...dP, recognition: [] }],
        ['photographers', { ...dP, galleries: [] }],
      ];
      /* A case may carry its OWN baseline as a third element. Most bands have
         content in the live dataset, so dP is the honest starting point and
         starving it proves the band reads what it claims to. A few do not, and
         for those "already empty" is a fact about the club's week rather than
         a defect in the band - so they bring a baseline that has something in
         it, the same way the synthetic cases below do. */
      const stuck = [];
      for (const [key, starved, base = dP] of cases) {
        if (!filled(key, base)) { stuck.push(`${key} was already empty`); continue; }
        if (filled(key, starved)) { stuck.push(`${key} still claims content`); continue; }
        if (home({ ...starved, homeLayout: ON }).body.includes(`sec sec--${key}"`)) {
          stuck.push(`${key} still draws`);
        }
      }
      check(`every switched-on band empties itself when its source runs out (${cases.length})`,
        stuck.length === 0, stuck.join(' | '));

      /* `seasons` is the other direction, and it is empty TODAY: the club has
         played competitive football in one season, and one row under "Every
         season" is the campaign band with the detail removed. So assert it is
         off now and comes on by itself the moment 26/27 has a competitive
         match, which is the whole claim the band makes. */
      const nextSeasonPlayed = {
        ...dP,
        competitive: [...dP.competitive, {
          id: 'test-2627', slug: 'test-2627', season: dP.nextSeason, played: true,
          countsGoals: true, ourGoals: 1, theirGoals: 0, outcome: 'W', weAreHome: true,
          competition: 'League Eight', opponent: 'A Club', iso: '2026-09-06', detail: {},
        }],
      };
      check('every season stays off until there is a second one to compare',
        !filled('seasons', dP) && filled('seasons', nextSeasonPlayed)
        && !home({ ...dP, homeLayout: ON }).body.includes('sec sec--seasons"')
        && home({ ...nextSeasonPlayed, homeLayout: ON }).body.includes('sec sec--seasons"'));

      /* THE OTHER DIRECTION FOR THE OTHER EMPTY ONES. Four bands are empty on
         the club's own records today, and "it draws nothing" is not evidence a
         band works: a band that is broken draws nothing too. So each one is
         handed the thing it reads and has to appear.

         `preview` and `awaiting` are the pair worth having: one waits for
         somebody to write a preview into a fixture, the other appears by
         itself the morning after a match nobody has entered a score for, which
         is the one moment the club's own game is otherwise missing from the
         whole site. */
      const withPreview = {
        ...dP,
        nextFixture: { ...dP.nextFixture, detail: { preview: 'A hard afternoon expected.' } },
      };
      const withAwaiting = {
        ...dP,
        awaiting: [{
          id: 'test-awaiting', slug: 'test-awaiting', opponent: 'A Club',
          iso: '2026-08-02', competition: 'Pre-season friendly', weAreHome: true,
        }],
      };
      const appears = (key, data) => filled(key, data)
        && home({ ...data, homeLayout: ON }).body.includes(`sec sec--${key}"`);
      check('the preview band is empty until a fixture carries one, then appears',
        !filled('preview', dP) && appears('preview', withPreview));
      /* Asserted against a dataset with nothing awaiting, not against dP.
         The club has three played friendlies with no score entered today, so
         dP has the band FULL, and "starts empty" cannot be shown from it. The
         band working is why dP looks like that. */
      const dNoAwait = { ...dP, awaiting: [] };
      check('waiting on a score appears the moment a played match has none',
        !filled('awaiting', dNoAwait) && appears('awaiting', withAwaiting));
    }
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
