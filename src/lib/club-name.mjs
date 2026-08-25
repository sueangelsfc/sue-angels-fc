/* ==========================================================================
   NAMING AN OPPONENT

   Its own module, and dependency-free on purpose. This reduction is asked for
   in two places that cannot import each other: preseason.mjs, which is the
   season-ahead and next-match wording, and stats.mjs, which groups the
   head-to-head record. preseason.mjs already imports stats.mjs, so putting
   the rule in either one makes a cycle, and copying it into both is how two
   bands on one page end up disagreeing about whether a club has been played.
   ========================================================================== */

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
   that is recorded as a related side and said out loud.

   "MEN'S" IS A LEGAL SUFFIX HERE, NOT A QUALIFIER, and the asymmetry with
   "women's" is deliberate. This is a men's Sunday league: every side in it is
   a men's side, so the word separates no opponent from any other opponent. It
   separates a club's men's team from a women's team this club will never
   face, which is a distinction the site has no use for. A women's or ladies'
   side genuinely is a different set of players, so those stay.

   The archive calls them "BPR Men's" and the fixture list calls them "BPR
   FC", and with "mens" left in they did not even reduce to the same BASE. So
   the home page carried both "A first meeting" and "BPR Men's · Played 2, won
   2" in two bands of the same document. The badge registry had already
   decided the question the other way - one entry, "BPR FC", needle `bpr`,
   resolving both spellings - so the crest beside "A first meeting" was the
   crest of a club the same page said had been beaten twice. */
const LEGAL = /\b(fc|afc|a\.f\.c|f\.c|football club|club|mens?)\b/gi;
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
