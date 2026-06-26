// Join.jsx — application routes with real form fields per route.
function Join() {
  const [route, setRoute] = React.useState('trial');
  const [submitted, setSubmitted] = React.useState(false);
  const onSubmit = (e) => { e.preventDefault(); setSubmitted(true); setTimeout(() => setSubmitted(false), 4000); };

  const ROUTES = [
    { k: 'trial',     l: 'PLAYER TRIALS',   sub: 'Trial for the first team — we usually reply within 48 hours.' },
    { k: 'volunteer', l: 'VOLUNTEER',       sub: 'Matchday, coaching, ops, kit, transport.' },
    { k: 'media',     l: 'MEDIA TEAM',      sub: 'Photo, video, design, editorial, social.' },
    { k: 'sponsor',   l: 'SPONSOR / PARTNER', sub: 'Back the project for 26/27.' },
  ];

  const FIELDS = {
    trial: [
      { id: 'name', l: 'Full name', placeholder: 'Your full name', type: 'text', req: true },
      { id: 'email', l: 'Email', placeholder: 'you@email.com', type: 'email', req: true },
      { id: 'phone', l: 'Phone (optional)', placeholder: '07...', type: 'tel' },
      { id: 'dob', l: 'Date of birth', type: 'date', req: true },
      { id: 'position', l: 'Preferred position(s)', placeholder: 'e.g. CM / CDM', type: 'text', req: true },
      { id: 'level', l: 'Current level + club', placeholder: 'e.g. Sunday League · Hackney United', type: 'text' },
      { id: 'tape', l: 'Highlight tape / clips (link)', placeholder: 'YouTube, Veo, Hudl, Google Drive...', type: 'url' },
      { id: 'message', l: 'Anything else we should know', placeholder: 'Why you, and why now?', type: 'textarea' },
    ],
    volunteer: [
      { id: 'name', l: 'Full name', type: 'text', req: true },
      { id: 'email', l: 'Email', type: 'email', req: true },
      { id: 'phone', l: 'Phone', type: 'tel' },
      { id: 'role', l: 'What you’d like to help with', placeholder: 'e.g. Matchday ops, coaching, kit, transport', type: 'text', req: true },
      { id: 'availability', l: 'Availability', placeholder: 'e.g. Sundays + Wednesday evenings', type: 'text' },
      { id: 'message', l: 'Anything else', placeholder: 'Tell us about yourself', type: 'textarea' },
    ],
    media: [
      { id: 'name', l: 'Full name', type: 'text', req: true },
      { id: 'email', l: 'Email', type: 'email', req: true },
      { id: 'discipline', l: 'Your discipline', placeholder: 'Photo / video / design / editorial / social', type: 'text', req: true },
      { id: 'portfolio', l: 'Portfolio link', placeholder: 'Instagram, Behance, personal site', type: 'url' },
      { id: 'kit', l: 'Kit you bring (optional)', placeholder: 'e.g. Sony A7iv, DJI Mini 4 Pro', type: 'text' },
      { id: 'message', l: 'Tell us about a project you’re proud of', type: 'textarea' },
    ],
    sponsor: [
      { id: 'name', l: 'Your name', type: 'text', req: true },
      { id: 'email', l: 'Email', type: 'email', req: true },
      { id: 'company', l: 'Company name', type: 'text', req: true },
      { id: 'sector', l: 'Sector', placeholder: 'e.g. Construction, hospitality, tech...', type: 'text' },
      { id: 'budget', l: 'Indicative budget', placeholder: '£', type: 'text' },
      { id: 'message', l: 'What kind of partnership are you interested in?', type: 'textarea' },
    ],
  };

  const current = ROUTES.find((r) => r.k === route);
  const fields  = FIELDS[route];

  return (
    <React.Fragment>
      <PageHero
        eyebrow="JOIN THE PROJECT"
        title={<>JOIN <em>THE</em><br/>CLUB.</>}
        sub="Trials, volunteering, media or sponsorship. Pick your route and tell us about yourself."
      />

      <section className="section section--compact">
        <div className="container">
          <div className="join-v2">
            <aside className="join-v2__routes">
              <div className="t-eyebrow" style={{ color: 'var(--fg-3)', marginBottom: 12 }}>I WANT TO</div>
              {ROUTES.map((r) => (
                <button key={r.k}
                        className={`join-v2__route ${route === r.k ? 'is-active' : ''}`}
                        onClick={() => { setRoute(r.k); setSubmitted(false); }}>
                  <span className="join-v2__route-l">{r.l}</span>
                  <span className="join-v2__route-s">{r.sub}</span>
                  <span className="join-v2__route-arrow" aria-hidden="true">→</span>
                </button>
              ))}
              <div className="join-v2__direct">
                <div className="t-eyebrow" style={{ color: 'var(--fg-3)' }}>OR EMAIL</div>
                <a href="mailto:suesangelsfc@gmail.com">suesangelsfc@gmail.com</a>
              </div>
            </aside>

            <form className="join-v2__form" onSubmit={onSubmit}>
              <header className="join-v2__form-head">
                <div className="t-eyebrow" style={{ color: 'var(--volt)' }}>{current.l} APPLICATION</div>
                <h2 className="join-v2__form-title">
                  {route === 'trial'     ? 'WE WATCH EVERY TAPE.' :
                   route === 'sponsor'   ? 'BACK THE PROJECT.' :
                   route === 'media'     ? 'BUILD THE BRAND.' :
                                           'JOIN THE CREW.'}
                </h2>
                <p className="join-v2__form-sub">{current.sub}</p>
              </header>

              {submitted ? (
                <div className="join-v2__thanks">
                  <span className="t-eyebrow" style={{ color: 'var(--volt)' }}>RECEIVED</span>
                  <h3>Thanks &mdash; we’ll be in touch.</h3>
                  <p>Your application has been submitted. Check your inbox.</p>
                </div>
              ) : (
                <React.Fragment>
                  <div className="join-v2__grid">
                    {fields.map((f) => (
                      <label key={f.id} className={`join-v2__field ${f.type === 'textarea' ? 'join-v2__field--full' : ''}`}>
                        <span>{f.l}{f.req && <em> *</em>}</span>
                        {f.type === 'textarea'
                          ? <textarea name={f.id} placeholder={f.placeholder} rows="4" required={f.req} />
                          : <input type={f.type} name={f.id} placeholder={f.placeholder} required={f.req} />
                        }
                      </label>
                    ))}
                  </div>
                  <div className="join-v2__actions">
                    <span className="t-meta" style={{ color: 'var(--fg-3)' }}>We never share your details. Read our privacy policy.</span>
                    <button type="submit" className="btn btn--volt btn--lg">Submit application →</button>
                  </div>
                </React.Fragment>
              )}
            </form>
          </div>
        </div>
      </section>

      <section className="section section--compact section--alt">
        <div className="container">
          <div className="join-faq">
            <header className="section__head section__head--compact"><div><div className="t-eyebrow">QUESTIONS?</div><h2 className="t-h2">FREQUENTLY ASKED</h2></div></header>
            {[
              { q: 'When are trials held?', a: 'Trials for the 26/27 season open over the summer. Submit your application now and we’ll come back with the next available slot.' },
              { q: 'Do I need experience for the media team?', a: 'A portfolio helps but isn’t required. Tell us what you do and we’ll find a way to put you to work.' },
              { q: 'What do volunteers get?', a: 'No pay, but full kit, hospitality on matchdays, and the badge. The intangibles add up.' },
              { q: 'How do sponsorships work?', a: 'See the Sponsors page. Every partner deal is bespoke — send the enquiry form and we’ll build a proposal for you.' },
            ].map((f, i) => (
              <details key={i} className="faq">
                <summary>{f.q}<span aria-hidden="true">+</span></summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </React.Fragment>
  );
}

window.Join = Join;
