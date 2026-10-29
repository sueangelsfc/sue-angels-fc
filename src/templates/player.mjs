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
import { pitchMarks, shotsFor, assistSpotsFor, savesFor, spotWords, zoneGoalsFor, zoneAssistsFor, zoneLayout, ZONE_WORDS } from '../lib/pitch.mjs';
import {
  playerProfile, playerStats, playerOpponents, fmtDate, isLeague, ordinal,
} from '../lib/stats.mjs';
import { FRIENDLY_NOTE_SHORT } from '../lib/prose.mjs';
import { siteFooter, sitePreMain, siteHeader, oppBadge, oppBadgeSrc } from './home.mjs';
import { photoCredit } from './gallery.mjs';

const STAR = '/assets/badge/sue-angels-badge-star.webp';
const ARROW = '<span aria-hidden="true">→</span>';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
/* Uploaded first, then the file that ships with the site. See the note in
   dataset.mjs: an uploaded photograph used to reach nothing at all. */
/* Resolved once, in src/lib/dataset.mjs: the season's uploaded picture, then
   the most recent, then a file on disk ONLY where the shirt number can be
   proved to belong to this player. The disk files are named after a number
   and nothing else, and the panel gives a new signing the lowest free one, so
   Ade Owolona was signed into 12 and inherited the previous holder's face. */
const shotFor = (num, d, season) => (d && d.shotFor ? d.shotFor(num, season) : '');

const shortClub = (name) => String(name || '')
  .replace(/\s+FC 2\.0$/, '')
  .replace(/\s+FC$/, '');

/* Competition names are sponsored and long. The sponsor belongs on the
   competition's own page, not squeezed into a table cell. */
const shortComp = (name) => String(name || '')
  .replace(/^Chipotle UK /, '')
  .replace(/^Supreme Trophies /, '')
  .replace(/^Surrey FA Sunday Lower Junior County Cup$/, 'Surrey FA Cup');

/* `raw` is for the one band whose caption answers a switch, so the three
   wordings are written and the stylesheet shows the true one. One rail, not a
   second copy of its markup living in a template. */
const rail = (n, label, ref, raw) => `<div class="xrail" aria-hidden="true">
      <span class="xrail__l"><span class="xrail__n">${n === 'NUM' ? 'NUM' : esc(String(n).padStart(2, '0'))}</span><span class="xrail__t">${raw ? label : esc(label)}</span></span>
      <span class="xrail__r">${raw ? ref : esc(ref)}</span>
    </div>`;

/* Page-level bands number themselves in the order a reader meets them. They
   are built in one order and assembled in another, and each used to carry a
   number typed into it: the page ran 02, 03, 06, 06, 04, with two bands both
   calling themselves 06. A band that does not render leaves no placeholder,
   so the sequence closes up rather than skipping a number. The season block
   keeps its own 01-05, which are inside a panel and describe one season. */
/* THE SAME RULE INSIDE A SEASON PANEL. The outer bands have been numbered
   from the published order since the strip read 04 then 06 with a band
   hidden; the bands INSIDE a panel were still numbered by hand, which was
   correct for exactly one arrangement. Two of them are conditional now -
   where he played is absent where the record names no position, and the form
   strip is absent under All seasons - so a typed number was wrong the moment
   either went missing, and "03 How it went" sat above "03 In pictures" on the
   first page that drew both. Counted per panel, because each panel restarts
   at one. */
const numberPanel = (html) => {
  let n = 0;
  return html.replace(/<span class="xrail__n">NUM<\/span>/g,
    () => `<span class="xrail__n">${String(n += 1).padStart(2, '0')}</span>`);
};

const numberRails = (html) => {
  let n = 5;
  return html.replace(/<span class="xrail__n">NUM<\/span>/g,
    () => `<span class="xrail__n">${String(n += 1).padStart(2, '0')}</span>`);
};

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
const bar = (label, value, pct, note) => `<li class="pf-bar${Number(pct) ? '' : ' pf-bar--none'}">
        <span class="pf-bar__k">${esc(label)}</span>
        <span class="pf-bar__v"><span data-count="${attr(value)}">${esc(value)}</span>${note ? `<i>${esc(note)}</i>` : ''}</span>
        <span class="pf-bar__track" aria-hidden="true"><i style="--w:${Math.max(0, Math.min(100, pct))}%"></i></span>
      </li>`;

/* ================= CHARTS =================
   Four small charts per season panel, drawn at build time as inline SVG and
   plain markup, so the resting state is the finished chart and a blocked
   script loses only the animation. Each prints its figures beside it: the
   picture reinforces a number and never replaces one. Results differ by
   shade and weight of the one accent, never by a second colour. */
const pctOf = (n, of) => (of ? Math.round((n / of) * 100) : 0);

const resultsDonut = (x) => {
  const total = x.won + x.drawn + x.lost;
  if (!total) return '';
  const r = 44;
  const c = 2 * Math.PI * r;
  let at = 0;
  const segs = [['W', x.won, 'won'], ['D', x.drawn, 'drawn'], ['L', x.lost, 'lost']].map(([k, n, label], i) => {
    const len = (n / total) * c;
    const seg = n ? `<circle class="pf-donut__seg" data-res="${k}" cx="60" cy="60" r="${r}" stroke-dasharray="${len.toFixed(1)} ${(c - len).toFixed(1)}" stroke-dashoffset="${(-at).toFixed(1)}" transform="rotate(-90 60 60)" style="--len:${len.toFixed(1)};--c:${c.toFixed(1)};--i:${i}"/>` : '';
    at += len;
    return { seg, k, n, label };
  });
  /* A tick ring that turns slowly round the outside and a lit core inside,
     so the ring is an instrument rather than a flat pie. */
  return `<figure class="pf-chart pf-chart--donut">
              <figcaption class="pf-chart__k">Results when playing</figcaption>
              <div class="pf-donut">
                <svg viewBox="0 0 120 120" role="img" aria-label="${attr(`Won ${x.won}, drew ${x.drawn} and lost ${x.lost} of ${total}`)}">
                  <circle class="pf-donut__orbit" cx="60" cy="60" r="57"/>
                  <circle class="pf-donut__track" cx="60" cy="60" r="${r}"/>
                  ${segs.map((s) => s.seg).join('')}
                  <circle class="pf-donut__inner" cx="60" cy="60" r="33"/>
                </svg>
                <span class="pf-donut__c" aria-hidden="true"><b data-count="${attr(`${pctOf(x.won, total)}%`)}">${esc(pctOf(x.won, total))}%</b><i>won</i></span>
              </div>
              <ul class="pf-chart__legend" data-results="${attr(`${x.won},${x.drawn},${x.lost}`)}">${segs.map((s) => `<li data-res="${s.k}"><b>${esc(s.n)}</b> ${esc(s.label)}</li>`).join('')}</ul>
            </figure>`;
};

const shareGauge = (x, gk) => {
  let v;
  let label;
  let sub;
  if (gk) {
    if (!x.onRecord) return '';
    v = x.cleanSheetPct;
    label = 'Clean sheet rate';
    sub = `${x.cleanSheets} of the ${x.onRecord} with a goal record`;
  } else {
    const team = x.timeline.reduce((n, t) => n + (t.ourGoals || 0), 0);
    if (!team) return '';
    v = pctOf(x.goals + x.assists, team);
    label = 'Share of the goals';
    sub = `Scored or made ${x.goals + x.assists} of the ${team} the club scored with him playing`;
  }
  /* A dial: 240 degrees of arc with a tick ring inside it and a needle that
     sweeps to the value. A round cap on a short arc drew a blob wider than the
     value it marked, so the cap only rounds once there is length to round. */
  const arc = (rr) => `M${(70 - rr * 0.866).toFixed(2)} ${(64 + rr / 2).toFixed(2)}A${rr} ${rr} 0 1 1 ${(70 + rr * 0.866).toFixed(2)} ${(64 + rr / 2).toFixed(2)}`;
  return `<figure class="pf-chart pf-chart--gauge">
              <figcaption class="pf-chart__k">${esc(label)}</figcaption>
              <div class="pf-gauge">
                <svg viewBox="0 0 140 128" role="img" aria-label="${attr(`${label}: ${v}%`)}">
                  <path class="pf-gauge__track" d="${arc(52)}"/>
                  <path class="pf-gauge__ticks" d="${arc(40)}" pathLength="100"/>
                  <path class="pf-gauge__arc${v >= 6 ? ' is-round' : ''}" d="${arc(52)}" pathLength="100" stroke-dasharray="${v} 100" style="--v:${v}"/>
                  <g class="pf-gauge__needle" style="--a:${(-120 + 2.4 * v).toFixed(1)}deg"><line x1="70" y1="64" x2="70" y2="27"/><circle cx="70" cy="64" r="5"/></g>
                </svg>
                <span class="pf-gauge__v" aria-hidden="true"><b data-count="${attr(`${v}%`)}">${esc(v)}%</b></span>
              </div>
              <p class="pf-chart__sub">${esc(sub)}.</p>
            </figure>`;
};

const homeAway = (x, gk) => {
  const side = (home) => {
    const ts = x.timeline.filter((t) => t.home === home);
    return {
      apps: ts.length,
      starts: ts.filter((t) => t.started).length,
      goals: ts.reduce((n, t) => n + t.goals, 0),
      assists: ts.reduce((n, t) => n + t.assists, 0),
      cs: ts.filter((t) => t.conceded === 0).length,
      won: ts.filter((t) => t.outcome === 'W').length,
    };
  };
  const h = side(true);
  const a = side(false);
  if (!h.apps && !a.apps) return '';
  /* Home grows left from the middle and away grows right, three measures
     deep, so the two sides are read against each other rather than as two
     separate lists. Every figure is printed at the end of its bar. */
  /* ONE THING A ROW. "Goals and assists" merged two different measures into
     a single figure, so a reader could not tell four assists from two goals
     and two assists, and the one row people most want to read was the one
     that said least. They are separate rows now, and a row that is nought on
     both sides is dropped rather than drawn as two empty bars - which is the
     same rule the tiles follow. */
  const rows = [
    ['Starts', h.starts, a.starts],
    ...(gk ? [['Clean sheets', h.cs, a.cs]] : [
      ['Goals', h.goals, a.goals],
      ['Assists', h.assists, a.assists],
    ]),
    ['Won', h.won, a.won],
  ].filter(([, hv, av]) => hv || av);
  if (!rows.length) return '';
  return `<figure class="pf-chart pf-chart--split">
              <figcaption class="pf-chart__k">Home and away</figcaption>
              <p class="pf-split__head" aria-hidden="true"><span>Home</span><span>Away</span></p>
              <ul class="pf-split" data-home-away="${attr(`${h.starts},${a.starts}`)}">
                ${rows.map(([k, hv, av], i) => {
    const m = Math.max(hv, av, 1);
    return `<li style="--i:${i}"><span class="pf-split__k">${esc(k)}<span class="sr-only">: ${esc(hv)} at home, ${esc(av)} away</span></span><b class="pf-split__h" data-count="${attr(hv)}">${esc(hv)}</b><span class="pf-split__bars" aria-hidden="true"><i style="--w:${pctOf(hv, m)}%"></i><i style="--w:${pctOf(av, m)}%"></i></span><b class="pf-split__a" data-count="${attr(av)}">${esc(av)}</b></li>`;
  }).join('\n                ')}
              </ul>
            </figure>`;
};

const matchColumns = (x, gk) => {
  const t = x.timeline;
  if (t.length < 2) return '';
  const W = 640;
  const H = 156;
  const base = 118;
  const step = W / t.length;
  const bw = Math.max(3, Math.min(24, step * 0.56));
  const up = (v) => (gk ? (v.conceded || 0) : v.goals + v.assists);
  const top = Math.max(1, ...t.map(up));
  const unit = (base - 16) / top;
  const rx = Math.min(4, bw / 2).toFixed(1);
  const w = bw.toFixed(1);
  /* ONE GROUP A MATCH, so each column grows in its own turn, lights up on its
     own hover and names its own match. Goals sit on the baseline and assists
     stack above them with a surface gap; a match with neither keeps a stub so
     every match on the record is visible. The result sits under its column. */
  const cols = t.map((v, i) => {
    const cx = i * step + step / 2;
    const x0 = (cx - bw / 2).toFixed(1);
    const a = gk ? (v.conceded || 0) : v.goals;
    const b = gk ? 0 : v.assists;
    const ha = a * unit;
    const hb = b * unit;
    const tip = `${String(v.opponent || '').replace(/\s+A?FC\b/g, '')} ${v.scoreline || ''}, ${gk ? `${a} conceded` : `${a}G ${b}A`}`;
    return `<g class="pf-col${a + b ? ' has-v' : ''}" style="--i:${i}"><title>${esc(tip)}</title><rect class="pf-col__hit" x="${(i * step).toFixed(1)}" width="${step.toFixed(1)}" height="${H}"/>${
      a + b ? '' : `<rect class="pf-col__z" x="${x0}" y="${base - 3}" width="${w}" height="3" rx="1.5"/>`}${
      a ? `<rect class="pf-col__a" x="${x0}" y="${(base - ha).toFixed(1)}" width="${w}" height="${ha.toFixed(1)}" rx="${rx}"/>` : ''}${
      b ? `<rect class="pf-col__b" x="${x0}" y="${(base - ha - hb).toFixed(1)}" width="${w}" height="${Math.max(1, hb - (a ? 2 : 0)).toFixed(1)}" rx="${rx}"/>` : ''}<circle class="pf-col__r" data-res="${esc(v.outcome || '')}" cx="${cx.toFixed(1)}" cy="${H - 14}" r="${Math.max(2, Math.min(6, step * 0.26)).toFixed(1)}"/></g>`;
  }).join('');
  const total = t.reduce((n, v) => n + up(v), 0);
  const most = Math.max(...t.map(up));
  const topY = (base - top * unit).toFixed(1);
  return `<figure class="pf-chart pf-chart--cols">
              <figcaption class="pf-chart__k">Match by match
                <span class="pf-chart__key"><i class="is-a"></i>${gk ? 'Conceded' : 'Goals'}${gk ? '' : '<i class="is-b"></i>Assists'}<i class="is-w"></i>Won</span></figcaption>
              <svg class="pf-cols" viewBox="0 0 ${W} ${H}" role="img" aria-label="${attr(gk
    ? `${total} conceded across ${t.length} matches, never more than ${most} in one`
    : `${total} goals and assists across ${t.length} matches, most in one match ${most}`)}" data-cols="${t.length}">
                <line class="pf-cols__top" x1="0" y1="${topY}" x2="${W}" y2="${topY}"/>
                <line class="pf-cols__base" x1="0" y1="${base}" x2="${W}" y2="${base}"/>
                ${cols}
              </svg>
              <p class="pf-chart__sub">${esc(total)} ${gk ? 'conceded' : 'goals and assists'} across ${esc(t.length)} matches. The dashed line is the most in one match: ${esc(most)}. Point at a column for the match.</p>
            </figure>`;
};

/* ================= AGAINST THE SQUAD =================
   A percentile wheel: one wedge per measure, as long as the share of the
   squad he is ahead of that season, with his photograph at the hub. Counted
   by the same engine as every other figure, over the same season's players,
   so a wedge can be checked against the list beside it. A player with none of
   something scores nought on it rather than sharing a tie with the others who
   have none. */
const profileWheel = (me, won, team, gk, where, face) => {
  if (!me || !(me.starts || me.apps) || !team.matches) return '';
  /* HIS SHARE OF THE CLUB'S RECORD, not a rank against team-mates. Each
     wedge is his figure over the club's own total across the same matches:
     starts out of matches played, goals out of goals scored, and so on.
     Starts, not appearances: an appearance also counts coming off the bench,
     and the club reads a start as the figure that says who plays. */
  const metrics = gk ? [
    ['Starts', me.starts, team.matches, 'matches'],
    ['Clean sheets', me.cleanSheets, team.cleanSheets, 'clean sheets'],
    ['Wins', won, team.wins, 'wins'],
    ['Captained', me.captained, team.matches, 'matches'],
  ] : [
    ['Starts', me.starts, team.matches, 'matches'],
    ['Goals', me.goals, team.goals, 'goals'],
    ['Assists', me.assists, team.assists, 'assists'],
    ['Goals and assists', (me.goals || 0) + (me.assists || 0), team.goals, 'goals'],
    ['Wins', won, team.wins, 'wins'],
    ['Clean sheets', me.cleanSheets, team.cleanSheets, 'clean sheets'],
  ];
  /* A measure the club has no total for yet (no clean sheet kept, no assist
     recorded) has nothing to be a share of, so it is left off rather than
     drawn as "0 of 0". */
  const rows = metrics.filter(([, , of]) => of > 0).map(([k, v, of, noun]) => ({
    k, v: v || 0, of, noun,
    pct: Math.min(100, Math.round((100 * (v || 0)) / of)),
  }));
  if (rows.length < 3) return '';
  const C = 160;
  const R0 = 42;
  const R1 = 146;
  const span = 360 / rows.length;
  const gap = 2.2;
  const pt = (r, deg) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [(C + r * Math.cos(a)).toFixed(1), (C + r * Math.sin(a)).toFixed(1)];
  };
  const sector = (r, a0, a1) => `M${pt(R0, a0).join(' ')}L${pt(r, a0).join(' ')}A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${pt(r, a1).join(' ')}L${pt(R0, a1).join(' ')}A${R0} ${R0} 0 0 0 ${pt(R0, a0).join(' ')}Z`;
  const edge = (i) => [i * span + gap / 2, (i + 1) * span - gap / 2];
  const top = Math.max(...rows.map((r) => r.pct));
  const bg = rows.map((_, i) => sector(R1, ...edge(i))).join('');
  const wedges = rows.map((r, i) => `<path class="pf-wheel__v${top && r.pct === top ? ' is-top' : ''}" style="--i:${i};--p:${(r.pct / 100).toFixed(2)}" d="${sector(R0 + ((R1 - R0) * Math.max(r.pct, 3)) / 100, ...edge(i))}"><title>${esc(`${r.k}: ${r.v} of ${r.of} ${r.noun}, ${r.pct}%`)}</title></path>`).join('');
  const labels = rows.map((r, i) => {
    const [lx, ly] = pt(R0 + (R1 - R0) * 0.64, (i + 0.5) * span);
    return `<text class="pf-wheel__t" x="${lx}" y="${ly}" style="--i:${i}" data-count="${r.pct}%">${r.pct}%</text>`;
  }).join('');
  /* A photograph stored inline would be repeated in every season's panel, so
     only a file is used at the hub; anything else gets the club star. */
  const faceImg = face && !/^data:/.test(face)
    ? `<img src="${attr(face)}" alt="" width="96" height="96" loading="lazy" decoding="async" />`
    : `<img class="is-star" src="${STAR}" alt="" width="76" height="94" loading="lazy" decoding="async" />`;
  return `<figure class="pf-chart pf-chart--wheel">
              <figcaption class="pf-chart__k">Share of the club’s record<span class="pf-chart__key">Out of the club’s own totals ${esc(where)}</span></figcaption>
              <div class="pf-wheel">
                <div class="pf-wheel__art">
                  <svg viewBox="0 0 320 320" role="img" aria-label="${attr(`Share of the club’s record ${where}: ${rows.map((r) => `${r.k} ${r.v} of ${r.of}, ${r.pct}%`).join('; ')}`)}">
                    <path class="pf-wheel__bg" d="${bg}"/>
                    <g class="pf-wheel__rings">${[0.25, 0.5, 0.75, 1].map((f) => `<circle cx="${C}" cy="${C}" r="${(R0 + (R1 - R0) * f).toFixed(1)}"/>`).join('')}</g>
                    ${wedges}${labels}
                  </svg>
                  <span class="pf-wheel__face" aria-hidden="true">${faceImg}</span>
                </div>
                <ol class="pf-wheel__list">${rows.map((r, i) => `<li style="--i:${i}"><span>${esc(r.k)}</span><b data-count="${r.pct}%">${r.pct}%</b><i>${esc(r.v)} of ${esc(r.of)} ${esc(r.noun)}</i></li>`).join('')}</ol>
              </div>
              <p class="pf-chart__sub">Each wedge is his part of the club’s own total ${esc(where)}: his starts out of the matches played, his goals out of the goals the club scored, his assists out of every assist, his wins out of the club’s wins and the clean sheets he is credited with out of the club’s clean sheets.</p>
            </figure>`;
};

/* An SVG coordinate, as short as it can be written without moving. `.0` on
   every point of every chart is a tenth of a kilobyte on the heaviest profile
   and means nothing to a renderer. */
const sv = (n) => String(Math.round(Number(n) * 10) / 10);

export function playerPage(p, d) {
  const squadRec = (d.squad || []).find((x) => x.num === p.num) || {};
  const gk = !!squadRec.gk;
  const shot = shotFor(p.num, d, d && d.currentSeason);

  /* One profile per season, plus an all-time one for the hero and the squad
     comparison. The seasons come from the club's own list, so a season with
     no matches still gets a tab and can say so. */
  const seasonNames = (d.seasons || []).map((s) => s.name);
  /* COMPETITIVE MATCHES ONLY, for the "of N played" beside the appearances.
     The profile already counts from a player's competitive record, so a
     friendly never added to his figures, but the club's total was every match
     the season held: 26/27 read "1 of 7 played" when one League Eight match
     had been played and six pre-season friendlies. */
  /* League and cup together, never split, and never pre-season. */
  const counted = (d.played || []).filter((m) => m.played && !m.friendly);
  /* SAVES, PER VIEW. The engine credits a game in goal to whoever the record
     names as `keeper` and adds that match's `saves` where one is recorded;
     the same rule over one season's matches gives that season's figure. Only
     games that actually carry a saves number count towards the rate, so a
     season with no saves on record never reads as nought a game. */
  const keeping = (list) => {
    let games = 0;
    let saves = 0;
    for (const m of list) {
      const det = m.detail || {};
      if (det.keeper == null || Number(det.keeper) !== Number(p.num)) continue;
      if (!Number.isFinite(Number(det.saves)) || det.saves === '' || det.saves === null) continue;
      games += 1;
      saves += Number(det.saves);
    }
    return { keeperGames: games, keeperSaves: saves };
  };
  const seasons = seasonNames.map((name) => {
    const ms = counted.filter((m) => m.season === name);
    const profile = Object.assign(playerProfile(p, ms, d.players), keeping(ms));
    profile.teamGames = ms.length;
    return { name, profile, matches: ms };
  });
  const all = Object.assign(playerProfile(p, counted, d.players), keeping(counted));
  all.teamGames = counted.length;
  /* The tab the page opens on: the latest season he actually played in, or
     every season when he has played in none of them. */
  const openIdx = seasons.some((s) => s.profile.apps || s.profile.bench)
    ? seasons.reduce((n, s, i) => ((s.profile.apps || s.profile.bench) ? i : n), 0)
    : seasons.length;
  const pr = all;
  const teamGames = all.teamGames;

  /* The chip beside the position: only awarded where the player genuinely
     leads the squad, so it means something when it appears. */
  const accolades = [];
  if (pr.goalRank === 1) accolades.push('Top goalscorer');
  if (pr.assistRank === 1) accolades.push('Most assists');
  if (pr.cleanSheetRank === 1 && gk) accolades.push('Most clean sheets');
  if (pr.motmRank === 1) accolades.push('Most Man of the Match');

  /* LEADING A SEASON, SAID FOR THAT SEASON. The chips were career ranks only,
     so a player leading the current season showed nothing for it: Charlie
     Dunkley, top of 26/27 for goals and for assists, carried "Most assists ·
     All seasons" and neither of the two things that were true this season.
     Worked out from the same per-season figures the stats page's leaders read
     (d.playersBySeason, competitive matches), newest season first. A shared
     lead is said as joint rather than awarded to whoever sorts first. */
  /* A SHARED LEAD IS SAID AS JOINT AND IS STILL SAID. Minutes, starts and
     appearances are attendance, and in a squad where everyone available plays
     every week a tie is the normal case: seven men share the lead in starts
     this season. The club's call is that sharing it is the fact, not a reason
     to withhold it - a man who has started every match has started every
     match whether or not six others did too. */
  const LEAD_CATS = [['goals', 'Top goalscorer', 'Joint top goalscorer'],
    ['assists', 'Most assists', 'Joint most assists'],
    ['cleanSheets', 'Most clean sheets', 'Joint most clean sheets'],
    ['motm', 'Most Man of the Match', 'Joint most Man of the Match'],
    ['minutes', 'Most minutes', 'Joint most minutes'],
    ['starts', 'Most starts', 'Joint most starts'],
    ['apps', 'Most appearances', 'Joint most appearances']];
  const seasonAccolades = Object.keys(d.playersBySeason || {}).slice().reverse().flatMap((sn) => {
    const pool = d.playersBySeason[sn] || [];
    const me = pool.find((x) => String(x.num) === String(p.num));
    if (!me) return [];
    return LEAD_CATS.filter(([k]) => k !== 'cleanSheets' || gk).flatMap(([k, label, joint]) => {
      const best = Math.max(0, ...pool.map((x) => x[k] || 0));
      if (!best || (me[k] || 0) !== best) return [];
      const shared = pool.filter((x) => (x[k] || 0) === best).length > 1;
      return [{ label: shared ? joint : label, season: sn }];
    });
  });

  /* STARTS AND APPEARANCES ARE THE SAME CHIP when nobody came off the bench,
     which is most seasons: a man who started every match also appeared in
     every match, and saying both is saying one thing twice. Appearances is
     dropped where it would only repeat starts. */
  for (let i = seasonAccolades.length - 1; i >= 0; i -= 1) {
    const a = seasonAccolades[i];
    if (!/most appearances$/i.test(a.label)) continue;
    if (seasonAccolades.some((b) => /most starts$/i.test(b.label) && b.season === a.season)) {
      seasonAccolades.splice(i, 1);
    }
  }

  const recog = d.recognition || [];
  const seasonAwards = recog.filter((r) => r.type === 'season_award' && r.playerId === p.num);
  const potm = recog.filter((r) => r.type === 'potm' && r.playerId === p.num);
  /* THE ARMBAND IS A SEASON'S. Every leadership record, newest first: the
     chip is the latest season's role (today's armband), and the honours list
     every season's, so Jim El Bayati keeps "Club captain · 25/26" while Daniel
     McLane's page leads with 26/27. It was `find`, the first record in the
     list whatever its season. */
  const leaderships = recog.filter((r) => r.type === 'leadership')
    .sort((a, b) => String(b.season || '').localeCompare(String(a.season || '')));
  const roleIn = (l) => (l ? [
    l.clubCaptainPlayerId === p.num ? 'Club captain' : null,
    l.viceCaptainPlayerId === p.num ? 'Vice-captain' : null,
    l.thirdChoiceCaptainPlayerId === p.num ? 'Third-choice captain' : null,
  ].find(Boolean) : null);
  const leadership = leaderships[0];
  const captainOf = roleIn(leadership);

  /* "Retained for 26/27" was written here as a literal string, and in the
     control panel's dropdown as a second one, so in July 2027 both were wrong
     and only a developer could correct them. The label comes from the record
     now, for the season being looked at, and the season is named beside it
     rather than baked into it. See src/lib/squad-status.mjs. */
  const nowStatus = d.statusLabelIn
    ? d.statusLabelIn(p.num, d.currentSeason)
    : { key: squadRec.status, label: null, derived: false };
  const statusLabel = nowStatus.label;

  /* A PLAYER'S SEASON IS SELLABLE, and the panel sells it: "Ade Owolona's
     season" is one of the slots on the shelf. Nothing read it, so a business
     could buy a player's season and never appear anywhere on his page. A line
     of text under the name, not a logo: this is a small sponsorship, not one
     of the partners whose marks are contractual. */
  const seasonSponsor = (() => {
    const sp = (d.sponsorships || {})['player-' + p.num];
    if (!sp || !sp.name) return '';
    const who = sp.url
      ? `<a href="${attr(sp.url)}" rel="noopener nofollow" target="_blank">${esc(sp.name)}</a>`
      : esc(sp.name);
    return `<p class="pf-sponsor">${esc(p.first || p.name)}’s season is sponsored by ${who}${
      sp.note ? ` <i>${esc(sp.note)}</i>` : ''}</p>`;
  })();

  /* ================= HERO ================= */
  const hero = `<section class="pf-hero" aria-labelledby="pf-h">
      <div class="wrap pf-hero__grid">
        <div class="pf-hero__shot">
          ${shot
    ? `<img src="${attr(shot)}" alt="${attr(p.name)}" width="420" height="560" decoding="async" />`
    : `<img class="pf-hero__crest" src="${STAR}" alt="Sue’s Angels FC star" width="260" height="322" decoding="async" />`}
        </div>
        <div>
          <p class="pf-chips">
            <span class="pf-chip pf-chip--pos">${esc(squadRec.position || p.position)}</span>
            ${/* Career ranks, so they say so: under a season tab an undated "Top
                  goalscorer" reads as that season's. */''}
            ${seasonAccolades.map((a) => `<span class="pf-chip">${esc(a.label)}<i>${esc(a.season)}</i></span>`).join('\n            ')}
            ${accolades.map((a) => `<span class="pf-chip">${esc(a)}<i>All seasons</i></span>`).join('\n            ')}
            ${captainOf ? `<span class="pf-chip">${esc(captainOf)}<i>${esc(leadership.season || d.currentSeason)}</i></span>` : ''}
            ${statusLabel ? `<span class="pf-chip pf-chip--mut">${esc(statusLabel)}<i>${esc(d.currentSeason)}</i></span>` : ''}
            ${/* WHAT THE CLUB SAID BESIDE THE STATUS. "On trial" is a window
                  and this is when it opened; an injury says when he went out
                  and when he is expected back; a departure says where he
                  went. Drawn only where the club has actually said, so a
                  record written before any of it was askable reads exactly as
                  it did. */
    nowStatus.detail ? `<span class="pf-chip pf-chip--mut">${esc(nowStatus.detail)}</span>` : ''}
          </p>
          <h1 class="pf-hero__name" id="pf-h">
            <b>${esc(p.last)}</b>
            <i>${esc(p.first)}</i>
          </h1>
          ${seasonSponsor}
          ${/* THE SENTENCE FOLLOWS THE TAB. It printed career totals dated to the
                current season, and then both at once; a season tab now reads that
                season alone and All seasons reads every season. Each tab's
                sentence rides on the element and the tab script swaps it; with
                the script blocked it reads the tab the page opens on. */''}
          ${(() => {
    const made = (x) => (gk
      ? `${x.cleanSheets} clean ${x.cleanSheets === 1 ? 'sheet' : 'sheets'} and ${x.conceded} conceded`
      : `${x.goals} ${x.goals === 1 ? 'goal' : 'goals'} and ${x.assists} ${x.assists === 1 ? 'assist' : 'assists'}`);
    /* STARTS LEAD, at the club's request: an appearance also counts coming
       off the bench, so the sentence opens on the starts and names the bench
       outings after them. */
    const startsOf = (x) => `${x.starts} ${x.starts === 1 ? 'start' : 'starts'}`;
    const offBench = (x) => (x.apps > x.starts ? `, ${x.apps - x.starts} off the bench` : '');
    const unused = (x) => (x.bench ? `, plus ${x.bench} unused` : '');
    const ledeFor = (x, name) => (name === 'All seasons'
      ? `${startsOf(x)} for ${CLUB.name} across every season${offBench(x)}${unused(x)}, ${made(x)}.`
      : (x.apps || x.bench)
        ? `${startsOf(x)} in ${name}${offBench(x)}${unused(x)}, ${made(x)}.`
        : `No starts in ${name}.`);
    const ledes = [...seasons.map((s) => ledeFor(s.profile, s.name)), ledeFor(all, 'All seasons')];
    return `<p class="pf-hero__lede" data-season-lede${ledes.map((t, i) => ` data-lede-${i}="${attr(t)}"`).join('')}>${esc(ledes[openIdx] || ledes[ledes.length - 1])}</p>`;
  })()}
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

    /* A dot where the total rose, each popping as the wipe reaches it. Drawn
       as zero-length round-capped strokes that do not scale, because this
       chart is stretched to its box and a circle would come out an ellipse. */
    const rises = xy.map(([px, py], i) => (i && series[i] > series[i - 1]
      ? `<line class="pf-plot__ev" x1="${px.toFixed(1)}" y1="${py.toFixed(1)}" x2="${px.toFixed(1)}" y2="${py.toFixed(1)}" style="--t:${(i / (series.length - 1)).toFixed(2)}"/>`
      : '')).join('');
    const [ex, ey] = xy[xy.length - 1].map((v) => v.toFixed(1));

    return `<figure class="pf-plot rv" data-plot>
              <svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${attr(key)}-t" preserveAspectRatio="none">
                <title id="${attr(key)}-t">Running total of ${esc(unit)}, reaching ${esc(top)} across ${esc(series.length)} matches</title>
                <defs>
                  <linearGradient id="${attr(key)}-g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--volt)" stop-opacity="0.3" />
                    <stop offset="55%" stop-color="var(--volt)" stop-opacity="0.07" />
                    <stop offset="100%" stop-color="var(--volt)" stop-opacity="0" />
                  </linearGradient>
                  ${/* THE REVEAL IS A WIPE. The line used to draw along a dash
                       measured in the chart's own units, and the chart is
                       stretched to its box, so it stopped two thirds of the way. */''}
                  <clipPath id="${attr(key)}-w"><rect class="pf-plot__wipe" x="0" y="0" width="${W}" height="${H}" /></clipPath>
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
                <g clip-path="url(#${attr(key)}-w)">
                  <polygon class="pf-plot__area" points="${area}" fill="url(#${attr(key)}-g)" />
                  <polyline class="pf-plot__glow" points="${pts.join(' ')}" />
                  <polyline class="pf-plot__line" points="${pts.join(' ')}" fill="none" stroke="var(--volt)"
                    stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
                  ${rises}
                </g>
                <line class="pf-plot__cross" x1="0" y1="${PAD}" x2="0" y2="${H - PAD}" stroke="var(--volt)"
                  stroke-width="1" stroke-dasharray="3 3" opacity="0" vector-effect="non-scaling-stroke" />
                ${xy.map(([px, py], i) => {
    const t = x.timeline[i];
    const made = gk ? (t.conceded === 0 ? 'Clean sheet' : `${t.conceded} conceded`)
      : [t.goals ? `${t.goals}G` : '', t.assists ? `${t.assists}A` : ''].filter(Boolean).join(' ') || 'No return';
    /* THE OPPONENT AND THE SCORE ARE NOT CARRIED HERE ANY MORE. "How it went"
       sits one band above with the same matches in the same order, the score
       printed on every pip and the club named on hover - so this readout was
       answering a question that had already been answered, at 45 bytes a
       point on a page at its ceiling.

       THE PLOT IS THE TREND AND THE STRIP IS THE MATCH LIST. What is left is
       what a running total is actually for: what he did at that point and
       where it took him. Which match it was is one band up, in order, on a
       link. */
    return `<circle class="pf-plot__pt" cx="${sv(px)}" cy="${sv(py)}" r="10" data-total="${attr(series[i])}" data-made="${attr(made)}"/>`;
  }).join('')}
                <line class="pf-plot__pulse" x1="${ex}" y1="${ey}" x2="${ex}" y2="${ey}" />
                <line class="pf-plot__end" x1="${ex}" y1="${ey}" x2="${ex}" y2="${ey}" />
              </svg>
              <figcaption class="pf-plot__cap" data-readout>
                <span class="pf-plot__lo">First match</span>
                <b>${esc(top)} ${esc(unit)}</b>
                <span class="pf-plot__hi">Last match</span>
              </figcaption>
              ${/* Two hints, one shown per pointer. "Point at the line" is an
                   instruction a phone cannot follow, and it was the only thing
                   telling anyone the chart could be read at all. */''}
              <p class="pf-plot__hint pf-plot__hint--fine">Point at the line to read each match.</p>
              <p class="pf-plot__hint pf-plot__hint--coarse">Touch the line to read each match.</p>
            </figure>`;
  };

  /* ================= SEASON PANEL BUILDERS =================
     Each of these takes a profile rather than closing over one, so the same
     code renders every season's panel. */

  /* A season he was named in and never played has no win rate. "0%, 0 of 0"
     reads as a man who lost every game, so the figure is left out instead. */
  const winTile = (x) => (x.won + x.drawn + x.lost ? [{ v: `${x.winPct}%`, k: 'Won when playing', pct: x.winPct }] : []);
  const winBar = (x) => (x.won + x.drawn + x.lost ? [bar('Won when playing', `${x.winPct}%`, x.winPct, `${x.won} of ${x.won + x.drawn + x.lost}`)] : []);

  /* A TILE FOR A NON-EVENT IS NOISE. "Unused sub 0" and "Goals 0" each took
     a sixth of the headline row to say that nothing happened, and the two of
     them together pushed the figures that DID happen off the first line a
     reader looks at. Dropped when they are nought - unless nought is the
     point, which is what `keep` is for: a goalkeeper's conceded column is a
     fact at nought and the best one he will ever have.

     The club's own figure is never hidden: everything dropped here is still
     in the record band, the charts and the table below. */
  const live = (list) => list.filter((t) => t && (t.keep || Number(t.v) > 0 || /[1-9]/.test(String(t.v))));

  /* MINUTES ON THE PITCH, where the record can count them. It needs the
     substitutions to carry a minute, which is true of this season and of
     almost nothing before it, so the tile is absent rather than wrong on an
     older tab. The second line is not decoration: 448 minutes is a different
     claim over five matches and over eighteen. */
  const minuteTile = (x) => (x.minutes && x.minutesGames ? [{
    v: `${x.minutes}'`, k: 'On the pitch',
    sub: `over ${x.minutesGames} ${x.minutesGames === 1 ? 'match' : 'matches'}`
      + (x.minutesPerStart ? `, ${x.minutesPerStart} a game` : ''),
    pct: Math.min(100, Math.round((x.minutes / (x.minutesGames * (x.fullMatch || 90))) * 100)),
    keep: true,
  }] : []);

  const tilesFor = (x) => live(gk ? [
    { v: x.starts, k: 'Starts', sub: `of ${x.teamGames} played${x.apps > x.starts ? `, ${x.apps - x.starts} off the bench` : ''}`, pct: x.teamGames ? Math.round((x.starts / x.teamGames) * 100) : 0 },
    { v: x.cleanSheets, k: 'Clean sheets', sub: `of ${x.onRecord} on record`, pct: x.cleanSheetPct, keep: true },
    { v: x.conceded, k: 'Conceded', keep: true },
    { v: x.concededPerGame, k: 'Conceded a game', keep: true },
    { v: x.motm, k: 'Man of the Match' },
    ...winTile(x),
    ...minuteTile(x),
    ...(x.keeperGames ? [
      { v: x.keeperSaves, k: 'Saves', sub: `in ${x.keeperGames} ${x.keeperGames === 1 ? 'game' : 'games'} in goal with saves recorded` },
      { v: (x.keeperSaves / x.keeperGames).toFixed(1), k: 'Saves a game' },
    ] : []),
  ] : [
    { v: x.starts, k: 'Starts', sub: `of ${x.teamGames} played${x.apps > x.starts ? `, ${x.apps - x.starts} off the bench` : ''}`, pct: x.teamGames ? Math.round((x.starts / x.teamGames) * 100) : 0, keep: true },
    ...minuteTile(x),
    { v: x.goals, k: 'Goals' },
    { v: x.assists, k: 'Assists' },
    { v: x.perGame, k: 'Goals + assists a game' },
    /* An outfielder's share of the clean sheets, which the club records by
       NAMING the back line. It is his afternoon's work as much as a goal is
       a striker's, and the page had no way of saying so. This read the
       club's clean sheets over his matches until October 2026, which is a
       fact about the team wearing his name. */
    { v: x.cleanSheets, k: 'Clean sheets', sub: x.onRecord ? `of ${x.onRecord} on record` : '' },
    { v: x.motm, k: 'Man of the Match' },
    { v: x.bench, k: 'Unused sub' },
    ...winTile(x),
  ]);

  const barsFor = (x) => (gk ? [
    bar('Clean sheets', x.cleanSheets, x.cleanSheetPct, `${x.cleanSheetPct}% of ${x.onRecord}`),
    bar('Games conceding', x.onRecord - x.cleanSheets, x.onRecord ? Math.round(((x.onRecord - x.cleanSheets) / x.onRecord) * 100) : 0),
    ...winBar(x),
  ] : [
    bar('Goals', x.goals, x.involvements ? Math.round((x.goals / x.involvements) * 100) : 0),
    bar('Assists', x.assists, x.involvements ? Math.round((x.assists / x.involvements) * 100) : 0),
    ...winBar(x),
  ]);

  const ranksFor = (x) => [
    gk && x.cleanSheetRank ? { v: ordinal(x.cleanSheetRank), k: 'Clean sheets in the squad', s: `${x.cleanSheets} kept` } : null,
    !gk && x.goalRank ? { v: ordinal(x.goalRank), k: 'Goalscorer in the squad', s: `${x.goals} scored` } : null,
    !gk && x.assistRank ? { v: ordinal(x.assistRank), k: 'Assister in the squad', s: `${x.assists} made` } : null,
    x.motmRank ? { v: ordinal(x.motmRank), k: 'Man of the Match in the squad', s: `${x.motm} awarded` } : null,
    x.won + x.drawn + x.lost ? { v: `${x.winPct}%`, k: 'Won when playing', s: `${x.won}W ${x.drawn}D ${x.lost}L` } : null,
  ].filter(Boolean);

  /* A season with no matches in the record. Said plainly, because a grid of
     zeroes reads as a player who contributed nothing rather than as a season
     that has not started. */
  const emptyPanel = (name) => {
    /* THE SEASON HAS NOT STARTED, or it has and none of it counted. Two
       different facts, and one sentence was serving for both: this page told
       a man who started, scored and made one on 2 August that nothing had
       been played in 26/27 that we hold a team sheet for. We hold his. */
    const f = d.friendlyFor ? d.friendlyFor(p.num, name) : null;
    if (f) {
      const did = [
        f.goals ? `${f.goals} ${f.goals === 1 ? 'goal' : 'goals'}` : '',
        f.assists ? `${f.assists} ${f.assists === 1 ? 'assist' : 'assists'}` : '',
      ].filter(Boolean).join(' and ');
      return `<div class="pf-empty">
            <p class="pf-empty__k">${esc(name)}</p>
            <p class="pf-empty__t">No competitive match yet.</p>
            <p class="pf-empty__b">${esc(f.apps === 1 ? 'One friendly' : `${f.apps} friendlies`)}
              in ${esc(name)}${did ? `, ${esc(did)}` : ''}. ${esc(FRIENDLY_NOTE_SHORT)}
              The figures on this page fill in once the league season starts.</p>
          </div>`;
    }
    return `<div class="pf-empty">
            <p class="pf-empty__k">${esc(name)}</p>
            <p class="pf-empty__t">No matches on record yet.</p>
            <p class="pf-empty__b">Nothing has been played in ${esc(name)} that we hold a team sheet for.
              Every figure on this page is counted from those sheets, so this season fills in as the
              results come in.</p>
          </div>`;
  };

  /* THE SEASON AS IT WENT, which is the one thing every football page has and
     this one did not. Won, drawn and lost told apart by weight and structure
     rather than by a second colour, in the order they happened, each one a
     link to the match it came from.

     A PIP, NOT A CARD. The first version was a card per match carrying the
     opponent and what he did in words, and on the heaviest profile it cost
     9.6KB of a page already at 158KB of its 160KB ceiling. A strip of pips is
     what a form guide actually looks like, reads at a glance rather than by
     reading, and costs a third as much; everything the card said is on the
     link's own label, where a screen reader gets all of it and the bytes are
     spent once.

     SEASON TABS ONLY. Under All seasons this is the longest season again with
     every other season added to it - the same reason the match-by-match
     columns and the last-time-out card are season-only. */
  const formBand = (x, idx, all) => {
    const tl = (x.timeline || []);
    if (all || tl.length < 2) return '';
    const OUT = { W: 'Won', D: 'Drawn', L: 'Lost' };
    const w = tl.filter((t) => t.outcome === 'W').length;
    const dr = tl.filter((t) => t.outcome === 'D').length;
    const l = tl.filter((t) => t.outcome === 'L').length;
    return `<section class="pf-sub" aria-labelledby="pf-f-${idx}">
            ${rail('NUM', 'How it went', `${w}W ${dr}D ${l}L`)}
            <h3 class="h2 rv" id="pf-f-${idx}">How it <span class="volt">went.</span></h3>
            <p class="pf-run__cap">Every match he played, in order. A filled pip is a win, an outline a draw.
              A dot marks a goal or an assist, bigger for more than one. Point at one for the opponent and
              the date; press it to open the match.</p>
            <ol class="pf-run rv">${tl.map((t, i) => {
    const did = [t.goals ? `${t.goals} ${t.goals === 1 ? 'goal' : 'goals'}` : '',
      t.assists ? `${t.assists} ${t.assists === 1 ? 'assist' : 'assists'}` : '',
      t.motm ? 'Player of the Match' : ''].filter(Boolean).join(', ');
    const o = String(t.outcome || '').toUpperCase();
    /* THE LABEL OPENS WITH WHAT THE PIP SAYS. A voice-control user activates
       a link by speaking the text they can see, so an accessible name that
       does not contain the visible one is a control they cannot reach -
       "Won 2-1 home v Three Little Birds" against a pip reading "W 2-1".
       Found by the accessibility engine, not by reading it. */
    const label = `${o} ${t.scoreline}, ${(OUT[o] || 'played').toLowerCase()} ${t.home ? 'at home' : 'away'} to ${shortClub(t.opponent)}`
      + `${t.minutes != null ? `, ${t.minutes} mins` : ''}${did ? `, ${did}` : ''}`;
    const ret = (t.goals || 0) + (t.assists || 0);
    /* THE CREST AND THE DATE ON HOVER. A pip says what happened; it does not
       say who to, and a strip of thirty-four results with no opponent on it is
       a shape rather than a season. Shown on hover AND on keyboard focus, so
       it is not a fact only a mouse can reach.

       `aria-hidden`, because the link's own label already carries every word
       of it and a screen reader reading the opponent twice is worse than not
       drawing it. The crest is lazy, so thirty-four of them cost nothing
       until somebody points at one. */
    const tip = `<span class="pf-run__tip" aria-hidden="true">${oppBadge(t.opponent, d.badges, 22, 22, '', true)}<b>${esc(shortClub(t.opponent))}</b><i>${esc(fmtDate(t.date))}</i></span>`;
    return `<li style="--i:${i}"><a class="pf-run__m${o === 'W' ? ' is-w' : o === 'L' ? ' is-l' : ' is-d'}${ret ? ' has-ret' : ''}"${ret ? ` style="--r:${Math.min(ret, 4)}"` : ''} href="${attr(`/matches/${t.id}.html`)}" aria-label="${attr(label)}"><b>${esc(o || '-')}</b><span>${esc(t.scoreline)}</span>${tip}</a></li>`;
  }).join('')}</ol>
          </section>`;
  };

  const seasonPanel = (sn, x, idx) => {
    if (!x.apps && !x.bench) {
      return `<div class="pf-panel" id="pf-s-${idx}" data-season-panel="${idx}">
          ${emptyPanel(sn)}
        </div>`;
    }
    return numberPanel(`<div class="pf-panel" id="pf-s-${idx}" data-season-panel="${idx}">
          <section class="pf-sub" aria-labelledby="pf-n-${idx}">
            ${rail('NUM', sn === 'All seasons' ? 'Every season' : 'The season', `${sn} · ${x.starts} ${x.starts === 1 ? 'start' : 'starts'}`)}
            <h3 class="h2 rv" id="pf-n-${idx}">${esc(sn)} in <span class="volt">numbers.</span></h3>
            <ul class="pf-tiles${tilesFor(x).length > 6 ? ' pf-tiles--8' : ''} rv">
              ${tilesFor(x).map(statTile).join('\n              ')}
            </ul>
          </section>

          ${formBand(x, idx, sn === 'All seasons')}

          <section class="pf-sub" aria-labelledby="pf-r-${idx}">
            ${rail('NUM', gk ? 'Defensive record' : 'Attacking record', `${x.starts} ${x.starts === 1 ? 'start' : 'starts'}`)}
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

          ${(() => {
    /* IN PICTURES: the season's results, his share of the goals, home and
       away, and every match as a column. The columns are a season's; under
       All seasons they would be the longest season's again. */
    const charts = [resultsDonut(x), shareGauge(x, gk), homeAway(x, gk)].filter(Boolean);
    /* THE MATCH-BY-MATCH COLUMNS ARE GONE, and "How it went" is what replaced
       them. Both were every match in order; the columns gave bar height for
       goals and assists and named the match in a hover title, which is a fact
       behind a pointer. The strip gives the result, the score, the opponent,
       the minutes and the return, in text, as a link, readable on a phone -
       and the size of the return survives as the size of the dot. It also
       paid for itself: the heaviest profile was at its byte ceiling and could
       not have carried both. */
    const cols = '';
    /* The club's own record over exactly the matches this panel counts. */
    const wheelPool = sn === 'All seasons' ? (d.players || []) : ((d.playersBySeason || {})[sn] || []);
    const teamList = sn === 'All seasons' ? counted : ((seasons.find((s) => s.name === sn) || {}).matches || []);
    const scored = teamList.filter((m) => m.countsGoals);
    const team = {
      matches: teamList.length,
      goals: scored.reduce((t, m) => t + (m.ourGoals || 0), 0),
      assists: wheelPool.reduce((t, q) => t + (q.assists || 0), 0),
      cleanSheets: scored.filter((m) => m.theirGoals === 0).length,
      wins: teamList.filter((m) => m.outcome === 'W').length,
    };
    const wheel = profileWheel(wheelPool.find((q) => q.num === p.num), x.won, team, gk,
      sn === 'All seasons' ? 'across every season' : `in ${sn}`, shot);
    const n = charts.length + (cols ? 1 : 0) + (wheel ? 1 : 0);
    return n ? `<section class="pf-sub" aria-labelledby="pf-g-${idx}">
            ${rail('NUM', 'In pictures', `${n} ${n === 1 ? 'chart' : 'charts'}`)}
            <h3 class="h2 rv" id="pf-g-${idx}">${esc(sn === 'All seasons' ? 'Every season' : sn)} in <span class="volt">pictures.</span></h3>
            <div class="pf-charts rv">
            ${wheel}${cols}${charts.join('')}
            </div>
          </section>` : '';
  })()}

          ${/* The career line only when it is more than one season's line again:
                with a single season of any length it is that season's plot twice. */''}
          ${x.timeline.length > 1 && (sn !== 'All seasons'
    || seasons.filter((s) => s.profile.timeline.length > 1).length > 1) ? `<section class="pf-sub" aria-labelledby="pf-c-${idx}">
            ${rail('NUM', 'Through the season', `${x.timeline.length} ${x.timeline.length === 1 ? 'match' : 'matches'}`)}
            <h3 class="h2 rv" id="pf-c-${idx}">${gk ? 'Clean sheets' : 'Goals and assists'} as they
              <span class="volt">came.</span></h3>
            ${chartFor(x, `pf-plot-${idx}`)}
          </section>` : ''}

          ${x.byCompetition.length ? `<section class="pf-sub" aria-labelledby="pf-k-${idx}">
            ${rail('NUM', 'By competition', `${x.byCompetition.length} entered`)}
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
                    <td>${esc(c.starts || 0)}</td>
                    ${gk ? `<td>${esc(c.cleanSheets)}</td><td>${esc(c.conceded)}</td>`
    : `<td>${esc(c.goals)}</td><td>${esc(c.assists)}</td>`}
                    <td>${esc(c.motm)}</td>
                  </tr>`).join('\n                  ')}
                </tbody>
              </table>
            </div>
          </section>` : ''}

          ${/* Recency belongs to a season; under All seasons it is the latest
                season's list again. */''}
          ${x.last.length && sn !== 'All seasons' ? `<section class="pf-sub" aria-labelledby="pf-l-${idx}">
            ${rail('NUM', 'Most recent', `${x.last.length} ${x.last.length === 1 ? 'match' : 'matches'}`)}
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
        </div>`);
  };

  /* ================= 01 SEASONS =================
     Tabs ship as jump links over panels that are all visible, which is what a
     reader gets with the script blocked. The script promotes them. */
  const seasonBand = `<section class="sec pf-seasons" id="seasons" aria-labelledby="pf-seasons-h">
      <div class="wrap">
        <h2 class="sr-only" id="pf-seasons-h">Season by season</h2>
        ${/* EVERY SEASON TOGETHER IS A TAB TOO, last and never the one the page
              opens on: a season is what most people came for, and the career
              figures had nowhere of their own, so they leaked into the season
              sentences instead. */''}
        <div class="pf-tabs" data-season-tabs>
          ${seasons.map((s, i) => `<a class="pf-tab" href="#pf-s-${i}" data-season-tab="${i}">
            <b>${esc(s.name)}</b>
            <i>${s.profile.apps ? `${s.profile.starts} ${s.profile.starts === 1 ? 'start' : 'starts'}` : 'Not played'}</i>
          </a>`).join('\n          ')}
          ${seasons.length > 1 ? `<a class="pf-tab" href="#pf-s-${seasons.length}" data-season-tab="${seasons.length}" data-season-all>
            <b>All seasons</b>
            <i>${all.apps ? `${all.starts} ${all.starts === 1 ? 'start' : 'starts'}` : 'Not played'}</i>
          </a>` : ''}
        </div>
        <div class="pf-panels">
          ${seasons.map((s, i) => seasonPanel(s.name, s.profile, i)).join('\n          ')}
          ${seasons.length > 1 ? seasonPanel('All seasons', all, seasons.length) : ''}
        </div>
      </div>
    </section>`;

  /* THE PAGE-LEVEL BAND NUMBERS.

     Each band used to carry a number typed into it, and they were built in a
     different order from the one they are assembled in: the page ran 02, 03,
     06, 06, 04, with two bands both calling themselves 06 and Recognition
     landing after them at 04. Worse, a band that does not render (no honours,
     no recorded detail) left a hole in the sequence.

     A counter handed out in assembly order fixes both. The season block keeps
     its own 01-05 because those are INSIDE a panel and describe one season. */
  /* A placeholder, numbered when the page is assembled. The bands are BUILT
     in a different order from the one they are shown in, so a counter read
     here would hand out numbers in the wrong sequence just as surely as the
     typed ones did. NUM is replaced left to right across the finished body,
     which is the order a reader meets them, and a band that did not render
     never had a placeholder to number. */
  const RAIL = { next: () => 'NUM' };

  /* ================= AGAINST THE SQUAD =================
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
  /* League figures on both sides of the comparison. The pool was every
     competitive match while this player's own figures became the league's,
     so a man with cup starts ranked "31st of 30" against a group he out-numbered
     himself in. */
  const pool = playerStats(counted, d.squad || []).filter((x) => sameRole(x) && (x.starts || 0) > 0);
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

  /* THE BAND ONLY RANKS SOMEBODY IN THE POOL IT NAMES.

     The pool is the players who started a match, chosen deliberately: ranking
     against everyone ever registered dragged the median to one goal. Eight
     outfield players started none this season, and the band ranked them
     against the 27 anyway, which is arithmetically what `1 + how many are
     above me` gives and is a claim to a place in a group they are not in.
     On the Starts row every one of the eight read "28th of 27": a rank
     outside its own population, printed on eight player pages.

     A player with no starts has nothing to compare, so the page says that
     instead of manufacturing a position for them. */
  const inPool = pool.some((x) => x.num === p.num);

  const versusBand = pool.length > 2 && inPool ? `<section class="sec pf-versus" data-season-scope="all" aria-labelledby="pf-vs-h">
      <div class="wrap">
        ${rail(RAIL.next(), 'Against the squad', `All seasons · ${pool.length} who started a match`)}
        <h2 class="h2 rv" id="pf-vs-h">How that <span class="volt">compares.</span></h2>
        <p class="pf-lede rv">${esc(p.first)} against the ${esc(pool.length)}
          ${gk ? 'goalkeepers' : 'outfield players'} who have started a match for the club,
          across every season and every competition.</p>

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
    </section>` : (pool.length > 2 ? `<section class="sec pf-versus" data-season-scope="all" aria-labelledby="pf-vs-h">
      <div class="wrap">
        ${rail(RAIL.next(), 'Against the squad', `${pool.length} who started a match`)}
        <h2 class="h2 rv" id="pf-vs-h">Not yet in the <span class="volt">comparison.</span></h2>
        <p class="pf-lede rv">This page sets a player against the ${esc(pool.length)}
          ${gk ? 'goalkeepers' : 'outfield players'} who have started a match for the club, across every season.
          ${esc(p.first)} is not one of them yet, so there is no place in that order to
          give him. Everything above is the record as it stands.</p>
      </div>
    </section>` : '');

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
  /* ONE HEAT MAP PER TAB. It was the career map, shown only under All seasons
     once a season tab stopped carrying career figures, so a season tab lost
     where he played altogether. Built from the tab's own team sheets: a start
     counts once in each position the sheet names, a place on the bench half. */
  /* ONE BAND, EVERY TAB. Three bands - one per season and the career - put a
     profile at 207KB, most of it the same match rows written out twice, and
     the interaction script only ever wired the first band. Now one pitch
     carries a layer of heat per tab, one list carries every tab's count on
     each row, and each match row is written once and tagged with its season.
     The tab script shows the right layer and rewrites the counts. */
  const fmtN = (n) => (n % 1 ? n.toFixed(1) : String(n));
  const sideOf = (m) => {
    const det = m.detail;
    if (!det) return null;
    const started = (det.starters || []).find((x) => x.num === p.num);
    const benched = (det.bench || []).find((x) => x.num === p.num);
    const rec = started || benched;
    return rec ? { rec, started: !!started } : null;
  };
  const heatOf = (list) => {
    const tally = new Map();
    for (const m of list) {
      const s = sideOf(m);
      if (!s) continue;
      for (const c of s.rec.positions || []) tally.set(c, (tally.get(c) || 0) + (s.started ? 1 : 0.5));
    }
    const counts = [...tally].map(([code, n]) => ({ code, n })).sort((a, b) => b.n - a.n);
    const weights = counts.filter((w) => PITCH[w.code]);
    const heatMax = Math.max(1, ...weights.map((w) => w.n));
    const heat = placeSpots(weights.map((w) => w.code)).map((sp, i) => ({
      ...sp, n: weights[i].n, k: weights[i].n / heatMax,
    }));
    return {
      heat,
      counts,
      unmapped: counts.filter((w) => !PITCH[w.code]),
      primary: heat.filter((h) => h.k >= 0.34),
      slots: weights.reduce((n, w) => n + w.n, 0),
    };
  };
  const playedSeasons = seasons.map((s, i) => [s, i]).filter(([s]) => s.profile.apps || s.profile.bench);
  /* A player with one season has one layer, shown under both tabs. */
  const views = (playedSeasons.length <= 1
    ? playedSeasons.map(([s, i]) => ({ key: `${i} all`, keys: [String(i), 'all'], list: s.matches, where: `in ${s.name}`, lite: false }))
    : [
      ...playedSeasons.map(([s, i]) => ({ key: String(i), keys: [String(i)], list: s.matches, where: `in ${s.name}`, lite: true })),
      { key: 'all', keys: ['all'], list: counted, where: 'across every season', lite: 'mid' },
    ]).map((v) => ({ ...v, ...heatOf(v.list) }));
  const career = views[views.length - 1] || { heat: [], counts: [], unmapped: [], primary: [], slots: 0 };
  const heat = career.heat;
  const seasonIdx = new Map(seasons.map((s, i) => [s.name, i]));
  const posRows = new Map();
  for (const m of counted.slice().sort((a, b) => (b.iso || '').localeCompare(a.iso || ''))) {
    const s = sideOf(m);
    if (!s) continue;
    for (const c of s.rec.positions || []) {
      if (!posRows.has(c)) posRows.set(c, []);
      posRows.get(c).push({
        opponent: m.opponent,
        competition: m.competition,
        score: m.countsGoals ? `${m.ourGoals}-${m.theirGoals}` : 'W/O',
        date: fmtDate(m.date),
        outcome: m.outcome,
        bench: !s.started,
        si: seasonIdx.get(m.season),
      });
    }
  }

  const blobsFor = (v) => {
    const rnd = lcg(p.num || 1);
    const blobs = [];
    for (const h of v.heat) {
      const cy = h.y * 1.4;
      /* Many small, faint samples rather than a few big bright ones, so the
         density accumulates gradually for the colour ramp to show. Lighter on
         a season layer when the page also carries the career one. */
      const n = v.lite === 'mid' ? 5 + Math.round(h.k * 12)
        : v.lite ? 4 + Math.round(h.k * 9) : 7 + Math.round(h.k * 16);
      /* A wide player runs the line, so his field is drawn long down the
         flank and narrow across it; a central one spreads more evenly. */
      const wide = h.x < 30 || h.x > 70;
      blobs.push({ x: h.x, y: cy, r: 4.6 + 5.4 * h.k, o: 0.32 + 0.36 * h.k, i: blobs.length });
      for (let j = 0; j < n; j++) {
        const ang = rnd() * Math.PI * 2;
        const spread = ((rnd() + rnd()) / 2) * (3.6 + 5.4 * h.k);
        blobs.push({
          x: h.x + Math.cos(ang) * spread * (wide ? 0.72 : 1),
          y: cy + Math.sin(ang) * spread * (wide ? 2.1 : 1.3),
          r: 2.8 + rnd() * (3.4 + 3.6 * h.k),
          o: (0.16 + rnd() * 0.2) * (0.5 + h.k * 0.6),
          i: blobs.length,
        });
      }
    }
    /* Half the markup it was: the opacity lives in the custom property alone
       and the breathing scales the circle rather than animating its radius,
       which is what paid for the wheel on the heaviest profiles. */
    return blobs.map((b) => `<circle cx="${b.x.toFixed(1)}" cy="${b.y.toFixed(1)}" r="${b.r.toFixed(1)}" style="--o:${b.o.toFixed(2)};--d:${((b.i % 9) * 0.72).toFixed(1)}s"/>`).join('');
  };

  /* ================= WHERE HE SCORES FROM =================
     The club records a POINT for a goal now, marked on a pitch in the panel,
     and this is the reader for it. Before this the record held three buckets
     - six-yard box, inside, outside - which a season of goals reduces to a
     bar chart of three bars, and a striker who scores everything from the
     penalty spot and one who scores everything from the back post came out
     identical.

     IT DRAWS ONLY WHAT SOMEBODY MARKED. No point, no marker: a default would
     put a goal on the penalty spot and publish it as a fact about where this
     man scores. So the band empties itself, and on a profile where nobody has
     marked anything it does not exist - which is most of them today, because
     this is the week the panel learned to ask.

     THE ATTACKING HALF, unless something happened outside it. Every goal but
     a freak one is struck inside it, so drawing the whole pitch spends half
     the picture on grass where nothing is and makes the part that matters
     half the size. A goal from beyond halfway widens it rather than falling
     off the edge. */
  const strikeOf = (list) => {
    const goals = shotsFor(list, p.num);
    const made = assistSpotsFor(list, p.num);
    /* The zones the club recorded, drawn as areas, GOALS AND ASSISTS ALIKE.
       Laid out in one pass per area so a goal and an assist recorded in the
       same third of the pitch cannot land on top of each other. Anything
       somebody has marked to a point is not in here: the point is the record. */
    const zoned = zoneLayout([
      ...zoneGoalsFor(list, p.num).map((x) => ({ ...x, kind: 'g' })),
      ...zoneAssistsFor(list, p.num).map((x) => ({ ...x, kind: 'a' })),
    ]);
    /* THE FRAME IS CUT TO THE MARKS, not to a fixed half. A pitch drawn to
       the halfway line to carry four marks in the six-yard box puts the
       whole record in the top sixth of the picture and leaves the reader
       looking at grass. Deepest mark plus a margin, rounded to five so two
       profiles with similar records share a frame rather than each getting
       its own slightly different crop. `sy()` maps a mark against the FULL
       pitch whatever this is, so the markings and the marks cannot part
       company - that was the bug this band shipped with. */
    const deepest = Math.max(0, ...[...goals, ...made, ...zoned].map((s) => s.y));
    const span = Math.min(100, Math.max(40, Math.ceil((deepest + 9) / 5) * 5));
    return {
      goals,
      made,
      zoned,
      span,
      any: goals.length + made.length + zoned.length,
      /* What the pitch actually draws, which is not `goals.length`: most of
         it is zones. A description counting only the marked points said "his
         0 goals" over nine of them. */
      shown: {
        goals: goals.length + zoned.filter((x) => x.kind === 'g').length,
        made: made.length + zoned.filter((x) => x.kind === 'a').length,
      },
    };
  };
  const strikeViews = views.map((v) => ({ ...v, ...strikeOf(v.list) }));
  const strikeAny = strikeViews.some((v) => v.any);
  /* One pitch, a layer per tab, the same device the heat map uses - three
     pitches would be the 207KB mistake again, in a different band. */
  const strikePitch = (v) => {
    const H = 140;
    const mk = pitchMarks(H);
    /* CROPPED, NOT STRETCHED. The markings are drawn by `pitchMarks` over the
       whole pitch and the marks were being scaled by the span instead, so a
       goal on the penalty spot drew at twice the depth of the penalty spot
       beside it. The band had never appeared on a profile, so nothing caught
       it. One mapping for both now, and the span crops the viewBox. */
    const VH = Math.round((v.span / 100) * H);
    const sy = (y) => ((y / 100) * H).toFixed(2);
    /* WHO IT WAS AGAINST, ON THE MARK ITSELF. The club asked for the crest.
       A `<title>` is the browser's own tooltip and carries the words already,
       so this is the picture beside them rather than the only route to the
       fact - which is what lets it be hover-only without hiding anything:
       the words are in the title, in the list under the pitch, and in the
       SVG's own description. No JavaScript: a sibling group, hidden, shown
       on hover. */
    const mark = (s, i, kind) => `<g class="pf-sh pf-sh--${kind}" style="--n:${i}" transform="translate(${s.x.toFixed(1)} ${sy(s.y)})">
              <circle class="pf-sh__o" r="4.6"/><circle class="pf-sh__c" r="2.3"/>
            </g>`;
    /* WHO IT WAS AGAINST, ON THE MARK, AND IN ITS OWN LAYER ABOVE THEM ALL.
       The club asked for the crest on hover. SVG has no z-index - it paints
       in document order - so a badge drawn inside its own mark is painted
       over by every mark that comes after it, and the ones it would cover
       are exactly the marks a row further up the pitch. Same trap as the
       form pips, which already have this rule.
       So the visible marks paint first and take no pointer at all, and this
       layer comes last: one transparent hit circle per mark, bigger than the
       mark, carrying the badge and the `<title>`. Only one badge is ever
       shown, so nothing in this layer can cover anything either.
       The words are in the title, in the list under the pitch and in the
       SVG's own description, which is what lets the picture be hover-only. */
    /* A HIT CIRCLE MUST NEVER COVER ANOTHER MARK. It is deliberately bigger
       than the mark it belongs to, so where two marks sit close together the
       later circle swallowed the earlier one whole and that goal could not
       be pointed at at all - the club found two goals under one crest, with
       no way to read the other. SVG has no z-index and the pointer goes to
       whatever paints last, so no ordering fixes this; the radius has to.
       Each circle is HALF the distance to its nearest neighbour, capped at
       the full size where there is room. Two neighbours then meet exactly
       between them and neither can reach the other's centre, whatever order
       they are drawn in. Measured in viewBox units, which are square on
       screen, so x and the MAPPED y are directly comparable. */
    const near = [...v.zoned, ...v.made, ...v.goals].map((s) => ({ x: s.x, y: Number(sy(s.y)) }));
    const hitR = (s) => {
      const y = Number(sy(s.y));
      let d = Infinity;
      for (const o of near) {
        const t = Math.hypot(o.x - s.x, o.y - y);
        if (t > 0.01 && t < d) d = t;
      }
      /* No floor. A floor is a radius that can cover a near neighbour again,
         which is the whole bug, and two marks close enough to need one are
         close enough that a small target is the honest answer. Two marks on
         the SAME point are the one case nothing can separate. */
      return Math.min(7, d / 2);
    };
    const hit = (s, kind) => {
      const src = oppBadgeSrc(s.opponent, d.badges);
      const words = kind === 'z' ? `${ZONE_WORDS[s.zone]}, the area recorded rather than a spot` : spotWords(s);
      const what = kind === 'g' || (kind === 'z' && s.kind !== 'a') ? 'Goal' : 'Assist';
      return `<g class="pf-hit pf-hit--${kind === 'z' ? (s.kind === 'a' ? 'a' : 'g') : kind}" transform="translate(${s.x.toFixed(1)} ${sy(s.y)})">
              <circle class="pf-hit__t" r="${hitR(s).toFixed(1)}"/>${src ? `<image class="pf-hit__tip" aria-hidden="true" href="${attr(src)}" x="-3" y="-3" width="6" height="6" preserveAspectRatio="xMidYMid meet"/>` : ''}
              <title>${esc(what)}${s.minute ? `, ${esc(String(s.minute))}′` : ''} v ${esc(s.opponent)}: ${esc(words)}.</title>
            </g>`;
    };
    return `<svg class="pf-strike__svg" viewBox="0 0 100 ${VH}" preserveAspectRatio="xMidYMid meet" data-season-scope="${attr(v.key)}" role="img" aria-labelledby="pf-sh-t${attr(v.key.split(' ')[0])}">
            <title id="pf-sh-t${attr(v.key.split(' ')[0])}">Where ${esc(p.first)} struck ${v.shown.goals === 1 ? 'his goal' : `his ${v.shown.goals} goals`} from${v.shown.made ? ` and where he played ${v.shown.made === 1 ? 'his assist' : 'his assists'} from` : ''}. Every one is listed under the pitch.</title>
            <rect class="pf-sh__turf" x="1" y="1" width="98" height="${VH - 2}" rx="3"/>
            <path class="pf-sh__lines" d="${mk.lines}"/><path class="pf-sh__lines" d="${mk.arcs}"/>
            <circle class="pf-sh__lines" cx="${mk.circle.cx}" cy="${mk.circle.cy}" r="${mk.circle.r}"/>
            ${mk.spots.map((s) => `<circle class="pf-sh__pk" cx="${s.cx}" cy="${s.cy}" r="0.9"/>`).join('')}
            ${v.zoned.map((s, i) => `<g class="pf-sh pf-sh--z${s.kind === 'a' ? ' pf-sh--za' : ''}" style="--n:${i}" transform="translate(${s.x.toFixed(1)} ${sy(s.y)})">
              <circle class="pf-sh__o" r="4.6"/><circle class="pf-sh__c" r="2.3"/>
            </g>`).join('')}
            ${v.made.map((s, i) => mark(s, i, 'a')).join('')}
            ${v.goals.map((s, i) => mark(s, i, 'g')).join('')}
            ${v.zoned.map((s) => hit(s, 'z')).join('')}${v.made.map((s) => hit(s, 'a')).join('')}${v.goals.map((s) => hit(s, 'g')).join('')}
          </svg>`;
  };
  /* GOALS OR ASSISTS, AND NO JAVASCRIPT. The club asked to be able to look
     at one or the other, and `sa.js` has 92 bytes left of its ceiling, so
     this is three radios and a sibling selector: the inputs sit at the top
     of the grid and every rule hangs off `:checked ~`. It survives scripting
     being blocked, which a script-driven filter would not, and it costs the
     page nothing but its own markup.
     ONLY WHERE HE HAS DONE BOTH. A control offering to show the assists of a
     man with none is a dead button that reads as a bug, and a pitch that can
     only be emptied is worse than no pitch. */
  const strikeBoth = strikeViews.some((v) => v.shown.goals) && strikeViews.some((v) => v.shown.made);
  const strikePick = strikeBoth ? `<input class="pf-k pf-k--all" type="radio" name="pf-k" id="pf-k-all" checked>
          <input class="pf-k pf-k--g" type="radio" name="pf-k" id="pf-k-g">
          <input class="pf-k pf-k--a" type="radio" name="pf-k" id="pf-k-a">` : '';
  /* THE CONTROL SITS OVER THE PITCH, NOT BESIDE THE HEADING. Three loose pills
     under an h2 read as three buttons that happen to be next to each other;
     one track with three segments, the width of the pitch and directly above
     it, reads as one question about the thing underneath. The inputs stay
     where they are, as siblings before the figure, because every rule in the
     band reaches them with `:checked ~`. */
  const strikeSeg = strikeBoth ? `<div class="pf-pick"><span class="pf-pick__l">Show</span><label for="pf-k-all">Both</label><label for="pf-k-g">Goals</label><label for="pf-k-a">Assists</label></div>
            ` : '';
  /* EVERY WORD ABOVE THE PITCH ANSWERS THE SWITCH TOO. A heading reading
     "Where he scores." over nothing but assists is the band disagreeing with
     its own filter, and the club said so. CSS cannot rewrite text, so all
     three wordings are written and the `:checked` rules show the true one -
     the same device as the count on the summary.
     WITH NO SWITCH THE WORD STILL HAS TO BE RIGHT: a man with assists on
     record and no goals had "Where he scores." over his, which nothing had
     ever asked about because the band had never drawn. */
  const hasG = strikeViews.some((v) => v.shown.goals);
  const w = (all, g, a) => (strikeBoth
    ? `<span class="pf-w pf-w--all">${all}</span><span class="pf-w pf-w--g">${g}</span><span class="pf-w pf-w--a">${a}</span>`
    : (hasG ? g : a));
  const strikeBand = strikeAny ? `<section class="sec pf-strike" aria-labelledby="pf-strike-h">
      <div class="wrap">
        ${/* THE INPUTS SIT AT THE TOP OF THE WRAP, not inside the grid, because
             everything they answer is a later sibling of theirs or inside one:
             the rail, the heading and the grid alike. A radio that can only
             reach half the band is a band that half agrees with itself. */''}
        ${strikePick}
        ${/* A FIGURE IN THE RAIL IS A CAREER FIGURE ON EVERY TAB. The rail sits
             above the season panels and nothing rewrites it, so "9 on the
             pitch" was printed over a season holding two. The count that is
             true of what you are looking at is on the list's own summary,
             one per season, so the rail says what the band is instead. */''}
        ${rail(RAIL.next(), `Where he ${w('scores', 'scores', 'creates')} from`,
    w('Goals and assists', 'Goals', 'Assists'), true)}
        <h2 class="h2 rv" id="pf-strike-h">Where he <span class="volt">${w('scores and creates.', 'scores.', 'creates.')}</span></h2>
        <div class="pf-strike__grid rv">
          <figure class="pf-strike__fig">
            ${strikeSeg}${strikeViews.map((v) => (v.any ? strikePitch(v) : `<p class="pf-strike__none" data-season-scope="${attr(v.key)}">Nothing marked on the pitch for this season.</p>`)).join('\n            ')}
            <figcaption>Attacking upward. ${w('Filled is a goal, hollow is where he played an assist from.', 'Each mark is a goal.', 'Each hollow mark is where he played an assist from.')} A dashed mark sits anywhere in the area the club recorded rather than on a spot: mark it on the pitch in the control panel and it moves to where it happened. Hover a mark for the club it was against.</figcaption>
          </figure>
          <div class="pf-strike__body">
            ${strikeViews.map((v) => {
    /* CLOSED BY DEFAULT. Eleven marks is eleven rows of three facts each,
       which ran further down the page than the pitch they describe and
       pushed everything under it off the screen. `details` needs no
       JavaScript, so the words are one press away with the script blocked. */
    const rows = [...v.goals.map((s) => ({ ...s, kind: 'Goal', words: spotWords(s) })),
      ...v.zoned.map((s) => ({ ...s, kind: s.kind === 'a' ? 'Assist' : 'Goal', words: `${ZONE_WORDS[s.zone]}, area only` })),
      ...v.made.map((s) => ({ ...s, kind: 'Assist', words: spotWords(s) }))];
    if (!rows.length) return '';
    /* THE COUNT FOLLOWS THE SWITCH TOO. A summary reading 7 over five
       visible rows is the band disagreeing with itself, and a CSS filter
       cannot recount - so all three figures are written and the same
       `:checked` rules show the one that is true of what is on screen. */
    const nG = rows.filter((s) => s.kind === 'Goal').length;
    return `<details class="pf-marks" data-season-scope="${attr(v.key)}">
              <summary>Every mark, in words <i class="pf-kc pf-kc--all">${rows.length}</i>${strikeBoth ? `<i class="pf-kc pf-kc--g">${nG}</i><i class="pf-kc pf-kc--a">${rows.length - nG}</i>` : ''}</summary>
              <ol class="pf-marklist">${rows
    .map((s) => `<li class="pf-mark--${s.kind === 'Goal' ? 'g' : 'a'}"><b>${esc(s.kind)}</b><span>${esc(s.opponent)}${s.minute ? `, ${esc(String(s.minute))}′` : ''}</span><i>${esc(s.words)}</i></li>`).join('')}</ol>
            </details>`;
  }).join('\n            ')}
          </div>
        </div>
      </div>
    </section>` : '';

  /* ---- WHERE HE SAVES ---------------------------------------------------
     The other end of the same record, and the only band on a profile that
     is about a man stopping something rather than doing it. Its own class
     names rather than the shot map's: the two are the same component and
     sharing a name is how `.pf-shots__grid` came to be declared twice for
     two different bands. That collision is fixed - the shot map is
     `pf-strike` and `pf-shots` belongs to the photographs alone - and the
     list of marks in words is one class, `pf-marklist`, used by both maps,
     because that genuinely IS one component.

     ONLY A KEEPER GETS ONE, and only one somebody has marked. An outfielder
     who went in goal for ten minutes has no saves on record, and a band that
     drew for him would be a heading over an empty pitch. */
  const saveOf = (list) => {
    const r = savesFor(list, p.num);
    const deep = r.spots.some((s) => s.y > 50);
    return { saves: r.spots, made: r.made, coverage: r.coverage, sspan: deep ? 100 : 55 };
  };
  const saveViews = views.map((v) => ({ ...v, ...saveOf(v.list) }));
  const saveAny = saveViews.some((v) => v.saves.length);
  const savePitch = (v) => {
    const H = 140;
    const mk = pitchMarks(H);
    const VH = Math.round((v.sspan / 100) * H);
    const sy = (y) => ((y / 100) * H).toFixed(2);
    return `<svg class="pf-saves__svg" viewBox="0 0 100 ${VH}" preserveAspectRatio="xMidYMid meet" data-season-scope="${attr(v.key)}" role="img" aria-labelledby="pf-sv-t${attr(v.key.split(' ')[0])}">
            <title id="pf-sv-t${attr(v.key.split(' ')[0])}">Where ${esc(p.first)} made ${v.saves.length === 1 ? 'his marked save' : `the ${v.saves.length} saves somebody has marked`}, his own goal at the top. Every one is listed under the pitch.</title>
            <rect class="pf-sh__turf" x="1" y="1" width="98" height="${VH - 2}" rx="3"/>
            <path class="pf-sh__lines" d="${mk.lines}"/><path class="pf-sh__lines" d="${mk.arcs}"/>
            <circle class="pf-sh__lines" cx="${mk.circle.cx}" cy="${mk.circle.cy}" r="${mk.circle.r}"/>
            ${mk.spots.map((s) => `<circle class="pf-sh__pk" cx="${s.cx}" cy="${s.cy}" r="0.9"/>`).join('')}
            ${v.saves.map((s, i) => `<g class="pf-sh pf-sh--s" style="--n:${i}" transform="translate(${s.x.toFixed(1)} ${sy(s.y)})">
              <circle class="pf-sh__o" r="4.6"/><path class="pf-sh__x" d="M-1.9 -1.9L1.9 1.9M1.9 -1.9L-1.9 1.9"/>
              <title>Save${s.minute ? `, ${s.minute}′` : ''} v ${esc(s.opponent)}: ${esc(spotWords(s))}.</title>
            </g>`).join('')}
          </svg>`;
  };
  /* The coverage sentence is per tab, because a keeper can have every save
     marked in one season and none in the next, and one figure over both
     would be a share of a number the reader cannot see. */
  const saveCover = (v) => {
    if (!v.saves.length) return 'Nothing marked on the pitch for this season.';
    if (!v.made) return `${v.saves.length} ${v.saves.length === 1 ? 'save' : 'saves'} marked on the pitch.`;
    return `${v.saves.length} of ${v.made} ${v.made === 1 ? 'save' : 'saves'} marked on the pitch.`;
  };
  const LAST_SV = saveViews[saveViews.length - 1];
  const saveBand = saveAny ? `<section class="sec pf-saves" aria-labelledby="pf-saves-h">
      <div class="wrap">
        ${rail(RAIL.next(), 'Where he saves', `${LAST_SV.saves.length} marked`)}
        <h2 class="h2 rv" id="pf-saves-h">Where he <span class="volt">saves.</span></h2>
        <div class="pf-saves__grid rv">
          <figure class="pf-saves__fig">
            ${saveViews.map((v) => (v.saves.length ? savePitch(v) : `<p class="pf-saves__none" data-season-scope="${attr(v.key)}">Nothing marked on the pitch for this season.</p>`)).join('\n            ')}
            <figcaption>His own goal at the top, so the box at the top of the pitch is the one
              ${esc(p.first)} was defending. Only saves somebody has marked in the control panel appear
              here, and the count beside each season is the club's own.</figcaption>
          </figure>
          <div class="pf-saves__body">
            ${saveViews.map((v) => `<div data-season-scope="${attr(v.key)}">
              <p class="pf-saves__cov">${esc(saveCover(v))}</p>
              <ol class="pf-marklist">
              ${v.saves.map((s) => `<li><b>Save</b><span>${esc(s.opponent)}${s.minute ? `, ${esc(String(s.minute))}′` : ''}</span><i>${esc(spotWords(s))}</i></li>`).join('')}
              </ol>
            </div>`).join('\n            ')}
          </div>
        </div>
      </div>
    </section>` : '';

  const pitchBand = heat.length ? `<section class="sec pf-pitch" aria-labelledby="pf-pitch-h">
      <div class="wrap">
        ${/* The count follows the tab: each layer's own number of positions. */''}
        ${rail(RAIL.next(), 'Where they play', `${heat.length} ${heat.length === 1 ? 'position' : 'positions'}`)
    .replace('class="xrail__r"', `class="xrail__r" data-pitch-counts="${attr(JSON.stringify(Object.fromEntries(views.flatMap((v) => v.keys.map((k) => [k, `${v.heat.length} ${v.heat.length === 1 ? 'position' : 'positions'}`])))))}"`)}
        <h2 class="h2 rv" id="pf-pitch-h">On the <span class="volt">pitch.</span></h2>
        <div class="pf-pitch__grid rv">
          <figure class="pf-pitch__fig">
            <svg viewBox="0 0 100 140" role="img" aria-labelledby="pf-pitch-t" preserveAspectRatio="xMidYMid meet">
              <title id="pf-pitch-t">Heat map of where ${esc(p.name)} lined up, for the season chosen above. The list beside it gives the figures.</title>
              <defs>
                ${/* The classic heat-map pipeline, which is what makes one
                     look like a heat map rather than a blurred smudge: blur
                     plain white blobs, lift the blurred ALPHA into every
                     channel, then remap that ramp to colour. Banded through a
                     table so the field builds from a dim ember at the edge to
                     a near-white core, all inside the brand's orange. */''}
                <filter id="pf-heat-${attr(p.slug)}" x="-25%" y="-25%" width="150%" height="150%"
                        color-interpolation-filters="sRGB">
                  <feGaussianBlur stdDeviation="3.4" result="b" />
                  ${/* All four channels take the blurred ALPHA. The alpha row
                       must carry it too: set to a constant it made the whole
                       filter region opaque, and everywhere the blobs were not
                       came out as a solid black rectangle over the pitch. */''}
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
                ${/* Heat stops at the touchline. The blur legitimately
                     spreads past the pitch and a field bleeding into the
                     panel margin reads as a leak rather than as play. */''}
                <clipPath id="pf-clip-${attr(p.slug)}">
                  <rect x="1" y="1" width="98" height="138" rx="3" />
                </clipPath>
                <linearGradient id="pf-scan-${attr(p.slug)}" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stop-color="#FF7034" stop-opacity="0" />
                  <stop offset="0.8" stop-color="#FF7034" stop-opacity="0.16" />
                  <stop offset="1" stop-color="#FFB38A" stop-opacity="0.5" />
                </linearGradient>
              </defs>

              ${/* A real pitch: mown bands, both boxes with their spots and
                   arcs, the centre circle. */''}
              <rect x="1" y="1" width="98" height="138" rx="3" fill="rgba(255,255,255,0.028)" />
              <g class="pf-turf" aria-hidden="true">${[1, 3, 5, 7, 9].map((i) => `<rect x="1" y="${(1 + i * 13.8).toFixed(1)}" width="98" height="13.8"/>`).join('')}</g>
              <g class="pf-lines" aria-hidden="true">
                <rect x="1" y="1" width="98" height="138" rx="3"/>
                <line x1="1" y1="70" x2="99" y2="70"/>
                <circle cx="50" cy="70" r="12"/>
                <rect x="26" y="1" width="48" height="18"/><rect x="38" y="1" width="24" height="7"/>
                <rect x="26" y="121" width="48" height="18"/><rect x="38" y="132" width="24" height="7"/>
                <path d="M42 19A10 10 0 0 0 58 19M42 121A10 10 0 0 1 58 121"/>
                <circle class="pf-lines__dot" cx="50" cy="70" r="1"/><circle class="pf-lines__dot" cx="50" cy="13" r="0.8"/><circle class="pf-lines__dot" cx="50" cy="127" r="0.8"/>
              </g>

              ${/* One layer per tab: its heat, its rings and its marked positions.
                    The tab script hides every layer but the tab's own. */''}
              ${views.map((v) => `<g data-season-scope="${v.key}">
              <g class="pf-heat" clip-path="url(#pf-clip-${attr(p.slug)})" filter="url(#pf-heat-${attr(p.slug)})">${blobsFor(v)}</g>
              <g class="pf-radiate" aria-hidden="true">${v.primary.map((h, n) => `<circle class="pf-radiate__r" cx="${h.x.toFixed(1)}" cy="${(h.y * 1.4).toFixed(1)}" r="${(4.2 + 1.7 * h.k).toFixed(1)}" style="--d:${(n * 0.9).toFixed(2)}s"/>`).join('')}</g>
              ${v.primary.map((h, n) => `<g class="pf-spot" data-pos="${attr(h.code)}" style="--n:${n}">
                <circle class="pf-spot__dot" cx="${h.x.toFixed(1)}" cy="${(h.y * 1.4).toFixed(1)}"
                  r="${(4.2 + 1.7 * h.k).toFixed(1)}" fill="var(--volt)"
                  stroke="#0D0F12" stroke-width="0.9" />
                <text x="${h.x.toFixed(1)}" y="${(h.y * 1.4 + 1.4).toFixed(1)}" text-anchor="middle"
                  font-family="Geist, sans-serif" font-size="3.5" font-weight="600"
                  fill="var(--text-on-brand)"><title>${esc(positionName(h.code))}</title>${esc(h.code)}</text>
              </g>`).join('')}
              </g>`).join('\n              ')}
              <g clip-path="url(#pf-clip-${attr(p.slug)})" aria-hidden="true"><rect class="pf-scan" x="1" y="0" width="98" height="18" fill="url(#pf-scan-${attr(p.slug)})"/></g>
            </svg>
            <figcaption>Attacking upward. The brighter the field, the more often ${esc(p.first)} played there.</figcaption>
          </figure>

          <div class="pf-pitch__body">
            ${views.map((v) => `<p data-season-scope="${v.key}">Read off the team sheets, not from a label. ${esc(p.first)} was named in
              ${esc(v.heat.length)} ${v.heat.length === 1 ? 'position' : 'different positions'}
              ${esc(v.where)}${v.heat.length > 1 ? `, most often at ${esc(positionName(v.heat[0].code).toLowerCase())}` : ''}.</p>`).join('\n            ')}
            <ol class="pf-heatlist">
              ${heat.map((h) => {
    const ms = posRows.get(h.code) || [];
    /* Every tab's count and bar width for this position, and the tabs it
       appears in at all. */
    const per = {};
    const inTabs = [];
    for (const v of views) {
      const hv = v.heat.find((x) => x.code === h.code);
      if (!hv) continue;
      for (const k of v.keys) per[k] = [fmtN(hv.n), Math.round(hv.k * 100)];
      inTabs.push(v.key);
    }
    return `<li${h.k >= 0.34 ? ' class="is-key"' : ''} data-season-scope="${attr(inTabs.join(' '))}" data-heat="${attr(JSON.stringify(per))}">
                <details class="pf-pos" data-pos="${attr(h.code)}">
                  <summary>
                    <span class="pf-heatlist__k">${esc(positionName(h.code))}</span>
                    <span class="pf-heatlist__bar" aria-hidden="true"><i style="--w:${Math.round(h.k * 100)}%"></i></span>
                    <span class="pf-heatlist__n">${esc(fmtN(h.n))}</span>
                    <span class="pf-pos__cue" aria-hidden="true"></span>
                    ${/* THE SAME NUMBER THE EYE SEES. This said "Striker, 1
                          match" beside a visible 0.5, so a sighted reader and
                          a screen-reader user were given two different figures
                          in two different units for one row. The visible
                          column is team-sheet slots, where a bench place
                          counts a half, and the note under the list says so.
                          Both are stated here because the second explains the
                          first. */''}
                    <span class="sr-only">${esc(fmtN(h.n))} team-sheet ${h.n === 1 ? 'slot' : 'slots'}. Show the matches.</span>
                  </summary>
                  <div class="pf-pos__panel">
                    <p class="pf-pos__t">${esc(positionName(h.code))}</p>
                    <ol class="pf-pos__list">
                      ${/* One line a match, no indentation inside: these rows repeat
                            for every position a player ever held, and on the
                            longest careers the whitespace alone was 8KB of a
                            page sitting at its 160KB ceiling.

                            AND NO CLASS ON ANY CELL, for the same reason the
                            league page's 399 result cells lost theirs: every
                            row is the same six spans in the same order, so
                            saying so six times a row bought nothing a
                            positional selector scoped to the list does not.
                            6KB on the heaviest profile, which is what paid for
                            the 36th match. `data-res` stays, because W, D and
                            L are data the stylesheet reads rather than a name
                            for a column. */''}
                      ${ms.map((x) => `<li data-season-scope="${x.si} all"><span data-res="${attr(x.outcome || '')}">${esc(x.outcome || '-')}</span><span>${oppBadge(x.opponent, d.badges, 22, 22)}</span><span>${esc(shortClub(x.opponent))}</span><span>${esc(x.score)}</span><span>${esc(shortComp(x.competition))}</span><span>${esc(x.date)}${x.bench ? ' · bench' : ''}</span></li>`).join('')}
                    </ol>
                  </div>
                </details>
              </li>`;
  }).join('\n              ')}
            </ol>
            <p class="pf-heatlist__note">Team-sheet slots, not matches:
              a sheet can name the same player under two codes for one game. A place on the bench
              counts as a half, because being named there is not the same as playing there.${career.unmapped.length
    ? ` ${career.unmapped.map((w) => esc(w.code)).join(', ')} ${career.unmapped.length === 1 ? 'has' : 'have'} no fixed
              spot on the diagram and ${career.unmapped.length === 1 ? 'is' : 'are'} not drawn.` : ''}</p>
          </div>
        </div>
      </div>
    </section>` : '';

  /* ================= 07 HONOURS ================= */
  const honours = [
    ...seasonAwards.map((a) => ({ k: a.title, v: a.season || d.titleSeason })),
    ...potm.map((a) => ({ k: 'Player of the Month', v: `${a.month} ${a.season || d.currentSeason}` })),
    ...leaderships.map((l) => (roleIn(l) ? { k: roleIn(l), v: l.season || d.currentSeason } : null)),
    /* A season he led is dated to that season; the career ranks below are
       counted over every season, so they are not dated to the current one. */
    ...seasonAccolades.map((a) => ({ k: a.label, v: a.season })),
    ...accolades.map((a) => ({ k: a, v: 'All seasons' })),
  ].filter(Boolean);

  const honoursBand = honours.length ? `<section class="sec pf-honours" data-season-scope="all" aria-labelledby="pf-hon-h">
      <div class="wrap">
        ${rail(RAIL.next(), 'Recognition', `${honours.length} in all`)}
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
          <img class="cta2__badge" src="${STAR}" alt="Sue’s Angels FC star" width="500" height="620" loading="lazy" decoding="async" aria-hidden="true" />
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
     EVERY frame he is tagged in, newest album first, with any tagged as the
     SUBJECT of the picture sorted to the front.

     This band shipped empty for its whole life. It took only subject tags, on
     the reasoning that a player standing in a wide shot is not a picture of
     him, and the reasoning was right about photographs and wrong about
     people: all 624 tags in the database say "present", because nobody has
     ever pressed the Subject button and nothing ever asked them to. So the
     band existed, was correct, and rendered nothing on all thirty-six
     profiles. Every tagged frame is offered now and the club picks the good
     one in the panel, which is the judgement the tagger was being asked for
     and is easier made looking at them side by side.

     The focus point set while tagging drives object-position, which is what
     keeps a face in frame when a landscape photograph is cropped square.
     data-album hands the grid to the viewer in sa.js, so a tap opens the
     photograph in place with the rest of them rather than leaving the site
     for a bare image URL. */
  /* ========================================================================
     WHO HE DOES IT AGAINST

     Every goal he has scored and every assist he has made, by the club it
     came against, ranked by the pair. The one cut of a career with COMPLETE
     coverage that the site never published: a minute is on 25 goals of 161
     and a body part on 23, so the band above has to quote a fraction of the
     evidence, and which club is on every single one.

     RANKED BARS, not a ring and not a column per match. The job is magnitude
     against identity with long names and up to seventeen of them, which is a
     horizontal bar list; a column chart per match was deliberately taken off
     this page in favour of the pip strip and is not coming back by a side
     door.

     TWO MEASURES, ONE HUE. Goals solid, assists the same mark hollow, which
     is the vocabulary the shot maps and the panel's own pitch picker already
     use - orange is the site's only accent and win, draw and loss express
     difference through weight and structure here as everywhere else. The key
     is drawn once and the order is said once in a sentence, rather than
     repeating "scored" and "made" down eight rows.

     EVERY FIGURE IS PRINTED, so the bar is decoration over readable values
     and carries no information of its own: no tooltip gates a number, and the
     band needs no screen-reader table beside it because the list already is
     one. The crest takes `alt=""` because the name is printed next to it,
     which is this site's rule for a crest that is not the only label there
     is. */
  /* ================= WHO HE DOES IT AGAINST =================
     Every goal and every assist the club records names an opponent, and no
     profile had ever said so. PER SEASON, like every other band here: the
     first draft was career-only behind data-season-scope="all", which the
     season script hides on every tab but the last - and the page opens on
     the latest season, so it shipped invisible on the only screen anybody
     arrives at.

     One list per tab, the device the heat map and the shot map already use,
     and the cap is six clubs with a sentence accounting for the rest,
     because the heaviest profile has two kilobytes left of its ceiling. */
  const VS_SHOW = 5;
  const vsViews = views.map((v) => {
    const rows = playerOpponents(p, v.list);
    return {
      ...v,
      rows,
      top: rows.slice(0, VS_SHOW),
      rest: rows.slice(VS_SHOW),
      max: Math.max(1, ...rows.map((r) => r.total)),
    };
  });
  const vsBand = vsViews.some((v) => v.rows.length) ? `<section class="sec pf-opp" aria-labelledby="pf-opp-h">
      <div class="wrap">
        ${rail(RAIL.next(), 'Who he does it against', 'Club by club')}
        <h2 class="h2 rv" id="pf-opp-h">Who he does it <span class="volt">against.</span></h2>
        <p class="pf-opp__key rv">
          <span class="pf-opp__sw" aria-hidden="true"></span>Scored
          <span class="pf-opp__sw pf-opp__sw--a" aria-hidden="true"></span>Made
          <i>Goals scored, then assists made.</i>
        </p>
        ${vsViews.map((v) => (v.rows.length ? `<ol class="pf-opp__list rv" data-season-scope="${attr(v.key)}">
          ${v.top.map((r) => `<li class="pf-opp__row" style="--g:${Math.round((r.goals / v.max) * 100)}%;--a:${Math.round((r.assists / v.max) * 100)}%">
            ${oppBadge(r.club, d.badges, 26, 26, 'pf-opp__crest', true)}<span class="pf-opp__name">${esc(r.club)}</span>
            <span class="pf-opp__bar" aria-hidden="true"><i></i><b></b></span>
            <span class="pf-opp__v">${r.goals}<i>+</i>${r.assists}</span>
          </li>`).join('')}
        </ol>${v.rest.length ? `<p class="pf-opp__more rv" data-season-scope="${attr(v.key)}">${v.rest.length}
          ${v.rest.length === 1 ? 'more club' : 'more clubs'}, ${v.rest.reduce((t, r) => t + r.goals, 0)}
          ${v.rest.reduce((t, r) => t + r.goals, 0) === 1 ? 'goal' : 'goals'} and ${v.rest.reduce((t, r) => t + r.assists, 0)}
          ${v.rest.reduce((t, r) => t + r.assists, 0) === 1 ? 'assist' : 'assists'} between them.</p>` : ''}`
    : `<p class="pf-opp__none rv" data-season-scope="${attr(v.key)}">Nothing scored or made ${esc(v.where)}.</p>`)).join('\n        ')}
      </div>
    </section>` : '';

  const shots = (d.playerPhotos || {})[p.slug] || [];
  const SHOW = 18;
  const shotsBand = shots.length ? `<section class="sec pf-shots" aria-labelledby="pf-sh-h">
      <div class="wrap">
        ${rail(RAIL.next(), 'In the gallery', `${shots.length} photograph${shots.length === 1 ? '' : 's'}`)}
        <h2 class="h2 rv" id="pf-sh-h">${esc(p.first || p.name)} in <span class="volt">frame.</span></h2>
        <ul class="pf-shots__grid rv" data-album>
          ${shots.slice(0, SHOW).map((sh) => {
    /* The caption a photograph deserves: which match, and who else is in it.
       A grid of faces with nothing said about them is a screensaver. */
    const others = (sh.with || []).slice(0, 2);
    const alt = `${p.name}${sh.album.title ? `, ${sh.album.title}` : ''}`
      + (others.length ? `, with ${others.join(' and ')}` : '');
    return `<li class="pf-shot">
            <a href="${attr(sh.src)}" rel="noopener" target="_blank">
              <img src="${attr(sh.src)}" alt="${attr(alt)}"
                width="480" height="480" loading="lazy" decoding="async"
                ${sh.focus ? `style="object-position:${esc(sh.focus[0])}% ${esc(sh.focus[1])}%"` : ''} />
            </a>
            ${sh.album.photographer ? `<span class="pf-shot__by">${photoCredit(sh.album.photographer)}</span>` : ''}
          </li>`;
  }).join('\n          ')}
        </ul>
        ${/* Two counts, because a phone shows nine of the eighteen. Which
             line is on screen is decided in CSS by the same breakpoint that
             decides how many frames are shown, so the sentence and the grid
             cannot disagree. */''}
        <p class="pf-shots__more pf-shots__more--wide">${shots.length > SHOW
    ? `${esc(shots.length - SHOW)} more in <a href="/gallery.html">the gallery</a>.`
    : `All ${esc(shots.length)} of them, from <a href="/gallery.html">the gallery</a>.`}</p>
        <p class="pf-shots__more pf-shots__more--narrow">${esc(Math.max(0, shots.length - 9))} more in
          <a href="/gallery.html">the gallery</a>.</p>
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

  /* OFF `p`, THE SQUAD ROW, NOT OFF THE PROFILE. `playerProfile` has never
     returned any of these - they are `playerStats`' own tallies of how each
     goal was struck - so `pr.byFoot` was undefined on every page, every bar
     came out at nought, `detailBars` correctly refused to draw an empty
     chart, and the band vanished. `pf-how` appears on 0 of the 47 profiles
     and always has: the club has recorded what every one of 141 goals was
     struck with, from where, and what the ball was doing, and not one reader
     ever saw it. CLAUDE.md said "all of it surfaces on the player profile".

     The reader-with-no-field, which is the one failure this repository has
     written down in both directions and had never caught in this one. The
     checks passed because they asked whether the band EMPTIES itself
     correctly, and it does - perfectly, on every page, for the wrong
     reason. */
  const foot = p.byFoot || {};
  const zone = p.byZone || {};
  const sit = p.bySituation || {};
  const asType = p.assistsByType || {};
  const detailed = p.goalsDetailed || 0;

  /* WHAT THIS BAND WILL ACTUALLY CONTAIN, worked out before deciding to draw
     it. The gate used to be `detailed || pr.assists || pr.saves`, and nothing
     inside the band reads pr.assists: assists appear only as assist TYPES,
     which is a different record and is empty until somebody says HOW a chance
     was made. So a player with five assists and no recorded detail rendered
     the heading, the rail and an empty box - 270px of "How he does it" with
     nothing under it. A band with nothing to say should not say it. */
  const howSections = [
    detailBars('What he strikes it with', BODY_PARTS.map((b) => ({ label: b.label, n: foot[b.key] || 0 }))),
    detailBars('Where he strikes it from', ZONES.map((z) => ({ label: z.label, n: zone[z.key] || 0 }))),
    detailBars('What the ball was doing', SITUATIONS.map((x) => ({ label: x.label, n: sit[x.key] || 0 }))),
    detailBars('How he makes them for others', ASSIST_TYPES.map((a) => ({ label: a.label, n: asType[a.key] || 0 }))),
  ].filter(Boolean);

  const howBand = (howSections.length || p.keeperApps) ? `<section class="sec pf-how" data-season-scope="all" aria-labelledby="pf-how-h">
      <div class="wrap">
        ${rail(RAIL.next(), 'The detail', detailed ? `All seasons · ${detailed} of ${pr.goals} goals recorded in full` : 'All seasons · from the match records')}
        <h2 class="h2 rv" id="pf-how-h">How he <span class="volt">does it.</span></h2>
        <div class="pf-how__grid rv">
          ${howSections.join('\n          ')}
          ${p.keeperApps ? `<section class="pf-sub">
            <h3 class="pf-how__h">In goal</h3>
            <ul class="pf-how__keeper">
              <li><b>${p.saves}</b><span>saves</span></li>
              <li><b>${esc(p.savesPerGame || '0')}</b><span>a game</span></li>
              <li><b>${p.keeperApps}</b><span>games in goal</span></li>
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
    /* THE SOURCE'S INDENTATION STAYS IN THE SOURCE. A profile carries a panel
       per season, so every new season adds another copy of it, and on the
       longest career it was 24KB of a page over its 160KB ceiling. A line
       break is still whitespace, so nothing renders differently: no player
       page holds a <pre>, a <textarea> or white-space: pre. */
    body: numberRails(siteHeader('/squad.html') + hero + seasonBand + versusBand
      + pitchBand + strikeBand + saveBand + howBand + vsBand + shotsBand + honoursBand + ctaBand).replace(/\n[ \t]+/g, '\n'),
    bodyClass: 'is-home is-sub is-player',
    css: 'home.css',
    shell: 'home',
    preMain: sitePreMain(),
    footerHtml: siteFooter(),
    profile: pr,
  };
}
