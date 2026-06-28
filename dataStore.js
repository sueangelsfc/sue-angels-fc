// dataStore.js - unified read/write abstraction for all admin data.
//
// Provides 4 stores (each with the same shape):
//
//   • dataStore.matches      - coach-entered match data (per fixture)
//   • dataStore.fixtures     - admin-added fixtures
//   • dataStore.teamBadges   - uploaded opposition badges
//   • dataStore.playerPhotos - uploaded player headshots
//
// Each store exposes:
//   await get(key)             → object | null
//   await getAll()             → object map { key: value }
//   await set(key, value)      → void
//   await remove(key)          → void
//   subscribe(handler)         → returns unsubscribe fn
//
// AUTO-DETECT MODE
// ────────────────
// • If window.SA_DATA_MODE === 'cloud' (Supabase config provided) → reads &
//   writes go to Supabase, with a local cache for instant page loads. Writes
//   are fire-and-forget against cloud + immediate local cache update.
// • If window.SA_DATA_MODE === 'local' (no config) → pure localStorage. Site
//   keeps working exactly as it does today.
//
// CACHE STRATEGY (cloud mode)
// ────────────────────────────
// On first load, fetch all rows from each cloud table into the local cache.
// All synchronous reads (`getCached(key)`) return from cache - instant. Async
// writes update the cache optimistically AND post to cloud. If the cloud write
// fails, the cache is rolled back and an error event is dispatched.

(function () {
  const MODE = (typeof window !== 'undefined' && window.SA_DATA_MODE) || 'local';

  // ─── localStorage helpers ──────────────────────────────────────────────
  function lsGet(key) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  }
  function lsSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }
  function lsRemove(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }
  function lsAllByPrefix(prefix) {
    const out = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k.startsWith(prefix)) continue;
        out[k.slice(prefix.length)] = lsGet(k);
      }
    } catch (e) {}
    return out;
  }

  // ─── Local-only store factory ───────────────────────────────────────────
  function makeLocalStore({ prefix, eventName }) {
    const listeners = new Set();
    function fire() {
      listeners.forEach((fn) => { try { fn(); } catch (e) {} });
      try { window.dispatchEvent(new CustomEvent(eventName)); } catch (e) {}
    }
    return {
      mode: 'local',
      getCached: (key) => lsGet(prefix + key),
      get: async (key) => lsGet(prefix + key),
      getAll: async () => lsAllByPrefix(prefix),
      getAllCached: () => lsAllByPrefix(prefix),
      set: async (key, value) => { lsSet(prefix + key, value); fire(); },
      remove: async (key) => { lsRemove(prefix + key); fire(); },
      subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    };
  }

  // ─── Cloud store factory ────────────────────────────────────────────────
  // Backs to a single Supabase table with shape: ( key text primary key, data jsonb,
  // updated_at timestamptz default now() ).
  function makeCloudStore({ table, prefix, eventName, lazy }) {
    const cache = lsAllByPrefix(prefix); // hydrate from prior session
    const listeners = new Set();
    let initial = null; // promise that fires once the first cloud sync completes
    function fire() {
      listeners.forEach((fn) => { try { fn(); } catch (e) {} });
      try { window.dispatchEvent(new CustomEvent(eventName)); } catch (e) {}
    }
    async function hydrateOnce() {
      if (initial) return initial;
      initial = (async () => {
        try {
          const client = await window.SupabaseStore.client();
          const { data, error } = await client.from(table).select('key, data');
          if (error) throw error;
          // Cloud is the source of truth: prune any locally-cached rows that no
          // longer exist in the cloud. Without this, an item deleted on one
          // device keeps showing on every other device that had cached it
          // (and "comes back to life" on reload). Only runs after a SUCCESSFUL
          // fetch - on network failure we fall through to the catch and keep
          // the local cache as an offline fallback.
          const cloudKeys = new Set(data.map((r) => r.key));
          for (const k of Object.keys(cache)) {
            if (!cloudKeys.has(k)) { delete cache[k]; lsRemove(prefix + k); }
          }
          for (const row of data) {
            cache[row.key] = row.data;
            lsSet(prefix + row.key, row.data);
          }
          fire();
        } catch (e) {
          console.warn(`[${table}] cloud sync failed; using local cache`, e);
        }
      })();
      return initial;
    }
    // Kick off the initial cloud sync. Heavy stores (player_photos is ~1 MB of
    // base64 headshots) hydrate lazily after first paint so the download does not
    // compete with the critical render. Repeat visitors already have it cached in
    // localStorage, so nothing visibly changes for them.
    if (lazy) {
      var _go = function () { hydrateOnce(); };
      var _sched = function () { (typeof requestIdleCallback === 'function') ? requestIdleCallback(_go, { timeout: 3000 }) : setTimeout(_go, 1200); };
      if (typeof document !== 'undefined' && document.readyState === 'complete') _sched();
      else if (typeof window !== 'undefined') window.addEventListener('load', _sched, { once: true });
      else _sched();
    } else {
      hydrateOnce();
    }

    return {
      mode: 'cloud',
      // Synchronous reads from cache - used by render paths that can't await.
      getCached: (key) => cache[key] || null,
      getAllCached: () => ({ ...cache }),
      // Async reads - fetch direct from cloud, refresh cache.
      get: async (key) => {
        await hydrateOnce();
        return cache[key] || null;
      },
      getAll: async () => {
        await hydrateOnce();
        return { ...cache };
      },
      // Async writes - optimistic local update, then push to cloud.
      set: async (key, value) => {
        const prev = cache[key];
        cache[key] = value;
        lsSet(prefix + key, value);
        fire();
        try {
          const client = await window.SupabaseStore.client();
          const { error } = await client.from(table).upsert({
            key, data: value, updated_at: new Date().toISOString(),
          }, { onConflict: 'key' });
          if (error) throw error;
        } catch (e) {
          // Roll back on cloud failure.
          if (prev === undefined) { delete cache[key]; lsRemove(prefix + key); }
          else { cache[key] = prev; lsSet(prefix + key, prev); }
          fire();
          throw e;
        }
      },
      remove: async (key) => {
        const prev = cache[key];
        delete cache[key];
        lsRemove(prefix + key);
        fire();
        try {
          const client = await window.SupabaseStore.client();
          const { error } = await client.from(table).delete().eq('key', key);
          if (error) throw error;
        } catch (e) {
          if (prev !== undefined) { cache[key] = prev; lsSet(prefix + key, prev); }
          fire();
          throw e;
        }
      },
      subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    };
  }

  function makeStore(name, prefix, eventName, opts) {
    opts = opts || {};
    return MODE === 'cloud'
      ? makeCloudStore({ table: name, prefix, eventName, lazy: opts.lazy })
      : makeLocalStore({ prefix, eventName });
  }

  window.dataStore = {
    mode: MODE,
    matches:      makeStore('matches',       'sa-match:',         'sa-match-changed'),
    fixtures:     makeStore('fixtures',      'sa-fixture:',       'sa-fixtures-changed'),
    teamBadges:   makeStore('team_badges',   'sa-team-badge:',    'sa-team-badges-changed'),
    playerPhotos: makeStore('player_photos', 'sa-player-photo:',  'sa-photo-changed', { lazy: true }),
    articles:     makeStore('articles',      'sa-article:',       'sa-articles-changed'),
    gallery:      makeStore('gallery',       'sa-gallery:',       'sa-gallery-changed'),
    recognition:  makeStore('recognition',   'sa-recognition:',   'sa-recognition-changed'),
  };

  // ─── Backwards-compat shims ─────────────────────────────────────────────
  // The existing callers expect the old localStorage-keyed shape. These thin
  // adapters bridge to the new dataStore so we don't have to edit every call
  // site at once.

  // MATCHES - used by MatchEntry.jsx via window.loadMatchEntry / saveMatchEntry.
  window.loadMatchEntry = (id) => window.dataStore.matches.getCached(id);
  window.saveMatchEntry = async (id, data) => {
    return window.dataStore.matches.set(id, { ...data, savedAt: new Date().toISOString() });
  };
  window.clearMatchEntry = (id) => window.dataStore.matches.remove(id);
  window.getAllMatchEntries = () => Object.entries(window.dataStore.matches.getAllCached())
    .map(([key, data]) => ({ id: key, data }));

  // FIXTURES - used by FixtureEntry.jsx. The old format stored a single
  // localStorage row containing an array. We keep that exact shape in the
  // cloud (one row keyed 'all' with an array as value).
  window.getAdminFixtures = () => {
    const v = window.dataStore.fixtures.getCached('all');
    return Array.isArray(v) ? v : [];
  };
  window.saveAdminFixtures = (list) => window.dataStore.fixtures.set('all', list || []);

  // SUPPORTERS - public newsletter / matchday-update sign-up. The email is saved
  // two places: (1) the private `supporters` table in Supabase (the club's own
  // copy / backup; RLS allows anon INSERT only, no read), and (2) pushed to the
  // MailerLite list via /api/subscribe so the newsletter can be sent/automated
  // there. Succeeds if EITHER captured the email. Returns { ok, duplicate?, reason? }.
  window.saAddSupporter = async (email, name, source) => {
    const cfg = (typeof window !== 'undefined' && window.SUPABASE_CONFIG) || {};
    email = String(email || '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, reason: 'email' };

    let supaOk = false, duplicate = false;
    // 1) Own copy in Supabase (source of truth / backup).
    if (cfg.url && cfg.anonKey) {
      try {
        const res = await fetch(cfg.url.replace(/\/+$/, '') + '/rest/v1/supporters', {
          method: 'POST',
          headers: {
            apikey: cfg.anonKey,
            Authorization: 'Bearer ' + cfg.anonKey,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            email,
            name: (String(name || '').trim() || null),
            source: source || 'site',
            consent: true,
          }),
        });
        if (res.status === 201 || res.status === 204) supaOk = true;
        else if (res.status === 409) { supaOk = true; duplicate = true; } // already signed up
      } catch (e) { /* network — fall through to MailerLite */ }
    }

    // 2) Push to the email platform (MailerLite) for sending + automation.
    let mlOk = false;
    try {
      const r = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: String(name || '').trim() }),
      });
      if (r.ok) { const j = await r.json().catch(() => ({})); mlOk = !!(j && j.ok); if (j && j.duplicate) duplicate = true; }
    } catch (e) { /* function missing / offline — Supabase copy still stands */ }

    if (supaOk || mlOk) return { ok: true, duplicate };
    return { ok: false, reason: 'failed' };
  };

  // ENQUIRIES - contact / sponsorship / trial / volunteer form submissions.
  // Captured to the private `enquiries` table (anon INSERT only, admin READ),
  // so no lead is lost to the visitor's email app. Unlike supporters there is
  // no unique constraint - one person may send several enquiries. You read /
  // export them from Supabase -> Table editor -> enquiries. Returns { ok }.
  // keepalive:true so the POST completes even if the page navigates away.
  window.saAddEnquiry = async (payload) => {
    const cfg = (typeof window !== 'undefined' && window.SUPABASE_CONFIG) || {};
    payload = payload || {};
    const email = String(payload.email || '').trim();
    const message = String(payload.message || '').trim();
    if (!email && !message) return { ok: false, reason: 'empty' };
    if (!cfg.url || !cfg.anonKey) return { ok: false, reason: 'noconfig' };
    try {
      const res = await fetch(cfg.url.replace(/\/+$/, '') + '/rest/v1/enquiries', {
        method: 'POST',
        keepalive: true,
        headers: {
          apikey: cfg.anonKey,
          Authorization: 'Bearer ' + cfg.anonKey,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          type: (String(payload.type || '').trim() || null),
          name: (String(payload.name || '').trim() || null),
          email: (email || null),
          phone: (String(payload.phone || '').trim() || null),
          message: (message || null),
          source: (String(payload.source || 'site').trim()),
        }),
      });
      if (res.status === 201 || res.status === 204) return { ok: true };
      return { ok: false, reason: 'status_' + res.status };
    } catch (e) { return { ok: false, reason: 'network' }; }
  };

  // TEAM BADGES - used by FixtureEntry.jsx. Old format: single row containing
  // an object keyed by club name. Mirror that.
  window.getTeamBadges = () => {
    const v = window.dataStore.teamBadges.getCached('all');
    return v && typeof v === 'object' ? v : {};
  };
  window.saveTeamBadges = (obj) => window.dataStore.teamBadges.set('all', obj || {});

  // PLAYER PHOTOS - used by PlayerPhotos.jsx. One key per squad number.
  window.getPlayerPhoto = (num) => window.dataStore.playerPhotos.getCached(String(num));
  window.setPlayerPhoto = (num, dataUrl) => window.dataStore.playerPhotos.set(String(num), dataUrl);
  window.clearPlayerPhoto = (num) => window.dataStore.playerPhotos.remove(String(num));

  // COACH OVERRIDES - admin-editable photo + bio per coach, stored in the
  // player-photo store under a 'coach:<id>' key (value is { photo, bio }), so
  // no extra Supabase table is needed. Falls back to the hardcoded COACHES data.
  window.getCoachData = (id) => window.dataStore.playerPhotos.getCached('coach:' + id) || {};
  window.setCoachData = (id, data) => window.dataStore.playerPhotos.set('coach:' + id, data || {});
  // ARTICLE COVER OVERRIDES - admin can replace any article/post cover image.
  window.getArticleCover = (id) => window.dataStore.playerPhotos.getCached('cover:' + id) || null;
  window.setArticleCover = (id, dataUrl) => window.dataStore.playerPhotos.set('cover:' + id, dataUrl || '');

  // CUSTOM ROSTER - admin-added players + coaches, stored as arrays in the
  // player-photo store (no extra table). applyCustomRoster merges them into the
  // live window.SQUAD / window.COACHES arrays (deduped) so they appear everywhere.
  window.getCustomPlayers = () => { const v = window.dataStore.playerPhotos.getCached('roster:players'); return Array.isArray(v) ? v : []; };
  window.saveCustomPlayers = (arr) => window.dataStore.playerPhotos.set('roster:players', arr || []);
  window.getCustomCoaches = () => { const v = window.dataStore.playerPhotos.getCached('roster:coaches'); return Array.isArray(v) ? v : []; };
  window.saveCustomCoaches = (arr) => window.dataStore.playerPhotos.set('roster:coaches', arr || []);
  // PLAYER STATUS - move a squad member to 'retired' or 'departed' (still viewable,
  // just not in the active First-team lists). Keyed by squad number. 'active' clears it.
  window.getPlayerStatus = () => window.dataStore.playerPhotos.getCached('roster:status') || {};
  window.setPlayerStatus = (num, status) => { const m = Object.assign({}, window.getPlayerStatus()); if (status && status !== 'active') m[num] = status; else delete m[num]; return window.dataStore.playerPhotos.set('roster:status', m); };
  // PLAYER SPONSORS - admin-set company name shown as "Sponsored by X" on a player's
  // profile. Keyed by squad number. Empty string clears it. (Sponsor-a-player product.)
  window.getPlayerSponsors = () => window.dataStore.playerPhotos.getCached('roster:sponsor') || {};
  window.getPlayerSponsor = (num) => (window.getPlayerSponsors()[num] || '');
  window.setPlayerSponsor = (num, company) => { const m = Object.assign({}, window.getPlayerSponsors()); const c = (company || '').trim(); if (c) m[num] = c; else delete m[num]; return window.dataStore.playerPhotos.set('roster:sponsor', m); };
  // MATCH-REPORT SPONSOR - one season-wide company name shown as a "brought to you by"
  // ribbon on every match report. Stored as a single string. (Match-report sponsor product.)
  window.getReportSponsor = () => window.dataStore.playerPhotos.getCached('sponsor:matchreport') || '';
  window.setReportSponsor = (company) => window.dataStore.playerPhotos.set('sponsor:matchreport', (company || '').trim());
  // SEASON ROSTER - players confirmed (by the admin) to be part of the 26/27
  // squad. Stored as an array of squad numbers under 'roster:s2627'.
  window.getSeason2627 = () => { const v = window.dataStore.playerPhotos.getCached('roster:s2627'); return Array.isArray(v) ? v : []; };
  window.isConfirmed2627 = (num) => window.getSeason2627().indexOf(num) >= 0;
  window.setConfirmed2627 = (num, on) => { const cur = window.getSeason2627().filter((n) => n !== num); if (on) cur.push(num); return window.dataStore.playerPhotos.set('roster:s2627', cur); };
  // DONATIONS - admin-set Stripe Payment Link (club) + sepsis charity URL.
  window.getDonateConfig = () => { const v = window.dataStore.playerPhotos.getCached('donate:config'); return (v && typeof v === 'object') ? v : {}; };
  window.setDonateConfig = (cfg) => window.dataStore.playerPhotos.set('donate:config', cfg || {});
  // HERO BANNER - admin-managed rotating homepage photos (array of data URLs).
  // Empty = use the bundled default banner-01..12 photos.
  window.getHeroImages = () => { const v = window.dataStore.playerPhotos.getCached('hero:images'); return Array.isArray(v) ? v : []; };
  window.setHeroImages = (arr) => window.dataStore.playerPhotos.set('hero:images', arr || []);
  // GALLERY CATEGORIES - a persisted list so new categories become future options.
  window.getGalleryCats = () => { const v = window.dataStore.playerPhotos.getCached('gallery:cats'); return (Array.isArray(v) && v.length) ? v : ['Matchday', 'Training', 'Celebration', 'Behind the scenes']; };
  window.addGalleryCat = (name) => { const cur = window.getGalleryCats(); if (name && cur.indexOf(name) < 0) return window.dataStore.playerPhotos.set('gallery:cats', cur.concat([name])); };
  // POST COVERS - auto-generated badge/scorecard covers per Media post.
  // A reusable badge library (id/name/img) + a per-post cover spec.
  window.getCoverBadges = () => { const v = window.dataStore.playerPhotos.getCached('cover:badges'); return Array.isArray(v) ? v : []; };
  window.saveCoverBadges = (arr) => window.dataStore.playerPhotos.set('cover:badges', arr || []);
  window.getPostCover = (id) => window.dataStore.playerPhotos.getCached('cover:gen:' + id) || null;
  window.setPostCover = (id, spec) => window.dataStore.playerPhotos.set('cover:gen:' + id, spec || null);
  // Badge background remover - keys out a solid (opaque) background colour sampled
  // from the image corners, returning a transparent PNG. Skips images that already
  // have transparent corners so existing cut-out badges are left untouched.
  window.removeBadgeBg = function (dataUrl, tol) {
    return new Promise(function (resolve) {
      try {
        var img = new Image();
        img.onload = function () {
          try {
            var c = document.createElement('canvas'); c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height;
            if (!c.width || !c.height) { resolve(dataUrl); return; }
            var x = c.getContext('2d'); x.drawImage(img, 0, 0);
            var d = x.getImageData(0, 0, c.width, c.height), p = d.data, w = c.width, h = c.height;
            var corners = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]];
            var r = 0, g = 0, b = 0, a = 0;
            corners.forEach(function (cc) { var o = (cc[1] * w + cc[0]) * 4; r += p[o]; g += p[o + 1]; b += p[o + 2]; a += p[o + 3]; });
            r /= 4; g /= 4; b /= 4; a /= 4;
            if (a < 200) { resolve(dataUrl); return; } // already has transparency
            var t = tol || 42;
            for (var k = 0; k < p.length; k += 4) {
              var dr = p[k] - r, dg = p[k + 1] - g, db = p[k + 2] - b;
              if (Math.sqrt(dr * dr + dg * dg + db * db) < t) p[k + 3] = 0;
            }
            x.putImageData(d, 0, 0);
            resolve(c.toDataURL('image/png'));
          } catch (e) { resolve(dataUrl); }
        };
        img.onerror = function () { resolve(dataUrl); };
        img.src = dataUrl;
      } catch (e) { resolve(dataUrl); }
    });
  };
  // Built-in videos shipped in code, so they show without an admin/cloud entry.
  // (Away game → home badge = opponent, away badge = Sue's Angels.)
  window.DEFAULT_VIDEOS = [{
    id: 'vid-william-clark-hillside-251012',
    title: 'William Clark vs Hillside Elite FC Blues',
    url: 'https://www.suesangelsfc.co.uk/assets/videos/william-clark-vs-hillside-elite.mp4',
    category: 'Match Highlights',
    homeBadge: 'assets/badge/hillside-elite.webp',
    awayBadge: 'assets/badge/sue-angels-shield.webp'
  }];
  window.getClubVideos = () => {
    const cloud = window.dataStore.playerPhotos.getCached('media:videos');
    const arr = Array.isArray(cloud) ? cloud.slice() : [];
    const ids = new Set(arr.map((v) => v && v.id));
    for (const v of (window.DEFAULT_VIDEOS || [])) if (v && v.id && !ids.has(v.id)) arr.push(v);
    return arr;
  };
  window.saveClubVideos = (arr) => window.dataStore.playerPhotos.set('media:videos', arr || []);
  // Video sub-sections — the backend files each video under one of these, and the
  // public Media → Videos tab shows a sub-tab per section that has clips. Add/rename
  // freely here (one list, used by both the site and the admin).
  window.VIDEO_CATEGORIES = ['Match Highlights', 'Match Gallery', 'Interviews', 'Behind the Scenes'];
  window.applyCustomRoster = () => {
    if (Array.isArray(window.SQUAD)) {
      const have = new Set(window.SQUAD.map((p) => p.num));
      for (const p of window.getCustomPlayers()) if (p && p.num != null && !have.has(p.num)) { window.SQUAD.push(p); have.add(p.num); }
    }
    if (Array.isArray(window.COACHES)) {
      const have = new Set(window.COACHES.map((c) => c.id));
      for (const c of window.getCustomCoaches()) if (c && c.id && !have.has(c.id)) { window.COACHES.push(c); have.add(c.id); }
    }
  };

  // LEAGUE OVERRIDES - admin-editable FA-sourced league table / results / scorers,
  // stored in the player-photo KV store (no extra table needed). When present they
  // REPLACE the code defaults in PageShell, so the League section can be updated for
  // a new season from the importer (league-admin.html) without a code change. This
  // is the FA division data only - separate from the club's own match entries.
  window.getLeagueOverride = (k) => window.dataStore.playerPhotos.getCached('league:' + k);
  window.setLeagueOverride = (k, v) => window.dataStore.playerPhotos.set('league:' + k, v);
  window.clearLeagueOverride = (k) => window.dataStore.playerPhotos.remove('league:' + k);
  window.applyLeagueOverrides = () => {
    try {
      const t = window.getLeagueOverride('table'); if (Array.isArray(t) && t.length) window.RAW_TABLE = t;
      const r = window.getLeagueOverride('results'); if (Array.isArray(r) && r.length) window.LEAGUE_RESULTS = r;
      const s = window.getLeagueOverride('scorers'); if (s && (Array.isArray(s.all) || Array.isArray(s.league))) window.LEAGUE_STATS = s;
    } catch (e) {}
  };

  // PLAYER GALLERY - extra photos per player (beyond the main headshot), stored
  // as an array under 'pg:<num>'. Shown on the player dashboard.
  window.getPlayerGallery = (num) => { const v = window.dataStore.playerPhotos.getCached('pg:' + num); return Array.isArray(v) ? v : []; };
  window.addPlayerPhoto = (num, dataUrl) => window.dataStore.playerPhotos.set('pg:' + num, [...window.getPlayerGallery(num), dataUrl]);
  window.removePlayerPhotoAt = (num, i) => window.dataStore.playerPhotos.set('pg:' + num, window.getPlayerGallery(num).filter((_, k) => k !== i));

  // CUSTOM NEWS ARTICLES - admin-written posts (News.jsx composer). Each stored
  // under its own key; value is { id, cat, title, lede, date, sortISO, cover }.
  window.getCustomArticles = () => {
    // Built-in defaults (window.SA_DEFAULT_ARTICLES, defined in PageShell.js) merged
    // with admin-entered articles; a stored row with the same id overrides the default.
    const byId = {};
    (window.SA_DEFAULT_ARTICLES || []).forEach((a) => { if (a && a.id) byId[a.id] = a; });
    Object.values(window.dataStore.articles.getAllCached() || {}).forEach((a) => { if (a && a.id) byId[a.id] = a; });
    return Object.values(byId);
  };
  window.saveCustomArticle = (article) => window.dataStore.articles.set(article.id, article);
  window.deleteCustomArticle = (id) => window.dataStore.articles.remove(id);

  // GALLERY ALBUMS - admin photo albums (Gallery.jsx). Each album is its OWN row
  // (keyed by album id) - exactly like player photos / articles - so no single
  // row gets huge and uploads stay reliable. Album shape:
  //   { id, title, caption, cover, photos:[dataUrl…], src, sort, date }
  window.getGalleryAlbums = () => {
    const map = window.dataStore.gallery.getAllCached() || {};
    return Object.values(map)
      .filter((a) => a && a.id)
      .sort((a, b) => (b.sort || 0) - (a.sort || 0));
  };
  window.saveGalleryAlbum = (album) => window.dataStore.gallery.set(album.id, album);
  window.deleteGalleryAlbum = (id) => window.dataStore.gallery.remove(id);
  window.subscribeGallery = (fn) => window.dataStore.gallery.subscribe(fn);

  // RECOGNITION - one row per award / milestone / club record / leadership note,
  // keyed by id; value carries a `type` field. Stored (admin-entered) rows are
  // merged with built-in defaults in PageShell.js (getRecognition / getClubRecords
  // / getPlayerRecognition), where the live stats live. Types:
  //   potm | season_award | match_award | milestone | club_record | leadership
  window.getRecognitionStored = () =>
    Object.values(window.dataStore.recognition.getAllCached() || {}).filter((r) => r && r.id);
  window.saveRecognition = (rec) => window.dataStore.recognition.set(rec.id, rec);
  window.deleteRecognition = (id) => window.dataStore.recognition.remove(id);
  window.subscribeRecognition = (fn) => window.dataStore.recognition.subscribe(fn);

  console.info(`[dataStore] ready in ${MODE} mode`);
})();
