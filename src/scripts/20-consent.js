/* ==========================================================================
   COOKIE CONSENT AND ANALYTICS

   Restored. The retired site had consent.js and analytics.js; the platform
   rebuild dropped both, so the live site has had no consent banner and no
   analytics since. The banner is the one that matters: a UK club site that
   loads Google Analytics without asking is a compliance problem, not a
   missing feature.

   The contract is deliberately the same as the old pair, so anything already
   wired to it keeps working:

     localStorage 'sa-consent'  = 'granted' | 'denied'
     window.SA_GA_ID            set it and GA4 loads, on consent
     window.SA_META_PIXEL_ID    set it and the Meta pixel loads, on consent
     window.saTrack(name, params)   the single tracking entry point

   Two things are better than the version it replaces.

   NOTHING third-party is fetched before consent. The old file loaded on
   every page and decided afterwards; this one never creates a script tag
   until the visitor has said yes, so declining means those requests never
   happen rather than happening and being ignored.

   And saTrack always works. With no analytics configured it still fires a
   `sa-track` DOM event and queues to dataLayer, so the club can wire up a
   tool later without touching a line of this, and so tracking calls
   elsewhere in the code are never a source of errors.

   The banner is BUILT by this script rather than shipped hidden in the
   markup: nothing on the page is concealed by CSS waiting for JavaScript to
   reveal it, which is the failure mode CLAUDE.md warns about.
   ========================================================================== */
(function () {
  'use strict';

  var KEY = 'sa-consent';
  var read = function () { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  var write = function (v) { try { localStorage.setItem(KEY, v); } catch (e) {} };

  /* ---- Tracking ------------------------------------------------------
     Safe to call at any time, from anywhere, consented or not. It queues
     and emits regardless; only the forwarding to a third party is gated. */
  window.saTrack = function (name, params) {
    var detail = params || {};
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: name, params: detail });
      document.dispatchEvent(new CustomEvent('sa-track', { detail: { name: name, params: detail } }));
    } catch (e) {}
    if (typeof window.gtag === 'function') {
      try { window.gtag('event', name, detail); } catch (e2) {}
    }
  };

  /* ---- Third-party loaders, only ever called after consent ---------- */
  var started = false;
  function startAnalytics() {
    if (started || read() !== 'granted') return;
    started = true;

    var ga = window.SA_GA_ID;
    if (ga) {
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ga);
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      /* anonymize_ip is not optional for a UK club site. */
      window.gtag('config', ga, { anonymize_ip: true });
    }

    var px = window.SA_META_PIXEL_ID;
    if (px && !window.fbq) {
      /* eslint-disable */
      !function (f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
        t = b.createElement(e); t.async = !0; t.src = v;
        s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
      }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      /* eslint-enable */
      window.fbq('init', px);
      window.fbq('track', 'PageView');
    }
  }
  window.saInitAnalytics = startAnalytics;

  /* ---- The banner ----------------------------------------------------
     Only built when there is a question to ask. Somebody who has already
     answered never sees it again, and a page with no analytics configured
     never asks, because there is nothing to consent to. */
  function decide(v) {
    write(v);
    var el = document.getElementById('sa-consent');
    if (el) el.remove();
    if (v === 'granted') startAnalytics();
    window.saTrack('consent_' + v);
  }

  function banner() {
    if (document.getElementById('sa-consent')) return;
    var el = document.createElement('div');
    el.id = 'sa-consent';
    el.className = 'consent';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Cookies');
    el.innerHTML =
      '<p class="consent__t">We use cookies to understand how the site is used. '
      + 'Nothing is loaded until you choose, and you can decline without losing anything. '
      + '<a href="/sepsis.html">More about the club</a></p>'
      + '<div class="consent__btns">'
      + '<button class="btn btn--ghost btn--sm" type="button" data-consent="denied">Decline</button>'
      + '<button class="btn btn--volt btn--sm" type="button" data-consent="granted">Accept</button>'
      + '</div>';
    document.body.appendChild(el);
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-consent]');
      if (b) decide(b.getAttribute('data-consent'));
    });
  }

  var choice = read();
  if (choice === 'granted') startAnalytics();
  /* Nothing to ask about if the club has configured no analytics at all. */
  else if (!choice && (window.SA_GA_ID || window.SA_META_PIXEL_ID)) {
    /* After the boot screen, so it never lands on top of the arrival. */
    if (document.getElementById('sa-boot')) setTimeout(banner, 11000);
    else banner();
  }
})();

/* ==========================================================================
   SERVICE WORKER REGISTRATION

   updateViaCache 'none' so the worker script itself is always revalidated:
   without it the browser may cache sw.js and keep running an old worker even
   after a deploy, which is the one bug a service worker must never have.
   ========================================================================== */
(function () {
  if (!('serviceWorker' in navigator) || location.protocol !== 'https:') return;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(function () {});
  });
})();
