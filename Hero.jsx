// Hero.jsx, cinematic full-bleed hero with stadium silhouette + live countdown.
function StadiumBackdrop() {
  return (
    <svg className="hero__svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="hg-stage" cx="50%" cy="45%" r="70%">
          <stop offset="0%" stopColor="var(--volt)" stopOpacity="0.10" />
          <stop offset="40%" stopColor="#15233D" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#02060E" stopOpacity="1" />
        </radialGradient>
        <linearGradient id="hg-ray" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="var(--volt)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--volt)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hg-crowd" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#0B1A2B" />
          <stop offset="100%" stopColor="#02060E" />
        </linearGradient>
        <filter id="hg-blur"><feGaussianBlur stdDeviation="22" /></filter>
      </defs>
      <rect width="1600" height="900" fill="url(#hg-stage)" />
      <g opacity="0.45" filter="url(#hg-blur)">
        <polygon points="240,-40 480,-40 380,900 200,900" fill="url(#hg-ray)" />
        <polygon points="780,-40 1020,-40 920,900 720,900" fill="url(#hg-ray)" />
        <polygon points="1340,-40 1580,-40 1480,900 1280,900" fill="url(#hg-ray)" />
      </g>
      <path d="M0 720 L120 700 L240 712 L380 692 L520 706 L660 686 L820 704 L960 688 L1100 706 L1240 690 L1380 708 L1520 692 L1600 706 L1600 900 L0 900 Z" fill="url(#hg-crowd)" />
      <g fill="#FFFFFF" opacity="0.22">
        {Array.from({ length: 140 }).map((_, i) => {
          const x = (i * 71) % 1600;
          const y = 720 + ((i * 13) % 70);
          const r = 1 + ((i % 5) === 0 ? 1 : 0);
          return <circle key={i} cx={x} cy={y} r={r} />;
        })}
      </g>
      <g fill="var(--volt)" opacity="0.55">
        {Array.from({ length: 14 }).map((_, i) => {
          const x = 50 + i * 110 + ((i * 17) % 40);
          const y = 712 + ((i * 9) % 50);
          return <circle key={'v'+i} cx={x} cy={y} r="1.6" />;
        })}
      </g>
      <g stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" fill="none">
        <rect x="720" y="630" width="160" height="78" />
        <line x1="720" y1="630" x2="800" y2="590" />
        <line x1="880" y1="630" x2="800" y2="590" />
      </g>
      <g stroke="rgba(214,242,58,0.10)" strokeWidth="1">
        <line x1="0" y1="780" x2="1600" y2="780" />
        <line x1="0" y1="820" x2="1600" y2="820" />
        <line x1="0" y1="864" x2="1600" y2="864" />
      </g>
    </svg>
  );
}

function useCountdown(targetISO) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const target = new Date(targetISO).getTime();
  let diff = Math.max(0, target - now);
  const d = Math.floor(diff / 86400000); diff -= d * 86400000;
  const h = Math.floor(diff / 3600000);  diff -= h * 3600000;
  const m = Math.floor(diff / 60000);    diff -= m * 60000;
  const s = Math.floor(diff / 1000);
  return { d, h, m, s };
}

function Hero() {
  // Pick the next active upcoming fixture; re-evaluated every minute so the
  // hero rolls over to the next match as soon as a fixture date passes.
  const [next, setNext] = React.useState(() => {
    const list = window.getActiveUpcoming ? window.getActiveUpcoming() : (window.UPCOMING_FIXTURES || []);
    return list[0] || null;
  });
  React.useEffect(() => {
    const id = setInterval(() => {
      const list = window.getActiveUpcoming ? window.getActiveUpcoming() : (window.UPCOMING_FIXTURES || []);
      setNext(list[0] || null);
    }, 60000);
    return () => clearInterval(id);
  }, []);

  // Compute kickoff ISO from the fixture's id + kick string.
  const kickoff = React.useMemo(() => {
    if (next && window.getFixtureDate) {
      const d = window.getFixtureDate(next);
      if (d) {
        const [hh, mm] = (next.kick || '11:00').split(':').map((n) => parseInt(n, 10));
        d.setHours(hh || 11, mm || 0, 0, 0);
        return d.toISOString();
      }
    }
    return window.SEASON_INFO && window.SEASON_INFO.next ? window.SEASON_INFO.next.startISO : new Date(Date.now() + 7 * 86400000).toISOString();
  }, [next]);
  const cd = useCountdown(kickoff);
  const pad = (n) => String(n).padStart(2, '0');

  // Season-aware eyebrow + headline copy.
  const state = window.getSeasonState ? window.getSeasonState() : { phase: 'active' };
  const daysToNext = window.daysUntilNextSeason ? window.daysUntilNextSeason() : null;
  const eyebrow =
    state.phase === 'active'  ? '2025 / 26 SEASON · LEAGUE TEN CHAMPIONS'  :
    state.phase === 'between' ? `25/26 COMPLETE · 26/27 KICKS OFF IN ${daysToNext} DAYS` :
                                '2026 / 27 SEASON · NEW CAMPAIGN BEGINS';

  // Derive next-match copy reactively.
  const venue     = next ? (next.ven || 'VENUE TBC').toUpperCase() : 'VENUE TBC';
  const venueLine = next ? `${next.day.toUpperCase()} ${next.date} ${next.mon.toUpperCase()} · ${next.kick} KO` : 'NEXT FIXTURE TBC';
  const compLine  = next ? `${next.comp.toUpperCase()} · ${next.loc.toUpperCase()}` : 'AWAITING SCHEDULE';

  return (
    <section id="home" className="hero">
      <div className="hero__bg">
        <StadiumBackdrop />
        <div className="hero__scan" />
        <div className="hero__protect" />
      </div>

      <div className="hero__content container">
        <div className="hero__copy">
          <div className="t-eyebrow hero__eyebrow">
            <span className="hero__dot" />
            {eyebrow}
          </div>
          <h1 className="hero__title">
            WHAT WE DO<br />
            IN LIFE<br />
            <em>ECHOES</em> IN<br />
            ETERNITY<span className="hero__tail">.</span>
          </h1>
          <p className="hero__sub">Sunday-league football club in London. League Ten champions, 25/26. Built on discipline, culture and brotherhood.</p>
          <div className="hero__ctas">
            <a href="schedule.html?tab=upcoming" className="btn btn--volt btn--lg">View Fixtures →</a>
            <a href="schedule.html?tab=results" className="btn btn--ghost btn--lg">Latest Results</a>
            <a href="join.html" className="btn btn--ghost btn--lg" style={{ borderColor: 'transparent', color: 'var(--fg-3)' }}>Join the Club →</a>
          </div>
        </div>

        <aside className="hero__side">
          <div className="hero__badge-wrap">
            <img src="assets/badge/sue-angels-badge-cutout.png" alt="" className="hero__badge-img" />
            <div className="hero__champ-strip">
              <span>LEAGUE TEN</span>
              <strong>CHAMPIONS</strong>
              <span>25 / 26</span>
            </div>
          </div>

          <div className="hero__count">
            <div className="hero__count-head">
              <span className="hero__count-eye">NEXT MATCH</span>
              <span className="hero__count-live">LIVE COUNTDOWN</span>
            </div>
            <div className="hero__count-fix">
              <div className="hero__count-team hero__count-team--home">
                {next && <TeamBadge team={next.home} size={28} />}
                <strong>{next ? next.home.replace(' FC', '').toUpperCase() : 'NEXT'}</strong>
              </div>
              <em>VS</em>
              <div className="hero__count-team hero__count-team--away">
                {next && <TeamBadge team={next.away} size={28} />}
                <strong>{next ? next.away.replace(' FC', '').toUpperCase() : 'TBC'}</strong>
              </div>
            </div>
            <div className="hero__count-grid">
              <div><span>{pad(cd.d)}</span><label>DAYS</label></div>
              <div><span>{pad(cd.h)}</span><label>HRS</label></div>
              <div><span>{pad(cd.m)}</span><label>MIN</label></div>
              <div><span>{pad(cd.s)}</span><label>SEC</label></div>
            </div>
            <div className="hero__count-meta">
              <span>{venueLine}</span>
              <span className="hero__sep">·</span>
              <span>{venue}</span>
              <span className="hero__sep">·</span>
              <span className="hero__count-comp">{compLine}</span>
            </div>
          </div>
        </aside>
      </div>

      <div className="hero__ticker">
        <div className="hero__ticker-inner">
          {(() => {
            const results = (window.getDerivedResults ? window.getDerivedResults() : (window.SEASON_RESULTS || []))
              .filter((r) => (r.competition || '').toLowerCase().includes('league'));
            let pl = 0, w = 0, d = 0, l = 0, gf = 0, ga = 0;
            for (const r of results) {
              pl++;
              if (r.kind === 'walkover') { w++; continue; }
              const usHome = r.home.includes('Angels');
              const us = usHome ? r.hs : r.as; const them = usHome ? r.as : r.hs;
              gf += us || 0; ga += them || 0;
              if (r.kind === 'penalty' && r.pens) {
                const uP = usHome ? r.pens.hs : r.pens.as; const tP = usHome ? r.pens.as : r.pens.hs;
                if (uP > tP) w++; else l++;
              } else if (us > them) w++; else if (us === them) d++; else l++;
            }
            const pts = w * 3 + d;
            const gd = gf - ga;
            const latest = results[0];
            const latestStr = latest
              ? (latest.kind === 'walkover'
                  ? `${latest.kind === 'walkover' && latest.wo === 'H-W' ? 'W H-W' : 'W A-W'} vs ${(latest.home.includes('Angels') ? latest.away : latest.home).replace(' FC','')} · ${latest.date}`
                  : `${(latest.home.includes('Angels') ? latest.hs : latest.as)}-${(latest.home.includes('Angels') ? latest.as : latest.hs)} (${latest.home.includes('Angels') ? 'H' : 'A'}) vs ${(latest.home.includes('Angels') ? latest.away : latest.home).replace(' FC','')} · ${latest.date}`)
              : 'No results yet';
            return (
              <React.Fragment>
                <span className="t-eyebrow" style={{ color: 'var(--volt)' }}>LEAGUE TEN · CHAMPIONS</span>
                <span className="t-meta">P{pl} W{w} D{d} L{l} · {gf} GF · {ga} GA · GD {gd >= 0 ? '+' : ''}{gd} · {pts} PTS</span>
                <span className="t-meta">·</span>
                <span className="t-meta">LATEST · {latestStr}</span>
                {next && (
                  <React.Fragment>
                    <span className="t-meta">·</span>
                    <span className="t-meta">NEXT · vs {(next.home.includes('Angels') ? next.away : next.home).replace(' FC','')} ({next.loc === 'Home' ? 'H' : 'A'}) · {next.day} {next.date} {next.mon} {next.kick}</span>
                  </React.Fragment>
                )}
              </React.Fragment>
            );
          })()}
        </div>
      </div>
    </section>
  );
}

window.Hero = Hero;
