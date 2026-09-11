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
import { playerProfile, playerStats, fmtDate, isLeague } from '../lib/stats.mjs';
import { FRIENDLY_NOTE_SHORT } from '../lib/prose.mjs';
import { siteFooter, sitePreMain, siteHeader, oppBadge } from './home.mjs';
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

const rail = (n, label, ref) => `<div class="xrail" aria-hidden="true">
      <span class="xrail__l"><span class="xrail__n">${n === 'NUM' ? 'NUM' : esc(String(n).padStart(2, '0'))}</span><span class="xrail__t">${esc(label)}</span></span>
      <span class="xrail__r">${esc(ref)}</span>
    </div>`;

/* Page-level bands number themselves in the order a reader meets them. They
   are built in one order and assembled in another, and each used to carry a
   number typed into it: the page ran 02, 03, 06, 06, 04, with two bands both
   calling themselves 06. A band that does not render leaves no placeholder,
   so the sequence closes up rather than skipping a number. The season block
   keeps its own 01-05, which are inside a panel and describe one season. */
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
const bar = (label, value, pct, note) => `<li class="pf-bar">
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
      ga: ts.reduce((n, t) => n + t.goals + t.assists, 0),
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
  const rows = [
    ['Appearances', h.apps, a.apps],
    [gk ? 'Clean sheets' : 'Goals and assists', gk ? h.cs : h.ga, gk ? a.cs : a.ga],
    ['Won', h.won, a.won],
  ];
  return `<figure class="pf-chart pf-chart--split">
              <figcaption class="pf-chart__k">Home and away</figcaption>
              <p class="pf-split__head" aria-hidden="true"><span>Home</span><span>Away</span></p>
              <ul class="pf-split" data-home-away="${attr(`${h.apps},${a.apps}`)}">
                ${rows.map(([k, hv, av], i) => {
    const m = Math.max(hv, av, 1);
    return `<li style="--i:${i}"><b class="pf-split__h" data-count="${attr(hv)}">${esc(hv)}</b><span class="pf-split__bars" aria-hidden="true"><i style="--w:${pctOf(hv, m)}%"></i><i style="--w:${pctOf(av, m)}%"></i></span><b class="pf-split__a" data-count="${attr(av)}">${esc(av)}</b><span class="pf-split__k">${esc(k)}<span class="sr-only">: ${esc(hv)} at home, ${esc(av)} away</span></span></li>`;
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
const profileWheel = (me, pool, gk, where, face) => {
  const used = (pool || []).filter((q) => q.apps > 0);
  if (!me || !me.apps || used.length < 3) return '';
  const rate = (a, b) => (b ? a / b : 0);
  const two = (v) => v.toFixed(2);
  /* "From the start", never "Starts": that word is held back site-wide
     because it was once the label on appearances, and the suite fails any
     page that prints it. */
  const metrics = gk ? [
    ['Appearances', (q) => q.apps],
    ['From the start', (q) => q.starts],
    ['Clean sheets', (q) => q.cleanSheets],
    ['Clean sheets a game', (q) => rate(q.cleanSheets, q.apps), two],
    ['Captained', (q) => q.captained],
  ] : [
    ['Appearances', (q) => q.apps],
    ['From the start', (q) => q.starts],
    ['Goals', (q) => q.goals],
    ['Assists', (q) => q.assists],
    ['Goals and assists a game', (q) => rate(q.goals + q.assists, q.apps), two],
    ['Clean sheets', (q) => q.cleanSheets],
  ];
  const others = used.filter((q) => q.num !== me.num);
  const rows = metrics.map(([k, f, show = String]) => {
    const v = f(me) || 0;
    const vals = others.map((q) => f(q) || 0);
    const below = vals.filter((o) => o < v).length;
    const level = vals.filter((o) => o === v).length;
    const pct = v ? Math.round((100 * (below + level / 2)) / Math.max(1, vals.length)) : 0;
    return { k, v: show(v), pct, rank: 1 + vals.filter((o) => o > v).length };
  });
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
  const wedges = rows.map((r, i) => `<path class="pf-wheel__v${top && r.pct === top ? ' is-top' : ''}" style="--i:${i};--p:${(r.pct / 100).toFixed(2)}" d="${sector(R0 + ((R1 - R0) * Math.max(r.pct, 3)) / 100, ...edge(i))}"><title>${esc(`${r.k}: ${r.pct}`)}</title></path>`).join('');
  const labels = rows.map((r, i) => {
    const [lx, ly] = pt(R0 + (R1 - R0) * 0.64, (i + 0.5) * span);
    return `<text class="pf-wheel__t" x="${lx}" y="${ly}" style="--i:${i}" data-count="${r.pct}">${r.pct}</text>`;
  }).join('');
  /* A photograph stored inline would be repeated in every season's panel, so
     only a file is used at the hub; anything else gets the club star. */
  const faceImg = face && !/^data:/.test(face)
    ? `<img src="${attr(face)}" alt="" width="96" height="96" loading="lazy" decoding="async" />`
    : `<img class="is-star" src="${STAR}" alt="" width="76" height="94" loading="lazy" decoding="async" />`;
  return `<figure class="pf-chart pf-chart--wheel">
              <figcaption class="pf-chart__k">Against the squad<span class="pf-chart__key">Percentile among the ${esc(used.length)} players used ${esc(where)}</span></figcaption>
              <div class="pf-wheel">
                <div class="pf-wheel__art">
                  <svg viewBox="0 0 320 320" role="img" aria-label="${attr(`Percentiles ${where}: ${rows.map((r) => `${r.k} ${r.pct}`).join(', ')}`)}">
                    <path class="pf-wheel__bg" d="${bg}"/>
                    <g class="pf-wheel__rings">${[0.25, 0.5, 0.75, 1].map((f) => `<circle cx="${C}" cy="${C}" r="${(R0 + (R1 - R0) * f).toFixed(1)}"/>`).join('')}</g>
                    ${wedges}${labels}
                  </svg>
                  <span class="pf-wheel__face" aria-hidden="true">${faceImg}</span>
                </div>
                <ol class="pf-wheel__list">${rows.map((r, i) => `<li style="--i:${i}"><span>${esc(r.k)}</span><b data-count="${r.pct}">${r.pct}</b><i>${esc(r.v)} · ${ordinal(r.rank)} of ${esc(used.length)}</i></li>`).join('')}</ol>
              </div>
              <p class="pf-chart__sub">100 is the most in the squad ${esc(where)} and nought means none at all. With only a few matches played, one game moves these a long way.</p>
            </figure>`;
};

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

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

  const recog = d.recognition || [];
  const seasonAwards = recog.filter((r) => r.type === 'season_award' && r.playerId === p.num);
  const potm = recog.filter((r) => r.type === 'potm' && r.playerId === p.num);
  const leadership = recog.find((r) => r.type === 'leadership');
  const captainOf = leadership && [
    leadership.clubCaptainPlayerId === p.num ? 'Club captain' : null,
    leadership.viceCaptainPlayerId === p.num ? 'Vice-captain' : null,
    leadership.thirdChoiceCaptainPlayerId === p.num ? 'Third-choice captain' : null,
  ].find(Boolean);

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
            ${accolades.map((a) => `<span class="pf-chip">${esc(a)}<i>All seasons</i></span>`).join('\n            ')}
            ${captainOf ? `<span class="pf-chip">${esc(captainOf)}</span>` : ''}
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
    const apps = (x) => `${x.apps} ${x.apps === 1 ? 'appearance' : 'appearances'}`;
    const starts = (x) => (x.starts < x.apps ? (x.starts ? `, ${x.starts} from the start` : ', off the bench') : '');
    const unused = (x) => (x.bench ? `, plus ${x.bench} unused` : '');
    const ledeFor = (x, name) => (name === 'All seasons'
      ? `${apps(x)} for ${CLUB.name} across every season${starts(x)}${unused(x)}, ${made(x)}.`
      : (x.apps || x.bench)
        ? `${apps(x)} in ${name}${starts(x)}${unused(x)}, ${made(x)}.`
        : `No appearances in ${name}.`);
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
                  <!-- THE REVEAL IS A WIPE. The line used to draw along a dash
                       measured in the chart's own units, and the chart is
                       stretched to its box, so it stopped two thirds of the way. -->
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
    return `<circle class="pf-plot__pt" cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="10" data-x="${px.toFixed(1)}" data-total="${attr(series[i])}" data-club="${attr(shortClub(t.opponent))}" data-score="${attr(t.scoreline)}" data-date="${attr(fmtDate(t.date))}" data-made="${attr(made)}"/>`;
  }).join('')}
                <line class="pf-plot__pulse" x1="${ex}" y1="${ey}" x2="${ex}" y2="${ey}" />
                <line class="pf-plot__end" x1="${ex}" y1="${ey}" x2="${ex}" y2="${ey}" />
              </svg>
              <figcaption class="pf-plot__cap" data-readout>
                <span class="pf-plot__lo">First match</span>
                <b>${esc(top)} ${esc(unit)}</b>
                <span class="pf-plot__hi">Last match</span>
              </figcaption>
              <!-- Two hints, one shown per pointer. "Point at the line" is an
                   instruction a phone cannot follow, and it was the only thing
                   telling anyone the chart could be read at all. -->
              <p class="pf-plot__hint pf-plot__hint--fine">Point at the line to read each match.</p>
              <p class="pf-plot__hint pf-plot__hint--coarse">Touch the line to read each match.</p>
            </figure>`;
  };

  /* ================= SEASON PANEL BUILDERS =================
     Each of these takes a profile rather than closing over one, so the same
     code renders every season's panel. */

  const tilesFor = (x) => (gk ? [
    { v: x.apps, k: 'Appearances', sub: `of ${x.teamGames} played${x.starts < x.apps ? `, ${x.starts} from the start` : ''}`, pct: x.teamGames ? Math.round((x.apps / x.teamGames) * 100) : 0 },
    { v: x.cleanSheets, k: 'Clean sheets', sub: `of ${x.onRecord} on record`, pct: x.cleanSheetPct },
    { v: x.conceded, k: 'Conceded' },
    { v: x.concededPerGame, k: 'Conceded a game' },
    { v: x.motm, k: 'Man of the Match' },
    { v: `${x.winPct}%`, k: 'Won when playing', pct: x.winPct },
    ...(x.keeperGames ? [
      { v: x.keeperSaves, k: 'Saves', sub: `in ${x.keeperGames} ${x.keeperGames === 1 ? 'game' : 'games'} in goal with saves recorded` },
      { v: (x.keeperSaves / x.keeperGames).toFixed(1), k: 'Saves a game' },
    ] : []),
  ] : [
    { v: x.apps, k: 'Appearances', sub: `of ${x.teamGames} played${x.starts < x.apps ? `, ${x.starts} from the start` : ''}`, pct: x.teamGames ? Math.round((x.apps / x.teamGames) * 100) : 0 },
    { v: x.bench, k: 'Unused sub' },
    { v: x.goals, k: 'Goals' },
    { v: x.assists, k: 'Assists' },
    { v: x.perGame, k: 'Goals + assists a game' },
    { v: `${x.winPct}%`, k: 'Won when playing', pct: x.winPct },
  ]);

  const barsFor = (x) => (gk ? [
    bar('Clean sheets', x.cleanSheets, x.cleanSheetPct, `${x.cleanSheetPct}% of ${x.onRecord}`),
    bar('Games conceding', x.onRecord - x.cleanSheets, x.onRecord ? Math.round(((x.onRecord - x.cleanSheets) / x.onRecord) * 100) : 0),
    bar('Won when playing', `${x.winPct}%`, x.winPct, `${x.won} of ${x.won + x.drawn + x.lost}`),
  ] : [
    bar('Goals', x.goals, x.involvements ? Math.round((x.goals / x.involvements) * 100) : 0),
    bar('Assists', x.assists, x.involvements ? Math.round((x.assists / x.involvements) * 100) : 0),
    bar('Won when playing', `${x.winPct}%`, x.winPct, `${x.won} of ${x.won + x.drawn + x.lost}`),
  ]);

  const ranksFor = (x) => [
    gk && x.cleanSheetRank ? { v: ordinal(x.cleanSheetRank), k: 'Clean sheets in the squad', s: `${x.cleanSheets} kept` } : null,
    !gk && x.goalRank ? { v: ordinal(x.goalRank), k: 'Goalscorer in the squad', s: `${x.goals} scored` } : null,
    !gk && x.assistRank ? { v: ordinal(x.assistRank), k: 'Assister in the squad', s: `${x.assists} made` } : null,
    x.motmRank ? { v: ordinal(x.motmRank), k: 'Man of the Match in the squad', s: `${x.motm} awarded` } : null,
    { v: `${x.winPct}%`, k: 'Won when playing', s: `${x.won}W ${x.drawn}D ${x.lost}L` },
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

  const seasonPanel = (sn, x, idx) => {
    if (!x.apps && !x.bench) {
      return `<div class="pf-panel" id="pf-s-${idx}" data-season-panel="${idx}">
          ${emptyPanel(sn)}
        </div>`;
    }
    return `<div class="pf-panel" id="pf-s-${idx}" data-season-panel="${idx}">
          <section class="pf-sub" aria-labelledby="pf-n-${idx}">
            ${rail(1, sn === 'All seasons' ? 'Every season' : 'The season', `${sn} · ${x.apps} ${x.apps === 1 ? 'appearance' : 'appearances'}`)}
            <h3 class="h2 rv" id="pf-n-${idx}">${esc(sn)} in <span class="volt">numbers.</span></h3>
            <ul class="pf-tiles${tilesFor(x).length > 6 ? ' pf-tiles--8' : ''} rv">
              ${tilesFor(x).map(statTile).join('\n              ')}
            </ul>
          </section>

          <section class="pf-sub" aria-labelledby="pf-r-${idx}">
            ${rail(2, gk ? 'Defensive record' : 'Attacking record', `${x.apps} ${x.apps === 1 ? 'appearance' : 'appearances'}`)}
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
    const cols = sn === 'All seasons' ? '' : matchColumns(x, gk);
    const wheelPool = sn === 'All seasons' ? (d.players || []) : ((d.playersBySeason || {})[sn] || []);
    const wheel = profileWheel(wheelPool.find((q) => q.num === p.num), wheelPool, gk,
      sn === 'All seasons' ? 'across every season' : `in ${sn}`, shot);
    const n = charts.length + (cols ? 1 : 0) + (wheel ? 1 : 0);
    return n ? `<section class="pf-sub" aria-labelledby="pf-g-${idx}">
            ${rail(3, 'In pictures', `${n} ${n === 1 ? 'chart' : 'charts'}`)}
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
            ${rail(4, 'Through the season', `${x.timeline.length} ${x.timeline.length === 1 ? 'match' : 'matches'}`)}
            <h3 class="h2 rv" id="pf-c-${idx}">${gk ? 'Clean sheets' : 'Goals and assists'} as they
              <span class="volt">came.</span></h3>
            ${chartFor(x, `pf-plot-${idx}`)}
          </section>` : ''}

          ${x.byCompetition.length ? `<section class="pf-sub" aria-labelledby="pf-k-${idx}">
            ${rail(5, 'By competition', `${x.byCompetition.length} entered`)}
            <h3 class="h2 rv" id="pf-k-${idx}">Across every <span class="volt">competition.</span></h3>
            <div class="pf-tablewrap rv">
              <table class="pf-tbl">
                <caption class="sr-only">${esc(p.name)} by competition, ${esc(sn)}</caption>
                <thead>
                  <tr>
                    <th scope="col">Competition</th>
                    <th scope="col"><abbr title="Appearances">Ap</abbr></th>
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

          ${/* Recency belongs to a season; under All seasons it is the latest
                season's list again. */''}
          ${x.last.length && sn !== 'All seasons' ? `<section class="pf-sub" aria-labelledby="pf-l-${idx}">
            ${rail(6, 'Most recent', `${x.last.length} ${x.last.length === 1 ? 'match' : 'matches'}`)}
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
        ${/* EVERY SEASON TOGETHER IS A TAB TOO, last and never the one the page
              opens on: a season is what most people came for, and the career
              figures had nowhere of their own, so they leaked into the season
              sentences instead. */''}
        <div class="pf-tabs" data-season-tabs>
          ${seasons.map((s, i) => `<a class="pf-tab" href="#pf-s-${i}" data-season-tab="${i}">
            <b>${esc(s.name)}</b>
            <i>${s.profile.apps ? `${s.profile.apps} ${s.profile.apps === 1 ? 'appearance' : 'appearances'}` : 'Not played'}</i>
          </a>`).join('\n          ')}
          ${seasons.length > 1 ? `<a class="pf-tab" href="#pf-s-${seasons.length}" data-season-tab="${seasons.length}" data-season-all>
            <b>All seasons</b>
            <i>${all.apps ? `${all.apps} ${all.apps === 1 ? 'appearance' : 'appearances'}` : 'Not played'}</i>
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
    ? [{ key: 'cleanSheets', label: 'Clean sheets' }, { key: 'apps', label: 'Appearances' }, { key: 'motm', label: 'Man of the Match' }]
    : [{ key: 'goals', label: 'Goals' }, { key: 'assists', label: 'Assists' }, { key: 'apps', label: 'Appearances' }, { key: 'motm', label: 'Man of the Match' }]
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
                <linearGradient id="pf-scan-${attr(p.slug)}" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stop-color="#FF7034" stop-opacity="0" />
                  <stop offset="0.8" stop-color="#FF7034" stop-opacity="0.16" />
                  <stop offset="1" stop-color="#FFB38A" stop-opacity="0.5" />
                </linearGradient>
              </defs>

              <!-- A real pitch: mown bands, both boxes with their spots and
                   arcs, the centre circle. -->
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
                            page sitting at its 160KB ceiling. */''}
                      ${ms.map((x) => `<li data-season-scope="${x.si} all"><span class="pf-pos__res" data-res="${attr(x.outcome || '')}">${esc(x.outcome || '-')}</span><span class="pf-pos__badge">${oppBadge(x.opponent, d.badges, 22, 22)}</span><span class="pf-pos__club">${esc(shortClub(x.opponent))}</span><span class="pf-pos__score">${esc(x.score)}</span><span class="pf-pos__comp">${esc(shortComp(x.competition))}</span><span class="pf-pos__date">${esc(x.date)}${x.bench ? ' · bench' : ''}</span></li>`).join('')}
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
    captainOf ? { k: captainOf, v: d.currentSeason } : null,
    /* The ranks behind these are counted over every season, so they are not
       dated to the current one. */
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
        <!-- Two counts, because a phone shows nine of the eighteen. Which
             line is on screen is decided in CSS by the same breakpoint that
             decides how many frames are shown, so the sentence and the grid
             cannot disagree. -->
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

  const foot = pr.byFoot || {};
  const zone = pr.byZone || {};
  const sit = pr.bySituation || {};
  const asType = pr.assistsByType || {};
  const detailed = pr.goalsDetailed || 0;

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

  const howBand = (howSections.length || pr.keeperApps) ? `<section class="sec pf-how" data-season-scope="all" aria-labelledby="pf-how-h">
      <div class="wrap">
        ${rail(RAIL.next(), 'The detail', detailed ? `All seasons · ${detailed} of ${pr.goals} goals recorded in full` : 'All seasons · from the match records')}
        <h2 class="h2 rv" id="pf-how-h">How he <span class="volt">does it.</span></h2>
        <div class="pf-how__grid rv">
          ${howSections.join('\n          ')}
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

    body: numberRails(siteHeader('/squad.html') + hero + seasonBand + versusBand
      + pitchBand + howBand + shotsBand + honoursBand + ctaBand),
    bodyClass: 'is-home is-sub is-player',
    css: 'home.css',
    shell: 'home',
    preMain: sitePreMain(),
    footerHtml: siteFooter(),
    profile: pr,
  };
}
