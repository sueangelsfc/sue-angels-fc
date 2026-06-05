// FixturesPage.jsx — full fixtures with 25/26 vs 26/27 season tabs.
// 25/26 ran to 31 May 2026. 26/27 kicks off in September 2026 — schedule pending.
function compIsLeague(c) { return (c || '').toLowerCase().includes('league'); }

function FxCard({ fx }) {
  return (
    <article className="fixture-card fixture-card--row">
      <div className="fixture-card__rail" />
      <div className="fixture-card__date">
        <div className="fixture-card__day">{fx.date}</div>
        <div className="fixture-card__mon">{fx.day} · {fx.mon}</div>
      </div>
      <div className="fixture-card__teams">
        <div className="fixture-card__row">
          <TeamBadge team={fx.home} />
          <span className="fixture-card__name">{fx.home}</span>
        </div>
        <div className="fixture-card__vs">vs</div>
        <div className="fixture-card__row">
          <TeamBadge team={fx.away} />
          <span className="fixture-card__name">{fx.away}</span>
        </div>
        <div className="fixture-card__meta">
          <span>{fx.comp}</span><span className="fixture-card__sep">·</span>
          <span className={fx.loc === 'Home' ? 'fixture-card__home' : 'fixture-card__away'}>{fx.loc}</span>
          <span className="fixture-card__sep">·</span>
          <span style={{ color: fx.status === 'CONFIRMED' ? 'var(--volt)' : 'var(--fg-3)' }}>{fx.status}</span>
        </div>
        {window.MatchEntry && (
          <div style={{ marginTop: 12 }}>
            <MatchEntry matchId={fx.id} matchLabel={`${fx.home} vs ${fx.away} · ${fx.day} ${fx.date} ${fx.mon} · ${fx.comp}`} />
          </div>
        )}
      </div>
      <div className="fixture-card__kick">
        <div className="fixture-card__time">{fx.kick}</div>
        <div className="fixture-card__ven">{fx.ven}</div>
      </div>
    </article>
  );
}

function PendingSeasonState() {
  const next = window.SEASON_INFO ? window.SEASON_INFO.next : null;
  const days = window.daysUntilNextSeason ? window.daysUntilNextSeason() : null;
  return (
    <div className="placeholder placeholder--big">
      <div className="placeholder__inner">
        <span className="t-eyebrow" style={{ color: 'var(--volt)' }}>26 / 27 SEASON · PENDING</span>
        <h3 className="placeholder__big-title">FIXTURES TO BE CONFIRMED</h3>
        <p className="placeholder__copy">
          The 26/27 season kicks off later this year &mdash; start date TBC. Once the league confirms the fixture list, every match drops here automatically.
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="join.html" className="btn btn--volt">Join the squad for 26/27 →</a>
          <a href="sponsors.html" className="btn btn--ghost">Sponsor enquiries</a>
        </div>
      </div>
    </div>
  );
}

function FixturesPage() {
  // Subscribe to admin fixture changes so the page re-renders when the admin
  // adds/removes a fixture via the FixtureAdminPanel.
  if (window.useAdminFixtures) window.useAdminFixtures();
  const all = window.getActiveUpcoming ? window.getActiveUpcoming() : (window.UPCOMING_FIXTURES || []);
  const current = window.SEASON_INFO ? window.SEASON_INFO.current : { name: '25/26' };
  const next    = window.SEASON_INFO ? window.SEASON_INFO.next    : { name: '26/27' };
  const state   = window.getSeasonState ? window.getSeasonState() : { phase: 'active' };

  // Default tab = whichever season is currently most relevant.
  const initialTab = state.phase === 'active' ? 'current' : 'next';
  const [tab, setTab]    = React.useState(initialTab);
  const [filter, setFilter] = React.useState('all');

  // Stub: current-season fixtures are the ones in UPCOMING. 26/27 has none yet.
  const currentFixtures = all;
  const nextFixtures = []; // No 26/27 fixtures published yet.

  const fixturesForTab = tab === 'current' ? currentFixtures : nextFixtures;
  const counts = {
    all:    fixturesForTab.length,
    league: fixturesForTab.filter((fx) => compIsLeague(fx.comp)).length,
    cup:    fixturesForTab.filter((fx) => !compIsLeague(fx.comp)).length,
    home:   fixturesForTab.filter((fx) => fx.loc === 'Home').length,
    away:   fixturesForTab.filter((fx) => fx.loc === 'Away').length,
  };
  const filtered = fixturesForTab.filter((fx) => {
    if (filter === 'all')    return true;
    if (filter === 'home')   return fx.loc === 'Home';
    if (filter === 'away')   return fx.loc === 'Away';
    if (filter === 'league') return compIsLeague(fx.comp);
    if (filter === 'cup')    return !compIsLeague(fx.comp);
    return true;
  });

  const heroSub =
    state.phase === 'active'
      ? `${currentFixtures.length} fixture${currentFixtures.length === 1 ? '' : 's'} left in 25/26. The 26/27 schedule lands over the summer.`
      : state.phase === 'between'
        ? `25/26 complete. 26/27 kicks off in September — schedule pending.`
        : `26/27 season in progress.`;

  return (
    <React.Fragment>
      <PageHero
        eyebrow={state.phase === 'active' ? '25/26 SEASON · LEAGUE TEN' : '26/27 SEASON · PRESEASON'}
        title={<>FIX<em>TURES</em></>}
        sub={heroSub}
      />

      <div className="container">
        <div className="tabs">
          <button className={`tabs__btn ${tab === 'current' ? 'is-active' : ''}`} onClick={() => { setTab('current'); setFilter('all'); }}>
            {current.name} {state.phase !== 'active' ? '· COMPLETE' : ''}
            <span style={{ marginLeft: 8, opacity: 0.6 }}>{currentFixtures.length}</span>
          </button>
          <button className={`tabs__btn ${tab === 'next' ? 'is-active' : ''}`} onClick={() => { setTab('next'); setFilter('all'); }}>
            {next.name} · PENDING
            <span style={{ marginLeft: 8, opacity: 0.6 }}>{nextFixtures.length}</span>
          </button>
        </div>
        {/* Admin-only "+ ADD FIXTURE" launcher + admin-fixture review list. */}
        {window.FixtureAdminPanel && <window.FixtureAdminPanel />}
      </div>

      {tab === 'current' && fixturesForTab.length > 0 && (
        <div className="container">
          <div className="filters">
            {[
              ['all',    'All',    counts.all],
              ['league', 'League', counts.league],
              ['cup',    'Cup',    counts.cup],
              ['home',   'Home',   counts.home],
              ['away',   'Away',   counts.away],
            ].map(([k, l, n]) => (
              <button key={k} className={`chip ${filter === k ? 'chip--volt' : ''}`} onClick={() => setFilter(k)}>
                {l} <span style={{ opacity: 0.6, marginLeft: 6 }}>{n}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <section className="section section--compact" style={{ paddingTop: 'var(--sp-5)' }}>
        <div className="container">
          {tab === 'next' ? (
            <PendingSeasonState />
          ) : filtered.length > 0 ? (
            <div className="fixture-list">
              {filtered.map((fx) => <FxCard key={fx.id} fx={fx} />)}
            </div>
          ) : (
            <div className="placeholder placeholder--big">
              <div className="placeholder__inner">
                <span className="t-eyebrow" style={{ color: 'var(--volt)' }}>SEASON COMPLETE</span>
                <h3 className="placeholder__big-title">25/26 IS DONE.</h3>
                <p className="placeholder__copy">Every fixture played. League Ten champions. Check the Results page for the full archive.</p>
                <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <a href="results.html" className="btn btn--volt">View results →</a>
                  <a href="table.html" className="btn btn--ghost">Final table</a>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </React.Fragment>
  );
}

window.FixturesPage = FixturesPage;
