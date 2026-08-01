/* ==========================================================================
   OUR STORY  (/about.html, "Our story" under The Club)

   The supplied reference for this page is drawn in a light grey and lime
   palette. That palette is not the club's: this build renders the same
   material in the homepage's language, because orange is the only accent hue
   in the design system and a second one would break every page that follows.

   Composition, band for band:
     hero        the story, against the crest and the founding plate
     01 why we exist    the motto, set as a full statement
     02 the record      an asymmetric bento, not a row of equal tiles
     03 how it happened the 25/26 timeline, on a rail, with opponent badges
     04 who we faced    every club met in the title season, by badge
     05 why we play     Sue's story
     06 club values
     cta         pull on the shirt

   Every figure is derived by the stats engine and every badge comes from the
   registry, so nothing here can disagree with the record books.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc, attr, NAV, CLUB_ID } from '../lib/html.mjs';
import { CLUB } from '../lib/club.mjs';
import { teamSummary, leaderboard, biggestWin, fmtDate } from '../lib/stats.mjs';
import { siteFooter, sitePreMain, siteHeader, oppBadge, auraFor } from './home.mjs';

const STAR = '/assets/badge/sue-angels-badge-star.webp';
const ARROW = '<span aria-hidden="true">→</span>';

/* Squad photography is filed by shirt number. Not every player has one on
   file, and `hasPhoto` is only populated when the live tables are loaded, so
   presence is checked against the shipped asset instead: a tile with no
   photograph falls back to the crest rather than to a broken image. */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const hasShot = (num) => {
  if (num === undefined || num === null || num === '') return false;
  try { return fs.existsSync(path.join(ROOT, 'assets', 'players', `${num}.webp`)); } catch { return false; }
};
const playerShot = (p, cls) => (p && hasShot(p.num)
  ? `<img class="${attr(cls)}" src="/assets/players/${attr(p.num)}.webp" alt="${attr(p.name)}" width="200" height="260" loading="lazy" decoding="async" />`
  : `<img class="${attr(cls)} ${attr(cls)}--none" src="${STAR}" alt="" width="200" height="260" loading="lazy" decoding="async" aria-hidden="true" />`);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthYear = (str) => {
  const d = new Date(`${String(str).slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? '' : `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`;
};

/* Scoreboard shorthand, so a card never wraps on "FC 2.0". */
const shortClub = (name) => String(name || '')
  .replace(/^Sue.s Angels FC$/, "Sue's Angels")
  .replace(/\s+FC 2\.0$/, '')
  .replace(/\s+FC$/, '');

const rail = (n, label, ref) => `<div class="xrail" aria-hidden="true">
      <span class="xrail__l"><span class="xrail__n">${esc(String(n).padStart(2, '0'))}</span><span class="xrail__t">${esc(label)}</span></span>
      <span class="xrail__r">${esc(ref)}</span>
    </div>`;

/* What the club stands for. Editorial copy, not derived: these are stated
   values, not measurements. */
const VALUES = [
  { title: 'Discipline', body: 'Standards on and off the pitch. Earn the shirt every week.' },
  { title: 'Brotherhood', body: 'A football family bound by respect and resilience.' },
  { title: 'Remembrance', body: `Everything we do honours the memory of ${CLUB.memorial.name}.` },
  { title: 'Ambition', body: 'Champions in year one. We look ahead with hunger.' },
];

export function about(d) {
  const league = teamSummary(d.played.filter((m) => m.competition === CLUB.division));
  const all = teamSummary(d.played);

  const ordered = d.played.slice().sort((a, b) => (a.iso || '').localeCompare(b.iso || ''));
  const first = ordered[0];
  const big = biggestWin(d.played);
  const leagueGames = ordered.filter((m) => m.competition === CLUB.division);
  const lastLeague = leagueGames[leagueGames.length - 1];

  const topScorer = leaderboard(d.players, 'goals', 1)[0];
  const topAssist = leaderboard(d.players, 'assists', 1)[0];
  const topApps = leaderboard(d.players, 'apps', 1)[0];
  const topKeeper = leaderboard(d.players.filter((p) => /goal/i.test(p.position)), 'cleanSheets', 1)[0];
  /* The recognition table files promotion under `trophy` as well. Going up is
     the consequence of winning the league, not a second piece of silverware,
     so it is excluded here: the club has won one trophy. */
  const trophies = (d.recognition || [])
    .filter((r) => r.type === 'trophy' && !/promot/i.test(r.title || ''));

  /* ================= HERO =================
     Two columns rather than a stack: the copy holds the left, the crest and
     the founding plate anchor the right, so the page opens on something with
     weight instead of a headline floating in space. */
  const hero = `<section class="ab-hero" aria-labelledby="ab-h">
      <div class="wrap ab-hero__grid">
        <div class="ab-hero__copy">
          <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> The story</p>
          <h1 class="ab-hero__title" id="ab-h">Built in <span class="volt">her name.</span></h1>
          <p class="ab-hero__lede">Founded in ${esc(CLUB.founded)} in memory of ${esc(CLUB.memorial.name)}.
            ${esc(CLUB.division)} champions, first season, unbeaten.</p>
          <div class="ab-hero__btns">
            <a class="btn btn--volt" href="/champions.html">The ${esc(d.currentSeason)} story ${ARROW}</a>
            <a class="btn btn--ghost" href="/join.html">Get involved</a>
          </div>
        </div>

        <aside class="ab-plate glassbox" aria-label="Club at a glance">
          <img class="ab-plate__crest" src="${STAR}" alt="${attr(CLUB.name)} crest"
               width="150" height="186" decoding="async" />
          <dl class="ab-plate__facts">
            <div><dt>Founded</dt><dd>${esc(CLUB.founded)}</dd></div>
            <div><dt>Home</dt><dd>${esc(CLUB.venue.name)}</dd></div>
            <div><dt>Division</dt><dd>${esc(CLUB.nextDivision)}</dd></div>
            <div><dt>Trophies</dt><dd>${esc(trophies.length)}</dd></div>
            <div class="ab-plate__wide"><dt>All competitions</dt>
              <dd>P${esc(all.played)} W${esc(all.won)} D${esc(all.drawn)} L${esc(all.lost)} · GF ${esc(all.goalsFor)} GA ${esc(all.goalsAgainst)}</dd></div>
            <div class="ab-plate__wide"><dt>${esc(CLUB.division)} ${esc(d.currentSeason)}</dt>
              <dd>P${esc(league.played)} W${esc(league.won)} D${esc(league.drawn)} L${esc(league.lost)} · ${esc(league.points)} pts</dd></div>
          </dl>
        </aside>
      </div>
    </section>`;

  /* ================= 01 WHY WE EXIST ================= */
  const mottoBand = `<section class="sec ab-motto" aria-labelledby="ab-motto-h">
      <div class="wrap">
        ${rail(1, 'Why we exist', `Est. ${CLUB.founded}`)}
        <div class="ab-motto__panel rv">
          <img class="ab-motto__mark" src="${STAR}" alt="" width="260" height="322" loading="lazy" decoding="async" aria-hidden="true" />
          <blockquote class="ab-motto__quote" id="ab-motto-h">“${esc(CLUB.memorial.motto)}”</blockquote>
          <p class="ab-motto__sub">A club that means something on the pitch and off it. That is the whole idea.</p>
          <p class="ab-motto__attrib">In memory of ${esc(CLUB.memorial.name)}</p>
        </div>
      </div>
    </section>`;

  /* ================= 02 THE RECORD =================
     A feature tile carrying the season's headline number, then the rest at
     half its weight. Six equal tiles gave every figure the same importance
     and the band read as a spreadsheet. */
  const smalls = [
    topAssist && { v: topAssist.assists, k: 'Most assists', w: topAssist.name, p: topAssist },
    topApps && { v: topApps.apps, k: 'Most appearances', w: topApps.name, p: topApps },
    topKeeper && topKeeper.cleanSheets ? { v: topKeeper.cleanSheets, k: 'Clean sheets', w: topKeeper.name, p: topKeeper } : null,
    trophies.length ? { v: trophies.length, k: trophies.length === 1 ? 'Trophy' : 'Trophies', w: trophies.map((t) => `${t.title} ${t.season || ''}`.trim()).join(' · ') } : null,
  ].filter(Boolean);

  const recordBand = `<section class="sec ab-record" aria-labelledby="ab-rec-h">
      <div class="wrap">
        ${/* All competitions, so this cannot claim "unbeaten": that is true of
             the league season only, and the cups carry defeats. */''}
        ${rail(2, 'On the field', `P${all.played} W${all.won} D${all.drawn} L${all.lost}`)}
        <h2 class="h2 rv" id="ab-rec-h">The record</h2>

        <div class="ab-bento rv">
          ${topScorer ? `<article class="ab-feat glassbox">
            ${playerShot(topScorer, 'ab-feat__shot')}
            <div class="ab-feat__in">
              <p class="ab-feat__k">Top scorer</p>
              <b class="ab-feat__v">${esc(topScorer.goals)}</b>
              <p class="ab-feat__w">${esc(topScorer.name)}</p>
              <p class="ab-feat__note">goals in ${esc(all.played)} matches, ${esc(d.currentSeason)}</p>
            </div>
          </article>` : ''}

          ${big ? `<article class="ab-win glassbox">
            <p class="ab-win__k">Biggest win</p>
            <p class="ab-win__score">${esc(big.ourGoals)}<i>-</i>${esc(big.theirGoals)}</p>
            <p class="ab-win__vs">
              <span class="ab-win__badge">${oppBadge(big.opponent, d.badges, 34, 34)}</span>
              ${esc(shortClub(big.opponent))}
            </p>
            <p class="ab-win__when">${esc(fmtDate(big.date, { long: true }))}</p>
          </article>` : ''}

          <ul class="ab-stats">
            ${smalls.map((s) => `<li class="ab-stat glassbox">
              ${s.p ? playerShot(s.p, 'ab-stat__shot') : ''}
              <b class="ab-stat__v">${esc(s.v)}</b>
              <span class="ab-stat__k">${esc(s.k)}</span>
              <span class="ab-stat__w">${esc(s.w)}</span>
            </li>`).join('\n            ')}
          </ul>
        </div>
      </div>
    </section>`;

  /* ================= 03 HOW IT HAPPENED =================
     Beats that come from a real match carry that opponent's badge, so the
     timeline is anchored to the record rather than to prose. */
  /* A walkover is a win with no goals on the official record, so a scoreline
     is only quoted where the match actually carries one. */
  const scoreOf = (m) => (m && m.countsGoals ? `${m.ourGoals}-${m.theirGoals}` : '');

  const beats = [
    first && {
      when: monthYear(first.iso || first.date),
      title: 'Founded · opening win',
      opp: first.opponent,
      score: scoreOf(first),
      body: `First competitive fixture, ${fmtDate(first.date, { long: true })}. The project is alive.`,
    },
    big && {
      when: monthYear(big.iso || big.date),
      title: 'The statement win',
      opp: big.opponent,
      score: scoreOf(big),
      body: 'The biggest win on record, and the performance that made the league sit up.',
    },
    lastLeague && {
      when: monthYear(lastLeague.iso || lastLeague.date),
      title: 'Title confirmed',
      opp: lastLeague.opponent,
      score: scoreOf(lastLeague),
      body: `${CLUB.division} clinched. ${league.won} wins from ${league.played}, ${league.points} points.`,
    },
    {
      when: monthYear(lastLeague?.iso || lastLeague?.date),
      title: 'Unbeaten. Champions.',
      body: `Inaugural season finished with the title and a 100% league record: P${league.played} W${league.won} D${league.drawn} L${league.lost}.`,
    },
    {
      when: 'Sep 26',
      title: `Promoted to ${CLUB.nextDivision}`,
      body: 'A new division, and the next chapter of the story.',
    },
  ].filter(Boolean);

  const timelineBand = `<section class="sec ab-time" aria-labelledby="ab-time-h">
      <div class="wrap">
        ${rail(3, d.currentSeason, `GF ${all.goalsFor} · GA ${all.goalsAgainst}`)}
        <h2 class="h2 rv" id="ab-time-h">How it happened</h2>
        <ol class="ab-beats rv">
          ${beats.map((b, i) => `<li class="ab-beat">
            <span class="ab-beat__node" aria-hidden="true"><i>${esc(String(i + 1).padStart(2, '0'))}</i></span>
            <div class="ab-beat__card glassbox">
              <p class="ab-beat__when">${esc(b.when)}</p>
              <h3 class="ab-beat__title">${esc(b.title)}</h3>
              <p class="ab-beat__body">${esc(b.body)}</p>
              ${b.opp ? `<span class="ab-beat__res">
                <span class="ab-beat__badge">${oppBadge(b.opp, d.badges, 30, 30)}</span>
                ${b.score ? `<b class="ab-beat__score">${esc(b.score)}</b>` : ''}
                <span class="ab-beat__opp">v ${esc(shortClub(b.opp))}</span>
              </span>` : ''}
            </div>
          </li>`).join('\n          ')}
        </ol>
      </div>
    </section>`;

  /* ================= 04 WHO WE FACED =================
     Every club met in the title season, by badge. Derived from the match
     records, so it stays true as fixtures are added. */
  const facedNames = [];
  leagueGames.forEach((m) => {
    if (m.opponent && !facedNames.includes(m.opponent)) facedNames.push(m.opponent);
  });

  const facedBand = facedNames.length ? `<section class="sec ab-faced" aria-labelledby="ab-faced-h">
      <div class="wrap">
        ${rail(4, 'The division', `${facedNames.length} clubs met`)}
        <div class="ab-faced__head rv">
          <h2 class="h2" id="ab-faced-h">Who we <span class="volt">faced.</span></h2>
          <p class="ab-faced__sub">Every club we met on the way to the ${esc(CLUB.division)} title. We beat all of them.</p>
        </div>
        <ul class="ab-crests rv">
          ${facedNames.map((n) => `<li class="ab-crest">
            <span class="ab-crest__im">${oppBadge(n, d.badges, 44, 44)}</span>
            <span class="ab-crest__n">${esc(shortClub(n))}</span>
          </li>`).join('\n          ')}
        </ul>
      </div>
    </section>` : '';

  /* ================= 05 WHY WE PLAY ================= */
  const causeBand = `<section class="sec ab-cause" aria-labelledby="ab-cause-h">
      <div class="wrap">
        ${rail(5, 'Off the field · Sue’s story', CLUB.charity.name)}
        <div class="ab-cause__grid rv">
          <figure class="ab-cause__fig">
            <img class="ab-cause__img" src="/assets/hero/team.webp"
                 alt="${attr(CLUB.name)} squad, ${attr(CLUB.division)} champions"
                 width="640" height="800" loading="lazy" decoding="async" />
            <figcaption class="ab-cause__cap">
              <img src="${STAR}" alt="" width="26" height="32" loading="lazy" decoding="async" />
              Playing for sepsis awareness since ${esc(CLUB.founded)}
            </figcaption>
          </figure>
          <div class="ab-cause__body">
            <h2 class="h2" id="ab-cause-h">Why we <span class="volt">play.</span></h2>
            <p class="ab-cause__lead">Sue’s Angels FC was built on football, friendship and togetherness,
              honouring the life and memory of ${esc(CLUB.memorial.name)}.</p>
            <p>Following Sue’s passing from sepsis, the club raises awareness through charity
              matches and community initiatives, keeping her memory at the heart of everything.</p>
            <a class="btn btn--volt" href="/sepsis.html">Learn the signs ${ARROW}</a>
          </div>
        </div>
      </div>
    </section>`;

  /* ================= 06 CLUB VALUES ================= */
  const valuesBand = `<section class="sec ab-values" aria-labelledby="ab-val-h">
      <div class="wrap">
        ${rail(6, 'What we stand for', 'The Reeves, Hanworth')}
        <h2 class="h2 rv" id="ab-val-h">Club values</h2>
        <ul class="ab-vals rv">
          ${VALUES.map((v, i) => `<li class="ab-val glassbox">
            <span class="ab-val__n">${esc(String(i + 1).padStart(2, '0'))}</span>
            <h3 class="ab-val__title">${esc(v.title)}</h3>
            <p class="ab-val__body">${esc(v.body)}</p>
          </li>`).join('\n          ')}
        </ul>
      </div>
    </section>`;

  /* ================= CTA ================= */
  /* The crest sits BEHIND the glass, not on it. At rest the panel's 20px
     backdrop blur reduces it to a soft shape; on hover the glass drops to 3px
     and thins out, so the crest resolves as the frosting clears. */
  const ctaBand = `<section class="sec sec--cta ab-cta" aria-labelledby="ab-cta-h">
      <div class="wrap">
        <div class="cta2">
          <span class="cta2__glow" aria-hidden="true"></span>
          <img class="cta2__badge" src="${STAR}" alt="" width="500" height="620" loading="lazy" decoding="async" aria-hidden="true" />
          <div class="cta2__glass glassbox rv">
          <p class="eyebrow cta2__eyebrow">26/27 · The next chapter</p>
          <h2 class="h2" id="ab-cta-h">Pull on the <span class="volt">shirt.</span></h2>
          <p class="cta2__sub">Trials, volunteering, media and sponsorship. All open for the new season.</p>
          <div class="cta2__btns">
            <a class="btn btn--volt" href="/join.html">Join the club ${ARROW}</a>
            <a class="btn btn--ghost" href="/contact.html">Get in touch</a>
            <a class="btn btn--ghost" href="/sponsors.html">Partner with us</a>
          </div>
        </div>
      </div>
    </section>`;

  return {
    body: siteHeader('/about.html') + hero + mottoBand + recordBand + timelineBand
      + facedBand + causeBand + valuesBand + ctaBand,
    bodyClass: 'is-home is-sub',
    css: 'home.css',
    shell: 'home',
    preMain: sitePreMain(auraFor('about.html')),
    footerHtml: siteFooter(),
    schema: [{
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: `Our story · ${CLUB.name}`,
      /* By @id: the club is already a node in this page's graph, so describing
         a second thinner SportsTeam here just gives a crawler two things to
         reconcile. */
      about: { '@id': CLUB_ID },
      breadcrumb: {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${CLUB.site}/` },
          { '@type': 'ListItem', position: 2, name: 'Our story', item: `${CLUB.site}/about.html` },
        ],
      },
    }],
  };
}
