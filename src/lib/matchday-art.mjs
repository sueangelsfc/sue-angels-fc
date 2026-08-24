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

   ---- THIS IS THE CLUB'S OWN HOUSE STYLE, NOT AN INVENTED ONE --------------

   Rebuilt against the graphics Sue's Angels actually post, which is a far
   better brief than any reference from another club. What that style is:

     THE BADGES ARE THE SUBJECT. On the club's own cards each crest is about a
     quarter of the width. Earlier versions here set them at 96-130px, which
     is a footnote, and it was the single biggest reason the cards did not
     look like the club's.

     A BLUEPRINT UNDER EVERYTHING. Faint CAD linework - circles, arcs, arrows,
     dashed runs, dimension ticks - sitting well back. It is what stops the
     black being empty.

     ONE BIG RING. A hairline circle in the accent colour, nearly the width of
     the card, with small square marks set on it. Everything important sits
     inside it.

     BRACKETS AND EDGE MARKS. Accent corner brackets, and a small filled
     square at the middle of each edge.

     RULED LABELS. Headings sit between two short rules: "- FULL TIME -".

     THE SPONSORS ARE PART OF THE CARD, on white tiles under "PROUDLY BACKED
     BY", and a footer bar carries the Instagram handle and the website.

     SQUARE. The club posts 1:1, not 4:5.

   ---- COLOUR ---------------------------------------------------------------

   The club's posted graphics are gold on near-black. ORANGE IS THE 26/27
   COLOUR, so that is what these are set in: #FF7034, the same accent the
   website uses, and the only hue on the card.

   ---- TYPE -----------------------------------------------------------------

   Saira, self-hosted, at wide widths. The club's cards are set in a squarish
   technical face and the site ships neither one: home.css declares Geist (a
   humanist grotesque) and retired Archivo altogether, so the earlier cards
   were asking for a font that was not being served and rendering in whatever
   the system offered. That is most of why they read as generated.

   ---- WHAT IT IS BUILT FROM ------------------------------------------------

   Sixteen of thirty-six players have no photograph, so no layout depends on
   one. NO SQUAD NUMBERS: the records key everything by `num` and the site
   never shows one, so `nameOf` is the only thing that turns one into a name.
   ========================================================================== */

export const ART_W = 1080;
export const ART_H = 1080;

/* The club's own, verbatim, and not shortened: "what we do echoes" is a
   different sentence. It is on the crest, so the cards carry it in the
   footer rather than repeating it large. */
export const MOTTO = 'What we do in life echoes in eternity.';

const ACCENT = '#FF7034';
const ACCENT_DIM = 'rgba(255,112,52,0.30)';
const INK = '#080A0E';
const PAPER = '#FFFFFF';
const DIM = 'rgba(255,255,255,0.62)';
const BLUE = 'rgba(150,180,220,0.10)';

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

/* Letterspaced caps, a character at a time, because canvas has no
   letterSpacing in every engine this has to run in. Returns the drawn width
   so a caller can rule either side of it. */
function tracked(ctx, text, x, y, opts = {}) {
  const size = opts.size == null ? 20 : opts.size;
  const track = opts.track == null ? 5 : opts.track;
  const weight = opts.weight == null ? 700 : opts.weight;
  const align = opts.align || 'left';
  const color = opts.color || PAPER;
  const s = upper(text);
  ctx.save();
  ctx.font = `${weight} ${size}px "${FACE}"`;
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  const total = ctx.measureText(s).width + track * Math.max(0, s.length - 1);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  for (const ch of s) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + track; }
  ctx.restore();
  return total;
}

/* ---- The furniture ------------------------------------------------------ */

/* The blueprint. Faint technical linework, deliberately not symmetrical and
   deliberately running off every edge, because a drawing that fits neatly
   inside the frame reads as decoration rather than as a sheet the card was
   cut from. Seeded by hand rather than randomly so every card in a set has
   the same drawing under it. */
function drawBlueprint(ctx) {
  ctx.save();
  ctx.strokeStyle = BLUE;
  ctx.lineWidth = 1;

  const circles = [
    [96, 232, 78], [96, 232, 44], [58, 300, 120], [980, 250, 96],
    [1006, 486, 150], [140, 880, 130], [880, 940, 92], [980, 806, 40],
  ];
  for (const [cx, cy, r] of circles) {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  }

  ctx.setLineDash([7, 9]);
  for (const [x1, y1, x2, y2] of [
    [0, 168, 1080, 168], [0, 912, 1080, 912], [168, 0, 168, 1080], [912, 0, 912, 1080],
  ]) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  ctx.setLineDash([]);

  /* Dimension arrows, as on a drawing. */
  const arrow = (x, y, dir) => {
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x, y + dir * 62);
    ctx.moveTo(x - 7, y + dir * 14); ctx.lineTo(x, y); ctx.lineTo(x + 7, y + dir * 14);
    ctx.stroke();
  };
  arrow(842, 96, 1); arrow(958, 640, -1); arrow(120, 640, 1); arrow(700, 1000, -1);

  ctx.strokeStyle = 'rgba(150,180,220,0.07)';
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.moveTo(22, 300 + i * 18); ctx.lineTo(40, 300 + i * 18);
    ctx.stroke();
  }
  ctx.restore();
}

/* Accent brackets at the four corners, and a filled square at the middle of
   each edge. Both come straight off the club's own cards. */
function drawFrame(ctx) {
  const m = 26;
  const len = 54;
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

  /* The dotted run down the top left, which the club's cards all carry. */
  for (let i = 0; i < 5; i += 1) ctx.fillRect(m - 4, m + 44 + i * 22, 8, 8);
  ctx.restore();
}

/* The ring. Everything that matters sits inside it. */
function drawRing(ctx, cy, r) {
  ctx.save();
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ART_W / 2, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = ACCENT;
  const s = 12;
  for (const a of [-Math.PI / 2, 0, Math.PI / 2, Math.PI]) {
    ctx.fillRect(ART_W / 2 + Math.cos(a) * r - s / 2, cy + Math.sin(a) * r - s / 2, s, s);
  }
  ctx.restore();
}

/* A heading between two short rules. */
function ruled(ctx, text, y, opts = {}) {
  const size = opts.size == null ? 27 : opts.size;
  const color = opts.color || PAPER;
  const w = tracked(ctx, text, ART_W / 2, y, { size, track: 7, weight: 700, align: 'center', color });
  ctx.save();
  ctx.strokeStyle = opts.rule || ACCENT;
  ctx.lineWidth = 2;
  const gap = 26;
  const len = opts.ruleLen == null ? 54 : opts.ruleLen;
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
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.stroke();
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

/* The sponsors, on white tiles, exactly as the club sets them. They are on
   the card because they paid to be, so they are drawn from the same list the
   website publishes rather than typed in here. */
function drawSponsors(ctx, logos, y) {
  const list = (logos || []).filter((l) => l && l.img && l.img.width).slice(0, 4);
  if (!list.length) return;
  ruled(ctx, 'Proudly backed by', y, { size: 17, ruleLen: 44, rule: ACCENT_DIM, color: DIM });

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
    const w = l.img.width * s;
    const h = l.img.height * s;
    ctx.drawImage(l.img, x + (tileW - w) / 2, top + (tileH - h) / 2, w, h);
    ctx.restore();
    x += tileW + gap;
  }
}

/* The footer bar: the handle on the left, the website on the right, with a
   rule above. */
function drawFooter(ctx) {
  const y = ART_H - 46;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(72, y - 26); ctx.lineTo(ART_W - 72, y - 26);
  ctx.stroke();

  /* A rounded square with a dot: the Instagram glyph, drawn rather than
     loaded, because it is four strokes and no asset. */
  const ix = 76;
  const iy = y - 11;
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const r = 5;
  const b = 20;
  ctx.moveTo(ix + r, iy - b / 2);
  ctx.arcTo(ix + b, iy - b / 2, ix + b, iy + b / 2, r);
  ctx.arcTo(ix + b, iy + b / 2, ix, iy + b / 2, r);
  ctx.arcTo(ix, iy + b / 2, ix, iy - b / 2, r);
  ctx.arcTo(ix, iy - b / 2, ix + b, iy - b / 2, r);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(ix + b / 2, iy, 4.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  tracked(ctx, '@suesangelsfc', 110, y - 4, { size: 17, track: 1.6, color: DIM });
  tracked(ctx, 'www.suesangelsfc.co.uk', ART_W - 74, y - 4, { size: 17, track: 1.6, color: DIM, align: 'right' });
}

/* Every card opens and closes the same way, so the set cannot drift. */
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

/* Both badges, big, with the club name under each. */
function drawFixtureBadges(ctx, o) {
  const size = o.size == null ? 214 : o.size;
  const cy = o.y;
  const off = o.off == null ? 300 : o.off;
  drawBadge(ctx, o.leftBadge, ART_W / 2 - off, cy, size, o.leftName);
  drawBadge(ctx, o.rightBadge, ART_W / 2 + off, cy, size, o.rightName);
  const lab = cy + size / 2 + 46;
  tracked(ctx, o.leftName || '', ART_W / 2 - off, lab, { size: 21, track: 3, align: 'center' });
  tracked(ctx, o.rightName || '', ART_W / 2 + off, lab, { size: 21, track: 3, align: 'center' });
  return lab;
}

/* ---- 1. Next game ------------------------------------------------------- */

export function nextGame(ctx, m, assets = {}) {
  openCard(ctx);
  drawRing(ctx, 470, 372);

  ruled(ctx, m.competition || 'Fixture', 148, { size: 23 });

  /* Home club on the left, as a fixture is written. */
  const weLeft = !!m.weAreHome;
  drawFixtureBadges(ctx, {
    leftBadge: weLeft ? assets.crest : assets.oppBadge,
    rightBadge: weLeft ? assets.oppBadge : assets.crest,
    leftName: weLeft ? 'Sue’s Angels' : m.opponent,
    rightName: weLeft ? m.opponent : 'Sue’s Angels',
    y: 400,
  });

  tracked(ctx, 'vs', ART_W / 2, 414, { size: 40, track: 3, weight: 700, align: 'center', color: PAPER });
  tracked(ctx, weLeft ? 'Home' : 'Away', ART_W / 2 - 300, 592, { size: 16, track: 3, align: 'center', color: ACCENT });
  tracked(ctx, weLeft ? 'Away' : 'Home', ART_W / 2 + 300, 592, { size: 16, track: 3, align: 'center', color: ACCENT });

  ctx.save();
  ctx.strokeStyle = ACCENT_DIM;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(232, 640); ctx.lineTo(ART_W - 232, 640); ctx.stroke();
  ctx.restore();

  tracked(ctx, m.dateLine || '', ART_W / 2, 700, { size: 30, track: 5, align: 'center' });
  tracked(ctx, m.kick ? `${m.kick} kick off` : 'Kick-off to be confirmed', ART_W / 2, 754,
    { size: 40, track: 4, align: 'center', color: ACCENT });
  if (m.venue) tracked(ctx, m.venue, ART_W / 2, 806, { size: 21, track: 3, align: 'center', color: DIM });

  closeCard(ctx, assets);
}

/* ---- 2. Matchday squad -------------------------------------------------- */

export function matchdaySquad(ctx, m, assets = {}) {
  openCard(ctx);
  drawRing(ctx, 520, 396);

  ruled(ctx, 'Matchday squad', 148, { size: 25 });

  drawBadge(ctx, assets.crest, ART_W / 2 - 300, 300, 176, 'Sue’s Angels');
  drawBadge(ctx, assets.oppBadge, ART_W / 2 + 300, 300, 176, m.opponent);
  tracked(ctx, 'v', ART_W / 2, 312, { size: 28, track: 2, align: 'center', color: DIM });
  tracked(ctx, m.opponent || '', ART_W / 2, 424, { size: 19, track: 3, align: 'center', color: DIM });

  const starters = (m.starters || []).filter(Boolean);
  const subs = (m.subs || []).filter(Boolean);
  const left = starters.slice(0, Math.ceil(starters.length / 2));
  const right = starters.slice(Math.ceil(starters.length / 2));

  tracked(ctx, 'Starting eleven', ART_W / 2, 480, { size: 16, track: 4, align: 'center', color: ACCENT });

  ctx.save();
  ctx.textAlign = 'center';
  const rowH = 44;
  const colW = 400;
  const draw = (list, cx) => list.forEach((n, i) => {
    const t = upper(surname(n));
    ctx.font = `600 ${fitText(ctx, t, colW, 30, { weight: 600 })}px "${FACE}"`;
    ctx.fillStyle = PAPER;
    ctx.fillText(t, cx, 534 + i * rowH);
  });
  draw(left, ART_W / 2 - 208);
  draw(right, ART_W / 2 + 208);
  ctx.restore();

  const bottom = 534 + Math.max(left.length, right.length) * rowH;
  if (subs.length) {
    tracked(ctx, 'Substitutes', ART_W / 2, bottom + 6, { size: 15, track: 4, align: 'center', color: ACCENT });
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = DIM;
    ctx.font = `500 20px "${FACE}"`;
    wrapLines(ctx, subs.map((n) => upper(surname(n))).join('  ·  '), 760).slice(0, 2)
      .forEach((l, i) => ctx.fillText(l, ART_W / 2, bottom + 40 + i * 28));
    ctx.restore();
  } else {
    /* Eleven names and then nothing reads as a graphic that failed to finish.
       Sunday league sheets frequently name nobody on the bench, so it says so
       rather than leaving the space silent. */
    tracked(ctx, 'No substitutes named', ART_W / 2, bottom + 6,
      { size: 15, track: 4, align: 'center', color: 'rgba(255,255,255,0.30)' });
  }

  closeCard(ctx, assets);
}

/* ---- 3. Man of the match ------------------------------------------------ */

export function manOfTheMatch(ctx, m, assets = {}) {
  openCard(ctx);
  drawRing(ctx, 470, 372);

  ruled(ctx, 'Man of the match', 148, { size: 25 });

  /* The portrait where one exists, the crest where it does not. Sixteen of
     thirty-six have none, so the frame is the constant and what sits in it is
     the variable: the card is composed identically either way. */
  const cx = ART_W / 2;
  const cy = 430;
  const box = 300;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, box / 2, 0, Math.PI * 2);
  ctx.clip();
  if (assets.photo && assets.photo.width) {
    const s = Math.max(box / assets.photo.width, box / assets.photo.height);
    ctx.drawImage(assets.photo, cx - (assets.photo.width * s) / 2, cy - (assets.photo.height * s) / 2,
      assets.photo.width * s, assets.photo.height * s);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(cx - box / 2, cy - box / 2, box, box);
    drawBadge(ctx, assets.crest, cx, cy, 210, 'Sue’s Angels');
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, box / 2, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  const nm = upper(m.player || '');
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = PAPER;
  ctx.font = `700 ${fitText(ctx, nm, 900, 68, { weight: 700 })}px "${FACE}"`;
  ctx.fillText(nm, ART_W / 2, 668);
  ctx.restore();

  if (m.position) {
    tracked(ctx, m.position, ART_W / 2, 712, { size: 19, track: 3.4, align: 'center', color: ACCENT });
  }

  ctx.save();
  ctx.strokeStyle = ACCENT_DIM;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(300, 748); ctx.lineTo(ART_W - 300, 748); ctx.stroke();
  ctx.restore();

  /* What he did it in. An award with no match attached is a poster. */
  const sub = [m.opponent ? `v ${m.opponent}` : null, m.scoreLine || null].filter(Boolean).join('   ·   ');
  tracked(ctx, sub, ART_W / 2, 796, { size: 20, track: 3, align: 'center', color: DIM });
  tracked(ctx, m.dateLine || '', ART_W / 2, 834, { size: 17, track: 3, align: 'center', color: 'rgba(255,255,255,0.42)' });

  closeCard(ctx, assets);
}

/* ---- 4. Final result ---------------------------------------------------- */

export function finalResult(ctx, m, assets = {}) {
  openCard(ctx);
  drawRing(ctx, 452, 380);

  ruled(ctx, 'Full time', 148, { size: 29 });

  const weLeft = !!m.weAreHome;
  const ourScore = m.ourGoals;
  const theirScore = m.theirGoals;

  drawFixtureBadges(ctx, {
    leftBadge: weLeft ? assets.crest : assets.oppBadge,
    rightBadge: weLeft ? assets.oppBadge : assets.crest,
    leftName: weLeft ? 'Sue’s Angels' : m.opponent,
    rightName: weLeft ? m.opponent : 'Sue’s Angels',
    y: 392,
    size: 206,
    off: 306,
  });

  /* THE SCORE IS THE GRAPHIC. A walkover has none - the published table adds
     no goals for one - so it says what it was instead of printing a scoreline
     nobody ever recorded. The club's own colour marks OUR number. */
  ctx.save();
  ctx.textAlign = 'center';
  if (m.noScore) {
    ctx.fillStyle = PAPER;
    ctx.font = `700 ${fitText(ctx, upper(m.noScore), 420, 44, { weight: 700 })}px "${FACE}"`;
    ctx.fillText(upper(m.noScore), ART_W / 2, 406);
  } else {
    ctx.font = `700 128px "${FACE}"`;
    const l = weLeft ? ourScore : theirScore;
    const r = weLeft ? theirScore : ourScore;
    ctx.fillStyle = weLeft ? ACCENT : PAPER;
    ctx.fillText(String(l), ART_W / 2 - 58, 434);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = `500 74px "${FACE}"`;
    ctx.fillText('-', ART_W / 2, 428);
    ctx.font = `700 128px "${FACE}"`;
    ctx.fillStyle = weLeft ? PAPER : ACCENT;
    ctx.fillText(String(r), ART_W / 2 + 58, 434);
  }
  ctx.restore();

  /* Scorers, under the club's own badge, which is where the club puts them.
     The minute is printed only where the record carries one. */
  if ((m.scorers || []).length) {
    const cx = ART_W / 2 + (weLeft ? -306 : 306);
    tracked(ctx, 'Goalscorers', cx, 570, { size: 15, track: 3.4, align: 'center', color: ACCENT });
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = PAPER;
    ctx.font = `600 19px "${FACE}"`;
    m.scorers.slice(0, 5).forEach((s, i) => ctx.fillText(upper(s), cx, 600 + i * 26));
    ctx.restore();
  }

  ctx.save();
  ctx.strokeStyle = ACCENT_DIM;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(232, 762); ctx.lineTo(ART_W - 232, 762); ctx.stroke();
  ctx.restore();

  tracked(ctx, m.dateLine || '', ART_W / 2, 814, { size: 26, track: 5, align: 'center' });

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
