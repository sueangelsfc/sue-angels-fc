/* ==========================================================================
   HEADINGS, TABLES, PHOTOGRAPHS AND GRAPHICS IN THE MIDDLE OF SOME WRITING

   Fetched by the two editors that take long writing - an article and a match
   report - before either opens, and by nobody else. It began in the shell,
   where everybody opening any screen pays for it, and control.js was 46 bytes
   inside its ceiling before it arrived.

   Articles and reports are plain text, so everything here is a line of text
   too, and `articleBody` in src/templates/news.mjs is what reads it:

     ## Heading            a heading
     ### Sub heading       a sub-heading under it
     | Stat | Total |      a table (or rows pasted with tabs from a document)
     ![caption](address)   a photograph, filling the column
     !![caption](address)  a graphic, shown whole

   The buttons only write those markers, so what the club sees in the box is
   exactly what the website reads. `plainText` in src/lib/prose.mjs takes the
   picture lines out anywhere the writing is shortened. The size rides on the
   address because every image the site ships carries a width and a height,
   and the upload is the only moment anybody knows them.
   ========================================================================== */
(function () {
  'use strict';
  var U = window.CPU;
  var PHOTO_LINE = /^[ \t]*!?!\[[^\]\n]*\]\(\S+\)[ \t]*$/gm;

  function photoField(id) {
    return '<div class="picker" style="margin-top:var(--space-2)" role="group" aria-label="Format the writing">' +
        '<button type="button" class="btn btn--ghost btn--sm" data-md="h2" data-md-for="' + id + '">Heading</button>' +
        '<button type="button" class="btn btn--ghost btn--sm" data-md="h3" data-md-for="' + id + '">Sub heading</button>' +
        '<button type="button" class="btn btn--ghost btn--sm" data-md="bold" data-md-for="' + id + '">Bold</button>' +
        '<button type="button" class="btn btn--ghost btn--sm" data-md="table" data-md-for="' + id + '">Table</button>' +
        '<button type="button" class="btn btn--ghost btn--sm" data-md="link" data-md-for="' + id + '">Link</button>' +
      '</div>' +
      '<p class="cp-note">Heading and Sub heading turn the line the cursor is on into one. ' +
        'A table can be pasted straight from a document or a spreadsheet, or started with Table. ' +
        'Link wraps the words you have selected: replace the address with a page on the site, such as ' +
        '/players/ade-owolana.html, or a full https address.</p>' +
      '<div class="picker" style="margin-top:var(--space-2)">' +
        '<input class="input" data-photo-cap="' + id + '" autocomplete="off" ' +
          'aria-label="Caption for the photo or graphic" placeholder="Caption: who or what is in it" ' +
          'style="flex:1 1 220px">' +
        '<label class="btn btn--ghost btn--sm" style="cursor:pointer;flex:0 0 auto">Add a photo' +
          '<input type="file" accept="image/*" hidden data-photo-for="' + id + '"></label>' +
        '<label class="btn btn--ghost btn--sm" style="cursor:pointer;flex:0 0 auto">Add a graphic' +
          '<input type="file" accept="image/*" hidden data-photo-for="' + id + '" data-graphic></label>' +
      '</div>' +
      '<p class="cp-note" data-photo-note="' + id + '">Type the caption first, then pick the ' +
        'picture. A photo fills the column; a graphic, such as a results card or a poster, is shown ' +
        'whole. It goes in where the cursor is, as its own line: move that line to move it, delete ' +
        'it to take it out.</p>';
  }

  /* THE SIZE THE UPLOAD WILL BE, read from the picture itself. The shell's
     uploader does the resizing and returns only the address, and control.js
     has no room for it to return more, so the dimensions are measured here and
     scaled the way readImage scales a picture that is not cropped square:
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
  function photoLine(caption, up, graphic) {
    var cap = String(caption || '').replace(/[\[\]\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
    var size = up.width && up.height ? '#' + up.width + 'x' + up.height : '';
    return (graphic ? '!!' : '!') + '[' + cap + '](' + up.url + size + ')';
  }

  /* Words a reader will read, so a picture's address is not counted. */
  function proseWords(text) {
    return String(text || '').replace(PHOTO_LINE, ' ').replace(/^#+\s*/gm, '')
      .replace(/[|*]/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  }

  /* The editors count words and keep drafts on `input`, and a value set from
     script fires nothing. */
  function changed(area) {
    if (typeof Event === 'function') area.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /* A block of its own: the website splits the writing on blank lines, so a
     heading or a table sharing a paragraph with a sentence would swallow it. */
  function asBlock(area, from, to, text) {
    var before = area.value.slice(0, from).replace(/\s+$/, '');
    var after = area.value.slice(to).replace(/^\s+/, '');
    area.value = (before ? before + '\n\n' : '') + text + (after ? '\n\n' + after : '');
    var at = (before ? before.length + 2 : 0) + text.length;
    if (area.setSelectionRange) area.setSelectionRange(at, at);
    changed(area);
  }

  function format(area, kind) {
    var v = area.value;
    var s = typeof area.selectionStart === 'number' ? area.selectionStart : v.length;
    var e = typeof area.selectionEnd === 'number' ? area.selectionEnd : s;
    if (kind === 'bold') {
      var picked = v.slice(s, e) || 'bold words';
      area.value = v.slice(0, s) + '**' + picked + '**' + v.slice(e);
      if (area.setSelectionRange) area.setSelectionRange(s + 2, s + 2 + picked.length);
      changed(area);
      return;
    }
    if (kind === 'link') {
      var words = v.slice(s, e) || 'link words';
      area.value = v.slice(0, s) + '[' + words + '](/players/)' + v.slice(e);
      var addr = s + words.length + 3;
      if (area.setSelectionRange) area.setSelectionRange(addr, addr + 9);
      changed(area);
      return;
    }
    if (kind === 'table') {
      asBlock(area, s, e, '| Heading | Heading |\n|---|---|\n| Row | Value |\n| Row | Value |');
      return;
    }
    var start = v.lastIndexOf('\n', s - 1) + 1;
    var end = v.indexOf('\n', s);
    if (end < 0) end = v.length;
    var words = v.slice(start, end).replace(/^#+\s*/, '').trim() || (kind === 'h2' ? 'Heading' : 'Sub heading');
    asBlock(area, start, end, (kind === 'h2' ? '## ' : '### ') + words);
  }

  function wirePhotos(back) {
    back.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest && e.target.closest('[data-md]');
      if (!btn) return;
      var area = back.querySelector('#' + btn.getAttribute('data-md-for'));
      if (area) { format(area, btn.getAttribute('data-md')); area.focus(); }
    });
    back.addEventListener('change', function (e) {
      var input = e.target && e.target.closest && e.target.closest('[data-photo-for]');
      if (!input) return;
      var file = input.files && input.files[0];
      if (!file) return;
      if (!U.guard()) { input.value = ''; return; }
      var id = input.getAttribute('data-photo-for');
      var graphic = input.hasAttribute('data-graphic');
      var area = back.querySelector('#' + id);
      var cap = back.querySelector('[data-photo-cap="' + id + '"]');
      var note = back.querySelector('[data-photo-note="' + id + '"]');
      if (!area) return;
      var at = typeof area.selectionStart === 'number' ? area.selectionStart : area.value.length;
      if (note) note.textContent = 'Uploading.';
      /* A graphic keeps its PNG, so text and transparent edges stay sharp. */
      Promise.all([
        U.uploadImage(file, { max: 1600, prefix: graphic ? 'graphic' : 'photo', keepAlpha: graphic }),
        measure(file, 1600),
      ]).then(function (both) {
        var up = both[0];
        up.width = both[1].width;
        up.height = both[1].height;
        asBlock(area, at, at, photoLine(cap && cap.value, up, graphic));
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
    format: format,
  };
})();
