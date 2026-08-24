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
  const opts = { seasons: SEASONS, latestSeason: CURRENT, wasHere: () => false };

  for (const season of SEASONS) {
    const a = SITE.statusIn(siteRec, 7, season, opts);
    const b = captured.statusIn(panelMap, 7, season);
    compared += 1;
    /* The site answers "absent" where the panel answers "active": the site
       knows a season with no entry and no appearance means not at the club,
       which the panel deliberately does not model. Treated as agreement. */
    const same = a === b || (a === 'absent' && b === 'active');
    if (!same) diffs.push(`record ${i} ${season}: site ${a}, panel ${b}`);

    const ta = SITE.tenureIn(siteRec, 7, season, opts);
    const tb = captured.tenureIn(panelMap, 7, season);
    compared += 1;
    if (ta !== tb && !(a === 'absent' && b === 'active')) {
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

export const result = { compared, diffs };

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`compared ${compared} answers across ${RECORDS.length} record shapes`);
  console.log(`disagreements: ${diffs.length}`);
  diffs.slice(0, 12).forEach((d) => console.log('  ', d));
  if (diffs.length) process.exitCode = 1;
}
