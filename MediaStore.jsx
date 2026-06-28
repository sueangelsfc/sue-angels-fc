// MediaStore.jsx, generic admin-uploaded image storage for Gallery + Sponsors.
// Photos are compressed to a configurable max-edge and stored as JPEG/PNG data
// URLs in localStorage. Each store has its own key prefix.

const MEDIA_MAX = 1200;
const MEDIA_Q   = 0.88;

// Re-use the player-photo compressor if available; otherwise build inline.
window.processImageFile = async function (file, maxEdge = MEDIA_MAX, quality = MEDIA_Q) {
  if (!file || !/^image\//.test(file.type)) throw new Error('Not an image');
  const dataUrl = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file);
  });
  const img = await new Promise((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl;
  });
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  // PNG for transparency-bearing images (logos), JPEG for photos.
  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  return canvas.toDataURL(type, quality);
};

// Generic keyed item store. Items: { id, src, caption?, category?, name?, role?, blurb? }
function makeStore(prefix) {
  const KEY = 'sa-media:' + prefix;
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } };
  const write = (items) => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); }
    catch (e) { alert('Storage full, try fewer/smaller images.'); }
    window.dispatchEvent(new CustomEvent('sa-media-changed', { detail: { prefix } }));
  };
  return {
    list: read,
    add: (item) => { const xs = read(); xs.unshift({ id: 'm' + Date.now() + Math.random().toString(36).slice(2, 6), ...item }); write(xs); },
    update: (id, patch) => { const xs = read().map((x) => x.id === id ? { ...x, ...patch } : x); write(xs); },
    remove: (id) => { write(read().filter((x) => x.id !== id)); },
    reorder: (id, dir) => {
      const xs = read(); const i = xs.findIndex((x) => x.id === id); if (i < 0) return;
      const j = i + (dir === 'up' ? -1 : 1); if (j < 0 || j >= xs.length) return;
      [xs[i], xs[j]] = [xs[j], xs[i]]; write(xs);
    },
  };
}

window.GalleryStore  = makeStore('gallery');
window.SponsorsStore = makeStore('sponsors');

// ── Cloud-backed gallery override ────────────────────────────────────────────
// When dataStore is present (cloud OR local), route the gallery through it so
// albums sync to every device via Supabase on the live site. Each album is its
// OWN row (keyed by id), like player photos, so uploads stay reliable and one
// album can't bloat a shared row. Cloud-write failures surface as an alert
// instead of silently rolling back, so problems are obvious.
if (typeof window !== 'undefined' && window.dataStore && window.dataStore.gallery) {
  const newId = () => 'm' + Date.now() + Math.random().toString(36).slice(2, 6);
  const ping = () => { try { window.dispatchEvent(new CustomEvent('sa-media-changed', { detail: { prefix: 'gallery' } })); } catch (e) {} };
  const handleErr = (e) => {
    console.error('[gallery] save failed', e);
    const msg = (e && e.message) || String(e);
    if (/payload|413|too large|size/i.test(msg)) {
      alert('Could not save, the album is too large. Try fewer or smaller photos per album.');
    } else if (/auth|jwt|permission|policy|row-level|401|403/i.test(msg)) {
      alert('Could not save, please sign in as admin again, then retry.');
    } else if (/relation|table|does not exist|404/i.test(msg)) {
      alert('Could not save, the gallery database table is missing. Run the updated schema.sql in Supabase.');
    } else {
      alert('Could not save the album: ' + msg);
    }
    ping();
  };

  window.GalleryStore = {
    list: () => (window.getGalleryAlbums ? window.getGalleryAlbums() : []),
    add: (item) => {
      const album = { id: newId(), sort: Date.now(), ...item };
      Promise.resolve(window.saveGalleryAlbum(album)).then(ping).catch(handleErr);
    },
    update: (id, patch) => {
      const cur = (window.getGalleryAlbums ? window.getGalleryAlbums() : []).find((a) => a.id === id);
      if (!cur) return;
      Promise.resolve(window.saveGalleryAlbum({ ...cur, ...patch })).then(ping).catch(handleErr);
    },
    remove: (id) => {
      Promise.resolve(window.deleteGalleryAlbum(id)).then(ping).catch(handleErr);
    },
    reorder: (id, dir) => {
      const xs = window.getGalleryAlbums ? window.getGalleryAlbums() : [];
      const i = xs.findIndex((x) => x.id === id); if (i < 0) return;
      const j = i + (dir === 'up' ? -1 : 1); if (j < 0 || j >= xs.length) return;
      // Swap sort values so order persists.
      const a = xs[i], b = xs[j];
      const as = a.sort || 0, bs = b.sort || 0;
      Promise.all([
        window.saveGalleryAlbum({ ...a, sort: bs }),
        window.saveGalleryAlbum({ ...b, sort: as }),
      ]).then(ping).catch(handleErr);
    },
  };

  // When the cloud sync completes (or another device writes), refresh the UI.
  if (window.subscribeGallery) window.subscribeGallery(ping);
}

// React hook, re-renders when a given store changes.
window.useMediaStore = function (store, prefix) {
  const [items, setItems] = React.useState(() => store.list());
  React.useEffect(() => {
    const h = (e) => { if (!e.detail || e.detail.prefix === prefix) setItems(store.list()); };
    window.addEventListener('sa-media-changed', h);
    return () => window.removeEventListener('sa-media-changed', h);
  }, []);
  return items;
};

// Generic admin upload pill, used by both Gallery + Sponsors admin slots.
window.MediaUploader = function ({ onPick, label = 'Upload image', accept = 'image/*' }) {
  const inputRef = React.useRef(null);
  const [busy, setBusy] = React.useState(false);
  const onChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBusy(true);
    try {
      for (const f of files) {
        const dataUrl = await window.processImageFile(f);
        onPick(dataUrl, f);
      }
    } catch (err) { alert('Could not load image: ' + err.message); }
    setBusy(false);
    e.target.value = '';
  };
  return (
    <React.Fragment>
      <input ref={inputRef} type="file" accept={accept} multiple onChange={onChange} style={{ display: 'none' }} />
      <button type="button" className="btn btn--volt btn--sm" disabled={busy} onClick={() => inputRef.current && inputRef.current.click()}>
        {busy ? 'Processing…' : label}
      </button>
    </React.Fragment>
  );
};
