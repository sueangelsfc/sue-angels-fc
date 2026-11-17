/* ==========================================================================
   A GROUND'S OWN PAGE  (/grounds/<slug>.html) and the index (/grounds.html)

   Who gets one, and why, is `groundPages()` in src/lib/grounds.mjs.

   THE ADDRESS IS THE POINT AND IT IS MOSTLY MISSING. Fourteen of the fifteen
   grounds carry no address, and the honest page says so and names the screen
   that fills it, rather than pointing a map search at a bare name that may
   land in another county. A directions link is offered only where the club
   has recorded enough to aim it.
   ========================================================================== */
import { esc, attr } from '../lib/html.mjs';
import { CLUB } from '../lib/club.mjs';
import { fmtDate } from '../lib/stats.mjs';
import { siteFooter, sitePreMain, siteHeader } from './home.mjs';
import { sourceNote } from '../lib/blocks.mjs';

const ARROW = '<span aria-hidden="true">→</span>';

const rail = (n, label, ref) => `<div class="xrail" aria-hidden="true">
      <span class="xrail__l"><span class="xrail__n">${esc(String(n).padStart(2, '0'))}</span><span class="xrail__t">${esc(label)}</span></span>
      <span class="xrail__r">${esc(ref)}</span>
    </div>`;

const tile = (b, l) => `<li><b>${esc(b)}</b><span>${esc(l)}</span></li>`;
const mapHref = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

export function groundPage(g, d) {
  const s = g.summary;
  const played = s.played > 0;

  /* WHERE THE CLUB STANDS TO THIS GROUND, in the words a player would use.
     Counted, never assumed: nine of nine at Meadhurst are home and four of
     four at Clapham Common are away, and "the home ground" is a claim. */
  const standing = g.home && !g.away ? 'A home ground.'
    : g.away && !g.home ? 'An away ground.'
      : g.home && g.away ? `${g.home} ${g.home === 1 ? 'match' : 'matches'} at home here, ${g.away} away.`
        : '';

  const hero = `<section class="sec gr-hero" aria-labelledby="gr-h">
      <div class="wrap">
        ${rail(1, 'Ground', played ? `${s.played} ${s.played === 1 ? 'match' : 'matches'}` : 'Still to come')}
        <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> Where we play</p>
        <h1 class="h1b" id="gr-h">${esc(g.name)}<span class="volt">.</span></h1>
        <p class="gr-lede">${played
    ? `${esc(CLUB.name)} have played here ${s.played === 1 ? 'once' : `${s.played} times`}${s.won ? `, winning ${s.won}` : ''}. ${esc(standing)}`
    : `${esc(CLUB.name)} have a fixture here and have not played here before.`}</p>
        <p class="gr-btns"><a class="btn btn--ghost" href="/grounds.html">Every ground ${ARROW}</a></p>
      </div>
    </section>`;

  /* ---- Getting there ----
     The one band that can be honestly empty, and it says which it is. */
  const hasAddress = !!g.address;
  const travelBand = `<section class="sec gr-travel" id="getting-there" aria-labelledby="gr-tr-h">
      <div class="wrap">
        ${rail(2, 'Getting there', hasAddress ? 'Address on record' : 'Address not recorded')}
        <h2 class="h2 rv" id="gr-tr-h">Getting <span class="volt">there.</span></h2>
        ${hasAddress ? `<ul class="gr-lines rv">
          <li><i>Address</i><b>${esc(g.address)}</b></li>
          ${g.parking ? `<li><i>Parking</i><b>${esc(g.parking)}</b></li>` : ''}
        </ul>
        <p class="gr-btns"><a class="btn btn--volt" href="${attr(mapHref(g.mapQuery))}" rel="noopener" target="_blank">Directions ${ARROW}</a></p>`
    : `<p class="gr-note rv">The club has not recorded an address for this ground, so there is no
          directions link: a map search on the name alone can land anywhere, and a wrong pin is
          worse than none for somebody driving to a Sunday morning kick-off.
          It is one field in <strong>Control panel → Results</strong>.</p>`}
      </div>
    </section>`;

  /* ---- The record here ---- */
  const recordBand = played ? `<section class="sec gr-rec" id="record" aria-labelledby="gr-rec-h">
      <div class="wrap">
        ${rail(3, 'The record', `${s.won}W ${s.drawn}D ${s.lost}L`)}
        <h2 class="h2 rv" id="gr-rec-h">The record <span class="volt">here.</span></h2>
        <ul class="gr-tiles rv">
          ${tile(s.played, 'Played')}${tile(s.won, 'Won')}${tile(s.drawn, 'Drawn')}${tile(s.lost, 'Lost')}
          ${tile(s.goalsFor, 'Scored')}${tile(s.goalsAgainst, 'Conceded')}${tile(s.cleanSheets, 'Clean sheets')}
          ${g.neutral ? tile(g.neutral, 'Neutral') : ''}
        </ul>
        ${s.walkovers ? `<p class="gr-note">${esc(s.walkovers)} of the ${esc(s.played)}
          ${s.walkovers === 1 ? 'was awarded and carries' : 'were awarded and carry'} no score.</p>` : ''}
      </div>
    </section>` : '';

  /* ---- Every match here ---- */
  const matchesBand = played ? `<section class="sec gr-meet" id="matches" aria-labelledby="gr-mt-h">
      <div class="wrap">
        ${rail(4, 'Every match', 'Most recent first')}
        <h2 class="h2 rv" id="gr-mt-h">Every match played <span class="volt">here.</span></h2>
        <ol class="gr-list rv">
          ${g.matches.map((m) => `<li class="gr-m is-${esc(String(m.outcome || 'd').toLowerCase())}">
            <a class="gr-m__a" href="/matches/${attr(m.slug)}.html">
              <span class="gr-m__res" aria-hidden="true">${esc(m.outcome || '·')}</span>
              <span class="gr-m__main">
                <b class="gr-m__score">${esc(m.countsGoals ? (m.ourScoreline || m.scoreline) : 'Awarded')}</b>
                <i class="gr-m__opp">v ${esc(m.opponent || '')} · ${esc(m.competition)}</i>
              </span>
              <span class="gr-m__date">${esc(fmtDate(m.date, { long: true }))}</span>
            </a>
          </li>`).join('\n          ')}
        </ol>
      </div>
    </section>` : '';

  /* ---- Still to come ---- */
  const nextBand = g.fixtures.length ? `<section class="sec gr-next" id="to-come" aria-labelledby="gr-nx-h">
      <div class="wrap">
        ${rail(played ? 5 : 3, 'Still to come', `${g.fixtures.length} ${g.fixtures.length === 1 ? 'fixture' : 'fixtures'}`)}
        <h2 class="h2 rv" id="gr-nx-h">Still to come <span class="volt">here.</span></h2>
        <ul class="gr-lines rv">
          ${g.fixtures.map((f) => `<li>
            <i>${esc(fmtDate(f.date, { long: true }))}${f.kick ? `, ${esc(f.kick)}` : ''}</i>
            <b>v ${esc(f.opponent || '')} · ${esc(f.competition)}</b>
          </li>`).join('\n          ')}
        </ul>
        <p class="gr-btns"><a class="btn btn--ghost" href="/fixtures.html">Every fixture ${ARROW}</a></p>
      </div>
    </section>` : '';

  return {
    body: siteHeader('/fixtures.html') + hero + travelBand + recordBand + matchesBand + nextBand
      + sourceNote(['fulltime', 'surreyfa'], { lead: 'League and cup figures reconcile with' }),
    bodyClass: 'is-home is-sub is-ground',
    css: 'home.css',
    shell: 'home',
    preMain: sitePreMain(),
    footerHtml: siteFooter(),
  };
}

/* ========================================================================== */
export function groundsIndex(d, grounds) {
  const list = grounds || [];
  const withAddress = list.filter((g) => g.address).length;

  const hero = `<section class="sec gr-ihero" aria-labelledby="gri-h">
      <div class="wrap">
        ${rail(1, 'Grounds', `${list.length} played at`)}
        <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> Where we play</p>
        <h1 class="h1b" id="gri-h">Every ground we have <span class="volt">played on.</span></h1>
        <p class="gr-lede">${esc(`${list.length} grounds across league, cup and pre-season.`)}
          Each one has its own page: the club's record there, every match played on it, and how to
          get to it.${withAddress < list.length ? ` ${esc(`${list.length - withAddress} of them`)} have no
          address on record yet, which is one field a match in Control panel.` : ''}</p>
      </div>
    </section>`;

  const band = `<section class="sec gr-idx" id="all" aria-labelledby="gri-a-h">
      <div class="wrap">
        ${rail(2, 'All of them', 'Most played first')}
        <h2 class="h2 rv" id="gri-a-h">The <span class="volt">grounds.</span></h2>
        <ul class="gr-cards rv">
          ${list.map((g) => `<li class="gr-card">
            <a class="gr-card__a" href="/grounds/${attr(g.slug)}.html">
              <span class="gr-card__n">${esc(g.name)}</span>
              <span class="gr-card__r">${g.matches.length
    ? `${esc(g.matches.length)} ${g.matches.length === 1 ? 'match' : 'matches'} · ${esc(g.summary.won)} won`
    : 'Fixture to come'}</span>
              ${g.clubs.length ? `<span class="gr-card__c">${esc(g.clubs.slice(0, 3).join(', '))}${g.clubs.length > 3 ? `, and ${esc(g.clubs.length - 3)} more` : ''}</span>` : ''}
            </a>
          </li>`).join('\n          ')}
        </ul>
      </div>
    </section>`;

  return {
    body: siteHeader('/fixtures.html') + hero + band
      + sourceNote(['fulltime', 'surreyfa'], { lead: 'League and cup figures reconcile with' }),
    bodyClass: 'is-home is-sub is-ground',
    css: 'home.css',
    shell: 'home',
    preMain: sitePreMain(),
    footerHtml: siteFooter(),
  };
}
