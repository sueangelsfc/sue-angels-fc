/* ==========================================================================
   SHELL AND MARKUP HELPERS
   The header, navigation and footer are defined ONCE here and injected into
   every generated page. The previous build copy-pasted this markup into 20
   files and it drifted (three different brand aria-labels, two different
   mobile CTA labels). Defining it once makes that class of bug impossible.
   ========================================================================== */
import { CLUB } from './club.mjs';

export const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const attr = (s) => esc(s);

/* Inline SVG icon set. Kept tiny and stroke-based so it inherits currentColor
   and needs no icon font or sprite request. */
const ICONS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  close: '<path d="M18 6L6 18M6 6l12 12"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/>',
  pin: '<path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  play: '<path d="M8 5l11 7-11 7V5z" fill="currentColor" stroke="none"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none"/>',
  youtube: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9.2l5.2 2.8L10 14.8V9.2z" fill="currentColor" stroke="none"/>',
  facebook: '<path d="M14.5 8.5h2.2V5.6h-2.4c-2.3 0-3.7 1.4-3.7 3.8v1.5H8.4v3h2.2V21h3.2v-7.1h2.3l.4-3h-2.7V9.6c0-.8.3-1.1 1.1-1.1z" fill="currentColor" stroke="none"/>',
  mail: '<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M3 7l9 6 9-6"/>',
  trophy: '<path d="M7 4h10v4a5 5 0 0 1-10 0V4z"/><path d="M17 5h2.5a2.5 2.5 0 0 1-2.5 4M7 5H4.5A2.5 2.5 0 0 0 7 9"/><path d="M12 13v3M9 20h6M10 16h4"/>',
  shield: '<path d="M12 3l7.5 3v6c0 4.6-3.1 7.9-7.5 9.4C7.6 19.9 4.5 16.6 4.5 12V6L12 3z"/>',
  users: '<circle cx="9" cy="8" r="3.4"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 5.2a3.4 3.4 0 0 1 0 6.6M18 20a6.4 6.4 0 0 0-2.3-4.9"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  camera: '<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.8l1.2-2h6.9l1.2 2h1.9A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-9z"/><circle cx="12" cy="12.6" r="3.4"/>',
  news: '<path d="M4 5h11v14H4z"/><path d="M15 9h5v8a2 2 0 0 1-2 2h-3"/><path d="M7 9h5M7 12h5M7 15h3"/>',
  heart: '<path d="M12 20s-7-4.4-7-9.4A4 4 0 0 1 12 7a4 4 0 0 1 7 3.6c0 5-7 9.4-7 9.4z"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  star: '<path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2l-6.1 3.4 1.4-6.8L2.2 9.1l6.9-.8L12 2z" fill="currentColor" stroke="none"/>',
  external: '<path d="M14 4h6v6M20 4l-8.5 8.5"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
};

export function icon(name, cls = '') {
  const body = ICONS[name];
  if (!body) return '';
  // Always carry .ico: an SVG with no intrinsic size otherwise falls back to
  // the 300x150 default and renders enormous inside text.
  return `<svg class="ico${cls ? ` ${attr(cls)}` : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

/* ---- Crest ------------------------------------------------------------
   Referenced as ONE cached external SVG rather than inlined. The traced
   crest path is ~26KB; inlining it put it on the page four to twenty times
   (80% of a homepage, and 909KB on one player page). As an <img> the browser
   fetches it once and reuses it across every page.

   Note: assets/badge/sue-angels-crest-marks.svg is an INVERTED mask (a
   full-canvas rectangle with the crest subtracted via evenodd), so filling it
   paints the background and voids the crest. The real crest raster is used
   instead - it is the actual brand asset, reads on black and on warm white,
   and at 31KB it is fetched once and cached for the whole site. */
const CREST_SRC = '/assets/brand/crest.webp';
export function crest(cls = '', label = '') {
  const a11y = label ? `alt="${attr(label)}"` : 'alt="" aria-hidden="true"';
  return `<img class="${attr(cls)}" src="${CREST_SRC}" ${a11y} width="512" height="512" loading="lazy" decoding="async">`;
}
/* Eager variant for above-the-fold marks (the header lockup). */
export function crestEager(cls = '', label = '') {
  const a11y = label ? `alt="${attr(label)}"` : 'alt="" aria-hidden="true"';
  return `<img class="${attr(cls)}" src="${CREST_SRC}" ${a11y} width="512" height="512" decoding="async">`;
}

/* Opponent crest, or a lettered fallback when we hold no badge for a club.
   The registry maps a club name to { match, src, alt, aspect }, so the record
   has to be unwrapped rather than used as a path. */
export function clubCrest(name, badges, size = '') {
  const rec = badges?.[name];
  const cls = `crest ${size}`.trim();
  const src = typeof rec === 'string' ? rec : rec?.src;
  if (src) {
    const path = src.startsWith('/') ? src : `/${src}`;
    return `<span class="${cls}" data-aspect="${attr(rec?.aspect || 'circle')}"><img src="${attr(path)}" alt="" width="40" height="40" loading="lazy" decoding="async"></span>`;
  }
  const initial = String(name || '?').replace(/^(the|afc|fc)\s+/i, '').charAt(0).toUpperCase();
  return `<span class="${cls} crest--letter" aria-hidden="true">${esc(initial)}</span>`;
}

/* ---- Navigation - defined once ---------------------------------------- */
export const NAV = [
  { label: 'Club', children: [
    { label: 'Our story', href: '/about.html', note: 'How the Angels began' },
    { label: 'Our cause', href: '/sepsis.html', note: 'Sepsis awareness' },
    { label: 'Champions', href: '/champions.html', note: 'The unbeaten season' },
    { label: 'Awards', href: '/awards.html', note: 'Honours and recognition' },
    { label: 'Club records', href: '/records.html', note: 'The archive' },
  ] },
  { label: 'Team', children: [
    { label: 'Squad', href: '/squad.html', note: 'The first team' },
    { label: 'Coaches', href: '/coaches.html', note: 'The staff' },
    { label: 'Player stats', href: '/stats.html', note: 'Goals, assists, appearances' },
  ] },
  { label: 'Matches', children: [
    { label: 'Fixtures', href: '/fixtures.html', note: 'What is coming up' },
    { label: 'Results', href: '/results.html', note: 'Every result' },
    { label: 'League table', href: '/league.html', note: 'The division' },
    { label: 'Live', href: '/live.html', note: 'Streams and replays' },
  ] },
  { label: 'Media', children: [
    { label: 'News', href: '/news.html', note: 'Club announcements' },
    { label: 'Gallery', href: '/gallery.html', note: 'Matchday photography' },
    { label: 'Videos', href: '/videos.html', note: 'Highlights' },
  ] },
  { label: 'Sponsors', href: '/sponsors.html' },
  { label: 'Contact', href: '/contact.html' },
];

const isCurrent = (href, path) => href === path;
const groupActive = (item, path) => (item.children || []).some((c) => isCurrent(c.href, path));

function navDesktop(path) {
  const items = NAV.map((item) => {
    if (!item.children) {
      return `<li><a class="nav__link" href="${attr(item.href)}"${isCurrent(item.href, path) ? ' aria-current="page"' : ''}>${esc(item.label)}</a></li>`;
    }
    const id = `dd-${item.label.toLowerCase()}`;
    const links = item.children.map((c) =>
      `<a class="menu__item" href="${attr(c.href)}"${isCurrent(c.href, path) ? ' aria-current="page"' : ''}>
         <span>${esc(c.label)}</span>
       </a>`).join('');
    return `<li class="nav__group" data-navgroup>
      <button class="nav__link" type="button" aria-expanded="false" aria-controls="${id}" data-navtrigger>
        ${esc(item.label)}${icon('down', 'nav__caret')}
      </button>
      <div class="nav__dd glass glass--deep menu" id="${id}">${links}</div>
    </li>`;
  }).join('');
  return `<nav class="nav" aria-label="Main"><ul class="nav__list">${items}</ul></nav>`;
}

function navMobile(path) {
  const groups = NAV.map((item) => {
    if (!item.children) {
      return `<li><a class="mnav__link" href="${attr(item.href)}"${isCurrent(item.href, path) ? ' aria-current="page"' : ''}>${esc(item.label)}</a></li>`;
    }
    const subs = item.children.map((c) =>
      `<a class="chip" href="${attr(c.href)}"${isCurrent(c.href, path) ? ' aria-current="page"' : ''}>${esc(c.label)}</a>`).join('');
    return `<li class="mnav__group">
      <div class="mnav__glabel">${esc(item.label)}</div>
      <div class="mnav__sub">${subs}</div>
    </li>`;
  }).join('');

  return `<div class="mnav" id="mobile-nav" hidden role="dialog" aria-modal="true" aria-label="Menu">
    <div class="mnav__head">
      ${brandLockup()}
      <button class="icon-btn" type="button" data-mnav-close aria-label="Close menu">${icon('close')}</button>
    </div>
    <ul class="mnav__list" role="list">${groups}</ul>
    <div class="mnav__foot">
      <a class="btn btn--primary btn--block" href="/join.html">Join the club</a>
      <a class="btn btn--ghost btn--block" href="/sepsis.html">${icon('heart')} Our cause</a>
    </div>
  </div>`;
}

/* One canonical brand lockup and one canonical aria-label. */
function brandLockup() {
  return `<a class="brand" href="/" aria-label="${attr(CLUB.name)}, home">
    <span class="brand__crest">${crestEager()}</span>
    <span class="brand__text">
      <span class="brand__name">Sue’s Angels</span>
      <span class="brand__sub">Est. 2025 · For Sue</span>
    </span>
  </a>`;
}

export function header(path) {
  return `<header class="hdr" data-header>
    <div class="wrap wrap--wide">
      <div class="hdr__inner glass glass--pill">
        ${brandLockup()}
        ${navDesktop(path)}
        <div class="hdr__actions">
          <button class="tsw" type="button" data-theme-toggle aria-label="Switch to light theme" title="Switch theme">
            ${icon('sun', 'tsw__sun')}${icon('moon', 'tsw__moon')}
          </button>
          <a class="btn btn--primary btn--sm hdr__join" href="/join.html">Join</a>
          <button class="burger" type="button" data-mnav-open aria-expanded="false" aria-controls="mobile-nav" aria-label="Open menu">
            <span class="burger__bars" aria-hidden="true"><span></span><span></span><span></span></span>
          </button>
        </div>
      </div>
    </div>
  </header>
  ${navMobile(path)}`;
}

export function footer() {
  const social = CLUB.socials.map((s) =>
    `<a class="icon-btn icon-btn--sm" href="${attr(s.href)}" rel="me noopener" target="_blank" aria-label="${attr(s.label)}">${icon(s.icon)}</a>`).join('');

  const cols = [
    { h: 'Club', links: [
      ['Our story', '/about.html'], ['Our cause', '/sepsis.html'],
      ['Champions', '/champions.html'], ['Awards', '/awards.html'], ['Club records', '/records.html'],
    ] },
    { h: 'Team', links: [
      ['Squad', '/squad.html'], ['Coaches', '/coaches.html'], ['Player stats', '/stats.html'],
    ] },
    { h: 'Matches', links: [
      ['Fixtures', '/fixtures.html'], ['Results', '/results.html'],
      ['League table', '/league.html'], ['Live', '/live.html'],
    ] },
    { h: 'More', links: [
      ['News', '/news.html'], ['Gallery', '/gallery.html'], ['Videos', '/videos.html'],
      ['Sponsors', '/sponsors.html'], ['Join', '/join.html'], ['Contact', '/contact.html'],
    ] },
  ].map((c) => `<div class="ftr__col">
      <h3>${esc(c.h)}</h3>
      <ul role="list">${c.links.map(([l, h]) => `<li><a href="${attr(h)}">${esc(l)}</a></li>`).join('')}</ul>
    </div>`).join('');

  return `<footer class="ftr">
    <div class="wrap wrap--wide">
      <div class="ftr__slab glass glass--xl">
        <div class="ftr__top">
          <div class="ftr__brand">
            <span class="ftr__crest">${crest('', `${CLUB.name} crest`)}</span>
            <p class="ftr__mission">Founded in 2025 in memory of ${esc(CLUB.memorial.name)}. We play in her name and for sepsis awareness.</p>
            <div class="ftr__social">${social}</div>
          </div>
          ${cols}
          <div class="ftr__col ftr__sub">
            <h3>Newsletter</h3>
            <p style="font-size:var(--step--2);color:var(--text-muted)">Team news, results and the cause. Once a month, no noise.</p>
            <form class="ftr__subform" data-subscribe novalidate>
              <label class="sr-only" for="ftr-email">Email address</label>
              <input class="input" id="ftr-email" name="email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" required>
              <button class="btn btn--primary btn--sm" type="submit">Join</button>
              <p class="field__error" data-sub-msg role="status" aria-live="polite" hidden></p>
            </form>
          </div>
        </div>
        <div class="ftr__bottom">
          <p>&copy; ${new Date().getUTCFullYear()} ${esc(CLUB.name)}. ${esc(CLUB.memorial.motto)}</p>
          <div class="ftr__legal">
            <a href="mailto:${attr(CLUB.email)}">${esc(CLUB.email)}</a>
            <a href="/sepsis.html">Sepsis awareness</a>
            <a href="/control.html">Control panel</a>
          </div>
        </div>
      </div>
    </div>
  </footer>`;
}

/* ---- Document ---------------------------------------------------------
   The inline theme script must run BEFORE first paint or the page flashes
   the wrong theme. It also sets html.js, which is what scopes every
   JS-dependent hidden state so a script failure can never blank a section. */
const THEME_BOOT = `(function(){var d=document.documentElement;d.classList.add('js');try{var t=localStorage.getItem('sa-theme');if(t==='light'||t==='dark'){d.setAttribute('data-theme',t)}}catch(e){}})();`;

export function page({
  title, description, path, body, css = 'sa.css', js = 'sa.js',
  ogImage = '/assets/social/og-default.png', schema = [], bodyClass = '',
  noindex = false, assetV = 1, bare = false,
}) {
  const canonical = `${CLUB.site}${path === '/index.html' ? '/' : path}`;
  const schemaTags = schema.length
    ? schema.map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n')
    : '';

  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${attr(description)}">
<link rel="canonical" href="${attr(canonical)}">
${noindex ? '<meta name="robots" content="noindex,follow">' : ''}
<script>${THEME_BOOT}</script>
<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#FFF8F3" media="(prefers-color-scheme: light)">
<meta name="color-scheme" content="dark light">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${attr(CLUB.name)}">
<meta property="og:title" content="${attr(title)}">
<meta property="og:description" content="${attr(description)}">
<meta property="og:url" content="${attr(canonical)}">
<meta property="og:image" content="${attr(CLUB.site + ogImage)}">
<meta property="og:locale" content="en_GB">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${attr(title)}">
<meta name="twitter:description" content="${attr(description)}">
<meta name="twitter:image" content="${attr(CLUB.site + ogImage)}">
<link rel="icon" href="/assets/brand/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="preload" href="/assets/fonts/Archivo-Variable.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/Geist-Variable.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/${css}?v=${assetV}">
${schemaTags}
</head>
<body${bodyClass ? ` class="${attr(bodyClass)}"` : ''}>
<div class="atmos" aria-hidden="true">
  <span class="atmos__blob atmos__blob--a"></span>
  <span class="atmos__blob atmos__blob--b"></span>
  <span class="atmos__blob atmos__blob--c"></span>
  <span class="atmos__blob atmos__blob--d"></span>
  <span class="atmos__veil"></span>
</div>
${bare ? body : `<a class="skip" href="#main">Skip to content</a>
${header(path)}
<main id="main">
${body}
</main>
${footer()}
<div class="toasts" data-toasts role="region" aria-label="Notifications" aria-live="polite"></div>`}
<script src="/${bare ? js : `${js}?v=${assetV}`}" defer></script>
</body>
</html>`;
}

/* ---- Small composable blocks ----------------------------------------- */
export function sectionHead({ index, eyebrow, title, action }) {
  return `<div class="sec-head">
    <div class="sec-head__title">
      ${index ? `<span class="sec-head__index">${esc(index)}</span>` : ''}
      ${eyebrow ? `<span class="eyebrow">${esc(eyebrow)}</span>` : ''}
      <h2>${title}</h2>
    </div>
    ${action || ''}
  </div>`;
}

export function pageHero({ eyebrow, title, lede, meta = [], crumbs }) {
  return `<section class="phero">
    <div class="wrap">
      ${crumbs || ''}
      <div class="phero__inner">
        ${eyebrow ? `<span class="eyebrow">${esc(eyebrow)}</span>` : ''}
        <h1>${title}</h1>
        ${lede ? `<p class="phero__lede">${lede}</p>` : ''}
        ${meta.length ? `<div class="phero__meta">${meta.map((m) => `<span>${m}</span>`).join('')}</div>` : ''}
      </div>
    </div>
  </section>`;
}

export function crumbs(trail) {
  const items = trail.map((t, i) => {
    const last = i === trail.length - 1;
    return `<li>${last ? `<span aria-current="page">${esc(t.label)}</span>` : `<a href="${attr(t.href)}">${esc(t.label)}</a>`}</li>`;
  }).join('');
  return `<nav class="crumbs" aria-label="Breadcrumb"><ol>${items}</ol></nav>`;
}

export function emptyState({ title, body, action }) {
  return `<div class="state">
    <span class="state__crest">${crest()}</span>
    <p class="state__title">${esc(title)}</p>
    ${body ? `<p class="state__body">${esc(body)}</p>` : ''}
    ${action || ''}
  </div>`;
}

export function statTile({ value, label, sub, brand = false, glass = false }) {
  return `<div class="stat ${glass ? 'glass' : 'panel'}${brand ? ' stat--brand' : ''}">
    <span class="stat__value">${esc(value)}</span>
    <span class="stat__label">${esc(label)}</span>
    ${sub ? `<span class="stat__sub">${esc(sub)}</span>` : ''}
  </div>`;
}
