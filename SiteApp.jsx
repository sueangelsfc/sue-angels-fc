// MockPages.jsx, full interactive preview of every page in the new design system.
// Real data from the live engine. Tabs: Home, About, Champions, Team, Schedule,
// Media, Sponsors, Contact. Interactive: sub-tabs, filters, player-profile modal,
// sponsor modal, gallery lightbox, coach modal, forms, theme toggle. Not production.
const { useState, useEffect, useRef, useMemo } = React;
const RM = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function useReveal() {
  const ref = useRef(null);
  useEffect(() => { const el = ref.current; if (!el) return; if (RM()) { el.classList.add('is-in'); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { el.classList.add('is-in'); io.unobserve(el); } }), { threshold: 0.12 });
    io.observe(el); return () => io.disconnect(); }, []);
  return ref;
}
function useOnscreen() {
  const ref = useRef(null); const [on, setOn] = useState(false);
  useEffect(() => { const el = ref.current; if (!el) return; if (RM()) { setOn(true); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { requestAnimationFrame(() => setOn(true)); io.unobserve(el); } }), { threshold: 0.25 });
    io.observe(el); return () => io.disconnect(); }, []);
  return [ref, on];
}
function CountUp({ value, suffix = '', prefix = '', on }) {
  const [n, setN] = useState(RM() ? value : 0);
  useEffect(() => { if (RM() || !on) { setN(value); return; }
    let raf; const dur = 1100, t0 = performance.now(), ease = (x) => 1 - Math.pow(1 - x, 3);
    const tick = (t) => { const p = Math.min(1, (t - t0) / dur); setN(value * ease(p)); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf); }, [value, on]);
  return <React.Fragment>{prefix}{Number.isInteger(value) ? Math.round(n) : n.toFixed(1)}{suffix}</React.Fragment>;
}
const Arrow = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
const MON = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
const pdate = (s) => { const m = /(\d{1,2})\s+(\w{3})\s+(\d{2})/.exec(s || ''); return m ? new Date(2000 + +m[3], MON[m[2]] || 0, +m[1]) : new Date(0); };
const nnum = (e) => (typeof e === 'number' ? e : (e && e.num));
const npos = (e) => (e && Array.isArray(e.positions) ? e.positions : []);
const photoOf = (n) => (window.getPlayerPhoto ? window.getPlayerPhoto(n) : null);
const I = {
  cal: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  pin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>,
  chart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19V5M4 19h16M8 16l3-4 3 2 4-6" /></svg>,
  medal: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="15" r="6" /><path d="M9 9 7 2h10l-2 7M10 15h4" /></svg>,
  people: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5.6M21 20a6 6 0 0 0-4-5.6" /></svg>,
  trophy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></svg>,
  photo: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.5" /><path d="m21 16-5-5L5 20" /></svg>,
  ball: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="m12 7 2.6 1.9-1 3h-3.2l-1-3L12 7Z" /></svg>,
  pass: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h13M13 6l6 6-6 6" /></svg>,
  star: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19l1-5.8L3.5 9.1l5.9-.9L12 3Z" /></svg>,
  shield: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 5 6v5c0 4.5 3 7.5 7 10 4-2.5 7-5.5 7-10V6l-7-3Z" /></svg>,
  pulse: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l2 7 4-14 2 7h6" /></svg>,
};

function teamTotals() { const me = (window.RAW_TABLE || []).find((r) => r.us) || {}; const gf = me.gf || 0, ga = me.ga || 0;
  return { pl: me.pl || 0, w: me.w || 0, d: me.d || 0, l: me.l || 0, gf, ga, gd: gf - ga, pts: me.pts || 0, pos: me.p || 1, winPct: me.pl ? Math.round((me.w / me.pl) * 100) : 0 }; }
function allCompTotals() {
  const results = window.getDerivedResults ? window.getDerivedResults() : (window.SEASON_RESULTS || []);
  let pl = 0, w = 0, d = 0, l = 0, gf = 0, ga = 0, cs = 0;
  for (const r of results) { const usHome = r.home.includes('Angels');
    if (r.kind === 'walkover') { pl++; w++; continue; }
    const us = usHome ? r.hs : r.as, them = usHome ? r.as : r.hs; if (us == null || them == null) continue;
    pl++; gf += us; ga += them; if (them === 0) cs++;
    if (r.kind === 'penalty' && r.pens) { const uP = usHome ? r.pens.hs : r.pens.as, tP = usHome ? r.pens.as : r.pens.hs; if (uP > tP) w++; else l++; }
    else if (us > them) w++; else if (us === them) d++; else l++; }
  return { pl, w, d, l, gf, ga, gd: gf - ga, cs, winPct: pl ? Math.round((w / pl) * 100) : 0 };
}
function matchLog(num) {
  const results = (window.getDerivedResults ? window.getDerivedResults() : []).slice();
  const entries = window.getAllMatchEntries ? window.getAllMatchEntries() : []; const byId = {}; entries.forEach(({ id, data }) => { byId[id] = data; });
  const rows = results.map((r) => ({ r, d: pdate(r.date) })).sort((a, b) => a.d - b.d); const out = [];
  for (const { r } of rows) { if (r.kind === 'walkover') continue; const data = byId[r.id]; if (!data) continue;
    const startE = (data.starters || []).find((e) => nnum(e) === num); const subE = (data.bench || []).find((e) => nnum(e) === num);
    const entry = startE || subE; if (!startE && !(subE && npos(subE).length > 0)) continue;
    const g = (data.goals || []).filter((x) => x.num === num).length, a = (data.assists || []).filter((x) => x.num === num).length;
    const isGk = npos(entry).some((p) => /^GK|^GOAL/i.test(p)); const conceded = isGk ? (data.opponentGoals || []).length : null;
    const usHome = r.home.includes('Angels'); const us = usHome ? r.hs : r.as, th = usHome ? r.as : r.hs;
    out.push({ date: r.date, opp: (usHome ? r.away : r.home).replace(' FC', ''), g, a, res: us > th ? 'w' : us === th ? 'd' : 'l', isGk, conceded }); }
  return out;
}
const POS_XY = { GK: [50, 90], CB: [50, 80], SW: [50, 85], RCB: [64, 81], LCB: [36, 81], RB: [82, 74], LB: [18, 74], RWB: [85, 64], LWB: [15, 64], CDM: [50, 65], DM: [50, 65], RDM: [64, 66], LDM: [36, 66], CM: [50, 50], RCM: [64, 51], LCM: [36, 51], RM: [82, 48], LM: [18, 48], CAM: [50, 36], AM: [50, 36], RAM: [66, 37], LAM: [34, 37], RW: [80, 30], LW: [20, 30], SS: [50, 28], CF: [50, 22], ST: [50, 16] };
function posGroup(pos, gk) { const p = pos || ''; if (gk || /^GK/.test(p)) return 'Goalkeepers'; if (/CB|LB|RB|WB|SW|^DF/.test(p)) return 'Defenders'; if (/DM|CM|AM|LM|RM|MF/.test(p)) return 'Midfielders'; if (/ST|CF|SS|LW|RW|FW/.test(p)) return 'Forwards'; return 'Squad'; }

function Ring({ pct, value, label, sub, on }) {
  const R = 46, C = 2 * Math.PI * R; const off = C * (1 - Math.max(0, Math.min(1, on ? pct : 0)));
  return (<div className="m-ring"><svg className="m-ring__svg" viewBox="0 0 120 120"><circle className="m-ring__track" cx="60" cy="60" r={R} fill="none" strokeWidth="10" /><circle className="m-ring__arc" cx="60" cy="60" r={R} fill="none" strokeWidth="10" strokeDasharray={C} strokeDashoffset={off} transform="rotate(-90 60 60)" /><text className="m-ring__val" x="60" y="60" textAnchor="middle" dominantBaseline="central">{value}</text></svg><span className="m-ring__lbl">{label}</span>{sub ? <span className="m-ring__sub">{sub}</span> : null}</div>);
}
function PageHero({ eyebrow, title, sub, actions }) {
  return (<section className="mp-hero"><div className="m-wrap"><div className="mp-hero__panel m-glass--3"><p className="m-eyebrow m-eyebrow--volt">{eyebrow}</p><h1 className="mp-hero__title">{title}</h1>{sub ? <p className="m-lead mp-hero__sub">{sub}</p> : null}{actions ? <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>{actions}</div> : null}</div></div></section>);
}
function Head({ eyebrow, title, link }) { const r = useReveal();
  return <div className="mh-head m-reveal" ref={r}><div><p className="m-eyebrow">{eyebrow}</p><h2 className="m-h2">{title}</h2></div>{link ? <a className="m-btn m-btn--ghost" href="#" style={{ padding: '12px 20px' }}>{link} <Arrow /></a> : null}</div>;
}
function Modal({ onClose, wide, children }) {
  useEffect(() => { const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; const k = (e) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', k); }; }, [onClose]);
  return (<div className="m-modal" onClick={onClose}><button className="m-modal__close" aria-label="Close" onClick={onClose}>✕</button><div className="m-modal__panel" style={wide ? { width: 'min(1060px,100%)' } : { width: 'min(680px,100%)' }} onClick={(e) => e.stopPropagation()}>{children}</div></div>);
}

/* ══ PLAYER PROFILE, the showpiece (parameterised) ═════════════════════ */
function ProfileCard({ num }) {
  const data = useMemo(() => {
    const squad = window.derivedSquad ? window.derivedSquad(null, '25/26') : [];
    const p = squad.find((x) => x.num === num) || squad[0]; if (!p) return null;
    const log = matchLog(p.num);
    const teamPlayed = (window.getDerivedResults ? window.getDerivedResults() : []).filter((r) => r.kind !== 'walkover').length;
    const wins = log.filter((m) => m.res === 'w').length;
    const teamGf = ((window.RAW_TABLE || []).find((r) => r.us) || {}).gf || 0;
    const goalShare = teamGf ? Math.round((p.goals / teamGf) * 100) : 0;
    const rankIn = (key) => squad.slice().sort((a, b) => (b[key] || 0) - (a[key] || 0)).findIndex((x) => x.num === p.num) + 1;
    const comps = (window.COMPETITIONS || []).filter((c) => c.key !== 'all').map((c) => ({ label: c.label, s: window.derivedPlayerStats(p.num, c.match, '25/26') })).filter((c) => c.s.apps > 0);
    const open = p.goals - p.penaltiesScored - p.setPiecesScored;
    const isGK = !!(p.gk || p.gkApps > 0);
    return { p, log, teamPlayed, wins, photo: photoOf(p.num), goalShare, teamGf, open, comps, isGK, goalRank: rankIn('goals'), assistRank: rankIn('assists'), motmRank: rankIn('motm'), csRank: rankIn('cleanSheets') };
  }, [num]);
  const [ringRef, ringOn] = useOnscreen(); const [barRef, barOn] = useOnscreen();
  if (!data) return null;
  const { p, log, teamPlayed, wins, photo, goalShare, teamGf, open, comps, isGK, goalRank, assistRank, motmRank, csRank } = data;
  const gkApps = p.gkApps || p.apps; const conceded = p.goalsConceded || 0; const cs = p.cleanSheets || 0;
  const cpg = gkApps ? conceded / gkApps : 0; const csRate = gkApps ? cs / gkApps : 0; const pensSaved = p.penaltiesSaved || 0;
  const gpg = p.apps ? p.goalInvolvements / p.apps : 0;

  const rings = isGK ? [
    { label: 'Clean sheet %', value: Math.round(csRate * 100) + '%', pct: csRate, sub: `${cs} of ${gkApps}` },
    { label: 'Conceded / game', value: cpg.toFixed(2), pct: 1 - Math.min(1, cpg / 3), sub: `${conceded} in ${gkApps}` },
    { label: 'Win involvement', value: (teamPlayed ? Math.round(wins / teamPlayed * 100) : 0) + '%', pct: teamPlayed ? wins / teamPlayed : 0, sub: `${wins} of ${teamPlayed} games` },
    { label: 'Availability', value: (teamPlayed ? Math.round(p.apps / teamPlayed * 100) : 0) + '%', pct: teamPlayed ? p.apps / teamPlayed : 0, sub: `${p.apps} of ${teamPlayed}` },
  ] : [
    { label: 'G+A / game', value: gpg.toFixed(2), pct: Math.min(1, gpg / 2), sub: `${p.goalInvolvements} in ${p.apps}` },
    { label: 'Win involvement', value: (teamPlayed ? Math.round(wins / teamPlayed * 100) : 0) + '%', pct: teamPlayed ? wins / teamPlayed : 0, sub: `${wins} of ${teamPlayed} games` },
    { label: 'Availability', value: (teamPlayed ? Math.round(p.apps / teamPlayed * 100) : 0) + '%', pct: teamPlayed ? p.apps / teamPlayed : 0, sub: `${p.apps} of ${teamPlayed}` },
    { label: 'MOTM rate', value: (p.apps ? Math.round(p.motm / p.apps * 100) : 0) + '%', pct: p.apps ? p.motm / p.apps : 0, sub: `${p.motm} awards` },
  ];

  // trend: GK = cumulative clean sheets over matches kept goal; outfield = cumulative G+A
  const tlog = isGK ? log.filter((m) => m.conceded != null) : log;
  const W = 520, H = 120, pad = 8; let cum = 0; const series = tlog.map((m) => (cum += isGK ? (m.conceded === 0 ? 1 : 0) : (m.g + m.a))); const maxCum = Math.max(1, cum);
  const pts = series.map((v, i) => [pad + (series.length <= 1 ? 0 : (i / (series.length - 1)) * (W - 2 * pad)), H - pad - (v / maxCum) * (H - 2 * pad)]);
  const linePath = pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' ');
  const areaPath = pts.length ? `${linePath} L ${pts[pts.length - 1][0].toFixed(1)} ${H - pad} L ${pts[0][0].toFixed(1)} ${H - pad} Z` : '';

  const kpis = isGK
    ? [{ v: p.apps, l: 'Apps' }, { v: cs, l: 'Clean sheets', volt: true }, { v: conceded, l: 'Conceded' }, { v: pensSaved, l: 'Pens saved', volt: true }, { v: p.motm, l: 'MOTM' }, { v: (p.yc || 0) + (p.rc || 0), l: 'Cards' }]
    : [{ v: p.apps, l: 'Apps' }, { v: p.goals, l: 'Goals', volt: true }, { v: p.assists, l: 'Assists', volt: true }, { v: p.goalInvolvements, l: 'G+A' }, { v: p.motm, l: 'MOTM' }, { v: (p.yc || 0) + (p.rc || 0), l: 'Cards' }];

  const dist = [{ name: 'Open play', val: open }, { name: 'Penalties', val: p.penaltiesScored }, { name: 'Set pieces', val: p.setPiecesScored }];
  const impact = isGK
    ? [{ ic: 'shield', v: Math.round(csRate * 100) + '%', t: 'Clean sheet rate', s: `${cs} of ${gkApps}` }, { ic: 'trophy', v: '#' + csRank, t: 'Clean sheet rank', s: 'in the squad' }, { ic: 'pulse', v: cpg.toFixed(2), t: 'Conceded / game', s: `${conceded} conceded` }, { ic: 'star', v: '#' + motmRank, t: 'MOTM rank', s: `${p.motm} awards` }]
    : [{ ic: 'ball', v: goalShare + '%', t: 'Share of club goals', s: `${p.goals} of ${teamGf}` }, { ic: 'trophy', v: '#' + goalRank, t: 'Goalscoring rank', s: goalRank === 1 ? 'club top scorer' : 'in the squad' }, { ic: 'pass', v: '#' + assistRank, t: 'Assist rank', s: 'in the squad' }, { ic: 'star', v: '#' + motmRank, t: 'MOTM rank', s: `${p.motm} awards` }];
  const posTop = (p.positionBreakdown || []).slice(0, 5); const posMax = posTop.length ? posTop[0][1] : 1;
  return (
    <div className="m-pc m-glass">
      <div className="m-pc__top">
        <div className="m-pc__photo m-drift">{photo ? <img src={photo} alt={`${p.first} ${p.last}`} /> : <img className="m-pc__ghost" src="assets/badge/sue-angels-shield.png" alt="" />}</div>
        <div className="m-pc__id"><div className="m-pc__pos"><span className="m-chip m-chip--volt">{isGK ? 'Goalkeeper' : (p.mostPlayedPosition || 'Squad')}</span>{p.captained ? <span className="m-chip">Captain</span> : null}{isGK && csRank === 1 ? <span className="m-chip">Most clean sheets</span> : (!isGK && goalRank === 1 ? <span className="m-chip">Top scorer</span> : null)}</div><h3 className="m-pc__name">{p.last}<span>{p.first}</span></h3></div>
      </div>
      <div className="m-kpis">{kpis.map((k, i) => <div className={`m-kpi ${k.volt ? 'm-kpi--volt' : ''}`} key={i}><b className="m-num"><CountUp value={k.v} on={ringOn} /></b><span>{k.l}</span></div>)}</div>
      <div className="m-panel" ref={ringRef}><p className="m-panel__t">Performance index · 25/26</p><div className="m-grid m-grid--rings">{rings.map((r, i) => <Ring key={i} {...r} on={ringOn} />)}</div></div>
      <div className="m-grid m-grid--2" ref={barRef}>
        {isGK ? (
          <div className="m-panel"><p className="m-panel__t">Defensive record</p><div className="m-bars">
            <div><div className="m-bar__top"><span className="m-bar__name">Clean sheets</span><span className="m-bar__val m-num">{cs}</span></div><div className="m-bar__track"><div className="m-bar__fill" style={{ width: barOn ? csRate * 100 + '%' : 0 }} /></div></div>
            <div><div className="m-bar__top"><span className="m-bar__name">Conceded in</span><span className="m-bar__val m-num">{gkApps - cs}</span></div><div className="m-bar__track"><div className="m-bar__fill" style={{ width: barOn ? (gkApps ? (gkApps - cs) / gkApps * 100 : 0) + '%' : 0 }} /></div></div>
            <div style={{ marginTop: 4 }}><div className="m-bar__top"><span className="m-bar__name">Shutout rate</span><span className="m-bar__val m-num">{Math.round(csRate * 100)}%</span></div><div className="m-bar__track"><div className="m-bar__fill m-bar__fill--soft" style={{ width: barOn ? csRate * 100 + '%' : 0 }} /></div></div>
          </div></div>
        ) : (
          <div className="m-panel"><p className="m-panel__t">Goal breakdown</p><div className="m-bars">{dist.map((d, i) => (<div key={i}><div className="m-bar__top"><span className="m-bar__name">{d.name}</span><span className="m-bar__val m-num">{d.val}</span></div><div className="m-bar__track"><div className="m-bar__fill" style={{ width: barOn ? (p.goals ? (d.val / p.goals) * 100 : 0) + '%' : 0 }} /></div></div>))}<div style={{ marginTop: 4 }}><div className="m-bar__top"><span className="m-bar__name">Goals vs assists</span><span className="m-bar__val m-num">{p.goals}·{p.assists}</span></div><div className="m-bar__track"><div className="m-bar__fill m-bar__fill--soft" style={{ width: barOn ? (p.goalInvolvements ? (p.goals / p.goalInvolvements) * 100 : 0) + '%' : 0 }} /></div></div></div></div>
        )}
        <div className="m-panel"><p className="m-panel__t">Season impact</p><div className="m-srows">{impact.map((r, i) => (<div className="m-srow" key={i}><span className="m-srow__ic">{I[r.ic]}</span><div className="m-srow__tx"><b>{r.v}</b><span>{r.t}</span></div><span className="m-srow__s">{r.s}</span></div>))}</div></div>
      </div>
      <div className="m-grid m-grid--2">
        <div className="m-panel"><p className="m-panel__t">{isGK ? 'Cumulative clean sheets' : 'Cumulative goal involvements'}</p><svg className="m-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"><defs><linearGradient id="mpg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(214,242,58,0.35)" /><stop offset="100%" stopColor="rgba(214,242,58,0)" /></linearGradient></defs><line className="m-spark__grid" x1="0" y1={H - pad} x2={W} y2={H - pad} />{areaPath ? <path className="m-spark__area" d={areaPath} fill="url(#mpg)" /> : null}{linePath ? <path className="m-spark__line" d={linePath} /> : null}{pts.length ? <circle className="m-spark__dot" cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="4" /> : null}</svg></div>
        <div className="m-panel"><p className="m-panel__t">Where they play</p><div className="m-pitch"><svg className="m-pitch__lines" viewBox="0 0 100 125" preserveAspectRatio="none"><rect x="3" y="3" width="94" height="119" rx="3" /><line x1="3" y1="62.5" x2="97" y2="62.5" /><circle cx="50" cy="62.5" r="11" /><rect x="28" y="3" width="44" height="20" /><rect x="28" y="102" width="44" height="20" /></svg>{posTop.map(([pos, n], i) => { const xy = POS_XY[pos] || [50, 50]; const sz = 22 + (n / posMax) * 16; return <span className="m-pitch__node" key={i} style={{ left: xy[0] + '%', top: xy[1] + '%', width: sz, height: sz }}>{pos}<small>{n}×</small></span>; })}</div></div>
      </div>
      {comps.length ? <div className="m-panel"><p className="m-panel__t">By competition · 25/26</p><table className="m-split"><thead>{isGK ? <tr><th>Competition</th><th>Apps</th><th>CS</th><th>Conc</th><th>MOTM</th></tr> : <tr><th>Competition</th><th>Apps</th><th>G</th><th>A</th><th>MOTM</th></tr>}</thead><tbody>{comps.map((c, i) => isGK ? <tr key={i}><td>{c.label}</td><td>{c.s.apps}</td><td className="m-split__hl">{c.s.cleanSheets}</td><td>{c.s.goalsConceded}</td><td>{c.s.motm}</td></tr> : <tr key={i}><td>{c.label}</td><td>{c.s.apps}</td><td className="m-split__hl">{c.s.goals}</td><td className="m-split__hl">{c.s.assists}</td><td>{c.s.motm}</td></tr>)}</tbody></table></div> : null}
      <div className="m-panel"><p className="m-panel__t">Last {Math.min(10, (isGK ? tlog : log).length)} featured</p><div className="m-form">{(isGK ? tlog : log).slice(-10).map((m, i) => (<div className="m-form__cell" key={i}><div className={`m-form__res m-form__res--${m.res}`}>{m.res.toUpperCase()}</div><div className="m-form__ga">{isGK ? (m.conceded === 0 ? 'CS' : `${m.conceded} conc`) : (m.g || m.a ? `${m.g}G ${m.a}A` : '·')}</div><div className="m-form__opp">{m.opp}</div></div>))}</div></div>
    </div>
  );
}

/* ══ HOME ═══════════════════════════════════════════════════════════════ */
function useCountdown(targetISO) { const [now, setNow] = useState(0); useEffect(() => { setNow(Date.now()); const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []); if (!now || !targetISO) return null; let diff = Math.max(0, new Date(targetISO).getTime() - now); const d = Math.floor(diff / 864e5); diff -= d * 864e5; const h = Math.floor(diff / 36e5); diff -= h * 36e5; const m = Math.floor(diff / 6e4); return { d, h, m }; }
function ResCard({ r }) {
  const usHome = r.home.includes('Angels'); const us = usHome ? r.hs : r.as, th = usHome ? r.as : r.hs;
  let res = 'l'; if (r.kind === 'walkover') res = 'w'; else if (us > th) res = 'w'; else if (us === th) res = 'd'; const Badge = window.TeamBadge;
  return (<div className="mh-res"><div className="mh-res__top"><span className={`mh-wdl mh-wdl--${res}`}>{res.toUpperCase()}</span><span className="mh-res__date">{r.date}</span></div><div className={`mh-res__row ${usHome && res === 'w' ? 'mh-res__row--win' : ''}`}>{Badge ? <Badge team={r.home} size={27} /> : null}<span>{r.home.replace(' FC', '')}</span><b>{r.kind === 'walkover' ? (usHome ? 'W' : '-') : r.hs}</b></div><div className={`mh-res__row ${!usHome && res === 'w' ? 'mh-res__row--win' : ''}`}>{Badge ? <Badge team={r.away} size={27} /> : null}<span>{r.away.replace(' FC', '')}</span><b>{r.kind === 'walkover' ? (!usHome ? 'W' : '-') : r.as}</b></div><div className="mh-res__comp">{(r.competition || 'League Ten')} · {usHome ? 'Home' : 'Away'}</div></div>);
}
function Home({ go }) {
  const t = teamTotals(); const all = allCompTotals();
  const next = window.getActiveUpcoming ? (window.getActiveUpcoming()[0] || null) : null;
  const session = !next && window.getNextSession ? window.getNextSession() : null;
  const kickoff = useMemo(() => { if (next && window.getFixtureDate) { const dt = window.getFixtureDate(next); if (dt) { const [hh, mm] = (next.kick || '11:00').split(':').map((n) => parseInt(n, 10)); dt.setHours(hh || 11, mm || 0, 0, 0); return dt.toISOString(); } } if (session) return session.startISO; return (window.SEASON_INFO && window.SEASON_INFO.next) ? window.SEASON_INFO.next.startISO : null; }, []);
  const cd = useCountdown(kickoff); const pad = (n) => String(n).padStart(2, '0'); const ord = t.pos === 1 ? 'st' : t.pos === 2 ? 'nd' : t.pos === 3 ? 'rd' : 'th';
  const squad = (window.SQUAD || []).length;
  const form = useMemo(() => { const lg = (window.getDerivedResults ? window.getDerivedResults() : []).filter((r) => (r.competition || '').toLowerCase().includes('league')); lg.sort((a, b) => pdate(b.date) - pdate(a.date)); return lg.slice(0, 5).reverse().map((r) => { if (r.kind === 'walkover') return 'w'; const uh = r.home.includes('Angels'); const us = uh ? r.hs : r.as, th = uh ? r.as : r.hs; return us > th ? 'w' : us === th ? 'd' : 'l'; }); }, []);
  const Badge = window.TeamBadge; const imgRef = useRef(null); const [dRef, dOn] = useOnscreen(); const [lRef, lOn] = useOnscreen();
  useEffect(() => { if (RM()) return; const img = imgRef.current; if (!img) return; let raf; const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { const y = Math.min(window.scrollY, 800); img.style.transform = `translateY(${y * 0.14}px) scale(1.06)`; }); }; window.addEventListener('scroll', onScroll, { passive: true }); onScroll(); return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); }; }, []);
  const R = 92, C = 2 * Math.PI * R; const ringOff = C * (1 - (lOn ? all.winPct / 100 : 0));
  const results = (window.getDerivedResults ? window.getDerivedResults() : []).slice(0, 8);
  const rows = (window.RAW_TABLE || []).slice(0, 6);
  const ledTiles = [{ v: all.pl, l: 'Played' }, { v: all.w, l: 'Won', volt: true }, { v: all.d, l: 'Drawn' }, { v: all.l, l: 'Lost' }, { v: all.gf, l: 'Goals for', volt: true }, { v: all.ga, l: 'Against' }, { v: (all.gd >= 0 ? '+' : '') + all.gd, l: 'Goal diff' }, { v: all.cs, l: 'Clean sheets', volt: true }];
  return (
    <React.Fragment>
      <section className="mh-hero">
        <div className="mh-hero__photo"><img ref={imgRef} src="assets/hero-team.jpg" alt="" /></div><div className="mh-hero__scrim" />
        <div className="m-wrap" ref={dRef}>
          <div className="mh-htop">
            <div className="mh-copy"><p className="m-eyebrow m-eyebrow--volt">What we do in life echoes in eternity</p><h1 className="mh-title">Sue's Angels<em>FC</em></h1><p className="mh-tag">Built in memory. Driven by purpose.</p><p className="m-lead mh-hsub">In memory of Susan Anne Martin. Played {t.pl}, won {t.w}{t.l === 0 ? ', unbeaten in League Ten' : ''}.</p>
              <div className="mh-routes"><button className="mh-route mp-clickable" onClick={() => go('schedule')}><span className="mh-route__ic">{I.cal}</span><b>Fixtures</b><span>Upcoming matches</span></button><button className="mh-route mp-clickable" onClick={() => go('schedule')}><span className="mh-route__ic">{I.trophy}</span><b>Results</b><span>Scores & reports</span></button><button className="mh-route mp-clickable" onClick={() => go('media')}><span className="mh-route__ic">{I.photo}</span><b>Gallery</b><span>Matchday photos</span></button></div>
            </div>
            <div className="mh-nm2"><div className="mh-nm2__head"><span>{next ? 'Next match' : 'Next session'}</span>{I.cal}</div>
              {next ? <div className="mh-nm2__teams"><div className="mh-nm2__team">{Badge ? <Badge team={next.home} size={52} /> : null}<b>{next.home.replace(' FC', '')}</b></div><span className="mh-nm2__vs">VS</span><div className="mh-nm2__team">{Badge ? <Badge team={next.away} size={52} /> : null}<b>{next.away.replace(' FC', '')}</b></div></div>
                : <div className="mh-nm2__teams" style={{ gridTemplateColumns: '1fr' }}><div className="mh-nm2__team"><img src="assets/badge/sue-angels-shield.png" alt="" /><b>{session ? (session.title || 'Pre-season training') : '26/27 season'}</b></div></div>}
              <div className="mh-nm2__rows">{next ? <React.Fragment><div className="mh-nm2__row">{I.cal}<span>{next.date === 'TBC' ? 'Date TBC' : `${next.day || ''} ${next.date} ${next.mon || ''}`.trim()}</span></div><div className="mh-nm2__row">{I.clock}<span>{(!next.kick || next.kick === 'TBC') ? 'Kick-off TBC' : `${next.kick} KO`}</span></div></React.Fragment>
                : session ? <React.Fragment><div className="mh-nm2__row">{I.cal}<span>{session.dayName} {session.dateStr}</span></div><div className="mh-nm2__row">{I.clock}<span>{session.timeStr}</span></div><div className="mh-nm2__row">{I.pin}<span>{session.venue}</span></div></React.Fragment> : null}
                {cd ? <div className="mh-nm2__cd"><span className="mh-nm2__dot" />{cd.d > 0 ? cd.d + 'D ' : ''}{pad(cd.h)}H {pad(cd.m)}M TO KICK-OFF</div> : null}</div>
              <button className="m-btn m-btn--volt" style={{ justifyContent: 'center' }} onClick={() => go('schedule')}>View fixtures <Arrow /></button>
            </div>
          </div>
          <div className="mh-dash">
            <div className="mh-dcard"><div className="mh-dcard__head"><span>Season record</span>{I.chart}</div><div className="mh-dcard__tag">League Ten · 25/26</div><div style={{ marginTop: 8 }}><div className="mh-drow"><span>Played</span><b><CountUp value={t.pl} on={dOn} /></b></div><div className="mh-drow"><span>Won</span><b><CountUp value={t.w} on={dOn} /></b></div><div className="mh-drow"><span>Drawn</span><b><CountUp value={t.d} on={dOn} /></b></div><div className="mh-drow"><span>Lost</span><b><CountUp value={t.l} on={dOn} /></b></div></div><div className="mh-dbig"><span>Goals scored</span><b><CountUp value={t.gf} on={dOn} /></b></div></div>
            <div className="mh-dcard"><div className="mh-dcard__head"><span>League position</span>{I.medal}</div><div className="mh-dpos"><b>{t.pos}</b><sup>{ord}</sup></div><div className="mh-dcard__tag">League Ten</div><div className="mh-dptrow"><span>Points</span><b>{t.pts} / {t.pl * 3}</b></div><div className="mh-dbar"><i style={{ width: dOn ? ((t.pl ? t.pts / (t.pl * 3) : 0) * 100) + '%' : 0 }} /></div><div className="mh-dform"><span>Form</span><div className="mh-dform__dots">{form.map((f, i) => <span key={i} className={`mh-fdot mh-fdot--${f}`}>{f.toUpperCase()}</span>)}</div></div></div>
            <div className="mh-dcard"><div className="mh-dcard__head"><span>Club stats</span>{I.people}</div><div style={{ marginTop: 8 }}><div className="mh-drow"><span>Founded</span><b>2025</b></div><div className="mh-drow"><span>Squad</span><b>{squad}</b></div><div className="mh-drow"><span>Goal difference</span><b>{t.gd >= 0 ? '+' : ''}{t.gd}</b></div></div><div className="mh-dcard__sp" /><button className="m-btn m-btn--ghost" style={{ justifyContent: 'center' }} onClick={() => go('about')}>Our story <Arrow /></button></div>
          </div>
        </div>
      </section>
      <section className="mh-sec" id="ledger"><div className="m-wrap"><Head eyebrow="All competitions · 25/26" title="The campaign" link="Champions" />
        <div className="mh-ledger" ref={lRef}>
          <div className="m-glass mh-ledger__hero"><div className="mh-bigring"><svg viewBox="0 0 220 220"><circle className="mh-bigring__c" cx="110" cy="110" r={R} fill="none" strokeWidth="16" /><circle className="mh-bigring__a" cx="110" cy="110" r={R} fill="none" strokeWidth="16" strokeDasharray={C} strokeDashoffset={ringOff} transform="rotate(-90 110 110)" /></svg><div className="mh-bigring__txt"><div className="mh-bigring__pct"><CountUp value={all.winPct} suffix="%" on={lOn} /></div><div className="mh-bigring__lbl">Win rate</div></div></div><p className="m-chip m-chip--volt" style={{ marginTop: 22 }}>{all.l === 0 ? 'Unbeaten' : `${all.w}W ${all.d}D ${all.l}L`} · all comps</p></div>
          <div className="mh-ledger__tiles">{ledTiles.map((x, i) => <div className={`mh-ltile ${x.volt ? 'mh-ltile--volt' : ''}`} key={i}><b className="m-num"><CountUp value={typeof x.v === 'number' ? x.v : parseInt(x.v, 10)} prefix={typeof x.v === 'string' && x.v[0] === '+' ? '+' : ''} on={lOn} /></b><span>{x.l}</span></div>)}</div>
        </div>
      </div></section>
      <section className="mh-sec" style={{ paddingTop: 0 }}><div className="m-wrap"><Head eyebrow="Match centre" title="Recent results" link="All results" /><div className="mh-rail">{results.map((r) => <ResCard key={r.id} r={r} />)}</div></div></section>
      <section className="mh-sec" style={{ paddingTop: 0 }}><div className="m-wrap"><Head eyebrow="League Ten" title="The table" link="Full table" /><div className="m-glass mh-table-wrap"><table className="mh-table"><thead><tr><th>#</th><th>Club</th><th>P</th><th>W</th><th>GD</th><th>PTS</th></tr></thead><tbody>{rows.map((r, i) => <tr key={r.c} className={`${r.us ? 'is-us' : ''} ${i === 1 ? 'is-promo2' : ''}`}><td className="mh-table__pos">{r.p}</td><td><span className="mh-table__club">{Badge ? <Badge team={r.c} size={25} /> : null}{r.c.replace(' FC', '')}</span></td><td>{r.pl}</td><td>{r.w}</td><td>{r.gd}</td><td className="mh-table__pts">{r.pts}</td></tr>)}</tbody></table></div></div></section>
      <Join go={go} />
    </React.Fragment>
  );
}
function Join({ go }) { const r = useReveal(); return (<section className="mh-sec" style={{ paddingTop: 0 }}><div className="m-wrap"><div className="mh-join m-reveal" ref={r}><p className="m-eyebrow m-eyebrow--volt" style={{ justifyContent: 'center', display: 'inline-flex' }}>26/27 · The next chapter</p><h2 className="m-h2" style={{ marginTop: 14 }}>Pull on the shirt.</h2><p className="m-lead">Trials, volunteering, media and sponsorship. All open for the new season.</p><div className="mh-join__ctas"><button className="m-btn m-btn--volt" onClick={() => go('contact')}>Join the club <Arrow /></button><button className="m-btn m-btn--ghost" onClick={() => go('contact')}>Get in touch</button></div></div></div></section>); }

/* ══ ABOUT ══════════════════════════════════════════════════════════════ */
function About({ go }) {
  const recs = useMemo(() => { const g = window.derivedSquadBy ? window.derivedSquadBy('goals')[0] : null; const a = window.derivedSquadBy ? window.derivedSquadBy('assists')[0] : null; const cs = window.derivedSquadBy ? window.derivedSquadBy('cleanSheets')[0] : null; const apps = window.derivedSquad ? window.derivedSquad(null, '25/26').slice().sort((x, y) => y.apps - x.apps)[0] : null; let big = null; for (const r of (window.getDerivedResults ? window.getDerivedResults() : [])) { if (r.kind === 'walkover') continue; const uh = r.home.includes('Angels'); const us = uh ? r.hs : r.as, th = uh ? r.as : r.hs; if (us == null) continue; const gd = us - th; if (gd > 0 && (!big || gd > big.gd)) big = { gd, us, th, opp: (uh ? r.away : r.home).replace(' FC', '') }; } return { g, a, cs, apps, big }; }, []);
  const records = [recs.g && { n: recs.g.goals, l: 'Top scorer', who: `${recs.g.first} ${recs.g.last}` }, recs.a && { n: recs.a.assists, l: 'Most assists', who: `${recs.a.first} ${recs.a.last}` }, recs.apps && { n: recs.apps.apps, l: 'Most apps', who: `${recs.apps.first} ${recs.apps.last}` }, recs.cs && { n: recs.cs.cleanSheets, l: 'Clean sheets', who: `${recs.cs.first} ${recs.cs.last}` }, recs.big && { n: `${recs.big.us}-${recs.big.th}`, l: 'Biggest win', who: `vs ${recs.big.opp}` }, { n: 1, l: 'Trophies', who: 'League Ten 25/26' }].filter(Boolean);
  const journey = [['Sep 25', 'Founded · opening win', 'First competitive fixture, 21 Sept 2025. 5-0 vs Pure Football. The project is alive.'], ['Jan 26', '12-0 at Balham', 'Travelled to Balham and dropped a dozen. The performance that made the league sit up.'], ['Apr 26', 'Title confirmed', 'Beat Sporting Club Catania 10-1 at home. League Ten clinched with games to spare.'], ['May 26', 'Unbeaten. Champions.', 'Inaugural season finished with the title and a 100% league record.'], ['Sep 26', 'Promoted · 26/27', 'New division. Same standard. Trials open over the summer.']];
  const values = [['Discipline', 'Standards on and off the pitch. Earn the shirt every week.'], ['Brotherhood', 'A football family bound by respect and resilience.'], ['Remembrance', 'Everything we do honours the memory of Susan Anne Martin.'], ['Ambition', 'Champions in year one. We look ahead with hunger.']];
  return (<React.Fragment>
    <PageHero eyebrow="The story" title={<>Built in <em>her</em> name.</>} sub="Founded in 2025 in memory of Susan Anne Martin. League Ten champions, first season, unbeaten." actions={<><button className="m-btn m-btn--volt" onClick={() => go('champions')}>The 25/26 story <Arrow /></button><button className="m-btn m-btn--ghost" onClick={() => go('contact')}>Get involved</button></>} />
    <section className="mp-sec"><div className="m-wrap"><div className="m-glass" style={{ padding: 'clamp(24px,3vw,40px)' }}><p className="m-eyebrow m-eyebrow--volt">Why we exist</p><blockquote style={{ font: '600 clamp(1.6rem,3.4vw,2.8rem)/1.15 var(--m-display)', letterSpacing: '-0.03em', margin: '16px 0 0' }}>"What we do in life echoes in eternity."</blockquote><p className="m-lead" style={{ marginTop: 14 }}>A club that means something on the pitch and off it. That's the whole idea.</p></div></div></section>
    <section className="mp-sec" style={{ paddingTop: 0 }}><div className="m-wrap"><Head eyebrow="On the field" title="The record" /><div className="mp-grid mp-g3">{records.map((r, i) => <div className="mh-ltile" key={i}><b className="m-num">{r.n}</b><span>{r.l}</span><div style={{ marginTop: 8, color: 'var(--m-ink-3)', font: '600 0.74rem var(--m-sans)' }}>{r.who}</div></div>)}</div></div></section>
    <section className="mp-sec" style={{ paddingTop: 0 }}><div className="m-wrap"><Head eyebrow="25/26" title="How it happened" /><div className="mp-rail">{journey.map(([y, t, c], i) => <div className="mp-tl" key={i}><div className="mp-tl__top"><span className="mp-tl__y">{y}</span><span className="m-chip m-chip--volt">{String(i + 1).padStart(2, '0')}</span></div><div className="mp-tl__t">{t}</div><p className="mp-tl__c">{c}</p></div>)}</div></div></section>
    <section className="mp-sec" style={{ paddingTop: 0 }}><div className="m-wrap"><div className="mp-split"><div className="m-glass" style={{ minHeight: 280, borderRadius: 'var(--m-radius)', overflow: 'hidden', padding: 0 }}><img src="assets/hero-team.jpg" alt="The squad" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /></div><div><p className="m-eyebrow m-eyebrow--volt">Off the field · Sue's story</p><h2 className="m-h2" style={{ marginTop: 12 }}>Why we play.</h2><div className="m-prose"><p>Founded and led by Stephen Epathite, Sue's Angels FC was built on football, friendship and togetherness, honouring the life and memory of Susan Anne Martin.</p><p>Following Sue's passing from sepsis in 2020, the club raises awareness through charity matches and community initiatives, keeping her memory at the heart of everything.</p></div><div style={{ marginTop: 22 }}><a className="m-btn m-btn--volt" href="https://sepsistrust.org" target="_blank" rel="noopener">Learn the signs <Arrow /></a></div></div></div></div></section>
    <section className="mp-sec" style={{ paddingTop: 0 }}><div className="m-wrap"><Head eyebrow="What we stand for" title="Club values" /><div className="mp-grid mp-g4">{values.map(([t, c], i) => <div className="mp-feat" key={i}><div className="mp-feat__n">{String(i + 1).padStart(2, '0')}</div><h3 className="m-h3">{t}</h3><p>{c}</p></div>)}</div></div></section>
    <Join go={go} />
  </React.Fragment>);
}

/* ══ CHAMPIONS ══════════════════════════════════════════════════════════ */
function Champions({ go }) {
  const t = teamTotals(); const [ref, on] = useOnscreen(); const gpg = t.pl ? t.gf / t.pl : 0; const maxPts = t.pl * 3;
  const league = (window.getDerivedResults ? window.getDerivedResults() : []).filter((r) => (r.competition || '').toLowerCase().includes('league'));
  let cs = 0; for (const r of league) { const uh = r.home.includes('Angels'); const th = uh ? r.as : r.hs; if (r.kind !== 'walkover' && th === 0) cs++; }
  const rings = [{ label: 'Win rate', value: t.winPct + '%', pct: t.winPct / 100, sub: `${t.w}W ${t.d}D ${t.l}L` }, { label: 'Points won', value: t.pts, pct: maxPts ? t.pts / maxPts : 0, sub: `of ${maxPts}` }, { label: 'Goals / game', value: gpg.toFixed(1), pct: Math.min(1, gpg / 4), sub: `${t.gf} in ${t.pl}` }, { label: 'Clean sheets', value: cs, pct: t.pl ? cs / t.pl : 0, sub: `in ${t.pl}` }];
  const record = [['Played', t.pl], ['Won', t.w], ['Drawn', t.d], ['Lost', t.l], ['Goals for', t.gf], ['Against', t.ga], ['Goal diff', (t.gd >= 0 ? '+' : '') + t.gd], ['Points', t.pts]];
  const insights = [['trophy', t.l === 0 ? 'Unbeaten champions' : 'League Ten champions', `${t.pl} league games, ${t.l} defeats`], ['pulse', `${t.gf} goals scored`, `${gpg.toFixed(1)} per game, the best in the division`], ['shield', `${t.ga} conceded`, `${cs} clean sheet${cs === 1 ? '' : 's'} kept`]];
  return (<React.Fragment>
    <PageHero eyebrow="League Ten · 25/26" title={<>Champ<em>ions</em>.</>} sub={`${t.l === 0 ? 'Unbeaten in our inaugural season.' : ''} ${t.pl} played · ${t.w} won · ${t.gf} scored · ${t.ga} conceded.`} actions={<button className="m-btn m-btn--volt" onClick={() => go('schedule')}>League results <Arrow /></button>} />
    <section className="mp-sec"><div className="m-wrap" ref={ref}><Head eyebrow="League Ten · 25/26" title="The season in numbers" />
      <div className="mp-grid mp-g4">{rings.map((r, i) => <Ring key={i} {...r} on={on} />)}</div>
      <div className="m-grid m-grid--2" style={{ marginTop: 16 }}>
        <div className="m-glass" style={{ padding: 'clamp(20px,2.4vw,30px)' }}><p className="m-panel__t">Final league record</p><div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>{record.map(([l, v]) => <div className="mh-ltile" key={l} style={{ textAlign: 'center' }}><b className="m-num">{v}</b><span>{l}</span></div>)}</div></div>
        <div className="m-glass" style={{ padding: 'clamp(20px,2.4vw,30px)' }}><p className="m-panel__t">What it took</p><div className="m-srows">{insights.map((it, i) => <div className="m-srow" key={i}><span className="m-srow__ic">{I[it[0]]}</span><div className="m-srow__tx"><span style={{ fontWeight: 700, color: 'var(--m-ink-1)' }}>{it[1]}</span></div><span className="m-srow__s">{it[2]}</span></div>)}</div></div>
      </div>
    </div></section>
    <section className="mp-sec" style={{ paddingTop: 0 }}><div className="m-wrap"><Head eyebrow="Every game" title="League results" link="All results" /><div className="mh-rail">{league.slice(0, 8).map((r) => <ResCard key={r.id} r={r} />)}</div></div></section>
    <Join go={go} />
  </React.Fragment>);
}

/* ══ TEAM ═══════════════════════════════════════════════════════════════ */
function Leaderboard() {
  const seasons = ['all', ...(window.ALL_SEASONS || ['25/26'])]; const comps = window.COMPETITIONS || [{ key: 'all', label: 'All', match: () => true }];
  const [season, setSeason] = useState(window.CURRENT_SEASON || '25/26'); const [comp, setComp] = useState('all');
  const rows = useMemo(() => { const matcher = comp === 'all' ? null : (comps.find((c) => c.key === comp) || {}).match; const list = window.derivedSquad ? window.derivedSquad(matcher, season === 'all' ? 'all' : season) : []; return list.filter((p) => p.apps > 0).sort((a, b) => (b.goalInvolvements - a.goalInvolvements) || (b.goals - a.goals) || (b.apps - a.apps)); }, [season, comp]);
  return (<div><div className="mp-subtabs">{seasons.map((s) => <button key={s} className={`mp-subtab ${season === s ? 'is-active' : ''}`} onClick={() => setSeason(s)}>{s === 'all' ? 'All seasons' : s}</button>)}</div><div className="mp-subtabs">{comps.map((c) => <button key={c.key} className={`mp-subtab ${comp === c.key ? 'is-active' : ''}`} onClick={() => setComp(c.key)}>{c.label}</button>)}</div>
    <div className="m-glass" style={{ padding: '8px 8px 4px', overflowX: 'auto' }}><table className="mp-ltable"><thead><tr><th>#</th><th>Player</th><th>Apps</th><th>G</th><th>A</th><th>G+A</th><th>MOTM</th></tr></thead><tbody>{rows.length ? rows.map((p, i) => <tr key={p.num} className={i === 0 ? 'is-top' : ''}><td className="mp-ltable__rank">{i + 1}</td><td><span className="mp-ltable__name"><i>{(p.first || ' ')[0]}.</i>{p.last}</span></td><td>{p.apps}</td><td>{p.goals}</td><td>{p.assists}</td><td className="mp-ltable__ga">{p.goalInvolvements}</td><td>{p.motm}</td></tr>) : <tr><td className="mp-ltable__empty" colSpan="7">No appearances for this filter yet.</td></tr>}</tbody></table></div></div>);
}
function Team({ go }) {
  const [tab, setTab] = useState('squad'); const [profile, setProfile] = useState(null); const [coach, setCoach] = useState(null);
  const [statusTick, setStatusTick] = useState(0);
  useEffect(() => { const h = () => setStatusTick((n) => n + 1); window.addEventListener('sa-roster-changed', h); window.addEventListener('sa-media-changed', h); return () => { window.removeEventListener('sa-roster-changed', h); window.removeEventListener('sa-media-changed', h); }; }, []);
  const allSquad = useMemo(() => (window.derivedSquad ? window.derivedSquad(null, '25/26') : []), [statusTick]);
  const playerStatus = window.getPlayerStatus ? window.getPlayerStatus() : {};
  const squad = useMemo(() => allSquad.filter((p) => !playerStatus[p.num]), [allSquad, statusTick]);
  const departed = useMemo(() => allSquad.filter((p) => playerStatus[p.num]), [allSquad, statusTick]);
  const buildGroups = (arr) => { const order = ['Goalkeepers', 'Defenders', 'Midfielders', 'Forwards', 'Squad']; const map = {}; arr.forEach((p) => { const g = posGroup(p.mostPlayedPosition, p.gk); (map[g] = map[g] || []).push(p); }); Object.values(map).forEach((a) => a.sort((x, y) => y.goalInvolvements - x.goalInvolvements || y.apps - x.apps)); return order.filter((g) => map[g] && map[g].length).map((g) => [g, map[g]]); };
  const groups = useMemo(() => buildGroups(squad), [squad]);
  const departedGroups = useMemo(() => buildGroups(departed), [departed]);
  const squadCards = (grps) => grps.map(([g, list]) => (<div key={g}><div className="mp-posgroup">{g}</div><div className="mp-grid mp-g4">{list.map((p) => { const ph = photoOf(p.num); return (<button className="mp-player mp-clickable" key={p.num} onClick={() => setProfile(p.num)}><div className={`mp-player__img ${ph ? '' : 'mp-player__img--ghost'}`}>{ph ? <img src={ph} alt={`${p.first} ${p.last}`} /> : <img src="assets/badge/sue-angels-shield.png" alt="" />}</div><div className="mp-player__scrim" /><span className="m-chip m-chip--volt mp-player__pos">{p.gk ? 'GK' : (p.mostPlayedPosition || 'SQUAD')}</span><div className="mp-player__body"><div className="mp-player__name">{p.last}<span>{p.first}</span></div><div className="mp-player__stats">{p.gk ? <><div><b>{p.apps}</b><span>Apps</span></div><div><b>{p.cleanSheets}</b><span>CS</span></div><div><b>{p.motm}</b><span>MOTM</span></div></> : <><div><b>{p.apps}</b><span>Apps</span></div><div><b>{p.goals}</b><span>Goals</span></div><div><b>{p.assists}</b><span>Assists</span></div></>}</div></div></button>); })}</div></div>));
  const coaches = window.COACHES || [];
  const tt = allCompTotals();
  return (<React.Fragment>
    <PageHero eyebrow="First team" title={<>The <em>squad</em>.</>} sub="Position-grouped cards, leaderboards and coaches. Tap any player for their full analytics profile." />
    <section className="mp-sec"><div className="m-wrap">
      <div className="mp-subtabs">{[['squad', 'First team'], ['leaders', 'Leaderboards'], ['coaches', 'Coaches'], ['stats', 'Team stats']].concat(departed.length ? [['past', 'Past players']] : []).map(([k, l]) => <button key={k} className={`mp-subtab ${tab === k ? 'is-active' : ''}`} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === 'squad' ? groups.map(([g, list]) => (<div key={g}><div className="mp-posgroup">{g}</div><div className="mp-grid mp-g4">{list.map((p) => { const ph = photoOf(p.num); return (<button className="mp-player mp-clickable" key={p.num} onClick={() => setProfile(p.num)}><div className={`mp-player__img ${ph ? '' : 'mp-player__img--ghost'}`}>{ph ? <img src={ph} alt={`${p.first} ${p.last}`} /> : <img src="assets/badge/sue-angels-shield.png" alt="" />}</div><div className="mp-player__scrim" /><span className="m-chip m-chip--volt mp-player__pos">{p.gk ? 'GK' : (p.mostPlayedPosition || 'SQUAD')}</span><div className="mp-player__body"><div className="mp-player__name">{p.last}<span>{p.first}</span></div><div className="mp-player__stats">{p.gk ? <><div><b>{p.apps}</b><span>Apps</span></div><div><b>{p.cleanSheets}</b><span>CS</span></div><div><b>{p.motm}</b><span>MOTM</span></div></> : <><div><b>{p.apps}</b><span>Apps</span></div><div><b>{p.goals}</b><span>Goals</span></div><div><b>{p.assists}</b><span>Assists</span></div></>}</div></div></button>); })}</div></div>))
        : tab === 'leaders' ? <Leaderboard />
          : tab === 'coaches' ? <div className="mp-grid mp-g3">{coaches.length ? coaches.map((c, i) => <button className="mp-coach mp-clickable" key={i} onClick={() => setCoach(c)}><img className="mp-coach__ph" src={c.photo || 'assets/players/avatar.svg'} alt="" onError={(e) => { e.target.src = 'assets/players/avatar.svg'; }} /><div><b>{c.name}</b><span>{c.role}</span></div></button>) : <p className="m-lead">Coach profiles publish from the CMS.</p>}</div>
            : tab === 'past' ? squadCards(departedGroups)
            : <div className="mp-grid mp-g4">{[['Played', tt.pl], ['Won', tt.w], ['Goals for', tt.gf], ['Against', tt.ga], ['Goal diff', (tt.gd >= 0 ? '+' : '') + tt.gd], ['Clean sheets', tt.cs], ['Win rate', tt.winPct + '%'], ['Squad', squad.length]].map(([l, v], i) => <div className="mh-ltile" key={i}><b className="m-num">{v}</b><span>{l}</span></div>)}</div>}
    </div></section>
    {profile != null ? <Modal wide onClose={() => setProfile(null)}><ProfileCard num={profile} /></Modal> : null}
    {coach ? <Modal onClose={() => setCoach(null)}><div className="m-glass m-modal__sponsor"><div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}><img className="mp-coach__ph" style={{ width: 88, height: 88 }} src={coach.photo || 'assets/players/avatar.svg'} alt="" onError={(e) => { e.target.src = 'assets/players/avatar.svg'; }} /><div><p className="m-eyebrow m-eyebrow--volt">{coach.role}</p><h2 className="m-h2" style={{ marginTop: 8, fontSize: '2rem' }}>{coach.name}</h2></div></div><div className="m-prose" style={{ marginTop: 18 }}>{(coach.bio || []).map((b, i) => <p key={i}>{b}</p>)}</div>{coach.managed ? <div style={{ marginTop: 18 }}><p className="m-eyebrow">Managed</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>{coach.managed.map((m) => <span className="m-chip" key={m}>{m}</span>)}</div></div> : null}</div></Modal> : null}
  </React.Fragment>);
}

/* ══ SCHEDULE ═══════════════════════════════════════════════════════════ */
function LeagueTable() {
  const [season, setSeason] = useState('25/26'); const rows = window.RAW_TABLE || []; const Badge = window.TeamBadge;
  return (<div><div className="mp-subtabs"><button className={`mp-subtab ${season === '25/26' ? 'is-active' : ''}`} onClick={() => setSeason('25/26')}>League Ten · 25/26</button><button className={`mp-subtab ${season === '26/27' ? 'is-active' : ''}`} onClick={() => setSeason('26/27')}>League Eight · 26/27</button></div>
    {season === '25/26' ? <div className="m-glass" style={{ padding: '8px 8px 4px', overflowX: 'auto' }}><table className="mh-table mh-table--full"><thead><tr><th className="mh-table__crumb"></th><th>#</th><th>Club</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>PTS</th></tr></thead><tbody>{rows.map((r, i) => <tr key={r.c} className={`${r.us ? 'is-us is-promo' : ''} ${i === 1 ? 'is-promo2' : ''}`}><td className="mh-table__crumb"><span /></td><td className="mh-table__pos">{r.p}</td><td><span className="mh-table__club">{Badge ? <Badge team={r.c} size={25} /> : null}{r.c.replace(' FC', '')}</span></td><td>{r.pl}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td><td>{r.gf}</td><td>{r.ga}</td><td>{r.gd}</td><td className="mh-table__pts">{r.pts}</td></tr>)}</tbody></table></div>
      : <React.Fragment>
        <div className="m-glass" style={{ padding: 'clamp(20px,2.4vw,30px)', marginBottom: 16 }}><span className="m-chip m-chip--volt">Draft line-up</span><p className="m-lead" style={{ marginTop: 12 }}>Promoted into League Eight for 26/27. The provisional line-up is below, with one place still to be confirmed. Fixtures and standings land before kick-off.</p></div>
        <div className="m-glass" style={{ padding: '8px 8px 4px', overflowX: 'auto' }}><table className="mh-table"><thead><tr><th className="mh-table__crumb"></th><th>Club</th></tr></thead><tbody>{['Barnes Stormers', 'Bristol City (London) Supporters', 'Haydons Park', 'Junction Elite 4th Team', 'Olympique Mayonnaise', "Sue's Angels FC", 'Three Little Birds FC', 'TSM Rovers FC', 'Tyne & Thames FC'].map((c) => <tr key={c} className={c.includes('Angels') ? 'is-us is-promo' : ''}><td className="mh-table__crumb"><span /></td><td><span className="mh-table__club">{Badge ? <Badge team={c} size={25} /> : null}{c.replace(' FC', '')}</span></td></tr>)}<tr><td className="mh-table__crumb"><span /></td><td><span className="mh-table__club" style={{ color: 'var(--m-ink-3)', fontStyle: 'italic' }}>Vacancy, to be confirmed</span></td></tr></tbody></table></div>
      </React.Fragment>}</div>);
}
function Schedule({ go }) {
  const [tab, setTab] = useState(window.SA_TAB || 'results'); const [comp, setComp] = useState('all');
  const comps = window.COMPETITIONS || [{ key: 'all', label: 'All', match: () => true }];
  const matcher = comp === 'all' ? () => true : (comps.find((c) => c.key === comp) || { match: () => true }).match;
  const results = (window.getDerivedResults ? window.getDerivedResults() : []).filter((r) => matcher(r.competition));
  const fixtures = window.getActiveUpcoming ? window.getActiveUpcoming() : [];
  return (<React.Fragment>
    <PageHero eyebrow="Matchday" title={<>The <em>schedule</em>.</>} sub="Every result across league and cups, the full table, and upcoming fixtures." />
    <section className="mp-sec"><div className="m-wrap">
      <div className="mp-subtabs">{[['results', `Results (${(window.getDerivedResults ? window.getDerivedResults() : []).length})`], ['table', 'League table'], ['fixtures', `Fixtures (${fixtures.length})`]].map(([k, l]) => <button key={k} className={`mp-subtab ${tab === k ? 'is-active' : ''}`} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === 'results' ? <React.Fragment><div className="mp-subtabs">{comps.map((c) => <button key={c.key} className={`mp-subtab ${comp === c.key ? 'is-active' : ''}`} onClick={() => setComp(c.key)}>{c.label}</button>)}</div><div className="mp-grid mp-g4">{results.map((r) => <ResCard key={r.id} r={r} />)}</div></React.Fragment>
        : tab === 'table' ? <LeagueTable />
          : (fixtures.length ? <div className="mp-grid mp-g4">{fixtures.map((f, i) => <div className="mh-res" key={i}><div className="mh-res__top"><span className="m-chip">{f.comp || 'League'}</span><span className="mh-res__date">{f.date}</span></div><div className="mh-res__row"><span>{f.home.replace(' FC', '')}</span></div><div className="mh-res__row"><span>{f.away.replace(' FC', '')}</span></div></div>)}</div> : <div className="m-glass" style={{ padding: 40, textAlign: 'center' }}><h3 className="m-h3">Pre-season starts 24 June</h3><p className="m-lead" style={{ margin: '12px auto 0' }}>League fixtures for 26/27 land over the summer and appear here automatically.</p></div>)}
    </div></section>
  </React.Fragment>);
}

/* ══ MEDIA ══════════════════════════════════════════════════════════════ */
function Media({ go }) {
  const [tab, setTab] = useState(window.SA_TAB || 'news'); const [zoom, setZoom] = useState(null); const [report, setReport] = useState(null);
  const reports = (window.getDerivedResults ? window.getDerivedResults() : []).filter((r) => r.kind !== 'walkover' && r.hs != null).slice(0, 9);
  const gallery = window.GalleryStore ? window.GalleryStore.list() : [];
  const Badge = window.TeamBadge;
  return (<React.Fragment>
    <PageHero eyebrow="The latest" title={<>Me<em>dia</em></>} sub="Match reports, club news and the matchday gallery." />
    <section className="mp-sec"><div className="m-wrap">
      <div className="mp-subtabs">{[['news', 'News & reports'], ['gallery', 'Gallery']].map(([k, l]) => <button key={k} className={`mp-subtab ${tab === k ? 'is-active' : ''}`} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === 'news' ? <div className="mp-grid mp-g3">{reports.map((r) => { const uh = r.home.includes('Angels'); const us = uh ? r.hs : r.as, th = uh ? r.as : r.hs; const win = us > th; return (<button className="mp-news mp-clickable" key={r.id} onClick={() => setReport(r)}><div className="mp-news__cover"><span className="mp-news__ft">Full time</span><div className="mp-news__sc">{Badge ? <Badge team={r.home} size={38} /> : null}<b>{r.hs}-{r.as}</b>{Badge ? <Badge team={r.away} size={38} /> : null}</div><span className="mp-news__comp">{r.competition || 'League Ten'}</span></div><div className="mp-news__body"><span className={`m-chip ${win ? 'm-chip--volt' : ''} mp-news__tag`}>{r.competition || 'League Ten'}</span><h3 className="m-h3">{r.home.replace(' FC', '')} v {r.away.replace(' FC', '')}</h3><p>{r.date} · {win ? 'A commanding win' : us === th ? 'Honours even' : 'A hard lesson'} for Sue's Angels. Read the full match report.</p></div></button>); })}</div>
        : (gallery.length ? <div className="mp-grid mp-g4">{gallery.slice(0, 12).map((it, i) => { const cover = window.galleryCover ? window.galleryCover(it) : it.src; return <button className="mp-news mp-clickable" key={i} onClick={() => cover && setZoom(cover)}><div className="mp-news__cover">{cover ? <img src={cover} alt="" /> : <img className="gh" src="assets/badge/sue-angels-shield.png" alt="" />}</div></button>; })}</div> : <div className="mp-grid mp-g4">{['Matchday', 'Celebration', 'The squad', 'Trophy lift'].map((l, i) => <div className="mp-news" key={i}><div className="mp-news__cover"><img className="gh" src="assets/badge/sue-angels-shield.png" alt="" /></div><div className="mp-news__body"><span className="m-chip mp-news__tag">{l}</span></div></div>)}</div>)}
    </div></section>
    {report ? <Modal onClose={() => setReport(null)}><div className="m-glass m-modal__sponsor"><p className="m-eyebrow m-eyebrow--volt">{report.competition || 'League Ten'} · {report.date}</p><h2 className="m-h2" style={{ marginTop: 10 }}>{report.home.replace(' FC', '')} {report.hs}-{report.as} {report.away.replace(' FC', '')}</h2><div className="m-prose">{(() => { const d = window.loadMatchEntry ? window.loadMatchEntry(report.id) : null; const t = d && (d.polishedReport || d.commentary); const x = t && String(t).trim(); return x ? x.split(/\n+/).map((p, i) => <p key={i}>{p}</p>) : <p>Match report to follow, watch this space.</p>; })()}</div></div></Modal> : null}
    {zoom ? <div className="m-zoom" onClick={() => setZoom(null)}><button className="m-modal__close" onClick={() => setZoom(null)}>✕</button><img src={zoom} alt="" /></div> : null}
  </React.Fragment>);
}

/* ══ SPONSORS ═══════════════════════════════════════════════════════════ */
function Sponsors({ go }) {
  const [detail, setDetail] = useState(null);
  const partners = [
    { logo: 'assets/sponsors/sporting-solutions.png', n: 'Sporting Solutions Ltd', role: 'Main kit sponsor', sub: 'On the matchday shirt every weekend since the inaugural season.', loc: 'London & Surrey', since: '2025', desc: ['Sporting Solutions Ltd are a London and Surrey-based sports and garden maintenance contractor, specialising in professional outdoor maintenance, sports-surface care and renovation.', 'Sue’s Angels FC are proud to be backed by a company whose work maintains the spaces where sport and community come together.'] },
    { logo: 'assets/sponsors/hodgson-roofing.png', n: 'Hodgson Roofing', role: 'Warm-up & training top sponsor', sub: 'NFRC-accredited roofing specialists, on the squad pre-match.', loc: 'Harrow & London', since: '2026', desc: ['Hodgson Roofing are NFRC-accredited roofing specialists based in Harrow, serving London and the surrounding areas with new roofs, repairs, flat roofs and lead work.', 'Their backing helps strengthen the club on and off the pitch.'] },
  ];
  const benefits = [['01', 'Every matchday', 'Your brand on the kit we play in every weekend.'], ['02', 'Real audience', 'A growing London fanbase reached through reports, tables and player content.'], ['03', 'Tailored deal', 'No fixed tiers, just a package built around your business.'], ['04', "Champions' badge", 'Back a winner: League Ten champions, unbeaten, promoted for 26/27.']];
  return (<React.Fragment>
    <PageHero eyebrow="Partners" title={<>Behind the <em>badge</em>.</>} sub="Two businesses back this club. Here's who they are, and how to join them." actions={<button className="m-btn m-btn--volt" onClick={() => go('contact')}>Partner with us <Arrow /></button>} />
    <section className="mp-sec"><div className="m-wrap"><Head eyebrow="Proudly backed by" title="Main sponsors" /><div className="mp-grid mp-g2">{partners.map((s) => <button className="mh-partner mp-clickable" key={s.n} onClick={() => setDetail(s)}><div className="mh-partner__plate"><img src={s.logo} alt={s.n} loading="lazy" /></div><div><div className="mh-partner__role">{s.role}</div><div className="mh-partner__name">{s.n}</div><p className="mh-partner__sub">{s.sub}</p></div></button>)}</div></div></section>
    <section className="mp-sec" style={{ paddingTop: 0 }}><div className="m-wrap"><Head eyebrow="Why partner" title="What you get" /><div className="mp-grid mp-g4">{benefits.map(([n, t, c]) => <div className="mp-feat" key={n}><div className="mp-feat__n">{n}</div><h3 className="m-h3">{t}</h3><p>{c}</p></div>)}</div></div></section>
    <section className="mp-sec" style={{ paddingTop: 0 }}><div className="m-wrap"><Head eyebrow="Support the club" title="Back the badge" /><div className="mp-donate"><a className="mp-donate__club" href="#"><b>Support the club</b><span>Equipment, training, matchdays and media</span></a><a className="mp-donate__cause" href="#"><b>Support sepsis awareness</b><span>Awareness initiatives in Sue's memory</span></a></div></div></section>
    {detail ? <Modal onClose={() => setDetail(null)}><div className="m-glass m-modal__sponsor"><div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}><div className="plate"><img src={detail.logo} alt={detail.n} /></div><div><p className="m-eyebrow m-eyebrow--volt">Official partner · since {detail.since}</p><h2 className="m-h2" style={{ marginTop: 8, fontSize: '2rem' }}>{detail.n}</h2><div style={{ display: 'flex', gap: 8, marginTop: 10 }}><span className="m-chip">{detail.loc}</span></div></div></div><div className="m-prose" style={{ marginTop: 18 }}>{detail.desc.map((d, i) => <p key={i}>{d}</p>)}</div><div style={{ marginTop: 22, display: 'flex', gap: 12, flexWrap: 'wrap' }}><button className="m-btn m-btn--volt" onClick={() => { setDetail(null); go('contact'); }}>Sponsor enquiry <Arrow /></button></div></div></Modal> : null}
  </React.Fragment>);
}

/* ══ CONTACT ════════════════════════════════════════════════════════════ */
function Contact() {
  const routes = [['general', 'General', 'Questions, hellos, anything else'], ['sponsor', 'Sponsor enquiry', 'Brand partnerships & backing the club'], ['trial', 'Player trial', 'You want a shot? Tell us about you'], ['media', 'Media volunteer', 'Photo, video, design, editorial, social']];
  const [route, setRoute] = useState('general'); const [sent, setSent] = useState(false);
  return (<React.Fragment>
    <PageHero eyebrow="Get in touch" title={<>Con<em>tact</em></>} sub="Four ways to reach us. Pick one." />
    <section className="mp-sec"><div className="m-wrap"><div className="mp-split">
      <div>{routes.map(([k, l, s]) => <button key={k} className={`mp-route ${route === k ? 'is-active' : ''}`} onClick={() => { setRoute(k); setSent(false); }}><b>{l}</b><span>{s}</span></button>)}<div className="m-glass" style={{ padding: 18, marginTop: 8 }}><p className="m-eyebrow" style={{ marginBottom: 10 }}>Direct line</p><p style={{ color: 'var(--m-ink-2)', font: '600 0.9rem var(--m-sans)', lineHeight: 1.8 }}>suesangelsfc@gmail.com<br />@suesangelsfc · Instagram</p></div></div>
      <form className="m-glass mp-form" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>{sent ? <div role="status" style={{ textAlign: 'center', padding: 20 }}><div className="m-chip m-chip--volt" style={{ marginBottom: 12 }}>Sent</div><h3 className="m-h3">Thanks. We'll reply within 48 hours.</h3></div> : <React.Fragment><p className="m-eyebrow">{routes.find((r) => r[0] === route)[1]} enquiry</p><div className="mp-frow"><label className="mp-field"><span>Name</span><input required placeholder="Your full name" autoComplete="name" /></label><label className="mp-field"><span>Email</span><input type="email" required placeholder="you@email.com" autoComplete="email" /></label></div><label className="mp-field"><span>Message</span><textarea rows="5" required placeholder="Tell us everything we need to know"></textarea></label><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}><span style={{ font: '600 0.78rem var(--m-sans)', color: 'var(--m-ink-3)' }}>We never share your details.</span><button type="submit" className="m-btn m-btn--volt">Submit enquiry <Arrow /></button></div></React.Fragment>}</form>
    </div></div></section>
  </React.Fragment>);
}

/* ══ JOIN PAGE ══════════════════════════════════════════════════════════ */
function JoinPage() {
  const routes = [['trial', 'Player trials', 'Apply for a trial with the first team. Replies typically inside 48 hours.'], ['volunteer', 'Volunteer', 'Matchday help, coaching support, logistics and more.'], ['media', 'Media team', 'Photo, video, design, editorial and social. No experience needed.'], ['sponsor', 'Sponsorship', 'Back the project and put your brand on the badge for 26/27.']];
  const [route, setRoute] = useState('trial'); const [sent, setSent] = useState(false); const [open, setOpen] = useState(0);
  const faqs = [['When are trials held?', 'Summer dates for 26/27 are being confirmed. Register your interest and we’ll be in touch with times and venue.'], ['Do I need experience for the media team?', 'No. If you can shoot on a phone, edit, design or write, there’s a role for you, and we’ll help you grow.'], ['What do volunteers get?', 'A proper football family, matchday access, and a genuine role in a club going places.'], ['How do sponsorships work?', 'No fixed tiers. We tailor a package to your business across kit, signage, content and community.']];
  return (<React.Fragment>
    <PageHero eyebrow="Get involved" title={<>Join the <em>club</em>.</>} sub="Trials, volunteering, media and sponsorship. Pick a route for 26/27." />
    <section className="mp-sec"><div className="m-wrap"><div className="mp-split">
      <div>{routes.map(([k, l, s]) => <button key={k} className={`mp-route ${route === k ? 'is-active' : ''}`} onClick={() => { setRoute(k); setSent(false); }}><b>{l}</b><span>{s}</span></button>)}</div>
      <form className="m-glass mp-form" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>{sent ? <div role="status" style={{ textAlign: 'center', padding: 20 }}><div className="m-chip m-chip--volt" style={{ marginBottom: 12 }}>Sent</div><h3 className="m-h3">Thanks. We’ll reply within 48 hours.</h3></div> : <React.Fragment><p className="m-eyebrow">{routes.find((r) => r[0] === route)[1]}</p><div className="mp-frow"><label className="mp-field"><span>Name</span><input required placeholder="Your full name" autoComplete="name" /></label><label className="mp-field"><span>Email</span><input type="email" required placeholder="you@email.com" autoComplete="email" /></label></div><label className="mp-field"><span>{route === 'trial' ? 'Position' : route === 'sponsor' ? 'Company' : 'About you'}</span><input placeholder={route === 'trial' ? 'e.g. Striker' : route === 'sponsor' ? 'Your business' : 'How you can help'} /></label><label className="mp-field"><span>Message</span><textarea rows="4" required placeholder="Tell us about yourself"></textarea></label><div style={{ display: 'flex', justifyContent: 'flex-end' }}><button type="submit" className="m-btn m-btn--volt">Submit <Arrow /></button></div></React.Fragment>}</form>
    </div></div></section>
    <section className="mp-sec" style={{ paddingTop: 0 }}><div className="m-wrap"><Head eyebrow="Good to know" title="FAQ" /><div className="sa-faq">{faqs.map(([q, a], i) => (<div className={`sa-faq__item ${open === i ? 'is-open' : ''}`} key={i}><button className="sa-faq__q" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}><span>{q}</span><span className="sa-faq__ic" aria-hidden="true">{open === i ? '-' : '+'}</span></button>{open === i ? <p className="sa-faq__a">{a}</p> : null}</div>))}</div></div></section>
  </React.Fragment>);
}

/* ══ PRODUCTION SHELL ═══════════════════════════════════════════════════ */
const HREF = { home: 'index.html', about: 'about.html', champions: 'champions.html', team: 'teams.html', schedule: 'schedule.html', media: 'media.html', sponsors: 'sponsors.html', contact: 'contact.html', join: 'join.html' };
const NAV = [['home', 'Home'], ['about', 'About'], ['champions', 'Champions'], ['team', 'Team'], ['schedule', 'Schedule'], ['media', 'Media'], ['sponsors', 'Sponsors'], ['contact', 'Contact']];
const PAGES = { home: Home, about: About, champions: Champions, team: Team, schedule: Schedule, media: Media, sponsors: Sponsors, contact: Contact, join: JoinPage };
function currentPage() {
  const f = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const map = { '': 'home', 'index.html': 'home', 'about.html': 'about', 'champions.html': 'champions', 'teams.html': 'team', 'team.html': 'team', 'schedule.html': 'schedule', 'fixtures.html': 'schedule', 'results.html': 'schedule', 'table.html': 'schedule', 'media.html': 'media', 'news.html': 'media', 'gallery.html': 'media', 'sponsors.html': 'sponsors', 'contact.html': 'contact', 'join.html': 'join' };
  return map[f] || 'home';
}
function SiteHeader({ page }) {
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'dark');
  const [open, setOpen] = useState(false);
  const flip = () => { const t = theme === 'dark' ? 'light' : 'dark'; setTheme(t); document.documentElement.setAttribute('data-theme', t); try { localStorage.setItem('sa-theme', t); } catch (e) {} };
  return (<React.Fragment>
    <a className="sa-skip" href="#main">Skip to content</a>
    <header className="sa-header">
      <a className="sa-brand" href="index.html"><img src="assets/badge/sue-angels-badge.png" alt="" />Sue's Angels</a>
      <nav className={`sa-nav ${open ? 'is-open' : ''}`}>{NAV.map(([k, l]) => <a key={k} href={HREF[k]} className={page === k ? 'is-active' : ''} onClick={() => setOpen(false)}>{l}</a>)}</nav>
      <div className="sa-act">
        <button className="m-toggle" style={{ position: 'static' }} onClick={flip} aria-label="Toggle theme">{theme === 'dark' ? '☾' : '☀'}</button>
        <a className="m-btn m-btn--volt sa-joincta" href="join.html" style={{ padding: '11px 18px' }}>Join <Arrow /></a>
        <button className="sa-burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? '✕' : '☰'}</button>
      </div>
    </header>
  </React.Fragment>);
}
function SiteFooter() {
  return (<footer className="mh-footer"><div className="m-wrap"><div className="mh-footer__row"><a className="mh-footer__brand" href="index.html" style={{ textDecoration: 'none', color: 'inherit' }}><img src="assets/badge/sue-angels-badge.png" alt="" />Sue's Angels FC</a><div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>{NAV.map(([k, l]) => <a key={k} href={HREF[k]} style={{ color: 'var(--m-ink-3)', font: '600 0.74rem var(--m-sans)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{l}</a>)}</div></div><div style={{ marginTop: 24 }}><small>Founded 2025 · in memory of Susan Anne Martin · League Ten Champions 25/26 · supporting sepsis awareness</small></div></div></footer>);
}
function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => { const on = () => setShow(window.scrollY > 600); on(); window.addEventListener('scroll', on, { passive: true }); return () => window.removeEventListener('scroll', on); }, []);
  return <button className={`sa-totop ${show ? 'is-vis' : ''}`} aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: RM() ? 'auto' : 'smooth' })}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 15 6-6 6 6" /></svg></button>;
}
function Site() {
  useEffect(() => {
    document.body.classList.add('m-body'); window.scrollTo(0, 0);
    const id = window.SA_GA_ID;
    if (id && !window.__saga) { window.__saga = 1; const s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + id; document.head.appendChild(s); window.dataLayer = window.dataLayer || []; window.gtag = function () { window.dataLayer.push(arguments); }; window.gtag('js', new Date()); window.gtag('config', id); }
  }, []);
  const page = currentPage(); const PageComp = PAGES[page] || Home;
  const go = (k) => { if (HREF[k]) location.href = HREF[k]; };
  return (<React.Fragment><SiteHeader page={page} /><main id="main"><PageComp go={go} /></main><SiteFooter /><BackToTop /></React.Fragment>);
}
ReactDOM.createRoot(document.getElementById('rd-root')).render(<Site />);
