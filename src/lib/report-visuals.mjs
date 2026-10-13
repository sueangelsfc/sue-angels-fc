/* ==========================================================================
   A MATCH REPORT, DRAWN

   The match page carried the scoreline, three columns of names and the prose.
   Every fact the club records about a match beyond that reached no reader at
   all: the minute each goal went in, what it was struck with and from where,
   who made it and how, the shape the eleven played, who came on for whom. All
   of it was in the record and none of it was on the page, so a 4-0 away in a
   cup tie and a 1-0 at home read as the same document with different nouns.

   FROM 26/27 ONWARDS, AND THAT IS THE CLUB'S DECISION rather than a
   capability test. It is TRUE that 25/26 records carry almost none of this
   detail, so most of these bands would empty themselves on an older match
   anyway - but "it would look thin" is not the reason. The club asked for
   last season's reports to stay exactly as they are, which is a decision
   about the archive, and a decision belongs in a named constant with the
   reason beside it rather than in an emptiness test that happens to agree.

   EVERYTHING HERE IS DRAWN AT BUILD TIME AND NEEDS NO SCRIPT. `sa.js` has
   235 bytes left under its 24KB ceiling, which is not a feature's worth of
   anything, and the right answer was not to raise the ceiling for fifteen
   visual changes to one page family. So every chart is inline SVG in its own
   viewBox, scaled by CSS; the reveal rides on `.rv`, which the home script
   already watches on every page; the figures tick up through the `[data-count]`
   mechanism that already exists for the player charts; and the pinned
   scoreboard is `position: sticky`. With scripts blocked the page loses one
   animation and keeps every fact.

   NOTHING IS INVENTED. A goal with no minute does not acquire one: it is
   listed after the timeline instead of being placed on it. A match with no
   shape draws no pitch. A first meeting says so rather than printing an empty
   record. That is the same rule the rest of the site is built on, and it is
   the reason these bands can be trusted on a page that is mostly numbers.
   ========================================================================== */
import { esc, attr } from './html.mjs';
import { POSITION_XY, POSITION_GROUPS, positionName, roleName } from './positions.mjs';
import { describeGoal, describeAssist, shortGoal, SITUATION, approachOf, describeApproach } from './football.mjs';
import { substitutions } from './subs.mjs';
import { deriveTable, toISO, fmtDate, isLeague, isCup, ordinal } from './stats.mjs';
import { sameClub } from './preseason.mjs';

/* ---- The gate -------------------------------------------------------------
   A season is `26/27`, so the start year is the first two digits plus 2000.
   Compared as a NUMBER rather than by string order: "99/00" sorts above
   "00/01" and this site is meant to outlive that. */
export const RICH_FROM = '26/27';
const startYear = (s) => 2000 + Number(String(s || '').slice(0, 2));
export const isRich = (m) => Boolean(m && m.season)
  && startYear(m.season) >= startYear(RICH_FROM);

const num = (n) => (typeof n === 'number' ? n : Number(String(n || '').replace(/\D/g, '')));
const MINS = 90;
/* A minute past full time still has to land on the axis, so the scale is
   clamped rather than allowed to run off the end. Nothing is moved: an 94th
   minute goal is drawn at the right-hand edge, which is where it happened. */
const atMin = (m) => Math.max(0, Math.min(1, (num(m) || 0) / MINS));

/* ---- Who is who ----------------------------------------------------------
   A shirt number resolves to a name everywhere on this page and to a LINK
   wherever a profile actually exists. Built from the same set the build
   generates pages from, never from the squad record: the squad holds 47
   people and the site publishes a profile for the ones who have played, so a
   map built the other way would have put dead links on a match page and the
   guard would have refused to publish it. */
export function linkers(d) {
  const nameFor = d.nameFor || ((n) => `No. ${n}`);
  const pages = new Map(((d.playersCompetitive || d.players || [])
    .filter((p) => p && !p.unknown && p.slug))
    .map((p) => [String(p.num), p.slug]));
  const surnameOf = new Map(((d.squad || []).map((p) => [String(p.num), p.last || p.name])));
  const link = (n, label) => {
    const text = esc(label == null ? nameFor(n) : label);
    const slug = pages.get(String(n));
    return slug ? `<a href="${attr(`/players/${slug}.html`)}">${text}</a>` : text;
  };
  return { nameFor, link, surname: (n) => surnameOf.get(String(n)) || nameFor(n) };
}

/* ---- 1. The numbers of the match -----------------------------------------
   A tile is only drawn where the club actually recorded the thing it counts,
   and a share says what it is a share OF. "2 set pieces" over four goals is a
   fact; "2" on its own is a number looking for a sentence.

   `pf-tiles` and `pf-stat` are the hooks the existing counter watches, and
   both carry rules of their own below - the observer sets `--i` on `.pf-stat`
   and the stagger reads it, so neither class is decoration. */
export function keyNumbers(m) {
  const det = m.detail || {};
  const goals = det.goals || [];
  if (m.isWalkover) return [];
  const played = new Set([
    ...(det.starters || []).map((s) => s.num),
    ...(det.bench || []).filter((b) => b.on).map((b) => b.num),
  ]);
  const scorers = new Set(goals.filter((g) => !g.og && g.num != null).map((g) => g.num));
  const dead = goals.filter((g) => {
    const s = SITUATION[g.situation];
    return s && s.dead;
  }).length;
  const cards = (det.yellowCards || []).length + (det.redCards || []).length;
  const subs = substitutions(det).filter((s) => s.on != null).length;
  const tiles = [
    { k: 'Scored', v: m.ourGoals, of: '' },
    { k: 'Conceded', v: m.theirGoals, of: '' },
    scorers.size > 1 ? { k: 'On the scoresheet', v: scorers.size, of: 'different scorers' } : null,
    dead ? { k: 'From a set piece', v: dead, of: `of ${goals.length} goal${goals.length === 1 ? '' : 's'}` } : null,
    typeof det.saves === 'number' && det.saves > 0 ? { k: 'Saves', v: det.saves, of: 'by the keeper' } : null,
    played.size ? { k: 'Players used', v: played.size, of: subs ? `${subs} off the bench` : '' } : null,
    cards ? { k: 'Bookings', v: cards, of: '' } : null,
  ].filter(Boolean);
  return tiles;
}

export function keysBand(m) {
  const tiles = keyNumbers(m);
  if (tiles.length < 3) return '';
  return `<div class="mr-keys pf-tiles rv">
          ${tiles.map((t) => `<div class="mr-key pf-stat">
            <b class="mr-key__n" data-count="${attr(String(t.v))}">${esc(String(t.v))}</b>
            <span class="mr-key__k">${esc(t.k)}</span>
            ${t.of ? `<i class="mr-key__of">${esc(t.of)}</i>` : ''}
          </div>`).join('\n          ')}
        </div>`;
}

/* ---- 2. The match, minute by minute --------------------------------------
   Ours above the line and theirs below it, each marker placed by the minute
   the club recorded. Half time is marked because it is the one division of a
   match everybody reads by.

   THE MARGIN RIBBON UNDER THE AXIS is the same events asked a different
   question: not what happened, but where the match stood. A 4-0 and a 4-3
   produce the same row of markers and completely different ribbons, which is
   the whole reason it is here rather than being a second chart somewhere
   else. It is drawn from the timed goals only, and the band says so when
   some of them are not timed, rather than drawing a ribbon that quietly
   leaves a goal out.

   AN UNTIMED EVENT IS NOT MINUTE ZERO. It is listed after the chart, which is
   the same trap the assist pairing fell into and the reason that rule exists. */
export function timeline(m, d) {
  if (m.isWalkover) return '';
  const { link, surname } = linkers(d);
  const det = m.detail || {};
  const evs = [];
  for (const g of det.goals || []) {
    evs.push({
      side: 'us',
      kind: 'goal',
      min: num(g.minute),
      who: g.og || g.num == null ? 'Own goal' : surname(g.num),
      html: g.og || g.num == null ? 'Own goal' : link(g.num, surname(g.num)),
      note: shortGoal(g),
    });
  }
  for (const g of det.opponentGoals || []) {
    const who = g.name && !/^unknown$/i.test(g.name) ? g.name : '';
    evs.push({
      side: 'them',
      kind: 'goal',
      min: num(g.minute),
      who: g.og ? 'Own goal' : who || 'A goal',
      html: esc(g.og ? 'Own goal' : who || 'A goal'),
      note: g.penalty ? 'pen' : '',
    });
  }
  for (const c of det.yellowCards || []) {
    const n = c.num ?? c;
    evs.push({ side: 'us', kind: 'yellow', min: num(c.minute), who: surname(n), html: link(n, surname(n)), note: 'booked' });
  }
  for (const c of det.redCards || []) {
    const n = c.num ?? c;
    evs.push({ side: 'us', kind: 'red', min: num(c.minute), who: surname(n), html: link(n, surname(n)), note: 'sent off' });
  }
  for (const s of substitutions(det)) {
    if (s.on == null && s.off == null) continue;
    evs.push({
      side: 'us',
      kind: 'sub',
      min: num(s.minute),
      who: s.on != null ? surname(s.on) : surname(s.off),
      html: s.on != null ? link(s.on, surname(s.on)) : link(s.off, surname(s.off)),
      note: s.on != null && s.off != null ? `for ${surname(s.off)}` : s.on != null ? 'on' : 'off',
    });
  }
  /* THEIR GOALS ARE A FIELD THE CLUB SOMETIMES LEAVES EMPTY, and ten records
     in the archive are short of a line. An empty lane under the axis beside a
     tile reading "Conceded 1" reads as something that failed to draw, so the
     page says which it is. The record checker already counts this; this is
     the same gap said out loud on the page it affects. */
  const theirs = (det.opponentGoals || []).length;
  const shortBy = Math.max(0, (m.theirGoals || 0) - theirs);
  const missingTheirs = shortBy
    ? `${shortBy} of ${m.opponent}’s ${m.theirGoals === 1 ? 'goal is' : 'goals are'} not on the record, so ${shortBy === 1 ? 'it is' : 'they are'} not drawn here.`
    : '';

  const timed = evs.filter((e) => e.min > 0).sort((a, b) => a.min - b.min);
  const untimed = evs.filter((e) => !(e.min > 0));
  if (!timed.length) return '';

  /* The margin at every point the score changed, as a step. The ribbon sits
     on the axis at nought and grows away from it whichever way the match was
     going, so a losing position is visible as depth rather than as a colour. */
  const goalsTimed = timed.filter((e) => e.kind === 'goal');
  const allGoalsTimed = goalsTimed.length
    === ((det.goals || []).length + (det.opponentGoals || []).length);
  const steps = [];
  let us = 0;
  let them = 0;
  for (const g of goalsTimed) {
    if (g.side === 'us') us += 1; else them += 1;
    steps.push({ x: atMin(g.min), m: us - them });
  }
  const peak = Math.max(1, ...steps.map((s) => Math.abs(s.m)));
  /* A closed path: along the axis, up to each margin, and back. Built as a
     staircase rather than a smoothed line, because the score is a step
     function and a curve between two goals would draw a margin the match
     never had. */
  const ribbon = (() => {
    if (!steps.length) return '';
    const H = 40;
    const px = (v) => (6 + v * 188).toFixed(1);
    const py = (mg) => (H / 2 - (mg / peak) * (H / 2 - 2)).toFixed(1);
    let path = `M ${px(0)} ${py(0)}`;
    let prev = 0;
    for (const s of steps) {
      path += ` L ${px(s.x)} ${py(prev)} L ${px(s.x)} ${py(s.m)}`;
      prev = s.m;
    }
    path += ` L ${px(1)} ${py(prev)} L ${px(1)} ${py(0)} Z`;
    return `<svg class="mr-tl__ribbon" viewBox="0 0 200 ${H}" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <line class="mr-tl__zero" x1="6" y1="${H / 2}" x2="194" y2="${H / 2}" />
            <path class="mr-tl__fill" d="${path}" />
          </svg>`;
  })();

  /* A MARKER AT THE EDGE IS ALIGNED TO IT, not centred on it. Centred, half
     of a 90th-minute label hangs off the right of the page, and the eighth
     goal of an 8-1 is exactly the one a reader goes looking for. */
  const mark = (e, i) => `<span class="mr-tl__mark mr-tl__mark--${e.kind} is-${e.side}${
    e.x > 0.9 ? ' is-end' : e.x < 0.1 ? ' is-start' : ''}"
            style="--x:${(e.x * 100).toFixed(2)}%;--i:${i}">
            <span class="mr-tl__min">${esc(String(e.min))}'</span>
            <span class="mr-tl__who">${e.html}${e.note ? ` <i>${esc(e.note)}</i>` : ''}</span>
          </span>`;
  /* Two markers close together would sit on top of one another, so the later
     one is lifted a row. Measured in MINUTES, because this is laid out in
     percentages and a build has no pixels to measure: nine minutes is a tenth
     of the axis, which is about the width of a surname on a laptop. It is not
     enough on a phone and nothing here can know that, which is why the names
     come off the axis below 680px and the minutes alone stay. */
  const withRows = timed.map((e) => ({ ...e, x: atMin(e.min) }));
  let lastUs = -99;
  let lastThem = -99;
  for (const e of withRows) {
    const last = e.side === 'us' ? lastUs : lastThem;
    e.row = e.min - last < 9 ? 1 : 0;
    if (e.side === 'us') lastUs = e.min; else lastThem = e.min;
  }

  return `<div class="mr-tl rv">
          <div class="mr-tl__board">
            <div class="mr-tl__lane mr-tl__lane--us${withRows.some((e) => e.side === 'us') ? '' : ' is-empty'}">
              ${withRows.filter((e) => e.side === 'us').map((e, i) => mark(e, i).replace('--i:', `--r:${e.row};--i:`)).join('\n              ')}
            </div>
            <div class="mr-tl__axis" aria-hidden="true">
              <span class="mr-tl__ht" style="--x:50%"><i>HT</i></span>
              <span class="mr-tl__ft" style="--x:100%"><i>FT</i></span>
            </div>
            <div class="mr-tl__lane mr-tl__lane--them${withRows.some((e) => e.side === 'them') ? '' : ' is-empty'}">
              ${withRows.filter((e) => e.side === 'them').map((e, i) => mark(e, i).replace('--i:', `--r:${e.row};--i:`)).join('\n              ')}
            </div>
          </div>
          ${ribbon ? `<figure class="mr-tl__marginfig">
            ${ribbon}
            <figcaption class="mr-tl__margincap">How the margin moved${allGoalsTimed ? '' : ', from the goals with a minute on record'}</figcaption>
          </figure>` : ''}
          ${missingTheirs ? `<p class="mr-tl__gap">${esc(missingTheirs)}</p>` : ''}
          ${untimed.length ? `<p class="mr-tl__untimed"><span>No minute on record</span>
            ${untimed.map((e) => `<span class="mr-tl__u">${e.html}${e.note ? ` <i>${esc(e.note)}</i>` : ''}</span>`).join('')}</p>` : ''}
        </div>`;
}

/* ---- 3. Every goal, with what the club recorded about it ------------------
   The vocabulary is `football.mjs`, shared with the panel and the stats
   engine, so the page cannot describe a goal in words the form could not
   produce. The mini pitch marks the BAND the goal was struck from, which is
   the honest limit of what the record holds: three zones, because that is
   what somebody remembers after the game. No zone, no diagram. */
const ZONE_Y = { six: 14, box: 26, outside: 46 };

export function goalCards(m, d) {
  const det = m.detail || {};
  const goals = (det.goals || []);
  if (!goals.length) return '';
  const { link, nameFor } = linkers(d);
  /* THE CARD DOES NOT TAKE `goal-N`. The video band already owns that id for
     every goal the club has filed film of, and two elements answering to one
     id is a page where a link lands on whichever the browser saw first. The
     card is `g-N` and points AT the film where there is any. */
  const filmed = new Set((d.goalFilmFor ? d.goalFilmFor(m) : []).map((f) => Number(f.n)));
  const detailed = goals.filter((g) => g.bodyPart || g.zone || g.situation || g.assist);
  if (!detailed.length) return '';
  const ordered = [...goals].map((g, i) => ({ ...g, n: i + 1 }))
    .sort((a, b) => (num(a.minute) || 999) - (num(b.minute) || 999));
  return `<ol class="mr-gs rv">
          ${ordered.map((g, i) => {
    const words = describeGoal(g);
    const who = g.og || g.num == null ? 'Own goal' : link(g.num);
    const made = g.assist && g.assist.num != null
      ? describeAssist(g.assist, link(g.assist.num, nameFor(g.assist.num)))
      : '';
    const y = ZONE_Y[g.zone];
    return `<li class="mr-g" id="g-${g.n}" style="--i:${i}">
            <span class="mr-g__min">${g.minute ? `${esc(String(g.minute))}<i>′</i>` : '<i>No minute</i>'}</span>
            <span class="mr-g__body">
              <b class="mr-g__who">${who}</b>
              ${words ? `<span class="mr-g__how">${esc(words.charAt(0).toUpperCase() + words.slice(1))}.</span>` : ''}
              ${made ? `<span class="mr-g__made">${made.charAt(0).toUpperCase() + made.slice(1)}.</span>` : ''}
              ${filmed.has(g.n) ? `<a class="mr-g__film" href="#goal-${g.n}">Watch it <span aria-hidden="true">↓</span></a>` : ''}
            </span>
            ${y ? `<svg class="mr-g__zone" viewBox="0 0 60 50" aria-hidden="true" focusable="false">
              <rect class="mr-g__turf" x="0.5" y="0.5" width="59" height="49" rx="3" />
              <path class="mr-g__lines" d="M10 0.5 V16 H50 V0.5 M22 0.5 V7 H38 V0.5" />
              <circle class="mr-g__spot" cx="30" cy="${y}" r="3.4" />
            </svg>` : ''}
          </li>`;
  }).join('\n          ')}
        </ol>`;
}

/* ---- 4. The eleven, where they stood -------------------------------------
   `POSITION_XY` is the one list of where a position is on a pitch, the same
   one the player profile's heat map reads, so the match page and the profile
   cannot put a left wing back in two different places.

   Only drawn where the club gave a position to most of the eleven. A diagram
   with four men on it and seven stacked on the halfway line is worse than the
   list it replaces, and the team sheet below carries every name either way. */
export function pitchXI(m, d) {
  const det = m.detail || {};
  /* In the same order as the list beside it, so the stagger runs back to
     front and the SVG's own label reads like a team sheet rather than like
     the order a form was filled in. */
  const starters = inPositionOrder(det.starters || []);
  const placed = starters.map((s) => {
    const code = (s.positions || [])[0];
    const xy = POSITION_XY[String(code || '').toUpperCase()];
    return xy ? { num: s.num, code, x: xy[0], y: xy[1], off: Boolean(s.subbedOff) } : null;
  }).filter(Boolean);
  if (placed.length < Math.max(7, Math.ceil(starters.length * 0.8))) return '';
  const { surname, link } = linkers(d);
  /* Two men in the same place is a real team sheet, not a mistake: a 3-4-1-2
     can name two strikers and the record gives both `ST`. They are nudged
     apart along the x axis rather than drawn on top of each other. */
  const bySpot = new Map();
  for (const p of placed) {
    const k = `${p.x}:${p.y}`;
    bySpot.set(k, [...(bySpot.get(k) || []), p]);
  }
  for (const group of bySpot.values()) {
    if (group.length < 2) continue;
    const span = Math.min(34, 13 * (group.length - 1));
    group.forEach((p, i) => { p.x = p.x - span / 2 + (span / (group.length - 1)) * i; });
  }
  return `<figure class="mr-pitch rv">
          <svg class="mr-pitch__svg" viewBox="0 14 100 117" role="img"
            aria-label="${attr(`The eleven in a ${det.formation || 'recorded'} shape: ${placed.map((p) => `${surname(p.num)} at ${positionName(p.code).toLowerCase()}`).join(', ')}`)}">
            ${/* CROPPED TO THE SHAPE, not to the pitch. A team's recorded
                  positions run from about the striker's line to the keeper, so
                  a full pitch spends its top third on grass nobody is standing
                  on. The frame opens just above the furthest man forward, with
                  the opponents' box running off the top edge, which is what a
                  television camera behind the goal shows. */''}
            <rect class="mr-pitch__turf" x="0.5" y="14" width="99" height="115.5" rx="2" />
            <g class="mr-pitch__lines" fill="none">
              <path d="M0.5 65 H99.5" />
              <circle cx="50" cy="65" r="13" />
              <path d="M28 129.5 V106 H72 V129.5 M38 129.5 V121 H62 V129.5" />
              <path d="M28 14 V24 H72 V14" />
            </g>
            ${placed.map((p, i) => `<g class="mr-pitch__man${p.off ? ' is-off' : ''}" style="--i:${i}">
              <circle class="mr-pitch__dot" cx="${p.x.toFixed(1)}" cy="${(p.y * 1.3).toFixed(1)}" r="3.4" />
              <text class="mr-pitch__nm" x="${p.x.toFixed(1)}" y="${(p.y * 1.3 + 7.6).toFixed(1)}" text-anchor="middle">${esc(surname(p.num))}</text>
            </g>`).join('\n            ')}
          </svg>
          <figcaption class="mr-pitch__cap">
            ${det.formation ? `<b>${esc(String(det.formation))}</b>` : ''}
            <span>Where the eleven were named${describeApproach(det) ? `, ${describeApproach(det)}` : ''}.
              ${placed.some((p) => p.off) ? 'A faded marker came off.' : 'Nobody in the eleven came off.'}</span>
          </figcaption>
        </figure>`;
}

/* ---- 5. The team sheet, read as a team sheet ------------------------------
   IT IS IN POSITION ORDER, which is the club's ask and is the whole reason
   this band is readable at all. The record stores the eleven in the order
   somebody filled the form in - keeper, right wing back, right centre back,
   left centre back, then a midfielder, then an attacking midfielder, then two
   strikers, then back to a defensive midfielder and a centre half - and a
   list in that order is not a team sheet, it is a form. Back to front and
   left to right is how every team sheet in football has ever been written,
   and it is the order the diagram beside it already draws.

   BOTH HALVES OF THAT ORDER ARE DERIVED FROM `POSITION_XY`, the same
   coordinates the pitch is drawn from, so the list and the diagram cannot
   disagree about where somebody stood. `y` descending is back to front
   (the keeper is at 92 and a striker at 14); `x` ascending is left to right
   within a line. Nothing is typed.

   NO COUNT ON A LINE HEADING. Group the recorded positions and this eleven
   is 5-3-2; the club recorded it as 3-4-1-2, reading the wing backs forward
   and the attacking midfielder as his own line. BOTH ARE RIGHT - where a
   wing back belongs is a judgement, not a fact - so the headings name the
   lines and count nothing, because a page printing 5-3-2 beside the club's
   own 3-4-1-2 would be arguing with itself in public.

   `shotFor` is the whole photograph resolution in one place, and the honest
   answer where there is none is initials, which is what every other screen
   on the site shows. A face per row and initials per row are both a row; a
   face per row and a BLANK per row is a layout mistake somebody reports.

   And a full position in words rather than a code. `LWB` is a storage key,
   like a shirt number. The code survives in exactly one place - a chip on
   the face, carrying the full name as its title and hidden from a screen
   reader, which already has the words on the next line - because it is the
   mark the pitch diagram uses and the chip is what lets a reader find the
   same man in both. */

/* Everything the record says this man did, and nothing it does not. Returned
   as marks rather than rendered here, so the suite can ask what was derived
   without reading it back out of HTML. */
export function sheetMarks(numIn, m) {
  const n = Number(numIn);
  const det = m.detail || {};
  const goals = (det.goals || []).filter((g) => !g.og && Number(g.num) === n);
  /* FROM THE GOAL, not from the flat list. The assist is a field on the goal
     and `assists` is derived from it on save, so counting the flat one risks
     counting a stored duplicate - the fault that published four assists each
     for two men in one evening of edits. An orphan (an assist belonging to no
     goal) is in the flat list alone, so it is taken from there and from
     nowhere else. */
  const made = (det.goals || []).filter((g) => g.assist && Number(g.assist.num) === n)
    .map((g) => ({ minute: g.minute }));
  const orphans = (det.assists || [])
    .filter((a) => Number(a.num) === n && a.forGoalBy == null)
    .map((a) => ({ minute: a.minute }));
  const named = (list) => (list || []).some((c) => Number(c && c.num != null ? c.num : c) === n);
  return {
    goals: goals.map((g) => ({ minute: g.minute, i: (det.goals || []).indexOf(g) + 1 })),
    assists: [...made, ...orphans],
    captain: det.captain != null && Number(det.captain) === n,
    potm: det.motm != null && Number(det.motm) === n,
    keeper: det.keeper != null && Number(det.keeper) === n,
    saves: det.keeper != null && Number(det.keeper) === n && typeof det.saves === 'number'
      ? det.saves : null,
    /* A clean sheet is credited to the men the CLUB named, never to whoever
       happened to start in a defensive position. The engine's position rule
       covers the ten archive matches nobody answered for, and it is a
       fallback for a career total - not a thing to print on one match page as
       though somebody had said it. */
    clean: m.theirGoals === 0 && (named(det.cleanSheets) || named(det.cleanSheetContributors)),
    yellow: (det.yellowCards || []).filter((c) => Number(c.num) === n).map((c) => c.minute),
    red: (det.redCards || []).filter((c) => Number(c.num) === n).map((c) => c.minute),
  };
}

/* How long he was on the pitch, counted from the substitutions and from
   nothing else.

   NULL WHERE IT CANNOT BE COUNTED, which is the rule the rest of this file
   runs on: a substitution with no minute makes every figure that depends on
   it a guess, and a guess printed as `73'` is indistinguishable from a fact.
   The archive is full of unminuted changes, so this returns null often and
   the row simply carries no figure. */
export function minutesPlayed(numIn, det) {
  const n = Number(numIn);
  const started = (det.starters || []).some((s) => Number(s.num) === n);
  const evs = substitutions(det).filter((s) => s.off === n || s.on === n);
  if (!started && !evs.some((s) => s.on === n)) return null;
  if (evs.some((s) => s.minute == null)) return null;
  let on = started ? 0 : null;
  let total = 0;
  for (const s of evs) {
    if (s.on === n) on = s.minute;
    else if (s.off === n && on != null) { total += Math.max(0, s.minute - on); on = null; }
  }
  if (on != null) total += Math.max(0, MINS - on);
  return total;
}

/* Back to front, then left to right, from the pitch's own coordinates. A man
   with a position nothing recognises sorts to the end rather than to the
   front: an unknown code is not a goalkeeper. */
const GROUP_OF = Object.fromEntries(POSITION_GROUPS
  .flatMap((g) => g.codes.map((c) => [c, g.key])));
const LINES = [
  { key: 'gk', label: 'In goal' },
  { key: 'def', label: 'At the back' },
  { key: 'mid', label: 'In midfield' },
  { key: 'fwd', label: 'Up front' },
  { key: '', label: 'Also named' },
];
const spotOf = (s) => {
  const code = String(((s.positions || [])[0]) || '').toUpperCase();
  const xy = POSITION_XY[code];
  return { code, group: GROUP_OF[code] || '', x: xy ? xy[0] : 50, y: xy ? xy[1] : -1 };
};
/* THE Y IS BANDED BEFORE IT IS SORTED ON, and that is the whole difference
   between a team sheet and a list. A left centre back sits at 81 and a centre
   half at 80, which is a drawing decision rather than a fact about who played
   further forward, and sorting on the raw figure put the back three in the
   order McLane, Heath, Marie - left, right, middle. Rounded to the nearest
   eight they are one line and the x decides, which is left to right as every
   team sheet in football has ever been written. A wing back at 64 is a band
   of his own, correctly, because he really did play further up. */
const band = (y) => Math.round(y / 8);
/* THE LINE COMES FIRST, then the band, then the x. A wing back is drawn at 64
   and a defensive midfielder at 67, so on the coordinates alone the two lines
   interleave - left wing back, left defensive midfielder, right defensive
   midfielder, right wing back - which is where everybody stood and is not a
   team sheet. Grouping first keeps the back line together and still reads
   back to front inside it, because a wing back really is in front of a centre
   half. A position nothing recognises sorts last: an unknown code is not a
   goalkeeper. */
const LINE_RANK = { gk: 0, def: 1, mid: 2, fwd: 3 };
const rank = (g) => (LINE_RANK[g] == null ? 4 : LINE_RANK[g]);
export const inPositionOrder = (list) => (list || [])
  .map((s, i) => ({ s, i, ...spotOf(s) }))
  .sort((a, b) => (rank(a.group) - rank(b.group))
    || (band(b.y) - band(a.y)) || (a.x - b.x) || (a.i - b.i))
  .map((r) => r.s);

/* HOW THE SIDE PLAYED, where the club has said. A shape is where eleven men
   stood; it is not how they played, and a 3-4-1-2 sitting in and countering
   and a 3-4-1-2 pressing from the whistle are two afternoons written down as
   the same four digits.

   NOTHING RECORDED DRAWS NOTHING. Every band on this page follows that rule
   and this one has to follow it hardest, because there is no derivation to
   fall back on: nothing in a Sunday-league return says where the press
   started, so this is the coach's answer or it is silence. A chip reading
   "Mid block" over a match nobody answered for would be the site inventing
   tactics, which is the one thing a record of a football match must not do. */
export function approachBand(m) {
  const picked = approachOf(m.detail || {});
  if (!picked.length) return '';
  return `<ul class="mr-how-xi">
            ${picked.map((x) => `<li class="mr-how-xi__i">
              <i>${esc(x.axisLabel)}</i><b>${esc(x.label)}</b><span>${esc(x.note)}</span>
            </li>`).join('\n            ')}
          </ul>`;
}

export function sheetRows(m, d) {
  const det = m.detail || {};
  const { nameFor } = linkers(d);
  const shot = d.shotFor || (() => '');
  const subs = substitutions(det);
  const initials = (n) => String(nameFor(n) || '').split(/\s+/).filter(Boolean)
    .slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('');
  const pages = new Map(((d.playersCompetitive || d.players || [])
    .filter((p) => p && !p.unknown && p.slug)).map((p) => [String(p.num), p.slug]));
  const face = (n) => {
    const src = shot(n, m.season);
    return src
      ? `<img class="mr-face__img" src="${attr(src)}" alt="" width="64" height="64" loading="lazy" decoding="async" />`
      : `<span class="mr-face__ini" aria-hidden="true">${esc(initials(n))}</span>`;
  };
  /* THE FACE IS INSIDE THE LINK, and that is not only a bigger target. An
     `alt=""` on a photograph is correct exactly when the thing beside it has
     already said who it is - the site's own rule - and putting the picture
     inside the anchor that prints the name is what makes that provable rather
     than asserted. The suite asks the same question the same way. */
  const min = (v) => (v == null || v === '' ? '' : `${Number(v)}'`);

  /* A mark is a pill with a word in it, never a letter and never a picture.
     `C` for the captain and a star for the Player of the Match read as
     decoration, and a numeral on its own beside a name is the one thing this
     site refuses to print. Where a mark points at something on this page it
     is a link, which is why the marks sit OUTSIDE the row's own anchor:
     nesting a link in a link is not markup, and the goal card is worth
     reaching from the man who scored it. */
  const mark = (cls, label, detail, href) => {
    const inner = `<b>${esc(label)}</b>${detail ? `<i>${esc(detail)}</i>` : ''}`;
    return `<li>${href ? `<a class="mr-mk mr-mk--${cls}" href="${attr(href)}">${inner}</a>`
      : `<span class="mr-mk mr-mk--${cls}">${inner}</span>`}</li>`;
  };

  let seq = 0;
  const row = (s, kind) => {
    const n = Number(s.num);
    const spot = spotOf(s);
    const spells = (s.spells || []).filter((p) => p && p.pos);
    /* EVERY PLACE HE PLAYED, not only the first. The record holds a spell per
       position and the page threw all but one away, so a centre half who
       finished the match in midfield read as a centre half all afternoon.
       Where there is only one spell this is exactly what it was before. */
    const codes = spells.length
      ? [...new Set(spells.map((p) => String(p.pos).toUpperCase()))]
      : (s.positions || []).map((c) => String(c).toUpperCase());
    const posText = codes.map((c) => positionName(c)).filter(Boolean).join(', ');
    /* The role, which this page used to discard entirely. A false nine is a
       striker with a job, and the club records the job. */
    const roles = [...new Set([s.role, ...spells.map((p) => p.role)]
      .map((r) => roleName(r)).filter(Boolean))];
    const mins = minutesPlayed(n, det);
    const mk = sheetMarks(n, m);
    const pair = subs.find((x) => (kind === 'xi' ? x.off : x.on) === n);
    const other = pair ? (kind === 'xi' ? pair.on : pair.off) : null;
    const slug = pages.get(String(n));
    const marks = [
      mk.captain ? mark('cap', 'Captain', '') : '',
      mk.potm ? mark('potm', 'Player of the match', '') : '',
      ...mk.goals.map((g) => mark('goal', 'Goal', min(g.minute), `#g-${g.i}`)),
      ...mk.assists.map((a) => mark('ast', 'Assist', min(a.minute))),
      mk.saves ? mark('save', `${mk.saves} save${mk.saves === 1 ? '' : 's'}`, '') : '',
      mk.clean ? mark('cs', 'Clean sheet', '') : '',
      ...mk.yellow.map((t) => mark('yel', 'Booked', min(t))),
      ...mk.red.map((t) => mark('red', 'Sent off', min(t))),
    ].filter(Boolean).join('');
    /* The change on BOTH rows, each pointing at the other. It was a list at
       the foot of the band saying the same two facts a third time, in a place
       where neither man's row could be seen. */
    const swap = other != null ? `<p class="mr-who__sw mr-who__sw--${kind === 'xi' ? 'off' : 'on'}">
          <span>${esc(kind === 'xi' ? 'Off' : 'On')}${pair.minute != null ? ` ${pair.minute}'` : ''}</span>
          ${kind === 'xi' ? 'for' : 'for'} <a href="${attr(`#w${other}`)}">${esc(nameFor(other))}</a></p>` : '';
    const state = kind === 'xi'
      ? (mk.red.length ? ' is-off' : (pair ? ' is-off' : ''))
      : (pair || s.on ? ' is-on' : ' is-unused');
    const inner = `<span class="mr-face">${face(n)}${spot.code
      ? `<i class="mr-face__pos" aria-hidden="true" title="${attr(positionName(spot.code))}">${esc(spot.code)}</i>` : ''}</span>`
      + `<span class="mr-who__t"><b>${esc(nameFor(n))}</b>`
      + `<i>${esc([posText || 'Squad player', ...roles].join(' · '))}</i></span>`
      + (mins != null ? `<span class="mr-who__m"><b>${esc(String(mins))}'</b><i>on the pitch</i></span>` : '');
    const part = mins != null && mins < MINS ? ' is-part' : '';
    return `<li class="mr-who${state}${part}" id="${attr(`w${n}`)}" style="--i:${seq += 1};--mins:${mins == null ? 100 : Math.round((mins / MINS) * 100)}">
              ${slug ? `<a class="mr-who__a" href="${attr(`/players/${slug}.html`)}">${inner}</a>`
    : `<span class="mr-who__a">${inner}</span>`}
              ${marks ? `<ul class="mr-who__marks">${marks}</ul>` : ''}
              ${swap}
            </li>`;
  };

  const starters = inPositionOrder(det.starters || []);
  const xi = LINES.map((ln) => {
    const men = starters.filter((s) => spotOf(s).group === ln.key);
    if (!men.length) return '';
    return `<h4 class="mr-line">${esc(ln.label)}</h4>
            <ol class="mr-whos">
            ${men.map((s) => row(s, 'xi')).join('\n            ')}
            </ol>`;
  }).filter(Boolean).join('\n            ');

  const bench = inPositionOrder(det.bench || []);
  const used = bench.filter((b) => subs.some((x) => x.on === Number(b.num)) || b.on).length;
  return {
    xi,
    bench: bench.map((b) => row(b, 'bench')).join('\n            '),
    anyBench: bench.length > 0,
    /* What the sheet comes to, counted off the sheet itself. It is the line
       that says a 14-man return is a 14-man return, and it is the only place
       on the page where the bench's unused men are counted at all. */
    foot: `${starters.length + bench.length} named · ${starters.length} started`
      + (bench.length ? ` · ${used} off the bench · ${bench.length - used} unused` : ''),
  };
}

/* ---- 6. What the club had done to this opponent before --------------------
   Only the matches BEFORE this one, because a page about 11 October cannot
   count a result from November as part of what led into it. `sameClub` keeps
   a first team apart from a 2.0, which is the whole reason that function
   exists: reduce both far enough and the site claims a record against a side
   it has never met.

   A first meeting says so. An empty record under a heading reads as a page
   that failed to load. */
export function headToHead(m, d) {
  const prior = (d.played || [])
    .filter((x) => x.played && x.id !== m.id && sameClub(x.opponent, m.opponent))
    .filter((x) => String(x.iso || toISO(x.date) || '') < String(m.iso || toISO(m.date) || ''))
    .sort((a, b) => String(a.iso || '').localeCompare(String(b.iso || '')));
  if (!prior.length) return '';
  const w = prior.filter((x) => x.outcome === 'W').length;
  const dr = prior.filter((x) => x.outcome === 'D').length;
  const l = prior.filter((x) => x.outcome === 'L').length;
  const OUT = { W: 'Won', D: 'Drawn', L: 'Lost' };
  return `<div class="mr-h2h rv">
          <p class="mr-h2h__line"><b>${esc(String(prior.length))}</b> previous meeting${prior.length === 1 ? '' : 's'}
            <span>${esc(`${w} won, ${dr} drawn, ${l} lost`)}</span></p>
          <ol class="mr-h2h__pips">
            ${prior.map((x, i) => `<li style="--i:${i}"><a class="mr-pip mr-pip--${esc(String(x.outcome || 'x').toLowerCase())}"
              href="${attr(`/matches/${x.id}.html`)}">
              <b>${esc(x.ourScoreline || x.scoreline || '')}</b>
              <i>${esc(OUT[x.outcome] || '')} · ${esc(fmtDate(x.date))}</i>
            </a></li>`).join('\n            ')}
          </ol>
        </div>`;
}

/* ---- 7. Where the result left the club ------------------------------------
   A league match: the division's standing derived from the transcribed
   results up to and including this one, which is a fact about that afternoon
   rather than the live table. The live table is wrong on an archived page by
   construction - it is where the club is NOW - and a page about September
   captioned with October's position is the kind of error nobody spots because
   both numbers are real.

   A cup tie: the round, which is read off `cup-rounds.json` and never
   inferred. No round on record and the band says nothing rather than guessing
   one, which is the same rule the cup route page is built on. */
export function afterMatch(m, d) {
  const iso = String(m.iso || toISO(m.date) || '');
  if (isLeague(m) && iso) {
    const t = d.nextDivisionTable || {};
    if (String(t.season || '') === String(m.season) && (t.results || []).length) {
      const upTo = (t.results || []).filter((r) => String(toISO(r.date) || '') <= iso);
      if (upTo.length) {
        const rows = deriveTable(upTo);
        const ours = rows.find((r) => r.us);
        if (ours) {
          return `<p class="mr-after rv"><b>${esc(ordinal(ours.pos))}</b>
            <span>in ${esc(t.division || 'the division')} that afternoon, on ${esc(String(ours.points))}
            point${ours.points === 1 ? '' : 's'} from ${esc(String(ours.played))}
            game${ours.played === 1 ? '' : 's'}</span>
            <a href="/league.html">The division ${'<span aria-hidden="true">→</span>'}</a></p>`;
        }
      }
    }
    return '';
  }
  if (isCup(m) && m.round) {
    return `<p class="mr-after rv"><b>${esc(String(m.roundShort || m.round))}</b>
      <span>${esc(m.round)} of the ${esc(m.competition)}${m.roundAssumed ? ', by its place in the run' : ''}</span>
      <a href="/fixtures.html#cups">The cup route ${'<span aria-hidden="true">→</span>'}</a></p>`;
  }
  return '';
}

/* ---- 8. The season, one match either side --------------------------------
   The only way out of a match page was the results list, so reading a season
   meant going back to an index between every game. Competitive and friendly
   are both in it, because a friendly is a real match with a real page and
   leaving it out would make the chain skip a week with no explanation. */
export function neighbours(m, d) {
  const list = (d.played || []).filter((x) => x.played)
    .sort((a, b) => String(a.iso || toISO(a.date) || '').localeCompare(String(b.iso || toISO(b.date) || '')));
  const i = list.findIndex((x) => x.id === m.id);
  if (i < 0) return '';
  const near = (x, which) => (x ? `<a class="mr-walk__a mr-walk__a--${which}" href="${attr(`/matches/${x.id}.html`)}">
            <i>${which === 'prev' ? 'The match before' : 'The match after'}</i>
            <b>${esc(x.opponent)}</b>
            <span>${esc(x.ourScoreline || x.scoreline || '')} · ${esc(fmtDate(x.date))}</span>
          </a>` : '');
  const prev = near(list[i - 1], 'prev');
  const next = near(list[i + 1], 'next');
  if (!prev && !next) return '';
  return `<nav class="mr-walk rv" aria-label="The matches either side of this one">
          ${prev}${next}
        </nav>`;
}
