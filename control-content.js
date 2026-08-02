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

  M.news = function (host) {
    return CP.readAll('articles').then(function (rows) {
      var list = rows.slice().sort(function (a, b) {
        return String((b.data || {}).sortISO || '').localeCompare(String((a.data || {}).sortISO || ''));
      });
      host.innerHTML = sec({
        title: 'Club news',
        sub: esc(list.length) + ' articles. Written here as prose, not as a JSON document: '
          + 'blank lines between paragraphs, exactly as it reads on the website.',
        actions: '<button class="btn btn--primary" data-new>Write an article</button>',
        body: (list.length
          ? table(['Headline', 'Category', 'Date', 'Cover', ''], list.map(function (r) {
            var d = r.data || {};
            return '<tr data-key="' + esc(r.key) + '">' +
              '<td><b>' + esc(d.title || 'Untitled') + '</b></td>' +
              '<td>' + esc(d.cat || 'News') + '</td>' +
              '<td>' + esc(d.date || '') + '</td>' +
              '<td>' + (d.cover
                ? '<span class="badge badge--success">Yes</span>'
                : '<span class="badge badge--warning">None</span>') + '</td>' +
              '<td><button class="btn btn--ghost btn--sm" data-edit>Edit</button> ' +
                '<button class="btn btn--quiet btn--sm" data-raw>Raw</button> ' +
                '<button class="btn btn--quiet btn--sm" data-del>Delete</button></td>' +
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
            field('a-cover', 'Cover image', text('a-cover', d.cover, 'https://…'),
              'Optional. A link to a photograph already on the web.') +
          '</div>' +
          '<h4 class="mform__h">The article</h4>' +
          field('a-body', 'What you want to say',
            area('a-body', d.lede || d.body || '', 16,
              'Leave a blank line between paragraphs.'),
            'This is the whole article. It appears on the news page and gets its own page.') +
          '<p class="field__hint" data-count></p>');

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
            date: pretty(iso),
            sortISO: iso,
            lede: body.value.trim(),
            cover: val(back, 'a-cover'),
          }, 'news');
        });
      }

      host.addEventListener('click', function (e) {
        if (e.target.matches('[data-new]')) { if (guard()) form(null); return; }
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
     ========================================================================== */
  var ALBUM_CATS = ['Matchday', 'Training', 'Club', 'Awards', 'Community'];

  M.media = function (host) {
    return CP.readAll('gallery').then(function (rows) {
      var list = rows.slice().sort(function (a, b) {
        return Number((b.data || {}).sort || 0) - Number((a.data || {}).sort || 0);
      });
      var photos = list.reduce(function (n, r) { return n + (((r.data || {}).photos) || []).length; }, 0);

      host.innerHTML = sec({
        title: 'Albums',
        sub: esc(list.length) + ' albums holding ' + esc(photos) + ' photographs. '
          + 'Photographs are one web address per line, so pasting a batch in is one action rather than '
          + 'forty pieces of punctuation.',
        actions: '<button class="btn btn--primary" data-new>New album</button>',
        body: (list.length
          ? table(['Album', 'Category', 'Photographs', 'Tagged', 'Photographer', ''], list.map(function (r) {
            var d = r.data || {};
            var pt = (d.photoTags || []).filter(function (t) { return t && t.length; }).length;
            return '<tr data-key="' + esc(r.key) + '">' +
              '<td><b>' + esc(d.title || 'Album') + '</b></td>' +
              '<td>' + esc(d.category || 'Matchday') + '</td>' +
              '<td>' + esc((d.photos || []).length) + '</td>' +
              '<td>' + esc(pt) + '</td>' +
              '<td>' + esc(d.photographer || '') + '</td>' +
              '<td><button class="btn btn--ghost btn--sm" data-edit>Edit</button> ' +
                '<button class="btn btn--quiet btn--sm" data-raw>Raw</button> ' +
                '<button class="btn btn--quiet btn--sm" data-del>Delete</button></td>' +
            '</tr>';
          }).join(''))
          : empty('No albums yet', 'Create one, then name the players in each photograph under Photo tagging.')),
        where: [['Gallery', '/gallery.html']],
        whereNote: 'tagged players also appear on their own profile',
      });

      function form(rec) {
        var d = (rec && rec.data) || {};
        var isNew = !rec;
        var back = dialog(isNew ? 'New album' : 'Edit this album',
          '<div class="grid grid--2">' +
            field('g-title', 'Album title', text('g-title', d.title, 'Sue’s Angels 4-2 BPR Men’s')) +
            field('g-cat', 'Category', choose('g-cat', d.category || 'Matchday', ALBUM_CATS)) +
            field('g-date', 'Date', '<input class="input" id="g-date" type="date" value="' +
              esc(toIso(d.date) || String(d.date || '').slice(0, 10) || today()) + '">') +
            field('g-by', 'Photographer', text('g-by', d.photographer, 'Who took them')) +
          '</div>' +
          field('g-cover', 'Cover photograph', text('g-cover', d.cover || d.src, 'https://…'),
            'Left blank, the first photograph is used.') +
          '<h4 class="mform__h">The photographs</h4>' +
          field('g-photos', 'One web address per line',
            area('g-photos', (d.photos || []).join('\n'), 12, 'https://…\nhttps://…'),
            (d.photoTags || []).length
              ? 'Player tags are kept against position in this list, so reordering or removing a line '
                + 'moves the tags with it. Adding to the end is always safe.'
              : 'Paste as many as you like.') +
          '<p class="field__hint" data-count></p>');

        var listEl = $('#g-photos', back);
        function count() {
          var n = listEl.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean).length;
          $('[data-count]', back).textContent = n + ' photograph' + (n === 1 ? '' : 's');
        }
        listEl.addEventListener('input', count);
        count();

        $('[data-save]', back).addEventListener('click', function () {
          var title = val(back, 'g-title');
          if (!title) { fail(back, 'The album needs a title.'); return; }
          var urls = listEl.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
          var iso = val(back, 'g-date') || today();
          var key = rec ? rec.key : newId('alb');
          /* photoTags runs parallel to photos. Trimming it to the new length
             stops a shortened album carrying tags that point past its end. */
          var tags = (d.photoTags || []).slice(0, urls.length);
          put(back, 'gallery', key, d, {
            id: key,
            title: title,
            category: val(back, 'g-cat'),
            date: iso,
            sort: rec && d.sort ? d.sort : Date.now(),
            photographer: val(back, 'g-by'),
            photos: urls,
            cover: val(back, 'g-cover') || urls[0] || '',
            src: val(back, 'g-cover') || urls[0] || '',
            photoTags: tags,
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
  };

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
                '<button class="btn btn--quiet btn--sm" data-del>Delete</button></td>' +
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
                '<button class="btn btn--quiet btn--sm" data-del>Delete</button></td>' +
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
          '<div class="grid grid--2" style="margin-top:var(--space-4)">' +
            field('b-src', 'Badge address', text('b-src', d.src, 'https://…')) +
            field('b-aspect', 'Shape', choose('b-aspect', d.aspect || 'circle',
              [['circle', 'Round'], ['shield', 'Shield'], ['square', 'Square']])) +
          '</div>' +
          field('b-alt', 'Description for screen readers', text('b-alt', d.alt, 'Barnes Stormers club crest')),
          620);

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

     The five partners are in the site's source, deliberately: a partner logo
     is a contractual asset that ships as an optimised static file. What IS
     editable is who has sponsored what, which is the record this table holds
     and which the panel previously showed as a truncated JSON string in a
     column headed "Data".
     ========================================================================== */
  M.sponsors = function (host) {
    return CP.readAll('player_photos').then(function (rows) {
      var list = rows.filter(function (r) { return r.key.indexOf('sponsor:') === 0; })
        .sort(function (a, b) { return String(a.key).localeCompare(String(b.key)); });

      host.innerHTML =
        sec({
          title: 'Match sponsorship',
          sub: 'Who has sponsored the match report and the individual players. This is the part that '
            + 'changes during a season, so it lives in the database and can be edited here.',
          actions: '<button class="btn btn--primary" data-new>Add a sponsorship</button>',
          body: (list.length
            ? table(['What is sponsored', 'Sponsor', 'Link', ''], list.map(function (r) {
              var d = r.data || {};
              var what = r.key.replace('sponsor:', '');
              return '<tr data-key="' + esc(r.key) + '">' +
                '<td><b>' + esc(what === 'matchreport' ? 'The match report' : what) + '</b></td>' +
                '<td>' + esc((d && d.name) || (typeof d === 'string' ? d : '') || 'Nobody yet') + '</td>' +
                '<td>' + esc((d && d.url) || '') + '</td>' +
                '<td><button class="btn btn--ghost btn--sm" data-edit>Edit</button> ' +
                  '<button class="btn btn--quiet btn--sm" data-del>Delete</button></td>' +
              '</tr>';
            }).join(''))
            : empty('No sponsorships recorded', 'Add one and it appears against whatever it sponsors.')),
          where: [['Sponsors', '/sponsors.html'], ['Match reports', '/results.html']],
        }) +
        sec({
          title: 'Club partners',
          sub: 'The five current partners are held in the site’s own source so their logos ship as '
            + 'optimised static files and load instantly, and so nobody can change a partner’s mark by '
            + 'accident. Changing one is a deliberate code change: a partner logo is a contractual '
            + 'asset, not routine content.',
          where: [['Sponsors', '/sponsors.html']],
        });

      function form(rec) {
        var raw = (rec && rec.data) || {};
        var d = typeof raw === 'string' ? { name: raw } : raw;
        var back = dialog(rec ? 'Edit this sponsorship' : 'Add a sponsorship',
          field('s-what', 'What is sponsored',
            rec ? text('s-what', rec.key.replace('sponsor:', ''))
              : choose('s-what', 'matchreport',
                [['matchreport', 'The match report']].concat(SQUAD.map(function (p) {
                  return ['player-' + p.num, p.name];
                })))) +
          '<div class="grid grid--2" style="margin-top:var(--space-4)">' +
            field('s-name', 'Sponsor', text('s-name', d.name, 'The business or person')) +
            field('s-url', 'Their website', text('s-url', d.url, 'https://…')) +
          '</div>' +
          field('s-note', 'A line about them', area('s-note', d.note, 3)),
          620);

        $('[data-save]', back).addEventListener('click', function () {
          var what = val(back, 's-what');
          var name = val(back, 's-name');
          if (!what) { fail(back, 'Say what is being sponsored.'); return; }
          if (!name) { fail(back, 'Name the sponsor.'); return; }
          put(back, 'player_photos', 'sponsor:' + what.replace(/^sponsor:/, ''),
            typeof raw === 'string' ? {} : raw,
            { name: name, url: val(back, 's-url'), note: val(back, 's-note') }, 'sponsors');
        });
      }

      host.addEventListener('click', function (e) {
        if (e.target.matches('[data-new]')) { if (guard()) form(null); return; }
        var tr = e.target.closest('tr[data-key]');
        if (!tr) return;
        var rec = list.filter(function (x) { return x.key === tr.getAttribute('data-key'); })[0];
        if (e.target.matches('[data-edit]')) { if (guard()) form(rec); return; }
        if (e.target.matches('[data-del]')) { if (guard()) removeRow('player_photos', rec.key, 'this sponsorship', 'sponsors'); }
      });
    });
  };
})();
