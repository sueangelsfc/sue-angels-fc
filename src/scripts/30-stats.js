/* ==========================================================================
   WHAT THE WEBSITE IS ACTUALLY READ FOR

   The club has 108 pages and, until this, no idea which of them anybody
   opened. This records one page view: which page, roughly where in the world,
   what sent the reader, what they read it on, how long they stayed and how
   far down they got. Control panel -> Website stats draws it.

   NO IDENTIFIER OF ANY KIND, and it is the database that makes that true
   rather than this file's good intentions. `record_page_view` adds one to a
   bucket keyed by (day, page, zone, source, device); it does not store an
   event. Two readers of the same page from the same zone on the same day are
   one row with views = 2, and nothing written here can be unpicked into a
   visit afterwards. That is why this sits outside the consent gate that
   Google Analytics and the Meta pixel sit behind, and it is the reason to
   keep it there. See migrations/007_page_stats.sql.

   FOUR THINGS ARE DELIBERATELY NOT COLLECTED
     - No address. Where in the world is the device's own time zone, which the
       browser already knows and which costs no lookup and no third party.
     - No full referrer. The HOST only: a full referring URL carries search
       terms and private query strings, and "google.com" answers the question
       the club is actually asking.
     - No user agent. The device bucket is screen width, which is what the
       layout responds to anyway and is three values wide.
     - No time finer than the day, which the database stamps itself.

   IT FAILS SILENTLY AND THAT IS ON PURPOSE
   The function does not exist until migrations/007 has been run, and until
   then every call is a 404. A counter is not worth a console error on a
   supporter's phone, so nothing here ever rejects into the open. `band_views`
   made the same promise and it hid a real bug for weeks - a ReferenceError
   that silently took the whole counter down - so the one thing this file
   must never do is throw before it reaches its own try/catch.
   ========================================================================== */
(function () {
  'use strict';

  if (!window.saRpc) return;

  /* THE LAW THIS RUNS UNDER. Counting visits reads and stores information on
     the visitor's device, which UK law (PECR regulation 6, as amended by the
     Data (Use and Access) Act 2025) allows without consent ONLY for aggregate
     statistics used to improve this website, and only where the visitor has
     been given clear information and a simple way to object. So nothing here
     reads or stores anything, and nothing is sent, until the privacy banner
     has told the visitor, and never once they have objected: every entry
     point asks allowed() at the moment it would act. A choice changed half
     way through a visit takes effect from the next action. */
  function allowed() {
    try { return !!(window.saPrivacy && window.saPrivacy.allows('stats')); } catch (e) { return false; }
  }

  /* A path and nothing else. The database re-checks this - it has to, being
     callable by anyone - but sending something it will silently discard would
     mean the counter looked like it worked and recorded nothing. */
  var path = String(location.pathname || '/');
  if (path.length > 120 || !/^\/[A-Za-z0-9/_.-]*$/.test(path)) return;

  /* ---- What we can say about the reader, all of it coarse -------------- */

  function zone() {
    try {
      return String(Intl.DateTimeFormat().resolvedOptions().timeZone || '').slice(0, 40);
    } catch (e) { return ''; }
  }

  /* The host, never the URL. And an internal referrer is not a source: a
     reader moving from the fixtures page to a match report did not arrive
     from anywhere, and counting it would drown the real sources in our own
     traffic - the commonest way a referrer report becomes useless. */
  function source() {
    var ref = document.referrer;
    if (!ref) return '';
    try {
      var h = new URL(ref).hostname.replace(/^www\./, '');
      if (!h || h === location.hostname.replace(/^www\./, '')) return '';
      return h.slice(0, 60);
    } catch (e) { return ''; }
  }

  /* Screen width, not the user agent string. The breakpoints are the site's
     own, so a device counted as mobile here is a device that got the mobile
     layout, which is the only version of this question worth answering. */
  function device() {
    var w = window.innerWidth || document.documentElement.clientWidth || 0;
    if (w && w < 768) return 'mobile';
    if (w && w < 1024) return 'tablet';
    return 'desktop';
  }

  /* The hour the reader is actually in, 0 to 23. A browser that will not say
     is not guessed at: -1 tells the database to write the day and skip the
     hour, which is the same thing an older beacon does by sending nothing. */
  function hour() {
    var h = new Date().getHours();
    return (h >= 0 && h <= 23) ? h : -1;
  }

  /* ---- How far, and how long ------------------------------------------- */

  var started = Date.now();
  var depth = 0;

  function measureDepth() {
    var doc = document.documentElement;
    var full = Math.max(doc.scrollHeight, document.body ? document.body.scrollHeight : 0);
    var seen = (window.scrollY || doc.scrollTop || 0) + window.innerHeight;
    /* A page shorter than the window has been read to the bottom by being
       opened at all. Without this it reports 0% for every short page, which
       reads as nobody scrolling rather than as nothing to scroll. */
    if (full <= window.innerHeight) { depth = 100; return; }
    var pct = Math.round((seen / full) * 100);
    if (pct > depth) depth = Math.min(pct, 100);
  }

  measureDepth();
  window.addEventListener('scroll', measureDepth, { passive: true });
  window.addEventListener('resize', measureDepth, { passive: true });

  /* ---- Sent once, as the page goes away -------------------------------- */

  /* Where THIS view came from, for the route: the page before it on this
     site, the sending site's host, or nothing. Never a full address. */
  function from() {
    try {
      var u = new URL(document.referrer);
      return u.host === location.host ? u.pathname.slice(0, 120) : source();
    } catch (e) { return ''; }
  }

  /* ---- A tagged link, and what gets clicked (migrations/010) -------------
     `?from=insta-story` on a link the club shares names the post that sent
     somebody, which the referrer almost never does from an app. It is taken
     out of the address bar so a reader who copies the link on does not carry
     the club's tag with them. Clicks are counted by kind and target, never
     with anything typed. Each is its own call, so a database without 010
     loses these and nothing else - the lesson of 008. */
  var tag = '';
  try {
    var qs = new URLSearchParams(location.search);
    tag = String(qs.get('from') || qs.get('utm_campaign') || qs.get('utm_source') || '')
      .toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 40);
    if (tag && history.replaceState) {
      ['from', 'utm_source', 'utm_medium', 'utm_campaign'].forEach(function (k) { qs.delete(k); });
      var rest = qs.toString();
      history.replaceState(history.state, '', path + (rest ? '?' + rest : '') + location.hash);
    }
  } catch (e) { tag = ''; }

  function ev(kind, target) {
    if (!allowed()) return;
    try {
      window.saRpc('record_page_event', {
        p_path: path,
        p_kind: kind,
        p_target: String(target || '').slice(0, 120),
      }, true).catch(function () {});
    } catch (e) { /* a click is never worth an error */ }
    if (consents('sponsor')) {
      rpc('record_audience_event', { p_kind: kind, p_target: String(target || '').slice(0, 120) });
    }
  }

  var home = location.hostname.replace(/^www\./, '');
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    try {
      var u = new URL(a.href, location.href);
      var h = u.hostname.replace(/^www\./, '');
      if (u.protocol === 'mailto:' || u.protocol === 'tel:') return ev('contact', u.protocol.slice(0, -1));
      if (a.hasAttribute('download') || /\.pdf$/i.test(u.pathname)) return ev('download', u.pathname);
      if (h === home) return;
      ev(/(^|\.)stripe\.com$/.test(h) ? 'donate'
        : /(^|\.)(instagram|facebook|tiktok|x|twitter|youtube|whatsapp|linkedin|threads)\.(com|net)$/.test(h)
          ? 'social' : 'outbound', h);
    } catch (x) { /* an address the browser cannot parse is not a click to count */ }
  }, true);
  /* `play` does not bubble, so it is caught on the way down. Once per video
     per page, so pausing and carrying on is not a second play. */
  document.addEventListener('play', function (e) {
    var v = e.target;
    if (!v || v.tagName !== 'VIDEO' || v.saPlayed) return;
    v.saPlayed = 1;
    try { ev('video', new URL(v.currentSrc || v.src, location.href).pathname); } catch (x) { ev('video', ''); }
    if (allowed()) watched(v, 0);
  }, true);
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f && f.getAttribute) ev('form', f.getAttribute('data-enquiry') || f.id || 'form');
  }, true);

  /* ---- The journey, kept in this tab only (migrations/011) -------------
     The pages read in this tab, in order, start first. It lives in
     sessionStorage, which dies with the tab and is never sent anywhere with
     an identifier: every view sends the journey SO FAR as a pattern, and the
     panel works out where journeys ended by taking away the ones that went a
     step further. A new arrival from outside, or half an hour idle, starts a
     new journey; a reload of the same page is not a step. */
  /* Read and written as the view is sent, never on arrival, so a visitor
     who objects - or who leaves before the banner has said what is counted -
     has nothing stored in their tab at all. */
  function trailNow() {
    try {
      var ss = window.sessionStorage;
      var was = JSON.parse(ss.getItem('sa-trail') || 'null');
      var fresh = was && was.s && Date.now() - was.t < 1800000;
      var came = from();
      var reload = fresh && was.s[was.s.length - 1] === path;
      var route = reload ? was.s
        : (fresh && came.charAt(0) === '/' ? was.s.concat([path])
          : [came.charAt(0) === '/' ? 'new-tab' : came, path]);
      ss.setItem('sa-trail', JSON.stringify({ t: Date.now(), s: route.slice(0, 12) }));
      return !reload && route.length <= 9 ? route.join('>') : '';
    } catch (e) { return ''; }
  }

  /* ==========================================================================
     THE DETAIL (migrations/012)

     Every figure below is aggregate statistics of a kind the ICO's April 2026
     guidance names as meeting the statistics exception: clicks on sections of
     a page, scroll depth, device and browser, page speed, how people reach a
     step. Each asks allowed() at the moment it acts, and the observers that
     measure over time are not even started until it is true, so nothing is
     gathered about a visitor who has not been told or has objected.

     Two things need a saved yes instead, because they are outside the
     exception: figures for sponsors (consents('sponsor')) and returning
     visits (consents('returning')).

     NOTHING HERE READS WHAT ANYBODY TYPES. A form field is its name; a copy
     is where on the page it happened, never what was copied.
     ========================================================================== */
  function rpc(fn, args) {
    try { window.saRpc(fn, args, true).catch(function () {}); } catch (e) { /* never an error */ }
  }
  function consents(purpose) {
    try { return !!(window.saPrivacy && window.saPrivacy.allows(purpose)); } catch (e) { return false; }
  }
  function keyOf(k) { return /^[A-Za-z0-9_-]{1,40}$/.test(k || '') ? k : ''; }
  function sectionOf(el) {
    var sct = el && el.closest ? el.closest('[id],section[aria-labelledby]') : null;
    return sct ? keyOf(sct.id || sct.getAttribute('aria-labelledby')) : '';
  }
  function pathOf(u) {
    try {
      var x = new URL(u, location.href);
      return x.origin === location.origin && /^\/[A-Za-z0-9/_.-]{0,119}$/.test(x.pathname) ? x.pathname : '';
    } catch (e) { return ''; }
  }

  /* ---- Where clicks land -------------------------------------------------
     As twentieths of the page's width and half-percent steps of its height,
     so a heatmap can be drawn for the page without knowing anybody's screen.
     A click on nothing clickable is "dead"; the third quick click in the same
     spot is "rage", and the ones after it are not counted again. A click from
     the keyboard has no position and is left out. */
  var heat = [];
  var recent = [];
  document.addEventListener('click', function (e) {
    if (!e.detail || heat.length >= 60 || !allowed()) return;
    var doc = document.documentElement;
    var w = Math.max(doc.scrollWidth, 1), h = Math.max(doc.scrollHeight, 1);
    var now = Date.now();
    recent = recent.filter(function (c) {
      return now - c.t < 800 && Math.abs(c.x - e.pageX) < 30 && Math.abs(c.y - e.pageY) < 30;
    });
    recent.push({ t: now, x: e.pageX, y: e.pageY });
    if (recent.length > 3) return;
    var live = e.target && e.target.closest && e.target.closest(
      'a,button,input,select,textarea,label,summary,video,[role="button"],[tabindex],[data-lb-prev],[data-lb-next]');
    heat.push({
      k: recent.length === 3 ? 'rage' : (live ? 'click' : 'dead'),
      s: sectionOf(e.target),
      x: Math.min(19, Math.max(0, Math.floor((e.pageX / w) * 20))),
      y: Math.min(199, Math.max(0, Math.floor((e.pageY / h) * 200))),
    });
  }, true);
  document.addEventListener('copy', function () {
    if (heat.length >= 60 || !allowed()) return;
    try {
      var n = window.getSelection && window.getSelection().anchorNode;
      var el = n && (n.nodeType === 1 ? n : n.parentElement);
      if (!el) return;
      var h = Math.max(document.documentElement.scrollHeight, 1);
      var top = el.getBoundingClientRect().top + (window.scrollY || 0);
      heat.push({ k: 'copy', s: sectionOf(el), x: 0, y: Math.min(199, Math.max(0, Math.floor((top / h) * 200))) });
    } catch (x) { /* nothing to count */ }
  });

  /* ---- How long each part of a page is on screen, and how fast it loaded */
  var dwell = {};
  var inView = {};
  var vitals = { lcp: 0, cls: 0, inp: 0 };
  var watching = false;
  function flushDwell() {
    var now = Date.now();
    Object.keys(inView).forEach(function (k) {
      if (inView[k]) { dwell[k] = (dwell[k] || 0) + (now - inView[k]); inView[k] = now; }
    });
  }
  function startWatching() {
    if (watching || !allowed()) return;
    watching = true;
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        var now = Date.now();
        entries.forEach(function (en) {
          var k = en.target.getAttribute('data-sa-sec');
          if (en.isIntersecting && en.intersectionRatio >= 0.4) { if (!inView[k]) inView[k] = now; }
          else if (inView[k]) { dwell[k] = (dwell[k] || 0) + (now - inView[k]); inView[k] = 0; }
        });
      }, { threshold: [0, 0.4] });
      Array.prototype.slice.call(document.querySelectorAll('section[id],section[aria-labelledby]'), 0, 40)
        .forEach(function (el) {
          var k = keyOf(el.id || el.getAttribute('aria-labelledby'));
          if (!k) return;
          el.setAttribute('data-sa-sec', k);
          io.observe(el);
        });
    }
    if (window.PerformanceObserver) {
      var watch = function (type, fn) {
        try {
          new PerformanceObserver(function (list) { list.getEntries().forEach(fn); })
            .observe({ type: type, buffered: true });
        } catch (e) { /* not supported here */ }
      };
      watch('largest-contentful-paint', function (en) { vitals.lcp = en.startTime; });
      watch('layout-shift', function (en) { if (!en.hadRecentInput) vitals.cls += en.value; });
      watch('event', function (en) { if (en.duration > vitals.inp) vitals.inp = en.duration; });
    }
    if (FUNNEL_PAGE[path]) step(FUNNEL_PAGE[path], 1);
  }
  var MS = [100, 200, 300, 500, 800, 1200, 1800, 2500, 4000, 6000, 10000, 15000];
  var SHIFT = [0.01, 0.025, 0.05, 0.1, 0.15, 0.25, 0.35, 0.5, 0.75, 1, 1.5, 2];
  function bandOf(v, steps) {
    for (var i = 0; i < steps.length; i++) { if (v <= steps[i]) return i; }
    return steps.length;
  }
  function perfNow() {
    var out = {};
    try {
      var nav = performance.getEntriesByType('navigation')[0];
      if (nav && nav.responseStart > 0) out.ttfb = bandOf(nav.responseStart, MS);
      if (nav && nav.loadEventEnd > 0) out.load = bandOf(nav.loadEventEnd, MS);
      var fcp = performance.getEntriesByName('first-contentful-paint')[0];
      if (fcp) out.fcp = bandOf(fcp.startTime, MS);
    } catch (e) { /* no timings in this browser */ }
    if (vitals.lcp) out.lcp = bandOf(vitals.lcp, MS);
    if (watching) out.cls = bandOf(vitals.cls, SHIFT);
    if (vitals.inp) out.inp = bandOf(vitals.inp, MS);
    return out;
  }

  /* ---- How far through a video --------------------------------------------- */
  var marked = {};
  function watched(v, mark) {
    var src = pathOf(v.currentSrc || v.src);
    if (!src || marked[src + mark]) return;
    marked[src + mark] = 1;
    rpc('record_page_media', { p_path: path, p_kind: 'video', p_media: src, p_mark: mark });
  }
  document.addEventListener('timeupdate', function (e) {
    var v = e.target;
    if (!v || v.tagName !== 'VIDEO' || !v.duration || !allowed()) return;
    var pct = (v.currentTime / v.duration) * 100;
    [25, 50, 75, 100].forEach(function (m) { if (pct >= (m === 100 ? 97 : m)) watched(v, m); });
  }, true);
  /* A photograph shown in the gallery viewer, once each per page. */
  document.addEventListener('sa-photo', function (e) {
    var src = pathOf(e.detail && e.detail.src);
    if (!src || marked[src + 'photo'] || !allowed()) return;
    marked[src + 'photo'] = 1;
    rpc('record_page_media', { p_path: path, p_kind: 'photo', p_media: src, p_mark: 0 });
  });

  /* ---- What broke, with nothing from the page in the message ---------------- */
  var broke = 0;
  function tidy(m) {
    return String(m || '').replace(/https?:\/\/\S+/g, '').replace(/[^A-Za-z .:_()-]/g, '').slice(0, 100);
  }
  window.addEventListener('error', function (e) {
    if (broke >= 5 || !allowed()) return;
    broke += 1;
    var t = e.target;
    if (t && t !== window && t.tagName) {
      rpc('record_page_error', { p_path: path, p_kind: 'resource', p_file: pathOf(t.src || t.href || ''),
        p_message: String(t.tagName).toLowerCase() });
    } else {
      rpc('record_page_error', { p_path: path, p_kind: 'error', p_file: pathOf(e.filename || ''),
        p_message: tidy(e.message) });
    }
  }, true);
  window.addEventListener('unhandledrejection', function (e) {
    if (broke >= 5 || !allowed()) return;
    broke += 1;
    var r = e.reason;
    rpc('record_page_error', { p_path: path, p_kind: 'promise', p_file: '',
      p_message: tidy((r && (r.name || r.message)) || 'rejection') });
  });

  /* ---- The browser and its settings, each counted on its own ----------------
     Sent together and split by the database into one row per setting, so no
     stored row ever combines them into something that singles out a device. */
  function contextNow() {
    var ua = navigator.userAgent || '';
    var mm = function (q) { try { return window.matchMedia(q).matches; } catch (e) { return false; } };
    var w = window.innerWidth || 0;
    var dpr = window.devicePixelRatio || 1;
    var conn = navigator.connection && navigator.connection.effectiveType;
    return {
      browser: /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
        : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome'
          : /Safari\//.test(ua) ? 'Safari' : 'Other',
      os: /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows'
        : /CrOS/.test(ua) ? 'ChromeOS' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Other',
      language: String(navigator.language || '').split('-')[0].slice(0, 8) || 'unknown',
      scheme: mm('(prefers-color-scheme: dark)') ? 'dark' : 'light',
      motion: mm('(prefers-reduced-motion: reduce)') ? 'reduced' : 'full',
      inapp: /Instagram/.test(ua) ? 'Instagram' : /FBAN|FBAV/.test(ua) ? 'Facebook'
        : /TikTok|musical_ly|BytedanceWebview/.test(ua) ? 'TikTok' : /Snapchat/.test(ua) ? 'Snapchat'
          : /LinkedInApp/.test(ua) ? 'LinkedIn' : /WhatsApp/.test(ua) ? 'WhatsApp' : 'none',
      connection: conn ? String(conn).slice(0, 10) : 'unknown',
      standalone: mm('(display-mode: standalone)') ? 'yes' : 'no',
      viewport: w < 360 ? 'under 360' : w < 768 ? '360 to 767' : w < 1024 ? '768 to 1023'
        : w < 1440 ? '1024 to 1439' : '1440 and over',
      touch: (navigator.maxTouchPoints || 0) > 0 ? 'yes' : 'no',
      density: dpr >= 3 ? '3x' : dpr >= 2 ? '2x' : '1x',
    };
  }

  /* ---- Steps towards getting involved ----------------------------------------
     A step counts once per tab and only after the one before it, so each
     funnel reads top to bottom. The tab remembers which steps it has counted
     in sa-funnel, which the browser deletes when the tab closes. */
  var FUNNEL_PAGE = { '/join.html': 'join', '/sponsors.html': 'sponsor', '/donate.html': 'donate',
    '/sepsis.html': 'donate', '/contact.html': 'contact', '/programme.html': 'programme' };
  function step(name, n) {
    if (!allowed()) return;
    try {
      var ss = window.sessionStorage;
      var got = JSON.parse(ss.getItem('sa-funnel') || '{}');
      if (n !== (got[name] || 0) + 1) return;
      got[name] = n;
      ss.setItem('sa-funnel', JSON.stringify(got));
      rpc('record_page_funnel', { p_funnel: name, p_step: n });
    } catch (e) { /* no storage, no funnel */ }
  }
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a || !allowed()) return;
    var href = a.getAttribute('href') || '';
    var file = a.hasAttribute('download') || /\.pdf($|\?)/i.test(href);
    if (/(^|\.)stripe\.com$/.test(a.hostname || '')) step('donate', 2);
    if (path === '/sponsors.html' && (file || /contact|#enquire|^mailto:/.test(href))) step('sponsor', 2);
    if (path === '/programme.html' && file) step('programme', 2);
  }, true);

  /* ---- Which form field people stop at: the field's name, never its value ---- */
  var focused = {};
  var lastField = null;
  var sentForms = {};
  function formName(f) {
    if (!f || f.id === 'cp-login' || f.id === 'cp-word') return '';
    return keyOf(f.hasAttribute('data-subscribe') ? 'newsletter'
      : (f.getAttribute('data-enquiry-type') ? 'enquiry-' + f.getAttribute('data-enquiry-type') : f.id));
  }
  document.addEventListener('focusin', function (e) {
    var el = e.target;
    var f = el && el.form;
    if (!f || !allowed()) return;
    var form = formName(f);
    var field = keyOf(el.name);
    if (!form || !field) return;
    lastField = { form: form, field: field };
    if (!focused[form + field]) {
      focused[form + field] = 1;
      rpc('record_page_field', { p_form: form, p_field: field, p_event: 'focus' });
    }
    if (f.hasAttribute('data-subscribe')) step('newsletter', 1);
    else if (path === '/join.html') step('join', 2);
    else if (path === '/contact.html') { step('contact', 2); step('sponsor', 3); }
  });
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f || !f.getAttribute || !allowed()) return;
    var form = formName(f);
    if (form) {
      sentForms[form] = 1;
      rpc('record_page_field', { p_form: form, p_field: 'form', p_event: 'sent' });
    }
    if (f.hasAttribute('data-subscribe')) step('newsletter', 2);
    else if (path === '/join.html') step('join', 3);
    else if (path === '/contact.html') { step('contact', 3); step('sponsor', 4); }
  }, true);

  /* ---- Returning visits: ONLY with a saved yes ---------------------------------
     sa-visits holds how many days this device has visited and the last one.
     Only a band is sent. Withdrawing the yes deletes it (20-consent.js). */
  function returning() {
    if (!consents('returning')) return;
    try {
      var today = new Date().toISOString().slice(0, 10);
      var v = JSON.parse(localStorage.getItem('sa-visits') || 'null') || { n: 0, l: '' };
      if (v.l === today) return;
      var gap = v.l ? Math.round((Date.parse(today) - Date.parse(v.l)) / 864e5) : -1;
      var n = (v.n || 0) + 1;
      localStorage.setItem('sa-visits', JSON.stringify({ n: n, l: today }));
      rpc('record_returning', {
        p_kind: n === 1 ? 'new' : 'returning',
        p_visits: n === 1 ? '1' : n <= 3 ? '2-3' : n <= 10 ? '4-10' : '11+',
        p_gap: gap < 0 ? '' : gap <= 7 ? 'within a week' : gap <= 31 ? 'within a month' : 'longer',
      });
    } catch (e) { /* no storage, no count */ }
  }

  function sourceKind() {
    var h = source();
    if (tag) return 'tag';
    if (!h) return 'direct';
    if (/(^|\.)(google|bing|duckduckgo|yahoo|ecosia|brave|yandex|baidu)\./.test('.' + h)) return 'search';
    if (/(^|\.)(facebook|fb|instagram|x|twitter|t|linkedin|lnkd|tiktok|whatsapp|reddit|youtube|threads|snapchat|pinterest)\./.test('.' + h)) return 'social';
    return 'other';
  }

  startWatching();
  document.addEventListener('sa-privacy', startWatching);
  /* The banner arrives after the boot screen; once it is on screen the
     visitor has been told, so look again just after. */
  setTimeout(startWatching, 4600);

  var sent = false;

  function send() {
    if (sent || !allowed()) return;
    sent = true;
    measureDepth();
    var trail = trailNow();
    try {
      window.saRpc('record_page_view', {
        p_path: path,
        p_zone: zone(),
        p_source: source(),
        p_device: device(),
        /* Seconds on the page, capped where a real reading session ends. A
           tab left open all afternoon is not four hours of reading, and an
           average is what this feeds. */
        p_seconds: Math.min(Math.round((Date.now() - started) / 1000), 3600),
        p_depth: depth,
      }, true).catch(function () {});
      /* The hour and the route go in a SEPARATE call. The hour used to ride
         on the one above, and on a database where 008 had not been run
         PostgREST found no function taking p_hour and refused the whole call:
         from 4 to 12 September 2026 not one view was recorded. Now a database
         without migrations/009_page_routes.sql loses these two and keeps
         counting everything else. The hour is the READER'S, not the server's. */
      window.saRpc('record_page_route', {
        p_path: path,
        p_from: from(),
        p_hour: hour(),
      }, true).catch(function () {});
      if (trail) window.saRpc('record_page_trail', { p_trail: trail }, true).catch(function () {});
      /* Where the reader is, worked out by Vercel from the connection: the
         browser does not know, so this goes through our own function. */
      fetch('/api/view' + (consents('sponsor') ? '?audience=1' : ''), { method: 'POST', keepalive: true, body: '{}',
        headers: { 'Content-Type': 'application/json' } }).catch(function () {});
      if (tag) {
        window.saRpc('record_page_tag', {
          p_path: path,
          p_tag: tag,
        }, true).catch(function () {});
      }
      /* The detail gathered while the page was open (migrations/012). */
      if (heat.length) rpc('record_page_heat', { p_path: path, p_device: device(), p_points: heat.splice(0, 60) });
      rpc('record_page_scroll', { p_path: path, p_band: Math.min(10, Math.floor(depth / 10)) });
      flushDwell();
      var parts = Object.keys(dwell).map(function (k) { return { s: k, t: Math.round(dwell[k] / 1000) }; })
        .filter(function (x) { return x.t >= 1; }).slice(0, 30);
      if (parts.length) rpc('record_page_sections', { p_path: path, p_sections: parts });
      rpc('record_page_perf', { p_path: path, p_device: device(), p_metrics: perfNow() });
      rpc('record_page_context', { p_dims: contextNow() });
      if (lastField && !sentForms[lastField.form]) {
        rpc('record_page_field', { p_form: lastField.form, p_field: lastField.field, p_event: 'leave' });
      }
      /* Only with a saved yes to figures for sponsors. */
      if (consents('sponsor')) {
        rpc('record_audience_view', { p_path: path, p_source_kind: sourceKind(), p_device: device(),
          p_seconds: Math.min(Math.round((Date.now() - started) / 1000), 3600) });
      }
      returning();
    } catch (e) { /* never a console error in exchange for a counter */ }
  }

  /* `visibilitychange` is the one that actually fires on a phone. `pagehide`
     covers the desktop close and the back/forward cache; `beforeunload` is
     deliberately not used, because registering one disables that cache in
     some browsers - a real cost to the reader for a counter. Both routes go
     through the same `sent` latch, so a tab hidden and re-shown records one
     view rather than one per glance. */
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') send();
  });
  window.addEventListener('pagehide', send);
}());
