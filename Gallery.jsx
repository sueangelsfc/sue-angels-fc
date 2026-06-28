// Gallery.jsx, homepage matchday preview. Renders as an editorial photo mosaic
// (1 hero + 4 satellites). Admins can upload; visitors see styled placeholders
// until the season's first photo set lands.
function Gallery() {
  const items = window.useMediaStore ? window.useMediaStore(window.GalleryStore, 'gallery') : [];
  const admin = window.useAdmin ? window.useAdmin() : false;
  const [lightbox, setLightbox] = React.useState(null); // album being viewed

  // Five editorial placeholder cells with mood gradients + caption blocks.
  // Each cell sits in a fixed grid slot so the mosaic stays cinematic with or
  // without uploaded content.
  const placeholders = [
    { mood: 'a', cap: 'MATCHDAY',       sub: 'EVERY SUNDAY · LONDON' },
    { mood: 'b', cap: 'KICKOFF',        sub: 'FROM THE FIRST WHISTLE' },
    { mood: 'c', cap: 'CHAMPIONS',      sub: 'GOAL · CELEBRATION' },
    { mood: 'd', cap: 'THE BADGE',      sub: 'WORN WITH PRIDE' },
    { mood: 'e', cap: 'FULL TIME',      sub: 'PHOTOS LIVE WHEN SHOT' },
  ];

  // Take up to 5 uploaded shots for the mosaic. Rest go to the full gallery page.
  const mosaic = items.slice(0, 5);
  const hasPhotos = mosaic.length > 0;
  const cells = hasPhotos
    ? // Pad with placeholders so the mosaic always has 5 cells.
      mosaic.concat(placeholders.slice(mosaic.length))
    : placeholders;

  // Stable per-cell roles (hero / a-d) tied to grid slots.
  const slotClass = (i) => i === 0 ? 'g-shot--hero' : `g-shot--s${i}`;

  return (
    <section id="gallery" className="section section--compact g-section">
      <div className="container">
        <header className="section__head section__head--compact">
          <div>
            <div className="t-eyebrow" style={{ color: 'var(--volt)' }}>FROM THE PITCH</div>
            <h2 className="t-h2">MATCHDAY GALLERY</h2>
          </div>
          <a href="media.html?tab=gallery" className="section__more">Full gallery <span aria-hidden="true">→</span></a>
        </header>

        {admin && window.AdminSlot && (
          <window.AdminSlot title="ADD TO GALLERY">
            {window.AlbumComposer && <window.AlbumComposer />}
            <span className="t-meta" style={{ color: 'var(--fg-3)' }}>
              {items.length} post{items.length === 1 ? '' : 's'} in the gallery. Each album can hold many photos with a chosen cover.
            </span>
          </window.AdminSlot>
        )}

        <div className="g-mosaic">
          {cells.map((it, i) => {
            const cover = window.galleryCover ? window.galleryCover(it) : it.src;
            const isPhoto = !!cover;
            const count = window.galleryCount ? window.galleryCount(it) : (it.src ? 1 : 0);
            return (
              <figure
                key={it.id || `ph-${i}`}
                className={`g-shot ${slotClass(i)} g-shot--${it.mood || 'a'} ${isPhoto ? 'g-shot--clickable' : ''}`}
                onClick={isPhoto ? () => setLightbox(it) : undefined}
              >
                {isPhoto && <img src={cover} alt={it.caption || it.title || ''} className="g-shot__img" />}
                {isPhoto && count > 1 && (
                  <span className="g-shot__album" aria-hidden="true">
                    <svg viewBox="0 0 20 20" width="13" height="13" fill="none"><rect x="6" y="6" width="11" height="11" rx="2" fill="currentColor"/><rect x="3" y="3" width="11" height="11" rx="2" fill="currentColor" opacity="0.55"/></svg>
                    {count}
                  </span>
                )}
                {!isPhoto && (
                  <div className="g-shot__pattern" aria-hidden="true">
                    <span className="g-shot__index">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                )}
                <div className="g-shot__protect" />
                <figcaption className="g-shot__cap">
                  <span className="g-shot__num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="g-shot__cap-main">
                    <span className="g-shot__title">{isPhoto ? (it.caption || 'GALLERY SHOT') : it.cap}</span>
                    <span className="g-shot__sub">{isPhoto ? 'MATCHDAY ARCHIVE' : it.sub}</span>
                  </span>
                </figcaption>
                {isPhoto && admin && (
                  <div className="g-shot__admin" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      className="shot__cap-input"
                      placeholder="Title"
                      defaultValue={it.caption || it.title || ''}
                      onBlur={(e) => window.GalleryStore.update(it.id, { caption: e.target.value, title: e.target.value })}
                    />
                    <button type="button" className="shot__rm" onClick={() => window.GalleryStore.remove(it.id)} aria-label="Remove">×</button>
                  </div>
                )}
              </figure>
            );
          })}
        </div>

        {!hasPhotos && (
          <div className="g-empty">
            <span>NO PHOTOS YET. DROP THE SEASON’S BEST SHOTS HERE, KIT, GOALS, CELEBRATIONS.</span>
            <a href="join.html" className="btn btn--ghost btn--sm">Join the media team →</a>
          </div>
        )}
      </div>
      {lightbox && window.AlbumLightbox && (
        <window.AlbumLightbox album={lightbox} onClose={() => setLightbox(null)} />
      )}
    </section>
  );
}

window.Gallery = Gallery;
