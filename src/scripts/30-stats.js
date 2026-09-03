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
        /* The READER'S hour, not the server's. "People read this at eight in
           the evening" is a fact about a habit; converted to a server clock it
           would be a fact about nothing. It is recorded in its own table,
           carrying no zone, source or device, so it cannot narrow a bucket
           down to one person - see migrations/008_page_stats_detail.sql. */
        p_hour: hour(),
      }, true).catch(function () {});
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
