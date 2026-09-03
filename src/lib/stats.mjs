/* ==========================================================================
   DERIVED STATISTICS ENGINE
   Every published number is computed here from match records. Nothing is
   hard-coded on a page, so two pages can never disagree about the same fact.

   THIS FILE IS SERVER-SIDE. The header used to say it was shared verbatim
   with the browser "which is why it is dependency-free", and that has not
   been true for some time: nothing shipped to a page imports it, the public
   scripts filter the DOM against markup the generator already wrote, and
   where the panel needs one of these rules it carries its own copy which
   panel-vs-site.mjs reconciles against this one. A comment forbidding an
   import for a reason that no longer holds is a comment that makes somebody
   duplicate a rule instead.
   ========================================================================== */
import { cameOn as subsCameOn } from './subs.mjs';
import { clubIdentity } from './club-name.mjs';
import { isPlaying } from './squad-status.mjs';

export const US = "Sue's Angels FC";
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
export const isUs = (name) => {
  const n = norm(name);
  return n.includes('suesangels') || n === 'sueangels';
};

/* Accents are folded to their base letter BEFORE the non-alphanumeric sweep.
   Without that step "Frazier-Isaías" lost the í entirely and published as
   frazier-isa-as-osunkoya, which is a mangled URL for the club's top scorer.
   NFD splits a letter from its combining mark so the mark alone can go. */
export const slugify = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/* ---- Dates ------------------------------------------------------------
   Stored dates look like "31 May 26" or "05 Jun 2026". Parse to ISO so
   sorting and schema.org output are unambiguous. */
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

export function parseDate(str) {
  if (!str) return null;
  const m = String(str).trim().match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{2,4})$/);
  if (!m) {
    const d = new Date(str);
    return Number.isNaN(+d) ? null : d;
  }
  const day = +m[1];
  const mon = MONTHS[m[2].toLowerCase()];
  let year = +m[3];
  if (year < 100) year += 2000;
  if (mon === undefined) return null;
  return new Date(Date.UTC(year, mon, day, 11, 0, 0));
}

export const toISO = (str) => {
  const d = parseDate(str);
  return d ? d.toISOString().slice(0, 10) : null;
};

export function isoDateTime(dateStr, kick) {
  const d = parseDate(dateStr);
  if (!d) return null;
  const [h, min] = String(kick || '11:00').split(':').map(Number);
  d.setUTCHours(Number.isFinite(h) ? h : 11, Number.isFinite(min) ? min : 0, 0, 0);
  return d.toISOString();
}

export function fmtDate(str, opts = {}) {
  const d = parseDate(str);
  if (!d) return str || '';
  return d.toLocaleDateString('en-GB', {
    weekday: opts.weekday ? 'short' : undefined,
    day: 'numeric',
    month: opts.long ? 'long' : 'short',
    year: opts.year === false ? undefined : 'numeric',
    timeZone: 'UTC',
  });
}

/* A season runs Sep-May, so Jul-Aug belongs to the season about to start.
   THE CLUB SETS THIS BOUNDARY AND IT IS 1 JULY: anything from 1 July 2026 is
   26/27. It read `m >= 5`, which put the whole of June in the season ahead.
   No match on the record is dated in June, so nothing moved when this was
   corrected - which is exactly why it was worth correcting now rather than
   discovering it on the first June friendly, when it would have filed a
   match under the wrong season and taken a player's tenure with it. */
export function seasonOf(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return null;
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const start = m >= 6 ? y : y - 1; // July onwards starts the next season
  return `${String(start).slice(2)}/${String(start + 1).slice(2)}`;
}

/* ---- Match normalisation ----------------------------------------------
   Three kinds of completed match exist in the records, and they count
   differently. Getting this wrong is what made a derived league table
   disagree with the published one:

     score     played; goals count toward GF/GA
     walkover  played and awarded to us; 3 points, but NO goals are added,
               which is exactly how the official table treats them
     penalty   played; hs/as is the NORMAL-TIME score (a draw), and the tie
               was settled on penalties. The shootout result is not stored,
               so no winner is inferred.
*/
/* ==========================================================================
   A FRIENDLY IS NOT A COMPETITIVE MATCH

   Pre-season friendlies stand on their own. They are real games, they get a
   report and a page and a place in the results list, and they count towards
   nothing: not the club's played-won-drawn-lost, not a player's goals or
   appearances, not a club record, not form.

   The reason is that they are not comparable. A friendly is arranged to give
   minutes to whoever needs them, the opposition may be two divisions away,
   and rolling substitutions mean a team sheet is not an eleven. Adding one to
   a league season's figures makes every one of them mean slightly less, and a
   pre-season goal against a side the club will never be drawn against is not
   the same thing as one in League Eight.

   Named off the competition rather than a flag on the record, because that is
   what the club actually types and there is nowhere else it would be kept in
   step. Anything calling itself a friendly is one; everything else, league or
   cup, is competitive.
   ========================================================================== */
export const isFriendly = (m) => /friendly|friendlies/i.test(String(m?.competition || ''));
export const isCompetitive = (m) => !isFriendly(m);

/* ==========================================================================
   IS THIS A LEAGUE MATCH, which is not the same question as "is this League
   Ten".

   Fifteen filters across the site asked `m.competition === CLUB.division`,
   with CLUB.division typed into a constants file as 'League Ten'. That is
   correct until 6 September 2026 and wrong from the first whistle of League
   Eight: every league figure on the site would quietly start counting last
   season's division, and "promoted to League Eight" would read as something
   still to come for as long as the club exists.

   It is the same fault the hard-coded seasons had, and the same fix. The
   question those filters are actually asking is whether a match was a league
   match rather than a cup tie, so that is what they ask now, and the answer
   does not care what the league is called this year or next.

   Named off the competition, because that is what the club types and there is
   nowhere else it would be kept in step. A cup names itself. ========================================================================== */
const CUP_WORD = /\b(cup|trophy|shield|plate|vase|bowl)\b/i;
export const isCup = (m) => !isFriendly(m) && CUP_WORD.test(String(m?.competition || ''));
export const isLeague = (m) => !isFriendly(m) && !CUP_WORD.test(String(m?.competition || ''));

export function normaliseMatch(raw, detail) {
  const home = raw.home || '';
  const away = raw.away || '';
  const weAreHome = isUs(home);
  const opponent = weAreHome ? away : home;
  const hs = Number(raw.hs);
  const as = Number(raw.as);
  const kind = raw.kind || 'fixture';
  const hasScore = Number.isFinite(hs) && Number.isFinite(as);

  const isWalkover = kind === 'walkover';
  const isPenalty = kind === 'penalty';
  const played = isWalkover || (hasScore && (kind === 'score' || isPenalty));

  // Walkovers contribute no goals, so they must not touch GF/GA.
  const countsGoals = played && hasScore && !isWalkover;
  const ourGoals = countsGoals ? (weAreHome ? hs : as) : 0;
  const theirGoals = countsGoals ? (weAreHome ? as : hs) : 0;

  let outcome = null;
  if (isWalkover) {
    /* `wo` says which side the tie was awarded to: H-W the home club, A-W the
       away club. It is the record's own field, already carried by all three
       stored walkovers, and it is what the control panel writes when somebody
       picks a club from the "awarded to" list.

       It replaces reading the outcome out of the match report, which could
       only ever produce a win: a walkover AGAINST the club would have been
       recorded as a match with no result at all, silently missing from the
       played column. Three points hung on the phrasing of a sentence. */
    const wo = String(raw.wo || '').trim().toUpperCase();
    if (wo === 'H-W') outcome = weAreHome ? 'W' : 'L';
    else if (wo === 'A-W') outcome = weAreHome ? 'L' : 'W';
    else {
      // Older records carry no `wo`. Fall back to the report's wording rather
      // than assuming, and leave it unset if the wording does not say.
      const said = String(detail?.commentary || '');
      outcome = /awarded a walkover/i.test(said) && /Sue.s Angels/i.test(said) ? 'W' : null;
    }
  } else if (countsGoals) {
    outcome = ourGoals > theirGoals ? 'W' : ourGoals === theirGoals ? 'D' : 'L';
  }

  /* TWO scorelines, because they answer different questions and swapping them
     silently inverts a result.

     `scoreline` is the match as the fixture list writes it: home goals first.
     It is correct ONLY where the two clubs are shown in home-away order
     beside it, as on the results and league pages.

     `ourScoreline` is the match from the club's point of view. Anywhere the
     opponent is named as "v Watford" with no venue beside it, this is the one
     to print: fifteen of the club's thirty matches were away, so the fixture
     form read backwards on every one of them. The biggest win in the club's
     history was showing as "0-12" on the records page. */
  const scoreline = isWalkover ? 'W/O' : hasScore ? `${hs}-${as}` : null;
  const ourScoreline = isWalkover ? 'W/O' : countsGoals ? `${ourGoals}-${theirGoals}` : null;
  const homeAway = weAreHome ? 'Home' : 'Away';

  return {
    id: raw.id,
    slug: raw.id,
    date: raw.date,
    iso: toISO(raw.date),
    isoDateTime: isoDateTime(raw.date, raw.kick),
    kick: raw.kick || detail?.kick || '',
    home, away, hs, as,
    played,
    kind,
    isWalkover,
    decidedOnPenalties: isPenalty,
    countsGoals,
    competition: raw.competition || 'League Ten',
    /* Worked out once, here, so a page filtering matches never has to know
       how a friendly is spelled. */
    friendly: isFriendly({ competition: raw.competition || 'League Ten' }),
    venue: raw.venue || detail?.venue || '',
    season: seasonOf(raw.date),
    weAreHome,
    opponent,
    opponentSlug: slugify(opponent),
    ourGoals, theirGoals,
    outcome,
    scoreline,
    ourScoreline,
    homeAway,
    detail: detail || null,
    title: isWalkover
      ? `${home} v ${away} (walkover)`
      : hasScore && played
        ? `${home} ${hs}-${as} ${away}`
        : `${home} v ${away}`,
    resultNote: isWalkover
      ? (outcome === 'L' ? 'Conceded as a walkover' : 'Awarded as a walkover')
      : isPenalty
        ? 'Decided on penalties'
        : null,
  };
}

/* ---- Team summary ----------------------------------------------------- */
export function teamSummary(matches) {
  const played = matches.filter((m) => m.played);
  const s = {
    played: played.length, won: 0, drawn: 0, lost: 0,
    goalsFor: 0, goalsAgainst: 0, cleanSheets: 0, failedToScore: 0,
    walkovers: 0, onGoalRecord: 0,
  };
  for (const m of played) {
    if (m.outcome === 'W') s.won++;
    else if (m.outcome === 'D') s.drawn++;
    else if (m.outcome === 'L') s.lost++;
    if (m.isWalkover) s.walkovers++;
    // Walkovers add no goals, so per-goal averages are taken over the
    // matches that actually have a goal record.
    if (!m.countsGoals) continue;
    s.onGoalRecord++;
    s.goalsFor += m.ourGoals;
    s.goalsAgainst += m.theirGoals;
    if (m.theirGoals === 0) s.cleanSheets++;
    if (m.ourGoals === 0) s.failedToScore++;
  }
  s.points = s.won * 3 + s.drawn;
  s.goalDifference = s.goalsFor - s.goalsAgainst;
  s.winPct = s.played ? Math.round((s.won / s.played) * 100) : 0;
  s.pointsPerGame = s.played ? (s.points / s.played).toFixed(2) : '0.00';
  s.goalsPerGame = s.onGoalRecord ? (s.goalsFor / s.onGoalRecord).toFixed(2) : '0.00';
  s.concededPerGame = s.onGoalRecord ? (s.goalsAgainst / s.onGoalRecord).toFixed(2) : '0.00';
  return s;
}

/* Most recent first, capped. */
export function formGuide(matches, n = 6) {
  return matches
    .filter((m) => m.played)
    .slice()
    .sort((a, b) => (b.iso || '').localeCompare(a.iso || ''))
    .slice(0, n)
    .map((m) => ({ outcome: m.outcome, id: m.id, label: m.title, scoreline: m.scoreline, opponent: m.opponent }));
}

export function homeAwaySplit(matches) {
  const build = (list) => teamSummary(list);
  return {
    home: build(matches.filter((m) => m.weAreHome)),
    away: build(matches.filter((m) => !m.weAreHome)),
  };
}

export function byCompetition(matches) {
  const out = new Map();
  for (const m of matches) {
    if (!out.has(m.competition)) out.set(m.competition, []);
    out.get(m.competition).push(m);
  }
  return [...out.entries()]
    .map(([competition, list]) => ({ competition, ...teamSummary(list), matches: list.length }))
    .sort((a, b) => b.played - a.played);
}

/* Margin records only make sense for matches with a real scoreline, so
   walkovers are excluded rather than counted as a 0-0 win. */
export function biggestWin(matches) {
  return matches
    .filter((m) => m.outcome === 'W' && m.countsGoals)
    .slice()
    .sort((a, b) => (b.ourGoals - b.theirGoals) - (a.ourGoals - a.theirGoals) || b.ourGoals - a.ourGoals)[0] || null;
}

export function heaviestDefeat(matches) {
  return matches
    .filter((m) => m.outcome === 'L' && m.countsGoals)
    .slice()
    .sort((a, b) => (b.theirGoals - b.ourGoals) - (a.theirGoals - a.ourGoals))[0] || null;
}

/* ---- Streaks ----------------------------------------------------------
   longestRun answers "how many", which is enough for a headline figure and
   not enough for a record: a record has to say WHEN, or a reader cannot check
   it. This returns the span as well, and also reports whether the streak was
   still running at the end of the record, because "eighteen and counting" and
   "eighteen, ended in April" are different claims.

   `scope` narrows to one competition so a league-only streak can be stated as
   such. A walkover has no goal record, so any goal-based streak has to skip
   it rather than break on it: treating a missing scoreline as "conceded"
   would have cut the clean-sheet run in half. */
export function longestStreak(matches, predicate, opts = {}) {
  let ordered = matches.filter((m) => m.played);
  if (opts.competition) ordered = ordered.filter((m) => m.competition === opts.competition);
  if (opts.season) ordered = ordered.filter((m) => m.season === opts.season);
  if (opts.goalRecordOnly) ordered = ordered.filter((m) => m.countsGoals);
  ordered = ordered.slice().sort((a, b) => (a.iso || '').localeCompare(b.iso || ''));

  let best = { length: 0, from: null, to: null, matches: [] };
  let cur = [];
  for (const m of ordered) {
    if (predicate(m)) {
      cur.push(m);
      if (cur.length > best.length) {
        best = { length: cur.length, from: cur[0], to: cur[cur.length - 1], matches: cur.slice() };
      }
    } else cur = [];
  }
  // Still running if the streak reaches the last match in scope.
  best.live = Boolean(best.to && ordered.length && best.to === ordered[ordered.length - 1]);
  best.of = ordered.length;
  best.perfect = best.length > 0 && best.length === ordered.length;
  return best;
}

/* The same idea for one player's own sequence of appearances. */
export function playerStreak(player, matches, predicate) {
  const byId = new Map(matches.filter((m) => m.played).map((m) => [m.id, m]));
  const involved = (player.matches || [])
    .map((r) => ({ ...r, m: byId.get(r.id) }))
    .filter((r) => r.m)
    .sort((a, b) => (a.m.iso || '').localeCompare(b.m.iso || ''));
  let best = { length: 0, from: null, to: null };
  let cur = [];
  for (const r of involved) {
    if (predicate(r)) {
      cur.push(r);
      if (cur.length > best.length) best = { length: cur.length, from: cur[0].m, to: cur[cur.length - 1].m };
    } else cur = [];
  }
  return best;
}

export function longestRun(matches, predicate, opts = {}) {
  let ordered = matches.filter((m) => m.played);
  // A clean-sheet run cannot be judged on a walkover, which has no goal
  // record; skipping those keeps the run continuous instead of breaking it.
  if (opts.goalRecordOnly) ordered = ordered.filter((m) => m.countsGoals);
  ordered = ordered.slice().sort((a, b) => (a.iso || '').localeCompare(b.iso || ''));
  let best = 0, cur = 0;
  for (const m of ordered) {
    if (predicate(m)) { cur++; best = Math.max(best, cur); } else cur = 0;
  }
  return best;
}

/* ---- Player statistics -----------------------------------------------
   Appearances, starts, goals, assists, cards, clean sheets and MOTM all come
   from the match detail records. A player who never appears in any detail
   record correctly reports zeroes rather than being omitted. */
export function playerStats(matches, squad, trialists = {}, signedOn = () => null) {
  const table = new Map();
  const ensure = (num) => {
    if (!table.has(num)) {
      table.set(num, {
        num, apps: 0, starts: 0, subApps: 0, benchUnused: 0, goals: 0, assists: 0,
        yellow: 0, red: 0, motm: 0, cleanSheets: 0, captained: 0,
        /* How the goals were scored and how the chances were made. Every one
           of these counts only goals where somebody actually recorded that
           detail, so a player whose early-season goals were logged before the
           panel could hold it shows fewer here than in the goals column. That
           is honest: the alternative is guessing a body part. */
        byFoot: { right: 0, left: 0, head: 0, other: 0 },
        byZone: { six: 0, box: 0, outside: 0 },
        bySituation: {},
        assistsByType: {},
        goalsDetailed: 0,
        saves: 0, keeperApps: 0,
        penalties: 0, matches: [],
      });
    }
    return table.get(num);
  };

  for (const m of matches) {
    const d = m.detail;
    if (!d) continue;

    /* A TEAM SHEET STORES A SLOT, AND SLOTS GET HANDED ON.

       Leon Burnett signed in July 2026 and wears the number somebody else
       wore against Brockwell Violets in October 2025. The sheet records the
       number, so every figure derived from it credited that October bench
       place to a man who was not at the club for another nine months, and his
       page published it: "0 appearances in 25/26, plus 1 unused".

       `signedOn()` is the club's own statement of when somebody joined, and
       the site already trusts it to decide which of two people a slot meant -
       for the season chips and for who counts as making a first appearance.
       It was simply never asked here, which is where the figures are made.

       Only a player the club has actually given a date is affected: with no
       date there is nothing to compare and the slot counts as it always did,
       so no existing record has to be migrated for this to be safe. */
    const notYetHere = (n) => {
      const from = signedOn(n);
      return !!(from && m.iso && String(m.iso) < String(from));
    };
    const starters = (d.starters || []).map((x) => x.num).filter((n) => !notYetHere(n));
    const bench = (d.bench || []).map((x) => x.num).filter((n) => !notYetHere(n));

    /* ======================================================================
       WHAT COUNTS AS AN APPEARANCE

       Starts only, until now, and the reason was sound: Sunday-league returns
       do not record substitutions, so a bench listing is not evidence of
       having played and folding it in would inflate a figure nobody can
       check.

       The bench carries `on` now, which IS that evidence when somebody has
       filled it in. And where nobody has, the match record often proves it
       anyway: a man who scored played, whatever the sheet says about him. On
       the live site that gap read as William Clark, seven goals from two
       appearances, because he came off the bench for five of them.

       So an appearance is a start, or a substitute the record can show was on
       the pitch: `on` ticked, or credited with something in this match. Both
       are evidence and neither is an estimate. A name on the bench with
       nothing beside it is still not an appearance, which is the part of the
       original rule that was right.
       ====================================================================== */
    const cameOn = new Set((d.bench || []).filter((b) => b.on).map((b) => b.num));
    const proven = new Set();
    const prove = (n) => { if (n != null && n !== '') proven.add(Number(n)); };
    for (const g of d.goals || []) {
      prove(g.num);
      if (g.assist) prove(g.assist.num);
    }
    for (const a of d.assists || []) prove(a.num);
    for (const f of ['yellowCards', 'redCards', 'cleanSheets', 'penaltiesSaved', 'penaltiesMissed']) {
      for (const x of d[f] || []) prove(x && x.num != null ? x.num : x);
    }
    prove(d.keeper); prove(d.motm); prove(d.captain);
    const playedOffBench = (n) => cameOn.has(n) || proven.has(n);

    const appeared = new Set(starters);

    /* ======================================================================
       WHO KEPT THE CLEAN SHEET IS SOMETHING THE CLUB RECORDS

       This credited whoever STARTED in a position matching /GK|CB|LB|RB|WB/,
       and that was the best available answer only for as long as there was no
       other one. There is: the match form asks who kept the clean sheet, the
       club has answered on fourteen matches, and both answers were stored and
       read by nothing.

       `cleanSheets` is the keeper. `cleanSheetContributors` is the back line
       in front of him, and it is not the same list - Brockwell away records
       five defenders and does NOT name the keeper, so neither field alone is
       the answer and the union is.

       They disagree with the position rule on TWELVE of the fourteen, and
       five players' totals move. That is the shape the project already has a
       rule about: a field with no consumer is a lie with a save button. It
       had a save button, a hint saying where it showed on the website, and
       no reader.

       The rule still stands where nothing was recorded, which is the ten
       older matches, so nothing in the archive loses a clean sheet it had.
       And the credit is no longer confined to starters: a man the club names
       is a man the club names, whether he began the match or came on. */
    const csRecorded = [...new Set([
      ...(d.cleanSheetContributors || []),
      ...(d.cleanSheets || []),
    ].map((x) => (x && x.num != null ? x.num : x))
      .map(Number)
      .filter((n) => Number.isFinite(n)))];
    const csFromShape = (d.starters || [])
      .filter((x) => /GK|CB|LB|RB|WB/.test((x.positions || []).join('')))
      .map((x) => Number(x.num));
    const keptIt = new Set(
      (m.theirGoals === 0 && m.played)
        ? (csRecorded.length ? csRecorded : csFromShape)
        : [],
    );

    for (const num of starters) {
      const p = ensure(num);
      p.starts++; p.apps++;
      p.matches.push({ id: m.id, role: 'start' });
      if (keptIt.has(Number(num))) { p.cleanSheets++; keptIt.delete(Number(num)); }
    }
    for (const num of bench) {
      const p = ensure(num);
      p.subApps++;
      if (appeared.has(num)) continue;
      if (playedOffBench(num)) {
        p.apps++;
        appeared.add(num);
        /* A role of its own, so everything downstream can still tell a start
           from a substitute appearance from an unused bench listing. */
        p.matches.push({ id: m.id, role: 'sub' });
      } else {
        /* He was named and the record cannot show he came on. This is the
           figure the squad card publishes beside Apps: an outing already
           counted as an appearance must not be counted a second time as a
           bench outing, or one card claims the same afternoon twice. */
        p.benchUnused++;
        p.matches.push({ id: m.id, role: 'bench' });
      }
    }
    /* Whoever the club named and the eleven did not account for: a substitute
       defender, or a keeper who came on. Named by the club is evidence in
       exactly the way a name on the bench with nothing beside it is not. */
    for (const num of keptIt) ensure(num).cleanSheets++;
    /* Per-match tallies are recorded on the player's own match entry as well
       as on the season total. A scoring streak cannot be derived from a
       season total, and re-reading every match detail to work one out would
       mean the streak and the total could drift apart. */
    const bump = (num, key) => {
      const p = ensure(num);
      let rec = p.matches.find((r) => r.id === m.id);
      // A player can score without starting or being listed on the bench.
      if (!rec) { rec = { id: m.id, role: 'unlisted' }; p.matches.push(rec); }
      rec[key] = (rec[key] || 0) + 1;
    };
    for (const g of d.goals || []) {
      const p = ensure(g.num); p.goals++;
      if (g.penalty || g.situation === 'penalty') p.penalties++;
      if (g.bodyPart && p.byFoot[g.bodyPart] !== undefined) p.byFoot[g.bodyPart]++;
      if (g.zone && p.byZone[g.zone] !== undefined) p.byZone[g.zone]++;
      if (g.situation) p.bySituation[g.situation] = (p.bySituation[g.situation] || 0) + 1;
      if (g.bodyPart || g.zone || g.situation) p.goalsDetailed++;
      bump(g.num, 'goals');
    }
    for (const a of d.assists || []) {
      const p = ensure(a.num);
      p.assists++;
      const t = a.type || 'pass';
      p.assistsByType[t] = (p.assistsByType[t] || 0) + 1;
      bump(a.num, 'assists');
    }
    /* Goalkeeping. `keeper` names who was between the posts, which is not the
       same as who is a goalkeeper by position: a Sunday-league side puts an
       outfield player in goal more often than it likes to admit. */
    if (d.keeper != null) {
      const k = ensure(d.keeper);
      k.keeperApps++;
      if (Number.isFinite(Number(d.saves))) k.saves += Number(d.saves);
    }
    for (const c of d.yellowCards || []) ensure(c.num ?? c).yellow++;
    for (const c of d.redCards || []) ensure(c.num ?? c).red++;
    if (d.motm != null) ensure(d.motm).motm++;
    if (d.captain != null) ensure(d.captain).captained++;
  }

  // Join onto the squad so names, positions and status travel with the stats.
  const bySquad = new Map(squad.map((p) => [p.num, p]));
  const rows = [];
  for (const p of squad) {
    const s = table.get(p.num) || {
      num: p.num, apps: 0, starts: 0, subApps: 0, benchUnused: 0, goals: 0, assists: 0,
      yellow: 0, red: 0, motm: 0, cleanSheets: 0, captained: 0, penalties: 0, matches: [],
      byFoot: { right: 0, left: 0, head: 0, other: 0 },
      byZone: { six: 0, box: 0, outside: 0 },
      bySituation: {}, assistsByType: {}, goalsDetailed: 0, saves: 0, keeperApps: 0,
    };
    rows.push({
      ...s,
      savesPerGame: s.keeperApps ? (s.saves / s.keeperApps).toFixed(1) : null,
      name: p.name,
      slug: p.slug,
      first: p.first,
      last: p.last,
      position: p.position,
      positionGroup: p.positionGroup,
      status: p.status,
      goalContributions: s.goals + s.assists,
      minutesNote: 'Minutes are not recorded in Sunday-league match returns.',
    });
  }
  /* A number in a match record that is not in the squad is one of two things:
     a trialist who turned out once, or a departed player from before the
     roster was written down. A trialist has a name here and gets it; nobody
     else does, and "No. 24" is the honest alternative to inventing one.

     `trialist` keeps them out of the leaderboards and off the squad page
     without hiding them from the match they actually played in. A lad on trial
     who scores in a friendly belongs in that match report and does not belong
     in the club's season records. */
  for (const [num, s] of table) {
    if (bySquad.has(num)) continue;
    const known = trialists[String(num)];
    rows.push({
      ...s,
      name: known || `No. ${num}`,
      slug: known ? `trialist-${num}` : `player-${num}`,
      first: known ? known.split(' ')[0] : '',
      last: known ? (known.split(' ').slice(1).join(' ') || known) : `No. ${num}`,
      position: 'Unknown',
      positionGroup: 'mid',
      status: known ? 'trial' : 'departed',
      savesPerGame: s.keeperApps ? (s.saves / s.keeperApps).toFixed(1) : null,
      goalContributions: s.goals + s.assists,
      unknown: true,
      trialist: !!known,
    });
  }
  return rows.sort((a, b) => b.goalContributions - a.goalContributions || b.goals - a.goals || a.num - b.num);
}

export function leaderboard(rows, key, n = 10) {
  return rows
    /* Trialists are recorded so a match report can name them and left out of
       every club record, which is what a trial is. */
    .filter((r) => !r.trialist)
    .filter((r) => r[key] > 0)
    .sort((a, b) => b[key] - a[key] || b.apps - a.apps || a.num - b.num)
    .slice(0, n);
}

/* ---- Club records ---------------------------------------------------- */
/* EVERY CARD HERE NAMES THE OPPONENT WITH NO VENUE BESIDE IT, so the club's
   own goals come first: `ourScoreline`, never `scoreline`.

   Matches are stored home-goals-first, which is right wherever the two clubs
   appear in home-away order beside the score and wrong on a card that says
   only "v Balham Bteckerz". Fifteen of the club's thirty matches were away,
   and the biggest win in its history read 0-12.

   That has now been fixed twice. The first time was on the records PAGE,
   which builds its own cards and had its own correction; this function kept
   the raw scoreline and nothing rendered it, so the bug sat here latent until
   a home page band read it and printed 0-12 under "Biggest win". A correction
   that lives in one renderer is not a fix, it is a patch that the next
   renderer will not know about. */
export function clubRecords(matches, players) {
  const played = matches.filter((m) => m.played);
  const big = biggestWin(matches);
  const worst = heaviestDefeat(matches);
  const topScorer = leaderboard(players, 'goals', 1)[0];
  const topAssist = leaderboard(players, 'assists', 1)[0];
  const topApps = leaderboard(players, 'apps', 1)[0];
  const topMotm = leaderboard(players, 'motm', 1)[0];
  const first = played.slice().sort((a, b) => (a.iso || '').localeCompare(b.iso || ''))[0];

  const recs = [
    big && { value: big.ourScoreline, label: 'Biggest win', who: `v ${big.opponent}, ${fmtDate(big.date)}`, href: `/matches/${big.slug}.html` },
    { value: longestRun(matches, (m) => m.outcome === 'W'), label: 'Longest winning run', who: 'consecutive matches' },
    { value: longestRun(matches, (m) => m.outcome !== 'L'), label: 'Longest unbeaten run', who: 'consecutive matches' },
    { value: longestRun(matches, (m) => m.theirGoals === 0, { goalRecordOnly: true }), label: 'Consecutive clean sheets', who: 'matches without conceding' },
    topScorer && { value: topScorer.goals, label: 'Most goals', who: topScorer.name, href: `/players/${topScorer.slug}.html` },
    topAssist && { value: topAssist.assists, label: 'Most assists', who: topAssist.name, href: `/players/${topAssist.slug}.html` },
    topApps && { value: topApps.apps, label: 'Most appearances', who: topApps.name, href: `/players/${topApps.slug}.html` },
    topMotm && { value: topMotm.motm, label: 'Most Player of the Match awards', who: topMotm.name, href: `/players/${topMotm.slug}.html` },
    first && { value: first.ourScoreline, label: 'First competitive result', who: `v ${first.opponent}, ${fmtDate(first.date)}`, href: `/matches/${first.slug}.html` },
    worst && { value: worst.ourScoreline, label: 'Heaviest defeat', who: `v ${worst.opponent}, ${fmtDate(worst.date)}` },
  ].filter(Boolean);

  return recs.filter((r) => r.value !== 0 && r.value !== '0');
}

/* ---- League table ---------------------------------------------------- */
export function normaliseTable(raw) {
  return (raw || []).map((r) => ({
    pos: r.p,
    club: r.c,
    played: r.pl,
    won: r.w,
    drawn: r.d,
    lost: r.l,
    goalsFor: r.gf,
    goalsAgainst: r.ga,
    goalDifference: typeof r.gd === 'string' ? Number(r.gd.replace('+', '')) : r.gd,
    points: r.pts,
    us: !!r.us || isUs(r.c),
  }));
}

/* ==========================================================================
   THE LEAGUE TABLE, WORKED OUT FROM THE RESULTS

   The published table is transcribed by hand, and a transcribed number is one
   nobody can check. The retired TableSync.jsx tried to solve that by pulling
   the table off FA Full-Time through a third-party proxy with a hard-coded
   fallback, which is two ways to publish a wrong table quietly.

   It does not need fetching. The site already holds every result in the
   division, all ninety of them, because it prints them under "Around the
   league": a ten-club double round robin is exactly ninety matches. So the
   table can be derived from results the club already publishes, and the
   transcription becomes a second opinion rather than the only one.

   Run against the recorded season the two agree on every figure, including
   the club's own 90-11 and 54 points. `npm run verify` asserts it, so a
   mistyped table or a wrong division result stops the build instead of
   reaching the site. That is the loud failure the fetch was meant to provide,
   without a third party in the path.

   WALKOVERS ARE THE WHOLE DIFFICULTY, and getting them wrong is what made an
   earlier derivation disagree with the official table by six rows out of ten.
   Seven of the ninety were awarded rather than played. They count as played,
   they give three points to one side, and they add NO GOALS: the official
   table adds none, which is why 15x3 + 3x3 = 54 rather than 18 wins' worth of
   goals. Treated as scoreless draws they cost the club six points and three
   wins, and quietly moved four other clubs.
   ========================================================================== */
export function deriveTable(results) {
  const rows = new Map();
  const row = (club) => {
    if (!rows.has(club)) {
      rows.set(club, {
        club, played: 0, won: 0, drawn: 0, lost: 0,
        goalsFor: 0, goalsAgainst: 0, points: 0,
      });
    }
    return rows.get(club);
  };

  for (const m of results || []) {
    const h = row(m.home);
    const a = row(m.away);
    h.played += 1;
    a.played += 1;

    if (m.wo) {
      /* Which side it went to is the record's own field, never inferred. */
      const homeAwarded = String(m.wo).toLowerCase().startsWith('h');
      const winner = homeAwarded ? h : a;
      const loser = homeAwarded ? a : h;
      winner.won += 1;
      winner.points += 3;
      loser.lost += 1;
      continue;
    }
    if (typeof m.hs !== 'number' || typeof m.as !== 'number') {
      /* No score and no walkover is a record that cannot be counted. Left out
         of the goal columns rather than guessed at as 0-0, and the played
         count above still stands so the discrepancy shows up rather than
         balancing itself out. */
      continue;
    }

    h.goalsFor += m.hs; h.goalsAgainst += m.as;
    a.goalsFor += m.as; a.goalsAgainst += m.hs;
    if (m.hs > m.as) { h.won += 1; h.points += 3; a.lost += 1; }
    else if (m.hs < m.as) { a.won += 1; a.points += 3; h.lost += 1; }
    else { h.drawn += 1; a.drawn += 1; h.points += 1; a.points += 1; }
  }

  return [...rows.values()]
    .map((r) => ({ ...r, goalDifference: r.goalsFor - r.goalsAgainst, us: isUs(r.club) }))
    .sort((x, y) => y.points - x.points
      || y.goalDifference - x.goalDifference
      || y.goalsFor - x.goalsFor)
    .map((r, i) => ({ pos: i + 1, ...r }));
}

/* Does the transcribed table agree with the results? Compared club by club
   rather than row by row, because two clubs level on every single figure are
   ordered by the league and not by arithmetic: Old Freemen's and Shepherd's
   Tuesday finished P18 W5 D2 L11, 28-36, 17 points, identical, and which of
   them is eighth is the league's call.

   Returns the disagreements, so the caller decides how loudly to fail. */
export function compareTable(published, derived) {
  const byClub = new Map(derived.map((r) => [r.club, r]));
  const out = [];
  const FIELDS = ['played', 'won', 'drawn', 'lost', 'goalsFor', 'goalsAgainst', 'points'];

  for (const p of published || []) {
    const d = byClub.get(p.club);
    if (!d) { out.push(`${p.club}: in the published table, not in the results`); continue; }
    byClub.delete(p.club);
    for (const f of FIELDS) {
      if (p[f] == null) continue;
      if (Number(p[f]) !== Number(d[f])) {
        out.push(`${p.club} ${f}: table says ${p[f]}, the results say ${d[f]}`);
      }
    }
  }
  for (const club of byClub.keys()) {
    out.push(`${club}: in the results, not in the published table`);
  }

  /* The published ORDER still has to make sense of its own figures, even
     where the league breaks a tie: points must never rise going down the
     table, and neither may goal difference within the same points. */
  for (let i = 1; i < (published || []).length; i += 1) {
    const above = published[i - 1];
    const here = published[i];
    if (Number(here.points) > Number(above.points)) {
      out.push(`${here.club} is below ${above.club} on more points`);
    } else if (Number(here.points) === Number(above.points)
      && Number(here.goalDifference) > Number(above.goalDifference)) {
      out.push(`${here.club} is below ${above.club} on the same points and a better goal difference`);
    }
  }
  return out;
}

/* ---- Season grouping ------------------------------------------------- */
export function groupBySeason(matches) {
  const map = new Map();
  for (const m of matches) {
    const s = m.season || 'unknown';
    if (!map.has(s)) map.set(s, []);
    map.get(s).push(m);
  }
  return [...map.entries()]
    .map(([season, list]) => ({
      season,
      matches: list.sort((a, b) => (b.iso || '').localeCompare(a.iso || '')),
      ...teamSummary(list),
    }))
    .sort((a, b) => b.season.localeCompare(a.season));
}

/* ---- Match event timeline -------------------------------------------- */
export function matchTimeline(match, nameFor) {
  const d = match.detail;
  if (!d) return [];
  const ev = [];
  const push = (kind, min, text) => ev.push({ kind, min: min || '', text });

  for (const g of d.goals || []) {
    const extra = g.penalty ? ' (penalty)' : g.setType ? ` (${g.setType})` : '';
    push('goal', g.minute, `${nameFor(g.num)} scores${extra}`);
  }
  for (const g of d.opponentGoals || []) push('goal-against', g.minute, `${match.opponent} score`);
  for (const c of d.yellowCards || []) push('card', c.minute, `${nameFor(c.num ?? c)} booked`);
  for (const c of d.redCards || []) push('card', c.minute, `${nameFor(c.num ?? c)} sent off`);
  for (const s of d.subs || []) push('sub', s.minute, `${nameFor(s.on)} on for ${nameFor(s.off)}`);

  // Many records carry no minute, so keep entry order and float timed
  // events into position rather than inventing minutes.
  const timed = ev.filter((e) => e.min).sort((a, b) => parseInt(a.min, 10) - parseInt(b.min, 10));
  const untimed = ev.filter((e) => !e.min);
  return [...timed, ...untimed];
}

/* ---- Monthly aggregation (Player of the Month support) --------------- */
export function monthlyStats(matches, month, year) {
  const inMonth = matches.filter((m) => {
    const d = parseDate(m.date);
    return d && d.getUTCMonth() === month && (year == null || d.getUTCFullYear() === year);
  });
  return inMonth;
}

/* ---- Player profile ----------------------------------------------------
   Everything a single player's page publishes, derived in one place from the
   match records so the rings, the panels and the competition table cannot
   disagree with each other. The design this replaces showed thirteen clean
   sheets in its rings and sixteen in the panel below them, which is what
   happens when the same figure is worked out twice.

   `apps` here is starts plus substitute appearances the record can PROVE -
   `on` ticked, or credited with something in that match - exactly as
   playerStats counts them. A name on the bench with nothing beside it is
   still not an appearance and is carried separately in `bench`. */
export function playerProfile(player, matches, squad) {
  const byId = new Map(matches.map((m) => [m.id, m]));
  const mine = (player.matches || []).filter((r) => byId.has(r.id));
  /* Starts AND substitute appearances, which is what "the matches he played
     in" means. Starts alone put eleven appearances at the top of William
     Clark's page and two in the table underneath it, and left his timeline
     running to two goals under a heading saying seven: the totals above were
     already counted across every match he was involved in, and only this set
     was not. One page, one figure. */
  const played = mine
    .filter((r) => r.role === 'start' || r.role === 'sub')
    .map((r) => byId.get(r.id))
    .filter((m) => m && m.played)
    .sort((a, b) => (a.iso || '').localeCompare(b.iso || ''));
  const bench = mine.filter((r) => r.role === 'bench').length;

  const comps = new Map();
  let conceded = 0, cleanSheets = 0, won = 0, drawn = 0, lost = 0, onRecord = 0;
  /* Counted from THESE matches, not from the player's all-time record, so the
     same function answers correctly for one season or for a career.

     Goals, assists and Man of the Match are tallied across every match the
     player was involved in, INCLUDING the ones he came on in. Counting them
     only from starts lost a substitute's goals: it took one off Frazier's 31
     and would have quietly under-reported every impact player at the club.
     Clean sheets and the win record follow the same set: they are claims
     about a match the player was on the pitch for, not about one he began. */
  let goals = 0, assists = 0, motm = 0;
  for (const r of mine) {
    const m = byId.get(r.id);
    if (!m || !m.played) continue;
    goals += (m.detail?.goals || []).filter((x) => x.num === player.num).length;
    assists += (m.detail?.assists || []).filter((x) => x.num === player.num).length;
    if (m.detail?.motm === player.num) motm++;
  }
  const timeline = [];
  let runGoals = 0, runAssists = 0, runClean = 0;

  for (const m of played) {
    const c = m.competition || 'Other';
    if (!comps.has(c)) comps.set(c, { comp: c, apps: 0, goals: 0, assists: 0, cleanSheets: 0, conceded: 0, motm: 0 });
    const row = comps.get(c);
    row.apps++;

    const g = (m.detail?.goals || []).filter((x) => x.num === player.num).length;
    const a = (m.detail?.assists || []).filter((x) => x.num === player.num).length;
    row.goals += g; row.assists += a;
    if (m.detail?.motm === player.num) row.motm++;

    /* A walkover has no goal record, so it cannot prove a clean sheet and
       must not be counted as one either way. */
    if (m.countsGoals) {
      onRecord++;
      row.conceded += m.theirGoals; conceded += m.theirGoals;
      if (m.theirGoals === 0) { row.cleanSheets++; cleanSheets++; runClean++; }
    }
    if (m.outcome === 'W') won++; else if (m.outcome === 'D') drawn++; else if (m.outcome === 'L') lost++;

    runGoals += g; runAssists += a;
    timeline.push({
      id: m.id, date: m.date, iso: m.iso, opponent: m.opponent, outcome: m.outcome,
      scoreline: m.countsGoals ? `${m.ourGoals}-${m.theirGoals}` : 'W/O',
      goals: g, assists: a, motm: m.detail?.motm === player.num,
      conceded: m.countsGoals ? m.theirGoals : null,
      runGoals, runAssists, runClean,
    });
  }

  const decided = won + drawn + lost;
  const pct = (n, of) => (of ? Math.round((n / of) * 100) : 0);

  /* Rank within the squad on the measures the page actually claims a rank
     for. Ties share the better position, the way a league table does. */
  const rankOf = (key) => {
    const vals = squad.map((p) => p[key] || 0).sort((x, y) => y - x);
    const mine = player[key] || 0;
    return mine > 0 ? vals.indexOf(mine) + 1 : null;
  };

  return {
    /* TWO FIGURES, BECAUSE THEY ARE TWO FACTS. `played` used to be starts and
       this key was named for it; `played` now includes substitute
       appearances, so returning it as `starts` published William Clark's
       eleven appearances under the word "Starts". Both are here and each page
       says which it means. */
    apps: played.length,
    starts: mine.filter((r) => r.role === 'start').length,
    bench,
    goals,
    assists,
    involvements: goals + assists,
    motm,
    cleanSheets,
    conceded,
    onRecord,
    won, drawn, lost,
    winPct: pct(won, decided),
    cleanSheetPct: pct(cleanSheets, onRecord),
    concededPerGame: onRecord ? (conceded / onRecord).toFixed(2) : '0.00',
    perGame: played.length ? ((goals + assists) / played.length).toFixed(2) : '0.00',
    goalRank: rankOf('goals'),
    assistRank: rankOf('assists'),
    motmRank: rankOf('motm'),
    cleanSheetRank: rankOf('cleanSheets'),
    byCompetition: [...comps.values()].sort((a, b) => b.apps - a.apps),
    timeline,
    last: timeline.slice(-10).reverse(),
  };
}

/* ==========================================================================
   MILESTONES IN SIGHT

   Who is close to a round number, worked out rather than remembered. Charlie
   Dunkley is on 24 appearances, 24 goals and 19 assists, which is three
   milestones in one afternoon and exactly the kind of thing a club notices
   afterwards and wishes it had said beforehand.

   COMPETITIVE ONLY, like every other figure the site publishes, and
   appearances are STARTS, because Sunday-league returns do not record
   substitute appearances or minutes. The band says both out loud rather than
   letting a reader assume the more flattering reading.
   ========================================================================== */
const MILESTONE_STEPS = [
  /* `apps`, not `starts`. The label has always read "appearances" and the
     figure was starts, which were the same number until an appearance started
     counting a substitute the record can prove was on the pitch. They differ
     for ten players now, and the band was telling the front page that Charlie
     Dunkley was one appearance from 25 when he had already played 25. */
  { key: 'apps', label: 'appearances', step: 25 },
  { key: 'goals', label: 'goals', step: 25 },
  { key: 'assists', label: 'assists', step: 10 },
  { key: 'cleanSheets', label: 'clean sheets', step: 10 },
];

/* MILESTONES IN SIGHT ARE FOR PEOPLE WHO CAN STILL REACH THEM.

   This is the one band on the site that makes a claim about the FUTURE, and
   it was making it about everybody: William Clark has retired and the front
   page had him two assists from ten. He is not two away from anything. The
   same would have been true of the twelve who have left.

   Their record is untouched, which is the point of the distinction. Every
   appearance and every goal stays on the player page, in the leaderboards, in
   the club records and in Those who came before; a career that is finished is
   still a career. What stops is the club saying they are ABOUT to do
   something. Past tense yes, future tense no.

   The filter lives here rather than at the call site because the band and the
   test that decides whether to draw the band both call this, and a band that
   empties itself on a different question from the one it renders is how a
   heading ends up over an empty list. */
export function milestones(players, within = 3) {
  const out = [];
  for (const p of (players || []).filter((x) => isPlaying(x && x.status))) {
    for (const m of MILESTONE_STEPS) {
      const v = Number(p[m.key]) || 0;
      /* Nobody is "approaching" their first. A milestone is a number somebody
         has been building towards, so the first step only counts once they are
         most of the way to it. */
      if (v < m.step / 2) continue;
      const next = Math.ceil((v + 1) / m.step) * m.step;
      const away = next - v;
      if (away > within) continue;
      out.push({ player: p, label: m.label, value: v, next, away });
    }
  }
  /* Closest first, then the bigger milestone, so "one goal from 25" leads
     "three assists from 20". */
  return out.sort((a, b) => a.away - b.away || b.next - a.next
    || String(a.player.name).localeCompare(String(b.player.name)));
}

/* ---- The run the club is on RIGHT NOW ---------------------------------
   Not the longest run in the archive, which is what longestStreak() answers
   and what the records page publishes. This counts backwards from the most
   recent match and stops at the first one that breaks it, so it is a claim
   about today and it collapses to nothing the moment the club loses.

   Walkovers are the awkward case and they are handled per run rather than
   globally. A walkover is a win and belongs in an unbeaten run; it carries no
   goal record at all, so it can neither extend nor break a scoring run and is
   skipped there. Counting it as a scoreless draw is what once moved six rows
   of the league table. */
const RUN_KINDS = [
  { key: 'won', label: 'wins in a row', one: 'win', test: (m) => m.outcome === 'W' },
  { key: 'unbeaten', label: 'unbeaten', one: 'match unbeaten', test: (m) => m.outcome !== 'L' },
  {
    key: 'clean', label: 'clean sheets in a row', one: 'clean sheet',
    test: (m) => m.theirGoals === 0, goalRecordOnly: true,
  },
  {
    key: 'scoring', label: 'matches scoring', one: 'match scoring',
    test: (m) => m.ourGoals > 0, goalRecordOnly: true,
  },
];

export function currentRun(matches) {
  const all = (matches || []).filter((m) => m.played)
    .slice().sort((a, b) => (b.iso || '').localeCompare(a.iso || ''));
  if (!all.length) return [];
  return RUN_KINDS.map((k) => {
    const scope = k.goalRecordOnly ? all.filter((m) => m.countsGoals) : all;
    let n = 0;
    for (const m of scope) { if (!k.test(m)) break; n += 1; }
    const from = n ? scope[n - 1] : null;
    return {
      key: k.key, n, label: k.label, one: k.one,
      /* EVERY RUN CARRIES THE BEST ONE, because a live run means nothing on
         its own. "Two wins in a row" under a photograph of a club that won
         eighteen league matches without losing reads as a bad season rather
         than as the second week of a new one. The best gives it a scale, and
         it is the same figure the records page publishes. */
      best: longestStreak(matches || [], k.test, { goalRecordOnly: k.goalRecordOnly }).length,
      /* Where it started, so the band can say since when rather than only how
         many. A run covering everything the club has ever played has no
         "since": it started at the beginning. */
      since: n && n < scope.length ? from : null,
      all: n > 0 && n === scope.length,
    };
  }).filter((r) => r.best > 1);
}

/* ---- How the goals come -----------------------------------------------
   Read off the goal records themselves, using the vocabulary in football.mjs
   so the panel, the pages and this cannot describe the same goal three ways.

   COVERAGE IS RETURNED, not hidden. Four of the club's goals record a body
   part and 141 do not, so any band drawing this has to be able to say what
   share of the goals it is actually describing. A percentage over a quarter
   of the evidence, published without saying so, is the sort of figure that
   gets repeated back as fact. */
export function goalKinds(matches) {
  const goals = (matches || []).filter((m) => m.played && m.countsGoals)
    .flatMap((m) => (m.detail && m.detail.goals) || []);
  const total = goals.length;
  const kinds = [
    { key: 'penalty', label: 'Penalties', test: (g) => !!g.penalty },
    { key: 'set', label: 'From a set piece', test: (g) => !g.penalty && g.type === 'set' },
    { key: 'open', label: 'From open play', test: (g) => !g.penalty && g.type && g.type !== 'set' },
  ];
  const rows = kinds.map((k) => {
    const n = goals.filter(k.test).length;
    return { key: k.key, label: k.label, n, pct: total ? Math.round((n / total) * 100) : 0 };
  }).filter((r) => r.n > 0);
  const known = goals.filter((g) => g.penalty || g.type).length;
  return { rows, total, known, unknown: total - known };
}

/* ---- Every club played ------------------------------------------------
   One row per opponent, newest meeting first.

   Grouped on clubIdentity(), which keeps the SIDE and drops the legal suffix.
   Pure Football FC 2.0 and Pure Football FC 1st Team have different
   identities and stay two rows, because they are two sides and a record that
   merged them would claim wins over a team never played. That was the whole
   reason this used to group on the raw stored name.

   Grouping on the raw name solved that and created the opposite fault: the
   name is whatever somebody typed into the panel, so one club spelled two
   ways becomes two clubs. The archive holds "BPR Men's" and the fixture list
   "BPR FC". Nobody notices in a list of 22 rows, and both rows are wrong -
   each claims a complete record against a club the other row also played.
   clubIdentity() answers both questions at once: it is the same reduction the
   next-match band and the season-ahead band already use, so a club cannot be
   one opponent on one band and two on another.

   The row is LABELLED with the most recent spelling, because the newest
   record is the club's current name for them. */
export function opponentRecords(matches) {
  const map = new Map();
  for (const m of (matches || []).filter((x) => x.played)) {
    if (!m.opponent) continue;
    const k = clubIdentity(m.opponent) || m.opponent;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(m);
  }
  return [...map.values()].map((list) => {
    const s = teamSummary(list);
    const byDate = list.slice().sort((a, b) => (b.iso || '').localeCompare(a.iso || ''));
    const latest = byDate[0];
    return { opponent: latest.opponent, latest, ...s };
  }).sort((a, b) => b.played - a.played
    || String(a.opponent).localeCompare(String(b.opponent)));
}

/* ==========================================================================
   THE THIRTY ADDED IN AUGUST

   Same contract as everything above: derived from the match records, never
   typed, and each one returns enough for its band to say what it is counting
   over. Several of these read detail the club has only sometimes filled in,
   and every one of those returns its own coverage rather than quietly
   averaging over the records that happen to have it.
   ========================================================================== */

/* How the wins came, by margin. A club that wins 18 of 18 says nothing about
   HOW until you split them, and "eleven by three or more" is the sentence the
   unbeaten record is actually made of. Walkovers carry no goal record, so
   they have no margin and are counted separately rather than as 0. */
export function winMargins(matches) {
  const wins = (matches || []).filter((m) => m.played && m.outcome === 'W');
  const scored = wins.filter((m) => m.countsGoals);
  const map = new Map();
  for (const m of scored) {
    const by = Math.abs((m.ourGoals || 0) - (m.theirGoals || 0));
    map.set(by, (map.get(by) || 0) + 1);
  }
  const rows = [...map.entries()]
    .map(([margin, n]) => ({ margin, n, pct: Math.round((n / scored.length) * 100) }))
    .sort((a, b) => a.margin - b.margin);
  return { rows, wins: wins.length, scored: scored.length, awarded: wins.length - scored.length };
}

/* The scorelines that come up most often, written the club's way round.
   `ourScoreline`, never `scoreline`: matches are stored home-goals-first, and
   a list of bare scores with no venue beside them reading "0-12" under "most
   common" is the same bug that once put 0-12 under Biggest win. */
export function commonScorelines(matches, n = 6) {
  const map = new Map();
  for (const m of (matches || []).filter((x) => x.played && x.countsGoals)) {
    const s = m.ourScoreline || '';
    if (!s) continue;
    map.set(s, (map.get(s) || 0) + 1);
  }
  return [...map.entries()]
    .map(([scoreline, count]) => ({ scoreline, count }))
    .sort((a, b) => b.count - a.count || a.scoreline.localeCompare(b.scoreline))
    .slice(0, n);
}

/* The record month by month, oldest first. Keyed on the ISO year-month so two
   Septembers in different seasons are two rows: a club in its second season
   comparing "September" against "September" without the year is comparing a
   division it was promoted out of with the one it went into. */
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function byMonth(matches) {
  const map = new Map();
  for (const m of (matches || []).filter((x) => x.played && x.iso)) {
    const key = String(m.iso).slice(0, 7);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(m);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, list]) => ({
      key,
      label: `${MONTH_SHORT[Number(key.slice(5, 7)) - 1]} ${key.slice(2, 4)}`,
      ...teamSummary(list),
    }));
}

/* From the spot. Scored comes off the goal records, missed and conceded off
   the match detail, and the takers are counted from the goals so the band can
   name who takes them without a second list to keep in step. */
export function penaltyRecord(matches, nameFor) {
  const played = (matches || []).filter((m) => m.played);
  const goals = played.flatMap((m) => (m.detail && m.detail.goals) || []);
  const pens = goals.filter((g) => g.penalty);
  const missed = played.flatMap((m) => (m.detail && m.detail.penaltiesMissed) || []);
  const conceded = played.flatMap((m) => (m.detail && m.detail.penaltiesConceded) || []);
  const map = new Map();
  for (const g of pens) map.set(g.num, (map.get(g.num) || 0) + 1);
  const takers = [...map.entries()]
    .map(([num, n]) => ({ num, n, name: (nameFor && nameFor(num)) || '' }))
    .sort((a, b) => b.n - a.n || String(a.name).localeCompare(String(b.name)));
  return {
    scored: pens.length,
    missed: missed.length,
    conceded: conceded.length,
    takers,
    /* Awarded, which is scored plus missed, because a conversion rate over
       scored alone is 100% by construction. */
    awarded: pens.length + missed.length,
  };
}

/* Cards, AS RECORDED, and the second half of that phrase is the whole point.
   Eight yellows and two reds across 35 matches is not a disciplinary record,
   it is what got written down: Sunday-league match returns often do not carry
   cards at all. So this reports how many matches carry any card record beside
   the totals, and a band drawing it has to say so. */
export function disciplineRecord(matches) {
  const played = (matches || []).filter((m) => m.played);
  /* KEY PRESENCE, not truthiness. An empty array is a record saying nobody
     was booked, and it is the commonest case: 30 of the club's 33 matches. A
     truthiness test counts those as "recorded" too, which happens to give the
     right answer here and would give the wrong one the moment a match was
     entered with no card list at all. */
  const has = (m) => !!m.detail && ('yellowCards' in m.detail || 'redCards' in m.detail);
  return {
    yellow: played.flatMap((m) => (m.detail && m.detail.yellowCards) || []).length,
    red: played.flatMap((m) => (m.detail && m.detail.redCards) || []).length,
    conceded: played.flatMap((m) => (m.detail && m.detail.opponentRedCards) || []).length,
    played: played.length,
    recorded: played.filter(has).length,
  };
}

/* Which shapes the club sets up in, and how each one has gone. */
export function formationUse(matches) {
  const map = new Map();
  for (const m of (matches || []).filter((x) => x.played && x.detail && x.detail.formation)) {
    const f = String(m.detail.formation);
    if (!map.has(f)) map.set(f, []);
    map.get(f).push(m);
  }
  const total = [...map.values()].reduce((n, l) => n + l.length, 0);
  return {
    rows: [...map.entries()]
      .map(([formation, list]) => ({
        formation,
        n: list.length,
        won: list.filter((m) => m.outcome === 'W').length,
        pct: total ? Math.round((list.length / total) * 100) : 0,
      }))
      .sort((a, b) => b.n - a.n || a.formation.localeCompare(b.formation)),
    total,
    of: (matches || []).filter((x) => x.played).length,
  };
}

/* Every ground the club has played on, with the record there. */
export function venueRecords(matches) {
  const map = new Map();
  for (const m of (matches || []).filter((x) => x.played && x.venue)) {
    const v = String(m.venue);
    if (!map.has(v)) map.set(v, []);
    map.get(v).push(m);
  }
  return [...map.entries()]
    .map(([venue, list]) => ({ venue, home: list.some((m) => m.weAreHome), ...teamSummary(list) }))
    .sort((a, b) => b.played - a.played || a.venue.localeCompare(b.venue));
}

/* How the squad breaks down, by the position group each player is recorded
   in. Derived from the squad, not set anywhere: there is no "how many
   defenders" field and there must not be one, because it would disagree with
   the team sheets the moment somebody moved. */
const GROUP_NAME = { gk: 'Goalkeepers', def: 'Defenders', mid: 'Midfielders', fwd: 'Forwards' };
const GROUP_ORDER = ['gk', 'def', 'mid', 'fwd'];
export function squadShape(players) {
  const list = (players || []).filter((p) => !p.trialist);
  return GROUP_ORDER
    .map((key) => ({
      key,
      label: GROUP_NAME[key],
      n: list.filter((p) => p.positionGroup === key).length,
    }))
    .filter((r) => r.n > 0);
}

/* The longest run of consecutive appearances in which a player scored. Read
   off each player's OWN sequence of appearances, not the club's fixture list,
   so a run is not broken by a match somebody was not involved in. */
export function scoringRuns(players, matches, n = 6) {
  return (players || [])
    .filter((p) => !p.trialist && (p.goals || 0) > 0)
    .map((p) => ({ player: p, run: playerStreak(p, matches, (r) => (r.goals || 0) > 0) }))
    .filter((r) => r.run.length > 1)
    .sort((a, b) => b.run.length - a.run.length
      || (b.player.goals || 0) - (a.player.goals || 0)
      || String(a.player.name).localeCompare(String(b.player.name)))
    .slice(0, n);
}

/* THE CLUB'S FIRSTS. A club founded in 2025 has all of them inside two
   seasons, and none of them is stored anywhere: they are the earliest record
   that satisfies each test. Every card names the opponent with no venue
   beside it, so every scoreline is `ourScoreline`. */
export function clubFirsts(matches, nameFor) {
  const asc = (matches || []).filter((m) => m.played)
    .slice().sort((a, b) => String(a.iso || '').localeCompare(String(b.iso || '')));
  if (!asc.length) return [];
  const out = [];
  const card = (label, m, who) => {
    if (!m) return;
    out.push({
      label,
      value: m.isWalkover ? 'W/O' : (m.ourScoreline || m.scoreline || ''),
      who: `${who ? `${who} · ` : ''}${m.opponent}`,
      date: m.iso,
      href: m.slug ? `/matches/${m.slug}.html` : '',
    });
  };
  card('First match', asc[0]);
  card('First win', asc.find((m) => m.outcome === 'W'));
  const firstGoal = asc.find((m) => m.countsGoals && (m.ourGoals || 0) > 0);
  const scorer = firstGoal && ((firstGoal.detail && firstGoal.detail.goals) || [])[0];
  card('First goal', firstGoal, scorer && nameFor ? nameFor(scorer.num) : '');
  card('First clean sheet', asc.find((m) => m.countsGoals && m.theirGoals === 0));
  card('First cup tie', asc.find((m) => isCup(m)));
  return out;
}

/* ---- Five more, August ----------------------------------------------------
   Each one checked against the records before it was written. A sixth was
   dropped in the checking: players who have appeared in more than one season
   is zero, because only two matches of 26/27 have been played, so a band
   about the club's founding core would have published an empty heading. */

/* WHERE THE GOALS COME FROM, meaning which part of the side scores them, not
   which part of the pitch. Zone is recorded on 3 goals of 141 and could not
   carry a band; the scorer's position group is known for every goal, so this
   asks the question the evidence can actually answer. */
export function goalsByGroup(matches, players) {
  const by = new Map((players || []).map((p) => [p.num, p.positionGroup]));
  const out = new Map();
  let unknown = 0;
  const goals = (matches || []).filter((m) => m.played)
    .flatMap((m) => (m.detail && m.detail.goals) || []);
  for (const g of goals) {
    const grp = by.get(g.num);
    if (!grp) { unknown += 1; continue; }
    out.set(grp, (out.get(grp) || 0) + 1);
  }
  const total = [...out.values()].reduce((n, v) => n + v, 0);
  return {
    rows: GROUP_ORDER.filter((k) => out.has(k)).map((key) => ({
      key,
      label: GROUP_NAME[key],
      n: out.get(key),
      pct: total ? Math.round((out.get(key) / total) * 100) : 0,
    })),
    total,
    /* Goals whose scorer is not in the squad list, said rather than dropped. */
    unknown,
    of: goals.length,
  };
}

/* THE DEFEATS. The mirror of the biggest wins, and it belongs on the same
   page for the same reason the walkovers band does: a record is believable in
   proportion to how plainly it says what went the other way. */
export function heaviestDefeats(matches, n = 6) {
  return (matches || [])
    .filter((m) => m.played && m.countsGoals && m.outcome === 'L')
    .map((m) => ({ m, by: (m.theirGoals || 0) - (m.ourGoals || 0) }))
    .sort((a, b) => b.by - a.by || String(b.m.iso).localeCompare(String(a.m.iso)))
    .slice(0, n);
}

/* GOALS PER APPEARANCE, over a floor. Without a floor this is a list of
   whoever happened to score on their only outing, which says nothing about
   anybody: the floor is stated on the band rather than applied quietly. */
export function scoringRate(players, min = 5, n = 6) {
  return (players || [])
    .filter((p) => !p.trialist && (p.apps || 0) >= min && (p.goals || 0) > 0)
    .map((p) => ({ player: p, rate: (p.goals || 0) / (p.apps || 1) }))
    .sort((a, b) => b.rate - a.rate
      || (b.player.goals || 0) - (a.player.goals || 0)
      || String(a.player.name).localeCompare(String(b.player.name)))
    .slice(0, n);
}

/* ==========================================================================
   WHICH SEASON IS WHICH

   One typed string, '25/26', was answering three different questions across
   88 call sites, and it was right only because all three answers happened to
   be the same season. These are the two that have to be derived; the third,
   the season the club WON, comes off the season records themselves.

   They live here rather than inside dataset.mjs so the suite can run the
   REAL derivation against a simulated fixture list instead of a second copy
   of it. A test that re-implements the rule proves the two implementations
   agree and nothing about whether the rule is right.
   ========================================================================== */

/* THE SEASON THE CLUB'S FIGURES DESCRIBE: the latest season with a
   competitive match played. Pre-season friendlies must not move it, which is
   the whole reason this reads `competitive` - in August the club has six
   26/27 friendlies on the record and is still, correctly, a 25/26 club. */
export function figuresSeason(competitive, fallback = '') {
  const names = [...new Set(
    (competitive || []).filter((m) => m.played && m.season).map((m) => m.season),
  )].sort();
  return names[names.length - 1] || fallback;
}

/* THE SEASON `table` DESCRIBES, asked of the table rather than the calendar.
   The site holds exactly one transcribed standing, so taking the latest season
   with league matches would caption last season's final table with this
   season's name from the first whistle of a new one. Its own row reconciles
   with exactly one season's league record, which is the same comparison
   `npm run verify` makes to prove the transcription honest. */
export function tableSeasonOf(table, competitive, fallback = '') {
  const ours = (table || []).find((r) => r.us);
  if (!ours) return fallback;
  const names = [...new Set(
    (competitive || []).filter((m) => m.season).map((m) => m.season),
  )].sort().reverse();
  for (const name of names) {
    const lg = (competitive || []).filter((m) => m.played && isLeague(m) && m.season === name);
    if (!lg.length) continue;
    const won = lg.filter((m) => m.outcome === 'W').length;
    const gf = lg.reduce((n, m) => n + (m.ourGoals || 0), 0);
    if (lg.length === ours.played && won === ours.won && gf === ours.goalsFor) return name;
  }
  return fallback;
}
