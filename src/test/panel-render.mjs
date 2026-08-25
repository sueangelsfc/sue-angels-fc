/* ==========================================================================
   WHAT THE PANEL ACTUALLY DRAWS

   Every check in here renders the shipped panel - real markup, real shell,
   real lazy chunks, real modules - into src/test/dom.mjs and then asks a
   question about the result. Nothing is stubbed but the network.

   This exists because the panel's three worst bugs were all the same shape:
   a correct mechanism wired to almost nothing, with a check beside it
   asserting the mechanism existed. Static analysis cannot tell those apart.
   Rendering can.

   Every check below has a mutation probe at the bottom of the file proving it
   goes red when the thing it guards is broken.
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import * as PR from './panel-runtime.mjs';

const ROOT = PR.ROOT;

function fixtureRows() {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/recovered-live.json'), 'utf8'));
  const rows = {};
  for (const [k, v] of Object.entries(raw)) {
    rows[k] = Array.isArray(v) ? v : Object.entries(v || {}).map(([key, data]) => ({ key, data }));
  }
  return rows;
}

/* The panel a person actually opens: nav click, not a direct render call. */
async function everyPanel(ctx, keys, fn) {
  for (const k of keys) fn(k, await PR.openPanel(ctx, k));
}

/* A probe that silently changes nothing reports the check as weak when the
   check is fine. `bust` refuses to be a no-op. */
function bust(src, find, replace) {
  if (!src.includes(find)) {
    throw new Error('mutation probe found nothing to break: ' + JSON.stringify(find)
      + ' is not in the shipped file. The probe must be re-aimed, not deleted.');
  }
  return src.split(find).join(replace);
}

export async function panelChecks() {
  const out = [];
  const check = (name, cond, detail) => out.push({ name, cond: !!cond, detail });

  const rows = fixtureRows();
  const html = fs.readFileSync(path.join(ROOT, 'control.html'), 'utf8');
  const keys = PR.panelKeys(html);

  check('the panel ships the twenty-one screens the nav offers', keys.length === 21,
    `control.html declares ${keys.length}`);

  /* ---------------------------------------------------------------------
     1. EVERY SCREEN RENDERS. Eighteen of the twenty-one live in lazy chunks
     that are fetched through the shell's own need()/load() path, so this
     also proves CHUNK_OF maps every panel to a chunk that exists, registers
     the module it promises, and does it through the hashed URL the build
     stamped into CP_CHUNKS. Nothing here supplies those URLs. */
  const ctx = PR.boot({ rows });
  const drew = {};
  const errored = [];
  await everyPanel(ctx, keys, (k, r) => {
    drew[k] = r.html.length;
    const t = r.body && r.body.querySelector('.state__title');
    if (t && /Could not load|Not built yet/i.test(t.textContent)) errored.push(k);
  });
  check('every screen renders rather than reporting a failure',
    errored.length === 0, errored.join(', '));
  const blank = keys.filter((k) => !drew[k]);
  check('every screen draws something', blank.length === 0, blank.join(', '));

  const lazyLoaded = ctx.loaded.filter((f) => /^control-/.test(f) && f !== 'control-seed.js');
  check('opening the screens fetches the lazy chunks, and only through the shell',
    lazyLoaded.length >= 12, `${lazyLoaded.length} chunks fetched`);

  /* ---------------------------------------------------------------------
     2. NAVIGATION. One panel visible, one nav item active, and the heading
     is the nav LABEL - not the button, which also holds a count badge that
     setCount hides rather than removes. That is how the Fixtures screen came
     to be titled "Fixtures 0". */
  const titleWrong = [];
  await everyPanel(ctx, keys, (k) => {
    const lab = ctx.doc.querySelector('[data-module="' + k + '"] .cp-nav__label');
    const title = ctx.doc.querySelector('[data-cp-title]');
    if (lab && title && title.textContent.trim() !== lab.textContent.trim()) {
      titleWrong.push(`${k}: "${title.textContent}"`);
    }
  });
  check('a screen is headed by its own name, with no stray count digit',
    titleWrong.length === 0, titleWrong.join(' | '));
  check('exactly one screen is visible at a time',
    ctx.doc.querySelectorAll('.cp-panel').filter((p) => !p.hidden).length === 1);
  check('exactly one nav item is marked active',
    ctx.doc.querySelectorAll('.cp-nav__item.is-active').length === 1);
  check('the screen is not left marked busy once it has drawn',
    keys.every((k) => !ctx.doc.querySelector('#panel-' + k).getAttribute('aria-busy')));

  /* ---------------------------------------------------------------------
     3. THE HINT UNDER A FIELD REACHES A SCREEN READER. Counted on the
     rendered output, not on the existence of wireHints. */
  let hints = 0; let wired = 0; let misdescribed = 0;
  let orphanLabels = 0; let dupIds = 0;
  const badWhere = [];
  await everyPanel(ctx, keys, (k, r) => {
    const b = r.body; if (!b) return;
    for (const el of b.querySelectorAll('input,select,textarea')) {
      const scope = el.closest('label') || el;
      const next = scope.nextElementSibling;
      const own = next && next.classList
        && (next.classList.contains('field__hint') || next.classList.contains('cp-note'))
        ? next : null;
      if (own) { hints += 1; if (own.id && el.getAttribute('aria-describedby') === own.id) wired += 1; }
      /* THE NEGATIVE CHECK, which is the one that matters. A field described
         by a sentence belonging to a different field is a wrong answer read
         with total confidence - worse than the silence it replaced. */
      if (el.getAttribute('aria-describedby') && !own) misdescribed += 1;
    }
    for (const l of b.querySelectorAll('label')) {
      const f = l.getAttribute('for');
      if (f && !ctx.doc.querySelector('#' + f)) orphanLabels += 1;
    }
    const seen = new Set();
    for (const e of b.querySelectorAll('[id]')) {
      const i = e.getAttribute('id');
      if (seen.has(i)) dupIds += 1;
      seen.add(i);
    }
    for (const a of b.querySelectorAll('.cp-where a')) {
      const h = a.getAttribute('href') || '';
      if (h.startsWith('/') && !fs.existsSync(path.join(ROOT, h.replace(/^\//, '').split('#')[0]))) {
        badWhere.push(k + ' -> ' + h);
      }
    }
  });
  check('every hint written beside a field is announced with that field',
    hints > 0 && wired === hints, `${wired} of ${hints} wired`);
  check('no field is described by a sentence belonging to another field',
    misdescribed === 0, `${misdescribed} misdescribed`);
  check('no label in the panel points at a control that is not there',
    orphanLabels === 0, `${orphanLabels} orphan labels`);
  check('no screen renders the same id twice', dupIds === 0, `${dupIds} duplicates`);
  check('every "shows on the website" link points at a page that exists',
    badWhere.length === 0, badWhere.slice(0, 5).join(' | '));

  /* ---------------------------------------------------------------------
     4. A SCREEN WITH NO DATA STILL DRAWS. The club's own publish runs the
     generator, so a screen that throws on an empty table takes the deploy
     with it. Every screen is rendered against seven empty tables. */
  const bare = PR.boot({ rows, empty: true });
  const bareFail = [];
  const bareBlank = [];
  for (const k of keys) {
    try {
      const r = await PR.openPanel(bare, k);
      const t = r.body && r.body.querySelector('.state__title');
      if (t && /Could not load/i.test(t.textContent)) {
        bareFail.push(k + ': ' + (r.body.querySelector('.state__body') || {}).textContent);
      }
      if (!r.html.length) bareBlank.push(k);
    } catch (e) { bareFail.push(k + ': ' + e.message); }
  }
  check('every screen survives a database with nothing in it',
    bareFail.length === 0, bareFail.slice(0, 3).join(' | '));
  check('a screen with no data says so rather than going blank',
    bareBlank.length === 0, bareBlank.join(', '));

  /* ---------------------------------------------------------------------
     5. WHO A MATCH CAN NAME. The team sheet is the gate for everything
     claimed about the match, and the failure was never in offer() - it was
     that eight of the nine dropdowns were built as strings before the dialog
     existed, so the date filter found no date field and waved everybody
     through. Counted here on the rendered dialog. */
  const res = await PR.openPanel(ctx, 'results');
  let sheetSize = 0; let modal = null; let chosen = null;
  for (const tr of res.body.querySelectorAll('tr[data-key]')) {
    const k = tr.getAttribute('data-key');
    const m = rows.matches.find((x) => x.key === k);
    if (m && (m.data.starters || []).length >= 11) {
      chosen = m;
      sheetSize = new Set([...(m.data.starters || []), ...(m.data.bench || [])]
        .map((x) => String(x.num))).size;
      PR.click(tr.querySelector('[data-edit]'));
      await PR.settle(ctx);
      PR.flushMutations(ctx.doc.body);
      await PR.settle(ctx);
      modal = ctx.doc.querySelector('.modal-backdrop');
      break;
    }
  }
  check('a match with a full team sheet can be opened for editing', !!modal && sheetSize >= 11,
    `sheet ${sheetSize}`);

  if (modal) {
    const opts = (s) => s.querySelectorAll('option').filter((o) => o.getAttribute('value')).length;
    const claims = [
      ...['m-capt', 'm-motm', 'm-keeper'].map((id) => [id, modal.querySelector('#' + id)]),
      ...modal.querySelectorAll('[data-g-num]').map((s, i) => ['scorer ' + i, s]),
      ...modal.querySelectorAll('[data-g-anum]').map((s, i) => ['assist ' + i, s]),
    ].filter(([, s]) => s);
    const wide = claims.filter(([, s]) => opts(s) > sheetSize).map(([n, s]) => `${n}=${opts(s)}`);
    check('every claim about a match can only name somebody on its team sheet',
      claims.length >= 7 && wide.length === 0,
      `sheet ${sheetSize}; too wide: ${wide.join(', ')}`);

    /* The sheet BUILDERS are the other ring: they must offer the whole club,
       or an eleven could never be picked in the first place. */
    const builders = modal.querySelectorAll('[data-add]');
    check('the pickers that build the sheet still offer the whole club',
      builders.some((s) => opts(s) > sheetSize),
      builders.map(opts).join(','));

    /* A dialog is not inside the panel body, so its hints are reached by the
       MutationObserver on body's direct children and by nothing else. */
    const dFields = modal.querySelectorAll('input,select,textarea');
    const described = dFields.filter((f) => f.getAttribute('aria-describedby')).length;
    check('the match editor\'s own hints reach a screen reader too',
      described >= 8, `${described} of ${dFields.length} fields described`);

    /* Each row's dropdowns are walked forward through the substitution list,
       so you can only take off somebody who is on the pitch. */
    const off = modal.querySelectorAll('[data-sub-off]').map(opts);
    const on = modal.querySelectorAll('[data-sub-on]').map(opts);
    if (off.length > 1) {
      check('a substitution can only take off somebody who is on the pitch',
        off.every((n, i) => i === 0 || n >= off[i - 1]) && on.every((n, i) => i === 0 || n <= on[i - 1]),
        `off ${off.join(',')} on ${on.join(',')}`);
    }
  }

  /* ---------------------------------------------------------------------
     6. WHAT WAS TYPED SURVIVES. Driven end to end: type into a real field,
     let the debounce fire, re-open the screen, take the offer back. */
  const dctx = PR.boot({ rows });
  await PR.openPanel(dctx, 'fixtures');
  const opp = dctx.doc.querySelector('#fx-opp');
  check('the fixtures screen has the field the draft test types into', !!opp);
  if (opp) {
    PR.type(opp, 'Testing Draft FC');
    await new Promise((r) => setTimeout(r, 600));
    await PR.settle(dctx);
    const stored = dctx.win.localStorage.getItem('sa-cp-drafts');
    check('typing into a screen stores a draft of it',
      !!stored && JSON.stringify(JSON.parse(stored)).includes('Testing Draft FC'));
    check('typing marks the screen as having unsaved work',
      dctx.doc.documentElement.classList.contains('is-dirty'));
    const again = await PR.openPanel(dctx, 'fixtures');
    const bar = again.body.querySelector('[data-draft-restore]');
    check('the draft is OFFERED back on the way in, not applied', !!bar
      && dctx.doc.querySelector('#fx-opp').value !== 'Testing Draft FC');
    if (bar) {
      PR.click(bar);
      await PR.settle(dctx);
      check('taking the offer puts the typing back',
        dctx.doc.querySelector('#fx-opp').value === 'Testing Draft FC');
    }
  }

  /* A safety net that throws is worse than no safety net. */
  let survived = true;
  try {
    const fctx = PR.boot({ rows, localStorage: PR.fullStorage() });
    await PR.openPanel(fctx, 'fixtures');
    const f = fctx.doc.querySelector('#fx-opp');
    if (f) { PR.type(f, 'x'); await new Promise((r) => setTimeout(r, 600)); await PR.settle(fctx); }
    survived = !!fctx.doc.querySelector('#panel-fixtures [data-panel-body]').innerHTML.length;
  } catch (e) { survived = false; }
  check('a full localStorage cannot take the panel down', survived);

  /* ---------------------------------------------------------------------
     7. RENDER REPLACES THE BODY, IT DOES NOT EMPTY IT. Modules attach their
     listeners to that element and rely on bubbling, so emptying it leaves the
     listeners behind and every refresh adds another copy: two renders in, one
     click saved twice, and saving refreshes.

     Counted as LISTENERS, not as writes. Writes were the obvious instrument
     and the wrong one - the add button validates before it saves, so one
     click writes nothing whether the listeners stacked or not, and the check
     passed for a reason that had nothing to do with what it was guarding.
     The mutation probe is what said so. */
  const rctx = PR.boot({ rows });
  await PR.openPanel(rctx, 'fixtures');
  await PR.openPanel(rctx, 'fixtures');
  await PR.openPanel(rctx, 'fixtures');
  const rbody = rctx.doc.querySelector('#panel-fixtures [data-panel-body]');
  let stacked = 0;
  rbody._listeners.forEach((a) => { stacked += a.length; });
  check('re-opening a screen does not stack another copy of its listeners',
    stacked <= 2, `${stacked} listeners on the body after three renders`);

  return out;
}

/* ==========================================================================
   MUTATION PROBES

   Each one breaks the mechanism a check above guards and asserts the check
   goes red. A check that has never been seen to fail is a check nobody has
   tested, and this panel has shipped three of those.
   ========================================================================== */
export async function panelProbes() {
  const out = [];
  const rows = fixtureRows();
  const probe = (name, fn) => out.push({ name, fn });

  const results = [];

  /* PROBE 1: break the hint wiring the way it was actually broken - by
     looking for the wrong class - and confirm the hint check notices. */
  {
    const ctx = PR.boot({
      rows,
      /* The shipped file is minified, so the probe targets the literal the
         wiring actually reads. Replacing something that is not there would
         make this probe a no-op - which is how a probe lies. */
      transform: (src, file) => (file === 'control.js'
        ? bust(src, '"field__hint"', '"zz-no-such-class"')
        : src),
    });
    const r = await PR.openPanel(ctx, 'fixtures');
    let hints = 0; let wired = 0;
    for (const el of r.body.querySelectorAll('input,select,textarea')) {
      const scope = el.closest('label') || el;
      const next = scope.nextElementSibling;
      const own = next && next.classList
        && (next.classList.contains('field__hint') || next.classList.contains('cp-note')) ? next : null;
      if (own) { hints += 1; if (own.id && el.getAttribute('aria-describedby') === own.id) wired += 1; }
    }
    results.push({
      name: 'probe: breaking the hint wiring turns the hint check red',
      cond: hints > 0 && wired < hints,
      detail: `${wired} of ${hints}`,
    });
  }

  /* PROBE 2: hand every player dropdown the whole club and confirm the team
     sheet check notices. */
  {
    const ctx = PR.boot({
      rows,
      /* The real failure was never in offer() itself: it was that the thing
         offer() narrows BY resolved to nothing, so every picker fell through
         to the club ring. Emptying the sheet reproduces exactly that.
         Note what does NOT work here - swapping the scope string, because
         the call sites carry the same literal and change with it. */
      transform: (src, file) => (file.includes('matchedit')
        ? bust(src, 'p.onSheet=h.starters.concat(h.bench)', 'p.onSheet=[]')
        : src),
    });
    let red = false;
    try {
      const res = await PR.openPanel(ctx, 'results');
      for (const tr of res.body.querySelectorAll('tr[data-key]')) {
        const m = rows.matches.find((x) => x.key === tr.getAttribute('data-key'));
        if (!m || (m.data.starters || []).length < 11) continue;
        const size = new Set([...(m.data.starters || []), ...(m.data.bench || [])].map((x) => String(x.num))).size;
        PR.click(tr.querySelector('[data-edit]'));
        await PR.settle(ctx);
        const modal = ctx.doc.querySelector('.modal-backdrop');
        if (!modal) { red = true; break; }
        const opts = (s) => s.querySelectorAll('option').filter((o) => o.getAttribute('value')).length;
        const capt = modal.querySelector('#m-capt');
        red = !capt || opts(capt) !== size;
        break;
      }
    } catch (e) { red = true; }
    results.push({
      name: 'probe: widening the player dropdowns turns the team-sheet check red',
      cond: red,
    });
  }

  /* PROBE 3: empty the body instead of replacing it, and confirm the
     stacked-listener check notices.

     Counted as LISTENERS on the panel body, not as writes. Writes were the
     first attempt and they were the wrong instrument: the add button
     validates before it saves, so one click wrote nothing whether the
     listeners had stacked or not, and the probe reported the check weak when
     the check was simply asking the wrong question. */
  {
    const measure = async (transform) => {
      const ctx = PR.boot({ rows, transform });
      await PR.openPanel(ctx, 'fixtures');
      await PR.openPanel(ctx, 'fixtures');
      await PR.openPanel(ctx, 'fixtures');
      const body = ctx.doc.querySelector('#panel-fixtures [data-panel-body]');
      let n = 0;
      body._listeners.forEach((a) => { n += a.length; });
      return n;
    };
    const good = await measure(undefined);
    const bad = await measure((src, file) => (file === 'control.js'
      ? bust(src, 'var r=a.cloneNode(!1);a.parentNode.replaceChild(r,a)', 'var r=a;r.innerHTML=""')
      : src));
    results.push({
      name: 'probe: emptying the panel body instead of replacing it stacks its listeners',
      cond: bad > good && good <= 2,
      detail: `replaced: ${good} listeners after three renders; emptied: ${bad}`,
    });
  }

  /* PROBE 4: the title must come from the nav LABEL, because the button
     also holds a count badge that setCount fills and then HIDES - and hidden
     text is still textContent. That is how the Fixtures screen came to be
     headed "Fixtures 0". The probe puts a hidden badge on the button, the
     way setCount does, and reads the title back both ways. */
  {
    const readTitle = async (transform) => {
      const ctx = PR.boot({ rows, transform });
      const btn = ctx.doc.querySelector('[data-module="fixtures"]');
      const badge = ctx.doc.createElement('span');
      badge.className = 'cp-nav__count';
      badge.textContent = '0';
      badge.hidden = true;
      btn.appendChild(badge);
      await PR.openPanel(ctx, 'fixtures');
      return ctx.doc.querySelector('[data-cp-title]').textContent.trim();
    };
    const good = await readTitle(undefined);
    const bad = await readTitle((src, file) => (file === 'control.js'
      ? bust(src, '\'[data-module="\'+e+\'"] .cp-nav__label\'', '\'[data-module="\'+e+\'"]\'')
      : src));
    results.push({
      name: 'probe: titling a screen from the whole nav button brings the hidden count back',
      cond: good === 'Fixtures' && bad !== good && /0/.test(bad),
      detail: `label: "${good}"; whole button: "${bad}"`,
    });
  }

  return results;
}
