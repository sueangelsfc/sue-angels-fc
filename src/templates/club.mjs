/* ==========================================================================
   A CLUB'S OWN PAGE  (/clubs/<slug>.html)

   Who gets one, and why, is `clubPages()` in src/lib/clubs.mjs. This file is
   only the rendering, and it composes what the engine already derives rather
   than counting the same matches a second way: `teamSummary` knows a walkover
   is three points and no goals, and the meetings are the normalised matches
   every other page is drawn from.

   NOTHING IS INVENTED. A club never played says so and prints no record; a
   club with no division row gets no standing; a meeting with no score because
   it was awarded is drawn as awarded. The one sentence this page could get
   badly wrong is a record against a side never met, which is why the related
   side is a LINK to its own page and never a merged figure - see the comment
   on `related` in clubs.mjs.
   ========================================================================== */
import { esc, attr } from '../lib/html.mjs';
import { CLUB } from '../lib/club.mjs';
import { fmtDate, ordinal } from '../lib/stats.mjs';
import { siteFooter, sitePreMain, siteHeader, oppBadge } from './home.mjs';
import { sourceNote } from '../lib/blocks.mjs';

const ARROW = '<span aria-hidden="true">→</span>';

const rail = (n, label, ref) => `<div class="xrail" aria-hidden="true">
      <span class="xrail__l"><span class="xrail__n">${esc(String(n).padStart(2, '0'))}</span><span class="xrail__t">${esc(label)}</span></span>
      <span class="xrail__r">${esc(ref)}</span>
    </div>`;

const tile = (b, l) => `<li><b>${esc(b)}</b><span>${esc(l)}</span></li>`;

/* The club's own scoreline, so a 1-7 away reads as the 7-1 it was for us.
   An awarded match carries no score and says the word instead of a nil-nil. */
const scoreOf = (m) => (m.countsGoals ? (m.ourScoreline || m.scoreline) : 'Awarded');

export function clubPage(c, d) {
  const s = c.summary;
  const played = s.played > 0;
  const crest = oppBadge(c.name, d.badges, 120, 120, 'cl-hero__badge');

  /* THE RECORD IN A SENTENCE, because the tiles under it are the working and
     a reader wants the answer first. A club met once is not "played 1, won 1,
     drawn 0, lost 0" in words - that reads as a table read aloud. */
  const lede = !played
    ? `${CLUB.name} have not played ${c.name}. They are in ${c.row ? 'the same division this season' : 'the club’s records'}, so this page fills in as soon as the two meet.`
    : `${CLUB.name} have played ${c.name} ${s.played === 1 ? 'once' : `${s.played} times`}`
      + `${s.won === s.played ? ` and won ${s.played === 1 ? 'it' : 'all of them'}.`
        : `, winning ${s.won}${s.drawn ? `, drawing ${s.drawn}` : ''}${s.lost ? ` and losing ${s.lost}` : ''}.`}`;

  const hero = `<section class="sec cl-hero" aria-labelledby="cl-h">
      <div class="wrap">
        ${rail(1, 'Opponent', c.row ? `${esc(d.division)} · ${ordinal(c.row.pos)}` : (played ? `${s.played} met` : 'Not yet played'))}
        <div class="cl-hero__grid">
          <span class="cl-hero__im rv">${crest}</span>
          <div class="cl-hero__body rv">
            <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> Head to head</p>
            <h1 class="h1b" id="cl-h">${esc(c.name)}<span class="volt">.</span></h1>
            ${played ? `<ul class="cl-figs">
              ${tile(s.played, s.played === 1 ? 'Meeting' : 'Meetings')}
              ${tile(s.won, 'Won')}
              ${tile(`${s.goalsFor}–${s.goalsAgainst}`, 'Goals')}
            </ul>` : ''}
            <p class="cl-lede">${esc(lede)}</p>
            ${c.related.length ? `<p class="cl-lede cl-rel">A different side of the same club${c.related.length === 1 ? '' : 's'}:
              ${c.related.map((r) => `<a href="/clubs/${attr(r.slug)}.html">${esc(r.name)}</a>`).join(', ')}.
              Their record is their own and is not counted here.</p>` : ''}
            <p class="cl-btns"><a class="btn btn--ghost" href="/clubs.html">Every club played ${ARROW}</a></p>
          </div>
        </div>
      </div>
    </section>`;

  /* ---- The record ---- */
  const wdl = Math.max(1, s.won + s.drawn + s.lost);
  const pct = (n) => Math.round((n / wdl) * 100);
  const recordBand = played ? `<section class="sec cl-rec" id="record" aria-labelledby="cl-rec-h">
      <div class="wrap">
        ${rail(2, 'The record', `${s.won}W ${s.drawn}D ${s.lost}L`)}
        <h2 class="h2 rv" id="cl-rec-h">The <span class="volt">record.</span></h2>
        <ol class="cl-wdl rv" aria-label="Results against ${attr(c.name)}">
          ${s.won ? `<li class="cl-wdl__w" style="--w:${pct(s.won)}%"><span class="sr-only">Won ${esc(s.won)}</span></li>` : ''}
          ${s.drawn ? `<li class="cl-wdl__d" style="--w:${pct(s.drawn)}%"><span class="sr-only">Drawn ${esc(s.drawn)}</span></li>` : ''}
          ${s.lost ? `<li class="cl-wdl__l" style="--w:${pct(s.lost)}%"><span class="sr-only">Lost ${esc(s.lost)}</span></li>` : ''}
        </ol>
        <ul class="cl-tiles rv">
          ${tile(s.played, 'Played')}${tile(s.won, 'Won')}${tile(s.drawn, 'Drawn')}${tile(s.lost, 'Lost')}
          ${tile(s.goalsFor, 'Scored')}${tile(s.goalsAgainst, 'Conceded')}
          ${tile(s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference, 'Difference')}
          ${tile(s.cleanSheets, 'Clean sheets')}
        </ul>
        ${s.walkovers ? `<p class="cl-note">${esc(s.walkovers)} of the ${esc(s.played)}
          ${s.walkovers === 1 ? 'was awarded and carries' : 'were awarded and carry'} no score, so the
          goal figures are counted over ${esc(s.onGoalRecord)} ${s.onGoalRecord === 1 ? 'match' : 'matches'}.</p>` : ''}
        ${/* The grounds are linked through `d.groundHref`, never slugified here:
             a ground earns a page from a match or a fixture, so a venue the
             club typed once and never played at has none, and a template
             building the address itself would link at a page nobody
             generated. No href, no link - the name still prints. */''}
        ${c.venues.length ? `<p class="cl-note">Met at ${c.venues.map((v) => {
    const href = d.groundHref ? d.groundHref(v) : '';
    return href ? `<a href="${attr(href)}">${esc(v)}</a>` : esc(v);
  }).join(', ')}.</p>` : ''}
      </div>
    </section>` : '';

  /* ---- Every meeting ---- */
  const meetingsBand = played ? `<section class="sec cl-meet" id="meetings" aria-labelledby="cl-meet-h">
      <div class="wrap">
        ${rail(3, 'Every meeting', 'Most recent first')}
        <h2 class="h2 rv" id="cl-meet-h">Every time they have <span class="volt">met.</span></h2>
        <ol class="cl-list rv">
          ${c.meetings.map((m) => `<li class="cl-m is-${esc(String(m.outcome || 'd').toLowerCase())}">
            <a class="cl-m__a" href="/matches/${attr(m.slug)}.html">
              <span class="cl-m__res" aria-hidden="true">${esc(m.outcome || '·')}</span>
              <span class="cl-m__main">
                <b class="cl-m__score">${esc(scoreOf(m))}</b>
                <i class="cl-m__where">${esc(m.weAreHome ? 'Home' : 'Away')} · ${esc(m.competition)}</i>
              </span>
              <span class="cl-m__date">${esc(fmtDate(m.date, { long: true }))}</span>
            </a>
          </li>`).join('\n          ')}
        </ol>
      </div>
    </section>` : '';

  /* ---- Who has scored against them ----
     The one cut of a career with complete coverage: the minute is on a
     fraction of the goals and the body part on fewer, and WHICH CLUB is on
     every one of them. */
  const withGoals = c.scorers.filter((p) => p.goals || p.assists);
  const topTally = Math.max(1, ...withGoals.map((p) => p.goals + p.assists));
  /* A LIST, NOT A TABLE, AND THE FIGURES COME AFTER A SEPARATOR.

     The obvious markup is three columns - player, goals, assists - and it is
     the one shape this site refuses: a bare numeral directly beside a man's
     name is how a storage key leaks onto a page, and `<th>Adio</th><td>1</td>`
     flattens to exactly that. Twenty of these collided with a real squad key
     on the first build. Naming twenty coincidences in the suite would be an
     allow-list that churns with every goal scored, so the shape goes instead:
     the figures carry their own unit and sit behind a separator, which reads
     better than a column of noughts and a dash besides. */
  const scorersBand = withGoals.length ? `<section class="sec cl-sc" id="scorers" aria-labelledby="cl-sc-h">
      <div class="wrap">
        ${rail(4, 'Against them', `${withGoals.length} ${withGoals.length === 1 ? 'player' : 'players'}`)}
        <h2 class="h2 rv" id="cl-sc-h">Who has scored against <span class="volt">them.</span></h2>
        <ul class="cl-sc__list rv">
          ${withGoals.map((p) => `<li class="cl-sc__i">
            <span class="cl-sc__bar" aria-hidden="true"><i style="--w:${Math.round(((p.goals + p.assists) / topTally) * 100)}%"></i></span>
            ${p.slug ? `<a class="cl-sc__n" href="/players/${attr(p.slug)}.html">${esc(p.name)}</a>` : `<b class="cl-sc__n">${esc(p.name)}</b>`}
            <span class="cl-sc__f">\u00b7 ${esc([
    p.goals ? `${p.goals} ${p.goals === 1 ? 'goal' : 'goals'}` : '',
    p.assists ? `${p.assists} ${p.assists === 1 ? 'assist' : 'assists'}` : '',
  ].filter(Boolean).join(', '))}</span>
          </li>`).join('\n          ')}
        </ul>
        <p class="cl-note">An own goal belongs to nobody's record and is not counted here.</p>
      </div>
    </section>` : '';

  /* ---- Where they are now ---- */
  const r = c.row;
  const nextBand = (r || c.next) ? `<section class="sec cl-now" id="now" aria-labelledby="cl-now-h">
      <div class="wrap">
        ${rail(played ? 5 : 2, 'Now', r ? esc(d.division) : 'Still to come')}
        <h2 class="h2 rv" id="cl-now-h">Where they are <span class="volt">now.</span></h2>
        ${r ? `<ul class="cl-tiles rv">
          ${tile(ordinal(r.pos), `in ${d.division}`)}${tile(r.played, 'Played')}
          ${tile(r.points, 'Points')}${tile(r.won, 'Won')}${tile(r.drawn, 'Drawn')}${tile(r.lost, 'Lost')}
          ${tile(r.goalsFor, 'Scored')}${tile(r.goalsAgainst, 'Conceded')}
        </ul>
        <p class="cl-note">Their ${esc(d.division)} row as the table was last read.
          <a href="/league.html">The full table ${ARROW}</a></p>` : ''}
        ${c.next ? `<p class="cl-next rv"><b>Next meeting</b>
          ${esc(fmtDate(c.next.date, { long: true }))}${c.next.kick ? `, ${esc(c.next.kick)}` : ''} ·
          ${esc(c.next.weAreHome ? 'home' : 'away')} · ${esc(c.next.competition)}${c.next.venue ? ` · ${esc(c.next.venue)}` : ''}.
          <a href="/fixtures.html">Every fixture ${ARROW}</a></p>` : ''}
      </div>
    </section>` : '';

  return {
    body: siteHeader('/results.html') + hero + recordBand + meetingsBand + scorersBand + nextBand
      + sourceNote(['fulltime', 'surreyfa'], { lead: 'League and cup figures reconcile with' }),
    bodyClass: 'is-home is-sub is-club',
    css: 'home.css',
    shell: 'home',
    preMain: sitePreMain(),
    footerHtml: siteFooter(),
  };
}

/* ==========================================================================
   THE INDEX  (/clubs.html)

   Thirty-four pages nothing links to are thirty-four pages in the sitemap
   that no reader can reach, which is the orphan fault a generated family is
   most prone to. This is where they are reachable from, and it is a page in
   its own right: the clubs the Angels have met, how often, and how it went.
   ========================================================================== */
export function clubsIndex(d, clubs) {
  const met = (clubs || []).filter((c) => c.meetings.length);
  const unmet = (clubs || []).filter((c) => !c.meetings.length);
  const totals = met.reduce((a, c) => ({
    played: a.played + c.summary.played, won: a.won + c.summary.won,
  }), { played: 0, won: 0 });

  const card = (c) => `<li class="cl-card">
      <a class="cl-card__a" href="/clubs/${attr(c.slug)}.html">
        <span class="cl-card__im">${oppBadge(c.name, d.badges, 44, 44, '', true)}</span>
        <span class="cl-card__n">${esc(c.name)}</span>
        <span class="cl-card__r">${c.meetings.length
    ? `${esc(c.summary.played)} played · ${esc(c.summary.won)} won`
    : 'Not yet played'}</span>
      </a>
    </li>`;

  const hero = `<section class="sec cl-ihero" aria-labelledby="cli-h">
      <div class="wrap">
        ${rail(1, 'Opponents', `${met.length} clubs met`)}
        <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> Head to head</p>
        <h1 class="h1b" id="cli-h">Every club we have <span class="volt">played.</span></h1>
        <p class="cl-lede">${esc(`${met.length} clubs, ${totals.played} matches, ${totals.won} won.`)}
          Each one has its own page: every meeting, the record, who scored, and where they are now.
          Counted from the match records, so it moves with the next result.</p>
      </div>
    </section>`;

  const metBand = `<section class="sec cl-idx" id="met" aria-labelledby="cli-met-h">
      <div class="wrap">
        ${rail(2, 'Played', 'Most met first')}
        <h2 class="h2 rv" id="cli-met-h">The clubs we have <span class="volt">met.</span></h2>
        <ul class="cl-cards rv">${met.map(card).join('\n          ')}</ul>
      </div>
    </section>`;

  const unmetBand = unmet.length ? `<section class="sec cl-idx" id="to-come" aria-labelledby="cli-un-h">
      <div class="wrap">
        ${rail(3, 'Still to come', `${unmet.length} in ${d.division}`)}
        <h2 class="h2 rv" id="cli-un-h">In the division, not yet <span class="volt">played.</span></h2>
        <ul class="cl-cards rv">${unmet.map(card).join('\n          ')}</ul>
      </div>
    </section>` : '';

  return {
    body: siteHeader('/clubs.html') + hero + metBand + unmetBand
      + sourceNote(['fulltime', 'surreyfa'], { lead: 'League and cup figures reconcile with' }),
    bodyClass: 'is-home is-sub is-club',
    css: 'home.css',
    shell: 'home',
    preMain: sitePreMain(),
    footerHtml: siteFooter(),
  };
}
