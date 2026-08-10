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
import { CLUB } from '../lib/club.mjs';
import { fmtDate, isUs, matchTimeline } from '../lib/stats.mjs';
import { siteFooter, sitePreMain, siteHeader, auraFor, oppBadge } from './home.mjs';
import { articleBody } from './news.mjs';
import { reportText, hasReport as hasReportOf, FRIENDLY_NOTE } from '../lib/prose.mjs';
import { photoCredit } from './gallery.mjs';

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
    ? `<img class="mr-badge is-us" src="${STAR}" alt="" width="${size}" height="${size}" loading="eager" />`
    : oppBadge(club, d.badges, size, size, 'mr-badge'));

  const scorers = (det.goals || []).map((g) => ({
    name: nameFor(g.num),
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

  /* ---- Scoreboard ---- */
  const hero = `<section class="mr-hero" aria-labelledby="mr-h">
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
          <h3 class="mr-col__h">Team sheet</h3>
          <ol class="mr-xi">
            ${starters.map((s) => `<li><b>${esc(s.name)}</b>${s.pos ? `<i>${esc(s.pos)}</i>` : ''}</li>`).join('\n            ')}
          </ol>
          ${bench.length ? `<p class="mr-bench"><span>Bench</span> ${bench.map((b) => esc(b.name)).join(' · ')}</p>` : ''}
          <p class="mr-sheet__note">Sunday-league match returns do not record minutes or
            substitutions, so neither is shown rather than estimated.</p>
        </div>` : ''}
      </div>
    </section>`;

  /* ---- The written report ---- */
  const reportBand = hasReportOf(m) ? `<section class="sec mr-report" aria-labelledby="mr-r-h">
      <div class="wrap wrap--narrow">
        ${rail(2, 'The report', 'Written by the club')}
        <h2 class="h2 rv" id="mr-r-h">The full <span class="volt">report.</span></h2>
        <div class="nw-art__body rv">
        ${articleBody(reportText(m))}
        </div>
      </div>
    </section>` : '';

  /* The video, when one is filed against this match.

     A real embed rather than a link out: this is the page somebody is on
     BECAUSE they want this match, so sending them to YouTube to see the goals
     is sending them away from the report they were reading.

     `youtube-nocookie` and lazy loading so the frame costs nothing until it
     is scrolled to, and nothing is set on the visitor unless they press play.
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
  const videoBand = clips.length ? `<section class="sec mr-video" aria-labelledby="mr-v-h">
      <div class="wrap wrap--narrow">
        ${rail(3, 'Watch it', clips.length === 1 ? 'Match video' : `${clips.length} clips`)}
        <h2 class="h2 rv" id="mr-v-h">See it for <span class="volt">yourself.</span></h2>
        ${clips.map((c) => `<figure class="mr-clip rv">
          ${clips.length > 1 ? `<figcaption class="mr-clip__cap">${esc(c.label)}</figcaption>` : ''}
          <div class="mr-embed">
            ${det[c.id]
    ? `<iframe src="https://www.youtube-nocookie.com/embed/${attr(det[c.id])}"
              title="${attr(`${m.title}, ${c.label.toLowerCase()}`)}"
              loading="lazy" allowfullscreen
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
              referrerpolicy="strict-origin-when-cross-origin"></iframe>`
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
        ${rail(4, 'The photographs', `${album.photos.length} from the day`)}
        <h2 class="h2 rv" id="mr-a-h">Somebody was <span class="volt">there.</span></h2>
        <a class="mr-album__link rv" href="${attr(`/gallery/${album.slug}.html`)}">
          ${album.cover
    ? `<img class="mr-album__shot" src="${attr(album.cover)}" alt="" width="640" height="427" loading="lazy" decoding="async" />`
    : `<img class="mr-album__crest" src="${STAR}" alt="" width="76" height="94" loading="lazy" decoding="async" />`}
          <span class="mr-album__body">
            <b>${esc(album.photos.length)} photograph${album.photos.length === 1 ? '' : 's'}</b>
            <i>${album.photographer ? `Shot by ${photoCredit(album.photographer)}` : 'From the club album'}</i>
            <span class="mr-album__go">See the album ${ARROW}</span>
          </span>
        </a>
      </div>
    </section>` : '';

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
    preMain: sitePreMain(auraFor('results.html')),
    footerHtml: siteFooter(),
    body: siteHeader("/results.html") + hero + factsBand + reportBand + videoBand + albumBand + sponsorBand + backBand,
    hasReport: hasReportOf(m),
  };
}
