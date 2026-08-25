/* ==========================================================================
   THE LEAGUE  (/league.html, "League" under On the Pitch)

   The division, not the club: the final table, every result across it, and
   the players topping its charts.

   Everything on this page comes from FA Full-Time, the league's own record,
   and NOT from the club's match data. That distinction matters and the page
   states it: the two disagree in places, legitimately. The club counts a
   walkover as played with no goals; the league's scorer chart counts a cup
   run the table does not. Presenting them as one source would make the site
   look wrong wherever the league's own figures differ from ours.

   The scorer chart ships both of FA Full-Time's variants, all competitions
   and league only, because they genuinely differ: Frazier is 25 across
   everything and 18 in the league alone.

   League Eight 26/27 is a club list, not a standing. Nothing has been
   played, FA Full-Time lists it alphabetically, and the page says so rather
   than dressing an alphabetical list up as a position.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc, attr } from '../lib/html.mjs';
import { CLUB } from '../lib/club.mjs';
import { fmtDate, isUs, byCompetition, slugify } from '../lib/stats.mjs';
import { siteFooter, sitePreMain, siteHeader, oppBadge } from './home.mjs';
import { sourceNote } from '../lib/blocks.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
/* Photographs are filed by shirt number. The number is the filename only: it
   is never rendered, here or anywhere else on the site. */
/* Resolved in src/lib/dataset.mjs, not here. Each page kept its own copy of
   "is there a file for this shirt number", and shirt numbers get reused: a new
   signing given number 12 inherited a previous holder's photograph. */

const STAR = '/assets/badge/sue-angels-badge-star.webp';
const ARROW = '<span aria-hidden="true">→</span>';
const FULLTIME = 'https://fulltime.thefa.com/';

/* The sponsors' names belong on the sponsor page, not in a tab strip. */
const shortComp = (name) => String(name || '')
  .replace(/^Chipotle UK /, '')
  .replace(/^Supreme Trophies /, '')
  .replace(/^Surrey FA Sunday Lower Junior County Cup$/, 'Surrey FA Cup');

const shortClub = (name) => String(name || '')
  .replace(/^Sue.s Angels FC$/, "Sue's Angels")
  .replace(/\s+FC 2\.0$/, ' 2.0')
  .replace(/\s+FC$/, '');

const rail = (n, label, ref) => `<div class="xrail" aria-hidden="true">
      <span class="xrail__l"><span class="xrail__n">${esc(String(n).padStart(2, '0'))}</span><span class="xrail__t">${esc(label)}</span></span>
      <span class="xrail__r">${esc(ref)}</span>
    </div>`;

export function league(d) {
  const shotFor = (num) => (d.shotFor ? d.shotFor(num, d.currentSeason) : '');
  const table = d.table || [];
  const next = d.nextDivisionTable || {};
  const charts = d.leagueScorersByComp || { all: d.leagueScorers || [] };
  const results = (d.leagueResults || []).slice();
  const up = d.promotionSpots || 0;

  /* The badge IS the image, with no wrapper element. This page renders 316 of
     them across the division archive, and a wrapping span was 30 bytes and a
     DOM node each for nothing that padding and object-fit cannot do. */
  const badge = (club) => (isUs(club)
    ? `<img class="lg-badge is-us" src="${STAR}" alt="Sue’s Angels FC star" width="26" height="26" loading="lazy" />`
    : oppBadge(club, d.badges, 26, 26, 'lg-badge'));

  /* ================= HERO ================= */
  const hero = `<section class="lg-hero" aria-labelledby="lg-h">
      <div class="wrap">
        <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> ${esc(CLUB.league)}</p>
        <h1 class="lg-hero__title" id="lg-h">The league<span class="volt">.</span></h1>
        <p class="lg-hero__lede">${esc(d.divisionOf(d.tableSeason))} ${esc(d.tableSeason)}: the table, every
          result across the division, and the players topping its charts. Taken from the league's
          own record rather than from ours.</p>
      </div>
    </section>`;

  /* ================= 01 THE TABLE ================= */
  /* ONE STANDINGS RENDERER, TWO DIVISIONS.

     It was written inline inside the League Ten panel, so League Eight - the
     division the club actually plays in this season - had nowhere for a
     figure to go. Its panel could draw a list of club NAMES and nothing else,
     which meant that on the first Sunday of the season "update the league
     table" was a code change rather than a data one, and nobody would have
     found that out until the results were in.

     Same markup for both, so a live table cannot drift from the finished one
     it sits beside under a tab. `up` is the promotion cut and is 0 for a
     division where nothing has been decided yet. */
  const standings = (rows, caption, up = 0) => `<div class="lg-tablewrap">
            <table class="lg-tbl">
              <caption class="sr-only">${esc(caption)}</caption>
              <thead>
                <tr>
                  <th scope="col" class="lg-tbl__pos">#</th>
                  <th scope="col" class="lg-tbl__club">Club</th>
                  <th scope="col"><abbr title="Played">P</abbr></th>
                  <th scope="col"><abbr title="Won">W</abbr></th>
                  <th scope="col"><abbr title="Drawn">D</abbr></th>
                  <th scope="col"><abbr title="Lost">L</abbr></th>
                  <th scope="col"><abbr title="Goals for">GF</abbr></th>
                  <th scope="col"><abbr title="Goals against">GA</abbr></th>
                  <th scope="col"><abbr title="Goal difference">GD</abbr></th>
                  <th scope="col" class="lg-tbl__pts"><abbr title="Points">Pts</abbr></th>
                </tr>
              </thead>
              <tbody>
                ${rows.map((r) => `<tr${r.us ? ' class="is-us"' : ''}${up && r.pos <= up ? ' data-up' : ''}>
                  <td class="lg-tbl__pos">${esc(r.pos)}</td>
                  <th scope="row" class="lg-tbl__club">${badge(r.club)}${esc(shortClub(r.club))}</th>
                  <td>${esc(r.played)}</td>
                  <td>${esc(r.won)}</td>
                  <td>${esc(r.drawn)}</td>
                  <td>${esc(r.lost)}</td>
                  <td>${esc(r.goalsFor)}</td>
                  <td>${esc(r.goalsAgainst)}</td>
                  <td>${r.goalDifference > 0 ? '+' : ''}${esc(r.goalDifference)}</td>
                  <td class="lg-tbl__pts">${esc(r.points)}</td>
                </tr>`).join('\n                ')}
              </tbody>
            </table>
          </div>`;

  /* The new division's own standing, when the league has published one.
     Empty until then, and the panel falls back to the club list. */
  const nextRows = next.rows || [];

  const tableBand = `<section class="sec lg-table" id="table" aria-labelledby="lg-tbl-h">
      <div class="wrap">
        ${rail(1, 'The standings', `${d.divisionOf(d.tableSeason)} ${d.tableSeason}`)}
        <h2 class="h2 rv" id="lg-tbl-h">How the division <span class="volt">finished.</span></h2>

        <div class="lg-tabs rv" data-league-tabs>
          <a class="lg-tab is-on" href="#table" data-league="ten">
            <b>${esc(d.divisionOf(d.tableSeason))}</b><i>${esc(d.tableSeason)} · final</i>
          </a>
          <a class="lg-tab" href="#table" data-league="eight">
            <b>${esc(next.division || d.divisionOf(d.nextSeason))}</b><i>${esc(next.season || d.nextSeason)} · ${next.started ? 'in play' : 'not started'}</i>
          </a>
        </div>

        <div class="lg-panel rv" data-league-panel="ten">
          ${standings(table, `${d.divisionOf(d.tableSeason)} ${d.tableSeason} final standings`, up)}
          ${up ? `<p class="lg-note">Top ${esc(up)} promoted to ${esc(d.divisionOf(d.nextSeason))}.</p>` : ''}
        </div>

        <div class="lg-panel rv" data-league-panel="eight">
          ${nextRows.length ? `${standings(nextRows, `${next.division || d.divisionOf(d.nextSeason)} ${next.season || d.nextSeason} standings`, 0)}
          <p class="lg-note">${esc(`${(() => {
    /* Guarded rather than reading nextRows[0], which is the same trap the
       campaign band fell into: unreachable while the caller checks the
       length, and a crash the moment anything renders this directly. */
    const most = nextRows.reduce((n, r) => Math.max(n, r.played || 0), 0);
    return most === 0 ? 'Named alphabetically until a match is played.'
      : `After ${most} matchday${most === 1 ? '' : 's'}.`;
  })()} The league's own table.`)}</p>`
    : `<div class="lg-fresh">
            <p class="lg-fresh__k">${esc(next.division || d.divisionOf(d.nextSeason))} · ${esc(next.season || d.nextSeason)}</p>
            <p class="lg-fresh__t">Not a table yet.</p>
            <p class="lg-fresh__b">No match has been played, so every club sits on nothing and the
              league lists them alphabetically. These are the ${esc((next.clubs || []).length)} sides
              ${esc(CLUB.short)} come up against, in that order rather than any standing.</p>
          </div>
          <ol class="lg-clubs">
            ${(next.clubs || []).map((c) => `<li${isUs(c) ? ' class="is-us"' : ''}>
              ${badge(c)}<span>${esc(shortClub(c))}</span>
            </li>`).join('\n            ')}
          </ol>`}
        </div>
      </div>
    </section>`;

  /* ================= 02 LEADING SCORERS =================
     Our players carry their face in the chart. The league publishes names
     only, so a photograph is something this page can add that FA Full-Time
     cannot, and it makes ours findable in a list of twenty-five. Matched on
     name against the squad: an opponent never matches, and one of ours with
     no photograph on file falls back to the crest rather than a gap. */
  const shotByName = new Map();
  for (const p of d.squad || []) {
    const src = shotFor(p.num);
    if (src) shotByName.set(slugify(p.name), src);
  }
  const face = (row) => {
    if (!row.us) return '';
    const src = shotByName.get(slugify(row.name));
    return `<span class="lg-sc__face">${src
      ? `<img src="${attr(src)}" alt="" width="34" height="34" loading="lazy" decoding="async" />`
      : `<img class="lg-sc__face--crest" src="${STAR}" alt="Sue’s Angels FC star" width="18" height="22" loading="lazy" decoding="async" />`}</span>`;
  };

  const chartRows = (rows) => rows.map((r) => `<tr${r.us ? ' class="is-us"' : ''}>
                  <td class="lg-sc__pos">${esc(r.pos)}</td>
                  <th scope="row" class="lg-sc__who">${face(r)}<span>${esc(r.name)}</span></th>
                  <td class="lg-sc__club">${badge(r.club)}${esc(shortClub(r.club))}</td>
                  <td>${esc(r.goals)}</td>
                  <td>${r.assists === null || r.assists === undefined ? '·' : esc(r.assists)}</td>
                  <td>${esc(r.apps)}</td>
                </tr>`).join('\n                ');

  const ours = (charts.league || []).filter((r) => r.us).length;
  const scorersBand = (charts.all || []).length ? `<section class="sec lg-scorers" aria-labelledby="lg-sc-h">
      <div class="wrap">
        ${rail(2, 'Topping the charts', `${ours} of the top ${esc((charts.league || []).length)} are ours`)}
        <h2 class="h2 rv" id="lg-sc-h">The division's leading <span class="volt">scorers.</span></h2>
        <div class="lg-chiprow rv" data-chart-tabs>
          <a class="lg-chip is-on" href="#scorers" data-chart="league">League only</a>
          <a class="lg-chip" href="#scorers" data-chart="all">All competitions</a>
        </div>
        ${['league', 'all'].map((which) => `<div class="lg-panel rv" data-chart-panel="${which}" id="${which === 'league' ? 'scorers' : `scorers-${which}`}">
          <div class="lg-tablewrap">
            <table class="lg-tbl lg-sc">
              <caption class="sr-only">Leading scorers, ${which === 'league' ? `${d.divisionOf(d.tableSeason)} only` : 'all competitions'}</caption>
              <thead>
                <tr>
                  <th scope="col" class="lg-sc__pos">#</th>
                  <th scope="col" class="lg-sc__who">Player</th>
                  <th scope="col" class="lg-sc__club">Club</th>
                  <th scope="col"><abbr title="Goals">G</abbr></th>
                  <th scope="col"><abbr title="Assists">A</abbr></th>
                  <th scope="col"><abbr title="Appearances">Apps</abbr></th>
                </tr>
              </thead>
              <tbody>
                ${chartRows(charts[which] || [])}
              </tbody>
            </table>
          </div>
        </div>`).join('\n        ')}
        <p class="lg-note">The two charts differ on purpose: the league's own record counts cup
          football in one and not the other.</p>
      </div>
    </section>` : '';

  /* ================= 03 AROUND THE LEAGUE =================
     Ninety results across ten clubs. As one flat list this band ran to
     10,000px, more than half the page, and nobody scrolls a wall of ninety
     rows. Grouped by month it is nine groups of about ten.

     Native <details>, not a JS accordion: every result is in the HTML and
     reachable with scripting off, which a CSS-hidden panel would not be. The
     summary carries our own record for that month, because that is the line
     a supporter is actually scanning for. */
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  /* Dates arrive as "12 Oct 25". Sort on a real key rather than the string,
     which would put "10 May" before "3 May". */
  const parts = (s) => {
    const m = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2})$/.exec(String(s || '').trim());
    if (!m) return null;
    const mi = MONTHS.findIndex((x) => x.slice(0, 3).toLowerCase() === m[2].toLowerCase());
    if (mi < 0) return null;
    return { day: +m[1], month: mi, year: 2000 + +m[3] };
  };

  const groups = new Map();
  for (const r of results) {
    const p = parts(r.date);
    /* A date the parser does not recognise still has to appear somewhere, so
       it goes to its own group rather than being dropped silently. */
    const key = p ? `${p.year}-${String(p.month).padStart(2, '0')}` : 'unknown';
    if (!groups.has(key)) {
      groups.set(key, { key, label: p ? `${MONTHS[p.month]} ${p.year}` : 'Undated', rows: [] });
    }
    groups.get(key).rows.push({ ...r, sort: p ? p.year * 10000 + p.month * 100 + p.day : 0 });
  }
  const ordered = [...groups.values()].sort((a, b) => a.key.localeCompare(b.key));
  for (const g of ordered) g.rows.sort((a, b) => a.sort - b.sort);

  /* Three of the eighteen were awarded as walkovers and carry no score. Read
     naively, +undefined is NaN, both comparisons are false and the result
     falls through to a draw, which would have printed three D's against a
     published record of W18 D0 L0. A walkover is a win for whoever it was
     awarded to and adds no goals: the same rule the stats engine applies. */
  const ourResult = (r) => {
    if (r.wo) return isUs(r.home) === (r.wo === 'home') ? 'W' : 'L';
    const gf = isUs(r.home) ? +r.hs : +r.as;
    const ga = isUs(r.home) ? +r.as : +r.hs;
    if (!Number.isFinite(gf) || !Number.isFinite(ga)) return null;
    return gf > ga ? 'W' : gf < ga ? 'L' : 'D';
  };
  /* Our record inside a month, as letters. Weight and structure carry the
     difference, never a second hue. */
  const ourForm = (rows) => rows
    .filter((r) => isUs(r.home) || isUs(r.away))
    .map(ourResult)
    .filter(Boolean);

  /* A bare "-" read as missing data rather than as an awarded tie. The rest
     of the site prints W/O, so this does too. */
  const scoreCell = (r) => {
    if (r.wo) return '<abbr class="lg-res__wo" title="Awarded as a walkover">W/O</abbr>';
    const hasScore = Number.isFinite(+r.hs) && Number.isFinite(+r.as);
    return hasScore ? `${esc(r.hs)}-${esc(r.as)}` : '<span class="lg-res__wo">·</span>';
  };

  const resultRows = (rows) => rows.map((r) => {
    const involved = isUs(r.home) || isUs(r.away);
    return `<li class="lg-res${involved ? ' is-us' : ''}${r.wo ? ' is-wo' : ''}">
              <span class="lg-res__date">${esc(fmtDate(r.date))}</span>
              <span class="lg-res__side${isUs(r.home) ? ' is-us' : ''}">${esc(shortClub(r.home))}${badge(r.home)}</span>
              <span class="lg-res__score">${scoreCell(r)}</span>
              <span class="lg-res__side is-away${isUs(r.away) ? ' is-us' : ''}">${badge(r.away)}${esc(shortClub(r.away))}</span>
            </li>`;
  }).join('\n            ');

  const aroundBand = results.length ? `<section class="sec lg-around" aria-labelledby="lg-ar-h">
      <div class="wrap">
        ${rail(3, 'Around the league', `${results.length} results`)}
        <h2 class="h2 rv" id="lg-ar-h">Every result in the <span class="volt">division.</span></h2>
        <p class="lg-around__lede rv">Grouped by month. Our own fixtures are marked, and the
          letters on each month are how ${esc(CLUB.short)} finished it.</p>
        <div class="lg-months rv">
          ${ordered.map((g, i) => {
    const form = ourForm(g.rows);
    return `<details class="lg-month"${i === 0 ? ' open' : ''}>
            <summary class="lg-month__sum">
              <span class="lg-month__name">${esc(g.label)}</span>
              <span class="lg-month__count">${g.rows.length} result${g.rows.length === 1 ? '' : 's'}</span>
              <span class="lg-month__form">${form.length
      ? form.map((f) => `<b class="lg-f lg-f--${f.toLowerCase()}">${f}</b>`).join('')
      : '<i class="lg-month__off">no fixture</i>'}</span>
              <span class="lg-month__chev" aria-hidden="true">+</span>
            </summary>
            <ol class="lg-results">
            ${resultRows(g.rows)}
            </ol>
          </details>`;
  }).join('\n          ')}
        </div>
      </div>
    </section>` : '';

  /* ================= 04 EVERY COMPETITION =================
     The league is one of five competitions the club entered, and the other
     four had no home on the site at all. This is the club's OWN record, not
     FA Full-Time's, so it is stated as such: the two count a walkover
     differently and the page says so rather than quietly reconciling them.

     Built from the match record, so a cup entered next season appears here
     the moment its first result is saved. Nothing to add by hand. */
  const comps = byCompetition((d.played || []).filter((m) => m.season === d.currentSeason));
  const compRun = (name) => (d.played || [])
    .filter((m) => m.competition === name && m.season === d.currentSeason)
    .slice()
    .sort((a, b) => (a.iso || '').localeCompare(b.iso || ''));

  const compsBand = comps.length ? `<section class="sec lg-comps" id="comps" aria-labelledby="lg-cp-h">
      <div class="wrap">
        ${rail(4, 'Every competition', `${comps.length} entered`)}
        <h2 class="h2 rv" id="lg-cp-h">Not just the <span class="volt">league.</span></h2>
        <p class="lg-around__lede rv">${esc(CLUB.short)} played in ${esc(comps.length)} competitions
          in ${esc(d.currentSeason)}. This is the club's own record of each.</p>

        <div class="lg-chiprow rv" role="tablist" aria-label="Competition" data-comp-tabs>
          ${comps.map((c, i) => `<a class="lg-chip${i === 0 ? ' is-on' : ''}" role="tab"
            id="cp-t-${esc(slugify(c.competition))}" href="#cp-${esc(slugify(c.competition))}"
            aria-selected="${i === 0 ? 'true' : 'false'}" aria-controls="cp-${esc(slugify(c.competition))}"
            data-comp="${attr(slugify(c.competition))}">${esc(shortComp(c.competition))}</a>`).join('\n          ')}
        </div>

        ${comps.map((c, i) => {
    const run = compRun(c.competition);
    return `<div class="lg-panel rv" role="tabpanel" tabindex="0"
          id="cp-${esc(slugify(c.competition))}" aria-labelledby="cp-t-${esc(slugify(c.competition))}"
          data-comp-panel="${attr(slugify(c.competition))}"${i === 0 ? '' : ' hidden'}>
          <p class="lg-cp__name">${esc(c.competition)}</p>
          <ul class="lg-cp__sum">
            <li><b>${esc(c.played)}</b><i>Played</i></li>
            <li><b>${esc(c.won)}</b><i>Won</i></li>
            <li><b>${esc(c.drawn)}</b><i>Drawn</i></li>
            <li><b>${esc(c.lost)}</b><i>Lost</i></li>
            <li><b>${esc(c.goalsFor)}</b><i>Scored</i></li>
            <li><b>${esc(c.goalsAgainst)}</b><i>Conceded</i></li>
            <li><b>${esc(c.cleanSheets)}</b><i>Clean sheets</i></li>
          </ul>
          <ol class="lg-results lg-cp__run">
            ${run.map((m) => `<li class="lg-res${m.isWalkover ? ' is-wo' : ''} is-us">
              <span class="lg-res__date">${esc(fmtDate(m.date))}${m.round
      ? `<i class="lg-res__round">${esc(m.roundShort || m.round)}</i>` : ''}</span>
              <span class="lg-res__side${m.weAreHome ? ' is-us' : ''}">${esc(shortClub(m.weAreHome ? CLUB.name : m.opponent))}${badge(m.weAreHome ? CLUB.name : m.opponent)}</span>
              <span class="lg-res__score">${m.isWalkover
      ? '<abbr class="lg-res__wo" title="Awarded as a walkover">W/O</abbr>'
      : esc(m.scoreline || '·')}</span>
              <span class="lg-res__side is-away${m.weAreHome ? '' : ' is-us'}">${badge(m.weAreHome ? m.opponent : CLUB.name)}${esc(shortClub(m.weAreHome ? m.opponent : CLUB.name))}</span>
            </li>`).join('\n            ')}
          </ol>
        </div>`;
  }).join('\n        ')}
        <p class="lg-note">The club's own record. It counts a walkover as played and won with no
          goals, which is why these figures and the league's own table agree on points and not
          always on goals.</p>
      </div>
    </section>` : '';

  /* ================= SOURCE ================= */
  /* GO AND CHECK IT. Everything above is transcribed, and the one Full-Time
     link on the site pointed at fulltime.thefa.com, which is a search box: a
     citation nobody can follow is barely a citation. These are the league's
     own live pages for this exact division, built from the four ids in
     src/data/league-eight-2627.json rather than written out.

     `d.fulltime` is null when a division has no ids on record, and then the
     row is not drawn and the prose falls back to naming Full-Time without
     pretending to link into it. A half-built query lands a reader in somebody
     else's league, which is worse than no link because it looks like it
     worked. */
  const ft = d.fulltime;
  const liveRow = ft ? `<div class="lg-chiprow lg-source__live rv">
          ${[
    ['table', 'The table, live'],
    ['fixtures', 'Fixtures'],
    ['scorers', 'Leading scorers'],
  ].map(([key, label]) => `<a class="lg-chip" href="${attr(ft[key])}" rel="noopener noreferrer" target="_blank">${esc(label)}<span class="sr-only"> on FA Full-Time, opens in a new tab</span></a>`).join('\n          ')}
        </div>` : '';

  const sourceBand = `<section class="sec lg-source">
      <div class="wrap">
        <p class="lg-source__p">Table, division results and player charts on this page are the
          league's own record, captured from
          <a href="${attr(ft ? ft.table : FULLTIME)}" rel="noopener" target="_blank">FA Full-Time</a>, the official
          record for the ${esc(CLUB.league)}. They are kept separate from ${esc(CLUB.short)}'
          match data, which is what every other page on this site is built from, and the two
          count some things differently.${ft ? ` What is on this page is a snapshot; these
          are ${esc(next.division || d.divisionOf(d.nextSeason))}'s own pages, updated by the league.` : ''}</p>
        ${liveRow}
      </div>
    </section>`;

  /* ================= CTA ================= */
  const ctaBand = `<section class="sec sec--cta lg-cta" aria-labelledby="lg-cta-h">
      <div class="wrap">
        <div class="cta2">
          <span class="cta2__glow" aria-hidden="true"></span>
          <img class="cta2__badge" src="${STAR}" alt="Sue’s Angels FC star" width="500" height="620" loading="lazy" decoding="async" aria-hidden="true" />
          <div class="cta2__glass glassbox rv">
            <p class="eyebrow cta2__eyebrow">${esc(d.titleSeason)} · Champions</p>
            <h2 class="h2" id="lg-cta-h">Won at the first <span class="volt">attempt.</span></h2>
            <p class="cta2__sub">Eighteen games, eighteen wins, and promotion to
              ${esc(d.divisionOf(d.nextSeason))}. The season told properly.</p>
            <div class="cta2__btns">
              <a class="btn btn--volt" href="/champions.html">The title-winning season ${ARROW}</a>
              <a class="btn btn--ghost" href="/results.html">Every result</a>
            </div>
          </div>
        </div>
      </div>
    </section>`;

  return {
    body: siteHeader('/league.html') + hero + tableBand + scorersBand + aroundBand + sourceNote(['fulltime', 'surreyfa'])
      + compsBand + sourceBand + ctaBand,
    bodyClass: 'is-home is-sub is-league',
    css: 'home.css',
    shell: 'home',
    preMain: sitePreMain(),
    footerHtml: siteFooter(),
    schema: [{
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `The league · ${CLUB.name}`,
      breadcrumb: {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${CLUB.site}/` },
          { '@type': 'ListItem', position: 2, name: 'League', item: `${CLUB.site}/league.html` },
        ],
      },
    }],
  };
}
