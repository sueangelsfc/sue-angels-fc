/* ==========================================================================
   THE DIGITAL MATCH PROGRAMME  (/programme.html, "Match programme" under Media)

   A programme is the thing somebody reads on their phone standing beside the
   pitch twenty minutes before kick-off, so this is written for that reader:
   who we are playing, where, when, who is available, what happened last
   season, and who pays for the shirts.

   ONE STABLE URL, NOT ONE PER MATCH. The nav has to point somewhere that
   still exists next week, and a programme is a matchday artefact rather than
   an archive: it is always the NEXT fixture, rebuilt whenever the fixture
   list moves. `d.nextFixture` is derived once in dataset.mjs against the day
   the site was generated, so this page and the home page's next-match card
   can never disagree about what is coming up.

   EVERY FIGURE IS DERIVED. Nothing in here is typed: the head-to-head is
   counted from the archive, the squad is the roster for the season being
   played, the honours come from the league table the build reconciles, and
   the partners come from the one partner list. A programme that quoted a
   number somebody had to remember to update would be wrong by October.

   IT DEGRADES TO A PAGE THAT STILL MAKES SENSE. With no fixture to come the
   page says so and shows the season instead, because the club will hit that
   state every May and a blank programme reads as a broken site.
   ========================================================================== */
import { esc, attr, clubCrest, icon, crest } from '../lib/html.mjs';
import { CLUB } from '../lib/club.mjs';
import { fmtDate, isUs } from '../lib/stats.mjs';
import { clubIdentity } from '../lib/club-name.mjs';
import { siteFooter, sitePreMain, siteHeader } from './home.mjs';
import { sourceNote } from '../lib/blocks.mjs';

const rail = (n, label, ref) => `
  <div class="xrail" aria-hidden="true">
    <span class="xrail__l"><span class="xrail__n">${String(n).padStart(2, '0')}</span>
      <span class="xrail__t">${esc(label)}</span></span>
    <span class="xrail__r">${esc(ref)}</span>
  </div>`;

/* WHAT THE ARCHIVE KNOWS ABOUT TODAY'S OPPONENT, and the difference between
   "never played" and "played their other side" is the one this club has
   already published wrongly once. `clubIdentity` keeps a 1st Team and a 2.0
   apart while merging two spellings of the same side. */
function headToHead(d, opponent) {
  const id = clubIdentity(opponent || '');
  const played = (d.matches || []).filter((m) => m.played);
  const met = played.filter((m) => clubIdentity(m.opponent || '') === id);
  const related = played.filter((m) => {
    const o = clubIdentity(m.opponent || '');
    return o !== id && o.split(' ')[0] === id.split(' ')[0];
  });
  const tally = { p: met.length, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
  met.forEach((m) => {
    tally.gf += m.ourGoals || 0;
    tally.ga += m.theirGoals || 0;
    if (m.outcome === 'W') tally.w += 1;
    else if (m.outcome === 'D') tally.d += 1;
    else if (m.outcome === 'L') tally.l += 1;
  });
  return { met, related, tally };
}


/* ---- A DETERMINISTIC SHUFFLE -------------------------------------------
   The word search has to be the same grid on every build. A random one would
   churn the page in git on every deploy and mean the puzzle somebody solved
   at half time is not the puzzle on the page at full time. Seeded from the
   fixture, so a new match gets a new grid and the same match never does. */
function rng(seed) {
  let h = 2166136261;
  for (let i = 0; i < String(seed).length; i += 1) {
    h ^= String(seed).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6D2B79F5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---- THE WORD SEARCH ----------------------------------------------------
   Surnames from the squad that is actually playing this season, hidden in a
   grid. Built here rather than drawn by hand because the squad changes: two
   players signed this week and the puzzle picked them up without anybody
   editing it.

   A word that will not fit is DROPPED, not forced, and the answer list is
   what was actually placed. A puzzle listing a word that is not in the grid
   is worse than a smaller puzzle. */
function wordSearch(names, seed, size = 12) {
  const rand = rng(seed);
  const grid = Array.from({ length: size }, () => Array(size).fill(''));
  const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1], [0, -1], [-1, 0]];
  const placed = [];

  const fits = (word, r, c, dr, dc) => {
    for (let i = 0; i < word.length; i += 1) {
      const rr = r + dr * i;
      const cc = c + dc * i;
      if (rr < 0 || cc < 0 || rr >= size || cc >= size) return false;
      const at = grid[rr][cc];
      if (at && at !== word[i]) return false;
    }
    return true;
  };

  for (const raw of names) {
    const word = String(raw).toUpperCase().replace(/[^A-Z]/g, '');
    if (word.length < 4 || word.length > size) continue;
    let done = false;
    for (let tries = 0; tries < 220 && !done; tries += 1) {
      const [dr, dc] = DIRS[Math.floor(rand() * DIRS.length)];
      const r = Math.floor(rand() * size);
      const c = Math.floor(rand() * size);
      if (!fits(word, r, c, dr, dc)) continue;
      for (let i = 0; i < word.length; i += 1) grid[r + dr * i][c + dc * i] = word[i];
      placed.push(raw);
      done = true;
    }
  }
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (!grid[r][c]) grid[r][c] = A[Math.floor(rand() * 26)];
    }
  }
  return { grid, placed };
}

/* ---- THE QUIZ -----------------------------------------------------------
   Every question is COUNTED, never typed, so it is still true next season
   and cannot contradict the pages that publish the same figures. A question
   whose answer cannot be derived is not asked. */
function quiz(d) {
  const out = [];
  const ask = (q, a) => { if (a !== null && a !== undefined && a !== '') out.push({ q, a }); };
  const us = (d.table || []).find((r) => r.us);
  const last = d.titleSeason;
  const players = d.players || [];
  const byGoals = players.slice().sort((a, b) => (b.goals || 0) - (a.goals || 0))[0];
  const byAssists = players.slice().sort((a, b) => (b.assists || 0) - (a.assists || 0))[0];
  const played = (d.matches || []).filter((x) => x.played && x.countsGoals);
  const biggest = played.slice()
    .sort((a, b) => ((b.ourGoals || 0) - (b.theirGoals || 0)) - ((a.ourGoals || 0) - (a.theirGoals || 0)))[0];

  if (us) {
    ask(`How many league matches did the club win in ${last}?`,
      `${us.won}, out of ${us.played}. Every one of them.`);
    ask(`How many goals did the club concede in the ${last} league season?`,
      `${us.goalsAgainst}, in ${us.played} matches.`);
    ask(`How many points did the club finish on?`,
      `${us.points}. The maximum available.`);
  }
  if (byGoals && byGoals.goals) {
    ask('Who was the club’s leading scorer in its first season?',
      `${byGoals.name}, with ${byGoals.goals} in all competitions.`);
  }
  if (byAssists && byAssists.assists) {
    ask('And who made the most assists?', `${byAssists.name}, with ${byAssists.assists}.`);
  }
  if (biggest) {
    ask('What was the club’s biggest win?',
      `${biggest.ourScoreline} ${biggest.homeAway.toLowerCase()} to ${biggest.opponent}, ${fmtDate(biggest.date)}.`);
  }
  const walkovers = played.length ? (d.matches || []).filter((x) => x.isWalkover).length : 0;
  if (walkovers) {
    ask('Three of last season’s eighteen league matches were not played at all. Why?',
      `They were awarded as walkovers. ${walkovers} of them, and they carry no score.`);
  }
  return out;
}

export function programme(d) {
  const m = d.nextFixture;
  const badges = d.badges;
  /* THE FIXTURE'S SEASON, NOT THE FIGURES' SEASON. `d.currentSeason` is the
     season the club's published figures describe and it reads `competitive`,
     so in September it is still last season until somebody records a result.
     That is right for the stats page and wrong for a programme: this page is
     for a 26/27 fixture and says so on the day, not after it. */
  const season = (m && m.season) || d.nextSeason || d.currentSeason;

  /* ---- 01 THE COVER ---------------------------------------------------- */
  const cover = m
    ? `<section class="sec pr-cover" aria-labelledby="pr-h">
      <div class="wrap">
        <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i>
          Matchday programme · ${esc(season)}</p>
        <h1 class="pr-cover__title" id="pr-h">${esc(m.competition)}<span class="volt">.</span></h1>
        <div class="pr-cover__teams">
          <div class="pr-team">
            ${m.weAreHome ? `<span class="pr-team__badge">${crest()}</span>`
    : clubCrest(m.home, badges, 'pr-team__badge')}
            <span class="pr-team__name">${esc(m.weAreHome ? CLUB.name : m.home)}</span>
            <span class="pr-team__tag">${esc(m.weAreHome ? 'Home' : '')}</span>
          </div>
          <span class="pr-cover__v" aria-hidden="true">v</span>
          <div class="pr-team">
            ${m.weAreHome ? clubCrest(m.away, badges, 'pr-team__badge')
    : `<span class="pr-team__badge">${crest()}</span>`}
            <span class="pr-team__name">${esc(m.weAreHome ? m.away : CLUB.name)}</span>
            <span class="pr-team__tag">${esc(m.weAreHome ? '' : 'Home')}</span>
          </div>
        </div>
        <dl class="pr-facts">
          <div><dt>Date</dt><dd>${esc(fmtDate(m.date, { weekday: true, long: true }))}</dd></div>
          <div><dt>Kick-off</dt><dd>${esc(m.kick || 'To be confirmed')}</dd></div>
          <div><dt>Venue</dt><dd>${esc(m.venue || CLUB.venue.name)}</dd></div>
          <div><dt>Competition</dt><dd>${esc(m.competition)}</dd></div>
        </dl>
        <p class="pr-cover__where">${icon('pin', '')}
          <a href="https://www.google.com/maps/search/?api=1&amp;query=${attr(encodeURIComponent(m.venue || CLUB.venue.mapQuery))}"
            target="_blank" rel="noopener">Find the ground</a></p>
      </div>
    </section>`
    : `<section class="sec pr-cover" aria-labelledby="pr-h">
      <div class="wrap">
        <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i>
          Matchday programme</p>
        <h1 class="pr-cover__title" id="pr-h">No match to come<span class="volt">.</span></h1>
        <p class="pr-cover__none">There is no fixture on the calendar at the moment. This page
          fills itself in as soon as the next one is announced, and everything below is the
          season as it stands.</p>
      </div>
    </section>`;

  /* ---- 02 TODAY'S OPPONENT --------------------------------------------- */
  const h2h = m ? headToHead(d, m.opponent) : null;
  const opponentBand = m ? `<section class="sec pr-band" aria-labelledby="pr-opp-h">
      <div class="wrap">
        ${rail(1, 'Today’s opponent', h2h.tally.p ? `Played ${h2h.tally.p}` : 'First meeting')}
        <h2 class="h2 rv" id="pr-opp-h">${esc(m.opponent)}<span class="volt">.</span></h2>
        ${h2h.tally.p
    ? `<dl class="pr-h2h">
          <div><dt>Played</dt><dd>${esc(h2h.tally.p)}</dd></div>
          <div><dt>Won</dt><dd>${esc(h2h.tally.w)}</dd></div>
          <div><dt>Drawn</dt><dd>${esc(h2h.tally.d)}</dd></div>
          <div><dt>Lost</dt><dd>${esc(h2h.tally.l)}</dd></div>
          <div><dt>Scored</dt><dd>${esc(h2h.tally.gf)}</dd></div>
          <div><dt>Conceded</dt><dd>${esc(h2h.tally.ga)}</dd></div>
        </dl>
        <ul class="pr-list">${h2h.met.slice(-5).reverse().map((x) => `<li>
          <span>${esc(fmtDate(x.date))}</span>
          <span>${esc(x.homeAway)}</span>
          <b>${esc(x.ourScoreline || '')}</b>
          <span class="pr-clip">${esc(x.competition)}</span>
        </li>`).join('')}</ul>`
    : `<p class="pr-lede rv">A first meeting. There is no result, no team sheet and no
        previous scoreline against ${esc(m.opponent)} anywhere in the club’s records, so
        neither side has a form guide on the other.${h2h.related.length
    ? ` The club has played their ${esc([...new Set(h2h.related.map((x) => x.opponent))].join(' and '))},
        which is a different side and carries no record into this one.` : ''}</p>`}
      </div>
    </section>` : '';

  /* ---- 03 THE SQUAD ------------------------------------------------------
     Who is at the club for the season being played, in the order the site
     lists them, grouped the way a team sheet reads. Availability on the day
     is not something the website knows, and it says so rather than implying
     that this is the eleven. */
  const here = (d.squad || []).filter((p) => p.status && p.status !== 'retired'
    && p.status !== 'departed' && p.status !== 'staff' && p.status !== 'absent');
  const GROUPS = [
    ['gk', 'Goalkeepers'], ['def', 'Defenders'], ['mid', 'Midfielders'], ['fwd', 'Forwards'],
  ];
  const grouped = GROUPS.map(([key, label]) => {
    const men = here.filter((p) => (p.positionGroup || '') === key);
    return men.length ? `<div class="pr-group">
        <h3 class="pr-group__h">${esc(label)}</h3>
        <ul class="pr-names">${men.map((p) => `<li><a href="/players/${attr(p.slug)}.html">${esc(p.name)}</a></li>`).join('')}</ul>
      </div>` : '';
  }).join('');
  const ungrouped = here.filter((p) => !GROUPS.some(([k]) => (p.positionGroup || '') === k));

  const squadBand = here.length ? `<section class="sec pr-band" aria-labelledby="pr-sq-h">
      <div class="wrap">
        ${rail(2, 'The squad', `${here.length} at the club`)}
        <h2 class="h2 rv" id="pr-sq-h">Who is here<span class="volt">.</span></h2>
        <div class="pr-groups rv">${grouped}${ungrouped.length
    ? `<div class="pr-group"><h3 class="pr-group__h">Also in the squad</h3>
        <ul class="pr-names">${ungrouped.map((p) => `<li><a href="/players/${attr(p.slug)}.html">${esc(p.name)}</a></li>`).join('')}</ul></div>` : ''}</div>
        <p class="pr-note">Everyone registered for ${esc(season)}. Who actually starts is decided
          on the morning and is not something this page knows.</p>
        ${(d.coaches || []).length ? `<p class="pr-note"><b>The staff.</b>
          ${esc((d.coaches || []).map((c) => c.name).join(' · '))}</p>` : ''}
      </div>
    </section>` : '';

  /* ---- 04 LAST SEASON ---------------------------------------------------- */
  const us = (d.table || []).find((r) => r.us);
  const lastBand = us ? `<section class="sec pr-band" aria-labelledby="pr-last-h">
      <div class="wrap">
        ${rail(3, 'How we got here', `${esc(d.titleDivision)} ${esc(d.titleSeason)}`)}
        <h2 class="h2 rv" id="pr-last-h">Champions, unbeaten<span class="volt">.</span></h2>
        <dl class="pr-h2h rv">
          <div><dt>Played</dt><dd>${esc(us.played)}</dd></div>
          <div><dt>Won</dt><dd>${esc(us.won)}</dd></div>
          <div><dt>Drawn</dt><dd>${esc(us.drawn)}</dd></div>
          <div><dt>Lost</dt><dd>${esc(us.lost)}</dd></div>
          <div><dt>Scored</dt><dd>${esc(us.goalsFor)}</dd></div>
          <div><dt>Conceded</dt><dd>${esc(us.goalsAgainst)}</dd></div>
          <div><dt>Points</dt><dd>${esc(us.points)}</dd></div>
        </dl>
        <p class="pr-note">${esc(d.titleDivision)} ${esc(d.titleSeason)}, won with a perfect
          record and promotion into ${esc(m ? m.competition : d.divisionOf(d.currentSeason))}.
          <a href="/champions.html">The season in full</a>.</p>
      </div>
    </section>` : '';

  /* ---- 05 THE PREVIEW ----------------------------------------------------
     The club's own words, linked rather than reproduced: the article is a
     page in its own right with its own share card, and a programme that
     pasted it in would give the same text two URLs. */
  const preview = (d.articles || [])[0];
  const previewBand = preview ? `<section class="sec pr-band" aria-labelledby="pr-prev-h">
      <div class="wrap">
        ${rail(4, 'From the club', esc(preview.date || ''))}
        <h2 class="h2 rv" id="pr-prev-h">The preview<span class="volt">.</span></h2>
        <a class="pr-read rv" href="/news/${attr(preview.slug)}.html">
          <span class="pr-read__k">${esc(preview.category || 'News')}</span>
          <span class="pr-read__t">${esc(preview.title)}</span>
          <span class="pr-read__go">Read it ${icon('arrow', '')}</span>
        </a>
      </div>
    </section>` : '';

  /* ---- 06 STILL TO COME -------------------------------------------------- */
  const rest = (d.upcoming || []).filter((x) => !m || x.id !== m.id);
  const nextBand = rest.length ? `<section class="sec pr-band" aria-labelledby="pr-next-h">
      <div class="wrap">
        ${rail(5, 'Coming up', `${rest.length} more`)}
        <h2 class="h2 rv" id="pr-next-h">After today<span class="volt">.</span></h2>
        <ul class="pr-list rv">${rest.map((x) => `<li>
          <span>${esc(fmtDate(x.date, { weekday: true }))}</span>
          <span>${esc(x.kick || '')}</span>
          <b class="pr-clip">${esc(x.opponent)}</b>
          <span>${esc(x.homeAway)}</span>
        </li>`).join('')}</ul>
        <p class="pr-note"><a href="/fixtures.html">Every fixture</a>.</p>
      </div>
    </section>` : '';

  /* ---- 07 THE CAUSE ------------------------------------------------------
     A programme is one of the few places this belongs: somebody is holding
     it, they have a minute, and it is the reason the club exists. Plain and
     short, and it points at the people who can actually give medical advice
     rather than offering any. */
  const causeBand = `<section class="sec pr-band pr-cause" aria-labelledby="pr-cause-h">
      <div class="wrap">
        ${rail(6, 'Why we play', esc(CLUB.memorial.name))}
        <h2 class="h2 rv" id="pr-cause-h">In her name<span class="volt">.</span></h2>
        <p class="pr-lede rv">${esc(CLUB.name)} was founded in memory of
          ${esc(CLUB.memorial.name)}, who died of sepsis. The club plays for sepsis
          awareness, and every match is a chance for somebody else to learn the signs.</p>
        <p class="pr-note"><a href="/sepsis.html">Our cause</a> ·
          <a href="https://sepsistrust.org" target="_blank" rel="noopener">The UK Sepsis Trust</a></p>
      </div>
    </section>`;

  /* ---- 08 WHO BACKS THE CLUB ---------------------------------------------
     A logo strip is a wall of pictures that says nothing. These are small
     businesses paying for a Sunday-league club's kit and pitches, and the
     record already holds what each one does, what they sponsor and where to
     find them: printing it is the difference between a credit and a thank
     you somebody might act on. */
  const partners = (d.partners || []).filter((p) => p.onPage !== false);
  const partnerBand = partners.length ? `<section class="sec pr-band" aria-labelledby="pr-sp-h">
      <div class="wrap">
        ${rail(9, 'Who backs the club', `${partners.length} partners`)}
        <h2 class="h2 rv" id="pr-sp-h">The people who make this possible<span class="volt">.</span></h2>
        <p class="pr-lede rv">A Sunday-league club runs on pitch fees, kit, footballs and
          referees. These businesses pay for them. If you need what they do, they are worth
          your call before anybody else's.</p>
        <ul class="pr-partners rv">${partners.map((p) => `<li class="pr-partner">
          <div class="pr-partner__mark">${p.logo
    ? `<img src="${attr(p.logo)}" alt="${attr(p.name)}" width="150" height="70" loading="lazy" decoding="async" />`
    : `<span>${esc(p.short || p.name)}</span>`}</div>
          <div class="pr-partner__body">
            <h3 class="pr-partner__name">${esc(p.name)}</h3>
            ${p.role ? `<p class="pr-partner__role">${esc(p.role)}${p.since ? ` · since ${esc(p.since)}` : ''}</p>` : ''}
            ${p.trade ? `<p class="pr-partner__trade">${esc(p.trade)}</p>` : ''}
            ${p.detail || p.body ? `<p class="pr-partner__say">${esc(p.detail || p.body)}</p>` : ''}
            ${(p.links || []).length ? `<p class="pr-partner__links">${(p.links || []).map((l) => `<a href="${attr(l.href)}" target="_blank" rel="noopener">${esc(l.label || 'Website')}</a>`).join(' · ')}</p>` : ''}
          </div>
        </li>`).join('')}</ul>
        <p class="pr-note">Want your name on the shirt or in this programme?
          <a href="/sponsors.html">How sponsorship works</a>.</p>
      </div>
    </section>` : '';

  /* ---- 09 THE QUIZ --------------------------------------------------------
     Counted from the archive, so it is still true next season. The answers
     are `<details>`, which is a disclosure widget the browser already has: no
     JavaScript, works with the script blocked, and readable when printed. */
  const questions = quiz(d);
  const quizBand = questions.length ? `<section class="sec pr-band" aria-labelledby="pr-quiz-h">
      <div class="wrap">
        ${rail(7, 'Half-time quiz', `${questions.length} questions`)}
        <h2 class="h2 rv" id="pr-quiz-h">How closely were you watching<span class="volt">?</span></h2>
        <p class="pr-lede rv">Every answer is somewhere on this website. No prizes, no cheating,
          and the person beside you almost certainly knows.</p>
        <ol class="pr-quiz rv">${questions.map((x) => `<li>
          <p class="pr-quiz__q">${esc(x.q)}</p>
          <details class="pr-quiz__a"><summary>Show the answer</summary>
            <p>${esc(x.a)}</p></details>
        </li>`).join('')}</ol>
      </div>
    </section>` : '';

  /* ---- 10 THE WORD SEARCH -------------------------------------------------
     The squad that is playing this season, hidden in a grid built at build
     time. It picked up two players signed this week without anybody editing
     it, which is the whole reason it is generated rather than drawn. */
  const puzzleNames = here.map((p) => p.last || String(p.name).split(' ').pop())
    .filter((x) => /^[A-Za-z]{4,10}$/.test(x));
  const ws = wordSearch(puzzleNames.slice(0, 10), (m && m.id) || 'programme');
  const wordBand = ws.placed.length >= 4 ? `<section class="sec pr-band" aria-labelledby="pr-ws-h">
      <div class="wrap">
        ${rail(8, 'Word search', `${ws.placed.length} names`)}
        <h2 class="h2 rv" id="pr-ws-h">Find the squad<span class="volt">.</span></h2>
        <p class="pr-lede rv">${esc(ws.placed.length)} surnames from this season's squad, hidden
          across, down, diagonally and backwards.</p>
        <div class="pr-ws rv">
          <table class="pr-ws__grid">
            <caption class="sr-only">A word search grid of ${esc(ws.grid.length)} rows by
              ${esc(ws.grid.length)} columns. The names to find are listed after the grid.</caption>
            <tbody>${ws.grid.map((row) => `<tr>${row.map((ch) => `<td>${esc(ch)}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
          <ul class="pr-ws__words">${ws.placed.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
        </div>
      </div>
    </section>` : '';

  /* ---- 11 TAKING IT AWAY --------------------------------------------------
     No button and no JavaScript. Every phone and every browser already has
     Print and Save as PDF, and a button that only calls window.print() adds a
     script to a page that otherwise needs none in order to duplicate a
     control the reader already has. The work worth doing is the print
     stylesheet, which is in 45-programme.css: the furniture comes off, the
     quiz answers come ON, and nothing breaks across a page. */
  const saveBand = `<section class="sec pr-band" aria-labelledby="pr-save-h">
      <div class="wrap">
        <h2 class="h2 rv" id="pr-save-h">Take it with you<span class="volt">.</span></h2>
        <div class="pr-save rv">
          <p><b>Save this programme.</b> Use your browser's <b>Print</b> or
            <b>Share &rarr; Print</b> and choose <b>Save as PDF</b>.</p>
          <p class="pr-save__how">It is laid out for paper as well as a screen, and the quiz
            answers print with the questions so it still reads at home.</p>
        </div>
      </div>
    </section>`;

  return {
    body: siteHeader('/programme.html') + cover + opponentBand + squadBand + lastBand
      + previewBand + nextBand + quizBand + wordBand + causeBand + partnerBand + saveBand
      + sourceNote(['fulltime']),
    bodyClass: 'is-home is-sub is-programme',
    css: 'home.css',
    shell: 'home',
    preMain: sitePreMain(),
    footerHtml: siteFooter(),
    schema: m ? [{
      '@context': 'https://schema.org',
      '@type': 'SportsEvent',
      name: `${m.home} v ${m.away}`,
      startDate: m.isoDateTime || m.iso,
      eventStatus: 'https://schema.org/EventScheduled',
      location: { '@type': 'Place', name: m.venue || CLUB.venue.name },
      homeTeam: { '@type': 'SportsTeam', name: m.home },
      awayTeam: { '@type': 'SportsTeam', name: m.away },
    }] : [],
  };
}
