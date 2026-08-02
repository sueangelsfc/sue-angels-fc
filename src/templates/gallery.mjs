/* ==========================================================================
   THE GALLERY  (/gallery.html and /gallery/<slug>.html, under Media)

   Seven matchday albums, 606 photographs, shot by four people who gave up
   their Sunday to do it. The credit is part of the album, not a footnote.

   Photographs are served from Supabase storage, which is a third-party
   origin. Each is lazy-loaded and carries explicit dimensions so a 175-photo
   album does not push the page around as it loads, and the album pages are
   linked from the index rather than dumping 606 images onto one URL.

   Album titles arrive as "Sue's Angels 4-2 BPR Men's League Ten • Matchday 10
   • 1 February 2026", which is the scoreline, the competition and the date in
   one string. It is split so the card can set the fixture large and the rest
   small rather than running one long line under a photograph.
   ========================================================================== */
import { esc, attr } from '../lib/html.mjs';
import { CLUB } from '../lib/club.mjs';
import { fmtDate, slugify } from '../lib/stats.mjs';
import { siteFooter, sitePreMain, siteHeader, auraFor } from './home.mjs';

const STAR = '/assets/badge/sue-angels-badge-star.webp';
const ARROW = '<span aria-hidden="true">→</span>';

const rail = (n, label, ref) => `<div class="xrail" aria-hidden="true">
      <span class="xrail__l"><span class="xrail__n">${esc(String(n).padStart(2, '0'))}</span><span class="xrail__t">${esc(label)}</span></span>
      <span class="xrail__r">${esc(ref)}</span>
    </div>`;

/* "Fixture • Competition • Date" or "Fixture | Competition • Date". Split on
   either separator, keep the first part as the fixture and the rest as the
   supporting line. A title with no separator stays whole. */
export function splitTitle(title) {
  const parts = String(title || '').split(/\s*[•|]\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return { fixture: String(title || ''), detail: '' };
  return { fixture: parts[0], detail: parts.slice(1).join(' · ') };
}

const photosOf = (g) => (g.photos || []).filter(Boolean);

/* The two badges of the fixture the photographs come from. Every album
   already carried homeBadge and awayBadge and nothing was using them, so a
   coverless album fell back to the crest and told you nothing about which
   match it was. They sit over the cover as well, so the fixture is readable
   before you have read the title. */
const badgePair = (g) => {
  const one = (src, cls) => {
    if (!src) return '';
    /* The stored badge for our own club is the retired lime shield. The
       rebuild's crest is the orange star, so ours is swapped rather than
       shipping the old brand next to the new one. */
    const path = /sue-angels/i.test(src) ? STAR : (src.startsWith('/') ? src : `/${src}`);
    return `<img class="gl-fix__b${cls}" src="${attr(path)}" alt="" width="34" height="34" loading="lazy" decoding="async" />`;
  };
  if (!g.homeBadge && !g.awayBadge) return '';
  return `<span class="gl-fix" aria-hidden="true">${one(g.homeBadge, '')}<i>v</i>${one(g.awayBadge, '')}</span>`;
};

/* A tag is stored EITHER as a bare name or as a record: the tagger writes
   `{ name, role }` the moment anything beyond the name is known, and collapses
   it back to a string when nothing is. Both shapes are in the database right
   now, and reading only the first is what put the literal text "[object
   Object]" under 624 photographs and into their alt text. Anything that reads
   a tag goes through here. */
export const tagName = (t) => (typeof t === 'string' ? t
  : (t && (t.name || t.player || t.label)) || '');
const isSubject = (t) => !!(t && typeof t === 'object' && t.role === 'subject');

/* An album tag is a player's name. Matched to the squad it becomes a link to
   their profile, which is the whole point of tagging someone. A name with no
   profile (a photographer, a guest) still shows, just not as a link. */
const tagLinks = (names, squad) => {
  const bySlug = new Map((squad || []).map((p) => [slugify(p.name), p]));
  return (names || []).map((t) => {
    const n = tagName(t);
    if (!n) return '';
    const p = bySlug.get(slugify(n));
    /* Who the photograph is OF, as opposed to who else is in it. The tagger
       records it and nothing showed it. */
    const sub = isSubject(t) ? ' is-subject' : '';
    return p
      ? `<a class="gl-tag${sub}" href="/players/${attr(p.slug)}.html">${esc(n)}</a>`
      : `<span class="gl-tag is-plain${sub}">${esc(n)}</span>`;
  }).filter(Boolean);
};

const sorted = (albums) => albums.slice()
  .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

/* ==========================================================================
   THE INDEX
   ========================================================================== */
export function gallery(d) {
  const albums = sorted(d.galleries || []);
  const totalPhotos = albums.reduce((n, g) => n + photosOf(g).length, 0);
  const credits = [...new Set(albums.map((g) => g.photographer).filter(Boolean))];

  const card = (g) => {
    const { fixture, detail } = splitTitle(g.title);
    const n = photosOf(g).length;
    return `<li class="gl-card">
            <a class="gl-card__link" href="/gallery/${attr(g.slug)}.html">
              <span class="gl-card__shot">
                ${g.cover
    ? `<img src="${attr(g.cover)}" alt="" width="640" height="427" loading="lazy" decoding="async" />`
    : `<img class="gl-card__crest" src="${STAR}" alt="" width="76" height="94" loading="lazy" decoding="async" />`}
                ${badgePair(g)}
                <span class="gl-card__count">${esc(n)} photo${n === 1 ? '' : 's'}</span>
              </span>
              <span class="gl-card__body">
                <b class="gl-card__fixture">${esc(fixture)}</b>
                <span class="gl-card__detail">${esc(detail)}</span>
                ${g.photographer ? `<span class="gl-card__by">Photographs by ${esc(g.photographer)}</span>` : ''}
              </span>
            </a>
          </li>`;
  };

  const hero = `<section class="gl-hero" aria-labelledby="gl-h">
      <div class="wrap">
        <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> Matchday</p>
        <h1 class="gl-hero__title" id="gl-h">The gallery<span class="volt">.</span></h1>
        <p class="gl-hero__lede">${esc(totalPhotos)} photographs across ${esc(albums.length)}
          matchdays${credits.length ? `, shot by ${esc(credits.join(', '))}` : ''}. Every one of
          them taken by someone who gave up their Sunday to do it.</p>
      </div>
    </section>`;

  const band = albums.length ? `<section class="sec gl-feed" aria-labelledby="gl-f-h">
      <div class="wrap">
        ${rail(1, 'Albums', `${totalPhotos} photographs`)}
        <h2 class="h2 rv" id="gl-f-h">Every <span class="volt">matchday.</span></h2>
        <ul class="gl-grid rv">
          ${albums.map(card).join('\n          ')}
        </ul>
      </div>
    </section>` : `<section class="sec gl-feed"><div class="wrap">
        <p class="gl-empty">No album has been published yet.</p>
      </div></section>`;

  const ctaBand = `<section class="sec sec--cta gl-cta" aria-labelledby="gl-cta-h">
      <div class="wrap">
        <div class="cta2">
          <span class="cta2__glow" aria-hidden="true"></span>
          <img class="cta2__badge" src="${STAR}" alt="" width="500" height="620" loading="lazy" decoding="async" aria-hidden="true" />
          <div class="cta2__glass glassbox rv">
            <p class="eyebrow cta2__eyebrow">Behind the lens</p>
            <h2 class="h2" id="gl-cta-h">Shot by the people who <span class="volt">turn up.</span></h2>
            <p class="cta2__sub">If you take photographs and fancy a Sunday morning at
              ${esc(CLUB.venue.shortName)}, the club would have you.</p>
            <div class="cta2__btns">
              <a class="btn btn--volt" href="mailto:${attr(CLUB.email)}">Get in touch ${ARROW}</a>
              <a class="btn btn--ghost" href="/results.html">Every result</a>
            </div>
          </div>
        </div>
      </div>
    </section>`;

  return {
    css: 'home.css',
    shell: 'home',
    bodyClass: 'is-home is-sub is-gallery',
    preMain: sitePreMain(auraFor('gallery.html')),
    footerHtml: siteFooter(),
    body: siteHeader('/gallery.html') + hero + band + ctaBand,
    schema: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `Gallery · ${CLUB.name}`,
      description: `${totalPhotos} matchday photographs from ${CLUB.name}.`,
      url: `${CLUB.site}/gallery.html`,
    }],
  };
}

/* ==========================================================================
   ONE ALBUM
   ========================================================================== */
export function galleryAlbum(g, d) {
  const photos = photosOf(g);
  const { fixture, detail } = splitTitle(g.title);
  const others = sorted(d.galleries || []).filter((x) => x.slug !== g.slug).slice(0, 3);
  const photoTags = g.photoTags || {};
  const squadTags = tagLinks(g.tags, d.squad);

  const hero = `<section class="gl-hero" aria-labelledby="ga-h">
      <div class="wrap">
        <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i>
          ${esc(g.category || 'Matchday')}${g.date ? ` · ${esc(fmtDate(g.date))}` : ''}</p>
        <h1 class="gl-album__title" id="ga-h">${esc(fixture)}</h1>
        ${detail ? `<p class="gl-album__detail">${esc(detail)}</p>` : ''}
        <p class="gl-album__meta">${esc(photos.length)} photograph${photos.length === 1 ? '' : 's'}${g.photographer ? ` · shot by ${esc(g.photographer)}` : ''}</p>
      </div>
    </section>`;

  /* A plain grid of links to the full-size file, which is what a reader with
     no script and anyone wanting to save a photograph needs, and what this
     still is. data-album lets the script enhance the same links into a viewer
     that stays on the website: following them on a phone meant landing on a
     bare image URL on the storage host with no way back and no way to reach
     the next of 175 photographs. Nothing is hidden behind the script. */
  const grid = photos.length ? `<section class="sec gl-album" aria-label="Photographs">
      <div class="wrap">
        <ul class="gl-shots" data-album>
          ${photos.map((src, i) => {
    const tagged = tagLinks(photoTags[String(i)] || [], d.squad);
    return `<li class="gl-shot${tagged.length ? ' is-tagged' : ''}">
            <a href="${attr(src)}" rel="noopener" target="_blank">
              <img src="${attr(src)}" alt="${attr(tagged.length
      ? `${fixture}: ${(photoTags[String(i)] || []).map(tagName).filter(Boolean).join(', ')}`
      : `${fixture}, photograph ${i + 1} of ${photos.length}`)}"
                width="600" height="400" loading="lazy" decoding="async" />
            </a>
            ${tagged.length ? `<span class="gl-shot__tags">${tagged.join('')}</span>` : ''}
          </li>`;
  }).join('\n          ')}
        </ul>
        ${squadTags.length ? `<div class="gl-who">
          <h2 class="gl-who__h">Who is in this album</h2>
          <p class="gl-who__list">${squadTags.join('')}</p>
          <p class="gl-who__note">Tap a name for that player's profile. Tag a player against an
            individual photograph in the control panel and the name appears under the frame
            itself.</p>
        </div>` : ''}
        ${g.photographer ? `<p class="gl-credit">All photographs in this album by
          <b>${esc(g.photographer)}</b>.</p>` : ''}
      </div>
    </section>` : '';

  const moreBand = others.length ? `<section class="sec gl-more" aria-labelledby="ga-m-h">
      <div class="wrap">
        ${rail(2, 'More albums', `${others.length} more`)}
        <h2 class="h2 rv" id="ga-m-h">Another <span class="volt">matchday.</span></h2>
        <ul class="gl-grid rv">
          ${others.map((o) => {
    const t = splitTitle(o.title);
    return `<li class="gl-card">
            <a class="gl-card__link" href="/gallery/${attr(o.slug)}.html">
              <span class="gl-card__shot">
                ${o.cover ? `<img src="${attr(o.cover)}" alt="" width="640" height="427" loading="lazy" decoding="async" />`
      : `<img class="gl-card__crest" src="${STAR}" alt="" width="76" height="94" loading="lazy" decoding="async" />`}
                ${badgePair(o)}
                <span class="gl-card__count">${esc(photosOf(o).length)} photos</span>
              </span>
              <span class="gl-card__body">
                <b class="gl-card__fixture">${esc(t.fixture)}</b>
                <span class="gl-card__detail">${esc(t.detail)}</span>
              </span>
            </a>
          </li>`;
  }).join('\n          ')}
        </ul>
        <p class="gl-album__back"><a href="/gallery.html">${ARROW} All albums</a></p>
      </div>
    </section>` : '';

  return {
    css: 'home.css',
    shell: 'home',
    bodyClass: 'is-home is-sub is-gallery is-album',
    preMain: sitePreMain(auraFor('gallery.html')),
    footerHtml: siteFooter(),
    body: siteHeader('/gallery.html') + hero + grid + moreBand,
    schema: [{
      '@context': 'https://schema.org',
      '@type': 'ImageGallery',
      name: g.title,
      url: `${CLUB.site}/gallery/${g.slug}.html`,
      numberOfItems: photos.length,
    }],
  };
}
