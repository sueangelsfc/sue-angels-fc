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
import { fmtDate, slugify, isUs } from '../lib/stats.mjs';
import { siteFooter, sitePreMain, siteHeader } from './home.mjs';
import { reportText, hasReport } from '../lib/prose.mjs';

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
const coverPlate = (art, eager) => (art.cover && art.cover !== 'None'
  ? `<img class="nw-cover__img" src="${attr(art.cover)}" alt="" width="1200" height="675" loading="${eager ? 'eager' : 'lazy'}" decoding="async" />`
  : `<span class="nw-plate">
      <img class="nw-plate__crest" src="${STAR}" alt="Sue’s Angels FC star" width="76" height="94" loading="${eager ? 'eager' : 'lazy'}" decoding="async" />
      <span class="nw-plate__rule" aria-hidden="true"></span>
      <span class="nw-plate__club">Sue’s Angels FC</span>
    </span>`);

const ARROW = '<span aria-hidden="true">→</span>';

const rail = (n, label, ref) => `<div class="xrail" aria-hidden="true">
      <span class="xrail__l"><span class="xrail__n">${esc(String(n).padStart(2, '0'))}</span><span class="xrail__t">${esc(label)}</span></span>
      <span class="xrail__r">${esc(ref)}</span>
    </div>`;

/* Articles are stored as plain text with blank lines between paragraphs, and
   occasionally a markdown heading or a bulleted list. Rendered as paragraphs
   so the text keeps its shape rather than collapsing into one block. */
export function articleBody(text) {
  const blocks = String(text || '').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return blocks.map((b) => {
    if (/^#{1,6}\s/.test(b)) {
      return `<h3 class="nw-art__h">${esc(b.replace(/^#{1,6}\s*/, ''))}</h3>`;
    }
    const lines = b.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > 1 && lines.every((l) => /^[-*·•]\s+/.test(l))) {
      return `<ul class="nw-art__list">${lines
        .map((l) => `<li>${esc(l.replace(/^[-*·•]\s+/, ''))}</li>`).join('')}</ul>`;
    }
    return `<p>${lines.map((l) => esc(l)).join('<br />')}</p>`;
  }).join('\n        ');
}

export const articleSlug = (a) => a.slug || slugify(a.title);

/* The stored category is a short key; this is what a reader sees. "Club" on
   its own said nothing about what the piece was, so it reads as what these
   actually are: retirements, appointments, announcements from the club. */
const CATEGORY_LABEL = { Club: 'Club announcement' };
export const catLabel = (c) => CATEGORY_LABEL[c] || c || 'News';

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

export function news(d) {
  const items = sorted([...(d.articles || []), ...reportEntries(d)]);
  const cats = [...new Set(items.map((a) => a.category).filter(Boolean))];
  const lead = items[0];
  const rest = items.slice(1);

  const card = (a, cls = '') => {
    const words = readingTime(a.lede);
    const href = a.isReport ? a.href : `/news/${articleSlug(a)}.html`;
    return `<li class="nw-card${cls ? ` ${cls}` : ''}${a.isReport ? ' is-report' : ''}" data-cat="${attr(slugify(a.category || 'news'))}">
            <a class="nw-card__link" href="${attr(href)}">
              ${(() => {
    /* THE DRAWN CARD ALREADY CARRIES THE CHIP AND THE DATE.

       It is composed with the category top-left and the date bottom-left, in
       the same two corners this card overlays its own - so laying them on top
       printed each one twice, a few pixels apart, which reads as a rendering
       fault rather than a label.

       A STORED photograph carries neither, so it keeps both. The distinction
       is what the picture IS, not whether there is one. */
    const stored = a.cover && a.cover !== 'None' ? a.cover : '';
    const drawn = stored ? '' : drawnFor(d, a);
    const src = stored || drawn;
    const body = src
      ? `<img class="nw-card__img" src="${attr(src)}" alt="" width="1200" height="630" loading="lazy" decoding="async" />`
      : a.isReport
        ? `<span class="nw-card__score"><b>${esc(a.match.scoreline || 'v')}</b><i>${esc(a.match.competition)}${a.match.round ? ` · ${esc(a.match.round)}` : ''}</i></span>`
        : coverPlate(a, false);
    return `<span class="nw-card__top${src ? ' has-img' : ''}">
                ${drawn ? '' : `<span class="nw-card__cat">${esc(catLabel(a.category))}</span>`}
                ${body}
                ${drawn ? '' : `<span class="nw-card__date">${esc(fmtDate(a.date))}</span>`}`;
  })()}
              </span>
              <span class="nw-card__body">
                <b class="nw-card__title">${esc(a.title)}</b>
                <span class="nw-card__lede">${esc(String(a.lede || '').replace(/\s+/g, ' ').slice(0, 150))}…</span>
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
          ${cats.map((c) => `<a class="lg-chip" role="tab" href="#feed" aria-selected="false" data-news="${attr(slugify(c))}">${esc(catLabel(c))} <b>${esc(items.filter((a) => a.category === c).length)}</b></a>`).join('\n          ')}
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

  const hero = `<section class="nw-art__hero" aria-labelledby="na-h">
      <div class="wrap wrap--narrow">
        <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> ${esc(catLabel(a.category))}</p>
        <h1 class="nw-art__title" id="na-h">${esc(a.title)}</h1>
        <p class="nw-art__meta">${esc(fmtDate(a.date, { long: true }))} · ${esc(words)} min read${a.author ? ` · ${esc(a.author)}` : ''}</p>
        <div class="nw-cover${(a.cover && a.cover !== 'None') || drawnFor(d, a) ? ' has-img' : ''}">${(() => {
    /* Same three states as the card, and eager because this one is the
       page's own hero rather than something below the fold. */
    const src = (a.cover && a.cover !== 'None') ? a.cover : drawnFor(d, a);
    return src
      ? `<img class="nw-cover__img" src="${attr(src)}" alt="" width="1200" height="630" fetchpriority="high" decoding="async" />`
      : coverPlate(a, true);
  })()}</div>
      </div>
    </section>`;

  const body = `<section class="sec nw-art" aria-label="Article">
      <div class="wrap wrap--narrow">
        <div class="nw-art__body rv">
        ${articleBody(a.lede)}
        </div>
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
      },
      /* No BreadcrumbList here: build.mjs already adds one for this route, and
         it includes Home. Two on a page is one too many. */
    ],
  };
}
