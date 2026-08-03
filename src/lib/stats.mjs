/* ==========================================================================
   DERIVED STATISTICS ENGINE
   Every published number is computed here from match records. Nothing is
   hard-coded on a page, so two pages can never disagree about the same fact.

   Shared verbatim between the generator (build time) and the browser
   (client-side filtering), which is why it is dependency-free.
   ========================================================================== */

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

/* A season runs Sep-May, so Jun-Aug belongs to the season about to start. */
export function seasonOf(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return null;
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const start = m >= 5 ? y : y - 1; // June onwards starts the next season
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
export function playerStats(matches, squad, trialists = {}) {
  const table = new Map();
  const ensure = (num) => {
    if (!table.has(num)) {
      table.set(num, {
        num, apps: 0, starts: 0, subApps: 0, goals: 0, assists: 0,
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
    const starters = (d.starters || []).map((x) => x.num);
    const bench = (d.bench || []).map((x) => x.num);
    // Only bench players who actually came on count as appearances. The
    // records do not track this, so bench presence is reported separately
    // and never inflated into an appearance.
    const appeared = new Set(starters);

    for (const num of starters) {
      const p = ensure(num);
      p.starts++; p.apps++;
      p.matches.push({ id: m.id, role: 'start' });
      if (m.theirGoals === 0 && m.played) {
        const pos = (d.starters.find((s) => s.num === num)?.positions || []).join('');
        if (/GK|CB|LB|RB|WB/.test(pos)) p.cleanSheets++;
      }
    }
    for (const num of bench) {
      const p = ensure(num);
      p.subApps++;
      if (!appeared.has(num)) p.matches.push({ id: m.id, role: 'bench' });
    }
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
      num: p.num, apps: 0, starts: 0, subApps: 0, goals: 0, assists: 0,
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
    big && { value: big.scoreline, label: 'Biggest win', who: `v ${big.opponent}, ${fmtDate(big.date)}`, href: `/matches/${big.slug}.html` },
    { value: longestRun(matches, (m) => m.outcome === 'W'), label: 'Longest winning run', who: 'consecutive matches' },
    { value: longestRun(matches, (m) => m.outcome !== 'L'), label: 'Longest unbeaten run', who: 'consecutive matches' },
    { value: longestRun(matches, (m) => m.theirGoals === 0, { goalRecordOnly: true }), label: 'Consecutive clean sheets', who: 'matches without conceding' },
    topScorer && { value: topScorer.goals, label: 'Most goals', who: topScorer.name, href: `/players/${topScorer.slug}.html` },
    topAssist && { value: topAssist.assists, label: 'Most assists', who: topAssist.name, href: `/players/${topAssist.slug}.html` },
    topApps && { value: topApps.apps, label: 'Most appearances', who: topApps.name, href: `/players/${topApps.slug}.html` },
    topMotm && { value: topMotm.motm, label: 'Most Player of the Match awards', who: topMotm.name, href: `/players/${topMotm.slug}.html` },
    first && { value: first.scoreline, label: 'First competitive result', who: `v ${first.opponent}, ${fmtDate(first.date)}`, href: `/matches/${first.slug}.html` },
    worst && { value: worst.scoreline, label: 'Heaviest defeat', who: `v ${worst.opponent}, ${fmtDate(worst.date)}` },
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

   `apps` here is starts, as everywhere else in this engine: Sunday-league
   returns do not record who came off the bench, so bench outings are carried
   separately in `bench` rather than folded into a total nobody can verify. */
export function playerProfile(player, matches, squad) {
  const byId = new Map(matches.map((m) => [m.id, m]));
  const mine = (player.matches || []).filter((r) => byId.has(r.id));
  const played = mine
    .filter((r) => r.role === 'start')
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
     Starts, clean sheets and the win record stay on starts alone, because
     those are claims about a match the player began. */
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
    starts: played.length,
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
