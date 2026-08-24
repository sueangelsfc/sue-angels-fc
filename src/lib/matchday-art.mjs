/* ==========================================================================
   MATCHDAY GRAPHICS

   Four cards the club publishes around a match, drawn from the match record
   rather than made by hand:

     nextGame        the fixture, before it is played
     matchdaySquad   who is starting and who is on the bench
     manOfTheMatch   the award, once a result is entered
     finalResult     the score

   ONE IMPLEMENTATION, TWO CALLERS. The control panel draws these in the
   browser on save, and the sample renderer draws them in headless Chrome.
   Both call the functions below against a 2D context, so a graphic the club
   signs off cannot differ from one it publishes.

   ---- THE DESIGN LANGUAGE, AND WHY IT IS THIS ONE --------------------------

   The first version centred everything, set the headline enormous and let an
   orange glow sit behind all of it. It read as generated: symmetrical,
   saturated, nothing to look at twice.

   This is built the way club design studios actually set these, which is a
   PRINT language rather than a poster one:

     A PANEL, INSET FROM THE EDGE. The card is not one flat surface. A darker
     panel floats over the field with a hairline border, and the difference
     between the two carries most of the depth.

     A WORDMARK THAT RUNS UNDER IT. The club's name repeats across the full
     width and the panel covers the middle of it, so it survives only as
     fragments in the margins. The cropping is the point: it reads as a sheet
     laid over a larger sheet.

     REGISTRATION MARKS. Crosshairs and corner ticks, as on a print proof.
     Four strokes each, and they do more for the composition than any effect.

     TYPE THAT IS MOSTLY TINY. One word is large. Everything else is 11-15px,
     letterspaced hard, upper case. Restraint is what stops it looking
     automated - the reference sets its headline at about a tenth of the
     frame, not a third of it.

     ORANGE ONCE. Not a glow behind everything: a single accent per card, so
     it means something when it appears. Everything else is paper on near
     black, and the field is held back to keep it that way.

   ---- WHAT IT IS BUILT FROM ------------------------------------------------

   Sixteen of thirty-six players have no photograph and only one true cutout
   exists, so no layout here depends on one: they are built from the crest,
   the opponent's badge, type and geometry, all of which are always present. A
   photograph is used where there is a place for it, and its absence changes
   nothing about whether the card reads.

   NO SQUAD NUMBERS. The records key everything by `num` - goals, team sheets,
   the man of the match - and the site never shows one. `nameOf` is the only
   thing that turns one into a person.
   ========================================================================== */

export const ART_W = 1080;
export const ART_H = 1350;

/* The club's own, verbatim. It closes every card and it is not shortened:
   "what we do echoes" is a different sentence. */
export const MOTTO = 'What we do in life echoes in eternity.';

const ORANGE = '#FF7034';
const INK = '#07080A';
const PAPER = '#F2F0EC';
const DIM = 'rgba(242,240,236,0.46)';
const FAINT = 'rgba(242,240,236,0.20)';
const HAIR = 'rgba(242,240,236,0.13)';

const DISPLAY = 'Archivo';
const BODY = 'Geist';

/* The panel, and the margin it leaves. Every card is laid out against these
   numbers, so moving the inset moves the whole composition together. */
const M = 96;
const PANEL = { x: M, y: 150, w: ART_W - M * 2, h: ART_H - 150 - 168 };

/* ---- Small helpers ------------------------------------------------------ */

const upper = (s) => String(s == null ? '' : s).toUpperCase();

/* A surname alone, which is how a line-up is read aloud and how every
   broadcast graphic sets one.

   THE LAST WORD IS NOT ALWAYS THE SURNAME. "Jim El Bayati" set as "BAYATI" is
   not his name, and a team sheet is the one place on this site where getting
   somebody's name wrong is certain to be noticed by the person it belongs to.
   A particle in front of the final word is part of it. */
const PARTICLES = new Set(['el', 'al', 'van', 'von', 'de', 'del', 'della', 'der',
  'den', 'da', 'di', 'do', 'dos', 'du', 'la', 'le', 'bin', 'ibn', 'ter']);

export function surname(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] || '';
  let i = parts.length - 1;
  while (i > 1 && PARTICLES.has(parts[i - 1].toLowerCase().replace(/\.$/, ''))) i -= 1;
  return parts.slice(i).join(' ');
}

/* THE ONLY PLACE A SQUAD NUMBER TURNS INTO A PERSON. Everything the records
   hold is keyed by number and nothing published may show one, so a lookup that
   misses must never fall through to printing the number.

   IT MUST NOT SILENTLY DROP THEM EITHER. The 2 August team sheet carries
   numbers 900 and 901 against a squad whose highest number is 37: two guests
   in a pre-season friendly, entered as placeholders because they are not on
   the roster. Filtering those out drew a card headed "Matchday squad" with
   NINE names under it, which is worse than either alternative - a graphic
   quietly wrong about who played. */
export const GUEST = 'Guest';

export function nameOf(num, squad) {
  const key = String(num);
  const found = (squad || []).find((p) => String(p.num) === key);
  return (found && found.name) || GUEST;
}

export function playerOf(num, squad) {
  const key = String(num);
  return (squad || []).find((p) => String(p.num) === key) || null;
}

function fitText(ctx, text, maxW, startPx, { family = DISPLAY, weight = 800, min = 16 } = {}) {
  let px = startPx;
  for (;;) {
    ctx.font = `${weight} ${px}px "${family}"`;
    if (ctx.measureText(text).width <= maxW || px <= min) break;
    px -= 2;
  }
  return px;
}

function wrapLines(ctx, text, maxW) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxW && line) { lines.push(line); line = w; } else { line = next; }
  }
  if (line) lines.push(line);
  return lines;
}

/* Letterspaced small caps, drawn a character at a time because canvas has no
   letterSpacing in every engine this has to run in. Returns the width so a
   caller can centre something against it. */
function tracked(ctx, text, x, y, opts = {}) {
  const { size = 12, track = 4, weight = 700, family = BODY, align = 'left', color = PAPER } = opts;
  const s = upper(text);
  ctx.save();
  ctx.font = `${weight} ${size}px "${family}"`;
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  const total = ctx.measureText(s).width + track * Math.max(0, s.length - 1);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  for (const ch of s) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + track; }
  ctx.restore();
  return total;
}

/* ---- The field ---------------------------------------------------------- */

/* Near black, the club's mesh held well back, and grain over everything.
   HELD BACK ON PURPOSE: at full strength the orange field fought every element
   on the card and the whole thing looked like a gradient with text on it. As a
   texture it does its job, and the one accent per card is then the only colour
   that carries meaning. */
export function drawField(ctx, art, opts = {}) {
  const strength = opts.strength == null ? 0.3 : opts.strength;
  ctx.save();
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, ART_W, ART_H);

  if (art && art.width) {
    const s = Math.max(ART_W / art.width, ART_H / art.height);
    const w = art.width * s;
    const h = art.height * s;
    ctx.globalAlpha = strength;
    ctx.drawImage(art, (ART_W - w) / 2, (ART_H - h) / 2, w, h);
    ctx.globalAlpha = 1;
    /* Pulls the saturation down without losing the light. A `saturation` blend
       is not universal across engines, so a flat wash does the same job
       predictably. */
    ctx.fillStyle = 'rgba(7,8,10,0.42)';
    ctx.fillRect(0, 0, ART_W, ART_H);
  }
  ctx.restore();
}

/* Grain, drawn last so it sits over the type as it would on print.

   PUT_IMAGE_DATA IS NOT A DRAW. It writes raw pixels: it ignores
   globalCompositeOperation, ignores globalAlpha, ignores the transform, and
   it REPLACES the alpha channel rather than blending into it. Writing noise
   at alpha 15 straight onto the card therefore did not veil the card, it
   erased it - every version of this rendered as an almost black rectangle
   with the whole composition underneath thrown away.

   So the noise is built on its own small canvas, where putImageData is
   correct because there is nothing to preserve, and then drawn back as a
   repeating PATTERN, which does respect compositing. A 256px tile is 65k
   pixels instead of 1.4M, so it is also about twenty times cheaper. */
export function drawGrain(ctx, opts = {}) {
  const amount = opts.amount == null ? 15 : opts.amount;
  const size = 256;
  const doc = (ctx.canvas && ctx.canvas.ownerDocument) || (typeof document === 'undefined' ? null : document);
  if (!doc) return;
  const tile = doc.createElement('canvas');
  tile.width = size;
  tile.height = size;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(size, size);
  const px = img.data;
  for (let i = 0; i < px.length; i += 4) {
    const n = (Math.random() * 255) | 0;
    px[i] = n; px[i + 1] = n; px[i + 2] = n;
    px[i + 3] = amount;
  }
  tctx.putImageData(img, 0, 0);

  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  const pat = ctx.createPattern(tile, 'repeat');
  if (pat) { ctx.fillStyle = pat; ctx.fillRect(0, 0, ART_W, ART_H); }
  ctx.restore();
}

/* The club's name repeating across the full width. The panel is drawn over the
   middle of it afterwards, so only the fragments in the margins survive - the
   cropping is what makes the card read as a sheet on a larger sheet. */
function drawWordmarkRun(ctx, y, opts = {}) {
  const { size = 15, track = 3, alpha = 0.3 } = opts;
  ctx.save();
  ctx.font = `800 ${size}px "${DISPLAY}"`;
  const unit = 'SUE’S ANGELS';
  const gap = 26;
  const unitW = ctx.measureText(unit).width + track * unit.length + gap;
  ctx.fillStyle = `rgba(242,240,236,${alpha})`;
  ctx.textAlign = 'left';
  let x = -unitW * 0.45;
  while (x < ART_W + unitW) {
    let cx = x;
    for (const ch of unit) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + track; }
    x += unitW;
  }
  ctx.restore();
}

/* A hairline circle, wider than the panel, so it leaves the frame on both
   sides. Geometry rather than decoration: it gives the eye a path between the
   badges and the type under them. */
function drawArc(ctx, cx, cy, r) {
  ctx.save();
  ctx.strokeStyle = 'rgba(242,240,236,0.10)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function crosshair(ctx, x, y, len, color) {
  ctx.save();
  ctx.strokeStyle = color || 'rgba(242,240,236,0.4)';
  ctx.lineWidth = 1.2;
  const l = len || 13;
  ctx.beginPath();
  ctx.moveTo(x - l, y); ctx.lineTo(x + l, y);
  ctx.moveTo(x, y - l); ctx.lineTo(x, y + l);
  ctx.stroke();
  ctx.restore();
}

function cornerTicks(ctx, x, y, w, h, len, color) {
  ctx.save();
  ctx.strokeStyle = color || 'rgba(242,240,236,0.34)';
  ctx.lineWidth = 1.2;
  const l = len || 22;
  for (const c of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
    ctx.beginPath();
    ctx.moveTo(c[0] + c[2] * l, c[1]);
    ctx.lineTo(c[0], c[1]);
    ctx.lineTo(c[0], c[1] + c[3] * l);
    ctx.stroke();
  }
  ctx.restore();
}

/* THE SHARED FRAME. Every card calls this, draws its own content inside PANEL,
   then calls closeCard. Two functions rather than four copies is what stops
   the set drifting apart the way a hand-made set always does. */
export function openCard(ctx, art, opts = {}) {
  drawField(ctx, art, opts);

  /* Behind the panel, so the panel crops it. */
  drawWordmarkRun(ctx, 214);
  drawWordmarkRun(ctx, ART_H - 268, { alpha: 0.18 });

  /* OPAQUE ENOUGH TO ACTUALLY CROP. At 0.5 the wordmark read straight through
     the panel at almost full strength, so the run looked like a band of text
     lying across the card rather than something the panel was covering - which
     is the whole effect. It has to hide what is behind it and still let the
     field's light through at the edges, so it is nearly opaque, not half. */
  ctx.save();
  ctx.fillStyle = 'rgba(7,8,10,0.9)';
  ctx.fillRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h);
  ctx.strokeStyle = HAIR;
  ctx.lineWidth = 1;
  ctx.strokeRect(PANEL.x + 0.5, PANEL.y + 0.5, PANEL.w - 1, PANEL.h - 1);
  ctx.restore();

  cornerTicks(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, 26);
}

/* The bottom line: the club, then the motto, in the smallest type on the card
   and set like a copyright line, because that is exactly what a club puts
   there. Grain goes on last, over everything. */
export function closeCard(ctx, rightLabel) {
  const y = PANEL.y + PANEL.h - 44;
  ctx.save();
  ctx.strokeStyle = HAIR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PANEL.x + 34, y - 30);
  ctx.lineTo(PANEL.x + PANEL.w - 34, y - 30);
  ctx.stroke();
  ctx.restore();

  tracked(ctx, 'Sue’s Angels FC', PANEL.x + 34, y, { size: 11, track: 3.4, color: DIM });
  tracked(ctx, MOTTO.replace(/\.$/, ''), PANEL.x + PANEL.w - 34, y,
    { size: 11, track: 3.4, color: FAINT, align: 'right' });

  if (rightLabel) {
    tracked(ctx, rightLabel, ART_W / 2, PANEL.y - 42,
      { size: 11, track: 4, color: FAINT, align: 'center' });
  }

  drawGrain(ctx);
}

/* A badge inside its own registration frame, which is how the reference sets
   them and what stops two crests floating in space. `img` may be null - one
   club in twenty-six has no badge, and that draws its initials on a ring
   rather than leaving a hole. */
export function drawBadge(ctx, img, cx, cy, size, fallbackName, opts = {}) {
  const frame = opts.frame !== false;
  if (frame) {
    const half = size / 2 + 22;
    cornerTicks(ctx, cx - half, cy - half, half * 2, half * 2, 12, 'rgba(242,240,236,0.26)');
  }
  ctx.save();
  if (img && img.width) {
    const s = Math.min(size / img.width, size / img.height);
    const w = img.width * s;
    const h = img.height * s;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  } else {
    ctx.strokeStyle = 'rgba(242,240,236,0.34)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.stroke();
    const initials = String(fallbackName || '')
      .split(/\s+/).filter(Boolean).slice(0, 3).map((w) => w[0]).join('').toUpperCase();
    ctx.fillStyle = PAPER;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.round(size * 0.3)}px "${DISPLAY}"`;
    ctx.fillText(initials, cx, cy + 1);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();
}

/* Both badges, each labelled beneath in small caps. The reference names its
   two clubs in type rather than putting a giant "v" between them, and it is a
   better read. */
function drawFixtureBadges(ctx, o) {
  const size = o.size || 104;
  const gap = 232;
  drawBadge(ctx, o.usBadge, ART_W / 2 - gap / 2, o.y, size, 'Sue’s Angels');
  drawBadge(ctx, o.oppBadge, ART_W / 2 + gap / 2, o.y, size, o.opponent);
  const lab = o.y + size / 2 + 62;
  tracked(ctx, 'Sue’s Angels', ART_W / 2 - gap / 2, lab, { size: 11, track: 3.2, color: DIM, align: 'center' });
  tracked(ctx, o.opponent || '', ART_W / 2 + gap / 2, lab, { size: 11, track: 3.2, color: DIM, align: 'center' });
}

/* The one large word. Small by poster standards, and deliberately so. */
function headline(ctx, text, y, opts = {}) {
  const max = opts.max || 96;
  const px = fitText(ctx, upper(text), PANEL.w - 120, max);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `800 ${px}px "${DISPLAY}"`;
  ctx.fillStyle = opts.color || PAPER;
  ctx.fillText(upper(text), ART_W / 2, y);
  ctx.restore();
  return px;
}

/* The single accent: a short orange rule. One per card. */
function accentRule(ctx, cx, y, w) {
  const width = w || 46;
  ctx.save();
  ctx.strokeStyle = ORANGE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - width / 2, y);
  ctx.lineTo(cx + width / 2, y);
  ctx.stroke();
  ctx.restore();
}

/* ---- 1. Next game ------------------------------------------------------- */

export function nextGame(ctx, m, assets = {}) {
  openCard(ctx, assets.art, { strength: 0.3 });
  drawArc(ctx, ART_W / 2, 730, 396);

  tracked(ctx, m.competition || 'Fixture', ART_W / 2, PANEL.y + 84,
    { size: 12, track: 5, color: DIM, align: 'center' });

  headline(ctx, 'Next', 452, { max: 104 });
  accentRule(ctx, ART_W / 2, 500);

  drawFixtureBadges(ctx, {
    usBadge: assets.crest, oppBadge: assets.oppBadge, opponent: m.opponent, y: 690,
  });
  crosshair(ctx, ART_W / 2, 690, 10, 'rgba(242,240,236,0.24)');

  tracked(ctx, m.dateLine || '', ART_W / 2, 934,
    { size: 26, track: 7, weight: 800, family: DISPLAY, color: PAPER, align: 'center' });

  const where = [m.kick ? `${m.kick} kick-off` : null, m.venue || null, m.weAreHome ? 'Home' : 'Away']
    .filter(Boolean).join('   ·   ');
  tracked(ctx, where, ART_W / 2, 986, { size: 12, track: 3.4, color: DIM, align: 'center' });

  closeCard(ctx, 'Fixture');
}

/* ---- 2. Matchday squad -------------------------------------------------- */

export function matchdaySquad(ctx, m, assets = {}) {
  openCard(ctx, assets.art, { strength: 0.24 });

  tracked(ctx, `v ${m.opponent || ''}`, ART_W / 2, PANEL.y + 84,
    { size: 12, track: 5, color: DIM, align: 'center' });

  headline(ctx, 'Matchday squad', 362, { max: 74 });
  accentRule(ctx, ART_W / 2, 402);

  const starters = (m.starters || []).filter(Boolean);
  const subs = (m.subs || []).filter(Boolean);

  const colL = PANEL.x + 58;
  const colR = ART_W / 2 + 22;
  tracked(ctx, 'Starting eleven', colL, 480, { size: 11, track: 3.4, color: ORANGE });

  const left = starters.slice(0, Math.ceil(starters.length / 2));
  const right = starters.slice(Math.ceil(starters.length / 2));
  const rowH = 62;
  const colW = PANEL.w / 2 - 82;

  ctx.save();
  ctx.textAlign = 'left';
  const draw = (list, x) => list.forEach((n, i) => {
    const y = 540 + i * rowH;
    /* A hairline under each name, stopping short of the column edge. It is
       what turns a list into a team sheet. */
    ctx.strokeStyle = HAIR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + 16);
    ctx.lineTo(x + colW, y + 16);
    ctx.stroke();
    ctx.fillStyle = PAPER;
    const px = fitText(ctx, upper(surname(n)), colW - 14, 34, { weight: 700 });
    ctx.font = `700 ${px}px "${DISPLAY}"`;
    ctx.fillText(upper(surname(n)), x, y);
  });
  draw(left, colL);
  draw(right, colR);
  ctx.restore();

  const listBottom = 540 + Math.max(left.length, right.length) * rowH;

  if (!subs.length) {
    /* Eleven names and then a third of the card empty reads as a graphic that
       failed to finish. Saying so is shorter than the silence and it is true:
       Sunday league team sheets frequently name nobody on the bench. */
    tracked(ctx, 'No substitutes named', colL, listBottom + 26,
      { size: 11, track: 3.4, color: FAINT });
  } else {
    tracked(ctx, 'Substitutes', colL, listBottom + 26, { size: 11, track: 3.4, color: ORANGE });
    ctx.save();
    ctx.fillStyle = DIM;
    ctx.font = `500 20px "${BODY}"`;
    ctx.textAlign = 'left';
    wrapLines(ctx, subs.map((n) => surname(n)).join('  ·  '), PANEL.w - 116).slice(0, 2)
      .forEach((l, i) => ctx.fillText(l, colL, listBottom + 62 + i * 30));
    ctx.restore();
  }

  drawBadge(ctx, assets.crest, PANEL.x + PANEL.w - 90, PANEL.y + 96, 66, 'Sue’s Angels', { frame: false });
  closeCard(ctx, m.competition || '');
}

/* ---- 3. Man of the match ------------------------------------------------ */

export function manOfTheMatch(ctx, m, assets = {}) {
  openCard(ctx, assets.art, { strength: 0.34 });
  drawArc(ctx, ART_W / 2, 604, 340);

  tracked(ctx, 'Man of the match', ART_W / 2, PANEL.y + 84,
    { size: 13, track: 7, color: ORANGE, align: 'center' });

  /* The portrait where one exists, the crest where it does not. Sixteen of
     thirty-six have no photograph, so the FRAME is the constant and what sits
     inside it is the variable: the card is composed identically either way. */
  const cx = ART_W / 2;
  const cy = 580;
  const box = 300;
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - box / 2, cy - box / 2, box, box);
  ctx.clip();
  if (assets.photo && assets.photo.width) {
    const s = Math.max(box / assets.photo.width, box / assets.photo.height);
    const w = assets.photo.width * s;
    const h = assets.photo.height * s;
    ctx.globalAlpha = 0.94;
    ctx.drawImage(assets.photo, cx - w / 2, cy - h / 2, w, h);
  } else {
    ctx.fillStyle = 'rgba(242,240,236,0.03)';
    ctx.fillRect(cx - box / 2, cy - box / 2, box, box);
    drawBadge(ctx, assets.crest, cx, cy, 176, 'Sue’s Angels', { frame: false });
  }
  ctx.restore();
  cornerTicks(ctx, cx - box / 2, cy - box / 2, box, box, 24, 'rgba(242,240,236,0.4)');
  crosshair(ctx, cx - box / 2, cy + box / 2, 10, 'rgba(242,240,236,0.3)');
  crosshair(ctx, cx + box / 2, cy - box / 2, 10, 'rgba(242,240,236,0.3)');

  headline(ctx, m.player || '', 866, { max: 82 });
  accentRule(ctx, ART_W / 2, 908);

  if (m.position) {
    tracked(ctx, m.position, ART_W / 2, 954, { size: 12, track: 3.6, color: DIM, align: 'center' });
  }

  /* What he did it in. An award with no match attached is a poster. */
  const sub = [m.opponent ? `v ${m.opponent}` : null, m.scoreLine || null, m.dateLine || null]
    .filter(Boolean).join('   ·   ');
  tracked(ctx, sub, ART_W / 2, 998, { size: 12, track: 3.2, color: DIM, align: 'center' });

  closeCard(ctx, m.competition || '');
}

/* ---- 4. Final result ---------------------------------------------------- */

export function finalResult(ctx, m, assets = {}) {
  openCard(ctx, assets.art, { strength: 0.32 });
  drawArc(ctx, ART_W / 2, 600, 372);

  tracked(ctx, 'Full time', ART_W / 2, PANEL.y + 84,
    { size: 13, track: 7, color: ORANGE, align: 'center' });

  /* THE SCORE IS THE GRAPHIC. A walkover has none - the published table adds
     no goals for one - so it says what it was rather than printing a scoreline
     nobody ever recorded. */
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = PAPER;
  if (m.noScore) {
    ctx.font = `800 ${fitText(ctx, upper(m.noScore), PANEL.w - 140, 62)}px "${DISPLAY}"`;
    ctx.fillText(upper(m.noScore), ART_W / 2, 510);
  } else {
    /* Two numbers either side of a hairline rather than one string with a
       dash: each score then sits under its own badge and it reads as a
       scoreboard instead of as a sum. */
    ctx.font = `800 150px "${DISPLAY}"`;
    const off = 116;
    ctx.fillText(String(m.ourGoals), ART_W / 2 - off, 530);
    ctx.fillText(String(m.theirGoals), ART_W / 2 + off, 530);
    ctx.strokeStyle = HAIR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ART_W / 2, 440);
    ctx.lineTo(ART_W / 2, 548);
    ctx.stroke();
  }
  ctx.restore();

  drawFixtureBadges(ctx, {
    usBadge: assets.crest, oppBadge: assets.oppBadge, opponent: m.opponent, y: 706, size: 96,
  });

  if ((m.scorers || []).length) {
    tracked(ctx, 'Scorers', ART_W / 2, 900, { size: 11, track: 3.6, color: ORANGE, align: 'center' });
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = PAPER;
    ctx.font = `600 26px "${BODY}"`;
    wrapLines(ctx, m.scorers.join('   ·   '), PANEL.w - 130).slice(0, 2)
      .forEach((l, i) => ctx.fillText(l, ART_W / 2, 946 + i * 36));
    ctx.restore();
  }

  const foot = [m.competition, m.dateLine, m.weAreHome ? 'Home' : 'Away'].filter(Boolean).join('   ·   ');
  tracked(ctx, foot, ART_W / 2, 1040, { size: 12, track: 3.2, color: DIM, align: 'center' });

  closeCard(ctx, m.venue || '');
}

export const CARDS = {
  next: { key: 'next', label: 'Next game', draw: nextGame },
  squad: { key: 'squad', label: 'Matchday squad', draw: matchdaySquad },
  motm: { key: 'motm', label: 'Man of the match', draw: manOfTheMatch },
  result: { key: 'result', label: 'Final result', draw: finalResult },
};

/* ==========================================================================
   RECORD -> CARD

   The adapter, and it lives here rather than at each call site so the panel
   and any renderer shape a match the same way. Everything the records hold is
   keyed by squad number; nothing below emits one.
   ========================================================================== */

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* "SUN 30 AUGUST". No year: every one of these cards is published within days
   of the match it describes, so the year is noise, and a card that outlives
   that window has bigger problems than its date format. */
export function dateLine(iso) {
  if (!iso) return '';
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  return `${DAYS_SHORT[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]}`;
}

/* A goal as it is read out: "Owolona 20’". The minute is printed only where
   the record carries one - a goal with no minute does not acquire one. */
function scorerLine(g, squad) {
  const raw = nameOf(g.num, squad);
  /* A goal whose scorer cannot be named is left off rather than credited to
     "Guest". Listing who was on the pitch and crediting a goal to a person are
     different claims, and only the second one names somebody. */
  if (!raw || raw === GUEST) return '';
  const name = surname(raw);
  const min = g.minute == null || g.minute === '' ? '' : ` ${g.minute}’`;
  const pen = g.penalty ? ' (pen)' : '';
  return `${name}${min}${pen}`;
}

export function cardDataFor(kind, m, d) {
  const squad = (d && (d.squad || d.players)) || [];
  const det = (m && m.detail) || {};
  const base = {
    opponent: m.opponent || '',
    competition: m.competition || '',
    weAreHome: !!m.weAreHome,
    venue: m.venue || '',
    kick: m.kick || '',
    dateLine: dateLine(m.iso || m.date),
  };

  if (kind === 'next') return base;

  if (kind === 'squad') {
    return {
      ...base,
      /* No filter. Eleven entries in the record are eleven names on the card;
         one that cannot be named says Guest rather than disappearing. */
      starters: (det.starters || []).map((s) => nameOf(s.num, squad)),
      subs: (det.subs || []).map((s) => nameOf(s.num, squad)),
    };
  }

  if (kind === 'motm') {
    const num = det.motm;
    const p = playerOf(num, squad);
    if (!p) return null;                     /* no award, no card */
    return {
      ...base,
      player: p.name,
      position: p.position || p.positionName || '',
      slug: p.slug || '',
      scoreLine: m.countsGoals === false ? '' : `${m.ourGoals}-${m.theirGoals}`,
    };
  }

  if (kind === 'result') {
    return {
      ...base,
      ourGoals: m.ourGoals,
      theirGoals: m.theirGoals,
      /* A walkover is a result with no scoreline: the published table adds no
         goals for one, so printing 3-0 would invent a score the league never
         recorded. */
      noScore: m.isWalkover ? 'Awarded · walkover' : '',
      scorers: (det.goals || []).map((g) => scorerLine(g, squad)).filter(Boolean),
    };
  }

  return null;
}
