/* ==========================================================================
   CONTROL PANEL: NEWS, GALLERY, RECOGNITION, BADGES AND SPONSORS

   All five of these were the same thing: a table of row keys, and an Edit
   button that opened a textarea holding raw JSON. To write a club
   announcement you typed

     {"id":"","title":"","cat":"News","date":"","lede":"","body":"","cover":""}

   by hand, with the article itself going in as one string with \n\n between
   the paragraphs, and a parse error as your only feedback. To add a Player of
   the Month you had to know the field was called `playerId`, and that it
   wanted a shirt number. To edit an album you were shown forty lines of
   photograph URLs and asked not to break them.

   The JSON editor was defended in a comment as deliberate, on the grounds
   that these are JSONB documents with varied shapes and a lossy form would
   drop fields the website reads. The first half is true. The conclusion was
   not: a form that keeps every field it did not ask about is not lossy. Each
   editor here starts from the record as it stands, changes only what its
   fields cover, and writes the rest back untouched, so a shape this form has
   never heard of survives being edited by it.

   The raw editor is still one click away on every record, for the day
   something genuinely needs it.
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
  var empty = U.empty;
  var fmtDate = U.fmtDate;

  var SEED = window.SA_SEED || {};
  var SQUAD = (SEED.squad || []).slice().sort(function (a, b) { return a.name.localeCompare(b.name); });

  /* ---- Form plumbing ---------------------------------------------------- */
  function field(id, label, control, hint) {
    return '<div class="field"><label class="field__label" for="' + id + '">' + esc(label) + '</label>' +
      control + (hint ? '<p class="field__hint">' + esc(hint) + '</p>' : '') + '</div>';
  }
  function text(id, value, ph) {
    return '<input class="input" id="' + id + '" value="' + esc(value == null ? '' : value) + '"' +
      (ph ? ' placeholder="' + esc(ph) + '"' : '') + '>';
  }
  function area(id, value, rows, ph) {
    return '<textarea class="textarea" id="' + id + '" rows="' + (rows || 6) + '"' +
      (ph ? ' placeholder="' + esc(ph) + '"' : '') + '>' + esc(value == null ? '' : value) + '</textarea>';
  }
  function choose(id, value, options) {
    return '<select class="select" id="' + id + '">' + options.map(function (o) {
      var v = Array.isArray(o) ? o[0] : o;
      var t = Array.isArray(o) ? o[1] : o;
      return '<option value="' + esc(v) + '"' + (String(v) === String(value == null ? '' : value) ? ' selected' : '') +
        '>' + esc(t) + '</option>';
    }).join('') + '</select>';
  }
  function val(back, id) { var el = $('#' + id, back); return el ? el.value.trim() : ''; }

  /* An address field with an upload button beside it. The old editor let you
     upload a badge and this one only took a URL, which quietly assumed the
     club already had its images hosted somewhere. Pick a file and it is
     resized in the browser, put in the club's own storage, and its address
     dropped into the field, so the two ways in end up in the same place. */
  function imageField(id, label, value, opts) {
    var o = opts || {};
    return '<div class="field"><label class="field__label" for="' + id + '">' + esc(label) + '</label>' +
      '<div class="picker">' +
        '<input class="input" id="' + id + '" value="' + esc(value || '') + '" placeholder="https://…" ' +
          'style="flex:1 1 220px">' +
        '<label class="btn btn--ghost btn--sm" style="cursor:pointer;flex:0 0 auto">Upload one' +
          '<input type="file" accept="image/*" hidden data-upload-for="' + id + '" ' +
            'data-up-max="' + (o.max || 1200) + '"' + (o.square ? ' data-up-square="1"' : '') +
            (o.keepAlpha ? ' data-up-alpha="1"' : '') + '></label>' +
      '</div>' +
      '<p class="field__hint" data-up-note="' + id + '">' + esc(o.hint || '') + '</p></div>';
  }

  /* One handler for every upload button in a dialog. */
  function wireUploads(back) {
    back.addEventListener('change', function (e) {
      var input = e.target.closest('[data-upload-for]');
      if (!input) return;
      var file = input.files && input.files[0];
      if (!file) return;
      if (!guard()) { input.value = ''; return; }
      var id = input.getAttribute('data-upload-for');
      var note = $('[data-up-note="' + id + '"]', back);
      note.textContent = 'Uploading.';
      U.uploadImage(file, {
        max: Number(input.getAttribute('data-up-max')) || 1200,
        square: input.hasAttribute('data-up-square'),
        keepAlpha: input.hasAttribute('data-up-alpha'),
        prefix: id,
      }).then(function (out) {
        $('#' + id, back).value = out.url;
        note.textContent = 'Uploaded, ' + Math.round(out.was / 1024) + ' KB down to '
          + Math.round(out.now / 1024) + ' KB.';
      }).catch(function (err) {
        note.textContent = err.message;
        input.value = '';
      });
    });
  }

  function dialog(title, body, width) {
    var back = document.createElement('div');
    back.className = 'modal-backdrop';
    back.setAttribute('role', 'dialog');
    back.setAttribute('aria-modal', 'true');
    back.innerHTML =
      '<div class="modal glass glass--lg mform" style="width:min(96vw,' + (width || 760) + 'px)">' +
        '<div class="mform__head" style="padding-bottom:var(--space-4)">' +
          '<h2 class="mform__title">' + esc(title) + '</h2></div>' +
        '<div class="mform__body">' + body + '</div>' +
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
    var f = back.querySelector('input, select, textarea');
    if (f) f.focus();
    return back;
  }
  function fail(back, msg) {
    var el = $('[data-err]', back);
    el.textContent = msg;
    el.style.color = 'var(--error)';
  }

  /* Every editor writes through this. `patch` carries only the fields the
     form asked about; everything else on the record is preserved, which is
     what makes replacing the JSON textarea safe. */
  function put(back, tbl, key, existing, patch, panel, after) {
    var next = Object.assign({}, existing || {}, patch);
    CP.upsert(tbl, key, next).then(function () {
      toast('Saved', 'success');
      back.remove();
      if (after) after();
      refresh(panel);
      /* AN ARTICLE GETS ITS SHARE PICTURE NOW. The deploy has no browser, so
         a piece published from here would otherwise share the generic club
         image until somebody ran `npm run covers` on a laptop. Drawn after
         the dialog has closed and the save has been reported, because it is
         worth less than the article and must never delay or fail it. */
      if (tbl !== 'articles' || next.cover) return;
      U.chunk('covers')
        .then(function () { return window.CPCOVERS.ensure('articles', key, next); })
        .then(function (drew) { if (drew) toast('Share picture drawn for it', 'success'); })
        .catch(function () { /* the article is saved; the picture can wait */ });
    }).catch(function (e) { fail(back, e.message); });
  }

  /* The escape hatch. It is not the front door any more, but a JSONB document
     can hold something no form here knows about, and taking that away would
     be a real loss rather than a simplification. */
  function rawEditor(tbl, key, data, panel) {
    var back = dialog('Everything in this record',
      '<p class="cp-note" style="margin-bottom:var(--space-4)">This is the record exactly as the '
        + 'database holds it. The form is the way in for everything routine; this is here for the '
        + 'day something needs a field the form does not have.</p>' +
      field('raw-json', 'The record',
        '<textarea class="textarea" id="raw-json" spellcheck="false" rows="18" '
          + 'style="font-family:var(--font-mono);font-size:var(--step--2)">' +
          esc(JSON.stringify(data, null, 2)) + '</textarea>'), 860);
    $('[data-save]', back).addEventListener('click', function () {
      var parsed;
      try { parsed = JSON.parse($('#raw-json', back).value); }
      catch (e) { fail(back, 'That is not valid JSON: ' + e.message); return; }
      CP.upsert(tbl, key, parsed).then(function () {
        toast('Saved', 'success'); back.remove(); refresh(panel);
      }).catch(function (e) { fail(back, e.message); });
    });
  }

  function removeRow(tbl, key, what, panel) {
    confirmAction({
      title: 'Delete ' + what + '?',
      body: 'It comes off the website at the next publish.',
      detail: 'This cannot be undone from here. Take a backup from Settings first if you are unsure.',
    }).then(function (yes) {
      if (!yes) return;
      CP.remove(tbl, key).then(function () { toast('Deleted', 'success'); refresh(panel); })
        .catch(function (e) { toast(e.message, 'error'); });
    });
  }

  /* An id for a new record, in the format the existing rows already use. */
  function newId(prefix) { return prefix + '-' + Date.now(); }

  /* "05 Jun 2026", which is how every stored record writes a date. */
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function pretty(iso) {
    var p = String(iso || '').split('-');
    return p.length === 3 ? p[2] + ' ' + MON[Number(p[1]) - 1] + ' ' + p[0] : '';
  }
  function toIso(s) {
    var m = String(s || '').match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
    if (!m) return '';
    var i = MON.indexOf(m[2].slice(0, 3));
    return i < 0 ? '' : m[3] + '-' + String(i + 1).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0');
  }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /* ==========================================================================
     NEWS
     ========================================================================== */
  var CATS = ['News', 'Club', 'Match report', 'Cause', 'Sponsorship', 'Awards'];

  /* ARTICLES THE SITE PUBLISHES FROM CODE, WHICH NOBODY HERE CAN EDIT.
     A finished piece can be committed to src/data/articles-extra.json when
     there is no admin session to write it with - an anonymous INSERT into
     `articles` is refused by row-level security, which is the posture working
     as designed. The website shows it, and until it is a real row it cannot be
     touched without a deploy.

     The club IS signed in on this screen, so their session can write what the
     key cannot. Importing makes it an ordinary article they own, and the file
     copy loses to the stored row on the slug from that moment.

     Fetched rather than seeded: a long article is tens of kilobytes and
     control-seed.js loads before every screen. Failure is silent and the
     banner simply does not appear, because this is an offer and not a
     feature anything depends on. */
  function baselineArticles() {
    try {
      return fetch('/baseline-articles.json')
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (a) { return Array.isArray(a) ? a : []; })
        .catch(function () { return []; });
    } catch (e) { return Promise.resolve([]); }
  }

  M.news = function (host) {
    return Promise.all([CP.readAll('articles'), baselineArticles()]).then(function (both) {
      var rows = both[0];
      /* Matched on the TITLE, because that is what the site slugs on and what
         the club would recognise. A row whose title matches is the same piece
         however it was keyed. */
      var titles = {};
      rows.forEach(function (r) { titles[String((r.data || {}).title || '').trim()] = 1; });
      var unowned = both[1].filter(function (a) {
        return !titles[String(((a.data || {}).title) || '').trim()];
      });
      var list = rows.slice().sort(function (a, b) {
        return String((b.data || {}).sortISO || '').localeCompare(String((a.data || {}).sortISO || ''));
      });
      var drafts = list.filter(function (r) { return (r.data || {}).draft; }).length;
      host.innerHTML = (unowned.length
        ? sec({
          warn: true,
          title: unowned.length + ' article' + (unowned.length === 1 ? ' is' : 's are')
            + ' not in the database yet',
          sub: 'The website is showing this from the site’s code, so it cannot be edited '
            + 'here and a change needs a developer. Import it once and it becomes an '
            + 'ordinary article you control. Nothing on the website changes when you do.',
          actions: '<button class="btn btn--primary" data-import-articles>Import '
            + esc(unowned.length) + (unowned.length === 1 ? ' article' : ' articles') + '</button>',
          body: '<ul class="cp-list">' + unowned.map(function (a) {
            var x = a.data || {};
            return '<li><b>' + esc(x.title || 'Untitled') + '</b> · ' + esc(x.date || '')
              + ' · ' + esc(String(x.lede || '').split(/\s+/).length) + ' words</li>';
          }).join('') + '</ul>',
        })
        : '') + sec({
        title: 'Club news',
        sub: esc(list.length) + ' articles'
          + (drafts ? ', ' + esc(drafts) + ' of them ' + (drafts === 1 ? 'a draft' : 'drafts')
            + ' the website does not show' : '')
          + '. Written here as prose, not as a JSON document: '
          + 'blank lines between paragraphs, exactly as it reads on the website.',
        actions: '<button class="btn btn--primary" data-new>Write an article</button>',
        body: (list.length
          ? table(['Headline', 'Category', 'Date', 'Cover', ''], list.map(function (r) {
            var d = r.data || {};
            return '<tr data-key="' + esc(r.key) + '">' +
              '<td><b>' + esc(d.title || 'Untitled') + '</b>' +
                (d.draft ? ' <span class="badge badge--warning">Draft</span>' : '') + '</td>' +
              '<td>' + esc(d.cat || 'News') + '</td>' +
              '<td>' + esc(d.date || '') + '</td>' +
              '<td>' + (d.cover
                ? '<span class="badge badge--success">Yes</span>'
                : '<span class="badge badge--warning">None</span>') + '</td>' +
              '<td><button class="btn btn--ghost btn--sm" data-edit>Edit</button> ' +
                '<button class="btn btn--quiet btn--sm" data-raw>Raw</button> ' +
                '<button class="btn btn--danger btn--sm" data-del>Delete</button></td>' +
            '</tr>';
          }).join(''))
          : empty('No articles yet', 'Write one and it appears on the news page and the home page feed.')),
        where: [['News', '/news.html'], ['Home page', '/']],
      });

      function form(rec) {
        var d = (rec && rec.data) || {};
        var isNew = !rec;
        var back = dialog(isNew ? 'Write an article' : 'Edit this article',
          '<div class="grid grid--2">' +
            field('a-title', 'Headline', text('a-title', d.title, 'What happened, in a line')) +
            field('a-cat', 'Category', choose('a-cat', d.cat || 'News', CATS)) +
            field('a-date', 'Date', '<input class="input" id="a-date" type="date" value="' +
              esc(toIso(d.date) || d.sortISO || today()) + '">') +
            /* SOMEWHERE TO LEAVE A PIECE UNFINISHED. Saving writes to the
               database and Publish to site puts everything in the database on
               the website, so an article started on a Tuesday and meant for
               the weekend went live the moment anybody published for an
               unrelated reason. A draft is kept out of the build entirely: no
               feed card, no page, no sitemap entry. */
            field('a-draft', 'On the website', choose('a-draft', d.draft ? 'draft' : 'live', [
              ['live', 'Published'], ['draft', 'Draft, keep it off the site'],
            ]), 'A draft is saved here and stays off the website until you publish it.') +
            imageField('a-cover', 'Cover image', d.cover,
              { max: 1200, hint: 'Optional. Shown on the news page and when the article is shared.' }) +
          '</div>' +
          '<h4 class="mform__h">The article</h4>' +
          field('a-body', 'What you want to say',
            area('a-body', d.lede || d.body || '', 16,
              'Leave a blank line between paragraphs.'),
            'This is the whole article. It appears on the news page and gets its own page.') +
          '<p class="field__hint" data-count></p>');

        wireUploads(back);
        var body = $('#a-body', back);
        function count() {
          var n = body.value.trim().split(/\s+/).filter(Boolean).length;
          var mins = Math.max(1, Math.round(n / 200));
          $('[data-count]', back).textContent = n
            ? n + ' words, about ' + mins + ' minute' + (mins === 1 ? '' : 's') + ' to read'
            : 'Nothing written yet';
        }
        body.addEventListener('input', count);
        count();

        $('[data-save]', back).addEventListener('click', function () {
          var title = val(back, 'a-title');
          if (!title) { fail(back, 'The article needs a headline.'); return; }
          if (!body.value.trim()) { fail(back, 'The article needs something in it.'); return; }
          var iso = val(back, 'a-date') || today();
          var key = rec ? rec.key : newId('art');
          put(back, 'articles', key, d, {
            id: key,
            title: title,
            cat: val(back, 'a-cat'),
            draft: val(back, 'a-draft') === 'draft',
            date: pretty(iso),
            sortISO: iso,
            lede: body.value.trim(),
            cover: val(back, 'a-cover'),
          }, 'news');
        });
      }

      host.addEventListener('click', function (e) {
        if (e.target.matches('[data-new]')) { if (guard()) form(null); return; }
        if (e.target.matches('[data-import-articles]')) {
          if (!guard()) return;
          e.target.disabled = true;
          /* ONE AT A TIME, IN ORDER, and the screen only refreshes once every
             write has landed. A partial import that reported success would
             leave the club looking at a banner that no longer matches what is
             stored. */
          unowned.reduce(function (chain, a) {
            return chain.then(function () {
              return CP.upsert('articles', a.key, a.data);
            });
          }, Promise.resolve()).then(function () {
            U.toast('Imported. You can edit it here now.');
            U.refresh('news');
          }).catch(function () {
            e.target.disabled = false;
            U.toast('Could not import. Nothing was changed on the website.', 'error');
          });
          return;
        }
        var tr = e.target.closest('tr[data-key]');
        if (!tr) return;
        var rec = list.filter(function (x) { return x.key === tr.getAttribute('data-key'); })[0];
        if (e.target.matches('[data-edit]')) { if (guard()) form(rec); return; }
        if (e.target.matches('[data-raw]')) { if (guard()) rawEditor('articles', rec.key, rec.data, 'news'); return; }
        if (e.target.matches('[data-del]')) {
          if (guard()) removeRow('articles', rec.key, '“' + ((rec.data || {}).title || 'this article') + '”', 'news');
        }
      });
    });
  };

  /* ==========================================================================
     GALLERY

     The album editor was a textarea holding forty photograph URLs and a plea
     not to break them. You could not see a picture, could not remove one
     without finding its line, and could not reorder anything. Tagging who was
     in a photograph was a different section entirely, so naming the players in
     an album you had just uploaded meant leaving, finding the album again in
     another dropdown, and starting over.

     Now the album editor shows the photographs. Each one can be removed, moved,
     made the cover, or tagged, in the place you are already standing. Uploading
     is a file picker, and every picture is resized on the way in.

     The tag list runs PARALLEL to the photo list: entry i names who is in photo
     i. That is the shape the club's 448 already-tagged photographs are stored
     in, so removing or moving a photograph has to move its tags with it or 448
     tags silently attach themselves to the wrong pictures. Every operation here
     does the two together.
     ========================================================================== */
  var ALBUM_CATS = ['Matchday', 'Training', 'Club', 'Awards', 'Community'];

  /* WHICH MATCH AN ALBUM IS OF, offered as a list rather than typed.

     The seven existing albums each re-typed the fixture, the competition, the
     matchday and the date into the title as one string, and two of the seven
     lost the separator before the competition, so the gallery printed
     "Sue's Angels 4-2 BPR Men's League Ten" as the fixture. The date field
     held the afternoon the album was uploaded rather than the day of the
     match, so all seven read June 2026 for games played across an autumn and
     a winter.

     Naming the match instead means the site draws the scoreline, the
     competition and the date from the match record, which is where they
     already live and where the results page and the report read them from.
     It also joins the two pages: the album offers the report, the report
     offers the 175 photographs somebody took of it.

     Existing albums resolve by the date in their title, so nothing has to be
     re-saved for the link to work. This is what stops the next one needing
     that. */
  function matchOptions(rows) {
    var out = [['', 'Not a match']];
    (rows || []).slice()
      .sort(function (a, b) { return String(b.key).localeCompare(String(a.key)); })
      .forEach(function (row) {
        var d2 = row.data || {};
        var when = String(d2.date || '').slice(0, 10);
        var side = d2.home && d2.away ? d2.home + ' v ' + d2.away : '';
        var score = (d2.hs != null && d2.as != null) ? ' ' + d2.hs + '-' + d2.as : '';
        var label = (side || row.key) + score + (when ? '  ·  ' + when : '');
        out.push([row.key, label]);
      });
    return out;
  }

  M.media = function (host) {
    /* The matches are read for one reason: the album form offers them by name
       so an album can say which game it is of. */
    return Promise.all([CP.readAll('gallery'), CP.readAll('matches')])
      .then(function (r) { return mediaPanel(host, r[0] || [], r[1] || []); });
  };

  function mediaPanel(host, rows, matchRows) {
    return Promise.resolve().then(function () {
      var list = rows.slice().sort(function (a2, b2) {
        return Number((b2.data || {}).sort || 0) - Number((a2.data || {}).sort || 0);
      });
      var photos = list.reduce(function (n, x) { return n + (((x.data || {}).photos) || []).length; }, 0);
      /* Who can be tagged: the squad, plus anyone already tagged anywhere, so
         the names offered match the ones the club has been using. */
      var names = SQUAD.map(function (p) { return p.name; });
      list.forEach(function (x) {
        var d = x.data || {};
        (d.tags || []).forEach(function (t) { names.push(t); });
        (d.photoTags || []).forEach(function (t) {
          (t || []).forEach(function (one) { names.push(typeof one === 'string' ? one : one.name); });
        });
      });
      names = names.filter(function (v, i, arr) { return v && arr.indexOf(v) === i; }).sort();

      host.innerHTML = sec({
        title: 'Albums',
        sub: esc(list.length) + ' albums holding ' + esc(photos) + ' photographs. Open one and you can '
          + 'see every picture, take one out, move it, make it the cover, and say who is in it, '
          + 'without leaving the album.',
        actions: '<button class="btn btn--primary" data-new>New album</button>',
        body: (list.length
          ? table(['Album', 'Category', 'Photographs', 'Tagged', 'Photographer', ''], list.map(function (x) {
            var d = x.data || {};
            var pt = (d.photoTags || []).filter(function (t) { return t && t.length; }).length;
            var n = (d.photos || []).length;
            return '<tr data-key="' + esc(x.key) + '">' +
              '<td>' + (d.cover || d.src
                ? '<img src="' + esc(d.cover || d.src) + '" alt="" width="40" height="40" '
                  + 'style="border-radius:6px;object-fit:cover;float:left;margin-right:10px">' : '') +
                '<b>' + esc(d.title || 'Album') + '</b></td>' +
              '<td>' + esc(d.category || 'Matchday') + '</td>' +
              '<td>' + esc(n) + '</td>' +
              '<td>' + (n && pt === n ? '<span class="badge badge--success">All</span>'
                : pt ? esc(pt) + ' of ' + esc(n)
                  : '<span class="badge badge--warning">None</span>') + '</td>' +
              '<td>' + esc(d.photographer || '') + '</td>' +
              '<td><button class="btn btn--ghost btn--sm" data-edit>Open</button> ' +
                '<button class="btn btn--quiet btn--sm" data-raw>Raw</button> ' +
                '<button class="btn btn--danger btn--sm" data-del>Delete</button></td>' +
            '</tr>';
          }).join(''))
          : empty('No albums yet', 'Create one and add the photographs straight into it.')),
        where: [['Gallery', '/gallery.html'], ['Every player profile', '/squad.html']],
        whereNote: 'a tagged player is linked to their profile under the photograph',
      });

      function form(rec) {
        var d = (rec && rec.data) || {};
        var isNew = !rec;
        /* Working copies. Nothing is written until Save, so a mis-click on a
           remove button is one Cancel away from undone. */
        var pics = ((d.photos) || []).slice();
        var tags = [];
        /* Named apart from the `i` and `at` the handlers below use. `var` is
           function-scoped, so a loop counter up here and one inside a listener
           are the same name in two scopes waiting to be confused - which is
           exactly how a `var rec` in one branch of a handler once shadowed the
           match's own `rec` and broke saving. */
        for (var pi = 0; pi < pics.length; pi++) {
          var raw = (d.photoTags || [])[pi];
          tags.push(((raw || []).map(function (t) { return typeof t === 'string' ? t : t.name; })
            .filter(Boolean)));
        }
        var cover = d.cover || d.src || '';
        var open = -1;
        /* WHICH PHOTOGRAPHS ARE PICKED, held by URL rather than by position.
           A position is only true until something before it is removed, and
           the whole point of picking several is that they are removed
           together. */
        var picked = Object.create(null);
        var big = -1;   // the one opened full size, -1 for none

        var back = dialog(isNew ? 'New album' : 'Edit this album',
          '<div class="grid grid--2">' +
            field('g-match', 'Which match', choose('g-match', d.matchId || '', matchOptions(matchRows)),
              'Name the match and the website draws the fixture, the competition and the date '
              + 'from its record, and links the album and the match report to each other.') +
            field('g-title', 'Album title', text('g-title', d.title, 'Sue’s Angels 4-2 BPR Men’s'),
              'Only used where the album is not a match.') +
            field('g-cat', 'Category', choose('g-cat', d.category || 'Matchday', ALBUM_CATS)) +
            field('g-date', 'Date', '<input class="input" id="g-date" type="date" value="' +
              esc(toIso(d.date) || String(d.date || '').slice(0, 10) || today()) + '">',
              'The match date wins where a match is named above.') +
            field('g-by', 'Photographer', text('g-by', d.photographer, 'Who took them')) +
          '</div>' +
          '<h4 class="mform__h">The photographs</h4>' +
          '<div class="cp-head__actions" style="margin-bottom:var(--space-3)">' +
            '<label class="btn btn--primary btn--sm" style="cursor:pointer">Add photographs' +
              '<input type="file" accept="image/*" multiple hidden data-add-pics></label>' +
            /* PICKING SEVERAL, because the real job is culling. An album is
               175 frames of one Sunday morning and a good number of them are
               somebody's elbow. Removing those one at a time is 30 taps, and
               the grid shifts under your finger after each one. */
            '<button type="button" class="btn btn--ghost btn--sm" data-pick-all>Select all</button>' +
            '<button type="button" class="btn btn--ghost btn--sm" data-pick-none hidden>Clear</button>' +
            '<button type="button" class="btn btn--danger btn--sm" data-pick-del hidden></button>' +
            '<span class="cp-note" data-pic-note></span>' +
          '</div>' +
          '<div data-pics></div>' +
          /* Full size, over the grid. A 190px tile is enough to see that a
             photograph exists and not enough to judge whether it is sharp or
             who is actually in it, which is the whole of the decision being
             made. */
          '<div class="picbig" data-big hidden>' +
            '<button type="button" class="picbig__x" data-big-close aria-label="Close">&times;</button>' +
            '<img data-big-img alt="">' +
            '<div class="picbig__bar">' +
              '<button type="button" class="btn btn--ghost btn--sm" data-big-prev>Previous</button>' +
              '<span class="picbig__n" data-big-n></span>' +
              '<button type="button" class="btn btn--ghost btn--sm" data-big-next>Next</button>' +
              '<button type="button" class="btn btn--ghost btn--sm" data-big-cover>Make it the cover</button>' +
              '<button type="button" class="btn btn--danger btn--sm" data-big-del>Remove it</button>' +
            '</div>' +
          '</div>', 920);

        /* ONE WAY OUT, AND IT ASKS FIRST.

           Removing a photograph was the only destructive action in the panel
           that did not confirm, against the rule every other one follows. On a
           phone the × sits a few millimetres from Tag and from the arrows, and
           there is no undo: the album is saved from this array, so a mis-tap
           followed by Save is a photograph gone.

           Both routes come through here - the × on a tile and the picked set -
           so there is one confirmation, one splice, and one place for the rule
           that the tags go with the photograph. */
        function removePics(list) {
          var srcs = list.filter(function (u) { return u; });
          if (!srcs.length) return;
          var one = srcs.length === 1;
          confirmAction({
            title: one ? 'Remove this photograph' : 'Remove ' + srcs.length + ' photographs',
            body: one
              ? 'It comes out of the album, and whoever is tagged in it is untagged.'
              : 'They come out of the album, and anybody tagged in them is untagged.',
            detail: 'Nothing is deleted from storage, and nothing changes on the website until you '
              + 'press Save.',
            confirmLabel: one ? 'Remove it' : 'Remove them',
          }).then(function (yes) {
            if (!yes) return;
            srcs.forEach(function (src) {
              var at = pics.indexOf(src);
              if (at < 0) return;
              /* The tags go with it. They are keyed by position, so removing a
                 photograph without removing its entry shifts every tag after
                 it onto the wrong picture. */
              if (cover === pics[at]) cover = '';
              pics.splice(at, 1);
              tags.splice(at, 1);
              delete picked[src];
              if (open === at) open = -1; else if (open > at) open--;
              if (big === at) big = -1; else if (big > at) big--;
            });
            if (big >= pics.length) big = -1;
            paint();
            if (big < 0) hideBig(); else showBig(big);
            toast(srcs.length + ' removed from the album. Save to keep it.', 'success');
          });
        }

        /* ---- Full size ---- */
        function showBig(i) {
          if (i < 0 || i >= pics.length) return hideBig();
          big = i;
          var box = $('[data-big]', back);
          $('[data-big-img]', box).src = pics[i];
          $('[data-big-n]', box).textContent = (i + 1) + ' of ' + pics.length
            + (pics[i] === cover ? ' · cover' : '');
          $('[data-big-prev]', box).disabled = i === 0;
          $('[data-big-next]', box).disabled = i === pics.length - 1;
          box.hidden = false;
        }
        function hideBig() {
          big = -1;
          var box = $('[data-big]', back);
          box.hidden = true;
          $('[data-big-img]', box).removeAttribute('src');
        }

        function paint() {
          $('[data-pics]', back).innerHTML = pics.length
            ? '<ul class="picgrid">' + pics.map(function (src, i) {
              var mine = tags[i] || [];
              var on = !!picked[src];
              return '<li class="picgrid__i' + (open === i ? ' is-open' : '') + (on ? ' is-picked' : '') +
                  '" data-pic="' + i + '">' +
                /* The image is the button. Tapping a photograph to see it
                   properly is what anybody expects a photograph to do, and it
                   is the only way to judge the one you are deciding about. */
                '<button type="button" class="picgrid__shot" data-pic-big ' +
                    'title="See it full size" aria-label="See photograph ' + (i + 1) + ' full size">' +
                  '<img src="' + esc(src) + '" alt="" loading="lazy">' +
                '</button>' +
                '<label class="picgrid__pick" title="Pick this one">' +
                  '<input type="checkbox" data-pic-pick' + (on ? ' checked' : '') + '>' +
                '</label>' +
                (src === cover ? '<span class="picgrid__cover">Cover</span>' : '') +
                '<div class="picgrid__bar">' +
                  '<button type="button" class="picgrid__b" data-pic-left title="Move earlier"' +
                    (i === 0 ? ' disabled' : '') + '>&#8592;</button>' +
                  '<button type="button" class="picgrid__b" data-pic-right title="Move later"' +
                    (i === pics.length - 1 ? ' disabled' : '') + '>&#8594;</button>' +
                  '<button type="button" class="picgrid__b" data-pic-cover title="Make this the cover">Cover</button>' +
                  '<button type="button" class="picgrid__b" data-pic-tag title="Who is in it">' +
                    (mine.length ? mine.length + ' tagged' : 'Tag') + '</button>' +
                  '<button type="button" class="picgrid__b picgrid__b--x" data-pic-del ' +
                    'title="Remove this photograph">&times;</button>' +
                '</div>' +
                (open === i
                  ? '<div class="picgrid__tags">' +
                      names.map(function (n) {
                        var on = mine.indexOf(n) !== -1;
                        return '<button type="button" class="chip' + (on ? ' is-active' : '') +
                          '" data-tag-name="' + esc(n) + '" aria-pressed="' + on + '">' + esc(n) + '</button>';
                      }).join('') +
                    '</div>'
                  : mine.length
                    ? '<p class="picgrid__who">' + esc(mine.join(', ')) + '</p>'
                    : '') +
              '</li>';
            }).join('') + '</ul>'
            : '<p class="me__none">No photographs yet. Add some above.</p>';
          var n = Object.keys(picked).length;
          $('[data-pic-note]', back).textContent = pics.length
            ? pics.length + ' photograph' + (pics.length === 1 ? '' : 's') + ', '
              + tags.filter(function (t) { return t && t.length; }).length + ' tagged'
              + (n ? ', ' + n + ' picked' : '')
            : 'Pictures are resized on the way in, so a phone photograph does not land on the site whole.';

          /* The remove button says how many it will remove, so the number is
             read before the button is pressed rather than after. */
          var del = $('[data-pick-del]', back);
          var clear = $('[data-pick-none]', back);
          del.textContent = 'Remove ' + n + ' picked';
          del.hidden = !n;
          clear.hidden = !n;
          $('[data-pick-all]', back).hidden = !pics.length;
        }
        paint();

        /* ---- The toolbar above the grid, and the viewer over it ---- */
        back.addEventListener('click', function (e) {
          if (e.target.matches('[data-pick-all]')) {
            pics.forEach(function (src) { picked[src] = 1; });
            paint();
            return;
          }
          if (e.target.matches('[data-pick-none]')) {
            picked = Object.create(null);
            paint();
            return;
          }
          if (e.target.matches('[data-pick-del]')) {
            if (guard()) removePics(Object.keys(picked));
            return;
          }
          if (e.target.matches('[data-big-close]')) { hideBig(); return; }
          if (e.target.matches('[data-big-prev]')) { showBig(big - 1); return; }
          if (e.target.matches('[data-big-next]')) { showBig(big + 1); return; }
          if (e.target.matches('[data-big-cover]')) {
            cover = pics[big];
            paint();
            showBig(big);
            return;
          }
          if (e.target.matches('[data-big-del]')) {
            if (guard()) removePics([pics[big]]);
          }
        });

        /* Arrow keys and Escape while the viewer is open, because looking
           through 175 photographs with a mouse aimed at one small button is
           not looking through them. */
        back.addEventListener('keydown', function (e) {
          if (big < 0) return;
          if (e.key === 'Escape') { e.stopPropagation(); hideBig(); }
          else if (e.key === 'ArrowRight') showBig(big + 1);
          else if (e.key === 'ArrowLeft') showBig(big - 1);
        });

        /* Uploading. Sequential rather than parallel, because ten photographs
           at once off a phone is forty megabytes of canvas work and the tab
           stops responding. */
        back.addEventListener('change', function (e) {
          if (!e.target.matches('[data-add-pics]')) return;
          var files = Array.prototype.slice.call(e.target.files || []);
          if (!files.length) return;
          if (!guard()) { e.target.value = ''; return; }
          var note = $('[data-pic-note]', back);
          var done = 0;
          files.reduce(function (chain, f) {
            return chain.then(function () {
              note.textContent = 'Uploading ' + (done + 1) + ' of ' + files.length + '.';
              return U.uploadImage(f, { max: 1600, prefix: 'album' }).then(function (out) {
                pics.push(out.url);
                tags.push([]);
                if (!cover) cover = out.url;
                done++;
              });
            });
          }, Promise.resolve()).then(function () {
            paint();
            note.textContent = done + ' added.';
          }).catch(function (err) {
            paint();
            note.textContent = err.message;
          });
          e.target.value = '';
        });

        back.addEventListener('click', function (e) {
          var li = e.target.closest('[data-pic]');
          if (!li) return;
          var i = Number(li.getAttribute('data-pic'));
          var swap = function (a2, b2) {
            var t = pics[a2]; pics[a2] = pics[b2]; pics[b2] = t;
            var g = tags[a2]; tags[a2] = tags[b2]; tags[b2] = g;
          };
          if (e.target.matches('[data-pic-left]')) { swap(i, i - 1); if (open === i) open = i - 1; paint(); return; }
          if (e.target.matches('[data-pic-right]')) { swap(i, i + 1); if (open === i) open = i + 1; paint(); return; }
          if (e.target.matches('[data-pic-cover]')) { cover = pics[i]; paint(); return; }
          if (e.target.matches('[data-pic-tag]')) { open = open === i ? -1 : i; paint(); return; }
          if (e.target.matches('[data-pic-pick]')) {
            if (picked[pics[i]]) delete picked[pics[i]]; else picked[pics[i]] = 1;
            paint();
            return;
          }
          if (e.target.closest('[data-pic-big]')) { showBig(i); return; }
          if (e.target.matches('[data-pic-del]')) {
            removePics([pics[i]]);
            return;
          }
          var chip = e.target.closest('[data-tag-name]');
          if (chip) {
            var name = chip.getAttribute('data-tag-name');
            var mine = tags[i] || (tags[i] = []);
            var at = mine.indexOf(name);
            if (at === -1) mine.push(name); else mine.splice(at, 1);
            paint();
          }
        });

        $('[data-save]', back).addEventListener('click', function () {
          var title = val(back, 'g-title');
          var matchId = val(back, 'g-match');
          /* A named match IS the album's identity, so the title stops being
             required: the site builds the heading from the record. Without
             one there is nothing else to call the album, so it is asked for. */
          if (!title && !matchId) { fail(back, 'Name the match, or give the album a title.'); return; }
          var iso = val(back, 'g-date') || today();
          var key = rec ? rec.key : newId('alb');
          put(back, 'gallery', key, d, {
            id: key,
            matchId: matchId,
            title: title,
            category: val(back, 'g-cat'),
            date: iso,
            sort: rec && d.sort ? d.sort : Date.now(),
            photographer: val(back, 'g-by'),
            photos: pics,
            cover: cover || pics[0] || '',
            src: cover || pics[0] || '',
            photoTags: tags,
            /* The album-level list is every name tagged anywhere in it, which
               is what the gallery page filters on. */
            tags: tags.reduce(function (acc, t) {
              (t || []).forEach(function (n) { if (acc.indexOf(n) === -1) acc.push(n); });
              return acc;
            }, []),
          }, 'media');
        });
      }

      host.addEventListener('click', function (e) {
        if (e.target.matches('[data-new]')) { if (guard()) form(null); return; }
        var tr = e.target.closest('tr[data-key]');
        if (!tr) return;
        var rec = list.filter(function (x) { return x.key === tr.getAttribute('data-key'); })[0];
        if (e.target.matches('[data-edit]')) { if (guard()) form(rec); return; }
        if (e.target.matches('[data-raw]')) { if (guard()) rawEditor('gallery', rec.key, rec.data, 'media'); return; }
        if (e.target.matches('[data-del]')) {
          if (guard()) removeRow('gallery', rec.key, '“' + ((rec.data || {}).title || 'this album') + '”', 'media');
        }
      });
    });
  }

  /* ==========================================================================
     RECOGNITION

     Player of the Month, the end-of-season awards, trophies, club records and
     who wore the armband. Five different shapes of record, and the awards page
     reads different fields from each: a season award needs a `title` and a
     `description`, a trophy needs a `value` and an icon, a club record needs a
     `recordKey` the page looks it up by, and leadership carries three players
     rather than one.

     The first version of this form asked for the same five fields whatever you
     picked, which meant a season award created here arrived on the awards page
     with no name and nothing written under it. The form follows the type now.

     The old editor asked for `type` as a code and `playerId` as a number, both
     of which you had to already know. Here they are both chosen by name.
     ========================================================================== */
  var RTYPES = [
    ['potm', 'Player of the Month'],
    ['season_award', 'End of season award'],
    ['trophy', 'Trophy or promotion'],
    ['club_record', 'Club record'],
    ['leadership', 'Captain and vice-captain'],
  ];
  var RLABEL = {};
  RTYPES.forEach(function (t) { RLABEL[t[0]] = t[1]; });
  var MONTHS_FULL = ['September', 'October', 'November', 'December', 'January',
    'February', 'March', 'April', 'May'];
  /* The seven the club already gives out. A datalist, not a fixed list, so an
     eighth can be invented without a code change. */
  var AWARD_NAMES = ['Players’ Player of the Year', 'Manager’s Player of the Year',
    'Clubman of the Year', 'Top Goalscorer', 'Top Assister', 'Goal of the Season',
    'Defensive Record Award'];
  var TROPHY_ICONS = [['trophy', 'Trophy'], ['medal', 'Medal'], ['star', 'Star']];

  /* A stable key from the title, so the awards page can look a record up by
     name rather than by whichever id the clock happened to give it. */
  function recordKeyFor(title) {
    return String(title).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }

  M.recognition = function (host) {
    return CP.readAll('recognition').then(function (rows) {
      var list = rows.slice().sort(function (a, b) {
        return String((b.data || {}).createdAt || '').localeCompare(String((a.data || {}).createdAt || ''));
      });
      var byName = {};
      SQUAD.forEach(function (p) { byName[p.num] = p.name; });

      function who(d) {
        if (d.type === 'leadership') return d.clubCaptainName || byName[d.clubCaptainPlayerId] || '';
        return d.playerName || byName[d.playerId] || '';
      }

      host.innerHTML = sec({
        title: 'Recognition',
        sub: esc(list.length) + ' entries. Player of the Month, the end-of-season awards, trophies, '
          + 'club records and who captains the side. The form changes with what you are recording, '
          + 'because a trophy and a Player of the Month are not the same shape.',
        actions: '<button class="btn btn--primary" data-new>Add recognition</button>',
        body: (list.length
          ? table(['What', 'Which', 'When', 'Who', 'Written up', ''], list.map(function (r) {
            var d = r.data || {};
            return '<tr data-key="' + esc(r.key) + '">' +
              '<td><b>' + esc(RLABEL[d.type] || d.type || 'Entry') + '</b></td>' +
              '<td>' + esc(d.title || '') + '</td>' +
              '<td>' + esc(d.month || d.season || '') + '</td>' +
              '<td>' + esc(who(d)) + '</td>' +
              '<td>' + ((d.reason || d.description || d.note)
                ? '<span class="badge badge--success">Yes</span>'
                : '<span class="badge badge--warning">No</span>') + '</td>' +
              '<td><button class="btn btn--ghost btn--sm" data-edit>Edit</button> ' +
                '<button class="btn btn--quiet btn--sm" data-raw>Raw</button> ' +
                '<button class="btn btn--danger btn--sm" data-del>Delete</button></td>' +
            '</tr>';
          }).join(''))
          : empty('Nothing recorded yet', 'Player of the Month and the season awards appear on the awards page.')),
        where: [['Awards', '/awards.html'], ['The player’s own profile', '/squad.html'],
          ['Coaches', '/coaches.html']],
        whereNote: 'trophies also appear on the about page',
      });

      var PLAYER_OPTS = [['', 'Nobody in particular']]
        .concat(SQUAD.map(function (p) { return [p.num, p.name]; }));

      function form(rec) {
        var d = (rec && rec.data) || {};
        var back = dialog(rec ? 'Edit this entry' : 'Add recognition',
          field('r-type', 'What are you recording', choose('r-type', d.type || 'potm', RTYPES)) +

          /* Player of the Month */
          '<div data-rfor="potm" class="grid grid--2" style="margin-top:var(--space-4)">' +
            field('r-player', 'Who won it', choose('r-player', d.playerId, PLAYER_OPTS)) +
            field('r-month', 'Month', choose('r-month', d.month || '', [['', 'Pick a month']].concat(MONTHS_FULL))) +
          '</div>' +

          /* End of season award */
          '<div data-rfor="season_award" class="grid grid--2" style="margin-top:var(--space-4)" hidden>' +
            field('r-award', 'Which award',
              '<input class="input" id="r-award" list="r-awards" value="' + esc(d.title || '') + '">' +
              '<datalist id="r-awards">' + AWARD_NAMES.map(function (a) {
                return '<option value="' + esc(a) + '"></option>';
              }).join('') + '</datalist>',
              'Any of the seven the club gives out, or a new one.') +
            field('r-aplayer', 'Who won it', choose('r-aplayer', d.playerId, PLAYER_OPTS)) +
          '</div>' +

          /* Trophy */
          '<div data-rfor="trophy" class="grid grid--2" style="margin-top:var(--space-4)" hidden>' +
            field('r-ttitle', 'What was won', text('r-ttitle', d.title, 'League Eight Champions')) +
            field('r-tvalue', 'The short version', text('r-tvalue', d.value, 'Champions'),
              'One or two words. This is what shows on the trophy itself.') +
            field('r-ticon', 'Mark', choose('r-ticon', d.icon || 'trophy', TROPHY_ICONS)) +
          '</div>' +

          /* Club record */
          '<div data-rfor="club_record" class="grid grid--2" style="margin-top:var(--space-4)" hidden>' +
            field('r-rtitle', 'The record', text('r-rtitle', d.title, 'Most goals in a season')) +
            field('r-rplayer', 'Who holds it', choose('r-rplayer', d.playerId, PLAYER_OPTS)) +
            field('r-rvalue', 'What they did', text('r-rvalue', d.value, '25 goals'),
              'The figure or the name the record is for.') +
          '</div>' +

          /* Leadership */
          '<div data-rfor="leadership" class="grid grid--2" style="margin-top:var(--space-4)" hidden>' +
            field('r-capt', 'Club captain', choose('r-capt', d.clubCaptainPlayerId, PLAYER_OPTS)) +
            field('r-vice', 'Vice-captain', choose('r-vice', d.viceCaptainPlayerId, PLAYER_OPTS)) +
            field('r-third', 'Third-choice captain', choose('r-third', d.thirdChoicePlayerId
              || d.thirdChoiceCaptainPlayerId, PLAYER_OPTS)) +
          '</div>' +

          '<div class="grid grid--2" style="margin-top:var(--space-4)">' +
            field('r-season', 'Season', text('r-season', d.season || '25/26', '25/26')) +
          '</div>' +

          '<h4 class="mform__h">Why</h4>' +
          field('r-reason', 'The write-up',
            area('r-reason', d.reason || d.description || d.note, 8,
              'What they did to earn it. Blank lines separate paragraphs.'),
            'This is what the awards page prints underneath.'));

        function syncType() {
          var t = $('#r-type', back).value;
          [].forEach.call(back.querySelectorAll('[data-rfor]'), function (el) {
            el.hidden = el.getAttribute('data-rfor') !== t;
          });
        }
        $('#r-type', back).addEventListener('change', syncType);
        syncType();

        $('[data-save]', back).addEventListener('click', function () {
          var type = $('#r-type', back).value;
          var season = val(back, 'r-season');
          var write = $('#r-reason', back).value.trim();
          var patch = { type: type, season: season, updatedAt: new Date().toISOString() };
          var pick = function (id) {
            var v = val(back, id);
            return v === '' ? null : Number(v);
          };
          var nameOf = function (num) {
            var p = SQUAD.filter(function (x) { return x.num === num; })[0];
            return p ? p.name : '';
          };

          if (type === 'potm') {
            patch.playerId = pick('r-player');
            if (patch.playerId == null) { fail(back, 'Player of the Month needs a player.'); return; }
            patch.playerName = nameOf(patch.playerId);
            patch.month = val(back, 'r-month');
            if (!patch.month) { fail(back, 'Which month was it for?'); return; }
            patch.reason = write;
          } else if (type === 'season_award') {
            patch.title = val(back, 'r-award');
            if (!patch.title) { fail(back, 'Name the award.'); return; }
            patch.playerId = pick('r-aplayer');
            patch.playerName = patch.playerId == null ? '' : nameOf(patch.playerId);
            patch.description = write;
          } else if (type === 'trophy') {
            patch.title = val(back, 'r-ttitle');
            if (!patch.title) { fail(back, 'Name what was won.'); return; }
            patch.value = val(back, 'r-tvalue') || patch.title;
            patch.icon = val(back, 'r-ticon');
            patch.description = write;
          } else if (type === 'club_record') {
            patch.title = val(back, 'r-rtitle');
            if (!patch.title) { fail(back, 'Name the record.'); return; }
            /* An existing record keeps the key the awards page already looks
               it up by. Renaming a record must not break the page that finds
               it by name. */
            patch.recordKey = d.recordKey || recordKeyFor(patch.title);
            patch.playerId = pick('r-rplayer');
            patch.playerName = patch.playerId == null ? '' : nameOf(patch.playerId);
            patch.value = val(back, 'r-rvalue') || patch.playerName;
            patch.description = write;
          } else {
            patch.clubCaptainPlayerId = pick('r-capt');
            patch.clubCaptainName = patch.clubCaptainPlayerId == null ? '' : nameOf(patch.clubCaptainPlayerId);
            patch.viceCaptainPlayerId = pick('r-vice');
            patch.viceCaptainName = patch.viceCaptainPlayerId == null ? '' : nameOf(patch.viceCaptainPlayerId);
            patch.thirdChoiceCaptainPlayerId = pick('r-third');
            patch.thirdChoiceCaptainName = patch.thirdChoiceCaptainPlayerId == null
              ? '' : nameOf(patch.thirdChoiceCaptainPlayerId);
            patch.note = write;
          }

          var key = rec ? rec.key : (type.replace(/_/g, '') + '-' + Date.now());
          patch.id = key;
          if (!rec) patch.createdAt = patch.updatedAt;

          /* Changing an entry's TYPE is the one case where preserving every
             field is wrong. Turn a season award into a trophy and it would
             otherwise keep the player it was awarded to, which is a fact about
             a record that no longer exists. Every field belonging only to
             another type is cleared; anything outside this list, which is
             anything a future version of the site adds, is still preserved. */
          var OWNED = ['playerId', 'playerName', 'month', 'reason', 'title', 'description',
            'value', 'icon', 'recordKey', 'note', 'clubCaptainPlayerId', 'clubCaptainName',
            'viceCaptainPlayerId', 'viceCaptainName',
            'thirdChoiceCaptainPlayerId', 'thirdChoiceCaptainName'];
          var base = {};
          Object.keys(d).forEach(function (k) {
            if (OWNED.indexOf(k) === -1 || Object.prototype.hasOwnProperty.call(patch, k)) base[k] = d[k];
          });
          put(back, 'recognition', key, base, patch, 'recognition');
        });
      }

      host.addEventListener('click', function (e) {
        if (e.target.matches('[data-new]')) { if (guard()) form(null); return; }
        var tr = e.target.closest('tr[data-key]');
        if (!tr) return;
        var rec = list.filter(function (x) { return x.key === tr.getAttribute('data-key'); })[0];
        if (e.target.matches('[data-edit]')) { if (guard()) form(rec); return; }
        if (e.target.matches('[data-raw]')) { if (guard()) rawEditor('recognition', rec.key, rec.data, 'recognition'); return; }
        if (e.target.matches('[data-del]')) {
          if (guard()) removeRow('recognition', rec.key, RLABEL[(rec.data || {}).type] || 'this entry', 'recognition');
        }
      });
    });
  };

  /* ==========================================================================
     OPPONENT BADGES
     ========================================================================== */
  M.league = function (host) {
    return CP.readAll('team_badges').then(function (rows) {
      var list = rows.slice().sort(function (a, b) { return String(a.key).localeCompare(String(b.key)); });
      var known = (SEED.clubs || []);
      var have = {};
      list.forEach(function (r) { have[r.key] = true; });
      var missing = known.filter(function (c) { return !have[c]; });

      host.innerHTML = sec({
        title: 'Opponent badges',
        sub: 'A club crest shown beside that club anywhere it appears. Clubs without one here fall '
          + 'back to the site’s own records, and then to their initials.'
          + (missing.length ? ' <b>' + esc(missing.length) + '</b> clubs have no badge stored.' : ''),
        actions: '<button class="btn btn--primary" data-new>Add a badge</button>',
        body: (list.length
          ? table(['Club', 'Badge', 'Shape', ''], list.map(function (r) {
            var d = r.data || {};
            return '<tr data-key="' + esc(r.key) + '">' +
              '<td><b>' + esc(r.key) + '</b></td>' +
              '<td>' + (d.src
                ? '<img src="' + esc(d.src) + '" alt="" width="28" height="28" style="border-radius:4px">'
                : '<span class="badge badge--warning">None</span>') + '</td>' +
              '<td>' + esc(d.aspect || 'circle') + '</td>' +
              '<td><button class="btn btn--ghost btn--sm" data-edit>Edit</button> ' +
                '<button class="btn btn--danger btn--sm" data-del>Delete</button></td>' +
            '</tr>';
          }).join(''))
          : empty('No badges stored', 'Opponent crests come from the site’s own records until one is added here.')),
        where: [['League table', '/league.html'], ['Fixtures', '/fixtures.html'], ['Results', '/results.html']],
      });

      function form(rec) {
        var d = (rec && rec.data) || {};
        var back = dialog(rec ? 'Edit this badge' : 'Add a badge',
          field('b-club', 'Club',
            rec ? text('b-club', rec.key) :
            '<input class="input" id="b-club" list="b-clubs" placeholder="Start typing a club">' +
            '<datalist id="b-clubs">' + known.map(function (c) {
              return '<option value="' + esc(c) + '"></option>';
            }).join('') + '</datalist>',
            'Spelt exactly as it is on the fixtures list, or the badge will not find its club.') +
          '<div style="margin-top:var(--space-4)">' +
            imageField('b-src', 'The badge', d.src,
              { max: 240, keepAlpha: true,
                hint: 'A club crest usually has a transparent background, so an uploaded one is kept as a PNG.' }) +
          '</div>' +
          field('b-aspect', 'Shape', choose('b-aspect', d.aspect || 'circle',
            [['circle', 'Round'], ['shield', 'Shield'], ['square', 'Square']])) +
          field('b-alt', 'Description for screen readers', text('b-alt', d.alt, 'Barnes Stormers club crest')),
          620);
        wireUploads(back);

        $('[data-save]', back).addEventListener('click', function () {
          var club = val(back, 'b-club');
          var src = val(back, 'b-src');
          if (!club) { fail(back, 'Name the club.'); return; }
          if (!src) { fail(back, 'The badge needs an address.'); return; }
          put(back, 'team_badges', club, d, {
            src: src,
            alt: val(back, 'b-alt') || (club + ' club crest'),
            aspect: val(back, 'b-aspect'),
          }, 'league');
        });
      }

      host.addEventListener('click', function (e) {
        if (e.target.matches('[data-new]')) { if (guard()) form(null); return; }
        var tr = e.target.closest('tr[data-key]');
        if (!tr) return;
        var rec = list.filter(function (x) { return x.key === tr.getAttribute('data-key'); })[0];
        if (e.target.matches('[data-edit]')) { if (guard()) form(rec); return; }
        if (e.target.matches('[data-del]')) { if (guard()) removeRow('team_badges', rec.key, rec.key + '’s badge', 'league'); }
      });
    });
  };

  /* ==========================================================================
     SPONSORS

     This section confused everybody who opened it, and fairly: it showed a
     table headed "Key / Data / Updated" with one row reading "sponsor:matchreport"
     and an empty string, next to a paragraph explaining that the real sponsors
     are in the code. So it looked like the club's sponsorship was broken.

     Nothing was broken. There are two different things here and the section
     never said so.

     THE PARTNERS are the five businesses whose logos are on the shirt and
     across the sponsors page. Their marks are contractual assets that ship as
     optimised static files, and changing one is a deliberate code change, on
     purpose: nobody should be able to alter a partner's logo by accident from
     a phone.

     THE SPONSORSHIPS are the small things sold during a season, one at a
     time: a match report, a player's season, a match ball. They change often
     and they belong in the database, which is what this table is. It was
     empty because none have been sold yet, and an empty table with no
     explanation reads as a fault rather than as a to-do list.

     So the section now names what is for sale, says which of them are taken,
     and points at the pipeline for the ones that are not.
     ========================================================================== */
  /* What a club this size can actually sell, with what the site does when
     somebody buys it. Prices are the club's to set; this is the shelf. */
  var SLOTS = [
    { key: 'matchreport', label: 'The match report',
      what: 'Their name on every match report for the season.' },
    { key: 'matchball', label: 'The match ball',
      what: 'Named as the match ball sponsor on that game’s report.' },
    { key: 'motm', label: 'Player of the Match',
      what: 'Named alongside the award on every match report.' },
  ];

  /* ==========================================================================
     THE CLUB'S PARTNERS ARE EDITABLE

     They were code, and the section said so at length: the logos are
     contractual assets, changing one is a deliberate code change, "it is on
     purpose". True of the LOGO FILE and of nothing else on the record. The
     name, the tier, the trade, the blurb, the placements and the links are
     words, and the club changed its main kit sponsor for 26/27 - which under
     that arrangement meant finding a developer. "How do I add a sponsor?" had
     no answer on the one screen called Sponsors.

     The logo is uploaded like a badge and kept as a PNG so a transparent mark
     stays transparent. The record is one row holding the ordered list,
     because the order IS the billing order.

     Absent means the code baseline, so a club that never opens this gets the
     pages it has today, byte for byte. See src/lib/partners.mjs.
     ========================================================================== */
  var PARTNERS_KEY = 'sponsor:partners';

  function moneyish(n) { return '£' + Math.round(Number(n) || 0).toLocaleString('en-GB'); }

  var LINK_HOSTS = [['instagram', 'Instagram'], ['linkedin', 'LinkedIn'], ['facebook', 'Facebook'],
    ['x.com', 'X'], ['twitter', 'X'], ['tiktok', 'TikTok'], ['youtube', 'YouTube']];
  function linkLabel(href) {
    var h = String(href).toLowerCase();
    for (var i = 0; i < LINK_HOSTS.length; i++) {
      if (h.indexOf(LINK_HOSTS[i][0]) > -1) return LINK_HOSTS[i][1];
    }
    return 'Website';
  }

  M.sponsors = function (host) {
    return CP.readAll('player_photos').then(function (rows) {
      var stored = rows.filter(function (r) { return r.key.indexOf('sponsor:') === 0
        && r.key !== 'sponsor:pipeline' && r.key !== PARTNERS_KEY; });

      /* The stored list wins outright; with nothing stored the build hands
         over what the site is publishing, so the table opens showing the four
         partners already on the shirt rather than empty. */
      var prow = rows.filter(function (r) { return r.key === PARTNERS_KEY; })[0];
      var pstored = (prow && prow.data && prow.data.list) || [];
      var PARTNERS = (pstored.length ? pstored : (SEED.partners || []))
        .filter(function (p) { return p && p.name; })
        .map(function (p) {
          return Object.assign({}, p, {
            onStrip: p.onStrip !== false, onPage: p.onPage !== false,
          });
        });
      var strip = PARTNERS.filter(function (p) { return p.onStrip; });
      var page = PARTNERS.filter(function (p) { return p.onPage; });

      /* The pipeline's own row, read here so the pointer below carries a
         figure instead of a sentence about another screen. */
      var pipeRow = rows.filter(function (r) { return r.key === 'sponsor:pipeline'; })[0];
      var pipeData = (pipeRow && pipeRow.data) || {};
      var pipeLeads = (pipeData.leads || []).filter(function (l) { return l && l.company; });
      var pipeline = {
        leads: pipeLeads,
        committedTxt: moneyish(pipeLeads
          .filter(function (l) { return l.status === 'Committed'; })
          .reduce(function (t, l) { return t + (Number(l.amount) || 0); }, 0)),
        targetTxt: moneyish(Number(pipeData.target) || 4000),
      };

      function savePartners(next, msg) {
        return CP.upsert('player_photos', PARTNERS_KEY, { list: next })
          .then(function () { toast(msg || 'Saved', 'success'); refresh('sponsors'); })
          .catch(function (e) { toast(e.message, 'error'); });
      }
      var byKey = {};
      stored.forEach(function (r) {
        var raw = r.data;
        byKey[r.key.replace('sponsor:', '')] = typeof raw === 'string' ? { name: raw } : (raw || {});
      });
      /* A player's own season is sellable too, so the shelf is the fixed slots
         plus one per player, and the table below lists whatever is actually
         sold rather than thirty-seven empty rows. */
      var sold = Object.keys(byKey).filter(function (k) { return byKey[k] && byKey[k].name; });

      function labelFor(key) {
        var slot = SLOTS.filter(function (x) { return x.key === key; })[0];
        if (slot) return slot.label;
        var m = String(key).match(/^player-(\d+)$/);
        if (m) {
          var p = SQUAD.filter(function (x) { return String(x.num) === m[1]; })[0];
          return p ? p.name + '’s season' : 'A player’s season';
        }
        return key;
      }

      host.innerHTML =
        sec({
          title: 'What the club has sold',
          sub: sold.length
            ? '<b>' + esc(sold.length) + '</b> sponsorship' + (sold.length === 1 ? '' : 's')
              + ' recorded. Each one shows up on the website wherever the thing they sponsored appears.'
            : 'Nothing sold yet. This is not a fault: it is the list of small sponsorships the club '
              + 'sells during a season, and none have been taken. Add one the moment somebody says yes.',
          actions: '<button class="btn btn--primary" data-new>Record a sponsorship</button>',
          body: (sold.length
            ? table(['What they sponsor', 'Sponsor', 'Link', ''], sold.map(function (k) {
              var d = byKey[k];
              return '<tr data-key="sponsor:' + esc(k) + '">' +
                '<td><b>' + esc(labelFor(k)) + '</b></td>' +
                '<td>' + esc(d.name) + '</td>' +
                '<td>' + (d.url
                  ? '<a href="' + esc(d.url) + '" target="_blank" rel="noopener">their site</a>' : '') + '</td>' +
                '<td><button class="btn btn--ghost btn--sm" data-edit>Edit</button> ' +
                  '<button class="btn btn--danger btn--sm" data-del>Remove</button></td>' +
              '</tr>';
            }).join(''))
            : ''),
          where: [['Sponsors', '/sponsors.html'], ['Match reports', '/results.html']],
        }) +

        sec({
          title: 'What is still for sale',
          sub: 'The small sponsorships that turn over during a season. Somewhere to point a '
            + 'prospect, and somewhere to look when one says yes.',
          body: '<ul class="cp-list">' +
            SLOTS.map(function (x) {
              var taken = byKey[x.key] && byKey[x.key].name;
              return '<li><b>' + esc(x.label) + '</b> &middot; ' + esc(x.what) + ' ' +
                (taken
                  ? '<span class="badge badge--success">' + esc(taken) + '</span>'
                  : '<span class="badge badge--warning">Available</span>') + '</li>';
            }).join('') +
            '<li><b>A player’s season</b> &middot; Their name on that player’s profile for the year. ' +
              '<span class="badge badge--neutral">' +
                esc(sold.filter(function (k) { return /^player-/.test(k); }).length) +
                ' of ' + esc(SQUAD.length) + ' taken</span></li>' +
          '</ul>',
          where: [['Sponsorship packages', '/sponsors.html']],
          whereNote: 'the page a prospect reads',
        }) +

        sec({
          title: 'The club’s partners',
          sub: 'The businesses on the shirt and across the sponsors page. Add one the day a deal '
            + 'is signed. <b>' + esc(strip.length) + '</b> on the home page strip, <b>'
            + esc(page.length) + '</b> with a full write-up on the sponsors page.',
          actions: '<button class="btn btn--primary" data-newpartner>Add a partner</button>',
          body: table(['Partner', 'What they are', 'Where they show', ''],
            PARTNERS.map(function (p, i) {
              return '<tr data-pi="' + i + '">' +
                '<td><div class="cp-logo">' +
                  (p.logo ? '<img src="' + esc(p.logo) + '" alt="' + esc(p.name) + '">' : '') +
                  '<b>' + esc(p.name) + '</b></div></td>' +
                '<td>' + esc(p.role || '') +
                  (p.since ? '<br><span class="cp-dim">since ' + esc(p.since) + '</span>' : '') + '</td>' +
                '<td>' +
                  (p.onStrip ? '<span class="badge badge--success">Home page</span> ' : '') +
                  (p.onPage ? '<span class="badge badge--success">Sponsors page</span>' : '') +
                  (!p.onStrip && !p.onPage ? '<span class="badge badge--warning">Nowhere</span>' : '') +
                '</td>' +
                '<td><div class="cp-rowacts">' +
                  (i > 0 ? '<button class="btn btn--ghost btn--sm" data-pup aria-label="Move ' +
                    esc(p.name) + ' up">Up</button>' : '') +
                  '<button class="btn btn--ghost btn--sm" data-pedit>Edit</button>' +
                  '<button class="btn btn--danger btn--sm" data-pdel>Remove</button>' +
                '</div></td>' +
              '</tr>';
            }).join('')) +
            /* Under the table, not above it: a caveat about rows only makes
               sense once the rows are on screen. `sub` is read first. */
            '<p class="cp-note cp-sec__note">The order is the billing order and the home page '
              + 'shows the first four. A logo is the partner’s own mark and is never recoloured, '
              + 'so upload the file they gave you rather than one taken off their website.</p>',
          where: [['Sponsors', '/sponsors.html'], ['Home page', '/']],
        }) +

        /* THE POINTER HAS TO CARRY A FIGURE. This was a whole section whose
           only content was "the pipeline is over there", which is a nav item
           doing an impression of a screen. It says what is in the pipeline
           now, so it is worth the space it takes. */
        sec({
          title: 'Who else might back the club',
          sub: pipeline.leads.length
            ? '<b>' + esc(pipeline.leads.length) + '</b> prospect'
              + (pipeline.leads.length === 1 ? '' : 's') + ' on the list, <b>'
              + esc(pipeline.committedTxt) + '</b> committed of ' + esc(pipeline.targetTxt)
              + ' for the season. Nothing in the pipeline is published.'
            : 'Nobody on the list yet. The pipeline is the club’s own record of who has been '
              + 'asked and what they said, and none of it is published.',
          actions: '<button class="btn btn--glass btn--sm" data-goto-pipeline>Open the pipeline</button>',
        });

      function form(key) {
        var d = key ? byKey[key] : {};
        var back = dialog(key ? 'Edit this sponsorship' : 'Record a sponsorship',
          field('s-what', 'What have they sponsored',
            key ? text('s-what', labelFor(key)) + '<input type="hidden" id="s-key" value="' + esc(key) + '">'
              : choose('s-what', 'matchreport',
                SLOTS.map(function (x) { return [x.key, x.label]; })
                  .concat(SQUAD.map(function (p) { return ['player-' + p.num, p.name + '’s season']; }))),
            key ? 'This cannot be changed. Remove it and record a new one instead.' : '') +
          '<div class="grid grid--2" style="margin-top:var(--space-4)">' +
            field('s-name', 'Sponsor', text('s-name', d.name, 'The business or person')) +
            field('s-url', 'Their website', text('s-url', d.url, 'https://…')) +
          '</div>' +
          field('s-note', 'A line about them', area('s-note', d.note, 3),
            'Optional. Shown beside their name.'),
          640);
        if (key) $('#s-what', back).readOnly = true;

        $('[data-save]', back).addEventListener('click', function () {
          var what = key || val(back, 's-what');
          var name = val(back, 's-name');
          if (!what) { fail(back, 'Say what is being sponsored.'); return; }
          if (!name) { fail(back, 'Name the sponsor.'); return; }
          put(back, 'player_photos', 'sponsor:' + what, d,
            { name: name, url: val(back, 's-url'), note: val(back, 's-note') }, 'sponsors');
        });
      }

      /* ---- A partner ------------------------------------------------------
         Every field says where it lands, because the two pages show different
         parts of this record and a blurb typed for the sponsors page that
         never appears anywhere is the failure this whole panel exists to
         avoid. */
      function partnerForm(i) {
        var p = i == null
          ? { name: '', short: '', role: '', since: '', trade: '', body: '', detail: '',
              placements: [], links: [], logo: '', onStrip: true, onPage: true }
          : PARTNERS[i];
        var back = dialog(i == null ? 'Add a partner' : p.name,
          '<div class="grid grid--2">' +
            field('pt-name', 'Name', text('pt-name', p.name, 'Their business, as they write it'),
              'The name on the sponsors page.') +
            field('pt-short', 'Short name', text('pt-short', p.short, 'Leave blank to use the name'),
              'Used where the logo is the content and the name is only read aloud.') +
            field('pt-role', 'What they are to the club',
              text('pt-role', p.role, 'Main kit sponsor'),
              'Printed under their logo. "Main kit sponsor", "Ground-share partner".') +
            field('pt-since', 'Backing us since', text('pt-since', p.since, '26/27'),
              'Optional. A season, not a date.') +
          '</div>' +
          field('pt-trade', 'What they do', text('pt-trade', p.trade, 'Roofing, garden design'),
            'Optional. One line, on the sponsors page.') +
          field('pt-body', 'The one-liner', text('pt-body', p.body),
            'The short line under their name on the sponsors page.') +
          field('pt-detail', 'The write-up', area('pt-detail', p.detail, 4),
            'A paragraph on the sponsors page. Leave it blank and they simply get the one-liner.') +
          field('pt-place', 'What they get, one per line',
            area('pt-place', (p.placements || []).join('\n'), 4),
            'Listed on the sponsors page. "Front of the matchday shirt", "Named in match reports".') +
          field('pt-links', 'Their links, one per line as Label | https://…',
            area('pt-links', (p.links || []).map(function (l) {
              return (l.label || 'Website') + ' | ' + l.href;
            }).join('\n'), 3),
            'Optional.') +
          imageField('pt-logo', 'Their logo', p.logo, {
            max: 600, keepAlpha: true,
            hint: 'Their own mark, never recoloured. Kept as a PNG so a transparent '
              + 'background stays transparent. Upload the file they gave you.',
          }) +
          '<div class="grid grid--2" style="margin-top:var(--space-4)">' +
            field('pt-strip', 'On the home page',
              choose('pt-strip', p.onStrip ? 'yes' : 'no', [['yes', 'Yes'], ['no', 'No']]),
              'The logo strip. The first four in this list are the ones shown.') +
            field('pt-page', 'On the sponsors page',
              choose('pt-page', p.onPage ? 'yes' : 'no', [['yes', 'Yes'], ['no', 'No']]),
              'The full write-up with their links and what they get.') +
          '</div>', 720);
        wireUploads(back);

        $('[data-save]', back).addEventListener('click', function () {
          var name = val(back, 'pt-name');
          if (!name) { fail(back, 'Name the partner.'); return; }
          var lines = function (id) {
            return val(back, id).split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
          };
          /* Everything the record already held that this form does not ask
             for is written back untouched, so a field a future version adds
             survives being edited by this one. */
          var rec = Object.assign({}, i == null ? {} : PARTNERS[i], {
            name: name,
            short: val(back, 'pt-short') || name,
            role: val(back, 'pt-role'),
            since: val(back, 'pt-since'),
            trade: val(back, 'pt-trade'),
            body: val(back, 'pt-body'),
            detail: val(back, 'pt-detail'),
            placements: lines('pt-place'),
            links: lines('pt-links').map(function (l) {
              var bits = l.split('|');
              var href = (bits[1] || bits[0] || '').trim();
              /* A LABEL PASTED WITHOUT ONE IS NOT ALWAYS "WEBSITE". Somebody
                 pasting three URLs on three lines got three links all reading
                 Website, including the partner's Instagram, which is what the
                 published page would then say. Named from the host where the
                 host says what it is. */
              return { label: (bits[1] ? bits[0].trim() : linkLabel(href)), href: href };
            }).filter(function (l) { return l.href; }),
            logo: val(back, 'pt-logo'),
            onStrip: val(back, 'pt-strip') === 'yes',
            onPage: val(back, 'pt-page') === 'yes',
          });
          var next = PARTNERS.slice();
          if (i == null) next.push(rec); else next[i] = rec;
          back.remove();
          savePartners(next, i == null ? 'Partner added' : 'Saved');
        });
      }

      host.addEventListener('click', function (e) {
        if (e.target.matches('[data-new]')) { if (guard()) form(null); return; }
        if (e.target.matches('[data-goto-pipeline]')) { location.hash = '#pipeline'; return; }

        if (e.target.matches('[data-newpartner]')) { if (guard()) partnerForm(null); return; }
        var ptr = e.target.closest('tr[data-pi]');
        if (ptr) {
          var pi = Number(ptr.getAttribute('data-pi'));
          if (e.target.matches('[data-pedit]')) { if (guard()) partnerForm(pi); return; }
          if (e.target.matches('[data-pup]')) {
            if (!guard()) return;
            var moved = PARTNERS.slice();
            moved.splice(pi - 1, 0, moved.splice(pi, 1)[0]);
            savePartners(moved, PARTNERS[pi].name + ' moved up');
            return;
          }
          if (e.target.matches('[data-pdel]')) {
            if (!guard()) return;
            confirmAction({
              title: 'Remove ' + PARTNERS[pi].name + '?',
              body: 'They come off the sponsors page and the home page at the next publish.',
              detail: 'If the deal has simply ended, it may be worth turning both switches off '
                + 'in Edit instead: that keeps the record of the partnership.',
              confirmLabel: 'Remove',
            }).then(function (yes) {
              if (!yes) return;
              var left = PARTNERS.slice();
              left.splice(pi, 1);
              savePartners(left, 'Removed');
            });
          }
          return;
        }
        var tr = e.target.closest('tr[data-key]');
        if (!tr) return;
        var full = tr.getAttribute('data-key');
        var short = full.replace('sponsor:', '');
        if (e.target.matches('[data-edit]')) { if (guard()) form(short); return; }
        if (e.target.matches('[data-del]')) {
          if (guard()) removeRow('player_photos', full, labelFor(short) + '’s sponsorship', 'sponsors');
        }
      });
    });
  };
})();
