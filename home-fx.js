/* home-fx.js v2 — the matchday experience layer for the HOME page only.
   ----------------------------------------------------------------------------
   Starts from the current homepage and makes the elevation unmistakable:

   • Boot handoff: the crest flies out as the overlay fades, straight into a
     char-by-char headline reveal. (Boot hold shortened in index.html.)
   • A living hero: Ken Burns drift, pointer pan, scroll parallax, volt embers.
   • Meaningful nav: solidifies on scroll, hides scrolling down, returns the
     moment you scroll up. Volt progress hairline along the top edge.
   • A custom cursor (dot + trailing ring) on fine pointers.
   • Distinct entrances per section: headings slide in and draw a volt
     underline, award cards flip up in 3D, rail cards sweep in, table rows
     cascade and the champions row flashes volt, the join band scales in.
   • Touchable everything: 3D tilt + cursor glare on cards, magnetic CTAs,
     shine sweeps (CSS), grab-and-flick results rail, count-up numbers,
     progress ring on back-to-top.

   Safety: prefers-reduced-motion → this file does nothing. GSAP CDN missing →
   this file does nothing (the page is the current live site). Existing layers
   (fx.js glow/tilt, hero-rotator, chart-anim) are respected; elements this
   file choreographs have their m-reveal classes removed so nothing animates
   twice.
   ---------------------------------------------------------------------------- */
(function () {
  'use strict';
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var TOUCH = window.matchMedia && window.matchMedia('(hover: none)').matches;
  var FINE = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  var MOBILE = window.matchMedia && window.matchMedia('(max-width: 760px)').matches;

  function ready(cb) {
    var t0 = Date.now();
    (function poll() {
      if (window.gsap && window.ScrollTrigger && document.querySelector('.cine__copy')) return cb();
      if (Date.now() - t0 > 9000) return; // CDN or render failed: current site stands
      requestAnimationFrame(poll);
    })();
  }

  ready(function () {
    var g = window.gsap;
    var ST = window.ScrollTrigger;
    g.registerPlugin(ST);
    var EXPO = 'expo.out';

    /* Take ownership: these elements animate HERE, not via m-reveal. */
    document.querySelectorAll('.mh-head.m-reveal, .mh-join.m-reveal').forEach(function (el) {
      el.classList.remove('m-reveal', 'is-in');
      el.style.animation = 'none';
      el.style.opacity = '';
    });

    /* ======================================================================
       1) HERO — char-split headline + full intro, handed off from the boot
       ====================================================================== */
    var copy = document.querySelector('.cine__copy');
    var photo = document.querySelector('.cine__photo img');
    var strip = document.querySelector('.cine__strip');
    var boot = document.getElementById('sa-boot');

    // Split the H1 into characters (elements like the volt "FC" survive).
    var chars = [];
    (function split() {
      var h1 = copy && copy.querySelector('h1');
      if (!h1) return;
      h1.setAttribute('aria-label', (h1.textContent || '').trim());
      (function walk(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (n) {
          if (n.nodeType === 3) {
            var frag = document.createDocumentFragment();
            n.textContent.split('').forEach(function (c) {
              if (c === ' ') { frag.appendChild(document.createTextNode(' ')); return; }
              var s = document.createElement('span');
              s.className = 'fx-ch';
              s.setAttribute('aria-hidden', 'true');
              s.textContent = c;
              frag.appendChild(s);
              chars.push(s);
            });
            node.replaceChild(frag, n);
          } else if (n.nodeType === 1) walk(n);
        });
      })(h1);
    })();

    var rest = copy ? Array.prototype.slice.call(copy.children).filter(function (el) { return !el.querySelector('.fx-ch'); }) : [];

    if (chars.length) g.set(chars, { yPercent: 118, rotation: 5, opacity: 0 });
    if (rest.length) g.set(rest, { opacity: 0, y: 30 });
    if (strip) g.set(strip, { opacity: 0, y: 26 });

    function heroIntro() {
      var tl = g.timeline({ defaults: { ease: EXPO } });
      if (photo) tl.fromTo(photo, { scale: 1.14 }, { scale: 1, duration: 2.8, ease: 'power2.out' }, 0);
      if (chars.length) tl.to(chars, { yPercent: 0, rotation: 0, opacity: 1, duration: 1.05, stagger: 0.035 }, 0.1);
      if (rest.length) tl.to(rest, { opacity: 1, y: 0, duration: 0.9, stagger: 0.1 }, 0.55);
      if (strip) tl.to(strip, { opacity: 1, y: 0, duration: 0.9 }, 0.95);
      tl.add(function () {
        ST.refresh();
        if (photo) { // perpetual Ken Burns drift once the intro settles
          g.to(photo, { scale: 1.06, xPercent: 1.4, duration: 14, ease: 'sine.inOut', yoyo: true, repeat: -1 });
        }
      });
    }

    if (boot && boot.parentNode) {
      var played = false;
      var fire = function () {
        if (played) return;
        played = true;
        var crest = boot.querySelector('.sa-crest'); // fly the crest out into the page
        if (crest) g.to(crest, { scale: 1.55, yPercent: -14, autoAlpha: 0, duration: 0.85, ease: 'power3.in' });
        heroIntro();
      };
      if (boot.classList.contains('sa-boot--hide')) fire();
      else new MutationObserver(function (m, mo) {
        if (boot.classList.contains('sa-boot--hide') || !boot.parentNode) { mo.disconnect(); fire(); }
      }).observe(boot, { attributes: true, attributeFilter: ['class'] });
      setTimeout(fire, 8000); // safety: never leave the hero hidden
    } else heroIntro();

    /* Scroll depth + pointer pan */
    if (photo) g.to(photo, { yPercent: 12, ease: 'none',
      scrollTrigger: { trigger: '.cine', start: 'top top', end: 'bottom top', scrub: 0.6 } });
    if (copy) g.to(copy, { yPercent: -7, opacity: 0.85, ease: 'none',
      scrollTrigger: { trigger: '.cine', start: 'top top', end: 'bottom top', scrub: 0.6 } });
    if (photo && !TOUCH) {
      var qx = g.quickTo(photo, 'x', { duration: 1, ease: 'power3' });
      var qy = g.quickTo(photo, 'y', { duration: 1, ease: 'power3' });
      window.addEventListener('pointermove', function (e) {
        qx((e.clientX / window.innerWidth - 0.5) * 22);
        qy((e.clientY / window.innerHeight - 0.5) * 12);
      }, { passive: true });
    }

    /* ======================================================================
       2) EMBERS — the cause, alive over the hero
       ====================================================================== */
    (function embers() {
      return; // volt-dot embers removed from the hero banner at the club's request
      var host = document.querySelector('.cine__photo');
      if (!host) return;
      var cv = document.createElement('canvas');
      cv.className = 'fx-embers'; cv.setAttribute('aria-hidden', 'true');
      host.parentNode.insertBefore(cv, host.nextSibling);
      var ctx = cv.getContext('2d');
      var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
      var N = MOBILE ? 60 : 170, P = [];
      function size() {
        var r = host.getBoundingClientRect();
        W = Math.max(1, r.width); H = Math.max(1, r.height);
        cv.width = W * DPR; cv.height = H * DPR;
        cv.style.width = W + 'px'; cv.style.height = H + 'px';
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      }
      function spawn(i, first) {
        P[i] = { x: Math.random() * W, y: first ? Math.random() * H : H + 10,
          r: 1.1 + Math.random() * 1.9, v: 0.2 + Math.random() * 0.65,
          d: (Math.random() - 0.5) * 0.3, a: 0.18 + Math.random() * 0.55,
          tw: 0.5 + Math.random() * 1.8, t: Math.random() * 6.28 };
      }
      size(); for (var i = 0; i < N; i++) spawn(i, true);
      new ResizeObserver(size).observe(host);
      var run = true, vis = true;
      new IntersectionObserver(function (es) { vis = es[0].isIntersecting; }, { threshold: 0.02 }).observe(host);
      document.addEventListener('visibilitychange', function () { run = !document.hidden; });
      (function draw() {
        requestAnimationFrame(draw);
        if (!run || !vis) return;
        ctx.clearRect(0, 0, W, H);
        for (var i = 0; i < N; i++) {
          var p = P[i];
          p.t += 0.016 * p.tw;
          p.y -= p.v; p.x += p.d + Math.sin(p.t * 0.6) * 0.12;
          if (p.y < -12 || p.x < -14 || p.x > W + 14) { spawn(i); continue; }
          var a = p.a * (0.5 + 0.5 * Math.sin(p.t));
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832);
          ctx.fillStyle = 'rgba(255, 106, 42,' + a.toFixed(3) + ')';
          ctx.shadowColor = 'rgba(255, 106, 42, 0.9)'; ctx.shadowBlur = 8;
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      })();
    })();

    /* ======================================================================
       3) NAV — solid on scroll, hide down / reveal up, progress hairline
       ====================================================================== */
    var header = document.querySelector('.sa-header');
    if (header) {
      var lastY = window.scrollY, navTick = false;
      window.addEventListener('scroll', function () {
        if (navTick) return; navTick = true;
        requestAnimationFrame(function () {
          navTick = false;
          var y = window.scrollY, dy = y - lastY; lastY = y;
          header.classList.toggle('fx-nav-solid', y > 80);
          if (y > 140 && dy > 4) header.classList.add('fx-nav-hide');
          else if (dy < -4 || y < 140) header.classList.remove('fx-nav-hide');
        });
      }, { passive: true });
    }
    (function progress() {
      var bar = document.createElement('div');
      bar.className = 'fx-progress'; bar.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bar);
      var tick = false;
      window.addEventListener('scroll', function () {
        if (tick) return; tick = true;
        requestAnimationFrame(function () {
          tick = false;
          var max = document.documentElement.scrollHeight - window.innerHeight;
          bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ')';
        });
      }, { passive: true });
    })();

    /* ======================================================================
       4) CURSOR — volt dot + trailing ring (fine pointers only)
       ====================================================================== */
    /* (Custom cursor removed at the club's request — normal mouse restored.) */

    /* ======================================================================
       5) SECTIONS — each arrives with its own signature
       ====================================================================== */
    // Headings: slide in from the left, then draw a volt underline.
    document.querySelectorAll('.mh-head').forEach(function (head) {
      var u = document.createElement('span');
      u.className = 'fx-underline'; u.setAttribute('aria-hidden', 'true');
      (head.querySelector('h1,h2,h3') || head).appendChild(u); // inside the title, not the flex row
      g.set(head, { opacity: 0, x: -44 });
      ST.create({
        trigger: head, start: 'top 86%', once: true,
        onEnter: function () {
          g.timeline()
            .to(head, { opacity: 1, x: 0, duration: 0.85, ease: EXPO })
            .to(u, { scaleX: 1, duration: 0.7, ease: EXPO }, '-=0.35');
        }
      });
    });

    function enter(sel, fromVars, toVars) {
      var els = document.querySelectorAll(sel);
      if (!els.length) return;
      g.set(els, fromVars);
      ST.batch(els, {
        start: 'top 88%', once: true,
        onEnter: function (batch) { g.to(batch, Object.assign({ duration: 1, ease: EXPO, stagger: 0.09 }, toVars)); }
      });
    }

    enter('.mh-ocamba > *', { opacity: 0, y: 26 }, { opacity: 1, y: 0 });

    /* ------------------------------------------------------------------
       AWARD WINNERS — 3D coverflow carousel (desktop). The focused card
       sits forward with a volt glow and pops toward you on hover; the
       rest recede in perspective. Drag, arrows, buttons or autoplay to
       move. On mobile (or if anything is missing) the grid stays and
       gets the flip-up entrance instead.
       ------------------------------------------------------------------ */
    function buildAwardsCarousel() {
      var grid = document.querySelector('.mp-grid.mp-g4');
      if (!grid) return null;
      var cards = Array.prototype.slice.call(grid.children);
      var n = cards.length;
      if (n < 3) return null;

      grid.classList.add('fx-car', 'fx-grab');
      // The legacy tilt layer (fx.js [data-tilt]) writes style.transform directly
      // and would fight the carousel's gsap transforms — that fight is visible
      // as shaking. Strip the attribute so exactly one system drives each card.
      cards.forEach(function (c) {
        c.removeAttribute('data-tilt');
        c.querySelectorAll('[data-tilt]').forEach(function (el) { el.removeAttribute('data-tilt'); });
      });
      var sec = grid.closest('.mh-sec'); if (sec) sec.classList.add('fx-car-section');
      grid.setAttribute('tabindex', '0');
      grid.setAttribute('role', 'region');
      grid.setAttribute('aria-roledescription', 'carousel');
      grid.setAttribute('aria-label', 'Award winners');

      var CW = Math.min(210, Math.round(window.innerWidth * 0.56));
      var STEP = MOBILE ? CW : 250, DEPTH = MOBILE ? 70 : 175, TURN = MOBILE ? -8 : -16, FADE = MOBILE ? 1 : 2;
      var cur = 0, entered = false, timer = null, dragging = false, dragMoved = 0;
      var count = null, dots = null;

      function off(i) { var d = (i - cur) % n; if (d > n / 2) d -= n; if (d < -n / 2) d += n; return d; }

      function layout(animate) {
        cards.forEach(function (card, i) {
          var o = off(i), a = Math.abs(o);
          card.classList.toggle('is-center', o === 0);
          card.style.zIndex = String(100 - a * 10);
          g[animate ? 'to' : 'set'](card, {
            xPercent: -50, x: o * STEP, z: -a * DEPTH, rotationY: o * TURN,
            scale: o === 0 ? (MOBILE ? 1.02 : 1.06) : 1 - a * (MOBILE ? 0.12 : 0.07),
            opacity: a > FADE ? 0 : (a === 0 ? 1 : (MOBILE ? 0.5 : 1 - a * 0.1)),
            duration: 1.05, ease: EXPO, overwrite: 'auto'
          });
        });
        if (count) count.textContent = (cur + 1) + ' / ' + n;
        if (dots) for (var di = 0; di < dots.children.length; di++) dots.children[di].classList.toggle('is-on', di === cur);
      }
      function go(i, user) { cur = ((i % n) + n) % n; layout(true); if (user) start(); }
      function next(user) { go(cur + 1, user); }
      function prev(user) { go(cur - 1, user); }

      // Prev / next + counter, slotted into the section heading row.
      var head = sec && sec.querySelector('.mh-head');
      if (head) {
        var nav = document.createElement('div');
        nav.className = 'fx-car-nav';
        var mk = function (dir, label, path) {
          var b = document.createElement('button');
          b.type = 'button'; b.className = 'fx-car-btn'; b.setAttribute('aria-label', label);
          b.innerHTML = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="' + path +
            '" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
          b.addEventListener('click', function () { dir > 0 ? next(true) : prev(true); });
          return b;
        };
        count = document.createElement('span'); count.className = 'fx-car-count';
        nav.appendChild(mk(-1, 'Previous award', 'M14 8H3M7 3.5 2.5 8 7 12.5'));
        nav.appendChild(count);
        nav.appendChild(mk(1, 'Next award', 'M2 8h11M9 3.5 13.5 8 9 12.5'));
        head.appendChild(nav);
      }

      // Dots — primary affordance on mobile (CSS reveals them under 760px).
      dots = document.createElement('div');
      dots.className = 'fx-car-dots';
      cards.forEach(function (c, i) {
        var d = document.createElement('button');
        d.type = 'button'; d.className = 'fx-car-dot';
        d.setAttribute('aria-label', 'Go to award ' + (i + 1));
        d.addEventListener('click', function () { go(i, true); });
        dots.appendChild(d);
      });
      grid.insertAdjacentElement('afterend', dots);

      // Autoplay: gentle, pauses while you look or focus.
      function start() { stop(); timer = setInterval(function () { if (!document.hidden && entered) next(false); }, 4600); }
      function stop() { if (timer) { clearInterval(timer); timer = null; } }
      grid.addEventListener('pointerenter', stop);
      grid.addEventListener('pointerleave', function () { if (!dragging) start(); });
      grid.addEventListener('focusin', stop);
      grid.addEventListener('focusout', function () { start(); });

      // Drag to move; a drag never counts as a click.
      var downX = 0;
      grid.addEventListener('pointerdown', function (e) { dragging = true; dragMoved = 0; downX = e.clientX; });
      window.addEventListener('pointermove', function (e) { if (dragging) dragMoved = e.clientX - downX; }, { passive: true });
      window.addEventListener('pointerup', function () {
        if (!dragging) return;
        dragging = false;
        if (dragMoved <= -55) next(true); else if (dragMoved >= 55) prev(true);
      });
      cards.forEach(function (card, i) {
        card.addEventListener('click', function (e) {
          if (Math.abs(dragMoved) > 12) { e.preventDefault(); e.stopPropagation(); return; }
          if (off(i) !== 0) { e.preventDefault(); e.stopPropagation(); go(i, true); } // side card: bring to front
        }, true);
        // Hover response is CSS-only (glow deepens, image brightens) — no
        // geometry changes under the pointer, so it cannot judder.
      });
      grid.addEventListener('pointerdown', function () { grid.classList.add('fx-grabbing'); });
      window.addEventListener('pointerup', function () { grid.classList.remove('fx-grabbing'); });
      grid.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); next(true); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); prev(true); }
      });

      // Entrance: the deck fans out of the void, then begins to turn.
      g.set(cards, { xPercent: -50, x: 0, z: -420, opacity: 0, scale: 0.7 });
      ST.create({
        trigger: grid, start: 'top 80%', once: true,
        onEnter: function () { entered = true; layout(true); start(); }
      });
      return true;
    }
    var CAR = buildAwardsCarousel();
    if (!CAR) enter('.mp-grid.mp-g4 > *',
      { opacity: 0, y: 64, rotationX: 16, transformPerspective: 900, transformOrigin: '50% 0%' },
      { opacity: 1, y: 0, rotationX: 0, ease: 'back.out(1.15)' });

    /* THE CAMPAIGN — the whole ledger POPS into the page: the hero card
       overshoots up, the win-rate ring punches to full size as the number
       lands (a triumphant arrival, not a flat stop), then the eight stat
       tiles cascade in with a springy overshoot. */
    (function campaignIn() {
      var ledger = document.querySelector('.mh-ledger');
      if (!ledger) { enter('.mh-ledger > *', { opacity: 0, y: 44, scale: 0.97 }, { opacity: 1, y: 0, scale: 1 }); return; }
      var hero = ledger.querySelector('.mh-ledger__hero');
      var tiles = ledger.querySelectorAll('.mh-ltile');
      var ring = ledger.querySelector('.mh-bigring');
      var pct = ledger.querySelector('.mh-bigring__pct');
      var chip = ledger.querySelector('.mh-ledger__hero .m-chip');
      if (hero) g.set(hero, { opacity: 0, y: 68, scale: 0.82, transformOrigin: '50% 64%' });
      if (tiles.length) g.set(tiles, { opacity: 0, y: 52, scale: 0.74, transformOrigin: '50% 100%' });
      if (ring) g.set(ring, { scale: 0.78, transformOrigin: '50% 50%' });
      if (pct) g.set(pct, { scale: 0.62, opacity: 0, transformOrigin: '50% 50%' });
      if (chip) g.set(chip, { opacity: 0, y: 16 });
      ST.create({
        trigger: ledger, start: 'top 82%', once: true,
        onEnter: function () {
          var tl = g.timeline();
          if (hero) tl.to(hero, { opacity: 1, y: 0, scale: 1, duration: 0.95, ease: 'back.out(1.7)' }, 0);
          if (ring) tl.to(ring, { scale: 1, duration: 1.1, ease: 'back.out(2.4)' }, 0.12);
          if (pct) tl.to(pct, { scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(3)' }, 0.48);
          if (chip) tl.to(chip, { opacity: 1, y: 0, duration: 0.5, ease: EXPO }, 0.62);
          if (tiles.length) tl.to(tiles, { opacity: 1, y: 0, scale: 1, duration: 0.72, ease: 'back.out(1.9)', stagger: 0.075 }, 0.28);
        }
      });
    })();
    enter('.mh-rail > *', { opacity: 0, x: 90 }, { opacity: 1, x: 0, stagger: 0.08 });
    enter('.mh-join > *', { opacity: 0, y: 30, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, ease: 'back.out(1.05)' });

    // Table rows cascade; then the champions row flashes volt once.
    (function tableIn() {
      var rows = document.querySelectorAll('.mh-table-wrap tbody tr');
      if (!rows.length) return;
      g.set(rows, { opacity: 0, y: 16 });
      ST.create({
        trigger: '.mh-table-wrap', start: 'top 85%', once: true,
        onEnter: function () {
          g.to(rows, {
            opacity: 1, y: 0, duration: 0.7, ease: EXPO, stagger: 0.06,
            onComplete: function () {
              g.fromTo(rows[0],
                { boxShadow: 'inset 0 0 0 0 rgba(255, 106, 42, 0)' },
                { boxShadow: 'inset 0 0 0 2px rgba(255, 106, 42, .85)', duration: 0.45, yoyo: true, repeat: 1, ease: 'power2.inOut' });
            }
          });
        }
      });
    })();

    /* ======================================================================
       6) TOUCHABLE CARDS — 3D tilt + glare (skips fx.js's own [data-tilt])
       ====================================================================== */
    if (!TOUCH) {
      // Carousel cards are gsap-positioned in 3D; tilt would fight them.
      var cards = document.querySelectorAll(CAR ? '.mh-rail > *' : '.mp-grid.mp-g4 > *, .mh-rail > *');
      cards.forEach(function (card) {
        if (card.hasAttribute('data-tilt')) return; // fx.js already owns it
        card.classList.add('fx-tilt');
        var setRX = g.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3' });
        var setRY = g.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3' });
        card.addEventListener('pointermove', function (e) {
          var r = card.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
          g.set(card, { transformPerspective: 800 });
          setRX(-(py - 0.5) * 9); setRY((px - 0.5) * 11);
          card.style.setProperty('--glx', (px * 100).toFixed(1) + '%');
          card.style.setProperty('--gly', (py * 100).toFixed(1) + '%');
        });
        card.addEventListener('pointerleave', function () { setRX(0); setRY(0); });
      });
    }

    /* ======================================================================
       7) MAGNETIC CTAs
       ====================================================================== */
    if (!TOUCH) {
      document.querySelectorAll('.cine__copy .m-btn, .sa-act .m-btn--volt, .mh-join .m-btn').forEach(function (btn) {
        var bx = g.quickTo(btn, 'x', { duration: 0.4, ease: 'power3' });
        var by = g.quickTo(btn, 'y', { duration: 0.4, ease: 'power3' });
        btn.addEventListener('pointermove', function (e) {
          var r = btn.getBoundingClientRect();
          bx((e.clientX - (r.left + r.width / 2)) * 0.2);
          by((e.clientY - (r.top + r.height / 2)) * 0.24);
        });
        btn.addEventListener('pointerleave', function () {
          g.to(btn, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.45)' });
        });
      });
    }

    /* ======================================================================
       8) RESULTS RAIL — grab, drag, flick
       ====================================================================== */
    (function railDrag() {
      var rail = document.querySelector('.mh-rail');
      if (!rail || TOUCH) return;
      rail.classList.add('fx-grab');
      var down = false, sx = 0, sl = 0, lx = 0, lt = 0, vel = 0, tween = null;
      rail.addEventListener('pointerdown', function (e) {
        down = true; sx = e.clientX; sl = rail.scrollLeft; lx = e.clientX; lt = performance.now(); vel = 0;
        if (tween) tween.kill();
        rail.classList.add('fx-grabbing');
      });
      window.addEventListener('pointermove', function (e) {
        if (!down) return;
        rail.scrollLeft = sl - (e.clientX - sx);
        var t = performance.now();
        if (t - lt > 16) { vel = (e.clientX - lx) / (t - lt); lx = e.clientX; lt = t; }
      }, { passive: true });
      window.addEventListener('pointerup', function () {
        if (!down) return;
        down = false; rail.classList.remove('fx-grabbing');
        tween = g.to(rail, { scrollLeft: rail.scrollLeft - vel * 280, duration: 0.9, ease: 'power3.out' });
      });
      rail.addEventListener('click', function (e) {
        if (Math.abs(vel) > 0.25) { e.preventDefault(); e.stopPropagation(); }
      }, true);
    })();

    /* ======================================================================
       9) NUMBERS + CHARTS + BACK-TO-TOP
       ====================================================================== */
    document.querySelectorAll('.m-wheel, .m-spark').forEach(function (el) {
      ST.create({
        trigger: el, start: 'top 85%', once: true,
        onEnter: function () {
          try { el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); } catch (e) {}
        }
      });
    });

    (function totopRing() {
      var top = document.querySelector('.sa-totop');
      if (!top) return;
      var ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      ring.setAttribute('class', 'fx-ring'); ring.setAttribute('viewBox', '0 0 36 36'); ring.setAttribute('aria-hidden', 'true');
      ring.innerHTML = '<circle class="fx-ring__track" cx="18" cy="18" r="16.5"/><circle class="fx-ring__bar" cx="18" cy="18" r="16.5"/>';
      top.appendChild(ring);
      var bar = ring.querySelector('.fx-ring__bar');
      var C = 2 * Math.PI * 16.5;
      bar.style.strokeDasharray = String(C);
      bar.style.strokeDashoffset = String(C);
      var tick = false;
      window.addEventListener('scroll', function () {
        if (tick) return; tick = true;
        requestAnimationFrame(function () {
          tick = false;
          var max = document.documentElement.scrollHeight - window.innerHeight;
          var p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
          bar.style.strokeDashoffset = String(C * (1 - p));
        });
      }, { passive: true });
    })();

    /* capture/debug helper (harmless in production) */
    window.SA_FX = {
      finish: function () {
        try {
          g.globalTimeline.time(999);
          ST.getAll().forEach(function (st) { if (st.animation) st.animation.progress(1); });
        } catch (e) {}
      }
    };
  });
})();
