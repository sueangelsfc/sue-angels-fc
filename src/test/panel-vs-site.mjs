/* Do the site and the panel give the same answer about a squad status?
   They are two implementations of one rule, in two languages' worth of style,
   and nothing forces them to agree. Run both over the same records and
   compare every answer. */
import fs from 'node:fs';
import vm from 'node:vm';
import * as SITE from '../lib/squad-status.mjs';
import { seasonOf } from '../lib/stats.mjs';

const SEASONS = ['23/24', '24/25', '25/26', '26/27'];
const CURRENT = '26/27';

/* Load the panel's copies by evaluating its module with the globals it
   expects, then reaching in for the functions. */
const src = fs.readFileSync(
  new URL('../admin/lazy/30-squad.js', import.meta.url), 'utf8');

const captured = {};
const sandbox = {
  window: {
    CP: { readAll: () => Promise.resolve([]) },
    CPM: {},
    CPU: new Proxy({}, { get: () => () => {} }),
    SA_SEED: {
      seasons: SEASONS,
      currentSeason: CURRENT,
      squad: [],
      statuses: {
        set: SITE.SET_STATUSES.map((x) => ({ key: x.key, label: x.label, playing: x.playing, hint: x.hint })),
        derived: SITE.DERIVED_STATUSES.map((x) => ({ key: x.key, label: x.label })),
      },
    },
  },
  document: { createElement: () => ({ style: {}, classList: { add() {} } }) },
  console,
  __capture: (o) => Object.assign(captured, o),
};
sandbox.globalThis = sandbox;

/* Expose the panel's internals at the end of its IIFE. */
const tail = '__capture({ statusIn: statusIn, tenureIn: tenureIn, isPlaying: isPlaying, '
  + 'statusDetail: statusDetail, signedOn: signedOn, seasonOfDate: seasonOfDate });\n})();';
const at = src.lastIndexOf('})();');
const patched = src.slice(0, at) + tail;

vm.createContext(sandbox);
new vm.Script(patched).runInContext(sandbox);

if (!captured.statusIn) {
  /* The harness reaches into the panel's IIFE by appending a capture call. If
     the module's tail ever changes shape this stops working, and a silent
     pass would be worse than useless: it would report agreement it never
     measured. */
  throw new Error('panel-vs-site: could not reach the panel internals');
}

/* Every shape either side can be handed. */
const RECORDS = [
  { '23/24': 'active', '24/25': 'active', '25/26': 'active', '26/27': 'active' },
  { '26/27': 'active' },
  { '25/26': 'active', '26/27': 'active' },
  { '23/24': 'active', '24/25': 'departed', '26/27': 'active' },
  { '25/26': 'active', '26/27': 'departed' },
  { '25/26': 'active', '26/27': 'retired' },
  { '25/26': 'active', '26/27': 'injured' },
  { '25/26': 'active', '26/27': 'trial' },
  { '25/26': 'active', '26/27': 'staff' },
  { '25/26': 'active', '26/27': 'away' },
  { '26/27': { key: 'active', from: '2026-07-12' } },
  /* THE SHAPE THE CLUB ACTUALLY WROTE, and the one this file did not cover:
     In the squad for 25/26 as well AND a 2026 signing date. It is a
     reasonable thing to record on a screen with a season tab, and it is the
     record that made the site say "new" while the panel said "retained" -
     statusIn honoured the date on both sides, and the panel's `wasHere`,
     which is what tenure is worked out from, did not. Every record here was
     a shape somebody imagined; this one is a shape somebody typed. */
  { '25/26': { key: 'active', from: '2026-08-01' }, '26/27': { key: 'active', from: '2026-07-01' } },
  { '25/26': 'active', '26/27': { key: 'active', from: '2026-07-01' } },
  { '25/26': { key: 'departed', from: '2026-06-14', to: 'Barnes Stormers' } },
  { '25/26': 'new' },        // a retired key that must collapse
  { '25/26': 'retained' },
  { '25/26': 'returned' },
];

let compared = 0;
const diffs = [];
RECORDS.forEach((rec, i) => {
  const siteRec = SITE.readStatusRecord({ 7: rec });
  const panelMap = { 7: rec };
  /* `seasonOf` HAS TO BE HERE or the comparison is rigged. dataset.mjs passes
     it, and statusIn's signing-date gate is written `opts.seasonOf && ...` -
     so leaving it out silently disabled the gate on the SITE side while the
     panel applied it, and the differential reported a disagreement that only
     the harness had. A harness that does not build the options the product
     builds is testing something nobody ships. */
  const opts = { seasons: SEASONS, latestSeason: CURRENT, seasonOf,
    /* FAITHFUL TO dataset.mjs, which is lenient for the latest season and
       strict before it: nothing competitive has been played in 26/27, so
       absence of evidence is not evidence of absence there. `() => false`
       was strict everywhere, which is not what the site does. */
    wasHere: (num, season) => season === CURRENT };

  for (const season of SEASONS) {
    const a = SITE.statusIn(siteRec, 7, season, opts);
    const b = captured.statusIn(panelMap, 7, season);
    compared += 1;
    /* THE PANEL MODELS "ABSENT" NOW, so this no longer excuses anything.
       It used to: the site answers "absent" for a season with no entry and no
       appearance, the panel answered "active", and the difference was waved
       through as something the panel "deliberately does not model". That
       excusal was hiding a real disagreement by the end - Christopher
       Fernandes, stored as the flat word "returned", read "Retained" on this
       screen and "New signing" on the website. The panel is seeded with the
       same archive the site derives from, so it can give the same answer. */
    const same = a === b;
    if (!same) diffs.push(`record ${i} ${season}: site ${a}, panel ${b}`);

    const ta = SITE.tenureIn(siteRec, 7, season, opts);
    const tb = captured.tenureIn(panelMap, 7, season);
    compared += 1;
    if (ta !== tb) {
      diffs.push(`record ${i} ${season} tenure: site ${ta}, panel ${tb}`);
    }

    const da = JSON.stringify(SITE.statusDetail(siteRec, 7, season));
    const db = JSON.stringify(captured.statusDetail(panelMap, 7, season));
    compared += 1;
    if (da !== db) diffs.push(`record ${i} ${season} detail: site ${da}, panel ${db}`);
  }
});

/* THE SIGNING DATE IS A THIRD PAIR OF COPIES. The panel needs it to explain
   the badge it shows and the site needs it to decide whether a team sheet from
   an earlier season belongs to this player, so the rule exists twice again.
   Both are run over the same records here, for the same reason the ordering
   rule is: a panel that disagrees with what gets published is worse than a
   panel that says nothing. */
RECORDS.forEach((rec, i) => {
  const siteRec = SITE.readStatusRecord({ 7: rec });
  const a = SITE.signedOn(siteRec, 7);
  const b = captured.signedOn({ 7: rec }, 7) || null;
  compared += 1;
  if (a !== b) diffs.push(`record ${i} signedOn: site ${a}, panel ${b}`);
});

/* And the season a date falls in, which each derives for itself. June starts
   the next season, so the boundary is where this goes wrong if it goes wrong
   at all. */
for (const iso of ['2026-05-31', '2026-06-01', '2026-07-12', '2025-12-31',
  '2026-01-01', '2025-06-01', '2027-05-31']) {
  const a = seasonOf(iso);
  const b = captured.seasonOfDate(iso);
  compared += 1;
  if (a !== b) diffs.push(`seasonOf ${iso}: site ${a}, panel ${b}`);
}

/* ==========================================================================
   AND OVER THE CLUB'S OWN RECORDS

   Everything above is fifteen record shapes somebody sat down and imagined,
   and they all agreed while two real players did not. Leon Burnett is stored
   as In the squad for 25/26 AND 26/27 with a 2026 signing date; Christopher
   Fernandes is stored as the single flat word "returned". Neither shape was
   in the list, and both read "Retained" on the Squad screen while the website
   published "New signing".

   So the same two implementations are run over the roster as it actually is.
   Invented shapes find the cases you thought of; the real record finds the
   ones you did not.
   ========================================================================== */
let realCompared = 0;
const realDiffs = [];
try {
  const snap = JSON.parse(fs.readFileSync(
    new URL('../data/recovered-live.json', import.meta.url), 'utf8'));
  const statusRow = (snap.player_photos || []).find((r) => r.key === 'roster:status');
  const rawStatus = (statusRow && statusRow.data && (statusRow.data.status || statusRow.data)) || {};
  const { buildDataset } = await import('../lib/dataset.mjs');
  const d = buildDataset();
  const REAL_SEASONS = (d.seasons || []).map((x) => x.name || x);

  /* The panel is re-evaluated with the SHIPPED seed, because its answers lean
     on SEED.namedIn and SEED.clubSeason and a stub would not exercise them. */
  const seedSrc = fs.readFileSync(new URL('../../control-seed.js', import.meta.url), 'utf8');
  const seed = JSON.parse(seedSrc.replace(/^window\.SA_SEED=/, '').replace(/;\s*$/, ''));
  const cap2 = {};
  const sb2 = {
    window: { CP: { readAll: () => Promise.resolve([]) }, CPM: {},
      CPU: new Proxy({}, { get: () => () => {} }),
      SA_SEED: Object.assign({}, seed, { clubSeason: d.latestSeason }) },
    document: { createElement: () => ({ style: {}, classList: { add() {} } }) },
    console,
    __capture: (o) => Object.assign(cap2, o),
  };
  sb2.globalThis = sb2;
  vm.createContext(sb2);
  new vm.Script(src.slice(0, at) + tail).runInContext(sb2);
  if (!cap2.statusIn) throw new Error('could not reach the panel internals with the real seed');

  for (const p of d.squad) {
    for (const season of REAL_SEASONS) {
      realCompared += 1;
      const a = d.statusIn(p.num, season);
      const b = cap2.statusIn(rawStatus, p.num, season);
      if (a !== b) realDiffs.push(`${p.name} ${season} status: site ${a}, panel ${b}`);
    }
  }
} catch (e) {
  realDiffs.push(`real-record comparison could not run: ${e.message}`);
}

export const result = { compared, diffs, realCompared, realDiffs };

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`compared ${compared} answers across ${RECORDS.length} record shapes`);
  console.log(`disagreements: ${diffs.length}`);
  diffs.slice(0, 12).forEach((d) => console.log('  ', d));
  if (diffs.length) process.exitCode = 1;
}
