/* EVERY SEASON ON THIS PAGE IS THE TITLE SEASON. The page exists to tell
   the story of the one the club won, so it reads d.titleSeason and
   d.titleDivision throughout rather than 'the current season', which will
   be a different season from the first whistle of League Eight. */
/* ==========================================================================
   CHAMPIONS  (/champions.html, "Champions" under The Club)

   The club's one trophy, told properly. Every figure is derived: the points
   gap, the goal difference and the unbeaten run all come from the published
   table row and the match records, so this page cannot drift from the league
   page or the homepage.

   The final table is a real <table>. A ten-row standings grid is the textbook
   case for one: ten rows of seven comparable numbers is not a chart, and
   faking it with divs would cost the row and column semantics that make it
   readable with a screen reader.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc, attr, NAV } from '../lib/html.mjs';
import { CLUB } from '../lib/club.mjs';
import { teamSummary, fmtDate, homeAwaySplit, biggestWin, isLeague} from '../lib/stats.mjs';
import { siteFooter, sitePreMain, siteHeader, oppBadge } from './home.mjs';
import { sourceNote } from '../lib/blocks.mjs';

const STAR = '/assets/badge/sue-angels-badge-star.webp';
const ARROW = '<span aria-hidden="true">→</span>';

const shortClub = (name) => String(name || '')
  .replace(/^Sue.s Angels FC$/, "Sue's Angels")
  .replace(/\s+FC 2\.0$/, '')
  .replace(/\s+FC$/, '');

/* Squad photography is filed by shirt number. Only our own players have one,
   so an opposition scorer falls back to their club's badge rather than to a
   blank or a stand-in face. */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const hasShot = (num) => {
  if (num === undefined || num === null || num === '') return false;
  try { return fs.existsSync(path.join(ROOT, 'assets', 'players', `${num}.webp`)); } catch { return false; }
};

const rail = (n, label, ref) => `<div class="xrail" aria-hidden="true">
      <span class="xrail__l"><span class="xrail__n">${esc(String(n).padStart(2, '0'))}</span><span class="xrail__t">${esc(label)}</span></span>
      <span class="xrail__r">${esc(ref)}</span>
    </div>`;

export function champions(d) {
  const league = teamSummary(d.played.filter(isLeague));
  const ordered = d.played.slice().sort((a, b) => (a.iso || '').localeCompare(b.iso || ''));
  const leagueGames = ordered.filter(isLeague);

  const table = d.table || [];
  const ourRow = table.find((r) => r.us);
  const runnerUp = table.find((r) => !r.us && r.pos === 2) || table[1];
  /* The gap is the story of the season, so it is measured rather than
     asserted: second place is read from the same published table. */
  const clear = ourRow && runnerUp ? ourRow.points - runnerUp.points : null;
  const maxPoints = league.played * 3;

  const trophies = (d.recognition || []).filter((r) => r.type === 'trophy');
  const titleRec = trophies.find((t) => /champion/i.test(t.title));
  const promoRec = trophies.find((t) => /promot/i.test(t.title));

  const scorers = (d.leagueScorers || []).slice(0, 8).map((s) => {
    const p = (d.players || []).find((x) => x.name === s.name);
    return { ...s, shot: p && hasShot(p.num) ? `/assets/players/${p.num}.webp` : '' };
  });

  /* ================= HERO ================= */
  const hero = `<section class="ch-hero" aria-labelledby="ch-h">
      <div class="wrap ch-hero__grid">
        <div>
          <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> ${esc(d.titleDivision)} ${esc(d.titleSeason)}</p>
          <h1 class="ch-hero__title" id="ch-h">Champions<span class="volt">.</span></h1>
          <p class="ch-hero__lede">${esc(league.won)} games, ${esc(league.won)} wins. ${esc(CLUB.name)} took the
            ${esc(d.titleDivision)} title at the first attempt without losing a match, and go up to
            ${esc(d.divisionOf(d.nextSeason))} for ${esc(d.nextSeason)}.</p>
          <div class="ch-hero__btns">
            <a class="btn btn--volt" href="#table">The final table ${ARROW}</a>
            <a class="btn btn--ghost" href="#run">The unbeaten run</a>
          </div>
        </div>

        <div class="ch-cab glassbox">
          <img class="ch-cab__crest" src="${STAR}" alt="${attr(CLUB.name)} crest"
               width="150" height="186" decoding="async" />
          <ul class="ch-cab__list" aria-label="Honours">
            ${trophies.map((t) => `<li>
              <b>${esc(t.title)}</b>
              <span>${esc(t.season || d.titleSeason)}</span>
            </li>`).join('\n            ')}
          </ul>
        </div>
      </div>
    </section>`;

  /* ================= 01 THE TITLE IN NUMBERS ================= */
  const kpis = [
    { v: `${league.points}`, s: `of ${maxPoints}`, k: 'Points won' },
    { v: `${league.won}`, s: `of ${league.played}`, k: 'Games won' },
    { v: `+${league.goalsFor - league.goalsAgainst}`, k: 'Goal difference' },
    clear !== null ? { v: `${clear}`, k: 'Points clear of second' } : null,
  ].filter(Boolean);

  const numbersBand = `<section class="sec ch-nums" aria-labelledby="ch-nums-h">
      <div class="wrap">
        ${rail(1, 'The title in numbers', `P${league.played} W${league.won} D${league.drawn} L${league.lost}`)}
        <h2 class="h2 rv" id="ch-nums-h">A perfect <span class="volt">record.</span></h2>
        <ul class="ch-kpis rv">
          ${kpis.map((x, i) => `<li class="ch-kpi glassbox" style="--i:${i}">
            <b>${esc(x.v)}${x.s ? `<i>${esc(x.s)}</i>` : ''}</b>
            <span>${esc(x.k)}</span>
          </li>`).join('\n          ')}
        </ul>
      </div>
    </section>`;

  /* ================= 02 THE FINAL TABLE ================= */
  const tableBand = table.length ? `<section class="sec ch-table" id="table" aria-labelledby="ch-table-h">
      <div class="wrap">
        ${rail(2, 'The final table', `${esc(d.titleDivision)} ${esc(d.titleSeason)}`)}
        <h2 class="h2 rv" id="ch-table-h">How it finished<span class="volt">.</span></h2>
        <div class="ch-tablewrap rv">
          <table class="ch-tbl">
            <caption class="sr-only">${esc(d.titleDivision)} ${esc(d.titleSeason)} final standings</caption>
            <thead>
              <tr>
                <th scope="col" class="ch-tbl__pos">#</th>
                <th scope="col">Club</th>
                <th scope="col"><abbr title="Played">P</abbr></th>
                <th scope="col"><abbr title="Won">W</abbr></th>
                <th scope="col"><abbr title="Drawn">D</abbr></th>
                <th scope="col"><abbr title="Lost">L</abbr></th>
                <th scope="col"><abbr title="Goals for">GF</abbr></th>
                <th scope="col"><abbr title="Goals against">GA</abbr></th>
                <th scope="col"><abbr title="Goal difference">GD</abbr></th>
                <th scope="col"><abbr title="Points">Pts</abbr></th>
              </tr>
            </thead>
            <tbody>
              ${table.map((r) => `<tr${r.us ? ' class="is-us"' : ''}${r.pos <= (d.promotionSpots || 0) && !r.us ? ' data-up' : ''}>
                <td class="ch-tbl__pos">${esc(r.pos)}</td>
                <th scope="row" class="ch-tbl__club">
                  <span class="ch-tbl__badge">${oppBadge(r.club, d.badges, 22, 22)}</span>
                  ${esc(shortClub(r.club))}
                </th>
                <td>${esc(r.played)}</td>
                <td>${esc(r.won)}</td>
                <td>${esc(r.drawn)}</td>
                <td>${esc(r.lost)}</td>
                <td>${esc(r.goalsFor)}</td>
                <td>${esc(r.goalsAgainst)}</td>
                <td>${r.goalDifference > 0 ? '+' : ''}${esc(r.goalDifference)}</td>
                <td class="ch-tbl__pts">${esc(r.points)}</td>
              </tr>`).join('\n              ')}
            </tbody>
          </table>
        </div>
        ${d.promotionSpots ? `<p class="ch-table__note">Top ${esc(d.promotionSpots)} promoted to ${esc(d.divisionOf(d.nextSeason))}.</p>` : ''}
      </div>
    </section>` : '';

  /* ================= 03 THE UNBEATEN RUN =================
     Every league match in order, with the opponent's own badge. The scoreline
     is the point of each row, so it leads. */
  const runBand = `<section class="sec ch-run" id="run" aria-labelledby="ch-run-h">
      <div class="wrap">
        ${rail(3, 'The unbeaten run', `${esc(league.goalsFor)} scored · ${esc(league.goalsAgainst)} conceded`)}
        <h2 class="h2 rv" id="ch-run-h">Eighteen from <span class="volt">eighteen.</span></h2>
        <ol class="ch-run__list rv">
          ${leagueGames.map((m, i) => `<li class="ch-match">
            <span class="ch-match__n" aria-hidden="true">${esc(String(i + 1).padStart(2, '0'))}</span>
            <span class="ch-match__badge">${oppBadge(m.opponent, d.badges, 26, 26)}</span>
            <span class="ch-match__club">${esc(shortClub(m.opponent))}</span>
            <span class="ch-match__where">${m.weAreHome ? 'Home' : 'Away'}</span>
            <span class="ch-match__score">${m.countsGoals ? `${esc(m.ourGoals)}-${esc(m.theirGoals)}` : 'W/O'}</span>
            <span class="ch-match__date">${esc(fmtDate(m.date))}</span>
          </li>`).join('\n          ')}
        </ol>
      </div>
    </section>`;

  /* ================= 04 WHO WON IT ================= */
  const scorersBand = scorers.length ? `<section class="sec ch-scorers" aria-labelledby="ch-sc-h">
      <div class="wrap">
        ${rail(4, 'Who won it', `${esc(d.titleDivision)} scorers`)}
        <h2 class="h2 rv" id="ch-sc-h">The division's leading <span class="volt">scorers.</span></h2>
        <ol class="ch-sc__list rv">
          ${scorers.map((s) => `<li class="ch-sc${s.us ? ' is-us' : ''}">
            <span class="ch-sc__pos">${esc(s.pos)}</span>
            <span class="ch-sc__face">${s.shot
              ? `<img src="${attr(s.shot)}" alt="" width="34" height="34" loading="lazy" decoding="async" />`
              : oppBadge(s.club, d.badges, 24, 24, 'ch-sc__crest')}</span>
            <span class="ch-sc__name">${esc(s.name)}</span>
            <span class="ch-sc__club">${esc(shortClub(s.club))}</span>
            <span class="ch-sc__goals"><b>${esc(s.goals)}</b> goals</span>
          </li>`).join('\n          ')}
        </ol>
      </div>
    </section>` : '';

  /* ================= 05 HOME AND AWAY =================
     Perfect in both halves is a harder thing than perfect overall, so the two
     records are set side by side rather than folded into one total. */
  const split = homeAwaySplit(leagueGames);
  const bigLeague = biggestWin(leagueGames);
  const sides = [
    { k: 'At home', s: split.home },
    { k: 'Away', s: split.away },
  ].filter((x) => x.s && x.s.played);

  const splitBand = sides.length === 2 ? `<section class="sec ch-split" aria-labelledby="ch-split-h">
      <div class="wrap">
        ${rail(5, 'Home and away', `${esc(split.home.played)} + ${esc(split.away.played)}`)}
        <h2 class="h2 rv" id="ch-split-h">Won everywhere<span class="volt">.</span></h2>
        <ul class="ch-split__grid rv">
          ${sides.map((x) => `<li class="ch-side glassbox">
            <p class="ch-side__k">${esc(x.k)}</p>
            <p class="ch-side__rec"><b>${esc(x.s.won)}</b><span>from ${esc(x.s.played)}</span></p>
            <dl class="ch-side__facts">
              <div><dt>Scored</dt><dd>${esc(x.s.goalsFor)}</dd></div>
              <div><dt>Conceded</dt><dd>${esc(x.s.goalsAgainst)}</dd></div>
              <div><dt>A game</dt><dd>${esc(x.s.goalsPerGame)}</dd></div>
            </dl>
          </li>`).join('\n          ')}
        </ul>
        ${bigLeague ? `<p class="ch-split__note">Biggest league win:
          <b>${esc(bigLeague.ourGoals)}-${esc(bigLeague.theirGoals)}</b> v ${esc(shortClub(bigLeague.opponent))},
          ${esc(fmtDate(bigLeague.date, { long: true }))}.</p>` : ''}
      </div>
    </section>` : '';

  /* ================= 06 WHAT NEXT ================= */
  const nextBand = `<section class="sec ch-next" aria-labelledby="ch-next-h">
      <div class="wrap">
        ${rail(6, 'What happens now', `${esc(d.divisionOf(d.nextSeason))} · ${esc(d.nextSeason)}`)}
        <div class="ch-next__panel rv">
          <img class="ch-next__mark" src="${STAR}" alt="Sue’s Angels FC star" width="260" height="322" loading="lazy" decoding="async" aria-hidden="true" />
          <h2 class="h2" id="ch-next-h">Up to <span class="volt">${esc(d.divisionOf(d.nextSeason))}.</span></h2>
          <p>${promoRec ? esc(promoRec.description) : `Promotion sealed as champions, stepping up to ${d.divisionOf(d.nextSeason)}.`}</p>
          <p>${titleRec ? esc(titleRec.description) : ''}</p>
          <div class="ch-next__btns">
            <a class="btn btn--volt" href="/join.html">Play for the club ${ARROW}</a>
            <a class="btn btn--ghost" href="/about.html">Our story</a>
          </div>
        </div>
      </div>
    </section>`;

  /* ================= CTA ================= */
  const ctaBand = `<section class="sec sec--cta ch-cta" aria-labelledby="ch-cta-h">
      <div class="wrap">
        <div class="cta2">
          <span class="cta2__glow" aria-hidden="true"></span>
          <img class="cta2__badge" src="${STAR}" alt="Sue’s Angels FC star" width="500" height="620" loading="lazy" decoding="async" aria-hidden="true" />
          <div class="cta2__glass glassbox rv">
            <p class="eyebrow cta2__eyebrow">${esc(d.titleSeason)} · Champions</p>
            <h2 class="h2" id="ch-cta-h">Back the <span class="volt">champions.</span></h2>
            <p class="cta2__sub">A season like this is built by everyone around the club. Sponsors,
              volunteers and supporters all had a hand in it.</p>
            <div class="cta2__btns">
              <a class="btn btn--volt" href="/sponsors.html">Partner with us ${ARROW}</a>
              <a class="btn btn--ghost" href="/contact.html">Get in touch</a>
            </div>
          </div>
        </div>
      </div>
    </section>`;

  return {
    body: siteHeader('/champions.html') + hero + numbersBand + tableBand + runBand + sourceNote(['fulltime', 'surreyfa'])
      + scorersBand + splitBand + nextBand + ctaBand,
    bodyClass: 'is-home is-sub is-champs',
    css: 'home.css',
    shell: 'home',
    preMain: sitePreMain(),
    footerHtml: siteFooter(),
    schema: [{
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Champions · ${CLUB.name}`,
      breadcrumb: {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${CLUB.site}/` },
          { '@type': 'ListItem', position: 2, name: 'Champions', item: `${CLUB.site}/champions.html` },
        ],
      },
    }],
  };
}
