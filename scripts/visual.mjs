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
  /* A SECOND SHAPE OF AN EXISTING FAMILY IS A SECOND FAMILY. One page per
     directory is right while a directory is one template, and `matches/` is
     two: a report from 26/27 onwards is drawn - a timeline, a pitch, goal
     cards, a pinned scoreboard - and the archive keeps the three columns it
     has always had. Keyed on the directory, the first id in the manifest wins
     and that is a 25/26 match, so every one of those bands would have gone
     unrendered in a browser while this printed "nothing renders wrongly".
     Named by id rather than found by rule, so a match the club edits cannot
     quietly change what this checks. */
  for (const r of ['matches/r20261011-peps.html']) {
    if (man.routes.includes(r)) seen.set(`second:${r}`, `/${r}`);
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

/* Open a drop-down and ask, of every link in it, what a click at the middle
   of that link would actually hit. Returns the ones where the answer is not
   the link.

   ONE GROUP PER PAGE, the fullest one, and only at the widest width. Every
   group opens the SAME panel in the same place under the header, so a band
   painting over one paints over all of them; five groups on thirty-three
   pages would add two minutes to this run to re-prove the same fact. Below
   768 there is no drop-down at all - the full-screen mobile nav takes over -
   so there is nothing to ask. */
const MENU = `(async () => {
  /* WAIT FOR THE BOOT SCREEN. The home page holds a fixed crest splash at
     z-index 9999 for three seconds, and this check runs well inside that, so
     its first honest answer was "every link on the front page is covered" -
     by the loading screen, which is true and is not a bug. A check that cries
     wolf on the club's own front page is a check somebody switches off. */
  for (let i = 0; i < 60 && document.querySelector('#sa-boot'); i += 1) {
    await new Promise((r) => setTimeout(r, 100));
  }
  const groups = [...document.querySelectorAll('.hx__navgrp')]
    .map((g) => [g, g.querySelectorAll('.hx__dd a').length])
    .sort((a, b) => b[1] - a[1]);
  if (!groups.length || !groups[0][1]) return [];
  const g = groups[0][0];
  const trig = g.querySelector('.hx__navtrig');
  if (!trig) return [];
  for (const t of ['pointerenter', 'mouseenter', 'mouseover', 'pointerover']) {
    trig.dispatchEvent(new PointerEvent(t, { bubbles: true }));
  }
  /* WAIT FOR THE PANEL TO STOP MOVING, rather than for a number of
     milliseconds. It animates its own width and height from nought over
     0.42s and clips what overflows, so while it is still opening a link can
     have a box whose centre is outside the part of the panel actually drawn -
     and the hit test then reports, truthfully, that something else is on top.

     A fixed 560ms was enough on most runs and not on all of them, which is
     the worst kind of check: it went red on two pages nobody had touched and
     green on the next run. Settled means two consecutive reads of the same
     size, with a cap so a panel that never opens still returns. */
  const panel = document.querySelector('.hx__vp');
  const inside = (p, r) => r.left + r.width / 2 >= p.left && r.left + r.width / 2 <= p.right
    && r.top + r.height / 2 >= p.top && r.top + r.height / 2 <= p.bottom;

  /* AND WAIT FOR THE LINKS TO BE INSIDE THE PANEL, which is the thing the
     size test only stands in for. Settling on size alone was still wrong on
     a slower machine: the loop breaks on two equal reads, and two equal reads
     happen immediately when the panel has not STARTED opening yet - the hover
     has been dispatched, the animation has not begun, and the size is stable
     because nothing is moving. The check then hit-tested links whose centres
     were nowhere near the drawn panel and reported, with complete confidence,
     that a static hero was painted over the menu.

     A static element cannot paint over a positioned one, so that answer was
     never physically possible and the check had no way to notice. It went red
     on /awards.html and one player page in CI, green on the next run, and
     green on every local run, which is the shape this exact check has failed
     in twice now.

     So the condition is the one that actually matters: every link's centre
     lies within the panel's own rectangle. That is false while it is opening,
     false if it never opens, and true exactly when a hit test means
     something. */
  if (panel) {
    let last = -1;
    for (let i = 0; i < 80; i += 1) {
      const p = panel.getBoundingClientRect();
      const ls = [...panel.querySelectorAll('a')];
      const settled = Math.round(p.width) * 10000 + Math.round(p.height) === last;
      const placed = p.width > 0 && p.height > 0 && ls.length
        && ls.every((a) => { const r = a.getBoundingClientRect(); return !r.width || inside(p, r); });
      if (settled && placed) break;
      last = Math.round(p.width) * 10000 + Math.round(p.height);
      await new Promise((r2) => setTimeout(r2, 60));
    }
  }
  const links = panel ? [...panel.querySelectorAll('a')] : [];
  const out = [];
  const pr = panel ? panel.getBoundingClientRect() : null;

  /* A PANEL THAT NEVER OPENED IS ITS OWN FAILURE, not forty dead links.
     Reported once, in its own words, so the two can never be confused again. */
  if (pr && links.length && !links.every((a) => { const r = a.getBoundingClientRect(); return !r.width || inside(pr, r); })) {
    return [{ text: '(the drop-down never finished opening)',
      hit: 'panel ' + Math.round(pr.width) + 'x' + Math.round(pr.height)
        + ', so no click could be tested - this is the CHECK failing, not the menu' }];
  }

  for (const a of links) {
    const r = a.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (top === a || a.contains(top)) continue;
    const name = (e) => (e ? e.tagName + (e.id ? '#' + e.id : '')
      + (e.className ? '.' + String(e.className).trim().split(/\s+/).slice(0, 2).join('.') : '') : 'nothing');
    const cs = top ? getComputedStyle(top) : null;
    out.push({ text: a.textContent.trim().slice(0, 24),
      hit: name(top) + ' [pos=' + (cs ? cs.position : '-') + ' z=' + (cs ? cs.zIndex : '-') + ']'
        + ' under ' + name(top && top.parentElement) });
  }
  if (!links.length) out.push({ text: '(the panel never opened)', hit: 'no links to hit-test' });
  return out;
})()`;

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
  const clippedWhat = new Map();   /* band -> the widest example seen, in words */

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
      for (const line of (a.clippedWhat || [])) {
        const band = line.split(' | ')[0];
        if (!clippedWhat.has(band)) clippedWhat.set(band, `@${w} ` + line.slice(band.length + 3));
      }
      /* ---- CAN THE MENU BE CLICKED? -----------------------------------
         Asked at the widest width only, because below 768 the drop-downs are
         replaced by the full-screen mobile nav and there is nothing to open.

         Nothing else on this project can ask this. The suite's DOM has no
         layout and no cascade, so it cannot know what is painted over what;
         every static check of the header passed while every link in it was
         unreachable. It shipped that way on the match reports: `.pghead` was
         `position: static`, the scoreboard is `position: relative`, and a
         positioned sibling later in the document paints over a static one
         whatever either of them claims about z-index. Seven links, all dead,
         and the only symptom was a 0-4 drawn through the menu.

         Hit-tested rather than measured: the question is not where the panel
         IS, it is what a reader's click would actually land on. */
      if (w === WIDTHS[WIDTHS.length - 1]) {
        const blocked = await ask(MENU);
        for (const b of (blocked || []).slice(0, 4)) {
          fail(`${route} @${w}`, `menu link "${b.text}" cannot be clicked: ${b.hit} is on top of it`);
        }
      }
    }
  }

  /* ---- One tablist per season view, asked of the real thing -------------
     The Player of the Month band ships once per season view, and the script
     that promotes it asked the WHOLE DOCUMENT for its tabs and panels: ten
     tabs, ten panels, lengths equal so the guard passed, and select(0) then
     hid nine. The 26/27 view has one award, so its only panel was hidden and
     the season drew a lone pill under a heading reading "1 awarded".

     Nothing static could see it. The markup was correct and complete in the
     HTML, every id resolved, and the suite's DOM has no scripts running over
     it; the defect lived entirely in what the script did on load. So it is
     asked here, of a real browser, the way the bug was actually found. */
  await resize(1280);
  await goto(`http://localhost:${PORT}/awards.html`);
  const potm = await ask(`(() => {
    const bands = [...document.querySelectorAll('.aw-potm')];
    return {
      bands: bands.length,
      bad: bands.filter((b) => [...b.querySelectorAll('[data-potm-panel]')]
        .filter((p) => !p.hidden).length !== 1).length,
      empty: [...document.images].filter((i) => !i.getAttribute('src')).length,
    };
  })()`);
  if (potm.bands < 2) fail('awards.html', 'fewer than two Player of the Month bands, so the one-per-view check proves nothing');
  if (potm.bad) fail('awards.html', `${potm.bad} Player of the Month band(s) show other than exactly one panel`);
  if (potm.empty) fail('awards.html', `${potm.empty} image(s) with an empty src, which re-request the page`);

  /* ---- THIS BROWSER MUST NOT BE COUNTED AS A READER ---------------------

     Over September and October, 8,520 of the 10,533 views in the club's
     stats were THIS SCRIPT and the suite's browser passes: every page, on
     desktop, mobile and tablet in lockstep, one second each. Four fifths of
     the analytics were our own verification runs, and the screen reported
     266 views a day at six seconds a page when the truth was 67 at
     twenty-six.

     `30-stats.js` refuses to record in an automated browser. The check
     belongs HERE, in the browser that actually caused it, rather than as a
     grep over the shipped file: the obvious test for this is
     `navigator.webdriver` and it is FALSE in the Chrome this project
     drives, so a check that only proved the guard existed would have proved
     the wrong guard existed. */
  const robot = await ask(`(() => {
    const ua = navigator.userAgent || '';
    return {
      webdriver: navigator.webdriver === true,
      headless: /HeadlessChrome/.test(ua),
      caught: navigator.webdriver === true || /HeadlessChrome/.test(ua),
      /* THE OTHER DIRECTION, which is the one that can actually be wrong
         here. Both signals are true in this browser, so "is it caught" can
         only ever pass and proves nothing on its own; a guard that answered
         yes to everything would silence the club's analytics completely.
         A real iPhone's user agent must NOT be caught. */
      realReaderCaught: /HeadlessChrome/.test(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 '
        + '(KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'),
    };
  })()`);
  notes.push(`automation seen by the beacon: webdriver=${robot.webdriver} `
    + `headlessUA=${robot.headless}`);
  if (robot.realReaderCaught) {
    fail('the stats beacon', 'a real phone\'s user agent is treated as automated, '
      + 'so genuine readers would stop being counted');
  }
  if (!robot.caught) {
    fail('the stats beacon', 'this browser is not recognised as automated, so every page '
      + 'it renders is being counted as a reader in the club\'s analytics');
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
      if (/page_places\\?/.test(q || '')) {
        return Promise.resolve([
          { day: day(0), country: 'GB', region: 'ENG', city: 'Kingston upon Thames', lat: 51.4, lon: -0.3, views: 40 },
          { day: day(1), country: 'GB', region: 'ENG', city: 'London', lat: 51.5, lon: -0.1, views: 22 },
          { day: day(1), country: 'GB', region: 'SCT', city: 'Glasgow', lat: 55.9, lon: -4.3, views: 5 },
          { day: day(2), country: 'IE', region: 'D', city: 'Dublin', lat: 53.3, lon: -6.3, views: 3 },
          { day: day(2), country: 'US', region: 'NY', city: 'New York', lat: 40.7, lon: -74, views: 2 },
        ]);
      }
      if (/page_trails\\?/.test(q || '')) {
        return Promise.resolve([
          { day: day(0), trail: '>/index.html', views: 30 },
          { day: day(0), trail: '>/index.html>/squad.html', views: 12 },
          { day: day(0), trail: '>/index.html>/squad.html>/players/charlie-dunkley.html', views: 5 },
          { day: day(1), trail: 'instagram.com>/programme.html', views: 18 },
          { day: day(1), trail: 'instagram.com>/programme.html>/results.html', views: 6 },
        ]);
      }
      if (/page_tags\\?/.test(q || '')) {
        return Promise.resolve([
          { day: day(0), tag: 'insta-story', path: '/programme.html', views: 7 },
          { day: day(2), tag: 'whatsapp-group', path: '/index.html', views: 3 },
        ]);
      }
      if (/page_events\\?/.test(q || '')) {
        return Promise.resolve([
          { day: day(0), path: '/programme.html', kind: 'download', target: '/assets/programme/f20260913-haydons.pdf', count: 5 },
          { day: day(1), path: '/sepsis.html', kind: 'donate', target: 'buy.stripe.com', count: 2 },
          { day: day(1), path: '/index.html', kind: 'social', target: 'instagram.com', count: 4 },
        ]);
      }
      if (/page_routes\\?/.test(q || '')) {
        return Promise.resolve([
          { day: day(0), came_from: 'instagram.com', path: '/programme.html', views: 9 },
          { day: day(1), came_from: '', path: '/index.html', views: 6 },
          { day: day(1), came_from: '/index.html', path: '/squad.html', views: 4 },
        ]);
      }
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
    for (const line of (a.clippedWhat || [])) {
      const band = line.split(' | ')[0];
      if (!clippedWhat.has(band)) clippedWhat.set(band, line.slice(band.length + 3));
    }
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
    + (clippedBy.size ? `\n` + [...clippedBy].sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([b, n]) => `    ${b} ${n}` + (clippedWhat.has(b) ? `\n      ${clippedWhat.get(b)}` : '')).join('\n') : ''));

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
