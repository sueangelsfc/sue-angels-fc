/* ==========================================================================
   PRE-SEASON, AND THE SEASON AHEAD

   Two derivations the site had no way to express. The club is in the gap
   between winning League Ten and starting League Eight: six friendlies, one
   played, a new division whose ten clubs are known, and nothing on the site
   that says any of it.

   Both are DERIVED. Nothing here is typed: which matches are pre-season, what
   the record across them is, who has scored, who is making a first
   appearance, whether pre-season is over, and what the club already knows
   about each new opponent all come out of the match records.

   The one thing that cannot be derived is the day League Eight begins,
   because no league fixture has been published. It is carried in
   src/data/season-2627.json with its source, and the page says "the season
   starts" rather than "we play", because a start date is not a fixture.
   ========================================================================== */
import { isFriendly } from './stats.mjs';

/* ---- Naming an opponent, carefully ---------------------------------------
   A club's LEGAL suffix is noise and its TEAM QUALIFIER is not.

   League Eight contains "Pure Football FC 1st Team". The club beat "Pure
   Football FC 2.0" in a friendly eight days ago. Reduce both far enough and
   they are the same string, and the site would then publish a record of
   played 3, won 3 against a side it has never met. That is worse than saying
   nothing: it is a specific false claim about a specific opponent, on the one
   page a new opponent is most likely to read.

   So the suffix comes off and the qualifier stays on. Two clubs match only if
   what is left is equal. Where the BASE matches but the qualifier does not,
   that is recorded as a related side and said out loud. */
const LEGAL = /\b(fc|afc|a\.f\.c|f\.c|football club|club)\b/gi;
const squash = (s) => String(s || '').toLowerCase().replace(/[’']/g, '')
  .replace(LEGAL, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

const QUALIFIER = /\b(1st|2nd|3rd|4th|first|second|third|reserves?|res|[abc]|\d+\s*0|sunday|sundays|saturday|vets|veterans|youth|dev|development)\b/g;

export const clubIdentity = (name) => squash(name).replace(/\s+/g, ' ');
export const clubBase = (name) => squash(name).replace(QUALIFIER, ' ')
  .replace(/\bteam\b/g, ' ').replace(/\s+/g, ' ').trim();

/* Exactly the same club and side. */
export const sameClub = (a, b) => !!clubIdentity(a) && clubIdentity(a) === clubIdentity(b);
/* The same club, a different side of it. */
export const relatedClub = (a, b) => !sameClub(a, b)
  && !!clubBase(a) && clubBase(a) === clubBase(b);

/* ---- The record across a set of matches -----------------------------------
   Walkovers carry no goals, exactly as every other figure on the site counts
   them, so a pre-season record cannot disagree with the way a league record
   is read. */
export function recordOf(matches) {
  const r = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, cleanSheets: 0 };
  for (const m of matches) {
    r.p += 1;
    if (m.outcome === 'W') r.w += 1;
    else if (m.outcome === 'D') r.d += 1;
    else if (m.outcome === 'L') r.l += 1;
    if (m.countsGoals) {
      r.gf += Number(m.ourGoals) || 0;
      r.ga += Number(m.theirGoals) || 0;
      if (!Number(m.theirGoals)) r.cleanSheets += 1;
    }
  }
  return r;
}

/* ---- Pre-season ---------------------------------------------------------- */
export function preseasonFor(d, season) {
  const target = season || d.latestSeason;
  const inSeason = (d.played || []).filter((m) => m.season === target);
  const played = inSeason.filter(isFriendly)
    .slice().sort((a, b) => String(a.iso || '').localeCompare(String(b.iso || '')));
  const competitive = inSeason.filter((m) => !isFriendly(m));

  /* Still to come, friendly only, from the fixtures the build already worked
     out are ahead of today. `d.upcoming` is derived once in dataset.mjs and
     read here rather than re-sorted, so this cannot disagree with the card at
     the top of the home page about which match is next. */
  const toCome = (d.upcoming || []).filter((f) => {
    const label = String(f.competition || f.label || '');
    return /friendly|pre.?season/i.test(label);
  });

  const record = recordOf(played);

  /* Who has scored, from the goal records rather than from a list. */
  const goals = new Map();
  for (const m of played) {
    if (!m.countsGoals) continue;
    for (const g of (m.detail && m.detail.goals) || []) {
      const num = String(g.num != null ? g.num : g.player || '');
      if (!num) continue;
      goals.set(num, (goals.get(num) || 0) + 1);
    }
  }
  const byNum = new Map((d.players || []).map((p) => [String(p.num), p]));
  const scorers = [...goals.entries()]
    .map(([num, n]) => ({ num, n, player: byNum.get(num) }))
    .filter((x) => x.player)
    .sort((a, b) => b.n - a.n || a.player.name.localeCompare(b.player.name));

  /* A FIRST APPEARANCE, worked out from the archive rather than announced.
     Anybody named in a pre-season team sheet who appears in no earlier match
     record is playing his first game for the club, friendly or not. The panel
     is never asked and cannot disagree. */
  const before = new Set();
  for (const m of d.played || []) {
    if (String(m.iso || '') >= String((played[0] || {}).iso || '9999')) continue;
    for (const num of sheetNums(m)) before.add(String(num));
  }
  const seen = new Set();
  const debutants = [];
  for (const m of played) {
    for (const num of sheetNums(m)) {
      const k = String(num);
      if (before.has(k) || seen.has(k)) continue;
      seen.add(k);
      const p = byNum.get(k);
      if (p) debutants.push(p);
    }
  }

  return {
    season: target,
    division: d.divisionOf ? d.divisionOf(target) : '',
    played,
    toCome,
    total: played.length + toCome.length,
    record,
    scorers,
    debutants,
    /* PRE-SEASON IS OVER WHEN A COMPETITIVE MATCH HAS BEEN PLAYED, which is
       evidence rather than a date. A band that had to be switched off by hand
       would still be calling September's league football "pre-season" in
       October. */
    isOver: competitive.length > 0,
    competitivePlayed: competitive.length,
  };
}

/* Every shirt number named on a team sheet, starters and bench alike. */
export function sheetNums(m) {
  const dt = (m && m.detail) || {};
  const out = [];
  for (const key of ['starters', 'lineup', 'bench', 'subs']) {
    for (const x of dt[key] || []) {
      const num = x && typeof x === 'object' ? (x.num != null ? x.num : x.player) : x;
      if (num != null && num !== '') out.push(num);
    }
  }
  return out;
}

/* ---- The season ahead ----------------------------------------------------
   The ten clubs of the new division, and what the archive already holds on
   each. Two thirds of them the club has never met, and saying so plainly is
   the point: it is a promotion, and most of the division is new. */
export function seasonAhead(d) {
  const nt = d.nextDivisionTable || {};
  const all = (nt.clubs || []).filter((c) => !sameClub(c, 'Sue’s Angels FC')
    && !/sue.?s angels/i.test(String(c)));

  const clubs = all.map((name) => {
    const exact = (d.played || []).filter((m) => sameClub(m.opponent, name));
    const related = (d.played || []).filter((m) => relatedClub(m.opponent, name));
    const met = exact.length > 0;
    const list = met ? exact : [];
    const last = list.slice().sort((a, b) =>
      String(b.iso || '').localeCompare(String(a.iso || '')))[0] || null;
    return {
      name,
      met,
      record: recordOf(list),
      last,
      /* Named, not merged. "We have played their other side" is a true and
         useful thing to say; folding it into a head-to-head is not. */
      relatedCount: related.length,
      relatedName: related.length ? related[0].opponent : '',
    };
  }).sort((a, b) => Number(b.met) - Number(a.met) || a.name.localeCompare(b.name));

  return {
    season: nt.season || d.nextSeason,
    division: nt.division || (d.divisionOf ? d.divisionOf(d.latestSeason) : ''),
    started: !!nt.started,
    clubs,
    met: clubs.filter((c) => c.met).length,
    fresh: clubs.filter((c) => !c.met).length,
  };
}
