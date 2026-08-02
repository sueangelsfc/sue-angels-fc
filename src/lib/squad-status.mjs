/* ==========================================================================
   WHAT A PLAYER IS, AND WHEN

   THE PROBLEM THIS EXISTS TO FIX.
   Squad status was one value per player: `{ "7": "retired" }`. No season, no
   date, no history. Four things followed from that, all of them wrong and all
   of them live until now.

   1. "Retained for 26/27" was a literal string, typed into two files. Come
      July 2027 every retained player still read "Retained for 26/27" and only
      a developer could change it.
   2. "New signing" never expired. Somebody who signed in July 2026 was still
      a new signing in 2028.
   3. "On trial" had no end. A trial is a window by definition - a few weeks
      training with the squad, after which you are signed or you are not - and
      the record could not say the window had closed. Once set it was
      permanent.
   4. Every figure on the squad page is now per-season, and the status beside
      it was not. Switch /squad.html to 25/26 and a player who left in June
      2026 was labelled "Left the club" on a season he played twenty-nine
      times in.

   WHAT REPLACED IT.
   A status is a fact about a player IN A SEASON:

       { "7": { "25/26": "active", "26/27": "retired" } }

   The old flat shape is still read, and is taken to mean the current season,
   so nothing already saved is lost.

   AND THREE OF THE NINE STATUSES ARE NOT TYPED ANY MORE.
   Once the record knows which seasons a player was in the squad, "new",
   "retained" and "returned" are not opinions, they are arithmetic:

     new       in the squad this season, and in no season before it
     retained  in the squad this season and in the one immediately before
     returned  in the squad this season, not in the one before, but in one
               before that

   So the club never says them and can never get them wrong, they correct
   themselves as seasons pass, and they carry the season they refer to rather
   than a number baked into a string. The dropdown asks only for what the
   club actually knows and the site cannot work out on its own.
   ========================================================================== */

/* What the club SETS, per season. `playing` is what puts somebody in the
   squad on the website; the rest move them to Those who came before, keeping
   their profile and their whole record rather than deleting them. */
export const SET_STATUSES = [
  { key: 'active', label: 'In the squad', playing: true,
    hint: 'Training and available for selection this season.' },
  { key: 'trial', label: 'On trial', playing: true,
    hint: 'Training with the squad this season, not signed. Set it to In the squad '
      + 'once they sign, or Left the club if they do not: a trial belongs to the '
      + 'season it happened in and does not follow them into the next one.' },
  { key: 'injured', label: 'Injured, long term', playing: true,
    hint: 'Still a squad member this season, not available to play.' },
  { key: 'away', label: 'Unavailable this season', playing: true,
    hint: 'On the books but out for the season: work, travel, studying, a new baby. '
      + 'Different from having left, and they come back by being set to In the squad '
      + 'for the next one.' },
  { key: 'retired', label: 'Retired from playing', playing: false,
    hint: 'Hung up the boots. Keeps every appearance and goal.' },
  { key: 'departed', label: 'Left the club', playing: false,
    hint: 'Moved on. Keeps every appearance and goal.' },
  { key: 'staff', label: 'Moved into coaching', playing: false,
    hint: 'Off the pitch and onto the touchline. Also added to the coaching staff.' },
];

/* What the site WORKS OUT, from the seasons a player has been in the squad.
   Never offered in the dropdown, because nobody should have to keep them
   true. `over` is what a status label reads as when it applies. */
export const DERIVED_STATUSES = [
  { key: 'new', label: 'New signing',
    hint: 'First season at the club.' },
  { key: 'retained', label: 'Retained',
    hint: 'Here last season and signed on again.' },
  { key: 'returned', label: 'Back at the club',
    hint: 'Played here before, was away, and is back.' },
];

/* Everything the site can say about a player, set or derived, so a lookup
   never has to know which kind it is holding. */
export const STATUS_LABEL = Object.fromEntries(
  [...SET_STATUSES, ...DERIVED_STATUSES].map((s) => [s.key, s.label]),
);
export const STATUS_HINT = Object.fromEntries(
  [...SET_STATUSES, ...DERIVED_STATUSES].map((s) => [s.key, s.hint]),
);
export const PLAYING = Object.fromEntries(SET_STATUSES.map((s) => [s.key, s.playing]));
/* Not at the club that season at all. Never set by anybody: it is what the
   record says when there is no entry for a season and no evidence the player
   was there, and it is what makes "new signing" and "back at the club"
   derivable rather than typed. */
PLAYING.absent = false;
export const isPlaying = (key) => PLAYING[key] !== false;

/* The three the site works out are all forms of being in the squad, so a
   caller asking "are they in the squad" gets yes for them too. */
DERIVED_STATUSES.forEach((s) => { PLAYING[s.key] = true; });

/* ---- Reading the record ------------------------------------------------
   Three shapes have been written to `roster:status` by three generations of
   this tool, and all three are still readable:

     { "7": "retired" }                      the flat one, before seasons
     { status: { "7": "retired" } }          the same, wrapped
     { status: { "7": { "25/26": "..." } } } per season

   A flat value is taken as the CURRENT season's status, which is what it
   meant when it was written. Statuses the club no longer sets - new,
   retained, returned - are read as "in the squad", because that is what they
   said; the derivation below then works out which of them applies now.
   ------------------------------------------------------------------------ */
const RETIRED_KEYS = new Set(['new', 'retained', 'returned']);

export function readStatusRecord(raw) {
  const d = (raw && raw.status) || raw || {};
  const out = {};
  for (const [num, val] of Object.entries(d)) {
    if (!val) continue;
    if (typeof val === 'string') out[String(num)] = { __flat: collapse(val) };
    else if (typeof val === 'object') {
      const bySeason = {};
      for (const [season, key] of Object.entries(val)) {
        if (typeof key === 'string' && key) bySeason[season] = collapse(key);
      }
      if (Object.keys(bySeason).length) out[String(num)] = bySeason;
    }
  }
  return out;
}

const collapse = (key) => (RETIRED_KEYS.has(key) ? 'active' : key);

/* WHAT SOMEBODY WAS IN A GIVEN SEASON.

   A flat record is what the club last said about a player, so it belongs to
   the LATEST season the club knows about, not to whichever season is being
   asked about. Reading it as the answer for every season is what made a man
   who played twenty-nine times in 25/26 read "Retired from playing" over
   those twenty-nine games.

   For any earlier season with nothing recorded, the answer comes from
   EVIDENCE rather than assumption: `wasHere(num, season)` says whether the
   player was named in a match that season. Assuming "he must have been here"
   was just as wrong in the other direction, and would have labelled a player
   signed this summer as retained from a season he never saw. */
export function statusIn(record, num, season, opts = {}) {
  const seasons = opts.seasons || [];
  const latest = opts.latestSeason || seasons[seasons.length - 1];
  const wasHere = opts.wasHere || (() => true);
  const rec = record[String(num)];

  if (rec && !rec.__flat && rec[season]) return rec[season];
  if (rec && rec.__flat && season === latest) return rec.__flat;

  if (rec && !rec.__flat) {
    /* Carry the most recent EARLIER answer forward, so setting somebody to
       departed in 26/27 does not make 27/28 forget. */
    const idx = seasons.indexOf(season);
    for (let i = idx - 1; i >= 0; i--) if (rec[seasons[i]]) return rec[seasons[i]];
  }
  /* Nothing recorded for this season. Was he actually here? */
  if (wasHere(num, season)) return 'active';
  /* Not recorded and no evidence: he was not at the club that season. This is
     a real answer, not a missing one, and it is what lets "new signing" and
     "back at the club" be worked out instead of typed. */
  return 'absent';
}

/* WHICH OF new / retained / returned APPLIES, if any.
   Returns null when the player is not in the squad that season, or when the
   season is the club's first and "new signing" would be true of everybody.
   `opts.seasons` must be in chronological order. */
export function tenureIn(record, num, season, opts = {}) {
  const seasons = opts.seasons || [];
  const idx = seasons.indexOf(season);
  if (idx < 0) return null;
  const here = (s) => isPlaying(statusIn(record, num, s, opts));
  if (!here(season)) return null;
  /* Everyone is new in the club's first season, which says nothing. */
  if (idx === 0) return null;
  if (here(seasons[idx - 1])) return 'retained';
  for (let i = idx - 2; i >= 0; i--) if (here(seasons[i])) return 'returned';
  return 'new';
}

/* The one line a page prints. The set status wins when it is something worth
   saying on its own (on trial, injured, unavailable, left, retired, coaching);
   otherwise the worked-out tenure speaks. Plain "in the squad" says nothing a
   squad page has not already said by listing them, so it returns null, and so
   does "absent": a player who was not at the club that season is not on that
   season's page to be labelled. */
export function statusLabelIn(record, num, season, opts = {}) {
  const set = statusIn(record, num, season, opts);
  if (set === 'absent') return { key: 'absent', label: null, derived: false };
  if (set !== 'active') return { key: set, label: STATUS_LABEL[set] || null, derived: false };
  const t = tenureIn(record, num, season, opts);
  return t ? { key: t, label: STATUS_LABEL[t], derived: true } : { key: 'active', label: null, derived: false };
}

/* Writing. Always produces the per-season shape, and preserves every season
   already recorded, including ones this tool has never heard of. */
export function withStatus(raw, num, season, key) {
  const d = (raw && raw.status) || raw || {};
  const prev = d[String(num)];
  const bySeason = (prev && typeof prev === 'object') ? { ...prev } : {};
  /* A flat value being replaced is what the player was in the CURRENT season,
     so it is kept as that rather than thrown away. */
  if (typeof prev === 'string' && prev) bySeason[season] = bySeason[season] || prev;
  bySeason[season] = key;
  return { ...d, [String(num)]: bySeason };
}

export const STATUS_VOCAB = {
  set: SET_STATUSES,
  derived: DERIVED_STATUSES,
};
