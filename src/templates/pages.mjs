/* All remaining public routes. Each returns { body } and is composed from the
   shared blocks so figures always come from the derived dataset. */
import { esc, attr, icon, crest, sectionHead, statTile, pageHero, crumbs, emptyState } from '../lib/html.mjs';
import {
  fixtureCard, playerCard, leagueTable, statsTable, formGuideBlock,
  articleCard, honourRow,
} from '../lib/blocks.mjs';
import { CLUB, SEPSIS, SPONSOR_TIERS, ENQUIRY_TYPES, JOIN_PATHS, POSITION_GROUPS } from '../lib/club.mjs';
import {
  teamSummary, formGuide, homeAwaySplit, byCompetition, leaderboard,
  clubRecords, fmtDate, groupBySeason,
} from '../lib/stats.mjs';

const trail = (...parts) => crumbs([{ label: 'Home', href: '/' }, ...parts]);

/* ======================= OUR STORY ======================= */
export function about(d) {
  const all = teamSummary(d.played);
  return { body: `
  ${pageHero({
    crumbs: trail({ label: 'Our story', href: '/about.html' }),
    eyebrow: 'The club',
    title: 'Built in her name.',
    lede: `Sue’s Angels FC is a London Sunday-league football club founded in ${esc(CLUB.founded)} in memory of ${esc(CLUB.memorial.name)}.`,
  })}
  <section class="section section--flush">
    <div class="wrap wrap--wide">
      <div class="split split--wide-left">
        <div class="prose">
          <p style="font-size:var(--step-1);color:var(--text)">Everything about this club begins with one person.</p>
          <p>Sue’s Angels FC was founded in ${esc(CLUB.founded)} in memory of ${esc(CLUB.memorial.name)},
          so that her name stays part of something good, week after week. We lost Sue to sepsis. It is a loss her
          family and friends carry every day, and it is the reason this club exists.</p>
          <p>We play for her, and we talk openly about sepsis so that fewer people have to go through the same thing.</p>
          <h2>The first season</h2>
          <p>The club entered ${esc(CLUB.division)} of the ${esc(CLUB.league)} for the ${esc(d.currentSeason)}
          season as a brand new side. It finished the league campaign unbeaten, champions at the first attempt,
          and promoted into ${esc(CLUB.nextDivision)}.</p>
          <p>Across all competitions the Angels played ${esc(all.played)} matches and won ${esc(all.won)},
          scoring ${esc(all.goalsFor)} goals. Three of those league wins came as walkovers when the
          opposition could not field a side.</p>
          <h2>What we are building</h2>
          <p>A club that competes properly on a Sunday, looks after its players, and keeps Sue’s
          message in the open. That means a real matchday: photography, match reports, statistics kept
          honestly, and a squad that people want to be part of.</p>
        </div>
        <div class="stack">
          <div class="quote glass glass--lg glass--reading">
            <blockquote>“${esc(CLUB.memorial.motto)}”</blockquote>
            <cite>The words on our crest</cite>
          </div>
          <div class="grid grid--2">
            ${statTile({ value: String(CLUB.founded), label: 'Founded', glass: true, brand: true })}
            ${statTile({ value: String(all.played), label: 'Matches played', glass: true })}
            ${statTile({ value: String(d.squad.length), label: 'Squad members', glass: true })}
            ${statTile({ value: '1st', label: `${CLUB.division} finish`, glass: true, brand: true })}
          </div>
          <a class="btn btn--primary btn--block" href="/sepsis.html">${icon('heart')} Our cause: sepsis awareness</a>
        </div>
      </div>
    </div>
  </section>` };
}

/* ======================= OUR CAUSE / SEPSIS ======================= */
export function sepsis() {
  const signs = SEPSIS.adultSigns.map((s) => `<div class="sign glass glass--reading">
    <span class="sign__letter" aria-hidden="true">${esc(s.letter)}</span>
    <h3 class="sign__title">${esc(s.title)}</h3>
    <p class="sign__body">${esc(s.body)}</p>
  </div>`).join('');

  return { body: `
  ${pageHero({
    crumbs: trail({ label: 'Our cause', href: '/sepsis.html' }),
    eyebrow: 'Our cause',
    title: `For ${esc(CLUB.memorial.name.split(' ')[0])}.`,
    lede: `Sue’s Angels FC was founded in memory of ${esc(CLUB.memorial.name)}, who we lost to sepsis. We play in her name, and we share what we have learned so other families can recognise the signs in time.`,
  })}

  <section class="section section--flush">
    <div class="wrap wrap--wide">
      <div class="ribbon glass glass--pill">
        <span class="ribbon__item"><span class="ribbon__v">${esc(CLUB.founded)}</span><span class="ribbon__l">Founded in her memory</span></span>
        <span class="ribbon__sep" aria-hidden="true"></span>
        <span class="ribbon__item"><span class="ribbon__v">${esc(SEPSIS.livesLostUK)}</span><span class="ribbon__l">UK lives lost each year</span></span>
        <span class="ribbon__sep" aria-hidden="true"></span>
        <span class="ribbon__item"><span class="ribbon__v">6</span><span class="ribbon__l">Signs that can save one</span></span>
      </div>
    </div>
  </section>

  <section class="section" aria-labelledby="what-h">
    <div class="wrap wrap--narrow">
      ${sectionHead({ index: '01', eyebrow: 'Understanding sepsis', title: '<span id="what-h">What sepsis is</span>' })}
      <div class="prose">
        <p>${esc(SEPSIS.what)}</p>
        <p>The <a href="${attr(CLUB.charity.url)}" rel="noopener" target="_blank">${esc(CLUB.charity.name)}</a>
        estimates that sepsis takes around ${esc(SEPSIS.livesLostUK)} lives in the UK every year. Many of those
        losses could have been prevented, and the biggest difference is spotting it early. That is why we keep talking about it.</p>
      </div>
    </div>
  </section>

  <section class="section" aria-labelledby="signs-h">
    <div class="wrap wrap--wide">
      ${sectionHead({ index: '02', eyebrow: 'Know the signs', title: '<span id="signs-h">Could it be sepsis?</span>' })}
      <p style="max-width:60ch;color:var(--text-muted);margin-bottom:var(--space-6)">
        In an adult, trust your instinct and get help quickly. Call 999 or NHS 111, and ask the question
        if you notice any of these.
      </p>
      <div class="signs">${signs}</div>

      <div class="split" style="margin-top:var(--space-8)">
        <div class="panel" style="padding:var(--space-6)">
          <h3 style="font-size:var(--step-2);margin-bottom:var(--space-4)">In a child or baby</h3>
          <p style="color:var(--text-muted);margin-bottom:var(--space-4)">Call 999 or go straight to A&amp;E if a child:</p>
          <ul class="tier__list">${SEPSIS.childSigns.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
          <p style="font-size:var(--step--1);color:var(--text-muted);margin-top:var(--space-4)">${esc(SEPSIS.babyNote)}</p>
        </div>
        <div class="stack">
          <div class="glass glass--warm" style="padding:var(--space-6)">
            <h3 style="font-size:var(--step-2);margin-bottom:var(--space-3)">Trust your instinct</h3>
            <p style="color:var(--text-muted)">If someone is getting worse quickly, please do not wait.
            Ask the question: could it be sepsis?</p>
          </div>
          <p class="medical-note">
            <strong>This page shares general awareness information, not medical advice.</strong>
            For full, up to date guidance please visit the
            <a href="${attr(CLUB.charity.url)}" rel="noopener" target="_blank">${esc(CLUB.charity.name)}</a>
            and the <a href="${attr(CLUB.nhs)}" rel="noopener" target="_blank">NHS</a>.
          </p>
        </div>
      </div>
    </div>
  </section>

  <section class="section" aria-labelledby="help-h">
    <div class="wrap wrap--wide">
      ${sectionHead({ index: '03', eyebrow: 'Get involved', title: '<span id="help-h">Three ways to help</span>' })}
      <div class="paths">
        <article class="path glass glass--reading">
          <span class="path__n">01</span>
          <h3 class="path__title">Know and share the signs</h3>
          <p class="path__body">The signs above can save a life. Take a moment to learn them, and share them with the people you love.</p>
          <button class="btn btn--glass btn--sm" type="button" data-share aria-label="Share this page">Share this page</button>
        </article>
        <article class="path glass glass--reading">
          <span class="path__n">02</span>
          <h3 class="path__title">Support the ${esc(CLUB.charity.name)}</h3>
          <p class="path__body">They support families, fund research and raise awareness across the country. You can find out more or give on their website.</p>
          <a class="btn btn--glass btn--sm" href="${attr(CLUB.charity.url)}" rel="noopener" target="_blank">Visit sepsistrust.org ${icon('external')}</a>
        </article>
        <article class="path glass glass--reading">
          <span class="path__n">03</span>
          <h3 class="path__title">Stand with the club</h3>
          <p class="path__body">Back Sue’s Angels as a sponsor, partner or volunteer, and help us carry her message a little further.</p>
          <a class="btn btn--glass btn--sm" href="/join.html">Get involved</a>
        </article>
      </div>
    </div>
  </section>` };
}

/* ======================= CHAMPIONS ======================= */
export function champions(d) {
  const league = d.played.filter((m) => m.competition === CLUB.division);
  const ls = teamSummary(league);
  const all = teamSummary(d.played);
  const ourRow = d.table.find((r) => r.us);
  const ordered = league.slice().sort((a, b) => (a.iso || '').localeCompare(b.iso || ''));

  return { body: `
  ${pageHero({
    crumbs: trail({ label: 'Champions', href: '/champions.html' }),
    eyebrow: `${esc(d.currentSeason)} · ${esc(CLUB.division)}`,
    title: 'Champions.<br>Unbeaten.',
    lede: `Eighteen league games, eighteen wins, ${esc(ls.goalsFor)} goals scored and ${esc(ls.goalsAgainst)} conceded. Promoted into ${esc(CLUB.nextDivision)}.`,
  })}
  <section class="section section--flush">
    <div class="wrap wrap--wide">
      <div class="grid grid--4">
        ${statTile({ value: String(ls.played), label: 'League games', glass: true })}
        ${statTile({ value: String(ls.won), label: 'Won', glass: true, brand: true })}
        ${statTile({ value: String(ls.lost), label: 'Lost', glass: true })}
        ${statTile({ value: String(ourRow?.points ?? ls.points), label: 'Points', glass: true, brand: true })}
        ${statTile({ value: String(ls.goalsFor), label: 'Goals scored', glass: true })}
        ${statTile({ value: String(ls.goalsAgainst), label: 'Conceded', glass: true })}
        ${statTile({ value: `+${ls.goalDifference}`, label: 'Goal difference', glass: true })}
        ${statTile({ value: String(ls.cleanSheets), label: 'Clean sheets', sub: `from ${ls.onGoalRecord} scored games`, glass: true })}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap wrap--wide">
      ${sectionHead({ index: '01', eyebrow: 'How it finished', title: `${esc(CLUB.division)} final table` })}
      ${leagueTable(d.table, { caption: `${CLUB.league} · ${CLUB.division} · ${d.currentSeason} final standings` })}
      <div class="ltable__legend">
        <span class="ltable__key"><span class="ltable__swatch"></span> Sue’s Angels FC</span>
        ${d.promotionSpots ? `<span>Top ${esc(d.promotionSpots)} promoted</span>` : ''}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap wrap--wide">
      ${sectionHead({ index: '02', eyebrow: 'Every league game', title: 'The eighteen' })}
      <div class="grid grid--wide">${ordered.map((m) => fixtureCard(m, d.badges, { glass: true })).join('')}</div>
    </div>
  </section>

  <section class="section">
    <div class="wrap wrap--wide">
      ${sectionHead({ index: '03', eyebrow: 'Beyond the league', title: 'Cup competitions' })}
      <div class="grid grid--2">
        ${byCompetition(d.played).filter((c) => c.competition !== CLUB.division).map((c) => `
          <div class="panel" style="padding:var(--space-5)">
            <h3 style="font-size:var(--step-1);margin-bottom:var(--space-3)">${esc(c.competition)}</h3>
            <p style="color:var(--text-muted);font-size:var(--step--1)">
              Played ${esc(c.played)} · Won ${esc(c.won)} · Drawn ${esc(c.drawn)} · Lost ${esc(c.lost)}
              <br>Goals ${esc(c.goalsFor)}–${esc(c.goalsAgainst)}
            </p>
          </div>`).join('')}
      </div>
      <p style="margin-top:var(--space-6);color:var(--text-muted);font-size:var(--step--1)">
        Across every competition: played ${esc(all.played)}, won ${esc(all.won)}, drawn ${esc(all.drawn)},
        lost ${esc(all.lost)}, ${esc(all.goalsFor)} scored and ${esc(all.goalsAgainst)} conceded.
      </p>
    </div>
  </section>` };
}

/* ======================= SQUAD ======================= */
export function squad(d) {
  const groups = POSITION_GROUPS.map((g) => {
    const list = d.players.filter((p) => p.positionGroup === g.key && !p.unknown && p.status === 'active');
    if (!list.length) return '';
    return `<section class="section" aria-labelledby="grp-${g.key}">
      <div class="wrap wrap--wide">
        ${sectionHead({ eyebrow: `${list.length} ${list.length === 1 ? 'player' : 'players'}`, title: `<span id="grp-${g.key}">${esc(g.label)}</span>` })}
        <div class="grid grid--3">${list.map(playerCard).join('')}</div>
      </div>
    </section>`;
  }).join('');

  return { body: `
  ${pageHero({
    crumbs: trail({ label: 'Squad', href: '/squad.html' }),
    eyebrow: 'The first team',
    title: 'The squad.',
    lede: 'Positions are taken from where each player actually lined up across the season’s match records. Tap any player for their full profile.',
    meta: [`${esc(d.squad.length)} squad members`, `${esc(d.players.filter((p) => p.apps > 0).length)} with appearances`],
  })}
  ${groups}` };
}

/* ======================= PLAYER STATS ======================= */
export function stats(d) {
  const rows = d.players.filter((p) => p.apps > 0 || p.goals > 0 || p.assists > 0);
  const lb = (key, label) => `<div class="panel" style="padding:var(--space-5)">
    <h3 style="font-size:var(--step-1);margin-bottom:var(--space-4)">${esc(label)}</h3>
    <div class="stack stack--sm">
      ${leaderboard(d.players, key, 5).map((p, i) => `<div class="row row--between" style="font-size:var(--step--1)">
        <span class="truncate"><strong style="color:var(--brand-text);margin-right:var(--space-2)">${i + 1}</strong>
        <a href="/players/${attr(p.slug)}.html" style="text-decoration:none">${esc(p.name)}</a></span>
        <strong class="tnum">${esc(p[key])}</strong>
      </div>`).join('')}
    </div>
  </div>`;

  return { body: `
  ${pageHero({
    crumbs: trail({ label: 'Player stats', href: '/stats.html' }),
    eyebrow: 'Performance',
    title: 'Player statistics.',
    lede: 'Every figure below is derived from the club’s own match records, across all competitions.',
  })}
  <section class="section section--flush">
    <div class="wrap wrap--wide">
      <h2 class="sr-only">Leaderboards</h2>
      <div class="grid grid--4">
        ${lb('goals', 'Goals')}
        ${lb('assists', 'Assists')}
        ${lb('apps', 'Appearances')}
        ${lb('motm', 'Player of the Match')}
      </div>
    </div>
  </section>
  <section class="section">
    <div class="wrap wrap--wide">
      ${sectionHead({ index: '01', eyebrow: 'Full table', title: 'Every player' })}
      <div class="row" style="margin-bottom:var(--space-4)">
        <label class="sr-only" for="stat-search">Search players</label>
        <input class="input" id="stat-search" type="search" placeholder="Search a player" data-table-filter="#stats-table" style="max-width:280px">
      </div>
      <div id="stats-table">${statsTable(rows, { caption: `All competitions · ${d.currentSeason}` })}</div>
      <p style="margin-top:var(--space-4);font-size:var(--step--2);color:var(--text-subtle)">
        Appearances count starts. Sunday-league match returns do not record minutes played or
        substitute appearances, so neither is shown rather than estimated.
      </p>
    </div>
  </section>` };
}

/* ======================= COACHES ======================= */
export function coaches(d) {
  const cards = d.coaches.map((c) => `<article class="split split--wide-left panel" style="padding:var(--space-6);gap:var(--space-6)">
    <div>
      <p class="eyebrow">${esc(c.role || 'Coaching staff')}</p>
      <h2 style="font-size:var(--step-3);margin-block:var(--space-2) var(--space-4)">${esc(c.name)}</h2>
      <div class="prose" style="font-size:var(--step--1)">
        ${(c.bio || []).map((p) => `<p>${esc(p)}</p>`).join('')}
      </div>
      ${(c.playedFor || []).length ? `<div style="margin-top:var(--space-5)">
        <p class="eyebrow" style="margin-bottom:var(--space-2)">Played for</p>
        <div class="row row--tight">${c.playedFor.map((t) => `<span class="chip" style="pointer-events:none">${esc(t)}</span>`).join('')}</div>
      </div>` : ''}
    </div>
    <div class="split__media split__media--tall">
      ${c.photo
        ? `<img src="/${attr(c.photo)}" alt="${attr(c.name)}" width="420" height="560" loading="lazy" decoding="async">`
        : `<div style="aspect-ratio:3/4;display:grid;place-items:center;background:var(--surface-3)"><span style="width:70px;color:var(--brand);opacity:.3">${crest()}</span></div>`}
    </div>
  </article>`).join('');

  return { body: `
  ${pageHero({
    crumbs: trail({ label: 'Coaches', href: '/coaches.html' }),
    eyebrow: 'The staff',
    title: 'Coaching staff.',
    lede: 'The people shaping the Angels on and off the pitch.',
  })}
  <section class="section section--flush">
    <div class="wrap wrap--wide"><div class="stack stack--lg">${cards || emptyState({ title: 'Staff coming soon' })}</div></div>
  </section>` };
}

/* ======================= FIXTURES ======================= */
export function fixtures(d) {
  const upcoming = d.fixtures.slice().sort((a, b) => (a.iso || '').localeCompare(b.iso || ''));
  return { body: `
  ${pageHero({
    crumbs: trail({ label: 'Fixtures', href: '/fixtures.html' }),
    eyebrow: 'What is coming up',
    title: 'Fixtures.',
    lede: `Upcoming Angels fixtures across league and cups. ${upcoming.length ? '' : 'Nothing is scheduled right now.'}`,
  })}
  <section class="section section--flush">
    <div class="wrap wrap--wide">
      ${upcoming.length
        ? `<div class="grid grid--wide">${upcoming.map((m) => fixtureCard(m, d.badges, { glass: true })).join('')}</div>`
        : emptyState({
            title: 'No fixtures scheduled',
            body: `The ${CLUB.nextDivision} fixture list is published as soon as the league releases it. Results from the title-winning season are all available in the meantime.`,
            action: '<a class="btn btn--primary" href="/results.html">Every result</a>',
          })}
    </div>
  </section>` };
}

/* ======================= RESULTS ======================= */
export function results(d) {
  const seasons = groupBySeason(d.played);
  const comps = [...new Set(d.played.map((m) => m.competition))];
  const chips = `<div class="chip-row" role="group" aria-label="Filter by competition">
    <button class="chip is-active" type="button" data-filter="all" aria-pressed="true">All</button>
    ${comps.map((c) => `<button class="chip" type="button" data-filter="${attr(c)}" aria-pressed="false">${esc(c)}</button>`).join('')}
  </div>`;

  const blocks = seasons.map((s) => `<section class="section" aria-labelledby="s-${attr(s.season.replace('/', '-'))}">
    <div class="wrap wrap--wide">
      ${sectionHead({
        eyebrow: `Played ${s.played} · Won ${s.won} · Drawn ${s.drawn} · Lost ${s.lost}`,
        title: `<span id="s-${attr(s.season.replace('/', '-'))}">${esc(s.season)} season</span>`,
      })}
      <div class="grid grid--wide" data-filter-list>
        ${s.matches.map((m) => `<div data-competition="${attr(m.competition)}">${fixtureCard(m, d.badges, { glass: true })}</div>`).join('')}
      </div>
    </div>
  </section>`).join('');

  return { body: `
  ${pageHero({
    crumbs: trail({ label: 'Results', href: '/results.html' }),
    eyebrow: 'Every result',
    title: 'Results.',
    lede: 'Every Angels result across league and cups. Tap any match for line-ups, goals and the report.',
  })}
  <section class="section section--strip"><div class="wrap wrap--wide">${chips}</div></section>
  ${blocks}` };
}

/* ======================= LEAGUE ======================= */
export function league(d) {
  const scorers = d.leagueScorers.slice(0, 15);
  return { body: `
  ${pageHero({
    crumbs: trail({ label: 'League table', href: '/league.html' }),
    eyebrow: esc(CLUB.league),
    title: `${esc(CLUB.division)}.`,
    lede: `The full ${esc(d.currentSeason)} table, every result across the division, and the league’s leading scorers.`,
  })}
  <section class="section section--flush">
    <div class="wrap wrap--wide">
      ${leagueTable(d.table, { caption: `${CLUB.division} · ${d.currentSeason} final standings` })}
      <div class="ltable__legend">
        <span class="ltable__key"><span class="ltable__swatch"></span> Sue’s Angels FC</span>
        ${d.promotionSpots ? `<span>Top ${esc(d.promotionSpots)} promoted</span>` : ''}
      </div>
    </div>
  </section>
  <section class="section">
    <div class="wrap wrap--wide">
      ${sectionHead({ index: '01', eyebrow: 'Across the division', title: 'Leading scorers' })}
      <div class="table-wrap scroll-x">
        <table class="data">
          <caption>${esc(CLUB.division)} leading scorers · ${esc(d.currentSeason)}</caption>
          <thead><tr>
            <th scope="col">#</th><th scope="col">Player</th><th scope="col">Club</th>
            <th scope="col">Goals</th><th scope="col">Assists</th><th scope="col">Apps</th>
          </tr></thead>
          <tbody>
            ${scorers.map((s) => `<tr${s.us ? ' data-us="true"' : ''}>
              <td>${esc(s.pos)}</td>
              <th scope="row" class="cell-club">${esc(s.name)}</th>
              <td class="cell-club">${esc(s.club)}</td>
              <td>${esc(s.goals)}</td><td>${esc(s.assists)}</td><td>${esc(s.apps)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p style="margin-top:var(--space-4);font-size:var(--step--2);color:var(--text-subtle)">
        This chart counts league games only, so it will read lower than the club’s
        <a href="/stats.html">all-competitions statistics</a>.
      </p>
    </div>
  </section>` };
}

/* ======================= RECORDS ======================= */
export function records(d) {
  const recs = clubRecords(d.played, d.players);
  const split = homeAwaySplit(d.played);
  return { body: `
  ${pageHero({
    crumbs: trail({ label: 'Club records', href: '/records.html' }),
    eyebrow: 'The archive',
    title: 'Club records.',
    lede: 'Every record below is computed from the club’s match records, so it updates itself as results are added.',
  })}
  <section class="section section--flush">
    <div class="wrap wrap--wide">
      <div class="split">
        <div>
          ${sectionHead({ index: '01', eyebrow: 'Firsts and bests', title: 'The record book' })}
          <div>${recs.map((r) => `<div class="record">
            <span class="record__v">${esc(r.value)}</span>
            <span class="record__l">${r.href ? `<a href="${attr(r.href)}" style="text-decoration:none">${esc(r.label)}</a>` : esc(r.label)}</span>
            <span class="record__who">${esc(r.who)}</span>
          </div>`).join('')}</div>
        </div>
        <div class="stack">
          <div class="panel" style="padding:var(--space-5)">
            <h3 style="font-size:var(--step-1);margin-bottom:var(--space-4)">Home and away</h3>
            <div class="grid grid--2">
              ${statTile({ value: `${split.home.won}/${split.home.played}`, label: 'Home wins' })}
              ${statTile({ value: `${split.away.won}/${split.away.played}`, label: 'Away wins' })}
              ${statTile({ value: String(split.home.goalsFor), label: 'Home goals' })}
              ${statTile({ value: String(split.away.goalsFor), label: 'Away goals' })}
            </div>
          </div>
          <div class="panel" style="padding:var(--space-5)">
            <h3 style="font-size:var(--step-1);margin-bottom:var(--space-4)">By competition</h3>
            <div class="stack stack--sm">
              ${byCompetition(d.played).map((c) => `<div class="row row--between" style="font-size:var(--step--1)">
                <span class="truncate">${esc(c.competition)}</span>
                <strong class="tnum">${esc(c.won)}W ${esc(c.drawn)}D ${esc(c.lost)}L</strong>
              </div>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>` };
}

/* ======================= AWARDS ======================= */
export function awards(d) {
  const potm = d.recognition.filter((r) => r.type === 'potm');
  const season = d.recognition.filter((r) => r.type === 'season' || r.type === 'eos');
  const others = d.recognition.filter((r) => !['potm', 'season', 'eos'].includes(r.type));
  const motmLeaders = leaderboard(d.players, 'motm', 8);

  return { body: `
  ${pageHero({
    crumbs: trail({ label: 'Awards', href: '/awards.html' }),
    eyebrow: 'Honours',
    title: 'Awards and recognition.',
    lede: 'Player of the Month, end of season awards, and the players who kept turning up.',
  })}
  <section class="section section--flush">
    <div class="wrap wrap--wide">
      ${sectionHead({ index: '01', eyebrow: 'Month by month', title: 'Player of the Month' })}
      ${potm.length
        ? `<div class="grid grid--3">${potm.map((r) => honourRow(r, d.nameFor)).join('')}</div>`
        : emptyState({ title: 'No Player of the Month awards yet' })}
    </div>
  </section>
  ${season.length ? `<section class="section">
    <div class="wrap wrap--wide">
      ${sectionHead({ index: '02', eyebrow: 'End of season', title: 'Season awards' })}
      <div class="grid grid--3">${season.map((r) => honourRow(r, d.nameFor)).join('')}</div>
    </div>
  </section>` : ''}
  <section class="section">
    <div class="wrap wrap--wide">
      ${sectionHead({ index: season.length ? '03' : '02', eyebrow: 'Chosen on the day', title: 'Most Player of the Match awards' })}
      <div class="grid grid--2">
        ${motmLeaders.map((p, i) => `<a class="honour glass" href="/players/${attr(p.slug)}.html">
          <span class="honour__mark" aria-hidden="true">${i + 1}</span>
          <div class="honour__body">
            <p class="honour__title truncate">${esc(p.name)}</p>
            <p class="honour__meta">${esc(p.motm)} ${p.motm === 1 ? 'award' : 'awards'} · ${esc(p.apps)} appearances</p>
          </div>
        </a>`).join('')}
      </div>
    </div>
  </section>
  ${others.length ? `<section class="section">
    <div class="wrap wrap--wide">
      ${sectionHead({ eyebrow: 'Also recognised', title: 'Milestones and mentions' })}
      <div class="grid grid--3">${others.map((r) => honourRow(r, d.nameFor)).join('')}</div>
    </div>
  </section>` : ''}` };
}

/* ======================= NEWS ======================= */
export function news(d) {
  const cats = [...new Set(d.articles.map((a) => a.category))];
  return { body: `
  ${pageHero({
    crumbs: trail({ label: 'News', href: '/news.html' }),
    eyebrow: 'From the club',
    title: 'News.',
    lede: 'Match reports, club announcements and the stories behind the badge.',
  })}
  <section class="section section--strip">
    <div class="wrap wrap--wide">
      <div class="chip-row" role="group" aria-label="Filter by category">
        <button class="chip is-active" type="button" data-filter="all" aria-pressed="true">All</button>
        ${cats.map((c) => `<button class="chip" type="button" data-filter="${attr(c)}" aria-pressed="false">${esc(c)}</button>`).join('')}
      </div>
    </div>
  </section>
  <section class="section">
    <div class="wrap wrap--wide">
      <h2 class="sr-only">All articles</h2>
      ${d.articles.length
        ? `<div class="grid grid--wide" data-filter-list>
            ${d.articles.map((a) => `<div data-competition="${attr(a.category)}">${articleCard(a, { glass: true })}</div>`).join('')}
          </div>`
        : emptyState({ title: 'No articles yet' })}
    </div>
  </section>` };
}

/* ======================= GALLERY ======================= */
export function gallery(d) {
  return { body: `
  ${pageHero({
    crumbs: trail({ label: 'Gallery', href: '/gallery.html' }),
    eyebrow: 'Matchday photography',
    title: 'Gallery.',
    lede: `${esc(d.galleries.reduce((a, g) => a + g.photoCount, 0))} photographs across ${esc(d.galleries.length)} matchday albums.`,
  })}
  <section class="section section--flush">
    <div class="wrap wrap--wide">
      ${d.galleries.length
        ? `<div class="grid grid--wide">
            ${d.galleries.map((g) => `<a class="media-card" href="/gallery/${attr(g.slug)}.html">
              ${g.cover || g.src
                ? `<img src="${attr(g.cover || g.src)}" alt="" width="600" height="338" loading="lazy" decoding="async">`
                : '<div style="aspect-ratio:16/9;background:var(--surface-3)"></div>'}
              <div class="media-card__overlay">
                <p style="font-family:var(--font-display);font-size:var(--step-1)">${esc(g.title)}</p>
                <p style="font-size:var(--step--2);opacity:.8">${esc(g.photoCount)} photographs${g.photographer ? ` · ${esc(g.photographer)}` : ''}</p>
              </div>
            </a>`).join('')}
          </div>`
        : emptyState({ title: 'No albums yet' })}
    </div>
  </section>` };
}

/* ======================= VIDEOS ======================= */
export function videos(d) {
  return { body: `
  ${pageHero({
    crumbs: trail({ label: 'Videos', href: '/videos.html' }),
    eyebrow: 'Watch',
    title: 'Videos.',
    lede: 'Highlights and matchday video from the Angels.',
  })}
  <section class="section section--flush">
    <div class="wrap wrap--wide">
      <h2 class="sr-only">Club videos</h2>
      ${emptyState({
        title: 'Videos are published on YouTube',
        body: 'Highlights from the unbeaten season are on the club channel. Clips get embedded here as they are catalogued in the control panel.',
        action: `<a class="btn btn--primary" href="https://www.youtube.com/${attr(CLUB.youtube.handle)}" rel="noopener" target="_blank">${icon('youtube')} Open the channel</a>`,
      })}
    </div>
  </section>` };
}

/* ======================= LIVE ======================= */
export function live(d) {
  const next = d.fixtures.slice().sort((a, b) => (a.iso || '').localeCompare(b.iso || ''))[0];
  return { body: `
  ${pageHero({
    crumbs: trail({ label: 'Live', href: '/live.html' }),
    eyebrow: 'Live and replays',
    title: 'Live.',
    lede: 'When a match is streamed it appears here. Otherwise, replays live on the club YouTube channel.',
  })}
  <section class="section section--flush">
    <div class="wrap wrap--wide">
      <h2 class="sr-only">Live coverage</h2>
      <div class="split">
        <div>
          ${emptyState({
            title: 'No live match right now',
            body: 'This page turns into the live match centre on matchday, with the score, the clock and the timeline as they happen.',
            action: `<a class="btn btn--primary" href="https://www.youtube.com/${attr(CLUB.youtube.handle)}" rel="noopener" target="_blank">${icon('youtube')} Replays on YouTube</a>`,
          })}
        </div>
        <div class="stack">
          ${next ? `<div><p class="eyebrow" style="margin-bottom:var(--space-3)">Next up</p>${fixtureCard(next, d.badges, { glass: true })}</div>` : ''}
          <div class="glass" style="padding:var(--space-5)">
            <h3 style="font-size:var(--step-1);margin-bottom:var(--space-3)">Following along</h3>
            <p style="color:var(--text-muted);font-size:var(--step--1)">
              Goals and results go up on our social channels first, then the full report and gallery
              land here within a couple of days.
            </p>
            <div class="row" style="margin-top:var(--space-4)">
              ${CLUB.socials.map((s) => `<a class="btn btn--glass btn--sm" href="${attr(s.href)}" rel="noopener" target="_blank">${icon(s.icon)} ${esc(s.label)}</a>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>` };
}

/* ======================= SPONSORS ======================= */
export function sponsors(d) {
  const tiers = SPONSOR_TIERS.map((t) => `<article class="tier glass glass--reading">
    <h3 class="tier__name">${esc(t.name)}</h3>
    <p style="color:var(--text-muted);font-size:var(--step--1)">${esc(t.body)}</p>
    <ul class="tier__list">${t.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
    <a class="btn btn--glass btn--sm" href="#enquire" style="margin-top:auto">Enquire</a>
  </article>`).join('');

  return { body: `
  ${pageHero({
    crumbs: trail({ label: 'Sponsors', href: '/sponsors.html' }),
    eyebrow: 'Commercial',
    title: 'Sponsor the Angels.',
    lede: 'Back a London Sunday-league club with a cause at its heart, and reach a growing audience that actually cares about it.',
  })}
  <section class="section section--flush">
    <div class="wrap wrap--wide">
      <div class="grid grid--4">
        ${statTile({ value: String(teamSummary(d.played).played), label: 'Matches a season', glass: true })}
        ${statTile({ value: String(d.galleries.reduce((a, g) => a + g.photoCount, 0)), label: 'Matchday photographs', glass: true, brand: true })}
        ${statTile({ value: String(d.squad.length), label: 'Players and staff', glass: true })}
        ${statTile({ value: CLUB.nextDivision, label: 'New division', glass: true })}
      </div>
    </div>
  </section>
  <section class="section">
    <div class="wrap wrap--wide">
      ${sectionHead({ index: '01', eyebrow: 'How it works', title: 'Ways to partner' })}
      <div class="tiers">${tiers}</div>
      <p style="margin-top:var(--space-5);font-size:var(--step--2);color:var(--text-subtle)">
        Packages are shaped around what a partner actually wants, so there is no fixed rate card.
        Tell us what you have in mind and we will come back with something specific.
      </p>
    </div>
  </section>
  <section class="section" id="enquire">
    <div class="wrap wrap--narrow">
      <div class="glass glass--lg glass--reading" style="padding:var(--space-7) var(--space-6)">
        ${sectionHead({ index: '02', eyebrow: 'Talk to us', title: 'Sponsorship enquiry' })}
        ${enquiryForm({ type: 'sponsorship', requireMessage: true, ok: 'Thank you. We will come back to you about sponsorship within a few days.' })}
      </div>
    </div>
  </section>` };
}

/* ---- Shared enquiry form -------------------------------------------
   Writes to Supabase AND posts the email alert. Both destinations matter:
   the email endpoint is a no-op until its key is set, so Supabase is what
   guarantees a lead is actually recorded. */
export function enquiryForm({ type = 'general', requireMessage = false, ok = 'Thank you. We will be in touch shortly.', showType = false } = {}) {
  return `<form class="form-grid form-grid--2" data-enquiry data-enquiry-type="${attr(type)}"
    data-enquiry-ok="${attr(ok)}"${requireMessage ? ' data-enquiry-requires-message' : ''} novalidate>
    <div class="error-summary" data-error-summary role="alert" hidden>
      <h3>Please check the form</h3>
      <ul data-error-list></ul>
    </div>
    <div class="field">
      <label class="field__label" for="ef-name-${attr(type)}">Your name <span class="field__req" aria-hidden="true">*</span></label>
      <input class="input" id="ef-name-${attr(type)}" name="name" type="text" autocomplete="name" required>
      <p class="field__error" data-error-for="name" hidden></p>
    </div>
    <div class="field">
      <label class="field__label" for="ef-email-${attr(type)}">Email <span class="field__req" aria-hidden="true">*</span></label>
      <input class="input" id="ef-email-${attr(type)}" name="email" type="email" inputmode="email" autocomplete="email" required>
      <p class="field__error" data-error-for="email" hidden></p>
    </div>
    <div class="field">
      <label class="field__label" for="ef-phone-${attr(type)}">Phone <span class="field__hint">(optional)</span></label>
      <input class="input" id="ef-phone-${attr(type)}" name="phone" type="tel" inputmode="tel" autocomplete="tel">
    </div>
    ${showType ? `<div class="field">
      <label class="field__label" for="ef-type">What is it about?</label>
      <select class="select" id="ef-type" name="enquiryType">
        ${ENQUIRY_TYPES.map((t) => `<option value="${attr(t.key)}">${esc(t.label)}</option>`).join('')}
      </select>
    </div>` : `<div class="field">
      <label class="field__label" for="ef-sub-${attr(type)}">Subject <span class="field__hint">(optional)</span></label>
      <input class="input" id="ef-sub-${attr(type)}" name="subject" type="text">
    </div>`}
    <div class="field form-grid__full">
      <label class="field__label" for="ef-msg-${attr(type)}">Message${requireMessage ? ' <span class="field__req" aria-hidden="true">*</span>' : ' <span class="field__hint">(optional)</span>'}</label>
      <textarea class="textarea" id="ef-msg-${attr(type)}" name="message"${requireMessage ? ' required' : ''}></textarea>
      <p class="field__error" data-error-for="message" hidden></p>
    </div>
    <div class="field form-grid__full">
      <label class="check" for="ef-consent-${attr(type)}">
        <input id="ef-consent-${attr(type)}" type="checkbox" name="consent" required>
        <span>I am happy for Sue’s Angels FC to contact me about this enquiry.</span>
      </label>
      <p class="field__error" data-error-for="consent" hidden></p>
    </div>
    <div class="form-grid__full row row--between">
      <button class="btn btn--primary" type="submit">Send enquiry</button>
      <p class="field__hint" data-enquiry-status role="status" aria-live="polite"></p>
    </div>
  </form>`;
}

/* ======================= JOIN ======================= */
export function join() {
  const paths = JOIN_PATHS.map((p) => `<article class="path glass glass--reading">
    <span class="path__n">${esc(p.n)}</span>
    <h3 class="path__title">${esc(p.title)}</h3>
    <p class="path__body">${esc(p.body)}</p>
    <a class="btn btn--glass btn--sm" href="#${attr(p.type)}">${esc(p.cta.label)}</a>
  </article>`).join('');

  const forms = ['trial', 'media', 'volunteer'].map((t) => {
    const meta = JOIN_PATHS.find((p) => p.type === t);
    return `<section class="section" id="${attr(t)}">
      <div class="wrap wrap--narrow">
        <div class="glass glass--lg glass--reading" style="padding:var(--space-7) var(--space-6)">
          ${sectionHead({ eyebrow: meta.n, title: esc(meta.title) })}
          <p style="color:var(--text-muted);margin-bottom:var(--space-6)">${esc(meta.body)}</p>
          ${enquiryForm({ type: t, requireMessage: true, ok: 'Thank you. We have your details and will be in touch.' })}
        </div>
      </div>
    </section>`;
  }).join('');

  return { body: `
  ${pageHero({
    crumbs: trail({ label: 'Join', href: '/join.html' }),
    eyebrow: `${esc(CLUB.nextDivision)} · New season`,
    title: 'Join the Angels.',
    lede: 'Players, media volunteers, helpers and sponsors. There is more than one way in.',
  })}
  <section class="section section--flush">
    <div class="wrap wrap--wide">
      <h2 class="sr-only">Ways to join</h2>
      <div class="paths">${paths}</div>
    </div>
  </section>
  ${forms}` };
}

/* ======================= CONTACT ======================= */
export function contact() {
  return { body: `
  ${pageHero({
    crumbs: trail({ label: 'Contact', href: '/contact.html' }),
    eyebrow: 'Get in touch',
    title: 'Contact.',
    lede: 'Trials, volunteering, media, sponsorship, or anything about the cause.',
  })}
  <section class="section section--flush">
    <div class="wrap wrap--wide">
      <div class="split split--wide-left">
        <div class="glass glass--lg glass--reading" style="padding:var(--space-7) var(--space-6)">
          <h2 class="sr-only">Send us a message</h2>
          ${enquiryForm({ type: 'general', showType: true, requireMessage: true, ok: 'Thank you. Your message has reached the club and we will reply as soon as we can.' })}
        </div>
        <div class="stack">
          <div class="panel" style="padding:var(--space-5)">
            <h3 style="font-size:var(--step-1);margin-bottom:var(--space-3)">Direct</h3>
            <p style="color:var(--text-muted);font-size:var(--step--1)">The quickest route is email. We read everything.</p>
            <a class="btn btn--glass btn--sm" href="mailto:${attr(CLUB.email)}" style="margin-top:var(--space-4)">${icon('mail')} ${esc(CLUB.email)}</a>
          </div>
          <div class="panel" style="padding:var(--space-5)">
            <h3 style="font-size:var(--step-1);margin-bottom:var(--space-3)">Where we play</h3>
            <p style="color:var(--text-muted);font-size:var(--step--1)">${icon('pin')} ${esc(CLUB.venue.name)}, ${esc(CLUB.venue.locality)}</p>
          </div>
          <div class="panel" style="padding:var(--space-5)">
            <h3 style="font-size:var(--step-1);margin-bottom:var(--space-3)">Follow</h3>
            <div class="row">
              ${CLUB.socials.map((s) => `<a class="icon-btn" href="${attr(s.href)}" rel="me noopener" target="_blank" aria-label="${attr(s.label)}">${icon(s.icon)}</a>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>` };
}

/* ======================= 404 ======================= */
export function notFound() {
  return { body: `
  <section class="section" style="padding-block:var(--space-10)">
    <div class="wrap wrap--narrow" style="text-align:center">
      <span style="display:block;width:96px;margin-inline:auto;color:var(--brand);opacity:.85">${crest()}</span>
      <p class="eyebrow" style="margin-top:var(--space-6)">404</p>
      <h1 style="font-size:var(--step-6);margin-block:var(--space-3) var(--space-4)">Off target.</h1>
      <p style="color:var(--text-muted);max-width:44ch;margin-inline:auto">
        That page does not exist. It may have moved, or the link may be wrong.
      </p>
      <div class="row" style="justify-content:center;margin-top:var(--space-7)">
        <a class="btn btn--primary" href="/">Back to the home page</a>
        <a class="btn btn--ghost" href="/results.html">Results</a>
        <a class="btn btn--ghost" href="/squad.html">Squad</a>
      </div>
    </div>
  </section>` };
}
