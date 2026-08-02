/* ==========================================================================
   CONTROL PANEL: SQUAD AND STAFF

   What was here before this file was the `player_photos` table, rendered raw:
   a list of rows called "10", "12", "16", each one Photograph or Record, and
   an Edit button that opened a textarea holding forty thousand characters of
   base64 JPEG. There was no way to see who was in the squad, no way to say
   somebody had retired, and no way to add a player. It was a database
   inspector wearing a section title.

   This is the editor it replaced: every player by name, with what they have
   actually done for the club beside them, and one dropdown that moves them
   between the five things a player can be. Adding a signing is a name and a
   position. Moving somebody onto the coaching staff writes both records at
   once, because in real life that is one decision, not two.

   WHERE IT LANDS
   Status is a `roster:status` record, shirt number to status. dataset.mjs
   reads it over the code baseline, so a change here reaches /squad.html and
   the player's own page at the next publish. New players are a `roster:s2627`
   record; new staff are `roster:coaches`. Nothing about this needs a
   developer, which was the whole complaint.

   SHIRT NUMBERS
   They stay the storage key, because every match record ever written keys its
   scorers and its team sheet on them. They are never shown here and never
   shown on the website: a new player is given the lowest free number
   automatically, so nobody has to think about it.
   ========================================================================== */
(function () {
  'use strict';
  var CP = window.CP;
  var M = window.CPM;
  var U = window.CPU;
  var $ = U.$;
  var $$ = U.$$;
  var esc = U.esc;
  var toast = U.toast;
  var guard = U.guard;
  var refresh = U.refresh;
  var confirmAction = U.confirmAction;
  var sec = U.sec;
  var table = U.table;
  var empty = U.empty;

  var SEED = window.SA_SEED || {};
  var SQUAD = (SEED.squad || []).slice();

  /* The five things a player can be. `active` and `retained` both mean "in
     the squad": the difference is whether next season has been settled, which
     is a real distinction in a Sunday-league side in July and invisible on the
     website until somebody decides. */
  var STATUSES = [
    ['active', 'In the squad', 'Playing now. Appears in the squad on the website.'],
    ['retained', 'Retained for 26/27', 'Signed on for the new season. Still in the squad, and says so.'],
    ['retired', 'Retired from playing', 'Hung up the boots. Moves to Those who came before.'],
    ['departed', 'Left the club', 'Moved on. Moves to Those who came before.'],
    ['staff', 'Moved into coaching', 'Off the pitch and onto the touchline. Also added to the staff.'],
  ];
  var LABEL = {};
  STATUSES.forEach(function (s) { LABEL[s[0]] = s[1]; });

  var POSITIONS = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];
  var ROLES = ['Manager', 'Assistant manager', 'Coach', 'Goalkeeping coach',
    'Physiotherapist', 'Team secretary', 'Kit manager'];

  /* The record the panel owns, read defensively: it has been written by three
     different generations of this tool. */
  function statusMap(rows) {
    var row = rows.filter(function (r) { return r.key === 'roster:status'; })[0];
    var d = (row && row.data) || {};
    return d.status || d || {};
  }
  function addedPlayers(rows) {
    var row = rows.filter(function (r) { return r.key === 'roster:s2627'; })[0];
    return ((row && row.data && row.data.players) || []).filter(function (p) { return p && p.num; });
  }
  function staffList(rows) {
    var row = rows.filter(function (r) { return r.key === 'roster:coaches'; })[0];
    return ((row && row.data && row.data.coaches) || []).filter(function (c) { return c && c.name; });
  }

  function slug(name) {
    return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  /* The lowest number nobody is using. Numbers are plumbing, so the panel
     picks one rather than asking. */
  function freeNumber(all) {
    var used = {};
    all.forEach(function (p) { used[p.num] = true; });
    for (var n = 1; n < 200; n++) if (!used[n]) return n;
    return 200;
  }

  M.squad = function (host) {
    return CP.readAll('player_photos').then(function (rows) {
      var status = statusMap(rows);
      var added = addedPlayers(rows);
      var staff = staffList(rows);
      var photoKeys = {};
      rows.forEach(function (r) { if (/^\d+$/.test(r.key)) photoKeys[r.key] = true; });

      /* The squad the website is built from, plus anyone added here since. */
      var seen = {};
      var players = SQUAD.concat(added.map(function (p) {
        return { num: p.num, name: (p.first + ' ' + p.last).trim(), pos: p.position || '' };
      })).filter(function (p) {
        if (seen[p.num]) return false;
        seen[p.num] = true;
        return true;
      }).map(function (p) {
        return {
          num: p.num,
          name: p.name,
          pos: p.pos || '',
          status: status[String(p.num)] || 'active',
          photo: !!photoKeys[String(p.num)],
          added: added.some(function (a) { return a.num === p.num; }),
        };
      }).sort(function (a, b) { return a.name.localeCompare(b.name); });

      var counts = {};
      STATUSES.forEach(function (s) { counts[s[0]] = 0; });
      players.forEach(function (p) { counts[p.status] = (counts[p.status] || 0) + 1; });

      host.innerHTML =
        sec({
          title: 'The squad',
          sub: esc(players.length) + ' players. Changing what somebody is moves them on the website: '
            + '<b>' + esc(counts.active + counts.retained) + '</b> in the squad, '
            + '<b>' + esc(counts.retired) + '</b> retired, '
            + '<b>' + esc(counts.departed) + '</b> departed, '
            + '<b>' + esc(counts.staff) + '</b> now coaching.',
          actions: '<button class="btn btn--primary" data-add-player>Add a player</button>',
          body: table(['Player', 'Position', 'Photograph', 'What they are now', ''],
            players.map(function (p) {
              return '<tr data-num="' + p.num + '">' +
                '<td><b>' + esc(p.name) + '</b></td>' +
                '<td>' + esc(p.pos || 'Worked out from where they have played') + '</td>' +
                '<td>' + (p.photo
                  ? '<span class="badge badge--success">Yes</span>'
                  : '<span class="badge badge--warning">None</span>') + '</td>' +
                '<td><select class="select" data-status aria-label="Status for ' + esc(p.name) + '">' +
                  STATUSES.map(function (s) {
                    return '<option value="' + s[0] + '"' + (p.status === s[0] ? ' selected' : '') +
                      '>' + esc(s[1]) + '</option>';
                  }).join('') + '</select></td>' +
                '<td>' + (p.added
                  ? '<button class="btn btn--quiet btn--sm" data-del-player>Remove</button> '
                  : '') +
                  '<a class="btn btn--quiet btn--sm" href="/players/' + esc(slug(p.name)) +
                    '.html" target="_blank" rel="noopener">View</a></td>' +
              '</tr>';
            }).join('')),
          where: [['Squad', '/squad.html'], ['Every player profile', '/squad.html']],
          whereNote: 'retired, departed and now-coaching players keep their profile and their record',
        }) +

        sec({
          title: 'Coaching staff',
          sub: 'Everyone on the touchline. A player moved into coaching appears here automatically.',
          actions: '<button class="btn btn--primary" data-add-staff>Add someone</button>',
          body: (staff.length
            ? table(['Name', 'Role', ''], staff.map(function (c, i) {
              return '<tr data-staff="' + i + '">' +
                '<td><b>' + esc(c.name) + '</b></td>' +
                '<td>' + esc(c.role || 'Coach') + '</td>' +
                '<td><button class="btn btn--ghost btn--sm" data-edit-staff>Edit</button> ' +
                  '<button class="btn btn--quiet btn--sm" data-del-staff>Remove</button></td>' +
              '</tr>';
            }).join(''))
            : empty('Nobody added here yet',
              'The founding staff come from the site’s own records and always show. Anyone appointed since is added here.')),
          where: [['Coaches', '/coaches.html']],
        });

      /* ---- Writing ---- */
      function saveStatus(next) {
        return CP.upsert('player_photos', 'roster:status', { status: next });
      }
      function saveStaff(next) {
        return CP.upsert('player_photos', 'roster:coaches', { coaches: next });
      }
      function savePlayers(next) {
        return CP.upsert('player_photos', 'roster:s2627', { players: next });
      }

      host.addEventListener('change', function (e) {
        if (!e.target.matches('[data-status]')) return;
        if (!guard()) { refresh('squad'); return; }
        var num = Number(e.target.closest('tr[data-num]').getAttribute('data-num'));
        var player = players.filter(function (p) { return p.num === num; })[0];
        var value = e.target.value;
        var next = Object.assign({}, status);
        next[String(num)] = value;

        /* Moving a player into coaching is one decision, so it is one action:
           they come out of the squad AND go onto the staff. Doing only the
           first leaves a coach nobody can find; doing only the second leaves
           them listed as a player who has not turned out all season. */
        var work = saveStatus(next);
        if (value === 'staff' && !staff.some(function (c) { return c.name === player.name; })) {
          work = work.then(function () {
            return saveStaff(staff.concat([{
              id: slug(player.name), name: player.name, role: 'Coach',
              bio: [player.name + ' played for the club before joining the coaching staff.'],
            }]));
          });
        }
        work.then(function () {
          toast(player.name + ': ' + LABEL[value], 'success');
          refresh('squad');
        }).catch(function (err) { toast(err.message, 'error'); refresh('squad'); });
      });

      host.addEventListener('click', function (e) {
        if (e.target.matches('[data-add-player]')) { if (guard()) playerForm(); return; }
        if (e.target.matches('[data-add-staff]')) { if (guard()) staffForm(null); return; }

        var srow = e.target.closest('tr[data-staff]');
        if (srow && e.target.matches('[data-edit-staff]')) {
          if (guard()) staffForm(Number(srow.getAttribute('data-staff')));
          return;
        }
        if (srow && e.target.matches('[data-del-staff]')) {
          if (!guard()) return;
          var si = Number(srow.getAttribute('data-staff'));
          confirmAction({
            title: 'Remove ' + staff[si].name + ' from the staff?',
            body: 'They come off the coaches page at the next publish.',
            confirmLabel: 'Remove',
          }).then(function (yes) {
            if (!yes) return;
            var rest = staff.slice();
            rest.splice(si, 1);
            saveStaff(rest).then(function () { toast('Removed', 'success'); refresh('squad'); })
              .catch(function (err) { toast(err.message, 'error'); });
          });
          return;
        }

        var prow = e.target.closest('tr[data-num]');
        if (prow && e.target.matches('[data-del-player]')) {
          if (!guard()) return;
          var num = Number(prow.getAttribute('data-num'));
          var who = players.filter(function (p) { return p.num === num; })[0];
          confirmAction({
            title: 'Remove ' + who.name + '?',
            body: 'This deletes the player record entirely. If they have simply left the club, '
              + 'set them to Left the club instead: that keeps their profile and everything they did.',
            confirmLabel: 'Delete the record',
          }).then(function (yes) {
            if (!yes) return;
            savePlayers(added.filter(function (p) { return p.num !== num; }))
              .then(function () { toast('Removed', 'success'); refresh('squad'); })
              .catch(function (err) { toast(err.message, 'error'); });
          });
        }
      });

      /* ---- Add a player ---- */
      function playerForm() {
        var back = modal('Add a player',
          '<div class="grid grid--2">' +
            '<div class="field"><label class="field__label" for="p-first">First name</label>' +
              '<input class="input" id="p-first" autocomplete="off"></div>' +
            '<div class="field"><label class="field__label" for="p-last">Surname</label>' +
              '<input class="input" id="p-last" autocomplete="off"></div>' +
            '<div class="field"><label class="field__label" for="p-pos">Position</label>' +
              '<select class="select" id="p-pos">' +
                POSITIONS.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') +
              '</select></div>' +
            '<div class="field"><label class="field__label" for="p-status">Status</label>' +
              '<select class="select" id="p-status">' +
                '<option value="active">In the squad</option>' +
                '<option value="retained">Retained for 26/27</option>' +
              '</select></div>' +
          '</div>' +
          '<div class="field" style="margin-top:var(--space-4)">' +
            '<label class="field__label" for="p-bio">A line about them (optional)</label>' +
            '<textarea class="textarea" id="p-bio" rows="3" ' +
              'placeholder="Where they came from, what they bring. Shows on their profile."></textarea></div>' +
          '<p class="field__hint" style="margin-top:var(--space-3)">Their position is used until they '
            + 'have played: after that the site works it out from where they actually lined up.</p>');

        $('[data-save]', back).addEventListener('click', function () {
          var first = $('#p-first', back).value.trim();
          var last = $('#p-last', back).value.trim();
          var err = $('[data-err]', back);
          if (!first || !last) { err.textContent = 'A first name and a surname, please.'; err.hidden = false; return; }
          var bio = $('#p-bio', back).value.trim();
          var num = freeNumber(players);
          var rec = { num: num, first: first, last: last, position: $('#p-pos', back).value };
          if (bio) rec.bio = [bio];
          var chosen = $('#p-status', back).value;
          var nextStatus = Object.assign({}, status);
          nextStatus[String(num)] = chosen;
          err.hidden = true;
          savePlayers(added.concat([rec]))
            .then(function () { return saveStatus(nextStatus); })
            .then(function () {
              toast(first + ' ' + last + ' added to the squad', 'success');
              back.remove();
              refresh('squad');
            })
            .catch(function (e2) { err.textContent = e2.message; err.hidden = false; });
        });
      }

      /* ---- Add or edit staff ---- */
      function staffForm(i) {
        var c = i == null ? { name: '', role: 'Coach', bio: [] } : staff[i];
        var back = modal(i == null ? 'Add someone to the staff' : 'Edit ' + c.name,
          '<div class="grid grid--2">' +
            '<div class="field"><label class="field__label" for="s-name">Name</label>' +
              '<input class="input" id="s-name" value="' + esc(c.name) + '"></div>' +
            '<div class="field"><label class="field__label" for="s-role">Role</label>' +
              '<input class="input" id="s-role" list="s-roles" value="' + esc(c.role || 'Coach') + '"></div>' +
          '</div>' +
          '<datalist id="s-roles">' + ROLES.map(function (r) {
            return '<option value="' + esc(r) + '"></option>';
          }).join('') + '</datalist>' +
          '<div class="field" style="margin-top:var(--space-4)">' +
            '<label class="field__label" for="s-bio">About them</label>' +
            '<textarea class="textarea" id="s-bio" rows="5">' +
              esc((c.bio || []).join('\n\n')) + '</textarea>' +
            '<p class="field__hint">Blank lines separate paragraphs on the coaches page.</p></div>');

        $('[data-save]', back).addEventListener('click', function () {
          var name = $('#s-name', back).value.trim();
          var err = $('[data-err]', back);
          if (!name) { err.textContent = 'A name, please.'; err.hidden = false; return; }
          var rec = {
            id: c.id || slug(name),
            name: name,
            role: $('#s-role', back).value.trim() || 'Coach',
            bio: $('#s-bio', back).value.split(/\n{2,}/).map(function (s) { return s.trim(); }).filter(Boolean),
          };
          var next = staff.slice();
          if (i == null) next.push(rec); else next[i] = rec;
          err.hidden = true;
          saveStaff(next).then(function () {
            toast('Saved', 'success');
            back.remove();
            refresh('squad');
          }).catch(function (e2) { err.textContent = e2.message; err.hidden = false; });
        });
      }
    });
  };

  /* A small form dialog. The match form has its own because it is five tabs;
     everything here is one screen. */
  function modal(title, body) {
    var back = document.createElement('div');
    back.className = 'modal-backdrop';
    back.setAttribute('role', 'dialog');
    back.setAttribute('aria-modal', 'true');
    back.innerHTML =
      '<div class="modal glass glass--lg" style="width:min(96vw,640px)">' +
        '<div class="modal__head"><h2 class="mform__title">' + esc(title) + '</h2></div>' +
        body +
        '<p class="field__error" data-err hidden></p>' +
        '<div class="modal__foot">' +
          '<button class="btn btn--ghost" data-cancel>Cancel</button>' +
          '<button class="btn btn--primary" data-save>Save</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(back);
    back.addEventListener('click', function (e) {
      if (e.target === back || e.target.matches('[data-cancel]')) back.remove();
    });
    var firstField = back.querySelector('input, select, textarea');
    if (firstField) firstField.focus();
    return back;
  }
})();
