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
     The inline head script has already applied the stored theme, so this
     only handles switching and keeps the control's label truthful. */
  var root = document.documentElement;
  function currentTheme() {
    var set = root.getAttribute('data-theme');
    if (set) return set;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  function syncToggle() {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    $$('[data-theme-toggle]').forEach(function (b) {
      b.setAttribute('aria-label', 'Switch to ' + next + ' theme');
      b.setAttribute('title', 'Switch to ' + next + ' theme');
    });
  }
  $$('[data-theme-toggle]').forEach(function (btn) {
    on(btn, 'click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('sa-theme', next); } catch (e) {}
      syncToggle();
    });
  });
  syncToggle();
  // Follow the system if the visitor has never chosen explicitly.
  var mq = window.matchMedia('(prefers-color-scheme: light)');
  on(mq, 'change', function () { if (!root.getAttribute('data-theme')) syncToggle(); });

  /* ---- Header stuck state --------------------------------------------- */
  var hdr = $('[data-header]');
  if (hdr) {
    var onScroll = function () { hdr.classList.toggle('is-stuck', window.scrollY > 12); };
    on(window, 'scroll', onScroll, { passive: true });
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
})();
