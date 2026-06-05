// GalleryAlbums.jsx — album support for the photo gallery.
// An album is a single gallery post holding many photos with a chosen cover:
//   { id, title, caption, cover (dataUrl), photos: [dataUrl, …], date }
// Back-compat: legacy single-photo items have { src } and no photos[] —
// galleryCover()/galleryPhotos() normalise both shapes so old uploads still show.

// ── Normalisers ──────────────────────────────────────────────────────────────
window.galleryCover = function (item) {
  if (!item) return null;
  if (item.cover) return item.cover;
  if (Array.isArray(item.photos) && item.photos.length) return item.photos[0];
  return item.src || null;
};
window.galleryPhotos = function (item) {
  if (!item) return [];
  if (Array.isArray(item.photos) && item.photos.length) return item.photos;
  return item.src ? [item.src] : [];
};
window.galleryCount = function (item) {
  return window.galleryPhotos(item).length;
};

// ── Cloud image upload ───────────────────────────────────────────────────────
// Uploads a (compressed) image to the Supabase Storage 'gallery' bucket and
// returns its permanent public URL. In local/preview mode (no Supabase) it just
// returns the data URL so the design preview still works.
window.uploadGalleryImage = async function (dataUrl, path) {
  const store = window.SupabaseStore;
  if (!store) return dataUrl; // local preview — keep inline
  const client = await store.client();
  const blob = await (await fetch(dataUrl)).blob();
  const { error } = await client.storage.from('gallery').upload(path, blob, {
    upsert: true,
    contentType: blob.type || 'image/jpeg',
    cacheControl: '3600',
  });
  if (error) throw error;
  const { data } = client.storage.from('gallery').getPublicUrl(path);
  if (!data || !data.publicUrl) throw new Error('Could not get public URL');
  return data.publicUrl;
};

// ── Admin album composer ─────────────────────────────────────────────────────
// Collects a batch of photos, lets the admin set a title + cover, then publishes
// the whole set as ONE gallery post.
window.AlbumComposer = function ({ onPublished }) {
  const [open, setOpen]   = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [photos, setPhotos] = React.useState([]); // [dataUrl]
  const [category, setCategory] = React.useState('');
  const [homeBadge, setHomeBadge] = React.useState('');
  const [awayBadge, setAwayBadge] = React.useState('');
  const [photographer, setPhotographer] = React.useState('');
  const [addingCat, setAddingCat] = React.useState(false);
  const [coverIdx, setCoverIdx] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState('');

  const reset = () => { setTitle(''); setPhotos([]); setCategory(''); setAddingCat(false); setHomeBadge(''); setAwayBadge(''); setPhotographer(''); setCoverIdx(0); setProgress(''); };

  const addPhoto = (dataUrl) => setPhotos((xs) => [...xs, dataUrl]);
  const removePhoto = (i) => setPhotos((xs) => {
    const next = xs.filter((_, k) => k !== i);
    setCoverIdx((c) => (i === c ? 0 : i < c ? c - 1 : c));
    return next;
  });

  const publish = async () => {
    if (!photos.length) { alert('Add at least one photo first.'); return; }
    setBusy(true);
    try {
      const albumId = 'al' + Date.now() + Math.random().toString(36).slice(2, 6);
      // Upload every photo to cloud storage, collecting permanent URLs.
      const urls = [];
      for (let i = 0; i < photos.length; i++) {
        setProgress(`Uploading ${i + 1} of ${photos.length}…`);
        const url = await window.uploadGalleryImage(photos[i], `${albumId}/${i}-${Date.now()}.jpg`);
        urls.push(url);
      }
      setProgress('Saving album…');
      window.GalleryStore.add({
        title: title.trim() || 'Matchday album',
        caption: title.trim() || 'Matchday album',
        cover: coverIdx >= 0 ? (urls[coverIdx] || '') : '',
        photos: urls,
        src: urls[coverIdx] || urls[0], // keeps homepage mosaic working
        category: category.trim(),
        homeBadge: homeBadge,
        awayBadge: awayBadge,
        photographer: photographer.trim(),
        photoTags: [],
        tags: [],
        date: new Date().toISOString(),
      });
      reset(); setOpen(false);
      if (onPublished) onPublished();
    } catch (err) {
      console.error('[gallery] publish failed', err);
      const msg = (err && err.message) || String(err);
      if (/bucket|not found|404/i.test(msg)) {
        alert('Upload failed — the gallery storage bucket is missing. Run the storage SQL in Supabase (I gave you the script).');
      } else if (/auth|jwt|permission|policy|row-level|401|403|unauthorized/i.test(msg)) {
        alert('Upload failed — please sign in as admin again, then retry.');
      } else {
        alert('Upload failed: ' + msg);
      }
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  if (!open) {
    return (
      <button type="button" className="btn btn--volt btn--sm" onClick={() => setOpen(true)}>
        + New album
      </button>
    );
  }

  return (
    <div className="album-composer">
      <div className="album-composer__head">
        <strong>New photo album</strong>
        <button type="button" className="album-composer__x" onClick={() => { reset(); setOpen(false); }} aria-label="Close">×</button>
      </div>

      <label className="album-composer__field">
        <span>Album title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sue's Angels 10–1 Catania · Matchday" />
      </label>

      <label className="album-composer__field">
        <span>Category (becomes a gallery tab)</span>
        <select value={addingCat ? '__new' : category} onChange={(e) => { if (e.target.value === '__new') { setAddingCat(true); setCategory(''); } else { setAddingCat(false); setCategory(e.target.value); } }}>
          <option value="">Select category…</option>
          {(window.getGalleryCats ? window.getGalleryCats() : []).map((c) => <option key={c} value={c}>{c}</option>)}
          <option value="__new">+ Add new category…</option>
        </select>
      </label>
      {addingCat ? (
        <label className="album-composer__field">
          <span>New category name</span>
          <input value={category} onChange={(e) => setCategory(e.target.value)} onBlur={() => { if (category.trim() && window.addGalleryCat) window.addGalleryCat(category.trim()); }} placeholder="e.g. Training — saved as a future option" autoFocus />
        </label>
      ) : null}
      {category.trim().toLowerCase() === 'matchday' ? (
        <div className="album-composer__field" style={{ display: 'grid', gap: 8 }}>
          <datalist id="cms-clubs">{(window.KNOWN_CLUBS || []).map((n) => <option key={n} value={n} />)}</datalist>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {homeBadge ? <img src={homeBadge} alt="" style={{ width: 30, height: 30, objectFit: 'contain' }} /> : null}
            <input list="cms-clubs" placeholder="Home club name" onChange={(e) => { var rb = window.resolveBadge ? window.resolveBadge(e.target.value) : null; if (rb && rb.src) setHomeBadge(rb.src); }} style={{ minWidth: 150 }} />
            {window.MediaUploader ? <window.MediaUploader label={homeBadge ? 'Home \u2713' : 'or upload'} onPick={(d) => window.removeBadgeBg(d).then(setHomeBadge)} /> : null}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {awayBadge ? <img src={awayBadge} alt="" style={{ width: 30, height: 30, objectFit: 'contain' }} /> : null}
            <input list="cms-clubs" placeholder="Away club name" onChange={(e) => { var rb = window.resolveBadge ? window.resolveBadge(e.target.value) : null; if (rb && rb.src) setAwayBadge(rb.src); }} style={{ minWidth: 150 }} />
            {window.MediaUploader ? <window.MediaUploader label={awayBadge ? 'Away \u2713' : 'or upload'} onPick={(d) => window.removeBadgeBg(d).then(setAwayBadge)} /> : null}
          </div>
          <input value={photographer} onChange={(e) => setPhotographer(e.target.value)} placeholder="Photos by..." style={{ minWidth: 150 }} />
        </div>
      ) : null}

      <div className="album-composer__field">
        <span>Photos <em>({photos.length})</em> — tap one to set the cover · untap it to use the auto cover</span>
        {photos.length > 0 && (
          <div className="album-thumbs">
            {photos.map((p, i) => (
              <div
                key={i}
                className={`album-thumb ${i === coverIdx ? 'is-cover' : ''}`}
                onClick={() => setCoverIdx((c) => c === i ? -1 : i)}
              >
                <img src={p} alt={`Photo ${i + 1}`} />
                {i === coverIdx && <span className="album-thumb__badge">COVER</span>}
                <button
                  type="button"
                  className="album-thumb__rm"
                  onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                  aria-label="Remove photo"
                >×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="t-meta" style={{ color: 'var(--fg-3)', marginTop: 2 }}>After publishing, open the album in the list below to tag players &amp; coaching staff in each individual photo.</p>

      <div className="album-composer__actions">
        <window.MediaUploader label={photos.length ? '+ Add more photos' : '+ Add photos'} onPick={addPhoto} />
        <button type="button" className="btn btn--volt btn--sm" onClick={publish} disabled={!photos.length || busy}>
          {busy ? (progress || 'Publishing…') : 'Publish album'}
        </button>
      </div>
      <span className="t-meta" style={{ color: 'var(--fg-3)' }}>
        Select multiple files at once, or add in batches. The cover is what shows in the gallery grid. Photos upload to the cloud and show on every device.
      </span>
    </div>
  );
};

// ── Album viewer (public) ────────────────────────────────────────────────────
// Opening an album shows its photos as a uniform-size horizontal slider you can
// swipe through. Tapping any photo enlarges it to a full-screen viewer with
// keyboard + swipe navigation.
window.AlbumLightbox = function ({ album, onClose }) {
  const photos = window.galleryPhotos(album);
  const [zoom, setZoom] = React.useState(null); // index being enlarged, or null
  const railRef = React.useRef(null);

  React.useEffect(() => {
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') { if (zoom !== null) setZoom(null); else onClose(); return; }
      if (zoom !== null) {
        if (e.key === 'ArrowRight') setZoom((i) => (i + 1) % photos.length);
        if (e.key === 'ArrowLeft')  setZoom((i) => (i - 1 + photos.length) % photos.length);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [zoom, photos.length, onClose]);

  if (!album || !photos.length) return null;

  const scrollRail = (dir) => {
    const rail = railRef.current; if (!rail) return;
    const cell = rail.querySelector('.rd-album__cell');
    const step = cell ? cell.getBoundingClientRect().width + 16 : rail.clientWidth * 0.85;
    rail.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  const title = album.title || 'Matchday album';
  const many = photos.length > 1;

  return (
    <div className="rd-album" onClick={onClose}>
      <div className="rd-album__panel" onClick={(e) => e.stopPropagation()}>
        <div className="rd-album__head">
          <div className="rd-album__heading">
            <p className="rd-eyebrow">Album</p>
            <h3 className="rd-album__title">{title}</h3>
          </div>
          <div className="rd-album__headr">
            <span className="rd-album__count">{photos.length} photo{many ? 's' : ''}</span>
            <button className="rd-album__x" onClick={onClose} aria-label="Close album">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <div className="rd-album__carousel">
          {many && <button className="rd-album__nav rd-album__nav--prev" onClick={() => scrollRail(-1)} aria-label="Scroll left">‹</button>}
          <div className="rd-album__rail" ref={railRef}>
            {photos.map((p, i) => {
              const tg = (album.photoTags && album.photoTags[i]) || [];
              return (
              <div className="rd-album__cellwrap" key={i}>
              <button className="rd-album__cell" onClick={() => setZoom(i)} aria-label={`Enlarge photo ${i + 1}`}>
                <img src={p} alt={`${title} — photo ${i + 1}`} loading="lazy" />
                <span className="rd-album__cellzoom" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M11 8v6M8 11h6"/></svg>
                </span>
                <span className="rd-album__cellno">{i + 1}</span>
              </button>
              {tg.length ? (
                <div className="rd-album__celltags">
                  {tg.map((name, j) => {
                    const pl = (window.SQUAD || []).find((s) => `${s.first} ${s.last}` === name);
                    return pl
                      ? <a key={j} className="rd-album__tagchip" href={`teams.html?player=${pl.num}`}>{name}</a>
                      : <span key={j} className="rd-album__tagchip rd-album__tagchip--coach">{name}</span>;
                  })}
                </div>
              ) : null}
              </div>
              );
            })}
          </div>
          {many && <button className="rd-album__nav rd-album__nav--next" onClick={() => scrollRail(1)} aria-label="Scroll right">›</button>}
        </div>

        <div className="rd-album__foot">
          {album.tags && album.tags.length
            ? <div className="rd-album__tags">{album.tags.map((t) => <span key={t} className="rd-chip">{t}</span>)}</div>
            : <span />}
          <span className="rd-album__hint">{many ? 'Swipe to browse · tap a photo to enlarge' : 'Tap the photo to enlarge'}</span>
        </div>
      </div>

      {zoom !== null ? (
        <div className="rd-zoom" onClick={(e) => { e.stopPropagation(); setZoom(null); }}>
          <button className="rd-album__x rd-zoom__x" onClick={(e) => { e.stopPropagation(); setZoom(null); }} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          {many && <button className="rd-zoom__nav rd-zoom__nav--prev" onClick={(e) => { e.stopPropagation(); setZoom((i) => (i - 1 + photos.length) % photos.length); }} aria-label="Previous">‹</button>}
          <img className="rd-zoom__img" src={photos[zoom]} alt={`${title} — photo ${zoom + 1}`} onClick={(e) => e.stopPropagation()} />
          {many && <button className="rd-zoom__nav rd-zoom__nav--next" onClick={(e) => { e.stopPropagation(); setZoom((i) => (i + 1) % photos.length); }} aria-label="Next">›</button>}
          <span className="rd-zoom__count">{zoom + 1} / {photos.length}</span>
          {album.photoTags && (album.photoTags[zoom] || []).length ? (
            <div className="rd-zoom__tags" onClick={(e) => e.stopPropagation()}>{(album.photoTags[zoom] || []).map((t) => <span key={t} className="rd-chip">{t}</span>)}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
