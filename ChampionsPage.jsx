// ChampionsPage.jsx — celebration of the 25/26 League Ten title.
// All numbers DERIVE from the actual results + fixtures so the page stays
// honest as games are played or added.

// ─── Count-up animation hook ──────────────────────────────────────────
// NOTE: the scroll-triggered tween produced corrupted values inside scaled/
// embedded viewports (e.g. huge negative numbers on mobile). Correctness of
// the displayed stat matters more than the flourish, so this now returns the
// real value immediately. The ref is kept so callers' markup is unchanged.
function useCountUp(target /*, duration */) {
  const ref = React.useRef(null);
  return [target, ref];
}

function ChampStatTile({ s, isHero }) {
  const [val, ref] = useCountUp(s.v, isHero ? 1800 : 1400);
  const isZero = s.v === 0 || s.v === '0' || s.v === '+0' || s.v === '0%';
  const cls = `champ-stat${isHero ? ' champ-stat--hero' : ''}${isZero && s.zeroIsGood ? ' champ-stat--perfect' : ''}${s.accent ? ' champ-stat--' + s.accent : ''}`;
  return (
    <div ref={ref} className={cls} title={s.tooltip || ''}>
      <div className="champ-stat__rail" aria-hidden="true" />
      <div className="champ-stat__v">{val}</div>
      <div className="champ-stat__l">{s.l}</div>
      {s.sub && <div className="champ-stat__sub">{s.sub}</div>}
    </div>
  );
}

// Days-until widget for the 26/27 kickoff. Updates daily on render.
function useDaysUntil(targetIsoDate) {
  // targetIsoDate: 'YYYY-MM-DD'
  const target = new Date(targetIsoDate + 'T00:00:00');
  const now = new Date();
  const ms = target - now;
  const days = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  return { days, target };
}

function ChampionsPage() {
  // Derive everything from window.SEASON_RESULTS + window.getActiveUpcoming.
  const allResults = window.getDerivedResults
    ? window.getDerivedResults().filter((r) => (r.competition || '').toLowerCase().includes('league'))
    : (window.SEASON_RESULTS || []).filter((r) => (r.competition || '').toLowerCase().includes('league'));
  const remaining = (window.getActiveUpcoming ? window.getActiveUpcoming() : (window.UPCOMING_FIXTURES || []))
    .filter((f) => (f.comp || '').toLowerCase().includes('league'))
    .length;

  // Calculate W/D/L + GF/GA + pts. Pending auto-promoted matches still count
  // as "played" but contribute 0-0 until data is entered.
  let played = 0, wins = 0, draws = 0, losses = 0, gf = 0, ga = 0, walkovers = 0;
  for (const r of allResults) {
    played++;
    if (r.kind === 'walkover') { wins++; walkovers++; continue; }
    const usHome = r.home.includes('Angels');
    const us = usHome ? r.hs : r.as;
    const them = usHome ? r.as : r.hs;
    gf += us || 0; ga += them || 0;
    if (r.kind === 'penalty' && r.pens) {
      const usP = usHome ? r.pens.hs : r.pens.as;
      const themP = usHome ? r.pens.as : r.pens.hs;
      if (usP > themP) wins++; else losses++;
    } else if (us > them) wins++;
    else if (us === them) draws++;
    else losses++;
  }
  const pts = wins * 3 + draws;
  const gd = gf - ga;
  const winPct = played > 0 ? Math.round((wins / played) * 100) : 0;
  const total = played + remaining;

  // Form ribbon — chronological W/D/L from the season (oldest left, newest right).
  const formSequence = [...allResults].reverse().map((r) => {
    if (r.kind === 'walkover') return 'W';
    const usHome = r.home.includes('Angels');
    const us = usHome ? r.hs : r.as;
    const them = usHome ? r.as : r.hs;
    if (r.kind === 'penalty' && r.pens) {
      const usP = usHome ? r.pens.hs : r.pens.as;
      const themP = usHome ? r.pens.as : r.pens.hs;
      return usP > themP ? 'W' : 'L';
    }
    return us > them ? 'W' : us === them ? 'D' : 'L';
  });

  // Most recent league results, latest first.
  const recentLeague = allResults.slice(0, 5);

  // Highest scoring win + biggest goals haul tile contexts
  const sortedByGoals = [...allResults]
    .filter((r) => r.kind === 'score')
    .map((r) => {
      const usHome = r.home.includes('Angels');
      return { r, scored: usHome ? r.hs : r.as };
    })
    .sort((a, b) => b.scored - a.scored)[0];

  const stats = [
    { v: played,                       l: 'PLAYED',          tooltip: `${played} of ${total} league fixtures` },
    { v: wins,                         l: 'WON',             accent: 'win',  tooltip: `${winPct}% win rate · ${walkovers ? walkovers + ' walkover' + (walkovers === 1 ? '' : 's') : 'all played'}` },
    { v: draws,                        l: 'DRAWN',           accent: 'draw', zeroIsGood: losses === 0 && draws === 0, tooltip: draws === 0 ? 'Unbeaten — never gave a point away' : null },
    { v: losses,                       l: 'LOST',            accent: 'loss', zeroIsGood: losses === 0, tooltip: losses === 0 ? 'Perfect record — never lost a league match' : null },
    { v: gf,                           l: 'GOALS FOR',       accent: 'win',  tooltip: sortedByGoals ? `Best: ${sortedByGoals.scored}-${sortedByGoals.r.home.includes('Angels') ? sortedByGoals.r.as : sortedByGoals.r.hs} vs ${(sortedByGoals.r.home.includes('Angels') ? sortedByGoals.r.away : sortedByGoals.r.home).replace(' FC', '')}` : null },
    { v: ga,                           l: 'GOALS AGAINST',   accent: 'loss' },
    { v: (gd >= 0 ? '+' : '') + gd,    l: 'GOAL DIFFERENCE', accent: 'volt' },
    { v: winPct + '%',                 l: 'WIN RATE',        accent: 'volt' },
  ];

  // 26/27 starts mid-September — use the 13th as a rolling marker.
  const { days: daysToKickoff, target: kickoffDate } = useDaysUntil('2026-09-13');
  const kickoffStr = kickoffDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <React.Fragment>
      <section className="champ-hero">
        <div className="champ-hero__rays" aria-hidden="true" />
        <div className="container champ-hero__inner">
          <div className="champ-hero__copy">
            <span className="t-eyebrow champ-hero__eyebrow">25 / 26 SEASON · LEAGUE TEN</span>
            <h1 className="champ-hero__title">
              <span>CHAMPIONS</span>
              <em>{losses === 0 ? 'UNBEATEN' : `${wins} FROM ${played}`}</em>
            </h1>
            <p className="champ-hero__sub">
              {played} of {total} games played and the title is already ours, clinched on 26 April with a 10–1 win over Sporting Club Catania.
            </p>
          </div>
          <div className="champ-hero__badge">
            <img src="assets/badge/sue-angels-badge-cutout.png" alt="" />
          </div>
        </div>
      </section>

      {/* THE NUMBERS — perfect season with animated tiles + form ribbon */}
      <section className="section section--compact">
        <div className="container">
          <header className="section__head section__head--compact">
            <div>
              <div className="t-eyebrow" style={{ color: 'var(--volt)' }}>THE NUMBERS</div>
              <h2 className="t-h2">{losses === 0 ? 'A PERFECT SEASON' : 'TITLE-WINNING NUMBERS'}</h2>
            </div>
          </header>
          <div className="champ-stats">
            {stats.map((s, i) => (
              <ChampStatTile key={s.l} s={s} isHero={s.l === 'WIN RATE'} />
            ))}
          </div>
        </div>
      </section>

      {/* RECENT LEAGUE RESULTS — interactive rows */}
      <section className="section section--compact section--alt">
        <div className="container">
          <header className="section__head section__head--compact">
            <div>
              <div className="t-eyebrow" style={{ color: 'var(--volt)' }}>RECENT LEAGUE RESULTS</div>
              <h2 className="t-h2">HOW IT'S GOING</h2>
            </div>
            <a href="schedule.html?tab=results" className="section__more">All results <span aria-hidden="true">→</span></a>
          </header>
          <div className="champ-recent">
            {recentLeague.length === 0 ? (
              <p style={{ color: 'var(--fg-3)' }}>No league results recorded yet.</p>
            ) : recentLeague.map((r, i) => {
              const usHome = r.home.includes('Angels');
              const us = usHome ? r.hs : r.as;
              const them = usHome ? r.as : r.hs;
              const won = r.kind === 'walkover' ? true : us > them;
              const drew = us === them && r.kind !== 'walkover';
              const res = won ? 'W' : drew ? 'D' : 'L';
              const margin = r.kind === 'walkover' ? null : Math.abs(us - them);
              return (
                <a
                  key={r.id}
                  href="schedule.html?tab=results"
                  className={`champ-recent__row champ-recent__row--${res.toLowerCase()}`}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <span className={`chip chip--${res === 'W' ? 'win' : res === 'D' ? 'draw' : 'loss'}`}>{res}</span>
                  <span className="champ-recent__date">{r.date}</span>
                  <span className="champ-recent__match">
                    <span className="champ-recent__side">
                      <TeamBadge team={r.home} size={22} />
                      <span className={usHome ? 'champ-recent__us' : ''}>{r.home.replace(' FC', '')}</span>
                    </span>
                    <span className="champ-recent__score">
                      {r.kind === 'walkover'
                        ? <span className="champ-recent__wo">{r.wo}</span>
                        : <React.Fragment>
                            <span className={usHome && won ? 'is-volt' : ''}>{r.hs}</span>
                            <span className="champ-recent__dash">–</span>
                            <span className={!usHome && won ? 'is-volt' : ''}>{r.as}</span>
                          </React.Fragment>}
                    </span>
                    <span className="champ-recent__side">
                      <TeamBadge team={r.away} size={22} />
                      <span className={!usHome ? 'champ-recent__us' : ''}>{r.away.replace(' FC', '')}</span>
                    </span>
                  </span>
                  {margin != null && (
                    <span className="champ-recent__margin">+{margin}</span>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* UP NEXT — 26/27 countdown, dynamic mini cards */}
      <section className="section section--compact champ-next-section">
        <div className="container">
          <header className="section__head section__head--compact">
            <div>
              <div className="t-eyebrow" style={{ color: 'var(--volt)' }}>UP NEXT</div>
              <h2 className="t-h2">26 / 27 BEGINS IN SEPTEMBER</h2>
            </div>
          </header>
{/* sized smaller via CSS below */}

          <div className="champ-next">
            {/* Kickoff date — TBC until the 26/27 schedule confirms */}
            <div className="champ-next__count">
              <span className="champ-next__count-eye">SEASON KICKOFF</span>
              <span className="champ-next__count-n champ-next__count-n--tbc">TBC</span>
              <span className="champ-next__count-l">DATE TO BE CONFIRMED</span>
              <span className="champ-next__count-date">26 / 27 SCHEDULE PENDING — SUMMER DATES TO FOLLOW</span>
            </div>

            {/* Mini status cards */}
            <div className="champ-next__cards">
              <div className="champ-next__card">
                <span className="champ-next__card-eye">TRIALS</span>
                <strong>OPEN</strong>
                <span className="champ-next__card-sub">Summer dates being confirmed</span>
              </div>
              <div className="champ-next__card">
                <span className="champ-next__card-eye">DIVISION</span>
                <strong>TBC</strong>
                <span className="champ-next__card-sub">Promoted up from League Ten</span>
              </div>
              <div className="champ-next__card">
                <span className="champ-next__card-eye">STANDARD</span>
                <strong>SAME</strong>
                <span className="champ-next__card-sub">Champions, defending the standard.</span>
              </div>
            </div>

            <div className="champ-next__cta">
              <a href="join.html" className="btn btn--volt">Trial for 26/27 →</a>
              <a href="sponsors.html" className="btn btn--ghost">Sponsor the project</a>
            </div>
          </div>
        </div>
      </section>
    </React.Fragment>
  );
}

window.ChampionsPage = ChampionsPage;
