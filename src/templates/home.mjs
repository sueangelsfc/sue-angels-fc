/* ==========================================================================
   HOMEPAGE
   Follows the approved reference composition: framed photographic hero with
   the next-match card and partner strip, then club news, a bento "more than
   a result" band, award winners, the campaign in gauges, recent results, the
   table, an FAQ and a closing call to action. Numbered rails separate bands.

   Improved over the reference in five ways:
     1. every figure is computed by the stats engine, none are hard-coded
     2. the 2.1MB hero PNG is a responsive WebP set (197KB / 112KB / 44KB)
     3. carousels scroll-snap so they work with no JavaScript at all
     4. the FAQ is native <details>, keyboard accessible and FAQPage-schema'd
     5. the gauge carries a real text alternative rather than being SVG-only
   ========================================================================== */
import { esc, attr, icon, crest, statTile } from '../lib/html.mjs';
import { fixtureCard, formGuideBlock } from '../lib/blocks.mjs';
import { CLUB, SPONSORS, FAQS } from '../lib/club.mjs';
import { fmtDate, leaderboard, teamSummary, formGuide } from '../lib/stats.mjs';

/* A numbered rail marking each band, like a match programme's running order */
const rail = (n, label, right) => `<div class="xrail" aria-hidden="true">
  <span class="xrail__n">${esc(n)}</span>
  <span class="xrail__l">${esc(label)}</span>
  <span class="xrail__t"></span>
  <span class="xrail__r">${esc(right)}</span>
</div>`;

export function home(d) {
  const all = teamSummary(d.played);
  const league = teamSummary(d.played.filter((m) => m.competition === CLUB.division));
  const ourRow = d.table.find((r) => r.us);
  const form = formGuide(d.played, 6);

  const next = d.fixtures.slice().sort((a, b) => (a.iso || '').localeCompare(b.iso || ''))[0];
  const recent = d.played.slice().sort((a, b) => (b.iso || '').localeCompare(a.iso || '')).slice(0, 4);
  const news = d.articles.slice(0, 5);
  const topScorer = leaderboard(d.players, 'goals', 1)[0];
  const awardWinners = d.players.filter((p) => p.motm > 0).slice(0, 7);

  /* ================= HERO ================= */
  const nextCard = next ? `
    <p class="hxc__label">Next match${next.competition ? ` &middot; ${esc(next.competition)}` : ''}</p>
    <div class="hxc__fixture">
      <div class="hxc__side">
        <span class="hxc__crest">${next.weAreHome ? crest() : ''}</span>
        <b class="truncate">${esc(next.weAreHome ? 'Sue’s Angels' : next.home)}</b>
        <span class="hxc__ha">Home</span>
      </div>
      <span class="hxc__vs" aria-hidden="true">v</span>
      <div class="hxc__side">
        <span class="hxc__crest">${!next.weAreHome ? crest() : ''}</span>
        <b class="truncate">${esc(!next.weAreHome ? 'Sue’s Angels' : next.away)}</b>
        <span class="hxc__ha">Away</span>
      </div>
    </div>
    <dl class="hxc__meta">
      <div class="hxc__mi"><dt>Date</dt><dd>${esc(fmtDate(next.date, { weekday: true }))}</dd></div>
      <div class="hxc__mi"><dt>Kick-off</dt><dd>${esc(next.kick || 'TBC')}</dd></div>
      <div class="hxc__mi"><dt>Fixture</dt><dd class="truncate">${esc(next.competition)}</dd></div>
      <div class="hxc__mi"><dt>Venue</dt><dd class="truncate">${esc(next.venue || 'TBC')}</dd></div>
    </dl>
    <div class="hxc__count">
      <span>Countdown</span>
      <strong data-countdown="${attr(next.isoDateTime || next.iso || '')}" aria-live="off">&mdash;</strong>
    </div>
    <a class="btn btn--primary btn--block" href="/fixtures.html">View fixtures</a>`
  : `
    <p class="hxc__label">Next match</p>
    <p class="hxc__tbc">To be confirmed</p>
    <p class="hxc__tbcnote">${esc(CLUB.nextDivision)} fixtures go up here as soon as the league releases them.</p>
    <dl class="hxc__meta">
      <div class="hxc__mi"><dt>Division</dt><dd>${esc(CLUB.nextDivision)}</dd></div>
      <div class="hxc__mi"><dt>Last season</dt><dd>${esc(CLUB.division)} champions</dd></div>
      <div class="hxc__mi"><dt>Home</dt><dd class="truncate">${esc(CLUB.venue.name)}</dd></div>
      <div class="hxc__mi"><dt>Kick-off</dt><dd>Sunday mornings</dd></div>
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
        <h1 class="hx__title" id="hx-title">
          <span class="hx__l1">Built in</span>
          <span class="hx__l2">her name.</span>
          <span class="hx__l3">For each other.</span>
        </h1>

        <div class="hx__foot">
          <div class="hx__left">
            <p class="hx__about">${esc(CLUB.name)} is a Sunday league football family from
              ${esc(CLUB.region)}, founded in ${esc(CLUB.founded)} in memory of
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
                  <img src="${attr(s.logo)}" alt="${attr(s.name)}" loading="lazy" decoding="async">
                </a>`).join('')}
              </div>
            </div>
          </div>
          <aside class="hxc glass glass--lg" aria-label="Next match">${nextCard}</aside>
        </div>
      </div>
    </div>
  </section>`;

  /* ================= CLUB NEWS ================= */
  const newsBand = news.length ? `<section class="sec sec--news" aria-labelledby="news-h">
    <div class="wrap wrap--wide">
      ${rail('01', 'Club news', `Est. ${CLUB.founded}`)}
      <div class="bhead">
        <div>
          <p class="eyebrow">Off the pitch</p>
          <h2 id="news-h">Club news.</h2>
        </div>
        <a class="btn btn--ghost btn--sm" href="/news.html">All news</a>
      </div>
      <div class="carousel">
        <button class="carousel__nav carousel__nav--prev icon-btn icon-btn--glass" type="button"
                data-carousel-prev aria-label="Previous news items">${icon('chevron')}</button>
        <ul class="carousel__rail" role="list" data-carousel-rail tabindex="0"
            aria-label="Club news, scrollable">
          ${news.map((a) => `<li class="ncard">
            <a class="ncard__link" href="/news/${attr(a.slug)}.html">
              <span class="ncard__cover">
                ${a.cover
                  ? `<img src="${attr(a.cover)}" alt="" width="420" height="236" loading="lazy" decoding="async">`
                  : `<span class="ncard__nocover">${crest()}</span>`}
                <span class="ncard__pill">${esc(a.category)}</span>
              </span>
              <span class="ncard__title">${esc(a.title)}</span>
              <span class="ncard__meta">${esc(a.date)}</span>
            </a>
          </li>`).join('')}
        </ul>
        <button class="carousel__nav carousel__nav--next icon-btn icon-btn--glass" type="button"
                data-carousel-next aria-label="More news items">${icon('chevron')}</button>
      </div>
    </div>
  </section>` : '';

  /* ================= MORE THAN A RESULT (bento) ================= */
  const whoBand = `<section class="sec sec--who" aria-labelledby="who-h">
    <div class="wrap wrap--wide">
      ${rail('02', 'More than a result', `${CLUB.nextDivision} · 26/27`)}
      <div class="who__intro">
        <div>
          <p class="eyebrow">Who we are</p>
          <h2 id="who-h">More than a result.</h2>
        </div>
        <p class="who__sub">A club built for one person, playing for everyone who has lost
          someone to sepsis. The football matters. It is not the only thing that does.</p>
      </div>

      <div class="bento">
        <article class="bento__card bento__card--tall glass">
          <img class="bento__img" src="/assets/hero/team.webp" alt="Sue&rsquo;s Angels players together"
               width="640" height="800" loading="lazy" decoding="async">
          <span class="bento__shade" aria-hidden="true"></span>
          <div class="bento__body">
            <span class="bento__label">${esc(CLUB.division)} winners</span>
            <h3 class="bento__h3">Champions at the first attempt.</h3>
            <dl class="bento__table">
              <div><dt>Played</dt><dd>${esc(league.played)}</dd></div>
              <div><dt>Won</dt><dd>${esc(league.won)}</dd></div>
              <div><dt>Goals</dt><dd>${esc(league.goalsFor)}&ndash;${esc(league.goalsAgainst)}</dd></div>
              <div><dt>Points</dt><dd>${esc(ourRow?.points ?? league.points)}</dd></div>
            </dl>
            <a class="bento__link" href="/champions.html">The unbeaten season ${icon('arrow')}</a>
          </div>
        </article>

        <article class="bento__card bento__card--text glass glass--warm">
          <span class="bento__label">Sepsis awareness</span>
          <blockquote class="bento__quote">&ldquo;${esc(CLUB.memorial.motto)}&rdquo;</blockquote>
          <p class="bento__metatxt">We lost Sue to sepsis. Around 48,000 lives are lost to it in
            the UK every year, and spotting it early is what makes the difference. That is why we
            keep talking about it.</p>
          <a class="bento__link" href="/sepsis.html">Know the signs ${icon('arrow')}</a>
        </article>

        <article class="bento__card bento__card--stat glass">
          <span class="bento__glow" aria-hidden="true"></span>
          <span class="bento__label">Since ${esc(CLUB.founded)}</span>
          <p class="bento__stat">${esc(all.goalsFor)}</p>
          <p class="bento__statlbl">goals in ${esc(all.played)} matches</p>
          <div class="bento__form">
            <span class="eyebrow eyebrow--muted">Recent form</span>
            ${formGuideBlock(form)}
          </div>
        </article>
      </div>
    </div>
  </section>`;

  /* ================= AWARD WINNERS ================= */
  const awardsBand = awardWinners.length ? `<section class="sec sec--awards" aria-labelledby="aw-h">
    <div class="wrap wrap--wide">
      ${rail('03', 'Award winners', `${d.currentSeason} End of season`)}
      <div class="bhead">
        <div>
          <p class="eyebrow">${esc(d.currentSeason)} End of season</p>
          <h2 id="aw-h">Award winners.</h2>
        </div>
        <a class="btn btn--ghost btn--sm" href="/awards.html">All awards</a>
      </div>
      <div class="carousel">
        <button class="carousel__nav carousel__nav--prev icon-btn icon-btn--glass" type="button"
                data-carousel-prev aria-label="Previous award winners">${icon('chevron')}</button>
        <ul class="carousel__rail carousel__rail--cards" role="list" data-carousel-rail tabindex="0"
            aria-label="Award winners, scrollable">
          ${awardWinners.map((p) => {
            const initials = `${(p.first || '').charAt(0)}${(p.last || '').charAt(0)}`.toUpperCase();
            return `<li class="awc">
              <a class="awc__link" href="/players/${attr(p.slug)}.html">
                <span class="awc__photo">
                  ${p.hasPhoto
                    ? `<img src="/media/players/${attr(p.num)}.webp" alt="" width="300" height="400" loading="lazy" decoding="async">`
                    : `<span class="awc__initials" aria-hidden="true">${esc(initials)}</span>`}
                  <span class="awc__grad" aria-hidden="true"></span>
                  <span class="awc__num" aria-hidden="true">${esc(p.num)}</span>
                </span>
                <span class="awc__body">
                  <span class="awc__cat">${esc(p.motm)} Player of the Match ${p.motm === 1 ? 'award' : 'awards'}</span>
                  <span class="awc__name">${esc(p.first)}<br>${esc(p.last)}</span>
                  <span class="awc__line">${esc(p.goals)}G &middot; ${esc(p.assists)}A &middot; ${esc(p.apps)} apps</span>
                </span>
              </a>
            </li>`;
          }).join('')}
        </ul>
        <button class="carousel__nav carousel__nav--next icon-btn icon-btn--glass" type="button"
                data-carousel-next aria-label="More award winners">${icon('chevron')}</button>
      </div>
    </div>
  </section>` : '';

  /* ================= THE CAMPAIGN ================= */
  const winPct = all.winPct;
  const circ = 2 * Math.PI * 52;
  const dash = ((winPct / 100) * circ).toFixed(1);

  const campaignBand = `<section class="sec sec--campaign" aria-labelledby="cmp-h">
    <div class="wrap wrap--wide">
      ${rail('04', 'The campaign', `All competitions · ${d.currentSeason}`)}
      <div class="bhead">
        <div>
          <p class="eyebrow">By the numbers</p>
          <h2 id="cmp-h">The campaign.</h2>
        </div>
        <a class="btn btn--ghost btn--sm" href="/records.html">Club records</a>
      </div>

      <div class="cmp">
        <article class="cmp__card cmp__card--gauge glass">
          <p class="cmp__tag">Win rate</p>
          <div class="cmp__gauge">
            <svg viewBox="0 0 120 120" class="cmp__gaugesvg" role="img"
                 aria-label="Win rate ${attr(winPct)} per cent, from ${attr(all.won)} wins in ${attr(all.played)} matches">
              <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border-strong)" stroke-width="9"></circle>
              <circle cx="60" cy="60" r="52" fill="none" stroke="var(--brand)" stroke-width="9"
                      stroke-linecap="round" stroke-dasharray="${dash} ${circ.toFixed(1)}"
                      transform="rotate(-90 60 60)"></circle>
            </svg>
            <span class="cmp__gaugectr"><b>${esc(winPct)}<i>%</i></b></span>
          </div>
          <p class="cmp__gaugefoot">${esc(all.won)} wins in ${esc(all.played)} matches</p>
        </article>

        <article class="cmp__card glass">
          <p class="cmp__tag">Played</p>
          <p class="cmp__num">${esc(all.played)}</p>
          <p class="cmp__lbl">matches across ${esc(new Set(d.played.map((m) => m.competition)).size)} competitions</p>
          <div class="cmp__wdl" role="img"
               aria-label="${attr(`${all.won} won, ${all.drawn} drawn, ${all.lost} lost`)}">
            <span class="cmp__wdl-w" style="flex:${all.won}"></span>
            <span class="cmp__wdl-d" style="flex:${all.drawn}"></span>
            <span class="cmp__wdl-l" style="flex:${all.lost}"></span>
          </div>
          <p class="cmp__wdllbl">
            <span>${esc(all.won)}W</span><span>${esc(all.drawn)}D</span><span>${esc(all.lost)}L</span>
          </p>
        </article>

        <article class="cmp__card glass">
          <p class="cmp__tag">Scored</p>
          <p class="cmp__num">${esc(all.goalsFor)}</p>
          <p class="cmp__lbl">${esc(all.goalsPerGame)} a game</p>
          <p class="cmp__foot2">Conceded ${esc(all.goalsAgainst)} &middot; ${esc(all.concededPerGame)} a game</p>
        </article>

        <article class="cmp__card glass">
          <p class="cmp__tag">Clean sheets</p>
          <p class="cmp__num">${esc(all.cleanSheets)}</p>
          <p class="cmp__lbl">from ${esc(all.onGoalRecord)} matches with a goal record</p>
          <p class="cmp__foot2">Goal difference +${esc(all.goalDifference)}</p>
        </article>

        ${topScorer ? `<article class="cmp__card cmp__card--wide glass glass--warm">
          <p class="cmp__tag">Leading scorer</p>
          <div class="cmp__player">
            <div>
              <p class="cmp__pname">${esc(topScorer.name)}</p>
              <p class="cmp__lbl">${esc(topScorer.goals)} goals and ${esc(topScorer.assists)} assists in ${esc(topScorer.apps)} appearances</p>
            </div>
            <a class="btn btn--glass btn--sm" href="/players/${attr(topScorer.slug)}.html">Profile</a>
          </div>
        </article>` : ''}
      </div>
    </div>
  </section>`;

  /* ================= RECENT RESULTS ================= */
  const resultsBand = `<section class="sec sec--results" aria-labelledby="rl-h">
    <div class="wrap wrap--wide">
      ${rail('05', 'Recent results', `${all.played} played`)}
      <div class="bhead">
        <div>
          <p class="eyebrow">Matchday</p>
          <h2 id="rl-h">Recent results.</h2>
        </div>
        <a class="btn btn--ghost btn--sm" href="/results.html">All results</a>
      </div>
      <div class="grid grid--wide">
        ${recent.map((m) => fixtureCard(m, d.badges, { glass: true })).join('')}
      </div>
    </div>
  </section>`;

  /* ================= THE TABLE ================= */
  const runnerUp = d.table.find((r) => r.pos === 2);
  const tableBand = d.table.length ? `<section class="sec sec--table" aria-labelledby="tbl-h">
    <div class="wrap wrap--wide">
      ${rail('06', 'The table', `${CLUB.division} · ${d.currentSeason}`)}
      <div class="bhead">
        <div>
          <p class="eyebrow">How it finished</p>
          <h2 id="tbl-h">The table.</h2>
        </div>
        <a class="btn btn--ghost btn--sm" href="/league.html">Full table</a>
      </div>
      <div class="table-wrap scroll-x">
        <table class="data">
          <caption>${esc(CLUB.division)} final standings, ${esc(d.currentSeason)}</caption>
          <thead><tr>
            <th scope="col"><abbr title="Position">Pos</abbr></th>
            <th scope="col">Club</th>
            <th scope="col"><abbr title="Played">Pl</abbr></th>
            <th scope="col"><abbr title="Won">W</abbr></th>
            <th scope="col"><abbr title="Goal difference">GD</abbr></th>
            <th scope="col"><abbr title="Points">Pts</abbr></th>
          </tr></thead>
          <tbody>
            ${d.table.slice(0, 6).map((r) => `<tr${r.us ? ' data-us="true"' : ''}>
              <td>${esc(r.pos)}</td>
              <th scope="row" class="cell-club">${esc(r.club)}</th>
              <td>${esc(r.played)}</td>
              <td>${esc(r.won)}</td>
              <td>${r.goalDifference > 0 ? '+' : ''}${esc(r.goalDifference)}</td>
              <td><strong>${esc(r.points)}</strong></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      ${ourRow && runnerUp ? `<p class="tbl__note">Finished ${esc(ourRow.points - runnerUp.points)} points clear of
        ${esc(runnerUp.club)} without losing a league game.</p>` : ''}
    </div>
  </section>` : '';

  /* ================= FAQ =================
     Native <details> so it is keyboard accessible and works with no JS. */
  const faqBand = `<section class="sec sec--faq" aria-labelledby="faq-h">
    <div class="wrap wrap--narrow">
      ${rail('07', 'Ask the Angels', 'Common questions')}
      <div class="bhead">
        <div>
          <p class="eyebrow">Questions</p>
          <h2 id="faq-h">Ask the Angels.</h2>
        </div>
      </div>
      <div class="faq">
        ${FAQS.map((f) => `<details class="acc">
          <summary>${esc(f.q)}</summary>
          <div class="acc__body"><p>${esc(f.a)}</p></div>
        </details>`).join('')}
      </div>
    </div>
  </section>`;

  /* ================= CLOSING CTA ================= */
  const ctaBand = `<section class="sec sec--cta" aria-labelledby="cta-h">
    <div class="wrap wrap--wide">
      <div class="cta2 glass glass--xl glass--warm">
        <span class="cta2__glow" aria-hidden="true"></span>
        <span class="cta2__badge">${crest()}</span>
        <p class="eyebrow">${esc(CLUB.nextDivision)} &middot; New season</p>
        <h2 id="cta-h">Pull on the shirt.</h2>
        <p class="cta2__sub">We are looking at players across every position, media volunteers who
          want real matchday work, and partners who want to stand behind a club with a cause at
          its heart.</p>
        <div class="cta2__btns">
          <a class="btn btn--primary btn--lg" href="/join.html">Join the club ${icon('arrow')}</a>
          <a class="btn btn--glass btn--lg" href="/sponsors.html">Sponsorship</a>
        </div>
      </div>
    </div>
  </section>`;

  return {
    body: hero + newsBand + whoBand + awardsBand + campaignBand + resultsBand + tableBand + faqBand + ctaBand,
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
