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
