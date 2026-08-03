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
import { sizeAttrs } from '../lib/imagesize.mjs';
import { CLUB, SPONSORS, FAQS, NEXT_FIXTURE, SEASON_AWARDS , SOCIALS} from '../lib/club.mjs';
import { teamSummary, formGuide } from '../lib/stats.mjs';

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
const railRefs = (d) => [
  'Est. 2025',
  `${CLUB.nextDivision} · ${d.nextSeason}`,
  'The Reeves, Hanworth',
  '51.43° N / 0.40° W',
  'P18 W18 · Unbeaten',
];
/* Filled in by home() before anything renders. The season used to be typed
   into the list, which made a strip of quiet reference marks carry a claim
   about a year that would go out of date on its own. */
let RAIL_REF = railRefs({ nextSeason: '' });

const rail = (n, label) => `<div class="xrail" aria-hidden="true">
      <span class="xrail__l"><span class="xrail__n">${esc(String(n).padStart(2, '0'))}</span><span class="xrail__t">${esc(label)}</span></span>
      <span class="xrail__r">${esc(RAIL_REF[(n - 1) % RAIL_REF.length])}</span>
    </div>`;

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
  const all = teamSummary(d.played);
  const league = teamSummary(d.played.filter((m) => m.competition === CLUB.division));
  /* The form strip reads left to right in the order the games were played. */
  const form = formGuide(d.played, 6).slice().reverse();
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
              <span>${esc(CLUB.division)} Champions ${esc(d.currentSeason)}</span>
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
    `${CLUB.division} Champions ${d.currentSeason}`,
    `Promoted to ${CLUB.nextDivision}`,
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
        ${rail(1, 'Club news')}
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
  const leagueMatches = scored.filter((m) => m.competition === CLUB.division);
  const firstMatch = leagueMatches[0];
  const clincher = leagueMatches.slice().sort((a, b) =>
    ((b.ourGoals - b.theirGoals) - (a.ourGoals - a.theirGoals)) || (b.ourGoals - a.ourGoals))[0];
  const lastMatch = leagueMatches[leagueMatches.length - 1];
  const tlRow = (m, label, value) => (m ? `<span>${esc(monthYear(m.iso || m.date))}</span><i aria-hidden="true">✱</i><span>${esc(label)}</span><b>${esc(value)}</b>` : '');

  const whoBand = `<section class="sec sec--who" id="who" aria-labelledby="who-h">
      <div class="wrap">
        ${rail(2, 'More than a result')}
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
            <img class="bento__img" src="/assets/hero/team.webp" alt="${attr(CLUB.name)} squad, ${attr(CLUB.division)} champions" width="640" height="800" loading="lazy" decoding="async" />
            <span class="bento__imgshade" aria-hidden="true"></span>
            <span class="bento__label bento__label--on">${SVG.star} Champions</span>
            <div class="bento__tallfoot">
              <h3 class="bento__h3">${esc(CLUB.division)} winners</h3>
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
            <span class="bento__statcap">Win rate · ${esc(CLUB.division)} ${esc(d.currentSeason)}</span>
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
        ${rail(3, 'Award winners')}
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

  const campaignBand = `<section class="sec sec--campaign" id="campaign" aria-labelledby="cmp-h">
      <div class="wrap">
        ${rail(4, 'The campaign')}
        <div class="cmp__head rv">
          <div class="cmp__headlede">
            <h2 class="h2" id="cmp-h">The campaign<span class="volt">.</span></h2>
            <p class="cmp__thesis">${esc(all.won)} wins in ${esc(all.played)}, unbeaten to the ${esc(CLUB.division).replace(' ', '&nbsp;')} title. The ${esc(d.currentSeason)} season, measured in full.</p>
          </div>
          <a class="btn btn--ghost cmp__cta" href="/champions.html">Champions ${ARROW}</a>
        </div>

        <div class="camp rv" style="--d:.06s">

          <!-- The one fact the band exists to state. A hero figure, not a dial:
               a single ratio against a limit wants a meter, and 46 gauge ticks
               were chrome around one number. -->
          <article class="camp__hero">
            <p class="camp__k">${esc(CLUB.division)} ${esc(d.currentSeason)}</p>
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
        ${rail(5, 'Recent results')}
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
        ${rail(6, 'The table')}
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
          <caption>${esc(CLUB.division)} final standings, ${esc(d.currentSeason)}</caption>
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
        ${rail(7, 'Ask the Angels')}
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
        ${rail(8, 'Pull on the shirt')}
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
    body: hero + ticker + newsBand + whoBand + awardsBand + campaignBand + resultsBand + tableBand + faqBand + wordstrip + ctaBand,
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
          <p class="ft2__tag">Sunday-league football, built in her name. ${esc(CLUB.division)} champions, unbeaten.</p>
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
