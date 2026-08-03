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
import { page, esc, CLUB_ID } from './lib/html.mjs';
import { CLUB, SEPSIS } from './lib/club.mjs';
import { teamSummary, fmtDate, isUs, isLeague} from './lib/stats.mjs';
import { home, oppBadge } from './templates/home.mjs';
import * as P from './templates/pages.mjs';
import { about } from './templates/about.mjs';
import { cause } from './templates/cause.mjs';
import { champions } from './templates/champions.mjs';
import { awards } from './templates/awards.mjs';
import { sponsors } from './templates/sponsors.mjs';
import { squad } from './templates/squad.mjs';
import { stats } from './templates/stats.mjs';
import { coaches } from './templates/coaches.mjs';
import { results, fixtures } from './templates/results.mjs';
import { league } from './templates/league.mjs';
import { records } from './templates/records.mjs';
import { live } from './templates/live.mjs';
import { news, newsArticle, articleSlug } from './templates/news.mjs';
import { matchReport } from './templates/report.mjs';
import { gallery, galleryAlbum, splitTitle } from './templates/gallery.mjs';
import { videos } from './templates/videos.mjs';
import { join } from './templates/join.mjs';
import { contact } from './templates/contact.mjs';
import { notFound } from './templates/notfound.mjs';
import { PENDING_ROUTES, isLive, groupLive } from './lib/routes.mjs';
import { matchPage, articlePage } from './templates/detail.mjs';
import { playerPage } from './templates/player.mjs';
import { control } from './templates/control.mjs';
import { VOCAB } from './lib/football.mjs';
import { POSITION_VOCAB, ROLE_VOCAB } from './lib/positions.mjs';
import { STATUS_VOCAB } from './lib/squad-status.mjs';
import * as esbuild from 'esbuild';

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

/* ---- MINIFICATION ------------------------------------------------------
   This repo comments heavily on purpose: the reasoning behind a decision is
   worth more than the line it explains, and it is why anybody can pick this
   codebase up. But those comments were being SHIPPED. sa.js was 98KB raw and
   27KB gzipped, and half of that was prose written for whoever reads the
   repository next, downloaded by a supporter on a phone who never will.

   So the source keeps every word and the output keeps none. Measured on the
   files this build writes: sa.js 27.2 -> 13.7KB gzipped, control.js 16.3 ->
   9.5, control-match.js 22.9 -> 12.8, sa.css 19.6 -> 11.4, home.css 23.5 ->
   15.4, control.css 8.1 -> 3.7. A first visit to the home page is about
   twenty kilobytes lighter.

   NOT TRANSPILED, only minified: no `target` is set, so esbuild rewrites
   nothing about the syntax and cannot introduce a behaviour difference by
   downlevelling something. `charset: 'utf8'` keeps the literal characters
   this codebase insists on (`·`, `’`, `–`) as themselves rather than
   escaping them back into the entities it spent a day removing.

   The service worker is deliberately left alone. It is small, it is the one
   file whose failure mode is a stale cache nobody can clear, and its cache
   name is read back by the test suite.

   THE COST, stated plainly: the generated files committed to this repo are
   now single lines and their diffs are unreadable. That is the right trade
   only because `src/` is what anybody reviews and the root is a build
   artefact Vercel serves without building. */
const minifyJs = (code) => esbuild.transformSync(code, {
  minify: true, charset: 'utf8', legalComments: 'none',
}).code;
const minifyCss = (code) => esbuild.transformSync(code, {
  loader: 'css', minify: true, charset: 'utf8', legalComments: 'none',
}).code;

/* ---- Asset version: content-hashed so caches bust correctly and every
   page necessarily carries the same value (mixed versions were a recurring
   bug when they were hand-edited). Hashed AFTER minification, so the version
   describes the bytes a browser actually receives. ---- */
function bundle(dir, files) {
  return files.map((f) => fs.readFileSync(path.join(ROOT, 'src', dir, f), 'utf8')).join('\n');
}
const cssFiles = fs.readdirSync(path.join(ROOT, 'src', 'styles')).filter((f) => f.endsWith('.css')).sort();
const jsFiles = fs.readdirSync(path.join(ROOT, 'src', 'scripts')).filter((f) => f.endsWith('.js')).sort();
let css = bundle('styles', cssFiles);
let js = bundle('scripts', jsFiles);

/* The homepage is art-directed end to end and shares almost no component CSS
   with the rest of the site, so it ships its own sheet. Splitting the two
   made BOTH smaller than the single sheet that used to serve both.

   That sheet then split again. `src/styles-home/*.css` is the core every
   rebuilt page wears (tokens, shell, header, footer); `pages/*.css` is one
   band file per route, and a page links only its own. Concatenated, the
   twelve band files were 42KB gzipped that every page downloaded to use one
   of them, and the budget had been raised twice to keep pace. Linked
   separately the core caches once across the whole visit and first paint
   halves. */
const homeCssFiles = fs.readdirSync(path.join(ROOT, 'src', 'styles-home')).filter((f) => f.endsWith('.css')).sort();
let homeCss = bundle('styles-home', homeCssFiles);

const pageCssDir = path.join(ROOT, 'src', 'styles-home', 'pages');
const pageCssFiles = fs.readdirSync(pageCssDir).filter((f) => f.endsWith('.css')).sort();

// Font URLs are written relative in source so the file reads naturally;
// rewrite to absolute for the deployed bundle at the root.
const absAssets = (s) => s.replace(/url\('assets\//g, "url('/assets/");
css = absAssets(css);
homeCss = absAssets(homeCss);

/* Inject runtime config the client needs (public values only - the anon key
   is designed to be public and all protection comes from RLS). Prepended
   BEFORE minification so it is part of the hashed bytes. */
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'runtime.json'), 'utf8'));
js = `window.SA_SUPABASE=${JSON.stringify(cfg.supabase)};window.SA_EMAIL=${JSON.stringify(CLUB.email)};\n${js}`;

const cssSrc = css;
const homeCssSrc = homeCss;
const jsSrc = js;
css = minifyCss(css);
homeCss = minifyCss(homeCss);
js = minifyJs(js);

const crypto = await import('node:crypto');
const assetV = crypto.createHash('sha256').update(css + js).digest('hex').slice(0, 8);
const homeV = crypto.createHash('sha256').update(homeCss + js).digest('hex').slice(0, 8);

write('sa.css', css);
write('home.css', homeCss);
write('sa.js', js);

/* The service worker, stamped with the same content hash the pages carry, so
   a deploy renames the cache and `activate` drops every older one. The
   retired site hard-coded its cache name and relied on somebody remembering
   to bump it. */
write('sw.js', fs.readFileSync(path.join(ROOT, 'src', 'sw-template.js'), 'utf8')
  /* replaceAll, not replace: the placeholder appears in the file's own
     comment as well as the code, and a string-pattern replace only takes the
     first, which stamped the comment and left the cache name literal. */
  .replaceAll('__CACHE__', `sa-${assetV}`));

/* One sheet per page band, each independently hashed so editing the league
   page cannot bust the cache on the other eleven. `26-campaign.css` ships as
   `p-campaign.css`: the number is only there to order the source folder. */
const pageCss = new Map();
/* A band's output name is its source name without the ordering prefix, so
   30-squad.css and 32-squad.css both emit p-squad.css and the later one wins
   silently. That happened: a new file appended alongside 33-player.css was
   called 50-player.css, sorted after it, and replaced the entire 34KB player
   stylesheet with a 2KB fragment. Every player profile shipped unstyled and
   nothing said a word.

   Two files cannot share an output name. This is a build error now, named,
   before anything is written. */
const seenBand = new Map();
for (const f of pageCssFiles) {
  const name = `p-${f.replace(/^\d+-/, '')}`;
  if (seenBand.has(name)) {
    throw new Error(
      `two page bands both emit ${name}: ${seenBand.get(name)} and ${f}. `
      + 'Rename one, or fold it into the other. The later one would silently '
      + 'replace the earlier and the page would ship unstyled.',
    );
  }
  seenBand.set(name, f);
  const body = minifyCss(absAssets(fs.readFileSync(path.join(pageCssDir, f), 'utf8')));
  write(name, body);
  pageCss.set(f.replace(/^\d+-|\.css$/g, ''), {
    href: name,
    v: crypto.createHash('sha256').update(body).digest('hex').slice(0, 8),
  });
}
/* Which band each route wears. Kept here rather than in the templates so the
   whole mapping is legible in one place, and so a route that forgets its band
   fails loudly below rather than rendering unstyled. */
const PAGE_CSS = {
  'index.html': 'campaign',
  'about.html': 'about',
  'sepsis.html': 'cause',
  'champions.html': 'champions',
  'awards.html': 'awards',
  'sponsors.html': 'sponsors',
  'squad.html': 'squad',
  'stats.html': 'stats',
  'coaches.html': 'coaches',
  'fixtures.html': 'matches',
  'results.html': 'matches',
  'league.html': 'league',
  'records.html': 'records',
  'live.html': 'media',
  'news.html': 'media',
  'news/': 'media',
  'matches/': 'report',
  'gallery.html': 'gallery',
  'videos.html': 'media',
  'gallery/': 'gallery',
  'players/': 'player',
  'join.html': 'join',
  'contact.html': 'contact',
  '404.html': 'notfound',
};
const bandFor = (file) => {
  const key = PAGE_CSS[file];
  if (!key) return null;
  const rec = pageCss.get(key);
  if (!rec) throw new Error(`page band "${key}" for ${file} has no stylesheet in src/styles-home/pages`);
  return rec;
};

/* ---- Data ---- */
const d = buildDataset();
const all = teamSummary(d.played);
const ourRow = d.table.find((r) => r.us);

/* The control panel gets its own JS bundle: none of it belongs on a public
   page, and keeping it separate keeps sa.js small. */
const adminFiles = fs.readdirSync(path.join(ROOT, 'src', 'admin')).filter((f) => f.endsWith('.js')).sort();
let adminJs = bundle('admin', adminFiles);
/* The panel gets three things the generator already knows and it otherwise
   could not: the club's own name (so a fixture form can tell "us" from "them"
   without the operator typing it), the competitions and opponents already in
   the record (so those become pickers instead of free text that misspells a
   club and breaks its badge), and the pre-season fixtures transcribed in the
   code baseline but never entered as rows, so the panel can offer to import
   them in one action instead of six hand-typed JSON documents. */
const isoById = new Map((d.matches || []).map((m) => [m.id, m.iso]));
const adminSeed = {
  club: CLUB.name,
  division: CLUB.nextDivision,
  venue: `${CLUB.venue.shortName}, ${CLUB.venue.district}`,
  competitions: [...new Set([CLUB.nextDivision, CLUB.division,
    ...d.played.map((m) => m.competition), 'Pre-season friendly'])].filter(Boolean).sort(),
  clubs: [...new Set(d.matches.flatMap((m) => [m.home, m.away]))]
    .filter((n) => n && !isUs(n)).sort(),
  /* WHICH OF THEM ALREADY HAVE A CREST, worked out the way the website works
     it out.

     The dashboard counted rows in the `team_badges` table, which is the table
     the panel's own uploader writes and which has none in it, and reported
     "0 of 26 opponents have a badge" while twenty-five crests were shipping
     on every match card on the site. It was asking the club to go and find
     twenty-five badges it already had.

     A badge resolves from three places, in order: an uploaded row, the
     curated file, and the recovered registry, with a needle so "Woking
     Veterans Sundays" finds the Woking Vets crest. Only oppBadge() knows all
     of that, so the answer is computed here with oppBadge() rather than
     guessed at again in the browser. One club is genuinely without: Mala
     Vida FC. */
  clubsWithBadge: [...new Set(d.matches.flatMap((m) => [m.home, m.away]))]
    .filter((n) => n && !isUs(n))
    .filter((n) => /src="/.test(oppBadge(n, d.badges, 22, 22)))
    .sort(),
  /* And the same question for photographs: which shirt numbers the website
     can actually draw a face for, counting the ones on disk as well as the
     ones stored against a row. */
  squadWithPhoto: d.squad.filter((p) => p.hasPhoto).map((p) => p.num),
  /* THE GROUNDS THE CLUB HAS PLAYED AT, offered as you type.

     A venue was a bare text field and nothing compared what you typed with
     what had been typed before, so sixteen strings were stored for about nine
     grounds: "Meadhurst Sports Clun", the club's own ground written out as a
     postal address, Barn Elms spelled two ways, Prince George's with and
     without its apostrophe. src/data/venues.json cleans that up on the way
     into the build, which fixes the website and does nothing about the next
     one being typed.

     A suggestion list rather than a fixed menu, on purpose: the club will
     play somewhere new and a form that refuses the name of the ground it is
     standing on is worse than one that lets a typo through. */
  venues: [...new Set(d.matches.map((m) => m.venue).filter(Boolean))].sort(),
  /* The transcribed pre-season list. Carries the competition and kick-off the
     dataset resolved for each one, which the raw file does not hold: without
     it the report writer could not tell that a fixture was a friendly, so
     "the first of six" came out as nothing at all. Taken from `d.fixtures`
     rather than defaulted here a second time, so the two cannot drift. */
  baselineFixtures: (JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'fixtures-2627.json'), 'utf8')).fixtures || [])
    .map((f) => {
      const resolved = (d.fixtures || []).find((x) => x.id === f.id) || {};
      return { ...f, competition: resolved.competition || '', kick: f.kick || resolved.kick || '' };
    }),
  /* The squad, so a result is recorded by picking players rather than typing
     shirt numbers into JSON and hoping. Numbers are the storage key the match
     record already uses; they are never shown on the website. */
  squad: d.squad.map((p) => ({ num: p.num, name: p.name, pos: p.position || '' })),
  /* THE CLUB'S OWN RECORD, so a report can close the way a report closes.

     "Eighteen wins from eighteen. Fifty-four points. Ninety goals scored
     across the league alone. Just eleven conceded. In thirty-three matches
     across all competitions we scored 137 and won eighty-eight per cent" -
     every figure in that paragraph is derived on this site and none of it
     reached the writer, so the club was typing its own history from memory
     into a box, which is exactly how a published figure goes wrong.

     Counted at the point the season the match belongs to had reached would be
     better and is harder; this is the season entire, which is right for a
     report written after it and slightly generous for one written in October.
     Stated as the season's final record so nothing reads as a claim about the
     day. */
  clubRecord: (() => {
    const byYear = {};
    for (const sn of (d.seasons || [])) {
      const inSeason = d.competitive.filter((m) => m.season === sn.name);
      if (!inSeason.length) continue;
      const all = teamSummary(inSeason);
      const lg = teamSummary(inSeason.filter(isLeague));
      byYear[sn.name] = {
        played: all.played, won: all.won, drawn: all.drawn, lost: all.lost,
        gf: all.goalsFor, ga: all.goalsAgainst,
        league: lg.played ? { played: lg.played, won: lg.won, drawn: lg.drawn, lost: lg.lost,
          gf: lg.goalsFor, ga: lg.goalsAgainst, points: lg.won * 3 + lg.drawn } : null,
      };
    }
    return byYear;
  })(),
  /* HOW LONG A MATCH REPORT SHOULD BE, defined once because three places ask:
     the gauge under the notes box, the line beside the Build button, and the
     brief the model is written to. Typed into each of them they would drift,
     and the one nobody re-reads would be the brief.

     700 to 900 is a full club-site report. It is worth knowing what that
     costs: a properly written incident runs 20 to 25 words, so seven hundred
     of them is roughly twenty timed moments plus the team news, the player
     records and the context. Two goals and no incidents cannot reach it, and
     the house rule against inventing anything means nothing will pad it out
     to look as though they had. */
  reportWords: { min: 700, max: 900, perMoment: 22, base: 150 },
  /* WHAT THE CLUB KNOWS ABOUT EACH PLAYER, so a match report can say
     something a person would say. The panel knew a name, a number and a
     position, so every report described eleven interchangeable men: it could
     not tell that one of Sunday's scorers had never played for the club and
     that the goalkeeper behind him kept thirteen clean sheets winning the
     league.

     COMPETITIVE ONLY, the same figures every page publishes, so a report
     cannot claim a total the stats page disagrees with. Zeroes are omitted
     rather than stored: two thirds of the fields are zero and the seed ships
     on every panel load. `f` is the first competitive appearance, which is
     what makes "his first" derivable rather than asserted. */
  history: Object.fromEntries(d.players
    .filter((p) => p.starts || p.subApps || p.goals)
    .map((p) => {
      const first = (p.matches || []).map((r) => isoById.get(r.id))
        .filter(Boolean).sort()[0] || '';
      const row = {};
      if (p.starts) row.a = p.starts;
      if (p.goals) row.g = p.goals;
      if (p.assists) row.as = p.assists;
      if (p.cleanSheets) row.cs = p.cleanSheets;
      if (p.motm) row.m = p.motm;
      if (p.captained) row.c = p.captained;
      if (first) row.f = first;
      return [p.num, row];
    })),
  /* Trialists. They are picked on a team sheet like anybody else and have no
     profile, no squad card and no place in any club record, which is what a
     trial is. Numbers run from 900 so they can never collide with a real one. */
  trialists: Object.entries(d.trialists || {})
    .map(([num, name]) => ({ num: Number(num), name })),
  /* The seasons the club has, so the photographs section can hold one picture
     per player per season and fall back to the default until this year's are
     taken. */
  seasons: (d.seasons || []).map((x) => x.name),
  currentSeason: d.currentSeason,
  /* Fixture fields per match, so opening an existing record shows the real
     date and scoreline instead of an empty form. Rows edited in the panel
     carry their own copy and win over this. */
  matches: d.rawMatches.map((m) => ({
    id: m.id, date: m.date || '', kick: m.kick || '', home: m.home || '', away: m.away || '',
    hs: m.hs, as: m.as, kind: m.kind || 'score', competition: m.competition || '',
    /* Which club a walkover was awarded to, H-W or A-W. Without it the form
       reopens a walkover with no winner and saving would quietly drop one. */
    wo: m.wo || '',
  })),
  /* How a goal was scored and how the chance was made, defined once in
     src/lib/football.mjs. The panel builds its dropdowns from this, so the
     words it offers and the words the website prints cannot drift apart. */
  vocab: VOCAB,
  /* Club crests, so the panel can DRAW a match-report cover: two badges, the
     score and the date. Names are matched exactly as the fixture list writes
     them, which is why a misspelt opponent silently loses its badge. */
  badges: Object.fromEntries(Object.entries(d.badges || {})
    .map(([name, b]) => [name, '/' + String(b.src || '').replace(/^\//, '')])),
  crest: '/assets/badge/sue-angels-badge-star.webp',
  /* Every position the site can name and draw, with its place on the pitch.
     The panel's dropdown and its team-sheet pitch both come from here, so the
     panel cannot offer a position the player pages have no name for, which is
     how RDM and LAM ended up in the archive as bare codes. */
  positions: POSITION_VOCAB,
  /* What a player can be ASKED to do from a position, and which positions each
     one attaches to. A role is extra information about a place, never a
     replacement for it, so the team sheet asks for both and everything derived
     from where somebody stood is untouched by it. */
  roles: ROLE_VOCAB,
  /* What a player can BE, and in which season. The panel's dropdown is built
     from `set`; `derived` is the three the site works out for itself (new
     signing, retained, back at the club) and is here so the editor can SHOW
     them beside a player without offering them as something to type. Defined
     once in src/lib/squad-status.mjs, so the panel and the website cannot
     describe the same player differently. */
  statuses: STATUS_VOCAB,
  /* Every season the club has had, and which one is current, so nothing in
     the panel has to carry a year in a string. "Retained for 26/27" was
     typed into two files and would have been wrong from July 2027. */
  seasons: (d.seasons || []).map((s) => s.name),
  currentSeason: d.currentSeason,
  /* The staff as the website builds them, so the panel's editor opens showing
     what the page actually shows, including the founding three that live in
     the site's own records rather than in a database row. */
  coaches: d.coaches.map((c) => ({
    id: c.id || c.slug, name: c.name, role: c.role || '', short: c.short || '',
    photo: c.photo || '', photoUrl: c.photoUrl || '', bio: c.bio || [],
  })),
};
/* The seed is DATA, and it grew: the squad, every match's fixture fields, the
   known clubs and competitions. Inlined it pushed control.js past its budget
   on its own. It ships as its own file loaded before the bundle, so it caches
   and busts independently of the code, and control.js goes back to being
   code. A plain script rather than a fetch, because the modules read
   window.SA_SEED synchronously as they define themselves. */
const adminSeedJs = `window.SA_SEED=${JSON.stringify(adminSeed)};\n`;
const seedV = crypto.createHash('sha256').update(adminSeedJs).digest('hex').slice(0, 8);
write('control-seed.js', adminSeedJs);

/* ---- Panel modules loaded on demand ----
   control.js carried all thirteen modules and handed every one of them to
   somebody who opened one; its budget went 16 -> 18 -> 24 -> 30KB in a single
   sitting, always for that reason. src/admin/lazy/*.js are the two heaviest,
   emitted as their own hashed files and fetched the first time their panel is
   opened. `10-match.js` ships as `control-match.js`: the number is only there
   to order the source folder, exactly as the page CSS bands work. */
const lazyDir = path.join(ROOT, 'src', 'admin', 'lazy');
const chunkUrls = {};
for (const f of fs.readdirSync(lazyDir).filter((x) => x.endsWith('.js')).sort()) {
  const name = f.replace(/^\d+-|\.js$/g, '');
  const body = minifyJs(fs.readFileSync(path.join(lazyDir, f), 'utf8'));
  const v = crypto.createHash('sha256').update(body).digest('hex').slice(0, 8);
  write(`control-${name}.js`, body);
  chunkUrls[name] = `control-${name}.js?v=${v}`;
}

adminJs = `window.SA_SUPABASE=${JSON.stringify(cfg.supabase)};window.SA_EMAIL=${JSON.stringify(CLUB.email)};`
  + `window.CP_CHUNKS=${JSON.stringify(chunkUrls)};\n${adminJs}`;
adminJs = minifyJs(adminJs);
const adminV = crypto.createHash('sha256').update(adminJs).digest('hex').slice(0, 8);
write('control.js', adminJs);

/* The panel's own stylesheet, linked by control.html and nowhere else.
   It used to be src/styles/70-control.css, which put it inside sa.css: the
   panel has always been private, but every visitor to the website was
   downloading its styling to render a page that cannot show any of it. */
const adminCssFiles = fs.readdirSync(path.join(ROOT, 'src', 'styles-control')).filter((f) => f.endsWith('.css')).sort();
const adminCss = minifyCss(absAssets(bundle('styles-control', adminCssFiles)));
const adminCssV = crypto.createHash('sha256').update(adminCss).digest('hex').slice(0, 8);
write('control.css', adminCss);

/* ---- Schema.org --------------------------------------------------------
   SportsTeam for the club, SportsEvent per match, Article per news item,
   BreadcrumbList on detail routes. */
/* The club node itself now lives in html.mjs and ships on EVERY page with a
   stable @id, so a crawler on a player profile or a match report can tie it
   back to the club. All that is left here is the part that belongs on the
   home page alone: the squad and the coaching staff, forty Person entries
   that would otherwise be repeated on all 100 pages for no extra signal.
   These are merged INTO the canonical club node rather than sitting beside it
   as a second, competing SportsTeam. */
const clubExtra = {
  coach: d.coaches.map((c) => ({ '@type': 'Person', name: c.name, jobTitle: c.role })),
  athlete: d.squad.slice(0, 40).map((p) => ({ '@type': 'Person', name: p.name, url: `${CLUB.site}/players/${p.slug}.html` })),
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

/* ---- Which routes are live ----
   The gate itself lives in src/lib/routes.mjs so the test suite reads the
   same list. The control panel is deliberately outside it: it is the admin
   app on its own bundle, not part of the public rebuild. */

/* ---- Static routes ---- */
const R = d.pages || {};
/* Detail routes generate their description from data, so it cannot simply be
   written to length the way the DESC map above is. This keeps them in the same
   120 to 155 band: append the next top-up clause while it is too short, and
   trim at a word boundary when it is too long. Truncating mid-word is what
   made one news description read "...and the club will trav". */
/* ---- Share cards --------------------------------------------------------
   Which 1200x630 card each route unfurls with, and what it says for anyone
   reading it through a screen reader on the platform that unfurled it.

   Every page used to share one og-default.png, so a link to the squad, a
   match report and the sponsorship page all looked identical in a message.
   Cards are generated by tools/social-cards.mjs and committed; that script is
   not part of `npm run build` because it needs Chrome and the copy changes
   about twice a season. */
const OG = {
  'index.html': ['og-home', 'Sue’s Angels FC: League Ten champions, played 18, won 18, unbeaten and promoted'],
  'about.html': ['og-about', 'Built in her name: Sue’s Angels FC, founded 2025 in memory of Susan Anne Martin'],
  'sepsis.html': ['og-sepsis', 'Sue’s Angels FC play for sepsis awareness. 48,000 lives lost a year in the UK'],
  'champions.html': ['og-champions', 'Champions, unbeaten: 18 played, 18 won, 90 scored, 54 points'],
  'awards.html': ['og-awards', 'Sue’s Angels FC awards and honours, and the best defensive record in League Ten history'],
  'sponsors.html': ['og-sponsors', 'Back the Angels: shirt, matchday and player sponsorship at Sue’s Angels FC'],
  'squad.html': ['og-squad', 'The Sue’s Angels FC squad: every player and every profile'],
  'stats.html': ['og-stats', 'Sue’s Angels FC player statistics: goals, assists and appearances'],
  'coaches.html': ['og-coaches', 'The coaching staff behind an unbeaten Sue’s Angels FC season'],
  'fixtures.html': ['og-fixtures', 'Sue’s Angels FC fixtures: League Eight, Sunday mornings at The Reeves'],
  'results.html': ['og-results', 'Every Sue’s Angels FC result: 33 matches across league and cups'],
  'league.html': ['og-league', 'Sue’s Angels FC top of the League Ten table with 54 points from 18 games'],
  'records.html': ['og-records', 'Sue’s Angels FC club records: goals, runs, clean sheets and club firsts'],
  'live.html': ['og-live', 'Sue’s Angels FC live and on replay, free to watch'],
  'news.html': ['og-news', 'Club news from Sue’s Angels FC: match reports and announcements'],
  'gallery.html': ['og-gallery', 'The Sue’s Angels FC gallery: 606 photographs across seven matchdays'],
  'videos.html': ['og-videos', 'Goals and highlights from Sue’s Angels FC'],
  'join.html': ['og-join', 'Join Sue’s Angels FC: play, volunteer, shoot or sponsor'],
  'contact.html': ['og-contact', 'Contact Sue’s Angels FC at The Reeves, Hanworth'],
  '404.html': ['og-404', 'Off target: that page does not exist on the Sue’s Angels FC website'],
};
const ogCard = (name) => `/assets/social/${name}.jpg`;

/* "1 starts" read like a bug because it was one. */
const plural = (n, word) => `${n} ${word}${Number(n) === 1 ? '' : 's'}`;

function fitDesc(primary, ...topUps) {
  const clean = (t) => String(t).replace(/\s+/g, ' ').trim();
  let out = clean(primary);
  /* Only take a top-up that FITS. Appending one and then trimming produced
     "Sue's Angels FC played at a…", a clause cut mid-thought, which is worse
     than simply being a few characters shorter. */
  const unused = [];
  for (const t of topUps) {
    const c = clean(t);
    if (out.length >= 120) { unused.push(c); continue; }
    if (out.length + 1 + c.length <= 155) out = `${out} ${c}`;
    else unused.push(c);
  }
  /* Still short and nothing fitted whole: take the SHORTEST leftover, which is
     the one most likely to survive intact. Taking the first instead is what
     left twelve match pages reading "Sue's Angels FC played at a…". */
  if (out.length < 120 && unused.length) {
    out = `${out} ${unused.slice().sort((a, b) => a.length - b.length)[0]}`;
  }
  if (out.length > 155) {
    const cut = out.slice(0, 154);
    const sp = cut.lastIndexOf(' ');
    out = `${(sp > 100 ? cut.slice(0, sp) : cut).replace(/[\s,;:.-]+$/, '')}…`;
  }
  return out;
}

/* ---- Meta descriptions, all of them, in one place -----------------------
   Every one is 120 to 155 characters. Shorter and the search engine pads the
   snippet with whatever text it scrapes off the page; longer and it truncates
   mid-sentence. Several also name the town, because "Sunday league football
   Hanworth" is a real search in a way that "Sunday league football" is not.
   The same string is reused for og:description, twitter:description and the
   JSON-LD description, so the three can never disagree. */
const DESC = {
  home: "London Sunday-league football club playing for sepsis awareness in memory of Susan Anne Martin. League Ten champions, unbeaten in our first season.",
  about: "How Sue's Angels FC began in 2025 in memory of Susan Anne Martin, and how a club built on one family's loss won its league unbeaten at the first try.",
  champions: "How Sue's Angels FC won League Ten unbeaten in 25/26: played 18, won 18, 90 goals scored, 11 conceded, 54 points and promotion to League Eight.",
  coaches: "The coaching staff behind Sue's Angels FC, the people who took a brand new Hanworth Sunday-league side to the League Ten title without losing a game.",
  join: "Play, volunteer, shoot or sponsor. Sue's Angels FC welcome new players and helpers for 26/27 at The Reeves in Hanworth. One form, reply in 48 hours.",
  live: "Watch Sue's Angels FC live and on replay. Match streams, highlights and every result from a Hanworth Sunday-league club, free and with no sign-up.",
  records: "Every Sue's Angels FC club record: most goals, most appearances, clean sheets, the longest winning runs, the biggest wins and the club's firsts.",
  sepsis: "Sue's Angels FC was founded in memory of Susan Anne Martin, who we lost to sepsis. Why we play, the signs of sepsis to know, and how to help.",
  squad: "Every player in the Sue's Angels FC first-team squad, grouped by position, with goals, assists and appearances on each player's own profile.",
  stats: "Sue's Angels FC player statistics for 25/26: goals, assists and appearances for every player, derived from the club's own match records.",
  contact: "How to reach Sue's Angels FC: the club email, Instagram, and The Reeves in Hanworth where we play our home matches on Sunday mornings.",
  fixtures: "Upcoming Sue's Angels FC fixtures across League Eight and the cups. Home matches are Sunday mornings at The Reeves in Hanworth, free to watch.",
  results: "Every Sue's Angels FC result from the unbeaten League Ten title season, across league and cups, each with its own line-up and match report.",
  league: "The full League Ten 25/26 table Sue's Angels FC won unbeaten, every result across the division, and the competition's leading goalscorers.",
  awards: "Sue's Angels FC awards and honours: Player of the Month, the 25/26 end of season winners, and the best defensive record in League Ten history.",
  sponsors: "Meet the businesses backing Sue's Angels FC, and how your company can sponsor a London Sunday-league club playing for sepsis awareness.",
  news: "Match reports, club announcements and the stories behind the badge, straight from Sue's Angels FC in Hanworth, south-west London.",
  gallery: "Matchday photography from Sue's Angels FC: 606 photographs across seven albums, shot by the people who give up their Sundays for the club.",
  videos: "Goals, highlights and clips from Sue's Angels FC, the Hanworth Sunday-league club that won League Ten unbeaten in its first season.",
};

/* The description written HERE wins; the recovered one from the old site is
   the fallback for a route that has not been given its own yet.

   It used to be the other way round, which meant ten pages shipped whatever
   the retired site happened to say. Those ran from 74 to 158 characters:
   too short and a search engine pads the snippet with whatever text it finds
   on the page, too long and it truncates mid-sentence. The band that survives
   intact is roughly 120 to 155, and the test suite now enforces it so this
   cannot quietly drift back. */
const meta = (slug, fallbackTitle, desc) => ({
  title: R[slug]?.title || fallbackTitle,
  description: DESC[slug] || desc || R[slug]?.desc || '',
});

const routes = [
  { file: 'index.html', tpl: () => home(d), ...meta('home', `${CLUB.name} - ${CLUB.division} Champions`,
      `London Sunday-league football club, founded in memory of ${CLUB.memorial.name}. ${CLUB.division} champions, unbeaten in our inaugural season.`),
    clubExtra },

  { file: 'about.html', tpl: () => about(d), ...meta('about', `Our story · ${CLUB.name}`,
      `The story of ${CLUB.name}, built in memory of ${CLUB.memorial.name}, supporting sepsis awareness.`) },

  { file: 'sepsis.html', tpl: () => cause(d), ...meta('sepsis', `Our cause: sepsis awareness · ${CLUB.name}`,
      `${CLUB.name} was founded in memory of ${CLUB.memorial.name}, who we lost to sepsis. Why we play, the signs of sepsis to know, and how to support the cause.`) },

  { file: 'champions.html', tpl: () => champions(d), ...meta('champions', `Champions · ${CLUB.name}`,
      `${CLUB.division} champions ${d.currentSeason}: the season in numbers, unbeaten and promoted.`) },

  { file: 'awards.html', tpl: () => awards(d), ...meta('awards', `Awards · ${CLUB.name}`,
      `${CLUB.name} Player of the Month, Man of the Match and end of season awards, plus the best defensive record in ${CLUB.division} history.`) },

  { file: 'squad.html', tpl: () => squad(d), ...meta('squad', `Squad · ${CLUB.name}`,
      `The ${CLUB.name} first-team squad, grouped by position. Tap any player for their full performance profile.`) },

  { file: 'stats.html', tpl: () => stats(d), ...meta('stats', `Player stats · ${CLUB.name}`,
      `${CLUB.name} player stats: goals, assists and appearances across the season, derived from our own match records.`) },

  { file: 'coaches.html', tpl: () => coaches(d), ...meta('coaches', `Coaches · ${CLUB.name}`,
      `Meet the coaching staff guiding ${CLUB.name}, the people shaping our ${CLUB.division} champions on and off the pitch.`) },

  { file: 'fixtures.html', tpl: () => fixtures(d), ...meta('fixtures', `Fixtures · ${CLUB.name}`,
      `Upcoming ${CLUB.name} fixtures across league and cups. Each one moves to the results page once it has been played.`) },

  { file: 'results.html', tpl: () => results(d), ...meta('results', `Results · ${CLUB.name}`,
      `Every ${CLUB.name} result across league and cups, from our unbeaten ${CLUB.division} title-winning season.`) },

  { file: 'league.html', tpl: () => league(d), ...meta('league', `League table · ${CLUB.name}`,
      `The full ${CLUB.division} ${d.currentSeason} table, every result across the division, and the league's leading scorers.`) },

  { file: 'records.html', tpl: () => records(d), ...meta('records', `Club records · ${CLUB.name}`,
      `Every ${CLUB.name} club record: honours, most goals, appearances, clean sheets, the longest runs and the club firsts.`) },

  { file: 'live.html', tpl: () => live(d), ...meta('live', `Live and replays · ${CLUB.name}`,
      `Watch ${CLUB.name} matches live and on replay, streamed from our YouTube channel.`) },

  { file: 'news.html', tpl: () => news(d), ...meta('news', `News · ${CLUB.name}`,
      `The latest from ${CLUB.name}: match reports, club announcements and the stories behind the badge.`) },

  { file: 'gallery.html', tpl: () => gallery(d), ...meta('gallery', `Gallery · ${CLUB.name}`,
      `Matchday photography from ${CLUB.name}, season by season.`) },

  { file: 'videos.html', tpl: () => videos(d), ...meta('videos', `Videos · ${CLUB.name}`,
      `${CLUB.name} matchday videos and highlights from our unbeaten ${CLUB.division} season.`) },

  { file: 'sponsors.html', tpl: () => sponsors(d), ...meta('sponsors', `Sponsors · ${CLUB.name}`,
      `Meet the partners backing ${CLUB.name}, and find out how your business can sponsor a London Sunday-league club with a cause at its heart.`) },

  { file: 'join.html', tpl: () => join(d), ...meta('join', `Join · ${CLUB.name}`,
      `Trials, volunteering, media and sponsorship. Join ${CLUB.name} for the new season.`) },

  { file: 'contact.html', tpl: () => contact(d), ...meta('contact', `Contact · ${CLUB.name}`,
      `Get in touch with ${CLUB.name}. Enquiries about trials, volunteering, media, sponsorship and the cause.`) },

  { file: '404.html', tpl: () => notFound(d), title: `Page not found · ${CLUB.name}`,
    description: "That page does not exist. Find Sue's Angels FC results, the squad, the league table, club news and how to get in touch from here instead.",
    noindex: true },
];

for (const r of routes) {
  if (!isLive(r.file)) continue;
  const out = r.tpl();
  write(r.file, page({
    title: r.title,
    description: r.description,
    path: `/${r.file}`,
    body: out.body,
    bodyClass: out.bodyClass || '',
    // A template may contribute its own structured data (the homepage FAQ,
    // a sub-page's own AboutPage/breadcrumb block).
    schema: [...(r.schema || []), ...(out.schema || []), ...(out.faqSchema ? [out.faqSchema] : [])],
    clubExtra: r.clubExtra || null,
    ogImage: ogCard((OG[r.file] || ['og-default'])[0]),
    ogImageAlt: (OG[r.file] || [, `${CLUB.name} club crest`])[1],
    noindex: r.noindex,
    // The homepage carries its own stylesheet, shell and footer.
    css: out.css || 'sa.css',
    pageCss: out.css === 'home.css' ? bandFor(r.file) : null,
    shell: out.shell,
    footerHtml: out.footerHtml,
    preMain: out.preMain,
    preloadImage: out.preloadImage,
    assetV: out.css === 'home.css' ? homeV : assetV,
    jsV: assetV,
  }));
}

/* ---- Control panel ----
   noindex, and it renders its own shell rather than the public header/footer. */
{
  const { body } = { body: control() };
  write('control.html', page({
    title: `Control panel · ${CLUB.name}`,
    description: 'Administrative control panel.',
    path: '/control.html',
    body,
    bodyClass: 'is-control',
    pageCss: { href: 'control.css', v: adminCssV },
    js: `control.js?v=${adminV}`,
    /* Loaded first and NOT deferred: the modules read window.SA_SEED as they
       define themselves, so it has to be there before the bundle runs. */
    preScript: `control-seed.js?v=${seedV}`,
    noindex: true,
    assetV,
    bare: true,
  }));
}

/* ---- Player profiles ---- */
const profilePlayers = groupLive('players') ? d.players.filter((p) => !p.unknown) : [];
for (const p of profilePlayers) {
  const out = playerPage(p, d);
  const pr = out.profile;
  write(`players/${p.slug}.html`, page({
    title: `${p.name} · ${CLUB.name}`,
    /* Starts, not appearances: the engine counts only the eleven named on a
       team sheet, so calling that figure appearances in a meta description
       would overstate it for anyone who mostly came off the bench. */
    description: fitDesc(
      `${p.name}, ${p.position} for ${CLUB.name}. ${plural(pr.starts, 'start')}, `
      + `${plural(pr.goals, 'goal')} and ${plural(pr.assists, 'assist')} in ${d.currentSeason}.`,
      `Part of the squad that won ${CLUB.division} unbeaten.`,
      `${CLUB.name}, ${CLUB.venue.district}.`,
      `Sunday-league football in south-west London.`),
    path: `/players/${p.slug}.html`,
    ogImage: ogCard('og-player'),
    ogImageAlt: `${p.name}, ${p.position} for ${CLUB.name}`,
    body: out.body,
    bodyClass: out.bodyClass,
    css: out.css,
    pageCss: bandFor('players/'),
    shell: out.shell,
    footerHtml: out.footerHtml,
    preMain: out.preMain,
    assetV: homeV,
    jsV: assetV,
    schema: [
      /* ProfilePage, not a bare WebPage that happens to mention a Person. It
         tells a crawler the page IS about this player, and mainEntity says
         which one, so "who plays centre back for Sue's Angels" has something
         to resolve against. */
      { '@type': 'ProfilePage', mainEntity: { '@id': `${CLUB.site}/players/${p.slug}.html#person` } },
      {
        '@type': 'Person',
        '@id': `${CLUB.site}/players/${p.slug}.html#person`,
        name: p.name,
        jobTitle: p.position,
        /* By reference: the club node is already in this page's graph. */
        memberOf: { '@id': CLUB_ID },
        url: `${CLUB.site}/players/${p.slug}.html`,
      },
      breadcrumb([{ label: 'Home', href: '/' }, { label: 'Squad', href: '/squad.html' }, { label: p.name, href: `/players/${p.slug}.html` }]),
    ],
  }));
}

/* ---- Match centre ----
   Every PLAYED match gets a page. A fixture with no result has nothing to
   report yet and lives on /fixtures.html until it does, so writing a page for
   one would only create a second empty URL. */
for (const m of (groupLive('matches') ? d.played : [])) {
  const out = matchReport(m, d);
  const desc = fitDesc(
    `${m.title}, ${m.competition}, ${fmtDate(m.date, { long: true })}.`,
    out.hasReport ? 'Line-ups, goals and the full match report.' : 'Line-ups, goals and the scorers.',
    m.homeAway === 'Neutral' ? 'Played at a neutral ground.' : `Played ${m.homeAway.toLowerCase()}.`,
    `${CLUB.name}, ${CLUB.venue.district}.`,
    `Sunday-league football in south-west London.`);
  write(`matches/${m.slug}.html`, page({
    title: `${m.title} · ${CLUB.name}`,
    description: desc,
    /* The drawn cover if the club has made one, which carries the two badges,
       the score and the date, and is far more use in a WhatsApp group than a
       generic card that says nothing about this match. Falls back to the
       generic one, so a match without a cover still shares properly. */
    ogImage: m.detail?.cover || ogCard('og-match'),
    ogImageAlt: `${m.title}, ${m.competition}, ${fmtDate(m.date, { long: true })}`,
    path: `/matches/${m.slug}.html`,
    body: out.body,
    bodyClass: out.bodyClass,
    css: out.css,
    pageCss: bandFor('matches/'),
    shell: out.shell,
    footerHtml: out.footerHtml,
    preMain: out.preMain,
    assetV: homeV,
    jsV: assetV,
    schema: [
      matchSchema(m),
      breadcrumb([{ label: 'Home', href: '/' }, { label: 'Results', href: '/results.html' }, { label: m.title, href: `/matches/${m.slug}.html` }]),
    ],
  }));
}

/* ---- Articles ---- */
for (const a of (groupLive('news') ? d.articles : [])) {
  const slug = articleSlug(a);
  const out = newsArticle(a, d);
  write(`news/${slug}.html`, page({
    title: `${a.title} · ${CLUB.name}`,
    description: fitDesc(String(a.lede || a.title), `${CLUB.name}, ${CLUB.venue.district}.`),
    /* The article's own cover, drawn or photographed, in preference to the
       generic news card. */
    ogImage: a.cover || ogCard('og-news'),
    ogImageAlt: `${a.title} - ${CLUB.name}`,
    path: `/news/${slug}.html`,
    body: out.body,
    bodyClass: out.bodyClass,
    css: out.css,
    pageCss: bandFor('news/'),
    shell: out.shell,
    footerHtml: out.footerHtml,
    preMain: out.preMain,
    assetV: homeV,
    jsV: assetV,
    schema: [
      ...out.schema,
      breadcrumb([{ label: 'Home', href: '/' }, { label: 'News', href: '/news.html' }, { label: a.title, href: `/news/${slug}.html` }]),
    ],
  }));
}

/* ---- Gallery albums ---- */
for (const g of (groupLive('gallery') ? d.galleries : [])) {
  const out = galleryAlbum(g, d);
  write(`gallery/${g.slug}.html`, page({
    title: `${g.title} · ${CLUB.name}`,
    description: fitDesc(
      `${g.photoCount} matchday photographs from ${splitTitle(g.title).fixture}.`,
      g.photographer ? `Shot by ${g.photographer} for ${CLUB.name}.` : `${CLUB.name} matchday photography.`,
      `${CLUB.name}, ${CLUB.venue.district}.`,
      `Sunday-league football in south-west London.`),
    path: `/gallery/${g.slug}.html`,
    /* An album's own cover photograph is a far better share image than a
       generated card, and all seven albums have one. Absolute already, since
       these are served from Supabase storage. */
    ogImage: g.cover || ogCard('og-gallery'),
    ogImageAlt: `${splitTitle(g.title).fixture}, ${g.photoCount} matchday photographs`,
    body: out.body,
    bodyClass: out.bodyClass,
    css: out.css,
    pageCss: bandFor('gallery/'),
    shell: out.shell,
    footerHtml: out.footerHtml,
    preMain: out.preMain,
    assetV: homeV,
    jsV: assetV,
    schema: [
      ...out.schema,
      breadcrumb([{ label: 'Home', href: '/' }, { label: 'Gallery', href: '/gallery.html' }, { label: g.title, href: `/gallery/${g.slug}.html` }]),
    ],
  }));
}

/* ---- Sitemap, robots, manifest ---- */
// 404 and the control panel are noindex, so neither belongs in the sitemap.
const NO_SITEMAP = new Set(['404.html', 'control.html']);
const urls = written
  .filter((f) => f.endsWith('.html') && !NO_SITEMAP.has(f))
  .map((f) => (f === 'index.html' ? '/' : `/${f}`));

/* lastmod PER URL, from the content itself. Every URL used to carry the same
   date, so a match report from September 2025 and a page rebuilt this morning
   both claimed the same day. That is not wrong so much as useless: a crawler
   uses lastmod to decide what to re-fetch, and a single site-wide date tells
   it either everything changed or nothing did.

   Detail routes date from their own content. Static routes take the newest
   content date in the dataset rather than the wall clock, so a rebuild with no
   content change does not churn the whole sitemap and cry wolf. */
const iso10 = (v) => (v ? String(v).slice(0, 10) : '');
const newest = [
  ...d.played.map((m) => iso10(m.iso || m.date)),
  ...d.articles.map((a) => iso10(a.updatedAt || a.iso)),
  ...d.galleries.map((g) => iso10(g.date)),
].filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)).sort();
const siteDate = newest[newest.length - 1] || new Date().toISOString().slice(0, 10);

const lastmodFor = (u) => {
  if (u.startsWith('/matches/')) {
    const m = d.played.find((x) => `/matches/${x.slug}.html` === u);
    return iso10(m?.iso || m?.date) || siteDate;
  }
  if (u.startsWith('/news/')) {
    const a = d.articles.find((x) => `/news/${articleSlug(x)}.html` === u);
    return iso10(a?.updatedAt || a?.iso) || siteDate;
  }
  if (u.startsWith('/gallery/')) {
    const g = d.galleries.find((x) => `/gallery/${x.slug}.html` === u);
    return iso10(g?.date) || siteDate;
  }
  return siteDate;
};
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${CLUB.site}${u}</loc><lastmod>${lastmodFor(u)}</lastmod><changefreq>${u === '/' ? 'daily' : 'weekly'}</changefreq><priority>${u === '/' ? '1.0' : u.includes('/players/') || u.includes('/matches/') ? '0.6' : '0.8'}</priority></url>`).join('\n')}
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
    { src: '/assets/brand/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/assets/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/assets/brand/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
  ],
}, null, 2));

/* Favicons and the crest itself are real raster assets generated from the
   brand crest (see scripts/make-icons.py). Nothing to emit here. */

/* ---- Report ---- */
const kinds = written.reduce((acc, f) => {
  const k = f.includes('/') ? f.split('/')[0] : path.extname(f).slice(1);
  acc[k] = (acc[k] || 0) + 1;
  return acc;
}, {});

console.log(`${CHECK ? 'CHECK' : 'BUILD'} complete`);
console.log(`asset version: ${assetV} (home ${homeV})`);
console.log(`css: ${cssFiles.join(', ')} -> sa.css (${(Buffer.byteLength(css) / 1024).toFixed(1)} KB)`);
console.log(`home css: ${homeCssFiles.join(', ')} -> home.css (${(Buffer.byteLength(homeCss) / 1024).toFixed(1)} KB)`);
console.log(`js:  ${jsFiles.join(', ')} -> sa.js (${(Buffer.byteLength(js) / 1024).toFixed(1)} KB)`);
console.log(`files: ${written.length}, total ${(bytes / 1024).toFixed(0)} KB`);
console.log('by group:', JSON.stringify(kinds));
/* Counted from what was written, not from the dataset: while the site is
   rebuilt page by page most of the dataset has no route, and reporting the
   dataset here would read as "33 matches built" when none were. */
const wrote = (dir) => written.filter((f) => f.startsWith(`${dir}/`)).length;
console.log(`routes: ${written.filter((f) => f.endsWith('.html') && !f.includes('/')).length} static, `
  + `${wrote('players')} players, ${wrote('matches')} matches, ${wrote('news')} articles, ${wrote('gallery')} albums`);
/* The held-back list and PENDING_ROUTES must describe the same set, or the
   test suite starts excusing a link the rebuild has actually reached. */
const held = routes.filter((r) => !isLive(r.file)).map((r) => r.file);
const drift = [
  ...held.filter((f) => !PENDING_ROUTES.has(f)).map((f) => `held but not pending: ${f}`),
  ...[...PENDING_ROUTES].filter((f) => !held.includes(f)).map((f) => `pending but not held: ${f}`),
];
if (drift.length) {
  console.error(`\nROUTE GATE DRIFT - fix src/lib/routes.mjs:\n  ${drift.join('\n  ')}`);
  process.exitCode = 1;
}
console.log(`NOT BUILT (${held.length} routes awaiting rebuild): ${held.join(' ')}`);
console.log(`sitemap urls: ${urls.length}`);

/* ==========================================================================
   A PAGE FOR A RECORD THAT NO LONGER EXISTS

   The generator wrote files and never removed one. Delete an article in the
   control panel and its page kept serving at the same URL for good: gone from
   the news feed, gone from the sitemap, still there for anyone holding the
   link, still in Google. Same for a deleted album, and for a match whose id
   changed. It surfaced here as a probe article that outlived the record it
   came from and broke the sitemap check on the next run.

   Only these four directories, which the build owns completely: every file in
   them is one route per record and nothing else is ever put there. Assets,
   the root pages and anything hand-written are not touched. --check writes
   nothing, so it removes nothing either.

   Reported rather than silent. A build that quietly deletes files is a build
   nobody trusts, and if this ever removes something it should not, the line
   it prints is the evidence. */
if (!CHECK) {
  const OWNED = ['news', 'matches', 'players', 'gallery'];
  const kept = new Set(written);
  const orphans = [];
  for (const dir of OWNED) {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) continue;
    for (const name of fs.readdirSync(full)) {
      if (!name.endsWith('.html')) continue;
      const rel = `${dir}/${name}`;
      if (kept.has(rel)) continue;
      fs.unlinkSync(path.join(ROOT, rel));
      orphans.push(rel);
    }
  }
  if (orphans.length) {
    console.log(`removed ${orphans.length} page(s) whose record is gone: ${orphans.join(' ')}`);
  }
}
