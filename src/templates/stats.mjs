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

   "Starts", not "Apps", as everywhere else: the engine counts an appearance
   only when a player is named in the eleven, because Sunday-league returns do
   not record who came off the bench. Bench outings get their own column
   rather than being folded into a total nobody can verify.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc, attr } from '../lib/html.mjs';
import { CLUB } from '../lib/club.mjs';
import { playerStats } from '../lib/stats.mjs';
import { siteFooter, sitePreMain, siteHeader, auraFor } from './home.mjs';

const STAR = '/assets/badge/sue-angels-badge-star.webp';
const ARROW = '<span aria-hidden="true">→</span>';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const shotFor = (num) => {
  try {
    return fs.existsSync(path.join(ROOT, 'assets', 'players', `${num}.webp`))
      ? `/assets/players/${num}.webp` : '';
  } catch { return ''; }
};

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
  const squad = d.squad || [];
  const byNum = new Map(squad.map((p) => [p.num, p]));
  const played = (d.played || []).filter((m) => m.played);

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

  const figures = (r) => [r.starts || 0, r.subApps || 0, r.goals || 0, r.assists || 0,
    (r.goals || 0) + (r.assists || 0), r.cleanSheets || 0, r.motm || 0];

  /* Anyone who was on a team sheet at all. A player with no involvement of
     any kind is not a row worth printing. */
  const rows = squad
    .map((p) => ({ p, r: allSet.get(p.num) || {} }))
    .filter(({ r }) => (r.starts || 0) + (r.subApps || 0) > 0)
    .sort((a, b) => ((b.r.goals || 0) + (b.r.assists || 0)) - ((a.r.goals || 0) + (a.r.assists || 0))
      || (b.r.goals || 0) - (a.r.goals || 0)
      || (b.r.starts || 0) - (a.r.starts || 0));

  const clubGoals = rows.reduce((n, x) => n + (x.r.goals || 0), 0);
  const clubAssists = rows.reduce((n, x) => n + (x.r.assists || 0), 0);
  const clubMotm = rows.reduce((n, x) => n + (x.r.motm || 0), 0);
  const maxGA = Math.max(1, ...rows.map((x) => (x.r.goals || 0) + (x.r.assists || 0)));

  /* ================= HERO ================= */
  const hero = `<section class="st-hero" aria-labelledby="st-h">
      <div class="wrap st-hero__grid">
        <div>
          <p class="eyebrow"><i class="eyebrow__dash" aria-hidden="true"></i> By the numbers · ${esc(d.currentSeason)}</p>
          <h1 class="st-hero__title" id="st-h">Player stats<span class="volt">.</span></h1>
          <p class="st-hero__lede">Every player's season, counted from the team sheets. Sort any
            column, filter by competition, and open anyone for their full profile.</p>
        </div>
        <dl class="st-tally glassbox">
          <div><dt>Goals scored</dt><dd>${esc(clubGoals)}</dd></div>
          <div><dt>Assists made</dt><dd>${esc(clubAssists)}</dd></div>
          <div><dt>Man of the Match</dt><dd>${esc(clubMotm)}</dd></div>
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

  const wins = new Map();
  const ties = [];
  for (const cat of CATS) {
    const best = Math.max(0, ...rows.map((x) => x.r[cat.key] || 0));
    if (!best) continue;
    const holders = rows.filter((x) => (x.r[cat.key] || 0) === best);
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

  const leaders = [...wins.values()].map((w) => {
    const lead = w.cats[0];
    return {
      ...w,
      v: lead.v,
      label: w.cats.map((c) => c.label).join(' · '),
      sub: w.cats.length > 1
        ? w.cats.map((c) => `${c.v} ${c.unit}`).join(' and ')
        : `${lead.v} ${lead.unit} in ${w.r.starts} starts`,
      extra: w.cats.slice(1),
    };
  }).sort((a, b) => b.cats.length - a.cats.length).concat(tieCards);

  const leadersBand = leaders.length ? `<section class="sec st-leaders" aria-labelledby="st-lead-h">
      <div class="wrap">
        ${rail(1, 'Who led the way', `${rows.length} players used`)}
        <h2 class="h2 rv" id="st-lead-h">The season's <span class="volt">leaders.</span></h2>
        <ul class="st-lead__grid rv">
          ${leaders.map((l, i) => {
    const shot = l.tie ? '' : shotFor(l.p.num);
    /* A tie shows both faces rather than a crest: the players exist, they are
       both named, and a blank badge was the weakest panel in the row. */
    const tieShots = l.tie ? (l.holders || []).map((h) => ({ n: h.p.name, src: shotFor(h.p.num) })) : [];
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
        </ul>
      </div>
    </section>` : '';

  /* ================= 02 THE TABLE ================= */
  const COLS = [
    { k: 'starts', label: 'St', full: 'Starts', i: 0 },
    { k: 'bench', label: 'Bn', full: 'On the bench', i: 1 },
    { k: 'goals', label: 'G', full: 'Goals', i: 2 },
    { k: 'assists', label: 'A', full: 'Assists', i: 3 },
    { k: 'ga', label: 'G+A', full: 'Goals and assists', i: 4 },
    { k: 'cs', label: 'CS', full: 'Clean sheets', i: 5 },
    { k: 'motm', label: 'MOTM', full: 'Man of the Match', i: 6 },
  ];

  /* Open on the most recent season that has matches, never on an empty one:
     landing the page on a season nobody has played yet shows a table of
     zeroes and reads as broken. */
  let defaultSeason = 0;
  seasons.forEach((sn, i) => { if (sn.matches.length) defaultSeason = i; });

  const seasonTabs = seasons.length > 1 ? `<div class="st-seasons" data-season-chips>
          ${seasons.map((sn, i) => `<a class="st-season${i === defaultSeason ? ' is-on' : ''}"
            href="#table" data-season="${attr(sn.name)}">
            <b>${esc(sn.name)}</b><i>${sn.matches.length ? `${sn.matches.length} matches` : 'Not started'}</i>
          </a>`).join('\n          ')}
        </div>` : '';

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

  const chips = `<div class="st-chips" data-comp-chips>
          <a class="st-chip is-on" href="#table" data-comp="all">All competitions<span>${esc(played.length)}</span></a>
          ${compSets.map((c) => `<a class="st-chip" href="#table" data-comp="${attr(c.key)}">${esc(c.short)}<span>${esc(played.filter((m) => m.competition === c.name).length)}</span></a>`).join('\n          ')}
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
    ? `<img src="${attr(shot)}" alt="" width="30" height="30" loading="lazy" decoding="async" />`
    : `<img class="st-tbl__crest" src="${STAR}" alt="" width="18" height="22" loading="lazy" decoding="async" />`}</span>
                    <i>${esc(initial(p.first))}</i>
                    <b>${esc(p.last)}</b>
                  </a>
                </th>
                <td>${esc(r.starts || 0)}</td>
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
        <p class="st-note">Starts are the eleven named on each team sheet. Sunday-league returns do
          not record who came off the bench, so bench outings are counted separately rather than
          folded into an appearance total we cannot verify.</p>
      </div>
    </section>`;

  /* ================= 03 WHERE THE GOALS CAME FROM =================
     Thirty rows tell you the order. This tells you the shape: how much of the
     club's scoring sat with how few players. */
  const scorers = rows.filter((x) => (x.r.goals || 0) > 0)
    .sort((a, b) => (b.r.goals || 0) - (a.r.goals || 0));
  let running = 0;
  const share = scorers.map((x) => {
    running += x.r.goals;
    return { ...x, pct: (x.r.goals / clubGoals) * 100, cum: (running / clubGoals) * 100 };
  });
  const topFive = share.slice(0, 5).reduce((n, x) => n + x.r.goals, 0);

  const shareBand = share.length > 3 ? `<section class="sec st-share" aria-labelledby="st-share-h">
      <div class="wrap">
        ${rail(3, 'Where the goals came from', `${scorers.length} scorers`)}
        <h2 class="h2 rv" id="st-share-h">Who scored them<span class="volt">.</span></h2>
        <p class="st-lede rv">${esc(clubGoals)} goals across every competition, shared between
          ${esc(scorers.length)} players. The top five scored ${esc(topFive)} of them,
          ${esc(Math.round((topFive / clubGoals) * 100))}% of the club's return.</p>
        <ol class="st-share__bar rv" aria-label="Share of the club's goals by player">
          ${share.map((x, i) => `<li style="--w:${x.pct.toFixed(2)}%;--i:${i}"
            title="${attr(`${x.p.name}: ${x.r.goals} goals`)}">
            <span class="sr-only">${esc(x.p.name)}, ${esc(x.r.goals)} goals</span>
          </li>`).join('\n          ')}
        </ol>
        <ol class="st-share__key rv">
          ${share.slice(0, 6).map((x) => `<li>
            <span class="st-share__sw" aria-hidden="true" style="--o:${(1 - share.indexOf(x) * 0.13).toFixed(2)}"></span>
            <b>${esc(x.p.last)}</b>
            <i>${esc(x.r.goals)}</i>
          </li>`).join('\n          ')}
          ${share.length > 6 ? `<li><span class="st-share__sw is-rest" aria-hidden="true"></span>
            <b>${esc(share.length - 6)} others</b>
            <i>${esc(share.slice(6).reduce((n, x) => n + x.r.goals, 0))}</i></li>` : ''}
        </ol>
      </div>
    </section>` : '';

  /* ================= CTA ================= */
  const ctaBand = `<section class="sec sec--cta st-cta" aria-labelledby="st-cta-h">
      <div class="wrap">
        <div class="cta2">
          <span class="cta2__glow" aria-hidden="true"></span>
          <img class="cta2__badge" src="${STAR}" alt="" width="500" height="620" loading="lazy" decoding="async" aria-hidden="true" />
          <div class="cta2__glass glassbox rv">
            <p class="eyebrow cta2__eyebrow">Want to play here?</p>
            <h2 class="h2" id="st-cta-h">Trials are open for <span class="volt">26/27.</span></h2>
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
    body: siteHeader('/stats.html') + hero + leadersBand + tableBand + shareBand + ctaBand,
    bodyClass: 'is-home is-sub is-stats',
    css: 'home.css',
    shell: 'home',
    preMain: sitePreMain(auraFor('stats.html')),
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
