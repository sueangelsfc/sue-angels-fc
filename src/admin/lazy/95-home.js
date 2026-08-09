/* ==========================================================================
   CONTROL PANEL: THE HOME PAGE

   What the front page leads with, and in what order.

   The order used to be one line of home.mjs, which meant it was a decision
   made in July that the club could not revisit. In August that showed: the
   promotion to League Eight was news, and the news band sat where it had
   always sat while an empty League Eight table led the page.

   So the order is the club's. Eight bands, move any of them, turn any of them
   off, put it all back with one press. The list here is HANDED IN by the build
   (SEED.homeBands), so this screen cannot offer a band the site cannot draw
   and cannot fall behind one that gets renamed.

   Two things it deliberately does not do.

   It does not let anybody move the top of the page. The hero carries the
   page's one h1, the club name and the next match, and a home page that opens
   on the league table is not a home page. It is named as pinned rather than
   silently absent, because a list of eight where the page has nine invites
   somebody to go looking for the bug.

   And it does not offer to REORDER WHAT IS INSIDE a band. What the results
   band shows is the last seven matches played, which the site works out. A
   switch here that promised otherwise would be a second source for a fact the
   site already derives, and the two would disagree.
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
  var SEED = window.SA_SEED || {};

  var BANDS = SEED.homeBands || [];
  var KEYS = BANDS.map(function (b) { return b.key; });

  /* THE SAME RULE AS src/lib/home-layout.mjs resolveHomeLayout(), and it has to
     stay the same rule: this screen shows the club the order the website is
     going to publish, so the two answering differently would make the preview
     a lie. Kept as two copies rather than one shipped module because the
     generator's copy must run in Node with no window and this one must run in
     a browser with no build step; the suite runs both over the same cases and
     fails if they ever part company. */
  function resolve(rec) {
    var raw = (rec && Object.prototype.toString.call(rec.order) === '[object Array]') ? rec.order : [];
    var seen = {};
    var order = [];
    raw.forEach(function (k) {
      if (KEYS.indexOf(k) < 0 || seen[k]) return;
      seen[k] = 1;
      order.push(k);
    });
    KEYS.forEach(function (key, i) {
      if (seen[key]) return;
      var at = 0;
      for (var j = i - 1; j >= 0; j -= 1) {
        var p = order.indexOf(KEYS[j]);
        if (p >= 0) { at = p + 1; break; }
      }
      order.splice(at, 0, key);
      seen[key] = 1;
    });
    var hidden = ((rec && Object.prototype.toString.call(rec.hidden) === '[object Array]')
      ? rec.hidden : []).filter(function (k) { return KEYS.indexOf(k) >= 0; });
    return { order: order, hidden: hidden };
  }

  function bandOf(key) {
    for (var i = 0; i < BANDS.length; i += 1) if (BANDS[i].key === key) return BANDS[i];
    return { key: key, name: key, what: '' };
  }

  M.home = function (host) {
    return CP.readAll('player_photos').then(function (rows) {
      var row = rows.filter(function (r) { return r.key === 'home:layout'; })[0];
      var saved = (row && row.data) || null;

      /* The working copy. Every press edits this; nothing reaches the database
         until Save the order, so a run of moves is one write and one audit
         entry rather than nine. */
      var state = resolve(saved);
      var dirty = false;

      function isHidden(k) { return state.hidden.indexOf(k) >= 0; }

      /* What the website will actually publish: chosen, not hidden, and not
         empty. This is also what the numbers down the left of the home page
         count, so an empty or hidden band cannot leave 04 followed by 06. */
      function live() {
        return state.order.filter(function (k) {
          return !isHidden(k) && !bandOf(k).empty;
        });
      }

      function rowHtml(key, i) {
        var b = bandOf(key);
        var off = isHidden(key);
        var empty = !!b.empty;
        var n = live().indexOf(key);
        return '<li class="hband' + (off || empty ? ' is-off' : '') + '" data-band="' + esc(key) + '">' +
          '<span class="hband__n">' + (n >= 0 ? (n < 9 ? '0' : '') + (n + 1) : '--') + '</span>' +
          '<span class="hband__t">' +
            '<b>' + esc(b.name) + '</b>' +
            '<span>' + esc(b.what) + '</span>' +
            (empty
              ? '<span class="hband__flag">Nothing in it at the moment, so the page leaves it out '
                + 'whichever way this is set.</span>'
              : '') +
          '</span>' +
          '<span class="hband__b">' +
            '<button class="btn btn--ghost btn--sm" type="button" data-up ' +
              (i === 0 ? 'disabled' : '') + ' aria-label="Move ' + esc(b.name) + ' up">↑</button>' +
            '<button class="btn btn--ghost btn--sm" type="button" data-down ' +
              (i === state.order.length - 1 ? 'disabled' : '') +
              ' aria-label="Move ' + esc(b.name) + ' down">↓</button>' +
            '<button class="btn btn--quiet btn--sm" type="button" data-toggle>' +
              (off ? 'Show' : 'Hide') + '</button>' +
          '</span>' +
        '</li>';
      }

      function listHtml() {
        return '<ol class="hbands">' +
          '<li class="hband is-pinned">' +
            '<span class="hband__n">Top</span>' +
            '<span class="hband__t"><b>The club and the next match</b>' +
              '<span>The crest, the club name and the next fixture with its countdown. '
              + 'Pinned: it carries the page heading, and it moves itself on when a match '
              + 'has been played.</span></span>' +
            '<span class="hband__b"></span>' +
          '</li>' +
          state.order.map(rowHtml).join('') +
        '</ol>';
      }

      function statusHtml() {
        var n = live().length;
        if (!n) {
          return '<p class="cp-note" style="color:var(--warning)">Every band is turned off. '
            + 'The home page would show the crest, the next match and the footer, and nothing '
            + 'else. That is allowed, but it is almost certainly not what you meant.</p>';
        }
        return '<p class="cp-note">The home page will show <b>' + n + '</b> '
          + (n === 1 ? 'band' : 'bands') + ' under the next match, in this order. '
          + 'Numbers down the left of the page follow it.</p>';
      }

      function paint() {
        $('[data-hl-list]', host).innerHTML = listHtml();
        $('[data-hl-status]', host).innerHTML = statusHtml();
        $('[data-hl-save]', host).disabled = !dirty;
      }

      host.innerHTML = sec({
        title: 'What the home page shows',
        sub: 'The front page is the club crest and the next match, then a run of bands down the '
          + 'page. Move them into the order you want people to meet them in, and turn off '
          + 'anything that is not worth a screen this month.',
        actions: '<button class="btn btn--primary" data-hl-save disabled>Save the order</button>'
          + (saved ? '<button class="btn btn--quiet" data-hl-reset>Put the standard order back</button>' : ''),
        body:
          '<div data-hl-status></div>' +
          '<div data-hl-list></div>' +
          '<p class="cp-note" style="margin-top:var(--space-4)">What each band SHOWS is worked out '
            + 'by the site: the results band is always the last seven played, the table is the '
            + 'league as it stands, the news band is the six newest articles. This screen sets '
            + 'the running order, not the contents.</p>',
        where: [['Home page', '/']],
        whereNote: 'after you press Publish to site',
      });

      paint();

      host.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('button') : null;
        if (!btn) return;

        if (btn.hasAttribute('data-hl-reset')) {
          if (!guard()) return;
          confirmAction({
            title: 'Put the standard order back?',
            body: 'The home page returns to the order it ships with, with every band showing.',
            detail: 'Nothing else changes, and you can rearrange it again at any time.',
            confirmLabel: 'Put it back',
          }).then(function (yes) {
            if (!yes) return;
            CP.remove('player_photos', 'home:layout').then(function () {
              toast('Standard order restored', 'success');
              refresh('home');
            }).catch(function (err) { toast(err.message, 'error'); });
          });
          return;
        }

        if (btn.hasAttribute('data-hl-save')) {
          if (!guard()) return;
          /* The record it started from, with only the two fields this screen
             covers replaced. A shape this form has never heard of survives
             being edited by it. */
          var out = {};
          if (saved) for (var k in saved) if (Object.prototype.hasOwnProperty.call(saved, k)) out[k] = saved[k];
          out.order = state.order.slice();
          out.hidden = state.hidden.slice();
          CP.upsert('player_photos', 'home:layout', out).then(function () {
            toast('Order saved. Press Publish to site to put it live.', 'success');
            refresh('home');
          }).catch(function (err) { toast(err.message, 'error'); });
          return;
        }

        var li = btn.closest('[data-band]');
        if (!li) return;
        var key = li.getAttribute('data-band');
        var i = state.order.indexOf(key);
        if (i < 0) return;

        if (btn.hasAttribute('data-up') && i > 0) {
          state.order.splice(i, 1);
          state.order.splice(i - 1, 0, key);
          dirty = true;
        } else if (btn.hasAttribute('data-down') && i < state.order.length - 1) {
          state.order.splice(i, 1);
          state.order.splice(i + 1, 0, key);
          dirty = true;
        } else if (btn.hasAttribute('data-toggle')) {
          var at = state.hidden.indexOf(key);
          if (at >= 0) state.hidden.splice(at, 1);
          else state.hidden.push(key);
          dirty = true;
        } else {
          return;
        }
        paint();
      });
    });
  };

  /* Exposed so the suite can run this copy of the rule against the
     generator's over the same records and prove they answer alike. */
  window.CPH = { resolve: resolve };
})();
