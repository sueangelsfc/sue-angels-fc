window.SA_SUPABASE={"url":"https://hvbquuvxcswylyguplfb.supabase.co","anonKey":"sb_publishable_2VEdxWZCLW98qItINt6TPQ_r7y_Tcly"};window.SA_EMAIL="suesangelsfc@gmail.com";
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

  function upsert(table, key, data) {
    if (!state.isAdmin) return Promise.reject(new Error('You do not have permission to change club data.'));
    return rest(
      'POST',
      table + '?on_conflict=key',
      [{ key: key, data: data, updated_at: new Date().toISOString() }],
      'return=representation,resolution=merge-duplicates'
    ).then(function (res) {
      audit('upsert', table, key);
      return res;
    });
  }

  function remove(table, key) {
    if (!state.isAdmin) return Promise.reject(new Error('You do not have permission to delete club data.'));
    return rest('DELETE', table + '?key=eq.' + encodeURIComponent(key), undefined, 'return=representation')
      .then(function (res) {
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

/* ==========================================================================
   CONTROL PANEL MODULES
   Each module renders into its panel and reads/writes real Supabase rows.
   Destructive actions always confirm. Writes are disabled in the interface
   when the database says the signed-in user is not an administrator, so the
   user is told why rather than hitting a policy error.
   ========================================================================== */
(function () {
  'use strict';
  var CP = window.CP;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  var toast = function (m, k) { if (window.saToast) window.saToast(m, k); };

  /* ---- Confirm dialog: every destructive action goes through this ------ */
  function confirmAction(opts) {
    return new Promise(function (resolve) {
      var back = document.createElement('div');
      back.className = 'modal-backdrop';
      back.setAttribute('role', 'dialog');
      back.setAttribute('aria-modal', 'true');
      back.innerHTML =
        '<div class="modal glass glass--lg">' +
          '<div class="modal__head"><h2 style="font-size:var(--step-2)">' + esc(opts.title) + '</h2></div>' +
          '<p style="color:var(--text-muted)">' + esc(opts.body) + '</p>' +
          (opts.detail ? '<p style="margin-top:var(--space-3);font-size:var(--step--1);color:var(--text-subtle)">' + esc(opts.detail) + '</p>' : '') +
          '<div class="modal__foot">' +
            '<button class="btn btn--ghost" data-no>Cancel</button>' +
            '<button class="btn btn--danger" data-yes>' + esc(opts.confirmLabel || 'Delete') + '</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(back);
      var done = function (v) { back.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
      var onKey = function (e) { if (e.key === 'Escape') done(false); };
      $('[data-no]', back).addEventListener('click', function () { done(false); });
      $('[data-yes]', back).addEventListener('click', function () { done(true); });
      back.addEventListener('click', function (e) { if (e.target === back) done(false); });
      document.addEventListener('keydown', onKey);
      $('[data-yes]', back).focus();
    });
  }

  function guard() {
    if (CP.state.isAdmin) return true;
    toast('Your account is not in the administrator registry, so changes are read-only.', 'error');
    return false;
  }

  /* ---- Small builders -------------------------------------------------- */
  function tile(value, label, sub) {
    return '<div class="stat panel"><span class="stat__value">' + esc(value) + '</span>' +
      '<span class="stat__label">' + esc(label) + '</span>' +
      (sub ? '<span class="stat__sub">' + esc(sub) + '</span>' : '') + '</div>';
  }
  function empty(title, body) {
    return '<div class="state"><p class="state__title">' + esc(title) + '</p>' +
      (body ? '<p class="state__body">' + esc(body) + '</p>' : '') + '</div>';
  }
  function table(headers, rows) {
    return '<div class="table-wrap scroll-x"><table class="data"><thead><tr>' +
      headers.map(function (h) { return '<th scope="col">' + esc(h) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  function fmtDate(v) {
    if (!v) return '';
    var d = new Date(v);
    return isNaN(+d) ? String(v) : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function csv(rows, cols) {
    var q = function (v) {
      var s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    return [cols.join(',')].concat(rows.map(function (r) {
      return cols.map(function (c) { return q(r[c]); }).join(',');
    })).join('\n');
  }
  function download(name, text, type) {
    var blob = new Blob([text], { type: type || 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  /* =================== MODULES =================== */
  var M = {};

  /* ---- Dashboard ---- */
  M.dashboard = function (host) {
    return Promise.all([
      CP.readAll('matches'), CP.readAll('articles'), CP.readAll('gallery'),
      CP.readAll('recognition'), CP.readAll('fixtures'),
      CP.state.isAdmin ? CP.readEnquiries() : Promise.resolve([]),
      CP.state.isAdmin ? CP.readSupporters() : Promise.resolve([]),
    ]).then(function (r) {
      var matches = r[0], articles = r[1], gallery = r[2], recog = r[3], fixtures = r[4];
      var enq = r[5] || [], sup = r[6] || [];

      var withReport = matches.filter(function (m) {
        return m.data && (m.data.polishedReport || m.data.commentary);
      }).length;
      var photos = gallery.reduce(function (a, g) { return a + ((g.data && g.data.photos) || []).length; }, 0);
      var newEnq = enq.filter(function (e) { return !e.status || e.status === 'new'; }).length;

      var warn = [];
      if (!CP.state.isAdmin) {
        warn.push('This account is not in the administrator registry, so everything here is read-only. Run migration 002 and add the account to admin_users.');
      }
      if (!fixtures.length) warn.push('No fixtures are stored. The website shows "to be confirmed" until the new season fixtures are added.');
      if (matches.length - withReport > 0) warn.push((matches.length - withReport) + ' matches have no written report.');

      host.innerHTML =
        '<div class="grid grid--4" style="margin-bottom:var(--space-6)">' +
          tile(matches.length, 'Matches recorded') +
          tile(fixtures.length, 'Upcoming fixtures') +
          tile(articles.length, 'Articles') +
          tile(photos, 'Photographs', gallery.length + ' albums') +
          tile(recog.length, 'Recognition entries') +
          tile(CP.state.isAdmin ? newEnq : '-', 'New enquiries', CP.state.isAdmin ? enq.length + ' total' : 'sign in as admin') +
          tile(CP.state.isAdmin ? sup.length : '-', 'Newsletter subscribers') +
          tile(withReport + '/' + matches.length, 'Matches with a report') +
        '</div>' +
        (warn.length
          ? '<div class="panel" style="padding:var(--space-5);margin-bottom:var(--space-6);border-color:var(--warning)">' +
            '<h3 style="font-size:var(--step-1);color:var(--warning);margin-bottom:var(--space-3)">Needs attention</h3>' +
            '<ul style="display:flex;flex-direction:column;gap:var(--space-2);padding-left:var(--space-5)">' +
            warn.map(function (w) { return '<li style="font-size:var(--step--1)">' + esc(w) + '</li>'; }).join('') +
            '</ul></div>'
          : '') +
        '<div class="grid grid--2">' +
          '<div class="panel" style="padding:var(--space-5)">' +
            '<h3 style="font-size:var(--step-1);margin-bottom:var(--space-4)">Recently changed</h3>' +
            (matches.length
              ? matches.slice().sort(function (a, b) { return String(b.updated_at).localeCompare(String(a.updated_at)); })
                  .slice(0, 6).map(function (m) {
                    return '<div class="row row--between" style="font-size:var(--step--1);padding-block:var(--space-2);border-bottom:1px solid var(--border)">' +
                      '<span class="truncate">' + esc(m.key) + '</span>' +
                      '<span style="color:var(--text-subtle)">' + esc(fmtDate(m.updated_at)) + '</span></div>';
                  }).join('')
              : empty('Nothing yet')) +
          '</div>' +
          '<div class="panel" style="padding:var(--space-5)">' +
            '<h3 style="font-size:var(--step-1);margin-bottom:var(--space-4)">Shortcuts</h3>' +
            '<div class="row">' +
              '<button class="btn btn--glass btn--sm" data-goto="fixtures">Add a fixture</button>' +
              '<button class="btn btn--glass btn--sm" data-goto="results">Enter a result</button>' +
              '<button class="btn btn--glass btn--sm" data-goto="news">Write an article</button>' +
              '<button class="btn btn--glass btn--sm" data-goto="inbox">Read the inbox</button>' +
            '</div>' +
          '</div>' +
        '</div>';

      $$('[data-goto]', host).forEach(function (b) {
        b.addEventListener('click', function () { show(b.getAttribute('data-goto')); });
      });
      setCount('inbox', CP.state.isAdmin ? newEnq : 0);
    });
  };

  /* ---- Generic key/value editor, used by several modules ---- */
  function kvModule(cfg) {
    return function (host) {
      return CP.readAll(cfg.table).then(function (rows) {
        var list = cfg.filter ? rows.filter(cfg.filter) : rows;
        host.innerHTML =
          '<div class="row row--between" style="margin-bottom:var(--space-5)">' +
            '<p style="color:var(--text-muted);font-size:var(--step--1)">' + esc(list.length) + ' ' + esc(cfg.noun) + '</p>' +
            '<div class="row row--tight">' +
              '<button class="btn btn--ghost btn--sm" data-export>Export JSON</button>' +
              (cfg.canAdd === false ? '' : '<button class="btn btn--primary btn--sm" data-new>' + esc(cfg.addLabel || 'Add') + '</button>') +
            '</div>' +
          '</div>' +
          '<div data-list></div>';

        var listHost = $('[data-list]', host);
        function paint() {
          if (!list.length) { listHost.innerHTML = empty('Nothing here yet', cfg.emptyBody); return; }
          listHost.innerHTML = table(
            cfg.headers.concat(['']),
            list.map(function (row, i) {
              return '<tr>' + cfg.cells(row).map(function (c) { return '<td>' + c + '</td>'; }).join('') +
                '<td><div class="row row--tight" style="justify-content:flex-end">' +
                  '<button class="btn btn--ghost btn--sm" data-edit="' + i + '">Edit</button>' +
                  '<button class="btn btn--ghost btn--sm" data-del="' + i + '">Delete</button>' +
                '</div></td></tr>';
            }).join('')
          );
          $$('[data-edit]', listHost).forEach(function (b) {
            b.addEventListener('click', function () { editRow(list[+b.getAttribute('data-edit')]); });
          });
          $$('[data-del]', listHost).forEach(function (b) {
            b.addEventListener('click', function () {
              var row = list[+b.getAttribute('data-del')];
              if (!guard()) return;
              confirmAction({
                title: 'Delete this ' + cfg.singular + '?',
                body: cfg.describe ? cfg.describe(row) : row.key,
                detail: 'This removes the record from the live website immediately. It cannot be undone from here.',
              }).then(function (ok) {
                if (!ok) return;
                CP.remove(cfg.table, row.key).then(function () {
                  toast(cfg.singular + ' deleted', 'success');
                  refresh(cfg.key);
                }).catch(function (e) { toast(e.message, 'error'); });
              });
            });
          });
        }

        /* Raw JSON editor. Deliberate: these are JSONB documents with varied
           shapes, and a lossy form would silently drop fields the website
           reads. The textarea is validated before it can be saved. */
        function editRow(row) {
          var isNew = !row;
          var key = row ? row.key : '';
          var back = document.createElement('div');
          back.className = 'modal-backdrop';
          back.setAttribute('role', 'dialog');
          back.setAttribute('aria-modal', 'true');
          back.innerHTML =
            '<div class="modal glass glass--lg" style="width:min(100%,720px)">' +
              '<div class="modal__head"><h2 style="font-size:var(--step-2)">' +
                (isNew ? 'New ' + esc(cfg.singular) : 'Edit ' + esc(cfg.singular)) + '</h2></div>' +
              '<div class="field"><label class="field__label" for="kv-key">Key</label>' +
                '<input class="input" id="kv-key" value="' + esc(key) + '"' + (isNew ? '' : ' readonly') + '></div>' +
              '<div class="field" style="margin-top:var(--space-4)">' +
                '<label class="field__label" for="kv-data">Data (JSON)</label>' +
                '<textarea class="textarea" id="kv-data" spellcheck="false" style="min-height:320px;font-family:var(--font-mono);font-size:var(--step--1)">' +
                esc(JSON.stringify(row ? row.data : (cfg.template || {}), null, 2)) + '</textarea>' +
                '<p class="field__error" data-err hidden></p></div>' +
              '<div class="modal__foot"><button class="btn btn--ghost" data-cancel>Cancel</button>' +
                '<button class="btn btn--primary" data-save>Save</button></div>' +
            '</div>';
          document.body.appendChild(back);
          var close = function () { back.remove(); };
          $('[data-cancel]', back).addEventListener('click', close);
          back.addEventListener('click', function (e) { if (e.target === back) close(); });
          $('[data-save]', back).addEventListener('click', function () {
            if (!guard()) return;
            var k = $('#kv-key', back).value.trim();
            var errEl = $('[data-err]', back);
            if (!k) { errEl.textContent = 'A key is required'; errEl.hidden = false; return; }
            var parsed;
            try { parsed = JSON.parse($('#kv-data', back).value); }
            catch (e) { errEl.textContent = 'That is not valid JSON: ' + e.message; errEl.hidden = false; return; }
            errEl.hidden = true;
            CP.upsert(cfg.table, k, parsed).then(function () {
              toast('Saved', 'success'); close(); refresh(cfg.key);
            }).catch(function (e) { errEl.textContent = e.message; errEl.hidden = false; });
          });
        }

        var addBtn = $('[data-new]', host);
        if (addBtn) addBtn.addEventListener('click', function () { if (guard()) editRow(null); });
        $('[data-export]', host).addEventListener('click', function () {
          download(cfg.table + '-' + new Date().toISOString().slice(0, 10) + '.json',
            JSON.stringify(list, null, 2), 'application/json');
        });
        paint();
      });
    };
  }

  M.fixtures = kvModule({
    key: 'fixtures', table: 'fixtures', noun: 'fixtures stored', singular: 'fixture',
    addLabel: 'Add fixture',
    emptyBody: 'Add the new season fixtures here and they appear on the website immediately, including the next-match card on the home page.',
    template: { date: '', kick: '11:00', home: "Sue's Angels FC", away: '', competition: 'League Eight', venue: '', kind: 'fixture' },
    headers: ['Key', 'Date', 'Home', 'Away', 'Competition'],
    cells: function (r) {
      var d = r.data || {};
      return [esc(r.key), esc(d.date), esc(d.home), esc(d.away), esc(d.competition)];
    },
    describe: function (r) { return (r.data && (r.data.home + ' v ' + r.data.away)) || r.key; },
  });

  M.results = kvModule({
    key: 'results', table: 'matches', noun: 'match records', singular: 'match record',
    addLabel: 'Add match',
    template: {
      starters: [], bench: [], goals: [], assists: [], yellowCards: [], redCards: [],
      opponentGoals: [], motm: null, captain: null, formation: null, commentary: '', polishedReport: null,
    },
    headers: ['Key', 'Report', 'Goals', 'Starters', 'MOTM', 'Updated'],
    cells: function (r) {
      var d = r.data || {};
      return [
        esc(r.key),
        (d.polishedReport || d.commentary) ? '<span class="badge badge--success">Yes</span>' : '<span class="badge badge--warning">No</span>',
        esc((d.goals || []).length),
        esc((d.starters || []).length),
        d.motm != null ? esc(d.motm) : '-',
        esc(fmtDate(r.updated_at)),
      ];
    },
    describe: function (r) { return r.key; },
  });

  M.squad = kvModule({
    key: 'squad', table: 'player_photos', noun: 'stored player/roster records', singular: 'record',
    addLabel: 'Add record',
    emptyBody: 'This table holds player photographs plus roster and status records.',
    headers: ['Key', 'Type', 'Size', 'Updated'],
    cells: function (r) {
      var isImg = typeof r.data === 'string' && r.data.indexOf('data:image') === 0;
      var size = typeof r.data === 'string' ? Math.round(r.data.length / 1024) + ' KB' : '-';
      return [esc(r.key), isImg ? 'Photograph' : 'Record', esc(size), esc(fmtDate(r.updated_at))];
    },
    describe: function (r) { return r.key; },
  });

  M.news = kvModule({
    key: 'news', table: 'articles', noun: 'articles', singular: 'article',
    addLabel: 'New article',
    template: { id: '', title: '', cat: 'News', date: '', lede: '', body: '', cover: '' },
    headers: ['Title', 'Category', 'Date', 'Updated'],
    cells: function (r) {
      var d = r.data || {};
      return [esc(d.title || r.key), esc(d.cat), esc(d.date), esc(fmtDate(r.updated_at))];
    },
    describe: function (r) { return (r.data && r.data.title) || r.key; },
  });

  M.media = kvModule({
    key: 'media', table: 'gallery', noun: 'albums', singular: 'album',
    addLabel: 'New album',
    template: { id: '', title: '', category: 'Matchday', photos: [], cover: '', tags: [], photographer: '' },
    headers: ['Title', 'Category', 'Photos', 'Updated'],
    cells: function (r) {
      var d = r.data || {};
      return [esc(d.title || r.key), esc(d.category), esc((d.photos || []).length), esc(fmtDate(r.updated_at))];
    },
    describe: function (r) { return (r.data && r.data.title) || r.key; },
  });

  M.recognition = kvModule({
    key: 'recognition', table: 'recognition', noun: 'recognition entries', singular: 'entry',
    addLabel: 'Add recognition',
    template: { id: '', type: 'potm', month: '', player: null, reason: '' },
    headers: ['Key', 'Type', 'Month/Season', 'Player'],
    cells: function (r) {
      var d = r.data || {};
      return [esc(r.key), esc(d.type), esc(d.month || d.season || ''), esc(d.player != null ? d.player : '')];
    },
    describe: function (r) { return r.key; },
  });

  M.league = kvModule({
    key: 'league', table: 'team_badges', noun: 'opponent badge records', singular: 'badge record',
    addLabel: 'Add badge',
    emptyBody: 'Opponent crests currently come from the code baseline. Rows added here override it.',
    template: { src: '', alt: '', aspect: 'circle' },
    headers: ['Club', 'Source', 'Aspect'],
    cells: function (r) {
      var d = r.data || {};
      return [esc(r.key), esc(d.src), esc(d.aspect)];
    },
    describe: function (r) { return r.key; },
  });

  /* ---- Sponsors: stored as one record so ordering is preserved ---- */
  M.sponsors = function (host) {
    return CP.readAll('player_photos').then(function (rows) {
      var rec = rows.filter(function (r) { return r.key.indexOf('sponsor') === 0; });
      host.innerHTML =
        '<div class="panel" style="padding:var(--space-5);margin-bottom:var(--space-5)">' +
          '<h3 style="font-size:var(--step-1);margin-bottom:var(--space-3)">Partners on the website</h3>' +
          '<p style="font-size:var(--step--1);color:var(--text-muted)">The five current partners are held in the site source ' +
          '(src/lib/club.mjs) so their logos ship as optimised static files and load instantly. ' +
          'Changing a partner is a code change plus a rebuild, which is deliberate: a partner logo is ' +
          'a contractual asset, not routine content.</p>' +
        '</div>' +
        '<div class="panel" style="padding:var(--space-5)">' +
          '<h3 style="font-size:var(--step-1);margin-bottom:var(--space-4)">Sponsorship records in the database</h3>' +
          (rec.length
            ? table(['Key', 'Data', 'Updated'], rec.map(function (r) {
                return '<tr><td>' + esc(r.key) + '</td><td class="cell-club">' +
                  esc(JSON.stringify(r.data).slice(0, 90)) + '</td><td>' + esc(fmtDate(r.updated_at)) + '</td></tr>';
              }).join(''))
            : empty('No sponsorship records', 'Player and match-report sponsorship records appear here once set.')) +
        '</div>';
    });
  };

  /* ---- Inbox ---- */
  M.inbox = function (host) {
    if (!CP.state.isAdmin) {
      host.innerHTML = empty('Sign in as an administrator',
        'Enquiries and subscribers are hidden from anonymous and non-administrator accounts by row-level security. That is the policy working correctly.');
      return Promise.resolve();
    }
    return Promise.all([CP.readEnquiries(), CP.readSupporters()]).then(function (r) {
      var enq = r[0] || [], sup = r[1] || [];
      host.innerHTML =
        '<div class="tabs" role="tablist" style="margin-bottom:var(--space-5)">' +
          '<button class="tab" role="tab" aria-selected="true" data-tab="enq">Enquiries (' + enq.length + ')</button>' +
          '<button class="tab" role="tab" aria-selected="false" data-tab="sup">Subscribers (' + sup.length + ')</button>' +
        '</div>' +
        '<div data-tabpane="enq">' +
          '<div class="row row--between" style="margin-bottom:var(--space-4)">' +
            '<input class="input" data-search placeholder="Search name, email or message" style="max-width:320px">' +
            '<button class="btn btn--ghost btn--sm" data-csv-enq>Export CSV</button>' +
          '</div>' +
          (enq.length ? table(['Received', 'Name', 'Email', 'Type', 'Message', ''], enq.map(function (e, i) {
            return '<tr>' +
              '<td>' + esc(fmtDate(e.created_at)) + '</td>' +
              '<td>' + esc(e.name) + '</td>' +
              '<td><a href="mailto:' + esc(e.email) + '">' + esc(e.email) + '</a></td>' +
              '<td>' + esc(e.type || e.enquiry_type || '-') + '</td>' +
              '<td class="cell-club">' + esc(String(e.message || '').slice(0, 90)) + '</td>' +
              '<td><button class="btn btn--ghost btn--sm" data-del-enq="' + i + '">Delete</button></td>' +
            '</tr>';
          }).join('')) : empty('No enquiries yet', 'Submissions from the contact, join and sponsorship forms land here.')) +
        '</div>' +
        '<div data-tabpane="sup" hidden>' +
          '<div class="row row--between" style="margin-bottom:var(--space-4)">' +
            '<p style="color:var(--text-muted);font-size:var(--step--1)">' + sup.length + ' subscribers</p>' +
            '<button class="btn btn--ghost btn--sm" data-csv-sup>Export CSV</button>' +
          '</div>' +
          (sup.length ? table(['Joined', 'Email', 'Source'], sup.map(function (s) {
            return '<tr><td>' + esc(fmtDate(s.created_at)) + '</td><td>' + esc(s.email) + '</td><td>' + esc(s.source || '-') + '</td></tr>';
          }).join('')) : empty('No subscribers yet')) +
        '</div>';

      $$('[data-tab]', host).forEach(function (t) {
        t.addEventListener('click', function () {
          $$('[data-tab]', host).forEach(function (x) { x.setAttribute('aria-selected', String(x === t)); });
          $$('[data-tabpane]', host).forEach(function (p) {
            p.hidden = p.getAttribute('data-tabpane') !== t.getAttribute('data-tab');
          });
        });
      });
      var search = $('[data-search]', host);
      if (search) search.addEventListener('input', function () {
        var q = search.value.toLowerCase();
        $$('[data-tabpane="enq"] tbody tr', host).forEach(function (tr) {
          tr.hidden = q ? tr.textContent.toLowerCase().indexOf(q) === -1 : false;
        });
      });
      $('[data-csv-enq]', host).addEventListener('click', function () {
        download('enquiries-' + new Date().toISOString().slice(0, 10) + '.csv',
          csv(enq, ['created_at', 'name', 'email', 'phone', 'type', 'subject', 'message', 'source']));
      });
      $('[data-csv-sup]', host).addEventListener('click', function () {
        download('supporters-' + new Date().toISOString().slice(0, 10) + '.csv', csv(sup, ['created_at', 'email', 'source']));
      });
      $$('[data-del-enq]', host).forEach(function (b) {
        b.addEventListener('click', function () {
          var e = enq[+b.getAttribute('data-del-enq')];
          confirmAction({
            title: 'Delete this enquiry?',
            body: e.name + ' <' + e.email + '>',
            detail: 'Use this to honour an erasure request. The record is removed permanently.',
            confirmLabel: 'Delete permanently',
          }).then(function (ok) {
            if (!ok) return;
            CP.rest('DELETE', 'enquiries?id=eq.' + encodeURIComponent(e.id)).then(function () {
              CP.audit('delete', 'enquiries', String(e.id));
              toast('Enquiry deleted', 'success');
              refresh('inbox');
            }).catch(function (err) { toast(err.message, 'error'); });
          });
        });
      });
    });
  };

  /* ---- Settings ---- */
  M.settings = function (host) {
    var s = CP.state;
    host.innerHTML =
      '<div class="grid grid--2">' +
        '<div class="panel" style="padding:var(--space-5)">' +
          '<h3 style="font-size:var(--step-1);margin-bottom:var(--space-4)">Access</h3>' +
          '<dl style="display:grid;gap:var(--space-3)">' +
            '<div><dt style="font-size:var(--step--2);color:var(--text-subtle)">Signed in as</dt><dd>' + esc(s.user ? s.user.email : '-') + '</dd></div>' +
            '<div><dt style="font-size:var(--step--2);color:var(--text-subtle)">Database role</dt><dd>' +
              (s.role ? '<span class="badge badge--success">' + esc(s.role) + '</span>'
                      : '<span class="badge badge--warning">not registered</span>') + '</dd></div>' +
            '<div><dt style="font-size:var(--step--2);color:var(--text-subtle)">Can write</dt><dd>' + (s.isAdmin ? 'Yes' : 'No, read-only') + '</dd></div>' +
            '<div><dt style="font-size:var(--step--2);color:var(--text-subtle)">User id</dt><dd style="font-family:var(--font-mono);font-size:var(--step--2)">' + esc(s.user ? s.user.id : '-') + '</dd></div>' +
          '</dl>' +
          (!s.isAdmin ? '<p style="margin-top:var(--space-4);font-size:var(--step--1);color:var(--text-muted)">' +
            'To grant access, run migrations/002_admin_role_and_rls.sql then insert this user id into public.admin_users.</p>' : '') +
        '</div>' +
        '<div class="panel" style="padding:var(--space-5)">' +
          '<h3 style="font-size:var(--step-1);margin-bottom:var(--space-4)">Club information</h3>' +
          '<p style="font-size:var(--step--1);color:var(--text-muted)">Club name, contact address, venue, social links and ' +
          'sponsorship packages live in src/lib/club.mjs and ship as static HTML. They change by editing that file and ' +
          'rebuilding, which keeps them fast and indexable rather than fetched at runtime.</p>' +
          '<p style="margin-top:var(--space-3);font-size:var(--step--1);color:var(--text-muted)">Club email: <b>' + esc(window.SA_EMAIL || '') + '</b></p>' +
        '</div>' +
        '<div class="panel" style="padding:var(--space-5)">' +
          '<h3 style="font-size:var(--step-1);margin-bottom:var(--space-4)">Audit trail</h3>' +
          '<div data-audit><p style="color:var(--text-subtle);font-size:var(--step--1)">Loading...</p></div>' +
        '</div>' +
        '<div class="panel" style="padding:var(--space-5)">' +
          '<h3 style="font-size:var(--step-1);margin-bottom:var(--space-4)">Backup</h3>' +
          '<p style="font-size:var(--step--1);color:var(--text-muted);margin-bottom:var(--space-4)">' +
          'Downloads every content table as JSON. Keep a copy before any bulk change.</p>' +
          '<button class="btn btn--primary btn--sm" data-backup>Download full backup</button>' +
        '</div>' +
      '</div>';

    $('[data-backup]', host).addEventListener('click', function () {
      var btn = $('[data-backup]', host);
      btn.setAttribute('data-loading', 'true');
      Promise.all(CP.TABLES.map(function (t) {
        return CP.readAll(t).then(function (rows) { return [t, rows]; }).catch(function () { return [t, []]; });
      })).then(function (pairs) {
        var out = { exported_at: new Date().toISOString(), tables: {} };
        pairs.forEach(function (p) { out.tables[p[0]] = p[1]; });
        download('sue-angels-backup-' + new Date().toISOString().slice(0, 10) + '.json',
          JSON.stringify(out, null, 2), 'application/json');
        btn.removeAttribute('data-loading');
        toast('Backup downloaded', 'success');
      });
    });

    var auditHost = $('[data-audit]', host);
    return CP.rest('GET', 'audit_log?select=*&order=at.desc&limit=12').then(function (rows) {
      auditHost.innerHTML = (rows && rows.length)
        ? rows.map(function (a) {
            return '<div class="row row--between" style="font-size:var(--step--2);padding-block:var(--space-2);border-bottom:1px solid var(--border)">' +
              '<span class="truncate">' + esc(a.action) + ' ' + esc(a.table_name || '') + ' ' + esc(a.row_key || '') + '</span>' +
              '<span style="color:var(--text-subtle)">' + esc(fmtDate(a.at)) + '</span></div>';
          }).join('')
        : '<p style="color:var(--text-subtle);font-size:var(--step--1)">No entries yet.</p>';
    }).catch(function () {
      auditHost.innerHTML = '<p style="color:var(--text-subtle);font-size:var(--step--1)">' +
        'Audit table not present. Run migrations/002_admin_role_and_rls.sql to enable it.</p>';
    });
  };

  /* =================== SHELL =================== */
  var current = null;
  function setCount(key, n) {
    var el = $('[data-count-for="' + key + '"]');
    if (!el) return;
    el.textContent = n;
    el.hidden = !n;
  }

  function show(key) {
    current = key;
    $$('.cp-panel').forEach(function (p) { p.hidden = p.id !== 'panel-' + key; });
    $$('.cp-nav__item').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-module') === key);
    });
    var mod = $('[data-module="' + key + '"]');
    var title = $('[data-cp-title]');
    if (mod && title) title.textContent = mod.textContent.trim();
    if (location.hash.slice(1) !== key) history.replaceState(null, '', '#' + key);
    render(key);
    var side = $('.cp-side');
    if (side) side.classList.remove('is-open');
  }

  function render(key) {
    var panel = $('#panel-' + key);
    if (!panel) return;
    var loading = $('[data-panel-loading]', panel);
    var body = $('[data-panel-body]', panel);
    if (!M[key]) { body.innerHTML = empty('Not built yet'); if (loading) loading.hidden = true; return; }
    if (loading) loading.hidden = false;
    body.innerHTML = '';
    Promise.resolve(M[key](body))
      .catch(function (e) {
        body.innerHTML = '<div class="state" style="border-color:var(--error)">' +
          '<p class="state__title">Could not load this section</p>' +
          '<p class="state__body">' + esc(e.message) + '</p></div>';
      })
      .then(function () { if (loading) loading.hidden = true; });
  }

  function refresh(key) { render(key || current); }

  /* ---- Boot ---- */
  function enterApp() {
    $('#cp-gate').hidden = true;
    $('#cp-app').hidden = false;
    $('[data-who-email]').textContent = CP.state.user ? CP.state.user.email : '-';
    $('[data-who-role]').textContent = CP.state.isAdmin
      ? (CP.state.role === 'admin' ? 'Administrator' : 'Editor')
      : 'Read-only, not registered';
    var dot = $('[data-role-dot]');
    if (dot) dot.style.background = CP.state.isAdmin ? 'var(--success)' : 'var(--warning)';
    var conn = $('[data-conn]');
    if (conn) {
      conn.textContent = CP.state.isAdmin ? 'Connected' : 'Read-only';
      conn.className = 'badge ' + (CP.state.isAdmin ? 'badge--success' : 'badge--warning');
    }
    CP.startRefreshTimer();
    var start = (location.hash || '#dashboard').slice(1);
    show(M[start] ? start : 'dashboard');
  }

  $$('.cp-nav__item').forEach(function (b) {
    b.addEventListener('click', function () { show(b.getAttribute('data-module')); });
  });
  var menu = $('#cp-menu');
  if (menu) menu.addEventListener('click', function () {
    var side = $('.cp-side');
    var open = side.classList.toggle('is-open');
    menu.setAttribute('aria-expanded', String(open));
  });

  var form = $('#cp-login');
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('#cp-login-error');
    var btn = $('#cp-login-btn');
    err.hidden = true;
    btn.setAttribute('data-loading', 'true');
    CP.signIn($('#cp-email').value.trim(), $('#cp-pass').value)
      .then(function () { return CP.loadRole(); })
      .then(function () { btn.removeAttribute('data-loading'); enterApp(); })
      .catch(function (e2) {
        btn.removeAttribute('data-loading');
        err.textContent = e2.message;
        err.hidden = false;
      });
  });

  var out = $('#cp-signout');
  if (out) out.addEventListener('click', function () {
    CP.signOut().then(function () { location.reload(); });
  });

  window.addEventListener('hashchange', function () {
    var k = location.hash.slice(1);
    if (k && k !== current && M[k]) show(k);
  });

  /* Restore an existing session if the refresh token is still good. */
  CP.refresh().then(function (s) {
    if (!s) return;
    return CP.loadRole().then(enterApp);
  });
})();
