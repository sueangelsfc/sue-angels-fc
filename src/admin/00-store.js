/* ==========================================================================
   CONTROL PANEL DATA LAYER
   Thin wrapper over Supabase Auth + REST. Every write is attributed and, for
   destructive actions, confirmed. Authorisation is NOT decided here: the
   database decides via is_club_admin(). This layer only reflects the answer
   so the interface can disable what the user cannot do.
   ========================================================================== */
window.CP = (function () {
  'use strict';

  var CFG = window.SA_SUPABASE || {};
  var TABLES = ['matches', 'fixtures', 'team_badges', 'player_photos', 'articles', 'gallery', 'recognition'];
  var state = {
    session: null,
    user: null,
    isAdmin: false,
    role: null,
    cache: {},
  };

  /* ---- Auth ------------------------------------------------------------
     Uses the Supabase auth REST endpoints directly: sign-in, refresh and
     sign-out are three calls, and it avoids shipping the whole SDK. The
     refresh token is kept in localStorage exactly as the SDK would. */
  var LS = 'sa-cp-session';

  function saveSession(s) {
    state.session = s;
    state.user = s && s.user ? s.user : null;
    try {
      if (s) localStorage.setItem(LS, JSON.stringify({ refresh_token: s.refresh_token, expires_at: s.expires_at }));
      else localStorage.removeItem(LS);
    } catch (e) {}
  }

  function authHeaders(extra) {
    var h = {
      apikey: CFG.anonKey,
      Authorization: 'Bearer ' + (state.session ? state.session.access_token : CFG.anonKey),
      'Content-Type': 'application/json',
    };
    for (var k in (extra || {})) h[k] = extra[k];
    return h;
  }

  function signIn(email, password) {
    return fetch(CFG.url + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: CFG.anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password }),
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error(j.error_description || j.msg || j.message || 'Could not sign in');
        saveSession(j);
        return j;
      });
    });
  }

  function refresh() {
    var stored;
    try { stored = JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) { stored = null; }
    if (!stored || !stored.refresh_token) return Promise.resolve(null);
    return fetch(CFG.url + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { apikey: CFG.anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: stored.refresh_token }),
    }).then(function (r) {
      if (!r.ok) { saveSession(null); return null; }
      return r.json().then(function (j) { saveSession(j); return j; });
    }).catch(function () { saveSession(null); return null; });
  }

  function signOut() {
    var p = state.session
      ? fetch(CFG.url + '/auth/v1/logout', { method: 'POST', headers: authHeaders() }).catch(function () {})
      : Promise.resolve();
    return p.then(function () { saveSession(null); state.isAdmin = false; state.role = null; });
  }

  /* Keep the access token fresh. Tokens last an hour; refresh at 50 minutes. */
  function startRefreshTimer() {
    setInterval(function () { if (state.session) refresh(); }, 50 * 60 * 1000);
  }

  /* ---- Authorisation ---------------------------------------------------
     Asks the database. A signed-in user can read only their own admin_users
     row, so this both answers "am I an admin" and proves the policy works. */
  function loadRole() {
    if (!state.session) { state.isAdmin = false; state.role = null; return Promise.resolve(null); }
    return rest('GET', 'admin_users?select=role,email&user_id=eq.' + state.user.id)
      .then(function (rows) {
        var row = rows && rows[0];
        state.role = row ? row.role : null;
        state.isAdmin = !!row && (row.role === 'admin' || row.role === 'editor');
        return state.role;
      })
      .catch(function () {
        // Table may not exist yet (migration 002 not run). Fall back to
        // "not an administrator" rather than assuming access.
        state.role = null;
        state.isAdmin = false;
        return null;
      });
  }

  /* ---- REST ------------------------------------------------------------ */
  function rest(method, path, body, prefer) {
    var opts = { method: method, headers: authHeaders(prefer ? { Prefer: prefer } : null) };
    if (body !== undefined) opts.body = JSON.stringify(body);
    return fetch(CFG.url + '/rest/v1/' + path, opts).then(function (r) {
      if (r.status === 204) return null;
      return r.text().then(function (t) {
        var j = null;
        try { j = t ? JSON.parse(t) : null; } catch (e) { j = t; }
        if (!r.ok) {
          var msg = (j && (j.message || j.hint)) || ('Request failed (' + r.status + ')');
          var err = new Error(msg);
          err.status = r.status;
          err.body = j;
          throw err;
        }
        return j;
      });
    });
  }

  /* ---- Key/value store helpers ----------------------------------------
     All seven content tables share the shape { key, data, updated_at }. */
  function readAll(table) {
    return rest('GET', table + '?select=key,data,updated_at&order=key.asc').then(function (rows) {
      state.cache[table] = rows || [];
      return state.cache[table];
    });
  }

  /* A write that changed NOTHING is a failed write, and it does not look like
     one over the wire. PostgREST answers a statement that ran but matched no
     rows with 200 and an empty array, and a bare 204 tells you only that the
     statement executed. Both used to resolve here as success, so the panel
     said "Saved" and the club believed something was stored that was not.

     `return=representation` is requested precisely so there is something to
     count. If nothing comes back, say so instead of celebrating. */
  function verifyWrote(res, what) {
    var n = Array.isArray(res) ? res.length : (res ? 1 : 0);
    if (n > 0) return res;
    throw new Error(
      'The server accepted the request but changed no rows, so ' + what + ' was not saved. '
      + 'This is usually row-level security refusing the write: check the account is in '
      + 'admin_users and that migration 002 has been run.'
    );
  }

  function upsert(table, key, data) {
    if (!state.isAdmin) return Promise.reject(new Error('You do not have permission to change club data.'));
    return rest(
      'POST',
      table + '?on_conflict=key',
      [{ key: key, data: data, updated_at: new Date().toISOString() }],
      'return=representation,resolution=merge-duplicates'
    ).then(function (res) {
      verifyWrote(res, '"' + key + '"');
      audit('upsert', table, key);
      return res;
    });
  }

  function remove(table, key) {
    if (!state.isAdmin) return Promise.reject(new Error('You do not have permission to delete club data.'));
    return rest('DELETE', table + '?key=eq.' + encodeURIComponent(key), undefined, 'return=representation')
      .then(function (res) {
        verifyWrote(res, '"' + key + '"');
        audit('delete', table, key);
        return res;
      });
  }

  /* Best-effort audit entry. Never blocks or fails the user's action. */
  function audit(action, table, key, detail) {
    if (!state.isAdmin) return;
    rest('POST', 'rpc/log_admin_action', {
      p_action: action, p_table: table || null, p_key: key || null, p_detail: detail || null,
    }).catch(function () {});
  }

  /* ---- Private tables -------------------------------------------------- */
  function readEnquiries() {
    return rest('GET', 'enquiries?select=*&order=created_at.desc&limit=500').catch(function (e) {
      if (e.status === 400) return rest('GET', 'enquiries?select=*&limit=500');
      throw e;
    });
  }
  function readSupporters() {
    return rest('GET', 'supporters?select=*&order=created_at.desc&limit=1000').catch(function (e) {
      if (e.status === 400) return rest('GET', 'supporters?select=*&limit=1000');
      throw e;
    });
  }

  /* ---- Storage --------------------------------------------------------- */
  function listBucket(bucket, prefix, limit) {
    return fetch(CFG.url + '/storage/v1/object/list/' + bucket, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ prefix: prefix || '', limit: limit || 100, sortBy: { column: 'name', order: 'asc' } }),
    }).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; });
  }

  function upload(bucket, path, file) {
    if (!state.isAdmin) return Promise.reject(new Error('You do not have permission to upload.'));
    return fetch(CFG.url + '/storage/v1/object/' + bucket + '/' + path, {
      method: 'POST',
      headers: {
        apikey: CFG.anonKey,
        Authorization: 'Bearer ' + state.session.access_token,
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'true',
      },
      body: file,
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error('Upload failed: ' + t.slice(0, 140)); });
      audit('upload', bucket, path);
      return CFG.url + '/storage/v1/object/public/' + bucket + '/' + path;
    });
  }

  return {
    state: state,
    TABLES: TABLES,
    signIn: signIn, signOut: signOut, refresh: refresh, loadRole: loadRole,
    startRefreshTimer: startRefreshTimer,
    rest: rest, readAll: readAll, upsert: upsert, remove: remove, audit: audit,
    readEnquiries: readEnquiries, readSupporters: readSupporters,
    listBucket: listBucket, upload: upload,
  };
})();
