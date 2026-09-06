/* ==========================================================================
   THE DIGITAL MATCH PROGRAMME  (/programme.html, "Match programme" under Media)

   A programme is the thing somebody reads on their phone standing beside the
   pitch twenty minutes before kick-off, so this is written for that reader:
   who we are playing, where, when, who is available, what happened last
   season, and who pays for the shirts.

   ONE STABLE URL, NOT ONE PER MATCH. The nav has to point somewhere that
   still exists next week, and a programme is a matchday artefact rather than
   an archive: it is always the NEXT fixture, rebuilt whenever the fixture
   list moves. `d.nextFixture` is derived once in dataset.mjs against the day
   the site was generated, so this page and the home page's next-match card
   can never disagree about what is coming up.

   EVERY FIGURE IS DERIVED. Nothing in here is typed: the head-to-head is
   counted from the archive, the squad is the roster for the season being
   played, the honours come from the league table the build reconciles, and
   the partners come from the one partner list. A programme that quoted a
   number somebody had to remember to update would be wrong by October.

   IT DEGRADES TO A PAGE THAT STILL MAKES SENSE. With no fixture to come the
   page says so and shows the season instead, because the club will hit that
   state every May and a blank programme reads as a broken site.
   ========================================================================== */
import { esc, attr, clubCrest, icon, crest } from '../lib/html.mjs';
import { CLUB } from '../lib/club.mjs';
import { fmtDate, isUs } from '../lib/stats.mjs';
import { clubIdentity } from '../lib/club-name.mjs';
import { siteFooter, sitePreMain, siteHeader } from './home.mjs';
import { sourceNote } from '../lib/blocks.mjs';

const rail = (n, label, ref) => `
  <div class="xrail" aria-hidden="true">
    <span class="xrail__l"><span class="xrail__n">${String(n).padStart(2, '0')}</span>
      <span class="xrail__t">${esc(label)}</span></span>
    <span class="xrail__r">${esc(ref)}</span>
  </div>`;

/* WHAT THE ARCHIVE KNOWS ABOUT TODAY'S OPPONENT, and the difference between
   "never played" and "played their other side" is the one this club has
   already published wrongly once. `clubIdentity` keeps a 1st Team and a 2.0
   apart while merging two spellings of the same side. */
function headToHead(d, opponent) {
  const id = clubIdentity(opponent || '');
  const played = (d.matches || []).filter((m) => m.played);
  const met = played.filter((m) => clubIdentity(m.opponent || '') === id);
  const related = played.filter((m) => {
    const o = clubIdentity(m.opponent || '');
    return o !== id && o.split(' ')[0] === id.split(' ')[0];
  });
  const tally = { p: met.length, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
  met.forEach((m) => {
    tally.gf += m.ourGoals || 0;
    tally.ga += m.theirGoals || 0;
    if (m.outcome === 'W') tally.w += 1;
    else if (m.outcome === 'D') tally.d += 1;
    else if (m.outcome === 'L') tally.l += 1;
  });
  return { met, related, tally };
}

export function programme(d) {
  const m = d.nextFixture;
  const badges = d.badges;
  const season = d.currentSeason;

  /* ---- 01 THE COVER ---------------------------------------------------- */
  const cover = m
    ? `<section class="sec pr-cover" aria-labelledby="pr-h">
      <div class="wrap">
        <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i>
          Matchday programme · ${esc(season)}</p>
        <h1 class="pr-cover__title" id="pr-h">${esc(m.competition)}<span class="volt">.</span></h1>
        <div class="pr-cover__teams">
          <div class="pr-team">
            ${m.weAreHome ? `<span class="pr-team__badge">${crest()}</span>`
    : clubCrest(m.home, badges, 'pr-team__badge')}
            <span class="pr-team__name">${esc(m.weAreHome ? CLUB.name : m.home)}</span>
            <span class="pr-team__tag">${esc(m.weAreHome ? 'Home' : '')}</span>
          </div>
          <span class="pr-cover__v" aria-hidden="true">v</span>
          <div class="pr-team">
            ${m.weAreHome ? clubCrest(m.away, badges, 'pr-team__badge')
    : `<span class="pr-team__badge">${crest()}</span>`}
            <span class="pr-team__name">${esc(m.weAreHome ? m.away : CLUB.name)}</span>
            <span class="pr-team__tag">${esc(m.weAreHome ? '' : 'Home')}</span>
          </div>
        </div>
        <dl class="pr-facts">
          <div><dt>Date</dt><dd>${esc(fmtDate(m.date, { weekday: true, long: true }))}</dd></div>
          <div><dt>Kick-off</dt><dd>${esc(m.kick || 'To be confirmed')}</dd></div>
          <div><dt>Venue</dt><dd>${esc(m.venue || CLUB.venue.name)}</dd></div>
          <div><dt>Competition</dt><dd>${esc(m.competition)}</dd></div>
        </dl>
        <p class="pr-cover__where">${icon('pin', '')}
          <a href="https://www.google.com/maps/search/?api=1&amp;query=${attr(encodeURIComponent(m.venue || CLUB.venue.mapQuery))}"
            target="_blank" rel="noopener">Find the ground</a></p>
      </div>
    </section>`
    : `<section class="sec pr-cover" aria-labelledby="pr-h">
      <div class="wrap">
        <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i>
          Matchday programme</p>
        <h1 class="pr-cover__title" id="pr-h">No match to come<span class="volt">.</span></h1>
        <p class="pr-cover__none">There is no fixture on the calendar at the moment. This page
          fills itself in as soon as the next one is announced, and everything below is the
          season as it stands.</p>
      </div>
    </section>`;

  /* ---- 02 TODAY'S OPPONENT --------------------------------------------- */
  const h2h = m ? headToHead(d, m.opponent) : null;
  const opponentBand = m ? `<section class="sec pr-band" aria-labelledby="pr-opp-h">
      <div class="wrap">
        ${rail(1, 'Today’s opponent', h2h.tally.p ? `Played ${h2h.tally.p}` : 'First meeting')}
        <h2 class="h2 rv" id="pr-opp-h">${esc(m.opponent)}<span class="volt">.</span></h2>
        ${h2h.tally.p
    ? `<dl class="pr-h2h">
          <div><dt>Played</dt><dd>${esc(h2h.tally.p)}</dd></div>
          <div><dt>Won</dt><dd>${esc(h2h.tally.w)}</dd></div>
          <div><dt>Drawn</dt><dd>${esc(h2h.tally.d)}</dd></div>
          <div><dt>Lost</dt><dd>${esc(h2h.tally.l)}</dd></div>
          <div><dt>Scored</dt><dd>${esc(h2h.tally.gf)}</dd></div>
          <div><dt>Conceded</dt><dd>${esc(h2h.tally.ga)}</dd></div>
        </dl>
        <ul class="pr-list">${h2h.met.slice(-5).reverse().map((x) => `<li>
          <span>${esc(fmtDate(x.date))}</span>
          <span>${esc(x.homeAway)}</span>
          <b>${esc(x.ourScoreline || '')}</b>
          <span class="pr-clip">${esc(x.competition)}</span>
        </li>`).join('')}</ul>`
    : `<p class="pr-lede rv">A first meeting. There is no result, no team sheet and no
        previous scoreline against ${esc(m.opponent)} anywhere in the club’s records, so
        neither side has a form guide on the other.${h2h.related.length
    ? ` The club has played their ${esc([...new Set(h2h.related.map((x) => x.opponent))].join(' and '))},
        which is a different side and carries no record into this one.` : ''}</p>`}
      </div>
    </section>` : '';

  /* ---- 03 THE SQUAD ------------------------------------------------------
     Who is at the club for the season being played, in the order the site
     lists them, grouped the way a team sheet reads. Availability on the day
     is not something the website knows, and it says so rather than implying
     that this is the eleven. */
  const here = (d.squad || []).filter((p) => p.status && p.status !== 'retired'
    && p.status !== 'departed' && p.status !== 'staff' && p.status !== 'absent');
  const GROUPS = [
    ['gk', 'Goalkeepers'], ['def', 'Defenders'], ['mid', 'Midfielders'], ['fwd', 'Forwards'],
  ];
  const grouped = GROUPS.map(([key, label]) => {
    const men = here.filter((p) => (p.positionGroup || '') === key);
    return men.length ? `<div class="pr-group">
        <h3 class="pr-group__h">${esc(label)}</h3>
        <ul class="pr-names">${men.map((p) => `<li><a href="/players/${attr(p.slug)}.html">${esc(p.name)}</a></li>`).join('')}</ul>
      </div>` : '';
  }).join('');
  const ungrouped = here.filter((p) => !GROUPS.some(([k]) => (p.positionGroup || '') === k));

  const squadBand = here.length ? `<section class="sec pr-band" aria-labelledby="pr-sq-h">
      <div class="wrap">
        ${rail(2, 'The squad', `${here.length} at the club`)}
        <h2 class="h2 rv" id="pr-sq-h">Who is here<span class="volt">.</span></h2>
        <div class="pr-groups rv">${grouped}${ungrouped.length
    ? `<div class="pr-group"><h3 class="pr-group__h">Also in the squad</h3>
        <ul class="pr-names">${ungrouped.map((p) => `<li><a href="/players/${attr(p.slug)}.html">${esc(p.name)}</a></li>`).join('')}</ul></div>` : ''}</div>
        <p class="pr-note">Everyone registered for ${esc(season)}. Who actually starts is decided
          on the morning and is not something this page knows.</p>
        ${(d.coaches || []).length ? `<p class="pr-note"><b>The staff.</b>
          ${esc((d.coaches || []).map((c) => c.name).join(' · '))}</p>` : ''}
      </div>
    </section>` : '';

  /* ---- 04 LAST SEASON ---------------------------------------------------- */
  const us = (d.table || []).find((r) => r.us);
  const lastBand = us ? `<section class="sec pr-band" aria-labelledby="pr-last-h">
      <div class="wrap">
        ${rail(3, 'How we got here', `${esc(d.titleDivision)} ${esc(d.titleSeason)}`)}
        <h2 class="h2 rv" id="pr-last-h">Champions, unbeaten<span class="volt">.</span></h2>
        <dl class="pr-h2h rv">
          <div><dt>Played</dt><dd>${esc(us.played)}</dd></div>
          <div><dt>Won</dt><dd>${esc(us.won)}</dd></div>
          <div><dt>Drawn</dt><dd>${esc(us.drawn)}</dd></div>
          <div><dt>Lost</dt><dd>${esc(us.lost)}</dd></div>
          <div><dt>Scored</dt><dd>${esc(us.goalsFor)}</dd></div>
          <div><dt>Conceded</dt><dd>${esc(us.goalsAgainst)}</dd></div>
          <div><dt>Points</dt><dd>${esc(us.points)}</dd></div>
        </dl>
        <p class="pr-note">${esc(d.titleDivision)} ${esc(d.titleSeason)}, won with a perfect
          record and promotion into ${esc(m ? m.competition : d.divisionOf(d.currentSeason))}.
          <a href="/champions.html">The season in full</a>.</p>
      </div>
    </section>` : '';

  /* ---- 05 THE PREVIEW ----------------------------------------------------
     The club's own words, linked rather than reproduced: the article is a
     page in its own right with its own share card, and a programme that
     pasted it in would give the same text two URLs. */
  const preview = (d.articles || [])[0];
  const previewBand = preview ? `<section class="sec pr-band" aria-labelledby="pr-prev-h">
      <div class="wrap">
        ${rail(4, 'From the club', esc(preview.date || ''))}
        <h2 class="h2 rv" id="pr-prev-h">The preview<span class="volt">.</span></h2>
        <a class="pr-read rv" href="/news/${attr(preview.slug)}.html">
          <span class="pr-read__k">${esc(preview.category || 'News')}</span>
          <span class="pr-read__t">${esc(preview.title)}</span>
          <span class="pr-read__go">Read it ${icon('arrow', '')}</span>
        </a>
      </div>
    </section>` : '';

  /* ---- 06 STILL TO COME -------------------------------------------------- */
  const rest = (d.upcoming || []).filter((x) => !m || x.id !== m.id);
  const nextBand = rest.length ? `<section class="sec pr-band" aria-labelledby="pr-next-h">
      <div class="wrap">
        ${rail(5, 'Coming up', `${rest.length} more`)}
        <h2 class="h2 rv" id="pr-next-h">After today<span class="volt">.</span></h2>
        <ul class="pr-list rv">${rest.map((x) => `<li>
          <span>${esc(fmtDate(x.date, { weekday: true }))}</span>
          <span>${esc(x.kick || '')}</span>
          <b class="pr-clip">${esc(x.opponent)}</b>
          <span>${esc(x.homeAway)}</span>
        </li>`).join('')}</ul>
        <p class="pr-note"><a href="/fixtures.html">Every fixture</a>.</p>
      </div>
    </section>` : '';

  /* ---- 07 THE CAUSE ------------------------------------------------------
     A programme is one of the few places this belongs: somebody is holding
     it, they have a minute, and it is the reason the club exists. Plain and
     short, and it points at the people who can actually give medical advice
     rather than offering any. */
  const causeBand = `<section class="sec pr-band pr-cause" aria-labelledby="pr-cause-h">
      <div class="wrap">
        ${rail(6, 'Why we play', esc(CLUB.memorial.name))}
        <h2 class="h2 rv" id="pr-cause-h">In her name<span class="volt">.</span></h2>
        <p class="pr-lede rv">${esc(CLUB.name)} was founded in memory of
          ${esc(CLUB.memorial.name)}, who died of sepsis. The club plays for sepsis
          awareness, and every match is a chance for somebody else to learn the signs.</p>
        <p class="pr-note"><a href="/sepsis.html">Our cause</a> ·
          <a href="https://sepsistrust.org" target="_blank" rel="noopener">The UK Sepsis Trust</a></p>
      </div>
    </section>`;

  /* ---- 08 WHO BACKS THE CLUB --------------------------------------------- */
  const partners = (d.partners || []).filter((p) => p.onPage !== false);
  const partnerBand = partners.length ? `<section class="sec pr-band" aria-labelledby="pr-sp-h">
      <div class="wrap">
        ${rail(7, 'Who backs the club', `${partners.length} partners`)}
        <h2 class="h2 rv" id="pr-sp-h">Our partners<span class="volt">.</span></h2>
        <ul class="pr-partners rv">${partners.map((p) => `<li>${p.logo
    ? `<img src="${attr(p.logo)}" alt="${attr(p.name)}" width="120" height="60" loading="lazy" decoding="async" />`
    : `<span>${esc(p.short || p.name)}</span>`}</li>`).join('')}</ul>
        <p class="pr-note">Every one of them keeps this club on the pitch.
          <a href="/sponsors.html">Back the Angels</a>.</p>
      </div>
    </section>` : '';

  return {
    body: siteHeader('/programme.html') + cover + opponentBand + squadBand + lastBand
      + previewBand + nextBand + causeBand + partnerBand
      + sourceNote(['fulltime']),
    bodyClass: 'is-home is-sub is-programme',
    css: 'home.css',
    shell: 'home',
    preMain: sitePreMain(),
    footerHtml: siteFooter(),
    schema: m ? [{
      '@context': 'https://schema.org',
      '@type': 'SportsEvent',
      name: `${m.home} v ${m.away}`,
      startDate: m.isoDateTime || m.iso,
      eventStatus: 'https://schema.org/EventScheduled',
      location: { '@type': 'Place', name: m.venue || CLUB.venue.name },
      homeTeam: { '@type': 'SportsTeam', name: m.home },
      awayTeam: { '@type': 'SportsTeam', name: m.away },
    }] : [],
  };
}
