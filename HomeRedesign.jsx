// HomeRedesign.jsx, homepage sections (v2). Shared chrome/helpers come from
// RedesignShell.jsx (loaded first). Data is read from the live globals.

const { Reveal, RDArrow, rdLeagueTotals, RDHeader, RDFooter } = window;

// ── HERO + COUNTDOWN ───────────────────────────────────────────────────────────
function useCountdown(targetISO) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  let diff = Math.max(0, new Date(targetISO).getTime() - now);
  const d = Math.floor(diff / 86400000); diff -= d * 86400000;
  const h = Math.floor(diff / 3600000); diff -= h * 3600000;
  const m = Math.floor(diff / 60000); diff -= m * 60000;
  const s = Math.floor(diff / 1000);
  return { d, h, m, s };
}

// Count-up: animates a number from 0 to its value once, on mount.
function RDCountUp({ value, prefix = '', suffix = '', className }) {
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    let raf; const dur = 1300; const start = performance.now();
    const ease = (x) => 1 - Math.pow(1 - x, 3);
    const tick = (t) => { const p = Math.min(1, (t - start) / dur); setN(Math.round(value * ease(p))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <b className={className}>{prefix}{n}{suffix}</b>;
}

function RDHero() {
  const t = rdLeagueTotals();
  const next = window.getActiveUpcoming ? (window.getActiveUpcoming()[0] || null) : null;
  const session = !next && window.getNextSession ? window.getNextSession() : null;
  const kickoff = React.useMemo(() => {
    if (next && window.getFixtureDate) {
      const dt = window.getFixtureDate(next);
      if (dt) { const [hh, mm] = (next.kick || '11:00').split(':').map((n) => parseInt(n, 10)); dt.setHours(hh || 11, mm || 0, 0, 0); return dt.toISOString(); }
    }
    if (session) return session.startISO;
    return window.SEASON_INFO && window.SEASON_INFO.next ? window.SEASON_INFO.next.startISO : new Date(Date.now() + 7 * 864e5).toISOString();
  }, [next, session]);
  const cd = useCountdown(kickoff);
  const pad = (n) => String(n).padStart(2, '0');
  // Cursor-trailing volt glow across the hero.
  const heroRef = React.useRef(null), heroGlowRef = React.useRef(null);
  React.useEffect(() => {
    const el = heroRef.current, glow = heroGlowRef.current; if (!el || !glow) return;
    if (window.matchMedia && window.matchMedia('(hover: none)').matches) return;
    let tx = 0, ty = 0, cx = 0, cy = 0, started = false, raf;
    const move = (e) => { const r = el.getBoundingClientRect(); tx = e.clientX - r.left; ty = e.clientY - r.top; if (!started) { started = true; cx = tx; cy = ty; } glow.style.opacity = '1'; };
    const leave = () => { glow.style.opacity = '0'; };
    const loop = () => { cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08; glow.style.transform = `translate(${cx}px, ${cy}px)`; raf = requestAnimationFrame(loop); };
    el.addEventListener('mousemove', move); el.addEventListener('mouseleave', leave); raf = requestAnimationFrame(loop);
    return () => { el.removeEventListener('mousemove', move); el.removeEventListener('mouseleave', leave); cancelAnimationFrame(raf); };
  }, []);

  const homeName = next ? next.home.replace(' FC', '').toUpperCase() : "SUE'S ANGELS";
  const awayName = next ? next.away.replace(' FC', '').toUpperCase() : 'TBC';
  const dateBit = next ? (next.date === 'TBC' ? 'Date TBC' : `${next.day || ''} ${next.date} ${next.mon}`.trim()) : null;
  const koBit = next ? ((!next.kick || next.kick === 'TBC') ? 'Kick-off TBC' : `${next.kick} KO`) : null;
  const venBit = next ? ((!next.ven || next.ven === 'TBC') ? 'Venue TBC' : next.ven) : null;
  const cdLine = `${cd.d > 0 ? cd.d + 'd ' : ''}${pad(cd.h)}h ${pad(cd.m)}m to kick-off`;

  // League position + recent form (league only, real data).
  const pos = (() => { const me = (window.RAW_TABLE || []).find((r) => r.us); return me ? me.p : 1; })();
  const maxPts = t.pl * 3;
  const ordinal = pos === 1 ? 'st' : pos === 2 ? 'nd' : pos === 3 ? 'rd' : 'th';
  const form = React.useMemo(() => {
    const M = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
    const parse = (s) => { const m = /^(\d{1,2})\s+(\w{3})\s+(\d{2})$/.exec((s || '').trim()); return m ? new Date(2000 + +m[3], M[m[2]] || 0, +m[1]) : new Date(0); };
    const lg = (window.getDerivedResults ? window.getDerivedResults() : (window.SEASON_RESULTS || [])).filter((r) => (r.competition || '').toLowerCase().includes('league'));
    lg.sort((a, b) => parse(b.date) - parse(a.date));
    return lg.slice(0, 5).reverse().map((r) => { if (r.kind === 'walkover') return 'w'; const uh = r.home.includes('Angels'); const us = uh ? r.hs : r.as, th = uh ? r.as : r.hs; if (r.kind === 'penalty' && r.pens) { const up = uh ? r.pens.hs : r.pens.as, tp = uh ? r.pens.as : r.pens.hs; return up > tp ? 'w' : 'l'; } return us > th ? 'w' : us === th ? 'd' : 'l'; });
  }, []);

  const I = {
    cal: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>,
    clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
    pin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>,
    trophy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>,
    photo: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m21 16-5-5L5 20"/></svg>,
    chart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19V5M4 19h16M8 16l3-4 3 2 4-6"/></svg>,
    medal: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="15" r="6"/><path d="M9 9 7 2h10l-2 7M10 15h4"/></svg>,
    people: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5.6M21 20a6 6 0 0 0-4-5.6"/></svg>,
  };

  return (
    <section className="rd-hero rd-hero--photo" ref={heroRef}>
      <div className="rd-hero__photo" aria-hidden="true">
        <img className="rd-hero__img rd-hero__img--dark" src="assets/hero-team.jpg" alt="" />
        <img className="rd-hero__img rd-hero__img--light" src="assets/hero-team-light.jpg" alt="" />
      </div>
      <div className="rd-hero__veil" aria-hidden="true" />
      <span className="rd-hero__glowwrap" aria-hidden="true"><span className="rd-hero__glow" ref={heroGlowRef} /></span>
      <div className="rd-container rd-hero__inner">
        <div className="rd-hero__top">
          <div className="rd-hero__copy" data-rd-fade="true" data-rd-fade-dist="420">
            <p className="rd-eyebrow">Sue&rsquo;s Angels FC &middot; Est. 2025</p>
            <h1 className="rd-hero__title">SUE&rsquo;S<br />ANGELS<br /><em>FC</em></h1>
            <p className="rd-hero__line">Built in memory. Driven by purpose.</p>
            <p className="rd-hero__sub">Founded for Susan Anne Martin. {t.pl} league games, {t.w} wins{t.l === 0 ? ', unbeaten' : ''}.</p>
            <div className="rd-hero__routes">
              <a className="rd-hroute" href="schedule.html"><span className="rd-hroute__ic">{I.cal}</span><span className="rd-hroute__tx"><b>Fixtures</b><i>Upcoming matches</i></span></a>
              <a className="rd-hroute" href="schedule.html?tab=results"><span className="rd-hroute__ic">{I.trophy}</span><span className="rd-hroute__tx"><b>Results</b><i>Scores &amp; reports</i></span></a>
              <a className="rd-hroute" href="gallery.html"><span className="rd-hroute__ic">{I.photo}</span><span className="rd-hroute__tx"><b>Gallery</b><i>Matchday photos</i></span></a>
            </div>
          </div>

          <div className="rd-hero__side">
            <div className="rd-nm">
              <div className="rd-nm__head"><span>{next ? 'Next match' : session ? 'Next session' : '26/27 kicks off'}</span><span className="rd-nm__headic">{I.cal}</span></div>
              {session ? (
                <div className="rd-nm__session"><img src="assets/badge/sue-angels-shield.png" alt="" /><div><strong>Pre-season training</strong><span>First session &middot; all welcome</span></div></div>
              ) : next ? (
                <div className="rd-nm__teams">
                  <div className="rd-nm__team">{window.TeamBadge ? <window.TeamBadge team={next.home} size={46} /> : null}<strong>{homeName}</strong></div>
                  <span className="rd-nm__vs">VS</span>
                  <div className="rd-nm__team">{window.TeamBadge ? <window.TeamBadge team={next.away} size={46} /> : null}<strong>{awayName}</strong></div>
                </div>
              ) : (
                <div className="rd-nm__session"><img src="assets/badge/sue-angels-shield.png" alt="" /><div><strong>26/27 season</strong><span>New campaign incoming</span></div></div>
              )}
              <div className="rd-nm__rows">
                {next ? (<>
                  <div className="rd-nm__row">{I.cal}<span>{dateBit}</span></div>
                  <div className="rd-nm__row">{I.clock}<span>{koBit}</span></div>
                  <div className="rd-nm__row">{I.pin}<span>{venBit}</span></div>
                </>) : session ? (<>
                  <div className="rd-nm__row">{I.cal}<span>{session.dayName} {session.dateStr}</span></div>
                  <div className="rd-nm__row">{I.clock}<span>{session.timeStr}</span></div>
                  <div className="rd-nm__row">{I.pin}<span>{session.venue}</span></div>
                </>) : (<>
                  <div className="rd-nm__row">{I.cal}<span>September 2026</span></div>
                  <div className="rd-nm__row">{I.pin}<span>Date to be confirmed</span></div>
                </>)}
              </div>
              {(next || session) ? <p className="rd-nm__cd"><span className="rd-chip__dot" />{cdLine}</p> : null}
              <a href="schedule.html" className="rd-btn rd-btn--volt rd-nm__cta">View fixtures <RDArrow /></a>
            </div>
          </div>
        </div>

        <div className="rd-hero__cards">
          <div className="rd-hcard">
            <div className="rd-hcard__head"><span>Season record</span><i className="rd-hcard__ic">{I.chart}</i></div>
            <span className="rd-hcard__tag">League Ten &middot; 25/26</span>
            <div className="rd-hcard__rows">
              <div><span>Played</span><b>{t.pl}</b></div>
              <div><span>Won</span><b>{t.w}</b></div>
              <div><span>Drawn</span><b>{t.d}</b></div>
              <div><span>Lost</span><b>{t.l}</b></div>
            </div>
            <div className="rd-hcard__big"><span>Goals scored</span><b>{t.gf}</b></div>
          </div>

          <div className="rd-hcard">
            <div className="rd-hcard__head"><span>League position</span><i className="rd-hcard__ic">{I.medal}</i></div>
            <div className="rd-hcard__pos"><b>{pos}</b><sup>{ordinal}</sup></div>
            <span className="rd-hcard__tag">League Ten</span>
            <div className="rd-hcard__ptsrow"><span>Points</span><b>{t.pts} / {maxPts}</b></div>
            <div className="rd-hcard__bar"><div style={{ width: (maxPts ? (t.pts / maxPts) * 100 : 0) + '%' }} /></div>
            <div className="rd-hcard__form"><span>Form</span><div className="rd-hcard__dots">{form.map((f, i) => <i key={i} className={`rd-wdl rd-wdl--${f}`}>{f.toUpperCase()}</i>)}</div></div>
          </div>

          <div className="rd-hcard">
            <div className="rd-hcard__head"><span>Club stats</span><i className="rd-hcard__ic">{I.people}</i></div>
            <div className="rd-hcard__rows rd-hcard__rows--stack">
              <div><span>Founded</span><b>2025</b></div>
              <div><span>Squad</span><b>{(window.SQUAD || []).length}</b></div>
              <div><span>Goal difference</span><b>{t.gd >= 0 ? '+' : ''}{t.gd}</b></div>
            </div>
            <a href="about.html" className="rd-btn rd-btn--ghost rd-btn--sm rd-hcard__cta">Our story <RDArrow /></a>
          </div>
        </div>

        <div className="rd-hero__foot">
          <a href="#numbers" className="rd-hero__scroll">Scroll to explore <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg></a>
          <span className="rd-hero__motto">What we do in life echoes in eternity</span>
        </div>
      </div>
    </section>
  );
}

// ── SEASON IN NUMBERS (dashboard) ──────────────────────────────────────────────
function RDDash() {
  const t = rdLeagueTotals();
  const ringC = 2 * Math.PI * 80;
  const dash = (t.winPct / 100) * ringC;
  const luke = window.derivedPlayerStats ? window.derivedPlayerStats(28, null, '25/26') : { cleanSheets: 0 };
  return (
    <Reveal as="section" className="rd-section rd-section--tight" id="numbers">
      <div className="rd-container">
        <div className="rd-section__head">
          <div>
            <p className="rd-eyebrow">League Ten · 25/26</p>
            <h2 className="rd-h2">Eighteen from eighteen</h2>
          </div>
          <a href="champions.html" className="rd-btn rd-btn--ghost rd-btn--sm">The full story <RDArrow /></a>
        </div>

        <div className="rd-dash">
          <div className="rd-dash__main">
            <div className="rd-dash__top">
              <div><p className="rd-eyebrow rd-eyebrow--plain" style={{ color: 'var(--fg-3)' }}>Form across the campaign</p></div>
              <span className="rd-chip rd-chip--volt">{t.l === 0 ? 'UNBEATEN' : `${t.w}W ${t.d}D ${t.l}L`}</span>
            </div>
            <div className="rd-dash__bar" />
            <div className="rd-dash__scale"><span>Start</span><span>Title clinched</span><span>Champions</span></div>
            <div className="rd-dash__tiles">
              <div className="rd-tile"><div className="rd-tile__label">Played</div><div className="rd-tile__num"><RDCountUp value={t.pl} /></div><div className="rd-tile__delta rd-tile__delta--flat">League Ten</div></div>
              <div className="rd-tile"><div className="rd-tile__label">Goals for</div><div className="rd-tile__num"><RDCountUp value={t.gf} /></div><div className="rd-tile__delta rd-tile__delta--up">▲ {t.pl ? (t.gf / t.pl).toFixed(1) : 0}/game</div></div>
              <div className="rd-tile"><div className="rd-tile__label">Goals against</div><div className="rd-tile__num"><RDCountUp value={t.ga} /></div><div className="rd-tile__delta rd-tile__delta--up">▲ {t.pl ? (t.ga / t.pl).toFixed(1) : 0}/game</div></div>
              <div className="rd-tile"><div className="rd-tile__label">Goal diff</div><div className="rd-tile__num"><RDCountUp value={t.gd} prefix={t.gd >= 0 ? '+' : ''} /></div><div className="rd-tile__delta rd-tile__delta--up">Best in division</div></div>
              <div className="rd-tile"><div className="rd-tile__label">Points</div><div className="rd-tile__num"><RDCountUp value={t.pts} /></div><div className="rd-tile__delta rd-tile__delta--up">Champions</div></div>
              <div className="rd-tile"><div className="rd-tile__label">Clean sheets</div><div className="rd-tile__num"><RDCountUp value={luke.cleanSheets} /></div><div className="rd-tile__delta rd-tile__delta--flat">L. Munns</div></div>
            </div>
          </div>

          <div className="rd-ring-card">
            <p className="rd-eyebrow rd-eyebrow--plain" style={{ color: 'var(--fg-3)' }}>Win rate</p>
            <div className="rd-ring-wrap">
              <svg className="rd-ring" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="16" />
                <circle cx="100" cy="100" r="80" fill="none" stroke="var(--volt)" strokeWidth="16" strokeLinecap="round" strokeDasharray={`${dash} ${ringC}`} transform="rotate(-90 100 100)" />
              </svg>
              <div className="rd-ring__pct"><RDCountUp value={t.winPct} suffix="%" /><span>Matches won</span></div>
            </div>
            <div className="rd-ring-card__foot">
              <div><RDCountUp value={t.w} /><span>Wins</span></div>
              <div><RDCountUp value={t.d} /><span>Draws</span></div>
              <div><RDCountUp value={t.l} /><span>Losses</span></div>
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

// ── RECENT RESULTS RAIL ─────────────────────────────────────────────────────────
function RDResults() {
  const results = (window.getDerivedResults ? window.getDerivedResults() : (window.SEASON_RESULTS || [])).slice(0, 8);
  if (!results.length) return null;
  return (
    <Reveal as="section" className="rd-section rd-section--tight" id="results">
      <div className="rd-container">
        <div className="rd-section__head">
          <div><p className="rd-eyebrow">Match centre</p><h2 className="rd-h2">Recent results</h2></div>
          <a href="schedule.html?tab=results" className="rd-btn rd-btn--ghost rd-btn--sm">All results <RDArrow /></a>
        </div>
      </div>
      <div className="rd-container">
        <div className="rd-rail">
          {results.map((r) => {
            const usHome = r.home.includes('Angels');
            const us = usHome ? r.hs : r.as, them = usHome ? r.as : r.hs;
            let res = 'l';
            if (r.kind === 'walkover') res = 'w';
            else if (r.kind === 'penalty' && r.pens) { const uP = usHome ? r.pens.hs : r.pens.as, tP = usHome ? r.pens.as : r.pens.hs; res = uP > tP ? 'w' : 'l'; }
            else if (us > them) res = 'w'; else if (us === them) res = 'd';
            return (
              <div className="rd-result" key={r.id}>
                <div className="rd-result__top">
                  <span className={`rd-wdl rd-wdl--${res}`}>{res.toUpperCase()}</span>
                  <span className="rd-result__date">{r.date}</span>
                </div>
                <div className={`rd-result__row ${usHome && res === 'w' ? 'rd-result__row--win' : ''}`}>
                  {window.TeamBadge ? <window.TeamBadge team={r.home} size={30} /> : null}
                  <span>{r.home.replace(' FC', '')}</span>
                  <b>{r.kind === 'walkover' ? (usHome ? 'W' : ', ') : r.hs}</b>
                </div>
                <div className={`rd-result__row ${!usHome && res === 'w' ? 'rd-result__row--win' : ''}`}>
                  {window.TeamBadge ? <window.TeamBadge team={r.away} size={30} /> : null}
                  <span>{r.away.replace(' FC', '')}</span>
                  <b>{r.kind === 'walkover' ? (!usHome ? 'W' : ', ') : r.as}</b>
                </div>
                <div className="rd-result__comp">{(r.competition || 'League Ten')} · {usHome ? 'Home' : 'Away'}</div>
              </div>
            );
          })}
        </div>
      </div>
    </Reveal>
  );
}

// ── LEAGUE TABLE PREVIEW ─────────────────────────────────────────────────────────
function RDTable() {
  const rows = (window.RAW_TABLE || []).slice(0, 6);
  if (!rows.length) return null;
  return (
    <Reveal as="section" className="rd-section rd-section--tight" id="table">
      <div className="rd-container">
        <div className="rd-section__head">
          <div><p className="rd-eyebrow">League Ten</p><h2 className="rd-h2">The table</h2></div>
          <a href="table.html" className="rd-btn rd-btn--ghost rd-btn--sm">Full table <RDArrow /></a>
        </div>
        <div className="rd-table-card">
          <table className="rd-table">
            <thead>
              <tr>
                <th className="rd-table__crumb" aria-hidden="true"></th>
                <th>#</th><th>Club</th>
                <th className="rd-hide-sm">P</th><th className="rd-hide-sm">W</th>
                <th>GD</th><th>PTS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.c} className={`${r.us ? 'is-us' : ''} ${i < 2 ? 'is-promo' : ''}`}>
                  <td className="rd-table__crumb"><span /></td>
                  <td className="rd-table__pos">{r.p}</td>
                  <td><span className="rd-table__club">{window.TeamBadge ? <window.TeamBadge team={r.c} size={26} /> : null}{r.c.replace(' FC', '')}</span></td>
                  <td className="rd-hide-sm">{r.pl}</td>
                  <td className="rd-hide-sm">{r.w}</td>
                  <td>{r.gd}</td>
                  <td className="rd-table__pts">{r.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Reveal>
  );
}

// ── SQUAD CAROUSEL ────────────────────────────────────────────────────────────────
function RDSquad() {
  const players = React.useMemo(() => {
    const list = (window.SQUAD || []).map((p) => {
      const s = window.derivedPlayerStats ? window.derivedPlayerStats(p.num, null, '25/26') : { apps: 0, goals: 0, assists: 0, cleanSheets: 0 };
      return { ...p, s };
    });
    return list.sort((a, b) => (b.s.goals + b.s.assists) - (a.s.goals + a.s.assists) || b.s.apps - a.s.apps).slice(0, 12);
  }, []);
  return (
    <Reveal as="section" className="rd-section rd-section--tight" id="squad">
      <div className="rd-container">
        <div className="rd-section__head">
          <div><p className="rd-eyebrow">First team</p><h2 className="rd-h2">The squad</h2></div>
          <a href="teams.html" className="rd-btn rd-btn--ghost rd-btn--sm">Every player <RDArrow /></a>
        </div>
      </div>
      <div className="rd-container">
        <div className="rd-squad-rail">
          {players.map((p) => {
            const photo = window.getPlayerPhoto ? window.getPlayerPhoto(p.num) : null;
            return (
              <a className="rd-player" key={p.num} href={`teams.html?player=${p.num}`}>
                <div className="rd-player__photo">
                  <span className="rd-player__pos rd-chip">{p.gk ? 'GK' : (p.s.mostPlayedPosition || 'SQUAD')}</span>
                  {photo ? <img className="rd-player__img" src={photo} alt={`${p.first} ${p.last}`} />
                         : <img className="rd-player__ghost" src="assets/badge/sue-angels-shield.png" alt="" />}
                </div>
                <div className="rd-player__body">
                  <div className="rd-player__name">{p.last}<span>{p.first}</span></div>
                  <div className="rd-player__stats">
                    {p.gk
                      ? <><div className="rd-player__stat"><b>{p.s.apps}</b><span>Apps</span></div><div className="rd-player__stat"><b>{p.s.cleanSheets}</b><span>CS</span></div><div className="rd-player__stat"><b>{p.s.motm || 0}</b><span>MOTM</span></div></>
                      : <><div className="rd-player__stat"><b>{p.s.apps}</b><span>Apps</span></div><div className="rd-player__stat"><b>{p.s.goals}</b><span>Goals</span></div><div className="rd-player__stat"><b>{p.s.assists}</b><span>Assists</span></div></>}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </Reveal>
  );
}

// ── SPONSORS ───────────────────────────────────────────────────────────────────────
function RDSponsors() {
  const items = [
    { logo: 'assets/sponsors/sporting-solutions.png', n: 'Sporting Solutions Ltd', role: 'Main kit sponsor', since: 'Aug 2025', sub: 'On the front of the matchday shirt every weekend.' },
    { logo: 'assets/sponsors/hodgson-roofing.png', n: 'Hodgson Roofing', role: 'Warm-up & training top sponsor', since: 'Feb 2026', sub: 'The brand the squad wears every pre-match.' },
  ];
  return (
    <Reveal as="section" className="rd-section rd-section--tight" id="sponsors">
      <div className="rd-container">
        <div className="rd-section__head">
          <div><p className="rd-eyebrow">Club partners</p><h2 className="rd-h2">Behind the badge</h2></div>
          <a href="sponsors.html" className="rd-btn rd-btn--ghost rd-btn--sm">All partners <RDArrow /></a>
        </div>
        <div className="rd-sponsors">
          {items.map((s) => (
            <a key={s.n} href="sponsors.html" className="rd-sponsor">
              <div className="rd-sponsor__plate"><img src={s.logo} alt={s.n} /></div>
              <div>
                <div className="rd-sponsor__role">{s.role}</div>
                <div className="rd-sponsor__name">{s.n}</div>
                <p className="rd-sponsor__sub">{s.sub}</p>
                <span className="rd-sponsor__since">Partner since {s.since}</span>
              </div>
            </a>
          ))}
        </div>
        <div className="rd-sponsor-cta">
          <span>Space on the 26/27 shirt is open.</span>
          <a href="contact.html" className="rd-btn rd-btn--volt rd-btn--sm">Partner with us <RDArrow /></a>
        </div>
      </div>
    </Reveal>
  );
}

// ── GALLERY MOSAIC ──────────────────────────────────────────────────────────────────
function RDGallery() {
  const items = window.GalleryStore ? (window.useMediaStore ? window.useMediaStore(window.GalleryStore, 'gallery') : window.GalleryStore.list()) : [];
  const [lb, setLb] = React.useState(null);
  return (
    <Reveal as="section" className="rd-section rd-section--tight" id="gallery">
      <div className="rd-container">
        <div className="rd-section__head">
          <div><p className="rd-eyebrow">Matchday</p><h2 className="rd-h2">From the pitch</h2></div>
          <a href="gallery.html" className="rd-btn rd-btn--ghost rd-btn--sm">Gallery <RDArrow /></a>
        </div>
        {items && items.length ? (
          <div className="rd-gallery-rail">
            {items.slice(0, 5).map((it, i) => {
              const cover = window.galleryCover ? window.galleryCover(it) : it.src;
              const count = window.galleryCount ? window.galleryCount(it) : 1;
              return (
                <button className="rd-gtile rd-gtile--rail" key={it.id || i} title={it.title || 'Matchday'} onClick={() => { window.location.href = 'gallery.html'; }}>
                  {cover ? <img className="rd-slot__photo" src={cover} alt={it.title || ''} /> : <img className="rd-slot__mark" src="assets/badge/sue-angels-shield.png" alt="" />}
                  {count > 1 ? <span className="rd-gtile__count">{count}</span> : null}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rd-gallery">
            {['Matchday', 'Celebration', 'The squad', 'Kickoff', 'Trophy lift'].map((label, i) => (
              <div className="rd-slot" key={i} data-label={label}>
                <img className="rd-slot__mark" src="assets/badge/sue-angels-shield.png" alt="" />
              </div>
            ))}
          </div>
        )}
      </div>
      {lb && window.AlbumLightbox ? <window.AlbumLightbox album={lb} onClose={() => setLb(null)} /> : null}
    </Reveal>
  );
}

// ── CLUB STORY + SEPSIS ──────────────────────────────────────────────────────────────
function RDStory() {
  return (
    <Reveal as="section" className="rd-section" id="story">
      <div className="rd-container">
        <div className="rd-story">
          <div className="rd-story__body">
            <p className="rd-eyebrow">The story</p>
            <h2 className="rd-h2" style={{ marginTop: 14 }}>Built in<br />her name.</h2>
            <p className="rd-lead" style={{ marginTop: 18 }}>Stephen Epathite started Sue&rsquo;s Angels in 2025, in memory of Susan Anne Martin, lost to sepsis in 2020.</p>
            <p style={{ color: 'var(--fg-3)', marginTop: 14 }}>What began as charity matches became a football club. Same people, same reason, higher stakes.</p>
            <div className="rd-story__ctas">
              <a href="about.html" className="rd-btn rd-btn--volt">Read the story <RDArrow /></a>
              <a href="join.html" className="rd-btn rd-btn--ghost">Get involved</a>
            </div>
          </div>
          <div className="rd-slot rd-story__visual" data-label="Club photography">
            <img className="rd-slot__mark" src="assets/badge/sue-angels-shield.png" alt="" />
          </div>
        </div>

        <div className="rd-sepsis" style={{ marginTop: 'clamp(28px,4vw,56px)' }}>
          <div className="rd-sepsis__txt">
            <p className="rd-eyebrow">In memory of Sue</p>
            <h3 className="rd-h3" style={{ marginTop: 12 }}>Carrying her name forward</h3>
            <p style={{ color: 'var(--fg-2)' }}>We lost Susan Anne Martin to sepsis in 2020. Everything this club does is in her memory. Alongside the football, we raise awareness and funds, so more families know the signs, and have more time.</p>
          </div>
          <a href="about.html" className="rd-btn rd-btn--ghost">Sue&rsquo;s story <RDArrow /></a>
        </div>
      </div>
    </Reveal>
  );
}

// ── JOIN CTA ───────────────────────────────────────────────────────────────────────────
function RDJoin() {
  return (
    <Reveal as="section" className="rd-section rd-section--tight" id="join">
      <div className="rd-container">
        <div className="rd-join">
          <p className="rd-eyebrow rd-eyebrow--plain rd-volt" style={{ justifyContent: 'center', display: 'flex' }}>26/27</p>
          <h2 className="rd-h2" style={{ marginTop: 14 }}>Pull on the shirt.</h2>
          <p className="rd-join__sub rd-lead">Trials, volunteering, media, sponsorship. Pick a route.</p>
          <div className="rd-join__ctas">
            <a href="join.html" className="rd-btn rd-btn--volt rd-btn--lg">Join the club <RDArrow /></a>
            <a href="contact.html" className="rd-btn rd-btn--ghost rd-btn--lg">Get in touch</a>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

// ── COMPOSE ────────────────────────────────────────────────────────────────────────────────
function HomeV2() {
  React.useEffect(() => { document.body.classList.add('rd-body', 'rd-home'); }, []);
  return (
    <React.Fragment>
      <RDHeader />
      <main>
        <RDHero />
        <RDResults />
        <RDTable />
        <RDSquad />
        <RDSponsors />
        <RDGallery />
        <RDStory />
        <RDJoin />
      </main>
      <RDFooter />
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('rd-root')).render(<HomeV2 />);
