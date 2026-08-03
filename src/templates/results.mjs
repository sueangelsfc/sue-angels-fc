/* ==========================================================================
   RESULTS  (/results.html)  and  FIXTURES  (/fixtures.html)
   Both under On the Pitch.

   Two pages, one card. A fixture and a result are the same object at
   different points in its life, so they share a renderer that knows the
   difference: a result carries a scoreline, an outcome and its scorers; a
   fixture carries none of those and says so rather than showing empty boxes.
   The moment a result is entered the match simply stops matching the fixtures
   list and starts matching the results one, with no editing anywhere.

   Three things the design this replaces got wrong, all of them where the data
   is awkward rather than where it is easy:

   1. A walkover was drawn as a normal scoreline with a dash in one box and a
      "W" in the other, which reads as a broken card. A walkover has no score.
      It is labelled as awarded and says so.
   2. A cup tie settled on penalties was shown as a plain draw. The normal-time
      score IS a draw and the shootout result is not in the records, so the
      card shows the draw and says it went to penalties rather than inventing
      a winner.
   3. Results were coloured green, amber and red. This design system carries
      one accent hue, and W, D and L are told apart by weight and structure.

   The cards also carry who scored, which is the thing you actually want from
   a results list and which the old one made you open a match to find out.
   ========================================================================== */
import { esc, attr } from '../lib/html.mjs';
import { CLUB } from '../lib/club.mjs';
import { teamSummary, fmtDate } from '../lib/stats.mjs';
import { seasonViews, defaultView, seasonBar, seasonPanels, matchNote } from '../lib/seasons.mjs';
import { siteFooter, sitePreMain, siteHeader, auraFor, oppBadge } from './home.mjs';
import { hasReport as hasWrittenReport } from '../lib/prose.mjs';

const STAR = '/assets/badge/sue-angels-badge-star.webp';
const ARROW = '<span aria-hidden="true">→</span>';

const shortClub = (name) => String(name || '')
  .replace(/^Sue.s Angels FC$/, "Sue's Angels")
  .replace(/\s+FC 2\.0$/, ' 2.0')
  .replace(/\s+FC$/, '');

const shortComp = (name) => String(name || '')
  .replace(/^Chipotle UK /, '')
  .replace(/^Supreme Trophies /, '')
  .replace(/^Surrey FA Sunday Lower Junior County Cup$/, 'Surrey FA Cup');

const rail = (n, label, ref) => `<div class="xrail" aria-hidden="true">
      <span class="xrail__l"><span class="xrail__n">${esc(String(n).padStart(2, '0'))}</span><span class="xrail__t">${esc(label)}</span></span>
      <span class="xrail__r">${esc(ref)}</span>
    </div>`;

const key = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

/* A row of filter chips, shared by both pages. Ships as jump links and is
   promoted to buttons by the script, so a blocked script leaves a complete
   list rather than dead controls. */
/* `counts` is an optional per-season tally: ` data-n-2526="18"` and so on, so
   a chip can say how many matches it would find in the season on screen
   rather than across the club's whole history. Without it the 26/27 tab
   offered League Ten 18 and four cups, every one a filter returning nothing. */
const chipRow = (label, items, group) => `<div class="mt-chips" data-filter-group="${attr(group)}" role="group" aria-label="${attr(label)}">
          ${items.map((it, n) => `<a class="mt-chip${n === 0 ? ' is-on' : ''}" href="#matches" data-value="${attr(it.value)}"${it.counts || ''}${it.hidden ? ' hidden' : ''}>${esc(it.label)}${it.n === undefined ? '' : `<span>${esc(it.n)}</span>`}</a>`).join('\n          ')}
        </div>`;

function matchesPage(d, mode) {
  /* THE SEASON FILTER. One bar for the whole page: it swaps the record panel
     and filters the match list below from the same press, because two season
     controls on one page is two things that can disagree. See
     src/lib/seasons.mjs and the switcher in src/scripts/10-home.js. */
  const VIEWS = seasonViews(d);
  const DEFAULT = defaultView(VIEWS);
  const played = (d.played || []).filter((m) => m.played)
    .slice().sort((a, b) => (b.iso || '').localeCompare(a.iso || ''));
  /* Still to come, from dataset.mjs, which drops the dates that have been
     and gone. Sorting `fixtures` here listed last month's fixture first. */
  const upcoming = d.upcoming || [];

  const nameFor = d.nameFor || ((n) => `No. ${n}`);
  const comps = [...new Set(played.map((m) => m.competition))]
    .map((name) => ({ name, key: key(name), short: shortComp(name), n: played.filter((m) => m.competition === name).length }));

  const all = teamSummary(played.filter((m) => !m.friendly));
  const biggest = played.filter((m) => m.countsGoals)
    .slice().sort((a, b) => (b.ourGoals - b.theirGoals) - (a.ourGoals - a.theirGoals))[0];

  /* Who scored, in the order the record lists them, with a tally where
     somebody got more than one. This is the line a results page exists for
     and the design this replaces made you open a match to find. */
  const scorersOf = (m) => {
    const tally = new Map();
    for (const g of m.detail?.goals || []) {
      const n = nameFor(g.num);
      tally.set(n, (tally.get(n) || 0) + 1);
    }
    return [...tally.entries()].map(([n, c]) => {
      const last = n.split(' ').slice(-1)[0];
      return c > 1 ? `${last} ×${c}` : last;
    });
  };

  /* The next one to be played, so the card can say so. Taken from the list
     rather than from a clock: the build is static, and a "today" computed at
     build time would be wrong the morning after. */
  const nextId = upcoming.length ? upcoming[0].id : null;

  const card = (m, i) => {
    const home = m.weAreHome ? CLUB.name : m.opponent;
    const away = m.weAreHome ? m.opponent : CLUB.name;
    const hs = m.countsGoals ? m.hs : null;
    const as = m.countsGoals ? m.as : null;
    const scorers = scorersOf(m);
    /* The same test the match page uses. Counting any commentary at all put a
       Read the report link on three cards whose pages then said no report had
       been written. */
    const hasReport = hasWrittenReport(m);
    const isNext = m.id === nextId;

    const side = (club, score, isUs) => `<span class="mt-side${isUs ? ' is-us' : ''}">
              <span class="mt-side__badge">${isUs
    ? `<img src="${STAR}" alt="" width="22" height="27" loading="lazy" decoding="async" />`
    : oppBadge(club, d.badges, 22, 22)}</span>
              <span class="mt-side__club">${esc(shortClub(club))}</span>
              ${score === null ? '' : `<span class="mt-side__score">${esc(score)}</span>`}
            </span>`;

    return `<li class="mt${m.played ? '' : ' is-fixture'}${isNext ? ' is-next' : ''}" style="--i:${i}"
          data-comp="${attr(key(m.competition))}"
          data-venue="${attr(m.weAreHome ? 'home' : 'away')}"
          data-result="${attr(m.outcome === 'W' ? 'wins' : m.outcome === 'D' ? 'draws' : 'losses')}"
          data-season="${attr(m.season || '')}">
          <article class="mt__card">
            <header class="mt__top">
              ${m.played
    ? `<span class="mt__res" data-res="${attr(m.outcome || '')}">${esc(m.outcome || '·')}</span>`
    : `<span class="mt__tag">${isNext ? 'Next up' : 'To play'}</span>`}
              <span class="mt__date">${esc(fmtDate(m.date, { weekday: true }))}</span>
            </header>
            <div class="mt__sides${m.played ? '' : ' is-fixture'}">
              ${side(home, hs, m.weAreHome)}
              ${m.played ? '' : '<span class="mt__v" aria-hidden="true">v</span>'}
              ${side(away, as, !m.weAreHome)}
            </div>
            ${!m.played
    ? `<p class="mt__note">${m.kick ? `Kick-off ${esc(m.kick)}` : 'Kick-off to be confirmed'}</p>`
    : m.isWalkover
    ? `<p class="mt__note is-flag">Awarded · walkover</p>`
    : m.decidedOnPenalties
      ? `<p class="mt__note is-flag">Level after ninety · decided on penalties</p>`
      : scorers.length ? `<p class="mt__scorers">${scorers.map((s) => esc(s)).join(', ')}</p>` : ''}
            <footer class="mt__foot">
              <span>${esc(shortComp(m.competition))}</span>
              <span class="mt__where">${m.weAreHome ? 'Home' : 'Away'}${m.played && hasReport ? ' · Report' : ''}</span>
            </footer>
          </article>
        </li>`;
  };

  /* ================= HERO ================= */
  const hero = `<section class="mt-hero" aria-labelledby="mt-h">
      <div class="wrap mt-hero__grid">
        <div>
          <!-- Follows the season bar below. It named one season above a
               filter that can show any of them. -->
          <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> Matchday ·
            <span data-hero-season>${esc(VIEWS[DEFAULT].label)}</span></p>
          <h1 class="mt-hero__title" id="mt-h">Results<span class="volt">.</span></h1>
          <p class="mt-hero__lede">Every match ${esc(CLUB.name)} has played, across league and cups.
            Filter by competition, by home or away, or by how it finished.</p>
        </div>
        <!-- Follows the season bar. These were the club's career totals under
             an eyebrow naming one season, so 26/27 read "Played 33, Won 29,
             Scored 137" for a season with no results in it. -->
        <dl class="mt-tally glassbox" data-hero-tally${VIEWS.map((v) => {
    const sm = teamSummary(v.competitive);
    return ` data-tally-${v.id}="${attr([sm.played, sm.won, sm.goalsFor].join(','))}"`;
  }).join('')}>
          <div><dt>Played</dt><dd>${esc(teamSummary(VIEWS[DEFAULT].competitive).played)}</dd></div>
          <div><dt>Won</dt><dd>${esc(teamSummary(VIEWS[DEFAULT].competitive).won)}</dd></div>
          <div><dt>Scored</dt><dd>${esc(teamSummary(VIEWS[DEFAULT].competitive).goalsFor)}</dd></div>
        </dl>
      </div>
    </section>`;

  /* ================= 01 THE RECORD =================
     One panel per season plus one for every season together. It used to be a
     single set of career figures under a rail reading "25/26 · every
     competition", which is a claim about one season sitting on top of totals
     from all of them. */
  const recordPanel = (v) => {
    const sum = teamSummary(v.competitive);
    if (!sum.played) {
      /* A season can hold a friendly and no competitive match, which is
         exactly where 26/27 stands in August. Saying "no match has been
         played" beside a result on the same page would be wrong, so it says
         which kind is missing. */
      const f = (v.friendlies || []).length;
      return `<p class="mt-rec__none">No ${esc(v.label)} competitive match has been played yet${f
    ? `, though ${f === 1 ? 'a friendly has' : `${f} friendlies have`} been`
    : ''}. The record fills in here as results come in.
          ${f ? 'Friendlies stand on their own and count towards nothing here.' : ''}</p>`;
    }
    const wdl = Math.max(1, sum.won + sum.drawn + sum.lost);
    const big = v.matches.filter((m) => m.countsGoals)
      .slice().sort((a, b) => (b.ourGoals - b.theirGoals) - (a.ourGoals - a.theirGoals))[0];
    /* .rv earns its place: `.mt-rec.is-in .mt-rec__bar li` is what gives the
       won/drawn/lost segments their width. Without it the bar is empty. */
    return `<div class="mt-rec rv">
          <ol class="mt-rec__bar" aria-label="Results across every competition">
            <li class="mt-rec__w" style="--w:${((sum.won / wdl) * 100).toFixed(1)}%"><span class="sr-only">Won ${esc(sum.won)}</span></li>
            ${sum.drawn ? `<li class="mt-rec__d" style="--w:${((sum.drawn / wdl) * 100).toFixed(1)}%"><span class="sr-only">Drawn ${esc(sum.drawn)}</span></li>` : ''}
            ${sum.lost ? `<li class="mt-rec__l" style="--w:${((sum.lost / wdl) * 100).toFixed(1)}%"><span class="sr-only">Lost ${esc(sum.lost)}</span></li>` : ''}
          </ol>
          <ul class="mt-rec__key">
            <li><i class="mt-sw mt-sw--w"></i><b>${esc(sum.won)}</b> won</li>
            <li><i class="mt-sw mt-sw--d"></i><b>${esc(sum.drawn)}</b> drawn</li>
            <li><i class="mt-sw mt-sw--l"></i><b>${esc(sum.lost)}</b> lost</li>
            <li><i class="mt-sw mt-sw--g"></i><b>${esc(sum.goalsFor)}-${esc(sum.goalsAgainst)}</b> goals</li>
          </ul>
          ${big ? `<p class="mt-rec__note">Biggest win: <b>${esc(big.ourGoals)}-${esc(big.theirGoals)}</b>
            ${big.weAreHome ? 'at home to' : 'away at'} ${esc(shortClub(big.opponent))},
            ${esc(fmtDate(big.date, { long: true }))}.
            ${sum.walkovers ? `${esc(sum.walkovers)} of the ${esc(sum.played)} were awarded as walkovers and carry no score.` : ''}</p>` : ''}
        </div>`;
  };

  const recordBand = `<section class="sec mt-record" aria-labelledby="mt-rec-h">
      <div class="wrap">
        ${rail(1, 'The record', 'Every competition')}
        <h2 class="h2 rv" id="mt-rec-h">How it all <span class="volt">finished.</span></h2>
        ${seasonBar(VIEWS, DEFAULT, matchNote, { esc, attr })}
        ${seasonPanels(VIEWS, DEFAULT, recordPanel, { attr })}
      </div>
    </section>`;

  /* ================= 02 THE MATCHES =================
     Every filter is a jump link until the script promotes it, and every card
     ships visible, so a blocked script leaves the full list in date order. */
  /* PLAYED, WAITING FOR A SCORE.
     A fixture whose date has been and gone is not upcoming any more, and with
     no score on it, it is not a result either: it used to leave the website
     entirely the morning after the match and stay gone until somebody opened
     the panel. It sits at the top of the results now, saying plainly that the
     scoreline has not been entered rather than pretending the game did not
     happen. It counts towards nothing: every figure on this site is derived
     from played matches, and this is not one. */
  const awaiting = d.awaiting || [];
  const awaitingBand = awaiting.length ? `<section class="sec mt-awaiting" aria-labelledby="mt-aw-h">
      <div class="wrap">
        ${rail(2, 'Just played', `${awaiting.length} awaiting a score`)}
        <h2 class="h2 rv" id="mt-aw-h">Played, not yet <span class="volt">counted.</span></h2>
        <p class="mt-lede rv">${awaiting.length === 1 ? 'This match has' : 'These matches have'} been
          played and the scoreline has not been entered yet. Nothing on the site counts
          ${awaiting.length === 1 ? 'it' : 'them'} until it is.</p>
        <ul class="mt-grid rv">
          ${awaiting.map((m, i) => card(m, i)).join('\n          ')}
        </ul>
      </div>
    </section>` : '';

  const listBand = `<section class="sec mt-list" id="matches" aria-labelledby="mt-list-h">
      <div class="wrap">
        <!-- Follows the season bar: the grid below it is filtered. -->
        ${rail(awaiting.length ? 3 : 2, 'Every match', `${VIEWS[DEFAULT].matches.length} played`)
    .replace('<span class="xrail__r">', '<span class="xrail__r" data-played-count>')}
        <h2 class="h2 rv" id="mt-list-h">Match by <span class="volt">match.</span></h2>

        <div class="mt-filters rv">
          ${chipRow('Competition', (() => {
    const inView = (v, name) => v.matches.filter((m) => name === null || m.competition === name).length;
    const counts = (name) => VIEWS.map((v) => ` data-n-${v.id}="${attr(inView(v, name))}"`).join('');
    const v0 = VIEWS[DEFAULT];
    return [
      { label: 'All competitions', value: 'all', n: inView(v0, null), counts: counts(null) },
      ...comps.map((c) => ({
        label: c.short, value: c.key, n: inView(v0, c.name),
        counts: counts(c.name), hidden: !inView(v0, c.name),
      })),
    ];
  })(), 'comp')}
          <div class="mt-filters__row">
            <!-- Venue and result counts are the selected season's too. A
                 filter's own count is a promise about what pressing it finds. -->
            ${chipRow('Venue', (() => {
    const n = (v, pred) => v.matches.filter(pred).length;
    const c = (pred) => VIEWS.map((v) => ` data-n-${v.id}="${attr(n(v, pred))}"`).join('');
    const v0 = VIEWS[DEFAULT];
    const home = (m) => m.weAreHome;
    const away = (m) => !m.weAreHome;
    return [
      { label: 'Home and away', value: 'all' },
      { label: 'Home', value: 'home', n: n(v0, home), counts: c(home), hidden: !n(v0, home) },
      { label: 'Away', value: 'away', n: n(v0, away), counts: c(away), hidden: !n(v0, away) },
    ];
  })(), 'venue')}
            ${chipRow('Result', (() => {
    const c = (key) => VIEWS.map((v) => ` data-n-${v.id}="${attr(teamSummary(v.competitive)[key] || 0)}"`).join('');
    const s0 = teamSummary(VIEWS[DEFAULT].competitive);
    return [
      { label: 'Any result', value: 'all' },
      { label: 'Wins', value: 'wins', n: s0.won, counts: c('won'), hidden: !s0.won },
      { label: 'Draws', value: 'draws', n: s0.drawn, counts: c('drawn'), hidden: !s0.drawn },
      { label: 'Losses', value: 'losses', n: s0.lost, counts: c('lost'), hidden: !s0.lost },
    ];
  })(), 'result')}
          </div>
        </div>

        <p class="mt-count rv" data-match-count>${esc(played.length)} matches</p>
        <ul class="mt-grid rv" data-match-grid>
          ${played.map(card).join('\n          ')}
        </ul>
        <p class="mt-empty" data-match-empty hidden>No match matches those filters.</p>
      </div>
    </section>`;

  /* ================= FIXTURES PAGE ================= */
  const next = upcoming[0];
  const fixHero = `<section class="mt-hero" aria-labelledby="fx-h">
      <div class="wrap mt-hero__grid">
        <div>
          <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> Still to play · ${esc(d.nextSeason)}</p>
          <h1 class="mt-hero__title" id="fx-h">Fixtures<span class="volt">.</span></h1>
          <p class="mt-hero__lede">Every game still to come. As soon as a result is entered the
            match moves across to <a href="/results.html">results</a>, so this page only ever shows
            what has yet to be played.</p>
        </div>
        ${upcoming.length ? `<dl class="mt-tally glassbox">
          <div><dt>Still to play</dt><dd>${esc(upcoming.length)}</dd></div>
          <div><dt>At home</dt><dd>${esc(upcoming.filter((m) => m.weAreHome).length)}</dd></div>
          <div><dt>Away</dt><dd>${esc(upcoming.filter((m) => !m.weAreHome).length)}</dd></div>
        </dl>` : ''}
      </div>
    </section>`;

  /* Competitions the fixture list actually contains. Right now that is one,
     pre-season, so no tab row is drawn: a filter offering a single option is
     furniture. Once league and cup dates land it appears on its own, and the
     venue row comes with it. */
  const fixComps = [...new Set(upcoming.map((m) => m.competition))]
    .map((name) => ({ name, key: key(name), short: shortComp(name), n: upcoming.filter((m) => m.competition === name).length }));

  const fixFilters = fixComps.length > 1 ? `<div class="mt-filters rv">
          ${chipRow('Competition', [
    { label: 'All competitions', value: 'all', n: upcoming.length },
    ...fixComps.map((c) => ({ label: c.short, value: c.key, n: c.n })),
  ], 'comp')}
          <div class="mt-filters__row">
            ${chipRow('Venue', [
    { label: 'Home and away', value: 'all' },
    { label: 'Home', value: 'home', n: upcoming.filter((m) => m.weAreHome).length },
    { label: 'Away', value: 'away', n: upcoming.filter((m) => !m.weAreHome).length },
  ], 'venue')}
          </div>
        </div>
        <p class="mt-count rv" data-match-count>${esc(upcoming.length)} fixtures</p>` : '';

  const fixBand = `<section class="sec mt-fixtures" id="fixtures" aria-labelledby="fx-list-h">
      <div class="wrap">
        ${rail(1, 'The calendar', upcoming.length ? `${upcoming.length} to play` : 'Nothing scheduled')}
        <h2 class="h2 rv" id="fx-list-h">What comes <span class="volt">next.</span></h2>
        ${next ? `<p class="mt-lede rv">Next up is ${next.weAreHome ? '' : 'away at '}${esc(shortClub(next.opponent))}${next.weAreHome ? ' at home' : ''},
          ${esc(fmtDate(next.date, { weekday: true, long: true }))}.</p>` : ''}
        ${fixFilters}
        ${upcoming.length ? `<ul class="mt-grid rv" data-match-grid>
          ${upcoming.map(card).join('\n          ')}
        </ul>
        <p class="mt-empty" data-match-empty hidden>No fixture matches those filters.</p>` : `<div class="mt-none rv">
          <p class="mt-none__k">${esc(CLUB.nextDivision)} · ${esc(d.nextSeason)}</p>
          <p class="mt-none__t">No fixtures on the calendar yet.</p>
          <p class="mt-none__b">As soon as dates are confirmed they appear here, and each one moves
            across to the results page once it has been played.</p>
        </div>`}
      </div>
    </section>`;

  /* ================= CTA ================= */
  const ctaBand = mode === 'fixtures'
    ? `<section class="sec sec--cta mt-cta" aria-labelledby="mt-cta-h">
      <div class="wrap">
        <div class="cta2">
          <span class="cta2__glow" aria-hidden="true"></span>
          <img class="cta2__badge" src="${STAR}" alt="" width="500" height="620" loading="lazy" decoding="async" aria-hidden="true" />
          <div class="cta2__glass glassbox rv">
            <p class="eyebrow cta2__eyebrow">Been and gone</p>
            <h2 class="h2" id="mt-cta-h">Every match already <span class="volt">played.</span></h2>
            <p class="cta2__sub">Thirty-three results across league and cups, filterable by
              competition, venue and how each one finished.</p>
            <div class="cta2__btns">
              <a class="btn btn--volt" href="/results.html">See the results ${ARROW}</a>
              <a class="btn btn--ghost" href="/champions.html">The title-winning season</a>
            </div>
          </div>
        </div>
      </div>
    </section>`
    : `<section class="sec sec--cta mt-cta" aria-labelledby="mt-cta-h">
      <div class="wrap">
        <div class="cta2">
          <span class="cta2__glow" aria-hidden="true"></span>
          <img class="cta2__badge" src="${STAR}" alt="" width="500" height="620" loading="lazy" decoding="async" aria-hidden="true" />
          <div class="cta2__glass glassbox rv">
            <p class="eyebrow cta2__eyebrow">${esc(d.currentSeason)} · Champions</p>
            <h2 class="h2" id="mt-cta-h">Thirty-three matches, one <span class="volt">title.</span></h2>
            <p class="cta2__sub">The whole season, told properly: the unbeaten league run, the
              numbers behind it, and the players who did it.</p>
            <div class="cta2__btns">
              <a class="btn btn--volt" href="/champions.html">The title-winning season ${ARROW}</a>
              <a class="btn btn--ghost" href="/stats.html">Player stats</a>
            </div>
          </div>
        </div>
      </div>
    </section>`;

  const isFixtures = mode === 'fixtures';

  return {
    body: siteHeader(isFixtures ? '/fixtures.html' : '/results.html')
      + (isFixtures ? fixHero + fixBand : hero + recordBand + awaitingBand + listBand)
      + ctaBand,
    bodyClass: `is-home is-sub is-matches${isFixtures ? ' is-fixtures' : ''}`,
    css: 'home.css',
    shell: 'home',
    preMain: sitePreMain(auraFor(isFixtures ? 'fixtures.html' : 'results.html')),
    footerHtml: siteFooter(),
    schema: [{
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `${isFixtures ? 'Fixtures' : 'Results'} · ${CLUB.name}`,
      breadcrumb: {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${CLUB.site}/` },
          { '@type': 'ListItem', position: 2, name: isFixtures ? 'Fixtures' : 'Results',
            item: `${CLUB.site}/${isFixtures ? 'fixtures' : 'results'}.html` },
        ],
      },
    }],
  };
}

export const results = (d) => matchesPage(d, 'results');
export const fixtures = (d) => matchesPage(d, 'fixtures');
