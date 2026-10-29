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
  /* WHICH END IS WHICH IS WRITTEN ON THE PITCH, not only above it. Every
     mark on this site is read with y=0 at the goal the event is ABOUT - the
     goal being attacked for a goal, the goal being defended for a save - so
     the club never has to say which way it kicked, and the marks on one
     profile cannot disagree with each other. But that convention lived in a
     sentence over the diagram, and a sentence over a diagram is where a
     convention gets skimmed: somebody who reads it backwards puts every goal
     in his own six-yard box, and the record looks perfectly fine. A word at
     each end cannot be missed, and it is the CALLER's word, because only the
     caller knows what is being marked. */
  /* THE MARKER LOOKS LIKE WHAT IT IS. A goal is filled, an assist is the same
     mark hollow and a save is a cross - the vocabulary the published maps on
     a player's profile already use, told apart by weight and structure rather
     than by a second colour, which is the site's rule for football data. The
     picker drew one orange pin for all three, so the screen where somebody
     DECIDES carried less information than the page that publishes it. */
  function mark(kind) {
    if (kind === 's') {
      return '<circle class="cpp__o" r="4.4"/>'
        + '<path class="cpp__x" d="M-1.8 -1.8L1.8 1.8M1.8 -1.8L-1.8 1.8"/>';
    }
    return '<circle class="cpp__halo' + (kind === 'a' ? ' is-hollow' : '') + '" r="5.5"/>'
      + (kind === 'a' ? '' : '<circle class="cpp__pin" r="2.4"/>');
  }

  function svg(spot, ends, kind, also) {
    if (!MARKS) return '<p class="cp-note">The pitch could not be drawn.</p>';
    var m = MARKS;
    var e = ends || {};
    var av = also && also.spot ? toView(also.spot) : null;
    return '<svg class="cpp__svg" viewBox="0 0 100 ' + H + '" role="application"'
      + ' aria-label="The pitch, '
      + (e.top ? esc(e.top).toLowerCase() + ' at the top. ' : '')
      + 'Press or tap where it happened, or move the marker with the arrow keys."'
      + ' tabindex="0">'
      + '<rect class="cpp__turf" x="1" y="1" width="98" height="' + (H - 2) + '" rx="3"/>'
      + '<path class="cpp__lines" d="' + m.lines + '"/>'
      + '<path class="cpp__lines" d="' + m.arcs + '"/>'
      + '<circle class="cpp__lines" cx="' + m.circle.cx + '" cy="' + m.circle.cy + '" r="' + m.circle.r + '"/>'
      + m.spots.map(function (s) {
        return '<circle class="cpp__dot" cx="' + s.cx + '" cy="' + s.cy + '" r="0.9"/>';
      }).join('')
      /* THE GOAL ITSELF, at the end the mark is about. Every reading this
         dialog gives is a distance from it - "almost on the goal line",
         "around the edge of the area" - and it was the one thing on a pitch
         about shooting that was not drawn. */
      + '<path class="cpp__goal" d="M43 1H57"/>'
      /* THE OTHER HALF OF THE PAIR, dimmed, with a hairline to the live one.
         A goal and its assist are one event described twice, and marking the
         pass with no sight of where the shot was struck from is placing half
         a relationship blind. The caller already holds both. */
      + (av ? '<line class="cpp__link" data-link x1="' + av.x + '" y1="' + av.y.toFixed(2)
        + '" x2="' + av.x + '" y2="' + av.y.toFixed(2) + '"' + (spot ? '' : ' hidden') + '/>'
        + '<g class="cpp__also" transform="translate(' + av.x + ' ' + av.y.toFixed(2) + ')">'
        + mark(also.kind) + '<title>' + esc(also.label || 'Already marked') + '</title></g>' : '')
      + '<g class="cpp__mark" data-mark' + (spot ? '' : ' hidden') + '>'
      + mark(kind)
      + '</g>'
      /* Hidden from a screen reader: the label on the field above already
         says which way round the pitch is, in a whole sentence, and reading
         two words off a diagram after it is the same fact twice. */
      + (e.top ? '<text class="cpp__end" x="50" y="7" aria-hidden="true">'
        + esc(e.top) + '</text>' : '')
      + (e.bottom ? '<text class="cpp__end" x="50" y="' + (H - 3)
        + '" aria-hidden="true">' + esc(e.bottom) + '</text>' : '')
      + '</svg>';
  }

  function place(box, spot) {
    var g = box.querySelector('[data-mark]');
    var ln = box.querySelector('[data-link]');
    if (!g) return;
    if (!spot) {
      g.setAttribute('hidden', '');
      /* A line to nowhere is worse than no line: with the mark cleared it
         would run from the companion to the top-left corner. */
      if (ln) ln.setAttribute('hidden', '');
      return;
    }
    var v = toView(spot);
    g.removeAttribute('hidden');
    g.setAttribute('transform', 'translate(' + v.x + ' ' + v.y.toFixed(2) + ')');
    if (ln) {
      ln.removeAttribute('hidden');
      ln.setAttribute('x2', v.x);
      ln.setAttribute('y2', v.y.toFixed(2));
    }
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
      + '<div class="cpp__field">' + svg(spot, o.ends, o.kind, o.also) + '</div>'
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

  /* ---- WHERE THE SAVES WERE MADE ---------------------------------------
     A list of points, edited in place. It lives here rather than in the match
     editor because that chunk is the most-opened in the panel and this is a
     field most matches never carry: the same reason the picker itself is a
     chunk. It knows nothing about a match: it is handed an array and
     mutates it in place.

     DEFENDING, NOT ATTACKING. The coordinates go in exactly as the picker
     gives them, with y=0 the goal the event is about, which on a save is his
     own. That is the one convention that keeps "the six-yard box" a true
     sentence in both bands without a flag on every reader. */
  function saves(host, spots) {
    /* Repainted whole rather than patched: a row carries its index into the
       array, and removing the second of three renumbers the third. */
    function paint() {
      host.innerHTML = '<h4 class="mform__h">Where the saves were made</h4>'
        + '<p class="cp-note">Optional, and never all of them: mark the ones worth'
        + ' remembering. They show on his profile under <b>Where he saves</b>, with his'
        + ' own goal at the top of the pitch. The count above is still what every'
        + ' published figure is derived from.</p>'
        + (spots.length ? '<ol class="svlist">' + spots.map(function (s, i) {
          return '<li class="svlist__row" data-svrow="' + i + '">'
            + button('data-sv-mark', 'Marked on the pitch')
            + '<label class="svlist__min"><span class="sr-only">Minute of save ' + (i + 1) + '</span>'
            + '<input class="input" type="number" min="0" max="130" data-sv-min value="'
            + esc(s.minute == null ? '' : s.minute) + '" placeholder="Min"></label>'
            + '<button type="button" class="btn btn--ghost btn--sm" data-sv-drop>Remove'
            + '<span class="sr-only"> save ' + (i + 1) + '</span></button></li>';
        }).join('') + '</ol>' : '')
        + '<button type="button" class="btn btn--ghost btn--sm" data-sv-add>Mark a save</button>';
    }
    function at(el) { return Number(el.closest('[data-svrow]').getAttribute('data-svrow')); }
    host.addEventListener('click', function (e) {
      if (e.target.closest('[data-sv-mark]')) {
        var row = spots[at(e.target)];
        open({ spot: { x: row.x, y: row.y }, title: 'Where the save was made',
          kind: 's',
          ends: { top: 'The goal he was defending', bottom: 'The goal we were attacking' },
          hint: 'Tap the pitch where he made it, or use the arrow keys. His own goal at the top.',
          onPick: function (spot) { if (spot) { row.x = spot.x; row.y = spot.y; } paint(); } });
        return;
      }
      if (e.target.matches('[data-sv-add]')) {
        /* A new save opens the pitch and is only KEPT if somebody marks one.
           An empty row added to the list first is a save the record would
           carry with no location, which is the half-written entry every
           reader filters out and then cannot explain. */
        open({ spot: null, title: 'Where the save was made',
          kind: 's',
          ends: { top: 'The goal he was defending', bottom: 'The goal we were attacking' },
          hint: 'Tap the pitch where he made it, or use the arrow keys. His own goal at the top.',
          onPick: function (spot) {
            if (!spot) return;
            spots.push({ x: spot.x, y: spot.y, minute: '' });
            paint();
          } });
        return;
      }
      if (e.target.matches('[data-sv-drop]')) { spots.splice(at(e.target), 1); paint(); }
    });
    /* The minute goes straight into the array. Left in the DOM it would be
       thrown away by the next repaint, which is any other row being added. */
    host.addEventListener('input', function (e) {
      if (e.target.matches('[data-sv-min]')) spots[at(e.target)].minute = e.target.value;
    });
    paint();
  }

  window.CPPITCH = { open: open, button: button, reading: reading, saves: saves };
}());
