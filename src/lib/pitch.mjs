/* ==========================================================================
   WHERE IT HAPPENED

   The club records what a goal was struck WITH, what the ball was doing and
   roughly where from - three zones, because three is what somebody remembers
   after the game. That is honest and it is coarse: "inside the box" covers a
   tap-in at the back post and a volley on the penalty spot, and a season of
   them says nothing about where a striker actually scores from.

   So the panel asks for a POINT, by tapping a pitch, and the point is the
   record. Everything the three zones said is derived from it.

   ONE COORDINATE SPACE, and it is the one the team sheets already use.
   `POSITION_XY` in positions.mjs runs x 0-100 left to right and y 0-100 with
   the goal the club is ATTACKING at y=0, which is why a striker draws at the
   top of a profile's heat map. A second convention here would mean a shot map
   and a heat map on the same page disagreeing about which way the club kicks.

   THE ZONE IS NEVER STORED BESIDE A POINT. A dropdown and a point are two
   sources for one fact and they will disagree: somebody drags the marker and
   leaves the select where it was. `dataset.mjs` overwrites `zone` from the
   point wherever there is one, so a record carrying both is read off the
   point and the select is only ever a fallback for a goal nobody has marked.
   ========================================================================== */

/* A real pitch, as a share of its own length and width. 115 x 75 yards, which
   is what the club plays on, so an 18-yard box is 15.7% deep and 44 yards
   across is 58.7% wide. These are the numbers everything else is measured
   against, including the panel, which is handed them by the build. */
export const PITCH = {
  box: { x0: 20.7, x1: 79.3, y1: 15.7 },
  six: { x0: 36.7, x1: 63.3, y1: 5.2 },
  spot: { x: 50, y: 10.4 },
  arc: 8.0,
};

/* The three zones the club already records, derived from a point. The panel
   does NOT compute this: it stores the point and disables the dropdown, so
   there is one implementation of the rule rather than two that can part. */
export function zoneOf(spot) {
  if (!spot || !Number.isFinite(spot.x) || !Number.isFinite(spot.y)) return null;
  const { box, six } = PITCH;
  if (spot.y <= six.y1 && spot.x >= six.x0 && spot.x <= six.x1) return 'six';
  if (spot.y <= box.y1 && spot.x >= box.x0 && spot.x <= box.x1) return 'box';
  return 'outside';
}

/* Across, in the words a report would use. The thirds are the box's own
   edges rather than even thirds of the pitch, so "central" means in front of
   goal rather than anywhere in the middle 33 metres. */
function across(x) {
  if (x < PITCH.box.x0) return 'the left';
  if (x > PITCH.box.x1) return 'the right';
  if (x < 42) return 'the left of centre';
  if (x > 58) return 'the right of centre';
  return 'the middle';
}

/* What to print under the button, so somebody who marked a point last week
   can see what they marked without opening the pitch again. */
export function spotWords(spot) {
  const zone = zoneOf(spot);
  if (!zone) return '';
  if (zone === 'six') return `the six-yard box, ${across(spot.x)}`;
  if (zone === 'box') return `inside the box, ${across(spot.x)}`;
  if (spot.y > 50) return `${across(spot.x)}, inside their own half`;
  return `outside the box, ${across(spot.x)}`;
}

/* Only ever read what somebody actually marked. A goal with no point gets
   nothing rather than the middle of the pitch, which is what a default would
   silently publish as a fact about where a man scores from. */
export function spotOf(o) {
  const s = o && o.spot;
  if (!s || !Number.isFinite(Number(s.x)) || !Number.isFinite(Number(s.y))) return null;
  const x = Math.min(100, Math.max(0, Number(s.x)));
  const y = Math.min(100, Math.max(0, Number(s.y)));
  return { x, y };
}

/* The markings, as one path per weight, in a box 100 wide and `h` tall. The
   pitch is drawn in three places - the profile's heat map, the panel's picker
   and a match report's goal card - and three hand-drawn pitches is three
   chances for one of them to put the penalty spot somewhere else. */
export function pitchMarks(h = 140) {
  const { box, six, spot, arc } = PITCH;
  const y = (v) => ((v / 100) * h).toFixed(2);
  const half = (h / 2).toFixed(2);
  return {
    /* Every line the laws draw, as one path. */
    lines: [
      `M1 1H99V${(h - 1).toFixed(2)}H1Z`,
      `M1 ${half}H99`,
      `M${box.x0} 1V${y(box.y1)}H${box.x1}V1`,
      `M${six.x0} 1V${y(six.y1)}H${six.x1}V1`,
      `M${box.x0} ${(h - 1).toFixed(2)}V${y(100 - box.y1)}H${box.x1}V${(h - 1).toFixed(2)}`,
      `M${six.x0} ${(h - 1).toFixed(2)}V${y(100 - six.y1)}H${six.x1}V${(h - 1).toFixed(2)}`,
    ].join(''),
    /* The two arcs and the centre circle, which are curves and so cannot
       share a path with the straight lines without repeating the move. */
    arcs: `M${(spot.x - arc).toFixed(1)} ${y(box.y1)}A${arc} ${arc} 0 0 0 ${(spot.x + arc).toFixed(1)} ${y(box.y1)}`
      + `M${(spot.x - arc).toFixed(1)} ${y(100 - box.y1)}A${arc} ${arc} 0 0 1 ${(spot.x + arc).toFixed(1)} ${y(100 - box.y1)}`,
    circle: { cx: spot.x, cy: Number(half), r: ((arc / 100) * h * (100 / h) * 1.5).toFixed(2) },
    spots: [
      { cx: spot.x, cy: Number(y(spot.y)) },
      { cx: spot.x, cy: Number(y(100 - spot.y)) },
      { cx: spot.x, cy: Number(half) },
    ],
  };
}

/* Every goal a player struck that somebody has marked, newest first, for the
   seasons the club records points in. Competitive only, like every published
   figure: a friendly's goals show on the match page and count towards nobody's
   record, so putting them on a shot map would make the map disagree with the
   tally printed beside it. */
export function shotsFor(matches, num) {
  const out = [];
  for (const m of matches || []) {
    const det = m.detail || {};
    for (const g of det.goals || []) {
      if (g.og || Number(g.num) !== Number(num)) continue;
      const spot = spotOf(g);
      if (!spot) continue;
      out.push({
        ...spot,
        minute: g.minute,
        bodyPart: g.bodyPart || '',
        situation: g.situation || '',
        zone: zoneOf(spot),
        season: m.season,
        matchId: m.id,
        opponent: m.opponent,
        score: m.score,
      });
    }
  }
  return out;
}

/* The other half of the same record: where a man was standing when he made
   one. The assist's point rides on the assist, which rides on the goal, so
   this walks the same list and reads the other field. */
export function assistSpotsFor(matches, num) {
  const out = [];
  for (const m of matches || []) {
    const det = m.detail || {};
    for (const g of det.goals || []) {
      const a = g.assist;
      if (!a || Number(a.num) !== Number(num)) continue;
      const spot = spotOf(a);
      if (!spot) continue;
      out.push({
        ...spot,
        minute: g.minute,
        type: a.type || 'pass',
        season: m.season,
        matchId: m.id,
        opponent: m.opponent,
        score: m.score,
      });
    }
  }
  return out;
}

/* ---- A SAVE IS THE SAME RECORD READ FROM THE OTHER END ------------------
   A goal is marked against the goal the club is ATTACKING; a save is made
   at the one it is DEFENDING. Both are stored with y=0 at the goal THAT
   EVENT IS ABOUT, which is the only convention under which `zoneOf` and
   `spotWords` keep meaning what they say: "the six-yard box" is his own
   six-yard box on a save and theirs on a goal, and both are true sentences.

   The alternative - one absolute pitch with the club always kicking one way -
   makes a save read as "inside their box, 94 yards out", and every figure
   derived from the zone would then need to know which kind of event it was
   looking at. One rule in one place beats a flag on every reader.

   THE COUNT IS STILL THE COUNT. `saves` on the match is what the club
   recorded and is what every published figure is derived from; these points
   are detail somebody added afterwards and there are usually fewer of them.
   A page drawing four marks under a heading of eight saves has to say so,
   which is why `coverage` is returned rather than left to the caller to
   work out and get wrong. */
export function savesFor(matches, num) {
  const out = [];
  let made = 0;
  for (const m of matches || []) {
    const det = m.detail || {};
    if (det.keeper == null || Number(det.keeper) !== Number(num)) continue;
    if (Number.isFinite(Number(det.saves))) made += Number(det.saves);
    for (const s of det.saveSpots || []) {
      const spot = spotOf({ spot: s });
      if (!spot) continue;
      out.push({
        ...spot,
        minute: s.minute,
        zone: zoneOf(spot),
        season: m.season,
        matchId: m.id,
        opponent: m.opponent,
        score: m.score,
      });
    }
  }
  /* Marked can exceed made where somebody marked saves and never typed the
     count, so the share is floored at the marks rather than reported above
     100%, and a nought count says "marked" alone instead of "4 of 0". */
  return { spots: out, made, coverage: made ? Math.min(1, out.length / made) : null };
}

/* ---- A ZONE IS EVIDENCE, AT THE PRECISION IT WAS RECORDED AT ------------
   Nobody has marked a point yet - 0 goals of 166 - and 26 carry the three
   zones the club recorded before the picker existed. The shot map read the
   points alone, so it drew on no profile at all, and the goals the club HAD
   answered for reached no reader.

   So a zone is drawn as an AREA, never as a point. `spotOf` still refuses to
   invent coordinates, and nothing here writes any: a zone marker is placed on
   a regular grid inside its own rectangle, which is what makes it read as
   "somewhere in here" rather than as a measurement. The caption says so in
   words, and a goal somebody does mark gets the exact mark and beats this.

   The rectangles are the laws' own, from PITCH, with the outside band ending
   where the attacking third does - a goal from the halfway line would be
   drawn at the edge of it rather than off the picture. */
export const ZONE_AREA = {
  six: { x0: PITCH.six.x0, x1: PITCH.six.x1, y0: 1.2, y1: PITCH.six.y1 },
  box: { x0: PITCH.box.x0, x1: PITCH.box.x1, y0: PITCH.six.y1 + 1.4, y1: PITCH.box.y1 },
  outside: { x0: 8, x1: 92, y0: PITCH.box.y1 + 2.4, y1: 42 },
};

export const ZONE_WORDS = {
  six: 'the six-yard box',
  box: 'inside the box',
  outside: 'outside the box',
};

/* Every goal whose zone the club recorded and nobody has marked a point for.
   A goal carrying both is not here: `dataset.mjs` derives the zone from the
   point, so the point is the record and the shot map already has it. */
export function zoneGoalsFor(matches, num) {
  const out = [];
  for (const m of matches || []) {
    const det = m.detail || {};
    for (const g of det.goals || []) {
      if (g.og || Number(g.num) !== Number(num)) continue;
      if (spotOf(g)) continue;
      const zone = g.zone && ZONE_AREA[g.zone] ? g.zone : null;
      if (!zone) continue;
      out.push({
        zone,
        minute: g.minute,
        bodyPart: g.bodyPart || '',
        situation: g.situation || '',
        season: m.season,
        matchId: m.id,
        opponent: m.opponent,
        score: m.score,
      });
    }
  }
  return out;
}

/* Laid out, not located. One tidy grid per area, widest first, so the marks
   never overlap and never pretend to be anywhere in particular. */
export function zoneLayout(list) {
  const out = [];
  for (const key of ['six', 'box', 'outside']) {
    const mine = list.filter((g) => g.zone === key);
    if (!mine.length) continue;
    const a = ZONE_AREA[key];
    const cols = Math.min(mine.length, Math.max(2, Math.ceil(Math.sqrt(mine.length * 1.8))));
    const rows = Math.ceil(mine.length / cols);
    mine.forEach((g, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      out.push({
        ...g,
        x: a.x0 + ((a.x1 - a.x0) * (c + 1)) / (cols + 1),
        y: a.y0 + ((a.y1 - a.y0) * (r + 1)) / (rows + 1),
      });
    });
  }
  return out;
}
