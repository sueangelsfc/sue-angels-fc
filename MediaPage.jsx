// MediaPage.jsx, combined News + Gallery page.
// Two internal tabs: News / Gallery.
function MediaPage() {
  const tabFromQuery = (() => {
    try { return new URL(window.location.href).searchParams.get('tab'); } catch (e) { return null; }
  })();
  const valid = ['news', 'gallery'];
  const [tab, setTab] = React.useState(valid.includes(tabFromQuery) ? tabFromQuery : 'news');

  React.useEffect(() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url);
    } catch (e) {}
  }, [tab]);

  const heroSub = tab === 'news'
    ? 'Match reports, club announcements and sponsor features.'
    : 'Matchday photography, training, and behind-the-scenes from across the season.';

  return (
    <React.Fragment>
      <PageHero
        eyebrow="CLUB MEDIA"
        title={<>THE <em>MEDIA HUB</em></>}
        sub={heroSub}
      />
      <div className="container" style={{ marginTop: 'var(--sp-4)' }}>
        <div className="tabs tabs--lg">
          <button className={`tabs__btn ${tab === 'news'    ? 'is-active' : ''}`} onClick={() => setTab('news')}>Latest News</button>
          <button className={`tabs__btn ${tab === 'gallery' ? 'is-active' : ''}`} onClick={() => setTab('gallery')}>Photo Gallery</button>
        </div>
      </div>
      {tab === 'news' && window.News && <News />}
      {tab === 'gallery' && window.Gallery && (
        <section className="section section--compact">
          <div className="container">
            <Gallery />
          </div>
        </section>
      )}
    </React.Fragment>
  );
}

window.MediaPage = MediaPage;
