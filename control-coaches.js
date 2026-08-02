/* ==========================================================================
   CONTROL PANEL: COACHES

   The staff were a footnote inside Squad and staff: a name, a role and a
   paragraph, which is all that section needed to make "moved into coaching"
   work. But the coaches page shows a photograph, a headline role, a short
   line under the name and several paragraphs of biography, and none of those
   last three could be edited anywhere.

   So this is the coaches page's own editor, with every field it reads:

     name    as it appears under the photograph
     role    the heading, printed in capitals on the page
     short   the line under the name, which is the job in five words
     bio     paragraphs, blank line separated
     photo   resized and uploaded here, or their player photograph reused

   THREE OF THEM COME FROM THE SITE'S OWN RECORDS
   The founding staff are in the recovered baseline and cannot be deleted from
   here, because deleting them from a database row that does not contain them
   would do nothing and look broken. They CAN be edited: an edit writes a
   `roster:coaches` entry with the same id, and dataset.mjs merges by id with
   the edit winning. So the page shows both, and says which is which.
   ========================================================================== */
(function () {
  'use strict';
  var CP = window.CP;
  var M = window.CPM;
  var U = window.CPU;
  var $ = U.$;
  var esc = U.esc;
  var toast = U.toast;
  var guard = U.guard;
  var refresh = U.refresh;
  var confirmAction = U.confirmAction;
  var sec = U.sec;
  var table = U.table;

  var SEED = window.SA_SEED || {};
  var BASELINE = SEED.coaches || [];

  var ROLES = ['First-team manager', 'Assistant manager', 'First team coach',
    'Goalkeeping coach', 'Fitness coach', 'Physiotherapist', 'Team secretary',
    'Kit manager', 'Club chairman'];

  function slug(name) {
    return String(name).toLowerCase().replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function stored(rows) {
    var row = rows.filter(function (r) { return r.key === 'roster:coaches'; })[0];
    return ((row && row.data && row.data.coaches) || []).filter(function (c) { return c && c.name; });
  }

  M.coaches = function (host) {
    return CP.readAll('player_photos').then(function (rows) {
      var edits = stored(rows);
      var byId = {};
      edits.forEach(function (c) { byId[c.id || slug(c.name)] = c; });

      /* The list the website builds: the baseline, with any edit merged over
         it by id, then anyone added since. Exactly what dataset.mjs does, so
         what this shows is what the page will show. */
      var seen = {};
      var list = BASELINE.map(function (b) {
        var id = b.id || slug(b.name);
        seen[id] = true;
        return { id: id, base: true, edited: !!byId[id],
          rec: Object.assign({}, b, byId[id] || {}) };
      }).concat(edits.filter(function (c) {
        return !seen[c.id || slug(c.name)];
      }).map(function (c) {
        return { id: c.id || slug(c.name), base: false, edited: true, rec: c };
      }));

      host.innerHTML = sec({
        title: 'Coaching staff',
        sub: esc(list.length) + ' on the touchline. Everything the coaches page shows is here: the '
          + 'photograph, the role, the line under the name and the write-up.',
        actions: '<button class="btn btn--primary" data-new>Add someone</button>',
        body: table(['', 'Name', 'Role', 'Write-up', ''], list.map(function (x) {
          var c = x.rec;
          var shot = c.photoUrl || (c.photo ? '/' + String(c.photo).replace(/^\//, '') : '');
          return '<tr data-id="' + esc(x.id) + '">' +
            '<td>' + (shot
              ? '<img src="' + esc(shot) + '" alt="" width="40" height="40" '
                + 'style="border-radius:50%;object-fit:cover;display:block">'
              : '<span class="badge badge--warning">No photo</span>') + '</td>' +
            '<td><b>' + esc(c.name) + '</b>' +
              (c.short ? '<br><span style="color:var(--text-subtle)">' + esc(c.short) + '</span>' : '') +
            '</td>' +
            '<td>' + esc(c.role || 'Coach') + '</td>' +
            '<td>' + ((c.bio || []).length
              ? esc((c.bio || []).length) + ' paragraph' + ((c.bio || []).length === 1 ? '' : 's')
              : '<span class="badge badge--warning">None</span>') + '</td>' +
            '<td><button class="btn btn--ghost btn--sm" data-edit>Edit</button>' +
              (x.base
                ? ''
                : ' <button class="btn btn--quiet btn--sm" data-del>Remove</button>') +
            '</td>' +
          '</tr>';
        }).join('')),
        where: [['Coaches', '/coaches.html'], ['About the club', '/about.html']],
        whereNote: 'the manager also appears on the home page',
      }) +
      (list.some(function (x) { return x.base; })
        ? sec({
          title: 'The founding staff',
          sub: 'Three of these came with the site and cannot be removed from here, because deleting '
            + 'somebody from a record that does not contain them would do nothing and look broken. '
            + 'They can be edited freely: an edit is saved alongside and wins over the original.',
        })
        : '');

      function form(id) {
        var entry = list.filter(function (x) { return x.id === id; })[0];
        var c = entry ? entry.rec : { name: '', role: 'First team coach', short: '', bio: [] };
        var isNew = !entry;
        var shot = c.photoUrl || (c.photo ? '/' + String(c.photo).replace(/^\//, '') : '');

        var back = document.createElement('div');
        back.className = 'modal-backdrop';
        back.setAttribute('role', 'dialog');
        back.setAttribute('aria-modal', 'true');
        back.innerHTML =
          '<div class="modal glass glass--lg mform" style="width:min(96vw,720px)">' +
            '<div class="mform__head" style="padding-bottom:var(--space-4)">' +
              '<h2 class="mform__title">' + (isNew ? 'Add someone to the staff' : esc(c.name)) + '</h2>' +
              (entry && entry.base
                ? '<p class="mform__sub">Came with the site. Your changes are saved alongside the '
                  + 'original and win over it.</p>' : '') +
            '</div>' +
            '<div class="mform__body">' +
              '<div class="grid grid--2">' +
                '<div class="field"><label class="field__label" for="c-name">Name</label>' +
                  '<input class="input" id="c-name" value="' + esc(c.name) + '"></div>' +
                '<div class="field"><label class="field__label" for="c-role">Role</label>' +
                  '<input class="input" id="c-role" list="c-roles" value="' + esc(c.role || '') + '">' +
                  '<datalist id="c-roles">' + ROLES.map(function (r) {
                    return '<option value="' + esc(r) + '"></option>';
                  }).join('') + '</datalist>' +
                  '<p class="field__hint">The heading on their card, printed in capitals.</p></div>' +
              '</div>' +
              '<div class="field" style="margin-top:var(--space-4)">' +
                '<label class="field__label" for="c-short">The line under their name</label>' +
                '<input class="input" id="c-short" value="' + esc(c.short || '') + '" ' +
                  'placeholder="Organisation and matchday prep">' +
                '<p class="field__hint">What they actually do, in about five words.</p></div>' +

              '<h4 class="mform__h">Photograph</h4>' +
              '<div class="cp-head__actions">' +
                (shot ? '<img src="' + esc(shot) + '" alt="" width="64" height="64" '
                  + 'style="border-radius:50%;object-fit:cover">' : '') +
                '<label class="btn btn--ghost btn--sm" style="cursor:pointer">' +
                  (shot ? 'Replace it' : 'Choose one') +
                  '<input type="file" accept="image/*" hidden data-shot></label>' +
                '<span class="cp-note" data-shot-note>Cut square and shrunk before it is saved.</span>' +
              '</div>' +
              '<input type="hidden" id="c-photo" value="' + esc(c.photoUrl || '') + '">' +

              '<h4 class="mform__h">About them</h4>' +
              '<div class="field">' +
                '<textarea class="textarea" id="c-bio" rows="10" ' +
                  'placeholder="Who they are and what they bring. Blank lines separate paragraphs.">' +
                  esc((c.bio || []).join('\n\n')) + '</textarea>' +
                '<p class="field__hint">Each blank line starts a new paragraph on the coaches page.</p>' +
              '</div>' +
            '</div>' +
            '<div class="mform__foot">' +
              '<button class="btn btn--ghost" data-cancel>Cancel</button>' +
              '<span class="mform__status" data-err></span>' +
              '<button class="btn btn--primary" data-save>Save</button>' +
            '</div>' +
          '</div>';
        document.body.appendChild(back);
        back.addEventListener('click', function (e) {
          if (e.target === back || e.target.matches('[data-cancel]')) back.remove();
        });
        $('#c-name', back).focus();

        back.addEventListener('change', function (e) {
          if (!e.target.matches('[data-shot]')) return;
          var file = e.target.files && e.target.files[0];
          if (!file) return;
          if (!guard()) { e.target.value = ''; return; }
          var note = $('[data-shot-note]', back);
          note.textContent = 'Working.';
          /* Square and 520, the same as a player's, because they appear at
             the same size in the same places. */
          U.uploadImage(file, { square: true, max: 520, prefix: 'coach' }).then(function (out) {
            $('#c-photo', back).value = out.url;
            note.textContent = 'Ready, ' + Math.round(out.now / 1024) + 'KB. Save to keep it.';
          }).catch(function (err) { note.textContent = err.message; });
        });

        $('[data-save]', back).addEventListener('click', function () {
          var name = $('#c-name', back).value.trim();
          var err = $('[data-err]', back);
          if (!name) {
            err.textContent = 'A name, please.';
            err.style.color = 'var(--error)';
            return;
          }
          var rec = {
            id: (entry && entry.id) || slug(name),
            name: name,
            role: $('#c-role', back).value.trim() || 'Coach',
            short: $('#c-short', back).value.trim(),
            bio: $('#c-bio', back).value.split(/\n{2,}/)
              .map(function (x) { return x.trim(); }).filter(Boolean),
          };
          var url = $('#c-photo', back).value.trim();
          if (url) rec.photoUrl = url;
          /* Anything the form has never heard of is carried through, so a
             field a later version of the site adds survives being edited by
             this one. */
          var keep = entry && byId[entry.id] ? byId[entry.id] : {};
          var next = edits.filter(function (x) { return (x.id || slug(x.name)) !== rec.id; })
            .concat([Object.assign({}, keep, rec)]);
          CP.upsert('player_photos', 'roster:coaches', { coaches: next }).then(function () {
            toast('Saved', 'success');
            back.remove();
            refresh('coaches');
          }).catch(function (e2) { err.textContent = e2.message; err.style.color = 'var(--error)'; });
        });
      }

      host.addEventListener('click', function (e) {
        if (e.target.matches('[data-new]')) { if (guard()) form(null); return; }
        var tr = e.target.closest('tr[data-id]');
        if (!tr) return;
        var id = tr.getAttribute('data-id');
        if (e.target.matches('[data-edit]')) { if (guard()) form(id); return; }
        if (e.target.matches('[data-del]')) {
          if (!guard()) return;
          var who = list.filter(function (x) { return x.id === id; })[0];
          confirmAction({
            title: 'Remove ' + who.rec.name + ' from the staff?',
            body: 'They come off the coaches page at the next publish.',
            detail: 'If they have simply changed role, edit them instead: that keeps the write-up.',
            confirmLabel: 'Remove',
          }).then(function (yes) {
            if (!yes) return;
            CP.upsert('player_photos', 'roster:coaches', {
              coaches: edits.filter(function (x) { return (x.id || slug(x.name)) !== id; }),
            }).then(function () { toast('Removed', 'success'); refresh('coaches'); })
              .catch(function (err) { toast(err.message, 'error'); });
          });
        }
      });
    });
  };
})();
