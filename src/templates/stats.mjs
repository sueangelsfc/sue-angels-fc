/* ==========================================================================
   PLAYER STATS  (/stats.html, "Player stats" under On the Pitch)

   Every player's season in one sortable, filterable table, plus the leaders
   picked out first so the page answers "who?" before it asks you to read
   thirty rows.

   The competition chips are real. Each row carries its own figures for every
   competition as a data attribute, and the script rewrites the cells and
   re-sorts in place. That matters: shipping only an all-competitions table
   and fetching the rest would make the page's content depend on a script,
   and rendering six tables would ship six times the markup. This way the
   document is complete and correct with the script blocked, and gains the
   filter when it runs.

   "Apps" again, and this time it is true. It said "Starts, not Apps" while
   the engine counted an appearance only from the eleven; an appearance is now
   a start or a substitute the record can prove was on the pitch. Unused bench
   outings keep their own column rather than being folded into a total nobody
   can verify, which is the part of that note that was right.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc, attr } from '../lib/html.mjs';
import { CLUB } from '../lib/club.mjs';
import { playerStats } from '../lib/stats.mjs';
import { siteFooter, sitePreMain, siteHeader } from './home.mjs';
import { sourceNote } from '../lib/blocks.mjs';

const STAR = '/assets/badge/sue-angels-badge-star.webp';
const ARROW = '<span aria-hidden="true">→</span>';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
/* Photographs resolve in ONE place, src/lib/dataset.mjs: the season's
   uploaded picture, then the most recent, then a file on disk only where the
   shirt number can be proved to belong to the player. Six templates each kept
   their own copy of the disk lookup, and it put a previous holder of number 12
   on a new signing's profile. */

const shortComp = (name) => String(name || '')
  .replace(/^Chipotle UK /, '')
  .replace(/^Supreme Trophies /, '')
  .replace(/^Surrey FA Sunday Lower Junior County Cup$/, 'Surrey FA Cup');

const rail = (n, label, ref) => `<div class="xrail" aria-hidden="true">
      <span class="xrail__l"><span class="xrail__n">${esc(String(n).padStart(2, '0'))}</span><span class="xrail__t">${esc(label)}</span></span>
      <span class="xrail__r">${esc(ref)}</span>
    </div>`;

const initial = (first) => (first ? `${first.charAt(0)}.` : '');

export function stats(d) {
  const shotFor = (num) => (d.shotFor ? d.shotFor(num, d.currentSeason) : '');
  const squad = d.squad || [];
  const byNum = new Map(squad.map((p) => [p.num, p]));
  /* COMPETITIVE ONLY. This whole page is player records, and it was built
     over `d.played`, which includes friendlies: the club's all-time goals
     printed as 139 against the 137 every other page derives, and a 26/27 tab
     offered "2 goals, shared between 2 players" from a pre-season friendly
     that counts towards nothing. A player's own profile has always excluded
     them, so the same man's totals disagreed with themselves across two
     pages. `d.competitive` is the list every figure is counted from. */
  const played = (d.competitive || []).filter((m) => m.played);

  /* One stats table per competition, plus the combined one. Computed here so
     the browser never has to, and so the figures come from the same engine as
     every other page. */
  const comps = [...new Set(played.map((m) => m.competition))]
    .map((name) => ({ key: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name, short: shortComp(name) }));

  const setFor = (matches) => new Map(playerStats(matches, squad).map((r) => [r.num, r]));
  const allSet = setFor(played);
  const compSets = comps.map((c) => ({ ...c, set: setFor(played.filter((m) => m.competition === c.name)) }));

  /* Season by season, and within each season by competition, so the tabs and
     the chips compose rather than fighting each other. 26/27 has no matches
     yet and correctly comes out as zeroes, which the tab says out loud. */
  const seasons = (d.seasons || []).map((sn) => {
    const ms = played.filter((m) => m.season === sn.name);
    return {
      name: sn.name,
      matches: ms,
      all: setFor(ms),
      byComp: comps.map((c) => ({ ...c, set: setFor(ms.filter((m) => m.competition === c.name)) })),
    };
  });

  const figures = (r) => [r.apps || 0, r.subApps || 0, r.goals || 0, r.assists || 0,
    (r.goals || 0) + (r.assists || 0), r.cleanSheets || 0, r.motm || 0];

  /* Anyone who was on a team sheet at all. A player with no involvement of
     any kind is not a row worth printing. */
  const rows = squad
    .map((p) => ({ p, r: allSet.get(p.num) || {} }))
    .filter(({ r }) => (r.starts || 0) + (r.subApps || 0) > 0)
    .sort((a, b) => ((b.r.goals || 0) + (b.r.assists || 0)) - ((a.r.goals || 0) + (a.r.assists || 0))
      || (b.r.goals || 0) - (a.r.goals || 0)
      || (b.r.apps || 0) - (a.r.apps || 0));

  const clubGoals = rows.reduce((n, x) => n + (x.r.goals || 0), 0);
  const clubAssists = rows.reduce((n, x) => n + (x.r.assists || 0), 0);
  const clubMotm = rows.reduce((n, x) => n + (x.r.motm || 0), 0);
  const maxGA = Math.max(1, ...rows.map((x) => (x.r.goals || 0) + (x.r.assists || 0)));

  const rowsFrom = (set) => squad
    .map((p) => ({ p, r: set.get(p.num) || {} }))
    .filter(({ r }) => (r.starts || 0) + (r.subApps || 0) > 0)
    .sort((a, b) => ((b.r.goals || 0) + (b.r.assists || 0)) - ((a.r.goals || 0) + (a.r.assists || 0))
      || (b.r.goals || 0) - (a.r.goals || 0)
      || (b.r.apps || 0) - (a.r.apps || 0));

  /* THE VIEWS. Every season the club has had, newest last, plus its whole
     history. "All seasons" is not a season and never says "not started": it
     is every match ever played, which is the right home for a club record. */
  const VIEWS = [
    ...seasons.map((sn) => ({
      key: sn.name, id: sn.name.replace(/\D/g, ''), label: sn.name,
      note: sn.matches.length ? `${sn.matches.length} matches` : 'Not started',
      /* The matches themselves, not only the derived rows: the competition
         chips count fixtures, not players. */
      matches: sn.matches,
      rows: rowsFrom(sn.all), heading: 'The season’s',
    })),
    {
      key: 'all', id: 'all', label: 'All seasons',
      note: `${played.length} matches`,
      matches: played,
      rows: rowsFrom(allSet), heading: 'The club’s',
    },
  ];

  /* Open on the most recent season that has matches, never on an empty one:
     landing the page on a season nobody has played yet shows a table of
     zeroes and reads as broken. */
  let defaultView = 0;
  VIEWS.forEach((v, i) => { if (v.key !== 'all' && v.rows.length) defaultView = i; });

  /* ================= HERO =================
     The eyebrow and the three tallies follow the season tab. They used to be
     the club's career totals under a fixed "By the numbers · 25/26", which
     was two claims about different things sitting next to each other. Every
     view's figures ride on the element and the tab rewrites them. */
  const tally = (viewRows) => [
    viewRows.reduce((n, x) => n + (x.r.goals || 0), 0),
    viewRows.reduce((n, x) => n + (x.r.assists || 0), 0),
    viewRows.reduce((n, x) => n + (x.r.motm || 0), 0),
  ];
  const heroTallyData = () => VIEWS.map((v) => ` data-tally-${v.id}="${attr(tally(v.rows).join(','))}"`).join('');
  const hero = `<section class="st-hero" aria-labelledby="st-h">
      <div class="wrap st-hero__grid">
        <div>
          <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> By the numbers ·
            <span data-hero-season>${esc(VIEWS[defaultView].label)}</span></p>
          <h1 class="st-hero__title" id="st-h">Player stats<span class="volt">.</span></h1>
          <p class="st-hero__lede">Every player's season, counted from the team sheets. Sort any
            column, filter by competition, and open anyone for their full profile.</p>
        </div>
        <dl class="st-tally glassbox" data-hero-tally${heroTallyData()}>
          <div><dt>Goals scored</dt><dd>${esc(tally(VIEWS[defaultView].rows)[0])}</dd></div>
          <div><dt>Assists made</dt><dd>${esc(tally(VIEWS[defaultView].rows)[1])}</dd></div>
          <div><dt>Man of the Match</dt><dd>${esc(tally(VIEWS[defaultView].rows)[2])}</dd></div>
        </dl>
      </div>
    </section>`;

  /* ================= 01 THE LEADERS =================
     Four names before thirty rows. A table answers "how many"; this answers
     "who", which is the question most people arrive with. */
  /* The card names whoever actually leads, always.

     An earlier pass forced four different faces by skipping a player already
     used, which turned a factual claim into a false one: Frazier leads both
     goals and Man of the Match, so the MOTM card started reading "Stewart
     Luwawa, 3" while Frazier sat on 5. Visual variety is not worth a wrong
     statement.

     Duplication is handled by MERGING instead: a player who leads two
     categories gets one card carrying both, which is a stronger thing to say
     than printing his face twice. Genuine ties are named rather than broken
     silently, because picking one of two players on thirteen clean sheets is
     an editorial decision the data does not support. */
  const CATS = [
    { key: 'goals', label: 'Top goalscorer', unit: 'goals' },
    { key: 'assists', label: 'Most assists', unit: 'assists' },
    { key: 'motm', label: 'Most Man of the Match', unit: 'awards' },
    { key: 'cleanSheets', label: 'Most clean sheets', unit: 'clean sheets' },
  ];

  /* WORKED OUT PER VIEW, not once for the club.

     The tabs below said 25/26 and 26/27 and the leaders above them never
     moved, because they were derived from every match the club has played
     while the heading read "The season's leaders". One of those two was
     wrong whichever tab you were on. So the same derivation runs for each
     season and for the club's whole history, and the tab picks which one is
     on screen. Same engine, shorter match list. */
  const leadersFrom = (viewRows) => {
    const wins = new Map();
    const ties = [];
    for (const cat of CATS) {
      const best = Math.max(0, ...viewRows.map((x) => x.r[cat.key] || 0));
      if (!best) continue;
      const holders = viewRows.filter((x) => (x.r[cat.key] || 0) === best);
      if (holders.length > 1) { ties.push({ ...cat, best, holders }); continue; }
      const who = holders[0];
      if (!wins.has(who.p.num)) wins.set(who.p.num, { ...who, cats: [] });
      wins.get(who.p.num).cats.push({ ...cat, v: best });
    }

    const tieCards = ties.map((t) => ({
      tie: true,
      v: t.best,
      label: t.label,
      names: t.holders.map((h) => h.p.name),
      holders: t.holders,
      sub: `${t.holders.length === 2 ? 'Both on' : `${t.holders.length} players on`} ${t.best} ${t.unit}`,
      extra: [],
    }));

    return [...wins.values()].map((w) => {
      const lead = w.cats[0];
      return {
        ...w,
        v: lead.v,
        label: w.cats.map((c) => c.label).join(' · '),
        sub: w.cats.length > 1
          ? w.cats.map((c) => `${c.v} ${c.unit}`).join(' and ')
          : `${lead.v} ${lead.unit} in ${w.r.apps} appearance${w.r.apps === 1 ? '' : 's'}`,
        extra: w.cats.slice(1),
      };
    }).sort((a, b) => b.cats.length - a.cats.length).concat(tieCards);
  };


  const leaderGrid = (leaders) => `<ul class="st-lead__grid">
          ${leaders.map((l, i) => {
    const shot = l.tie ? '' : shotFor(l.p.num);
    /* A tie shows both faces rather than a crest: the players exist, they are
       both named, and a blank badge was the weakest panel in the row. */
    const tieShots = l.tie ? (l.holders || []).map((h) => ({ n: h.p.name, src: shotFor(h.p.num) })) : [];
    /* alt="" throughout, and deliberately. The site's rule is that a
       photograph names its subject, because a face on a crest wall is the
       only label there is; here `st-lead__name` prints the name inside the
       same link, a few lines down, so naming the picture makes a screen
       reader read every leader twice. */
    const inner = `<span class="st-lead__shot${l.tie && tieShots.length > 1 ? ' is-split' : ''}">
                ${l.tie && tieShots.some((t) => t.src)
    ? tieShots.map((t) => (t.src
      ? `<img src="${attr(t.src)}" alt="" width="160" height="220" loading="lazy" decoding="async" />`
      : `<span class="st-lead__blank"><img src="${STAR}" alt="" width="70" height="87" loading="lazy" decoding="async" /></span>`)).join('\n                ')
    : shot
      ? `<img src="${attr(shot)}" alt="" width="220" height="220" loading="lazy" decoding="async" />`
      : `<img class="st-lead__crest" src="${STAR}" alt="" width="120" height="149" loading="lazy" decoding="async" />`}
              </span>
              <span class="st-lead__body">
                <span class="st-lead__k">${esc(l.label)}</span>
                <span class="st-lead__v">${esc(l.v)}${l.extra.length
    ? l.extra.map((c) => `<i>${esc(c.v)}</i>`).join('') : ''}</span>
                <span class="st-lead__name">${l.tie
    ? l.names.map((n) => esc(n)).join('<span class="st-lead__amp"> &amp; </span>')
    : esc(l.p.name)}</span>
                <span class="st-lead__sub">${esc(l.sub)}</span>
              </span>`;
    /* A tie has no single player to link to, so it is a card, not a link. */
    return `<li class="st-lead${l.tie ? ' is-tie' : ''}" style="--i:${i}">
            ${l.tie ? `<span class="st-lead__link">${inner}</span>`
    : `<a class="st-lead__link" href="/players/${attr(l.p.slug)}.html">${inner}</a>`}
          </li>`;
  }).join('\n          ')}
        </ul>`;

  /* ================= 02 THE TABLE ================= */
  const COLS = [
    { k: 'apps', label: 'Ap', full: 'Appearances', i: 0 },
    { k: 'bench', label: 'Bn', full: 'On the bench', i: 1 },
    { k: 'goals', label: 'G', full: 'Goals', i: 2 },
    { k: 'assists', label: 'A', full: 'Assists', i: 3 },
    { k: 'ga', label: 'G+A', full: 'Goals and assists', i: 4 },
    { k: 'cs', label: 'CS', full: 'Clean sheets', i: 5 },
    { k: 'motm', label: 'MOTM', full: 'Man of the Match', i: 6 },
  ];


  const seasonTabs = VIEWS.length > 1 ? `<div class="st-seasons" data-season-chips>
          ${VIEWS.map((v, i) => `<a class="st-season${i === defaultView ? ' is-on' : ''}"
            href="#table" data-season="${attr(v.key)}" data-view="${attr(v.id)}">
            <b>${esc(v.label)}</b><i>${esc(v.note)}</i>
          </a>`).join('\n          ')}
        </div>` : '';

  /* One band, one panel per view, all of them in the HTML. The tab shows the
     matching panel. With the script blocked the default season's leaders are
     what ship visible, which is a correct page rather than an empty one. */
  const leadersBand = VIEWS.some((v) => v.rows.length)
    ? `<section class="sec st-leaders" aria-labelledby="st-lead-h" data-leader-views>
      <div class="wrap">
        ${rail(1, 'Who led the way', `${VIEWS[defaultView].rows.length} players used`)}
        <h2 class="h2 rv" id="st-lead-h"><span data-leader-heading>${esc(VIEWS[defaultView].heading)}</span>
          <span class="volt">leaders.</span></h2>
        ${VIEWS.map((v, i) => `<div class="st-lead__view rv" data-leader-view="${attr(v.id)}"
          data-players-used="${attr(v.rows.length)}" data-heading="${attr(v.heading)}"${i === defaultView ? '' : ' hidden'}>
          ${v.rows.length
    ? leaderGrid(leadersFrom(v.rows))
    : `<p class="st-lead__none">Nobody has played a ${esc(v.label)} match yet. The leaders
              for this season will appear here once the first result is in.</p>`}
        </div>`).join('\n        ')}
      </div>
    </section>` : '';

  const tools = `<div class="st-tools">
          <label class="st-search">
            <span class="sr-only">Search for a player by name</span>
            <svg class="ico" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.6" />
              <line x1="11" y1="11" x2="14.5" y2="14.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
            <input type="search" id="st-find" aria-label="Find a player by name"
              placeholder="Find a player" data-player-search autocomplete="off" />
          </label>
          <div class="st-mode" data-mode-switch>
            <a class="st-mode__b is-on" href="#table" data-mode="total">Totals</a>
            <a class="st-mode__b" href="#table" data-mode="rate">Per start</a>
          </div>
        </div>`;

  /* THE COMPETITIONS FOLLOW THE SEASON TAB.
     They were the club's whole history regardless: pick 26/27, a season with
     no matches in it, and the row still offered League Ten 18, Dylan Rigobert
     Trophy 5, Chairman's Cup 4. Every count is a filter that would return
     nothing.

     A competition the club did not play that season is hidden rather than
     shown as a nought, and every view's counts ride on the chip so switching
     season is a rewrite rather than a fetch. */
  const compCount = (v, name) => v.matches.filter((m) => m.competition === name).length;
  const compData = (name) => VIEWS
    .map((v) => ` data-n-${v.id}="${attr(name === null ? v.matches.length : compCount(v, name))}"`).join('');
  const v0 = VIEWS[defaultView];
  const chips = `<div class="st-chips" data-comp-chips>
          <a class="st-chip is-on" href="#table" data-comp="all"${compData(null)}>All competitions<span>${esc(v0.matches.length)}</span></a>
          ${compSets.map((c) => `<a class="st-chip" href="#table" data-comp="${attr(c.key)}"${compData(c.name)}${compCount(v0, c.name) ? '' : ' hidden'}>${esc(c.short)}<span>${esc(compCount(v0, c.name))}</span></a>`).join('\n          ')}
        </div>`;

  const tableBand = `<section class="sec st-table" id="table" aria-labelledby="st-tbl-h">
      <div class="wrap">
        ${rail(2, 'Everyone', `${rows.length} players`)}
        <h2 class="h2 rv" id="st-tbl-h">Every player, every <span class="volt">number.</span></h2>
        ${seasonTabs}
        ${chips}
        ${tools}
        <div class="st-tablewrap rv">
          <table class="st-tbl" data-stats-table>
            <caption class="sr-only">${esc(CLUB.name)} player statistics, ${esc(d.currentSeason)}.
              Sortable by any column.</caption>
            <thead>
              <tr>
                <th scope="col" class="st-tbl__pos">#</th>
                <th scope="col" class="st-tbl__who">Player</th>
                ${COLS.map((c) => `<th scope="col" data-sort="${c.i}" aria-sort="none">
                  <abbr title="${attr(c.full)}">${esc(c.label)}</abbr>
                </th>`).join('\n                ')}
              </tr>
            </thead>
            <tbody>
              ${rows.map(({ p, r }, i) => {
    const shot = shotFor(p.num);
    const ga = (r.goals || 0) + (r.assists || 0);
    /* Every competition's figures ride on the row, so the filter is a
       rewrite rather than a fetch. */
    const data = { all: { all: figures(r) } };
    for (const c of compSets) data.all[c.key] = figures(c.set.get(p.num) || {});
    for (const sn of seasons) {
      data[sn.name] = { all: figures(sn.all.get(p.num) || {}) };
      for (const c of sn.byComp) data[sn.name][c.key] = figures(c.set.get(p.num) || {});
    }
    return `<tr data-name="${attr(p.name.toLowerCase())}" data-figures="${attr(JSON.stringify(data))}">
                <td class="st-tbl__pos">${esc(i + 1)}</td>
                <th scope="row" class="st-tbl__who">
                  <a href="/players/${attr(p.slug)}.html">
                    <span class="st-tbl__face">${shot
    ? `<img src="${attr(shot)}" alt="${attr(p.name || '')}" width="30" height="30" loading="lazy" decoding="async" />`
    : `<img class="st-tbl__crest" src="${STAR}" alt="Sue’s Angels FC star" width="18" height="22" loading="lazy" decoding="async" />`}</span>
                    <i>${esc(initial(p.first))}</i>
                    <b>${esc(p.last)}</b>
                  </a>
                </th>
                <td>${esc(r.apps || 0)}</td>
                <td>${esc(r.subApps || 0)}</td>
                <td>${esc(r.goals || 0)}</td>
                <td>${esc(r.assists || 0)}</td>
                <td class="st-tbl__ga">
                  <span class="st-tbl__bar" aria-hidden="true"><i style="--w:${Math.round((ga / maxGA) * 100)}%"></i></span>
                  <b>${esc(ga)}</b>
                </td>
                <td>${esc(r.cleanSheets || 0)}</td>
                <td>${esc(r.motm || 0)}</td>
              </tr>`;
  }).join('\n              ')}
            </tbody>
          </table>
          <p class="st-empty" data-stats-empty hidden><b data-empty-msg>No player matches that filter.</b></p>
        </div>
        <p class="st-note">An appearance is a start, or a substitute the match record shows was on
          the pitch. Sunday-league returns do not always record who came on, so a name on the bench
          with nothing beside it is counted in the bench column and not as an appearance.</p>
      </div>
    </section>`;

  /* ================= 03 WHERE THE GOALS CAME FROM =================
     Thirty rows tell you the order. This tells you the shape: how much of the
     club's scoring sat with how few players.

     PER VIEW, like the leaders above. This counted every goal the club has
     ever scored under a heading sitting directly beneath tabs that said
     25/26 and 26/27, so it answered a question nobody had asked on either of
     them. Same derivation, one view's rows at a time. */
  const shareOf = (viewRows) => {
    const goals = viewRows.reduce((n, x) => n + (x.r.goals || 0), 0);
    const scorers = viewRows.filter((x) => (x.r.goals || 0) > 0)
      .sort((a, b) => (b.r.goals || 0) - (a.r.goals || 0));
    if (!goals) return { goals: 0, scorers, share: [], topFive: 0 };
    let running = 0;
    const share = scorers.map((x) => {
      running += x.r.goals;
      return { ...x, pct: (x.r.goals / goals) * 100, cum: (running / goals) * 100 };
    });
    return { goals, scorers, share, topFive: share.slice(0, 5).reduce((n, x) => n + x.r.goals, 0) };
  };

  const sharePanel = (v) => {
    const { goals, scorers, share, topFive } = shareOf(v.rows);
    if (share.length < 1) {
      return `<p class="st-lede">No goals recorded for ${esc(v.label)} yet. This fills in as
          results come in.</p>`;
    }
    return `<p class="st-lede">${esc(goals)} goal${goals === 1 ? '' : 's'}${v.key === 'all'
      ? ' across every season the club has played' : ` in ${esc(v.label)}`}, shared between
          ${esc(scorers.length)} player${scorers.length === 1 ? '' : 's'}.${share.length > 5
      ? ` The top five scored ${esc(topFive)} of them, ${esc(Math.round((topFive / goals) * 100))}% of the return.`
      : ''}</p>
        <!-- .rv is not decoration here: the rule that gives every segment its
             width is gated on this bar carrying is-in, so without it the bar
             draws completely empty. -->
        <ol class="st-share__bar rv" aria-label="Share of the club's goals by player">
          ${share.map((x, i) => `<li style="--w:${x.pct.toFixed(2)}%;--i:${i}"
            title="${attr(`${x.p.name}: ${x.r.goals} goals`)}">
            <span class="sr-only">${esc(x.p.name)}, ${esc(x.r.goals)} goals</span>
          </li>`).join('\n          ')}
        </ol>
        <ol class="st-share__key">
          ${share.slice(0, 6).map((x, n) => `<li>
            <span class="st-share__sw" aria-hidden="true" style="--o:${(1 - n * 0.13).toFixed(2)}"></span>
            <b>${esc(x.p.last)}</b>
            <i>${esc(x.r.goals)}</i>
          </li>`).join('\n          ')}
          ${share.length > 6 ? `<li><span class="st-share__sw is-rest" aria-hidden="true"></span>
            <b>${esc(share.length - 6)} others</b>
            <i>${esc(share.slice(6).reduce((n, x) => n + x.r.goals, 0))}</i></li>` : ''}
        </ol>`;
  };

  const shareBand = VIEWS.some((v) => shareOf(v.rows).share.length > 3)
    ? `<section class="sec st-share" aria-labelledby="st-share-h" data-share-views>
      <div class="wrap">
        ${rail(3, 'Where the goals came from',
    `${shareOf(VIEWS[defaultView].rows).scorers.length} scorers`)}
        <h2 class="h2 rv" id="st-share-h">Who scored them<span class="volt">.</span></h2>
        ${VIEWS.map((v, i) => `<div class="st-share__view rv" data-share-view="${attr(v.id)}"
          data-scorers="${attr(shareOf(v.rows).scorers.length)}"${i === defaultView ? '' : ' hidden'}>
          ${sharePanel(v)}
        </div>`).join('\n        ')}
      </div>
    </section>` : '';

  /* ================= CTA ================= */
  const ctaBand = `<section class="sec sec--cta st-cta" aria-labelledby="st-cta-h">
      <div class="wrap">
        <div class="cta2">
          <span class="cta2__glow" aria-hidden="true"></span>
          <img class="cta2__badge" src="${STAR}" alt="Sue’s Angels FC star" width="500" height="620" loading="lazy" decoding="async" aria-hidden="true" />
          <div class="cta2__glass glassbox rv">
            <p class="eyebrow cta2__eyebrow">Want to play here?</p>
            <h2 class="h2" id="st-cta-h">Trials are open for <span class="volt">${esc(d.nextSeason)}.</span></h2>
            <p class="cta2__sub">Think you can wear the shirt? Register your interest and we will be
              in touch with dates.</p>
            <div class="cta2__btns">
              <a class="btn btn--volt" href="/join.html">Apply for a trial ${ARROW}</a>
              <a class="btn btn--ghost" href="/squad.html">Meet the squad</a>
            </div>
          </div>
        </div>
      </div>
    </section>`;

  return {
    body: siteHeader('/stats.html') + hero + leadersBand + tableBand + shareBand + ctaBand + sourceNote(['fulltime', 'surreyfa']),
    bodyClass: 'is-home is-sub is-stats',
    css: 'home.css',
    shell: 'home',
    preMain: sitePreMain(),
    footerHtml: siteFooter(),
    schema: [{
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Player stats · ${CLUB.name}`,
      breadcrumb: {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${CLUB.site}/` },
          { '@type': 'ListItem', position: 2, name: 'Player stats', item: `${CLUB.site}/stats.html` },
        ],
      },
    }],
  };
}
