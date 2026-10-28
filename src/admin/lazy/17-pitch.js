/* ==========================================================================
   MARK IT ON THE PITCH  ->  control-pitch.js

   Its own chunk, fetched the first time somebody presses a Mark button on a
   goal and by nobody else. `control-matchedit.js` sits at 17.4KB of an 18KB
   ceiling and this is a whole dialog, a pitch and a drag; putting it in there
   would push the most-opened chunk in the panel over for a field most matches
   will never use.

   ONE DIALOG, NOT ONE PITCH PER GOAL. A five-goal match would otherwise carry
   five pitches, five sets of listeners and five hundred lines of SVG inside a
   form that is already 69 fields, and a reader of the match editor would
   scroll past an acre of markings to reach the cards. The button on each card
   says what is marked; the pitch opens over the top when somebody presses it.

   IT STORES A POINT AND NOT A ZONE. The three-zone dropdown beside it is the
   same fact said coarsely, and a dropdown and a point WILL disagree the first
   time somebody moves the marker and leaves the select alone. So the select
   is disabled while a point is marked, and the site derives the zone from the
   point. One implementation of that rule, in src/lib/pitch.mjs, and this file
   deliberately does not carry a second copy of it: the words under the button
   are written by the site at build time, and what the panel shows is the
   marker itself, which cannot be wrong about where it is.
   ========================================================================== */
(function () {
  var U = window.CPU || {};
  var esc = U.esc || function (s) { return String(s == null ? '' : s); };
  var MARKS = (window.SA_SEED && window.SA_SEED.pitch) || null;

  /* The marker's own coordinates, 0-100 across and 0-100 up the pitch with
     the goal the club is attacking at y=0 - the same space the team sheets
     use, so a shot map and a heat map on one profile cannot disagree about
     which way the club kicks. */
  var H = 140;
  function toView(s) { return { x: s.x, y: (s.y / 100) * H }; }
  function fromView(x, y) {
    return {
      x: Math.round(Math.min(100, Math.max(0, x)) * 10) / 10,
      y: Math.round(Math.min(100, Math.max(0, (y / H) * 100)) * 10) / 10,
    };
  }

  /* The pitch, drawn from the figures the build handed over. Attacking end at
     the top, which is the orientation every shot map on the site uses and the
     one somebody picturing the goal expects. */
  function svg(spot) {
    if (!MARKS) return '<p class="cp-note">The pitch could not be drawn.</p>';
    var m = MARKS;
    return '<svg class="cpp__svg" viewBox="0 0 100 ' + H + '" role="application"'
      + ' aria-label="The pitch. Press or tap where it happened, or move the marker with the arrow keys."'
      + ' tabindex="0">'
      + '<rect class="cpp__turf" x="1" y="1" width="98" height="' + (H - 2) + '" rx="3"/>'
      + '<path class="cpp__lines" d="' + m.lines + '"/>'
      + '<path class="cpp__lines" d="' + m.arcs + '"/>'
      + '<circle class="cpp__lines" cx="' + m.circle.cx + '" cy="' + m.circle.cy + '" r="' + m.circle.r + '"/>'
      + m.spots.map(function (s) {
        return '<circle class="cpp__dot" cx="' + s.cx + '" cy="' + s.cy + '" r="0.9"/>';
      }).join('')
      + '<g class="cpp__mark" data-mark' + (spot ? '' : ' hidden') + '>'
      + '<circle class="cpp__halo" r="5.5"/><circle class="cpp__pin" r="2.4"/>'
      + '</g></svg>';
  }

  function place(box, spot) {
    var g = box.querySelector('[data-mark]');
    if (!g) return;
    if (!spot) { g.setAttribute('hidden', ''); return; }
    var v = toView(spot);
    g.removeAttribute('hidden');
    g.setAttribute('transform', 'translate(' + v.x + ' ' + v.y.toFixed(2) + ')');
  }

  /* WHAT IS MARKED, IN WORDS, AND NOT IN COORDINATES. "x 34, y 9" is a
     database row read aloud. The reading is the marker's own position on the
     pitch and a plain sentence under it; the site writes the same sentence on
     the published page from the same point, so the two cannot drift. */
  function reading(spot) {
    if (!spot) return 'Nothing marked yet.';
    var depth = spot.y <= 5.2 ? 'almost on the goal line'
      : spot.y <= 15.7 ? 'close in'
        : spot.y <= 30 ? 'around the edge of the area'
          : spot.y <= 50 ? 'well out' : 'inside their own half';
    var side = spot.x < 30 ? 'towards the left'
      : spot.x > 70 ? 'towards the right' : 'central';
    return 'Marked ' + depth + ', ' + side + '.';
  }

  /* Open the pitch over the form. Returns nothing; the answer arrives through
     `onPick`, which is called on every move so the card behind updates as the
     marker goes down rather than only when the dialog is closed. */
  function open(opts) {
    var o = opts || {};
    var spot = o.spot || null;
    var back = document.createElement('div');
    back.className = 'cpp';
    back.innerHTML = '<div class="cpp__panel" role="dialog" aria-modal="true" aria-labelledby="cpp-h">'
      + '<div class="cpp__head"><h2 class="cpp__h" id="cpp-h">' + esc(o.title || 'Mark it on the pitch') + '</h2>'
      + '<button type="button" class="me__x" data-cpp-close aria-label="Close">&times;</button></div>'
      + (o.hint ? '<p class="cp-note">' + esc(o.hint) + '</p>' : '')
      + '<div class="cpp__field">' + svg(spot) + '</div>'
      + '<p class="cpp__read" data-cpp-read aria-live="polite">' + esc(reading(spot)) + '</p>'
      + '<div class="cpp__acts">'
      + '<button type="button" class="btn btn--ghost" data-cpp-clear>Clear the mark</button>'
      + '<button type="button" class="btn" data-cpp-close>Done</button>'
      + '</div></div>';
    document.body.appendChild(back);

    var field = back.querySelector('.cpp__svg');
    var read = back.querySelector('[data-cpp-read]');

    function set(next) {
      spot = next;
      place(back, spot);
      read.textContent = reading(spot);
      if (o.onPick) o.onPick(spot);
    }

    /* The point is read out of the SVG's own coordinate system rather than
       off the bounding box, so it stays right whatever the dialog is scaled
       to and however the pitch is laid out at a phone's width. */
    function at(ev) {
      var r = field.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      var t = ev.touches && ev.touches[0];
      var cx = (t ? t.clientX : ev.clientX);
      var cy = (t ? t.clientY : ev.clientY);
      return fromView(((cx - r.left) / r.width) * 100, ((cy - r.top) / r.height) * H);
    }

    var dragging = false;
    function move(ev) {
      var p = at(ev);
      if (!p) return;
      ev.preventDefault();
      set(p);
    }
    field.addEventListener('pointerdown', function (ev) {
      dragging = true;
      if (field.setPointerCapture) { try { field.setPointerCapture(ev.pointerId); } catch (e) { /* not captured */ } }
      move(ev);
    });
    field.addEventListener('pointermove', function (ev) { if (dragging) move(ev); });
    field.addEventListener('pointerup', function () { dragging = false; });
    field.addEventListener('pointercancel', function () { dragging = false; });

    /* A POINTER IS NOT THE ONLY WAY TO ANSWER. Tapping a pitch is the fast
       path and it is the only one a keyboard cannot take, so the arrows move
       the marker a step at a time and start it in the middle of the box when
       there is nothing marked. Without this the field is a control that
       exists for a mouse and for nobody else. */
    field.addEventListener('keydown', function (ev) {
      var d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key];
      if (!d) return;
      ev.preventDefault();
      var s = spot || { x: 50, y: 12 };
      var step = ev.shiftKey ? 5 : 1;
      set({
        x: Math.round(Math.min(100, Math.max(0, s.x + d[0] * step)) * 10) / 10,
        y: Math.round(Math.min(100, Math.max(0, s.y + d[1] * step)) * 10) / 10,
      });
    });

    back.addEventListener('click', function (ev) {
      if (ev.target.closest('[data-cpp-clear]')) { set(null); return; }
      if (ev.target.closest('[data-cpp-close]') || ev.target === back) {
        back.remove();
        if (o.onClose) o.onClose(spot);
      }
    });
    field.focus();
  }

  /* The button that sits on a goal card. It says what is marked rather than
     saying "Mark it" for ever, because the commonest question about a record
     entered three weeks ago is whether anybody answered this at all. The
     words are written by the caller, which already has the site's own
     sentence for the point. */
  function button(attr, words) {
    return '<button type="button" class="cpp-btn' + (words ? ' is-set' : '') + '" ' + attr + '>'
      + '<span class="cpp-btn__i" aria-hidden="true"></span>'
      + '<span class="cpp-btn__t">' + esc(words || 'Mark it on the pitch') + '</span></button>';
  }

  window.CPPITCH = { open: open, button: button, reading: reading };
}());
