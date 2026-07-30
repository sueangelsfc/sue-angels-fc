#!/usr/bin/env node
/* ==========================================================================
   SITE GENERATOR
   Runs locally; its output is committed. Vercel therefore needs no build
   step (buildCommand: null) while every page still ships real HTML and each
   player, match and article gets its own crawlable URL.

     node src/build.mjs            generate everything
     node src/build.mjs --check    generate to memory and report only
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { buildDataset } from './lib/dataset.mjs';
import { page, esc } from './lib/html.mjs';
import { CLUB, SEPSIS } from './lib/club.mjs';
import { teamSummary, fmtDate } from './lib/stats.mjs';
import { home } from './templates/home.mjs';
import * as P from './templates/pages.mjs';
import { playerPage, matchPage, articlePage, albumPage } from './templates/detail.mjs';

const ROOT = process.cwd();
const CHECK = process.argv.includes('--check');
const written = [];
let bytes = 0;

function write(rel, content) {
  const full = path.join(ROOT, rel);
  if (!CHECK) {
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  written.push(rel);
  bytes += Buffer.byteLength(content);
}

/* ---- Asset version: content-hashed so caches bust correctly and every
   page necessarily carries the same value (mixed versions were a recurring
   bug when they were hand-edited). ---- */
function bundle(dir, files) {
  return files.map((f) => fs.readFileSync(path.join(ROOT, 'src', dir, f), 'utf8')).join('\n');
}
const cssFiles = fs.readdirSync(path.join(ROOT, 'src', 'styles')).filter((f) => f.endsWith('.css')).sort();
const jsFiles = fs.readdirSync(path.join(ROOT, 'src', 'scripts')).filter((f) => f.endsWith('.js')).sort();
let css = bundle('styles', cssFiles);
let js = bundle('scripts', jsFiles);

// Font URLs are written relative in source so the file reads naturally;
// rewrite to absolute for the deployed bundle at the root.
css = css.replace(/url\('assets\/fonts\//g, "url('/assets/fonts/");

const crypto = await import('node:crypto');
const assetV = crypto.createHash('sha256').update(css + js).digest('hex').slice(0, 8);

/* Inject runtime config the client needs (public values only - the anon key
   is designed to be public and all protection comes from RLS). */
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'runtime.json'), 'utf8'));
js = `window.SA_SUPABASE=${JSON.stringify(cfg.supabase)};window.SA_EMAIL=${JSON.stringify(CLUB.email)};\n${js}`;

write('sa.css', css);
write('sa.js', js);

/* ---- Crest path for inline SVG ---- */
const crestSvg = fs.readFileSync(path.join(ROOT, 'assets', 'brand', 'crest.svg'), 'utf8');
const crestPath = (crestSvg.match(/ d="([^"]+)"/) || [])[1];
if (!crestPath) throw new Error('Could not read the crest path from assets/brand/crest.svg');
// Trim coordinate precision: the traced path carries 2dp, which is far more
// than a 512px viewBox can express. 1dp is visually identical and smaller.
const leanPath = crestPath.replace(/(\d+)\.(\d)\d/g, '$1.$2').replace(/\.0(?=[,\s LMCZ])/g, '');

/* ---- Data ---- */
const d = buildDataset();
const all = teamSummary(d.played);
const ourRow = d.table.find((r) => r.us);

/* ---- Schema.org --------------------------------------------------------
   SportsTeam for the club, SportsEvent per match, Article per news item,
   BreadcrumbList on detail routes. */
const orgSchema = {
  '@context': 'https://schema.org',
  '@type': 'SportsTeam',
  name: CLUB.name,
  alternateName: CLUB.nickname,
  sport: 'Association football',
  foundingDate: String(CLUB.founded),
  url: CLUB.site,
  logo: `${CLUB.site}/assets/brand/badge.png`,
  email: CLUB.email,
  memberOf: { '@type': 'SportsOrganization', name: CLUB.league },
  location: {
    '@type': 'Place',
    name: CLUB.venue.name,
    address: { '@type': 'PostalAddress', addressLocality: CLUB.venue.locality, addressCountry: CLUB.venue.country },
  },
  sameAs: CLUB.socials.map((s) => s.href),
  coach: d.coaches.map((c) => ({ '@type': 'Person', name: c.name, jobTitle: c.role })),
  athlete: d.squad.slice(0, 40).map((p) => ({ '@type': 'Person', name: p.name, url: `${CLUB.site}/players/${p.slug}.html` })),
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: CLUB.name,
  url: CLUB.site,
};

const breadcrumb = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem', position: i + 1, name: it.label, item: `${CLUB.site}${it.href}`,
  })),
});

const matchSchema = (m) => ({
  '@context': 'https://schema.org',
  '@type': 'SportsEvent',
  name: m.title,
  sport: 'Association football',
  startDate: m.isoDateTime || m.iso,
  eventStatus: m.played ? 'https://schema.org/EventScheduled' : 'https://schema.org/EventScheduled',
  url: `${CLUB.site}/matches/${m.slug}.html`,
  location: m.venue
    ? { '@type': 'Place', name: m.venue, address: { '@type': 'PostalAddress', addressLocality: 'London', addressCountry: 'GB' } }
    : undefined,
  competitor: [
    { '@type': 'SportsTeam', name: m.home },
    { '@type': 'SportsTeam', name: m.away },
  ],
  superEvent: { '@type': 'SportsOrganization', name: m.competition },
});

/* ---- Static routes ---- */
const R = d.pages || {};
const meta = (slug, fallbackTitle, fallbackDesc) => ({
  title: R[slug]?.title || fallbackTitle,
  description: R[slug]?.desc || fallbackDesc,
});

const routes = [
  { file: 'index.html', tpl: () => home(d), ...meta('home', `${CLUB.name} - ${CLUB.division} Champions`,
      `London Sunday-league football club, founded in memory of ${CLUB.memorial.name}. ${CLUB.division} champions, unbeaten in our inaugural season.`),
    schema: [orgSchema, websiteSchema] },

  { file: 'about.html', tpl: () => P.about(d), ...meta('about', `Our story · ${CLUB.name}`,
      `The story of ${CLUB.name}, built in memory of ${CLUB.memorial.name}, supporting sepsis awareness.`) },

  { file: 'sepsis.html', tpl: () => P.sepsis(d), ...meta('sepsis', `Our cause: sepsis awareness · ${CLUB.name}`,
      `${CLUB.name} was founded in memory of ${CLUB.memorial.name}, who we lost to sepsis. Why we play, the signs of sepsis to know, and how to support the cause.`) },

  { file: 'champions.html', tpl: () => P.champions(d), ...meta('champions', `Champions · ${CLUB.name}`,
      `${CLUB.division} champions ${d.currentSeason}: the season in numbers, unbeaten and promoted.`) },

  { file: 'awards.html', tpl: () => P.awards(d), ...meta('awards', `Awards · ${CLUB.name}`,
      `${CLUB.name} Player of the Month and end of season awards, celebrating the players who made the difference.`) },

  { file: 'squad.html', tpl: () => P.squad(d), ...meta('squad', `Squad · ${CLUB.name}`,
      `The ${CLUB.name} first-team squad, grouped by position. Tap any player for their full performance profile.`) },

  { file: 'stats.html', tpl: () => P.stats(d), ...meta('stats', `Player stats · ${CLUB.name}`,
      `${CLUB.name} player stats: goals, assists and appearances across the season, derived from our own match records.`) },

  { file: 'coaches.html', tpl: () => P.coaches(d), ...meta('coaches', `Coaches · ${CLUB.name}`,
      `Meet the coaching staff guiding ${CLUB.name}, the people shaping our ${CLUB.division} champions on and off the pitch.`) },

  { file: 'fixtures.html', tpl: () => P.fixtures(d), ...meta('fixtures', `Fixtures · ${CLUB.name}`,
      `Upcoming ${CLUB.name} fixtures across league and cups, with dates, kick-off times and venues.`) },

  { file: 'results.html', tpl: () => P.results(d), ...meta('results', `Results · ${CLUB.name}`,
      `Every ${CLUB.name} result across league and cups, from our unbeaten ${CLUB.division} title-winning season.`) },

  { file: 'league.html', tpl: () => P.league(d), ...meta('league', `League table · ${CLUB.name}`,
      `The full ${CLUB.division} ${d.currentSeason} table, every result across the division, and the league's leading scorers.`) },

  { file: 'records.html', tpl: () => P.records(d), ...meta('records', `Club records · ${CLUB.name}`,
      `Every ${CLUB.name} club record: most goals, appearances, assists, clean sheets, biggest wins and club firsts.`) },

  { file: 'live.html', tpl: () => P.live(d), ...meta('live', `Live and replays · ${CLUB.name}`,
      `Watch ${CLUB.name} matches live and on replay, streamed from our YouTube channel.`) },

  { file: 'news.html', tpl: () => P.news(d), ...meta('news', `News · ${CLUB.name}`,
      `The latest from ${CLUB.name}: match reports, club announcements and the stories behind the badge.`) },

  { file: 'gallery.html', tpl: () => P.gallery(d), ...meta('gallery', `Gallery · ${CLUB.name}`,
      `Matchday photography from ${CLUB.name}, season by season.`) },

  { file: 'videos.html', tpl: () => P.videos(d), ...meta('videos', `Videos · ${CLUB.name}`,
      `${CLUB.name} matchday videos and highlights from our unbeaten ${CLUB.division} season.`) },

  { file: 'sponsors.html', tpl: () => P.sponsors(d), ...meta('sponsors', `Sponsors · ${CLUB.name}`,
      `Meet the partners backing ${CLUB.name}, and find out how your business can sponsor a London Sunday-league club with a cause at its heart.`) },

  { file: 'join.html', tpl: () => P.join(d), ...meta('join', `Join · ${CLUB.name}`,
      `Trials, volunteering, media and sponsorship. Join ${CLUB.name} for the new season.`) },

  { file: 'contact.html', tpl: () => P.contact(d), ...meta('contact', `Contact · ${CLUB.name}`,
      `Get in touch with ${CLUB.name}. Enquiries about trials, volunteering, media, sponsorship and the cause.`) },

  { file: '404.html', tpl: () => P.notFound(d), title: `Page not found · ${CLUB.name}`,
    description: 'That page does not exist.', noindex: true },
];

for (const r of routes) {
  const out = r.tpl();
  write(r.file, page({
    title: r.title,
    description: r.description,
    path: `/${r.file}`,
    body: out.body,
    bodyClass: out.bodyClass || '',
    // A template may contribute its own structured data (the homepage FAQ).
    schema: [...(r.schema || []), ...(out.faqSchema ? [out.faqSchema] : [])],
    noindex: r.noindex,
    assetV,
  }));
}

/* ---- Player profiles ---- */
const profilePlayers = d.players.filter((p) => !p.unknown);
for (const p of profilePlayers) {
  const { body } = playerPage(p, d);
  write(`players/${p.slug}.html`, page({
    title: `${p.name} · ${CLUB.name}`,
    description: `${p.name}, ${p.position} for ${CLUB.name}. ${p.apps} appearances, ${p.goals} goals and ${p.assists} assists in ${d.currentSeason}.`,
    path: `/players/${p.slug}.html`,
    body,
    assetV,
    schema: [
      {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: p.name,
        jobTitle: p.position,
        memberOf: { '@type': 'SportsTeam', name: CLUB.name, url: CLUB.site },
        url: `${CLUB.site}/players/${p.slug}.html`,
      },
      breadcrumb([{ label: 'Home', href: '/' }, { label: 'Squad', href: '/squad.html' }, { label: p.name, href: `/players/${p.slug}.html` }]),
    ],
  }));
}

/* ---- Match centre ---- */
for (const m of d.matches) {
  const { body } = matchPage(m, d);
  const desc = m.played
    ? `${m.title}, ${m.competition}, ${fmtDate(m.date, { long: true })}. Line-ups, goals and the match report.`
    : `${m.home} v ${m.away}, ${m.competition}, ${fmtDate(m.date, { long: true })}.`;
  write(`matches/${m.slug}.html`, page({
    title: `${m.title} · ${CLUB.name}`,
    description: desc,
    path: `/matches/${m.slug}.html`,
    body,
    assetV,
    schema: [
      matchSchema(m),
      breadcrumb([{ label: 'Home', href: '/' }, { label: 'Results', href: '/results.html' }, { label: m.title, href: `/matches/${m.slug}.html` }]),
    ],
  }));
}

/* ---- Articles ---- */
for (const a of d.articles) {
  const { body } = articlePage(a, d);
  write(`news/${a.slug}.html`, page({
    title: `${a.title} · ${CLUB.name}`,
    description: String(a.lede || a.title).split('\n')[0].slice(0, 180),
    path: `/news/${a.slug}.html`,
    body,
    assetV,
    schema: [
      {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: a.title,
        datePublished: a.iso || undefined,
        dateModified: a.updatedAt || undefined,
        author: { '@type': 'Organization', name: CLUB.name },
        publisher: { '@type': 'Organization', name: CLUB.name, logo: { '@type': 'ImageObject', url: `${CLUB.site}/assets/brand/badge.png` } },
        mainEntityOfPage: `${CLUB.site}/news/${a.slug}.html`,
        articleSection: a.category,
      },
      breadcrumb([{ label: 'Home', href: '/' }, { label: 'News', href: '/news.html' }, { label: a.title, href: `/news/${a.slug}.html` }]),
    ],
  }));
}

/* ---- Gallery albums ---- */
for (const g of d.galleries) {
  const { body } = albumPage(g, d);
  write(`gallery/${g.slug}.html`, page({
    title: `${g.title} · ${CLUB.name}`,
    description: `${g.photoCount} matchday photographs. ${g.title}.`,
    path: `/gallery/${g.slug}.html`,
    body,
    assetV,
    schema: [breadcrumb([{ label: 'Home', href: '/' }, { label: 'Gallery', href: '/gallery.html' }, { label: g.title, href: `/gallery/${g.slug}.html` }])],
  }));
}

/* ---- Sitemap, robots, manifest ---- */
const urls = written
  .filter((f) => f.endsWith('.html') && f !== '404.html')
  .map((f) => (f === 'index.html' ? '/' : `/${f}`));

const today = (d.articles[0]?.updatedAt || new Date().toISOString()).slice(0, 10);
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${CLUB.site}${u}</loc><lastmod>${today}</lastmod><changefreq>${u === '/' ? 'daily' : 'weekly'}</changefreq><priority>${u === '/' ? '1.0' : u.includes('/players/') || u.includes('/matches/') ? '0.6' : '0.8'}</priority></url>`).join('\n')}
</urlset>
`);

write('robots.txt', `User-agent: *
Allow: /
Disallow: /control.html
Disallow: /api/

Sitemap: ${CLUB.site}/sitemap.xml
`);

write('manifest.webmanifest', JSON.stringify({
  name: CLUB.name,
  short_name: 'Sue’s Angels',
  description: `${CLUB.name}, founded in memory of ${CLUB.memorial.name}.`,
  start_url: '/',
  display: 'standalone',
  background_color: '#000000',
  theme_color: '#FF7034',
  icons: [
    { src: '/assets/brand/badge.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/assets/brand/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
  ],
}, null, 2));

/* The one crest asset every page references. Brand orange on transparent, so
   it reads correctly in both themes and the browser caches it once. */
write('assets/brand/crest-mark.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><path fill="#FF7034" fill-rule="evenodd" d="${leanPath}"/></svg>`);

/* Favicon: the same crest on a black rounded tile. */
write('assets/brand/favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="#000"/><path fill="#FF7034" fill-rule="evenodd" d="${leanPath}"/></svg>`);

/* ---- Report ---- */
const kinds = written.reduce((acc, f) => {
  const k = f.includes('/') ? f.split('/')[0] : path.extname(f).slice(1);
  acc[k] = (acc[k] || 0) + 1;
  return acc;
}, {});

console.log(`${CHECK ? 'CHECK' : 'BUILD'} complete`);
console.log(`asset version: ${assetV}`);
console.log(`css: ${cssFiles.join(', ')} -> sa.css (${(Buffer.byteLength(css) / 1024).toFixed(1)} KB)`);
console.log(`js:  ${jsFiles.join(', ')} -> sa.js (${(Buffer.byteLength(js) / 1024).toFixed(1)} KB)`);
console.log(`files: ${written.length}, total ${(bytes / 1024).toFixed(0)} KB`);
console.log('by group:', JSON.stringify(kinds));
console.log(`routes: ${routes.length} static, ${profilePlayers.length} players, ${d.matches.length} matches, ${d.articles.length} articles, ${d.galleries.length} albums`);
console.log(`sitemap urls: ${urls.length}`);
