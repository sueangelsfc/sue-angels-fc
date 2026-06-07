/* analytics.js — lightweight, non-invasive event tracking for Sue's Angels FC.
   • Defines window.saTrack(name, params) — the single tracking entry point.
   • Forwards to Google Analytics (gtag) when window.SA_GA_ID is set, otherwise
     it no-ops gracefully (still queues to dataLayer + fires a `sa-track` DOM
     event, so GA / GTM / any future tool can be wired up later with zero code
     changes here).
   • Auto-tracks the high-value journeys (donations, sponsors, contact, social,
     outbound, content views) by reading the DOM on click — so it needs NO edits
     to SiteApp.js.  All work is wrapped so it can never break the page. */
(function () {
  "use strict";

  // ---- core dispatch -------------------------------------------------------
  window.dataLayer = window.dataLayer || [];
  window.saTrack = function (name, params) {
    try {
      var payload = Object.assign({ event: name }, params || {});
      window.dataLayer.push(payload);
      if (typeof window.gtag === "function") window.gtag("event", name, params || {});
      document.dispatchEvent(new CustomEvent("sa-track", { detail: payload }));
      if (window.SA_DEBUG_ANALYTICS) console.debug("[saTrack]", name, params || {});
    } catch (e) { /* never let tracking throw */ }
  };

  // ---- helpers -------------------------------------------------------------
  function host() { return location.host; }
  function isExternal(a) {
    return a.host && a.host !== host() && /^https?:$/.test(a.protocol);
  }
  var SOCIAL = [
    [/instagram\.com/i, "instagram"],
    [/tiktok\.com/i, "tiktok"],
    [/facebook\.com|fb\.com/i, "facebook"],
    [/youtube\.com|youtu\.be/i, "youtube"],
    [/twitter\.com|x\.com/i, "twitter"]
  ];
  function social(url) {
    for (var i = 0; i < SOCIAL.length; i++) if (SOCIAL[i][0].test(url)) return SOCIAL[i][1];
    return null;
  }
  function looksDonation(txt, url) {
    return /donate|paypal|stripe|justgiving|gofundme/i.test(url) ||
           /\b(donate|back the club|support the club|chip in)\b/i.test(txt);
  }
  function looksSponsor(txt, url, a) {
    return (a.getAttribute("rel") || "").indexOf("sponsor") > -1 ||
           /sponsor|partner|enquir/i.test(txt) ||
           (/sponsors\.html/.test(location.pathname) && isExternal(a));
  }

  // ---- delegated click tracking -------------------------------------------
  document.addEventListener("click", function (ev) {
    try {
      var a = ev.target && ev.target.closest ? ev.target.closest("a,button") : null;
      if (!a) return;
      var href = a.getAttribute("href") || "";
      var txt = (a.textContent || "").trim().slice(0, 80);

      if (href.indexOf("mailto:") === 0) { window.saTrack("contact_click", { method: "email", value: href.replace("mailto:", "") }); return; }
      if (href.indexOf("tel:") === 0)    { window.saTrack("contact_click", { method: "phone", value: href.replace("tel:", "") }); return; }

      if (looksDonation(txt, href)) { window.saTrack("donation_click", { label: txt, url: href }); return; }

      // anchors: read resolved host via a temporary check
      var isLink = a.tagName === "A" && href && href[0] !== "#";
      if (isLink) {
        var net = social(href);
        if (net) { window.saTrack("social_click", { network: net, url: href }); return; }
        if (looksSponsor(txt, href, a)) { window.saTrack("sponsor_click", { label: txt, url: href }); return; }
        if (isExternal(a)) { window.saTrack("outbound_click", { url: href, host: a.host, label: txt }); return; }
      } else if (a.tagName === "BUTTON" && looksSponsor(txt, href, a)) {
        window.saTrack("sponsor_click", { label: txt }); return;
      }
    } catch (e) { /* swallow */ }
  }, true);

  // ---- form submissions ----------------------------------------------------
  document.addEventListener("submit", function (ev) {
    try {
      var f = ev.target;
      if (f && f.tagName === "FORM") {
        window.saTrack("form_submit", { id: f.id || f.getAttribute("name") || "form", page: location.pathname });
      }
    } catch (e) { /* swallow */ }
  }, true);

  // ---- page-level content views -------------------------------------------
  var SECTION = {
    "/fixtures.html": "fixtures", "/results.html": "results", "/table.html": "table",
    "/schedule.html": "schedule", "/league.html": "league", "/media.html": "media", "/news.html": "news",
    "/gallery.html": "gallery", "/sponsors.html": "sponsors", "/sepsis.html": "sepsis", "/teams.html": "team",
    "/champions.html": "champions"
  };
  (function () {
    var s = SECTION[location.pathname] || SECTION[location.pathname.replace(/\/$/, "")];
    if (s) window.saTrack("content_view", { section: s });
  })();
})();
