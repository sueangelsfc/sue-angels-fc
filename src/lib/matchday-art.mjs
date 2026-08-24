/* ==========================================================================
   MATCHDAY GRAPHICS

   Five cards the club publishes, drawn from the match record rather than made
   by hand:

     nextGame          the fixture, before it is played
     matchdaySquad     who is in the squad
     manOfTheMatch     the award, once a result is entered
     finalResult       the score
     playerOfTheMonth  the monthly award

   ONE IMPLEMENTATION, TWO CALLERS. The control panel draws these in the
   browser on save; the sample renderer draws them in headless Chrome. Both
   call these functions against a 2D context, so a card the club signs off
   cannot differ from one it publishes.

   ---- THE LANGUAGE ---------------------------------------------------------

   Two sources, and the blend is the brief: the club's own posted graphics for
   density and colour, and a layered editorial reference for composition.

     A SHEET ON A LARGER SHEET. A panel inset from the edge, a shade lighter
     than the field, hairline border. The club's wordmark repeats across the
     FULL width behind it, so the panel crops it and it survives only as
     fragments in the margins. That cropping is the whole effect.

     THE MARGINS CARRY THE TEAMS. Each club's name is set small in the margin
     beside its own badge, wrapped over two lines with a filled square marker,
     as a technical drawing labels the thing it points at.

     THE BADGES ARE THE SUBJECT AND THEY SIT CLOSE, each inside registration
     brackets, with the score or the "vs" held between them.

     THE COMPETITION IS NAMED under the badges. A card that does not say what
     the match was is a card that stops being useful the week after.

     THE DRAWING IS ORANGE AND THERE IS A LOT OF IT: a grid, concentric
     clusters with crosshair centres, long arrows with heads, dashed runs,
     tick ladders, hatch panels, plus marks, angular brackets. Seeded PER CARD,
     so the five are related without being identical, and deterministic, so a
     rebuild produces the same drawing.

     TEXT BREAKS THE LINE IT CROSSES. Every label knocks out a padded box
     first, so nothing is ever set on top of a rule.

     SPONSORS ON WHITE TILES, and a footer bar with the handle, the address
     and the club's own line.

     SQUARE. The club posts 1:1.

   ORANGE IS THE 26/27 COLOUR: #FF7034, the accent the website uses, and the
   only hue on the card.

   TYPE. Michroma for display - a Eurostile-shaped face, wide and square,
   which is what the club's own cards are set in. Oxanium for names and lists,
   squarish too but narrow enough that a long surname is still legible. The
   site's own bundle ships neither: it declares Geist and retired Archivo, so
   earlier versions of these cards were asking for a face that was not being
   served and rendering in a system fallback.

   Sixteen of thirty-six players have no photograph, so no layout depends on
   one. NO SQUAD NUMBERS: the records key everything by `num` and the site
   never shows one, so `nameOf` is the only thing that turns one into a name.
   ========================================================================== */

export const ART_W = 1080;
export const ART_H = 1080;

/* The club's own, verbatim, and not shortened: "what we do echoes" is a
   different sentence. */
export const MOTTO = 'What we do in life echoes in eternity.';

const ACCENT = '#FF7034';
const INK = '#07080B';
const PANEL_INK = '#0C0E13';
const PAPER = '#FFFFFF';
const DIM = 'rgba(255,255,255,0.60)';
const FAINT = 'rgba(255,255,255,0.34)';

/* The drawing's ramp. Every line comes from one of these, so the whole card
   lightens or darkens from four numbers. */
const L1 = 'rgba(255,112,52,0.06)';
const L2 = 'rgba(255,112,52,0.14)';
const L3 = 'rgba(255,112,52,0.30)';
const L4 = 'rgba(255,112,52,0.62)';

const DISPLAY = 'Michroma';
const TEXT = 'Oxanium';

/* The panel, and the margins it leaves for the team labels. */
const P = { x: 112, y: 92, w: 856, h: 856 };
const P_BOTTOM = P.y + P.h;

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
  const family = opts.family || DISPLAY;
  const weight = opts.weight == null ? 400 : opts.weight;
  const min = opts.min == null ? 12 : opts.min;
  let px = startPx;
  for (;;) {
    ctx.font = `${weight} ${px}px "${family}"`;
    if (ctx.measureText(text).width <= maxW || px <= min) break;
    px -= 1;
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

/* Deterministic pseudo-random, so each card gets its own drawing and a
   rebuild produces the same one. Math.random would reshuffle every card on
   every render and there would be no such thing as a signed-off graphic. */
function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const seedOf = (key) => {
  let h = 2166136261;
  for (const ch of String(key)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
};

/* THE KNOCKOUT. Clears a padded box in the panel's own ink before text draws
   over it, so a label crossing the ring breaks the ring rather than sitting
   on it. Drawing order cannot solve this: the ring is wide and the type is
   centred, so they always meet somewhere. */
function knockout(ctx, x, y, w, h, colour) {
  ctx.save();
  ctx.fillStyle = colour || PANEL_INK;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/* Letterspaced caps, a character at a time, because canvas has no
   letterSpacing in every engine this has to run in. Returns the drawn width
   so a caller can rule either side of it. */
function tracked(ctx, text, x, y, opts = {}) {
  const size = opts.size == null ? 15 : opts.size;
  const track = opts.track == null ? 4 : opts.track;
  const weight = opts.weight == null ? 600 : opts.weight;
  const family = opts.family || TEXT;
  const align = opts.align || 'left';
  const color = opts.color || PAPER;
  const s = upper(text);
  if (!s) return 0;
  ctx.save();
  ctx.font = `${weight} ${size}px "${family}"`;
  ctx.textAlign = 'left';
  const total = ctx.measureText(s).width + track * Math.max(0, s.length - 1);
  const left = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  if (opts.plate !== false) {
    const padX = opts.padX == null ? 14 : opts.padX;
    const padY = opts.padY == null ? 9 : opts.padY;
    knockout(ctx, left - padX, y - size - padY + 3, total + padX * 2, size + padY * 2, opts.plateColour);
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
  const family = opts.family || DISPLAY;
  const weight = opts.weight == null ? 400 : opts.weight;
  const color = opts.color || PAPER;
  const x = opts.x == null ? ART_W / 2 : opts.x;
  if (!text) return;
  ctx.save();
  ctx.font = `${weight} ${size}px "${family}"`;
  ctx.textAlign = 'center';
  const w = ctx.measureText(text).width;
  if (opts.plate !== false) {
    const padX = opts.padX == null ? 18 : opts.padX;
    const padY = opts.padY == null ? 10 : opts.padY;
    knockout(ctx, x - w / 2 - padX, y - size - padY + 5, w + padX * 2, size + padY * 2, opts.plateColour);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/* ---- The drawing -------------------------------------------------------- */

/* All orange, all low, and deliberately more than feels necessary: the club's
   own cards are dense, and three lines on a black field reads as unfinished
   beside them. Seeded by card so the five are related without being copies. */
function drawBlueprint(ctx, key) {
  const rnd = lcg(seedOf(key));
  const pick = (a, b) => a + rnd() * (b - a);
  ctx.save();

  ctx.strokeStyle = L1;
  ctx.lineWidth = 1;
  for (let x = 45; x < ART_W; x += 45) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, ART_H); ctx.stroke(); }
  for (let y = 45; y < ART_H; y += 45) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(ART_W, y + 0.5); ctx.stroke(); }

  /* Concentric clusters, each with a crosshair through the middle. */
  ctx.strokeStyle = L2;
  for (let i = 0; i < 5; i += 1) {
    const cx = pick(20, ART_W - 20);
    const cy = pick(20, ART_H - 20);
    const n = 2 + Math.floor(rnd() * 3);
    const base = pick(26, 74);
    for (let k = 0; k < n; k += 1) {
      ctx.beginPath(); ctx.arc(cx, cy, base + k * pick(16, 34), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.strokeStyle = L3;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy); ctx.lineTo(cx + 12, cy);
    ctx.moveTo(cx, cy - 12); ctx.lineTo(cx, cy + 12);
    ctx.stroke();
    ctx.strokeStyle = L2;
  }

  /* Big arcs running out of every corner. */
  for (const [cx, cy] of [[0, 0], [ART_W, 0], [0, ART_H], [ART_W, ART_H]]) {
    for (const r of [170, 250, 330, 430]) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); }
  }

  /* Dashed structure, including both diagonals. */
  ctx.setLineDash([7, 11]);
  for (const [x1, y1, x2, y2] of [
    [0, 180, ART_W, 180], [0, 900, ART_W, 900], [180, 0, 180, ART_H], [900, 0, 900, ART_H],
    [0, 0, ART_W, ART_H], [ART_W, 0, 0, ART_H], [0, 540, ART_W, 540], [540, 0, 540, ART_H],
  ]) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  ctx.setLineDash([]);

  /* Long arrows with heads. */
  ctx.strokeStyle = L3;
  ctx.lineWidth = 1.3;
  for (let i = 0; i < 5; i += 1) {
    const horiz = rnd() > 0.5;
    const x = pick(30, ART_W - 30);
    const y = pick(30, ART_H - 30);
    const len = pick(80, 190) * (rnd() > 0.5 ? 1 : -1);
    ctx.beginPath();
    if (horiz) {
      ctx.moveTo(x, y); ctx.lineTo(x + len, y);
      const d = Math.sign(len);
      ctx.moveTo(x + len - d * 14, y - 7); ctx.lineTo(x + len, y); ctx.lineTo(x + len - d * 14, y + 7);
    } else {
      ctx.moveTo(x, y); ctx.lineTo(x, y + len);
      const d = Math.sign(len);
      ctx.moveTo(x - 7, y + len - d * 14); ctx.lineTo(x, y + len); ctx.lineTo(x + 7, y + len - d * 14);
    }
    ctx.stroke();
  }

  /* Tick ladders down both edges. */
  ctx.strokeStyle = L2;
  ctx.lineWidth = 1;
  for (let i = 0; i < 16; i += 1) {
    const y = 120 + i * 52;
    const len = i % 4 === 0 ? 24 : 13;
    ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(20 + len, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ART_W - 20, y + 26); ctx.lineTo(ART_W - 20 - len, y + 26); ctx.stroke();
  }

  /* Plus marks on grid intersections. */
  ctx.strokeStyle = L3;
  for (let i = 0; i < 9; i += 1) {
    const x = Math.round(pick(1, 23)) * 45;
    const y = Math.round(pick(1, 23)) * 45;
    ctx.beginPath();
    ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y);
    ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 7);
    ctx.stroke();
  }

  /* Angular brackets, as on a spec sheet. */
  ctx.strokeStyle = L2;
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 4; i += 1) {
    const x = pick(24, ART_W - 90);
    const y = pick(24, ART_H - 90);
    const s = pick(26, 52);
    ctx.beginPath();
    ctx.moveTo(x + s, y); ctx.lineTo(x, y); ctx.lineTo(x, y + s);
    ctx.stroke();
  }

  /* Hatch panels. */
  ctx.strokeStyle = L1;
  ctx.lineWidth = 1;
  for (let i = 0; i < 2; i += 1) {
    const bx = i === 0 ? 0 : ART_W - 200;
    const by = i === 0 ? ART_H - 170 : 0;
    const bw = 200;
    const bh = 170;
    ctx.save();
    ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
    for (let k = -bh; k < bw; k += 10) {
      ctx.beginPath(); ctx.moveTo(bx + k, by + bh); ctx.lineTo(bx + k + bh, by); ctx.stroke();
    }
    ctx.restore();
  }

  /* Small circles with a dot centre. */
  ctx.strokeStyle = L3;
  for (let i = 0; i < 6; i += 1) {
    const cx = pick(24, ART_W - 24);
    const cy = pick(24, ART_H - 24);
    ctx.beginPath(); ctx.arc(cx, cy, pick(9, 20), 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = L3;
    ctx.beginPath(); ctx.arc(cx, cy, 2.2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/* The club's wordmark repeating across the FULL width. The panel is drawn
   over the middle afterwards, so it survives only as fragments in the
   margins - that cropping is what makes the card read as a sheet on a sheet,
   and it only works because the run is wider than the panel. */
function drawWordmarkRun(ctx, y, alpha) {
  ctx.save();
  ctx.font = `400 15px "${DISPLAY}"`;
  const unit = 'SUE’S ANGELS';
  const track = 2;
  const unitW = ctx.measureText(unit).width + track * unit.length + 34;
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.textAlign = 'left';
  let x = -unitW * 0.37;
  while (x < ART_W + unitW) {
    let cx = x;
    for (const ch of unit) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + track; }
    x += unitW;
  }
  ctx.restore();
}

/* Accent brackets at the card corners, filled squares at the edge midpoints,
   and the dotted run down the top left. Straight off the club's own cards. */
function drawFrame(ctx) {
  const m = 24;
  const len = 56;
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
  const s = 12;
  ctx.fillRect(ART_W / 2 - s / 2, m - s / 2, s, s);
  ctx.fillRect(ART_W / 2 - s / 2, ART_H - m - s / 2, s, s);
  ctx.fillRect(m - s / 2, ART_H / 2 - s / 2, s, s);
  ctx.fillRect(ART_W - m - s / 2, ART_H / 2 - s / 2, s, s);
  for (let i = 0; i < 5; i += 1) ctx.fillRect(m - 4, m + 46 + i * 20, 7, 7);
  ctx.restore();
}

/* The ring, and a second broken one inside it. */
function drawRing(ctx, cy, r) {
  ctx.save();
  ctx.strokeStyle = L4;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(ART_W / 2, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = L2;
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 10; i += 1) {
    const a0 = (i / 10) * Math.PI * 2 + 0.07;
    ctx.beginPath(); ctx.arc(ART_W / 2, cy, r - 20, a0, a0 + (Math.PI * 2) / 10 - 0.14); ctx.stroke();
  }
  ctx.fillStyle = ACCENT;
  const s = 11;
  for (const a of [-Math.PI / 2, 0, Math.PI / 2, Math.PI]) {
    ctx.fillRect(ART_W / 2 + Math.cos(a) * r - s / 2, cy + Math.sin(a) * r - s / 2, s, s);
  }
  ctx.restore();
}

/* A heading between two rules. */
function ruled(ctx, text, y, opts = {}) {
  const size = opts.size == null ? 22 : opts.size;
  const w = tracked(ctx, text, ART_W / 2, y, {
    size, track: opts.track == null ? 7 : opts.track, weight: 400,
    family: DISPLAY, align: 'center', color: opts.color || PAPER,
  });
  ctx.save();
  ctx.strokeStyle = opts.rule || ACCENT;
  ctx.lineWidth = 2;
  const gap = 28;
  const len = opts.ruleLen == null ? 58 : opts.ruleLen;
  const yy = y - size * 0.36;
  ctx.beginPath();
  ctx.moveTo(ART_W / 2 - w / 2 - gap, yy); ctx.lineTo(ART_W / 2 - w / 2 - gap - len, yy);
  ctx.moveTo(ART_W / 2 + w / 2 + gap, yy); ctx.lineTo(ART_W / 2 + w / 2 + gap + len, yy);
  ctx.stroke();
  ctx.restore();
}

/* A badge, big, inside registration brackets. `img` may be null - one club in
   twenty-six has no crest, and that draws its initials on a ring rather than
   leaving a hole. */
export function drawBadge(ctx, img, cx, cy, size, fallbackName, opts = {}) {
  if (opts.frame !== false) {
    const h = size / 2 + 26;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.36)';
    ctx.lineWidth = 1.4;
    const t = 16;
    for (const [px, py, dx, dy] of [
      [cx - h, cy - h, 1, 1], [cx + h, cy - h, -1, 1], [cx - h, cy + h, 1, -1], [cx + h, cy + h, -1, -1],
    ]) {
      ctx.beginPath();
      ctx.moveTo(px + dx * t, py); ctx.lineTo(px, py); ctx.lineTo(px, py + dy * t);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (img && img.width) {
    const s = Math.min(size / img.width, size / img.height);
    ctx.drawImage(img, cx - (img.width * s) / 2, cy - (img.height * s) / 2, img.width * s, img.height * s);
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,0.34)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, size / 2, 0, Math.PI * 2); ctx.stroke();
    const initials = String(fallbackName || '')
      .split(/\s+/).filter(Boolean).slice(0, 3).map((w) => w[0]).join('').toUpperCase();
    ctx.fillStyle = PAPER;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `400 ${Math.round(size * 0.22)}px "${DISPLAY}"`;
    ctx.fillText(initials, cx, cy + 1);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();
}

/* A club's name in the margin beside its own badge, wrapped over as many
   lines as it needs, with a filled square marker. This is how the reference
   labels its two teams and it is a better read than a giant "v". */
function marginLabel(ctx, name, side, y) {
  const w = 96;
  const x = side === 'left' ? 22 : ART_W - 22;
  ctx.save();
  ctx.font = `600 13px "${TEXT}"`;
  const lines = wrapLines(ctx, upper(name || ''), w).slice(0, 3);
  ctx.restore();
  ctx.save();
  ctx.fillStyle = ACCENT;
  ctx.fillRect(side === 'left' ? x : x - 8, y - 9, 8, 8);
  ctx.restore();
  lines.forEach((l, i) => {
    tracked(ctx, l, side === 'left' ? x + 16 : x - 16, y + i * 20,
      { size: 13, track: 2, color: DIM, align: side === 'left' ? 'left' : 'right', plate: false });
  });
}

/* The sponsors, on white tiles, because they paid to be on the card. Drawn
   from the same list the website publishes so the two cannot drift.

   BIGGER TILES AND LESS PADDING than the first version, and the source images
   are the PNGs rather than the webps: two of those are smaller AND a
   different crop, and sporting-solutions.webp is 155x37 against a 160x160
   PNG, which is why that mark came out as a sliver. */
function drawSponsors(ctx, logos, y) {
  const list = (logos || []).filter((l) => l && l.img && l.img.width).slice(0, 4);
  if (!list.length) return;
  ruled(ctx, 'Proudly backed by', y, { size: 14, track: 5, ruleLen: 44, rule: L3, color: FAINT });

  const tileW = 190;
  const tileH = 96;
  const gap = 12;
  const total = list.length * tileW + (list.length - 1) * gap;
  let x = (ART_W - total) / 2;
  const top = y + 22;
  for (const l of list) {
    ctx.save();
    ctx.fillStyle = PAPER;
    ctx.fillRect(x, top, tileW, tileH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    /* Contain, never cover: a partner's mark is never cropped. */
    const pad = 9;
    const s = Math.min((tileW - pad * 2) / l.img.width, (tileH - pad * 2) / l.img.height);
    ctx.drawImage(l.img, x + (tileW - l.img.width * s) / 2, top + (tileH - l.img.height * s) / 2,
      l.img.width * s, l.img.height * s);
    ctx.restore();
    x += tileW + gap;
  }
}

/* The footer: handle left, address right, the club's own line centred under
   both, set like a copyright line because that is what it is. */
function drawFooter(ctx) {
  const y = ART_H - 62;
  ctx.save();
  ctx.strokeStyle = L3;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(72, y - 24); ctx.lineTo(ART_W - 72, y - 24); ctx.stroke();

  /* The Instagram glyph, drawn rather than loaded: four strokes, no asset. */
  const ix = 76;
  const iy = y - 10;
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 2;
  const r = 5;
  const b = 19;
  ctx.beginPath();
  ctx.moveTo(ix + r, iy - b / 2);
  ctx.arcTo(ix + b, iy - b / 2, ix + b, iy + b / 2, r);
  ctx.arcTo(ix + b, iy + b / 2, ix, iy + b / 2, r);
  ctx.arcTo(ix, iy + b / 2, ix, iy - b / 2, r);
  ctx.arcTo(ix, iy - b / 2, ix + b, iy - b / 2, r);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath(); ctx.arc(ix + b / 2, iy, 4.2, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  tracked(ctx, '@suesangelsfc', 108, y - 4, { size: 15, track: 1.4, color: DIM, plate: false });
  tracked(ctx, 'www.suesangelsfc.co.uk', ART_W - 74, y - 4,
    { size: 15, track: 1.4, color: DIM, align: 'right', plate: false });
  /* The motto is on the crest itself and the club does not repeat it in its
     own footer, so neither does this. It also sat straight through the edge
     marker at the bottom midpoint, which is the kind of collision that only
     shows up once something is rendered. */
}

/* Every card opens and closes the same way, so the set cannot drift. */
export function openCard(ctx, key) {
  ctx.save();
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, ART_W, ART_H);
  ctx.restore();
  drawBlueprint(ctx, key);

  /* Behind the panel, so the panel crops it. */
  drawWordmarkRun(ctx, 172, 0.30);
  drawWordmarkRun(ctx, ART_H - 214, 0.16);

  ctx.save();
  ctx.fillStyle = PANEL_INK;
  ctx.fillRect(P.x, P.y, P.w, P.h);
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 1;
  ctx.strokeRect(P.x + 0.5, P.y + 0.5, P.w - 1, P.h - 1);
  ctx.restore();

  drawFrame(ctx);
}

export function closeCard(ctx, assets) {
  drawSponsors(ctx, assets && assets.sponsors, P_BOTTOM - 148);
  drawFooter(ctx);
}

/* BOTH BADGES, CLOSE TOGETHER, each in registration brackets, with the club
   names in the margins rather than under the crests. */
function drawFixtureBadges(ctx, o) {
  const size = o.size == null ? 196 : o.size;
  const off = o.off == null ? 196 : o.off;
  drawBadge(ctx, o.leftBadge, ART_W / 2 - off, o.y, size, o.leftName);
  drawBadge(ctx, o.rightBadge, ART_W / 2 + off, o.y, size, o.rightName);
  marginLabel(ctx, o.leftName, 'left', o.y - 6);
  marginLabel(ctx, o.rightName, 'right', o.y - 6);
}

/* ---- 1. Next game ------------------------------------------------------- */

export function nextGame(ctx, m, assets = {}) {
  openCard(ctx, 'next');
  drawRing(ctx, 470, 316);

  ruled(ctx, 'Next up', 260, { size: 34, track: 9 });

  const weLeft = !!m.weAreHome;
  drawFixtureBadges(ctx, {
    leftBadge: weLeft ? assets.crest : assets.oppBadge,
    rightBadge: weLeft ? assets.oppBadge : assets.crest,
    leftName: weLeft ? 'Sue’s Angels' : m.opponent,
    rightName: weLeft ? m.opponent : 'Sue’s Angels',
    y: 430,
  });
  centred(ctx, 'VS', 444, { size: 30, padX: 20 });

  /* The competition, named. A card that does not say what the match was stops
     being useful the week after it is posted. */
  tracked(ctx, m.competition || 'Fixture', ART_W / 2, 592,
    { size: 15, track: 6, align: 'center', color: ACCENT });

  tracked(ctx, m.dateLine || '', ART_W / 2, 660,
    { size: 24, track: 4, family: DISPLAY, weight: 400, align: 'center' });
  tracked(ctx, m.kick ? `${m.kick} kick off` : 'Kick-off to be confirmed', ART_W / 2, 712,
    { size: 27, track: 4, family: DISPLAY, weight: 400, align: 'center', color: ACCENT });
  if (m.venue) {
    tracked(ctx, m.venue, ART_W / 2, 754, { size: 14, track: 2.6, align: 'center', color: DIM });
  }

  closeCard(ctx, assets);
}

/* ---- 2. Matchday squad -------------------------------------------------- */

export function matchdaySquad(ctx, m, assets = {}) {
  openCard(ctx, 'squad');
  drawRing(ctx, 520, 330);

  ruled(ctx, 'Matchday squad', 208, { size: 26, track: 7 });

  drawBadge(ctx, assets.crest, ART_W / 2 - 178, 320, 130, 'Sue’s Angels', { frame: false });
  drawBadge(ctx, assets.oppBadge, ART_W / 2 + 178, 320, 130, m.opponent, { frame: false });
  centred(ctx, 'V', 332, { size: 20, color: DIM, padX: 16 });
  tracked(ctx, m.competition || '', ART_W / 2, 424,
    { size: 14, track: 5, align: 'center', color: ACCENT });

  const starters = (m.starters || []).filter(Boolean);
  const subs = (m.subs || []).filter(Boolean);
  const left = starters.slice(0, Math.ceil(starters.length / 2));
  const right = starters.slice(Math.ceil(starters.length / 2));

  const rowH = 42;
  const top = 486;
  const draw = (list, cx) => list.forEach((n, i) => {
    const t = upper(surname(n));
    const px = fitText(ctx, t, 330, 26, { family: TEXT, weight: 600 });
    centred(ctx, t, top + i * rowH, { size: px, family: TEXT, weight: 600, x: cx, padX: 12, padY: 6 });
  });
  draw(left, ART_W / 2 - 186);
  draw(right, ART_W / 2 + 186);

  const bottom = top + Math.max(left.length, right.length) * rowH;
  /* No line when there is no bench. Sunday league sheets frequently name
     nobody, and saying so out loud on the graphic was noise. */
  if (subs.length) {
    tracked(ctx, 'Substitutes', ART_W / 2, bottom + 4, { size: 13, track: 4, align: 'center', color: ACCENT });
    ctx.save();
    ctx.font = `500 17px "${TEXT}"`;
    const lines = wrapLines(ctx, subs.map((n) => upper(surname(n))).join('  ·  '), 700).slice(0, 2);
    ctx.restore();
    lines.forEach((l, i) => centred(ctx, l, bottom + 36 + i * 24,
      { size: 17, family: TEXT, weight: 500, color: DIM }));
  }

  closeCard(ctx, assets);
}

/* ---- 3. Man of the match ------------------------------------------------ */

export function manOfTheMatch(ctx, m, assets = {}) {
  openCard(ctx, 'motm');
  drawRing(ctx, 452, 308);

  ruled(ctx, 'Man of the match', 210, { size: 24, track: 7 });

  /* The portrait where one exists, the crest where it does not. Sixteen of
     thirty-six have none, so the FRAME is the constant and what sits inside
     it is the variable: the card is composed identically either way. */
  const cx = ART_W / 2;
  const cy = 412;
  const box = 250;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, box / 2, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = PANEL_INK;
  ctx.fillRect(cx - box / 2, cy - box / 2, box, box);
  if (assets.photo && assets.photo.width) {
    const s = Math.max(box / assets.photo.width, box / assets.photo.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(assets.photo, cx - (assets.photo.width * s) / 2, cy - (assets.photo.height * s) / 2,
      assets.photo.width * s, assets.photo.height * s);
  } else {
    drawBadge(ctx, assets.crest, cx, cy, 172, 'Sue’s Angels', { frame: false });
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, box / 2, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  drawBadge(ctx, null, cx, cy, box, '', { frame: true });

  const nm = upper(m.player || '');
  centred(ctx, nm, 610, { size: fitText(ctx, nm, 760, 42), padX: 22 });
  if (m.position) {
    tracked(ctx, m.position, ART_W / 2, 650, { size: 14, track: 3, align: 'center', color: ACCENT });
  }

  tracked(ctx, m.competition || '', ART_W / 2, 704, { size: 14, track: 5, align: 'center', color: DIM });
  const sub = [m.opponent ? `v ${m.opponent}` : null, m.scoreLine || null].filter(Boolean).join('   ·   ');
  tracked(ctx, sub, ART_W / 2, 740, { size: 16, track: 2.6, align: 'center', color: PAPER });
  tracked(ctx, m.dateLine || '', ART_W / 2, 774, { size: 13, track: 2.4, align: 'center', color: FAINT });

  closeCard(ctx, assets);
}

/* ---- 4. Final result ---------------------------------------------------- */

export function finalResult(ctx, m, assets = {}) {
  openCard(ctx, 'result');
  drawRing(ctx, 444, 316);

  ruled(ctx, 'Full time', 244, { size: 34, track: 9 });

  const weLeft = !!m.weAreHome;
  drawFixtureBadges(ctx, {
    leftBadge: weLeft ? assets.crest : assets.oppBadge,
    rightBadge: weLeft ? assets.oppBadge : assets.crest,
    leftName: weLeft ? 'Sue’s Angels' : m.opponent,
    rightName: weLeft ? m.opponent : 'Sue’s Angels',
    y: 414,
    size: 186,
    off: 202,
  });

  /* THE SCORE IS THE GRAPHIC. A walkover has none - the published table adds
     no goals for one - so it says what it was instead of printing a scoreline
     nobody ever recorded. The club's colour marks OUR number. */
  if (m.noScore) {
    const t = upper(m.noScore);
    centred(ctx, t, 428, { size: fitText(ctx, t, 240, 22), padX: 16 });
  } else {
    const l = weLeft ? m.ourGoals : m.theirGoals;
    const r = weLeft ? m.theirGoals : m.ourGoals;
    knockout(ctx, ART_W / 2 - 84, 342, 168, 140);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = `400 78px "${DISPLAY}"`;
    ctx.fillStyle = weLeft ? ACCENT : PAPER;
    ctx.fillText(String(l), ART_W / 2 - 44, 442);
    ctx.fillStyle = weLeft ? PAPER : ACCENT;
    ctx.fillText(String(r), ART_W / 2 + 44, 442);
    ctx.fillStyle = 'rgba(255,255,255,0.40)';
    ctx.font = `400 40px "${DISPLAY}"`;
    ctx.fillText('-', ART_W / 2, 434);
    ctx.restore();
  }

  tracked(ctx, m.competition || '', ART_W / 2, 576,
    { size: 15, track: 6, align: 'center', color: ACCENT });

  /* Scorers, the minute printed only where the record carries one. */
  if ((m.scorers || []).length) {
    tracked(ctx, 'Goalscorers', ART_W / 2, 630, { size: 13, track: 4, align: 'center', color: DIM });
    ctx.save();
    ctx.font = `600 18px "${TEXT}"`;
    const lines = wrapLines(ctx, m.scorers.join('   ·   '), 680).slice(0, 2);
    ctx.restore();
    lines.forEach((l, i) => centred(ctx, upper(l), 664 + i * 28,
      { size: 18, family: TEXT, weight: 600, padX: 12, padY: 6 }));
  }

  tracked(ctx, m.dateLine || '', ART_W / 2, 750,
    { size: 20, track: 4, family: DISPLAY, weight: 400, align: 'center' });

  closeCard(ctx, assets);
}

/* ---- 5. Player of the month --------------------------------------------- */

export function playerOfTheMonth(ctx, m, assets = {}) {
  openCard(ctx, 'potm');
  drawRing(ctx, 448, 312);

  ruled(ctx, 'Player of the month', 206, { size: 21, track: 6 });
  tracked(ctx, [m.month, m.season].filter(Boolean).join('  ·  '), ART_W / 2, 248,
    { size: 14, track: 5, align: 'center', color: ACCENT });

  const cx = ART_W / 2;
  const cy = 424;
  const box = 250;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, box / 2, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = PANEL_INK;
  ctx.fillRect(cx - box / 2, cy - box / 2, box, box);
  if (assets.photo && assets.photo.width) {
    const s = Math.max(box / assets.photo.width, box / assets.photo.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(assets.photo, cx - (assets.photo.width * s) / 2, cy - (assets.photo.height * s) / 2,
      assets.photo.width * s, assets.photo.height * s);
  } else {
    drawBadge(ctx, assets.crest, cx, cy, 172, 'Sue’s Angels', { frame: false });
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, box / 2, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  drawBadge(ctx, null, cx, cy, box, '', { frame: true });

  const nm = upper(m.player || '');
  centred(ctx, nm, 622, { size: fitText(ctx, nm, 760, 42), padX: 22 });
  if (m.position) {
    tracked(ctx, m.position, ART_W / 2, 662, { size: 14, track: 3, align: 'center', color: ACCENT });
  }

  /* WHAT HE ACTUALLY DID. An award with nothing behind it is a poster, and
     the club's own record carries a written reason - so the card takes the
     first sentence of it rather than inventing a summary. */
  if (m.line) {
    ctx.save();
    ctx.font = `500 16px "${TEXT}"`;
    const lines = wrapLines(ctx, m.line, 660).slice(0, 2);
    ctx.restore();
    lines.forEach((l, i) => centred(ctx, l, 710 + i * 26,
      { size: 16, family: TEXT, weight: 500, color: DIM, padX: 12, padY: 6 }));
  }

  closeCard(ctx, assets);
}

export const CARDS = {
  next: { key: 'next', label: 'Next game', draw: nextGame },
  squad: { key: 'squad', label: 'Matchday squad', draw: matchdaySquad },
  motm: { key: 'motm', label: 'Man of the match', draw: manOfTheMatch },
  result: { key: 'result', label: 'Final result', draw: finalResult },
  potm: { key: 'potm', label: 'Player of the month', draw: playerOfTheMonth },
};

/* ==========================================================================
   RECORD -> CARD

   The adapter, here rather than at each call site so the panel and any
   renderer shape a match the same way. Everything the records hold is keyed
   by squad number; nothing below emits one.
   ========================================================================== */

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/* "SUNDAY 16 AUGUST 2026", exactly how the club sets it on its own graphics:
   full weekday, full month, and the year. The website drops the year from a
   fixture card because the page around it dates itself; a graphic does not,
   because it gets saved, reposted and looked at again months later. */
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
     "Guest". Listing who played and crediting a goal to a person are
     different claims, and only the second one names somebody. */
  if (!raw || raw === GUEST) return '';
  const name = surname(raw);
  const min = g.minute == null || g.minute === '' ? '' : ` ${g.minute}’`;
  const pen = g.penalty ? ' (pen)' : '';
  return `${name}${min}${pen}`;
}

export function cardDataFor(kind, m, d) {
  const squad = (d && (d.squad || d.players)) || [];

  /* The monthly award is a recognition row, not a match. */
  if (kind === 'potm') {
    if (!m) return null;
    const p = playerOf(m.playerId, squad);
    const name = (m.playerName && m.playerName.trim()) || (p && p.name) || '';
    if (!name) return null;
    /* The club writes a paragraph. A card takes the first sentence of it and
       nothing more: anything longer stops being a graphic. */
    const first = String(m.reason || '').split('\n')[0].split(/(?<=\.)\s/)[0].trim();
    return {
      player: name,
      position: (p && (p.position || p.positionName)) || '',
      slug: (p && p.slug) || '',
      month: m.month || '',
      season: m.season || '',
      line: first.length > 150 ? '' : first,
    };
  }

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
    const p = playerOf(det.motm, squad);
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
