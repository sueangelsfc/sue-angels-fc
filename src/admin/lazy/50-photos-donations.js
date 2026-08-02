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

  var SEASONS = (SEED.seasons || []).slice().reverse();
  var CURRENT = SEED.currentSeason || SEASONS[0] || '';

  /* ==========================================================================
     PLAYER PHOTOGRAPHS

     They used to be written as a data URL straight onto the `player_photos`
     row for that shirt number, and they never reached the website. Twice over:
     the snapshot reduces every base64 row to its size on purpose, because
     twenty photographs inline would be megabytes in a committed file, and the
     squad page read a `.webp` off disk that only existed for the twenty
     somebody had exported by hand. So this said "photograph saved" and the
     site went on showing initials.

     They go to the club's storage now, and one small `roster:photos` record
     holds the addresses: shirt number to a set of them, one per season plus a
     default. That record is a few hundred bytes, survives the snapshot whole
     and reaches the build.

     ONE PER SEASON, falling back. A club that has not taken this year's
     pictures shows last year's rather than initials, which is what you want in
     August, and replacing one season leaves the others alone.
     ========================================================================== */
  M.photos = function (host) {
    return CP.readAll('player_photos').then(function (rows) {
      var row = rows.filter(function (r) { return r.key === 'roster:photos'; })[0];
      var recs = (row && row.data) || {};
      /* The twenty that ship as files with the site. The panel cannot see the
         filesystem, so it reports them as "with the site" rather than pretending
         they are missing. */
      var onDisk = {};
      rows.forEach(function (r) { if (/^\d+$/.test(r.key)) onDisk[r.key] = true; });

      var season = host.getAttribute('data-season') || CURRENT;
      function shotFor(num) {
        var r = recs[String(num)] || {};
        return { own: r[season] || '', fallback: r.default || '', disk: !!onDisk[String(num)] };
      }
      var haveThis = SQUAD.filter(function (p) { return shotFor(p.num).own; }).length;

      host.innerHTML = sec({
        title: 'Player photographs',
        sub: 'One picture per player per season. <b>' + esc(haveThis) + '</b> of <b>'
          + esc(SQUAD.length) + '</b> have one for <b>' + esc(season) + '</b>; anybody without shows '
          + 'their most recent instead, and only falls back to initials if there has never been one. '
          + 'Pictures are cut square and shrunk to 520 pixels before they are saved, so a five '
          + 'megabyte photograph off a phone does not land on the squad page.',
        actions: SEASONS.length > 1
          ? '<label class="field" style="margin:0">' +
              '<span class="field__label">Season</span>' +
              '<select class="select" data-season-pick>' +
                SEASONS.map(function (x) {
                  return '<option value="' + esc(x) + '"' + (x === season ? ' selected' : '') +
                    '>' + esc(x) + '</option>';
                }).join('') +
              '</select></label>'
          : '',
        body: table(['Player', esc(season), 'Falls back to', ''], SQUAD.map(function (p) {
          var f = shotFor(p.num);
          return '<tr data-num="' + p.num + '">' +
            '<td><b>' + esc(p.name) + '</b><br>' +
              '<span style="color:var(--text-subtle)">' + esc(p.pos || '') + '</span></td>' +
            '<td>' + (f.own
              ? '<img src="' + esc(f.own) + '" alt="" width="44" height="44" '
                + 'style="border-radius:50%;object-fit:cover;display:block">'
              : '<span class="badge badge--warning">None</span>') + '</td>' +
            '<td>' + (f.fallback
              ? '<img src="' + esc(f.fallback) + '" alt="" width="32" height="32" '
                + 'style="border-radius:50%;object-fit:cover;display:block;opacity:.65">'
              : f.disk
                ? '<span class="badge badge--neutral">Ships with the site</span>'
                : '<span class="badge badge--warning">Their initials</span>') + '</td>' +
            '<td><label class="btn btn--ghost btn--sm" style="cursor:pointer">' +
                (f.own ? 'Replace' : 'Add one') +
                '<input type="file" accept="image/*" data-file hidden></label>' +
              (f.own ? ' <button class="btn btn--quiet btn--sm" data-drop>Remove</button>' : '') +
            '</td>' +
          '</tr>';
        }).join('')),
        where: [['Squad', '/squad.html'], ['Every player profile', '/squad.html'], ['Home page', '/']],
        whereNote: 'the squad page shows the season you are looking at',
      });

      function save(next, msg) {
        return CP.upsert('player_photos', 'roster:photos', next).then(function () {
          toast(msg, 'success');
          refresh('photos');
        }).catch(function (err) { toast(err.message, 'error'); });
      }

      host.addEventListener('change', function (e) {
        if (e.target.matches('[data-season-pick]')) {
          host.setAttribute('data-season', e.target.value);
          M.photos(host);
          return;
        }
        if (!e.target.matches('[data-file]')) return;
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!guard()) { e.target.value = ''; return; }
        var tr = e.target.closest('tr[data-num]');
        var num = tr.getAttribute('data-num');
        var who = SQUAD.filter(function (p) { return String(p.num) === num; })[0];
        tr.children[1].innerHTML = '<span class="badge badge--neutral">Working</span>';
        U.uploadImage(file, { square: true, max: 520, prefix: 'player-' + num })
          .then(function (out) {
            var next = JSON.parse(JSON.stringify(recs));
            next[num] = next[num] || {};
            next[num][season] = out.url;
            /* The first picture anybody gives a player is also their default,
               so a season nobody has photographed still has something to show. */
            if (!next[num].default) next[num].default = out.url;
            return save(next, who.name + ': saved, ' + kb(out.was) + ' down to ' + kb(out.now));
          })
          .catch(function (err) { toast(err.message, 'error'); refresh('photos'); });
      });

      host.addEventListener('click', function (e) {
        if (!e.target.matches('[data-drop]')) return;
        if (!guard()) return;
        var num = e.target.closest('tr[data-num]').getAttribute('data-num');
        var who = SQUAD.filter(function (p) { return String(p.num) === num; })[0];
        confirmAction({
          title: 'Remove ' + who.name + '\u2019s ' + season + ' photograph?',
          body: 'Their other seasons are untouched, and the site falls back to the most recent one.',
          confirmLabel: 'Remove',
        }).then(function (yes) {
          if (!yes) return;
          var next = JSON.parse(JSON.stringify(recs));
          if (next[num]) delete next[num][season];
          save(next, 'Removed');
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
