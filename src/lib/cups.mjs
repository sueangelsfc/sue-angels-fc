/* ==========================================================================
   A CUP ROUTE, DERIVED FROM THE DRAW

   The league publishes each cup as a full bracket of ties, and a tie is
   printed "home -v- away". So two things the club kept asking are already in
   it and neither needs inferring:

   - WHICH SIDE WE ARE ON. Home or away is read off the draw, every round to
     the final, because the draw has already decided it.
   - WHO WE COULD MEET. A side reading "Winner of Tie N" is a branch, so the
     full list of possible opponents for a round is every club feeding it.

   The one thing the draw does not say is what division anybody plays in, and
   that is the question the club actually asked. It comes from the eleven
   league tables in cups-2627.json, which are a fact about the day they were
   transcribed and will go stale; `divisionsAsOf` says which day.

   NOTHING HERE READS A RESULT. The route is the draw, so it says what is
   possible rather than what has happened: once a tie is played the losing
   branch is still listed, and that is correct until the club records the
   result and the fixture itself takes over.
   ========================================================================== */

const WINNER = /^winner of tie\s+(\d+)$/i;

/** The ties of one cup, keyed by number, with the rounds in printed order. */
function index(cup) {
  const byNum = new Map((cup.ties || []).map((t) => [t.n, t]));
  const rounds = [];
  for (const t of cup.ties || []) if (!rounds.includes(t.round)) rounds.push(t.round);
  return { byNum, rounds };
}

/** Every club that can arrive at this side of a tie, following the branches. */
export function clubsUnder(side, byNum, seen = new Set()) {
  const m = WINNER.exec(String(side || '').trim());
  if (!m) return side ? [side] : [];
  const n = Number(m[1]);
  /* A draw should be a tree, but a malformed one must not hang a build: the
     deploy runs the generator, so a cycle here would fail the club's publish
     rather than printing one round oddly. */
  if (seen.has(n)) return [];
  seen.add(n);
  const t = byNum.get(n);
  if (!t) return [];
  return [...clubsUnder(t.home, byNum, seen), ...clubsUnder(t.away, byNum, seen)];
}

/**
 * The club's path through one cup: one entry per round it can reach, each
 * saying home or away and who it could be against.
 */
export function routeThrough(cup, club) {
  const { byNum } = index(cup);
  const isUs = (s) => String(s || '').trim() === club;
  let tie = (cup.ties || []).find((t) => isUs(t.home) || isUs(t.away));
  if (!tie) return [];

  const out = [];
  const seen = new Set();
  while (tie && !seen.has(tie.n)) {
    seen.add(tie.n);
    const home = isUs(tie.home) || (out.length > 0 && !isUs(tie.away)
      && WINNER.test(String(tie.home)) && feeds(tie.home, out[out.length - 1].tie, byNum));
    /* Which side we are on is whichever side resolves to us: in round one by
       name, and after that by carrying the tie we just came out of. */
    const ours = isUs(tie.home) ? 'home'
      : isUs(tie.away) ? 'away'
        : carries(tie.home, out[out.length - 1].tie) ? 'home' : 'away';
    const other = ours === 'home' ? tie.away : tie.home;
    out.push({
      tie: tie.n,
      round: tie.round,
      home: ours === 'home',
      opponents: clubsUnder(other, byNum),
      decided: !WINNER.test(String(other).trim()),
    });
    tie = (cup.ties || []).find((t) => carries(t.home, tie.n) || carries(t.away, tie.n));
  }
  return out;

  function carries(side, n) {
    const m = WINNER.exec(String(side || '').trim());
    return !!m && Number(m[1]) === n;
  }
  function feeds() { return false; }
}

/** How a division compares with ours: -1 above, 0 the same, 1 below, null unknown. */
export function divisionRank(data, division) {
  const i = (data.divisions || []).indexOf(division);
  return i < 0 ? null : i;
}

/**
 * The whole answer for one club: each cup, each round, home or away, who it
 * could be against and what division each of them is in.
 */
export function cupRoutes(data, club) {
  const of = data.divisionOf || {};
  const ours = divisionRank(data, of[club]);
  /* A FINAL IS AT A NEUTRAL GROUND AND NEITHER CLUB IS AT HOME IN IT. The
     draw still prints one, because a bracket has to name the sides, and
     repeating that would tell the club it was at The Reeves for a match
     played somewhere else. The rounds are named in the data, not detected
     from the word "Final" here, because which ones are neutral is the
     league's decision. */
  const neutral = new Set(data.neutralRounds || []);
  return (data.cups || []).map((cup) => ({
    id: cup.id,
    name: cup.name,
    short: cup.short || cup.name,
    rounds: routeThrough(cup, club).map((r) => ({
      ...r,
      neutral: neutral.has(r.round),
      opponents: r.opponents.map((name) => {
        const division = of[name] || '';
        const rank = divisionRank(data, division);
        return {
          name,
          division,
          /* Said in words, because "League Nine" means nothing to a reader who
             does not know League Eight is the eighth of eleven. */
          where: rank == null || ours == null ? ''
            : rank < ours ? 'higher' : rank > ours ? 'lower' : 'same',
        };
      }).sort((a, b) => (divisionRank(data, a.division) ?? 99) - (divisionRank(data, b.division) ?? 99)
        || a.name.localeCompare(b.name)),
    })),
  }));
}
