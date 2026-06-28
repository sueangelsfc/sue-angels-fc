// JoinCTA.jsx, bottom volt block with multi-CTA, links to /join.html for the full form page
function JoinCTA() {
  return (
    <section id="join-cta" className="section section--compact join">
      <div className="container">
        <div className="join__inner">
          <div className="join__copy">
            <div className="t-eyebrow" style={{ color: 'var(--navy)' }}>OPEN FOR 25/26</div>
            <h2 className="join__title">JOIN THE CLUB.</h2>
            <p className="join__sub">Trials, volunteering, sponsorship and media. The project is open. Step in.</p>
          </div>
          <div className="join__actions">
            <a href="join.html" className="btn btn--dark">Player trials</a>
            <a href="sponsors.html" className="btn btn--dark">Sponsor enquiry</a>
            <a href="join.html" className="btn btn--dark">Media volunteer</a>
          </div>
        </div>
      </div>
    </section>
  );
}

window.JoinCTA = JoinCTA;
