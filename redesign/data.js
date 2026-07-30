/* ============================================================================
   data.js — the redesign's data layer.

   This is a faithful port of the live site's supabase.js + dataStore.js into
   the redesign's stack: no React, no Babel, no build step. It is deliberately
   NOT a new backend. It talks to the SAME Supabase project, the SAME tables,
   under the SAME row keys and fires the SAME change events, so:

     • the redesign reads the rows the current CMS already wrote — no migration,
       no export/import, no second copy of the club's data to keep in sync;
     • the old site and the redesign can run side by side during the rebuild
       and neither can corrupt the other;
     • when the redesign becomes the site, the data is already there.

   Load order on a page:
       <script src="../supabase-config.js"></script>   <!-- credentials -->
       <script src="data.js"></script>                 <!-- this file -->
       <script src="main.js"></script>

   supabase-config.js is shared with the live site ON PURPOSE. Credentials
   duplicated into a second file is exactly the kind of drift that has bitten
   this project before (see PageShell.js vs PageShell.jsx).

   ── SHAPE ──────────────────────────────────────────────────────────────────
   Seven key/value tables, each ( key text primary key, data jsonb,
   updated_at timestamptz ). One generic store factory serves all seven; the
   domain accessors at the bottom are thin named wrappers over them.

   ── MODE ───────────────────────────────────────────────────────────────────
   'cloud' when supabase-config.js carries a url + anon key, otherwise 'local'
   (pure localStorage). Local mode is not a degraded state — it is how the
   site behaves in a preview with no credentials, and nothing throws.
   ========================================================================= */

(function () {
  'use strict';

  var CFG = (typeof window !== 'undefined' && window.SUPABASE_CONFIG) || {};
  var MODE = (CFG.url && CFG.anonKey) ? 'cloud' : 'local';
  window.SA_DATA_MODE = MODE;

  /* Bundled assets live at the repo root but these pages live in /redesign/,
     so every hardcoded 'assets/…' path needs a hop up. Computed rather than
     hardcoded so the same file keeps working if the pages are ever promoted
     to the root. */
  window.SA_ASSET_BASE = /\/redesign\//.test(location.pathname) ? '../' : '';
  function asset(p) {
    return (!p || /^(https?:|data:|\/)/.test(p)) ? p : window.SA_ASSET_BASE + p;
  }
  window.saAsset = asset;

  /* ══════════════════════════════════════════════════════════════════════
     1 · SUPABASE CLIENT
     The SDK is a ~40kb ES module pulled from a pinned CDN build. It is
     imported lazily but kicked off immediately, so the first write does not
     also pay the import latency.
     ══════════════════════════════════════════════════════════════════════ */

  var SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
  var _client = null;
  var _clientReady = null;

  function client() {
    if (_client) return Promise.resolve(_client);
    if (_clientReady) return _clientReady;
    _clientReady = import(SDK).then(function (mod) {
      _client = mod.createClient(CFG.url, CFG.anonKey, {
        auth: { persistSession: true, detectSessionInUrl: true, autoRefreshToken: true }
      });
      return _client;
    });
    return _clientReady;
  }

  if (MODE === 'cloud') {
    client().catch(function (e) { console.error('[supabase] SDK load failed', e); });
  } else {
    console.info('[supabase] not configured — running in local (browser-only) mode.');
  }

  window.SupabaseStore = MODE === 'cloud'
    ? { mode: 'cloud', config: CFG, client: client }
    : null;

  /* ══════════════════════════════════════════════════════════════════════
     2 · AUTH
     The live site exposes this as a React hook (useSupabaseAuth). The
     redesign has no React, so it is re-expressed as a plain observable
     object: read `user`/`isAdmin` synchronously once `ready` resolves, or
     subscribe to changes.

     Admin is decided by matching the signed-in email against the one in
     supabase-config.js. That is the gate for the CMS; the database's own
     RLS policies are the actual security boundary.
     ══════════════════════════════════════════════════════════════════════ */

  var _user = null;
  var _authListeners = new Set();

  function fireAuth() {
    _authListeners.forEach(function (fn) { try { fn(_user); } catch (e) {} });
    try { window.dispatchEvent(new CustomEvent('sa-auth-changed', { detail: { user: _user } })); } catch (e) {}
  }

  var authReady = MODE !== 'cloud'
    ? Promise.resolve(null)
    : client().then(function (c) {
        return c.auth.getSession().then(function (r) {
          _user = (r && r.data && r.data.session) ? r.data.session.user : null;
          c.auth.onAuthStateChange(function (_evt, session) {
            _user = session ? session.user : null;
            fireAuth();
          });
          return _user;
        });
      }).catch(function () { return null; });

  window.SA_AUTH = {
    ready: authReady,
    user: function () { return _user; },
    isAdmin: function () {
      return !!(_user && CFG.adminEmail && _user.email &&
        _user.email.toLowerCase() === String(CFG.adminEmail).toLowerCase());
    },
    signIn: function (email, password) {
      return client().then(function (c) {
        return c.auth.signInWithPassword({ email: email, password: password });
      }).then(function (r) {
        if (r.error) throw r.error;
        return r.data;
      });
    },
    signOut: function () {
      return client().then(function (c) { return c.auth.signOut(); });
    },
    onChange: function (fn) {
      _authListeners.add(fn);
      return function () { _authListeners.delete(fn); };
    }
  };

  /* ══════════════════════════════════════════════════════════════════════
     3 · LOCALSTORAGE HELPERS
     Every access is wrapped: localStorage throws in private-mode Safari and
     when the quota is full, and a throw here would take the whole page down.
     ══════════════════════════════════════════════════════════════════════ */

  function lsGet(key) {
    try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  }
  function lsSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }
  function lsRemove(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }
  function lsAllByPrefix(prefix) {
    var out = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || k.indexOf(prefix) !== 0) continue;
        out[k.slice(prefix.length)] = lsGet(k);
      }
    } catch (e) {}
    return out;
  }

  /* ══════════════════════════════════════════════════════════════════════
     4 · STORE FACTORIES
     ══════════════════════════════════════════════════════════════════════ */

  function makeLocalStore(opts) {
    var prefix = opts.prefix, eventName = opts.eventName;
    var listeners = new Set();
    function fire() {
      listeners.forEach(function (fn) { try { fn(); } catch (e) {} });
      try { window.dispatchEvent(new CustomEvent(eventName)); } catch (e) {}
    }
    return {
      mode: 'local',
      getCached: function (key) { return lsGet(prefix + key); },
      getAllCached: function () { return lsAllByPrefix(prefix); },
      get: function (key) { return Promise.resolve(lsGet(prefix + key)); },
      getAll: function () { return Promise.resolve(lsAllByPrefix(prefix)); },
      ready: function () { return Promise.resolve(); },
      set: function (key, value) { lsSet(prefix + key, value); fire(); return Promise.resolve(); },
      remove: function (key) { lsRemove(prefix + key); fire(); return Promise.resolve(); },
      subscribe: function (fn) { listeners.add(fn); return function () { listeners.delete(fn); }; }
    };
  }

  /* Cloud store. Reads are served synchronously from a localStorage-backed
     cache so render paths never await; the cloud sync then refreshes it and
     fires the change event, which is what re-renders the page.

     Writes are optimistic: cache first, event fired, then the upsert. If the
     upsert fails the cache is rolled back and the error rethrown, so the UI
     can surface a genuine failure instead of silently pretending it saved. */
  function makeCloudStore(opts) {
    var table = opts.table, prefix = opts.prefix, eventName = opts.eventName, lazy = opts.lazy;
    var cache = lsAllByPrefix(prefix);   /* hydrate from the previous session */
    var listeners = new Set();
    var initial = null;

    function fire() {
      listeners.forEach(function (fn) { try { fn(); } catch (e) {} });
      try { window.dispatchEvent(new CustomEvent(eventName)); } catch (e) {}
    }

    function hydrateOnce() {
      if (initial) return initial;
      initial = client()
        .then(function (c) { return c.from(table).select('key, data'); })
        .then(function (r) {
          if (r.error) throw r.error;
          var rows = r.data || [];
          /* The cloud is the source of truth, so prune cached rows that no
             longer exist there. Without this an item deleted on one device
             keeps rendering on every device that had cached it, and appears
             to "come back to life" on reload. Only runs after a SUCCESSFUL
             fetch — a network failure falls to the catch and keeps the cache
             as an offline copy. */
          var live = new Set(rows.map(function (row) { return row.key; }));
          Object.keys(cache).forEach(function (k) {
            if (!live.has(k)) { delete cache[k]; lsRemove(prefix + k); }
          });
          rows.forEach(function (row) {
            cache[row.key] = row.data;
            lsSet(prefix + row.key, row.data);
          });
          fire();
        })
        .catch(function (e) {
          console.warn('[' + table + '] cloud sync failed; using local cache', e);
        });
      return initial;
    }

    /* player_photos is ~1 MB of base64 headshots. Downloading that in the
       critical path costs first paint on every page, and repeat visitors
       already hold it in localStorage, so it waits for idle. */
    if (lazy) {
      var go = function () { hydrateOnce(); };
      var sched = function () {
        (typeof requestIdleCallback === 'function')
          ? requestIdleCallback(go, { timeout: 3000 })
          : setTimeout(go, 1200);
      };
      if (document.readyState === 'complete') sched();
      else window.addEventListener('load', sched, { once: true });
    } else {
      hydrateOnce();
    }

    return {
      mode: 'cloud',
      getCached: function (key) { return cache[key] || null; },
      getAllCached: function () { return Object.assign({}, cache); },
      ready: hydrateOnce,
      get: function (key) {
        return hydrateOnce().then(function () { return cache[key] || null; });
      },
      getAll: function () {
        return hydrateOnce().then(function () { return Object.assign({}, cache); });
      },
      set: function (key, value) {
        var had = Object.prototype.hasOwnProperty.call(cache, key);
        var prev = cache[key];
        cache[key] = value;
        lsSet(prefix + key, value);
        fire();
        return client()
          .then(function (c) {
            return c.from(table).upsert(
              { key: key, data: value, updated_at: new Date().toISOString() },
              { onConflict: 'key' }
            );
          })
          .then(function (r) { if (r.error) throw r.error; })
          .catch(function (e) {
            if (!had) { delete cache[key]; lsRemove(prefix + key); }
            else { cache[key] = prev; lsSet(prefix + key, prev); }
            fire();
            throw e;
          });
      },
      remove: function (key) {
        var had = Object.prototype.hasOwnProperty.call(cache, key);
        var prev = cache[key];
        delete cache[key];
        lsRemove(prefix + key);
        fire();
        return client()
          .then(function (c) { return c.from(table).delete().eq('key', key); })
          .then(function (r) { if (r.error) throw r.error; })
          .catch(function (e) {
            if (had) { cache[key] = prev; lsSet(prefix + key, prev); }
            fire();
            throw e;
          });
      },
      subscribe: function (fn) { listeners.add(fn); return function () { listeners.delete(fn); }; }
    };
  }

  function makeStore(table, prefix, eventName, opts) {
    opts = opts || {};
    return MODE === 'cloud'
      ? makeCloudStore({ table: table, prefix: prefix, eventName: eventName, lazy: opts.lazy })
      : makeLocalStore({ prefix: prefix, eventName: eventName });
  }

  /* The seven tables. Table names, key prefixes and event names are IDENTICAL
     to the live site's — that identity is what lets both read the same rows
     and what lets a page listen for one event name regardless of which app
     wrote the row. Do not rename any of these. */
  window.dataStore = {
    mode:         MODE,
    matches:      makeStore('matches',       'sa-match:',        'sa-match-changed'),
    fixtures:     makeStore('fixtures',      'sa-fixture:',      'sa-fixtures-changed'),
    teamBadges:   makeStore('team_badges',   'sa-team-badge:',   'sa-team-badges-changed'),
    playerPhotos: makeStore('player_photos', 'sa-player-photo:', 'sa-photo-changed', { lazy: true }),
    articles:     makeStore('articles',      'sa-article:',      'sa-articles-changed'),
    gallery:      makeStore('gallery',       'sa-gallery:',      'sa-gallery-changed'),
    recognition:  makeStore('recognition',   'sa-recognition:',  'sa-recognition-changed')
  };

  var PP = window.dataStore.playerPhotos;   /* the catch-all KV store, see below */

  /* ══════════════════════════════════════════════════════════════════════
     5 · DOMAIN ACCESSORS

     A note on why so much lives in `player_photos`: it started as headshots
     and became the club's general key/value bucket (coach bios, roster
     overrides, league imports, video list, donation config…) under namespaced
     key prefixes. It is not elegant, but it is what the live rows use, and
     re-homing them would mean a data migration for zero user-visible gain.
     Ported as-is, deliberately.
     ══════════════════════════════════════════════════════════════════════ */

  /* ── Matches (one row per fixture, written by the match-entry screen) ── */
  window.loadMatchEntry    = function (id) { return window.dataStore.matches.getCached(id); };
  window.saveMatchEntry    = function (id, data) {
    return window.dataStore.matches.set(id, Object.assign({}, data, { savedAt: new Date().toISOString() }));
  };
  window.clearMatchEntry   = function (id) { return window.dataStore.matches.remove(id); };
  window.getAllMatchEntries = function () {
    var all = window.dataStore.matches.getAllCached();
    return Object.keys(all).map(function (k) { return { id: k, data: all[k] }; });
  };

  /* ── Fixtures (single row keyed 'all' holding the array) ── */
  window.getAdminFixtures  = function () {
    var v = window.dataStore.fixtures.getCached('all');
    return Array.isArray(v) ? v : [];
  };
  window.saveAdminFixtures = function (list) { return window.dataStore.fixtures.set('all', list || []); };

  /* ── Opposition badges (single row keyed 'all', an object by club name) ── */
  window.getTeamBadges  = function () {
    var v = window.dataStore.teamBadges.getCached('all');
    return (v && typeof v === 'object') ? v : {};
  };
  window.saveTeamBadges = function (obj) { return window.dataStore.teamBadges.set('all', obj || {}); };

  /* ── Player headshots (one row per squad number) ── */
  window.getPlayerPhoto   = function (num) { return PP.getCached(String(num)); };
  window.setPlayerPhoto   = function (num, dataUrl) { return PP.set(String(num), dataUrl); };
  window.clearPlayerPhoto = function (num) { return PP.remove(String(num)); };

  /* ── Extra per-player photos beyond the headshot ── */
  window.getPlayerGallery   = function (num) { var v = PP.getCached('pg:' + num); return Array.isArray(v) ? v : []; };
  window.addPlayerPhoto     = function (num, dataUrl) {
    return PP.set('pg:' + num, window.getPlayerGallery(num).concat([dataUrl]));
  };
  window.removePlayerPhotoAt = function (num, i) {
    return PP.set('pg:' + num, window.getPlayerGallery(num).filter(function (_, k) { return k !== i; }));
  };

  /* ── Coach photo + bio overrides, keyed by coach id ── */
  window.getCoachData = function (id) { return PP.getCached('coach:' + id) || {}; };
  window.setCoachData = function (id, data) { return PP.set('coach:' + id, data || {}); };

  /* ── Article / post cover overrides ── */
  window.getArticleCover = function (id) { return PP.getCached('cover:' + id) || null; };
  window.setArticleCover = function (id, dataUrl) { return PP.set('cover:' + id, dataUrl || ''); };

  /* ── Roster additions merged into the code-defined squad + staff ── */
  window.getCustomPlayers  = function () { var v = PP.getCached('roster:players'); return Array.isArray(v) ? v : []; };
  window.saveCustomPlayers = function (arr) { return PP.set('roster:players', arr || []); };
  window.getCustomCoaches  = function () { var v = PP.getCached('roster:coaches'); return Array.isArray(v) ? v : []; };
  window.saveCustomCoaches = function (arr) { return PP.set('roster:coaches', arr || []); };

  window.applyCustomRoster = function () {
    if (Array.isArray(window.SQUAD)) {
      var haveP = new Set(window.SQUAD.map(function (p) { return p.num; }));
      window.getCustomPlayers().forEach(function (p) {
        if (p && p.num != null && !haveP.has(p.num)) { window.SQUAD.push(p); haveP.add(p.num); }
      });
    }
    if (Array.isArray(window.COACHES)) {
      var haveC = new Set(window.COACHES.map(function (c) { return c.id; }));
      window.getCustomCoaches().forEach(function (c) {
        if (c && c.id && !haveC.has(c.id)) { window.COACHES.push(c); haveC.add(c.id); }
      });
    }
  };

  /* ── Retired / departed. Still viewable, just out of the active lists. ── */
  window.getPlayerStatus = function () { return PP.getCached('roster:status') || {}; };
  window.setPlayerStatus = function (num, status) {
    var m = Object.assign({}, window.getPlayerStatus());
    if (status && status !== 'active') m[num] = status; else delete m[num];
    return PP.set('roster:status', m);
  };

  /* ── Sponsor-a-player, and the season-wide match-report sponsor ── */
  window.getPlayerSponsors = function () { return PP.getCached('roster:sponsor') || {}; };
  window.getPlayerSponsor  = function (num) { return window.getPlayerSponsors()[num] || ''; };
  window.setPlayerSponsor  = function (num, company) {
    var m = Object.assign({}, window.getPlayerSponsors());
    var c = (company || '').trim();
    if (c) m[num] = c; else delete m[num];
    return PP.set('roster:sponsor', m);
  };
  window.getReportSponsor = function () { return PP.getCached('sponsor:matchreport') || ''; };
  window.setReportSponsor = function (company) { return PP.set('sponsor:matchreport', (company || '').trim()); };

  /* ── 26/27 season confirmations (array of squad numbers) ── */
  window.getSeason2627   = function () { var v = PP.getCached('roster:s2627'); return Array.isArray(v) ? v : []; };
  window.isConfirmed2627 = function (num) { return window.getSeason2627().indexOf(num) >= 0; };
  window.setConfirmed2627 = function (num, on) {
    var cur = window.getSeason2627().filter(function (n) { return n !== num; });
    if (on) cur.push(num);
    return PP.set('roster:s2627', cur);
  };

  /* ── Donations. Empty until a Stripe Payment Link is pasted in the CMS;
        the buttons read "opening soon" until then, by design — no keys in
        the repo. ── */
  window.getDonateConfig = function () { var v = PP.getCached('donate:config'); return (v && typeof v === 'object') ? v : {}; };
  window.setDonateConfig = function (cfg) { return PP.set('donate:config', cfg || {}); };

  /* ── Rotating hero photos. Empty = use the bundled defaults. ── */
  window.getHeroImages = function () { var v = PP.getCached('hero:images'); return Array.isArray(v) ? v : []; };
  window.setHeroImages = function (arr) { return PP.set('hero:images', arr || []); };

  /* ── Gallery categories, persisted so new ones become future options ── */
  window.getGalleryCats = function () {
    var v = PP.getCached('gallery:cats');
    return (Array.isArray(v) && v.length) ? v : ['Matchday', 'Training', 'Celebration', 'Behind the scenes'];
  };
  window.addGalleryCat = function (name) {
    var cur = window.getGalleryCats();
    if (name && cur.indexOf(name) < 0) return PP.set('gallery:cats', cur.concat([name]));
    return Promise.resolve();
  };

  /* ── Auto-generated post covers: a reusable badge library + per-post spec ── */
  window.getCoverBadges  = function () { var v = PP.getCached('cover:badges'); return Array.isArray(v) ? v : []; };
  window.saveCoverBadges = function (arr) { return PP.set('cover:badges', arr || []); };
  window.getPostCover    = function (id) { return PP.getCached('cover:gen:' + id) || null; };
  window.setPostCover    = function (id, spec) { return PP.set('cover:gen:' + id, spec || null); };

  /* ── Videos. Code-shipped defaults merge with CMS entries so a fresh
        install is never an empty page. ── */
  window.DEFAULT_VIDEOS = [{
    id: 'vid-william-clark-hillside-251012',
    title: 'William Clark vs Hillside Elite FC Blues',
    url: 'https://www.suesangelsfc.co.uk/assets/videos/william-clark-vs-hillside-elite.mp4',
    category: 'Match Highlights',
    homeBadge: asset('assets/badge/hillside-elite.webp'),
    awayBadge: asset('assets/badge/sue-angels-shield.webp')
  }];
  window.VIDEO_CATEGORIES = ['Match Highlights', 'Match Gallery', 'Interviews', 'Behind the Scenes'];
  window.getClubVideos = function () {
    var cloud = PP.getCached('media:videos');
    var arr = Array.isArray(cloud) ? cloud.slice() : [];
    var ids = new Set(arr.map(function (v) { return v && v.id; }));
    (window.DEFAULT_VIDEOS || []).forEach(function (v) { if (v && v.id && !ids.has(v.id)) arr.push(v); });
    return arr;
  };
  window.saveClubVideos = function (arr) { return PP.set('media:videos', arr || []); };

  /* ── Sponsorship pipeline (admin-only lead tracker) ── */
  window.getSponsorPipeline  = function () { var v = PP.getCached('sponsors:pipeline'); return Array.isArray(v) ? v : []; };
  window.saveSponsorPipeline = function (arr) { return PP.set('sponsors:pipeline', arr || []); };
  window.SPONSOR_TARGET = 4000;

  /* ── League overrides. FA-sourced division table / results / scorers,
        imported rather than hand-coded, so a new season does not need a code
        change. Separate from the club's own match entries. ── */
  window.getLeagueOverride   = function (k) { return PP.getCached('league:' + k); };
  window.setLeagueOverride   = function (k, v) { return PP.set('league:' + k, v); };
  window.clearLeagueOverride = function (k) { return PP.remove('league:' + k); };
  window.applyLeagueOverrides = function () {
    try {
      var t = window.getLeagueOverride('table');
      if (Array.isArray(t) && t.length) window.RAW_TABLE = t;
      var r = window.getLeagueOverride('results');
      if (Array.isArray(r) && r.length) window.LEAGUE_RESULTS = r;
      var s = window.getLeagueOverride('scorers');
      if (s && (Array.isArray(s.all) || Array.isArray(s.league))) window.LEAGUE_STATS = s;
    } catch (e) {}
  };

  /* ── News articles. Code defaults merged with CMS rows; a stored row with
        the same id wins. ── */
  window.getCustomArticles = function () {
    var byId = {};
    (window.SA_DEFAULT_ARTICLES || []).forEach(function (a) { if (a && a.id) byId[a.id] = a; });
    var stored = window.dataStore.articles.getAllCached() || {};
    Object.keys(stored).forEach(function (k) { var a = stored[k]; if (a && a.id) byId[a.id] = a; });
    return Object.keys(byId).map(function (k) { return byId[k]; });
  };
  window.saveCustomArticle   = function (article) { return window.dataStore.articles.set(article.id, article); };
  window.deleteCustomArticle = function (id) { return window.dataStore.articles.remove(id); };

  /* ── Gallery albums. One row per album — never one giant row — so a big
        upload can't make a single row unwritable. ── */
  window.getGalleryAlbums = function () {
    var map = window.dataStore.gallery.getAllCached() || {};
    return Object.keys(map).map(function (k) { return map[k]; })
      .filter(function (a) { return a && a.id; })
      .sort(function (a, b) { return (b.sort || 0) - (a.sort || 0); });
  };
  window.saveGalleryAlbum   = function (album) { return window.dataStore.gallery.set(album.id, album); };
  window.deleteGalleryAlbum = function (id) { return window.dataStore.gallery.remove(id); };
  window.subscribeGallery   = function (fn) { return window.dataStore.gallery.subscribe(fn); };

  /* ── Recognition: awards, milestones, club records, leadership. One row
        each, carrying a `type` of
        potm | season_award | match_award | milestone | club_record | leadership ── */
  window.getRecognitionStored = function () {
    var map = window.dataStore.recognition.getAllCached() || {};
    return Object.keys(map).map(function (k) { return map[k]; }).filter(function (r) { return r && r.id; });
  };
  window.saveRecognition      = function (rec) { return window.dataStore.recognition.set(rec.id, rec); };
  window.deleteRecognition    = function (id) { return window.dataStore.recognition.remove(id); };
  window.subscribeRecognition = function (fn) { return window.dataStore.recognition.subscribe(fn); };

  /* ══════════════════════════════════════════════════════════════════════
     6 · LEAD CAPTURE
     Two write-only tables. RLS grants anon INSERT and no SELECT, so these
     rows cannot be read back from the browser — reading them is an
     authenticated/dashboard job. A 400 on a SELECT here is the policy
     working, not a bug.
     ══════════════════════════════════════════════════════════════════════ */

  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  function restPost(table, body, extraInit) {
    return fetch(CFG.url.replace(/\/+$/, '') + '/rest/v1/' + table, Object.assign({
      method: 'POST',
      headers: {
        apikey: CFG.anonKey,
        Authorization: 'Bearer ' + CFG.anonKey,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(body)
    }, extraInit || {}));
  }

  /* Newsletter sign-up. Written to the club's own `supporters` table AND
     pushed to MailerLite via /api/subscribe, and succeeds if EITHER landed —
     the club keeps its list even if the sending platform is down or its key
     is not set yet. */
  window.saAddSupporter = function (email, name, source) {
    email = String(email || '').trim();
    if (!EMAIL_RE.test(email)) return Promise.resolve({ ok: false, reason: 'email' });

    var duplicate = false;

    var supa = (CFG.url && CFG.anonKey)
      ? restPost('supporters', {
          email: email,
          name: (String(name || '').trim() || null),
          source: source || 'site',
          consent: true
        }).then(function (res) {
          if (res.status === 201 || res.status === 204) return true;
          if (res.status === 409) { duplicate = true; return true; }  /* already on the list */
          return false;
        }).catch(function () { return false; })
      : Promise.resolve(false);

    var ml = fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, name: String(name || '').trim() })
    }).then(function (r) {
      if (!r.ok) return false;
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (j && j.duplicate) duplicate = true;
        return !!(j && j.ok);
      });
    }).catch(function () { return false; });

    return Promise.all([supa, ml]).then(function (r) {
      return (r[0] || r[1]) ? { ok: true, duplicate: duplicate } : { ok: false, reason: 'failed' };
    });
  };

  /* Enquiries: contact, sponsorship, trial, volunteer. No unique constraint —
     one person may legitimately send several. keepalive so the POST survives
     the page navigating away on submit. */
  window.saAddEnquiry = function (payload) {
    payload = payload || {};
    var email = String(payload.email || '').trim();
    var message = String(payload.message || '').trim();
    if (!email && !message) return Promise.resolve({ ok: false, reason: 'empty' });
    if (!CFG.url || !CFG.anonKey) return Promise.resolve({ ok: false, reason: 'noconfig' });

    return restPost('enquiries', {
      type: (String(payload.type || '').trim() || null),
      name: (String(payload.name || '').trim() || null),
      email: (email || null),
      phone: (String(payload.phone || '').trim() || null),
      message: (message || null),
      source: (String(payload.source || 'site').trim())
    }, { keepalive: true })
      .then(function (res) {
        return (res.status === 201 || res.status === 204)
          ? { ok: true }
          : { ok: false, reason: 'status_' + res.status };
      })
      .catch(function () { return { ok: false, reason: 'network' }; });
  };

  /* ══════════════════════════════════════════════════════════════════════
     7 · BADGE BACKGROUND REMOVER
     Samples the four corners; if they agree and are opaque, that colour is
     keyed out to transparency. Images that already have transparent corners
     are returned untouched, so re-running it on a cut-out badge is a no-op.
     ══════════════════════════════════════════════════════════════════════ */

  window.removeBadgeBg = function (dataUrl, tol) {
    return new Promise(function (resolve) {
      try {
        var img = new Image();
        img.onload = function () {
          try {
            var c = document.createElement('canvas');
            c.width = img.naturalWidth || img.width;
            c.height = img.naturalHeight || img.height;
            if (!c.width || !c.height) { resolve(dataUrl); return; }
            var x = c.getContext('2d');
            x.drawImage(img, 0, 0);
            var d = x.getImageData(0, 0, c.width, c.height), p = d.data, w = c.width, h = c.height;
            var corners = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]];
            var r = 0, g = 0, b = 0, a = 0;
            corners.forEach(function (cc) {
              var o = (cc[1] * w + cc[0]) * 4;
              r += p[o]; g += p[o + 1]; b += p[o + 2]; a += p[o + 3];
            });
            r /= 4; g /= 4; b /= 4; a /= 4;
            if (a < 200) { resolve(dataUrl); return; }   /* already transparent */
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

  /* ══════════════════════════════════════════════════════════════════════
     8 · READY SIGNAL
     `SA_DATA_READY` resolves once every eager store has finished its first
     cloud sync, so a render path can await real data instead of painting
     from an empty cache and flashing. The lazy photo store is excluded on
     purpose — nothing should block first paint on 1 MB of headshots.
     ══════════════════════════════════════════════════════════════════════ */

  window.SA_DATA_READY = Promise.all([
    window.dataStore.matches.ready(),
    window.dataStore.fixtures.ready(),
    window.dataStore.teamBadges.ready(),
    window.dataStore.articles.ready(),
    window.dataStore.gallery.ready(),
    window.dataStore.recognition.ready()
  ]).then(function () {
    try { window.dispatchEvent(new CustomEvent('sa-data-ready')); } catch (e) {}
    return true;
  });

  console.info('[dataStore] ready in ' + MODE + ' mode');
})();
