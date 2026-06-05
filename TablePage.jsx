// TablePage.jsx — full League Ten standings with promotion intelligence.
// Sources data from window.RAW_TABLE.
const TOTAL_GAMES = window.LEAGUE_TOTAL_GAMES || 18;
const PROMOTION_SPOTS = window.LEAGUE_PROMOTION_SPOTS || 2;
const RAW_TABLE = window.RAW_TABLE;

// 26/27 DRAFT CONSTITUTION — confirmed opponents (one vacancy still open).
// Marked as a draft; fixtures + final line-up to be confirmed before kick-off.
const DRAFT_2627 = [
  'Barnes Stormers',
  'Bristol City (London) Supporters',
  'Haydons Park',
  'Junction Elite 4th Team',
  'Olympique Mayonnaise',
  "Sue's Angels FC",
  'Three Little Birds FC',
  'TSM Rovers FC',
  'Tyne & Thames FC',
];

function TablePage() {
  const [season, setSeason] = React.useState('25/26');
  const liveTable = window.useLeagueTable ? window.useLeagueTable() : null;
  const RAW_TABLE = liveTable || window.RAW_TABLE;
  const insights = window.tableInsights(RAW_TABLE, TOTAL_GAMES, PROMOTION_SPOTS);
  const lastSync = (() => {
    try { const c = JSON.parse(localStorage.getItem('sa-table-cache') || 'null'); return c && c.at; } catch (e) { return null; }
  })();
  return (
    <React.Fragment>
      <PageHero
        eyebrow={season === '25/26' ? 'LEAGUE TEN · 25/26' : 'LEAGUE EIGHT · 26/27'}
        title={<>THE <em>TABLE</em></>}
        sub={season === '25/26'
          ? 'Live League Ten standings. Positions, promotion places and the title race update automatically as each result comes in.'
          : 'Draft constitution for the 26/27 campaign. Opponents confirmed below — final line-up and fixtures still to be confirmed.'}
      >
        <span className="t-meta" style={{ color: 'var(--fg-3)' }}>
          {season === '25/26'
            ? <>SOURCE · FA FULLTIME{lastSync ? ` · UPDATED ${new Date(lastSync).toLocaleString()}` : ' · LIVE'}</>
            : 'DRAFT · CONFIRMATION TBC'}
        </span>
      </PageHero>

      {/* Season switch */}
      <div className="container" style={{ marginTop: 'var(--sp-4)' }}>
        <div className="tabs">
          {[['25/26', 'League Ten · 25/26'], ['26/27', 'New season · 26/27']].map(([k, l]) => (
            <button key={k} className={`tabs__btn ${season === k ? 'is-active' : ''}`} onClick={() => setSeason(k)}>{l}</button>
          ))}
        </div>
      </div>

      {season === '26/27' ? (
        <section className="section" style={{ paddingTop: 'var(--sp-5)' }}>
          <div className="container">
            <div className="draft-note">
              <span className="draft-note__chip">DRAFT</span>
              <p>The 26/27 draft constitution sees the Angels promoted into a new division against a fresh group of opponents. The line-up below is provisional — <strong>one vacancy is still to be filled</strong> and fixtures will be confirmed before kick-off.</p>
            </div>
            <div className="table-wrap card" style={{ padding: 0, overflow: 'hidden', marginTop: 'var(--sp-4)' }}>
              <table className="lt lt--full">
                <thead>
                  <tr>
                    <th className="lt__num">#</th>
                    <th>Club</th>
                    <th className="lt__num">P</th>
                    <th className="lt__num">W</th>
                    <th className="lt__num">D</th>
                    <th className="lt__num">L</th>
                    <th className="lt__num">PTS</th>
                  </tr>
                </thead>
                <tbody>
                  {DRAFT_2627.map((club, i) => (
                    <tr key={club} className={`lt__row ${club.includes('Angels') ? 'is-us' : ''}`}>
                      <td className="lt__pos">{i + 1}</td>
                      <td className="lt__club"><TeamBadge team={club} size={20} />{club}</td>
                      <td className="lt__num">—</td>
                      <td className="lt__num">—</td>
                      <td className="lt__num">—</td>
                      <td className="lt__num">—</td>
                      <td className="lt__num lt__pts">—</td>
                    </tr>
                  ))}
                  <tr className="lt__row lt__row--vacancy">
                    <td className="lt__pos">{DRAFT_2627.length + 1}</td>
                    <td className="lt__club" style={{ fontStyle: 'italic', color: 'var(--fg-3)' }}>Vacancy — to be confirmed</td>
                    <td className="lt__num">—</td><td className="lt__num">—</td><td className="lt__num">—</td><td className="lt__num">—</td><td className="lt__num lt__pts">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="table-legend">
              <span className="t-meta" style={{ color: 'var(--fg-3)' }}>Provisional line-up · {DRAFT_2627.length} confirmed, 1 vacancy · fixtures TBC</span>
            </div>
          </div>
        </section>
      ) : (
      <React.Fragment>
      {insights.champion && (
        <section className="section" style={{ paddingTop: 'var(--sp-5)', paddingBottom: 'var(--sp-5)' }}>
          <div className="container">
            <div className="champ-banner">
              <div className="champ-banner__mark">
                <img src="assets/badge/sue-angels-shield.png" alt="" />
              </div>
              <div className="champ-banner__copy">
                <span className="t-eyebrow" style={{ color: 'var(--navy)', opacity: 0.7 }}>CONFIRMED 26 APRIL 26</span>
                <h2 className="champ-banner__title">{insights.champion.c.toUpperCase()} — LEAGUE TEN CHAMPIONS</h2>
                <p className="champ-banner__sub">
                  Title clinched at home against Sporting Club Catania (10–1) — {insights.champion.pts} pts and out of reach with games to spare. Promoted as champions.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="section" style={{ paddingTop: 'var(--sp-5)' }}>
        <div className="container">
          <div className="table-wrap card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="lt lt--full">
              <thead>
                <tr>
                  <th className="lt__num">#</th>
                  <th>Club</th>
                  <th className="lt__num">P</th>
                  <th className="lt__num lt__hide-sm">W</th>
                  <th className="lt__num lt__hide-sm">D</th>
                  <th className="lt__num lt__hide-sm">L</th>
                  <th className="lt__num lt__hide-sm">GF</th>
                  <th className="lt__num lt__hide-sm">GA</th>
                  <th className="lt__num">GD</th>
                  <th className="lt__num">PTS</th>
                  <th className="lt__hide-sm">Status</th>
                </tr>
              </thead>
              <tbody>
                {insights.rows.map((row, i) => {
                  const isLastPromotion = (i + 1) === PROMOTION_SPOTS;
                  return (
                    <React.Fragment key={row.p}>
                      <tr className={`${row.us ? 'is-us' : ''} lt__row lt__row--${row.status}`}>
                        <td className="lt__pos">{row.p}</td>
                        <td className="lt__club">
                          <TeamBadge team={row.c} size={20} />
                          {row.c}
                        </td>
                        <td className="lt__num">{row.pl}</td>
                        <td className="lt__num lt__hide-sm">{row.w}</td>
                        <td className="lt__num lt__hide-sm">{row.d}</td>
                        <td className="lt__num lt__hide-sm">{row.l}</td>
                        <td className="lt__num lt__hide-sm">{row.gf}</td>
                        <td className="lt__num lt__hide-sm">{row.ga}</td>
                        <td className="lt__num">{row.gd}</td>
                        <td className="lt__num lt__pts">{row.pts}</td>
                        <td className="lt__hide-sm">
                          <span className={`status-pill status-pill--${row.status}`}>{row.statusLabel}</span>
                        </td>
                      </tr>
                      {isLastPromotion && (
                        <tr className="lt__divider"><td colSpan="11"><span>PROMOTION LINE — TOP {PROMOTION_SPOTS} PROMOTED</span></td></tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="table-legend">
            <span><span className="status-pill status-pill--champion">CHAMPIONS</span></span>
            <span><span className="status-pill status-pill--promoted">PROMOTED</span></span>
            <span><span className="status-pill status-pill--promotion-contender">CONTENDER</span></span>
            <span><span className="status-pill status-pill--eliminated">ELIMINATED</span></span>
            <span style={{ marginLeft: 'auto', color: 'var(--fg-3)' }} className="t-meta">{insights.narrative}</span>
          </div>
        </div>
      </section>
      </React.Fragment>
      )}
    </React.Fragment>
  );
}

window.TablePage = TablePage;
