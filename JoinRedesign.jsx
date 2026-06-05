// JoinRedesign.jsx, trials / volunteer / media / sponsor sign-up + FAQ (v2).
const { Reveal, RDArrow, RDPage, RDPageHero } = window;

function JoinV2() {
  const routes = [
    { k: 'trial', l: 'Player trials', sub: 'Apply for a trial with the first team. Replies typically inside 48 hours.', cta: 'Apply for a trial' },
    { k: 'volunteer', l: 'Volunteer', sub: 'Matchday help, coaching support, logistics and more.', cta: 'Volunteer with us' },
    { k: 'media', l: 'Media team', sub: 'Photo, video, design, editorial and social. No experience needed, just an eye.', cta: 'Join the media team' },
    { k: 'sponsor', l: 'Sponsorship', sub: 'Back the project and put your brand on the badge for 26/27.', cta: 'Become a partner' },
  ];
  const [route, setRoute] = React.useState('trial');
  const active = routes.find((r) => r.k === route);
  const faqs = [
    { q: 'When are trials held?', a: 'Summer dates for 26/27 are being confirmed. Register your interest and we\u2019ll be in touch with times and venue.' },
    { q: 'Do I need experience for the media team?', a: 'No. If you can shoot on a phone, edit, design or write, there\u2019s a role for you. We\u2019ll help you grow.' },
    { q: 'What do volunteers get?', a: 'A proper football family, matchday access, and a genuine role in a club going places.' },
    { q: 'How do sponsorships work?', a: 'No fixed tiers, we tailor a package to your business. Kit, signage, content and community activations.' },
  ];
  const [open, setOpen] = React.useState(0);
  return (
    <RDPage>
      <main>
        <RDPageHero eyebrow="Get involved" title={<>Join the <em>club</em>.</>} sub="Trials, volunteering, media, sponsorship. Pick a route." />

        <Reveal as="section" className="rd-section rd-section--tight">
          <div className="rd-container">
            <div className="rd-tabs" style={{ marginBottom: 28 }}>
              {routes.map((r) => <button key={r.k} className={`rd-tab ${route === r.k ? 'is-active' : ''}`} onClick={() => setRoute(r.k)}>{r.l}</button>)}
            </div>
            <div className="rd-split">
              <div className="rd-card">
                <p className="rd-eyebrow">{active.l}</p>
                <h2 className="rd-h3" style={{ marginTop: 12, marginBottom: 12 }}>{active.cta}</h2>
                <p style={{ color: 'var(--fg-3)', font: '400 14px/1.6 var(--font-sans)' }}>{active.sub}</p>
                <div style={{ marginTop: 20, display: 'grid', gap: 10 }}>
                  <span className="rd-chip"><span className="rd-chip__dot" />London · Sunday League</span>
                  <span className="rd-chip"><span className="rd-chip__dot" />Reply within 48 hours</span>
                </div>
              </div>
              <form className="rd-card rd-form" onSubmit={(e) => { e.preventDefault(); alert('Thanks, we\u2019ve got your details and will reply within 48 hours.'); }}>
                <div className="rd-form__row">
                  <label className="rd-field"><span>Name</span><input required placeholder="Your full name" /></label>
                  <label className="rd-field"><span>Email</span><input type="email" required placeholder="you@email.com" /></label>
                </div>
                <div className="rd-form__row">
                  <label className="rd-field"><span>Phone</span><input type="tel" placeholder="Optional" /></label>
                  <label className="rd-field">
                    <span>{route === 'trial' ? 'Position' : route === 'media' ? 'Discipline' : route === 'sponsor' ? 'Company' : 'Skills'}</span>
                    <input placeholder={route === 'trial' ? 'e.g. Striker' : route === 'media' ? 'e.g. Videography' : route === 'sponsor' ? 'Your business' : 'How you can help'} />
                  </label>
                </div>
                <label className="rd-field"><span>About you</span><textarea rows="5" required placeholder="Tell us about yourself"></textarea></label>
                <div className="rd-form__actions">
                  <span className="rd-form__note">We never share your details. Read our privacy policy.</span>
                  <button type="submit" className="rd-btn rd-btn--volt">{active.cta} <RDArrow /></button>
                </div>
              </form>
            </div>
          </div>
        </Reveal>

        <Reveal as="section" className="rd-section rd-section--tight">
          <div className="rd-container">
            <div className="rd-section__head"><div><p className="rd-eyebrow">Good to know</p><h2 className="rd-h2">FAQ</h2></div></div>
            <div className="rd-faq">
              {faqs.map((f, i) => (
                <div className={`rd-faq__item ${open === i ? 'is-open' : ''}`} key={i}>
                  <button className="rd-faq__q" onClick={() => setOpen(open === i ? -1 : i)}>
                    <span>{f.q}</span><span className="rd-faq__icn" aria-hidden="true">{open === i ? '–' : '+'}</span>
                  </button>
                  {open === i ? <p className="rd-faq__a">{f.a}</p> : null}
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </main>
    </RDPage>
  );
}

ReactDOM.createRoot(document.getElementById('rd-root')).render(<JoinV2 />);
