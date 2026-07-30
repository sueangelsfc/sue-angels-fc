/* ==========================================================================
   HOMEPAGE - matched to the approved reference composition.

   Bands: framed hero with in-frame nav, ticker, 01 club news, 02 more than a
   result (bento), 03 award winners (coverflow), 04 the campaign (dashboard),
   05 recent results, 06 the table, 07 ask the Angels, 08 pull on the shirt.

   Every figure is computed by the stats engine; nothing here is hard-coded.
   ========================================================================== */
import { esc, attr, icon, crest, crestEager, clubCrest, NAV } from '../lib/html.mjs';
import { CLUB, SPONSORS, FAQS } from '../lib/club.mjs';
import { fmtDate, leaderboard, teamSummary, formGuide } from '../lib/stats.mjs';

const rail = (n, label, right) => `<div class="xrail" aria-hidden="true">
  <span class="xrail__n">${esc(n)}</span>
  <span class="xrail__l">${esc(label)}</span>
  <span class="xrail__t"></span>
  <span class="xrail__r">${esc(right)}</span>
</div>`;

/* Heading with the brand full stop that terminates every band title. */
const head = (t) => `${esc(t)}<span class="dot">.</span>`;

export function home(d) {
  const all = teamSummary(d.played);
  const league = teamSummary(d.played.filter((m) => m.competition === CLUB.division));
  const ourRow = d.table.find((r) => r.us);
  const runnerUp = d.table.find((r) => r.pos === 2);
  const form = formGuide(d.played, 6);

  const next = d.fixtures.slice().sort((a, b) => (a.iso || '').localeCompare(b.iso || ''))[0];
  const recent = d.played.slice().sort((a, b) => (b.iso || '').localeCompare(a.iso || '')).slice(0, 7);
  const news = d.articles.slice(0, 6);
  const topScorer = leaderboard(d.players, 'goals', 1)[0];
  const awardWinners = leaderboard(d.players, 'motm', 5);
  const ordered = d.played.slice().sort((a, b) => (a.iso || '').localeCompare(b.iso || ''));
  const scored = ordered.filter((m) => m.countsGoals);

  /* ================= HERO ================= */
  const navPill = NAV.filter((i) => i.children).map((item) => {
    const id = `hxdd-${item.label.toLowerCase().replace(/\s+/g, '-')}`;
    return `<div class="hxnav__grp" data-navgroup>
      <button class="hxnav__link" type="button" aria-expanded="false" aria-controls="${id}" data-navtrigger>
        ${esc(item.label)}${icon('down')}
      </button>
      <div class="hxnav__dd glass glass--deep menu" id="${id}">
        ${item.children.map((c) => `<a class="menu__item" href="${attr(c.href)}">${esc(c.label)}</a>`).join('')}
      </div>
    </div>`;
  }).join('');

  const nextCard = next ? `
    <p class="hxc__label">Next match${next.competition ? ` · ${esc(next.competition)}` : ''}</p>
    <div class="hxc__fixture">
      <div class="hxc__side">
        <span class="hxc__crest">${next.weAreHome ? crest() : clubCrest(next.home, d.badges)}</span>
        <b class="truncate">${esc(next.weAreHome ? 'Sue’s Angels' : next.home)}</b>
        <span class="hxc__ha">Home</span>
      </div>
      <span class="hxc__vs" aria-hidden="true">v</span>
      <div class="hxc__side">
        <span class="hxc__crest">${!next.weAreHome ? crest() : clubCrest(next.away, d.badges)}</span>
        <b class="truncate">${esc(!next.weAreHome ? 'Sue’s Angels' : next.away)}</b>
        <span class="hxc__ha">Away</span>
      </div>
    </div>
    <dl class="hxc__meta">
      <div class="hxc__mi">${icon('calendar')}<div><dt>Date</dt><dd>${esc(fmtDate(next.date, { weekday: true, year: false }))}</dd></div></div>
      <div class="hxc__mi">${icon('clock')}<div><dt>Kick-off</dt><dd>${esc(next.kick || 'TBC')}</dd></div></div>
      <div class="hxc__mi">${icon('shield')}<div><dt>Fixture</dt><dd class="truncate">${esc(next.competition)}</dd></div></div>
      <div class="hxc__mi">${icon('pin')}<div><dt>Venue</dt><dd class="truncate">${esc(next.venue || 'TBC')}</dd></div></div>
    </dl>
    <div class="hxc__count">
      <span>Countdown</span>
      <strong data-countdown="${attr(next.isoDateTime || next.iso || '')}" aria-live="off">—</strong>
    </div>
    <a class="btn btn--primary btn--block" href="/fixtures.html">View fixtures</a>`
  : `
    <p class="hxc__label">Next match</p>
    <p class="hxc__tbc">To be confirmed</p>
    <p class="hxc__tbcnote">${esc(CLUB.nextDivision)} fixtures go up here as soon as the league releases them.</p>
    <dl class="hxc__meta">
      <div class="hxc__mi">${icon('shield')}<div><dt>Division</dt><dd>${esc(CLUB.nextDivision)}</dd></div></div>
      <div class="hxc__mi">${icon('trophy')}<div><dt>Last season</dt><dd>Champions</dd></div></div>
      <div class="hxc__mi">${icon('pin')}<div><dt>Home</dt><dd class="truncate">${esc(CLUB.venue.name)}</dd></div></div>
      <div class="hxc__mi">${icon('clock')}<div><dt>Kick-off</dt><dd>Sundays</dd></div></div>
    </dl>
    <a class="btn btn--primary btn--block" href="/results.html">Every result so far</a>`;

  const hero = `<section class="hx" aria-labelledby="hx-title">
    <div class="hx__frame">
      <picture>
        <source srcset="/assets/hero/kit-crest-640.webp" media="(max-width: 700px)" type="image/webp">
        <source srcset="/assets/hero/kit-crest-960.webp" media="(max-width: 1100px)" type="image/webp">
        <img class="hx__bg" src="/assets/hero/kit-crest-1344.webp" alt=""
             width="1344" height="752" fetchpriority="high" decoding="async">
      </picture>
      <div class="hx__shade" aria-hidden="true"></div>

      <div class="hx__inner">
        <header class="hxnav">
          <a class="hxnav__brand" href="/" aria-label="${attr(CLUB.name)}, home">
            <span class="hxnav__crest">${crestEager()}</span>
            <span class="hxnav__name">${esc(CLUB.name)}</span>
          </a>
          <nav class="hxnav__pill glass glass--pill" aria-label="Main">
            <a class="hxnav__link" href="/" aria-current="page">Home</a>
            ${navPill}
          </nav>
          <div class="hxnav__right">
            <a class="hxnav__join" href="/join.html">Join the club</a>
            <button class="hxnav__burger" type="button" data-mnav-open aria-expanded="false"
                    aria-controls="mobile-nav" aria-label="Open menu">
              <span class="burger__bars" aria-hidden="true"><span></span><span></span><span></span></span>
            </button>
          </div>
        </header>

        <div class="hx__body">
          <h1 class="hx__title" id="hx-title">
            <span class="hx__l1">Built in</span>
            <span class="hx__l2">her name.</span>
            <span class="hx__l3">For each other.</span>
          </h1>

          <div class="hx__foot">
            <div class="hx__left">
              <p class="hx__about">${esc(CLUB.name)} is a Sunday league football family from
                south-west London, founded in ${esc(CLUB.founded)} in memory of
                ${esc(CLUB.memorial.name)} and playing for sepsis awareness.</p>
              <p class="hx__record">
                ${icon('star', 'hx__star')}
                <b>${esc(league.won)} wins from ${esc(league.played)}</b>
                <span>${esc(CLUB.division)} Champions ${esc(d.currentSeason)}</span>
              </p>
              <div class="hx__sponsors">
                <span class="hx__sponsorlabel">Proudly backed by</span>
                <div class="hx__chips">
                  ${SPONSORS.slice(0, 4).map((s) => `<a class="hx__chip" href="/sponsors.html" aria-label="${attr(`${s.name}, ${s.tier}`)}">
                    <img src="${attr(s.logo)}" alt="${attr(s.name)}" width="118" height="36" loading="lazy" decoding="async">
                  </a>`).join('')}
                </div>
              </div>
            </div>
            <aside class="hxc glass glass--lg glass--reading" aria-label="Next match">${nextCard}</aside>
          </div>
        </div>
      </div>
    </div>
  </section>`;

  /* ================= TICKER ================= */
  const tickerItems = [
    `${CLUB.division} champions ${d.currentSeason}`,
    `Promoted to ${CLUB.nextDivision}`,
    { brand: true, text: CLUB.memorial.motto.replace(/\.$/, '') },
    `Played ${league.played}`,
    `Won ${league.won}`,
    'Unbeaten',
    `${all.goalsFor} goals in all competitions`,
  ];
  const tickerSet = tickerItems.map((t) => {
    const brand = typeof t === 'object' && t.brand;
    const text = typeof t === 'object' ? t.text : t;
    return `<span class="ticker__item${brand ? ' ticker__item--brand' : ''}">${esc(text)}</span>`;
  }).join('');
  const ticker = `<div class="ticker" aria-hidden="true">
    <div class="ticker__rail">
      <div class="ticker__set">${tickerSet}</div>
      <div class="ticker__set">${tickerSet}</div>
    </div>
  </div>`;

  /* ================= 01 CLUB NEWS ================= */
  const newsBand = news.length ? `<section class="sec" aria-labelledby="news-h">
    <div class="wrap wrap--wide">
      ${rail('01', 'Club news', `Est. ${CLUB.founded}`)}
      <div class="bhead">
        <div>
          <p class="eyebrow">Off the pitch</p>
          <h2 id="news-h">${head('Club news')}</h2>
        </div>
        <a class="plink plink--bare" href="/news.html">All news ${icon('arrow')}</a>
      </div>
      <div class="carousel">
        <button class="carousel__nav carousel__nav--prev" type="button" data-carousel-prev
                aria-label="Previous news items">${icon('chevron')}</button>
        <ul class="carousel__rail" role="list" data-carousel-rail tabindex="0" aria-label="Club news, scrollable">
          ${news.map((a) => `<li class="ncard">
            <a class="ncard__link" href="/news/${attr(a.slug)}.html">
              <span class="ncard__cover">
                ${a.cover
                  ? `<img class="ncard__photo" src="${attr(a.cover)}" alt="" width="320" height="320" loading="lazy" decoding="async">`
                  : crest('ncard__art')}
                <span class="ncard__pill">${esc(a.category)}</span>
              </span>
              <span class="ncard__title">${esc(a.title)}</span>
              <span class="ncard__meta">${esc(a.date)}</span>
            </a>
          </li>`).join('')}
        </ul>
        <button class="carousel__nav carousel__nav--next" type="button" data-carousel-next
                aria-label="More news items">${icon('chevron')}</button>
      </div>
    </div>
  </section>` : '';

  /* ================= 02 MORE THAN A RESULT ================= */
  const firstMatch = scored[0];
  const biggest = scored.slice().sort((a, b) => (b.ourGoals - b.theirGoals) - (a.ourGoals - a.theirGoals))[0];
  const lastMatch = scored[scored.length - 1];

  const whoBand = `<section class="sec" aria-labelledby="who-h">
    <div class="wrap wrap--wide">
      ${rail('02', 'More than a result', `${CLUB.nextDivision} · 26/27`)}
      <div class="who__intro">
        <div>
          <p class="eyebrow">Who we are</p>
          <h2 id="who-h">${head('More than a result')}</h2>
          <p class="who__sub">A club built in memory and driven by purpose. Champions on the pitch,
            and a football family off it.</p>
        </div>
        <a class="plink" href="/about.html">Our story ${icon('arrow')}</a>
      </div>

      <div class="bento">
        <article class="bento__card bento__card--tall">
          <img class="bento__img" src="/assets/hero/team.webp" alt="Sue’s Angels players together"
               width="640" height="800" loading="lazy" decoding="async">
          <span class="bento__shade" aria-hidden="true"></span>
          <span class="bento__pill">${icon('star')} Champions</span>
          <div class="bento__body">
            <h3 class="bento__h3">${esc(CLUB.division)} winners</h3>
            <div class="bento__tl">
              ${firstMatch ? `<div class="bento__tlrow">
                <span>${esc(fmtDate(firstMatch.date, { year: false }))}</span><em>✦</em>
                <span>First fixture</span><b>Won ${esc(firstMatch.scoreline)}</b>
              </div>` : ''}
              ${biggest ? `<div class="bento__tlrow">
                <span>${esc(fmtDate(biggest.date, { year: false }))}</span><em>✦</em>
                <span>Biggest win</span><b>Won ${esc(biggest.scoreline)}</b>
              </div>` : ''}
              ${lastMatch ? `<div class="bento__tlrow">
                <span>${esc(fmtDate(lastMatch.date, { year: false }))}</span><em>✦</em>
                <span>Season done</span><b>P${esc(league.played)} W${esc(league.won)}</b>
              </div>` : ''}
            </div>
            <a class="bento__link" href="/champions.html">The unbeaten season ${icon('arrow')}</a>
          </div>
        </article>

        <article class="bento__card">
          <span class="bento__label">${icon('star')} Community</span>
          <p class="bento__big">A football family, playing for each other every week.</p>
          <div class="bento__foot">
            <span class="bento__metatxt">South-west London</span>
            <a class="bento__link" href="/about.html">Our story ${icon('arrow')}</a>
          </div>
        </article>

        <article class="bento__card">
          <span class="bento__label">${icon('star')} Proudly backed by</span>
          <div class="bento__sponsors">
            ${SPONSORS.slice(0, 4).map((s) => `<span class="bento__sponsor">
              <img src="${attr(s.logo)}" alt="${attr(s.name)}" width="108" height="40" loading="lazy" decoding="async">
            </span>`).join('')}
          </div>
          <div class="bento__foot"><a class="bento__link" href="/sponsors.html">Partner with us ${icon('arrow')}</a></div>
        </article>

        <article class="bento__card">
          <span class="bento__label">${icon('star')} The record</span>
          <p class="bento__stat">${esc(Math.round((league.won / Math.max(league.played, 1)) * 100))}<i>%</i></p>
          <p class="bento__metatxt">Win rate · ${esc(CLUB.division)} ${esc(d.currentSeason)}</p>
        </article>

        <article class="bento__card bento__card--cause">
          <a class="bento__arrow" href="/sepsis.html" aria-label="Our cause: sepsis awareness">${icon('external')}</a>
          <span class="bento__label">${icon('heart')} Our cause</span>
          <h3 class="bento__cause-h">Sepsis awareness</h3>
          <p class="bento__metatxt">Founded in memory of ${esc(CLUB.memorial.name)}. Know the signs.</p>
          <div class="bento__foot"><a class="bento__link" href="/sepsis.html">Know the signs ${icon('arrow')}</a></div>
        </article>
      </div>
    </div>
  </section>`;

  /* ================= 03 AWARD WINNERS ================= */
  const AWARD_TITLES = ["Manager's player", "Players' player", 'Clubman of the year', 'Top scorer', 'Young player'];
  const awardsBand = awardWinners.length ? `<section class="sec" aria-labelledby="aw-h">
    <div class="wrap wrap--wide">
      ${rail('03', 'Award winners', CLUB.venue.name)}
      <div class="bhead">
        <div>
          <p class="eyebrow">${esc(d.currentSeason)} End of season</p>
          <h2 id="aw-h">${head('Award winners')}</h2>
        </div>
        <a class="plink plink--bare" href="/awards.html">All awards ${icon('arrow')}</a>
      </div>
      <div class="cf" data-coverflow>
        <button class="carousel__nav cf__nav cf__nav--prev" type="button" data-cf-prev
                aria-label="Previous award winner">${icon('chevron')}</button>
        <div class="cf__stage">
          ${awardWinners.map((p, i) => `<a class="cf__card" href="/players/${attr(p.slug)}.html"
              style="--i:${i}" data-cf-card data-active="${i === 0 ? 'true' : 'false'}">
            <span class="cf__crest">${crest()}</span>
            <span class="cf__cat">${esc(AWARD_TITLES[i] || 'Recognised')}</span>
            <span class="cf__name">${esc(p.first)}<br>${esc(p.last)}</span>
            <span class="cf__link">View profile ${icon('arrow')}</span>
          </a>`).join('')}
        </div>
        <button class="carousel__nav cf__nav cf__nav--next" type="button" data-cf-next
                aria-label="Next award winner">${icon('chevron')}</button>
      </div>
    </div>
  </section>` : '';

  /* ================= 04 THE CAMPAIGN ================= */
  const winPct = all.winPct;
  /* Radial tick gauge: 64 ticks over a 220-degree sweep, the lit count set by
     the win rate. Plain SVG lines, so no chart library ships. */
  const TICKS = 64;
  const SWEEP = 220;
  const lit = Math.round((winPct / 100) * TICKS);
  const ticks = Array.from({ length: TICKS }, (_, i) => {
    const a = (-180 + (180 - SWEEP) / 2 + (i / (TICKS - 1)) * SWEEP) * (Math.PI / 180);
    const x1 = 60 + Math.cos(a) * 40, y1 = 62 + Math.sin(a) * 40;
    const x2 = 60 + Math.cos(a) * 53, y2 = 62 + Math.sin(a) * 53;
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${i < lit ? 'var(--brand)' : 'var(--border-strong)'}" stroke-width="2" stroke-linecap="round"/>`;
  }).join('');

  const sparkFrom = (values, max, cls = '') => `<span class="spark${cls}" aria-hidden="true">${values
    .map((v) => `<span style="height:${Math.max(6, Math.round((v / Math.max(max, 1)) * 100))}%"></span>`).join('')}</span>`;
  const goalsPerMatch = scored.map((m) => m.ourGoals);

  /* Cumulative goals for and against, as two polylines. */
  const maxCum = Math.max(all.goalsFor, 1);
  let cFor = 0, cAg = 0;
  const forLine = scored.map((m, i) => {
    cFor += m.ourGoals;
    return `${((i / Math.max(scored.length - 1, 1)) * 300).toFixed(1)},${(70 - (cFor / maxCum) * 62).toFixed(1)}`;
  }).join(' ');
  const agLine = scored.map((m, i) => {
    cAg += m.theirGoals;
    return `${((i / Math.max(scored.length - 1, 1)) * 300).toFixed(1)},${(70 - (cAg / maxCum) * 62).toFixed(1)}`;
  }).join(' ');

  const campaignBand = `<section class="sec" aria-labelledby="cmp-h">
    <div class="wrap wrap--wide">
      ${rail('04', 'The campaign', 'All competitions')}
      <div class="bhead">
        <div>
          <h2 id="cmp-h">${head('The campaign')}</h2>
          <p class="who__sub">${esc(all.won)} wins in ${esc(all.played)}, unbeaten to the ${esc(CLUB.division)}
            title. The ${esc(d.currentSeason)} season, measured in full.</p>
        </div>
        <a class="plink" href="/champions.html">Champions ${icon('arrow')}</a>
      </div>

      <div class="cmp">
        <article class="cmp__card cmp__card--gauge" data-accent="brand">
          <div class="cmp__head"><span class="cmp__ico">${icon('chart')}</span><span class="cmp__tag">Win rate</span></div>
          <div class="cmp__gauge">
            <svg class="cmp__gaugesvg" viewBox="0 0 120 80" role="img"
                 aria-label="Win rate ${attr(winPct)} per cent, ${attr(all.won)} wins from ${attr(all.played)}">
              ${ticks}
            </svg>
            <span class="cmp__gaugectr"><b>${esc(winPct)}<i>%</i></b></span>
          </div>
          <p class="cmp__gaugefoot">Win rate</p>
          <div class="cmp__form">
            <span class="cmp__formlbl">Last 6</span>
            ${form.map((f) => `<span class="rform rform--${f.outcome.toLowerCase()}">${esc(f.outcome)}</span>`).join('')}
          </div>
          <span class="cmp__pill">${esc(all.won)}W · ${esc(all.drawn)}D · ${esc(all.lost)}L · all comps</span>
        </article>

        <article class="cmp__card">
          <div class="cmp__head"><span class="cmp__ico">${icon('calendar')}</span><span class="cmp__tag">Played</span></div>
          <p class="cmp__num">${esc(all.played)}</p>
          <p class="cmp__lbl">Matches, all competitions</p>
          <div class="cmp__wdl" role="img" aria-label="${attr(`${all.won} won, ${all.drawn} drawn, ${all.lost} lost`)}">
            <span class="cmp__wdl-w" style="flex:${all.won}"></span>
            ${all.drawn ? `<span class="cmp__wdl-d" style="flex:${all.drawn}"></span>` : ''}
            <span class="cmp__wdl-l" style="flex:${Math.max(all.lost, 0.4)}"></span>
          </div>
          <p class="cmp__key">
            <span class="k-w"><i></i>${esc(all.won)} W</span>
            <span><i></i>${esc(all.drawn)} D</span>
            <span class="k-l"><i></i>${esc(all.lost)} L</span>
          </p>
        </article>

        <article class="cmp__card" data-accent="warm">
          <div class="cmp__head"><span class="cmp__ico">${icon('trophy')}</span><span class="cmp__tag">Won</span></div>
          <p class="cmp__num">${esc(all.won)}</p>
          <p class="cmp__lbl">Wins from ${esc(all.played)}</p>
          ${sparkFrom(scored.map((m) => (m.outcome === 'W' ? 1 : 0.25)), 1)}
        </article>

        <article class="cmp__card" data-accent="brand">
          <div class="cmp__head"><span class="cmp__ico">${icon('shield')}</span><span class="cmp__tag">Goals for</span></div>
          <p class="cmp__num cmp__num--brand">${esc(all.goalsFor)}</p>
          <p class="cmp__lbl">${esc(all.goalsPerGame)} a game · ${esc(all.goalsAgainst)} conceded</p>
          ${sparkFrom(goalsPerMatch, Math.max(...goalsPerMatch, 1))}
        </article>

        <article class="cmp__card cmp__card--wide" data-accent="warm">
          <div class="cmp__head"><span class="cmp__ico">${icon('chart')}</span><span class="cmp__tag">Goal difference</span></div>
          <p class="cmp__num">+${esc(all.goalDifference)}</p>
          <p class="cmp__lbl">Goals scored against goals conceded, cumulative</p>
          <p class="cmp__key">
            <span class="k-w"><i></i>${esc(all.goalsFor)} for</span>
            <span class="k-l"><i></i>${esc(all.goalsAgainst)} against</span>
          </p>
          <div class="cmp__line">
            <svg class="cmp__linesvg" viewBox="0 0 300 78" role="img"
                 aria-label="Cumulative goals: ${attr(all.goalsFor)} for, ${attr(all.goalsAgainst)} against">
              <polyline points="${forLine}" fill="none" stroke="var(--brand)" stroke-width="2.4" stroke-linejoin="round"/>
              <polyline points="${agLine}" fill="none" stroke="var(--brand-900)" stroke-width="2.4" stroke-linejoin="round"/>
            </svg>
          </div>
        </article>

        <article class="cmp__card" data-accent="cool">
          <div class="cmp__head"><span class="cmp__ico">${icon('shield')}</span><span class="cmp__tag">Clean sheets</span></div>
          <p class="cmp__num">${esc(all.cleanSheets)}</p>
          <p class="cmp__lbl">No goal conceded · ${esc(Math.round((all.cleanSheets / Math.max(all.onGoalRecord, 1)) * 100))}% of games</p>
          ${sparkFrom(scored.map((m) => (m.theirGoals === 0 ? 1 : 0.22)), 1, ' spark--cool')}
        </article>

        ${topScorer ? `<article class="cmp__card cmp__card--wide" data-accent="brand">
          <div class="cmp__head"><span class="cmp__ico">${icon('star')}</span><span class="cmp__tag">Leading scorer</span></div>
          <p class="cmp__num">${esc(topScorer.goals)}</p>
          <p class="cmp__lbl">${esc(topScorer.name)} · ${esc(topScorer.assists)} assists in ${esc(topScorer.apps)} appearances</p>
          <div class="bento__foot"><a class="bento__link" href="/players/${attr(topScorer.slug)}.html">View profile ${icon('arrow')}</a></div>
        </article>` : ''}
      </div>
    </div>
  </section>`;

  /* ================= 05 RECENT RESULTS ================= */
  const resultRow = (name, isUs, score) => `<div class="rcard__row">
    ${isUs ? `<span class="crest crest--sm">${crest()}</span>` : clubCrest(name, d.badges, 'crest--sm')}
    <span class="rcard__name truncate">${esc(isUs ? 'Sue’s Angels' : name)}</span>
    <span class="rcard__score${isUs ? ' rcard__score--us' : ''}">${esc(score)}</span>
  </div>`;

  const resultsBand = `<section class="sec" aria-labelledby="rl-h">
    <div class="wrap wrap--wide">
      ${rail('05', 'Recent results', `P${league.played} W${league.won} · Unbeaten`)}
      <div class="bhead bhead--centre">
        <div><h2 id="rl-h">${head('Recent results')}</h2></div>
        <a class="plink" href="/results.html">All results ${icon('arrow')}</a>
      </div>
      <div class="carousel">
        <button class="carousel__nav carousel__nav--prev" type="button" data-carousel-prev
                aria-label="Previous results">${icon('chevron')}</button>
        <ul class="carousel__rail" role="list" data-carousel-rail tabindex="0" aria-label="Recent results, scrollable">
          ${recent.map((m) => `<li class="rcard">
            <a class="rcard__inner" href="/matches/${attr(m.slug)}.html" aria-label="${attr(m.title)}">
              <div class="rcard__top">
                <span class="rchip${m.outcome === 'W' ? ' rchip--w' : ''}">${esc(m.outcome || '-')}</span>
                <span class="rcard__date">${esc(fmtDate(m.date, { year: false }))}</span>
              </div>
              <div>
                ${resultRow(m.home, m.weAreHome, m.isWalkover ? 'W/O' : m.hs)}
                ${resultRow(m.away, !m.weAreHome, m.isWalkover ? '—' : m.as)}
              </div>
              <div class="rcard__foot">${esc(m.competition)} · ${esc(m.weAreHome ? 'Home' : 'Away')}</div>
            </a>
          </li>`).join('')}
        </ul>
        <button class="carousel__nav carousel__nav--next" type="button" data-carousel-next
                aria-label="More results">${icon('chevron')}</button>
        <div class="carousel__track" aria-hidden="true"><span class="carousel__bar" data-carousel-bar></span></div>
      </div>
    </div>
  </section>`;

  /* ================= 06 THE TABLE =================
     The visual rows are aria-hidden and paired with a screen-reader table, so
     the custom layout never costs a screen reader the real tabular semantics. */
  const tableBand = d.table.length ? `<section class="sec" aria-labelledby="tbl-h">
    <div class="wrap wrap--wide">
      ${rail('06', 'The table', `Est. ${CLUB.founded}`)}
      <div class="bhead bhead--centre">
        <div><h2 id="tbl-h">${head('The table')}</h2></div>
        <a class="plink" href="/league.html">Full table ${icon('arrow')}</a>
      </div>
      <div class="ltbl">
        <div class="ltbl__row ltbl__row--head" aria-hidden="true">
          <span>#</span><span>Club</span>
          <span class="ltbl__num ltbl__hide">P</span>
          <span class="ltbl__num ltbl__hide">W</span>
          <span class="ltbl__num">GD</span>
          <span class="ltbl__num">Pts</span>
        </div>
        ${d.table.slice(0, 6).map((r) => `<div class="ltbl__row${r.us ? ' ltbl__row--us' : r.pos === 2 ? ' ltbl__row--runner' : ''}" aria-hidden="true">
          <span>${esc(r.pos)}</span>
          <span class="ltbl__club">${clubCrest(r.club, d.badges, 'crest--sm')}<span class="truncate">${esc(r.club)}</span></span>
          <span class="ltbl__num ltbl__hide">${esc(r.played)}</span>
          <span class="ltbl__num ltbl__hide">${esc(r.won)}</span>
          <span class="ltbl__num">${r.goalDifference > 0 ? '+' : ''}${esc(r.goalDifference)}</span>
          <span class="ltbl__num ltbl__num--pts">${esc(r.points)}</span>
        </div>`).join('')}
      </div>
      <table class="sr-only">
        <caption>${esc(CLUB.division)} final standings, ${esc(d.currentSeason)}</caption>
        <thead><tr><th scope="col">Position</th><th scope="col">Club</th><th scope="col">Played</th>
          <th scope="col">Won</th><th scope="col">Goal difference</th><th scope="col">Points</th></tr></thead>
        <tbody>${d.table.map((r) => `<tr><td>${esc(r.pos)}</td><th scope="row">${esc(r.club)}</th>
          <td>${esc(r.played)}</td><td>${esc(r.won)}</td>
          <td>${r.goalDifference > 0 ? '+' : ''}${esc(r.goalDifference)}</td><td>${esc(r.points)}</td></tr>`).join('')}</tbody>
      </table>
      ${ourRow && runnerUp ? `<p class="bento__metatxt" style="margin-top:var(--space-4)">Finished
        ${esc(ourRow.points - runnerUp.points)} points clear of ${esc(runnerUp.club)} without losing a league game.</p>` : ''}
    </div>
  </section>` : '';

  /* ================= 07 ASK THE ANGELS ================= */
  const faqBand = `<section class="sec" aria-labelledby="faq-h">
    <div class="wrap">
      ${rail('07', 'Ask the Angels', `${CLUB.nextDivision} · 26/27`)}
      <div class="bhead"><div><h2 id="faq-h">${head('Ask the Angels')}</h2></div></div>
      <div class="faq">
        ${FAQS.map((f) => `<details class="faq__item">
          <summary>${esc(f.q)}<span class="faq__ico" aria-hidden="true">+</span></summary>
          <div class="faq__body"><p>${esc(f.a)}</p></div>
        </details>`).join('')}
      </div>
    </div>
  </section>`;

  /* ================= 08 PULL ON THE SHIRT ================= */
  const ctaBand = `<section class="sec" aria-labelledby="cta-h">
    <div class="wrap wrap--wide">
      ${rail('08', 'Pull on the shirt', CLUB.venue.name)}
      <div class="cta2 glass glass--xl glass--reading">
        <span class="cta2__star" aria-hidden="true">${icon('star')}</span>
        <span class="cta2__crest" aria-hidden="true">${crest()}</span>
        <p class="eyebrow cta2__eyebrow">26/27 · The next chapter</p>
        <h2 id="cta-h">${head('Pull on the shirt')}</h2>
        <p class="cta2__sub">Trials, volunteering, media and sponsorship. All open for the new season.</p>
        <div class="cta2__btns">
          <a class="btn btn--primary btn--lg" href="/join.html">Join the club ${icon('arrow')}</a>
          <a class="btn btn--glass btn--lg" href="/contact.html">Get in touch</a>
          <a class="btn btn--glass btn--lg" href="/sponsors.html">Partner with us</a>
        </div>
      </div>
    </div>
  </section>`;

  return {
    body: hero + ticker + newsBand + whoBand + awardsBand + campaignBand + resultsBand + tableBand + faqBand + ctaBand,
    bodyClass: 'is-home',
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
