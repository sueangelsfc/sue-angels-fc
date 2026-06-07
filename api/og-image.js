// api/og-image.js — exposes the player's photo / a post's cover as a real,
// fetchable image URL so it can be used as the Open Graph preview image.
//
// Player photos and article covers are stored as base64 data URLs in Supabase
// (great for the app, useless as an og:image because scrapers need a real URL).
// This function reads the stored data URL, decodes it and streams the bytes, so
// /api/og-image?player=9 (or ?article=ID) returns an actual JPEG/PNG.
//
// On anything missing or malformed it redirects to the branded club card, so
// the preview image always resolves to something valid.

const SUPA_URL = 'https://hvbquuvxcswylyguplfb.supabase.co';
const SUPA_KEY = 'sb_publishable_2VEdxWZCLW98qItINt6TPQ_r7y_Tcly';
const FALLBACK = '/assets/og-cover.jpg';

function getQuery(req) {
  if (req.query && Object.keys(req.query).length) return req.query;
  try { const u = new URL(req.url, 'http://x'); const o = {}; u.searchParams.forEach((v, k) => { o[k] = v; }); return o; }
  catch (e) { return {}; }
}

// Unwrap one or more layers of JSON-string quoting (matches the client helper).
function cleanDataUrl(v) {
  if (typeof v !== 'string') return null;
  let s = v;
  while (s.length > 1 && s[0] === '"' && s[s.length - 1] === '"') {
    try { s = JSON.parse(s); } catch (e) { s = s.slice(1, -1); }
  }
  return s || null;
}

async function supaGet(table, key) {
  try {
    const url = SUPA_URL + '/rest/v1/' + table + '?key=eq.' + encodeURIComponent(key) + '&select=key,data';
    const r = await fetch(url, { headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY } });
    if (!r.ok) return null;
    const rows = await r.json();
    return rows && rows[0] ? rows[0].data : null;
  } catch (e) { return null; }
}

async function resolveDataUrl(q) {
  // ---- Player photo (keyed by squad number in player_photos) ----
  if (q.player != null) {
    let num = q.player;
    // Allow a name-slug too: map it to a number via the custom roster if needed.
    if (!/^\d+$/.test(String(num))) {
      const custom = await supaGet('player_photos', 'roster:players');
      const slug = s => String(((s.first ? s.first + ' ' : '') + (s.last || '')).trim()).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const hit = Array.isArray(custom) ? custom.find(x => x && slug(x) === String(num).toLowerCase()) : null;
      num = hit ? hit.num : null;
      // base-roster slugs are resolved by api/share.js; here we only need the photo,
      // which for base players is also keyed by number — but we don't know it from a
      // base-roster slug without PageShell, so fall back if unresolved.
      if (num == null) return null;
    }
    return cleanDataUrl(await supaGet('player_photos', String(num)));
  }
  // ---- Coach photo (stored under coach:<id> as { photo, bio }) ----
  if (q.coach != null) {
    const data = await supaGet('player_photos', 'coach:' + String(q.coach));
    return data ? cleanDataUrl(data.photo) : null;
  }
  // ---- Article / post cover ----
  if (q.article != null) {
    const id = String(q.article);
    const override = cleanDataUrl(await supaGet('player_photos', 'cover:' + id));
    if (override) return override;
    const art = await supaGet('articles', id);
    return art ? cleanDataUrl(art.cover) : null;
  }
  return null;
}

export default async function handler(req, res) {
  let dataUrl = null;
  try { dataUrl = await resolveDataUrl(getQuery(req)); } catch (e) { dataUrl = null; }

  const m = dataUrl && /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!m) { res.setHeader('Location', FALLBACK); return res.status(302).end(); }

  const mime = m[1] || 'image/jpeg';
  try {
    const buf = m[2] ? Buffer.from(m[3], 'base64') : Buffer.from(decodeURIComponent(m[3]), 'utf8');
    if (!buf.length) { res.setHeader('Location', FALLBACK); return res.status(302).end(); }
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).send(buf);
  } catch (e) {
    res.setHeader('Location', FALLBACK);
    return res.status(302).end();
  }
}
