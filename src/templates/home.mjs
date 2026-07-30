/* Homepage. Deliberately varied composition: an asymmetric hero, an honour
   ribbon, a two-up match band, a memorial band that stands alone, an
   editorial split, a leaderboard band, then news and partners. No repeating
   grid of identical cards. */
import { esc, attr, icon, crest, sectionHead, statTile, emptyState } from '../lib/html.mjs';
import { fixtureCard, playerCard, formGuideBlock, articleCard } from '../lib/blocks.mjs';
import { CLUB } from '../lib/club.mjs';
import { fmtDate, leaderboard, teamSummary, formGuide } from '../lib/stats.mjs';

export function home(d) {
  const all = teamSummary(d.played);
  const form = formGuide(d.played, 6);
  const ourRow = d.table.find((r) => r.us);

  const latest = d.played.slice().sort((a, b) => (b.iso || '').localeCompare(a.iso || ''))[0];
  const next = d.fixtures.slice().sort((a, b) => (a.iso || '').localeCompare(b.iso || ''))[0];
  const topScorers = leaderboard(d.players, 'goals', 5);
  const news = d.articles.slice(0, 3);
  const featured = d.players.filter((p) => p.apps > 0).slice(0, 4);

  /* ---- Hero: oversized echoed wordmark + live club state ------------- */
  const hero = `<section class="hero">
    <span class="hero__crest">${crest()}</span>
    <div class="wrap wrap--wide">
      <div class="hero__grid">
        <div>
          <div class="hero__eyebrow">
            <span class="badge badge--solid">${esc(d.currentSeason)} ${ourRow ? 'Champions' : 'Season'}</span>
            <span class="eyebrow">${esc(CLUB.league)} &middot; ${esc(CLUB.division)}</span>
          </div>
          <h1 class="hero__title">
            <span class="echo">
              <span class="echo__ghost" aria-hidden="true">Unbeaten</span>
              <span class="echo__ghost" aria-hidden="true">Unbeaten</span>
              <span class="echo__ghost" aria-hidden="true">Unbeaten</span>
              Unbeaten
            </span>
            <em>Champions</em>
          </h1>
          <p class="hero__lede">
            A London Sunday-league club founded in 2025 in memory of ${esc(CLUB.memorial.name)}.
            We won ${esc(CLUB.division)} at the first attempt without losing a game, and we play
            every week for sepsis awareness.
          </p>
          <div class="hero__cta">
            <a class="btn btn--primary btn--lg" href="/champions.html">The unbeaten season ${icon('arrow')}</a>
            <a class="btn btn--glass btn--lg" href="/sepsis.html">${icon('heart')} Why we play</a>
          </div>
        </div>

        <div class="stack">
          ${next
            ? `<div><p class="eyebrow" style="margin-bottom:var(--space-3)">Next fixture</p>${fixtureCard(next, d.badges, { glass: true })}</div>`
            : `<div class="glass" style="padding:var(--space-6)">
                 <p class="eyebrow" style="margin-bottom:var(--space-2)">Next fixture</p>
                 <p class="stat__value" style="font-size:var(--step-2)">To be confirmed</p>
                 <p style="font-size:var(--step--1);color:var(--text-muted);margin-top:var(--space-2)">
                   ${esc(CLUB.nextDivision)} fixtures for the new season are published as soon as the league releases them.</p>
                 <a class="btn btn--quiet btn--sm" href="/fixtures.html" style="margin-top:var(--space-3)">All fixtures ${icon('arrow')}</a>
               </div>`}
          ${latest
            ? `<div><p class="eyebrow" style="margin-bottom:var(--space-3)">Latest result</p>${fixtureCard(latest, d.badges, { glass: true })}</div>`
            : ''}
        </div>
      </div>
    </div>
  </section>`;

  /* ---- Honour ribbon: the season in one line ------------------------- */
  const ribbonItems = [
    { v: `${all.won}`, l: 'Won' },
    { v: `${all.played}`, l: 'Played' },
    { v: `${all.goalsFor}`, l: 'Scored' },
    { v: `${all.goalsAgainst}`, l: 'Conceded' },
    { v: `${all.cleanSheets}`, l: 'Clean sheets' },
    { v: `${all.winPct}%`, l: 'Win rate' },
  ];
  const ribbon = `<section class="section section--tight section--flush">
    <div class="wrap wrap--wide">
      <div class="ribbon glass glass--pill">
        ${ribbonItems.map((r, i) => `
          ${i ? '<span class="ribbon__sep" aria-hidden="true"></span>' : ''}
          <span class="ribbon__item"><span class="ribbon__v">${esc(r.v)}</span><span class="ribbon__l">${esc(r.l)}</span></span>
        `).join('')}
        <span class="ribbon__sep" aria-hidden="true"></span>
        <span class="ribbon__item">
          <span class="ribbon__l" style="margin-right:var(--space-2)">Form</span>${formGuideBlock(form)}
        </span>
      </div>
    </div>
  </section>`;

  /* ---- The cause: quiet, centred, standing alone -------------------- */
  const memorial = `<section class="section" aria-labelledby="cause-h">
    <div class="wrap wrap--narrow">
      <div class="memorial">
        <span class="memorial__crest">${crest()}</span>
        <p class="eyebrow">Why this club exists</p>
        <h2 class="memorial__name" id="cause-h">For ${esc(CLUB.memorial.name.split(' ')[0])}.</h2>
        <p class="memorial__dates">${esc(CLUB.memorial.name)} &middot; Founded ${esc(CLUB.founded)}</p>
        <p class="memorial__body">
          Everything about this club begins with one person. We lost Sue to sepsis, and this club
          exists so her name stays part of something good, week after week. We talk openly about
          sepsis so that fewer families go through the same thing.
        </p>
        <p class="memorial__motto">&ldquo;${esc(CLUB.memorial.motto)}&rdquo;</p>
        <div class="row" style="justify-content:center;margin-top:var(--space-6)">
          <a class="btn btn--primary" href="/sepsis.html">Know the signs</a>
          <a class="btn btn--ghost" href="/about.html">Our story</a>
        </div>
      </div>
    </div>
  </section>`;

  /* ---- Editorial split: the season, told not tabulated -------------- */
  const story = `<section class="section">
    <div class="wrap wrap--wide">
      <div class="split split--wide-left">
        <div>
          ${sectionHead({ index: '01', eyebrow: 'The debut season', title: 'Eighteen played,<br>eighteen won.' })}
          <div class="prose">
            <p>Sue&rsquo;s Angels entered ${esc(CLUB.division)} of the ${esc(CLUB.league)} in
            September 2025 as a brand new club. Nine months later they finished the league season
            without a single defeat, scoring ${esc(ourRow ? ourRow.goalsFor : all.goalsFor)} goals and
            conceding ${esc(ourRow ? ourRow.goalsAgainst : all.goalsAgainst)}.</p>
            <p>Across every competition the Angels played ${esc(all.played)} matches, winning
            ${esc(all.won)} of them and keeping ${esc(all.cleanSheets)} clean sheets. The club goes
            up into ${esc(CLUB.nextDivision)} for ${esc(d.seasons.at(-1)?.name || '26/27')}.</p>
          </div>
          <div class="row" style="margin-top:var(--space-6)">
            <a class="btn btn--glass" href="/results.html">Every result ${icon('arrow')}</a>
            <a class="btn btn--quiet" href="/league.html">League table</a>
          </div>
        </div>
        <div class="grid grid--2" style="align-content:start">
          ${statTile({ value: `${all.goalsPerGame}`, label: 'Goals per game', glass: true, brand: true })}
          ${statTile({ value: `${all.concededPerGame}`, label: 'Conceded per game', glass: true })}
          ${statTile({ value: `${ourRow ? ourRow.points : all.points}`, label: 'League points', glass: true })}
          ${statTile({ value: `+${ourRow ? ourRow.goalDifference : all.goalDifference}`, label: 'Goal difference', glass: true })}
        </div>
      </div>
    </div>
  </section>`;

  /* ---- Leading scorers: a chart band, not cards -------------------- */
  const max = topScorers[0]?.goals || 1;
  const scorers = `<section class="section">
    <div class="wrap wrap--wide">
      ${sectionHead({
        index: '02', eyebrow: 'Who scored them', title: 'Leading scorers',
        action: '<a class="btn btn--ghost btn--sm" href="/stats.html">All player stats</a>',
      })}
      <div class="split">
        <div class="panel" style="padding:var(--space-6)">
          <div class="chart" role="img" aria-label="Leading scorers: ${attr(topScorers.map((p) => `${p.name} ${p.goals}`).join(', '))}">
            ${topScorers.map((p) => `<div class="chart__col">
              <span class="stat__value" style="font-size:var(--step-1)">${esc(p.goals)}</span>
              <div class="chart__bar" style="height:${Math.round((p.goals / max) * 100)}%"></div>
              <span class="chart__label truncate">${esc(p.last)}</span>
            </div>`).join('')}
          </div>
        </div>
        <div class="stack stack--sm">
          ${topScorers.map((p, i) => `<a class="honour glass" href="/players/${attr(p.slug)}.html">
            <span class="honour__mark" aria-hidden="true">${i + 1}</span>
            <div class="honour__body">
              <p class="honour__title truncate">${esc(p.name)}</p>
              <p class="honour__meta">${esc(p.goals)} goals &middot; ${esc(p.assists)} assists &middot; ${esc(p.apps)} appearances</p>
            </div>
          </a>`).join('')}
        </div>
      </div>
    </div>
  </section>`;

  /* ---- Featured players -------------------------------------------- */
  const squadBand = `<section class="section">
    <div class="wrap wrap--wide">
      ${sectionHead({
        index: '03', eyebrow: 'The first team', title: 'Meet the squad',
        action: '<a class="btn btn--ghost btn--sm" href="/squad.html">Full squad</a>',
      })}
      <div class="grid grid--3">${featured.map(playerCard).join('')}</div>
    </div>
  </section>`;

  /* ---- News -------------------------------------------------------- */
  const newsBand = news.length ? `<section class="section">
    <div class="wrap wrap--wide">
      ${sectionHead({
        index: '04', eyebrow: 'From the club', title: 'Latest news',
        action: '<a class="btn btn--ghost btn--sm" href="/news.html">All news</a>',
      })}
      <div class="grid grid--wide">${news.map((a) => articleCard(a, { glass: true })).join('')}</div>
    </div>
  </section>` : '';

  /* ---- Recruitment + sponsorship ----------------------------------- */
  const joinBand = `<section class="section">
    <div class="wrap wrap--wide">
      <div class="glass glass--xl glass--warm" style="padding:var(--space-8) var(--space-6);text-align:center">
        <p class="eyebrow">${esc(CLUB.nextDivision)} &middot; New season</p>
        <h2 style="font-size:var(--step-5);margin-block:var(--space-3) var(--space-4)">Play, volunteer,<br>or back the club.</h2>
        <p style="max-width:52ch;margin-inline:auto;color:var(--text-muted)">
          We are looking at players across every position, media volunteers who want real matchday
          work, and businesses who want to stand behind a club with a cause at its heart.
        </p>
        <div class="row" style="justify-content:center;margin-top:var(--space-6)">
          <a class="btn btn--primary btn--lg" href="/join.html">Join the Angels ${icon('arrow')}</a>
          <a class="btn btn--glass btn--lg" href="/sponsors.html">Sponsorship</a>
        </div>
      </div>
    </div>
  </section>`;

  return { body: hero + ribbon + memorial + story + scorers + squadBand + newsBand + joinBand };
}
