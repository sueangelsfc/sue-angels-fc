window.SA_SUPABASE={"url":"https://hvbquuvxcswylyguplfb.supabase.co","anonKey":"sb_publishable_2VEdxWZCLW98qItINt6TPQ_r7y_Tcly"};window.SA_EMAIL="suesangelsfc@gmail.com";
/* ==========================================================================
   PUBLIC INTERACTION LAYER
   Progressive enhancement only. Every page is fully readable with this file
   blocked; nothing here is required to see content.
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var on = function (el, ev, fn, opt) { if (el) el.addEventListener(ev, fn, opt); };

  /* ---- Supabase REST ---------------------------------------------------
     Direct REST calls rather than the SDK: an insert is one fetch, and this
     keeps ~40KB of JavaScript off every page. */
  var SB = window.SA_SUPABASE || {};
  function sbInsert(table, row) {
    if (!SB.url || !SB.anonKey) return Promise.reject(new Error('no-config'));
    return fetch(SB.url + '/rest/v1/' + table, {
      method: 'POST',
      headers: {
        apikey: SB.anonKey,
        Authorization: 'Bearer ' + SB.anonKey,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    }).then(function (r) {
      if (!r.ok) throw new Error('supabase-' + r.status);
      return true;
    });
  }

  /* ---- Toasts --------------------------------------------------------- */
  function toast(msg, kind) {
    var host = $('[data-toasts]');
    if (!host) return;
    var el = document.createElement('div');
    el.className = 'toast glass glass--pill' + (kind ? ' toast--' + kind : '');
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(function () {
      el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 260);
    }, 4600);
  }
  window.saToast = toast;

  /* ---- Theme ----------------------------------------------------------
     There isn't one. The club is black and orange and the site is black and
     orange, on every page and every machine. The switcher, the stored
     preference and the system-preference follow are all gone. */

  /* ---- Header stuck state ---------------------------------------------
     On the homepage the header sits over a tall dark hero, so it must keep
     its light-on-dark treatment until the hero has actually scrolled past.
     Switching at 12px would turn the links dark while still over the photo. */
  var hdr = $('[data-header]');
  if (hdr) {
    var heroFrame = $('.hx__frame');
    var onScroll = function () {
      hdr.classList.toggle('is-stuck', window.scrollY > 12);
      if (!heroFrame) return;
      // Transparent treatment only while the hero is genuinely behind the
      // header. Flipping on raw scrollY would darken the links while they
      // were still sitting on the photograph.
      var past = heroFrame.offsetTop + heroFrame.offsetHeight - hdr.offsetHeight - 8;
      hdr.classList.toggle('is-over-hero', window.scrollY <= past);
    };
    on(window, 'scroll', onScroll, { passive: true });
    on(window, 'resize', onScroll);
    onScroll();
  }

  /* ---- Mobile nav ----------------------------------------------------- */
  var mnav = $('#mobile-nav');
  var opener = $('[data-mnav-open]');
  var lastFocus = null;

  function trapFocus(e) {
    if (e.key !== 'Tab' || !mnav || mnav.hidden) return;
    var f = $$('a[href], button:not([disabled]), input, select, textarea', mnav)
      .filter(function (el) { return el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0];
    var last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function openNav() {
    if (!mnav) return;
    lastFocus = document.activeElement;
    mnav.hidden = false;
    if (opener) opener.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    var f = $('a, button', mnav);
    if (f) f.focus();
    on(document, 'keydown', trapFocus);
  }
  function closeNav() {
    if (!mnav || mnav.hidden) return;
    mnav.hidden = true;
    if (opener) opener.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', trapFocus);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  on(opener, 'click', openNav);
  $$('[data-mnav-close]').forEach(function (b) { on(b, 'click', closeNav); });
  on(document, 'keydown', function (e) { if (e.key === 'Escape') closeNav(); });
  if (mnav) $$('a', mnav).forEach(function (a) { on(a, 'click', closeNav); });

  /* ---- Nav dropdowns --------------------------------------------------
     CSS opens these on hover AND focus-within, which is what lets a keyboard
     user tab straight in. Escape therefore has to move focus back to the
     trigger first - otherwise focus-within keeps the menu open and the key
     appears to do nothing. */
  $$('[data-navgroup]').forEach(function (group) {
    var trigger = $('[data-navtrigger]', group);
    var dd = $('.nav__dd', group);
    if (!trigger || !dd) return;

    on(trigger, 'click', function (e) {
      e.preventDefault();
      var open = group.getAttribute('data-open') === 'true';
      $$('[data-navgroup]').forEach(function (g) {
        g.setAttribute('data-open', 'false');
        var t = $('[data-navtrigger]', g);
        if (t) t.setAttribute('aria-expanded', 'false');
      });
      if (!open) {
        group.setAttribute('data-open', 'true');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });

    on(group, 'keydown', function (e) {
      if (e.key !== 'Escape') return;
      trigger.focus();
      group.setAttribute('data-open', 'false');
      trigger.setAttribute('aria-expanded', 'false');
    });

    on(group, 'focusin', function () { trigger.setAttribute('aria-expanded', 'true'); });
    on(group, 'focusout', function () {
      if (!group.contains(document.activeElement) && group.getAttribute('data-open') !== 'true') {
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
  });
  on(document, 'click', function (e) {
    if (e.target.closest('[data-navgroup]')) return;
    $$('[data-navgroup]').forEach(function (g) {
      g.setAttribute('data-open', 'false');
      var t = $('[data-navtrigger]', g);
      if (t) t.setAttribute('aria-expanded', 'false');
    });
  });

  /* ---- Scroll reveal --------------------------------------------------
     Only ever adds a class. The hidden state is scoped to html.js in CSS, so
     if this never runs nothing is hidden. */
  var reveals = $$('.reveal');
  if (reveals.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---- Filter chips --------------------------------------------------- */
  $$('[data-filter-list]').forEach(function (list) {
    var scope = list.closest('main') || document;
    var chips = $$('[data-filter]', scope);
    if (!chips.length) return;
    chips.forEach(function (chip) {
      on(chip, 'click', function () {
        var want = chip.getAttribute('data-filter');
        chips.forEach(function (c) {
          var active = c === chip;
          c.classList.toggle('is-active', active);
          c.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        $$('[data-competition]', list).forEach(function (item) {
          var match = want === 'all' || item.getAttribute('data-competition') === want;
          item.hidden = !match;
        });
      });
    });
  });

  /* ---- Table filter --------------------------------------------------- */
  $$('[data-table-filter]').forEach(function (input) {
    var target = $(input.getAttribute('data-table-filter'));
    if (!target) return;
    on(input, 'input', function () {
      var q = input.value.trim().toLowerCase();
      $$('tbody tr', target).forEach(function (tr) {
        tr.hidden = q ? tr.textContent.toLowerCase().indexOf(q) === -1 : false;
      });
    });
  });

  /* ---- Share ---------------------------------------------------------- */
  $$('[data-share]').forEach(function (btn) {
    on(btn, 'click', function () {
      var data = { title: document.title, url: location.href };
      if (navigator.share) {
        navigator.share(data).catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(location.href)
          .then(function () { toast('Link copied', 'success'); })
          .catch(function () { toast('Could not copy the link', 'error'); });
      }
    });
  });

  /* ---- Enquiry forms -------------------------------------------------
     Writes to Supabase AND posts an email alert. It succeeds if EITHER
     lands, but Supabase is what guarantees the lead is recorded: the email
     endpoint is a graceful no-op until its API key is configured, so a
     form that only emailed would silently record nothing. */
  $$('form[data-enquiry]').forEach(function (form) {
    var status = $('[data-enquiry-status]', form);
    var summary = $('[data-error-summary]', form);
    var list = $('[data-error-list]', form);
    var requiresMessage = form.hasAttribute('data-enquiry-requires-message');

    function setError(name, msg) {
      var field = form.querySelector('[name="' + name + '"]');
      var out = form.querySelector('[data-error-for="' + name + '"]');
      if (field) field.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (out) { out.textContent = msg || ''; out.hidden = !msg; }
      return msg ? { name: name, msg: msg, field: field } : null;
    }

    on(form, 'submit', function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var name = String(fd.get('name') || '').trim();
      var email = String(fd.get('email') || '').trim();
      var message = String(fd.get('message') || '').trim();
      var errors = [];

      errors.push(setError('name', name ? '' : 'Please tell us your name'));
      errors.push(setError('email', /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? '' : 'Please enter a valid email address'));
      errors.push(setError('message', !requiresMessage || message ? '' : 'Please add a short message'));
      errors.push(setError('consent', fd.get('consent') ? '' : 'Please confirm we can contact you'));
      errors = errors.filter(Boolean);

      if (errors.length) {
        if (summary && list) {
          list.innerHTML = errors.map(function (er) {
            return '<li><a href="#' + (er.field && er.field.id ? er.field.id : '') + '">' + er.msg + '</a></li>';
          }).join('');
          summary.hidden = false;
          summary.focus && summary.focus();
        }
        if (errors[0].field) errors[0].field.focus();
        return;
      }
      if (summary) summary.hidden = true;

      var btn = $('button[type="submit"]', form);
      if (btn) btn.setAttribute('data-loading', 'true');
      if (status) status.textContent = 'Sending...';

      var row = {
        name: name,
        email: email,
        phone: String(fd.get('phone') || '').trim() || null,
        subject: String(fd.get('subject') || '').trim() || null,
        message: message || null,
        type: String(fd.get('enquiryType') || form.getAttribute('data-enquiry-type') || 'general'),
        source: location.pathname,
      };

      var toDb = sbInsert('enquiries', row).then(function () { return 'db'; }, function () { return null; });
      var toMail = fetch('/api/notify-enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row),
      }).then(function (r) { return r.ok ? 'mail' : null; }, function () { return null; });

      Promise.all([toDb, toMail]).then(function (res) {
        if (btn) btn.removeAttribute('data-loading');
        var landed = res.filter(Boolean);
        if (landed.length) {
          var ok = form.getAttribute('data-enquiry-ok') || 'Thank you. We will be in touch shortly.';
          form.reset();
          if (status) status.textContent = ok;
          toast(ok, 'success');
        } else {
          var msg = 'We could not send that. Please email ' + (window.SA_EMAIL || 'the club') + ' instead.';
          if (status) status.textContent = msg;
          toast(msg, 'error');
        }
      });
    });
  });

  /* ---- Newsletter ----------------------------------------------------- */
  $$('form[data-subscribe]').forEach(function (form) {
    var msg = $('[data-sub-msg]', form);
    on(form, 'submit', function (e) {
      e.preventDefault();
      var input = $('input[name="email"]', form);
      var email = input ? input.value.trim() : '';
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        if (msg) { msg.textContent = 'Please enter a valid email address'; msg.hidden = false; }
        if (input) input.setAttribute('aria-invalid', 'true');
        return;
      }
      if (input) input.setAttribute('aria-invalid', 'false');
      var btn = $('button[type="submit"]', form);
      if (btn) btn.setAttribute('data-loading', 'true');

      var toDb = sbInsert('supporters', { email: email, source: location.pathname })
        .then(function () { return 'db'; }, function () { return null; });
      var toApi = fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email }),
      }).then(function (r) { return r.ok ? 'api' : null; }, function () { return null; });

      Promise.all([toDb, toApi]).then(function (res) {
        if (btn) btn.removeAttribute('data-loading');
        if (res.filter(Boolean).length) {
          form.reset();
          if (msg) { msg.hidden = true; }
          toast('You are on the list. Thank you.', 'success');
        } else if (msg) {
          msg.textContent = 'Could not sign you up just now. Please try again later.';
          msg.hidden = false;
        }
      });
    });
  });

  /* ---- Lightbox ------------------------------------------------------- */
  var lb = null;
  function openLightbox(items, index) {
    closeLightbox();
    var i = index;
    lb = document.createElement('div');
    lb.className = 'modal-backdrop';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Photograph viewer');
    lb.innerHTML =
      '<div style="position:relative;max-width:min(96vw,1200px);width:100%">' +
        '<img alt="" style="width:100%;max-height:82vh;object-fit:contain;border-radius:var(--radius-lg)">' +
        '<div class="row" style="justify-content:center;margin-top:var(--space-4)">' +
          '<button class="icon-btn icon-btn--glass" data-lb-prev aria-label="Previous photograph">&larr;</button>' +
          '<span data-lb-count style="font-size:var(--step--1);color:#fff;min-width:6ch;text-align:center"></span>' +
          '<button class="icon-btn icon-btn--glass" data-lb-next aria-label="Next photograph">&rarr;</button>' +
          '<button class="icon-btn icon-btn--glass" data-lb-close aria-label="Close viewer">&times;</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(lb);
    document.body.style.overflow = 'hidden';

    var img = $('img', lb);
    var count = $('[data-lb-count]', lb);
    function show() {
      i = (i + items.length) % items.length;
      img.src = items[i];
      count.textContent = (i + 1) + ' / ' + items.length;
    }
    show();
    on($('[data-lb-prev]', lb), 'click', function () { i--; show(); });
    on($('[data-lb-next]', lb), 'click', function () { i++; show(); });
    on($('[data-lb-close]', lb), 'click', closeLightbox);
    on(lb, 'click', function (e) { if (e.target === lb) closeLightbox(); });
    on(document, 'keydown', lbKeys);
    $('[data-lb-close]', lb).focus();
  }
  function lbKeys(e) {
    if (!lb) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') { var p = $('[data-lb-prev]', lb); if (p) p.click(); }
    if (e.key === 'ArrowRight') { var n = $('[data-lb-next]', lb); if (n) n.click(); }
  }
  function closeLightbox() {
    if (!lb) return;
    lb.remove();
    lb = null;
    document.body.style.overflow = '';
    document.removeEventListener('keydown', lbKeys);
  }
  $$('[data-lightbox]').forEach(function (grid) {
    var buttons = $$('[data-full]', grid);
    var srcs = buttons.map(function (b) { return b.getAttribute('data-full'); });
    buttons.forEach(function (b, idx) { on(b, 'click', function () { openLightbox(srcs, idx); }); });
  });

  /* ---- The club word ---------------------------------------------------
     Type "angels" anywhere on the website and it opens the control panel
     sign-in. There is no link to /control.html in the navigation, the footer
     or the sitemap, so this is how the club gets in: the door is where you
     know it is rather than where a stranger can find it.

     It is a doorway, not a lock, and nothing about it pretends otherwise. The
     word is in a file anyone can download. What it buys is that somebody
     poking at the site never meets a login form at all. Identity is still
     Supabase Auth and permission is still the admin_users registry, and this
     cannot grant either.

     Ignored while the visitor is typing into a field, or the word "angels" in
     a message on the join form would throw them out of it mid-sentence.
     Modifier chords are ignored too, so it cannot fire on a shortcut. */
  var wordBuf = '';
  on(document, 'keydown', function (e) {
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA'
      || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (!e.key || e.key.length !== 1) return;
    wordBuf = (wordBuf + e.key).toLowerCase().slice(-12);
    if (wordBuf.indexOf('angels') === -1) return;
    wordBuf = '';
    /* Same key the panel checks, so arriving this way goes straight to the
       sign-in rather than asking for the word a second time. */
    try { sessionStorage.setItem('sa-cp-word', 'angels'); } catch (err) {}
    location.href = '/control.html';
  });

  /* ---- Join: route cards preset the enquiry menu ----------------------
     Pure enhancement. The cards are anchors to #enquire and the menu is a
     real <select> inside the form, so with this script dead the page still
     works: you land on the form and pick your route. All this adds is
     choosing it for you, and putting the cursor in the first field.

     Deliberately not preventDefault: the browser's own jump to #enquire is
     what respects prefers-reduced-motion, and duplicating it here with
     scrollIntoView would override that. */
  var joinSelect = $('[data-join-select]');
  if (joinSelect) {
    $$('[data-join-route]').forEach(function (card) {
      on(card, 'click', function () {
        var want = card.getAttribute('data-join-route');
        var match = false;
        $$('option', joinSelect).forEach(function (o) { if (o.value === want) match = true; });
        if (!match) return;
        joinSelect.value = want;
        /* Focus lands on the first thing left to fill in, not on the menu we
           just answered. Deferred past the hash jump so the browser does not
           scroll twice. */
        var first = $('#jn-name');
        if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 340);
      });
    });
  }
})();

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

  /* ---- In-hero navigation dropdowns -----------------------------------
     CSS also opens these on :focus-within, which is what lets a keyboard user
     tab in. Escape therefore has to move focus back to the trigger before
     closing, or focus-within holds the panel open and the key looks dead. */
  (function () {
    var groups = $$('.hx__navgrp');
    if (!groups.length) return;
    var closeAll = function (except) {
      groups.forEach(function (g) {
        if (g === except) return;
        g.classList.remove('is-open');
        var t = $('.hx__navtrig', g);
        if (t) t.setAttribute('aria-expanded', 'false');
      });
    };
    groups.forEach(function (g) {
      var trig = $('.hx__navtrig', g);
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
      if (e.key !== 'Escape') return;
      var inside = document.activeElement && document.activeElement.closest
        ? document.activeElement.closest('.hx__navgrp') : null;
      if (inside) {
        var t = $('.hx__navtrig', inside);
        if (t) t.focus();
      }
      closeAll(null);
    });
  })();

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
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
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

      svg.addEventListener('pointermove', function (e) { pick(e.clientX); });
      svg.addEventListener('pointerleave', clear);
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
        refresh();
      });
    });

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
