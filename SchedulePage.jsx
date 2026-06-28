// SchedulePage.jsx, combined Fixtures + Results + Table page.
// Three internal tabs: Upcoming / Results / Table.

function SchedulePage() {
  const upcoming = window.getActiveUpcoming ? window.getActiveUpcoming() : (window.UPCOMING_FIXTURES || []);
  const results  = window.getDerivedResults ? window.getDerivedResults() : (window.SEASON_RESULTS || []);

  const defaultTab = upcoming.length > 0 ? 'upcoming' : 'results';
  const tabFromQuery = (() => {
    try { return new URL(window.location.href).searchParams.get('tab'); } catch (e) { return null; }
  })();
  const valid = ['upcoming', 'results', 'table'];
  const [tab, setTab] = React.useState(valid.includes(tabFromQuery) ? tabFromQuery : defaultTab);

  React.useEffect(() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url);
    } catch (e) {}
  }, [tab]);

  // Tab-aware page hero copy.
  const heroSub =
    tab === 'upcoming' ? `${upcoming.length} ${upcoming.length === 1 ? 'fixture' : 'fixtures'} remaining this season.`
  : tab === 'results'  ? `Every result so far across League Ten and the cups.`
  :                      `League Ten standings, updated as results come in.`;

  return (
    <React.Fragment>
      <PageHero
        eyebrow="MATCHDAY"
        title={<>SUE&rsquo;S ANGELS <em>SCHEDULE</em></>}
        sub={heroSub}
      />

      <div className="container" style={{ marginTop: 'var(--sp-4)' }}>
        <div className="tabs tabs--lg">
          <button className={`tabs__btn ${tab === 'upcoming' ? 'is-active' : ''}`} onClick={() => setTab('upcoming')}>
            Fixtures <span>{upcoming.length}</span>
          </button>
          <button className={`tabs__btn ${tab === 'results' ? 'is-active' : ''}`} onClick={() => setTab('results')}>
            Results <span>{results.length}</span>
          </button>
          <button className={`tabs__btn ${tab === 'table' ? 'is-active' : ''}`} onClick={() => setTab('table')}>
            League Table
          </button>
        </div>
      </div>

      {tab === 'upcoming' && window.FixturesPage && <FixturesPage />}
      {tab === 'results'  && window.ResultsPage  && <ResultsPage  />}
      {tab === 'table'    && (
        window.TablePage
          ? <TablePage />
          : <section className="section section--compact"><div className="container"><p style={{ color: 'var(--fg-3)' }}>League table is loading…</p></div></section>
      )}
    </React.Fragment>
  );
}

window.SchedulePage = SchedulePage;
