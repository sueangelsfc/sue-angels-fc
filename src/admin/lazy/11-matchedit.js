/* ==========================================================================
   THE MATCH EDITOR

   The five-tab form for recording a match: the scoreline, the team sheet and
   its pitch diagram, goals with what they were struck with and who made them,
   cards, and the video slots. 997 lines of openMatch and the thirty-two
   helpers only it uses.

   It lived in control-match.js, which serves the fixtures and results LISTS.
   Everyone who opened either list downloaded the whole editor to read a table,
   and that chunk sat at 15.9KB of a 16KB budget as the largest and most-opened
   in the panel.

   Splitting it was blocked for a long time by shared state, not by the seam.
   openMatch reads and REASSIGNS six caches the lists also read - the squad,
   trialists, roster status, the number-to-name map, the spells and bench
   detail of the match being edited. A binding reassigned in one chunk leaves
   the other holding the old array, and the two drift apart in silence rather
   than failing. They are properties of window.CPMSTATE now, one object shared
   by reference and mutated by property, so a change made here is the change
   the list sees.

   Everything else it needs it takes from window: CP, CPU, the seed. The eight
   helpers the lists also use stay there and come across on window.CPMH, one
   date parser rather than two that can disagree.
   ========================================================================== */
(function () {
  var CP = window.CP;
  var M = window.CPM;
  var U = window.CPU;
  var esc = U.esc;
  var toast = U.toast;
  var guard = U.guard;
  var refresh = U.refresh;
  var confirmAction = U.confirmAction;
  var sec = U.sec;
  var table = U.table;
  var empty = U.empty;
  var matchLabel = U.matchLabel;
  var $ = U.$;
  var $$ = U.$$;
  var SEED = window.SA_SEED || {};
  var POSITIONS = SEED.positions || [];

  /* The state this editor shares with the lists. Same object, by reference. */
  var S = (window.CPMSTATE = window.CPMSTATE || {});

  /* Borrowed from control-match.js, which is always loaded before this is. */
  var H = window.CPMH || {};
  var matchIso = H.matchIso;
  var pickable = H.pickable;
  var words = H.words;
  var isoFromPretty = H.isoFromPretty;
  var optionList = H.optionList;
  var longDate = H.longDate;
  var seasonOfIso = H.seasonOfIso;
  var prettyDate = H.prettyDate;

  function nameOf(num) { return S.nameOfNum[num] || ('Player ' + num); }

  /* ==========================================================================
     AN EMPTY MINUTE IS NOT MINUTE ZERO, AND ONE ASSIST IS NOT FIVE

     An assist used to be a flat list beside the goals; it is a field ON the
     goal now, and a record written the old way is carried forward by pairing
     each goal with an assist in the SAME MINUTE by somebody else.

     That rule tested `minute != null`. The archive's minutes are mostly the
     empty STRING, which is not null, and `Number('') === Number('')` is
     `0 === 0`, so every goal matched every assist - and it took the first
     match every time, so it matched the SAME one. Opening the Shepherd's
     match and pressing Save rewrote it with one man credited for all five
     goals and the four real assisters kept on the end as orphans: five
     assists in, nine out, one of them quadrupled. Nobody had to do anything
     wrong. Opening a record and saving it was enough, and the form gives no
     sign of it because the flat list is not on any tab.

     A minute has to BE one, and an assist comes out of the pool once it has
     been used. Whatever is left in the pool at the end is exactly what never
     paired, which is a truer definition of an orphan than asking the goals
     about it afterwards - the old one compared on minute again and so counted
     the same assist twice.

     Its own function, at module scope, because a rule that can silently
     multiply the club's assist record is a rule the suite has to be able to
     run on its own.
     ========================================================================== */
  function minOf(v) {
    if (v == null || v === '') return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  function carryAssists(rawGoals, oldAssists, situationOf) {
    var pool = oldAssists.slice();
    var goals = rawGoals.map(function (g) {
      var assist = g.assist && g.assist.num
        ? { num: g.assist.num, type: g.assist.type || 'pass' } : null;
      var gm = minOf(g.minute);
      if (!assist && gm != null) {
        var idx = -1;
        pool.forEach(function (a, i) {
          if (idx < 0 && minOf(a.minute) === gm && a.num !== g.num) idx = i;
        });
        if (idx >= 0) {
          assist = { num: pool[idx].num, type: pool[idx].type };
          pool.splice(idx, 1);
        }
      }
      return {
        num: g.num,
        minute: g.minute != null ? g.minute : null,
        bodyPart: g.bodyPart || '',
        zone: g.zone || '',
        situation: situationOf(g),
        assist: assist,
      };
    });
    return { goals: goals, orphans: pool };
  }

  /* ==========================================================================
     WHO THIS MATCH CAN NAME

     control-match.js works out who was at the club on the day of the match,
     and does it well. Where that answer was ASKED FOR was the trouble: one
     dropdown of the nine was filtered. The eleven's picker is repainted once
     the dialog is in the document, so it reads the date field; every other
     picker is built as a string BEFORE the dialog exists, so `matchIso()`
     finds no date field, returns '', and the filter waves everybody through.
     The bench offered 44 for a fixture in a season half those men had left
     before. Same shape as the field hints: a correct mechanism attached to
     almost nothing, its tests asking only whether it existed.

     Both rings are applied here, in one place, and every dropdown goes
     through it:

       club  - anyone at the club on the match's date. This is the ring for
               BUILDING the sheet: the eleven and the bench.
       match - the men on the team sheet, and nobody else. Everything after
               the sheet is a claim about THIS MATCH - he scored, he was
               booked, he kept goal, he wore the armband - and none of those
               can be true of somebody who was not on it.

     The archive has one already: on 1 March at Shepherd's a goal is recorded
     for a man not among the fourteen, so the site credits him a goal in a
     match he did not play. Under match scope it could not have been entered.

     Two things keep it from being a cage: an empty sheet narrows nothing, so
     match scope falls back to club scope and goals can still be typed first;
     and whoever is ALREADY stored in a field is always offered, so opening an
     old record can never silently blank it.
     ========================================================================== */
  var SCOPE_OF = { starters: 'club', bench: 'club' };

  /* The numbers on the sheet as it stands, set by openMatch and refreshed
     every time somebody is added to or dropped from the eleven or the bench.
     A property of the shared state, like S.benchDetail beside it, rather than
     a module binding that a future split would have to move. */
  S.onSheet = [];

  /* A stored player who has since been removed from the squad still has to
     appear in his own dropdown, so this never returns nothing. */
  function playerOf(num) {
    return S.SQUAD.filter(function (p) { return String(p.num) === String(num); })[0]
      || { num: num, name: nameOf(num), pos: '', trial: false };
  }

  function offer(scope, keep, skip) {
    var out = skip || {};
    if (scope === 'match') {
      var on = (S.onSheet || []).filter(function (n) { return !out[n]; });
      if (on.length) {
        var list = on.map(playerOf);
        if (keep != null && keep !== '' && !out[keep]
          && !on.some(function (n) { return String(n) === String(keep); })) {
          list.push(playerOf(keep));
        }
        return list;
      }
    }
    return pickable(keep, out);
  }

  /* WHY A NAME IS NOT IN THE LIST.

     A dropdown that has quietly dropped somebody is indistinguishable from a
     broken one, and the club would be right to read it as broken. Every
     picker says which ring it is showing and how to widen it, so a missing
     name is an instruction rather than a mystery. */
  /* SAID ONCE PER PANE, NOT ONCE PER FIELD.

     Cards and keeping has five pickers on it, all drawing from the same ring,
     and the first version printed the same sentence under every one of them.
     Five identical explanations on one screen is worse than none: it reads as
     a template that has misfired and it buries the hint that IS specific to
     the field ("add a player twice if they were booked twice"). The ring is a
     property of the pane, so it is stated where the pane begins. */
  function scopeBar(scope) {
    return '<p class="cp-note mform__scope" data-scopenote="' + scope + '"></p>';
  }

  function scopeNote(scope) {
    var on = (S.onSheet || []).length;
    if (scope === 'match') {
      return on
        ? 'The ' + on + ' on the team sheet. Anybody else has to go on the sheet first.'
        : 'No team sheet yet, so everyone at the club that day is offered.';
    }
    var when = matchIso();
    return when
      ? 'Everyone at the club on ' + prettyDate(when) + '. Set the date first if it is wrong.'
      : 'Set the date and this narrows to the squad as it was that day.';
  }

  /* ADDING A TRIALIST WITHOUT LEAVING THE TEAM SHEET.

     A trialist was added in Squad and staff and only then appeared here, which
     is the wrong way round: you find out somebody is a trialist while you are
     typing the team sheet he played in, and being sent to another screen to
     add him is how he ends up recorded as "No. 901" instead.

     The window is asked for at the same time, because it is known at the same
     time and never will be again. Left empty it means no restriction, so this
     never blocks anybody in a hurry. */
  function addTrialistRow(field) {
    return '<details class="cp-newtrial"><summary>Somebody on trial?</summary>' +
      '<div class="cp-newtrial__body">' +
        '<input class="input input--sm" data-nt-name placeholder="Their name, then Enter" ' +
          'aria-label="Trialist name">' +
        /* The trial starts on the day of this match, because you are adding
           him from the sheet of the game he played in. Overwrite it if the
           trial began earlier; it is the default, not a claim. */
        '<label class="cp-newtrial__f"><span>Trial from</span>' +
          '<input class="input input--sm" type="date" data-nt-from value="' +
            esc(matchIso()) + '"></label>' +
        '<label class="cp-newtrial__f"><span>Trial until</span>' +
          '<input class="input input--sm" type="date" data-nt-until></label>' +
        '<button type="button" class="btn btn--ghost btn--sm" data-nt-add ' +
          'data-nt-field="' + esc(field) + '">Add and pick him</button>' +
      '</div>' +
      '<p class="field__hint">He gets a number from 900 up, plays in this match like anybody '
        + 'else, and appears in no club record. Leave the dates empty if you do not know them '
        + 'yet; with an end date he stops being offered once the trial is over.</p>' +
    '</details>';
  }

  function pickerSelect(field, label, hint, chosen) {
    /* Somebody already on the list is dropped from the dropdown, so the same
       player cannot be added to the eleven twice. */
    var on = {};
    (chosen || []).forEach(function (n) { on[n] = true; });
    var scope = SCOPE_OF[field] || 'match';
    var free = offer(scope, null, on);
    return '<div class="field">' +
      '<label class="field__label" for="add-' + esc(field) + '">' + esc(label) +
        '<i class="field__of">' + free.length + ' to choose from</i></label>' +
      '<select class="select" id="add-' + esc(field) + '" data-add="' + esc(field) + '"' +
        (free.length ? '' : ' disabled') + '>' +
        '<option value="">' + (free.length ? 'Choose a player' : 'Everyone is already on the list') + '</option>' +
        free.map(function (p) {
          return '<option value="' + p.num + '">' + esc(p.name) +
            (p.trial ? ' (on trial)' : p.pos ? ' (' + esc(p.pos) + ')' : '') + '</option>';
        }).join('') +
      '</select>' +
      (hint ? '<p class="field__hint">' + esc(hint) + '</p>' : '') +
      (field === 'starters' || field === 'bench' ? addTrialistRow(field) : '') +
    '</div>';
  }

  /* The people chosen, each with a way off the list again. */
  function pickedList(field, chosen, emptyText) {
    if (!chosen.length) return '<p class="me__none">' + esc(emptyText || 'Nobody yet.') + '</p>';
    /* THE BENCH IS NOT A LIST OF NAMES. Somebody who came on played, and a
       lad who came on at half time and scored twice was recorded as having
       sat there: the bench held a name and nothing else. Each one now says
       whether he got on, when, and where he played once he did. Left alone he
       is an unused substitute, which is the honest default. */
    if (field === 'bench') {
      return '<div class="bench">' + chosen.map(function (n, i) {
        var b = S.benchDetail[n] || {};
        var spells = S.spellsByNum[n] || [];
        if (b.on && !spells.length) spells = [{ half: '2', pos: '', role: '' }];
        S.spellsByNum[n] = spells;
        return '<div class="bench__row' + (b.on ? ' is-on' : '') + '" data-bench="' + i + '">' +
          '<div class="xi__head">' +
            '<label class="bench__on"><input type="checkbox" data-b-on="' + n + '"' +
              (b.on ? ' checked' : '') + '> Came on</label>' +
            '<span class="xi__name">' + esc(nameOf(n)) + '</span>' +
            (b.on ? '<input class="input input--sm bench__min" type="number" min="1" max="130" ' +
              'data-b-min="' + n + '" value="' + esc(b.onAt == null ? '' : b.onAt) + '" ' +
              'placeholder="min" aria-label="Minute ' + esc(nameOf(n)) + ' came on">' : '') +
            '<button type="button" class="picked__x" data-drop="bench" data-i="' + i +
              '" aria-label="Remove ' + esc(nameOf(n)) + '">&times;</button>' +
          '</div>' +
          (b.on ? spellList('bench', i, spells) : '') +
        '</div>';
      }).join('') + '</div>';
    }
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

  function selectField(id, label, options, value, note) {
    return '<div class="field"><label class="field__label" for="' + id + '">' + esc(label) + '</label>' +
      '<select class="select" id="' + id + '">' +
      '<option value="">Not recorded</option>' +
      options.map(function (o) {
        return '<option value="' + esc(o.v) + '"' + (String(o.v) === String(value) ? ' selected' : '') + '>' +
          esc(o.t) + '</option>';
      }).join('') + '</select>' +
      (note ? '<p class="field__hint">' + esc(note) + '</p>' : '') + '</div>';
  }

  /* The three lone selects that name one man for the match: the armband, the
     Player of the Match, the goalkeeper. Same ring as the picker lists. */
  function oneOfSheet(id, label, value) {
    return selectField(id, label,
      offer('match', value).map(function (p) { return { v: p.num, t: p.name }; }),
      value);
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

  /* Positions come from the generator, which reads src/lib/positions.mjs: one
     list with a full name and a place on the pitch for every code the club's
     records have ever used. This file used to carry its own, missing the four
     the archive actually contains, so a team sheet could not record a position
     an old team sheet already had.

     The DROPDOWN shows the full name. The pitch marker keeps the short code,
     because a 26px disc cannot hold "Left centre back" and a pitch diagram is
     the one place in football where everybody reads the short form anyway; it
     carries the full name as its title. */
  var ROLES = SEED.roles || [];
  var ROLE_NAME = {};
  ROLES.forEach(function (r) { ROLE_NAME[r.code] = r.name; });
  function rolesFor(code) {
    return ROLES.filter(function (r) { return (r.for || []).indexOf(code) !== -1; });
  }
  var PITCH_XY = {};
  var POS_NAME = {};
  /* Which band a code belongs to. The formation used to be worked out by
     regex-matching the code itself, which happened to work for the twenty-odd
     codes that existed when it was written and put every new one in attack:
     a ball-playing centre back and a deep-lying playmaker would both have been
     counted as forwards. The list already knows the answer. */
  var POS_GROUP = {};
  POSITIONS.forEach(function (p) {
    PITCH_XY[p.code] = [p.x, p.y];
    POS_NAME[p.code] = p.name;
    POS_GROUP[p.code] = p.group;
  });
  var RANKS = [
    { key: 'back', has: function (y) { return y >= 70; } },
    { key: 'wing', has: function (y) { return y >= 60 && y < 70 && y === 64; } },
    { key: 'hold', has: function (y) { return y >= 60 && y < 70 && y !== 64; } },
    { key: 'centre', has: function (y) { return y >= 45 && y < 60; } },
    { key: 'attack', has: function (y) { return y >= 32 && y < 45; } },
    { key: 'front', has: function (y) { return y < 32; } },
  ];

  function detectFormation(starters) {
    var count = { back: 0, wing: 0, hold: 0, centre: 0, attack: 0, front: 0 };
    var placed = 0;
    starters.forEach(function (st) {
      var c = (st.positions || [])[0];
      if (!c || POS_GROUP[c] === 'gk') return;
      var xy = PITCH_XY[c];
      if (!xy) return;
      var y = xy[1];
      for (var i = 0; i < RANKS.length; i++) {
        if (RANKS[i].has(y)) { count[RANKS[i].key]++; placed++; return; }
      }
    });
    if (placed < 6) return null;

    /* The one judgement, made once and written down. */
    if (count.wing) {
      if (count.back >= 4) count.back += count.wing;
      else if (count.hold) count.hold += count.wing;
      else count.centre += count.wing;
      count.wing = 0;
    }
    var rows = ['back', 'hold', 'centre', 'attack', 'front']
      .map(function (k) { return count[k]; }).filter(Boolean);
    return rows.length > 1 ? rows.join('-') : null;
  }

  /* Several codes sit close together on purpose: a false nine drops off a
     centre forward, a ball-playing centre back stands where a centre back
     stands. Two markers at the same spot stack into an unreadable disc, so
     anything landing within a marker's width of one already placed is nudged
     sideways, alternating left and right so the shape stays centred on where
     the side actually lined up. */
  function fanOut(list) {
    var out = [];
    list.forEach(function (item) {
      var base = PITCH_XY[item.positions[0]];
      var x = base[0];
      var y = base[1];
      for (var step = 0; step < 6; step++) {
        var clash = out.some(function (o) {
          return Math.abs(o.x - x) < 13 && Math.abs(o.y - y) < 9;
        });
        if (!clash) break;
        var shift = (Math.floor(step / 2) + 1) * 14;
        x = base[0] + (step % 2 ? -shift : shift);
        if (x < 9 || x > 91) { x = base[0]; y = base[1] + 9; }
      }
      out.push({ p: item, x: x, y: y });
    });
    return out;
  }

  function pitchSvg(starters) {
    var placed = starters.filter(function (s) { return (s.positions || [])[0] && PITCH_XY[s.positions[0]]; });
    var unplaced = starters.filter(function (s) { return !((s.positions || [])[0] && PITCH_XY[s.positions[0]]); });
    var form = detectFormation(starters);
    return '<div class="pitch">' +
      '<div class="pitch__grass" aria-hidden="true"></div>' +
      (placed.length ? fanOut(placed).map(function (spot) {
        var s = spot.p;
        var xy = [spot.x, spot.y];
        var nm = nameOf(s.num).split(' ').slice(-1)[0];
        var where = POS_NAME[s.positions[0]] || s.positions[0];
        if (s.role && ROLE_NAME[s.role]) where += ', played as a ' + ROLE_NAME[s.role].toLowerCase();
        return '<span class="pitch__p" style="left:' + xy[0] + '%;top:' + xy[1] + '%" title="' +
          esc(nameOf(s.num) + ', ' + where) + '">' +
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
      offer('match', chosen).map(function (p) {
        return '<option value="' + p.num + '"' + (p.num === chosen ? ' selected' : '') +
          '>' + esc(p.name) + (p.trial ? ' (on trial)' : '') + '</option>';
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
  /* ==========================================================================
     WHAT SOMEBODY ACTUALLY DID IN THE GAME

     A player had one position and one role for the whole match, and a
     substitute had neither: the bench was a list of names and nothing else,
     so a lad who came on at half time and scored twice was recorded as having
     sat there.

     Football is not like that. Somebody starts at right back, moves into
     midfield when the shape changes, and finishes on the wing. Somebody comes
     on for the second half. So a player has a LIST OF SPELLS, each one a
     half, a position and what he was asked to do there, and there is no limit
     on how many he has.

     One mechanism rather than two. A fixed "first half / second half" pair
     would not hold a player who moved twice in a half, and a bare list of
     positions would not say when. A spell says both.

     WHAT THE SITE READS IS UNCHANGED. `positions` and `role` are still on the
     record, still the flat fields every page and the whole statistics engine
     read, and they are now DERIVED from the spells when the match is saved -
     the same way the flat `assists` array is derived from the assist recorded
     on each goal. Nothing downstream knows this changed, and a record written
     before today still opens, because a player with no spells is read as one
     spell holding the position he already had.
     ========================================================================== */
  var HALVES = [['1', 'First half'], ['2', 'Second half'], ['et', 'Extra time']];

  /* The open match's spells and bench detail. Module scope because the row
     renderers are module-level and only ever one match dialog is open; both
     are reset when a match is opened. Same as STATUS and TRIALISTS above. */
  S.spellsByNum = {};
  S.benchDetail = {};

  /* The spells a record holds, whatever shape it was written in. */
  function spellsOf(st) {
    if (st.spells && st.spells.length) return st.spells.slice();
    var codes = st.positions || [];
    if (!codes.length) return [];
    /* An older record: one position for the whole game. Read as one spell so
       it opens, edits and saves like anything written today. */
    return codes.map(function (c, i) {
      return { half: '1', pos: c, role: i === 0 ? (st.role || '') : '' };
    });
  }

  /* Back to the flat fields the website reads. Order is kept and duplicates
     dropped, so `positions` stays "where he played", and `role` is the first
     one he was actually given. */
  function flattenSpells(spells) {
    var pos = [], role = '';
    (spells || []).forEach(function (sp) {
      if (sp.pos && pos.indexOf(sp.pos) === -1) pos.push(sp.pos);
      if (!role && sp.role) role = sp.role;
    });
    return { positions: pos, role: role };
  }

  /* One spell: which half, where, and what he was asked to do there. */
  /* ONE SPELL IS ONE LINE.

     A starter took ninety-five pixels: his name in the smallest type on the
     screen, a full spell block underneath - which half, where, what he was
     asked to do, a remove button - and a centred orange "Add where else he
     played" under that, eleven times over. A thousand pixels of scrolling to
     read eleven names, with the name the least visible thing in its own row.

     Almost nobody moves. One spell in the first half means he played there
     all match, so the half is not a fact about him and the remove button has
     nothing to remove: both come off and moving him is one quiet link away.

     Only when the half is the FIRST. A single spell recorded as the second is
     a fact somebody entered, and hiding it would be the form disagreeing with
     the record. */
  function spellRow(field, i, j, sp, lone) {
    var code = sp.pos || '';
    return '<div class="spell' + (lone ? ' spell--one' : '') + '" data-spell="' + i + ':' + j +
      '" data-field="' + esc(field) + '">' +
      (lone ? '' :
      '<select class="select spell__h" data-sp-half aria-label="Which part of the game">' +
        HALVES.map(function (h) {
          return '<option value="' + h[0] + '"' + (String(sp.half) === h[0] ? ' selected' : '') +
            '>' + h[1] + '</option>';
        }).join('') + '</select>') +
      '<select class="select spell__p" data-sp-pos aria-label="Where he played">' +
        '<option value="">Where did he play</option>' +
        ['gk', 'def', 'mid', 'fwd'].map(function (g) {
          var inGroup = POSITIONS.filter(function (p) { return p.group === g; });
          if (!inGroup.length) return '';
          return '<optgroup label="' +
            ({ gk: 'In goal', def: 'Defence', mid: 'Midfield', fwd: 'Attack' })[g] + '">' +
            inGroup.map(function (p) {
              return '<option value="' + p.code + '"' + (p.code === code ? ' selected' : '') +
                '>' + esc(p.name) + '</option>';
            }).join('') + '</optgroup>';
        }).join('') + '</select>' +
      spellRole(code, sp.role) +
      (lone ? '' :
      '<button type="button" class="spell__x" data-sp-drop ' +
        'aria-label="Remove this spell">&times;</button>') +
    '</div>';
  }

  /* Only the roles that attach to the position he is standing in, so nobody
     is asked whether their left back was a poacher. */
  function spellRole(code, chosen) {
    var options = rolesFor(code);
    if (!options.length) return '<span class="spell__norole"></span>';
    return '<select class="select spell__r" data-sp-role aria-label="What he was asked to do">' +
      '<option value="">No special role</option>' +
      options.map(function (r) {
        return '<option value="' + r.code + '"' + (r.code === chosen ? ' selected' : '') +
          ' title="' + esc(r.note || '') + '">' + esc(r.name) + '</option>';
      }).join('') + '</select>';
  }

  function spellList(field, i, spells) {
    var lone = spells.length === 1 && String(spells[0].half || '1') === '1';
    return '<div class="spells' + (lone ? ' spells--one' : '') +
      '" data-spells="' + i + '" data-field="' + esc(field) + '">' +
      spells.map(function (sp, j) { return spellRow(field, i, j, sp, lone); }).join('') +
      '<button type="button" class="spell__more" data-sp-add ' +
        'data-field="' + esc(field) + '" data-i="' + i + '">' +
        (lone ? 'Moved' : 'Add where else he played') + '</button>' +
    '</div>';
  }


  function xiRows(starters) {
    if (!starters.length) {
      return '<p class="me__none">Nobody picked yet. Choose the starting eleven above.</p>';
    }
    return '<div class="xi">' + starters.map(function (st, i) {
      /* The WORKING spells, not the ones sheetFor() shaped for saving: that
         drops a spell with nothing chosen in it yet, which is exactly what a
         freshly added row is. Rendering from the saved shape meant Add did
         nothing you could see. */
      var spells = S.spellsByNum[st.num] || spellsOf(st);
      if (!spells.length) spells = [{ half: '1', pos: '', role: '' }];
      S.spellsByNum[st.num] = spells;
      var lone = spells.length === 1 && String(spells[0].half || '1') === '1';
      return '<div class="xi__row' + (lone ? ' xi__row--one' : '') + '">' +
        '<div class="xi__head">' +
          '<span class="xi__n">' + (i + 1) + '</span>' +
          '<span class="xi__name">' + esc(nameOf(st.num)) + '</span>' +
          '<button type="button" class="picked__x" data-drop="starters" data-i="' + i +
            '" aria-label="Take ' + esc(nameOf(st.num)) + ' out of the eleven">&times;</button>' +
        '</div>' +
        spellList('starters', i, spells) +
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
    bench: { label: 'Add a substitute', empty: 'No substitutes named.',
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
    var p = S.SQUAD.filter(function (x) { return x.num === num; })[0];
    return (p && /goalkeeper|keeper/i.test(p.pos || '')) ? 'GK' : '';
  }

  /* The report writer lives in its own chunk, control-report.js, and is
     fetched the first time somebody presses Build the report. It was here,
     and it was 15KB of pure functions with one caller inside a file already
     over budget carrying the fixtures panel and the results table as well.
     See src/admin/lazy/15-report.js. */

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

    /* THE SQUAD PICKED IN THE WEEK BECOMES THE TEAM SHEET.
       Only when there is no team sheet yet: re-opening a saved match must
       never have its eleven rewritten by a list picked days earlier. */
    var pre = (!d.starters && !d.bench && Array.isArray(d.squad)) ? d.squad : [];
    var counts = {
      starters: (d.starters || []).map(function (x) { return x.num; }).concat(pre.slice(0, 11)),
      bench: (d.bench || []).map(function (x) { return x.num; }).concat(pre.slice(11)),
      yellowCards: (d.yellowCards || []).map(numOf),
      redCards: (d.redCards || []).map(numOf),
      cleanSheets: (d.cleanSheets || []).map(numOf),
      penaltiesSaved: (d.penaltiesSaved || []).map(numOf),
      penaltiesMissed: (d.penaltiesMissed || []).map(numOf),
    };
    /* The sheet as it stands, which is the ring every list after it draws
       from. Set before the first paint so the very first frame is already
       narrowed, rather than after the first time somebody touches the date. */
    S.onSheet = counts.starters.concat(counts.bench);
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

    var carried = carryAssists(d.goals || [], oldAssists, legacySituation);
    var goals = carried.goals;
    /* Assists that never matched a goal are kept so nothing is lost, but they
       are not editable here: an assist without a goal is not a thing. */
    var orphanAssists = carried.orphans;
    /* SPELLS, keyed by shirt number, for the eleven and for the bench. A
       player has as many as he had: a half, a position and a role each. The
       flat `positions` and `role` the website reads are derived from these
       when the match is saved. */
    S.spellsByNum = {};
    S.benchDetail = {};
    (d.starters || []).forEach(function (st) { S.spellsByNum[st.num] = spellsOf(st); });
    (d.bench || []).forEach(function (b) {
      S.benchDetail[b.num] = { on: !!b.on, onAt: b.onAt == null ? '' : b.onAt };
      S.spellsByNum[b.num] = spellsOf(b);
    });
    /* Kept because the pitch diagram and the formation detector want one
       position per player, which is the first one he stood in. */
    var posByNum = {};
    Object.keys(S.spellsByNum).forEach(function (n) {
      var first = (S.spellsByNum[n] || []).filter(function (sp) { return sp.pos; })[0];
      if (first) posByNum[n] = first.pos;
    });

    function sheetFor(nums, isBench) {
      return nums.map(function (n) {
        var spells = (S.spellsByNum[n] || []).filter(function (sp) { return sp.pos || sp.role; });
        var flat = flattenSpells(spells);
        var out = { num: n, positions: flat.positions };
        if (flat.role) out.role = flat.role;
        if (spells.length) out.spells = spells;
        if (isBench) {
          var b = S.benchDetail[n] || {};
          /* Absent means he did not get on, so nothing already saved has to be
             touched and an unused substitute stays an unused substitute. */
          if (b.on) {
            out.on = true;
            if (b.onAt !== '' && b.onAt != null) out.onAt = Number(b.onAt);
          } else {
            out.positions = [];
            delete out.role;
            delete out.spells;
          }
        }
        return out;
      });
    }

    /* Recomputed on every keystroke in the notes box. Cheap: a split and two
       counts over a few hundred characters. */
    function gaugeNotes() {
      var el = $('[data-notes-gauge]', back);
      if (!el) return;
      var raw = ($('#m-report', back) || {}).value || '';
      var lines = raw.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
      var moments = lines.filter(function (l) {
        return /^\s*[-*·•]?\s*\d{1,3}\s*(?:'|m|min|mins|minutes)?\s*[-\u2013\u2014:.)]?\s+\S/.test(l);
      }).length;
      var thoughts = lines.length - moments;
      var W = SEED.reportWords || { min: 700, max: 900, perMoment: 22, base: 150 };
      /* Estimated for a WRITTEN report, because that is the target. A properly
         written incident runs twenty-odd words; the composer echoes a note at
         about ten, which is why the same notes make a much shorter piece when
         the writing key is not working. */
      var est = Math.round(W.base + moments * W.perMoment + thoughts * (W.perMoment - 4));
      var short = W.min - est;
      var need = Math.ceil(short / W.perMoment);
      el.textContent = moments + (moments === 1 ? ' moment' : ' moments') + ', '
        + thoughts + (thoughts === 1 ? ' thought' : ' thoughts') + '. '
        + 'About ' + est + ' words written up. '
        + (short > 0
          ? 'Roughly ' + need + ' more timed ' + (need === 1 ? 'moment' : 'moments')
            + ' to reach ' + W.min + '.'
          : est > W.max ? 'Past ' + W.max + '; worth a trim.' : 'In range.');
      el.setAttribute('data-short', short > 0 ? 'true' : 'false');
    }

    /* Parsed from the same "minute - name" shape as the notes box. Kept as
       the record's own {name, minute, penalty} so nothing downstream changes. */
    function theirGoalsNow() {
      var raw = ($('#m-their', back) || {}).value || '';
      return raw.split('\n').map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
        var pen = /\(pen\)/i.test(l);
        var t = l.replace(/\(pen\)/ig, '').trim();
        var m2 = t.match(/^(\d{1,3})\s*[-\u2013\u2014:.)]?\s*(.*)$/);
        return {
          name: (m2 ? m2[2] : t).trim(), type: pen ? 'pen' : 'open',
          minute: m2 ? m2[1] : '', penalty: pen,
        };
      });
    }

    function startersNow() { return sheetFor(counts.starters, false); }
    function benchNow() { return sheetFor(counts.bench, true); }

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

          /* Said once, above the tabs' content, so it is on screen whichever
             part of the match you are looking at. */
          '<div class="mform__checks" data-checks hidden role="status"></div>' +

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
            scopeBar('club') +
            '<div class="tsheet">' +
              '<div>' +
                '<div data-xi-pick></div>' +
                '<div data-xi></div>' +
                '<h4 class="mform__h">Substitutes</h4>' +
                pickerGroup('bench', GROUPS.bench.label, counts.bench, GROUPS.bench.hint, GROUPS.bench.empty) +
                '<h4 class="mform__h">Captain</h4>' +
                '<div data-capt>' + oneOfSheet('m-capt', 'Who wore the armband', d.captain) + '</div>' +
                scopeBar('match') +
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
            scopeBar('match') +
            '<div data-goals>' + goalRows(goals) + '</div>' +
            '<button type="button" class="btn btn--primary btn--sm" data-add-goal ' +
              'style="margin-top:var(--space-4)">Add a goal</button>' +
          '</div>' +

          /* ---- Cards and keeping ---- */
          '<div data-mpane="disc" hidden>' +
            scopeBar('match') +
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
              '<div data-keeper>' + oneOfSheet('m-keeper', 'Who kept goal', d.keeper) + '</div>' +
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
            '<div data-motm>' + oneOfSheet('m-motm', 'Player of the Match', d.motm) + '</div>' +
            scopeBar('match') +

            /* THE SHAPE, DERIVED AND OVERRIDABLE.
               It was derived only, on the reasoning that a derived figure
               cannot contradict the line-up beside it. True, and it still
               contradicted the COACH: the detector read the eleven as 5-4-1
               and he had written 3-4-2-1 in his notes, so the report carried
               both. Both describe the same eleven and only one of them is
               what the club calls it, which is a question the club answers.
               Left blank it stays derived, so nothing already saved changes. */
            '<div class="field">' +
              '<label class="field__label" for="m-shape">Shape</label>' +
              '<input class="input" id="m-shape" value="' + esc(d.shape || '') + '" ' +
                'placeholder="' + esc(detectFormation(sheetFor(counts.starters, false)) || 'e.g. 3-4-2-1') + '">' +
              '<p class="field__hint">Left blank this is worked out from where the eleven stood, ' +
                'which is shown above. Fill it in if the side calls it something else: a back ' +
                'three with wing backs is a 3-4-2-1 to most people and a 5-4-1 to a computer.</p>' +
            '</div>' +

            /* THEIR GOALS. Nineteen are stored across the archive and there
               has never been a way to enter one: they came in with the code
               baseline and the form could not touch them. A report of a 3-0
               defeat that cannot say who scored or when is not a report.

               Same shape as the notes box, because the club already knows it:
               a minute, a dash, and who. */
            '<div class="field">' +
              '<label class="field__label" for="m-their">Their goals</label>' +
              '<textarea class="textarea" id="m-their" rows="3" ' +
                'placeholder="23 - Rayan Alhajeri\n41 - their number nine\n67 - unknown (pen)">' +
              esc(((d.opponentGoals || []).map(function (g) {
                return (g.minute ? g.minute + ' - ' : '') + (g.name || '')
                  + (g.penalty ? ' (pen)' : '');
              }).filter(function (l) { return l.trim(); }).join('\n'))) + '</textarea>' +
              '<p class="field__hint">One a line. A minute in front puts it in the story where it ' +
                'happened. Add (pen) for a penalty. Leave a name out if nobody knows it.</p>' +
            '</div>' +

            '<h4 class="mform__h">Your notes</h4>' +
            '<div class="field">' +
              '<label class="field__label" for="m-report">What happened, in bullets</label>' +
              /* PUT A MINUTE IN FRONT AND IT BECOMES A MOMENT. This is the one
                 thing that separates this report from a professional one, and
                 it is not the writing: a club-site report narrates fifteen
                 incidents because somebody sat there and wrote each one down
                 with the time on it. Nothing here can invent them. Said in the
                 placeholder AND in the hint, because a placeholder vanishes
                 the moment anybody starts typing. */
              '<textarea class="textarea" id="m-report" rows="9" ' +
                'placeholder="9 - Owolona forced a save with his first touch\n' +
                '24 - Sheehan headed over from a corner\n' +
                '40 - they hit the post from twenty yards\n' +
                '78 - Munns saved low to his right\n' +
                'Tough game in the heat, shaking off the rust">' +
              esc(d.commentary || '') + '</textarea>' +
              '<p class="field__hint">Start a line with a minute and it is treated as a moment in ' +
                'the game, told in order alongside the goals. Lines without one are your ' +
                'thoughts on it, and they get woven through. The report cannot invent a save ' +
                'nobody recorded, so the length of it is set here.</p>' +
              /* THE TARGET, AND THE DISTANCE TO IT, while there is still time
                 to do something about it. The club wants 400 to 600 words and
                 was finding out it had 315 after pressing the button, by
                 which point the only options are padding or shrugging.

                 A moment is worth about eight words once it is written out,
                 and the derived material - the goals, the head-to-head, the
                 player records, the details block - is worth about 150 on its
                 own. So the sum is honest arithmetic rather than a guess, and
                 it says what would close the gap rather than only that there
                 is one. */
              '<p class="field__hint" data-notes-gauge></p>' +
            '</div>' +
            '<div class="cp-head__actions" style="margin-top:var(--space-3)">' +
              '<button type="button" class="btn btn--primary btn--sm" data-build>' +
                (d.polishedReport ? 'Build it again' : 'Build the report') + '</button>' +
                /* SAYS WHICH WROTE IT, AND STAYS SAID.
                   This was a toast, and a toast is gone in four seconds. The
                   club pressed the button, read a report that was arranged
                   rather than written, and had no way of knowing which it had
                   got or why. The difference matters more than almost
                   anything else on this screen, so it sits next to the button
                   until the next press. */
                '<p class="field__hint" data-build-said hidden></p>' +
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
      /* THE COUNT BELONGS TO THE FIELD IT COUNTS. It sat in a flex row
         beside the picker, and the picker carries a hint and a collapsible
         trialist row, so the count was pushed to the bottom of a 90px block
         and printed level with "Somebody on trial?" - the one number on the
         screen that matters, orphaned from the thing it describes. It is the
         label's own tally now, where every other picker keeps its own. */
      var c = $('[data-xi-pick] .field__of', back);
      c.textContent = counts.starters.length + ' of 11';
      c.className = 'field__of' +
        (counts.starters.length === 11 ? ' is-full' : counts.starters.length > 11 ? ' is-over' : '');
    }
    function paintGroup(field) {
      var wrap = $('[data-group="' + field + '"]', back);
      if (!wrap) return;
      var cfg = GROUPS[field] || {};
      wrap.innerHTML = pickerSelect(field, cfg.label || field, cfg.hint, counts[field]) +
        '<div data-picked="' + field + '">' + pickedList(field, counts[field], cfg.empty) + '</div>';
    }
    function repaintGoals() {
      $('[data-goals]', back).innerHTML = goalRows(goals);
      paintChecks();
    }

    /* THE SHEET CHANGED, SO EVERYTHING DOWNSTREAM OF IT FOLLOWS. Adding a
       substitute has to put him in the scorer dropdown without a reload. Each
       repaint reads the value off the select first and hands it back as
       `keep`, so a man already named survives it. The goal cards are safe to
       redraw because every edit is written into `goals` as it is made; typing
       a minute does NOT come through here, or the field would lose focus on
       every keystroke. */
    function afterSheet() {
      S.onSheet = counts.starters.concat(counts.bench);
      /* The bench is in here too. It is club-scope like the eleven, but it
         was the clearest casualty of the old wiring: built as a string before
         the dialog existed, it offered all forty-four for every match ever
         played until somebody happened to touch the date. */
      Object.keys(GROUPS).forEach(paintGroup);
      ['capt', 'motm', 'keeper'].forEach(function (k) {
        var box = $('[data-' + k + ']', back);
        if (!box) return;
        var sel = box.querySelector('select');
        var id = sel.id;
        var label = box.querySelector('.field__label').textContent;
        box.innerHTML = oneOfSheet(id, label, sel.value);
      });
      repaintGoals();
      $$('[data-scopenote]', back).forEach(function (n) {
        n.textContent = scopeNote(n.getAttribute('data-scopenote'));
      });
    }

    /* DOES THE RECORD ADD UP?

       The form asks for the same match twice - a scoreline on the first tab,
       the goals on the third - and never compared them. Two of the archive's
       thirty-five matches disagree with themselves: Shepherd's away credits a
       goal to a man not on the sheet, and Brentford Town says the club scored
       two with no goals listed and no team sheet, so two goals belong to
       nobody and nobody has an appearance.

       Neither is a save to refuse. A result typed at the side of a pitch is
       worth having before the detail is known. It says so instead, on every
       tab, until it is fixed or knowingly saved. */
    function checks() {
      var out = [];
      var kind = $('#m-kind', back).value;
      if (kind === 'fixture' || kind === 'walkover') return out;
      var xi = counts.starters.length;
      if (xi && xi !== 11) out.push('The team sheet names ' + xi + ', not eleven.');
      if (!xi) out.push('No team sheet, so nobody is credited with playing in this match.');
      var us = Number($('#m-us', back).value);
      if ($('#m-us', back).value !== '' && goals.length !== us) {
        out.push('The scoreline says ' + us + ' but ' + (goals.length || 'no')
          + (goals.length === 1 ? ' goal is' : ' goals are') + ' listed.');
      }
      /* EVERYBODY CREDITED WITH ANYTHING IN THIS MATCH, in one pass, so the
         two questions below are asked of the same set. */
      function credited() {
        var seen = {};
        goals.forEach(function (g) {
          if (g.num) seen[g.num] = 1;
          if (g.assist && g.assist.num) seen[g.assist.num] = 1;
        });
        Object.keys(GROUPS).forEach(function (f) {
          if (f !== 'bench') (counts[f] || []).forEach(function (n) { seen[n] = 1; });
        });
        [$('#m-keeper', back).value, $('#m-capt', back).value, $('#m-motm', back).value]
          .forEach(function (v) { if (v) seen[v] = 1; });
        return seen;
      }

      var on = {};
      S.onSheet.forEach(function (n) { on[n] = 1; });
      if (S.onSheet.length) {
        var did = credited();
        var stray = Object.keys(did).filter(function (n) { return !on[n]; });
        if (stray.length) {
          out.push(stray.map(nameOf).join(', ') + (stray.length === 1 ? ' is' : ' are')
            + ' named in this match but not on the team sheet.');
        }

        /* A MAN WHO DID NOT COME ON CANNOT HAVE SCORED.

           The bench holds whether each substitute got on, and absent means he
           did not, which is the honest default for a name with nothing beside
           it. The archive predates that field, so every historical substitute
           reads as unused - and eleven of the thirty-five played matches
           credit a goal, an assist or the Player of the Match award to one of
           them. Two of them read badly on the website today: William Clark
           has seven goals from two appearances, because appearances count
           starts and he came off the bench for five of them.

           This is not the same fault as the one above. He IS on the sheet.
           The sheet says he watched. */
        var idle = counts.bench.filter(function (n) {
          return did[n] && !(S.benchDetail[n] || {}).on;
        });
        if (idle.length) {
          out.push(idle.map(nameOf).join(', ')
            + (idle.length === 1 ? ' is named on the bench as an unused substitute but is'
              : ' are named on the bench as unused substitutes but are')
            + ' credited with something in this match. Tick Came on, on the team sheet.');
        }
      }
      return out;
    }

    function paintChecks() {
      var box = $('[data-checks]', back);
      if (!box) return;
      var list = checks();
      box.hidden = !list.length;
      box.innerHTML = list.length
        ? '<b>' + list.length + (list.length === 1 ? ' thing does' : ' things do')
          + ' not add up</b><ul>' + list.map(function (t) {
            return '<li>' + esc(t) + '</li>';
          }).join('') + '</ul>'
        : '';
      paintTabCounts();
    }

    /* WHAT IS ON THE TAB YOU HAVE NOT OPENED. The only way to find out
       whether the cards were entered was to go and look at all five, and the
       commonest way to record a match badly is to stop before the end. */
    function paintTabCounts() {
      var xi = counts.starters.length;
      var bn = counts.bench.length;
      var cards = counts.yellowCards.length + counts.redCards.length;
      var have = {
        team: xi || bn ? xi + (bn ? ' + ' + bn : '') : '',
        goals: goals.length || '',
        disc: cards || '',
        report: ($('#m-polished', back) || {}).value ? 'written'
          : ($('#m-report', back) || {}).value ? 'notes' : '',
      };
      $$('[data-mtab]', back).forEach(function (t) {
        var v = have[t.getAttribute('data-mtab')];
        var b = t.querySelector('.tab__n');
        if (!b) { b = document.createElement('i'); b.className = 'tab__n'; t.appendChild(b); }
        b.textContent = v === '' || v == null ? '' : String(v);
      });
    }

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
    afterSheet();
    paintTitle();
    paintKind();

    /* ---- Tabs ---- */
    /* Enter in the name field adds him. Typing a name and reaching for a
       button is two actions for one thought, and this is done mid-team-sheet
       with eleven more names to get down. */
    back.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || !e.target.matches('[data-nt-name]')) return;
      e.preventDefault();
      var btn = e.target.closest('.cp-newtrial').querySelector('[data-nt-add]');
      if (btn) btn.click();
    });

    back.addEventListener('click', function (e) {
      if (e.target.matches('[data-sp-add]')) {
        var af = e.target.getAttribute('data-field');
        var an = (counts[af] || [])[Number(e.target.getAttribute('data-i'))];
        S.spellsByNum[an] = (S.spellsByNum[an] || []).concat([{ half: '2', pos: '', role: '' }]);
        if (af === 'bench') paintGroup('bench'); else paintXI();
        return;
      }
      if (e.target.matches('[data-sp-drop]')) {
        var dEl = e.target.closest('[data-spell]');
        var dp = dEl.getAttribute('data-spell').split(':');
        var df = dEl.getAttribute('data-field');
        var dn = (counts[df] || [])[Number(dp[0])];
        (S.spellsByNum[dn] || []).splice(Number(dp[1]), 1);
        posByNum[dn] = ((S.spellsByNum[dn] || []).filter(function (x) { return x.pos; })[0] || {}).pos || '';
        if (df === 'bench') paintGroup('bench'); else paintXI();
        return;
      }
      if (e.target.matches('[data-nt-add]')) {
        if (!guard()) return;
        var wrap = e.target.closest('.cp-newtrial');
        var nm = $('[data-nt-name]', wrap).value.trim();
        if (!nm) { toast('The trialist needs a name.', 'error'); return; }
        var field = e.target.getAttribute('data-nt-field');
        /* 900 up, so a trialist can never collide with a squad number. */
        var used = {};
        S.SQUAD.forEach(function (p) { used[p.num] = 1; });
        var n = 900;
        while (used[n]) n++;
        /* NOT `rec`. `var` is function-scoped, so a `var rec` here hoists to
           the top of this whole click handler and shadows the match's own
           `rec` in every other branch of it - including Save, which then read
           `rec.key` off undefined and threw. Saving a match was broken by
           this for as long as the trialist form has existed. */
        var trialist = { num: n, name: nm };
        var f = $('[data-nt-from]', wrap).value;
        var u = $('[data-nt-until]', wrap).value;
        if (f) trialist.from = f;
        if (u) trialist.until = u;

        var next = S.TRIALISTS.concat([trialist]);
        CP.upsert('player_photos', 'roster:trialists', { players: next }).then(function () {
          S.TRIALISTS = next.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
          S.SQUAD = S.SQUAD.concat([{ num: n, name: nm, pos: '', trial: true, from: trialist.from, until: trialist.until }]);
          S.nameOfNum[n] = nm;
          counts[field].push(n);
          if (field === 'starters') {
            if (!posByNum[n]) posByNum[n] = defaultPos(n);
            paintXI();
          } else paintGroup(field);
          afterSheet();
          /* Cleared and still focused, so a second trialist is another name
             and another Enter rather than another hunt for the field.

             Re-queried, not reused: painting the picker replaces the markup
             this button lives in, so the element captured before the paint is
             detached and focusing it does nothing. */
          var fresh = $('[data-nt-name]', back);
          if (fresh) {
            fresh.closest('.cp-newtrial').open = true;
            fresh.value = '';
            fresh.focus();
          }
          toast(nm + ' added as a trialist and picked.', 'success');
        }).catch(function (err) { toast(err.message, 'error'); });
        return;
      }
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
        afterSheet();
        return;
      }

      if (e.target.matches('[data-add-goal]')) {
        goals.push({ num: counts.starters[0] || S.SQUAD[0].num, minute: null,
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
        var facts = {
          id: rec.key || '',
          iso: $('#m-date', back).value || '',
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
          formation: ($('#m-shape', back).value.trim() || detectFormation(startersNow())),
          xi: counts.starters.length,
          roles: startersNow().filter(function (st) { return st.role && ROLE_NAME[st.role]; })
            .map(function (st) { return { name: nameOf(st.num), role: ROLE_NAME[st.role] }; }),
          captain: captNum === '' ? '' : nameOf(Number(captNum)),
          motm: motmNum === '' ? '' : nameOf(Number(motmNum)),
          goals: goals.map(function (g) {
            return {
              num: g.num, name: nameOf(g.num), minute: g.minute,
              bodyPart: g.bodyPart, zone: g.zone, situation: g.situation,
              assist: g.assist ? { name: nameOf(g.assist.num), type: g.assist.type } : null,
            };
          }),
          theirGoals_detail: theirGoalsNow(),
          pensMissed: counts.penaltiesMissed.map(function (n2) {
            var was = (d.penaltiesMissed || []).filter(function (x) { return x && x.num === n2; })[0];
            return { name: nameOf(n2), minute: (was && was.minute) || '' };
          }),
          keeper: $('#m-keeper', back).value === '' ? '' : nameOf(Number($('#m-keeper', back).value)),
          /* Numbers as well as names: the writer looks a player's record up by
             number, which is the key the history is stored under. */
          keeperNum: $('#m-keeper', back).value === '' ? null : Number($('#m-keeper', back).value),
          captainNum: captNum === '' ? null : Number(captNum),
          /* THE TEAM SHEET, for the match-details block every real report
             carries and this one never did. Who started, who came on for
             whom and when. All of it is already on the form. */
          lineup: startersNow().map(function (st) {
            var on = benchNow().filter(function (b) { return b.on && b.forNum === st.num; })[0];
            /* The position beside the name, which is what a line-up is. It
               used to be a paragraph in the prose reading "Samakab Nur and
               Daniel Thorz played as overlapping full backs", and no report
               carries one of those. */
            var code = (st.positions || [])[0];
            return { name: nameOf(st.num),
              pos: code ? (POS_NAME[code] || code) : '',
              offFor: on ? nameOf(on.num) : '', offAt: on && on.minute ? on.minute : '' };
          }),
          unused: benchNow().filter(function (b) { return !b.on; }).map(function (b) { return nameOf(b.num); }),
          /* Every shirt number involved, so the writer can count who has
             played for the club before and who has not. */
          sheetNums: startersNow().map(function (st) { return st.num; })
            .concat(benchNow().map(function (b) { return b.num; })),
          saves: Number($('#m-saves', back).value) || 0,
          yellows: counts.yellowCards.map(nameOf),
          reds: counts.redCards.map(nameOf),
          cleanSheet: counts.cleanSheets.map(nameOf),
          pensSaved: counts.penaltiesSaved.map(nameOf),
          bullets: bullets,
        };
        /* THE WRITER IS ITS OWN CHUNK, fetched on this press and not before.
           See src/admin/lazy/15-report.js. Everything above is the dialog
           reading its own form; nothing below knows how a report is written. */
        var btn = $('[data-build]', back);
        var was = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Writing…';
        var done = function () { btn.disabled = false; btn.textContent = 'Build it again'; };
        U.chunk('report').then(function () {
          /* Two facts a person would reach for and no tab on this form holds:
             how the club has done against this opponent before, and where
             this match sits in a run of pre-season friendlies. Both are in
             the match list the panel already ships. */
          var ctx = window.CPR.context(SEED.matches || [], SEED.baselineFixtures || [],
            facts, SEED.history || {});
          facts.h2h = ctx.h2h;
          facts.friendlyOf = ctx.friendlyOf;
          facts.players = ctx.players;
          facts.next = ctx.next;
          facts.squad = ctx.squad;
          /* The club's record in the season this match belongs to. */
          facts.clubRecord = (SEED.clubRecord || {})[seasonOfIso($('#m-date', back).value || '')] || null;
          return window.CPR.write(facts, {
            token: CP.state.session && CP.state.session.access_token,
          });
        }).then(function (r) {
          done();
          var out = $('#m-polished', back);
          out.value = r.text;
          $('[data-pwords]', back).textContent = words(r.text);
          /* WHICH ONE WROTE IT, always. A report that quietly changed
             character depending on a server setting would be worse than
             either of them, and the club has to know what it is reading
             before it presses Save. */
          var saidEl = $('[data-build-said]', back);
          /* THE LENGTH, MEASURED, AND WHAT WOULD CHANGE IT. The club wants 400
             to 600 words and had no way of knowing it had 315 until it counted
             them by hand. A word count on its own is a complaint; a word count
             with the number of moments that would close the gap is a next
             step. Counted on the prose, not the details block: a team sheet is
             not writing. */
          var prose = String(r.text || '').split('MATCH DETAILS')[0];
          var got = words(prose);
          var WL = SEED.reportWords || { min: 700, max: 900, perMoment: 22 };
          var gap = WL.min - got;
          var lengthNote = got + ' words'
            + (gap > 0
              ? ', short of ' + WL.min + '. About ' + Math.ceil(gap / WL.perMoment)
                + ' more timed moments would cover it.'
              : got > WL.max ? ', over ' + WL.max + '. Worth a trim.' : '.');
          if (r.source === 'written') {
            saidEl.textContent = 'Written from your notes' + (r.model ? ' by ' + r.model : '')
              + '. ' + lengthNote;
            saidEl.hidden = false;
            toast('Report written from your notes. ' + lengthNote, 'success');
          } else {
            /* The reason, in the club's words rather than the server's, and
               what to do about it. Four of the five are fixable by somebody
               reading this line. */
            var why = {
              'not signed in': 'you are not signed in, so it could not ask',
              'too much to send': 'there were too many notes to send',
              'no writing key set on the server': 'no writing key is set on the site',
              'could not reach the server': 'the site could not be reached',
            }[r.note] || r.note;
            saidEl.textContent = 'Composed from the facts recorded, because ' + why
              + '. Everything below is true; it is arranged rather than written. ' + lengthNote;
            saidEl.hidden = false;
            toast('Report composed: ' + why + '. ' + lengthNote, 'success');
          }
          out.focus();
        }).catch(function () {
          done();
          btn.textContent = was;
          toast('The report writer could not be downloaded. Check your connection and press it again.', 'error');
        });
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
        /* The bench carries what each substitute actually did: whether he
           got on, when, and where he played once he did. */
        bench: benchNow(),
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
        penaltiesMissed: counts.penaltiesMissed.map(function (n) {
          /* Keep the minute already stored against him: it is the difference
             between "a penalty was saved" and the turning point of a cup
             final, and re-saving the form used to wipe it. */
          var was = (d.penaltiesMissed || []).filter(function (x) { return x && x.num === n; })[0];
          return was && was.minute ? { num: n, minute: was.minute } : { num: n };
        }),
        opponentGoals: theirGoalsNow(),
        keeper: $('#m-keeper', back).value === '' ? null : Number($('#m-keeper', back).value),
        saves: $('#m-saves', back).value === '' ? null : Number($('#m-saves', back).value),
        penaltiesConceded: Number($('#m-oppgoals', back).value || 0),
        opponentRedCards: new Array(Number($('#m-oppreds', back).value || 0)).fill({}),
        /* Derived from where the XI actually lined up, so it can never
           disagree with the team sheet printed beside it. */
        formation: detectFormation(startersNow()),
        /* Stored separately from the derived one so the derivation stays
           true and a blank override keeps deriving. */
        shape: $('#m-shape', back).value.trim(),
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
      /* THE DATE DECIDES WHO IS OFFERED, so changing it rebuilds the lists.

         The dropdowns are built as a string before the dialog is in the
         document, so at that moment there is no date field to read and
         everybody is offered. Repainting once the form exists is what makes
         the filter take effect at all, and repainting on every later change
         is what makes correcting a mistyped date correct the squad with it. */
      if (e.target.id === 'm-date') {
        paintXI();
        afterSheet();
      }
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
        /* A substitute named here has to reach the scorer dropdown, and a man
           taken off the sheet has to leave it. */
        afterSheet();
        return;
      }
      /* ---- A spell: which half, where, and what he was asked to do ---- */
      var spellEl = e.target.closest('[data-spell]');
      if (spellEl) {
        var parts = spellEl.getAttribute('data-spell').split(':');
        var sField = spellEl.getAttribute('data-field');
        var nums = counts[sField] || [];
        var sNum = nums[Number(parts[0])];
        var sList = S.spellsByNum[sNum] || (S.spellsByNum[sNum] = []);
        var sp = sList[Number(parts[1])] || (sList[Number(parts[1])] = { half: '1', pos: '', role: '' });

        if (e.target.matches('[data-sp-half]')) sp.half = e.target.value;
        else if (e.target.matches('[data-sp-role]')) sp.role = e.target.value;
        else if (e.target.matches('[data-sp-pos]')) {
          sp.pos = e.target.value;
          /* A role belongs to a position. Move somebody from striker to left
             back and "False nine" has to go with the striker, or the record
             says a full back was a false nine. */
          if (sp.role && !rolesFor(sp.pos).some(function (r) { return r.code === sp.role; })) {
            sp.role = '';
          }
        }
        posByNum[sNum] = (sList.filter(function (x) { return x.pos; })[0] || {}).pos || '';
        if (sField === 'bench') paintGroup('bench'); else paintXI();
        return;
      }

      /* ---- Did a substitute get on, and when ---- */
      if (e.target.matches('[data-b-on]')) {
        var bn = Number(e.target.getAttribute('data-b-on'));
        S.benchDetail[bn] = S.benchDetail[bn] || {};
        S.benchDetail[bn].on = e.target.checked;
        if (e.target.checked && !(S.spellsByNum[bn] || []).length) {
          S.spellsByNum[bn] = [{ half: '2', pos: '', role: '' }];
        }
        paintGroup('bench');
        return;
      }
      if (e.target.matches('[data-b-min]')) {
        var mn = Number(e.target.getAttribute('data-b-min'));
        S.benchDetail[mn] = S.benchDetail[mn] || {};
        S.benchDetail[mn].onAt = e.target.value;
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

    gaugeNotes();

    back.addEventListener('input', function (e) {
      if (e.target.matches('#m-opp') || e.target.matches('#m-date')) { paintTitle(); return; }
      if (e.target.matches('#m-report')) {
        gaugeNotes();
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

    /* The checks read the whole form, so anything typed anywhere can change
       them. Their own listener rather than a line at the foot of the editors'
       handlers, which return early in a dozen branches, and registered LAST
       so it runs after those handlers have written what was typed. */
    ['input', 'change'].forEach(function (ev) {
      back.addEventListener(ev, function () { paintChecks(); });
    });
  }

  function slugOf(name) {
    return String(name).toLowerCase().replace(/\b(fc|afc|united|town|club)\b/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-')[0] || 'opp';
  }
  /* "31 May 26" back to an ISO date the picker understands. */
  /* The lists call this by name once the chunk has arrived. */
  window.CPME = { openMatch: openMatch };
}());
