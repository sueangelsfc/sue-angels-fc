/* ==========================================================================
   THE COVERS THE CLUB SHARES

   Every match report and every article shipped the same generic card:
   `og-match.jpg` on all thirty-eight reports, `og-news.jpg` on all five
   articles. A link to the Kew Antigua win and a link to the Brentford defeat
   looked identical in WhatsApp, which is where most of this club's football
   is actually shared.

   The panel can DRAW one - two badges, the score and the date for a match;
   the crest and the headline for an article - and saves it to the record. It
   has never been used: zero covers in every snapshot in the repository's
   history. That is not a fault in the panel. It is forty-three cards somebody
   has to sit and press a button for, one at a time.

   So they are drawn HERE, from the same match records everything else on this
   site is derived from, and written to assets/covers/. A real photograph or a
   cover the club has drawn still wins: this is the floor, not the ceiling.

   ---- WHY HTML AND NOT CANVAS ---------------------------------------------

   src/lib/matchday-art.mjs draws on a 2D context because the panel draws in
   the browser on save and has to. Nothing here does. Laying a card out in
   HTML means wrapping a headline is the browser's problem rather than a
   measureText loop, the type is the site's own type from the site's own
   stylesheet, and the thing can be opened and looked at. It is rasterised
   once by scripts/make-covers.mjs and the output is committed, exactly as
   every other generated file in this repository is.

   ---- WHAT IS ON THEM ------------------------------------------------------

   A share card is read at about 200px wide in a chat list. Everything here is
   sized for that: the score is enormous, the club names are legible, and
   anything that would not survive being shrunk to a thumbnail is not on it.
   ========================================================================== */

export const COVER_W = 1200;
export const COVER_H = 630;

const esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const CREST = '/assets/badge/sue-angels-badge-star.webp';

/* The page's own ground and accent, written literally rather than as tokens:
   this document loads no stylesheet of the site's, because it has to render
   identically from a file:// path in a headless browser with no server. */
const INK = '#0B0A09';
const BRAND = '#FF7034';
const PAPER = '#FFFFFF';

const SHELL = (inner, extraCss = '') => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>cover</title>
<style>
  @font-face{font-family:Archivo;src:url(/assets/fonts/Archivo-Variable.woff2) format("woff2");
    font-weight:100 900;font-stretch:62.5% 125%;font-display:block}
  @font-face{font-family:Geist;src:url(/assets/fonts/Geist-Variable.woff2) format("woff2");
    font-weight:100 900;font-display:block}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${COVER_W}px;height:${COVER_H}px;overflow:hidden}
  body{background:${INK};color:${PAPER};font-family:Geist,system-ui,sans-serif;
    position:relative;-webkit-font-smoothing:antialiased}
  /* The club's atmosphere, held still. On the site four orange masses drift;
     a share card is one frame, so they are placed rather than animated. */
  .glow{position:absolute;inset:0;overflow:hidden}
  .glow i{position:absolute;display:block;border-radius:50%;filter:blur(90px);opacity:.5}
  .g1{width:720px;height:720px;left:-220px;top:-260px;background:${BRAND};opacity:.22}
  .g2{width:560px;height:560px;right:-160px;bottom:-240px;background:${BRAND};opacity:.16}
  .veil{position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,10,9,.42),rgba(11,10,9,.78))}
  .card{position:relative;height:100%;padding:56px 64px;display:flex;flex-direction:column}
  .eyebrow{display:flex;align-items:center;gap:12px;font-size:17px;font-weight:700;
    letter-spacing:.18em;text-transform:uppercase;color:${BRAND}}
  .eyebrow s{display:block;width:38px;height:2px;background:${BRAND};text-decoration:none}
  .foot{margin-top:auto;display:flex;align-items:center;justify-content:space-between;gap:24px}
  .foot__meta{font-size:18px;font-weight:600;letter-spacing:.13em;text-transform:uppercase;
    color:rgba(255,255,255,.62)}
  .foot__club{display:flex;align-items:center;gap:14px}
  .foot__club img{width:44px;height:auto;display:block}
  .foot__club b{font-family:Archivo,system-ui,sans-serif;font-weight:600;font-size:22px;
    font-stretch:108%;letter-spacing:-.01em}
  ${extraCss}
</style></head>
<body><div class="glow"><i class="g1"></i><i class="g2"></i></div><div class="veil"></div>
${inner}
</body></html>`;

const foot = (meta) => `<div class="foot">
      <span class="foot__meta">${esc(meta)}</span>
      <span class="foot__club"><img src="${CREST}" alt=""><b>Sue’s Angels FC</b></span>
    </div>`;

/* ---- A match ------------------------------------------------------------
   Two badges, the score and the date, which is what the panel draws and what
   the club asked for. The score is the whole card: at thumbnail size it is
   the only thing that will read, so it gets the room. */
export function matchCover(m, badgeFor) {
  /* HOME ON THE LEFT, which is how a scoreline is written and how the match
     report page already draws it. This read `usLeft = !m.weAreHome`, which
     put the club on the left of every card - so the away win at Kew Antigua
     came out "Sue's Angels 2-1 Kew Antigua" while the page it links to says
     "Kew Antigua 1-2 Sue's Angels". The same result stated backwards, on the
     image somebody sees before they open the page. */
  const weAreLeft = !!m.weAreHome;
  const left = m.home;
  const right = m.away;
  const leftSrc = weAreLeft ? CREST : badgeFor(m.opponent);
  const rightSrc = weAreLeft ? badgeFor(m.opponent) : CREST;
  const ls = m.hs;
  const rs = m.as;

  /* BOTH BADGES WITH THE TIE BETWEEN THEM, which is the shape the club's
     covers have always had. What sits in the middle follows the match: "VS"
     before it is played, the score after. A card for a finished game showing
     VS would be throwing away the one thing anybody opening it wants, and a
     card for Sunday's game showing 0-0 would be stating a result that does
     not exist.

     A walkover keeps VS as well: it was awarded rather than played, the
     league records no goals for it, and a number here would invent one. */
  const middle = !m.played
    ? '<span class="vs">VS</span>'
    : (m.isWalkover ? '<span class="vs">VS</span>' : `${ls}<em>-</em>${rs}`);

  return SHELL(`<div class="card">
    <div class="eyebrow"><s></s>${esc(m.competition || 'Match')}${m.round ? ` · ${esc(m.round)}` : ''}</div>
    <div class="tie">
      <div class="side">
        <img class="badge" src="${esc(leftSrc)}" alt="">
        <span class="name">${esc(left)}</span>
      </div>
      <div class="score">${middle}</div>
      <div class="side">
        <img class="badge" src="${esc(rightSrc)}" alt="">
        <span class="name">${esc(right)}</span>
      </div>
    </div>
    ${foot(`${m.date}${m.venue ? ` · ${m.homeAway}` : ''}`)}
  </div>`, `
  .tie{flex:1;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:28px;
    padding-block:18px}
  .side{display:flex;flex-direction:column;align-items:center;gap:18px;min-width:0}
  .badge{width:132px;height:132px;object-fit:contain;display:block}
  .name{font-family:Archivo,system-ui,sans-serif;font-weight:500;font-size:30px;font-stretch:104%;
    letter-spacing:-.018em;text-align:center;line-height:1.12;max-width:15ch;
    display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .score{font-family:Archivo,system-ui,sans-serif;font-weight:600;font-size:132px;
    font-stretch:100%;letter-spacing:-.05em;line-height:1;font-variant-numeric:tabular-nums;
    white-space:nowrap}
  .score em{font-style:normal;color:${BRAND};padding-inline:10px}
  /* VS is a label, not a number, so it does not take a number's size. */
  .vs{display:inline-block;font-size:54px;font-weight:700;font-stretch:96%;
    letter-spacing:.06em;color:${BRAND}}`);
}

/* ---- An article ---------------------------------------------------------
   The crest and the headline, which is the pair the panel draws. The headline
   is the card: it is what somebody decides whether to open. */
export function articleCover(a) {
  const t = String(a.title || '').trim();
  /* Long headlines get a smaller face rather than a clamp that eats the end
     of the sentence. Three steps, chosen so the longest headline the club has
     written still lands on four lines. */
  const size = t.length > 88 ? 60 : t.length > 58 ? 70 : 82;

  return SHELL(`<div class="card">
    <div class="eyebrow"><s></s>${esc(a.category || 'Club news')}</div>
    <h1 class="head" style="font-size:${size}px">${esc(t)}</h1>
    ${foot(a.date || '')}
  </div>`, `
  .head{flex:1;display:flex;align-items:center;
    font-family:Archivo,system-ui,sans-serif;font-weight:500;font-stretch:104%;
    line-height:1.06;letter-spacing:-.032em;padding-block:26px;
    max-width:19ch}`);
}

/* ---- An interview -------------------------------------------------------

   An article built round a recording got the same crest-and-headline card as
   every other article, so a link to a four-minute conversation with the
   manager looked exactly like a link to a fixture announcement in the one
   place most of this club's football is actually shared.

   A share card is read at about 200px wide in a chat list, which decides
   everything on this one. The face reads at that size; a headline set in
   nineteen characters a line does not, so the headline is here but small and
   the picture does the work. The length is set large because it is the thing
   somebody is actually deciding about, and because a duration on a portrait
   says "this is a recording" without a word of explanation.

   THE WAVEFORM IS THE SAME DATA THE PAGE DRAWS, read from the file
   `scripts/make-waveform.mjs` writes, so the card and the page cannot show
   different shapes for the same recording. Absent, the strip is left out
   rather than faked.

   Portrait LEFT, words right. The face is a square crop and a 1200x630 card
   is twice as wide as it is tall, so a full-bleed portrait would be a crop of
   a crop: a column of its own keeps his whole head on the card. */
export function interviewCover(a, clip, peaks) {
  const t = String(a.title || '').trim();
  const size = t.length > 76 ? 40 : t.length > 52 ? 46 : 52;
  const bars = (peaks || []).length > 8 ? (() => {
    const W = 3;
    const GAP = 2;
    const H = 54;
    const d = peaks.map((v, i) => {
      const h = Math.max(3, Math.round(v * H));
      return `M${i * (W + GAP) + W / 2} ${Math.round((H - h) / 2)}v${h}`;
    }).join('');
    return `<svg class="wave" viewBox="0 0 ${peaks.length * (W + GAP) - GAP} ${H}">`
      + `<path d="${d}" stroke="${BRAND}" stroke-width="${W}" stroke-linecap="round" fill="none"/>`
      + `</svg>`;
  })() : '';

  return SHELL(`<div class="card iv">
    <div class="iv__face">${clip.face ? `<img src="${esc(clip.face)}" alt="">` : ''}</div>
    <div class="iv__body">
      <div class="eyebrow"><s></s>Listen</div>
      ${clip.ts ? `<div class="iv__len">${esc(clip.ts)}</div>` : ''}
      <h1 class="iv__h" style="font-size:${size}px">${esc(t)}</h1>
      ${bars}
      ${foot(a.date || '')}
    </div>
  </div>`, `
  .iv{flex-direction:row;gap:46px;padding:0 64px 0 0;align-items:stretch}
  .iv__face{width:420px;flex:0 0 420px;overflow:hidden;position:relative}
  .iv__face img{width:100%;height:100%;object-fit:cover;object-position:50% 18%;display:block}
  /* The portrait is a photograph on a dark card, so it is faded into the card
     on its inner edge rather than stopped with a line. */
  .iv__face::after{content:"";position:absolute;inset:0;
    background:linear-gradient(90deg,rgba(11,10,9,0) 62%,rgba(11,10,9,.9) 100%)}
  .iv__body{flex:1;min-width:0;display:flex;flex-direction:column;padding-block:56px}
  .iv__len{font-family:Archivo,system-ui,sans-serif;font-weight:600;font-size:104px;
    font-stretch:100%;letter-spacing:-.05em;line-height:1;margin-top:14px;
    font-variant-numeric:tabular-nums}
  .iv__h{font-family:Archivo,system-ui,sans-serif;font-weight:500;font-stretch:104%;
    line-height:1.1;letter-spacing:-.028em;margin-top:18px;max-width:22ch;
    color:rgba(255,255,255,.82)}
  .wave{width:100%;height:54px;margin-top:26px;display:block}`);
}
