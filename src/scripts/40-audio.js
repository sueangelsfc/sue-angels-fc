/* ==========================================================================
   AN AUDIO INTERVIEW, WIRED TO ITS OWN TRANSCRIPT

   Three jobs, and every one of them is an UPGRADE to something that already
   works with this file blocked:

   - pressing a timestamp or a chapter seeks the recording to that answer. The
     markup makes both of these ordinary links - a timestamp points at the
     player, a chapter at the written answer - so with no script at all a
     press still takes the reader somewhere useful. That is why they are links
     and not buttons: a control that needs JavaScript to do anything is a dead
     control on the one page where somebody is most likely to have scripts off.
   - the waveform fills as it plays. The shape is drawn by the build from
     ffmpeg's own peaks and the front copy is revealed by `--p`, so with this
     blocked the figure is simply a waveform.
   - the question being spoken is marked. The reader can see where in the
     conversation the audio has got to while reading something else.

   NOTHING HERE MEASURES THE PAGE. No `getBoundingClientRect`, no
   `getComputedStyle`: the one number it reads is `currentTime` and the one it
   writes is a custom property. So it cannot be the reason a layout is wrong,
   and it runs identically at every width.

   IT COSTS EVERY OTHER PAGE ONE QUERY. The early return is the first thing it
   does, before a listener is registered, because 105 of the site's 108 pages
   carry no audio at all.
   ========================================================================== */
(function () {
  var player = document.querySelector('.aud__player');
  if (!player) return;
  var marks = [].slice.call(document.querySelectorAll('.qa__q[data-at]'));
  var secs = function (el) { return Number(el.getAttribute('data-at')); };

  /* ONE DELEGATED LISTENER, so a chapter list and five timestamps are one
     registration rather than six, and `preventDefault` only where the press
     is actually handled - a press we cannot serve has to stay a link. */
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('.qa__t[data-at],.aud__ch[data-at]') : null;
    if (!t) return;
    var at = Number(t.getAttribute('data-at'));
    if (!isFinite(at)) return;
    e.preventDefault();
    try { player.currentTime = at; } catch (err) { return; }
    /* A press on a timestamp is a request to hear it, so it plays. The
       promise is caught: a browser that refuses autoplay is not an error
       worth anybody's console, and the audio is still seeked and ready. */
    var p = player.play();
    if (p && p.catch) p.catch(function () {});
    /* The answer, not the player, is what the reader wants in front of them
       when they press a chapter in the list. A timestamp sits beside its own
       answer already, so only the chapter scrolls. */
    if (t.className.indexOf('aud__ch') > -1) {
      var tgt = document.getElementById((t.getAttribute('href') || '').slice(1));
      if (tgt && tgt.scrollIntoView) tgt.scrollIntoView({ block: 'center' });
    }
  });

  var now = -1;
  var fig = player.closest ? player.closest('.aud') : null;
  player.addEventListener('timeupdate', function () {
    var at = player.currentTime;
    var dur = player.duration;
    if (fig && dur) fig.style.setProperty('--p', (at / dur) * 100 + '%');
    /* WHICH ANSWER IS BEING SPOKEN: the last one that has started. A loop
       rather than an index, because a reader who drags the scrubber backwards
       has to end up in the right place too. */
    var i = -1;
    for (var k = 0; k < marks.length; k += 1) if (secs(marks[k]) <= at) i = k;
    if (i === now) return;
    if (marks[now]) marks[now].classList.remove('is-now');
    if (marks[i]) marks[i].classList.add('is-now');
    now = i;
  });
  /* Paused is not "nowhere". The mark stays where the recording stopped,
     which is where the reader left off, and only a reset clears it. */
  player.addEventListener('emptied', function () {
    if (marks[now]) marks[now].classList.remove('is-now');
    now = -1;
  });
})();
