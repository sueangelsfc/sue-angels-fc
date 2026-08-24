/* ==========================================================================
   CLUB RECORDS  (/records.html, "Records" under On the Pitch)

   What the club has won, what it holds, and the runs behind it.

   Every figure here is DERIVED from the match record by src/lib/stats.mjs.
   Nothing on this page is typed in, which is the whole point of a records
   page: the moment a result is saved in the control panel, the record that
   result beats updates itself and the one it does not stays put.

   The streaks are the substance. A count on its own ("8 wins") cannot be
   checked by a reader and cannot be told apart from a run that is still
   going, so every streak here carries its span and says whether it ended.
   The headline is the one that needs no qualification: eighteen League Ten
   games, eighteen wins, a hundred per cent record.

   Honours, the leadership group and the season awards come from the
   recognition table rather than from matches, because no match record can
   say who was voted Players' Player.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc, attr } from '../lib/html.mjs';
import { CLUB } from '../lib/club.mjs';
import { seasonViews, defaultView, seasonBar, seasonPanels, matchNote } from '../lib/seasons.mjs';
import {
  fmtDate, longestStreak, playerStreak, teamSummary, leaderboard,
  biggestWin, heaviestDefeat, slugify, isLeague } from '../lib/stats.mjs';
import { siteFooter, sitePreMain, siteHeader, oppBadge } from './home.mjs';
import { sourceNote } from '../lib/blocks.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
/* Resolved in src/lib/dataset.mjs, not here. Each page kept its own copy of
   "is there a file for this shirt number", and shirt numbers get reused: a new
   signing given number 12 inherited a previous holder's photograph. */

const STAR = '/assets/badge/sue-angels-badge-star.webp';
const ARROW = '<span aria-hidden="true">→</span>';

const OUTCOME = { W: 'Won', D: 'Drawn', L: 'Lost' };

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

export function records(d) {
  const shotFor = (num) => (d.shotFor ? d.shotFor(num, d.currentSeason) : '');
  /* EVERY BAND ON THIS PAGE IS A FUNCTION OF A SEASON NOW.

     It was pinned to `d.currentSeason` throughout: the honours rail said "in
     25/26", the perfect-season band said "League Ten 25/26", and the records
     grid and the streaks were worked out over every match the club has ever
     played. Three different scopes on one page, none of them labelled, and no
     way to ask what any of it looked like in a given year.

     `bodyFor(view)` builds the lot from one match list. The page renders it
     once per season plus once for all of them, and the shared switcher shows
     the matching panel. See src/lib/seasons.mjs. */
  const VIEWS = seasonViews(d);
  const DEFAULT = defaultView(VIEWS);

  const bodyFor = (view) => {
  /* COMPETITIVE ONLY, because this page is the club's record book. It read
     `view.matches`, so one pre-season friendly put the club's all-time goals
     at 139 when the figure every other page derives is 137, and the biggest
     win, the streaks and the player records were all drawn from a list with a
     friendly in it. seasons.mjs hands every view both lists for exactly this
     reason; the results page was the only one taking the right one. */
  const played = view.competitive;
  const season = view.key === 'all' ? d.currentSeason : view.key;
  const inSeason = view.key === 'all' ? played : played.filter((m) => m.season === season);
  const league = inSeason.filter(isLeague);
  const sum = teamSummary(inSeason);
  const leagueSum = teamSummary(league);
  /* THE PLAYER RECORDS ARE THIS SEASON'S. They were the career table
     whichever tab was on, so 26/27 - a season with no matches in it - claimed
     "Most appearances 30, Most goals 31, Most assists 19" beside team records
     correctly reading nought. The engine is run once per season in
     dataset.mjs, so a season's records are the same derivation over a shorter
     match list. */
  const seasonTable = view.key === 'all'
    ? (d.players || [])
    : ((d.playersBySeason || {})[view.key] || []);
  const players = seasonTable.filter((p) => !p.unknown);
  /* And so is the recognition. A record with no season recorded belongs to
     the all-seasons view rather than to a year nobody wrote down. */
  const rec = (d.recognition || [])
    .filter((r) => view.key === 'all' || String(r.season || '') === view.key);

  const byNum = new Map((d.squad || []).map((p) => [p.num, p]));
  const playerLink = (num, fallback) => {
    const p = byNum.get(num);
    return p ? { name: p.name, href: `/players/${p.slug}.html`, num } : { name: fallback || '', href: '', num };
  };

  /* ---- Streaks, each with its span ------------------------------------ */
  const st = (pred, opts) => longestStreak(played, pred, opts);
  const span = (s) => (s.from && s.to
    ? (s.from.id === s.to.id ? fmtDate(s.from.date) : `${fmtDate(s.from.date)} to ${fmtDate(s.to.date)}`)
    : '');

  const perfectLeague = st((m) => m.outcome === 'W', { competition: d.divisionOf(season), season });
  const streaks = [
    {
      value: `${perfectLeague.length}`, unit: 'wins',
      label: `${d.divisionOf(season)} won from ${perfectLeague.of}`,
      who: perfectLeague.perfect ? 'A hundred per cent record' : 'Longest league winning run',
      when: span(perfectLeague), flag: perfectLeague.perfect, scope: d.divisionOf(season),
    },
    (() => { const s = st((m) => m.outcome === 'W'); return {
      value: `${s.length}`, unit: 'wins', label: 'Longest winning run',
      who: 'Across every competition', when: span(s), scope: 'All competitions' }; })(),
    (() => { const s = st((m) => m.outcome !== 'L'); return {
      value: `${s.length}`, unit: 'games', label: 'Longest unbeaten run',
      who: 'Across every competition', when: span(s), scope: 'All competitions' }; })(),
    (() => { const s = st((m) => m.theirGoals === 0, { goalRecordOnly: true }); return {
      value: `${s.length}`, unit: 'games', label: 'Consecutive clean sheets',
      who: 'Without conceding', when: span(s), scope: 'All competitions' }; })(),
    (() => { const s = st((m) => m.ourGoals > 0, { goalRecordOnly: true }); return {
      value: `${s.length}`, unit: 'games', label: 'Consecutive games scoring',
      who: 'Never blanked', when: span(s), scope: 'All competitions' }; })(),
    (() => { const s = st((m) => m.ourGoals >= 4, { goalRecordOnly: true }); return {
      value: `${s.length}`, unit: 'games', label: 'Consecutive games scoring four or more',
      who: 'At the sharpest', when: span(s), scope: 'All competitions' }; })(),
  ].filter((s) => Number(s.value) > 0);

  /* Player streaks: the best holder of each, named. */
  const bestStreak = (pred) => players
    .map((p) => ({ p, s: playerStreak(p, played, pred) }))
    .filter((r) => r.s.length > 0)
    .sort((a, b) => b.s.length - a.s.length || b.p.goals - a.p.goals)[0];

  const scoring = bestStreak((r) => (r.goals || 0) > 0);
  const contrib = bestStreak((r) => ((r.goals || 0) + (r.assists || 0)) > 0);
  const starts = bestStreak((r) => r.role === 'start');
  const playerStreaks = [
    scoring && { value: scoring.s.length, unit: 'games', label: 'Longest scoring run',
      p: scoring.p, when: span(scoring.s) },
    contrib && { value: contrib.s.length, unit: 'games', label: 'Longest run with a goal or assist',
      p: contrib.p, when: span(contrib.s) },
    starts && { value: starts.s.length, unit: 'starts', label: 'Most consecutive starts',
      p: starts.p, when: span(starts.s) },
  ].filter(Boolean);

  /* ---- The record grid -------------------------------------------------
     A record can be shared, and picking one name off a tie-break is how a
     page ends up crediting the wrong person: the clean-sheet record is held
     jointly by the goalkeeper and a wing back on 13 apiece, and sorting by
     appearances alone would have named only the outfielder. Every holder is
     named. */
  const holdersOf = (key) => {
    const best = Math.max(0, ...players.map((p) => p[key] || 0));
    if (!best) return [];
    return players.filter((p) => (p[key] || 0) === best)
      .sort((a, b) => b.starts - a.starts || a.num - b.num);
  };
  const top = (key) => leaderboard(players, key, 1)[0];
  const big = biggestWin(played);
  const worst = heaviestDefeat(played);

  /* Home and away split out. A cup final on neutral ground belongs to
     neither, so it is excluded from both rather than counted as an away game
     it was not. */
  const atHome = played.filter((m) => m.weAreHome && !m.neutral);
  const away = played.filter((m) => !m.weAreHome && !m.neutral);
  const venueCard = (m, label) => (m ? {
    k: 'team', value: m.ourScoreline, label,
    who: `v ${shortClub(m.opponent)}`,
    sub: `${fmtDate(m.date)} · ${m.round ? `${shortComp(m.competition)} ${m.round.toLowerCase()}` : shortComp(m.competition)}`,
  } : null);
  /* Every defeat sharing the worst margin, not just the first one found. */
  const worstMargin = worst ? worst.theirGoals - worst.ourGoals : 0;
  const worstAll = worst
    ? played.filter((m) => m.outcome === 'L' && m.countsGoals
        && (m.theirGoals - m.ourGoals) === worstMargin && m.theirGoals === worst.theirGoals)
      .sort((a, b) => (a.iso || '').localeCompare(b.iso || ''))
    : [];
  const firstMatch = played.slice().sort((a, b) => (a.iso || '').localeCompare(b.iso || ''))[0];

  /* A milestone is the match at which a running total first reached N. */
  const firstTo = (p, key, target) => {
    const order = (p.matches || [])
      .map((r) => ({ ...r, m: played.find((x) => x.id === r.id) }))
      .filter((r) => r.m)
      .sort((a, b) => (a.m.iso || '').localeCompare(b.m.iso || ''));
    let run = 0;
    for (const r of order) {
      run += key === 'apps' ? (r.role === 'start' ? 1 : 0) : (r[key] || 0);
      if (run >= target) return r.m;
    }
    return null;
  };
  const milestone = (key, target, label) => {
    const holders = players
      .map((p) => ({ p, m: firstTo(p, key, target) }))
      .filter((r) => r.m)
      .sort((a, b) => (a.m.iso || '').localeCompare(b.m.iso || ''));
    const h = holders[0];
    return h ? { value: target, label, p: h.p, when: `${fmtDate(h.m.date)} v ${shortClub(h.m.opponent)}` } : null;
  };

  const playerCard = (key, value, label) => {
    const hs = holdersOf(key);
    if (!hs.length) return null;
    return { k: 'player', value: hs[0][key], label, holders: hs, sub: value || 'All competitions' };
  };

  const cards = [
    playerCard('apps', '', 'Most appearances'),
    playerCard('goals', '', 'Most goals'),
    playerCard('assists', '', 'Most assists'),
    playerCard('cleanSheets', '', 'Most clean sheets'),
    playerCard('motm', '', 'Most Player of the Match awards'),
    /* ourScoreline, not scoreline: these cards name the opponent with no
       venue beside them, so the club's own goals have to come first. */
    big && { k: 'team', value: big.ourScoreline, label: 'Biggest win',
      who: `v ${shortClub(big.opponent)}`, sub: `${fmtDate(big.date)} · ${big.homeAway}` },
    { k: 'team', value: sum.goalsFor, label: 'Goals scored', who: CLUB.short, sub: 'All competitions' },
    { k: 'team', value: leagueSum.goalsAgainst, label: 'Goals conceded in the league', who: CLUB.short, sub: `${d.divisionOf(season)} ${season}` },
    { k: 'team', value: sum.cleanSheets, label: 'Clean sheets', who: CLUB.short, sub: 'All competitions' },
    venueCard(biggestWin(atHome), 'Biggest home win'),
    venueCard(biggestWin(away), 'Biggest away win'),
    venueCard(heaviestDefeat(atHome), 'Heaviest home defeat'),
    venueCard(heaviestDefeat(away), 'Heaviest away defeat'),
    firstMatch && { k: 'team', value: firstMatch.ourScoreline || 'W/O',
      label: 'The club\u2019s first ever match', who: `v ${shortClub(firstMatch.opponent)}`,
      sub: `${fmtDate(firstMatch.date)} · ${firstMatch.homeAway} · ${OUTCOME[firstMatch.outcome] || ''}` },
    /* Two defeats by the same margin. ONE card listing both, not two cards
       showing the same number twice: a record held jointly is one record.
       Each line says what the tie was, since one was a cup final on neutral
       ground and "Away" would have been wrong for it. */
    worstAll.length && {
      k: 'team', value: worstAll[0].ourScoreline,
      label: 'Heaviest defeat', shared: worstAll.length > 1,
      teams: worstAll.map((m) => ({
        who: `v ${shortClub(m.opponent)}`,
        note: `${fmtDate(m.date)} · ${m.round ? `${shortComp(m.competition)} ${m.round.toLowerCase()}` : m.homeAway}`,
      })),
    },
  ].filter(Boolean);

  const milestones = [
    milestone('goals', 25, 'First to 25 goals'),
    milestone('apps', 25, 'First to 25 appearances'),
    milestone('goals', 10, 'First to 10 goals'),
    milestone('assists', 10, 'First to 10 assists'),
  ].filter(Boolean);

  const face = (p, size = 44) => {
    const src = p ? shotFor(p.num) : '';
    return `<span class="rc-face" style="--f:${size}px">${src
      ? `<img src="${attr(src)}" alt="${attr((p && p.name) || '')}" width="${size}" height="${size}" loading="lazy" decoding="async" />`
      : `<img class="rc-face__crest" src="${STAR}" alt="Sue’s Angels FC star" width="${Math.round(size * 0.5)}" height="${Math.round(size * 0.62)}" loading="lazy" decoding="async" />`}</span>`;
  };

  /* ================= 01 HONOURS ================= */
  /* Filtered to the view. Every trophy was showing under every season tab,
     with the rail claiming "2 in 26/27" over two won in 25/26. A trophy with
     no season recorded stays visible on the all-seasons view, which is the
     honest home for a record whose date nobody wrote down. */
  const trophies = rec.filter((r) => r.type === 'trophy')
    .filter((t) => view.key === 'all' || String(t.season || '') === view.key);
  const honoursBand = trophies.length ? `<section class="sec rc-honours" aria-labelledby="rc-hon-h">
      <div class="wrap">
        ${rail(1, 'Honours', view.key === 'all'
    ? `${trophies.length} won`
    : `${trophies.length} in ${view.label}`)}
        <h2 class="h2 rv" id="rc-hon-h">What the club has <span class="volt">won.</span></h2>
        <ul class="rc-trophies rv">
          ${trophies.map((t) => `<li class="rc-trophy">
            <img class="rc-trophy__star" src="${STAR}" alt="Sue’s Angels FC star" width="44" height="54" loading="lazy" decoding="async" />
            <p class="rc-trophy__season">${esc(t.season)}</p>
            <p class="rc-trophy__title">${esc(t.title)}</p>
            <p class="rc-trophy__body">${esc(t.description || '')}</p>
          </li>`).join('\n          ')}
        </ul>
      </div>
    </section>` : '';

  /* ================= 02 THE PERFECT SEASON ================= */
  const perfectBand = perfectLeague.perfect ? `<section class="sec rc-perfect" aria-labelledby="rc-pf-h">
      <div class="wrap">
        ${rail(2, 'The record that stands out', view.key === 'all'
    ? 'The league, every season'
    : `${d.divisionOf(view.key)} ${view.label}`)}
        <h2 class="h2 rv" id="rc-pf-h">Played ${esc(perfectLeague.of)}. Won <span class="volt">${esc(perfectLeague.length)}.</span></h2>
        <div class="rc-pf rv">
          <ul class="rc-pf__nums">
            <li><b>${esc(leagueSum.played)}</b><i>Played</i></li>
            <li><b>${esc(leagueSum.won)}</b><i>Won</i></li>
            <li><b>${esc(leagueSum.drawn)}</b><i>Drawn</i></li>
            <li><b>${esc(leagueSum.lost)}</b><i>Lost</i></li>
            <li><b>${esc(leagueSum.winPct)}%</b><i>Win rate</i></li>
            <li><b>${esc(leagueSum.points)}</b><i>Points</i></li>
          </ul>
          <p class="rc-pf__body">A hundred per cent record: ${esc(CLUB.short)} won every one of
            their ${esc(leagueSum.played)} ${esc(d.divisionOf(season))} matches in ${esc(season)}, from
            ${esc(span(perfectLeague))}. Eleven goals conceded across the season is the best
            defensive record in ${esc(d.divisionOf(season))} history.</p>
        </div>
      </div>
    </section>` : '';

  /* ================= 03 THE RECORDS ================= */
  const cardHtml = (c) => `<li class="rc-card" data-kind="${attr(c.k)}">
            <p class="rc-card__v">${esc(c.value)}</p>
            <p class="rc-card__l">${esc(c.label)}${(c.holders && c.holders.length > 1) || c.shared ? ' <i>shared</i>' : ''}</p>
            ${c.holders
    ? c.holders.map((p) => `<a class="rc-card__who" href="/players/${attr(p.slug)}.html">${face(p, 34)}<span>${esc(p.name)}</span></a>`).join('\n            ')
    : c.teams
      ? c.teams.map((t) => `<span class="rc-card__team">
              <span class="rc-card__who is-team"><img class="rc-card__crest" src="${STAR}" alt="Sue’s Angels FC star" width="20" height="25" loading="lazy" decoding="async" /><span>${esc(t.who)}</span></span>
              <span class="rc-card__sub">${esc(t.note)}</span>
            </span>`).join('\n            ')
      : `<p class="rc-card__who is-team"><img class="rc-card__crest" src="${STAR}" alt="Sue’s Angels FC star" width="20" height="25" loading="lazy" decoding="async" /><span>${esc(c.who || '')}</span></p>`}
            ${c.teams ? '' : `<p class="rc-card__sub">${esc(c.sub || '')}</p>`}
          </li>`;

  const recordsBand = `<section class="sec rc-grid" id="records" aria-labelledby="rc-g-h">
      <div class="wrap">
        ${rail(3, 'Proudly held by', `${cards.length} records`)}
        <h2 class="h2 rv" id="rc-g-h">The club <span class="volt">records.</span></h2>
        <div class="lg-chiprow rv" role="tablist" aria-label="Record type" data-rec-tabs>
          <a class="lg-chip is-on" role="tab" href="#records" aria-selected="true" data-rec="all">All records <b>${esc(cards.length)}</b></a>
          <a class="lg-chip" role="tab" href="#records" aria-selected="false" data-rec="player">Player <b>${esc(cards.filter((c) => c.k === 'player').length)}</b></a>
          <a class="lg-chip" role="tab" href="#records" aria-selected="false" data-rec="team">Team <b>${esc(cards.filter((c) => c.k === 'team').length)}</b></a>
        </div>
        <ul class="rc-cards rv">
          ${cards.map(cardHtml).join('\n          ')}
        </ul>
      </div>
    </section>`;

  /* ================= 04 STREAKS ================= */
  const streaksBand = streaks.length ? `<section class="sec rc-streaks" aria-labelledby="rc-st-h">
      <div class="wrap">
        ${rail(4, 'Runs', `${streaks.length + playerStreaks.length} streaks`)}
        <h2 class="h2 rv" id="rc-st-h">The longest <span class="volt">runs.</span></h2>
        <p class="rc-lede rv">A streak is only a record if you can check it, so each one carries
          the dates it ran between.</p>
        <ul class="rc-streaks__list rv">
          ${streaks.map((s) => `<li class="rc-streak${s.flag ? ' is-flag' : ''}">
            <span class="rc-streak__v">${esc(s.value)}<i>${esc(s.unit)}</i></span>
            <span class="rc-streak__body">
              <b>${esc(s.label)}</b>
              <span>${esc(s.who)}</span>
              <span class="rc-streak__when">${esc(s.when)}</span>
            </span>
            <span class="rc-streak__scope">${esc(s.scope)}</span>
          </li>`).join('\n          ')}
          ${playerStreaks.map((s) => `<li class="rc-streak is-player">
            <span class="rc-streak__v">${esc(s.value)}<i>${esc(s.unit)}</i></span>
            <span class="rc-streak__body">
              <b>${esc(s.label)}</b>
              <a class="rc-streak__who" href="/players/${attr(s.p.slug)}.html">${face(s.p, 30)}<span>${esc(s.p.name)}</span></a>
              <span class="rc-streak__when">${esc(s.when)}</span>
            </span>
            <span class="rc-streak__scope">Player</span>
          </li>`).join('\n          ')}
        </ul>
      </div>
    </section>` : '';

  /* ================= 05 FIRSTS ================= */
  const firstsBand = milestones.length ? `<section class="sec rc-firsts" aria-labelledby="rc-f-h">
      <div class="wrap">
        ${rail(5, 'Firsts', `${milestones.length} milestones`)}
        <h2 class="h2 rv" id="rc-f-h">First to get <span class="volt">there.</span></h2>
        <ul class="rc-firsts__list rv">
          ${milestones.map((m) => `<li class="rc-first">
            ${face(m.p, 54)}
            <span class="rc-first__body">
              <b>${esc(m.label)}</b>
              <a href="/players/${attr(m.p.slug)}.html">${esc(m.p.name)}</a>
              <span>${esc(m.when)}</span>
            </span>
          </li>`).join('\n          ')}
        </ul>
      </div>
    </section>` : '';

  /* ================= 06 LEADERSHIP ================= */
  const lead = rec.find((r) => r.type === 'leadership');
  const capCounts = new Map();
  for (const m of played) {
    if (m.detail && m.detail.captain != null) {
      capCounts.set(m.detail.captain, (capCounts.get(m.detail.captain) || 0) + 1);
    }
  }
  const leaders = lead ? [
    { role: 'Club captain', num: lead.clubCaptainPlayerId, name: lead.clubCaptainName },
    { role: 'Vice-captain', num: lead.viceCaptainPlayerId, name: lead.viceCaptainName },
    { role: 'Third-choice captain', num: lead.thirdChoiceCaptainPlayerId, name: lead.thirdChoiceCaptainName },
  ].map((l) => ({ ...l, ...playerLink(l.num, l.name), led: capCounts.get(l.num) || 0 })) : [];

  const leadBand = leaders.length ? `<section class="sec rc-lead" aria-labelledby="rc-l-h">
      <div class="wrap">
        ${rail(6, `${season} season`, 'Leadership group')}
        <h2 class="h2 rv" id="rc-l-h">Who wore the <span class="volt">armband.</span></h2>
        <p class="rc-lede rv">${esc(lead.note || '')}</p>
        <ul class="rc-lead__list rv">
          ${leaders.map((l, i) => `<li class="rc-leader${i === 0 ? ' is-first' : ''}">
            ${face({ num: l.num, slug: '' }, 62)}
            <span class="rc-leader__body">
              <span class="rc-leader__role">${esc(l.role)}</span>
              ${l.href
    ? `<a class="rc-leader__name" href="${attr(l.href)}">${esc(l.name)}</a>`
    : `<span class="rc-leader__name">${esc(l.name)}</span>`}
              <span class="rc-leader__led">${l.led ? `Led the side ${esc(l.led)} time${l.led === 1 ? '' : 's'}` : 'Named in the leadership group'}</span>
            </span>
          </li>`).join('\n          ')}
        </ul>
      </div>
    </section>` : '';

  return { honoursBand, perfectBand, recordsBand, streaksBand, firstsBand, leadBand };
  };

  /* ================= HERO ================= */
  const hero = `<section class="rc-hero" aria-labelledby="rc-h">
      <div class="wrap">
        <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> Club archive</p>
        <h1 class="rc-hero__title" id="rc-h">Club records<span class="volt">.</span></h1>
        <p class="rc-hero__lede">The honours, the numbers and the runs behind them. Every figure
          on this page is worked out from the match record, so it updates itself the moment a
          result is saved.</p>
      </div>
    </section>`;

  /* ================= CTA ================= */
  const ctaBand = `<section class="sec sec--cta rc-cta" aria-labelledby="rc-cta-h">
      <div class="wrap">
        <div class="cta2">
          <span class="cta2__glow" aria-hidden="true"></span>
          <img class="cta2__badge" src="${STAR}" alt="Sue’s Angels FC star" width="500" height="620" loading="lazy" decoding="async" aria-hidden="true" />
          <div class="cta2__glass glassbox rv">
            <p class="eyebrow cta2__eyebrow">${esc(d.titleSeason)} · Champions</p>
            <h2 class="h2" id="rc-cta-h">Records are there to be <span class="volt">broken.</span></h2>
            <p class="cta2__sub">${esc(d.divisionOf(d.nextSeason))} starts in September. Every one of these
              is on the line.</p>
            <div class="cta2__btns">
              <a class="btn btn--volt" href="/fixtures.html">The fixtures ${ARROW}</a>
              <a class="btn btn--ghost" href="/stats.html">Player stats</a>
            </div>
          </div>
        </div>
      </div>
    </section>`;

  return {
    css: 'home.css',
    shell: 'home',
    bodyClass: 'is-home is-sub is-records',
    preMain: sitePreMain(),
    footerHtml: siteFooter(),
    body: siteHeader('/records.html') + hero
      + `<section class="sec rc-seasons"><div class="wrap">${seasonBar(VIEWS, DEFAULT, matchNote, { esc, attr })}</div></section>`
      + seasonPanels(VIEWS, DEFAULT, (v) => {
    const b = bodyFor(v);
    return b.honoursBand + b.perfectBand + b.recordsBand + b.streaksBand + b.firstsBand + b.leadBand;
  }, { attr })
      + sourceNote(['fulltime', 'surreyfa'], { lead: 'League and cup figures reconcile with' })
      + ctaBand,
    schema: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `Club records · ${CLUB.name}`,
      description: `Honours, club records and the longest runs in ${CLUB.name} history.`,
      url: `${CLUB.site}/records.html`,
    }],
  };
}
