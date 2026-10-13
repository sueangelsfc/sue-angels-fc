/* ==========================================================================
   MATCH REPORT  (/matches/<id>.html)

   One page per played match: the scoreboard, who scored, who played, and the
   written report where the club wrote one.

   These were the gap. Six reports totalling ~12,500 characters sat in the
   match records and reached no page at all, and the homepage carried seven
   links straight into an empty /matches/ directory. A page per match closes
   both, and gives the news feed somewhere for its report cards to land.

   Every match gets a page, not only the six with prose. A team sheet and a
   goal list are worth a URL on their own, and a result that links nowhere is
   what created the dead links in the first place.
   ========================================================================== */
import { esc, attr } from '../lib/html.mjs';
import { substitutions } from '../lib/subs.mjs';
import { CLUB } from '../lib/club.mjs';
import { fmtDate, isUs } from '../lib/stats.mjs';
import { siteFooter, sitePreMain, siteHeader, oppBadge, oppBadgeSrc } from './home.mjs';
import { articleBody, articlePhoto } from './news.mjs';
import { reportText, hasReport as hasReportOf, FRIENDLY_NOTE } from '../lib/prose.mjs';
import { photoCredit } from './gallery.mjs';
import {
  isRich, keysBand, timeline, goalCards, pitchXI, sheetRows, approachBand,
  headToHead, afterMatch, neighbours,
} from '../lib/report-visuals.mjs';

const STAR = '/assets/badge/sue-angels-badge-star.webp';
const ARROW = '<span aria-hidden="true">→</span>';

const shortClub = (name) => String(name || '')
  .replace(/^Sue.s Angels FC$/, "Sue's Angels")
  .replace(/\s+FC 2\.0$/, ' 2.0')
  .replace(/\s+FC$/, '');

const rail = (n, label, ref) => `<div class="xrail" aria-hidden="true">
      <span class="xrail__l"><span class="xrail__n">${esc(String(n).padStart(2, '0'))}</span><span class="xrail__t">${esc(label)}</span></span>
      <span class="xrail__r">${esc(ref)}</span>
    </div>`;

const OUTCOME = { W: 'Won', D: 'Drawn', L: 'Lost' };

/* Where there is no report the page still stands on the team sheet and the
   goals, and says so plainly rather than printing an empty heading. What
   counts as a report is decided once, in prose.mjs, because four places used
   to decide it separately and disagreed. */
export const hasReport = hasReportOf;

export function matchReport(m, d) {
  const det = m.detail || {};
  const nameFor = d.nameFor || ((n) => `No. ${n}`);
  const badge = (club, size = 68) => (isUs(club)
    ? `<img class="mr-badge is-us" src="${STAR}" alt="Sue’s Angels FC star" width="${size}" height="${size}" loading="eager" />`
    : oppBadge(club, d.badges, size, size, 'mr-badge'));

  /* An own goal is one of the club's goals and nobody's record, so it is
     listed among the scorers as what it was rather than under a name. */
  const scorers = (det.goals || []).map((g) => ({
    name: g.og || g.num == null ? 'Own goal' : nameFor(g.num),
    penalty: Boolean(g.penalty),
    minute: g.minute || '',
  }));
  const assists = (det.assists || []).map((a) => nameFor(a.num));

  /* Grouped so a player who scored twice reads "Name (2)" rather than twice. */
  const grouped = (list) => {
    const seen = new Map();
    for (const n of list) seen.set(n, (seen.get(n) || 0) + 1);
    return [...seen.entries()].map(([n, c]) => (c > 1 ? `${n} (${c})` : n));
  };

  const starters = (det.starters || []).map((s) => ({
    name: nameFor(s.num),
    pos: (s.positions || []).join(', '),
    num: s.num,
  }));
  const bench = (det.bench || []).map((s) => ({ name: nameFor(s.num), num: s.num }));
  /* Who came on for whom, and when. src/lib/subs.mjs reads the club's list
     when there is one and the old flags when there is not. */
  const subs = substitutions(det).filter((s) => s.on != null || s.off != null);
  const motm = det.motm != null ? nameFor(det.motm) : '';

  /* SPONSORSHIPS SOLD IN THE PANEL, honoured here.
     The editor tells the club exactly what each slot buys: their name on
     every match report, named as the match ball sponsor on that game's
     report, named alongside the Player of the Match award. None of it was
     ever read, so all three sentences were promises the site did not keep.

     A credit is drawn only where a sponsor has actually been recorded, and it
     is a line of text rather than a logo: these are the small things sold one
     at a time, not the partners whose marks are contractual assets. */
  const sold = d.sponsorships || {};
  const credit = (key, prefix) => {
    const sp = sold[key];
    if (!sp || !sp.name) return '';
    const who = sp.url
      ? `<a href="${attr(sp.url)}" rel="noopener nofollow" target="_blank">${esc(sp.name)}</a>`
      : esc(sp.name);
    return `<p class="mr-sponsor">${esc(prefix)} ${who}${sp.note ? `<i>${esc(sp.note)}</i>` : ''}</p>`;
  };
  const captain = det.captain != null ? nameFor(det.captain) : '';

  /* WHICH REPORT THIS IS. Everything from 26/27 is drawn; 25/26 is the
     archive and keeps the page it has, which is the club's decision about its
     own history rather than a judgement about the markup. See
     src/lib/report-visuals.mjs. */
  const rich = isRich(m);
  /* WHAT IS BEHIND THE SCOREBOARD.

     A PHOTOGRAPH IF THE CLUB HAS ONE, and the test for that is `articlePhoto`
     rather than a second one written here: a `cover-match-*` is a card the
     panel DREW, two badges and a scoreline, so using it as a backdrop would
     paint a picture of this scoreline behind this scoreline. Every 26/27
     match carries exactly that today and no album has been published for one,
     so the photograph path is real and currently draws for nothing - which is
     why it is not the only path.

     THE TWO CRESTS OTHERWISE, enormous and veiled, bleeding off either side.
     They cost no bytes at all: the same two files are already in the board
     above them, so the second reference is a cache hit. 25 of 26 opponents
     resolve a badge through the site's own resolver, and the one that does
     not draws the club crest, which is what every other badge slot on the
     site already falls back to. */
  const shotSrc = rich ? articlePhoto({ cover: det.cover })
    || ((d.galleries || []).find((g) => g.matchId === m.id) || {}).cover || '' : '';
  const oppSrc = rich && !shotSrc ? oppBadgeSrc(m.opponent, d.badges) : '';
  const heroArt = shotSrc
    ? `<img class="mr-hero__shot" src="${attr(shotSrc)}" alt="" width="1200" height="630"
        loading="eager" decoding="async" />
      <i class="mr-hero__veil" aria-hidden="true"></i>`
    : (rich ? `<span class="mr-hero__marks" aria-hidden="true">
        <img class="mr-hero__mark is-us" src="${STAR}" alt="" width="300" height="370" loading="eager" decoding="async" />
        ${oppSrc ? `<img class="mr-hero__mark is-them" src="${attr(oppSrc)}" alt="" width="300" height="300" loading="eager" decoding="async" />` : ''}
      </span>` : '');

  /* ---- Scoreboard ---- */
  const hero = `<section class="mr-hero${rich ? ' mr-hero--rich' : ''}" aria-labelledby="mr-h">
      ${heroArt}
      <div class="wrap">
        <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i>
          ${esc(m.competition)}${m.round ? ` · ${esc(m.round)}` : ''}</p>
        <h1 class="sr-only" id="mr-h">${esc(m.home)} ${esc(m.scoreline || 'v')} ${esc(m.away)}, ${esc(fmtDate(m.date))}</h1>
        <div class="mr-board">
          <span class="mr-board__side">
            ${badge(m.home)}
            <b class="${isUs(m.home) ? 'is-us' : ''}">${esc(shortClub(m.home))}</b>
          </span>
          <span class="mr-board__score">${m.isWalkover
    ? '<abbr title="Awarded as a walkover">W/O</abbr>'
    : esc(m.scoreline || 'v')}</span>
          <span class="mr-board__side">
            ${badge(m.away)}
            <b class="${isUs(m.away) ? 'is-us' : ''}">${esc(shortClub(m.away))}</b>
          </span>
        </div>
        <p class="mr-meta">
          <span class="mr-meta__res mr-meta__res--${esc(String(m.outcome || 'x').toLowerCase())}">${esc(OUTCOME[m.outcome] || 'Result')}</span>
          <span>${esc(fmtDate(m.date, { weekday: true, long: true }))}</span>
          ${m.kick ? `<span>${esc(m.kick)}</span>` : ''}
          <span>${esc(m.neutral ? `${m.venue} (neutral)` : m.venue || m.homeAway)}</span>
        </p>
        ${m.resultNote ? `<p class="mr-note">${esc(m.resultNote)}.</p>` : ''}
        ${m.friendly ? `<p class="mr-note is-flag">${esc(FRIENDLY_NOTE)}</p>` : ''}
      </div>
    </section>`;

  /* ---- The pinned scoreboard, and how far down the report you are --------
     The scoreline leaves the screen in the first swipe and everything below it
     is minutes, names and prose ABOUT that scoreline. A reader who scrolls
     into the second half of a report and has to scroll back up to check
     whether the club won is reading a page that forgot what it was about.

     `position: sticky` and nothing else: no observer, no sentinel, no script.
     It has to sit OUTSIDE a `.sec`, because `.sec{overflow:hidden}` is global
     on this site and an overflow container kills sticky silently - the
     element simply never moves and nothing anywhere says why.

     The line under it is a scroll-driven CSS animation, which is why it needs
     no script either. Where the browser has not got them the bar is still a
     pinned scoreboard and the line is just not there, which is a feature
     missing rather than a page broken. */
  const pinBar = rich ? `<div class="mr-pin" aria-hidden="true">
      <span class="mr-pin__in">
        <span class="mr-pin__side">${badge(m.home, 26)}<b>${esc(shortClub(m.home))}</b></span>
        <span class="mr-pin__score">${m.isWalkover ? 'W/O' : esc(m.scoreline || 'v')}</span>
        <span class="mr-pin__side">${badge(m.away, 26)}<b>${esc(shortClub(m.away))}</b></span>
      </span>
      <i class="mr-pin__bar"></i>
    </div>` : '';

  /* ---- What led in, and where it left the club --------------------------
     Two facts a match page could never answer and the record always held:
     what the club had done to this opponent BEFORE this afternoon, and the
     standing the result produced. Neither is drawn where there is nothing to
     draw - a first meeting says so in the band below rather than printing an
     empty record, and a friendly produces no standing because a friendly
     counts towards nothing. */
  const ctxStrip = rich ? (() => {
    const h2h = headToHead(m, d);
    const after = afterMatch(m, d);
    if (!h2h && !after) return '';
    return `<section class="sec mr-ctx" aria-label="What led into this match, and where it left the club">
      <div class="wrap">${after}${h2h}</div>
    </section>`;
  })() : '';

  /* ---- Goals and the team sheet ---- */
  const factsBand = `<section class="sec mr-facts" aria-labelledby="mr-f-h">
      <div class="wrap">
        ${rail(1, 'The match', m.isWalkover ? 'Awarded' : `${m.ourGoals}-${m.theirGoals}`)}
        <h2 class="h2 rv" id="mr-f-h">How it <span class="volt">went.</span></h2>
        <div class="mr-cols rv">
          <div class="mr-col">
            <h3 class="mr-col__h">Goals</h3>
            ${scorers.length
    ? `<ul class="mr-list">${grouped(scorers.map((s) => s.name))
      .map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`
    : `<p class="mr-col__none">${m.isWalkover
      ? 'Awarded as a walkover, so no goals are recorded.'
      : 'No goalscorer is recorded for this match.'}</p>`}
            ${/* THEIR GOALS, from the form's Their goals box: the minute, who
                  (when anybody knows) and whether it was a penalty. */''}
            ${((m.detail || {}).opponentGoals || []).length ? `<p class="mr-col__cap">${esc(shortClub(m.opponent))}: ${esc(m.detail.opponentGoals
    .map((g) => [g.minute ? `${g.minute}′` : '',
      g.og ? `own goal${g.name && !/^unknown$/i.test(g.name) ? `, ${g.name}` : ''}`
        : (g.name && !/^unknown$/i.test(g.name) ? g.name : ''), g.penalty ? '(pen)' : '']
      .filter(Boolean).join(' ') || 'a goal').join(', '))}</p>` : ''}
          </div>
          <div class="mr-col">
            <h3 class="mr-col__h">Assists</h3>
            ${assists.length
    ? `<ul class="mr-list">${grouped(assists).map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`
    : '<p class="mr-col__none">No assist is recorded for this match.</p>'}
          </div>
          <div class="mr-col">
            <h3 class="mr-col__h">Player of the Match</h3>
            ${motm ? `<p class="mr-motm">${esc(motm)}</p>`
    : '<p class="mr-col__none">Not recorded.</p>'}
            ${captain ? `<p class="mr-col__cap">Captain: ${esc(captain)}</p>` : ''}
            ${credit('motm', 'Award sponsored by')}
          </div>
        </div>

        ${starters.length ? `<div class="mr-sheet rv">
          <h3 class="mr-col__h">Team sheet${
    /* THE SHAPE THE CLUB RECORDED, beside the eleven it describes. The pitch
       diagram has always drawn it and the manager's page has always counted
       it, but the one page about this match never said it in words, so a
       reader on a phone who scrolled past the diagram never got it and a
       screen reader never got it at all. Only printed where the club
       actually entered one. */
    m.detail && m.detail.formation
      ? `<span class="mr-form">${esc(String(m.detail.formation))}</span>` : ''}</h3>
          <ol class="mr-xi">
            ${starters.map((s) => `<li><b>${esc(s.name)}</b>${s.pos ? `<i>${esc(s.pos)}</i>` : ''}</li>`).join('\n            ')}
          </ol>
          ${bench.length ? `<p class="mr-bench"><span>Bench</span> ${bench.map((b) => esc(b.name)).join(' · ')}</p>` : ''}
          ${subs.length ? `<ul class="mr-subs">
            ${subs.map((s) => `<li>
              <span class="mr-subs__min">${esc(s.minute != null ? `${s.minute}'` : '')}</span>
              <span class="mr-subs__pair">${s.on != null ? `<b>${esc(nameFor(s.on))}</b>` : ''}${s.on != null && s.off != null ? ' for ' : ''}${s.off != null ? esc(nameFor(s.off)) : ''}</span>
            </li>`).join('\n            ')}
          </ul>` : ''}
          ${/* THE NOTE IS NOT ALWAYS TRUE ANY MORE. It said Sunday-league
                returns do not record substitutions, which was a fair account
                of the archive and becomes a false statement about a match the
                club HAS recorded them for. It appears only where they are
                genuinely absent. */''}
          ${subs.length ? '' : `<p class="mr-sheet__note">Sunday-league match returns do not record minutes or
            substitutions, so neither is shown rather than estimated.</p>`}
        </div>` : ''}
      </div>
    </section>`;

  /* ---- How it went, drawn (26/27 onwards) --------------------------------
     The same facts the three columns carried, plus the five the record held
     and no page read: the minute, the foot, the zone, the situation and how
     the chance was made. The columns are still the fallback, because a match
     whose goals carry no detail would otherwise lose its assist list to a
     band that had nothing to put in its place.

     The rail number is COUNTED rather than typed. Every band below this is
     conditional - a report, a video, an album - and a typed number is right
     for exactly one arrangement: the existing page prints 1 then 3 on any
     match with no written report. Fixed for the drawn reports only, because
     renumbering the archive would change pages the club asked to leave alone. */
  let railN = 0;
  const nextRail = (label, ref) => rail((railN += 1), label, ref);

  const gs = rich ? goalCards(m, d) : '';
  const tl = rich ? timeline(m, d) : '';
  const howBand = rich ? `<section class="sec mr-how" aria-labelledby="mr-f-h">
      <div class="wrap">
        ${nextRail('How it went', m.isWalkover ? 'Awarded' : `${m.ourGoals}-${m.theirGoals}`)}
        <h2 class="h2 rv" id="mr-f-h">How it <span class="volt">went.</span></h2>
        ${keysBand(m)}
        ${tl}
        ${gs}
        ${gs ? '' : `<div class="mr-cols rv">
          <div class="mr-col">
            <h3 class="mr-col__h">Goals</h3>
            ${scorers.length
    ? `<ul class="mr-list">${grouped(scorers.map((x) => x.name)).map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`
    : `<p class="mr-col__none">${m.isWalkover
      ? 'Awarded as a walkover, so no goals are recorded.'
      : 'No goalscorer is recorded for this match.'}</p>`}
          </div>
          <div class="mr-col">
            <h3 class="mr-col__h">Assists</h3>
            ${assists.length
    ? `<ul class="mr-list">${grouped(assists).map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`
    : '<p class="mr-col__none">No assist is recorded for this match.</p>'}
          </div>
        </div>`}
        ${((m.detail || {}).opponentGoals || []).length ? `<p class="mr-how__theirs rv">${esc(shortClub(m.opponent))} scored through ${esc(m.detail.opponentGoals
    .map((g) => [g.minute ? `${g.minute}′` : '',
      g.og ? `an own goal${g.name && !/^unknown$/i.test(g.name) ? `, ${g.name}` : ''}`
        : (g.name && !/^unknown$/i.test(g.name) ? g.name : 'a goal'), g.penalty ? '(pen)' : '']
      .filter(Boolean).join(' ')).join(', '))}.</p>` : ''}
        ${motm ? `<div class="mr-award rv">
          <span class="mr-award__k">Player of the Match</span>
          <b class="mr-award__n">${esc(motm)}</b>
          ${captain ? `<i class="mr-award__c">${esc(captain)} wore the armband</i>` : ''}
          ${credit('motm', 'Award sponsored by')}
        </div>` : ''}
      </div>
    </section>` : '';

  /* ---- Who played, drawn ------------------------------------------------
     The eleven as a shape rather than a list, the shape the club actually
     recorded, and a face against every name the club has a photograph for.
     The list is still underneath it: the diagram is a second way of reading
     the same eleven, never the only way, because it carries no position names
     a screen reader can use beyond its own label. */
  const sheet = rich ? sheetRows(m, d) : null;
  const whoBand = rich && starters.length ? `<section class="sec mr-who-b" aria-labelledby="mr-w-h">
      <div class="wrap">
        ${nextRail('Who played', `${starters.length} and ${bench.length} named`)}
        <h2 class="h2 rv" id="mr-w-h">Who <span class="volt">played.</span></h2>
        <div class="mr-sheet2">
          ${pitchXI(m, d)}
          <div class="mr-sheet2__list rv">
            <h3 class="mr-col__h">The eleven${det.formation
    ? `<span class="mr-form">${esc(String(det.formation))}</span>` : ''}</h3>
            ${/* HOW THEY PLAYED, where the club has said so and nothing at
                  all where it has not. There is no derivation to fall back on
                  here - nothing in a match return says where the press began -
                  so a chip over a match nobody answered for would be the site
                  inventing tactics. */''}
            ${approachBand(m)}
            ${/* IN POSITION ORDER, back to front and left to right, derived
                  from the same coordinates the pitch is drawn from. The lines
                  are named and nothing is counted on them: this eleven groups
                  as 5-3-2 and the club recorded 3-4-1-2, and both are right,
                  so the page says neither number twice. */''}
            ${sheet.xi}
            ${sheet.anyBench ? `<h3 class="mr-col__h mr-col__h--2">The bench</h3>
            <ul class="mr-whos">
            ${sheet.bench}
            </ul>` : ''}
            ${subs.length ? '' : `<p class="mr-sheet__note">No substitution is recorded for this match, so none is shown
            rather than estimated.</p>`}
            <p class="mr-sheet__foot">${esc(sheet.foot)}</p>
          </div>
        </div>
      </div>
    </section>` : '';

  /* ---- The written report ---- */
  const reportBand = hasReportOf(m) ? `<section class="sec mr-report${rich ? ' mr-report--rich' : ''}" aria-labelledby="mr-r-h">
      <div class="wrap ${rich ? 'wrap--mr' : 'wrap--narrow'}">
        ${rich ? nextRail('The report', 'Written by the club') : rail(2, 'The report', 'Written by the club')}
        <h2 class="h2 rv" id="mr-r-h">The full <span class="volt">report.</span></h2>
        ${/* A DROP CAP AND A STAND-FIRST, which are a claim about the FIRST
              paragraph, so they are addressed by position in CSS and the
              markup is untouched. Doing it by wrapping the opening paragraph
              in a class would mean the formatted edition and the club's own
              stored text produced different markup for the same report, and
              the stored text is the one that wins the moment it is typed. */''}
        <div class="nw-art__body${rich ? ' mr-prose' : ''} rv">
        ${articleBody(reportText(m))}
        </div>
      </div>
    </section>` : '';

  /* The video, when one is filed against this match.

     A real embed rather than a link out: this is the page somebody is on
     BECAUSE they want this match, so sending them to YouTube to see the goals
     is sending them away from the report they were reading.

     A STILL UNTIL SOMEBODY PRESSES PLAY. An iframe, even `youtube-nocookie`
     and lazy, contacts Google the moment it scrolls into view and can store
     things on the device, which is a third party storing information before
     anybody asked for it. So the page ships a link wearing the match's own
     cover, and `00-core.js` swaps in the player only on the press, with a
     line saying where it plays from. Without scripts the link opens YouTube.
     The embed address stays here because csp.mjs proves `frame-src` by it.
     Renders nothing at all when no video is filed, which is every match until
     one is saved in the control panel. */
  /* Four things can be filed against a match now: the footage, somebody before
     the game, somebody after it, and anything else. Each is either a YouTube
     id or a clip uploaded straight to the club's own storage, so both have to
     render. Nothing here appears until something is actually filed. */
  const CLIPS = [
    { id: 'videoId', file: 'videoFile', label: 'The match' },
    { id: 'preId', file: 'preFile', label: 'Before the game' },
    { id: 'postId', file: 'postFile', label: 'After the game' },
    { id: 'extraId', file: 'extraFile', label: 'More from the day' },
  ];
  const clips = det ? CLIPS.filter((c) => det[c.id] || det[c.file]) : [];
  /* THE GOALS, ON FILM. Each clip names who scored and who made it, read off
     this match's own goal list, and wears the result's cover until it is
     played: the club's own card, or the one the build drew. `preload="none"`
     so a phone downloads nothing until somebody presses play. */
  const goalFilm = d.goalFilmFor ? d.goalFilmFor(m) : [];
  const poster = det.cover && det.cover !== 'None' ? det.cover : (d.drawnCoverSrc ? d.drawnCoverSrc(m.id) : '');
  const filmCount = clips.length + goalFilm.length;
  const videoBand = filmCount ? `<section class="sec mr-video" id="watch" aria-labelledby="mr-v-h">
      <div class="wrap wrap--narrow">
        ${(rich ? nextRail : (l, r) => rail(3, l, r))('Watch it', filmCount === 1 ? (goalFilm.length ? 'The goal' : 'Match video') : `${filmCount} clips`)}
        <h2 class="h2 rv" id="mr-v-h">See it for <span class="volt">yourself.</span></h2>
        ${goalFilm.map((f) => `<figure class="mr-clip rv" id="goal-${f.n}">
          <figcaption class="mr-clip__cap">Goal ${esc(f.n)} · ${esc(f.scorer)}${f.assist ? `, assisted by ${esc(f.assist)}` : ''}</figcaption>
          <div class="mr-embed">
            <video src="${attr(f.src)}" controls preload="none" playsinline${poster ? ` poster="${attr(poster)}"` : ''}
              title="${attr(`${m.title}, goal ${f.n}: ${f.scorer}${f.assist ? `, assisted by ${f.assist}` : ''}`)}"></video>
          </div>
        </figure>`).join('\n        ')}
        ${clips.map((c) => `<figure class="mr-clip rv">
          ${filmCount > 1 ? `<figcaption class="mr-clip__cap">${esc(c.label)}</figcaption>` : ''}
          <div class="mr-embed">
            ${det[c.id]
    ? `<a class="mr-yt" href="https://www.youtube.com/watch?v=${attr(encodeURIComponent(det[c.id]))}" rel="noopener" target="_blank"
              data-yt="https://www.youtube-nocookie.com/embed/${attr(encodeURIComponent(det[c.id]))}?autoplay=1"
              data-yt-title="${attr(`${m.title}, ${c.label.toLowerCase()}`)}">
              ${poster ? `<img class="mr-yt__img" src="${attr(poster)}" alt="" width="1200" height="630" loading="lazy" decoding="async" />` : ''}
              <span class="mr-yt__play" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg></span>
              <span class="mr-yt__t">Play ${esc(c.label.toLowerCase())}
                <span class="mr-yt__n">Plays from YouTube, which may store information on your device once you press play.</span></span>
            </a>`
    : `<video src="${attr(det[c.file])}" controls preload="none"
              title="${attr(`${m.title}, ${c.label.toLowerCase()}`)}"></video>`}
          </div>
        </figure>`).join('\n        ')}
      </div>
    </section>` : '';

  /* The report's own sponsor and the match ball, at the foot of the report
     where a credit belongs: read after the thing it paid for, not before it. */
  const sponsorBand = (credit('matchreport', 'This match report is brought to you by')
    + credit('matchball', 'Match ball sponsored by'))
    ? `<section class="sec mr-sponsors">
      <div class="wrap">
        ${credit('matchreport', 'This match report is brought to you by')}
        ${credit('matchball', 'Match ball sponsored by')}
      </div>
    </section>` : '';

  /* THE PHOTOGRAPHS OF THIS MATCH. Seven albums hold 606 pictures of seven
     games, and the report of a game linked to none of them: the only route in
     was the gallery index, which meant knowing the album existed before you
     could find it. dataset.mjs resolves the album to its match, so a page
     showing a 7-2 win can offer the 151 photographs somebody took of it. */
  const album = (d.galleries || []).find((g) => g.matchId === m.id);
  const albumBand = album ? `<section class="sec mr-album" aria-labelledby="mr-a-h">
      <div class="wrap wrap--narrow">
        ${(rich ? nextRail : (l, r) => rail(4, l, r))('The photographs', `${album.photos.length} from the day`)}
        <h2 class="h2 rv" id="mr-a-h">Somebody was <span class="volt">there.</span></h2>
        <a class="mr-album__link rv" href="${attr(`/gallery/${album.slug}.html`)}">
          ${album.cover
    ? `<img class="mr-album__shot" src="${attr(album.cover)}" alt="" width="640" height="427" loading="lazy" decoding="async" />`
    : `<img class="mr-album__crest" src="${STAR}" alt="Sue’s Angels FC star" width="76" height="94" loading="lazy" decoding="async" />`}
          <span class="mr-album__body">
            <b>${esc(album.photos.length)} photograph${album.photos.length === 1 ? '' : 's'}</b>
            <i>${album.photographer ? `Shot by ${photoCredit(album.photographer, { insideLink: true })}` : 'From the club album'}</i>
            <span class="mr-album__go">See the album ${ARROW}</span>
          </span>
        </a>
      </div>
    </section>` : '';

  /* ---- One match either side -------------------------------------------- */
  const walkBand = rich ? (() => {
    const w = neighbours(m, d);
    return w ? `<section class="sec mr-walk-b" aria-label="The matches either side of this one">
      <div class="wrap">${w}</div>
    </section>` : '';
  })() : '';

  const backBand = `<section class="sec mr-back">
      <div class="wrap">
        <p class="mr-back__row">
          <a class="btn btn--volt" href="/results.html">Every result ${ARROW}</a>
          <a class="btn btn--ghost" href="/news.html">Club news</a>
        </p>
      </div>
    </section>`;

  return {
    css: 'home.css',
    shell: 'home',
    bodyClass: 'is-home is-sub is-report',
    preMain: sitePreMain(),
    footerHtml: siteFooter(),
    body: siteHeader('/results.html') + hero + pinBar + ctxStrip
      + (rich ? howBand + whoBand : factsBand)
      + reportBand + videoBand + albumBand + sponsorBand + walkBand + backBand,
    hasReport: hasReportOf(m),
  };
}
