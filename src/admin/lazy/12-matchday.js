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

    rows.push(['The matchday squad',
      squad.length ? 'ready' : (isPast ? 'not recorded' : 'waiting'),
      squad.length
        ? squad.length + ' player' + (squad.length === 1 ? '' : 's') + ' named: '
          + squad.map(nameOf).filter(Boolean).join(', ')
        : (isPast
          ? 'The match has been played and no squad was picked. Nothing is lost: '
            + 'the team sheet on the result is the record that counts.'
          : 'Pick it below. It fills in the team sheet when the result goes in.'),
      null]);

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

  function stateChip(state) {
    return '<span class="cp-chip cp-chip--' +
      (state === 'ready' ? 'ok' : state === 'waiting' || state === 'incomplete' ? 'warn' : 'mute') +
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
  function slot(i, value, iso) {
    var opts = ['<option value="">Not selected</option>'].concat(
      SQUAD.filter(function (p) {
        if (String(p.num) === String(value)) return true;
        return !(p.goneFrom && iso && iso >= p.goneFrom);
      }).map(function (p) {
        return '<option value="' + esc(p.num) + '"' +
          (String(p.num) === String(value) ? ' selected' : '') + '>' + esc(p.name) + '</option>';
      })).join('');
    return '<label class="field"><span class="field__label">Player ' + (i + 1) + '</span>' +
      '<select class="input" data-slot="' + i + '">' + opts + '</select></label>';
  }

  function readSquad(host) {
    var seen = {};
    return $$('[data-slot]', host).map(function (el) { return el.value; })
      .filter(function (v) {
        if (!v || seen[v]) return false;   /* one player cannot be named twice */
        seen[v] = 1;
        return true;
      }).map(Number);
  }

  M.matchday = function (host) {
    return Promise.all([CP.readAll('fixtures'), CP.readAll('matches')]).then(function (r) {
      var fixtures = r[0] || [];
      var matches = r[1] || [];

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
      var chosenKey = host.getAttribute('data-chosen') || '';
      var chosen = live.filter(function (f) { return f.__key === chosenKey; })[0] || live[0];
      var f = chosen;
      var iso = fixtureIso({ data: f, key: f.__key });
      var squad = (f.squad || []).slice();
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
          sub: 'Who is down to play. Saving this fills in the team sheet when the result '
            + 'goes in, so it is the same typing done earlier rather than extra typing.',
          body: '<div class="grid grid--3">' +
            Array.from({ length: SLOTS }, function (_, i) { return slot(i, squad[i], iso); }).join('') +
            '</div>' +
            '<div class="cp-actions">' +
            '<button class="btn btn--primary" type="button" data-save-squad>Save squad</button> ' +
            '<button class="btn btn--ghost" type="button" data-clear-squad>Clear</button>' +
            '</div>' +
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
          host.setAttribute('data-chosen', whichEl.value);
          M.matchday(host);
        });
      }

      host.addEventListener('click', function (e) {
        if (e.target.matches('[data-clear-squad]')) {
          $$('[data-slot]', host).forEach(function (el) { el.value = ''; });
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
          if (picked.length) next.squad = picked;
          else delete next.squad;
          CP.upsert('fixtures', f.__key, next).then(function () {
            toast(picked.length
              ? picked.length + ' named for ' + oppOf(f) + '.'
              : 'Squad cleared.');
            refresh('fixtures');
            M.matchday(host);
          }).catch(function (err) {
            toast('Could not save the squad: ' + (err && err.message ? err.message : 'unknown'), true);
          });
        }
      });
    });
  };
})();
