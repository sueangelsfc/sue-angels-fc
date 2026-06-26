// ContactRedesign.jsx, routed contact, v2 design.
const { Reveal, RDArrow, RDPage, RDPageHero } = window;

function ContactV2() {
  const [route, setRoute] = React.useState('general');
  const routes = [
    { k: 'general', l: 'General', sub: 'Questions, hellos, anything else' },
    { k: 'sponsor', l: 'Sponsor enquiry', sub: 'Brand partnerships & backing the club' },
    { k: 'trial', l: 'Player trial', sub: 'You want a shot, tell us about you' },
    { k: 'media', l: 'Media volunteer', sub: 'Photo, video, design, editorial, social' },
  ];
  const active = routes.find((r) => r.k === route);
  const titleFor = {
    sponsor: 'Back the project.', trial: 'Show us what you bring.',
    media: 'Build the brand.', general: 'Tell us what you need.',
  };
  return (
    <RDPage>
      <main>
        <RDPageHero eyebrow="Get in touch" title={<>Con<em>tact</em></>} sub="Four ways to reach us. Pick one." />
        <Reveal as="section" className="rd-section rd-section--tight">
          <div className="rd-container">
            <div className="rd-split">
              <div>
                <div className="rd-routes">
                  {routes.map((r) => (
                    <button key={r.k} className={`rd-route ${route === r.k ? 'is-active' : ''}`} onClick={() => setRoute(r.k)}>
                      <b>{r.l}</b><span>{r.sub}</span>
                    </button>
                  ))}
                </div>
                <div className="rd-direct">
                  <p className="rd-eyebrow rd-eyebrow--plain" style={{ color: 'var(--fg-3)' }}>Direct line</p>
                  <a href="mailto:suesangelsfc@gmail.com">suesangelsfc@gmail.com</a>
                  <a href="https://instagram.com/suesangelsfc" target="_blank" rel="noopener">@suesangelsfc · Instagram</a>
                  <a href="https://tiktok.com/@suesangelsfc" target="_blank" rel="noopener">@suesangelsfc · TikTok</a>
                </div>
              </div>

              <form className="rd-card rd-form" onSubmit={(e) => { e.preventDefault(); alert('Thanks, your enquiry has been noted. We\u2019ll reply within 48 hours.'); }}>
                <div>
                  <p className="rd-eyebrow">{active.l} enquiry</p>
                  <h2 className="rd-h3" style={{ marginTop: 10 }}>{titleFor[route]}</h2>
                </div>
                <div className="rd-form__row">
                  <label className="rd-field"><span>Name</span><input required placeholder="Your full name" /></label>
                  <label className="rd-field"><span>Email</span><input type="email" required placeholder="you@email.com" /></label>
                </div>
                <div className="rd-form__row">
                  <label className="rd-field">
                    <span>{route === 'sponsor' ? 'Company' : route === 'media' ? 'Discipline' : route === 'trial' ? 'Position' : 'Subject'}</span>
                    <input placeholder={route === 'sponsor' ? 'Your business' : route === 'trial' ? 'e.g. Striker' : route === 'media' ? 'e.g. Videography' : 'What is this about'} />
                  </label>
                  <label className="rd-field"><span>Phone</span><input type="tel" placeholder="Optional" /></label>
                </div>
                <label className="rd-field"><span>Message</span><textarea rows="5" required placeholder="Tell us everything we need to know"></textarea></label>
                <div className="rd-form__actions">
                  <span className="rd-form__note">We&rsquo;ll come back to you within 48 hours. We never share your details.</span>
                  <button type="submit" className="rd-btn rd-btn--volt">Submit enquiry <RDArrow /></button>
                </div>
              </form>
            </div>
          </div>
        </Reveal>
      </main>
    </RDPage>
  );
}

ReactDOM.createRoot(document.getElementById('rd-root')).render(<ContactV2 />);
