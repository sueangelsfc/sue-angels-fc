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
  const homeCss = fs.readFileSync(path.join(ROOT, 'home.css'), 'utf8');
  const block = (re) => (re.exec(homeCss) || [, ''])[1];
  const toks = (s) => Object.fromEntries(
    [...s.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
  const dark = toks(block(/:root\{([\s\S]*?)\n\}/));
  const light = { ...dark, ...toks(block(/html\[data-theme="light"\]\{([\s\S]*?)color-scheme: light;\}/)) };

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
  const cpCss = fs.readFileSync(path.join(ROOT, 'src', 'styles', '70-control.css'), 'utf8');
  check('control panel enforces the hidden attribute',
    /\[hidden\]\s*\{[^}]*display:\s*none\s*!important/.test(cpCss));
  /* And the two screens it applies to are still the two screens. */
  const cpHtml = pages.get('control.html') || '';
  check('control panel still has both screens', /id="cp-gate"/.test(cpHtml) && /id="cp-app"[^>]*hidden/.test(cpHtml));
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
const BUDGET = { 'sa.css': 28, 'home.css': 26, 'sa.js': 22, 'control.js': 24 };
for (const [f, kb] of Object.entries(BUDGET)) {
  const raw = fs.readFileSync(path.join(ROOT, f));
  const size = zlib.gzipSync(raw, { level: 9 }).length / 1024;
  check(`${f} within ${kb}KB gzipped`, size <= kb,
    `${size.toFixed(1)}KB gzipped, ${(raw.length / 1024).toFixed(0)}KB raw`);
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
