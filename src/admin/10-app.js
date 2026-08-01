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

  /* ==========================================================================
     FIXTURES

     This was a raw JSON editor, like every other module. To add one match a
     volunteer had to invent a row key in the site's own id format, then type

       {"date":"","kick":"11:00","home":"Sue's Angels FC","away":"",
        "competition":"League Eight","venue":"","kind":"fixture"}

     by hand, with a JSON parse error as the only feedback. The table has nil
     rows and the season starts tomorrow, which is the review this design
     already failed.

     Now it is a form. The key is derived, "us" comes from the generator so
     the club's own name is never typed, and the opponent and competition are
     pickers built from clubs the record already knows, because a misspelt
     opponent silently loses that club's badge on the website.
     ========================================================================== */
  var SEED = window.SA_SEED || {};
  var US = SEED.club || "Sue's Angels FC";

  /* The site's row-key format: f + YYYYMMDD + a slug of the opponent. Derived
     rather than asked for, because it is a format, not a decision. */
  function fixtureKey(iso, opponent) {
    var slug = String(opponent || 'tbc').toLowerCase()
      .replace(/\b(fc|afc|cf|united|town|club)\b/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-')[0] || 'tbc';
    return 'f' + String(iso || '').replace(/-/g, '') + '-' + slug;
  }

  /* The site prints `date` as written, so it is stored in the same "02 Aug
     2026" form the rest of the record uses rather than an ISO string. */
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function prettyDate(iso) {
    var p = String(iso || '').split('-');
    if (p.length !== 3) return '';
    return p[2] + ' ' + (MONTHS[Number(p[1]) - 1] || '') + ' ' + p[0];
  }

  function optionList(id, values) {
    return '<datalist id="' + id + '">' +
      (values || []).map(function (v) { return '<option value="' + esc(v) + '"></option>'; }).join('') +
      '</datalist>';
  }

  M.fixtures = function (host) {
    return CP.readAll('fixtures').then(function (rows) {
      var list = (rows || []).slice().sort(function (a, b) {
        return String(a.key).localeCompare(String(b.key));
      });
      var have = {};
      list.forEach(function (r) { have[r.key] = true; });
      var missing = (SEED.baselineFixtures || []).filter(function (f) { return !have[f.id]; });

      host.innerHTML =
        /* The six pre-season fixtures are already transcribed in the site's
           code baseline and shown on the website from there. Until they are
           real rows nobody can edit them without a deploy. */
        (missing.length
          ? '<div class="panel" style="padding:var(--space-5);margin-bottom:var(--space-5);border-color:var(--warning)">' +
            '<h3 style="font-size:var(--step-1);margin-bottom:var(--space-2)">' +
              esc(missing.length) + ' fixture' + (missing.length === 1 ? '' : 's') + ' are not in the database yet</h3>' +
            '<p style="font-size:var(--step--1);color:var(--text-muted);max-width:70ch">' +
              'The website is showing these from the code baseline, which means they cannot be ' +
              'edited here and a change needs a developer. Import them once and they become ' +
              'ordinary rows you control.</p>' +
            '<p style="margin-top:var(--space-3);font-size:var(--step--2);color:var(--text-subtle)">' +
              esc(missing.map(function (f) { return f.date + ' ' + f.home + ' v ' + f.away; }).join(' · ')) + '</p>' +
            '<button class="btn btn--primary" style="margin-top:var(--space-4)" data-import>' +
              'Import ' + esc(missing.length) + ' fixtures</button>' +
          '</div>'
          : '') +

        '<div class="panel" style="padding:var(--space-5);margin-bottom:var(--space-5)">' +
          '<h3 style="font-size:var(--step-1);margin-bottom:var(--space-4)">Add a fixture</h3>' +
          '<div class="grid grid--2" style="gap:var(--space-4)">' +
            '<div class="field"><label class="field__label" for="fx-date">Date</label>' +
              '<input class="input" id="fx-date" type="date"></div>' +
            '<div class="field"><label class="field__label" for="fx-kick">Kick-off</label>' +
              '<input class="input" id="fx-kick" type="time" value="11:00"></div>' +
            '<div class="field"><label class="field__label" for="fx-opp">Opponent</label>' +
              '<input class="input" id="fx-opp" list="fx-clubs" placeholder="Start typing a club"></div>' +
            '<div class="field"><label class="field__label" for="fx-comp">Competition</label>' +
              '<input class="input" id="fx-comp" list="fx-comps" value="' + esc(SEED.division || '') + '"></div>' +
            '<div class="field"><label class="field__label" for="fx-ha">Home or away</label>' +
              '<select class="select" id="fx-ha">' +
                '<option value="home">Home</option><option value="away">Away</option>' +
                '<option value="neutral">Neutral ground</option></select></div>' +
            '<div class="field"><label class="field__label" for="fx-venue">Venue</label>' +
              '<input class="input" id="fx-venue" placeholder="' + esc(SEED.venue || '') + '"></div>' +
          '</div>' +
          optionList('fx-clubs', SEED.clubs) + optionList('fx-comps', SEED.competitions) +
          '<p class="field__error" data-fx-err hidden style="margin-top:var(--space-3)"></p>' +
          '<div class="row" style="margin-top:var(--space-4);gap:var(--space-3);align-items:center">' +
            '<button class="btn btn--primary" data-fx-add>Add fixture</button>' +
            '<span style="font-size:var(--step--2);color:var(--text-subtle)" data-fx-preview></span>' +
          '</div>' +
        '</div>' +

        (list.length
          ? table(['Date', 'Fixture', 'Competition', 'Kick-off', ''], list.map(function (r) {
            var f = r.data || {};
            return '<tr data-key="' + esc(r.key) + '">' +
              '<td>' + esc(f.date || '') + '</td>' +
              '<td><b>' + esc(f.home || '') + '</b> v <b>' + esc(f.away || '') + '</b><br>' +
                '<span style="font-size:var(--step--2);color:var(--text-subtle)">' + esc(r.key) + '</span></td>' +
              '<td>' + esc(f.competition || '') + '</td>' +
              '<td>' + esc(f.kick || '') + '</td>' +
              '<td><button class="btn btn--ghost btn--sm" data-del>Remove</button></td>' +
            '</tr>';
          }).join(''))
          : empty('No fixtures stored', 'Add one above and it appears on the website immediately, including the next-match card on the home page.'));

      var err = $('[data-fx-err]', host);
      var preview = $('[data-fx-preview]', host);

      function readForm() {
        var iso = $('#fx-date', host).value;
        var opp = $('#fx-opp', host).value.trim();
        var ha = $('#fx-ha', host).value;
        var weAreHome = ha === 'home';
        return {
          iso: iso,
          opponent: opp,
          key: fixtureKey(iso, opp),
          row: {
            kind: 'fixture',
            date: prettyDate(iso),
            iso: iso,
            kick: $('#fx-kick', host).value || '',
            home: weAreHome ? US : opp,
            away: weAreHome ? opp : US,
            competition: $('#fx-comp', host).value.trim(),
            venue: $('#fx-venue', host).value.trim() || (weAreHome ? (SEED.venue || '') : ''),
            neutral: ha === 'neutral' || undefined,
          },
        };
      }

      /* The derived key is shown as it is typed, so the format is visible
         rather than surprising. */
      function paintPreview() {
        var f = readForm();
        preview.textContent = f.iso && f.opponent ? 'Saves as ' + f.key : '';
      }
      ['#fx-date', '#fx-opp', '#fx-ha'].forEach(function (sel) {
        var el = $(sel, host);
        if (el) el.addEventListener('input', paintPreview);
      });

      host.addEventListener('click', function (e) {
        if (e.target.matches('[data-import]')) {
          if (!guard()) return;
          e.target.setAttribute('data-loading', 'true');
          /* Sequential, not parallel: a partial import is far easier to reason
             about when the rows land in order. */
          missing.reduce(function (chain, f) {
            return chain.then(function () {
              return CP.upsert('fixtures', f.id, {
                kind: 'fixture', date: f.date, home: f.home, away: f.away,
                competition: f.competition || 'Pre-season friendly',
                kick: f.kick || '', venue: f.venue || '',
              });
            });
          }, Promise.resolve()).then(function () {
            toast('Imported ' + missing.length + ' fixtures', 'success');
            refresh('fixtures');
          }).catch(function (e2) {
            toast(e2.message, 'error');
            e.target.removeAttribute('data-loading');
          });
          return;
        }

        if (e.target.matches('[data-fx-add]')) {
          if (!guard()) return;
          var f = readForm();
          if (!f.iso) { err.textContent = 'Pick a date.'; err.hidden = false; return; }
          if (!f.opponent) { err.textContent = 'Name the opponent.'; err.hidden = false; return; }
          if (have[f.key]) { err.textContent = 'A fixture with the key ' + f.key + ' already exists.'; err.hidden = false; return; }
          err.hidden = true;
          CP.upsert('fixtures', f.key, f.row).then(function () {
            toast('Fixture added', 'success');
            refresh('fixtures');
          }).catch(function (e2) { err.textContent = e2.message; err.hidden = false; });
          return;
        }

        if (e.target.matches('[data-del]')) {
          if (!guard()) return;
          var row = e.target.closest('tr[data-key]');
          var key = row.getAttribute('data-key');
          confirmAction({
            title: 'Remove this fixture?',
            body: 'It disappears from the website immediately.',
            detail: key,
            confirmLabel: 'Remove',
          }).then(function (yes) {
            if (!yes) return;
            CP.remove('fixtures', key).then(function () {
              toast('Fixture removed', 'success');
              refresh('fixtures');
            }).catch(function (e2) { toast(e2.message, 'error'); });
          });
        }
      });
    });
  };

  /* ==========================================================================
     RESULTS

     This was a JSON textarea. To record a match you typed a document of
     shirt numbers and nested arrays into a box, with a parse error as your
     only feedback, and even then it did not work: the scoreline, the
     opponent and the date were not in the database at all. They came from a
     baseline file in the code, so the panel let you describe a match a
     developer had already added and nothing more.

     dataset.mjs now lets a match record carry the whole match, so this form
     records the result AND its detail in one place. Players are picked from
     the squad; shirt numbers stay the storage key, which is what the record
     has always used, and are never shown on the website.
     ========================================================================== */
  var SQUAD = (SEED.squad || []).slice().sort(function (a, b) { return a.num - b.num; });
  var nameOfNum = {};
  SQUAD.forEach(function (p) { nameOfNum[p.num] = p.name; });

  function playerPicker(field, chosen, label) {
    var set = {};
    (chosen || []).forEach(function (n) { set[n] = (set[n] || 0) + 1; });
    return '<div class="field"><label class="field__label">' + esc(label) + '</label>' +
      '<div class="pickrow" data-pick="' + esc(field) + '">' +
      SQUAD.map(function (p) {
        var n = set[p.num] || 0;
        return '<button type="button" class="pick' + (n ? ' is-on' : '') + '" data-num="' + p.num + '">' +
          esc(p.name) + (n > 1 ? ' <b>x' + n + '</b>' : '') + '</button>';
      }).join('') +
      '</div></div>';
  }

  function selectField(id, label, options, value) {
    return '<div class="field"><label class="field__label" for="' + id + '">' + esc(label) + '</label>' +
      '<select class="select" id="' + id + '">' +
      '<option value="">Not recorded</option>' +
      options.map(function (o) {
        return '<option value="' + esc(o.v) + '"' + (String(o.v) === String(value) ? ' selected' : '') + '>' +
          esc(o.t) + '</option>';
      }).join('') + '</select></div>';
  }

  M.results = function (host) {
    return CP.readAll('matches').then(function (rows) {
      var list = (rows || []).slice().sort(function (a, b) {
        return String(b.key).localeCompare(String(a.key));
      });

      host.innerHTML =
        '<div class="panel" style="padding:var(--space-5);margin-bottom:var(--space-5)">' +
          '<div class="row row--between" style="align-items:center">' +
            '<div><h3 style="font-size:var(--step-1)">Match records</h3>' +
            '<p style="font-size:var(--step--1);color:var(--text-muted);margin-top:var(--space-2)">' +
              esc(list.length) + ' recorded. Editing one opens a form, not JSON. Changes reach the ' +
              'website after a sync.</p></div>' +
            '<button class="btn btn--primary" data-new-match>Record a match</button>' +
          '</div>' +
        '</div>' +
        table(['Match', 'Score', 'Report', 'Goals', 'XI', ''], list.map(function (r) {
          var d = r.data || {};
          var score = (d.hs != null && d.as != null) ? d.hs + '-' + d.as : '-';
          return '<tr data-key="' + esc(r.key) + '">' +
            '<td><b>' + esc(matchLabel(r.key)) + '</b><br><span style="font-size:var(--step--2);color:var(--text-subtle)">' + esc(r.key) + '</span></td>' +
            '<td>' + esc(score) + '</td>' +
            '<td>' + ((d.polishedReport || d.commentary)
              ? '<span class="badge badge--success">Yes</span>'
              : '<span class="badge badge--warning">No</span>') + '</td>' +
            '<td>' + esc((d.goals || []).length) + '</td>' +
            '<td>' + esc((d.starters || []).length) + '</td>' +
            '<td><button class="btn btn--ghost btn--sm" data-edit>Edit</button> ' +
                '<a class="btn btn--quiet btn--sm" href="/matches/' + esc(r.key) + '.html" target="_blank" rel="noopener">View</a></td>' +
          '</tr>';
        }).join(''));

      function open(key) {
        var rec = list.filter(function (x) { return x.key === key; })[0]
          || { key: '', data: { starters: [], bench: [], goals: [], assists: [] } };
        /* The row's own fixture fields win; the baseline fills the rest, so a
           match whose scoreline still lives in code opens with its real date
           and score rather than an empty form. */
        var base = (SEED.matches || []).filter(function (x) { return x.id === rec.key; })[0] || {};
        var d = Object.assign({}, base, rec.data || {});
        var isNew = !rec.key;
        var weAreHome = d.home ? /Sue.s Angels/.test(d.home) : true;
        var opp = weAreHome ? (d.away || '') : (d.home || '');

        var back = document.createElement('div');
        back.className = 'modal-backdrop';
        back.setAttribute('role', 'dialog');
        back.setAttribute('aria-modal', 'true');
        back.innerHTML =
          '<div class="modal glass glass--lg" style="max-width:min(94vw,780px);max-height:90vh;overflow:auto">' +
            '<div class="modal__head"><h2 style="font-size:var(--step-2)">' +
              (isNew ? 'Record a match' : esc(matchLabel(rec.key))) + '</h2></div>' +

            '<h3 class="mform__h">The match</h3>' +
            '<div class="grid grid--2" style="gap:var(--space-4)">' +
              '<div class="field"><label class="field__label" for="m-date">Date</label>' +
                '<input class="input" id="m-date" type="date" value="' + esc(isoFromPretty(d.date)) + '"></div>' +
              '<div class="field"><label class="field__label" for="m-kick">Kick-off</label>' +
                '<input class="input" id="m-kick" type="time" value="' + esc(d.kick || '11:00') + '"></div>' +
              '<div class="field"><label class="field__label" for="m-opp">Opponent</label>' +
                '<input class="input" id="m-opp" list="m-clubs" value="' + esc(opp) + '"></div>' +
              '<div class="field"><label class="field__label" for="m-comp">Competition</label>' +
                '<input class="input" id="m-comp" list="m-comps" value="' + esc(d.competition || SEED.division || '') + '"></div>' +
              '<div class="field"><label class="field__label" for="m-ha">Home or away</label>' +
                '<select class="select" id="m-ha">' +
                  '<option value="home"' + (weAreHome ? ' selected' : '') + '>Home</option>' +
                  '<option value="away"' + (!weAreHome ? ' selected' : '') + '>Away</option></select></div>' +
              '<div class="field"><label class="field__label" for="m-kind">Result type</label>' +
                '<select class="select" id="m-kind">' +
                  ['score', 'walkover', 'penalty', 'fixture'].map(function (k) {
                    return '<option value="' + k + '"' + ((d.kind || 'score') === k ? ' selected' : '') + '>' +
                      ({ score: 'Played, normal result', walkover: 'Awarded (walkover)',
                         penalty: 'Decided on penalties', fixture: 'Not played yet' })[k] + '</option>';
                  }).join('') + '</select></div>' +
              '<div class="field"><label class="field__label" for="m-us">' + esc(SEED.club || 'Us') + ' goals</label>' +
                '<input class="input" id="m-us" type="number" min="0" value="' + esc(weAreHome ? (d.hs != null ? d.hs : '') : (d.as != null ? d.as : '')) + '"></div>' +
              '<div class="field"><label class="field__label" for="m-them">Opponent goals</label>' +
                '<input class="input" id="m-them" type="number" min="0" value="' + esc(weAreHome ? (d.as != null ? d.as : '') : (d.hs != null ? d.hs : '')) + '"></div>' +
            '</div>' +
            optionList('m-clubs', SEED.clubs) + optionList('m-comps', SEED.competitions) +

            '<h3 class="mform__h">Who played</h3>' +
            playerPicker('starters', (d.starters || []).map(function (x) { return x.num; }), 'Starting eleven') +
            playerPicker('bench', (d.bench || []).map(function (x) { return x.num; }), 'Bench') +

            '<h3 class="mform__h">Goals and assists</h3>' +
            '<p style="font-size:var(--step--2);color:var(--text-subtle);margin-bottom:var(--space-3)">' +
              'Click a player once per goal. Click again for a second.</p>' +
            playerPicker('goals', (d.goals || []).map(function (x) { return x.num; }), 'Scorers') +
            playerPicker('assists', (d.assists || []).map(function (x) { return x.num; }), 'Assists') +

            '<h3 class="mform__h">Recognition</h3>' +
            '<div class="grid grid--2" style="gap:var(--space-4)">' +
              selectField('m-motm', 'Player of the Match',
                SQUAD.map(function (p) { return { v: p.num, t: p.name }; }), d.motm) +
              selectField('m-capt', 'Captain',
                SQUAD.map(function (p) { return { v: p.num, t: p.name }; }), d.captain) +
            '</div>' +

            '<h3 class="mform__h">Match report</h3>' +
            '<div class="field"><textarea class="textarea" id="m-report" rows="8" ' +
              'placeholder="How the game went. Blank lines separate paragraphs.">' +
              esc(d.commentary || '') + '</textarea>' +
              '<p class="field__hint" data-words>' + words(d.commentary) + '</p></div>' +

            '<p class="field__error" data-err hidden></p>' +
            '<div class="modal__foot">' +
              '<button class="btn btn--ghost" data-cancel>Cancel</button>' +
              '<button class="btn btn--primary" data-save>Save match</button>' +
            '</div>' +
          '</div>';
        document.body.appendChild(back);

        var counts = {
          starters: (d.starters || []).map(function (x) { return x.num; }),
          bench: (d.bench || []).map(function (x) { return x.num; }),
          goals: (d.goals || []).map(function (x) { return x.num; }),
          assists: (d.assists || []).map(function (x) { return x.num; }),
        };

        /* One click adds, and for goals and assists a second click adds a
           SECOND one rather than removing the first, because a brace is
           commoner than a mistake. Right-click, or shift-click, removes. */
        back.addEventListener('click', function (e) {
          var pick = e.target.closest('.pick');
          if (pick) {
            var group = pick.closest('[data-pick]').getAttribute('data-pick');
            var num = Number(pick.getAttribute('data-num'));
            var arr = counts[group];
            var multi = group === 'goals' || group === 'assists';
            var i = arr.indexOf(num);
            if (e.shiftKey || (!multi && i !== -1)) {
              if (i !== -1) arr.splice(i, 1);
            } else arr.push(num);
            var n = arr.filter(function (x) { return x === num; }).length;
            pick.classList.toggle('is-on', n > 0);
            pick.innerHTML = esc(nameOfNum[num]) + (n > 1 ? ' <b>x' + n + '</b>' : '');
            return;
          }
          if (e.target.matches('[data-cancel]') || e.target === back) { back.remove(); return; }
          if (!e.target.matches('[data-save]')) return;

          var err = $('[data-err]', back);
          var iso = $('#m-date', back).value;
          var oppName = $('#m-opp', back).value.trim();
          if (!iso) { err.textContent = 'Pick a date.'; err.hidden = false; return; }
          if (!oppName) { err.textContent = 'Name the opponent.'; err.hidden = false; return; }
          var home = $('#m-ha', back).value === 'home';
          var kind = $('#m-kind', back).value;
          var us = $('#m-us', back).value;
          var them = $('#m-them', back).value;
          if (kind === 'score' && (us === '' || them === '')) {
            err.textContent = 'A played match needs both scores.'; err.hidden = false; return;
          }
          err.hidden = true;

          var key = rec.key || ('r' + iso.replace(/-/g, '') + '-' + slugOf(oppName));
          var next = Object.assign({}, d, {
            date: prettyDate(iso),
            kick: $('#m-kick', back).value || '',
            home: home ? SEED.club : oppName,
            away: home ? oppName : SEED.club,
            competition: $('#m-comp', back).value.trim(),
            kind: kind,
            starters: counts.starters.map(function (n) { return { num: n, positions: posOf(n) }; }),
            bench: counts.bench.map(function (n) { return { num: n }; }),
            goals: counts.goals.map(function (n) { return { num: n }; }),
            assists: counts.assists.map(function (n) { return { num: n }; }),
            motm: $('#m-motm', back).value === '' ? null : Number($('#m-motm', back).value),
            captain: $('#m-capt', back).value === '' ? null : Number($('#m-capt', back).value),
            commentary: $('#m-report', back).value,
            savedAt: new Date().toISOString(),
          });
          if (kind === 'score' || kind === 'penalty') {
            next.hs = Number(home ? us : them);
            next.as = Number(home ? them : us);
          } else { delete next.hs; delete next.as; }

          CP.upsert('matches', key, next).then(function () {
            toast('Match saved', 'success');
            back.remove();
            refresh('results');
          }).catch(function (e2) { err.textContent = e2.message; err.hidden = false; });
        });

        var rep = $('#m-report', back);
        if (rep) rep.addEventListener('input', function () {
          $('[data-words]', back).textContent = words(rep.value);
        });
      }

      function posOf(num) {
        var p = SQUAD.filter(function (x) { return x.num === num; })[0];
        return p && p.pos ? [p.pos] : [];
      }

      host.addEventListener('click', function (e) {
        if (e.target.matches('[data-new-match]')) { if (guard()) open(''); return; }
        if (!e.target.matches('[data-edit]')) return;
        if (!guard()) return;
        open(e.target.closest('tr[data-key]').getAttribute('data-key'));
      });
    });
  };

  function words(t) {
    var n = String(t || '').trim().split(/\s+/).filter(Boolean).length;
    return n ? n + ' words, about ' + Math.max(1, Math.round(n / 200)) + ' min to read' : 'No report yet';
  }
  function slugOf(name) {
    return String(name).toLowerCase().replace(/\b(fc|afc|united|town|club)\b/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-')[0] || 'opp';
  }
  /* "31 May 26" back to an ISO date the picker understands. */
  function isoFromPretty(s) {
    var m = String(s || '').match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2,4})$/);
    if (!m) return '';
    var i = MONTHS.indexOf(m[2].slice(0, 3));
    if (i === -1) return '';
    var y = m[3].length === 2 ? '20' + m[3] : m[3];
    return y + '-' + String(i + 1).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0');
  }

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


  /* ---- Photo tagger: name the players in a given photograph -------------
     The album editor is raw JSON by design, which is right for a document
     with a varied shape, but it is the wrong tool for going through 175
     photographs and saying who is in each one. This does that specific job:
     the photograph on screen, the squad as buttons, click to tag.

     photoTags is an ARRAY running parallel to photos: entry i names who is
     in photo i, empty where nobody is. That is the shape the club's existing
     448 tagged photographs are already stored in, so this reads and writes
     the same thing rather than a second competing format.

     Nothing else in the record is touched, so the JSON editor and this can be
     used on the same album without either losing the other's work. */
  M.phototag = function (host) {
    return Promise.all([CP.readAll('gallery'), CP.readAll('player_photos')]).then(function (r) {
      var albums = r[0] || [];
      var roster = [];
      (r[1] || []).forEach(function (row) {
        if (row.key.indexOf('roster') !== 0) return;
        var d = row.data || {};
        var list = d.players || d.roster || (Array.isArray(d) ? d : []);
        list.forEach(function (p) {
          var name = p && (p.name || ((p.first || '') + ' ' + (p.last || '')).trim());
          if (name) roster.push(name);
        });
      });
      /* The album's own tag list is the fallback squad when the roster record
         is not readable, so the tool still works signed out. */
      /* Everyone already tagged anywhere is a candidate too, so the button
         list matches the names the club has been using rather than a
         different spelling from the roster record. */
      albums.forEach(function (a) {
        var da = a.data || {};
        (da.tags || []).forEach(function (t) { roster.push(t); });
        var pt = da.photoTags;
        if (Array.isArray(pt)) pt.forEach(function (list) { (list || []).forEach(function (t) { roster.push(t); }); });
      });
      roster = roster.filter(function (v, i, arr) { return arr.indexOf(v) === i; }).sort();

      if (!albums.length) {
        host.innerHTML = empty('No albums yet', 'Create an album under Gallery and video first.');
        return;
      }

      host.innerHTML =
        '<div class="panel" style="padding:var(--space-5);margin-bottom:var(--space-5)">' +
          '<h3 style="font-size:var(--step-1);margin-bottom:var(--space-3)">Tag players in a photograph</h3>' +
          '<p style="font-size:var(--step--1);color:var(--text-muted);margin-bottom:var(--space-4)">' +
            'Pick an album, step through the photographs and click a name to tag them. ' +
            'Tagged names appear under that photograph on the website and link to the player&rsquo;s profile.</p>' +
          '<label class="field"><span class="field__label">Album</span>' +
            '<select class="input" data-album>' +
              albums.map(function (a, i) {
                var d = a.data || {};
                return '<option value="' + i + '">' + esc(d.title || a.key) +
                  ' (' + ((d.photos || []).length) + ')</option>';
              }).join('') +
            '</select></label>' +
        '</div>' +
        '<div data-tagger></div>';

      var pane = $('[data-tagger]', host);
      var sel = $('[data-album]', host);
      var idx = 0;
      var album, photos, tags, dirty = false;

      function load() {
        album = albums[+sel.value];
        photos = ((album.data || {}).photos || []).filter(Boolean);
        /* Normalise whatever is stored into an array as long as the album,
           so a short or missing list does not drop tags off the end. */
        var raw = (album.data || {}).photoTags;
        tags = [];
        for (var i = 0; i < photos.length; i++) {
          var at = Array.isArray(raw) ? raw[i]
            : (raw && typeof raw === 'object') ? raw[String(i)] : null;
          /* A tag is either a plain name or a detailed record. Read as
             objects throughout so the editor has somewhere to put role,
             focus and rating; plain names are written back out as plain
             names, so an album nobody has refined stays byte-identical. */
          tags.push((at || []).map(function (t) {
            return typeof t === 'string'
              ? { name: t, role: 'present' }
              : { name: t.name, role: t.role === 'subject' ? 'subject' : 'present',
                  focus: t.focus || null, rating: t.rating || null, note: t.note || '' };
          }));
        }
        idx = 0; dirty = false;
        paint();
      }

      function currentTags() { return tags[idx] || []; }

      function paint() {
        if (!photos.length) {
          pane.innerHTML = empty('No photographs in this album', 'Add photographs to the album first.');
          return;
        }
        var mine = currentTags();
        var tagged = tags.filter(function (t) { return t && t.length; }).length;
        pane.innerHTML =
          '<div class="panel" style="padding:var(--space-5)">' +
            '<div class="row row--between" style="margin-bottom:var(--space-4)">' +
              '<p style="font-size:var(--step--1);color:var(--text-muted)">Photograph ' +
                esc(idx + 1) + ' of ' + esc(photos.length) + ' &middot; ' + esc(tagged) + ' tagged</p>' +
              '<div class="row row--tight">' +
                '<button class="btn btn--ghost btn--sm" data-prev>Previous</button>' +
                '<button class="btn btn--ghost btn--sm" data-next>Next</button>' +
                '<button class="btn btn--primary btn--sm" data-save' + (dirty ? '' : ' disabled') + '>Save album</button>' +
              '</div>' +
            '</div>' +
            '<img src="' + esc(photos[idx]) + '" alt="" ' +
              'style="width:100%;max-height:52vh;object-fit:contain;border-radius:var(--radius-sm);background:var(--surface-inset)" />' +
            '<p style="margin:var(--space-4) 0 var(--space-2);font-size:var(--step--1);color:var(--text-muted)">' +
              'In this photograph' + (mine.length ? '' : ': nobody tagged yet') + '</p>' +
            '<div class="row row--tight" style="flex-wrap:wrap;gap:6px">' +
              roster.map(function (n) {
                var on = false;
                mine.forEach(function (t) { if (t.name === n) on = true; });
                return '<button class="btn btn--sm ' + (on ? 'btn--primary' : 'btn--ghost') +
                  '" data-tag="' + esc(n) + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + esc(n) + '</button>';
              }).join('') +
            '</div>' +
            /* Precision lives here: for each person already tagged in this
               frame, say whether the photograph is OF them, where they are in
               it, and how good it is. That is what lets the website pick
               pictures for a player on its own. */
            (mine.length
              ? '<div style="margin-top:var(--space-5);border-top:1px solid var(--border);padding-top:var(--space-4)">' +
                  '<p style="font-size:var(--step--1);color:var(--text-muted);margin-bottom:var(--space-3)">' +
                    'Mark someone as the <strong>subject</strong> and this photograph becomes usable as their picture ' +
                    'across the site. Click the image to set where they are in the frame so any crop keeps them in it.</p>' +
                  mine.map(function (t, ti) {
                    return '<div class="row row--between" style="gap:var(--space-3);padding:var(--space-3) 0;flex-wrap:wrap">' +
                      '<strong style="font-size:var(--step--1)">' + esc(t.name) + '</strong>' +
                      '<div class="row row--tight" style="flex-wrap:wrap;gap:6px">' +
                        '<button class="btn btn--sm ' + (t.role === 'subject' ? 'btn--primary' : 'btn--ghost') +
                          '" data-role="' + ti + '">' + (t.role === 'subject' ? 'Subject' : 'In shot') + '</button>' +
                        '<button class="btn btn--sm ' + (t.focus ? 'btn--primary' : 'btn--ghost') +
                          '" data-focus="' + ti + '">' +
                          (t.focus ? 'Focus ' + Math.round(t.focus[0]) + ',' + Math.round(t.focus[1]) : 'Set focus') + '</button>' +
                        [1, 2, 3, 4, 5].map(function (r) {
                          return '<button class="btn btn--sm ' + (t.rating === r ? 'btn--primary' : 'btn--ghost') +
                            '" data-rate="' + ti + ':' + r + '" title="Rate ' + r + '">' + r + '</button>';
                        }).join('') +
                      '</div>' +
                    '</div>';
                  }).join('') +
                '</div>'
              : '') +
          '</div>';

        $('[data-prev]', pane).addEventListener('click', function () {
          idx = (idx - 1 + photos.length) % photos.length; paint();
        });
        $('[data-next]', pane).addEventListener('click', function () {
          idx = (idx + 1) % photos.length; paint();
        });
        $$('[data-tag]', pane).forEach(function (b) {
          b.addEventListener('click', function () {
            var n = b.getAttribute('data-tag');
            var mineNow = (tags[idx] || []).slice();
            var at = -1;
            for (var j = 0; j < mineNow.length; j++) if (mineNow[j].name === n) at = j;
            if (at >= 0) mineNow.splice(at, 1);
            else mineNow.push({ name: n, role: 'present', focus: null, rating: null, note: '' });
            tags[idx] = mineNow;
            dirty = true;
            paint();
          });
        });
        $$('[data-role]', pane).forEach(function (b) {
          b.addEventListener('click', function () {
            var t = tags[idx][+b.getAttribute('data-role')];
            t.role = t.role === 'subject' ? 'present' : 'subject';
            dirty = true; paint();
          });
        });
        $$('[data-rate]', pane).forEach(function (b) {
          b.addEventListener('click', function () {
            var parts = b.getAttribute('data-rate').split(':');
            var t = tags[idx][+parts[0]];
            var r = +parts[1];
            t.rating = t.rating === r ? null : r;
            dirty = true; paint();
          });
        });
        /* Focus is set by clicking the photograph itself: far quicker and far
           more accurate than typing two percentages. */
        var focusFor = null;
        $$('[data-focus]', pane).forEach(function (b) {
          b.addEventListener('click', function () {
            focusFor = +b.getAttribute('data-focus');
            var t = tags[idx][focusFor];
            if (t.focus) { t.focus = null; dirty = true; focusFor = null; paint(); return; }
            b.textContent = 'Click the photo';
          });
        });
        var shot = $('img', pane);
        if (shot) shot.addEventListener('click', function (e) {
          if (focusFor === null) return;
          var r = shot.getBoundingClientRect();
          tags[idx][focusFor].focus = [
            Math.round(((e.clientX - r.left) / r.width) * 100),
            Math.round(((e.clientY - r.top) / r.height) * 100),
          ];
          focusFor = null; dirty = true; paint();
        });

        var saveBtn = $('[data-save]', pane);
        if (saveBtn) saveBtn.addEventListener('click', function () {
          /* Merge onto the record rather than replacing it: the album carries
             photos, a cover, badges and a credit, and none of that belongs to
             this tool. */
          /* A tag with nothing set beyond a name is written back as a plain
             string, exactly as it was stored. Only a refined tag becomes an
             object, so refining one photograph does not rewrite the other
             six hundred. */
          var payload = tags.map(function (list) {
            return (list || []).map(function (t) {
              if (t.role !== 'subject' && !t.focus && !t.rating && !t.note) return t.name;
              var o = { name: t.name, role: t.role };
              if (t.focus) o.focus = t.focus;
              if (t.rating) o.rating = t.rating;
              if (t.note) o.note = t.note;
              return o;
            });
          });
          var next = Object.assign({}, album.data || {}, { photoTags: payload });
          saveBtn.disabled = true;
          saveBtn.textContent = 'Saving';
          CP.upsert('gallery', album.key, next).then(function () {
            album.data = next; dirty = false;
            saveBtn.textContent = 'Saved';
            setTimeout(paint, 700);
          }).catch(function (e) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save album';
            alert('Could not save: ' + (e && e.message ? e.message : e));
          });
        });
      }

      sel.addEventListener('change', function () {
        if (dirty && !window.confirm('Unsaved tags on this album will be lost. Switch anyway?')) {
          return;
        }
        load();
      });
      load();
    });
  };

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

  /* ==========================================================================
     VIDEOS

     The website has rendered match video on three pages for a while: the
     videos page, the live page and each match report, all keyed off
     `videoId` on a match. Nothing in this panel could write that field. The
     only way to attach a video was to open Results, find the right match and
     hand-type "videoId" into its raw JSON, which is not a thing anybody
     should have to know. A video was reported as uploaded and it was not,
     because there was no upload to do.

     So: one row per match, paste a link, done. It writes videoId onto the
     match record the site already reads, so a saved video appears on all
     three pages with no further work.
     ========================================================================== */

  /* Accepts anything somebody might paste out of YouTube: the share link, the
     address bar, an embed URL, a Short, or the bare id. Returns the id or ''.
     An 11-character id is the format YouTube has used throughout. */
  function youtubeId(input) {
    var s = String(input || '').trim();
    if (!s) return '';
    if (/^[\w-]{11}$/.test(s)) return s;
    var m = s.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
    return m ? m[1] : '';
  }

  /* "r20251123-catania" carries the date and the opponent already; this makes
     it readable without another round trip for data the panel does not hold. */
  function matchLabel(key) {
    var m = String(key).match(/^[a-z](\d{4})(\d{2})(\d{2})-(.+)$/);
    if (!m) return key;
    var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var opp = m[4].replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    return opp + ' · ' + Number(m[3]) + ' ' + (MON[Number(m[2]) - 1] || '') + ' ' + m[1];
  }

  M.videos = function (host) {
    return CP.readAll('matches').then(function (rows) {
      var list = (rows || []).slice().sort(function (a, b) {
        return String(b.key).localeCompare(String(a.key));
      });
      if (!list.length) {
        host.innerHTML = empty('No matches stored', 'Add a result first and it will appear here.');
        return;
      }
      var withVideo = list.filter(function (r) { return (r.data || {}).videoId; }).length;

      host.innerHTML =
        '<div class="panel" style="padding:var(--space-5);margin-bottom:var(--space-5)">' +
          '<h3 style="font-size:var(--step-1);margin-bottom:var(--space-3)">Match video</h3>' +
          '<p style="font-size:var(--step--1);color:var(--text-muted);max-width:66ch">' +
            'Paste a YouTube link against a match and it appears on the videos page, the live ' +
            'page and that match’s own report. Any YouTube address works: the share link, ' +
            'the one in the address bar, an embed link, a Short, or just the id.</p>' +
          '<p style="font-size:var(--step--1);color:var(--text-muted);margin-top:var(--space-2)">' +
            '<b>' + esc(withVideo) + '</b> of <b>' + esc(list.length) + '</b> matches have a video.</p>' +
        '</div>' +
        table(['Match', 'YouTube link or id', 'Video', ''],
        list.map(function (r) {
          var vid = (r.data || {}).videoId || '';
          return '<tr data-key="' + esc(r.key) + '">' +
            '<td><b>' + esc(matchLabel(r.key)) + '</b><br>' +
              '<span style="font-size:var(--step--2);color:var(--text-subtle)">' + esc(r.key) + '</span></td>' +
            '<td><input class="input" data-vid value="' + esc(vid) + '" placeholder="https://youtu.be/…"></td>' +
            '<td data-thumb>' + (vid
              ? '<a href="https://www.youtube.com/watch?v=' + esc(vid) + '" target="_blank" rel="noopener">'
                + '<img src="https://i.ytimg.com/vi/' + esc(vid) + '/default.jpg" alt="" width="80" height="60" '
                + 'style="border-radius:6px;display:block"></a>'
              : '<span style="color:var(--text-subtle);font-size:var(--step--2)">None</span>') + '</td>' +
            '<td><button class="btn btn--primary btn--sm" data-save>Save</button>' +
              (vid ? ' <button class="btn btn--ghost btn--sm" data-clear>Clear</button>' : '') + '</td>' +
          '</tr>';
        }).join(''));

      /* One write path for both buttons: `id` empty means remove the field
         rather than storing an empty string the site would treat as a video. */
      function write(row, id) {
        var key = row.getAttribute('data-key');
        var rec = list.filter(function (x) { return x.key === key; })[0];
        var next = {};
        Object.keys(rec.data || {}).forEach(function (k) { if (k !== 'videoId') next[k] = rec.data[k]; });
        if (id) next.videoId = id;
        return CP.upsert('matches', key, next).then(function () {
          rec.data = next;
          toast(id ? 'Video saved' : 'Video removed', 'success');
          refresh('videos');
        }).catch(function (e) { toast(e.message, 'error'); });
      }

      host.addEventListener('click', function (e) {
        var row = e.target.closest && e.target.closest('tr[data-key]');
        if (!row) return;
        if (e.target.matches('[data-clear]')) { if (guard()) write(row, ''); return; }
        if (!e.target.matches('[data-save]')) return;
        if (!guard()) return;
        var raw = $('[data-vid]', row).value;
        var id = youtubeId(raw);
        if (raw.trim() && !id) {
          toast('That does not look like a YouTube link or id.', 'error');
          return;
        }
        write(row, id);
      });
    });
  };

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
