/* ==========================================================================
   404  (/404.html)

   Vercel serves this for any unmatched path on a static output, so it has to
   work from a URL at ANY depth: /nonsense, /matches/nonsense.html, anything.
   Every link and asset reference on it is therefore absolute. A relative one
   would resolve against the fake directory the visitor happened to type and
   break the page that is meant to rescue them.

   Kept deliberately short. A 404 is a signpost, not a destination, and the
   worst version of this page is one that makes somebody read.

   It does carry the latest result and the next fixture, because the most
   likely reason anybody is here is a stale or mistyped link to a match, and
   those two lines are the answer to the question they were probably asking.
   ========================================================================== */
import { esc, attr, icon } from '../lib/html.mjs';
import { CLUB } from '../lib/club.mjs';
import { fmtDate, isUs } from '../lib/stats.mjs';
import { siteFooter, sitePreMain, siteHeader } from './home.mjs';

const STAR = '/assets/badge/sue-angels-badge-star.webp';
const ARROW = '<span aria-hidden="true">→</span>';

const shortClub = (name) => String(name || '')
  .replace(/^Sue.s Angels FC$/, "Sue's Angels")
  .replace(/\s+FC 2\.0$/, ' 2.0')
  .replace(/\s+FC$/, '');

/* Where somebody who mistyped a URL most plausibly meant to go. */
const PLACES = [
  { ico: 'shield', t: 'The home page', b: 'Start again from the front.', href: '/' },
  { ico: 'trophy', t: 'Results', b: 'Every match the club has played.', href: '/results.html' },
  { ico: 'users', t: 'Squad', b: 'Every player, with their own profile.', href: '/squad.html' },
  { ico: 'chart', t: 'League table', b: 'Where the club finished, and why.', href: '/league.html' },
  { ico: 'news', t: 'Club news', b: 'Reports, announcements and interviews.', href: '/news.html' },
  { ico: 'mail', t: 'Contact', b: 'The direct line and the ground.', href: '/contact.html' },
];

export function notFound(d) {
  const played = (d.played || []).slice()
    .sort((a, b) => (b.iso || '').localeCompare(a.iso || ''));
  const last = played[0] || null;

  /* One shared answer, from dataset.mjs: fixtures whose date has not been
     and gone, soonest first. The filter here was on `m.played`, which a
     fixture row does not carry, so a match that had already happened stayed
     at the top of the list. */
  const upcoming = d.upcoming || [];
  const next = d.nextFixture || null;

  const hero = `<section class="nf-hero" aria-labelledby="nf-h">
      <div class="wrap">
        <div class="nf-hero__in">
          <img class="nf-hero__crest" src="${STAR}" alt="Sue’s Angels FC star" width="500" height="620" loading="eager" decoding="async" />
          <p class="eyebrow nf-hero__eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> Error 404</p>
          <h1 class="nf-hero__title" id="nf-h">Off target<span class="volt">.</span></h1>
          <p class="nf-hero__lede">That page does not exist. It may have moved, or the link that
            brought you here may be wrong. Everything the site has is one tap away below.</p>
          <p class="nf-hero__btns">
            <a class="btn btn--volt" href="/">Back to the home page ${ARROW}</a>
            <a class="btn btn--ghost" href="/results.html">Every result</a>
          </p>
        </div>
      </div>
    </section>`;

  /* A mistyped or stale match URL is the likeliest way to land here, so the
     two lines somebody was probably after come before the full index. */
  const scoreStrip = (last || next) ? `<section class="sec nf-strip" aria-labelledby="nf-s-h">
      <div class="wrap">
        <h2 class="nf-strip__h" id="nf-s-h">While you are here</h2>
        <ul class="nf-strip__list">
          ${last ? `<li class="nf-strip__item">
            <a href="/matches/${attr(last.id)}.html">
              <span class="nf-strip__k">Latest result</span>
              <b class="nf-strip__t">${esc(shortClub(last.home))} ${esc(last.scoreline)} ${esc(shortClub(last.away))}</b>
              <span class="nf-strip__b">${esc(fmtDate(last.date))} · ${esc(last.competition)}</span>
            </a>
          </li>` : ''}
          ${next ? `<li class="nf-strip__item">
            <a href="/fixtures.html">
              <span class="nf-strip__k">Next fixture</span>
              <b class="nf-strip__t">${esc(shortClub(next.home))} v ${esc(shortClub(next.away))}</b>
              <span class="nf-strip__b">${esc(fmtDate(next.date, { weekday: true }))}${next.kick ? ` · ${esc(next.kick)}` : ''} · ${esc(next.competition)}</span>
            </a>
          </li>` : ''}
        </ul>
      </div>
    </section>` : '';

  const placesBand = `<section class="sec nf-places" aria-labelledby="nf-p-h">
      <div class="wrap">
        <h2 class="h2 nf-places__h" id="nf-p-h">Try one of <span class="volt">these.</span></h2>
        <ul class="nf-grid">
          ${PLACES.map((p) => `<li class="nf-place">
            <a class="nf-place__link" href="${attr(p.href)}">
              <span class="nf-place__ico">${icon(p.ico, 'ico')}</span>
              <b class="nf-place__t">${esc(p.t)}</b>
              <span class="nf-place__b">${esc(p.b)}</span>
            </a>
          </li>`).join('\n          ')}
        </ul>
        <p class="nf-places__note">Still cannot find it? Email
          <a href="mailto:${attr(CLUB.email)}?subject=${attr('Broken link on the website')}">${esc(CLUB.email)}</a>
          and tell us which link sent you here. That is genuinely useful, and we will fix it.</p>
      </div>
    </section>`;

  return {
    css: 'home.css',
    shell: 'home',
    bodyClass: 'is-home is-sub is-404',
    preMain: sitePreMain(),
    footerHtml: siteFooter(),
    body: siteHeader('/404.html') + hero + scoreStrip + placesBand,
    /* No schema. A 404 is noindex, so structured data on it is pure weight. */
  };
}
