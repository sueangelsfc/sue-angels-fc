/* ==========================================================================
   AN AUDIO INTERVIEW, WIRED TO ITS OWN TRANSCRIPT

   Everything that can work without this file does. A timestamp is a link to
   the player, a chapter a link to the written answer, the pull quote's control
   a link to the player: with the script blocked every one of them still does
   the useful half of its job, and that is why none of them is a button. The
   two controls that have no meaning at all without a script - the speed row
   and the resume offer - are hidden until `html.js` says there is one.

   NOTHING HERE MEASURES THE PAGE except the one thing that has to: seeking by
   pressing the waveform needs to know where in the waveform the press landed.
   Everything else reads `currentTime` and writes a custom property.

   IT COSTS EVERY OTHER PAGE ONE QUERY. The early return is the first thing it
   does, before a listener is registered, because 105 of the site's 108 pages
   carry no audio at all.
   ========================================================================== */
(function () {
  var player = document.querySelector('.aud__player');
  if (!player) return;
  var fig = player.closest ? player.closest('.aud') : null;
  var marks = [].slice.call(document.querySelectorAll('.qa__q[data-at]'));
  /* THE CHAPTER FOR EACH QUESTION, MATCHED BY WHAT IT POINTS AT rather than by
     position. The two lists look like the same questions in the same order and
     only ARE while every timestamped question also carries a chapter label: one
     that does not would shift every chapter after it onto the wrong answer, and
     nothing on the page would look wrong while it did. The chapter already
     names its question in its `href`, so there is no need to assume. */
  var chapFor = function (q) {
    return q && q.id ? document.querySelector('.aud__ch[href="#' + q.id + '"]') : null;
  };
  var at = function (el) { return Number(el.getAttribute('data-at')); };
  var mmss = function (s) {
    var m = Math.floor(s / 60);
    var r = Math.floor(s % 60);
    return m + ':' + (r < 10 ? '0' : '') + r;
  };

  function seek(s, play) {
    try { player.currentTime = s; } catch (e) { return; }
    if (!play) return;
    var p = player.play();
    /* A browser that refuses to start audio without a gesture is not an error
       worth anybody's console, and the recording is seeked and ready anyway. */
    if (p && p.catch) p.catch(function () {});
  }

  /* ONE DELEGATED LISTENER for every control that names a second: the
     timestamps beside the questions, the chapters in the panel, and the line
     under the pull quote. `preventDefault` only where the press is actually
     served, because a press this cannot serve has to stay a link. */
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-at]') : null;
    if (!t || t.tagName !== 'A') return;
    var s = at(t);
    if (!isFinite(s)) return;
    e.preventDefault();
    seek(s, true);
    /* The answer, not the player, is what the reader wants in front of them
       when they press a chapter in the contents list. A timestamp already sits
       beside its own answer, so only the chapter scrolls. */
    if (t.className.indexOf('aud__ch') > -1) {
      var tgt = document.getElementById((t.getAttribute('href') || '').slice(1));
      if (tgt && tgt.scrollIntoView) tgt.scrollIntoView({ block: 'center' });
    }
  });

  /* PRESSING THE WAVEFORM SEEKS, because it fills as the recording plays and
     so teaches every reader that it is a scrubber. Something that looks
     interactive and is not is worse than something plainly decorative, and
     this was the one place on the page where the design made a promise the
     code did not keep. The one measurement in this file, and it is taken at
     the moment of the press rather than held, so a resize cannot stale it. */
  var wave = fig && fig.querySelector('.aud__wave');
  if (wave) {
    wave.addEventListener('click', function (e) {
      var d = player.duration;
      if (!d) return;
      var box = wave.getBoundingClientRect();
      if (!box.width) return;
      var x = (e.clientX - box.left) / box.width;
      seek(Math.max(0, Math.min(1, x)) * d, true);
    });
  }

  /* HOW FAST. Revealed by the stylesheet under `html.js`; `aria-pressed` is
     what says which one is on, so the state is announced rather than only
     coloured. */
  var rates = [].slice.call(document.querySelectorAll('.aud__rate'));
  rates.forEach(function (b) {
    b.addEventListener('click', function () {
      player.playbackRate = Number(b.getAttribute('data-rate')) || 1;
      rates.forEach(function (o) {
        o.setAttribute('aria-pressed', o === b ? 'true' : 'false');
      });
    });
  });

  /* WHERE YOU GOT TO, OFFERED AND NEVER APPLIED.
     Four minutes is long enough that somebody will leave and come back, and
     starting again at nought is the commonest reason they do not. The position
     is this browser's and nobody else's - it never leaves the device and
     nothing here is sent anywhere.

     OFFERED, because a recording that silently begins ninety seconds in reads
     as a file that has broken rather than as a kindness, and the reader has no
     way to know why. One press, with the time written on it.

     A storage that throws must not take the page down, which is the same rule
     the control panel's draft saver is held to. */
  var KEY = 'sa-at-' + (player.getAttribute('src') || '').replace(/^.*\//, '');
  var save = function (v) { try { localStorage.setItem(KEY, v); } catch (e) { /* full, blocked or private */ } };
  var saved = 0;
  try { saved = Number(localStorage.getItem(KEY)) || 0; } catch (e) { saved = 0; }
  if (saved > 15) {
    var offer = document.createElement('p');
    offer.className = 'aud__again';
    var go = document.createElement('button');
    go.type = 'button';
    go.className = 'aud__again-b';
    go.textContent = 'Take me back to ' + mmss(saved);
    go.addEventListener('click', function () { seek(saved, true); offer.remove(); });
    offer.appendChild(go);
    var rateRow = fig && fig.querySelector('.aud__rates');
    if (rateRow && rateRow.parentNode) rateRow.parentNode.insertBefore(offer, rateRow);
  }

  var now = -1;
  var tick = 0;
  player.addEventListener('timeupdate', function () {
    var t = player.currentTime;
    var d = player.duration;
    if (fig && d) fig.style.setProperty('--p', (t / d) * 100 + '%');
    /* Written about four times a minute, not four times a second: this is a
       bookmark, and `timeupdate` fires often enough to make a write on every
       one of them a waste of everybody's disk. Near the end it is cleared, so
       finishing something does not leave an offer to go back to the last
       fifteen seconds of it. */
    tick += 1;
    if (tick % 60 === 0) save(d && t > d - 20 ? 0 : Math.floor(t));

    /* WHICH ANSWER IS BEING SPOKEN: the last one that has started. A loop
       rather than an index, because a reader who drags the scrubber backwards
       has to end up in the right place too. */
    var i = -1;
    for (var k = 0; k < marks.length; k += 1) if (at(marks[k]) <= t) i = k;
    if (i === now) return;
    /* THE CONTENTS LIST CARRIES IT TOO. At a desk the rail is where the eye
       is, and it was the one part of the page that could say where you were
       and did not. */
    var off = chapFor(marks[now]);
    var on = chapFor(marks[i]);
    if (marks[now]) marks[now].classList.remove('is-now');
    if (off) off.classList.remove('is-now');
    if (marks[i]) marks[i].classList.add('is-now');
    if (on) on.classList.add('is-now');
    now = i;
  });
  player.addEventListener('pause', function () { save(Math.floor(player.currentTime)); });
  player.addEventListener('ended', function () { save(0); });
})();
