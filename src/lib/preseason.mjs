/* ==========================================================================
   PRE-SEASON, AND THE SEASON AHEAD

   Two derivations the site had no way to express. The club is in the gap
   between winning League Ten and starting League Eight: six friendlies, one
   played, a new division whose clubs are known, and nothing on the site
   that says any of it.

   Both are DERIVED. Nothing here is typed: which matches are pre-season, what
   the record across them is, who has scored, who is making a first
   appearance, whether pre-season is over, and what the club already knows
   about each new opponent all come out of the match records.

   The one thing that cannot be derived is who is IN the new division, because
   a club list is not a match record. It is carried in
   src/data/league-eight-2627.json with the FA Full-Time ids it was read from,
   so the next person to check it does not have to find the division again.

   That file is also the only place a club can be dropped. Tyne & Thames were
   in it and are not in the division, and nothing here could have noticed:
   every figure on this page is derived from matches, and a club the club has
   never played contributes no match to derive from. A name in a list is the
   one kind of fact the site has to be told.
   ========================================================================== */
import { isFriendly } from './stats.mjs';

/* The opponent-naming rule lives in club-name.mjs, dependency-free, because
   stats.mjs needs the same reduction and this file already imports stats.mjs.
   Re-exported here so every existing importer keeps working. */
export { clubIdentity, clubBase, sameClub, relatedClub } from './club-name.mjs';
import { clubIdentity, clubBase, sameClub, relatedClub } from './club-name.mjs';

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
     is never asked and cannot disagree.

     AND A MATCH BEFORE SOMEBODY SIGNED IS NOT THEIRS. A team sheet stores a
     record slot, not a person, and slots get handed on: Leon Burnett signed
     in July 2026 and the slot he holds was also used against Brockwell
     Violets in October 2025, so this counted him as capped and left him out
     of the list on the band announcing him. `d.signedOn` is the club's own
     statement of when somebody joined, and it is the only thing that can
     settle which of two people a slot meant. */
  const signed = (num) => (d.signedOn ? d.signedOn(num) : null);
  const before = new Set();
  for (const m of d.played || []) {
    if (String(m.iso || '') >= String((played[0] || {}).iso || '9999')) continue;
    for (const num of sheetNums(m)) {
      const on = signed(num);
      if (on && String(m.iso || '') < String(on)) continue;
      before.add(String(num));
    }
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
   The clubs of the new division, and what the archive already holds on
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
