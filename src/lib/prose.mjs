/* ==========================================================================
   HOUSE STYLE FOR CLUB-WRITTEN PROSE

   Everything the site says in its own voice is written in this repository and
   already follows the conventions. Everything the CLUB writes - match
   reports, article ledes, player bios, award citations - arrives through the
   control panel, typed on a phone or pasted out of somewhere else, and
   arrives in whatever typography that somewhere else used.

   The corpus as it stands proves the point: 52 em dashes against 2 en dashes,
   260 straight apostrophes against 56 curly ones, and "Division Ten" in 24
   places for a league the rest of the site calls League Ten. Two match
   reports sat next to each other in the same list, one curly and one
   straight, because they were written on different days.

   So this runs once, where club text enters the build, rather than at each of
   the fourteen places that render a piece of it. A render site cannot forget
   to call it and two pages cannot disagree about how the same sentence is
   punctuated.

   WHAT IT DOES NOT DO is change the words. It sets dashes, quotes and the
   league's name. It does not rewrite a sentence, cut a clause, or touch
   anything a coach actually chose to say.
   ========================================================================== */

/* The league is League Ten and League Eight, never Division Ten. It is the
   club's own convention and the reason for it is that the Southern Sunday
   Football League calls them leagues; "Division" is what everybody types out
   of habit from the other league they played in.

   The lookahead is what keeps it safe: only a Division followed by the name
   of a league is renamed, so "the youth division" or a divisional cup stays
   as written. */
const LEAGUE_WORD = /\bDivision\b(?=\s+(?:One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve|\d+)\b)/g;

export function house(text) {
  if (typeof text !== 'string' || !text) return text;
  let s = text;

  /* An em dash between clauses becomes a spaced en dash, which is the British
     setting and the one the rest of the site uses. Both spellings arrive:
     "control—dominant" and "memory — a performance", so the spacing either
     side is absorbed rather than assumed.

     Flanked by digits it is a range, not a break, and takes an unspaced en
     dash: a 10-1 scoreline must not become 10 – 1. */
  s = s.replace(/(\d)\s*—\s*(\d)/g, '$1–$2');
  s = s.replace(/\s*—\s*/g, ' – ');

  /* Apostrophes. The intra-word case is every contraction and possessive
     (Sue's, don't, we'd), and the trailing case is the plural possessive that
     Old Freemen's and the lads' own writing both produce. */
  s = s.replace(/(\p{L})'(\p{L})/gu, '$1’$2');
  s = s.replace(/(\p{L})'(?=\s|$|[.,;:!?)\]])/gu, '$1’');

  /* Straight double quotes, in pairs, so an opening one is not left curling
     the wrong way. An odd number is left exactly as typed rather than guessed
     at. */
  if (((s.match(/"/g) || []).length % 2) === 0) {
    s = s.replace(/"([^"]*)"/g, '“$1”');
  }

  s = s.replace(LEAGUE_WORD, 'League');

  return s;
}

/* ==========================================================================
   WHICH TEXT IS "THE REPORT"

   The panel holds two fields against a match: `commentary` is the bullets the
   coach types, `polishedReport` is the article built from them. The second
   box is labelled "What the website publishes" and the Clear button beside it
   promises that clearing it "falls back to your notes as they are".

   Four places on the site decided what the report was, and they gave three
   different answers. The match page read `commentary` alone, so the article
   was never published and Clear it changed nothing. The results list counted
   any commentary at all, so a 142-character note put a Read the report link
   on a card whose page then said no report had been written. The news feed
   built its lede from the notes as well, so the feed advertised the rough
   version of a report that existed in full.

   One answer, in one place, and the panel's promise holds.
   ========================================================================== */
export const reportText = (m) => String(
  m?.detail?.polishedReport || m?.detail?.commentary || '',
).trim();

/* Long enough to be a report rather than a caption. Three matches carry a
   140-to-170 character note, which is a scoreline in a sentence: worth
   keeping in the record, not worth a heading promising the full report. */
export const hasReport = (m) => reportText(m).length > 200;

/* The fields the club writes into. Named rather than inferred: a walk that
   normalised every string it met would reach the base64 photographs, the
   storage URLs and the row keys, and an apostrophe rule has no business
   anywhere near any of those.

   Derived from the data itself - every string field over 25 characters that
   holds a sentence. Adding a prose field to a record means adding it here. */
export const PROSE_FIELDS = new Set([
  'lede', 'polishedReport', 'polishedPreview', 'commentary', 'preview',
  'bio', 'reason', 'title', 'caption', 'venue',
]);

/* Applied to a whole table's worth of records. Walks the tree, rewrites the
   prose fields it recognises and returns everything else byte for byte, so a
   record shape this file has never heard of survives passing through it. */
export function houseRecord(value, key) {
  if (typeof value === 'string') return PROSE_FIELDS.has(key) ? house(value) : value;
  if (Array.isArray(value)) return value.map((v) => houseRecord(v, key));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = houseRecord(v, k);
    return out;
  }
  return value;
}

/* ==========================================================================
   WHAT A FRIENDLY COUNTS FOR, said in one place.

   The rule itself lives in stats.mjs (`isFriendly`) and it is applied
   everywhere it should be: a friendly reaches no club total, no player total,
   no league table and no club record. What was missing is that the site never
   SAID so, and in one place said the opposite. Ade Owolona started, scored
   and made one on 2 August 2026; his profile's 26/27 panel read "Nothing has
   been played in 26/27 that we hold a team sheet for."

   A page is entitled to exclude something. It is not entitled to deny it
   happened. So the exclusion is stated wherever a friendly's figures are in
   view, and the empty state now distinguishes a season that has not started
   from one whose only match does not count.

   Defined here rather than typed into four templates, for the reason every
   other shared string is: two of them would drift, and the one on the match
   card would be the one nobody re-read. */
export const FRIENDLY_FLAG = 'Friendly · not counted';
export const FRIENDLY_NOTE = 'Friendlies stand on their own. Nothing from this match counts '
  + 'towards any club or player record on this site.';
/* THE SAME SENTENCE UNDER A SET OF MATCHES, not one. `FRIENDLY_NOTE` sat under
   the pre-season band's table of six friendlies saying "this match", which
   reads as a note written for a match page and left where it did not belong.
   Two callers, two numbers, so two strings, both here so neither drifts. */
export const FRIENDLY_NOTE_SET = 'Friendlies stand on their own. Nothing from these matches '
  + 'counts towards any club or player record on this site.';
export const FRIENDLY_NOTE_SHORT = 'Friendlies count towards no club or player record here.';
