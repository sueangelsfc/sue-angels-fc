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

  /* ==========================================================================
     A GOAL, IN THE DETAIL THE PEOPLE WHO WERE THERE ACTUALLY REMEMBER

     It used to be a scorer, a minute and one of three buttons: open play, set
     piece, penalty. So the record could say a goal came from a set piece and
     never say whether it was headed in from a corner or curled straight in
     from a free kick, which are not the same goal.

     Now: what it was struck with, where from, what the ball was doing
     beforehand, and who made it. The words come from src/lib/football.mjs,
     which is also what the website prints them with, so the panel cannot
     offer a term the site has no sentence for.

     THE ASSIST LIVES ON THE GOAL. It was a second list underneath, paired to
     a goal by matching minutes, which fails the moment two goals share a
     minute or a minute was never written down. An assist is the pass for a
     goal and cannot exist without one, so it is a field on the goal. The flat
     `assists` array is still written out on save, because the statistics
     engine and every page already read it.
     ========================================================================== */
  var VOCAB = SEED.vocab || { bodyParts: [], situations: [], zones: [], assistTypes: [] };

  function optionsOf(list, chosen, blank) {
    return '<option value="">' + esc(blank) + '</option>' +
      list.map(function (o) {
        return '<option value="' + esc(o.key) + '"' + (o.key === chosen ? ' selected' : '') +
          '>' + esc(o.label) + '</option>';
      }).join('');
  }
  function playerOptions(chosen, blank) {
    return (blank ? '<option value="">' + esc(blank) + '</option>' : '') +
      SQUAD.map(function (p) {
        return '<option value="' + p.num + '"' + (p.num === chosen ? ' selected' : '') +
          '>' + esc(p.name) + '</option>';
      }).join('');
  }

  /* One card per goal, in the order they went in. Every field below the first
     line is optional: a goal with nothing but a scorer is still a goal, and
     the site says nothing about how it was scored rather than inventing it. */
  function goalRows(goals) {
    if (!goals.length) {
      return '<p class="me__none">No goals recorded. Add one and it appears in the report, '
        + 'on the scorer’s profile and in the season’s statistics.</p>';
    }
    return goals.map(function (g, i) {
      var a = g.assist || {};
      return '<div class="gcard" data-goal="' + i + '">' +
        '<div class="gcard__top">' +
          '<span class="gcard__n">' + (i + 1) + '</span>' +
          '<select class="select gcard__who" data-g-num aria-label="Who scored the ' + (i + 1) + ' goal">' +
            playerOptions(g.num, '') + '</select>' +
          '<label class="gcard__min"><span class="sr-only">Minute</span>' +
            '<input class="input" type="number" min="1" max="130" placeholder="min" ' +
              'value="' + (g.minute != null ? esc(g.minute) : '') + '" data-g-min ' +
              'aria-label="Minute"></label>' +
          '<button type="button" class="me__x" data-g-del aria-label="Remove this goal">&times;</button>' +
        '</div>' +
        '<div class="gcard__grid">' +
          '<select class="select" data-g-body aria-label="What it was struck with">' +
            optionsOf(VOCAB.bodyParts, g.bodyPart, 'Struck with…') + '</select>' +
          '<select class="select" data-g-zone aria-label="Where it was struck from">' +
            optionsOf(VOCAB.zones, g.zone, 'From…') + '</select>' +
          '<select class="select" data-g-sit aria-label="What the ball was doing">' +
            optionsOf(VOCAB.situations, g.situation, 'Situation…') + '</select>' +
        '</div>' +
        '<div class="gcard__assist">' +
          '<span class="gcard__lbl">Made by</span>' +
          '<select class="select" data-g-anum aria-label="Who assisted">' +
            playerOptions(a.num, 'Nobody, he made it himself') + '</select>' +
          '<select class="select" data-g-atype aria-label="How the chance was made"' +
            (a.num ? '' : ' disabled') + '>' +
            optionsOf(VOCAB.assistTypes, a.type || 'pass', 'How…') + '</select>' +
        '</div>' +
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

  /* ==========================================================================
     BULLETS INTO AN ARTICLE

     The retired editor had this and it was the fastest thing in it: you typed
     what you remembered as bullets, pressed a button, and got a match report.
     It did it by handing the notes to a language model through
     window.claude.complete, which existed because that admin ran inside a
     Claude artifact. On a deployed website there is no such thing, so this
     does the job the other way round: it writes the parts of a report that
     are already facts, and threads the notes through as the story.

     Which is arguably where it belongs. The scoreline, who scored, what
     minute, whether it was a penalty, who kept the sheet, who was booked, the
     shape the side lined up in: all of that is on the other four tabs
     already, and a model retyping it is a chance to get it wrong. What a
     model was genuinely adding was prose around the coach's observations, and
     those are the coach's own words here rather than a paraphrase of them.

     Nothing is invented. A goal with no minute recorded is not given one, and
     a shootout whose result was never stored does not acquire a winner.
     ========================================================================== */
  function listOf(names) {
    if (!names.length) return '';
    if (names.length === 1) return names[0];
    return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
  }

  /* "on 12 minutes", or nothing at all when the team sheet did not say. */
  function atMin(m) { return m == null || m === '' ? '' : ' on ' + m + ' minutes'; }

  /* How a goal was scored, in words, from whatever was recorded. The phrases
     are the ones in src/lib/football.mjs so the report and the player page
     describe the same goal the same way. */
  var SIT_PHRASE = {
    open: '', corner: 'from a corner', 'freekick-direct': 'direct from a free kick',
    freekick: 'from a free kick', throwin: 'from a throw in', penalty: 'from the penalty spot',
    counter: 'on the counter', rebound: 'from a rebound',
  };
  var BODY_PHRASE = { right: 'with his right foot', left: 'with his left foot',
    head: 'with a header', other: 'off the body' };
  var ZONE_PHRASE = { six: 'from close range', box: 'from inside the box', outside: 'from outside the box' };
  var ASSIST_PHRASE = {
    pass: 'set up by', through: 'sent through by', cross: 'crossed in by',
    cutback: 'cut back by', layoff: 'laid off by', flickon: 'flicked on by',
    headpass: 'headed down by', rebound: 'after a rebound off',
  };
  var ASSIST_SET = { corner: '’s corner', freekick: '’s free kick', throwin: '’s throw in' };

  function howScored(g) {
    if (g.situation === 'penalty') return ' from the penalty spot';
    var bits = [];
    if (BODY_PHRASE[g.bodyPart]) bits.push(BODY_PHRASE[g.bodyPart]);
    if (ZONE_PHRASE[g.zone]) bits.push(ZONE_PHRASE[g.zone]);
    if (SIT_PHRASE[g.situation]) bits.push(SIT_PHRASE[g.situation]);
    return bits.length ? ' ' + bits.join(' ') : '';
  }

  function madeBy(g) {
    if (!g.assist || !g.assist.name) return '';
    var t = g.assist.type || 'pass';
    if (ASSIST_SET[t]) return ', from ' + g.assist.name + ASSIST_SET[t];
    return ', ' + (ASSIST_PHRASE[t] || ASSIST_PHRASE.pass) + ' ' + g.assist.name;
  }

  function buildReport(c) {
    var paras = [];
    var them = c.opp || 'the opposition';
    var comp = c.competition ? ' in ' + c.competition : '';
    /* Small numbers read as words in prose and as figures in a scoreline.
       "BPR Men's scored 2" is a spreadsheet talking. */
    var WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
    var say = function (n) { return WORD[n] || String(n); };

    /* ---- What happened ---- */
    if (c.kind === 'walkover') {
      paras.push(c.woUs
        ? c.us + ' were awarded a walkover victory over ' + them + ' after the fixture went '
          + 'unfulfilled. No goals are recorded against a walkover, but the points stand.'
        : them + ' were awarded the fixture as a walkover. No goals are recorded against a '
          + 'walkover, and the points go with it.');
    } else if (c.kind === 'fixture' || c.ourGoals == null) {
      paras.push(c.us + ' meet ' + them + (c.home ? ' at home' : ' away') + comp
        + (c.date ? ' on ' + c.date : '') + '.');
    } else if (c.kind === 'penalty') {
      paras.push('There was nothing to separate ' + c.us + ' and ' + them + ' after ninety minutes'
        + comp + (c.date ? ', ' + c.date : '') + ', the tie finishing ' + c.ourGoals + '-'
        + c.theirGoals + ' and going to penalties.');
    } else {
      var verb = c.ourGoals > c.theirGoals ? 'beat'
        : c.ourGoals === c.theirGoals ? 'drew with' : 'lost to';
      var margin = c.ourGoals - c.theirGoals;
      var colour = verb === 'beat'
        ? (margin >= 5 ? 'a thumping win' : margin >= 3 ? 'a comfortable win'
          : margin === 1 ? 'a narrow win' : 'a solid win')
        : verb === 'lost to'
          ? (margin <= -4 ? 'a heavy defeat' : margin === -1 ? 'a narrow defeat' : 'a defeat')
          : (c.ourGoals === 0 ? 'a goalless draw' : 'a draw');
      paras.push(c.us + ' ' + verb + ' ' + them + ' ' + c.ourGoals + '-' + c.theirGoals
        + (c.home ? ' at home' : ' away') + comp + (c.date ? ' on ' + c.date : '')
        + (c.venue ? ', at ' + c.venue : '') + ', ' + colour + '.');
    }

    /* ---- The shape ---- */
    if (c.formation || c.xi || c.captain) {
      var shape = c.formation ? c.us + ' lined up in a ' + c.formation + '.'
        : c.xi >= 11 ? ''
          : c.xi ? 'The team sheet names ' + say(c.xi) + ' of the starting eleven.' : '';
      var line = (shape + (c.captain ? ' ' + c.captain + ' wore the armband.' : '')).trim();
      if (line) paras.push(line);
    }

    /* ---- The goals, in the order they went in where that is recorded ----
       Each goal is a sentence and the openings rotate, because four goals all
       beginning "X added a" is the sound of a machine writing. Nothing is
       invented: every clause here is a field somebody filled in. */
    var timed = c.goals.filter(function (g) { return g.minute != null && g.minute !== ''; })
      .sort(function (a, b) { return a.minute - b.minute; });
    var untimed = c.goals.filter(function (g) { return g.minute == null || g.minute === ''; });

    function lead(g, n, first) {
      if (first) {
        return g.minute != null && g.minute <= 15
          ? g.name + ' put them ahead early'
          : g.name + ' opened the scoring';
      }
      if (n === 2) return g.name + ' doubled it';
      if (n === 3) return g.name + ' made it three';
      return g.name + ' got the ' + ordinal(n);
    }

    if (timed.length) {
      var running = 0;
      var sentences = timed.map(function (g, i) {
        running++;
        return lead(g, running, i === 0) + atMin(g.minute) + howScored(g) + madeBy(g) + '.';
      });
      /* Broken into paragraphs of two, so a five-goal game does not arrive as
         one block a reader has to hack their way through. */
      for (var i = 0; i < sentences.length; i += 2) {
        paras.push(sentences.slice(i, i + 2).join(' '));
      }
    }
    if (untimed.length) {
      var others = untimed.map(function (g) {
        var extra = (howScored(g) + madeBy(g)).trim();
        return g.name + (extra ? ' (' + extra.replace(/^, /, '') + ')' : '');
      });
      paras.push((timed.length ? 'Also on the scoresheet: ' : 'On the scoresheet: ')
        + listOf(others) + '. The team sheet does not say what minute those went in.');
    }

    /* ---- The coach's own words, which is what this is for ---- */
    if (c.bullets.length) paras.push.apply(paras, c.bullets);

    /* ---- Keeping and discipline ---- */
    var tail = [];
    if (c.cleanSheet.length) {
      tail.push(listOf(c.cleanSheet) + ' kept a clean sheet.');
    } else if (c.theirGoals != null && c.theirGoals > 0 && c.kind === 'score') {
      tail.push(them + (c.theirGoals === 1 ? ' got one back.' : ' managed ' + say(c.theirGoals) + '.'));
    }
    if (c.saves) {
      tail.push((c.keeper || 'The goalkeeper') + ' made ' + say(c.saves) + ' save'
        + (c.saves === 1 ? '' : 's') + '.');
    }
    if (c.pensSaved.length) tail.push(listOf(c.pensSaved) + ' saved a penalty.');
    if (c.reds.length) tail.push(listOf(c.reds) + (c.reds.length === 1 ? ' was sent off.' : ' were sent off.'));
    if (c.yellows.length) {
      tail.push(listOf(c.yellows) + (c.yellows.length === 1 ? ' was booked.' : ' were booked.'));
    }
    if (tail.length) paras.push(tail.join(' '));

    if (c.motm) paras.push(c.motm + ' was named Player of the Match.');

    return paras.join('\n\n');
  }

  function ordinal(n) {
    return n === 4 ? 'fourth' : n === 5 ? 'fifth' : n === 6 ? 'sixth' : n === 7 ? 'seventh'
      : n === 8 ? 'eighth' : n === 9 ? 'ninth' : n === 10 ? 'tenth' : n + 'th';
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
    /* Older records carry `type`/`setType` and a separate assists array. Read
       both forward into the shape the form uses, so a match recorded by the
       previous version of this form opens with everything it had. */
    /* An old record said `type: 'set'` and then `setType: 'corner'`, which is
       the specific answer sitting behind the general one. The specific one has
       to win or every corner in the archive reads as a free kick. */
    var LEGACY_SIT = { pen: 'penalty', set: 'freekick', open: 'open' };
    var LEGACY_SRC = { corner: 'corner', freekick: 'freekick', throwin: 'throwin' };
    function legacySituation(g) {
      if (g.situation) return g.situation;
      if (g.penalty || g.type === 'pen') return 'penalty';
      if (LEGACY_SRC[g.setType]) return LEGACY_SRC[g.setType];
      return LEGACY_SIT[g.type] || '';
    }
    var oldAssists = (d.assists || []).map(function (a) {
      return { num: a.num, minute: a.minute != null ? a.minute : null, type: a.type || 'pass' };
    });
    var goals = (d.goals || []).map(function (g) {
      var assist = g.assist && g.assist.num ? { num: g.assist.num, type: g.assist.type || 'pass' } : null;
      if (!assist && g.minute != null) {
        /* The old pairing rule: an assist in the same minute by somebody else.
           Used once, here, to carry the record forward rather than every time
           a page wants to know who made a goal. */
        var m = oldAssists.filter(function (a) {
          return a.minute != null && Number(a.minute) === Number(g.minute) && a.num !== g.num;
        })[0];
        if (m) assist = { num: m.num, type: m.type };
      }
      return {
        num: g.num,
        minute: g.minute != null ? g.minute : null,
        bodyPart: g.bodyPart || '',
        zone: g.zone || '',
        situation: legacySituation(g),
        assist: assist,
      };
    });
    /* Assists that never matched a goal are kept so nothing is lost, but they
       are not editable here: an assist without a goal is not a thing. */
    var orphanAssists = oldAssists.filter(function (a) {
      return !goals.some(function (g) { return g.assist && g.assist.num === a.num
        && Number(g.minute) === Number(a.minute); });
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
            '<p class="cp-note" style="margin-bottom:var(--space-4)">Everything except the scorer '
              + 'is optional. What you fill in is what the match report writes and what the '
              + 'season’s statistics count, and what you leave blank the site simply does not '
              + 'claim to know.</p>' +
            '<div data-goals>' + goalRows(goals) + '</div>' +
            '<button type="button" class="btn btn--primary btn--sm" data-add-goal ' +
              'style="margin-top:var(--space-4)">Add a goal</button>' +
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
            '<h4 class="mform__h">The goalkeeper</h4>' +
            '<div class="grid grid--2">' +
              '<div class="field"><label class="field__label" for="m-keeper">Who kept goal</label>' +
                '<select class="select" id="m-keeper">' + playerOptions(d.keeper, 'Not recorded') +
                '</select></div>' +
              '<div class="field"><label class="field__label" for="m-saves">Saves</label>' +
                '<input class="input" id="m-saves" type="number" min="0" value="' +
                  esc(d.saves != null ? d.saves : '') + '" placeholder="How many he made">' +
                '<p class="field__hint">Counts toward his saves per game across the season.</p></div>' +
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

            '<h4 class="mform__h">Your notes</h4>' +
            '<div class="field">' +
              '<label class="field__label" for="m-report">What happened, in bullets</label>' +
              '<textarea class="textarea" id="m-report" rows="9" ' +
                'placeholder="- Slow start, they had the better of the first twenty\n' +
                '- Turned on the press after the opener and never let them settle\n' +
                '- Back four barely gave a chance away">' +
              esc(d.commentary || '') + '</textarea>' +
              '<p class="field__hint" data-words>' + words(d.commentary) + '</p>' +
            '</div>' +
            '<div class="cp-head__actions" style="margin-top:var(--space-3)">' +
              '<button type="button" class="btn btn--primary btn--sm" data-build>' +
                (d.polishedReport ? 'Build it again' : 'Build the report') + '</button>' +
              '<span class="cp-note">Your bullets, plus everything recorded on the other tabs, '
                + 'written out as an article you can edit.</span>' +
            '</div>' +

            '<h4 class="mform__h">The report</h4>' +
            '<div class="field">' +
              '<label class="field__label" for="m-polished">What the website publishes</label>' +
              '<textarea class="textarea" id="m-polished" rows="16" ' +
                'placeholder="Write the bullets above and press Build the report, or type it here yourself.">' +
              esc(d.polishedReport || '') + '</textarea>' +
              '<p class="field__hint" data-pwords>' + words(d.polishedReport) + '</p>' +
            '</div>' +
            '<div class="cp-head__actions" style="margin-top:var(--space-3)">' +
              '<button type="button" class="btn btn--ghost btn--sm" data-clear-report>Clear it</button>' +
              '<span class="cp-note">Cleared, the website falls back to your notes as they are.</span>' +
            '</div>' +
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
        goals.push({ num: counts.starters[0] || SQUAD[0].num, minute: null,
          bodyPart: '', zone: '', situation: '', assist: null });
        repaintGoals(); return;
      }
      if (e.target.matches('[data-g-del]')) {
        goals.splice(Number(e.target.closest('[data-goal]').getAttribute('data-goal')), 1);
        repaintGoals(); return;
      }
      /* ---- Bullets into an article ---- */
      if (e.target.matches('[data-build]')) {
        var notes = $('#m-report', back).value;
        var bullets = notes.split('\n')
          .map(function (l) { return l.replace(/^\s*[-*•·]\s*/, '').trim(); })
          .filter(Boolean)
          /* A bullet is a note, not a sentence, so it does not always arrive
             with a capital or a full stop. Give it both rather than printing
             a paragraph that starts lower case and stops dead. */
          .map(function (l) {
            var s = l.charAt(0).toUpperCase() + l.slice(1);
            return /[.!?]$/.test(s) ? s : s + '.';
          });
        var kindNow = $('#m-kind', back).value;
        var homeNow = $('#m-ha', back).value === 'home';
        var usG = $('#m-us', back).value;
        var themG = $('#m-them', back).value;
        var motmNum = $('#m-motm', back).value;
        var captNum = $('#m-capt', back).value;
        var article = buildReport({
          us: SEED.club || "Sue's Angels FC",
          opp: $('#m-opp', back).value.trim(),
          home: homeNow,
          competition: $('#m-comp', back).value.trim(),
          venue: d.venue || '',
          date: longDate($('#m-date', back).value),
          kind: kindNow,
          woUs: $('#m-wo', back).value === 'us',
          ourGoals: usG === '' ? null : Number(usG),
          theirGoals: themG === '' ? null : Number(themG),
          formation: detectFormation(startersNow()),
          xi: counts.starters.length,
          captain: captNum === '' ? '' : nameOf(Number(captNum)),
          motm: motmNum === '' ? '' : nameOf(Number(motmNum)),
          goals: goals.map(function (g) {
            return {
              name: nameOf(g.num), minute: g.minute,
              bodyPart: g.bodyPart, zone: g.zone, situation: g.situation,
              assist: g.assist ? { name: nameOf(g.assist.num), type: g.assist.type } : null,
            };
          }),
          keeper: $('#m-keeper', back).value === '' ? '' : nameOf(Number($('#m-keeper', back).value)),
          saves: Number($('#m-saves', back).value) || 0,
          yellows: counts.yellowCards.map(nameOf),
          reds: counts.redCards.map(nameOf),
          cleanSheet: counts.cleanSheets.map(nameOf),
          pensSaved: counts.penaltiesSaved.map(nameOf),
          bullets: bullets,
        });
        var out = $('#m-polished', back);
        out.value = article;
        $('[data-pwords]', back).textContent = words(article);
        $('[data-build]', back).textContent = 'Build it again';
        toast('Report built. Read it through and change anything you like.', 'success');
        out.focus();
        return;
      }
      if (e.target.matches('[data-clear-report]')) {
        $('#m-polished', back).value = '';
        $('[data-pwords]', back).textContent = words('');
        return;
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
          return {
            num: g.num,
            minute: g.minute,
            bodyPart: g.bodyPart || null,
            zone: g.zone || null,
            situation: g.situation || null,
            assist: g.assist ? { num: g.assist.num, type: g.assist.type || 'pass' } : null,
            /* Kept because the statistics engine and three pages already read
               it, and because a penalty is the one piece of goal detail the
               site has always printed. */
            penalty: g.situation === 'penalty',
          };
        }),
        /* Derived from the goals, not entered separately. Every page and the
           statistics engine already read this array, so writing it keeps all
           of them working without knowing the assist moved onto the goal.
           Assists from an older record that never matched a goal are kept on
           the end rather than quietly deleted. */
        assists: goals.filter(function (g) { return g.assist && g.assist.num; })
          .map(function (g) {
            return { num: g.assist.num, minute: g.minute, type: g.assist.type || 'pass',
              forGoalBy: g.num };
          })
          .concat(orphanAssists.map(function (a) {
            return { num: a.num, minute: a.minute, type: a.type || 'pass' };
          })),
        yellowCards: counts.yellowCards.map(function (n) { return { num: n }; }),
        redCards: counts.redCards.map(function (n) { return { num: n }; }),
        cleanSheets: counts.cleanSheets.map(function (n) { return { num: n }; }),
        penaltiesSaved: counts.penaltiesSaved.map(function (n) { return { num: n }; }),
        penaltiesMissed: counts.penaltiesMissed.map(function (n) { return { num: n }; }),
        keeper: $('#m-keeper', back).value === '' ? null : Number($('#m-keeper', back).value),
        saves: $('#m-saves', back).value === '' ? null : Number($('#m-saves', back).value),
        penaltiesConceded: Number($('#m-oppgoals', back).value || 0),
        opponentRedCards: new Array(Number($('#m-oppreds', back).value || 0)).fill({}),
        /* Derived from where the XI actually lined up, so it can never
           disagree with the team sheet printed beside it. */
        formation: detectFormation(startersNow()),
        motm: $('#m-motm', back).value === '' ? null : Number($('#m-motm', back).value),
        captain: $('#m-capt', back).value === '' ? null : Number($('#m-capt', back).value),
        /* Two fields, as the record has always held them: `commentary` is
           what the coach wrote, `polishedReport` is the article. The website
           prefers the article and falls back to the notes, so clearing the
           article restores the notes rather than emptying the page. */
        commentary: $('#m-report', back).value,
        polishedReport: $('#m-polished', back).value.trim(),
        savedAt: new Date().toISOString(),
      });
      if (!next.polishedReport) delete next.polishedReport;
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
      if (!gr) return;
      var gi = Number(gr.getAttribute('data-goal'));
      var g = goals[gi];
      if (e.target.matches('[data-g-num]')) { g.num = Number(e.target.value); return; }
      if (e.target.matches('[data-g-body]')) { g.bodyPart = e.target.value; return; }
      if (e.target.matches('[data-g-zone]')) { g.zone = e.target.value; return; }
      if (e.target.matches('[data-g-sit]')) {
        g.situation = e.target.value;
        /* A penalty is not assisted and is not struck from anywhere but the
           spot, so those fields go rather than sitting there contradicting it. */
        if (g.situation === 'penalty') { g.assist = null; g.zone = ''; repaintGoals(); }
        return;
      }
      if (e.target.matches('[data-g-anum]')) {
        var who = Number(e.target.value);
        g.assist = who ? { num: who, type: (g.assist && g.assist.type) || 'pass' } : null;
        repaintGoals();
        return;
      }
      if (e.target.matches('[data-g-atype]')) {
        if (g.assist) g.assist.type = e.target.value;
      }
    });

    back.addEventListener('input', function (e) {
      if (e.target.matches('#m-opp') || e.target.matches('#m-date')) { paintTitle(); return; }
      if (e.target.matches('#m-report')) {
        $('[data-words]', back).textContent = words(e.target.value);
        return;
      }
      if (e.target.matches('#m-polished')) {
        $('[data-pwords]', back).textContent = words(e.target.value);
        return;
      }
      var gr = e.target.closest('[data-goal]');
      if (gr && e.target.matches('[data-g-min]')) {
        goals[Number(gr.getAttribute('data-goal'))].minute =
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
