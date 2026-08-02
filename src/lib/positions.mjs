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

   A ROLE IS ATTACHED TO A POSITION, NOT INSTEAD OF ONE.
   A false nine is a centre forward with a job. An inverted winger is a winger
   with an instruction. They were briefly in the list above as though they were
   separate places on the pitch, which is wrong twice over: it asked somebody
   to choose between recording where a player stood and recording what he was
   doing there, and it put a role in the formation count, so an eleven full of
   them could not be read as a shape at all.

   So ROLES is its own list, each one naming the positions it can attach to.
   A team sheet records both: `positions: ['ST'], role: 'F9'` is a striker
   playing as a false nine. Everything derived from where a player stood
   (the formation, the pitch, the heat map, the statistics) reads `positions`
   and is untouched by any of this.

   Sourced against the standard set (Wikipedia's association football
   positions, the side-specific codes the club's own team sheets use, and the
   modern role vocabulary as football actually defines it) rather than
   invented here.
   ========================================================================== */

export const POSITIONS = [
  /* ---- Goalkeeper ---- */
  { code: 'GK', name: 'Goalkeeper', group: 'gk', x: 50, y: 92 },

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

/* ==========================================================================
   WHAT HE WAS ASKED TO DO THERE

   Optional, and separate from the position on purpose. `for` names the
   positions a role can attach to, so the team sheet only ever offers roles
   that make sense for where the player is standing: nobody is asked whether
   their left back was a poacher.

   These are the ones a Sunday-league manager would actually write down.
   Football has a longer list, most of it invented by a video game, and a
   dropdown of forty instructions nobody uses is worse than no dropdown at
   all. Definitions follow how the game uses the terms.
   ========================================================================== */
export const ROLES = [
  /* ---- In goal ---- */
  { code: 'SK', name: 'Sweeper keeper', for: ['GK'],
    note: 'Comes off his line and plays as an extra defender.' },

  /* ---- Defence ---- */
  { code: 'BPD', name: 'Ball-playing centre back', for: ['CB', 'LCB', 'RCB', 'SW'],
    note: 'Carries and passes out of defence rather than clearing it.' },
  { code: 'STP', name: 'Stopper', for: ['CB', 'LCB', 'RCB'],
    note: 'Steps out and meets the striker early.' },
  { code: 'IFB', name: 'Inverted full back', for: ['LB', 'RB', 'LWB', 'RWB'],
    note: 'Tucks into midfield with the ball instead of staying wide.' },
  { code: 'OFB', name: 'Overlapping full back', for: ['LB', 'RB', 'LWB', 'RWB'],
    note: 'Gets outside the winger and to the by-line.' },

  /* ---- Midfield ---- */
  { code: 'ANC', name: 'Anchor man', for: ['CDM', 'DM', 'LDM', 'RDM'],
    note: 'Sits in front of the back four and does not leave it.' },
  { code: 'BWM', name: 'Ball-winning midfielder', for: ['CDM', 'DM', 'LDM', 'RDM', 'CM', 'LCM', 'RCM'],
    note: 'Hunts the ball and breaks play up.' },
  { code: 'REG', name: 'Deep-lying playmaker', for: ['CDM', 'DM', 'LDM', 'RDM', 'CM'],
    note: 'Sets the tempo by passing from the base of midfield.' },
  { code: 'B2B', name: 'Box to box midfielder', for: ['CM', 'LCM', 'RCM'],
    note: 'Gets between both penalty areas all afternoon.' },
  { code: 'MEZ', name: 'Mezzala', for: ['LCM', 'RCM', 'CM'],
    note: 'Drifts into the channel outside his own centre and arrives late.' },
  { code: 'APM', name: 'Advanced playmaker', for: ['CAM', 'AM', 'LAM', 'RAM', 'CM', 'LCM', 'RCM'],
    note: 'The one everything goes through in the final third.' },
  { code: 'TRQ', name: 'Free role', for: ['CAM', 'AM', 'LAM', 'RAM', 'SS'],
    note: 'Roams between the lines with no fixed job.' },

  /* ---- Attack ---- */
  { code: 'IW', name: 'Inverted winger', for: ['LW', 'RW', 'LM', 'RM', 'LF', 'RF'],
    note: 'Comes in off the touchline onto his stronger foot.' },
  { code: 'WPM', name: 'Wide playmaker', for: ['LW', 'RW', 'LM', 'RM'],
    note: 'Drops in from wide to make the play rather than beat a man.' },
  { code: 'F9', name: 'False nine', for: ['ST', 'CF'],
    note: 'Starts as the centre forward and drops between the lines.' },
  { code: 'TM', name: 'Target man', for: ['ST', 'CF'],
    note: 'Holds it up thirty yards out and brings others in.' },
  { code: 'POA', name: 'Poacher', for: ['ST', 'CF'],
    note: 'Lives in the six yard box and does little else, which is a compliment.' },
  { code: 'CFW', name: 'Complete forward', for: ['ST', 'CF'],
    note: 'Leads the line, drops in, runs the channels, finishes.' },
  { code: 'SHD', name: 'Shadow striker', for: ['SS', 'CAM', 'AM'],
    note: 'Runs beyond the striker into the box.' },
];

export const ROLE_LABEL = Object.fromEntries(ROLES.map((r) => [r.code, r.name]));
export const roleName = (code) => ROLE_LABEL[String(code || '').toUpperCase()] || '';

/* The roles a given position can be played in. An unknown position offers
   nothing rather than everything, so a bad code cannot suggest that a
   goalkeeper might be a poacher. */
export const rolesFor = (code) =>
  ROLES.filter((r) => r.for.includes(String(code || '').toUpperCase()));

/* The order a team sheet is filled in: back to front, left to right, so the
   dropdown reads like a line-up rather than like an alphabet. */
export const POSITION_CODES = POSITIONS.map((p) => p.code);

/* Positions AND roles, because a record written in the few minutes when roles
   were briefly positions must still resolve to a name rather than printing a
   code. Nothing writes those any more. */
export const POSITION_LABEL = Object.fromEntries(
  [...POSITIONS, ...ROLES].map((p) => [p.code, p.name]),
);

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

/* Shipped alongside it, so the team sheet's second dropdown is filtered by
   the first without another round trip. */
export const ROLE_VOCAB = ROLES.map(({ code, name, for: on, note }) => ({ code, name, for: on, note }));
