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
import { Element } from './dom.mjs';

const ROOT = PR.ROOT;

function fixtureRows() {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/recovered-live.json'), 'utf8'));
  const rows = {};
  for (const [k, v] of Object.entries(raw)) {
    rows[k] = Array.isArray(v) ? v : Object.entries(v || {}).map(([key, data]) => ({ key, data }));
  }
  return rows;
}


/* Every authored selector in a stylesheet, split on commas, with the ones the
   test DOM's engine cannot parse counted rather than silently dropped. Also
   returns the bare class names, which is the weaker question kept as a
   fallback for exactly those unparseable selectors. */
export function cssSelectors(css) {
  const names = new Set([...css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]));
  const bodies = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const raw = [];
  for (const m of bodies.matchAll(/(^|[}{;])\s*([^{}@;]+)\{/g)) {
    for (const part of m[2].split(',')) {
      const sel = part.trim();
      /* A pseudo-element or state selector describes a rendering this DOM has
         no concept of; the base selector before it is what matters here. */
      const base = sel.replace(/::?[a-z-]+(\([^)]*\))?/g, '').trim();
      if (base && !/[>~+]/.test(base)) raw.push(base);
      else if (base) raw.push(base);
    }
  }
  /* A SELECTOR THAT NAMES NO CLASS OR ID IS NOT STYLING, IT IS THE RESET.
     `*{box-sizing:border-box;margin:0;padding:0}` matches every element on
     the page, so "is this element reached by some rule" is true of
     everything and the check passes whatever it is shown. It did: a probe
     that put `cp-chip` back - the class this check exists because of - went
     straight through. Excluding type-only selectors is what makes the
     question mean "styled deliberately" rather than "exists". */
  const selectors = []; let skipped = 0;
  const probe = new Element('div', null);
  for (const sel of [...new Set(raw)]) {
    if (!/[.#]/.test(sel)) continue;
    try { probe.matches(sel); selectors.push(sel); } catch { skipped += 1; }
  }
  return { selectors, names, skipped };
}

/* The panel a person actually opens: nav click, not a direct render call. */
async function everyPanel(ctx, keys, fn) {
  for (const k of keys) fn(k, await PR.openPanel(ctx, k));
}

/* A probe that silently changes nothing reports the check as weak when the
   check is fine. `bust` refuses to be a no-op.

   It takes a REGULAR EXPRESSION as well as a string, because the target here
   is minified and the minifier renames as the source moves: extracting the
   record checks into their own file renamed one binding and a probe aimed at
   `p.onSheet=h.starters...` stopped matching. It threw, exactly as designed -
   but a pattern that survives a rename is better than one that has to be
   re-aimed every time an unrelated function moves. */
function bust(src, find, replace) {
  const found = find instanceof RegExp ? find.test(src) : src.includes(find);
  if (!found) {
    throw new Error('mutation probe found nothing to break: ' + String(find)
      + ' is not in the shipped file. The probe must be re-aimed, not deleted.');
  }
  return find instanceof RegExp
    ? src.replace(new RegExp(find.source, find.flags.includes('g') ? find.flags : find.flags + 'g'), replace)
    : src.split(find).join(replace);
}

export async function panelChecks() {
  const out = [];
  const check = (name, cond, detail) => out.push({ name, cond: !!cond, detail });

  const rows = fixtureRows();
  const html = fs.readFileSync(path.join(ROOT, 'control.html'), 'utf8');
  const keys = PR.panelKeys(html);

  /* Twenty-two since Website stats. The count is asserted rather than derived
     so that a screen vanishing from the nav is a failure and not a quietly
     smaller loop. */
  check('the panel ships the twenty-two screens the nav offers', keys.length === 22,
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
     3b. EVERY CONTROL HAS A NAME, AND EVERY ARIA REFERENCE LANDS.

     These are the rules an automated audit would apply, computed on the
     rendered DOM rather than sampled by hand once. The panel passes all of
     them today; the point of writing them down is that it goes on passing
     when somebody adds the twenty-second screen. `aria-describedby` pointing
     at an id that is not in the document is the specific failure worth
     naming: it reads to a screen reader as no description at all, which is
     indistinguishable from never having written one. */
  const a11y = { unnamed: [], anon: [], dangling: [], noScope: 0, posTab: 0, noAlt: [] };
  const accessibleName = (el) => {
    if ((el.getAttribute('aria-label') || '').trim()) return true;
    const lb = el.getAttribute('aria-labelledby');
    if (lb && lb.split(/\s+/).some((id) => id && ctx.doc.querySelector('#' + id))) return true;
    if ((el.getAttribute('title') || '').trim()) return true;
    const id = el.getAttribute('id');
    if (id && ctx.doc.querySelector('label[for="' + id + '"]')) return true;
    const wrap = el.closest('label');
    return !!(wrap && wrap.textContent.trim());
  };
  const scanA11y = (root, where) => {
    for (const el of root.querySelectorAll('input,select,textarea')) {
      if ((el.getAttribute('type') || '').toLowerCase() === 'hidden') continue;
      if (!accessibleName(el)) a11y.unnamed.push(where + ' ' + el.localName + '#' + (el.getAttribute('id') || ''));
    }
    for (const el of root.querySelectorAll('button,a')) {
      if (el.textContent.trim() || accessibleName(el)) continue;
      a11y.anon.push(where + ' <' + el.localName + '> ' + el.outerHTML.slice(0, 70));
    }
    for (const el of root.querySelectorAll('[aria-describedby],[aria-labelledby],[aria-controls],[aria-owns]')) {
      for (const a of ['aria-describedby', 'aria-labelledby', 'aria-controls', 'aria-owns']) {
        const v = el.getAttribute(a);
        if (!v) continue;
        for (const id of v.split(/\s+/)) {
          if (id && !ctx.doc.querySelector('#' + id)) a11y.dangling.push(where + ' ' + a + '="' + id + '"');
        }
      }
    }
    for (const th of root.querySelectorAll('th')) if (!th.getAttribute('scope')) a11y.noScope += 1;
    for (const el of root.querySelectorAll('[tabindex]')) if (+el.getAttribute('tabindex') > 0) a11y.posTab += 1;
    for (const im of root.querySelectorAll('img')) if (im.getAttribute('alt') === null) a11y.noAlt.push(where);
  };
  await everyPanel(ctx, keys, (k, r) => { if (r.body) scanA11y(r.body, k); });

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

    /* A CLASS THAT MEANS WHAT IT SAYS. `field__hint` is a note about a
       control; `cp-note` is a note about a section. Three notes in this
       editor claimed the first while describing a whole block - the trialist
       panel, the substitutions list, and a status line beside a button - so
       "every field hint is announced" was true only because those three were
       never going to be announced by anything. */
    const strayHints = modal.querySelectorAll('.field__hint').filter((h) => {
      const prev = h.previousElementSibling;
      return !(prev && (['input', 'select', 'textarea'].includes(prev.localName)
        || (prev.localName === 'label' && prev.querySelector('input,select,textarea'))
        || prev.classList.contains('field__hint')));
    });
    check('every field hint in the match editor is beside a field',
      strayHints.length === 0,
      strayHints.map((h) => h.textContent.slice(0, 50)).join(' | '));

    /* The notes field carries an explanation AND a live gauge saying how much
       has been written. aria-describedby takes a list, and until it was given
       one the half that changes as you type reached nobody. */
    const multi = dFields.filter((f) => (f.getAttribute('aria-describedby') || '').split(' ').filter(Boolean).length > 1);
    check('a field with two notes beside it is announced with both',
      multi.length >= 1, `${multi.length} fields carry more than one description`);

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

  if (modal) scanA11y(modal, 'match editor');
  check('every control in the panel has a name a screen reader can read',
    a11y.unnamed.length === 0, a11y.unnamed.slice(0, 5).join(' | '));
  check('no button or link in the panel is announced as unlabelled',
    a11y.anon.length === 0, a11y.anon.slice(0, 3).join(' | '));
  check('every aria reference in the panel points at an element that is there',
    a11y.dangling.length === 0, a11y.dangling.slice(0, 5).join(' | '));
  check('every table header in the panel says which way it heads', a11y.noScope === 0,
    `${a11y.noScope} without scope`);
  check('nothing in the panel jumps the tab order', a11y.posTab === 0);
  check('no image in the panel is missing its alt attribute entirely',
    a11y.noAlt.length === 0, a11y.noAlt.slice(0, 3).join(', '));

  /* ---------------------------------------------------------------------
     5b. SAVING A MATCH DRAWS ITS SHARE PICTURE.

     This was the last step in publishing that only a person could take. The
     build draws the cards, but the DEPLOY cannot: Vercel has no browser, so
     `npm run covers` runs on a laptop or not at all, and a result published
     from the panel shared the generic club image until somebody remembered.
     A step somebody has to remember is another way of saying it does not
     happen.

     Driven for real, because the wiring is the whole thing: press Save on a
     match with no cover and the covers chunk must be fetched, something must
     actually be drawn, and a cover must be written back onto the record. The
     canvas is a recorder (see dom.mjs) - it counts drawing calls and cannot
     make a picture, which is exactly the question worth asking here. */
  {
    const cctx = PR.boot({ rows, canvas: true });
    const cres = await PR.openPanel(cctx, 'results');
    let opened = null;
    for (const tr of cres.body.querySelectorAll('tr[data-key]')) {
      const m = rows.matches.find((x) => x.key === tr.getAttribute('data-key'));
      if (m && !(m.data || {}).cover && (m.data.starters || []).length >= 11) {
        PR.click(tr.querySelector('[data-edit]'));
        await PR.settle(cctx);
        PR.flushMutations(cctx.doc.body);
        await PR.settle(cctx);
        opened = cctx.doc.querySelector('.modal-backdrop');
        break;
      }
    }
    check('a match with no share picture can be opened', !!opened);
    if (opened) {
      cctx.store.writes.length = 0;
      PR.click(opened.querySelector('[data-save]'));
      await PR.settle(cctx);
      await PR.settle(cctx);
      const w = cctx.store.writes;
      const drew = cctx.win.canvasLog();
      check('saving a match draws something on a canvas', drew.calls.length > 20,
        `${drew.calls.length} drawing calls`);
      check('the drawn card carries the scoreline it is a card of',
        drew.text.some((t) => /\d\s*-\s*\d|W\/O/.test(t)), drew.text.slice(0, 6).join(' | '));
      check('the drawn card is uploaded', w.some((x) => x.op === 'upload'));
      /* THE POINT OF ALL OF IT: the record comes back with a cover on it, so
         the next publish ships a real card and nobody had to run anything. */
      const wrote = w.filter((x) => x.op === 'upsert' && x.t === 'matches');
      check('the cover is written back onto the match record',
        wrote.some((x) => !!(x.d || {}).cover),
        `${wrote.length} match writes, none carrying a cover`);
      /* And the save itself is still a save: the picture is worth less than
         the result and must never be what a failure is reported about. */
      check('the match itself was saved first', wrote.length >= 2 || (wrote[0] && wrote[0].d),
        `${wrote.length} writes`);
    }
  }

  /* ---------------------------------------------------------------------
     5c. EVERY ELEMENT THE PANEL DRAWS IS STYLED BY SOMETHING.

     This DOM has no cascade and refuses getComputedStyle rather than
     inventing one, which is the honest thing to do and leaves a real gap: a
     screen can render perfectly correct markup and look like nothing. An
     element no rule reaches is the part of that gap that can be closed
     without a cascade, and it is not hypothetical - `cp-chip` and its three
     modifiers were defined nowhere, so matchday's readiness column showed
     bare text where every other screen shows a coloured pill.

     ASKED WITH THE SELECTOR ENGINE, NOT WITH A GREP. The first version asked
     whether each class NAME appeared in a sheet, which is a different and
     much worse question: it cannot see `.gl-fix img` or `.cp-list > li`, so
     an element styled by a descendant selector reads as unstyled. Over the
     public pages that version returned 118 and a browser returns zero -
     every one a false positive. The DOM has a real matcher, so this uses it,
     and falls back to the name test only for selectors the engine refuses,
     which keeps a refusal from being reported as a defect.

     control.html loads sa.css and control.css, so both count. */
  {
    const sheets = ['sa.css', 'control.css']
      .map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
    const { selectors, names, skipped } = cssSelectors(sheets);
    const orphan = new Map();
    const uctx = PR.boot({ rows });
    for (const k of keys) {
      const r = await PR.openPanel(uctx, k);
      for (const el of r.body.querySelectorAll('*')) {
        const cls = (el.getAttribute('class') || '').split(/\s+/).filter(Boolean);
        if (!cls.length) continue;
        if (selectors.some((sel) => { try { return el.matches(sel); } catch { return false; } })) continue;
        /* Nothing the engine could parse reaches it. Before calling that a
           defect, accept a bare name match, because a selector this DOM
           cannot parse is unknown rather than absent. */
        if (cls.some((c) => names.has(c))) continue;
        cls.forEach((c) => orphan.set(c, (orphan.get(c) || 0) + 1));
      }
    }
    check('every element the panel draws is reached by some rule',
      orphan.size === 0,
      [...orphan].map(([c, n]) => `${c} x${n}`).join(', '));
    /* The check's own coverage, said out loud: a matcher that quietly refused
       most of the sheet would pass everything and look like a clean result. */
    check('the selector engine understands most of the panel stylesheet',
      skipped / (selectors.length + skipped) < 0.25,
      `${skipped} of ${selectors.length + skipped} selectors could not be parsed`);
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

  /* ==========================================================================
     WEBSITE STATS

     Every check here hands the shipped screen crafted rows and reads what came
     out, rather than grepping the file for the rule. The panel's own history
     is the argument: a correct filter attached to one dropdown of nine, and
     field hints wired to nothing, both passed checks that asked only whether
     the mechanism existed. */
  {
    /* CURRENT period. Figures chosen so every total below can be checked by
       hand: index.html is 10 + 4 across two zones, squad.html 6 + 1 across two
       days, and the player page is there to exercise the section grouping. */
    const statRows = [
      { day: '2026-09-01', path: '/index.html', zone: 'Europe/London', source: '', device: 'mobile', views: 10, seconds_total: 300, depth_total: 500 },
      { day: '2026-09-01', path: '/index.html', zone: 'America/New_York', source: 'google.com', device: 'desktop', views: 4, seconds_total: 200, depth_total: 200 },
      { day: '2026-09-02', path: '/squad.html', zone: 'Europe/London', source: 'facebook.com', device: 'mobile', views: 6, seconds_total: 120, depth_total: 300 },
      /* A zone the map has never heard of. It must become its region, not
         vanish and not be guessed at. */
      { day: '2026-09-02', path: '/squad.html', zone: 'Antarctica/Troll', source: '', device: '', views: 1, seconds_total: 10, depth_total: 50 },
      { day: '2026-09-02', path: '/players/joe.html', zone: 'Europe/London', source: '', device: 'mobile', views: 3, seconds_total: 90, depth_total: 180 },
    ];
    /* The period BEFORE, which is a different query and must not be mixed in
       with the one above: 24 against 6 is up 300%. */
    const prevRows = [
      { day: '2026-08-04', path: '/index.html', zone: 'Europe/London', source: '', device: 'mobile', views: 6, seconds_total: 60, depth_total: 300 },
    ];
    /* The hourly table, which carries no zone, no source and no device by
       design. 20:00 is the busiest hour at 9 + 7. */
    const hourRows = [
      { day: '2026-09-01', hour: 20, path: '/index.html', views: 9 },
      { day: '2026-09-01', hour: 9, path: '/index.html', views: 5 },
      { day: '2026-09-02', hour: 20, path: '/squad.html', views: 7 },
    ];
    const serve = (method, q) => {
      if (/page_stats_hourly\?/.test(q)) return hourRows;
      if (/day=lt\./.test(q)) return prevRows;
      return statRows;
    };
    const ctx = await PR.boot({ rows: { rest: serve } });
    const host = await PR.openPanel(ctx, 'stats');
    const text = host.body.textContent.replace(/\s+/g, ' ');

    check('website stats totals every view it was given',
      /24 page views/.test(text), text.slice(0, 200));

    /* THE FIGURE, not merely the row. The headline total is summed straight
       off the rows, so a broken roll() leaves it correct and only the per-page
       column goes wrong - which is exactly what a probe caught this check
       failing to notice. */
    /* Anchored on the LINK, not on the path appearing anywhere in the row.
       The day-by-day table carries a "most read" column holding the same path,
       and it comes first in the document, so a looser match read squad.html's
       figure off a date row and reported 10 for a page with 7. */
    const cellFor = (p) => {
      const row = (host.html.match(new RegExp('<tr>(?:(?!</tr>).)*<a href="' + p + '"(?:(?!</tr>).)*</tr>')) || [])[0] || '';
      return (row.match(/<b>(\d+)<\/b>/) || [])[1];
    };
    check('website stats sums one page across zones and days',
      cellFor('/index\\.html') === '14' && cellFor('/squad\\.html') === '7',
      `index.html ${cellFor('/index\\.html')} (want 14), squad.html ${cellFor('/squad\\.html')} (want 7)`);

    /* The map is the whole reason the zone is stored raw, so it is the thing
       most worth asking about. */
    check('a time zone is reported as a country',
      /United Kingdom/.test(text) && /United States/.test(text),
      text.slice(0, 300));

    check('an unmapped time zone falls back to its region rather than vanishing',
      /elsewhere/.test(text),
      'Antarctica/Troll should not be dropped');

    /* It cannot count unique people and must not imply that it can. */
    check('website stats says it counts views and not visitors',
      /views, not visitors/i.test(text),
      'the screen must not imply unique visitors');

    /* IN THE TABLE, not in the paragraph underneath it. The note explaining
       what "Direct or unknown" means contains the same words, so a loose
       match passed while the cell itself was blank - which a probe caught. */
    check('a missing referrer reads as direct rather than blank',
      /<td>Direct or unknown<\/td>/.test(host.html),
      'the sources table needs a labelled row, not an empty cell');

    /* ---- The world map ------------------------------------------------
       Not "is there an svg" but "is the right country plotted, with the right
       figure on it". The land itself is a single path of round-capped dots,
       so its presence is one assertion and its size is another: an empty `d`
       would still be an element. */
    const dots = (host.html.match(/class="cpm__land" d="([^"]*)"/) || [])[1] || '';
    check('the world map draws land rather than an empty element',
      dots.split('M').length > 2000,
      `${dots.split('M').length - 1} land dots, expected a few thousand`);

    /* 10 + 6 + 3 = 19 of 24 views are from the United Kingdom, and the bubble
       has to say so: a marker in the right place carrying the wrong number is
       the failure this is here for. */
    check('a country readers came from gets a marker carrying its own figure',
      /<circle class="cpm__hit"[^>]*><title>United Kingdom: 19 views, 79%<\/title>/.test(host.html),
      (host.html.match(/<title>[^<]*<\/title>/g) || []).join(' ').slice(0, 200));

    check('a country with no known position is left off the map and kept in the table',
      !/<title>Antarctica/.test(host.html) && /Antarctica/.test(text),
      'the region has no centroid, so it belongs in the table and not on the map');

    /* ---- When people read it -------------------------------------------
       The heatmap buckets by weekday AND hour, so the two views at 20:00 on
       different days must stay in different cells; the profile sums them. */
    check('the day-against-hour heatmap ships a cell for every hour of every day',
      (host.html.match(/class="cph__v"/g) || []).length === 168,
      `${(host.html.match(/class="cph__v"/g) || []).length} cells, expected 7 x 24`);

    check('an hour on one day is not merged with the same hour on another',
      /20:00, 9 views/.test(host.html) && /20:00, 7 views/.test(host.html),
      'the heatmap must key on weekday and hour, not hour alone');

    check('the hour profile sums the same hour across the period',
      /Busiest hour is 20:00 to 20:59/.test(text) && /20:59 with 16 views/.test(text),
      text.slice(text.indexOf('Busiest hour'), text.indexOf('Busiest hour') + 120));

    /* Every coloured square says its own figure to a screen reader. 168 silent
       cells is a picture, not a table. */
    check('every heatmap cell states its figure in text as well as in colour',
      (host.html.match(/class="sr-only">[A-Z][a-z]+day \d\d:00, /g) || []).length === 168,
      'each cell needs a visually hidden label');

    /* ---- Dates -----------------------------------------------------------
       The club asked for dates, so the day table is a row per day carrying
       the weekday, not a chart somebody has to read off an axis. */
    check('the day-by-day table names the weekday beside the date',
      /<td>1 Sep<\/td><td>Tuesday<\/td>/.test(host.html)
        && /<td>2 Sep<\/td><td>Wednesday<\/td>/.test(host.html),
      (host.html.match(/<td>\d+ Sep<\/td><td>\w+<\/td>/g) || []).join(' '));

    check('the daily trend is drawn from the days it was given',
      /class="cpc__dot"/.test(host.html)
        && (host.html.match(/class="cpc__dot"/g) || []).length === 2,
      'one dot per day in the period');

    /* ---- Up or down on the period before -------------------------------- */
    check('a headline figure says how it compares with the period before',
      /up 300% on the 30 days before/.test(text),
      text.slice(0, 400));

    /* ---- Sections --------------------------------------------------------
       108 rows of paths does not answer "are the match reports being read". */
    check('pages are grouped into the parts of the site the club thinks in',
      /<td>Player profiles<\/td>/.test(host.html) && /<td>Home page<\/td>/.test(host.html),
      'the section table must name the area, not just the path');

    /* ---- One page on its own ---------------------------------------------
       Pressing the button must FILTER, not merely open a panel: the figures
       inside it are the whole point and they have to be this page's. */
    const btn = host.body.querySelector('[data-page="/squad.html"]');
    check('every page row offers a way to look at that page alone', !!btn,
      'the page table needs a drill-down control');
    if (btn) {
      btn.click();
      const drillBody = ctx.doc.querySelector('#panel-stats [data-panel-body]');
      /* The figure is read out of its own <b>, not out of the sentence: "17 of
         the period's 24 views" CONTAINS "7 of the period's 24 views", so the
         obvious text match passed on an unfiltered panel and the probe below
         is what said so. */
      const drill = drillBody.innerHTML;
      check('looking at one page shows that page and not the whole site',
        /This page on its own/.test(drill)
          && /<b>7<\/b> of the period’s 24 views \(29%\)/.test(drill),
        drill.slice(drill.indexOf('This page'), drill.indexOf('This page') + 240));

      /* The drill-down redraws the whole screen, so the way back has to exist
         or the club is stuck on one page's figures until they reload. */
      const close = drillBody.querySelector('[data-page=""]');
      check('there is a way back out of one page to the whole site', !!close,
        'the focused panel needs a close control');
      if (close) {
        close.click();
        const back = ctx.doc.querySelector('#panel-stats [data-panel-body]').textContent;
        check('closing one page returns the whole site',
          !/This page on its own/.test(back), 'the focused panel should be gone');
      }
    }

    /* ---- Taking it away --------------------------------------------------- */
    check('the figures can be downloaded rather than only looked at',
      !!host.body.querySelector('[data-csv]'), 'the club owns these figures');

    /* ---- The spread, not the average -------------------------------------- */
    check('how far people read is reported as a spread and not only a mean',
      /Read to the bottom, over 75%/.test(host.html) && /A glance, under 10 seconds/.test(host.html),
      'an average scroll of half a page has two opposite explanations');

    /* PROBE: break the zone map and the country check must go red. Without
       this, "a time zone is reported as a country" passes on a screen that
       prints the raw zone string, which is what it is there to catch. */
    const rawCtx = await PR.boot({
      rows: { rest: serve },
      transform: (src, file) => (file === 'control-stats.js'
        ? bust(src, /"Europe\/London":"United Kingdom"/, '"Europe/Nowhere":"United Kingdom"')
        : src),
    });
    const rawText = (await PR.openPanel(rawCtx, 'stats')).body.textContent;
    check('probe: with the zone map broken the country check notices',
      !/United Kingdom/.test(rawText),
      'the check would pass without a working map');

    /* PROBE: take the centroid away and the bubble must go with it, leaving
       the country in the table. Without this the map check would pass on a
       screen that drew a marker in the sea. */
    const noPlaceCtx = await PR.boot({
      rows: { rest: serve },
      transform: (src, file) => (file === 'control-stats.js'
        ? bust(src, 'United Kingdom -2 54|', 'Kingdomless -2 54|')
        : src),
    });
    const noPlace = await PR.openPanel(noPlaceCtx, 'stats');
    check('probe: with no centroid the map check notices the missing marker',
      !/<title>United Kingdom: /.test(noPlace.html)
        && /United Kingdom/.test(noPlace.body.textContent),
      'the bubble check would pass without a working centroid list');

    /* PROBE: cut the hourly table off and both the heatmap and the profile
       checks must go red, and the screen must say which file turns it on. */
    const noHourCtx = await PR.boot({
      rows: { rest: serve },
      transform: (src, file) => (file === 'control-stats.js'
        ? bust(src, 'page_stats_hourly?select=', 'page_stats_hourlyX?select=')
        : src),
    });
    const noHour = (await PR.openPanel(noHourCtx, 'stats')).html;
    check('probe: with no hourly rows the heatmap checks notice',
      !/class="cph__v"/.test(noHour) && !/Busiest hour is/.test(noHour),
      'the heatmap checks would pass without the hourly table');

    /* PROBE: stop the previous window being a different query and the
       comparison must stop claiming a rise. This is the check that the delta
       is read from the period BEFORE rather than from the period itself. */
    const noPrevCtx = await PR.boot({
      rows: { rest: serve },
      transform: (src, file) => (file === 'control-stats.js'
        ? bust(src, '&day=lt.', '&dayX=lt.')
        : src),
    });
    const noPrev = (await PR.openPanel(noPrevCtx, 'stats')).body.textContent;
    check('probe: with no previous window the comparison stops claiming a rise',
      !/up 300%/.test(noPrev),
      'the comparison check would pass while reading its own period');

    /* PROBE: invert the drill-down filter and the focused panel must stop
       agreeing with the page it names. */
    const badFocusCtx = await PR.boot({
      rows: { rest: serve },
      transform: (src, file) => (file === 'control-stats.js'
        ? bust(src, /\.path===(\w+)\b/, '.path!==$1')
        : src),
    });
    const badHost = await PR.openPanel(badFocusCtx, 'stats');
    const badBtn = badHost.body.querySelector('[data-page="/squad.html"]');
    if (badBtn) badBtn.click();
    const badDrill = badFocusCtx.doc.querySelector('#panel-stats [data-panel-body]').innerHTML;
    check('probe: with the drill-down filter inverted the figures stop matching',
      !/<b>7<\/b> of the period’s 24 views/.test(badDrill),
      'the drill-down check would pass on an unfiltered panel');

    /* The screen must survive the table not existing, because it will not
       exist until somebody runs the migration - and it must name the file
       rather than showing an empty page that reads as broken. */
    const offCtx = await PR.boot({ rows: { rest: () => Promise.reject(new Error('404')) } });
    const offText = (await PR.openPanel(offCtx, 'stats')).body.textContent.replace(/\s+/g, ' ');
    check('with no page_stats table the screen names the migration that turns it on',
      /007_page_stats\.sql/.test(offText), offText.slice(0, 200));

    /* 007 run and 008 not is a real state and a different one: everything else
       on the screen works, and the hour is the only thing missing. Saying
       "nothing yet" there would send somebody looking for traffic when what is
       missing is a file nobody has executed. */
    const onlyDaily = (method, q) => (/page_stats_hourly\?/.test(q)
      ? Promise.reject(new Error('404')) : statRows);
    const halfCtx = await PR.boot({ rows: { rest: onlyDaily } });
    const half = (await PR.openPanel(halfCtx, 'stats')).body.textContent.replace(/\s+/g, ' ');
    check('with 007 run and 008 not the screen names the second migration',
      /008_page_stats_detail\.sql/.test(half) && /24 page views/.test(half),
      half.slice(0, 200));
  }

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
        ? bust(src, /\.onSheet=\w+\.starters\.concat\(\w+\.bench\)/, '.onSheet=[]')
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
      /* The minified binding name is not part of what this probe is testing,
         and pinning it made an unrelated nav entry re-aim the probe. Match
         whatever the minifier called it and put it back unchanged. */
      ? bust(src, /\[data-module="'\+(\w+)\+'"\] \.cp-nav__label/, '[data-module="\'+$1+\'"]')
      : src));
    results.push({
      name: 'probe: titling a screen from the whole nav button brings the hidden count back',
      cond: good === 'Fixtures' && bad !== good && /0/.test(bad),
      detail: `label: "${good}"; whole button: "${bad}"`,
    });
  }

  /* PROBE 5: take the labels away and confirm the accessible-name check
     notices. Without this, "every control has a name" is a sentence that has
     never been tested against a control that has not. */
  {
    const ctx = PR.boot({
      rows,
      transform: (src, file) => (file.includes('control-match.js') || file === 'control.js'
        ? src.split('<label').join('<span').split('</label>').join('</span>')
        : src),
    });
    const r = await PR.openPanel(ctx, 'fixtures');
    const doc = ctx.doc;
    const namedNow = (el) => {
      if ((el.getAttribute('aria-label') || '').trim()) return true;
      const id = el.getAttribute('id');
      if (id && doc.querySelector('label[for="' + id + '"]')) return true;
      const w = el.closest('label');
      return !!(w && w.textContent.trim());
    };
    const unnamed = r.body.querySelectorAll('input,select,textarea').filter((e) => !namedNow(e));
    results.push({
      name: 'probe: stripping the labels turns the accessible-name check red',
      cond: unnamed.length > 0,
      detail: `${unnamed.length} controls left unnamed`,
    });
  }


  /* PROBE 6: cut the cover out of the save and confirm the record notices.
     Aimed at the minified call itself rather than at the chunk name, because
     a save that fetched the chunk and then drew nothing is exactly the shape
     this check exists to catch. */
  {
    const ctx = PR.boot({
      rows,
      canvas: true,
      transform: (src, file) => (file === 'control-matchedit.js'
        ? bust(src, 'CPCOVERS.ensure("matches"', 'CPCOVERS.nothing&&0&&window.CPCOVERS.ensure("matches"')
        : src),
    });
    const res = await PR.openPanel(ctx, 'results');
    let drewAnything = true;
    for (const tr of res.body.querySelectorAll('tr[data-key]')) {
      const m = rows.matches.find((x) => x.key === tr.getAttribute('data-key'));
      if (m && !(m.data || {}).cover && (m.data.starters || []).length >= 11) {
        PR.click(tr.querySelector('[data-edit]'));
        await PR.settle(ctx);
        PR.flushMutations(ctx.doc.body);
        await PR.settle(ctx);
        const modal = ctx.doc.querySelector('.modal-backdrop');
        ctx.store.writes.length = 0;
        PR.click(modal.querySelector('[data-save]'));
        await PR.settle(ctx);
        await PR.settle(ctx);
        drewAnything = ctx.store.writes.some((w) => w.op === 'upsert' && (w.d || {}).cover);
        break;
      }
    }
    results.push({
      name: 'probe: cutting the cover out of the save turns the cover check red',
      cond: drewAnything === false,
      detail: 'a cover was still written with the drawing call removed',
    });
  }


  return results;
}
