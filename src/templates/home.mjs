/* ==========================================================================
   HOMEPAGE
   Reconstructed to the supplied reference composition, band for band:

     hero (framed badge still, in-frame nav, next-match glass)
     ticker
     01 club news        05 recent results
     02 more than a result   06 the table
     03 award winners    07 ask the Angels
     04 the campaign     08 pull on the shirt
     footer (sitemap slab)

   The page carries its own stylesheet (home.css), its own header inside the
   hero frame and its own footer, because none of that composition is shared
   with the rest of the site.

   Every published figure is still derived by the stats engine. The editorial
   scaffolding the reference injects with JavaScript (section rails, the geo
   line field, the grid lines) is emitted here instead, so it survives with
   scripting blocked.
   ========================================================================== */
import { esc, attr, clubCrest, NAV } from '../lib/html.mjs';
import { photoCredit } from './gallery.mjs';
import { sizeAttrs } from '../lib/imagesize.mjs';
import {
  CLUB, SPONSORS, SPONSOR_TIERS, FAQS, NEXT_FIXTURE, SEASON_AWARDS, SOCIALS,
  JOIN_PATHS, JOIN_FAQS,
} from '../lib/club.mjs';
import {
  teamSummary, formGuide, isLeague, clubRecords, milestones, leaderboard,
  currentRun, goalKinds, opponentRecords, byCompetition, homeAwaySplit, longestRun,
  winMargins, commonScorelines, byMonth, penaltyRecord, disciplineRecord,
  formationUse, venueRecords, squadShape, scoringRuns, clubFirsts,
  goalsByGroup, heaviestDefeats, scoringRate,
} from '../lib/stats.mjs';
import {
  publishedBands, featuredFor, onThisDay, potmLatest, honoursIn, newFaces,
  previewFor, otherResults, leadershipIn, recordHoldersIn, reportsIn, albumsIn,
  potmAll, photographersIn,
} from '../lib/home-layout.mjs';
import { preseasonFor, seasonAhead, sameClub, relatedClub, recordOf } from '../lib/preseason.mjs';
import { reportText, house, FRIENDLY_NOTE_SHORT, FRIENDLY_NOTE } from '../lib/prose.mjs';

/* THE OPENING OF A REPORT, for the front page to quote.

   Two paragraphs, and only ones that are prose. A report can open on a
   markdown heading, and it closes on the MATCH DETAILS block, which is a
   line-up and a list of figures: pulled onto the home page as a teaser it
   would read as a wall of names under a headline. */
function reportOpening(m, take = 2) {
  return house(reportText(m))
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter((p) => p && !/^#/.test(p) && !/^MATCH DETAILS\b/.test(p))
    .slice(0, take);
}

const STAR = '/assets/badge/sue-angels-badge-star.webp';

/* The navigation tree is defined once, in the shell, and reused by the hero
   nav, the mobile menu and the footer sitemap so the three cannot drift. */
const NAV_TREE = NAV;

/* Match furniture uses two compact date forms the shared formatter does not
   cover: "Sep 25" on the season timeline and "31 May 26" on result cards. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const parts = (str) => {
  const d = new Date(`${String(str).slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
};
const monthYear = (str) => {
  const d = parts(str);
  return d ? `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}` : '';
};
const dayMonthYear = (str) => {
  const d = parts(str);
  return d ? `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}` : '';
};

/* Reference strip on the right of each section rail, cycled as the reference
   does. The season is filled in by the caller rather than typed, so this
   line does not quietly become a claim about a year that has been and gone. */
const railRefs = (d) => {
  /* Called once with a stub before the dataset exists, so everything here has
     to survive being handed almost nothing. */
  const div = d.divisionOf ? d.divisionOf(d.nextSeason) : '';
  /* AND THE RECORD IS DERIVED TOO. "P18 W18 · Unbeaten" was typed into this
     list, which is the same fault as the division on a slower fuse: true
     today, wrong the first time the club loses a league match, and sitting in
     a strip of quiet reference marks where nobody would think to look. */
  const lg = d.divisionOf && d.competitive
    ? d.competitive.filter((m) => m.season === d.currentSeason && isLeague(m))
    : [];
  const w = lg.filter((m) => m.outcome === 'W').length;
  const record = lg.length
    ? `P${lg.length} W${w}${w === lg.length ? ' · Unbeaten' : ''}`
    : 'Est. 2025';
  return [
    'Est. 2025',
    div ? `${div} · ${d.nextSeason}` : 'Sunday league',
    'The Reeves, Hanworth',
    '51.43° N / 0.40° W',
    record,
  ];
};
/* Filled in by home() before anything renders. The season used to be typed
   into the list, which made a strip of quiet reference marks carry a claim
   about a year that would go out of date on its own. */
let RAIL_REF = railRefs({ nextSeason: '' });

/* WHICH NUMBER EACH BAND WEARS, filled in by home() once the published order
   is known. It used to be typed at the call site, 1 through 8, which was true
   for exactly one arrangement of the page: the moment the club hid a band or
   moved one, the strip read 01, 03, 02, 04 down the page, or started at 02.
   Same fault as a typed season, on a shorter fuse.

   Keyed by band rather than positional for the same reason RAIL_REF is a
   module-level let: the bands are built as template literals in source order,
   long before anything knows which of them the club publishes. */
let RAIL_N = {};
const rail = (key, label) => {
  const n = RAIL_N[key] || 1;
  return `<div class="xrail" aria-hidden="true">
      <span class="xrail__l"><span class="xrail__n">${esc(String(n).padStart(2, '0'))}</span><span class="xrail__t">${esc(label)}</span></span>
      <span class="xrail__r">${esc(RAIL_REF[(n - 1) % RAIL_REF.length])}</span>
    </div>`;
};

/* Opponent badge as a bare image, the way the reference draws it. Falls back
   to the shared lettered mark when the club has no badge on file.

   The registry is keyed by a club's registered name but each record also
   carries a `match` fragment, because the same club appears under more than
   one name across the records ("BPR FC" holds the badge, the league table
   calls them "BPR Men's"). Exact-key lookup alone drops those badges. */
/* A club is written differently on a team sheet than in the badge registry,
   and it is always the SAME club: "Sutton Knights B" and "Sutton Knights",
   "Barking Mad" and "Barking Mad FC", "Woking Veterans Sundays" and "Woking
   Vets FC". Seven of the eight clubs with no badge on the site had one sitting
   in assets/badge/ the whole time, filed under the other spelling.

   So a club name is reduced to the part that identifies the CLUB: the legal
   suffix, the team qualifier and the competition-day noise come off. Matching
   is on EQUALITY of the reduced forms, never on one containing the other,
   because a badge on the wrong club is worse than no badge at all. */
const clubKey = (name) => String(name || '')
  .toLowerCase()
  .replace(/[’']/g, '')
  .replace(/\b(fc|afc|cf)\b/g, ' ')
  .replace(/\b(1st|2nd|3rd|first|second|third)\s*(team|xi)?\b/g, ' ')
  .replace(/\b(reserves?|vets|veterans|seniors|mens|ladies|womens|youth)\b/g, ' ')
  .replace(/\b(sunday|sundays|saturday|saturdays)\b/g, ' ')
  .replace(/\b[abc]\b\s*$/, ' ')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

/* Where a club's crest lives, or '' if it has none. Three places in order,
   then a needle, so "Woking Veterans Sundays" finds the Woking Vets badge.
   Factored out of oppBadge() because two other callers want the address
   rather than the markup, and a second copy of this chain is a second chance
   for it to disagree with itself. */
export function oppBadgeSrc(name, badges) {
  let rec = badges?.[name];
  if (!rec && badges) {
    const needle = String(name || '').toLowerCase();
    rec = Object.values(badges).find((r) => r && r.match && needle.includes(String(r.match).toLowerCase()));
  }
  if (!rec && badges) {
    const key = clubKey(name);
    if (key) {
      const hit = Object.entries(badges).find(([club]) => clubKey(club) === key);
      rec = hit && hit[1];
    }
  }
  const src = typeof rec === 'string' ? rec : rec?.src;
  if (!src) return '';
  return src.startsWith('/') ? src : `/${src}`;
}

export function oppBadge(name, badges, w, h, cls = '') {
  const path = oppBadgeSrc(name, badges);
  if (!path) return clubCrest(name, badges, cls);
  return `<img${cls ? ` class="${attr(cls)}"` : ''} src="${attr(path)}" alt="" width="${attr(w)}" height="${attr(h)}" loading="lazy" decoding="async" />`;
}

/* Club names read short on match furniture, the way a scoreboard writes them. */
const shortClub = (name) => String(name || '')
  .replace(/^Sue.s Angels FC$/, "Sue's Angels")
  .replace(/\s+FC$/, '');

/* Small inline marks, taken from the reference. Each one carries an explicit
   size: an SVG with no intrinsic size falls back to 300x150. */
const SVG = {
  star: '<svg class="spark" viewBox="0 0 16 16" width="10" height="10" fill="currentColor" aria-hidden="true"><path d="M8 1l1.5 5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5z"/></svg>',
  chev: (d) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`,
  caret: '<svg class="hx__chev" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  clock: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>',
  ball: '<svg class="hx__mi" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.4l4.3 3.1-1.6 5h-5.4l-1.6-5z"/><path d="M12 3.2v4.2M4 10.2l4.3 3.2M20 10.2l-4.3 3.2M7.3 20.4l1.9-4.9M16.7 20.4l-1.9-4.9"/></svg>',
  pin: '<svg class="hx__mi" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21.5s6.5-5.8 6.5-10.5a6.5 6.5 0 1 0-13 0c0 4.7 6.5 10.5 6.5 10.5z"/><circle cx="12" cy="10.8" r="2.5"/></svg>',
  heroStar: '<svg class="hx__star" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2l-6.1 3.4 1.4-6.8L2.2 9.1l6.9-.8L12 2z"/></svg>',
  arrowOut: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg>',
  send: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  up: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
  target: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="0.6" fill="currentColor"/></svg>',
  pitch: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 5v14M3 12h18"/><circle cx="12" cy="12" r="2.4"/></svg>',
  trophy: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M8 4h8v4a4 4 0 0 1-8 0z"/><path d="M8 6H5a2 2 0 0 0 2 2M16 6h3a2 2 0 0 1-2 2"/><path d="M10 13h4M12 12v3M9 20h6l-.5-4h-5z"/></svg>',
  goal: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 7.5l4.3 3.1-1.6 5h-5.4l-1.6-5z"/></svg>',
  trend: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 16l5-6 4 4 8-9"/><path d="M20 5h-4M20 5v4"/></svg>',
  shieldTick: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.5 3c.3 2 1.6 3.4 3.5 3.6v2.6c-1.3 0-2.5-.4-3.5-1.1v6.2a5.3 5.3 0 1 1-5.3-5.3c.3 0 .6 0 .9.1v2.7a2.6 2.6 0 1 0 1.8 2.5V3h2.6z"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23 12s0-3-.4-4.4a2.5 2.5 0 0 0-1.8-1.8C19.4 5.4 12 5.4 12 5.4s-7.4 0-8.8.4a2.5 2.5 0 0 0-1.8 1.8C1 9 1 12 1 12s0 3 .4 4.4a2.5 2.5 0 0 0 1.8 1.8c1.4.4 8.8.4 8.8.4s7.4 0 8.8-.4a2.5 2.5 0 0 0 1.8-1.8C23 15 23 12 23 12zM9.8 15.3V8.7l5.7 3.3z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14.5 8.5h2.2V5.6h-2.4c-2.3 0-3.7 1.4-3.7 3.8v1.5H8.4v3h2.2V21h3.2v-7.1h2.3l.4-3h-2.7V9.6c0-.8.3-1.1 1.1-1.1z"/></svg>',
  sun: '<svg class="tsw__ico tsw__ico--sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M3 12h2M19 12h2M5.6 18.4l1.4-1.4M17 7l1.4-1.4"/></svg>',
  moon: '<svg class="tsw__ico tsw__ico--moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>',
};

const ARROW = '<span aria-hidden="true">→</span>';

/* Bars are drawn here rather than in the browser so the charts exist with
   scripting blocked. Geometry matches the reference exactly. */
function bars(values, { max, min = 2, fill } = {}) {
  const N = values.length;
  const W = 120, H = 34, gap = 0.9;
  const bw = (W - (N - 1) * gap) / N;
  const top = max || Math.max(...values) || 1;
  return values.map((v, i) => {
    const h = Math.max(min, (v / top) * (H - 1));
    const f = fill ? fill(v, i) : '';
    return `<rect x="${(i * (bw + gap)).toFixed(2)}" y="${(H - h).toFixed(2)}" width="${bw.toFixed(2)}" height="${h.toFixed(2)}" rx="${Math.min(1.4, bw / 2).toFixed(2)}"${f ? ` fill="${f}"` : ''}/>`;
  }).join('');
}

export function home(d) {
  RAIL_REF = railRefs(d);

  /* WHAT THIS PAGE SHOWS, AND IN WHAT ORDER, decided before a single band is
     built because the reference strip numbers them from it. Set in Control
     panel -> Home page; with no record this is the standard order and the page
     is identical to the one that shipped. See lib/home-layout.mjs. */
  const shown = publishedBands(d.homeLayout, d);
  RAIL_N = {};
  shown.forEach((k, i) => { RAIL_N[k] = i + 1; });
  const all = teamSummary(d.competitive);
  const league = teamSummary(d.played.filter(isLeague));
  /* The form strip reads left to right in the order the games were played. */
  const form = formGuide(d.competitive, 6).slice().reverse();
  /* Per-match rates are quoted over every match played, not only the ones
     carrying a goal record, which is how the published figures read. */
  const goalsPerGame = (all.goalsFor / Math.max(all.played, 1)).toFixed(1);
  const cleanPct = Math.round((all.cleanSheets / Math.max(all.played, 1)) * 100);

  const ordered = d.played.slice().sort((a, b) => (a.iso || '').localeCompare(b.iso || ''));
  const scored = ordered.filter((m) => m.countsGoals);
  const recent = d.played.slice().sort((a, b) => (b.iso || '').localeCompare(a.iso || '')).slice(0, 7);
  const news = d.articles.slice(0, 6);
  /* THE NEXT MATCH IS THE NEXT ONE, not the earliest one on the list. This
     used to take the first fixture by date whether or not that date had been
     and gone, so the morning after a game the home page still led with it and
     the countdown beside it ran backwards. dataset.mjs works it out once and
     every page that needs it reads the same answer. */
  const next = d.nextFixture || NEXT_FIXTURE;

  /* AND WHAT COMES AFTER IT, because a static page has a stale idea of today.

     `next` is right when the build runs and wrong from the first whistle of
     that match until somebody publishes again. Between two pre-season
     friendlies that is a week of the home page leading with a game that has
     been played and a countdown reading "Kick-off".

     So the card carries the rest of the fixture list with it and the script
     moves it on. Nothing is hidden behind that: with the script blocked the
     page shows the build's answer, which is the correct one at the moment it
     was published, and every field is real markup either way. */
  const upcomingData = (d.upcoming || []).map((f) => ({
    home: f.weAreHome ? CLUB.name : f.opponent,
    away: f.weAreHome ? f.opponent : CLUB.name,
    weAreHome: Boolean(f.weAreHome),
    label: f.label || f.competition || '',
    competition: f.competition || '',
    venue: f.venue || '',
    kick: f.kick || '',
    date: f.dateLabel || dayMonthYear(f.iso || f.date),
    at: f.isoDateTime || '',
    badge: oppBadgeSrc(f.opponent, d.badges),
    them: f.opponent,
    initials: String(f.opponent || '').split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase(),
  }));

  /* ================= HERO ================= */
  const navGroups = NAV_TREE.map((item) => `<div class="hx__navgrp">
              <button class="hx__navtop hx__navtrig" type="button" aria-expanded="false">${esc(item.label)} ${SVG.caret}</button>
              <div class="hx__dd">
                ${item.children.map((c) => `<a href="${attr(c.href)}">${esc(c.label)}</a>`).join('\n                ')}
              </div>
            </div>`).join('\n            ');

  const homeIsAway = !next.weAreHome;
  const usSide = `<div class="hx__side" data-nx-us>
                <span class="hx__crest"><img src="${STAR}" alt="${attr(CLUB.name)} crest" width="48" height="60" loading="lazy" decoding="async" /></span>
                <b>Sue's Angels</b>
                <span class="hx__ha" data-nx-usha>${homeIsAway ? 'Away' : 'Home'}</span>
              </div>`;
  const themSide = `<div class="hx__side" data-nx-them>
                <span class="hx__crest" data-nx-crest>${oppBadge(next.badgeName || next.opponent, d.badges, 48, 48)}</span>
                <b data-nx-club>${esc(shortClub(next.opponent))}</b>
                <span class="hx__ha" data-nx-themha>${homeIsAway ? 'Home' : 'Away'}</span>
              </div>`;

  /* The club's own banner if it has chosen one in the panel, and the one the
     site ships with otherwise. Both carry the same three widths, so the page
     is identical in shape either way and a phone never downloads the large
     file. */
  const heroPic = d.hero || {
    src: '/assets/hero/kit-crest-1344.webp',
    srcset: '/assets/hero/kit-crest-640.webp 640w, /assets/hero/kit-crest-960.webp 960w, /assets/hero/kit-crest-1344.webp 1344w',
    alt: '',
  };

  const hero = `<section class="hx" aria-label="${attr(CLUB.name)}">
      <div class="hx__frame">

        <img class="hx__bg" src="${attr(heroPic.src)}"
             srcset="${attr(heroPic.srcset)}"
             sizes="100vw" alt="${attr(heroPic.alt)}"${heroPic.alt ? '' : ' aria-hidden="true"'} width="1344" height="752"
             fetchpriority="high" decoding="async" />
        <div class="hx__shade" aria-hidden="true"></div>

        <header class="hx__nav">
          <a class="hx__brand" href="#top" aria-label="${attr(CLUB.name)}, back to top">
            <img src="${STAR}" alt="" width="40" height="50" decoding="async" />
            <span>Sue's Angels FC</span>
          </a>
          <nav class="hx__mainnav" aria-label="Main">
            <a class="hx__navtop" href="/" aria-current="page">Home</a>
            ${navGroups}
          </nav>
          <div class="hx__navright">
            <a class="hx__join" href="/join.html">Join the club</a>
            <button class="hx__burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mnav">
              <span></span><span></span><span></span>
            </button>
          </div>
        </header>

        <h1 class="hx__title">
          <span class="hx__l1 drop" style="--dd:.05s">Built in</span>
          <span class="hx__l2 drop" style="--dd:.16s">her name.</span>
          <span class="hx__l3 drop" style="--dd:.27s">For each other.</span>
        </h1>

        <div class="hx__foot">
          <div class="hx__left">
            <p class="hx__about drop" style="--dd:.38s">${esc(CLUB.name)} is a Sunday league football
              family from south-west London, founded in ${esc(CLUB.founded)} in memory of ${esc(CLUB.memorial.name)} and
              playing for sepsis awareness.</p>

            <p class="hx__record drop" style="--dd:.46s">
              ${SVG.heroStar}
              <b>${esc(league.won)} wins from ${esc(league.played)}</b>
              <span>${esc(d.divisionOf(d.currentSeason))} Champions ${esc(d.currentSeason)}</span>
            </p>

            <div class="hx__sponsors drop" style="--dd:.54s" aria-label="Club partners">
              <span class="hx__sponsorlabel">Proudly backed by</span>
              <div class="hx__chips">
                ${SPONSORS.slice(0, 4).map((s) => `<a class="hx__chip" href="/sponsors.html" aria-label="${attr(`${s.name}, ${s.tier}`)}"><img src="${attr(s.logo)}" alt="${attr(s.name)}"${sizeAttrs(s.logo)} loading="lazy" decoding="async" /></a>`).join('\n                ')}
              </div>
            </div>
          </div>

          <!-- role="group", not <aside>. A complementary landmark is supposed to
               be top level; this one is nested inside the hero, so it showed up
               as a landmark in the wrong place in the document outline. It is a
               labelled card, not a section of the page. -->
          <div class="hx__card glassbox drop" style="--dd:.3s" role="group" aria-label="Next match"
            data-next-match data-upcoming="${attr(JSON.stringify(upcomingData))}">
            <p class="hx__cardlabel" data-nx-label>Next match${next.competition ? ` · ${esc(next.label || next.competition)}` : ''}</p>

            <div class="hx__fixture">
              ${homeIsAway ? themSide : usSide}
              <span class="hx__vs" aria-hidden="true">v</span>
              ${homeIsAway ? usSide : themSide}
            </div>

            <div class="hx__cells">
              <span class="hx__cell">
                ${SVG.calendar}
                <span><small>Date</small><i data-nx-date>${esc(next.dateLabel || dayMonthYear(next.iso || next.date))}</i></span>
              </span>
              <span class="hx__cell">
                ${SVG.clock}
                <span><small>Kick-off</small><i data-nx-kick>${esc(next.kick || 'TBC')}</i></span>
              </span>
            </div>

            <div class="hx__meta">
              <div class="hx__metacell">
                ${SVG.ball}
                <span class="hx__metatext"><small>Fixture</small><b data-nx-comp>${esc(next.competition)}</b></span>
              </div>
              <div class="hx__metacell">
                ${SVG.pin}
                <span class="hx__metatext"><small>Venue</small><b data-nx-venue>${esc(next.venue || 'TBC')}</b></span>
              </div>
            </div>

            <div class="hx__countdown">
              <span class="hx__cdlabel">Countdown</span>
              <p class="hx__cd" data-kick="${attr(next.isoDateTime || '')}">&nbsp;</p>
            </div>

            <a class="hx__cta" href="/fixtures.html">View fixtures</a>
          </div>
        </div>

      </div>
    </section>`;

  /* ================= TICKER ================= */
  const tickerSet = [
    `Played ${league.played}`,
    `Won ${league.won}`,
    'Unbeaten',
    `${d.divisionOf(d.currentSeason)} Champions ${d.currentSeason}`,
    `Promoted to ${d.divisionOf(d.nextSeason)}`,
    { motto: CLUB.memorial.motto.replace(/\.$/, '') },
  ].map((t) => (typeof t === 'object'
    ? `<span class="ticker__motto">${esc(t.motto)}</span><i></i>`
    : `<span>${esc(t)}</span><i></i>`)).join('');

  const ticker = `<div class="ticker" aria-hidden="true">
      <div class="ticker__track">${tickerSet}${tickerSet}</div>
    </div>`;

  /* ================= 01 CLUB NEWS ================= */
  const newsBand = news.length ? `<section class="sec sec--news" id="news" aria-labelledby="news-h">
      <div class="wrap">
        ${rail('news', 'Club news')}
        <div class="nhead rv">
          <div>
            <p class="eyebrow">Off the pitch</p>
            <h2 class="h2" id="news-h">Club news<span class="volt">.</span></h2>
          </div>
          <a class="nhead__all" href="/news.html">All news ${ARROW}</a>
        </div>

        <div class="ncar rv">
          <button class="ncar__arrow ncar__arrow--prev" type="button" data-ndir="-1" aria-label="Previous news">
            ${SVG.chev('M15 5l-7 7 7 7')}
          </button>

          <ol class="nrail" id="nrail">
            ${news.map((a) => `<li class="ncard">
              <!-- The label must CONTAIN the link's visible text (WCAG 2.5.3),
                   and the only visible text in here is the category pill. Just
                   the headline meant a voice-control user saying "click News"
                   hit nothing. Category first, then the headline. -->
              <a class="ncard__cover" href="/news/${attr(a.slug)}.html" aria-label="${attr(`${a.category}: ${a.title}`)}">
                ${a.cover
                  ? `<img class="ncard__photo" src="${attr(a.cover)}" alt="" width="320" height="320" loading="lazy" decoding="async" />`
                  : `<span class="ncard__badge"><img src="${STAR}" alt="" width="120" height="148" loading="lazy" decoding="async" /></span>`}
                <span class="ncard__pill">${esc(a.category)}</span>
              </a>
              <h3 class="ncard__title"><a href="/news/${attr(a.slug)}.html">${esc(a.title)}</a></h3>
              <span class="ncard__meta">${esc(a.date)}</span>
            </li>`).join('\n            ')}
          </ol>

          <button class="ncar__arrow ncar__arrow--next" type="button" data-ndir="1" aria-label="Next news">
            ${SVG.chev('M9 5l7 7-7 7')}
          </button>
        </div>
      </div>
    </section>` : '';

  /* ================= 02 MORE THAN A RESULT ================= */
  const leagueMatches = scored.filter(isLeague);
  const firstMatch = leagueMatches[0];
  const clincher = leagueMatches.slice().sort((a, b) =>
    ((b.ourGoals - b.theirGoals) - (a.ourGoals - a.theirGoals)) || (b.ourGoals - a.ourGoals))[0];
  const lastMatch = leagueMatches[leagueMatches.length - 1];
  const tlRow = (m, label, value) => (m ? `<span>${esc(monthYear(m.iso || m.date))}</span><i aria-hidden="true">✱</i><span>${esc(label)}</span><b>${esc(value)}</b>` : '');

  const whoBand = `<section class="sec sec--who" id="who" aria-labelledby="who-h">
      <div class="wrap">
        ${rail('who', 'More than a result')}
        <div class="who__intro rv">
          <div class="who__lead">
            <p class="eyebrow">Who we are</p>
            <h2 class="h2" id="who-h">More than a <span class="volt">result.</span></h2>
            <p class="who__sub">A club built in memory and driven by purpose. Champions on the
              pitch, and a football family off it.</p>
          </div>
          <a class="btn btn--ghost who__cta" href="/about.html">Our story ${ARROW}</a>
        </div>

        <div class="bento rv" style="--d:.08s">

          <article class="bento__card bento__card--tall">
            <img class="bento__img" src="/assets/hero/team.webp" alt="${attr(CLUB.name)} squad, ${attr(d.divisionOf(d.currentSeason))} champions" width="640" height="800" loading="lazy" decoding="async" />
            <span class="bento__imgshade" aria-hidden="true"></span>
            <span class="bento__label bento__label--on">${SVG.star} Champions</span>
            <div class="bento__tallfoot">
              <h3 class="bento__h3">${esc(d.divisionOf(d.currentSeason))} winners</h3>
              <div class="bento__table">
                ${tlRow(firstMatch, 'First fixture', `Won ${firstMatch ? (firstMatch.ourScoreline || firstMatch.scoreline) : ''}`)}
                ${tlRow(clincher, 'Title clinched', `Won ${clincher ? (clincher.ourScoreline || clincher.scoreline) : ''}`)}
                ${tlRow(lastMatch, 'Season done', `P${league.played} W${league.won}`)}
              </div>
            </div>
          </article>

          <article class="bento__card bento__card--text">
            <span class="bento__label">${SVG.star} Community</span>
            <p class="bento__quote">A football family, playing for each other every week.</p>
            <div class="bento__foot">
              <span class="bento__metatxt">South-west London</span>
              <a class="bento__link" href="/about.html">Our story ${ARROW}</a>
            </div>
          </article>

          <article class="bento__card bento__card--stat">
            <span class="bento__glow" aria-hidden="true"></span>
            <span class="bento__label">${SVG.star} The record</span>
            <b class="bento__stat">${esc(Math.round((league.won / Math.max(league.played, 1)) * 100))}<span>%</span></b>
            <span class="bento__statcap">Win rate · ${esc(d.divisionOf(d.currentSeason))} ${esc(d.currentSeason)}</span>
          </article>

          <article class="bento__card bento__card--partners">
            <span class="bento__label">${SVG.star} Proudly backed by</span>
            <div class="bento__logos">
              ${/* No width/height here: the tile fixes the box (min-height plus a
                    per-slot max-height), and declaring an intrinsic ratio would
                    resize the marks against their own artwork. */''}
              ${SPONSORS.slice(0, 4).map((s) => `<span class="bento__logo"><img src="${attr(s.logo)}" alt="${attr(s.name)}"${sizeAttrs(s.logo)} loading="lazy" decoding="async" /></span>`).join('\n              ')}
            </div>
            <a class="bento__link" href="/sponsors.html">Partner with us ${ARROW}</a>
          </article>

          <article class="bento__card bento__card--cause">
            <div class="bento__causehead">
              <span class="bento__label">${SVG.star} Our cause</span>
              <a class="bento__arrow" href="/sepsis.html" aria-label="Sepsis awareness, know the signs">${SVG.arrowOut}</a>
            </div>
            <h3 class="bento__h3">Sepsis awareness</h3>
            <p class="bento__causetxt">Founded in memory of ${esc(CLUB.memorial.name)}. Know the signs.</p>
            <a class="bento__link" href="/sepsis.html">Know the signs ${ARROW}</a>
          </article>

        </div>
      </div>
    </section>`;

  /* ================= 03 AWARD WINNERS ================= */
  const awards = SEASON_AWARDS.map((a) => {
    const p = d.players.find((x) => String(x.num) === String(a.num));
    return { ...a, player: p, name: p ? p.name : a.name, slug: p ? p.slug : '' };
  });

  const awardsBand = `<section class="sec sec--awards" id="awards" aria-labelledby="awards-h">
      <div class="wrap">
        ${rail('awards', 'Award winners')}
        <div class="aw__head rv">
          <p class="eyebrow">${esc(d.currentSeason)} End of season</p>
          <h2 class="h2" id="awards-h">Award winners<span class="volt">.</span></h2>
        </div>
      </div>

      <div class="cf" id="cf">
        <button class="cf__nav cf__nav--prev" type="button" aria-label="Previous award">${SVG.chev('M15 5l-7 7 7 7')}</button>

        <div class="cf__stage" id="cfStage" tabindex="0" role="group" aria-roledescription="carousel" aria-label="End of season award winners">
          ${awards.map((a) => {
            const first = a.name.split(' ')[0];
            const rest = a.name.slice(first.length).trim();
            return `<article class="cf__card" data-num="${attr(a.num)}">
            <span class="cf__glow" aria-hidden="true"></span>
            <div class="cf__inner">
              <img class="cf__photo" src="/assets/players/${attr(a.num)}.webp" alt="${attr(a.name)}" width="330" height="440" loading="lazy" decoding="async" /><span class="cf__grad" aria-hidden="true"></span><img class="cf__crest" src="${STAR}" alt="" width="28" height="28" loading="lazy" decoding="async" />
              <div class="cf__cardbody">
                <p class="cf__cat">${esc(a.title)}</p>
                <h3 class="cf__name">${esc(first)} <b>${esc(rest)}</b></h3>
                ${a.slug ? `<a class="cf__link" href="/players/${attr(a.slug)}.html">View profile ${ARROW}</a>` : ''}
              </div>
            </div>
          </article>`;
          }).join('\n          ')}
        </div>

        <button class="cf__nav cf__nav--next" type="button" aria-label="Next award">${SVG.chev('M9 5l7 7-7 7')}</button>
      </div>

      <div class="wrap cf__foot rv">
        <div class="cf__counter"><b id="cfIdx">1</b><span>&thinsp;/&thinsp;${esc(awards.length)}</span></div>
        <div class="cf__dots" id="cfDots" role="tablist" aria-label="Select an award"></div>
        <a class="btn btn--ghost btn--sm cf__all" href="/awards.html">All awards &amp; honours ${ARROW}</a>
      </div>
    </section>`;

  /* ================= 04 THE CAMPAIGN ================= */
  const perFor = scored.map((m) => m.ourGoals);
  const perAg = scored.map((m) => m.theirGoals);
  const res = perFor.map((g, i) => (g > perAg[i] ? 'W' : g < perAg[i] ? 'L' : 'D'));
  const clean = perAg.map((a) => (a === 0 ? 1 : 0));
  let runFor = 0, runAg = 0;
  const cumFor = perFor.map((g) => (runFor += g));
  const cumAg = perAg.map((g) => (runAg += g));

  const N = perFor.length;
  const WV = 300, TOPY = 6, BOTY = 68, maxCum = cumFor[N - 1] || 1;
  const X = (i) => ((i / Math.max(N - 1, 1)) * WV).toFixed(2);
  const Y = (v) => (BOTY - (v / maxCum) * (BOTY - TOPY)).toFixed(2);
  const ptsFor = cumFor.map((v, i) => `${X(i)},${Y(v)}`).join(' ');
  const ptsAg = cumAg.map((v, i) => `${X(i)},${Y(v)}`).join(' ');

  /* Chart geometry. A real plot area with room for an axis band underneath,
     rather than a bare sparkline: a container sized to the plot alone crops
     its own axis labels. */
  const CW = 640, CH = 200, PADL = 44, PADR = 18, PADT = 14, PADB = 30;
  const cMax = Math.max(cumFor[cumFor.length - 1] || 1, 1);
  const cx = (i) => (PADL + (i / Math.max(N - 1, 1)) * (CW - PADL - PADR)).toFixed(1);
  const cy = (v) => (CH - PADB - (v / cMax) * (CH - PADT - PADB)).toFixed(1);
  const line = (arr) => arr.map((v, i) => `${cx(i)},${cy(v)}`).join(' ');
  /* Round tick step, so the axis reads 0/50/100 rather than 0/45.7/91.3. */
  const step = cMax > 120 ? 50 : cMax > 60 ? 25 : 10;
  const ticks = [];
  for (let t = 0; t <= cMax; t += step) ticks.push(t);

  const monthOf = (m) => monthYear(m.iso || m.date);

  /* THE CHART NEEDS MATCHES, and it read `scored[0]` for its first axis label
     without checking there was one. A dataset with nothing played threw here,
     which is a crash rather than an empty band: the deploy runs the generator,
     so it would have failed the club's own publish rather than degrading. It
     could not happen while this band was hard-coded onto a page with 33
     matches behind it, and became reachable the moment the layout could hand
     the page any dataset it liked. `homeBandFilled` answers the same question,
     so the switch cannot promise a chart the page then declines to draw. */
  const campaignBand = !scored.length ? '' : `<section class="sec sec--campaign" id="campaign" aria-labelledby="cmp-h">
      <div class="wrap">
        ${rail('campaign', 'The campaign')}
        <div class="cmp__head rv">
          <div class="cmp__headlede">
            <h2 class="h2" id="cmp-h">The campaign<span class="volt">.</span></h2>
            <p class="cmp__thesis">${esc(all.won)} wins in ${esc(all.played)}, unbeaten to the ${esc(d.divisionOf(d.currentSeason)).replace(' ', '&nbsp;')} title. The ${esc(d.currentSeason)} season, measured in full.</p>
          </div>
          <a class="btn btn--ghost cmp__cta" href="/champions.html">Champions ${ARROW}</a>
        </div>

        <div class="camp rv" style="--d:.06s">

          <!-- The one fact the band exists to state. A hero figure, not a dial:
               a single ratio against a limit wants a meter, and 46 gauge ticks
               were chrome around one number. -->
          <article class="camp__hero">
            <p class="camp__k">${esc(d.divisionOf(d.currentSeason))} ${esc(d.currentSeason)}</p>
            <p class="camp__heroval"><b>${esc(league.won)}</b><span>from ${esc(league.played)}</span></p>
            <p class="camp__herolede">Every league game won. The season finished unbeaten,
              ${esc(league.points)} points from ${esc(league.played * 3)}.</p>
            <div class="camp__meter" role="img" aria-label="${attr(`${league.won} of ${league.played} league games won`)}">
              <span class="camp__meterfill" style="width:${esc(Math.round((league.won / Math.max(league.played, 1)) * 100))}%"></span>
            </div>
            <dl class="camp__mini">
              <div><dt>Points</dt><dd>${esc(league.points)}</dd></div>
              <div><dt>Goals for</dt><dd>${esc(league.goalsFor)}</dd></div>
              <div><dt>Against</dt><dd>${esc(league.goalsAgainst)}</dd></div>
            </dl>
          </article>

          <!-- The band's one real chart: axes, ticks, a legend, direct endpoint
               labels and a table twin underneath. -->
          <figure class="camp__chart">
            <figcaption class="camp__chartcap">
              <span class="camp__k">Goals across the season · all competitions</span>
              <span class="camp__legend">
                <span><i class="camp__sw camp__sw--for"></i>Scored</span>
                <span><i class="camp__sw camp__sw--ag"></i>Conceded</span>
              </span>
            </figcaption>
            <svg class="camp__svg" viewBox="0 0 ${CW} ${CH}" preserveAspectRatio="none"
                 role="img" aria-label="Cumulative goals scored and conceded across ${esc(N)} matches. Finished ${esc(all.goalsFor)} scored, ${esc(all.goalsAgainst)} conceded.">
              ${ticks.map((t) => `<line class="camp__grid" x1="${PADL}" y1="${cy(t)}" x2="${CW - PADR}" y2="${cy(t)}"/>
              <text class="camp__tick" x="${PADL - 9}" y="${cy(t)}" dy="3.5" text-anchor="end">${esc(t)}</text>`).join('\n              ')}
              <polygon class="camp__area" points="${cx(0)},${cy(0)} ${line(cumFor)} ${cx(N - 1)},${cy(0)}"/>
              <polyline class="camp__for" points="${line(cumFor)}" pathLength="1"/>
              <polyline class="camp__ag" points="${line(cumAg)}" pathLength="1"/>
              <!-- A short bright segment that travels the scored line for ever.
                   Unlike the entrance, this does not wait on the reveal, so the
                   chart is alive whenever you happen to look at it. -->
              <polyline class="camp__comet" points="${line(cumFor)}" pathLength="1"/>
              <circle class="camp__end camp__end--for" cx="${cx(N - 1)}" cy="${cy(cumFor[N - 1])}" r="4"/>
              <circle class="camp__end camp__end--ag" cx="${cx(N - 1)}" cy="${cy(cumAg[N - 1])}" r="4"/>
              <text class="camp__xt" x="${PADL}" y="${CH - 9}">${esc(monthOf(scored[0]))}</text>
              <text class="camp__xt camp__xt--end" x="${CW - PADR}" y="${CH - 9}" text-anchor="end">${esc(monthOf(scored[N - 1]))}</text>
            </svg>
            <p class="camp__chartfoot">
              <b>${esc(all.goalsFor)}</b> scored, <b>${esc(all.goalsAgainst)}</b> conceded ·
              <b>+${esc(all.goalDifference)}</b> difference · ${esc(goalsPerGame)} a game
            </p>
          </figure>

          <!-- Distinct measures only. The old row said W/D/L four times over. -->
          <ul class="camp__kpis">
            <li class="camp__kpi" style="--i:0"><b>${esc(goalsPerGame)}</b><span>Goals a game</span></li>
            <li class="camp__kpi" style="--i:1"><b>${esc(all.cleanSheets)}</b><span>Clean sheets · ${esc(cleanPct)}%</span></li>
            <li class="camp__kpi" style="--i:2"><b>${esc(all.winPct)}<i>%</i></b><span>Win rate, all comps</span></li>
            <li class="camp__kpi" style="--i:3"><b>${esc(all.played)}</b><span>Matches played</span></li>
          </ul>

          <!-- Every match, in order. This replaces three sparklines that had no
               axis, no scale and no way to read a single value. -->
          <section class="camp__season" aria-labelledby="camp-season-h">
            <div class="camp__seasonhead">
              <h3 class="camp__k" id="camp-season-h">Every match, in order</h3>
              <span class="camp__legend">
                <span><i class="camp__sw camp__sw--w"></i>Won</span>
                <span><i class="camp__sw camp__sw--d"></i>Drew</span>
                <span><i class="camp__sw camp__sw--l"></i>Lost</span>
              </span>
            </div>
            <ol class="camp__strip">
              ${ordered.map((m, i) => {
                const o = m.outcome === 'W' ? 'w' : m.outcome === 'L' ? 'l' : 'd';
                const sc = m.countsGoals ? `${m.ourGoals}-${m.theirGoals}` : 'walkover';
                /* NOT focusable. These carried tabindex="0" so a keyboard user
                   could reach the hover tooltip, which put 33 extra tab stops
                   on the home page in front of everything below it, on list
                   items that announce as non-interactive because they are. The
                   same 33 results are already in the <details> table directly
                   below, as a real table with headers, which is the better
                   route for both keyboard and screen reader. The sr-only text
                   here is read as part of the list without any focus at all. */
                return `<li class="camp__cell camp__cell--${o}" style="--i:${i}">
                <span class="sr-only">${esc(`${shortClub(m.opponent)}, ${sc}`)}</span>
                <span class="camp__tip" aria-hidden="true">
                  <span class="camp__tipbadge">${oppBadge(m.opponent, d.badges, 26, 26)}</span>
                  <b class="camp__tipscore">${esc(sc)}</b>
                  <span class="camp__tipclub">${esc(shortClub(m.opponent))}</span>
                  <span class="camp__tipdate">${esc(dayMonthYear(m.iso || m.date))}</span>
                </span></li>`;
              }).join('\n              ')}
            </ol>
            <details class="camp__table">
              <summary>Read the season as a table</summary>
              <div class="camp__tablewrap">
                <table>
                  <caption class="sr-only">Every ${esc(CLUB.name)} match in ${esc(d.currentSeason)}</caption>
                  <thead><tr><th scope="col">Date</th><th scope="col">Opponent</th><th scope="col">Score</th><th scope="col">Result</th></tr></thead>
                  <tbody>
                    ${ordered.map((m) => `<tr><td>${esc(dayMonthYear(m.iso || m.date))}</td><td>${esc(shortClub(m.opponent))}</td><td>${esc(m.countsGoals ? `${m.ourGoals}-${m.theirGoals}` : '-')}</td><td>${esc(m.outcome === 'W' ? 'Won' : m.outcome === 'L' ? 'Lost' : 'Drew')}</td></tr>`).join('\n                    ')}
                  </tbody>
                </table>
              </div>
            </details>
          </section>

        </div>
      </div>
    </section>`;

  /* ================= 05 RECENT RESULTS ================= */
  const teamRow = (name, isUs, score, winner) => `<div class="rcard2__team">${isUs
    ? `<img class="rcard2__crest" src="${STAR}" alt="" width="26" height="32" loading="lazy" decoding="async" />`
    : oppBadge(name, d.badges, 26, 32, 'rcard2__crest')}<b>${esc(shortClub(name))}</b><span class="rcard2__score${isUs && winner ? ' rcard2__score--volt' : !isUs && winner ? ' rcard2__score--win' : ''}">${esc(score)}</span></div>`;

  const resultsBand = `<section class="sec sec--results" id="results" aria-labelledby="res-h">
      <div class="wrap rl__head rv">
        ${rail('results', 'Recent results')}
        <div>
          <h2 class="h2" id="res-h">Recent results<span class="volt">.</span></h2>
        </div>
        <a class="btn btn--ghost btn--sm rl__all" href="/results.html">All results ${ARROW}</a>
      </div>

      <!-- role="group": the rail is focusable so arrow keys can scroll it, and a
           focusable element with no role announces as nothing. Matches the
           pattern the awards carousel already uses. -->
      <ol class="rl" id="rlRail" role="group" aria-label="Recent results" tabindex="0">
        ${recent.map((m, i) => {
          const hs = m.isWalkover ? 'W/O' : m.hs;
          const as = m.isWalkover ? '–' : m.as;
          const homeWon = Number(m.hs) > Number(m.as);
          const awayWon = Number(m.as) > Number(m.hs);
          return `<li class="rcard2${i === 0 ? ' rcard2--glow' : ''}">
          <!-- No aria-label. It read "Sue's Angels FC 2-0 Hillside" while the
               card visibly said "W 31 May 26 Sue's Angels 2 Hillside 0 League
               Ten Home", so the accessible name did not contain the visible
               text and WCAG 2.5.3 failed on all seven cards. Without it the
               name is computed from the content, which cannot disagree with
               itself. The outcome letter carries its word for screen readers
               and is hidden visually, so "W" is not read as a letter. -->
          <a class="rcard2__link" href="/matches/${attr(m.slug)}.html">
            <div class="rcard2__top"><span class="rchip rchip--${attr((m.outcome || 'w').toLowerCase())}"><span class="sr-only">${esc({ W: 'Won', D: 'Drew', L: 'Lost' }[m.outcome] || 'Result')}</span><span aria-hidden="true">${esc(m.outcome || '-')}</span></span><span class="rcard2__date">${esc(dayMonthYear(m.iso || m.date))}</span></div>
            <div class="rcard2__teams">
              ${teamRow(m.home, m.weAreHome, hs, homeWon)}
              ${teamRow(m.away, !m.weAreHome, as, awayWon)}
            </div>
            <p class="rcard2__meta">${esc(m.competition)} · ${esc(m.weAreHome ? 'Home' : 'Away')}</p>
          </a>
        </li>`;
        }).join('\n        ')}
      </ol>
      <div class="wrap"><div class="rlprog"><span id="rlFill"></span></div></div>
    </section>`;

  /* ================= 06 THE TABLE ================= */
  const tableBand = d.table.length ? `<section class="sec sec--table" id="table" aria-labelledby="tbl-h">
      <div class="wrap tbl__head rv">
        ${rail('table', 'The table')}
        <div>
          <h2 class="h2" id="tbl-h">The table<span class="volt">.</span></h2>
        </div>
        <a class="btn btn--ghost btn--sm" href="/league.html">Full table ${ARROW}</a>
      </div>
      <div class="wrap">
        <div class="tbl" id="tbl">
          <div class="tbl__row tbl__head-row" aria-hidden="true">
            <span class="tbl__pos">#</span><span class="tbl__club">Club</span>
            <span>P</span><span>W</span><span>GD</span><span class="tbl__pts">Pts</span>
          </div>
          ${d.table.slice(0, 6).map((r) => `<a class="tbl__row${r.us ? ' tbl__row--us' : r.pos === 2 ? ' tbl__row--runner' : ''}" href="/league.html" aria-hidden="true" tabindex="-1">
            <span class="tbl__pos">${esc(r.pos)}</span>
            <span class="tbl__club">${r.us
              ? `<img src="${STAR}" alt="" width="26" height="32" loading="lazy" decoding="async" />`
              : oppBadge(r.club, d.badges, 26, 26)}${esc(r.club)}</span>
            <span>${esc(r.played)}</span><span>${esc(r.won)}</span><span>${r.goalDifference > 0 ? '+' : ''}${esc(r.goalDifference)}</span><b class="tbl__pts" data-pts="${attr(r.points)}">${esc(r.points)}</b>
          </a>`).join('\n          ')}
        </div>
        <table class="sr-only">
          <caption>${esc(d.divisionOf(d.currentSeason))} final standings, ${esc(d.currentSeason)}</caption>
          <thead><tr><th scope="col">Position</th><th scope="col">Club</th><th scope="col">Played</th>
            <th scope="col">Won</th><th scope="col">Goal difference</th><th scope="col">Points</th></tr></thead>
          <tbody>${d.table.map((r) => `<tr><td>${esc(r.pos)}</td><th scope="row">${esc(r.club)}</th>
            <td>${esc(r.played)}</td><td>${esc(r.won)}</td>
            <td>${r.goalDifference > 0 ? '+' : ''}${esc(r.goalDifference)}</td><td>${esc(r.points)}</td></tr>`).join('')}</tbody>
        </table>
      </div>
    </section>` : '';

  /* ================= 07 ASK THE ANGELS ================= */
  const faqBand = `<section class="sec sec--faq" id="faq" aria-labelledby="faq-h">
      <div class="wrap rv">
        ${rail('faq', 'Ask the Angels')}
        <h2 class="h2" id="faq-h">Ask the Angels<span class="volt">.</span></h2>
      </div>
      <div class="wrap">
        <div class="faq rv">
          ${FAQS.map((f) => `<details class="faq__item">
            <summary class="faq__q">${esc(f.q)}<span class="faq__ico" aria-hidden="true">+</span></summary>
            <div class="faq__a"><p>${f.aHtml || esc(f.a)}</p></div>
          </details>`).join('\n          ')}
        </div>
      </div>
    </section>`;

  /* ================= 08 PULL ON THE SHIRT ================= */
  const wordstrip = `<div class="wordstrip" aria-hidden="true">
      <div class="wordstrip__in">${'<i>Sue’s Angels FC</i><b>■</b>'.repeat(12)}</div>
    </div>`;

  const ctaBand = `<section class="sec sec--cta" aria-labelledby="cta-h">
      <div class="wrap">
        ${rail('cta', 'Pull on the shirt')}
        <div class="cta2 rv">
          <span class="cta2__glow" aria-hidden="true"></span>
          <img class="cta2__badge" src="${STAR}" alt=""${sizeAttrs(STAR)} aria-hidden="true" loading="lazy" decoding="async" />
          <div class="cta2__glass glassbox">
            <p class="eyebrow cta2__eyebrow">${esc(d.nextSeason)} · The next chapter</p>
            <h2 class="h1b" id="cta-h">Pull on the shirt<span class="volt">.</span></h2>
            <p class="cta2__sub">Trials, volunteering, media and sponsorship. All open for the new season.</p>
            <div class="cta2__btns">
              <a class="btn btn--volt" href="/join.html">Join the club ${ARROW}</a>
              <a class="btn btn--ghost" href="/contact.html">Get in touch</a>
              <a class="btn btn--ghost" href="/sponsors.html">Partner with us</a>
            </div>
          </div>
        </div>
      </div>
    </section>`;

  /* ================= THE THREE THE CLUB CAN ADD =================
     Off until Control panel -> Home page turns one on, so a site with no
     record is byte for byte the page that shipped. Each publishes something
     the club already makes and the front page has never shown.

     Each takes the club's pick when there is one and the newest otherwise, so
     a band nobody maintains still moves on by itself. featuredFor() is what
     decides; this only draws. */
  const featMatch = featuredFor('report', d.homeLayout, d);
  const reportBand = featMatch ? `<section class="sec sec--report" id="report" aria-labelledby="rep-h">
      <div class="wrap">
        ${rail('report', 'Match report')}
        <div class="frep rv glassbox">
          <div class="frep__body">
            <p class="eyebrow">${esc(featMatch.competition)} · ${esc(dayMonthYear(featMatch.iso || featMatch.date))}</p>
            <h2 class="h2" id="rep-h">${esc(shortClub(featMatch.opponent))}<span class="volt">.</span></h2>
            <p class="frep__score">${esc(featMatch.ourScoreline || featMatch.scoreline)} ${esc(featMatch.weAreHome ? 'at home' : 'away')}</p>
            ${reportOpening(featMatch).map((p) => `<p class="frep__p">${esc(p)}</p>`).join('\n            ')}
            <a class="btn btn--volt" href="/matches/${attr(featMatch.slug)}.html">Read the full report ${ARROW}</a>
          </div>
        </div>
      </div>
    </section>` : '';

  const featAlbum = featuredFor('photos', d.homeLayout, d);
  const albumShots = featAlbum ? (featAlbum.photos || []).slice(0, 8) : [];
  const photosBand = albumShots.length ? `<section class="sec sec--photos" id="photos" aria-labelledby="pho-h">
      <div class="wrap">
        ${rail('photos', 'Photographs')}
        <div class="nhead rv">
          <div>
            <p class="eyebrow">${esc(featAlbum.competition || 'The album')}</p>
            <h2 class="h2" id="pho-h">Photographs<span class="volt">.</span></h2>
          </div>
          <a class="nhead__all" href="/gallery/${attr(featAlbum.slug)}.html">All ${esc(String(featAlbum.photoCount || albumShots.length))} ${ARROW}</a>
        </div>
      </div>
      <!-- The whole strip is one link to the album. Eight separate links to the
           same page is eight stops for a keyboard and eight identical entries
           in a screen reader's link list. -->
      <a class="fpho rv" href="/gallery/${attr(featAlbum.slug)}.html"
         aria-label="${attr(`Photographs: ${featAlbum.title}`)}">
        ${albumShots.map((src) => `<img class="fpho__i" src="${attr(src)}" alt="" width="320" height="213" loading="lazy" decoding="async" />`).join('\n        ')}
      </a>
    </section>` : '';

  const featPlayer = featuredFor('spotlight', d.homeLayout, d);
  /* shotFor, not photoFor. photoFor is the raw record and the sync strips the
     base64 payload out of it, so it answers '' for everybody; shotFor is the
     resolver that also knows which files on disk may be trusted, which is what
     stops a new signing inheriting a previous holder's shirt number and face. */
  const spotShot = featPlayer ? d.shotFor(featPlayer.num) : '';
  const spotlightBand = featPlayer ? `<section class="sec sec--spotlight" id="spotlight" aria-labelledby="spot-h">
      <div class="wrap">
        ${rail('spotlight', 'The squad')}
        <div class="fspot rv glassbox">
          ${spotShot
            ? `<img class="fspot__photo" src="${attr(spotShot)}" alt="" width="220" height="220" loading="lazy" decoding="async" />`
            : `<span class="fspot__photo fspot__photo--none"><img src="${STAR}" alt="" width="90" height="111" loading="lazy" decoding="async" /></span>`}
          <div class="fspot__body">
            <p class="eyebrow">${esc(featPlayer.position || 'Squad')}</p>
            <h2 class="h2" id="spot-h">${esc(featPlayer.name)}<span class="volt">.</span></h2>
            <dl class="fspot__nums">
              ${[['Starts', featPlayer.starts], ['Goals', featPlayer.goals],
                 ['Assists', featPlayer.assists], ['Clean sheets', featPlayer.cleanSheets]]
                .filter(([, v]) => Number(v) > 0)
                .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(String(v))}</dd></div>`).join('\n              ')}
            </dl>
            <!-- Say what the figures count. They are every competitive match
                 since 2025, not this season, and a run of bare numbers under a
                 name invites the reader to assume whichever they had in mind. -->
            <p class="fspot__note">Competitive matches, every season. ${esc(FRIENDLY_NOTE_SHORT)}</p>
            <a class="btn btn--ghost" href="/players/${attr(featPlayer.slug)}.html">His record ${ARROW}</a>
          </div>
        </div>
      </div>
    </section>` : '';

  /* ================= PRE-SEASON =================
     The gap between winning one division and starting the next, which the
     site had no way to say. Everything here is counted from the match records
     and the fixture list; the only sentence that is not derived is the one
     saying none of it counts, which is the whole point of the band. */
  const ps = preseasonFor(d);
  const psDone = ps.played.length;
  const psRow = (label, value) => `<div class="psn__k"><dt>${esc(label)}</dt><dd>${esc(String(value))}</dd></div>`;
  const preseasonBand = `<section class="sec sec--preseason" id="preseason" aria-labelledby="psn-h">
      <div class="wrap">
        ${rail('preseason', 'Pre-season')}
        <div class="nhead rv">
          <div>
            <p class="eyebrow">${esc(ps.season)} · Building for ${esc(ps.division)}</p>
            <h2 class="h2" id="psn-h">Pre-season<span class="volt">.</span></h2>
          </div>
          <a class="nhead__all" href="/fixtures.html">The full fixture list ${ARROW}</a>
        </div>

        <p class="psn__lede rv">${esc(
          `${ps.total} friendl${ps.total === 1 ? 'y' : 'ies'} before ${ps.division} begins. `
          + (psDone === 0 ? 'None played yet.'
            : psDone === ps.total ? 'All played.'
              : `${psDone} played, ${ps.toCome.length} to come.`))}</p>

        ${psDone ? `<dl class="psn__nums rv">
          ${psRow('Played', ps.record.p)}
          ${psRow('Won', ps.record.w)}
          ${ps.record.d ? psRow('Drawn', ps.record.d) : ''}
          ${ps.record.l ? psRow('Lost', ps.record.l) : ''}
          ${psRow('Goals', `${ps.record.gf}-${ps.record.ga}`)}
          ${ps.record.cleanSheets ? psRow('Clean sheets', ps.record.cleanSheets) : ''}
        </dl>` : ''}

        <ol class="psn__list rv">
          ${ps.played.map((m) => `<li class="psn__m psn__m--done">
            <span class="psn__d">${esc(dayMonthYear(m.iso || m.date))}</span>
            <span class="psn__o">${oppBadge(m.opponent, d.badges, 22, 22, 'psn__b')}<b>${esc(shortClub(m.opponent))}</b></span>
            <span class="psn__r"><a href="/matches/${attr(m.slug)}.html">${esc(m.ourScoreline || m.scoreline)}</a> <i>${esc(m.weAreHome ? 'H' : 'A')}</i></span>
          </li>`).join('\n          ')}
          ${ps.toCome.map((f) => `<li class="psn__m">
            <span class="psn__d">${esc(f.dateLabel || dayMonthYear(f.iso || f.date))}</span>
            <span class="psn__o">${oppBadge(f.opponent, d.badges, 22, 22, 'psn__b')}<b>${esc(shortClub(f.opponent))}</b></span>
            <span class="psn__r"><em>${esc(f.kick || 'To play')}</em> <i>${esc(f.weAreHome ? 'H' : 'A')}</i></span>
          </li>`).join('\n          ')}
        </ol>

        ${(ps.scorers.length || ps.debutants.length) ? `<div class="psn__who rv">
          ${ps.scorers.length ? `<p><b>Scored:</b> ${ps.scorers.map((s) =>
            `<a href="/players/${attr(s.player.slug)}.html">${esc(s.player.name)}</a>${s.n > 1 ? ` (${s.n})` : ''}`).join(', ')}.</p>` : ''}
          ${ps.debutants.length ? `<p><b>First time in the shirt:</b> ${ps.debutants.map((p) =>
            `<a href="/players/${attr(p.slug)}.html">${esc(p.name)}</a>`).join(', ')}.</p>` : ''}
        </div>` : ''}

        <p class="psn__note rv">${esc(FRIENDLY_NOTE)}</p>
      </div>
    </section>`;

  /* ================= THE SEASON AHEAD =================
     Ten clubs, and what the archive already holds on each. Most of them are
     new, and saying so is the honest headline of a promotion. */
  const ahead = seasonAhead(d);
  const aheadBand = `<section class="sec sec--ahead" id="ahead" aria-labelledby="ahd-h">
      <div class="wrap">
        ${rail('ahead', 'The season ahead')}
        <div class="nhead rv">
          <div>
            <p class="eyebrow">${esc(ahead.division)} · ${esc(ahead.season)}</p>
            <h2 class="h2" id="ahd-h">The season ahead<span class="volt">.</span></h2>
          </div>
          <a class="nhead__all" href="/league.html">The table ${ARROW}</a>
        </div>
        <p class="psn__lede rv">${esc(
          `${ahead.clubs.length + 1} clubs. ${ahead.met === 0 ? 'All of them new to us.'
            : `${ahead.met} the club has played before, ${ahead.fresh} it has not.`}`)}</p>
        <ul class="ahd rv">
          ${ahead.clubs.map((c) => `<li class="ahd__c${c.met ? ' ahd__c--met' : ''}">
            <span class="ahd__b">${oppBadge(c.name, d.badges, 34, 34)}</span>
            <b class="ahd__n">${esc(shortClub(c.name))}</b>
            <span class="ahd__w">${c.met
              ? esc(`Played ${c.record.p}, won ${c.record.w}${c.record.d ? `, drawn ${c.record.d}` : ''}${c.record.l ? `, lost ${c.record.l}` : ''} · ${c.record.gf}-${c.record.ga}`)
              : c.relatedCount
                ? esc(`New. The club has played their ${shortClub(c.relatedName)}, not this side.`)
                : 'New to the club.'}</span>
          </li>`).join('\n          ')}
        </ul>
      </div>
    </section>`;

  /* ================= FOUR MORE THE CLUB CAN ADD ================= */

  /* Partners' own marks, on a white tile so their colours stay true. They are
     never recoloured to suit the page: a sponsor's brand is theirs. */
  const sponsorsBand = `<section class="sec sec--sponsors" id="sponsors" aria-labelledby="spo-h">
      <div class="wrap">
        ${rail('sponsors', 'Who backs the club')}
        <div class="nhead rv">
          <div>
            <p class="eyebrow">Partners</p>
            <h2 class="h2" id="spo-h">Who backs the club<span class="volt">.</span></h2>
          </div>
          <a class="nhead__all" href="/sponsors.html">Partner with us ${ARROW}</a>
        </div>
        <ul class="spo rv">
          ${SPONSORS.map((s) => `<li class="spo__c">
            <span class="spo__tile"><img src="${attr(s.logo)}" alt="${attr(s.name)}"${sizeAttrs(s.logo)} loading="lazy" decoding="async" /></span>
            <b>${esc(s.name)}</b>
            <span>${esc(s.tier)}</span>
          </li>`).join('\n          ')}
        </ul>
      </div>
    </section>`;

  const staffBand = (d.coaches || []).length ? `<section class="sec sec--staff" id="staff" aria-labelledby="stf-h">
      <div class="wrap">
        ${rail('staff', 'The people running it')}
        <div class="nhead rv">
          <div>
            <p class="eyebrow">Management</p>
            <h2 class="h2" id="stf-h">The people running it<span class="volt">.</span></h2>
          </div>
          <a class="nhead__all" href="/coaches.html">All staff ${ARROW}</a>
        </div>
        <ul class="stf rv">
          ${d.coaches.map((c) => `<li class="stf__c">
            ${c.photo
              ? `<img class="stf__p" src="${attr(c.photo.startsWith('/') ? c.photo : `/${c.photo}`)}" alt="" width="96" height="96" loading="lazy" decoding="async" />`
              : `<span class="stf__p stf__p--none"><img src="${STAR}" alt="" width="40" height="49" loading="lazy" decoding="async" /></span>`}
            <b>${esc(c.name)}</b>
            <span>${esc(c.short || c.role || '')}</span>
          </li>`).join('\n          ')}
        </ul>
      </div>
    </section>` : '';

  /* Read from clubRecords() in stats.mjs, which is what the records page
     reads, so the two cannot disagree about the club's own history. */
  const recs = clubRecords(d.competitive, d.players);
  const recordsBand = recs.length ? `<section class="sec sec--records" id="records" aria-labelledby="rec-h">
      <div class="wrap">
        ${rail('records', 'Club records')}
        <div class="nhead rv">
          <div>
            <p class="eyebrow">Since 2025</p>
            <h2 class="h2" id="rec-h">Club records<span class="volt">.</span></h2>
          </div>
          <a class="nhead__all" href="/records.html">Every record ${ARROW}</a>
        </div>
        <ul class="rcd rv">
          ${recs.slice(0, 8).map((r) => `<li class="rcd__c">
            <span class="rcd__v">${esc(String(r.value))}</span>
            <b class="rcd__l">${esc(r.label)}</b>
            <span class="rcd__w">${r.href ? `<a href="${attr(r.href)}">${esc(r.who)}</a>` : esc(r.who)}</span>
          </li>`).join('\n          ')}
        </ul>
        <p class="psn__note rv">Competitive matches only. ${esc(FRIENDLY_NOTE_SHORT)}</p>
      </div>
    </section>` : '';

  /* Empties itself: nobody is always within three of a round number, and a
     heading over an empty list is worse than no heading. */
  const mstones = milestones(d.players);
  const milestonesBand = mstones.length ? `<section class="sec sec--milestones" id="milestones" aria-labelledby="mst-h">
      <div class="wrap">
        ${rail('milestones', 'Milestones in sight')}
        <div class="nhead rv">
          <div>
            <p class="eyebrow">Worth watching</p>
            <h2 class="h2" id="mst-h">Milestones in sight<span class="volt">.</span></h2>
          </div>
          <a class="nhead__all" href="/stats.html">Every figure ${ARROW}</a>
        </div>
        <ul class="mst rv">
          ${mstones.slice(0, 6).map((m) => `<li class="mst__c">
            <span class="mst__n">${esc(String(m.away))}</span>
            <span class="mst__t">
              <b><a href="/players/${attr(m.player.slug)}.html">${esc(m.player.name)}</a></b>
              <span>${esc(`${m.away === 1 ? 'one' : m.away} ${m.label.replace(/s$/, '')}${m.away === 1 ? '' : 's'} from ${m.next}`)}</span>
            </span>
            <span class="mst__v">${esc(`${m.value}/${m.next}`)}</span>
          </li>`).join('\n          ')}
        </ul>
        <p class="psn__note rv">Competitive matches only, and appearances count starts:
          Sunday-league returns do not record substitutes or minutes, so neither is claimed.</p>
      </div>
    </section>` : '';

  /* Where to turn up, for an opponent, a trialist or a parent. The address is
     one record in club.mjs and the map link is built from its own mapQuery, so
     nothing here is a second copy of the club's address. */
  const G = CLUB.venue || {};
  const groundBand = G.name ? `<section class="sec sec--ground" id="ground" aria-labelledby="grd-h">
      <div class="wrap">
        ${rail('ground', 'Where the club plays')}
        <div class="nhead rv">
          <div>
            <p class="eyebrow">Home</p>
            <h2 class="h2" id="grd-h">Where the club plays<span class="volt">.</span></h2>
          </div>
          <a class="nhead__all" href="/contact.html">Get in touch ${ARROW}</a>
        </div>
        <div class="grd rv">
          <div class="grd__t">
            <b>${esc(G.name)}</b>
            <span>${esc([G.street, G.district, G.locality].filter(Boolean).join(', '))}</span>
            <a class="btn btn--ghost btn--sm" href="https://www.google.com/maps/search/?api=1&query=${attr(encodeURIComponent(G.mapQuery || G.name))}"
               target="_blank" rel="noopener">Open in maps ${ARROW}</a>
          </div>
          <dl class="grd__k">
            <div><dt>Matchday</dt><dd>Sunday mornings</dd></div>
            <div><dt>League</dt><dd>${esc(d.divisionOf(d.latestSeason))}</dd></div>
            <div><dt>Founded</dt><dd>2025</dd></div>
          </dl>
        </div>
      </div>
    </section>` : '';

  /* THE NEXT MATCH, PREVIEWED. The hero already carries the fixture; this adds
     what the archive holds on that opponent, which is the part a supporter or
     an opponent actually wants. `sameClub` keeps a first team apart from a
     2.0 exactly as the season-ahead band does. */
  const nx = d.nextFixture;
  const nxMet = nx ? d.played.filter((m) => sameClub(m.opponent, nx.opponent)) : [];
  const nxRel = nx && !nxMet.length ? d.played.filter((m) => relatedClub(m.opponent, nx.opponent)) : [];
  const nxRec = recordOf(nxMet);
  const nextUpBand = nx ? `<section class="sec sec--nextup" id="nextup" aria-labelledby="nxt-h">
      <div class="wrap">
        ${rail('nextup', 'The next match')}
        <div class="nhead rv">
          <div>
            <p class="eyebrow">${esc(nx.competition || nx.label || 'Next up')} · ${esc(nx.dateLabel || dayMonthYear(nx.iso || nx.date))}</p>
            <h2 class="h2" id="nxt-h">${esc(shortClub(nx.opponent))}<span class="volt">.</span></h2>
          </div>
          <a class="nhead__all" href="/fixtures.html">All fixtures ${ARROW}</a>
        </div>
        <div class="nxt rv">
          <span class="nxt__b">${oppBadge(nx.opponent, d.badges, 56, 56)}</span>
          <div class="nxt__t">
            <p class="nxt__w">${esc(nx.weAreHome ? 'At home' : 'Away')}${nx.venue ? `, ${esc(nx.venue)}` : ''}${nx.kick ? ` · ${esc(nx.kick)}` : ''}</p>
            <p class="nxt__h">${nxMet.length
              ? esc(`Played ${nxRec.p}, won ${nxRec.w}${nxRec.d ? `, drawn ${nxRec.d}` : ''}${nxRec.l ? `, lost ${nxRec.l}` : ''} · ${nxRec.gf}-${nxRec.ga}.`)
              : nxRel.length
                ? esc(`A first meeting. The club has played their ${shortClub(nxRel[0].opponent)}, not this side.`)
                : 'A first meeting.'}</p>
          </div>
        </div>
      </div>
    </section>` : '';

  /* Every player. A crest stands in where the club has no photograph, which is
     sixteen of them: the alternative is leaving those men off the page. */
  const squadList = (d.squad && d.squad.length ? d.squad : d.players) || [];
  const squadBand = squadList.length ? `<section class="sec sec--squad" id="squad" aria-labelledby="sqd-h">
      <div class="wrap">
        ${rail('squad', 'The squad')}
        <div class="nhead rv">
          <div>
            <p class="eyebrow">${esc(String(squadList.length))} players</p>
            <h2 class="h2" id="sqd-h">The squad<span class="volt">.</span></h2>
          </div>
          <a class="nhead__all" href="/squad.html">Every profile ${ARROW}</a>
        </div>
        <ul class="sqd rv">
          ${squadList.map((p) => {
            const shot = d.shotFor(p.num);
            return `<li class="sqd__c"><a href="/players/${attr(p.slug)}.html">
              ${shot
                ? `<img class="sqd__i" src="${attr(shot)}" alt="" width="120" height="120" loading="lazy" decoding="async" />`
                : `<span class="sqd__i sqd__i--none"><img src="${STAR}" alt="" width="34" height="42" loading="lazy" decoding="async" /></span>`}
              <b>${esc(p.name)}</b>
              <span>${esc(p.position || '')}</span>
            </a></li>`;
          }).join('\n          ')}
        </ul>
      </div>
    </section>` : '';

  /* ==========================================================================
     TWENTY MORE THE CLUB CAN ADD

     All of them off until switched on in Control panel -> Home page. Not
     because they are unfinished: because the club has already arranged its
     front page, and twenty bands arriving switched on would have doubled the
     length of a page nobody asked to change. That is the rule in
     home-layout.mjs and this is the first time it has had to hold.

     None of them asks the club to type anything in. Every one reads something
     the site already holds and empties itself when that thing runs out, which
     is what makes it safe to leave one on and forget about it.
     ========================================================================== */

  /* Three shapes, shared. Five leaderboards drawn five different ways would
     be five sets of column widths to keep in step for no reader's benefit. */
  const bySlug = new Map((d.players || []).map((p) => [p.num, p]));
  const playerLink = (num, fallback) => {
    const p = bySlug.get(num);
    const name = p ? p.name : (fallback || d.nameFor(num) || '');
    return p ? `<a href="/players/${attr(p.slug)}.html">${esc(name)}</a>` : esc(name);
  };

  /* A leaderboard: rank, name, figure. Rank is the reader's position in the
     list and never a shirt number. */
  const leaderList = (rows, col, unit) => `<ol class="lbd rv">
          ${rows.map((p, i) => `<li class="lbd__r">
            <span class="lbd__n">${esc(String(i + 1))}</span>
            <span class="lbd__p">${playerLink(p.num, p.name)}<i>${esc(p.position || '')}</i></span>
            <span class="lbd__v">${esc(String(p[col]))}<i>${esc(unit)}</i></span>
          </li>`).join('\n          ')}
        </ol>`;

  /* A tile: one big figure, what it is, and the smaller thing that gives it
     scale. The third line is the point of the shape - a figure with nothing
     beside it invites the reader to supply their own comparison. */
  const tileGrid = (tiles) => `<ul class="tiles rv">
          ${tiles.filter(Boolean).map((t) => `<li class="tiles__t">
            <span class="tiles__v">${esc(String(t.v))}</span>
            <b class="tiles__l">${esc(t.l)}</b>
            ${t.s ? `<span class="tiles__s">${esc(t.s)}</span>` : ''}
          </li>`).join('\n          ')}
        </ul>`;

  /* A row: something on the left, a middle, and a figure on the right. */
  const rowList = (rows) => `<ul class="hrow rv">
          ${rows.map((r) => `<li class="hrow__r">
            <span class="hrow__a">${r.a}</span>
            <span class="hrow__b">${r.b}</span>
            <span class="hrow__c">${r.c}</span>
          </li>`).join('\n          ')}
        </ul>`;

  const bandHead = (key, title, eyebrow, href, linkText, id) => `${rail(key, title)}
        <div class="nhead rv">
          <div>
            <p class="eyebrow">${esc(eyebrow)}</p>
            <h2 class="h2" id="${attr(id)}">${esc(title)}<span class="volt">.</span></h2>
          </div>
          ${href ? `<a class="nhead__all" href="${attr(href)}">${esc(linkText)} ${ARROW}</a>` : ''}
        </div>`;

  /* ---- What is coming up --------------------------------------------------
     The fixtures AFTER the next one, because the hero and the next-match band
     both already carry that one and a list repeating it reads as a mistake. */
  const soon = (d.upcoming || []).slice(1, 6);
  const fixturesBand = soon.length ? `<section class="sec sec--fixtures" id="fixtures" aria-labelledby="fix-h">
      <div class="wrap">
        ${bandHead('fixtures', 'What is coming up', `${d.upcoming.length} to play`, '/fixtures.html', 'The full list', 'fix-h')}
        ${rowList(soon.map((f) => ({
    a: `${oppBadge(f.opponent, d.badges, 22, 22, 'psn__b')}<b>${esc(shortClub(f.opponent))}</b>`,
    b: esc(`${f.dateLabel || dayMonthYear(f.iso || f.date)}${f.competition ? ` · ${f.competition}` : ''}`),
    c: `${esc(f.weAreHome ? 'Home' : 'Away')}${f.kick ? ` <i>${esc(f.kick)}</i>` : ''}`,
  })))}
      </div>
    </section>` : '';

  /* ---- The last time out --------------------------------------------------
     The most recent result, whatever it was. A club that only puts its wins on
     the front page is telling you which ones it lost. */
  const lastM = d.played.slice().sort((a, b) => (b.iso || '').localeCompare(a.iso || ''))[0];
  const lastGoals = (lastM && lastM.detail && lastM.detail.goals) || [];
  const lastScorers = [...lastGoals.reduce((m, g) => m.set(g.num, (m.get(g.num) || 0) + 1), new Map())];
  const lastOutBand = lastM ? `<section class="sec sec--lastout" id="lastout" aria-labelledby="lst-h">
      <div class="wrap">
        ${bandHead('lastout', 'The last time out', esc(`${lastM.competition} · ${dayMonthYear(lastM.iso || lastM.date)}`), `/matches/${lastM.slug}.html`, 'The full match', 'lst-h')}
        <div class="lout rv">
          <span class="lout__b">${oppBadge(lastM.opponent, d.badges, 56, 56)}</span>
          <div class="lout__t">
            <p class="lout__s"><b>${esc(lastM.isWalkover ? 'Walkover' : (lastM.ourScoreline || lastM.scoreline))}</b>
              <span>${esc(`${lastM.weAreHome ? 'at home to' : 'away at'} ${shortClub(lastM.opponent)}`)}</span></p>
            ${lastScorers.length ? `<p class="lout__w"><b>Scored:</b> ${lastScorers
    .map(([num, n]) => `${playerLink(num)}${n > 1 ? ` (${n})` : ''}`).join(', ')}.</p>` : ''}
            ${lastM.isWalkover ? `<p class="psn__note">${esc(FRIENDLY_NOTE_SHORT)}</p>` : ''}
          </div>
        </div>
      </div>
    </section>` : '';

  /* ---- On this day --------------------------------------------------------
     Empty on most days of the year, and that is the shape of the thing rather
     than a fault in it. `d.todayISO` is the day the site was generated, so
     this is as current as the last publish and says its own date so nobody has
     to guess how fresh it is. */
  const otd = onThisDay(d);
  const onThisDayBand = otd.length ? `<section class="sec sec--onthisday" id="onthisday" aria-labelledby="otd-h">
      <div class="wrap">
        ${bandHead('onthisday', 'On this day', esc(dayMonthYear(d.todayISO)), '/results.html', 'Every result', 'otd-h')}
        ${rowList(otd.map((m) => ({
    a: `${oppBadge(m.opponent, d.badges, 22, 22, 'psn__b')}<b>${esc(shortClub(m.opponent))}</b>`,
    b: esc(`${m.iso.slice(0, 4)} · ${m.competition}`),
    c: `<a href="/matches/${attr(m.slug)}.html">${esc(m.isWalkover ? 'W/O' : (m.ourScoreline || m.scoreline))}</a>`,
  })))}
      </div>
    </section>` : '';

  /* ---- The run ------------------------------------------------------------
     Each live run beside the longest the club has managed, because a run with
     no scale beside it reads as a verdict. Two wins is the start of something
     or the end of something depending entirely on the ten beside it. */
  const runs = currentRun(d.competitive);
  const runBand = runs.length ? `<section class="sec sec--streak" id="streak" aria-labelledby="run-h">
      <div class="wrap">
        ${bandHead('streak', 'The run', 'As it stands', '/records.html', 'Every record', 'run-h')}
        ${tileGrid(runs.map((r) => ({
    v: r.n,
    l: r.n === 1 ? r.one : r.label,
    s: r.all ? 'Everything the club has played'
      : `Best: ${r.best}${r.since ? ` · since ${dayMonthYear(r.since.iso)}` : ''}`,
  })))}
        <p class="psn__note rv">Competitive matches only. ${esc(FRIENDLY_NOTE_SHORT)}</p>
      </div>
    </section>` : '';

  /* ---- League and cup -----------------------------------------------------
     A club that reads only its league record is hiding its cup exits inside
     it. Split, they are two different seasons. */
  const comps = byCompetition(d.competitive.filter((m) => m.played));
  const compsBand = comps.length > 1 ? `<section class="sec sec--competitions" id="competitions" aria-labelledby="cmp2-h">
      <div class="wrap">
        ${bandHead('competitions', 'League and cup', `${comps.length} competitions`, '/results.html', 'Every result', 'cmp2-h')}
        ${rowList(comps.map((c) => ({
    a: `<b>${esc(c.competition)}</b>`,
    b: esc(`Played ${c.played}, won ${c.won}${c.drawn ? `, drawn ${c.drawn}` : ''}${c.lost ? `, lost ${c.lost}` : ''}`),
    c: esc(`${c.goalsFor}-${c.goalsAgainst}`),
  })))}
      </div>
    </section>` : '';

  /* ---- Home and away ------------------------------------------------------ */
  const ha = homeAwaySplit(d.competitive.filter((m) => m.played));
  const homeAwayBand = (ha.home.played && ha.away.played) ? `<section class="sec sec--homeaway" id="homeaway" aria-labelledby="ha-h">
      <div class="wrap">
        ${bandHead('homeaway', 'Home and away', esc(G.name || 'The home ground'), '/results.html', 'Every result', 'ha-h')}
        ${tileGrid([
    { v: `${ha.home.won}/${ha.home.played}`, l: 'Won at home', s: `${ha.home.goalsFor}-${ha.home.goalsAgainst} · ${ha.home.cleanSheets} clean sheets` },
    { v: `${ha.away.won}/${ha.away.played}`, l: 'Won away', s: `${ha.away.goalsFor}-${ha.away.goalsAgainst} · ${ha.away.cleanSheets} clean sheets` },
    { v: ha.home.goalsPerGame, l: 'Goals a game at home', s: `${ha.home.concededPerGame} conceded` },
    { v: ha.away.goalsPerGame, l: 'Goals a game away', s: `${ha.away.concededPerGame} conceded` },
  ])}
        <p class="psn__note rv">Competitive matches only. ${esc(FRIENDLY_NOTE_SHORT)}</p>
      </div>
    </section>` : '';

  /* ---- Every club played --------------------------------------------------
     Grouped on the opponent as the records hold it, never on a reduced form:
     Pure Football FC 1st Team and Pure Football FC 2.0 are two clubs, and one
     row covering both would claim a record against a side never met. */
  const h2h = opponentRecords(d.competitive);
  const headToHeadBand = h2h.length ? `<section class="sec sec--headtohead" id="headtohead" aria-labelledby="h2h-h">
      <div class="wrap">
        ${bandHead('headtohead', 'Every club played', `${h2h.length} opponents`, '/results.html', 'Every result', 'h2h-h')}
        ${rowList(h2h.slice(0, 12).map((r) => ({
    a: `${oppBadge(r.opponent, d.badges, 22, 22, 'psn__b')}<b>${esc(shortClub(r.opponent))}</b>`,
    b: esc(`Played ${r.played}, won ${r.won}${r.drawn ? `, drawn ${r.drawn}` : ''}${r.lost ? `, lost ${r.lost}` : ''}`),
    c: esc(`${r.goalsFor}-${r.goalsAgainst}`),
  })))}
        ${h2h.length > 12 ? `<p class="psn__note rv">${esc(`The twelve played most often, of ${h2h.length}.`)}</p>` : ''}
      </div>
    </section>` : '';

  /* ---- The five leaderboards ----------------------------------------------
     leaderboard() drops trialists and anybody on nought, which is what makes
     these empty themselves rather than publishing a column of zeroes. */
  const topScorers = leaderboard(d.players, 'goals', 8);
  const scorersBand = topScorers.length ? `<section class="sec sec--scorers" id="scorers" aria-labelledby="sc-h">
      <div class="wrap">
        ${bandHead('scorers', 'Who scores the goals', `${all.goalsFor} scored`, '/stats.html', 'Every figure', 'sc-h')}
        ${leaderList(topScorers, 'goals', 'goals')}
      </div>
    </section>` : '';

  const topCreators = leaderboard(d.players, 'assists', 8);
  const creatorsBand = topCreators.length ? `<section class="sec sec--creators" id="creators" aria-labelledby="cr-h">
      <div class="wrap">
        ${bandHead('creators', 'Who makes them', 'Assists', '/stats.html', 'Every figure', 'cr-h')}
        ${leaderList(topCreators, 'assists', 'assists')}
      </div>
    </section>` : '';

  const topApps = leaderboard(d.players, 'apps', 8);
  const appearancesBand = topApps.length ? `<section class="sec sec--appearances" id="appearances" aria-labelledby="ap-h">
      <div class="wrap">
        ${bandHead('appearances', 'Who turns up', 'Appearances', '/squad.html', 'The squad', 'ap-h')}
        ${leaderList(topApps, 'apps', 'starts')}
        <p class="psn__note rv">Starts only. Sunday-league returns do not record substitutes
          or minutes, so neither is claimed.</p>
      </div>
    </section>` : '';

  const topMotm = leaderboard(d.players, 'motm', 8);
  const motmBand = topMotm.length ? `<section class="sec sec--motm" id="motm" aria-labelledby="mo-h">
      <div class="wrap">
        ${bandHead('motm', 'Man of the match', 'From the team sheets', '/stats.html', 'Every figure', 'mo-h')}
        ${leaderList(topMotm, 'motm', 'awards')}
      </div>
    </section>` : '';

  const topCaps = leaderboard(d.players, 'captained', 6);
  const captainsBand = topCaps.length ? `<section class="sec sec--captains" id="captains" aria-labelledby="cap-h">
      <div class="wrap">
        ${bandHead('captains', 'Who wears the armband', 'From the team sheets', '/squad.html', 'The squad', 'cap-h')}
        ${leaderList(topCaps, 'captained', 'times')}
      </div>
    </section>` : '';

  /* ---- How the goals come -------------------------------------------------
     The share is over the goals that actually record how they were struck, and
     the band says which number that is. A percentage quoted over a quarter of
     the evidence, published without saying so, gets repeated back as fact. */
  const gk = goalKinds(d.competitive);
  const goalKindsBand = gk.rows.length ? `<section class="sec sec--goalkinds" id="goalkinds" aria-labelledby="gk-h">
      <div class="wrap">
        ${bandHead('goalkinds', 'How the goals come', `${gk.total} goals`, '/stats.html', 'Every figure', 'gk-h')}
        <ul class="gkin rv">
          ${gk.rows.map((r) => `<li class="gkin__r">
            <b>${esc(r.label)}</b>
            <span class="gkin__bar"><i style="width:${attr(String(r.pct))}%"></i></span>
            <span class="gkin__n">${esc(String(r.n))}<i>${esc(`${r.pct}%`)}</i></span>
          </li>`).join('\n          ')}
        </ul>
        <p class="psn__note rv">${esc(gk.unknown
    ? `Counted over the ${gk.known} goals of ${gk.total} that record how they were struck. The other ${gk.unknown} are not guessed at.`
    : `All ${gk.total} goals, from the match records. Walkovers carry no goals and are not counted.`)}</p>
      </div>
    </section>` : '';

  /* ---- Clean sheets ------------------------------------------------------- */
  const csRun = longestRun(d.competitive, (m) => m.theirGoals === 0, { goalRecordOnly: true });
  const cleanSheetsBand = all.cleanSheets ? `<section class="sec sec--cleansheets" id="cleansheets" aria-labelledby="cs-h">
      <div class="wrap">
        ${bandHead('cleansheets', 'Clean sheets', 'At the back', '/records.html', 'Every record', 'cs-h')}
        ${tileGrid([
    { v: all.cleanSheets, l: 'Clean sheets', s: `of ${all.onGoalRecord} matches with a goal record` },
    { v: `${cleanPct}%`, l: 'Of matches played', s: `${all.goalsAgainst} conceded in all` },
    { v: csRun, l: csRun === 1 ? 'In a row' : 'In a row, at best', s: 'Longest run without conceding' },
    { v: all.concededPerGame, l: 'Conceded a game', s: `${all.goalsPerGame} scored` },
  ])}
        <p class="psn__note rv">Competitive matches only. ${esc(FRIENDLY_NOTE_SHORT)}</p>
      </div>
    </section>` : '';

  /* ---- Player of the Month ------------------------------------------------
     The latest one on its own, with the reason. Which one is latest is worked
     out from the month NAME, because these records carry no date: see
     potmLatest() in home-layout.mjs. */
  const potm = potmLatest(d);
  const potmPlayer = potm ? bySlug.get(Number(potm.playerId)) : null;
  const potmShot = potmPlayer ? d.shotFor(potmPlayer.num) : '';
  const potmBand = potm ? `<section class="sec sec--potm" id="potm" aria-labelledby="pom-h">
      <div class="wrap">
        ${bandHead('potm', 'Player of the Month', esc(`${potm.month || ''} ${potm.season || ''}`.trim()), '/awards.html', 'Every award', 'pom-h')}
        <div class="pom rv">
          ${potmShot
    ? `<img class="pom__photo" src="${attr(potmShot)}" alt="" width="160" height="160" loading="lazy" decoding="async" />`
    : `<span class="pom__photo pom__photo--none"><img src="${STAR}" alt="" width="48" height="59" loading="lazy" decoding="async" /></span>`}
          <div class="pom__body">
            <b>${potmPlayer ? playerLink(potmPlayer.num) : esc(potm.playerName || potm.title || 'Player of the Month')}</b>
            ${potm.reason || potm.description ? `<p>${esc(potm.reason || potm.description)}</p>` : ''}
          </div>
        </div>
      </div>
    </section>` : '';

  /* ---- New at the club ----------------------------------------------------
     Derived from who has played, never set, so it cannot disagree with the
     squad pages and nobody has to remember to expire it. */
  const faces = newFaces(d);
  const newFacesBand = faces.length ? `<section class="sec sec--newfaces" id="newfaces" aria-labelledby="nf-h">
      <div class="wrap">
        ${bandHead('newfaces', 'New at the club', esc(`First season · ${d.latestSeason}`), '/squad.html', 'The squad', 'nf-h')}
        <ul class="sqd rv">
          ${faces.map((p) => {
    const shot = d.shotFor(p.num);
    return `<li class="sqd__c"><a href="/players/${attr(p.slug)}.html">
              ${shot
    ? `<img class="sqd__i" src="${attr(shot)}" alt="" width="120" height="120" loading="lazy" decoding="async" />`
    : `<span class="sqd__i sqd__i--none"><img src="${STAR}" alt="" width="34" height="42" loading="lazy" decoding="async" /></span>`}
              <b>${esc(p.name)}</b>
              <span>${esc(p.position || '')}</span>
            </a></li>`;
  }).join('\n          ')}
        </ul>
      </div>
    </section>` : '';

  /* ---- Every season -------------------------------------------------------
     The division comes from divisionOf(), not from the season record's own
     `league` field, which reads TBC until a season starts. */
  const seasonRows = (d.seasons || []).map((s) => {
    const list = d.competitive.filter((m) => m.played && m.season === s.name);
    return { name: s.name, sum: teamSummary(list), div: d.divisionOf(s.name) };
  }).filter((s) => s.sum.played > 0);
  /* More than one, or it is not a comparison. One row under "Every season" is
     the campaign band with the detail taken out. */
  const seasonsBand = seasonRows.length > 1 ? `<section class="sec sec--seasons" id="seasons" aria-labelledby="ssn-h">
      <div class="wrap">
        ${bandHead('seasons', 'Every season', 'Since 2025', '/results.html', 'Every result', 'ssn-h')}
        ${rowList(seasonRows.map((s) => ({
    a: `<b>${esc(s.name)}</b>`,
    b: esc(`${s.div} · played ${s.sum.played}, won ${s.sum.won}${s.sum.drawn ? `, drawn ${s.sum.drawn}` : ''}${s.sum.lost ? `, lost ${s.sum.lost}` : ''}`),
    c: esc(`${s.sum.goalsFor}-${s.sum.goalsAgainst}`),
  })))}
      </div>
    </section>` : '';

  /* ---- What the club has won ---------------------------------------------- */
  const honours = honoursIn(d);
  const honoursBand = honours.length ? `<section class="sec sec--honours" id="honours" aria-labelledby="hon-h">
      <div class="wrap">
        ${bandHead('honours', 'What the club has won', 'Honours', '/awards.html', 'Every award', 'hon-h')}
        <ul class="rcd rv">
          ${honours.map((h) => `<li class="rcd__c">
            <span class="rcd__v">${esc(String(h.value || h.season || ''))}</span>
            <b class="rcd__l">${esc(h.title || '')}</b>
            <span class="rcd__w">${esc(h.season || '')}</span>
          </li>`).join('\n          ')}
        </ul>
      </div>
    </section>` : '';

  /* ---- Back the club ------------------------------------------------------
     What sponsorship actually buys. The cause is deliberately not in here:
     it has its own page and a death is not a selling point. */
  const backBand = (SPONSOR_TIERS || []).length ? `<section class="sec sec--back" id="back" aria-labelledby="bk-h">
      <div class="wrap">
        ${bandHead('back', 'Back the club', 'Sponsorship', '/sponsors.html', 'The full pack', 'bk-h')}
        <ul class="tier rv">
          ${SPONSOR_TIERS.map((t) => `<li class="tier__c">
            <b>${esc(t.name)}</b>
            <p>${esc(t.body)}</p>
            <ul>${(t.items || []).map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
          </li>`).join('\n          ')}
        </ul>
      </div>
    </section>` : '';

  /* ---- Chip in ------------------------------------------------------------
     The link is the club's, set in Control panel -> Donations. With no link
     the band is not published at all rather than showing a button going
     nowhere. */
  const giveUrl = (d.donate && (d.donate.clubUrl || d.donate.stripeLink)) || '';
  const giveBand = giveUrl ? `<section class="sec sec--give" id="give" aria-labelledby="gv-h">
      <div class="wrap">
        ${bandHead('give', 'Chip in', 'Donations', '', '', 'gv-h')}
        <div class="giv rv">
          <p>Pitch hire, match fees, kit and referees. Every donation goes into running
            the football, and any amount is a help.</p>
          <a class="btn btn--volt" href="${attr(giveUrl)}" target="_blank" rel="noopener">Donate ${ARROW}</a>
        </div>
      </div>
    </section>` : '';

  /* ==========================================================================
     THIRTY MORE, ALSO OFF

     Same rule as the twenty before them and for the same reason. Seventy bands
     is not a page; it is a set of parts the club builds a page out of, and the
     ones nobody has chosen must cost the visitor nothing.

     Four of these are empty on the club's own records today: the preview until
     somebody writes one, "waiting on a score" whenever the results are up to
     date, "on this day" on most days, and "every season" until there is a
     second season to compare. All four fill by themselves.
     ========================================================================== */

  /* ---- The preview -------------------------------------------------------- */
  const prev = previewFor(d);
  const previewBand = prev ? `<section class="sec sec--preview" id="preview" aria-labelledby="prv-h">
      <div class="wrap">
        ${bandHead('preview', 'The preview', esc(`${prev.fixture.competition || 'Next up'} · ${shortClub(prev.fixture.opponent)}`), '/fixtures.html', 'All fixtures', 'prv-h')}
        <div class="prv rv">
          <span class="prv__b">${oppBadge(prev.fixture.opponent, d.badges, 48, 48)}</span>
          <div class="prv__t">${reportOpening({ detail: { commentary: prev.text } }, 3)
    .map((p) => `<p>${esc(p)}</p>`).join('\n            ') || `<p>${esc(prev.text)}</p>`}</div>
        </div>
      </div>
    </section>` : '';

  /* ---- Waiting on a score -------------------------------------------------
     A match whose date has been and gone with no result typed in. These carry
     no goals and no outcome and nothing derived ever counts them, so this band
     is the only place on the site they appear: without it, the morning after a
     match the club's own game is simply missing until somebody opens the
     panel. */
  const awaitingBand = (d.awaiting || []).length ? `<section class="sec sec--awaiting" id="awaiting" aria-labelledby="awt-h">
      <div class="wrap">
        ${bandHead('awaiting', 'Waiting on a score', `${d.awaiting.length} played`, '/results.html', 'Every result', 'awt-h')}
        ${rowList(d.awaiting.map((m) => ({
    a: `${oppBadge(m.opponent, d.badges, 22, 22, 'psn__b')}<b>${esc(shortClub(m.opponent))}</b>`,
    b: esc(`${m.dateLabel || dayMonthYear(m.iso || m.date)}${m.competition ? ` · ${m.competition}` : ''}`),
    c: `<i>${esc('Result to come')}</i>`,
  })))}
        <p class="psn__note rv">Played, and the score is not in yet. Nothing derived counts
          these: they carry no goals and no outcome until somebody enters one.</p>
      </div>
    </section>` : '';

  /* ---- The latest story ---------------------------------------------------- */
  const lead = d.articles[0];
  const leadNewsBand = lead ? `<section class="sec sec--leadnews" id="leadnews" aria-labelledby="lds-h">
      <div class="wrap">
        ${bandHead('leadnews', 'The latest story', esc(lead.category || 'Club news'), '/news.html', 'All news', 'lds-h')}
        <a class="lead rv" href="/news/${attr(lead.slug)}.html">
          ${lead.cover
    ? `<img class="lead__i" src="${attr(lead.cover)}" alt="" width="520" height="340" loading="lazy" decoding="async" />`
    : `<span class="lead__i lead__i--none"><img src="${STAR}" alt="" width="54" height="66" loading="lazy" decoding="async" /></span>`}
          <span class="lead__t">
            <b>${esc(lead.title)}</b>
            ${lead.lede ? `<span class="lead__d">${esc(lead.lede)}</span>` : ''}
            <span class="lead__m">${esc(lead.date || '')}${lead.author ? ` · ${esc(lead.author)}` : ''}</span>
          </span>
        </a>
      </div>
    </section>` : '';

  /* ---- Around the league --------------------------------------------------
     The division's other results. The site already holds all ninety, because
     it prints them on the league page; this is the ones the club was not in,
     which is the half a supporter cannot get from the results band. */
  const others = otherResults(d).slice(0, 10);
  const aroundLeagueBand = others.length ? `<section class="sec sec--aroundleague" id="aroundleague" aria-labelledby="arl-h">
      <div class="wrap">
        ${bandHead('aroundleague', 'Around the league', esc(d.divisionOf(d.currentSeason)), '/league.html', 'The whole division', 'arl-h')}
        ${rowList(others.map((r) => ({
    a: `<b>${esc(shortClub(r.home))}</b>`,
    b: esc(r.date || ''),
    c: `${esc(`${r.hs}-${r.as}`)} <i>${esc(shortClub(r.away))}</i>`,
  })))}
        <p class="psn__note rv">${esc(`The ten most recent of ${otherResults(d).length} the club was not involved in.`)}</p>
      </div>
    </section>` : '';

  /* ---- How the club lines up ---------------------------------------------- */
  const fu = formationUse(d.competitive);
  const formationsBand = fu.rows.length ? `<section class="sec sec--formations" id="formations" aria-labelledby="frm-h">
      <div class="wrap">
        ${bandHead('formations', 'How the club lines up', `${fu.rows.length} shapes`, '/results.html', 'Every result', 'frm-h')}
        <ul class="gkin rv">
          ${fu.rows.map((r) => `<li class="gkin__r">
            <b>${esc(r.formation)}</b>
            <span class="gkin__bar"><i style="width:${attr(String(r.pct))}%"></i></span>
            <span class="gkin__n">${esc(String(r.n))}<i>${esc(`${r.won} won`)}</i></span>
          </li>`).join('\n          ')}
        </ul>
        <p class="psn__note rv">${esc(`From the ${fu.total} team sheets of ${fu.of} that record a shape.`)}</p>
      </div>
    </section>` : '';

  /* ---- The awarded matches ------------------------------------------------
     The awkward part of the record, said out loud. Three of the club's
     matches were awarded and carry no score, which is exactly why the rest of
     the figures are believable. */
  const wos = d.competitive.filter((m) => m.played && m.isWalkover);
  const walkoversBand = wos.length ? `<section class="sec sec--walkovers" id="walkovers" aria-labelledby="wov-h">
      <div class="wrap">
        ${bandHead('walkovers', 'The awarded matches', `${wos.length} of ${all.played}`, '/results.html', 'Every result', 'wov-h')}
        ${rowList(wos.map((m) => ({
    a: `${oppBadge(m.opponent, d.badges, 22, 22, 'psn__b')}<b>${esc(shortClub(m.opponent))}</b>`,
    b: esc(`${dayMonthYear(m.iso || m.date)} · ${m.competition}`),
    c: `<a href="/matches/${attr(m.slug)}.html">${esc('W/O')}</a>`,
  })))}
        <p class="psn__note rv">${esc(`Awarded rather than played. They count as matches and as points, `
    + `and they carry no goals at all, which is how the official table treats them: `
    + `${all.played - wos.length} results plus ${wos.length} awarded is ${all.points} points.`)}</p>
      </div>
    </section>` : '';

  /* ---- How the wins came --------------------------------------------------- */
  const wm = winMargins(d.competitive);
  const marginsBand = wm.rows.length ? `<section class="sec sec--margins" id="margins" aria-labelledby="mrg-h">
      <div class="wrap">
        ${bandHead('margins', 'How the wins came', `${wm.wins} wins`, '/results.html', 'Every result', 'mrg-h')}
        <ul class="gkin rv">
          ${wm.rows.map((r) => `<li class="gkin__r">
            <b>${esc(`By ${r.margin}`)}</b>
            <span class="gkin__bar"><i style="width:${attr(String(Math.max(3, r.pct)))}%"></i></span>
            <span class="gkin__n">${esc(String(r.n))}<i>${esc(`${r.pct}%`)}</i></span>
          </li>`).join('\n          ')}
        </ul>
        <p class="psn__note rv">${esc(wm.awarded
    ? `Over the ${wm.scored} wins with a score. The other ${wm.awarded} were awarded and have no margin.`
    : `Over all ${wm.scored} wins.`)}</p>
      </div>
    </section>` : '';

  /* ---- Goals and assists together ------------------------------------------ */
  const contribRows = d.players
    .filter((p) => !p.trialist && ((p.goals || 0) + (p.assists || 0)) > 0)
    .map((p) => ({ ...p, contrib: (p.goals || 0) + (p.assists || 0) }))
    .sort((a, b) => b.contrib - a.contrib || (b.goals || 0) - (a.goals || 0)
      || String(a.name).localeCompare(String(b.name)))
    .slice(0, 8);
  const contributionsBand = contribRows.length ? `<section class="sec sec--contributions" id="contributions" aria-labelledby="ctr-h">
      <div class="wrap">
        ${bandHead('contributions', 'Goals and assists', `${all.goalsFor} scored`, '/stats.html', 'Every figure', 'ctr-h')}
        <ol class="lbd rv">
          ${contribRows.map((p, i) => `<li class="lbd__r">
            <span class="lbd__n">${esc(String(i + 1))}</span>
            <span class="lbd__p">${playerLink(p.num, p.name)}<i>${esc(`${p.goals} scored · ${p.assists} made`)}</i></span>
            <span class="lbd__v">${esc(String(p.contrib))}<i>total</i></span>
          </li>`).join('\n          ')}
        </ol>
      </div>
    </section>` : '';

  /* ---- The division's scorers ---------------------------------------------
     Typed in from the league rather than derived, which is a different kind of
     figure from everything else here, so the band says so. */
  const lsc = (d.leagueScorers || []).slice(0, 10);
  const leagueScorersBand = lsc.length ? `<section class="sec sec--leaguescorers" id="leaguescorers" aria-labelledby="lsc-h">
      <div class="wrap">
        ${bandHead('leaguescorers', 'The division’s scorers', esc(d.divisionOf(d.currentSeason)), '/league.html', 'The whole division', 'lsc-h')}
        <ol class="lbd rv">
          ${lsc.map((r, i) => `<li class="lbd__r${r.us ? ' lbd__r--us' : ''}">
            <span class="lbd__n">${esc(String(r.pos || i + 1))}</span>
            <span class="lbd__p"><b>${esc(r.name)}</b><i>${esc(shortClub(r.club))}</i></span>
            <span class="lbd__v">${esc(String(r.goals))}<i>goals</i></span>
          </li>`).join('\n          ')}
        </ol>
        <p class="psn__note rv">The league’s own chart, transcribed rather than derived, so
          it is only as current as the last time somebody updated it.</p>
      </div>
    </section>` : '';

  /* ---- The biggest wins ---------------------------------------------------- */
  const bigs = d.competitive
    .filter((m) => m.played && m.countsGoals && m.outcome === 'W')
    .map((m) => ({ m, by: (m.ourGoals || 0) - (m.theirGoals || 0) }))
    .sort((a, b) => b.by - a.by || String(b.m.iso).localeCompare(String(a.m.iso)))
    .slice(0, 6);
  const bigWinsBand = bigs.length ? `<section class="sec sec--bigwins" id="bigwins" aria-labelledby="bgw-h">
      <div class="wrap">
        ${bandHead('bigwins', 'The biggest wins', 'By margin', '/records.html', 'Every record', 'bgw-h')}
        ${rowList(bigs.map(({ m }) => ({
    a: `${oppBadge(m.opponent, d.badges, 22, 22, 'psn__b')}<b>${esc(shortClub(m.opponent))}</b>`,
    b: esc(`${dayMonthYear(m.iso || m.date)} · ${m.competition}`),
    c: `<a href="/matches/${attr(m.slug)}.html">${esc(m.ourScoreline || m.scoreline)}</a>`,
  })))}
      </div>
    </section>` : '';

  /* ---- From the spot -------------------------------------------------------
     Awarded is scored plus missed, because a conversion rate over the ones
     that went in is a hundred per cent by construction. */
  const pen = penaltyRecord(d.competitive, d.nameFor);
  const penaltiesBand = (pen.scored + pen.missed + pen.conceded) ? `<section class="sec sec--penalties" id="penalties" aria-labelledby="pen-h">
      <div class="wrap">
        ${bandHead('penalties', 'From the spot', `${pen.awarded} awarded`, '/stats.html', 'Every figure', 'pen-h')}
        ${tileGrid([
    { v: pen.scored, l: 'Scored', s: pen.awarded ? `of ${pen.awarded} awarded` : '' },
    pen.missed ? { v: pen.missed, l: pen.missed === 1 ? 'Missed' : 'Missed', s: `${Math.round((pen.scored / pen.awarded) * 100)}% put away` } : null,
    pen.conceded ? { v: pen.conceded, l: 'Conceded', s: 'Given away at the other end' } : null,
    pen.takers.length ? { v: pen.takers.length, l: pen.takers.length === 1 ? 'Taker' : 'Takers', s: pen.takers.map((t) => `${t.name} ${t.n}`).join(' · ') } : null,
  ])}
        <p class="psn__note rv">Competitive matches only. ${esc(FRIENDLY_NOTE_SHORT)}</p>
      </div>
    </section>` : '';

  /* ---- Bookings -----------------------------------------------------------
     The denominator is said out loud. Eight yellows in 33 matches is only a
     disciplinary record if those 33 records actually carry a card list, and
     saying how many do is the difference between a figure and a claim. */
  const disc = disciplineRecord(d.competitive);
  const disciplineBand = (disc.recorded && (disc.yellow + disc.red + disc.conceded)) ? `<section class="sec sec--discipline" id="discipline" aria-labelledby="dsc-h">
      <div class="wrap">
        ${bandHead('discipline', 'Bookings', `${disc.recorded} matches recorded`, '/stats.html', 'Every figure', 'dsc-h')}
        ${tileGrid([
    { v: disc.yellow, l: disc.yellow === 1 ? 'Yellow card' : 'Yellow cards', s: `${(disc.yellow / Math.max(disc.recorded, 1)).toFixed(2)} a match` },
    { v: disc.red, l: disc.red === 1 ? 'Red card' : 'Red cards', s: disc.red ? 'Across the whole archive' : 'None' },
    disc.conceded ? { v: disc.conceded, l: 'Opponents sent off', s: 'At the other end' } : null,
  ])}
        <p class="psn__note rv">${esc(disc.recorded === disc.played
    ? `As the records carry them, over all ${disc.played} competitive matches.`
    : `As the records carry them, over the ${disc.recorded} matches of ${disc.played} `
      + 'that hold a card list at all. Nothing is estimated for the rest.')}</p>
      </div>
    </section>` : '';

  /* ---- The scorelines ------------------------------------------------------ */
  const lines = commonScorelines(d.competitive, 6);
  const scorelinesBand = lines.length ? `<section class="sec sec--scorelines" id="scorelines" aria-labelledby="scl-h">
      <div class="wrap">
        ${bandHead('scorelines', 'The scorelines', 'Most often', '/results.html', 'Every result', 'scl-h')}
        ${rowList(lines.map((r) => ({
    a: `<b>${esc(r.scoreline)}</b>`,
    b: esc(r.count === 1 ? 'Once' : `${r.count} times`),
    c: esc(`${Math.round((r.count / all.onGoalRecord) * 100)}%`),
  })))}
        <p class="psn__note rv">${esc(`The club's goals first, over the ${all.onGoalRecord} matches carrying a score.`)}</p>
      </div>
    </section>` : '';

  /* ---- Month by month ------------------------------------------------------ */
  const months = byMonth(d.competitive);
  const monthsBand = months.length > 1 ? `<section class="sec sec--months" id="months" aria-labelledby="mth-h">
      <div class="wrap">
        ${bandHead('months', 'Month by month', `${months.length} months`, '/results.html', 'Every result', 'mth-h')}
        ${rowList(months.map((m) => ({
    a: `<b>${esc(m.label)}</b>`,
    b: esc(`Played ${m.played}, won ${m.won}${m.drawn ? `, drawn ${m.drawn}` : ''}${m.lost ? `, lost ${m.lost}` : ''}`),
    c: esc(`${m.goalsFor}-${m.goalsAgainst}`),
  })))}
      </div>
    </section>` : '';

  /* ---- The captaincy ------------------------------------------------------
     Who HOLDS the armband, which is not the question "who wears the armband"
     answers: that one counts team sheets, this one is the club's own
     appointment and lives in the recognition record. */
  const lead2 = leadershipIn(d);
  const capRow = (label, name) => (name ? `<li class="rcd__c">
            <span class="rcd__v">${SVG.trophy}</span>
            <b class="rcd__l">${esc(name)}</b>
            <span class="rcd__w">${esc(label)}</span>
          </li>` : '');
  const leadershipBand = lead2 ? `<section class="sec sec--leadership" id="leadership" aria-labelledby="ldr-h">
      <div class="wrap">
        ${bandHead('leadership', 'The captaincy', esc(lead2.season || ''), '/squad.html', 'The squad', 'ldr-h')}
        <ul class="rcd rcd--ico rv">
          ${capRow('Club captain', lead2.clubCaptainName)}
          ${capRow('Vice captain', lead2.viceCaptainName)}
          ${capRow('Third choice', lead2.thirdChoiceCaptainName)}
        </ul>
      </div>
    </section>` : '';

  /* ---- How the squad breaks down ------------------------------------------- */
  const shape = squadShape(d.squad && d.squad.length ? d.squad : d.players);
  const positionsBand = shape.length ? `<section class="sec sec--positions" id="positions" aria-labelledby="pos-h">
      <div class="wrap">
        ${bandHead('positions', 'How the squad breaks down', `${shape.reduce((n, r) => n + r.n, 0)} players`, '/squad.html', 'The squad', 'pos-h')}
        ${tileGrid(shape.map((r) => ({ v: r.n, l: r.label, s: '' })))}
        <p class="psn__note rv">Grouped by where each player has actually lined up, not by
          anything anybody sets. Move somebody and this moves with them.</p>
      </div>
    </section>` : '';

  /* ---- Scoring runs -------------------------------------------------------- */
  const runsList = scoringRuns(d.players, d.competitive, 6);
  const scoringRunsBand = runsList.length ? `<section class="sec sec--scoringruns" id="scoringruns" aria-labelledby="srn-h">
      <div class="wrap">
        ${bandHead('scoringruns', 'Scoring runs', 'Consecutive appearances', '/stats.html', 'Every figure', 'srn-h')}
        ${rowList(runsList.map((r) => ({
    a: `<b>${playerLink(r.player.num, r.player.name)}</b>`,
    /* playerStreak returns MATCHES in `from`/`to`, not the appearance records
       it walked to find them. */
    b: esc(r.run.from && r.run.to
      ? `${dayMonthYear(r.run.from.iso)} to ${dayMonthYear(r.run.to.iso)}`
      : ''),
    c: esc(`${r.run.length} in a row`),
  })))}
        <p class="psn__note rv">Read off each player’s own appearances, so a match he was
          not involved in does not break the run.</p>
      </div>
    </section>` : '';

  /* ---- Firsts and honours (the ones somebody set) -------------------------- */
  const holders = recordHoldersIn(d);
  const recordHoldersBand = holders.length ? `<section class="sec sec--recordholders" id="recordholders" aria-labelledby="rch-h">
      <div class="wrap">
        ${bandHead('recordholders', 'Firsts and honours', 'Set by the club', '/records.html', 'Every record', 'rch-h')}
        <ul class="rcd rv">
          ${holders.map((r) => `<li class="rcd__c">
            <!-- The SEASON in the figure slot, not the value. On a club_record
                 the value is usually a person: "Jim El Bayati" set in 30px
                 display type wrapped to two lines and read as a headline with
                 the record itself demoted underneath it. The season is short,
                 it is the thing that differs between cards, and it leaves the
                 name where a name belongs. -->
            <span class="rcd__v">${esc(String(r.season || ''))}</span>
            <b class="rcd__l">${esc(r.title || '')}</b>
            <span class="rcd__w">${esc(String(r.playerName || r.value || ''))}</span>
          </li>`).join('\n          ')}
        </ul>
        <p class="psn__note rv">The ones the archive cannot work out on its own. Everything
          countable is in Club records.</p>
      </div>
    </section>` : '';

  /* ---- Follow the club ----------------------------------------------------- */
  const followBand = (SOCIALS || []).length ? `<section class="sec sec--follow" id="follow" aria-labelledby="flw-h">
      <div class="wrap">
        ${bandHead('follow', 'Follow the club', 'Every week', '', '', 'flw-h')}
        <ul class="soc rv">
          ${SOCIALS.map((s) => `<li><a class="soc__c" href="${attr(s.href)}" rel="me noopener" target="_blank">
            ${SVG[s.icon] || ''}<b>${esc(s.label || s.icon)}</b>
          </a></li>`).join('\n          ')}
        </ul>
      </div>
    </section>` : '';

  /* ---- Four ways in -------------------------------------------------------- */
  const joinPathsBand = (JOIN_PATHS || []).length ? `<section class="sec sec--joinpaths" id="joinpaths" aria-labelledby="jpt-h">
      <div class="wrap">
        ${bandHead('joinpaths', 'Four ways in', 'Get involved', '/join.html', 'The whole thing', 'jpt-h')}
        <ul class="tier rv">
          ${JOIN_PATHS.map((p) => `<li class="tier__c">
            <b>${esc(p.title)}</b>
            <p>${esc(p.body)}</p>
          </li>`).join('\n          ')}
        </ul>
      </div>
    </section>` : '';

  /* ---- Questions about joining -------------------------------------------- */
  const joinFaqsBand = (JOIN_FAQS || []).length ? `<section class="sec sec--joinfaqs" id="joinfaqs" aria-labelledby="jfq-h">
      <div class="wrap rv">
        ${rail('joinfaqs', 'Questions about joining')}
        <h2 class="h2" id="jfq-h">Questions about joining<span class="volt">.</span></h2>
      </div>
      <div class="wrap">
        <div class="faq rv">
          ${JOIN_FAQS.map((f) => `<details class="faq__item">
            <summary class="faq__q">${esc(f.q)}<span class="faq__ico" aria-hidden="true">+</span></summary>
            <div class="faq__a"><p>${esc(f.a)}</p></div>
          </details>`).join('\n          ')}
        </div>
      </div>
    </section>` : '';

  /* ---- Get in touch -------------------------------------------------------
     A REAL form, and it writes to the enquiries table AND posts the notify
     endpoint, because a form that only emailed would record nothing while
     RESEND_API_KEY is unset. Its ids are prefixed so they cannot collide with
     the footer's, which sits on the same page. */
  const contactBand = `<section class="sec sec--contact" id="contact" aria-labelledby="cnt-h">
      <div class="wrap">
        ${bandHead('contact', 'Get in touch', 'The club', '/contact.html', 'Other ways', 'cnt-h')}
        <form class="cform rv" data-enquiry data-enquiry-type="general" data-enquiry-requires-message novalidate>
          <div class="cform__sum" data-error-summary hidden>
            <b>Please check the form</b>
            <ul data-error-list></ul>
          </div>
          <p class="cform__f">
            <label for="hc-name">Your name</label>
            <input id="hc-name" name="name" type="text" autocomplete="name" required />
            <span class="cform__e" data-error-for="name" hidden></span>
          </p>
          <p class="cform__f">
            <label for="hc-email">Email</label>
            <input id="hc-email" name="email" type="email" inputmode="email" autocomplete="email" required />
            <span class="cform__e" data-error-for="email" hidden></span>
          </p>
          <p class="cform__f cform__f--wide">
            <label for="hc-message">What can we help with?</label>
            <textarea id="hc-message" name="message" rows="3" required></textarea>
            <span class="cform__e" data-error-for="message" hidden></span>
          </p>
          <p class="cform__c">
            <label><input type="checkbox" name="consent" value="yes" />
              <span>You can contact me about this enquiry.</span></label>
            <span class="cform__e" data-error-for="consent" hidden></span>
          </p>
          <p class="cform__go">
            <button class="btn btn--volt" type="submit">Send ${ARROW}</button>
            <span class="cform__s" data-enquiry-status role="status" aria-live="polite"></span>
          </p>
        </form>
        <p class="psn__note rv">It goes to ${esc(CLUB.email)} and into the club’s own inbox,
          so nothing is lost if the email does not land.</p>
      </div>
    </section>`;

  /* ---- The monthly email --------------------------------------------------- */
  const newsletterBand = `<section class="sec sec--newsletter" id="newsletter" aria-labelledby="nws-h">
      <div class="wrap">
        ${bandHead('newsletter', 'The monthly email', 'Once a month', '', '', 'nws-h')}
        <div class="giv rv">
          <p>Results, the next fixtures and what the club is up to. Once a month, and
            nothing else. Leaving is one click from the bottom of any of them.</p>
          <form class="cform cform--inline" data-subscribe novalidate>
            <label class="sr-only" for="hn-email">Email address</label>
            <input id="hn-email" name="email" type="email" inputmode="email" autocomplete="email" placeholder="you@email.com" required />
            <button class="btn btn--volt" type="submit">Sign up</button>
            <span class="cform__s" data-sub-msg role="status" aria-live="polite"></span>
          </form>
        </div>
      </div>
    </section>`;

  /* ---- Every match --------------------------------------------------------- */
  const everyMatchBand = d.played.length ? `<section class="sec sec--everymatch" id="everymatch" aria-labelledby="evm-h">
      <div class="wrap">
        ${bandHead('everymatch', 'Every match', `${d.played.length} played`, '/results.html', 'With the detail', 'evm-h')}
        ${rowList(d.played.slice().sort((a, b) => String(b.iso || '').localeCompare(String(a.iso || '')))
    .map((m) => ({
      a: `${oppBadge(m.opponent, d.badges, 20, 20, 'psn__b')}<b>${esc(shortClub(m.opponent))}</b>`,
      b: esc(`${dayMonthYear(m.iso || m.date)} · ${m.competition} · ${m.weAreHome ? 'Home' : 'Away'}`),
      c: `<a href="/matches/${attr(m.slug)}.html">${esc(m.isWalkover ? 'W/O' : (m.ourScoreline || m.scoreline))}</a>`,
    })))}
      </div>
    </section>` : '';

  /* ---- The club's firsts --------------------------------------------------- */
  const firsts = clubFirsts(d.competitive, d.nameFor);
  const firstsBand = firsts.length ? `<section class="sec sec--firsts" id="firsts" aria-labelledby="fst-h">
      <div class="wrap">
        ${bandHead('firsts', 'The club’s firsts', 'Since 2025', '/records.html', 'Every record', 'fst-h')}
        <ul class="rcd rv">
          ${firsts.map((f) => `<li class="rcd__c">
            <span class="rcd__v">${f.href ? `<a href="${attr(f.href)}">${esc(f.value)}</a>` : esc(f.value)}</span>
            <b class="rcd__l">${esc(f.label)}</b>
            <span class="rcd__w">${esc(`${f.who} · ${dayMonthYear(f.date)}`)}</span>
          </li>`).join('\n          ')}
        </ul>
      </div>
    </section>` : '';

  /* ---- The match reports --------------------------------------------------- */
  const reps = reportsIn(d).slice(0, 10);
  const reportsBand = reps.length ? `<section class="sec sec--reports" id="reports" aria-labelledby="rps-h">
      <div class="wrap">
        ${bandHead('reports', 'The match reports', `${reportsIn(d).length} written`, '/results.html', 'Every result', 'rps-h')}
        ${rowList(reps.map((m) => ({
      a: `${oppBadge(m.opponent, d.badges, 20, 20, 'psn__b')}<b>${esc(shortClub(m.opponent))}</b>`,
      b: esc(`${dayMonthYear(m.iso || m.date)} · ${m.competition}`),
      c: `<a href="/matches/${attr(m.slug)}.html">${esc(m.isWalkover ? 'W/O' : (m.ourScoreline || m.scoreline))}</a>`,
    })))}
      </div>
    </section>` : '';

  /* ---- The albums ---------------------------------------------------------- */
  const albs = albumsIn(d);
  const albumsBand = albs.length ? `<section class="sec sec--albums" id="albums" aria-labelledby="alb-h">
      <div class="wrap">
        ${bandHead('albums', 'The albums', `${albs.length} albums`, '/gallery.html', 'The gallery', 'alb-h')}
        <ul class="alb rv">
          ${albs.map((g) => `<li class="alb__c"><a href="/gallery/${attr(g.slug)}.html">
            ${g.cover
    ? `<img class="alb__i" src="${attr(g.cover)}" alt="" width="300" height="200" loading="lazy" decoding="async" />`
    : `<span class="alb__i alb__i--none"><img src="${STAR}" alt="" width="40" height="49" loading="lazy" decoding="async" /></span>`}
            <b>${esc(g.title || '')}</b>
            <span>${esc(`${g.photoCount || (g.photos || []).length} pictures`)}</span>
          </a></li>`).join('\n          ')}
        </ul>
      </div>
    </section>` : '';

  /* ---- The clubs played ---------------------------------------------------- */
  const wallClubs = opponentRecords(d.competitive);
  const clubsWallBand = wallClubs.length ? `<section class="sec sec--clubswall" id="clubswall" aria-labelledby="cwl-h">
      <div class="wrap">
        ${bandHead('clubswall', 'The clubs played', `${wallClubs.length} clubs`, '/results.html', 'Every result', 'cwl-h')}
        <ul class="wall rv">
          ${wallClubs.map((r) => `<li class="wall__c">
            ${oppBadge(r.opponent, d.badges, 46, 46)}
            <span>${esc(shortClub(r.opponent))}</span>
          </li>`).join('\n          ')}
        </ul>
      </div>
    </section>` : '';

  /* ---- What is in here ----------------------------------------------------- */
  const whatsInHereBand = d.played.length ? `<section class="sec sec--whatsinhere" id="whatsinhere" aria-labelledby="wih-h">
      <div class="wrap">
        ${bandHead('whatsinhere', 'What is in here', 'The archive', '/results.html', 'Start reading', 'wih-h')}
        ${tileGrid([
    { v: d.played.length, l: 'Matches', s: `${d.competitive.filter((m) => m.played).length} competitive` },
    { v: reportsIn(d).length, l: 'Match reports', s: 'Written up in full' },
    { v: albs.reduce((n, g) => n + (g.photoCount || (g.photos || []).length), 0), l: 'Photographs', s: `across ${albs.length} albums` },
    { v: (d.players || []).length, l: 'Players', s: `${(d.coaches || []).length} coaching staff` },
    { v: (d.articles || []).length, l: 'Articles', s: 'Club news' },
    { v: wallClubs.length, l: 'Opponents', s: 'Clubs met since 2025' },
  ])}
      </div>
    </section>` : '';

  /* ---- Where the club has played ------------------------------------------- */
  const vens = venueRecords(d.competitive);
  const venuesBand = vens.length ? `<section class="sec sec--venues" id="venues" aria-labelledby="vns-h">
      <div class="wrap">
        ${bandHead('venues', 'Where the club has played', `${vens.length} grounds`, '/contact.html', 'Find the home ground', 'vns-h')}
        ${rowList(vens.map((v) => ({
    a: `<b>${esc(v.venue)}</b>`,
    b: esc(`${v.home ? 'Home' : 'Away'} · played ${v.played}, won ${v.won}${v.drawn ? `, drawn ${v.drawn}` : ''}${v.lost ? `, lost ${v.lost}` : ''}`),
    c: esc(`${v.goalsFor}-${v.goalsAgainst}`),
  })))}
      </div>
    </section>` : '';

  /* ---- Where the goals come from ----------------------------------------
     Which part of the SIDE, not which part of the pitch. Zone is recorded on
     3 goals of 141 and could not carry a band; the scorer's position group is
     known for every one, so this asks the question the evidence can answer. */
  const gsrc = goalsByGroup(d.competitive, d.players);
  const goalSourceBand = gsrc.rows.length ? `<section class="sec sec--goalsource" id="goalsource" aria-labelledby="gsr-h">
      <div class="wrap">
        ${bandHead('goalsource', 'Where the goals come from', `${gsrc.total} goals`, '/stats.html', 'Every figure', 'gsr-h')}
        <ul class="gkin rv">
          ${gsrc.rows.map((r) => `<li class="gkin__r">
            <b>${esc(r.label)}</b>
            <span class="gkin__bar"><i style="width:${attr(String(Math.max(3, r.pct)))}%"></i></span>
            <span class="gkin__n">${esc(String(r.n))}<i>${esc(`${r.pct}%`)}</i></span>
          </li>`).join('\n          ')}
        </ul>
        <p class="psn__note rv">${esc(gsrc.total === gsrc.of
    ? `Counted by where the scorer plays, over all ${gsrc.of} of the club’s recorded goals.`
    : `Counted by where the scorer plays, over ${gsrc.total} of the club’s ${gsrc.of} `
      + `recorded goals. The other ${gsrc.unknown} were scored by somebody no longer on the squad list.`)}</p>
      </div>
    </section>` : '';

  /* ---- The defeats ------------------------------------------------------
     The mirror of the biggest wins, and there for the same reason as the
     walkovers band: a record reads as true in proportion to how plainly it
     says what did not go the club's way. */
  const losses = heaviestDefeats(d.competitive, 6);
  const defeatsBand = losses.length ? `<section class="sec sec--defeats" id="defeats" aria-labelledby="dfl-h">
      <div class="wrap">
        ${bandHead('defeats', 'The defeats', `${all.lost} of ${all.played}`, '/results.html', 'Every result', 'dfl-h')}
        ${rowList(losses.map(({ m }) => ({
    a: `${oppBadge(m.opponent, d.badges, 22, 22, 'psn__b')}<b>${esc(shortClub(m.opponent))}</b>`,
    b: esc(`${dayMonthYear(m.iso || m.date)} · ${m.competition}`),
    c: `<a href="/matches/${attr(m.slug)}.html">${esc(m.ourScoreline || m.scoreline)}</a>`,
  })))}
        <p class="psn__note rv">Competitive matches only. ${esc(FRIENDLY_NOTE_SHORT)}</p>
      </div>
    </section>` : '';

  /* ---- Goals per game ---------------------------------------------------- */
  const RATE_MIN = 5;
  const rates = scoringRate(d.players, RATE_MIN, 6);
  const rateBand = rates.length ? `<section class="sec sec--rate" id="rate" aria-labelledby="rte-h">
      <div class="wrap">
        ${bandHead('rate', 'Goals per game', 'By rate, not total', '/stats.html', 'Every figure', 'rte-h')}
        <ol class="lbd rv">
          ${rates.map((r, i) => `<li class="lbd__r">
            <span class="lbd__n">${esc(String(i + 1))}</span>
            <span class="lbd__p">${playerLink(r.player.num, r.player.name)}<i>${esc(`${r.player.goals} in ${r.player.apps}`)}</i></span>
            <span class="lbd__v">${esc(r.rate.toFixed(2))}<i>a game</i></span>
          </li>`).join('\n          ')}
        </ol>
        <p class="psn__note rv">${esc(`Anybody with ${RATE_MIN} appearances or more. Below that a `
    + 'single goal on a single outing tops the list and says nothing about anybody. '
    + 'Appearances count starts: Sunday-league returns do not record substitutes.')}</p>
      </div>
    </section>` : '';

  /* ---- Every Player of the Month ----------------------------------------- */
  const potmList = potmAll(d);
  const potmHistoryBand = potmList.length ? `<section class="sec sec--potmhistory" id="potmhistory" aria-labelledby="pmh-h">
      <div class="wrap">
        ${bandHead('potmhistory', 'Every Player of the Month', `${potmList.length} so far`, '/awards.html', 'Every award', 'pmh-h')}
        ${rowList(potmList.map((r) => {
    const nm = r.playerName || (r.playerId != null ? d.nameFor(r.playerId) : '') || '';
    const p = d.players.find((x) => String(x.num) === String(r.playerId));
    return {
      a: `<b>${p ? playerLink(p.num, nm) : esc(nm)}</b>`,
      b: esc(r.season || ''),
      c: esc(r.month || ''),
    };
  }))}
      </div>
    </section>` : '';

  /* ---- Who takes the pictures --------------------------------------------
     The one band on the page about somebody who is never in the photograph,
     which is most of why it is worth having: three people turn up with a
     camera and nothing on the site said so. */
  const shooters = photographersIn(d);
  const photographersBand = shooters.length ? `<section class="sec sec--photographers" id="photographers" aria-labelledby="pgr-h">
      <div class="wrap">
        ${bandHead('photographers', 'Who takes the pictures', `${shooters.length} behind the camera`, '/gallery.html', 'The gallery', 'pgr-h')}
        ${rowList(shooters.map((s) => ({
    /* Through photoCredit, so a photographer who has given the club a link
       gets one here and on all five gallery credits at the same moment. */
    a: `<b>${photoCredit(s.name)}</b>`,
    b: esc(`${s.albums} ${s.albums === 1 ? 'album' : 'albums'}`),
    c: esc(`${s.photos} pictures`),
  })))}
      </div>
    </section>` : '';

  /* ================= FOOTER ================= */
  const footerHtml = siteFooter();

  /* ==========================================================================
     BOOT SCREEN

     The crest assembles itself out of forty shards, then beats. It was on the
     old home page and the rebuild dropped it, so it is back, on the home page
     only: it is an arrival, and playing it again on every internal navigation
     would be an obstacle rather than a welcome.

     Two things changed in the port. The backdrop is the rebuild's near-black
     rather than the retired navy, so it matches the page underneath it.

     And the hold is much shorter. The original waited a minimum of 8.8
     seconds because it was covering a JavaScript app booting; this site is
     static HTML that has already painted, so that same wait would now be
     nothing but a wait. It holds for as long as the animation actually takes
     and not a moment longer, and it never blocks a visitor who is ready
     sooner. MIN is one number if the club wants it to linger.

     It is inline in the head-adjacent markup rather than in sa.js, because a
     boot screen that needs an external script to appear has missed its own
     moment; and it removes itself unconditionally on a timer, so a failure
     anywhere else can never leave a visitor staring at a black rectangle. */
  const bootScreen = `<div id="sa-boot" aria-hidden="true"><div class="sa-crest"></div></div>
    <style>
      @keyframes saBeat{0%,100%{transform:scale(1)}50%{transform:scale(1.055)}}
      #sa-boot{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;
        background:#090B0D;opacity:1;transition:opacity .9s ease;will-change:opacity}
      #sa-boot .sa-crest{position:relative;width:116px;height:144px}
      #sa-boot .sa-crest.is-beating{animation:saBeat .75s ease-in-out infinite}
      #sa-boot .sa-shard{position:absolute;top:0;left:0;width:116px;height:144px;will-change:transform,opacity}
      #sa-boot.sa-boot--hide{opacity:0;pointer-events:none}
      @media (prefers-reduced-motion: reduce){#sa-boot{transition:none}}
    </style>
    <script>
    (function(){
      var boot=document.getElementById('sa-boot'); if(!boot) return;
      var crest=boot.querySelector('.sa-crest');
      var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      /* The badge WITH the championship star. Not crest.webp, which is the
         same crest without it, and not sue-angels-shield.webp, which is the
         retired lime badge the original loader pointed at and which assembled
         the old brand in front of the new site. The star is the League Ten
         title and it is the first thing a visitor should see. */
      var SRC='/assets/badge/sue-angels-badge-star.webp', COLS=5, ROWS=8, maxEnd=0;
      for(var r=0;r<ROWS;r++){ for(var c=0;c<COLS;c++){
        var img=document.createElement('img'); img.className='sa-shard'; img.src=SRC; img.alt='';
        img.style.clipPath='inset('+(r/ROWS*100)+'% '+((COLS-1-c)/COLS*100)+'% '+((ROWS-1-r)/ROWS*100)+'% '+(c/COLS*100)+'%)';
        if(reduce){ img.style.opacity='1'; }
        else{
          var a=Math.random()*6.2832, d=50+Math.random()*52;
          var dx=Math.cos(a)*d, dy=Math.sin(a)*d, rot=(Math.random()*2-1)*40, sc=0.5+Math.random()*0.3;
          var dur=1.2+Math.random()*0.7, del=Math.random()*0.9; if(del+dur>maxEnd) maxEnd=del+dur;
          img.style.opacity='0';
          img.style.transform='translate('+dx.toFixed(1)+'px,'+dy.toFixed(1)+'px) rotate('+rot.toFixed(1)+'deg) scale('+sc.toFixed(2)+')';
          img.style.transition='transform '+dur.toFixed(2)+'s cubic-bezier(.16,.72,.16,1) '+del.toFixed(2)+'s, opacity '+(dur*0.55).toFixed(2)+'s ease '+del.toFixed(2)+'s';
        }
        crest.appendChild(img);
      }}
      /* THREE SECONDS, END TO END. The badge assembles, then beats for
         whatever is left of the three, and the site appears.

         It used to hold for nine and a half. That was arrived at honestly
         (4.5 breaths at 1.7 seconds each, derived from the animation rather
         than typed in) and it was still far too long: nine seconds is a
         website deciding it is more interesting than the thing somebody came
         for, and everybody after the first visit is simply waiting.

         BEAT is 0.75s, which is eighty a minute and reads as a pulse rather
         than a slow breath, so the shorter hold still gets two or three of
         them. TOTAL is the number to change; everything else follows it. */
      var TOTAL=3, BEAT=0.75, beatStart=Math.min(Math.max(maxEnd-0.5,0), TOTAL-BEAT*2);
      var BEATS=Math.max(2,(TOTAL-beatStart)/BEAT);
      if(!reduce){
        requestAnimationFrame(function(){ requestAnimationFrame(function(){
          var sh=crest.querySelectorAll('.sa-shard');
          for(var i=0;i<sh.length;i++){ sh[i].style.opacity='1'; sh[i].style.transform='none'; }
        });});
        setTimeout(function(){ crest.classList.add('is-beating'); }, Math.round(beatStart*1000));
      }
      /* Reduced motion gets neither the assembly nor the wait for it. */
      var MIN=reduce?280:Math.round((beatStart+BEAT*BEATS)*1000);
      /* And a ceiling on waiting for the page itself. Three seconds of badge
         plus two and a half of hoping is five and a half seconds of nothing. */
      var MAX=MIN+1200, start=Date.now(), done=false;
      function hide(){
        if(done) return; done=true;
        boot.classList.add('sa-boot--hide');
        setTimeout(function(){ if(boot&&boot.parentNode) boot.parentNode.removeChild(boot); }, 1000);
      }
      function ready(){ return !!document.querySelector('.hx__frame, .hx'); }
      function tick(){
        var e=Date.now()-start;
        if(e>=MAX || (ready() && e>=MIN)){ hide(); return; }
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      /* Belt and braces: whatever happens above, it goes. */
      setTimeout(hide, MAX+200);
    })();
    </script>`;

  const preMain = bootScreen + sitePreMain(auraFor('index.html'));

  return {
    /* The hero is pinned: it carries the page's one h1 and the next-match card,
       and a home page that opens on the league table is not a home page.
       Everything after it is the club's to arrange.

       The wordstrip travels with the CTA rather than sitting at a fixed point
       in the page, because that is what it is: the lead-in flourish to Pull on
       the shirt, not a divider at a particular height. */
    body: hero + ticker + shown.map((k) => ({
      news: newsBand,
      who: whoBand,
      awards: awardsBand,
      campaign: campaignBand,
      results: resultsBand,
      table: tableBand,
      faq: faqBand,
      cta: wordstrip + ctaBand,
      report: reportBand,
      photos: photosBand,
      spotlight: spotlightBand,
      preseason: preseasonBand,
      ahead: aheadBand,
      sponsors: sponsorsBand,
      staff: staffBand,
      records: recordsBand,
      milestones: milestonesBand,
      ground: groundBand,
      nextup: nextUpBand,
      squad: squadBand,
      fixtures: fixturesBand,
      lastout: lastOutBand,
      onthisday: onThisDayBand,
      streak: runBand,
      competitions: compsBand,
      homeaway: homeAwayBand,
      headtohead: headToHeadBand,
      scorers: scorersBand,
      creators: creatorsBand,
      appearances: appearancesBand,
      motm: motmBand,
      goalkinds: goalKindsBand,
      cleansheets: cleanSheetsBand,
      potm: potmBand,
      captains: captainsBand,
      newfaces: newFacesBand,
      seasons: seasonsBand,
      honours: honoursBand,
      back: backBand,
      give: giveBand,
      preview: previewBand,
      awaiting: awaitingBand,
      leadnews: leadNewsBand,
      aroundleague: aroundLeagueBand,
      formations: formationsBand,
      walkovers: walkoversBand,
      margins: marginsBand,
      contributions: contributionsBand,
      leaguescorers: leagueScorersBand,
      bigwins: bigWinsBand,
      penalties: penaltiesBand,
      discipline: disciplineBand,
      scorelines: scorelinesBand,
      months: monthsBand,
      leadership: leadershipBand,
      positions: positionsBand,
      scoringruns: scoringRunsBand,
      recordholders: recordHoldersBand,
      follow: followBand,
      joinpaths: joinPathsBand,
      joinfaqs: joinFaqsBand,
      contact: contactBand,
      newsletter: newsletterBand,
      everymatch: everyMatchBand,
      firsts: firstsBand,
      reports: reportsBand,
      albums: albumsBand,
      clubswall: clubsWallBand,
      whatsinhere: whatsInHereBand,
      venues: venuesBand,
      goalsource: goalSourceBand,
      defeats: defeatsBand,
      rate: rateBand,
      potmhistory: potmHistoryBand,
      photographers: photographersBand,
    })[k] || '').join(''),
    bodyClass: 'is-home',
    css: 'home.css',
    shell: 'home',
    preMain,
    footerHtml,
    preloadImage: heroPic.src,
    faqSchema: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  };
}

/* ==========================================================================
   SHARED SHELL
   Defined once and reused by every page built on the homepage design, so the
   header, footer and sitemap cannot drift the way the old hand-authored pages
   did. The homepage draws its header inside the hero frame; every other page
   gets the same nav in a standalone bar from siteHeader().
   ========================================================================== */

export function siteFooter() {
  const footCols = NAV_TREE.map((c) => `<div class="ft2__col">
            <h3>${esc(c.label)}</h3>
            ${c.children.map((l) => `<a href="${attr(l.href)}">${esc(l.label)}</a>`).join('\n            ')}
          </div>`).join('\n          ');

  return `<footer class="ft2">
    <span class="ft2__topline" aria-hidden="true"></span>
    <div class="wrap ft2__in">
      <div class="ft2__main">
        <div class="ft2__brand">
          <a class="ft2__logo" href="/" aria-label="${attr(CLUB.name)} home">
            <img src="${STAR}" alt="" width="36" height="45" loading="lazy" decoding="async" />
            <span>Sue's Angels <b>FC</b></span>
          </a>
          <!-- The footer is shared by every page and has no dataset to ask,
               so it does not name a division. It named League Ten, which was
               going to be wrong from the first whistle of League Eight and
               could not be fixed here without handing the whole dataset to a
               function that renders a logo and four links. Champions in the
               club's first season, unbeaten, is true forever and needs
               nothing. -->
          <p class="ft2__tag">Sunday-league football, built in her name. Champions and unbeaten in our first season.</p>
          <!-- From the club record, not typed in here. This list had drifted
               from the shared footer in both directions: it carried TikTok,
               which the other 99 pages did not, and YouTube, whose handle
               does not resolve. -->
          <div class="ft2__socials">
            ${SOCIALS.map((s) => `<a href="${attr(s.href)}" aria-label="${attr(s.label)}" rel="me noopener" target="_blank">${SVG[s.icon] || ''}</a>`).join('\n            ')}
          </div>
        </div>

        <nav class="ft2__menu" aria-label="Footer sitemap">
          ${footCols}
        </nav>

        <div class="ft2__news">
          <h3>The team sheet</h3>
          <p>Fixtures, results and team news, straight to your inbox. We keep it rare.</p>
          <form class="ft2__form" data-subscribe novalidate>
            <label class="sr-only" for="ft-email">Email address</label>
            <input id="ft-email" name="email" type="email" inputmode="email" autocomplete="email" placeholder="you@email.com" required />
            <button type="submit" aria-label="Subscribe">${SVG.send}</button>
            <p class="sr-only" data-sub-msg role="status" aria-live="polite"></p>
          </form>
          <a class="ft2__joincta" href="/join.html">Or pull on the shirt ${ARROW}</a>
        </div>
      </div>

      <div class="ft2__bar">
        <p class="ft2__legal">© ${esc(new Date().getUTCFullYear())} ${esc(CLUB.name)} · In memory of ${esc(CLUB.memorial.name)}</p>
        <p class="ft2__locale">The Reeves, Hanworth · south-west London</p>
        <a class="ft2__totop" href="#top" aria-label="Back to top">
          Back to top
          ${SVG.up}
        </a>
      </div>
    </div>
  </footer>`;
}

/* Atmosphere, the geo line field, the grid lines and the mobile menu. The
   first three are decorative and aria-hidden; emitting them here rather than
   injecting them with JavaScript keeps the page identical with scripting
   blocked. */
/* The five masses of the page atmosphere. Emitted as real markup rather than
   injected by script, so the background exists with JavaScript blocked.

   Each carries its own hue, size, path and pair of periods. The periods are
   chosen to share no small common factor, so the field never resolves back
   into an arrangement the reader has already seen. Hues run from the amber
   highlight down to a deep ember: all one family, because orange is the only
   accent hue in the system. */
/* Six wander shapes as unit vectors, seven waypoints each. A patch scales one
   of these by its own amplitude, so no two trace the same route even where
   they share a shape. */
const PATHS = [
  [[1, -0.5], [-0.8, 0.8], [1.3, 0.4], [-1.1, -0.7], [0.7, 0.9], [-0.5, -0.3], [0.4, 0.5]],
  [[-0.9, 0.6], [1.1, 0.3], [-0.5, -0.8], [0.9, 1.0], [-1.2, 0.2], [0.6, -0.5], [-0.3, 0.7]],
  [[0.7, 0.9], [-1.2, -0.3], [0.9, -0.7], [-0.6, 0.9], [1.1, -0.2], [-0.8, 0.4], [0.5, 0.6]],
  [[-1.1, -0.6], [0.5, 1.0], [-0.9, 0.3], [1.2, -0.8], [-0.4, 0.6], [0.9, 0.2], [-0.6, -0.4]],
  [[1.2, 0.3], [-0.6, -0.9], [0.4, 0.8], [-1.3, 0.4], [0.9, -0.6], [-0.4, 0.7], [0.7, -0.2]],
  [[-0.7, 0.8], [1.0, -0.4], [-1.2, 0.5], [0.6, 0.9], [-0.5, -0.7], [1.1, 0.3], [-0.9, -0.2]],
];

/* ---- The field: liquid caustics ---------------------------------------
   Sweeping orange light over near-black, in the language of the supplied
   references.

   Three primitives build all of it:

     pool    the diffuse glow everything else swims in. A soft radial falloff.
     ring    a ribbon. An arc is a ring gradient - transparent core, bright
             annulus, soft falloff - and a ring far wider than the viewport
             shows only a segment of its circumference, which is the sweep.
             A ring that FITS on screen reads as a closed loop instead, so
             these are deliberately enormous and centred off the page.
     plume   a vertical column rising from below, for the flame reference.

   A `line` is just a ring with a very narrow annulus and high alpha: the thin
   bright filaments in the references are the same shape as the broad ribbons,
   drawn tight.

   VARIANTS let each page take its own field while sharing one system. They
   differ in density, brightness, and the balance of broad mass against thin
   filament - not in hue, because orange is the only accent in the system.
   Add a page by naming a variant here and passing it to sitePreMain(). */
/* The ramp, deep to hot. Every step is held between roughly 19 and 35 degrees
   of hue, which is the orange band either side of the brand's #FF7034 (22
   degrees). The previous deep end sat near 9 degrees, which is brick red, and
   it was what made the darker shapes read brown rather than orange. */
const AURA_HUES = [
  '150 62 20', '178 76 24', '205 92 28', '228 108 34',
  '243 124 42', '252 140 54', '255 158 70', '255 178 92', '255 200 124',
];

const AURA_VARIANTS = {
  /* Broad ribbons over a warm bed. The house default. */
  ember: { seed: 20260731, tiers: [
    { k: 'pool', n: 7, w: [70, 130],  ar: [1.2, 2.2], a: [0.10, 0.17], dur: [190, 340], bdur: [90, 170], hue: [0, 4] },
    { k: 'ring', n: 8, w: [190, 330], ar: [1.3, 2.6], a: [0.34, 0.52], dur: [150, 300], bdur: [70, 150], hue: [3, 7] },
    { k: 'ring', n: 9, w: [95, 180],  ar: [1.1, 2.2], a: [0.36, 0.58], dur: [110, 240], bdur: [55, 120], hue: [4, 8] },
  ] },

  /* Sparse and high-contrast: mostly black, a couple of broad folds, and
     several hairline filaments cutting across them. */
  fold: { seed: 5512207, tiers: [
    { k: 'pool', n: 4,  w: [80, 140],  ar: [1.4, 2.4], a: [0.09, 0.14], dur: [220, 380], bdur: [110, 190], hue: [0, 3] },
    { k: 'ring', n: 5,  w: [200, 340], ar: [1.5, 2.8], a: [0.30, 0.44], dur: [170, 320], bdur: [80, 160], hue: [3, 6] },
    { k: 'line', n: 10, w: [140, 300], ar: [1.2, 2.6], a: [0.48, 0.74], dur: [130, 280], bdur: [60, 130], hue: [5, 9] },
  ] },

  /* Flames rising from below, black above. Columns rather than arcs. */
  plume: { seed: 9180433, tiers: [
    { k: 'pool',  n: 5,  w: [90, 150], ar: [1.6, 2.6], a: [0.09, 0.15], dur: [200, 330], bdur: [100, 180], hue: [0, 3] },
    { k: 'plume', n: 14, w: [8, 20],   ar: [1, 1],     a: [0.24, 0.40], dur: [26, 52],   bdur: [26, 52],   hue: [3, 7] },
    { k: 'plume', n: 18, w: [2.5, 7],  ar: [1, 1],     a: [0.30, 0.52], dur: [15, 34],   bdur: [15, 34],   hue: [5, 9] },
  ] },

  /* Dense curling swirls with one dominant bright mass. */
  swirl: { seed: 3390871, tiers: [
    { k: 'pool', n: 8,  w: [80, 150],  ar: [1.1, 1.9], a: [0.12, 0.20], dur: [180, 320], bdur: [85, 165], hue: [1, 5] },
    { k: 'ring', n: 10, w: [110, 240], ar: [1.1, 2.0], a: [0.34, 0.54], dur: [120, 260], bdur: [60, 130], hue: [4, 8] },
    { k: 'line', n: 8,  w: [80, 190],  ar: [1.1, 2.2], a: [0.44, 0.68], dur: [100, 210], bdur: [50, 110], hue: [5, 9] },
  ] },

  /* The brightest of the set: broad soft folds filling most of the frame. */
  silk: { seed: 7745019, tiers: [
    { k: 'pool', n: 10, w: [90, 170],  ar: [1.1, 2.0], a: [0.16, 0.26], dur: [200, 360], bdur: [95, 175], hue: [2, 6] },
    { k: 'ring', n: 9,  w: [170, 320], ar: [1.2, 2.4], a: [0.38, 0.58], dur: [160, 300], bdur: [75, 150], hue: [4, 8] },
    { k: 'line', n: 4,  w: [120, 260], ar: [1.2, 2.4], a: [0.40, 0.60], dur: [140, 270], bdur: [65, 140], hue: [6, 9] },
  ] },
};

/* Which page wears which field. Decided once here rather than as a literal
   scattered through each template, so the site can be seen as a whole.

   The logic is legibility first: the calmest fields go behind the pages you
   actually read or scan, and the loud ones behind short pages that are mostly
   a heading and a call to action.

     fold   sparsest and blackest -> long reads and dense tables
     ember  broad and even        -> the default, and the squad pages
     silk   warm and generous     -> the celebratory pages
     swirl  bright and busy       -> short pages only

   `plume` is deliberately unassigned: it does not yet match its reference. */
const PAGE_AURA = {
  'index.html': 'ember',
  'about.html': 'fold',
  'sepsis.html': 'fold',
  'champions.html': 'silk',
  'awards.html': 'swirl',
  'squad.html': 'ember',
  'stats.html': 'fold',
  'coaches.html': 'ember',
  'fixtures.html': 'fold',
  'results.html': 'fold',
  'league.html': 'fold',
  'records.html': 'fold',
  'live.html': 'swirl',
  'news.html': 'ember',
  'gallery.html': 'swirl',
  'videos.html': 'swirl',
  'sponsors.html': 'fold',
  'join.html': 'swirl',
  'contact.html': 'swirl',
  '404.html': 'swirl',
};

/* Route -> variant, defaulting to the house field for anything unlisted (the
   player, match, article and album detail routes included). */
export const auraFor = (file) => PAGE_AURA[String(file).replace(/^\//, '')] || 'ember';

/* Deterministic pseudo-random, so a rebuild produces byte-identical output
   and the asset hash stays stable. Math.random would reshuffle every field on
   every build and churn the cache for no visual gain. Each variant carries
   its own seed, which is what makes them look unrelated. */
function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function buildAura(name) {
  const v = AURA_VARIANTS[name] || AURA_VARIANTS.ember;
  const rnd = lcg(v.seed);
  const pick = ([lo, hi]) => lo + rnd() * (hi - lo);
  const out = [];
  v.tiers.forEach((t, ti) => {
    for (let i = 0; i < t.n; i++) {
      const vertical = t.k === 'plume';
      out.push({
        tier: ti,
        kind: t.k,
        c: AURA_HUES[Math.min(AURA_HUES.length - 1, Math.floor(pick(t.hue)))],
        /* Arcs are centred well outside the page so only their sweep shows.
           Plumes stay within it, because a plume is meant to be seen whole. */
        x: vertical
          ? `${(2 + ((i + 0.5) / t.n) * 96 + (rnd() - 0.5) * (60 / t.n)).toFixed(1)}%`
          : `${(-55 + rnd() * 210).toFixed(1)}%`,
        /* Plumes take a free vertical position. Sharing the lattice with x
           made both track the index, so they stair-stepped diagonally down
           the page instead of standing independently. */
        y: vertical
          ? `${(rnd() * 104 - 4).toFixed(1)}%`
          : `${(((i + 0.5) / t.n) * 100 + (rnd() - 0.5) * 26).toFixed(1)}%`,
        w: `${pick(t.w).toFixed(1)}vw`,
        h: vertical ? `${(14 + rnd() * 26).toFixed(1)}%` : '',
        ar: +pick(t.ar).toFixed(2),
        a: +pick(t.a).toFixed(3),
        dur: +pick(t.dur).toFixed(0),
        bdur: +pick(t.bdur).toFixed(0),
        rot: Math.round(rnd() * 360),
        /* Alternating sense, so neighbouring ribbons counter-rotate and the
           field never turns as one wheel. */
        spin: i % 2 ? -1 : 1,
        drift: +(6 + rnd() * 14).toFixed(1),
      });
    }
  });
  return out;
}

/* One dial, sitting at 1: pace is a property of each tier, not a single
   number applied to everything. Raise it to slow the whole field further,
   lower it to speed it up. */
const AURA_PACE = 1;

const auraMarkup = (name) => buildAura(name).map((m, n) => {
  /* Negative delays start each shape part-way through its own cycle, so the
     field is already varied on load rather than every ribbon setting off from
     the same angle. The two offsets step at different rates so a shape's turn
     and its breath never lock into one motion. */
  return `<span class="pa pa--${m.kind}" style="--pa-c:${m.c};--pa-x:${m.x};--pa-y:${m.y};`
    + `--pa-w:${m.w};${m.h ? `--pa-h:${m.h};` : ''}--pa-ar:${m.ar};--pa-a:${m.a};--pa-rot:${m.rot}deg;`
    + `--pa-spin:${m.spin * 360}deg;--pa-drift:${m.drift}px;`
    + `--pa-dur:${(m.dur * AURA_PACE).toFixed(0)}s;--pa-bdur:${(m.bdur * AURA_PACE).toFixed(0)}s;`
    + `--pa-delay:-${(n * 11 + 5)}s;--pa-bdelay:-${(n * 7 + 3)}s;"><i></i></span>`;
}).join('\n  ');

export function sitePreMain(variant = 'ember') {
  return `<div class="pageaura" aria-hidden="true">
  ${auraMarkup(variant)}
</div>
<svg class="geo" viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <circle class="geo__line" cx="1210" cy="150" r="430"/>
  <circle class="geo__arc" cx="1210" cy="150" r="286"/>
  <circle class="geo__dash" cx="70" cy="815" r="250"/>
  <circle class="geo__dot" cx="788" cy="330" r="2.5"/>
  <circle class="geo__dot" cx="305" cy="742" r="2"/>
</svg>
<div class="gridlines" aria-hidden="true"></div>
<div class="mnav" id="mnav" inert>
  <nav class="mnav__nav" aria-label="Mobile">
    <a class="mnav__home" href="/">Home</a>
    <div class="mnav__grid">
      ${NAV_TREE.map((g) => `<div class="mnav__grp">
        <h2>${esc(g.label)}</h2>
        ${g.children.map((l) => `<a href="${attr(l.href)}">${esc(l.label)}</a>`).join('\n        ')}
      </div>`).join('\n      ')}
    </div>
    <a class="mnav__join" href="/join.html">Join the club</a>
  </nav>
</div>`;
}

/* The same nav the homepage carries in its hero, as a standalone bar for
   pages that have no hero photograph behind it. `current` is the href of the
   page being rendered so the active link can be marked. */
export function siteHeader(current) {
  const groups = NAV_TREE.map((item) => `<div class="hx__navgrp">
              <button class="hx__navtop hx__navtrig" type="button" aria-expanded="false">${esc(item.label)} ${SVG.caret}</button>
              <div class="hx__dd">
                ${item.children.map((c) => `<a href="${attr(c.href)}"${c.href === current ? ' aria-current="page"' : ''}>${esc(c.label)}</a>`).join('\n                ')}
              </div>
            </div>`).join('\n            ');

  return `<header class="hx__nav pghead">
          <a class="hx__brand" href="/" aria-label="${attr(CLUB.name)}, home">
            <img src="${STAR}" alt="" width="40" height="50" decoding="async" />
            <span>Sue's Angels FC</span>
          </a>
          <nav class="hx__mainnav" aria-label="Main">
            <a class="hx__navtop" href="/">Home</a>
            ${groups}
          </nav>
          <div class="hx__navright">
            <a class="hx__join" href="/join.html">Join the club</a>
            <button class="hx__burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mnav">
              <span></span><span></span><span></span>
            </button>
          </div>
        </header>`;
}
