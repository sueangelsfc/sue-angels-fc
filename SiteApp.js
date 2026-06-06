function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// MockPages.jsx — full interactive preview of every page in the new design system.
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
// TeamStatsPanel — richer "dashboard" for the Team → Team stats tab: hero
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
    href: ({ 'Champions': 'champions.html', 'All results': 'results.html', 'Full table': 'table.html', 'Every player': 'teams.html', 'All partners': 'sponsors.html', 'Gallery': 'gallery.html' })[link] || '#',
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

/* ══ PLAYER PROFILE — the showpiece (parameterised) ═════════════════════ */
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
    src: "assets/badge/sue-angels-shield.png",
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
  }, p.last, /*#__PURE__*/React.createElement("span", null, p.first)))), /*#__PURE__*/React.createElement("div", {
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
  }, m.opp))))));
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
function Home({
  go
}) {
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
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("section", {
    className: "mh-hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mh-hero__photo"
  }, /*#__PURE__*/React.createElement("img", {
    ref: imgRef,
    src: "assets/hero-team.jpg",
    alt: ""
  })), /*#__PURE__*/React.createElement("div", {
    className: "mh-hero__scrim"
  }), /*#__PURE__*/React.createElement("div", {
    className: "m-wrap",
    ref: dRef
  }, /*#__PURE__*/React.createElement("div", {
    className: "mh-htop"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mh-copy"
  }, /*#__PURE__*/React.createElement("p", {
    className: "m-eyebrow m-eyebrow--volt"
  }, "What we do in life echoes in eternity"), /*#__PURE__*/React.createElement("h1", {
    className: "mh-title"
  }, "Sue's Angels", /*#__PURE__*/React.createElement("em", null, "FC")), /*#__PURE__*/React.createElement("p", {
    className: "mh-tag"
  }, "Built in memory. Driven by purpose."), /*#__PURE__*/React.createElement("p", {
    className: "m-lead mh-hsub"
  }, "In memory of Susan Anne Martin. Played ", t.pl, ", won ", t.w, t.l === 0 ? ', unbeaten in League Ten' : '', "."), /*#__PURE__*/React.createElement("div", {
    className: "mh-routes"
  }, /*#__PURE__*/React.createElement("button", {
    className: "mh-route mp-clickable",
    onClick: () => go('schedule')
  }, /*#__PURE__*/React.createElement("span", {
    className: "mh-route__ic"
  }, I.cal), /*#__PURE__*/React.createElement("b", null, "Fixtures"), /*#__PURE__*/React.createElement("span", null, "Upcoming matches")), /*#__PURE__*/React.createElement("button", {
    className: "mh-route mp-clickable",
    onClick: () => go('schedule')
  }, /*#__PURE__*/React.createElement("span", {
    className: "mh-route__ic"
  }, I.trophy), /*#__PURE__*/React.createElement("b", null, "Results"), /*#__PURE__*/React.createElement("span", null, "Scores & reports")), /*#__PURE__*/React.createElement("button", {
    className: "mh-route mp-clickable",
    onClick: () => go('media')
  }, /*#__PURE__*/React.createElement("span", {
    className: "mh-route__ic"
  }, I.photo), /*#__PURE__*/React.createElement("b", null, "Gallery"), /*#__PURE__*/React.createElement("span", null, "Matchday photos")))), /*#__PURE__*/React.createElement("div", {
    className: "mh-nm2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mh-nm2__head"
  }, /*#__PURE__*/React.createElement("span", null, next ? 'Next match' : 'Next session'), I.cal), next ? /*#__PURE__*/React.createElement("div", {
    className: "mh-nm2__teams"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mh-nm2__team"
  }, Badge ? /*#__PURE__*/React.createElement(Badge, {
    team: next.home,
    size: 52
  }) : null, /*#__PURE__*/React.createElement("b", null, next.home.replace(' FC', ''))), /*#__PURE__*/React.createElement("span", {
    className: "mh-nm2__vs"
  }, "VS"), /*#__PURE__*/React.createElement("div", {
    className: "mh-nm2__team"
  }, Badge ? /*#__PURE__*/React.createElement(Badge, {
    team: next.away,
    size: 52
  }) : null, /*#__PURE__*/React.createElement("b", null, next.away.replace(' FC', '')))) : /*#__PURE__*/React.createElement("div", {
    className: "mh-nm2__teams",
    style: {
      gridTemplateColumns: '1fr'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "mh-nm2__team"
  }, /*#__PURE__*/React.createElement("img", {
    src: "assets/badge/sue-angels-shield.png",
    alt: ""
  }), /*#__PURE__*/React.createElement("b", null, session ? session.title || 'Pre-season training' : '26/27 season'))), /*#__PURE__*/React.createElement("div", {
    className: "mh-nm2__rows"
  }, next ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "mh-nm2__row"
  }, I.cal, /*#__PURE__*/React.createElement("span", null, next.date === 'TBC' ? 'Date TBC' : `${next.day || ''} ${next.date} ${next.mon || ''}`.trim())), /*#__PURE__*/React.createElement("div", {
    className: "mh-nm2__row"
  }, I.clock, /*#__PURE__*/React.createElement("span", null, !next.kick || next.kick === 'TBC' ? 'Kick-off TBC' : `${next.kick} KO`))) : session ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "mh-nm2__row"
  }, I.cal, /*#__PURE__*/React.createElement("span", null, session.dayName, " ", session.dateStr)), /*#__PURE__*/React.createElement("div", {
    className: "mh-nm2__row"
  }, I.clock, /*#__PURE__*/React.createElement("span", null, session.timeStr)), /*#__PURE__*/React.createElement("div", {
    className: "mh-nm2__row"
  }, I.pin, /*#__PURE__*/React.createElement("span", null, session.venue))) : null, cd ? /*#__PURE__*/React.createElement("div", {
    className: "mh-nm2__cd"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mh-nm2__dot"
  }), cd.d > 0 ? cd.d + 'D ' : '', pad(cd.h), "H ", pad(cd.m), "M TO KICK-OFF") : null), /*#__PURE__*/React.createElement("button", {
    className: "m-btn m-btn--volt",
    style: {
      justifyContent: 'center'
    },
    onClick: () => go('schedule')
  }, "View fixtures ", /*#__PURE__*/React.createElement(Arrow, null)))), /*#__PURE__*/React.createElement("div", {
    className: "mh-dash"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mh-dcard"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mh-dcard__head"
  }, /*#__PURE__*/React.createElement("span", null, "Season record"), I.chart), /*#__PURE__*/React.createElement("div", {
    className: "mh-dcard__tag"
  }, "League Ten \xB7 25/26"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "mh-drow"
  }, /*#__PURE__*/React.createElement("span", null, "Played"), /*#__PURE__*/React.createElement("b", null, /*#__PURE__*/React.createElement(CountUp, {
    value: t.pl,
    on: dOn
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mh-drow"
  }, /*#__PURE__*/React.createElement("span", null, "Won"), /*#__PURE__*/React.createElement("b", null, /*#__PURE__*/React.createElement(CountUp, {
    value: t.w,
    on: dOn
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mh-drow"
  }, /*#__PURE__*/React.createElement("span", null, "Drawn"), /*#__PURE__*/React.createElement("b", null, /*#__PURE__*/React.createElement(CountUp, {
    value: t.d,
    on: dOn
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mh-drow"
  }, /*#__PURE__*/React.createElement("span", null, "Lost"), /*#__PURE__*/React.createElement("b", null, /*#__PURE__*/React.createElement(CountUp, {
    value: t.l,
    on: dOn
  })))), /*#__PURE__*/React.createElement("div", {
    className: "mh-dbig"
  }, /*#__PURE__*/React.createElement("span", null, "Goals scored"), /*#__PURE__*/React.createElement("b", null, /*#__PURE__*/React.createElement(CountUp, {
    value: t.gf,
    on: dOn
  })))), /*#__PURE__*/React.createElement("div", {
    className: "mh-dcard"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mh-dcard__head"
  }, /*#__PURE__*/React.createElement("span", null, "League position"), I.medal), /*#__PURE__*/React.createElement("div", {
    className: "mh-dpos"
  }, /*#__PURE__*/React.createElement("b", null, t.pos), /*#__PURE__*/React.createElement("sup", null, ord)), /*#__PURE__*/React.createElement("div", {
    className: "mh-dcard__tag"
  }, "League Ten"), /*#__PURE__*/React.createElement("div", {
    className: "mh-dptrow"
  }, /*#__PURE__*/React.createElement("span", null, "Points"), /*#__PURE__*/React.createElement("b", null, t.pts, " / ", t.pl * 3)), /*#__PURE__*/React.createElement("div", {
    className: "mh-dbar"
  }, /*#__PURE__*/React.createElement("i", {
    style: {
      width: dOn ? (t.pl ? t.pts / (t.pl * 3) : 0) * 100 + '%' : 0
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "mh-dform"
  }, /*#__PURE__*/React.createElement("span", null, "Form"), /*#__PURE__*/React.createElement("div", {
    className: "mh-dform__dots"
  }, form.map((f, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: `mh-fdot mh-fdot--${f}`
  }, f.toUpperCase()))))), /*#__PURE__*/React.createElement("div", {
    className: "mh-dcard"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mh-dcard__head"
  }, /*#__PURE__*/React.createElement("span", null, "Club stats"), I.people), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "mh-drow"
  }, /*#__PURE__*/React.createElement("span", null, "Founded"), /*#__PURE__*/React.createElement("b", null, "2025")), /*#__PURE__*/React.createElement("div", {
    className: "mh-drow"
  }, /*#__PURE__*/React.createElement("span", null, "Squad"), /*#__PURE__*/React.createElement("b", null, squad)), /*#__PURE__*/React.createElement("div", {
    className: "mh-drow"
  }, /*#__PURE__*/React.createElement("span", null, "Goal difference"), /*#__PURE__*/React.createElement("b", null, t.gd >= 0 ? '+' : '', t.gd))), /*#__PURE__*/React.createElement("div", {
    className: "mh-dcard__sp"
  }), /*#__PURE__*/React.createElement("button", {
    className: "m-btn m-btn--ghost",
    style: {
      justifyContent: 'center'
    },
    onClick: () => go('about')
  }, "Our story ", /*#__PURE__*/React.createElement(Arrow, null)))))), /*#__PURE__*/React.createElement("section", {
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
  }, r.pts)))))))), /*#__PURE__*/React.createElement(Join, {
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
  }, "Get in touch")))));
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
// ManagerAnalytics — season-scoped leadership analytics for the coach modal.
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

// CoachModalContent — coach header + a two-slide pager (Profile / Manager stats).
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
  const [tab, setTab] = useState('squad');
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
      const pn = parseInt(new URLSearchParams(window.location.search).get('player'), 10);
      if (pn) { setTab('squad'); setProfile(pn); }
    } catch (e) {}
  }, []);
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
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHero, {
    eyebrow: "First team",
    title: /*#__PURE__*/React.createElement(React.Fragment, null, "The ", /*#__PURE__*/React.createElement("em", null, "squad"), "."),
    sub: "Position-grouped cards, leaderboards and coaches. Tap any player for their full analytics profile."
  }), /*#__PURE__*/React.createElement("section", {
    className: "mp-sec"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mp-subtabs"
  }, [['squad', 'First team'], ['leaders', 'Leaderboards'], ['coaches', 'Coaches'], ['stats', 'Team stats']].concat(hasPast ? [['past', 'Past players']] : []).map(([k, l]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    className: `mp-subtab ${tab === k ? 'is-active' : ''}`,
    onClick: () => setTab(k)
  }, l))), (tab === 'squad' || tab === 'stats' || tab === 'past') ? /*#__PURE__*/React.createElement("div", {
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
      src: "assets/badge/sue-angels-shield.png",
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
  })))), profile != null ? /*#__PURE__*/React.createElement(Modal, {
    wide: true,
    onClose: () => setProfile(null)
  }, /*#__PURE__*/React.createElement(ProfileCard, {
    num: profile
  })) : null, coach ? /*#__PURE__*/React.createElement(Modal, {
    onClose: () => setCoach(null)
  }, /*#__PURE__*/React.createElement(CoachModalContent, {
    coach: coach
  })) : null);
}

/* ══ SCHEDULE ═══════════════════════════════════════════════════════════ */
function LeagueTable() {
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
  }, "Vacancy, to be confirmed"))))))));
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
    title: /*#__PURE__*/React.createElement(React.Fragment, null, "The ", /*#__PURE__*/React.createElement("em", null, "schedule"), "."),
    sub: "Every result across league and cups, the full table, and upcoming fixtures."
  }), /*#__PURE__*/React.createElement("section", {
    className: "mp-sec"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mp-subtabs"
  }, [['results', `Results (${(window.getDerivedResults ? window.getDerivedResults() : []).length})`], ['table', 'League table'], ['fixtures', `Fixtures (${fixtures.length})`]].map(([k, l]) => /*#__PURE__*/React.createElement("button", {
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
  }, "No matches fit these filters.")) : tab === 'table' ? /*#__PURE__*/React.createElement(LeagueTable, null) : fixtures.length ? /*#__PURE__*/React.createElement("div", {
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

  const articleCard = it => h("button", { className: "mp-news mp-clickable", key: 'a-' + it.id, onClick: () => setArticle(it) }, (window.getPostCover && window.getPostCover(it.id)) ? maGenCover(window.getPostCover(it.id)) : it.cover ? h("div", { className: "mp-news__cover" }, h("img", { src: it.cover, alt: "" })) : maGenCover({ layout: 'badges', top: it.cat || 'News', left: 'assets/badge/sue-angels-shield.png', right: '', center: '', bottom: it.date || "Sue's Angels FC" }), h("div", { className: "mp-news__body" }, h("span", { className: "m-chip m-chip--volt mp-news__tag" }, it.cat), h("h3", { className: "m-h3" }, it.title), h("p", null, (it.date ? it.date + ' \u00b7 ' : '') + trunc(it.body, 110))));

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
      ? h("div", { className: "mp-news__cover", style: { gap: 10 } }, it.photographer ? h("span", { className: "mp-news__ft", style: { color: 'rgb(214,242,58)', fontSize: '7px' } }, "PICTURES TAKEN BY " + String(it.photographer).toUpperCase()) : null, h("span", { className: "mp-news__ft" }, "MATCHDAY"), h("div", { className: "mp-news__sc" }, h("img", { className: "mp-news__gbadge", src: it.homeBadge || 'assets/badge/sue-angels-shield.png', alt: "" }), h("span", { className: "mp-news__gvs" }, "VS"), it.awayBadge ? h("img", { className: "mp-news__gbadge", src: it.awayBadge, alt: "" }) : null))
      : h("div", { className: "mp-news__cover" }, cover ? h("img", { src: cover, alt: "" }) : h("img", { className: "gh", src: "assets/badge/sue-angels-shield.png", alt: "" }));
    return h("button", { className: "mp-news mp-clickable", key: i, onClick: () => { setAlbum(it); setAi(0); } }, coverEl, it.category ? h("div", { className: "mp-news__body" }, h("span", { className: "m-chip m-chip--volt mp-news__tag" }, it.category)) : null);
  };
  const galleryBody = shownGallery.length ? h("div", { className: "mp-grid mp-g4" }, shownGallery.map(galleryCard)) : h("div", { className: "m-empty" }, h("b", null, "NO PHOTOS YET"), h("span", null, "MATCHDAY ALBUMS WILL APPEAR HERE"));
  const videos = window.getClubVideos ? window.getClubVideos() : [];
  const videoCard = (v, i) => h("button", { className: "mp-news mp-clickable", key: v.id || i, onClick: () => setVid(v) }, v.cover ? h("div", { className: "mp-news__cover" }, h("img", { src: v.cover, alt: "" })) : maGenCover({ layout: 'badges', top: v.category || 'VIDEO', left: v.homeBadge || 'assets/badge/sue-angels-shield.png', right: v.awayBadge || '', center: '\u25B6', bottom: v.title || 'Watch' }), h("div", { className: "mp-news__body" }, v.category ? h("span", { className: "m-chip m-chip--volt mp-news__tag" }, v.category) : null, v.title ? h("h3", { className: "m-h3" }, v.title) : null));
  const videosBody = videos.length ? h("div", { className: "mp-grid mp-g3" }, videos.map(videoCard)) : h("div", { className: "m-empty" }, h("b", null, "NO VIDEOS YET"), h("span", null, "MATCH GOALS & CLIPS WILL APPEAR HERE"));

  return h(React.Fragment, null, h(PageHero, { eyebrow: "The latest", title: h(React.Fragment, null, "Me", h("em", null, "dia")), sub: "Match reports, club news and the matchday gallery." }), h("section", { className: "mp-sec" }, h("div", { className: "m-wrap" }, h("div", { className: "mp-subtabs" }, [['news', 'News'], ['gallery', 'Gallery'], ['videos', 'Videos']].map(([k, l]) => h("button", { key: k, className: `mp-subtab ${tab === k ? 'is-active' : ''}`, onClick: () => setTab(k) }, l))), tab === 'news' ? h(React.Fragment, null, catTabs, newsBody) : tab === 'videos' ? videosBody : h(React.Fragment, null, gcatTabs, galleryBody))), report ? h(Modal, { onClose: () => setReport(null) }, h("div", { className: "m-glass m-modal__sponsor" }, h("p", { className: "m-eyebrow m-eyebrow--volt" }, report.competition || 'League Ten', " \u00b7 ", report.date), h("h2", { className: "m-h2", style: { marginTop: 10 } }, report.home.replace(' FC', ''), " ", report.hs, "-", report.as, " ", report.away.replace(' FC', '')), h("div", { className: "m-prose" }, function () { var d = window.loadMatchEntry ? window.loadMatchEntry(report.id) : null; var t = d && (d.polishedReport || d.commentary); t = t && String(t).trim(); if (!t) return h("p", null, "Match report to follow, watch this space."); return t.split(/\n+/).map(function (p, i) { return h("p", { key: i }, p); }); }()))) : null, article ? h(Modal, { onClose: () => setArticle(null) }, h("div", { className: "m-glass m-modal__sponsor" }, article.cover ? h("img", { src: article.cover, alt: "", style: { width: '100%', maxHeight: 340, objectFit: 'cover', borderRadius: 14, marginBottom: 18 } }) : null, h("p", { className: "m-eyebrow m-eyebrow--volt" }, article.cat, " \u00b7 ", article.date), h("h2", { className: "m-h2", style: { marginTop: 10 } }, article.title), h("div", { className: "m-prose", style: { marginTop: 16 } }, String(article.body || '').split(/\n+/).filter(Boolean).map((p, i) => h("p", { key: i }, p))))) : null, album ? (function () { var ph = window.galleryPhotos ? window.galleryPhotos(album) : (album.photos || []); if (!ph.length) return null; var idx = ((ai % ph.length) + ph.length) % ph.length; var tags = (album.photoTags && album.photoTags[idx]) || []; return h("div", { className: "m-zoom m-albumbox", onClick: () => setAlbum(null) }, h("button", { className: "m-modal__close", onClick: () => setAlbum(null) }, "\u2715"), ph.length > 1 ? h("button", { className: "m-albumbox__nav m-albumbox__nav--prev", onClick: (e) => { e.stopPropagation(); setAi(idx - 1); } }, "\u2039") : null, h("figure", { className: "m-albumbox__fig", onClick: (e) => e.stopPropagation() }, h("img", { src: ph[idx], alt: "" }), tags.length ? h("figcaption", { className: "m-albumbox__tags" }, tags.join(" \u00b7 ")) : null, h("span", { className: "m-albumbox__count" }, (idx + 1) + " / " + ph.length)), ph.length > 1 ? h("button", { className: "m-albumbox__nav m-albumbox__nav--next", onClick: (e) => { e.stopPropagation(); setAi(idx + 1); } }, "\u203A") : null); })() : null, vid ? h("div", { className: "m-zoom", onClick: () => setVid(null) }, h("button", { className: "m-modal__close", onClick: () => setVid(null) }, "\u2715"), (function () { var u = vid.url || ''; var m = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/); if (m) return h("iframe", { src: 'https://www.youtube.com/embed/' + m[1] + '?autoplay=1', style: { width: 'min(92vw, 960px)', aspectRatio: '16 / 9', border: 0, borderRadius: 14 }, allow: 'autoplay; fullscreen', allowFullScreen: true }); return h("video", { src: u, controls: true, autoPlay: true, style: { width: 'min(92vw, 960px)', maxHeight: '82vh', borderRadius: 14, background: '#000' } }); })()) : null, zoom ? h("div", { className: "m-zoom", onClick: () => setZoom(null) }, h("button", { className: "m-modal__close", onClick: () => setZoom(null) }, "\u2715"), h("img", { src: zoom, alt: "" })) : null);
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
function Sponsors({
  go
}) {
  const h = React.createElement;
  const [detail, setDetail] = useState(null);
  const partners = [{
    logo: 'assets/sponsors/sporting-solutions.png',
    n: 'Sporting Solutions Ltd',
    role: 'Main kit sponsor',
    sub: 'On the matchday shirt every weekend since the inaugural season.',
    loc: 'London & Surrey',
    since: '2025',
    desc: ['Sporting Solutions Ltd are a London and Surrey-based sports and garden maintenance contractor, specialising in professional outdoor maintenance, sports-surface care and renovation.', 'Sue’s Angels FC are proud to be backed by a company whose work maintains the spaces where sport and community come together.']
  }, {
    logo: 'assets/sponsors/hodgson-roofing.png',
    n: 'Hodgson Roofing',
    role: 'Warm-up & training top sponsor',
    sub: 'NFRC-accredited roofing specialists, on the squad pre-match.',
    loc: 'Harrow & London',
    since: '2026',
    desc: ['Hodgson Roofing are NFRC-accredited roofing specialists based in Harrow, serving London and the surrounding areas with new roofs, repairs, flat roofs and lead work.', 'Their backing helps strengthen the club on and off the pitch.']
  }, {
    logo: 'assets/sponsors/staines-rugby.png',
    n: 'Staines Rugby Club',
    role: 'Ground-share partner',
    sub: 'Our home at The Reeves, where the Angels train and play.',
    loc: 'The Reeves, Hanworth',
    since: '2025',
    desc: ['Staines Rugby Club, the Swans, was founded in 1926 and marks its centenary in 2026. The club plays at The Reeves in Hanworth, a multi-pitch home it has run since the 1960s, with a proud tradition of community and youth rugby.', 'We are proud to ground-share with Staines RFC, training and playing our home fixtures at The Reeves, and grateful to everyone at the club for making us so welcome.']
  }];
  const benefits = [['01', 'Every matchday', 'Your brand on the kit we play in every weekend.'], ['02', 'Real audience', 'A growing London fanbase reached through reports, tables and player content.'], ['03', 'Tailored deal', 'No fixed tiers, just a package built around your business.'], ['04', "Champions' badge", 'Back a winner: League Ten champions, unbeaten, promoted for 26/27.']];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PageHero, {
    eyebrow: "Partners",
    title: /*#__PURE__*/React.createElement(React.Fragment, null, "Behind the ", /*#__PURE__*/React.createElement("em", null, "badge"), "."),
    sub: "The businesses and clubs that back Sue's Angels, including our ground-share partner. Here's who they are, and how to join them.",
    actions: /*#__PURE__*/React.createElement("button", {
      className: "m-btn m-btn--volt",
      onClick: () => go('contact')
    }, "Partner with us ", /*#__PURE__*/React.createElement(Arrow, null))
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
    h("div", { className: "m-glass", style: { padding: "clamp(24px,4vw,44px)", marginTop: 22, textAlign: "center" } }, h("p", { className: "m-eyebrow m-eyebrow--volt", style: { justifyContent: "center", display: "inline-flex" } }, "Become a partner"), h("h2", { className: "m-h2", style: { marginTop: 10 } }, "Put your brand behind the badge."), h("p", { className: "m-lead", style: { margin: "12px auto 0", maxWidth: "54ch" } }, "Sponsorship, kit, matchday or community partnerships. Let’s build something that works for your business and the club."), h("div", { style: { marginTop: 24, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" } }, h("button", { className: "m-btn m-btn--volt", onClick: () => go("contact") }, "Make an enquiry ", h(Arrow, null)), h("a", { className: "m-btn m-btn--ghost", href: "mailto:susangelsfc@gmail.com" }, "Email the club"))))), /*#__PURE__*/React.createElement("section", {
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
  }, "Sponsor enquiry ", /*#__PURE__*/React.createElement(Arrow, null)), (function () { var u = ({ 'Sporting Solutions Ltd': 'https://instagram.com/sporting_solutions_ltd', 'Hodgson Roofing': 'https://hodgsonroofing.com' })[detail.n]; return u ? /*#__PURE__*/React.createElement("a", { className: "m-btn m-btn--ghost", href: u, target: "_blank", rel: "noopener" }, "Visit website") : null; })()))) : null);
}

/* ══ CONTACT ════════════════════════════════════════════════════════════ */
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
  }, "susangelsfc@gmail.com", /*#__PURE__*/React.createElement("br", null), "@suesangelsfc \xB7 Instagram"))), /*#__PURE__*/React.createElement("form", {
    className: "m-glass mp-form",
    onSubmit: e => {
      e.preventDefault();
      setSent(true);
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
  }, "Sent"), /*#__PURE__*/React.createElement("h3", {
    className: "m-h3"
  }, "Thanks. We'll reply within 48 hours.")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
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
      setSent(true);
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
  }, "Sent"), /*#__PURE__*/React.createElement("h3", {
    className: "m-h3"
  }, "Thanks. We\u2019ll reply within 48 hours.")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
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
        h('button', { className: 'm-btn m-btn--ghost', onClick: () => go('contact') }, 'Support the cause')),
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
  champions: 'champions.html',
  team: 'teams.html',
  schedule: 'schedule.html',
  media: 'media.html',
  sponsors: 'sponsors.html',
  contact: 'contact.html',
  join: 'join.html'
};
const NAV = [['home', 'Home'], ['about', 'About'], ['sepsis', 'Our Cause'], ['champions', 'Champions'], ['team', 'Team'], ['schedule', 'Schedule'], ['media', 'Media'], ['sponsors', 'Sponsors'], ['contact', 'Contact']];
const PAGES = {
  home: Home,
  about: About,
  sepsis: Sepsis,
  champions: Champions,
  team: Team,
  schedule: Schedule,
  media: Media,
  sponsors: Sponsors,
  contact: Contact,
  join: JoinPage
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
    'schedule.html': 'schedule',
    'fixtures.html': 'schedule',
    'results.html': 'schedule',
    'table.html': 'schedule',
    'media.html': 'media',
    'news.html': 'media',
    'gallery.html': 'media',
    'sponsors.html': 'sponsors',
    'contact.html': 'contact',
    'join.html': 'join'
  };
  return map[f] || 'home';
}
function SiteHeader({
  page
}) {
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'dark');
  const [open, setOpen] = useState(false);
  const flip = () => {
    const t = theme === 'dark' ? 'light' : 'dark';
    setTheme(t);
    document.documentElement.setAttribute('data-theme', t);
    try {
      localStorage.setItem('sa-theme', t);
    } catch (e) {}
  };
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
    src: "assets/badge/sue-angels-badge.png",
    alt: ""
  }), "Sue's Angels"), /*#__PURE__*/React.createElement("nav", {
    id: "sa-primary-nav",
    "aria-label": "Primary",
    className: `sa-nav ${open ? 'is-open' : ''}`
  }, NAV.map(([k, l]) => /*#__PURE__*/React.createElement("a", {
    key: k,
    href: HREF[k],
    className: page === k ? 'is-active' : '',
    onClick: () => setOpen(false)
  }, l))), /*#__PURE__*/React.createElement("div", {
    className: "sa-act"
  }, /*#__PURE__*/React.createElement("button", {
    className: "m-toggle",
    style: {
      position: 'static'
    },
    onClick: flip,
    "aria-label": "Toggle theme"
  }, theme === 'dark' ? '☾' : '☀'), /*#__PURE__*/React.createElement("a", {
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
  return /*#__PURE__*/React.createElement("footer", {
    className: "mh-footer"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mh-footer__row"
  }, /*#__PURE__*/React.createElement("a", {
    className: "mh-footer__brand",
    href: "index.html",
    style: {
      textDecoration: 'none',
      color: 'inherit'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "assets/badge/sue-angels-badge.png",
    alt: ""
  }), "Sue's Angels FC"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 18,
      flexWrap: 'wrap'
    }
  }, NAV.map(([k, l]) => /*#__PURE__*/React.createElement("a", {
    key: k,
    href: HREF[k],
    style: {
      color: 'var(--m-ink-3)',
      font: '600 0.74rem var(--m-sans)',
      letterSpacing: '0.08em',
      textTransform: 'uppercase'
    }
  }, l)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement("small", null, "Founded 2025 \xB7 in memory of Susan Anne Martin \xB7 League Ten Champions 25/26 \xB7 supporting sepsis awareness"))));
}
function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > 600);
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
    const id = window.SA_GA_ID;
    if (id && !window.__saga) {
      window.__saga = 1;
      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };
      window.gtag('js', new Date());
      window.gtag('config', id);
    }
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
            ph ? h('img', { src: ph, alt: p.first + ' ' + p.last }) : h('img', { src: 'assets/badge/sue-angels-shield.png', alt: '' })),
          h('div', { className: 'mp-player__scrim' }),
          h('span', { className: 'm-chip m-chip--volt mp-player__pos' }, pos),
          h('div', { className: 'mp-player__body' },
            h('div', { className: 'mp-player__name' }, p.last, h('span', null, p.first)),
            h('div', { className: 'mp-player__stats' }, frontStats.map(function (s, k) { return h('div', { key: k }, h('b', null, hideStats ? '\u2013' : s[0]), h('span', null, s[1])); })))),
        h('div', { className: 'mp-player__face mp-player__back' },
          h('div', { className: 'mp-pb__head' },
            h('span', { className: 'mp-pb__num' }, p.num != null ? p.num : ''),
            h('div', { className: 'mp-pb__id' }, h('b', null, p.first + ' ' + p.last), h('span', null, p.gk ? 'Goalkeeper' : pos))),
          h('div', { className: 'mp-pb__grid' }, backStats.map(function (s, k) { return h('div', { className: 'mp-pb__stat', key: k }, h('b', null, hideStats ? '\u2013' : (s[0] != null ? s[0] : 0)), h('span', null, s[1])); })),
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
  return h('div', { className: 'm-counters' }, counters.map(function (c, i) {
    var key = c[1], val = me[key] || 0;
    var mx = key === 'win' ? 100 : maxOf(key);
    var pct = mx ? Math.min(1, val / mx) : 0;
    var C = 2 * Math.PI * 25, dash = pct * C;
    return h('div', { className: 'm-counter', key: i },
      h('svg', { viewBox: '0 0 64 64', className: 'm-counter__svg' },
        h('circle', { cx: 32, cy: 32, r: 25, className: 'm-counter__track' }),
        h('circle', { cx: 32, cy: 32, r: 25, className: 'm-counter__arc', strokeDasharray: dash.toFixed(1) + ' ' + C.toFixed(1), style: { '--m-dash': dash.toFixed(1) }, transform: 'rotate(-90 32 32)' })),
      h('b', { className: 'm-counter__v' }, val + (key === 'win' ? '%' : '')),
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
