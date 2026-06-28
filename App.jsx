// App.jsx, top-level composition. Hero up top, then matchday data,
// then the championship celebration block, then media + kit + sponsors + CTA.
function App() {
  return (
    <React.Fragment>
      <Nav />
      <main>
        <Hero />
        <HomeChampions />
        <Fixtures />
        <Results />
        <TablePreview />
        <Squad />
        {typeof KitReveal === 'function' ? <KitReveal /> : null}
        {typeof PreseasonHub === 'function' ? <PreseasonHub /> : null}
        <Gallery />
        <Sponsors />
        <JoinCTA />
      </main>
      <Footer />
      {typeof SueTweaks === 'function' ? <SueTweaks /> : null}
    </React.Fragment>
  );
}

// HomeChampions, compact championship celebration strip below the hero.
// Numbers derive live from window.SEASON_RESULTS (league only) so they stay in
// sync with the Results tab as new fixtures roll in.
function HomeChampions() {
  // League-only played results.
  const results = (window.getDerivedResults ? window.getDerivedResults() : (window.SEASON_RESULTS || []))
    .filter((r) => (r.competition || '').toLowerCase().includes('league'));
  let played = 0, wins = 0, draws = 0, losses = 0, gf = 0, ga = 0;
  for (const r of results) {
    played++;
    if (r.kind === 'walkover') { wins++; continue; }
    const usHome = r.home.includes('Angels');
    const us = usHome ? r.hs : r.as;
    const them = usHome ? r.as : r.hs;
    gf += us || 0; ga += them || 0;
    if (r.kind === 'penalty' && r.pens) {
      const usP = usHome ? r.pens.hs : r.pens.as;
      const themP = usHome ? r.pens.as : r.pens.hs;
      if (usP > themP) wins++; else losses++;
    } else if (us > them) wins++;
    else if (us === them) draws++;
    else losses++;
  }
  const pts = wins * 3 + draws;
  const gd = gf - ga;
  const unbeaten = losses === 0 && played > 0;
  const title = unbeaten ? 'CHAMPIONS. UNBEATEN.' : `${wins} FROM ${played}.`;
  const sub = `${played} played. ${wins} won. ${gf} scored. ${ga} conceded. The full story of how the title was won.`;

  return (
    <section className="section section--compact home-champ">
      <div className="container hc2">
        <span className="hc2__eye">25 / 26 SEASON · LEAGUE TEN</span>
        <h2 className="hc2__title">{title}</h2>
        <p className="hc2__sub">{`${played} played · ${wins} won · ${gf} scored · ${ga} conceded.`}</p>
        <div className="hc2__stats">
          <span className="hc2__stat"><b>{wins}</b> WINS</span>
          <span className="hc2__divider" aria-hidden="true" />
          <span className="hc2__stat"><b>{(gd >= 0 ? '+' : '') + gd}</b> GD</span>
          <span className="hc2__divider" aria-hidden="true" />
          <span className="hc2__stat"><b>{pts}</b> PTS</span>
        </div>
        <a href="champions.html" className="hc2__cta">
          THE FULL STORY <span aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
