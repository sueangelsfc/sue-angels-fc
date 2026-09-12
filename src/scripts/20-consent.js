/* ==========================================================================
   PRIVACY: WHAT THE VISITOR IS TOLD, AND WHAT THEY CHOOSE

   The law this is built to (checked September 2026): PECR regulation 6 as
   amended by the Data (Use and Access) Act 2025, in force 5 February 2026,
   and the ICO's final guidance on storage and access technologies, April 2026.

   TWO KINDS OF THING, TREATED DIFFERENTLY
   - ANONYMOUS STATISTICS (src/scripts/30-stats.js, and the home page's band
     counter) fall under the statistics exception: no consent is needed, but
     ONLY for aggregate figures used to improve this website, ONLY once the
     visitor has clear information, and ONLY while they have not objected. So
     it is ON by default and switchable OFF, and `saPrivacy.allows('stats')` is
     false until this banner has been on screen or a choice has been saved.
   - EVERYTHING ELSE NEEDS CONSENT: Google Analytics and the Meta pixel (when
     configured), and any future purpose that is not statistics for improving
     the site - figures shown to sponsors included, because sharing for a
     commercial purpose is outside the exception. OFF by default. A default is
     never consent: `allows()` for these needs a SAVED choice.

   HONOURED ANYWAY: a browser's Global Privacy Control or Do Not Track signal
   is treated as an objection to statistics too. The law does not require it.

   "Reject all" is exactly as prominent as "Accept all", every purpose can be
   changed later from "Privacy settings" in the footer, and turning something
   off clears what it had stored on the device. Nothing third-party is ever
   fetched before a choice to allow it.

   Stored on the device: localStorage 'sa-privacy', the choice itself, which
   is recording a selection the visitor made (strictly necessary).
   ========================================================================== */
(function () {
  'use strict';

  var KEY = 'sa-privacy';
  var VERSION = 1;

  var signalled = (function () {
    try {
      return navigator.globalPrivacyControl === true || navigator.doNotTrack === '1'
        || window.doNotTrack === '1';
    } catch (e) { return false; }
  }());

  function stored() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || 'null');
      return v && v.v === VERSION ? v : null;
    } catch (e) { return null; }
  }
  var choice = stored();
  var informed = !!choice;

  function prefs() {
    return choice || { v: VERSION, stats: !signalled, google: false, meta: false };
  }
  function read() {
    var p = prefs();
    return choice && (p.google || p.meta) ? 'granted' : 'denied';
  }

  window.saPrivacy = {
    allows: function (purpose) {
      var p = prefs();
      if (purpose === 'stats') return informed && !!p.stats;
      return !!choice && !!p[purpose];
    },
    open: function () { show(true); },
  };

  /* ---- Tracking ------------------------------------------------------
     Safe to call at any time. It queues a DOM event for the club's own code;
     only forwarding to a third party is gated, and only on consent. */
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

  /* ---- Third parties, only ever after consent to that one ------------- */
  var startedGA = false;
  function startAnalytics() {
    if (read() !== 'granted') return;
    var p = prefs();
    var ga = window.SA_GA_ID;
    if (p.google && ga && !startedGA) {
      startedGA = true;
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ga);
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', ga, { anonymize_ip: true });
    }
    var px = window.SA_META_PIXEL_ID;
    if (p.meta && px && !window.fbq) {
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

  /* ---- The choices -------------------------------------------------- */
  function purposes() {
    var list = [['stats', 'Anonymous statistics',
      'Counts which pages are read, roughly which town visits come from, what sent people '
      + 'and how they move around the site, so the club can make it better. Nothing that '
      + 'identifies you is kept, and nothing is shared for any other purpose. On unless you '
      + 'turn it off.']];
    if (window.SA_GA_ID) {
      list.push(['google', 'Google Analytics',
        'Google measures your visit for the club. Google receives information about it. Off unless you turn it on.']);
    }
    if (window.SA_META_PIXEL_ID) {
      list.push(['meta', 'Meta pixel',
        'Meta measures visits from Facebook and Instagram and may use them for adverts. Meta receives information about your visit. Off unless you turn it on.']);
    }
    return list;
  }

  function decide(next) {
    var had = prefs();
    choice = { v: VERSION, stats: !!next.stats, google: !!next.google, meta: !!next.meta,
      at: new Date().toISOString().slice(0, 10) };
    informed = true;
    try {
      localStorage.setItem(KEY, JSON.stringify(choice));
      localStorage.removeItem('sa-consent');
    } catch (e) {}
    /* Objecting stops it AND clears what it had stored. */
    if (!choice.stats) {
      try { sessionStorage.removeItem('sa-trail'); } catch (e) {}
      try { localStorage.removeItem('sa-bandviews-off'); } catch (e) {}
    }
    if (window.SA_GA_ID && had.google && !choice.google) window['ga-disable-' + window.SA_GA_ID] = true;
    hide();
    startAnalytics();
    try { document.dispatchEvent(new CustomEvent('sa-privacy', { detail: choice })); } catch (e) {}
    /* A third-party script cannot be unloaded, so withdrawing consent to one
       that is already running reloads the page without it. */
    if ((had.google && !choice.google && startedGA) || (had.meta && !choice.meta && window.fbq)) {
      location.reload();
    }
  }

  function hide() {
    var el = document.getElementById('sa-consent');
    if (el) el.remove();
  }

  function show(choosing) {
    var el = document.getElementById('sa-consent');
    if (!el) {
      var p = prefs();
      var list = purposes();
      el = document.createElement('div');
      el.id = 'sa-consent';
      el.className = 'consent';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-labelledby', 'sa-consent-h');
      el.innerHTML =
        '<div class="consent__main">'
        + '<p class="consent__h" id="sa-consent-h">Your privacy on this site</p>'
        + '<p class="consent__t">We count visits anonymously to make the site better: which pages are '
        + 'read, roughly where from, and how people move around. Nothing identifies you, and you can '
        + 'turn it off now or at any time.' + (list.length > 1 ? ' Anything else is off unless you '
        + 'say yes.' : '') + ' <a href="/privacy.html">What we count, and the law</a></p></div>'
        + '<fieldset class="consent__opts" hidden><legend class="sr-only">Choose what to allow</legend>'
        + list.map(function (x) {
          return '<label class="consent__opt"><input type="checkbox" data-purpose="' + x[0] + '"'
            + (p[x[0]] ? ' checked' : '') + '><span><b>' + x[1] + '</b><small>' + x[2]
            + '</small></span></label>';
        }).join('')
        + '</fieldset>'
        + '<div class="consent__btns">'
        + '<button class="btn btn--volt btn--sm" type="button" data-choice="none">Reject all</button>'
        + '<button class="btn btn--ghost btn--sm" type="button" data-choice="choose">Choose</button>'
        + '<button class="btn btn--ghost btn--sm" type="button" data-choice="save" hidden>Save my choices</button>'
        + '<button class="btn btn--volt btn--sm" type="button" data-choice="all">Accept all</button>'
        + '</div>';
      document.body.appendChild(el);
      el.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('[data-choice]') : null;
        if (!b) return;
        var what = b.getAttribute('data-choice');
        var next = {};
        if (what === 'choose') { show(true); return; }
        purposes().forEach(function (x) {
          var box = el.querySelector('[data-purpose="' + x[0] + '"]');
          next[x[0]] = what === 'all' ? true : (what === 'none' ? false : !!(box && box.checked));
        });
        decide(next);
      });
    }
    /* On screen is the moment the visitor has been told. */
    informed = true;
    if (choosing) {
      el.querySelector('.consent__opts').hidden = false;
      el.querySelector('[data-choice="choose"]').hidden = true;
      el.querySelector('[data-choice="save"]').hidden = false;
      var first = el.querySelector('input[data-purpose]');
      if (first) first.focus();
    }
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-privacy-open]') : null;
    if (!b) return;
    e.preventDefault();
    show(true);
  });

  if (choice) startAnalytics();
  /* After the boot screen, so it never lands on top of the arrival, and
     until then nothing is counted: the visitor has not been told yet. */
  else if (document.getElementById('sa-boot')) setTimeout(function () { show(false); }, 4200);
  else show(false);
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
