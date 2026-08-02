/* ==========================================================================
   HOMEPAGE BEHAVIOUR
   Every one of these is an enhancement layered on markup that already reads
   without it: the rails are scroll-snap lists, the award stack is a set of
   real links, the charts are drawn by the generator and the FAQ is native
   <details>. With this file blocked the page loses motion, not content.
   ========================================================================== */
(function () {
  'use strict';
  /* Every page built on the home design needs this file, not just the
     homepage: the scroll reveal lives here, and `.rv` is hidden under
     html.js, so bailing out on a sub-page leaves its content invisible.
     The hero frame is homepage-only, so match the body class too. */
  if (!document.querySelector('.hx__frame, body.is-home')) return;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* A second handler for the hero dropdowns lived here and has been removed.
     It opened them on CLICK while the block below opens them on hover and on
     focus, and the two disagreed: hovering a group opened it, then the click
     that followed read the group as already open and closed it again, leaving
     the shared panel on screen with no group marked as its owner. It could
     not earn that cost either. `.hx__mainnav` is display:none below 920px, so
     the click path was reachable only on a desktop, where hovering already
     opens the menu, the trigger's own focus handler covers the keyboard, and
     CSS opens on :focus-within regardless. */

  /* ---- Motion navigation menu -----------------------------------------
     One shared panel serves every menu: it slides under the active trigger,
     animates its box to the new content's size, and the content slides in
     from the side you came from.

     Progressive, not required. The per-group panels above already open on
     hover and focus with no script; this only takes over once the panel has
     been built, which `is-vp` marks. A failure here leaves a working menu.

     Positions are measured from the nav, and the panel is clamped to the
     nav's box so a menu near the right edge cannot run off screen. */
  (function () {
    var nav = $('.hx__mainnav');
    if (!nav) return;
    var groups = $$('.hx__navgrp', nav);
    if (!groups.length) return;

    var mk = function (tag, cls) {
      var n = document.createElement(tag);
      n.className = cls;
      n.setAttribute('aria-hidden', 'true');
      return n;
    };
    var vp = mk("div", "hx__vp");
    var inner = mk("div", "hx__vp__in");
    vp.appendChild(inner);
    /* Off-screen twin: measuring the live box would report its mid-animation
       size, not the size it is heading for. */
    var measure = mk("div", "hx__vp__measure");
    var hl = mk("span", "hx__hl");
    nav.appendChild(vp);
    nav.appendChild(measure);
    nav.insertBefore(hl, nav.firstChild);

    var active = null;
    var closeTimer = null;

    var panelOf = function (g) { return $('.hx__dd', g); };
    var trigOf = function (g) { return $('.hx__navtrig', g); };

    var moveHighlight = function (el) {
      if (!el) { hl.style.opacity = '0'; return; }
      var nr = nav.getBoundingClientRect();
      var r = el.getBoundingClientRect();
      hl.style.opacity = '1';
      hl.style.width = r.width + 'px';
      hl.style.height = r.height + 'px';
      hl.style.transform = 'translate3d(' + (r.left - nr.left) + 'px,' + (r.top - nr.top) + 'px,0)';
    };

    var close = function () {
      active = null;
      nav.classList.remove('is-vp-open');
      vp.style.opacity = '0';
      vp.style.transform = vp.style.transform.replace(/scale\([^)]*\)/, '') + ' scale(0.96)';
      groups.forEach(function (g) {
        g.classList.remove('is-open');
        var t = trigOf(g); if (t) t.setAttribute('aria-expanded', 'false');
      });
      moveHighlight(null);
    };

    var open = function (g) {
      if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
      var panel = panelOf(g);
      if (!panel) return;
      var dir = active ? (groups.indexOf(g) > groups.indexOf(active) ? 1 : -1) : 1;
      active = g;

      groups.forEach(function (x) {
        var isOn = x === g;
        x.classList.toggle('is-open', isOn);
        var t = trigOf(x); if (t) t.setAttribute('aria-expanded', String(isOn));
      });

      measure.innerHTML = panel.innerHTML;
      var w = measure.offsetWidth, h = measure.offsetHeight;

      var nr = nav.getBoundingClientRect();
      var tr = trigOf(g).getBoundingClientRect();
      var centre = tr.left - nr.left + tr.width / 2;
      /* Keep the panel inside the nav's own width, with a small margin. */
      var half = w / 2, margin = 8;
      var x = Math.min(Math.max(centre, half + margin), nr.width - half - margin);
      /* Panel wider than the nav itself: centring it is the least bad option,
         and the clamp above would otherwise invert and pin it off to one side. */
      if (nr.width < w + margin * 2) x = nr.width / 2;

      inner.innerHTML = panel.innerHTML;
      /* The slide is a CSS animation, not a scripted opacity flip. Driving it
         from script meant the content sat at opacity 0 until a frame ran, so a
         throttled or backgrounded tab could open the panel empty. As an
         animation the resting state is visible and the movement is the extra,
         which is the right way round. Removing the class and forcing a reflow
         restarts it when you cross menus faster than it can finish. */
      inner.classList.remove('is-in-l', 'is-in-r');
      void inner.offsetWidth;
      inner.classList.add(dir > 0 ? 'is-in-r' : 'is-in-l');

      vp.style.width = w + 'px';
      vp.style.height = h + 'px';
      vp.style.opacity = '1';
      vp.style.transform = 'translate3d(' + (x - half) + 'px,0,0) scale(1)';

      nav.classList.add('is-vp-open');
      moveHighlight(trigOf(g));
    };

    groups.forEach(function (g) {
      var t = trigOf(g);
      if (!t) return;
      g.addEventListener('pointerenter', function () { open(g); });
      t.addEventListener('focus', function () { open(g); });
    });
    $$('.hx__navtop', nav).forEach(function (t) {
      if (t.classList.contains('hx__navtrig')) return;
      t.addEventListener('pointerenter', function () { close(); moveHighlight(t); });
    });

    nav.addEventListener('pointerleave', function () {
      closeTimer = setTimeout(close, 90);
    });
    vp.addEventListener('pointerenter', function () {
      if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
    });
    vp.addEventListener('pointerleave', function () { closeTimer = setTimeout(close, 90); });
    /* CSS also opens these on :focus-within, so Escape has to put focus back
       on the trigger before closing. Without that the panel is held open by
       focus sitting inside it and the key looks dead. */
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var inside = document.activeElement && document.activeElement.closest
        ? document.activeElement.closest('.hx__navgrp') : null;
      var t = inside && trigOf(inside);
      if (t) t.focus();
      close();
    });
    document.addEventListener('pointerdown', function (e) {
      if (!nav.contains(e.target) && !vp.contains(e.target)) close();
    });
    window.addEventListener('resize', function () {
      if (active) open(active); else moveHighlight(null);
    });

    /* Only now does the CSS hand over from the per-group panels. */
    nav.classList.add('is-vp');
  })();

  /* ---- Share ----------------------------------------------------------
     "Share the signs" is the one ask on the cause page that a link cannot
     satisfy. Uses the native share sheet where there is one, falls back to
     copying the URL, and if neither is available the anchor's href still
     jumps to the signs, so the control is never dead. */
  (function () {
    var btns = $$('[data-share]');
    if (!btns.length) return;
    btns.forEach(function (b) {
      b.addEventListener('click', function (e) {
        var url = location.origin + location.pathname + '#signs';
        var data = { title: document.title, text: 'The six signs of sepsis, and why they matter.', url: url };
        if (navigator.share) {
          e.preventDefault();
          navigator.share(data).catch(function () { /* dismissed, not an error */ });
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          e.preventDefault();
          navigator.clipboard.writeText(url).then(function () {
            var was = b.textContent;
            b.textContent = 'Link copied';
            setTimeout(function () { b.textContent = was; }, 1800);
          }, function () { /* fall through to the anchor */ });
        }
      });
    });
  })();

  /* ---- Mobile menu ---------------------------------------------------- */
  (function () {
    var burger = $('.hx__burger');
    var mnav = $('#mnav');
    if (!burger || !mnav) return;
    var last = null;
    var setMenu = function (open) {
      mnav.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
      if ('inert' in HTMLElement.prototype) mnav.inert = !open;
      if (open) {
        last = document.activeElement;
        var f = $('a, button', mnav);
        if (f) f.focus();
      } else if (last && last.focus) { last.focus(); }
    };
    if ('inert' in HTMLElement.prototype) mnav.inert = true;
    burger.addEventListener('click', function () {
      setMenu(burger.getAttribute('aria-expanded') !== 'true');
    });
    mnav.addEventListener('click', function (e) {
      if (e.target.closest('a') || e.target === mnav) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') setMenu(false);
    });
    /* Keep Tab inside the overlay while it is open. */
    mnav.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || !mnav.classList.contains('is-open')) return;
      var f = $$('a[href], button:not([disabled])', mnav);
      if (!f.length) return;
      var first = f[0], lastEl = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
    });
  })();

  /* ---- Countdown to kick-off ------------------------------------------
     The full date and time are already in the card, so this is decorative
     precision rather than the only source. It is deliberately not a live
     region: a value changing every second would flood a screen reader. */
  (function () {
    var cd = $('.hx__cd');
    if (!cd) return;
    var kick = new Date(cd.getAttribute('data-kick') || '').getTime();
    if (!kick || isNaN(kick)) { cd.textContent = 'TBC'; return; }
    var tick = function () {
      var left = kick - Date.now();
      if (left <= 0) { cd.textContent = 'Kick-off'; return; }
      var d = Math.floor(left / 86400000);
      var h = Math.floor(left / 3600000) % 24;
      var m = Math.floor(left / 60000) % 60;
      var s = Math.floor(left / 1000) % 60;
      cd.textContent = d + 'd ' + h + 'h ' + m + 'm ' + s + 's';
      setTimeout(tick, 1000);
    };
    tick();
  })();

  /* ---- News rail ------------------------------------------------------ */
  (function () {
    var rail = $('#nrail');
    if (!rail) return;
    var arrows = $$('.ncar__arrow');
    arrows.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = $('.ncard', rail);
        var w = card ? card.offsetWidth + 15 : 300;
        rail.scrollBy({ left: w * parseInt(btn.getAttribute('data-ndir'), 10), behavior: reduced ? 'auto' : 'smooth' });
      });
    });
    var sync = function () {
      var overflow = rail.scrollWidth - rail.clientWidth > 4;
      arrows.forEach(function (b) { b.hidden = !overflow; });
      /* Autoplay is pointless, and would jitter, when everything already fits. */
      if (!overflow) stop();
      else if (visible) start();
    };

    /* ---- Autoplay -------------------------------------------------------
       One card every 1.2s, out to the end then back rather than looping: a
       wrap-around needs a duplicated card set, and repeated headlines read as
       a bug to anyone reading the list rather than watching it.

       Yields to the reader (pointer, focus), runs only while on screen and
       the tab is in front, and reduced motion disables it outright. */
    var STEP_MS = 1200;
    var timer = null;
    var dir = 1;
    /* True by default: gating the start on an observer callback would mean
       no callback, no autoplay. Visibility only ever pauses. */
    var visible = true;
    var held = false;

    var step = function () {
      var card = $('.ncard', rail);
      var w = card ? card.offsetWidth + 15 : 300;
      var max = rail.scrollWidth - rail.clientWidth;
      if (max <= 4) return;
      /* Flip on arrival, so no step is wasted pushing against an end. */
      if (dir > 0 && rail.scrollLeft >= max - 4) dir = -1;
      else if (dir < 0 && rail.scrollLeft <= 4) dir = 1;
      rail.scrollBy({ left: w * dir, behavior: 'smooth' });
    };

    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
    }
    function start() {
      if (timer || reduced || held) return;
      if (rail.scrollWidth - rail.clientWidth <= 4) return;
      timer = setInterval(step, STEP_MS);
    }

    /* `held` outlives the pointer so a resize cannot restart it. */
    var hold = function () { held = true; stop(); };
    var release = function () { held = false; start(); };
    ['pointerenter', 'focusin'].forEach(function (e) { rail.addEventListener(e, hold); });
    ['pointerleave', 'focusout'].forEach(function (e) { rail.addEventListener(e, release); });
    arrows.forEach(function (btn) {
      btn.addEventListener('pointerenter', hold);
      btn.addEventListener('pointerleave', release);
      /* A manual step also sets the direction the autoplay resumes in. */
      btn.addEventListener('click', function () { dir = parseInt(btn.getAttribute('data-ndir'), 10); });
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });

    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) start(); else stop();
      }, { threshold: 0.25 }).observe(rail);
    }

    window.addEventListener('resize', sync);
    sync();
  })();

  /* ---- Award winners coverflow ---------------------------------------- */
  (function () {
    var stage = $('#cfStage');
    if (!stage) return;
    var cards = $$('.cf__card', stage);
    var n = cards.length;
    if (!n) return;
    var idxEl = $('#cfIdx');
    var dotsWrap = $('#cfDots');
    var active = Math.min(3, n - 1);
    var dots = [];

    var layout = function () {
      cards.forEach(function (card, i) {
        var o = i - active;
        var ao = Math.abs(o);
        var sign = o < 0 ? -1 : 1;
        var vis = ao <= 3;
        card.style.transform = 'translate(-50%, 0) translateX(' + (o * 40) + '%) translateZ(' + (-ao * 145) + 'px) rotateY(' + (-sign * Math.min(ao, 3) * 33) + 'deg) scale(' + Math.max(0.72, 1 - ao * 0.08) + ')';
        card.style.opacity = vis ? (1 - ao * 0.12) : 0;
        card.style.zIndex = String(100 - ao);
        card.style.pointerEvents = vis ? 'auto' : 'none';
        card.classList.toggle('is-active', o === 0);
        card.setAttribute('aria-hidden', o === 0 ? 'false' : 'true');
        var link = $('.cf__link', card);
        if (link) link.tabIndex = o === 0 ? 0 : -1;
      });
      if (idxEl) idxEl.textContent = String(active + 1);
      dots.forEach(function (dot, i) {
        dot.classList.toggle('is-on', i === active);
        dot.setAttribute('aria-selected', i === active ? 'true' : 'false');
      });
    };

    var timer = null, dir = 1;
    var stop = function () { if (timer) { clearInterval(timer); timer = null; } };
    var step = function () {
      if (active + dir > n - 1) dir = -1;
      else if (active + dir < 0) dir = 1;
      active += dir; layout();
    };
    var play = function () { if (!reduced && !timer) timer = setInterval(step, 1900); };
    var go = function (i) {
      active = Math.max(0, Math.min(n - 1, i));
      layout();
      if (timer) { stop(); play(); }
    };

    if (dotsWrap) {
      cards.forEach(function (c, i) {
        var dot = document.createElement('button');
        dot.className = 'cf__dot';
        dot.type = 'button';
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', 'Award ' + (i + 1) + ' of ' + n);
        dot.addEventListener('click', function () { go(i); });
        dotsWrap.appendChild(dot);
        dots.push(dot);
      });
    }

    var prev = $('.cf__nav--prev');
    var next = $('.cf__nav--next');
    if (prev) prev.addEventListener('click', function () { go(active - 1); });
    if (next) next.addEventListener('click', function () { go(active + 1); });

    cards.forEach(function (card, i) {
      card.addEventListener('click', function (e) {
        if (i !== active) { e.preventDefault(); go(i); }
      });
    });
    stage.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(active - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(active + 1); }
    });

    /* Real horizontal drags only, so a stray click never counts as a swipe. */
    var sx = null, sy = null;
    stage.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      sx = e.clientX; sy = e.clientY;
    });
    stage.addEventListener('pointerup', function (e) {
      if (sx === null) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      sx = sy = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(active + (dx < 0 ? 1 : -1));
    });

    stage.addEventListener('pointerenter', stop);
    stage.addEventListener('pointerleave', play);
    stage.addEventListener('focusin', stop);

    layout();
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (ents) {
        ents.forEach(function (en) { if (en.isIntersecting) play(); else stop(); });
      }, { threshold: 0.3 }).observe(stage);
    } else { play(); }
  })();

  /* ---- Campaign gauge -------------------------------------------------
     Radial ticks, lit up to the win rate. Drawn here rather than baked so the
     lighting sequence can run; the figure itself is already in the markup. */
  (function () {
    var svgs = $$('.cmp__gaugesvg');
    if (!svgs.length) return;
    var NS = 'http://www.w3.org/2000/svg';
    svgs.forEach(function (svg) {
      var pct = parseFloat(svg.getAttribute('data-gauge')) || 0;
      var cx = 100, cy = 112, r1 = 66, r2 = 88, N = 46;
      var onCount = Math.round(N * pct / 100);
      var lines = [];
      for (var i = 0; i <= N; i++) {
        var ang = Math.PI * (1 + i / N);
        var c = Math.cos(ang), s = Math.sin(ang);
        var ln = document.createElementNS(NS, 'line');
        ln.setAttribute('x1', (cx + r1 * c).toFixed(1));
        ln.setAttribute('y1', (cy + r1 * s).toFixed(1));
        ln.setAttribute('x2', (cx + r2 * c).toFixed(1));
        ln.setAttribute('y2', (cy + r2 * s).toFixed(1));
        ln.setAttribute('stroke-linecap', 'round');
        svg.appendChild(ln);
        lines.push(ln);
      }
      var light = function () {
        for (var i = 0; i <= onCount; i++) {
          if (reduced) lines[i].setAttribute('class', 'is-lit');
          else (function (ln, delay) {
            setTimeout(function () { ln.setAttribute('class', 'is-lit'); }, delay);
          })(lines[i], i * 22);
        }
      };
      if (reduced || !('IntersectionObserver' in window)) { light(); return; }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { light(); io.disconnect(); } });
      }, { threshold: 0.4 });
      io.observe(svg);
    });
  })();

  /* ---- Campaign number count-ups and glow sweep ------------------------ */
  (function () {
    var cmp = $('.cmp');
    if (!cmp) return;
    var ease = function (t) { return 1 - Math.pow(1 - t, 4); };

    if (!reduced && 'IntersectionObserver' in window) {
      var nums = $$('.cmp__num', cmp);
      var gauge = $('.cmp__gaugectr b', cmp);
      var animate = function (el, isGauge) {
        var node = isGauge ? el.firstChild : el;
        var m = String(node.textContent).match(/^([+\-]?)(\d+)(.*)$/);
        if (!m) return;
        var pre = m[1], target = parseInt(m[2], 10), suf = isGauge ? '' : (m[3] || '');
        var t0 = null;
        var set = function (v) { node.textContent = pre + v + suf; };
        set(0);
        var frame = function (ts) {
          if (!t0) t0 = ts;
          var p = Math.min((ts - t0) / 1150, 1);
          set(Math.round(ease(p) * target));
          if (p < 1) requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      };
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          nums.forEach(function (el) { animate(el, false); });
          if (gauge) animate(gauge, true);
          io.disconnect();
        });
      }, { threshold: 0.35 });
      io.observe(cmp);
    }

    var cards = $$('.cmp__card', cmp);
    if (!cards.length) return;
    if (window.matchMedia && window.matchMedia('(hover: hover)').matches) {
      cards.forEach(function (card) {
        card.addEventListener('pointermove', function (e) {
          var r = card.getBoundingClientRect();
          card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
          card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
        });
      });
    }
    if (reduced) return;
    var idx = -1, paused = false, timer = null;
    var clearAll = function () { cards.forEach(function (c) { c.classList.remove('is-active'); }); };
    var sweep = function () {
      if (paused) return;
      clearAll();
      idx = (idx + 1) % cards.length;
      var c = cards[idx];
      c.style.setProperty('--mx', '50%');
      c.style.setProperty('--my', '46%');
      c.classList.add('is-active');
    };
    cmp.addEventListener('pointerenter', function () { paused = true; clearAll(); });
    cmp.addEventListener('pointerleave', function () { paused = false; });
    var start = function () { if (!timer) { sweep(); timer = setInterval(sweep, 2500); } };
    var halt = function () { if (timer) { clearInterval(timer); timer = null; } clearAll(); idx = -1; };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (ents) {
        ents.forEach(function (en) { if (en.isIntersecting) start(); else halt(); });
      }, { threshold: 0.25 }).observe(cmp);
    } else { start(); }
  })();

  /* ---- Results rail progress ------------------------------------------ */
  (function () {
    var rail = $('#rlRail');
    var fill = $('#rlFill');
    if (!rail || !fill) return;
    var sync = function () {
      var max = rail.scrollWidth - rail.clientWidth;
      var p = max > 0 ? (rail.scrollLeft / max) * 100 : 100;
      fill.style.setProperty('--progress', Math.max(6, p) + '%');
    };
    rail.addEventListener('scroll', sync, { passive: true });
    rail.addEventListener('keydown', function (e) {
      var card = $('.rcard2', rail);
      var w = card ? card.offsetWidth + 16 : 320;
      if (e.key === 'ArrowRight') { e.preventDefault(); rail.scrollBy({ left: w, behavior: reduced ? 'auto' : 'smooth' }); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); rail.scrollBy({ left: -w, behavior: reduced ? 'auto' : 'smooth' }); }
    });
    window.addEventListener('resize', sync);
    sync();
  })();

  /* ---- League table reveal and points count-up ------------------------- */
  (function () {
    var tbl = $('#tbl');
    if (!tbl) return;
    var pts = $$('.tbl__pts[data-pts]', tbl);
    var countPts = function () {
      var ease = function (t) { return 1 - Math.pow(1 - t, 4); };
      pts.forEach(function (el) {
        var target = parseInt(el.getAttribute('data-pts'), 10) || 0;
        var t0 = null;
        el.textContent = '0';
        var frame = function (ts) {
          if (!t0) t0 = ts;
          var p = Math.min((ts - t0) / 950, 1);
          el.textContent = String(Math.round(ease(p) * target));
          if (p < 1) requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
    };
    if (reduced || !('IntersectionObserver' in window)) { tbl.classList.add('is-in'); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { tbl.classList.add('is-in'); countPts(); io.disconnect(); }
      });
    }, { threshold: 0.25 });
    io.observe(tbl);
  })();

  /* ---- Player of the Month tabs (awards page) -------------------------
     The markup ships as jump links over four visible panels, which is what a
     reader gets with this file blocked. Here they are promoted to a real
     tablist: roles applied, arrow keys wired, and the panels other than the
     active one hidden. Nothing is hidden until this runs. */
  (function () {
    var tabs = $$('[data-potm-tab]');
    if (tabs.length < 2) return;
    var panels = $$('[data-potm-panel]');
    if (panels.length !== tabs.length) return;
    var list = tabs[0].parentNode;

    list.setAttribute('role', 'tablist');
    list.setAttribute('aria-label', 'Player of the Month by month');

    var select = function (i, focus) {
      tabs.forEach(function (t, n) {
        var on = n === i;
        t.classList.toggle('is-on', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach(function (p, n) { p.hidden = n !== i; });
      if (focus) tabs[i].focus();
    };

    tabs.forEach(function (t, i) {
      t.setAttribute('role', 'tab');
      t.setAttribute('aria-controls', panels[i].id);
      panels[i].setAttribute('role', 'tabpanel');
      panels[i].setAttribute('aria-labelledby', t.id || (t.id = 'potm-t-' + i));
      panels[i].tabIndex = 0;
      t.addEventListener('click', function (e) { e.preventDefault(); select(i); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, next = null;
        if (k === 'ArrowRight' || k === 'ArrowDown') next = (i + 1) % tabs.length;
        else if (k === 'ArrowLeft' || k === 'ArrowUp') next = (i - 1 + tabs.length) % tabs.length;
        else if (k === 'Home') next = 0;
        else if (k === 'End') next = tabs.length - 1;
        if (next === null) return;
        e.preventDefault();
        select(next, true);
      });
    });

    /* Deep links such as /awards.html#potm-p-2 still land on their panel. */
    var want = panels.map(function (p) { return '#' + p.id; }).indexOf(window.location.hash);
    select(want > -1 ? want : 0);
  })();

  /* ---- Squad position filter ------------------------------------------
     The chips ship as jump links to the position headings, which is what a
     reader gets with this file blocked. Here they become filters: roles
     applied, and every group except the chosen one hidden. Nothing is hidden
     until this runs, and the hidden state is scoped to html.js in CSS. */
  (function () {
    var scopes = $$('[data-filter-scope]');
    if (!scopes.length) return;
    scopes.forEach(function (bar) {
      var chips = $$('.sq-chip', bar);
      if (chips.length < 2) return;
      var band = bar.parentNode;
      var groups = $$('.sq-grp', band);
      if (!groups.length) return;

      bar.setAttribute('role', 'tablist');
      bar.setAttribute('aria-label', 'Filter the squad by position');

      var apply = function (want, focus) {
        chips.forEach(function (c) {
          var on = (c.getAttribute('data-group-pick') || (c.hasAttribute('data-group-all') ? '' : null)) === want;
          c.classList.toggle('is-on', on);
          c.setAttribute('aria-selected', on ? 'true' : 'false');
          c.tabIndex = on ? 0 : -1;
          if (on && focus) c.focus();
        });
        groups.forEach(function (g) {
          g.hidden = want !== '' && g.getAttribute('data-group') !== want;
        });
      };

      chips.forEach(function (c, i) {
        c.setAttribute('role', 'tab');
        c.addEventListener('click', function (e) {
          e.preventDefault();
          apply(c.getAttribute('data-group-pick') || '');
        });
        c.addEventListener('keydown', function (e) {
          var next = null;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % chips.length;
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + chips.length) % chips.length;
          else if (e.key === 'Home') next = 0;
          else if (e.key === 'End') next = chips.length - 1;
          if (next === null) return;
          e.preventDefault();
          apply(chips[next].getAttribute('data-group-pick') || '', true);
        });
      });

      apply('');
    });
  })();

  /* ---- Player profile motion ------------------------------------------
     Three enhancements, all additive. Every figure already sits in the markup
     at its final value and every bar already has its width, so with this
     blocked the page is complete and merely still.

       1. Figures tick up to the value already printed in them, on reveal and
          again when the reader points at the tile.
       2. The cumulative line draws along its own length, which has to be
          measured here: a polyline's length is not knowable at build time.
       3. Tiles get an index so their rings sweep in one after another. */
  (function () {
    var tiles = $$('.pf-tiles');
    var plot = $('.pf-plot');
    var counters = $$('[data-count]');
    if (!tiles.length && !plot && !counters.length) return;

    tiles.forEach(function (list) {
      $$('.pf-stat', list).forEach(function (el, i) { el.style.setProperty('--i', i); });
    });

    if (plot) {
      var line = $('.pf-plot__line', plot);
      if (line && line.getTotalLength) {
        var len = Math.ceil(line.getTotalLength());
        line.style.setProperty('--len', len);
        line.setAttribute('data-len', len);
      }
    }

    /* Only the numeric part is animated, so "86%" and "1st" keep their suffix
       and "0.86" keeps its decimals. Anything with no digits is left alone. */
    var tick = function (el) {
      if (reduced || el.dataset.running) return;
      var target = el.getAttribute('data-count') || '';
      var m = target.match(/-?\d+(\.\d+)?/);
      if (!m) return;
      var end = parseFloat(m[0]);
      var dp = (m[1] || '').length ? m[1].length - 1 : 0;
      var before = target.slice(0, m.index);
      var after = target.slice(m.index + m[0].length);
      el.dataset.running = '1';
      var t0 = null;
      var frame = function (ts) {
        if (!t0) t0 = ts;
        var t = Math.min((ts - t0) / 900, 1);
        var eased = 1 - Math.pow(1 - t, 4);
        el.textContent = before + (end * eased).toFixed(dp) + after;
        if (t < 1) requestAnimationFrame(frame);
        else { el.textContent = target; delete el.dataset.running; }
      };
      requestAnimationFrame(frame);
    };

    /* Shared so the season tabs can tick a panel that was hidden when the
       observer first ran. */
    window.saTick = tick;

    counters.forEach(function (el) {
      var host = el.closest('.pf-stat') || el.closest('.pf-bar') || el.closest('li');
      if (host) host.addEventListener('mouseenter', function () { tick(el); });
    });

    if (reduced || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        $$('[data-count]', en.target).forEach(tick);
        io.unobserve(en.target);
      });
    }, { threshold: 0.3 });
    $$('.pf-tiles, .pf-ranks, .pf-bars, .pf-vs').forEach(function (el) { io.observe(el); });
  })();

  /* ---- Season tabs (player profile) -----------------------------------
     Jump links over panels that all ship visible, promoted here to a real
     tablist. Nothing is hidden until this runs. */
  (function () {
    var bar = $('[data-season-tabs]');
    if (!bar) return;
    var tabs = $$('[data-season-tab]', bar);
    var panels = $$('[data-season-panel]');
    if (tabs.length < 2 || panels.length !== tabs.length) return;

    bar.setAttribute('role', 'tablist');
    bar.setAttribute('aria-label', 'Season');

    var select = function (i, focus) {
      tabs.forEach(function (t, n) {
        var on = n === i;
        t.classList.toggle('is-on', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach(function (pnl, n) { pnl.hidden = n !== i; });
      if (focus) tabs[i].focus();
      /* A panel revealed after first paint never met the observer, so its
         bars would sit at zero. Reveal whatever is now on screen. */
      $$('.rv', panels[i]).forEach(function (el) { el.classList.add('is-in'); });
      $$('[data-count]', panels[i]).forEach(function (el) {
        if (window.saTick) window.saTick(el);
      });
    };

    tabs.forEach(function (t, i) {
      t.setAttribute('role', 'tab');
      t.setAttribute('aria-controls', panels[i].id);
      panels[i].setAttribute('role', 'tabpanel');
      panels[i].setAttribute('aria-labelledby', t.id || (t.id = 'pf-tab-' + i));
      t.addEventListener('click', function (e) { e.preventDefault(); select(i); });
      t.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = tabs.length - 1;
        if (next === null) return;
        e.preventDefault();
        select(next, true);
      });
    });

    /* Open on the most recent season that actually has matches, not simply
       the last tab: landing a player on an empty season would be a page that
       looks like it has nothing on it. */
    var withPlay = tabs.map(function (t) { return !/not started/i.test(t.textContent); });
    var start = withPlay.lastIndexOf(true);
    select(start > -1 ? start : 0);
  })();

  /* ---- Scrubable plot -------------------------------------------------
     The line already tells the shape of a season. This says which match each
     step was. Every point is also a row in the list below the chart, so the
     readout is a convenience and never the only route to the information. */
  (function () {
    var plots = $$('[data-plot]');
    if (!plots.length) return;
    plots.forEach(function (fig) {
      var svg = $('svg', fig);
      var cross = $('.pf-plot__cross', fig);
      var cap = $('[data-readout]', fig);
      var pts = $$('.pf-plot__pt', fig);
      if (!svg || !pts.length || !cap) return;
      var rest = cap.innerHTML;
      var active = null;

      var show = function (pt) {
        if (pt === active) return;
        active = pt;
        pts.forEach(function (o) { o.classList.toggle('is-on', o === pt); });
        cross.setAttribute('x1', pt.getAttribute('data-x'));
        cross.setAttribute('x2', pt.getAttribute('data-x'));
        cross.setAttribute('opacity', '1');
        cap.classList.add('is-live');
        cap.innerHTML = '<span class="pf-plot__lo">' + pt.getAttribute('data-date') + '</span>'
          + '<b>' + pt.getAttribute('data-club') + ' ' + pt.getAttribute('data-score') + '</b>'
          + '<span class="pf-plot__hi">' + pt.getAttribute('data-made')
          + ' · ' + pt.getAttribute('data-total') + ' total</span>';
      };

      var clear = function () {
        active = null;
        pts.forEach(function (o) { o.classList.remove('is-on'); });
        cross.setAttribute('opacity', '0');
        cap.classList.remove('is-live');
        cap.innerHTML = rest;
      };

      /* Nearest point by x in the SVG's own coordinate space, so the pointer
         never has to find a nine-pixel target. */
      var pick = function (clientX) {
        var box = svg.getBoundingClientRect();
        if (!box.width) return;
        var vb = svg.viewBox.baseVal;
        var x = ((clientX - box.left) / box.width) * vb.width;
        var best = null, bestD = Infinity;
        pts.forEach(function (o) {
          var dx = Math.abs(parseFloat(o.getAttribute('data-x')) - x);
          if (dx < bestD) { bestD = dx; best = o; }
        });
        if (best) show(best);
      };

      /* A mouse reads this by moving over it. A finger cannot: a tap fires
         pointermove then pointerleave within the same gesture, so the reading
         appeared and vanished before it could be read, which is the same as
         the chart having no readout at all on a phone.

         So the two pointers are handled as the different things they are. A
         mouse scrubs on move and the readout goes when it leaves. A finger
         takes a reading on touch down, scrubs while it stays down, and the
         reading STAYS when it lifts, because taking it is the whole point.
         Tapping anywhere else on the page puts the chart back. */
      var dragging = false;

      svg.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse') return;
        dragging = true;
        pick(e.clientX);
      });
      svg.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'mouse' || dragging) pick(e.clientX);
      });
      /* pointercancel is what fires when the browser decides the gesture was
         a vertical scroll after all (touch-action: pan-y in the stylesheet).
         Without this the chart would keep scrubbing as the page moved. */
      ['pointerup', 'pointercancel'].forEach(function (ev) {
        svg.addEventListener(ev, function () { dragging = false; });
      });
      svg.addEventListener('pointerleave', function (e) {
        if (e.pointerType === 'mouse') clear();
      });
      document.addEventListener('pointerdown', function (e) {
        if (!fig.contains(e.target)) clear();
      });
    });
  })();

  /* ---- Card tilt -------------------------------------------------------
     Two custom properties, normalised to -1..1 from the pointer's position in
     the card. CSS does the rest, so this stays a handful of property writes
     per frame rather than a layout recalculation. Skipped entirely for
     reduced motion and for anything without a fine pointer. */
  (function () {
    var cards = $$('[data-tilt]');
    if (!cards.length || reduced) return;
    if (window.matchMedia && !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    cards.forEach(function (card) {
      var raf = null, nx = 0, ny = 0;
      var write = function () {
        raf = null;
        card.style.setProperty('--rx', nx.toFixed(3));
        card.style.setProperty('--ry', ny.toFixed(3));
      };
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        if (!r.width || !r.height) return;
        nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
        card.classList.add('is-tilting');
        if (!raf) raf = requestAnimationFrame(write);
      });
      card.addEventListener('pointerleave', function () {
        card.classList.remove('is-tilting');
        card.style.setProperty('--rx', '0');
        card.style.setProperty('--ry', '0');
      });
    });
  })();

  /* ---- Position picker (player profile) -------------------------------
     Opening a position in the list picks that spot out on the pitch beside
     it, so the "where" and the "which games" answer each other. Pure class
     toggling on top of a native <details>: with this blocked the list still
     opens and the map still reads, it simply does not respond. */
  (function () {
    var rows = $$('.pf-pos');
    if (!rows.length) return;
    var grid = $('.pf-pitch__grid');
    var svg = grid && $('svg', grid);
    if (!grid || !svg) return;

    var clear = function () {
      grid.classList.remove('is-picking');
      $$('[data-pos]', svg).forEach(function (el) { el.classList.remove('is-picked'); });
    };

    rows.forEach(function (row) {
      row.addEventListener('toggle', function () {
        /* A close fires AFTER the open that caused it, so clearing here
           unconditionally wiped the highlight the newly opened row had just
           set. Only clear once nothing at all is open. */
        if (!row.open) {
          if (!rows.some(function (o) { return o.open; })) clear();
          return;
        }
        /* One at a time: two open panels would ask the map to highlight two
           places and it would just look broken. */
        rows.forEach(function (o) { if (o !== row) o.open = false; });
        clear();
        var code = row.getAttribute('data-pos');
        grid.classList.add('is-picking');
        $$('[data-pos="' + code + '"]', svg).forEach(function (el) { el.classList.add('is-picked'); });
      });
    });
  })();

  /* ---- Player stats: sort and competition filter -----------------------
     Both are rewrites of a table that already ships complete and correct.
     Every row carries its own figures for every competition, so switching
     competition swaps the cells in place rather than fetching anything, and
     with this blocked the reader still gets the full all-competitions table
     in document order. */
  (function () {
    var table = $('[data-stats-table]');
    if (!table) return;
    var tbody = $('tbody', table);
    var rows = $$('tr', tbody);
    if (!rows.length) return;

    /* Column 0 and 1 are rank and name; the figure columns start at 2 and
       map onto the array stored on each row. */
    var heads = $$('thead th[data-sort]', table);
    var chips = $$('[data-comp-chips] .st-chip');
    var empty = $('[data-stats-empty]');
    var seasonTabs = $$('[data-season-chips] .st-season');
    var modes = $$('[data-mode-switch] .st-mode__b');
    var search = $('[data-player-search]');
    var comp = 'all';
    var season = 'all';
    var mode = 'total';
    var query = '';
    var sortCol = null, desc = true;

    var onDefault = seasonTabs.filter(function (t) { return t.classList.contains('is-on'); })[0];
    if (onDefault) season = onDefault.getAttribute('data-season');

    var figs = function (row) {
      try {
        var all = JSON.parse(row.getAttribute('data-figures'));
        return (all[season] || all.all || {})[comp] || [];
      } catch (e) { return []; }
    };

    /* Rates, not totals. A raw count rewards whoever played most; per start
       is the honest way to compare a regular with somebody who came in for
       six games. Starts and bench stay counts, because a rate of a count
       against itself says nothing. */
    var RATE = [false, false, true, true, true, true, true];
    var shown = function (f, i) {
      var v = f[i] || 0;
      if (mode !== 'rate' || !RATE[i]) return v;
      var st = f[0] || 0;
      return st ? (v / st).toFixed(2) : '0.00';
    };

    /* The bar is scaled against the largest G+A in the CURRENT view, so
       switching to a single cup re-scales rather than leaving every bar a
       stub measured against a season total. */
    var paint = function () {
      var max = 0;
      rows.forEach(function (r) { max = Math.max(max, parseFloat(shown(figs(r), 4)) || 0); });
      if (!max) max = 1;
      var any = false;
      rows.forEach(function (row) {
        var f = figs(row);
        var cells = $$('td', row);
        for (var i = 0; i < heads.length; i++) {
          var cell = cells[i + 1];
          if (!cell) continue;
          var b = $('b', cell);
          var v = shown(f, i);
          if (b) b.textContent = v; else cell.textContent = v;
        }
        var bar = $('.st-tbl__bar i', row);
        if (bar) bar.style.setProperty('--w',
          Math.round(((parseFloat(shown(f, 4)) || 0) / max) * 100) + '%');
        var featured = (f[0] || 0) + (f[1] || 0) > 0;
        var name = (row.getAttribute('data-name') || '');
        var matches = !query || name.indexOf(query) > -1;
        row.hidden = !featured || !matches;
        if (!row.hidden) any = true;
      });
      var n = 0;
      rows.forEach(function (r) {
        if (r.hidden) return;
        n++;
        var pos = $('.st-tbl__pos', r);
        if (pos) pos.textContent = n;
      });
      if (empty) {
        empty.hidden = any;
        /* Say WHY there is nothing here. "No player matches that filter" is
           wrong for a season that has not kicked off, and reads as a broken
           table rather than as an empty one. */
        var msg = $('[data-empty-msg]', empty);
        if (msg && !any) {
          var tab = seasonTabs.filter(function (t) { return t.classList.contains('is-on'); })[0];
          var notStarted = tab && /not started/i.test(tab.textContent);
          msg.textContent = query ? 'No player found for “' + search.value.trim() + '”.'
            : notStarted ? 'No matches played in ' + season + ' yet. This fills in as results come in.'
              : 'Nobody featured in this competition.';
        }
      }
      table.classList.toggle('is-rate', mode === 'rate');
    };

    /* FLIP: measure where every row is, reorder, then play each one back from
       where it was. Without it a sort is an instant scramble and you cannot
       see who moved, which is half of what a sort is for. */
    var reorder = function (sorted) {
      if (reduced) { sorted.forEach(function (r) { tbody.appendChild(r); }); rows = sorted; return; }
      var before = new Map();
      rows.forEach(function (r) { before.set(r, r.getBoundingClientRect().top); });
      sorted.forEach(function (r) { tbody.appendChild(r); });
      rows = sorted;
      sorted.forEach(function (r) {
        var from = before.get(r);
        if (from === undefined) return;
        var delta = from - r.getBoundingClientRect().top;
        if (!delta) return;
        r.animate(
          [{ transform: 'translateY(' + delta + 'px)' }, { transform: 'none' }],
          { duration: 420, easing: 'cubic-bezier(0.19, 1, 0.22, 1)' }
        );
      });
    };

    /* Reordering is separate from deciding the order, so a competition
       switch can re-apply the SAME column and direction. Folding the two
       together meant switching competition silently jumped the sort back to
       the first column. */
    var applySort = function (idx, down) {
      var sorted = rows.slice().sort(function (a, b) {
        var av = figs(a)[idx] || 0, bv = figs(b)[idx] || 0;
        if (av === bv) return (figs(b)[4] || 0) - (figs(a)[4] || 0);
        return down ? bv - av : av - bv;
      });
      reorder(sorted);
      heads.forEach(function (h, i) {
        h.setAttribute('aria-sort', i === idx ? (down ? 'descending' : 'ascending') : 'none');
      });
      paint();
    };

    var sortBy = function (idx) {
      if (sortCol === idx) desc = !desc; else { sortCol = idx; desc = true; }
      applySort(sortCol, desc);
    };

    /* The control goes INSIDE the header cell, injected here so no dead
       button ships to a reader without this script. role="button" on the
       <th> itself would have overwritten its columnheader role, which is the
       only role aria-sort is allowed on. */
    heads.forEach(function (h, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      while (h.firstChild) btn.appendChild(h.firstChild);
      h.appendChild(btn);
      btn.addEventListener('click', function () { sortBy(i); });
    });

    chips.forEach(function (chip) {
      chip.addEventListener('click', function (e) {
        e.preventDefault();
        comp = chip.getAttribute('data-comp') || 'all';
        chips.forEach(function (c) {
          var on = c === chip;
          c.classList.toggle('is-on', on);
          c.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        table.setAttribute('aria-label', 'Player statistics, ' + chip.textContent.trim());
        /* Re-sort on the new competition's numbers, keeping the column and
           direction the reader chose, or the order would still reflect the
           competition it just left. */
        if (sortCol !== null) applySort(sortCol, desc);
        else paint();
      });
      /* A link cannot be pressed. Once these filter a table in place rather
         than navigating, they are buttons, and aria-pressed is only valid
         once that role is set. */
      chip.setAttribute('role', 'button');
      chip.setAttribute('aria-pressed', chip.classList.contains('is-on') ? 'true' : 'false');
    });

    var refresh = function () {
      if (sortCol !== null) applySort(sortCol, desc); else paint();
    };

    /* THE LEADERS FOLLOW THE TAB.
       The band above this table names the top scorer, the most assists and
       the most clean sheets, and it used to be worked out from every match
       the club has ever played whichever season was selected, under a
       heading that said "The season's leaders". The generator now writes one
       panel per view and this shows the matching one, so the two halves of
       the page agree. The rail's count of players used moves with it. */
    var leaderBand = $('[data-leader-views]');
    var shareBand = $('[data-share-views]');
    var heroSeason = $('[data-hero-season]');
    var heroTally = $('[data-hero-tally]');

    /* Show the one panel belonging to this view and hide the rest. A panel
       first revealed here never met the scroll observer, so it would sit at
       the reveal's starting opacity forever: is-in is what stops that. */
    var showPanel = function (band, attrName, view) {
      if (!band || !view) return null;
      var live = null;
      $$('[' + attrName + ']', band).forEach(function (p) {
        var on = p.getAttribute(attrName) === view;
        p.hidden = !on;
        if (on) { live = p; p.classList.add('is-in'); }
      });
      return live;
    };

    var showLeaders = function (view) {
      var live = showPanel(leaderBand, 'data-leader-view', view);
      if (!live) return;
      var head = $('[data-leader-heading]', leaderBand);
      if (head) head.textContent = live.getAttribute('data-heading') || '';
      var used = $('.xrail__r', leaderBand);
      if (used) {
        var n = live.getAttribute('data-players-used') || '0';
        used.textContent = n + ' player' + (n === '1' ? '' : 's') + ' used';
      }
    };

    /* "Who scored them" counted every goal the club has ever scored, under a
       heading sitting directly below tabs that said 25/26 and 26/27. */
    var showShare = function (view) {
      var live = showPanel(shareBand, 'data-share-view', view);
      if (!live) return;
      var n = live.getAttribute('data-scorers') || '0';
      var ref = $('.xrail__r', shareBand);
      if (ref) ref.textContent = n + ' scorer' + (n === '1' ? '' : 's');
    };

    /* The hero said "By the numbers · 25/26" over the club's career totals,
       which is two claims about different things sitting side by side. */
    var showHero = function (view, label) {
      if (heroSeason && label) heroSeason.textContent = label;
      if (!heroTally) return;
      var raw = heroTally.getAttribute('data-tally-' + view);
      if (!raw) return;
      var v = raw.split(',');
      $$('dd', heroTally).forEach(function (dd, i) { if (v[i] !== undefined) dd.textContent = v[i]; });
    };

    seasonTabs.forEach(function (tab) {
      tab.setAttribute('role', 'button');
      tab.setAttribute('aria-pressed', tab.classList.contains('is-on') ? 'true' : 'false');
      tab.addEventListener('click', function (e) {
        e.preventDefault();
        season = tab.getAttribute('data-season');
        seasonTabs.forEach(function (t) {
          var on = t === tab;
          t.classList.toggle('is-on', on);
          t.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        var view = tab.getAttribute('data-view');
        showLeaders(view);
        showShare(view);
        showHero(view, ($('b', tab) || {}).textContent);
        refresh();
      });
    });
    if (onDefault) {
      var v0 = onDefault.getAttribute('data-view');
      showLeaders(v0);
      showShare(v0);
      showHero(v0, ($('b', onDefault) || {}).textContent);
    }

    modes.forEach(function (m) {
      m.setAttribute('role', 'button');
      m.setAttribute('aria-pressed', m.classList.contains('is-on') ? 'true' : 'false');
      m.addEventListener('click', function (e) {
        e.preventDefault();
        mode = m.getAttribute('data-mode');
        modes.forEach(function (o) {
          var on = o === m;
          o.classList.toggle('is-on', on);
          o.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        refresh();
      });
    });

    if (search) {
      search.addEventListener('input', function () {
        query = search.value.trim().toLowerCase();
        paint();
      });
    }

    paint();
  })();

  /* ---- Match filters ---------------------------------------------------
     Three independent groups that compose: competition, venue and result. The
     chips ship as jump links over a grid that is already complete and in date
     order, so a blocked script costs the filtering and nothing else. */
  (function () {
    var grid = $('[data-match-grid]');
    if (!grid) return;
    var cards = $$('.mt', grid);
    var groups = $$('[data-filter-group]');
    if (!cards.length || !groups.length) return;
    var countEl = $('[data-match-count]');
    var emptyEl = $('[data-match-empty]');
    var picked = {};

    groups.forEach(function (g) {
      picked[g.getAttribute('data-filter-group')] = 'all';
    });

    /* The season bar above this list filters it too, so the page has one
       season control rather than a tab row and a chip row that could
       disagree. Every card carries the season it was played in. */
    document.addEventListener('sa:season', function (e) {
      picked.season = e.detail.season || 'all';
      apply();
    });

    var apply = function () {
      var shown = 0;
      cards.forEach(function (card) {
        var ok = Object.keys(picked).every(function (k) {
          return picked[k] === 'all' || card.getAttribute('data-' + k) === picked[k];
        });
        card.hidden = !ok;
        if (ok) shown++;
      });
      if (countEl) countEl.textContent = shown + (shown === 1 ? ' match' : ' matches');
      if (emptyEl) emptyEl.hidden = shown > 0;
    };

    groups.forEach(function (g) {
      var name = g.getAttribute('data-filter-group');
      var chips = $$('.mt-chip', g);
      chips.forEach(function (chip) {
        chip.setAttribute('role', 'button');
        chip.setAttribute('aria-pressed', chip.classList.contains('is-on') ? 'true' : 'false');
        chip.addEventListener('click', function (e) {
          e.preventDefault();
          picked[name] = chip.getAttribute('data-value');
          chips.forEach(function (c) {
            var on = c === chip;
            c.classList.toggle('is-on', on);
            c.setAttribute('aria-pressed', on ? 'true' : 'false');
          });
          apply();
        });
      });
    });

    apply();
  })();

  /* ---- League page tabs -------------------------------------------------
     Two independent pairs: which division's table, and which scorer chart.
     Both ship with every panel visible, so a blocked script leaves the whole
     page readable rather than empty. */
  (function () {
    var pairs = [
      { bar: '[data-league-tabs]', tab: '[data-league]', panel: '[data-league-panel]', attr: 'data-league', label: 'Division' },
      { bar: '[data-chart-tabs]', tab: '[data-chart]', panel: '[data-chart-panel]', attr: 'data-chart', label: 'Scorer chart' },
    ];
    pairs.forEach(function (p) {
      var bar = $(p.bar);
      if (!bar) return;
      var tabs = $$(p.tab, bar);
      var panels = $$(p.panel);
      if (tabs.length < 2 || !panels.length) return;

      bar.setAttribute('role', 'tablist');
      bar.setAttribute('aria-label', p.label);

      var select = function (val, focus) {
        tabs.forEach(function (t) {
          var on = t.getAttribute(p.attr) === val;
          t.classList.toggle('is-on', on);
          t.setAttribute('aria-selected', on ? 'true' : 'false');
          t.tabIndex = on ? 0 : -1;
          if (on && focus) t.focus();
        });
        panels.forEach(function (pane) {
          pane.hidden = pane.getAttribute(p.panel.replace(/[\[\]]/g, '')) !== val;
        });
      };

      tabs.forEach(function (t, i) {
        t.setAttribute('role', 'tab');
        var pane = panels.filter(function (x) {
          return x.getAttribute(p.panel.replace(/[\[\]]/g, '')) === t.getAttribute(p.attr);
        })[0];
        if (pane) {
          pane.setAttribute('role', 'tabpanel');
          if (!pane.id) pane.id = 'lg-pane-' + p.attr + '-' + i;
          t.setAttribute('aria-controls', pane.id);
          pane.setAttribute('aria-labelledby', t.id || (t.id = 'lg-tab-' + p.attr + '-' + i));
        }
        t.addEventListener('click', function (e) { e.preventDefault(); select(t.getAttribute(p.attr)); });
        t.addEventListener('keydown', function (e) {
          var n = null;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % tabs.length;
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + tabs.length) % tabs.length;
          if (n === null) return;
          e.preventDefault();
          select(tabs[n].getAttribute(p.attr), true);
        });
      });

      var on = tabs.filter(function (t) { return t.classList.contains('is-on'); })[0] || tabs[0];
      select(on.getAttribute(p.attr));
    });
  })();

  /* ---- Scroll reveals -------------------------------------------------
     .rv starts hidden only under html.js, so a blocked script can never leave
     a band invisible. Anything already at or above the fold is revealed at
     once rather than waiting on the observer. */
  (function () {
    var rvs = $$('.rv');
    if (!rvs.length) return;
    if (reduced || !('IntersectionObserver' in window)) {
      rvs.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
    rvs.forEach(function (el) { io.observe(el); });
    var vh = window.innerHeight || document.documentElement.clientHeight || 900;
    rvs.forEach(function (el) { if (el.getBoundingClientRect().top < vh) el.classList.add('is-in'); });
  })();
})();

/* ---- League page: the competition tab strip ----------------------------
   One panel visible at a time. The markup ships every panel present and only
   this script adds [hidden], so a script failure leaves all five readable
   rather than blanking the band. */
(function () {
  var strip = document.querySelector('[data-comp-tabs]');
  if (!strip) return;
  var tabs = [].slice.call(strip.querySelectorAll('[data-comp]'));
  var panels = [].slice.call(document.querySelectorAll('[data-comp-panel]'));
  if (!tabs.length || !panels.length) return;

  function show(key, focus) {
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-comp') === key;
      t.classList.toggle('is-on', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    panels.forEach(function (p) {
      if (p.getAttribute('data-comp-panel') === key) p.removeAttribute('hidden');
      else p.setAttribute('hidden', '');
    });
  }
  tabs.forEach(function (t, i) {
    t.tabIndex = t.getAttribute('aria-selected') === 'true' ? 0 : -1;
    t.addEventListener('click', function (e) {
      e.preventDefault();
      show(t.getAttribute('data-comp'), false);
    });
    /* Arrow keys move between tabs, which is what a tablist is expected to
       do and what a plain list of links would not give. */
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1
        : e.key === 'Home' ? -i : e.key === 'End' ? tabs.length - 1 - i : 0;
      if (!d) return;
      e.preventDefault();
      var n = (i + d + tabs.length) % tabs.length;
      show(tabs[n].getAttribute('data-comp'), true);
    });
  });
})();

/* ---- Records page: filter the record cards -----------------------------
   The cards ship visible and unfiltered; only this script adds [hidden], so
   a script failure shows all of them rather than an empty grid. */
(function () {
  var strip = document.querySelector('[data-rec-tabs]');
  if (!strip) return;
  var tabs = [].slice.call(strip.querySelectorAll('[data-rec]'));
  var cards = [].slice.call(document.querySelectorAll('.rc-card[data-kind]'));
  if (!tabs.length || !cards.length) return;
  var live = document.createElement('p');
  live.className = 'sr-only';
  live.setAttribute('role', 'status');
  strip.parentNode.insertBefore(live, strip.nextSibling);

  function show(kind) {
    var n = 0;
    cards.forEach(function (c) {
      var on = kind === 'all' || c.getAttribute('data-kind') === kind;
      if (on) { c.removeAttribute('hidden'); n++; } else c.setAttribute('hidden', '');
    });
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-rec') === kind;
      t.classList.toggle('is-on', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    live.textContent = n + (n === 1 ? ' record shown' : ' records shown');
  }
  tabs.forEach(function (t, i) {
    t.tabIndex = t.getAttribute('aria-selected') === 'true' ? 0 : -1;
    t.addEventListener('click', function (e) { e.preventDefault(); show(t.getAttribute('data-rec')); });
    t.addEventListener('keydown', function (e) {
      var dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      var n = (i + dir + tabs.length) % tabs.length;
      show(tabs[n].getAttribute('data-rec'));
      tabs[n].focus();
    });
  });
})();

/* ---- News page: filter the feed by category ----------------------------
   Cards ship visible; only this script adds [hidden]. */
(function () {
  var strip = document.querySelector('[data-news-tabs]');
  if (!strip) return;
  var tabs = [].slice.call(strip.querySelectorAll('[data-news]'));
  var cards = [].slice.call(document.querySelectorAll('.nw-card[data-cat]'));
  if (!tabs.length || !cards.length) return;
  var live = document.createElement('p');
  live.className = 'sr-only';
  live.setAttribute('role', 'status');
  strip.parentNode.insertBefore(live, strip.nextSibling);

  function show(cat) {
    var n = 0;
    cards.forEach(function (c) {
      var on = cat === 'all' || c.getAttribute('data-cat') === cat;
      if (on) { c.removeAttribute('hidden'); n++; } else c.setAttribute('hidden', '');
    });
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-news') === cat;
      t.classList.toggle('is-on', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    live.textContent = n + (n === 1 ? ' article shown' : ' articles shown');
  }
  tabs.forEach(function (t, i) {
    t.tabIndex = t.getAttribute('aria-selected') === 'true' ? 0 : -1;
    t.addEventListener('click', function (e) { e.preventDefault(); show(t.getAttribute('data-news')); });
    t.addEventListener('keydown', function (e) {
      var dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      var n = (i + dir + tabs.length) % tabs.length;
      show(tabs[n].getAttribute('data-news'));
      tabs[n].focus();
    });
  });
})();


/* ==========================================================================
   THE SEASON STRIP, ON A PHONE

   Each cell on "Every match, in order" carries a card with the badge, the
   score, the club and the date, and it was shown on :hover alone. A phone has
   no hover, so thirty-three results were on the page and unreadable: tapping
   one did nothing.

   A tap opens it now. The cell is not made focusable, deliberately: that would
   put thirty-three tab stops in front of everything below it, and the same
   results are in the table underneath as a real table with headers, which is
   where a keyboard or a screen reader should be sent anyway.

   Runs only where the pointer is coarse. On a desktop hover already works and
   a click that latched a card open would be worse than what is there.

   THE CARD IS LIFTED OUT OF THE STRIP. Showing the cell's own card in place
   did not work and could not: the strip scrolls sideways, so it carries
   overflow-x: auto, and a box that scrolls on one axis clips on both. On top
   of that every cell runs a transform animation, and a transformed element
   becomes the containing block for a fixed-position descendant, so the card
   could not escape by going fixed either. Between the two it was cropped to
   the 34px height of the strip: tapping a match produced a black stub with
   nothing readable in it.

   So a tap copies the cell's card into one element at the end of <body>,
   where nothing clips it, and positions it against the cell by hand.
   ========================================================================== */
(function () {
  'use strict';
  if (!window.matchMedia || !window.matchMedia('(pointer: coarse)').matches) return;
  var strip = document.querySelector('.camp__strip');
  if (!strip) return;
  var open = null;
  var pop = null;

  var vw = function () { return document.documentElement.clientWidth || window.innerWidth || 360; };
  var vh = function () { return document.documentElement.clientHeight || window.innerHeight || 640; };

  function popEl() {
    if (pop) return pop;
    pop = document.createElement('div');
    pop.className = 'camp__pop';
    /* The same figures are in the table below as a real table with headers,
       which is the route a screen reader is given. This is the visual echo. */
    pop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(pop);
    return pop;
  }

  function close() {
    if (!open) return;
    open.classList.remove('is-open');
    open = null;
    if (pop) pop.classList.remove('is-shown');
  }

  function place(cell) {
    var p = popEl();
    var tip = cell.querySelector('.camp__tip');
    p.innerHTML = tip ? tip.innerHTML : '';
    /* Shown before measuring: a display:none box measures zero, and the
       position would then be computed against nothing. */
    p.classList.add('is-shown');
    var box = cell.getBoundingClientRect();
    var w = p.offsetWidth, h = p.offsetHeight;
    var left = box.left + box.width / 2 - w / 2;
    left = Math.min(Math.max(8, left), Math.max(8, vw() - w - 8));
    /* Above the cell if it fits, below it if it does not. A strip near the
       top of the screen would otherwise put the card off the top edge. */
    var top = box.top - h - 12;
    if (top < 8) top = Math.min(box.bottom + 12, vh() - h - 8);
    p.style.left = Math.round(left) + 'px';
    p.style.top = Math.round(top) + 'px';
  }

  strip.addEventListener('click', function (e) {
    var cell = e.target.closest ? e.target.closest('.camp__cell') : null;
    if (!cell) return;
    if (cell === open) { close(); return; }
    close();
    cell.classList.add('is-open');
    open = cell;
    place(cell);
    e.stopPropagation();
  });

  /* Anywhere else, and scrolling, closes it. A card left hanging over the page
     while it moves underneath is worse than no card. The strip's own sideways
     scroll counts: the card is positioned against a cell that just moved. */
  document.addEventListener('click', close);
  window.addEventListener('scroll', close, { passive: true });
  strip.addEventListener('scroll', close, { passive: true });
  window.addEventListener('resize', close);
})();


/* ==========================================================================
   THE SQUAD, BY SEASON

   Which players belong to which season is worked out at build time from the
   matches each was actually named in, and stamped on the card as
   data-seasons. This filters on it.

   Progressive: with the script blocked the page is the whole squad under real
   position headings, which is a worse page but never an empty one. The
   position chips already work this way and this sits alongside them, so a
   season and a position filter compose rather than fight.
   ========================================================================== */
(function () {
  'use strict';
  var bar = document.querySelector('[data-season-filter]');
  if (!bar) return;
  var cards = Array.prototype.slice.call(document.querySelectorAll('.pc[data-seasons]'));
  if (!cards.length) return;

  /* SWITCHING SEASON SWITCHES THE NUMBERS TOO.
     It used to switch only which cards were shown, so the 26/27 tab listed
     the right players against 25/26's goals and starts, for a season that
     has not started. Every view's six figures are stamped on the card by the
     generator as data-st-<view>, derived per season by the same statistics
     engine as everything else, so this is a rewrite of six numbers. The
     leader mark moves with them: the top scorer of one season is not
     necessarily the club's top scorer. */
  function figures(card, view) {
    var raw = card.getAttribute('data-st-' + view);
    if (!raw) return;
    var v = raw.split(',');
    var cells = card.querySelectorAll('.pc__stats b, .pc__morestats b');
    for (var n = 0; n < cells.length && n < v.length; n++) cells[n].textContent = v[n];
    var badge = card.querySelector('[data-badge]');
    if (badge) {
      var mark = card.getAttribute('data-bg-' + view) || '';
      badge.textContent = mark;
      badge.hidden = !mark;
    }
    /* What he was that season: on trial, injured, or one of the three the
       site works out (new signing, retained, back at the club). */
    var state = card.querySelector('[data-state]');
    if (state) {
      var label = card.getAttribute('data-sl-' + view) || '';
      state.textContent = label;
      state.hidden = !label;
    }
  }

  /* The hero and the position chips describe whatever the tab is showing.
     They used to be fixed: "The players who won League Ten unbeaten" sat
     above a 26/27 squad that has not kicked a ball, and the chips added up to
     twenty-four under a tab reading thirty-four players. */
  var heroBox = document.querySelector('[data-sq-hero]');
  function heroFor(view) {
    if (!heroBox) return;
    var raw = heroBox.getAttribute('data-hero-' + view);
    if (!raw) return;
    var h;
    try { h = JSON.parse(raw); } catch (e) { return; }
    var eye = heroBox.querySelector('[data-hero-eyebrow]');
    var lede = heroBox.querySelector('[data-hero-lede]');
    if (eye) eye.textContent = h.eyebrow;
    if (lede) lede.textContent = h.lede;
    /* "In the first team" is the wrong label for a season that has been
       played, where the figure is everyone who turned out, including the
       eleven who have since retired or moved on. The generator works out
       which of the two it is, because it is the one that knows. */
    var dt = heroBox.querySelector('[data-hero-dt]');
    if (dt && h.label) dt.textContent = h.label;
    var dds = heroBox.querySelectorAll('dd');
    for (var i = 0; i < dds.length && i < h.tally.length; i++) dds[i].textContent = h.tally[i];
  }

  function chipsFor(view) {
    Array.prototype.forEach.call(document.querySelectorAll('.sq-chip'), function (chip) {
      var n = chip.getAttribute('data-n-' + view);
      if (n === null) return;
      var out = chip.querySelector('span');
      if (out) out.textContent = n;
      /* A position nobody filled that season is not a filter worth offering.
         "All" always stays, because it is how you get back. */
      if (!chip.hasAttribute('data-group-all')) chip.hidden = n === '0';
    });
  }

  function apply(season, view) {
    heroFor(view);
    chipsFor(view);
    cards.forEach(function (card) {
      /* "All seasons" is every player the club has had, not a season to
         match against. */
      var has = season === 'all'
        || (' ' + card.getAttribute('data-seasons') + ' ').indexOf(' ' + season + ' ') !== -1;
      card.hidden = !has;
      if (has && view) figures(card, view);
    });
    /* The band's own rail count. It was fixed at the whole first team while
       the band beneath it was being filtered by season. */
    var band = document.querySelector('[data-band-count]');
    if (band) {
      var n = document.querySelectorAll('#first-team .pc:not([hidden])').length;
      band.textContent = n + ' player' + (n === 1 ? '' : 's');
    }
    /* A position group with nobody left in it should go, not sit there as an
       empty heading with a count of players who are not shown. */
    Array.prototype.forEach.call(document.querySelectorAll('.sq-grp'), function (grp) {
      var shown = grp.querySelectorAll('.pc:not([hidden])').length;
      grp.hidden = !shown;
      var n = grp.querySelector('.sq-grp__h span');
      if (n) n.textContent = shown;
    });
  }

  bar.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-season]') : null;
    if (!b) return;
    Array.prototype.forEach.call(bar.querySelectorAll('[data-season]'), function (x) {
      var on = x === b;
      x.classList.toggle('is-on', on);
      x.setAttribute('aria-pressed', String(on));
    });
    apply(b.getAttribute('data-season'), b.getAttribute('data-view'));
  });

  var first = bar.querySelector('[data-season]');
  if (first) apply(first.getAttribute('data-season'), first.getAttribute('data-view'));
})();


/* ==========================================================================
   SEASON VIEWS, ANYWHERE

   Four pages offer the same choice and the first three each grew their own
   switcher. This is the one that serves any page: a [data-season-switch] bar
   of [data-view] buttons showing the matching [data-season-view] panel inside
   [data-season-views].

   A page adding a season filter now writes no JavaScript at all. The panels
   all ship in the HTML, so with this blocked the page still shows the season
   it opened on rather than nothing.
   ========================================================================== */
(function () {
  'use strict';
  var bars = document.querySelectorAll('[data-season-switch]');
  if (!bars.length) return;

  Array.prototype.forEach.call(bars, function (bar) {
    /* The panels belonging to THIS bar: the nearest set that follows it,
       so a page can carry more than one season filter without them fighting. */
    var host = bar.parentNode.querySelector('[data-season-views]')
      || document.querySelector('[data-season-views]');
    if (!host) return;

    var show = function (view) {
      Array.prototype.forEach.call(host.querySelectorAll('[data-season-view]'), function (p) {
        var on = p.getAttribute('data-season-view') === view;
        p.hidden = !on;
        /* A panel first revealed here never met the scroll observer, so it
           would sit at the reveal animation's starting opacity forever. */
        if (on) {
          p.classList.add('is-in');
          Array.prototype.forEach.call(p.querySelectorAll('.rv'), function (el) {
            el.classList.add('is-in');
          });
          /* Count-ups inside a panel that was hidden at first paint never
             ran either, so they would read nought. */
          if (window.saTick) {
            Array.prototype.forEach.call(p.querySelectorAll('[data-count]'), window.saTick);
          }
        }
      });
    };

    /* Anything else on the page that filters by season listens for this
       rather than growing a second set of tabs. One control, one answer:
       the results page swaps its record panel AND filters its match list
       from the same press. */
    /* A page header that names a season has to move with the tabs, or it is
       a caption for whichever one the page happened to open on. Every season
       word carries data-aw-season and the tallies ride on the list. */
    var heroFollows = function (btn) {
      var view = btn.getAttribute('data-view');
      var label = (btn.querySelector('b') || {}).textContent || '';
      Array.prototype.forEach.call(document.querySelectorAll('[data-aw-season]'), function (el) {
        el.textContent = label;
      });
      var list = document.querySelector('[data-aw-tally]');
      if (!list) return;
      var raw = list.getAttribute('data-t-' + view);
      if (!raw) return;
      var v = raw.split(',');
      Array.prototype.forEach.call(list.querySelectorAll('dd'), function (dd, i) {
        if (v[i] !== undefined) dd.textContent = v[i];
      });
    };

    var announce = function (btn) {
      document.dispatchEvent(new CustomEvent('sa:season', {
        detail: { view: btn.getAttribute('data-view'), season: btn.getAttribute('data-season') || '' },
      }));
    };

    bar.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-view]') : null;
      if (!b) return;
      Array.prototype.forEach.call(bar.querySelectorAll('[data-view]'), function (x) {
        var on = x === b;
        x.classList.toggle('is-on', on);
        x.setAttribute('aria-pressed', String(on));
      });
      show(b.getAttribute('data-view'));
      heroFollows(b);
      announce(b);
    });

    var on = bar.querySelector('[data-view].is-on') || bar.querySelector('[data-view]');
    if (on) { show(on.getAttribute('data-view')); heroFollows(on); announce(on); }
  });
})();
