/* ==========================================================================
   CONTROL PANEL: PLAYER PHOTOGRAPHS, AND DONATIONS

   Two sections the retired editor had and this one did not.

   PHOTOGRAPHS. Fifteen of the thirty-four players have no picture, and until
   now there was no way to give them one: the store could upload, but nothing
   in the interface ever called it. A player without a photograph gets their
   initials on a coloured tile, on the squad page, on their own profile, and
   anywhere else they appear.

   Photographs are resized and re-encoded in the browser before they go
   anywhere. A phone camera produces four or five megabytes; the site shows a
   picture at around 400px across. Uploading the original would put a
   multi-megabyte image on a page that needed forty kilobytes, and the club's
   own photographs are the one thing on this site nobody can optimise later
   without asking for them again. So it happens here, once, at the point the
   file is chosen.

   They are stored as a data URL on a `player_photos` row keyed by shirt
   number, which is where the nineteen existing photographs already live, so
   this reads and writes the same thing rather than a second competing store.

   DONATIONS. The club plays for sepsis awareness and the cause page has a
   donate band built and waiting. The Stripe payment link behind it is
   currently a constant in the site's source, which means changing it is a
   developer's job, and the `donate:config` record the old editor wrote has
   been sitting in the database read by nothing at all.
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
  var SQUAD = (SEED.squad || []).slice().sort(function (a, b) { return a.name.localeCompare(b.name); });

  /* Resizing lives in the shell now, because badges and article covers need
     it too and three copies of a canvas crop is three places to fix it.
     Square and 520px: square because every place the site shows a player crops
     to one anyway, and 520 rather than 400 so it still holds up on a
     high-density screen. */
  var shrink = function (file) { return U.readImage(file, { square: true, max: 520 }); };

  function kb(n) { return Math.round(n / 1024) + ' KB'; }

  M.photos = function (host) {
    return CP.readAll('player_photos').then(function (rows) {
      var byNum = {};
      rows.forEach(function (r) {
        if (/^\d+$/.test(r.key)) byNum[r.key] = r.data;
      });
      var missing = SQUAD.filter(function (p) { return !byNum[String(p.num)]; });

      host.innerHTML = sec({
        title: 'Player photographs',
        sub: '<b>' + esc(SQUAD.length - missing.length) + '</b> of <b>' + esc(SQUAD.length)
          + '</b> players have a photograph. Anyone without one shows as their initials on a '
          + 'coloured tile. Pictures are cut square and shrunk to 520 pixels here before they are '
          + 'saved, so a five megabyte photograph off a phone does not end up on the squad page.',
        body: table(['Player', 'Photograph', 'Size', ''], SQUAD.map(function (p) {
          var data = byNum[String(p.num)];
          var src = typeof data === 'string' ? data : (data && data.dataUrl) || '';
          return '<tr data-num="' + p.num + '">' +
            '<td><b>' + esc(p.name) + '</b><br>' +
              '<span style="color:var(--text-subtle)">' + esc(p.pos || '') + '</span></td>' +
            '<td>' + (src
              ? '<img src="' + esc(src) + '" alt="" width="44" height="44" '
                + 'style="border-radius:50%;object-fit:cover;display:block">'
              : '<span class="badge badge--warning">None</span>') + '</td>' +
            '<td>' + (src ? esc(kb(src.length)) : '') + '</td>' +
            '<td><label class="btn btn--ghost btn--sm" style="cursor:pointer">' +
                (src ? 'Replace' : 'Add a photograph') +
                '<input type="file" accept="image/*" data-file hidden></label>' +
              (src ? ' <button class="btn btn--quiet btn--sm" data-drop>Remove</button>' : '') +
            '</td>' +
          '</tr>';
        }).join('')),
        where: [['Squad', '/squad.html'], ['Every player profile', '/squad.html'],
          ['Home page', '/']],
      });

      host.addEventListener('change', function (e) {
        if (!e.target.matches('[data-file]')) return;
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!guard()) { e.target.value = ''; return; }
        var row = e.target.closest('tr[data-num]');
        var num = row.getAttribute('data-num');
        var who = SQUAD.filter(function (p) { return String(p.num) === num; })[0];
        var cell = row.children[1];
        cell.innerHTML = '<span class="badge badge--neutral">Working</span>';
        shrink(file).then(function (out) {
          return CP.upsert('player_photos', num, out.dataUrl).then(function () {
            toast(who.name + ': photograph saved, ' + kb(file.size) + ' down to '
              + kb(out.dataUrl.length), 'success');
            refresh('photos');
          });
        }).catch(function (err) {
          toast(err.message, 'error');
          refresh('photos');
        });
      });

      host.addEventListener('click', function (e) {
        if (!e.target.matches('[data-drop]')) return;
        if (!guard()) return;
        var num = e.target.closest('tr[data-num]').getAttribute('data-num');
        var who = SQUAD.filter(function (p) { return String(p.num) === num; })[0];
        confirmAction({
          title: 'Remove ' + who.name + '’s photograph?',
          body: 'They go back to showing their initials.',
          confirmLabel: 'Remove',
        }).then(function (yes) {
          if (!yes) return;
          CP.remove('player_photos', num).then(function () {
            toast('Photograph removed', 'success');
            refresh('photos');
          }).catch(function (err) { toast(err.message, 'error'); });
        });
      });
    });
  };

  /* ==========================================================================
     DONATIONS
     ========================================================================== */
  M.donations = function (host) {
    return CP.readAll('player_photos').then(function (rows) {
      var row = rows.filter(function (r) { return r.key === 'donate:config'; })[0];
      var d = (row && row.data) || {};
      var link = d.stripeLink || d.link || '';

      host.innerHTML = sec({
        title: 'Donations',
        sub: 'The cause page has a donate band built and waiting. Put a Stripe Payment Link here '
          + 'and it goes live; leave it empty and the page shows the Sepsis Trust link on its own '
          + 'rather than a button that goes nowhere.',
        body:
          '<div class="field">' +
            '<label class="field__label" for="d-link">Stripe Payment Link</label>' +
            '<input class="input" id="d-link" value="' + esc(link) + '" placeholder="https://buy.stripe.com/…">' +
            '<p class="field__hint">Made in Stripe under Payment Links. The supporter chooses the '
              + 'amount on Stripe’s own page, so no card details ever touch this website.</p>' +
          '</div>' +
          '<div class="field" style="margin-top:var(--space-4)">' +
            '<label class="field__label" for="d-note">A line above the button</label>' +
            '<input class="input" id="d-note" value="' + esc(d.note || '') + '" ' +
              'placeholder="Every pound goes to sepsis awareness">' +
          '</div>' +
          '<div class="cp-head__actions" style="margin-top:var(--space-4)">' +
            '<button class="btn btn--primary" data-save-donate>Save</button>' +
            (link
              ? '<a class="btn btn--ghost" href="' + esc(link) + '" target="_blank" rel="noopener">'
                + 'Open the link and check it</a>'
              : '<span class="cp-note">No link set, so the donate button is not shown.</span>') +
          '</div>',
        where: [['Our cause', '/sepsis.html']],
      });

      $('[data-save-donate]', host).addEventListener('click', function () {
        if (!guard()) return;
        var next = Object.assign({}, d, {
          stripeLink: $('#d-link', host).value.trim(),
          note: $('#d-note', host).value.trim(),
        });
        if (next.stripeLink && !/^https:\/\//.test(next.stripeLink)) {
          toast('A payment link has to start with https://', 'error');
          return;
        }
        CP.upsert('player_photos', 'donate:config', next).then(function () {
          toast('Saved', 'success');
          refresh('donations');
        }).catch(function (err) { toast(err.message, 'error'); });
      });
    });
  };
})();
