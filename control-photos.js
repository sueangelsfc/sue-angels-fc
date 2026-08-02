/* ==========================================================================
   CONTROL PANEL: THE PHOTOGRAPH TAGGER

   Loaded the first time the tagger is opened. It is a specialist tool for one
   job done a few times a season, so it has no business in the bundle that
   loads when somebody signs in to check the inbox.
   ========================================================================== */
(function () {
  'use strict';
  var CP = window.CP;
  var M = window.CPM;
  var U = window.CPU;
  var $ = U.$;
  var $$ = U.$$;
  var esc = U.esc;
  var empty = U.empty;

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
        U.sec({
          title: 'Tag players in a photograph',
          sub: 'Pick an album, step through the photographs and click a name to tag them. Tagged '
            + 'names appear under that photograph on the website and link to the player’s profile.',
          body: '<label class="field"><span class="field__label">Album</span>' +
            '<select class="select" data-album>' +
              albums.map(function (a, i) {
                var d = a.data || {};
                return '<option value="' + i + '">' + esc(d.title || a.key) +
                  ' (' + ((d.photos || []).length) + ')</option>';
              }).join('') +
            '</select></label>',
          where: [['Gallery', '/gallery.html'], ['Every player profile', '/squad.html']],
        }) +
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
          '<div class="panel cp-card">' +
            '<div class="cp-head">' +
              '<p class="cp-note">Photograph ' +
                esc(idx + 1) + ' of ' + esc(photos.length) + ' &middot; ' + esc(tagged) + ' tagged</p>' +
              '<div class="cp-head__actions">' +
                '<button class="btn btn--ghost btn--sm" data-prev>Previous</button>' +
                '<button class="btn btn--ghost btn--sm" data-next>Next</button>' +
                '<button class="btn btn--primary btn--sm" data-save' + (dirty ? '' : ' disabled') + '>Save album</button>' +
              '</div>' +
            '</div>' +
            '<img class="tagshot" src="' + esc(photos[idx]) + '" alt="" />' +
            '<p class="cp-head__sub" style="margin-block:var(--space-4) var(--space-2)">' +
              'In this photograph' + (mine.length ? '' : ': nobody tagged yet') + '</p>' +
            '<div class="cp-head__actions">' +
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
              ? '<div style="margin-top:var(--space-5)">' +
                  '<p class="cp-head__sub" style="margin-bottom:var(--space-3)">' +
                    'Mark someone as the <strong>subject</strong> and this photograph becomes usable as their picture ' +
                    'across the site. Click the image to set where they are in the frame so any crop keeps them in it.</p>' +
                  mine.map(function (t, ti) {
                    return '<div class="tagrow">' +
                      '<strong>' + esc(t.name) + '</strong>' +
                      '<div class="cp-head__actions">' +
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
  };})();
