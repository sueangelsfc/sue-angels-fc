/* ==========================================================================
   THE PROGRAMME PAGE'S MATCHDAY BANDS  (/programme.html)

   The page was a heading, four facts and a sentence saying the programme was
   on its way: a whole screen of the club's website telling a supporter nearly
   nothing about the match they came to read about. These bands make it the
   matchday page, and every figure in them is derived from records the site
   already publishes elsewhere, so nothing here can disagree with the league
   page, the fixtures page or a match report.

   - the fixture as a poster, with a live countdown to the real kick-off
   - the tale of the tape: the two clubs' League Eight rows, side by side
   - last time out: the club's most recent competitive result and its goals
   - the division as it stands, with both of today's clubs marked
   - the rest of the round, the match after this one, and who pays for it

   WHAT STAYS OFF THE PAGE, by the club's decision and the suite's check: the
   squad. It belongs in the downloadable programme, so no band here links a
   player. Scorers are named, as they are on the match report, not linked.

   Kept out of programme.mjs so the printable document, which reuses that
   file's cover, is untouched by the page's layout.
   ========================================================================== */
import { esc, attr, icon, crest } from '../lib/html.mjs';
import { CLUB } from '../lib/club.mjs';
import { fmtDate, isUs, toISO, isoDateTime } from '../lib/stats.mjs';
import { clubIdentity } from '../lib/club-name.mjs';
import { oppBadge } from './home.mjs';

const ARROW = icon('arrow', '');
const short = (n) => String(n || '').replace(/\s+(A?FC)$/i, '').trim();
const same = (a, b) => clubIdentity(a || '') === clubIdentity(b || '');
const ord = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};
const byIso = (a, b) => String(a.iso || '').localeCompare(String(b.iso || ''));
const badgeOf = (name, badges, size = 64) => (isUs(name)
  ? crest('pr-crest')
  : oppBadge(name, badges, size, size, 'pr-crest'));

/* Numbered by the page after the bands are assembled, so a band that has
   nothing to say takes no number. See renumber() in programme.mjs. */
export const rail = (label, ref) => `<div class="xrail" aria-hidden="true">
      <span class="xrail__l"><span class="xrail__n">00</span><span class="xrail__t">${esc(label)}</span></span>
      <span class="xrail__r">${esc(ref)}</span>
    </div>`;

/* THE KICK-OFF, as an instant. `isoDateTime` in stats.mjs reads the time as
   UK time, the clock at the ground, so this page and the home page's
   countdown count to the same moment. A fixture with no kick-off gives no
   instant rather than a guessed one. */
export function londonKick(iso, kick) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || '')) || !/^\d{1,2}:\d{2}$/.test(String(kick || ''))) return '';
  return isoDateTime(iso, kick) || '';
}

/* WHICH ROUND OF THE DIVISION THIS IS, counted from the days the division has
   played and is due to play. Only for a match in the transcribed division;
   a cup tie or a friendly has no game week. */
function divisionFor(d, m) {
  const t = d.nextDivisionTable || {};
  return m && t.division === m.competition && (!t.season || t.season === m.season) ? t : null;
}
export function gameWeek(d, m) {
  const t = divisionFor(d, m);
  if (!t) return 0;
  const days = new Set([
    ...(t.results || []).map((r) => r.iso || toISO(r.date)),
    ...(t.fixtures || []).map((f) => f.iso),
    m.iso,
  ].filter(Boolean));
  return [...days].sort().indexOf(m.iso) + 1;
}

/* THE CLOCK. A few lines inline rather than in sa.js, which every page on the
   site downloads for a countdown only this page draws. With the script
   blocked the date and time stay printed and the tiles stay hidden (they are
   shown under html.js only). Not a live region: a value changing every
   second would flood a screen reader, and the time is printed beside it. */
const COUNTDOWN_JS = `<script>(function(){var el=document.querySelector('[data-pr-count]');if(!el)return;var at=Date.parse(el.getAttribute('data-pr-count'));if(!at)return;var u=el.querySelectorAll('[data-u]');function p(n){return(n<10?'0':'')+n}function t(){var s=Math.max(0,Math.floor((at-Date.now())/1000));var v=[String(Math.floor(s/86400)),p(Math.floor(s/3600)%24),p(Math.floor(s/60)%60),p(s%60)];for(var i=0;i<4;i++){if(u[i].textContent!==v[i]){u[i].textContent=v[i];u[i].classList.remove('is-tick');void u[i].offsetWidth;u[i].classList.add('is-tick')}}if(s>0){setTimeout(t,1000)}else{el.classList.add('is-live')}}t()})();</script>`;

/* ================= THE POSTER ================= */
export function heroBand(d, m, season) {
  const gw = gameWeek(d, m);
  const kickAt = londonKick(m.iso, m.kick);
  const [, mm, dd] = String(m.iso || '').split('-');
  const side = (name, tag, cls) => `<span class="pr-side ${cls}">
            <span class="pr-side__badge" aria-hidden="true">${badgeOf(name, d.badges, 96)}</span>
            <span class="pr-side__name">${esc(name)}</span>
            ${tag ? `<span class="pr-side__tag" aria-hidden="true">${esc(tag)}</span>` : ''}
          </span>`;
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.venue || CLUB.venue.mapQuery)}`;

  return `<section class="sec pr-hero" aria-labelledby="pr-h">
      <span class="pr-hero__glow" aria-hidden="true"></span>
      <span class="pr-hero__mark" aria-hidden="true">${esc(gw ? `GW${gw}` : `${dd}.${mm}`)}</span>
      <div class="wrap">
        <div class="pr-hero__head">
          <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i>
            Matchday programme · ${esc(m.competition)}${gw ? ` · Game week ${esc(gw)}` : ''} · ${esc(season)}</p>
          <h1 class="pr-hero__title" id="pr-h">
            ${side(m.home, 'Home', 'pr-side--home')}
            <span class="pr-hero__v">v</span>
            ${side(m.away, 'Away', 'pr-side--away')}
          </h1>
        </div>

        <div class="pr-ticket" role="group" aria-label="Match details">
          <div class="pr-ticket__cell">
            <small>Kick-off</small>
            <b class="pr-ticket__big">${esc(m.kick || 'TBC')}</b>
            <span>${esc(fmtDate(m.date, { weekday: true, long: true }))}</span>
          </div>
          <div class="pr-ticket__cell">
            <small>Venue</small>
            <b>${esc(m.venue || CLUB.venue.name)}</b>
            <a href="${attr(maps)}" target="_blank" rel="noopener">${icon('pin', '')} Find the ground</a>
          </div>
          <div class="pr-ticket__cell pr-clock">
            <small>Countdown</small>
            <p class="pr-count__static">${esc(m.kick ? `${fmtDate(m.date, { weekday: true, year: false })}, ${m.kick}` : 'To be confirmed')}</p>
            ${kickAt ? `<div class="pr-count__tiles" data-pr-count="${attr(kickAt)}" aria-hidden="true">
              <span class="pr-count__u"><b data-u>0</b><small>Days</small></span>
              <span class="pr-count__u"><b data-u>00</b><small>Hrs</small></span>
              <span class="pr-count__u"><b data-u>00</b><small>Min</small></span>
              <span class="pr-count__u"><b data-u>00</b><small>Sec</small></span>
            </div>` : ''}
            <span>To kick-off, UK time</span>
          </div>
          <div class="pr-ticket__cell">
            <small>Competition</small>
            <b>${esc(m.competition)}</b>
            <span>${esc(gw ? `Game week ${gw} · ${season}` : season)}</span>
          </div>
        </div>

        <p class="pr-hero__cta">
          <a class="btn btn--volt" href="#pr-get-h">The programme ${ARROW}</a>
          <a class="btn btn--ghost" href="/fixtures.html">All fixtures</a>
        </p>
      </div>
      ${kickAt ? COUNTDOWN_JS : ''}
    </section>`;
}

/* ================= THE TALE OF THE TAPE ================= */
export function tapeBand(d, m, h2h) {
  const t = divisionFor(d, m);
  if (!t) return '';
  const rows = t.rows || [];
  const us = rows.find((r) => r.us || isUs(r.club));
  const them = rows.find((r) => !r.us && same(r.club, m.opponent));
  if (!us || !them) return '';
  const left = m.weAreHome ? us : them;
  const right = m.weAreHome ? them : us;
  const nameL = m.weAreHome ? CLUB.name : m.home;
  const nameR = m.weAreHome ? m.away : CLUB.name;
  const anyPlayed = (us.played || 0) + (them.played || 0) > 0;

  const STATS = [
    ['Played', 'played'], ['Won', 'won'], ['Drawn', 'drawn'], ['Lost', 'lost'],
    ['Scored', 'goalsFor'], ['Conceded', 'goalsAgainst'], ['Points', 'points'],
  ];
  const cell = (row, val, other, side, i) => {
    const w = Math.max(val, other) ? Math.round((val / Math.max(val, other)) * 100) : 0;
    const lead = val > other ? ' is-lead' : '';
    const who = (row === us) ? ' is-us' : '';
    return `<td class="pr-tape__${side}${who}${lead}"><span class="pr-tape__cell">
              <b>${esc(val)}</b><span class="pr-tape__track" aria-hidden="true"><i class="pr-tape__fill" style="--w:${w}%;--i:${i}"></i></span>
            </span></td>`;
  };
  const posOf = (r) => (r.played ? ord(r.pos) : 'Yet to play');

  const facts = [];
  const tally = (h2h && h2h.tally) || { p: 0 };
  facts.push(tally.p
    ? `<li class="pr-fact"><small>Head to head</small><b>Played ${esc(tally.p)}</b>
        <p>Won ${esc(tally.w)}, drawn ${esc(tally.d)}, lost ${esc(tally.l)}. Scored ${esc(tally.gf)}, conceded ${esc(tally.ga)}.</p></li>`
    : `<li class="pr-fact"><small>Head to head</small><b>A first meeting</b>
        <p>${esc(CLUB.short)} have never played ${esc(m.opponent)}${h2h && h2h.related && h2h.related.length
    ? `. The club has met ${esc(h2h.related[0].opponent)}, which is not this side` : ''}.</p></li>`);
  if (!them.played) {
    facts.push(`<li class="pr-fact"><small>${esc(short(m.opponent))}</small><b>Their first ${esc(t.division)} match</b>
        <p>They have not played in the division yet, so this is where their season starts.</p></li>`);
  }

  const form = (d.competitive || []).filter((x) => x.played).sort(byIso).slice(-5);
  const formFact = form.length ? `<li class="pr-fact"><small>${esc(CLUB.short)} · last ${esc(form.length)}</small>
        <ol class="pr-form">${form.map((x) => {
    const o = x.outcome || '';
    const score = x.isWalkover ? 'W/O' : (x.ourScoreline || '');
    return `<li class="is-${esc(o.toLowerCase() || 'n')}"><b>${esc(o || '–')}</b><span>${esc(score)}</span><span class="sr-only"> v ${esc(x.opponent)}, ${esc(fmtDate(x.date))}</span></li>`;
  }).join('')}</ol>
        <p>League and cup, oldest first. ${esc(form.filter((x) => x.outcome === 'W').length)} won of ${esc(form.length)}.</p></li>` : '';

  return `<section class="sec pr-band" id="pr-tape" aria-labelledby="pr-tape-h">
      <div class="wrap">
        ${rail('Tale of the tape', `${t.division}${t.tableAsOf ? ` · as of ${fmtDate(t.tableAsOf, { year: false })}` : ''}`)}
        <h2 class="h2 rv" id="pr-tape-h">How they <span class="volt">compare.</span></h2>
        <div class="pr-tape-wrap rv">
          <div class="pr-tape-card">
            <table class="pr-tape">
              <caption class="sr-only">${esc(t.division)} records of ${esc(nameL)} and ${esc(nameR)}, side by side</caption>
              <thead><tr>
                <th scope="col"><span class="pr-tape__crest" aria-hidden="true">${badgeOf(nameL, d.badges, 32)}</span>${esc(short(nameL))}</th>
                <th scope="col"><span class="sr-only">Figure</span></th>
                <th scope="col">${esc(short(nameR))}<span class="pr-tape__crest" aria-hidden="true">${badgeOf(nameR, d.badges, 32)}</span></th>
              </tr></thead>
              <tbody>
                <tr class="pr-tape__posrow">
                  <td class="pr-tape__l${left === us ? ' is-us' : ''}"><span class="pr-tape__cell"><b>${esc(posOf(left))}</b></span></td>
                  <th scope="row">Position</th>
                  <td class="pr-tape__r${right === us ? ' is-us' : ''}"><span class="pr-tape__cell"><b>${esc(posOf(right))}</b></span></td>
                </tr>
                ${STATS.map(([label, key], i) => `<tr>
                  ${cell(left, left[key] || 0, right[key] || 0, 'l', i)}
                  <th scope="row">${esc(label)}</th>
                  ${cell(right, right[key] || 0, left[key] || 0, 'r', i)}
                </tr>`).join('\n                ')}
              </tbody>
            </table>
            ${anyPlayed ? '' : `<p class="pr-tape__note">Neither side has played in ${esc(t.division)} yet.</p>`}
          </div>
          <ul class="pr-facts2">
            ${facts.join('\n            ')}
            ${formFact}
          </ul>
        </div>
      </div>
    </section>`;
}

/* ================= LAST TIME OUT ================= */
export function lastBand(d) {
  const past = (d.competitive || []).filter((x) => x.played && !x.isWalkover).sort(byIso).pop();
  if (!past) return '';
  const byNum = new Map((d.squad || []).map((p) => [String(p.num), p.name]));
  const nameOf = (g) => {
    if (g == null) return '';
    if (typeof g === 'object') return byNum.get(String(g.num)) || g.name || '';
    return String(g);
  };
  const goals = ((past.detail && past.detail.goals) || [])
    .map((g) => ({ by: nameOf(g), assist: g && g.assist ? nameOf(g.assist) : '', minute: g && g.minute }))
    .filter((g) => g.by);
  const verdict = { W: 'Won', D: 'Drew', L: 'Lost' }[past.outcome] || 'Played';
  /* THE GOALS ON FILM, where the club has sent them. The scorer and the assist
     come off the match record through the same resolver the match page uses,
     the poster is the result's cover, and nothing downloads until play. */
  const films = d.goalFilmFor ? d.goalFilmFor(past) : [];
  const cover = past.detail && /^https:\/\//.test(String(past.detail.cover || '')) ? past.detail.cover : '';
  const filmBlock = films.length ? `<div class="pr-films rv">
          ${films.map((f) => `<figure class="pr-film">
            <div class="pr-film__frame">
              <video src="${attr(f.src)}" controls preload="none" playsinline${cover ? ` poster="${attr(cover)}"` : ''}
                title="${attr(`Goal ${f.n}: ${f.scorer}${f.assist ? `, assisted by ${f.assist}` : ''}`)}"></video>
            </div>
            <figcaption><span class="pr-film__n">Goal ${esc(f.n)}</span><b>${esc(f.scorer)}</b><span>${f.assist ? `assisted by ${esc(f.assist)}` : ''}</span></figcaption>
          </figure>`).join('\n          ')}
        </div>` : '';
  const side = (name) => `<div class="pr-last__side">
              <span class="pr-last__crest" aria-hidden="true">${badgeOf(name, d.badges, 72)}</span>
              <span>${esc(short(name))}</span>
            </div>`;

  return `<section class="sec pr-band" aria-labelledby="pr-last-h">
      <div class="wrap">
        ${rail('Last time out', fmtDate(past.date, { weekday: true }))}
        <h2 class="h2 rv" id="pr-last-h">${esc(verdict)} ${esc(past.ourScoreline || '')} <span class="volt">${past.weAreHome ? 'at home' : 'away'}.</span></h2>
        <article class="pr-last rv" aria-labelledby="pr-last-h">
          <div class="pr-last__board">
            <p class="pr-last__meta">${esc([past.competition, past.venue].filter(Boolean).join(' · '))}</p>
            <div class="pr-last__score">
              ${side(past.home)}
              <p class="pr-last__nums"><span class="sr-only">${esc(past.home)} </span>${esc(past.hs)}<i aria-hidden="true">-</i><span class="sr-only"> ${esc(past.away)} </span>${esc(past.as)}</p>
              ${side(past.away)}
            </div>
          </div>
          <div class="pr-last__goals">
            <h3 class="pr-last__k">${goals.length ? `The ${goals.length === 1 ? 'goal' : `${goals.length} goals`}` : 'The goals'}</h3>
            ${/* THE MINUTE IN THE DISC, NOT A COUNT. A bare numeral beside a
                  name is the shape a squad number takes, and "6 Elis Brumpton"
                  read as exactly that. The list is already in order. */''}
            ${goals.length ? `<ol class="pr-goals">${goals.map((g) => {
    const min = Number.isFinite(Number(g.minute)) && g.minute !== '' && g.minute !== null ? `${g.minute}′` : '';
    return `<li class="pr-goal">
              <span class="pr-goal__n">${esc(min)}</span>
              <span><b>${esc(g.by)}</b><span>${g.assist ? `Assisted by ${esc(g.assist)}` : 'Unassisted'}</span></span>
            </li>`;
  }).join('')}</ol>`
    : '<p class="pr-last__none">The scorers are not on the record for this match.</p>'}
            <a class="btn btn--ghost btn--sm pr-last__link" href="/matches/${attr(past.slug)}.html">The match report ${ARROW}</a>
          </div>
        </article>
        ${filmBlock}
      </div>
    </section>`;
}

/* ================= THE DIVISION THIS MORNING ================= */
export function tableBand(d, m) {
  const t = d.nextDivisionTable || {};
  const rows = t.rows || [];
  if (!rows.some((r) => (r.played || 0) > 0)) return '';
  const themName = m ? m.opponent : '';
  return `<section class="sec pr-band" aria-labelledby="pr-tbl-h">
      <div class="wrap">
        ${rail(`${t.division} ${t.season || ''}`.trim(), `${rows.length} clubs`)}
        <h2 class="h2 rv" id="pr-tbl-h">Where it <span class="volt">stands.</span></h2>
        <div class="pr-tbl-wrap rv">
          <table class="pr-tbl">
            <caption class="sr-only">${esc(t.division)} table${t.tableAsOf ? ` as of ${esc(fmtDate(t.tableAsOf))}` : ''}</caption>
            <thead><tr>
              <th scope="col"><abbr title="Position">Pos</abbr></th>
              <th scope="col" class="pr-tbl__club">Club</th>
              <th scope="col"><abbr title="Played">P</abbr></th>
              <th scope="col" class="pr-tbl__wdl"><abbr title="Won">W</abbr></th>
              <th scope="col" class="pr-tbl__wdl"><abbr title="Drawn">D</abbr></th>
              <th scope="col" class="pr-tbl__wdl"><abbr title="Lost">L</abbr></th>
              <th scope="col"><abbr title="Goal difference">GD</abbr></th>
              <th scope="col"><abbr title="Points">Pts</abbr></th>
            </tr></thead>
            <tbody>
              ${rows.map((r) => {
    const us = r.us || isUs(r.club);
    const them = !us && themName && same(r.club, themName);
    const gd = r.goalDifference || 0;
    return `<tr class="${us ? 'is-us' : ''}${them ? 'is-them' : ''}">
                <td>${esc(r.pos)}</td>
                <th scope="row" class="pr-tbl__club"><span class="pr-tbl__name"><span class="pr-tbl__crest" aria-hidden="true">${badgeOf(r.club, d.badges, 24)}</span><span>${esc(short(r.club))}</span>${us || them ? '<span class="pr-tbl__tag">This match</span>' : ''}</span></th>
                <td>${esc(r.played)}</td>
                <td class="pr-tbl__wdl">${esc(r.won)}</td>
                <td class="pr-tbl__wdl">${esc(r.drawn)}</td>
                <td class="pr-tbl__wdl">${esc(r.lost)}</td>
                <td>${esc(gd > 0 ? `+${gd}` : gd)}</td>
                <td class="pr-tbl__pts">${esc(r.points)}</td>
              </tr>`;
  }).join('\n              ')}
            </tbody>
          </table>
        </div>
        <p class="pr-foot rv"><span>${t.tableAsOf ? `As of ${esc(fmtDate(t.tableAsOf, { weekday: true }))}, from FA Full-Time.` : 'From FA Full-Time.'}</span>
          <a href="/league.html">The full table and every result ${ARROW}</a></p>
      </div>
    </section>`;
}

/* ================= THE REST OF THE ROUND ================= */
export function roundBand(d, m) {
  const t = divisionFor(d, m);
  if (!t) return '';
  const others = (t.fixtures || []).filter((f) => f.iso === m.iso && !isUs(f.home) && !isUs(f.away));
  if (!others.length) return '';
  const team = (name, cls) => `<span class="pr-fx__team ${cls}"><span class="pr-fx__crest" aria-hidden="true">${badgeOf(name, d.badges, 28)}</span><span>${esc(short(name))}</span></span>`;
  return `<section class="sec pr-band" aria-labelledby="pr-round-h">
      <div class="wrap">
        ${rail('Around the division', `${others.length} more ${others.length === 1 ? 'match' : 'matches'}`)}
        <h2 class="h2 rv" id="pr-round-h">The same <span class="volt">morning.</span></h2>
        <ul class="pr-round rv">
          ${others.map((f, i) => `<li class="pr-fx" style="--i:${i}">
            <div class="pr-fx__row">
              ${team(f.home, 'pr-fx__team--home')}
              <span class="pr-fx__kick">${esc(f.kick || 'TBC')}</span>
              ${team(f.away, 'pr-fx__team--away')}
            </div>
            ${f.venue ? `<p class="pr-fx__where">${icon('pin', '')} ${esc(f.venue)}</p>` : ''}
          </li>`).join('\n          ')}
        </ul>
      </div>
    </section>`;
}

/* ================= AFTER THIS ONE ================= */
export function nextBand(d, m) {
  const after = (d.upcoming || []).filter((f) => !m || f.id !== m.id).sort(byIso)[0];
  if (!after) return '';
  const [, mm, dd] = String(after.iso || '').split('-');
  const month = mm ? new Date(Date.UTC(2000, Number(mm) - 1, 1)).toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' }) : '';
  /* Each club's badge beside its name. The whole card is one link whose text
     already names both clubs, so the badges carry an empty alt rather than
     reading each name a second time. */
  const team = (name) => `<span class="pr-next__team"><span class="pr-next__crest" aria-hidden="true">${badgeOf(name, d.badges, 44).replace(/alt="[^"]*"/, 'alt=""')}</span><span>${esc(name)}</span></span>`;
  return `<section class="sec pr-band pr-band--tight" aria-labelledby="pr-next-h">
      <div class="wrap">
        ${rail('After this one', after.competition || 'Fixture')}
        <h2 class="h2 rv" id="pr-next-h">Then <span class="volt">next.</span></h2>
        <a class="pr-next rv" href="/fixtures.html">
          <span class="pr-next__date" aria-hidden="true"><b>${esc(dd ? Number(dd) : '')}</b><span>${esc(month)}</span></span>
          <span>
            <span class="pr-next__t">${team(after.home)}<span class="pr-next__vs">v</span>${team(after.away)}</span>
            <span class="pr-next__m">${esc([fmtDate(after.date, { weekday: true }), after.kick, after.venue].filter(Boolean).join(' · '))}</span>
          </span>
          <span class="pr-next__go">Every fixture ${ARROW}</span>
        </a>
      </div>
    </section>`;
}

/* ================= WHO PAYS FOR IT =================
   The partners' own marks on white tiles, never recoloured, each one a way
   to the page that says who they are. */
export function backersBand(d) {
  /* HLO is left off this strip at the club's request; it stays on the home
     page strip and the sponsors page. */
  const ps = (d.partners || []).filter((p) => p.onStrip && p.logo
    && !/^hlo$/i.test(String(p.short || p.name || '').trim()));
  if (!ps.length) return '';
  return `<section class="sec pr-band pr-band--tight" aria-labelledby="pr-back-h">
      <div class="wrap">
        <div class="pr-backers rv">
          <h2 class="pr-backers__k" id="pr-back-h">The club's football is backed by</h2>
          <ul class="pr-backers__list" style="--n:${ps.length}">
            ${ps.map((p) => `<li><a href="/sponsors.html"><img src="${attr(p.logo)}" alt="${attr(p.name)}" width="150" height="70" loading="lazy" decoding="async" /></a></li>`).join('\n            ')}
          </ul>
          <a class="pr-backers__cta" href="/sponsors.html">Put your name here ${ARROW}</a>
        </div>
      </div>
    </section>`;
}
