/* ==========================================================================
   SQUAD  (/squad.html, "Squad" under On the Pitch)

   The players, grouped by the position they actually lined up in, which is
   derived from real team sheets rather than a label somebody typed once.

   Three deliberate departures from the design this replaces:

   1. A grid, not a horizontal rail. Twenty-three players in a scroll rail
      means most of the squad is off-screen on arrival, and a squad page whose
      job is to show you the squad should show you the squad.
   2. Real position headings. The chips filter them, but with the script
      blocked you still get a properly structured, readable roster instead of
      an undifferentiated wall of faces.
   3. No flip. The extra numbers ride in a panel that is always in the DOM and
      reveals on hover or keyboard focus, so nothing a screen reader needs is
      locked behind a button press.

   Every figure comes from the same statistics engine as every other page.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc, attr } from '../lib/html.mjs';
import { CLUB } from '../lib/club.mjs';
import { teamSummary } from '../lib/stats.mjs';
import { siteFooter, sitePreMain, siteHeader, auraFor } from './home.mjs';

const STAR = '/assets/badge/sue-angels-badge-star.webp';
const ARROW = '<span aria-hidden="true">→</span>';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const shotFor = (num) => {
  try {
    return fs.existsSync(path.join(ROOT, 'assets', 'players', `${num}.webp`))
      ? `/assets/players/${num}.webp` : '';
  } catch { return ''; }
};

const rail = (n, label, ref) => `<div class="xrail" aria-hidden="true">
      <span class="xrail__l"><span class="xrail__n">${esc(String(n).padStart(2, '0'))}</span><span class="xrail__t">${esc(label)}</span></span>
      <span class="xrail__r">${esc(ref)}</span>
    </div>`;

const GROUPS = [
  { key: 'gk', label: 'Goalkeepers', one: 'Goalkeeper' },
  { key: 'def', label: 'Defenders', one: 'Defender' },
  { key: 'mid', label: 'Midfielders', one: 'Midfielder' },
  { key: 'fwd', label: 'Forwards', one: 'Forward' },
];

export function squad(d) {
  const stats = new Map((d.players || []).map((p) => [p.num, p]));
  const all = (d.squad || []).map((p) => ({ ...p, s: stats.get(p.num) || {} }));

  /* Squad leaders, so a card can say why this player matters at a glance.
     Only an outright leader is badged: a shared top score would make the mark
     meaningless. */
  const leaderOf = (key, pool) => {
    const vals = pool.map((x) => x.s[key] || 0);
    const top = Math.max(0, ...vals);
    if (!top) return null;
    return vals.filter((v) => v === top).length === 1
      ? pool.find((x) => (x.s[key] || 0) === top) : null;
  };

  const first = all.filter((p) => p.status === 'active');
  const retired = all.filter((p) => p.status === 'retired');
  const departed = all.filter((p) => p.status === 'departed');

  const league = teamSummary((d.played || []).filter((m) => m.competition === CLUB.division));
  const squadGoals = first.reduce((n, p) => n + (p.s.goals || 0), 0);

  const byGroup = (list) => GROUPS
    .map((g) => ({ ...g, players: list.filter((p) => p.positionGroup === g.key) }))
    .filter((g) => g.players.length);

  /* A card. The three headline figures are always visible; the panel adds the
     rest and rides in on hover or focus, but is in the DOM either way. The
     whole card is one link, so the panel is reachable by keyboard. */
  const badges = new Map();
  const outfieldPool = all.filter((x) => !x.gk);
  const gkPool = all.filter((x) => x.gk);
  [['goals', 'Top scorer', outfieldPool], ['assists', 'Most assists', outfieldPool],
    ['motm', 'Most MOTM', all], ['cleanSheets', 'Most clean sheets', gkPool]]
    .forEach(([key, label, pool]) => {
      const who = leaderOf(key, pool);
      if (who && !badges.has(who.num)) badges.set(who.num, label);
    });

  const card = (p, i) => {
    const s = p.s;
    const badge = badges.get(p.num);
    const shot = shotFor(p.num);
    /* "Starts", not "Apps". The engine counts an appearance only when a
       player is named in the eleven, because Sunday-league returns do not
       record who actually came on. Calling that figure "apps" produced cards
       like 2 apps and 7 goals, which reads as broken data rather than as a
       substitute who scored: William Clark started twice and was on the bench
       fifteen times. Bench is shown alongside instead of folded in. */
    const extra = p.gk
      ? [{ v: s.subApps || 0, k: 'Bench' }, { v: s.cleanSheets || 0, k: 'Clean sheets' }, { v: s.motm || 0, k: 'MOTM' }]
      : [{ v: s.subApps || 0, k: 'Bench' }, { v: (s.goals || 0) + (s.assists || 0), k: 'Involved' }, { v: s.motm || 0, k: 'MOTM' }];
    const heads = p.gk
      ? [{ v: s.starts || 0, k: 'Starts' }, { v: s.cleanSheets || 0, k: 'Clean' }, { v: s.motm || 0, k: 'MOTM' }]
      : [{ v: s.starts || 0, k: 'Starts' }, { v: s.goals || 0, k: 'Goals' }, { v: s.assists || 0, k: 'Assists' }];

    return `<li class="pc" style="--i:${i}">
            <a class="pc__link" href="/players/${attr(p.slug)}.html" data-tilt>
              <span class="pc__shot">
                ${shot
    ? `<img src="${attr(shot)}" alt="" width="320" height="480" loading="lazy" decoding="async" />`
    : `<img class="pc__crest" src="${STAR}" alt="" width="200" height="248" loading="lazy" decoding="async" />`}
              </span>
              <span class="pc__pos${p.positionCode ? '' : ' is-none'}">${esc(p.positionCode || 'Squad')}</span>
              ${badge ? `<span class="pc__badge">${esc(badge)}</span>` : ''}
              <span class="pc__body">
                <span class="pc__name">
                  <b>${esc(p.last)}</b>
                  <i>${esc(p.first)}</i>
                </span>
                <span class="pc__stats">
                  ${heads.map((x) => `<span><b>${esc(x.v)}</b><i>${esc(x.k)}</i></span>`).join('')}
                </span>
              </span>
              <span class="pc__more">
                <span class="pc__morestats">
                  ${extra.map((x) => `<span><b>${esc(x.v)}</b><i>${esc(x.k)}</i></span>`).join('')}
                </span>
                <span class="pc__cta">Full profile ${ARROW}</span>
              </span>
            </a>
          </li>`;
  };

  const grid = (list, idOffset = 0) => byGroup(list).map((g) => `<section class="sq-grp" data-group="${attr(g.key)}">
          <h3 class="sq-grp__h">${esc(g.label)} <span>${esc(g.players.length)}</span></h3>
          <ul class="sq-cards">
            ${g.players.map((p, i) => card(p, i + idOffset)).join('\n            ')}
          </ul>
        </section>`).join('\n        ');

  /* Chips are real jump links to the position headings, so with the script
     blocked they still take you somewhere useful. The script promotes them to
     filters. */
  const chips = (list, scope) => {
    const groups = byGroup(list);
    return `<div class="sq-chips" data-filter-scope="${attr(scope)}">
          <a class="sq-chip is-on" href="#${attr(scope)}" data-group-all>All<span>${esc(list.length)}</span></a>
          ${groups.map((g) => `<a class="sq-chip" href="#${attr(scope)}" data-group-pick="${attr(g.key)}">${esc(g.label)}<span>${esc(g.players.length)}</span></a>`).join('\n          ')}
        </div>`;
  };

  /* ================= HERO ================= */
  const hero = `<section class="sq-hero" aria-labelledby="sq-h">
      <div class="wrap sq-hero__grid">
        <div>
          <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> First team · ${esc(d.currentSeason)}</p>
          <h1 class="sq-hero__title" id="sq-h">The squad<span class="volt">.</span></h1>
          <p class="sq-hero__lede">The players who won ${esc(CLUB.division)} unbeaten, grouped by where
            they actually line up. Every number here is counted from the team sheets.</p>
        </div>
        <dl class="sq-tally glassbox">
          <div><dt>In the first team</dt><dd>${esc(first.length)}</dd></div>
          <div><dt>Goals between them</dt><dd>${esc(squadGoals)}</dd></div>
          <div><dt>League clean sheets</dt><dd>${esc(league.cleanSheets)}</dd></div>
        </dl>
      </div>
    </section>`;

  /* ================= 01 FIRST TEAM ================= */
  const firstBand = `<section class="sec sq-first" id="first-team" aria-labelledby="sq-first-h">
      <div class="wrap">
        ${rail(1, 'First team', `${first.length} players`)}
        <h2 class="h2 rv" id="sq-first-h">The first <span class="volt">team.</span></h2>
        ${chips(first, 'first-team')}
        <div class="sq-groups rv">
        ${grid(first)}
        </div>
        <p class="sq-note">Starts are counted from the eleven named on each team sheet. Sunday-league
          returns do not record who came off the bench, so substitute appearances are shown
          separately rather than folded into a total we cannot verify.</p>
      </div>
    </section>`;

  /* ================= 02 PAST PLAYERS ================= */
  const pastSection = (list, key, title, sub) => list.length ? `<section class="sq-past" data-past="${attr(key)}">
          <h3 class="sq-past__h">${esc(title)} <span>${esc(sub)}</span></h3>
          <ul class="sq-cards sq-cards--past">
            ${list.map((p, i) => card(p, i)).join('\n            ')}
          </ul>
        </section>` : '';

  const pastBand = (retired.length || departed.length) ? `<section class="sec sq-pastband" id="past-players" aria-labelledby="sq-past-h">
      <div class="wrap">
        ${rail(2, 'Past players', `${retired.length + departed.length} in all`)}
        <h2 class="h2 rv" id="sq-past-h">Those who <span class="volt">came before.</span></h2>
        <p class="sq-lede rv">Nobody who pulled on the shirt disappears off this page. These are the
          players who hung up the boots or moved on, with the record they left behind.</p>
        <div class="rv">
        ${pastSection(retired, 'retired', 'Retired', 'Hung up the boots')}
        ${pastSection(departed, 'departed', 'Departed', 'Moved on from the club')}
        </div>
      </div>
    </section>` : '';

  /* ================= CTA ================= */
  const ctaBand = `<section class="sec sec--cta sq-cta" aria-labelledby="sq-cta-h">
      <div class="wrap">
        <div class="cta2">
          <span class="cta2__glow" aria-hidden="true"></span>
          <img class="cta2__badge" src="${STAR}" alt="" width="500" height="620" loading="lazy" decoding="async" aria-hidden="true" />
          <div class="cta2__glass glassbox rv">
            <p class="eyebrow cta2__eyebrow">Want to play here?</p>
            <h2 class="h2" id="sq-cta-h">Trials are open for <span class="volt">26/27.</span></h2>
            <p class="cta2__sub">Think you can wear the shirt? Register your interest and we will be
              in touch with dates.</p>
            <div class="cta2__btns">
              <a class="btn btn--volt" href="/join.html">Apply for a trial ${ARROW}</a>
              <a class="btn btn--ghost" href="/champions.html">The title-winning season</a>
            </div>
          </div>
        </div>
      </div>
    </section>`;

  return {
    body: siteHeader('/squad.html') + hero + firstBand + pastBand + ctaBand,
    bodyClass: 'is-home is-sub is-squad',
    css: 'home.css',
    shell: 'home',
    preMain: sitePreMain(auraFor('squad.html')),
    footerHtml: siteFooter(),
    schema: [{
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Squad · ${CLUB.name}`,
      breadcrumb: {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${CLUB.site}/` },
          { '@type': 'ListItem', position: 2, name: 'Squad', item: `${CLUB.site}/squad.html` },
        ],
      },
    }],
  };
}
