/* player-fx.js
   1) Invisible backend — Cmd/Ctrl+Shift+A opens the CMS (admin.html). No visible link.
   2) Squad cards cycle through each player's tagged photos (main headshot + the
      player's gallery added in the CMS) every 5 minutes, with a soft crossfade. */
(function () {
  var _buf = '';
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'A' || e.key === 'a' || e.code === 'KeyA')) {
      e.preventDefault();
      location.href = 'admin.html';
      return;
    }
    var tag = (e.target && e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || (e.target && e.target.isContentEditable)) return;
    if (e.key && e.key.length === 1) {
      _buf = (_buf + e.key.toLowerCase()).slice(-8);
      if (_buf.indexOf('angels') !== -1) { _buf = ''; location.href = 'admin.html'; }
    }
  });

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function photosFor(num) {
    var set = [];
    try {
      var main = window.getPlayerPhoto ? window.getPlayerPhoto(num) : null;
      if (main) set.push(main);
      var g = window.getPlayerGallery ? window.getPlayerGallery(num) : [];
      (g || []).forEach(function (p) { if (p && set.indexOf(p) < 0) set.push(p); });
    } catch (e) {}
    return set;
  }
  var idx = {};
  function rotate() {
    document.querySelectorAll('.mp-player[data-num]').forEach(function (card) {
      var num = card.getAttribute('data-num');
      var pics = photosFor(num);
      if (pics.length < 2) return;
      var img = card.querySelector('.mp-player__img img');
      if (!img) return;
      idx[num] = ((idx[num] || 0) + 1) % pics.length;
      var next = pics[idx[num]];
      img.style.transition = 'opacity .55s ease';
      img.style.opacity = '0';
      setTimeout(function () { img.src = next; img.style.opacity = '1'; }, 550);
    });
  }
  setInterval(rotate, 300000); // every 5 minutes
})();

/* admin logout — floating "Sign out" button, only visible when signed in */
(function () {
  function isAdmin() { try { return window.__sa_admin === true || localStorage.getItem('sa-admin') === '1'; } catch (e) { return false; } }
  function mount() {
    var ex = document.getElementById('sa-logout');
    if (!isAdmin()) { if (ex) ex.remove(); return; }
    if (ex || !document.body) return;
    var b = document.createElement('button');
    b.id = 'sa-logout'; b.type = 'button'; b.textContent = 'Sign out'; b.setAttribute('aria-label', 'Sign out of admin');
    b.addEventListener('click', function () {
      try { if (window.saSignOut) window.saSignOut(); } catch (e) {}
      try { localStorage.removeItem('sa-admin'); } catch (e) {}
      window.__sa_admin = false;
      try { window.dispatchEvent(new CustomEvent('sa-admin-changed')); } catch (e) {}
      location.reload();
    });
    document.body.appendChild(b);
  }
  document.addEventListener('DOMContentLoaded', mount);
  window.addEventListener('sa-admin-changed', mount);
  setTimeout(mount, 900); setInterval(mount, 3000);
})();
