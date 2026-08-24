/* ==========================================================================
   CONTROL PANEL: COVER PICTURES, DRAWN RATHER THAN FOUND

   Every article and every match report wants a picture at the top of it and
   in the card when somebody shares the link. Most of them have never had one,
   because getting one meant finding a photograph, cropping it and hosting it
   somewhere, for an article that took four minutes to write.

   So the club stops looking for a picture and draws one. A match report cover
   is the two badges, the score and the date, which is exactly what the retired
   editor made and exactly what the thing is about. A news cover is the crest
   and the headline. Both are drawn on a canvas here, in the club's own colours
   and type, uploaded once and saved onto the record.

   It is deliberately a FALLBACK, not a replacement. A real photograph beats a
   drawn card every time and any record that already has one keeps it; the
   button says so.

   WHY IN THE BROWSER
   The generator could draw these at build time, and for a moment that looks
   tidier. But then the cover only exists after a developer runs a build, which
   is the exact gap this whole panel was built to close: the club needs the
   picture at the moment it writes the report, to put in a WhatsApp group on
   Sunday afternoon. Canvas is in every browser and needs nothing installed.
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
  var sec = U.sec;
  var table = U.table;
  var empty = U.empty;

  var SEED = window.SA_SEED || {};
  var BADGES = SEED.badges || {};
  var US = SEED.club || "Sue's Angels FC";

  /* 1200 x 630 is what every platform crops a shared link to. Drawn at twice
     that and scaled down, because a canvas at exactly the target size renders
     type with visibly soft edges on a high-density screen. */
  var W = 1200;
  var H = 630;
  var SCALE = 2;

  var BRAND = '#FF7034';
  var INK = '#0B0B0C';

  function loadImage(src) {
    return new Promise(function (resolve) {
      if (!src) { resolve(null); return; }
      var img = new Image();
      img.crossOrigin = 'anonymous';
      /* A badge that will not load must not stop the cover being made: the
         card falls back to the club's initials in a disc. */
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  function initials(name) {
    return String(name || '').replace(/\b(FC|AFC|United|Town|Club)\b/gi, '')
      .trim().split(/\s+/).slice(0, 2).map(function (w) { return w[0] || ''; })
      .join('').toUpperCase() || '?';
  }

  /* A badge, or a disc with the club's initials where there is no badge. */
  function drawBadge(ctx, img, name, cx, cy, size) {
    if (img) {
      var ratio = Math.min(size / img.width, size / img.height);
      var w = img.width * ratio;
      var h = img.height * ratio;
      ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
      return;
    }
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '700 ' + Math.round(size * 0.3) + 'px Archivo, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials(name), cx, cy + 2);
    ctx.restore();
  }

  /* The club's background: black, with the orange bloom the site itself wears
     behind everything. */
  function drawGround(ctx) {
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, W, H);
    var g1 = ctx.createRadialGradient(W * 0.16, H * 0.12, 0, W * 0.16, H * 0.12, W * 0.55);
    g1.addColorStop(0, 'rgba(255,112,52,0.42)');
    g1.addColorStop(1, 'rgba(255,112,52,0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);
    var g2 = ctx.createRadialGradient(W * 0.92, H * 0.95, 0, W * 0.92, H * 0.95, W * 0.45);
    g2.addColorStop(0, 'rgba(255,112,52,0.26)');
    g2.addColorStop(1, 'rgba(255,112,52,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);
    /* The bar along the bottom, which is what makes it read as the club's and
       not as a generic dark card. */
    ctx.fillStyle = BRAND;
    ctx.fillRect(0, H - 10, W, 10);
  }

  /* For a single line that must not wrap: the scoreline. */
  function fitText(ctx, text, max, start, weight) {
    var size = start;
    do {
      ctx.font = weight + ' ' + size + 'px Archivo, system-ui, sans-serif';
      size -= 2;
    } while (ctx.measureText(text).width > max && size > 20);
    return size + 2;
  }

  /* For a headline, which SHOULD wrap. Shrinking until it fits on one line is
     what made a nine-word headline render at 24px in the middle of a card
     designed for 60: the size has to be chosen against the number of lines it
     is allowed, not against the width of the whole string. Largest size whose
     wrapped result still fits in `lines` wins. */
  function fitHeadline(ctx, text, max, lines, start, min) {
    for (var size = start; size >= min; size -= 2) {
      ctx.font = '800 ' + size + 'px Archivo, system-ui, sans-serif';
      var out = wrap(ctx, text, max, lines + 1);
      if (out.length <= lines && !out.some(function (l) { return /…$/.test(l); })) {
        return { size: size, lines: out };
      }
    }
    ctx.font = '800 ' + min + 'px Archivo, system-ui, sans-serif';
    return { size: min, lines: wrap(ctx, text, max, lines) };
  }

  /* Greedy wrap into at most `lines` lines.

     The first version tracked how many words it had emitted and sliced the
     rest off the end, which lost the line it was part way through building:
     a nine-word headline came out as "William Clark announces his retirement
     from footb". Wrap the whole thing first, then trim, and trim by WORDS, so
     the cut is never mid-word. */
  function wrap(ctx, text, max, lines) {
    var words = String(text).split(/\s+/).filter(Boolean);
    var out = [];
    var line = '';
    for (var i = 0; i < words.length; i++) {
      var next = line ? line + ' ' + words[i] : words[i];
      if (line && ctx.measureText(next).width > max) {
        out.push(line);
        line = words[i];
      } else line = next;
    }
    if (line) out.push(line);
    if (out.length <= lines) return out;

    var kept = out.slice(0, lines);
    var tail = kept[lines - 1];
    while (tail.indexOf(' ') !== -1 && ctx.measureText(tail + '…').width > max) {
      tail = tail.replace(/\s*\S+$/, '');
    }
    kept[lines - 1] = tail + '…';
    return kept;
  }

  function canvas() {
    var c = document.createElement('canvas');
    c.width = W * SCALE;
    c.height = H * SCALE;
    var ctx = c.getContext('2d');
    ctx.scale(SCALE, SCALE);
    return { c: c, ctx: ctx };
  }

  function toBlob(c) {
    return new Promise(function (resolve) { c.toBlob(resolve, 'image/jpeg', 0.88); });
  }

  /* ---- The match report card: two badges, the score, the date ---- */
  /* The club's own mark on these cards is the star crest the site wears now.
     The badge registry still holds the shield the club used before the
     rebrand, which is correct for the archive and wrong for a card being made
     today: a report shared this afternoon would carry last season's crest. */
  function badgeFor(name) {
    return /Sue.s Angels/.test(String(name)) ? SEED.crest : BADGES[name];
  }

  function matchCover(m) {
    return Promise.all([loadImage(badgeFor(m.home)), loadImage(badgeFor(m.away))])
      .then(function (imgs) {
        var k = canvas();
        var ctx = k.ctx;
        drawGround(ctx);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        /* Competition, small and quiet at the top. */
        ctx.fillStyle = BRAND;
        ctx.font = '700 22px Archivo, system-ui, sans-serif';
        ctx.letterSpacing = '3px';
        ctx.fillText(String(m.competition || '').toUpperCase(), W / 2, 78);
        ctx.letterSpacing = '0px';

        drawBadge(ctx, imgs[0], m.home, 210, H / 2 - 20, 200);
        drawBadge(ctx, imgs[1], m.away, W - 210, H / 2 - 20, 200);

        /* The score, or the fixture's "v" where there is no score to show. */
        ctx.fillStyle = '#fff';
        var score = m.score || 'v';
        var size = fitText(ctx, score, 420, 130, '800');
        ctx.font = '800 ' + size + 'px Archivo, system-ui, sans-serif';
        ctx.fillText(score, W / 2, H / 2 - 34);

        /* Club names under their badges, shortened so two long ones do not
           collide in the middle. */
        ctx.fillStyle = 'rgba(255,255,255,0.82)';
        ctx.font = '600 20px Geist, system-ui, sans-serif';
        [[m.home, 210], [m.away, W - 210]].forEach(function (pair) {
          var name = String(pair[0]).replace(/\s+FC 2\.0$/, '').replace(/\s+FC$/, '');
          var lines = wrap(ctx, name, 300, 2);
          lines.forEach(function (l, i) { ctx.fillText(l, pair[1], H / 2 + 118 + i * 26); });
        });

        /* The date, which is the third thing the card is for. */
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '500 24px Geist, system-ui, sans-serif';
        ctx.fillText(m.date || '', W / 2, H / 2 + 74);

        ctx.fillStyle = 'rgba(255,255,255,0.42)';
        ctx.font = '600 18px Geist, system-ui, sans-serif';
        ctx.letterSpacing = '2px';
        ctx.fillText(US.toUpperCase(), W / 2, H - 52);
        ctx.letterSpacing = '0px';

        return toBlob(k.c);
      });
  }

  /* ---- The news card: the crest and the headline ---- */
  function newsCover(a) {
    return loadImage(SEED.crest).then(function (crest) {
      var k = canvas();
      var ctx = k.ctx;
      drawGround(ctx);

      if (crest) {
        var h = 300;
        var w = crest.width * (h / crest.height);
        ctx.globalAlpha = 0.9;
        ctx.drawImage(crest, W - w - 70, (H - h) / 2 - 10, w, h);
        ctx.globalAlpha = 1;
      }

      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = BRAND;
      ctx.font = '700 22px Archivo, system-ui, sans-serif';
      ctx.letterSpacing = '3px';
      ctx.fillText(String(a.category || 'News').toUpperCase(), 70, 128);
      ctx.letterSpacing = '0px';

      ctx.fillStyle = '#fff';
      var fit = fitHeadline(ctx, a.title || '', 700, 3, 62, 30);
      ctx.font = '800 ' + fit.size + 'px Archivo, system-ui, sans-serif';
      /* Block centred on the card rather than pinned to a fixed top, so a
         one-line headline and a three-line one both sit where the eye goes. */
      var lh = fit.size * 1.14;
      var top = (H - lh * fit.lines.length) / 2 + fit.size * 0.82;
      fit.lines.forEach(function (l, i) { ctx.fillText(l, 70, top + i * lh); });

      ctx.fillStyle = 'rgba(255,255,255,0.62)';
      ctx.font = '500 22px Geist, system-ui, sans-serif';
      ctx.fillText((a.date || '') + (a.date ? '  ·  ' : '') + US, 70, H - 72);

      return toBlob(k.c);
    });
  }

  function upload(blob, prefix) {
    var name = prefix + '-' + Date.now() + '.jpg';
    return CP.upload('gallery', name, blob);
  }

  /* ==========================================================================
     THE SECTION
     ========================================================================== */
  M.covers = function (host) {
    return Promise.all([CP.readAll('matches'), CP.readAll('articles')]).then(function (r) {
      var matches = (r[0] || []).slice().sort(function (a, b) {
        return String(b.key).localeCompare(String(a.key));
      });
      var articles = (r[1] || []).slice().sort(function (a, b) {
        return String((b.data || {}).sortISO || '').localeCompare(String((a.data || {}).sortISO || ''));
      });
      /* A RECORD HAS A COVER IF THE SITE SHIPS ONE, not only if this table
         stores one. The build draws a card for every match and article and
         commits it, so asking about `cover` alone reported thirty-eight
         reports as having none while all thirty-eight were sharing a drawn
         card. The three states are different things and the club should be
         able to tell them apart:

           stored   a photograph, or a card drawn here. Always wins.
           drawn    the card the build made from the record itself.
           none     the generic club image, which is the only real gap.  */
      var drawn = {};
      (SEED.drawnCovers || []).forEach(function (k) { drawn[String(k)] = 1; });
      var hasDrawn = function (x) { return !!drawn[String(x.key)]; };
      var hasAny = function (x) { return !!(x.data || {}).cover || hasDrawn(x); };
      var mNone = matches.filter(function (x) { return !hasAny(x); }).length;
      var aNone = articles.filter(function (x) { return !hasAny(x); }).length;

      host.innerHTML =
        sec({
          title: 'Cover pictures',
          sub: 'Every match report and every article wants a picture at the top and in the card when '
            + 'somebody shares the link. Rather than going and finding one, the club draws one: two '
            + 'badges, the score and the date for a match, the crest and the headline for an article. '
            + 'A real photograph is better and anything that already has one keeps it.',
          actions: (mNone || aNone)
            ? '<button class="btn btn--primary" data-all>Make the ' + esc(mNone + aNone) + ' that are missing</button>'
            : '<span class="cp-note">Everything has a cover. Anything without one of its own is '
              + 'sharing a card drawn from its own record.</span>',
          body: '<p class="cp-note" data-progress></p>',
          where: [['News', '/news.html'], ['Results', '/results.html']],
          whereNote: 'and in the card wherever a link is shared',
        }) +

        sec({
          title: 'Match reports',
          sub: '<b>' + esc(matches.length - mNone) + '</b> of <b>' + esc(matches.length)
            + '</b> have a cover.',
          body: table(['Match', 'Score', 'Cover', ''], matches.map(function (x) {
            var d = x.data || {};
            return '<tr data-match="' + esc(x.key) + '">' +
              '<td><b>' + esc(U.matchLabel(x.key)) + '</b></td>' +
              '<td>' + esc(d.hs != null && d.as != null ? d.hs + '-' + d.as : '') + '</td>' +
              '<td>' + (d.cover
                ? '<img src="' + esc(d.cover) + '" alt="" width="96" height="50" '
                  + 'style="border-radius:6px;object-fit:cover;display:block">'
                : (drawn[String(x.key)]
                  ? '<span class="cp-note">Drawn from the record</span>'
                  : '<span class="badge badge--warning">None</span>')) + '</td>' +
              '<td><button class="btn btn--ghost btn--sm" data-make>' +
                (d.cover ? 'Draw a new one' : 'Draw one') + '</button></td>' +
            '</tr>';
          }).join('')),
        }) +

        sec({
          title: 'Articles',
          sub: '<b>' + esc(articles.length - aNone) + '</b> of <b>' + esc(articles.length)
            + '</b> have a cover.',
          body: (articles.length
            ? table(['Headline', 'Category', 'Cover', ''], articles.map(function (x) {
              var d = x.data || {};
              return '<tr data-article="' + esc(x.key) + '">' +
                '<td><b>' + esc(d.title || 'Untitled') + '</b></td>' +
                '<td>' + esc(d.cat || 'News') + '</td>' +
                '<td>' + (d.cover
                  ? '<img src="' + esc(d.cover) + '" alt="" width="96" height="50" '
                    + 'style="border-radius:6px;object-fit:cover;display:block">'
                  : (drawn[String(x.key)]
                    ? '<span class="cp-note">Drawn from the record</span>'
                    : '<span class="badge badge--warning">None</span>')) + '</td>' +
                '<td><button class="btn btn--ghost btn--sm" data-make>' +
                  (d.cover ? 'Draw a new one' : 'Draw one') + '</button></td>' +
              '</tr>';
            }).join(''))
            : empty('No articles yet')),
        });

      var note = $('[data-progress]', host);

      function forMatch(rec) {
        var d = rec.data || {};
        var home = d.home || US;
        var away = d.away || '';
        return matchCover({
          home: home,
          away: away,
          score: (d.hs != null && d.as != null) ? d.hs + ' - ' + d.as
            : d.kind === 'walkover' ? 'W/O' : '',
          date: d.date || '',
          competition: d.competition || '',
        }).then(function (blob) {
          return upload(blob, 'cover-match').then(function (url) {
            var next = Object.assign({}, d, { cover: url });
            return CP.upsert('matches', rec.key, next);
          });
        });
      }

      function forArticle(rec) {
        var d = rec.data || {};
        return newsCover({ title: d.title || 'Sue’s Angels FC', category: d.cat, date: d.date })
          .then(function (blob) {
            return upload(blob, 'cover-news').then(function (url) {
              var next = Object.assign({}, d, { cover: url });
              return CP.upsert('articles', rec.key, next);
            });
          });
      }

      host.addEventListener('click', function (e) {
        if (e.target.matches('[data-all]')) {
          if (!guard()) return;
          /* Only what has NO card at all. Filtering on the stored cover alone
             would have queued all forty-three, redrawing every card the build
             had already made and replacing a committed file with a canvas
             render for no reason. */
          var jobs = matches.filter(function (x) { return !hasAny(x); })
            .map(function (x) { return { run: function () { return forMatch(x); }, what: U.matchLabel(x.key) }; })
            .concat(articles.filter(function (x) { return !hasAny(x); })
              .map(function (x) {
                return { run: function () { return forArticle(x); }, what: (x.data || {}).title || 'article' };
              }));
          var done = 0;
          e.target.setAttribute('data-loading', 'true');
          /* One at a time. Twenty canvases and twenty uploads at once locks the
             tab and gives the storage bucket twenty simultaneous writes for no
             gain: this is a job somebody sets going and comes back to. */
          jobs.reduce(function (chain, job) {
            return chain.then(function () {
              note.textContent = 'Drawing ' + (done + 1) + ' of ' + jobs.length + ': ' + job.what;
              return job.run().then(function () { done++; });
            });
          }, Promise.resolve()).then(function () {
            toast(done + ' covers drawn', 'success');
            refresh('covers');
          }).catch(function (err) {
            e.target.removeAttribute('data-loading');
            note.textContent = 'Stopped after ' + done + ': ' + err.message;
          });
          return;
        }

        if (!e.target.matches('[data-make]')) return;
        if (!guard()) return;
        var row = e.target.closest('[data-match], [data-article]');
        if (!row) return;
        e.target.setAttribute('data-loading', 'true');
        var key = row.getAttribute('data-match') || row.getAttribute('data-article');
        var isMatch = !!row.getAttribute('data-match');
        var rec = (isMatch ? matches : articles).filter(function (x) { return x.key === key; })[0];
        (isMatch ? forMatch(rec) : forArticle(rec)).then(function () {
          toast('Cover drawn', 'success');
          refresh('covers');
        }).catch(function (err) {
          e.target.removeAttribute('data-loading');
          toast(err.message, 'error');
        });
      });
    });
  };
})();
