/* ==========================================================================
   THE ONE THING THE SUITE CANNOT SEE

   `npm test` renders the panel into src/test/dom.mjs, which throws on
   getComputedStyle because it has no cascade and on getBoundingClientRect
   because it has no layout. That is the right trade for a suite that runs in
   eight seconds, and this file is the note that said so: "a visual
   regression still needs a browser, and the honest answer is that nothing in
   the suite will catch one."

   This is the browser. It asks four questions of every page family and of
   every screen in the control panel, and every one of them is a fact rather
   than a matter of taste:

     1. Did anything throw?  A ReferenceError in sa.js shipped for weeks and
        was found by a person opening the live site and reading the console.
        Everything in the block that died was optional and failed quietly, so
        nothing looked wrong. This is the check that would have caught it.
     2. Does the page scroll sideways, at 320, 768 and 1280?
     3. Is any text drawn at zero size?
     4. Is any text unreadable against the background it is actually on?

   WHY IT IS NOT IN `npm test`. It needs a browser, and the suite must stay
   runnable anywhere in seconds. It runs in CI, where a browser is a line of
   YAML, and on a laptop with `npm run visual`.

   Exit codes: 0 clean · 1 a failure · 2 no Chrome (CI treats that as a
   failure; a laptop is told to install one).
   ========================================================================== */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, findChrome } from './lib/chrome.mjs';
import { AUDIT } from './lib/inpage.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WIDTHS = [320, 768, 1280];

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain',
};

function serve() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(ROOT, url === '/' ? 'index.html' : url);
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  /* Port 0, not a number of our own choosing. A fixed one collides with a
     previous run that has not finished dying, and on a CI runner it collides
     with whatever else the job happens to be doing. */
  return new Promise((r) => server.listen(0, () => r(server)));
}

/* One page per family. Every page in a family is the same template over
   different records, and 108 pages x 3 widths is a CI job nobody waits for. */
function routes() {
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/build-manifest.json'), 'utf8'));
  const seen = new Map();
  for (const r of man.routes) {
    /* The manifest stores paths as the generator wrote them, with no leading
       slash. A URL needs one, and Chrome answers "invalid URL" rather than
       resolving it against anything. */
    const key = r.includes('/') ? r.slice(0, r.lastIndexOf('/')) : 'root:' + r;
    if (!seen.has(key)) seen.set(key, '/' + r.replace(/^\//, ''));
  }
  return [...seen.values()].sort();
}

/* ---- The home page with every band switched on -------------------------

   The club has 17 of the 75 bands on, so the built index.html holds 17 and a
   browser looking at it sees 17. The other 58 are the ones nobody would
   notice breaking: they appear the day somebody flicks a switch in the panel,
   which is the worst possible moment to discover a defect.

   `npm test` renders the page this way for exactly the same reason. The
   generator writes it when SA_ALL_BANDS is set; this asks for it, drives it,
   and deletes it again whatever happens - a stray 270KB page in the repo
   root is the kind of thing that gets committed by accident once. */
const ALL_BANDS = '__all-bands.html';

function makeAllBands() {
  const out = spawnSync(process.execPath, [path.join(ROOT, 'src/build.mjs')], {
    cwd: ROOT, env: { ...process.env, SA_ALL_BANDS: '1' }, encoding: 'utf8',
  });
  if (out.status !== 0) {
    console.error('could not build the all-bands page:', (out.stderr || '').slice(-400));
    return null;
  }
  return fs.existsSync(path.join(ROOT, ALL_BANDS)) ? '/' + ALL_BANDS : null;
}

function dropAllBands() {
  try { fs.rmSync(path.join(ROOT, ALL_BANDS), { force: true }); } catch { /* nothing to do */ }
}

const fails = [];
const notes = [];
const fail = (where, what) => fails.push(`${where}: ${what}`);

async function main() {
  if (!findChrome()) {
    console.error('No Chrome found. Install one, or set CHROME_PATH.');
    process.exit(2);
  }
  const server = await serve();
  const PORT = server.address().port;
  const browser = await launch();
  const cdp = browser.page;

  /* Console errors and uncaught exceptions, collected per navigation. */
  let log = [];
  cdp.on((method, params) => {
    if (method === 'Runtime.exceptionThrown') {
      const d = params.exceptionDetails || {};
      log.push('threw: ' + (d.exception?.description || d.text || 'unknown').split('\n')[0].slice(0, 160));
    }
    if (method === 'Log.entryAdded' && params.entry.level === 'error') {
      /* A 404 for a favicon variant is a network fact, not a script fault,
         and the guard already checks every referenced asset resolves. */
      if (params.entry.source === 'network') return;
      log.push('console: ' + String(params.entry.text).slice(0, 160));
    }
  });
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Page.enable');

  const goto = async (url) => {
    log = [];
    await cdp.send('Page.navigate', { url });
    await new Promise((r) => setTimeout(r, 900));
  };
  const ask = async (expr) => {
    const { result, exceptionDetails } = await cdp.send('Runtime.evaluate', {
      expression: expr, returnByValue: true, awaitPromise: true,
    });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description || 'evaluate failed');
    return result.value;
  };
  const resize = (w) => cdp.send('Emulation.setDeviceMetricsOverride', {
    width: w, height: 900, deviceScaleFactor: 1, mobile: w < 768,
  });

  const report = (where, a) => {
    if (a.overflow) fail(where, `scrolls sideways by ${a.overflow.by}px (widest: ${a.overflow.worst})`);
    for (const i of a.invisible.slice(0, 3)) fail(where, `text at no size: ${i.sel} "${i.text}" ${i.w}x${i.h}`);
    for (const u of a.unreadable.slice(0, 4)) {
      fail(where, `unreadable ${u.got}:1 (needs ${u.need}) ${u.fg} on ${u.bg} at ${u.size}px`
        + ` — ${u.path} "${u.text}"`);
    }
  };

  let measured = 0; let unverifiable = 0; let pages = 0;
  const clippedBy = new Map();

  const extra = makeAllBands();
  if (!extra) fail('__all-bands.html', 'could not be generated, so 58 of the 75 bands went unchecked');

  for (const route of [...routes(), ...(extra ? [extra] : [])]) {
    for (const w of WIDTHS) {
      await resize(w);
      await goto(`http://localhost:${PORT}${route}`);
      if (w === WIDTHS[0]) pages += 1;
      for (const l of log) fail(`${route}`, l);
      const a = await ask(AUDIT);
      report(`${route} @${w}`, a);
      measured += a.measured; unverifiable += a.unverifiable;
      for (const [b, n] of Object.entries(a.clipped || {})) clippedBy.set(b, Math.max(clippedBy.get(b) || 0, n));
    }
  }

  /* ---- The control panel ------------------------------------------------
     It is behind a Supabase sign-in, so it is booted the way the suite boots
     it: the shipped files, with the network stubbed and nothing else. The
     screens are what needed a browser most - the club types a match report
     on one of them, on a phone, at the side of a pitch. */
  const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/recovered-live.json'), 'utf8'));
  /* The photographs are megabytes of base64 and no screen's LAYOUT depends
     on their content, so they travel as their shape. */
  const rows = {};
  for (const [t, list] of Object.entries(fixture)) {
    rows[t] = (list || []).map((r) => (t === 'player_photos' && typeof r.data?.dataUrl === 'string'
      ? { ...r, data: { ...r.data, dataUrl: '' } } : r));
  }

  await resize(1280);
  await goto(`http://localhost:${PORT}/control.html`);
  for (const l of log) fail('control.html', l);

  const panels = await ask(`(() => {
    const F = ${JSON.stringify(rows)};
    window.CP.state.isAdmin = true;
    window.CP.state.role = 'admin';
    window.CP.state.user = { email: 'test@example.invalid', id: 'test' };
    window.CP.readAll = (t) => Promise.resolve(F[t] || []);
    window.CP.readEnquiries = () => Promise.resolve([]);
    window.CP.readSupporters = () => Promise.resolve([]);
    /* CP.rest served an empty array, and the one screen built entirely on it
       therefore rendered its "nothing recorded yet" state at all three
       widths: the world map, the daily trend, the day-against-hour heatmap
       and every table on Website stats were never drawn in a real browser at
       all. That is the defect this whole file exists to catch - a check that
       runs happily over markup that was never produced - so the stub answers
       page_stats with figures wide enough to draw the lot. */
    window.CP.rest = (method, q) => {
      const day = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
      if (/page_stats_hourly\\?/.test(q || '')) {
        const out = [];
        for (let d = 0; d < 20; d += 1) {
          for (const h of [8, 12, 17, 20, 22]) {
            out.push({ day: day(d), hour: h, path: '/index.html', views: 1 + ((d + h) % 9) });
          }
        }
        return Promise.resolve(out);
      }
      if (/page_stats\\?/.test(q || '')) {
        const zones = ['Europe/London', 'America/New_York', 'Australia/Sydney',
          'Africa/Lagos', 'Asia/Tokyo', 'Antarctica/Troll'];
        /* REAL routes, so the page catalogue the screen fetches actually
           names them. Made-up paths render as bare addresses and would have
           left the naming, the publication dates and the trend marks
           untested in a browser. */
        const paths = ['/index.html', '/squad.html', '/results.html',
          '/players/charlie-dunkley.html', '/matches/r20260816-brentford.html',
          '/news/sues-angels-fc-confirm-pre-season-fixtures.html',
          '/gallery/sues-angels-7-0-barnes-stormers-dylan-rigobert-trophy-8-february-2026.html'];
        const srcs = ['', 'google.com', 'facebook.com', 'instagram.com'];
        const devs = ['mobile', 'desktop', 'tablet'];
        const out = [];
        for (let d = 0; d < 20; d += 1) {
          paths.forEach((pth, i) => {
            out.push({
              day: day(d), path: pth, zone: zones[(d + i) % zones.length],
              source: srcs[(d + i) % srcs.length], device: devs[i % devs.length],
              views: 1 + ((d * 3 + i * 5) % 11),
              seconds_total: 20 + ((d + i) % 7) * 30,
              depth_total: 30 + ((d * 7 + i) % 60),
            });
          });
        }
        return Promise.resolve(out);
      }
      return Promise.resolve([]);
    };
    window.CP.upsert = () => Promise.resolve([]);
    window.CP.remove = () => Promise.resolve([]);
    window.CP.upload = () => Promise.resolve('');
    window.CP.audit = () => Promise.resolve();
    document.querySelector('#cp-gate').hidden = true;
    document.querySelector('#cp-app').hidden = false;
    return [...document.querySelectorAll('.cp-nav__item')].map((b) => b.getAttribute('data-module'));
  })()`);
  if (!panels || !panels.length) fail('control.html', 'no panels found, so nothing was checked');

  for (const key of panels || []) {
    log = [];
    await ask(`window.CPU.goto(${JSON.stringify(key)})`);
    await new Promise((r) => setTimeout(r, 700));
    for (const l of log) fail(`panel:${key}`, l);
    const a = await ask(AUDIT);
    report(`panel:${key}`, a);

    /* The stats screen is the one built entirely on CP.rest, so it is the one
       that can silently go back to rendering its empty state and take every
       chart on it out of this check without failing anything. It is asked
       directly whether it drew them. */
    if (key === 'stats') {
      const drewIt = await ask(`(() => ({
        land: (document.querySelector('.cpm__land')?.getAttribute('d') || '').split('M').length - 1,
        bubbles: document.querySelectorAll('.cpm__hit').length,
        heat: document.querySelectorAll('.cph__v').length,
        trend: document.querySelectorAll('.cpc__dot').length,
      }))()`);
      if (drewIt.land < 2000) fail('panel:stats', `the world map drew ${drewIt.land} land dots`);
      if (!drewIt.bubbles) fail('panel:stats', 'no country markers on the map');
      if (drewIt.heat !== 168) fail('panel:stats', `the heatmap drew ${drewIt.heat} cells, not 7 x 24`);
      if (drewIt.trend < 2) fail('panel:stats', `the daily trend drew ${drewIt.trend} points`);

      /* The second pass, asked of the rendered screen rather than of the
         source. The catalogue is fetched over the network here, so this is
         also the only place that proves the build writes a file the panel can
         actually read. */
      const more = await ask(`(() => ({
        filters: document.querySelectorAll('select[data-filt]').length,
        sparks: document.querySelectorAll('.cpk').length,
        named: /Charlie Dunkley/.test(document.body.textContent),
        unopened: /Pages nobody opened/.test(document.body.textContent),
        movers: /What moved/.test(document.body.textContent),
        publishes: /How the club/.test(document.body.textContent),
      }))()`);
      if (more.filters !== 4) fail('panel:stats', `${more.filters} filter controls, want 4`);
      if (more.sparks < 3) fail('panel:stats', `${more.sparks} row sparklines`);
      if (!more.named) fail('panel:stats', 'the page catalogue was not read, so pages are unnamed');
      if (!more.unopened) fail('panel:stats', 'the pages-nobody-opened section did not draw');
      if (!more.movers) fail('panel:stats', 'the risers and fallers section did not draw');
      if (!more.publishes) fail('panel:stats', 'the club-content section did not draw');
    }
    measured += a.measured; unverifiable += a.unverifiable;
    for (const [b, n] of Object.entries(a.clipped || {})) clippedBy.set(b, Math.max(clippedBy.get(b) || 0, n));
  }

  await browser.close();
  server.close();
  dropAllBands();

  console.log(`\n  ${pages} page families x ${WIDTHS.length} widths, plus ${(panels || []).length} panel screens`);
  console.log(`  ${measured} pieces of text measured for contrast · ${unverifiable} on a gradient or photograph, which cannot be measured this way`);
  /* Reported, not failed: a ticker, a carousel and a chart all clip on
     purpose, and this is the number to look at when somebody says a page is
     cut off on their phone. */
  const clipTotal = [...clippedBy.values()].reduce((a, b) => a + b, 0);
  console.log(`  ${clipTotal} pieces of text clipped by a container at some width, across ${clippedBy.size} bands`
    + (clippedBy.size ? `\n    ${[...clippedBy].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([b, n]) => b + ' ' + n).join(', ')}` : ''));

  if (fails.length) {
    console.log(`\n${fails.length} FAILURE(S):`);
    fails.forEach((f) => console.log('  x ' + f));
    process.exit(1);
  }
  notes.forEach((n) => console.log('  ' + n));
  console.log('\nNothing here renders wrongly.');
}

main().catch((e) => {
  dropAllBands();
  console.error('visual check could not run:', e.message);
  process.exit(1);
});
