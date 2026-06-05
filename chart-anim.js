/* chart-anim.js — plays the player-profile chart animations when the mouse comes
   NEAR them (hovering the graph or the wheel), not on open. The charts sit in
   their final state by default; hovering replays the fill from empty → real value
   via the Web Animations API (which runs reliably on the active hover frame). */
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

  // debounce so a re-hover only replays once the previous run has finished
  function ready(el, gap) { var n = Date.now(); if (el.__last && n - el.__last < (gap || 2400)) return false; el.__last = n; return true; }

  function playLine(wrap) {
    if (!ready(wrap)) return;
    wrap.querySelectorAll('.m-spark__animline').forEach(function (el, i) {
      try { el.style.strokeDasharray = '1'; el.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 1700, delay: i * 170, easing: EASE, fill: 'forwards' }); } catch (e) {}
    });
    wrap.querySelectorAll('.m-spark__dot').forEach(function (el, i) {
      try { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 360, delay: 1550 + i * 170, easing: EASE, fill: 'both' }); } catch (e) {}
    });
  }

  function playWheel(wheel) {
    if (!ready(wheel)) return;
    wheel.querySelectorAll('.m-wheel__wedge').forEach(function (el) {
      try { el.animate([{ transform: 'scale(0.08)' }, { transform: 'scale(1)' }], { duration: 1300, easing: EASE, fill: 'both' }); } catch (e) {}
    });
  }

  document.addEventListener('mouseover', function (e) {
    var t = e.target; if (!t || !t.closest) return;
    var sw = t.closest('.m-sparkwrap'); if (sw) playLine(sw);
    var wh = t.closest('.m-wheel'); if (wh) playWheel(wh);
  }, { passive: true });
})();
