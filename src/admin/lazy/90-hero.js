/* ==========================================================================
   CONTROL PANEL: THE HOME PAGE BANNER

   This was deliberately left out, and the reason was a good one: the banner is
   the first thing every visitor loads, it ships as three pre-optimised widths
   with a preload hint, and a naive picker would replace all that with one
   four-megabyte photograph off a phone and make the homepage slower for
   everybody, forever, to save one person a developer's afternoon.

   The objection was to the naive picker, not to the club choosing its own
   banner. So this one does what the build does. One photograph goes in and
   THREE come out, at 640, 960 and 1344 across, and the page keeps its srcset,
   its sizes attribute, its width and height and its preload hint. A phone
   still gets the 640 file; the preload still points at the right one.

   What that buys, concretely: a 4.2MB photograph becomes about 60KB on a
   phone. Uploading it whole would be seventy times the weight, on the one
   image every single visitor waits for.

   The picture is stored as a `hero:home` record and the generator reads it
   over the built-in banner, so removing it puts the original back rather than
   leaving the homepage with a hole in it.
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

  /* The same three the built-in banner ships at, so the srcset the page already
     carries stays exactly true. */
  var WIDTHS = [640, 960, 1344];

  function kb(n) { return Math.round(n / 1024) + 'KB'; }

  M.hero = function (host) {
    return CP.readAll('player_photos').then(function (rows) {
      var row = rows.filter(function (r) { return r.key === 'hero:home'; })[0];
      var d = (row && row.data) || {};
      var has = !!d.w1344;

      host.innerHTML =
        sec({
          title: 'The home page banner',
          sub: 'The photograph behind the top of the home page. It is the first thing every visitor '
            + 'loads, so a picture chosen here is cut to three sizes before it goes anywhere and the '
            + 'page serves whichever one fits the screen. A phone gets the small one.',
          actions: '<label class="btn btn--primary" style="cursor:pointer">'
            + (has ? 'Choose a different photograph' : 'Choose a photograph')
            + '<input type="file" accept="image/*" hidden data-hero></label>'
            + (has ? '<button class="btn btn--quiet" data-hero-clear>Put the original back</button>' : ''),
          body:
            (has
              ? '<img src="' + esc(d.w1344) + '" alt="" '
                + 'style="width:100%;max-width:720px;border-radius:var(--radius-sm);display:block">'
                + '<p class="cp-note" style="margin-top:var(--space-3)">Three sizes stored: '
                + WIDTHS.map(function (w) {
                  return '<b>' + w + '</b>' + (d['b' + w] ? ' (' + kb(d['b' + w]) + ')' : '');
                }).join(', ') + '.</p>'
              : '<p class="cp-note">The club is using the banner the site ships with. Choosing one '
                + 'here replaces it everywhere the home page shows it.</p>') +
            '<div class="field" style="margin-top:var(--space-4);max-width:60ch">' +
              '<label class="field__label" for="hero-alt">What is in the photograph</label>' +
              '<input class="input" id="hero-alt" value="' + esc(d.alt || '') + '" ' +
                'placeholder="The squad before kick-off at Chestnut Grove">' +
              '<p class="field__hint">Read aloud by a screen reader, and shown if the picture fails '
                + 'to load. Leave it blank only if the photograph is pure decoration.</p>' +
            '</div>' +
            '<div class="cp-head__actions" style="margin-top:var(--space-3)">' +
              '<button class="btn btn--ghost btn--sm" data-hero-alt>Save the description</button>' +
              '<span class="cp-note" data-hero-note>A wide, landscape photograph works best: the top '
                + 'of the picture is where the club name sits.</span>' +
            '</div>',
          where: [['Home page', '/']],
        });

      var note = $('[data-hero-note]', host);

      host.addEventListener('change', function (e) {
        if (!e.target.matches('[data-hero]')) return;
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!guard()) { e.target.value = ''; return; }
        note.textContent = 'Cutting ' + kb(file.size) + ' into three sizes.';

        /* One read, three sizes, in order, so the note can say which one it is
           on rather than freezing for however long the whole job takes. */
        var out = { alt: $('#hero-alt', host).value.trim() || d.alt || '' };
        WIDTHS.reduce(function (chain, w) {
          return chain.then(function () {
            note.textContent = 'Making the ' + w + ' wide version.';
            return U.uploadImage(file, { max: w, prefix: 'hero-' + w }).then(function (r) {
              out['w' + w] = r.url;
              out['b' + w] = r.now;
            });
          });
        }, Promise.resolve()).then(function () {
          return CP.upsert('player_photos', 'hero:home', out);
        }).then(function () {
          toast('Banner set. ' + kb(file.size) + ' down to ' + kb(out.b640) + ' on a phone.', 'success');
          refresh('hero');
        }).catch(function (err) {
          note.textContent = err.message;
          e.target.value = '';
        });
      });

      host.addEventListener('click', function (e) {
        if (e.target.matches('[data-hero-alt]')) {
          if (!guard()) return;
          CP.upsert('player_photos', 'hero:home',
            Object.assign({}, d, { alt: $('#hero-alt', host).value.trim() }))
            .then(function () { toast('Saved', 'success'); refresh('hero'); })
            .catch(function (err) { toast(err.message, 'error'); });
          return;
        }
        if (!e.target.matches('[data-hero-clear]')) return;
        if (!guard()) return;
        confirmAction({
          title: 'Put the original banner back?',
          body: 'The home page returns to the photograph the site ships with.',
          detail: 'Nothing else changes, and you can choose a new one at any time.',
          confirmLabel: 'Put it back',
        }).then(function (yes) {
          if (!yes) return;
          CP.remove('player_photos', 'hero:home').then(function () {
            toast('Original banner restored', 'success');
            refresh('hero');
          }).catch(function (err) { toast(err.message, 'error'); });
        });
      });
    });
  };
})();
