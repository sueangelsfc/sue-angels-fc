// About.jsx — club story page (championship-era refresh).
//
// Sections (top → bottom):
//   1. PageHero (eyebrow + headline + sub)
//   2. Mission — display quote with a volt rule
//   3. By the numbers — 6 small stat cards, animated counters, live from match data
//   4. Founding story — editorial two-col with dedication card
//   5. Champions banner — clickable card; resets default <a> underline/color
//   6. Club values — 4 small interactive cards with click-to-reveal detail
//   7. The journey — HORIZONTAL CAROUSEL of compact milestone cards
//   8. Closing CTA — trials + sponsor enquiry
function About() {
  // Pull live league stats so this never drifts.
  const usRow = (window.RAW_TABLE || []).find((r) => r.us)
             || { pl: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: '0', pts: 0 };
  const statsLine = `P${usRow.pl} W${usRow.w} D${usRow.d} L${usRow.l} · ${usRow.gf} GF · ${usRow.ga} GA · GD ${usRow.gd} · ${usRow.pts} points.`;

  // Derived season counters for the BY THE NUMBERS strip.
  const squad = (window.derivedSquad ? window.derivedSquad() : []);
  const totalGoals  = squad.reduce((n, p) => n + (p.goals    || 0), 0);
  const totalCleans = squad.reduce((n, p) => Math.max(n, p.cleanSheets || 0), 0);
  const totalSquad  = (window.SQUAD || []).length;

  // Small SVG icons for the value cards. Stroked, ~22px — keeps cards cute.
  const ICON = {
    discipline: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
    ),
    brother: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="2.6"/><circle cx="17" cy="9" r="2.6"/><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5"/><path d="M14 19c0-3 2.7-5 6-5"/></svg>
    ),
    ambition: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l2.6 6.4 6.9.6-5.2 4.7 1.6 6.8L12 17.9 6.1 21.5l1.6-6.8L2.5 10l6.9-.6L12 3z"/></svg>
    ),
    legacy: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3c4 3.4 7 6.6 7 11a7 7 0 0 1-14 0c0-4.4 3-7.6 7-11z"/><path d="M12 12v8"/></svg>
    ),
  };

  const values = [
    { n: '01', t: 'DISCIPLINE',   c: 'Every session. Every minute. Every detail.', detail: 'Standards set the ceiling. No shortcuts. The work happens whether anyone is watching or not.', icon: ICON.discipline },
    { n: '02', t: 'BROTHERHOOD', c: 'The badge over the name on the back.',         detail: 'A football family bound by respect, resilience and camaraderie. We win and lose together.', icon: ICON.brother },
    { n: '03', t: 'AMBITION',    c: 'Not here to participate. Here to build.',      detail: 'Inaugural-season champions of League Ten, unbeaten. Promoted. The bar moves with us.',   icon: ICON.ambition },
    { n: '04', t: 'LEGACY',      c: 'Honouring Susan Anne Martin. Every match.',     detail: 'A club born from remembrance. Charity matches, awareness work, community at the centre.', icon: ICON.legacy },
  ];

  // Live stats tiles.
  const stats = [
    { v: usRow.w   || 0,    l: 'WINS',          sub: 'League Ten 25/26' },
    { v: totalGoals,        l: 'GOALS',         sub: 'Across the campaign' },
    { v: usRow.gd  || '+0', l: 'GOAL DIFF',     sub: 'Goals scored − conceded' },
    { v: 1,                 l: 'TROPHY',        sub: 'League Ten title' },
    { v: totalCleans,       l: 'CLEAN SHEETS',  sub: 'Best on record' },
    { v: totalSquad,        l: 'SQUAD',         sub: 'Players on the books' },
  ];

  const timeline = [
    { y: 'AUG 25', tag: 'SPONSOR',    t: 'SPORTING SOLUTIONS',     c: 'Sporting Solutions come on board as main kit sponsor — the brand on the front of the matchday shirt every weekend since.' },
    { y: 'SEP 25', tag: 'KICKOFF',    t: 'FOUNDED · OPENING WIN',  c: 'First competitive fixture, 21 September 2025. 5–0 vs Pure Football FC 2.0. The project is alive.' },
    { y: 'JAN 26', tag: 'STATEMENT',  t: '12–0 AT BALHAM',         c: 'Travelled to Balham Bteckerz and dropped a dozen on them. The performance that made the league sit up.' },
    { y: 'FEB 26', tag: 'SPONSOR',    t: 'HODGSON ROOFING',        c: 'Hodgson Roofing join the family as warm-up & training top sponsor — the brand the squad wears pre-match.' },
    { y: 'APR 26', tag: 'CHAMPIONS',  t: 'CHAMPIONS · CONFIRMED',  c: 'Beat Sporting Club Catania 10–1 at home on 26 April. League Ten title clinched mathematically with games to play.' },
    { y: 'MAY 26', tag: 'PERFECT',    t: 'UNBEATEN. CHAMPIONS.',   c: `${usRow.pl} played. ${usRow.w} won. ${usRow.gf} scored. Inaugural season finished with the title and a 100% record.` },
    { y: 'SEP 26', tag: 'NEXT',       t: 'PROMOTED · 26/27 BEGINS', c: 'New division. Same standard. Trials open over the summer.' },
  ];

  // Open value card (click-to-reveal more detail). null = all collapsed.
  const [openValue, setOpenValue] = React.useState(null);

  // Timeline horizontal carousel
  const [page, setPage] = React.useState(0);
  // Pages of 3 cards on desktop (responsive: 2 below 1080, 1 below 720)
  const PER_PAGE = 3;
  const maxPage = Math.max(0, timeline.length - PER_PAGE);

  return (
    <React.Fragment>
      <PageHero
        eyebrow="THE CLUB"
        title={<>MORE THAN A<br/><em>FOOTBALL</em> CLUB.</>}
        sub="A Sunday-league club in London, founded in 2025 in memory of Susan Anne Martin. League Ten champions, unbeaten, in our very first season."
      />

      {/* Mission — quote with volt rule */}
      <section className="section section--compact">
        <div className="container">
          <div className="about-mission">
            <div className="about-mission__rule" aria-hidden="true" />
            <div className="t-eyebrow" style={{ color: 'var(--volt)' }}>OUR MISSION</div>
            <p className="about-mission__quote">
              <span>To build a football club that earns respect on the pitch</span>
              <span>and creates legacy off it.</span>
              <em>What we do in life echoes in eternity.</em>
            </p>
          </div>
        </div>
      </section>

      {/* By the numbers */}
      <section className="section section--compact">
        <div className="container">
          <header className="section__head section__head--compact">
            <div>
              <div className="t-eyebrow" style={{ color: 'var(--volt)' }}>SEASON IN NUMBERS</div>
              <h2 className="t-h2">25 / 26 BY THE COUNT</h2>
            </div>
      </header>
          <div className="about-numbers">
            {stats.map((s, i) => (
              <div key={i} className="about-num" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="about-num__rail" aria-hidden="true" />
                <div className="about-num__v">{s.v}</div>
                <div className="about-num__l">{s.l}</div>
                <div className="about-num__sub">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* On the field — club records (separated from the off-field founding story below).
          As new seasons are added these records auto-grow into all-time leaders. */}
      <section className="section section--compact about-records-section">
        <div className="container">
          <header className="section__head section__head--compact">
            <div>
              <div className="t-eyebrow" style={{ color: 'var(--volt)' }}>ON THE FIELD</div>
              <h2 className="t-h2">CLUB HISTORY</h2>
            </div>
      </header>

          {(() => {
            // Compute all-time records from every saved match entry. Today this
            // matches the 25/26 season; as future seasons are tagged onto
            // window.SEASON_RESULTS / SQUAD, the same query yields lifetime totals.
            const all = (window.derivedSquad ? window.derivedSquad() : []);
            const topGoals    = [...all].sort((a, b) => b.goals    - a.goals)[0];
            const topAssists  = [...all].sort((a, b) => b.assists  - a.assists)[0];
            const topApps     = [...all].sort((a, b) => b.apps     - a.apps)[0];
            const topCleans   = [...all].sort((a, b) => (b.cleanSheets || 0) - (a.cleanSheets || 0))[0];
            // Biggest win (margin) across all logged results.
            const biggestWin  = (window.SEASON_RESULTS || [])
              .filter((r) => r.kind === 'score')
              .map((r) => {
                const usHome = r.home.includes('Angels');
                const us = usHome ? r.hs : r.as;
                const them = usHome ? r.as : r.hs;
                return { r, margin: us - them, score: `${us}–${them}`, opp: (usHome ? r.away : r.home).replace(' FC', '') };
              })
              .filter((m) => m.margin > 0)
              .sort((a, b) => b.margin - a.margin)[0];
            // Trophies — manually curated; will grow.
            const trophies = ['LEAGUE TEN 25/26'];

            const records = [
              { eye: 'TROPHIES',         k: trophies.length,
                v: trophies[0],          sub: 'First and counting' },
              topGoals && topGoals.goals > 0 && {
                eye: 'TOP SCORER',       k: `${topGoals.goals}`,
                v: `${topGoals.first} ${topGoals.last}`, sub: 'All-time' },
              topAssists && topAssists.assists > 0 && {
                eye: 'MOST ASSISTS',     k: `${topAssists.assists}`,
                v: `${topAssists.first} ${topAssists.last}`, sub: 'All-time' },
              topApps && topApps.apps > 0 && {
                eye: 'MOST APPS',        k: `${topApps.apps}`,
                v: `${topApps.first} ${topApps.last}`, sub: 'Club appearances' },
              topCleans && topCleans.cleanSheets > 0 && {
                eye: 'CLEAN SHEETS',     k: `${topCleans.cleanSheets}`,
                v: `${topCleans.first} ${topCleans.last}`, sub: 'GK leader' },
              biggestWin && {
                eye: 'BIGGEST WIN',      k: biggestWin.score,
                v: `vs ${biggestWin.opp}`, sub: `+${biggestWin.margin} goals` },
            ].filter(Boolean);

            return (
              <div className="about-records">
                {records.map((r, i) => (
                  <article key={i} className="about-record" style={{ animationDelay: `${i * 70}ms` }}>
                    <div className="about-record__rail" aria-hidden="true" />
                    <span className="about-record__eye">{r.eye}</span>
                    <span className="about-record__k">{r.k}</span>
                    <span className="about-record__v">{r.v}</span>
                    <span className="about-record__sub">{r.sub}</span>
                  </article>
                ))}
              </div>
            );
          })()}

          <p className="about-records__note">
            <span>OFF THE FIELD — SUE&rsquo;S STORY, WHY WE PLAY.</span>
          </p>
        </div>
      </section>

      {/* Founding story — editorial two-col */}
      <section className="section section--compact about-story-section">
        <div className="container">
          <div className="about-story">
            <aside className="about-story__masthead">
              <div className="t-eyebrow" style={{ color: 'var(--volt)' }}>THE FOUNDING STORY · OFF THE FIELD</div>
              <h2 className="about-story__title">PLAYED IN<br/><em>HER NAME.</em></h2>
              <div className="about-story__rule" aria-hidden="true" />
              <div className="about-story__dedication">
                <span className="about-story__dedication-label">IN LOVING MEMORY OF</span>
                <strong>SUSAN ANNE MARTIN</strong>
                <span className="about-story__dedication-meta">FOUNDED 2025 · LONDON</span>
              </div>
            </aside>
            <div className="about-story__body">
              <p className="about-story__lede">
                Founded and led by <strong>Stephen Epathite</strong>, Sue&rsquo;s Angels FC was built on the values of football, friendship and togetherness &mdash; proudly honouring the life and memory of Susan Anne Martin.
              </p>
              <p>
                Following Sue&rsquo;s passing from sepsis in 2020, the club has taken part in a number of charity matches and community initiatives &mdash; raising awareness of the condition and supporting a cause close to the hearts of everyone connected to the team.
              </p>
              <blockquote className="about-story__pull">
                A football family bound by respect, resilience and camaraderie.
              </blockquote>
              <p>
                What began as a way of bringing people together through remembrance has grown into something deeply meaningful: a club with standards, a story, and the badge worn for something bigger than the result.
              </p>
              <p>
                As Sue&rsquo;s Angels FC continues its journey, the club looks ahead with pride and ambition &mdash; ready for the challenges of Sunday League football while carrying Sue&rsquo;s memory forward every step of the way.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Champions banner — clickable */}
      <section className="section section--compact section--alt">
        <div className="container">
          <a href="champions.html" className="about-champ about-champ--link">
            <div className="about-champ__badge">
              <img src="assets/badge/sue-angels-badge-cutout.png" alt="" />
            </div>
            <div className="about-champ__copy">
              <span className="t-eyebrow" style={{ color: 'var(--volt)' }}>INAUGURAL SEASON · UNBEATEN</span>
              <h2 className="about-champ__h">A PERFECT FIRST CAMPAIGN.</h2>
              <p>{statsLine}</p>
              <span className="btn btn--volt about-champ__cta">The full story →</span>
            </div>
          </a>
        </div>
      </section>

      {/* Club values — small interactive cards */}
      <section className="section section--compact">
        <div className="container">
          <header className="section__head section__head--compact">
            <div>
              <div className="t-eyebrow" style={{ color: 'var(--volt)' }}>WHAT WE STAND FOR</div>
              <h2 className="t-h2">CLUB VALUES</h2>
            </div>
      </header>
          <div className="values-grid">
            {values.map((v) => (
              <button
                key={v.n}
                type="button"
                className={`value-card ${openValue === v.n ? 'value-card--open' : ''}`}
                onClick={() => setOpenValue(openValue === v.n ? null : v.n)}
                aria-expanded={openValue === v.n}
              >
                <div className="value-card__rail" aria-hidden="true" />
                <div className="value-card__head">
                  <span className="value-card__num">{v.n}</span>
                  <span className="value-card__icon">{v.icon}</span>
                </div>
                <h3 className="value-card__title">{v.t}</h3>
                <p className="value-card__copy">{v.c}</p>
                <div className="value-card__detail">
                  <p>{v.detail}</p>
                </div>
                <span className="value-card__more">{openValue === v.n ? 'CLOSE −' : 'MORE +'}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* The journey — horizontal carousel */}
      <section className="section section--compact section--alt about-journey-section">
        <div className="container">
          <header className="section__head section__head--compact">
            <div>
              <div className="t-eyebrow" style={{ color: 'var(--volt)' }}>FROM DAY ONE</div>
              <h2 className="t-h2">THE JOURNEY</h2>
            </div>
            <span className="t-meta" style={{ color: 'var(--fg-3)' }}>INAUGURAL SEASON · 25/26</span>
          </header>
          <div className="about-tl">
            <button
              type="button"
              className="about-tl__nav about-tl__nav--prev"
              onClick={(e) => {
                const vp = e.currentTarget.parentElement.querySelector('.about-tl__viewport');
                if (vp && window.innerWidth >= 1024) { vp.scrollBy({ left: -336, behavior: 'smooth' }); return; }
                setPage((p) => (p <= 0 ? maxPage : p - 1));
              }}
              aria-label="Previous"
            >‹</button>
            <div className="about-tl__viewport">
              <div
                className="about-tl__track"
                style={{ transform: `translateX(calc(${-page} * ((100% + 12px) / ${timeline.length}) ))` }}
              >
                {timeline.map((e, i) => {
                  const isFuture = e.tag === 'NEXT';
                  const isChamp  = e.tag === 'CHAMPIONS' || e.tag === 'PERFECT';
                  return (
                    <article
                      key={i}
                      className={`about-tl__card ${isFuture ? 'is-future' : ''} ${isChamp ? 'is-champ' : ''}`}
                    >
                      <div className="about-tl__year">{e.y}</div>
                      <span className="about-tl__tag">{e.tag}</span>
                      <h4 className="about-tl__title">{e.t}</h4>
                      <p className="about-tl__copy">{e.c}</p>
                      <span className="about-tl__index">{String(i + 1).padStart(2, '0')}</span>
                    </article>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              className="about-tl__nav about-tl__nav--next"
              onClick={(e) => {
                const vp = e.currentTarget.parentElement.querySelector('.about-tl__viewport');
                if (vp && window.innerWidth >= 1024) { vp.scrollBy({ left: 336, behavior: 'smooth' }); return; }
                setPage((p) => (p >= maxPage ? 0 : p + 1));
              }}
              aria-label="Next"
            >›</button>
            <div className="about-tl__dots">
              {Array.from({ length: maxPage + 1 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`about-tl__dot ${i === page ? 'is-on' : ''}`}
                  onClick={() => setPage(i)}
                  aria-label={`Page ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="section section--compact about-close">
        <div className="container">
          <div className="about-close__inner">
            <div className="about-close__copy">
              <div className="t-eyebrow" style={{ color: 'var(--volt)' }}>26 / 27 STARTS SOON</div>
              <h2 className="about-close__title">CARRY THE BADGE FORWARD.</h2>
              <p className="about-close__sub">Trials, volunteering, media and sponsorship — all open. Step in.</p>
            </div>
            <div className="about-close__cta">
              <a href="join.html" className="btn btn--volt">Trial for the squad →</a>
              <a href="sponsors.html" className="btn btn--ghost">Partner with us</a>
            </div>
          </div>
        </div>
      </section>
    </React.Fragment>
  );
}

window.About = About;
