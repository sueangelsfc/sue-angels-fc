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
import { teamSummary, isLeague} from '../lib/stats.mjs';
import { siteFooter, sitePreMain, siteHeader } from './home.mjs';
import { sourceNote } from '../lib/blocks.mjs';

const STAR = '/assets/badge/sue-angels-badge-star.webp';
const ARROW = '<span aria-hidden="true">→</span>';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
/* An uploaded photograph wins over the file on disk, because it is the most
   recent thing anybody chose. `d.photoFor` resolves the season first, so a
   club that has not taken this season's pictures yet keeps last season's
   rather than falling back to initials. */
/* Resolved once, in src/lib/dataset.mjs: the season's uploaded picture, then
   the most recent, then a file on disk ONLY where the shirt number can be
   proved to belong to this player. The disk files are named after a number
   and nothing else, and the panel gives a new signing the lowest free one, so
   Ade Owolona was signed into 12 and inherited the previous holder's face. */
const shotFor = (num, d, season) => (d && d.shotFor ? d.shotFor(num, season) : '');

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

  /* WHICH SEASONS A PLAYER BELONGS TO.
     Read off the matches he was actually named in, not off a label. Anyone
     currently in the squad also belongs to the season about to start, because
     that is what being in the squad means in August before a ball is kicked.

     One DOM, filtered, exactly as the position chips already work: with the
     script blocked the page is the whole squad under real headings rather
     than an empty tab. */
  const seasonOfMatch = new Map((d.matches || []).map((m) => [m.id, m.season]));
  const season = d.currentSeason;
  const seasons = (d.seasons || []).map((x) => x.name);
  const upcoming = seasons.filter((n) => n !== season);
  const PAST_STATUS = new Set(['retired', 'departed', 'staff']);

  const all = (d.squad || []).map((p) => {
    const st = stats.get(p.num) || {};
    const played = new Set((st.matches || [])
      .map((r) => seasonOfMatch.get(r.id)).filter(Boolean));
    /* Anyone still at the club belongs to the season about to start, because
       that is what being in the squad means in August before a ball is
       kicked. A season already PLAYED is evidence only: a line that read
       "if he has played nowhere, put him in the current season" was adding
       two players who never turned out to 25/26, so the tab said 32 played
       and the page showed 34 cards. */
    if (!PAST_STATUS.has(p.status)) upcoming.forEach((n) => played.add(n));
    return { ...p, s: st, seasons: [...played] };
  });

  /* PER-SEASON FIGURES, AND WHY EVERY TAB USED TO SHOW THE SAME ONES.
     A card printed the career total whichever season tab was open, so 26/27,
     which has not seen a ball kicked, reported 25/26's goals and starts. The
     tab looked like a filter and behaved like a label.

     The statistics engine is run once per season in dataset.mjs, so the
     figures for a season are derived from that season's matches by the same
     code as everything else. VIEWS is what the tab bar offers: every season,
     newest first, plus an all-seasons view that is the career total. */
  const bySeasonStats = d.playersBySeason || {};
  /* What a player was in a given season: on trial, injured, unavailable, or
     one of the three the site works out for itself (new, retained, back).
     See src/lib/squad-status.mjs. */
  const statusOf = (num, s) => (d.statusLabelIn ? d.statusLabelIn(num, s) : null);
  const statsIn = (view, num) => {
    if (view === 'all') return stats.get(num) || {};
    return ((bySeasonStats[view] || []).find((x) => x.num === num)) || {};
  };
  const VIEWS = [...seasons, 'all'];
  const viewKey = (v) => (v === 'all' ? 'all' : v.replace(/\D/g, ''));
  const viewLabel = (v) => (v === 'all' ? 'All seasons' : v);

  /* Squad leaders, so a card can say why this player matters at a glance.
     Only an outright leader is badged: a shared top score would make the mark
     meaningless. Worked out per view, because the leading scorer of one
     season is not necessarily the club's leading scorer. */
  const leaderOf = (key, pool, view) => {
    const val = (x) => statsIn(view, x.num)[key] || 0;
    const vals = pool.map(val);
    const top = Math.max(0, ...vals);
    if (!top) return null;
    return vals.filter((v) => v === top).length === 1 ? pool.find((x) => val(x) === top) : null;
  };

  /* Nine statuses, and only three of them take a player off the squad page.
     Retained, new, returned, on trial and injured are all still in the squad:
     they say something about WHY somebody is in it, which is the only
     interesting question in July. Anything the panel has not been told about
     is treated as active, so a missing status can never quietly delete
     somebody from the squad page. */
  const PAST = new Set(['retired', 'departed', 'staff']);
  const first = all.filter((p) => !PAST.has(p.status));
  const retired = all.filter((p) => p.status === 'retired');
  const departed = all.filter((p) => p.status === 'departed');
  const nowCoaching = all.filter((p) => p.status === 'staff');

  const league = teamSummary((d.played || []).filter(isLeague));
  const squadGoals = first.reduce((n, p) => n + (p.s.goals || 0), 0);

  const byGroup = (list) => GROUPS
    .map((g) => ({ ...g, players: list.filter((p) => p.positionGroup === g.key) }))
    .filter((g) => g.players.length);

  /* A card. The three headline figures are always visible; the panel adds the
     rest and rides in on hover or focus, but is in the DOM either way. The
     whole card is one link, so the panel is reachable by keyboard. */
  const outfieldPool = all.filter((x) => !x.gk);
  const gkPool = all.filter((x) => x.gk);
  const badgesFor = (view) => {
    const m = new Map();
    [['goals', 'Top scorer', outfieldPool], ['assists', 'Most assists', outfieldPool],
      ['motm', 'Most MOTM', all], ['cleanSheets', 'Most clean sheets', gkPool]]
      .forEach(([key, label, pool]) => {
        const who = leaderOf(key, pool, view);
        if (who && !m.has(who.num)) m.set(who.num, label);
      });
    return m;
  };
  const badgesByView = new Map(VIEWS.map((v) => [v, badgesFor(v)]));
  const badges = badgesByView.get(VIEWS[0]) || new Map();

  /* "Apps" AGAIN, and this time it is true. This used to say "Starts, not
     Apps", because the engine counted an appearance only when a player was
     named in the eleven and calling that figure apps produced cards reading
     2 apps and 7 goals - William Clark, who started twice and came off the
     bench for nine more.

     That is the fault, not the label. An appearance is a start or a
     substitute the record can PROVE was on the pitch, so Clark's card reads
     11 and 7 and the card is right. Unused bench outings keep their own
     column rather than being folded in, which is the part the old note had
     correct. */
  const sixOf = (p, view) => {
    const s = statsIn(view, p.num);
    return p.gk
      ? [s.apps || 0, s.cleanSheets || 0, s.motm || 0,
        s.benchUnused || 0, s.cleanSheets || 0, s.motm || 0]
      : [s.apps || 0, s.goals || 0, s.assists || 0,
        s.benchUnused || 0, (s.goals || 0) + (s.assists || 0), s.motm || 0];
  };

  const card = (p, i) => {
    const badge = badges.get(p.num);
    const shot = shotFor(p.num, d, season);
    const inSeasons = (p.seasons || [season]).join(' ');
    const keys = p.gk
      ? ['Apps', 'Clean', 'MOTM', 'Bench', 'Clean sheets', 'MOTM']
      : ['Apps', 'Goals', 'Assists', 'Bench', 'Involved', 'MOTM'];
    const six = sixOf(p, VIEWS[0]);
    const heads = keys.slice(0, 3).map((k, n) => ({ v: six[n], k }));
    const extra = keys.slice(3).map((k, n) => ({ v: six[n + 3], k }));

    /* Every view's six figures ride on the card, so switching season is a
       rewrite of six numbers rather than a page the script has to fetch.
       Six small integers per view is a few dozen bytes, and it keeps the
       whole squad readable with the script blocked: what ships in the HTML
       is the first tab's real numbers, not placeholders. */
    const payload = VIEWS.map((v) => {
      const b = (badgesByView.get(v) || new Map()).get(p.num) || '';
      /* What he was THAT season, not what he is today. Without this the 25/26
         tab labelled a man who left in June 2026 "Left the club" over the
         twenty-nine games he played that year. */
      const st = v === 'all' ? null : statusOf(p.num, v);
      return ` data-st-${viewKey(v)}="${attr(sixOf(p, v).join(','))}"`
        + (b ? ` data-bg-${viewKey(v)}="${attr(b)}"` : '')
        + (st && st.label ? ` data-sl-${viewKey(v)}="${attr(st.label)}"` : '');
    }).join('');
    const nowStatus = VIEWS[0] === 'all' ? null : statusOf(p.num, VIEWS[0]);

    return `<li class="pc" style="--i:${i}" data-seasons="${attr(inSeasons)}"${payload}>
            <a class="pc__link" href="/players/${attr(p.slug)}.html" data-tilt>
              <span class="pc__shot">
                ${shot
    ? `<img src="${attr(shot)}" alt="${attr(`${p.name}, ${p.position || 'player'} for Sue’s Angels FC`)}" width="320" height="480" loading="lazy" decoding="async" />`
    : `<img class="pc__crest" src="${STAR}" alt="Sue’s Angels FC star" width="200" height="248" loading="lazy" decoding="async" />`}
              </span>
              <!-- One row for both chips rather than two independently pinned
                   corners. Pinned, a long leader badge ("Most clean sheets")
                   simply grew leftwards until it sat on top of the position,
                   which is what it did on every card narrower than about
                   200px. In a wrapping row it drops to its own line instead.

                   The position is its full name. It used to be the raw code,
                   which is a thing the club's own records say and not a thing
                   anybody calls a player: LCB reads as a typo unless you
                   already know it. Codes survive only on the pitch diagram,
                   where there is room for nothing else and each carries its
                   name in a <title>. -->
              <span class="pc__tags">
                <span class="pc__pos${p.positionCode ? '' : ' is-none'}">${esc(p.position || 'Squad player')}</span>
                <!-- Always present so switching season can fill it, hidden
                     when this view has no leader mark for him. [hidden] is
                     display:none, so an empty chip never paints. -->
                <span class="pc__badge" data-badge${badge ? '' : ' hidden'}>${esc(badge || '')}</span>
              </span>
              <span class="pc__body">
                <!-- What he was THAT season. New signing, retained and back
                     at the club are worked out from which seasons he has been
                     in the squad, so nobody has to keep them true and none of
                     them carries a year baked into a string. -->
                <span class="pc__state" data-state${nowStatus && nowStatus.label ? '' : ' hidden'}>${esc((nowStatus && nowStatus.label) || '')}</span>
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
  /* Season tabs. Real buttons, and the panel below is the same one DOM
     filtered, so nothing depends on the script to be readable. */
  /* A tab says what it will show BEFORE you press it: how many players, and
     how many matches those figures were counted from. "26/27 · 23 players ·
     no matches yet" is the honest label for a season in July, and it is why
     every figure under that tab is a nought rather than a bug. */
  /* Competitive, because the figures the tab is promising are. Counting a
     pre-season friendly here labelled 26/27 "1 match" above a set of noughts,
     which reads as a bug rather than as a season that has not started. */
  const playedIn = (n) => (d.competitive || []).filter((m) => m.season === n).length;
  const seasonTabs = VIEWS.length > 1 ? `<div class="sq-seasons" data-season-filter role="group"
        aria-label="Season">
        ${VIEWS.map((v, i) => {
    const games = v === 'all' ? (d.competitive || []).length : playedIn(v);
    /* WHAT THE TAB PRODUCES, which is the only thing a tab can honestly
       promise: the number of players it will put on the page. It is the same
       figure the "All" chip carries and the same as the position chips sum
       to, because all three are now the one question.

       It said 34 over a hero saying 32 used, then 32 over chips totalling
       22. The hero is allowed to say something different because it says it
       under its own label ("Players used"), which is a narrower claim than
       "everyone this tab shows". */
    const count = v === 'all'
      ? all.length
      : all.filter((p) => (p.seasons || []).includes(v)).length;
    const note = `${count} player${count === 1 ? '' : 's'} · ${games ? `${games} match${games === 1 ? '' : 'es'}` : 'no matches yet'}`;
    return `<button class="sq-season${i === 0 ? ' is-on' : ''}" type="button"
          data-season="${attr(v)}" data-view="${attr(viewKey(v))}"
          aria-pressed="${i === 0 ? 'true' : 'false'}">
          <b>${esc(viewLabel(v))}</b><span>${esc(note)}</span>
        </button>`;
  }).join('\n        ')}
      </div>` : '';

  /* The chips count what the SEASON TAB is showing, not the whole roster.
     They were built once from every player in the band, so the 25/26 tab
     listed thirty-four players above a row of chips adding up to twenty-four.
     Every view's counts ride on the chip and the tab rewrites them, exactly
     as the cards' figures do.

     A group with nobody in it that season is hidden rather than shown as a
     zero: "Forwards 0" is a heading for a filter that would return nothing. */
  /* THE CHIPS COUNT EVERYONE ON THE TAB, both bands.

     They counted the first team alone, so a tab reading "32 players · 33
     matches" sat above a row of chips totalling 22: the ten who played that
     season and have since retired or moved on were in the band below and in
     neither figure. Two numbers about the same tab.

     They filter both bands too. Asking for goalkeepers should show the
     season's goalkeepers, not only the ones still at the club. */
  const chips = (list, scope) => {
    const groups = byGroup(all);
    const inView = (p, v) => v === 'all' || (p.seasons || []).includes(v);
    const counts = (pick) => VIEWS
      .map((v) => ` data-n-${viewKey(v)}="${attr(all.filter((p) => inView(p, v) && pick(p)).length)}"`)
      .join('');
    const v0 = VIEWS[0];
    const n0 = (pick) => all.filter((p) => inView(p, v0) && pick(p)).length;
    return `<div class="sq-chips" data-filter-scope="${attr(scope)}">
          <a class="sq-chip is-on" href="#${attr(scope)}" data-group-all${counts(() => true)}>All<span>${esc(n0(() => true))}</span></a>
          ${groups.map((g) => {
    const pick = (p) => p.positionGroup === g.key;
    return `<a class="sq-chip" href="#${attr(scope)}" data-group-pick="${attr(g.key)}"${counts(pick)}${n0(pick) ? '' : ' hidden'}>${esc(g.label)}<span>${esc(n0(pick))}</span></a>`;
  }).join('\n          ')}
        </div>`;
  };

  /* ================= HERO =================
     The eyebrow, the sentence and the three tallies all follow the season
     tab. They used to be one fixed claim about 25/26 sitting above a filter
     that could be showing any season: "The players who won League Ten
     unbeaten" over a 26/27 squad that has not kicked a ball.

     Every view's figures ride on the elements and the tab rewrites them, so
     the page reads correctly with the script blocked (it shows the first
     tab's, which is the season the page opens on) and follows it when it
     runs. */
  const heroFor = (v) => {
    const played = (d.competitive || []).filter((m) => v === 'all' || m.season === v);
    const lg = teamSummary(played.filter(isLeague));
    /* WHICH POOL the figures describe, and it is not the same question in
       August as it is in May.

       A season that has been played is described by who ACTUALLY PLAYED IT,
       which includes the eleven who have since retired or moved on: they were
       there, and every goal in the total is one of theirs. Counting only
       today's first team gave 22 players and then their 123 goals, which is
       two different squads in one sentence.

       A season not yet started has nobody who has played it, so the only
       honest figure is who is in the squad for it. */
    const featured = all.filter((p) => {
      const st = statsIn(v, p.num);
      return (st.starts || 0) + (st.subApps || 0) > 0;
    });
    const usePlayed = played.length > 0;
    const pool = usePlayed ? featured : first.filter((p) => (p.seasons || []).includes(v));
    const goals = pool.reduce((n, p) => n + (statsIn(v, p.num).goals || 0), 0);
    return {
      eyebrow: v === 'all' ? 'Every season' : `First team · ${v}`,
      label: usePlayed ? 'Players used' : 'In the first team',
      lede: v === 'all'
        ? 'Every player who has pulled on the shirt, grouped by where they actually line up. Every number here is counted from the team sheets.'
        : usePlayed
          ? `The ${pool.length} used in ${v}, grouped by where they actually line up. Every number here is counted from the team sheets.`
          : `The squad for ${v}, grouped by where they line up. Nothing has been played yet, so the figures fill in as results come in.`,
      tally: [pool.length, goals, lg.cleanSheets || 0],
    };
  };
  const heroData = VIEWS.map((v) => ` data-hero-${viewKey(v)}="${attr(JSON.stringify(heroFor(v)))}"`).join('');
  const h0 = heroFor(VIEWS[0]);
  const hero = `<section class="sq-hero" aria-labelledby="sq-h">
      <div class="wrap sq-hero__grid" data-sq-hero${heroData}>
        <div>
          <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i>
            <span data-hero-eyebrow>${esc(h0.eyebrow)}</span></p>
          <h1 class="sq-hero__title" id="sq-h">The squad<span class="volt">.</span></h1>
          <p class="sq-hero__lede" data-hero-lede>${esc(h0.lede)}</p>
        </div>
        <dl class="sq-tally glassbox">
          <div><dt data-hero-dt>${esc(h0.label)}</dt><dd>${esc(h0.tally[0])}</dd></div>
          <div><dt>Goals between them</dt><dd>${esc(h0.tally[1])}</dd></div>
          <div><dt>League clean sheets</dt><dd>${esc(h0.tally[2])}</dd></div>
        </dl>
      </div>
    </section>`;

  /* ================= 01 FIRST TEAM ================= */
  const firstBand = `<section class="sec sq-first" id="first-team" aria-labelledby="sq-first-h">
      <div class="wrap">
        <!-- The count follows the season tab: the band is filtered, so a
             fixed figure beside it is a caption for a different page. -->
        ${rail(1, 'First team', `${first.filter((p) => (p.seasons || []).includes(VIEWS[0])).length} players`)
    .replace('<span class="xrail__r">', '<span class="xrail__r" data-band-count>')}
        <h2 class="h2 rv" id="sq-first-h">The first <span class="volt">team.</span></h2>
        ${seasonTabs}
        ${chips(first, 'first-team')}
        <div class="sq-groups rv">
        ${grid(first)}
        </div>
        <p class="sq-note">An appearance is a start, or a substitute the match record shows was
          on the pitch. A name on the bench with nothing beside it is not an appearance and is
          counted separately, because Sunday-league returns do not always record who came on.</p>
      </div>
    </section>`;

  /* ================= 02 PAST PLAYERS ================= */
  /* Cards go inside position groups here too, exactly as the first team's do.
     They used to sit in one flat list, so the position chips - which now
     COUNT across both bands - could only FILTER one of them: asking for
     goalkeepers left every retired outfielder on screen. A group is only
     drawn where somebody is in it, so a section with no forwards does not
     grow an empty heading. */
  const pastSection = (list, key, title, sub) => list.length ? `<section class="sq-past" data-past="${attr(key)}">
          <h3 class="sq-past__h">${esc(title)} <span>${esc(sub)}</span></h3>
          ${byGroup(list).map((g) => `<section class="sq-grp sq-grp--past" data-group="${attr(g.key)}">
            <h4 class="sq-grp__sub">${esc(g.label)} <span>${esc(g.players.length)}</span></h4>
            <ul class="sq-cards sq-cards--past">
              ${g.players.map((p, i) => card(p, i)).join('\n              ')}
            </ul>
          </section>`).join('\n          ')}
        </section>` : '';

  const pastBand = (retired.length || departed.length || nowCoaching.length) ? `<section class="sec sq-pastband" id="past-players" aria-labelledby="sq-past-h">
      <div class="wrap">
        ${rail(2, 'Past players', `${retired.length + departed.length + nowCoaching.length} in all`)}
        <h2 class="h2 rv" id="sq-past-h">Those who <span class="volt">came before.</span></h2>
        <p class="sq-lede rv">Nobody who pulled on the shirt disappears off this page. These are the
          players who hung up the boots or moved on, with the record they left behind.</p>
        <div class="rv">
        ${pastSection(retired, 'retired', 'Retired', 'Hung up the boots')}
        ${pastSection(departed, 'departed', 'Departed', 'Moved on from the club')}
        ${pastSection(nowCoaching, 'staff', 'Now on the staff', 'Swapped the pitch for the touchline')}
        </div>
      </div>
    </section>` : '';

  /* ================= CTA ================= */
  const ctaBand = `<section class="sec sec--cta sq-cta" aria-labelledby="sq-cta-h">
      <div class="wrap">
        <div class="cta2">
          <span class="cta2__glow" aria-hidden="true"></span>
          <img class="cta2__badge" src="${STAR}" alt="Sue’s Angels FC star" width="500" height="620" loading="lazy" decoding="async" aria-hidden="true" />
          <div class="cta2__glass glassbox rv">
            <p class="eyebrow cta2__eyebrow">Want to play here?</p>
            <h2 class="h2" id="sq-cta-h">Trials are open for <span class="volt">${esc(d.nextSeason)}.</span></h2>
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
    body: siteHeader('/squad.html') + hero + firstBand + pastBand + ctaBand
      + sourceNote(['fulltime', 'surreyfa']),
    bodyClass: 'is-home is-sub is-squad',
    css: 'home.css',
    shell: 'home',
    preMain: sitePreMain(),
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
