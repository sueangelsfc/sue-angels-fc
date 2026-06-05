// Results.jsx — recent results carousel (homepage).
// Reads MOTM + scorers from coach-entered MatchEntry data when present.

function formatScorerLine(data) {
  const goals = (data && data.goals) || (data && data.scorers) || [];
  if (!goals.length) return 'Scorers TBC';
  return goals.map((s) => {
    const p = (window.SQUAD || []).find((x) => x.num === s.num);
    if (!p) return null;
    return `${p.last}${s.minute ? ' ' + s.minute + '’' : ''}`;
  }).filter(Boolean).join(' · ') || 'Scorers TBC';
}
function motmName(data) {
  if (!data || !data.motm) return 'TBC';
  const p = (window.SQUAD || []).find((x) => x.num === data.motm);
  return p ? `${p.first[0]}. ${p.last}` : 'TBC';
}

function ResultCard({ r }) {
  const usHome = r.home.includes('Angels');
  const isWalkover = r.kind === 'walkover';
  const us  = usHome ? r.hs : r.as;
  const them = usHome ? r.as : r.hs;
  let res;
  if (isWalkover) res = 'W';
  else if (r.kind === 'penalty' && r.pens) {
    const usP = usHome ? r.pens.hs : r.pens.as;
    const themP = usHome ? r.pens.as : r.pens.hs;
    res = usP > themP ? 'W' : 'L';
  } else res = us > them ? 'W' : us === them ? 'D' : 'L';
  const won = res === 'W';
  const compShort = (r.competition || 'League Ten') + ' · ' + (usHome ? 'Home' : 'Away');
  const matchData = window.loadMatchEntry ? window.loadMatchEntry(r.id) : null;

  return (
    <article className={`result-card result-card--${res === 'W' ? 'win' : res === 'D' ? 'draw' : 'loss'}`}>
      <header className="result-card__head">
        <span className={`chip chip--${res === 'W' ? 'win' : res === 'D' ? 'draw' : 'loss'}`}>{res}</span>
        <span className="t-meta">{r.date}</span>
        <span className="t-meta" style={{ marginLeft: 'auto' }}>{compShort}</span>
      </header>

      <div className="result-card__score">
        <div className="result-card__side">
          <TeamBadge team={r.home} /><div className="result-card__name">{r.home}</div>
        </div>
        <div className="result-card__nums">
          {isWalkover ? (
            <span className="is-volt" style={{ fontSize: 28 }}>{r.wo}</span>
          ) : (
            <React.Fragment>
              <span className={usHome && won ? 'is-volt' : ''}>{r.hs}</span>
              <span className="result-card__dash">–</span>
              <span className={!usHome && won ? 'is-volt' : ''}>{r.as}</span>
            </React.Fragment>
          )}
        </div>
        <div className="result-card__side result-card__side--right">
          <TeamBadge team={r.away} /><div className="result-card__name">{r.away}</div>
        </div>
      </div>

      <footer className="result-card__foot">
        <div>
          <span className="t-eyebrow" style={{ color: 'var(--fg-3)' }}>SCORERS</span>
          <div className="result-card__scorers">{formatScorerLine(matchData)}</div>
        </div>
        <div className="result-card__motm">
          <span className="t-eyebrow" style={{ color: 'var(--volt)' }}>MOTM</span>
          <div className="t-body" style={{ color: 'var(--fg-1)', fontWeight: 700 }}>{motmName(matchData)}</div>
        </div>
      </footer>
    </article>
  );
}

function Results() {
  const all = window.getDerivedResults ? window.getDerivedResults() : (window.SEASON_RESULTS || []);
  const scrollerRef = React.useRef(null);
  const [scrollState, setScrollState] = React.useState({ atStart: true, atEnd: false });

  const updateState = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setScrollState({
      atStart: el.scrollLeft <= 4,
      atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  };
  const scrollBy = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = el.clientWidth * 0.85 * (dir === 'next' ? 1 : -1);
    el.scrollBy({ left: step, behavior: 'smooth' });
  };
  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateState();
    el.addEventListener('scroll', updateState, { passive: true });
    window.addEventListener('resize', updateState);
    return () => {
      el.removeEventListener('scroll', updateState);
      window.removeEventListener('resize', updateState);
    };
  }, []);

  return (
    <section id="results" className="section section--alt section--compact">
      <div className="container">
        <header className="section__head section__head--compact">
          <div>
            <div className="t-eyebrow">RECENT</div>
            <h2 className="t-h2">RESULTS</h2>
          </div>
          <div className="result-carousel__nav">
            <button className="result-carousel__btn" aria-label="Previous" onClick={() => scrollBy('prev')} disabled={scrollState.atStart}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m11 19-7-7 7-7"/></svg>
            </button>
            <button className="result-carousel__btn" aria-label="Next" onClick={() => scrollBy('next')} disabled={scrollState.atEnd}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m13 5 7 7-7 7"/></svg>
            </button>
            <a href="schedule.html?tab=results" className="section__more" style={{ marginLeft: 8 }}>All results <span aria-hidden="true">→</span></a>
          </div>
        </header>
        <div className="result-carousel" ref={scrollerRef}>
          {all.map((r) => <ResultCard key={r.id} r={r} />)}
        </div>
      </div>
    </section>
  );
}

window.Results = Results;
