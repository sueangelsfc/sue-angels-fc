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
  const extra = {};
  for (const [num, val] of Object.entries(d)) {
    if (!val) continue;
    if (typeof val === 'string') out[String(num)] = { __flat: collapse(val) };
    else if (typeof val === 'object') {
      const bySeason = {};
      for (const [season, entry] of Object.entries(val)) {
        /* FOUR SHAPES NOW, and all of them still read.

             "active"                          a bare key
             { key: "active" }                 the same, with room beside it
             { key: "active", from: "..." }    and the day it started
             { key: "trial", from, until, note, to }

           A key on its own says what somebody is. The fields beside it say
           when it started, when it is expected to end, where they went and
           anything the club wants to add, which is what turns "New signing"
           into "Signed 12 July 2026" and "On trial" into a window with an
           end. The key is kept where the key has always been so nothing that
           reads a status has to know the difference. */
        if (typeof entry === 'string' && entry) bySeason[season] = collapse(entry);
        else if (entry && typeof entry === 'object' && entry.key) {
          bySeason[season] = collapse(entry.key);
          const { key, ...rest } = entry;
          if (Object.keys(rest).length) {
            (extra[String(num)] = extra[String(num)] || {})[season] = rest;
          }
        }
      }
      if (Object.keys(bySeason).length) out[String(num)] = bySeason;
    }
  }
  /* Hung off the record rather than mixed into it, so every existing reader
     keeps getting the plain key it expects. */
  Object.defineProperty(out, '__detail', { value: extra, enumerable: false });
  return out;
}

/* What the club recorded ALONGSIDE a status: when it started, when it is
   expected to end, where somebody went. Empty where nothing was said. */
export function statusDetail(record, num, season) {
  const all = (record && record.__detail) || {};
  return (all[String(num)] && all[String(num)][season]) || {};
}

/* ==========================================================================
   THE DAY SOMEBODY SIGNED BEATS A SHIRT NUMBER

   Appearances are attributed by shirt number, because a Sunday-league team
   sheet is a list of numbers. Numbers get reused. Leon Burnett is number 3
   and signed in the summer of 2026; somebody else wore 3 against Brockwell
   Violets in October 2025. The site read that team sheet as evidence Leon was
   at the club in 25/26, so his first season looked like his second and he was
   left out of the first-appearance list on the page announcing him.

   No derivation can recover this. Which of two men wore a number is a fact
   only the club holds, and the record already has the field for it: `from`,
   the day somebody signed, which the panel asks for. It simply was not
   allowed to win. It should always win, because the two are not the same kind
   of evidence: a signing date is the club stating a fact about a person, and
   a number on a team sheet is an inference about identity from a shirt.

   So a season that ended before a player signed is a season he was not here
   for, whatever a team sheet from it says. Where nothing is recorded the
   evidence still decides, exactly as before, so nothing already saved has to
   be migrated and clubs that never fill this in lose nothing.
   ========================================================================== */
/* `from` MEANS SIX DIFFERENT THINGS and only two of them are joining.
   The panel labels it "The day they signed" on In the squad and "Trial
   started" on On trial - but also "The day they left" on Left the club, "The
   day they retired", "Out since" and "The day they moved across". Reading it
   blind, as this did when it was written, meant a player set to Left the club
   in September 2026 carried a join date of September 2026, and the rule below
   would then erase every season he actually played. Harmless on today's
   record by luck: every departure and retirement on it is dated May or
   January, which lands in the season it belongs to. That is not a reason to
   leave it.

   The status is needed to read the date, so this takes the whole record
   rather than just the detail. */
const JOINING = new Set(['active', 'trial']);

export function signedOn(record, num) {
  const all = (record && record.__detail) || {};
  const bySeason = all[String(num)] || {};
  const keys = record[String(num)] || {};
  let first = '';
  for (const [season, entry] of Object.entries(bySeason)) {
    if (!JOINING.has(keys[season])) continue;
    const d = entry && entry.from;
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d) && (!first || d < first)) first = d.slice(0, 10);
  }
  return first || null;
}

/* True when `season` finished before the player joined. `seasonOf` is passed
   in rather than imported so this module keeps having no dependencies, and so
   the suite runs the shipped rule instead of a copy of it. */
export function joinedAfter(record, num, season, seasons, seasonOf) {
  const from = signedOn(record, num);
  if (!from) return false;
  const joined = seasonOf(from);
  const i = seasons.indexOf(season);
  const j = seasons.indexOf(joined);
  return i >= 0 && j >= 0 && i < j;
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

  /* A SIGNING DATE BEATS A STATUS TYPED AGAINST AN EARLIER SEASON.
     The gate for this used to live only in `wasHere`, which is consulted
     ONLY when a season has no entry - so it did nothing for the three players
     it was written for. The club had set them In the squad for 25/26 as well,
     which is a reasonable thing to do on a screen with a season tab, and that
     explicit entry returned straight from here without the date ever being
     looked at. The two statements contradict each other and the more specific
     one wins: a day is a fact about a person, a season tab is a screen. */
  if (opts.seasonOf && joinedAfter(record, num, season, seasons, opts.seasonOf)) return 'absent';

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
  const t = tenureDetail(record, num, season, opts);
  return t ? t.key : null;
}

/* ==========================================================================
   HOW LONG SOMEBODY HAS BEEN HERE, IN DETAIL

   "New signing" is true of a player for a whole season and says almost
   nothing. It does not say whether he signed in the summer or in January, it
   reads the same in his eighth month as in his first, and it is the same
   three words for a lad who came through pre-season and one who arrived after
   Christmas. "Retained" is worse: it is equally true of a second season and a
   fifth, and a fifth season at a Sunday-league club is the thing worth
   saying.

   Everything below comes out of the record the club already keeps, so it is
   true without anybody maintaining it:

     nth          which season this is for them, counting only seasons they
                  were actually in the squad
     runningFor   how many in a row up to and including this one
     awayFor      seasons between their last spell and this one
     since        the first season they were here
     firstEver    true if the club has never had them before

   `from` is the one thing the record cannot work out, and the panel now asks
   for it: the day somebody signed. With it, a first season becomes "Signed
   12 July 2026" rather than "New signing", and the site can tell a summer
   signing from a January one. Without it nothing breaks and the wording falls
   back to the season.
   ========================================================================== */
export function tenureDetail(record, num, season, opts = {}) {
  const seasons = opts.seasons || [];
  const idx = seasons.indexOf(season);
  if (idx < 0) return null;
  const here = (s) => isPlaying(statusIn(record, num, s, opts));
  if (!here(season)) return null;

  /* Every season up to and including this one that they were in the squad. */
  const past = [];
  for (let i = 0; i <= idx; i += 1) if (here(seasons[i])) past.push(seasons[i]);

  let runningFor = 0;
  for (let i = idx; i >= 0 && here(seasons[i]); i -= 1) runningFor += 1;

  let awayFor = 0;
  if (runningFor === 1 && idx > 0) {
    for (let i = idx - 1; i >= 0 && !here(seasons[i]); i -= 1) awayFor += 1;
  }

  const firstEver = past.length === 1;
  const key = firstEver ? 'new' : (runningFor > 1 ? 'retained' : 'returned');

  /* Everyone is new in the club's first season, which says nothing at all. */
  if (idx === 0) return null;

  return {
    key,
    nth: past.length,
    runningFor,
    awayFor,
    since: past[0] || season,
    firstEver,
    from: signedFrom(record, num, season),
  };
}

/* The day the club says somebody signed, where it has said. Read off the
   season entry, so it belongs to the spell it describes: a player who leaves
   and comes back two years later has two of them and neither overwrites the
   other. */
function signedFrom(record, num, season) {
  return statusDetail(record, num, season).from || '';
}

const ORDINALS = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth',
  'Seventh', 'Eighth', 'Ninth', 'Tenth'];
const COUNTS = ['', 'a', 'two', 'three', 'four', 'five', 'six', 'seven'];

/* The sentence a page prints. Specific first: a date beats a season, a season
   count beats a bare word, and "Retained" on its own is the last resort. */
export function tenureLabel(t, opts = {}) {
  if (!t) return null;
  const month = t.from ? monthYear(t.from, opts) : '';

  if (t.key === 'new') {
    if (month) return `Signed ${month}`;
    return 'First season at the club';
  }
  if (t.key === 'returned') {
    const gap = COUNTS[t.awayFor] || `${t.awayFor}`;
    const back = t.awayFor === 1 ? 'Back after a season away' : `Back after ${gap} seasons away`;
    return month ? `${back}, signed ${month}` : back;
  }
  /* Retained. The season count is the thing worth saying, and it is only
     worth saying once it means something: a second season is a fact, a fifth
     is a story. */
  const nth = ORDINALS[t.nth] || `${t.nth}th`;
  return t.nth >= 2 ? `${nth} season at the club` : 'Retained';
}

/* "July 2026" from an ISO date, or the date as typed if it is not one. */
function monthYear(iso, opts = {}) {
  const m = String(iso).match(/^(\d{4})-(\d{2})/);
  if (!m) return String(iso);
  const names = opts.months || ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return `${names[Number(m[2]) - 1]} ${m[1]}`;
}

/* The one line a page prints. The set status wins when it is something worth
   saying on its own (on trial, injured, unavailable, left, retired, coaching);
   otherwise the worked-out tenure speaks. Plain "in the squad" says nothing a
   squad page has not already said by listing them, so it returns null, and so
   does "absent": a player who was not at the club that season is not on that
   season's page to be labelled. */
export function statusLabelIn(record, num, season, opts = {}) {
  const set = statusIn(record, num, season, opts);
  if (set === 'absent') return { key: 'absent', label: null, derived: false, detail: null };
  const extra = statusDetail(record, num, season);

  if (set !== 'active') {
    /* A SET STATUS, WITH WHAT THE CLUB SAID BESIDE IT. "On trial" is a
       window and now says when it opened; an injury says when it started and
       when he is expected back; a departure says where he went. Each falls
       back to the plain label where nothing was recorded, so a record written
       before any of this still reads properly. */
    return {
      key: set,
      label: STATUS_LABEL[set] || null,
      detail: setSentence(set, extra),
      derived: false,
    };
  }

  const t = tenureDetail(record, num, season, opts);
  if (!t) return { key: 'active', label: null, derived: false, detail: null };
  return {
    key: t.key,
    /* The specific sentence, not the three-word category. This is the whole
       point: "Signed July 2026" and "Fourth season at the club" say something
       "New signing" and "Retained" do not. */
    label: tenureLabel(t, opts),
    category: STATUS_LABEL[t.key],
    tenure: t,
    derived: true,
    detail: null,
  };
}

/* The line under a set status, where the club has given one. */
/* A FREE-TEXT FIELD ATTRACTS A PLACEHOLDER, and a placeholder is not a fact.
   "Where they went" was filled in as "N/A" - a perfectly reasonable thing to
   type when somebody left for nowhere in particular - and the page published
   "Left for N/A" on a player's profile. There is no wording that survives
   that, so the value is treated as nothing said: the sentence falls back to
   "Left in May 2026", which is true and is what the field was optional for.
   Kept here rather than fixed in the record, because the next person to type
   "-" would put it straight back. */
const NOTHING_SAID = new Set(['n/a', 'na', 'n.a.', '-', '--', 'none', 'nil',
  'unknown', 'not known', 'tbc', 'tba', '?', 'no', 'nowhere']);
const said = (v) => {
  const t = String(v == null ? '' : v).trim();
  return t && !NOTHING_SAID.has(t.toLowerCase()) ? t : '';
};

function setSentence(key, x) {
  const from = x.from ? onDate(x.from) : '';
  const until = x.until ? onDate(x.until) : '';
  if (key === 'trial') {
    if (from && until) return `Training with the squad from ${from} to ${until}`;
    if (from) return `Training with the squad since ${from}`;
    return '';
  }
  if (key === 'injured') {
    if (from && until) return `Out since ${from}, expected back ${until}`;
    if (from) return `Out since ${from}`;
    if (until) return `Expected back ${until}`;
    return '';
  }
  if (key === 'departed') {
    const to = said(x.to);
    if (to && from) return `Left for ${to} in ${from}`;
    if (to) return `Left for ${to}`;
    if (from) return `Left in ${from}`;
    return '';
  }
  if (key === 'retired' && from) return `Retired in ${from}`;
  if (key === 'away') return said(x.note);
  return said(x.note);
}

/* "July 2026" from an ISO date; the string as typed if it is not one. */
function onDate(iso, opts = {}) {
  return monthYear(iso, opts);
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
