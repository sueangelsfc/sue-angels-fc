/* ==========================================================================
   CONTROL PANEL: FIXTURES, RESULTS AND THE MATCH FORM

   Loaded the first time Fixtures or Results is opened, not on sign-in.

   control.js shipped all thirteen modules to somebody who opened one, and its
   budget went 16 -> 18 -> 24 -> 30KB in a single sitting for that one reason.
   This is the heaviest third of it and the part most sessions never touch:
   the pitch, the position codes, the pickers, the five-tab match form. Signing
   in to read the inbox no longer downloads any of it.

   It borrows the shell's helpers rather than carrying its own copies. window.CPU
   is that set, published by control.js before this can possibly run.
   ========================================================================== */
(function () {
  'use strict';
  var CP = window.CP;
  var M = window.CPM;
  var U = window.CPU;
  var $ = U.$;
  var $$ = U.$$;
  var esc = U.esc;
  var toast = U.toast;
  var guard = U.guard;
  var refresh = U.refresh;
  var confirmAction = U.confirmAction;
  var sec = U.sec;
  var table = U.table;
  var empty = U.empty;
  var matchLabel = U.matchLabel;

  /* ==========================================================================
     FIXTURES

     This was a raw JSON editor, like every other module. To add one match a
     volunteer had to invent a row key in the site's own id format, then type

       {"date":"","kick":"11:00","home":"Sue's Angels FC","away":"",
        "competition":"League Eight","venue":"","kind":"fixture"}

     by hand, with a JSON parse error as the only feedback. The table has nil
     rows and the season starts tomorrow, which is the review this design
     already failed.

     Now it is a form. The key is derived, "us" comes from the generator so
     the club's own name is never typed, and the opponent and competition are
     pickers built from clubs the record already knows, because a misspelt
     opponent silently loses that club's badge on the website.
     ========================================================================== */
  var SEED = window.SA_SEED || {};
  var US = SEED.club || "Sue's Angels FC";

  /* The site's row-key format: f + YYYYMMDD + a slug of the opponent. Derived
     rather than asked for, because it is a format, not a decision. */
  function fixtureKey(iso, opponent) {
    var slug = String(opponent || 'tbc').toLowerCase()
      .replace(/\b(fc|afc|cf|united|town|club)\b/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-')[0] || 'tbc';
    return 'f' + String(iso || '').replace(/-/g, '') + '-' + slug;
  }

  /* The site prints `date` as written, so it is stored in the same "02 Aug
     2026" form the rest of the record uses rather than an ISO string. */
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function prettyDate(iso) {
    var p = String(iso || '').split('-');
    if (p.length !== 3) return '';
    return p[2] + ' ' + (MONTHS[Number(p[1]) - 1] || '') + ' ' + p[0];
  }

  function optionList(id, values) {
    return '<datalist id="' + id + '">' +
      (values || []).map(function (v) { return '<option value="' + esc(v) + '"></option>'; }).join('') +
      '</datalist>';
  }

  /* "Sunday 24 May 2026". The panel says dates the way a person says them,
     never as an ISO string and never as a row key. */
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var FULLMON = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  function longDate(iso) {
    var p = String(iso || '').split('-');
    if (p.length !== 3) return '';
    var dt = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    if (isNaN(+dt)) return '';
    return DAYS[dt.getDay()] + ' ' + Number(p[2]) + ' ' + FULLMON[Number(p[1]) - 1] + ' ' + p[0];
  }

  /* A fixture in a sentence, for confirm dialogs and previews: the two things
     that used to show a row key because the key happened to contain them. */
  function fixtureLine(f) {
    var weAreHome = f.home ? /Sue.s Angels/.test(f.home) : true;
    var opp = weAreHome ? (f.away || 'to be confirmed') : (f.home || 'to be confirmed');
    return (f.neutral ? 'Neutral ground v ' : weAreHome ? 'Home to ' : 'Away to ') + opp +
      (f.date ? ', ' + f.date : '') + (f.kick ? ', ' + f.kick + ' kick-off' : '');
  }

  M.fixtures = function (host) {
    return CP.readAll('fixtures').then(function (rows) {
      var list = (rows || []).slice().sort(function (a, b) {
        return String(a.key).localeCompare(String(b.key));
      });
      var have = {};
      list.forEach(function (r) { have[r.key] = true; });
      var missing = (SEED.baselineFixtures || []).filter(function (f) { return !have[f.id]; });

      host.innerHTML =
        /* The six pre-season fixtures are already transcribed in the site's
           code baseline and shown on the website from there. Until they are
           real rows nobody can edit them without a deploy. */
        (missing.length
          ? sec({
            warn: true,
            title: missing.length + ' fixture' + (missing.length === 1 ? ' is' : 's are') + ' not in the database yet',
            sub: 'The website is showing these from the site’s code, which means they cannot be '
              + 'edited here and a change needs a developer. Import them once and they become '
              + 'ordinary fixtures you control.',
            actions: '<button class="btn btn--primary" data-import>Import ' + esc(missing.length) + ' fixtures</button>',
            body: '<ul class="cp-list">' + missing.map(function (f) {
              return '<li>' + esc(fixtureLine(f)) + '</li>';
            }).join('') + '</ul>',
          })
          : '') +

        sec({
          title: 'Add a fixture',
          sub: 'The club’s own name is never typed: choose home or away and the rest follows.',
          body:
            '<div class="grid grid--2">' +
              '<div class="field"><label class="field__label" for="fx-date">Date</label>' +
                '<input class="input" id="fx-date" type="date"></div>' +
              '<div class="field"><label class="field__label" for="fx-kick">Kick-off</label>' +
                '<input class="input" id="fx-kick" type="time" value="11:00"></div>' +
              '<div class="field"><label class="field__label" for="fx-opp">Opponent</label>' +
                '<input class="input" id="fx-opp" list="fx-clubs" placeholder="Start typing a club"></div>' +
              '<div class="field"><label class="field__label" for="fx-comp">Competition</label>' +
                '<input class="input" id="fx-comp" list="fx-comps" value="' + esc(SEED.division || '') + '"></div>' +
              '<div class="field"><label class="field__label" for="fx-ha">Home or away</label>' +
                '<select class="select" id="fx-ha">' +
                  '<option value="home">Home</option><option value="away">Away</option>' +
                  '<option value="neutral">Neutral ground</option></select></div>' +
              '<div class="field"><label class="field__label" for="fx-venue">Venue</label>' +
                '<input class="input" id="fx-venue" placeholder="' + esc(SEED.venue || '') + '"></div>' +
            '</div>' +
            optionList('fx-clubs', SEED.clubs) + optionList('fx-comps', SEED.competitions) +
            '<p class="field__error" data-fx-err hidden></p>' +
            '<div class="cp-head__actions" style="margin-top:var(--space-4)">' +
              '<button class="btn btn--primary" data-fx-add>Add fixture</button>' +
              '<span class="cp-note" data-fx-preview></span>' +
            '</div>',
          where: [['Fixtures', '/fixtures.html'], ['Home page next-match card', '/']],
          whereNote: 'after you publish',
        }) +

        sec({
          title: 'Fixtures to come',
          sub: 'When a match has been played, <b>Enter result</b> opens the match form already filled '
            + 'in from the fixture. Saving it records the result and takes the fixture off this list, '
            + 'because a match is either still to come or it has happened, never both.',
          body: (list.length
            ? table(['Date', 'Fixture', 'Competition', 'Kick-off', ''], list.map(function (r) {
              var f = r.data || {};
              return '<tr data-key="' + esc(r.key) + '">' +
                '<td>' + esc(f.date || '') + '</td>' +
                '<td><b>' + esc(f.home || '') + '</b> v <b>' + esc(f.away || '') + '</b></td>' +
                '<td>' + esc(f.competition || '') + '</td>' +
                '<td>' + esc(f.kick || '') + '</td>' +
                '<td><button class="btn btn--primary btn--sm" data-fx-result>Enter result</button> ' +
                  '<button class="btn btn--ghost btn--sm" data-fx-edit>Edit</button> ' +
                  '<button class="btn btn--quiet btn--sm" data-del>Remove</button></td>' +
              '</tr>';
            }).join(''))
            : empty('No fixtures stored',
              'Add one above and it appears on the website at the next publish, including the next-match card on the home page.')),
        });

      var err = $('[data-fx-err]', host);
      var preview = $('[data-fx-preview]', host);

      function readForm() {
        var iso = $('#fx-date', host).value;
        var opp = $('#fx-opp', host).value.trim();
        var ha = $('#fx-ha', host).value;
        var weAreHome = ha === 'home';
        return {
          iso: iso,
          opponent: opp,
          key: fixtureKey(iso, opp),
          row: {
            kind: 'fixture',
            date: prettyDate(iso),
            iso: iso,
            kick: $('#fx-kick', host).value || '',
            home: weAreHome ? US : opp,
            away: weAreHome ? opp : US,
            competition: $('#fx-comp', host).value.trim(),
            venue: $('#fx-venue', host).value.trim() || (weAreHome ? (SEED.venue || '') : ''),
            neutral: ha === 'neutral' || undefined,
          },
        };
      }

      /* The fixture is read back in words as it is typed. It used to print the
         derived row key here, which is a database format, not a fixture: the
         one thing the operator cannot check by eye is whether "f20260524-bpr"
         is the right match. "Home to BPR Men's, Sunday 24 May 2026" is. */
      function paintPreview() {
        var f = readForm();
        preview.textContent = f.iso && f.opponent
          ? (editingKey ? 'Saves as: ' : 'Adds: ') +
            fixtureLine({ home: f.row.home, away: f.row.away, neutral: f.row.neutral,
              date: longDate(f.iso), kick: f.row.kick })
          : '';
      }
      ['#fx-date', '#fx-opp', '#fx-ha'].forEach(function (sel) {
        var el = $(sel, host);
        if (el) el.addEventListener('input', paintPreview);
      });

      /* Editing reuses the form above rather than opening a second one: a
         fixture has six fields and two places to change them is one too many.
         The key is held so a date or opponent change rewrites the same row
         instead of leaving the old one behind. */
      var editingKey = null;
      function loadForEdit(key) {
        var rec = list.filter(function (x) { return x.key === key; })[0];
        if (!rec) return;
        var f = rec.data || {};
        var weAreHome = f.home ? !!/Sue.s Angels/.test(f.home) : true;
        $('#fx-date', host).value = f.iso || isoFromPretty(f.date) || '';
        $('#fx-kick', host).value = f.kick || '';
        $('#fx-opp', host).value = weAreHome ? (f.away || '') : (f.home || '');
        $('#fx-comp', host).value = f.competition || '';
        $('#fx-ha', host).value = f.neutral ? 'neutral' : (weAreHome ? 'home' : 'away');
        $('#fx-venue', host).value = f.venue || '';
        editingKey = key;
        $('[data-fx-add]', host).textContent = 'Save changes';
        paintPreview();
        $('#fx-date', host).scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      host.addEventListener('click', function (e) {
        if (e.target.matches('[data-fx-edit]')) {
          if (!guard()) return;
          loadForEdit(e.target.closest('tr[data-key]').getAttribute('data-key'));
          return;
        }

        /* THE FIXTURE BECOMES THE RESULT ---------------------------------
           A fixture and the match it turns into were two unrelated pieces of
           work: you added the fixture here, then went to Results and typed the
           date, the opponent, the competition and the venue in again, then
           came back and deleted the fixture by hand. Forget the last step and
           the website shows a match in the "still to come" list that it has
           already reported the score of.

           One button. The match form opens carrying everything the fixture
           already knew, and saving it removes the fixture in the same breath,
           so the two can never disagree. */
        if (e.target.matches('[data-fx-result]')) {
          if (!guard()) return;
          var fkey = e.target.closest('tr[data-key]').getAttribute('data-key');
          var frec = list.filter(function (x) { return x.key === fkey; })[0];
          if (!frec) return;
          openMatch({
            seed: Object.assign({}, frec.data, { kind: 'score' }),
            fromFixture: fkey,
            after: function () { refresh('fixtures'); },
          });
          return;
        }
        if (e.target.matches('[data-import]')) {
          if (!guard()) return;
          e.target.setAttribute('data-loading', 'true');
          /* Sequential, not parallel: a partial import is far easier to reason
             about when the rows land in order. */
          missing.reduce(function (chain, f) {
            return chain.then(function () {
              return CP.upsert('fixtures', f.id, {
                kind: 'fixture', date: f.date, home: f.home, away: f.away,
                competition: f.competition || 'Pre-season friendly',
                kick: f.kick || '', venue: f.venue || '',
              });
            });
          }, Promise.resolve()).then(function () {
            toast('Imported ' + missing.length + ' fixtures', 'success');
            refresh('fixtures');
          }).catch(function (e2) {
            toast(e2.message, 'error');
            e.target.removeAttribute('data-loading');
          });
          return;
        }

        if (e.target.matches('[data-fx-add]')) {
          if (!guard()) return;
          var f = readForm();
          if (!f.iso) { err.textContent = 'Pick a date.'; err.hidden = false; return; }
          if (!f.opponent) { err.textContent = 'Name the opponent.'; err.hidden = false; return; }
          if (have[f.key] && f.key !== editingKey) {
            err.textContent = 'A fixture with the key ' + f.key + ' already exists.';
            err.hidden = false; return;
          }
          err.hidden = true;
          var wasEditing = editingKey;
          CP.upsert('fixtures', f.key, f.row).then(function () {
            /* Changing the date or the opponent changes the derived key, so
               the row it used to live under has to go or the fixture appears
               twice. */
            if (wasEditing && wasEditing !== f.key) return CP.remove('fixtures', wasEditing);
            return null;
          }).then(function () {
            toast(wasEditing ? 'Fixture updated' : 'Fixture added', 'success');
            refresh('fixtures');
          }).catch(function (e2) { err.textContent = e2.message; err.hidden = false; });
          return;
        }

        if (e.target.matches('[data-del]')) {
          if (!guard()) return;
          var row = e.target.closest('tr[data-key]');
          var key = row.getAttribute('data-key');
          var rec = list.filter(function (x) { return x.key === key; })[0];
          confirmAction({
            title: 'Remove this fixture?',
            body: fixtureLine((rec && rec.data) || {}),
            detail: 'It comes off the website at the next publish. If the match was played, '
              + 'use Enter result instead: that records it and clears the fixture for you.',
            confirmLabel: 'Remove',
          }).then(function (yes) {
            if (!yes) return;
            CP.remove('fixtures', key).then(function () {
              toast('Fixture removed', 'success');
              refresh('fixtures');
            }).catch(function (e2) { toast(e2.message, 'error'); });
          });
        }
      });
    });
  };

  /* ==========================================================================
     RESULTS

     This was a JSON textarea. To record a match you typed a document of
     shirt numbers and nested arrays into a box, with a parse error as your
     only feedback, and even then it did not work: the scoreline, the
     opponent and the date were not in the database at all. They came from a
     baseline file in the code, so the panel let you describe a match a
     developer had already added and nothing more.

     dataset.mjs now lets a match record carry the whole match, so this form
     records the result AND its detail in one place. Players are picked from
     the squad; shirt numbers stay the storage key, which is what the record
     has always used, and are never shown on the website.
     ========================================================================== */
  var SQUAD = (SEED.squad || []).slice().sort(function (a, b) { return a.num - b.num; });
  var nameOfNum = {};
  SQUAD.forEach(function (p) { nameOfNum[p.num] = p.name; });

  /* ---- Picking a player --------------------------------------------------
     This was thirty-four name buttons in a wrapping wall, repeated six times
     down one long form: the starting eleven, the bench, yellows, reds, clean
     sheets, penalties saved, penalties missed. Two hundred buttons to record
     one match, most of them never pressed, and no way to see at a glance who
     you had actually chosen because the chosen ones were scattered through
     the alphabet.

     A dropdown to add, and the people you have chosen listed underneath. The
     list is the answer to "who is in", which is the question being asked. */
  function nameOf(num) { return nameOfNum[num] || ('Player ' + num); }

  function pickerSelect(field, label, hint, chosen) {
    /* Somebody already on the list is dropped from the dropdown, so the same
       player cannot be added to the eleven twice. */
    var on = {};
    (chosen || []).forEach(function (n) { on[n] = true; });
    var free = SQUAD.filter(function (p) { return !on[p.num]; });
    return '<div class="field">' +
      '<label class="field__label" for="add-' + esc(field) + '">' + esc(label) + '</label>' +
      '<select class="select" id="add-' + esc(field) + '" data-add="' + esc(field) + '"' +
        (free.length ? '' : ' disabled') + '>' +
        '<option value="">' + (free.length ? 'Choose a player' : 'Everyone is already on the list') + '</option>' +
        free.map(function (p) {
          return '<option value="' + p.num + '">' + esc(p.name) +
            (p.pos ? ' (' + esc(p.pos) + ')' : '') + '</option>';
        }).join('') +
      '</select>' +
      (hint ? '<p class="field__hint">' + esc(hint) + '</p>' : '') +
    '</div>';
  }

  /* The people chosen, each with a way off the list again. */
  function pickedList(field, chosen, emptyText) {
    if (!chosen.length) return '<p class="me__none">' + esc(emptyText || 'Nobody yet.') + '</p>';
    return '<div class="picked">' + chosen.map(function (n, i) {
      return '<span class="picked__p">' + esc(nameOf(n)) +
        '<button type="button" class="picked__x" data-drop="' + esc(field) + '" data-i="' + i +
          '" aria-label="Remove ' + esc(nameOf(n)) + '">&times;</button></span>';
    }).join('') + '</div>';
  }

  /* A whole group: the dropdown and the list it fills. */
  function pickerGroup(field, label, chosen, hint, emptyText) {
    return '<div class="field" data-group="' + esc(field) + '">' +
      pickerSelect(field, label, hint, chosen) +
      '<div data-picked="' + esc(field) + '">' + pickedList(field, chosen, emptyText) + '</div>' +
    '</div>';
  }

  function selectField(id, label, options, value) {
    return '<div class="field"><label class="field__label" for="' + id + '">' + esc(label) + '</label>' +
      '<select class="select" id="' + id + '">' +
      '<option value="">Not recorded</option>' +
      options.map(function (o) {
        return '<option value="' + esc(o.v) + '"' + (String(o.v) === String(value) ? ' selected' : '') + '>' +
          esc(o.t) + '</option>';
      }).join('') + '</select></div>';
  }


  /* ==========================================================================
     MATCH DETAIL: positions, the pitch, and how a goal was scored

     The retired MatchEntry.jsx recorded far more than a list of scorers, and
     the first version of this form threw all of it away: where each player
     lined up, the formation that fell out of that, what minute a goal went
     in, whether it came from open play, a set piece or the spot, which set
     piece, who kept a clean sheet, cards, penalties saved and missed. The
     website already reads several of these, so losing them made pages
     thinner, not just the panel.
     ========================================================================== */

  /* Portrait pitch, us attacking upward. Same coordinates the old editor
     used, so a formation drawn then draws identically now. */
  var PITCH_XY = {
    GK: [50, 92], CB: [50, 80], LCB: [35, 81], RCB: [65, 81],
    LB: [15, 75], RB: [85, 75], LWB: [13, 64], RWB: [87, 64],
    CDM: [50, 66], DM: [50, 66], CM: [50, 51], LCM: [33, 52], RCM: [67, 52],
    LM: [15, 49], RM: [85, 49], CAM: [50, 37], AM: [50, 37],
    LW: [17, 27], RW: [83, 27], SS: [50, 28], CF: [50, 21], ST: [50, 14],
  };
  var POS_CODES = ['GK', 'LB', 'LCB', 'CB', 'RCB', 'RB', 'LWB', 'RWB',
    'CDM', 'DM', 'LCM', 'CM', 'RCM', 'LM', 'RM', 'CAM', 'AM',
    'LW', 'RW', 'SS', 'CF', 'ST'];

  /* Formation from the XI: count the outfield players in each band and read
     it back as 4-4-2. Derived rather than typed, so it cannot contradict the
     line-up beside it. */
  function detectFormation(starters) {
    var band = { def: 0, mid: 0, fwd: 0 };
    var placed = 0;
    starters.forEach(function (st) {
      var c = (st.positions || [])[0];
      if (!c || c === 'GK') return;
      placed++;
      if (/^(L|R|LC|RC)?(B|WB|CB)$/.test(c)) band.def++;
      else if (/^(L|R|LC|RC)?(M|DM|CM|AM|CDM|CAM)$/.test(c)) band.mid++;
      else band.fwd++;
    });
    if (placed < 6) return null;
    return band.def + '-' + band.mid + '-' + band.fwd;
  }

  function pitchSvg(starters) {
    var placed = starters.filter(function (s) { return (s.positions || [])[0] && PITCH_XY[s.positions[0]]; });
    var unplaced = starters.filter(function (s) { return !((s.positions || [])[0] && PITCH_XY[s.positions[0]]); });
    var form = detectFormation(starters);
    return '<div class="pitch">' +
      '<div class="pitch__grass" aria-hidden="true"></div>' +
      (placed.length ? placed.map(function (s) {
        var xy = PITCH_XY[s.positions[0]];
        var nm = nameOf(s.num).split(' ').slice(-1)[0];
        return '<span class="pitch__p" style="left:' + xy[0] + '%;top:' + xy[1] + '%">' +
          '<b>' + esc(s.positions[0]) + '</b><i>' + esc(nm) + '</i></span>';
      }).join('') : '<p class="pitch__empty">Give the starters a position and the shape appears here</p>') +
      '</div>' +
      '<p class="pitch__meta">' + (form ? 'Formation <b>' + esc(form) + '</b>' : 'Formation not detected yet') +
        (unplaced.length ? ' · ' + unplaced.length + ' without a position' : '') + '</p>';
  }

  var GOAL_TYPES = [['open', 'Open play'], ['set', 'Set piece'], ['pen', 'Penalty']];
  var SET_SOURCES = [['corner', 'Corner'], ['freekick', 'Free kick'], ['throwin', 'Throw in']];

  /* One row per goal, in the order they went in. Minute is optional because a
     Sunday-league team sheet often does not record it, and an invented minute
     is worse than an honest blank. */
  function goalRows(goals) {
    if (!goals.length) return '<p class="me__none">No goals recorded.</p>';
    return goals.map(function (g, i) {
      return '<div class="me__row" data-goal="' + i + '">' +
        '<span class="me__i">' + (i + 1) + '</span>' +
        '<select class="select me__who" data-g-num aria-label="Who scored">' +
          SQUAD.map(function (p) {
            return '<option value="' + p.num + '"' + (p.num === g.num ? ' selected' : '') + '>' + esc(p.name) + '</option>';
          }).join('') + '</select>' +
        '<input class="input me__min" type="number" min="1" max="130" placeholder="min" ' +
          'value="' + (g.minute != null ? esc(g.minute) : '') + '" data-g-min>' +
        '<span class="me__seg" role="group" aria-label="How it was scored">' +
          GOAL_TYPES.map(function (t) {
            return '<button type="button" class="me__segb' + ((g.type || 'open') === t[0] ? ' is-on' : '') +
              '" data-g-type="' + t[0] + '">' + t[1] + '</button>';
          }).join('') + '</span>' +
        '<span class="me__seg me__seg--src"' + ((g.type === 'set') ? '' : ' hidden') + ' role="group" aria-label="Set piece">' +
          SET_SOURCES.map(function (t) {
            return '<button type="button" class="me__segb' + (g.setType === t[0] ? ' is-on' : '') +
              '" data-g-src="' + t[0] + '">' + t[1] + '</button>';
          }).join('') + '</span>' +
        '<button type="button" class="me__x" data-g-del aria-label="Remove this goal">&times;</button>' +
      '</div>';
    }).join('');
  }

  function assistRows(assists) {
    if (!assists.length) return '<p class="me__none">No assists recorded.</p>';
    return assists.map(function (a, i) {
      return '<div class="me__row" data-assist="' + i + '">' +
        '<span class="me__i">' + (i + 1) + '</span>' +
        '<select class="select me__who" data-a-num aria-label="Who assisted">' +
          SQUAD.map(function (p) {
            return '<option value="' + p.num + '"' + (p.num === a.num ? ' selected' : '') + '>' + esc(p.name) + '</option>';
          }).join('') + '</select>' +
        '<input class="input me__min" type="number" min="1" max="130" placeholder="min" ' +
          'value="' + (a.minute != null ? esc(a.minute) : '') + '" data-a-min>' +
        '<button type="button" class="me__x" data-a-del aria-label="Remove this assist">&times;</button>' +
      '</div>';
    }).join('');
  }


  /* These lists were stored as bare numbers in some records and as objects in
     others, so read both rather than losing half of them. */
  function numOf(x) { return (x && typeof x === 'object') ? x.num : x; }

  /* One row per starter: who, and where they lined up. The position drives
     the pitch and the formation, so this is the field that makes the rest of
     the section mean anything.

     The chosen list and the position grid used to be two separate blocks
     naming the same eleven people twice. One list, carrying both. */
  function xiRows(starters) {
    if (!starters.length) {
      return '<p class="me__none">Nobody picked yet. Choose the starting eleven above.</p>';
    }
    return '<div class="xi">' + starters.map(function (st, i) {
      var code = (st.positions || [])[0] || '';
      return '<div class="xi__row">' +
        '<span class="xi__n">' + (i + 1) + '</span>' +
        '<span class="xi__name">' + esc(nameOf(st.num)) + '</span>' +
        '<select class="select" data-pos-num="' + st.num + '" aria-label="Position for ' + esc(nameOf(st.num)) + '">' +
          '<option value="">Position</option>' +
          POS_CODES.map(function (c) {
            return '<option value="' + c + '"' + (c === code ? ' selected' : '') + '>' + c + '</option>';
          }).join('') + '</select>' +
        '<button type="button" class="picked__x" data-drop="starters" data-i="' + i +
          '" aria-label="Take ' + esc(nameOf(st.num)) + ' out of the eleven">&times;</button>' +
      '</div>';
    }).join('') + '</div>';
  }

  /* ==========================================================================
     THE MATCH FORM

     One column two thousand pixels tall in a modal 780px wide: the match,
     then six walls of thirty-four name buttons, then the report. Recording a
     game meant scrolling past everything you were not doing, twice.

     Five tabs, each one part of a match, with the save button always in view.
     Opened from two places and identical in both: from Results to record or
     correct a match, and from Fixtures to turn a fixture that has now been
     played into the result.
     ========================================================================== */
  var MTABS = [
    ['match', 'The match'],
    ['team', 'Team sheet'],
    ['goals', 'Goals and assists'],
    ['disc', 'Cards and keeping'],
    ['report', 'Report'],
  ];

  /* The five lists that are only ever "these players were on it". The eleven
     is not one of them: a starter carries a position too. */
  var GROUPS = {
    bench: { label: 'Substitutes', empty: 'No substitutes named.',
      hint: 'Anyone who was available but did not start.' },
    yellowCards: { label: 'Yellow cards', empty: 'No yellow cards.',
      hint: 'Add a player twice if they were booked twice.' },
    redCards: { label: 'Red cards', empty: 'No red cards.' },
    cleanSheets: { label: 'Clean sheet', empty: 'No clean sheet recorded.',
      hint: 'The goalkeeper, when the opposition did not score.' },
    penaltiesSaved: { label: 'Penalties saved', empty: 'None saved.' },
    penaltiesMissed: { label: 'Penalties missed', empty: 'None missed.' },
  };

  /* "Goalkeeper" is the only squad position that maps to exactly one place on
     the pitch. Everything else would be a guess dressed as a fact: four
     defenders would all land on the same spot and the shape would look
     recorded when nobody had recorded it. */
  function defaultPos(num) {
    var p = SQUAD.filter(function (x) { return x.num === num; })[0];
    return (p && /goalkeeper|keeper/i.test(p.pos || '')) ? 'GK' : '';
  }

  function openMatch(o) {
    var opts = o || {};
    var rec = opts.rec || { key: '', data: {} };
    /* The row's own fields win, the code baseline fills the rest, and a
       fixture being turned into a result wins over both. */
    var base = (SEED.matches || []).filter(function (x) { return x.id === rec.key; })[0] || {};
    var d = Object.assign({}, base, rec.data || {}, opts.seed || {});
    var isNew = !rec.key;
    var weAreHome = d.home ? /Sue.s Angels/.test(d.home) : true;
    var opp = weAreHome ? (d.away || '') : (d.home || '');
    var kind0 = d.kind || 'score';
    /* H-W means the home club took the walkover, A-W the away club. Read it
       back from the club's point of view so the form asks "who was it awarded
       to" in club names rather than in the stored code. */
    var wo0 = d.wo === 'H-W' ? (weAreHome ? 'us' : 'them')
      : d.wo === 'A-W' ? (weAreHome ? 'them' : 'us') : '';

    var counts = {
      starters: (d.starters || []).map(function (x) { return x.num; }),
      bench: (d.bench || []).map(function (x) { return x.num; }),
      yellowCards: (d.yellowCards || []).map(numOf),
      redCards: (d.redCards || []).map(numOf),
      cleanSheets: (d.cleanSheets || []).map(numOf),
      penaltiesSaved: (d.penaltiesSaved || []).map(numOf),
      penaltiesMissed: (d.penaltiesMissed || []).map(numOf),
    };
    /* Goals and assists are records, not tallies: each carries a minute and,
       for a goal, how it was scored. */
    var goals = (d.goals || []).map(function (g) {
      return { num: g.num, minute: g.minute != null ? g.minute : null,
        type: g.type || (g.penalty ? 'pen' : 'open'), setType: g.setType || null };
    });
    var assists = (d.assists || []).map(function (a) {
      return { num: a.num, minute: a.minute != null ? a.minute : null };
    });
    var posByNum = {};
    (d.starters || []).forEach(function (st) { posByNum[st.num] = (st.positions || [])[0] || ''; });

    function startersNow() {
      return counts.starters.map(function (n) {
        return { num: n, positions: posByNum[n] ? [posByNum[n]] : [] };
      });
    }

    function scoreFields() {
      return '<div class="field"><label class="field__label" for="m-us">' +
          esc(SEED.club || 'Us') + ' goals</label>' +
          '<input class="input" id="m-us" type="number" min="0" value="' +
          esc(weAreHome ? (d.hs != null ? d.hs : '') : (d.as != null ? d.as : '')) + '"></div>' +
        '<div class="field"><label class="field__label" for="m-them">Opponent goals</label>' +
          '<input class="input" id="m-them" type="number" min="0" value="' +
          esc(weAreHome ? (d.as != null ? d.as : '') : (d.hs != null ? d.hs : '')) + '"></div>';
    }

    var back = document.createElement('div');
    back.className = 'modal-backdrop';
    back.setAttribute('role', 'dialog');
    back.setAttribute('aria-modal', 'true');
    back.setAttribute('aria-label', isNew ? 'Record a match' : 'Edit a match');
    back.innerHTML =
      '<div class="modal glass glass--lg mform">' +
        '<div class="mform__head">' +
          '<h2 class="mform__title">' +
            (isNew ? (opts.fromFixture ? 'Enter the result' : 'Record a match') : 'Edit this match') + '</h2>' +
          '<p class="mform__sub" data-mtitle></p>' +
          '<div class="tabs mform__tabs" role="tablist">' +
            MTABS.map(function (t, i) {
              return '<button class="tab" type="button" role="tab" data-mtab="' + t[0] + '" ' +
                'aria-selected="' + (i === 0 ? 'true' : 'false') + '">' + esc(t[1]) + '</button>';
            }).join('') +
          '</div>' +
        '</div>' +

        '<div class="mform__body">' +

          /* ---- The match ---- */
          '<div data-mpane="match">' +
            '<div class="grid grid--2">' +
              '<div class="field"><label class="field__label" for="m-date">Date</label>' +
                '<input class="input" id="m-date" type="date" value="' + esc(isoFromPretty(d.date)) + '"></div>' +
              '<div class="field"><label class="field__label" for="m-kick">Kick-off</label>' +
                '<input class="input" id="m-kick" type="time" value="' + esc(d.kick || '11:00') + '"></div>' +
              '<div class="field"><label class="field__label" for="m-opp">Opponent</label>' +
                '<input class="input" id="m-opp" list="m-clubs" value="' + esc(opp) + '"></div>' +
              '<div class="field"><label class="field__label" for="m-ha">Home or away</label>' +
                '<select class="select" id="m-ha">' +
                  '<option value="home"' + (weAreHome ? ' selected' : '') + '>Home</option>' +
                  '<option value="away"' + (!weAreHome ? ' selected' : '') + '>Away</option></select></div>' +
              '<div class="field"><label class="field__label" for="m-comp">Competition</label>' +
                '<input class="input" id="m-comp" list="m-comps" value="' +
                  esc(d.competition || SEED.division || '') + '"></div>' +
              '<div class="field"><label class="field__label" for="m-kind">How it finished</label>' +
                '<select class="select" id="m-kind">' +
                  ['score', 'walkover', 'penalty', 'fixture'].map(function (k) {
                    return '<option value="' + k + '"' + (kind0 === k ? ' selected' : '') + '>' +
                      ({ score: 'Played, normal result', walkover: 'Awarded, nobody played',
                         penalty: 'Level, decided on penalties', fixture: 'Not played yet' })[k] + '</option>';
                  }).join('') + '</select></div>' +
            '</div>' +

            /* The scoreline, the walkover winner or nothing at all, depending
               on how the match finished. A walkover has no score to enter and
               a match not yet played has neither. */
            '<div class="grid grid--2" data-scorebox style="margin-top:var(--space-4)">' + scoreFields() + '</div>' +

            '<div class="field" data-wobox hidden style="margin-top:var(--space-4)">' +
              '<label class="field__label" for="m-wo">Awarded to</label>' +
              '<select class="select" id="m-wo">' +
                '<option value="">Choose the club it was awarded to</option>' +
                '<option value="us"' + (wo0 === 'us' ? ' selected' : '') + '>' + esc(SEED.club || 'Us') + '</option>' +
                '<option value="them"' + (wo0 === 'them' ? ' selected' : '') + '>' +
                  '<span data-woopp></span>The opponent</option>' +
              '</select>' +
              '<p class="field__hint">A walkover counts as played and carries three points to the club '
                + 'it was awarded to, but adds no goals to either side. That is how the league table treats it.</p>' +
            '</div>' +

            '<p class="cp-note" data-kindnote style="margin-top:var(--space-4)"></p>' +
            optionList('m-clubs', SEED.clubs) + optionList('m-comps', SEED.competitions) +
          '</div>' +

          /* ---- Team sheet ---- */
          '<div data-mpane="team" hidden>' +
            '<div class="tsheet">' +
              '<div>' +
                '<div class="picker">' +
                  '<div data-xi-pick style="flex:1 1 220px"></div>' +
                  '<span class="picker__count" data-xi-count></span>' +
                '</div>' +
                '<div data-xi></div>' +
                '<h4 class="mform__h">Substitutes</h4>' +
                pickerGroup('bench', GROUPS.bench.label, counts.bench, GROUPS.bench.hint, GROUPS.bench.empty) +
                '<h4 class="mform__h">Captain</h4>' +
                selectField('m-capt', 'Who wore the armband',
                  SQUAD.map(function (p) { return { v: p.num, t: p.name }; }), d.captain) +
              '</div>' +
              '<div>' +
                '<div data-pitch></div>' +
              '</div>' +
            '</div>' +
          '</div>' +

          /* ---- Goals and assists ---- */
          '<div data-mpane="goals" hidden>' +
            '<h4 class="mform__h">Goals</h4>' +
            '<div data-goals>' + goalRows(goals) + '</div>' +
            '<button type="button" class="btn btn--ghost btn--sm" data-add-goal ' +
              'style="margin-top:var(--space-3)">Add a goal</button>' +
            '<h4 class="mform__h">Assists</h4>' +
            '<div data-assists>' + assistRows(assists) + '</div>' +
            '<button type="button" class="btn btn--ghost btn--sm" data-add-assist ' +
              'style="margin-top:var(--space-3)">Add an assist</button>' +
          '</div>' +

          /* ---- Cards and keeping ---- */
          '<div data-mpane="disc" hidden>' +
            '<div class="grid grid--2">' +
              pickerGroup('yellowCards', GROUPS.yellowCards.label, counts.yellowCards,
                GROUPS.yellowCards.hint, GROUPS.yellowCards.empty) +
              pickerGroup('redCards', GROUPS.redCards.label, counts.redCards, '', GROUPS.redCards.empty) +
              pickerGroup('cleanSheets', GROUPS.cleanSheets.label, counts.cleanSheets,
                GROUPS.cleanSheets.hint, GROUPS.cleanSheets.empty) +
              pickerGroup('penaltiesSaved', GROUPS.penaltiesSaved.label, counts.penaltiesSaved,
                '', GROUPS.penaltiesSaved.empty) +
              pickerGroup('penaltiesMissed', GROUPS.penaltiesMissed.label, counts.penaltiesMissed,
                '', GROUPS.penaltiesMissed.empty) +
            '</div>' +
            '<h4 class="mform__h">The opposition</h4>' +
            '<div class="grid grid--2">' +
              '<div class="field"><label class="field__label" for="m-oppgoals">Goals we conceded from penalties</label>' +
                '<input class="input" id="m-oppgoals" type="number" min="0" value="' +
                  esc(d.penaltiesConceded != null ? d.penaltiesConceded : 0) + '"></div>' +
              '<div class="field"><label class="field__label" for="m-oppreds">Opponent red cards</label>' +
                '<input class="input" id="m-oppreds" type="number" min="0" value="' +
                  esc((d.opponentRedCards || []).length || 0) + '"></div>' +
            '</div>' +
          '</div>' +

          /* ---- Report ---- */
          '<div data-mpane="report" hidden>' +
            selectField('m-motm', 'Player of the Match',
              SQUAD.map(function (p) { return { v: p.num, t: p.name }; }), d.motm) +
            '<h4 class="mform__h">Match report</h4>' +
            '<div class="field"><textarea class="textarea" id="m-report" rows="12" ' +
              'placeholder="How the game went. Blank lines separate paragraphs.">' +
              esc(d.commentary || '') + '</textarea>' +
              '<p class="field__hint" data-words>' + words(d.commentary) + '</p></div>' +
          '</div>' +

        '</div>' +

        '<div class="mform__foot">' +
          '<button class="btn btn--ghost" data-cancel>Cancel</button>' +
          '<span class="mform__status" data-err>' +
            (opts.fromFixture
              ? 'Saving this records the result and clears the fixture.'
              : 'Saved here, on the website at the next publish.') + '</span>' +
          '<button class="btn btn--primary" data-save>Save match</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(back);

    /* ---- Painting ---- */
    function paintXI() {
      $('[data-xi-pick]', back).innerHTML =
        pickerSelect('starters', 'Add a starter', 'Give each one a position and the shape draws itself.', counts.starters);
      $('[data-xi]', back).innerHTML = xiRows(startersNow());
      $('[data-pitch]', back).innerHTML = pitchSvg(startersNow());
      var c = $('[data-xi-count]', back);
      c.textContent = counts.starters.length + ' of 11';
      c.className = 'picker__count' +
        (counts.starters.length === 11 ? ' is-full' : counts.starters.length > 11 ? ' is-over' : '');
    }
    function paintGroup(field) {
      var wrap = $('[data-group="' + field + '"]', back);
      if (!wrap) return;
      var cfg = GROUPS[field] || {};
      wrap.innerHTML = pickerSelect(field, cfg.label || field, cfg.hint, counts[field]) +
        '<div data-picked="' + field + '">' + pickedList(field, counts[field], cfg.empty) + '</div>';
    }
    function repaintGoals() { $('[data-goals]', back).innerHTML = goalRows(goals); }
    function repaintAssists() { $('[data-assists]', back).innerHTML = assistRows(assists); }

    /* The header says which match this is, in words, and keeps saying it as
       the date and the opponent are typed. */
    function paintTitle() {
      var iso = $('#m-date', back).value;
      var name = $('#m-opp', back).value.trim();
      var home = $('#m-ha', back).value === 'home';
      $('[data-mtitle]', back).textContent = name
        ? (home ? 'Home to ' : 'Away to ') + name + (iso ? ', ' + longDate(iso) : '')
        : 'Name the opponent on the first tab.';
      var woOpp = $('#m-wo option[value="them"]', back);
      if (woOpp) woOpp.textContent = name || 'The opponent';
    }

    /* What a match needs depends on how it finished, so the form only ever
       asks for the part that exists. */
    function paintKind() {
      var kind = $('#m-kind', back).value;
      $('[data-scorebox]', back).hidden = !(kind === 'score' || kind === 'penalty');
      $('[data-wobox]', back).hidden = kind !== 'walkover';
      $('[data-kindnote]', back).textContent = kind === 'penalty'
        ? 'Enter the score at the end of normal time. The shootout itself is not stored, '
          + 'so the site reports the tie as decided on penalties without claiming a winner.'
        : kind === 'fixture'
          ? 'This stays in the fixture list and no result is shown for it.'
          : '';
    }

    paintXI();
    paintTitle();
    paintKind();

    /* ---- Tabs ---- */
    back.addEventListener('click', function (e) {
      var tab = e.target.closest('[data-mtab]');
      if (tab) {
        var name = tab.getAttribute('data-mtab');
        $$('[data-mtab]', back).forEach(function (t) {
          t.setAttribute('aria-selected', String(t === tab));
        });
        $$('[data-mpane]', back).forEach(function (p) {
          p.hidden = p.getAttribute('data-mpane') !== name;
        });
        return;
      }

      /* Taking somebody off a list. */
      var drop = e.target.closest('[data-drop]');
      if (drop) {
        var field = drop.getAttribute('data-drop');
        counts[field].splice(Number(drop.getAttribute('data-i')), 1);
        if (field === 'starters') paintXI(); else paintGroup(field);
        return;
      }

      if (e.target.matches('[data-add-goal]')) {
        goals.push({ num: counts.starters[0] || SQUAD[0].num, minute: null, type: 'open', setType: null });
        repaintGoals(); return;
      }
      if (e.target.matches('[data-add-assist]')) {
        assists.push({ num: counts.starters[0] || SQUAD[0].num, minute: null });
        repaintAssists(); return;
      }
      if (e.target.matches('[data-g-del]')) {
        goals.splice(Number(e.target.closest('[data-goal]').getAttribute('data-goal')), 1);
        repaintGoals(); return;
      }
      if (e.target.matches('[data-a-del]')) {
        assists.splice(Number(e.target.closest('[data-assist]').getAttribute('data-assist')), 1);
        repaintAssists(); return;
      }
      if (e.target.matches('[data-g-type]')) {
        var gi = Number(e.target.closest('[data-goal]').getAttribute('data-goal'));
        goals[gi].type = e.target.getAttribute('data-g-type');
        /* A penalty or an open-play goal has no set-piece source, so clear it
           rather than leaving a stale corner on a penalty. */
        if (goals[gi].type !== 'set') goals[gi].setType = null;
        repaintGoals(); return;
      }
      if (e.target.matches('[data-g-src]')) {
        var gj = Number(e.target.closest('[data-goal]').getAttribute('data-goal'));
        goals[gj].setType = e.target.getAttribute('data-g-src');
        repaintGoals(); return;
      }
      if (e.target.matches('[data-cancel]') || e.target === back) { back.remove(); return; }
      if (!e.target.matches('[data-save]')) return;

      /* ---- Save ---- */
      var err = $('[data-err]', back);
      function fail(msg, tab2) {
        err.textContent = msg;
        err.style.color = 'var(--error)';
        var t = $('[data-mtab="' + tab2 + '"]', back);
        if (t) t.click();
      }
      var iso = $('#m-date', back).value;
      var oppName = $('#m-opp', back).value.trim();
      if (!iso) { fail('Pick a date.', 'match'); return; }
      if (!oppName) { fail('Name the opponent.', 'match'); return; }
      var home = $('#m-ha', back).value === 'home';
      var kind = $('#m-kind', back).value;
      var us = $('#m-us', back).value;
      var them = $('#m-them', back).value;
      var woSide = $('#m-wo', back).value;
      if ((kind === 'score' || kind === 'penalty') && (us === '' || them === '')) {
        fail('A played match needs both scores.', 'match'); return;
      }
      /* A walkover with no club named would be a match that counted as played
         and awarded nobody the points. */
      if (kind === 'walkover' && !woSide) {
        fail('Say which club the walkover was awarded to.', 'match'); return;
      }
      err.style.color = '';

      var key = rec.key || ('r' + iso.replace(/-/g, '') + '-' + slugOf(oppName));
      var next = Object.assign({}, d, {
        date: prettyDate(iso),
        kick: $('#m-kick', back).value || '',
        home: home ? SEED.club : oppName,
        away: home ? oppName : SEED.club,
        competition: $('#m-comp', back).value.trim(),
        kind: kind,
        starters: startersNow(),
        bench: counts.bench.map(function (n) { return { num: n }; }),
        goals: goals.map(function (g) {
          return { num: g.num, minute: g.minute, type: g.type,
            penalty: g.type === 'pen', setType: g.type === 'set' ? g.setType : null };
        }),
        assists: assists.map(function (a) { return { num: a.num, minute: a.minute }; }),
        yellowCards: counts.yellowCards.map(function (n) { return { num: n }; }),
        redCards: counts.redCards.map(function (n) { return { num: n }; }),
        cleanSheets: counts.cleanSheets.map(function (n) { return { num: n }; }),
        penaltiesSaved: counts.penaltiesSaved.map(function (n) { return { num: n }; }),
        penaltiesMissed: counts.penaltiesMissed.map(function (n) { return { num: n }; }),
        penaltiesConceded: Number($('#m-oppgoals', back).value || 0),
        opponentRedCards: new Array(Number($('#m-oppreds', back).value || 0)).fill({}),
        /* Derived from where the XI actually lined up, so it can never
           disagree with the team sheet printed beside it. */
        formation: detectFormation(startersNow()),
        motm: $('#m-motm', back).value === '' ? null : Number($('#m-motm', back).value),
        captain: $('#m-capt', back).value === '' ? null : Number($('#m-capt', back).value),
        commentary: $('#m-report', back).value,
        savedAt: new Date().toISOString(),
      });
      if (kind === 'score' || kind === 'penalty') {
        next.hs = Number(home ? us : them);
        next.as = Number(home ? them : us);
      } else { delete next.hs; delete next.as; }
      /* Stored the way the record has always stored it: which SIDE took the
         walkover, not which club, so it survives the two clubs swapping ends
         in the reverse fixture. */
      if (kind === 'walkover') next.wo = (woSide === 'us') === home ? 'H-W' : 'A-W';
      else delete next.wo;

      var btn = e.target;
      btn.setAttribute('data-loading', 'true');
      CP.upsert('matches', key, next).then(function () {
        /* A fixture that has been played is no longer a fixture. Doing this
           here rather than leaving it to be remembered is what stops the site
           listing a match as still to come under a report of its own score. */
        if (opts.fromFixture) return CP.remove('fixtures', opts.fromFixture);
        return null;
      }).then(function () {
        toast(opts.fromFixture ? 'Result recorded and the fixture cleared' : 'Match saved', 'success');
        back.remove();
        if (opts.after) opts.after();
        else refresh('results');
      }).catch(function (e2) {
        btn.removeAttribute('data-loading');
        fail(e2.message, 'match');
      });
    });

    back.addEventListener('change', function (e) {
      /* Adding somebody to a list. The dropdown returns to its prompt so the
         next person can be added straight away. */
      var add = e.target.closest('[data-add]');
      if (add) {
        var field = add.getAttribute('data-add');
        var num = Number(add.value);
        if (!num) return;
        counts[field].push(num);
        if (field === 'starters') {
          if (!posByNum[num]) posByNum[num] = defaultPos(num);
          paintXI();
        } else paintGroup(field);
        return;
      }
      if (e.target.matches('[data-pos-num]')) {
        posByNum[Number(e.target.getAttribute('data-pos-num'))] = e.target.value;
        $('[data-pitch]', back).innerHTML = pitchSvg(startersNow());
        return;
      }
      if (e.target.matches('#m-kind')) { paintKind(); return; }
      if (e.target.matches('#m-ha') || e.target.matches('#m-opp') || e.target.matches('#m-date')) {
        paintTitle(); return;
      }
      var gr = e.target.closest('[data-goal]');
      if (gr && e.target.matches('[data-g-num]')) {
        goals[Number(gr.getAttribute('data-goal'))].num = Number(e.target.value); return;
      }
      var ar = e.target.closest('[data-assist]');
      if (ar && e.target.matches('[data-a-num]')) {
        assists[Number(ar.getAttribute('data-assist'))].num = Number(e.target.value);
      }
    });

    back.addEventListener('input', function (e) {
      if (e.target.matches('#m-opp') || e.target.matches('#m-date')) { paintTitle(); return; }
      if (e.target.matches('#m-report')) {
        $('[data-words]', back).textContent = words(e.target.value);
        return;
      }
      var gr = e.target.closest('[data-goal]');
      if (gr && e.target.matches('[data-g-min]')) {
        goals[Number(gr.getAttribute('data-goal'))].minute =
          e.target.value === '' ? null : Number(e.target.value);
        return;
      }
      var ar = e.target.closest('[data-assist]');
      if (ar && e.target.matches('[data-a-min]')) {
        assists[Number(ar.getAttribute('data-assist'))].minute =
          e.target.value === '' ? null : Number(e.target.value);
      }
    });
  }

  M.results = function (host) {
    return CP.readAll('matches').then(function (rows) {
      var list = (rows || []).slice().sort(function (a, b) {
        return String(b.key).localeCompare(String(a.key));
      });
      var withReport = list.filter(function (r) {
        var x = r.data || {};
        return x.polishedReport || x.commentary;
      }).length;

      host.innerHTML = sec({
        title: 'Match records',
        sub: esc(list.length) + ' recorded, ' + esc(withReport) + ' with a written report. '
          + 'Everything a match page shows is entered here: the team sheet and its shape, '
          + 'the goals and how each one was scored, cards, clean sheets and the report.',
        actions: '<button class="btn btn--primary" data-new-match>Record a match</button>',
        body: (list.length
          ? table(['Match', 'Result', 'Report', 'Goals', 'Team sheet', ''], list.map(function (r) {
            var x = r.data || {};
            var score = x.kind === 'walkover' ? 'Walkover'
              : (x.hs != null && x.as != null) ? x.hs + '-' + x.as : 'Not recorded';
            var xi = (x.starters || []).length;
            return '<tr data-key="' + esc(r.key) + '">' +
              '<td><b>' + esc(matchLabel(r.key)) + '</b></td>' +
              '<td>' + esc(score) + '</td>' +
              '<td>' + ((x.polishedReport || x.commentary)
                ? '<span class="badge badge--success">Written</span>'
                : '<span class="badge badge--warning">None</span>') + '</td>' +
              '<td>' + esc((x.goals || []).length) + '</td>' +
              '<td>' + (xi ? esc(xi) + ' named' : '<span class="badge badge--warning">Empty</span>') + '</td>' +
              '<td><button class="btn btn--ghost btn--sm" data-edit>Edit</button> ' +
                  '<a class="btn btn--quiet btn--sm" href="/matches/' + esc(r.key) +
                    '.html" target="_blank" rel="noopener">View</a></td>' +
            '</tr>';
          }).join(''))
          : empty('No matches recorded', 'Record one above, or enter the result of a fixture from the Fixtures section.')),
        where: [['Results', '/results.html'], ['League table', '/league.html'],
          ['Every player profile', '/squad.html'], ['Statistics', '/stats.html']],
        whereNote: 'every published figure is worked out from these records',
      });

      host.addEventListener('click', function (e) {
        if (e.target.matches('[data-new-match]')) { if (guard()) openMatch({}); return; }
        if (!e.target.matches('[data-edit]')) return;
        if (!guard()) return;
        var key = e.target.closest('tr[data-key]').getAttribute('data-key');
        openMatch({ rec: list.filter(function (x) { return x.key === key; })[0] });
      });
    });
  };

  function words(t) {
    var n = String(t || '').trim().split(/\s+/).filter(Boolean).length;
    return n ? n + ' words, about ' + Math.max(1, Math.round(n / 200)) + ' min to read' : 'No report yet';
  }
  function slugOf(name) {
    return String(name).toLowerCase().replace(/\b(fc|afc|united|town|club)\b/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-')[0] || 'opp';
  }
  /* "31 May 26" back to an ISO date the picker understands. */
  function isoFromPretty(s) {
    var m = String(s || '').match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2,4})$/);
    if (!m) return '';
    var i = MONTHS.indexOf(m[2].slice(0, 3));
    if (i === -1) return '';
    var y = m[3].length === 2 ? '20' + m[3] : m[3];
    return y + '-' + String(i + 1).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0');
  }})();
