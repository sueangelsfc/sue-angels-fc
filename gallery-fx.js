/* gallery-fx.js, clicking a gallery album opens a left-to-right swipe carousel
   of its photos (cover EXCLUDED), tap a photo to enlarge. Standalone (no recompile):
   intercepts the album card click in capture phase and reads the live GalleryStore. */
(function () {
  function albums() { try { return window.GalleryStore ? window.GalleryStore.list() : []; } catch (e) { return []; } }
  function coverOf(a) { try { return window.galleryCover ? window.galleryCover(a) : (a && a.cover) || null; } catch (e) { return null; } }
  function allPhotos(a) { try { return window.galleryPhotos ? window.galleryPhotos(a) : ((a && a.photos) || []); } catch (e) { return []; } }
  function scrollPhotos(a) { var cov = coverOf(a); return allPhotos(a).filter(function (p) { return p !== cov; }); }

  var ov = null, zoomEl = null, curPics = [], zi = 0;
  function close() { if (ov) { ov.remove(); ov = null; } if (zoomEl) { zoomEl.remove(); zoomEl = null; } document.body.style.overflow = ''; }
  function renderZoom() { if (!zoomEl) return; zoomEl.querySelector('img').src = curPics[zi]; var c = zoomEl.querySelector('.gfx-zoom__count'); if (c) c.textContent = (zi + 1) + ' / ' + curPics.length; }
  function zStep(d) { if (!curPics.length) return; zi = (zi + d + curPics.length) % curPics.length; renderZoom(); }
  function enlarge(i) {
    zi = i;
    if (zoomEl) zoomEl.remove();
    zoomEl = document.createElement('div'); zoomEl.className = 'gfx-zoom';
    zoomEl.innerHTML = '<button class="gfx-zoom__nav gfx-zoom__prev" aria-label="Previous">\u2039</button>' +
      '<img alt="">' +
      '<button class="gfx-zoom__nav gfx-zoom__next" aria-label="Next">\u203A</button>' +
      '<span class="gfx-zoom__count"></span>';
    zoomEl.addEventListener('click', function (e) { if (e.target === zoomEl) { zoomEl.remove(); zoomEl = null; } });
    zoomEl.querySelector('.gfx-zoom__prev').addEventListener('click', function (e) { e.stopPropagation(); zStep(-1); });
    zoomEl.querySelector('.gfx-zoom__next').addEventListener('click', function (e) { e.stopPropagation(); zStep(1); });
    document.body.appendChild(zoomEl);
    renderZoom();
  }
  function open(album) {
    var pics = scrollPhotos(album); if (!pics.length) return;
    close();
    ov = document.createElement('div'); ov.className = 'gfx';
    ov.innerHTML = '<div class="gfx__panel"><div class="gfx__head"><span class="gfx__title"></span>' +
      '<button class="gfx__x" aria-label="Close">\u2715</button></div>' +
      '<div class="gfx__stage"><button class="gfx__nav gfx__prev" aria-label="Previous">\u2039</button>' +
      '<div class="gfx__rail"></div><button class="gfx__nav gfx__next" aria-label="Next">\u203A</button></div>' +
      '<div class="gfx__hint">Swipe \u00b7 tap a photo to enlarge</div></div>';
    curPics = pics;
    var rail = ov.querySelector('.gfx__rail');
    pics.forEach(function (src, i) {
      var b = document.createElement('button'); b.className = 'gfx__cell'; b.type = 'button';
      var im = document.createElement('img'); im.src = src; im.loading = 'lazy'; im.alt = '';
      var n = document.createElement('span'); n.className = 'gfx__no'; n.textContent = (i + 1);
      b.appendChild(im); b.appendChild(n);
      b.addEventListener('click', function () { enlarge(i); });
      rail.appendChild(b);
    });
    ov.querySelector('.gfx__title').textContent = (album.title || album.caption || 'Matchday album') + ' \u00b7 ' + pics.length + ' photo' + (pics.length > 1 ? 's' : '');
    ov.querySelector('.gfx__x').addEventListener('click', close);
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    function step(d) { var c = rail.querySelector('.gfx__cell'); var w = c ? c.getBoundingClientRect().width + 14 : rail.clientWidth * 0.8; rail.scrollBy({ left: d * w, behavior: 'smooth' }); }
    ov.querySelector('.gfx__prev').addEventListener('click', function () { step(-1); });
    ov.querySelector('.gfx__next').addEventListener('click', function () { step(1); });
    document.body.appendChild(ov); document.body.style.overflow = 'hidden';
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (zoomEl) { zoomEl.remove(); zoomEl = null; } else close(); return; }
    if (zoomEl) { if (e.key === 'ArrowRight') zStep(1); else if (e.key === 'ArrowLeft') zStep(-1); }
  });
  document.addEventListener('click', function (e) {
    var card = e.target.closest ? e.target.closest('.mp-news.mp-clickable') : null;
    if (!card || card.querySelector('.mp-news__body')) return; // skip news/report cards
    var img = card.querySelector('.mp-news__cover img'); if (!img) return;
    var cov = img.getAttribute('src');
    var list = albums(), album = null;
    for (var i = 0; i < list.length; i++) { if (coverOf(list[i]) === cov) { album = list[i]; break; } }
    if (!album || scrollPhotos(album).length < 1) return; // nothing beyond the cover → let default zoom run
    e.preventDefault(); e.stopPropagation();
    open(album);
  }, true);
})();
