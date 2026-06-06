/* hero-rotator.js — rotates the matchday photos through the HOME hero banner only.
   • Layer A always rests at opacity 1 showing the current photo (so the banner is
     visible even if the browser throttles the fade transition).
   • Layer B sits on top and fades in the next photo, then hands it down to A.
   • On theme switch it jumps to a different photo, so dark and light never show
     the same image. */
(function () {
  var DEFAULTS = [];
  for (var i = 1; i <= 12; i++) DEFAULTS.push('assets/hero/banner-' + (i < 10 ? '0' : '') + i + '.jpg');
  function heroImages() { try { var c = window.getHeroImages ? window.getHeroImages() : []; return (c && c.length) ? c : DEFAULTS; } catch (e) { return DEFAULTS; } }

  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.random() * (i + 1) | 0, t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  var ROTATE = 6500, FADE = 1400;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var rotators = [];

  // Prefer a .webp sibling for the local hero banners; fall back to the original
  // .jpg automatically if the browser can't load webp (older Safari/Firefox).
  function webpVariant(url) {
    return /assets\/hero\/banner-\d+\.jpg$/.test(url) ? url.replace(/\.jpg$/, '.webp') : url;
  }
  function load(layer, url, cb) {
    var primary = webpVariant(url);
    if (layer.getAttribute('src') === primary && layer.naturalWidth) { cb && cb(); return; }
    layer.onload = function () { cb && cb(); };
    layer.onerror = function () {
      // webp failed — retry once with the original jpg, then give up gracefully
      if (primary !== url && (layer.getAttribute('src') || '').indexOf('.webp') !== -1) {
        layer.onerror = function () { cb && cb(); };
        layer.src = url;
      } else { cb && cb(); }
    };
    layer.src = primary;
    if (layer.complete && layer.naturalWidth) { layer.onload = null; cb && cb(); }
  }

  function makeRotator(host, parallax) {
    host.innerHTML = '';
    function mk() { var im = document.createElement('img'); im.className = 'hero-rot__img' + (parallax ? ' hero-rot__img--px' : ''); im.alt = ''; im.decoding = 'async'; host.appendChild(im); return im; }
    var A = mk(), B = mk();          // A = base (always visible), B = incoming (on top)
    A.style.opacity = '1'; B.style.opacity = '0';
    var order = shuffle(heroImages()), pos = 0, busy = false;

    load(A, order[0]);               // first photo shows immediately at opacity 1

    function crossfadeTo(url) {
      if (busy) return;
      busy = true;
      load(B, url, function () {
        B.style.opacity = '1';       // CSS transition fades it in; if throttled it snaps — still correct
        setTimeout(function () {
          A.src = B.getAttribute('src') || url; A.style.opacity = '1';   // inherit the source B actually loaded
          B.style.opacity = '0';
          busy = false;
        }, FADE);
      });
    }
    function next() { pos = (pos + 1) % order.length; crossfadeTo(order[pos]); }

    if (!reduce) setInterval(next, ROTATE);

    if (parallax && !reduce) {
      var raf;
      var onScroll = function () {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          var y = Math.min(window.scrollY, 800), t = 'translateY(' + (y * 0.14) + 'px) scale(1.06)';
          A.style.transform = t; B.style.transform = t;
        });
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
    return { bump: function () { pos = (pos + (order.length >> 1)) % order.length; crossfadeTo(order[pos]); } };
  }

  function init() {
    var home = document.querySelector('.mh-hero__photo');
    if (home && !home.__rot) { home.__rot = 1; rotators.push(makeRotator(home, true)); }
  }

  var tries = 0;
  var poll = setInterval(function () {
    init();
    if (document.querySelector('.mh-hero__photo') || ++tries > 40) clearInterval(poll);
  }, 150);

  var last = document.documentElement.getAttribute('data-theme');
  new MutationObserver(function () {
    var t = document.documentElement.getAttribute('data-theme');
    if (t !== last) { last = t; rotators.forEach(function (r) { r.bump(); }); }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
