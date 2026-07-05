/* home-fx.js — the "matchday" experience layer for the HOME page only.
   ----------------------------------------------------------------------------
   Starts from the current homepage and elevates it: GSAP choreography synced
   to the boot crest, scroll-driven depth, a rising volt ember field, live
   counters, magnetic buttons, drag physics on the results rail, and a scroll
   progress ring on the back-to-top button.

   Design rules:
   • The page must be PERFECT without this file (or if the GSAP CDN fails):
     nothing is hidden in CSS; all initial states are set via gsap.set only.
   • prefers-reduced-motion: this file does nothing at all.
   • Existing layers are respected: m-reveal (SiteApp observer) keeps its
     elements; fx.js keeps cursor glow + [data-tilt]; hero-rotator keeps
     rotating photos; chart-anim keeps its hover replays (we only nudge it).
   ---------------------------------------------------------------------------- */
(function () {
  'use strict';
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var TOUCH = window.matchMedia && window.matchMedia('(hover: none)').matches;
  var MOBILE = window.matchMedia && window.matchMedia('(max-width: 760px)').matches;

  /* ---- wait for GSAP + the rendered homepage ------------------------------ */
  function ready(cb) {
    var t0 = Date.now();
    (function poll() {
      var ok = window.gsap && window.ScrollTrigger && document.querySelector('.cine__copy');
      if (ok) return cb();
      if (Date.now() - t0 > 9000) return; // CDN or render failed: current site stands as-is
      requestAnimationFrame(poll);
    })();
  }

  ready(function () {
    var g = window.gsap;
    g.registerPlugin(window.ScrollTrigger);
    var EXPO = 'expo.out';

    /* ======================================================================
       1) HERO INTRO — choreographed handoff from the boot crest
       ====================================================================== */
    var copy = document.querySelector('.cine__copy');
    var kids = copy ? Array.prototype.slice.call(copy.children) : [];
    var strip = document.querySelector('.cine__strip');
    var photo = document.querySelector('.cine__photo img');
    var boot = document.getElementById('sa-boot');

    function heroIntro() {
      var tl = g.timeline({ defaults: { ease: EXPO } });
      if (photo) tl.fromTo(photo, { scale: 1.1 }, { scale: 1, duration: 2.6, ease: 'power2.out' }, 0);
      tl.to(kids, { opacity: 1, y: 0, duration: 1.05, stagger: 0.09 }, 0.15);
      if (strip) tl.to(strip, { opacity: 1, y: 0, duration: 0.9 }, 0.7);
      tl.add(function () { window.ScrollTrigger.refresh(); });
    }

    if (kids.length) g.set(kids, { opacity: 0, y: 26 });
    if (strip) g.set(strip, { opacity: 0, y: 22 });

    if (boot && boot.parentNode) {
      // Play as the boot overlay starts its 1s fade, so the crest hands over
      // to the hero in one continuous moment.
      var played = false;
      var fire = function () { if (!played) { played = true; heroIntro(); } };
      if (boot.classList.contains('sa-boot--hide')) {
        fire(); // fx loaded mid-fade: hand over immediately
      } else {
        new MutationObserver(function (muts, mo) {
          if (boot.classList.contains('sa-boot--hide') || !boot.parentNode) { mo.disconnect(); fire(); }
        }).observe(boot, { attributes: true, attributeFilter: ['class'] });
      }
      setTimeout(fire, 12500); // safety net: never leave the hero hidden
    } else {
      heroIntro();
    }

    /* ======================================================================
       2) HERO DEPTH — scroll parallax + pointer pan (desktop)
       ====================================================================== */
    if (photo) {
      g.to(photo, {
        yPercent: 10, scale: 1.05, ease: 'none',
        scrollTrigger: { trigger: '.cine', start: 'top top', end: 'bottom top', scrub: 0.6 }
      });
    }
    if (copy) {
      g.to(copy, {
        yPercent: -6, ease: 'none',
        scrollTrigger: { trigger: '.cine', start: 'top top', end: 'bottom top', scrub: 0.6 }
      });
    }
    if (photo && !TOUCH) {
      var px = 0, py = 0, qx = g.quickTo(photo, 'x', { duration: 0.9, ease: 'power3' }),
          qy = g.quickTo(photo, 'y', { duration: 0.9, ease: 'power3' });
      window.addEventListener('pointermove', function (e) {
        px = (e.clientX / window.innerWidth - 0.5) * 18;
        py = (e.clientY / window.innerHeight - 0.5) * 10;
        qx(px); qy(py);
      }, { passive: true });
    }

    /* ======================================================================
       3) EMBERS — volt sparks rising through the hero (the cause, alive)
       ====================================================================== */
    (function embers() {
      var host = document.querySelector('.cine__photo');
      if (!host) return;
      var cv = document.createElement('canvas');
      cv.className = 'fx-embers';
      cv.setAttribute('aria-hidden', 'true');
      host.parentNode.insertBefore(cv, host.nextSibling); // above photo, below grad/copy
      var ctx = cv.getContext('2d');
      var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
      var N = MOBILE ? 46 : 110;
      var P = [];

      function size() {
        var r = host.getBoundingClientRect();
        W = Math.max(1, r.width); H = Math.max(1, r.height);
        cv.width = W * DPR; cv.height = H * DPR;
        cv.style.width = W + 'px'; cv.style.height = H + 'px';
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      }
      function spawn(i, first) {
        P[i] = {
          x: Math.random() * W,
          y: first ? Math.random() * H : H + 8,
          r: 0.7 + Math.random() * 1.7,
          v: 0.16 + Math.random() * 0.5,
          drift: (Math.random() - 0.5) * 0.22,
          a: 0.12 + Math.random() * 0.5,
          tw: 0.4 + Math.random() * 1.6,
          t: Math.random() * 6.28
        };
      }
      size();
      for (var i = 0; i < N; i++) spawn(i, true);
      new ResizeObserver(size).observe(host);

      var run = true, visible = true;
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: 0.02 }).observe(host);
      document.addEventListener('visibilitychange', function () { run = !document.hidden; });

      (function draw(now) {
        requestAnimationFrame(draw);
        if (!run || !visible) return;
        ctx.clearRect(0, 0, W, H);
        for (var i = 0; i < N; i++) {
          var p = P[i];
          p.y -= p.v; p.x += p.drift; p.t += 0.016 * p.tw;
          if (p.y < -10 || p.x < -12 || p.x > W + 12) { spawn(i); continue; }
          var glow = p.a * (0.55 + 0.45 * Math.sin(p.t));
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, 6.2832);
          ctx.fillStyle = 'rgba(214,242,58,' + glow.toFixed(3) + ')';
          ctx.shadowColor = 'rgba(214,242,58,0.85)';
          ctx.shadowBlur = 6;
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      })();
    })();

    /* ======================================================================
       4) SECTION CHOREOGRAPHY — richer reveals for what m-reveal doesn't own
       ====================================================================== */
    function reveal(targets, opts) {
      var els = (typeof targets === 'string') ? document.querySelectorAll(targets) : targets;
      if (!els || !els.length) return;
      g.set(els, { opacity: 0, y: opts && opts.y != null ? opts.y : 34 });
      window.ScrollTrigger.batch(els, {
        start: 'top 88%',
        once: true,
        onEnter: function (batch) {
          g.to(batch, { opacity: 1, y: 0, duration: 0.95, ease: EXPO, stagger: 0.08 });
        }
      });
    }

    reveal('.mh-ocamba > *', { y: 24 });                          // media/news strip
    reveal('.mp-grid.mp-g4 > *');                                 // dashboard cards
    reveal('.mh-ledger > *');                                     // season ledger blocks
    reveal('.mh-rail > *', { y: 28 });                            // results rail cards
    reveal('.mh-table-wrap tbody tr', { y: 16 });                 // table rows cascade
    reveal('.mh-join > *', { y: 26 });                            // join band content

    /* ======================================================================
       5) LIVE COUNTERS — dashboard numbers count up as they arrive
       ====================================================================== */
    (function counters() {
      var grid = document.querySelector('.mp-grid.mp-g4');
      if (!grid) return;
      var nodes = [];
      grid.querySelectorAll('*').forEach(function (el) {
        if (el.children.length) return;
        var txt = (el.textContent || '').trim();
        if (/^\d{1,3}$/.test(txt) && +txt > 0) nodes.push({ el: el, n: +txt });
      });
      nodes.forEach(function (item) {
        var state = { v: 0 };
        window.ScrollTrigger.create({
          trigger: item.el, start: 'top 90%', once: true,
          onEnter: function () {
            g.to(state, {
              v: item.n, duration: 1.4, ease: EXPO,
              onUpdate: function () { item.el.textContent = String(Math.round(state.v)); }
            });
          }
        });
      });
    })();

    // Nudge the ledger charts to play their fill once they scroll in
    // (chart-anim.js owns the animation; it listens for mouseover).
    document.querySelectorAll('.m-wheel, .m-spark').forEach(function (el) {
      window.ScrollTrigger.create({
        trigger: el, start: 'top 85%', once: true,
        onEnter: function () {
          try { el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); } catch (e) {}
        }
      });
    });

    /* ======================================================================
       6) MAGNETIC BUTTONS — primary CTAs lean toward the cursor
       ====================================================================== */
    if (!TOUCH) {
      var mags = document.querySelectorAll('.cine__copy .m-btn, .sa-act .m-btn--volt, .mh-join .m-btn');
      mags.forEach(function (btn) {
        var qbx = g.quickTo(btn, 'x', { duration: 0.4, ease: 'power3' });
        var qby = g.quickTo(btn, 'y', { duration: 0.4, ease: 'power3' });
        btn.addEventListener('pointermove', function (e) {
          var r = btn.getBoundingClientRect();
          qbx((e.clientX - (r.left + r.width / 2)) * 0.18);
          qby((e.clientY - (r.top + r.height / 2)) * 0.22);
        });
        btn.addEventListener('pointerleave', function () {
          g.to(btn, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.45)' });
        });
      });
    }

    /* ======================================================================
       7) RESULTS RAIL — grab, drag, flick (desktop; touch scrolls natively)
       ====================================================================== */
    (function railDrag() {
      var rail = document.querySelector('.mh-rail');
      if (!rail || TOUCH) return;
      rail.classList.add('fx-grab');
      var down = false, startX = 0, startL = 0, lastX = 0, lastT = 0, vel = 0, tween = null;
      rail.addEventListener('pointerdown', function (e) {
        down = true; startX = e.clientX; startL = rail.scrollLeft;
        lastX = e.clientX; lastT = performance.now(); vel = 0;
        if (tween) tween.kill();
        rail.classList.add('fx-grabbing');
      });
      window.addEventListener('pointermove', function (e) {
        if (!down) return;
        rail.scrollLeft = startL - (e.clientX - startX);
        var t = performance.now();
        if (t - lastT > 16) { vel = (e.clientX - lastX) / (t - lastT); lastX = e.clientX; lastT = t; }
      }, { passive: true });
      window.addEventListener('pointerup', function () {
        if (!down) return;
        down = false;
        rail.classList.remove('fx-grabbing');
        var target = rail.scrollLeft - vel * 260;
        tween = g.to(rail, { scrollLeft: target, duration: 0.9, ease: 'power3.out' });
      });
      rail.addEventListener('click', function (e) {
        if (Math.abs(vel) > 0.25) { e.preventDefault(); e.stopPropagation(); } // flick ≠ click
      }, true);
    })();

    /* ======================================================================
       8) HEADER + BACK-TO-TOP — scroll state and progress ring
       ====================================================================== */
    var header = document.querySelector('.sa-header');
    if (header) {
      window.ScrollTrigger.create({
        start: 40, end: 999999,
        onToggle: function (self) { header.classList.toggle('fx-scrolled', self.isActive); }
      });
    }

    (function totopRing() {
      var top = document.querySelector('.sa-totop');
      if (!top) return;
      var ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      ring.setAttribute('class', 'fx-ring');
      ring.setAttribute('viewBox', '0 0 36 36');
      ring.setAttribute('aria-hidden', 'true');
      ring.innerHTML = '<circle class="fx-ring__track" cx="18" cy="18" r="16.5"/>' +
                       '<circle class="fx-ring__bar" cx="18" cy="18" r="16.5"/>';
      top.appendChild(ring);
      var bar = ring.querySelector('.fx-ring__bar');
      var C = 2 * Math.PI * 16.5;
      bar.style.strokeDasharray = C + '';
      bar.style.strokeDashoffset = C + '';
      var ticking = false;
      window.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          ticking = false;
          var max = document.documentElement.scrollHeight - window.innerHeight;
          var p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
          bar.style.strokeDashoffset = String(C * (1 - p));
        });
      }, { passive: true });
    })();

    /* ---- capture/debug helper (harmless in production) -------------------- */
    window.SA_FX = {
      finish: function () {
        try {
          g.globalTimeline.time(999);
          window.ScrollTrigger.getAll().forEach(function (st) {
            if (!st.animation) return;
            st.animation.progress(1);
          });
        } catch (e) {}
      }
    };
  });
})();
