/* ==========================================================================
   HOW A GOAL WAS SCORED, AND HOW IT WAS MADE

   One vocabulary, defined once, used by the control panel that records a
   match, the statistics engine that counts it, and the pages that print it.
   Three separate lists would drift, and the first symptom would be a player
   page saying "4 headers" while the match report said three.

   The terms follow Opta's event qualifiers, because that is the vocabulary
   football data already has and inventing a private one would make the club's
   records harder to read, not easier:

     body part    15 Head · 20 Right footed · 72 Left footed · 21 Other body part
     situation    9 Penalty · 26 Free kick (direct) · 25 From corner ·
                  24 Set piece (crossed free kick) · 160 Throw-in set piece
     zone         16 Small box · 17 Box-centre · 18 Out of box
     assists      2 Cross · 4 Through ball · 195 Pull back · 156 Lay-off ·
                  168 Flick-on · 3 Head pass · 6 Corner · 5 Free kick ·
                  107 Throw-in · 218 2nd assist

   Trimmed to what a Sunday-league team sheet can honestly report. Nobody is
   recording goal-mouth z-coordinates on a Sunday morning, and a field nobody
   fills in is worse than no field: it makes the record look thinner than it
   is. Everything here is something the people who were there actually saw.

   Every one of these is OPTIONAL. A goal with no body part recorded is still
   a goal, and the site says nothing about how it was scored rather than
   guessing. That is the same rule the minute already follows.
   ========================================================================== */

/* What it was struck with. */
export const BODY_PARTS = [
  { key: 'right', label: 'Right foot', short: 'right foot' },
  { key: 'left', label: 'Left foot', short: 'left foot' },
  { key: 'head', label: 'Header', short: 'a header' },
  { key: 'other', label: 'Other', short: 'off the body', hint: 'Chest, knee, shoulder' },
];

/* What the ball was doing beforehand. `dead` marks the ones where play had
   stopped, which is what "from a set piece" means when the site says it. */
export const SITUATIONS = [
  { key: 'open', label: 'Open play', phrase: 'in open play' },
  { key: 'corner', label: 'From a corner', phrase: 'from a corner', dead: true },
  { key: 'freekick-direct', label: 'Free kick, straight in', phrase: 'direct from a free kick', dead: true },
  { key: 'freekick', label: 'From a free kick', phrase: 'from a free kick', dead: true },
  { key: 'throwin', label: 'From a throw in', phrase: 'from a throw in', dead: true },
  { key: 'penalty', label: 'Penalty', phrase: 'from the penalty spot', dead: true },
  { key: 'counter', label: 'On the counter', phrase: 'on the counter-attack' },
  { key: 'rebound', label: 'Rebound', phrase: 'from a rebound' },
];

/* Where it was struck from. Three bands, because that is the honest limit of
   what somebody remembers after the game. */
export const ZONES = [
  { key: 'six', label: 'Six-yard box', phrase: 'from close range' },
  { key: 'box', label: 'Inside the box', phrase: 'from inside the box' },
  { key: 'outside', label: 'Outside the box', phrase: 'from outside the box' },
];

/* How the chance was made. */
export const ASSIST_TYPES = [
  { key: 'pass', label: 'A pass', phrase: 'set up by' },
  { key: 'through', label: 'Through ball', phrase: 'sent through by' },
  { key: 'cross', label: 'Cross', phrase: 'crossed in by' },
  { key: 'cutback', label: 'Cut-back', phrase: 'cut back by' },
  { key: 'layoff', label: 'Lay-off', phrase: 'laid off by' },
  { key: 'flickon', label: 'Flick-on', phrase: 'flicked on by' },
  { key: 'headpass', label: 'Headed pass', phrase: 'headed down by' },
  { key: 'corner', label: 'Corner', phrase: 'from', suffix: '’s corner' },
  { key: 'freekick', label: 'Free kick', phrase: 'from', suffix: '’s free kick' },
  { key: 'throwin', label: 'Throw in', phrase: 'from', suffix: '’s throw in' },
  { key: 'rebound', label: 'Rebound off them', phrase: 'after a rebound off' },
];

/* Look-ups, so nothing downstream writes its own switch statement. */
const index = (list) => Object.fromEntries(list.map((x) => [x.key, x]));
export const BODY_PART = index(BODY_PARTS);
export const SITUATION = index(SITUATIONS);
export const ZONE = index(ZONES);
export const ASSIST_TYPE = index(ASSIST_TYPES);

/* A goal in words, from whatever was recorded and nothing more. Returns an
   empty string when nothing was, which is how a goal from an old record
   prints: as a goal, with no invented detail. */
export function describeGoal(g) {
  if (!g) return '';
  const bits = [];
  const body = BODY_PART[g.bodyPart];
  const sit = SITUATION[g.situation];
  const zone = ZONE[g.zone];

  /* A penalty says "from the penalty spot" and nothing about which foot,
     because the foot is not the interesting part of a penalty. */
  if (sit && sit.key === 'penalty') return sit.phrase;

  if (body) bits.push(body.key === 'head' ? 'with a header' : `with his ${body.short}`);
  if (zone) bits.push(zone.phrase);
  if (sit && sit.key !== 'open') bits.push(sit.phrase);
  return bits.join(' ');
}

/* The same, short enough for a timeline chip. */
export function shortGoal(g) {
  if (!g) return '';
  const sit = SITUATION[g.situation];
  if (sit && sit.key === 'penalty') return 'pen';
  const body = BODY_PART[g.bodyPart];
  if (sit && sit.dead) return sit.label.replace(/^(From a|Free kick,) ?/i, '').trim();
  if (body && body.key === 'head') return 'header';
  if (g.zone === 'outside') return 'from range';
  return '';
}

export function describeAssist(a, name) {
  const t = ASSIST_TYPE[a && a.type] || ASSIST_TYPE.pass;
  return t.suffix ? `${t.phrase} ${name}${t.suffix}` : `${t.phrase} ${name}`;
}

/* Shipped to the browser so the control panel builds its dropdowns from the
   same source the site reads them with. */
export const VOCAB = {
  bodyParts: BODY_PARTS.map(({ key, label, hint }) => ({ key, label, hint })),
  situations: SITUATIONS.map(({ key, label }) => ({ key, label })),
  zones: ZONES.map(({ key, label }) => ({ key, label })),
  assistTypes: ASSIST_TYPES.map(({ key, label }) => ({ key, label })),
};
