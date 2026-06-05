// ScheduleRedesign.jsx, public fixtures / results / league table (v2).
// Admin match-data entry is consolidated into the CMS control panel.
const { Reveal, RDArrow, RDPage, RDPageHero } = window;

const RD_DRAFT_2627 = [
  'Barnes Stormers', 'Bristol City (London) Supporters', 'Haydons Park',
  'Junction Elite 4th Team', 'Olympique Mayonnaise', "Sue's Angels FC",
  'Three Little Birds FC', 'TSM Rovers FC', 'Tyne & Thames FC',
];

function RDResultCard({ r }) {
  const usHome = r.home.includes('Angels');
  const us = usHome ? r.hs : r.as, them = usHome ? r.as : r.hs;
  let res = 'l';
  if (r.kind === 'walkover') res = 'w';
  else if (r.kind === 'penalty' && r.pens) { const uP = usHome ? r.pens.hs : r.pens.as, tP = usHome ? r.pens.as : r.pens.hs; res = uP > tP ? 'w' : 'l'; }
  else if (us > them) res = 'w'; else if (us === them) res = 'd';
  return (
    <div className="rd-result rd-result--grid">
      <div className="rd-result__top"><span className={`rd-wdl rd-wdl--${res}`}>{res.toUpperCase()}</span><span className="rd-result__date">{r.date}{r.kick ? ` · ${r.kick}` : ''}</span></div>
      <div className={`rd-result__row ${usHome && res === 'w' ? 'rd-result__row--win' : ''}`}>{window.TeamBadge ? <window.TeamBadge team={r.home} size={30} /> : null}<span>{r.home.replace(' FC', '')}</span><b>{r.kind === 'walkover' ? (usHome ? 'W' : ', ') : r.hs}</b></div>
      <div className={`rd-result__row ${!usHome && res === 'w' ? 'rd-result__row--win' : ''}`}>{window.TeamBadge ? <window.TeamBadge team={r.away} size={30} /> : null}<span>{r.away.replace(' FC', '')}</span><b>{r.kind === 'walkover' ? (!usHome ? 'W' : ', ') : r.as}</b></div>
      {r.kind === 'penalty' && r.pens ? <div className="rd-result__pens">Pens {r.pens.hs}–{r.pens.as}</div> : null}
      <div className="rd-result__comp">{(r.competition || 'League Ten')} · {(r.venue || (usHome ? 'Home' : 'Away'))}</div>
    </div>
  );
}

function RDFixturesTab() {
  const SEASONS = window.ALL_SEASONS || ['25/26'];
  const st = window.getSeasonState ? window.getSeasonState() : { phase: 'active' };
  const completedName = (st.phase !== 'active' && window.SEASON_INFO) ? window.SEASON_INFO.current.name : null;
  const upcomingName = window.SEASON_INFO ? window.SEASON_INFO.next.name : SEASONS[SEASONS.length - 1];
  const baseSeasonOf = window.seasonOf || (() => window.CURRENT_SEASON);
  // A completed season (e.g. 25/26) can't have upcoming fixtures — anything still
  // upcoming belongs to the next season, so 25/26 shows 0 and 26/27 shows them.
  const effSeason = (f) => { const s = baseSeasonOf(f) || window.CURRENT_SEASON; return (s === completedName || !s) ? upcomingName : s; };
  const [season, setSeason] = React.useState(completedName ? upcomingName : (window.CURRENT_SEASON || SEASONS[0]));
  const all = window.getActiveUpcoming ? window.getActiveUpcoming() : (window.UPCOMING_FIXTURES || []);
  const fixtures = all.filter((f) => effSeason(f) === season);
  const tabs = (<div className="rd-tabs" style={{ marginBottom: 22 }}>{SEASONS.map((sx) => <button key={sx} className={`rd-tab ${season === sx ? 'is-active' : ''}`} onClick={() => setSeason(sx)}>{sx}</button>)}</div>);
  if (!fixtures.length) {
    const days = window.daysUntilNextSeason ? window.daysUntilNextSeason() : null;
    return (
      <div>{tabs}<div className="rd-empty">
        {season === '26/27' ? (
          <React.Fragment>
            <p className="rd-eyebrow">26/27</p>
            <h3 className="rd-h2" style={{ marginTop: 12 }}>Pre-season starts 24 June.</h3>
            <p className="rd-lead" style={{ margin: '16px auto 0' }}>Training every Sunday after that, 10:00 at the home ground. League fixtures land over the summer and drop here automatically. {days ? `${days} days to the first session.` : ''}</p>
            <a href="join.html" className="rd-btn rd-btn--volt rd-btn--lg" style={{ marginTop: 26 }}>Trial for the squad <RDArrow /></a>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <img src="assets/badge/sue-angels-shield.png" alt="" className="rd-complete__badge" />
            <p className="rd-eyebrow" style={{ justifyContent: 'center', display: 'flex' }}>{season} · Champions</p>
            <h3 className="rd-h2" style={{ marginTop: 12 }}>Season complete. Unbeaten.</h3>
            <p className="rd-lead" style={{ margin: '16px auto 0' }}>Every {season} fixture has been played. See how the title was won.</p>
            {(() => { const t = window.rdLeagueTotals ? window.rdLeagueTotals() : null; return t ? (
              <div className="rd-complete__stats">
                {[['Played', t.pl], ['Won', t.w], ['Goal diff', (t.gd >= 0 ? '+' : '') + t.gd], ['Points', t.pts]].map(([l, v], i) => (<div key={i} className="rd-complete__stat" style={{ animationDelay: (0.08 * i) + 's' }}><b>{v}</b><span>{l}</span></div>))}
              </div>
            ) : null; })()}
            <a href="results.html" className="rd-btn rd-btn--volt rd-btn--lg" style={{ marginTop: 26 }}>View results <RDArrow /></a>
          </React.Fragment>
        )}
      </div></div>
    );
  }
  return (
    <div>{tabs}<div className="rd-fixtures">
      {fixtures.map((f) => (
        <div className="rd-fixture" key={f.id}>
          <div className="rd-fixture__date">{f.date === 'TBC' ? <React.Fragment><b>TBC</b><span>Date</span></React.Fragment> : <React.Fragment><b>{f.date}</b><span>{f.mon} &middot; {f.day}</span></React.Fragment>}</div>
          <div className="rd-fixture__teams">
            <div className="rd-fixture__t">{window.TeamBadge ? <window.TeamBadge team={f.home} size={34} /> : null}<span>{f.home.replace(' FC', '')}</span></div>
            <span className="rd-fixture__vs">{f.kick || 'KO'}</span>
            <div className="rd-fixture__t rd-fixture__t--away"><span>{f.away.replace(' FC', '')}</span>{window.TeamBadge ? <window.TeamBadge team={f.away} size={34} /> : null}</div>
          </div>
          <div className="rd-fixture__meta"><span className="rd-chip">{f.comp || 'League'}</span><span className="rd-chip">{f.loc || 'Home'}</span>{f.ven ? <span className="rd-fixture__ven">{f.ven}</span> : null}</div>
        </div>
      ))}
    </div></div>
  );
}

function RDResultsTab() {
  const SEASONS = window.ALL_SEASONS || ['25/26'];
  const [season, setSeason] = React.useState(window.CURRENT_SEASON || SEASONS[0]);
  const COMPS = window.COMPETITIONS || [{ key: 'all', label: 'All', match: () => true }];
  const [comp, setComp] = React.useState('all');
  const matcher = (COMPS.find((c) => c.key === comp) || { match: () => true }).match;
  const seasonOf = window.seasonOf || (() => window.CURRENT_SEASON);
  const results = (window.getDerivedResults ? window.getDerivedResults() : (window.SEASON_RESULTS || []))
    .filter((r) => (seasonOf(r) || window.CURRENT_SEASON) === season)
    .filter((r) => matcher(r.competition));
  return (
    <div>
      <p className="rd-eyebrow" style={{ marginBottom: 10 }}>Season</p>
      <div className="rd-tabs" style={{ marginBottom: 18 }}>
        {SEASONS.map((sx) => <button key={sx} className={`rd-tab ${season === sx ? 'is-active' : ''}`} onClick={() => setSeason(sx)}>{sx}</button>)}
      </div>
      <p className="rd-eyebrow" style={{ marginBottom: 10 }}>Competition</p>
      <div className="rd-tabs" style={{ marginBottom: 22 }}>
        {COMPS.map((c) => <button key={c.key} className={`rd-tab ${comp === c.key ? 'is-active' : ''}`} onClick={() => setComp(c.key)}>{c.label}</button>)}
      </div>
      {results.length ? <div className="rd-results-grid">{results.map((r) => <RDResultCard key={r.id} r={r} />)}</div> : <p className="rd-lead" style={{ color: 'var(--fg-3)' }}>No results in {season} yet.</p>}
    </div>
  );
}

function RDTableTab() {
  const [season, setSeason] = React.useState('25/26');
  const rows = window.RAW_TABLE || [];
  return (
    <div>
      <div className="rd-tabs" style={{ marginBottom: 22 }}>
        <button className={`rd-tab ${season === '25/26' ? 'is-active' : ''}`} onClick={() => setSeason('25/26')}>League Ten · 25/26</button>
        <button className={`rd-tab ${season === '26/27' ? 'is-active' : ''}`} onClick={() => setSeason('26/27')}>League Eight · 26/27</button>
      </div>
      {season === '25/26' ? (
        <div className="rd-table-card">
          <table className="rd-table">
            <thead><tr><th className="rd-table__crumb"></th><th>#</th><th>Club</th><th className="rd-hide-sm">P</th><th className="rd-hide-sm">W</th><th className="rd-hide-sm">D</th><th className="rd-hide-sm">L</th><th className="rd-hide-sm">GF</th><th className="rd-hide-sm">GA</th><th>GD</th><th>PTS</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.c} className={`${r.us ? 'is-us' : ''} ${i < 2 ? 'is-promo' : ''}`}>
                  <td className="rd-table__crumb"><span /></td>
                  <td className="rd-table__pos">{r.p}</td>
                  <td><span className="rd-table__club">{window.TeamBadge ? <window.TeamBadge team={r.c} size={26} /> : null}{r.c.replace(' FC', '')}</span></td>
                  <td className="rd-hide-sm">{r.pl}</td><td className="rd-hide-sm">{r.w}</td><td className="rd-hide-sm">{r.d}</td><td className="rd-hide-sm">{r.l}</td><td className="rd-hide-sm">{r.gf}</td><td className="rd-hide-sm">{r.ga}</td>
                  <td>{r.gd}</td><td className="rd-table__pts">{r.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div>
          <div className="rd-draft-note"><span className="rd-chip rd-chip--volt">Draft</span><p>Promoted into League Eight for 26/27. This line-up is provisional, one vacancy still to fill, fixtures confirmed before kick-off.</p></div>
          <div className="rd-table-card" style={{ marginTop: 16 }}>
            <table className="rd-table">
              <thead><tr><th>#</th><th>Club</th><th>P</th><th>W</th><th>D</th><th>PTS</th></tr></thead>
              <tbody>
                {RD_DRAFT_2627.map((c, i) => (
                  <tr key={c} className={c.includes('Angels') ? 'is-us' : ''}>
                    <td className="rd-table__pos">{i + 1}</td>
                    <td><span className="rd-table__club">{window.TeamBadge ? <window.TeamBadge team={c} size={26} /> : null}{c.replace(' FC', '')}</span></td>
                    <td>, </td><td>, </td><td>, </td><td className="rd-table__pts">, </td>
                  </tr>
                ))}
                <tr><td className="rd-table__pos">{RD_DRAFT_2627.length + 1}</td><td style={{ color: 'var(--fg-3)', fontStyle: 'italic' }}>Vacancy, to be confirmed</td><td>, </td><td>, </td><td>, </td><td>, </td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ScheduleV2() {
  const fixtures = window.getActiveUpcoming ? window.getActiveUpcoming() : (window.UPCOMING_FIXTURES || []);
  const results = window.getDerivedResults ? window.getDerivedResults() : (window.SEASON_RESULTS || []);
  const initial = (window.RD_SCHEDULE_TAB) || (() => { try { return new URL(location.href).searchParams.get('tab'); } catch (e) { return null; } })() || (fixtures.length ? 'upcoming' : 'results');
  const [tab, setTab] = React.useState(['upcoming', 'results', 'table'].includes(initial) ? initial : 'results');
  React.useEffect(() => { try { const u = new URL(location.href); u.searchParams.set('tab', tab); history.replaceState({}, '', u); } catch (e) {} }, [tab]);
  const sub = tab === 'upcoming' ? 'Fixtures across the season.' : tab === 'results' ? 'Every result, League Ten and the cups.' : 'The League Ten table, and the 26/27 line-up.';
  return (
    <RDPage>
      <main>
        <RDPageHero eyebrow="Matchday" title={<>The <em>schedule</em>.</>} sub={sub} />
        <section className="rd-section rd-section--tight">
          <div className="rd-container">
            <div className="rd-tabs" style={{ marginBottom: 32 }}>
              <button className={`rd-tab ${tab === 'upcoming' ? 'is-active' : ''}`} onClick={() => setTab('upcoming')}>Fixtures <span className="rd-tab__n">{fixtures.length}</span></button>
              <button className={`rd-tab ${tab === 'results' ? 'is-active' : ''}`} onClick={() => setTab('results')}>Results <span className="rd-tab__n">{results.length}</span></button>
              <button className={`rd-tab ${tab === 'table' ? 'is-active' : ''}`} onClick={() => setTab('table')}>League table</button>
            </div>
            {tab === 'upcoming' && <RDFixturesTab />}
            {tab === 'results' && <RDResultsTab />}
            {tab === 'table' && <RDTableTab />}
          </div>
        </section>
      </main>
    </RDPage>
  );
}

ReactDOM.createRoot(document.getElementById('rd-root')).render(<ScheduleV2 />);
