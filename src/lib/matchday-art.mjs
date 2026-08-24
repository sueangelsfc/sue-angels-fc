/* ==========================================================================
   MATCHDAY GRAPHICS

   Four cards the club publishes around a match, drawn from the match record
   rather than made by hand:

     nextGame        the fixture, before it is played
     matchdaySquad   who is in the squad
     manOfTheMatch   the award, once a result is entered
     finalResult     the score

   ONE IMPLEMENTATION, TWO CALLERS. The control panel draws these in the
   browser on save, and the sample renderer draws them in headless Chrome.
   Both call the functions below against a 2D context, so a graphic the club
   signs off cannot differ from one it publishes.

   ---- THE CLUB'S OWN HOUSE STYLE, TAKEN FROM ITS OWN POSTS -----------------

     THE BADGES ARE THE SUBJECT, AND THEY SIT CLOSE. Two crests three hundred
     pixels either side of the middle read as two separate things that happen
     to share a card. On the club's own graphics they are near enough to be
     one object with a score or a "vs" between them, and that is what makes it
     a fixture rather than a layout.

     THE DRAWING IS ORANGE AND THERE IS A LOT OF IT. A grid, concentric arcs
     off every corner, dashed runs, dimension arrows with end caps, tick
     ladders and hatch panels - all at low alpha, all in the club's colour.
     This is the difference between a black card with things on it and a card
     that looks made.

     TEXT BREAKS THE LINE IT CROSSES. Every label knocks out a padded box
     behind itself before it draws, so nothing is ever set on top of a rule.
     That is how a real technical drawing handles a label, and it is also the
     only way to keep a full-width ring and centred type on the same card
     without one fouling the other.

     RULED HEADINGS, brackets and edge marks, sponsors on white tiles under
     "PROUDLY BACKED BY", and a footer bar with the handle and the address.

     SQUARE. The club posts 1:1.

   ORANGE IS THE 26/27 COLOUR: #FF7034, the same accent the website uses, and
   the only hue on the card.

   TYPE is Saira, self-hosted. The site's own bundle declares Geist and
   retired Archivo, so earlier versions of these cards were asking for a face
   that was not being served and rendering in a system fallback.

   Sixteen of thirty-six players have no photograph, so no layout depends on
   one. NO SQUAD NUMBERS: the records key everything by `num` and the site
   never shows one, so `nameOf` is the only thing that turns one into a name.
   ========================================================================== */

export const ART_W = 1080;
export const ART_H = 1080;

/* The club's own, verbatim, and not shortened: "what we do echoes" is a
   different sentence. It is on the crest itself, so the cards do not repeat
   it large. */
export const MOTTO = 'What we do in life echoes in eternity.';

const ACCENT = '#FF7034';
const INK = '#080A0E';
const PAPER = '#FFFFFF';
const DIM = 'rgba(255,255,255,0.62)';

/* The drawing's own ramp. Every line on the card comes from one of these, so
   the whole thing lightens or darkens from four numbers. */
const L1 = 'rgba(255,112,52,0.055)';   /* the grid */
const L2 = 'rgba(255,112,52,0.13)';    /* structure */
const L3 = 'rgba(255,112,52,0.26)';    /* emphasis */
const L4 = 'rgba(255,112,52,0.55)';    /* the ring, rules */

const FACE = 'Saira';

/* ---- Small helpers ------------------------------------------------------ */

const upper = (s) => String(s == null ? '' : s).toUpperCase();

/* A surname alone, which is how a line-up is read aloud.

   THE LAST WORD IS NOT ALWAYS THE SURNAME. "Jim El Bayati" set as "BAYATI" is
   not his name, and a team sheet is the one place on this site where getting
   somebody's name wrong is certain to be noticed by the person it belongs
   to. A particle in front of the final word is part of it. */
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
   hold is keyed by number and nothing published may show one, so a lookup
   that misses must never fall through to printing the number.

   IT MUST NOT SILENTLY DROP THEM EITHER. The 2 August team sheet carries
   numbers 900 and 901 against a squad whose highest is 37: two guests in a
   friendly, entered as placeholders. Filtering them drew a card headed
   "Matchday squad" with NINE names under it. */
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

function fitText(ctx, text, maxW, startPx, opts = {}) {
  const weight = opts.weight == null ? 700 : opts.weight;
  const min = opts.min == null ? 14 : opts.min;
  let px = startPx;
  for (;;) {
    ctx.font = `${weight} ${px}px "${FACE}"`;
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

/* THE KNOCKOUT. Clears a padded box in the card's own ink before text is
   drawn over it, so a label crossing the ring breaks the ring instead of
   sitting on it. Drawing order alone cannot solve this - the ring is full
   width and the type is centred, so they always meet somewhere. */
function knockout(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = INK;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/* Letterspaced caps, a character at a time, because canvas has no
   letterSpacing in every engine this has to run in. Knocks out behind itself
   by default. Returns the drawn width so a caller can rule either side. */
function tracked(ctx, text, x, y, opts = {}) {
  const size = opts.size == null ? 20 : opts.size;
  const track = opts.track == null ? 5 : opts.track;
  const weight = opts.weight == null ? 700 : opts.weight;
  const align = opts.align || 'left';
  const color = opts.color || PAPER;
  const s = upper(text);
  if (!s) return 0;
  ctx.save();
  ctx.font = `${weight} ${size}px "${FACE}"`;
  ctx.textAlign = 'left';
  const total = ctx.measureText(s).width + track * Math.max(0, s.length - 1);
  const left = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  if (opts.plate !== false) {
    const padX = opts.padX == null ? 16 : opts.padX;
    const padY = opts.padY == null ? 10 : opts.padY;
    knockout(ctx, left - padX, y - size - padY + 2, total + padX * 2, size + padY * 2);
  }
  ctx.fillStyle = color;
  let cx = left;
  for (const ch of s) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + track; }
  ctx.restore();
  return total;
}

/* Plain centred text, same knockout rule. */
function centred(ctx, text, y, opts = {}) {
  const size = opts.size == null ? 30 : opts.size;
  const weight = opts.weight == null ? 700 : opts.weight;
  const color = opts.color || PAPER;
  const x = opts.x == null ? ART_W / 2 : opts.x;
  if (!text) return;
  ctx.save();
  ctx.font = `${weight} ${size}px "${FACE}"`;
  ctx.textAlign = 'center';
  const w = ctx.measureText(text).width;
  if (opts.plate !== false) {
    const padX = opts.padX == null ? 18 : opts.padX;
    const padY = opts.padY == null ? 10 : opts.padY;
    knockout(ctx, x - w / 2 - padX, y - size - padY + 4, w + padX * 2, size + padY * 2);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/* ---- The drawing -------------------------------------------------------- */

/* All of it orange, all of it low, and deliberately more than feels
   necessary: the club's own cards are dense, and a card with three lines on
   it reads as unfinished next to them. Every co-ordinate is fixed rather than
   random so the drawing is identical under every card in a set. */
function drawBlueprint(ctx) {
  ctx.save();

  /* The grid. */
  ctx.strokeStyle = L1;
  ctx.lineWidth = 1;
  for (let x = 60; x < ART_W; x += 60) {
    ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, ART_H); ctx.stroke();
  }
  for (let y = 60; y < ART_H; y += 60) {
    ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(ART_W, y + 0.5); ctx.stroke();
  }

  /* Concentric arcs off every corner, running out of frame. */
  ctx.strokeStyle = L2;
  for (const [cx, cy] of [[0, 0], [ART_W, 0], [0, ART_H], [ART_W, ART_H]]) {
    for (const r of [150, 210, 270, 400]) {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    }
  }
  for (const [cx, cy, r] of [[112, 246, 74], [112, 246, 42], [968, 300, 108], [960, 812, 132], [150, 836, 96]]) {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  }

  /* Dashed structure. */
  ctx.setLineDash([8, 10]);
  ctx.strokeStyle = L2;
  for (const [x1, y1, x2, y2] of [
    [0, 180, ART_W, 180], [0, 900, ART_W, 900],
    [180, 0, 180, ART_H], [900, 0, 900, ART_H],
    [0, 0, ART_W, ART_H], [ART_W, 0, 0, ART_H],
  ]) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  ctx.setLineDash([]);

  /* Dimension arrows with end caps, as on a drawing. */
  ctx.strokeStyle = L3;
  ctx.lineWidth = 1.4;
  const dim = (x, y, len, dir) => {
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x, y + dir * len);
    ctx.moveTo(x - 8, y + dir * 16); ctx.lineTo(x, y); ctx.lineTo(x + 8, y + dir * 16);
    ctx.moveTo(x - 11, y + dir * len); ctx.lineTo(x + 11, y + dir * len);
    ctx.stroke();
  };
  dim(60, 300, 120, 1); dim(1020, 400, 140, 1);
  dim(60, 780, 120, -1); dim(1020, 880, 140, -1);

  /* Tick ladders. */
  ctx.strokeStyle = L2;
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i += 1) {
    const y = 200 + i * 26;
    const len = i % 4 === 0 ? 22 : 12;
    ctx.beginPath(); ctx.moveTo(26, y); ctx.lineTo(26 + len, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ART_W - 26, y + 320); ctx.lineTo(ART_W - 26 - len, y + 320); ctx.stroke();
  }

  /* Hatch panels. */
  ctx.strokeStyle = L1;
  for (const [bx, by, bw, bh] of [[0, 940, 210, 140], [ART_W - 190, 0, 190, 130]]) {
    ctx.save();
    ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
    for (let i = -bh; i < bw; i += 11) {
      ctx.beginPath(); ctx.moveTo(bx + i, by + bh); ctx.lineTo(bx + i + bh, by); ctx.stroke();
    }
    ctx.restore();
  }

  /* Small crosshairs scattered on the grid intersections. */
  ctx.strokeStyle = L3;
  for (const [x, y] of [[180, 180], [900, 180], [180, 900], [900, 900], [540, 60], [540, 1020]]) {
    ctx.beginPath();
    ctx.moveTo(x - 9, y); ctx.lineTo(x + 9, y);
    ctx.moveTo(x, y - 9); ctx.lineTo(x, y + 9);
    ctx.stroke();
  }
  ctx.restore();
}

/* Accent brackets at the corners, filled squares at the edge midpoints, and
   the dotted run down the top left. All straight off the club's own cards. */
function drawFrame(ctx) {
  const m = 26;
  const len = 58;
  ctx.save();
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 3;
  for (const [x, y, dx, dy] of [
    [m, m, 1, 1], [ART_W - m, m, -1, 1], [m, ART_H - m, 1, -1], [ART_W - m, ART_H - m, -1, -1],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x + dx * len, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * len);
    ctx.stroke();
  }
  ctx.fillStyle = ACCENT;
  const s = 13;
  ctx.fillRect(ART_W / 2 - s / 2, m - s / 2, s, s);
  ctx.fillRect(ART_W / 2 - s / 2, ART_H - m - s / 2, s, s);
  ctx.fillRect(m - s / 2, ART_H / 2 - s / 2, s, s);
  ctx.fillRect(ART_W - m - s / 2, ART_H / 2 - s / 2, s, s);
  for (let i = 0; i < 5; i += 1) ctx.fillRect(m - 4, m + 48 + i * 22, 8, 8);
  ctx.restore();
}

/* The ring. Everything that matters sits inside it. */
function drawRing(ctx, cy, r) {
  ctx.save();
  ctx.strokeStyle = L4;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(ART_W / 2, cy, r, 0, Math.PI * 2); ctx.stroke();

  /* A second, tighter ring, broken into arcs. */
  ctx.strokeStyle = L2;
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 8; i += 1) {
    const a0 = (i / 8) * Math.PI * 2 + 0.09;
    ctx.beginPath();
    ctx.arc(ART_W / 2, cy, r - 22, a0, a0 + (Math.PI * 2) / 8 - 0.18);
    ctx.stroke();
  }

  ctx.fillStyle = ACCENT;
  const s = 12;
  for (const a of [-Math.PI / 2, 0, Math.PI / 2, Math.PI]) {
    ctx.fillRect(ART_W / 2 + Math.cos(a) * r - s / 2, cy + Math.sin(a) * r - s / 2, s, s);
  }
  ctx.restore();
}

/* A heading between two rules. */
function ruled(ctx, text, y, opts = {}) {
  const size = opts.size == null ? 27 : opts.size;
  const color = opts.color || PAPER;
  const w = tracked(ctx, text, ART_W / 2, y, { size, track: 7, weight: 700, align: 'center', color });
  ctx.save();
  ctx.strokeStyle = opts.rule || ACCENT;
  ctx.lineWidth = 2;
  const gap = 30;
  const len = opts.ruleLen == null ? 62 : opts.ruleLen;
  const yy = y - size * 0.34;
  ctx.beginPath();
  ctx.moveTo(ART_W / 2 - w / 2 - gap, yy); ctx.lineTo(ART_W / 2 - w / 2 - gap - len, yy);
  ctx.moveTo(ART_W / 2 + w / 2 + gap, yy); ctx.lineTo(ART_W / 2 + w / 2 + gap + len, yy);
  ctx.stroke();
  ctx.restore();
}

/* A badge, big. `img` may be null - one club in twenty-six has no crest, and
   that draws its initials on a ring rather than leaving a hole. */
export function drawBadge(ctx, img, cx, cy, size, fallbackName) {
  ctx.save();
  if (img && img.width) {
    const s = Math.min(size / img.width, size / img.height);
    const w = img.width * s;
    const h = img.height * s;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,0.34)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, size / 2, 0, Math.PI * 2); ctx.stroke();
    const initials = String(fallbackName || '')
      .split(/\s+/).filter(Boolean).slice(0, 3).map((w) => w[0]).join('').toUpperCase();
    ctx.fillStyle = PAPER;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(size * 0.26)}px "${FACE}"`;
    ctx.fillText(initials, cx, cy + 1);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();
}

/* The sponsors, on white tiles, because they paid to be on the card. Drawn
   from the same list the website publishes so the two cannot drift. */
function drawSponsors(ctx, logos, y) {
  const list = (logos || []).filter((l) => l && l.img && l.img.width).slice(0, 4);
  if (!list.length) return;
  ruled(ctx, 'Proudly backed by', y, { size: 17, ruleLen: 48, rule: L3, color: DIM });

  const tileW = 196;
  const tileH = 78;
  const gap = 14;
  const total = list.length * tileW + (list.length - 1) * gap;
  let x = (ART_W - total) / 2;
  const top = y + 24;
  for (const l of list) {
    ctx.save();
    ctx.fillStyle = PAPER;
    ctx.fillRect(x, top, tileW, tileH);
    /* Contain, never cover: a partner's mark is never cropped. */
    const pad = 16;
    const s = Math.min((tileW - pad * 2) / l.img.width, (tileH - pad * 2) / l.img.height);
    ctx.drawImage(l.img, x + (tileW - l.img.width * s) / 2, top + (tileH - l.img.height * s) / 2,
      l.img.width * s, l.img.height * s);
    ctx.restore();
    x += tileW + gap;
  }
}

/* The footer bar: handle left, website right, rule above. */
function drawFooter(ctx) {
  const y = ART_H - 44;
  ctx.save();
  ctx.strokeStyle = L3;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(72, y - 26); ctx.lineTo(ART_W - 72, y - 26); ctx.stroke();

  /* The Instagram glyph, drawn rather than loaded: four strokes, no asset. */
  const ix = 76;
  const iy = y - 11;
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 2;
  const r = 5;
  const b = 20;
  ctx.beginPath();
  ctx.moveTo(ix + r, iy - b / 2);
  ctx.arcTo(ix + b, iy - b / 2, ix + b, iy + b / 2, r);
  ctx.arcTo(ix + b, iy + b / 2, ix, iy + b / 2, r);
  ctx.arcTo(ix, iy + b / 2, ix, iy - b / 2, r);
  ctx.arcTo(ix, iy - b / 2, ix + b, iy - b / 2, r);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath(); ctx.arc(ix + b / 2, iy, 4.5, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  tracked(ctx, '@suesangelsfc', 110, y - 4, { size: 17, track: 1.6, color: DIM, plate: false });
  tracked(ctx, 'www.suesangelsfc.co.uk', ART_W - 74, y - 4,
    { size: 17, track: 1.6, color: DIM, align: 'right', plate: false });
}

export function openCard(ctx) {
  ctx.save();
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, ART_W, ART_H);
  ctx.restore();
  drawBlueprint(ctx);
  drawFrame(ctx);
}

export function closeCard(ctx, assets) {
  drawSponsors(ctx, assets && assets.sponsors, ART_H - 186);
  drawFooter(ctx);
}

/* BOTH BADGES, CLOSE TOGETHER. 218 either side of the middle rather than 300:
   at 300 they read as two separate objects on one card, and the club's own
   graphics keep them near enough to be a single fixture with the score or the
   "vs" held between them. */
function drawFixtureBadges(ctx, o) {
  const size = o.size == null ? 210 : o.size;
  const off = o.off == null ? 218 : o.off;
  const cy = o.y;
  drawBadge(ctx, o.leftBadge, ART_W / 2 - off, cy, size, o.leftName);
  drawBadge(ctx, o.rightBadge, ART_W / 2 + off, cy, size, o.rightName);
  const lab = cy + size / 2 + 48;
  tracked(ctx, o.leftName || '', ART_W / 2 - off, lab, { size: 20, track: 2.6, align: 'center' });
  tracked(ctx, o.rightName || '', ART_W / 2 + off, lab, { size: 20, track: 2.6, align: 'center' });
  return lab;
}

/* ---- 1. Next game ------------------------------------------------------- */

export function nextGame(ctx, m, assets = {}) {
  openCard(ctx);
  drawRing(ctx, 466, 384);

  ruled(ctx, m.competition || 'Fixture', 148, { size: 23 });

  /* Home club on the left, as a fixture is written. */
  const weLeft = !!m.weAreHome;
  drawFixtureBadges(ctx, {
    leftBadge: weLeft ? assets.crest : assets.oppBadge,
    rightBadge: weLeft ? assets.oppBadge : assets.crest,
    leftName: weLeft ? 'Sue’s Angels' : m.opponent,
    rightName: weLeft ? m.opponent : 'Sue’s Angels',
    y: 396,
  });

  centred(ctx, 'VS', 412, { size: 42, padX: 22 });
  tracked(ctx, weLeft ? 'Home' : 'Away', ART_W / 2 - 218, 584, { size: 15, track: 3, align: 'center', color: ACCENT });
  tracked(ctx, weLeft ? 'Away' : 'Home', ART_W / 2 + 218, 584, { size: 15, track: 3, align: 'center', color: ACCENT });

  ctx.save();
  ctx.strokeStyle = L3;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(250, 640); ctx.lineTo(ART_W - 250, 640); ctx.stroke();
  ctx.restore();

  tracked(ctx, m.dateLine || '', ART_W / 2, 702, { size: 29, track: 4.5, align: 'center' });
  tracked(ctx, m.kick ? `${m.kick} kick off` : 'Kick-off to be confirmed', ART_W / 2, 762,
    { size: 42, track: 4, align: 'center', color: ACCENT });
  if (m.venue) tracked(ctx, m.venue, ART_W / 2, 812, { size: 20, track: 2.8, align: 'center', color: DIM });

  closeCard(ctx, assets);
}

/* ---- 2. Matchday squad -------------------------------------------------- */

export function matchdaySquad(ctx, m, assets = {}) {
  openCard(ctx);
  drawRing(ctx, 528, 398);

  ruled(ctx, 'Matchday squad', 148, { size: 25 });

  drawBadge(ctx, assets.crest, ART_W / 2 - 214, 292, 168, 'Sue’s Angels');
  drawBadge(ctx, assets.oppBadge, ART_W / 2 + 214, 292, 168, m.opponent);
  centred(ctx, 'V', 304, { size: 30, color: DIM, padX: 20 });
  tracked(ctx, m.opponent || '', ART_W / 2, 412, { size: 19, track: 2.8, align: 'center', color: DIM });

  const starters = (m.starters || []).filter(Boolean);
  const subs = (m.subs || []).filter(Boolean);
  const left = starters.slice(0, Math.ceil(starters.length / 2));
  const right = starters.slice(Math.ceil(starters.length / 2));

  /* NO "STARTING ELEVEN" LABEL. The card is headed Matchday squad and that is
     what it lists: naming the block again underneath said something the
     heading had already said, and said it differently. */
  ctx.save();
  const rowH = 46;
  const top = 486;
  const colW = 380;
  const draw = (list, cx) => list.forEach((n, i) => {
    const t = upper(surname(n));
    const px = fitText(ctx, t, colW, 31, { weight: 600 });
    centred(ctx, t, top + i * rowH, { size: px, weight: 600, x: cx, padX: 14, padY: 7 });
  });
  draw(left, ART_W / 2 - 212);
  draw(right, ART_W / 2 + 212);
  ctx.restore();

  const bottom = top + Math.max(left.length, right.length) * rowH;
  if (subs.length) {
    tracked(ctx, 'Substitutes', ART_W / 2, bottom + 10, { size: 15, track: 4, align: 'center', color: ACCENT });
    ctx.save();
    ctx.font = `500 20px "${FACE}"`;
    const lines = wrapLines(ctx, subs.map((n) => upper(surname(n))).join('  ·  '), 760).slice(0, 2);
    ctx.restore();
    lines.forEach((l, i) => centred(ctx, l, bottom + 46 + i * 28, { size: 20, weight: 500, color: DIM }));
  } else {
    /* Eleven names and then nothing reads as a graphic that failed to finish.
       Sunday league sheets frequently name nobody on the bench. */
    tracked(ctx, 'No substitutes named', ART_W / 2, bottom + 10,
      { size: 15, track: 4, align: 'center', color: 'rgba(255,255,255,0.34)' });
  }

  closeCard(ctx, assets);
}

/* ---- 3. Man of the match ------------------------------------------------ */

export function manOfTheMatch(ctx, m, assets = {}) {
  openCard(ctx);
  drawRing(ctx, 452, 372);

  ruled(ctx, 'Man of the match', 148, { size: 25 });

  /* The portrait where one exists, the crest where it does not. Sixteen of
     thirty-six have none, so the frame is the constant and what sits in it is
     the variable: the card is composed identically either way. */
  const cx = ART_W / 2;
  const cy = 420;
  const box = 300;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, box / 2, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = INK;
  ctx.fillRect(cx - box / 2, cy - box / 2, box, box);
  if (assets.photo && assets.photo.width) {
    const s = Math.max(box / assets.photo.width, box / assets.photo.height);
    ctx.drawImage(assets.photo, cx - (assets.photo.width * s) / 2, cy - (assets.photo.height * s) / 2,
      assets.photo.width * s, assets.photo.height * s);
  } else {
    drawBadge(ctx, assets.crest, cx, cy, 208, 'Sue’s Angels');
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, box / 2, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  const nm = upper(m.player || '');
  centred(ctx, nm, 664, { size: fitText(ctx, nm, 880, 70, { weight: 700 }), weight: 700, padX: 24 });
  if (m.position) {
    tracked(ctx, m.position, ART_W / 2, 712, { size: 19, track: 3.2, align: 'center', color: ACCENT });
  }

  ctx.save();
  ctx.strokeStyle = L3;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(300, 752); ctx.lineTo(ART_W - 300, 752); ctx.stroke();
  ctx.restore();

  /* What he did it in. An award with no match attached is a poster. */
  const sub = [m.opponent ? `v ${m.opponent}` : null, m.scoreLine || null].filter(Boolean).join('   ·   ');
  tracked(ctx, sub, ART_W / 2, 800, { size: 20, track: 2.8, align: 'center', color: PAPER });
  tracked(ctx, m.dateLine || '', ART_W / 2, 840, { size: 17, track: 2.6, align: 'center', color: DIM });

  closeCard(ctx, assets);
}

/* ---- 4. Final result ---------------------------------------------------- */

export function finalResult(ctx, m, assets = {}) {
  openCard(ctx);
  drawRing(ctx, 448, 384);

  ruled(ctx, 'Full time', 148, { size: 29 });

  const weLeft = !!m.weAreHome;

  drawFixtureBadges(ctx, {
    leftBadge: weLeft ? assets.crest : assets.oppBadge,
    rightBadge: weLeft ? assets.oppBadge : assets.crest,
    leftName: weLeft ? 'Sue’s Angels' : m.opponent,
    rightName: weLeft ? m.opponent : 'Sue’s Angels',
    y: 390,
    size: 196,
    off: 226,
  });

  /* THE SCORE IS THE GRAPHIC. A walkover has none - the published table adds
     no goals for one - so it says what it was instead of printing a scoreline
     nobody ever recorded. The club's colour marks OUR number. */
  if (m.noScore) {
    const t = upper(m.noScore);
    centred(ctx, t, 406, { size: fitText(ctx, t, 300, 34, { weight: 700 }), padX: 20 });
  } else {
    const l = weLeft ? m.ourGoals : m.theirGoals;
    const r = weLeft ? m.theirGoals : m.ourGoals;
    knockout(ctx, ART_W / 2 - 92, 306, 184, 168);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = `700 116px "${FACE}"`;
    ctx.fillStyle = weLeft ? ACCENT : PAPER;
    ctx.fillText(String(l), ART_W / 2 - 48, 432);
    ctx.fillStyle = weLeft ? PAPER : ACCENT;
    ctx.fillText(String(r), ART_W / 2 + 48, 432);
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.font = `500 62px "${FACE}"`;
    ctx.fillText('-', ART_W / 2, 424);
    ctx.restore();
  }

  /* Scorers, under the club's own badge, which is where the club puts them.
     The minute is printed only where the record carries one. */
  if ((m.scorers || []).length) {
    const cx = ART_W / 2 + (weLeft ? -226 : 226);
    tracked(ctx, 'Goalscorers', cx, 566, { size: 15, track: 3.2, align: 'center', color: ACCENT });
    m.scorers.slice(0, 5).forEach((s, i) => centred(ctx, upper(s), 598 + i * 27,
      { size: 19, weight: 600, x: cx, padX: 12, padY: 6 }));
  }

  ctx.save();
  ctx.strokeStyle = L3;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(250, 762); ctx.lineTo(ART_W - 250, 762); ctx.stroke();
  ctx.restore();

  tracked(ctx, m.dateLine || '', ART_W / 2, 818, { size: 26, track: 4.5, align: 'center' });

  closeCard(ctx, assets);
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
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/* "SUNDAY 16 AUGUST 2026", which is exactly how the club sets it on its own
   graphics: full weekday, full month, and the year. The website drops the year
   on a fixture card because the page around it dates itself; a graphic does
   not, because it gets saved, reposted and looked at again months later. */
export function dateLine(iso) {
  if (!iso) return '';
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  return `${DAYS_LONG[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
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
