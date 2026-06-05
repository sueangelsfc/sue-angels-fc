// Fixtures.jsx — upcoming matches row. Sourced from window.UPCOMING_FIXTURES.
function FixtureCard({ fx }) {
  const matchData = window.loadMatchEntry ? window.loadMatchEntry(fx.id) : null;
  return (
    <article className="fixture-card">
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
          <span>{fx.comp}</span>
          <span className="fixture-card__sep">·</span>
          <span className={fx.loc === 'Home' ? 'fixture-card__home' : 'fixture-card__away'}>{fx.loc}</span>
        </div>
      </div>
      <div className="fixture-card__kick">
        <div className="fixture-card__time">{(matchData && matchData.kick) || fx.kick}</div>
        <div className="fixture-card__ven">{(matchData && matchData.venue) || fx.ven}</div>
      </div>
    </article>
  );
}

function FixturePlaceholder({ label }) {
  return (
    <article className="fixture-card fixture-card--placeholder">
      <div className="fixture-card__rail" style={{ opacity: 0.25 }} />
      <div className="fixture-card__date">
        <div className="fixture-card__day" style={{ color: 'var(--fg-4)' }}>—</div>
        <div className="fixture-card__mon">{label}</div>
      </div>
      <div className="fixture-card__teams">
        <div className="fixture-card__name" style={{ color: 'var(--fg-3)' }}>FIXTURE TBC</div>
        <div className="fixture-card__meta" style={{ marginTop: 6 }}>
          <span>LEAGUE TEN · 26/27 SEASON</span>
        </div>
      </div>
      <div className="fixture-card__kick">
        <div className="fixture-card__time" style={{ color: 'var(--fg-3)', fontSize: 22 }}>TBC</div>
        <div className="fixture-card__ven">VENUE TBC</div>
      </div>
    </article>
  );
}

function Fixtures() {
  const UPCOMING = window.getActiveUpcoming ? window.getActiveUpcoming() : (window.UPCOMING_FIXTURES || []);
  return (
    <section id="fixtures" className="section section--compact">
      <div className="container">
        <header className="section__head section__head--compact">
          <div>
            <div className="t-eyebrow">UPCOMING</div>
            <h2 className="t-h2">FIXTURES</h2>
          </div>
          <a href="schedule.html?tab=upcoming" className="section__more">All fixtures <span aria-hidden="true">→</span></a>
        </header>
        <div className="fixture-grid">
          {UPCOMING.length === 0 ? (
            <React.Fragment>
              <FixturePlaceholder label="MATCH 01" />
              <FixturePlaceholder label="MATCH 02" />
              <FixturePlaceholder label="MATCH 03" />
            </React.Fragment>
          ) : (
            <React.Fragment>
              {UPCOMING.map((fx, i) => <FixtureCard key={i} fx={fx} />)}
              {UPCOMING.length < 3 ? <FixturePlaceholder label="26/27 TBA" /> : null}
            </React.Fragment>
          )}
        </div>
      </div>
    </section>
  );
}

window.Fixtures = Fixtures;

