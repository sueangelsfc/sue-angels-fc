/* ==========================================================================
   FOOTBALL BLOCKS
   Fixture cards, result cards, scoreboards, player cards, tables, timelines.
   Every one is fed from the derived dataset so no page can invent a figure.
   ========================================================================== */
import { esc, attr, icon, clubCrest, crest, emptyState } from './html.mjs';
import { fmtDate } from './stats.mjs';
import { SOURCES } from './club.mjs';

/* ---- Fixture / result card -------------------------------------------- */
export function fixtureCard(m, badges, { glass = false, href = true } = {}) {
  const side = (name, isUs) => `
    <div class="fixture__side${isUs ? '' : ''}">
      ${isUs ? `<span class="crest">${crest()}</span>` : clubCrest(name, badges)}
      <span class="fixture__name truncate">${esc(isUs ? 'Sue’s Angels' : name)}</span>
    </div>`;

  const homeIsUs = m.weAreHome;
  const middle = m.played
    ? m.isWalkover
      ? `<span class="fixture__vs" title="Awarded as a walkover">W/O</span>`
      : `<span class="fixture__score">${esc(m.hs)}<span aria-hidden="true">–</span>${esc(m.as)}</span>`
    : `<span class="fixture__vs">v</span>`;

  const inner = `
    <div class="fixture__comp">
      <span class="truncate">${esc(m.competition)}</span>
      ${m.outcome ? `<span class="rform rform--${m.outcome.toLowerCase()}" aria-label="${m.outcome === 'W' ? 'Won' : m.outcome === 'D' ? 'Drawn' : 'Lost'}">${esc(m.outcome)}</span>` : ''}
    </div>
    <div class="fixture__teams">
      ${side(m.home, homeIsUs)}
      ${middle}
      <div class="fixture__side fixture__side--away">
        ${!homeIsUs ? `<span class="crest">${crest()}</span>` : clubCrest(m.away, badges)}
        <span class="fixture__name truncate">${esc(!homeIsUs ? 'Sue’s Angels' : m.away)}</span>
      </div>
    </div>
    <div class="fixture__when">
      ${icon('calendar', '')}<span>${esc(fmtDate(m.date, { weekday: true }))}</span>
      ${m.kick ? `<span aria-hidden="true">·</span>${icon('clock', '')}<span>${esc(m.kick)}</span>` : ''}
    </div>
    ${m.venue || m.resultNote ? `<div class="fixture__foot">
      ${m.venue ? `<span class="truncate">${icon('pin', '')} ${esc(m.venue)}</span>` : '<span></span>'}
      ${m.resultNote ? `<span>${esc(m.resultNote)}</span>` : (m.played ? '<span>Match centre →</span>' : '')}
    </div>` : ''}`;

  const cls = `fixture ${glass ? 'glass glass--interactive' : 'panel'}`;
  return href && m.played
    ? `<a class="${cls}" href="/matches/${attr(m.slug)}.html" aria-label="${attr(m.title)}, match centre">${inner}</a>`
    : `<article class="${cls}">${inner}</article>`;
}

/* ---- Scoreboard (match detail hero) ---------------------------------- */
export function scoreboard(m, badges) {
  // Exactly one crest box per side: our own inline shield, or the opponent's.
  const teamBox = (name, isUs) => isUs
    ? `<div class="scoreboard__team"><span class="crest crest--lg">${crest()}</span><span class="scoreboard__name">Sue’s Angels FC</span></div>`
    : `<div class="scoreboard__team">${clubCrest(name, badges, 'crest--lg')}<span class="scoreboard__name">${esc(name)}</span></div>`;

  const centre = m.played
    ? m.isWalkover
      ? `<div style="text-align:center"><span class="scoreboard__score">W/O</span><p class="eyebrow eyebrow--muted" style="margin-top:var(--space-2)">Walkover</p></div>`
      : `<div style="text-align:center">
           <span class="scoreboard__score">${esc(m.hs)}<span style="opacity:.4">–</span>${esc(m.as)}</span>
           ${m.decidedOnPenalties ? '<p class="eyebrow eyebrow--muted" style="margin-top:var(--space-2)">On penalties</p>' : ''}
         </div>`
    : `<div style="text-align:center"><span class="scoreboard__score" style="font-size:var(--step-4)">v</span></div>`;

  return `<div class="scoreboard glass glass--lg">
    <div class="scoreboard__grid">
      ${teamBox(m.home, m.weAreHome)}
      ${centre}
      ${teamBox(m.away, !m.weAreHome)}
    </div>
  </div>`;
}

/* ---- Player card ------------------------------------------------------ */
export function playerCard(p) {
  const initials = `${(p.first || '').charAt(0)}${(p.last || '').charAt(0)}`.toUpperCase();
  const shot = p.hasPhoto
    ? `<img src="/media/players/${attr(p.num)}.webp" alt="${attr(p.name)}" width="300" height="400" loading="lazy" decoding="async">`
    : `<span class="player__initials" aria-hidden="true">${esc(initials)}</span>`;
  return `<a class="player" href="/players/${attr(p.slug)}.html">
    <div class="player__shot">
      ${shot}
      <span class="player__num" aria-hidden="true">${esc(p.num)}</span>
    </div>
    <div class="player__body">
      <span class="player__name">${esc(p.name)}</span>
      <span class="player__pos">${esc(p.position)}</span>
      <span class="player__line">
        <span><strong>${esc(p.apps)}</strong> apps</span>
        <span><strong>${esc(p.goals)}</strong> goals</span>
        <span><strong>${esc(p.assists)}</strong> assists</span>
      </span>
    </div>
  </a>`;
}

/* ---- League table ---------------------------------------------------- */
export function leagueTable(rows, { caption = '', promotionSpots = 0 } = {}) {
  if (!rows.length) return emptyState({ title: 'No table yet', body: 'The division table appears once the season is under way.' });
  const body = rows.map((r) => `<tr${r.us ? ' data-us="true"' : ''}>
    <td>${esc(r.pos)}</td>
    <th scope="row" class="cell-club">${esc(r.club)}</th>
    <td>${esc(r.played)}</td>
    <td>${esc(r.won)}</td>
    <td>${esc(r.drawn)}</td>
    <td>${esc(r.lost)}</td>
    <td>${esc(r.goalsFor)}</td>
    <td>${esc(r.goalsAgainst)}</td>
    <td>${r.goalDifference > 0 ? '+' : ''}${esc(r.goalDifference)}</td>
    <td><strong>${esc(r.points)}</strong></td>
  </tr>`).join('');

  return `<div class="table-wrap scroll-x">
    <table class="data">
      ${caption ? `<caption>${esc(caption)}</caption>` : ''}
      <thead>
        <tr>
          <th scope="col"><abbr title="Position">Pos</abbr></th>
          <th scope="col">Club</th>
          <th scope="col"><abbr title="Played">Pl</abbr></th>
          <th scope="col"><abbr title="Won">W</abbr></th>
          <th scope="col"><abbr title="Drawn">D</abbr></th>
          <th scope="col"><abbr title="Lost">L</abbr></th>
          <th scope="col"><abbr title="Goals for">GF</abbr></th>
          <th scope="col"><abbr title="Goals against">GA</abbr></th>
          <th scope="col"><abbr title="Goal difference">GD</abbr></th>
          <th scope="col"><abbr title="Points">Pts</abbr></th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  </div>`;
}

/* THE STATS TABLE THAT PUBLISHED SQUAD NUMBERS IS GONE, and so is
   templates/pages.mjs, the 855 lines that were its only caller. Nothing
   imported them: `import * as P` was in build.mjs and every `P.` in the file
   turned out to be `NO_SITEMAP.has`. Rebuilding without it produced every one
   of the 108 pages byte for byte.

   Worth naming what it was carrying rather than just deleting it quietly. Its
   first column was `<abbr title="Squad number">No.</abbr>`, a published
   column of shirt numbers, on a site whose rule is that it never shows one.
   The live stats page comes from templates/stats.mjs and its left column is a
   RANK, which is the rule working. Dead code does not stop being a liability
   for being unreachable: it is the version somebody wires back up. */

/* ---- Form guide ------------------------------------------------------ */
export function formGuideBlock(form) {
  if (!form.length) return '';
  return `<div class="row row--tight" role="list" aria-label="Recent form, most recent first">
    ${form.map((f) => `<span class="rform rform--${f.outcome.toLowerCase()}" role="listitem" title="${attr(f.label)}">${esc(f.outcome)}</span>`).join('')}
  </div>`;
}

/* ---- Line-up --------------------------------------------------------- */
export function lineupBlock(m, nameFor) {
  const d = m.detail;
  if (!d || !(d.starters || []).length) return '';
  const row = (x, extra = '') => `<div class="lineup__row">
    <span class="lineup__n">${esc(x.num)}</span>
    <span class="truncate">${esc(nameFor(x.num))}${extra}</span>
    <span class="lineup__pos">${esc((x.positions || []).join(' / ') || '')}</span>
  </div>`;

  const cap = d.captain;
  const starters = d.starters.map((s) => row(s, s.num === cap ? ' <abbr title="Captain" style="color:var(--brand-text)">(C)</abbr>' : '')).join('');
  const bench = (d.bench || []).map((b) => row(b)).join('');

  return `<div class="lineup">
    <div class="lineup__group">
      <span class="lineup__glabel">Starting eleven${d.formation ? ` · ${esc(d.formation)}` : ''}</span>
      ${starters}
    </div>
    ${bench ? `<div class="lineup__group">
      <span class="lineup__glabel">Substitutes</span>
      ${bench}
    </div>` : ''}
  </div>`;
}

/* ---- Timeline -------------------------------------------------------- */
export function timelineBlock(events) {
  if (!events.length) return '';
  return `<div class="timeline">
    ${events.map((e) => `<div class="tl-item" data-kind="${attr(e.kind)}">
      <span class="tl-item__min">${esc(e.min ? `${e.min}'` : '–')}</span>
      <span class="tl-item__text">${esc(e.text)}</span>
    </div>`).join('')}
  </div>`;
}

/* ---- Article card --------------------------------------------------- */
export function articleCard(a, { glass = false } = {}) {
  const cover = a.cover
    ? `<div class="card__media"><img src="${attr(a.cover)}" alt="" width="600" height="338" loading="lazy" decoding="async" style="aspect-ratio:16/9"></div>`
    : '';
  return `<a class="card card--link ${glass ? 'glass' : ''}" href="/news/${attr(a.slug)}.html">
    ${cover}
    <span class="badge badge--brand" style="align-self:flex-start">${esc(a.category)}</span>
    <h3 class="card__title">${esc(a.title)}</h3>
    ${a.lede ? `<p style="font-size:var(--step--1);color:var(--text-muted)">${esc(String(a.lede).split('\n')[0].slice(0, 150))}</p>` : ''}
    <span class="card__meta">${esc(a.date)}</span>
  </a>`;
}

/* ---- Recognition / honour ------------------------------------------- */
export function honourRow(r, nameFor) {
  const who = r.player != null ? nameFor(r.player) : r.name || r.winner || '';
  const label = r.type === 'potm' ? `Player of the Month${r.month ? ` · ${esc(r.month)}` : ''}`
    : r.type === 'season' ? 'End of season'
    : r.title || r.label || 'Recognition';
  const mark = r.type === 'potm' ? 'POTM' : r.type === 'season' ? 'EOS' : '★';
  return `<div class="honour glass">
    <span class="honour__mark" aria-hidden="true">${mark}</span>
    <div class="honour__body">
      <p class="honour__title">${esc(who || label)}</p>
      <p class="honour__meta">${label}</p>
    </div>
  </div>`;
}

/* ==========================================================================
   WHERE THIS PAGE'S FIGURES CAME FROM

   One block, because a source line written per page is a source line that
   ends up saying something slightly different on each of them. Takes the keys
   of SOURCES the page genuinely rests on and names them in a sentence.

   `rel="noopener"` and a new tab, like every other outbound link here. NOT
   `nofollow`: these are citations the club is deliberately making, and telling
   a search engine not to follow a citation is the opposite of the point.
   ========================================================================== */
export function sourceNote(keys, { lead = 'Checked against' } = {}) {
  const list = (keys || []).map((k) => SOURCES[k]).filter(Boolean);
  if (!list.length) return '';
  const links = list.map((sx) =>
    `<a href="${attr(sx.href)}" rel="noopener" target="_blank">${esc(sx.name)}</a>`);
  const joined = links.length === 1 ? links[0]
    : `${links.slice(0, -1).join(', ')} and ${links[links.length - 1]}`;
  const what = list.length === 1 ? ` for ${esc(list[0].what)}` : '';
  return `<p class="srcnote">${esc(lead)} ${joined}${what}.</p>`;
}
