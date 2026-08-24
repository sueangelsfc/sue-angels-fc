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

  /* ==========================================================================
     THE STATE THIS SCREEN AND THE MATCH EDITOR BOTH USE

     Six caches - the squad, trialists, roster status, the number-to-name map,
     and the spells and bench detail of the match being edited - were plain
     module bindings that BOTH the list screens and openMatch read, and that
     openMatch reassigned. That is why the editor could not be lazy-loaded: a
     binding reassigned in one chunk leaves the other chunk holding the old
     array, and the two drift apart silently instead of failing.

     One object, shared by reference, mutated by property and never replaced.
     Reassignment becomes property assignment, which every holder of the
     reference sees.  */
  var S = (window.CPMSTATE = window.CPMSTATE || {});
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


  /* ==========================================================================
     WHAT THE MATCH EDITOR BORROWS FROM THIS SCREEN

     openMatch and the thirty-two helpers only it uses now live in
     control-matchedit.js, fetched the first time somebody opens a match. These
     eight stayed because the fixtures and results lists use them too, and one
     copy of a date parser is better than two that can disagree. */
  window.CPMH = {
    matchIso: matchIso,
    pickable: pickable,
    words: words,
    isoFromPretty: isoFromPretty,
    optionList: optionList,
    longDate: longDate,
    seasonOfIso: seasonOfIso,
    prettyDate: prettyDate,
  };

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
                '<input class="input" id="fx-date" type="date" required></div>' +
              '<div class="field"><label class="field__label" for="fx-kick">Kick-off</label>' +
                '<input class="input" id="fx-kick" type="time" value="11:00"></div>' +
              '<div class="field"><label class="field__label" for="fx-opp">Opponent</label>' +
                '<input class="input" id="fx-opp" list="fx-clubs" placeholder="Start typing a club" required></div>' +
              '<div class="field"><label class="field__label" for="fx-comp">Competition</label>' +
                '<input class="input" id="fx-comp" list="fx-comps" value="' + esc(SEED.division || '') + '"></div>' +
              '<div class="field"><label class="field__label" for="fx-ha">Home or away</label>' +
                '<select class="select" id="fx-ha">' +
                  '<option value="home">Home</option><option value="away">Away</option>' +
                  '<option value="neutral">Neutral ground</option></select></div>' +
              /* THE GROUND, OFFERED RATHER THAN REMEMBERED. Typed free, this
                 field produced sixteen spellings of about nine grounds, and
                 the same pitch read three ways across three match reports.
                 The list is every ground the club has played at; it suggests
                 and does not insist, because the next fixture may be
                 somewhere new and a form that refuses the name of the ground
                 it is standing on is worse than one that lets a typo
                 through. */
              '<div class="field"><label class="field__label" for="fx-venue">Venue</label>' +
                '<input class="input" id="fx-venue" list="fx-venues" placeholder="' +
                  esc(SEED.venue || '') + '">' +
                '<p class="field__hint">Start typing and the grounds the club has played at come up. '
                  + 'Spell one the way it is already spelled and the website keeps them together.</p></div>' +
            '</div>' +
            optionList('fx-clubs', SEED.clubs) + optionList('fx-comps', SEED.competitions) +
            optionList('fx-venues', SEED.venues) +
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
            /* THREE COLUMNS, NOT FIVE, AND REMOVE IS NOT A WHISPER.
               `table()` wraps in `.scroll-x`, so on any panel narrower than the
               five columns needed the actions cell is the first thing off the
               right edge - and the actions cell held the only way to delete a
               fixture. Removing one was reported as impossible because the
               button could not be seen: clipped by the scroll on a narrow
               panel, and styled `btn--quiet` (transparent, no border) where the
               two buttons beside it were solid and bordered. A destructive
               action should be the plainest thing in the row to find, not the
               faintest. Date and kick-off are one fact about when, competition
               belongs under the fixture it describes, and three columns fit. */
            ? table(['When', 'Fixture', ''], list.map(function (r) {
              var f = r.data || {};
              return '<tr data-key="' + esc(r.key) + '">' +
                '<td><b>' + esc(f.date || '') + '</b>' +
                  (f.kick ? '<br><span class="cp-dim">' + esc(f.kick) + '</span>' : '') + '</td>' +
                '<td><b>' + esc(f.home || '') + '</b> v <b>' + esc(f.away || '') + '</b>' +
                  (f.competition ? '<br><span class="cp-dim">' + esc(f.competition) + '</span>' : '') + '</td>' +
                '<td><div class="cp-rowacts">' +
                  '<button class="btn btn--primary btn--sm" data-fx-result>Enter result</button>' +
                  '<button class="btn btn--ghost btn--sm" data-fx-edit>Edit</button>' +
                  '<button class="btn btn--danger btn--sm" data-del>Remove</button>' +
                '</div></td>' +
              '</tr>';
        }).join(''))
            : empty('No fixtures stored',
              'Add one above and it appears on the website at the next publish, including the next-match card on the home page.')),
          where: [['Fixtures', '/fixtures.html']],
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
          /* THE EDITOR ARRIVES WHEN IT IS ASKED FOR. Entering a result is the
             one thing on this screen that needs the five-tab form; reading the
             list is not, and most visits are reading. */
          U.chunk('matchedit').then(function () {
            window.CPME.openMatch({
              seed: Object.assign({}, frec.data, { kind: 'score' }),
              fromFixture: fkey,
              after: function () { refresh('fixtures'); },
            });
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
          /* ON THE FIELD, NOT ONLY ON THE FORM. The words were already right;
             they went to a shared error line at the top, so on a form scrolled
             past you were told something was wrong and left to find it.
             U.invalid puts the same sentence beside the control, marks it
             aria-invalid and takes focus there. */
          err.hidden = true;
          if (!f.iso) { U.invalid($('#fx-date', host), 'Pick a date.'); return; }
          if (!f.opponent) { U.invalid($('#fx-opp', host), 'Name the opponent.'); return; }
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
  /* The squad, and anyone on trial. A trialist plays in a match like anybody
     else and so has to be pickable in one, but has no profile and appears in
     no club record; the site keeps them apart, and here the only difference is
     that the dropdown says so. Their numbers start at 900, allocated by the
     panel, so they can never collide with a squad number. */
  S.TRIALISTS = (SEED.trialists || []).slice()
    .sort(function (a, b) { return a.name.localeCompare(b.name); });
  S.SQUAD = (SEED.squad || []).slice().sort(function (a, b) { return a.num - b.num; })
    .concat(S.TRIALISTS.map(function (t) {
      return { num: t.num, name: t.name, pos: '', trial: true, from: t.from, until: t.until };
    }));
  S.nameOfNum = {};
  S.SQUAD.forEach(function (p) { S.nameOfNum[p.num] = p.name; });

  /* ==========================================================================
     WHO WAS AT THE CLUB THAT DAY

     The team sheet offered all thirty-six players and every trialist who has
     ever been here, for every match ever, so picking an eleven meant reading
     past people who left two seasons ago and lads who trialled for a fortnight
     and were never seen again.

     The test is the MATCH'S OWN DATE, not today's. Filtering on today would
     mean opening last October's game and finding half the eleven missing from
     the dropdown, and re-saving it would quietly drop them from the record.
     A player who left in June was at the club in May, and May's team sheet has
     to keep saying so.

     Two rules make it safe:

       - Anyone ALREADY on the sheet stays pickable and removable whatever the
         dates say. A record you cannot edit is worse than one listing somebody
         who has since left.
       - No date on the record means no restriction. Nothing already saved has
         to be filled in before the form works.
     ========================================================================== */
  S.STATUS = {};      /* roster:status, read live below */
  var GONE = { retired: 1, departed: 1, staff: 1 };

  /* A season runs Sep to May, so Jul and Aug belong to the season about to
     start. THE CLUB SETS THIS BOUNDARY AND IT IS 1 JULY. Same rule as
     seasonOf() in stats.mjs, which this had drifted from: it still read
     `>= 5`, June, so a June friendly would have been filed under the season
     ending and offered last season's departed players. */
  function seasonOfIso(iso) {
    var m = /^(\d{4})-(\d{2})/.exec(iso || '');
    if (!m) return null;
    var y = Number(m[1]);
    var start = Number(m[2]) >= 7 ? y : y - 1;
    return String(start).slice(2) + '/' + String(start + 1).slice(2);
  }

  /* The status entry for a player in a season: a key, or a key with the
     club's own detail beside it. Kept in step with squad-status.mjs. */
  function entryFor(num, season) {
    var rec = S.STATUS[String(num)];
    if (!rec) return null;
    var seasons = SEED.seasons || [];
    var latest = seasons[seasons.length - 1];

    /* THE FLAT SHAPE, which is what the record actually holds. Twelve players
       are stored as `"7": "retired"` with no season against them, written
       before status became a fact about a player IN a season. Reading only the
       per-season shape meant this filter did nothing at all for every one of
       them, which is most of the people it exists to hide.

       A flat value is the last thing the club said, so it belongs to the
       LATEST season and not to every season before it. Somebody marked
       departed today was still here for last October's match, and that team
       sheet has to keep offering him. Same rule as statusIn() in
       src/lib/squad-status.mjs. */
    if (typeof rec === 'string') return season === latest ? rec : null;
    if (typeof rec !== 'object') return null;

    if (rec[season]) return rec[season];
    for (var i = seasons.indexOf(season) - 1; i >= 0; i--) {
      if (rec[seasons[i]]) return rec[seasons[i]];
    }
    return null;
  }

  /* The date the form is showing. Read from the field rather than from the
     record, so changing the date changes who is offered without a reload. */
  function matchIso() {
    var el = document.getElementById('m-date');
    return (el && el.value) || '';
  }

  /* WHO THE FORM OFFERS, in one place for every dropdown on it.

     `keep` is whoever is already recorded in that field, and they stay in the
     list however long ago they left: dropping a stored captain out of his own
     dropdown would blank him on the next save. `skip` is everybody already on
     a list, so the same player cannot be added to the eleven twice. */
  function pickable(keep, skip) {
    var when = matchIso();
    var out = skip || {};
    return S.SQUAD.filter(function (p) {
      if (out[p.num]) return false;
      return availableOn(p, when) || String(p.num) === String(keep);
    });
  }

  function availableOn(p, iso) {
    if (!iso) return true;

    /* A trialist has a window. Outside it they are not offered, which is what
       stops a fortnight's trial from three seasons ago sitting in the list
       for good. */
    if (p.trial) {
      if (p.from && iso < p.from) return false;
      if (p.until && iso > p.until) return false;
      return true;
    }

    var season = seasonOfIso(iso);
    if (!season) return true;
    var entry = entryFor(p.num, season);
    if (!entry) return true;
    var key = typeof entry === 'string' ? entry : (entry.key || '');
    if (!GONE[key]) return true;

    /* Gone, but WHEN. A leaving date makes this exact: somebody who left in
       June is still pickable for a match in May of the same season. Without
       one the season is the only granularity there is, and being gone in a
       season means gone for it. */
    var from = (typeof entry === 'object' && entry.from) || '';
    return from ? iso < from : false;
  }

  /* ---- Picking a player --------------------------------------------------
     This was thirty-four name buttons in a wrapping wall, repeated six times
     down one long form: the starting eleven, the bench, yellows, reds, clean
     sheets, penalties saved, penalties missed. Two hundred buttons to record
     one match, most of them never pressed, and no way to see at a glance who
     you had actually chosen because the chosen ones were scattered through
     the alphabet.

     A dropdown to add, and the people you have chosen listed underneath. The
     list is the answer to "who is in", which is the question being asked. */
  var POSITIONS = SEED.positions || [];
  var POS_CODES = POSITIONS.map(function (p) { return p.code; });

  /* FORMATION FROM THE XI, and a formation is ROWS ON A PITCH.

     This counted three bands - defenders, midfielders, forwards - and read
     them back as "5-4-1". It cannot ever have produced 3-4-2-1, 4-2-3-1 or
     4-3-2-1, because those have four rows and it only had three. Worse, wing
     backs are filed under `def` in the position list, so a back three with
     two wing backs came out as five defenders.

     Against Pure Football that printed "Sue's Angels FC lined up in a 5-4-1"
     two lines above the coach's own note saying 3-4-2-1. One report, one
     eleven, two shapes.

     The position list already stores where every code STANDS - `y`, the depth
     up the pitch - so the rows are in the data and were being thrown away.
     Ranked by depth, empty ranks dropped, and the one genuinely conventional
     judgement made explicitly: two wing backs in front of a back three are
     the wide men of a midfield four, which is what 3-4-2-1 means; alongside a
     back four they are a back five. */
  M.results = function (host) {
    /* `player_photos` carries roster:status and roster:trialists, which is
       how the form knows who had left by the day of a given match. Read live
       rather than taken from the build seed: the club may have marked
       somebody departed a minute ago and would expect the next team sheet to
       know, without waiting for a rebuild. */
    return Promise.all([CP.readAll('matches'), CP.readAll('player_photos')])
      .then(function (both) {
        var blobs = both[1] || [];
        var st = blobs.filter(function (r) { return r.key === 'roster:status'; })[0];
        S.STATUS = (st && st.data && (st.data.status || st.data)) || {};
        var tr = blobs.filter(function (r) { return r.key === 'roster:trialists'; })[0];
        var list = (tr && tr.data && tr.data.players) || [];
        S.TRIALISTS = list.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
        /* Rebuilt so a trialist added since the page loaded is pickable. */
        S.SQUAD = (SEED.squad || []).slice().sort(function (a, b) { return a.num - b.num; })
          .concat(S.TRIALISTS.map(function (t) {
            return { num: t.num, name: t.name, pos: '', trial: true, from: t.from, until: t.until };
          }));
        S.nameOfNum = {};
        S.SQUAD.forEach(function (p) { S.nameOfNum[p.num] = p.name; });
        return both[0];
      })
      .then(function (rows) {
      /* ORDERED BY WHEN THE MATCH WAS PLAYED.

         It sorted on the row key, and a key begins with the letter the record
         was created under: `r` for one from the results baseline, `f` for one
         promoted from a fixture. Sorting those as text puts every f below
         every r whatever the dates say, so the last game of last season, at
         home to Hillside, sat at the bottom of the list under thirty-three
         older matches. The club could not find its own most recent result.

         BASE is the same match list the website builds from, so a record
         whose scoreline lives in the baseline rather than on its own row
         still knows its own date. */
      var BASE = {};
      (SEED.matches || []).forEach(function (m) { BASE[m.id] = m; });
      var whenOf = function (r) {
        var x = r.data || {};
        var said = x.date || (BASE[r.key] || {}).date || '';
        var iso = isoFromPretty(said);
        if (iso) return iso;
        /* Failing that, the date is in the key: r20260531-hillside. */
        var m = String(r.key).match(/^[a-z](\d{4})(\d{2})(\d{2})/);
        return m ? m[1] + '-' + m[2] + '-' + m[3] : '';
      };
      var list = (rows || []).slice().sort(function (a, b) {
        return whenOf(b).localeCompare(whenOf(a));
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
            /* The scoreline is on the row for a match the panel recorded, and
               in the baseline for the thirty-three it did not. Reading only
               the row made every one of those say "Not recorded" beside a
               result the website was publishing. */
            var b = BASE[r.key] || {};
            var kind = x.kind || b.kind;
            var hs = x.hs != null ? x.hs : b.hs;
            var as = x.as != null ? x.as : b.as;
            var score = kind === 'walkover' ? 'Walkover'
              : (hs != null && as != null) ? hs + '-' + as : 'Not recorded';
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
        if (e.target.matches('[data-new-match]')) {
          /* THE EDITOR ARRIVES WHEN IT IS ASKED FOR, not with the list.
             Most visits to this screen read it and leave. */
          if (guard()) U.chunk('matchedit').then(function () { window.CPME.openMatch({}); });
          return;
        }
        if (!e.target.matches('[data-edit]')) return;
        if (!guard()) return;
        var key = e.target.closest('tr[data-key]').getAttribute('data-key');
        U.chunk('matchedit').then(function () {
          window.CPME.openMatch({ rec: list.filter(function (x) { return x.key === key; })[0] });
        });
      });
    });
  };

  function words(t) {
    var n = String(t || '').trim().split(/\s+/).filter(Boolean).length;
    return n ? n + ' words, about ' + Math.max(1, Math.round(n / 200)) + ' min to read' : 'No report yet';
  }
  function isoFromPretty(s) {
    var m = String(s || '').match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2,4})$/);
    if (!m) return '';
    var i = MONTHS.indexOf(m[2].slice(0, 3));
    if (i === -1) return '';
    var y = m[3].length === 2 ? '20' + m[3] : m[3];
    return y + '-' + String(i + 1).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0');
  }})();
