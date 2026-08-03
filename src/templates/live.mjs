/* ==========================================================================
   LIVE AND REPLAYS  (/live.html, "Live" under Media)

   The club streams to YouTube. There is no per-match embed catalogued yet,
   so this page does the two things it honestly can: point at the channel,
   and say what is coming next so the page is not a dead end.

   It states plainly that streaming is still being set up rather than showing
   an empty player, because an empty player reads as broken. When a stream id
   is stored against a fixture the embed slot below takes it without any
   change here.
   ========================================================================== */
import { esc, attr } from '../lib/html.mjs';
import { CLUB, YOUTUBE_URL } from '../lib/club.mjs';
import { fmtDate, isUs } from '../lib/stats.mjs';
import { siteFooter, sitePreMain, siteHeader, auraFor, oppBadge } from './home.mjs';

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

export function live(d) {
  /* The next fixture, so the page answers "when is there something to watch"
     rather than only "where". Fixtures are matches with no result yet. */
  /* One shared answer, from dataset.mjs: fixtures whose date has not been
     and gone, soonest first. The filter here was on `m.played`, which a
     fixture row does not carry, so a match that had already happened stayed
     at the top of the list. */
  const upcoming = d.upcoming || [];
  const next = d.nextFixture || null;

  /* Replays are per-match videos once they exist. Nothing is catalogued yet,
     so the section reports that instead of rendering an empty grid. */
  const replays = (d.played || []).filter((m) => m.detail && m.detail.videoId);

  const badge = (club) => (isUs(club)
    ? `<img class="lv-badge is-us" src="${STAR}" alt="" width="34" height="34" loading="lazy" />`
    : oppBadge(club, d.badges, 34, 34, 'lv-badge'));

  /* ================= HERO ================= */
  const hero = `<section class="lv-hero" aria-labelledby="lv-h">
      <div class="wrap">
        <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> Watch</p>
        <h1 class="lv-hero__title" id="lv-h">Live<span class="volt">.</span></h1>
        <p class="lv-hero__lede">Match streams and replays, straight from the club's YouTube
          channel. Everything is free to watch and there is nothing to sign up for.</p>
        <p class="lv-hero__btns">
          ${ytBtn('Open the channel', '/results.html', 'Every result')}
          <a class="btn btn--ghost" href="/fixtures.html">See the fixtures</a>
        </p>
      </div>
    </section>`;

  /* ================= 01 THE PLAYER SLOT ================= */
  const streamBand = `<section class="sec lv-stream" aria-labelledby="lv-s-h">
      <div class="wrap">
        ${rail(1, 'Match day', next ? fmtDate(next.date) : 'Nothing scheduled')}
        <h2 class="h2 rv" id="lv-s-h">Where the match <span class="volt">plays.</span></h2>
        <div class="lv-frame rv">
          <div class="lv-frame__inner">
            <img class="lv-frame__crest" src="${STAR}" alt="" width="120" height="148" loading="lazy" decoding="async" />
            <p class="lv-frame__k">Being set up</p>
            <p class="lv-frame__t">Live streaming is on the way.</p>
            <p class="lv-frame__b">The club is setting up live streaming on YouTube. Subscribe to
              the channel and it will tell you the moment a match goes live. Once a stream is
              running it plays in this frame, and it stays here as the full replay afterwards.</p>
            <p class="lv-frame__btns">
              ${ytBtn('Subscribe on YouTube', '/fixtures.html', 'See the fixtures')}
            </p>
          </div>
        </div>
        ${next ? `<div class="lv-next rv">
          <p class="lv-next__k">Next up</p>
          <div class="lv-next__row">
            <span class="lv-next__side">${esc(shortClub(next.home))}${badge(next.home)}</span>
            <span class="lv-next__v">v</span>
            <span class="lv-next__side is-away">${badge(next.away)}${esc(shortClub(next.away))}</span>
          </div>
          <p class="lv-next__meta">${esc(fmtDate(next.date, { weekday: true }))}${next.kick ? ` · ${esc(next.kick)}` : ''}
            · ${esc(next.competition)}${next.venue ? ` · ${esc(next.venue)}` : ''}</p>
        </div>` : ''}
      </div>
    </section>`;

  /* ================= 02 REPLAYS ================= */
  const replayBand = `<section class="sec lv-replays" aria-labelledby="lv-r-h">
      <div class="wrap">
        ${rail(2, 'Watch it back', replays.length ? `${replays.length} replays` : 'On the channel')}
        <h2 class="h2 rv" id="lv-r-h">Every match, <span class="volt">back.</span></h2>
        ${replays.length ? `<ul class="lv-grid rv">
          ${replays.map((m) => `<li class="lv-card">
            <a class="lv-card__link" href="https://www.youtube.com/watch?v=${attr(m.detail.videoId)}" rel="noopener" target="_blank">
              <span class="lv-card__thumb">
                <img class="lv-card__crest" src="${STAR}" alt="" width="76" height="94" loading="lazy" decoding="async" />
                <span class="lv-card__play" aria-hidden="true"></span>
              </span>
              <span class="lv-card__body">
                <b>${esc(shortClub(m.home))} ${esc(m.scoreline)} ${esc(shortClub(m.away))}</b>
                <span>${esc(fmtDate(m.date))} · ${esc(m.competition)}</span>
              </span>
            </a>
          </li>`).join('\n          ')}
        </ul>` : `<div class="lv-empty rv">
          <p class="lv-empty__t">No replay is catalogued on the site yet.</p>
          <p class="lv-empty__b">Anything the club has filmed is on the YouTube channel. As
            matches are catalogued against their result they will appear here, each one next to
            its own scoreline, and every result already has its own page in the meantime.</p>
          <p class="lv-empty__btns">
            ${ytBtn('Watch on YouTube', '/gallery.html', 'Matchday photographs')}
            <a class="btn btn--ghost" href="/results.html">Every result</a>
          </p>
        </div>`}
      </div>
    </section>`;

  /* ================= CTA ================= */
  const ctaBand = `<section class="sec sec--cta lv-cta" aria-labelledby="lv-cta-h">
      <div class="wrap">
        <div class="cta2">
          <span class="cta2__glow" aria-hidden="true"></span>
          <img class="cta2__badge" src="${STAR}" alt="" width="500" height="620" loading="lazy" decoding="async" aria-hidden="true" />
          <div class="cta2__glass glassbox rv">
            <p class="eyebrow cta2__eyebrow">${esc(d.divisionOf(d.nextSeason))} · ${esc(d.nextSeason)}</p>
            <h2 class="h2" id="lv-cta-h">Be there when we <span class="volt">kick off.</span></h2>
            <p class="cta2__sub">Subscribe for the streams, or come down to ${esc(CLUB.venue.shortName)}
              and watch it properly.</p>
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
    bodyClass: 'is-home is-sub is-live',
    preMain: sitePreMain(auraFor('live.html')),
    footerHtml: siteFooter(),
    body: siteHeader('/live.html') + hero + streamBand + replayBand + ctaBand,
    schema: [{
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Live and replays · ${CLUB.name}`,
      description: `Watch ${CLUB.name} matches live and on replay.`,
      url: `${CLUB.site}/live.html`,
    }],
  };
}
