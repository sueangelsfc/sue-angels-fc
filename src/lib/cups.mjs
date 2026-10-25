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

/**
 * Clubs knocked out of a cup, DERIVED from the scorelines the file records
 * rather than listed by hand, because a list of losers is a second place for
 * the same fact to be wrong.
 *
 * A tie with no recorded result leaves BOTH clubs in. Absent means nobody has
 * seen a score, never that somebody went out - this file is transcribed by
 * hand from the league's pages and is always behind the football. The honest
 * failure is listing a club that has actually gone out; claiming one is out
 * when it is not would delete a side we could genuinely meet.
 *
 * A DRAWN tie eliminates nobody BY ITS SCORELINE, and the league prints the
 * shootout beside it, so where one is recorded it decides the tie exactly as
 * a scoreline does. A draw with no shootout on record still eliminates
 * nobody: a replay is coming, or nobody has read the result yet, and those
 * are the same thing from here. An ABANDONED tie is recorded as no result at
 * all, for the same reason.
 *
 * A WALKOVER HAS A WINNER AND NO SCORE, and reading it off a scoreline is
 * impossible, because the league prints no goals for one: the table counts a
 * walkover as three points and nothing else, which is the rule this site
 * already keeps everywhere it counts a match. So the tie carries `wo`,
 * `H-W` or `A-W`, exactly as a match record does, and the club that did not
 * get the walkover is out. Without this a walkover read as a missing score
 * and left BOTH clubs in the route, which is the one direction this function
 * is allowed to be wrong in - but it would have left Pure Football FC 1st
 * Team listed as a side we could meet in a cup they are out of.
 */
export function winnerOf(r) {
  if (!r) return null;
  if (r.wo === 'H-W') return 'home';
  if (r.wo === 'A-W') return 'away';
  const hs = Number(r.hs);
  const as = Number(r.as);
  if (!Number.isFinite(hs) || !Number.isFinite(as)) return null;
  if (hs !== as) return hs > as ? 'home' : 'away';
  /* Level after ninety minutes, so the tie is settled by the shootout if the
     league printed one, and by nothing at all if it did not. */
  const m = /^(\d+)\s*-\s*(\d+)$/.exec(String(r.pens || '').trim());
  if (!m || m[1] === m[2]) return null;
  return Number(m[1]) > Number(m[2]) ? 'home' : 'away';
}

export function eliminated(cup) {
  const { byNum } = index(cup);
  const gone = new Set();
  const out = (club) => {
    /* "Winner of Tie 7" is a branch, not a club, so it cannot be knocked out. */
    if (club && !WINNER.test(String(club).trim())) gone.add(String(club).trim());
  };
  for (const r of cup.results || []) {
    const tie = byNum.get(Number(r.n));
    if (!tie) continue;
    const won = winnerOf(r);
    if (!won) continue;
    out(won === 'home' ? tie.away : tie.home);
  }
  return gone;
}

/** The shootout as the club reads it, ours first, or null where there was none. */
function shootout(r, weAreHome) {
  const m = /^(\d+)\s*-\s*(\d+)$/.exec(String((r && r.pens) || '').trim());
  if (!m) return null;
  const us = Number(weAreHome ? m[1] : m[2]);
  const them = Number(weAreHome ? m[2] : m[1]);
  return { us, them, won: us > them };
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
  return (data.cups || []).map((cup) => {
    const out = eliminated(cup);
    /* A ROUTE STOPS WHERE THE CLUB DOES.

       The bracket runs to the final whatever happens, so with nothing reading
       the results this band went on printing the quarter-final, the semi and
       the final of a cup the club was already out of - and the heading over
       it says "How far it could go", which turns a stale list into a claim.
       On 25 October 2026 that was live: a 0-0 at Juizo FC, lost 4-3 on
       penalties, and the Marcus Lipton Cup route still showed four rounds
       ahead.

       The exit is the club's OWN tie, read the same way every other tie is
       read, so a round the club won can never end the route and a round
       nobody has played cannot either. Rounds past it are dropped rather
       than greyed: a cup the club is out of has no next round for it. */
    const byN = new Map((cup.results || []).map((r) => [Number(r.n), r]));
    const all = routeThrough(cup, club);
    let exit = -1;
    for (let i = 0; i < all.length; i += 1) {
      const won = winnerOf(byN.get(all[i].tie));
      if (!won) break;
      if ((won === 'home') !== all[i].home) { exit = i; break; }
    }
    const mapped = all.map((r) => ({
      ...r,
      neutral: neutral.has(r.round),
      /* A CLUB THAT HAS GONE OUT IS NOT SOMEBODY WE COULD STILL MEET. The
         bracket can only say who MIGHT arrive in a round; once a tie has been
         played, half of it cannot.

         A round the draw already names is left alone, even when its club has
         been knocked out - that is OUR tie, and the one we have just played
         is exactly the case: beating Peps All Stars put them out, and pruning
         them would blank the round we won. Only the speculative sets are
         pruned. */
      opponents: (r.decided ? r.opponents : r.opponents.filter((n) => !out.has(n))).map((name) => {
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
    }));
    return {
    id: cup.id,
    name: cup.name,
    short: cup.short || cup.name,
    knockedOut: exit < 0 ? null : {
      round: all[exit].round,
      /* The shootout is the league's, not the match record's: a stored match
         carries no shootout, which is why the Kew Antigua tie of April names
         no winner. Printing it here says what happened without the site
         inventing a scoreline. */
      pens: shootout(byN.get(all[exit].tie), all[exit].home),
    },
    /* `bracket` is every round of the draw on this club's side of it and
       `rounds` is the part that is still the club's: they are the same list
       until the club goes out. Both are published because they answer two
       different questions - what the league drew, which is a fact about the
       bracket and stays true, and how far this club can go, which is a claim
       about the club and stopped being true at Juizo. A check about the draw
       asks `bracket`, so going out of a cup cannot quietly delete it. */
    bracket: mapped,
    rounds: exit < 0 ? mapped : mapped.slice(0, exit + 1),
  }; });
}
