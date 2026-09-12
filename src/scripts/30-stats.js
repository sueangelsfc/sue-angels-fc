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
    try {
      window.saRpc('record_page_event', {
        p_path: path,
        p_kind: kind,
        p_target: String(target || '').slice(0, 120),
      }, true).catch(function () {});
    } catch (e) { /* a click is never worth an error */ }
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
  var trail = '';
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
    if (!reload && route.length <= 9) trail = route.join('>');
  } catch (e) { trail = ''; }

  var sent = false;

  function send() {
    if (sent) return;
    sent = true;
    measureDepth();
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
      fetch('/api/view', { method: 'POST', keepalive: true, body: '{}',
        headers: { 'Content-Type': 'application/json' } }).catch(function () {});
      if (tag) {
        window.saRpc('record_page_tag', {
          p_path: path,
          p_tag: tag,
        }, true).catch(function () {});
      }
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
