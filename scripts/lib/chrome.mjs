/* ==========================================================================
   A CHROME, DRIVEN OVER CDP, WITH NO DEPENDENCY

   The suite renders the panel into src/test/dom.mjs, which is strict and
   honest and has no cascade and no layout. That is the right trade for a
   test that runs in eight seconds on every save, and it leaves exactly one
   thing uncheckable: whether the page LOOKS right. A screen can have perfect
   markup, every aria reference landing, every class reached by a rule, and
   still render as a stack of invisible boxes.

   So: a real browser. Node 22 has a global WebSocket, so the DevTools
   protocol needs nothing installed - no Puppeteer, no Playwright, no
   node_modules on a CI runner that only wants to look at a page.

   THREE CHROME DETAILS THAT COST AN HOUR EACH, kept here so they are paid
   for once (the first two were learned writing scripts/make-covers.mjs):

     --user-data-dir is not optional. Without one, launching Chrome on a
     machine that already has Chrome open hands the URL to the running copy
     and returns immediately, and the script waits forever for a browser it
     never started.

     --headless, not --headless=new. On macOS the new headless tries to open
     a display connection and hangs.

     The websocket address is printed to STDERR, not stdout, and only once
     the browser is ready. Waiting for it is the readiness signal; there is
     nothing else to poll.
   ========================================================================== */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
].filter(Boolean);

export function findChrome() {
  return CANDIDATES.find((p) => { try { return fs.existsSync(p); } catch { return false; } });
}

export async function launch({ timeout = 20000 } = {}) {
  const bin = findChrome();
  if (!bin) throw new Error('No Chrome found. Set CHROME_PATH, or install one.');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sa-visual-'));
  const proc = spawn(bin, [
    '--headless', '--disable-gpu', '--hide-scrollbars', '--mute-audio',
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    /* A CI runner is usually root in a container, where the sandbox refuses
       to start. Harmless here: the only thing this browser ever loads is
       this repo's own output, served from localhost. */
    '--no-sandbox', '--disable-dev-shm-usage',
    `--user-data-dir=${profile}`,
    '--remote-debugging-port=0',
    'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  const wsUrl = await new Promise((resolve, reject) => {
    let buf = '';
    const timer = setTimeout(() => reject(new Error('Chrome did not report a debugging port within '
      + timeout + 'ms. Output so far:\n' + buf.slice(-500))), timeout);
    proc.stderr.on('data', (d) => {
      buf += d.toString();
      const m = /ws:\/\/[^\s]+/.exec(buf);
      if (m) { clearTimeout(timer); resolve(m[0]); }
    });
    proc.on('exit', (c) => { clearTimeout(timer); reject(new Error('Chrome exited with ' + c + '\n' + buf.slice(-500))); });
  });

  const cdp = await connect(wsUrl);

  /* THE BROWSER SOCKET HAS NO Runtime AND NO Page. Those live on a page
     target, so a session has to be attached and its id carried on every
     message. `flatten: true` multiplexes that session down this same socket,
     which is the only reason one connection is enough. */
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });

  return {
    cdp,
    /* A page-scoped view of the same socket, so callers never hold the id. */
    page: {
      send: (method, params) => cdp.send(method, params, sessionId),
      on: (fn) => cdp.on((method, params, sid) => { if (sid === sessionId) fn(method, params); }),
    },
    async close() {
      try { cdp.close(); } catch { /* already gone */ }
      /* Chrome does not always exit when the socket closes. */
      try { proc.kill('SIGTERM'); } catch { /* already gone */ }
      try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* leave it */ }
    },
  };
}

/* A minimal CDP client: numbered requests, promises by id, and a listener
   list for the events a caller asked to hear. */
async function connect(url) {
  const ws = new WebSocket(url);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', () => rej(new Error('could not open ' + url)), { once: true });
  });
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message + ' (' + msg.error.code + ')'));
      else resolve(msg.result);
      return;
    }
    if (msg.method) listeners.forEach((fn) => fn(msg.method, msg.params, msg.sessionId));
  });
  return {
    send(method, params = {}, sessionId) {
      id += 1;
      const msg = { id, method, params };
      if (sessionId) msg.sessionId = sessionId;
      ws.send(JSON.stringify(msg));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    on(fn) { listeners.push(fn); },
    close() { ws.close(); },
  };
}
