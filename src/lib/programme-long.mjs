/* ==========================================================================
   THE LONG READ

   The club asked for a programme of at least ten thousand words. There is
   only one honest way to get there: write about what the archive actually
   holds, at length, rather than inventing a column and attributing it to
   somebody. Every sentence in here is generated from a record - an
   appearance, a scoreline, a goal, a date - and nothing is asserted that the
   data does not carry.

   THE RULE THAT KEEPS IT TRUE: where a figure is not recorded, the sentence
   says so instead of guessing. Two pre-season goals have no scorer; four
   goals in the whole archive record where on the pitch they came from. A
   programme that averaged over those would be inventing a statistic, so the
   coverage is printed beside the number every time one is quoted.
   ========================================================================== */
import { esc, attr } from './html.mjs';
import { CLUB } from './club.mjs';
import { fmtDate } from './stats.mjs';
import { clubIdentity } from './club-name.mjs';

/* A shirt number is a storage key and never printed; this turns one into the
   person it belongs to, which is the only form a reader should ever see. */
function nameResolver(d) {
  const by = {};
  (d.players || []).forEach((x) => { by[String(x.num)] = x.name; });
  (d.squad || []).forEach((x) => { if (!by[String(x.num)]) by[String(x.num)] = x.name; });
  return (n) => by[String(n)] || 'a player the roster cannot name';
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const num = (n) => {
  const words = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven',
    'eight', 'nine', 'ten', 'eleven', 'twelve'];
  return n >= 0 && n <= 12 ? words[n] : String(n);
};
/* Words to twelve, numerals above, the same rule `num` uses - so one
   paragraph cannot say "12 appearances" and "twelve starts" in consecutive
   sentences, which is what it did. */
const art = (w) => `${/^[aeiou]/i.test(String(w)) ? 'an' : 'a'} ${w}`;
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
/* A RECORD WITH NO NIL TERMS. "won three, drawn no, lost no" is how a
   template writes it and not how anybody says it; three of these appeared in
   the division section alone, where most opponents have been beaten and
   nothing else. */
const record = (w, dr, l) => {
  const parts = [];
  if (w) parts.push(`won ${num(w)}`);
  if (dr) parts.push(`drawn ${num(dr)}`);
  if (l) parts.push(`lost ${num(l)}`);
  if (!parts.length) return 'no result either way';
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
};
/* A PARAGRAPH STARTS WITH A CAPITAL, and several of these begin on a
   spelled-out number: "nine clubs make up the division", "five of the 8 have
   never been played", "one fixture is already on the calendar", "eight
   matches on the record have no team sheet". Every band builds an array of
   sentences and renders it the same way, so the rule lives with the
   rendering rather than at forty push sites. */
const paras = (list) => list.map((x) => `<p>${cap(x)}</p>`).join('');
const plural = (n, one, many) => `${num(n)} ${n === 1 ? one : many}`;

/* ---- A BAR CHART, DRAWN IN SVG ------------------------------------------
   No library and no canvas: a viewBox, a rect per value and a label. It
   scales to whatever width the page gives it and prints at whatever the
   printer's resolution is, which a bitmap would not. */
export function barChart(rows, { max, label = '', unit = '' } = {}) {
  if (!rows.length) return '';
  const top = max || Math.max(...rows.map((r) => r.v), 1);
  const W = 640;
  const rowH = 26;
  const H = rows.length * rowH + 8;
  const gut = 132;
  return `<figure class="pg-chart">
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${attr(label
    + ': ' + rows.map((r) => `${r.k} ${r.v}`).join(', '))}">
      ${rows.map((r, i) => {
    const y = i * rowH + 4;
    const w = Math.max(2, (r.v / top) * (W - gut - 46));
    return `<text class="pg-chart__k" x="0" y="${y + 14}">${esc(r.k)}</text>
      <rect class="pg-chart__bar" x="${gut}" y="${y + 4}" width="${w.toFixed(1)}" height="14" rx="2"/>
      <text class="pg-chart__v" x="${(gut + w + 7).toFixed(1)}" y="${y + 15}">${esc(r.v)}${esc(unit)}</text>`;
  }).join('')}
    </svg>
    ${label ? `<figcaption>${esc(label)}</figcaption>` : ''}
  </figure>`;
}

/* ---- THE SEASON AS A RIBBON ---------------------------------------------
   One square per match in order, won, drawn or lost. It says in one glance
   what a table of thirty-three rows says slowly, and it is the shape of the
   season rather than a summary of it. */
export function formRibbon(matches, label) {
  if (!matches.length) return '';
  const box = 15;
  const gap = 3;
  const perRow = 22;
  const rows = Math.ceil(matches.length / perRow);
  const W = perRow * (box + gap);
  return `<figure class="pg-chart">
    <svg viewBox="0 0 ${W} ${rows * (box + gap) + 2}" role="img"
      aria-label="${attr(`${label}: ${matches.map((m) => m.outcome || '?').join(' ')}`)}">
      ${matches.map((m, i) => {
    const x = (i % perRow) * (box + gap);
    const y = Math.floor(i / perRow) * (box + gap);
    const cls = m.outcome === 'W' ? 'w' : m.outcome === 'D' ? 'd' : m.outcome === 'L' ? 'l' : 'n';
    return `<rect class="pg-rib pg-rib--${cls}" x="${x}" y="${y}" width="${box}" height="${box}" rx="2"/>`;
  }).join('')}
    </svg>
    <figcaption>${esc(label)}</figcaption>
  </figure>`;
}

/* ---- ONE PLAYER, AT LENGTH ----------------------------------------------
   Everything the record holds about a man, in sentences. Where he has played
   no competitive football for the club the paragraph says exactly that
   rather than printing a row of noughts, because a new signing with nothing
   behind him is a different thing from a player who did nothing. */
function playerPiece(p, stat, d, ctx = {}) {
  const s = stat || {};
  const apps = s.apps || 0;
  const bits = [];
  const name = p.name;
  const first = String(p.first || name.split(' ')[0]);
  const role = p.position && p.position !== 'Squad player' ? p.position.toLowerCase() : '';
  const signed = d.signedOn ? d.signedOn(p.num) : null;

  /* NOTHING IS ANNOUNCED AS MISSING. The first draft explained the club's
     counting rules inside every player's paragraph: the same two sentences
     about clean sheets and Man of the Match, twenty-three times. They are
     said once now, in the section about how the figures are counted, and a
     man with no goals simply is not described as having none. */
  if (!apps) {
    bits.push(`${name} has not played a competitive match for the club yet.`);
    if (role) bits.push(`He signs on as ${art(role)}.`);
    if (signed) bits.push(`He joined on ${fmtDate(signed, { long: true })}.`);
    bits.push('Everything he does here is still in front of him, and this season is where it '
      + 'starts.');
    /* Every sentence is pushed as its own fragment, and several of them now
     open on a spelled-out number ("twelve starts"), which is a sentence
     starting in lower case. Capitalising at the join keeps that in one place
     rather than at each of the thirty-odd push sites. */
  return bits.map(cap).join(' ');
  }

  /* An opening that varies with the man rather than a template repeated
     twenty-three times. */
  const open = [
    () => `${plural(apps, 'appearance', 'appearances')}${role ? `, ${role} by trade` : ''}.`,
    () => `${name} has ${plural(apps, 'appearance', 'appearances')} behind him${role ? ` as ${art(role)}` : ''}.`,
    () => `${cap(art(role || 'squad player'))} with `
      + `${plural(apps, 'appearance', 'appearances')} to his name.`,
  ][apps % 3]();
  bits.push(apps % 3 === 0 ? `${name}: ${open}` : open);

  /* HOW MANY OF THE APPEARANCES WERE OFF THE BENCH, which is `apps - starts`
     and is NOT `subApps`. `subApps` is every bench NAMING, used or not, which
     the suite says in as many words - so reading it here produced arithmetic
     nobody could believe: Samakab Nur "one appearance, one start, 20 off the
     bench", Jon Lloyd "19 appearances, 19 starts, three off the bench", and
     Stephen Potter's 16 and three against a total of 17. */
  const offBench = Math.max(0, apps - (s.starts || 0));
  if (s.starts && offBench) {
    bits.push(`${num(s.starts)} of them starts, ${num(offBench)} off the bench.`);
  }

  if (s.goals && s.assists) {
    bits.push(`${plural(s.goals, 'goal', 'goals')} and ${plural(s.assists, 'assist', 'assists')}: `
      + `a hand in ${plural(s.goals + s.assists, 'goal', 'goals')}.`);
  } else if (s.goals) {
    bits.push(`${plural(s.goals, 'goal', 'goals')}.`);
  } else if (s.assists) {
    /* Three players had the identical sentence in the first draft, which is
       the sort of thing that makes a document read like a template. It varies
       on the figure, which is stable across builds. */
    bits.push([
      `${plural(s.assists, 'assist', 'assists')}, none of the glory.`,
      `Sets them up rather than finishes them: ${plural(s.assists, 'assist', 'assists')}.`,
      `${plural(s.assists, 'assist', 'assists')} and still waiting on a first goal.`,
    ][s.assists % 3]);
  }

  if (s.goals && apps >= 5) {
    const per = s.goals / apps;
    /* "Roughly one every 1.0 outings" is what a formula says and not what a
       person says, and it read that way for the club's two best finishers.
       A rate at or about one a game gets said in words. */
    const every = 1 / per;
    if (per >= 1) bits.push(`${per.toFixed(2)} a game, which is a centre forward's number.`);
    else if (every < 1.15) bits.push('Very nearly a goal a game.');
    else if (per >= 0.4) {
      /* A whole number of matches is written as one, not as "2.0". */
      const near = Math.round(every);
      bits.push(Math.abs(every - near) < 0.06
        ? `Roughly one every ${num(near)} matches.`
        : `Roughly one every ${every.toFixed(1)} matches.`);
    }
  }
  if (s.goals && ctx.clubGoals) {
    const share = Math.round((s.goals / ctx.clubGoals) * 100);
    if (share >= 8) bits.push(`${share}% of everything the club has scored.`);
  }
  if (ctx.scorerRank) bits.push(`The club's ${ctx.scorerRank} scorer.`);
  else if (ctx.appsRank) bits.push(`${ctx.appsRank[0].toUpperCase()}${ctx.appsRank.slice(1)} on the appearance list.`);

  if (ctx.scoredIn && ctx.scoredIn.length) {
    const top = ctx.scoredIn.slice(0, 3)
      .map((g) => `${g.n > 1 ? `${num(g.n)} in the ` : 'the '}${g.scoreline} against ${g.opponent}`);
    /* "Among them" over a single goal is a plural promise the sentence does
       not keep, and eight players in the squad have scored once. */
    bits.push(s.goals > top.length
      ? `Among them ${top.join(', ')}.`
      : `${top.length > 1 ? 'They came in ' : 'It came in '}${top.join(', ')}.`);
  }

  const extras = [];
  if (s.motm) extras.push(`${plural(s.motm, 'Man of the Match award', 'Man of the Match awards')}`);
  if (s.captained) extras.push(`${plural(s.captained, 'match', 'matches')} as captain`);
  if (s.cleanSheets) extras.push(`${plural(s.cleanSheets, 'clean sheet', 'clean sheets')}`);
  if (s.keeperApps && s.saves) extras.push(`${plural(s.saves, 'save', 'saves')} in goal`);
  if (extras.length) bits.push(`${extras.join(', ')}.`);

  if (s.red) bits.push(`Sent off ${plural(s.red, 'time', 'times')}.`);
  else if (s.yellow >= 3) bits.push(`${plural(s.yellow, 'booking', 'bookings')}.`);
  else if (!s.yellow && apps >= 15) bits.push(`${apps} matches, never booked.`);

  if (signed && apps < 6) bits.push(`Joined ${fmtDate(signed, { long: true })}.`);
  if (p.bio) bits.push(String(p.bio).replace(/<[^>]+>/g, '').trim());

  /* Every sentence is pushed as its own fragment, and several of them now
     open on a spelled-out number ("twelve starts"), which is a sentence
     starting in lower case. Capitalising at the join keeps that in one place
     rather than at each of the thirty-odd push sites. */
  return bits.map(cap).join(' ');
}

/* ---- ONE MATCH, AT LENGTH -----------------------------------------------
   A paragraph rather than a line: the scoreline, who scored and who made it
   where the record says, the competition, and what the result was in the
   context of the run it sat in. Where the scorers were never written down the
   paragraph says exactly that, because "no goals recorded" and "nobody
   scored" are different facts and only one of them is true. */
function matchPiece(m, nameOf, ctx = {}) {
  const name = nameOf || ((n) => `Number ${n}`);
  const at = m.homeAway === 'Home' ? 'at The Reeves' : 'away';
  const when = fmtDate(m.date, { long: true });
  const clean = (x) => (x && !/cannot name/i.test(x) ? x : '');
  const bits = [];

  if (m.isWalkover) {
    return `<b>${esc(m.opponent)}, ${esc(when)}, ${at}.</b> Awarded. The opposition could not `
      + 'raise a side, the points came anyway and nobody kicked a ball.';
  }

  /* A SENTENCE THAT VARIES WITH THE MATCH. Thirty-three identical openings
     read like a machine wrote them, which is exactly what the club said about
     the first draft. The variation is chosen by the scoreline rather than at
     random, so the document is still the same on every build.

     AND ANYTHING THE RECORD DOES NOT HOLD IS LEFT OUT. The first draft
     announced every gap - no team sheet, no scorer, an assist it could not
     name - five times over in six paragraphs. A programme is not a data
     quality report: where there is nothing to say, it says nothing, and the
     state of the archive is discussed once, in its own section, by somebody
     who came looking for it. */
  const margin = (m.ourGoals || 0) - (m.theirGoals || 0);
  const head = `<b>${esc(m.opponent)}, ${esc(when)}, ${at}.</b>`;
  if (m.outcome === 'W') {
    if (margin >= 6) bits.push(`${head} ${esc(m.ourScoreline)}, and it was over early.`);
    else if (margin >= 3) bits.push(`${head} A comfortable ${esc(m.ourScoreline)}.`);
    else if (margin === 1) bits.push(`${head} ${esc(m.ourScoreline)}, and it stayed close to the end.`);
    else bits.push(`${head} Won ${esc(m.ourScoreline)}.`);
  } else if (m.outcome === 'D') {
    bits.push(`${head} ${esc(m.ourScoreline)}, honours even.`);
  } else if (m.outcome === 'L') {
    if (margin <= -4) bits.push(`${head} ${esc(m.ourScoreline)}. A chastening afternoon.`);
    else if (margin === -1) bits.push(`${head} ${esc(m.ourScoreline)}, and it turned on very little.`);
    else bits.push(`${head} Lost ${esc(m.ourScoreline)}.`);
  } else {
    bits.push(`${head} ${esc(m.ourScoreline || '')}`);
  }

  const detail = m.detail || {};
  const goals = (detail.goals || []).filter((g) => g && g.num != null);
  if (goals.length) {
    const tally = {};
    goals.forEach((g) => { tally[g.num] = (tally[g.num] || 0) + 1; });
    const said = Object.entries(tally).sort((a, b) => b[1] - a[1])
      .map(([n, c]) => `${name(n)}${c > 1 ? ` (${c})` : ''}`);
    const hat = Object.values(tally).some((c) => c >= 3);
    bits.push(hat
      ? `${said[0]} with a hat-trick${said.length > 1 ? `, and ${said.slice(1).join(', ')}` : ''}.`
      : `${said.length === 1 ? 'Scored by' : 'Scorers'}: ${said.join(', ')}.`);
    const named = [...new Set((detail.goals || [])
      .filter((g) => g && g.assist != null).map((g) => clean(name(g.assist))))].filter(Boolean);
    if (named.length) {
      bits.push(`${named.length === 1 ? 'Assist' : 'Assists'}: ${named.join(', ')}.`);
    }
  }

  if (m.theirGoals === 0 && (m.ourGoals || 0) > 0) {
    const k = clean(detail.keeper != null ? name(detail.keeper) : '');
    bits.push(k ? `A clean sheet, ${k} in goal.` : 'A clean sheet.');
  }

  const motm = clean(detail.motm != null ? name(detail.motm) : '');
  if (motm) bits.push(`${motm} took the Man of the Match.`);
  const capt = clean(detail.captain != null ? name(detail.captain) : '');
  if (capt) bits.push(`${capt} wore the armband.`);

  const reds = (detail.redCards || []).length;
  if (reds) bits.push(`${plural(reds, 'red card', 'red cards')}.`);
  if (m.venue && m.homeAway !== 'Home') bits.push(`Played at ${esc(m.venue)}.`);
  /* Every sentence is pushed as its own fragment, and several of them now
     open on a spelled-out number ("twelve starts"), which is a sentence
     starting in lower case. Capitalising at the join keeps that in one place
     rather than at each of the thirty-odd push sites. */
  return bits.map(cap).join(' ');
}

/* ==========================================================================
   THE SECTIONS

   Each returns a whole band. They are here rather than in the template
   because the template is the PAGE and these are the DOCUMENT: the website
   shows a cover and a download, and everything below is what the reader gets
   when they take it away.
   ========================================================================== */

const sec = (id, rail, ref, title, inner) => `<section class="sec pr-band" aria-labelledby="${id}">
    <div class="wrap">
      <div class="xrail" aria-hidden="true">
        <span class="xrail__l"><span class="xrail__n">${String(rail).padStart(2, '0')}</span>
          <span class="xrail__t">${esc(ref)}</span></span>
      </div>
      <h2 class="h2" id="${id}">${title}</h2>
      ${inner}
    </div>
  </section>`;

/* ---- WELCOME ------------------------------------------------------------- */
export function welcomeBand(d, m) {
  const us = (d.table || []).find((r) => r.us);
  const played = (d.matches || []).filter((x) => x.played);
  const seasons = [...new Set(played.map((x) => x.season))].length;
  const opener = !!(m && !(d.competitive || []).some((x) => x.season === m.season));
  const p = [];

  if (opener) {
    p.push('<b>This morning the waiting ends.</b>');
    p.push('A summer of preparation, a squad rebuilt, six friendlies and a step up two '
      + `divisions, and it all comes down to eleven o'clock on a Sunday at The Reeves.`);
    p.push(`${esc(m.opponent)} are the visitors and this is the opening match of `
      + `${esc(m.season)}: the first competitive fixture of the club's second full season, `
      + `and its first ever in ${esc(m.competition)}.`);
    p.push('Opening day is the one morning of the season when every club in the division is '
      + 'level. The table is empty. Nobody has a run to protect and nobody has a deficit to '
      + 'chase. Whatever anybody did last year, at eleven o’clock it is nought each.');
  } else {
    p.push(`Welcome to The Reeves, and welcome to ${esc(m ? m.competition : 'a new season')}.`);
    if (m) {
      p.push(`${esc(m.opponent)} are the visitors and kick-off is ${esc(m.kick || 'this morning')}.`);
    }
  }

  if (us) {
    p.push(`The club arrives here having won ${esc(d.titleDivision)} in ${esc(d.titleSeason)} `
      + `with a record of played ${us.played}, won ${us.won}, drawn ${us.drawn}, lost `
      + `${us.lost}. ${us.goalsFor} goals scored, ${us.goalsAgainst} conceded, ${us.points} `
      + `points from a possible ${us.played * 3}.`);
    p.push('That season is finished. It earned the club the right to be here and it will not '
      + 'win a header this morning. Three of those eighteen were walkovers that carry no '
      + 'score, which the club says out loud because it is the reason the other fifteen are '
      + 'worth believing.');
  }
  p.push(`${CLUB.name} has played ${plural(played.length, 'match', 'matches')} in total across `
    + `${plural(seasons, 'season', 'seasons')} since it was founded in 2025. This programme is `
    + 'a record of all of it: who is here, what they have done, where the club has been and '
    + 'who it is about to play.');
  p.push('Everything printed in it is counted from the club’s own match records rather than '
    + 'remembered, which is why there are no round numbers in it, and why, where something '
    + 'has not been written down, this programme says so instead of filling the gap.');
  p.push('Enjoy the match.');
  return sec('pg-welcome', 1, opener ? 'Opening day' : 'Welcome',
    opener ? 'Opening day<span class="volt">.</span>'
      : 'Welcome to The Reeves<span class="volt">.</span>',
    paras(p));
}

/* ---- THE OPPONENT, AT LENGTH --------------------------------------------- */
export function opponentBandLong(d, m, h2h, crest) {
  const nameOf = nameResolver(d);
  if (!m) return '';
  const p = [];
  p.push(`Today the club plays ${esc(m.opponent)}.`);
  if (h2h.tally.p) {
    p.push(`The two have met ${plural(h2h.tally.p, 'time', 'times')}. `
      + `${CLUB.name} has ${record(h2h.tally.w, h2h.tally.d, h2h.tally.l)}, `
      + `scoring ${h2h.tally.gf} and conceding ${h2h.tally.ga}.`);
    p.push('Every one of those meetings is listed below, taken from the club’s own records '
      + 'rather than from memory.');
  } else {
    p.push('It is a first meeting. There is no result, no team sheet and no previous '
      + 'scoreline against them anywhere in the club’s records, which means neither side has '
      + 'a form guide on the other and both are working from nothing.');
    p.push('That is worth stating plainly rather than filling with speculation. This '
      + 'programme does not know how they line up, who takes their free kicks or what they '
      + 'did last weekend, and it is not going to guess: the first honest paragraph about '
      + `${esc(m.opponent)} will be written after full time.`);
    if (h2h.related.length) {
      const others = [...new Set(h2h.related.map((x) => x.opponent))];
      p.push(`The club has played their ${esc(others.join(' and '))}. `
        + 'That is a different side and carries no record into this one, which is a '
        + 'distinction this website enforces rather than blurs: a result against one team '
        + 'is not a result against another that happens to share a name.');
    }
  }
  const list = h2h.met.length
    ? `<ul class="pg-runs">${h2h.met.slice().reverse().map((x) => `<li>${matchPiece(x, nameOf)}</li>`).join('')}</ul>`
    : '';
  return sec('pg-opp', 2, 'Today’s opponent', `${esc(m.opponent)}<span class="volt">.</span>`,
    paras(p) + list);
}

/* ---- THE SQUAD, MAN BY MAN ----------------------------------------------- */
export function squadBandLong(d, here) {
  const nameOf = nameResolver(d);
  const byNum = {};
  (d.players || []).forEach((x) => { byNum[String(x.num)] = x; });
  const clubGoals = (d.players || []).reduce((n, x) => n + (x.goals || 0), 0);
  const ord = (i) => ['leading', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh',
    'eighth', 'ninth', 'tenth'][i] || `${i + 1}th`;
  const scorers = (d.players || []).filter((x) => x.goals).sort((a, b) => b.goals - a.goals);
  const appsList = (d.players || []).filter((x) => x.apps).sort((a, b) => b.apps - a.apps);

  /* WHICH MATCHES HE SCORED IN, read off the match records rather than off a
     total, so the sentence names real afternoons. */
  const scoredIn = {};
  (d.matches || []).filter((x) => x.played).forEach((mm) => {
    const tally = {};
    ((mm.detail || {}).goals || []).forEach((g) => {
      if (g && g.num != null) tally[g.num] = (tally[g.num] || 0) + 1;
    });
    Object.entries(tally).forEach(([n, c]) => {
      (scoredIn[n] = scoredIn[n] || []).push({
        opponent: mm.opponent, scoreline: mm.ourScoreline, n: c, iso: mm.iso,
      });
    });
  });
  Object.values(scoredIn).forEach((l) => l.sort((a, b) => b.n - a.n));

  const GROUPS = [['gk', 'Goalkeepers'], ['def', 'Defenders'], ['mid', 'Midfielders'], ['fwd', 'Forwards']];
  const intro = `<p>${plural(here.length, 'player is', 'players are')} registered for the `
    + 'season. What follows is every one of them and what the club\u2019s records say: '
    + 'appearances, goals, assists, cards, clean sheets and the day they joined. Nobody is '
    + 'described here in a way the archive cannot support, and nobody is left out for being '
    + 'quiet.</p>'
    + '<p>Appearances count starts and any substitute the record can prove came on. A name on '
    + 'the bench with nothing beside it is not an appearance, which is why some of these '
    + 'figures are lower than a player might remember them being, and why they can only ever '
    + 'move upwards as the record improves.</p>';
  const body = GROUPS.map(([g, label]) => {
    const men = here.filter((x) => (x.positionGroup || '') === g);
    if (!men.length) return '';
    return `<h3 class="pg-h3">${esc(label)}</h3>`
      + men.map((x) => {
        const st = byNum[String(x.num)];
        const si = scorers.findIndex((y) => y.num === x.num);
        const ai = appsList.findIndex((y) => y.num === x.num);
        return `<div class="pg-player">
        <h4 class="pg-player__name">${x.slug
    ? `<a href="/players/${attr(x.slug)}.html">${esc(x.name)}</a>` : esc(x.name)}</h4>
        <p>${playerPiece(x, st, d, {
    nameOf,
    clubGoals,
    scorerRank: si > -1 && si < 6 ? ord(si) : '',
    appsRank: ai > -1 && ai < 5 ? ord(ai) : '',
    scoredIn: scoredIn[String(x.num)] || [],
  })}</p>
      </div>`;
      }).join('');
  }).join('');
  return sec('pg-squad', 3, 'The squad', 'Every man in the squad<span class="volt">.</span>',
    intro + body);
}

/* ---- LAST SEASON, MATCH BY MATCH ----------------------------------------- */
export function seasonBandLong(d) {
  const nameOf = nameResolver(d);
  const season = d.titleSeason;
  const comp = (d.competitive || []).filter((x) => x.season === season)
    .sort((a, b) => String(a.iso).localeCompare(String(b.iso)));
  if (!comp.length) return '';
  const us = (d.table || []).find((r) => r.us);
  const byComp = {};
  comp.forEach((x) => { (byComp[x.competition] = byComp[x.competition] || []).push(x); });

  let w = 0; let dr = 0; let l = 0; let gf = 0; let ga = 0;
  comp.forEach((x) => {
    gf += x.ourGoals || 0; ga += x.theirGoals || 0;
    if (x.outcome === 'W') w += 1; else if (x.outcome === 'D') dr += 1; else if (x.outcome === 'L') l += 1;
  });

  const p = [];
  p.push(`${esc(season)} was the club’s first full season and it produced `
    + `${plural(comp.length, 'competitive match', 'competitive matches')} across `
    + `${plural(Object.keys(byComp).length, 'competition', 'competitions')}. `
    + `Won ${w}, drawn ${dr}, lost ${l}. Scored ${gf}, conceded ${ga}.`);
  if (us) {
    p.push(`In the league itself the record was perfect: ${us.played} played, ${us.won} won, `
      + `${us.points} points, and a goal difference of ${us.goalsFor - us.goalsAgainst}. `
      + 'Three of those eighteen were awarded as walkovers and carry no score, so the ninety '
      + 'goals were scored in fifteen matches rather than eighteen. That is a detail worth '
      + 'keeping in front of the figure rather than behind it.');
  }
  p.push('What follows is every competitive match of that season in order, with the '
    + 'competition it was in and whether the scorers were written down at the time.');

  const monthCounts = {};
  comp.forEach((x) => {
    const mo = Number(String(x.iso || '').slice(5, 7)) - 1;
    if (mo >= 0) monthCounts[mo] = (monthCounts[mo] || 0) + (x.ourGoals || 0);
  });
  const chart = barChart(Object.keys(monthCounts).sort((a, b) => a - b)
    .map((k) => ({ k: MONTHS[k], v: monthCounts[k] })),
  { label: `Goals scored by month, ${season}` });

  const runs = Object.entries(byComp).map(([name, list]) => {
    const won = list.filter((x) => x.outcome === 'W').length;
    return `<h3 class="pg-h3">${esc(name)}</h3>
      <p>${cap(plural(list.length, 'match', 'matches'))}, ${num(won)} won. `
      + `${list.length === won ? 'Every one of them.' : ''}</p>
      <ul class="pg-runs">${list.map((x, i) => `<li>${matchPiece(x, nameOf, { index: i, total: list.length })}</li>`).join('')}</ul>`;
  }).join('');

  return sec('pg-season', 4, `${season} in full`,
    `The season that got the club here<span class="volt">.</span>`,
    paras(p)
    + formRibbon(comp, `Every competitive match of ${season}, in order`)
    + chart + runs);
}

/* ---- THE NUMBERS, AND WHAT THEY DO NOT COVER ----------------------------- */
export function numbersBand(d) {
  const players = (d.players || []).filter((x) => x.apps);
  const scorers = players.filter((x) => x.goals).sort((a, b) => b.goals - a.goals);
  const makers = players.filter((x) => x.assists).sort((a, b) => b.assists - a.assists);
  const apps = players.slice().sort((a, b) => b.apps - a.apps);
  const played = (d.matches || []).filter((x) => x.played && x.countsGoals);
  const home = played.filter((x) => x.homeAway === 'Home');
  const away = played.filter((x) => x.homeAway === 'Away');
  const sum = (list, f) => list.reduce((n, x) => n + (f(x) || 0), 0);

  /* COVERAGE, PRINTED BESIDE THE FIGURE. Four goals in the whole archive
     record where on the pitch they came from, so a share quoted off that
     would be a statistic about four goals wearing the clothes of a statistic
     about a hundred and forty. */
  const detailed = players.reduce((n, x) => n + ((x.goalsDetailed || []).length || 0), 0);
  const totalGoals = sum(players, (x) => x.goals);

  const p = [];
  p.push('Everything on this page is counted from team sheets and match records. Where the '
    + 'record does not carry something, this page says how much of it is missing rather than '
    + 'averaging over the gap.');
  p.push(`The club’s players have scored ${plural(totalGoals, 'goal', 'goals')} in competitive `
    + `football. ${detailed
      ? `${detailed} of those carry a note of how the goal was struck, which is ${
        Math.round((detailed / Math.max(1, totalGoals)) * 100)}% of them: too few to draw a `
        + 'share from, which is why this programme does not print one.'
      : 'None of them carries a note of how the goal was struck, so there is nothing here '
        + 'about headers, penalties or where on the pitch they came from.'}`);
  p.push(`At home the club has played ${plural(home.length, 'match', 'matches')}, scoring `
    + `${sum(home, (x) => x.ourGoals)} and conceding ${sum(home, (x) => x.theirGoals)}. `
    + `Away it has played ${plural(away.length, 'match', 'matches')}, scoring `
    + `${sum(away, (x) => x.ourGoals)} and conceding ${sum(away, (x) => x.theirGoals)}. `
    + 'Walkovers are excluded from both, because the published table adds no goals for one '
    + 'and neither does this.');

  const cards = sum(players, (x) => x.yellow);
  const reds = sum(players, (x) => x.red);
  p.push(`The club has been shown ${plural(cards, 'yellow card', 'yellow cards')}`
    + `${reds ? ` and ${plural(reds, 'red card', 'red cards')}` : ' and no red cards'} `
    + 'in competitive football, across every match on the record.');

  return sec('pg-numbers', 5, 'The numbers', 'What the record actually holds<span class="volt">.</span>',
    paras(p)
    + barChart(scorers.slice(0, 10).map((x) => ({ k: x.name, v: x.goals })),
      { label: 'Leading scorers, all competitive football' })
    + barChart(makers.slice(0, 8).map((x) => ({ k: x.name, v: x.assists })),
      { label: 'Most assists' })
    + barChart(apps.slice(0, 10).map((x) => ({ k: x.name, v: x.apps })),
      { label: 'Most appearances' }));
}

/* ---- THE DIVISION, CLUB BY CLUB ------------------------------------------ */
export function divisionBandLong(d, headToHead, crest) {
  const nameOf = nameResolver(d);
  const clubs = ((d.nextDivisionTable && d.nextDivisionTable.clubs) || [])
    .filter((c) => !/Sue.s Angels/i.test(c));
  if (!clubs.length) return '';
  const rows = clubs.map((c) => ({ club: c, h: headToHead(d, c) }));
  const never = rows.filter((x) => !x.h.tally.p && !x.h.related.length).length;
  const p = [];
  p.push(`${plural(clubs.length + 1, 'club makes', 'clubs make')} up the division this season, `
    + `so there are ${plural(clubs.length * 2, 'league match', 'league matches')} to play.`);
  p.push(`${num(never)} of the ${clubs.length} have never been played by this club at all. `
    + 'That is the honest headline for a side that has just come up two divisions: most of '
    + 'this league is unknown to it, and most of this league does not know it either.');
  const body = rows.map((x) => {
    const t = x.h.tally;
    const lines = [];
    if (t.p) {
      lines.push(`Played ${plural(t.p, 'time', 'times')}: ${record(t.w, t.d, t.l)}, `
        + `scoring ${t.gf} and conceding ${t.ga}.`);
      lines.push(`<ul class="pg-runs">${x.h.met.slice().reverse()
        .map((mm) => `<li>${matchPiece(mm, nameOf)}</li>`).join('')}</ul>`);
    } else if (x.h.related.length) {
      const others = [...new Set(x.h.related.map((mm) => mm.opponent))];
      lines.push(`Never played. The club has met their ${esc(others.join(' and '))}, which is `
        + 'a different side and carries no record into a fixture against this one.');
    } else {
      lines.push('Never played. Nothing in the archive, in any competition, in any season.');
    }
    const mark = crest ? crest(x.club) : '';
    return `<div class="pg-club">
      <h3 class="pg-h3 pg-h3--crest">${mark}<span>${esc(x.club)}</span></h3>
      ${lines.map((l) => (l.startsWith('<') ? l : `<p>${l}</p>`)).join('')}</div>`;
  }).join('');
  return sec('pg-div', 6, 'The division', 'Who else is in it<span class="volt">.</span>',
    paras(p) + body);
}

/* ---- THE CLUB'S OWN HONOURS AND RECORDS ---------------------------------- */
export function honoursBand(d) {
  const rec = (d.recognition || []);
  if (!rec.length) return '';
  const potm = rec.filter((r) => /potm/i.test(r.key || '') || /month/i.test(r.type || ''));
  const other = rec.filter((r) => !potm.includes(r));
  const p = [];
  p.push('The club keeps its own record of who it has picked out, month by month and season '
    + 'by season. It is a short list because the club is young, and it will be a long one.');
  /* WHO WON IT IS THE POINT, and the first version printed a season and
     nothing else. It read `r.title`, `r.player` and `r.who`, and the records
     carry none of the three for a Player of the Month: they carry `month`,
     `season` and a `playerId`, with `playerName` present and empty. So four
     of the entries printed as the bare text "25/26", and a leadership record
     - which has no title either, only the three captains by id - printed as
     a fifth. Resolved against the squad the same way everything else here
     resolves a number. */
  const nameOfNum = (id) => {
    const hit = (d.players || []).find((x) => Number(x.num) === Number(id));
    return hit ? hit.name : '';
  };
  /* `value` is a fallback for a record with no player, and on a trophy it
     restates the title - "League Ten Champions - Champions - 25/26". */
  const who = (r) => {
    const n = r.playerName || nameOfNum(r.playerId);
    if (n) return n;
    const v = String(r.value || '');
    return v && !String(r.title || '').toLowerCase().includes(v.toLowerCase()) ? v : '';
  };
  const line = (r) => {
    if (r.type === 'leadership') {
      const caps = [
        ['Club captain', r.clubCaptainName || nameOfNum(r.clubCaptainPlayerId)],
        ['Vice-captain', r.viceCaptainName || nameOfNum(r.viceCaptainPlayerId)],
        ['Third choice', r.thirdChoiceCaptainName || nameOfNum(r.thirdChoiceCaptainPlayerId)],
      ].filter(([, n]) => n).map(([lab, n]) => `${lab} ${n}`);
      return caps.length
        ? `<li>${esc(`The captaincy${r.season ? `, ${r.season}` : ''}`)} &middot; ${esc(caps.join(', '))}</li>`
        : '';
    }
    const label = r.title || r.name || r.award
      || (r.month ? `${r.month}${r.season ? ` ${r.season}` : ''}` : '');
    const bits = [label, who(r), r.month ? '' : r.season]
      .filter(Boolean).map((x) => esc(String(x)));
    return bits.length ? `<li>${bits.join(' &middot; ')}</li>` : '';
  };
  return sec('pg-honours', 7, 'Recognition', 'What the club has marked<span class="volt">.</span>',
    paras(p)
    + (potm.length ? `<h3 class="pg-h3">Player of the Month</h3>
        <ul class="pg-runs">${potm.map(line).join('')}</ul>` : '')
    + (other.length ? `<h3 class="pg-h3">Records and honours</h3>
        <ul class="pg-runs">${other.map(line).join('')}</ul>` : ''));
}

/* ---- THE GROUND ---------------------------------------------------------- */
export function groundBand(d) {
  const v = CLUB.venue;
  const home = (d.matches || []).filter((x) => x.played && x.homeAway === 'Home');
  const won = home.filter((x) => x.outcome === 'W').length;
  const p = [];
  p.push(`${esc(v.name)} on ${esc(v.street)} in ${esc(v.district)} is where the club trains `
    + 'through the week and plays every home fixture. It is shared with Staines Rugby Club, '
    + 'which is why they appear among the partners at the back of this programme as a '
    + 'partner club rather than as a commercial sponsor.');
  if (home.length) {
    p.push(`The club has played ${plural(home.length, 'match', 'matches')} here and won `
      + `${num(won)} of them.`);
  }
  p.push('There is no turnstile, no admission and no programme kiosk, which is the point of '
    + 'this one being a file rather than a booklet. Stand where you like, and if you are new, '
    + 'somebody will tell you which way we are kicking.');
  return sec('pg-ground', 8, 'The ground', 'Where we play<span class="volt">.</span>',
    paras(p));
}

/* ---- THE CAUSE ----------------------------------------------------------- */
export function causeBandLong() {
  const p = [];
  p.push(`${CLUB.name} was founded in 2025 in memory of ${CLUB.memorial.name}, who died of `
    + 'sepsis. The club plays for sepsis awareness.');
  p.push('That is the whole of it, and it does not need decorating. Sepsis is the body’s '
    + 'extreme response to an infection. It is treatable when it is caught early, and it is '
    + 'missed often enough that charities exist to teach people the signs.');
  p.push('This programme is not the place for medical advice and will not offer any. The UK '
    + 'Sepsis Trust does that properly, and their guidance is a search away. If reading this '
    + 'is the reason somebody looks it up, the club has done something useful with a Sunday '
    + 'morning.');
  p.push('The football is the football. It matters, the results matter, and the club is '
    + 'trying to win a league. But the badge carries a name, and every match played in it is '
    + 'a small argument that she is not forgotten.');
  return sec('pg-cause', 9, 'Why we play', 'In her name<span class="volt">.</span>',
    paras(p));
}

/* ---- PRE-SEASON, AT LENGTH ----------------------------------------------- */
export function preSeasonBandLong(d, season) {
  const nameOf = nameResolver(d);
  const list = (d.matches || []).filter((x) => x.played && x.friendly && x.season === season)
    .sort((a, b) => String(a.iso).localeCompare(String(b.iso)));
  if (!list.length) return '';
  let w = 0; let dr = 0; let l = 0; let gf = 0; let ga = 0; let away = 0;
  list.forEach((x) => {
    gf += x.ourGoals || 0; ga += x.theirGoals || 0;
    if (x.homeAway === 'Away') away += 1;
    if (x.outcome === 'W') w += 1; else if (x.outcome === 'D') dr += 1; else l += 1;
  });
  const p = [];
  p.push(`The club played ${plural(list.length, 'friendly', 'friendlies')} before this season `
    + `started, and ${record(w, dr, l)}, scoring ${gf} and conceding ${ga}. `
    + `${cap(num(away))} of the ${num(list.length)} were away from home.`);
  p.push('None of it counts towards anything and all of it was the point. Pre-season is not '
    + 'there to extend a record: it is there to give players minutes, to try combinations '
    + 'that might not work, and to find out what happens when a match goes badly. A summer of '
    + 'comfortable wins teaches a squad nothing it can use in October.');
  p.push('Friendlies are also counted differently everywhere on this website. Appearances, '
    + 'goals, assists and every career figure the club publishes are taken from competitive '
    + 'matches only, so a friendly eleven is credited to nobody however carefully it is '
    + 'written down. The results below are real; they simply do not enter anybody’s record.');
  return sec('pg-pre', 10, 'Pre-season', 'How the summer went<span class="volt">.</span>',
    paras(p)
    + formRibbon(list, 'Pre-season, in order')
    + `<ul class="pg-runs">${list.map((x) => `<li>${matchPiece(x, nameOf)}</li>`).join('')}</ul>`);
}

/* ---- WHERE THE CLUB CAME FROM -------------------------------------------- */
export function storyBand(d) {
  const played = (d.matches || []).filter((x) => x.played)
    .sort((a, b) => String(a.iso).localeCompare(String(b.iso)));
  if (!played.length) return '';
  const first = played[0];
  const firstWin = played.find((x) => x.outcome === 'W');
  const firstScored = played.find((x) => (x.ourGoals || 0) > 0);
  const biggest = played.slice()
    .sort((a, b) => ((b.ourGoals || 0) - (b.theirGoals || 0)) - ((a.ourGoals || 0) - (a.theirGoals || 0)))[0];
  const heaviest = played.slice()
    .sort((a, b) => ((b.theirGoals || 0) - (b.ourGoals || 0)) - ((a.theirGoals || 0) - (a.ourGoals || 0)))[0];
  const opponents = [...new Set(played.map((x) => clubIdentity(x.opponent || '')))].length;
  const venues = [...new Set(played.map((x) => x.venue).filter(Boolean))].length;

  const p = [];
  p.push(`${CLUB.name} was founded in 2025. Its first match on record was against `
    + `${esc(first.opponent)} on ${esc(fmtDate(first.date, { long: true }))}, `
    + `${first.homeAway === 'Home' ? 'at The Reeves' : 'away from home'}, and it finished `
    + `${esc(first.ourScoreline || 'without a recorded score')}.`);
  if (firstWin) {
    p.push(`The first win came against ${esc(firstWin.opponent)} on `
      + `${esc(fmtDate(firstWin.date, { long: true }))}, ${esc(firstWin.ourScoreline || '')}.`);
  }
  if (firstScored && firstScored !== firstWin) {
    p.push(`The first goal came against ${esc(firstScored.opponent)} on `
      + `${esc(fmtDate(firstScored.date, { long: true }))}.`);
  }
  p.push(`Since then the club has played ${plural(played.length, 'match', 'matches')} against `
    + `${plural(opponents, 'different club', 'different clubs')} at `
    + `${plural(venues, 'ground', 'grounds')}.`);
  if (biggest && (biggest.ourGoals - biggest.theirGoals) > 0) {
    p.push(`The biggest win is ${esc(biggest.ourScoreline)} against ${esc(biggest.opponent)}, `
      + `${esc(fmtDate(biggest.date, { long: true }))}.`);
  }
  if (heaviest && (heaviest.theirGoals - heaviest.ourGoals) > 0) {
    p.push(`The heaviest defeat is ${esc(heaviest.ourScoreline)} against `
      + `${esc(heaviest.opponent)}, ${esc(fmtDate(heaviest.date, { long: true }))}. `
      + 'It is in here because a club that only prints its wins is not keeping a record, it '
      + 'is keeping a scrapbook.');
  }
  p.push('None of this is very old. That is the point of writing it down now: the club is at '
    + 'the stage where every match is still a first of something, and in ten years this page '
    + 'will be the only place some of it survives.');
  return sec('pg-story', 11, 'The club', 'Where this club came from<span class="volt">.</span>',
    paras(p));
}

/* ---- HOW THIS PROGRAMME COUNTS ------------------------------------------- */
export function methodBand(d) {
  const played = (d.matches || []).filter((x) => x.played);
  const noSheet = played.filter((x) => !((x.detail || {}).starters || []).length).length;
  const p = [];
  p.push('Every figure in this programme is counted from the club’s own match records at '
    + 'the moment it was made. Nothing is typed in by hand, which means nothing in here can '
    + 'quietly go out of date while somebody forgets to update it, and it also means the '
    + 'programme is only ever as good as the records behind it.');
  p.push('So it is worth saying what those records do and do not hold.');
  p.push('<b>An appearance</b> is a start, or a substitute the record can prove came on. A '
    + 'name on the bench with nothing beside it is not counted. That is deliberately strict: '
    + 'it means the appearance figures are a floor rather than a guess, and it means they can '
    + 'rise when somebody fills a gap in.');
  p.push('<b>A walkover</b> counts as played and as three points and adds no goals, which is '
    + 'how the published league table treats one. Getting that wrong would move the club’s '
    + 'goal figures and its points figures out of step with the official standings.');
  p.push('<b>A friendly</b> counts for nothing in anybody’s career figures. The results are '
    + 'real and they are printed, but no appearance, goal or assist from one enters a '
    + 'player’s record.');
  const thin = noSheet
    ? `${plural(noSheet, 'match on the record has', 'matches on the record have')} no team `
      + 'sheet at all, so nobody is credited with playing in them. '
    : '';
  p.push('<b>Where the record is thin, this programme says so.</b> ' + thin
    + 'Some matches have a scoreline and no scorers. Where that is true the paragraph says '
    + 'the scorers were not written down, rather than leaving a blank that reads as though '
    + 'nobody scored.');
  p.push('None of this is an apology. A Sunday-league club keeping records this carefully is '
    + 'unusual, and the gaps are the price of writing down only what somebody actually saw.');
  return sec('pg-method', 12, 'How this is counted', 'A note on the figures<span class="volt">.</span>',
    paras(p));
}

/* ---- WHAT COMES NEXT ----------------------------------------------------- */
export function aheadBand(d, m) {
  const rest = (d.upcoming || []).filter((x) => !m || x.id !== m.id);
  const clubs = ((d.nextDivisionTable && d.nextDivisionTable.clubs) || []).length;
  const games = clubs ? (clubs - 1) * 2 : 0;
  const us = (d.table || []).find((r) => r.us);
  const p = [];

  p.push('A league season is long and this is the first morning of one.');
  if (games) {
    p.push(`${plural(games, 'league match', 'league matches')} will decide it, against `
      + `${plural(clubs - 1, 'other club', 'other clubs')}, most of which this club has never `
      + 'played. Add the cups and it is a winter of Sunday mornings.');
  }

  /* THE AMBITION, STATED WITHOUT PROMISING ANYTHING. What a club can honestly
     say before a ball is kicked is what it intends, not what it will achieve,
     and the difference matters on the day it goes wrong. */
  p.push('<b>So what is the season for?</b>');
  const unproven = us
    ? 'It won every league match it played last year and it has no idea what that is worth '
      + 'two divisions up. '
    : '';
  p.push('The honest answer is that nobody knows yet, and the club is not going to pretend '
    + 'otherwise on the first morning. This is a side that has never played a competitive '
    + 'match at this level. ' + unproven
    + 'Anybody telling you where it finishes in May is guessing.');
  p.push('What the club can say is what it is trying to do. Compete in every match rather '
    + 'than in the ones that suit it. Keep the standards that produced last season rather '
    + 'than the results, because the results were a consequence and the standards were the '
    + 'cause. Give minutes to the players who have earned them and to the ones who signed '
    + 'this summer without a season behind them. Finish the campaign as a stronger side than '
    + 'the one that starts it this morning.');
  p.push('Promotion again would be a remarkable thing and it is not a promise. Staying up '
    + 'comfortably and being a difficult afternoon for everybody in the division would be a '
    + 'good season by any measure, and it is the floor the squad has set itself rather than '
    + 'the ceiling.');
  p.push('There will be defeats. It is worth writing that down now, on the morning when the '
    + 'record is still perfect, because the measure of this group will not be whether it '
    + 'avoids a bad afternoon. It will be what it does the Sunday after one.');

  if (rest.length) {
    p.push(`${plural(rest.length, 'fixture is', 'fixtures are')} already on the calendar `
      + 'after today.');
  } else {
    p.push('Nothing beyond today is on the calendar yet. Fixtures appear on the website as '
      + 'the league publishes them, and this programme is rebuilt each time one does.');
  }
  const list = rest.length
    ? `<ul class="pg-runs">${rest.map((x) => `<li><b>${esc(x.opponent)}</b>, `
      + `${esc(fmtDate(x.date, { weekday: true, long: true }))}, ${esc(x.kick || '')}, `
      + `${esc(String(x.homeAway || '').toLowerCase())}. ${esc(x.competition)}.</li>`).join('')}</ul>`
    : '';
  return sec('pg-ahead', 13, 'What comes next', 'The season ahead<span class="volt">.</span>',
    paras(p) + list);
}

/* ---- WHAT TO WATCH FOR TODAY --------------------------------------------
   A milestone is the one thing a programme can honestly say about the future:
   not what will happen, but what is close enough that it might. Derived from
   the same figures as everything else, and only for players who are still at
   the club, because a claim about what somebody is about to do is a claim
   about somebody who is going to be on the pitch. */
export function watchBand(d, here) {
  const byNum = {};
  (d.players || []).forEach((x) => { byNum[String(x.num)] = x; });
  const near = [];
  const STEPS = [
    ['goals', [5, 10, 25, 50, 75, 100], 'goal', 'goals'],
    ['apps', [10, 25, 50, 75, 100], 'appearance', 'appearances'],
    ['assists', [5, 10, 25, 50], 'assist', 'assists'],
    ['motm', [3, 5, 10], 'Man of the Match award', 'Man of the Match awards'],
  ];
  here.forEach((p) => {
    const s = byNum[String(p.num)];
    if (!s) return;
    STEPS.forEach(([key, steps, one, many]) => {
      const have = s[key] || 0;
      const next = steps.find((t) => t > have);
      if (next && next - have <= 3 && have > 0) {
        near.push({ name: p.name, need: next - have, next, one, many, key });
      }
    });
  });
  near.sort((a, b) => a.need - b.need);

  const p = [];
  p.push('A programme cannot tell you what is going to happen this morning, and this one is '
    + 'not going to try. What it can do is point at the things that are close.');
  if (near.length) {
    p.push('These are the round numbers within reach of somebody in today’s squad. None of '
      + 'them is a prediction and several of them will still be sitting there in November, '
      + 'but if one goes this morning it is worth a cheer that the scoreboard will not give '
      + 'it.');
  } else {
    p.push('Nothing is within touching distance of a round number today, which happens: the '
      + 'squad has just turned over and most of the counters have been reset by a step up. '
      + 'They will start falling soon enough.');
  }
  const list = near.length
    ? `<ul class="pg-runs">${near.slice(0, 12).map((x) => `<li><b>${esc(x.name)}</b> is `
      + `${plural(x.need, x.one, x.many)} away from ${x.next} `
      + `${x.next === 1 ? x.one : x.many} for the club.</li>`).join('')}</ul>`
    : '';

  const scorers = (d.players || []).filter((x) => x.goals).sort((a, b) => b.goals - a.goals);
  const top = scorers[0];
  const second = scorers[1];
  if (top && second && here.some((h) => h.num === top.num)) {
    p.push(`At the top of the club’s scoring list, ${esc(top.name)} has `
      + `${plural(top.goals, 'goal', 'goals')}`
      + (here.some((h) => h.num === second.num)
        ? ` and ${esc(second.name)} is the nearest to him on ${second.goals}.`
        : '.'));
  }

  const played = (d.matches || []).filter((x) => x.played);
  const unbeaten = (() => {
    let n = 0;
    for (let i = played.length - 1; i >= 0; i -= 1) {
      if (played[i].outcome === 'L') break;
      n += 1;
    }
    return n;
  })();
  if (unbeaten >= 3) {
    p.push(`The club is ${plural(unbeaten, 'match', 'matches')} unbeaten across all football, `
      + 'friendlies included. A run is only ever a fact about the past and it is printed here '
      + 'as one.');
  }

  return sec('pg-watch', 14, 'Worth watching', 'What is close today<span class="volt">.</span>',
    paras(p) + list);
}

/* ---- THE COMPETITIONS ---------------------------------------------------- */
export function competitionsBand(d) {
  const comps = {};
  (d.competitive || []).forEach((x) => {
    const c = comps[x.competition] = comps[x.competition] || { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
    c.p += 1; c.gf += x.ourGoals || 0; c.ga += x.theirGoals || 0;
    if (x.outcome === 'W') c.w += 1; else if (x.outcome === 'D') c.d += 1; else if (x.outcome === 'L') c.l += 1;
  });
  const names = Object.keys(comps);
  if (!names.length) return '';
  const p = [];
  p.push(`The club has competed in ${plural(names.length, 'competition', 'competitions')} `
    + 'since it was formed: a league and a set of cups, each with its own character and its '
    + 'own way of ending a season early.');
  p.push('A cup is not a league. One bad morning removes you from it, which is why a club '
    + 'that goes unbeaten in a division can still lose a final, and why the two records below '
    + 'should be read as answers to different questions.');
  const body = names.map((n) => {
    const c = comps[n];
    return `<div class="pg-club"><h3 class="pg-h3">${esc(n)}</h3>
      <p>Played ${c.p}, won ${c.w}, drawn ${c.d}, lost ${c.l}. Scored ${c.gf}, conceded ${c.ga}.
      ${c.w === c.p ? 'Every match won.' : ''}
      ${c.l ? `The ${plural(c.l, 'defeat', 'defeats')} in this competition ${c.l === 1 ? 'is' : 'are'} part of the record and printed with the rest of it.` : ''}</p></div>`;
  }).join('');
  return sec('pg-comps', 15, 'The competitions', 'League and cup<span class="volt">.</span>',
    paras(p) + body);
}

/* ---- THE BACK PAGE ------------------------------------------------------- */
export function backBand(d, m) {
  const here = (d.squad || []).filter((p) => ['active', 'trial', 'injured', 'away'].includes(p.status));
  const p = [];
  p.push('<b>Thanks for coming.</b>');
  p.push('There is no turnstile at The Reeves and no admission, so the only way this club '
    + 'knows anybody was here is that they were. If you stood on the touchline this morning, '
    + 'you were part of it.');
  p.push('<b>Playing.</b> The club is always open to hearing from players. There are '
    + `${plural(here.length, 'man', 'men')} registered this season and a Sunday-league squad `
    + 'needs more than it thinks it does by January: work, holidays, injuries and life take '
    + 'their turn at everybody. If you can play, get in touch through the website.');
  p.push('<b>Sponsoring.</b> Everything this club does costs something. Pitch fees, match '
    + 'balls, referees, kit, first aid. The businesses at the back of this programme cover '
    + 'those, and there is room for more of them at every level from a shirt to a single '
    + 'match ball. It is a small amount of money for a real amount of visibility and a club '
    + 'that will thank you properly.');
  p.push('<b>Following.</b> Every result, every match report, every squad figure in this '
    + 'programme and a photograph library going back to the first season are on the website. '
    + 'It is updated the same day, and this programme is built from it, which is why the two '
    + 'can never disagree.');
  p.push('<b>This programme.</b> One is made for every match and they stay on the website '
    + 'afterwards, so a season builds into a set. It is free, it always will be, and it is '
    + 'assembled from the club’s own records rather than written from memory.');
  if (m) {
    p.push(`Next time out: ${esc((d.upcoming || []).filter((x) => x.id !== m.id)[0]
      ? `${(d.upcoming || []).filter((x) => x.id !== m.id)[0].opponent}, `
        + fmtDate((d.upcoming || []).filter((x) => x.id !== m.id)[0].date, { weekday: true, long: true })
      : 'to be confirmed')}.`);
  }
  p.push(`<b>${esc(CLUB.name)}</b> &middot; ${esc(CLUB.venue.name)}, ${esc(CLUB.venue.street)}, `
    + `${esc(CLUB.venue.district)} &middot; ${esc(CLUB.email || 'suesangelsfc@gmail.com')}`);
  p.push('Founded 2025, in memory of Susan Anne Martin. Playing for sepsis awareness.');
  return sec('pg-back', 16, 'Back page', 'Before you go<span class="volt">.</span>',
    paras(p));
}

/* ---- THE BADGE ----------------------------------------------------------- */
export function badgeBand(d) {
  const p = [];
  p.push('The crest is a shield, an angel and a date. Around the bottom of it runs the line '
    + 'the club took as its own: <b>what we do in life echoes in eternity</b>.');
  p.push(`It carries ${CLUB.founded}, which is when the club was founded, and it carries the `
    + 'name of a person rather than a place. Most clubs are named after a town. This one is '
    + `named after ${CLUB.memorial.name}, which is why the badge has a figure on it and why `
    + 'the club has never treated it as decoration.');
  p.push(`The colours are orange and black, and they are on everything: the shirt, this `
    + 'programme, the website, the graphics that go out after full time. A small club is '
    + 'recognised or it is not, and being recognisable costs nothing but consistency.');
  p.push(`${CLUB.nickname ? `The club is known as ${/^the /i.test(CLUB.nickname) ? '' : 'the '}${CLUB.nickname}. ` : ''}`
    + `It plays in ${CLUB.league}, out of ${CLUB.venue.district} in ${CLUB.town}, and it is a `
    + `${CLUB.type.charAt(0).toLowerCase()}${CLUB.type.slice(1)}.`);
  p.push('That is the whole identity, and it has not changed since the first Sunday. It is '
    + 'worth putting in the programme because clubs drift: a badge gets modernised, a colour '
    + 'gets softened, a motto gets dropped for being awkward. This one is written down here '
    + 'so that if it ever changes, somebody has to decide to change it.');
  return sec('pg-badge', 17, 'The badge', 'What is on the shirt<span class="volt">.</span>',
    paras(p));
}

/* ---- THE SEASON, TOLD RATHER THAN LISTED --------------------------------
   The match list is the record; this is the story it adds up to. Every claim
   in it is read off the same results, but a run of eighteen wins is not
   really eighteen facts, it is one long nerve, and a programme is the right
   place to say so. */
export function narrativeBand(d) {
  const season = d.titleSeason;
  const league = (d.competitive || [])
    .filter((x) => x.season === season && /League/i.test(x.competition || ''))
    .sort((a, b) => String(a.iso).localeCompare(String(b.iso)));
  const cups = (d.competitive || [])
    .filter((x) => x.season === season && !/League/i.test(x.competition || ''))
    .sort((a, b) => String(a.iso).localeCompare(String(b.iso)));
  if (!league.length) return '';

  const first = league[0];
  const last = league[league.length - 1];
  const scored = league.reduce((n, x) => n + (x.ourGoals || 0), 0);
  const tight = league.filter((x) => (x.ourGoals - x.theirGoals) === 1);
  const big = league.filter((x) => (x.ourGoals - x.theirGoals) >= 5);
  const walk = league.filter((x) => x.isWalkover);
  const conceded = league.filter((x) => (x.theirGoals || 0) > 0);
  const shutouts = league.length - walk.length - conceded.length;

  const p = [];
  p.push(`It began on ${esc(fmtDate(first.date, { long: true }))} against `
    + `${esc(first.opponent)} and finished on ${esc(fmtDate(last.date, { long: true }))} `
    + `against ${esc(last.opponent)}, and in between the club did not lose a league match.`);
  p.push('That sentence is easy to write and it was not an easy thing to do. A season is not '
    + 'won in the matches everybody expects to win. It is won on the mornings when the pitch '
    + 'is heavy, when eleven turn into nine by half past ten, and when the side in front of '
    + 'you has decided that being the team to beat the unbeaten team is worth a broken shin.');
  if (big.length) {
    p.push(`There were afternoons when it was over inside twenty minutes: `
      + `${plural(big.length, 'match', 'matches')} won by five or more, and `
      + `${scored} league goals across the campaign.`);
  }
  if (tight.length) {
    p.push(`And there were ${plural(tight.length, 'match', 'matches')} won by a single goal. `
      + 'Those are the ones that decide a title. A club that wins its big games and draws its '
      + 'awkward ones finishes third; this one kept finding a way through on the days when '
      + 'nothing came easily.');
  }
  if (shutouts > 0) {
    p.push(`At the back it conceded in only ${plural(conceded.length, 'league match', 'league matches')}, `
      + `keeping ${plural(shutouts, 'clean sheet', 'clean sheets')} across the season. `
      + 'Eleven goals conceded in a league campaign is the number that ought to travel worst '
      + 'between divisions, and it is the one this season will test first.');
  }
  if (walk.length) {
    p.push(`${plural(walk.length, 'fixture was', 'fixtures were')} awarded rather than played, `
      + 'which the club has never tried to hide and does not count as a goal either way. It '
      + 'is the reason the ninety were scored in fifteen matches rather than eighteen, and '
      + 'the reason the rest of the record is worth believing.');
  }
  if (cups.length) {
    const finalLost = cups.filter((x) => x.outcome === 'L').slice(-1)[0];
    p.push(`The cups ran alongside it: ${plural(cups.length, 'match', 'matches')} in knockout `
      + 'football, which is a different game from a league. A league forgives a bad morning '
      + 'and a cup does not.');
    if (finalLost) {
      p.push(`It ended against ${esc(finalLost.opponent)} on `
        + `${esc(fmtDate(finalLost.date, { long: true }))}, ${esc(finalLost.ourScoreline)}. `
        + 'A club in its first season reaching a final is worth more than the result of it, '
        + 'and the result is in this programme anyway, because a record that only keeps the '
        + 'good days is not a record.');
    }
  }
  p.push('None of it counts this morning. That is not false modesty, it is the league table: '
    + 'it is empty, and everybody in this division starts level with everybody else. What '
    + 'last season bought was the right to find out what this squad is worth two divisions '
    + 'higher, which is the only thing anybody here actually wanted.');

  return sec('pg-story2', 18, `${season}`, 'The season, and what it took<span class="volt">.</span>',
    paras(p));
}

/* ---- THE ANSWERS, AT THE BACK -------------------------------------------
   Where answers belong. Printing them beside the questions is the one thing
   a quiz page must not do, and the club said so. */
export function answersBand(questions, ws) {
  if (!questions.length && !(ws && ws.placed.length)) return '';
  const p = [];
  p.push('No peeking until you have had a go.');
  const q = questions.length
    ? `<h3 class="pg-h3">Half-time quiz</h3><ol class="pg-answers">${questions
      .map((x) => `<li>${esc(x.a)}</li>`).join('')}</ol>`
    : '';
  const w = ws && ws.placed.length
    ? `<h3 class="pg-h3">Word search</h3><p>The ${plural(ws.placed.length, 'name', 'names')} `
      + `hidden in the grid: ${ws.placed.map((n) => esc(n)).join(', ')}. `
      + 'They run across, down, diagonally and backwards.</p>'
      + (ws.where && ws.where.length
        ? `<ul class="pg-answers">${ws.where.map((x) => `<li>${esc(x.word)}: row `
          + `${x.r + 1}, column ${x.c + 1}, running ${esc(x.dir)}.</li>`).join('')}</ul>`
        : '')
    : '';
  return sec('pg-answers', 19, 'Answers', 'The answers<span class="volt">.</span>',
    paras(p) + q + w);
}

/* ---- THE CLUB'S OWN MATCH REPORTS ---------------------------------------
   Seven matches in the archive carry a report somebody sat down and wrote.
   They are the only prose in this programme that is not generated, and they
   are the best thing in it: a machine can count a scoreline and it cannot
   tell you what the second half felt like. */
export function reportsBand(d, hasReport, reportText, articleBody) {
  const withReport = (d.matches || [])
    .filter((m) => m.played && hasReport(m))
    .sort((a, b) => String(b.iso).localeCompare(String(a.iso)));
  if (!withReport.length) return '';
  const p = [];
  p.push(`${plural(withReport.length, 'match in the archive carries', 'matches in the archive carry')} `
    + 'a report somebody sat down and wrote afterwards. They are reprinted here in full.');
  p.push('Everything else in this programme is counted. These are not: they are the only '
    + 'pages in it written by a person, and they are the ones worth reading twice.');
  const body = withReport.map((m) => {
    const text = String(reportText(m) || '').replace(/^#+[^\n]*\n+/, '');
    if (!text.trim()) return '';
    return `<article class="pg-report">
      <h3 class="pg-h3">${esc(m.title || `${m.home} v ${m.away}`)}</h3>
      <p class="pg-report__meta">${esc(fmtDate(m.date, { long: true }))} &middot;
        ${esc(m.competition)} &middot; ${esc(m.homeAway)}</p>
      ${articleBody(text)}
    </article>`;
  }).join('');
  return sec('pg-reports', 20, 'Match reports', 'In their own words<span class="volt">.</span>',
    paras(p) + body);
}

/* ---- A CREST BESIDE A CLUB NAME ------------------------------------------
   The club asked for the opponents' badges. `clubCrest` resolves an uploaded
   badge, then the extra registry, then the recovered one, then a needle, and
   returns nothing it cannot find rather than a broken image. */
export function crestFor(name, badges, clubCrest, cls = 'pg-crest') {
  const out = clubCrest(name, badges, cls);
  return out || '';
}
