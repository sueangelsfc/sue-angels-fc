// Contact.jsx, routed contact with multi-form
function Contact() {
  const [route, setRoute] = React.useState('general');
  const routes = [
    { k: 'general',  l: 'General',           sub: 'Anything else, questions, hello, general' },
    { k: 'sponsor',  l: 'Sponsor enquiry',   sub: 'Backing the club, brand partnerships' },
    { k: 'trial',    l: 'Player trial',      sub: 'You want a shot. Submit your tape.' },
    { k: 'media',    l: 'Media volunteer',   sub: 'Photo, video, design, editorial, social' },
  ];
  const active = routes.find((r) => r.k === route);
  return (
    <React.Fragment>
      <PageHero
        eyebrow="GET IN TOUCH"
        title={<>CON<em>TACT</em></>}
        sub="Pick a route. We watch every enquiry that lands."
      />

      <section className="section" style={{ paddingTop: 'var(--sp-5)' }}>
        <div className="container">
          <div className="contact-grid">
            <aside className="contact-routes">
              {routes.map((r) => (
                <button key={r.k} className={`contact-route ${route === r.k ? 'is-active' : ''}`} onClick={() => setRoute(r.k)}>
                  <span className="contact-route__l">{r.l}</span>
                  <span className="contact-route__s">{r.sub}</span>
                  <span className="contact-route__arrow" aria-hidden="true">→</span>
                </button>
              ))}
              <div className="contact-direct">
                <div className="t-eyebrow">DIRECT</div>
                <a href="mailto:hello@suesangelsfc.com">hello@suesangelsfc.com</a>
                <a href="#">@suesangelsfc · IG</a>
                <a href="#">@suesangelsfc · TikTok</a>
              </div>
            </aside>

            <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
              <div className="t-eyebrow">{active.l.toUpperCase()} ENQUIRY</div>
              <h3 className="contact-form__title">{
                route === 'sponsor' ? 'BACK THE PROJECT.' :
                route === 'trial'   ? 'WATCH EVERY TAPE.' :
                route === 'media'   ? 'BUILD THE BRAND.' :
                'TELL US WHAT YOU NEED.'
              }</h3>
              <div className="contact-form__row">
                <label>Name<input placeholder="Your full name" /></label>
                <label>Email<input type="email" placeholder="you@email.com" /></label>
              </div>
              <div className="contact-form__row">
                <label>{route === 'sponsor' ? 'Company' : route === 'media' ? 'Discipline' : route === 'trial' ? 'Position' : 'Subject'}
                  <input placeholder={
                    route === 'sponsor' ? 'Your business' :
                    route === 'trial'   ? 'e.g. Striker' :
                    route === 'media'   ? 'e.g. Videography' : 'What is this about'
                  } />
                </label>
                <label>Phone<input type="tel" placeholder="Optional" /></label>
              </div>
              <label>Message<textarea rows="5" placeholder="Tell us everything we need to know"></textarea></label>
              <div className="contact-form__actions">
                <span className="t-meta" style={{ color: 'var(--fg-3)' }}>We'll come back to you within 48 hours.</span>
                <button type="submit" className="btn btn--volt">Submit enquiry →</button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </React.Fragment>
  );
}

window.Contact = Contact;
