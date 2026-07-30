/* Sue's Angels FC · Homepage motion + interaction layer (no dependencies)
   Framed hero: entrance staggers · match-card countdown · burger/X overlay ·
   results rail with progress · scroll reveals · count-ups · card tilt.
   Everything honours prefers-reduced-motion. */
(function () {
  'use strict';

  /* Brand preview (staging only): ?brand=orange flips the palette to the
     orange/black kit era. No param = the live navy/volt brand, unchanged. */
  try {
    var _brand = new URLSearchParams(window.location.search).get('brand');
    if (_brand) document.documentElement.setAttribute('data-brand', _brand);
  } catch (e) {}

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============================================================
     MOBILE MENU · burger morphs to X, dark overlay fades
     ============================================================ */
  var burger = document.querySelector('.hx__burger');
  var mnav = document.getElementById('mnav');
  if (burger && mnav) {
    var setMenu = function (open) {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      mnav.classList.toggle('is-open', open);
      mnav.setAttribute('aria-hidden', String(!open));
      document.body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', function () {
      setMenu(burger.getAttribute('aria-expanded') !== 'true');
    });
    mnav.addEventListener('click', function (e) {
      if (e.target.closest('a') || e.target === mnav) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') setMenu(false);
    });
  }

  /* ============================================================
     NAV DROPDOWNS · hover on desktop, tap/keyboard toggle for the rest
     ============================================================ */
  (function () {
    var groups = Array.prototype.slice.call(document.querySelectorAll('.hx__navgrp'));
    if (!groups.length) return;
    var closeAll = function (except) {
      groups.forEach(function (g) {
        if (g === except) return;
        g.classList.remove('is-open');
        var t = g.querySelector('.hx__navtrig');
        if (t) t.setAttribute('aria-expanded', 'false');
      });
    };
    groups.forEach(function (g) {
      var trig = g.querySelector('.hx__navtrig');
      if (!trig) return;
      trig.addEventListener('click', function (e) {
        e.preventDefault();
        var open = !g.classList.contains('is-open');
        closeAll(g);
        g.classList.toggle('is-open', open);
        trig.setAttribute('aria-expanded', String(open));
      });
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.hx__navgrp')) closeAll(null);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAll(null);
    });
  })();

  /* ============================================================
     MATCH CARD · live countdown to kick-off (minute tick)
     ============================================================ */
  (function () {
    var cd = document.querySelector('.hx__cd');
    if (!cd) return;
    var kick = new Date(cd.getAttribute('data-kick')).getTime();
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

  /* ============================================================
     RESULTS RAIL · scroll progress + arrow buttons
     ============================================================ */
  (function () {
    var rail = document.getElementById('rail');
    var fill = document.getElementById('railfill');
    if (!rail || !fill) return;
    var sync = function () {
      var max = rail.scrollWidth - rail.clientWidth;
      var p = max > 0 ? (rail.scrollLeft / max) * 100 : 100;
      fill.style.setProperty('--progress', Math.max(4, p) + '%');
    };
    rail.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();

    Array.prototype.slice.call(document.querySelectorAll('.railbtn')).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = rail.querySelector('.rcard');
        var w = card ? card.offsetWidth + 16 : 320;
        rail.scrollBy({ left: w * parseInt(btn.getAttribute('data-dir'), 10), behavior: reduced ? 'auto' : 'smooth' });
      });
    });
  })();

  /* ============================================================
     MEDIA NEWS RAIL · arrow navigation
     ============================================================ */
  (function () {
    var rail = document.getElementById('nrail');
    if (!rail) return;
    var arrows = Array.prototype.slice.call(document.querySelectorAll('.ncar__arrow'));
    arrows.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = rail.querySelector('.ncard');
        var w = card ? card.offsetWidth + 15 : 300;
        rail.scrollBy({ left: w * parseInt(btn.getAttribute('data-ndir'), 10), behavior: reduced ? 'auto' : 'smooth' });
      });
    });
    /* hide arrows when the rail has nothing to scroll (safety on wide screens) */
    var syncArrows = function () {
      var overflow = rail.scrollWidth - rail.clientWidth > 4;
      arrows.forEach(function (b) { b.style.display = overflow ? '' : 'none'; });
    };
    window.addEventListener('resize', syncArrows);
    syncArrows();
  })();

  /* ============================================================
     AWARD WINNERS · coverflow carousel
     ============================================================ */
  (function () {
    var stage = document.getElementById('cfStage');
    if (!stage) return;
    var cards = Array.prototype.slice.call(stage.querySelectorAll('.cf__card'));
    var n = cards.length;
    if (!n) return;
    var idxEl = document.getElementById('cfIdx');
    var dotsWrap = document.getElementById('cfDots');
    var active = Math.min(3, n - 1); /* start on the Top Goalscorer (centre) */

    /* build dots */
    var dots = [];
    if (dotsWrap) {
      cards.forEach(function (c, i) {
        var d = document.createElement('button');
        d.className = 'cf__dot';
        d.type = 'button';
        d.setAttribute('role', 'tab');
        d.setAttribute('aria-label', 'Award ' + (i + 1));
        d.addEventListener('click', function () { go(i); });
        dotsWrap.appendChild(d);
        dots.push(d);
      });
    }

    var layout = function () {
      cards.forEach(function (card, i) {
        var o = i - active;
        var ao = Math.abs(o);
        var sign = o < 0 ? -1 : 1;
        var vis = ao <= 3;
        var tx = o * 40;                              /* % of own width per step */
        var tz = -ao * 145;                           /* recede */
        var ry = -sign * Math.min(ao, 3) * 33;        /* angle toward centre */
        var sc = Math.max(0.72, 1 - ao * 0.08);
        card.style.transform =
          'translate(-50%, 0) translateX(' + tx + '%) translateZ(' + tz + 'px) rotateY(' + ry + 'deg) scale(' + sc + ')';
        card.style.opacity = vis ? (1 - ao * 0.12) : 0;
        card.style.zIndex = String(100 - ao);
        card.style.pointerEvents = vis ? 'auto' : 'none';
        card.classList.toggle('is-active', o === 0);
        card.setAttribute('aria-hidden', o === 0 ? 'false' : 'true');
        var link = card.querySelector('.cf__link');
        if (link) link.tabIndex = o === 0 ? 0 : -1;
      });
      if (idxEl) idxEl.textContent = String(active + 1);
      dots.forEach(function (d, i) {
        d.classList.toggle('is-on', i === active);
        d.setAttribute('aria-selected', i === active ? 'true' : 'false');
      });
    };
    var timer = null, dir = 1;
    /* ping-pong: advance to the last card, then reverse back, rather than wrapping */
    var tick = function () {
      if (active + dir > n - 1) dir = -1;
      else if (active + dir < 0) dir = 1;
      active += dir; layout();
    };
    var play = function () { if (!reduced && !timer) { timer = setInterval(tick, 1900); } };
    var stop = function () { if (timer) { clearInterval(timer); timer = null; } };
    /* manual nav re-arms the timer so the card lingers a full beat after a click */
    var go = function (i) { active = Math.max(0, Math.min(n - 1, i)); layout(); if (timer) { stop(); play(); } };

    var prev = document.querySelector('.cf__nav--prev');
    var next = document.querySelector('.cf__nav--next');
    if (prev) prev.addEventListener('click', function () { go(active - 1); });
    if (next) next.addEventListener('click', function () { go(active + 1); });

    /* click a side card to bring it to the centre */
    cards.forEach(function (card, i) {
      card.addEventListener('click', function (e) {
        if (i !== active) { e.preventDefault(); go(i); }
      });
    });

    /* keyboard */
    stage.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(active - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(active + 1); }
    });

    /* pointer swipe · real horizontal drags only (guards against stray events) */
    var sx = null, sy = null;
    stage.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      sx = e.clientX; sy = e.clientY;
    });
    stage.addEventListener('pointerup', function (e) {
      if (sx === null) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      sx = sy = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        go(active + (dx < 0 ? 1 : -1));
      }
    });
    stage.addEventListener('pointercancel', function () { sx = sy = null; });

    /* auto-advance every 2.5s with no user selection · pauses on hover/focus + when the
       tab is hidden, resumes on leave, and stays off under reduced-motion */
    stage.addEventListener('pointerenter', stop);
    stage.addEventListener('pointerleave', play);
    stage.addEventListener('focusin', stop);
    stage.addEventListener('focusout', play);
    document.addEventListener('visibilitychange', function () { if (document.hidden) { stop(); } else { play(); } });

    layout();
    play();
  })();

  /* ============================================================
     THE CAMPAIGN · tick gauge (radial ticks, animated fill)
     ============================================================ */
  (function () {
    var svgs = Array.prototype.slice.call(document.querySelectorAll('.cmp__gaugesvg'));
    if (!svgs.length) return;
    var NS = 'http://www.w3.org/2000/svg';
    svgs.forEach(function (svg) {
      var pct = parseFloat(svg.getAttribute('data-gauge')) || 0;
      var cx = 100, cy = 112, r1 = 66, r2 = 88, N = 46;
      var onCount = Math.round(N * pct / 100);
      var lines = [];
      for (var i = 0; i <= N; i++) {
        var frac = i / N;
        var ang = Math.PI * (1 + frac);          /* 180deg -> 360deg, arc over the top */
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
      var lightOne = function (ln) { ln.setAttribute('class', 'is-lit'); };
      var light = function () {
        for (var i = 0; i <= onCount; i++) {
          if (reduced) { lightOne(lines[i]); }
          else { (function (ln, d) { setTimeout(function () { lightOne(ln); }, d); })(lines[i], i * 22); }
        }
      };
      if (reduced || !('IntersectionObserver' in window)) { light(); }
      else {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) { if (en.isIntersecting) { light(); io.disconnect(); } });
        }, { threshold: 0.4 });
        io.observe(svg);
      }
    });
  })();

  /* ============================================================
     THE CAMPAIGN · real per-match data → charts (from getDerivedResults
     on the live site, 25/26 season, 29 scored games). x = games, y = goals.
     ============================================================ */
  (function () {
    var cmp = document.querySelector('.cmp'); if (!cmp) return;
    var NS = 'http://www.w3.org/2000/svg';
    var perFor = [5,5,6,5,7,2,7,7,0,7,5,6,12,3,4,7,0,5,2,1,3,2,9,10,6,3,0,4,2];
    var perAg  = [0,0,0,0,2,1,1,1,2,0,1,0,0,0,2,0,3,1,0,0,0,1,0,1,1,1,3,2,0];
    var cumFor = [5,10,16,21,28,30,37,44,44,51,56,62,74,77,81,88,88,93,95,96,99,101,110,120,126,129,129,133,135];
    var cumAg  = [0,0,0,0,2,3,4,5,7,7,8,8,8,8,10,10,13,14,14,14,14,15,15,16,17,18,21,23,23];
    var N = perFor.length;
    var res = perFor.map(function (g, i) { return g > perAg[i] ? 'W' : g < perAg[i] ? 'L' : 'D'; });
    var clean = perAg.map(function (a) { return a === 0 ? 1 : 0; });

    function drawBars(svg, vals, opt) {
      if (!svg) return; opt = opt || {};
      svg.querySelectorAll('rect').forEach(function (r) { r.remove(); });
      var W = 120, H = 34, gap = 0.9, bw = (W - (N - 1) * gap) / N;
      var max = opt.max || Math.max.apply(null, vals) || 1;
      vals.forEach(function (v, i) {
        var h = Math.max(opt.min != null ? opt.min : 2, (v / max) * (H - 1));
        var r = document.createElementNS(NS, 'rect');
        r.setAttribute('x', (i * (bw + gap)).toFixed(2));
        r.setAttribute('y', (H - h).toFixed(2));
        r.setAttribute('width', bw.toFixed(2));
        r.setAttribute('height', h.toFixed(2));
        r.setAttribute('rx', Math.min(1.4, bw / 2).toFixed(2));
        if (opt.fill) { var f = opt.fill(v, i); if (f) r.setAttribute('fill', f); }
        r.style.transitionDelay = (i * 0.016).toFixed(3) + 's';
        svg.appendChild(r);
      });
    }

    // Goals for — goals scored each game (orange via --acc)
    drawBars(document.querySelector('.cmp__bars--dim'), perFor, { max: 12, min: 1.5 });
    // Won — results left-to-right, height encodes the result so wins read at a glance:
    // win = tall green, draw = mid amber, loss = short red. Wins visibly dominate the wall.
    drawBars(document.querySelector('.cmp__bars:not(.cmp__bars--dim)'),
      res.map(function (r) { return r === 'W' ? 1 : r === 'D' ? 0.5 : 0.32; }),
      { max: 1, min: 2, fill: function (v, i) { return res[i] === 'L' ? '#FF5067' : res[i] === 'D' ? '#F2C744' : null; } });
    // Clean sheets — clean game = tall cyan, conceded = short dim
    drawBars(document.querySelector('.cmp__candles'),
      clean.map(function (c) { return c ? 1 : 0.34; }),
      { max: 1, min: 3, fill: function (v, i) { return clean[i] ? null : 'rgba(150,164,184,0.42)'; } });

    // Goal difference — cumulative goals FOR (green) vs AGAINST (red) across the season
    var wave = document.querySelector('.cmp__wave');
    if (wave) {
      wave.querySelectorAll('path,polyline').forEach(function (p) { p.remove(); });
      var Wv = 300, top = 6, bot = 68, max = cumFor[N - 1] || 1;
      var X = function (i) { return (i / (N - 1) * Wv).toFixed(2); };
      var Y = function (v) { return (bot - (v / max) * (bot - top)).toFixed(2); };
      var ptsFor = cumFor.map(function (v, i) { return X(i) + ',' + Y(v); });
      var ptsAg = cumAg.map(function (v, i) { return X(i) + ',' + Y(v); });
      var fill = document.createElementNS(NS, 'path');
      fill.setAttribute('class', 'cmp__wave-fill');
      fill.setAttribute('d', 'M' + ptsFor.join(' L') + ' L' + Wv + ',70 L0,70 Z');
      fill.setAttribute('fill', 'url(#cmpGdFill)'); fill.setAttribute('stroke', 'none');
      wave.appendChild(fill);
      var lf = document.createElementNS(NS, 'polyline');
      lf.setAttribute('class', 'cmp__wave-a'); lf.setAttribute('points', ptsFor.join(' ')); lf.setAttribute('fill', 'none');
      wave.appendChild(lf);
      var la = document.createElementNS(NS, 'polyline');
      la.setAttribute('class', 'cmp__wave-b'); la.setAttribute('points', ptsAg.join(' ')); la.setAttribute('fill', 'none');
      wave.appendChild(la);
    }

    // recent form → last 6 results, injected into the win-rate hero card
    var gaugeCard = document.querySelector('.cmp__card--gauge');
    if (gaugeCard && !gaugeCard.querySelector('.cmp__form')) {
      var last = res.slice(-6);
      var row = document.createElement('div');
      row.className = 'cmp__form';
      row.innerHTML = '<span class="cmp__form-lbl">Last 6</span>' + last.map(function (r) {
        return '<span class="cmp__form-chip cmp__form-chip--' + (r === 'L' ? 'l' : r === 'D' ? 'd' : 'w') + '">' + r + '</span>';
      }).join('');
      var foot = gaugeCard.querySelector('.cmp__gaugefoot');
      if (foot) gaugeCard.insertBefore(row, foot); else gaugeCard.appendChild(row);
    }
  })();

  /* ============================================================
     THE CAMPAIGN · number count-ups (fire when scrolled in)
     ============================================================ */
  (function () {
    var cmp = document.querySelector('.cmp');
    if (!cmp || reduced || !('IntersectionObserver' in window)) return;
    var nums = Array.prototype.slice.call(cmp.querySelectorAll('.cmp__num'));
    var gauge = document.querySelector('.cmp__gaugectr b');
    var ease = function (t) { return 1 - Math.pow(1 - t, 4); };
    var animate = function (el, isGauge) {
      var textNode = isGauge ? el.firstChild : el;
      var raw = textNode.textContent;
      var m = String(raw).match(/^([+\-]?)(\d+)(.*)$/);
      if (!m) return;
      var pre = m[1], target = parseInt(m[2], 10), suf = m[3] || '';
      var set = function (v) { textNode.textContent = pre + v + (isGauge ? '' : suf); };
      var t0 = null, dur = 1150;
      set(0);
      var frame = function (ts) {
        if (!t0) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1);
        set(Math.round(ease(p) * target));
        if (p < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          nums.forEach(function (el) { animate(el, false); });
          if (gauge) animate(gauge, true);
          io.disconnect();
        }
      });
    }, { threshold: 0.35 });
    io.observe(cmp);
  })();

  /* ============================================================
     THE CAMPAIGN · cursor-follow spotlight + auto-glow sweep
     ============================================================ */
  (function () {
    var cards = Array.prototype.slice.call(document.querySelectorAll('.cmp__card'));
    var cmp = document.querySelector('.cmp');
    if (!cards.length || !cmp) return;
    var canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;

    /* glow follows the cursor on pointer devices */
    if (canHover) {
      cards.forEach(function (card) {
        card.addEventListener('pointermove', function (e) {
          var r = card.getBoundingClientRect();
          card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
          card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
        });
      });
    }

    /* auto-glow sweeps one tile at a time every 2.5s; pauses while hovering; off under reduced-motion */
    if (reduced) return;
    var idx = -1, paused = false, timer = null;
    var clearAll = function () { cards.forEach(function (c) { c.classList.remove('is-active'); }); };
    var step = function () {
      if (paused) return;
      clearAll();
      idx = (idx + 1) % cards.length;
      var c = cards[idx];
      c.style.setProperty('--mx', '50%'); c.style.setProperty('--my', '46%');
      c.classList.add('is-active');
    };
    cmp.addEventListener('pointerenter', function () { paused = true; clearAll(); });
    cmp.addEventListener('pointerleave', function () { paused = false; });
    var start = function () { if (!timer) { step(); timer = setInterval(step, 2500); } };
    var stop = function () { if (timer) { clearInterval(timer); timer = null; } clearAll(); idx = -1; };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (ents) {
        ents.forEach(function (en) { if (en.isIntersecting) start(); else stop(); });
      }, { threshold: 0.25 }).observe(cmp);
    } else { start(); }
  })();

  /* ============================================================
     RECENT RESULTS · rail progress bar
     ============================================================ */
  (function () {
    var rail = document.getElementById('rlRail');
    var fill = document.getElementById('rlFill');
    if (!rail || !fill) return;
    var sync = function () {
      var max = rail.scrollWidth - rail.clientWidth;
      var p = max > 0 ? (rail.scrollLeft / max) * 100 : 100;
      fill.style.setProperty('--progress', Math.max(6, p) + '%');
    };
    rail.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  })();

  /* ============================================================
     THE TABLE · row reveal + points count-up
     ============================================================ */
  (function () {
    var tbl = document.getElementById('tbl');
    if (!tbl) return;
    var pts = Array.prototype.slice.call(tbl.querySelectorAll('.tbl__pts[data-pts]'));
    var countPts = function () {
      var ease = function (t) { return 1 - Math.pow(1 - t, 4); };
      pts.forEach(function (el) {
        var target = parseInt(el.getAttribute('data-pts'), 10) || 0;
        var t0 = null, dur = 950;
        el.textContent = '0';
        var frame = function (ts) {
          if (!t0) t0 = ts;
          var p = Math.min((ts - t0) / dur, 1);
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

  /* ============================================================
     SCROLL REVEALS
     ============================================================ */
  var rvs = Array.prototype.slice.call(document.querySelectorAll('.rv'));
  if (reduced || !('IntersectionObserver' in window)) {
    rvs.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
    rvs.forEach(function (el) { io.observe(el); });
    /* fail-safe: never let above-the-fold content wait on an async/misfiring
       observer — reveal anything already at or above the fold right away. */
    var vh = window.innerHeight || document.documentElement.clientHeight || 900;
    rvs.forEach(function (el) { if (el.getBoundingClientRect().top < vh) el.classList.add('is-in'); });
  }

  /* ============================================================
     STAT COUNT-UPS
     ============================================================ */
  var counters = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
  var runCount = function (el) {
    var targetN = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (reduced || targetN === 0) { el.textContent = String(targetN); return; }
    var t0 = null, dur = 1400;
    var ease = function (t) { return 1 - Math.pow(1 - t, 4); };
    var frame = function (ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      el.textContent = String(Math.round(ease(p) * targetN));
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };
  if ('IntersectionObserver' in window && !reduced) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          runCount(en.target);
          cio.unobserve(en.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { cio.observe(el); });
  } else {
    counters.forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
  }

  /* ============================================================
     SQUAD CARD TILT (fine pointers only)
     ============================================================ */
  if (!reduced && window.matchMedia('(pointer: fine)').matches) {
    Array.prototype.slice.call(document.querySelectorAll('.card')).forEach(function (card) {
      var raf = null;
      card.addEventListener('pointermove', function (e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          var r = card.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width - 0.5;
          var y = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform =
            'translateY(-6px) perspective(800px) rotateX(' + (-y * 4).toFixed(2) + 'deg) rotateY(' + (x * 5).toFixed(2) + 'deg)';
          raf = null;
        });
      });
      card.addEventListener('pointerleave', function () {
        card.style.transform = '';
      });
    });
  }
})();

/* ---- Light / dark mode toggle (persisted) ---- */
(function () {
  var root = document.documentElement, KEY = 'sa-mode';
  var reducedTheme = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var btns = Array.prototype.slice.call(document.querySelectorAll('.tsw'));
  function isLight() { return root.getAttribute('data-theme') === 'light'; }
  function sync() { btns.forEach(function (b) { b.setAttribute('aria-checked', isLight() ? 'false' : 'true'); }); }
  function apply(light) {
    if (light) { root.setAttribute('data-theme', 'light'); }
    else { root.removeAttribute('data-theme'); }
    try { localStorage.setItem(KEY, light ? 'light' : 'dark'); } catch (e) {}
    sync();
  }
  function set(light, origin) {
    /* reduced-motion or unsupported → instant (legacy token cross-fade) */
    if (reducedTheme || !document.startViewTransition || !origin) {
      if (!reducedTheme) { root.classList.add('theme-anim'); window.setTimeout(function () { root.classList.remove('theme-anim'); }, 340); }
      apply(light); return;
    }
    /* premium circular reveal of the incoming theme, expanding from the toggle */
    var x = origin.x, y = origin.y;
    var end = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    root.classList.add('theme-sweep');
    var vt = document.startViewTransition(function () { apply(light); });
    vt.ready.then(function () {
      root.animate(
        { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + end + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 560, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    });
    vt.finished.catch(function () {}).then(function () { root.classList.remove('theme-sweep'); });
  }
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      var r = b.getBoundingClientRect();
      set(!isLight(), { x: r.left + r.width / 2, y: r.top + r.height / 2 });
    });
  });
  sync();
})();

/* ── Lead-capture forms → serverless endpoints ─────────────────────────────
   Footer newsletter  form.ft2__form   → POST /api/subscribe      (MailerLite)
   Sponsor pack       form[data-enquiry]→ POST /api/notify-enquiry (emails club)
   Endpoints live on Vercel and no-op gracefully until their keys are set;
   the origin is allowed on *.vercel.app and the production domains. Full
   loading / success / error states, announced to screen readers via aria-live.
   (On the static local preview there is no /api runtime, so a submit shows the
   error state locally and succeeds once deployed.) */
(function () {
  'use strict';
  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  function ensureMsg(form) {
    var m = form.parentNode.querySelector('.formmsg');
    if (!m) {
      m = document.createElement('p');
      m.className = 'formmsg';
      m.setAttribute('role', 'status');
      m.setAttribute('aria-live', 'polite');
      form.parentNode.insertBefore(m, form.nextSibling);
    }
    return m;
  }

  function submit(form, endpoint, extra, okText) {
    var input = form.querySelector('input[type=email], input[type=text]');
    var email = ((input && input.value) || '').trim();
    var btn = form.querySelector('button');
    var msg = ensureMsg(form);
    if (!EMAIL_RE.test(email)) {
      form.classList.remove('is-sending');
      msg.className = 'formmsg is-err';
      msg.textContent = 'Please enter a valid email address.';
      if (input) input.focus();
      return;
    }
    form.classList.add('is-sending');
    if (btn) btn.disabled = true;
    msg.className = 'formmsg';
    msg.textContent = 'Sending…';
    var payload = { email: email };
    for (var k in extra) { if (Object.prototype.hasOwnProperty.call(extra, k)) payload[k] = extra[k]; }
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json().catch(function () { return { ok: r.ok }; }); })
      .then(function (d) {
        form.classList.remove('is-sending');
        if (btn) btn.disabled = false;
        if (d && d.ok) {
          form.classList.add('is-done');
          msg.className = 'formmsg is-ok';
          msg.textContent = d.duplicate ? "You're already on the list. Thank you." : okText;
        } else {
          msg.className = 'formmsg is-err';
          msg.textContent = 'Something went wrong. Please try again, or email hello@suesangelsfc.co.uk.';
        }
      })
      .catch(function () {
        form.classList.remove('is-sending');
        if (btn) btn.disabled = false;
        msg.className = 'formmsg is-err';
        msg.textContent = 'Network problem. Please try again in a moment.';
      });
  }

  function wire() {
    var news = document.querySelectorAll('form.ft2__form');
    for (var i = 0; i < news.length; i++) {
      (function (f) {
        f.removeAttribute('onsubmit');
        f.addEventListener('submit', function (e) {
          e.preventDefault();
          submit(f, '/api/subscribe', { name: '' }, "You're in. Welcome to the family.");
        });
      })(news[i]);
    }
    var enq = document.querySelectorAll('form[data-enquiry]');
    for (var j = 0; j < enq.length; j++) {
      (function (f) {
        var src = f.getAttribute('data-enquiry');
        f.removeAttribute('onsubmit');
        f.addEventListener('submit', function (e) {
          e.preventDefault();
          submit(f, '/api/notify-enquiry', { type: 'Sponsorship pack request', source: src }, "Thanks. We'll send your pack over shortly.");
        });
      })(enq[j]);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();

/* ============================================================
   EDITORIAL SCAFFOLDING (ref: inspo 4/7/8)
   Injects the document rail, per-section numbered rails and the grid
   lines. Purely presentational, so everything is aria-hidden and the
   page is unchanged for screen readers and for no-JS.
   ============================================================ */
(function () {
  var REF = [
    'Est. 2025',
    'League Eight &middot; 26/27',
    'The Reeves, Hanworth',
    '51.43&deg; N / 0.40&deg; W',
    'P18 W18 &middot; Unbeaten'
  ];

  function gridlines() {
    if (document.querySelector('.gridlines')) return;
    var g = document.createElement('div');
    g.className = 'gridlines'; g.setAttribute('aria-hidden', 'true');
    document.body.appendChild(g);
  }

  function docrail() {
    var hero = document.querySelector('.sec--pagehero > .wrap, .sec--pagetitle > .wrap');
    if (!hero || hero.querySelector('.docrail')) return;
    var d = document.createElement('div');
    d.className = 'docrail'; d.setAttribute('aria-hidden', 'true');
    d.innerHTML = '<span><b>Sue&rsquo;s Angels FC</b></span>'
      + '<span>Est. 2025</span>'
      + '<span>League Eight &middot; 26/27</span>'
      + '<span>The Reeves, Hanworth</span>'
      + '<span>51.43&deg; N / 0.40&deg; W</span>';
    hero.insertBefore(d, hero.firstChild);
  }

  function sectionRails() {
    var secs = [].slice.call(document.querySelectorAll('main > section.sec'));
    var n = 0;
    secs.forEach(function (sec) {
      var h2 = sec.querySelector('.h2, .h1b');
      var wrap = sec.querySelector(':scope > .wrap');
      if (!h2 || !wrap || wrap.querySelector('.xrail')) return;
      n++;
      var label = (h2.textContent || '').replace(/\s+/g, ' ').replace(/\.$/, '').trim();
      var rail = document.createElement('div');
      rail.className = 'xrail'; rail.setAttribute('aria-hidden', 'true');
      rail.innerHTML =
        '<span class="xrail__l"><span class="xrail__n">' +
          String(n).padStart(2, '0') + '</span>' +
          '<span class="xrail__t">' + label + '</span></span>' +
        '<span class="xrail__r">' + REF[(n - 1) % REF.length] + '</span>';
      wrap.insertBefore(rail, wrap.firstChild);
    });
  }

  function run() { gridlines(); docrail(); sectionRails(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();

/* ============================================================
   GEO LINE SYSTEM (ref: SCULPT / Man City matchday boards)
   Injects the pitch-geometry line field, the repeating wordmark rule and
   broadcast corner-brackets on club crests. Presentational only, so it is
   aria-hidden and absent for no-JS.
   ============================================================ */
(function () {
  function geoField() {
    if (document.querySelector('.geo')) return;
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'geo');
    svg.setAttribute('viewBox', '0 0 1200 900');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    svg.setAttribute('aria-hidden', 'true');
    /* Restraint: two large circles CROPPED by the frame plus one arc, placed
       asymmetrically. Suggests pitch geometry without drawing a pitch diagram.
       No full crosshairs, no penalty box, no symmetry. */
    svg.innerHTML =
      '<circle class="geo__line" cx="1210" cy="150" r="430"/>' +
      '<circle class="geo__arc"  cx="1210" cy="150" r="286"/>' +
      '<circle class="geo__dash" cx="70"  cy="815" r="250"/>' +
      '<circle class="geo__dot"  cx="788" cy="330" r="2.5"/>' +
      '<circle class="geo__dot"  cx="305" cy="742" r="2"/>';
    document.body.appendChild(svg);
  }

  function wordstrip() {
    var main = document.getElementById('main');
    if (!main || document.querySelector('.wordstrip')) return;
    var cta = main.querySelector('section.sec--cta');
    if (!cta) return;
    var strip = document.createElement('div');
    strip.className = 'wordstrip'; strip.setAttribute('aria-hidden', 'true');
    var unit = '<i>Sue&rsquo;s Angels FC</i><b>&#9632;</b>';
    strip.innerHTML = '<div class="wordstrip__in">' + unit.repeat(12) + '</div>';
    cta.parentNode.insertBefore(strip, cta);
  }

  function brackets() {
    var sel = '.fixrow__crest, .nextup__crest, .hx__cd img, .mvs__crest';
    [].slice.call(document.querySelectorAll(sel)).forEach(function (el) {
      if (el.classList.contains('brk')) return;
      el.classList.add('brk');
    });
  }

  function run() { geoField(); wordstrip(); brackets(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();

/* Geometry across the hero photograph (ref: Man City board). Sits above the
   duotone image and below the text, so the lines actually read. */
(function () {
  function heroGeo() {
    var hero = document.querySelector('.sec--pagehero, .sec--pagetitle');
    if (!hero || hero.querySelector('.geo--hero')) return;
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'geo geo--hero');
    svg.setAttribute('viewBox', '0 0 1200 520');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML =
      '<circle class="geo__line" cx="1000" cy="250" r="322"/>' +
      '<circle class="geo__arc"  cx="1000" cy="250" r="188"/>' +
      '<line   class="geo__dash" x1="1000" y1="0" x2="1000" y2="520"/>' +
      '<line   class="geo__dash" x1="678"  y1="0" x2="678"  y2="520"/>' +
      '<circle class="geo__dot"  cx="1000" cy="250" r="3.5"/>' +
      '<circle class="geo__dot"  cx="678"  cy="250" r="2.5"/>';
    hero.appendChild(svg);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', heroGeo);
  else heroGeo();
})();

/* ============================================================
   AUTO-ADVANCING RAILS · ping-pong
   Every 1.9s each horizontal rail steps one card to the right; on reaching
   the end it reverses and travels back left, then reverses again. Pauses on
   hover, focus, touch and when off-screen, and is disabled entirely under
   prefers-reduced-motion (auto-motion must never be unstoppable — WCAG 2.2.2).
   ============================================================ */
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var STEP_MS = 1900;

  function autoRail(rail) {
    var dir = 1, timer = null, paused = false, visible = false;

    function stepPx() {
      var first = rail.children[0];
      if (!first) return 260;
      var cs = getComputedStyle(rail);
      var gap = parseFloat(cs.columnGap || cs.gap || 0) || 0;
      return first.getBoundingClientRect().width + gap;
    }
    function tick() {
      if (paused) return;
      var max = rail.scrollWidth - rail.clientWidth;
      if (max <= 4) return;                       // nothing to scroll
      var next = rail.scrollLeft + dir * stepPx();
      if (next >= max - 2) { next = max; dir = -1; }
      else if (next <= 2) { next = 0; dir = 1; }
      rail.scrollTo({ left: next, behavior: 'smooth' });
    }
    function start() { if (!timer) timer = setInterval(tick, STEP_MS); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    ['pointerenter', 'focusin', 'touchstart'].forEach(function (e) {
      rail.addEventListener(e, function () { paused = true; }, { passive: true });
    });
    ['pointerleave', 'focusout'].forEach(function (e) {
      rail.addEventListener(e, function () { paused = false; }, { passive: true });
    });

    var started = false;
    function begin() { started = true; start(); }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (ents) {
        ents.forEach(function (en) {
          visible = en.isIntersecting;
          if (visible) begin(); else stop();
        });
      }, { threshold: 0 }).observe(rail);
      /* Safety net: some environments report a degenerate (zero-area) viewport,
         so the observer only ever reports NOT intersecting and the rail would
         sit frozen forever. If it has never run after 3s, start it regardless. */
      setTimeout(function () { if (!started) begin(); }, 3000);
    } else { begin(); }
  }

  function run() {
    ['.nrail', '.rl', '.vals'].forEach(function (sel) {
      [].slice.call(document.querySelectorAll(sel)).forEach(autoRail);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();

/* ===== BREATHING CANVAS =====================================================
   The orange patches behind every page. Two things make this feel designed
   rather than generated:

   1. Placement is SEEDED off the page filename, not Math.random(). Every page
      gets its own arrangement, but it is the same arrangement on every reload —
      a field that reshuffles on refresh reads as a glitch, not as art.
   2. Patches alternate sides down the page and stay inside the outer thirds,
      so body copy never sits on top of a hot spot, and they never clump the way
      unstructured random does.

   Each patch breathes on its own duration (11-22s) with a negative delay, so
   the field never pulses in unison. Motion is transform + opacity only.
   ========================================================================== */
(function () {
  'use strict';

  /* FNV-1a → a stable 32-bit seed from the page name */
  function seedFrom(str) {
    var h = 2166136261, i;
    for (i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  /* mulberry32 — small, fast, well-distributed */
  function rng(seed) {
    return function () {
      seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  var host = null, lastKey = '';

  function build() {
    if (!host) {
      host = document.querySelector('.pageaura');
      if (!host) {
        host = document.createElement('div');
        host.className = 'pageaura';
        host.setAttribute('aria-hidden', 'true');
        document.body.insertBefore(host, document.body.firstChild);
      }
    }

    var vw = window.innerWidth || document.documentElement.clientWidth || 1280;
    var narrow = vw < 760;
    var docH = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, 600);

    /* one patch per ~900px of page, so a long page gets a longer field */
    var n = Math.max(4, Math.min(narrow ? 5 : 9, Math.round(docH / 900)));

    /* only rebuild when the shape of the page actually changed */
    var key = n + ':' + (narrow ? 'n' : 'w');
    if (key === lastKey) return;
    lastKey = key;

    var page = location.pathname.split('/').pop() || 'index.html';
    var rand = rng(seedFrom(page));
    var side = rand() < 0.5 ? -1 : 1;            /* which edge patch one hugs */
    var band = 100 / n;
    var frag = document.createDocumentFragment();

    for (var i = 0; i < n; i++) {
      var p = document.createElement('span');
      p.className = 'pa';

      var y = band * i + band * (0.18 + rand() * 0.64);          /* jitter in band */
      var x = side < 0 ? -4 + rand() * 34 : 70 + rand() * 34;    /* outer thirds only */
      side = -side;

      var big = rand() < 0.34;
      var size = (big ? 52 : 32) + rand() * (big ? 16 : 12);      /* vw */
      /* 1.7x its own band, so every patch overlaps its neighbours and the
         light never breaks — self-balancing whatever n turns out to be */
      var tall = band * (1.45 + rand() * 0.6);
      /* Alpha is the peak of the breath, not a constant — the keyframes now drop
         to 0.34 opacity at rest, so the base has to sit higher than it did when
         the trough was 0.66 or the field averages out dimmer than before. */
      var alpha = (big ? 0.46 : 0.34) + rand() * 0.18;
      if (narrow) alpha *= 0.78;                                  /* quieter on phones */

      p.style.cssText =
        '--pa-x:' + x.toFixed(2) + '%;' +
        '--pa-y:' + y.toFixed(2) + '%;' +
        '--pa-w:' + size.toFixed(1) + 'vw;' +
        '--pa-h:' + tall.toFixed(2) + '%;' +
        '--pa-a:' + alpha.toFixed(3) + ';' +
        /* amplitudes below are all roughly double the first pass, which was
           technically animating but sat under the perceptual threshold */
        '--pa-s:' + (1.20 + rand() * 0.28).toFixed(3) + ';' +
        '--pa-dx:' + (rand() * 10 - 5).toFixed(2) + '%;' +
        '--pa-dy:' + (rand() * 12 - 6).toFixed(2) + '%;' +
        '--pa-dur:' + (7 + rand() * 6).toFixed(2) + 's;' +
        '--pa-delay:-' + (rand() * 13).toFixed(2) + 's;';
      frag.appendChild(p);
    }

    host.textContent = '';
    host.appendChild(frag);
    host.classList.add('pageaura--live');
  }

  function run() {
    build();
    /* images and fonts settle after DOMContentLoaded, so the page gets taller —
       re-measure once so the field covers the real document */
    window.addEventListener('load', build);
    var t = null;
    window.addEventListener('resize', function () {
      clearTimeout(t); t = setTimeout(build, 220);
    }, { passive: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
