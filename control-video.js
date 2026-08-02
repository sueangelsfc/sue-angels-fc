/* ==========================================================================
   CONTROL PANEL: VIDEO AND INTERVIEWS

   The section held one field per match: a YouTube link for the game. What the
   club actually comes home with on a Sunday is more than that. There is the
   footage, and there is the manager on the touchline afterwards, and there is
   a player before kick-off, and until now the only one of those with anywhere
   to go was the footage.

   Four slots per match: the match footage, a pre-match interview, a post-match
   interview, and anything else worth keeping. Each one takes a YouTube address
   in any form, or a short clip uploaded straight from a phone.

   ON UPLOADING FOOTAGE DIRECTLY
   It works, and it is the right thing for a two-minute interview: nobody wants
   to put a forty-second answer on YouTube first. It is the wrong thing for a
   ninety-minute match. The club's storage is measured in gigabytes and one
   full game is most of one, so a season of matches uploaded this way would
   fill it by October and the bill is the club's.

   So the limit is stated plainly on the button rather than discovered when an
   upload fails halfway: short clips here, full matches on YouTube, which hosts
   them for nothing and streams them better than this site could.
   ========================================================================== */
(function () {
  'use strict';
  var CP = window.CP;
  var M = window.CPM;
  var U = window.CPU;
  var $ = U.$;
  var esc = U.esc;
  var toast = U.toast;
  var guard = U.guard;
  var refresh = U.refresh;
  var sec = U.sec;
  var empty = U.empty;
  var youtubeId = U.youtubeId;
  var matchLabel = U.matchLabel;

  /* Sixty megabytes is about two minutes off a phone at 1080p. Past that it is
     a match, and a match belongs on YouTube. */
  var MAX_CLIP = 60 * 1024 * 1024;

  var SLOTS = [
    { key: 'videoId', clip: 'videoFile', label: 'Match footage',
      hint: 'The game itself. Put a long one on YouTube and paste the link.' },
    { key: 'preId', clip: 'preFile', label: 'Before the game',
      hint: 'A player or the manager on what is coming.' },
    { key: 'postId', clip: 'postFile', label: 'After the game',
      hint: 'The reaction, while it is still fresh.' },
    { key: 'extraId', clip: 'extraFile', label: 'Anything else',
      hint: 'A goal, a presentation, a warm-up.' },
  ];

  function thumb(id) {
    return '<a href="https://www.youtube.com/watch?v=' + esc(id) + '" target="_blank" rel="noopener">'
      + '<img src="https://i.ytimg.com/vi/' + esc(id) + '/default.jpg" alt="" width="72" height="54" '
      + 'style="border-radius:6px;display:block"></a>';
  }

  M.videos = function (host) {
    return CP.readAll('matches').then(function (rows) {
      var list = (rows || []).slice().sort(function (a, b) {
        return String(b.key).localeCompare(String(a.key));
      });
      if (!list.length) {
        host.innerHTML = empty('No matches stored', 'Record a result first and it appears here.');
        return;
      }
      var counted = SLOTS.map(function (s) {
        return {
          label: s.label,
          n: list.filter(function (r) { return (r.data || {})[s.key] || (r.data || {})[s.clip]; }).length,
        };
      });

      host.innerHTML =
        sec({
          title: 'Video and interviews',
          sub: 'Four things per match: the footage, somebody before the game, somebody after it, and '
            + 'anything else worth keeping. Paste a YouTube address in any form, or upload a short '
            + 'clip straight from a phone. '
            + counted.map(function (c) {
              return '<b>' + esc(c.n) + '</b> ' + esc(c.label.toLowerCase());
            }).join(', ') + '.',
          body: '<p class="cp-note">A full match is a gigabyte and the club’s storage is measured in '
            + 'them, so anything longer than about two minutes goes on YouTube, which hosts it for '
            + 'nothing and streams it better than this site could. Interviews are what the upload '
            + 'button is for.</p>',
          where: [['Videos', '/videos.html'], ['Live', '/live.html'], ['Every match report', '/results.html']],
        }) +

        list.map(function (r) {
          var d = r.data || {};
          var any = SLOTS.some(function (s) { return d[s.key] || d[s.clip]; });
          return sec({
            title: matchLabel(r.key),
            sub: any ? '' : 'Nothing recorded for this match yet.',
            body: '<div class="vslots" data-key="' + esc(r.key) + '">' +
              SLOTS.map(function (s) {
                var id = d[s.key] || '';
                var file = d[s.clip] || '';
                return '<div class="vslot" data-slot="' + esc(s.key) + '">' +
                  '<div class="vslot__head">' +
                    '<b>' + esc(s.label) + '</b>' +
                    '<span>' + esc(s.hint) + '</span>' +
                  '</div>' +
                  '<div class="vslot__row">' +
                    '<input class="input" data-vid value="' + esc(id) + '" ' +
                      'aria-label="' + esc(s.label) + ' YouTube address" placeholder="https://youtu.be/…">' +
                    '<label class="btn btn--ghost btn--sm" style="cursor:pointer;flex:0 0 auto">Upload a clip' +
                      '<input type="file" accept="video/*" hidden data-clip></label>' +
                    '<button class="btn btn--primary btn--sm" data-save>Save</button>' +
                    (id || file ? '<button class="btn btn--quiet btn--sm" data-clear>Clear</button>' : '') +
                  '</div>' +
                  '<div class="vslot__out">' +
                    (id ? thumb(id) : '') +
                    (file ? '<video src="' + esc(file) + '" controls preload="none" '
                      + 'style="width:220px;border-radius:6px;display:block"></video>' : '') +
                    '<span class="cp-note" data-note></span>' +
                  '</div>' +
                '</div>';
              }).join('') +
            '</div>',
          });
        }).join('');

      /* One write path for every slot and both kinds of source. An empty value
         REMOVES the field rather than storing an empty string, which the site
         would otherwise treat as a video that exists. */
      function write(key, patch, msg) {
        var rec = list.filter(function (x) { return x.key === key; })[0];
        var next = Object.assign({}, rec.data || {});
        Object.keys(patch).forEach(function (k) {
          if (patch[k]) next[k] = patch[k]; else delete next[k];
        });
        return CP.upsert('matches', key, next).then(function () {
          rec.data = next;
          toast(msg, 'success');
          refresh('videos');
        }).catch(function (e) { toast(e.message, 'error'); });
      }

      host.addEventListener('change', function (e) {
        if (!e.target.matches('[data-clip]')) return;
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!guard()) { e.target.value = ''; return; }
        var slot = e.target.closest('[data-slot]');
        var key = e.target.closest('[data-key]').getAttribute('data-key');
        var which = slot.getAttribute('data-slot');
        var clipField = SLOTS.filter(function (s) { return s.key === which; })[0].clip;
        var note = $('[data-note]', slot);
        if (file.size > MAX_CLIP) {
          note.textContent = 'That is ' + Math.round(file.size / 1024 / 1024) + 'MB, which is a match '
            + 'rather than a clip. Put it on YouTube and paste the link instead.';
          e.target.value = '';
          return;
        }
        note.textContent = 'Uploading ' + Math.round(file.size / 1024 / 1024) + 'MB.';
        var name = which + '-' + key + '-' + Date.now() + '.' + (file.name.split('.').pop() || 'mp4');
        CP.upload('gallery', name, file).then(function (url) {
          var patch = {};
          patch[clipField] = url;
          return write(key, patch, 'Clip saved');
        }).catch(function (err) { note.textContent = err.message; });
      });

      host.addEventListener('click', function (e) {
        var slot = e.target.closest('[data-slot]');
        if (!slot) return;
        var key = e.target.closest('[data-key]').getAttribute('data-key');
        var which = slot.getAttribute('data-slot');
        var clipField = SLOTS.filter(function (s) { return s.key === which; })[0].clip;

        if (e.target.matches('[data-clear]')) {
          if (!guard()) return;
          var wipe = {};
          wipe[which] = '';
          wipe[clipField] = '';
          write(key, wipe, 'Cleared');
          return;
        }
        if (!e.target.matches('[data-save]')) return;
        if (!guard()) return;
        var raw = $('[data-vid]', slot).value;
        var id = youtubeId(raw);
        if (raw.trim() && !id) {
          $('[data-note]', slot).textContent = 'That does not look like a YouTube address or id.';
          return;
        }
        var patch = {};
        patch[which] = id;
        write(key, patch, id ? 'Saved' : 'Removed');
      });
    });
  };
})();
