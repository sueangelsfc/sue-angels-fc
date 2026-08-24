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

   ---- 9:16, AND WHAT THAT BUYS ---------------------------------------------

   1080x1920. The extra 840px of height is not more room for more things - it
   is room for the SAME things to be further apart. Every earlier version was
   cramped because a square had to carry a headline, two badges, a score, a
   data block, four sponsor tiles and a footer, and cramped is most of what
   made them look made rather than designed.

   ---- QUALITY IS RESTRAINT AND PRECISION, NOT DENSITY ----------------------

   The previous drawing scattered circles, arrows and brackets from a seeded
   PRNG. More marks did not make it better: random placement reads as noise
   however fine the lines are, because nothing lines up with anything.

   This is built on a declared grid instead. Five vertical rules at fixed
   columns, horizontal rules only where a section actually ends, and a small
   orange square at the intersections that matter. Every element sits on an
   8px baseline, every block starts on a named ROW, and the linework marks
   that structure rather than decorating around it. Nothing is placed by eye
   and nothing is placed by chance.

   ---- THE REST -------------------------------------------------------------

   ONE FAMILY, THREE AXES OF CONTRAST. Anybody is a squarish technical face
   built for sport with a real WIDTH axis (50-150) as well as weight, and
   canvas honours font-stretch keywords - verified before designing around it:
   ANGELS at 60px runs 126.7px ultra-condensed to 388.0px extra-expanded. That
   range IS the hierarchy.

   ORANGE IS THE 26/27 COLOUR: #FF7034, the accent the website uses, and the
   only hue on the card.

   Sixteen of thirty-six players have no photograph, so no layout depends on
   one. NO SQUAD NUMBERS: the records key everything by `num` and the site
   never shows one, so `nameOf` is the only thing that turns one into a name.
   ========================================================================== */

export const ART_W = 1080;
export const ART_H = 1920;

/* The club's own, verbatim, and not shortened: "what we do echoes" is a
   different sentence. It is on the crest, so the cards do not repeat it. */
export const MOTTO = 'What we do in life echoes in eternity.';

const ACCENT = '#FF7034';
const INK = '#08090C';
const PAPER = '#FFFFFF';
const DIM = 'rgba(255,255,255,0.56)';
const FAINT = 'rgba(255,255,255,0.28)';

const RULE = 'rgba(255,255,255,0.10)';
const GRID = 'rgba(255,112,52,0.10)';
const GRID_SOFT = 'rgba(255,255,255,0.035)';

const FACE = 'Anybody';

/* ---- The grid ------------------------------------------------------------

   Declared once, used by everything. M is the margin; COLS are the vertical
   rules; ROWS are the only heights at which a section may begin. A block that
   does not start on a ROW is a block placed by eye, and placing by eye across
   five cards is what makes a set look uneven. */
const M = 88;
const CW = ART_W - M * 2;
const COLS = [M, M + CW * 0.25, ART_W / 2, M + CW * 0.75, ART_W - M];

const ROW = {
  eyebrow: 180,
  title: 304,
  rule1: 384,
  hero: 636,        /* badge / portrait centre */
  heroEnd: 1012,    /* the score or the name sits on this baseline */
  rule2: 1084,
  data: 1176,       /* four rows at 64 finish on 1432 */
  rule3: 1476,
  sponsors: 1548,
  rule4: 1768,
  footer: 1852,
};

/* ---- Type --------------------------------------------------------------- */

const HERO = (px) => `900 extra-expanded ${px}px "${FACE}"`;
const TITLE = (px) => `800 expanded ${px}px "${FACE}"`;
const NAME = (px) => `700 semi-condensed ${px}px "${FACE}"`;
const LABEL = (px) => `700 condensed ${px}px "${FACE}"`;
const DATA = (px) => `600 ${px}px "${FACE}"`;

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

function fitFont(ctx, text, maxW, startPx, mk, min) {
  let px = startPx;
  const floor = min == null ? 12 : min;
  for (;;) {
    ctx.font = mk(px);
    if (ctx.measureText(text).width <= maxW || px <= floor) break;
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

/* Clears a padded box before text draws over a rule, so a label crossing a
   line breaks the line rather than sitting on it. */
function knockout(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = INK;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/* Letterspaced caps, drawn a character at a time because canvas has no
   letterSpacing in every engine this has to run in. */
function tracked(ctx, text, x, y, opts = {}) {
  const size = opts.size == null ? 15 : opts.size;
  const track = opts.track == null ? 5 : opts.track;
  const mk = opts.mk || LABEL;
  const align = opts.align || 'left';
  const s = upper(text);
  if (!s) return 0;
  ctx.save();
  ctx.font = mk(size);
  ctx.textAlign = 'left';
  const total = ctx.measureText(s).width + track * Math.max(0, s.length - 1);
  const left = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  if (opts.plate) knockout(ctx, left - 14, y - size - 9, total + 28, size + 18);
  ctx.fillStyle = opts.color || PAPER;
  let cx = left;
  for (const ch of s) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + track; }
  ctx.restore();
  return total;
}

function say(ctx, text, x, y, opts = {}) {
  const size = opts.size == null ? 26 : opts.size;
  const mk = opts.mk || DATA;
  const align = opts.align || 'left';
  if (!text) return 0;
  ctx.save();
  ctx.font = mk(size);
  ctx.textAlign = align;
  const w = ctx.measureText(text).width;
  if (opts.plate) {
    const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    knockout(ctx, left - 16, y - size - 10, w + 32, size + 20);
  }
  ctx.fillStyle = opts.color || PAPER;
  ctx.fillText(text, x, y);
  ctx.restore();
  return w;
}

/* ---- The structure ------------------------------------------------------ */

/* THE GRID, DRAWN. Five vertical rules at the declared columns and a
   horizontal rule at each section boundary, with a small orange square where
   the centre column meets one. This is the whole drawing: it marks the
   structure the card is actually built on, so every line means something.

   The previous version scattered arcs, arrows and brackets from a PRNG.
   Random marks read as noise no matter how fine they are, because nothing
   aligns with anything - which is exactly why more of them did not help. */
function drawGrid(ctx, rows) {
  ctx.save();
  ctx.lineWidth = 1;

  ctx.strokeStyle = GRID_SOFT;
  for (const x of COLS) {
    ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, ART_H); ctx.stroke();
  }

  ctx.strokeStyle = RULE;
  for (const y of rows) {
    ctx.beginPath(); ctx.moveTo(M, y + 0.5); ctx.lineTo(ART_W - M, y + 0.5); ctx.stroke();
  }

  /* Where the centre column crosses a rule. Four marks, not forty. */
  ctx.fillStyle = ACCENT;
  for (const y of rows) ctx.fillRect(ART_W / 2 - 4, y - 4, 8, 8);

  /* Tick ladders in the margins, on the same 8px baseline as everything
     else, so the edge of the card is measured rather than empty. */
  ctx.strokeStyle = GRID;
  for (let y = 240; y < ART_H - 200; y += 32) {
    const long = (y - 240) % 128 === 0;
    ctx.beginPath(); ctx.moveTo(M - 28, y); ctx.lineTo(M - 28 + (long ? 18 : 9), y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ART_W - M + 28, y); ctx.lineTo(ART_W - M + 28 - (long ? 18 : 9), y); ctx.stroke();
  }
  ctx.restore();
}

/* Corner brackets, and a filled square at the middle of the top and bottom
   edges. Four marks that frame the card and nothing else. */
function drawFrame(ctx) {
  const m = 40;
  const len = 64;
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
  ctx.fillRect(ART_W / 2 - 7, m - 7, 14, 14);
  ctx.fillRect(ART_W / 2 - 7, ART_H - m - 7, 14, 14);
  ctx.restore();
}

/* A crest at 5%, very large, bleeding off the bottom right. It gives the
   card depth and scale that no quantity of hairlines can. */
function drawWatermark(ctx, crest) {
  if (!crest || !crest.width) return;
  ctx.save();
  ctx.globalAlpha = 0.045;
  ctx.imageSmoothingQuality = 'high';
  const size = 900;
  const s = Math.min(size / crest.width, size / crest.height);
  ctx.drawImage(crest, ART_W - crest.width * s * 0.58, ART_H - crest.height * s * 0.74,
    crest.width * s, crest.height * s);
  ctx.restore();
}

/* A badge, big, inside registration brackets. `img` may be null - one club in
   twenty-six has no crest, and that draws its initials on a ring rather than
   leaving a hole. */
export function drawBadge(ctx, img, cx, cy, size, fallbackName, opts = {}) {
  if (opts.frame !== false) {
    const h = size / 2 + 34;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.30)';
    ctx.lineWidth = 1.5;
    const t = 20;
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
    ctx.strokeStyle = 'rgba(255,255,255,0.32)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, size / 2, 0, Math.PI * 2); ctx.stroke();
    const initials = String(fallbackName || '')
      .split(/\s+/).filter(Boolean).slice(0, 3).map((w) => w[0]).join('').toUpperCase();
    ctx.fillStyle = PAPER;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = TITLE(Math.round(size * 0.2));
    ctx.fillText(initials, cx, cy + 1);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();
}

/* Labelled rows, the way a drawing lists its own properties: a tiny condensed
   label in the club's colour against a normal-width value, on a hairline.
   Sentences under a graphic read as a caption; this reads as a record. */
function specBlock(ctx, rows) {
  const live = rows.filter(([, value]) => value);
  if (!live.length) return ROW.rule2;
  const zone = ROW.rule3 - ROW.rule2;
  const rowH = 64;
  let cy = ROW.rule2 + (zone - live.length * rowH) / 2 + 40;
  for (const [label, value] of live) {
    ctx.save();
    ctx.strokeStyle = RULE;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(M, cy + 18); ctx.lineTo(ART_W - M, cy + 18); ctx.stroke();
    ctx.restore();
    tracked(ctx, label, M, cy, { size: 15, track: 4, color: ACCENT });
    const v = upper(value);
    say(ctx, v, ART_W - M, cy, { size: fitFont(ctx, v, CW - 320, 26, NAME, 14), mk: NAME, align: 'right' });
    cy += 64;
  }
  return cy;
}

/* The sponsors, on white tiles, because they paid to be on the card. Drawn
   from the same list the website publishes so the two cannot drift. */
function drawSponsors(ctx, logos) {
  const list = (logos || []).filter((l) => l && l.img && l.img.width).slice(0, 4);
  if (!list.length) return;
  tracked(ctx, 'Proudly backed by', ART_W / 2, ROW.sponsors, { size: 14, track: 5, color: FAINT, align: 'center' });

  const gap = 14;
  const tileW = (CW - gap * (list.length - 1)) / list.length;
  const tileH = 118;
  let x = M;
  const top = ROW.sponsors + 34;
  for (const l of list) {
    ctx.save();
    ctx.fillStyle = PAPER;
    ctx.fillRect(x, top, tileW, tileH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    /* Contain, never cover: a partner's mark is never cropped. */
    const pad = 14;
    const s = Math.min((tileW - pad * 2) / l.img.width, (tileH - pad * 2) / l.img.height);
    ctx.drawImage(l.img, x + (tileW - l.img.width * s) / 2, top + (tileH - l.img.height * s) / 2,
      l.img.width * s, l.img.height * s);
    ctx.restore();
    x += tileW + gap;
  }
}

/* The footer: handle left, address right. The motto is on the crest and the
   club does not repeat it in its own footer, so neither does this. */
function drawFooter(ctx) {
  const y = ROW.footer;
  ctx.save();
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(M, y - 44); ctx.lineTo(M + 56, y - 44); ctx.stroke();
  ctx.restore();

  tracked(ctx, '@suesangelsfc', M, y, { size: 17, track: 2, color: DIM });
  tracked(ctx, 'www.suesangelsfc.co.uk', ART_W - M, y, { size: 17, track: 2, color: DIM, align: 'right' });
}

/* Every card opens and closes the same way, so the set cannot drift. */
export function openCard(ctx, assets, rows) {
  ctx.save();
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, ART_W, ART_H);
  ctx.restore();
  drawWatermark(ctx, assets && assets.crest);
  drawGrid(ctx, rows || [ROW.rule1, ROW.rule2, ROW.rule3, ROW.rule4]);
  drawFrame(ctx);
}

export function closeCard(ctx, assets) {
  drawSponsors(ctx, assets && assets.sponsors);
  drawFooter(ctx);
}

/* The eyebrow and the headline, both on their declared rows. The headline is
   the one thing set at extra-expanded, so nothing competes with it. */
function heading(ctx, eyebrow, title, opts = {}) {
  tracked(ctx, eyebrow, M, ROW.eyebrow, { size: 15, track: 6, color: ACCENT });
  const room = opts.room == null ? CW : opts.room;
  const px = fitFont(ctx, upper(title), room, opts.max || 78, HERO, 22);
  say(ctx, upper(title), M, ROW.title, { size: px, mk: HERO });
}

/* Both badges, close, each in registration brackets, with the score or the
   "vs" held between them. */
function fixtureBadges(ctx, o) {
  const size = o.size == null ? 220 : o.size;
  const off = o.off == null ? 232 : o.off;
  drawBadge(ctx, o.leftBadge, ART_W / 2 - off, o.y, size, o.leftName);
  drawBadge(ctx, o.rightBadge, ART_W / 2 + off, o.y, size, o.rightName);
  const lab = o.y + size / 2 + 78;
  for (const [name, cx] of [[o.leftName, ART_W / 2 - off], [o.rightName, ART_W / 2 + off]]) {
    const t = upper(name || '');
    say(ctx, t, cx, lab, { size: fitFont(ctx, t, 300, 18, LABEL, 10), mk: LABEL, align: 'center', color: DIM });
  }
}

/* A portrait in a ring, with the crest standing in where there is no
   photograph. Sixteen of thirty-six have none, so the FRAME is the constant
   and what sits inside it is the variable: composed identically either way. */
function portrait(ctx, assets, cy, box) {
  ctx.save();
  ctx.beginPath(); ctx.arc(ART_W / 2, cy, box / 2, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = INK;
  ctx.fillRect(ART_W / 2 - box / 2, cy - box / 2, box, box);
  if (assets.photo && assets.photo.width) {
    const s = Math.max(box / assets.photo.width, box / assets.photo.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(assets.photo, ART_W / 2 - (assets.photo.width * s) / 2, cy - (assets.photo.height * s) / 2,
      assets.photo.width * s, assets.photo.height * s);
  } else {
    drawBadge(ctx, assets.crest, ART_W / 2, cy, box * 0.66, 'Sue’s Angels', { frame: false });
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(ART_W / 2, cy, box / 2, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  drawBadge(ctx, null, ART_W / 2, cy, box, '', { frame: true });
}

/* ---- 1. Next game ------------------------------------------------------- */

export function nextGame(ctx, m, assets = {}) {
  openCard(ctx, assets);
  heading(ctx, m.competition || 'Fixture', 'Next up');

  const weLeft = !!m.weAreHome;
  fixtureBadges(ctx, {
    leftBadge: weLeft ? assets.crest : assets.oppBadge,
    rightBadge: weLeft ? assets.oppBadge : assets.crest,
    leftName: weLeft ? 'Sue’s Angels' : m.opponent,
    rightName: weLeft ? m.opponent : 'Sue’s Angels',
    y: ROW.hero,
    size: 212,
    off: 218,
  });
  say(ctx, 'VS', ART_W / 2, ROW.hero + 22, { size: 46, mk: TITLE, align: 'center', plate: true });
  say(ctx, upper(m.dateLine || ''), ART_W / 2, ROW.heroEnd,
    { size: fitFont(ctx, upper(m.dateLine || ''), CW, 46, TITLE, 20), mk: TITLE, align: 'center' });

  /* No DATE row: the date is the hero line on this card, and repeating it
     four hundred pixels below is the card telling you the same thing twice. */
  specBlock(ctx, [
    ['Kick-off', m.kick || 'To be confirmed'],
    ['Venue', m.venue || 'To be confirmed'],
    ['Ground', m.weAreHome ? 'Home' : 'Away'],
  ]);

  closeCard(ctx, assets);
}

/* ---- 2. Matchday squad -------------------------------------------------- */

export function matchdaySquad(ctx, m, assets = {}) {
  /* No middle rule: the eleven run through where it would be. */
  openCard(ctx, assets, [ROW.rule1, ROW.rule3, ROW.rule4]);
  heading(ctx, `v ${m.opponent || ''}`, 'Matchday squad', { max: 62, room: CW - 180 });
  drawBadge(ctx, assets.crest, ART_W - M - 68, ROW.title - 66, 136, 'Sue’s Angels', { frame: false });

  const starters = (m.starters || []).filter(Boolean);
  const subs = (m.subs || []).filter(Boolean);
  const left = starters.slice(0, Math.ceil(starters.length / 2));
  const right = starters.slice(Math.ceil(starters.length / 2));

  const rowH = 92;
  const top = 520;
  const colW = CW / 2 - 24;
  const draw = (list, x, from) => list.forEach((n, i) => {
    const t = upper(surname(n));
    const y = top + i * rowH;
    ctx.save();
    ctx.strokeStyle = RULE;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y + 20); ctx.lineTo(x + colW, y + 20); ctx.stroke();
    ctx.restore();
    /* The index counts the squad. It is NOT a shirt number, and the site
       never shows one. */
    tracked(ctx, String(from + i + 1).padStart(2, '0'), x, y, { size: 15, track: 1, color: ACCENT });
    say(ctx, t, x + 54, y, { size: fitFont(ctx, t, colW - 62, 42, NAME, 18), mk: NAME });
  });
  draw(left, M, 0);
  draw(right, M + colW + 48, left.length);

  const bottom = top + Math.max(left.length, right.length) * rowH;
  if (subs.length) {
    tracked(ctx, 'Substitutes', M, bottom + 22, { size: 15, track: 4, color: ACCENT });
    ctx.save();
    ctx.font = DATA(24);
    const lines = wrapLines(ctx, subs.map((n) => upper(surname(n))).join('   ·   '), CW).slice(0, 2);
    ctx.restore();
    lines.forEach((l, i) => say(ctx, l, M, bottom + 70 + i * 34, { size: 24, mk: DATA, color: DIM }));
  }

  closeCard(ctx, assets);
}

/* ---- 3. Man of the match ------------------------------------------------ */

export function manOfTheMatch(ctx, m, assets = {}) {
  openCard(ctx, assets);
  heading(ctx, m.competition || 'Match', 'Man of the match', { max: 62 });

  portrait(ctx, assets, ROW.hero, 400);

  const nm = upper(m.player || '');
  say(ctx, nm, ART_W / 2, ROW.heroEnd, {
    size: fitFont(ctx, nm, CW, 72, HERO, 24), mk: HERO, align: 'center', plate: true,
  });

  specBlock(ctx, [
    ['Position', m.position],
    ['Opponent', m.opponent],
    ['Result', m.scoreLine],
    ['Date', m.dateLine],
  ]);

  closeCard(ctx, assets);
}

/* ---- 4. Final result ---------------------------------------------------- */

export function finalResult(ctx, m, assets = {}) {
  openCard(ctx, assets);
  heading(ctx, `${m.competition || 'Match'} · ${m.weAreHome ? 'Home' : 'Away'}`, 'Full time');

  const weLeft = !!m.weAreHome;
  fixtureBadges(ctx, {
    leftBadge: weLeft ? assets.crest : assets.oppBadge,
    rightBadge: weLeft ? assets.oppBadge : assets.crest,
    leftName: weLeft ? 'Sue’s Angels' : m.opponent,
    rightName: weLeft ? m.opponent : 'Sue’s Angels',
    y: ROW.hero,
    size: 212,
    off: 218,
  });

  /* THE SCORE IS THE GRAPHIC, and the only thing set at extra-expanded 900.
     A walkover has none - the published table adds no goals for one - so it
     says what it was instead of printing a scoreline nobody recorded. The
     club's colour marks OUR number.

     THE OFFSET IS MEASURED, NOT GUESSED. At this size a digit is about 90px
     wide, and setting the two numbers a fixed 42px either side of centre put
     their inner edges 5px apart: the card read "22" rather than "2 - 2". */
  if (m.noScore) {
    const t = upper(m.noScore);
    say(ctx, t, ART_W / 2, ROW.heroEnd, { size: fitFont(ctx, t, CW, 40, LABEL, 14), mk: LABEL, align: 'center' });
  } else {
    const l = String(weLeft ? m.ourGoals : m.theirGoals);
    const r = String(weLeft ? m.theirGoals : m.ourGoals);
    /* THE OFFSET IS MEASURED, NOT GUESSED: at this size a digit is about
       120px wide, and a fixed offset put the two inner edges 5px apart, so
       the card read "22" rather than "2 - 2". */
    ctx.save();
    ctx.font = HERO(150);
    const half = Math.max(ctx.measureText(l).width, ctx.measureText(r).width) / 2;
    ctx.textAlign = 'center';
    const off = half + 56;
    ctx.fillStyle = weLeft ? ACCENT : PAPER;
    ctx.fillText(l, ART_W / 2 - off, ROW.heroEnd);
    ctx.fillStyle = weLeft ? PAPER : ACCENT;
    ctx.fillText(r, ART_W / 2 + off, ROW.heroEnd);
    ctx.strokeStyle = 'rgba(255,255,255,0.34)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(ART_W / 2 - 26, ROW.heroEnd - 46); ctx.lineTo(ART_W / 2 + 26, ROW.heroEnd - 46);
    ctx.stroke();
    ctx.restore();
  }

  specBlock(ctx, [
    ['Competition', m.competition],
    ['Date', m.dateLine],
    ['Venue', m.venue],
    ['Ground', m.weAreHome ? 'Home' : 'Away'],
    ['Goalscorers', (m.scorers || []).join('  ·  ')],
  ]);

  closeCard(ctx, assets);
}

/* ---- 5. Player of the month --------------------------------------------- */

export function playerOfTheMonth(ctx, m, assets = {}) {
  openCard(ctx, assets);
  heading(ctx, [m.month, m.season].filter(Boolean).join(' · ') || 'Award', 'Player of the month', { max: 58 });

  portrait(ctx, assets, ROW.hero, 400);

  const nm = upper(m.player || '');
  say(ctx, nm, ART_W / 2, ROW.heroEnd, {
    size: fitFont(ctx, nm, CW, 72, HERO, 24), mk: HERO, align: 'center', plate: true,
  });

  const after = specBlock(ctx, [
    ['Position', m.position],
    ['Month', m.month],
    ['Season', m.season],
  ]);

  /* WHAT HE ACTUALLY DID. An award with nothing behind it is a poster, and
     the club's own record carries a written reason, so the card takes the
     first sentence of it rather than inventing a summary. */
  if (m.line) {
    ctx.save();
    ctx.font = DATA(23);
    const lines = wrapLines(ctx, m.line, CW).slice(0, 2);
    ctx.restore();
    lines.forEach((l, i) => say(ctx, l, M, after + 22 + i * 34, { size: 23, mk: DATA, color: DIM }));
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
