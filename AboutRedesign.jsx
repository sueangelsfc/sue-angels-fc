// AboutRedesign.jsx, club story, history, journey, sepsis, values (v2).
const { Reveal, RDArrow, RDPage, RDPageHero } = window;

function rdClubRecords() {
  const byGoals = window.derivedSquadBy ? window.derivedSquadBy('goals') : [];
  const byAssists = window.derivedSquadBy ? window.derivedSquadBy('assists') : [];
  const byCS = window.derivedSquadBy ? window.derivedSquadBy('cleanSheets') : [];
  const byApps = window.derivedSquad ? window.derivedSquad().slice().sort((a, b) => b.apps - a.apps) : [];
  // biggest win from results
  let big = null;
  for (const r of (window.getDerivedResults ? window.getDerivedResults() : (window.SEASON_RESULTS || []))) {
    if (r.kind === 'walkover') continue;
    const usHome = r.home.includes('Angels');
    const us = usHome ? r.hs : r.as, them = usHome ? r.as : r.hs;
    const gd = (us || 0) - (them || 0);
    if (gd > 0 && (!big || gd > big.gd)) big = { gd, us, them, opp: (usHome ? r.away : r.home).replace(' FC', '') };
  }
  return { topScorer: byGoals[0], mostAssists: byAssists[0], mostApps: byApps[0], cleanSheets: byCS[0], big };
}

function AboutV2() {
  const rec = rdClubRecords();
  const t = window.rdLeagueTotals();
  const journey = [
    { y: 'Aug 25', tag: 'Sponsor', t: 'Sporting Solutions', c: 'Sporting Solutions come on board as main kit sponsor, the brand on the front of the matchday shirt every weekend since.' },
    { y: 'Sep 25', tag: 'Kickoff', t: 'Founded · opening win', c: 'First competitive fixture, 21 September 2025. 5–0 vs Pure Football FC 2.0. The project is alive.' },
    { y: 'Jan 26', tag: 'Statement', t: '12–0 at Balham', c: 'Travelled to Balham Bteckerz and dropped a dozen. The performance that made the league sit up.' },
    { y: 'Feb 26', tag: 'Sponsor', t: 'Hodgson Roofing', c: 'Hodgson Roofing join the family as warm-up & training top sponsor, the brand the squad wears pre-match.' },
    { y: 'Apr 26', tag: 'Champions', t: 'Title confirmed', c: 'Beat Sporting Club Catania 10–1 at home on 26 April. League Ten title clinched mathematically with games to play.' },
    { y: 'May 26', tag: 'Perfect', t: 'Unbeaten. Champions.', c: `${t.pl} played. ${t.w} won. ${t.gf} scored. Inaugural season finished with the title and a 100% record.` },
    { y: 'Sep 26', tag: 'Next', t: 'Promoted · 26/27', c: 'New division. Same standard. Trials open over the summer.' },
  ];
  const values = [
    { t: 'Discipline', c: 'Standards on and off the pitch. Earn the shirt every week.' },
    { t: 'Brotherhood', c: 'A football family bound by respect, resilience and camaraderie.' },
    { t: 'Remembrance', c: 'Everything we do honours the memory of Susan Anne Martin.' },
    { t: 'Ambition', c: 'Champions in year one. We look ahead with pride and hunger.' },
  ];
  const records = [
    rec.topScorer && { label: 'Top scorer', num: rec.topScorer.goals, who: `${rec.topScorer.first} ${rec.topScorer.last}` },
    rec.mostAssists && { label: 'Most assists', num: rec.mostAssists.assists, who: `${rec.mostAssists.first} ${rec.mostAssists.last}` },
    rec.mostApps && { label: 'Most apps', num: rec.mostApps.apps, who: `${rec.mostApps.first} ${rec.mostApps.last}` },
    rec.cleanSheets && { label: 'Clean sheets', num: rec.cleanSheets.cleanSheets, who: `${rec.cleanSheets.first} ${rec.cleanSheets.last}` },
    rec.big && { label: 'Biggest win', num: `${rec.big.us}–${rec.big.them}`, who: `vs ${rec.big.opp}` },
    { label: 'Trophies', num: 1, who: 'League Ten 25/26' },
  ].filter(Boolean);

  return (
    <RDPage>
      <main>
        <RDPageHero eyebrow="The story" title={<>Built in<br /><em>her</em> name.</>} sub="Founded in 2025 in memory of Susan Anne Martin. League Ten champions, first season, unbeaten." image="assets/hero-team.jpg" imageLight="assets/hero-team-light.jpg" />

        {/* Mission quote */}
        <Reveal as="section" className="rd-section rd-section--tight">
          <div className="rd-container">
            <div className="rd-quote">
              <p className="rd-eyebrow">Why we exist</p>
              <blockquote className="rd-quote__big">&ldquo;What we do in life echoes in eternity.&rdquo;</blockquote>
              <p className="rd-lead">A club that means something on the pitch and off it. That&rsquo;s the whole idea.</p>
            </div>
          </div>
        </Reveal>

        {/* On the field, club records */}
        <Reveal as="section" className="rd-section rd-section--tight">
          <div className="rd-container">
            <div className="rd-section__head"><div><p className="rd-eyebrow">On the field</p><h2 className="rd-h2">The record</h2></div></div>
            <div className="rd-statgrid">
              {records.map((r, i) => (
                <div className="rd-tile" key={i}>
                  <div className="rd-tile__label">{r.label}</div>
                  <div className="rd-tile__num">{r.num}</div>
                  <div className="rd-tile__delta rd-tile__delta--flat">{r.who}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Journey timeline carousel */}
        <Reveal as="section" className="rd-section rd-section--tight">
          <div className="rd-container">
            <div className="rd-section__head"><div><p className="rd-eyebrow">25/26</p><h2 className="rd-h2">How it happened</h2></div></div>
          </div>
          <div className="rd-container">
            <div className="rd-rail rd-timeline">
              {journey.map((e, i) => (
                <div className="rd-tl" key={i}>
                  <div className="rd-tl__top"><span className="rd-tl__y">{e.y}</span><span className="rd-chip rd-chip--volt">{e.tag}</span></div>
                  <h3 className="rd-tl__t">{e.t}</h3>
                  <p className="rd-tl__c">{e.c}</p>
                  <span className="rd-tl__n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Off the field, Sue's story */}
        <Reveal as="section" className="rd-section">
          <div className="rd-container">
            <div className="rd-story">
              <div className="rd-slot rd-story__visual" data-label="Sue's Angels FC"><img className="rd-slot__mark" src="assets/badge/sue-angels-shield.png" alt="" /></div>
              <div className="rd-story__body">
                <p className="rd-eyebrow">Off the field · Sue's story</p>
                <h2 className="rd-h2" style={{ marginTop: 14 }}>Why we play.</h2>
                <div className="rd-prose" style={{ marginTop: 18 }}>
                  <p>Founded and led by Stephen Epathite, Sue&rsquo;s Angels FC was built on the values of football, friendship and togetherness, proudly honouring the life and memory of Susan Anne Martin.</p>
                  <p>Following Sue&rsquo;s passing from sepsis in 2020, the club takes part in charity matches and community initiatives, raising awareness of the condition and supporting a cause close to the hearts of everyone connected to the team.</p>
                  <p>What began as a way of bringing people together through remembrance has grown into something deeply meaningful: a club with standards, a story, and the badge worn for something bigger than the result.</p>
                </div>
              </div>
            </div>

            <div className="rd-sepsis" style={{ marginTop: 'clamp(28px,4vw,56px)' }}>
              <div className="rd-sepsis__txt">
                <p className="rd-eyebrow">In her memory</p>
                <h3 className="rd-h3" style={{ marginTop: 12 }}>Raising sepsis awareness</h3>
                <p style={{ color: 'var(--fg-2)' }}>Sepsis can take hold quickly, and recognising it early makes all the difference. We lost Sue to it in 2020. Through awareness matches and fundraising, we help more people understand the signs, and we keep her memory at the heart of the club.</p>
              </div>
              <a href="https://sepsistrust.org" target="_blank" rel="noopener" className="rd-btn rd-btn--volt">Learn the signs <RDArrow /></a>
            </div>
          </div>
        </Reveal>

        {/* Values */}
        <Reveal as="section" className="rd-section rd-section--tight">
          <div className="rd-container">
            <div className="rd-section__head"><div><p className="rd-eyebrow">What we stand for</p><h2 className="rd-h2">Club values</h2></div></div>
            <div className="rd-cards">
              {values.map((v, i) => (
                <article className="rd-feature" key={i}>
                  <div className="rd-tile__num" style={{ fontSize: 28, color: 'var(--rd-volt)' }}>{String(i + 1).padStart(2, '0')}</div>
                  <h3 className="rd-h3" style={{ marginTop: 12, marginBottom: 10 }}>{v.t}</h3>
                  <p>{v.c}</p>
                </article>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Join band */}
        <Reveal as="section" className="rd-section rd-section--tight">
          <div className="rd-container">
            <div className="rd-join">
              <p className="rd-eyebrow rd-eyebrow--plain rd-volt" style={{ display: 'flex', justifyContent: 'center' }}>26/27 · The next chapter</p>
              <h2 className="rd-h2" style={{ marginTop: 14 }}>Be part of it.</h2>
              <p className="rd-join__sub rd-lead">Trials, volunteering, media and sponsorship, all open.</p>
              <div className="rd-join__ctas">
                <a href="join.html" className="rd-btn rd-btn--volt rd-btn--lg">Join the club <RDArrow /></a>
                <a href="champions.html" className="rd-btn rd-btn--ghost rd-btn--lg">The 25/26 story</a>
              </div>
            </div>
          </div>
        </Reveal>
      </main>
    </RDPage>
  );
}

ReactDOM.createRoot(document.getElementById('rd-root')).render(<AboutV2 />);
