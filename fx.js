/* fx.js — delayed volt glow that trails the cursor across hero/CTA panels.
   Event-delegated so it works on React-rendered nodes without recompiling.
   Sets --gx/--gy (eased) on the hovered panel; CSS paints a radial volt glow. */
(function () {
  var SEL = '.mp-hero__panel, .mh-join';
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var cur = null, tx = 50, ty = 50, cx = 50, cy = 50;
  function loop() {
    cx += (tx - cx) * 0.12; cy += (ty - cy) * 0.12;
    if (cur) { cur.style.setProperty('--gx', cx.toFixed(1) + '%'); cur.style.setProperty('--gy', cy.toFixed(1) + '%'); }
    requestAnimationFrame(loop);
  }
  function pos(el, e) { var r = el.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100]; }
  document.addEventListener('mousemove', function (e) {
    var el = e.target.closest ? e.target.closest(SEL) : null;
    if (el !== cur) {
      if (cur) cur.classList.remove('is-glow');
      cur = el;
      if (cur) { cur.classList.add('is-glow'); var p = pos(cur, e); cx = tx = p[0]; cy = ty = p[1]; }
    }
    if (cur) { var q = pos(cur, e); tx = q[0]; ty = q[1]; }
  }, { passive: true });
  requestAnimationFrame(loop);
})();

/* === Pointer tilt for [data-tilt] cards (dynamic movement) ===================
   Delegated so it survives React re-renders. Desktop pointers only. */
(function () {
  try {
    if (!window.matchMedia) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(hover: none)').matches) return; // skip touch devices
    var MAX = 6, cur = null, raf = 0, lx = 0, ly = 0;
    function apply() {
      raf = 0;
      if (!cur) return;
      cur.style.transform = 'perspective(780px) rotateX(' + (-ly * MAX).toFixed(2) + 'deg) rotateY(' + (lx * MAX).toFixed(2) + 'deg) translateY(-5px)';
    }
    document.addEventListener('pointermove', function (e) {
      var card = e.target && e.target.closest ? e.target.closest('[data-tilt]') : null;
      if (cur && cur !== card) { cur.style.transform = ''; cur = null; }
      if (!card) return;
      cur = card;
      var r = card.getBoundingClientRect();
      lx = (e.clientX - r.left) / r.width - 0.5;
      ly = (e.clientY - r.top) / r.height - 0.5;
      if (!raf) raf = requestAnimationFrame(apply);
    }, { passive: true });
    function reset() { if (cur) { cur.style.transform = ''; cur = null; } }
    document.addEventListener('pointerleave', reset, true);
    document.addEventListener('pointercancel', reset, true);
    window.addEventListener('blur', reset);
  } catch (e) {}
})();
