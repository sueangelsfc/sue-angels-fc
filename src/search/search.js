/* ==========================================================================
   NARROWING A LIST THAT IS ALREADY ON THE SCREEN

   Every one of the site's pages ships in /search.html as a linked row with a
   `data-se` haystack on it, so this has nothing to fetch, nothing to parse
   and nothing to build. It hides rows. A failure here, or a reader with
   JavaScript off, leaves a complete browsable index rather than a blank page
   with a search box on it - which is the point of putting the index in the
   markup in the first place.

   Three things it has to get right.

   - EVERY WORD, NOT THE WHOLE STRING. "dunkley charlie" and "charlie
     dunkley" are the same question. So the query splits and each term has to
     appear somewhere in the row.
   - THE SAME FLATTENING AS THE BUILD, character for character. The haystack
     was written with its accents stripped, its apostrophes DELETED and every
     other separator collapsed to a space, so "sues angels" finds "Sue's
     Angels" and "oconnor" finds "O'Connor". Turning an apostrophe into a
     space instead makes "sue s angels", which the club's own name does not
     match: that shipped, and was found by typing it into the page.
   - A GROUP WITH NOTHING LEFT IN IT HIDES, and the rail renumbers behind it.
     A heading reading "Players" over no players is the page looking broken,
     eight of them is worse, and a strip reading 01 then 04 is the defect this
     site already fixed once on the home page.

   It does not debounce. The list is 151 rows of two text nodes and the work
   is a substring test per row; a timer here would add latency to make a
   measurement look better.

   THE HEADER'S BOX ARRIVES HERE AS ?q=. That box is on every page of the
   site and is a plain form, because the alternative was a site-wide control
   in `sa.js`, which had 92 bytes left of its ceiling. So the query comes in
   on the address, is put into this page's own box and applied before the
   first paint of the filtered list - and the address still holds it
   afterwards, which is what makes a search shareable and bookmarkable.
   ========================================================================== */
(function () {
  var box = document.querySelector('[data-se-count]');
  var none = document.querySelector('[data-se-none]');
  var input = document.getElementById('se-q');
  if (!input || !box) return;

  var rows = [].slice.call(document.querySelectorAll('.se-row'));
  var groups = [].slice.call(document.querySelectorAll('[data-se-group]'));
  var total = rows.length;

  /* THE SAME RULE AS THE BUILD'S, CHARACTER FOR CHARACTER. The suite runs
     both over the same strings and fails if they part company: flatten one
     side and not the other and the apostrophe becomes a wall. */
  function flat(v) {
    return String(v || '')
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/['\u2018\u2019\u02bc]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function apply() {
    var terms = flat(input.value).split(' ').filter(Boolean);
    var shown = 0;
    for (var i = 0; i < rows.length; i += 1) {
      var hay = rows[i].getAttribute('data-se') || '';
      var ok = true;
      for (var t = 0; t < terms.length; t += 1) {
        if (hay.indexOf(terms[t]) === -1) { ok = false; break; }
      }
      if (ok) shown += 1;
      /* `hidden` is the attribute, not the property, because `.se-row` is a
         list item with a display of its own and this project has already shipped
         that bug once: an element whose class declares a display beats the
         user-agent rule for [hidden]. The stylesheet carries the override. */
      if (ok) rows[i].removeAttribute('hidden');
      else rows[i].setAttribute('hidden', '');
    }
    /* A GROUP WITH NOTHING LEFT IN IT HIDES, AND THE STRIP RENUMBERS. This
       site has already shipped a rail reading 04 then 06 with a band hidden,
       and wrote down the rule: a band that is hidden takes no number. A filter
       hides bands, so the same rule has to hold as somebody types. The count
       beside it is rewritten too, or a heading reads "48 matches" over two. */
    var n = 0;
    for (var g = 0; g < groups.length; g += 1) {
      var live = groups[g].querySelectorAll('.se-row:not([hidden])').length;
      if (live) {
        groups[g].removeAttribute('hidden');
        n += 1;
        var num = groups[g].querySelector('.xrail__n');
        var lab = groups[g].querySelector('.xrail__l');
        if (num) num.textContent = n < 10 ? '0' + n : String(n);
        if (lab) {
          var one = lab.getAttribute('data-one') || '';
          var many = lab.getAttribute('data-many') || '';
          lab.textContent = live + ' ' + (live === 1 ? one : many);
        }
      } else groups[g].setAttribute('hidden', '');
    }
    if (!terms.length) {
      box.textContent = total + ' pages';
    } else {
      box.textContent = shown + (shown === 1 ? ' page' : ' pages') + ' of ' + total;
    }
    if (none) {
      if (terms.length && !shown) none.removeAttribute('hidden');
      else none.setAttribute('hidden', '');
    }
  }

  /* Read BEFORE the first apply, never after, or a reader arriving from the
     header watches 151 rows draw and then vanish. A half-escaped address is
     not a reason to blank the page, so a bad escape leaves the box empty and
     the index whole. */
  var q = /[?&]q=([^&]*)/.exec(location.search);
  if (q && !input.value) {
    try { input.value = decodeURIComponent(q[1].replace(/\+/g, ' ')); } catch (e) {}
  }

  input.addEventListener('input', apply);
  /* A browser restoring a typed value on a back navigation fires no input
     event, so the list would disagree with the box it is filtered by. */
  apply();
}());
