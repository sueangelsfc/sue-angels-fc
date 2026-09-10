/* ==========================================================================
   A PHOTOGRAPH IN THE MIDDLE OF SOME WRITING

   Fetched by the two editors that take long writing - an article and a match
   report - before either opens, and by nobody else. It began in the shell,
   where everybody opening any screen pays for it, and control.js was 46 bytes
   inside its ceiling before it arrived.

   Articles and reports are plain text, so a photograph is a line of text too:
   `![caption](address#WIDTHxHEIGHT)`, on a paragraph of its own. The website
   turns that line into a figure (`articleBody` in src/templates/news.mjs), and
   `plainText` in src/lib/prose.mjs takes it out anywhere the writing is
   shortened. Moving the line moves the picture and deleting it takes the
   picture out, with nothing else to keep in step. The size rides on the
   address because every image the site ships carries a width and a height,
   and the upload is the only moment anybody knows them.
   ========================================================================== */
(function () {
  'use strict';
  var U = window.CPU;
  var PHOTO_LINE = /^[ \t]*!\[[^\]\n]*\]\(\S+\)[ \t]*$/gm;

  function photoField(id) {
    return '<div class="picker" style="margin-top:var(--space-2)">' +
        '<input class="input" data-photo-cap="' + id + '" autocomplete="off" ' +
          'aria-label="Caption for the photo" placeholder="Caption: who or what is in it" ' +
          'style="flex:1 1 220px">' +
        '<label class="btn btn--ghost btn--sm" style="cursor:pointer;flex:0 0 auto">Add a photo' +
          '<input type="file" accept="image/*" hidden data-photo-for="' + id + '"></label>' +
      '</div>' +
      '<p class="cp-note" data-photo-note="' + id + '">Type the caption first, then pick the ' +
        'photo. It goes in where the cursor is, as its own line: move that line to move the ' +
        'photo, delete it to take the photo out.</p>';
  }

  /* THE SIZE THE UPLOAD WILL BE, read from the photograph itself. The shell's
     uploader does the resizing and returns only the address, and control.js
     has no room for it to return more, so the dimensions are measured here and
     scaled the way readImage scales a photograph that is not cropped square:
     never up, and down to `max` across. The proportions are the part that
     matters - they are what hold the space while the picture loads - and they
     are exact whatever the rounding. */
  function measure(file, max) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, max / img.width);
        URL.revokeObjectURL(url);
        resolve({ width: Math.round(img.width * scale), height: Math.round(img.height * scale) });
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve({}); };
      img.src = url;
    });
  }

  /* Square brackets and line breaks would end the line early, so a caption
     loses them rather than breaking the picture. */
  function photoLine(caption, up) {
    var cap = String(caption || '').replace(/[\[\]\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
    var size = up.width && up.height ? '#' + up.width + 'x' + up.height : '';
    return '![' + cap + '](' + up.url + size + ')';
  }

  /* Words a reader will read, so a photograph's address is not counted. */
  function proseWords(text) {
    return String(text || '').replace(PHOTO_LINE, ' ').trim().split(/\s+/).filter(Boolean).length;
  }

  function wirePhotos(back) {
    back.addEventListener('change', function (e) {
      var input = e.target && e.target.closest && e.target.closest('[data-photo-for]');
      if (!input) return;
      var file = input.files && input.files[0];
      if (!file) return;
      if (!U.guard()) { input.value = ''; return; }
      var id = input.getAttribute('data-photo-for');
      var area = back.querySelector('#' + id);
      var cap = back.querySelector('[data-photo-cap="' + id + '"]');
      var note = back.querySelector('[data-photo-note="' + id + '"]');
      if (!area) return;
      var at = typeof area.selectionStart === 'number' ? area.selectionStart : area.value.length;
      if (note) note.textContent = 'Uploading.';
      Promise.all([U.uploadImage(file, { max: 1600, prefix: 'photo' }), measure(file, 1600)]).then(function (both) {
        var up = both[0];
        up.width = both[1].width;
        up.height = both[1].height;
        var before = area.value.slice(0, at).replace(/\s+$/, '');
        var after = area.value.slice(at).replace(/^\s+/, '');
        area.value = (before ? before + '\n\n' : '') + photoLine(cap && cap.value, up)
          + (after ? '\n\n' + after : '');
        /* The editors count words and keep drafts on `input`, and a value set
           from script fires nothing. */
        if (typeof Event === 'function') area.dispatchEvent(new Event('input', { bubbles: true }));
        if (cap) cap.value = '';
        input.value = '';
        if (note) {
          note.textContent = 'Added, ' + Math.round(up.was / 1024) + ' KB down to '
            + Math.round(up.now / 1024) + ' KB. Save to keep it.';
        }
      }).catch(function (err) {
        if (note) note.textContent = err.message;
        input.value = '';
      });
    });
  }

  window.CPWRITE = {
    photoField: photoField,
    photoLine: photoLine,
    proseWords: proseWords,
    wirePhotos: wirePhotos,
  };
})();
