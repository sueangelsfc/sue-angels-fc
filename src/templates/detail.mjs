/* Detail routes generated one file per record, so every player, match and
   article has a real crawlable URL with its content in the HTML. */
import { esc, attr, icon, crest, sectionHead, statTile, crumbs, emptyState } from '../lib/html.mjs';
import { fixtureCard, scoreboard, lineupBlock, timelineBlock, formGuideBlock } from '../lib/blocks.mjs';
import { CLUB } from '../lib/club.mjs';
import { fmtDate, matchTimeline, teamSummary } from '../lib/stats.mjs';

/* ======================= PLAYER PROFILE ======================= */
export function playerPage(p, d) {
  const initials = `${(p.first || '').charAt(0)}${(p.last || '').charAt(0)}`.toUpperCase();
  const appearances = p.matches
    .map((r) => ({ ...r, match: d.matches.find((m) => m.id === r.id) }))
    .filter((r) => r.match)
    .sort((a, b) => (b.match.iso || '').localeCompare(a.match.iso || ''));

  const shot = p.hasPhoto
    ? `<img src="/media/players/${attr(p.num)}.webp" alt="${attr(p.name)}" width="480" height="640" loading="eager" decoding="async" fetchpriority="high">`
    : `<div style="aspect-ratio:3/4;display:grid;place-items:center"><span style="font-family:var(--font-display);font-size:var(--step-8);font-weight:700;color:rgb(var(--brand-rgb)/.25)">${esc(initials)}</span></div>`;

  const bioBlock = p.bio
    ? `<div class="prose">${(Array.isArray(p.bio) ? p.bio : [p.bio]).map((t) => `<p>${esc(t)}</p>`).join('')}</div>`
    : `<p style="color:var(--text-subtle);font-size:var(--step--1)">
         A profile for ${esc(p.name)} has not been written yet. Squad members’ own words go here as we collect them.
       </p>`;

  const tiles = [
    { v: p.apps, l: 'Appearances' },
    { v: p.goals, l: 'Goals' },
    { v: p.assists, l: 'Assists' },
    { v: p.goalContributions, l: 'Goals + assists' },
    { v: p.motm, l: 'Player of the Match' },
    { v: p.captained, l: 'Games as captain' },
    ...(p.positionGroup === 'gk' || p.positionGroup === 'def' ? [{ v: p.cleanSheets, l: 'Clean sheets' }] : []),
    ...(p.yellow || p.red ? [{ v: `${p.yellow}/${p.red}`, l: 'Yellow / red' }] : []),
  ];

  return { body: `
  <section class="section" style="padding-block-start:var(--space-6)">
    <div class="wrap wrap--wide">
      ${crumbs([{ label: 'Home', href: '/' }, { label: 'Squad', href: '/squad.html' }, { label: p.name, href: `/players/${p.slug}.html` }])}
      <div class="pprofile" style="margin-top:var(--space-6)">
        <div class="pprofile__shot">
          ${shot}
          <span class="pprofile__num" aria-hidden="true">${esc(p.num)}</span>
        </div>
        <div class="stack stack--lg">
          <div>
            <p class="eyebrow">${esc(p.position)}${p.status !== 'active' ? ` · ${esc(p.status)}` : ''}</p>
            <h1 style="font-size:var(--step-6);margin-block:var(--space-2) var(--space-4)">${esc(p.name)}</h1>
            ${p.positionsPlayed?.length ? `<div class="row row--tight">
              ${p.positionsPlayed.slice(0, 5).map((c) => `<span class="chip" style="pointer-events:none">${esc(c)}</span>`).join('')}
            </div>` : ''}
          </div>
          <div class="pprofile__statgrid">
            ${tiles.map((t) => statTile({ value: String(t.v), label: t.l, glass: true, brand: t.l === 'Goals' })).join('')}
          </div>
          ${bioBlock}
          <p style="font-size:var(--step--2);color:var(--text-subtle)">
            Figures cover all competitions in ${esc(d.currentSeason)} and are derived from the club’s
            match records. ${esc(p.minutesNote || '')}
          </p>
        </div>
      </div>
    </div>
  </section>

  ${appearances.length ? `<section class="section">
    <div class="wrap wrap--wide">
      ${sectionHead({ index: '01', eyebrow: `${appearances.length} matches`, title: 'Match history' })}
      <div class="grid grid--wide">
        ${appearances.map((a) => fixtureCard(a.match, d.badges, { glass: true })).join('')}
      </div>
    </div>
  </section>` : ''}

  <section class="section">
    <div class="wrap wrap--wide">
      ${sectionHead({ eyebrow: 'The squad', title: 'Other players' })}
      <div class="chip-row">
        ${d.players.filter((x) => x.slug !== p.slug && !x.unknown).slice(0, 18)
          .map((x) => `<a class="chip" href="/players/${attr(x.slug)}.html">${esc(x.num)} ${esc(x.last)}</a>`).join('')}
      </div>
    </div>
  </section>` };
}

/* ======================= MATCH CENTRE ======================= */
export function matchPage(m, d) {
  const events = matchTimeline(m, d.nameFor);
  const dtl = m.detail || {};
  const motm = dtl.motm != null ? d.nameFor(dtl.motm) : null;
  const motmPlayer = dtl.motm != null ? d.players.find((p) => p.num === dtl.motm) : null;
  const report = dtl.polishedReport || dtl.commentary || '';
  const album = d.galleries.find((g) => {
    const t = String(g.title || '').toLowerCase();
    return t.includes(String(m.opponent).toLowerCase().slice(0, 12));
  });

  const goalsFor = (dtl.goals || []).length;
  const scorers = (dtl.goals || []).reduce((acc, g) => {
    acc[g.num] = (acc[g.num] || 0) + 1;
    return acc;
  }, {});

  const statRow = (label, a, b) => `<div class="row row--between" style="padding-block:var(--space-2);border-bottom:1px solid var(--border);font-size:var(--step--1)">
    <strong class="tnum">${esc(a)}</strong><span style="color:var(--text-subtle)">${esc(label)}</span><strong class="tnum">${esc(b)}</strong>
  </div>`;

  return { body: `
  <section class="section" style="padding-block-start:var(--space-6)">
    <div class="wrap wrap--wide">
      ${crumbs([{ label: 'Home', href: '/' }, { label: 'Results', href: '/results.html' }, { label: m.title, href: `/matches/${m.slug}.html` }])}
      <div class="stack" style="margin-top:var(--space-6)">
        <div class="row row--between">
          <div class="row row--tight">
            <span class="badge badge--brand">${esc(m.competition)}</span>
            ${m.outcome ? `<span class="badge badge--neutral">${m.outcome === 'W' ? 'Won' : m.outcome === 'D' ? 'Drawn' : 'Lost'}</span>` : ''}
            ${m.resultNote ? `<span class="badge badge--neutral">${esc(m.resultNote)}</span>` : ''}
          </div>
          <p style="font-size:var(--step--1);color:var(--text-subtle)">
            ${icon('calendar')} ${esc(fmtDate(m.date, { weekday: true, long: true }))}
            ${m.kick ? ` · ${icon('clock')} ${esc(m.kick)}` : ''}
          </p>
        </div>
        ${scoreboard(m, d.badges)}
        ${m.venue ? `<p style="text-align:center;font-size:var(--step--1);color:var(--text-subtle)">${icon('pin')} ${esc(m.venue)}</p>` : ''}
      </div>
    </div>
  </section>

  <section class="section section--tight">
    <div class="wrap wrap--wide">
      <div class="split split--wide-left">
        <div class="stack stack--lg">
          ${report ? `<div>
            ${sectionHead({ index: '01', eyebrow: 'Match report', title: 'How it went' })}
            <div class="article__body">${report.split(/\n{2,}/).filter(Boolean).map((para) => `<p>${esc(para.trim())}</p>`).join('')}</div>
          </div>` : `<div>
            ${sectionHead({ index: '01', eyebrow: 'Match report', title: 'How it went' })}
            ${emptyState({ title: 'No report written yet', body: 'Match reports are written in the control panel and appear here automatically.' })}
          </div>`}

          ${events.length ? `<div>
            ${sectionHead({ index: '02', eyebrow: 'What happened', title: 'Match events' })}
            ${timelineBlock(events)}
            <p style="margin-top:var(--space-4);font-size:var(--step--2);color:var(--text-subtle)">
              Sunday-league match returns rarely record minutes, so untimed events are listed in the order they were logged.
            </p>
          </div>` : ''}

          ${(dtl.starters || []).length ? `<div>
            ${sectionHead({ index: events.length ? '03' : '02', eyebrow: 'Who played', title: 'Line-up' })}
            ${lineupBlock(m, d.nameFor)}
          </div>` : ''}
        </div>

        <div class="stack">
          ${motm ? `<div class="glass glass--warm" style="padding:var(--space-5)">
            <p class="eyebrow">Player of the Match</p>
            <p style="font-family:var(--font-display);font-size:var(--step-3);margin-block:var(--space-2)">
              ${motmPlayer ? `<a href="/players/${attr(motmPlayer.slug)}.html" style="text-decoration:none">${esc(motm)}</a>` : esc(motm)}
            </p>
          </div>` : ''}

          ${m.countsGoals ? `<div class="panel" style="padding:var(--space-5)">
            <h3 style="font-size:var(--step-1);margin-bottom:var(--space-4)">Match statistics</h3>
            ${statRow('Goals', m.hs, m.as)}
            ${statRow('Goals logged to a scorer', goalsFor, (dtl.opponentGoals || []).length)}
            ${statRow('Assists logged', (dtl.assists || []).length, '—')}
            ${statRow('Yellow cards', (dtl.yellowCards || []).length, '—')}
            ${statRow('Red cards', (dtl.redCards || []).length, (dtl.opponentRedCards || []).length)}
          </div>` : ''}

          ${Object.keys(scorers).length ? `<div class="panel" style="padding:var(--space-5)">
            <h3 style="font-size:var(--step-1);margin-bottom:var(--space-4)">Scorers</h3>
            <div class="stack stack--sm">
              ${Object.entries(scorers).map(([num, n]) => {
                const pl = d.players.find((p) => p.num === Number(num));
                return `<div class="row row--between" style="font-size:var(--step--1)">
                  <span class="truncate">${pl ? `<a href="/players/${attr(pl.slug)}.html" style="text-decoration:none">${esc(pl.name)}</a>` : esc(d.nameFor(Number(num)))}</span>
                  <strong class="tnum">${n > 1 ? `×${n}` : '1'}</strong>
                </div>`;
              }).join('')}
            </div>
          </div>` : ''}

          ${album ? `<a class="media-card" href="/gallery/${attr(album.slug)}.html">
            ${album.cover || album.src ? `<img src="${attr(album.cover || album.src)}" alt="" width="440" height="248" loading="lazy" decoding="async">` : ''}
            <div class="media-card__overlay">
              <p style="font-family:var(--font-display)">Matchday gallery</p>
              <p style="font-size:var(--step--2);opacity:.8">${esc(album.photoCount)} photographs</p>
            </div>
          </a>` : ''}

          <div class="glass" style="padding:var(--space-5)">
            <p class="eyebrow" style="margin-bottom:var(--space-3)">Share</p>
            <button class="btn btn--glass btn--sm btn--block" type="button" data-share>Share this match</button>
          </div>
        </div>
      </div>
    </div>
  </section>` };
}

/* ======================= ARTICLE ======================= */
export function articlePage(a, d) {
  const paras = String(a.body || a.lede || '').split(/\n{2,}/).filter(Boolean);
  const more = d.articles.filter((x) => x.slug !== a.slug).slice(0, 3);

  return { body: `
  <section class="section" style="padding-block-start:var(--space-6)">
    <div class="wrap wrap--narrow">
      ${crumbs([{ label: 'Home', href: '/' }, { label: 'News', href: '/news.html' }, { label: a.title, href: `/news/${a.slug}.html` }])}
      <div class="article__head">
        <span class="badge badge--brand">${esc(a.category)}</span>
        <h1 class="article__title" style="margin-block:var(--space-4) var(--space-3)">${esc(a.title)}</h1>
        <div class="article__meta">
          <span>${esc(a.date)}</span>
          <span>${esc(a.author)}</span>
        </div>
      </div>
      ${a.cover ? `<div class="article__cover"><img src="${attr(a.cover)}" alt="" width="900" height="506" loading="eager" decoding="async"></div>` : ''}
      <div class="article__body">
        ${a.lede && !String(a.body || '').startsWith(String(a.lede).slice(0, 30))
          ? `<p style="font-size:var(--step-1);color:var(--text)">${esc(String(a.lede).split('\n')[0])}</p>` : ''}
        ${paras.map((p) => `<p>${esc(p.trim())}</p>`).join('')}
      </div>
      <div class="row" style="margin-top:var(--space-7)">
        <button class="btn btn--glass btn--sm" type="button" data-share>Share this article</button>
        <a class="btn btn--quiet btn--sm" href="/news.html">All news</a>
      </div>
    </div>
  </section>
  ${more.length ? `<section class="section">
    <div class="wrap wrap--wide">
      ${sectionHead({ eyebrow: 'Also from the club', title: 'More news' })}
      <div class="grid grid--wide">${more.map((x) => `<a class="card card--link glass" href="/news/${attr(x.slug)}.html">
        <span class="badge badge--brand" style="align-self:flex-start">${esc(x.category)}</span>
        <h3 class="card__title">${esc(x.title)}</h3>
        <span class="card__meta">${esc(x.date)}</span>
      </a>`).join('')}</div>
    </div>
  </section>` : ''}` };
}

/* ======================= GALLERY ALBUM ======================= */
export function albumPage(g, d) {
  const photos = (g.photos || []).slice();
  return { body: `
  <section class="section" style="padding-block-start:var(--space-6)">
    <div class="wrap wrap--wide">
      ${crumbs([{ label: 'Home', href: '/' }, { label: 'Gallery', href: '/gallery.html' }, { label: g.title, href: `/gallery/${g.slug}.html` }])}
      <div class="phero__inner" style="margin-top:var(--space-6)">
        <span class="eyebrow">${esc(g.category)}${g.photographer ? ` · ${esc(g.photographer)}` : ''}</span>
        <h1 style="font-size:var(--step-4)">${esc(g.title)}</h1>
        <p class="phero__lede">${esc(photos.length)} photographs.</p>
      </div>
      ${g.tags?.length ? `<div class="chip-row" style="margin-top:var(--space-5)">
        ${g.tags.map((t) => `<span class="chip" style="pointer-events:none">${esc(t)}</span>`).join('')}
      </div>` : ''}
    </div>
  </section>
  <section class="section section--flush">
    <div class="wrap wrap--wide">
      ${photos.length ? `<div class="gal" data-lightbox>
        ${photos.map((src, i) => `<button class="gal__item" type="button" data-full="${attr(src)}" aria-label="View photograph ${i + 1} of ${photos.length}">
          <img src="${attr(src)}" alt="" width="180" height="180" loading="${i < 12 ? 'eager' : 'lazy'}" decoding="async">
        </button>`).join('')}
      </div>` : emptyState({ title: 'No photographs in this album yet' })}
    </div>
  </section>` };
}
