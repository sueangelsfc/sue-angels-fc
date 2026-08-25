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
  /* Club facts the generator knows and the browser otherwise could not: the
     club's own name, the squad, the competitions and opponents already in the
     record. Shipped as control-seed.js, ahead of this file. */
  var SEED = window.SA_SEED || {};

  /* ---- Confirm dialog: every destructive action goes through this ------ */
  function confirmAction(opts) {
    return new Promise(function (resolve) {
      var back = document.createElement('div');
      back.className = 'modal-backdrop';
      back.setAttribute('role', 'dialog');
      back.setAttribute('aria-modal', 'true');
      back.innerHTML =
        '<div class="modal glass glass--lg" style="width:min(96vw,560px)">' +
          '<div class="modal__head"><h2 class="mform__title">' + esc(opts.title) + '</h2></div>' +
          '<p class="cp-head__sub">' + esc(opts.body) + '</p>' +
          (opts.detail ? '<p class="cp-where">' + esc(opts.detail) + '</p>' : '') +
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

  /* ---- Section furniture -------------------------------------------------
     Every module opened with its own hand-built panel: an inline padding, an
     inline font size on the heading, an inline colour on the paragraph. Two
     sections were never quite the same and the panel could not be restyled
     without editing all thirteen. This is that pattern, written once.

     `sub`, `body` and `actions` are HTML and are NOT escaped, because they
     carry markup this file writes. Anything from the database that goes
     through them must be passed through esc() first. */
  function sec(o) {
    return '<section class="cp-sec' + (o.plain ? '' : ' panel cp-card') +
        (o.warn ? ' cp-note--warn' : '') + '">' +
      (o.title
        ? '<div class="cp-head"><div class="cp-head__text">' +
            '<h3 class="cp-head__title">' + esc(o.title) + '</h3>' +
            (o.sub ? '<p class="cp-head__sub">' + o.sub + '</p>' : '') +
          '</div>' +
          (o.actions ? '<div class="cp-head__actions">' + o.actions + '</div>' : '') +
        '</div>'
        : '') +
      (o.body || '') +
      (o.where ? where(o.where, o.whereNote) : '') +
    '</section>';
  }

  /* The commonest question about this panel is "and where does that turn up?".
     Every module answers it, with a link, rather than assuming the operator
     already holds the website's map in their head. */
  function where(links, note) {
    return '<p class="cp-where"><b>Shows on the website:</b> ' +
      links.map(function (l) {
        return '<a href="' + esc(l[1]) + '" target="_blank" rel="noopener">' + esc(l[0]) + '</a>';
      }).join(' &middot; ') +
      (note ? ' <span>' + esc(note) + '</span>' : '') + '</p>';
  }

  function feed(rows) {
    if (!rows.length) return '<p class="me__none">Nothing yet.</p>';
    return '<div class="cp-feed">' + rows.map(function (r) {
      return '<div class="cp-feed__row"><b>' + esc(r[0]) + '</b><time>' + esc(r[1]) + '</time></div>';
    }).join('') + '</div>';
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
  /* ---- Choosing an image file ------------------------------------------
     Shared, because three sections need it and none of them should carry
     their own copy of canvas resizing.

     Every image is resized and re-encoded in the browser before it leaves.
     A phone camera produces four or five megabytes; nothing on this site is
     drawn wider than about twelve hundred pixels. Uploading the original
     would put a multi-megabyte file on a page that needed forty kilobytes,
     and the club's own photographs are the one thing here nobody can
     optimise later without asking for them again.

     Returns a data URL and a blob. The caller decides which it wants: a
     player photograph is stored inline, because that is where the nineteen
     existing ones already live, and a badge or an article cover goes to
     storage, because a page showing five of them inline would carry them all
     as base64. */
  function readImage(file, opts) {
    var o = opts || {};
    var max = o.max || 520;
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type)) { reject(new Error('That is not an image.')); return; }
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('That file could not be read.')); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error('That image could not be opened.')); };
        img.onload = function () {
          var canvas = document.createElement('canvas');
          var ctx;
          if (o.square) {
            /* Cropped from the middle of the frame. A team photograph cropped
               from the top loses faces; from the middle it rarely does. */
            var side = Math.min(img.width, img.height);
            canvas.width = max;
            canvas.height = max;
            ctx = canvas.getContext('2d');
            ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, max, max);
          } else {
            var scale = Math.min(1, max / img.width);
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }
          /* PNG for anything that might have a transparent background, which
             a club badge usually does. A photograph never should: a JPEG of
             the same picture is a fraction of the size. */
          var type = o.keepAlpha ? 'image/png' : 'image/jpeg';
          var dataUrl = canvas.toDataURL(type, 0.82);
          canvas.toBlob(function (blob) {
            resolve({ dataUrl: dataUrl, blob: blob, was: file.size, type: type });
          }, type, 0.82);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* Resize, then put it in the club's storage bucket and hand back the public
     address. Used where an image is REFERENCED by a page rather than embedded
     in one record. */
  function uploadImage(file, opts) {
    var o = opts || {};
    return readImage(file, o).then(function (out) {
      var ext = out.type === 'image/png' ? 'png' : 'jpg';
      var name = (o.prefix || 'img') + '-' + Date.now() + '.' + ext;
      return CP.upload(o.bucket || 'gallery', name, out.blob).then(function (url) {
        return { url: url, was: out.was, now: out.blob.size };
      });
    });
  }

  function download(name, text, type) {
    var blob = new Blob([text], { type: type || 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  /* A match by its opponent and its date, in the words the club uses.

     This used to un-slug the row key, which is where "Portolondon Drt" and
     "Bpr" came from: the key holds a squashed, lower-cased fragment of a club
     name chosen to be a safe filename, and turning it back into English is
     not something that can be done. The generator ships the real fixture for
     every match, so look the name up rather than trying to reconstruct it.

     Falls back to the old de-slugging only for a match the seed has never
     heard of, which is one recorded since the last publish. */
  var MATCH_BY_ID = {};
  (SEED.matches || []).forEach(function (m) { MATCH_BY_ID[m.id] = m; });
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function matchLabel(key) {
    var rec = MATCH_BY_ID[key];
    var m = String(key).match(/^[a-z](\d{4})(\d{2})(\d{2})-(.+)$/);
    var when = m
      ? Number(m[3]) + ' ' + (MON[Number(m[2]) - 1] || '') + ' ' + m[1]
      : '';
    if (rec) {
      var home = /Sue.s Angels/.test(rec.home || '');
      var opp = home ? rec.away : rec.home;
      if (opp) return (home ? 'v ' : 'away to ') + opp + (when ? ' \u00b7 ' + when : '');
    }
    if (!m) return key;
    var guess = m[4].replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    return guess + (when ? ' \u00b7 ' + when : '');
  }

  /* Anything somebody might paste out of YouTube: the share link, the address
     bar, an embed URL, a Short, a live URL, or the bare id. Returns the id or
     an empty string. Eleven characters is the format YouTube has always used. */
  function youtubeId(input) {
    var s2 = String(input || '').trim();
    if (!s2) return '';
    if (/^[\w-]{11}$/.test(s2)) return s2;
    var m = s2.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
    return m ? m[1] : '';
  }

  /* =================== MODULES =================== */
  /* The registry is global because two of the modules arrive later, in their
     own files, and register themselves into it. See `need()` below. */
  var M = (window.CPM = {});

  /* ==========================================================================
     WHAT DAY IS THIS ROW?

     Two fields answer that and they disagree. `date` is the pretty form,
     "23 Aug 2026", written for a person to read. `iso` is machine order, and
     the fixture form has written it since it was built, so newer rows carry
     both and older ones only the first.

     The dashboard compared `String(date).slice(0, 10)` against an ISO today,
     which is "23 Aug 202" against "2026-08-24". That is not a date
     comparison, it is an alphabetical one, and the rule it actually
     implemented was the DAY OF THE MONTH: a fixture on the 1st to the 19th
     always sorted before today and was reported as played, months in advance;
     one on the 20th to the 31st never did, so a match played yesterday was
     invisible on the only screen that could act on it.

     Parsed by hand rather than through `new Date()`, which reads "23 Aug
     2026" as local midnight and then `toISOString` shifts it back a day for
     anyone west of Greenwich. */
  var MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  function fixtureIso(row) {
    var f = (row && row.data) || row || {};
    if (/^\d{4}-\d{2}-\d{2}/.test(f.iso || '')) return String(f.iso).slice(0, 10);
    var m = /^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?\s+(\d{4})$/.exec(String(f.date || '').trim());
    if (!m) return dayIso(row && row.key);
    var mi = MONTHS.indexOf(m[2].toLowerCase());
    if (mi < 0) return dayIso(row && row.key);
    return m[3] + '-' + ('0' + (mi + 1)).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  }
  /* Every row key is [rf]YYYYMMDD-slug, all 35 matches and all 6 fixtures, so
     the key is the last resort and it is a good one. */
  function dayOf(key) { return (String(key || '').match(/^[rf](\d{8})/) || [])[1] || ''; }
  function dayIso(key) {
    var d = dayOf(key);
    return d ? d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6, 8) : '';
  }

  /* And this is what those files borrow rather than carrying second copies of.
     Everything here is defined above, so it is real by the time any chunk can
     possibly run: a chunk is only ever fetched from inside render(). */
  window.CPU = {
    $: $,
    $$: $$,
    esc: esc,
    toast: toast,
    guard: guard,
    confirmAction: confirmAction,
    sec: sec,
    where: where,
    table: table,
    empty: empty,
    tile: tile,
    feed: feed,
    fmtDate: fmtDate,
    csv: csv,
    download: download,
    readImage: readImage,
    uploadImage: uploadImage,
    matchLabel: matchLabel,
    youtubeId: youtubeId,
    refresh: function (key) { return refresh(key); },
    /* Marks ONE field as wrong and puts the message beside it. The existing
       checks already have the right words; what they lack is somewhere to put
       them. Returns false so a guard reads `if (!U.invalid(el, 'Pick a
       date.')) return;`. */
    invalid: function (el, message) {
      if (!el) return false;
      el.setAttribute('aria-invalid', 'true');
      var msg = el.nextElementSibling;
      if (!(msg && msg.classList && msg.classList.contains('cp-invalid'))) {
        msg = document.createElement('p');
        msg.className = 'cp-invalid';
        if (el.parentNode) el.parentNode.insertBefore(msg, el.nextSibling);
      }
      msg.textContent = message;
      if (el.focus) el.focus();
      return false;
    },
    /* A module calls this the moment it holds an edit that is not in the
       database yet, and again with false once it is. Everything else - the
       warning strip, the Publish confirm, the close-tab prompt - follows from
       this one flag. */
    dirty: function (v) { return setDirty(v); },
    /* Fetch a chunk that is not a panel. The report writer is the first of
       these: it belongs to a BUTTON rather than to a section, so CHUNK_OF
       cannot reach it and the module asks for it by name when pressed. Same
       loader, same pending map, same retry-after-failure behaviour. */
    chunk: function (name) { return load(name); },
    /* The matchday panel asks the same date question the dashboard does,
       and a second copy of this rule is what produced the bug it fixes. */
    fixtureIso: fixtureIso,
    dayOf: dayOf,
    dayIso: dayIso,
    /* THE BADGE SLOT EXISTS ON ALL TWENTY-ONE NAV ITEMS and exactly one of
       them ever filled it. A count is worth showing only where it means
       "this needs doing now": a permanent 24 beside Results is wallpaper
       within a week, and then the one that matters is wallpaper too. */
    setCount: function (key, n) { return setCount(key, n); },
    goto: function (key) { return show(key); },
  };

  /* ==========================================================================
     DASHBOARD

     It was eight identical tiles in one auto-filling grid, and a grid row
     stretches every cell to the tallest one: "9 of 33 matches with a report"
     wrapped onto three lines and inflated all eight to nearly three hundred
     pixels of mostly nothing. Every number also carried the same weight, so
     606 photographs shouted as loudly as the one figure that needed doing
     something about.

     Two kinds of tile now. A COUNT is a fact and sits quietly. A PROGRESS
     tile is a job half done, carries a bar, and is what the eye should land
     on, because those are the three questions this club actually has: how
     many matches still have no report, how many players have no photograph,
     how many opponents have no badge.
     ========================================================================== */
  function countTile(value, label, sub) {
    return '<div class="cpt">' +
      '<span class="cpt__v">' + esc(value) + '</span>' +
      '<span class="cpt__l">' + esc(label) + '</span>' +
      (sub ? '<span class="cpt__s">' + esc(sub) + '</span>' : '') +
    '</div>';
  }

  /* done of total, with the bar. Complete is stated rather than drawn: a full
     bar and a nearly full one look the same at a glance and "all of them" is
     the thing worth knowing. */
  function progressTile(done, total, label, goto) {
    var pct = total ? Math.round((done / total) * 100) : 0;
    var full = total > 0 && done >= total;
    return '<button type="button" class="cpt cpt--go' + (full ? ' is-done' : '') + '"' +
        (goto ? ' data-goto="' + esc(goto) + '"' : '') + '>' +
      '<span class="cpt__v">' + esc(done) + '<i>/' + esc(total) + '</i></span>' +
      '<span class="cpt__l">' + esc(label) + '</span>' +
      '<span class="cpt__bar" aria-hidden="true"><i style="width:' + pct + '%"></i></span>' +
      '<span class="cpt__s">' + (full ? 'All done' : esc(total - done) + ' to go') + '</span>' +
    '</button>';
  }

  M.dashboard = function (host) {
    return Promise.all([
      CP.readAll('matches'), CP.readAll('articles'), CP.readAll('gallery'),
      CP.readAll('recognition'), CP.readAll('fixtures'),
      CP.state.isAdmin ? CP.readEnquiries() : Promise.resolve([]),
      CP.state.isAdmin ? CP.readSupporters() : Promise.resolve([]),
      CP.readAll('player_photos'),
      CP.readAll('team_badges'),
    ]).then(function (r) {
      var matches = r[0], articles = r[1], gallery = r[2], recog = r[3], fixtures = r[4];
      var enq = r[5] || [], sup = r[6] || [], blobs = r[7] || [], badges = r[8] || [];

      var withReport = matches.filter(function (m) {
        return m.data && (m.data.polishedReport || m.data.commentary);
      }).length;
      var photos = gallery.reduce(function (a, g) { return a + ((g.data && g.data.photos) || []).length; }, 0);
      var newEnq = enq.filter(function (e) { return !e.status || e.status === 'new'; }).length;
      var squadSize = (SEED.squad || []).length;
      var clubs = (SEED.clubs || []).length;

      /* WHAT THE WEBSITE CAN ACTUALLY DRAW, not what this panel has uploaded.

         Both of these counted rows in the table the panel's own uploader
         writes. `team_badges` has none in it, so the tile read "0 of 26
         opponents have a badge" while twenty-five crests were on every match
         card on the site, and it was telling the club to go and find
         twenty-five badges it already had. The photograph tile had the milder
         version of the same: the pictures on disk did not count.

         The build works both answers out with the site's own resolver, which
         is the only thing that knows a crest can come from an upload, a
         curated file or the recovered registry, and that "Woking Veterans
         Sundays" finds the Woking Vets badge. An uploaded row still counts on
         top, because it may be for a club added since the last publish. */
      var badgeSet = {};
      (SEED.clubsWithBadge || []).forEach(function (c) { badgeSet[c] = 1; });
      badges.forEach(function (x) { if ((x.data || {}).src) badgeSet[x.key] = 1; });
      var withBadge = Object.keys(badgeSet).length;

      var photoSet = {};
      (SEED.squadWithPhoto || []).forEach(function (n) { photoSet[String(n)] = 1; });
      blobs.forEach(function (x) { if (/^\d+$/.test(x.key)) photoSet[x.key] = 1; });
      var withPhoto = Object.keys(photoSet).length;
      /* Counted the same way the covers panel counts it: a record has a
         cover if the SITE ships one. The build draws a card for every match
         and commits it, so counting stored covers alone put this tile at 0 of
         38 while every one of the 38 was sharing a drawn card. */
      var drawnSet = {};
      (SEED.drawnCovers || []).forEach(function (k) { drawnSet[String(k)] = 1; });
      var withCover = matches.filter(function (m) {
        return (m.data || {}).cover || drawnSet[String(m.key)];
      }).length;

      var warn = [];
      if (!CP.state.isAdmin) {
        warn.push(['This account is not in the administrator registry, so everything here is '
          + 'read-only.', null, null]);
      }
      if (!fixtures.length) {
        warn.push(['No fixtures are stored, so the website says "to be confirmed" until some are '
          + 'added.', 'Add a fixture', 'fixtures']);
      }

      /* A FIXTURE WHOSE DATE HAS BEEN AND GONE WITH NO SCORE.

         The website already handles this properly: it drops the match off the
         fixtures page so nothing advertises a game that has been played, and
         puts it under "Just played, awaiting a score" on the results page. So
         the only people who could not see it were the people who could fix
         it. The club was told by its own website, in public, and not by the
         screen it would act from.

         Computed here rather than at build time on purpose: the generator's
         idea of today is the moment it last ran, and this is a question about
         now. */
      var todayIso = new Date().toISOString().slice(0, 10);

      /* A FIXTURE WHOSE RESULT IS ALREADY IN.
         Entering a result through the fixture's own button clears the row.
         Entering it straight into Results does not, and two of the six live
         rows are exactly that. The website copes, because it merges on the
         date and marks the match played, so the one screen this was wrong on
         was the screen the club acts from: it counted both as still owing a
         score and sent somebody to type in a result that was already there. */
      var scored = {};
      matches.forEach(function (m) {
        if (/^r/.test(m.key || '')) scored[dayOf(m.key)] = 1;
      });
      var stale = fixtures.filter(function (f) { return scored[dayOf(f.key)]; });
      var played = fixtures.filter(function (f) {
        var when = fixtureIso(f);
        return when && when < todayIso && !scored[dayOf(f.key)];
      });
      if (played.length) {
        var one = played.length === 1;
        warn.push([(one ? 'A fixture has' : played.length + ' fixtures have')
          + ' been played and no score has been entered, so the website is showing '
          + (one ? 'it' : 'them') + ' as awaiting a result. Enter result fills the match form in '
          + 'from the fixture and clears it.',
        one ? 'Enter the result' : 'Enter the results', 'fixtures']);
      }
      if (stale.length) {
        var s1 = stale.length === 1;
        warn.push([(s1 ? 'A fixture is' : stale.length + ' fixtures are')
          + ' still on the fixture list with the result already recorded, so the website is '
          + 'working from the match and ' + (s1 ? 'this row is' : 'these rows are') + ' doing '
          + 'nothing. Deleting ' + (s1 ? 'it' : 'them') + ' costs nothing and keeps the two lists '
          + 'saying the same thing.', 'Clear ' + (s1 ? 'it' : 'them'), 'fixtures']);
      }

      /* A REPORT SHARING THE GENERIC CARD. Every match and article has a card
         drawn from its own record, committed alongside the generated HTML. A
         match published from this panel does NOT get one, because the deploy
         has no browser to draw it with - so it keeps the generic club image
         until somebody runs `npm run covers`.

         Until now the only thing that said so was `npm test`, which the club
         has no reason to ever run. That made it a step somebody had to
         remember, which is another way of saying it does not happen: a link
         to a win and a link to a defeat go out looking identical, and nobody
         finds out.

         The action is the one the club can actually take. Drawing a cover in
         this panel stores it on the record, and a stored cover beats the
         drawn card and the generic image alike, so it fixes the share image
         without a terminal. */
      var noCard = matches.filter(function (m) {
        return !(m.data || {}).cover && !drawnSet[String(m.key)];
      }).length + articles.filter(function (a) {
        return !(a.data || {}).cover && !drawnSet[String(a.key)];
      }).length;
      if (noCard) {
        var c1 = noCard === 1;
        warn.push([(c1 ? 'A match report or article is' : noCard + ' match reports and articles are')
          + ' sharing the generic club image when the link is posted, rather than a card of '
          + (c1 ? 'its' : 'their') + ' own. Drawing one here stores it on the record and fixes '
          + (c1 ? 'it' : 'them') + ' straight away.',
          c1 ? 'Draw the cover' : 'Draw the covers', 'covers']);
      }

      /* RECORDS THAT DISAGREE WITH THEMSELVES.

         The match form has asked these four questions of the record in front
         of it for a while, and asking them found three errors in the archive
         that reading the data had not. But a question only the editor asks is
         a question about the record somebody happens to have opened, and
         nobody opens a match from October to check it: the three sat there,
         written down in a developer's note, invisible to the only people who
         could fix them.

         Asked of everything stored, on the screen the club lands on. None of
         them is a reason to refuse a save and none of them is guessed at -
         each is the record contradicting itself in a way that shows on the
         website, which is why the count is worth a line here. */
      var byNum = {};
      (SEED.squad || []).forEach(function (p) { byNum[String(p.num)] = p.name; });
      var nameOfNum = function (n) { return byNum[String(n)] || 'Somebody'; };
      var contradictory = matches.filter(function (m) {
        return window.CPREC.matchProblems(m.data, nameOfNum).length > 0;
      });
      if (contradictory.length) {
        var d1 = contradictory.length === 1;
        warn.push([(d1
          ? 'A match record disagrees with itself'
          : contradictory.length + ' match records disagree with themselves')
          + ': a goal credited to somebody not on the team sheet, a scoreline that does not '
          + 'match the goals listed, or an unused substitute credited with something. '
          + (d1 ? 'It shows' : 'They show') + ' on the website. Opening '
          + (d1 ? 'it' : 'each one') + ' names the problem above the tabs.',
        d1 ? 'Open the match' : 'Open the results', 'results']);
      }

      /* The row a security check left behind. Deleting it needs the sign-in
         only the club has, which is why it is still there and why the club is
         the only one who can be told about it. */
      var probes = enq.filter(function (e) { return /^__|probe_delete_me/i.test(String(e.name || '')); });
      if (probes.length) {
        warn.push([probes.length + ' enquir' + (probes.length === 1 ? 'y is' : 'ies are')
          + ' left over from a check that anonymous visitors cannot read this table. The check '
          + 'passed. The row is not a real enquiry and can be deleted from the inbox.',
        'Open the inbox', 'inbox']);
      }

      host.innerHTML =
        /* The counts: what the club has. */
        '<div class="cpt-grid">' +
          countTile(matches.length, 'Matches recorded') +
          countTile(fixtures.length, 'Fixtures to come') +
          countTile(articles.length, 'Articles') +
          countTile(photos, 'Photographs', gallery.length + ' albums') +
          countTile(recog.length, 'Recognition entries') +
          countTile(CP.state.isAdmin ? newEnq : '-', 'New enquiries',
            CP.state.isAdmin ? enq.length + ' in all' : 'sign in as an administrator') +
          countTile(CP.state.isAdmin ? sup.length : '-', 'Newsletter subscribers') +
        '</div>' +

        /* The progress: what is half done. These are buttons because every one
           of them is a job, and a number you cannot act on from where you are
           reading it is a number that stays the same all season. */
        sec({
          title: 'Where the gaps are',
          sub: 'Each of these is a job, and each one is a button. Nothing here is broken; it is '
            + 'what has not been filled in yet.',
          body: '<div class="cpt-grid cpt-grid--go">' +
            progressTile(withReport, matches.length, 'Matches with a report', 'results') +
            progressTile(withPhoto, squadSize, 'Players with a photograph', 'photos') +
            progressTile(withBadge, clubs, 'Opponents with a badge', 'league') +
            progressTile(withCover, matches.length, 'Matches with a cover picture', 'covers') +
          '</div>',
        }) +

        (warn.length
          ? sec({
            warn: true,
            title: 'Needs attention',
            body: '<ul class="cp-list">' + warn.map(function (w) {
              return '<li>' + esc(w[0]) +
                (w[1] ? ' <button type="button" class="btn btn--ghost btn--sm" data-goto="'
                  + esc(w[2]) + '">' + esc(w[1]) + '</button>' : '') + '</li>';
            }).join('') + '</ul>',
          })
          : '') +

        '<div class="grid grid--2">' +
          sec({
            title: 'Recently changed',
            sub: 'The last six matches anybody touched.',
            body: feed(matches.slice()
              .sort(function (a, b) { return String(b.updated_at).localeCompare(String(a.updated_at)); })
              .slice(0, 6)
              .map(function (m) { return [matchLabel(m.key), fmtDate(m.updated_at)]; })),
          }) +
          sec({
            title: 'What usually needs doing',
            sub: 'Everything saved here reaches the website when you press <b>Publish to site</b>.',
            body: '<div class="cp-head__actions">' +
              '<button class="btn btn--glass btn--sm" data-goto="fixtures">Add a fixture</button>' +
              '<button class="btn btn--glass btn--sm" data-goto="results">Record a match</button>' +
              '<button class="btn btn--glass btn--sm" data-goto="news">Write an article</button>' +
              '<button class="btn btn--glass btn--sm" data-goto="media">Add photographs</button>' +
              '<button class="btn btn--glass btn--sm" data-goto="inbox">Read the inbox</button>' +
            '</div>',
          }) +
        '</div>';

      /* The [data-goto] listener that used to sit here is on the document now,
         so it works from every panel rather than only from this one. */
      setCount('inbox', CP.state.isAdmin ? newEnq : 0);
      /* WHAT THE SIDEBAR SHOULD SHOUT ABOUT. Two numbers, both meaning "this
         needs doing now": a fixture owing a score or sitting on the list with
         its result already in, and a next match still missing something. A
         backlog count would be a permanent badge, which is no badge at all. */
      setCount('fixtures', played.length + stale.length);
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
      host.innerHTML = sec({
        title: 'Inbox',
        sub: 'Everything sent through the website: the join form, the contact form and the '
          + 'sponsorship form all land here, and so does every newsletter sign-up. '
          + 'They are hidden from anyone not signed in as an administrator, which is the '
          + 'row-level security policy doing its job.',
        body:
          '<div class="tabs" role="tablist">' +
            '<button class="tab" role="tab" aria-selected="true" data-tab="enq">Enquiries (' + enq.length + ')</button>' +
            '<button class="tab" role="tab" aria-selected="false" data-tab="sup">Subscribers (' + sup.length + ')</button>' +
          '</div>' +
          '<div data-tabpane="enq" style="margin-top:var(--space-4)">' +
            '<div class="cp-head">' +
              '<input class="input cp-search" data-search placeholder="Search name, email or message" ' +
                'aria-label="Search enquiries">' +
              '<div class="cp-head__actions">' +
                '<button class="btn btn--ghost btn--sm" data-csv-enq>Export CSV</button></div>' +
            '</div>' +
            (enq.length ? table(['Received', 'Name', 'Email', 'About', 'Message', ''], enq.map(function (e, i) {
              /* A ROW LEFT BEHIND BY A TEST, said out loud.

                 One was written into production while checking that anonymous
                 visitors genuinely cannot read this table. The check worked
                 and the row could not then be removed, because deleting it
                 needs the sign-in that only the club has. It has sat there
                 since, looking exactly like somebody called
                 __probe_delete_me got in touch.

                 Marked rather than hidden: a panel that quietly filters rows
                 out of the club's own inbox is worse than one that explains
                 an odd-looking one. */
              var isProbe = /^__|probe_delete_me/i.test(String(e.name || ''));
              return '<tr' + (isProbe ? ' class="is-probe"' : '') + '>' +
                '<td>' + esc(fmtDate(e.created_at)) + '</td>' +
                '<td><b>' + esc(e.name) + '</b>' +
                  (isProbe ? '<br><span class="badge badge--warning">Left over from a security check'
                    + '</span><br><span style="color:var(--text-subtle)">Not a real enquiry. '
                    + 'Safe to delete.</span>' : '') + '</td>' +
                '<td><a href="mailto:' + esc(e.email) + '">' + esc(e.email) + '</a></td>' +
                '<td>' + esc(e.type || e.enquiry_type || '-') + '</td>' +
                '<td class="cell-club">' + esc(String(e.message || '').slice(0, 90)) + '</td>' +
                '<td><button class="btn btn--quiet btn--sm" data-del-enq="' + i + '">Delete</button></td>' +
              '</tr>';
            }).join('')) : empty('No enquiries yet',
              'Submissions from the contact, join and sponsorship forms land here.')) +
          '</div>' +
          '<div data-tabpane="sup" hidden style="margin-top:var(--space-4)">' +
            '<div class="cp-head">' +
              '<p class="cp-note">' + esc(sup.length) + ' people get the newsletter.</p>' +
              '<div class="cp-head__actions">' +
                '<button class="btn btn--ghost btn--sm" data-csv-sup>Export CSV</button></div>' +
            '</div>' +
            (sup.length ? table(['Joined', 'Email', 'Where from'], sup.map(function (s2) {
              return '<tr><td>' + esc(fmtDate(s2.created_at)) + '</td><td>' + esc(s2.email) +
                '</td><td>' + esc(s2.source || '-') + '</td></tr>';
            }).join('')) : empty('No subscribers yet')) +
          '</div>',
        where: [['Join the club', '/join.html'], ['Club information', '/contact.html'],
          ['Sponsors', '/sponsors.html']],
        whereNote: 'these are the forms that feed it',
      });

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
    var st = CP.state;
    host.innerHTML =
      '<div class="grid grid--2">' +
        sec({
          title: 'Your access',
          body: '<dl class="cp-dl">' +
            '<div><dt>Signed in as</dt><dd>' + esc(st.user ? st.user.email : '-') + '</dd></div>' +
            '<div><dt>What the database says you are</dt><dd>' +
              (st.role ? '<span class="badge badge--success">' + esc(st.role) + '</span>'
                : '<span class="badge badge--warning">not registered</span>') + '</dd></div>' +
            '<div><dt>Can you change anything</dt><dd>' +
              (st.isAdmin ? 'Yes' : 'No, everything is read-only') + '</dd></div>' +
            '<div><dt>Your account id</dt><dd class="is-id">' +
              esc(st.user ? st.user.id : '-') + '</dd></div>' +
          '</dl>' +
          (!st.isAdmin
            ? '<p class="cp-note" style="margin-top:var(--space-4)">To grant access, run '
              + 'migrations/002_admin_role_and_rls.sql and insert the account id above into '
              + 'public.admin_users. Permission is the database’s answer, not this panel’s, which is '
              + 'why nothing here can grant it to itself.</p>'
            : ''),
        }) +

        sec({
          title: 'How a change reaches the website',
          body: '<p class="cp-note">Everything you save in this panel goes into the club’s database '
            + 'straight away. The website is a set of files built from that database, so it does not '
            + 'change until it is rebuilt. <b>Publish to site</b>, at the top of every screen, is what '
            + 'rebuilds it. It takes a couple of minutes, the site stays up throughout, and if the '
            + 'build fails the site stays exactly as it is.</p>' +
            '<p class="cp-note">Anything you have not saved does not go out. Anything you have saved '
            + 'does, including things saved days ago and never published.</p>',
        }) +

        sec({ title: 'Who changed what', body: '<div data-audit><p class="cp-note">Loading.</p></div>' }) +

        sec({
          title: 'Backup',
          sub: 'Every content table as one JSON file. Worth taking before any bulk change: it is the '
            + 'only copy that does not depend on the database being reachable.',
          actions: '<button class="btn btn--primary btn--sm" data-backup>Download a full backup</button>',
        }) +

        sec({
          title: 'Club details',
          sub: 'The club name, contact address, venue, social links and sponsorship packages are in '
            + 'the site’s own source so they ship as static HTML and are indexable rather than '
            + 'fetched when somebody arrives. Changing one is a code change and a rebuild.',
          body: '<p class="cp-note">Club email: <b>' + esc(window.SA_EMAIL || '') + '</b></p>',
        }) +
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
        ? feed(rows.map(function (a2) {
          return [(a2.action + ' ' + (a2.table_name || '') + ' ' + (a2.row_key || '')).trim(),
            fmtDate(a2.at)];
        }))
        : '<p class="cp-note">Nothing recorded yet.</p>';
    }).catch(function () {
      auditHost.innerHTML = '<p class="cp-note">The audit table is not there yet. '
        + 'Run migrations/002_admin_role_and_rls.sql to switch it on.</p>';
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
    /* THE TITLE IS THE LABEL, NOT THE WHOLE BUTTON.

       It read the nav button's textContent, and the button also holds the
       count badge. setCount writes the number and then HIDES the span when it
       is zero - hidden, but still in textContent - so the header of the
       Fixtures screen said "Fixtures 0" and the Inbox said "Inbox 0". A
       screen titled with a stray digit reads as a counter that has broken,
       which is worse than no counter at all. */
    var lab = $('[data-module="' + key + '"] .cp-nav__label');
    var title = $('[data-cp-title]');
    if (lab && title) title.textContent = lab.textContent.trim();
    if (location.hash.slice(1) !== key) history.replaceState(null, '', '#' + key);
    render(key);
    var side = $('.cp-side');
    if (side) side.classList.remove('is-open');
  }

  /* ---- Loading a module when its panel is first opened -------------------
     This file used to carry all thirteen modules and hand every one of them
     to somebody who opened one. Its budget went 16 -> 18 -> 24 -> 30KB in a
     single sitting, always for that reason.

     The two heaviest are now separate files: the match form with its pitch,
     position codes and pickers, and the photograph tagger. Neither is fetched
     until its panel is opened, and the browser caches it from then on, so the
     cost is paid once by the people who actually use it and never by somebody
     signing in to read the inbox.

     A chunk registers itself into window.CPM, which is the same object `M` is,
     so once it has loaded nothing downstream can tell the difference. */
  var CHUNKS = window.CP_CHUNKS || {};
  var CHUNK_OF = {
    matchday: 'matchday',
    fixtures: 'match', results: 'match',
    phototag: 'photos',
    squad: 'squad', coaches: 'coaches',
    news: 'content', media: 'content', recognition: 'content',
    league: 'content', sponsors: 'content',
    photos: 'photos-donations', donations: 'photos-donations',
    pipeline: 'pipeline',
    covers: 'covers',
    videos: 'video',
    hero: 'hero',
    home: 'home',
  };
  var pending = {};
  /* Fetch a chunk by its own name. `need` maps a panel to one; CPU.chunk
     asks for one directly, which is how a button loads the report writer. */
  function load(chunk) {
    if (!chunk) return Promise.resolve();
    if (pending[chunk]) return pending[chunk];
    pending[chunk] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = '/' + (CHUNKS[chunk] || ('control-' + chunk + '.js'));
      s.onload = resolve;
      /* Forget the failure so pressing the section again retries, rather than
         caching a dead promise and looking permanently broken after one
         dropped connection. */
      s.onerror = function () {
        delete pending[chunk];
        reject(new Error('This section could not be downloaded. Check your connection and open it again.'));
      };
      document.head.appendChild(s);
    });
    return pending[chunk];
  }

  function need(key) {
    if (M[key]) return Promise.resolve();
    return load(CHUNK_OF[key]);
  }

  /* A section exists if the shell rendered a button for it. Asking M instead
     would now answer "no" for anything not yet downloaded, which would send
     a bookmarked #results straight back to the dashboard. */
  function known(key) { return !!key && !!$('[data-module="' + key + '"]'); }

  function render(key) {
    var panel = $('#panel-' + key);
    if (!panel) return;
    var spinner = $('[data-panel-loading]', panel);
    var old = $('[data-panel-body]', panel);
    if (spinner) spinner.hidden = false;
    panel.setAttribute('aria-busy', 'true');

    /* REPLACE the body element, do not empty it.
       Every module attaches its listeners to this element and relies on
       events bubbling up from the rows it draws. Setting innerHTML = '' takes
       away the rows and leaves the listeners, so each refresh added another
       identical handler to the same node. Two renders in, one click ran the
       handler twice: two writes to the database, two toasts, two confirm
       dialogs, and a player added to the eleven twice by one choice. It got
       worse every time anything was saved, because saving refreshes.

       cloneNode(false) keeps the element and its attributes and takes nothing
       else, listeners included. */
    var body = old.cloneNode(false);
    old.parentNode.replaceChild(body, old);
    /* The element holding the edits has just been thrown away, so whatever was
       unsaved is gone and the warning must go with it. */
    setDirty(false);

    need(key)
      .then(function () {
        if (!M[key]) { body.innerHTML = empty('Not built yet'); return null; }
        return M[key](body);
      })
      /* OFFERED, NOT APPLIED. Restoring silently would overwrite what the
         database holds with something the club may have abandoned on purpose,
         and it would do it before they had seen either. So the draft sits in
         a bar at the top of the screen saying when it was typed, and nothing
         moves until somebody chooses. */
      .then(function () {
        var d = takeDraft(key, body);
        if (!d) return;
        var when = new Date(d.at);
        var bar = document.createElement('div');
        bar.className = 'cp-sec panel cp-card cp-note--warn';
        bar.innerHTML = '<p class="cp-head__title">Unsaved changes from '
          + esc(when.toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }))
          + '</p><p class="cp-note">These were typed here and never reached the database. '
          + 'Putting them back fills the screen in again; you still have to press Save.</p>'
          + '<div class="cp-head__actions"><button class="btn btn--primary btn--sm" data-draft-restore>'
          + 'Put them back</button> <button class="btn btn--ghost btn--sm" data-draft-discard>Discard</button></div>';
        body.insertBefore(bar, body.firstChild);
        bar.addEventListener('click', function (e) {
          if (e.target.closest('[data-draft-restore]')) {
            applyDraft(body, d);
            bar.remove();
            toast('Put back. Press Save to store them.');
          } else if (e.target.closest('[data-draft-discard]')) {
            dropDraft(key);
            bar.remove();
            setDirty(false);
          }
        });
      })
      .catch(function (e) {
        body.innerHTML = '<div class="state" style="border-color:var(--error)">' +
          '<p class="state__title">Could not load this section</p>' +
          '<p class="state__body">' + esc(e.message) + '</p></div>';
      })
      .then(function () {
        if (spinner) spinner.hidden = true;
        /* The panel was silent while it fetched its chunk and read the
           database: a spinner is a picture, and aria-busy is the same fact
           said out loud. */
        panel.removeAttribute('aria-busy');
        wireHints(body);
      });
  }

  /* ======================================================================
     THE HINT UNDER A FIELD IS PART OF THE FIELD

     Every editor writes its own markup - there is no shared field builder -
     so each one puts the explanation in a `.cp-note` beside the control and
     none of them associates the two. Sighted users get the sentence that says
     what the field does and what it affects on the website; a screen reader
     reads the label and moves on, so the most useful half of the panel's own
     writing is the half that never reaches the people who most need it.

     Done here, once, after whatever the module drew, for the same reason the
     drafts are: thirteen modules that each have to remember is thirteen
     chances to forget. Ids are minted only where one is missing, and an
     existing aria-describedby is never overwritten. */
  var hintId = 0;
  function wireHints(root) {
    Array.prototype.forEach.call(root.querySelectorAll('input,select,textarea'), function (el) {
      if (el.getAttribute('aria-describedby')) return;
      /* IMMEDIATELY AFTER, AND NOTHING ELSE. The hint a module writes sits
         directly after the control, or directly after the label wrapping it.

         This first fell back to "the first .cp-note among my siblings", which
         is not the same question: a field with no hint of its own picked up
         the hint belonging to a field further up the section. A textarea for
         match notes was described to a screen reader as "Shown on the results
         page", which is the wrong sentence read with total confidence -
         worse than the silence it was meant to fix. */
      var scope = el.closest('label') || el;
      var next = scope.nextElementSibling;
      /* `field__hint` is what the editors actually use beside a control;
         `cp-note` is the class for a note about a whole section. This looked
         for cp-note alone, which is the wrong half of the vocabulary: the
         panel's 39 field hints all carry field__hint, so the wiring ran on
         every render and attached itself to nothing. The suite asserted the
         mechanism existed rather than that it caught anything, so it passed
         while the feature was inert. */
      /* A RUN of hints, not just the first. The match notes field carries an
         explanation AND a live gauge saying how much has been written, in two
         paragraphs; only the explanation was ever announced, so the half that
         changes as you type reached nobody. aria-describedby takes a list, so
         it gets one. Still only what sits IMMEDIATELY after the control - the
         run stops at the first element that is not a hint, which is what keeps
         a field from picking up a sentence belonging to the next one. */
      var ids = [];
      while (next && next.classList
        && (next.classList.contains('field__hint') || next.classList.contains('cp-note'))) {
        if (!next.id) { hintId += 1; next.id = 'cp-hint-' + hintId; }
        ids.push(next.id);
        next = next.nextElementSibling;
      }
      if (!ids.length) return;
      el.setAttribute('aria-describedby', ids.join(' '));
    });
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
    show(known(start) ? start : 'dashboard');
  }

  $$('.cp-nav__item').forEach(function (b) {
    b.addEventListener('click', function () { show(b.getAttribute('data-module')); });
  });

  /* CROSS-PANEL LINKS WORK FROM ANY PANEL.
     `data-goto` was bound inside the dashboard, so it was a dashboard feature
     rather than a panel one: any other screen wanting to send somebody to
     Fixtures had to carry its own listener and its own convention, and the
     matchday screen promptly invented `data-go` for exactly that reason. One
     delegated listener on the document, one attribute, every panel. */
  document.addEventListener('click', function (e) {
    var go = e.target.closest && e.target.closest('[data-goto]');
    if (go) show(go.getAttribute('data-goto'));
  });
  /* ---- Publish -------------------------------------------------------
     Everything in this panel writes to the database. The website is
     generated from a snapshot of it, so until this is pressed an edit is
     saved but not published. The confirm says exactly that, because
     "Publish" meaning "the thing you already saved now becomes visible" is
     not obvious from the word alone. */
  /* ---- Unsaved work, said out loud ------------------------------------
     Save writes to the database and Publish rebuilds the site from it, which
     means a screen edited but not saved is invisible to Publish. The confirm
     below has always said so in a sentence, and a sentence in a dialog is not
     a warning: the club rearranged the home page, pressed the big obvious
     button at the top, and reported that the site was ignoring the panel. It
     was not. Nothing had ever been written.

     So the panel now knows when a screen is dirty, says so where the change
     was made, refuses to let Publish go past it quietly, and asks before the
     tab closes. Held here rather than per module so every future screen gets
     it by setting one flag. */
  var dirty = false;
  function setDirty(v) {
    dirty = !!v;
    document.documentElement.classList.toggle('is-dirty', dirty);
  }
  window.addEventListener('beforeunload', function (e) {
    if (!dirty) return;
    e.preventDefault();
    e.returnValue = '';
  });

  /* ======================================================================
     WHAT WAS TYPED SURVIVES A FAILED SAVE

     The panel knew when a screen was dirty and warned before the tab closed,
     and that warning was live on exactly ONE screen: the home layout is the
     only module that ever calls U.dirty. Every other editor - the match form
     above all, five tabs and forty fields filled in on a phone at the side of
     a pitch - could lose everything to a dropped connection, an expired
     token, or a stray refresh, in silence. render() even says so out loud:
     "whatever was unsaved is gone".

     A warning is not a save. What matters is that the typing survives, so it
     is kept as it is typed and offered back on the way in.

     Held HERE, generically, rather than per module, for the same reason
     setDirty is: thirteen modules that each have to remember is thirteen
     chances to forget, and the module that forgets is the one that loses a
     match report. A delegated listener on the panel body sees every field in
     every editor, including ones not written yet.

     What it stores is FIELD VALUES, not the record. It has no idea what a
     match is and does not need one. That is also why it will only offer a
     draft back to a form of the same shape: if the form has been changed
     since, the signature will not match and the draft is dropped rather than
     poured into whatever fields happen to line up.  */
  var DRAFTS = 'sa-cp-drafts';
  var DRAFT_TTL = 6048e5;

  /* A field's identity within its panel: what modules actually set (`name` or
     `id`), with the index to separate repeated rows that carry neither. */
  function fieldsIn(root) {
    return Array.prototype.filter.call(root.querySelectorAll('input,select,textarea'),
      function (el) { return el.type !== 'password' && el.type !== 'file'; });
  }
  function snapshot(root) {
    var sig = [], val = [];
    fieldsIn(root).forEach(function (el, i) {
      sig.push(el.tagName + (el.type || '') + (el.name || el.id || '') + i);
      val.push(el.type === 'checkbox' || el.type === 'radio' ? !!el.checked : String(el.value));
    });
    return { sig: sig, val: val };
  }
  /* Read, expire and write in one place. A full or blocked localStorage must
     never take the panel down: the draft is a safety net, and a net that
     throws is worse than none. */
  function drafts(mutate) {
    var all;
    try { all = JSON.parse(localStorage.getItem(DRAFTS) || '{}'); } catch (e) { all = {}; }
    var now = Date.now();
    Object.keys(all).forEach(function (k) {
      if (!all[k] || (now - (all[k].at || 0)) >= DRAFT_TTL) delete all[k];
    });
    if (mutate) {
      mutate(all);
      try { localStorage.setItem(DRAFTS, JSON.stringify(all)); } catch (e) { /* full */ }
    }
    return all;
  }
  function dropDraft(k) { drafts(function (all) { delete all[k]; }); }
  function takeDraft(key, root) {
    var d = drafts()[key];
    if (!d) return null;
    var now = snapshot(root);
    /* Same form, or nothing: a form that has changed shape since would have
       the draft poured into whatever fields happened to line up. And nothing
       to offer if it already matches what is on screen. */
    if (now.sig.join() !== String(d.sig) || now.val.join() === String(d.val)) {
      dropDraft(key);
      return null;
    }
    return d;
  }
  function applyDraft(root, d) {
    fieldsIn(root).forEach(function (el, i) {
      if (d.val[i] === undefined) return;
      if (el.type === 'checkbox' || el.type === 'radio') el.checked = !!d.val[i];
      else el.value = d.val[i];
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  /* ======================================================================
     A FIELD THAT IS WRONG SAYS SO, WHERE IT IS WRONG

     The panel already validates: a dozen hand-written checks with good plain
     messages - "Pick a date.", "Name the opponent.", "The trialist needs a
     name." - all running before the save. What none of them does is tell the
     FIELD. The message goes to a shared error line or a toast, `aria-invalid`
     appears nowhere, and focus stays where it was, so on a long form the
     person is told something is wrong and left to find it.

     Twenty fields also declare a native constraint - `type="number"` with
     `min`/`max`, a minute between 1 and 120 - and nothing checked them at
     all, so an impossible value went to the server to be refused there, which
     on mobile data at the side of a pitch is the expensive way to find out.

     checkValidity() is the browser's own answer and needs no module to
     cooperate: a field that declares nothing is always valid, so this is
     inert everywhere it has not been asked for. */
  function markValidity(el) {
    if (!el.checkValidity || !el.willValidate) return true;
    var ok = el.checkValidity();
    el.setAttribute('aria-invalid', ok ? 'false' : 'true');
    var msg = el.nextElementSibling;
    var isMsg = msg && msg.classList && msg.classList.contains('cp-invalid');
    if (ok) { if (isMsg) msg.remove(); return true; }
    if (!isMsg) {
      msg = document.createElement('p');
      msg.className = 'cp-invalid';
      if (el.parentNode) el.parentNode.insertBefore(msg, el.nextSibling);
    }
    msg.textContent = el.validationMessage;
    return false;
  }
  document.addEventListener('change', function (e) {
    var body = e.target && e.target.closest && e.target.closest('[data-panel-body]');
    if (body) markValidity(e.target);
  }, true);

  /* A DIALOG IS NOT INSIDE THE PANEL BODY. wireHints runs on what a module
     draws into its panel, and the biggest form in the whole panel - the match
     editor, 76 fields and 14 hints - is not drawn there at all: it is
     appended straight to <body> as a modal, after the render that would have
     wired it. So the screen with the most explaining to do had none of it
     reaching a screen reader.

     A childList watch on body alone, NOT subtree: a modal is a direct child,
     and watching the whole tree would run this on every keystroke that
     changes a row. wireHints skips anything already described, so opening the
     same dialog twice costs one pass over its fields. */
  new MutationObserver(function (recs) {
    recs.forEach(function (r) {
      [].forEach.call(r.addedNodes, function (n) { if (n.nodeType === 1) wireHints(n); });
    });
  }).observe(document.body, { childList: true });

  var draftTimer = null;
  document.addEventListener('input', function (e) {
    var body = e.target && e.target.closest && e.target.closest('[data-panel-body]');
    if (!body || !current || e.target.type === 'password' || e.target.type === 'file') return;
    setDirty(true);
    clearTimeout(draftTimer);
    draftTimer = setTimeout(function () {
      drafts(function (all) { all[current] = { at: Date.now(), sig: snapshot(body).sig, val: snapshot(body).val }; });
    }, 400);
  }, true);

  /* A DRAFT IS ONLY SAFE TO THROW AWAY ONCE THE ROW IS WRITTEN. Wrapped
     around the store's own upsert so it clears on the same condition the
     panel already trusts - verifyWrote() has counted rows, so this is a real
     write and not a 204 being read as one. Every editor saves through here,
     so none of them has to remember. */
  var rawUpsert = CP.upsert;
  CP.upsert = function (table, key, data) {
    return rawUpsert(table, key, data).then(function (res) {
      if (current) dropDraft(current);
      setDirty(false);
      return res;
    });
  };

  var pub = $('#cp-publish');
  if (pub) pub.addEventListener('click', function () {
    if (dirty) {
      confirmAction({
        title: 'You have changes that are not saved',
        body: 'Publishing rebuilds the website from the database, and unsaved changes '
          + 'are not in the database yet. They would not appear on the site.',
        detail: 'Close this, press Save on the screen you were editing, then publish.',
        confirmLabel: 'Publish without them',
      }).then(function (yes) { if (yes) { setDirty(false); publishNow(); } });
      return;
    }
    publishNow();
  });

  function publishNow() {
    /* No client-side guard here, deliberately, and unlike every other write.
       Permission is the database's answer and this button's whole job is to go
       and get it. Refusing on the browser's copy of that answer means a wrong
       copy stops the request before anything can tell you it was wrong, which
       is exactly the situation where you most need to hear from the server. */
    confirmAction({
      title: 'Publish to the website?',
      body: 'This rebuilds the site from the database as it is right now. '
        + 'Everything saved in this panel goes live; anything you have not saved does not.',
      detail: 'It takes a couple of minutes. The site stays up throughout, and if the '
        + 'build fails the current site stays exactly as it is.',
      confirmLabel: 'Publish',
    }).then(function (yes) {
      if (!yes) return;
      pub.setAttribute('data-loading', 'true');
      pub.textContent = 'Publishing…';
      var tok = CP.state.session && CP.state.session.access_token;
      fetch('/api/publish', { method: 'POST', headers: { Authorization: 'Bearer ' + tok } })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (j) {
          pub.removeAttribute('data-loading');
          pub.textContent = 'Publish to site';
          if (j && j.ok) { toast(j.message || 'Publishing.', 'success'); return; }
          /* Say what actually happened. `detail` carries the status the
             database gave back when the fault is in the website rather than in
             the account, and printing it is the difference between somebody
             fixing this in a minute and somebody going to look at the wrong
             screen in Vercel. */
          toast((j && j.error) || 'Could not publish.', 'error');
          if (j && j.detail) toast(j.detail, 'error');
        })
        .catch(function () {
          pub.removeAttribute('data-loading');
          pub.textContent = 'Publish to site';
          toast('Could not reach the server.', 'error');
        });
    });
  }

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
    if (k !== current && known(k)) show(k);
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
