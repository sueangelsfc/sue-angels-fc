// PreseasonHub.jsx — 26/27 preseason landing block for the homepage.
// Renders only when getSeasonState() returns 'between' or 'next'.
function PreseasonHub() {
  if (!window.getSeasonState) return null;
  const state = window.getSeasonState();
  if (state.phase === 'active') return null;
  const days = window.daysUntilNextSeason ? window.daysUntilNextSeason() : 0;

  const blocks = [
    { eyebrow: 'PLAYER TRIALS',  title: 'TRIAL FOR THE 26/27 SQUAD', sub: 'Submit your application. We watch every tape.', href: 'join.html', tone: 'volt' },
    { eyebrow: 'PRESEASON',      title: 'SUMMER TRAINING + FRIENDLIES', sub: 'Schedule confirmed July. Sign up for updates.', href: 'fixtures.html', tone: 'ghost' },
    { eyebrow: 'SPONSORSHIP',    title: 'PARTNER WITH THE CHAMPIONS', sub: 'Promoted from League Ten. New tier of exposure.', href: 'sponsors.html', tone: 'ghost' },
    { eyebrow: 'MEDIA TEAM',     title: 'BUILD THE BRAND', sub: 'Photo, video, design, editorial. Apply now.', href: 'join.html', tone: 'ghost' },
  ];
  return (
    <section className="section section--compact preseason">
      <div className="container">
        <header className="section__head section__head--compact">
          <div>
            <div className="t-eyebrow" style={{ color: 'var(--volt)' }}>26 / 27 SEASON · PRESEASON</div>
            <h2 className="t-h2">{days > 0 ? `${days} DAYS TO KICK-OFF` : 'NEW CAMPAIGN BEGINS'}</h2>
          </div>
          <a href="champions.html" className="section__more">Last season's story <span aria-hidden="true">→</span></a>
        </header>
        <div className="preseason__grid">
          {blocks.map((b) => (
            <a key={b.title} href={b.href} className={`preseason__card preseason__card--${b.tone}`}>
              <div>
                <span className="t-eyebrow" style={{ color: b.tone === 'volt' ? 'var(--navy)' : 'var(--volt)' }}>{b.eyebrow}</span>
                <h3 className="preseason__title">{b.title}</h3>
                <p className="preseason__sub">{b.sub}</p>
              </div>
              <span className="preseason__arrow" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M5 12h14"/><path d="m13 5 7 7-7 7"/></svg>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// Story — founding-story module for the homepage. Replaces the old kit reveal.
function KitReveal() {
  return (
    <section className="section section--compact kit-reveal">
      <div className="container kit-reveal__grid">
        <div className="kit-reveal__media">
          <div className="kit-reveal__photo" aria-hidden="true">
            <img src="assets/badge/sue-angels-badge-cutout.png" alt="" />
            <span className="kit-reveal__chip">SUE&rsquo;S ANGELS FC</span>
          </div>
        </div>
        <div className="kit-reveal__copy">
          <span className="t-eyebrow" style={{ color: 'var(--volt)' }}>OUR STORY</span>
          <h2 className="kit-reveal__title">BUILT IN<br/><em>HER NAME.</em></h2>
          <p>
            Founded by Stephen Epathite in memory of Susan Anne Martin &mdash; lost to sepsis in 2020.{' '}
            <a href="about.html" className="kit-reveal__readmore">Read more →</a>
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href="about.html" className="btn btn--volt">Read our story</a>
            <a href="join.html" className="btn btn--ghost">Get involved</a>
          </div>
        </div>
      </div>
    </section>
  );
}

window.PreseasonHub = PreseasonHub;
window.KitReveal = KitReveal;
