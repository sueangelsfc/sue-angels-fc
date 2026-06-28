/* consent.js, GDPR cookie-consent banner for Sue's Angels FC.
   Nothing third-party (Google Analytics, Meta Pixel) loads until the visitor
   accepts. This is the single owner of analytics loading.

   • Choice is stored in localStorage('sa-consent') = 'granted' | 'denied'.
   • On 'granted' (now or on a later visit) it loads:
       - Google Analytics 4   if window.SA_GA_ID      is set
       - Meta (Facebook) Pixel if window.SA_META_PIXEL_ID is set
     Both no-op gracefully when their ID is empty, so this is safe to ship
     before either is configured.
   • window.saInitAnalytics(), idempotent loader; SiteApp.js calls it on mount,
     and it only does anything once consent is 'granted'.
   • window.saOpenConsent(), re-open the banner (e.g. a footer "Cookies" link).
   All work is wrapped so it can never throw and break the page. */
(function () {
  "use strict";
  var KEY = "sa-consent";
  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  // ---- analytics loaders (only run once, only after consent) ---------------
  window.saInitAnalytics = function () {
    if (get() !== "granted" || window.__saAnalytics) return;
    window.__saAnalytics = 1;
    // Google Analytics 4
    var ga = window.SA_GA_ID;
    if (ga) {
      var s = document.createElement("script");
      s.async = true;
      s.src = "https://www.googletagmanager.com/gtag/js?id=" + ga;
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", ga, { anonymize_ip: true });
    }
    // Meta (Facebook) Pixel
    var px = window.SA_META_PIXEL_ID;
    if (px) {
      !function (f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
        t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
      }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
      window.fbq("init", px);
      window.fbq("track", "PageView");
    }
  };

  // ---- banner UI -----------------------------------------------------------
  function removeBanner() { var b = document.getElementById("sa-consent"); if (b) b.remove(); }
  function decide(v) { set(v); removeBanner(); if (v === "granted") { try { window.saInitAnalytics(); } catch (e) {} } }

  function showBanner() {
    if (document.getElementById("sa-consent")) return;
    var wrap = document.createElement("div");
    wrap.id = "sa-consent";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-label", "Cookie consent");
    wrap.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:9999;display:flex;justify-content:center;padding:14px;pointer-events:none";
    wrap.innerHTML =
      '<div style="pointer-events:auto;max-width:760px;width:100%;display:flex;gap:16px;align-items:center;flex-wrap:wrap;' +
      'background:rgba(12,17,30,0.92);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);' +
      'border:1px solid rgba(255,255,255,0.10);border-radius:18px;padding:16px 18px;box-shadow:0 24px 60px -24px rgba(0,0,0,0.7)">' +
        '<p style="margin:0;flex:1 1 280px;min-width:240px;color:#C9D2E2;font:500 13.5px/1.55 ' +
        "'Hanken Grotesk',system-ui,sans-serif" + '">We use cookies to understand traffic and improve the site. ' +
        'You can accept or decline. <a href="sepsis.html" style="color:#D6F23A;text-decoration:underline">More about the club</a>.</p>' +
        '<div style="display:flex;gap:10px;flex:0 0 auto">' +
          '<button id="sa-consent-no" style="cursor:pointer;border:1px solid rgba(255,255,255,0.18);background:transparent;color:#C9D2E2;' +
          'font:700 13px ' + "'Hanken Grotesk',system-ui,sans-serif" + ';padding:10px 16px;border-radius:999px">Decline</button>' +
          '<button id="sa-consent-yes" style="cursor:pointer;border:0;background:#D6F23A;color:#0A0F1C;' +
          'font:700 13px ' + "'Hanken Grotesk',system-ui,sans-serif" + ';padding:10px 18px;border-radius:999px">Accept</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap);
    var yes = document.getElementById("sa-consent-yes"), no = document.getElementById("sa-consent-no");
    if (yes) yes.addEventListener("click", function () { decide("granted"); });
    if (no) no.addEventListener("click", function () { decide("denied"); });
  }

  window.saOpenConsent = function () { try { showBanner(); } catch (e) {} };

  function boot() {
    try {
      var c = get();
      if (c === "granted") { window.saInitAnalytics(); }
      else if (c !== "denied") { showBanner(); }   // null => ask
    } catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
