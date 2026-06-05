// PlayerPhotos.jsx — per-player photo storage + getter helper.
// Photos are stored as data URLs in localStorage under sa-player-photo:<num>.
// Compressed to ~360px wide, ~90% jpeg quality to keep storage tight.

const PHOTO_KEY = (num) => 'sa-player-photo:' + num;
const PHOTO_MAX = 480;
const PHOTO_QUALITY = 0.88;

// Strip stray wrapping quotes that legacy/JSON-encoded cache values may carry,
// so the data URL is always clean before it's used as an <img src>.
function cleanDataUrl(v) {
  if (typeof v !== 'string') return v || null;
  let s = v;
  // Unwrap one or more layers of JSON-string quoting (e.g. "\"data:...\"").
  while (s.length > 1 && s[0] === '"' && s[s.length - 1] === '"') {
    try { s = JSON.parse(s); } catch (e) { s = s.slice(1, -1); }
  }
  return s || null;
}

// Photo storage delegates to the cloud-aware dataStore when present (so photos
// sync via Supabase on the live site). Falls back to raw localStorage only when
// dataStore isn't loaded (pure design-preview mode).
window.getPlayerPhoto = function (num) {
  try {
    if (window.dataStore && window.dataStore.playerPhotos) {
      return cleanDataUrl(window.dataStore.playerPhotos.getCached(String(num)));
    }
    return cleanDataUrl(localStorage.getItem(PHOTO_KEY(num)));
  } catch (e) { return null; }
};
window.setPlayerPhoto = function (num, dataUrl) {
  try {
    if (window.dataStore && window.dataStore.playerPhotos) {
      window.dataStore.playerPhotos.set(String(num), dataUrl);
    } else {
      localStorage.setItem(PHOTO_KEY(num), dataUrl);
    }
    window.dispatchEvent(new CustomEvent('sa-photo-changed', { detail: { num } }));
  } catch (e) {}
};
window.clearPlayerPhoto = function (num) {
  try {
    if (window.dataStore && window.dataStore.playerPhotos) {
      window.dataStore.playerPhotos.remove(String(num));
    } else {
      localStorage.removeItem(PHOTO_KEY(num));
    }
    window.dispatchEvent(new CustomEvent('sa-photo-changed', { detail: { num } }));
  } catch (e) {}
};

// Compress + downscale an image file before storing.
window.processPlayerPhotoFile = function (file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) return reject(new Error('Not an image'));
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, PHOTO_MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        try {
          resolve(canvas.toDataURL('image/jpeg', PHOTO_QUALITY));
        } catch (e) { reject(e); }
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// React hook — re-renders when this player's photo changes anywhere on the page.
window.usePlayerPhoto = function (num) {
  const [src, setSrc] = React.useState(() => window.getPlayerPhoto(num));
  React.useEffect(() => {
    const onChange = (e) => {
      if (!e.detail || e.detail.num === num) setSrc(window.getPlayerPhoto(num));
    };
    window.addEventListener('sa-photo-changed', onChange);
    return () => window.removeEventListener('sa-photo-changed', onChange);
  }, [num]);
  return src;
};

// PhotoUploader — small "Edit photo" pill + hidden file input.
function PhotoUploader({ playerNum, compact = false }) {
  const inputRef = React.useRef(null);
  const photo = window.usePlayerPhoto(playerNum);
  const onPick = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      const dataUrl = await window.processPlayerPhotoFile(f);
      window.setPlayerPhoto(playerNum, dataUrl);
    } catch (err) {
      alert('Could not load that image. Please try another.');
    }
    e.target.value = '';
  };
  const onClear = () => {
    if (!window.confirm('Remove this player’s photo?')) return;
    window.clearPlayerPhoto(playerNum);
  };
  return (
    <div className={`pup ${compact ? 'pup--compact' : ''}`}>
      <input ref={inputRef} type="file" accept="image/*" onChange={onPick} style={{ display: 'none' }} />
      <button type="button" className="pup__btn" onClick={() => inputRef.current && inputRef.current.click()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14.7 6.3a1 1 0 0 1 0-1.4l1.4-1.4a1 1 0 0 1 1.4 0l2.6 2.6a1 1 0 0 1 0 1.4l-1.4 1.4a1 1 0 0 1-1.4 0Z"/>
          <path d="M14 8 4 18v3h3L17 11"/>
        </svg>
        <span>{photo ? 'Change photo' : 'Upload photo'}</span>
      </button>
      {photo && (
        <button type="button" className="pup__btn pup__btn--danger" onClick={onClear}>Remove</button>
      )}
    </div>
  );
}

window.PhotoUploader = PhotoUploader;
