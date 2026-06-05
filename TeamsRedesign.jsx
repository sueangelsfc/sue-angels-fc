// TeamsRedesign.jsx, squad, leaderboards, coaches, team stats + dashboard-
// style player profile (radar, breakdown, win%, match log, bio). v2 design.
const { Reveal, RDArrow, RDPage, RDPageHero } = window;

// ── helpers ───────────────────────────────────────────────────────────────────
function rdBuildMatchLog(num, matcher, season) {
  const log = [];
  const byId = {};
  for (const r of (window.SEASON_RESULTS || [])) byId[r.id] = r;
  for (const { id, data } of (window.getAllMatchEntries ? window.getAllMatchEntries() : [])) {
    const r = byId[id]; if (!r) continue;
    if (matcher && !matcher(r.competition)) continue;
    if (season && season !== 'all' && window.seasonOf && window.seasonOf(r) !== season) continue;
    const st = (data.starters || []).find((s) => s.num === num);
    const sb = !st && (data.bench || []).find((s) => s.num === num && s.positions && s.positions.length);
    if (!st && !sb) continue;
    const usHome = r.home.includes('Angels');
    let result = 'D';
    if (r.kind === 'walkover') result = 'W';
    else if (r.kind === 'penalty' && r.pens) { const uP = usHome ? r.pens.hs : r.pens.as, tP = usHome ? r.pens.as : r.pens.hs; result = uP > tP ? 'W' : 'L'; }
    else { const us = usHome ? r.hs : r.as, them = usHome ? r.as : r.hs; result = us > them ? 'W' : us === them ? 'D' : 'L'; }
    log.push({
      r, result, role: st ? 'START' : 'SUB',
      positions: (st || sb).positions || [],
      goals: (data.goals || []).filter((g) => g.num === num).length,
      pens: (data.goals || []).filter((g) => g.num === num && g.penalty).length,
      asts: (data.assists || []).filter((a) => a.num === num).length,
      motm: data.motm === num,
    });
  }
  const M = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const parse = (s) => { const m = /^(\d{1,2})\s+(\w{3})\s+(\d{2})$/.exec((s || '').trim()); return m ? new Date(2000 + +m[3], M[m[2]] || 0, +m[1]) : new Date(0); };
  log.sort((a, b) => parse(b.r.date) - parse(a.r.date));
  return log;
}

function rdSquadMax() {
  let g = 1, a = 1, ap = 1, mo = 1;
  for (const p of (window.SQUAD || [])) {
    const s = window.derivedPlayerStats(p.num, null, '25/26');
    g = Math.max(g, s.goals); a = Math.max(a, s.assists); ap = Math.max(ap, s.apps); mo = Math.max(mo, s.motm);
  }
  return { g, a, ap, mo };
}

// radar / pentagon chart
function RDRadar({ axes }) {
  const size = 230, cx = size / 2, cy = size / 2, R = 88;
  const n = axes.length;
  const pt = (i, r) => { const ang = (Math.PI * 2 * i) / n - Math.PI / 2; return [cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]; };
  const rings = [0.25, 0.5, 0.75, 1];
  const poly = axes.map((ax, i) => pt(i, R * Math.max(0.04, ax.v)).join(',')).join(' ');
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="rd-radar">
      {rings.map((rg, k) => (
        <polygon key={k} points={axes.map((_, i) => pt(i, R * rg).join(',')).join(' ')} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      ))}
      {axes.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />; })}
      <polygon points={poly} fill="rgba(214,242,58,0.22)" stroke="var(--volt)" strokeWidth="2" />
      {axes.map((ax, i) => { const [x, y] = pt(i, R * Math.max(0.04, ax.v)); return <circle key={i} cx={x} cy={y} r="3" fill="var(--volt)" />; })}
      {axes.map((ax, i) => {
        const [x, y] = pt(i, R + 18);
        return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="rd-radar__lbl">{ax.l}</text>;
      })}
    </svg>
  );
}

function RDBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const [w, setW] = React.useState(0);
  React.useEffect(() => { const id = requestAnimationFrame(() => setW(pct)); return () => cancelAnimationFrame(id); }, [pct]);
  return (
    <div className="rd-pbar">
      <div className="rd-pbar__head"><span>{label}</span><span><b>{value}</b>{total ? ` / ${total}` : ''}</span></div>
      <div className="rd-pbar__track"><div className="rd-pbar__fill" style={{ width: w + '%', background: color || 'var(--volt)' }} /></div>
    </div>
  );
}

// Count-up number for the player dashboard (Teams scope).
function RDNum({ value, suffix = '', prefix = '' }) {
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    let raf; const dur = 1000; const start = performance.now();
    const ease = (x) => 1 - Math.pow(1 - x, 3);
    const tick = (t) => { const p = Math.min(1, (t - start) / dur); setN(Math.round(value * ease(p))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <b>{prefix}{n}{suffix}</b>;
}

// ── athlete-profile building blocks (real-data only) ──────────────────────────
// Auto tagline derived purely from tracked stats — no invented data.
function rdAutoTagline(base, s, ctx) {
  if (s.apps === 0) return 'Awaiting a first appearance this season.';
  if (base.gk) {
    if (s.cleanSheets > 0) return `${s.cleanSheets} clean sheet${s.cleanSheets > 1 ? 's' : ''} in ${s.gkApps} between the posts.`;
    return `${s.gkApps} appearance${s.gkApps > 1 ? 's' : ''} in goal this season.`;
  }
  if (ctx.isTopScorer && s.goals > 0) return `Club top scorer · ${s.goals} goal${s.goals > 1 ? 's' : ''} this season.`;
  if (ctx.isMostMotm && s.motm > 1) return `Most decorated · ${s.motm} player-of-the-match awards.`;
  if (ctx.isTopAssist && s.assists > 0) return `Chief creator · ${s.assists} assist${s.assists > 1 ? 's' : ''} this season.`;
  if (s.goalInvolvements > 1) return `${s.goalInvolvements} goal involvements · ${s.goals}G ${s.assists}A.`;
  if (ctx.winPct >= 70 && s.apps >= 3) return `${ctx.winPct}% win rate with ${base.first} in the side.`;
  return `${s.apps} appearance${s.apps > 1 ? 's' : ''} this season.`;
}

// Animated progress-ring tile (WHOOP-style).
function RDRing({ label, value, suffix, pct, sub, on }) {
  const C = 2 * Math.PI * 52;
  const dash = Math.max(0, Math.min(1, pct || 0)) * C;
  return (
    <div className="rd-ring2">
      <div className="rd-ring2__top">
        <div className="rd-ring2__nums">
          <div className="rd-ring2__val"><RDNum value={value} suffix={suffix || ''} /></div>
          <div className="rd-ring2__lbl">{label}</div>
        </div>
        <div className="rd-ring2__dial">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="9" />
            <circle className="rd-ring2__arc" cx="60" cy="60" r="52" fill="none" stroke="var(--volt)" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${on ? dash : 0} ${C}`} transform="rotate(-90 60 60)" />
          </svg>
        </div>
      </div>
      {sub ? <div className="rd-ring2__sub">{sub}</div> : null}
    </div>
  );
}

// Glowing horizontal impact bar (scaled to squad best for comparability).
function RDImpact({ label, value, max, on }) {
  const pct = max > 0 && value > 0 ? Math.max(5, Math.round((value / max) * 100)) : 0;
  return (
    <div className="rd-impact">
      <span className="rd-impact__lbl">{label}</span>
      <div className="rd-impact__track"><div className="rd-impact__fill" style={{ width: (on ? pct : 0) + '%' }} /></div>
      <b className="rd-impact__val">{value}</b>
    </div>
  );
}

// Form — last 10 results + per-game contribution bars.
function RDForm({ log }) {
  const last = log.slice(0, 10).reverse(); // chronological L→R
  const maxC = Math.max(1, ...last.map((m) => m.goals + m.asts));
  if (!last.length) return <p className="rd-pp__note" style={{ margin: 0 }}>No matches logged in this filter.</p>;
  return (
    <div className="rd-form2">
      <div className="rd-form2__pills">
        {last.map((m, i) => <span key={i} className={`rd-wdl rd-wdl--${m.result.toLowerCase()}`}>{m.result}</span>)}
      </div>
      <div className="rd-form2__bars">
        {last.map((m, i) => {
          const c = m.goals + m.asts;
          return (
            <div className="rd-form2__col" key={i} title={`${m.r.date} · ${m.goals}G ${m.asts}A${m.motm ? ' · MOTM' : ''}`}>
              {m.motm ? <span className="rd-form2__star">★</span> : null}
              <div className="rd-form2__stack" style={{ height: c ? Math.round((c / maxC) * 100) + '%' : '4px' }}>
                {m.goals ? <div className="rd-form2__g" style={{ flexGrow: m.goals }} /> : null}
                {m.asts ? <div className="rd-form2__a" style={{ flexGrow: m.asts }} /> : null}
              </div>
            </div>
          );
        })}
      </div>
      <div className="rd-form2__legend">
        <span><i className="rd-dot rd-dot--g"></i>Goals</span>
        <span><i className="rd-dot rd-dot--a"></i>Assists</span>
        <span><i className="rd-dot rd-dot--m"></i>MOTM</span>
      </div>
    </div>
  );
}

// Cumulative goal-involvement trend, derived from the match log.
function RDTrend({ log }) {
  const chron = log.slice().reverse();
  let cg = 0, ca = 0;
  const pts = chron.map((m, i) => { cg += m.goals; ca += m.asts; return { i, g: cg, a: ca, ga: cg + ca }; });
  if (pts.length < 2 || pts[pts.length - 1].ga === 0) return <p className="rd-pp__note" style={{ margin: 0 }}>Not enough goal involvements yet to chart a trend.</p>;
  const W = 560, H = 190, padL = 26, padB = 22, padT = 12, padR = 10;
  const maxY = Math.max(2, pts[pts.length - 1].ga);
  const x = (i) => padL + (pts.length === 1 ? 0 : (i / (pts.length - 1)) * (W - padL - padR));
  const y = (v) => H - padB - (v / maxY) * (H - padB - padT);
  const path = (k) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p[k]).toFixed(1)}`).join(' ');
  const area = `${path('ga')} L${x(pts.length - 1).toFixed(1)} ${y(0).toFixed(1)} L${x(0).toFixed(1)} ${y(0).toFixed(1)} Z`;
  const ticks = [0, Math.round(maxY / 2), maxY];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="rd-trend" preserveAspectRatio="none">
      {ticks.map((t, i) => <line key={i} x1={padL} y1={y(t)} x2={W - padR} y2={y(t)} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />)}
      {ticks.map((t, i) => <text key={'t' + i} x={padL - 6} y={y(t) + 3} textAnchor="end" className="rd-trend__tick">{t}</text>)}
      <path d={area} fill="url(#rdTrendFill)" opacity="0.5" />
      <defs><linearGradient id="rdTrendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--volt)" stopOpacity="0.5" /><stop offset="100%" stopColor="var(--volt)" stopOpacity="0" /></linearGradient></defs>
      <path d={path('a')} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <path d={path('g')} fill="none" stroke="var(--volt)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <path d={path('ga')} fill="none" stroke="#22D3EE" strokeWidth="2" strokeDasharray="4 4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// Position map for the role pitch (horizontal, attack → right).
const RD_POS_XY = { GK: [7, 50], CB: [22, 50], LB: [22, 22], RB: [22, 78], LWB: [31, 15], RWB: [31, 85], CDM: [38, 50], CM: [50, 50], LM: [50, 22], RM: [50, 78], CAM: [62, 50], SS: [71, 50], LW: [76, 18], RW: [76, 82], CF: [82, 50], ST: [87, 50] };
function RDPitch({ breakdown, main }) {
  return (
    <div className="rd-pitch">
      <svg viewBox="0 0 100 62" className="rd-pitch__lines" preserveAspectRatio="none">
        <rect x="1" y="1" width="98" height="60" rx="2" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="0.5" />
        <line x1="50" y1="1" x2="50" y2="61" stroke="rgba(255,255,255,0.16)" strokeWidth="0.5" />
        <circle cx="50" cy="31" r="9" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="0.5" />
        <rect x="1" y="17" width="14" height="28" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="0.5" />
        <rect x="85" y="17" width="14" height="28" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="0.5" />
      </svg>
      {breakdown.map(([pos]) => {
        const xy = RD_POS_XY[pos]; if (!xy) return null;
        return <span key={pos} className={`rd-pitch__mark ${pos === main ? 'is-main' : ''}`} style={{ left: xy[0] + '%', top: xy[1] + '%' }}>{pos}</span>;
      })}
    </div>
  );
}

// ── PLAYER DASHBOARD MODAL ──────────────────────────────────────────────────────
function RDPlayerProfile({ num, onClose }) {
  const base = (window.SQUAD || []).find((p) => p.num === num);
  const [season, setSeason] = React.useState(window.CURRENT_SEASON || '25/26');
  const [comp, setComp] = React.useState('all');
  const [story, setStory] = React.useState('bio');
  const [ringOn, setRingOn] = React.useState(false);
  React.useEffect(() => { const id = requestAnimationFrame(() => setRingOn(true)); return () => cancelAnimationFrame(id); }, []);
  React.useEffect(() => {
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);
  if (!base) return null;
  const COMPS = (() => {
    const allComps = window.COMPETITIONS || [{ key: 'all', label: 'All', match: () => true }];
    return allComps.filter((c) => c.key === 'all' || rdBuildMatchLog(num, c.match, season).length > 0);
  })();
  const SEASONS = window.ALL_SEASONS || ['25/26'];
  const matcher = (COMPS.find((c) => c.key === comp) || { match: () => true }).match;
  const s = window.derivedPlayerStats(num, matcher, season);
  const photo = window.getPlayerPhoto ? window.getPlayerPhoto(num) : null;
  const log = rdBuildMatchLog(num, matcher, season);
  const W = log.filter((m) => m.result === 'W').length, D = log.filter((m) => m.result === 'D').length, L = log.filter((m) => m.result === 'L').length;
  const winPct = log.length ? Math.round((W / log.length) * 100) : 0;
  const role = window.blanketRole ? window.blanketRole({ ...base, mostPlayedPosition: s.mostPlayedPosition }) : (base.gk ? 'Goalkeeper' : 'Outfield');
  const mx = rdSquadMax();
  const bio = window.PLAYER_BIOS && window.PLAYER_BIOS[num];
  const gallery = window.getPlayerGallery ? window.getPlayerGallery(num) : [];
  // total team matches in the active filter → availability %.
  // Walkovers are excluded: the win was granted with no game played, so no
  // player could appear in one — counting them would unfairly lower availability.
  const teamMatches = (() => {
    const src = window.getDerivedResults ? window.getDerivedResults() : (window.SEASON_RESULTS || []);
    return src.filter((r) => r.kind !== 'walkover')
             .filter((r) => (!matcher || matcher(r.competition)))
             .filter((r) => (season === 'all' || !window.seasonOf) ? true : window.seasonOf(r) === season).length;
  })();
  const availability = teamMatches ? Math.round((s.apps / teamMatches) * 100) : 0;
  const topBy = (k) => (window.derivedSquadBy ? (window.derivedSquadBy(k)[0] || {}) : {});
  const ctx = { winPct, availability, isTopScorer: topBy('goals').num === num && s.goals > 0, isTopAssist: topBy('assists').num === num && s.assists > 0, isMostMotm: topBy('motm').num === num && s.motm > 0 };
  const tagline = rdAutoTagline(base, s, ctx);
  const heroStrip = base.gk
    ? [ ['Apps', s.apps, ''], ['Clean sheets', s.cleanSheets, ''], ['Conceded', s.goalsConceded, ''], ['Win %', winPct, '%'] ]
    : [ ['Goals', s.goals, ''], ['Assists', s.assists, ''], ['G+A', s.goalInvolvements, ''], ['Win %', winPct, '%'] ];
  const rings = base.gk
    ? [ { label: 'Clean sheets', value: s.cleanSheets, pct: s.cleanSheets / Math.max(1, s.gkApps), sub: `${s.cleanSheets} of ${s.gkApps || 0} in goal` }, { label: 'Win rate', value: winPct, suffix: '%', pct: winPct / 100, sub: `${W}W ${D}D ${L}L` }, { label: 'Availability', value: availability, suffix: '%', pct: availability / 100, sub: `${s.apps} / ${teamMatches} games` }, { label: 'MOTM', value: s.motm, pct: s.motm / Math.max(1, mx.mo), sub: `${s.motm} award${s.motm === 1 ? '' : 's'}` } ]
    : [ { label: 'Goals', value: s.goals, pct: s.goals / mx.g, sub: s.apps ? `${(s.goals / s.apps).toFixed(2)} per game` : '\u2014' }, { label: 'Assists', value: s.assists, pct: s.assists / mx.a, sub: s.apps ? `${(s.assists / s.apps).toFixed(2)} per game` : '\u2014' }, { label: 'Win rate', value: winPct, suffix: '%', pct: winPct / 100, sub: `${W}W ${D}D ${L}L` }, { label: 'Availability', value: availability, suffix: '%', pct: availability / 100, sub: `${s.apps} / ${teamMatches} games` } ];
  const impacts = base.gk
    ? [ ['Appearances', s.apps, mx.ap], ['Starts', s.started, mx.ap], ['Clean sheets', s.cleanSheets, Math.max(1, mx.ap)], ['MOTM', s.motm, Math.max(1, mx.mo)] ]
    : [ ['Goals', s.goals, mx.g], ['Assists', s.assists, mx.a], ['Goal involvements', s.goalInvolvements, mx.g + mx.a], ['MOTM', s.motm, Math.max(1, mx.mo)], ['Starts', s.started, mx.ap] ];
  const insights = (() => {
    const out = [];
    if (ctx.isTopScorer) out.push(['trophy', 'Club top scorer', `${s.goals} goals this season`]);
    out.push(['target', `${winPct}% win rate`, 'With this player in the side']);
    if (!base.gk && s.goalInvolvements > 0) out.push(['pulse', `Contributed to ${s.goalInvolvements} goals`, `${s.goals} scored \u00b7 ${s.assists} created`]);
    if (base.gk && s.cleanSheets > 0) out.push(['shield', `${s.cleanSheets} clean sheets`, `In ${s.gkApps} games in goal`]);
    out.push(['calendar', `Played ${availability}%`, `${s.apps} of ${teamMatches} available matches`]);
    return out.slice(0, 4);
  })();
  const ICON = (n) => ({
    trophy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>,
    target: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>,
    pulse: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l2 7 4-14 2 7h6"/></svg>,
    shield: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 5 6v5c0 4.5 3 7.5 7 10 4-2.5 7-5.5 7-10V6l-7-3Z"/></svg>,
    calendar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>,
  }[n] || null);

  return (
    <div className="rd-modal" onClick={onClose}>
      <div className="rd-modal__panel rd-modal__panel--wide" onClick={(e) => e.stopPropagation()}>
        <button className="rd-modal__close" onClick={onClose} aria-label="Close">×</button>

        <div className="rd-pphero">
          <div className="rd-pphero__media">
            {photo ? <img src={photo} alt={`${base.first} ${base.last}`} /> : <span className="rd-pphero__initials">{base.first[0]}{base.last[0]}</span>}
          </div>
          <div className="rd-pphero__intro">
            <p className="rd-eyebrow">{role}</p>
            <h2 className="rd-pphero__name">{base.first}<span>{base.last}</span></h2>
            <p className="rd-pphero__sub">{s.mostPlayedPosition ? <>Plays most as <b>{s.mostPlayedPosition}</b></> : 'Squad member'} · {s.apps} apps</p>
            <p className="rd-pphero__tag">{tagline}</p>
            <div className="rd-pphero__strip">
              {heroStrip.map(([l, v, suf], i) => (
                <div className="rd-pphero__cell" key={i}>
                  <div className="rd-pphero__cellv"><RDNum value={v} suffix={suf || ''} /></div>
                  <div className="rd-pphero__celll">{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rd-pphero__overview">
            <p className="rd-eyebrow rd-eyebrow--plain" style={{ color: 'var(--fg-3)' }}>Season overview</p>
            <div className="rd-ov">
              <div className="rd-ov__row"><span>Appearances</span><b>{s.apps}</b></div>
              <div className="rd-ov__note">{s.started} starts · {s.subbedOn} off the bench</div>
              <div className="rd-ov__row"><span>MOTM awards</span><b>{s.motm}</b></div>
              {s.captained ? <div className="rd-ov__row"><span>Captained</span><b>{s.captained}</b></div> : null}
              <div className="rd-ov__row"><span>Discipline</span><span className="rd-ov__cards"><i className="rd-ov__yc">{s.yc}</i><i className="rd-ov__rc">{s.rc}</i></span></div>
            </div>
          </div>
        </div>

        <div className="rd-pp__filters">
          <div className="rd-tabs">
            <button className={`rd-tab ${season === 'all' ? 'is-active' : ''}`} onClick={() => setSeason('all')}>All seasons</button>
            {SEASONS.map((x) => <button key={x} className={`rd-tab ${season === x ? 'is-active' : ''}`} onClick={() => setSeason(x)}>{x}</button>)}
          </div>
          <div className="rd-tabs">
            {COMPS.map((c) => <button key={c.key} className={`rd-tab ${comp === c.key ? 'is-active' : ''}`} onClick={() => setComp(c.key)}>{c.label}</button>)}
          </div>
        </div>

        <div className="rd-rings">
          {rings.map((r, i) => <RDRing key={i} {...r} on={ringOn} />)}
        </div>

        <div className="rd-pp3">
          <div className="rd-card">
            <p className="rd-eyebrow rd-eyebrow--plain" style={{ color: 'var(--fg-3)' }}>Match impact</p>
            <div style={{ marginTop: 16 }}>{impacts.map(([l, v, m], i) => <RDImpact key={i} label={l} value={v} max={m} on={ringOn} />)}</div>
            <p className="rd-pp__note">Bars scaled to the squad&rsquo;s best this season.</p>
          </div>
          <div className="rd-card">
            <p className="rd-eyebrow rd-eyebrow--plain" style={{ color: 'var(--fg-3)' }}>Form · last {Math.min(10, log.length)} games</p>
            <div style={{ marginTop: 16 }}><RDForm log={log} /></div>
          </div>
          <div className="rd-card">
            <p className="rd-eyebrow rd-eyebrow--plain" style={{ color: 'var(--fg-3)' }}>Season insights</p>
            <div className="rd-insights">
              {insights.map((it, i) => (
                <div className="rd-insight" key={i}>
                  <span className="rd-insight__ic">{ICON(it[0])}</span>
                  <div className="rd-insight__tx"><div className="rd-insight__t">{it[1]}</div><div className="rd-insight__s">{it[2]}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rd-pp2">
          <div className="rd-card">
            <p className="rd-eyebrow rd-eyebrow--plain" style={{ color: 'var(--fg-3)' }}>Goal-involvement trend</p>
            <div style={{ marginTop: 14 }}><RDTrend log={log} /></div>
            <div className="rd-trend__legend"><span><i className="rd-dot rd-dot--g"></i>Goals</span><span><i className="rd-dot" style={{ background: '#22D3EE' }}></i>G+A</span><span><i className="rd-dot rd-dot--a"></i>Assists</span></div>
          </div>
          <div className="rd-card">
            <p className="rd-eyebrow rd-eyebrow--plain" style={{ color: 'var(--fg-3)' }}>Position &amp; role</p>
            <RDPitch breakdown={s.positionBreakdown} main={s.mostPlayedPosition} />
            <div className="rd-rolemeta">
              <div><span>Main position</span><b>{s.mostPlayedPosition || '\u2014'}</b></div>
              <div><span>Other roles</span><b>{s.positionBreakdown.slice(1, 4).map(([p]) => p).join(', ') || '\u2014'}</b></div>
            </div>
            {s.penaltyAttempts > 0 ? <p className="rd-pp__note" style={{ marginTop: 12 }}>Penalties · {s.penaltiesScored}/{s.penaltyAttempts} converted ({s.penaltyConversion}%)</p> : null}
          </div>
        </div>

        {/* Career / story */}
        <div className="rd-card" style={{ marginTop: 16 }}>
          <div className="rd-tabs" style={{ marginBottom: 14 }}>
            <button className={`rd-tab ${story === 'bio' ? 'is-active' : ''}`} onClick={() => setStory('bio')}>Player bio</button>
            <button className={`rd-tab ${story === 'log' ? 'is-active' : ''}`} onClick={() => setStory('log')}>Match log ({log.length})</button>
          </div>
          {story === 'bio' ? (
            <div className="rd-prose">
              {gallery.length ? <div className="rd-pp__gallery">{gallery.map((g, i) => <img key={i} src={g} alt={`${base.first} ${base.last}`} />)}</div> : null}
              {bio ? bio.split(/\n+/).map((p, i) => <p key={i}>{p}</p>) : <p style={{ color: 'var(--fg-3)' }}>No bio yet for {base.first} {base.last}. Space reserved, the club will add this soon.</p>}
            </div>
          ) : (
            <div className="rd-pp__log">
              {log.length === 0 ? <p style={{ color: 'var(--fg-3)' }}>No matches logged in this filter.</p> : log.map((m, i) => {
                const usHome = m.r.home.includes('Angels');
                const opp = (usHome ? m.r.away : m.r.home).replace(' FC', '');
                const score = m.r.kind === 'walkover' ? m.r.wo : `${m.r.hs}–${m.r.as}`;
                return (
                  <div className="rd-pp__logrow" key={i}>
                    <span className={`rd-wdl rd-wdl--${m.result.toLowerCase()}`}>{m.result}</span>
                    <span className="rd-pp__logdate">{m.r.date}</span>
                    <span className="rd-pp__logopp">{usHome ? 'H' : 'A'} vs {opp} <b>{score}</b></span>
                    <span className="rd-pp__logc">
                      {m.goals > 0 ? <span className="rd-chip rd-chip--volt">{m.goals}G</span> : null}
                      {m.asts > 0 ? <span className="rd-chip">{m.asts}A</span> : null}
                      {m.motm ? <span className="rd-chip">MOTM</span> : null}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── TEAMS PAGE ────────────────────────────────────────────────────────────────────
const RD_POS_GROUPS = [
  { key: 'GK', label: 'Goalkeepers', test: (p, s) => p.gk },
  { key: 'DEF', label: 'Defenders', test: (p, s) => !p.gk && window.formationGroupOf && window.formationGroupOf(s.mostPlayedPosition) === 'DEF' },
  { key: 'MID', label: 'Midfielders', test: (p, s) => !p.gk && window.formationGroupOf && window.formationGroupOf(s.mostPlayedPosition) === 'MID' },
  { key: 'ATT', label: 'Forwards', test: (p, s) => !p.gk && window.formationGroupOf && window.formationGroupOf(s.mostPlayedPosition) === 'ATT' },
];

function RDPlayerCard({ p, onOpen }) {
  const s = window.derivedPlayerStats(p.num, null, '25/26');
  const photo = window.getPlayerPhoto ? window.getPlayerPhoto(p.num) : null;
  const [flipped, setFlipped] = React.useState(false);
  const pos = p.gk ? 'GK' : (s.mostPlayedPosition || 'SQUAD');
  const role = p.gk ? 'Goalkeeper'
    : (window.blanketRole ? window.blanketRole({ ...p, mostPlayedPosition: s.mostPlayedPosition, positionBreakdown: s.positionBreakdown }) : 'Outfield');
  // back-of-card stat set — richer than the front
  const back = p.gk
    ? [['Apps', s.apps], ['Clean sheets', s.cleanSheets], ['Conceded', s.goalsConceded], ['MOTM', s.motm || 0]]
    : [['Apps', s.apps], ['Goals', s.goals], ['Assists', s.assists], ['G+A', s.goalInvolvements], ['MOTM', s.motm || 0], ['Captained', s.captained || 0]];
  return (
    <div className={`rd-player rd-player--flip ${flipped ? 'is-flipped' : ''}`}>
      <div className="rd-player__flip">
        {/* FRONT */}
        <div className="rd-player__face rd-player__face--front">
          <button className="rd-player__open" onClick={() => onOpen(p.num)} aria-label={`View ${p.first} ${p.last}'s profile`}>
            <div className="rd-player__photo">
              <span className="rd-player__pos rd-chip">{pos}</span>
              {photo ? <img className="rd-player__img" src={photo} alt={`${p.first} ${p.last}`} /> : <img className="rd-player__ghost" src="assets/badge/sue-angels-shield.png" alt="" />}
            </div>
            <div className="rd-player__body">
              <div className="rd-player__name">{p.last}<span>{p.first}</span></div>
              <div className="rd-player__stats">
                {p.gk
                  ? <><div className="rd-player__stat"><b>{s.apps}</b><span>Apps</span></div><div className="rd-player__stat"><b>{s.cleanSheets}</b><span>CS</span></div><div className="rd-player__stat"><b>{s.motm || 0}</b><span>MOTM</span></div></>
                  : <><div className="rd-player__stat"><b>{s.apps}</b><span>Apps</span></div><div className="rd-player__stat"><b>{s.goals}</b><span>Goals</span></div><div className="rd-player__stat"><b>{s.assists}</b><span>Assists</span></div></>}
              </div>
            </div>
          </button>
          <button className="rd-player__flipbtn" onClick={() => setFlipped(true)} aria-label="Flip card to see full stats" title="Flip for stats">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>
          </button>
        </div>
        {/* BACK */}
        <div className="rd-player__face rd-player__face--back">
          <button className="rd-player__flipbtn rd-player__flipbtn--back" onClick={() => setFlipped(false)} aria-label="Flip card back" title="Flip back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <div className="rd-player__backhead">
            <span className="rd-player__backnum">{p.num}</span>
            <div className="rd-player__backid">
              <span className="rd-player__backname">{p.first} {p.last}</span>
              <span className="rd-player__backrole">{role}</span>
            </div>
          </div>
          <div className="rd-player__backgrid">
            {back.map(([label, val]) => (
              <div className="rd-player__backstat" key={label}>
                <b>{val}</b><span>{label}</span>
              </div>
            ))}
          </div>
          <button className="rd-btn rd-btn--volt rd-btn--sm rd-player__backcta" onClick={() => onOpen(p.num)}>
            View full profile {RDArrow ? <RDArrow /> : '→'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RDLeaderboards() {
  const [season, setSeason] = React.useState(window.CURRENT_SEASON || '25/26');
  const [comp, setComp] = React.useState('all');
  const COMPS = window.COMPETITIONS || [{ key: 'all', label: 'All', match: () => true }];
  const SEASONS = window.ALL_SEASONS || ['25/26'];
  const matcher = (COMPS.find((c) => c.key === comp) || { match: () => true }).match;
  const rows = (window.SQUAD || []).map((p) => ({ p, s: window.derivedPlayerStats(p.num, matcher, season) }))
    .filter((x) => x.s.apps > 0)
    .sort((a, b) => b.s.goalInvolvements - a.s.goalInvolvements || b.s.goals - a.s.goals || b.s.apps - a.s.apps);
  return (
    <div>
      <div className="rd-lb-filters">
        <div className="rd-tabs"><button className={`rd-tab ${season === 'all' ? 'is-active' : ''}`} onClick={() => setSeason('all')}>All seasons</button>{SEASONS.map((x) => <button key={x} className={`rd-tab ${season === x ? 'is-active' : ''}`} onClick={() => setSeason(x)}>{x}</button>)}</div>
        <div className="rd-tabs">{COMPS.map((c) => <button key={c.key} className={`rd-tab ${comp === c.key ? 'is-active' : ''}`} onClick={() => setComp(c.key)}>{c.label}</button>)}</div>
      </div>
      <div className="rd-table-card" style={{ marginTop: 18 }}>
        <table className="rd-table rd-lb">
          <thead><tr><th>#</th><th>Player</th><th>Apps</th><th>G</th><th>A</th><th>G+A</th><th className="rd-hide-sm">MOTM</th></tr></thead>
          <tbody>
            {rows.map((x, i) => (
              <tr key={x.p.num}>
                <td className="rd-table__pos">{i + 1}</td>
                <td><span className="rd-table__club">{x.p.first[0]}. {x.p.last}</span></td>
                <td>{x.s.apps}</td><td>{x.s.goals}</td><td>{x.s.assists}</td>
                <td className="rd-table__pts">{x.s.goalInvolvements}</td>
                <td className="rd-hide-sm">{x.s.motm}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RDTeamStats() {
  const t = window.rdLeagueTotals();
  const top = (k) => (window.derivedSquadBy ? window.derivedSquadBy(k)[0] : null);
  const cards = [
    top('goals') && { l: 'Top scorer', who: `${top('goals').first} ${top('goals').last}`, n: top('goals').goals, u: 'Goals' },
    top('assists') && { l: 'Most assists', who: `${top('assists').first} ${top('assists').last}`, n: top('assists').assists, u: 'Assists' },
    top('cleanSheets') && { l: 'Clean sheets', who: `${top('cleanSheets').first} ${top('cleanSheets').last}`, n: top('cleanSheets').cleanSheets, u: 'Shutouts' },
    (window.derivedSquad ? window.derivedSquad().slice().sort((a, b) => b.apps - a.apps)[0] : null) && (() => { const mp = window.derivedSquad().slice().sort((a, b) => b.apps - a.apps)[0]; return { l: 'Most apps', who: `${mp.first} ${mp.last}`, n: mp.apps, u: 'Appearances' }; })(),
  ].filter(Boolean);
  return (
    <div>
      <div className="rd-statgrid">
        <div className="rd-tile"><div className="rd-tile__label">Goals for</div><div className="rd-tile__num">{t.gf}</div></div>
        <div className="rd-tile"><div className="rd-tile__label">Goals against</div><div className="rd-tile__num">{t.ga}</div></div>
        <div className="rd-tile"><div className="rd-tile__label">Goal diff</div><div className="rd-tile__num">{(t.gd >= 0 ? '+' : '') + t.gd}</div></div>
        <div className="rd-tile"><div className="rd-tile__label">Win rate</div><div className="rd-tile__num">{t.winPct}%</div></div>
      </div>
      <div className="rd-cards" style={{ marginTop: 16 }}>
        {cards.map((c, i) => (
          <div className="rd-feature" key={i}>
            <div className="rd-tile__label">{c.l}</div>
            <div className="rd-tile__num" style={{ margin: '10px 0' }}>{c.n}</div>
            <div className="rd-h3" style={{ fontSize: 18 }}>{c.who}</div>
            <p style={{ marginTop: 4 }}>{c.u}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RDCoaches() {
  const [, tick] = React.useState(0);
  React.useEffect(() => { const h = () => tick((n) => n + 1); window.addEventListener('sa-media-changed', h); return () => window.removeEventListener('sa-media-changed', h); }, []);
  return (
    <div className="rd-cards">
      {(window.COACHES || []).map((c) => {
        const ov = window.getCoachData ? window.getCoachData(c.id) : {};
        const photo = ov.photo || c.photo;
        const bio = ov.bio ? ov.bio.split(/\n+/).filter(Boolean) : (c.bio || []);
        return (
        <article className="rd-coach" key={c.id}>
          <div className="rd-coach__photo">{photo ? <img src={photo} alt={c.name} onError={(e) => { e.target.style.display = 'none'; }} /> : <img className="rd-slot__mark" src="assets/badge/sue-angels-shield.png" alt="" style={{ height: 90, opacity: 0.16 }} />}</div>
          <div className="rd-coach__body">
            <p className="rd-eyebrow">{c.role}</p>
            <h3 className="rd-h3" style={{ marginTop: 8 }}>{c.name}</h3>
            <div className="rd-prose" style={{ marginTop: 12 }}>{bio.map((p, i) => <p key={i}>{p}</p>)}</div>
            {c.managed ? <div style={{ marginTop: 16 }}><p className="rd-eyebrow rd-eyebrow--plain" style={{ color: 'var(--fg-3)' }}>Managed</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>{c.managed.map((m) => <span key={m} className="rd-chip">{m}</span>)}</div></div> : null}
            {c.playedFor ? <div style={{ marginTop: 16 }}><p className="rd-eyebrow rd-eyebrow--plain" style={{ color: 'var(--fg-3)' }}>Played for</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>{c.playedFor.map((m) => <span key={m} className="rd-chip">{m}</span>)}</div></div> : null}
          </div>
        </article>
        );
      })}
    </div>
  );
}

function TeamsV2() {
  const params = new URLSearchParams(window.location.search);
  const [tab, setTab] = React.useState('squad');
  const [open, setOpen] = React.useState(params.get('player') ? parseInt(params.get('player'), 10) : null);
  const squad = (window.SQUAD || []).map((p) => ({ p, s: window.derivedPlayerStats(p.num, null, '25/26') }));
  const grouped = RD_POS_GROUPS.map((g) => ({ ...g, players: squad.filter((x) => g.test(x.p, x.s)).map((x) => x.p) }));
  const ungrouped = squad.filter((x) => !RD_POS_GROUPS.some((g) => g.test(x.p, x.s))).map((x) => x.p);
  const tabs = [['squad', 'First team'], ['leaders', 'Leaderboards'], ['coaches', 'Coaches'], ['stats', 'Team stats']];
  return (
    <RDPage>
      <main>
        <RDPageHero eyebrow={tab === 'coaches' ? 'The staff' : tab === 'leaders' ? 'Leaderboards' : tab === 'stats' ? 'Team stats' : 'First team'} title={<>The <em>squad</em>.</>} sub={tab === 'leaders' ? 'Goals, assists and appearances, ranked.' : tab === 'coaches' ? 'The people behind the team.' : tab === 'stats' ? 'The season in numbers.' : 'Tap any player for their full stats.'} />
        <section className="rd-section rd-section--tight">
          <div className="rd-container">
            <div className="rd-tabs" style={{ marginBottom: 32 }}>
              {tabs.map(([k, l]) => <button key={k} className={`rd-tab ${tab === k ? 'is-active' : ''}`} onClick={() => setTab(k)}>{l}</button>)}
            </div>

            {tab === 'squad' && (
              <div className="rd-squad-groups">
                {grouped.filter((g) => g.players.length).map((g) => (
                  <div key={g.key} className="rd-squad-group">
                    <div className="rd-squad-group__head"><span className="rd-eyebrow">{g.label}</span><span className="rd-squad-group__n">{g.players.length}</span></div>
                    <div className="rd-squad-grid">{g.players.map((p) => <RDPlayerCard key={p.num} p={p} onOpen={setOpen} />)}</div>
                  </div>
                ))}
                {ungrouped.length ? (
                  <div className="rd-squad-group">
                    <div className="rd-squad-group__head"><span className="rd-eyebrow">Squad</span><span className="rd-squad-group__n">{ungrouped.length}</span></div>
                    <div className="rd-squad-grid">{ungrouped.map((p) => <RDPlayerCard key={p.num} p={p} onOpen={setOpen} />)}</div>
                  </div>
                ) : null}
              </div>
            )}
            {tab === 'leaders' && <RDLeaderboards />}
            {tab === 'coaches' && <RDCoaches />}
            {tab === 'stats' && <RDTeamStats />}
          </div>
        </section>
      </main>
      {open ? <RDPlayerProfile num={open} onClose={() => setOpen(null)} /> : null}
    </RDPage>
  );
}

ReactDOM.createRoot(document.getElementById('rd-root')).render(<TeamsV2 />);
