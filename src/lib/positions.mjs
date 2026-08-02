/* ==========================================================================
   WHERE A PLAYER LINES UP

   One list. It was three, and they disagreed.

   `POSITION_LABEL` in club.mjs knew twenty-one codes. The player profile knew
   twenty-six. The control panel's dropdown offered twenty-two. So the club's
   own archive contained team sheets using RDM and LAM, which two of the three
   had never heard of, and the player page printed the raw code: a profile that
   said "Left wing back" on one line and "RDM" on the next, which reads as a
   fault rather than as a position.

   Every code the site has ever stored is here, with a full name, a group and a
   place on the pitch. Nothing falls through to an abbreviation any more.

   FULL NAMES EVERYWHERE TEXT IS READ. `name` is what a person reads: the
   dropdown when a team sheet is filled in, the player profile, the squad page.
   The two-or-three letter `code` survives for exactly one job, which is the
   marker on the pitch diagram: a 26px disc cannot hold "Left centre back", and
   a pitch diagram is the one place in football where everybody already reads
   the short form. It carries the full name as its title either way.

   `x` and `y` are percentages on a portrait pitch attacking upward, shared by
   the panel's team-sheet pitch and the profile's heat map so a shape drawn
   when a match was recorded is the shape drawn on the player's page.

   Sourced against the standard set (Wikipedia's association football
   positions, and the side-specific codes the club's own team sheets use)
   rather than invented here.
   ========================================================================== */

export const POSITIONS = [
  /* ---- Goalkeeper ---- */
  { code: 'GK', name: 'Goalkeeper', group: 'gk', x: 50, y: 92 },
  { code: 'SK', name: 'Sweeper keeper', group: 'gk', x: 50, y: 88 },

  /* ---- Defence ----
     A back four is written LCB and RCB on a team sheet, and collapsing both to
     "Centre back" threw away which side of the pair somebody played, which is
     the whole point of recording it. */
  { code: 'SW', name: 'Sweeper', group: 'def', x: 50, y: 86 },
  { code: 'CB', name: 'Centre back', group: 'def', x: 50, y: 80 },
  { code: 'LCB', name: 'Left centre back', group: 'def', x: 35, y: 81 },
  { code: 'RCB', name: 'Right centre back', group: 'def', x: 65, y: 81 },
  { code: 'LB', name: 'Left back', group: 'def', x: 15, y: 75 },
  { code: 'RB', name: 'Right back', group: 'def', x: 85, y: 75 },
  { code: 'LWB', name: 'Left wing back', group: 'def', x: 13, y: 64 },
  { code: 'RWB', name: 'Right wing back', group: 'def', x: 87, y: 64 },

  /* ---- Midfield ---- */
  { code: 'CDM', name: 'Defensive midfielder', group: 'mid', x: 50, y: 66 },
  { code: 'DM', name: 'Defensive midfielder', group: 'mid', x: 50, y: 66 },
  { code: 'LDM', name: 'Left defensive midfielder', group: 'mid', x: 37, y: 67 },
  { code: 'RDM', name: 'Right defensive midfielder', group: 'mid', x: 63, y: 67 },
  { code: 'CM', name: 'Central midfielder', group: 'mid', x: 50, y: 51 },
  { code: 'LCM', name: 'Left central midfielder', group: 'mid', x: 33, y: 52 },
  { code: 'RCM', name: 'Right central midfielder', group: 'mid', x: 67, y: 52 },
  { code: 'LM', name: 'Left midfielder', group: 'mid', x: 15, y: 49 },
  { code: 'RM', name: 'Right midfielder', group: 'mid', x: 85, y: 49 },
  { code: 'CAM', name: 'Attacking midfielder', group: 'mid', x: 50, y: 37 },
  { code: 'AM', name: 'Attacking midfielder', group: 'mid', x: 50, y: 37 },
  { code: 'LAM', name: 'Left attacking midfielder', group: 'mid', x: 34, y: 38 },
  { code: 'RAM', name: 'Right attacking midfielder', group: 'mid', x: 66, y: 38 },

  /* ---- Attack ---- */
  { code: 'LW', name: 'Left winger', group: 'fwd', x: 17, y: 27 },
  { code: 'RW', name: 'Right winger', group: 'fwd', x: 83, y: 27 },
  { code: 'LF', name: 'Left forward', group: 'fwd', x: 32, y: 22 },
  { code: 'RF', name: 'Right forward', group: 'fwd', x: 68, y: 22 },
  { code: 'SS', name: 'Second striker', group: 'fwd', x: 50, y: 28 },
  { code: 'CF', name: 'Centre forward', group: 'fwd', x: 50, y: 21 },
  { code: 'ST', name: 'Striker', group: 'fwd', x: 50, y: 14 },
];

/* The order a team sheet is filled in: back to front, left to right, so the
   dropdown reads like a line-up rather than like an alphabet. */
export const POSITION_CODES = POSITIONS.map((p) => p.code);

export const POSITION_LABEL = Object.fromEntries(POSITIONS.map((p) => [p.code, p.name]));

export const POSITION_XY = Object.fromEntries(POSITIONS.map((p) => [p.code, [p.x, p.y]]));

export const POSITION_GROUPS = [
  { key: 'gk', label: 'Goalkeepers', one: 'Goalkeeper' },
  { key: 'def', label: 'Defenders', one: 'Defender' },
  { key: 'mid', label: 'Midfielders', one: 'Midfielder' },
  { key: 'fwd', label: 'Forwards', one: 'Forward' },
].map((g) => ({ ...g, codes: POSITIONS.filter((p) => p.group === g.key).map((p) => p.code) }));

/* Never returns a bare code. An unknown one becomes "Squad player", which is
   an honest thing to call somebody, where "RDM" is a thing to call a column
   in a database. */
export const positionName = (code) => POSITION_LABEL[String(code || '').toUpperCase()] || 'Squad player';

/* Shipped to the control panel so its team-sheet dropdown offers exactly the
   positions the site can name and draw. */
export const POSITION_VOCAB = POSITIONS.map(({ code, name, group, x, y }) => ({ code, name, group, x, y }));
