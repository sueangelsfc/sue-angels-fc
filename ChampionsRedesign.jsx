// ChampionsRedesign.jsx — title celebration + full season stats (v2 glass).
const { Reveal, RDArrow, RDPage } = window;

// animated progress-ring tile (matches the player-profile rings)
function ChRing({ label, value, suffix, pct, sub, on }) {
  const C = 2 * Math.PI * 52;
  const dash = Math.max(0, Math.min(1, pct || 0)) * C;
  return (
    <div className="rd-ring2">
      <div className="rd-ring2__top">
        <div className="rd-ring2__nums">
          <div className="rd-ring2__val">{value}{suffix || ''}</div>
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

const CH_ICON = {
  trophy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>,
  pulse: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l2 7 4-14 2 7h6"/></svg>,
  shield: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 5 6v5c0 4.5 3 7.5 7 10 4-2.5 7-5.5 7-10V6l-7-3Z"/></svg>,
};

function ChampionsV2() {
  const t = window.rdLeagueTotals();
  const [on, setOn] = React.useState(false);
  React.useEffect(() => { const id = requestAnimationFrame(() => setOn(true)); return () => cancelAnimationFrame(id); }, []);

  const allLeague = (window.getDerivedResults ? window.getDerivedResults() : (window.SEASON_RESULTS || []))
    .filter((r) => (r.competition || '').toLowerCase().includes('league'));
  let cleanSheets = 0;
  for (const r of allLeague) {
    const usHome = r.home.includes('Angels');
    const them = usHome ? r.as : r.hs;
    if (r.kind !== 'walkover' && them === 0) cleanSheets++;
  }
  const leagueResults = allLeague.slice(0, 8);
  const maxPts = t.pl * 3;
  const gpg = t.pl ? (t.gf / t.pl) : 0;

  const rings = [
    { label: 'Win rate', value: t.winPct, suffix: '%', pct: t.winPct / 100, sub: `${t.w}W ${t.d}D ${t.l}L` },
    { label: 'Points won', value: t.pts, pct: maxPts ? t.pts / maxPts : 0, sub: `of ${maxPts} available` },
    { label: 'Goals / game', value: gpg.toFixed(1), pct: Math.min(1, gpg / 4), sub: `${t.gf} scored in ${t.pl}` },
    { label: 'Clean sheets', value: cleanSheets, pct: t.pl ? cleanSheets / t.pl : 0, sub: `in ${t.pl} games` },
  ];
  const record = [
    ['Played', t.pl], ['Won', t.w], ['Drawn', t.d], ['Lost', t.l],
    ['Goals for', t.gf], ['Against', t.ga], ['Goal diff', (t.gd >= 0 ? '+' : '') + t.gd], ['Points', t.pts],
  ];
  const insights = [
    t.l === 0 ? ['trophy', 'Unbeaten champions', `${t.pl} league games, ${t.l} defeats`] : ['trophy', 'League Ten champions', `${t.w} wins from ${t.pl}`],
    ['pulse', `${t.gf} goals scored`, `${gpg.toFixed(1)} per game — best in the division`],
    ['shield', `${t.ga} conceded`, `${cleanSheets} clean sheet${cleanSheets === 1 ? '' : 's'} kept`],
  ];

  return (
    <RDPage>
      <main>
        {/* Celebration hero */}
        <section className="rd-champ-hero">
          <div className="rd-container">
            <div className="rd-champ-hero__inner rd-reveal">
              <img className="rd-champ-hero__badge" src="assets/badge/sue-angels-badge-cutout.png" alt="Sue's Angels FC" />
              <span className="rd-chip rd-chip--volt" style={{ marginTop: 22 }}>League Ten · 25/26</span>
              <h1 className="rd-display" style={{ marginTop: 16 }}>Champions.</h1>
              <p className="rd-lead" style={{ margin: '18px auto 0', maxWidth: '46ch' }}>
                {t.l === 0 ? 'Unbeaten in our inaugural season.' : `${t.w} wins from ${t.pl}.`} {t.pl} played · {t.w} won · {t.gf} scored · {t.ga} conceded.
              </p>
            </div>
          </div>
        </section>

        {/* The numbers — premium rings + record + insights */}
        <Reveal as="section" className="rd-section rd-section--tight">
          <div className="rd-container">
            <div className="rd-section__head"><div><p className="rd-eyebrow">League Ten · 25/26</p><h2 className="rd-h2">The season in numbers</h2></div></div>
            <div className="rd-rings">
              {rings.map((r, i) => <ChRing key={i} {...r} on={on} />)}
            </div>
            <div className="rd-pp2" style={{ marginTop: 16 }}>
              <div className="rd-card">
                <p className="rd-eyebrow rd-eyebrow--plain" style={{ color: 'var(--fg-3)' }}>Final league record</p>
                <div className="rd-champ-record">
                  {record.map(([l, v]) => (
                    <div className="rd-champ-record__cell" key={l}><b>{v}</b><span>{l}</span></div>
                  ))}
                </div>
              </div>
              <div className="rd-card">
                <p className="rd-eyebrow rd-eyebrow--plain" style={{ color: 'var(--fg-3)' }}>What it took</p>
                <div className="rd-insights">
                  {insights.map((it, i) => (
                    <div className="rd-insight" key={i}>
                      <span className="rd-insight__ic">{CH_ICON[it[0]]}</span>
                      <div className="rd-insight__tx"><div className="rd-insight__t">{it[1]}</div><div className="rd-insight__s">{it[2]}</div></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Recent league results */}
        {leagueResults.length ? (
          <Reveal as="section" className="rd-section rd-section--tight">
            <div className="rd-container">
              <div className="rd-section__head"><div><p className="rd-eyebrow">Every game</p><h2 className="rd-h2">League results</h2></div>
                <a href="results.html" className="rd-btn rd-btn--ghost rd-btn--sm">All results <RDArrow /></a></div>
            </div>
            <div className="rd-container">
              <div className="rd-rail">
                {leagueResults.map((r) => {
                  const usHome = r.home.includes('Angels');
                  const us = usHome ? r.hs : r.as, them = usHome ? r.as : r.hs;
                  let res = us > them ? 'w' : us === them ? 'd' : 'l';
                  if (r.kind === 'walkover') res = 'w';
                  return (
                    <div className="rd-result" key={r.id}>
                      <div className="rd-result__top"><span className={`rd-wdl rd-wdl--${res}`}>{res.toUpperCase()}</span><span className="rd-result__date">{r.date}</span></div>
                      <div className={`rd-result__row ${usHome && res === 'w' ? 'rd-result__row--win' : ''}`}>{window.TeamBadge ? <window.TeamBadge team={r.home} size={30} /> : null}<span>{r.home.replace(' FC', '')}</span><b>{r.kind === 'walkover' ? (usHome ? 'W' : ', ') : r.hs}</b></div>
                      <div className={`rd-result__row ${!usHome && res === 'w' ? 'rd-result__row--win' : ''}`}>{window.TeamBadge ? <window.TeamBadge team={r.away} size={30} /> : null}<span>{r.away.replace(' FC', '')}</span><b>{r.kind === 'walkover' ? (!usHome ? 'W' : ', ') : r.as}</b></div>
                      <div className="rd-result__comp">{r.competition || 'League Ten'} · {usHome ? 'Home' : 'Away'}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Reveal>
        ) : null}

        {/* Up next */}
        <Reveal as="section" className="rd-section rd-section--tight">
          <div className="rd-container">
            <div className="rd-join">
              <p className="rd-eyebrow rd-eyebrow--plain rd-volt" style={{ display: 'flex', justifyContent: 'center' }}>26/27</p>
              <h2 className="rd-h2" style={{ marginTop: 14 }}>Promoted. Same standard.</h2>
              <p className="rd-join__sub rd-lead">A division up for 26/27. Fixtures land over the summer, date to be confirmed.</p>
              <div className="rd-join__ctas">
                <a href="table.html" className="rd-btn rd-btn--volt rd-btn--lg">26/27 line-up <RDArrow /></a>
                <a href="join.html" className="rd-btn rd-btn--ghost rd-btn--lg">Trials open</a>
              </div>
            </div>
          </div>
        </Reveal>
      </main>
    </RDPage>
  );
}

ReactDOM.createRoot(document.getElementById('rd-root')).render(<ChampionsV2 />);
