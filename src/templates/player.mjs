/* ==========================================================================
   PLAYER PROFILE  (/players/<slug>.html)

   One page per player, built from that player's own match records.

   Everything is derived once, in playerProfile(), and read from there. The
   design this replaces worked the same figures out twice and disagreed with
   itself on the same screen: its rings said thirteen clean sheets while the
   panel underneath said sixteen, and its conceded count read 25 in one place
   and 19 in another. A single derivation cannot do that.

   The page is role-aware. A goalkeeper's story is clean sheets and goals
   conceded; an outfield player's is goals, assists and involvement. Showing a
   keeper's "goals per game" or an attacker's "shutout rate" is filler, so
   neither appears.

   Season tabs are real: every figure on the page is recomputed per season by
   the same function, and each season ships its own panel. With the script
   blocked the panels stack under their own headings rather than vanishing.

   26/27 has no matches in the record yet, so its panel says so plainly. A tab
   that silently showed zeroes would read as a player who turned up and did
   nothing rather than as a season that has not kicked off.

   One thing the reference had that is deliberately absent: a radial breakdown
   of six unrelated percentages. Availability, starts and clean-sheet rate
   share no scale, so the petals invited a comparison of areas that do not
   compare. The same numbers are in the panels, labelled. A "when they score"
   chart was considered and dropped for a harder reason: only ten of the
   club's 137 goals carry a minute, so it would be a picture of 7% of the
   record dressed as the whole of it.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc, attr } from '../lib/html.mjs';
import { CLUB } from '../lib/club.mjs';
import { BODY_PARTS, ZONES, SITUATIONS, ASSIST_TYPES } from '../lib/football.mjs';
import { POSITION_LABEL, POSITION_XY, positionName } from '../lib/positions.mjs';
import { playerProfile, fmtDate } from '../lib/stats.mjs';
import { siteFooter, sitePreMain, siteHeader, auraFor, oppBadge } from './home.mjs';

const STAR = '/assets/badge/sue-angels-badge-star.webp';
const ARROW = '<span aria-hidden="true">→</span>';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const shotFor = (num) => {
  try {
    return fs.existsSync(path.join(ROOT, 'assets', 'players', `${num}.webp`))
      ? `/assets/players/${num}.webp` : '';
  } catch { return ''; }
};

const shortClub = (name) => String(name || '')
  .replace(/\s+FC 2\.0$/, '')
  .replace(/\s+FC$/, '');

/* Competition names are sponsored and long. The sponsor belongs on the
   competition's own page, not squeezed into a table cell. */
const shortComp = (name) => String(name || '')
  .replace(/^Chipotle UK /, '')
  .replace(/^Supreme Trophies /, '')
  .replace(/^Surrey FA Sunday Lower Junior County Cup$/, 'Surrey FA Cup');

const rail = (n, label, ref) => `<div class="xrail" aria-hidden="true">
      <span class="xrail__l"><span class="xrail__n">${esc(String(n).padStart(2, '0'))}</span><span class="xrail__t">${esc(label)}</span></span>
      <span class="xrail__r">${esc(ref)}</span>
    </div>`;

/* Positions come from src/lib/positions.mjs: one list with a full name and a
   place on the pitch for every code the club's records have ever used. The
   two copies that used to live here knew different subsets, so a profile could
   print "Left wing back" on one line and "RDM" on the next. */
const POS_NAME = POSITION_LABEL;
const PITCH = POSITION_XY;

/* Several codes share a spot on the park: ST, CF, SS and CAM all sit on the
   centre line, and a forward who has played all four stacked four discs on
   top of each other. Anything landing within a marker's width of one already
   placed is fanned sideways, alternating left and right so the shape stays
   centred on where they actually played. */
const MARKER_R = 6.6;

/* Deterministic pseudo-random. A real heat map is not a set of perfect
   discs, so each position scatters a few weighted samples around itself and
   the blur fuses them into one irregular mass. Math.random would reshuffle
   every player's field on every build and churn the asset hash for no visual
   gain, so the sequence is seeded from the shirt number. */
function lcg(seed) {
  let x = (seed * 2654435761) >>> 0;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; };
}
function placeSpots(codes) {
  const out = [];
  for (const code of codes) {
    const base = PITCH[code];
    if (!base) continue;
    let [x, y] = base;
    for (let step = 0; step < 6; step++) {
      const clash = out.some((s) => Math.hypot(s.x - x, s.y - y) < MARKER_R * 2.3);
      if (!clash) break;
      const shift = (Math.floor(step / 2) + 1) * MARKER_R * 2.4;
      x = base[0] + (step % 2 ? -shift : shift);
      /* Pushed off the pitch instead: drop down a row rather than overflow. */
      if (x < 8 || x > 92) { x = base[0]; y += MARKER_R * 2.4; }
    }
    out.push({ code, x, y });
  }
  return out;
}

/* A ring is only honest where the figure has a denominator. A raw count of
   twenty-nine starts has nothing to be a proportion of, so those are printed
   plain rather than dressed as a gauge that is always full. */
const ring = (pct) => {
  const r = 26;
  const c = 2 * Math.PI * r;
  const on = Math.max(0, Math.min(100, pct)) / 100 * c;
  /* Drawn by animating the dash offset from full to zero, so the arc sweeps
     in. Both numbers are stamped here rather than measured in the browser,
     which keeps the resting state correct with the script blocked. */
  return `<svg class="pf-ring" viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
        <circle cx="32" cy="32" r="${r}" fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="4" />
        <circle class="pf-ring__arc" cx="32" cy="32" r="${r}" fill="none" stroke="var(--volt)" stroke-width="4"
          stroke-linecap="round" stroke-dasharray="${on.toFixed(1)} ${(c - on).toFixed(1)}"
          style="--on:${on.toFixed(1)}" transform="rotate(-90 32 32)" />
      </svg>`;
};

/* data-count carries the target so the figure can tick up to it on reveal and
   again on hover. The element ships with the final value already in it, so a
   blocked script leaves the right number on screen. */
const statTile = (t) => `<li class="pf-stat${t.pct === undefined ? '' : ' has-ring'}">
        ${t.pct === undefined ? '' : ring(t.pct)}
        <b data-count="${attr(t.v)}">${esc(t.v)}</b>
        <span>${esc(t.k)}</span>
        ${t.sub ? `<i>${esc(t.sub)}</i>` : ''}
      </li>`;

/* A bar with the figure printed beside it: the bar is reinforcement, never
   the only way to read the value. */
const bar = (label, value, pct, note) => `<li class="pf-bar">
        <span class="pf-bar__k">${esc(label)}</span>
        <span class="pf-bar__v"><span data-count="${attr(value)}">${esc(value)}</span>${note ? `<i>${esc(note)}</i>` : ''}</span>
        <span class="pf-bar__track" aria-hidden="true"><i style="--w:${Math.max(0, Math.min(100, pct))}%"></i></span>
      </li>`;

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export function playerPage(p, d) {
  const squadRec = (d.squad || []).find((x) => x.num === p.num) || {};
  const gk = !!squadRec.gk;
  const shot = shotFor(p.num);

  /* One profile per season, plus an all-time one for the hero and the squad
     comparison. The seasons come from the club's own list, so a season with
     no matches still gets a tab and can say so. */
  const seasonNames = (d.seasons || []).map((s) => s.name);
  const seasons = seasonNames.map((name) => {
    const ms = (d.played || []).filter((m) => m.season === name);
    const profile = playerProfile(p, ms, d.players);
    profile.teamGames = ms.length;
    return { name, profile, matches: ms };
  });
  const all = playerProfile(p, d.played, d.players);
  all.teamGames = (d.played || []).filter((m) => m.played).length;
  const pr = all;
  const teamGames = all.teamGames;

  /* The chip beside the position: only awarded where the player genuinely
     leads the squad, so it means something when it appears. */
  const accolades = [];
  if (pr.goalRank === 1) accolades.push('Top goalscorer');
  if (pr.assistRank === 1) accolades.push('Most assists');
  if (pr.cleanSheetRank === 1 && gk) accolades.push('Most clean sheets');
  if (pr.motmRank === 1) accolades.push('Most Man of the Match');

  const recog = d.recognition || [];
  const seasonAwards = recog.filter((r) => r.type === 'season_award' && r.playerId === p.num);
  const potm = recog.filter((r) => r.type === 'potm' && r.playerId === p.num);
  const leadership = recog.find((r) => r.type === 'leadership');
  const captainOf = leadership && [
    leadership.clubCaptainPlayerId === p.num ? 'Club captain' : null,
    leadership.viceCaptainPlayerId === p.num ? 'Vice-captain' : null,
    leadership.thirdChoiceCaptainPlayerId === p.num ? 'Third-choice captain' : null,
  ].find(Boolean);

  const STATUS = {
    retired: 'Retired',
    departed: 'Departed',
    retained: 'Retained for 26/27',
    new: 'New signing',
    returned: 'Back at the club',
    trial: 'On trial',
    injured: 'Out injured',
    staff: 'Now on the coaching staff',
  };
  const statusLabel = STATUS[squadRec.status];

  /* ================= HERO ================= */
  const hero = `<section class="pf-hero" aria-labelledby="pf-h">
      <div class="wrap pf-hero__grid">
        <div class="pf-hero__shot">
          ${shot
    ? `<img src="${attr(shot)}" alt="${attr(p.name)}" width="420" height="560" decoding="async" />`
    : `<img class="pf-hero__crest" src="${STAR}" alt="" width="260" height="322" decoding="async" />`}
        </div>
        <div>
          <p class="pf-chips">
            <span class="pf-chip pf-chip--pos">${esc(squadRec.position || p.position)}</span>
            ${accolades.map((a) => `<span class="pf-chip">${esc(a)}</span>`).join('\n            ')}
            ${captainOf ? `<span class="pf-chip">${esc(captainOf)}</span>` : ''}
            ${statusLabel ? `<span class="pf-chip pf-chip--mut">${esc(statusLabel)}</span>` : ''}
          </p>
          <h1 class="pf-hero__name" id="pf-h">
            <b>${esc(p.last)}</b>
            <i>${esc(p.first)}</i>
          </h1>
          <p class="pf-hero__lede">${esc(pr.starts)} ${pr.starts === 1 ? 'start' : 'starts'} for
            ${esc(CLUB.name)} in ${esc(d.currentSeason)}${pr.bench ? `, plus ${esc(pr.bench)} on the bench` : ''}.
            ${gk
    ? `${esc(pr.cleanSheets)} clean ${pr.cleanSheets === 1 ? 'sheet' : 'sheets'} and ${esc(pr.conceded)} conceded.`
    : `${esc(pr.goals)} ${pr.goals === 1 ? 'goal' : 'goals'} and ${esc(pr.assists)} ${pr.assists === 1 ? 'assist' : 'assists'}.`}</p>
          <div class="pf-hero__btns">
            <a class="btn btn--ghost btn--sm" href="/squad.html">${ARROW} Back to the squad</a>
            <button class="btn btn--ghost btn--sm" type="button" data-share>Share ${ARROW}</button>
          </div>
        </div>
      </div>
    </section>`;

  /* ================= THE CUMULATIVE PLOT =================
     One cumulative line, scrubable. A cumulative total only ever rises, so
     the shape says when the player was contributing; the hover layer says
     which match each step was, which is the question the shape provokes.
     Every point is also a row in the list below, so the information is never
     locked inside a pointer gesture. */
  const chartFor = (x, key) => {
    const series = x.timeline.map((t) => (gk ? t.runClean : t.runGoals + t.runAssists));
    if (series.length < 2) return '';
    const top = Math.max(1, ...series);
    const W = 720, H = 200, PAD = 18, L = 34;
    const xy = series.map((v, i) => [
      L + (i / (series.length - 1)) * (W - L - PAD),
      H - PAD - (v / top) * (H - PAD * 2),
    ]);
    const pts = xy.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`);
    const area = `${L},${H - PAD} ${pts.join(' ')} ${(W - PAD).toFixed(1)},${H - PAD}`;
    const unit = gk ? 'clean sheets' : 'involvements';

    return `<figure class="pf-plot rv" data-plot>
              <svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${attr(key)}-t" preserveAspectRatio="none">
                <title id="${attr(key)}-t">Running total of ${esc(unit)}, reaching ${esc(top)} across ${esc(series.length)} starts</title>
                <defs>
                  <linearGradient id="${attr(key)}-g" x1="0" y1="0" x2="0" y2="1">
                    <!-- The gradient runs over the shape's own box, so a
                         steep final climb put its darkest band right across
                         the top and read as a solid block rather than a wash.
                         Softer, with an early falloff. -->
                    <stop offset="0%" stop-color="var(--volt)" stop-opacity="0.17" />
                    <stop offset="45%" stop-color="var(--volt)" stop-opacity="0.06" />
                    <stop offset="100%" stop-color="var(--volt)" stop-opacity="0" />
                  </linearGradient>
                </defs>
                <g class="pf-plot__grid" aria-hidden="true">
                  ${[0, 0.5, 1].map((f) => {
    const y = H - PAD - f * (H - PAD * 2);
    return `<line x1="${L}" y1="${y.toFixed(1)}" x2="${W - PAD}" y2="${y.toFixed(1)}" />`;
  }).join('\n                  ')}
                </g>
                ${[0, 0.5, 1].map((f) => {
    const y = H - PAD - f * (H - PAD * 2);
    const v = Math.round(f * top);
    return `<text class="pf-plot__ax" x="${L - 8}" y="${(y + 3).toFixed(1)}" text-anchor="end">${v}</text>`;
  }).join('\n                ')}
                <polygon class="pf-plot__area" points="${area}" fill="url(#${attr(key)}-g)" />
                <line class="pf-plot__cross" x1="0" y1="${PAD}" x2="0" y2="${H - PAD}" stroke="var(--volt)"
                  stroke-width="1" stroke-dasharray="3 3" opacity="0" vector-effect="non-scaling-stroke" />
                <polyline class="pf-plot__line" points="${pts.join(' ')}" fill="none" stroke="var(--volt)"
                  stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
                ${xy.map(([px, py], i) => {
    const t = x.timeline[i];
    const made = gk ? (t.conceded === 0 ? 'Clean sheet' : `${t.conceded} conceded`)
      : [t.goals ? `${t.goals}G` : '', t.assists ? `${t.assists}A` : ''].filter(Boolean).join(' ') || 'No return';
    return `<circle class="pf-plot__pt" cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="10"
                  data-x="${px.toFixed(1)}" data-y="${py.toFixed(1)}" data-total="${attr(series[i])}"
                  data-club="${attr(shortClub(t.opponent))}" data-score="${attr(t.scoreline)}"
                  data-date="${attr(fmtDate(t.date))}" data-made="${attr(made)}" />`;
  }).join('\n                ')}
                <circle class="pf-plot__end" cx="${xy[xy.length - 1][0].toFixed(1)}" cy="${xy[xy.length - 1][1].toFixed(1)}" r="4" fill="var(--volt)" />
              </svg>
              <figcaption class="pf-plot__cap" data-readout>
                <span class="pf-plot__lo">First start</span>
                <b>${esc(top)} ${esc(unit)}</b>
                <span class="pf-plot__hi">Last start</span>
              </figcaption>
              <p class="pf-plot__hint">Point at the line to read each match.</p>
            </figure>`;
  };

  /* ================= SEASON PANEL BUILDERS =================
     Each of these takes a profile rather than closing over one, so the same
     code renders every season's panel. */

  const tilesFor = (x) => (gk ? [
    { v: x.starts, k: 'Starts', sub: `of ${x.teamGames} played`, pct: x.teamGames ? Math.round((x.starts / x.teamGames) * 100) : 0 },
    { v: x.cleanSheets, k: 'Clean sheets', sub: `of ${x.onRecord} on record`, pct: x.cleanSheetPct },
    { v: x.conceded, k: 'Conceded' },
    { v: x.concededPerGame, k: 'Conceded a game' },
    { v: x.motm, k: 'Man of the Match' },
    { v: `${x.winPct}%`, k: 'Won when starting', pct: x.winPct },
  ] : [
    { v: x.starts, k: 'Starts', sub: `of ${x.teamGames} played`, pct: x.teamGames ? Math.round((x.starts / x.teamGames) * 100) : 0 },
    { v: x.bench, k: 'On the bench' },
    { v: x.goals, k: 'Goals' },
    { v: x.assists, k: 'Assists' },
    { v: x.perGame, k: 'Goals + assists a start' },
    { v: `${x.winPct}%`, k: 'Won when starting', pct: x.winPct },
  ]);

  const barsFor = (x) => (gk ? [
    bar('Clean sheets', x.cleanSheets, x.cleanSheetPct, `${x.cleanSheetPct}% of ${x.onRecord}`),
    bar('Games conceding', x.onRecord - x.cleanSheets, x.onRecord ? Math.round(((x.onRecord - x.cleanSheets) / x.onRecord) * 100) : 0),
    bar('Won when they started', `${x.winPct}%`, x.winPct, `${x.won} of ${x.won + x.drawn + x.lost}`),
  ] : [
    bar('Goals', x.goals, x.involvements ? Math.round((x.goals / x.involvements) * 100) : 0),
    bar('Assists', x.assists, x.involvements ? Math.round((x.assists / x.involvements) * 100) : 0),
    bar('Won when they started', `${x.winPct}%`, x.winPct, `${x.won} of ${x.won + x.drawn + x.lost}`),
  ]);

  const ranksFor = (x) => [
    gk && x.cleanSheetRank ? { v: ordinal(x.cleanSheetRank), k: 'Clean sheets in the squad', s: `${x.cleanSheets} kept` } : null,
    !gk && x.goalRank ? { v: ordinal(x.goalRank), k: 'Goalscorer in the squad', s: `${x.goals} scored` } : null,
    !gk && x.assistRank ? { v: ordinal(x.assistRank), k: 'Assister in the squad', s: `${x.assists} made` } : null,
    x.motmRank ? { v: ordinal(x.motmRank), k: 'Man of the Match in the squad', s: `${x.motm} awarded` } : null,
    { v: `${x.winPct}%`, k: 'Won when they started', s: `${x.won}W ${x.drawn}D ${x.lost}L` },
  ].filter(Boolean);

  /* A season with no matches in the record. Said plainly, because a grid of
     zeroes reads as a player who contributed nothing rather than as a season
     that has not started. */
  const emptyPanel = (name) => `<div class="pf-empty">
            <p class="pf-empty__k">${esc(name)}</p>
            <p class="pf-empty__t">No matches on record yet.</p>
            <p class="pf-empty__b">Nothing has been played in ${esc(name)} that we hold a team sheet for.
              Every figure on this page is counted from those sheets, so this season fills in as the
              results come in.</p>
          </div>`;

  const seasonPanel = (sn, x, idx) => {
    if (!x.starts && !x.bench) {
      return `<div class="pf-panel" id="pf-s-${idx}" data-season-panel="${idx}">
          ${emptyPanel(sn)}
        </div>`;
    }
    return `<div class="pf-panel" id="pf-s-${idx}" data-season-panel="${idx}">
          <section class="pf-sub" aria-labelledby="pf-n-${idx}">
            ${rail(1, 'The season', `${sn} · ${x.starts} starts`)}
            <h3 class="h2 rv" id="pf-n-${idx}">${esc(sn)} in <span class="volt">numbers.</span></h3>
            <ul class="pf-tiles rv">
              ${tilesFor(x).map(statTile).join('\n              ')}
            </ul>
          </section>

          <section class="pf-sub" aria-labelledby="pf-r-${idx}">
            ${rail(2, gk ? 'Defensive record' : 'Attacking record', `${x.starts} starts`)}
            <h3 class="h2 rv" id="pf-r-${idx}">The <span class="volt">record.</span></h3>
            <div class="pf-record__grid rv">
              <ul class="pf-bars">
                ${barsFor(x).join('\n                ')}
              </ul>
              <ul class="pf-ranks">
                ${ranksFor(x).map((r) => `<li>
                  <b${/%/.test(String(r.v)) ? ` data-count="${attr(r.v)}"` : ''}>${esc(r.v)}</b>
                  <span>${esc(r.k)}</span>
                  <i>${esc(r.s)}</i>
                </li>`).join('\n                ')}
              </ul>
            </div>
          </section>

          ${x.timeline.length > 1 ? `<section class="pf-sub" aria-labelledby="pf-c-${idx}">
            ${rail(3, 'Through the season', `${x.timeline.length} starts`)}
            <h3 class="h2 rv" id="pf-c-${idx}">${gk ? 'Clean sheets' : 'Goals and assists'} as they
              <span class="volt">came.</span></h3>
            ${chartFor(x, `pf-plot-${idx}`)}
          </section>` : ''}

          ${x.byCompetition.length ? `<section class="pf-sub" aria-labelledby="pf-k-${idx}">
            ${rail(4, 'By competition', `${x.byCompetition.length} entered`)}
            <h3 class="h2 rv" id="pf-k-${idx}">Across every <span class="volt">competition.</span></h3>
            <div class="pf-tablewrap rv">
              <table class="pf-tbl">
                <caption class="sr-only">${esc(p.name)} by competition, ${esc(sn)}</caption>
                <thead>
                  <tr>
                    <th scope="col">Competition</th>
                    <th scope="col"><abbr title="Starts">St</abbr></th>
                    ${gk
    ? '<th scope="col"><abbr title="Clean sheets">CS</abbr></th><th scope="col"><abbr title="Conceded">GA</abbr></th>'
    : '<th scope="col"><abbr title="Goals">G</abbr></th><th scope="col"><abbr title="Assists">A</abbr></th>'}
                    <th scope="col"><abbr title="Man of the Match">MOTM</abbr></th>
                  </tr>
                </thead>
                <tbody>
                  ${x.byCompetition.map((c) => `<tr>
                    <th scope="row">${esc(shortComp(c.comp))}</th>
                    <td>${esc(c.apps)}</td>
                    ${gk ? `<td>${esc(c.cleanSheets)}</td><td>${esc(c.conceded)}</td>`
    : `<td>${esc(c.goals)}</td><td>${esc(c.assists)}</td>`}
                    <td>${esc(c.motm)}</td>
                  </tr>`).join('\n                  ')}
                </tbody>
              </table>
            </div>
          </section>` : ''}

          ${x.last.length ? `<section class="pf-sub" aria-labelledby="pf-l-${idx}">
            ${rail(5, 'Most recent', `${x.last.length} ${x.last.length === 1 ? 'start' : 'starts'}`)}
            <h3 class="h2 rv" id="pf-l-${idx}">The last time <span class="volt">out.</span></h3>
            <ol class="pf-form rv">
              ${x.last.map((t) => `<li class="pf-form__item">
                <span class="pf-form__badge">${oppBadge(t.opponent, d.badges, 26, 26)}</span>
                <span class="pf-form__club">${esc(shortClub(t.opponent))}</span>
                <span class="pf-form__score">${esc(t.ourScoreline || t.scoreline)}</span>
                <span class="pf-form__note">${gk
    ? (t.conceded === 0 ? 'Clean sheet' : t.conceded === null ? 'No goal record' : `${t.conceded} conceded`)
    : (t.goals || t.assists
      ? [t.goals ? `${t.goals} ${t.goals === 1 ? 'goal' : 'goals'}` : '', t.assists ? `${t.assists} ${t.assists === 1 ? 'assist' : 'assists'}` : ''].filter(Boolean).join(', ')
      : '')}${t.motm ? (gk || t.goals || t.assists ? ' · MOTM' : 'Man of the Match') : ''}</span>
                <span class="pf-form__date">${esc(fmtDate(t.date))}</span>
                <span class="pf-form__res" data-res="${attr(t.outcome || '')}">${esc(t.outcome || '-')}</span>
              </li>`).join('\n              ')}
            </ol>
          </section>` : ''}
        </div>`;
  };

  /* ================= 01 SEASONS =================
     Tabs ship as jump links over panels that are all visible, which is what a
     reader gets with the script blocked. The script promotes them. */
  const seasonBand = `<section class="sec pf-seasons" id="seasons" aria-labelledby="pf-seasons-h">
      <div class="wrap">
        <h2 class="sr-only" id="pf-seasons-h">Season by season</h2>
        <div class="pf-tabs" data-season-tabs>
          ${seasons.map((s, i) => `<a class="pf-tab" href="#pf-s-${i}" data-season-tab="${i}">
            <b>${esc(s.name)}</b>
            <i>${s.profile.starts ? `${s.profile.starts} ${s.profile.starts === 1 ? 'start' : 'starts'}` : 'Not started'}</i>
          </a>`).join('\n          ')}
        </div>
        <div class="pf-panels">
          ${seasons.map((s, i) => seasonPanel(s.name, s.profile, i)).join('\n          ')}
        </div>
      </div>
    </section>`;

  /* ================= 02 AGAINST THE SQUAD =================
     A figure on its own says little. Set against the squad's best and its
     middle, it says whether it was exceptional or ordinary, which is the
     question every one of these pages exists to answer. */
  /* Only players who actually started a match. Including everyone ever
     registered dragged the median to one goal, which made "ahead of the squad
     middle" true of almost anyone and therefore worth nothing. */
  const sameRole = (x) => {
    const rec = (d.squad || []).find((q) => q.num === x.num);
    return rec && !!rec.gk === gk;
  };
  const pool = (d.players || []).filter((x) => sameRole(x) && (x.starts || 0) > 0);
  const median = (key) => {
    const v = pool.map((x) => x[key] || 0).sort((a, b) => a - b);
    if (!v.length) return 0;
    const mid = Math.floor(v.length / 2);
    return v.length % 2 ? v[mid] : Math.round((v[mid - 1] + v[mid]) / 2);
  };
  const best = (key) => Math.max(0, ...pool.map((x) => x[key] || 0));

  const compare = (gk
    ? [{ key: 'cleanSheets', label: 'Clean sheets' }, { key: 'starts', label: 'Starts' }, { key: 'motm', label: 'Man of the Match' }]
    : [{ key: 'goals', label: 'Goals' }, { key: 'assists', label: 'Assists' }, { key: 'starts', label: 'Starts' }, { key: 'motm', label: 'Man of the Match' }]
  ).map((m) => {
    const mineV = m.key === 'starts' ? all.starts : all[m.key] || 0;
    const b = Math.max(best(m.key), mineV, 1);
    /* Rank, not "squad middle". A median is the right statistic and the wrong
       word: nobody reading a football page should have to work out what the
       middle of a squad is. "4th of 27" needs no explaining. */
    const better = pool.filter((x) => (x[m.key] || 0) > mineV).length;
    return { ...m, mine: mineV, typical: median(m.key), best: b, rank: better + 1 };
  });

  const versusBand = pool.length > 2 ? `<section class="sec pf-versus" aria-labelledby="pf-vs-h">
      <div class="wrap">
        ${rail(2, 'Against the squad', `${pool.length} who started a match`)}
        <h2 class="h2 rv" id="pf-vs-h">How that <span class="volt">compares.</span></h2>
        <p class="pf-lede rv">${esc(p.first)} against the ${esc(pool.length)}
          ${gk ? 'goalkeepers' : 'outfield players'} who started a match in ${esc(d.currentSeason)},
          across every competition.</p>

        <ul class="pf-vs rv">
          ${compare.map((c, i) => `<li class="pf-vs__row" style="--i:${i}">
            <span class="pf-vs__k">${esc(c.label)}</span>
            <span class="pf-vs__track" aria-hidden="true">
              <i class="pf-vs__mine" style="--w:${Math.round((c.mine / c.best) * 100)}%"></i>
            </span>
            <span class="pf-vs__v">
              <b data-count="${attr(c.mine)}">${esc(c.mine)}</b>
              <i>${c.rank === 1 ? 'Best in the squad' : `${esc(ordinal(c.rank))} of ${esc(pool.length)}`}</i>
            </span>
          </li>`).join('\n          ')}
        </ul>
      </div>
    </section>` : '';

  /* ================= 03 WHERE THEY PLAY =================
     A real heat map, not a scatter of pins. The team sheets record how OFTEN
     a player lined up in each slot, so the field is weighted by that: a spot
     filled twenty-two times burns, one filled once barely glows. The earlier
     version drew every position at one size and said only "he stood here at
     least once", which across eleven positions is close to no information.

     The blur is a filter over plain circles rather than stacked gradients, so
     overlapping spots genuinely add up the way a heat map should. */
  /* Which matches each position actually came from. A team sheet can list a
     player under more than one code for the same match, so a match legitimately
     appears under each of them; the counts above are counts of slots, not of
     matches, and the panels say so. */
  const posMatches = new Map();
  for (const m of (d.played || []).slice().sort((a, b) => (b.iso || '').localeCompare(a.iso || ''))) {
    const det = m.detail;
    if (!det) continue;
    const started = (det.starters || []).find((x) => x.num === p.num);
    const benched = (det.bench || []).find((x) => x.num === p.num);
    const rec = started || benched;
    if (!rec) continue;
    for (const c of rec.positions || []) {
      if (!posMatches.has(c)) posMatches.set(c, []);
      posMatches.get(c).push({
        opponent: m.opponent,
        competition: m.competition,
        score: m.countsGoals ? `${m.ourGoals}-${m.theirGoals}` : 'W/O',
        date: fmtDate(m.date),
        outcome: m.outcome,
        bench: !started,
      });
    }
  }

  const weights = (squadRec.positionWeights || []).filter((w) => PITCH[w.code]);
  const unmapped = (squadRec.positionWeights || []).filter((w) => !PITCH[w.code]);
  const heatMax = Math.max(1, ...weights.map((w) => w.n));
  const heat = placeSpots(weights.map((w) => w.code)).map((sp, i) => ({
    ...sp, n: weights[i].n, k: weights[i].n / heatMax,
  }));
  const primary = heat.filter((h) => h.k >= 0.34);
  const slots = weights.reduce((n, w) => n + w.n, 0);
  const fmtN = (n) => (n % 1 ? n.toFixed(1) : String(n));

  const pitchBand = heat.length ? `<section class="sec pf-pitch" aria-labelledby="pf-pitch-h">
      <div class="wrap">
        ${rail(3, 'Where they play', `${heat.length} ${heat.length === 1 ? 'position' : 'positions'}`)}
        <h2 class="h2 rv" id="pf-pitch-h">On the <span class="volt">pitch.</span></h2>
        <div class="pf-pitch__grid rv">
          <figure class="pf-pitch__fig">
            <svg viewBox="0 0 100 140" role="img" aria-labelledby="pf-pitch-t" preserveAspectRatio="xMidYMid meet">
              <title id="pf-pitch-t">Heat map of where ${esc(p.name)} lined up. Most often
                ${esc(heat[0].code)}, ${esc(fmtN(heat[0].n))} of ${esc(fmtN(slots))} team-sheet slots.</title>
              <defs>
                <!-- The classic heat-map pipeline, which is what makes one
                     look like a heat map rather than a blurred smudge: blur
                     plain white blobs, lift the blurred ALPHA into every
                     channel, then remap that ramp to colour. Banded through a
                     table so the field builds from a dim ember at the edge to
                     a near-white core, all inside the brand's orange. -->
                <filter id="pf-heat-${attr(p.slug)}" x="-25%" y="-25%" width="150%" height="150%"
                        color-interpolation-filters="sRGB">
                  <feGaussianBlur stdDeviation="3.4" result="b" />
                  <!-- All four channels take the blurred ALPHA. The alpha row
                       must carry it too: set to a constant it made the whole
                       filter region opaque, and everywhere the blobs were not
                       came out as a solid black rectangle over the pitch. -->
                  <feColorMatrix in="b" type="matrix" result="lum"
                    values="0 0 0 1 0
                            0 0 0 1 0
                            0 0 0 1 0
                            0 0 0 1 0" />
                  <feComponentTransfer in="lum">
                    <feFuncR type="table" tableValues="0.32 0.72 0.95 1 1 1 1" />
                    <feFuncG type="table" tableValues="0.03 0.14 0.30 0.45 0.62 0.82 0.97" />
                    <feFuncB type="table" tableValues="0.02 0.04 0.07 0.11 0.22 0.48 0.88" />
                    <feFuncA type="table" tableValues="0 0.22 0.48 0.68 0.82 0.92 1" />
                  </feComponentTransfer>
                </filter>
                <!-- Heat stops at the touchline. The blur legitimately
                     spreads past the pitch and a field bleeding into the
                     panel margin reads as a leak rather than as play. -->
                <clipPath id="pf-clip-${attr(p.slug)}">
                  <rect x="1" y="1" width="98" height="138" rx="3" />
                </clipPath>
              </defs>

              <rect x="1" y="1" width="98" height="138" rx="3" fill="rgba(255,255,255,0.028)" stroke="var(--line-d)" />
              <line x1="1" y1="70" x2="99" y2="70" stroke="var(--line-d)" />
              <circle cx="50" cy="70" r="12" fill="none" stroke="var(--line-d)" />
              <circle cx="50" cy="70" r="1" fill="var(--line-d)" />
              <rect x="26" y="1" width="48" height="18" fill="none" stroke="var(--line-d)" />
              <rect x="38" y="1" width="24" height="7" fill="none" stroke="var(--line-d)" />
              <rect x="26" y="121" width="48" height="18" fill="none" stroke="var(--line-d)" />
              <rect x="38" y="132" width="24" height="7" fill="none" stroke="var(--line-d)" />

              <g class="pf-heat" clip-path="url(#pf-clip-${attr(p.slug)})" filter="url(#pf-heat-${attr(p.slug)})">
                ${(() => {
    const rnd = lcg(p.num || 1);
    const blobs = [];
    for (const h of heat) {
      const cy = h.y * 1.4;
      /* Many small, faint samples rather than a few big bright ones. The
         earlier field used large discs at high opacity, so wherever two
         overlapped the alpha clipped and the middle burned out to a flat
         white mass with no structure left in it. Density has to accumulate
         gradually for the ramp to have anything to show. */
      const n = 7 + Math.round(h.k * 16);
      blobs.push({ x: h.x, y: cy, r: 4.6 + 5.4 * h.k, o: 0.32 + 0.36 * h.k, i: blobs.length });
      for (let j = 0; j < n; j++) {
        const ang = rnd() * Math.PI * 2;
        /* Gaussian-ish: two uniforms averaged cluster toward the middle, so
           a position reads as a dense core that frays at the edge rather
           than a ring of satellites at a fixed radius. */
        const spread = ((rnd() + rnd()) / 2) * (3.6 + 5.4 * h.k);
        blobs.push({
          x: h.x + Math.cos(ang) * spread,
          y: cy + Math.sin(ang) * spread * 1.2,
          r: 2.8 + rnd() * (3.4 + 3.6 * h.k),
          o: (0.16 + rnd() * 0.2) * (0.5 + h.k * 0.6),
          i: blobs.length,
        });
      }
    }
    return blobs.map((b) => `<circle class="pf-heat__b" cx="${b.x.toFixed(1)}" cy="${b.y.toFixed(1)}"
                  r="${b.r.toFixed(1)}" fill="#FFFFFF" opacity="${b.o.toFixed(2)}"
                  style="--r:${b.r.toFixed(1)};--o:${b.o.toFixed(2)};--d:${(b.i % 9) * 0.72}s" />`).join('\n                ');
  })()}
              </g>

              <g class="pf-radiate" aria-hidden="true">
                ${primary.map((h, n) => `<circle class="pf-radiate__r" cx="${h.x.toFixed(1)}"
                  cy="${(h.y * 1.4).toFixed(1)}" r="${(4.2 + 1.7 * h.k).toFixed(1)}"
                  style="--d:${(n * 0.9).toFixed(2)}s" />`).join('\n                ')}
              </g>

              ${primary.map((h, n) => `<g class="pf-spot" data-pos="${attr(h.code)}" style="--n:${n}">
                <circle class="pf-spot__dot" cx="${h.x.toFixed(1)}" cy="${(h.y * 1.4).toFixed(1)}"
                  r="${(4.2 + 1.7 * h.k).toFixed(1)}" fill="var(--volt)"
                  stroke="#0D0F12" stroke-width="0.9" />
                <text x="${h.x.toFixed(1)}" y="${(h.y * 1.4 + 1.4).toFixed(1)}" text-anchor="middle"
                  font-family="Geist, sans-serif" font-size="3.5" font-weight="600"
                  fill="var(--text-on-brand)"><title>${esc(positionName(h.code))}</title>${esc(h.code)}</text>
              </g>`).join('\n              ')}
            </svg>
            <figcaption>Attacking upward. The brighter the field, the more often ${esc(p.first)} played there.</figcaption>
          </figure>

          <div class="pf-pitch__body">
            <p>Read off the team sheets, not from a label. ${esc(p.first)} was named in
              ${esc(heat.length)} ${heat.length === 1 ? 'position' : 'different positions'}
              across ${esc(d.currentSeason)}${heat.length > 1 ? `, most often at ${esc(positionName(heat[0].code).toLowerCase())}` : ''}.</p>
            <ol class="pf-heatlist">
              ${heat.map((h) => {
    const ms = posMatches.get(h.code) || [];
    return `<li${h.k >= 0.34 ? ' class="is-key"' : ''}>
                <details class="pf-pos" data-pos="${attr(h.code)}">
                  <summary>
                    <span class="pf-heatlist__k">${esc(positionName(h.code))}</span>
                    <span class="pf-heatlist__bar" aria-hidden="true"><i style="--w:${Math.round(h.k * 100)}%"></i></span>
                    <span class="pf-heatlist__n">${esc(fmtN(h.n))}</span>
                    <span class="pf-pos__cue" aria-hidden="true"></span>
                    <span class="sr-only">${esc(positionName(h.code))}, ${esc(ms.length)}
                      ${ms.length === 1 ? 'match' : 'matches'}. Show them.</span>
                  </summary>
                  <div class="pf-pos__panel">
                    <p class="pf-pos__t">${esc(positionName(h.code))}</p>
                    <ol class="pf-pos__list">
                      ${ms.map((x) => `<li>
                        <span class="pf-pos__res" data-res="${attr(x.outcome || '')}">${esc(x.outcome || '-')}</span>
                        <span class="pf-pos__badge">${oppBadge(x.opponent, d.badges, 22, 22)}</span>
                        <span class="pf-pos__club">${esc(shortClub(x.opponent))}</span>
                        <span class="pf-pos__score">${esc(x.score)}</span>
                        <span class="pf-pos__comp">${esc(shortComp(x.competition))}</span>
                        <span class="pf-pos__date">${esc(x.date)}${x.bench ? ' · bench' : ''}</span>
                      </li>`).join('\n                      ')}
                    </ol>
                  </div>
                </details>
              </li>`;
  }).join('\n              ')}
            </ol>
            <p class="pf-heatlist__note">Team-sheet slots across ${esc(d.currentSeason)}, not matches:
              a sheet can name the same player under two codes for one game. A place on the bench
              counts as a half, because being named there is not the same as playing there.${unmapped.length
    ? ` ${unmapped.map((w) => esc(w.code)).join(', ')} ${unmapped.length === 1 ? 'has' : 'have'} no fixed
              spot on the diagram and ${unmapped.length === 1 ? 'is' : 'are'} not drawn.` : ''}</p>
          </div>
        </div>
      </div>
    </section>` : '';

  /* ================= 07 HONOURS ================= */
  const honours = [
    ...seasonAwards.map((a) => ({ k: a.title, v: d.currentSeason })),
    ...potm.map((a) => ({ k: 'Player of the Month', v: `${a.month} ${a.season || d.currentSeason}` })),
    captainOf ? { k: captainOf, v: d.currentSeason } : null,
    ...accolades.map((a) => ({ k: a, v: `${d.currentSeason} squad` })),
  ].filter(Boolean);

  const honoursBand = honours.length ? `<section class="sec pf-honours" aria-labelledby="pf-hon-h">
      <div class="wrap">
        ${rail(4, 'Recognition', `${honours.length} in all`)}
        <h2 class="h2 rv" id="pf-hon-h">What they <span class="volt">won.</span></h2>
        <ul class="pf-honours__list rv">
          ${honours.map((h) => `<li>
            <b>${esc(h.k)}</b>
            <span>${esc(h.v)}</span>
          </li>`).join('\n          ')}
        </ul>
      </div>
    </section>` : '';

  /* ================= CTA ================= */
  const ctaBand = `<section class="sec sec--cta pf-cta" aria-labelledby="pf-cta-h">
      <div class="wrap">
        <div class="cta2">
          <span class="cta2__glow" aria-hidden="true"></span>
          <img class="cta2__badge" src="${STAR}" alt="" width="500" height="620" loading="lazy" decoding="async" aria-hidden="true" />
          <div class="cta2__glass glassbox rv">
            <p class="eyebrow cta2__eyebrow">The rest of the squad</p>
            <h2 class="h2" id="pf-cta-h">Everyone who wore the <span class="volt">shirt.</span></h2>
            <p class="cta2__sub">Twenty-three in the first team, and everybody who came before
              them, with the record each of them left behind.</p>
            <div class="cta2__btns">
              <a class="btn btn--volt" href="/squad.html">The full squad ${ARROW}</a>
              <a class="btn btn--ghost" href="/champions.html">The title-winning season</a>
            </div>
          </div>
        </div>
      </div>
    </section>`;

  /* ---- Photographs of this player -----------------------------------------
     Fed by tags marked SUBJECT in the control panel's photo tagger. A player
     merely present in a wide shot is not offered here, because this band is
     pictures OF someone, not pictures they happen to be standing in.

     The band renders nothing at all until at least one photograph is tagged
     that way, so it costs an unrefined profile no space. The focus point set
     while tagging drives object-position, which is what keeps a face in frame
     when a landscape photograph is cropped to a square. */
  const shots = (d.playerPhotos || {})[p.slug] || [];
  const shotsBand = shots.length ? `<section class="sec pf-shots" aria-labelledby="pf-sh-h">
      <div class="wrap">
        ${rail(6, 'In the gallery', `${shots.length} photograph${shots.length === 1 ? '' : 's'}`)}
        <h2 class="h2 rv" id="pf-sh-h">${esc(p.first || p.name)} in <span class="volt">frame.</span></h2>
        <ul class="pf-shots__grid rv">
          ${shots.slice(0, 12).map((sh) => `<li class="pf-shot">
            <a href="${attr(sh.album.slug ? `/gallery/${sh.album.slug}.html` : sh.src)}"${sh.album.slug ? '' : ' rel="noopener" target="_blank"'}>
              <img src="${attr(sh.src)}" alt="${attr(`${p.name}${sh.album.title ? `, ${sh.album.title}` : ''}`)}"
                width="480" height="480" loading="lazy" decoding="async"
                ${sh.focus ? `style="object-position:${esc(sh.focus[0])}% ${esc(sh.focus[1])}%"` : ''} />
            </a>
            ${sh.album.photographer ? `<span class="pf-shot__by">${esc(sh.album.photographer)}</span>` : ''}
          </li>`).join('\n          ')}
        </ul>
      </div>
    </section>` : '';


  /* ================= HOW HE SCORES =================
     The detail the match form now records: what a goal was struck with, from
     where, out of what, and how the chance was made. It appears only where
     somebody actually recorded it, and it says how many of his goals it
     covers, because "4 with his right foot" alongside a career of 25 goals
     invites the reader to assume the other 21 were headers. */
  const detailBars = (title, items, total) => {
    const rows = items.filter((r) => r.n > 0);
    if (!rows.length) return '';
    const top = Math.max(...rows.map((r) => r.n));
    return `<section class="pf-sub">
          <h3 class="pf-how__h">${esc(title)}</h3>
          <ul class="pf-how__list">
            ${rows.map((r) => `<li class="pf-how__row">
              <span class="pf-how__k">${esc(r.label)}</span>
              <span class="pf-how__bar"><i style="--w:${Math.round((r.n / top) * 100)}%"></i></span>
              <b class="pf-how__v">${r.n}</b>
            </li>`).join('\n            ')}
          </ul>
        </section>`;
  };

  const foot = pr.byFoot || {};
  const zone = pr.byZone || {};
  const sit = pr.bySituation || {};
  const asType = pr.assistsByType || {};
  const detailed = pr.goalsDetailed || 0;

  const howBand = (detailed || pr.assists || pr.saves) ? `<section class="sec pf-how" aria-labelledby="pf-how-h">
      <div class="wrap">
        ${rail(6, 'The detail', detailed ? `${detailed} of ${pr.goals} goals recorded in full` : 'from the match records')}
        <h2 class="h2 rv" id="pf-how-h">How he <span class="volt">does it.</span></h2>
        <div class="pf-how__grid rv">
          ${detailBars('What he strikes it with', BODY_PARTS.map((b) => ({ label: b.label, n: foot[b.key] || 0 })))}
          ${detailBars('Where he strikes it from', ZONES.map((z) => ({ label: z.label, n: zone[z.key] || 0 })))}
          ${detailBars('What the ball was doing', SITUATIONS.map((x) => ({ label: x.label, n: sit[x.key] || 0 })))}
          ${detailBars('How he makes them for others', ASSIST_TYPES.map((a) => ({ label: a.label, n: asType[a.key] || 0 })))}
          ${pr.keeperApps ? `<section class="pf-sub">
            <h3 class="pf-how__h">In goal</h3>
            <ul class="pf-how__keeper">
              <li><b>${pr.saves}</b><span>saves</span></li>
              <li><b>${esc(pr.savesPerGame || '0')}</b><span>a game</span></li>
              <li><b>${pr.keeperApps}</b><span>games in goal</span></li>
            </ul>
          </section>` : ''}
        </div>
        ${detailed && detailed < pr.goals ? `<p class="pf-how__note rv">The other
          ${pr.goals - detailed} ${pr.goals - detailed === 1 ? 'goal was' : 'goals were'} recorded before
          the club kept this level of detail, so nothing is claimed about
          ${pr.goals - detailed === 1 ? 'it' : 'them'}.</p>` : ''}
      </div>
    </section>` : '';

  return {

    body: siteHeader('/squad.html') + hero + seasonBand + versusBand
      + pitchBand + howBand + shotsBand + honoursBand + ctaBand,
    bodyClass: 'is-home is-sub is-player',
    css: 'home.css',
    shell: 'home',
    preMain: sitePreMain(auraFor('squad.html')),
    footerHtml: siteFooter(),
    profile: pr,
  };
}
