/* ==========================================================================
   AWARDS  (/awards.html, "Awards" under The Club)

   Recognition for the 25/26 season: the defensive record, Player of the
   Month, Man of the Match, the end of season awards and the captaincy.

   Everything countable is derived. The Man of the Match leaderboard is
   counted from the match records rather than stored, so it cannot drift from
   the individual match pages, and the goals-against comparison is read
   straight off the published League Ten table.

   One honest limitation is stated on the page rather than hidden: seven of
   the thirty-three matches carry no Man of the Match in the record, so the
   list says how many it is drawn from.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc, attr } from '../lib/html.mjs';
import { CLUB } from '../lib/club.mjs';
import { seasonViews, defaultView, seasonBar, seasonPanels, matchNote } from '../lib/seasons.mjs';
import { teamSummary, playerStats, leaderboard, longestRun, fmtDate, parseDate } from '../lib/stats.mjs';
import { siteFooter, sitePreMain, siteHeader, auraFor, oppBadge } from './home.mjs';

const STAR = '/assets/badge/sue-angels-badge-star.webp';
const ARROW = '<span aria-hidden="true">→</span>';
const AVATAR = '/assets/players/avatar.svg';

const shortClub = (name) => String(name || '')
  .replace(/^Sue.s Angels FC$/, "Sue's Angels")
  .replace(/\s+FC 2\.0$/, '')
  .replace(/\s+FC$/, '');

/* Squad photography is filed by shirt number. A missing file falls back to
   the neutral avatar rather than to a stand-in face. */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const shotFor = (num) => {
  if (num === undefined || num === null || num === '') return AVATAR;
  try {
    return fs.existsSync(path.join(ROOT, 'assets', 'players', `${num}.webp`))
      ? `/assets/players/${num}.webp` : AVATAR;
  } catch { return AVATAR; }
};

const rail = (n, label, ref) => `<div class="xrail" aria-hidden="true">
      <span class="xrail__l"><span class="xrail__n">${esc(String(n).padStart(2, '0'))}</span><span class="xrail__t">${esc(label)}</span></span>
      <span class="xrail__r">${esc(ref)}</span>
    </div>`;

/* Citations are written by the club as plain text with blank-line breaks. */
const paras = (text) => String(text || '')
  .split(/\n{2,}/)
  .map((p) => p.trim())
  .filter(Boolean)
  .map((p) => `<p>${esc(p)}</p>`)
  .join('\n              ');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/* A season label spans two calendar years, so a month name alone is
   ambiguous. August onwards belongs to the first year, January onwards to
   the second. */
const yearForMonth = (monthIndex, season) => {
  const parts = String(season || '').split('/').map((s) => 2000 + Number(s));
  if (parts.length !== 2 || parts.some(Number.isNaN)) return null;
  return monthIndex >= 7 ? parts[0] : parts[1];
};

const spell = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen', 'twenty'];
const words = (n) => (spell[n] ? spell[n] : String(n));
const Words = (n) => { const w = words(n); return w.charAt(0).toUpperCase() + w.slice(1); };

/* A handful of squad records still carry the raw position code rather than a
   written-out position. Reading "RAM" mid-sentence is worse than reading
   nothing, so the three that remain are expanded here. */
const POS_LABEL = {
  RAM: 'Right attacking midfield',
  LAM: 'Left attacking midfield',
  RDM: 'Right defensive midfield',
};
const readablePos = (p) => POS_LABEL[p] || p || '';

export function awards(d) {
  const VIEWS = seasonViews(d);
  const DEFAULT = defaultView(VIEWS);
  const squad = d.squad || [];
  const players = d.players || [];
  const byNum = new Map(squad.map((p) => [p.num, p]));
  const nameOf = (num) => (byNum.get(num) || {}).name || `No. ${num}`;
  const posOf = (num) => readablePos((byNum.get(num) || {}).position);

  const ordered = d.played.slice().sort((a, b) => (b.iso || '').localeCompare(a.iso || ''));
  const leagueGames = d.played.filter((m) => m.competition === CLUB.division);
  const league = teamSummary(leagueGames);

  const recognition = d.recognition || [];
  /* The unfiltered list. bodyFor() scopes it to whichever season is being
     looked at; the hero counts across all of them, because a tally in a page
     header is a claim about the club rather than about one year. */
  const ALL_RECOGNITION = recognition;
  const potm = recognition.filter((r) => r.type === 'potm');
  const seasonAwards = recognition.filter((r) => r.type === 'season_award');
  const leadership = recognition.find((r) => r.type === 'leadership');
  const captainRecord = recognition.find((r) => r.type === 'club_record' && r.recordKey === 'first_club_captain');

  /* ---- Man of the Match, counted from the records ---- */
  /* Hero-only: the page header counts across the club, not one season. */
  const motmTop = leaderboard(players, 'motm', 1)[0];
  const motmMatches = ordered.filter((m) => m.detail && m.detail.motm !== null && m.detail.motm !== undefined);

  /* ---- The defensive record ---- */
  const table = d.table || [];
  const heroRow = table.find((r) => r.us);
  const gaSorted = table.slice().sort((a, b) => a.goalsAgainst - b.goalsAgainst);
  const nextBest = gaSorted.find((r) => !r.us);
  const gaMax = gaSorted.length ? gaSorted[gaSorted.length - 1].goalsAgainst : 0;
  const gaGap = heroRow && nextBest ? nextBest.goalsAgainst - heroRow.goalsAgainst : null;
  const csRun = longestRun(leagueGames, (m) => m.theirGoals === 0, { goalRecordOnly: true });
  const keeper = seasonAwards.find((a) => /defensive/i.test(a.title));

  /* ================= HERO ================= */
  const hero = `<section class="aw-hero" aria-labelledby="aw-h">
      <div class="wrap aw-hero__grid">
        <div>
          <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> Recognition ·
            <span data-aw-season>${esc(VIEWS[DEFAULT].label)}</span></p>
          <h1 class="aw-hero__title" id="aw-h">Awards &amp; honours<span class="volt">.</span></h1>
          <!-- The season follows the tab. It was written in twice as a fixed
               claim, sitting above a filter that can show any of them. -->
          <p class="aw-hero__lede">A title is won by a squad, but it is decided in moments by individuals.
            These are the players the club picked out across
            <span data-aw-season>${esc(VIEWS[DEFAULT].label)}</span>, month by month,
            match by match, and on the night it was all counted up.</p>
          <div class="aw-hero__btns">
            <a class="btn btn--volt" href="#season">The season awards ${ARROW}</a>
            <a class="btn btn--ghost" href="#motm">Man of the Match</a>
          </div>
        </div>

        <div class="aw-tally glassbox">
          <img class="aw-tally__crest" src="${STAR}" alt="${attr(CLUB.name)} crest"
               width="150" height="186" decoding="async" />
          <dl class="aw-tally__list" aria-label="Awards given"
              data-aw-tally${VIEWS.map((v) => {
    const r = (d.recognition || []).filter((x) => v.key === 'all' || String(x.season || '') === v.key);
    const mm = v.matches.filter((m) => m.detail && m.detail.motm !== null && m.detail.motm !== undefined);
    return ` data-t-${v.id}="${attr([r.filter((x) => x.type === 'potm').length,
    r.filter((x) => x.type === 'season_award').length, mm.length].join(','))}"`;
  }).join('')}>
            <div><dt>Player of the Month</dt><dd>${esc((d.recognition || []).filter((x) => x.type === 'potm' && (VIEWS[DEFAULT].key === 'all' || String(x.season || '') === VIEWS[DEFAULT].key)).length)}</dd></div>
            <div><dt>End of season awards</dt><dd>${esc((d.recognition || []).filter((x) => x.type === 'season_award' && (VIEWS[DEFAULT].key === 'all' || String(x.season || '') === VIEWS[DEFAULT].key)).length)}</dd></div>
            <div><dt>Man of the Match</dt><dd>${esc(VIEWS[DEFAULT].matches.filter((m) => m.detail && m.detail.motm !== null && m.detail.motm !== undefined).length)}</dd></div>
          </dl>
        </div>
      </div>
    </section>`;

  /* EVERY AWARD BELONGS TO A SEASON, and this page showed all of them at
     once under a heading naming one. Recognition records carry their own
     `season`, and a Player of the Month is worked out from that season's
     matches, so both scope cleanly. `bodyFor(view)` builds the bands from one
     season's evidence and the shared switcher shows the matching panel.

     The hero and the closing call to action stay outside it: neither is a
     claim about a particular season. See src/lib/seasons.mjs. */
  const bodyFor = (view) => {
  const scope = view.matches;
  const seasonLabel = view.key === 'all' ? 'every season' : view.label;
  const inView = (r) => view.key === 'all' || String(r.season || '') === view.key;
  const potm = ALL_RECOGNITION.filter((r) => r.type === 'potm').filter(inView);
  const seasonAwards = ALL_RECOGNITION.filter((r) => r.type === 'season_award').filter(inView);

  /* Worked out from THIS view's matches. Both of these were derived from every
     match the club has played, so the 26/27 tab printed a Man of the Match
     board and a defensive record for a season with no results in it. */
  const ordered = scope.slice().sort((a, b) => (b.iso || '').localeCompare(a.iso || ''));
  const motmMatches = ordered.filter((m) => m.detail
    && m.detail.motm !== null && m.detail.motm !== undefined);
  const motmTally = new Map();
  motmMatches.forEach((m) => {
    const n = m.detail.motm;
    motmTally.set(n, (motmTally.get(n) || 0) + 1);
  });
  const motmBoard = [...motmTally.entries()]
    .map(([num, motm]) => ({ num, motm, name: nameOf(num) }))
    .sort((a, b) => b.motm - a.motm || a.name.localeCompare(b.name))
    .slice(0, 8);
  /* The defensive record is a claim about a completed league season, so it
     is only made where one has been played. */
  const ourRow = scope.length ? table.find((r) => r.us) : null;

  /* ================= 01 THE DEFENSIVE RECORD =================
     The club's headline claim is that no side in League Ten has conceded
     fewer. The table cannot verify every past season, so the page states the
     record and then shows the one thing it can prove: how the division
     compares this season. */
  const gaBand = ourRow ? `<section class="sec aw-def" id="defence" aria-labelledby="aw-def-h">
      <div class="wrap">
        ${rail(1, 'The record of the season', `${CLUB.division} · ${seasonLabel}`)}
        <h2 class="h2 rv" id="aw-def-h">The best defensive record in
          <span class="volt">League Ten history.</span></h2>
        <div class="aw-def__grid rv">
          <div class="aw-def__lede">
            <p class="aw-def__hero"><b>${esc(ourRow.goalsAgainst)}</b><span>goals conceded in ${esc(league.played)} league games</span></p>
            <p>No side has gone through a ${esc(CLUB.division)} season conceding fewer. ${gaGap !== null
              ? `${esc(Words(gaGap))} fewer than the next best defence in the division, and less than a goal a game across the whole campaign.`
              : 'Less than a goal a game across the whole campaign.'}</p>
            <ul class="aw-def__facts">
              <li><b>${esc(league.concededPerGame)}</b><span>Conceded a game</span></li>
              <li><b>${esc(league.cleanSheets)}</b><span>League clean sheets</span></li>
              <li><b>${esc(csRun)}</b><span>Longest shut-out run</span></li>
            </ul>
            ${keeper ? `<p class="aw-def__note">${esc(nameOf(keeper.playerId))} took the ${esc(keeper.title)}
              for it, though the number belongs to a back line that defended as one all season.</p>` : ''}
          </div>

          <figure class="aw-ga">
            <figcaption class="aw-ga__cap">Goals conceded · ${esc(CLUB.division)} ${esc(d.currentSeason)}</figcaption>
            <ol class="aw-ga__list">
              ${gaSorted.map((r, i) => `<li class="aw-ga__row${r.us ? ' is-us' : ''}" style="--i:${i}">
                <span class="aw-ga__club">${esc(shortClub(r.club))}</span>
                <span class="aw-ga__track" aria-hidden="true"><i style="--w:${gaMax ? Math.round((r.goalsAgainst / gaMax) * 1000) / 10 : 0}%"></i></span>
                <span class="aw-ga__v">${esc(r.goalsAgainst)}</span>
              </li>`).join('\n              ')}
            </ol>
          </figure>
        </div>
      </div>
    </section>` : '';

  /* ================= 02 PLAYER OF THE MONTH =================
     Every panel ships visible and the tabs are ordinary jump links, so a
     blocked script leaves four readable citations rather than a blank band.
     The script promotes the links to a tablist and hides the rest. */
  const potmCards = potm.map((r, i) => {
    const num = r.playerId;
    const mi = MONTHS.indexOf(r.month);
    const yr = yearForMonth(mi, r.season || (view.key === 'all' ? d.currentSeason : view.key));
    const monthGames = mi < 0 ? [] : scope.filter((m) => {
      const dt = parseDate(m.date);
      return dt && dt.getUTCMonth() === mi && (yr === null || dt.getUTCFullYear() === yr);
    });
    /* Month figures are counted off that month's matches only, using the same
       engine as every other page. */
    const inMonth = playerStats(monthGames, squad).find((p) => p.num === num) || {};
    const facts = [
      { v: inMonth.apps, k: 'Games' },
      { v: inMonth.goals, k: 'Goals' },
      { v: inMonth.assists, k: 'Assists' },
      { v: inMonth.cleanSheets, k: 'Clean sheets' },
    ].filter((f) => Number(f.v) > 0);

    /* A div, not an article: the script promotes this to role="tabpanel",
       which ARIA does not allow to override article's implicit role. */
    return `<div class="aw-potm__panel" id="potm-p-${i}" data-potm-panel="${i}">
            <div class="aw-potm__shot">
              <img src="${attr(shotFor(num))}" alt="${attr(nameOf(num))}"
                   width="360" height="540" loading="lazy" decoding="async" />
              <span class="aw-potm__ribbon">Player of the Month</span>
            </div>
            <div class="aw-potm__body">
              <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> ${esc(r.month)} · ${esc(r.season || seasonLabel)}</p>
              <h3 class="aw-potm__name">${esc(nameOf(num))}</h3>
              ${posOf(num) ? `<p class="aw-potm__pos">${esc(posOf(num))}</p>` : ''}
              ${paras(r.reason)}
              ${facts.length ? `<ul class="aw-potm__facts">
                ${facts.map((f) => `<li><b>${esc(f.v)}</b><span>${esc(f.k)}</span></li>`).join('\n                ')}
              </ul>
              <p class="aw-potm__scope">Counted from the ${esc(monthGames.length)} ${monthGames.length === 1 ? 'match' : 'matches'} played in ${esc(r.month)}.</p>` : ''}
            </div>
          </div>`;
  }).join('\n          ');

  const potmBand = potm.length ? `<section class="sec aw-potm" id="potm" aria-labelledby="aw-potm-h">
      <div class="wrap">
        ${rail(2, 'Month by month', `${potm.length} awarded`)}
        <h2 class="h2 rv" id="aw-potm-h">Player of the <span class="volt">Month.</span></h2>
        <div class="aw-potm__tabs rv" data-potm>
          ${potm.map((r, i) => `<a class="aw-potm__tab" href="#potm-p-${i}" data-potm-tab="${i}">
            <b>${esc(r.month)}</b><i>${esc(nameOf(r.playerId).split(' ')[0])}</i>
          </a>`).join('\n          ')}
        </div>
        <div class="aw-potm__panels rv">
          ${potmCards}
        </div>
      </div>
    </section>` : '';

  /* ================= 03 MAN OF THE MATCH ================= */
  const motmBand = motmBoard.length ? `<section class="sec aw-motm" id="motm" aria-labelledby="aw-motm-h">
      <div class="wrap">
        ${rail(3, 'Chosen on the day', `${motmMatches.length} awarded`)}
        <h2 class="h2 rv" id="aw-motm-h">Most Man of the <span class="volt">Match.</span></h2>

        ${motmTop ? `<div class="aw-top rv">
          <div class="aw-top__shot">
            <img src="${attr(shotFor(motmTop.num))}" alt="${attr(motmTop.name)}"
                 width="300" height="450" loading="lazy" decoding="async" />
          </div>
          <div class="aw-top__body">
            <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> Most awards · ${esc(d.currentSeason)}</p>
            <p class="aw-top__name">${esc(motmTop.name)}</p>
            <p class="aw-top__count"><b>${esc(motmTop.motm)}</b><span>Man of the Match awards</span></p>
            <p class="aw-top__sub">${esc(readablePos(motmTop.position))}${motmTop.position ? ' · ' : ''}${esc(motmTop.goals)} goals and ${esc(motmTop.assists)} assists
              in ${esc(motmTop.apps)} appearances. No one else was picked out more than
              ${esc(words(motmBoard[1] ? motmBoard[1].motm : 0))} times.</p>
          </div>
        </div>` : ''}

        <ol class="aw-board rv">
          ${motmBoard.map((p, i) => `<li class="aw-board__row${i === 0 ? ' is-top' : ''}" style="--i:${i}">
            <span class="aw-board__pos">${esc(i + 1)}</span>
            <span class="aw-board__face"><img src="${attr(shotFor(p.num))}" alt="" width="34" height="34" loading="lazy" decoding="async" /></span>
            <span class="aw-board__name">${esc(p.name)}</span>
            <span class="aw-board__track" aria-hidden="true"><i style="--w:${motmTop ? Math.round((p.motm / motmTop.motm) * 1000) / 10 : 0}%"></i></span>
            <span class="aw-board__n"><b>${esc(p.motm)}</b></span>
          </li>`).join('\n          ')}
        </ol>

        <h3 class="aw-motm__sub rv">Every award, match by match</h3>
        <ol class="aw-mlist rv">
          ${motmMatches.map((m) => `<li class="aw-ml">
            <span class="aw-ml__badge">${oppBadge(m.opponent, d.badges, 26, 26)}</span>
            <span class="aw-ml__club">${esc(shortClub(m.opponent))}</span>
            <span class="aw-ml__score">${m.countsGoals ? `${esc(m.ourGoals)}-${esc(m.theirGoals)}` : 'W/O'}</span>
            <span class="aw-ml__date">${esc(fmtDate(m.date))}</span>
            <span class="aw-ml__face"><img src="${attr(shotFor(m.detail.motm))}" alt="" width="28" height="28" loading="lazy" decoding="async" /></span>
            <span class="aw-ml__who">${esc(nameOf(m.detail.motm))}</span>
          </li>`).join('\n          ')}
        </ol>
        <p class="aw-motm__note">Drawn from the ${esc(motmMatches.length)} matches of ${esc(scope.length)} that carry a
          Man of the Match in the record.</p>
      </div>
    </section>` : '';

  /* ================= 04 END OF SEASON AWARDS ================= */
  const seasonBand = seasonAwards.length ? `<section class="sec aw-season" id="season" aria-labelledby="aw-season-h">
      <div class="wrap">
        ${rail(4, `${d.currentSeason} awards night`, `${seasonAwards.length} winners`)}
        <h2 class="h2 rv" id="aw-season-h">End of season <span class="volt">awards.</span></h2>
        <ul class="aw-cards rv">
          ${seasonAwards.map((a, i) => `<li class="aw-card" style="--i:${i}">
            <div class="aw-card__shot">
              <img src="${attr(shotFor(a.playerId))}" alt="${attr(nameOf(a.playerId))}"
                   width="320" height="320" loading="lazy" decoding="async" />
            </div>
            <div class="aw-card__body">
              <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> ${esc(a.title)}</p>
              <p class="aw-card__name">${esc(nameOf(a.playerId))}</p>
              <p class="aw-card__pos">${esc(posOf(a.playerId))}</p>
              <p class="aw-card__cite">${esc(a.description)}</p>
            </div>
          </li>`).join('\n          ')}
        </ul>
      </div>
    </section>` : '';

  /* ================= 05 LEADERSHIP ================= */
  const caps = leadership ? [
    { k: 'Club captain', num: leadership.clubCaptainPlayerId, name: leadership.clubCaptainName },
    { k: 'Vice-captain', num: leadership.viceCaptainPlayerId, name: leadership.viceCaptainName },
    { k: 'Third-choice captain', num: leadership.thirdChoiceCaptainPlayerId, name: leadership.thirdChoiceCaptainName },
  ].filter((c) => c.num !== undefined && c.num !== null) : [];

  const capBand = caps.length ? `<section class="sec aw-caps" aria-labelledby="aw-caps-h">
      <div class="wrap">
        ${rail(5, 'Leading the side', d.currentSeason)}
        <h2 class="h2 rv" id="aw-caps-h">The <span class="volt">captains.</span></h2>
        <ul class="aw-caps__grid rv">
          ${caps.map((c, i) => `<li class="aw-cap glassbox" style="--i:${i}">
            <span class="aw-cap__face"><img src="${attr(shotFor(c.num))}" alt="" width="64" height="64" loading="lazy" decoding="async" /></span>
            <p class="aw-cap__k">${esc(c.k)}</p>
            <p class="aw-cap__name">${esc(c.name || nameOf(c.num))}</p>
            <p class="aw-cap__pos">${esc(posOf(c.num))}</p>
          </li>`).join('\n          ')}
        </ul>
        ${captainRecord ? `<p class="aw-caps__note">${esc(captainRecord.description)}</p>` : ''}
      </div>
    </section>` : '';

  /* ================= CTA ================= */
  return { gaBand, potmBand, motmBand, seasonBand, capBand };
  };

  const ctaBand = `<section class="sec sec--cta aw-cta" aria-labelledby="aw-cta-h">
      <div class="wrap">
        <div class="cta2">
          <span class="cta2__glow" aria-hidden="true"></span>
          <img class="cta2__badge" src="${STAR}" alt="" width="500" height="620" loading="lazy" decoding="async" aria-hidden="true" />
          <div class="cta2__glass glassbox rv">
            <p class="eyebrow cta2__eyebrow">${esc(CLUB.nextDivision)} · Next season</p>
            <h2 class="h2" id="aw-cta-h">Win one of <span class="volt">these.</span></h2>
            <p class="cta2__sub">The awards above went to players who turned up every week and set the
              standard. There is room for more of them.</p>
            <div class="cta2__btns">
              <a class="btn btn--volt" href="/join.html">Play for the club ${ARROW}</a>
              <a class="btn btn--ghost" href="/champions.html">The title-winning season</a>
            </div>
          </div>
        </div>
      </div>
    </section>`;

  return {
    body: siteHeader('/awards.html') + hero
      + `<section class="sec aw-seasons"><div class="wrap">${seasonBar(VIEWS, DEFAULT, matchNote, { esc, attr })}</div></section>`
      + seasonPanels(VIEWS, DEFAULT, (v) => {
    const b = bodyFor(v);
    const out = b.gaBand + b.potmBand + b.motmBand + b.seasonBand + b.capBand;
    return out || `<section class="sec"><div class="wrap"><p class="aw-none">Nothing has been
        awarded for ${esc(v.label)} yet. Player of the Month, Man of the Match and the end of
        season awards appear here as the season is recorded in the control panel.</p></div></section>`;
  }, { attr })
      + ctaBand,
    bodyClass: 'is-home is-sub is-awards',
    css: 'home.css',
    shell: 'home',
    preMain: sitePreMain(auraFor('awards.html')),
    footerHtml: siteFooter(),
    schema: [{
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Awards · ${CLUB.name}`,
      breadcrumb: {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${CLUB.site}/` },
          { '@type': 'ListItem', position: 2, name: 'Awards', item: `${CLUB.site}/awards.html` },
        ],
      },
    }],
  };
}
