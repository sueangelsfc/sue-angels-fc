/* ==========================================================================
   CONTROL PANEL: SQUAD AND STAFF

   What was here before this file was the `player_photos` table, rendered raw:
   a list of rows called "10", "12", "16", each one Photograph or Record, and
   an Edit button that opened a textarea holding forty thousand characters of
   base64 JPEG. There was no way to see who was in the squad, no way to say
   somebody had retired, and no way to add a player. It was a database
   inspector wearing a section title.

   This is the editor it replaced: every player by name, with what they have
   actually done for the club beside them, and one dropdown that moves them
   between the five things a player can be. Adding a signing is a name and a
   position. Moving somebody onto the coaching staff writes both records at
   once, because in real life that is one decision, not two.

   WHERE IT LANDS
   Status is a `roster:status` record, shirt number to status. dataset.mjs
   reads it over the code baseline, so a change here reaches /squad.html and
   the player's own page at the next publish. New players are a `roster:s2627`
   record; new staff are `roster:coaches`. Nothing about this needs a
   developer, which was the whole complaint.

   SHIRT NUMBERS
   They stay the storage key, because every match record ever written keys its
   scorers and its team sheet on them. They are never shown here and never
   shown on the website: a new player is given the lowest free number
   automatically, so nobody has to think about it.
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

  var SEED = window.SA_SEED || {};
  var SQUAD = (SEED.squad || []).slice();

  /* WHAT A PLAYER IS, AND IN WHICH SEASON.

     This was one flat list with one value per player, and three of its nine
     entries could not stay true on their own:

       "Retained for 26/27" carried a year in the string, typed here and in
       src/templates/player.mjs, so from July 2027 both were wrong and only a
       developer could change them.
       "New signing" never expired.
       "On trial" never ended, though a trial is a fixed window by definition:
       a few weeks, after which somebody is signed or is not.

     Status is now a fact about a player IN A SEASON, and the three tenure
     labels are WORKED OUT from which seasons he has been in the squad rather
     than typed. The dropdown asks only for what the club knows and the site
     cannot derive. Defined once in src/lib/squad-status.mjs and shipped here
     in the seed, so this editor and the website cannot disagree. */
  var VOCAB = SEED.statuses || { set: [], derived: [] };
  var STATUSES = VOCAB.set;
  var DERIVED = VOCAB.derived;
  var SEASONS = (SEED.seasons || []).slice();
  /* THE SEASON THE CLUB IS IN, not the season its figures describe. This read
     SEED.currentSeason, which counts competitive matches and is therefore
     still 25/26 in August, so the screen opened on last season and three new
     signings were recorded against it. It is also what a flat record means -
     "what the club last said" - and the site resolves that against its LATEST
     season, so the two disagreed on that as well. */
  var CURRENT = SEED.clubSeason || SEASONS[SEASONS.length - 1] || SEED.currentSeason || '';
  var LABEL = {};
  var PLAYING = {};
  STATUSES.forEach(function (x) { LABEL[x.key] = x.label; PLAYING[x.key] = x.playing; });
  DERIVED.forEach(function (x) { LABEL[x.key] = x.label; PLAYING[x.key] = true; });

  /* The season being edited. Everything on this screen is about this one
     season: the dropdown sets what somebody was IN IT, and the counts and
     the worked-out labels describe IT. It starts on the current season
     because that is what anybody opening the panel in August is here for. */
  var editSeason = CURRENT;
  /* The chosen filter survives a re-render, the way the chosen season does.
     Setting a signing date refreshes the screen, and without this the list
     jumped back to everyone at the exact moment somebody was working through
     the three players the filter had just found for them. */
  var showOnly = 'all';

  /* Three shapes have been written to roster:status and all three are read.
     A flat string is what the player was in the CURRENT season, which is
     what it meant when it was written; for any earlier season it is read as
     "in the squad", because he plainly was - every figure on his card for
     that season was earned here. */
  var RETIRED_KEYS = { 'new': 1, retained: 1, returned: 1 };
  function collapse(k) { return RETIRED_KEYS[k] ? 'active' : k; }

  /* A season entry is either a key or a key with the club's own detail beside
     it: { key: 'departed', from: '2026-06-14', to: 'Barnes Stormers' }. Both
     shapes read here, so every caller keeps getting the plain key it expects
     and nothing that predates the detail has to be re-saved. Kept in step
     with keyOf() in src/lib/squad-status.mjs, which does the same job on the
     site's side. */
  function keyOf(entry) {
    if (!entry) return '';
    return typeof entry === 'string' ? entry : (entry.key || '');
  }
  function statusIn(map, num, season) {
    var rec = map[String(num)];
    if (!rec) return 'active';
    /* A SIGNING DATE BEATS A STATUS TYPED AGAINST AN EARLIER SEASON. Setting
       somebody In the squad for 25/26 as well is a reasonable thing to do on
       a screen with a season tab, and it contradicts a signing date in 2026.
       The more specific statement wins: a day is a fact about a person, a
       season tab is a screen. */
    if (joinedAfter(map, num, season)) return 'absent';
    if (typeof rec === 'string') {
      if (season === CURRENT) return collapse(rec);
      return SEASONS.indexOf(season) < SEASONS.indexOf(CURRENT) ? 'active' : collapse(rec);
    }
    if (rec[season]) return collapse(keyOf(rec[season]));
    for (var i = SEASONS.indexOf(season) - 1; i >= 0; i--) {
      if (rec[SEASONS[i]]) return collapse(keyOf(rec[SEASONS[i]]));
    }
    return 'active';
  }

  /* What was recorded beside the status for a season, if anything. */
  function statusDetail(map, num, season) {
    var rec = map[String(num)];
    var entry = rec && typeof rec === 'object' && rec[season];
    if (!entry || typeof entry !== 'object') return {};
    var out = {};
    Object.keys(entry).forEach(function (k) { if (k !== 'key') out[k] = entry[k]; });
    return out;
  }
  function isPlaying(key) { return PLAYING[key] !== false; }

  /* New signing / retained / back at the club, worked out rather than typed.
     Nobody is "new" in the club's first season: it would be true of the whole
     squad and would say nothing. */
  /* WAS HE ACTUALLY HERE, as opposed to "nothing says otherwise".

     statusIn() answers 'active' when a season has no entry, which is the
     right default for the dropdown: a player nobody has said anything about
     is in the squad. It is the wrong answer for working out tenure, because
     it makes every season before a player joined look like a season he was
     here for, and a first-ever signing therefore read "Retained".

     That was a real disagreement with the website, which knows the
     difference: statusIn() in src/lib/squad-status.mjs returns 'absent' for a
     season with no entry and no evidence, and that is precisely what makes
     "new" derivable. 12 of 180 answers differed before this. */
  function wasHere(map, num, season) {
    var rec = map[String(num)];
    if (!rec) return false;
    if (typeof rec === 'string') {
      /* A flat value is what the club last said, so it describes the current
         season and every season before it that they were around for. */
      return SEASONS.indexOf(season) <= SEASONS.indexOf(CURRENT) && isPlaying(collapse(rec));
    }
    if (rec[season]) return isPlaying(collapse(keyOf(rec[season])));
    /* Carried forward from the most recent earlier entry, the same way
       statusIn does, so setting somebody departed does not make the next
       season forget. Nothing earlier at all means he was not here. */
    for (var i = SEASONS.indexOf(season) - 1; i >= 0; i--) {
      if (rec[SEASONS[i]]) return isPlaying(collapse(keyOf(rec[SEASONS[i]])));
    }
    return false;
  }

  /* ==========================================================================
     WHY THE SITE SAYS WHAT IT SAYS, AND THE ONE THING IT CANNOT KNOW

     The Worked out column was a bare badge. "Retained" with nothing beside it
     is unarguable-looking and was wrong for Leon Burnett, who signed in the
     summer of 2026: the record slot he occupies was also used for somebody
     else in October 2025. The site read that older team sheet as evidence he
     was here in 25/26, so his first season looked like his second and he was
     left out of the first-appearance list on the page announcing him.

     A team sheet stores a slot, not a person, and slots get handed on. Nothing
     can derive which of two people held one. So the column says what it
     concluded, what it concluded it FROM, in seasons rather than in storage
     keys, and where the evidence is the weak kind it offers the one field
     that settles it: the day they signed. A signing date is the club stating
     a fact about a person. The rest is inference. The fact wins.

     NOTHING HERE PRINTS THE KEY. The club does not use squad numbers and the
     site shows none, so a reason reading "No. 3 is named in 25/26" was both a
     rule broken and useless: it names a thing nobody recognises. The reason
     is the player and the seasons.
     ========================================================================== */
  function namedSeasons(num) {
    return ((SEED.namedIn || {})[String(num)] || []).slice();
  }

  /* The day the club says somebody signed, whichever season it was recorded
     against, earliest first. */
  /* `from` MEANS SIX DIFFERENT THINGS and only two of them are joining. See
     DETAIL_FIELDS below: it is "The day they signed" on In the squad and
     "Trial started" on On trial, but also "The day they left", "The day they
     retired", "Out since" and "The day they moved across". Read blind, a
     player set to Left the club in September 2026 carries a join date of
     September 2026, and the rule that uses this would then erase every season
     he actually played. */
  var JOINING = { active: 1, trial: 1 };

  function signedOn(map, num) {
    var rec = map[String(num)];
    if (!rec || typeof rec !== 'object') return '';
    var best = '';
    Object.keys(rec).forEach(function (season) {
      var e = rec[season];
      if (!e || typeof e !== 'object' || !JOINING[e.key]) return;
      var from = e.from;
      if (/^\d{4}-\d{2}-\d{2}/.test(from || '') && (!best || from < best)) best = from.slice(0, 10);
    });
    return best;
  }

  /* True when `season` finished before the player joined. */
  function joinedAfter(map, num, season) {
    var from = signedOn(map, num);
    if (!from) return false;
    var i = SEASONS.indexOf(season);
    var j = SEASONS.indexOf(seasonOfDate(from));
    return i >= 0 && j >= 0 && i < j;
  }

  function seasonOfDate(iso) {
    var m = /^(\d{4})-(\d{2})/.exec(iso || '');
    if (!m) return '';
    var y = Number(m[1]);
    /* 1 July starts the new season. The club sets this and the site's
       seasonOf() in stats.mjs must agree; panel-vs-site.mjs runs both over
       the boundary dates and caught this the moment they parted. */
    var start = Number(m[2]) >= 7 ? y : y - 1;
    return String(start).slice(2) + '/' + String(start + 1).slice(2);
  }

  /* Returns { why, conflict } - the sentence under the badge, and the seasons
     the evidence claims but a recorded signing date rules out. */
  function tenureWhy(map, num, season, key) {
    var named = namedSeasons(num);
    var from = signedOn(map, num);
    var joined = from ? seasonOfDate(from) : '';
    var before = named.filter(function (s) {
      return SEASONS.indexOf(s) < SEASONS.indexOf(season);
    });
    var ruledOut = joined ? before.filter(function (s) {
      return SEASONS.indexOf(s) < SEASONS.indexOf(joined);
    }) : [];

    if (from) {
      return {
        why: 'Signed ' + U.fmtDate(from) + '.' + (ruledOut.length
          ? ' A team sheet from ' + list(ruledOut) + ' names their record slot, before '
            + 'that date, so ' + (ruledOut.length === 1 ? 'it is' : 'they are')
            + ' not counted as theirs.'
          : ''),
        conflict: false,
      };
    }
    if (key === 'new') return { why: 'Named in no team sheet before ' + season + '.', conflict: false };
    if (!before.length) return { why: 'Nothing earlier on the record.', conflict: false };
    return {
      why: 'Named on a team sheet in ' + list(before) + '.',
      /* The weak kind of evidence: a number, not a person. Only worth raising
         where it is the ONLY thing making this a second season. */
      conflict: true,
    };
  }

  function list(xs) {
    if (xs.length === 1) return xs[0];
    return xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1];
  }

  function tenureIn(map, num, season) {
    var idx = SEASONS.indexOf(season);
    if (idx < 0) return null;
    var here = function (s) { return wasHere(map, num, s); };
    if (!here(season) || idx === 0) return null;
    if (here(SEASONS[idx - 1])) return 'retained';
    for (var i = idx - 2; i >= 0; i--) if (here(SEASONS[i])) return 'returned';
    return 'new';
  }

  /* Writing keeps every season already recorded, including any this tool has
     never heard of. A flat value being replaced is preserved as what he was
     in the current season rather than thrown away. */
  /* `extra` is what the club knows beyond the bare status: the day somebody
     signed, the day a trial started, when an injured player is expected back,
     which club a departing one went to. Stored beside the key rather than
     instead of it, so everything that only wants the key keeps working.

     A season with nothing extra stays a plain string, so the record does not
     grow objects it has no use for. */
  function withStatus(map, num, season, key, extra) {
    var next = {};
    Object.keys(map).forEach(function (k) { next[k] = map[k]; });
    var prev = next[String(num)];
    var bySeason = {};
    if (prev && typeof prev === 'object') {
      Object.keys(prev).forEach(function (s) { bySeason[s] = prev[s]; });
    } else if (typeof prev === 'string' && prev && !bySeason[CURRENT]) {
      bySeason[CURRENT] = prev;
    }
    var kept = {};
    Object.keys(extra || {}).forEach(function (k) {
      if (extra[k] !== '' && extra[k] != null) kept[k] = extra[k];
    });
    if (Object.keys(kept).length) {
      kept.key = key;
      bySeason[season] = kept;
    } else {
      bySeason[season] = key;
    }
    next[String(num)] = bySeason;
    return next;
  }

  /* WHAT EACH STATUS IS WORTH ASKING ABOUT.

     A season on its own is not detailed enough, which is the whole reason for
     this: "New signing" is equally true of somebody who came through
     pre-season and somebody who arrived after Christmas, and it reads the
     same in his eighth month as in his first. A date turns it into "Signed
     July 2026".

     Only the fields that mean something for the status chosen, so the form
     never asks when an injury ends for a player who has retired. */
  function detailFields(key, have) {
    var fields = DETAIL_FIELDS[key] || [];
    if (!fields.length) return '';
    return fields.map(function (f) {
      var name = f[0], kind = f[1], label = f[2];
      return '<label class="cp-when__f"><span>' + esc(label) + '</span>' +
        '<input class="input input--sm" type="' + kind + '" data-extra="' + name + '" ' +
          'value="' + esc(have[name] || '') + '"></label>';
    }).join('');
  }

  var DETAIL_FIELDS = {
    active: [['from', 'date', 'The day they signed']],
    trial: [['from', 'date', 'Trial started'], ['until', 'date', 'Trial ends']],
    injured: [['from', 'date', 'Out since'], ['until', 'date', 'Expected back']],
    away: [['note', 'text', 'Why, in a few words']],
    retired: [['from', 'date', 'The day they retired']],
    departed: [['from', 'date', 'The day they left'], ['to', 'text', 'Where they went']],
    staff: [['from', 'date', 'The day they moved across']],
  };

  var POSITIONS = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];
  var ROLES = ['Manager', 'Assistant manager', 'Coach', 'Goalkeeping coach',
    'Physiotherapist', 'Team secretary', 'Kit manager'];

  /* The record the panel owns, read defensively: it has been written by three
     different generations of this tool. */
  function statusMap(rows) {
    var row = rows.filter(function (r) { return r.key === 'roster:status'; })[0];
    var d = (row && row.data) || {};
    return d.status || d || {};
  }
  function addedPlayers(rows) {
    var row = rows.filter(function (r) { return r.key === 'roster:s2627'; })[0];
    return ((row && row.data && row.data.players) || []).filter(function (p) { return p && p.num; });
  }
  /* Trialists. Deliberately NOT squad members: they have no profile, no card
     and no place in any club record. They exist so that a friendly they played
     in can name them instead of saying "No. 901", which is the whole point of
     having them at all. Numbers run from 900 up so they can never collide. */
  function trialistList(rows) {
    var row = rows.filter(function (r) { return r.key === 'roster:trialists'; })[0];
    return ((row && row.data && row.data.players) || []).filter(function (t) { return t && t.name; });
  }

  function staffList(rows) {
    var row = rows.filter(function (r) { return r.key === 'roster:coaches'; })[0];
    return ((row && row.data && row.data.coaches) || []).filter(function (c) { return c && c.name; });
  }

  function slug(name) {
    return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  /* The lowest number nobody is using. Numbers are plumbing, so the panel
     picks one rather than asking. */
  function freeNumber(all) {
    var used = {};
    all.forEach(function (p) { used[p.num] = true; });
    for (var n = 1; n < 200; n++) if (!used[n]) return n;
    return 200;
  }

  M.squad = function (host) {
    return CP.readAll('player_photos').then(function (rows) {
      var status = statusMap(rows);
      var added = addedPlayers(rows);
      var staff = staffList(rows);
      var photoKeys = {};
      rows.forEach(function (r) { if (/^\d+$/.test(r.key)) photoKeys[r.key] = true; });

      /* The squad the website is built from, plus anyone added here since. */
      var seen = {};
      var players = SQUAD.concat(added.map(function (p) {
        return { num: p.num, name: (p.first + ' ' + p.last).trim(), pos: p.position || '' };
      })).filter(function (p) {
        if (seen[p.num]) return false;
        seen[p.num] = true;
        return true;
      }).map(function (p) {
        return {
          num: p.num,
          name: p.name,
          pos: p.pos || '',
          /* What he is IN THE SEASON BEING EDITED, and what the site works
             out about him from the seasons around it. */
          status: statusIn(status, p.num, editSeason),
          tenure: tenureIn(status, p.num, editSeason),
          why: tenureWhy(status, p.num, editSeason, tenureIn(status, p.num, editSeason)),
          signed: signedOn(status, p.num),
          /* Whatever was recorded beside the status for this season, so the
             fields open with what is already there rather than blank. */
          detail: statusDetail(status, p.num, editSeason),
          photo: !!photoKeys[String(p.num)],
          added: added.some(function (a) { return a.num === p.num; }),
        };
      }).sort(function (a, b) { return a.name.localeCompare(b.name); });

      var trialists = trialistList(rows);
      var counts = {};
      STATUSES.forEach(function (x) { counts[x.key] = 0; });
      players.forEach(function (p) { counts[p.status] = (counts[p.status] || 0) + 1; });

      /* ------------------------------------------------------------------
         WHO IS NEW, WHO STAYED, WHO HAS GONE - ANSWERED, NOT SEARCHED FOR

         Twenty-five players in one alphabetical list, each with a dropdown
         and a worked-out badge, and the question the club actually arrives
         with is "who is new this season". Answering it meant reading every
         row and remembering. The counts were already in the paragraph above
         the table as prose, which is the least useful place for them: you
         can read that there are three new signings and still not know which
         three.

         So each count is a button and each button is a filter. The derived
         three come first because they are the question; the set statuses
         follow because they are the answer to a different one. A group with
         nobody in it is not offered, so the bar never shows a filter that
         empties the table.
         ------------------------------------------------------------------ */
      var groups = [];
      var tally = {};
      players.forEach(function (p) {
        tally[p.tenure || '-'] = (tally[p.tenure || '-'] || 0) + 1;
        tally['s:' + p.status] = (tally['s:' + p.status] || 0) + 1;
        if (p.why && p.why.conflict) tally.flag = (tally.flag || 0) + 1;
      });
      groups.push({ id: 'all', label: 'Everyone', n: players.length });
      ['new', 'retained', 'returned'].forEach(function (k) {
        if (tally[k]) groups.push({ id: k, label: LABEL[k], n: tally[k] });
      });
      STATUSES.forEach(function (x) {
        if (tally['s:' + x.key]) groups.push({ id: 's:' + x.key, label: x.label, n: tally['s:' + x.key] });
      });
      if (tally.flag) {
        groups.push({ id: 'flag', label: 'Needs a signing date', n: tally.flag, warn: true });
      }
      /* A filter that no longer matches anybody - the last new signing was
         given a date, so the group is gone - falls back to everyone rather
         than showing an empty table with no pressed button to explain it. */
      if (!groups.some(function (g) { return g.id === showOnly; })) showOnly = 'all';

      var filterBar = '<div class="cp-filters" role="group" aria-label="Show only">' +
        groups.map(function (g) {
          var on = g.id === showOnly;
          return '<button class="cp-filter' + (g.warn ? ' cp-filter--warn' : '') +
            (on ? ' is-on' : '') + '" type="button" data-filter="' + esc(g.id) + '"' +
            ' aria-pressed="' + (on ? 'true' : 'false') + '">' +
            esc(g.label) + ' <b>' + esc(g.n) + '</b></button>';
        }).join('') + '</div>';

      /* One tab per season. Everything under it is about that season: the
         counts, the dropdowns and the worked-out labels. Editing 25/26 does
         not touch 26/27, which is the whole point of the change. */
      var seasonBar = SEASONS.length > 1
        ? '<div class="cp-seasonbar" role="group" aria-label="Season">' +
            SEASONS.map(function (s) {
              return '<button class="cp-seasonbtn' + (s === editSeason ? ' is-on' : '') +
                '" type="button" data-edit-season="' + esc(s) + '"' +
                ' aria-pressed="' + (s === editSeason ? 'true' : 'false') + '">' +
                esc(s) + (s === CURRENT ? '<i>this season</i>' : '') + '</button>';
            }).join('') +
          '</div>'
        : '';

      host.innerHTML =
        sec({
          title: 'The squad',
          sub: seasonBar
            + '<p>' + esc(players.length) + ' players. What somebody is is recorded <b>per season</b>, '
            + 'so this screen is about <b>' + esc(editSeason) + '</b> and nothing you change here '
            + 'touches another year. '
            + 'Anyone not in the squad keeps their profile and their whole record; they move to '
            + '<b>Those who came before</b> rather than disappearing.</p>'
            + '<p class="cp-note"><b>New signing</b>, <b>retained</b> and <b>back at the club</b> are '
            + 'not in the list because the site works them out: it knows which seasons each player has '
            + 'been in the squad, so it can tell a first season from a second from a return, and it '
            + 'keeps doing so every year without anyone editing anything.</p>'
            + filterBar,
          actions: '<button class="btn btn--primary" data-add-player>Add a player</button>',
          body: table(['Player', 'Position', 'Photograph', 'In ' + editSeason, 'Worked out', ''],
            players.map(function (p) {
              var tags = ['all', p.tenure || '', 's:' + p.status,
                (p.why && p.why.conflict) ? 'flag' : ''].filter(Boolean).join(' ');
              var shown = (' ' + tags + ' ').indexOf(' ' + showOnly + ' ') > -1;
              return '<tr data-num="' + p.num + '" data-tags="' + esc(tags) + '"' +
                (shown ? '' : ' hidden') + '>' +
                '<td><b>' + esc(p.name) + '</b></td>' +
                '<td>' + esc(p.pos || 'Worked out from where they have played') + '</td>' +
                '<td>' + (p.photo
                  ? '<span class="badge badge--success">Yes</span>'
                  : '<span class="badge badge--warning">None</span>') + '</td>' +
                /* NOT AT THE CLUB IS NOT A CHOICE, SO IT IS NOT A DROPDOWN.
                   `absent` is derived, never set: it is what the record says
                   when a season ended before the player signed. The dropdown
                   has no option for it, so rendering one here left nothing
                   selected and the browser fell back to the first option,
                   showing "In the squad" for a season he was not at the club.
                   A sentence says the true thing and cannot be used to
                   re-assert the contradiction by accident. */
                '<td>' + (p.status === 'absent'
                  ? '<span class="cp-hint">Not at the club in ' + esc(editSeason) + '.' +
                    (p.signed ? ' Signed ' + esc(U.fmtDate(p.signed)) + '.' : '') + '</span>'
                  : '<select class="select" data-status aria-label="What ' + esc(p.name) +
                    ' was in ' + esc(editSeason) + '">' +
                  STATUSES.map(function (x) {
                    return '<option value="' + x.key + '"' + (p.status === x.key ? ' selected' : '') +
                      '>' + esc(x.label) + '</option>';
                  }).join('') + '</select>' +
                  '<small class="cp-hint" data-status-hint>' +
                    esc((STATUSES.filter(function (x) { return x.key === p.status; })[0] || {}).hint || '') +
                  '</small>' +
                  /* The fields that go with whichever status is chosen. They
                     save on change like the status does, so there is no
                     second button to press and nothing to forget. */
                  '<div class="cp-when" data-when>' + detailFields(p.status, p.detail || {}) + '</div>'
                  ) + '</td>' +
                /* The site's own answer, shown but never editable, so it is
                   obvious it is derived rather than something to maintain -
                   AND the reason for it, because a bare badge is unarguable
                   looking and was wrong. Where the only thing making this a
                   second season is a team sheet from an earlier one, the
                   cell says so and points at the field that settles it. */
                '<td>' + (p.tenure
                  ? '<span class="badge badge--neutral">' + esc(LABEL[p.tenure]) + '</span>' +
                    (p.why ? '<small class="cp-hint">' + esc(p.why.why) + '</small>' : '') +
                    (p.why && p.why.conflict
                      ? '<small class="cp-flag">A team sheet only records which slot somebody ' +
                        'filled, and slots get handed on. If that earlier season was a different ' +
                        'player, fill in <b>The day they signed</b> and this becomes ' +
                        esc(LABEL.new) + '.</small>'
                      : '')
                  : '<span class="cp-hint">Nothing to say</span>') + '</td>' +
                '<td>' + (p.added
                  ? '<button class="btn btn--danger btn--sm" data-del-player>Remove</button> '
                  : '') +
                  '<a class="btn btn--quiet btn--sm" href="/players/' + esc(slug(p.name)) +
                    '.html" target="_blank" rel="noopener">View</a></td>' +
              '</tr>';
            }).join('')),
          where: [['Squad', '/squad.html'], ['Every player profile', '/squad.html']],
          whereNote: 'retired, departed and now-coaching players keep their profile and their record',
        }) +

        sec({
          title: 'On trial',
          sub: 'Lads having a look who are not signed. They can be picked on a team sheet, score, '
            + 'and be named in a match report, and they appear <b>nowhere else</b>: no profile, no '
            + 'squad card, and nothing in the club’s records. That is what a trial is. Sign one and '
            + 'you add them properly above.',
          actions: '<button class="btn btn--primary" data-add-trialist>Add a trialist</button>',
          body: (trialists.length
            ? table(['Name', 'Trial window', 'Still offered', ''], trialists.map(function (t, i) {
              /* A trial is a window by definition: a few weeks training with
                 the squad, after which they sign or they do not. Without an
                 end date a fortnight's trial from two seasons ago sits in
                 every team-sheet dropdown for good. */
              var today = new Date().toISOString().slice(0, 10);
              var over = t.until && today > t.until;
              var window = (t.from || t.added || '?') + ' to ' + (t.until || 'open');
              return '<tr data-trialist="' + i + '">' +
                '<td><b>' + esc(t.name) + '</b></td>' +
                '<td>' +
                  '<input class="input input--sm" type="date" data-t-from value="' + esc(t.from || '') + '" ' +
                    'aria-label="Trial from"> ' +
                  '<input class="input input--sm" type="date" data-t-until value="' + esc(t.until || '') + '" ' +
                    'aria-label="Trial until">' +
                  '<span class="cp-hint">' + esc(window) + '</span>' +
                '</td>' +
                '<td>' + (over
                  ? '<span class="badge badge--warning">Trial over</span>'
                  : '<span class="badge badge--success">Yes</span>') + '</td>' +
                '<td><button class="btn btn--danger btn--sm" data-del-trialist>Remove</button></td>' +
              '</tr>';
            }).join(''))
            : empty('Nobody on trial',
              'Add one and they can be picked on a team sheet straight away.')),
          where: [['Match reports', '/results.html']],
          whereNote: 'and nowhere else, on purpose',
        }) +

        sec({
          title: 'Coaching staff',
          sub: 'Everyone on the touchline. A player moved into coaching appears here automatically.',
          actions: '<button class="btn btn--primary" data-add-staff>Add someone</button>',
          body: (staff.length
            ? table(['Name', 'Role', ''], staff.map(function (c, i) {
              return '<tr data-staff="' + i + '">' +
                '<td><b>' + esc(c.name) + '</b></td>' +
                '<td>' + esc(c.role || 'Coach') + '</td>' +
                '<td><button class="btn btn--ghost btn--sm" data-edit-staff>Edit</button> ' +
                  '<button class="btn btn--danger btn--sm" data-del-staff>Remove</button></td>' +
              '</tr>';
            }).join(''))
            : empty('Nobody added here yet',
              'The founding staff come from the site’s own records and always show. Anyone appointed since is added here.')),
          where: [['Coaches', '/coaches.html']],
        });

      /* ---- Writing ---- */
      function saveStatus(next) {
        return CP.upsert('player_photos', 'roster:status', { status: next });
      }
      function saveStaff(next) {
        return CP.upsert('player_photos', 'roster:coaches', { coaches: next });
      }
      function savePlayers(next) {
        return CP.upsert('player_photos', 'roster:s2627', { players: next });
      }

      host.addEventListener('change', function (e) {
        /* A trial window, edited in place. Setting an end date is what stops
           somebody being offered on a team sheet for ever. */
        var tr = e.target.closest('tr[data-trialist]');
        if (tr && (e.target.matches('[data-t-from]') || e.target.matches('[data-t-until]'))) {
          if (!guard()) { refresh('squad'); return; }
          var ti = Number(tr.getAttribute('data-trialist'));
          var next = trialists.map(function (t, k) {
            if (k !== ti) return t;
            var copy = {};
            Object.keys(t).forEach(function (key) { copy[key] = t[key]; });
            var f = tr.querySelector('[data-t-from]').value;
            var u = tr.querySelector('[data-t-until]').value;
            if (f) copy.from = f; else delete copy.from;
            if (u) copy.until = u; else delete copy.until;
            return copy;
          });
          saveTrialists(next, trialists[ti].name + '\u2019s trial window saved');
          return;
        }
        var isStatus = e.target.matches('[data-status]');
        var isExtra = e.target.matches('[data-extra]');
        if (!isStatus && !isExtra) return;
        if (!guard()) { refresh('squad'); return; }
        var tr = e.target.closest('tr[data-num]');
        var num = Number(tr.getAttribute('data-num'));
        var player = players.filter(function (p) { return p.num === num; })[0];
        var sel = tr.querySelector('[data-status]');
        var value = sel.value;

        /* Changing the status swaps which fields are asked for, and the ones
           belonging to the status being left behind are dropped rather than
           kept against a status they mean nothing to. */
        if (isStatus) tr.querySelector('[data-when]').innerHTML = detailFields(value, {});
        var extra = {};
        Array.prototype.forEach.call(tr.querySelectorAll('[data-extra]'), function (i) {
          extra[i.getAttribute('data-extra')] = i.value.trim();
        });
        /* Written against the season being edited, keeping every other season
           already on the record. Setting somebody to Left the club in 26/27
           leaves 25/26 exactly as it was, which is what makes the squad page's
           25/26 tab able to say he was in the squad that year. */
        var next = withStatus(status, num, editSeason, value, extra);

        /* Moving a player into coaching is one decision, so it is one action:
           they come out of the squad AND go onto the staff. Doing only the
           first leaves a coach nobody can find; doing only the second leaves
           them listed as a player who has not turned out all season. */
        var work = saveStatus(next);
        if (value === 'staff' && !staff.some(function (c) { return c.name === player.name; })) {
          work = work.then(function () {
            return saveStaff(staff.concat([{
              id: slug(player.name), name: player.name, role: 'Coach',
              bio: [player.name + ' played for the club before joining the coaching staff.'],
            }]));
          });
        }
        work.then(function () {
          toast(player.name + ' in ' + editSeason + ': ' + LABEL[value], 'success');
          refresh('squad');
        }).catch(function (err) { toast(err.message, 'error'); refresh('squad'); });
      });

      function saveTrialists(next, msg) {
        return CP.upsert('player_photos', 'roster:trialists', { players: next })
          .then(function () { toast(msg, 'success'); refresh('squad'); })
          .catch(function (err) { toast(err.message, 'error'); });
      }

      host.addEventListener('click', function (e) {
        /* Switching season re-renders this screen against that season. It
           reads and writes nothing: the record already holds every year. */
        var tab = e.target.closest && e.target.closest('[data-edit-season]');
        if (tab) {
          editSeason = tab.getAttribute('data-edit-season');
          refresh('squad');
          return;
        }
        /* FILTERING IS A VIEW, NOT A REFRESH. Re-rendering would lose the
           dropdown somebody is halfway through and would cost a round trip to
           show rows that are already on the page. */
        var flt = e.target.closest && e.target.closest('[data-filter]');
        if (flt) {
          var want = flt.getAttribute('data-filter');
          showOnly = want;
          $$('[data-filter]', host).forEach(function (b) {
            var on = b === flt;
            b.classList.toggle('is-on', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
          });
          $$('tr[data-tags]', host).forEach(function (tr) {
            var tags = (' ' + tr.getAttribute('data-tags') + ' ');
            tr.hidden = tags.indexOf(' ' + want + ' ') < 0;
          });
          return;
        }

        if (e.target.matches('[data-add-player]')) { if (guard()) playerForm(); return; }

        if (e.target.matches('[data-add-trialist]')) {
          if (!guard()) return;
          var said = window.prompt('What is their name?');
          if (said === null) return;
          var name = said.trim();
          if (!name) { toast('A name, please.', 'error'); return; }
          /* From 900 up, so a trialist number can never be mistaken for a
             squad number by any record that only stores the number. */
          var used = {};
          trialists.forEach(function (t) { used[t.num] = true; });
          var num = 900;
          while (used[num]) num++;
          var today = new Date().toISOString().slice(0, 10);
          saveTrialists(trialists.concat([{ num: num, name: name,
            added: today, from: today }]), name + ' can now be picked. Set an end date when the trial finishes.');
          return;
        }
        var trow = e.target.closest('tr[data-trialist]');
        if (trow && e.target.matches('[data-del-trialist]')) {
          if (!guard()) return;
          var ti = Number(trow.getAttribute('data-trialist'));
          confirmAction({
            title: 'Remove ' + trialists[ti].name + '?',
            body: 'They can no longer be picked on a team sheet.',
            detail: 'Any match they have already played in keeps them, because that match happened. '
              + 'If they have signed, add them to the squad above instead.',
            confirmLabel: 'Remove',
          }).then(function (yes) {
            if (!yes) return;
            var rest = trialists.slice();
            rest.splice(ti, 1);
            saveTrialists(rest, 'Removed');
          });
          return;
        }
        if (e.target.matches('[data-add-staff]')) { if (guard()) staffForm(null); return; }

        var srow = e.target.closest('tr[data-staff]');
        if (srow && e.target.matches('[data-edit-staff]')) {
          if (guard()) staffForm(Number(srow.getAttribute('data-staff')));
          return;
        }
        if (srow && e.target.matches('[data-del-staff]')) {
          if (!guard()) return;
          var si = Number(srow.getAttribute('data-staff'));
          confirmAction({
            title: 'Remove ' + staff[si].name + ' from the staff?',
            body: 'They come off the coaches page at the next publish.',
            confirmLabel: 'Remove',
          }).then(function (yes) {
            if (!yes) return;
            var rest = staff.slice();
            rest.splice(si, 1);
            saveStaff(rest).then(function () { toast('Removed', 'success'); refresh('squad'); })
              .catch(function (err) { toast(err.message, 'error'); });
          });
          return;
        }

        var prow = e.target.closest('tr[data-num]');
        if (prow && e.target.matches('[data-del-player]')) {
          if (!guard()) return;
          var num = Number(prow.getAttribute('data-num'));
          var who = players.filter(function (p) { return p.num === num; })[0];
          confirmAction({
            title: 'Remove ' + who.name + '?',
            body: 'This deletes the player record entirely. If they have simply left the club, '
              + 'set them to Left the club instead: that keeps their profile and everything they did.',
            confirmLabel: 'Delete the record',
          }).then(function (yes) {
            if (!yes) return;
            savePlayers(added.filter(function (p) { return p.num !== num; }))
              .then(function () { toast('Removed', 'success'); refresh('squad'); })
              .catch(function (err) { toast(err.message, 'error'); });
          });
        }
      });

      /* ---- Add a player ---- */
      function playerForm() {
        var back = modal('Add a player',
          '<div class="grid grid--2">' +
            '<div class="field"><label class="field__label" for="p-first">First name</label>' +
              '<input class="input" id="p-first" autocomplete="off"></div>' +
            '<div class="field"><label class="field__label" for="p-last">Surname</label>' +
              '<input class="input" id="p-last" autocomplete="off"></div>' +
            '<div class="field"><label class="field__label" for="p-pos">Position</label>' +
              '<select class="select" id="p-pos">' +
                POSITIONS.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') +
              '</select></div>' +
            '<div class="field"><label class="field__label" for="p-status">What they are in ' +
                esc(editSeason) + '</label>' +
              '<select class="select" id="p-status">' +
                /* "New signing" is not offered because the site works it out:
                   a player with no earlier season IS a new signing, and will
                   stop being one next year without anybody editing him. */
                STATUSES.filter(function (x) { return x.playing; }).map(function (x) {
                  return '<option value="' + x.key + '"' + (x.key === 'active' ? ' selected' : '') +
                    '>' + esc(x.label) + '</option>';
                }).join('') +
              '</select></div>' +
          '</div>' +
          '<div class="field" style="margin-top:var(--space-4)">' +
            '<label class="field__label" for="p-bio">A line about them (optional)</label>' +
            '<textarea class="textarea" id="p-bio" rows="3" ' +
              'placeholder="Where they came from, what they bring. Shows on their profile."></textarea></div>' +
          '<p class="field__hint" style="margin-top:var(--space-3)">Their position is used until they '
            + 'have played: after that the site works it out from where they actually lined up.</p>');

        $('[data-save]', back).addEventListener('click', function () {
          var first = $('#p-first', back).value.trim();
          var last = $('#p-last', back).value.trim();
          var err = $('[data-err]', back);
          if (!first || !last) { err.textContent = 'A first name and a surname, please.'; err.hidden = false; return; }
          var bio = $('#p-bio', back).value.trim();
          var num = freeNumber(players);
          var rec = { num: num, first: first, last: last, position: $('#p-pos', back).value };
          if (bio) rec.bio = [bio];
          var chosen = $('#p-status', back).value;
          var nextStatus = withStatus(status, num, editSeason, chosen);
          err.hidden = true;
          savePlayers(added.concat([rec]))
            .then(function () { return saveStatus(nextStatus); })
            .then(function () {
              toast(first + ' ' + last + ' added to the squad', 'success');
              back.remove();
              refresh('squad');
            })
            .catch(function (e2) { err.textContent = e2.message; err.hidden = false; });
        });
      }

      /* ---- Add or edit staff ---- */
      function staffForm(i) {
        var c = i == null ? { name: '', role: 'Coach', bio: [] } : staff[i];
        var back = modal(i == null ? 'Add someone to the staff' : 'Edit ' + c.name,
          '<div class="grid grid--2">' +
            '<div class="field"><label class="field__label" for="s-name">Name</label>' +
              '<input class="input" id="s-name" value="' + esc(c.name) + '"></div>' +
            '<div class="field"><label class="field__label" for="s-role">Role</label>' +
              '<input class="input" id="s-role" list="s-roles" value="' + esc(c.role || 'Coach') + '"></div>' +
          '</div>' +
          '<datalist id="s-roles">' + ROLES.map(function (r) {
            return '<option value="' + esc(r) + '"></option>';
          }).join('') + '</datalist>' +
          '<div class="field" style="margin-top:var(--space-4)">' +
            '<label class="field__label" for="s-bio">About them</label>' +
            '<textarea class="textarea" id="s-bio" rows="5">' +
              esc((c.bio || []).join('\n\n')) + '</textarea>' +
            '<p class="field__hint">Blank lines separate paragraphs on the coaches page.</p></div>');

        $('[data-save]', back).addEventListener('click', function () {
          var name = $('#s-name', back).value.trim();
          var err = $('[data-err]', back);
          if (!name) { err.textContent = 'A name, please.'; err.hidden = false; return; }
          var rec = {
            id: c.id || slug(name),
            name: name,
            role: $('#s-role', back).value.trim() || 'Coach',
            bio: $('#s-bio', back).value.split(/\n{2,}/).map(function (s) { return s.trim(); }).filter(Boolean),
          };
          var next = staff.slice();
          if (i == null) next.push(rec); else next[i] = rec;
          err.hidden = true;
          saveStaff(next).then(function () {
            toast('Saved', 'success');
            back.remove();
            refresh('squad');
          }).catch(function (e2) { err.textContent = e2.message; err.hidden = false; });
        });
      }
    });
  };

  /* A small form dialog. The match form has its own because it is five tabs;
     everything here is one screen. */
  function modal(title, body) {
    var back = document.createElement('div');
    back.className = 'modal-backdrop';
    back.setAttribute('role', 'dialog');
    back.setAttribute('aria-modal', 'true');
    back.innerHTML =
      '<div class="modal glass glass--lg" style="width:min(96vw,640px)">' +
        '<div class="modal__head"><h2 class="mform__title">' + esc(title) + '</h2></div>' +
        body +
        '<p class="field__error" data-err hidden></p>' +
        '<div class="modal__foot">' +
          '<button class="btn btn--ghost" data-cancel>Cancel</button>' +
          '<button class="btn btn--primary" data-save>Save</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(back);
    back.addEventListener('click', function (e) {
      if (e.target === back || e.target.matches('[data-cancel]')) back.remove();
    });
    var firstField = back.querySelector('input, select, textarea');
    if (firstField) firstField.focus();
    return back;
  }
})();
