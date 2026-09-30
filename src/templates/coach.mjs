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
import { seasonViews, defaultView, seasonBar, seasonPanels, matchNote } from '../lib/seasons.mjs';
import { siteFooter, sitePreMain, siteHeader } from './home.mjs';
import { sourceNote } from '../lib/blocks.mjs';

const ARROW = '<span aria-hidden="true">\u2192</span>';

const rail = (n, label, ref) => `<div class="xrail" aria-hidden="true">
      <span class="xrail__l"><span class="xrail__n">${esc(String(n).padStart(2, '0'))}</span><span class="xrail__t">${esc(label)}</span></span>
      <span class="xrail__r">${esc(ref)}</span>
    </div>`;

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
    return `<div class="mg">
        <ul class="mg__tiles">
          ${tile(r.played, 'Played')}${tile(r.won, 'Won')}${tile(r.drawn, 'Drawn')}${tile(r.lost, 'Lost')}
          ${tile(`${r.winPct}%`, 'Win rate')}${tile(r.pointsPerGame, 'Points a game')}
        </ul>
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
          ${tile(r.cleanSheets, 'Clean sheets')}
        </ul>
        ${r.walkovers ? `<p class="mg__note">${esc(r.walkovers)} of the ${esc(r.played)} ${r.walkovers === 1 ? 'was awarded and carries' : 'were awarded and carry'}
          no score, so the goal figures are counted over ${esc(r.onGoalRecord)} matches.</p>` : ''}
        ${r.best || r.worst ? `<ul class="mg__lines">
          ${r.best ? `<li><i>Biggest win</i><b>${scoreOf(r.best)}</b></li>` : ''}
          ${r.worst ? `<li><i>Heaviest defeat</i><b>${scoreOf(r.worst)}</b></li>` : ''}
        </ul>` : ''}

        <h3 class="mg__sub">How he set up</h3>
        ${r.formations.rows.length ? `<table class="mg__tbl">
          <caption class="sr-only">Formations used in ${esc(v.label)}</caption>
          <thead><tr><th scope="col">Shape</th><th scope="col">Used</th><th scope="col">Won</th><th scope="col">Share</th></tr></thead>
          <tbody>
            ${r.formations.rows.map((f) => `<tr>
              <th scope="row">${esc(f.formation)}</th><td>${esc(f.n)}</td><td>${esc(f.won)}</td><td>${esc(f.pct)}%</td>
            </tr>`).join('\n            ')}
          </tbody>
        </table>
        <p class="mg__note">${esc(r.formations.total)} of ${esc(r.formations.of)} team sheets record a shape.
          A match with none is left out rather than guessed at.</p>` : `<p class="mg__note">No team sheet in ${esc(v.label)} records a shape yet.</p>`}

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

  const hero = `<section class="sec co-phero" aria-labelledby="cp-h">
      <div class="wrap">
        ${rail(1, 'Staff', esc(manager.role || 'First-team manager'))}
        <p class="eyebrow rv">${esc(CLUB.name)} · ${esc(manager.role || 'First-team manager')}</p>
        <h1 class="h1b rv" id="cp-h">${esc(manager.name)}<span class="volt">.</span></h1>
        ${(manager.bio || []).slice(0, 2).map((para) => `<p class="co-lede rv">${esc(para)}</p>`).join('\n        ')}
        <p class="co-lede rv"><a class="btn btn--ghost" href="/coaches.html">All of the staff ${ARROW}</a></p>
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
