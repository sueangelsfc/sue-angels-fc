/* ==========================================================================
   A COACH'S OWN PAGE  (/coaches/<slug>.html)

   The figures were a band on /coaches.html at first and that was wrong twice
   over. The page is about the whole dugout, and a manager's detailed record
   put there reads as the club's; and a record worth this much detail is worth
   a URL, so it can be linked, shared and found rather than scrolled to.

   ONLY THE MANAGER GETS ONE, because only the manager has figures. A coach's
   record is the same list of matches with nothing to distinguish it, and
   giving everybody a page of identical numbers would say each of them
   personally won eighteen games.

   The band above it on /coaches.html is the club's figures under the whole
   staff and says so. This page names somebody, so it is counted from the
   matches he was in charge for and `since` is on his record rather than
   assumed - see managerRecord() in stats.mjs.
   ========================================================================== */
import { esc, attr } from '../lib/html.mjs';
import { CLUB } from '../lib/club.mjs';
import { managerRecord } from '../lib/stats.mjs';
import { POSITION_XY, positionName } from '../lib/positions.mjs';
import { seasonViews, defaultView, seasonBar, seasonPanels, matchNote } from '../lib/seasons.mjs';
import { siteFooter, sitePreMain, siteHeader } from './home.mjs';
import { sourceNote } from '../lib/blocks.mjs';

const ARROW = '<span aria-hidden="true">\u2192</span>';

const rail = (n, label, ref) => `<div class="xrail" aria-hidden="true">
      <span class="xrail__l"><span class="xrail__n">${esc(String(n).padStart(2, '0'))}</span><span class="xrail__t">${esc(label)}</span></span>
      <span class="xrail__r">${esc(ref)}</span>
    </div>`;


/* A FORMATION DRAWN FROM THE SHEET THAT USED IT, not from its name. "3-4-2-1"
   is a summary of where eleven men actually stood, and the club already
   records where each of them stood: POSITION_XY carries the same percentages
   the panel's team-sheet pitch and the profile's heat map are drawn on, so a
   shape here cannot disagree with a shape there. The most recent eleven to
   line up in it is the one shown, because that is the side he picked last. */
const shapePitch = (m) => {
  const dots = (((m && m.detail && m.detail.starters) || [])
    .map((x) => String((x.positions || [])[0] || '').toUpperCase())
    .map((code) => ({ code, xy: POSITION_XY[code] }))
    .filter((p) => p.xy));
  if (dots.length < 7) return '';
  return `<svg class="mgf__pitch" viewBox="0 0 100 116" role="img"
      aria-label="${attr(dots.length)} positions on the pitch">
      <rect x="1" y="1" width="98" height="114" rx="3" fill="none" stroke="rgba(255,255,255,0.14)" />
      <line x1="1" y1="58" x2="99" y2="58" stroke="rgba(255,255,255,0.10)" />
      <circle cx="50" cy="58" r="12" fill="none" stroke="rgba(255,255,255,0.10)" />
      <rect x="28" y="1" width="44" height="16" fill="none" stroke="rgba(255,255,255,0.10)" />
      <rect x="28" y="99" width="44" height="16" fill="none" stroke="rgba(255,255,255,0.10)" />
      ${dots.map((p) => `<circle class="mgf__dot" cx="${p.xy[0]}" cy="${(p.xy[1] / 100) * 116}" r="5.4"><title>${esc(positionName(p.code))}</title></circle>`).join('')}
    </svg>`;
};

/* Every match as one column: the result in weight and fill, the height from
   the goals. Walkovers carry no score, so they are drawn as the flat bar they
   are rather than as a nil-nil. */
const matchStrip = (list) => {
  const scored = list.filter((m) => m.countsGoals).map((m) => m.ourGoals);
  const top = Math.max(3, ...scored);
  return `<ol class="mgs" aria-label="Every match, most recent last">
      ${list.slice().sort((a, b) => String(a.iso).localeCompare(String(b.iso))).map((m) => {
    const h = m.countsGoals ? Math.max(9, Math.round((m.ourGoals / top) * 100)) : 9;
    const cls = m.outcome === 'W' ? 'is-w' : m.outcome === 'D' ? 'is-d' : 'is-l';
    return `<li class="mgs__i ${cls}" style="--h:${h}%"><span class="sr-only">${esc(m.title || m.opponent)}, ${esc(m.scoreline || 'awarded')}</span>
        <i aria-hidden="true">${esc(m.countsGoals ? m.ourGoals : '\u00b7')}</i></li>`;
  }).join('')}
    </ol>`;
};

export function coachPage(manager, d) {
  const MGR_VIEWS = seasonViews(d);
  const MGR_DEFAULT = defaultView(MGR_VIEWS);
  const pct = (n, of) => (of ? Math.round((n / of) * 100) : 0);
  const mgrPanel = (v) => {
    const r = managerRecord(v.competitive, v.key === 'all' ? d.players : d.playersBySeason[v.key],
      { from: manager && manager.since });
    if (!r.played) {
      return `<p class="co-lede">Nothing has been played in ${esc(v.label)} yet, so there is
        nothing to count. The figures appear with the first result.</p>`;
    }
    const wdl = Math.max(1, r.won + r.drawn + r.lost);
    const tile = (b, l) => `<li><b>${esc(b)}</b><span>${esc(l)}</span></li>`;
    const scoreOf = (m) => (m ? `${esc(m.ourScoreline || m.scoreline)} v ${esc(m.opponent)}` : '');
    const C = 2 * Math.PI * 52;
    return `<div class="mg">
        <div class="mgh">
          <span class="mgh__dial">
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.09)" stroke-width="9" />
              <circle class="mgh__arc" cx="60" cy="60" r="52" fill="none" stroke="var(--volt)" stroke-width="9"
                stroke-linecap="round" transform="rotate(-90 60 60)"
                stroke-dasharray="${((r.winPct / 100) * C).toFixed(1)} ${C.toFixed(1)}" />
            </svg>
            <b>${esc(r.winPct)}<i>%</i></b>
            <span class="mgh__cap">Win rate</span>
          </span>
          <ul class="mg__tiles mg__tiles--4">
            ${tile(r.played, 'Played')}${tile(r.won, 'Won')}${tile(r.drawn, 'Drawn')}${tile(r.lost, 'Lost')}
            ${tile(r.points, 'Points')}${tile(r.pointsPerGame, 'Points a game')}
            ${tile(r.goalsFor, 'Scored')}${tile(r.cleanSheets, 'Clean sheets')}
          </ul>
        </div>
        <ol class="co-wdl" aria-label="Results in ${attr(v.label)}">
          ${r.won ? `<li class="co-wdl__w" style="--w:${pct(r.won, wdl)}%"><span class="sr-only">Won ${esc(r.won)}</span></li>` : ''}
          ${r.drawn ? `<li class="co-wdl__d" style="--w:${pct(r.drawn, wdl)}%"><span class="sr-only">Drawn ${esc(r.drawn)}</span></li>` : ''}
          ${r.lost ? `<li class="co-wdl__l" style="--w:${pct(r.lost, wdl)}%"><span class="sr-only">Lost ${esc(r.lost)}</span></li>` : ''}
        </ol>

        <h3 class="mg__sub">Goals</h3>
        <ul class="mg__tiles">
          ${tile(r.goalsFor, 'Scored')}${tile(r.goalsAgainst, 'Conceded')}
          ${tile(r.goalDifference > 0 ? `+${r.goalDifference}` : r.goalDifference, 'Difference')}
          ${tile(r.goalsPerGame, 'Scored a game')}${tile(r.concededPerGame, 'Conceded a game')}
          ${tile(r.failedToScore, 'Blanked')}
        </ul>
        ${r.walkovers ? `<p class="mg__note">${esc(r.walkovers)} of the ${esc(r.played)} ${r.walkovers === 1 ? 'was awarded and carries' : 'were awarded and carry'}
          no score, so the goal figures are counted over ${esc(r.onGoalRecord)} matches.</p>` : ''}
        ${r.best || r.worst ? `<ul class="mg__lines">
          ${r.best ? `<li><i>Biggest win</i><b>${scoreOf(r.best)}</b></li>` : ''}
          ${r.worst ? `<li><i>Heaviest defeat</i><b>${scoreOf(r.worst)}</b></li>` : ''}
        </ul>` : ''}

        <h3 class="mg__sub">How he set up</h3>
        ${r.formations.rows.length ? `<ul class="mgf">
          ${r.formations.rows.map((f) => {
    const last = r.matches.filter((m) => m.detail && m.detail.formation === f.formation)
      .sort((a, b) => String(b.iso).localeCompare(String(a.iso)))[0];
    return `<li class="mgf__i">
            ${shapePitch(last)}
            <b class="mgf__name">${esc(f.formation)}</b>
            <span class="mgf__n">${esc(f.n)} ${f.n === 1 ? 'time' : 'times'}</span>
            <span class="mgf__w">${esc(f.won)} won</span>
            <span class="mgf__bar" aria-hidden="true"><i style="--w:${esc(f.pct)}%"></i></span>
          </li>`;
  }).join('\n          ')}
        </ul>
        <p class="mg__note">${esc(r.formations.total)} of ${esc(r.formations.of)} team sheets record a shape,
          and each pitch is the most recent eleven to line up in it. A match with no shape on record is
          left out rather than guessed at.</p>` : `<p class="mg__note">No team sheet in ${esc(v.label)} records a shape yet.</p>`}

        <h3 class="mg__sub">Match by match</h3>
        ${matchStrip(r.matches)}
        <p class="mg__note">One column a match, oldest first, the height its goals. An awarded
          walkover carries no score, so it is drawn flat rather than as a nil-nil.</p>

        <h3 class="mg__sub">Who he used</h3>
        <ul class="mg__tiles">
          ${tile(r.playersUsed, 'Players used')}${tile(r.elevensUsed, 'Different elevens')}
          ${tile(r.sheets, 'Team sheets')}${r.everPresent ? tile(r.everPresent, 'Ever present') : ''}
        </ul>
        <p class="mg__note">A player counts as used when the record puts him on the pitch,
          which is a start or a substitute the match proves came on. A name on the bench with
          nothing beside it is not an appearance.</p>

        <h3 class="mg__sub">By competition</h3>
        <table class="mg__tbl">
          <caption class="sr-only">Record by competition in ${esc(v.label)}</caption>
          <thead><tr><th scope="col">Competition</th><th scope="col">P</th><th scope="col">W</th><th scope="col">D</th><th scope="col">L</th><th scope="col">F</th><th scope="col">A</th></tr></thead>
          <tbody>
            ${r.competitions.map((c) => `<tr>
              <th scope="row">${esc(c.competition)}</th><td>${esc(c.played)}</td><td>${esc(c.won)}</td>
              <td>${esc(c.drawn)}</td><td>${esc(c.lost)}</td><td>${esc(c.goalsFor)}</td><td>${esc(c.goalsAgainst)}</td>
            </tr>`).join('\n            ')}
            <tr><th scope="row">Home</th><td>${esc(r.homeAway.home.played)}</td><td>${esc(r.homeAway.home.won)}</td>
              <td>${esc(r.homeAway.home.drawn)}</td><td>${esc(r.homeAway.home.lost)}</td>
              <td>${esc(r.homeAway.home.goalsFor)}</td><td>${esc(r.homeAway.home.goalsAgainst)}</td></tr>
            <tr><th scope="row">Away</th><td>${esc(r.homeAway.away.played)}</td><td>${esc(r.homeAway.away.won)}</td>
              <td>${esc(r.homeAway.away.drawn)}</td><td>${esc(r.homeAway.away.lost)}</td>
              <td>${esc(r.homeAway.away.goalsFor)}</td><td>${esc(r.homeAway.away.goalsAgainst)}</td></tr>
          </tbody>
        </table>
        ${r.discipline.recorded ? `<p class="mg__note">Discipline: ${esc(r.discipline.yellow)} yellow
          and ${esc(r.discipline.red)} red, across the ${esc(r.discipline.recorded)} of ${esc(r.discipline.played)}
          matches that carry a card list.</p>` : ''}
      </div>`;
  };

  /* THE FIGURE STANDS BESIDE THE FACE. A profile that opens on a paragraph
     buries the one thing somebody came for, and the three numbers here are
     the whole career in a glance - everything under them is the working. */
  const career = managerRecord((d.competitive || []).filter((m) => m.played), d.players,
    { from: manager.since });
  const shot = manager.photoUrl || (manager.photo ? `/${String(manager.photo).replace(/^\//, '')}` : '');
  const hero = `<section class="sec cph" aria-labelledby="cp-h">
      <div class="wrap">
        ${rail(1, 'Staff', esc(manager.role || 'First-team manager'))}
        <div class="cph__grid">
          <div class="cph__shot rv">
            ${shot
    ? `<img src="${attr(shot)}" alt="${attr(manager.name)}" width="520" height="620" decoding="async" />`
    : `<img class="cph__crest" src="/assets/badge/sue-angels-badge-star.webp" alt="Sue’s Angels FC star" width="180" height="223" decoding="async" />`}
            <span class="cph__glow" aria-hidden="true"></span>
          </div>
          <div class="cph__body rv">
            <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> ${esc(manager.role || 'First-team manager')}</p>
            <h1 class="h1b" id="cp-h">${esc(manager.name)}<span class="volt">.</span></h1>
            <ul class="cph__figs">
              <li><b>${esc(career.played)}</b><span>In charge</span></li>
              <li><b>${esc(career.won)}</b><span>Won</span></li>
              <li><b>${esc(career.winPct)}%</b><span>Win rate</span></li>
            </ul>
            ${(manager.bio || []).slice(0, 1).map((para) => `<p class="co-lede">${esc(para)}</p>`).join('')}
            <p class="cph__btns"><a class="btn btn--ghost" href="/coaches.html">All of the staff ${ARROW}</a></p>
          </div>
        </div>
      </div>
    </section>`;

  const statsBand = `<section class="sec co-mgr" id="record" aria-labelledby="cp-rec-h">
      <div class="wrap">
        ${rail(2, 'The record', `${esc(manager.name)} \u00b7 competitive only`)}
        <h2 class="h2 rv" id="cp-rec-h">By the <span class="volt">numbers.</span></h2>
        <p class="co-lede rv">Every competitive match he has been in charge for, the shapes he
          set up in and the players he needed. Derived from the match records, so it moves when
          the next result is entered. Pre-season friendlies count towards nothing here, as
          everywhere else on the site.</p>
        ${seasonBar(MGR_VIEWS, MGR_DEFAULT, matchNote, { esc, attr })}
        ${seasonPanels(MGR_VIEWS, MGR_DEFAULT, mgrPanel, { attr })}
      </div>
    </section>`;

  return {
    body: siteHeader('/coaches.html') + hero + statsBand
      + sourceNote(['fulltime', 'surreyfa'], { lead: 'League and cup figures reconcile with' }),
    bodyClass: 'is-home is-sub is-coach',
    css: 'home.css',
    shell: 'home',
    preMain: sitePreMain(),
    footerHtml: siteFooter(),
    record: managerRecord((d.competitive || []).filter((m) => m.played), d.players,
      { from: manager.since }),
  };
}
