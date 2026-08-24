/* ==========================================================================
   CLUB VIDEOS  (/videos.html, under Media)

   Goals, highlights and clips.

   There is no video row anywhere in the club's records: no video table, no
   YouTube id against any match, nothing in the blob store. So this page does
   not pretend to have a catalogue. It says what it has, points at the channel
   that does, and is built so that the moment a video id is saved against a
   match it appears here without a change to this file.

   Interviews are NOT a category here. They belong in club news, where a piece
   of writing can sit around them, and the page says where to find them rather
   than leaving an empty tab that never fills.
   ========================================================================== */
import { esc, attr } from '../lib/html.mjs';
import { CLUB, YOUTUBE_URL } from '../lib/club.mjs';
import { fmtDate, isUs } from '../lib/stats.mjs';
import { siteFooter, sitePreMain, siteHeader, oppBadge } from './home.mjs';

const STAR = '/assets/badge/sue-angels-badge-star.webp';
const ARROW = '<span aria-hidden="true">→</span>';

/* The channel button, or a working alternative. YOUTUBE_URL is null while the
   handle is unconfirmed, and a call-to-action that 404s is worse than one that
   goes somewhere useful. */
const ytBtn = (label, fallbackHref, fallbackLabel) => (YOUTUBE_URL
  ? `<a class="btn btn--volt" href="${attr(YOUTUBE_URL)}" rel="noopener" target="_blank">${esc(label)} ${ARROW}</a>`
  : `<a class="btn btn--volt" href="${attr(fallbackHref)}">${esc(fallbackLabel)} ${ARROW}</a>`);



const shortClub = (name) => String(name || '')
  .replace(/^Sue.s Angels FC$/, "Sue's Angels")
  .replace(/\s+FC 2\.0$/, ' 2.0')
  .replace(/\s+FC$/, '');

const rail = (n, label, ref) => `<div class="xrail" aria-hidden="true">
      <span class="xrail__l"><span class="xrail__n">${esc(String(n).padStart(2, '0'))}</span><span class="xrail__t">${esc(label)}</span></span>
      <span class="xrail__r">${esc(ref)}</span>
    </div>`;

export function videos(d) {
  /* A match carries a video the moment one is saved against it. Until then
     this is empty and the page below says so honestly. */
  const clips = (d.played || [])
    .filter((m) => m.detail && m.detail.videoId)
    .map((m) => ({ m, id: m.detail.videoId }))
    .sort((a, b) => (b.m.iso || '').localeCompare(a.m.iso || ''));

  /* Albums stand in for match galleries, which is a real thing the club has a
     lot of, rather than an empty category. */
  const albums = (d.galleries || []).length;

  const hero = `<section class="lv-hero" aria-labelledby="vd-h">
      <div class="wrap">
        <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> Watch</p>
        <h1 class="lv-hero__title" id="vd-h">Club videos<span class="volt">.</span></h1>
        <p class="lv-hero__lede">Goals, highlights and clips from the season. Everything the club
          films goes to YouTube first.</p>
        <p class="lv-hero__btns">
          ${ytBtn('Open the channel', '/gallery.html', 'Matchday photographs')}
          <a class="btn btn--ghost" href="/live.html">Live matches</a>
        </p>
      </div>
    </section>`;

  const clipsBand = `<section class="sec vd-clips" aria-labelledby="vd-c-h">
      <div class="wrap">
        ${rail(1, 'Highlights', clips.length ? `${clips.length} clips` : 'On the channel')}
        <h2 class="h2 rv" id="vd-c-h">Match <span class="volt">highlights.</span></h2>
        ${clips.length ? `<ul class="lv-grid rv">
          ${clips.map(({ m, id }) => `<li class="lv-card">
            <a class="lv-card__link" href="https://www.youtube.com/watch?v=${attr(id)}" rel="noopener" target="_blank">
              <span class="lv-card__thumb">
                <img class="lv-card__crest" src="${STAR}" alt="Sue’s Angels FC star" width="76" height="94" loading="lazy" decoding="async" />
                <span class="lv-card__play" aria-hidden="true"></span>
              </span>
              <span class="lv-card__body">
                <b>${esc(shortClub(m.home))} ${esc(m.scoreline)} ${esc(shortClub(m.away))}</b>
                <span>${esc(fmtDate(m.date))} · ${esc(m.competition)}</span>
              </span>
            </a>
          </li>`).join('\n          ')}
        </ul>` : `<div class="lv-empty rv">
          <p class="lv-empty__t">Nothing is catalogued on the site yet.</p>
          <p class="lv-empty__b">No video is filed against a result in the club's records, so
            there is nothing to list here that would not be invented. What the club has filmed is
            on the YouTube channel. Save a video against a match in the control panel and it
            appears on this page and on that match's own report, with no further work.</p>
          <p class="lv-empty__btns">
            ${ytBtn('Watch on YouTube', '/results.html', 'Every result')}
            <a class="btn btn--ghost" href="/results.html">Every result</a>
          </p>
        </div>`}
      </div>
    </section>`;

  /* Two real destinations instead of two empty tabs. */
  const elsewhereBand = `<section class="sec vd-else" aria-labelledby="vd-e-h">
      <div class="wrap">
        ${rail(2, 'Also worth watching', 'Two places')}
        <h2 class="h2 rv" id="vd-e-h">The rest of it is <span class="volt">here.</span></h2>
        <ul class="vd-else__list rv">
          <li class="vd-else__card">
            <p class="vd-else__k">Matchday photography</p>
            <p class="vd-else__t">${esc(albums)} albums</p>
            <p class="vd-else__b">Six hundred photographs across the season, shot by four people
              who gave up their Sunday for it.</p>
            <p class="vd-else__go"><a href="/gallery.html">The gallery ${ARROW}</a></p>
          </li>
          <li class="vd-else__card">
            <p class="vd-else__k">Interviews</p>
            <p class="vd-else__t">In club news</p>
            <p class="vd-else__b">Interviews sit with the writing rather than in a video list, so
              there is something around them: what was said, who said it and why it mattered.</p>
            <p class="vd-else__go"><a href="/news.html">Club news ${ARROW}</a></p>
          </li>
        </ul>
      </div>
    </section>`;

  const ctaBand = `<section class="sec sec--cta vd-cta" aria-labelledby="vd-cta-h">
      <div class="wrap">
        <div class="cta2">
          <span class="cta2__glow" aria-hidden="true"></span>
          <img class="cta2__badge" src="${STAR}" alt="Sue’s Angels FC star" width="500" height="620" loading="lazy" decoding="async" aria-hidden="true" />
          <div class="cta2__glass glassbox rv">
            <p class="eyebrow cta2__eyebrow">${esc(d.divisionOf(d.nextSeason))}</p>
            <h2 class="h2" id="vd-cta-h">More of it next <span class="volt">season.</span></h2>
            <p class="cta2__sub">Subscribe and you will get the streams and the highlights as they
              go up.</p>
            <div class="cta2__btns">
              ${ytBtn('Subscribe', '/join.html', 'Join the club')}
              <a class="btn btn--ghost" href="/fixtures.html">Fixtures</a>
            </div>
          </div>
        </div>
      </div>
    </section>`;

  return {
    css: 'home.css',
    shell: 'home',
    bodyClass: 'is-home is-sub is-videos',
    preMain: sitePreMain(),
    footerHtml: siteFooter(),
    body: siteHeader('/videos.html') + hero + clipsBand + elsewhereBand + ctaBand,
    schema: [{
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Club videos · ${CLUB.name}`,
      description: `Goals, highlights and clips from ${CLUB.name}.`,
      url: `${CLUB.site}/videos.html`,
    }],
  };
}
