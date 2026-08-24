/* ==========================================================================
   LOADING A CONTROL PANEL CHUNK OUTSIDE A BROWSER

   The panel had no runtime coverage of any kind. The suite is static analysis
   over generated output, and the panel itself sits behind a Supabase sign-in,
   so the only way to find out whether a chunk still worked was for somebody to
   log in and click. That is what made splitting the match form unsafe: 1,200
   lines could move and nothing would say a word until the club tried to record
   a result.

   It turns out very little is needed. No chunk touches the DOM at load time -
   every one of them declares its helpers and registers its modules, and waits
   to be called - so a chunk can be loaded against plain stubs and asked the
   questions that matter:

     - does it still register the modules it is supposed to?
     - do two chunks that share state share the SAME OBJECT, rather than two
       copies that will drift?
     - does a mutation made through one chunk show up in the other?

   That is the whole contract the split depends on. Rendering is a separate
   problem needing a real DOM, and is deliberately not attempted here: a
   half-built DOM that answers wrongly is worse than one that is absent.
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';

/* The helper set the shell publishes as window.CPU. Everything returns
   something harmless and inspectable; nothing here pretends to render. */
function stubCPU() {
  const esc = (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const calls = [];
  const note = (name) => (...args) => { calls.push({ name, args }); return ''; };
  return {
    calls,
    $: () => null,
    $$: () => [],
    esc,
    toast: note('toast'),
    guard: () => true,
    confirmAction: () => Promise.resolve(false),
    sec: (o) => { calls.push({ name: 'sec', args: [o] }); return ''; },
    where: note('where'),
    table: note('table'),
    empty: note('empty'),
    tile: note('tile'),
    feed: note('feed'),
    fmtDate: (v) => String(v || ''),
    csv: note('csv'),
    download: note('download'),
    readImage: () => Promise.resolve(null),
    uploadImage: () => Promise.resolve(''),
    matchLabel: (k) => String(k || ''),
    youtubeId: () => '',
    refresh: note('refresh'),
    dirty: note('dirty'),
    invalid: note('invalid'),
    chunk: () => Promise.resolve(),
  };
}

/* The store. Reads resolve to whatever the caller supplied; writes are
   recorded rather than performed. */
function stubCP(rows = {}) {
  const writes = [];
  return {
    writes,
    state: { isAdmin: true, role: 'admin', user: { id: 'test', email: 'test@example.com' } },
    TABLES: Object.keys(rows),
    readAll: (t) => Promise.resolve(rows[t] || []),
    upsert: (t, k, d) => { writes.push({ op: 'upsert', t, k, d }); return Promise.resolve([{ key: k, data: d }]); },
    remove: (t, k) => { writes.push({ op: 'remove', t, k }); return Promise.resolve([{ key: k }]); },
    rest: () => Promise.resolve([]),
    upload: () => Promise.resolve(''),
    audit: () => {},
    readEnquiries: () => Promise.resolve([]),
    readSupporters: () => Promise.resolve([]),
    listBucket: () => Promise.resolve([]),
  };
}

/* Enough of a document that a chunk can be LOADED. Anything that would need a
   real DOM throws by design, so a test that strays into rendering fails loudly
   instead of quietly passing against a fiction. */
function stubDocument() {
  const die = (what) => () => {
    throw new Error(`the harness does not render: ${what} needs a real DOM`);
  };
  return {
    createElement: die('createElement'),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    documentElement: { classList: { toggle: () => {} } },
    body: null,
  };
}

/* Load one or more chunks into ONE shared window, in order, exactly as the
   browser would when a panel pulls its chunk after the shell. */
export function loadChunks(files, { seed = {}, rows = {}, root } = {}) {
  const ROOT = root || process.cwd();
  const win = {
    CPM: {},
    CPU: stubCPU(),
    CP: stubCP(rows),
    SA_SEED: seed,
    CP_CHUNKS: {},
    addEventListener: () => {},
    location: { hash: '' },
    history: { replaceState: () => {} },
    localStorage: {
      _s: {},
      getItem(k) { return k in this._s ? this._s[k] : null; },
      setItem(k, v) { this._s[k] = String(v); },
      removeItem(k) { delete this._s[k]; },
    },
  };
  const doc = stubDocument();

  for (const f of files) {
    const src = fs.readFileSync(path.isAbsolute(f) ? f : path.join(ROOT, f), 'utf8');
    /* The chunk is an IIFE that closes over `window`; handing it one is the
       whole of the loading contract. */
    // eslint-disable-next-line no-new-func
    const run = new Function('window', 'document', 'location', 'history',
      'localStorage', 'setTimeout', 'clearTimeout', 'fetch', 'FileReader', 'Event', src);
    run(win, doc, win.location, win.history, win.localStorage,
      (fn) => fn, () => {}, () => Promise.reject(new Error('no network in the harness')),
      function FileReaderStub() {}, function EventStub() {});
  }
  return win;
}

export { stubCPU, stubCP, stubDocument };
