/*
 * match-context.js — competition context for every fixture and result.
 *
 * WHY THIS EXISTS
 * The club already records who played, who scored and when. What it never
 * recorded is WHERE a match sat in its competition: which matchday of the
 * league, which round of the cup. Without that, 33 results are a flat list.
 * With it they become a league campaign with a shape and four cup runs with
 * an ending, which is most of what a visitor actually wants to know.
 *
 * ADDITIVE BY DESIGN. Every field here is optional. A match with none of it
 * behaves exactly as it does today, so nothing needs backfilling before the
 * site keeps working. Fill a field in and a front-end feature switches on.
 *
 * The one piece of history to respect: `round` already exists on 15 results,
 * written by hand in three different styles ("1st Round", "First Round",
 * "Round of 32"). We normalise on READ rather than rewriting the rows, so old
 * and new entries can coexist and the CMS can start writing canonical codes
 * without a migration.
 *
 * Loads standalone (node or browser). No dependencies.
 */
(function (root) {
  'use strict';

  /* ─── The cup ladder ────────────────────────────────────────────────────
   * `order` is what makes a run sortable and comparable, so we can answer
   * "how far did we get" without knowing the competition's naming style.
   *
   * Two naming systems share this ladder: the counting one (First Round,
   * Second Round...) and the halving one (Round of 64, Round of 32, Last 16).
   * A single competition only ever uses one of them, so interleaving their
   * order values is safe as long as each system stays monotonic on its own.
   */
  var ROUNDS = [
    { code: 'PRE',  order:  5, label: 'Preliminary Round',  short: 'PRE'  },
    { code: 'Q1',   order: 10, label: 'Qualifying Round 1', short: 'Q1'   },
    { code: 'Q2',   order: 15, label: 'Qualifying Round 2', short: 'Q2'   },
    { code: 'R1',   order: 20, label: 'First Round',        short: 'R1'   },
    { code: 'R2',   order: 25, label: 'Second Round',       short: 'R2'   },
    { code: 'R3',   order: 30, label: 'Third Round',        short: 'R3'   },
    { code: 'R4',   order: 35, label: 'Fourth Round',       short: 'R4'   },
    { code: 'R128', order: 40, label: 'Round of 128',       short: 'R128' },
    { code: 'R64',  order: 45, label: 'Round of 64',        short: 'R64'  },
    { code: 'R32',  order: 50, label: 'Round of 32',        short: 'R32'  },
    { code: 'R16',  order: 55, label: 'Last 16',            short: 'R16'  },
    { code: 'QF',   order: 60, label: 'Quarter Final',      short: 'QF'   },
    { code: 'SF',   order: 65, label: 'Semi Final',         short: 'SF'   },
    { code: 'F',    order: 70, label: 'Final',              short: 'F'    }
  ];

  var BY_CODE = {};
  ROUNDS.forEach(function (r) { BY_CODE[r.code] = r; });

  /* Ordered longest-first so "Quarter Final" and "Semi Final" are both tested
   * before the bare /final/ pattern can swallow them. Getting this order wrong
   * silently files every semi-final as the final, which would quietly invent
   * trophies for the club. */
  var ROUND_PATTERNS = [
    [/^(f|final)$|\bgrand final\b|(?<!semi[\s-])(?<!quarter[\s-])\bfinal\b/, 'F'],
    [/\bsemi[\s-]?final\b|\bsemi\b|^sf$/,                                    'SF'],
    [/\bquarter[\s-]?final\b|\bquarter\b|^qf$/,                              'QF'],
    [/\blast\s*16\b|\bround\s*of\s*16\b|^r16$|\bl16\b/,                      'R16'],
    [/\blast\s*32\b|\bround\s*of\s*32\b|^r32$/,                              'R32'],
    [/\blast\s*64\b|\bround\s*of\s*64\b|^r64$/,                              'R64'],
    [/\bround\s*of\s*128\b|^r128$/,                                          'R128'],
    [/\b(1st|first)\s*round\b|^r1$|^round\s*1$/,                             'R1'],
    [/\b(2nd|second)\s*round\b|^r2$|^round\s*2$/,                            'R2'],
    [/\b(3rd|third)\s*round\b|^r3$|^round\s*3$/,                             'R3'],
    [/\b(4th|fourth)\s*round\b|^r4$|^round\s*4$/,                            'R4'],
    [/\bprelim\w*\b|^pre$/,                                                  'PRE'],
    [/\bqualifying\s*(round\s*)?2\b|^q2$/,                                   'Q2'],
    [/\bqualifying\b|^q1$/,                                                  'Q1']
  ];

  /* Free text in, canonical round out. Returns null for anything unrecognised
   * so the caller can fall back to showing the raw string rather than losing
   * the coach's words. */
  function normaliseRound(raw) {
    if (!raw) return null;
    var s = String(raw).trim();
    if (BY_CODE[s.toUpperCase()]) return BY_CODE[s.toUpperCase()];
    var t = s.toLowerCase();
    for (var i = 0; i < ROUND_PATTERNS.length; i++) {
      var re = ROUND_PATTERNS[i][0];
      var hit;
      try { hit = re.test(t); }
      catch (e) { hit = false; } /* lookbehind is unsupported on old Safari */
      if (hit) return BY_CODE[ROUND_PATTERNS[i][1]];
    }
    return null;
  }

  /* Safari < 16.4 has no lookbehind. Rather than ship a regex that throws on
   * an iPhone, detect it once and swap in a plain guard for the Final case. */
  var HAS_LOOKBEHIND = (function () {
    try { new RegExp('(?<!a)b'); return true; } catch (e) { return false; }
  }());
  if (!HAS_LOOKBEHIND) {
    ROUND_PATTERNS[0] = [/^(f|final)$|\bgrand final\b/, 'F'];
    /* "final" preceded by semi/quarter is handled by those patterns running
     * next; a bare "final" still matches the anchored form above. */
  }

  /* ─── Competition kind ──────────────────────────────────────────────────
   * Inferred, never typed. The coach picks a competition name in the CMS and
   * this works out whether it behaves like a league (matchdays, a table) or a
   * cup (rounds, an exit). Explicit `kind` on the record always wins.
   */
  function competitionKind(match) {
    if (!match) return 'unknown';
    if (match.kind === 'friendly' || match.compKind) return match.compKind || 'friendly';
    var c = String(match.competition || match.comp || '').toLowerCase();
    if (!c) return 'unknown';
    if (/\bfriendly|pre[\s-]?season\b/.test(c)) return 'friendly';
    if (/\bleague\b|\bdivision\b|\bpremier\b/.test(c)) return 'league';
    if (/\bcup\b|\btrophy\b|\bshield\b|\bplate\b|\bvase\b/.test(c)) return 'cup';
    return 'other';
  }

  /* ─── Our side of the scoreline ─────────────────────────────────────────*/
  function isUs(name) { return /angels/i.test(String(name || '')); }

  function scoreOf(match) {
    if (!match) return null;
    var home = isUs(match.home);
    var hs = num(match.hs), as = num(match.as);
    if (hs === null || as === null) return null;
    return { us: home ? hs : as, them: home ? as : hs, home: home };
  }

  function num(v) {
    if (v === 0) return 0;
    if (v === null || v === undefined || v === '') return null;
    var n = parseInt(v, 10);
    return isNaN(n) ? null : n;
  }

  /* A shootout is stored the same way as the scoreline: `kind:'penalty'` plus
   * `pens:{hs,as}` in HOME/AWAY terms. Flip it to our terms exactly as the
   * live site does, so both apps agree on who won. */
  function pensOf(match) {
    var p = match && match.pens;
    if (!p) return null;
    var hs = num(p.hs), as = num(p.as);
    if (hs === null || as === null) return null;
    var home = isUs(match.home);
    return { us: home ? hs : as, them: home ? as : hs };
  }

  /* A walkover encodes its winner in `wo`: 'H-W' home awarded, 'A-W' away
   * awarded. The live site shortcuts this to "a walkover is always a win",
   * which is true of every walkover recorded so far but would misreport the
   * first one that goes against us. We read the field instead. */
  function walkoverWon(match) {
    var wo = String(match && match.wo || '').toUpperCase();
    if (!wo) return true; /* legacy rows with no `wo`: match the old behaviour */
    return (wo.charAt(0) === 'H') === isUs(match.home);
  }

  /* The club's published result, matching the live site: a shootout counts as
   * a win or a loss, never a draw. Deliberately NOT the same as `result90`.
   * These two must stay distinct, because merging them would silently restate
   * the club's own record either better or worse than it has always read. */
  function resultOf(match) {
    if (!match) return null;
    if (match.kind === 'walkover') return walkoverWon(match) ? 'W' : 'L';
    var s = scoreOf(match);
    if (!s) return null;
    if (match.kind === 'penalty') {
      var p = pensOf(match);
      if (p) return p.us > p.them ? 'W' : 'L';
    }
    if (s.us > s.them) return 'W';
    if (s.us < s.them) return 'L';
    return 'D';
  }

  /* The 90-minute (or 120-minute) result, where a shootout is a draw. This is
   * the football-official reading and the one to use for "never beaten in
   * normal time" style claims. */
  function result90(match) {
    if (!match) return null;
    if (match.kind === 'walkover') return walkoverWon(match) ? 'W' : 'L';
    var s = scoreOf(match);
    if (!s) return null;
    if (s.us > s.them) return 'W';
    if (s.us < s.them) return 'L';
    return 'D';
  }

  /* Who went through. Only meaningful in a cup. */
  function progressed(match) {
    if (!match) return null;
    if (match.kind === 'walkover') return walkoverWon(match);
    var s = scoreOf(match);
    if (!s) return null;
    if (s.us !== s.them) return s.us > s.them;
    var p = pensOf(match);
    if (p) return p.us > p.them;
    return null; /* level with no shootout recorded: genuinely unknown */
  }

  /* ─── The public resolver ───────────────────────────────────────────────
   * One call per match. Everything the front end needs to LABEL a match,
   * pre-computed, so no template has to know the rules.
   */
  function contextOf(match) {
    if (!match) return null;
    var kind = competitionKind(match);
    var round = normaliseRound(match.round);
    var md = num(match.matchday);
    var leg = num(match.leg);
    var s = scoreOf(match);

    var ctx = {
      kind: kind,
      competition: match.competition || match.comp || '',
      round: round,
      roundRaw: match.round || null,
      matchday: md,
      leg: leg,
      replay: !!match.replay,
      neutral: !!match.neutral,
      aet: !!match.aet,
      pens: pensOf(match),
      result: resultOf(match),
      result90: result90(match),
      progressed: kind === 'cup' ? progressed(match) : null,
      score: s
    };

    /* The short badge that sits on a result card: "MD 12", "QF", "SF · Replay" */
    var bits = [];
    if (kind === 'league' && md) bits.push('MD ' + md);
    if (round) bits.push(round.short);
    if (leg) bits.push('Leg ' + leg);
    if (ctx.replay) bits.push('Replay');
    ctx.badge = bits.join(' · ') || null;

    /* The long form for a match header: "Quarter Final · after extra time" */
    var long = [];
    if (kind === 'league' && md) long.push('Matchday ' + md);
    if (round) long.push(round.label);
    else if (match.round) long.push(String(match.round));
    if (leg) long.push('Leg ' + leg + ' of 2');
    if (ctx.replay) long.push('Replay');
    if (ctx.neutral) long.push('Neutral venue');
    ctx.label = long.join(' · ') || null;

    /* How the result actually happened, in words. This is the line that turns
     * "2-2" into a story the reader understands. */
    if (ctx.pens) {
      ctx.decidedBy = (ctx.pens.us > ctx.pens.them ? 'Won' : 'Lost')
        + ' on penalties ' + ctx.pens.us + '-' + ctx.pens.them
        + (ctx.aet ? ', after extra time' : '');
    } else if (ctx.aet) {
      ctx.decidedBy = 'After extra time';
    } else if (match.kind === 'walkover') {
      ctx.decidedBy = walkoverWon(match) ? 'Awarded as a walkover' : 'Conceded as a walkover';
    } else {
      ctx.decidedBy = null;
    }

    return ctx;
  }

  /* ─── Cup runs ──────────────────────────────────────────────────────────
   * Groups a season's cup matches by competition and walks each ladder, so a
   * page can render the run as a progression rather than scattered results:
   *
   *   Dylan Rigobert Trophy 25/26   R32 ✓  R16 ✓  QF ✓  SF ✓  F ✗   RUNNERS-UP
   */
  function cupRuns(matches, season) {
    var byComp = {};
    (matches || []).forEach(function (m) {
      if (competitionKind(m) !== 'cup') return;
      if (season && season !== 'all' && (m.season || null) !== season) return;
      var key = (m.competition || m.comp || 'Cup') + '||' + (m.season || '');
      (byComp[key] || (byComp[key] = [])).push(m);
    });

    return Object.keys(byComp).map(function (key) {
      var list = byComp[key].slice().sort(function (a, b) {
        var ra = normaliseRound(a.round), rb = normaliseRound(b.round);
        return (ra ? ra.order : 0) - (rb ? rb.order : 0);
      });
      var parts = key.split('||');
      var furthest = null, exitAt = null, won = false;

      list.forEach(function (m) {
        var r = normaliseRound(m.round);
        if (r && (!furthest || r.order > furthest.order)) furthest = r;
        var through = progressed(m);
        if (through === false && !exitAt) exitAt = r;
        if (through === true && r && r.code === 'F') won = true;
      });

      return {
        competition: parts[0],
        season: parts[1] || null,
        matches: list.map(function (m) { return { match: m, context: contextOf(m) }; }),
        furthest: furthest,
        exitAt: exitAt,
        won: won,
        /* "Winners" / "Runners-up" / "Reached the Quarter Final" */
        outcome: won ? 'Winners'
          : (exitAt && exitAt.code === 'F') ? 'Runners-up'
          : furthest ? 'Reached the ' + furthest.label
          : null
      };
    }).sort(function (a, b) {
      return (b.furthest ? b.furthest.order : 0) - (a.furthest ? a.furthest.order : 0);
    });
  }

  /* ─── League campaign ───────────────────────────────────────────────────
   * A matchday-ordered walk of the league season with running points, which
   * is what a points-over-time chart and a form string both need.
   *
   * Falls back to date order when matchday is absent, so this returns
   * something useful today and something exact once the numbers are entered.
   */
  function leagueCampaign(matches, season) {
    var list = (matches || []).filter(function (m) {
      if (competitionKind(m) !== 'league') return false;
      if (season && season !== 'all' && (m.season || null) !== season) return false;
      return true;
    });

    var haveMatchdays = list.some(function (m) { return num(m.matchday) !== null; });
    list = list.slice().sort(function (a, b) {
      if (haveMatchdays) {
        var ma = num(a.matchday), mb = num(b.matchday);
        if (ma !== null && mb !== null) return ma - mb;
        if (ma !== null) return -1;
        if (mb !== null) return 1;
      }
      return parseDate(a.date) - parseDate(b.date);
    });

    var pts = 0, w = 0, d = 0, l = 0, gf = 0, ga = 0;
    var rows = list.map(function (m, i) {
      var r = resultOf(m);
      var s = scoreOf(m);
      if (r === 'W') { pts += 3; w++; } else if (r === 'D') { pts += 1; d++; } else if (r === 'L') { l++; }
      if (s) { gf += s.us; ga += s.them; }
      return {
        match: m,
        matchday: num(m.matchday) || (i + 1),
        matchdayExact: num(m.matchday) !== null,
        result: r,
        points: pts,
        scored: s ? s.us : null,
        conceded: s ? s.them : null
      };
    });

    return {
      season: season || null,
      rows: rows,
      played: rows.length,
      won: w, drawn: d, lost: l,
      goalsFor: gf, goalsAgainst: ga, goalDifference: gf - ga,
      points: pts,
      /* Most recent first, capped at 5, the way a table shows form. */
      form: rows.slice(-5).map(function (r) { return r.result; }).reverse().join(''),
      complete: haveMatchdays
    };
  }

  function parseDate(s) {
    var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var m = /^(\d{1,2})\s+(\w{3})\s+(\d{2})$/.exec(String(s || '').trim());
    if (!m) return 0;
    return new Date(2000 + parseInt(m[3], 10), MONTHS.indexOf(m[2]), parseInt(m[1], 10)).getTime();
  }

  /* ─── When we score ─────────────────────────────────────────────────────
   * Goal minutes are ALREADY captured in the CMS and have never once been
   * shown to a visitor. This buckets them, which is the whole feature.
   *
   * `entries` is the saved match-entry data, keyed however the caller has it;
   * pass an array of { goals: [{minute}], opponentGoals: [{minute}] }.
   */
  var BUCKETS = [
    { label: "0-15",  from: 0,  to: 15 },
    { label: "16-30", from: 16, to: 30 },
    { label: "31-45", from: 31, to: 45 },
    { label: "46-60", from: 46, to: 60 },
    { label: "61-75", from: 61, to: 75 },
    { label: "76-90+",from: 76, to: 200 }
  ];

  function goalTiming(entries) {
    var forB = BUCKETS.map(function (b) { return { label: b.label, count: 0 }; });
    var agB  = BUCKETS.map(function (b) { return { label: b.label, count: 0 }; });
    var totalFor = 0, totalAgainst = 0, unknown = 0;

    function put(arr, minute) {
      var mi = num(minute);
      if (mi === null) { unknown++; return false; }
      for (var i = 0; i < BUCKETS.length; i++) {
        if (mi >= BUCKETS[i].from && mi <= BUCKETS[i].to) { arr[i].count++; return true; }
      }
      return false;
    }

    (entries || []).forEach(function (e) {
      (e && e.goals || []).forEach(function (g) { if (put(forB, g.minute)) totalFor++; });
      (e && e.opponentGoals || []).forEach(function (g) { if (put(agB, g.minute)) totalAgainst++; });
    });

    var lateFor = forB[5].count;
    return {
      for: forB,
      against: agB,
      totalFor: totalFor,
      totalAgainst: totalAgainst,
      unknownMinutes: unknown,
      /* The headline stat: share of our goals scored in the last 15. */
      lateShare: totalFor ? Math.round((lateFor / totalFor) * 100) : null
    };
  }

  /* ─── Writing context (the CMS entry point) ─────────────────────────────
   * One sanctioned way to set these fields, so the CMS cannot write a shape
   * the readers above do not understand. Returns only the keys that passed,
   * plus plain-English warnings for the ones that did not, which the CMS can
   * show inline instead of failing silently.
   */
  function sanitiseContext(patch, match) {
    var out = {}, warn = [];
    var p = patch || {};
    var kind = competitionKind(match || {});

    if ('matchday' in p && p.matchday !== '' && p.matchday !== null) {
      var md = num(p.matchday);
      if (md === null || md < 1 || md > 60) warn.push('Matchday must be a number between 1 and 60.');
      else if (kind === 'cup') warn.push('Matchday ignored: this is a cup tie, use a round instead.');
      else out.matchday = md;
    }

    if ('round' in p && p.round) {
      var r = normaliseRound(p.round);
      if (kind === 'league') warn.push('Round ignored: this is a league game, use a matchday instead.');
      else if (!r) { out.round = String(p.round).trim(); warn.push('Round "' + p.round + '" is not a standard name, storing it as typed.'); }
      else out.round = r.code;
    }

    if ('leg' in p && p.leg !== '' && p.leg !== null) {
      var lg = num(p.leg);
      if (lg !== 1 && lg !== 2) warn.push('Leg must be 1 or 2.');
      else out.leg = lg;
    }

    ['replay', 'neutral', 'aet'].forEach(function (k) {
      if (k in p) out[k] = !!p[k];
    });

    if ('pens' in p && p.pens) {
      var ph = num(p.pens.hs), pa = num(p.pens.as);
      if (ph === null || pa === null || ph < 0 || pa < 0) warn.push('Penalty shootout needs two whole numbers.');
      else if (ph === pa) warn.push('A shootout cannot end level.');
      else { out.pens = { hs: ph, as: pa }; out.kind = 'penalty'; }
    }

    /* No attendance field, deliberately. Sunday league crowds are a dozen
     * friends and a dog; publishing the number would make the club read
     * smaller than it is. Left out at Stewart's call, 29 Jul 2026. */

    /* No kit field either. "Unbeaten in the away kit" is Premier League
     * trivia cosplay on a Sunday league site. Cut 29 Jul 2026. */

    if ('summary' in p && typeof p.summary === 'string') {
      var sm = p.summary.trim();
      if (sm.length > 240) warn.push('Summary trimmed to 240 characters.');
      out.summary = sm.slice(0, 240);
    }

    return { fields: out, warnings: warn };
  }

  /* Backfill matchday numbers for a completed league season from date order.
   * Eighteen games already played should not need eighteen manual entries;
   * this proposes the numbers and the CMS confirms them. Only fills gaps
   * unless `force` is set, so a hand-corrected number is never overwritten. */
  function inferMatchdays(matches, season, force) {
    var list = (matches || []).filter(function (m) {
      if (competitionKind(m) !== 'league') return false;
      if (season && season !== 'all' && (m.season || null) !== season) return false;
      return true;
    }).slice().sort(function (a, b) { return parseDate(a.date) - parseDate(b.date); });

    var out = [];
    list.forEach(function (m, i) {
      var existing = num(m.matchday);
      if (existing !== null && !force) return;
      out.push({ id: m.id, matchday: i + 1, was: existing });
    });
    return out;
  }

  /* ─── Export ────────────────────────────────────────────────────────────*/
  var API = {
    ROUNDS: ROUNDS,
    roundByCode: function (c) { return BY_CODE[String(c || '').toUpperCase()] || null; },
    normaliseRound: normaliseRound,
    competitionKind: competitionKind,
    resultOf: resultOf,
    result90: result90,
    progressed: progressed,
    scoreOf: scoreOf,
    pensOf: pensOf,
    contextOf: contextOf,
    cupRuns: cupRuns,
    leagueCampaign: leagueCampaign,
    goalTiming: goalTiming,
    sanitiseContext: sanitiseContext,
    inferMatchdays: inferMatchdays
  };

  root.SA_MATCH = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
}(typeof window !== 'undefined' ? window : globalThis));
