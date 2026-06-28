// GalleryPage.jsx, visual storytelling hub
function GalleryPage() {
  const [filter, setFilter] = React.useState('all');
  const tiles = [
    { c: 'matchday', m: 'a', label: 'MATCHDAY' },
    { c: 'players',  m: 'b', label: 'PLAYERS' },
    { c: 'matchday', m: 'c', label: 'CELEBRATION', tall: true },
    { c: 'trophies', m: 'd', label: 'TROPHY' },
    { c: 'matchday', m: 'e', label: 'KIT' },
    { c: 'behind',   m: 'a', label: 'BTS', tall: true },
    { c: 'players',  m: 'b', label: 'PORTRAITS' },
    { c: 'matchday', m: 'd', label: 'PRE-MATCH' },
    { c: 'community',m: 'c', label: 'COMMUNITY' },
    { c: 'behind',   m: 'e', label: 'TRAINING' },
    { c: 'matchday', m: 'a', label: 'GOAL' },
    { c: 'community',m: 'b', label: 'FANS' },
  ];
  const filtered = tiles.filter((t) => filter === 'all' || t.c === filter);
  return (
    <React.Fragment>
      <PageHero
        eyebrow="THE VISUAL ARCHIVE"
        title={<>GAL<em>LERY</em></>}
        sub="Matchday photography. Player graphics. Behind the scenes. Posters. Real photography drops here as the season unfolds."
      />

      <div className="container">
        <div className="filters">
          {[['all','All'],['matchday','Matchday'],['players','Players'],['trophies','Trophies'],['community','Community'],['behind','Behind the scenes']].map(([k, l]) => (
            <button key={k} className={`chip ${filter === k ? 'chip--volt' : ''}`} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
      </div>

      <section className="section" style={{ paddingTop: 'var(--sp-5)' }}>
        <div className="container">
          <div className="gallery-grid">
            {filtered.map((t, i) => (
              <div key={i} className={`gallery-tile gallery-tile--${t.m} ${t.tall ? 'gallery-tile--tall' : ''}`}>
                <span className="gallery-tile__chip">{t.label}</span>
                <span className="gallery-tile__no">PHOTO · TBA</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </React.Fragment>
  );
}

window.GalleryPage = GalleryPage;
