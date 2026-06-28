// Squad.jsx, homepage first-team strip with position filter + interactive cards.
function PlayerCard({ p, onOpen }) {
  const blanket = window.blanketRole(p);
  const isGK = blanket === 'Goalkeeper';
  const primary = isGK
    ? { v: p.cleanSheets || 0, l: (p.cleanSheets || 0) === 1 ? 'Clean Sheet' : 'Clean Sheets' }
    : p.goals > 0   ? { v: p.goals, l: 'Goals' }
    : p.assists > 0 ? { v: p.assists, l: 'Assists' }
    : { v: p.apps || 0, l: 'Apps' };
  const photo = window.usePlayerPhoto ? window.usePlayerPhoto(p.num) : null;
  const role = blanket.toUpperCase();
  // Position-coded accent class for the card stripe.
  const accent = isGK ? 'gk' : role === 'DEFENDER' ? 'def' : role === 'MIDFIELDER' ? 'mid' : role === 'ATTACKER' ? 'att' : 'sq';
  // Secondary stats revealed on hover.
  const secondary = isGK
    ? [
        { v: p.gkApps || 0, l: 'GK Apps' },
        { v: p.goalsConceded || 0, l: 'Conceded' },
        { v: p.penaltiesSaved || 0, l: 'Pens Saved' },
      ]
    : [
        { v: p.apps || 0, l: 'Apps' },
        { v: p.goals || 0, l: 'Goals' },
        { v: p.assists || 0, l: 'Assists' },
      ];
  return (
    <button type="button" className={`player-card is-live is-compact player-card--btn player-card--${accent}`} onClick={() => onOpen(p.num)}>
      <div className="player-card__rail" aria-hidden="true" />
      <div className="player-card__photo">
        <img src={photo || 'assets/players/avatar.svg'} alt="" />
        {(p.captained > 0 || p.motm > 0) && (
          <div className="player-card__badges">
            {p.captained > 0 && <span className="player-card__pill player-card__pill--c" title={`Captain × ${p.captained}`}>C</span>}
            {p.motm > 0     && <span className="player-card__pill player-card__pill--m" title={`MOTM × ${p.motm}`}>★</span>}
          </div>
        )}
      </div>
      <div className="player-card__info">
        <div className="player-card__name">{p.first} {p.last}</div>
        <div className="player-card__role">{role}</div>
        <div className="player-card__stat">
          <span className="player-card__stat-v">{primary.v || 0}</span>
          <span className="player-card__stat-l">{primary.l}</span>
        </div>
        <div className="player-card__hover-stats" aria-hidden="true">
          {secondary.map((s) => (
            <div key={s.l}>
              <span>{s.v}</span>
              <label>{s.l}</label>
            </div>
          ))}
        </div>
      </div>
    </button>
  );
}

function Squad() {
  const [openPlayer, setOpenPlayer] = React.useState(null);
  const [filter, setFilter] = React.useState('all');
  const [page, setPage] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const VISIBLE = 4;

  const full = window.derivedSquad();
  // Sort: GK by clean sheets, others by goals+assists.
  const sorted = [...full].sort((a, b) => {
    const aGK = window.blanketRole(a) === 'Goalkeeper';
    const bGK = window.blanketRole(b) === 'Goalkeeper';
    const aImpact = aGK ? (a.cleanSheets || 0) * 3 : (a.goals + a.assists) * 2;
    const bImpact = bGK ? (b.cleanSheets || 0) * 3 : (b.goals + b.assists) * 2;
    return (bImpact - aImpact) || (b.apps - a.apps);
  });
  const byPos = (p, key) => {
    const r = window.blanketRole(p);
    return key === 'all' ? true
         : key === 'gk'  ? r === 'Goalkeeper'
         : key === 'def' ? r === 'Defender'
         : key === 'mid' ? r === 'Midfielder'
         : key === 'att' ? r === 'Attacker'
         : true;
  };
  const cards = sorted.filter((p) => byPos(p, filter));
  const maxPage = Math.max(0, cards.length - VISIBLE);
  const canRoll = cards.length > VISIBLE;

  // Reset page when filter changes
  React.useEffect(() => { setPage(0); }, [filter]);

  // Auto-advance every 4.5s, pause on hover. Wraps back to 0 at end.
  React.useEffect(() => {
    if (!canRoll || paused) return;
    const t = setInterval(() => {
      setPage((p) => (p >= maxPage ? 0 : p + 1));
    }, 4500);
    return () => clearInterval(t);
  }, [canRoll, paused, maxPage]);

  const counts = {
    all: full.length,
    gk:  full.filter((p) => window.blanketRole(p) === 'Goalkeeper').length,
    def: full.filter((p) => window.blanketRole(p) === 'Defender').length,
    mid: full.filter((p) => window.blanketRole(p) === 'Midfielder').length,
    att: full.filter((p) => window.blanketRole(p) === 'Attacker').length,
  };
  const chips = [
    { id: 'all', l: 'ALL' },
    { id: 'gk',  l: 'GK' },
    { id: 'def', l: 'DEF' },
    { id: 'mid', l: 'MID' },
    { id: 'att', l: 'ATT' },
  ];

  return (
    <section id="teams" className="section section--compact sq-section">
      <div className="container">
        <header className="section__head section__head--compact">
          <div>
            <div className="t-eyebrow" style={{ color: 'var(--volt)' }}>FIRST TEAM</div>
            <h2 className="t-h2">THE SQUAD</h2>
          </div>
          <a href="teams.html" className="section__more">Full squad <span aria-hidden="true">→</span></a>
        </header>

        <div className="sq-chips">
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`sq-chip ${filter === c.id ? 'sq-chip--on' : ''}`}
              onClick={() => setFilter(c.id)}
              disabled={counts[c.id] === 0}
            >
              <span className="sq-chip__lbl">{c.l}</span>
              <span className="sq-chip__count">{counts[c.id]}</span>
            </button>
          ))}
        </div>

        <div
          className="sq-roller"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {canRoll && (
            <button
              type="button"
              className="sq-roller__nav sq-roller__nav--prev"
              onClick={() => setPage((p) => (p <= 0 ? maxPage : p - 1))}
              aria-label="Previous players"
            >‹</button>
          )}
          <div className="sq-roller__viewport">
            <div
              className="sq-roller__track"
              style={{ transform: `translateX(${-page * (100 / VISIBLE)}%)` }}
            >
              {cards.map((p) => (
                <div key={p.num} className="sq-roller__cell">
                  <PlayerCard p={p} onOpen={setOpenPlayer} />
                </div>
              ))}
            </div>
          </div>
          {canRoll && (
            <button
              type="button"
              className="sq-roller__nav sq-roller__nav--next"
              onClick={() => setPage((p) => (p >= maxPage ? 0 : p + 1))}
              aria-label="Next players"
            >›</button>
          )}
          {canRoll && (
            <div className="sq-roller__dots">
              {Array.from({ length: maxPage + 1 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`sq-roller__dot ${i === page ? 'is-on' : ''}`}
                  onClick={() => setPage(i)}
                  aria-label={`Page ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {openPlayer && <PlayerProfile playerNum={openPlayer} onClose={() => setOpenPlayer(null)} />}
      </div>
    </section>
  );
}

window.Squad = Squad;
