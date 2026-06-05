// TablePreview.jsx — compact league table preview with promotion intelligence.
const PREVIEW_TABLE = [
  { p: 1,  c: "Sue's Angels FC",         pl: 16, w: 16, d: 0, l: 0,  gd: '+75', pts: 48, us: true },
  { p: 2,  c: 'Brockwell Violets FC',    pl: 18, w: 10, d: 3, l: 5,  gd: '+26', pts: 33 },
  { p: 3,  c: 'Hillside Elite FC Blues', pl: 16, w: 8,  d: 4, l: 4,  gd: '+10', pts: 28 },
  { p: 4,  c: "BPR Men's",               pl: 17, w: 8,  d: 4, l: 5,  gd: '+8',  pts: 28 },
  { p: 5,  c: 'Dynamo London FC',        pl: 18, w: 7,  d: 5, l: 6,  gd: '-4',  pts: 26 },
];
const TOTAL_GAMES = 18;
const PROMOTION_SPOTS = 2;

function TablePreview() {
  const live = window.useLeagueTable ? window.useLeagueTable() : null;
  // Use the full table for accurate math, then slice for preview.
  const full = live || window.RAW_TABLE || PREVIEW_TABLE;
  const insights = window.tableInsights(full, TOTAL_GAMES, PROMOTION_SPOTS);
  const previewRows = insights.rows.slice(0, 5);

  return (
    <section id="table" className="section section--compact">
      <div className="container">
        <header className="section__head section__head--compact">
          <div>
            <div className="t-eyebrow">LEAGUE TEN · 25/26</div>
            <h2 className="t-h2">LEAGUE TABLE</h2>
          </div>
          <a href="schedule.html?tab=table" className="section__more">Full table <span aria-hidden="true">→</span></a>
        </header>

        {insights.champion && insights.champion.us && (
          <div className="champ-strip">
            <span className="champ-strip__chip">CHAMPIONS</span>
            <span className="champ-strip__copy">
              <strong>Title clinched 26 April 26.</strong> 10–1 home win over Sporting Catania made it mathematically impossible to catch.
            </span>
          </div>
        )}

        <div className="table-wrap">
          <table className="lt">
            <thead>
              <tr>
                <th className="lt__num">#</th>
                <th>Club</th>
                <th className="lt__num lt__hide-sm">P</th>
                <th className="lt__num lt__hide-sm">W</th>
                <th className="lt__num lt__hide-sm">D</th>
                <th className="lt__num lt__hide-sm">L</th>
                <th className="lt__num">GD</th>
                <th className="lt__num">PTS</th>
                <th className="lt__hide-sm">Status</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.map((r, i) => {
                const isLastPromotion = (i + 1) === PROMOTION_SPOTS;
                return (
                  <React.Fragment key={r.p}>
                    <tr className={`${r.us ? 'is-us' : ''} lt__row--${r.status}`}>
                      <td className="lt__pos">{r.p}</td>
                      <td className="lt__club"><TeamBadge team={r.c} size={18} />{r.c}</td>
                      <td className="lt__num lt__hide-sm">{r.pl}</td>
                      <td className="lt__num lt__hide-sm">{r.w}</td>
                      <td className="lt__num lt__hide-sm">{r.d}</td>
                      <td className="lt__num lt__hide-sm">{r.l}</td>
                      <td className="lt__num">{r.gd}</td>
                      <td className="lt__num lt__pts">{r.pts}</td>
                      <td className="lt__hide-sm">
                        <span className={`status-pill status-pill--${r.status}`}>{r.statusLabel}</span>
                      </td>
                    </tr>
                    {isLastPromotion && (
                      <tr className="lt__divider"><td colSpan="9"><span>PROMOTION LINE</span></td></tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

window.TablePreview = TablePreview;
