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
  /* The band counter on the home page writes through this rather than opening
     a second REST path. One helper, one set of headers, one place a broken
     insert can be found. */
  window.saInsert = sbInsert;

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

  /* The scroll reveal used to be here too, watching `.reveal`. No page has
     carried that class since the rebuild, so it observed nothing and did
     nothing - but it read exactly like the real one, which is worse than
     absent: diagnosing why bands appeared late meant tuning a threshold on a
     dead observer first. The live one is in 10-home.js and watches `.rv`. */

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
      var it = items[i];
      img.src = typeof it === 'string' ? it : it.src;
      img.alt = (typeof it === 'string' ? '' : it.alt) || '';
      count.textContent = (i + 1) + ' / ' + items.length;
    }
    /* Swipe state. A phone has no arrow keys and two small buttons under a
       full-bleed photograph, so the gesture everybody already tries is the one
       that has to work. Vertical movement is left alone: stealing it makes the
       viewer feel stuck. The end of the gesture is read from the last position
       seen rather than from the up event, because a browser that decides
       mid-swipe that it was a pan sends pointercancel with a stale point. */
    var sx = 0, sy = 0, lx = 0, ly = 0, sid = null, swiped = false;
    var finishSwipe = function () {
      if (sid === null) return;
      sid = null;
      var dx = lx - sx, dy = ly - sy;
      if (Math.abs(dx) < 45 || Math.abs(dx) <= Math.abs(dy)) return;
      swiped = true;
      i += dx < 0 ? 1 : -1;
      show();
    };

    show();
    on($('[data-lb-prev]', lb), 'click', function () { i--; show(); });
    on($('[data-lb-next]', lb), 'click', function () { i++; show(); });
    on($('[data-lb-close]', lb), 'click', closeLightbox);
    on(lb, 'click', function (e) {
      /* A swipe that finishes on the backdrop also fires a click, and that
         click would close the viewer the swipe was navigating. */
      if (swiped) { swiped = false; return; }
      if (e.target === lb) closeLightbox();
    });
    on(document, 'keydown', lbKeys);

    on(lb, 'pointerdown', function (e) {
      if (e.pointerType === 'mouse') return;
      sid = e.pointerId;
      sx = lx = e.clientX;
      sy = ly = e.clientY;
    });
    on(lb, 'pointermove', function (e) {
      if (e.pointerId !== sid) return;
      lx = e.clientX; ly = e.clientY;
    });
    ['pointerup', 'pointercancel'].forEach(function (ev) {
      on(lb, ev, function (e) { if (e.pointerId === sid) finishSwipe(); });
    });

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
  /* ---- Album photographs ------------------------------------------------
     An album ships as real links to the full-size file, which is what a
     reader with no script and anyone wanting to save a photograph needs, and
     that stays true: this only intercepts the plain left click.

     It has to, on a phone especially. Following the link left the website
     entirely for a bare image URL on the storage host, with no caption, no
     way back except the browser's own button, and no way at all to reach the
     next photograph in an album of 175. Cmd/ctrl/shift click, middle click
     and long-press still open the file itself. */
  $$('[data-album]').forEach(function (grid) {
    var links = $$('a[href]', grid);
    if (links.length < 1) return;
    var items = links.map(function (a) {
      var im = $('img', a);
      return { src: a.getAttribute('href'), alt: (im && im.getAttribute('alt')) || '' };
    });
    links.forEach(function (a, idx) {
      on(a, 'click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
        e.preventDefault();
        openLightbox(items, idx);
      });
    });
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

  /* ---- The performance probe, on request only -------------------------
     Three scroll fixes were reasoned out from a laptop and the club still
     reported the stutter, so ?perf=1 measures it on the device that has it:
     frames per second while scrolling, the worst frame, and every long task
     the browser will own up to. It also switches each suspect off in turn so
     the cause is found by evidence.

     Four lines here and not one byte fetched unless the URL asks. */
  if (location.search.indexOf('perf=1') > -1) {
    var probe = document.createElement('script');
    probe.src = '/perf.js?t=' + (+new Date());
    document.head.appendChild(probe);
  }

  /* ==========================================================================
     AND STOP ANIMATING WHILE THE PAGE IS MOVING

     Pausing what is off screen was not enough, and the measurement says why.
     A screen recording of a scroll, sampled frame by frame, changed on only
     147 of 653 frames: the page was repainting about twelve times a second
     while the display ran at sixty.

     The aura is why. Each blob is a multi-stop radial gradient sized in
     viewport widths, and the broad tier runs from 190vw to 330vw. Totalled
     across twenty-four of them: 7.4 megapixels on a phone, 101 on a laptop,
     and 207 on the machine that recording was made on - about 788MB of
     texture, all of it under a transform that never stops. No GPU holds that
     as composited layers, so it is re-rasterised, and everything else queues
     behind it.

     The motion itself is worth almost nothing while scrolling: pa-turn is a
     220-second rotation, so over a one-second flick a blob turns about two
     degrees. It costs the most at the exact moment it can be seen the least.

     So it stops while the page is moving and starts again a fifth of a second
     after it stops. Nothing about how the site looks at rest changes, which is
     the point: the aura is the site's signature and this does not touch it.

     Passive listener, and the class is only ever toggled on the root, so the
     work per scroll event is one boolean and one timer. It defaults to
     running, so a script that never arrives leaves the site as it is today.
     ========================================================================== */
  (function () {
    var root = document.documentElement;
    var timer = null;
    var moving = false;
    window.addEventListener('scroll', function () {
      if (!moving) { moving = true; root.classList.add('is-scrolling'); }
      clearTimeout(timer);
      timer = setTimeout(function () {
        moving = false;
        root.classList.remove('is-scrolling');
      }, 200);
    }, { passive: true });
  })();

  /* ==========================================================================
     STOP ANIMATING WHAT NOBODY CAN SEE

     Measured on the live home page: 85 infinite CSS animations running at
     once, 76 of them with no part of the element in the viewport. Twenty-four
     aura blobs each turning AND breathing, thirty-four wave elements, a
     comet, a glow, a ticker. Every one is a composited layer the browser
     repaints forever for nobody, and on a phone the result is the compositor
     dropping frames until content flickers in and out. Which is exactly what
     the club reported.

     Each section is paused when it leaves the viewport and resumed when it
     returns, so an animation only ever stops while it cannot be seen.

     THE MARGIN IS THE WHOLE TRICK. A section resumes a full viewport height
     before it arrives, so nothing is ever caught mid-pause on screen: by the
     time any of it is visible it has been running for a screen's worth of
     scrolling. Pausing at the exact boundary would have traded a frame-rate
     problem for a visible one.

     Only animation-play-state, never opacity or display, so this can never
     hide anything. See the note beside `.is-still` in 20-home.css. */
  if ('IntersectionObserver' in window) {
    /* ONLY THE AURA BLOBS, and the reason is worth stating because pausing
       whole sections looked obviously right and would have caused the exact
       fault it was fixing.

       `.camp__cell` runs two animations: `camp-grow`, which fades it in from
       opacity 0 with fill-mode `both`, and `camp-wave`, which drifts forever.
       Pause one of those cells mid-entrance and it stops at whatever opacity
       it had reached and STAYS there. Scroll quickly past the campaign band on
       a phone and thirty-four cells could freeze part-way in. Content
       disappearing, which is what this is meant to stop.

       So nothing with an entrance is paused. The aura blobs qualify because
       `pa-turn` is pure transform and `pa-breathe` moves opacity between 0.66
       and 1 with no fill mode: a paused blob sits somewhere in that range, on
       a soft background gradient, which is imperceptible and can never be
       invisible.

       `.pageaura` itself is `position:absolute; inset:0`, so it is the height
       of the page and never off screen: observing the container paused
       nothing. Nineteen of the twenty-four blobs have their own box outside
       the viewport at the top of the page, which is thirty-eight infinite
       animations running for nobody. */
    /* THE CAMPAIGN BAND JOINS THEM, but by name and not by blanket. Its
       thirty-five cells were the single largest group of infinite animations
       on the page and none of them was ever paused, because the first version
       of this could only pause a whole subtree and doing that here would
       freeze the entrance. The stylesheet pauses `camp-wave` alone through the
       list form of animation-play-state, so this only has to mark the band.

       `.camp` is one element rather than thirty-five observers, and it is a
       normal section with its own box, so unlike `.pageaura` it genuinely
       leaves the viewport. */
    /* $$ AND NOT $. `$` is querySelector: on the seventeen root pages
       with no campaign band it returns null, `null.length` threw, and
       because that abort happened before the scroll reveal ran, every
       `.rv` element on the page stayed at opacity 0. The page was fully
       present in the DOM and completely invisible. This is the failure
       in CLAUDE.md's list, item 7, and it takes one character. */
    var stillable = $$('.camp');
    if (stillable.length) {
      var stiller = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          en.target.classList.toggle('is-still', !en.isIntersecting);
        });
      }, { rootMargin: '100% 0px 100% 0px' });
      stillable.forEach(function (el) { stiller.observe(el); });
    }
  }
})();
