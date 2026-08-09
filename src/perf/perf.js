/* ==========================================================================
   THE PERFORMANCE PROBE  ->  /perf.js, loaded ONLY for ?perf=1

   Three attempts at the scroll stutter were fixed from this end by reasoning
   about the code, and the club still reported it. A frame-by-frame reading of
   their screen recording is what finally showed the shape of it: during a
   7.7-second scroll the page was frozen for 4.2 seconds, in stalls of 100 to
   1,117 milliseconds. That is a blocked main thread, not a slow compositor,
   and none of the three fixes had been aimed at it.

   So this measures the thing on the device that actually has the problem,
   because the machine with the fault is the only one whose numbers count.

   It does two jobs. It REPORTS: frames per second while scrolling, the worst
   single frame, total blocked time, and every long task with whatever the
   browser will say about where it came from. And it EXPERIMENTS: each
   suspect can be switched off from the panel and the scroll measured again,
   so the culprit is identified by evidence rather than by my guessing.

   It costs an ordinary visitor nothing. sa.js loads this file only when the
   URL says perf=1, so the bytes are never fetched otherwise.
   ========================================================================== */
(function () {
  'use strict';

  var LONG = 50;          // a task over 50ms is a long task, per the spec
  var tasks = [];         // {dur, name, attribution}
  var frames = [];        // ms between animation frames, while scrolling
  var scrolling = false;
  var idle = null;
  var running = true;

  /* ---- Collect --------------------------------------------------------- */
  if ('PerformanceObserver' in window) {
    try {
      new PerformanceObserver(function (list) {
        list.getEntries().forEach(function (e) {
          var who = '';
          (e.attribution || []).forEach(function (a) {
            /* containerName/-Id are the only attribution browsers give for a
               long task, and they name the ELEMENT the script was attached to
               rather than the function. Better than nothing, and the timing
               plus what is on screen usually settles it. */
            who = a.containerName || a.containerId || a.containerType || who;
          });
          tasks.push({ dur: Math.round(e.duration), at: Math.round(e.startTime), who: who });
        });
        draw();
      }).observe({ type: 'longtask', buffered: true });
    } catch (err) { /* Safari before 16 has no longtask; the frame timer still works */ }

    /* Slow event handlers, which a long task cannot always attribute. */
    try {
      new PerformanceObserver(function (list) {
        list.getEntries().forEach(function (e) {
          if (e.duration >= LONG) {
            tasks.push({ dur: Math.round(e.duration), at: Math.round(e.startTime), who: 'event: ' + e.name });
          }
        });
        draw();
      }).observe({ type: 'event', durationThreshold: LONG, buffered: true });
    } catch (err) { /* not everywhere */ }
  }

  window.addEventListener('scroll', function () {
    scrolling = true;
    clearTimeout(idle);
    idle = setTimeout(function () { scrolling = false; draw(); }, 250);
  }, { passive: true });

  var last = 0;
  function tick(now) {
    if (!running) return;
    if (last && scrolling) {
      var d = now - last;
      /* A frame longer than a second is the tab being backgrounded, not a
         stall worth reporting. */
      if (d < 1000) frames.push(d);
      if (frames.length > 1200) frames.shift();
    }
    last = now;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  /* ---- Report ---------------------------------------------------------- */
  function stats() {
    if (!frames.length) return null;
    var s = frames.slice().sort(function (a, b) { return a - b; });
    var dropped = frames.filter(function (d) { return d > 32; }).length;
    var blocked = frames.reduce(function (a, d) { return a + (d > 20 ? d - 16.7 : 0); }, 0);
    return {
      n: frames.length,
      fps: Math.round(1000 / s[Math.floor(s.length / 2)]),
      worst: Math.round(s[s.length - 1]),
      dropped: Math.round((dropped / frames.length) * 100),
      blocked: Math.round(blocked),
    };
  }

  var box = document.createElement('div');
  box.setAttribute('role', 'status');
  box.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:2147483647;'
    + 'background:#0b0e12;color:#fff;border:2px solid #FF6A2A;border-radius:12px;'
    + 'padding:10px 12px;font:600 13px/1.45 ui-monospace,Menlo,monospace;'
    + 'max-height:62vh;overflow:auto;-webkit-overflow-scrolling:touch;'
    + 'box-shadow:0 10px 40px rgba(0,0,0,.6)';
  document.body.appendChild(box);

  function esc(s) {
    return String(s).replace(/[&<>]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
    });
  }

  function draw() {
    var s = stats();
    var worstTasks = tasks.slice().sort(function (a, b) { return b.dur - a.dur; }).slice(0, 6);
    var total = tasks.reduce(function (a, t) { return a + t.dur; }, 0);
    box.innerHTML =
      '<div style="color:#FF6A2A;font-weight:800;letter-spacing:.06em">SCROLL PROBE'
        + (scrolling ? ' &middot; measuring' : '') + '</div>'
      + (s
        ? '<div style="font-size:22px;font-weight:800;margin:4px 0">' + s.fps + ' fps'
          + '<span style="font-size:13px;font-weight:600;color:#A7ADB4">'
          + '  worst frame ' + s.worst + 'ms  &middot;  ' + s.dropped + '% dropped</span></div>'
        : '<div style="margin:6px 0;color:#A7ADB4">Scroll the page to measure.</div>')
      + '<div style="color:#A7ADB4">long tasks: <b style="color:#fff">' + tasks.length + '</b>'
        + '  totalling <b style="color:#fff">' + total + 'ms</b></div>'
      + (worstTasks.length
        ? '<div style="margin-top:6px">' + worstTasks.map(function (t) {
          return '<div>' + String(t.dur).padStart(5) + 'ms  at ' + (t.at / 1000).toFixed(1) + 's'
            + (t.who ? '  <span style="color:#FF6A2A">' + esc(t.who) + '</span>' : '') + '</div>';
        }).join('') + '</div>'
        : '')
      + '<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">'
        + btn('reset', 'Reset counters')
        + btn('timers', 'Stop timers')
        + btn('aura', 'Hide aura')
        + btn('camp', 'Hide season strip')
        + btn('imgs', 'Hide images')
        + btn('all', 'Strip everything')
      + '</div>'
      + '<div style="margin-top:6px;color:#8A9198;font-size:11px">Scroll, read the fps. '
        + 'Press one button, scroll again, read it again. Whichever button makes the number '
        + 'jump is the cause.</div>';
  }

  function btn(k, label) {
    return '<button data-p="' + k + '" style="font:700 12px/1 ui-monospace,monospace;'
      + 'background:#1a1f26;color:#fff;border:1px solid #3a424c;border-radius:8px;'
      + 'padding:9px 10px;min-height:38px">' + label + '</button>';
  }

  var off = {};
  box.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-p]') : null;
    if (!b) return;
    var k = b.getAttribute('data-p');

    if (k === 'reset') { frames.length = 0; tasks.length = 0; draw(); return; }

    /* Crude on purpose. There is no register of the page's timers, and this
       is a diagnostic rather than a feature: clearing the whole id space stops
       every carousel and sweep on the page in one press. */
    if (k === 'timers' || k === 'all') {
      for (var i = 1; i < 20000; i++) { clearInterval(i); clearTimeout(i); }
      off.timers = 1;
    }
    if (k === 'aura' || k === 'all') {
      Array.prototype.forEach.call(document.querySelectorAll('.pageaura'), function (el) {
        el.style.display = 'none';
      });
      off.aura = 1;
    }
    if (k === 'camp' || k === 'all') {
      Array.prototype.forEach.call(document.querySelectorAll('.camp'), function (el) {
        el.style.display = 'none';
      });
      off.camp = 1;
    }
    if (k === 'imgs' || k === 'all') {
      Array.prototype.forEach.call(document.querySelectorAll('img'), function (el) {
        el.style.visibility = 'hidden';
      });
      off.imgs = 1;
    }
    frames.length = 0;
    tasks.length = 0;
    b.style.background = '#FF6A2A';
    b.style.color = '#1A0A02';
    draw();
  });

  draw();
  setInterval(draw, 500);
})();
