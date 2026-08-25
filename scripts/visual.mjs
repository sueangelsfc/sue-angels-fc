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
    if (a.overflow) {
      fail(where, `${a.overflow.count} text element(s) past the edge, worst by ${a.overflow.by}px:`
        + ` ${a.overflow.worst} "${a.overflow.text}"`);
    }
    for (const i of a.invisible.slice(0, 3)) fail(where, `text at no size: ${i.sel} "${i.text}" ${i.w}x${i.h}`);
    for (const u of a.unreadable.slice(0, 4)) {
      fail(where, `unreadable ${u.got}:1 (needs ${u.need}) ${u.fg} on ${u.bg} at ${u.size}px`
        + ` — ${u.path} "${u.text}"`);
    }
  };

  let measured = 0; let unverifiable = 0; let pages = 0;

  for (const route of routes()) {
    for (const w of WIDTHS) {
      await resize(w);
      await goto(`http://localhost:${PORT}${route}`);
      if (w === WIDTHS[0]) pages += 1;
      for (const l of log) fail(`${route}`, l);
      const a = await ask(AUDIT);
      report(`${route} @${w}`, a);
      measured += a.measured; unverifiable += a.unverifiable;
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
    window.CP.rest = () => Promise.resolve([]);
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
    measured += a.measured; unverifiable += a.unverifiable;
  }

  await browser.close();
  server.close();

  console.log(`\n  ${pages} page families x ${WIDTHS.length} widths, plus ${(panels || []).length} panel screens`);
  console.log(`  ${measured} pieces of text measured for contrast · ${unverifiable} on a gradient or photograph, which cannot be measured this way`);

  if (fails.length) {
    console.log(`\n${fails.length} FAILURE(S):`);
    fails.forEach((f) => console.log('  x ' + f));
    process.exit(1);
  }
  notes.forEach((n) => console.log('  ' + n));
  console.log('\nNothing here renders wrongly.');
}

main().catch((e) => { console.error('visual check could not run:', e.message); process.exit(1); });
