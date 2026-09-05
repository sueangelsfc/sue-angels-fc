/* ==========================================================================
   THE PANEL, RENDERED

   `harness.mjs` loads a chunk and asks whether it registered its modules.
   That is the contract the lazy split depends on and it is worth having, but
   it stops before the part where the bugs live. Every panel defect found in
   the last month was found by a person opening a browser: one of nine player
   dropdowns filtered, the field hints attached to nothing, a screen titled
   "Fixtures 0". Static analysis cannot see any of those, and each one had a
   check sitting next to it asserting that the MECHANISM existed.

   So this boots the real thing. The real `control.html`, the real
   `control-seed.js`, the real `control.js`, the real lazy chunks fetched
   through the shell's own `need()`/`load()` path - into `src/test/dom.mjs`,
   which throws rather than guessing. Then it renders all twenty-one panels
   and asks questions about what actually came out.

   WHAT IS STUBBED, AND WHAT IS NOT. Only the network is: `CP`'s reads answer
   from a fixture, its writes are recorded. Every line of shell code, every
   line of module code and every byte of markup is the shipped one.
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { makeWindow, DomEvent, flushMutations, fullStorage } from './dom.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');

/* The panels the shell ships, taken from the markup rather than a list here,
   so a new panel is covered the day it is added. */
export function panelKeys(html) {
  return [...html.matchAll(/data-module="([\w-]+)"/g)].map((m) => m[1]);
}

/* ---- A store that answers from rows instead of from Supabase ---------- */
function fixtureStore(rows, { empty = false } = {}) {
  const writes = [];
  const give = (t) => (empty ? [] : (rows[t] || []));
  return {
    writes,
    TABLES: ['matches', 'fixtures', 'team_badges', 'player_photos', 'articles', 'gallery', 'recognition'],
    state: { isAdmin: true, role: 'admin', user: { id: 'test', email: 'test@example.com' }, session: { access_token: 't' } },
    signIn: () => Promise.resolve(true),
    signOut: () => Promise.resolve(),
    refresh: () => Promise.resolve(null),
    loadRole: () => Promise.resolve(true),
    startRefreshTimer: () => {},
    /* `rest` is the raw REST door, used by the screens that read a table the
       seven-table helpers do not cover - band_views, page_stats. It answered
       [] unconditionally, which meant a screen built on it could only ever be
       rendered empty and its arithmetic was untestable. A caller may now hand
       in a function and be asked the actual query. */
    rest: (method, q) => Promise.resolve(
      empty || typeof rows.rest !== 'function' ? [] : (rows.rest(method, q) || [])),
    readAll: (t) => Promise.resolve(give(t)),
    upsert: (t, k, d) => { writes.push({ op: 'upsert', t, k, d }); return Promise.resolve([{ key: k, data: d }]); },
    remove: (t, k) => { writes.push({ op: 'remove', t, k }); return Promise.resolve([{ key: k }]); },
    audit: () => {},
    readEnquiries: () => Promise.resolve(empty ? [] : (rows.enquiries || [])),
    readSupporters: () => Promise.resolve(empty ? [] : (rows.supporters || [])),
    listBucket: () => Promise.resolve([]),
    upload: (bucket, name) => { writes.push({ op: 'upload', name: name }); return Promise.resolve('https://example.test/' + name); },
    verifyWrote: () => true,
  };
}

/* ---- Boot ------------------------------------------------------------- */

/* The shell fetches a chunk by appending a <script> to <head> and waiting for
   onload. Rather than pre-loading the chunks and bypassing that, the append
   is intercepted and the file is executed for real - so CHUNK_OF, the chunk
   filenames the build stamps into CP_CHUNKS, and each chunk's registration
   are all exercised exactly as they are in a browser. */
/* `fetch` is opt-in and defaults to REJECTING, which is not laziness: a chunk
   that fetches a file the build writes has two behaviours worth checking, and
   the degraded one is the easier to get wrong. The stats screen fetches the
   site's page catalogue and must still draw every figure without it. */
export function boot({ rows = {}, empty = false, localStorage: ls, onScript, transform, canvas = false, fetch: fetchImpl } = {}) {
  const html = fs.readFileSync(path.join(ROOT, 'control.html'), 'utf8');
  const win = makeWindow({ localStorage: ls, canvas, fetch: fetchImpl });
  const doc = win.document;

  const bodyHtml = (/<body[^>]*>([\s\S]*)<\/body>/i.exec(html) || [, ''])[1]
    .replace(/<script[\s\S]*?<\/script>/gi, '');
  doc.body.innerHTML = bodyHtml;

  const loaded = [];
  /* Every chunk that would not parse or run. See the note beside the push. */
  const chunkErrors = [];
  const run = (file) => {
    const p = path.join(ROOT, file);
    if (!fs.existsSync(p)) throw new Error('chunk not on disk: ' + file);
    loaded.push(file);
    if (onScript) onScript(file);
    /* MUTATION PROBES. A check that has never been seen to fail is a check
       nobody has tested. `transform` rewrites a chunk's source on the way in,
       so a probe can break the exact mechanism a check guards and prove the
       check goes red - the same discipline the rest of the suite uses, now
       reaching code that only exists at runtime. */
    let src = fs.readFileSync(p, 'utf8');
    if (transform) src = transform(src, file);
    const fn = new Function('window', 'document', 'location', 'history', 'localStorage',
      'sessionStorage', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
      'fetch', 'FileReader', 'Event', 'CustomEvent', 'MutationObserver', 'navigator',
      'requestAnimationFrame', 'Image', 'FormData', 'Blob', 'URL', 'atob', 'btoa', 'alert',
      '"use strict";' + src);
    fn(win, doc, win.location, { replaceState: () => {}, pushState: () => {} },
      win.localStorage, win.sessionStorage,
      (f, ms, ...a) => setTimeout(f, ms, ...a), (t) => clearTimeout(t),
      () => 0, () => {},
      win.fetch, function FileReaderStub() {}, DomEvent, DomEvent,
      win.MutationObserver, win.navigator, win.requestAnimationFrame,
      win.Image, function FormDataStub() {}, function BlobStub() {},
      { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} },
      (s) => Buffer.from(String(s), 'base64').toString('binary'),
      (s) => Buffer.from(String(s), 'binary').toString('base64'),
      () => {});
  };

  /* The interception. A <script> appended to <head> is a chunk request. */
  const realAppend = doc.head.appendChild.bind(doc.head);
  doc.head.appendChild = (node) => {
    realAppend(node);
    if (node.localName === 'script' && node.getAttribute('src')) {
      const file = node.getAttribute('src').replace(/^\//, '').split('?')[0];
      /* A CHUNK THAT FAILS TO PARSE OR RUN IS A HARNESS FAULT, NOT A 404.
         The shell turns onerror into "This section could not be downloaded",
         which is the right sentence for a browser and completely wrong here:
         a mutation probe whose target had moved threw inside `transform`, the
         shell reported a connection problem, the rejection went unhandled and
         Node printed the whole 30KB minified bundle as context. Re-thrown with
         the real cause so the next one takes seconds rather than an hour. */
      /* RECORDED AS WELL AS THROWN, and the recording is the part that
         works. Throwing here lands inside the shell's own script-loading
         path, which turns any failure into "This section could not be
         downloaded" and carries on - so a mutation probe whose target had
         moved produced an EMPTY panel, and a probe check written as "did the
         list change" passed on nought rows against nought rows. A probe that
         silently stops firing is worse than no probe, so the fault is kept on
         the context and openPanel refuses to return while one is outstanding. */
      try { run(file); } catch (e) {
        chunkErrors.push(file + ': ' + e.message);
        throw new Error('the panel harness could not run ' + file + ': ' + e.message);
      }
      if (node.onload) node.onload();
    }
    return node;
  };

  /* CP_CHUNKS is stamped by the build onto the front of control.js itself, so
     loading the file is what supplies the hashed chunk URLs. Nothing here
     supplies them: if the build stopped emitting them, the chunks would 404
     here exactly as they would in a browser. */
  run('control-seed.js');
  run('control.js');
  const chunkMap = win.CP_CHUNKS || {};

  /* The store is replaced by MUTATION, not reassignment: the shell captured
     `var CP = window.CP` when it ran, so a fresh object would leave it
     holding the real one. Same trap the match split hit with CPMSTATE. */
  const store = fixtureStore(rows, { empty });
  Object.keys(store).forEach((k) => { win.CP[k] = store[k]; });

  return { win, doc, store, loaded, chunkMap, html, run, chunkErrors };
}

/* Renders one panel and waits for the shell to finish. `render()` is three
   chained promises deep and each `.then` is a microtask, so draining the
   queue a few times is what "await the render" means here. */
export async function settle(ctx) {
  for (let i = 0; i < 60; i += 1) await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
  for (let i = 0; i < 60; i += 1) await Promise.resolve();
}

/* Opens a panel THE WAY A PERSON DOES - by clicking its nav button - so the
   whole of show() runs: the panel swap, the active state, the heading. Going
   straight to render() would skip exactly the code that once titled a screen
   "Fixtures 0". */
export async function openPanel(ctx, key) {
  const btn = ctx.doc.querySelector('[data-module="' + key + '"]');
  if (!btn) throw new Error('no nav button for ' + key);
  click(btn);
  await settle(ctx);
  /* A chunk that would not run is never a result worth asserting against: the
     panel draws its "could not be downloaded" state and every count on it is
     nought, which is the shape a weak check passes on. */
  if (ctx.chunkErrors && ctx.chunkErrors.length) {
    throw new Error('a chunk failed while opening ' + key + ' - '
      + ctx.chunkErrors.join('; '));
  }
  const panel = ctx.doc.querySelector('#panel-' + key);
  const body = panel.querySelector('[data-panel-body]');
  return { panel, body, html: body ? body.innerHTML : '' };
}

export async function renderPanel(ctx, key) {
  const errors = [];
  const before = ctx.doc.querySelector('#panel-' + key);
  if (!before) throw new Error('no panel markup for ' + key);
  ctx.win.CPU.refresh(key);
  for (let i = 0; i < 60; i += 1) await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
  for (let i = 0; i < 60; i += 1) await Promise.resolve();
  const panel = ctx.doc.querySelector('#panel-' + key);
  const body = panel.querySelector('[data-panel-body]');
  return { panel, body, errors, html: body ? body.innerHTML : '' };
}

/* Fires the shell's own click path: a real bubbling event from a real node. */
export function click(el) { return el.dispatchEvent(new DomEvent('click', { bubbles: true })); }
export function type(el, value) {
  el.value = value;
  el.dispatchEvent(new DomEvent('input', { bubbles: true }));
  el.dispatchEvent(new DomEvent('change', { bubbles: true }));
}

export { flushMutations, fullStorage, DomEvent, ROOT };
