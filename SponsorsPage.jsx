// SponsorsPage.jsx, admin-editable Manchester-United-style partners page.
// Default partners ship hardcoded; admin can add more, edit any, or remove.

const DEFAULT_PARTNERS = [
  {
    id: 'p-sporting',
    name: 'Sporting Solutions Ltd',
    logo: 'assets/sponsors/sporting-solutions.png',
    primary: true,
    short: 'Main kit sponsor',
    blurb: 'Sporting Solutions came on board in August 2025 ahead of the inaugural season and have been Sue’s Angels FC’s main kit sponsor every match since.',
    description: [
      'Sporting Solutions Ltd are a London and Surrey-based sports and garden maintenance contractor, specialising in professional outdoor maintenance, sports-surface care, and renovation work.',
      'Their services include soft landscaping, sports renovations, verti-draining, sports line marking, turf maintenance, grounds care, and general outdoor improvement works. With experience across sports and garden environments, they support clubs, organisations and private clients in keeping their spaces safe, functional and well presented.',
      'Sue’s Angels FC are proud to be backed by Sporting Solutions Ltd, a company whose work plays an important role in maintaining and improving the spaces where sport, community and teamwork come together.',
    ],
    services: ['Soft landscaping', 'Sports renovations', 'Verti-draining', 'Sports line marking', 'Turf maintenance', 'Grounds care', 'Outdoor improvement works'],
    location: 'London & Surrey',
    instagram: 'sporting_solutions_ltd',
    contact: 'Direct message via Instagram for enquiries',
    url: 'https://instagram.com/sporting_solutions_ltd',
    since: '2025',
  },
  {
    id: 'p-hodgson',
    name: 'Hodgson Roofing',
    logo: 'assets/sponsors/hodgson-roofing.png',
    primary: true,
    short: 'Warm-up & training top sponsor',
    blurb: 'Hodgson Roofing joined the club in February 2026 as the main sponsor of Sue’s Angels FC’s warm-up and training top, the brand the squad wears in every pre-match and midweek session.',
    description: [
      'Hodgson Group TA / Hodgson Roofing are roofing specialists based in Harrow, serving clients across London and the surrounding areas.',
      'Their services include new roofs, roof repairs, flat roofs, lead work, Velux installations and general roofing support. As an NFRC-accredited company, Hodgson Roofing deliver professional roofing solutions with a focus on quality workmanship, reliability and customer care.',
      'Sue’s Angels FC are proud to be supported by Hodgson Roofing, a trusted roofing specialist whose backing helps strengthen the club as we continue to grow both on and off the pitch.',
    ],
    services: ['New roofs', 'Roof repairs', 'Flat roofs', 'Lead work', 'Velux installations', 'General roofing'],
    accreditations: ['NFRC Accredited'],
    location: 'Harrow & London',
    address: '203 Headstone Lane, Harrow, United Kingdom',
    instagram: 'hodgsonroofing',
    contact: 'Book / enquire via website or Instagram',
    url: 'https://hodgsonroofing.com',
    since: '2026',
  },
];

// Use admin-uploaded sponsors first, then merge in defaults (filtered by removed-id list).
function getCurrentPartners() {
  const uploaded = (window.SponsorsStore ? window.SponsorsStore.list() : []);
  let removedDefaults = [];
  try { removedDefaults = JSON.parse(localStorage.getItem('sa-default-sponsors-removed') || '[]'); } catch (e) {}
  const defaults = DEFAULT_PARTNERS.filter((p) => !removedDefaults.includes(p.id));
  return [...uploaded, ...defaults];
}
function removeDefault(id) {
  try {
    const xs = JSON.parse(localStorage.getItem('sa-default-sponsors-removed') || '[]');
    if (!xs.includes(id)) xs.push(id);
    localStorage.setItem('sa-default-sponsors-removed', JSON.stringify(xs));
    window.dispatchEvent(new CustomEvent('sa-media-changed', { detail: { prefix: 'sponsors' } }));
  } catch (e) {}
}

function PartnerCard({ partner, onOpen, admin, onRemove, onEdit }) {
  return (
    <div className={`partner-card ${partner.primary ? 'partner-card--primary' : ''}`}>
      <button type="button" className="partner-card__main" onClick={() => onOpen(partner)}>
        <div className="partner-card__logo-wrap">
          <img src={partner.logo} alt={partner.name} className="partner-card__logo" />
        </div>
        <div className="partner-card__meta">
          <span className="partner-card__name">{partner.name}</span>
          <span className="partner-card__role">{partner.short}</span>
        </div>
        <span className="partner-card__arrow" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M5 12h14"/><path d="m13 5 7 7-7 7"/></svg>
        </span>
      </button>
      {admin && (
        <div className="partner-card__admin">
          <button type="button" className="btn btn--ghost btn--sm" onClick={onEdit}>Edit</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onRemove}>Remove</button>
        </div>
      )}
    </div>
  );
}

function PartnerDetail({ partner, onClose }) {
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);
  // Coerce single-blurb partners into the multi-paragraph form so the layout stays
  // consistent for admin-added sponsors that haven't filled in the longer field.
  const description = (partner.description && partner.description.length)
    ? partner.description
    : (partner.blurb ? [partner.blurb] : []);
  const services = partner.services || [];
  const accreditations = partner.accreditations || [];
  const ig = partner.instagram;
  const websiteHost = (() => {
    try { return new URL(partner.url).hostname.replace(/^www\./, ''); } catch { return null; }
  })();
  return (
    <div className="partner-overlay" onClick={onClose}>
      <div className="partner-detail partner-detail--rich" onClick={(e) => e.stopPropagation()}>
        <button className="partner-detail__close" onClick={onClose} aria-label="Close">×</button>

        <div className="partner-detail__head">
          <div className="partner-detail__logo"><img src={partner.logo} alt={partner.name} /></div>
          <div className="partner-detail__head-copy">
            <span className="t-eyebrow" style={{ color: 'var(--volt)' }}>OFFICIAL PARTNER · SINCE {partner.since}</span>
            <h2 className="partner-detail__name">{partner.name}</h2>
            <p className="partner-detail__role">{partner.short}</p>
            {(partner.location || accreditations.length > 0) && (
              <div className="partner-detail__chips">
                {partner.location && (
                  <span className="partner-detail__chip">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-7-7.5-7-13a7 7 0 0 1 14 0c0 5.5-7 13-7 13Z"/><circle cx="12" cy="9" r="2.5"/></svg>
                    {partner.location}
                  </span>
                )}
                {accreditations.map((a) => (
                  <span key={a} className="partner-detail__chip partner-detail__chip--volt">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m4 12 5 5L20 6"/></svg>
                    {a}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="partner-detail__body">
          {description.map((p, i) => <p key={i}>{p}</p>)}

          {services.length > 0 && (
            <div className="partner-detail__services">
              <div className="t-eyebrow" style={{ color: 'var(--volt)' }}>SERVICES</div>
              <ul className="partner-detail__service-list">
                {services.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
          )}

          {(partner.address || partner.contact || ig || websiteHost) && (
            <div className="partner-detail__info">
              <div className="t-eyebrow" style={{ color: 'var(--volt)' }}>FIND THEM</div>
              <dl className="partner-detail__info-list">
                {websiteHost && (
                  <div className="partner-detail__info-row">
                    <dt>Website</dt>
                    <dd><a href={partner.url} target="_blank" rel="noopener noreferrer">{websiteHost}</a></dd>
                  </div>
                )}
                {ig && (
                  <div className="partner-detail__info-row">
                    <dt>Instagram</dt>
                    <dd><a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener noreferrer">@{ig}</a></dd>
                  </div>
                )}
                {partner.address && (
                  <div className="partner-detail__info-row">
                    <dt>Address</dt>
                    <dd>{partner.address}</dd>
                  </div>
                )}
                {partner.contact && (
                  <div className="partner-detail__info-row">
                    <dt>Enquiries</dt>
                    <dd>{partner.contact}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>

        <div className="partner-detail__actions">
          {partner.url && <a href={partner.url} target="_blank" rel="noopener noreferrer" className="btn btn--volt">{websiteHost ? 'Visit website' : 'Open Instagram'} →</a>}
          {ig && websiteHost && <a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">@{ig}</a>}
          <a href="contact.html" className="btn btn--ghost">Sponsor enquiry</a>
        </div>
      </div>
    </div>
  );
}

function PartnerEditor({ partner, onSave, onCancel }) {
  const [form, setForm] = React.useState({
    name: '', short: '', blurb: '', url: '', since: '2026', logo: '', primary: false,
    ...partner,
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="partner-overlay" onClick={onCancel}>
      <div className="partner-detail" onClick={(e) => e.stopPropagation()}>
        <button className="partner-detail__close" onClick={onCancel} aria-label="Close">×</button>
        <div className="t-eyebrow" style={{ color: 'var(--volt)' }}>{partner.id ? 'EDIT PARTNER' : 'NEW PARTNER'}</div>
        <h2 className="partner-detail__name">Partner details</h2>
        <div className="partner-edit">
          <label><span>Logo</span>
            {form.logo && <img src={form.logo} alt="" style={{ maxWidth: 160, maxHeight: 80, background: '#fff', padding: 8, borderRadius: 4, marginBottom: 8, display: 'block' }} />}
            <window.MediaUploader label={form.logo ? 'Replace logo' : 'Upload logo'} onPick={(dataUrl) => set('logo', dataUrl)} />
          </label>
          <label><span>Partner name</span><input value={form.name} onChange={(e) => set('name', e.target.value)} /></label>
          <label><span>Role / tagline</span><input value={form.short} onChange={(e) => set('short', e.target.value)} /></label>
          <label><span>Partner since (year)</span><input value={form.since} onChange={(e) => set('since', e.target.value)} /></label>
          <label><span>Website URL</span><input value={form.url} onChange={(e) => set('url', e.target.value)} placeholder="https://" /></label>
          <label className="partner-edit__full"><span>Blurb</span><textarea rows="4" value={form.blurb} onChange={(e) => set('blurb', e.target.value)} /></label>
          <label className="partner-edit__check"><input type="checkbox" checked={!!form.primary} onChange={(e) => set('primary', e.target.checked)} /><span>Primary partner (volt accent)</span></label>
        </div>
        <div className="partner-detail__actions">
          <button type="button" className="btn btn--volt" onClick={() => onSave(form)} disabled={!form.name || !form.logo}>Save partner</button>
          <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// Stats strip, single row of impact numbers that anchors the sponsors page hero.
function PartnersStatsStrip({ partnerCount, seasonsBacking }) {
  const stats = [
    { value: partnerCount, label: 'OFFICIAL PARTNERS' },
    { value: 'CHAMPIONS', label: 'LEAGUE TEN · 25/26' },
    { value: 'UNBEATEN', label: '17 PLAYED · 17 WON' },
    { value: seasonsBacking, label: seasonsBacking === 1 ? 'INAUGURAL SEASON' : 'SEASONS TOGETHER' },
  ];
  return (
    <section className="section section--compact sp-stats-section">
      <div className="container">
        <div className="sp-stats">
          {stats.map((s, i) => (
            <div key={i} className="sp-stat">
              <div className="sp-stat__value">{s.value}</div>
              <div className="sp-stat__label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// "Why partner with us" benefit grid.
function PartnersBenefits() {
  const benefits = [
    {
      n: '01',
      t: 'EVERY MATCHDAY',
      c: 'Your brand on the kit we play in every weekend. Hodgson Roofing on the training top, Sporting Solutions on the matchday shirt.',
    },
    {
      n: '02',
      t: 'REAL AUDIENCE',
      c: 'A growing London fanbase, reached every week through match reports, tables, gallery and player content.',
    },
    {
      n: '03',
      t: 'TAILORED DEAL',
      c: 'No fixed tiers. Built around your business, kit, signage, content and community activations.',
    },
    {
      n: '04',
      t: 'CHAMPIONS’ BADGE',
      c: 'Back a winner. League Ten champions, unbeaten in our first season, and promoted for 26/27.',
    },
  ];
  return (
    <section className="section section--compact">
      <div className="container">
        <header className="section__head section__head--compact">
          <div>
            <div className="t-eyebrow" style={{ color: 'var(--volt)' }}>WHY PARTNER</div>
            <h2 className="t-h2">BACK THE PROJECT.</h2>
            <span className="t-meta" style={{ color: 'var(--fg-3)', display: 'block', marginTop: 6 }}>26 / 27 OPEN</span>
          </div>
        </header>
        <div className="sp-benefits">
          {benefits.map((b) => (
            <article key={b.n} className="sp-benefit">
              <div className="sp-benefit__num">{b.n}</div>
              <h3 className="sp-benefit__title">{b.t}</h3>
              <p className="sp-benefit__copy">{b.c}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SponsorsPage() {
  const admin = window.useAdmin ? window.useAdmin() : false;
  // Re-render when the sponsors store changes.
  window.useMediaStore ? window.useMediaStore(window.SponsorsStore, 'sponsors') : null;
  const partners = getCurrentPartners();
  const [detail, setDetail] = React.useState(null);
  const [editor, setEditor] = React.useState(null);

  const save = (form) => {
    if (form.id && partners.find((p) => p.id === form.id)) {
      // Default partner, store the override in the uploaded store, hiding the default.
      if (DEFAULT_PARTNERS.find((p) => p.id === form.id)) {
        removeDefault(form.id);
        window.SponsorsStore.add({ ...form });
      } else {
        window.SponsorsStore.update(form.id, form);
      }
    } else {
      window.SponsorsStore.add({ ...form });
    }
    setEditor(null);
  };

  const remove = (p) => {
    if (!window.confirm(`Remove ${p.name}?`)) return;
    if (DEFAULT_PARTNERS.find((d) => d.id === p.id)) removeDefault(p.id);
    else window.SponsorsStore.remove(p.id);
  };

  return (
    <React.Fragment>
      <PageHero
        eyebrow="BACK THE PROJECT"
        title={<>SUE&rsquo;S ANGELS FC <em>PARTNERS</em></>}
        sub="The brands behind the badge, proud partners of Sue's Angels FC, League Ten champions."
      >
      </PageHero>

      {/* Anchor stats strip, dynamic numbers that sell the project at a glance. */}
      <PartnersStatsStrip partnerCount={partners.length} seasonsBacking={1} />

      <section className="section section--compact sp-home">
        <div className="container">
          <header className="section__head section__head--compact">
            <div>
              <div className="t-eyebrow" style={{ color: 'var(--volt)' }}>PROUDLY BACKED BY</div>
              <h2 className="t-h2">MAIN SPONSORS</h2>
            </div>
            <a href="contact.html" className="btn btn--volt btn--sm">Back the project →</a>
          </header>

          {admin && window.AdminSlot && (
            <window.AdminSlot title="MANAGE PARTNERS">
              <button type="button" className="btn btn--volt btn--sm" onClick={() => setEditor({})}>+ Add a partner</button>
              <span className="t-meta" style={{ color: 'var(--fg-3)' }}>Click any card to view detail. Admin Edit button replaces the click-to-open behaviour.</span>
            </window.AdminSlot>
          )}

          <div className="sp-home__grid">
            {partners.map((p) => {
              // Build the "role + since" sub-line the home block uses, derived from
              // the partner record. Falls back gracefully when fields are missing.
              const role = (p.short || '').toUpperCase();
              const since = p.since || '2026';
              return (
                <div key={p.id} className="sp-home__card-wrap">
                  <button
                    type="button"
                    className="sp-home__card"
                    onClick={() => setDetail(p)}
                    aria-label={`Open ${p.name} partner details`}
                  >
                    <div className="sp-home__rail" aria-hidden="true" />
                    <div className="sp-home__logo-plate">
                      <img src={p.logo} alt={p.name} />
                    </div>
                    <div className="sp-home__meta">
                      <span className="sp-home__role">{role}</span>
                      <h3 className="sp-home__name">{p.name}</h3>
                      <p className="sp-home__sub">{p.blurb ? p.blurb.split(/[.!?]/)[0] + '.' : ''}</p>
                      <span className="sp-home__since">PARTNER SINCE {since.toUpperCase()}</span>
                    </div>
                    <span className="sp-home__arrow" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M5 12h14"/><path d="m13 5 7 7-7 7"/></svg>
                    </span>
                  </button>
                  {admin && (
                    <div className="sp-home__admin">
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditor(p)}>Edit</button>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => remove(p)}>Remove</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="sp-home__cta">
            <span>YOUR BRAND HERE FOR 26/27 &mdash; ENQUIRIES OPEN.</span>
          </div>
        </div>
      </section>

      {/* Why partner, benefit grid. Sits between The Family and the enquiry CTA. */}
      <PartnersBenefits />

      <section className="section section--compact section--alt sp-cta-section">
        <div className="container">
          <header className="section__head section__head--compact">
            <div>
              <div className="t-eyebrow" style={{ color: 'var(--volt)' }}>PARTNERSHIP ENQUIRIES</div>
              <h2 className="t-h2">JOIN THE FAMILY</h2>
            </div>
          </header>

          {/* Magazine-style enquiry card, mirrors the sp-home__card pattern:
              white "logo plate" on the left (here: large volt envelope icon),
              role/title/sub/checklist in the middle, arrow on the right. */}
          <div className="sp-join">
            <div className="sp-join__rail" aria-hidden="true" />
            <div className="sp-join__icon-plate">
              <img src="assets/badge/sue-angels-badge-cutout.png" alt="Sue's Angels FC" />
            </div>
            <div className="sp-join__meta">
              <span className="sp-join__role">DIRECT LINE · 26 / 27 OPEN</span>
              <a href="mailto:suesangelsfc@gmail.com" className="sp-join__name">suesangelsfc@gmail.com</a>
              <p className="sp-join__sub">
                We&rsquo;ll send a tailored pack, club story, audience, branded kit mock-ups and your projected reach for 26/27.
              </p>
              <ul className="sp-join__list">
                <li><span aria-hidden="true">✓</span> Tailored proposal within 48 hours</li>
                <li><span aria-hidden="true">✓</span> Mock-ups in your own branding</li>
                <li><span aria-hidden="true">✓</span> Straight to us, no middlemen</li>
              </ul>
              <div className="sp-join__actions">
                <a href="contact.html" className="btn btn--volt btn--sm">Open enquiry form →</a>
                <a href="mailto:suesangelsfc@gmail.com" className="btn btn--ghost btn--sm">Email directly</a>
              </div>
            </div>
            <span className="sp-join__arrow" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M5 12h14"/><path d="m13 5 7 7-7 7"/></svg>
            </span>
          </div>

          <div className="sp-home__cta">
            <span>SUE&rsquo;S ANGELS FC &mdash; LONDON &middot; SUNDAY LEAGUE.</span>
            <a href="sponsors.html" className="btn btn--ghost btn--sm">Back to top ↑</a>
          </div>
        </div>
      </section>

      {detail && <PartnerDetail partner={detail} onClose={() => setDetail(null)} />}
      {editor && <PartnerEditor partner={editor} onSave={save} onCancel={() => setEditor(null)} />}
    </React.Fragment>
  );
}

window.SponsorsPage = SponsorsPage;
