/* ==========================================================================
   CLUB NEWS  (/news.html and /news/<slug>.html, "News" under Media)

   Articles written by the club: signings, retirements, award nights, fixture
   announcements. Each gets its own crawlable URL with the full text in the
   HTML, which is the point of the generator.

   The article text lives in the `lede` field, not `body`. `body` is empty on
   every row, so reading it would have shipped five headlines with nothing
   under them. That is a property of how the records were captured, not a
   choice: `lede` holds the whole piece, 693 to 4,480 characters of it.

   Match reports share the feed with articles, under their own filter, the
   way the old design had it. They were left out for one build because their
   cards had nowhere to land; /matches/<id>.html now exists for every played
   match, so they are back and every card opens.
   ========================================================================== */
import { esc, attr, CLUB_ID } from '../lib/html.mjs';
import { CLUB } from '../lib/club.mjs';
import { fmtDate, slugify, isUs, teamSummary, toISO } from '../lib/stats.mjs';
import { siteFooter, sitePreMain, siteHeader, oppBadge, oppBadgeSrc } from './home.mjs';
import { reportText, hasReport, plainText } from '../lib/prose.mjs';
import { readFileSync } from 'node:fs';

const STAR = '/assets/badge/sue-angels-badge-star.webp';

/* ==========================================================================
   THE COVER, AND THE DEFAULT WHEN THERE IS NONE

   The article page rendered NO cover at all. Not the drawn one, not a
   photograph: `a.cover` was read by the news CARD and by nothing else, so
   an article with a cover picture showed it in the list and lost it on its
   own page. The code that drew one still exists in templates/detail.mjs,
   in an `articlePage` nothing has called since the rebuild.

   And where there is no cover the fallback was a bare crest floating on an
   empty panel, three identical ones in a row down the news page, which
   reads as three images that failed to load rather than as a decision. A
   default cover is DRAWN: the crest, the club, and the kind of piece it is.
   ========================================================================== */
/* THE DEFAULT COVER IS DRAWN ON THE PAGE, NOT BAKED INTO A PICTURE. The
   build's card and the panel's card were both images, so a category or a
   headline changed in the panel stayed wrong on the cover until somebody
   redrew it on a laptop: two posts moved from Club to News still said CLUB.
   This is the same card in markup (the eyebrow and its dash, the headline in
   Archivo 500, the date and the star with the club's name) sized to its box,
   so it follows the record the moment the site is published. Decorative: the
   headline is already the page's h1 or the card's title. */
export const coverPlate = (art, eager) => {
  const t = String(art.title || '').trim();
  const len = t.length > 88 ? ' nw-plate__title--l' : t.length > 58 ? ' nw-plate__title--m' : '';
  /* AN INTERVIEW IS A PLATE LIKE EVERY OTHER ARTICLE, and says so in the
     eyebrow rather than by being a different kind of card. A wall of news
     cards wants one shape: a photograph among them reads as a different sort
     of thing, and what makes this piece different is not worth breaking the
     grid for. The length rides in the corner, which is the one fact the plate
     cannot otherwise carry - a reader deciding whether to open a recording is
     deciding about minutes. */
  const c = leadClip(art.lede);
  return `<span class="nw-plate" aria-hidden="true">
      <span class="nw-plate__eyebrow"><s></s>${esc(catLabel(articleKind(art)))}${
  c && c.ts ? `<b class="nw-plate__len">${esc(c.ts)}</b>` : ''}</span>
      <span class="nw-plate__title${len}">${esc(t)}</span>
      <span class="nw-plate__foot"><span>${esc(fmtDate(art.date))}</span><span class="nw-plate__club"><img src="${STAR}" alt="" width="22" height="27" loading="${eager ? 'eager' : 'lazy'}" decoding="async" />Sue’s Angels FC</span></span>
    </span>`;
};

const ARROW = '<span aria-hidden="true">→</span>';

const rail = (n, label, ref) => `<div class="xrail" aria-hidden="true">
      <span class="xrail__l"><span class="xrail__n">${esc(String(n).padStart(2, '0'))}</span><span class="xrail__t">${esc(label)}</span></span>
      <span class="xrail__r">${esc(ref)}</span>
    </div>`;

/* Articles are stored as plain text with blank lines between paragraphs, and
   occasionally a markdown heading or a bulleted list. A sub-heading is an
   `h2`: the page's only `h1` is the headline, so `h3` skipped a level, which
   is a real defect the suite fails a build over and which nothing caught
   until an article actually used one. Rendered as paragraphs
   so the text keeps its shape rather than collapsing into one block. */
/* EMPHASIS, AND IT IS APPLIED AFTER ESCAPING, NEVER BEFORE. The club writes
   these in a textarea, so the text is untrusted: esc() runs first and turns
   any markup into entities, and only then are the surviving asterisks read as
   emphasis. Doing it the other way round would let a pasted <script> through
   the moment somebody wrote a bold word next to it.

   `**bold**` first, then what is left of `*italic*`, so the two-star form is
   never mistaken for a pair of one-star ones. Nothing else is a marker: a
   stray asterisk in the middle of a sentence stays a stray asterisk. */
/* A LINK is `[words](address)`, read after escaping like everything else:
   a page on this site (`/players/ade-owolana.html`) or an https address,
   nothing else, so no `javascript:` and nothing a quote can break out of
   (quotes are already entities). Never the `![...]` of a picture line. */
/* `!` and `@` are refused a link so that a photograph's or an audio clip's
   line, when its address is not one we allow, stays on the page as the text
   it is and the writer can see it did not work. Without the `@` a refused
   clip quietly became an ordinary link to wherever it pointed. */
const inline = (t) => esc(t)
  .replace(/(?<![!@])\[([^\]\n]+)\]\((\/[\w\-./#%]*|https:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\*([^*\n]+)\*/g, '<em>$1</em>');

/* A PHOTOGRAPH, PLACED FROM THE PANEL AS A LINE OF ITS OWN:
   `![caption](address#WIDTHxHEIGHT)`.

   ONLY FROM THE CLUB'S OWN STORAGE, or from the site's own /assets/. The text
   is typed into a textarea, so an address could be anything, and a picture
   hot-linked from somewhere else is a request to a third party on every page
   view - and the security policy would block it anyway, leaving a broken
   image. A line naming any other address is left as the text it is, so the
   writer sees it did not work rather than a gap. The caption goes through
   `inline`, which escapes before anything else. The size comes from the upload;
   a hand-typed line without one gets a 3:2 guess, which only affects the space
   held while it loads. */
/* THE WAVEFORM, MEASURED, NOT DRAWN FROM IMAGINATION.
   `scripts/make-waveform.mjs` writes this with ffmpeg: 150 peaks per file,
   normalised 0..1. Committed, because the deploy has no ffmpeg, and absent
   means no waveform rather than a broken one - the same contract the share
   cards and the programme PDF have. */
const PEAKS = (() => {
  try {
    return JSON.parse(readFileSync(new URL('../data/audio-peaks.json', import.meta.url), 'utf8'));
  } catch { return {}; }
})();

const STORAGE = `${JSON.parse(readFileSync(new URL('../data/runtime.json', import.meta.url), 'utf8'))
  .supabase.url}/storage/v1/object/public/`;
/* A GRAPHIC is the same line with a second `!`: `!![caption](address)`. A
   photograph fills the column with rounded corners; a graphic (a results card,
   a poster, a table the club made in Canva) is shown whole on its own, with no
   corners cut off it. Same address rule, same escaping. */
function photo(b) {
  const m = /^(!?)!\[([^\]\n]*)\]\((\S+)\)$/.exec(b);
  if (!m) return '';
  const graphic = m[1] === '!';
  const size = /#(\d{2,5})x(\d{2,5})$/.exec(m[3]);
  const src = m[3].replace(/#.*$/, '');
  const ours = src.startsWith(STORAGE)
    ? /^[\w\-./%]+$/.test(src.slice(STORAGE.length))
    : /^\/assets\/[\w\-./]+\.(?:jpe?g|png|webp)$/i.test(src);
  if (!ours) return '';
  const cap = m[2].trim();
  /* alt="" beside a caption: the figcaption already names the picture, and
     saying it twice is what a screen reader would otherwise do. */
  return `<figure class="nw-art__fig${graphic ? ' nw-art__fig--graphic' : ''}"><img src="${attr(src)}" alt="" width="${size ? size[1] : 1600}" `
    + `height="${size ? size[2] : 1067}" loading="lazy" decoding="async" />`
    + `${cap ? `<figcaption>${inline(cap)}</figcaption>` : ''}</figure>`;
}

/* AN AUDIO CLIP, a line of its own: `@[caption](address#MM:SS)`.

   Interviews are the reason this exists. `videos.mjs` has said since it was
   written that an interview belongs in club news, "where a piece of writing
   can sit around them", and until now there was no way to put one there: the
   body could carry a photograph, a graphic and a table, and nothing a reader
   could listen to.

   SAME ADDRESS RULE AS A PHOTOGRAPH, for the same reasons - the club's own
   storage or the site's own /assets/audio/, so a line typed into a textarea
   cannot turn into a request to a third party on every page view. `media-src`
   is already `'self'` alone, so a hot-linked file would be blocked by the
   policy and leave a dead player; a line naming any other address is left as
   the text it is, so the writer sees it did not work.

   NATIVE CONTROLS, AND `preload="none"`. The browser's own player is
   keyboard-operable and labelled in the reader's own language, and it costs
   `sa.js` nothing - a bespoke one would be a budget raise to rebuild a pause
   button. `preload="none"` is what stops a twenty-minute interview being
   downloaded by everybody who opens the page to read it.

   THE AUDIO IS NOT THE ARTICLE. A clip with no words around it is unreadable
   to anybody deaf, anybody on a quiet train and every search engine, so the
   piece carries what was said in text and the player sits inside it. That is
   an editorial rule this function cannot enforce, and it is why the caption
   is used as the player's label rather than left to chance. */
/* THE SHAPE OF THE RECORDING, from `scripts/make-waveform.mjs`.

   ONE `<path>`, NOT 150 RECTANGLES. Every bar is a zero-height subpath with a
   round cap, which paints a rounded bar at the stroke's width - the same trick
   the stats screen's world map uses to draw 2,856 land cells in one node. 150
   rects would be 150 elements on a page that already carries a long
   transcript, for a picture.

   TWO PATHS, ONE CLIPPED, so the shape doubles as the progress bar: the front
   copy is revealed by `--p`, which `sa.js` sets from `timeupdate`. With the
   script blocked the front copy simply never appears and the waveform is a
   waveform. The height is a viewBox, so it scales with CSS and nothing ever
   measures the page. */
function waveform(src) {
  const rec = PEAKS[src];
  const peaks = (rec && rec.peaks) || [];
  if (peaks.length < 8) return '';
  const W = 2;
  const GAP = 1.5;
  const H = 42;
  const d = peaks.map((v, i) => {
    /* A floor of 2, because a silent slice drawn at no height leaves a gap in
       the shape and reads as a file that failed rather than as a pause. */
    const h = Math.max(2, Math.round(v * H * 10) / 10);
    const x = i * (W + GAP) + W / 2;
    const y = Math.round(((H - h) / 2) * 10) / 10;
    return `M${x} ${y}v${h}`;
  }).join('');
  const w = Math.round((peaks.length * (W + GAP) - GAP) * 10) / 10;
  /* SCALED UNIFORMLY, never stretched. `preserveAspectRatio="none"` was the
     obvious way to make it fill the panel's width and it squashes the bars and
     the gaps between them into a solid orange block the moment the box is
     narrower than the viewBox - which the rail always is. The shape keeps its
     own proportions and the height follows the width. */
  return `<svg class="aud__wave" viewBox="0 0 ${w} ${H}"`
    + ` aria-hidden="true" focusable="false">`
    + `<path class="aud__wv" d="${d}" stroke-width="${W}" stroke-linecap="round" />`
    + `<path class="aud__wv aud__wv--on" d="${d}" stroke-width="${W}" stroke-linecap="round" />`
    + `</svg>`;
}

/* `m:ss` as seconds, for `data-at`. */
const atSecs = (t) => {
  const m = /^(\d{1,3}):([0-5]\d)$/.exec(String(t || ''));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/* THE MARKER, READ ONCE. Three things now need to know what the clip is: the
   figure itself, the page's own cover picture, and the structured data that
   tells a search engine the page carries a recording. A second copy of this
   parsing is a second set of address rules to keep in step with the policy,
   which is how a hot-linked file eventually gets through one of them. */
export function parseClip(b) {
  const m = /^@\[([^\]\n]*)\]\(([^)\s|]+)(?:\|([^)\s]+))?\)$/.exec(String(b || '').trim());
  if (!m) return null;
  const dur = /#(\d{1,3}:[0-5]\d)$/.exec(m[2]);
  const src = m[2].replace(/#.*$/, '');
  const ours = src.startsWith(STORAGE)
    ? /^[\w\-./%]+$/.test(src.slice(STORAGE.length))
    : /^\/assets\/audio\/[\w\-./]+\.(?:mp3|m4a|ogg)$/i.test(src);
  if (!ours) return null;
  /* An optional portrait of whoever is speaking, after a pipe, by the same
     address rule as a photograph. */
  const face = (m[3] || '').replace(/#.*$/, '');
  const okFace = !face || (face.startsWith(STORAGE)
    ? /^[\w\-./%]+$/.test(face.slice(STORAGE.length))
    : /^\/assets\/[\w\-./]+\.(?:jpe?g|png|webp)$/i.test(face));
  if (!okFace) return null;
  const slug = src.replace(/^.*\//, '').replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^\w-]+/g, '-').slice(0, 48) || 'clip';
  return { src, face, slug, cap: m[1].trim(), ts: dur ? dur[1] : '', at: dur ? atSecs(dur[1]) : null };
}

/* The first clip in a piece of writing, which is the one the page is about. */
export const leadClip = (text) => String(text || '').split(/\n\s*\n/)
  .map((b) => parseClip(b)).find(Boolean) || null;

function clip(b, nav = {}) {
  const c = parseClip(b);
  if (!c) return '';
  const { src, face, slug, cap } = c;
  const dur = c.ts ? [null, c.ts] : null;
  const noteId = `aud-note-${slug}`;
  /* WHERE "Read what was said" GOES. The first question is where the written
     answers begin, so when the article has questions the note points straight
     at the first one and nothing has to carry a second, invisible anchor. An
     article with a clip and no questions keeps the id of its own. */
  const tranId = nav.firstId || `aud-text-${slug}`;
  const said = dur ? (() => {
    const [mm, ss] = dur[1].split(':').map(Number);
    const a = `${mm} minute${mm === 1 ? '' : 's'}`;
    return ss ? `${a} ${ss} second${ss === 1 ? '' : 's'}` : a;
  })() : '';
  /* THE LENGTH AS TYPE. It was a 0.92rem grey line under the title, which is
     where a caption goes, and the one number a reader actually weighs before
     pressing play was the quietest thing in the panel. The numeral is the
     graphic; the words after it are what a screen reader gets, said properly,
     so the digits carry `aria-hidden` rather than being read as "four sixteen". */
  const len = dur ? `<p class="aud__len">`
    + `<b class="aud__num" aria-hidden="true">${esc(dur[1])}</b>`
    + `<span class="aud__said">${esc(said)} with the manager</span></p>` : '';
  /* WHAT IS IN IT, AND WHERE. Each chapter is a LINK to the written answer, so
     with no JavaScript at all it does the useful half of its job; `sa.js`
     upgrades the press to seek the audio instead. A control that needs a script
     to do anything is a dead control, which is why these are not buttons. */
  const chapters = nav.chapters || [];
  const chs = chapters.length ? `<ul class="aud__chs">`
    + chapters.map((c) => `<li><a class="aud__ch" href="#${attr(c.id)}"`
      + `${c.at == null ? '' : ` data-at="${attr(String(c.at))}"`}>`
      + `${c.at == null ? '' : `<b class="aud__chn">${esc(c.ts)}</b>`}`
      + `<span>${inline(c.label)}</span></a></li>`).join('')
    + `</ul>` : '';
  /* THE LEADING CLIP'S PORTRAIT IS NOT A LAZY IMAGE. Moving the panel to the
     top of the page on a narrow screen made this face the first thing drawn
     and almost certainly the largest - and it was still marked `lazy`, so the
     browser deliberately waited to discover it before fetching. Lazy is right
     for a second clip further down the piece and wrong for the one the page
     opens on, which is a fact about position rather than about audio. */
  const lead = nav.lead !== false;
  return `<figure class="aud" id="listen-${attr(slug)}">`
    + (face ? `<img class="aud__face" src="${attr(face)}" alt="" width="320" height="320"`
      + (lead ? ' fetchpriority="high"' : ' loading="lazy"')
      + ` decoding="async" />` : '')
    + `<div class="aud__body">`
    + `<p class="aud__kind">Listen</p>`
    /* NOT A HEADING. It names the clip, it does not open a section, and the
       article's own Q&A headings are h2 - so an h3 here skipped a level
       straight from the headline, which the suite caught. The audio element
       already carries the same words as its accessible name, so nothing is
       lost by setting this as the label it is. */
    + (cap ? `<p class="aud__h">${inline(cap)}</p>` : '')
    + len
    + waveform(src)
    /* THE TRANSCRIPT IS ON THE PAGE AND NOTHING SAID SO. An accessibility
       audit called this critical and was right: every word is written out
       below, but the audio element carried no association with it, so to
       anybody who cannot hear the clip the page offered a player and no
       visible promise of an alternative. The note is a real sentence, it is
       named as the player's description, and it is a link, so it is useful
       to somebody skipping the audio as well as to somebody who cannot
       hear it. The id is derived from the file so two clips in one article
       cannot collide. */
    + `<audio class="aud__player" controls preload="none" src="${attr(src)}"`
    + ` aria-label="${attr(cap || 'Audio clip')}" aria-describedby="${attr(noteId)}"></audio>`
    /* HOW FAST. Chrome buries this in the three-dot menu, Safari and Firefox
       each put it somewhere else, and on anything spoken it is the control
       people actually reach for. Three steps rather than a slider: a slider
       is a fiddly thing to drag on a phone to arrive at a number nobody has
       an opinion about.

       BUTTONS, NOT LINKS, and that is the opposite of the chapters above it
       on purpose. A chapter has somewhere to go with the script blocked; a
       speed control has nothing to fall back to, so it is marked as the
       script's own: the stylesheet hides it and `html.js` is what shows it,
       which is this repository's standing answer to content that only works
       with a script. Hidden in CSS rather than with the `hidden` attribute,
       because that attribute says "not relevant yet" to a screen reader and
       this is simply not available. */
    + `<p class="aud__rates">`
    + `<span class="aud__rates-l">Speed</span>`
    + ['1', '1.25', '1.5'].map((r) => `<button type="button" class="aud__rate"`
      + ` data-rate="${attr(r)}" aria-pressed="${r === '1' ? 'true' : 'false'}">`
      + `${esc(r)}&#215;</button>`).join('')
    + `</p>`
    + chs
    + `<p class="aud__note" id="${attr(noteId)}">`
    /* A LINK ONLY WHERE THERE IS SOMEWHERE TO GO. An article carrying a clip
       and no questions has no anchor to offer, and a link to an id nothing
       holds lands the reader nowhere and tells them nothing - worse than the
       plain sentence, which is still true. */
    + (nav.firstId
      ? `<a href="#${attr(tranId)}">Read what was said</a> instead, or alongside.`
      : 'Every word is written out below, if you would rather read it.')
    + `</p>`
    + `</div></figure>`;
}

/* A VIDEO CLIP, a line of its own, with an optional poster after a pipe:
   `@@[caption](/assets/video/clip.mp4|/assets/video/clip.jpg#1280x720)`.

   The same thing as the audio marker above, for an interview somebody filmed
   rather than recorded, and it follows every rule that one does: our own
   addresses only, native controls, `preload="none"`, and the words still have
   to be in the article underneath.

   `playsinline` OR AN IPHONE TAKES THE PAGE OVER. Without it Safari on a phone
   throws the clip into its own fullscreen player the moment it is pressed, so
   the reader is dropped out of the article and has to find their way back.

   THE POSTER IS GIVEN, NEVER GUESSED. A video with none is a black rectangle
   with a play button, which looks like something that failed to load. The
   obvious shortcut is to swap `.mp4` for `.jpg` and hope, and a poster that
   404s is worse than none - `articleBody` cannot look at the disk, so a guess
   here could not be checked. The size is for the space held while it loads,
   the way a photograph's is.

   SELF-HOSTED, SO SIZE IS A REAL DECISION. A YouTube embed costs this
   repository nothing and the site already has a press-to-play poster for one
   (`a.mr-yt[data-yt]` in report.mjs). A file here is committed and stays in
   git history for ever. Short clips belong here; a full match does not. */
function film(b) {
  const m = /^@@\[([^\]\n]*)\]\(([^)\s|]+)(?:\|([^)\s]+))?\)$/.exec(b);
  if (!m) return '';
  const size = /#(\d{2,5})x(\d{2,5})$/.exec(m[3] || m[2]);
  const src = m[2].replace(/#.*$/, '');
  const poster = (m[3] || '').replace(/#.*$/, '');
  const ourFilm = src.startsWith(STORAGE)
    ? /^[\w\-./%]+$/.test(src.slice(STORAGE.length))
    : /^\/assets\/video\/[\w\-./]+\.(?:mp4|webm)$/i.test(src);
  if (!ourFilm) return '';
  if (poster && !(poster.startsWith(STORAGE)
    ? /^[\w\-./%]+$/.test(poster.slice(STORAGE.length))
    : /^\/assets\/[\w\-./]+\.(?:jpe?g|png|webp)$/i.test(poster))) return '';
  const cap = m[1].trim();
  return `<figure class="nw-art__film">`
    + `<video class="nw-art__video" controls playsinline preload="none"`
    + `${poster ? ` poster="${attr(poster)}"` : ''}`
    + ` width="${size ? size[1] : 1600}" height="${size ? size[2] : 900}"`
    + ` src="${attr(src)}"${cap ? ` aria-label="${attr(cap)}"` : ''}></video>`
    + `${cap ? `<figcaption>${inline(cap)}</figcaption>` : ''}`
    + `</figure>`;
}

/* A TABLE, from two markers that cannot be anything else. Rows pasted out of a
   document or a spreadsheet arrive separated by TABS, and a table typed by hand
   is written between PIPES (`| Played | 2 |`), with an optional `|---|` rule
   under the header. Every line of the paragraph has to carry the marker, so a
   stray tab in a sentence leaves the sentence alone. The first row is the
   header and the first column names its row. Cells go through `inline`, which
   escapes before anything else. */
const TABLE_RULE = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?$/;

/* A LEAGUE TABLE IS DRAWN AS THE HOME PAGE DRAWS IT. A table whose header is
   exactly Club, P, W, D, L, GF, GA, GD, Pts becomes the home page's `.tbl`:
   position, crest, played, won, goal difference and points, with the club's
   own row lit. The rows are the ones the article wrote, so a piece about
   game week two keeps game week two's table however the season moves on. A
   screen reader gets every column from the hidden table under it, the way
   the home page does it. */
const LEAGUE_HEAD = 'club|p|w|d|l|gf|ga|gd|pts';
function leagueTable(rows, badges) {
  const body = rows.slice(1).filter((r) => r[0]);
  const cols = ['Position', 'Club', 'Played', 'Won', 'Drawn', 'Lost', 'Goals for', 'Goals against', 'Goal difference', 'Points'];
  return `<div class="tbl">`
    + '<div class="tbl__row tbl__head-row" aria-hidden="true"><span class="tbl__pos">#</span><span class="tbl__club">Club</span>'
    + '<span>P</span><span>W</span><span>GD</span><span class="tbl__pts">Pts</span></div>'
    + body.map((r, i) => {
      const us = isUs(r[0]);
      /* Not a link: the club asked for the rows in an article to be plain. */
      return `<div class="tbl__row${us ? ' tbl__row--us' : i === 1 ? ' tbl__row--runner' : ''}" aria-hidden="true">`
        + `<span class="tbl__pos">${i + 1}</span><span class="tbl__club">${us
          /* The orange and black crest with no star, at the club's request. */
          ? '<img src="/assets/badge/sue-angels-badge-orange.webp" alt="" width="26" height="26" loading="lazy" decoding="async" />'
          : oppBadge(r[0], badges, 26, 26)}${inline(r[0])}</span>`
        + `<span>${inline(r[1] || '')}</span><span>${inline(r[2] || '')}</span><span>${inline(r[7] || '')}</span>`
        + `<b class="tbl__pts">${inline(r[8] || '')}</b></div>`;
    }).join('')
    + '</div>'
    + `<table class="sr-only"><thead><tr>${cols.map((c) => `<th scope="col">${c}</th>`).join('')}</tr></thead>`
    + `<tbody>${body.map((r, i) => `<tr><td>${i + 1}</td><th scope="row">${inline(r[0])}</th>${r.slice(1, 9)
      .map((c) => `<td>${inline(c || '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function table(lines, opts = {}) {
  const tabbed = lines.every((l) => l.includes('\t'));
  const piped = lines.every((l) => /^\|.*\|$/.test(l));
  if (lines.length < 2 || (!tabbed && !piped)) return '';
  const rows = lines.filter((l) => !TABLE_RULE.test(l))
    .map((l) => (tabbed ? l.split('\t') : l.slice(1, -1).split('|')).map((c) => c.trim()));
  if (rows.length < 2) return '';
  if (opts.badges && rows[0].map((c) => c.toLowerCase()).join('|') === LEAGUE_HEAD) return leagueTable(rows, opts.badges);
  const width = Math.max(...rows.map((r) => r.length));
  const full = (r) => [...r, ...Array(width - r.length).fill('')];
  const [head, ...body] = rows;
  /* A COLUMN HEADED "Club" WEARS THE CRESTS, when the page passes the crest
     registry: the club's own orange crest for the Angels, the registry's badge
     for anyone else, and nothing for a club with no badge rather than a guess.
     Named like every crest on the site: verbose beside the name, never wrong. */
  const clubCol = opts.badges ? full(head).findIndex((c) => c.trim().toLowerCase() === 'club') : -1;
  const crest = (name) => {
    if (!name.trim()) return '';
    const src = isUs(name) ? '/assets/badge/sue-angels-badge-orange.webp' : oppBadgeSrc(name, opts.badges);
    return src ? `<img class="nw-art__crest" src="${attr(src)}" alt="${attr(`${name.trim()} club crest`)}" width="22" height="22" loading="lazy" decoding="async" />` : '';
  };
  const cell = (c, i) => (i === clubCol ? `<span class="nw-art__club">${crest(c)}${inline(c)}</span>` : inline(c));
  return `<div class="nw-art__table"><table>`
    + `<thead><tr>${full(head).map((c) => `<th scope="col">${inline(c)}</th>`).join('')}</tr></thead>`
    + `<tbody>${body.map((r) => `<tr>${full(r).map((c, i) => (i === 0
      ? `<th scope="row">${cell(c, i)}</th>` : `<td>${cell(c, i)}</td>`)).join('')}</tr>`).join('')}</tbody>`
    + '</table></div>';
}

/* `opts.badges` is the crest registry: given it, a league-shaped table is
   drawn as the home page's table; without it, as any other table. */
/* ==========================================================================
   A FIGURE THE SITE ALREADY KNOWS, dropped into the prose: `++[26/27]`.

   A manager saying "four games, four wins" is worth more with the record
   beside it, and the one thing this repository will not do is let somebody
   type that record into an article. Every published figure is derived in
   `stats.mjs` from match records, so the marker names a SEASON and the plate
   is counted at build time from that season's competitive matches. It is right
   the day it is written and still right after the next game.

   COMPETITIVE ONLY, like every other published team figure, so a pre-season
   friendly cannot flatter it.

   NO SEASON, NO PLATE. An unknown name, a season with nothing played, or a
   render with no dataset leaves the marker as the text it is, which is how
   every other marker in this file fails: the writer sees it did not work
   rather than the page shipping a heading over a hole.
   ========================================================================== */
function statPlate(b, d, on) {
  const m = /^\+\+\[([^\]\n]{1,24})\]$/.exec(b.trim());
  if (!m || !d) return '';
  const name = m[1].trim();
  /* ---- COUNTED AS AT THE DAY THE PIECE WAS WRITTEN -----------------------

     The first version counted every competitive match on the record, which on
     an article published BEFORE a game silently absorbs that game's result.
     The pre-match interview opens with the manager saying "four games, four
     wins" and the plate under it read five and five, because the cup tie he
     was about to play had since been won. A figure that contradicts the
     sentence it was put there to support is worse than no figure.

     A piece of writing is a thing said on a day. So the plate is the record on
     that day, it matches the words around it, and unlike the first version it
     never moves again. */
  const cut = (on || '').slice(0, 10);
  const list = (d.competitive || []).filter((x) => x.season === name && x.played
    && (!cut || String(x.iso || '').slice(0, 10) <= cut));
  if (!list.length) return '';
  const s = teamSummary(list);
  const cells = [
    ['Played', s.played], ['Won', s.won], ['Drawn', s.drawn], ['Lost', s.lost],
    ['For', s.goalsFor], ['Against', s.goalsAgainst],
  ];
  /* THE SEASON, NOT THE DIVISION. This plate counts every COMPETITIVE match,
     which is the league and the cups together, so heading it "League Eight"
     labelled a cup run as league football - a figure captioned with the name
     of a competition it is not confined to. The honest caption is the season,
     and the line under it already says which matches are in it.

     Not a style fix: a reader comparing these six numbers with the league
     table would have found they disagreed, and the caption would have been
     the reason why. */
  /* A FIGURE, NOT AN `<aside>`. An aside is a complementary landmark, and one
     nested inside the article's section is the exact defect an accessibility
     audit found on this site before - content a reader can jump to that turns
     out to be four numbers mid-sentence. A figure with a caption is what this
     is: self-contained, referred to from the text around it, and no landmark
     at all. The caption is the heading rather than an `aria-label`, because a
     figure takes its accessible name from its own caption. */
  return `<figure class="qa__plate">`
    + `<figcaption class="qa__plate-h">${esc(name)} season</figcaption>`
    + `<dl class="qa__fig">${cells.map(([k, v]) => `<div>`
      + `<dt>${esc(k)}</dt><dd>${esc(String(v))}</dd></div>`).join('')}</dl>`
    /* AND THE DAY IS PRINTED, because six numbers beside a quotation are read
       as the record at the time of speaking, and now they are - so the page
       should say which day it means rather than leave the reader to assume. */
    + `<p class="qa__plate-f">League and cup${cut ? `, to ${esc(fmtDate(cut))}` : ''}</p>`
    + `</figure>`;
}

/* A QUESTION LINE, parsed once so the pre-pass and the render cannot disagree.
   `?? 0:42 | Where to improve | We have scored 20 goals...?`
   Both middle parts are optional and the order is fixed: the time, then a
   short label for the chapter list, then the question itself.

   THE LABEL HAS TO BE SHORT TO BE ONE. A question containing a pipe would
   otherwise have its first clause taken as a chapter heading, so anything
   over forty characters is read as part of the question, pipe and all. */
const askedAt = (b) => {
  let t = b.replace(/^\?\?\s*/, '');
  const ts = /^(\d{1,3}:[0-5]\d)\s*\|?\s*/.exec(t);
  if (ts) t = t.slice(ts[0].length);
  let label = '';
  const bar = t.indexOf('|');
  if (bar > 0 && bar <= 40) {
    label = t.slice(0, bar).trim();
    t = t.slice(bar + 1).trim();
  }
  return { ts: ts ? ts[1] : '', at: ts ? atSecs(ts[1]) : null, label, q: t };
};

export function articleBody(text, opts = {}) {
  const blocks = String(text || '').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  /* `#` and `##` are a heading, `###` a sub-heading under it. A sub-heading
     with no heading above it is still an h2, styled smaller, because an h3
     straight after the headline skips a level. */
  let underHeading = false;
  /* AN INTERVIEW IS A SEQUENCE OF QUESTIONS, so `??` marks one and every
     paragraph after it is that answer until the next question, the next
     heading, or anything that is plainly not prose. The club writes these
     now that the audio exists, and the alternative was styling `##` headings
     differently when the article happens to contain a clip - which is the
     page guessing at intent from unrelated evidence.

     THE ANSWER IS THE CONTENT AND THE QUESTION IS SCAFFOLDING. The first
     version of this page had it the other way round: the interviewer's
     questions large and white, the manager's words small and grey. On a page
     of somebody's words, their words should be the biggest thing on it. */
  let inAnswer = false;
  let clipAnchor = '';
  let clipN = 0;
  /* ---- WHAT IS IN THE RECORDING, WORKED OUT BEFORE ANYTHING IS WRITTEN ----

     The chapter list belongs in the audio panel, and the panel is rendered
     before the questions it lists. So the questions are read in a pass of
     their own first and handed to `clip()`. A pre-pass rather than a second
     band under the player, because what is in a recording is a fact about the
     recording and reads as furniture anywhere else.

     ONLY QUESTIONS THAT CARRY BOTH A TIME AND A LABEL. A chapter with no
     timestamp cannot seek and a chapter with no label would have to be named
     by guessing at the question's first few words, which is this file's
     commonest mistake wearing a new hat. */
  const asks = blocks.filter((b) => /^\?\?\s/.test(b)).map((b, i) => ({
    ...askedAt(b), id: `qa-${i + 1}`,
  }));
  const chapters = asks.filter((a) => a.at != null && a.label);
  let qi = 0;
  return blocks.map((b) => {
    const fig = photo(b);
    if (fig) return fig;
    const aud = clip(b, { chapters, firstId: asks.length ? asks[0].id : '', lead: !clipN });
    if (aud) {
      const anc = /<figure class="aud" id="(listen-[\w-]+)"/.exec(aud);
      if (anc) [, clipAnchor] = anc;
      clipN += 1;
      return aud;
    }
    const vid = film(b);
    if (vid) return vid;
    const plate = statPlate(b, opts.d, opts.on);
    if (plate) { inAnswer = false; return plate; }
    if (/^\?\?\s/.test(b)) {
      inAnswer = true;
      const a = asks[qi] || askedAt(b);
      qi += 1;
      /* THE TIME IS A LINK, AND IT WORKS WITH THE SCRIPT BLOCKED. It points at
         the player, so the useful half of pressing it (take me to the audio)
         needs nothing; `sa.js` upgrades the press to seek to this answer. The
         digits are hidden from a screen reader and the link is named in words,
         because "0:42" read aloud in a sentence of prose is noise. */
      const t = a.at == null || !clipAnchor ? '' : `<a class="qa__t" href="#${attr(clipAnchor)}"`
        + ` data-at="${attr(String(a.at))}"`
        + ` aria-label="${attr(`Play this answer, ${a.ts}`)}">`
        + `<i aria-hidden="true">${esc(a.ts)}</i></a>`;
      return `<p class="qa__q" id="${attr(a.id)}"`
        + `${a.at == null ? '' : ` data-at="${attr(String(a.at))}"`}>`
        + `${t}<span class="qa__qt">${inline(a.q)}</span></p>`;
    }
    /* A PULL QUOTE, `>` at the start of a line, for the one sentence worth
       stopping on. It is a quotation of somebody, so it is a blockquote. */
    if (/^>\s/.test(b)) {
      inAnswer = false;
      let q = b.split('\n').map((l) => l.replace(/^>\s*/, '').trim()).join(' ');
      /* A PULL QUOTE CAN CARRY THE SECOND HE SAID IT (`> 2:18 the words`),
         the same shape the questions take. It is the hook of the piece and it
         was the one large thing on the page that did nothing.

         THE QUOTE IS NOT THE LINK. Wrapping three lines of display type in an
         anchor makes the loudest thing on the page one enormous target and
         underlines a sentence that is meant to be read, so the control is a
         short line under it saying what it does. Like every other control in
         this block it is a link to the player first and a seek second. */
      const qt = /^(\d{1,3}:[0-5]\d)\s+/.exec(q);
      if (qt) q = q.slice(qt[0].length);
      const at = qt ? atSecs(qt[1]) : null;
      const hear = at == null || !clipAnchor ? '' : `<a class="qa__hear"`
        + ` href="#${attr(clipAnchor)}" data-at="${attr(String(at))}">`
        + `Hear him say it <i aria-hidden="true">${esc(qt[1])}</i></a>`;
      return `<blockquote class="qa__pull"${at == null ? '' : ` data-at="${attr(String(at))}"`}>`
        + `${inline(q)}${hear}</blockquote>`;
    }
    if (/^#{1,6}\s/.test(b)) {
      inAnswer = false;
      const words = inline(b.replace(/^#{1,6}\s*/, ''));
      const sub = b.match(/^#+/)[0].length >= 3;
      if (sub && underHeading) return `<h3 class="nw-art__sub">${words}</h3>`;
      underHeading = true;
      return `<h2 class="nw-art__h${sub ? ' nw-art__h--sub' : ''}">${words}</h2>`;
    }
    const tbl = table(b.split('\n').map((l) => l.replace(/^ +| +$/g, '')).filter((l) => l.trim()), opts);
    if (tbl) return tbl;
    const lines = b.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > 1 && lines.every((l) => /^[-*·•]\s+/.test(l))) {
      return `<ul class="nw-art__list">${lines
        .map((l) => `<li>${inline(l.replace(/^[-*·•]\s+/, ''))}</li>`).join('')}</ul>`;
    }
    /* ONE MARKER, ONE MEANING. A first version also promoted a line that was
       entirely bold to a heading, which read well for "FIXTURE" and turned
       "Played 18. Won 18. Fifty-four points from a possible 54." into a
       section title. A rule that guesses which emphasised lines are really
       headings will guess wrong on somebody's copy, so `##` is the heading and
       `**` is bold, everywhere, with no cleverness in between. */
    return `<p${inAnswer ? ' class="qa__a"' : ''}>${lines.map((l) => inline(l)).join('<br />')}</p>`;
  }).join('\n        ');
}

export const articleSlug = (a) => a.slug || slugify(a.title);

/* The stored category is a short key; this is what a reader sees. "Club" on
   its own said nothing about what the piece was, so it reads as what these
   actually are: retirements, appointments, announcements from the club. */
const CATEGORY_LABEL = { Club: 'Club announcement', Interview: 'Interview' };
/* A CHIP NAMES A GROUP OF PIECES, an eyebrow names one, so the chip is plural
   where the plural is not simply the label with an s on the end of it. */
const CATEGORY_CHIP = { Interview: 'Interviews' };
export const catLabel = (c) => CATEGORY_LABEL[c] || c || 'News';
const catChip = (c) => CATEGORY_CHIP[c] || catLabel(c);

/* Reading time from the actual text. Rounded up so a short piece never reads
   "0 min". 200 words a minute is the usual working figure. */
const readingTime = (text) => Math.max(1, Math.round(String(text || '').trim().split(/\s+/).length / 200));

const sorted = (articles) => articles.slice()
  .sort((a, b) => String(b.iso || b.date || '').localeCompare(String(a.iso || a.date || '')));

/* ==========================================================================
   THE INDEX
   ========================================================================== */
/* A played match that carries a written report becomes a feed entry. It is
   shaped like an article so one card renderer serves both, and it keeps its
   own href into the match page rather than a /news/ URL. */
const reportEntries = (d) => (d.played || [])
  .filter(hasReport)
  .map((m) => ({
    isReport: true,
    id: m.id,
    href: `/matches/${m.id}.html`,
    title: `${m.home} ${m.scoreline || 'v'} ${m.away}`,
    category: 'Report',
    date: m.date,
    iso: m.iso,
    /* The published article, not the coach's bullets. A leading markdown
       heading is dropped because the card draws its own title from the
       scoreline. */
    lede: reportText(m).replace(/^#+[^\n]*\n+/, ''),
    /* A report's stored cover lives on the match record, not beside it, so it
       is lifted here and the card can ask one question of both shapes. */
    cover: (m.detail || {}).cover || '',
    match: m,
  }));

/* THE CARD THE BUILD ALREADY DREW.

   43 of these are committed under assets/covers and every one of them was
   being used as a share image and shown nowhere on the site. A report's card
   drew a bare scoreline on an empty plate while a picture of both badges, the
   score, the competition and the date sat on disk beside it.

   Order is the same three states the dashboard counts and for the same
   reason: a real photograph or a card drawn in the panel is STORED and always
   wins, the build's card is DRAWN, and neither means the plate. A match
   published from the panel has no drawn card until somebody runs
   `npm run covers`, so the plate has to remain rather than leaving a hole. */
const drawnFor = (d, a) => (d.drawnCoverSrc
  ? d.drawnCoverSrc(a.isReport ? a.match.id : `a-${articleSlug(a)}`)
  : '');

/* AN ARTICLE'S PHOTOGRAPH, if it has a real one. A card the panel drew
   (cover-news-*, cover-match-*) is a picture of a headline, category baked in,
   so on the site it gives way to the plate drawn in markup, which follows the
   record; it is still what a shared link shows. */
export const articlePhoto = (a) => {
  const c = a.cover && a.cover !== 'None' ? a.cover : '';
  return c && !/\/cover-(?:news|match)-\d+\.jpg$/.test(c) ? c : '';
};

/* THE DEFAULT COVER FOR AN INTERVIEW: the face of whoever is talking and how
   long they talk for.

   ONE DEFINITION, TWO PLACES. The article page had this and the news feed did
   not, so the same piece was a portrait on its own page and a drawn headline
   plate in the list that links to it - the one card a reader sees FIRST being
   the one that says least about what the piece is. A reader should recognise
   the thing they clicked.

   `eager` is the only difference between the two: on the article's own page
   this is the hero, and in a feed of a dozen cards it is not. */
function ivCover(c, eager) {
  return `<img class="nw-cover__img nw-cover__face" src="${attr(c.face)}" alt=""`
    + ` width="1200" height="630"`
    + (eager ? ' fetchpriority="high"' : ' loading="lazy"')
    + ` decoding="async" />`
    /* A SPAN, NOT A PARAGRAPH. The news card wraps its whole cover in an `<a>`,
       and an anchor is phrasing content: a `<p>` inside one is invalid and the
       browser closes the link early, so the rest of the card stops being part
       of it. The same markup is used in two places, so it has to be legal in
       the stricter of them. */
    + `<span class="nw-cover__listen"><span>Listen</span>`
    + (c.ts ? `<b>${esc(c.ts)}</b>` : '') + `</span>`;
}

/* ---- WHAT KIND OF PIECE IT IS, DERIVED ---------------------------------

   An interview is an article carrying a recording, which the writing already
   says. Asking the club to ALSO pick a category for it would be a second
   source for one fact and the two would disagree the first time somebody
   forgot - the rule this repository keeps relearning. So the kind is read
   from the piece, and the stored category still decides everything else. */
export const articleKind = (a) => (!a.isReport && leadClip(a.lede) ? 'Interview' : a.category);

export function news(d) {
  const items = sorted([...(d.articles || []), ...reportEntries(d)]);
  const cats = [...new Set(items.map((a) => articleKind(a)).filter(Boolean))];
  const lead = items[0];
  const rest = items.slice(1);

  const card = (a, cls = '') => {
    const words = readingTime(a.lede);
    const href = a.isReport ? a.href : `/news/${articleSlug(a)}.html`;
    return `<li class="nw-card${cls ? ` ${cls}` : ''}${a.isReport ? ' is-report' : ''}" data-cat="${attr(slugify(articleKind(a) || 'news'))}">
            <a class="nw-card__link" href="${attr(href)}">
              ${(() => {
    /* THE DRAWN CARD ALREADY CARRIES THE CHIP AND THE DATE.

       It is composed with the category top-left and the date bottom-left, in
       the same two corners this card overlays its own - so laying them on top
       printed each one twice, a few pixels apart, which reads as a rendering
       fault rather than a label.

       A STORED photograph carries neither, so it keeps both. The distinction
       is what the picture IS, not whether there is one. */
    /* An article without a real photograph gets the plate in markup (see
       coverPlate); a report keeps its drawn scoreline card. */
    const stored = a.isReport ? (a.cover && a.cover !== 'None' ? a.cover : '') : articlePhoto(a);
    const drawn = stored || !a.isReport ? '' : drawnFor(d, a);
    const src = stored || drawn;
    /* A card the PANEL drew is stored like a photograph and composed like the
       build's: `ensure()` uploads it as cover-match-* or cover-news-* with the
       competition, the score and the date already on it. Asking only whether
       the build drew it printed the Three Little Birds report's date twice. */
    const composed = a.isReport ? (!!drawn || /\/cover-(?:match|news)-\d+\.jpg$/.test(stored)) : !stored;
    /* THE FEED IS ONE SHAPE. An interview was given the speaker's photograph
       here as well as on its own page, and in a grid of plates and scorelines
       it read as a different sort of object rather than as a different sort of
       article. The plate carries the difference in words - the eyebrow says
       Interview and the corner says how long - which is what the other kinds
       do. The portrait is still the cover on the piece's own page, where it
       has the room to be a photograph of somebody. */
    const body = src
      ? `<img class="nw-card__img" src="${attr(src)}" alt="" width="1200" height="630" loading="lazy" decoding="async" />`
      : a.isReport
        ? `<span class="nw-card__score"><b>${esc(a.match.scoreline || 'v')}</b><i>${esc(a.match.competition)}${a.match.round ? ` · ${esc(a.match.round)}` : ''}</i></span>`
        : coverPlate(a, false);
    return `<span class="nw-card__top${src || !a.isReport ? ' has-img' : ''}">
                ${composed ? '' : `<span class="nw-card__cat">${esc(catLabel(a.category))}</span>`}
                ${body}
                ${composed ? '' : `<span class="nw-card__date">${esc(fmtDate(a.date))}</span>`}`;
  })()}
              </span>
              <span class="nw-card__body">
                <b class="nw-card__title">${esc(a.title)}</b>
                <span class="nw-card__lede">${esc(plainText(a.lede).replace(/\s+/g, ' ').slice(0, 150))}…</span>
                <span class="nw-card__meta">${esc(fmtDate(a.date))} · ${esc(words)} min read</span>
              </span>
            </a>
          </li>`;
  };

  const hero = `<section class="nw-hero" aria-labelledby="nw-h">
      <div class="wrap">
        <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> The latest</p>
        <h1 class="nw-hero__title" id="nw-h">Club news<span class="volt">.</span></h1>
        <p class="nw-hero__lede">Announcements, award nights and the moments worth writing down,
          from ${esc(CLUB.short)}.</p>
      </div>
    </section>`;

  const feed = items.length ? `<section class="sec nw-feed" id="feed" aria-labelledby="nw-f-h">
      <div class="wrap">
        ${rail(1, 'Everything', `${items.length} article${items.length === 1 ? '' : 's'}`)}
        <h2 class="h2 rv" id="nw-f-h">Straight from the <span class="volt">club.</span></h2>
        ${cats.length > 1 ? `<div class="lg-chiprow rv" role="tablist" aria-label="Category" data-news-tabs>
          <a class="lg-chip is-on" role="tab" href="#feed" aria-selected="true" data-news="all">All <b>${esc(items.length)}</b></a>
          ${cats.map((c) => `<a class="lg-chip" role="tab" href="#feed" aria-selected="false" data-news="${attr(slugify(c))}">${esc(catChip(c))} <b>${esc(items.filter((a) => articleKind(a) === c).length)}</b></a>`).join('\n          ')}
        </div>` : ''}
        <ul class="nw-grid rv">
          ${lead ? card(lead, 'is-lead') : ''}
          ${rest.map((a) => card(a)).join('\n          ')}
        </ul>
      </div>
    </section>` : `<section class="sec nw-feed"><div class="wrap">
        <p class="nw-empty">No articles have been published yet.</p>
      </div></section>`;

  const ctaBand = `<section class="sec sec--cta nw-cta" aria-labelledby="nw-cta-h">
      <div class="wrap">
        <div class="cta2">
          <span class="cta2__glow" aria-hidden="true"></span>
          <img class="cta2__badge" src="${STAR}" alt="Sue’s Angels FC star" width="500" height="620" loading="lazy" decoding="async" aria-hidden="true" />
          <div class="cta2__glass glassbox rv">
            <p class="eyebrow cta2__eyebrow">The team sheet</p>
            <h2 class="h2" id="nw-cta-h">Never miss a <span class="volt">word.</span></h2>
            <p class="cta2__sub">Fixtures, results and club news by email. We keep it rare.</p>
            <div class="cta2__btns">
              <a class="btn btn--volt" href="/#newsletter">Join the list ${ARROW}</a>
              <a class="btn btn--ghost" href="/results.html">Every result</a>
            </div>
          </div>
        </div>
      </div>
    </section>`;

  return {
    css: 'home.css',
    shell: 'home',
    bodyClass: 'is-home is-sub is-news',
    preMain: sitePreMain(),
    footerHtml: siteFooter(),
    body: siteHeader('/news.html') + hero + feed + ctaBand,
    schema: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `Club news · ${CLUB.name}`,
      description: `Announcements and club news from ${CLUB.name}.`,
      url: `${CLUB.site}/news.html`,
    }],
  };
}

/* ==========================================================================
   ONE ARTICLE
   ========================================================================== */
export function newsArticle(a, d) {
  const items = sorted(d.articles || []);
  const idx = items.findIndex((x) => articleSlug(x) === articleSlug(a));
  const more = items.filter((_, i) => i !== idx).slice(0, 3);
  const words = readingTime(a.lede);

  /* What the piece is built round, if anything: read from the writing before
     the page is assembled, because the cover, the body and the structured
     data all need the same answer. */
  const ivc = leadClip(a.lede);

  const hero = `<section class="nw-art__hero" aria-labelledby="na-h">
      <div class="wrap wrap--narrow">
        <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> ${esc(catLabel(articleKind(a)))}</p>
        <h1 class="nw-art__title" id="na-h">${esc(a.title)}</h1>
        <p class="nw-art__meta">${esc(fmtDate(a.date, { long: true }))} · ${esc(words)} min read${a.author ? ` · ${esc(a.author)}` : ''}</p>
        <div class="nw-cover has-img${ivc ? ' nw-cover--iv' : ''}">${(() => {
    /* A real photograph, or the plate drawn in markup; eager because this is
       the page's own hero rather than something below the fold. */
    const src = articlePhoto(a);
    if (src) {
      return `<img class="nw-cover__img" src="${attr(src)}" alt="" width="1200" height="630" fetchpriority="high" decoding="async" />`;
    }
    /* AN INTERVIEW'S COVER IS THE PERSON, NOT THE HEADLINE AGAIN. With no
       photograph on the record the drawn plate renders, and its content is the
       category, the headline and the date - printed directly under an `<h1>`
       saying the identical words in the identical face. Two headlines, one
       above the other, is what this page actually shipped.

       Where the piece carries a recording there is something better to put
       there and it is already on the record: the face of whoever is talking
       and how long they talk for. The headline comes off it entirely, because
       the h1 three lines above has already said it. */
    if (ivc && ivc.face) return ivCover(ivc, true);
    return coverPlate(a, true);
  })()}</div>
      </div>
    </section>`;

  /* ---- AN INTERVIEW IS A DIFFERENT SHAPE OF PAGE ------------------------

     A piece built round a recording wants the player kept in view and the
     answers given a column of their own; every other article wants one
     centred measure and would look off-centre in a two-column grid with an
     empty rail. So the layout is a modifier, and what sets it is the markup
     that came out rather than a flag somebody has to remember: an article
     that rendered a clip or a question gets the rail, and nothing else does.

     Asked of the rendered HTML, not of the source text, so the two can never
     disagree about whether a marker actually worked. */
  /* The day the piece was published, so a figure inside it is counted as at
     that day rather than as at the next deploy. */
  const written = articleBody(a.lede, { badges: d.badges, d, on: a.iso || toISO(a.date) });
  const isIv = /class="aud"|class="qa__q"/.test(written);

  /* ---- THE RAIL IS A REAL ELEMENT, because a grid row is not a column -----

     The obvious version of this leaves the figure where the writer put it and
     gives it `grid-column: 2; grid-row: 1 / -1`, and that silently does not
     work: negative grid lines count from the end of the EXPLICIT grid, there
     are no explicit rows here, so `-1` resolves to line 1 and the panel
     occupies row one alone. Row one is then as tall as the panel, the prose
     after the first paragraph starts underneath it, and the page ships with
     seven hundred pixels of empty column beside the thing it is about. It
     looks like a layout that failed rather than a line of CSS that did.

     So the figure is lifted into a rail of its own and the prose into a
     column of its own, which makes the grid two items in one row and gives
     the sticky panel the whole article to travel through.

     THE PANEL GOES FIRST, and that is a decision about the narrow screen
     rather than about the grid. With no second column the rail renders where
     it sits in the document, and on a page whose subject is a recording the
     recording belongs at the top: headline, the man talking, then his words.
     The alternative - the rail last - would park the player under the final
     answer on every phone.

     Lifted by matching the figure, not by rebuilding it. The audio figure has
     no nested `</figure>`, so this takes exactly one block and leaves the rest
     of the article untouched. */
  const audOne = /<figure class="aud"[\s\S]*?<\/figure>/.exec(written);
  const railed = isIv && audOne;
  const railHtml = railed ? `<div class="nw-art__rail">${audOne[0]}</div>` : '';
  const prose = railed ? written.replace(audOne[0], '') : written;

  const body = `<section class="sec nw-art" aria-label="Article">
      <div class="wrap wrap--narrow${isIv ? ' wrap--iv' : ''}">
        <div class="nw-art__body${isIv ? ' nw-art__body--iv' : ''} rv">
        ${railHtml}${railed ? '<div class="nw-art__col">' : ''}
        ${prose}
        ${railed ? '</div>' : ''}</div>
        <p class="nw-art__back"><a href="/news.html">${ARROW} All club news</a></p>
      </div>
    </section>`;

  const moreBand = more.length ? `<section class="sec nw-more" aria-labelledby="na-m-h">
      <div class="wrap">
        ${rail(2, 'Keep reading', `${more.length} more`)}
        <h2 class="h2 rv" id="na-m-h">More from the <span class="volt">club.</span></h2>
        <ul class="nw-grid rv">
          ${more.map((m) => `<li class="nw-card">
            <a class="nw-card__link" href="/news/${attr(articleSlug(m))}.html">
              <span class="nw-card__top">
                <span class="nw-card__cat">${esc(catLabel(m.category))}</span>
                <img class="nw-card__crest" src="${STAR}" alt="Sue’s Angels FC star" width="76" height="94" loading="lazy" decoding="async" />
                <span class="nw-card__date">${esc(fmtDate(m.date))}</span>
              </span>
              <span class="nw-card__body">
                <b class="nw-card__title">${esc(m.title)}</b>
                <span class="nw-card__meta">${esc(fmtDate(m.date))} · ${esc(readingTime(m.lede))} min read</span>
              </span>
            </a>
          </li>`).join('\n          ')}
        </ul>
      </div>
    </section>` : '';

  return {
    css: 'home.css',
    shell: 'home',
    bodyClass: 'is-home is-sub is-news is-article',
    preMain: sitePreMain(),
    footerHtml: siteFooter(),
    body: siteHeader('/news.html') + hero + body + moreBand,
    schema: [
      {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: a.title,
        datePublished: a.iso || undefined,
        /* By reference, not by value. The club is one node in the page graph
           with a stable @id, so an article says "written by that club" rather
           than describing a second, thinner organisation that a crawler has
           to guess is the same one. */
        author: { '@id': CLUB_ID },
        publisher: { '@id': CLUB_ID },
        mainEntityOfPage: { '@id': `${CLUB.site}/news/${articleSlug(a)}.html#webpage` },
        /* ---- THE PAGE SAYS IT CARRIES A RECORDING ---------------------

           The article shipped as a `NewsArticle` and its structured data did
           not mention the audio at all, so to anything reading the page
           mechanically this was a page of text that happened to have a player
           on it. An `AudioObject` is how a search engine is told otherwise,
           and it is free: every field here is already on the record.

           `duration` is ISO 8601, which is what the vocabulary asks for -
           "4:16" is a thing people read and `PT4M16S` is the same fact in the
           form a machine takes. `transcript` is a claim worth making because
           it is true: every word is written out on this page, which is the
           same promise the player's own note makes to a reader. */
        ...(ivc ? {
          audio: {
            '@type': 'AudioObject',
            name: ivc.cap || a.title,
            contentUrl: `${CLUB.site}${ivc.src}`,
            encodingFormat: /\.mp3$/i.test(ivc.src) ? 'audio/mpeg' : undefined,
            ...(ivc.at ? { duration: `PT${Math.floor(ivc.at / 60)}M${ivc.at % 60}S` } : {}),
            ...(ivc.face ? { thumbnailUrl: `${CLUB.site}${ivc.face}` } : {}),
            uploadDate: a.iso || undefined,
            transcript: plainText(a.lede).slice(0, 4000),
            isAccessibleForFree: true,
          },
        } : {}),
      },
      /* No BreadcrumbList here: build.mjs already adds one for this route, and
         it includes Home. Two on a page is one too many. */
    ],
  };
}
