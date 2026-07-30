/* ==========================================================================
   HOMEPAGE ENHANCEMENTS
   Countdown and carousel controls. Both are enhancements: the card reads fine
   without the countdown, and the carousels are scroll-snap rails that already
   work by touch, trackpad and keyboard with this file blocked.
   ========================================================================== */
(function () {
  'use strict';
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---- Countdown ------------------------------------------------------
     aria-live is deliberately off in the markup: a value that changes every
     second would flood a screen reader. The full date is already in the card,
     so the countdown is decorative precision rather than the only source. */
  $$('[data-countdown]').forEach(function (el) {
    var iso = el.getAttribute('data-countdown');
    var target = iso ? new Date(iso).getTime() : NaN;
    if (!target || isNaN(target)) { el.textContent = 'TBC'; return; }

    function tick() {
      var diff = target - Date.now();
      if (diff <= 0) { el.textContent = 'Kick-off'; return true; }
      var s = Math.floor(diff / 1000);
      var d = Math.floor(s / 86400);
      var h = Math.floor((s % 86400) / 3600);
      var m = Math.floor((s % 3600) / 60);
      var sec = s % 60;
      el.textContent = (d > 0 ? d + 'd ' : '') + h + 'h ' + m + 'm ' + sec + 's';
      return false;
    }
    if (tick()) return;
    var id = setInterval(function () { if (tick()) clearInterval(id); }, 1000);
  });

  /* ---- Carousels ------------------------------------------------------ */
  $$('.carousel').forEach(function (root) {
    var rail = root.querySelector('[data-carousel-rail]');
    var prev = root.querySelector('[data-carousel-prev]');
    var next = root.querySelector('[data-carousel-next]');
    if (!rail) return;

    function step() {
      var first = rail.firstElementChild;
      if (!first) return rail.clientWidth * 0.8;
      var gap = parseFloat(getComputedStyle(rail).columnGap || getComputedStyle(rail).gap || 16) || 16;
      return first.getBoundingClientRect().width + gap;
    }
    function sync() {
      var max = rail.scrollWidth - rail.clientWidth - 2;
      if (prev) prev.disabled = rail.scrollLeft <= 2;
      if (next) next.disabled = rail.scrollLeft >= max;
      // With nothing to scroll, the controls are noise - hide them entirely.
      var overflows = rail.scrollWidth > rail.clientWidth + 4;
      [prev, next].forEach(function (b) { if (b) b.hidden = !overflows; });
    }
    if (prev) prev.addEventListener('click', function () { rail.scrollLeft -= step(); });
    if (next) next.addEventListener('click', function () { rail.scrollLeft += step(); });
    rail.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);

    // Arrow keys when the rail itself has focus.
    rail.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); rail.scrollLeft += step(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); rail.scrollLeft -= step(); }
    });
    sync();
  });
})();

/* ==========================================================================
   AWARD COVERFLOW
   Rotates which card is at the front. The cards are real links stacked with
   CSS transforms, so with this file blocked they remain a readable stack and
   every one is still reachable by keyboard.
   ========================================================================== */
(function () {
  'use strict';
  var flows = Array.prototype.slice.call(document.querySelectorAll('[data-coverflow]'));
  flows.forEach(function (root) {
    var cards = Array.prototype.slice.call(root.querySelectorAll('[data-cf-card]'));
    if (cards.length < 2) return;
    var prev = root.querySelector('[data-cf-prev]');
    var next = root.querySelector('[data-cf-next]');
    var at = 0;

    function paint() {
      cards.forEach(function (c, i) {
        // Offset from the active card, wrapped, drives the --i depth variable.
        var off = (i - at + cards.length) % cards.length;
        c.style.setProperty('--i', off);
        c.setAttribute('data-active', off === 0 ? 'true' : 'false');
        // Cards behind the front one are not tab stops.
        c.setAttribute('tabindex', off === 0 ? '0' : '-1');
        c.setAttribute('aria-hidden', off === 0 ? 'false' : 'true');
      });
    }
    if (prev) prev.addEventListener('click', function () { at = (at - 1 + cards.length) % cards.length; paint(); });
    if (next) next.addEventListener('click', function () { at = (at + 1) % cards.length; paint(); });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft' && prev) { e.preventDefault(); prev.click(); }
      if (e.key === 'ArrowRight' && next) { e.preventDefault(); next.click(); }
    });
    paint();
  });
})();

/* Carousel progress bar under the results rail. */
(function () {
  'use strict';
  Array.prototype.slice.call(document.querySelectorAll('[data-carousel-bar]')).forEach(function (bar) {
    var wrap = bar.closest('.carousel');
    var rail = wrap && wrap.querySelector('[data-carousel-rail]');
    if (!rail) return;
    function sync() {
      var max = rail.scrollWidth - rail.clientWidth;
      var pct = max > 0 ? rail.scrollLeft / max : 0;
      bar.style.transform = 'translateX(' + (pct * ((100 / 0.22) - 100)) + '%)';
    }
    rail.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  });
})();
