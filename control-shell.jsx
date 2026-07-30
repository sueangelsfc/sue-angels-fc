/* ============================================================================
   Control panel shell.

   Hosts AdminPanel.jsx's fifteen section components inside new chrome. Those
   components are ~5,000 lines carrying the pitch editor, per-goal set-piece
   detail, clean-sheet contributions and photo tagging. Rewriting them to change
   how the panel looks would risk the most valuable code in the product for a
   cosmetic gain, so the sections are reused verbatim and restyled in control.css.

   What is genuinely new here: a dashboard (the previous panel opened straight
   onto a 33-row editing list), per-section counts and attention markers in the
   nav, and a command palette.
   ========================================================================== */
const h = React.createElement;

/* ---------- icons: 1.6px stroke, drawn to one grid ----------------------- */
const Ico = ({ d, size = 16, fill }) => h('svg', {
  className: 'cp-nav__ico', width: size, height: size, viewBox: '0 0 24 24',
  fill: fill || 'none', stroke: 'currentColor', strokeWidth: 1.6,
  strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true
}, Array.isArray(d) ? d.map((p, i) => h('path', { key: i, d: p })) : h('path', { d }));

const P = {
  dash:    ['M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-5H3zM13 8h8V3h-8z'],
  hero:    ['M3 5h18v14H3z', 'M3 15l5-5 4 4 3-3 6 6'],
  trophy:  ['M8 4h8v5a4 4 0 0 1-8 0z', 'M12 13v4', 'M9 21h6', 'M8 5H5v2a3 3 0 0 0 3 3', 'M16 5h3v2a3 3 0 0 1-3 3'],
  add:     ['M12 5v14', 'M5 12h14'],
  camera:  ['M4 8h3l1.5-2h7L17 8h3v11H4z', 'M12 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z'],
  whistle: ['M4 12a5 5 0 1 0 10 0 5 5 0 0 0-10 0z', 'M14 10h6l-2 4h-4'],
  out:     ['M14 4h5v16h-5', 'M10 8l-4 4 4 4', 'M6 12h9'],
  pitch:   ['M3 4h18v16H3z', 'M12 4v16', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
  cal:     ['M4 6h16v14H4z', 'M4 10h16', 'M9 3v4', 'M15 3v4'],
  news:    ['M5 4h14v16H5z', 'M8 8h8', 'M8 12h8', 'M8 16h5'],
  images:  ['M4 6h12v12H4z', 'M8 3h12v12', 'M6 14l3-3 3 3'],
  video:   ['M3 6h12v12H3z', 'M15 10l6-3v10l-6-3'],
  cover:   ['M4 4h16v16H4z', 'M4 9h16', 'M9 9v11'],
  handshake:['M3 12l4-4 3 2 3-2 4 4-4 4-3-2-3 2z'],
  funnel:  ['M4 5h16l-6 7v6l-4 2v-8z'],
  coin:    ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 7v10', 'M9.5 9.5h5', 'M9.5 14h5'],
  search:  ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M20 20l-4-4'],
  burger:  ['M4 7h16', 'M4 12h16', 'M4 17h16'],
  ext:     ['M14 4h6v6', 'M20 4l-9 9', 'M18 14v5H5V6h5'],
  right:   ['M9 6l6 6-6 6'],
};
const ICON_FOR = {
  dashboard: P.dash, hero: P.hero, recognition: P.trophy, roster: P.add,
  photos: P.camera, coaches: P.whistle, status: P.out, matchdata: P.pitch,
  fixtures: P.cal, articles: P.news, gallery: P.images, videos: P.video,
  covers: P.cover, sponsors: P.handshake, pipeline: P.funnel, donations: P.coin,
};

/* ---------- derived club state for the dashboard ------------------------ */
/* Completeness uses the SAME rule as CmsMatchData so the dashboard and the
   Match data section can never disagree about what is outstanding. */
function matchEntryMap() {
  const out = {};
  try { (window.getAllMatchEntries ? window.getAllMatchEntries() : []).forEach(e => { out[e.id] = e.data; }); }
  catch (e) {}
  return out;
}
function completenessOf(item, entries) {
  const d = entries[item.id] || {};
  const hasXI = (d.starters || []).length >= 7;
  const usHome = (item.home || '').indexOf('Angels') > -1;
  const ourGoals = item.kind === 'walkover' ? 0 : (usHome ? item.hs : item.as);
  const scorersOk = (d.goals || []).length >= (ourGoals || 0);
  const hasMOTM = !!d.motm;
  return { hasXI, scorersOk, hasMOTM, done: hasXI && scorersOk && hasMOTM };
}
function clubState() {
  const results = (window.getDerivedResults ? window.getDerivedResults() : (window.SEASON_RESULTS || [])) || [];
  const fixtures = (window.getActiveUpcoming ? window.getActiveUpcoming() : (window.UPCOMING_FIXTURES || [])) || [];
  const entries = matchEntryMap();
  const rows = results.map(r => ({ item: r, c: completenessOf(r, entries) }));
  const outstanding = rows.filter(r => !r.c.done);
  let articles = [], albums = [], videos = [];
  try { articles = window.getCustomArticles ? (window.getCustomArticles() || []) : []; } catch (e) {}
  /* GalleryStore exposes list(); two shapes of it have shipped, so try both
     rather than silently reporting zero albums when there are seven. */
  try {
    const G = window.GalleryStore;
    if (G) albums = (G.list ? G.list() : (G.all ? G.all() : [])) || [];
  } catch (e) {}
  try { videos = window.getClubVideos ? (window.getClubVideos() || []) : []; } catch (e) {}
  const M = window.SA_MATCH;
  return {
    results, fixtures, rows, outstanding, articles, albums, videos,
    squad: (window.SQUAD || []).length,
    coaches: (window.COACHES || []).length,
    logged: rows.length - outstanding.length,
    next: fixtures[0] || null,
    last: results[0] || null,
    reportsWritten: results.filter(r => (entries[r.id] || {}).polishedReport).length,
    notesOnly: results.filter(r => { const d = entries[r.id] || {}; return !d.polishedReport && (d.commentary || '').trim(); }).length,
    campaign: M ? M.leagueCampaign(results, 'all') : null,
    cups: M ? M.cupRuns(results, 'all') : [],
    writerWired: !!(window.claude && window.claude.complete),
  };
}
const opponentOf = m => /angels/i.test(m.home || '') ? m.away : m.home;
const strip = s => String(s || '').replace(' FC', '');

/* ---------- dashboard --------------------------------------------------- */
function Dashboard({ go }) {
  const s = React.useMemo(clubState, []);
  const pct = s.rows.length ? Math.round((s.logged / s.rows.length) * 100) : 0;
  const kpi = (k, v, d, accent) => h('div', { className: 'cp-kpi' + (accent ? ' cp-kpi--accent' : ''), key: k },
    h('p', { className: 'cp-kpi__k' }, k),
    h('p', { className: 'cp-kpi__v' }, v),
    d ? h('p', { className: 'cp-kpi__d' }, d) : null);

  const nextFx = s.next;
  const last = s.last;
  const lastCtx = last && window.SA_MATCH ? window.SA_MATCH.contextOf(last) : null;

  return h('div', { className: 'cp-dash' },

    h('div', { className: 'cp-kpis' },
      kpi('Squad', s.squad, s.coaches + ' coaching staff'),
      kpi('Matches logged', s.logged + '/' + s.rows.length, pct + '% complete', s.outstanding.length > 0),
      kpi('Articles', s.articles.length, 'published'),
      kpi('Albums', s.albums.length, (s.videos.length || 0) + ' videos'),
      kpi('Reports', s.reportsWritten, s.notesOnly + ' ready to write')),

    h('div', { className: 'cp-split' },

      /* next fixture */
      h('div', { className: 'cp-panel' },
        h('div', { className: 'cp-panel__h' }, h('p', { className: 'cp-panel__t' }, 'Next fixture')),
        h('div', { className: 'cp-panel__b' },
          nextFx
            ? h('div', { className: 'cp-fx' },
                h('p', { className: 'cp-fx__when' }, [nextFx.day, nextFx.date, nextFx.mon].filter(Boolean).join(' ') + (nextFx.kick ? ' · ' + nextFx.kick : '')),
                h('p', { className: 'cp-fx__who' }, strip(opponentOf(nextFx))),
                h('p', { className: 'cp-fx__meta' }, [nextFx.comp, nextFx.loc, nextFx.ven].filter(v => v && v !== 'TBC').join(' · ') || 'Details to confirm'),
                h('button', { className: 'rd-btn rd-btn--ghost rd-btn--sm', style: { marginTop: 14 }, onClick: () => go('fixtures') }, 'Manage fixtures'))
            : h('div', null,
                h('p', { className: 'rd-lead' }, 'No upcoming fixture on the books.'),
                h('button', { className: 'rd-btn rd-btn--volt rd-btn--sm', style: { marginTop: 14 }, onClick: () => go('fixtures') }, 'Add a fixture')))),

      /* last result */
      h('div', { className: 'cp-panel' },
        h('div', { className: 'cp-panel__h' }, h('p', { className: 'cp-panel__t' }, 'Last result')),
        h('div', { className: 'cp-panel__b' },
          last
            ? h('div', { className: 'cp-fx' },
                h('p', { className: 'cp-fx__when' }, last.date + (last.competition ? ' · ' + last.competition : '')),
                h('p', { className: 'cp-score' }, last.kind === 'walkover' ? 'W/O'
                  : (lastCtx && lastCtx.score ? lastCtx.score.us + '–' + lastCtx.score.them : '')),
                h('p', { className: 'cp-fx__who', style: { fontSize: 17 } }, 'v ' + strip(opponentOf(last))),
                lastCtx && lastCtx.decidedBy ? h('p', { className: 'cp-fx__meta' }, lastCtx.decidedBy) : null,
                h('button', { className: 'rd-btn rd-btn--ghost rd-btn--sm', style: { marginTop: 14 }, onClick: () => go('matchdata') }, 'Edit match data'))
            : h('p', { className: 'rd-lead' }, 'No results recorded yet.')))),

    /* what needs doing — the reason to open the panel at all */
    h('div', { className: 'cp-panel' },
      h('div', { className: 'cp-panel__h' },
        h('p', { className: 'cp-panel__t' }, 'Needs attention'),
        h('span', { className: 'cp-panel__n' }, s.outstanding.length + ' of ' + s.rows.length + ' matches')),
      h('div', { className: 'cp-panel__b' },
        h('div', { className: 'cp-meter', role: 'img', 'aria-label': pct + ' per cent of matches fully logged' },
          h('i', { className: 'cp-meter__fill', style: { width: pct + '%', display: 'block' } })),
        h('p', { className: 'cp-kpi__d', style: { marginTop: 9 } },
          s.outstanding.length
            ? 'These matches are missing a lineup, goalscorers or a man of the match. Every one of them holds back the player stats.'
            : 'Every match is fully logged. Nothing outstanding.')),
      s.outstanding.length
        ? h('div', { className: 'cp-todo' }, s.outstanding.slice(0, 8).map(({ item, c }) =>
            h('button', { key: item.id, className: 'cp-todo__row', onClick: () => go('matchdata') },
              h('span', { className: 'cp-todo__t' }, strip(item.home) + ' v ' + strip(item.away) + ' · ' + item.date),
              h('span', { className: 'cp-todo__miss' },
                [['XI', c.hasXI], ['Goals', c.scorersOk], ['MOTM', c.hasMOTM]]
                  .filter(x => !x[1])
                  .map(x => h('span', { key: x[0], className: 'cms-prog__pill is-miss' }, x[0]))),
              h('span', { className: 'cp-todo__go' }, h(Ico, { d: P.right, size: 15 })))))
        : null),

    /* season shape, straight from the new match-context model */
    s.campaign && s.campaign.played
      ? h('div', { className: 'cp-split' },
          h('div', { className: 'cp-panel' },
            h('div', { className: 'cp-panel__h' }, h('p', { className: 'cp-panel__t' }, 'League campaign')),
            h('div', { className: 'cp-panel__b' },
              h('p', { className: 'cp-score' }, s.campaign.points + ' pts'),
              h('p', { className: 'cp-fx__meta', style: { marginTop: 6 } },
                'P' + s.campaign.played + ' W' + s.campaign.won + ' D' + s.campaign.drawn + ' L' + s.campaign.lost +
                ' · GD ' + (s.campaign.goalDifference > 0 ? '+' : '') + s.campaign.goalDifference),
              s.campaign.form ? h('p', { className: 'cp-fx__meta', style: { marginTop: 6 } }, 'Form ' + s.campaign.form) : null)),
          h('div', { className: 'cp-panel' },
            h('div', { className: 'cp-panel__h' }, h('p', { className: 'cp-panel__t' }, 'Cup runs')),
            h('div', { className: 'cp-panel__b' },
              s.cups.length
                ? s.cups.map((r, i) => h('p', { key: i, className: 'cp-fx__meta', style: { marginBottom: 6 } },
                    h('b', { style: { color: 'var(--cp-ink)' } }, r.competition), ' — ', r.outcome || 'in progress'))
                : h('p', { className: 'rd-lead' }, 'No cup ties recorded.'))))
      : null,

    /* honest status of the report writer */
    h('div', { className: 'cp-panel' },
      h('div', { className: 'cp-panel__h' },
        h('p', { className: 'cp-panel__t' }, 'Match report writer'),
        h('span', { className: 'rd-chip' + (s.writerWired ? ' rd-chip--volt' : '') }, s.writerWired ? 'Connected' : 'Not connected')),
      h('div', { className: 'cp-panel__b' },
        h('p', { className: 'rd-lead' },
          s.writerWired
            ? 'Open a match under Match data, write your notes, then use “Polish into match report”. Your notes are treated as the source of truth and nothing is invented around them.'
            : 'The writer endpoint is unreachable from this page, so the polish button will stay disabled.'))));
}

/* ---------- command palette -------------------------------------------- */
function Palette({ items, onPick, onClose }) {
  const [q, setQ] = React.useState('');
  const [i, setI] = React.useState(0);
  const inputRef = React.useRef(null);
  React.useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, []);
  const hits = items.filter(it => it.label.toLowerCase().includes(q.toLowerCase().trim()));
  React.useEffect(() => { setI(0); }, [q]);
  const key = (e) => {
    if (e.key === 'Escape') { onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setI(v => Math.min(v + 1, hits.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setI(v => Math.max(v - 1, 0)); }
    else if (e.key === 'Enter' && hits[i]) { onPick(hits[i].key); }
  };
  return h('div', { className: 'cp-cmd', onClick: onClose },
    h('div', { className: 'cp-cmd__box', onClick: e => e.stopPropagation(), role: 'dialog', 'aria-label': 'Jump to a section' },
      h('input', { ref: inputRef, className: 'cp-cmd__in', placeholder: 'Jump to a section…', value: q,
                   onChange: e => setQ(e.target.value), onKeyDown: key }),
      hits.length
        ? h('div', { className: 'cp-cmd__list' }, hits.map((it, n) =>
            h('button', { key: it.key, className: 'cp-cmd__item' + (n === i ? ' is-sel' : ''),
                          onMouseEnter: () => setI(n), onClick: () => onPick(it.key) },
              h(Ico, { d: ICON_FOR[it.key] || P.right, size: 15 }),
              h('span', null, it.label),
              h('span', { className: 'cp-cmd__grp' }, it.group))))
        : h('p', { className: 'cp-cmd__none' }, 'Nothing matches “' + q + '”')));
}

/* ---------- shell ------------------------------------------------------- */
function ControlPanel() {
  const admin = window.useAdmin ? window.useAdmin() : false;
  const [sec, setSec] = React.useState('dashboard');
  const [navOpen, setNavOpen] = React.useState(false);
  const [cmd, setCmd] = React.useState(false);
  const [tick, setTick] = React.useState(0);

  /* Re-derive the nav counts whenever the data layer says something changed,
     so the attention markers cannot go stale while the panel is open. */
  React.useEffect(() => {
    const bump = () => setTick(t => t + 1);
    const evs = ['sa-articles-changed', 'sa-media-changed', 'sa-roster-changed', 'sa-match-changed', 'sa-fixtures-changed'];
    evs.forEach(e => window.addEventListener(e, bump));
    return () => evs.forEach(e => window.removeEventListener(e, bump));
  }, []);

  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmd(v => !v); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const SECTIONS = window.CMS_SECTIONS || [];
  const GROUPS = window.CMS_GROUPS || [];

  const counts = React.useMemo(() => {
    if (!admin) return {};
    const s = clubState();
    return {
      matchdata: { n: s.rows.length, attention: s.outstanding.length > 0 },
      fixtures: { n: s.fixtures.length },
      articles: { n: s.articles.length },
      gallery: { n: s.albums.length },
      videos: { n: s.videos.length },
      photos: { n: s.squad },
      roster: { n: s.squad + s.coaches },
      coaches: { n: s.coaches },
    };
  }, [admin, tick, sec]);

  /* ---- gate ---- */
  if (!admin) {
    return h('div', { className: 'cp-gate' },
      h('div', { className: 'cp-gate__card' },
        h('img', { className: 'cp-gate__crest', src: 'assets/badge/sue-angels-badge-star.webp', alt: '', width: 58, height: 72 }),
        h('p', { className: 'rd-eyebrow' }, 'Staff only'),
        h('h1', { className: 'rd-h2', style: { marginTop: 10 } }, 'Control panel'),
        h('p', { className: 'rd-lead', style: { margin: '13px 0 22px' } },
          'Sign in with your club admin account to manage match data, fixtures, the squad, news, photos and sponsors.'),
        h('button', { className: 'rd-btn rd-btn--volt rd-btn--lg', onClick: () => window.openAdmin && window.openAdmin() }, 'Sign in')));
  }

  const entry = SECTIONS.find(x => x[0] === sec);
  const Active = entry ? entry[2] : null;
  const paletteItems = [{ key: 'dashboard', label: 'Dashboard', group: 'Overview' }]
    .concat(SECTIONS.map(x => ({ key: x[0], label: x[1], group: x[3] })));

  const go = (k) => { setSec(k); setNavOpen(false); setCmd(false); window.scrollTo({ top: 0, behavior: 'auto' }); };

  const navBtn = (k, label) => {
    const c = counts[k] || {};
    return h('button', { key: k, className: 'cp-nav' + (sec === k ? ' is-active' : ''), onClick: () => go(k),
                         'aria-current': sec === k ? 'page' : undefined },
      h(Ico, { d: ICON_FOR[k] || P.right, size: 16 }),
      h('span', { className: 'cp-nav__lbl' }, label),
      c.attention ? h('span', { className: 'cp-nav__dot', title: 'Needs attention' }) : null,
      c.n != null ? h('span', { className: 'cp-nav__n' }, c.n) : null);
  };

  // Who is signed in. data.js exposes SA_AUTH; control.html loads the React
  // stack instead, so fall back to reading the session off the SDK client.
  const [who, setWho] = React.useState(
    () => (window.SA_AUTH && window.SA_AUTH.user && window.SA_AUTH.user()) || null);
  React.useEffect(() => {
    if (who || !window.SupabaseStore || !window.SupabaseStore.client) return;
    let live = true;
    window.SupabaseStore.client()
      .then((c) => c.auth.getSession())
      .then((r) => { if (live && r && r.data && r.data.session) setWho(r.data.session.user); })
      .catch(() => {});
    return () => { live = false; };
  }, [who, admin]);
  const user = who;

  return h('div', { className: 'cp' + (navOpen ? ' is-navopen' : '') },

    h('aside', { className: 'cp-side', 'aria-label': 'Control panel sections' },
      h('div', { className: 'cp-side__brand' },
        h('img', { className: 'cp-side__crest', src: 'assets/badge/sue-angels-badge-star.webp', alt: '', width: 30, height: 37 }),
        h('div', null,
          h('p', { className: 'cp-side__name' }, "Sue's Angels FC"),
          h('p', { className: 'cp-side__role' }, 'Control panel'))),

      h('div', { className: 'cp-side__search' },
        h(Ico, { d: P.search, size: 14 }),
        h('input', { readOnly: true, placeholder: 'Jump to…', onClick: () => setCmd(true),
                     'aria-label': 'Open the section finder' }),
        h('span', { className: 'cp-side__kbd' }, '⌘K')),

      h('div', { className: 'cp-side__scroll' },
        h('div', { className: 'cp-side__group' }, 'Overview'),
        navBtn('dashboard', 'Dashboard'),
        GROUPS.map(g => h(React.Fragment, { key: g },
          h('div', { className: 'cp-side__group' }, g),
          SECTIONS.filter(x => x[3] === g).map(x => navBtn(x[0], x[1]))))),

      h('div', { className: 'cp-side__foot' },
        user && user.email ? h('p', { className: 'cp-side__who' }, user.email) : null,
        h('button', { className: 'cp-side__out', onClick: async () => {
          try { if (window.saSignOut) await window.saSignOut(); } catch (e) {}
          try { if (window.setAdmin) window.setAdmin(false); } catch (e) {}
          try { localStorage.setItem('sa-admin', '0'); } catch (e) {}
          window.location.reload();
        } }, h(Ico, { d: P.out, size: 15 }), 'Sign out'))),

    h('div', { className: 'cp-scrim', onClick: () => setNavOpen(false) }),

    h('div', { className: 'cp-main' },
      h('div', { className: 'cp-top' },
        h('button', { className: 'cp-burger', onClick: () => setNavOpen(v => !v), 'aria-label': 'Sections' },
          h(Ico, { d: P.burger, size: 18 })),
        h('p', { className: 'cp-top__crumb' },
          (entry ? entry[3] : 'Overview'), ' / ', h('b', null, entry ? entry[1] : 'Dashboard')),
        h('div', { className: 'cp-top__spacer' }),
        h('a', { className: 'cp-top__link', href: 'index.html', target: '_blank', rel: 'noopener' },
          'View site', h(Ico, { d: P.ext, size: 14 }))),

      h('div', { className: 'cp-body' },
        sec === 'dashboard'
          ? h(React.Fragment, null,
              h('div', { className: 'cp-head' },
                h('h1', { className: 'cp-head__t' }, 'Club overview'),
                h('p', { className: 'cp-head__d' },
                  'Everything that needs your attention, and the shape of the season so far.')),
              h(Dashboard, { go }))
          : (Active ? h(Active, null) : h('p', { className: 'cms-empty' }, 'Section unavailable.')))),

    cmd ? h(Palette, { items: paletteItems, onPick: go, onClose: () => setCmd(false) }) : null);
}

ReactDOM.createRoot(document.getElementById('cp-root')).render(h(ControlPanel));
