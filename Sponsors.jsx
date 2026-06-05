// Sponsors.jsx — home-page main sponsors module. Redesigned as a magazine block
// with logo plate + role tag + partner-since line. Click-through to the full page.
function Sponsors() {
  const items = [
    { logo: 'assets/sponsors/sporting-solutions.png',  n: 'Sporting Solutions Ltd', role: 'MAIN KIT SPONSOR',                 since: 'Aug 2025', sub: 'On the front of the matchday shirt every weekend.' },
    { logo: 'assets/sponsors/hodgson-roofing.png',     n: 'Hodgson Roofing',        role: 'WARM-UP & TRAINING TOP SPONSOR',   since: 'Feb 2026', sub: 'The brand the squad wears every pre-match.' },
  ];
  return (
    <section id="sponsors" className="section section--compact sp-home">
      <div className="container">
        <header className="section__head section__head--compact">
          <div>
            <div className="t-eyebrow" style={{ color: 'var(--volt)' }}>PROUDLY BACKED BY</div>
            <h2 className="t-h2">MAIN SPONSORS</h2>
          </div>
          <a href="sponsors.html" className="btn btn--volt btn--sm">Back the project →</a>
        </header>
        <div className="sp-home__grid">
          {items.map((s) => (
            <a key={s.n} href="sponsors.html" className="sp-home__card">
              <div className="sp-home__rail" aria-hidden="true" />
              <div className="sp-home__logo-plate">
                <img src={s.logo} alt={s.n} />
              </div>
              <div className="sp-home__meta">
                <span className="sp-home__role">{s.role}</span>
                <h3 className="sp-home__name">{s.n}</h3>
                <p className="sp-home__sub">{s.sub}</p>
                <span className="sp-home__since">PARTNER SINCE {s.since.toUpperCase()}</span>
              </div>
              <span className="sp-home__arrow" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M5 12h14"/><path d="m13 5 7 7-7 7"/></svg>
              </span>
            </a>
          ))}
        </div>
        <div className="sp-home__cta">
          <span>YOUR BRAND HERE FOR 26/27 &mdash; ENQUIRIES OPEN.</span>
          <a href="contact.html" className="btn btn--ghost btn--sm">Become a partner →</a>
        </div>
      </div>
    </section>
  );
}

window.Sponsors = Sponsors;
