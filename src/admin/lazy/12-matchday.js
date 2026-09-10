/* ==========================================================================
   CONTROL PANEL: MATCHDAY

   Every other screen here is a filing cabinet: it holds what the club has
   already done. This one is the only screen that looks FORWARD, and it exists
   because the panel had no way of saying "there is a match on Sunday and it
   is missing something".

   The dashboard's warnings are all retrospective. Every one of them is a
   variation on "you have failed to do this", and the club only ever sees them
   after the moment to act has gone. So a match arrived with no venue on it
   and nobody knew until the fixture card on the website said "venue to be
   confirmed" in public.

   THE ORDER THINGS HAPPEN IN IS THE ORDER THEY APPEAR IN
   A fixture is agreed, a squad is picked in the week, the match is played,
   the result and the man of the match go in afterwards. Four things, and
   until now they were spread across two screens with the middle one missing
   entirely, because a line-up could only be recorded on the match form and
   the match form does not exist until the match has been played. A squad
   picked on Friday had nowhere to go.

   WHY THE SQUAD LIVES ON THE FIXTURE
   Not so a graphic can list it. It goes here because it is true here: these
   are the players who are down to play. It earns its place today by filling
   in the team sheet when the result is entered, which is the longest part of
   recording a match, so the club gets time back for the same typing rather
   than being asked for something extra.
   ========================================================================== */
(function () {
  'use strict';
  var CP = window.CP;
  var M = window.CPM;
  var U = window.CPU;
  var $ = U.$;
  var $$ = U.$$;
  var esc = U.esc;
  var sec = U.sec;
  var where = U.where;
  var empty = U.empty;
  var toast = U.toast;
  var guard = U.guard;
  var refresh = U.refresh;
  var fixtureIso = U.fixtureIso;
  var dayOf = U.dayOf;

  var SEED = window.SA_SEED || {};
  var SQUAD = SEED.squad || [];
  var US = 'Sue’s Angels FC';

  /* Sixteen: eleven and five. Nothing enforces a minimum, because a Sunday
     league club turning up with nine is a real Sunday and the panel is not
     the place to argue about it. */
  var SLOTS = 16;

  /* THE ELEVEN AND THE BENCH, SAID OUT LOUD. Enter result reads this list in
     order: the first eleven become the starting eleven on the team sheet and
     the rest the bench. The screen said "Player 1" to "Player 16" and never
     said so, so a keeper picked in slot 14 went onto the sheet as a
     substitute, and a blank in slot 10 pulled the first substitute up into the
     eleven. The count of starters is saved beside the list now, and the match
     form reads it. */
  var STARTERS = 11;

  /* The fixture being worked on, kept here rather than on the panel element:
     switching match redraws the panel fresh instead of re-running this screen
     on the same element, which stacked a click handler per switch and let one
     Save write to two fixtures. */
  var CHOSEN = '';

  /* Where somebody plays, read from the words on his record. Four groups is
     all a squad picker needs, and a position nobody recognises still lists. */
  var GROUPS = [
    ['gk', 'Goalkeepers', /goal ?keeper|^gk$/i],
    ['def', 'Defenders', /back|defend|sweeper/i],
    ['mid', 'Midfielders', /midfield/i],
    ['fwd', 'Forwards', /forward|striker|winger|attack/i],
    ['other', 'Squad', null],
  ];
  function groupOf(p) {
    var pos = String((p && p.pos) || '');
    for (var g = 0; g < GROUPS.length - 1; g++) if (GROUPS[g][2].test(pos)) return GROUPS[g][0];
    return 'other';
  }
  function surname(p) { return String(p.last || String(p.name || '').split(' ').pop()); }
  function byNum(num) { return SQUAD.filter(function (x) { return String(x.num) === String(num); })[0]; }

  function nameOf(num) {
    var p = SQUAD.filter(function (x) { return String(x.num) === String(num); })[0];
    return p ? p.name : '';
  }
  function today() { return new Date().toISOString().slice(0, 10); }

  function oppOf(f) {
    return /Sue.s Angels/.test(f.home || '') ? (f.away || '') : (f.home || '');
  }
  /* Built by hand rather than through toLocaleDateString, which puts a comma
     after the weekday ("Sunday, 30 August 2026") and the club writes it
     without one. Midday, so no timezone can move the day. */
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  function longDate(iso) {
    if (!iso) return 'No date yet';
    var d = new Date(iso + 'T12:00:00');
    if (isNaN(d)) return iso;
    return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + FULL[d.getMonth()] + ' ' + d.getFullYear();
  }

  /* ------------------------------------------------------------------------
     WHAT IS ON RECORD FOR THIS MATCH

     Four rows, in the order the information arrives. Each says what it is
     waiting on and where to go, and none of them claims anything that is not
     in the database: "ready" means the field is filled in, not that something
     has been published from it.
     --------------------------------------------------------------------- */
  function checklist(f, squad, result) {
    var iso = fixtureIso({ data: f, key: f.__key });
    var isPast = iso && iso < today();
    var rows = [];

    var missing = [];
    if (!f.kick) missing.push('a kick-off time');
    if (!f.venue) missing.push('a venue');
    rows.push(['The fixture',
      missing.length ? 'incomplete' : 'ready',
      missing.length
        ? 'No ' + missing.join(' and ') + ' on this fixture, so the website says '
          + '"to be confirmed" against it.'
        : longDate(iso) + (f.kick ? ', ' + f.kick : '') + ' at ' + f.venue,
      missing.length ? ['Fixtures', 'fixtures'] : null]);

    var k = typeof f.squadStarters === 'number' ? f.squadStarters : Math.min(STARTERS, squad.length);
    rows.push(['The matchday squad',
      squad.length ? 'ready' : (isPast ? 'not recorded' : 'waiting'),
      squad.length
        ? summary({ starters: squad.slice(0, k), bench: squad.slice(k) })
        : (isPast
          ? 'The match has been played and no squad was picked. Nothing is lost: '
            + 'the team sheet on the result is the record that counts.'
          : 'Pick it below. It fills in the team sheet when the result goes in.'),
      null]);

    /* Before kick-off there is nothing to say about a result or a man of the
       match, and two rows reading "after the match" said it anyway. */
    if (!isPast && !result) return rows;

    rows.push(['The result',
      result ? 'ready' : (isPast ? 'waiting' : 'after the match'),
      result ? 'Recorded.'
        : (isPast
          ? 'Played, with no score entered. The website is showing it as awaiting a result.'
          : 'Nothing to do until it has been played.'),
      isPast && !result ? ['Enter the result', 'fixtures'] : null]);

    rows.push(['The man of the match',
      result && result.motm ? 'ready' : (result ? 'waiting' : 'after the match'),
      result && result.motm ? result.motm
        : (result
          ? 'The result is in but nobody is named. It is a dropdown on the match form.'
          : 'Nothing to do until it has been played.'),
      result && !result.motm ? ['Results and reports', 'results'] : null]);

    return rows;
  }

  /* THE PANEL'S OWN BADGE, NOT A CLASS OF THIS SCREEN'S OWN. `cp-chip` and
     its three modifiers were defined by no stylesheet, so this rendered as
     bare text where the rest of the panel shows a coloured pill. Invisible to
     a suite that reads markup and to a test DOM with no cascade, which is why
     it survived: nothing here is wrong except that it looks like nothing. */
  function stateChip(state) {
    return '<span class="badge badge--' +
      (state === 'ready' ? 'success' : state === 'waiting' || state === 'incomplete' ? 'warning' : 'neutral') +
      '">' + esc(state) + '</span>';
  }

  function checklistTable(rows) {
    return '<div class="table-wrap scroll-x"><table class="data">' +
      '<thead><tr><th scope="col">What</th><th scope="col">State</th>' +
      '<th scope="col">Detail</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr><td><b>' + esc(r[0]) + '</b></td>' +
          '<td>' + stateChip(r[1]) + '</td>' +
          '<td>' + esc(r[2]) +
          (r[3] ? ' <button class="btn btn--ghost btn--sm" type="button" data-goto="'
            + esc(r[3][1]) + '">' + esc(r[3][0]) + '</button>' : '') +
          '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* ---- The squad picker -------------------------------------------------
     Names, never numbers. The site does not show a shirt number anywhere and
     neither does this: the value carries the number because that is what a
     team sheet stores, and the operator only ever sees a name. */
  /* NOBODY WHO HAS LEFT IS OFFERED. This screen listed every player who has
     ever been at the club, so the picker for a 26/27 fixture put fourteen
     people in the list who had retired or moved on - and picking one writes
     him onto the fixture, which the match form then reads as the team sheet.
     The match form has always filtered; this screen was added later and never
     did.

     `goneFrom` is derived once in dataset.mjs rather than judged here, so
     this is a date comparison and not a fourth copy of a rule that has
     already drifted once. Anybody already picked stays in his own dropdown
     however long ago he left: dropping a stored name out of the control that
     holds it would blank him on the next save. */
  function slot(i, value, iso, taken) {
    var pool = SQUAD.filter(function (p) {
      if (String(p.num) === String(value)) return true;
      return !(p.goneFrom && iso && iso >= p.goneFrom);
    });
    /* Grouped by position and in surname order, the way a team sheet is read.
       The group names are disabled options rather than optgroups, so they are
       plain markup every browser draws the same. Somebody already named in
       another slot is shown but cannot be picked twice. */
    var opts = ['<option value="">Nobody</option>'];
    GROUPS.forEach(function (g) {
      var men = pool.filter(function (p) { return groupOf(p) === g[0]; })
        .sort(function (a, b) { return surname(a).localeCompare(surname(b)); });
      if (!men.length) return;
      opts.push('<option disabled>' + esc(g[1]) + '</option>');
      men.forEach(function (p) {
        var mine = String(p.num) === String(value);
        opts.push('<option value="' + esc(p.num) + '"' + (mine ? ' selected' : '') +
          (!mine && taken[p.num] ? ' disabled' : '') + '>' + esc(p.name) + '</option>');
      });
    });
    var label = i < STARTERS ? 'Starter ' + (i + 1) : 'Substitute ' + (i - STARTERS + 1);
    return '<label class="field"><span class="field__label">' + label + '</span>' +
      '<select class="input" data-slot="' + i + '">' + opts.join('') + '</select></label>';
  }

  /* The starters and the bench as picked, each in slot order, blanks dropped
     within its own half so a gap in the eleven never promotes a substitute. */
  function readSquad(host) {
    var seen = {};
    var sels = $$('[data-slot]', host);
    var pick = function (from, to) {
      return sels.slice(from, to).map(function (el) { return el.value; })
        .filter(function (v) {
          if (!v || seen[v]) return false;   /* one player cannot be named twice */
          seen[v] = 1;
          return true;
        }).map(Number);
    };
    var starters = pick(0, STARTERS);
    var bench = pick(STARTERS, SLOTS);
    return { starters: starters, bench: bench, all: starters.concat(bench) };
  }

  function summary(picked) {
    var s = picked.starters.length;
    var b = picked.bench.length;
    if (!s && !b) return 'Nobody picked yet.';
    var keeper = picked.starters.some(function (n) { var p = byNum(n); return p && groupOf(p) === 'gk'; });
    return s + ' starting' + (s < STARTERS ? ' (' + (STARTERS - s) + ' short of eleven)' : '') +
      ', ' + b + ' on the bench.' + (s && !keeper ? ' No goalkeeper in the starting eleven.' : '');
  }

  function squadBody(squad, iso, k) {
    var starters = squad.slice(0, k);
    var bench = squad.slice(k);
    var taken = {};
    squad.forEach(function (n) { taken[n] = 1; });
    return '<p class="cp-note"><b>Starting eleven</b></p><div class="grid grid--3">' +
        Array.from({ length: STARTERS }, function (_, i) { return slot(i, starters[i], iso, taken); }).join('') +
      '</div>' +
      '<p class="cp-note"><b>Substitutes</b></p><div class="grid grid--3">' +
        Array.from({ length: SLOTS - STARTERS }, function (_, i) {
          return slot(STARTERS + i, bench[i], iso, taken);
        }).join('') +
      '</div>' +
      '<p class="cp-note" data-md-count aria-live="polite">' +
        esc(summary({ starters: starters, bench: bench })) + '</p>';
  }

  /* Whoever is named in one slot is greyed out in the others, as the picking
     happens, and the count underneath follows. */
  function syncTaken(host) {
    var sels = $$('[data-slot]', host);
    var used = {};
    sels.forEach(function (el) { if (el.value) used[el.value] = (used[el.value] || 0) + 1; });
    sels.forEach(function (el) {
      $$('option', el).forEach(function (o) {
        var v = o.getAttribute('value');
        if (!v) return;
        if (used[v] && v !== el.value) o.setAttribute('disabled', '');
        else o.removeAttribute('disabled');
      });
    });
    var count = $('[data-md-count]', host);
    if (count) count.textContent = summary(readSquad(host));
  }

  M.matchday = function (host) {
    return Promise.all([
      CP.readAll('fixtures'),
      CP.readAll('matches'),
      CP.readAll('player_photos').catch(function () { return []; }),
      /* The merge lives with the match lists, and anybody entering results has
         that chunk already. A failure leaves the screen on the build's squad. */
      U.chunk('match').catch(function () {}),
    ]).then(function (r) {
      var fixtures = r[0] || [];
      var matches = r[1] || [];
      /* WHO CAN BE NAMED IS WHO IS AT THE CLUB TODAY, not at the last publish.
         This screen took the build's squad and nothing else, so a player added
         on the Squad screen on Saturday could not be put in Sunday's matchday
         squad until somebody published. Same merge as the match form. */
      if (window.CPMH && window.CPMH.squadNow) SQUAD = window.CPMH.squadNow(SEED.squad, r[2] || []);

      /* A result exists for a day when a match row keyed r<date> does. Same
         question the dashboard asks, same helper, so the two screens cannot
         give different answers about the same Sunday. */
      var byDay = {};
      matches.forEach(function (m) {
        if (/^r/.test(m.key || '')) byDay[dayOf(m.key)] = m.data || {};
      });

      var live = fixtures
        .map(function (row) {
          var f = Object.assign({}, row.data || {});
          f.__key = row.key;
          return f;
        })
        .filter(function (f) { return !byDay[dayOf(f.__key)]; })
        .sort(function (a, b) {
          return fixtureIso({ data: a, key: a.__key })
            .localeCompare(fixtureIso({ data: b, key: b.__key }));
        });

      if (!live.length) {
        host.innerHTML = sec({
          title: 'Matchday',
          sub: 'Everything one match needs, in the order it happens.',
          body: empty('No fixtures are waiting.',
            'Every fixture on record has its result in. Add the next one in Fixtures and it '
            + 'appears here with what it still needs.')
            + '<p><button class="btn btn--primary" type="button" data-goto="fixtures">'
            + 'Add a fixture</button></p>',
        });
        return;
      }

      /* The next one that has not been played leads, which is the one the
         club is actually working towards. Anything already played and still
         without a score sorts above it, because that is more urgent than
         Sunday. */
      var chosenKey = CHOSEN;
      var chosen = live.filter(function (f) { return f.__key === chosenKey; })[0] || live[0];
      var f = chosen;
      var iso = fixtureIso({ data: f, key: f.__key });
      var squad = (f.squad || []).slice();
      var k = typeof f.squadStarters === 'number' ? f.squadStarters : Math.min(STARTERS, squad.length);
      var result = byDay[dayOf(f.__key)] || null;

      var picker = live.length > 1
        ? '<label class="field"><span class="field__label">Match</span>' +
          '<select class="input" id="md-which">' +
          live.map(function (x) {
            var xi = fixtureIso({ data: x, key: x.__key });
            return '<option value="' + esc(x.__key) + '"' +
              (x.__key === f.__key ? ' selected' : '') + '>' +
              esc(longDate(xi) + '  ·  ' + oppOf(x)) + '</option>';
          }).join('') + '</select></label>'
        : '';

      host.innerHTML =
        sec({
          title: (f.home || US) + ' v ' + (f.away || ''),
          sub: esc(longDate(iso)) + (f.kick ? ' · ' + esc(f.kick) : '') +
            (f.competition ? ' · ' + esc(f.competition) : ''),
          body: picker + checklistTable(checklist(f, squad, result)),
        }) +
        sec({
          title: 'The matchday squad',
          sub: 'Who is down to play. When the result goes in, the starting eleven here becomes '
            + 'the starting eleven on the team sheet and the substitutes the bench.',
          body: squadBody(squad, iso, k) +
            '<div class="cp-head__actions">' +
            '<button class="btn btn--primary" type="button" data-save-squad>Save squad</button> ' +
            '<button class="btn btn--ghost" type="button" data-copy-squad>Copy for WhatsApp</button> ' +
            '<button class="btn btn--ghost" type="button" data-clear-squad>Clear</button>' +
            '</div>' +
            /* Filled on every copy; shown only when the browser will not let the
               panel write to the clipboard, so the text is still one select-all
               away. */
            '<textarea class="textarea" data-copy-out rows="10" readonly hidden ' +
              'aria-label="The squad as text, ready to copy"></textarea>' +
            where([['Fixtures', '/fixtures.html']],
              'The squad itself is not published until the match is, and then it is the team '
              + 'sheet on the match page that shows it.'),
        });

      /* The badge is what this match is still waiting on, counted from the
         same rows the checklist draws, so the number and the screen can never
         disagree. Nothing waiting, no badge. */
      if (U.setCount) {
        U.setCount('matchday', checklist(f, squad, result)
          .filter(function (r) { return r[1] === 'waiting' || r[1] === 'incomplete'; }).length);
      }

      var whichEl = $('#md-which', host);
      if (whichEl) {
        whichEl.addEventListener('change', function () {
          CHOSEN = whichEl.value;
          refresh('matchday');
        });
      }

      host.addEventListener('change', function (e) {
        if (e.target.matches('[data-slot]')) syncTaken(host);
      });

      host.addEventListener('click', function (e) {
        if (e.target.matches('[data-clear-squad]')) {
          $$('[data-slot]', host).forEach(function (el) { el.value = ''; });
          syncTaken(host);
          return;
        }

        /* THE SQUAD AS A MESSAGE. Picking it is half the job; the other half is
           telling the players, which happens in a group chat. Names only, the
           fixture first, the eleven and then the substitutes. */
        if (e.target.matches('[data-copy-squad]')) {
          var p2 = readSquad(host);
          if (!p2.all.length) { toast('Pick the squad first.'); return; }
          var lines = [(f.home || US) + ' v ' + (f.away || ''),
            longDate(iso) + (f.kick ? ', ' + f.kick : ''), f.venue || ''].filter(Boolean);
          lines.push('', 'Starting eleven');
          p2.starters.forEach(function (n) { lines.push(nameOf(n)); });
          if (p2.bench.length) {
            lines.push('', 'Substitutes');
            p2.bench.forEach(function (n) { lines.push(nameOf(n)); });
          }
          var text = lines.join('\n');
          var out = $('[data-copy-out]', host);
          out.value = text;
          var show = function () {
            out.removeAttribute('hidden');
            if (out.select) out.select();
            toast('Copy it from the box below the buttons.');
          };
          var nav = window.navigator;
          if (nav && nav.clipboard && nav.clipboard.writeText) {
            nav.clipboard.writeText(text).then(function () {
              toast('Copied. Paste it into the group chat.');
            }, show);
          } else {
            show();
          }
          return;
        }

        if (e.target.matches('[data-save-squad]')) {
          if (!guard()) return;
          var picked = readSquad(host);
          /* THE REST OF THE ROW IS WRITTEN BACK UNTOUCHED. This form knows
             about one field; a fixture row it has never heard a field of must
             survive being saved by it. */
          var next = Object.assign({}, f);
          delete next.__key;
          if (picked.all.length) {
            next.squad = picked.all;
            next.squadStarters = picked.starters.length;
          } else {
            delete next.squad;
            delete next.squadStarters;
          }
          CP.upsert('fixtures', f.__key, next).then(function () {
            toast(picked.all.length
              ? picked.starters.length + ' starting and ' + picked.bench.length + ' on the bench against ' + oppOf(f) + '.'
              : 'Squad cleared.');
            refresh('fixtures');
            refresh('matchday');
          }).catch(function (err) {
            toast('Could not save the squad: ' + (err && err.message ? err.message : 'unknown'), true);
          });
        }
      });
    });
  };
})();
