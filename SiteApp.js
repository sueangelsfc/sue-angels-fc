function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// MockPages.jsx - full interactive preview of every page in the new design system.
// Real data from the live engine. Tabs: Home, About, Champions, Team, Schedule,
// Media, Sponsors, Contact. Interactive: sub-tabs, filters, player-profile modal,
// sponsor modal, gallery lightbox, coach modal, forms, theme toggle. Not production.
const {
  useState,
  useEffect,
  useRef,
  useMemo
} = React;
const RM = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (RM()) {
      el.classList.add('is-in');
      return;
    }
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) {
        el.classList.add('is-in');
        io.unobserve(el);
      }
    }), {
      threshold: 0.12
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}
function useOnscreen() {
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (RM()) {
      setOn(true);
      return;
    }
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) {
        requestAnimationFrame(() => setOn(true));
        io.unobserve(el);
      }
    }), {
      threshold: 0.25
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, on];
}
function CountUp({
  value,
  suffix = '',
  prefix = '',
  on
}) {
  const [n, setN] = useState(RM() ? value : 0);
  useEffect(() => {
    if (RM() || !on) {
      setN(value);
      return;
    }
    let raf;
    const dur = 1100,
      t0 = performance.now(),
      ease = x => 1 - Math.pow(1 - x, 3);
    const tick = t => {
      const p = Math.min(1, (t - t0) / dur);
      setN(value * ease(p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, on]);
  return /*#__PURE__*/React.createElement(React.Fragment, null, prefix, Number.isInteger(value) ? Math.round(n) : n.toFixed(1), suffix);
}
const Arrow = () => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", {
  d: "M5 12h14M13 6l6 6-6 6"
}));
const MON = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11
};
const pdate = s => {
  const m = /(\d{1,2})\s+(\w{3})\s+(\d{2})/.exec(s || '');
  return m ? new Date(2000 + +m[3], MON[m[2]] || 0, +m[1]) : new Date(0);
};
const nnum = e => typeof e === 'number' ? e : e && e.num;
const npos = e => e && Array.isArray(e.positions) ? e.positions : [];
const photoOf = n => window.getPlayerPhoto ? window.getPlayerPhoto(n) : null;
const I = {
  cal: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "5",
    width: "18",
    height: "16",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 9h18M8 3v4M16 3v4"
  })),
  clock: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 7v5l3 2"
  })),
  pin: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "10",
    r: "2.5"
  })),
  chart: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 19V5M4 19h16M8 16l3-4 3 2 4-6"
  })),
  medal: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "15",
    r: "6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 9 7 2h10l-2 7M10 15h4"
  })),
  people: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "8",
    r: "3.2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 20a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5.6M21 20a6 6 0 0 0-4-5.6"
  })),
  trophy: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"
  })),
  photo: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "4",
    width: "18",
    height: "16",
    rx: "2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "8.5",
    cy: "9.5",
    r: "1.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m21 16-5-5L5 20"
  })),
  ball: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m12 7 2.6 1.9-1 3h-3.2l-1-3L12 7Z"
  })),
  pass: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 12h13M13 6l6 6-6 6"
  })),
  star: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19l1-5.8L3.5 9.1l5.9-.9L12 3Z"
  })),
  shield: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 3 5 6v5c0 4.5 3 7.5 7 10 4-2.5 7-5.5 7-10V6l-7-3Z"
  })),
  pulse: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 12h4l2 7 4-14 2 7h6"
  }))
};
function teamTotals() {
  const me = (window.RAW_TABLE || []).find(r => r.us) || {};
  const gf = me.gf || 0,
    ga = me.ga || 0;
  return {
    pl: me.pl || 0,
    w: me.w || 0,
    d: me.d || 0,
    l: me.l || 0,
    gf,
    ga,
    gd: gf - ga,
    pts: me.pts || 0,
    pos: me.p || 1,
    winPct: me.pl ? Math.round(me.w / me.pl * 100) : 0
  };
}
function setPieceStats(season) {
  var entries = window.getAllMatchEntries ? window.getAllMatchEntries() : [];
  if (season && season !== 'all') {
    var sOf = window.seasonOf || function () { return window.CURRENT_SEASON; };
    var byId = {};
    (window.getDerivedResults ? window.getDerivedResults() : []).forEach(function (r) { byId[r.id] = r; });
    entries = entries.filter(function (e) { var r = byId[e.id]; return r ? (sOf(r) || window.CURRENT_SEASON) === season : false; });
  }
  var openG = 0, cornerG = 0, fkG = 0, throwG = 0, otherSetG = 0, penG = 0, openA = 0, cornerA = 0, fkA = 0, throwA = 0;
  entries.forEach(function (e) {
    var data = e.data || {};
    (data.goals || []).forEach(function (g) {
      if (g.type === 'pen' || g.penalty) penG++;
      else if (g.type === 'set') { if (g.setType === 'corner') cornerG++; else if (g.setType === 'freekick') fkG++; else if (g.setType === 'throwin') throwG++; else otherSetG++; }
      else openG++;
    });
    (data.assists || []).forEach(function (a) {
      var s = a.source || 'open';
      if (s === 'corner') cornerA++; else if (s === 'freekick') fkA++; else if (s === 'throwin') throwA++; else openA++;
    });
  });
  var setG = cornerG + fkG + throwG + otherSetG;
  return { openG: openG, cornerG: cornerG, fkG: fkG, throwG: throwG, penG: penG, setG: setG, openA: openA, cornerA: cornerA, fkA: fkA, throwA: throwA, totalG: openG + setG + penG, totalA: openA + cornerA + fkA + throwA };
}
function SetPiecePanel(props) {
  var h = React.createElement, sp = props.sp;
  if (!sp || (!sp.totalG && !sp.totalA)) return null;
  var rows = [['Open play', sp.openG, sp.openA], ['Corners', sp.cornerG, sp.cornerA], ['Free kicks', sp.fkG, sp.fkA], ['Throw-ins', sp.throwG, sp.throwA], ['Penalties', sp.penG, null]];
  return h('div', { className: 'mp-sp' },
    h('div', { className: 'mp-sp__head' },
      h('h3', { className: 'mp-sp__title' }, 'Set-piece threat'),
      h('p', { className: 'mp-sp__sub' }, sp.setG + ' of ' + sp.totalG + ' goals came from set pieces')),
    h('div', { className: 'mp-sp__grid' }, rows.map(function (r, i) {
      return h('div', { className: 'mp-sp__tile', key: i },
        h('span', { className: 'mp-sp__l' }, r[0]),
        h('div', { className: 'mp-sp__nums' },
          h('div', { className: 'mp-sp__stat' }, h('b', null, r[1]), h('span', null, r[1] === 1 ? 'goal' : 'goals')),
          r[2] != null ? h('div', { className: 'mp-sp__stat' }, h('b', { className: 'mp-sp__a' }, r[2]), h('span', null, r[2] === 1 ? 'assist' : 'assists')) : null));
    })));
}
// TeamStatsPanel - richer "dashboard" for the Team → Team stats tab: hero
// win-rate ring + W/D/L bar + honours, goals scored-vs-conceded comparison,
// accented stat tiles, recent-form strip, then the set-piece panel.
function TeamStatsPanel(props) {
  var h = React.createElement;
  var season = props.season || (window.CURRENT_SEASON || '25/26');
  var squadCount = props.squadCount;
  var onS = React.useState(false), isOn = onS[0], setOn = onS[1];
  React.useEffect(function () { setOn(false); var t = setTimeout(function () { setOn(true); }, 90); return function () { clearTimeout(t); }; }, [season]);
  var tt = seasonCompTotals(season);
  var sp = setPieceStats(season === 'all' ? null : season);
  if (!tt.pl) {
    return h('div', { className: 'm-empty' },
      h('b', null, 'NOT KICKED OFF YET'),
      h('span', null, (season === 'all' ? 'THE SEASON' : season) + ' STATS LAND HERE AFTER THE FIRST WHISTLE'));
  }
  var isCurrent = season === 'all' || season === (window.CURRENT_SEASON || '25/26');
  var usRow = isCurrent ? (window.RAW_TABLE || []).find(function (x) { return x.us; }) : null;
  var champions = !!(usRow && usRow.p === 1);
  var unbeatenLeague = !!(usRow && usRow.l === 0 && usRow.pl > 0);
  var MON = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  var pdate = function (s) { var m = /(\d{1,2})\s+(\w{3})\s+(\d{2,4})/.exec(s || ''); return m ? new Date((+m[3] < 100 ? 2000 + +m[3] : +m[3]), MON[m[2]] || 0, +m[1]).getTime() : 0; };
  var sOf2 = window.seasonOf || function () { return window.CURRENT_SEASON; };
  var results = (window.getDerivedResults ? window.getDerivedResults() : []).slice()
    .filter(function (r) { return season === 'all' || (sOf2(r) || window.CURRENT_SEASON) === season; })
    .sort(function (a, b) { return pdate(b.date) - pdate(a.date); }).slice(0, 8);
  var form = results.map(function (r) {
    var uh = r.home.includes('Angels');
    var us = uh ? r.hs : r.as, th = uh ? r.as : r.hs, res, score;
    if (r.kind === 'walkover') { res = 'w'; score = 'W/O'; }
    else if (us == null || th == null) { return null; }
    else {
      score = us + '\u2013' + th;
      if (r.kind === 'penalty' && r.pens) { var uP = uh ? r.pens.hs : r.pens.as, tP = uh ? r.pens.as : r.pens.hs; res = uP > tP ? 'w' : 'l'; }
      else res = us > th ? 'w' : us === th ? 'd' : 'l';
    }
    return { res: res, score: score, opp: (uh ? r.away : r.home).replace(' FC', '') };
  }).filter(Boolean).reverse();
  var gTot = tt.gf + tt.ga || 1;
  var legend = function (cls, t) { return h('span', null, h('i', { className: cls }), t); };
  return h('div', { className: 'ts' },
    h('div', { className: 'ts-hero' },
      h('div', { className: 'ts-hero__ring' }, h(Ring, { pct: tt.winPct / 100, value: tt.winPct + '%', label: 'Win rate', sub: tt.w + 'W ' + tt.d + 'D ' + tt.l + 'L', on: isOn })),
      h('div', { className: 'ts-hero__main' },
        h('p', { className: 'm-eyebrow m-eyebrow--volt' }, (season === 'all' ? 'All seasons' : 'Season ' + season) + ' \u00b7 all competitions'),
        h('h2', { className: 'ts-hero__title' }, champions ? (unbeatenLeague ? h(React.Fragment, null, 'Champions. ', h('em', null, 'Unbeaten.')) : 'Champions.') : (tt.winPct + '% win rate')),
        h('p', { className: 'ts-hero__sub' }, tt.pl + ' played \u00b7 ' + tt.w + ' won \u00b7 ' + tt.gf + ' scored \u00b7 ' + tt.ga + ' conceded'),
        h('div', { className: 'ts-wdl' },
          tt.w ? h('i', { key: 'w', className: 'ts-wdl__w', style: { width: isOn ? tt.w / tt.pl * 100 + '%' : '0%' } }) : null,
          tt.d ? h('i', { key: 'd', className: 'ts-wdl__d', style: { width: isOn ? tt.d / tt.pl * 100 + '%' : '0%' } }) : null,
          tt.l ? h('i', { key: 'l', className: 'ts-wdl__l', style: { width: isOn ? tt.l / tt.pl * 100 + '%' : '0%' } }) : null),
        h('div', { className: 'ts-legend' }, legend('ts-wdl__w', 'Won ' + tt.w), legend('ts-wdl__d', 'Drawn ' + tt.d), legend('ts-wdl__l', 'Lost ' + tt.l)),
        (champions || unbeatenLeague) ? h('div', { className: 'ts-badges' },
          champions ? h('span', { className: 'ts-badge', key: 'c' }, maTrophy(), 'League Ten Champions') : null,
          unbeatenLeague ? h('span', { className: 'ts-badge', key: 'u' }, 'Unbeaten league season') : null,
          champions ? h('span', { className: 'ts-badge', key: 'p' }, 'Promoted') : null) : null)),
    h('div', { className: 'ts-goals' },
      h('div', { className: 'ts-goals__row' },
        h('div', { className: 'ts-goals__side' }, h('b', null, tt.gf), h('span', null, 'Scored')),
        h('div', { className: 'ts-goals__bar' },
          h('i', { className: 'ts-goals__for', style: { width: isOn ? tt.gf / gTot * 100 + '%' : '0%' } }),
          h('i', { className: 'ts-goals__ag', style: { width: isOn ? tt.ga / gTot * 100 + '%' : '0%' } })),
        h('div', { className: 'ts-goals__side ts-goals__side--ag' }, h('b', null, tt.ga), h('span', null, 'Conceded'))),
      h('div', { className: 'ts-goals__meta' },
        h('span', null, h('b', null, (tt.gd >= 0 ? '+' : '') + tt.gd), 'Goal difference'),
        h('span', null, h('b', null, tt.cs), 'Clean sheets'),
        h('span', null, h('b', null, tt.pl ? (tt.gf / tt.pl).toFixed(1) : '0'), 'Goals / game'))),
    h('div', { className: 'ts-tiles' },
      [['Played', tt.pl, false], ['Won', tt.w, false], ['Goals for', tt.gf, false], ['Against', tt.ga, false], ['Goal diff', (tt.gd >= 0 ? '+' : '') + tt.gd, true], ['Clean sheets', tt.cs, false], ['Win rate', tt.winPct + '%', true], ['Squad', squadCount, false]].map(function (x, i) {
        return h('div', { className: 'mh-ltile ' + (x[2] ? 'mh-ltile--volt' : ''), key: i }, h('b', { className: 'm-num' }, x[1]), h('span', null, x[0]));
      })),
    form.length ? h('div', { className: 'ts-form' },
      h('p', { className: 'm-eyebrow' }, 'Recent form'),
      h('div', { className: 'ts-form__row' }, form.map(function (f, i) {
        return h('div', { className: 'ts-form__cell ts-form__cell--' + f.res, key: i, title: f.opp }, h('b', null, f.res.toUpperCase()), h('span', null, f.score));
      }))) : null,
    h(SetPiecePanel, { sp: sp }));
}
function allCompTotals() {
  const results = window.getDerivedResults ? window.getDerivedResults() : window.SEASON_RESULTS || [];
  let pl = 0,
    w = 0,
    d = 0,
    l = 0,
    gf = 0,
    ga = 0,
    cs = 0;
  for (const r of results) {
    const usHome = r.home.includes('Angels');
    if (r.kind === 'walkover') {
      pl++;
      w++;
      continue;
    }
    const us = usHome ? r.hs : r.as,
      them = usHome ? r.as : r.hs;
    if (us == null || them == null) continue;
    pl++;
    gf += us;
    ga += them;
    if (them === 0) cs++;
    if (r.kind === 'penalty' && r.pens) {
      const uP = usHome ? r.pens.hs : r.pens.as,
        tP = usHome ? r.pens.as : r.pens.hs;
      if (uP > tP) w++;else l++;
    } else if (us > them) w++;else if (us === them) d++;else l++;
  }
  return {
    pl,
    w,
    d,
    l,
    gf,
    ga,
    gd: gf - ga,
    cs,
    winPct: pl ? Math.round(w / pl * 100) : 0
  };
}
function seasonCompTotals(season) {
  if (!season || season === 'all') return allCompTotals();
  var sOf = window.seasonOf || function () { return window.CURRENT_SEASON; };
  var results = (window.getDerivedResults ? window.getDerivedResults() : []).filter(function (r) { return (sOf(r) || window.CURRENT_SEASON) === season; });
  var pl = 0, w = 0, d = 0, l = 0, gf = 0, ga = 0, cs = 0;
  for (var i = 0; i < results.length; i++) {
    var r = results[i], usHome = r.home.includes('Angels');
    if (r.kind === 'walkover') { pl++; w++; continue; }
    var us = usHome ? r.hs : r.as, them = usHome ? r.as : r.hs;
    if (us == null || them == null) continue;
    pl++; gf += us; ga += them; if (them === 0) cs++;
    if (r.kind === 'penalty' && r.pens) { var uP = usHome ? r.pens.hs : r.pens.as, tP = usHome ? r.pens.as : r.pens.hs; if (uP > tP) w++; else l++; }
    else if (us > them) w++; else if (us === them) d++; else l++;
  }
  return { pl: pl, w: w, d: d, l: l, gf: gf, ga: ga, gd: gf - ga, cs: cs, winPct: pl ? Math.round(w / pl * 100) : 0 };
}
function matchLog(num, compMatcher, seasonKey) {
  let results = (window.getDerivedResults ? window.getDerivedResults() : []).slice();
  if (compMatcher) results = results.filter(r => compMatcher(r.competition));
  if (seasonKey && seasonKey !== 'all') { const sOf = window.seasonOf || (() => window.CURRENT_SEASON); results = results.filter(r => (sOf(r) || window.CURRENT_SEASON) === seasonKey); }
  const entries = window.getAllMatchEntries ? window.getAllMatchEntries() : [];
  const byId = {};
  entries.forEach(({
    id,
    data
  }) => {
    byId[id] = data;
  });
  const rows = results.map(r => ({
    r,
    d: pdate(r.date)
  })).sort((a, b) => a.d - b.d);
  const out = [];
  for (const {
    r
  } of rows) {
    if (r.kind === 'walkover') continue;
    const data = byId[r.id];
    if (!data) continue;
    const startE = (data.starters || []).find(e => nnum(e) === num);
    const subE = (data.bench || []).find(e => nnum(e) === num);
    const entry = startE || subE;
    if (!startE && !(subE && npos(subE).length > 0)) continue;
    const g = (data.goals || []).filter(x => x.num === num).length,
      a = (data.assists || []).filter(x => x.num === num).length;
    const posList = npos(entry);
    const isGk = posList.some(p => /^GK|^GOAL/i.test(p));
    const isDef = isGk || posList.some(p => /CB|LB|RB|WB|BACK|DEF|^D/i.test(p));
    const usHome = r.home.includes('Angels');
    const us = usHome ? r.hs : r.as,
      th = usHome ? r.as : r.hs;
    // Goals conceded come from the actual scoreline (source of truth), NOT the
    // optional opponent-goal list, which coaches often leave blank.
    const teamConc = th;
    const conceded = isGk ? teamConc : null;
    // Clean-sheet participation: the team kept a clean sheet (conceded 0) AND
    // this player was part of it. If the coach ticked specific contributors for
    // the match, trust that list; otherwise anyone who featured counts.
    const csTeam = th === 0;
    const csContribs = data.cleanSheetContributors || [];
    const csKeepers = data.cleanSheets || [];
    // Credited for a clean sheet ONLY if: the goalkeeper who kept it (auto), OR
    // explicitly listed as a contributor. No whole-squad fallback.
    const csPart = csTeam && (csKeepers.indexOf(num) > -1 || csContribs.indexOf(num) > -1);
    out.push({
      date: r.date,
      opp: (usHome ? r.away : r.home).replace(' FC', ''),
      g,
      a,
      res: us > th ? 'w' : us === th ? 'd' : 'l',
      isGk,
      def: isDef,
      teamConc,
      conceded,
      csTeam,
      csPart
    });
  }
  return out;
}
const POS_XY = {
  GK: [50, 90],
  CB: [50, 80],
  SW: [50, 85],
  RCB: [64, 81],
  LCB: [36, 81],
  RB: [82, 74],
  LB: [18, 74],
  RWB: [85, 64],
  LWB: [15, 64],
  CDM: [50, 65],
  DM: [50, 65],
  RDM: [64, 66],
  LDM: [36, 66],
  CM: [50, 50],
  RCM: [64, 51],
  LCM: [36, 51],
  RM: [82, 48],
  LM: [18, 48],
  CAM: [50, 36],
  AM: [50, 36],
  RAM: [66, 37],
  LAM: [34, 37],
  RW: [80, 30],
  LW: [20, 30],
  SS: [50, 28],
  CF: [50, 22],
  ST: [50, 16]
};
function posGroup(pos, gk) {
  const p = pos || '';
  if (gk || /^GK/.test(p)) return 'Goalkeepers';
  if (/CB|LB|RB|WB|SW|^DF/.test(p)) return 'Defenders';
  if (/DM|CM|AM|LM|RM|MF/.test(p)) return 'Midfielders';
  if (/ST|CF|SS|LW|RW|FW/.test(p)) return 'Forwards';
  return 'Squad';
}
function Ring({
  pct,
  value,
  label,
  sub,
  on
}) {
  const R = 46,
    C = 2 * Math.PI * R;
  const off = C * (1 - Math.max(0, Math.min(1, on ? pct : 0)));
  return /*#__PURE__*/React.createElement("div", {
    className: "m-ring"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "m-ring__svg",
    viewBox: "0 0 120 120"
  }, /*#__PURE__*/React.createElement("circle", {
    className: "m-ring__track",
    cx: "60",
    cy: "60",
    r: R,
    fill: "none",
    strokeWidth: "10"
  }), /*#__PURE__*/React.createElement("circle", {
    className: "m-ring__arc",
    cx: "60",
    cy: "60",
    r: R,
    fill: "none",
    strokeWidth: "10",
    strokeDasharray: C,
    strokeDashoffset: off,
    transform: "rotate(-90 60 60)"
  }), /*#__PURE__*/React.createElement("text", {
    className: "m-ring__val",
    x: "60",
    y: "60",
    textAnchor: "middle",
    dominantBaseline: "central"
  }, value)), /*#__PURE__*/React.createElement("span", {
    className: "m-ring__lbl"
  }, label), sub ? /*#__PURE__*/React.createElement("span", {
    className: "m-ring__sub"
  }, sub) : null);
}
function PageHero({
  eyebrow,
  title,
  sub,
  actions
}) {
  return /*#__PURE__*/React.createElement("section", {
    className: "mp-hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mp-hero__panel m-glass--3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "m-eyebrow m-eyebrow--volt"
  }, eyebrow), /*#__PURE__*/React.createElement("h1", {
    className: "mp-hero__title"
  }, title), sub ? /*#__PURE__*/React.createElement("p", {
    className: "m-lead mp-hero__sub"
  }, sub) : null, actions ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24,
      display: 'flex',
      gap: 12,
      flexWrap: 'wrap'
    }
  }, actions) : null)));
}
function Head({
  eyebrow,
  title,
  link
}) {
  const r = useReveal();
  return /*#__PURE__*/React.createElement("div", {
    className: "mh-head m-reveal",
    ref: r
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "m-eyebrow"
  }, eyebrow), /*#__PURE__*/React.createElement("h2", {
    className: "m-h2"
  }, title)), link ? /*#__PURE__*/React.createElement("a", {
    className: "m-btn m-btn--ghost",
    href: ({ 'Champions': 'champions.html', 'All results': 'results.html', 'Full table': 'league.html', 'Every player': 'teams.html', 'All partners': 'sponsors.html', 'Gallery': 'gallery.html' })[link] || '#',
    style: {
      padding: '12px 20px'
    }
  }, link, " ", /*#__PURE__*/React.createElement(Arrow, null)) : null);
}
function Modal({
  onClose,
  wide,
  children
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const k = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', k);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', k);
    };
  }, [onClose]);
  return /*#__PURE__*/React.createElement("div", {
    className: "m-modal",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("button", {
    className: "m-modal__close",
    "aria-label": "Close",
    onClick: onClose
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    className: "m-modal__panel",
    style: wide ? {
      width: 'min(1060px,100%)'
    } : {
      width: 'min(680px,100%)'
    },
    onClick: e => e.stopPropagation()
  }, children));
}

/* ══ PLAYER PROFILE - the showpiece (parameterised) ═════════════════════ */
function ProfileCard({
  num
}) {
  const allSeasons = ['all'].concat(window.ALL_SEASONS || ['25/26']);
  const [season, setSeason] = useState(window.CURRENT_SEASON || '25/26');
  const [comp, setComp] = useState('all');
  useEffect(() => { setComp('all'); }, [season]);
  const seasonKey = season === 'all' ? null : season;
  const compList = window.COMPETITIONS || [{ key: 'all', label: 'All', match: () => true }];
  const matcher = comp === 'all' ? null : (compList.find(c => c.key === comp) || {}).match;
  const availComps = [{ key: 'all', label: 'All' }].concat(compList.filter(c => c.key !== 'all').filter(c => window.derivedPlayerStats ? (window.derivedPlayerStats(num, c.match, seasonKey).apps || 0) > 0 : false).map(c => ({ key: c.key, label: c.label })));
  const data = useMemo(() => {
    const squad = window.derivedSquad ? window.derivedSquad(matcher, seasonKey) : [];
    const p = squad.find(x => x.num === num) || squad[0];
    if (!p) return null;
    const log = matchLog(p.num, matcher, seasonKey);
    const teamPlayed = (window.getDerivedResults ? window.getDerivedResults() : []).filter(r => {
      if (matcher && !matcher(r.competition)) return false;
      if (seasonKey && seasonKey !== 'all') { const sOf = window.seasonOf || (() => window.CURRENT_SEASON); if ((sOf(r) || window.CURRENT_SEASON) !== seasonKey) return false; }
      return r.kind !== 'walkover';
    }).length;
    const wins = log.filter(m => m.res === 'w').length;
    const teamGf = ((typeof seasonCompTotals === 'function') ? seasonCompTotals(season).gf : 0) || 0;
    const goalShare = teamGf ? Math.round(p.goals / teamGf * 100) : 0;
    const rankIn = key => squad.slice().sort((a, b) => (b[key] || 0) - (a[key] || 0)).findIndex(x => x.num === p.num) + 1;
    const comps = (window.COMPETITIONS || []).filter(c => c.key !== 'all').map(c => ({
      label: c.label,
      s: window.derivedPlayerStats(p.num, c.match, seasonKey)
    })).filter(c => c.s.apps > 0);
    const open = p.goals - p.penaltiesScored - p.setPiecesScored;
    const isGK = !!(p.gk || (typeof posGroup === 'function' && posGroup(p.mostPlayedPosition, p.gk) === 'Goalkeepers'));
    return {
      p,
      log,
      teamPlayed,
      wins,
      photo: photoOf(p.num),
      goalShare,
      teamGf,
      open,
      comps,
      isGK,
      goalRank: rankIn('goals'),
      assistRank: rankIn('assists'),
      motmRank: rankIn('motm'),
      csRank: rankIn('cleanSheets')
    };
  }, [num, season, comp]);
  const [ringRef, ringOn] = useOnscreen();
  const [barRef, barOn] = useOnscreen();
  if (!data) return null;
  const {
    p,
    log,
    teamPlayed,
    wins,
    photo,
    goalShare,
    teamGf,
    open,
    comps,
    isGK,
    goalRank,
    assistRank,
    motmRank,
    csRank
  } = data;
  const gkApps = p.gkApps || p.apps;
  const conceded = p.goalsConceded || 0;
  const cs = p.cleanSheets || 0;
  const cpg = gkApps ? conceded / gkApps : 0;
  const csRate = gkApps ? cs / gkApps : 0;
  const pensSaved = p.penaltiesSaved || 0;
  const gpg = p.apps ? p.goalInvolvements / p.apps : 0;
  const isDef = !isGK && typeof posGroup === 'function' && posGroup(p.mostPlayedPosition, p.gk) === 'Defenders';
  const csContribs = (log || []).filter(m => m.csPart).length;
  const csInvolve = p.apps ? csContribs / p.apps : 0;
  const rings = isGK ? [{
    label: 'Clean sheet %',
    value: Math.round(csRate * 100) + '%',
    pct: csRate,
    sub: `${cs} of ${gkApps}`
  }, {
    label: 'Conceded / game',
    value: cpg.toFixed(2),
    pct: 1 - Math.min(1, cpg / 3),
    sub: `${conceded} in ${gkApps}`
  }, {
    label: 'Win involvement',
    value: (teamPlayed ? Math.round(wins / teamPlayed * 100) : 0) + '%',
    pct: teamPlayed ? wins / teamPlayed : 0,
    sub: `${wins} of ${teamPlayed} games`
  }, {
    label: 'Availability',
    value: (teamPlayed ? Math.round(p.apps / teamPlayed * 100) : 0) + '%',
    pct: teamPlayed ? p.apps / teamPlayed : 0,
    sub: `${p.apps} of ${teamPlayed}`
  }] : [{
    label: 'G+A / game',
    value: gpg.toFixed(2),
    pct: Math.min(1, gpg / 2),
    sub: `${p.goalInvolvements} in ${p.apps}`
  }, {
    label: 'Win involvement',
    value: (teamPlayed ? Math.round(wins / teamPlayed * 100) : 0) + '%',
    pct: teamPlayed ? wins / teamPlayed : 0,
    sub: `${wins} of ${teamPlayed} games`
  }, {
    label: 'Availability',
    value: (teamPlayed ? Math.round(p.apps / teamPlayed * 100) : 0) + '%',
    pct: teamPlayed ? p.apps / teamPlayed : 0,
    sub: `${p.apps} of ${teamPlayed}`
  }, isDef ? {
    label: 'Clean sheet involve.',
    value: (p.apps ? Math.round(csInvolve * 100) : 0) + '%',
    pct: csInvolve,
    sub: `${csContribs} of ${p.apps}`
  } : {
    label: 'MOTM rate',
    value: (p.apps ? Math.round(p.motm / p.apps * 100) : 0) + '%',
    pct: p.apps ? p.motm / p.apps : 0,
    sub: `${p.motm} awards`
  }];

  // trend: GK / defenders = cumulative clean sheets; other outfield = cumulative G+A
  const tlog = isGK ? log.filter(m => m.conceded != null) : log;
  const W = 520,
    H = 120,
    pad = 8;
  let cum = 0;
  const series = tlog.map(m => cum += isGK ? (m.conceded === 0 ? 1 : 0) : isDef ? (m.csPart ? 1 : 0) : m.g + m.a);
  const maxCum = Math.max(1, cum);
  const pts = series.map((v, i) => [pad + (series.length <= 1 ? 0 : i / (series.length - 1) * (W - 2 * pad)), H - pad - v / maxCum * (H - 2 * pad)]);
  const linePath = pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' ');
  const areaPath = pts.length ? `${linePath} L ${pts[pts.length - 1][0].toFixed(1)} ${H - pad} L ${pts[0][0].toFixed(1)} ${H - pad} Z` : '';
  const kpis = isGK ? [{
    v: p.apps,
    l: 'Apps'
  }, {
    v: cs,
    l: 'Clean sheets',
    volt: true
  }, {
    v: conceded,
    l: 'Conceded'
  }, {
    v: pensSaved,
    l: 'Pens saved',
    volt: true
  }, {
    v: p.motm,
    l: 'MOTM'
  }, {
    v: (p.yc || 0) + (p.rc || 0),
    l: 'Cards'
  }] : [{
    v: p.apps,
    l: 'Apps'
  }, {
    v: p.goals,
    l: 'Goals',
    volt: true
  }, {
    v: p.assists,
    l: 'Assists',
    volt: true
  }, isDef ? {
    v: csContribs,
    l: 'Clean sheets',
    volt: true
  } : {
    v: p.goalInvolvements,
    l: 'G+A'
  }, {
    v: p.motm,
    l: 'MOTM'
  }, {
    v: (p.yc || 0) + (p.rc || 0),
    l: 'Cards'
  }];
  const dist = [{
    name: 'Open play',
    val: open
  }, {
    name: 'Penalties',
    val: p.penaltiesScored
  }, {
    name: 'Set pieces',
    val: p.setPiecesScored
  }];
  const impact = isGK ? [{
    ic: 'shield',
    v: Math.round(csRate * 100) + '%',
    t: 'Clean sheet rate',
    s: `${cs} of ${gkApps}`
  }, {
    ic: 'trophy',
    v: '#' + csRank,
    t: 'Clean sheet rank',
    s: 'in the squad'
  }, {
    ic: 'pulse',
    v: cpg.toFixed(2),
    t: 'Conceded / game',
    s: `${conceded} conceded`
  }, {
    ic: 'star',
    v: '#' + motmRank,
    t: 'MOTM rank',
    s: `${p.motm} awards`
  }] : [{
    ic: 'ball',
    v: goalShare + '%',
    t: 'Share of club goals',
    s: `${p.goals} of ${teamGf}`
  }, {
    ic: 'trophy',
    v: '#' + goalRank,
    t: 'Goalscoring rank',
    s: goalRank === 1 ? 'club top scorer' : 'in the squad'
  }, {
    ic: 'pass',
    v: '#' + assistRank,
    t: 'Assist rank',
    s: 'in the squad'
  }, {
    ic: 'star',
    v: '#' + motmRank,
    t: 'MOTM rank',
    s: `${p.motm} awards`
  }];
  const posTop = (p.positionBreakdown || []).slice(0, 5);
  const posMax = posTop.length ? posTop[0][1] : 1;
  const sponsorName = (window.getPlayerSponsor ? window.getPlayerSponsor(p.num) : '') || '';
  return /*#__PURE__*/React.createElement("div", {
    className: "m-pc m-glass"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-pc__top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-pc__photo m-drift"
  }, photo ? /*#__PURE__*/React.createElement("img", {
    src: photo,
    alt: `${p.first} ${p.last}`
  }) : /*#__PURE__*/React.createElement("img", {
    className: "m-pc__ghost",
    src: "assets/badge/sue-angels-shield.webp",
    alt: ""
  })), /*#__PURE__*/React.createElement("div", {
    className: "m-pc__id"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-pc__pos"
  }, /*#__PURE__*/React.createElement("span", {
    className: "m-chip m-chip--volt"
  }, isGK ? 'Goalkeeper' : p.mostPlayedPosition || 'Squad'), p.captained ? /*#__PURE__*/React.createElement("span", {
    className: "m-chip"
  }, "Captain") : null, isGK && csRank === 1 ? /*#__PURE__*/React.createElement("span", {
    className: "m-chip"
  }, "Most clean sheets") : !isGK && goalRank === 1 ? /*#__PURE__*/React.createElement("span", {
    className: "m-chip"
  }, "Top scorer") : null), /*#__PURE__*/React.createElement("h3", {
    className: "m-pc__name"
  }, p.last, /*#__PURE__*/React.createElement("span", null, p.first)), sponsorName ? /*#__PURE__*/React.createElement("div", {
    className: "m-pc__sponsor"
  }, /*#__PURE__*/React.createElement("span", {
    className: "m-pc__sponsor-l"
  }, "Sponsored by"), /*#__PURE__*/React.createElement("b", null, sponsorName)) : null)), /*#__PURE__*/React.createElement("div", {
    className: "m-pc__filters"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mp-subtabs"
  }, allSeasons.map(s => /*#__PURE__*/React.createElement("button", {
    key: s,
    className: `mp-subtab ${season === s ? 'is-active' : ''}`,
    onClick: () => setSeason(s)
  }, s === 'all' ? 'All seasons' : s))), availComps.length > 1 ? /*#__PURE__*/React.createElement("div", {
    className: "mp-subtabs"
  }, availComps.map(c => /*#__PURE__*/React.createElement("button", {
    key: c.key,
    className: `mp-subtab ${comp === c.key ? 'is-active' : ''}`,
    onClick: () => setComp(c.key)
  }, c.label))) : null), /*#__PURE__*/React.createElement("div", {
    ref: ringRef
  }, /*#__PURE__*/React.createElement(StatCounters, {
    p: p,
    isGK: isGK,
    matcher: matcher,
    seasonKey: seasonKey
  })), /*#__PURE__*/React.createElement("div", {
    className: "m-grid m-grid--2",
    ref: barRef
  }, isGK ? /*#__PURE__*/React.createElement("div", {
    className: "m-panel"
  }, /*#__PURE__*/React.createElement("p", {
    className: "m-panel__t"
  }, "Defensive record"), /*#__PURE__*/React.createElement("div", {
    className: "m-bars"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "m-bar__top"
  }, /*#__PURE__*/React.createElement("span", {
    className: "m-bar__name"
  }, "Clean sheets"), /*#__PURE__*/React.createElement("span", {
    className: "m-bar__val m-num"
  }, cs)), /*#__PURE__*/React.createElement("div", {
    className: "m-bar__track"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-bar__fill",
    style: {
      width: barOn ? csRate * 100 + '%' : 0
    }
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "m-bar__top"
  }, /*#__PURE__*/React.createElement("span", {
    className: "m-bar__name"
  }, "Conceded in"), /*#__PURE__*/React.createElement("span", {
    className: "m-bar__val m-num"
  }, gkApps - cs)), /*#__PURE__*/React.createElement("div", {
    className: "m-bar__track"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-bar__fill",
    style: {
      width: barOn ? (gkApps ? (gkApps - cs) / gkApps * 100 : 0) + '%' : 0
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-bar__top"
  }, /*#__PURE__*/React.createElement("span", {
    className: "m-bar__name"
  }, "Shutout rate"), /*#__PURE__*/React.createElement("span", {
    className: "m-bar__val m-num"
  }, Math.round(csRate * 100), "%")), /*#__PURE__*/React.createElement("div", {
    className: "m-bar__track"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-bar__fill m-bar__fill--soft",
    style: {
      width: barOn ? csRate * 100 + '%' : 0
    }
  }))))) : /*#__PURE__*/React.createElement("div", {
    className: "m-panel"
  }, /*#__PURE__*/React.createElement("p", {
    className: "m-panel__t"
  }, "Goal breakdown"), /*#__PURE__*/React.createElement("div", {
    className: "m-bars"
  }, dist.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-bar__top"
  }, /*#__PURE__*/React.createElement("span", {
    className: "m-bar__name"
  }, d.name), /*#__PURE__*/React.createElement("span", {
    className: "m-bar__val m-num"
  }, d.val)), /*#__PURE__*/React.createElement("div", {
    className: "m-bar__track"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-bar__fill",
    style: {
      width: barOn ? (p.goals ? d.val / p.goals * 100 : 0) + '%' : 0
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-bar__top"
  }, /*#__PURE__*/React.createElement("span", {
    className: "m-bar__name"
  }, "Goals vs assists"), /*#__PURE__*/React.createElement("span", {
    className: "m-bar__val m-num"
  }, p.goals, "\xB7", p.assists)), /*#__PURE__*/React.createElement("div", {
    className: "m-bar__track"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-bar__fill m-bar__fill--soft",
    style: {
      width: barOn ? (p.goalInvolvements ? p.goals / p.goalInvolvements * 100 : 0) + '%' : 0
    }
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "m-panel"
  }, /*#__PURE__*/React.createElement("p", {
    className: "m-panel__t"
  }, "Season impact"), /*#__PURE__*/React.createElement("div", {
    className: "m-srows"
  }, impact.map((r, i) => /*#__PURE__*/React.createElement("div", {
    className: "m-srow",
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    className: "m-srow__ic"
  }, I[r.ic]), /*#__PURE__*/React.createElement("div", {
    className: "m-srow__tx"
  }, /*#__PURE__*/React.createElement("b", null, r.v), /*#__PURE__*/React.createElement("span", null, r.t)), /*#__PURE__*/React.createElement("span", {
    className: "m-srow__s"
  }, r.s)))))), /*#__PURE__*/React.createElement("div", {
    className: "m-grid m-grid--2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-panel"
  }, /*#__PURE__*/React.createElement("p", {
    className: "m-panel__t"
  }, isGK ? ((p.goals || p.assists) ? 'Cumulative clean sheets & contributions' : 'Cumulative clean sheets') : 'Cumulative goal involvements'), /*#__PURE__*/React.createElement(SparkChart, {
    log: log,
    isGK: isGK
  }), /*#__PURE__*/React.createElement("p", {
    className: "m-panel__t",
    style: {
      marginTop: 20
    }
  }, "Contribution breakdown"), /*#__PURE__*/React.createElement("p", {
    className: "m-panel__hint"
  }, "Share of the team\u2019s output. Hover any metric to see what it means"), /*#__PURE__*/React.createElement(PercentileWheel, {
    p: p
  })), /*#__PURE__*/React.createElement("div", {
    className: "m-panel"
  }, /*#__PURE__*/React.createElement("p", {
    className: "m-panel__t"
  }, "Where they play"), /*#__PURE__*/React.createElement("div", {
    className: "m-pitch"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "m-pitch__lines",
    viewBox: "0 0 100 125",
    preserveAspectRatio: "none"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "3",
    width: "94",
    height: "119",
    rx: "3"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "62.5",
    x2: "97",
    y2: "62.5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "50",
    cy: "62.5",
    r: "11"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "28",
    y: "3",
    width: "44",
    height: "20"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "28",
    y: "102",
    width: "44",
    height: "20"
  })), posTop.map(([pos, n], i) => { const xy = POS_XY[pos] || [50, 50]; const heat = posMax ? n / posMax : 0; const size = 80 + heat * 135; return /*#__PURE__*/React.createElement("span", { className: "m-pitch__heat", key: 'h' + i, style: { left: xy[0] + '%', top: xy[1] + '%', width: size, height: size, '--heat': heat } }); }), posTop.map(([pos, n], i) => {
    const xy = POS_XY[pos] || [50, 50];
    const sz = 22 + n / posMax * 16;
    return /*#__PURE__*/React.createElement("span", {
      className: "m-pitch__node",
      key: i,
      style: {
        left: xy[0] + '%',
        top: xy[1] + '%',
        width: sz,
        height: sz
      }
    }, pos, /*#__PURE__*/React.createElement("small", null, n, "\xD7"));
  })))), comps.length ? /*#__PURE__*/React.createElement("div", {
    className: "m-panel"
  }, /*#__PURE__*/React.createElement("p", {
    className: "m-panel__t"
  }, "By competition \xB7 25/26"), /*#__PURE__*/React.createElement("table", {
    className: "m-split"
  }, /*#__PURE__*/React.createElement("thead", null, isGK ? /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Competition"), /*#__PURE__*/React.createElement("th", null, "Apps"), /*#__PURE__*/React.createElement("th", null, "CS"), /*#__PURE__*/React.createElement("th", null, "Conc"), /*#__PURE__*/React.createElement("th", null, "MOTM")) : /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Competition"), /*#__PURE__*/React.createElement("th", null, "Apps"), /*#__PURE__*/React.createElement("th", null, "G"), /*#__PURE__*/React.createElement("th", null, "A"), /*#__PURE__*/React.createElement("th", null, "MOTM"))), /*#__PURE__*/React.createElement("tbody", null, comps.map((c, i) => isGK ? /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", null, c.label), /*#__PURE__*/React.createElement("td", null, c.s.apps), /*#__PURE__*/React.createElement("td", {
    className: "m-split__hl"
  }, c.s.cleanSheets), /*#__PURE__*/React.createElement("td", null, c.s.goalsConceded), /*#__PURE__*/React.createElement("td", null, c.s.motm)) : /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", null, c.label), /*#__PURE__*/React.createElement("td", null, c.s.apps), /*#__PURE__*/React.createElement("td", {
    className: "m-split__hl"
  }, c.s.goals), /*#__PURE__*/React.createElement("td", {
    className: "m-split__hl"
  }, c.s.assists), /*#__PURE__*/React.createElement("td", null, c.s.motm)))))) : null, /*#__PURE__*/React.createElement("div", {
    className: "m-panel"
  }, /*#__PURE__*/React.createElement("p", {
    className: "m-panel__t"
  }, "Last ", Math.min(10, (isGK ? tlog : log).length), " featured"), /*#__PURE__*/React.createElement("div", {
    className: "m-form"
  }, (isGK ? tlog : log).slice(-10).map((m, i) => /*#__PURE__*/React.createElement("div", {
    className: "m-form__cell",
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    className: `m-form__res m-form__res--${m.res}`
  }, m.res.toUpperCase()), /*#__PURE__*/React.createElement("div", {
    className: "m-form__ga"
  }, isGK ? m.conceded === 0 ? 'CS' : `${m.conceded} conc` : m.g || m.a ? `${m.g}G ${m.a}A` : '·'), /*#__PURE__*/React.createElement("div", {
    className: "m-form__opp"
  }, m.opp)))))
  , (function () {
    var h = React.createElement;
    var rec = window.getPlayerRecognition ? window.getPlayerRecognition(p.num) : null;
    if (!rec) return null;
    var items = [];
    rec.records.forEach(function (r) { items.push(['record', r.title, r.landmark ? (r.scope || r.value) : r.value]); });
    rec.potm.forEach(function (r) { items.push(['award', 'Player of the Month', ((r.month || '') + ' ' + (r.season || '')).trim()]); });
    rec.seasonAwards.forEach(function (r) { items.push(['award', r.title, r.season || '']); });
    var ms = rec.milestones || [];
    if (!items.length && !ms.length) return null;
    return h('div', { className: 'm-panel m-pc__ach' },
      h('p', { className: 'm-panel__t' }, 'Achievements & Milestones'),
      items.length ? h('div', { className: 'pc-ach__list' }, items.map(function (it, i) { return h('div', { key: 'a' + i, className: 'pc-ach__item pc-ach__item--' + it[0] }, h('span', { className: 'pc-ach__label' }, it[1]), it[2] ? h('span', { className: 'pc-ach__sub' }, it[2]) : null); })) : null,
      ms.length ? h('div', { className: 'pc-ach__chips' }, ms.map(function (m, i) { return h('span', { key: 'm' + i, className: 'pc-ach__chip' }, m.title); })) : null);
  })());
}

/* ══ HOME ═══════════════════════════════════════════════════════════════ */
function useCountdown(targetISO) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!now || !targetISO) return null;
  let diff = Math.max(0, new Date(targetISO).getTime() - now);
  const d = Math.floor(diff / 864e5);
  diff -= d * 864e5;
  const h = Math.floor(diff / 36e5);
  diff -= h * 36e5;
  const m = Math.floor(diff / 6e4);
  return {
    d,
    h,
    m
  };
}
function ResCard({
  r
}) {
  const usHome = r.home.includes('Angels');
  const us = usHome ? r.hs : r.as,
    th = usHome ? r.as : r.hs;
  let res = 'l';
  if (r.kind === 'walkover') res = 'w';else if (us > th) res = 'w';else if (us === th) res = 'd';
  const Badge = window.TeamBadge;
  return /*#__PURE__*/React.createElement("div", {
    className: "mh-res"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mh-res__top"
  }, /*#__PURE__*/React.createElement("span", {
    className: `mh-wdl mh-wdl--${res}`
  }, res.toUpperCase()), /*#__PURE__*/React.createElement("span", {
    className: "mh-res__date"
  }, r.date)), /*#__PURE__*/React.createElement("div", {
    className: `mh-res__row ${usHome && res === 'w' ? 'mh-res__row--win' : ''}`
  }, Badge ? /*#__PURE__*/React.createElement(Badge, {
    team: r.home,
    size: 27
  }) : null, /*#__PURE__*/React.createElement("span", null, r.home.replace(' FC', '')), /*#__PURE__*/React.createElement("b", null, r.kind === 'walkover' ? usHome ? 'W' : '-' : r.hs)), /*#__PURE__*/React.createElement("div", {
    className: `mh-res__row ${!usHome && res === 'w' ? 'mh-res__row--win' : ''}`
  }, Badge ? /*#__PURE__*/React.createElement(Badge, {
    team: r.away,
    size: 27
  }) : null, /*#__PURE__*/React.createElement("span", null, r.away.replace(' FC', '')), /*#__PURE__*/React.createElement("b", null, r.kind === 'walkover' ? !usHome ? 'W' : '-' : r.as)), /*#__PURE__*/React.createElement("div", {
    className: "mh-res__comp"
  }, r.competition || 'League Ten', " \xB7 ", usHome ? 'Home' : 'Away'));
}
// Slug for share-friendly player URLs, e.g. "Louis Allen" -> "louis-allen".
function saSlug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
function saPlayerName(p) { return p ? ((p.first || '') + ' ' + (p.last || '')).trim() : ''; }

// Wrap canvas text to <=maxLines, drawn centred with the block ending at baseY.
function saWrapText(c, text, x, baseY, maxW, lh, maxLines) {
  var words = String(text || '').split(' '), line = '', lines = [];
  for (var i = 0; i < words.length; i++) {
    var test = line ? line + ' ' + words[i] : words[i];
    if (c.measureText(test).width > maxW && line) { lines.push(line); line = words[i]; }
    else line = test;
  }
  if (line) lines.push(line);
  if (lines.length > (maxLines || 2)) { lines = lines.slice(0, maxLines || 2); lines[lines.length - 1] = lines[lines.length - 1].replace(/\W*$/, '') + '…'; }
  var startY = baseY - (lines.length - 1) * lh;
  for (var j = 0; j < lines.length; j++) c.fillText(lines[j], x, startY + j * lh);
  return lines.length;
}
// Generate a branded 1080x1920 Instagram-story card as a PNG data URL, so what
// lands in someone's story looks designed (badge, photo, name, branding) rather
// than a raw photo. Resolves null on any failure so the caller can fall back.
function saStoryImage(spec, post) {
  return new Promise(function (resolve) {
    try {
      if (!spec) return resolve(null);
      var W = 1080, H = post ? 1350 : 1920;
      var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      var c = cv.getContext('2d');
      function rr(x, y, w, hh, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + hh, r); c.arcTo(x + w, y + hh, x, y + hh, r); c.arcTo(x, y + hh, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
      function load(src) { return new Promise(function (res) { if (!src) return res(null); var im = new Image(); im.crossOrigin = 'anonymous'; im.onload = function () { res(im); }; im.onerror = function () { res(null); }; im.src = src; }); }
      var draw = function () {
        var P = { frame: '#0A2230', border: 'rgba(214,242,58,0.55)', eyebrow: '#D6F23A', title: '#FFFFFF', subtitle: '#D6F23A', scrim: '4,18,27' };
        var bg0 = c.createRadialGradient(W / 2, 0, 120, W / 2, 0, Math.max(1480, H));
        bg0.addColorStop(0, 'rgb(20,56,73)'); bg0.addColorStop(1, 'rgb(4,18,27)');
        c.fillStyle = bg0; c.fillRect(0, 0, W, H);
        var tracked = function (v) { try { c.letterSpacing = v; } catch (e) {} };
        Promise.all([load(spec.badge || 'assets/badge/sue-angels-badge.webp'), load(spec.photo), load(spec.homeBadge), load(spec.awayBadge), load('assets/sponsors/sporting-solutions.webp'), load('assets/sponsors/hodgson-roofing.webp'), load('assets/sponsors/staines-rugby.png')]).then(function (imgs) {
          var badge = imgs[0], photo = imgs[1], homeImg = imgs[2], awayImg = imgs[3];
          var sponsors = [imgs[4], imgs[5], imgs[6]].filter(Boolean);
          var clean = function (s) { return String(s || '').replace(/ FC$/i, '').trim(); };
          c.textAlign = 'center';
          // bottom zone: sponsors + url, anchored to the foot of the card
          var FOOT_Y = H - 54, SP_LOGO_Y = H - 232, SP_LABEL_Y = H - 264;
          var drawFooter = function () {
            if (sponsors.length) {
              tracked('4px'); c.fillStyle = 'rgba(255,255,255,0.55)'; c.font = '700 25px "Hanken Grotesk", Arial, sans-serif'; c.fillText('PROUDLY BACKED BY', W / 2, SP_LABEL_Y); tracked('0px');
              var spw = 258, sph = 138, sgap = 24, stot = sponsors.length * spw + (sponsors.length - 1) * sgap, sx = W / 2 - stot / 2, sy = SP_LOGO_Y, spad = 12;
              sponsors.forEach(function (im) {
                c.fillStyle = '#FFFFFF'; rr(sx, sy, spw, sph, 16); c.fill();
                var aw = spw - 2 * spad, ah = sph - 2 * spad, iar = im.width / im.height, idw, idh;
                if (iar > aw / ah) { idw = aw; idh = aw / iar; } else { idh = ah; idw = ah * iar; }
                c.drawImage(im, sx + (spw - idw) / 2, sy + (sph - idh) / 2, idw, idh);
                sx += spw + sgap;
              });
            }
            c.fillStyle = 'rgba(255,255,255,0.55)'; c.font = '600 34px "Hanken Grotesk", Arial, sans-serif';
            c.fillText(String(spec.footer || 'suesangelsfc.co.uk'), W / 2, FOOT_Y);
          };
          if (spec.kind === 'score') {
            var drawBadge = function (im, cx, cyc, sz) { if (!im) return; var ar = im.width / im.height, w = sz, hh = sz; if (ar > 1) hh = sz / ar; else w = sz * ar; c.drawImage(im, cx - w / 2, cyc - hh / 2, w, hh); };
            var SC = post ? { ftY: 124, scY: 286, badge: 128, gap: 44, scFont: 84, compY: 480, max1: 3, max2: 3 } : { ftY: 168, scY: 384, badge: 160, gap: 56, scFont: 116, compY: 644, max1: 5, max2: 4 };
            tracked('6px'); c.fillStyle = 'rgba(255,255,255,0.5)'; c.font = '700 28px "Hanken Grotesk", Arial, sans-serif';
            c.fillText('FULL TIME', W / 2, SC.ftY); tracked('0px');
            c.font = '600 ' + SC.scFont + 'px "Clash Display", "Hanken Grotesk", Arial, sans-serif';
            var scoreStr = (spec.hs != null ? spec.hs : '') + '  -  ' + (spec.as != null ? spec.as : '');
            var sw = c.measureText(scoreStr).width;
            drawBadge(homeImg, W / 2 - sw / 2 - SC.gap - SC.badge / 2, SC.scY, SC.badge);
            drawBadge(awayImg, W / 2 + sw / 2 + SC.gap + SC.badge / 2, SC.scY, SC.badge);
            c.fillStyle = '#FFFFFF'; c.fillText(scoreStr, W / 2, SC.scY + SC.scFont * 0.34);
            c.fillStyle = 'rgba(255,255,255,0.62)'; c.font = '600 26px "Hanken Grotesk", Arial, sans-serif';
            c.fillText(clean(spec.home), W / 2 - sw / 2 - SC.gap - SC.badge / 2, SC.scY + SC.badge / 2 + 54);
            c.fillText(clean(spec.away), W / 2 + sw / 2 + SC.gap + SC.badge / 2, SC.scY + SC.badge / 2 + 54);
            var cy = SC.compY;
            tracked('4px'); c.fillStyle = '#D6F23A'; c.font = '700 27px "Hanken Grotesk", Arial, sans-serif';
            c.fillText(String(spec.eyebrow || '').toUpperCase(), W / 2, cy); tracked('0px'); cy += 28;
            if (spec.result) {
              var rl = spec.result === 'w' ? 'WIN' : spec.result === 'l' ? 'LOSS' : 'DRAW';
              tracked('3px'); c.font = '700 28px "Hanken Grotesk", Arial, sans-serif';
              var tw = c.measureText(rl).width + 6, ppw = tw + 60, pph = 56, prx = W / 2 - ppw / 2, pry = cy + 14;
              var pbg = spec.result === 'w' ? '#D6F23A' : spec.result === 'l' ? 'rgba(255,120,120,0.20)' : 'rgba(255,255,255,0.15)';
              var ptx = spec.result === 'w' ? '#071D29' : spec.result === 'l' ? '#ffb4b4' : '#ffffff';
              c.fillStyle = pbg; rr(prx, pry, ppw, pph, pph / 2); c.fill();
              c.fillStyle = ptx; c.fillText(rl, W / 2, pry + 38); tracked('0px'); cy = pry + pph + 50;
            } else { cy += 42; }
            var meta = []; if (spec.venue) meta.push(spec.venue); if (spec.kick) meta.push('KO ' + spec.kick);
            if (meta.length && !post) { tracked('3px'); c.fillStyle = 'rgba(255,255,255,0.5)'; c.font = '600 25px "Hanken Grotesk", Arial, sans-serif'; c.fillText(meta.join('   ·   ').toUpperCase(), W / 2, cy); tracked('0px'); cy += 64; }
            cy += 8;
            // Always show ALL scorers + assisters - size the rows to fit the space.
            var nG = (spec.scorers || []).length, nA = (spec.assists || []).length;
            var nLab = (nG ? 1 : 0) + (nA ? 1 : 0);
            var avail = (SP_LABEL_Y - 36) - cy;
            var units = nG + nA + nLab + (nLab > 1 ? 0.6 : 0);
            var lineH = units > 0 ? Math.min(54, avail / units) : 54;
            var nameFont = Math.max(18, Math.min(36, Math.round(lineH * 0.7)));
            var labelFont = Math.max(17, Math.min(27, Math.round(lineH * 0.52)));
            var section = function (label, items) {
              if (!items || !items.length) return;
              tracked('4px'); c.fillStyle = '#D6F23A'; c.font = '700 ' + labelFont + 'px "Hanken Grotesk", Arial, sans-serif'; c.fillText(label, W / 2, cy); tracked('0px'); cy += lineH;
              c.fillStyle = '#FFFFFF'; c.font = '700 ' + nameFont + 'px "Hanken Grotesk", Arial, sans-serif';
              items.forEach(function (it) { c.fillText(String(it.name).toUpperCase() + (it.n > 1 ? '  ×' + it.n : ''), W / 2, cy); cy += lineH; });
              cy += lineH * 0.6;
            };
            section('GOALS', spec.scorers);
            section('ASSISTS', spec.assists);
            drawFooter();
          } else if (spec.kind === 'table') {
            // ---- league table graphic (actual standings) ----
            var trows = spec.rows || [];
            tracked('4px'); c.fillStyle = 'rgba(255,255,255,0.5)'; c.font = '700 ' + (post ? 23 : 26) + 'px "Hanken Grotesk", Arial, sans-serif';
            c.fillText(String(spec.eyebrow || 'LEAGUE TABLE').toUpperCase(), W / 2, post ? 104 : 150); tracked('0px');
            c.fillStyle = '#D6F23A'; c.font = '700 ' + (post ? 54 : 68) + 'px "Clash Display", "Hanken Grotesk", Arial, sans-serif';
            c.fillText(String(spec.title || 'League Ten').toUpperCase(), W / 2, post ? 176 : 248);
            var topY = post ? 286 : 376, botY = SP_LABEL_Y - 24;
            var rh = Math.min(post ? 64 : 92, (botY - topY) / (trows.length + 1.3));
            var rowFont = Math.max(19, Math.min(33, Math.round(rh * 0.44)));
            var headFont = Math.max(15, Math.min(22, Math.round(rh * 0.34)));
            var COL = { pos: 78, club: 142, p: 636, w: 700, d: 764, l: 828, gd: 916, pts: 1012 };
            var ML = 54, MR = 1026;
            c.font = '700 ' + headFont + 'px "Hanken Grotesk", Arial, sans-serif'; c.fillStyle = 'rgba(255,255,255,0.5)'; tracked('1px');
            c.textAlign = 'left'; c.fillText('#', COL.pos, topY); c.fillText('CLUB', COL.club, topY);
            c.textAlign = 'right'; c.fillText('P', COL.p, topY); c.fillText('W', COL.w, topY); c.fillText('D', COL.d, topY); c.fillText('L', COL.l, topY); c.fillText('GD', COL.gd, topY); c.fillText('PTS', COL.pts, topY);
            tracked('0px');
            c.strokeStyle = 'rgba(255,255,255,0.14)'; c.lineWidth = 2; c.beginPath(); c.moveTo(ML, topY + rh * 0.34); c.lineTo(MR, topY + rh * 0.34); c.stroke();
            var ty = topY + rh;
            trows.forEach(function (r) {
              if (r.us) { c.fillStyle = 'rgba(214,242,58,0.14)'; rr(ML, ty - rh * 0.64, MR - ML, rh * 0.9, 12); c.fill(); }
              var main = r.us ? '#D6F23A' : '#FFFFFF';
              c.textAlign = 'left'; c.font = '800 ' + rowFont + 'px "Hanken Grotesk", Arial, sans-serif'; c.fillStyle = r.us ? '#D6F23A' : 'rgba(255,255,255,0.55)'; c.fillText(String(r.pos), COL.pos, ty);
              c.fillStyle = main; c.font = (r.us ? '800 ' : '600 ') + rowFont + 'px "Hanken Grotesk", Arial, sans-serif';
              var club = String(r.club || ''), maxw = COL.p - 86 - COL.club, full = club;
              while (c.measureText(club).width > maxw && club.length > 4) club = club.slice(0, -1);
              if (club !== full) club = club.replace(/\s+$/, '') + '…';
              c.fillText(club, COL.club, ty);
              c.textAlign = 'right'; c.fillStyle = r.us ? '#D6F23A' : 'rgba(255,255,255,0.82)'; c.font = '600 ' + rowFont + 'px "Hanken Grotesk", Arial, sans-serif';
              c.fillText(String(r.pl), COL.p, ty); c.fillText(String(r.w), COL.w, ty); c.fillText(String(r.d), COL.d, ty); c.fillText(String(r.l), COL.l, ty);
              c.fillText((typeof r.gd === 'number' ? (r.gd > 0 ? '+' : '') + r.gd : String(r.gd)), COL.gd, ty);
              c.fillStyle = main; c.font = '800 ' + rowFont + 'px "Hanken Grotesk", Arial, sans-serif'; c.fillText(String(r.pts), COL.pts, ty);
              ty += rh;
            });
            c.textAlign = 'center';
            drawFooter();
          } else {
            // ---- photo card (players / coaches / articles / album / video) ----
            var HD = post ? { by: 64, bs: 108, ey: 238, py: 308 } : { by: 120, bs: 150, ey: 332, py: 410 };
            if (badge) c.drawImage(badge, W / 2 - HD.bs / 2, HD.by, HD.bs, HD.bs);
            tracked('6px'); c.fillStyle = 'rgba(255,255,255,0.5)'; c.font = '700 ' + (post ? 26 : 29) + 'px "Hanken Grotesk", Arial, sans-serif';
            c.fillText(String(spec.eyebrow || "SUE'S ANGELS FC").toUpperCase(), W / 2, HD.ey); tracked('0px');
            var SUB_Y = SP_LABEL_Y - 66, TITLE_Y = SUB_Y - 56;
            var px2 = 130, py2 = HD.py, pw2 = W - 260, ph2 = (TITLE_Y - 132) - py2;
            c.save(); rr(px2, py2, pw2, ph2, 44); c.clip();
            if (photo) {
              var ar = photo.width / photo.height, far = pw2 / ph2, dw, dh, dx, dy;
              if (ar > far) { dh = ph2; dw = ph2 * ar; } else { dw = pw2; dh = pw2 / ar; }
              // Player photos: zoom into the upper body so the face is the focus.
              if (spec.face) { dw *= 1.34; dh *= 1.34; }
              dx = px2 - (dw - pw2) / 2;
              dy = py2 - (dh - ph2) * (spec.face ? 0.1 : 0.2);
              c.drawImage(photo, dx, dy, dw, dh);
            } else { c.fillStyle = P.frame; c.fillRect(px2, py2, pw2, ph2); if (badge) { var bz = Math.min(340, ph2 - 80); c.drawImage(badge, W / 2 - bz / 2, py2 + ph2 / 2 - bz / 2, bz, bz); } }
            var sg = c.createLinearGradient(0, py2 + ph2 - 200, 0, py2 + ph2);
            sg.addColorStop(0, 'rgba(' + P.scrim + ',0)'); sg.addColorStop(1, 'rgba(' + P.scrim + ',0.5)');
            c.fillStyle = sg; c.fillRect(px2, py2 + ph2 - 200, pw2, 200);
            c.restore();
            c.strokeStyle = 'rgba(214,242,58,0.45)'; c.lineWidth = 3; rr(px2, py2, pw2, ph2, 44); c.stroke();
            c.fillStyle = P.title; c.font = '700 ' + (post ? 64 : 74) + 'px "Clash Display", "Hanken Grotesk", Arial, sans-serif';
            saWrapText(c, String(spec.title || '').toUpperCase(), W / 2, TITLE_Y, W - 150, post ? 72 : 82, 2);
            if (spec.subtitle) { tracked('2px'); c.fillStyle = '#D6F23A'; c.font = '700 ' + (post ? 28 : 31) + 'px "Hanken Grotesk", Arial, sans-serif'; c.fillText(String(spec.subtitle).toUpperCase(), W / 2, SUB_Y); tracked('0px'); }
            drawFooter();
          }
          try { resolve(cv.toDataURL('image/jpeg', 0.92)); } catch (e) { resolve(null); }
        }, function () { resolve(null); });
      };
      if (document.fonts && document.fonts.ready && document.fonts.ready.then) { document.fonts.ready.then(draw, draw); } else { draw(); }
    } catch (e) { resolve(null); }
  });
}
// Build a story-card spec for a squad player (photo + name + headline stat).
window.saPlayerStorySpec = function (num) {
  try {
    var squad = window.derivedSquad ? window.derivedSquad(null, null) : [];
    var p = null; for (var i = 0; i < squad.length; i++) { if (squad[i].num === num) { p = squad[i]; break; } }
    if (!p) return null;
    var nm = saPlayerName(p) || "Sue's Angels player";
    var pos = p.gk ? 'Goalkeeper' : (p.mostPlayedPosition || 'Squad');
    var stat = p.gk ? ((p.cleanSheets || 0) + ' clean sheets') : ((p.goals || 0) + ' goals · ' + (p.assists || 0) + ' assists');
    var hasPhoto = !!(window.getPlayerPhoto && window.getPlayerPhoto(num));
    return { title: nm, subtitle: pos + ' · ' + stat, photo: hasPhoto ? window.getPlayerPhoto(num) : 'assets/players/avatar.svg?v=2', face: hasPhoto, footer: 'suesangelsfc.co.uk' };
  } catch (e) { return null; }
};
// Build a rich match-report scorecard spec: scoreline, venue, kick-off, our
// goalscorers + assisters (with xN counts) and sponsors. Opponent scorers are
// not recorded anywhere in the data, so only our side is named.
window.saReportStorySpec = function (report) {
  try {
    if (!report) return null;
    var d = window.loadMatchEntry ? window.loadMatchEntry(report.id) : null;
    var nameOf = function (num) { var p = (window.SQUAD || []).filter(function (x) { return x.num === num; })[0]; return p ? ((p.first ? p.first + ' ' : '') + p.last).trim() : "Sue's Angels"; };
    var tally = function (arr) { var m = {}, order = []; (arr || []).forEach(function (g) { if (g && g.num != null) { if (m[g.num] == null) { m[g.num] = 0; order.push(g.num); } m[g.num]++; } }); return order.map(function (k) { return { name: nameOf(k), n: m[k] }; }).sort(function (a, b) { return b.n - a.n; }); };
    var us = /sue|angel/i.test(report.home) ? 'home' : /sue|angel/i.test(report.away) ? 'away' : null;
    var res = us === 'home' ? (report.hs > report.as ? 'w' : report.hs < report.as ? 'l' : 'd') : us === 'away' ? (report.as > report.hs ? 'w' : report.as < report.hs ? 'l' : 'd') : null;
    return {
      kind: 'score',
      eyebrow: (report.competition || 'League Ten') + ' · ' + (report.date || ''),
      home: report.home, away: report.away, hs: report.hs, as: report.as,
      homeBadge: (window.resolveBadge && window.resolveBadge(report.home) || {}).src || null,
      awayBadge: (window.resolveBadge && window.resolveBadge(report.away) || {}).src || null,
      result: res,
      venue: (report.venue && report.venue !== 'TBC') ? report.venue : null,
      kick: (report.kick && report.kick !== 'TBC') ? report.kick : null,
      scorers: d ? tally(d.goals) : [],
      assists: d ? tally(d.assists) : [],
      sponsors: ['assets/sponsors/sporting-solutions.webp', 'assets/sponsors/hodgson-roofing.webp', 'assets/sponsors/staines-rugby.png'],
      footer: 'suesangelsfc.co.uk'
    };
  } catch (e) { return null; }
};
function ShareBtn({ title, what, label, image, url: urlProp, story }) {
  var h = React.createElement;
  var [open, setOpen] = useState(false);
  var [fmt, setFmt] = useState('story');
  var ref = useRef(null);
  var shareUrl = function () { try { return urlProp ? new URL(urlProp, location.href).href : location.href; } catch (e) { return location.href; } };
  useEffect(function () {
    if (!open) return;
    var onDoc = function (e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    var onKey = function (e) { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return function () { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);
  var track = function (method) { if (window.saTrack) window.saTrack('share', { what: what || 'page', method: method }); };
  var shareTitle = function () { return title || document.title; };
  var copyLink = async function (method, msg) {
    var url = shareUrl();
    try { await navigator.clipboard.writeText(url); track(method || 'copy'); alert(msg || 'Link copied. Paste it anywhere you like - Instagram, a story, a chat.'); }
    catch (e) { window.prompt('Copy this link:', url); }
    setOpen(false);
  };
  // Share the preview IMAGE as a file. This is the only way Instagram Stories /
  // posts and TikTok can actually receive shared content on mobile - a plain URL
  // is rejected by those apps. Returns true if the share (or cancel) was handled.
  var shareImageFile = async function () {
    if (!navigator.canShare || typeof File === 'undefined') return false;
    var src = image;
    try { if (story) { var spec = (typeof story === 'function') ? story() : story; if (spec) { var gen = await saStoryImage(spec, fmt === 'post'); if (gen) src = gen; } } } catch (e) {}
    if (!src) return false;
    try {
      var resp = await fetch(src);
      var blob = await resp.blob();
      if (!blob || !blob.size) return false;
      var ext = (blob.type && blob.type.indexOf('png') > -1) ? 'png' : 'jpg';
      var file = new File([blob], 'sue-angels.' + ext, { type: blob.type || 'image/jpeg' });
      if (!navigator.canShare({ files: [file] })) return false;
      // Carry the deep-link alongside the image so apps that accept text
      // (WhatsApp, Messages, X, Instagram DM) link back to the page. Instagram
      // Stories ignore the text - that link can only be added via IG's sticker.
      var url = shareUrl();
      var payload = { files: [file], title: shareTitle(), text: shareTitle() + '\n' + url };
      if (!navigator.canShare(payload)) payload = { files: [file], title: shareTitle() };
      await navigator.share(payload);
      track('native-image'); setOpen(false); return true;
    } catch (e) {
      if (e && e.name === 'AbortError') { setOpen(false); return true; }
      return false;
    }
  };
  var nativeShare = async function () {
    if (await shareImageFile()) return;
    var url = shareUrl();
    try { if (navigator.share) { await navigator.share({ title: shareTitle(), url: url }); track('native'); setOpen(false); return; } }
    catch (e) { if (e && e.name === 'AbortError') { setOpen(false); return; } }
    copyLink('native-fallback');
  };
  var toApp = async function (method, copyMsg) {
    if (await shareImageFile()) return;          // mobile: hand the app the image (Story/Post)
    if (navigator.share) { nativeShare(); return; }
    copyLink(method, copyMsg);                    // desktop: copy the link to paste in
  };
  var openWin = function (u, method) { window.open(u, '_blank', 'noopener,noreferrer'); track(method); setOpen(false); };
  var u = encodeURIComponent(shareUrl());
  var t = encodeURIComponent(shareTitle());
  var igMsg = 'Link copied. In Instagram, add the Link sticker to your story and paste it so people can tap straight through.';
  var ttMsg = 'Link copied. Open TikTok and paste it into your caption or bio.';
  // Copy the deep-link to the clipboard so it's ready to paste into Instagram's
  // Link sticker (the only way an IG Story can carry a clickable link).
  var shareToIg = function () { try { if (navigator.clipboard) navigator.clipboard.writeText(shareUrl()); } catch (e) {} toApp('instagram', igMsg); };
  var items = [
    navigator.share ? { k: 'native', label: 'Share to apps…', fn: nativeShare } : null,
    { k: 'ig', label: 'Instagram', fn: shareToIg },
    { k: 'x', label: 'X (Twitter)', fn: function () { openWin('https://twitter.com/intent/tweet?text=' + t + '&url=' + u, 'x'); } },
    { k: 'tt', label: 'TikTok', fn: function () { toApp('tiktok', ttMsg); } },
    { k: 'wa', label: 'WhatsApp', fn: function () { openWin('https://wa.me/?text=' + t + '%20' + u, 'whatsapp'); } },
    { k: 'fb', label: 'Facebook', fn: function () { openWin('https://www.facebook.com/sharer/sharer.php?u=' + u, 'facebook'); } },
    { k: 'copy', label: 'Copy link', fn: function () { copyLink('copy'); } }
  ].filter(Boolean);
  return h('div', { className: 'sa-share', ref: ref }, h('button', { type: 'button', className: 'm-btn m-btn--ghost', 'aria-haspopup': 'menu', 'aria-expanded': open ? 'true' : 'false', onClick: function () { setOpen(function (v) { return !v; }); }, style: { display: 'inline-flex', alignItems: 'center', gap: 8 } }, label || 'Share', h('svg', { viewBox: '0 0 24 24', width: 15, height: 15, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' }, h('path', { d: 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8' }), h('polyline', { points: '16 6 12 2 8 6' }), h('line', { x1: 12, y1: 2, x2: 12, y2: 15 }))), open ? h('div', { className: 'sa-share__menu', role: 'menu' }, (story ? [h('div', { key: 'fmt', style: { display: 'flex', gap: 6, padding: '8px 10px 10px' }, onClick: function (e) { e.stopPropagation(); } }, [['story', 'Story · 9:16'], ['post', 'Post · 4:5']].map(function (f) { return h('button', { key: f[0], type: 'button', onClick: function () { setFmt(f[0]); }, style: { flex: 1, padding: '7px 8px', borderRadius: 8, border: '1px solid ' + (fmt === f[0] ? 'var(--m-volt)' : 'var(--m-edge-2)'), background: fmt === f[0] ? 'var(--m-volt)' : 'transparent', color: fmt === f[0] ? 'var(--m-navy)' : 'var(--m-ink-2)', font: '600 0.72rem var(--m-sans)', cursor: 'pointer' } }, f[1]); }))] : []).concat(items.map(function (it) { return h('button', { key: it.k, type: 'button', role: 'menuitem', className: 'sa-share__item', onClick: it.fn }, it.label); })).concat(story ? [h('div', { key: 'ighint', style: { padding: '9px 12px 5px', marginTop: 4, borderTop: '1px solid var(--m-edge)', font: '500 0.64rem/1.45 var(--m-sans)', color: 'var(--m-ink-3)' } }, 'Instagram Story link: add the Link sticker and paste — your link is auto-copied.')] : [])) : null);
}
function Home({
  go
}) {
  useLeagueTick();
  const h = React.createElement;
  const t = teamTotals();
  const all = allCompTotals();
  const next = window.getActiveUpcoming ? window.getActiveUpcoming()[0] || null : null;
  const session = !next && window.getNextSession ? window.getNextSession() : null;
  const kickoff = useMemo(() => {
    if (next && window.getFixtureDate) {
      const dt = window.getFixtureDate(next);
      if (dt) {
        const [hh, mm] = (next.kick || '11:00').split(':').map(n => parseInt(n, 10));
        dt.setHours(hh || 11, mm || 0, 0, 0);
        return dt.toISOString();
      }
    }
    if (session) return session.startISO;
    return window.SEASON_INFO && window.SEASON_INFO.next ? window.SEASON_INFO.next.startISO : null;
  }, []);
  const cd = useCountdown(kickoff);
  const pad = n => String(n).padStart(2, '0');
  const ord = t.pos === 1 ? 'st' : t.pos === 2 ? 'nd' : t.pos === 3 ? 'rd' : 'th';
  const squad = (window.SQUAD || []).length;
  const form = useMemo(() => {
    const lg = (window.getDerivedResults ? window.getDerivedResults() : []).filter(r => (r.competition || '').toLowerCase().includes('league'));
    lg.sort((a, b) => pdate(b.date) - pdate(a.date));
    return lg.slice(0, 5).reverse().map(r => {
      if (r.kind === 'walkover') return 'w';
      const uh = r.home.includes('Angels');
      const us = uh ? r.hs : r.as,
        th = uh ? r.as : r.hs;
      return us > th ? 'w' : us === th ? 'd' : 'l';
    });
  }, []);
  const Badge = window.TeamBadge;
  const imgRef = useRef(null);
  const [dRef, dOn] = useOnscreen();
  const [lRef, lOn] = useOnscreen();
  useEffect(() => {
    if (RM()) return;
    const img = imgRef.current;
    if (!img) return;
    let raf;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, 800);
        img.style.transform = `translateY(${y * 0.14}px) scale(1.06)`;
      });
    };
    window.addEventListener('scroll', onScroll, {
      passive: true
    });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  const R = 92,
    C = 2 * Math.PI * R;
  const ringOff = C * (1 - (lOn ? all.winPct / 100 : 0));
  const results = (window.getDerivedResults ? window.getDerivedResults() : []).slice(0, 8);
  const rows = (window.RAW_TABLE || []).slice(0, 6);
  const ledTiles = [{
    v: all.pl,
    l: 'Played'
  }, {
    v: all.w,
    l: 'Won',
    volt: true
  }, {
    v: all.d,
    l: 'Drawn'
  }, {
    v: all.l,
    l: 'Lost'
  }, {
    v: all.gf,
    l: 'Goals for',
    volt: true
  }, {
    v: all.ga,
    l: 'Against'
  }, {
    v: (all.gd >= 0 ? '+' : '') + all.gd,
    l: 'Goal diff'
  }, {
    v: all.cs,
    l: 'Clean sheets',
    volt: true
  }];
  return /*#__PURE__*/React.createElement(React.Fragment, null, h("section", { className: "cine" }, h("div", { className: "cine__photo" }, h("img", { ref: imgRef, src: "assets/hero-team.webp", fetchpriority: "high", alt: "", onError: function (e) { if ((e.target.getAttribute('src') || '').indexOf('hero-team.webp') > -1) e.target.src = 'assets/hero-team.jpg'; } })), h("div", { className: "cine__grad" }), h("div", { className: "m-wrap cine__inner", ref: dRef }, h("div", { className: "cine__copy" }, h("p", { className: "m-eyebrow m-eyebrow--volt" }, "Southern Sunday Football League"), h("h1", { className: "cine__title" }, "Sue's Angels ", h("em", null, "FC")), h("div", { className: "cine__meta" }, h("span", null, "League Ten"), h("i", { "aria-hidden": "true" }), h("span", null, "Season 25/26"), h("i", { "aria-hidden": "true" }), h("span", null, t.l === 0 ? "Champions, Unbeaten" : "Champions")), h("p", { className: "cine__lead" }, "Founded in memory of Susan Anne Martin. Played ", t.pl, ", won ", t.w, ", and crowned champions of League Ten in our very first season."), h("div", { className: "cine__cta" }, h("button", { className: "m-btn m-btn--volt", onClick: function () { go('schedule'); } }, "View fixtures ", h(Arrow, null)), h("a", { className: "m-btn m-btn--ghost", href: "join.html" }, "Join the club")))), h("div", { className: "cine__strip" }, (next || session) ? h("div", { className: "cine__next2" + (next ? " cine__next2--match" : "") }, I.cal, next ? h("span", { className: "cine__next2__match" }, window.TeamBadge ? h(window.TeamBadge, { team: next.home, size: 20 }) : null, h("b", { className: "cine__next2__team" }, (next.home || "").replace(/ FC$/, "")), h("span", { className: "cine__next2__vs" }, "v"), h("b", { className: "cine__next2__team" }, (next.away || "").replace(/ FC$/, "")), window.TeamBadge ? h(window.TeamBadge, { team: next.away, size: 20 }) : null) : h("span", { className: "cine__next2__txt" }, "Next session · " + session.dayName + " " + session.dateStr + " · " + session.timeStr), next ? h("span", { className: "cine__next2__txt cine__next2__when" }, "Kick-off " + (next.date || "") + (next.kick ? " · " + next.kick : "") + (next.competition ? " · " + next.competition : "")) : null, cd ? h("b", null, (cd.d > 0 ? cd.d + 'D ' : '') + pad(cd.h) + "H " + pad(cd.m) + "M") : null, h("button", { className: "cine__next2__cta", onClick: function () { go('schedule'); } }, "View fixtures ", h(Arrow, null))) : null, h("div", { className: "cine__selrow" }, h("span", { className: "cine__rule" }), h("span", { className: "cine__sel" }, "Media News"), h("span", { className: "cine__rule" })), (function () { var arts = (window.getCustomArticles ? window.getCustomArticles() : []).filter(function (a) { return a && a.title; }); arts.sort(function (a, b) { return (b.sortISO ? Date.parse(b.sortISO) : pdate(b.date || '')) - (a.sortISO ? Date.parse(a.sortISO) : pdate(a.date || '')); }); var recent = arts.slice(0, 3); return recent.length ? h("div", { className: "cine__thumbs" }, recent.map(function (a, i) { var pc = window.getPostCover ? window.getPostCover(a.id) : null; var ic = (window.getArticleCover ? window.getArticleCover(a.id) : null) || a.cover || null; var coverEl = pc ? maGenCover(pc) : (ic && typeof ic === 'string') ? h("div", { className: "mp-news__cover" }, h("img", { src: ic, alt: "", loading: "lazy" })) : maGenCover({ layout: 'badges', top: '', left: 'assets/badge/sue-angels-shield.webp', right: '', center: '', bottom: '' }); return h("button", { key: a.id || i, className: "cine__thumb cine__thumb--news mp-clickable", onClick: function () { location.href = 'news.html?article=' + (a.id || ''); } }, coverEl, h("div", { className: "cine__tlabel cine__tlabel--news" }, h("span", { className: "cine__tag" }, a.cat || 'News'), h("b", null, a.title))); })) : null; })())), h("section", { className: "mh-sec" }, h("div", { className: "m-wrap" }, h("div", { className: "mh-ocamba" }, h("div", { className: "mh-ocamba__head" }, h("p", { className: "m-eyebrow m-eyebrow--volt" }, "Who we are"), h("h2", { className: "m-h2" }, "More than a result"), h("p", { className: "mh-ocamba__desc" }, "A club built in memory and driven by purpose. Champions on the pitch, and a family off it."), h("div", { className: "mh-ocamba__nav" }, h("button", { className: "mh-ocamba__arrow", type: "button", "aria-label": "Previous", onClick: function (e) { var r = e.currentTarget.closest('.mh-ocamba').querySelector('.mh-pillrail'); if (r) r.scrollBy({ left: -344, behavior: 'smooth' }); } }, "←"), h("button", { className: "mh-ocamba__arrow", type: "button", "aria-label": "Next", onClick: function (e) { var r = e.currentTarget.closest('.mh-ocamba').querySelector('.mh-pillrail'); if (r) r.scrollBy({ left: 344, behavior: 'smooth' }); } }, "→"))), h("div", { className: "mh-pillrail" }, [["Champions", "League Ten winners", "Played 18, won 18, unbeaten and promoted for 26/27.", "champions", "The season"], ["Community", "A football family", "Built in south-west London, playing for each other every week.", "about", "Our story"], ["Our cause", "Sepsis awareness", "Founded in memory of Susan Anne Martin. Know the signs.", "sepsis", "Our cause"], ["Partners", "Back the badge", "Local businesses on the shirt, and there is room for yours.", "sponsors", "Partner with us"]].map(function (p, i) { return h("button", { key: i, className: "mh-pillar", onClick: function () { go(p[3]); } }, h("p", { className: "m-eyebrow m-eyebrow--volt" }, p[0]), h("h3", { className: "m-h3" }, p[1]), h("p", { className: "mh-pillar__body" }, p[2]), h("span", { className: "mh-pillar__cta" }, p[4] + " →")); }))))
), (function () { var aw = (window.getRecognition ? window.getRecognition("season_award").filter(function (a) { return a.season === (window.CURRENT_SEASON || "25/26"); }) : []); return aw.length ? h("section", { className: "mh-sec", style: { paddingTop: 0 } }, h("div", { className: "m-wrap" }, h(Head, { eyebrow: (window.CURRENT_SEASON || "25/26") + " End of Season", title: "Award winners" }), h("div", { className: "mp-grid mp-g4 mh-awgrid", style: { marginTop: 18 } }, aw.map(function (a) { var nm = a.playerName || (a.playerId && window.playerNameByNum ? window.playerNameByNum(a.playerId) : ""); var ph = a.imageUrl || (a.playerId && window.getPlayerPhoto ? window.getPlayerPhoto(a.playerId) : null); return h("button", { key: a.id, "data-tilt": "", className: "mh-awcard mp-clickable", onClick: function () { location.href = a.playerId ? ("teams.html?player=" + a.playerId) : "awards.html"; } }, h("div", { className: "mh-awcard__photo" }, ph ? h("img", { src: ph, alt: nm, loading: "lazy" }) : h("img", { className: "mh-awcard__fallback", src: "assets/badge/sue-angels-shield.webp", alt: "" })), h("div", { className: "mh-awcard__grad" }), h("div", { className: "mh-awcard__body" }, h("p", { className: "m-eyebrow m-eyebrow--volt" }, a.title), h("h3", { className: "mh-awcard__name" }, nm), h("span", { className: "mh-awcard__cta" }, "View profile →"))); })), h("div", { style: { marginTop: 22, textAlign: "center" } }, h("a", { className: "m-btn m-btn--ghost", href: "awards.html" }, "All awards & honours →")))) : null; })(), /*#__PURE__*/React.createElement("section", {
    className: "mh-sec",
    id: "ledger"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-wrap"
  }, /*#__PURE__*/React.createElement(Head, {
    eyebrow: "All competitions \xB7 25/26",
    title: "The campaign",
    link: "Champions"
  }), /*#__PURE__*/React.createElement("div", {
    className: "mh-ledger",
    ref: lRef
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-glass mh-ledger__hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mh-bigring"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 220 220"
  }, /*#__PURE__*/React.createElement("circle", {
    className: "mh-bigring__c",
    cx: "110",
    cy: "110",
    r: R,
    fill: "none",
    strokeWidth: "16"
  }), /*#__PURE__*/React.createElement("circle", {
    className: "mh-bigring__a",
    cx: "110",
    cy: "110",
    r: R,
    fill: "none",
    strokeWidth: "16",
    strokeDasharray: C,
    strokeDashoffset: ringOff,
    transform: "rotate(-90 110 110)"
  })), /*#__PURE__*/React.createElement("div", {
    className: "mh-bigring__txt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mh-bigring__pct"
  }, /*#__PURE__*/React.createElement(CountUp, {
    value: all.winPct,
    suffix: "%",
    on: lOn
  })), /*#__PURE__*/React.createElement("div", {
    className: "mh-bigring__lbl"
  }, "Win rate"))), /*#__PURE__*/React.createElement("p", {
    className: "m-chip m-chip--volt",
    style: {
      marginTop: 22
    }
  }, all.l === 0 ? 'Unbeaten' : `${all.w}W ${all.d}D ${all.l}L`, " \xB7 all comps")), /*#__PURE__*/React.createElement("div", {
    className: "mh-ledger__tiles"
  }, ledTiles.map((x, i) => /*#__PURE__*/React.createElement("div", {
    className: `mh-ltile ${x.volt ? 'mh-ltile--volt' : ''}`,
    key: i
  }, /*#__PURE__*/React.createElement("b", {
    className: "m-num"
  }, /*#__PURE__*/React.createElement(CountUp, {
    value: typeof x.v === 'number' ? x.v : parseInt(x.v, 10),
    prefix: typeof x.v === 'string' && x.v[0] === '+' ? '+' : '',
    on: lOn
  })), /*#__PURE__*/React.createElement("span", null, x.l))))))), /*#__PURE__*/React.createElement("section", {
    className: "mh-sec",
    style: {
      paddingTop: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-wrap"
  }, /*#__PURE__*/React.createElement(Head, {
    eyebrow: "Match centre",
    title: "Recent results",
    link: "All results"
  }), /*#__PURE__*/React.createElement("div", {
    className: "mh-rail",
    tabIndex: 0,
    role: "group",
    "aria-label": "Recent results (scrollable)"
  }, results.map(r => /*#__PURE__*/React.createElement(ResCard, {
    key: r.id,
    r: r
  }))))), /*#__PURE__*/React.createElement("section", {
    className: "mh-sec",
    style: {
      paddingTop: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-wrap"
  }, /*#__PURE__*/React.createElement(Head, {
    eyebrow: "League Ten",
    title: "The table",
    link: "Full table"
  }), /*#__PURE__*/React.createElement("div", {
    className: "m-glass mh-table-wrap"
  }, /*#__PURE__*/React.createElement("table", {
    className: "mh-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "#"), /*#__PURE__*/React.createElement("th", null, "Club"), /*#__PURE__*/React.createElement("th", null, "P"), /*#__PURE__*/React.createElement("th", null, "W"), /*#__PURE__*/React.createElement("th", null, "GD"), /*#__PURE__*/React.createElement("th", null, "PTS"))), /*#__PURE__*/React.createElement("tbody", null, rows.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: r.c,
    className: `${r.us ? 'is-us' : ''} ${i === 1 ? 'is-promo2' : ''}`
  }, /*#__PURE__*/React.createElement("td", {
    className: "mh-table__pos"
  }, r.p), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "mh-table__club"
  }, Badge ? /*#__PURE__*/React.createElement(Badge, {
    team: r.c,
    size: 25
  }) : null, r.c.replace(' FC', ''))), /*#__PURE__*/React.createElement("td", null, r.pl), /*#__PURE__*/React.createElement("td", null, r.w), /*#__PURE__*/React.createElement("td", null, r.gd), /*#__PURE__*/React.createElement("td", {
    className: "mh-table__pts"
  }, r.pts)))))))), /*#__PURE__*/React.createElement("section", { className: "mh-sec", style: { paddingTop: 0 } }, /*#__PURE__*/React.createElement("div", { className: "m-wrap", style: { textAlign: 'center' } }, /*#__PURE__*/React.createElement("p", { className: "m-eyebrow m-eyebrow--volt", style: { justifyContent: 'center', display: 'inline-flex' } }, "Proudly backed by"), /*#__PURE__*/React.createElement("div", { style: { display: 'flex', gap: 'clamp(16px,4vw,40px)', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', margin: '18px 0 22px' } }, [['assets/sponsors/sporting-solutions.webp', 'Sporting Solutions Ltd'], ['assets/sponsors/hodgson-roofing.webp', 'Hodgson Roofing'], ['assets/sponsors/staines-rugby.png', 'Staines Rugby Club']].map(function (s) { return /*#__PURE__*/React.createElement("div", { key: s[1], style: { background: '#fff', borderRadius: 12, padding: '10px 18px', display: 'flex', alignItems: 'center' } }, /*#__PURE__*/React.createElement("img", { src: s[0], alt: s[1], loading: 'lazy', style: { height: 'clamp(30px,5vw,44px)', width: 'auto', objectFit: 'contain' } })); })), /*#__PURE__*/React.createElement("a", { className: "m-btn m-btn--ghost", href: "sponsors.html" }, "Become a partner"))), /*#__PURE__*/React.createElement(Join, {
    go: go
  }));
}
function Join({
  go
}) {
  const r = useReveal();
  return /*#__PURE__*/React.createElement("section", {
    className: "mh-sec",
    style: {
      paddingTop: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mh-join m-reveal",
    ref: r
  }, /*#__PURE__*/React.createElement("p", {
    className: "m-eyebrow m-eyebrow--volt",
    style: {
      justifyContent: 'center',
      display: 'inline-flex'
    }
  }, "26/27 \xB7 The next chapter"), /*#__PURE__*/React.createElement("h2", {
    className: "m-h2",
    style: {
      marginTop: 14
    }
  }, "Pull on the shirt."), /*#__PURE__*/React.createElement("p", {
    className: "m-lead"
  }, "Trials, volunteering, media and sponsorship. All open for the new season."), /*#__PURE__*/React.createElement("div", {
    className: "mh-join__ctas"
  }, /*#__PURE__*/React.createElement("button", {
    className: "m-btn m-btn--volt",
    onClick: () => go('contact')
  }, "Join the club ", /*#__PURE__*/React.createElement(Arrow, null)), /*#__PURE__*/React.createElement("button", {
    className: "m-btn m-btn--ghost",
    onClick: () => go('contact')
  }, "Get in touch"), /*#__PURE__*/React.createElement("button", {
    className: "m-btn m-btn--ghost",
    onClick: () => go('sponsors')
  }, "Partner with us")))));
}

/* ══ ABOUT ══════════════════════════════════════════════════════════════ */
function About({
  go
}) {
  const recs = useMemo(() => {
    const g = window.derivedSquadBy ? window.derivedSquadBy('goals')[0] : null;
    const a = window.derivedSquadBy ? window.derivedSquadBy('assists')[0] : null;
    const cs = window.derivedSquadBy ? window.derivedSquadBy('cleanSheets')[0] : null;
    const apps = window.derivedSquad ? window.derivedSquad(null, '25/26').slice().sort((x, y) => y.apps - x.apps)[0] : null;
    let big = null;
    for (const r of window.getDerivedResults ? window.getDerivedResults() : []) {
      if (r.kind === 'walkover') continue;
      const uh = r.home.includes('Angels');
      const us = uh ? r.hs : r.as,
        th = uh ? r.as : r.hs;
      if (us == null) continue;
      const gd = us - th;
      if (gd > 0 && (!big || gd > big.gd)) big = {
        gd,
        us,
        th,
        opp: (uh ? r.away : r.home).replace(' FC', '')
      };
    }
    return {
      g,
      a,
      cs,
      apps,
      big
    };
  }, []);
  const records = [recs.g && {
    n: recs.g.goals,
    l: 'Top scorer',
    who: `${recs.g.first} ${recs.g.last}`
  }, recs.a && {
    n: recs.a.assists,
    l: 'Most assists',
    who: `${recs.a.first} ${recs.a.last}`
  }, recs.apps && {
    n: recs.apps.apps,
    l: 'Most apps',
    who: `${recs.apps.first} ${recs.apps.last}`
  }, recs.cs && {
    n: recs.cs.cleanSheets,
    l: 'Clean sheets',
    who: `${recs.cs.first} ${recs.cs.last}`
  }, recs.big && {
    n: `${recs.big.us}-${recs.big.th}`,
    l: 'Biggest win',
    who: `vs ${recs.big.opp}`
  }, {
    n: 1,
    l: 'Trophies',
    who: 'League Ten 25/26'
  }].filter(Boolean);
  const journey = [['Sep 25', 'Founded · opening win', 'First competitive fixture, 21 Sept 2025. 5-0 vs Pure Football. The project is alive.'], ['Jan 26', '12-0 at Balham', 'Travelled to Balham and dropped a dozen. The performance that made the league sit up.'], ['Apr 26', 'Title confirmed', 'Beat Sporting Club Catania 10-1 at home. League Ten clinched with games to spare.'], ['May 26', 'Unbeaten. Champions.', 'Inaugural season finished with the title and a 100% league record.'], ['Sep 26', 'Promoted · 26/27', 'New division. Same standard. Trials open over the summer.']];
  const values = [['Discipline', 'Standards on and off the pitch. Earn the shirt every week.'], ['Brotherhood', 'A football family bound by respect and resilience.'], ['Remembrance', 'Everything we do honours the memory of Susan Anne Martin.'], ['Ambition', 'Champions in year one. We look ahead with hunger.']];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHero, {
    eyebrow: "The story",
    title: /*#__PURE__*/React.createElement(React.Fragment, null, "Built in ", /*#__PURE__*/React.createElement("em", null, "her"), " name."),
    sub: "Founded in 2025 in memory of Susan Anne Martin. League Ten champions, first season, unbeaten.",
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
      className: "m-btn m-btn--volt",
      onClick: () => go('champions')
    }, "The 25/26 story ", /*#__PURE__*/React.createElement(Arrow, null)), /*#__PURE__*/React.createElement("button", {
      className: "m-btn m-btn--ghost",
      onClick: () => go('contact')
    }, "Get involved"))
  }), /*#__PURE__*/React.createElement("section", {
    className: "mp-sec"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-glass",
    style: {
      padding: 'clamp(24px,3vw,40px)'
    }
  }, /*#__PURE__*/React.createElement("p", {
    className: "m-eyebrow m-eyebrow--volt"
  }, "Why we exist"), /*#__PURE__*/React.createElement("blockquote", {
    style: {
      font: '600 clamp(1.6rem,3.4vw,2.8rem)/1.15 var(--m-display)',
      letterSpacing: '-0.03em',
      margin: '16px 0 0'
    }
  }, "\"What we do in life echoes in eternity.\""), /*#__PURE__*/React.createElement("p", {
    className: "m-lead",
    style: {
      marginTop: 14
    }
  }, "A club that means something on the pitch and off it. That's the whole idea.")))), /*#__PURE__*/React.createElement("section", {
    className: "mp-sec",
    style: {
      paddingTop: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-wrap"
  }, /*#__PURE__*/React.createElement(Head, {
    eyebrow: "On the field",
    title: "The record"
  }), /*#__PURE__*/React.createElement("div", {
    className: "mp-grid mp-g3"
  }, records.map((r, i) => /*#__PURE__*/React.createElement("div", {
    className: "mh-ltile",
    key: i
  }, /*#__PURE__*/React.createElement("b", {
    className: "m-num"
  }, r.n), /*#__PURE__*/React.createElement("span", null, r.l), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      color: 'var(--m-ink-3)',
      font: '600 0.74rem var(--m-sans)'
    }
  }, r.who)))))), /*#__PURE__*/React.createElement("section", {
    className: "mp-sec",
    style: {
      paddingTop: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-wrap"
  }, /*#__PURE__*/React.createElement(Head, {
    eyebrow: "25/26",
    title: "How it happened"
  }), /*#__PURE__*/React.createElement("div", {
    className: "mp-rail"
  }, journey.map(([y, t, c], i) => /*#__PURE__*/React.createElement("div", {
    className: "mp-tl",
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    className: "mp-tl__top"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mp-tl__y"
  }, y), /*#__PURE__*/React.createElement("span", {
    className: "m-chip m-chip--volt"
  }, String(i + 1).padStart(2, '0'))), /*#__PURE__*/React.createElement("div", {
    className: "mp-tl__t"
  }, t), /*#__PURE__*/React.createElement("p", {
    className: "mp-tl__c"
  }, c)))))), /*#__PURE__*/React.createElement("section", {
    className: "mp-sec",
    style: {
      paddingTop: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mp-split"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-glass",
    style: {
      aspectRatio: '16 / 11',
      borderRadius: 'var(--m-radius)',
      overflow: 'hidden',
      padding: 0
    }
  }, /*#__PURE__*/React.createElement("picture", {
    style: {
      display: 'block',
      width: '100%',
      height: '100%'
    }
  }, /*#__PURE__*/React.createElement("source", {
    type: "image/webp",
    srcSet: "assets/hero-team.webp"
  }), /*#__PURE__*/React.createElement("img", {
    src: "assets/hero-team.jpg",
    alt: "The squad",
    loading: "lazy",
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block'
    }
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "m-eyebrow m-eyebrow--volt"
  }, "Off the field \xB7 Sue's story"), /*#__PURE__*/React.createElement("h2", {
    className: "m-h2",
    style: {
      marginTop: 12
    }
  }, "Why we play."), /*#__PURE__*/React.createElement("div", {
    className: "m-prose"
  }, /*#__PURE__*/React.createElement("p", null, "Founded and led by Stephen Epathite, Sue's Angels FC was built on football, friendship and togetherness, honouring the life and memory of Susan Anne Martin."), /*#__PURE__*/React.createElement("p", null, "Following Sue's passing from sepsis in 2020, the club raises awareness through charity matches and community initiatives, keeping her memory at the heart of everything.")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 22
    }
  }, /*#__PURE__*/React.createElement("a", {
    className: "m-btn m-btn--volt",
    href: "https://sepsistrust.org",
    target: "_blank",
    rel: "noopener"
  }, "Learn the signs ", /*#__PURE__*/React.createElement(Arrow, null))))))), /*#__PURE__*/React.createElement("section", {
    className: "mp-sec",
    style: {
      paddingTop: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-wrap"
  }, /*#__PURE__*/React.createElement(Head, {
    eyebrow: "What we stand for",
    title: "Club values"
  }), /*#__PURE__*/React.createElement("div", {
    className: "mp-grid mp-g4"
  }, values.map(([t, c], i) => /*#__PURE__*/React.createElement("div", {
    className: "mp-feat",
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    className: "mp-feat__n"
  }, String(i + 1).padStart(2, '0')), /*#__PURE__*/React.createElement("h3", {
    className: "m-h3"
  }, t), /*#__PURE__*/React.createElement("p", null, c)))))), /*#__PURE__*/React.createElement(Join, {
    go: go
  }));
}

/* ══ CHAMPIONS ══════════════════════════════════════════════════════════ */
function Champions({
  go
}) {
  const t = teamTotals();
  const [ref, on] = useOnscreen();
  const gpg = t.pl ? t.gf / t.pl : 0;
  const maxPts = t.pl * 3;
  const league = (window.getDerivedResults ? window.getDerivedResults() : []).filter(r => (r.competition || '').toLowerCase().includes('league'));
  let cs = 0;
  for (const r of league) {
    const uh = r.home.includes('Angels');
    const th = uh ? r.as : r.hs;
    if (r.kind !== 'walkover' && th === 0) cs++;
  }
  const rings = [{
    label: 'Win rate',
    value: t.winPct + '%',
    pct: t.winPct / 100,
    sub: `${t.w}W ${t.d}D ${t.l}L`
  }, {
    label: 'Points won',
    value: t.pts,
    pct: maxPts ? t.pts / maxPts : 0,
    sub: `of ${maxPts}`
  }, {
    label: 'Goals / game',
    value: gpg.toFixed(1),
    pct: Math.min(1, gpg / 4),
    sub: `${t.gf} in ${t.pl}`
  }, {
    label: 'Clean sheets',
    value: cs,
    pct: t.pl ? cs / t.pl : 0,
    sub: `in ${t.pl}`
  }];
  const record = [['Played', t.pl], ['Won', t.w], ['Drawn', t.d], ['Lost', t.l], ['Goals for', t.gf], ['Against', t.ga], ['Goal diff', (t.gd >= 0 ? '+' : '') + t.gd], ['Points', t.pts]];
  const insights = [['trophy', t.l === 0 ? 'Unbeaten champions' : 'League Ten champions', `${t.pl} league games, ${t.l} defeats`], ['pulse', `${t.gf} goals scored`, `${gpg.toFixed(1)} per game, the best in the division`], ['shield', `${t.ga} conceded`, `${cs} clean sheet${cs === 1 ? '' : 's'} kept`]];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHero, {
    eyebrow: "League Ten \xB7 25/26",
    title: /*#__PURE__*/React.createElement(React.Fragment, null, "Champ", /*#__PURE__*/React.createElement("em", null, "ions"), "."),
    sub: `${t.l === 0 ? 'Unbeaten in our inaugural season.' : ''} ${t.pl} played · ${t.w} won · ${t.gf} scored · ${t.ga} conceded.`,
    actions: /*#__PURE__*/React.createElement("button", {
      className: "m-btn m-btn--volt",
      onClick: () => go('schedule')
    }, "League results ", /*#__PURE__*/React.createElement(Arrow, null))
  }), /*#__PURE__*/React.createElement("section", {
    className: "mp-sec"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-wrap",
    ref: ref
  }, /*#__PURE__*/React.createElement(Head, {
    eyebrow: "League Ten \xB7 25/26",
    title: "The season in numbers"
  }), /*#__PURE__*/React.createElement("div", {
    className: "mp-grid mp-g4"
  }, rings.map((r, i) => /*#__PURE__*/React.createElement(Ring, _extends({
    key: i
  }, r, {
    on: on
  })))), /*#__PURE__*/React.createElement("div", {
    className: "m-grid m-grid--2",
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-glass",
    style: {
      padding: 'clamp(20px,2.4vw,30px)'
    }
  }, /*#__PURE__*/React.createElement("p", {
    className: "m-panel__t"
  }, "Final league record"), /*#__PURE__*/React.createElement("div", {
    className: "mh-recgrid",
    style: {
      gap: 12
    }
  }, record.map(([l, v]) => /*#__PURE__*/React.createElement("div", {
    className: "mh-ltile",
    key: l,
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("b", {
    className: "m-num"
  }, v), /*#__PURE__*/React.createElement("span", null, l))))), /*#__PURE__*/React.createElement("div", {
    className: "m-glass",
    style: {
      padding: 'clamp(20px,2.4vw,30px)'
    }
  }, /*#__PURE__*/React.createElement("p", {
    className: "m-panel__t"
  }, "What it took"), /*#__PURE__*/React.createElement("div", {
    className: "m-srows"
  }, insights.map((it, i) => /*#__PURE__*/React.createElement("div", {
    className: "m-srow",
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    className: "m-srow__ic"
  }, I[it[0]]), /*#__PURE__*/React.createElement("div", {
    className: "m-srow__tx"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      color: 'var(--m-ink-1)'
    }
  }, it[1])), /*#__PURE__*/React.createElement("span", {
    className: "m-srow__s"
  }, it[2])))))))), /*#__PURE__*/React.createElement("section", {
    className: "mp-sec",
    style: {
      paddingTop: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-wrap"
  }, /*#__PURE__*/React.createElement(Head, {
    eyebrow: "Every game",
    title: "League results",
    link: "All results"
  }), /*#__PURE__*/React.createElement("div", {
    className: "mh-rail",
    tabIndex: 0,
    role: "group",
    "aria-label": "League results (scrollable)"
  }, league.slice(0, 8).map(r => /*#__PURE__*/React.createElement(ResCard, {
    key: r.id,
    r: r
  }))))), /*#__PURE__*/React.createElement(Join, {
    go: go
  }));
}

/* ══ TEAM ═══════════════════════════════════════════════════════════════ */
function Leaderboard() {
  const seasons = ['all', ...(window.ALL_SEASONS || ['25/26'])];
  const comps = window.COMPETITIONS || [{
    key: 'all',
    label: 'All',
    match: () => true
  }];
  const [season, setSeason] = useState(window.CURRENT_SEASON || '25/26');
  const [comp, setComp] = useState('all');
  const rows = useMemo(() => {
    const matcher = comp === 'all' ? null : (comps.find(c => c.key === comp) || {}).match;
    const list = window.derivedSquad ? window.derivedSquad(matcher, season === 'all' ? 'all' : season) : [];
    return list.filter(p => p.apps > 0).sort((a, b) => b.goalInvolvements - a.goalInvolvements || b.goals - a.goals || b.apps - a.apps);
  }, [season, comp]);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "mp-subtabs"
  }, seasons.map(s => /*#__PURE__*/React.createElement("button", {
    key: s,
    className: `mp-subtab ${season === s ? 'is-active' : ''}`,
    onClick: () => setSeason(s)
  }, s === 'all' ? 'All seasons' : s))), /*#__PURE__*/React.createElement("div", {
    className: "mp-subtabs"
  }, comps.map(c => /*#__PURE__*/React.createElement("button", {
    key: c.key,
    className: `mp-subtab ${comp === c.key ? 'is-active' : ''}`,
    onClick: () => setComp(c.key)
  }, c.label))), /*#__PURE__*/React.createElement("div", {
    className: "m-glass",
    style: {
      padding: '8px 8px 4px',
      overflowX: 'auto'
    }
  }, /*#__PURE__*/React.createElement("table", {
    className: "mp-ltable"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "#"), /*#__PURE__*/React.createElement("th", null, "Player"), /*#__PURE__*/React.createElement("th", null, "Apps"), /*#__PURE__*/React.createElement("th", null, "G"), /*#__PURE__*/React.createElement("th", null, "A"), /*#__PURE__*/React.createElement("th", null, "G+A"), /*#__PURE__*/React.createElement("th", null, "MOTM"))), /*#__PURE__*/React.createElement("tbody", null, rows.length ? rows.map((p, i) => /*#__PURE__*/React.createElement("tr", {
    key: p.num,
    className: i === 0 ? 'is-top' : ''
  }, /*#__PURE__*/React.createElement("td", {
    className: "mp-ltable__rank"
  }, i + 1), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "mp-ltable__name"
  }, /*#__PURE__*/React.createElement("i", null, (p.first || ' ')[0], "."), p.last)), /*#__PURE__*/React.createElement("td", null, p.apps), /*#__PURE__*/React.createElement("td", null, p.goals), /*#__PURE__*/React.createElement("td", null, p.assists), /*#__PURE__*/React.createElement("td", {
    className: "mp-ltable__ga"
  }, p.goalInvolvements), /*#__PURE__*/React.createElement("td", null, p.motm))) : /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    className: "mp-ltable__empty",
    colSpan: "7"
  }, "NOTHING LOGGED FOR THIS FILTER YET."))))));
}
function maTrophy() {
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", { d: "M7 4h10v5a5 5 0 0 1-10 0V4z" }),
     /*#__PURE__*/React.createElement("path", { d: "M7 5H4.5A1.5 1.5 0 0 0 6 8.5M17 5h2.5A1.5 1.5 0 0 1 18 8.5" }),
     /*#__PURE__*/React.createElement("path", { d: "M9.5 14.5 9 18h6l-.5-3.5M8 21h8M10 18v3M14 18v3" }));
}
// ManagerAnalytics - season-scoped leadership analytics for the coach modal.
// Reads the seasons a manager was in charge (admin-set on the coach record),
// then derives record, honours, most-used players, best performers and the
// favourite formation entirely from live match + squad data.
function ManagerAnalytics({ coach }) {
  const h = React.createElement;
  const ALL = window.ALL_SEASONS || ['25/26'];
  const CUR = window.CURRENT_SEASON || ALL[0];
  const seasonOf = window.seasonOf || (() => CUR);
  const ov = window.getCoachData ? window.getCoachData(coach.id) : {};
  let inCharge = (ov.seasons && ov.seasons.length) ? ov.seasons.filter(s => ALL.includes(s)) : ALL.slice();
  if (!inCharge.length) inCharge = [CUR];
  const seasonTabs = (inCharge.length > 1 ? [['all', 'In charge']] : []).concat(inCharge.map(s => [s, s]));
  const [season, setSeason] = React.useState(inCharge.indexOf(CUR) >= 0 ? CUR : inCharge[0]);
  const [comp, setComp] = React.useState('all');
  const [on, setOn] = React.useState(false);
  React.useEffect(() => { setComp('all'); }, [season]);
  React.useEffect(() => { setOn(false); const t = setTimeout(() => setOn(true), 90); return () => clearTimeout(t); }, [season, comp]);

  const compList = window.COMPETITIONS || [{ key: 'all', label: 'All', match: () => true }];
  const seasonsScope = season === 'all' ? inCharge : [season];
  const matcher = comp === 'all' ? null : (compList.find(c => c.key === comp) || {}).match;
  const inSeason = r => seasonsScope.indexOf(seasonOf(r) || CUR) >= 0;
  const allResults = window.getDerivedResults ? window.getDerivedResults() : [];
  const seasonResults = allResults.filter(inSeason);
  const availComps = [['all', 'All']].concat(compList.filter(c => c.key !== 'all').filter(c => seasonResults.some(r => c.match(r.competition))).map(c => [c.key, c.label]));
  const results = matcher ? seasonResults.filter(r => matcher(r.competition)) : seasonResults;

  let pl = 0, w = 0, d = 0, l = 0, gf = 0, ga = 0, cs = 0;
  for (const r of results) {
    const uh = r.home.includes('Angels');
    if (r.kind === 'walkover') { pl++; w++; continue; }
    const us = uh ? r.hs : r.as, th = uh ? r.as : r.hs;
    if (us == null || th == null) continue;
    pl++; gf += us; ga += th; if (th === 0) cs++;
    if (r.kind === 'penalty' && r.pens) { const uP = uh ? r.pens.hs : r.pens.as, tP = uh ? r.pens.as : r.pens.hs; if (uP > tP) w++; else l++; }
    else if (us > th) w++; else if (us === th) d++; else l++;
  }
  const winPct = pl ? Math.round(w / pl * 100) : 0;
  const compLabel = comp === 'all' ? '' : ' \u00b7 ' + ((compList.find(c => c.key === comp) || {}).label || '');
  const scopeLabel = (season === 'all' ? inCharge.join(' \u00b7 ') : season) + compLabel;

  const button = (active, onClick, label, key) => h('button', { key: key, type: 'button', className: 'mp-subtab ' + (active ? 'is-active' : ''), onClick: onClick }, label);
  const seasonBar = seasonTabs.length > 1 ? h('div', { className: 'mp-subtabs' }, seasonTabs.map(t => button(season === t[0], () => setSeason(t[0]), t[1], t[0]))) : null;
  const compBar = availComps.length > 1 ? h('div', { className: 'mp-subtabs' }, availComps.map(t => button(comp === t[0], () => setComp(t[0]), t[1], t[0]))) : null;
  const filters = (seasonBar || compBar) ? h('div', { className: 'ma-filters' }, seasonBar, compBar) : null;

  if (!pl) {
    return h('div', { className: 'ma' }, filters,
      h('div', { className: 'm-empty' }, h('b', null, 'NOT KICKED OFF YET'),
        h('span', null, scopeLabel.toUpperCase() + ' STATS LAND HERE AFTER THE FIRST WHISTLE')));
  }

  const honours = [];
  const usRow = (window.RAW_TABLE || []).find(x => x.us);
  const honoursApply = seasonsScope.indexOf(CUR) >= 0 && (comp === 'all' || comp === 'league');
  if (honoursApply && usRow && usRow.p === 1) honours.push({ t: 'League Ten Champions', s: CUR });
  if (honoursApply && usRow && usRow.l === 0 && usRow.pl > 0) honours.push({ t: 'Unbeaten league season', s: usRow.pl + ' games \u00b7 ' + usRow.w + 'W ' + usRow.d + 'D' });
  if (honoursApply && usRow && usRow.p === 1) honours.push({ t: 'Promoted', s: 'Up to League Eight' });

  const agg = {};
  for (const sk of seasonsScope) {
    const list = window.derivedSquad ? window.derivedSquad(matcher, sk) : [];
    for (const pp of list) {
      const k = pp.num;
      if (!agg[k]) agg[k] = { num: pp.num, name: ((pp.first ? pp.first + ' ' : '') + pp.last).trim(), gk: pp.gk, pos: pp.gk ? 'GK' : (pp.mostPlayedPosition || 'SQUAD'), apps: 0, goals: 0, assists: 0, motm: 0, cs: 0 };
      agg[k].apps += pp.apps || 0; agg[k].goals += pp.goals || 0; agg[k].assists += pp.assists || 0; agg[k].motm += pp.motm || 0; agg[k].cs += pp.cleanSheets || 0;
    }
  }
  const players = Object.values(agg).filter(p => p.apps > 0);
  const mostUsed = players.slice().sort((a, b) => b.apps - a.apps).slice(0, 5);
  const maxApps = mostUsed.length ? (mostUsed[0].apps || 1) : 1;
  const outfield = players.filter(p => !p.gk);
  const topScorer = outfield.slice().sort((a, b) => b.goals - a.goals).filter(p => p.goals > 0)[0];
  const topCreator = outfield.slice().sort((a, b) => b.assists - a.assists).filter(p => p.assists > 0)[0];
  const topMotm = players.slice().sort((a, b) => b.motm - a.motm).filter(p => p.motm > 0)[0];
  const topKeeper = players.filter(p => p.gk).sort((a, b) => b.cs - a.cs).filter(p => p.cs > 0)[0];

  const fcount = {};
  for (const r of results) { const dd = window.loadMatchEntry ? window.loadMatchEntry(r.id) : null; const f = dd && dd.formation; if (f) fcount[f] = (fcount[f] || 0) + 1; }
  const forms = Object.entries(fcount).sort((a, b) => b[1] - a[1]);
  const totForm = forms.reduce((s, kv) => s + kv[1], 0);
  const topForm = forms[0];

  const perfCard = (label, pp, sub) => pp ? h('div', { className: 'ma__perf-card', key: label }, h('p', null, label), h('b', null, pp.name), h('span', null, sub)) : null;
  const seg = (key, val, bg) => val ? h('i', { key: key, style: { width: (on ? val / pl * 100 : 0) + '%', background: bg } }) : null;

  return h('div', { className: 'ma' },
    filters,
    h('div', { className: 'ma__hero' },
      h('div', { className: 'ma__head' },
        h('p', { className: 'm-eyebrow m-eyebrow--volt' }, 'In charge'),
        h('span', { className: 'ma__seasons' }, scopeLabel)),
      h('div', { className: 'ma__record' },
        h(Ring, { pct: winPct / 100, value: winPct + '%', label: 'Win rate', sub: w + 'W ' + d + 'D ' + l + 'L', on: on }),
        h('div', { className: 'ma__tiles' },
          [['Played', pl], ['Won', w], ['Goals', gf], ['Conceded', ga]].map((kv, i) => h('div', { className: 'ma__tile', key: i }, h('b', null, kv[1]), h('span', null, kv[0]))))),
      h('div', { className: 'ma__wdl' }, seg('w', w, 'var(--m-volt)'), seg('d', d, 'rgba(255,255,255,0.32)'), seg('l', l, 'rgba(255,120,120,0.6)')),
      h('div', { className: 'ma__legend' },
        h('span', null, h('i', { style: { background: 'var(--m-volt)' } }), 'Won ' + w),
        h('span', null, h('i', { style: { background: 'rgba(255,255,255,0.32)' } }), 'Drawn ' + d),
        h('span', null, h('i', { style: { background: 'rgba(255,120,120,0.6)' } }), 'Lost ' + l))),
    honours.length ? h('div', { className: 'ma__block' },
      h('p', { className: 'ma__title' }, 'Honours'),
      h('div', { className: 'ma__honours' }, honours.map((ho, i) => h('div', { className: 'ma__honour', key: i }, maTrophy(), h('div', null, h('b', null, ho.t), h('span', null, ho.s)))))) : null,
    mostUsed.length ? h('div', { className: 'ma__block' },
      h('p', { className: 'ma__title' }, 'Most-used players'),
      h('div', { className: 'ma__bars' }, mostUsed.map(p => h('div', { className: 'ma__bar', key: p.num },
        h('div', { className: 'ma__bar-name' }, p.name, h('span', null, p.pos)),
        h('div', { className: 'ma__bar-val' }, p.apps),
        h('div', { className: 'ma__bar-track' }, h('div', { className: 'ma__bar-fill', style: { width: (on ? (maxApps ? p.apps / maxApps * 100 : 0) : 0) + '%' } })))))) : null,
    (topScorer || topCreator || topMotm || topKeeper) ? h('div', { className: 'ma__block' },
      h('p', { className: 'ma__title' }, 'Best performers'),
      h('div', { className: 'ma__perf' },
        perfCard('Top scorer', topScorer, topScorer ? topScorer.goals + ' goals' : ''),
        perfCard('Top creator', topCreator, topCreator ? topCreator.assists + ' assists' : ''),
        perfCard('Most MOTM', topMotm, topMotm ? topMotm.motm + ' awards' : ''),
        perfCard('Best keeper', topKeeper, topKeeper ? topKeeper.cs + ' clean sheets' : ''))) : null,
    topForm ? h('div', { className: 'ma__block' },
      h('p', { className: 'ma__title' }, 'Favourite formation'),
      h('div', { className: 'ma__form' },
        h('div', { className: 'ma__form-lead' },
          h('div', { className: 'ma__form-big' }, topForm[0]),
          h('span', { className: 'ma__form-sub' }, topForm[1] + ' of ' + totForm + ' games')),
        h('div', { className: 'ma__form-dist' }, forms.slice(0, 4).map(kv => h('div', { className: 'ma__bar', key: kv[0] },
          h('div', { className: 'ma__bar-name' }, kv[0]),
          h('div', { className: 'ma__bar-val' }, kv[1]),
          h('div', { className: 'ma__bar-track' }, h('div', { className: 'ma__bar-fill', style: { width: (on ? (totForm ? kv[1] / totForm * 100 : 0) : 0) + '%' } }))))))) : null);
}

// CoachModalContent - coach header + a two-slide pager (Profile / Manager stats).
function CoachModalContent({ coach }) {
  const h = React.createElement;
  const [slide, setSlide] = React.useState(0);
  const ov = window.getCoachData ? window.getCoachData(coach.id) : {};
  const photo = ov.photo || coach.photo;
  const bio = (ov.bio && String(ov.bio).trim()) ? String(ov.bio).split(/\n{2,}/).map(s => s.trim()).filter(Boolean) : (coach.bio || []);
  const hasSeasons = !!(ov.seasons && ov.seasons.length);
  const showAnalytics = /manager/i.test(coach.role || '') || hasSeasons;
  const header = h("div", { className: "ma__hd" },
    h("img", { className: "mp-coach__ph", style: { width: 'clamp(120px, 28vw, 168px)', height: 'auto', aspectRatio: '3 / 4', objectFit: 'cover', objectPosition: 'top center', borderRadius: 18 }, src: photo || 'assets/players/avatar.svg', alt: "", onError: e => { e.target.src = 'assets/players/avatar.svg'; } }),
    h("div", null,
      h("p", { className: "m-eyebrow m-eyebrow--volt" }, coach.role),
      h("h2", { className: "m-h2", style: { marginTop: 8, fontSize: '2rem' } }, coach.name)));
  const tabs = showAnalytics ? h("div", { className: "ma-tabs" },
    h("button", { className: `ma-tab ${slide === 0 ? 'is-on' : ''}`, onClick: () => setSlide(0) }, "Profile"),
    h("button", { className: `ma-tab ${slide === 1 ? 'is-on' : ''}`, onClick: () => setSlide(1) }, "Manager stats")) : null;
  const profileSlide = h(React.Fragment, null,
    h("div", { className: "m-prose", style: { marginTop: 18 } }, bio.map((b, i) => h("p", { key: i }, b))),
    coach.managed ? h("div", { style: { marginTop: 18 } },
      h("p", { className: "m-eyebrow" }, "Managed"),
      h("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 } }, coach.managed.map(m => h("span", { className: "m-chip", key: m }, m)))) : null);
  return h("div", { className: "m-glass m-modal__sponsor" }, header, tabs,
    slide === 1 && showAnalytics ? h(ManagerAnalytics, { coach }) : profileSlide);
}
function Team({
  go
}) {
  const [tab, setTab] = useState(window.SA_TAB || 'squad');
  const [profile, setProfile] = useState(null);
  const [coach, setCoach] = useState(null);
  const [statusTick, setStatusTick] = useState(0);
  useEffect(() => {
    const h = () => setStatusTick(n => n + 1);
    window.addEventListener('sa-roster-changed', h);
    window.addEventListener('sa-media-changed', h);
    return () => { window.removeEventListener('sa-roster-changed', h); window.removeEventListener('sa-media-changed', h); };
  }, []);
  useEffect(() => {
    try {
      const raw = new URLSearchParams(window.location.search).get('player');
      if (raw) {
        const all = window.derivedSquad ? window.derivedSquad(null, null) : (window.SQUAD || []);
        let p = null;
        if (/^\d+$/.test(raw)) p = (all || []).find(x => x.num === parseInt(raw, 10)); // back-compat numeric links
        else { const s = raw.toLowerCase(); p = (all || []).find(x => saSlug(saPlayerName(x)) === s); }
        if (p) { setTab('squad'); setProfile(p.num); }
      }
    } catch (e) {}
  }, []);
  // Keep the URL + page title in sync with the open player profile, so a profile
  // can be shared with a direct link (teams.html?player=N) and shows the player's
  // name when shared. Skips the first render so we don't clobber an inbound ?player.
  const profileFirst = useRef(true);
  useEffect(() => {
    if (profileFirst.current) { profileFirst.current = false; return; }
    try {
      if (profile != null) {
        const all = window.derivedSquad ? window.derivedSquad(null, null) : (window.SQUAD || []);
        const p = (all || []).find(x => x.num === profile);
        const nm = saPlayerName(p);
        const slug = saSlug(nm) || String(profile);
        window.history.replaceState(null, '', 'teams.html?player=' + slug);
        document.title = (nm || 'Player') + " · Sue's Angels FC";
      } else {
        window.history.replaceState(null, '', 'teams.html');
        document.title = "Team · Sue's Angels FC";
      }
    } catch (e) {}
  }, [profile]);
  // Coach profiles: deep-link entry (?coach=id) + URL/title sync, so they can be shared too.
  const coachEntry = useRef(false);
  useEffect(() => {
    if (coachEntry.current) return;
    try {
      const id = new URLSearchParams(window.location.search).get('coach');
      if (!id) { coachEntry.current = true; return; }
      const list = (window.COACHES || []).concat(window.getCustomCoaches ? window.getCustomCoaches() : []);
      const c = list.find(x => x && (x.id === id || x.name === id));
      if (c) { coachEntry.current = true; setTab('coaches'); setCoach(c); }
    } catch (e) {}
  }, [statusTick]);
  const coachFirst = useRef(true);
  useEffect(() => {
    if (coachFirst.current) { coachFirst.current = false; return; }
    try {
      if (coach) {
        window.history.replaceState(null, '', 'teams.html?coach=' + encodeURIComponent(coach.id || coach.name || ''));
        document.title = (coach.name || 'Coach') + " · Sue's Angels FC";
      } else if (profile == null) {
        window.history.replaceState(null, '', 'teams.html');
        document.title = "Team · Sue's Angels FC";
      }
    } catch (e) {}
  }, [coach]);
  const [season, setSeason] = useState('25/26');
  const seasonKey = season === 'all' ? null : season;
  const allSquad = useMemo(() => window.derivedSquad ? window.derivedSquad(null, seasonKey) : [], [statusTick, season]);
  const playerStatus = window.getPlayerStatus ? window.getPlayerStatus() : {};
  const confirmed2627 = window.getSeason2627 ? window.getSeason2627() : [];
  const hideStats = season === '26/27';
  const activeAll = useMemo(() => allSquad.filter(p => !playerStatus[p.num]), [allSquad, statusTick, season]);
  const squad = useMemo(() => season === '26/27' ? activeAll.filter(p => confirmed2627.indexOf(p.num) >= 0) : activeAll, [activeAll, season, statusTick]);
  const playedSel = (p) => season === 'all' || (p.apps || 0) > 0 || (season === '26/27' && confirmed2627.indexOf(p.num) >= 0);
  const departed = useMemo(() => allSquad.filter(p => playerStatus[p.num] && playedSel(p)), [allSquad, season, statusTick]);
  const buildGroups = (arr) => {
    const order = ['Goalkeepers', 'Defenders', 'Midfielders', 'Forwards', 'Squad'];
    const map = {};
    arr.forEach(p => {
      const g = posGroup(p.mostPlayedPosition, p.gk);
      (map[g] = map[g] || []).push(p);
    });
    Object.values(map).forEach(a => a.sort((x, y) => y.goalInvolvements - x.goalInvolvements || y.apps - x.apps));
    return order.filter(g => map[g] && map[g].length).map(g => [g, map[g]]);
  };
  const groups = useMemo(() => buildGroups(squad), [squad]);
  const departedGroups = useMemo(() => buildGroups(departed), [departed]);
  const retiredGroups = useMemo(() => buildGroups(allSquad.filter(p => playerStatus[p.num] === 'retired' && playedSel(p))), [allSquad, season, statusTick]);
  const departedOnlyGroups = useMemo(() => buildGroups(allSquad.filter(p => playerStatus[p.num] === 'departed' && playedSel(p))), [allSquad, season, statusTick]);
  const hasPast = Object.keys(playerStatus).length > 0;
  const coaches = window.COACHES || [];
  const tt = allCompTotals();
  const sp = setPieceStats();
  const slim = !!window.SA_SLIM;
  const heroMap = {
    squad: { eb: 'First team', a: 'The ', b: 'squad', sub: 'Position-grouped cards for the first team. Tap any player for their full analytics profile.' },
    leaders: { eb: 'By the numbers', a: 'Player ', b: 'stats', sub: 'Goals, assists and appearances across the season. Tap any player for their full profile.' },
    coaches: { eb: 'The dugout', a: 'The ', b: 'coaches', sub: "The people guiding Sue's Angels FC." }
  };
  const hero = (slim && heroMap[tab]) ? heroMap[tab] : { eb: 'First team', a: 'The ', b: 'squad', sub: 'Position-grouped cards, leaderboards and coaches. Tap any player for their full analytics profile.' };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHero, {
    eyebrow: hero.eb,
    title: /*#__PURE__*/React.createElement(React.Fragment, null, hero.a, /*#__PURE__*/React.createElement("em", null, hero.b), "."),
    sub: hero.sub
  }), /*#__PURE__*/React.createElement("section", {
    className: "mp-sec"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-wrap"
  }, (function () { var _st = slim ? (((tab === 'squad' || tab === 'past') && hasPast) ? [['squad', 'First team'], ['past', 'Past players']] : null) : [['squad', 'First team'], ['leaders', 'Leaderboards'], ['coaches', 'Coaches'], ['stats', 'Team stats']].concat(hasPast ? [['past', 'Past players']] : []); return _st ? /*#__PURE__*/React.createElement("div", {
    className: "mp-subtabs"
  }, _st.map(([k, l]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    className: `mp-subtab ${tab === k ? 'is-active' : ''}`,
    onClick: () => setTab(k)
  }, l))) : null; })(), (tab === 'squad' || tab === 'stats' || tab === 'past') ? /*#__PURE__*/React.createElement("div", {
    className: "mp-subtabs"
  }, [['all', 'All seasons'], ['25/26', '25/26'], ['26/27', '26/27']].map(([sk, sl]) => /*#__PURE__*/React.createElement("button", {
    key: sk,
    className: `mp-subtab ${season === sk ? 'is-active' : ''}`,
    onClick: () => setSeason(sk)
  }, sl))) : null, tab === 'squad' ? (false ? groups.map(([g, list]) => /*#__PURE__*/React.createElement("div", {
    key: g
  }, /*#__PURE__*/React.createElement("div", {
    className: "mp-posgroup"
  }, g), /*#__PURE__*/React.createElement("div", {
    className: "mp-grid mp-g4"
  }, list.map(p => {
    const ph = photoOf(p.num);
    return /*#__PURE__*/React.createElement("button", {
      className: "mp-player mp-clickable",
      key: p.num,
      "data-num": p.num,
      onClick: () => setProfile(p.num)
    }, /*#__PURE__*/React.createElement("div", {
      className: `mp-player__img ${ph ? '' : 'mp-player__img--ghost'}`
    }, ph ? /*#__PURE__*/React.createElement("img", {
      src: ph,
      alt: `${p.first} ${p.last}`
    }) : /*#__PURE__*/React.createElement("img", {
      src: "assets/badge/sue-angels-shield.webp",
      alt: ""
    })), /*#__PURE__*/React.createElement("div", {
      className: "mp-player__scrim"
    }), /*#__PURE__*/React.createElement("span", {
      className: "m-chip m-chip--volt mp-player__pos"
    }, p.gk ? 'GK' : p.mostPlayedPosition || 'SQUAD'), /*#__PURE__*/React.createElement("div", {
      className: "mp-player__body"
    }, /*#__PURE__*/React.createElement("div", {
      className: "mp-player__name"
    }, p.last, /*#__PURE__*/React.createElement("span", null, p.first)), /*#__PURE__*/React.createElement("div", {
      className: "mp-player__stats"
    }, p.gk ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, p.apps), /*#__PURE__*/React.createElement("span", null, "Apps")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, p.cleanSheets), /*#__PURE__*/React.createElement("span", null, "CS")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, p.motm), /*#__PURE__*/React.createElement("span", null, "MOTM"))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, p.apps), /*#__PURE__*/React.createElement("span", null, "Apps")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, p.goals), /*#__PURE__*/React.createElement("span", null, "Goals")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, p.assists), /*#__PURE__*/React.createElement("span", null, "Assists"))))));
  })))) : (groups.length ? /*#__PURE__*/React.createElement(SquadBoard, { groups: groups, onOpen: setProfile, hideStats: hideStats }) : /*#__PURE__*/React.createElement("div", { className: "m-empty" }, /*#__PURE__*/React.createElement("b", null, season === '26/27' ? "NO SIGNINGS YET" : "NOBODY HERE"), /*#__PURE__*/React.createElement("span", null, season === '26/27' ? "NEW FACES FOR 26/27 LAND HERE" : "NO PLAYERS FOR THIS SEASON"))) ) : tab === 'leaders' ? /*#__PURE__*/React.createElement(Leaderboard, null) : tab === 'coaches' ? /*#__PURE__*/React.createElement("div", {
    className: "mp-grid mp-g3"
  }, coaches.length ? coaches.map((c, i) => /*#__PURE__*/React.createElement("button", {
    className: "mp-coach mp-clickable",
    key: i,
    onClick: () => setCoach(c)
  }, /*#__PURE__*/React.createElement("img", {
    className: "mp-coach__ph",
    src: c.photo || 'assets/players/avatar.svg',
    alt: "",
    onError: e => {
      e.target.src = 'assets/players/avatar.svg';
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, c.name), /*#__PURE__*/React.createElement("span", null, c.role)))) : /*#__PURE__*/React.createElement("p", {
    className: "m-lead"
  }, "Coach profiles publish from the CMS.")) : tab === 'past' ? /*#__PURE__*/React.createElement(React.Fragment, null, retiredGroups.length ? /*#__PURE__*/React.createElement("div", {
    className: "mp-paststack"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "mp-pasthead"
  }, "Retired", /*#__PURE__*/React.createElement("span", null, "Hung up the boots")), /*#__PURE__*/React.createElement(SquadBoard, {
    groups: retiredGroups,
    onOpen: setProfile
  })) : null, departedOnlyGroups.length ? /*#__PURE__*/React.createElement("div", {
    className: "mp-paststack"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "mp-pasthead"
  }, "Departed", /*#__PURE__*/React.createElement("span", null, "Moved on from the club")), /*#__PURE__*/React.createElement(SquadBoard, {
    groups: departedOnlyGroups,
    onOpen: setProfile
  })) : null, (!retiredGroups.length && !departedOnlyGroups.length) ? /*#__PURE__*/React.createElement("div", { className: "m-empty" }, /*#__PURE__*/React.createElement("b", null, season === '26/27' ? "FULL SQUAD" : "NOBODY'S LEFT"), /*#__PURE__*/React.createElement("span", null, season === '26/27' ? "NO GOODBYES IN 26/27 YET" : "NO RETIRED OR DEPARTED PLAYERS THIS SEASON")) : null) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TeamStatsPanel, {
    season: season,
    squadCount: squad.length
  })))), (slim && tab !== 'coaches') ? /*#__PURE__*/React.createElement("section", { className: "mp-sec", style: { paddingTop: 0 } }, /*#__PURE__*/React.createElement("div", { className: "m-wrap" }, /*#__PURE__*/React.createElement("div", { className: "m-glass", style: { padding: "clamp(24px,4vw,40px)", textAlign: "center" } }, /*#__PURE__*/React.createElement("p", { className: "m-eyebrow m-eyebrow--volt", style: { justifyContent: "center", display: "inline-flex" } }, "Want to play here?"), /*#__PURE__*/React.createElement("h2", { className: "m-h2", style: { marginTop: 10 } }, "Trials are open for 26/27."), /*#__PURE__*/React.createElement("p", { className: "m-lead", style: { margin: "12px auto 0", maxWidth: "48ch" } }, "Think you can wear the shirt? Register your interest and we'll be in touch with dates."), /*#__PURE__*/React.createElement("a", { className: "m-btn m-btn--volt", href: "join.html", style: { marginTop: 22 } }, "Apply for a trial")))) : null, profile != null ? /*#__PURE__*/React.createElement(Modal, {
    wide: true,
    onClose: () => setProfile(null)
  }, /*#__PURE__*/React.createElement(ProfileCard, {
    num: profile
  }), /*#__PURE__*/React.createElement("div", { style: { marginTop: 16, textAlign: "center" } }, /*#__PURE__*/React.createElement(ShareBtn, { what: "player", label: "Share player", image: window.getPlayerPhoto ? window.getPlayerPhoto(profile) : null, story: function () { return window.saPlayerStorySpec ? window.saPlayerStorySpec(profile) : null; } }))) : null, coach ? /*#__PURE__*/React.createElement(Modal, {
    onClose: () => setCoach(null)
  }, /*#__PURE__*/React.createElement(CoachModalContent, {
    coach: coach
  }), /*#__PURE__*/React.createElement("div", { style: { marginTop: 16, textAlign: "center" } }, /*#__PURE__*/React.createElement(ShareBtn, { what: "coach", label: "Share coach", story: function () { return { title: coach.name, subtitle: coach.role || 'Coach', photo: coach.photo || 'assets/players/avatar.svg?v=2', footer: 'suesangelsfc.co.uk' }; } }))) : null);
}

/* ══ SCHEDULE ═══════════════════════════════════════════════════════════ */
// Re-render when admin-imported league data (table/results/scorers) arrives from
// the cloud, so the League section updates without a reload.
function useLeagueTick() {
  var t = useState(0);
  useEffect(function () {
    var f = function () { t[1](function (n) { return n + 1; }); };
    window.addEventListener('sa-league-changed', f);
    return function () { window.removeEventListener('sa-league-changed', f); };
  }, []);
}
function LeagueResults() {
  useLeagueTick();
  var h = React.createElement;
  var Badge = window.TeamBadge;
  var list = window.LEAGUE_RESULTS || [];
  if (!list.length) return null;
  var short = function (n) { return String(n).replace(/\s*FC\b/, '').trim(); };
  var isUs = function (n) { return String(n).indexOf('Angels') > -1; };
  return h("div", { className: "m-glass", style: { padding: 'clamp(16px,2.4vw,24px)' } },
    h("span", { className: "m-eyebrow m-eyebrow--volt" }, "Southern Sunday League · 25/26"),
    h("h3", { className: "m-h3", style: { marginTop: 6, marginBottom: 4 } }, "Around the league"),
    h("p", { style: { color: 'var(--m-ink-3)', fontSize: '0.82rem', margin: '0 0 12px' } }, "Every League Ten result across the division this season."),
    h("div", { style: { display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 580, overflowY: 'auto' } },
      list.map(function (r, i) {
        var us = isUs(r.home) || isUs(r.away);
        var score = r.wo
          ? h("b", { style: { color: 'var(--m-ink-2)', minWidth: 44, textAlign: 'center', fontSize: '0.72rem', letterSpacing: '0.04em' } }, "W/O")
          : h("b", { style: { color: 'var(--m-volt-ink)', minWidth: 44, textAlign: 'center', fontVariantNumeric: 'tabular-nums' } }, r.hs + "-" + r.as);
        var homeBold = isUs(r.home) || (r.wo ? r.wo === 'home' : r.hs > r.as);
        var awayBold = isUs(r.away) || (r.wo ? r.wo === 'away' : r.as > r.hs);
        return h("div", { key: i, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 12, background: us ? 'rgba(214,242,58,0.07)' : 'var(--m-glass-1)', borderLeft: us ? '2px solid var(--m-volt)' : '2px solid transparent' } },
          h("span", { style: { fontSize: '0.7rem', color: 'var(--m-ink-3)', width: 56, flex: '0 0 auto' } }, r.date),
          h("span", { style: { flex: 1, minWidth: 0, textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 7, overflow: 'hidden' } },
            h("span", { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: homeBold ? 700 : 500, color: isUs(r.home) ? 'var(--m-ink-1)' : 'inherit' } }, short(r.home)),
            Badge ? h(Badge, { team: r.home, size: 22 }) : null),
          score,
          h("span", { style: { flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden' } },
            Badge ? h(Badge, { team: r.away, size: 22 }) : null,
            h("span", { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: awayBold ? 700 : 500, color: isUs(r.away) ? 'var(--m-ink-1)' : 'inherit' } }, short(r.away))));
      })));
}
function LeagueStatsTable() {
  useLeagueTick();
  var h = React.createElement;
  var Badge = window.TeamBadge;
  var stats = window.LEAGUE_STATS || { all: [], league: [] };
  var modeState = useState('all'), mode = modeState[0], setMode = modeState[1];
  var rows = (mode === 'league' ? stats.league : stats.all) || [];
  return h("div", { className: "m-glass", style: { padding: '8px 8px 4px', overflowX: 'auto' } },
    h("div", { style: { padding: '14px 14px 8px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', justifyContent: 'space-between' } },
      h("div", null,
        h("span", { className: "m-eyebrow m-eyebrow--volt" }, "Southern Sunday League · 25/26"),
        h("h3", { className: "m-h3", style: { marginTop: 6 } }, "Leading scorers")),
      h("div", { className: "mp-subtabs", style: { margin: 0 } },
        h("button", { className: "mp-subtab " + (mode === 'all' ? 'is-active' : ''), onClick: function () { setMode('all'); } }, "All comps"),
        h("button", { className: "mp-subtab " + (mode === 'league' ? 'is-active' : ''), onClick: function () { setMode('league'); } }, "League only"))),
    h("table", { className: "mh-table mh-table--full" },
      h("thead", null, h("tr", null,
        h("th", { className: "mh-table__crumb" }),
        h("th", null, "#"), h("th", null, "Player"), h("th", null, "Club"),
        h("th", null, "G"), h("th", null, "A"), h("th", null, "Apps"))),
      h("tbody", null, rows.map(function (s) {
        return h("tr", { key: s.pos, className: s.us ? 'is-us' : '' },
          h("td", { className: "mh-table__crumb" }, h("span", null)),
          h("td", { className: "mh-table__pos" }, s.pos),
          h("td", null, s.name),
          h("td", null, h("span", { className: "mh-table__club" }, Badge ? h(Badge, { team: s.club, size: 22 }) : null, s.club.replace(' FC', ''))),
          h("td", null, s.g),
          h("td", null, s.a == null ? '–' : s.a),
          h("td", null, s.ap));
      }))));
}
function League() {
  var h = React.createElement;
  return h(React.Fragment, null,
    h(PageHero, { eyebrow: "Southern Sunday Football League", title: h(React.Fragment, null, "The ", h("em", null, "league")), sub: "League Ten 25/26 - the table, every result across the division, and the players topping the charts." }),
    h("section", { className: "mp-sec" }, h("div", { className: "m-wrap" },
      h(LeagueTable),
      h("div", { style: { marginTop: 18 } }, h(LeagueStatsTable)),
      h("div", { style: { marginTop: 18 } }, h(LeagueResults)),
      h("p", { style: { marginTop: 18, textAlign: 'center', color: 'var(--m-ink-3)', fontSize: '0.82rem', lineHeight: 1.6 } }, "Table, results and player stats captured from ", h("a", { href: "https://fulltime.thefa.com/displayTeam.html?divisionseason=636836036&teamID=582566146", target: "_blank", rel: "noopener noreferrer", style: { color: 'var(--m-volt-ink)' } }, "FA Full-Time"), ", the official record for the Southern Sunday Football League. Separate from the club's own match data."))));
}
function LeagueTable() {
  useLeagueTick();
  const [season, setSeason] = useState('25/26');
  const rows = window.RAW_TABLE || [];
  const Badge = window.TeamBadge;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "mp-subtabs"
  }, /*#__PURE__*/React.createElement("button", {
    className: `mp-subtab ${season === '25/26' ? 'is-active' : ''}`,
    onClick: () => setSeason('25/26')
  }, "League Ten \xB7 25/26"), /*#__PURE__*/React.createElement("button", {
    className: `mp-subtab ${season === '26/27' ? 'is-active' : ''}`,
    onClick: () => setSeason('26/27')
  }, "League Eight \xB7 26/27")), season === '25/26' ? /*#__PURE__*/React.createElement("div", {
    className: "m-glass",
    style: {
      padding: '8px 8px 4px',
      overflowX: 'auto'
    }
  }, /*#__PURE__*/React.createElement("table", {
    className: "mh-table mh-table--full"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    className: "mh-table__crumb"
  }), /*#__PURE__*/React.createElement("th", null, "#"), /*#__PURE__*/React.createElement("th", null, "Club"), /*#__PURE__*/React.createElement("th", null, "P"), /*#__PURE__*/React.createElement("th", null, "W"), /*#__PURE__*/React.createElement("th", null, "D"), /*#__PURE__*/React.createElement("th", null, "L"), /*#__PURE__*/React.createElement("th", null, "GF"), /*#__PURE__*/React.createElement("th", null, "GA"), /*#__PURE__*/React.createElement("th", null, "GD"), /*#__PURE__*/React.createElement("th", null, "PTS"))), /*#__PURE__*/React.createElement("tbody", null, rows.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: r.c,
    className: `${r.us ? 'is-us is-promo' : ''} ${i === 1 ? 'is-promo2' : ''}`
  }, /*#__PURE__*/React.createElement("td", {
    className: "mh-table__crumb"
  }, /*#__PURE__*/React.createElement("span", null)), /*#__PURE__*/React.createElement("td", {
    className: "mh-table__pos"
  }, r.p), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "mh-table__club"
  }, Badge ? /*#__PURE__*/React.createElement(Badge, {
    team: r.c,
    size: 25
  }) : null, r.c.replace(' FC', ''))), /*#__PURE__*/React.createElement("td", null, r.pl), /*#__PURE__*/React.createElement("td", null, r.w), /*#__PURE__*/React.createElement("td", null, r.d), /*#__PURE__*/React.createElement("td", null, r.l), /*#__PURE__*/React.createElement("td", null, r.gf), /*#__PURE__*/React.createElement("td", null, r.ga), /*#__PURE__*/React.createElement("td", null, r.gd), /*#__PURE__*/React.createElement("td", {
    className: "mh-table__pts"
  }, r.pts)))))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "m-glass",
    style: {
      padding: 'clamp(20px,2.4vw,30px)',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "m-chip m-chip--volt"
  }, "Draft line-up"), /*#__PURE__*/React.createElement("p", {
    className: "m-lead",
    style: {
      marginTop: 12
    }
  }, "Promoted into League Eight for 26/27. The provisional line-up is below, with one place still to be confirmed. Fixtures and standings land before kick-off.")), /*#__PURE__*/React.createElement("div", {
    className: "m-glass",
    style: {
      padding: '8px 8px 4px',
      overflowX: 'auto'
    }
  }, /*#__PURE__*/React.createElement("table", {
    className: "mh-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    className: "mh-table__crumb"
  }), /*#__PURE__*/React.createElement("th", null, "Club"))), /*#__PURE__*/React.createElement("tbody", null, ['Barnes Stormers', 'Bristol City (London) Supporters', 'Haydons Park', 'Junction Elite 4th Team', 'Olympique Mayonnaise', "Sue's Angels FC", 'Three Little Birds FC', 'TSM Rovers FC', 'Tyne & Thames FC'].map(c => /*#__PURE__*/React.createElement("tr", {
    key: c,
    className: c.includes('Angels') ? 'is-us is-promo' : ''
  }, /*#__PURE__*/React.createElement("td", {
    className: "mh-table__crumb"
  }, /*#__PURE__*/React.createElement("span", null)), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "mh-table__club"
  }, Badge ? /*#__PURE__*/React.createElement(Badge, {
    team: c,
    size: 25
  }) : null, c.replace(' FC', ''))))), /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    className: "mh-table__crumb"
  }, /*#__PURE__*/React.createElement("span", null)), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "mh-table__club",
    style: {
      color: 'var(--m-ink-3)',
      fontStyle: 'italic'
    }
  }, "Vacancy, to be confirmed"))))))), /*#__PURE__*/React.createElement("div", { style: { marginTop: 18, textAlign: "center" } }, /*#__PURE__*/React.createElement(ShareBtn, { what: "table", label: "Share table", title: "League Ten table · Sue's Angels FC", url: "table.html", story: function () { return { kind: 'table', eyebrow: 'Southern Sunday League · 25/26', title: 'League Ten Table', rows: (rows || []).map(function (r) { return { pos: r.p, club: String(r.c || '').replace(' FC', ''), pl: r.pl, w: r.w, d: r.d, l: r.l, gd: r.gd, pts: r.pts, us: r.us }; }), footer: 'suesangelsfc.co.uk' }; } })));
}
function Schedule({
  go
}) {
  const [tab, setTab] = useState(window.SA_TAB || 'results');
  const [comp, setComp] = useState('all');
  const [venue, setVenue] = useState('all');
  const [outcome, setOutcome] = useState('all');
  const comps = window.COMPETITIONS || [{
    key: 'all',
    label: 'All',
    match: () => true
  }];
  const matcher = comp === 'all' ? () => true : (comps.find(c => c.key === comp) || {
    match: () => true
  }).match;
  const results = (window.getDerivedResults ? window.getDerivedResults() : []).filter(r => matcher(r.competition)).filter(r => {
    const usHome = r.home.indexOf('Angels') > -1;
    if (venue === 'home' && !usHome) return false;
    if (venue === 'away' && usHome) return false;
    if (outcome !== 'all') {
      const us = usHome ? r.hs : r.as, th = usHome ? r.as : r.hs;
      if (typeof us !== 'number' || typeof th !== 'number') return false;
      const o = us > th ? 'w' : us === th ? 'd' : 'l';
      if (o !== outcome) return false;
    }
    return true;
  });
  const fixtures = window.getActiveUpcoming ? window.getActiveUpcoming() : [];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHero, {
    eyebrow: "Matchday",
    title: /*#__PURE__*/React.createElement(React.Fragment, null, "The ", /*#__PURE__*/React.createElement("em", null, "matches"), "."),
    sub: "Every result across league and cups, and our upcoming fixtures."
  }), /*#__PURE__*/React.createElement("section", {
    className: "mp-sec"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mp-subtabs"
  }, [['results', `Results (${(window.getDerivedResults ? window.getDerivedResults() : []).length})`], ['fixtures', `Fixtures (${fixtures.length})`]].map(([k, l]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    className: `mp-subtab ${tab === k ? 'is-active' : ''}`,
    onClick: () => setTab(k)
  }, l))), tab === 'results' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "mp-subtabs"
  }, comps.map(c => /*#__PURE__*/React.createElement("button", {
    key: c.key,
    className: `mp-subtab ${comp === c.key ? 'is-active' : ''}`,
    onClick: () => setComp(c.key)
  }, c.label))), /*#__PURE__*/React.createElement("div", {
    className: "mp-subtabs mp-subtabs--filters"
  }, [['all', 'All'], ['home', 'Home'], ['away', 'Away']].map(([k, l]) => /*#__PURE__*/React.createElement("button", {
    key: 'v' + k,
    className: `mp-subtab ${venue === k ? 'is-active' : ''}`,
    onClick: () => setVenue(k)
  }, l)).concat([/*#__PURE__*/React.createElement("span", { key: 'sep', className: "mp-filtersep" })], [['all', 'All'], ['w', 'Wins'], ['d', 'Draws'], ['l', 'Losses']].map(([k, l]) => /*#__PURE__*/React.createElement("button", {
    key: 'o' + k,
    className: `mp-subtab ${outcome === k ? 'is-active' : ''}`,
    onClick: () => setOutcome(k)
  }, l)))), results.length ? /*#__PURE__*/React.createElement("div", {
    className: "mp-grid mp-results"
  }, results.map(r => /*#__PURE__*/React.createElement(ResCard, {
    key: r.id,
    r: r
  }))) : /*#__PURE__*/React.createElement("p", {
    className: "cms-empty",
    style: { margin: '8px 0', color: 'var(--m-ink-3)' }
  }, "No matches fit these filters.")) : fixtures.length ? /*#__PURE__*/React.createElement("div", {
    className: "mp-grid mp-results"
  }, fixtures.map((f, i) => /*#__PURE__*/React.createElement("div", {
    className: "mh-res",
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    className: "mh-res__top"
  }, /*#__PURE__*/React.createElement("span", {
    className: "m-chip"
  }, f.comp || 'League'), /*#__PURE__*/React.createElement("span", {
    className: "mh-res__date"
  }, f.date)), /*#__PURE__*/React.createElement("div", {
    className: "mh-res__row"
  }, window.TeamBadge ? /*#__PURE__*/React.createElement(window.TeamBadge, { team: f.home, size: 26 }) : null, /*#__PURE__*/React.createElement("span", null, f.home.replace(' FC', ''))), /*#__PURE__*/React.createElement("div", {
    className: "mh-res__row"
  }, window.TeamBadge ? /*#__PURE__*/React.createElement(window.TeamBadge, { team: f.away, size: 26 }) : null, /*#__PURE__*/React.createElement("span", null, f.away.replace(' FC', '')))))) : /*#__PURE__*/React.createElement("div", {
    className: "m-glass",
    style: {
      padding: 40,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    className: "m-h3"
  }, "Pre-season starts 24 June"), /*#__PURE__*/React.createElement("p", {
    className: "m-lead",
    style: {
      margin: '12px auto 0'
    }
  }, "League fixtures for 26/27 land over the summer and appear here automatically.")))));
}

/* ══ MEDIA ══════════════════════════════════════════════════════════════ */
function Media({
  go
}) {
  const h = React.createElement;
  const [tab, setTab] = useState(window.SA_TAB || 'news');
  const [cat, setCat] = useState('all');
  const [gcat, setGcat] = useState('all');
  const [vid, setVid] = useState(null);
  const [album, setAlbum] = useState(null);
  const [ai, setAi] = useState(0);
  const [zoom, setZoom] = useState(null);
  const [report, setReport] = useState(null);
  const [article, setArticle] = useState(null);
  const [, force] = useState(0);
  useEffect(() => {
    const onCh = () => force(n => n + 1);
    window.addEventListener('sa-articles-changed', onCh);
    window.addEventListener('sa-media-changed', onCh);
    return () => { window.removeEventListener('sa-articles-changed', onCh); window.removeEventListener('sa-media-changed', onCh); };
  }, []);
  const Badge = window.TeamBadge;
  const gallery = window.GalleryStore ? window.GalleryStore.list() : [];
  const MON2 = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const pd = s => { const m = /(\d{1,2})\s+(\w{3})\s+(\d{2,4})/.exec(s || ''); return m ? new Date((+m[3] < 100 ? 2000 + +m[3] : +m[3]), MON2[m[2]] || 0, +m[1]).getTime() : 0; };
  const trunc = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, '') + '\u2026'; };
  const articles = (window.getCustomArticles ? window.getCustomArticles() : []).filter(a => a && a.title).map(a => ({
    type: 'article', id: a.id, cat: a.cat || 'News', title: a.title, body: a.lede || '', date: a.date || '',
    cover: (window.getArticleCover && window.getArticleCover(a.id)) || a.cover || null,
    sort: a.sortISO ? Date.parse(a.sortISO) : pd(a.date)
  }));
  const reports = (window.getDerivedResults ? window.getDerivedResults() : []).filter(r => r.kind !== 'walkover' && r.hs != null).slice(0, 12).map(r => ({ type: 'report', id: r.id, r: r, date: r.date, sort: pd(r.date) }));
  const feed = articles.concat(reports).sort((a, b) => (b.sort || 0) - (a.sort || 0));
  // Deep links: open a specific article or match report from ?article= / ?report=
  // once the (cloud) data has loaded, and keep the URL + title in sync when one is
  // opened, so reports and articles can be shared with a direct link.
  const mediaEntry = useRef(false);
  useEffect(() => {
    if (mediaEntry.current) return;
    try {
      const q = new URLSearchParams(window.location.search);
      const aid = q.get('article'), rid = q.get('report'), albid = q.get('album'), vidid = q.get('video');
      if (!aid && !rid && !albid && !vidid) { mediaEntry.current = true; return; }
      if (aid) { const a = articles.find(x => x.id === aid); if (a) { mediaEntry.current = true; setTab('news'); setArticle(a); } }
      else if (rid) { const rr = reports.find(x => x.id === rid); if (rr) { mediaEntry.current = true; setTab('news'); setReport(rr.r); } }
      else if (albid) { const al = (window.getGalleryAlbums ? window.getGalleryAlbums() : []).find(x => x.id === albid); if (al) { mediaEntry.current = true; setTab('gallery'); setAlbum(al); } }
      else if (vidid) { const v = (window.getClubVideos ? window.getClubVideos() : []).find(x => x.id === vidid); if (v) { mediaEntry.current = true; setTab('videos'); setVid(v); } }
    } catch (e) {}
  }, [feed.length, gallery.length]);
  const articleFirst = useRef(true);
  useEffect(() => {
    if (articleFirst.current) { articleFirst.current = false; return; }
    try {
      if (article) { window.history.replaceState(null, '', 'media.html?article=' + article.id); document.title = (article.title || 'Article') + " · Sue's Angels FC"; }
      else { window.history.replaceState(null, '', 'media.html'); document.title = "Media · Sue's Angels FC"; }
    } catch (e) {}
  }, [article]);
  const reportFirst = useRef(true);
  useEffect(() => {
    if (reportFirst.current) { reportFirst.current = false; return; }
    try {
      if (report) { window.history.replaceState(null, '', 'media.html?report=' + report.id); document.title = (report.home ? report.home.replace(' FC', '') + ' v ' + report.away.replace(' FC', '') : 'Match report') + " · Sue's Angels FC"; }
      else { window.history.replaceState(null, '', 'media.html'); document.title = "Media · Sue's Angels FC"; }
    } catch (e) {}
  }, [report]);
  const albumFirst = useRef(true);
  useEffect(() => {
    if (albumFirst.current) { albumFirst.current = false; return; }
    try {
      if (album) { window.history.replaceState(null, '', 'media.html?album=' + album.id); document.title = (album.title || 'Gallery') + " · Sue's Angels FC"; }
      else { window.history.replaceState(null, '', 'media.html'); document.title = "Media · Sue's Angels FC"; }
    } catch (e) {}
  }, [album]);
  const vidFirst = useRef(true);
  useEffect(() => {
    if (vidFirst.current) { vidFirst.current = false; return; }
    try {
      if (vid) { window.history.replaceState(null, '', 'media.html?video=' + vid.id); document.title = (vid.title || 'Video') + " · Sue's Angels FC"; }
      else { window.history.replaceState(null, '', 'media.html'); document.title = "Media · Sue's Angels FC"; }
    } catch (e) {}
  }, [vid]);

  const articleCard = it => h("button", { className: "mp-news mp-clickable", key: 'a-' + it.id, onClick: () => setArticle(it) }, (window.getPostCover && window.getPostCover(it.id)) ? maGenCover(window.getPostCover(it.id)) : it.cover ? h("div", { className: "mp-news__cover" }, h("img", { src: it.cover, alt: "" })) : maGenCover({ layout: 'badges', top: it.cat || 'News', left: 'assets/badge/sue-angels-shield.webp', right: '', center: '', bottom: it.date || "Sue's Angels FC" }), h("div", { className: "mp-news__body" }, h("span", { className: "m-chip m-chip--volt mp-news__tag" }, it.cat), h("h3", { className: "m-h3" }, it.title), h("p", null, (it.date ? it.date + ' \u00b7 ' : '') + trunc(it.body, 110))));

  const reportCard = it => { const r = it.r; const uh = r.home.includes('Angels'); const us = uh ? r.hs : r.as, th = uh ? r.as : r.hs; const win = us > th; const gspec = window.getPostCover ? window.getPostCover(r.id) : null; const rcover = (window.getArticleCover && window.getArticleCover(r.id)) || null; return h("button", { className: "mp-news mp-clickable", key: 'r-' + r.id, onClick: () => setReport(r) }, gspec ? maGenCover(gspec) : h("div", { className: "mp-news__cover mp-news__cover--score" + (rcover ? " mp-news__cover--shot" : "") }, rcover ? h("img", { className: "mp-news__bg", src: rcover, alt: "" }) : null, rcover ? h("div", { className: "mp-news__scrim2" }) : null, h("span", { className: "mp-news__ft" }, "Full time"), h("div", { className: "mp-news__sc" }, Badge ? h(Badge, { team: r.home, size: 52 }) : null, h("b", null, r.hs, "-", r.as), Badge ? h(Badge, { team: r.away, size: 52 }) : null), h("div", { className: "mp-news__cfoot" }, h("span", { className: "mp-news__comp" }, r.competition || 'League Ten'), h("span", { className: `mp-news__res mp-news__res--${win ? 'w' : us === th ? 'd' : 'l'}` }, win ? 'Win' : us === th ? 'Draw' : 'Loss'))), h("div", { className: "mp-news__body" }, h("span", { className: `m-chip ${win ? 'm-chip--volt' : ''} mp-news__tag` }, r.competition || 'League Ten'), h("h3", { className: "m-h3" }, r.home.replace(' FC', ''), " v ", r.away.replace(' FC', '')), h("p", null, r.date, " \u00b7 ", win ? 'A commanding win' : us === th ? 'Honours even' : 'A hard lesson', " for Sue's Angels. Read the full match report."))); };

  const catOf = it => it.type === 'report' ? 'Reports' : (it.cat || 'News');
  const cats = ['all'].concat(feed.map(catOf).filter((c, i, ar) => ar.indexOf(c) === i));
  const catTabs = cats.length > 2 ? h("div", { className: "mp-subtabs", style: { marginTop: -14 } }, cats.map(c => h("button", { key: c, className: `mp-subtab ${cat === c ? 'is-active' : ''}`, onClick: () => setCat(c) }, c === 'all' ? 'All' : c))) : null;
  const shownFeed = cat === 'all' ? feed : feed.filter(it => catOf(it) === cat);
  const newsBody = shownFeed.length ? h("div", { className: "mp-grid mp-g3" }, shownFeed.map(it => it.type === 'article' ? articleCard(it) : reportCard(it))) : h("div", { className: "m-glass", style: { padding: 40, textAlign: 'center' } }, h("h3", { className: "m-h3" }, "No news yet"), h("p", { className: "m-lead", style: { margin: '12px auto 0' } }, "Match reports and club news will appear here."));

  const gcatOf = it => it.category || 'Photos';
  const gcats = ['all'].concat(gallery.map(gcatOf).filter((c, i, ar) => ar.indexOf(c) === i));
  const gcatTabs = (gallery.length && gcats.length > 2) ? h("div", { className: "mp-subtabs", style: { marginTop: -14 } }, gcats.map(c => h("button", { key: c, className: `mp-subtab ${gcat === c ? 'is-active' : ''}`, onClick: () => setGcat(c) }, c === 'all' ? 'All' : c))) : null;
  const shownGallery = (gcat === 'all' ? gallery : gallery.filter(it => gcatOf(it) === gcat)).slice(0, 12);
  const galleryCard = (it, i) => {
    const matchday = it.category === 'Matchday';
    const cover = window.galleryCover ? window.galleryCover(it) : it.src;
    const coverEl = matchday
      ? h("div", { className: "mp-news__cover", style: { gap: 10 } }, it.photographer ? h("span", { className: "mp-news__ft", style: { color: 'rgb(214,242,58)', fontSize: '7px' } }, "PICTURES TAKEN BY " + String(it.photographer).toUpperCase()) : null, h("span", { className: "mp-news__ft" }, "MATCHDAY"), h("div", { className: "mp-news__sc" }, h("img", { className: "mp-news__gbadge", src: it.homeBadge || 'assets/badge/sue-angels-shield.webp', alt: "" }), h("span", { className: "mp-news__gvs" }, "VS"), it.awayBadge ? h("img", { className: "mp-news__gbadge", src: it.awayBadge, alt: "" }) : null))
      : h("div", { className: "mp-news__cover" }, cover ? h("img", { src: cover, alt: "" }) : h("img", { className: "gh", src: "assets/badge/sue-angels-shield.webp", alt: "" }));
    return h("button", { className: "mp-news mp-clickable", key: i, onClick: () => { setAlbum(it); setAi(0); } }, coverEl, it.category ? h("div", { className: "mp-news__body" }, h("span", { className: "m-chip m-chip--volt mp-news__tag" }, it.category)) : null);
  };
  const galleryBody = shownGallery.length ? h("div", { className: "mp-grid mp-g4" }, shownGallery.map(galleryCard)) : h("div", { className: "m-empty" }, h("b", null, "NO PHOTOS YET"), h("span", null, "MATCHDAY ALBUMS WILL APPEAR HERE"));
  const videos = window.getClubVideos ? window.getClubVideos() : [];
  const videoCard = (v, i) => h("button", { className: "mp-news mp-clickable", key: v.id || i, onClick: () => setVid(v) }, v.cover ? h("div", { className: "mp-news__cover" }, h("img", { src: v.cover, alt: "" })) : maGenCover({ layout: 'badges', top: v.category || 'VIDEO', left: v.homeBadge || 'assets/badge/sue-angels-shield.webp', right: v.awayBadge || '', center: '\u25B6', bottom: v.title || 'Watch' }), h("div", { className: "mp-news__body" }, v.category ? h("span", { className: "m-chip m-chip--volt mp-news__tag" }, v.category) : null, v.title ? h("h3", { className: "m-h3" }, v.title) : null));
  const videosBody = videos.length ? h("div", { className: "mp-grid mp-g3" }, videos.map(videoCard)) : h("div", { className: "m-empty" }, h("b", null, "NO VIDEOS YET"), h("span", null, "MATCH GOALS & CLIPS WILL APPEAR HERE"));
  const slim = !!window.SA_SLIM;
  const mHeroMap = {
    news: { eb: 'The latest', a: 'Club ', b: 'news', sub: 'Match reports and club news from Sue\'s Angels FC.' },
    gallery: { eb: 'Matchday', a: 'The ', b: 'gallery', sub: 'Matchday photography from across the season.' },
    videos: { eb: 'Watch', a: 'Club ', b: 'videos', sub: 'Match goals, highlights and clips.' }
  };
  const mHero = (slim && mHeroMap[tab]) ? mHeroMap[tab] : { eb: 'The latest', a: 'Me', b: 'dia', sub: 'Match reports, club news and the matchday gallery.' };

  return h(React.Fragment, null, h(PageHero, { eyebrow: mHero.eb, title: h(React.Fragment, null, mHero.a, h("em", null, mHero.b), "."), sub: mHero.sub }), h("section", { className: "mp-sec" }, h("div", { className: "m-wrap" }, slim ? null : h("div", { className: "mp-subtabs" }, [['live', 'Live'], ['news', 'News'], ['gallery', 'Gallery'], ['videos', 'Videos']].map(([k, l]) => h("button", { key: k, className: `mp-subtab ${tab === k ? 'is-active' : ''}`, onClick: () => setTab(k) }, l))), tab === 'news' ? h(React.Fragment, null, catTabs, newsBody) : tab === 'videos' ? videosBody : h(React.Fragment, null, gcatTabs, galleryBody))), report ? h(Modal, { onClose: () => setReport(null) }, h("div", { className: "m-glass m-modal__sponsor" }, h("p", { className: "m-eyebrow m-eyebrow--volt" }, report.competition || 'League Ten', " \u00b7 ", report.date), h("h2", { className: "m-h2", style: { marginTop: 10 } }, report.home.replace(' FC', ''), " ", report.hs, "-", report.as, " ", report.away.replace(' FC', '')), h("div", { className: "m-prose" }, function () { var d = window.loadMatchEntry ? window.loadMatchEntry(report.id) : null; var t = d && (d.polishedReport || d.commentary); t = t && String(t).trim(); if (!t) return h("p", null, "Match report to follow, watch this space."); return t.split(/\n+/).map(function (p, i) { return h("p", { key: i }, p); }); }()), h("div", { style: { marginTop: 18, textAlign: "center" } }, h(ShareBtn, { what: "report", label: "Share report", story: function () { return window.saReportStorySpec ? window.saReportStorySpec(report) : null; } })))) : null, article ? h(Modal, { onClose: () => setArticle(null) }, h("div", { className: "m-glass m-modal__sponsor" }, article.cover ? h("img", { src: article.cover, alt: "", style: { width: '100%', maxHeight: 340, objectFit: 'cover', borderRadius: 14, marginBottom: 18 } }) : null, h("p", { className: "m-eyebrow m-eyebrow--volt" }, article.cat, " \u00b7 ", article.date), h("h2", { className: "m-h2", style: { marginTop: 10 } }, article.title), h("div", { className: "m-prose", style: { marginTop: 16 } }, String(article.body || '').split(/\n+/).filter(Boolean).map((p, i) => h("p", { key: i }, p))), h("div", { style: { marginTop: 18, textAlign: "center" } }, h(ShareBtn, { what: "article", label: "Share post", image: article.cover || null, story: function () { return { title: article.title, subtitle: article.cat || 'News', photo: article.cover || null, footer: 'suesangelsfc.co.uk' }; } })))) : null, album ? (function () { var ph = window.galleryPhotos ? window.galleryPhotos(album) : (album.photos || []); if (!ph.length) return null; var idx = ((ai % ph.length) + ph.length) % ph.length; var tags = (album.photoTags && album.photoTags[idx]) || []; return h("div", { className: "m-zoom m-albumbox", onClick: () => setAlbum(null) }, h("button", { className: "m-modal__close", onClick: () => setAlbum(null) }, "\u2715"), h("div", { style: { position: 'absolute', top: 16, left: 16, zIndex: 6 }, onClick: function (e) { e.stopPropagation(); } }, h(ShareBtn, { what: "album", label: "Share", url: "media.html?album=" + (album.id || ''), story: function () { return { title: album.title || 'Matchday gallery', subtitle: album.category || 'Gallery', photo: album.cover || ph[0] || null, footer: 'suesangelsfc.co.uk' }; } })), ph.length > 1 ? h("button", { className: "m-albumbox__nav m-albumbox__nav--prev", onClick: (e) => { e.stopPropagation(); setAi(idx - 1); } }, "\u2039") : null, h("figure", { className: "m-albumbox__fig", onClick: (e) => e.stopPropagation() }, h("img", { src: ph[idx], alt: "" }), tags.length ? h("figcaption", { className: "m-albumbox__tags" }, tags.join(" \u00b7 ")) : null, h("span", { className: "m-albumbox__count" }, (idx + 1) + " / " + ph.length)), ph.length > 1 ? h("button", { className: "m-albumbox__nav m-albumbox__nav--next", onClick: (e) => { e.stopPropagation(); setAi(idx + 1); } }, "\u203A") : null); })() : null, vid ? h("div", { className: "m-zoom", onClick: () => setVid(null) }, h("button", { className: "m-modal__close", onClick: () => setVid(null) }, "\u2715"), h("div", { style: { position: 'absolute', top: 16, left: 16, zIndex: 6 }, onClick: function (e) { e.stopPropagation(); } }, h(ShareBtn, { what: "video", label: "Share", url: "media.html?video=" + (vid.id || ''), story: function () { var u = vid.url || ''; var m = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/); return { title: vid.title || 'Club video', subtitle: 'Video', photo: m ? ('https://img.youtube.com/vi/' + m[1] + '/hqdefault.jpg') : null, footer: 'suesangelsfc.co.uk' }; } })), (function () { var u = vid.url || ''; var m = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/); if (m) return h("iframe", { src: 'https://www.youtube.com/embed/' + m[1] + '?autoplay=1', style: { width: 'min(92vw, 960px)', aspectRatio: '16 / 9', border: 0, borderRadius: 14 }, allow: 'autoplay; fullscreen', allowFullScreen: true }); return h("video", { src: u, controls: true, autoPlay: true, style: { width: 'min(92vw, 960px)', maxHeight: '82vh', borderRadius: 14, background: '#000' } }); })()) : null, zoom ? h("div", { className: "m-zoom", onClick: () => setZoom(null) }, h("button", { className: "m-modal__close", onClick: () => setZoom(null) }, "\u2715"), h("img", { src: zoom, alt: "" })) : null);
}

/* ══ SPONSORS ═══════════════════════════════════════════════════════════ */
function maGenCover(spec) {
  var h = React.createElement;
  if (!spec) return null;
  var isScore = spec.layout === 'score';
  var resLabel = spec.result === 'w' ? 'Win' : spec.result === 'd' ? 'Draw' : spec.result === 'l' ? 'Loss' : null;
  return h("div", { className: "mp-news__cover mp-news__cover--score" },
    spec.top ? h("span", { className: "mp-news__ft" }, spec.top) : null,
    h("div", { className: "mp-news__sc" },
      spec.left ? h("img", { className: "mp-news__gbadge", src: spec.left, alt: "" }) : null,
      isScore ? h("b", null, spec.center || '') : (spec.center ? h("span", { className: "mp-news__gvs" }, spec.center) : null),
      spec.right ? h("img", { className: "mp-news__gbadge", src: spec.right, alt: "" }) : null),
    (spec.bottom || resLabel) ? h("div", { className: "mp-news__cfoot" },
      spec.bottom ? h("span", { className: "mp-news__comp" }, spec.bottom) : null,
      resLabel ? h("span", { className: "mp-news__res mp-news__res--" + spec.result }, resLabel) : null) : null);
}
function maHeart() {
  return /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 24 24", fill: "currentColor" }, /*#__PURE__*/React.createElement("path", { d: "M12 21s-7.5-4.6-10-9.2C.4 8.4 2 4.7 5.3 4.2 7.2 3.9 9 4.9 12 7.8c3-2.9 4.8-3.9 6.7-3.6C22 4.7 23.6 8.4 22 11.8 19.5 16.4 12 21 12 21z" }));
}
function maArrow() {
  return /*#__PURE__*/React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }, /*#__PURE__*/React.createElement("path", { d: "M5 12h14M13 6l6 6-6 6" }));
}
function DonateBlock() {
  var h = React.createElement;
  var amtState = React.useState(10), amount = amtState[0], setAmount = amtState[1];
  var tick = React.useState(0), bump = tick[1];
  React.useEffect(function () { var f = function () { bump(function (n) { return n + 1; }); }; window.addEventListener('sa-media-changed', f); return function () { window.removeEventListener('sa-media-changed', f); }; }, []);
  var cfg = window.getDonateConfig ? window.getDonateConfig() : {};
  var clubUrl = cfg.clubUrl || window.SA_DONATE_CLUB_URL || '';
  var sepsisUrl = cfg.sepsisUrl || window.SA_DONATE_CAUSE_URL || 'https://sepsistrust.org';
  var amounts = [5, 10, 25, 'Custom'];
  var clubBtn = clubUrl
    ? h("a", { className: "mp-donate2__btn", href: clubUrl, target: "_blank", rel: "noopener" }, "Donate" + (typeof amount === 'number' ? ' \u00a3' + amount : '') + " securely", maArrow())
    : h("span", { className: "mp-donate2__btn is-disabled", title: "Card payments go live once the club's Stripe link is connected." }, "Donations opening soon");
  return h("div", { className: "mp-donate2" },
    h("div", { className: "mp-donate2__card mp-donate2__card--club" },
      h("div", { className: "mp-donate2__ic" }, maHeart()),
      h("h3", { className: "m-h3" }, "Support the club"),
      h("p", null, "Equipment, training, matchdays and media. Every pound goes back into Sue's Angels."),
      h("div", { className: "mp-donate2__amts" }, amounts.map(function (a) {
        return h("button", { type: "button", key: a, className: "mp-donate2__amt " + (amount === a ? 'is-on' : ''), onClick: function () { setAmount(a); } }, a === 'Custom' ? 'Custom' : '\u00a3' + a);
      })),
      clubBtn,
      h("span", { className: "mp-donate2__note" }, "Secure card payment via Stripe. You confirm the amount on Stripe's page.")),
    h("a", { className: "mp-donate2__card mp-donate2__card--cause", href: sepsisUrl, target: "_blank", rel: "noopener" },
      h("div", { className: "mp-donate2__ic" }, maHeart()),
      h("h3", { className: "m-h3" }, "Support sepsis awareness"),
      h("p", null, "Donate to the UK Sepsis Trust in memory of Susan Anne Martin and help raise awareness."),
      h("span", { className: "mp-donate2__btn mp-donate2__btn--ghost" }, "Donate to the cause", maArrow())));
}
// Supporter / newsletter sign-up. Writes to the `supporters` table (public
// insert, private read) via window.saAddSupporter. props.compact => footer style.
function SupporterSignup(props) {
  var h = React.createElement;
  var source = props.source || 'site', compact = !!props.compact;
  var es = React.useState(''), email = es[0], setEmail = es[1];
  var ns = React.useState(''), nm = ns[0], setNm = ns[1];
  var ks = React.useState(false), consent = ks[0], setConsent = ks[1];
  var sts = React.useState(''), status = sts[0], setStatus = sts[1];
  var mss = React.useState(''), msg = mss[0], setMsg = mss[1];
  function submit(e) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email).trim())) { setStatus('err'); setMsg('Please enter a valid email address.'); return; }
    if (!consent) { setStatus('err'); setMsg('Please tick the box so we have your permission to email you.'); return; }
    setStatus('sending'); setMsg('');
    (window.saAddSupporter ? window.saAddSupporter(email, nm, source) : Promise.resolve({ ok: false })).then(function (r) {
      if (r && r.ok) { setStatus('ok'); setMsg(r.duplicate ? 'You’re already on the list — thank you.' : 'Thank you. You’re on the list.'); }
      else { setStatus('err'); setMsg('Sorry, something went wrong. Please try again shortly.'); }
    });
  }
  var emailField = function (cls) { return h('input', { type: 'email', value: email, required: true, autoComplete: 'email', placeholder: 'you@email.com', onChange: function (e) { setEmail(e.target.value); } }); };
  var checkbox = function (size) { return h('label', { style: { display: 'flex', gap: size === 'sm' ? 8 : 10, alignItems: 'flex-start', fontSize: size === 'sm' ? '0.74rem' : '0.84rem', color: size === 'sm' ? 'var(--m-ink-3)' : 'var(--m-ink-2)', cursor: 'pointer', lineHeight: 1.5 } },
    h('input', { type: 'checkbox', checked: consent, onChange: function (e) { setConsent(e.target.checked); }, style: { marginTop: 3, flex: '0 0 auto', accentColor: 'var(--m-volt)' } }),
    h('span', null, size === 'sm' ? 'Occasional club news by email. Unsubscribe any time.' : 'Keep me posted with occasional Sue’s Angels news and match updates. I agree to my email being stored for this. No spam, unsubscribe any time.')); };
  if (compact) {
    if (status === 'ok') return h('p', { style: { font: '600 0.86rem var(--m-sans)', color: 'var(--m-volt-ink)', margin: 0 } }, '✓ ' + msg);
    return h('form', { onSubmit: submit, style: { display: 'grid', gap: 10, maxWidth: 320 } },
      h('input', { type: 'email', value: email, required: true, autoComplete: 'email', placeholder: 'Your email', onChange: function (e) { setEmail(e.target.value); }, style: { width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--m-edge)', background: 'var(--m-glass-1)', color: 'var(--m-ink-1)', font: '500 15px var(--m-sans)' } }),
      checkbox('sm'),
      h('button', { type: 'submit', className: 'm-btn m-btn--volt', disabled: status === 'sending', style: { justifyContent: 'center', padding: '10px 16px' } }, status === 'sending' ? 'Joining…' : 'Join the list'),
      status === 'err' ? h('p', { style: { color: '#ff9b9b', fontSize: '0.76rem', margin: 0 } }, msg) : null);
  }
  if (status === 'ok') return h('div', { className: 'm-glass', style: { padding: 'clamp(22px,3vw,30px)', textAlign: 'center' } },
    h('p', { className: 'm-eyebrow m-eyebrow--volt', style: { justifyContent: 'center', display: 'inline-flex' } }, 'You’re in'),
    h('p', { style: { font: '600 1.1rem var(--m-sans)', marginTop: 10 } }, msg),
    h('p', { style: { color: 'var(--m-ink-3)', fontSize: '0.86rem', marginTop: 6 } }, 'We’ll only send the occasional update. Unsubscribe any time.'));
  return h('form', { className: 'm-glass mp-form', onSubmit: submit },
    h('div', { className: 'mp-frow' },
      h('label', { className: 'mp-field' }, h('span', null, 'Name (optional)'), h('input', { type: 'text', value: nm, autoComplete: 'name', placeholder: 'Your name', onChange: function (e) { setNm(e.target.value); } })),
      h('label', { className: 'mp-field' }, h('span', null, 'Email'), emailField())),
    checkbox(),
    h('button', { type: 'submit', className: 'm-btn m-btn--volt', disabled: status === 'sending', style: { justifyContent: 'center' } }, status === 'sending' ? 'Joining…' : 'Join the list', status === 'sending' ? null : maArrow()),
    status === 'err' ? h('p', { style: { color: '#ff9b9b', fontSize: '0.84rem', margin: 0 } }, msg) : null);
}
// Gated sponsorship-pack download: capture the business's email (a warm
// sponsorship lead) before the PDF downloads. Never blocks the download —
// even if capture fails, the pack still opens so we never lose the visitor.
function SponsorPackGate() {
  var h = React.createElement;
  var st = React.useState(false), open = st[0], setOpen = st[1];
  var es = React.useState(''), email = es[0], setEmail = es[1];
  var ss = React.useState(''), status = ss[0], setStatus = ss[1];
  var PDF = 'assets/sue-angels-sponsorship-pack.pdf';
  function dl() { try { var a = document.createElement('a'); a.href = PDF; a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { window.open(PDF, '_blank'); } }
  function submit(e) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email).trim())) { setStatus('err'); return; }
    setStatus('sending');
    (window.saAddEnquiry ? window.saAddEnquiry({ type: 'Sponsorship pack request', email: email, message: 'Downloaded the sponsorship pack.', source: 'sponsor-pack' }) : Promise.resolve({ ok: false })).then(function () { setStatus('done'); dl(); });
  }
  return h(React.Fragment, null,
    h("button", { className: "m-btn m-btn--ghost", onClick: function () { setOpen(true); } }, "Download the pack"),
    open ? h(Modal, { onClose: function () { setOpen(false); } }, h("div", { className: "m-glass", style: { padding: 'clamp(22px,3vw,30px)', maxWidth: 440 } },
      status === 'done'
        ? h("div", { style: { textAlign: 'center' } }, h("p", { className: "m-eyebrow m-eyebrow--volt", style: { justifyContent: 'center', display: 'inline-flex' } }, "On its way"), h("h3", { className: "m-h3", style: { marginTop: 10 } }, "Thanks — your download has started."), h("p", { style: { color: 'var(--m-ink-3)', marginTop: 8, fontSize: '0.9rem' } }, "If it didn’t open, ", h("a", { href: PDF, target: "_blank", rel: "noopener", style: { color: 'var(--m-volt-ink)' } }, "tap here"), ". We’ll be in touch about partnering."))
        : h("form", { onSubmit: submit },
          h("p", { className: "m-eyebrow m-eyebrow--volt" }, "Sponsorship pack"),
          h("h3", { className: "m-h3", style: { margin: '8px 0 4px' } }, "Where should we send it?"),
          h("p", { style: { color: 'var(--m-ink-3)', fontSize: '0.9rem', marginBottom: 14 } }, "Pop in your email and the pack downloads right away. We’ll only use it to follow up about partnering with the club."),
          h("input", { type: 'email', required: true, value: email, placeholder: 'you@company.com', autoComplete: 'email', onChange: function (e) { setEmail(e.target.value); }, style: { width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--m-edge)', background: 'var(--m-glass-1)', color: 'var(--m-ink-1)', font: '500 15px var(--m-sans)' } }),
          status === 'err' ? h("p", { style: { color: '#ff9b9b', fontSize: '0.8rem', margin: '8px 0 0' } }, "Please enter a valid email.") : null,
          h("button", { type: 'submit', className: "m-btn m-btn--volt", disabled: status === 'sending', style: { marginTop: 14, justifyContent: 'center', width: '100%' } }, status === 'sending' ? 'Preparing…' : 'Get the pack'))
    )) : null);
}
function Sponsors({
  go
}) {
  const h = React.createElement;
  const [detail, setDetail] = useState(null);
  const partners = [{
    logo: 'assets/sponsors/sporting-solutions.webp',
    n: 'Sporting Solutions Ltd',
    role: 'Main kit sponsor',
    sub: 'On the matchday shirt every weekend since the inaugural season.',
    loc: 'London & Surrey',
    since: '2025',
    ig: 'https://instagram.com/sporting_solutions_ltd',
    desc: ['Sporting Solutions Ltd are a London and Surrey-based sports and garden maintenance contractor, specialising in professional outdoor maintenance, sports-surface care and renovation.', 'Sue’s Angels FC are proud to be backed by a company whose work maintains the spaces where sport and community come together.']
  }, {
    logo: 'assets/sponsors/hodgson-roofing.webp',
    n: 'Hodgson Roofing',
    role: 'Warm-up & training top sponsor',
    sub: 'NFRC-accredited roofing specialists, on the squad pre-match.',
    loc: 'Harrow & London',
    since: '2026',
    web: 'https://hodgsonroofing.com',
    desc: ['Hodgson Roofing are NFRC-accredited roofing specialists based in Harrow, serving London and the surrounding areas with new roofs, repairs, flat roofs and lead work.', 'Their backing helps strengthen the club on and off the pitch.']
  }, {
    logo: 'assets/sponsors/staines-rugby.png',
    n: 'Staines Rugby Club',
    role: 'Ground-share partner',
    sub: 'Our home at The Reeves, where the Angels train and play.',
    loc: 'The Reeves, Hanworth',
    since: '2025',
    web: 'https://www.stainesrugby.uk/',
    ig: 'https://www.instagram.com/stainesrugby/',
    desc: ['Staines Rugby Club, the Swans, was founded in 1926 and marks its centenary in 2026. The club plays at The Reeves in Hanworth, a multi-pitch home it has run since the 1960s, with a proud tradition of community and youth rugby.', 'We are proud to ground-share with Staines RFC, training and playing our home fixtures at The Reeves, and grateful to everyone at the club for making us so welcome.']
  }];
  const benefits = [['01', 'Every matchday', 'Your brand on the kit we play in every weekend.'], ['02', 'Real audience', 'A growing London fanbase reached through reports, tables and player content.'], ['03', 'Tailored deal', 'No fixed tiers, just a package built around your business.'], ['04', "Champions' badge", 'Back a winner: League Ten champions, unbeaten, promoted for 26/27.']];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHero, {
    eyebrow: "Partners",
    title: /*#__PURE__*/React.createElement(React.Fragment, null, "Behind the ", /*#__PURE__*/React.createElement("em", null, "badge"), "."),
    sub: "The businesses and clubs that back Sue's Angels, including our ground-share partner. Here's who they are, and how to join them.",
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
      className: "m-btn m-btn--volt",
      onClick: () => go('contact')
    }, "Partner with us ", /*#__PURE__*/React.createElement(Arrow, null)), /*#__PURE__*/React.createElement(SponsorPackGate, null))
  }), h("section", { className: "mp-sec" }, h("div", { className: "m-wrap" },
    h(Head, { eyebrow: "Why partner", title: "More than a logo on a shirt" }),
    h("p", { className: "m-lead", style: { maxWidth: "64ch", marginBottom: 26 } }, "Sue’s Angels isn’t a typical grassroots side. We are League Ten champions, unbeaten in our first season, built around a cause that matters, with a growing audience that puts local businesses in front of the right people."),
    h("div", { className: "mp-grid mp-g2" }, [["Champions, with momentum", "Played 18, won 18, promoted for 26/27. Your brand backs a winning, rising club, not a hopeful start-up."], ["A club with a cause", "Founded in memory of Susan Anne Martin, and supporting sepsis awareness. Backing us means standing behind something that matters."], ["Local roots, real reach", "Home at The Reeves in Hanworth, serving Kingston, Sunbury, Staines and south-west London, and growing across Instagram, TikTok and the web."], ["A package, not a slot", "No fixed tiers. We build the partnership around your business, from kit and content to matchday and more."]].map((c, i) => h("div", { key: i, className: "m-glass", style: { padding: "clamp(22px,3vw,30px)" } }, h("h3", { className: "m-h3" }, c[0]), h("p", { style: { color: "var(--m-ink-2)", marginTop: 8 } }, c[1])))))), /*#__PURE__*/React.createElement("section", {
    className: "mp-sec"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-wrap"
  }, /*#__PURE__*/React.createElement(Head, {
    eyebrow: "Proudly backed by",
    title: "Main sponsors"
  }), /*#__PURE__*/React.createElement("div", {
    className: "mp-grid mp-g2"
  }, partners.map(s => /*#__PURE__*/React.createElement("button", {
    className: "mh-partner mp-clickable",
    key: s.n,
    onClick: () => setDetail(s)
  }, /*#__PURE__*/React.createElement("div", {
    className: "mh-partner__plate"
  }, /*#__PURE__*/React.createElement("img", {
    src: s.logo,
    alt: s.n,
    loading: "lazy"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "mh-partner__role"
  }, s.role), /*#__PURE__*/React.createElement("div", {
    className: "mh-partner__name"
  }, s.n), /*#__PURE__*/React.createElement("p", {
    className: "mh-partner__sub"
  }, s.sub))))))), /*#__PURE__*/React.createElement("section", {
    className: "mp-sec",
    style: {
      paddingTop: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-wrap"
  }, /*#__PURE__*/React.createElement(Head, {
    eyebrow: "Why partner",
    title: "What you get"
  }), /*#__PURE__*/React.createElement("div", {
    className: "mp-grid mp-g4"
  }, benefits.map(([n, t, c]) => /*#__PURE__*/React.createElement("div", {
    className: "mp-feat",
    key: n
  }, /*#__PURE__*/React.createElement("div", {
    className: "mp-feat__n"
  }, n), /*#__PURE__*/React.createElement("h3", {
    className: "m-h3"
  }, t), /*#__PURE__*/React.createElement("p", null, c)))))), h("section", { className: "mp-sec", style: { paddingTop: 0 } }, h("div", { className: "m-wrap" },
    h(Head, { eyebrow: "Getting involved", title: "How it works" }),
    h("div", { className: "mp-grid mp-g3" }, [["01", "Get in touch", "Tell us a little about your business and what you’d like from a partnership."], ["02", "We build your package", "We tailor the exposure around you, across kit, website, social, matchday and content. No fixed tiers."], ["03", "Your brand goes live", "You join the badge and reach our community every week, on and off the pitch."]].map((s, i) => h("div", { key: i, className: "mp-feat" }, h("div", { className: "mp-feat__n" }, s[0]), h("h3", { className: "m-h3" }, s[1]), h("p", null, s[2])))),
    h("div", { className: "m-glass", style: { padding: "clamp(24px,4vw,44px)", marginTop: 22, textAlign: "center" } }, h("p", { className: "m-eyebrow m-eyebrow--volt", style: { justifyContent: "center", display: "inline-flex" } }, "Become a partner"), h("h2", { className: "m-h2", style: { marginTop: 10 } }, "Put your brand behind the badge."), h("p", { className: "m-lead", style: { margin: "12px auto 0", maxWidth: "54ch" } }, "Sponsorship, kit, matchday or community partnerships. Let’s build something that works for your business and the club."), h("div", { style: { marginTop: 24, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" } }, h("button", { className: "m-btn m-btn--volt", onClick: () => go("contact") }, "Make an enquiry ", h(Arrow, null)), h("a", { className: "m-btn m-btn--ghost", href: "mailto:suesangelsfc@gmail.com" }, "Email the club"))))), /*#__PURE__*/React.createElement("section", {
    className: "mp-sec",
    style: {
      paddingTop: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-wrap"
  }, /*#__PURE__*/React.createElement(Head, {
    eyebrow: "Support the club",
    title: "Back the badge"
  }), /*#__PURE__*/React.createElement(DonateBlock, null))), detail ? /*#__PURE__*/React.createElement(Modal, {
    onClose: () => setDetail(null)
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-glass m-modal__sponsor"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 18,
      alignItems: 'center',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "plate"
  }, /*#__PURE__*/React.createElement("img", {
    src: detail.logo,
    alt: detail.n
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "m-eyebrow m-eyebrow--volt"
  }, "Official partner \xB7 since ", detail.since), /*#__PURE__*/React.createElement("h2", {
    className: "m-h2",
    style: {
      marginTop: 8,
      fontSize: '2rem'
    }
  }, detail.n), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "m-chip"
  }, detail.loc)))), /*#__PURE__*/React.createElement("div", {
    className: "m-prose",
    style: {
      marginTop: 18
    }
  }, detail.desc.map((d, i) => /*#__PURE__*/React.createElement("p", {
    key: i
  }, d))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 22,
      display: 'flex',
      gap: 12,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "m-btn m-btn--volt",
    onClick: () => {
      setDetail(null);
      go('contact');
    }
  }, "Sponsor enquiry ", /*#__PURE__*/React.createElement(Arrow, null)), detail.web ? /*#__PURE__*/React.createElement("a", { key: 'web', className: "m-btn m-btn--ghost", href: detail.web, target: "_blank", rel: "noopener" }, "Visit website") : null, detail.ig ? /*#__PURE__*/React.createElement("a", { key: 'ig', className: "m-btn m-btn--ghost", href: detail.ig, target: "_blank", rel: "noopener" }, "Instagram") : null))) : null);
}

/* ══ CONTACT ════════════════════════════════════════════════════════════ */
// Real enquiry delivery. The forms used to discard the message silently; this
// builds a prefilled email to the club so enquiries actually arrive. Swap to a
// hosted form service later by changing this one function.
// Capture the enquiry to the private `enquiries` table so the club has every
// lead (name, email, message, type) to follow up on - sponsorship, trials, etc.
// Returns a Promise<{ok}>. Only if the capture is unavailable do we fall back to
// the visitor's email app, so a lead is never lost. The page success copy adapts
// to which path was taken.
function saSendEnquiry(form, label) {
  var inp = form.querySelectorAll('input');
  var name = inp[0] ? inp[0].value.trim() : '';
  var email = inp[1] ? inp[1].value.trim() : '';
  var extra = inp[2] ? inp[2].value.trim() : '';
  var ta = form.querySelector('textarea');
  var message = ta ? ta.value.trim() : '';
  var capture = window.saAddEnquiry
    ? window.saAddEnquiry({ type: label, name: name, email: email, phone: extra, message: message, source: 'enquiry' })
    : Promise.resolve({ ok: false });
  return capture.then(function (r) {
    if (r && r.ok) return { ok: true };
    try {
      var body = ['Enquiry: ' + label, 'Name: ' + name, 'Email: ' + email];
      if (extra) body.push('Details: ' + extra);
      body.push('', message);
      window.location.href = 'mailto:suesangelsfc@gmail.com?subject=' + encodeURIComponent("Sue's Angels FC - " + label + ' enquiry') + '&body=' + encodeURIComponent(body.join('\n'));
    } catch (e) {}
    return { ok: false };
  });
}
function Contact() {
  const routes = [['general', 'General', 'Questions, hellos, anything else'], ['sponsor', 'Sponsor enquiry', 'Brand partnerships & backing the club'], ['trial', 'Player trial', 'You want a shot? Tell us about you'], ['media', 'Media volunteer', 'Photo, video, design, editorial, social']];
  const [route, setRoute] = useState('general');
  const [sent, setSent] = useState(false);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHero, {
    eyebrow: "Get in touch",
    title: /*#__PURE__*/React.createElement(React.Fragment, null, "Con", /*#__PURE__*/React.createElement("em", null, "tact")),
    sub: "Four ways to reach us. Pick one."
  }), /*#__PURE__*/React.createElement("section", {
    className: "mp-sec"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mp-split"
  }, /*#__PURE__*/React.createElement("div", null, routes.map(([k, l, s]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    className: `mp-route ${route === k ? 'is-active' : ''}`,
    onClick: () => {
      setRoute(k);
      setSent(false);
    }
  }, /*#__PURE__*/React.createElement("b", null, l), /*#__PURE__*/React.createElement("span", null, s))), /*#__PURE__*/React.createElement("div", {
    className: "m-glass",
    style: {
      padding: 18,
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("p", {
    className: "m-eyebrow",
    style: {
      marginBottom: 10
    }
  }, "Direct line"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--m-ink-2)',
      font: '600 0.9rem var(--m-sans)',
      lineHeight: 1.8
    }
  }, "suesangelsfc@gmail.com", /*#__PURE__*/React.createElement("br", null), "@suesangelsfc \xB7 Instagram"))), /*#__PURE__*/React.createElement("form", {
    className: "m-glass mp-form",
    onSubmit: e => {
      e.preventDefault();
      saSendEnquiry(e.target, routes.find(r => r[0] === route)[1]).then(function (r) { setSent(r && r.ok ? 'ok' : 'mail'); });
    }
  }, sent ? /*#__PURE__*/React.createElement("div", {
    role: "status",
    style: {
      textAlign: 'center',
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-chip m-chip--volt",
    style: {
      marginBottom: 12
    }
  }, sent === 'ok' ? "Got it" : "Almost there"), /*#__PURE__*/React.createElement("h3", {
    className: "m-h3"
  }, sent === 'ok' ? "Thanks — your enquiry's in. We'll reply within 48 hours." : "Your enquiry is ready in your email app. Press send and we'll reply within 48 hours.")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "m-eyebrow"
  }, routes.find(r => r[0] === route)[1], " enquiry"), /*#__PURE__*/React.createElement("div", {
    className: "mp-frow"
  }, /*#__PURE__*/React.createElement("label", {
    className: "mp-field"
  }, /*#__PURE__*/React.createElement("span", null, "Name"), /*#__PURE__*/React.createElement("input", {
    required: true,
    placeholder: "Your full name",
    autoComplete: "name"
  })), /*#__PURE__*/React.createElement("label", {
    className: "mp-field"
  }, /*#__PURE__*/React.createElement("span", null, "Email"), /*#__PURE__*/React.createElement("input", {
    type: "email",
    required: true,
    placeholder: "you@email.com",
    autoComplete: "email"
  }))), /*#__PURE__*/React.createElement("label", {
    className: "mp-field"
  }, /*#__PURE__*/React.createElement("span", null, "Message"), /*#__PURE__*/React.createElement("textarea", {
    rows: "5",
    required: true,
    placeholder: "Tell us everything we need to know"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 16,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 0.78rem var(--m-sans)',
      color: 'var(--m-ink-3)'
    }
  }, "We never share your details."), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "m-btn m-btn--volt"
  }, "Submit enquiry ", /*#__PURE__*/React.createElement(Arrow, null)))))))));
}

/* ══ JOIN PAGE ══════════════════════════════════════════════════════════ */
function JoinPage() {
  const routes = [['trial', 'Player trials', 'Apply for a trial with the first team. Replies typically inside 48 hours.'], ['volunteer', 'Volunteer', 'Matchday help, coaching support, logistics and more.'], ['media', 'Media team', 'Photo, video, design, editorial and social. No experience needed.'], ['sponsor', 'Sponsorship', 'Back the project and put your brand on the badge for 26/27.']];
  const [route, setRoute] = useState('trial');
  const [sent, setSent] = useState(false);
  const [open, setOpen] = useState(0);
  const faqs = [['When are trials held?', 'Summer dates for 26/27 are being confirmed. Register your interest and we’ll be in touch with times and venue.'], ['Do I need experience for the media team?', 'No. If you can shoot on a phone, edit, design or write, there’s a role for you, and we’ll help you grow.'], ['What do volunteers get?', 'A proper football family, matchday access, and a genuine role in a club going places.'], ['How do sponsorships work?', 'No fixed tiers. We tailor a package to your business across kit, signage, content and community.']];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHero, {
    eyebrow: "Get involved",
    title: /*#__PURE__*/React.createElement(React.Fragment, null, "Join the ", /*#__PURE__*/React.createElement("em", null, "club"), "."),
    sub: "Trials, volunteering, media and sponsorship. Pick a route for 26/27."
  }), /*#__PURE__*/React.createElement("section", {
    className: "mp-sec"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mp-split"
  }, /*#__PURE__*/React.createElement("div", null, routes.map(([k, l, s]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    className: `mp-route ${route === k ? 'is-active' : ''}`,
    onClick: () => {
      setRoute(k);
      setSent(false);
    }
  }, /*#__PURE__*/React.createElement("b", null, l), /*#__PURE__*/React.createElement("span", null, s)))), /*#__PURE__*/React.createElement("form", {
    className: "m-glass mp-form",
    onSubmit: e => {
      e.preventDefault();
      saSendEnquiry(e.target, routes.find(r => r[0] === route)[1]).then(function (r) { setSent(r && r.ok ? 'ok' : 'mail'); });
    }
  }, sent ? /*#__PURE__*/React.createElement("div", {
    role: "status",
    style: {
      textAlign: 'center',
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-chip m-chip--volt",
    style: {
      marginBottom: 12
    }
  }, sent === 'ok' ? "Got it" : "Almost there"), /*#__PURE__*/React.createElement("h3", {
    className: "m-h3"
  }, sent === 'ok' ? "Thanks \u2014 your enquiry\u2019s in. We\u2019ll be in touch soon." : "Your enquiry is ready in your email app. Press send and we\u2019ll reply within 48 hours.")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "m-eyebrow"
  }, routes.find(r => r[0] === route)[1]), /*#__PURE__*/React.createElement("div", {
    className: "mp-frow"
  }, /*#__PURE__*/React.createElement("label", {
    className: "mp-field"
  }, /*#__PURE__*/React.createElement("span", null, "Name"), /*#__PURE__*/React.createElement("input", {
    required: true,
    placeholder: "Your full name",
    autoComplete: "name"
  })), /*#__PURE__*/React.createElement("label", {
    className: "mp-field"
  }, /*#__PURE__*/React.createElement("span", null, "Email"), /*#__PURE__*/React.createElement("input", {
    type: "email",
    required: true,
    placeholder: "you@email.com",
    autoComplete: "email"
  }))), /*#__PURE__*/React.createElement("label", {
    className: "mp-field"
  }, /*#__PURE__*/React.createElement("span", null, route === 'trial' ? 'Position' : route === 'sponsor' ? 'Company' : 'About you'), /*#__PURE__*/React.createElement("input", {
    placeholder: route === 'trial' ? 'e.g. Striker' : route === 'sponsor' ? 'Your business' : 'How you can help'
  })), /*#__PURE__*/React.createElement("label", {
    className: "mp-field"
  }, /*#__PURE__*/React.createElement("span", null, "Message"), /*#__PURE__*/React.createElement("textarea", {
    rows: "4",
    required: true,
    placeholder: "Tell us about yourself"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "m-btn m-btn--volt"
  }, "Submit ", /*#__PURE__*/React.createElement(Arrow, null)))))))), /*#__PURE__*/React.createElement("section", {
    className: "mp-sec",
    style: {
      paddingTop: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-wrap"
  }, /*#__PURE__*/React.createElement(Head, {
    eyebrow: "Good to know",
    title: "FAQ"
  }), /*#__PURE__*/React.createElement("div", {
    className: "sa-faq"
  }, faqs.map(([q, a], i) => /*#__PURE__*/React.createElement("div", {
    className: `sa-faq__item ${open === i ? 'is-open' : ''}`,
    key: i
  }, /*#__PURE__*/React.createElement("button", {
    className: "sa-faq__q",
    "aria-expanded": open === i,
    onClick: () => setOpen(open === i ? -1 : i)
  }, /*#__PURE__*/React.createElement("span", null, q), /*#__PURE__*/React.createElement("span", {
    className: "sa-faq__ic",
    "aria-hidden": "true"
  }, open === i ? '-' : '+')), open === i ? /*#__PURE__*/React.createElement("p", {
    className: "sa-faq__a"
  }, a) : null))))));
}

/* ══ PRODUCTION SHELL ═══════════════════════════════════════════════════ */
function Sepsis({ go }) {
  const h = React.createElement;
  const scrollTo = (id) => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: RM() ? 'auto' : 'smooth', block: 'start' }); };
  // Allow deep-links like sepsis.html#give (e.g. the footer "Donate" link) to
  // land on the donate section once it has rendered.
  React.useEffect(function () {
    if ((location.hash || '').replace('#', '') === 'give') {
      var t = setTimeout(function () { scrollTo('give'); }, 90);
      return function () { clearTimeout(t); };
    }
  }, []);
  const signs = [
    ['Slurred speech or confusion', 'Sudden disorientation, drowsiness or trouble speaking clearly.'],
    ['Extreme shivering or muscle pain', 'Shaking, fever, or pain that feels far worse than usual.'],
    ['Passing no urine in a day', 'A clear drop in how often they go to the toilet.'],
    ['Severe breathlessness', 'Struggling for breath, or breathing very fast.'],
    ['“It feels like I’m going to die”', 'A deep, sudden sense that something is seriously wrong.'],
    ['Skin mottled, bluish or pale', 'Blotchy, discoloured or unusually pale skin.'],
  ];
  const help = [
    ['Know and share the signs', 'The signs above can save a life. Take a moment to learn them, and share them with the people you love.', 'Share this page', () => { try { if (navigator.share) navigator.share({ title: 'Know the signs of sepsis', url: location.href }); else if (navigator.clipboard) { navigator.clipboard.writeText(location.href); alert('Link copied. Thank you for sharing.'); } } catch (e) {} }],
    ['Support the UK Sepsis Trust', 'The UK Sepsis Trust offers support to families, funds research, and raises awareness across the country. You can find out more or give on their website.', 'Visit sepsistrust.org', 'https://www.sepsistrust.org'],
    ['Stand with the club', 'Back Sue’s Angels as a sponsor, partner or volunteer, and help us carry her message a little further.', 'Get involved', () => go('contact')],
  ];
  return h(React.Fragment, null,
    h(PageHero, {
      eyebrow: 'Our cause',
      title: h(React.Fragment, null, 'For ', h('em', null, 'Sue'), '.'),
      sub: 'Sue’s Angels FC was founded in memory of Susan Anne Martin, who we lost to sepsis. We play in her name, and we hope that by sharing what we have learned, we can help other families recognise the signs in time.',
      actions: h(React.Fragment, null,
        h('button', { className: 'm-btn m-btn--volt', onClick: () => scrollTo('signs') }, 'Know the signs ', h(Arrow, null)),
        h('button', { className: 'm-btn m-btn--ghost', onClick: () => scrollTo('give') }, 'Donate in her memory')),
    }),
    h('section', { className: 'mp-sec' }, h('div', { className: 'm-wrap' },
      h('div', { className: 'mp-grid mp-g3' }, [['2025', 'Founded in her memory'], ['48,000', 'Lives lost to sepsis in the UK each year'], ['6', 'Signs that can help save one']].map((s, i) => h('div', { key: i, className: 'm-kpi' }, h('b', null, s[0]), h('span', null, s[1])))))),
    h('section', { className: 'mp-sec', style: { paddingTop: 0 } }, h('div', { className: 'm-wrap' },
      h('div', { className: 'm-glass', style: { padding: 'clamp(24px,3vw,44px)' } },
        h('p', { className: 'm-eyebrow m-eyebrow--volt' }, 'Why we exist'),
        h('blockquote', { style: { font: '600 clamp(1.5rem,3.2vw,2.6rem)/1.16 var(--m-display)', letterSpacing: '-0.03em', margin: '16px 0 0' } }, '“What we do in life echoes in eternity.”'),
        h('div', { className: 'm-prose', style: { marginTop: 18 } },
          h('p', null, 'Everything about this club begins with one person. Sue’s Angels FC was founded in 2025 in memory of Susan Anne Martin, so that her name stays part of something good, week after week.'),
          h('p', null, 'We lost Sue to sepsis. It is a loss her family and friends carry every day, and it is the reason this club exists. We play for her, and we talk openly about sepsis so that fewer people have to go through the same thing.'))))),
    h('section', { className: 'mp-sec', style: { paddingTop: 0 } }, h('div', { className: 'm-wrap' }, h('picture', null, h('source', { type: 'image/webp', srcSet: 'assets/hero/banner-04.webp' }), h('img', { src: 'assets/hero/banner-04.jpg', alt: 'Sue’s Angels FC players together', loading: 'lazy', style: { width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', objectPosition: '50% 32%', display: 'block', borderRadius: 'var(--m-radius)' } })))),
    h('section', { className: 'mp-sec', style: { paddingTop: 0 } }, h('div', { className: 'm-wrap' },
      h(Head, { eyebrow: 'Understanding sepsis', title: 'What sepsis is' }),
      h('div', { className: 'm-prose', style: { maxWidth: '70ch' } },
        h('p', null, 'Sepsis is what can happen when the body’s response to an infection starts to harm its own tissues and organs. It can affect anyone, at any age, and it can turn serious very quickly. That is why noticing it early matters so much.'),
        h('p', null, h(React.Fragment, null, 'The ', h('a', { href: 'https://www.sepsistrust.org', target: '_blank', rel: 'noopener', style: { color: 'var(--m-volt-ink)' } }, 'UK Sepsis Trust'), ' estimates that sepsis takes around 48,000 lives in the UK every year. So many of those losses could have been prevented, and the biggest difference is spotting it early. That is why we keep talking about it.'))))),
    h('section', { id: 'signs', className: 'mp-sec', style: { paddingTop: 0 } }, h('div', { className: 'm-wrap' },
      h(Head, { eyebrow: 'Know the signs', title: 'Could it be sepsis?' }),
      h('p', { className: 'm-lead', style: { maxWidth: '62ch', marginBottom: 22 } }, 'In an adult, trust your instinct and get help quickly. Call 999 or NHS 111, and ask the question if you notice any of these:'),
      h('div', { className: 'mp-grid mp-g3' }, signs.map((s, i) => h('div', { key: i, className: 'm-glass', style: { padding: '20px 22px' } },
        h('h3', { className: 'm-h3', style: { fontSize: '1.1rem' } }, s[0]),
        h('p', { style: { marginTop: 8, color: 'var(--m-ink-2)', fontSize: '0.92rem' } }, s[1])))),
      h('div', { className: 'm-glass', style: { padding: 'clamp(20px,3vw,30px)', marginTop: 18 } },
        h('p', { className: 'm-eyebrow m-eyebrow--volt' }, 'In a child or baby'),
        h('p', { style: { marginTop: 10, font: '600 1.05rem/1.4 var(--m-sans)', color: 'var(--m-ink-1)' } }, 'Call 999 or go straight to A&E if a child:'),
        h('ul', { style: { margin: '12px 0 0', paddingLeft: 18, color: 'var(--m-ink-2)', lineHeight: 1.75 } }, ['Is breathing very fast', 'Has a fit or convulsion', 'Looks mottled, bluish or pale', 'Has a rash that doesn’t fade when you press it', 'Is very lethargic or hard to wake', 'Feels abnormally cold to touch'].map((x, i) => h('li', { key: i }, x))),
        h('p', { style: { marginTop: 12, color: 'var(--m-ink-3)', fontSize: '0.86rem' } }, 'For babies under 5, also look out for not feeding, repeated vomiting, or no wet nappy for 12 hours.')),
      h('div', { className: 'm-glass', style: { padding: 'clamp(20px,3vw,32px)', marginTop: 18, borderColor: 'var(--m-volt)' } },
        h('p', { style: { font: '600 1.1rem/1.4 var(--m-sans)' } }, 'Trust your instinct. If someone is getting worse quickly, please do not wait. Ask the question: could it be sepsis?'),
        h('p', { style: { marginTop: 10, color: 'var(--m-ink-3)', fontSize: '0.86rem' } }, h(React.Fragment, null, 'This is general guidance. For full, up to date information, please visit the ', h('a', { href: 'https://www.sepsistrust.org', target: '_blank', rel: 'noopener', style: { color: 'var(--m-volt-ink)' } }, 'UK Sepsis Trust'), ' and the ', h('a', { href: 'https://www.nhs.uk/conditions/sepsis/', target: '_blank', rel: 'noopener', style: { color: 'var(--m-volt-ink)' } }, 'NHS'), '.'))))),
    h('section', { className: 'mp-sec', style: { paddingTop: 0 } }, h('div', { className: 'm-wrap' },
      h(Head, { eyebrow: 'Get involved', title: 'Three ways to help' }),
      h('div', { className: 'mp-grid mp-g3' }, help.map((c, i) => h('div', { key: i, className: 'm-glass', style: { padding: 'clamp(22px,3vw,30px)', display: 'flex', flexDirection: 'column', gap: 12 } },
        h('h3', { className: 'm-h3' }, c[0]),
        h('p', { style: { color: 'var(--m-ink-2)', flex: 1 } }, c[1]),
        typeof c[3] === 'string'
          ? h('a', { className: 'm-btn m-btn--ghost', href: c[3], target: '_blank', rel: 'noopener', style: { alignSelf: 'flex-start' } }, c[2])
          : h('button', { className: 'm-btn m-btn--ghost', onClick: c[3], style: { alignSelf: 'flex-start' } }, c[2])))))),
    h('section', { id: 'give', className: 'mp-sec', style: { paddingTop: 0 } }, h('div', { className: 'm-wrap' },
      h(Head, { eyebrow: 'Give in her memory', title: 'Donate' }),
      h('p', { className: 'm-lead', style: { maxWidth: '60ch', marginBottom: 22 } }, 'You can support Sue’s Angels directly, or give to the UK Sepsis Trust in Sue’s memory. Every contribution helps us keep her name on the pitch and her message in the open.'),
      h(DonateBlock, null))),
    h('section', { id: 'stay', className: 'mp-sec', style: { paddingTop: 0 } }, h('div', { className: 'm-wrap' },
      h(Head, { eyebrow: 'Stay close to the club', title: 'Get match updates' }),
      h('p', { className: 'm-lead', style: { maxWidth: '58ch', marginBottom: 22 } }, 'Join the supporters’ list for the occasional update — fixtures, results and news from Sue’s Angels. We keep it rare, and your email stays private.'),
      h('div', { style: { maxWidth: 640 } }, h(SupporterSignup, { source: 'cause' })))),
    h('section', { className: 'mp-sec', style: { paddingTop: 0 } }, h('div', { className: 'm-wrap' },
      h('div', { className: 'm-glass', style: { padding: 'clamp(28px,4vw,52px)', textAlign: 'center' } },
        h('p', { className: 'm-eyebrow m-eyebrow--volt', style: { justifyContent: 'center', display: 'inline-flex' } }, 'In her name'),
        h('h2', { className: 'm-h2', style: { marginTop: 12 } }, 'We play for something bigger.'),
        h('p', { className: 'm-lead', style: { margin: '14px auto 0', maxWidth: '56ch' } }, 'In memory of Susan Anne Martin. Every match, and every season, carries her name and her story a little further.'),
        h('div', { style: { marginTop: 26, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' } },
          h('button', { className: 'm-btn m-btn--volt', onClick: () => go('sponsors') }, 'Partner with the club ', h(Arrow, null)),
          h('button', { className: 'm-btn m-btn--ghost', onClick: () => go('contact') }, 'Get in touch'))))));
}
const HREF = {
  home: 'index.html',
  about: 'about.html',
  sepsis: 'sepsis.html',
  donate: 'sepsis.html#give',
  champions: 'champions.html',
  team: 'teams.html',
  squad: 'squad.html',
  stats: 'stats.html',
  coaches: 'coaches.html',
  schedule: 'schedule.html',
  league: 'league.html',
  media: 'media.html',
  live: 'live.html',
  news: 'news.html',
  gallery: 'gallery.html',
  videos: 'videos.html',
  sponsors: 'sponsors.html',
  contact: 'contact.html',
  join: 'join.html',
  records: 'records.html',
  awards: 'awards.html'
};
/* ══ RECORDS ════════════════════════════════════════════════════════════════ */
function Records({ go }) {
  const h = React.createElement;
  const [, force] = useState(0);
  const [filter, setFilter] = useState('all');
  const [season, setSeason] = useState('all');
  useEffect(() => {
    const on = () => force((x) => x + 1);
    window.addEventListener('sa-recognition-changed', on);
    window.addEventListener('sa-match-changed', on);
    return () => { window.removeEventListener('sa-recognition-changed', on); window.removeEventListener('sa-match-changed', on); };
  }, []);
  const records = window.getClubRecords ? window.getClubRecords(season) : [];
  const lead = window.getSeasonLeadership ? window.getSeasonLeadership(window.CURRENT_SEASON) : null;
  const playedSeasons = Array.from(new Set((window.getDerivedResults ? window.getDerivedResults() : []).map((r) => window.seasonOf ? window.seasonOf(r) : (window.CURRENT_SEASON || '25/26'))));
  const seasonTabs = ['all'].concat((window.ALL_SEASONS || []).filter((s) => playedSeasons.indexOf(s) > -1));
  const ORDER = ['first_club_captain', 'most_apps', 'most_goals', 'most_assists', 'most_clean_sheets', 'most_motm', 'most_potm', 'most_season_awards', 'biggest_win', 'win_streak', 'unbeaten_run', 'total_goals', 'first_goal', 'first_clean_sheet', 'first_win'];
  const oi = (r) => { const i = ORDER.indexOf(r.recordKey); return i < 0 ? 99 : i; };
  const sorted = records.slice().sort((a, b) => oi(a) - oi(b));
  const FILTERS = [['all', 'All records'], ['player', 'Player'], ['team', 'Team']];
  const counts = { all: sorted.length, player: sorted.filter((r) => r.group !== 'team').length, team: sorted.filter((r) => r.group === 'team').length };
  const shown = filter === 'all' ? sorted : sorted.filter((r) => filter === 'team' ? r.group === 'team' : r.group !== 'team');
  const trophies = window.getTrophies ? window.getTrophies() : [];
  const RECICON = { first_club_captain: 'medal', most_apps: 'people', most_goals: 'ball', most_assists: 'pass', most_clean_sheets: 'shield', most_motm: 'star', most_potm: 'star', most_season_awards: 'trophy', biggest_win: 'trophy', most_goals_match: 'ball', win_streak: 'pulse', unbeaten_run: 'shield', clean_sheet_streak: 'shield', scoring_streak: 'ball', total_goals: 'ball', total_clean_sheets: 'shield' };
  const card = (r, i) => {
    const numeric = /^\d+$/.test(String(r.value));
    const inner = [
      h('span', { className: 'rec-card__ic', key: 'ic' }, I[r.icon || RECICON[r.recordKey] || 'chart']),
      h('div', { className: 'rec-card__val', key: 'v' }, numeric ? h(CountNum, { value: parseInt(r.value, 10) }) : r.value),
      h('div', { className: 'rec-card__t', key: 't' }, r.title),
      r.playerName ? h('div', { className: 'rec-card__who', key: 'w' }, r.playerName) : (r.group === 'team' ? h('div', { className: 'rec-card__who', key: 'w' }, "Sue's Angels FC") : null),
      r.description ? h('p', { className: 'rec-card__desc', key: 'd' }, r.description) : null,
      r.scope ? h('div', { className: 'rec-card__scope', key: 'sc' }, r.scope) : null,
    ];
    const props = { key: r.id, className: 'rec-card rec-card--in m-glass' + (r.playerId ? ' mp-clickable' : ''), style: { animationDelay: (i * 0.05) + 's' } };
    if (r.playerId) props.onClick = () => { window.location.href = 'teams.html?player=' + r.playerId; };
    return h(r.playerId ? 'button' : 'div', props, inner);
  };
  const trophyCard = (t, i) => h('div', { key: t.id, className: 'rec-trophy m-glass rec-card--in', style: { animationDelay: (i * 0.08) + 's' } },
    h('span', { className: 'rec-trophy__ic' }, I[t.icon || 'trophy']),
    h('div', { className: 'rec-trophy__body' },
      h('div', { className: 'rec-trophy__season' }, t.season || ''),
      h('h3', { className: 'rec-trophy__title' }, t.title),
      t.description ? h('p', { className: 'rec-trophy__desc' }, t.description) : null));
  return h(React.Fragment, null,
    h(PageHero, { eyebrow: 'Club archive', title: h(React.Fragment, null, 'Club ', h('em', null, 'records'), '.'), sub: 'The honours, numbers, names and firsts that make up Sue’s Angels FC history. Updated live from match data.' }),
    trophies.length ? h('section', { className: 'mp-sec' }, h('div', { className: 'm-wrap' },
      h(Head, { eyebrow: 'Honours', title: 'Trophies won' }),
      h('div', { className: 'rec-trophies' }, trophies.map(trophyCard)))) : null,
    h('section', { className: 'mp-sec', style: trophies.length ? { paddingTop: 0 } : null }, h('div', { className: 'm-wrap' },
      h(Head, { eyebrow: 'Proudly held by', title: 'Club records' }),
      seasonTabs.length > 1 ? h('div', { className: 'aw-tabs rec-seasons' }, seasonTabs.map((s) => h('button', { key: s, className: 'aw-tab' + (season === s ? ' is-active' : ''), onClick: () => setSeason(s) }, h('span', { className: 'aw-tab__m' }, s === 'all' ? 'All time' : s)))) : null,
      h('div', { className: 'rec-filter' }, FILTERS.filter((ff) => counts[ff[0]]).map((ff) => h('button', { key: ff[0], className: 'rec-filter__btn' + (filter === ff[0] ? ' is-active' : ''), onClick: () => setFilter(ff[0]) }, ff[1], h('span', { className: 'rec-filter__n' }, counts[ff[0]])))),
      h('div', { className: 'rec-grid', key: filter + season }, shown.map(card)))),
    lead ? h('section', { className: 'mp-sec', style: { paddingTop: 0 } }, h('div', { className: 'm-wrap' },
      h(Head, { eyebrow: lead.season + ' season', title: 'Leadership group' }),
      h('div', { className: 'm-glass rec-lead' },
        h('p', { className: 'rec-lead__note' }, lead.note),
        h('div', { className: 'rec-lead__grid' }, [['Club captain', lead.clubCaptainName, lead.clubCaptainPlayerId, true], ['Vice-captain', lead.viceCaptainName, lead.viceCaptainPlayerId, false], ['Third-choice captain', lead.thirdChoiceCaptainName, lead.thirdChoiceCaptainPlayerId, false]].filter((x) => x[1]).map((x, i) =>
          h('div', { key: i, className: 'rec-lead__role' + (x[3] ? ' is-captain' : '') },
            h('span', { className: 'rec-lead__label' }, x[0]),
            x[2] ? h('button', { className: 'rec-lead__name mp-clickable', onClick: () => { window.location.href = 'teams.html?player=' + x[2]; } }, x[1]) : h('span', { className: 'rec-lead__name' }, x[1]))))))) : null);
}

/* ══ AWARDS ═════════════════════════════════════════════════════════════════ */
function Awards({ go }) {
  const h = React.createElement;
  const [, force] = useState(0);
  const [selId, setSelId] = useState(null);
  const [season, setSeason] = useState(window.CURRENT_SEASON || '25/26');
  useEffect(() => {
    const on = () => force((x) => x + 1);
    window.addEventListener('sa-recognition-changed', on);
    window.addEventListener('sa-photo-changed', on);
    return () => { window.removeEventListener('sa-recognition-changed', on); window.removeEventListener('sa-photo-changed', on); };
  }, []);
  const MON_ORDER = ['aug', 'sep', 'oct', 'nov', 'dec', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul'];
  const monIdx = (m) => MON_ORDER.indexOf(String(m || '').slice(0, 3).toLowerCase());
  const monKey = (p) => { const yrs = String(p.season || '').split('/'); const idx = monIdx(p.month); const fh = idx >= 0 && idx <= 4; return ((fh ? yrs[0] : yrs[1]) || '') + ('0' + (idx + 1)).slice(-2); };
  // Manual admin "order" wins; entries without one fall back to month order. The
  // 'A'/'B' prefixes keep manually-ordered POTMs ahead of unordered ones.
  const orderKey = (p) => { const o = parseInt(p.order, 10); return (o > 0) ? ('A' + ('00000' + o).slice(-6)) : ('B' + monKey(p)); };
  const potmAll = (window.getRecognition ? window.getRecognition('potm') : []);
  const potm = potmAll.filter((p) => p.season === season).slice().sort((a, b) => String(orderKey(b)).localeCompare(String(orderKey(a))));
  const playedSeasons = Array.from(new Set((window.getDerivedResults ? window.getDerivedResults() : []).map((r) => window.seasonOf ? window.seasonOf(r) : (window.CURRENT_SEASON || '25/26'))));
  const recSeasons = Array.from(new Set([].concat(potmAll, (window.getRecognition ? window.getRecognition('season_award') : [])).map((r) => r.season).filter(Boolean)));
  let seasonTabs = (window.ALL_SEASONS || []).filter((s) => s === season || playedSeasons.indexOf(s) > -1 || recSeasons.indexOf(s) > -1);
  if (!seasonTabs.length) seasonTabs = [season];
  const latest = potm[0];
  const tabsChrono = potm.slice().sort((a, b) => String(orderKey(a)).localeCompare(String(orderKey(b))));
  const activeId = (selId && potm.some((p) => p.id === selId)) ? selId : (potm[0] ? potm[0].id : null);
  const sel = potm.find((p) => p.id === activeId) || potm[0];
  const seasonAwards = (window.getRecognition ? window.getRecognition('season_award') : []).filter((a) => a.season === season);
  const photoFor = (r) => r.imageUrl || (r.playerId && window.getPlayerPhoto ? window.getPlayerPhoto(r.playerId) : null) || null;
  const nameFor = (r) => r.playerName || (r.playerId && window.playerNameByNum ? window.playerNameByNum(r.playerId) : '') || '';
  const media = (ph, cls) => h('div', { className: cls + (ph ? '' : ' aw-media--default') }, ph ? h('img', { src: ph, alt: '' }) : h('img', { className: 'aw-badge', src: 'assets/badge/sue-angels-shield.webp', alt: '' }));
  const chips = (r) => {
    const ms = (window.monthlyPlayerStats && r.playerId && r.month) ? window.monthlyPlayerStats(r.playerId, r.month, r.season) : {};
    const v = (manual, auto) => (r[manual] != null && r[manual] !== '') ? r[manual] : (ms[auto] || 0);
    const apps = v('statApps', 'apps'), goals = v('statGoals', 'goals'), assists = v('statAssists', 'assists'), cs = v('statCleanSheets', 'cleanSheets'), motm = v('statMotm', 'motm');
    const s = [];
    if (apps) s.push([apps, 'Apps']); if (goals) s.push([goals, 'Goals']); if (assists) s.push([assists, 'Assists']); if (cs) s.push([cs, 'Clean sheets']); if (motm) s.push([motm, 'MOTM']);
    return s;
  };
  const motmList = window.getMotmList ? window.getMotmList(season) : [];
  const heroCard = (r) => h('div', { className: 'aw-potm m-glass', key: r.id },
    h('div', { className: 'aw-potm__mediawrap' }, media(photoFor(r), 'aw-potm__media'), h('span', { className: 'aw-potm__ribbon' }, I.trophy, h('span', null, 'Player of the Month'))),
    h('div', { className: 'aw-potm__body' },
      h('p', { className: 'm-eyebrow m-eyebrow--volt' }, (r.month || '') + ' · ' + (r.season || season)),
      h('h3', { className: 'aw-potm__name' }, nameFor(r)),
      r.position ? h('div', { className: 'aw-potm__pos' }, r.position) : null,
      r.reason ? h('p', { className: 'aw-potm__reason' }, r.reason) : null,
      chips(r).length ? h('div', { className: 'aw-potm__stats' }, chips(r).map((s, i) => h('div', { key: i, className: 'aw-stat' }, h('b', null, h(CountNum, { value: s[0] })), h('span', null, s[1])))) : null,
      r.quote ? h('blockquote', { className: 'aw-quote' }, '“' + r.quote + '”') : null,
      h('div', { className: 'aw-potm__actions' },
        r.playerId ? h('button', { className: 'm-btn m-btn--ghost', onClick: () => { window.location.href = 'teams.html?player=' + r.playerId; } }, 'View profile') : null,
        h(ShareBtn, { what: 'potm', label: 'Share', url: 'awards.html', story: function () { return { title: nameFor(r), subtitle: 'Player of the Month · ' + (r.month || ''), eyebrow: (r.season || season) + ' · Player of the Month', photo: photoFor(r), face: !!photoFor(r), footer: 'suesangelsfc.co.uk' }; } }))));
  const awardCard = (a) => h(a.playerId ? 'button' : 'div', { key: a.id, className: 'aw-card m-glass' + (a.playerId ? ' mp-clickable' : ''), onClick: a.playerId ? () => { window.location.href = 'teams.html?player=' + a.playerId; } : undefined },
    media(photoFor(a), 'aw-card__media'),
    h('div', { className: 'aw-card__body' },
      h('p', { className: 'm-eyebrow m-eyebrow--volt' }, a.title),
      h('h3', { className: 'aw-card__winner' }, nameFor(a) || a.value || ''),
      a.description ? h('p', { className: 'aw-card__desc' }, a.description) : null,
      a.quote ? h('blockquote', { className: 'aw-quote' }, '“' + a.quote + '”') : null));
  const empty = (t, s) => h('div', { className: 'm-glass aw-empty' }, h('p', { className: 'aw-empty__t' }, t), h('p', { className: 'aw-empty__s' }, s));
  return h(React.Fragment, null,
    h(PageHero, { eyebrow: 'Recognition', title: h(React.Fragment, null, 'Awards & ', h('em', null, 'honours'), '.'), sub: 'Celebrating the players who made the difference, month by month and across the season.' }),
    h('section', { className: 'mp-sec' }, h('div', { className: 'm-wrap' },
      seasonTabs.length ? h('div', { className: 'aw-tabs rec-seasons', style: { marginBottom: 18 } }, seasonTabs.map((s) => h('button', { key: s, type: 'button', className: 'aw-tab' + (season === s ? ' is-active' : ''), onClick: () => { setSeason(s); setSelId(null); } }, h('span', { className: 'aw-tab__m' }, s)))) : null,
      h(Head, { eyebrow: 'Monthly recognition', title: 'Player of the Month' }),
      latest ? h(React.Fragment, null,
        tabsChrono.length > 1 ? h('div', { className: 'aw-tabs' }, tabsChrono.map((t) => h('button', { key: t.id, className: 'aw-tab' + (t.id === activeId ? ' is-active' : ''), onClick: () => setSelId(t.id) }, h('span', { className: 'aw-tab__m' }, t.month), h('span', { className: 'aw-tab__y' }, t.season)))) : null,
        heroCard(sel)) : empty('Player of the Month coming soon', 'Our first monthly winner will be revealed here.'))),
    motmList.length ? h('section', { className: 'mp-sec', style: { paddingTop: 0 } }, h('div', { className: 'm-wrap' },
      h(Head, { eyebrow: 'Every match', title: 'Man of the Match' }),
      h('div', { className: 'aw-motm', style: { maxHeight: 288, overflowY: 'auto', paddingRight: 6, scrollbarWidth: 'thin' } }, motmList.map((m, i) => h(m.playerId ? 'button' : 'div', { key: i, className: 'aw-motm__row' + (m.playerId ? ' mp-clickable' : ''), onClick: m.playerId ? () => { window.location.href = 'teams.html?player=' + m.playerId; } : undefined },
        h('span', { className: 'aw-motm__match' }, m.opp, ' ', h('b', null, m.score)),
        h('span', { className: 'aw-motm__date' }, m.date),
        h('span', { className: 'aw-motm__winner' }, m.playerName)))))) : null,
    h('section', { className: 'mp-sec', style: { paddingTop: 0 } }, h('div', { className: 'm-wrap' },
      h(Head, { eyebrow: season + ' awards night', title: 'End of Season Awards' }),
      seasonAwards.length ? h('div', { className: 'aw-deck' }, seasonAwards.map(awardCard)) : empty('Awards will be announced after 19 June', 'Our end-of-season honours will appear here after the awards night.'))));
}

const NAV = [['home', 'Home'], ['about', 'About'], ['sepsis', 'Our Cause'], ['champions', 'Champions'], ['team', 'Team'], ['schedule', 'Matches'], ['league', 'League'], ['media', 'Media'], ['sponsors', 'Sponsors'], ['contact', 'Contact']];
// Grouped navigation with dropdowns. Items without `items` are direct links.
const NAV_GROUPS = [
  { k: 'home', l: 'Home' },
  { l: 'The Club', items: [['about', 'Our Story'], ['sepsis', 'Our Cause'], ['champions', 'Champions'], ['awards', 'Awards'], ['sponsors', 'Sponsors']] },
  { l: 'On the Pitch', items: [['squad', 'Squad'], ['stats', 'Player Stats'], ['coaches', 'Coaches'], ['schedule', 'Matches'], ['league', 'League'], ['records', 'Records']] },
  { l: 'Media', items: [['live', 'Live'], ['news', 'News'], ['gallery', 'Gallery'], ['videos', 'Videos']] },
  { l: 'Get Involved', items: [['join', 'Join the Club'], ['contact', 'Contact']] }
];
function Live(props){var h=React.createElement;var chan=(window.SA_YT_CHANNEL_ID||"").trim();var handle=(window.SA_YT_HANDLE||"suesangelsfc").replace(/^@/,"");var ytUrl="https://www.youtube.com/@"+handle;return h(React.Fragment,null,h(PageHero,{eyebrow:"Watch",title:h(React.Fragment,null,"Live ",h("em",null,"matches")),sub:"Match streams and replays, straight from our YouTube channel."}),h("section",{className:"mh-sec",style:{paddingTop:0}},h("div",{className:"m-wrap"},chan?h("div",{className:"m-glass sa-live__player"},h("iframe",{src:"https://www.youtube-nocookie.com/embed/live_stream?channel="+chan,title:"Sue's Angels FC live stream",allow:"autoplay; encrypted-media; picture-in-picture; web-share",allowFullScreen:true,loading:"lazy"})):h("div",{className:"m-glass sa-live__soon"},h("p",{className:"m-eyebrow m-eyebrow--volt"},"Coming soon"),h("h3",{className:"m-h3"},"Live match streams are on the way"),h("p",{className:"m-lead",style:{marginTop:10,maxWidth:"54ch"}},"We are setting up live streaming on our YouTube channel. Subscribe to be notified the moment we kick off, and to watch every replay back."),h("a",{className:"m-btn m-btn--volt",href:ytUrl,target:"_blank",rel:"noopener",style:{marginTop:20}},"Subscribe on YouTube ",h(Arrow))),h("p",{className:"sa-live__note"},"The match plays here live, then turns into the full replay at full time. ",h("a",{href:ytUrl,target:"_blank",rel:"noopener"},"Open our channel →")))));}
const PAGES = {
  home: Home,
  about: About,
  sepsis: Sepsis,
  champions: Champions,
  team: Team,
  squad: Team,
  stats: Team,
  coaches: Team,
  schedule: Schedule,
  league: League,
  media: Media,
  live: Live,
  news: Media,
  gallery: Media,
  videos: Media,
  sponsors: Sponsors,
  contact: Contact,
  join: JoinPage,
  records: Records,
  awards: Awards
};
function currentPage() {
  const f = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const map = {
    '': 'home',
    'index.html': 'home',
    'about.html': 'about',
    'sepsis.html': 'sepsis',
    'our-cause.html': 'sepsis',
    'champions.html': 'champions',
    'teams.html': 'team',
    'team.html': 'team',
    'squad.html': 'squad',
    'stats.html': 'stats',
    'coaches.html': 'coaches',
    'schedule.html': 'schedule',
    'fixtures.html': 'schedule',
    'results.html': 'schedule',
    'table.html': 'league',
    'league.html': 'league',
    'media.html': 'media',
    'live.html': 'live',
    'news.html': 'news',
    'gallery.html': 'gallery',
    'videos.html': 'videos',
    'sponsors.html': 'sponsors',
    'contact.html': 'contact',
    'join.html': 'join',
    'records.html': 'records',
    'awards.html': 'awards'
  };
  return map[f] || map[f + '.html'] || 'home';
}
function SiteHeader({
  page
}) {
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'dark');
  const [open, setOpen] = useState(false);
  const apply = (t) => {
    setTheme(t);
    document.documentElement.setAttribute('data-theme', t);
    try {
      localStorage.setItem('sa-theme', t);
    } catch (e) {}
  };
  const flip = () => apply(theme === 'dark' ? 'light' : 'dark');
  useEffect(() => {
    if (!open) return;
    const onKey = e => {
      if (e.key === 'Escape') {
        setOpen(false);
        const b = document.querySelector('.sa-burger');
        if (b) b.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("a", {
    className: "sa-skip",
    href: "#main"
  }, "Skip to content"), /*#__PURE__*/React.createElement("header", {
    className: "sa-header"
  }, /*#__PURE__*/React.createElement("a", {
    className: "sa-brand",
    href: "index.html"
  }, /*#__PURE__*/React.createElement("img", {
    src: "assets/badge/sue-angels-badge.webp",
    alt: ""
  }), "Sue's Angels"), /*#__PURE__*/React.createElement("nav", {
    id: "sa-primary-nav",
    "aria-label": "Primary",
    className: `sa-nav ${open ? 'is-open' : ''}`
  }, NAV_GROUPS.map(g => g.items ? /*#__PURE__*/React.createElement("div", {
    key: g.l,
    className: "sa-nav__group" + (g.items.some(it => it[0] === page) ? " is-active" : "")
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "sa-nav__top",
    "aria-haspopup": "true"
  }, g.l, /*#__PURE__*/React.createElement("span", {
    className: "sa-nav__caret",
    "aria-hidden": "true"
  }, "▾")), /*#__PURE__*/React.createElement("div", {
    className: "sa-nav__menu"
  }, g.items.map(it => /*#__PURE__*/React.createElement("a", {
    key: it[0],
    href: HREF[it[0]],
    className: page === it[0] ? 'is-active' : '',
    onClick: () => setOpen(false)
  }, it[1])))) : /*#__PURE__*/React.createElement("a", {
    key: g.k,
    href: HREF[g.k],
    className: page === g.k ? 'is-active' : '',
    onClick: () => setOpen(false)
  }, g.l))), /*#__PURE__*/React.createElement("div", {
    className: "sa-act"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sa-themebar",
    role: "group",
    "aria-label": "Theme"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sa-themebar__thumb",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "sa-themebar__seg" + (theme === 'light' ? ' is-on' : ''),
    onClick: () => apply('light'),
    "aria-label": "Light mode",
    "aria-pressed": theme === 'light'
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24", width: 17, height: 17, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("circle", { cx: 12, cy: 12, r: 4 }), /*#__PURE__*/React.createElement("path", { d: "M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" }))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "sa-themebar__seg" + (theme === 'dark' ? ' is-on' : ''),
    onClick: () => apply('dark'),
    "aria-label": "Dark mode",
    "aria-pressed": theme === 'dark'
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24", width: 17, height: 17, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", { d: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" })))), /*#__PURE__*/React.createElement("a", {
    className: "m-btn m-btn--volt sa-joincta",
    href: "join.html",
    style: {
      padding: '11px 18px'
    }
  }, "Join ", /*#__PURE__*/React.createElement(Arrow, null)), /*#__PURE__*/React.createElement("button", {
    className: "sa-burger",
    "aria-label": "Menu",
    "aria-expanded": open,
    "aria-controls": "sa-primary-nav",
    onClick: () => setOpen(!open)
  }, open ? '✕' : '☰'))));
}
function SiteFooter() {
  var h = React.createElement;
  var groups = [
    ['The Club', [['about', 'Our Story'], ['sepsis', 'Our Cause'], ['champions', 'Champions'], ['sponsors', 'Sponsors']]],
    ['On the Pitch', [['squad', 'Squad'], ['stats', 'Player Stats'], ['coaches', 'Coaches'], ['schedule', 'Matches'], ['league', 'League']]],
    ['Media', [['live', 'Live'], ['news', 'News'], ['gallery', 'Gallery'], ['videos', 'Videos']]],
    ['Get involved', [['join', 'Join'], ['donate', 'Donate'], ['contact', 'Contact']]]
  ];
  var supporting = [['teams.html', 'Full squad page'], ['table.html', 'League table'], ['fixtures.html', 'Fixtures'], ['results.html', 'Results'], ['media.html', 'Media hub']];
  var social = [['Instagram', 'https://instagram.com/suesangelsfc'], ['TikTok', 'https://tiktok.com/@suesangelsfc']];
  var linkStyle = { color: 'var(--m-ink-3)', font: '600 0.82rem var(--m-sans)', textDecoration: 'none', display: 'block', padding: '5px 0' };
  return h("footer", { className: "mh-footer" }, h("div", { className: "m-wrap" },
    h("div", { className: "mh-footer__row", style: { alignItems: 'flex-start' } },
      h("div", null,
        h("a", { className: "mh-footer__brand", href: "index.html", style: { textDecoration: 'none', color: 'inherit' } }, h("img", { src: "assets/badge/sue-angels-badge.webp", alt: "" }), "Sue's Angels FC"),
        h("p", { style: { color: 'var(--m-ink-3)', fontSize: '0.76rem', marginTop: 12, maxWidth: '36ch', lineHeight: 1.6 } }, "South-west London Sunday league, in memory of Susan Anne Martin. League Ten champions for sepsis awareness.")),
      h("div", { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } }, social.map(function (s) {
        var ic = s[0] === 'Instagram'
          ? h('svg', { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' }, h('rect', { x: 2, y: 2, width: 20, height: 20, rx: 5, ry: 5 }), h('path', { d: 'M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z' }), h('line', { x1: 17.5, y1: 6.5, x2: 17.51, y2: 6.5 }))
          : h('svg', { width: 21, height: 21, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': 'true' }, h('path', { d: 'M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z' }));
        return h("a", { key: s[0], href: s[1], target: "_blank", rel: "noopener", className: "m-btn m-btn--ghost", 'aria-label': 'Follow on ' + s[0], title: s[0], style: { padding: 0, width: 46, height: 46, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } }, ic);
      }))),
    h("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 24, marginTop: 32 } },
      groups.map(function (g) {
        return h("div", { key: g[0] },
          h("div", { style: { font: '700 0.68rem var(--m-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--m-ink-2)', marginBottom: 8 } }, g[0]),
          g[1].map(function (it) { return h("a", { key: it[0], href: HREF[it[0]], style: linkStyle }, it[1]); }));
      })),
    h("div", { style: { marginTop: 30, paddingTop: 24, borderTop: '1px solid var(--m-edge)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 270px), 1fr))', gap: 22, alignItems: 'start' } },
      h("div", null,
        h("div", { style: { font: '700 0.68rem var(--m-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--m-ink-2)', marginBottom: 8 } }, "Stay in touch"),
        h("p", { style: { color: 'var(--m-ink-3)', fontSize: '0.76rem', maxWidth: '34ch', lineHeight: 1.6, margin: 0 } }, "Occasional fixtures, results and news. Your email stays private.")),
      h(SupporterSignup, { compact: true, source: 'footer' })),
    h("div", { style: { marginTop: 26, paddingTop: 18, borderTop: '1px solid var(--m-edge)', display: 'flex', flexWrap: 'wrap', gap: '6px 18px', alignItems: 'center' } },
      h("span", { style: { font: '700 0.64rem var(--m-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--m-ink-3)' } }, "Also"),
      supporting.map(function (it) { return h("a", { key: it[0], href: it[0], style: { color: 'var(--m-ink-3)', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none' } }, it[1]); })),
    h("div", { className: "sa-vh" }, h("small", null, "Sunday-league football at The Reeves, Hanworth \xB7 serving Kingston, Sunbury, Staines and south-west London \xB7 founded 2025 in memory of Susan Anne Martin \xB7 League Ten champions 25/26 \xB7 supporting sepsis awareness"))));
}
function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > 360);
    on();
    window.addEventListener('scroll', on, {
      passive: true
    });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return /*#__PURE__*/React.createElement("button", {
    className: `sa-totop ${show ? 'is-vis' : ''}`,
    "aria-label": "Back to top",
    onClick: () => window.scrollTo({
      top: 0,
      behavior: RM() ? 'auto' : 'smooth'
    })
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "m6 15 6-6 6 6"
  })));
}
function Site() {
  useEffect(() => {
    document.body.classList.add('m-body');
    window.scrollTo(0, 0);
    // Analytics (Google Analytics + Meta Pixel) load ONLY after the visitor
    // accepts cookies. consent.js owns the banner + the actual loading; this
    // call is a no-op until consent has been granted.
    if (window.saInitAnalytics) window.saInitAnalytics();
  }, []);
  const page = currentPage();
  const PageComp = PAGES[page] || Home;
  const go = k => {
    if (HREF[k]) location.href = HREF[k];
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(SiteHeader, {
    page: page
  }), /*#__PURE__*/React.createElement("main", {
    id: "main"
  }, /*#__PURE__*/React.createElement(PageComp, {
    go: go
  })), /*#__PURE__*/React.createElement(SiteFooter, null), /*#__PURE__*/React.createElement(BackToTop, null));
}
function SquadBoard(props) {
  var h = React.createElement;
  var groups = props.groups || [];
  var onOpen = props.onOpen;
  var hideStats = props.hideStats;
  var ref = useState(groups.length ? groups[0][0] : '');
  var active = ref[0], setActive = ref[1];
  var current = null;
  for (var i = 0; i < groups.length; i++) { if (groups[i][0] === active) { current = groups[i]; break; } }
  if (!current) current = groups[0] || ['', []];
  var list = current[1] || [];

  function flip(e) { e.preventDefault(); e.stopPropagation(); var c = e.currentTarget.closest('.mp-player'); if (c) c.classList.toggle('is-flipped'); }

  function card(p) {
    var ph = window.getPlayerPhoto ? window.getPlayerPhoto(p.num) : null;
    var ga = (p.goals || 0) + (p.assists || 0);
    var pos = p.gk ? 'GK' : (p.mostPlayedPosition || 'SQUAD');
    var frontStats = p.gk
      ? [[p.apps, 'Apps'], [p.cleanSheets, 'CS'], [p.motm, 'MOTM']]
      : [[p.apps, 'Apps'], [p.goals, 'Goals'], [p.assists, 'Assists']];
    var backStats = p.gk
      ? [[p.apps, 'Apps'], [p.cleanSheets, 'Clean sheets'], [p.started != null ? p.started : p.apps, 'Starts'], [p.motm, 'MOTM']]
      : [[p.goals, 'Goals'], [p.assists, 'Assists'], [ga, 'G+A'], [p.apps, 'Apps'], [p.started != null ? p.started : p.apps, 'Starts'], [p.motm, 'MOTM']];
    return h('div', { className: 'mp-player mp-player--flip', key: p.num, 'data-num': p.num },
      h('div', { className: 'mp-player__inner' },
        h('button', { className: 'mp-player__face mp-player__front mp-clickable', onClick: function () { onOpen && onOpen(p.num); } },
          h('div', { className: 'mp-player__img ' + (ph ? '' : 'mp-player__img--ghost') },
            ph ? h('img', { src: ph, alt: p.first + ' ' + p.last }) : h('img', { src: 'assets/badge/sue-angels-shield.webp', alt: '' })),
          h('div', { className: 'mp-player__scrim' }),
          h('span', { className: 'm-chip m-chip--volt mp-player__pos' }, pos),
          h('div', { className: 'mp-player__body' },
            h('div', { className: 'mp-player__name' }, p.last, h('span', null, p.first)),
            h('div', { className: 'mp-player__stats' }, frontStats.map(function (s, k) { return h('div', { key: k }, h('b', null, hideStats ? '\u2013' : h(CountNum, { value: s[0] })), h('span', null, s[1])); })))),
        h('div', { className: 'mp-player__face mp-player__back' },
          h('div', { className: 'mp-pb__head' },
            h('div', { className: 'mp-pb__id' }, h('b', null, p.first + ' ' + p.last), h('span', null, p.gk ? 'Goalkeeper' : pos))),
          h('div', { className: 'mp-pb__grid' }, backStats.map(function (s, k) { return h('div', { className: 'mp-pb__stat', key: k }, h('b', null, hideStats ? '\u2013' : h(CountNum, { value: s[0] != null ? s[0] : 0 })), h('span', null, s[1])); })),
          h('button', { className: 'm-btn m-btn--volt mp-pb__cta', onClick: function () { onOpen && onOpen(p.num); } }, 'Full profile'))),
      h('button', { className: 'mp-player__flipbtn', onClick: flip, type: 'button', 'aria-label': 'Flip card for stats', title: 'Flip for stats' },
        h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
          h('path', { d: 'M3 12a9 9 0 0 1 15-6.7L21 8' }), h('path', { d: 'M21 3v5h-5' }), h('path', { d: 'M21 12a9 9 0 0 1-15 6.7L3 16' }), h('path', { d: 'M3 21v-5h5' }))));
  }

  return h('div', { className: 'mp-squadboard' },
    h('div', { className: 'mp-posselect' }, groups.map(function (g) {
      return h('button', { key: g[0], type: 'button', className: 'mp-posselect__btn ' + (g[0] === active ? 'is-active' : ''), onClick: function () { setActive(g[0]); } },
        h('span', { className: 'mp-posselect__lbl' }, g[0]), h('i', { className: 'mp-posselect__n' }, g[1].length));
    })),
    h('div', { className: 'mp-slider' }, list.map(card)));
}
function SparkChart(props) {
  var h = React.createElement;
  var log = props.log || [], isGK = props.isGK;
  var n = log.length;
  var cg = 0, ca = 0, cc = 0, G = [], A = [], GA = [], CS = [];
  log.forEach(function (m) { cg += m.g || 0; ca += m.a || 0; if (m.csPart) cc++; G.push(cg); A.push(ca); GA.push(cg + ca); CS.push(cc); });
  var lines = isGK
    ? [{ k: 'Clean sheets', d: CS, c: 'var(--m-volt)', glow: true }]
    : [{ k: 'G + A', d: GA, c: 'var(--m-volt)', glow: true }, { k: 'Goals', d: G, c: 'var(--m-ink-1)' }, { k: 'Assists', d: A, c: '#22D3EE' }];
  if (!isGK && cc > 0) lines.push({ k: 'Clean sheets', d: CS, c: '#2BE38A' });
  if (isGK && cg > 0) lines.push({ k: 'Goals', d: G, c: 'var(--m-ink-1)' });
  if (isGK && ca > 0) lines.push({ k: 'Assists', d: A, c: '#22D3EE' });
  var maxY = 1; lines.forEach(function (L) { L.d.forEach(function (v) { if (v > maxY) maxY = v; }); });
  var W = 560, H = 184, L0 = 40, R = 20, T = 22, B = 34;
  var xx = function (i) { return L0 + (n <= 1 ? (W - L0 - R) / 2 : i / (n - 1) * (W - L0 - R)); };
  var yy = function (v) { return H - B - (v / maxY) * (H - B - T); };
  var path = function (d) { return d.map(function (v, i) { return (i ? 'L' : 'M') + xx(i).toFixed(1) + ' ' + yy(v).toFixed(1); }).join(' '); };
  var yt = [0, Math.round(maxY / 2), maxY].filter(function (v, i, a) { return a.indexOf(v) === i; });
  var xt = n <= 1 ? [0] : [0, Math.floor((n - 1) / 2), n - 1];
  return h('div', { className: 'm-sparkwrap' },
    h('svg', { className: 'm-spark m-spark--axes', viewBox: '0 0 ' + W + ' ' + H },
      h('defs', null, h('filter', { id: 'm-sparkglow', x: '-20%', y: '-50%', width: '140%', height: '200%' },
        h('feGaussianBlur', { stdDeviation: '2.6', result: 'b' }), h('feMerge', null, h('feMergeNode', { in: 'b' }), h('feMergeNode', { in: 'SourceGraphic' })))),
      yt.map(function (t, i) { return h('g', { key: 'y' + i }, h('line', { x1: L0, y1: yy(t), x2: W - R, y2: yy(t), className: 'm-spark__grid' }), h('text', { x: L0 - 9, y: yy(t) + 3.5, textAnchor: 'end', className: 'm-spark__tick' }, t)); }),
      xt.map(function (xi, i) { return h('text', { key: 'x' + i, x: xx(xi), y: H - 11, textAnchor: i === 0 ? 'start' : (i === xt.length - 1 ? 'end' : 'middle'), className: 'm-spark__tick' }, 'Game ' + (xi + 1)); }),
      lines.map(function (L, li) { return h('path', { key: 'ln' + li, className: 'm-spark__animline', d: path(L.d), fill: 'none', stroke: L.c, strokeWidth: L.glow ? 3 : 2, strokeLinejoin: 'round', strokeLinecap: 'round', filter: L.glow ? 'url(#m-sparkglow)' : null, opacity: L.glow ? 1 : 0.9, pathLength: 1, style: { animationDelay: (li * 0.12) + 's' } }); }),
      lines.map(function (L, li) { var lv = L.d[L.d.length - 1] || 0; return h('circle', { key: 'lp' + li, className: 'm-spark__dot', cx: xx(n - 1), cy: yy(lv), r: L.glow ? 4.5 : 3, fill: L.c, stroke: 'var(--m-bg)', strokeWidth: 1, style: { animationDelay: (1.05 + li * 0.12) + 's' } }); })),
    h('div', { className: 'm-sparklegend' }, lines.map(function (L, li) { return h('span', { key: 'lg' + li, className: 'm-sparklegend__i' }, h('i', { style: { background: L.c } }), L.k + ' · ' + (L.d[L.d.length - 1] || 0)); })));
}
// Count a value up from 0 on mount (and whenever it changes), so the stat tiles
// have a bit of life. Respects reduced-motion (jumps straight to the value).
function useCountUp(target) {
  var st = useState(0), val = st[0], setVal = st[1];
  useEffect(function () {
    var n = Number(target) || 0;
    if (RM() || n === 0) { setVal(n); return; }
    var start = null, dur = 1500, raf;
    function step(ts) {
      if (start == null) start = ts;
      var prog = Math.min(1, (ts - start) / dur);
      setVal(Math.round((1 - Math.pow(1 - prog, 3)) * n));
      if (prog < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return function () { if (raf) cancelAnimationFrame(raf); };
  }, [target]);
  return val;
}
function CountNum(props) { return useCountUp(props.value); }
function StatCounters(props) {
  var h = React.createElement, p = props.p, isGK = props.isGK;
  var squad = window.derivedSquad ? window.derivedSquad(props.matcher || null, props.seasonKey || null) : [];
  var rows = squad.map(function (s) {
    var lg = (typeof matchLog === 'function') ? matchLog(s.num, props.matcher || null, props.seasonKey || null) : [];
    var feat = lg.length, w = lg.filter(function (m) { return m.res === 'w'; }).length;
    var cs = lg.filter(function (m) { return m.csPart; }).length;
    var conc = lg.reduce(function (a, m) { return a + (m.conceded || 0); }, 0);
    return { num: s.num, apps: s.apps || 0, started: s.started || 0, goals: s.goals || 0, assists: s.assists || 0, motm: s.motm || 0, cs: cs, conceded: conc, win: feat ? Math.round(w / feat * 100) : 0 };
  });
  var me = rows.filter(function (r) { return r.num === p.num; })[0] || {};
  var maxOf = function (k) { return Math.max.apply(null, rows.map(function (r) { return r[k] || 0; }).concat([1])); };
  var counters = isGK
    ? [['Apps', 'apps'], ['Starts', 'started'], ['Clean sheets', 'cs'], ['Conceded', 'conceded'], ['MOTM', 'motm'], ['Win %', 'win']]
    : [['Apps', 'apps'], ['Starts', 'started'], ['Goals', 'goals'], ['Assists', 'assists'], ['MOTM', 'motm'], ['Win %', 'win']];
  var ach = counters.filter(function (c) { return ['apps', 'started', 'conceded'].indexOf(c[1]) === -1; });
  var best = null, bestPct = -1;
  ach.forEach(function (c) { var k = c[1], v = me[k] || 0, mx = k === 'win' ? 100 : maxOf(k), pc = mx ? v / mx : 0; if (v > 0 && pc > bestPct) { bestPct = pc; best = k; } });
  var fillSt = useState(false), filled = fillSt[0], setFilled = fillSt[1];
  useEffect(function () { var r = requestAnimationFrame(function () { setFilled(true); }); return function () { cancelAnimationFrame(r); }; }, []);
  return h('div', { className: 'm-counters' }, counters.map(function (c, i) {
    var key = c[1], val = me[key] || 0;
    var mx = key === 'win' ? 100 : maxOf(key);
    var pct = mx ? Math.min(1, val / mx) : 0;
    var C = 2 * Math.PI * 25, dash = pct * C;
    var isBest = key === best;
    return h('div', { className: 'm-counter' + (isBest ? ' is-standout' : ''), key: i },
      h('svg', { viewBox: '0 0 64 64', className: 'm-counter__svg' },
        h('circle', { cx: 32, cy: 32, r: 25, className: 'm-counter__track' }),
        h('circle', { cx: 32, cy: 32, r: 25, className: 'm-counter__arc', strokeDasharray: C.toFixed(1), strokeDashoffset: (filled ? C - dash : C).toFixed(1), transform: 'rotate(-90 32 32)' })),
      h('b', { className: 'm-counter__v', style: isBest ? { color: 'var(--m-volt)', textShadow: '0 0 16px rgba(214,242,58,0.5)' } : null }, h(CountNum, { value: val }), key === 'win' ? '%' : ''),
      h('span', { className: 'm-counter__l' }, c[0]));
  }));
}

// Position → contribution-breakdown group. Five role buckets, each with its
// own six-metric template (Attackers / wide / central mids all share the same
// output set, so they collapse into 'ATT'; defensive mids, defenders and
// keepers each get a defence-weighted set).
function cbGroup(pos, isGk) {
  var s = (pos || '').toUpperCase();
  if (isGk || s === 'GK') return 'GK';
  if (s === 'CDM' || s === 'LDM' || s === 'RDM') return 'DM';
  if (['CB', 'LCB', 'RCB', 'SW', 'LB', 'RB', 'LWB', 'RWB'].indexOf(s) > -1) return 'DEF';
  return 'ATT';
}

function PercentileWheel(props) {
  var h = React.createElement, p = props.p;
  var hoverState = useState(null), hover = hoverState[0], setHover = hoverState[1];
  var squad = window.derivedSquad ? window.derivedSquad(null, '25/26') : [];
  var rows = squad.map(function (s) {
    var lg = (typeof matchLog === 'function') ? matchLog(s.num) : [];
    var feat = lg.length;
    var cs = lg.filter(function (m) { return m.csPart; }).length;
    var w = lg.filter(function (m) { return m.res === 'w'; }).length;
    return { num: s.num, goals: s.goals || 0, assists: s.assists || 0, ga: (s.goals || 0) + (s.assists || 0), apps: s.apps || 0, started: s.started || 0, motm: s.motm || 0, cs: cs, csrate: feat ? Math.round(cs / feat * 100) : 0, w: w };
  });
  var me = rows.filter(function (r) { return r.num === p.num; })[0] || { goals: 0, assists: 0, ga: 0, apps: 0, started: 0, motm: 0, cs: 0, csrate: 0, w: 0 };
  var sum = function (k) { return rows.reduce(function (a, r) { return a + (r[k] || 0); }, 0); };
  var allRes = window.getDerivedResults ? window.getDerivedResults() : [];
  var played = allRes.filter(function (r) { return r.kind !== 'walkover'; });
  var isUs = function (r) { return r.home.indexOf('Angels') > -1; };
  var teamMatches = played.length || 1;
  var teamCS = played.filter(function (r) { return (isUs(r) ? r.as : r.hs) === 0; }).length || 1;
  var teamWins = played.filter(function (r) { var us = isUs(r) ? r.hs : r.as, th = isUs(r) ? r.as : r.hs; if (r.kind === 'penalty' && r.pens) { var up = isUs(r) ? r.pens.hs : r.pens.as, tp = isUs(r) ? r.pens.as : r.pens.hs; return up > tp; } return us > th; }).length || 1;
  var teamGoals = sum('goals') || 1, teamAssists = sum('assists') || 1, teamMotm = sum('motm') || 1;
  // each spoke = this player's SHARE of the team's own output (whole %, real data)
  function share(num, den) { return Math.max(0, Math.min(100, Math.round(num / den * 100))); }
  // metric tuple: [shortLabel, value, fullName, plain-English meaning, formula]
  var M = {
    goals:   ['Goals', share(me.goals, teamGoals), 'Goals Share', share(me.goals, teamGoals) + '% of Sue\u2019s Angels\u2019 goals this season were scored by this player.', 'Player Goals \u00f7 Team Goals \u00d7 100'],
    assists: ['Assists', share(me.assists, teamAssists), 'Assists Share', share(me.assists, teamAssists) + '% of the team\u2019s assists came from this player.', 'Player Assists \u00f7 Team Assists \u00d7 100'],
    contrib: ['Goal contrib.', share(me.ga, teamGoals), 'Goal Contribution Share', 'Directly involved in ' + share(me.ga, teamGoals) + '% of Sue\u2019s Angels\u2019 goals this season.', '(Goals + Assists) \u00f7 Team Goals \u00d7 100'],
    motm:    ['MOTM', share(me.motm, teamMotm), 'MOTM Share', 'Won ' + share(me.motm, teamMotm) + '% of the team\u2019s Man of the Match awards.', 'Player MOTM \u00f7 Team MOTM \u00d7 100'],
    avail:   ['Avail.', share(me.apps, teamMatches), 'Availability', 'Appeared in ' + share(me.apps, teamMatches) + '% of the team\u2019s ' + teamMatches + ' matches.', 'Appearances \u00f7 Team Matches \u00d7 100'],
    starts:  ['Starts', share(me.started, teamMatches), 'Starts Share', 'Started ' + share(me.started, teamMatches) + '% of the team\u2019s ' + teamMatches + ' matches.', 'Starts \u00f7 Team Matches \u00d7 100'],
    cs:      ['Clean sheets', share(me.cs, teamCS), 'Clean Sheet Share', 'Involved in ' + share(me.cs, teamCS) + '% of the team\u2019s clean sheets.', 'Clean Sheets Participated \u00f7 Team Clean Sheets \u00d7 100'],
    csrate:  ['CS rate', me.csrate, 'Clean Sheet Participation', me.csrate + '% of this player\u2019s appearances ended in a clean sheet.', 'Player Clean Sheets \u00f7 Appearances \u00d7 100'],
    win:     ['Win involve.', share(me.w, teamWins), 'Win Involvement', 'On the pitch for ' + share(me.w, teamWins) + '% of the team\u2019s wins.', 'Wins Played In \u00f7 Team Wins \u00d7 100']
  };
  var grp = cbGroup(p.mostPlayedPosition, p.gk);
  var metrics = (grp === 'GK')
    ? [M.cs, M.csrate, M.win, M.motm, M.avail, M.starts]
    : (grp === 'DM')
      ? [M.cs, M.contrib, M.assists, M.motm, M.avail, M.starts]
      : (grp === 'DEF')
        ? [M.cs, M.goals, M.assists, M.motm, M.avail, M.starts]
        : [M.goals, M.assists, M.contrib, M.motm, M.avail, M.starts];
  var photo = window.getPlayerPhoto ? window.getPlayerPhoto(p.num) : null;
  var cx = 180, cy = 175, maxR = 112, inR = 54;
  function pt(ang, r) { return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)]; }
  function wedge(i, r) { var a0 = (i * 60 - 90) * Math.PI / 180, a1 = ((i + 1) * 60 - 90) * Math.PI / 180; var s = pt(a0, r), e = pt(a1, r); return 'M' + cx + ' ' + cy + ' L' + s[0].toFixed(1) + ' ' + s[1].toFixed(1) + ' A' + r + ' ' + r + ' 0 0 1 ' + e[0].toFixed(1) + ' ' + e[1].toFixed(1) + ' Z'; }
  function enter(i) { return function () { setHover(i); }; }
  function leave() { setHover(null); }
  var hm = hover != null ? metrics[hover] : null;
  return h('div', { className: 'm-wheel' },
    h('svg', { viewBox: '0 0 360 360', className: 'm-wheel__svg' },
      h('defs', null, h('clipPath', { id: 'm-wheelclip-' + p.num }, h('circle', { cx: cx, cy: cy, r: inR }))),
      [0.5, 0.75, 1].map(function (f, i) { return h('circle', { key: 'r' + i, cx: cx, cy: cy, r: inR + (maxR - inR) * f, fill: 'none', className: 'm-wheel__ring' }); }),
      metrics.map(function (m, i) { var v = m[1], r = inR + (v / 100) * (maxR - inR); return h('path', { key: 'w' + i, d: wedge(i, r), className: 'm-wheel__wedge' + (hover === i ? ' is-active' : ''), style: { opacity: (0.30 + 0.58 * (v / 100)).toFixed(2) }, onMouseEnter: enter(i), onMouseLeave: leave }); }),
      metrics.map(function (m, i) { var a = (i * 60 - 90) * Math.PI / 180, e = pt(a, maxR); return h('line', { key: 'l' + i, x1: cx, y1: cy, x2: e[0].toFixed(1), y2: e[1].toFixed(1), className: 'm-wheel__spoke' }); }),
      photo ? h('image', { href: photo, 'xlinkHref': photo, x: cx - inR, y: cy - inR, width: inR * 2, height: inR * 2, clipPath: 'url(#m-wheelclip-' + p.num + ')', preserveAspectRatio: 'xMidYMin slice' }) : null,
      h('circle', { cx: cx, cy: cy, r: inR, fill: 'none', className: 'm-wheel__photoring' }),
      metrics.map(function (m, i) { var am = ((i + 0.5) * 60 - 90) * Math.PI / 180, lp = pt(am, maxR + 28), hit = pt(am, maxR + 22);
        return h('g', { key: 't' + i, className: 'm-wheel__lblg' + (hover === i ? ' is-active' : ''), onMouseEnter: enter(i), onMouseLeave: leave },
          h('circle', { cx: hit[0].toFixed(1), cy: hit[1].toFixed(1), r: 30, fill: 'transparent' }),
          h('text', { x: lp[0].toFixed(1), y: (lp[1] - 5).toFixed(1), textAnchor: 'middle', className: 'm-wheel__pct' }, m[1] + '%'),
          h('text', { x: lp[0].toFixed(1), y: (lp[1] + 9).toFixed(1), textAnchor: 'middle', className: 'm-wheel__lbl' }, m[0])); })),
    hm ? h('div', { className: 'm-wheel__tip', role: 'tooltip' },
      h('strong', null, hm[2]),
      h('span', { className: 'm-wheel__tip-d' }, hm[3])) : null);
}
ReactDOM.createRoot(document.getElementById('rd-root')).render(/*#__PURE__*/React.createElement(Site, null));

// Progressive Web App: register the service worker for installability + fast
// repeat loads + offline fallback. updateViaCache:'none' bypasses the HTTP cache
// when checking sw.js for updates (since .js is served immutable), so the worker
// always updates reliably. Failures are swallowed — the site works without it.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(function () {});
  });
}

// SEO: emit SportsEvent structured data for upcoming fixtures so search engines
// can understand (and potentially surface) the match schedule. Only runs on the
// fixtures/schedule pages and only for fixtures with a real date; Google renders
// JS and reads the injected JSON-LD. Re-runs when fixture data changes.
function saInjectFixtureSchema() {
  try {
    var path = (location.pathname || '').toLowerCase();
    if (path.indexOf('fixtures') === -1 && path.indexOf('schedule') === -1) return;
    var SITE = 'https://www.suesangelsfc.co.uk';
    var ups = (window.getActiveUpcoming ? window.getActiveUpcoming() : []) || [];
    var events = ups.slice(0, 16).map(function (f) {
      var iso = null;
      if (window.getFixtureDate) {
        var dt = window.getFixtureDate(f);
        if (dt) {
          var k = String(f.kick || '11:00').split(':');
          dt.setHours(parseInt(k[0], 10) || 11, parseInt(k[1], 10) || 0, 0, 0);
          iso = dt.toISOString();
        }
      }
      if (!iso) return null;
      var home = f.home || '', away = f.away || '';
      var isHome = home.toLowerCase().indexOf('angels') > -1;
      var ev = {
        '@type': 'SportsEvent',
        name: home.replace(' FC', '') + ' vs ' + away.replace(' FC', ''),
        startDate: iso,
        sport: 'Association football',
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        homeTeam: { '@type': 'SportsTeam', name: home },
        awayTeam: { '@type': 'SportsTeam', name: away },
        competitor: [{ '@type': 'SportsTeam', name: home }, { '@type': 'SportsTeam', name: away }],
        organizer: { '@type': 'SportsTeam', name: "Sue's Angels FC", url: SITE + '/' }
      };
      ev.location = isHome
        ? { '@type': 'Place', name: 'The Reeves', address: { '@type': 'PostalAddress', addressLocality: 'Hanworth', addressRegion: 'London', addressCountry: 'GB' } }
        : { '@type': 'Place', name: (away.replace(' FC', '') || 'Opposition') + ' ground (away)', address: { '@type': 'PostalAddress', addressRegion: 'London', addressCountry: 'GB' } };
      return ev;
    }).filter(Boolean);
    var prev = document.getElementById('sa-fixture-schema');
    if (prev) prev.remove();
    if (!events.length) return;
    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.id = 'sa-fixture-schema';
    s.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': events });
    document.head.appendChild(s);
  } catch (e) {}
}
if (typeof window !== 'undefined') {
  window.addEventListener('load', function () {
    setTimeout(saInjectFixtureSchema, 1200);
    setTimeout(saInjectFixtureSchema, 3200);
  });
  ['sa-roster-changed', 'sa-media-changed'].forEach(function (evt) {
    window.addEventListener(evt, function () { setTimeout(saInjectFixtureSchema, 250); });
  });
  window.saInjectFixtureSchema = saInjectFixtureSchema;
}
