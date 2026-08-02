window.SA_SUPABASE={"url":"https://hvbquuvxcswylyguplfb.supabase.co","anonKey":"sb_publishable_2VEdxWZCLW98qItINt6TPQ_r7y_Tcly"};window.SA_EMAIL="suesangelsfc@gmail.com";window.CP_CHUNKS={"match":"control-match.js?v=c4594f1d","photos":"control-photos.js?v=1aaaead8","squad":"control-squad.js?v=dc46a6fd","content":"control-content.js?v=a1d7ec90","photos-donations":"control-photos-donations.js?v=5ed0c2d5","pipeline":"control-pipeline.js?v=ed7d09c1","covers":"control-covers.js?v=4eb2aa4e","video":"control-video.js?v=71bfcd0a","hero":"control-hero.js?v=1e574542"};
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
  /* Club facts the generator knows and the browser otherwise could not: the
     club's own name, the squad, the competitions and opponents already in the
     record. Shipped as control-seed.js, ahead of this file. */
  var SEED = window.SA_SEED || {};

  /* ---- Confirm dialog: every destructive action goes through this ------ */
  function confirmAction(opts) {
    return new Promise(function (resolve) {
      var back = document.createElement('div');
      back.className = 'modal-backdrop';
      back.setAttribute('role', 'dialog');
      back.setAttribute('aria-modal', 'true');
      back.innerHTML =
        '<div class="modal glass glass--lg" style="width:min(96vw,560px)">' +
          '<div class="modal__head"><h2 class="mform__title">' + esc(opts.title) + '</h2></div>' +
          '<p class="cp-head__sub">' + esc(opts.body) + '</p>' +
          (opts.detail ? '<p class="cp-where">' + esc(opts.detail) + '</p>' : '') +
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

  /* ---- Section furniture -------------------------------------------------
     Every module opened with its own hand-built panel: an inline padding, an
     inline font size on the heading, an inline colour on the paragraph. Two
     sections were never quite the same and the panel could not be restyled
     without editing all thirteen. This is that pattern, written once.

     `sub`, `body` and `actions` are HTML and are NOT escaped, because they
     carry markup this file writes. Anything from the database that goes
     through them must be passed through esc() first. */
  function sec(o) {
    return '<section class="cp-sec' + (o.plain ? '' : ' panel cp-card') +
        (o.warn ? ' cp-note--warn' : '') + '">' +
      (o.title
        ? '<div class="cp-head"><div class="cp-head__text">' +
            '<h3 class="cp-head__title">' + esc(o.title) + '</h3>' +
            (o.sub ? '<p class="cp-head__sub">' + o.sub + '</p>' : '') +
          '</div>' +
          (o.actions ? '<div class="cp-head__actions">' + o.actions + '</div>' : '') +
        '</div>'
        : '') +
      (o.body || '') +
      (o.where ? where(o.where, o.whereNote) : '') +
    '</section>';
  }

  /* The commonest question about this panel is "and where does that turn up?".
     Every module answers it, with a link, rather than assuming the operator
     already holds the website's map in their head. */
  function where(links, note) {
    return '<p class="cp-where"><b>Shows on the website:</b> ' +
      links.map(function (l) {
        return '<a href="' + esc(l[1]) + '" target="_blank" rel="noopener">' + esc(l[0]) + '</a>';
      }).join(' &middot; ') +
      (note ? ' <span>' + esc(note) + '</span>' : '') + '</p>';
  }

  function feed(rows) {
    if (!rows.length) return '<p class="me__none">Nothing yet.</p>';
    return '<div class="cp-feed">' + rows.map(function (r) {
      return '<div class="cp-feed__row"><b>' + esc(r[0]) + '</b><time>' + esc(r[1]) + '</time></div>';
    }).join('') + '</div>';
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
  /* ---- Choosing an image file ------------------------------------------
     Shared, because three sections need it and none of them should carry
     their own copy of canvas resizing.

     Every image is resized and re-encoded in the browser before it leaves.
     A phone camera produces four or five megabytes; nothing on this site is
     drawn wider than about twelve hundred pixels. Uploading the original
     would put a multi-megabyte file on a page that needed forty kilobytes,
     and the club's own photographs are the one thing here nobody can
     optimise later without asking for them again.

     Returns a data URL and a blob. The caller decides which it wants: a
     player photograph is stored inline, because that is where the nineteen
     existing ones already live, and a badge or an article cover goes to
     storage, because a page showing five of them inline would carry them all
     as base64. */
  function readImage(file, opts) {
    var o = opts || {};
    var max = o.max || 520;
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type)) { reject(new Error('That is not an image.')); return; }
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('That file could not be read.')); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error('That image could not be opened.')); };
        img.onload = function () {
          var canvas = document.createElement('canvas');
          var ctx;
          if (o.square) {
            /* Cropped from the middle of the frame. A team photograph cropped
               from the top loses faces; from the middle it rarely does. */
            var side = Math.min(img.width, img.height);
            canvas.width = max;
            canvas.height = max;
            ctx = canvas.getContext('2d');
            ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, max, max);
          } else {
            var scale = Math.min(1, max / img.width);
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }
          /* PNG for anything that might have a transparent background, which
             a club badge usually does. A photograph never should: a JPEG of
             the same picture is a fraction of the size. */
          var type = o.keepAlpha ? 'image/png' : 'image/jpeg';
          var dataUrl = canvas.toDataURL(type, 0.82);
          canvas.toBlob(function (blob) {
            resolve({ dataUrl: dataUrl, blob: blob, was: file.size, type: type });
          }, type, 0.82);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* Resize, then put it in the club's storage bucket and hand back the public
     address. Used where an image is REFERENCED by a page rather than embedded
     in one record. */
  function uploadImage(file, opts) {
    var o = opts || {};
    return readImage(file, o).then(function (out) {
      var ext = out.type === 'image/png' ? 'png' : 'jpg';
      var name = (o.prefix || 'img') + '-' + Date.now() + '.' + ext;
      return CP.upload(o.bucket || 'gallery', name, out.blob).then(function (url) {
        return { url: url, was: out.was, now: out.blob.size };
      });
    });
  }

  function download(name, text, type) {
    var blob = new Blob([text], { type: type || 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  /* "r20251123-catania" carries the date and the opponent already; this makes
     it readable without another round trip for data the panel does not hold.
     It lives in the core because the dashboard, the covers and the video
     section all print match names and none of them should carry a copy. */
  function matchLabel(key) {
    var m = String(key).match(/^[a-z](\d{4})(\d{2})(\d{2})-(.+)$/);
    if (!m) return key;
    var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var opp = m[4].replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    return opp + ' \u00b7 ' + Number(m[3]) + ' ' + (MON[Number(m[2]) - 1] || '') + ' ' + m[1];
  }

  /* Anything somebody might paste out of YouTube: the share link, the address
     bar, an embed URL, a Short, a live URL, or the bare id. Returns the id or
     an empty string. Eleven characters is the format YouTube has always used. */
  function youtubeId(input) {
    var s2 = String(input || '').trim();
    if (!s2) return '';
    if (/^[\w-]{11}$/.test(s2)) return s2;
    var m = s2.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
    return m ? m[1] : '';
  }

  /* =================== MODULES =================== */
  /* The registry is global because two of the modules arrive later, in their
     own files, and register themselves into it. See `need()` below. */
  var M = (window.CPM = {});

  /* And this is what those files borrow rather than carrying second copies of.
     Everything here is defined above, so it is real by the time any chunk can
     possibly run: a chunk is only ever fetched from inside render(). */
  window.CPU = {
    $: $,
    $$: $$,
    esc: esc,
    toast: toast,
    guard: guard,
    confirmAction: confirmAction,
    sec: sec,
    where: where,
    table: table,
    empty: empty,
    tile: tile,
    feed: feed,
    fmtDate: fmtDate,
    csv: csv,
    download: download,
    readImage: readImage,
    uploadImage: uploadImage,
    matchLabel: matchLabel,
    youtubeId: youtubeId,
    refresh: function (key) { return refresh(key); },
  };

  /* ---- Dashboard ---- */
  M.dashboard = function (host) {
    return Promise.all([
      CP.readAll('matches'), CP.readAll('articles'), CP.readAll('gallery'),
      CP.readAll('recognition'), CP.readAll('fixtures'),
      CP.state.isAdmin ? CP.readEnquiries() : Promise.resolve([]),
      CP.state.isAdmin ? CP.readSupporters() : Promise.resolve([]),
      CP.readAll('player_photos'),
    ]).then(function (r) {
      var matches = r[0], articles = r[1], gallery = r[2], recog = r[3], fixtures = r[4];
      var enq = r[5] || [], sup = r[6] || [];

      var withReport = matches.filter(function (m) {
        return m.data && (m.data.polishedReport || m.data.commentary);
      }).length;
      var photos = gallery.reduce(function (a, g) { return a + ((g.data && g.data.photos) || []).length; }, 0);
      var newEnq = enq.filter(function (e) { return !e.status || e.status === 'new'; }).length;
      var photoCount = (r[7] || []).filter(function (x) { return /^\d+$/.test(x.key); }).length;

      var warn = [];
      if (!CP.state.isAdmin) {
        warn.push('This account is not in the administrator registry, so everything here is read-only. Run migration 002 and add the account to admin_users.');
      }
      if (!fixtures.length) warn.push('No fixtures are stored. The website shows "to be confirmed" until the new season fixtures are added.');
      if (matches.length - withReport > 0) {
        warn.push((matches.length - withReport) + ' matches have no written report. '
          + 'Results and reports, then Edit, then the Report tab.');
      }
      var noPhoto = (SEED.squad || []).length - photoCount;
      if (noPhoto > 0) {
        warn.push(noPhoto + ' players have no photograph, so they show as their initials. '
          + 'Player photographs.');
      }

      host.innerHTML =
        '<div class="grid grid--4" style="margin-bottom:var(--space-6)">' +
          tile(matches.length, 'Matches recorded') +
          tile(fixtures.length, 'Fixtures to come') +
          tile(withReport + ' of ' + matches.length, 'Matches with a report') +
          tile(photos, 'Photographs', gallery.length + ' albums') +
          tile(articles.length, 'Articles') +
          tile(recog.length, 'Recognition entries') +
          tile(CP.state.isAdmin ? newEnq : '-', 'New enquiries',
            CP.state.isAdmin ? enq.length + ' in all' : 'sign in as an administrator') +
          tile(CP.state.isAdmin ? sup.length : '-', 'Newsletter subscribers') +
        '</div>' +

        (warn.length
          ? sec({
            warn: true,
            title: 'Needs attention',
            body: '<ul class="cp-list">' + warn.map(function (w) {
              return '<li>' + esc(w) + '</li>';
            }).join('') + '</ul>',
          })
          : '') +

        '<div class="grid grid--2">' +
          sec({
            title: 'Recently changed',
            /* This listed raw row keys, which are the database's names for
               things and nobody else's. */
            body: feed(matches.slice()
              .sort(function (a, b) { return String(b.updated_at).localeCompare(String(a.updated_at)); })
              .slice(0, 6)
              .map(function (m) { return [matchLabel(m.key), fmtDate(m.updated_at)]; })),
          }) +
          sec({
            title: 'What usually needs doing',
            sub: 'Everything saved here reaches the website when you press <b>Publish to site</b>.',
            body: '<div class="cp-head__actions">' +
              '<button class="btn btn--glass btn--sm" data-goto="fixtures">Add a fixture</button>' +
              '<button class="btn btn--glass btn--sm" data-goto="results">Record a match</button>' +
              '<button class="btn btn--glass btn--sm" data-goto="news">Write an article</button>' +
              '<button class="btn btn--glass btn--sm" data-goto="photos">Add player photographs</button>' +
              '<button class="btn btn--glass btn--sm" data-goto="inbox">Read the inbox</button>' +
            '</div>',
          }) +
        '</div>';

      $$('[data-goto]', host).forEach(function (b) {
        b.addEventListener('click', function () { show(b.getAttribute('data-goto')); });
      });
      setCount('inbox', CP.state.isAdmin ? newEnq : 0);
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
      host.innerHTML = sec({
        title: 'Inbox',
        sub: 'Everything sent through the website: the join form, the contact form and the '
          + 'sponsorship form all land here, and so does every newsletter sign-up. '
          + 'They are hidden from anyone not signed in as an administrator, which is the '
          + 'row-level security policy doing its job.',
        body:
          '<div class="tabs" role="tablist">' +
            '<button class="tab" role="tab" aria-selected="true" data-tab="enq">Enquiries (' + enq.length + ')</button>' +
            '<button class="tab" role="tab" aria-selected="false" data-tab="sup">Subscribers (' + sup.length + ')</button>' +
          '</div>' +
          '<div data-tabpane="enq" style="margin-top:var(--space-4)">' +
            '<div class="cp-head">' +
              '<input class="input cp-search" data-search placeholder="Search name, email or message" ' +
                'aria-label="Search enquiries">' +
              '<div class="cp-head__actions">' +
                '<button class="btn btn--ghost btn--sm" data-csv-enq>Export CSV</button></div>' +
            '</div>' +
            (enq.length ? table(['Received', 'Name', 'Email', 'About', 'Message', ''], enq.map(function (e, i) {
              return '<tr>' +
                '<td>' + esc(fmtDate(e.created_at)) + '</td>' +
                '<td><b>' + esc(e.name) + '</b></td>' +
                '<td><a href="mailto:' + esc(e.email) + '">' + esc(e.email) + '</a></td>' +
                '<td>' + esc(e.type || e.enquiry_type || '-') + '</td>' +
                '<td class="cell-club">' + esc(String(e.message || '').slice(0, 90)) + '</td>' +
                '<td><button class="btn btn--quiet btn--sm" data-del-enq="' + i + '">Delete</button></td>' +
              '</tr>';
            }).join('')) : empty('No enquiries yet',
              'Submissions from the contact, join and sponsorship forms land here.')) +
          '</div>' +
          '<div data-tabpane="sup" hidden style="margin-top:var(--space-4)">' +
            '<div class="cp-head">' +
              '<p class="cp-note">' + esc(sup.length) + ' people get the newsletter.</p>' +
              '<div class="cp-head__actions">' +
                '<button class="btn btn--ghost btn--sm" data-csv-sup>Export CSV</button></div>' +
            '</div>' +
            (sup.length ? table(['Joined', 'Email', 'Where from'], sup.map(function (s2) {
              return '<tr><td>' + esc(fmtDate(s2.created_at)) + '</td><td>' + esc(s2.email) +
                '</td><td>' + esc(s2.source || '-') + '</td></tr>';
            }).join('')) : empty('No subscribers yet')) +
          '</div>',
        where: [['Join the club', '/join.html'], ['Club information', '/contact.html'],
          ['Sponsors', '/sponsors.html']],
        whereNote: 'these are the forms that feed it',
      });

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
    var st = CP.state;
    host.innerHTML =
      '<div class="grid grid--2">' +
        sec({
          title: 'Your access',
          body: '<dl class="cp-dl">' +
            '<div><dt>Signed in as</dt><dd>' + esc(st.user ? st.user.email : '-') + '</dd></div>' +
            '<div><dt>What the database says you are</dt><dd>' +
              (st.role ? '<span class="badge badge--success">' + esc(st.role) + '</span>'
                : '<span class="badge badge--warning">not registered</span>') + '</dd></div>' +
            '<div><dt>Can you change anything</dt><dd>' +
              (st.isAdmin ? 'Yes' : 'No, everything is read-only') + '</dd></div>' +
            '<div><dt>Your account id</dt><dd class="is-id">' +
              esc(st.user ? st.user.id : '-') + '</dd></div>' +
          '</dl>' +
          (!st.isAdmin
            ? '<p class="cp-note" style="margin-top:var(--space-4)">To grant access, run '
              + 'migrations/002_admin_role_and_rls.sql and insert the account id above into '
              + 'public.admin_users. Permission is the database’s answer, not this panel’s, which is '
              + 'why nothing here can grant it to itself.</p>'
            : ''),
        }) +

        sec({
          title: 'How a change reaches the website',
          body: '<p class="cp-note">Everything you save in this panel goes into the club’s database '
            + 'straight away. The website is a set of files built from that database, so it does not '
            + 'change until it is rebuilt. <b>Publish to site</b>, at the top of every screen, is what '
            + 'rebuilds it. It takes a couple of minutes, the site stays up throughout, and if the '
            + 'build fails the site stays exactly as it is.</p>' +
            '<p class="cp-note">Anything you have not saved does not go out. Anything you have saved '
            + 'does, including things saved days ago and never published.</p>',
        }) +

        sec({ title: 'Who changed what', body: '<div data-audit><p class="cp-note">Loading.</p></div>' }) +

        sec({
          title: 'Backup',
          sub: 'Every content table as one JSON file. Worth taking before any bulk change: it is the '
            + 'only copy that does not depend on the database being reachable.',
          actions: '<button class="btn btn--primary btn--sm" data-backup>Download a full backup</button>',
        }) +

        sec({
          title: 'Club details',
          sub: 'The club name, contact address, venue, social links and sponsorship packages are in '
            + 'the site’s own source so they ship as static HTML and are indexable rather than '
            + 'fetched when somebody arrives. Changing one is a code change and a rebuild.',
          body: '<p class="cp-note">Club email: <b>' + esc(window.SA_EMAIL || '') + '</b></p>',
        }) +
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
        ? feed(rows.map(function (a2) {
          return [(a2.action + ' ' + (a2.table_name || '') + ' ' + (a2.row_key || '')).trim(),
            fmtDate(a2.at)];
        }))
        : '<p class="cp-note">Nothing recorded yet.</p>';
    }).catch(function () {
      auditHost.innerHTML = '<p class="cp-note">The audit table is not there yet. '
        + 'Run migrations/002_admin_role_and_rls.sql to switch it on.</p>';
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

  /* ---- Loading a module when its panel is first opened -------------------
     This file used to carry all thirteen modules and hand every one of them
     to somebody who opened one. Its budget went 16 -> 18 -> 24 -> 30KB in a
     single sitting, always for that reason.

     The two heaviest are now separate files: the match form with its pitch,
     position codes and pickers, and the photograph tagger. Neither is fetched
     until its panel is opened, and the browser caches it from then on, so the
     cost is paid once by the people who actually use it and never by somebody
     signing in to read the inbox.

     A chunk registers itself into window.CPM, which is the same object `M` is,
     so once it has loaded nothing downstream can tell the difference. */
  var CHUNKS = window.CP_CHUNKS || {};
  var CHUNK_OF = {
    fixtures: 'match', results: 'match',
    phototag: 'photos',
    squad: 'squad',
    news: 'content', media: 'content', recognition: 'content',
    league: 'content', sponsors: 'content',
    photos: 'photos-donations', donations: 'photos-donations',
    pipeline: 'pipeline',
    covers: 'covers',
    videos: 'video',
    hero: 'hero',
  };
  var pending = {};
  function need(key) {
    var chunk = CHUNK_OF[key];
    if (!chunk || M[key]) return Promise.resolve();
    if (pending[chunk]) return pending[chunk];
    pending[chunk] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = '/' + (CHUNKS[chunk] || ('control-' + chunk + '.js'));
      s.onload = resolve;
      /* Forget the failure so pressing the section again retries, rather than
         caching a dead promise and looking permanently broken after one
         dropped connection. */
      s.onerror = function () {
        delete pending[chunk];
        reject(new Error('This section could not be downloaded. Check your connection and open it again.'));
      };
      document.head.appendChild(s);
    });
    return pending[chunk];
  }

  /* A section exists if the shell rendered a button for it. Asking M instead
     would now answer "no" for anything not yet downloaded, which would send
     a bookmarked #results straight back to the dashboard. */
  function known(key) { return !!key && !!$('[data-module="' + key + '"]'); }

  function render(key) {
    var panel = $('#panel-' + key);
    if (!panel) return;
    var spinner = $('[data-panel-loading]', panel);
    var old = $('[data-panel-body]', panel);
    if (spinner) spinner.hidden = false;

    /* REPLACE the body element, do not empty it.
       Every module attaches its listeners to this element and relies on
       events bubbling up from the rows it draws. Setting innerHTML = '' takes
       away the rows and leaves the listeners, so each refresh added another
       identical handler to the same node. Two renders in, one click ran the
       handler twice: two writes to the database, two toasts, two confirm
       dialogs, and a player added to the eleven twice by one choice. It got
       worse every time anything was saved, because saving refreshes.

       cloneNode(false) keeps the element and its attributes and takes nothing
       else, listeners included. */
    var body = old.cloneNode(false);
    old.parentNode.replaceChild(body, old);

    need(key)
      .then(function () {
        if (!M[key]) { body.innerHTML = empty('Not built yet'); return null; }
        return M[key](body);
      })
      .catch(function (e) {
        body.innerHTML = '<div class="state" style="border-color:var(--error)">' +
          '<p class="state__title">Could not load this section</p>' +
          '<p class="state__body">' + esc(e.message) + '</p></div>';
      })
      .then(function () { if (spinner) spinner.hidden = true; });
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
    show(known(start) ? start : 'dashboard');
  }

  $$('.cp-nav__item').forEach(function (b) {
    b.addEventListener('click', function () { show(b.getAttribute('data-module')); });
  });
  /* ---- Publish -------------------------------------------------------
     Everything in this panel writes to the database. The website is
     generated from a snapshot of it, so until this is pressed an edit is
     saved but not published. The confirm says exactly that, because
     "Publish" meaning "the thing you already saved now becomes visible" is
     not obvious from the word alone. */
  var pub = $('#cp-publish');
  if (pub) pub.addEventListener('click', function () {
    /* No client-side guard here, deliberately, and unlike every other write.
       Permission is the database's answer and this button's whole job is to go
       and get it. Refusing on the browser's copy of that answer means a wrong
       copy stops the request before anything can tell you it was wrong, which
       is exactly the situation where you most need to hear from the server. */
    confirmAction({
      title: 'Publish to the website?',
      body: 'This rebuilds the site from the database as it is right now. '
        + 'Everything saved in this panel goes live; anything you have not saved does not.',
      detail: 'It takes a couple of minutes. The site stays up throughout, and if the '
        + 'build fails the current site stays exactly as it is.',
      confirmLabel: 'Publish',
    }).then(function (yes) {
      if (!yes) return;
      pub.setAttribute('data-loading', 'true');
      pub.textContent = 'Publishing…';
      var tok = CP.state.session && CP.state.session.access_token;
      fetch('/api/publish', { method: 'POST', headers: { Authorization: 'Bearer ' + tok } })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (j) {
          pub.removeAttribute('data-loading');
          pub.textContent = 'Publish to site';
          if (j && j.ok) { toast(j.message || 'Publishing.', 'success'); return; }
          /* Say what actually happened. `detail` carries the status the
             database gave back when the fault is in the website rather than in
             the account, and printing it is the difference between somebody
             fixing this in a minute and somebody going to look at the wrong
             screen in Vercel. */
          toast((j && j.error) || 'Could not publish.', 'error');
          if (j && j.detail) toast(j.detail, 'error');
        })
        .catch(function () {
          pub.removeAttribute('data-loading');
          pub.textContent = 'Publish to site';
          toast('Could not reach the server.', 'error');
        });
    });
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
    if (k !== current && known(k)) show(k);
  });

  /* ---- The club word --------------------------------------------------
     Asked before the sign-in form is shown. This is a doorway, not a lock:
     the word is in a file anyone can download, so it stops a passer-by and a
     scanner, not an attacker. Everything that actually protects the club's
     data is server side and unchanged: Supabase Auth for identity, and the
     admin_users registry plus RLS for permission, neither of which this can
     grant. Getting the word wrong should therefore cost nothing except not
     seeing the form.

     Remembered for the session only, so a reload during an evening's work
     does not ask again, but a new day does. */
  var WORD = 'angels';
  var wordForm = $('#cp-word');
  var loginForm = $('#cp-login');

  function openLogin() {
    if (wordForm) wordForm.hidden = true;
    if (loginForm) {
      loginForm.hidden = false;
      var email = $('#cp-email');
      if (email) email.focus();
    }
  }

  try { if (sessionStorage.getItem('sa-cp-word') === WORD) openLogin(); } catch (e) {}

  function tryWord(fromSubmit) {
    var field = $('#cp-club-word');
    var err = $('#cp-word-error');
    if (!field) return false;
    var given = (field.value || '').trim().toLowerCase();
    if (given !== WORD) {
      /* Only complain when they actually pressed something. Typing the wrong
         letter should not shout at you mid-word. */
      if (fromSubmit) {
        err.textContent = 'That is not the club word.';
        err.hidden = false;
        field.select();
      }
      return false;
    }
    err.hidden = true;
    try { sessionStorage.setItem('sa-cp-word', WORD); } catch (e2) {}
    openLogin();
    return true;
  }

  /* Opens the moment the word is right, with no key to press. Belt and braces
     over the submit handler: whatever combination of Enter, the button, an
     autofill or a paste got the right text into the box, it goes through. */
  var wordField = $('#cp-club-word');
  if (wordField) {
    wordField.addEventListener('input', function () { tryWord(false); });
    wordField.addEventListener('change', function () { tryWord(false); });
  }
  if (wordForm) wordForm.addEventListener('submit', function (e) {
    e.preventDefault();
    tryWord(true);
  });

  /* Restore an existing session if the refresh token is still good. A valid
     session means somebody already got through the door, so it does not ask
     for the word again. */
  CP.refresh().then(function (s) {
    if (!s) return;
    return CP.loadRole().then(enterApp);
  });
})();
