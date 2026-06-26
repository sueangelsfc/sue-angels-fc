// SponsorsRedesign.jsx, partners page, v2 design. Content preserved from the
// original; admin-uploaded sponsors (window.SponsorsStore) still merge in.
const { Reveal, RDArrow, RDPage, RDPageHero } = window;

const RD_DEFAULT_PARTNERS = [
  {
    id: 'p-sporting', name: 'Sporting Solutions Ltd', logo: 'assets/sponsors/sporting-solutions.png',
    primary: true, short: 'Main kit sponsor',
    blurb: 'Sporting Solutions came on board in August 2025 ahead of the inaugural season and have been Sue\u2019s Angels FC\u2019s main kit sponsor every match since.',
    description: [
      'Sporting Solutions Ltd are a London and Surrey-based sports and garden maintenance contractor, specialising in professional outdoor maintenance, sports-surface care, and renovation work.',
      'Their services include soft landscaping, sports renovations, verti-draining, sports line marking, turf maintenance, grounds care, and general outdoor improvement works. With experience across sports and garden environments, they support clubs, organisations and private clients in keeping their spaces safe, functional and well presented.',
      'Sue\u2019s Angels FC are proud to be backed by Sporting Solutions Ltd \u2014 a company whose work plays an important role in maintaining and improving the spaces where sport, community and teamwork come together.',
    ],
    services: ['Soft landscaping', 'Sports renovations', 'Verti-draining', 'Sports line marking', 'Turf maintenance', 'Grounds care', 'Outdoor improvement works'],
    location: 'London & Surrey', instagram: 'sporting_solutions_ltd', contact: 'Direct message via Instagram for enquiries',
    url: 'https://instagram.com/sporting_solutions_ltd', since: '2025',
  },
  {
    id: 'p-hodgson', name: 'Hodgson Roofing', logo: 'assets/sponsors/hodgson-roofing.png',
    primary: true, short: 'Warm-up & training top sponsor',
    blurb: 'Hodgson Roofing joined the club in February 2026 as the main sponsor of Sue\u2019s Angels FC\u2019s warm-up and training top \u2014 the brand the squad wears in every pre-match and midweek session.',
    description: [
      'Hodgson Group TA / Hodgson Roofing are roofing specialists based in Harrow, serving clients across London and the surrounding areas.',
      'Their services include new roofs, roof repairs, flat roofs, lead work, Velux installations and general roofing support. As an NFRC-accredited company, Hodgson Roofing deliver professional roofing solutions with a focus on quality workmanship, reliability and customer care.',
      'Sue\u2019s Angels FC are proud to be supported by Hodgson Roofing \u2014 a trusted roofing specialist whose backing helps strengthen the club as we continue to grow both on and off the pitch.',
    ],
    services: ['New roofs', 'Roof repairs', 'Flat roofs', 'Lead work', 'Velux installations', 'General roofing'],
    accreditations: ['NFRC Accredited'], location: 'Harrow & London', address: '203 Headstone Lane, Harrow, United Kingdom',
    instagram: 'hodgsonroofing', contact: 'Book / enquire via website or Instagram', url: 'https://hodgsonroofing.com', since: '2026',
  },
];

function rdGetPartners() {
  const uploaded = (window.SponsorsStore ? window.SponsorsStore.list() : []);
  let removed = [];
  try { removed = JSON.parse(localStorage.getItem('sa-default-sponsors-removed') || '[]'); } catch (e) {}
  return [...uploaded, ...RD_DEFAULT_PARTNERS.filter((p) => !removed.includes(p.id))];
}

function RDPartnerModal({ partner, onClose }) {
  React.useEffect(() => {
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);
  const desc = (partner.description && partner.description.length) ? partner.description : (partner.blurb ? [partner.blurb] : []);
  const host = (() => { try { return new URL(partner.url).hostname.replace(/^www\./, ''); } catch { return null; } })();
  return (
    <div className="rd-modal" onClick={onClose}>
      <div className="rd-modal__panel" onClick={(e) => e.stopPropagation()}>
        <button className="rd-modal__close" onClick={onClose} aria-label="Close">×</button>
        <div className="rd-modal__head">
          <div className="rd-sponsor__plate" style={{ width: 96, height: 96 }}><img src={partner.logo} alt={partner.name} /></div>
          <div>
            <p className="rd-eyebrow">Official partner · since {partner.since}</p>
            <h2 className="rd-h3" style={{ marginTop: 8 }}>{partner.name}</h2>
            <p style={{ color: 'var(--fg-3)', marginTop: 6 }}>{partner.short}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              {partner.location ? <span className="rd-chip">{partner.location}</span> : null}
              {(partner.accreditations || []).map((a) => <span key={a} className="rd-chip rd-chip--volt">{a}</span>)}
            </div>
          </div>
        </div>
        <div className="rd-prose" style={{ marginTop: 24 }}>
          {desc.map((p, i) => <p key={i}>{p}</p>)}
        </div>
        {(partner.services || []).length ? (
          <div style={{ marginTop: 22 }}>
            <p className="rd-eyebrow">Services</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {partner.services.map((s) => <span key={s} className="rd-chip">{s}</span>)}
            </div>
          </div>
        ) : null}
        <div className="rd-modal__actions">
          {partner.url ? <a href={partner.url} target="_blank" rel="noopener" className="rd-btn rd-btn--volt">{host ? 'Visit website' : 'Open Instagram'} <RDArrow /></a> : null}
          {partner.instagram ? <a href={`https://instagram.com/${partner.instagram}`} target="_blank" rel="noopener" className="rd-btn rd-btn--ghost">@{partner.instagram}</a> : null}
          <a href="contact.html" className="rd-btn rd-btn--ghost">Sponsor enquiry</a>
        </div>
      </div>
    </div>
  );
}

function SponsorsV2() {
  if (window.useMediaStore && window.SponsorsStore) window.useMediaStore(window.SponsorsStore, 'sponsors');
  const partners = rdGetPartners();
  const [detail, setDetail] = React.useState(null);
  // Season credibility strip — derived live from match data, never hardcoded.
  const t = window.rdLeagueTotals ? window.rdLeagueTotals() : null;
  const recStat = t
    ? (t.l === 0
        ? { v: 'Unbeaten', l: `${t.pl} played · ${t.w} won` }
        : { v: `${t.winPct}%`, l: `win rate · ${t.pl} played` })
    : { v: 'Unbeaten', l: 'Inaugural season' };
  const stats = [
    { v: partners.length, l: 'Official partners' },
    { v: 'Champions', l: 'League Ten · 25/26' },
    recStat,
    { v: '1st', l: 'Inaugural season' },
  ];
  const benefits = [
    { n: '01', t: 'Every matchday', c: 'Your brand on the kit we play in every weekend, matchday shirt and training top.' },
    { n: '02', t: 'Real audience', c: 'A growing London fanbase reached every week through reports, tables, gallery and player content.' },
    { n: '03', t: 'Tailored deal', c: 'No fixed tiers. Built around your business, kit, signage, content and community activations.' },
    { n: '04', t: 'Champions\u2019 badge', c: 'Back a winner. League Ten champions, unbeaten in our first season, and promoted for 26/27.' },
  ];
  return (
    <RDPage>
      <main>
        <RDPageHero eyebrow="Partners" title={<>Behind the <em>badge</em></>} sub="Two businesses back this club. Here's who they are, and how to join them." />

        <Reveal as="section" className="rd-section rd-section--tight">
          <div className="rd-container">
            <div className="rd-statgrid">
              {stats.map((s, i) => (
                <div className="rd-tile" key={i}><div className="rd-tile__num" style={{ fontSize: 'clamp(28px,3.4vw,42px)' }}>{s.v}</div><div className="rd-tile__label" style={{ marginTop: 8 }}>{s.l}</div></div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal as="section" className="rd-section rd-section--tight">
          <div className="rd-container">
            <div className="rd-section__head"><div><p className="rd-eyebrow">Proudly backed by</p><h2 className="rd-h2">Main sponsors</h2></div></div>
            <div className="rd-sponsors">
              {partners.map((p) => (
                <button key={p.id} className="rd-sponsor" onClick={() => setDetail(p)} style={{ cursor: 'pointer', textAlign: 'left' }}>
                  <div className="rd-sponsor__plate"><img src={p.logo} alt={p.name} loading="lazy" /></div>
                  <div>
                    <div className="rd-sponsor__role">{p.short}</div>
                    <div className="rd-sponsor__name">{p.name}</div>
                    <p className="rd-sponsor__sub">{p.blurb ? p.blurb.split(/[.!?]/)[0] + '.' : ''}</p>
                    <span className="rd-sponsor__since">Partner since {p.since}</span>
                  </div>
                  <span className="rd-sponsor__arrow" aria-hidden="true"><RDArrow /></span>
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal as="section" className="rd-section rd-section--tight">
          <div className="rd-container">
            <div className="rd-section__head"><div><p className="rd-eyebrow">Why partner</p><h2 className="rd-h2">What you get</h2></div></div>
            <div className="rd-cards">
              {benefits.map((b) => (
                <article key={b.n} className="rd-feature">
                  <div className="rd-tile__num" style={{ fontSize: '32px', color: 'var(--rd-volt-ink)' }}>{b.n}</div>
                  <h3 className="rd-h3" style={{ marginTop: 12, marginBottom: 10 }}>{b.t}</h3>
                  <p>{b.c}</p>
                </article>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal as="section" className="rd-section rd-section--tight" id="support">
          <div className="rd-container">
            <div className="rd-section__head"><div><p className="rd-eyebrow">Support the club</p><h2 className="rd-h2">Back the badge</h2></div></div>
            <p className="rd-lead" style={{ marginBottom: 22 }}>Every contribution helps us develop the club, support our players and raise awareness of sepsis in memory of Susan Anne Martin. Choose where your support goes.</p>
            <p className="rd-eyebrow rd-eyebrow--plain" style={{ color: 'var(--fg-3)', marginBottom: 14 }}>Make a donation</p>
            <div className="rd-donate">
              <a href={window.SA_DONATE_CLUB_URL || 'contact.html'} className="rd-donate__btn rd-donate__btn--club"><span className="rd-donate__lbl">Support the club</span><span className="rd-donate__sub">Equipment, training, matchdays and media</span><RDArrow /></a>
              <a href={window.SA_DONATE_CAUSE_URL || 'contact.html'} className="rd-donate__btn rd-donate__btn--cause"><span className="rd-donate__lbl">Support sepsis awareness</span><span className="rd-donate__sub">Awareness initiatives and community causes</span><RDArrow /></a>
            </div>
            {window.SA_STRIPE_PK && (window.SA_STRIPE_BUYBTN_CLUB || window.SA_STRIPE_BUYBTN_CAUSE) ? (
              <div className="rd-donate rd-donate--stripe" style={{ marginTop: 16 }}>
                {window.SA_STRIPE_BUYBTN_CLUB ? <div className="rd-card"><p className="rd-eyebrow" style={{ marginBottom: 12 }}>Support the club</p><stripe-buy-button buy-button-id={window.SA_STRIPE_BUYBTN_CLUB} publishable-key={window.SA_STRIPE_PK}></stripe-buy-button></div> : null}
                {window.SA_STRIPE_BUYBTN_CAUSE ? <div className="rd-card"><p className="rd-eyebrow" style={{ marginBottom: 12 }}>Support sepsis awareness</p><stripe-buy-button buy-button-id={window.SA_STRIPE_BUYBTN_CAUSE} publishable-key={window.SA_STRIPE_PK}></stripe-buy-button></div> : null}
              </div>
            ) : null}
            <p className="rd-eyebrow rd-eyebrow--plain" style={{ color: 'var(--fg-3)', marginTop: 34, marginBottom: 14 }}>Or back us another way</p>
            <div className="rd-cards">
              {[
                ['Sponsor a player', 'Back a squad member for the season. Your name on their profile, stats and club content.'],
                ['Sponsor a match', 'Become the official partner of a fixture, featured on matchday graphics, team sheets and reports.'],
                ['Sponsor the match ball', 'Support a matchday and get recognition across matchday content and club channels.'],
                ['Become a club partner', 'Work alongside us across web, social, matchday, events and community. Tailored for mutual value.'],
                ['Sponsor a website section', 'Put your brand on a key area: Fixtures, Match Centre, Player Profiles, Stats, Gallery or Community.'],
                ['Support sepsis awareness', 'Direct your support to awareness, education and community initiatives in Sue\u2019s memory.'],
              ].map(([title, copy], i) => (
                <article key={i} className="rd-feature">
                  <div className="rd-tile__num" style={{ fontSize: 28, color: 'var(--rd-volt-ink)' }}>{String(i + 1).padStart(2, '0')}</div>
                  <h3 className="rd-h3" style={{ marginTop: 12, marginBottom: 10 }}>{title}</h3>
                  <p>{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal as="section" className="rd-section rd-section--tight">
          <div className="rd-container">
            <div className="rd-join" style={{ textAlign: 'left' }}>
              <p className="rd-eyebrow" style={{ position: 'relative' }}>Get in touch</p>
              <h2 className="rd-h2" style={{ marginTop: 14, position: 'relative' }}>Put your name on it.</h2>
              <p className="rd-lead" style={{ marginTop: 16, position: 'relative' }}>Tell us about your business and we&rsquo;ll send a pack: who we are, who we reach, and kit mock-ups in your branding.</p>
              <ul className="rd-ticklist" style={{ position: 'relative' }}>
                <li>Tailored proposal within 48 hours</li>
                <li>Mock-ups in your own branding</li>
                <li>Straight to us, no middlemen</li>
              </ul>
              <div className="rd-join__ctas" style={{ justifyContent: 'flex-start' }}>
                <a href="contact.html" className="rd-btn rd-btn--volt rd-btn--lg">Open enquiry form <RDArrow /></a>
                <a href="mailto:suesangelsfc@gmail.com" className="rd-btn rd-btn--ghost rd-btn--lg">suesangelsfc@gmail.com</a>
              </div>
            </div>
          </div>
        </Reveal>
      </main>
      {detail ? <RDPartnerModal partner={detail} onClose={() => setDetail(null)} /> : null}
    </RDPage>
  );
}

ReactDOM.createRoot(document.getElementById('rd-root')).render(<SponsorsV2 />);
