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

export const slugify = (s) =>
  String(s || '')
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
    // Every walkover in the record was awarded to us. Verify from the record
    // rather than assuming, and leave it unset if the wording says otherwise.
    const said = String(detail?.commentary || '');
    outcome = /awarded a walkover/i.test(said) && /Sue.s Angels/i.test(said) ? 'W' : null;
  } else if (countsGoals) {
    outcome = ourGoals > theirGoals ? 'W' : ourGoals === theirGoals ? 'D' : 'L';
  }

  const scoreline = isWalkover ? 'W/O' : hasScore ? `${hs}-${as}` : null;

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
    venue: raw.venue || detail?.venue || '',
    season: seasonOf(raw.date),
    weAreHome,
    opponent,
    opponentSlug: slugify(opponent),
    ourGoals, theirGoals,
    outcome,
    scoreline,
    detail: detail || null,
    title: isWalkover
      ? `${home} v ${away} (walkover)`
      : hasScore && played
        ? `${home} ${hs}-${as} ${away}`
        : `${home} v ${away}`,
    resultNote: isWalkover
      ? 'Awarded as a walkover'
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
export function playerStats(matches, squad) {
  const table = new Map();
  const ensure = (num) => {
    if (!table.has(num)) {
      table.set(num, {
        num, apps: 0, starts: 0, subApps: 0, goals: 0, assists: 0,
        yellow: 0, red: 0, motm: 0, cleanSheets: 0, captained: 0,
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
    for (const g of d.goals || []) {
      const p = ensure(g.num); p.goals++;
      if (g.penalty) p.penalties++;
    }
    for (const a of d.assists || []) ensure(a.num).assists++;
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
    };
    rows.push({
      ...s,
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
  // Any detail record referencing a number not in the squad (a departed
  // player) still deserves its stats rather than silently vanishing.
  for (const [num, s] of table) {
    if (bySquad.has(num)) continue;
    rows.push({
      ...s, name: `No. ${num}`, slug: `player-${num}`, first: '', last: `No. ${num}`,
      position: 'Unknown', positionGroup: 'mid', status: 'departed',
      goalContributions: s.goals + s.assists, unknown: true,
    });
  }
  return rows.sort((a, b) => b.goalContributions - a.goalContributions || b.goals - a.goals || a.num - b.num);
}

export function leaderboard(rows, key, n = 10) {
  return rows
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
