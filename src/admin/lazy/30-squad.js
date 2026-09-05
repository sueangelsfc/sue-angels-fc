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
  /* Never set by anybody: it is what the record says when there is no entry
     for a season and no evidence the player was there. PLAYING is built from
     the two lists above, so without this line `absent` is simply missing from
     it and every test has to remember to ask the question the safe way round.
     Named here to match src/lib/squad-status.mjs, which does the same. */
  PLAYING.absent = false;
  /* At the club in the season being edited: in the squad, on trial, injured
     or unavailable. Not retired, not left, not moved into coaching, and not
     absent. `=== true` rather than `!== false` so a status this screen has
     never heard of is treated as gone rather than as present. */
  function atClub(p) { return PLAYING[p.status] === true; }

  /* SURNAME FIRST, BECAUSE THE ORDER IS BY SURNAME.

     Sorting this list by surname was half the fix and the invisible half. The
     column printed "Andrew Allen, Michael Brabrook, Kafele Brown", so reading
     down the first letters gave A, M, K, E, L, C and the table looked
     unsorted - which is exactly what it was reported as. A correct order
     nobody can see is not an order.

     `last` and `first` are on every seeded player and on everyone added here.
     Anything without both keeps its plain name rather than being split on a
     space, because a surname is not always the last word. The full name is
     still what every label, dialog and dropdown says: this is how the sorted
     COLUMN is written, not a new name for the player. */
  function listName(p) {
    return (p.last && p.first) ? p.last + ', ' + p.first : p.name;
  }

  /* The season being edited. Everything on this screen is about this one
     season: the dropdown sets what somebody was IN IT, and the counts and
     the worked-out labels describe IT. It starts on the current season
     because that is what anybody opening the panel in August is here for. */
  var editSeason = CURRENT;
  /* The chosen filter survives a re-render, the way the chosen season does.
     Setting a signing date refreshes the screen, and without this the list
     jumped back to everyone at the exact moment somebody was working through
     the three players the filter had just found for them. */
  /* THE SCREEN OPENS ON WHO IS ACTUALLY HERE. It opened on everyone, which
     for this club is 37 players of whom 21 have retired, left or moved into
     coaching: the list somebody arrives to work on was outnumbered by the one
     they were not. Everybody is still one press away, and nobody is hidden
     from the record - "Everyone" is the next button along and the season tabs
     are above it. */
  var showOnly = 'squad';

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
    /* MIRRORS statusIn() IN src/lib/squad-status.mjs, step for step. It used
       to default to 'active' for a season it knew nothing about, on the
       reasoning that a player nobody has said anything about is in the squad.
       That is the right default for the season being EDITED and the wrong one
       for every season before it, and the site has always disagreed: it
       answers 'absent' where there is no entry AND no appearance, which is
       what makes "new signing" derivable at all.

       The disagreement was excused in panel-vs-site.mjs as something the
       panel "deliberately does not model". It models it now, so nothing is
       excused, and the screen renders a plain "Not at the club in 25/26"
       rather than a dropdown showing In the squad for a year he was not. */
    if (joinedAfter(map, num, season)) return 'absent';
    var rec = map[String(num)];
    if (rec && typeof rec === 'object' && rec[season]) return collapse(keyOf(rec[season]));
    if (typeof rec === 'string') {
      if (season === CURRENT) return collapse(rec);
    } else if (rec) {
      for (var i = SEASONS.indexOf(season) - 1; i >= 0; i--) {
        if (rec[SEASONS[i]]) return collapse(keyOf(rec[SEASONS[i]]));
      }
    }
    return wasHere(map, num, season) ? 'active' : 'absent';
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
  /* Whether ANYBODY has been named in a match in the club's season yet.
     Nothing competitive has been played in it, so absence of evidence is not
     evidence of absence and a squad member belongs to the season about to
     start - the same exception dataset.mjs makes, for the same reason. */
  var NAMED_IN_CURRENT = (SEED.squad || []).some(function (p) {
    return ((SEED.namedIn || {})[String(p.num)] || []).indexOf(CURRENT) > -1;
  });

  function wasHere(map, num, season) {
    /* THE SIGNING DATE, HERE TOO. statusIn honours it and this did not, and
       tenure is worked out from THIS function - so the panel called Leon
       Burnett "Retained" for a season the site had already decided he was
       absent for. Two functions, one rule, and only one of them had it. */
    if (joinedAfter(map, num, season)) return false;

    var rec = map[String(num)];
    if (rec && typeof rec === 'object' && rec[season]) {
      return isPlaying(collapse(keyOf(rec[season])));
    }
    if (typeof rec === 'string') {
      /* A flat value is the last thing the club said, so it describes the
         CURRENT season. It was read as describing every season before it as
         well, which made Christopher Fernandes - stored as the single word
         "returned" - look like a man who was here in 25/26. He was not named
         in one match that season, and the site knew: it published "new
         signing" while this screen said "Retained". */
      if (season === CURRENT) return isPlaying(collapse(rec));
    } else if (rec) {
      /* Carried forward from the most recent earlier entry, the same way
         statusIn does, so setting somebody departed does not make the next
         season forget. */
      for (var i = SEASONS.indexOf(season) - 1; i >= 0; i--) {
        if (rec[SEASONS[i]]) return isPlaying(collapse(keyOf(rec[SEASONS[i]])));
      }
    }

    /* NOTHING RECORDED FOR THIS SEASON, so the archive answers - the same
       evidence the site derives from, which this screen is now seeded with.
       It used to answer "no" flat out, which is why the panel could not tell
       a first season from a second the way the site could. */
    if (season === CURRENT && !NAMED_IN_CURRENT) return true;
    return ((SEED.namedIn || {})[String(num)] || []).indexOf(season) > -1;
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

  /* Today, as the record writes dates. `new Date().toISOString()` is UTC, and
     the club is an hour ahead of it from March to October: at 00:30 on a
     Sunday in August that returns Saturday, which would date a trial to the
     day before it started. */
  function todayIso() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) +
      '-' + ('0' + d.getDate()).slice(-2);
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
  function tenureWhy(map, num, season, key, base) {
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
      /* WHEN THIS IS WORTH RAISING, WHICH IS RARELY. Every retained player was
         named in an earlier season - that is what retained MEANS - so
         flagging "no signing date and an earlier appearance" lit up 31 of 37
         rows, and a warning on nearly every row is decoration rather than a
         signal. The contradiction is narrower: somebody the club ADDED as a
         signing who nonetheless carries an appearance from before, which is
         exactly what a handed-on record slot produces. `base` is false only
         for a player this panel signed. */
      conflict: !base,
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

  /* Statuses that mean somebody has gone, so the archive's last-played date
     is worth offering as a leaving date. */
  var GONE = { departed: 1, retired: 1, staff: 1 };

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
  var ROLES = SEED.coachRoles || [];

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

  /* EVERYONE ON THE TOUCHLINE, WHICH IS WHAT THE HEADING PROMISED.
     The table listed `roster:coaches` alone, so the founding staff - who live
     in the site's own records - were invisible here while appearing on the
     website. The club opened Coaching staff, saw one name, and the coaches
     page had three. The note underneath explained it, which is not the same
     as showing it.

     They were always editable: dataset.mjs merges a roster:coaches entry over
     the base BY ID, so saving one with a matching id overrides it. Nobody
     could, because nothing offered them. Removing one is different and is not
     offered: the base record would still publish them, so the button would
     appear to work and change nothing. */
  function everyCoach(rows) {
    var own = staffList(rows);
    var byId = {};
    own.forEach(function (c, i) { byId[c.id || slug(c.name)] = i; });
    var out = own.map(function (c, i) {
      return { rec: c, i: i, base: false };
    });
    (SEED.coaches || []).forEach(function (c) {
      var id = c.id || slug(c.name);
      if (byId[id] != null) return;
      out.push({ rec: c, i: -1, base: true });
    });
    return out;
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
      var allCoaches = everyCoach(rows);
      var photoKeys = {};
      rows.forEach(function (r) { if (/^\d+$/.test(r.key)) photoKeys[r.key] = true; });

      /* The squad the website is built from, plus anyone added here since. */
      var seen = {};
      /* SQUAD is the site's own merged list, so it already carries the
         panel's overrides. `added` is only reached for somebody signed since
         the last publish, and that record has to keep its parts or the edit
         form would open with an empty name for the one player most likely to
         need correcting. */
      var players = SQUAD.concat(added.map(function (p) {
        return {
          num: p.num,
          name: (p.first + ' ' + p.last).trim(),
          pos: p.position || '',
          first: p.first || '',
          last: p.last || '',
          base: false,
          lastPlayed: '',
        };
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
          why: tenureWhy(status, p.num, editSeason, tenureIn(status, p.num, editSeason), p.base),
          signed: signedOn(status, p.num),
          base: p.base,
          first: p.first,
          last: p.last,
          /* The day he was last named in a side. Offered as a leaving date
             only where the club has given none and only for somebody who has
             gone: it is not the same fact, so it is never written silently. */
          lastPlayed: p.lastPlayed || '',
          /* Whatever was recorded beside the status for this season, so the
             fields open with what is already there rather than blank. */
          detail: statusDetail(status, p.num, editSeason),
          photo: !!photoKeys[String(p.num)],
          added: added.some(function (a) { return a.num === p.num; }),
        };
      /* SURNAME, THEN FIRST NAME. A squad list is read the way a team sheet is
         written - Adio, Allen, Brabrook - and this sorted on the full name,
         which is the FIRST name, so the site's own list arrived here in one
         order and was shuffled into another. Both orders are alphabetical,
         which is why it never looked broken; it just was not the order a club
         reads a squad in. `last` is on every seeded player and on everyone
         added here, and the full name is the fallback for a record that has
         neither. */
      }).sort(function (a, b) {
        return String(a.last || a.name).localeCompare(String(b.last || b.name))
          || String(a.first || '').localeCompare(String(b.first || ''))
          || String(a.name).localeCompare(String(b.name));
      });

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
        if (atClub(p)) tally.squad = (tally.squad || 0) + 1;
        tally[p.tenure || '-'] = (tally[p.tenure || '-'] || 0) + 1;
        tally['s:' + p.status] = (tally['s:' + p.status] || 0) + 1;
        if (p.why && p.why.conflict) tally.flag = (tally.flag || 0) + 1;
        if (!p.photo) tally.nophoto = (tally.nophoto || 0) + 1;
      });
      /* First, because it is what the screen opens on and what the club is
         nearly always here for. */
      if (tally.squad) {
        groups.push({ id: 'squad', label: 'At the club', n: tally.squad });
      }
      groups.push({ id: 'all', label: 'Everyone', n: players.length });
      ['new', 'retained', 'returned'].forEach(function (k) {
        if (tally[k]) groups.push({ id: k, label: LABEL[k], n: tally[k] });
      });
      STATUSES.forEach(function (x) {
        if (tally['s:' + x.key]) groups.push({ id: 's:' + x.key, label: x.label, n: tally['s:' + x.key] });
      });
      /* The two lists worth acting on, last because they are jobs rather than
         facts. Photograph was a whole column saying Yes or None for everybody,
         which is a lot of table to answer "who is missing one". */
      if (tally.nophoto) {
        groups.push({ id: 'nophoto', label: 'Needs a photograph', n: tally.nophoto, warn: true });
      }
      if (tally.flag) {
        groups.push({ id: 'flag', label: 'Needs a signing date', n: tally.flag, warn: true });
      }
      /* A filter that no longer matches anybody - the last new signing was
         given a date, so the group is gone - falls back to everyone rather
         than showing an empty table with no pressed button to explain it. */
      if (!groups.some(function (g) { return g.id === showOnly; })) {
        showOnly = tally.squad ? 'squad' : 'all';
      }

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
            + '<p><b>' + esc(tally.squad || 0) + '</b> at the club in ' + esc(editSeason)
            + ', of ' + esc(players.length) + ' players the club has ever had. '
            + 'This list opens on the ' + esc(tally.squad || 0) + '; <b>Everyone</b> is one press '
            + 'away and nothing is hidden from the record. '
            + 'What somebody is is recorded <b>per season</b>, '
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
          /* FOUR COLUMNS, NOT SIX. `table()` wraps in `.scroll-x`, and the
             last column - which holds the only way to remove somebody - was
             the first thing off the right edge, exactly as the fixtures table
             was. Position and Photograph are facts ABOUT the player, so they
             belong in his cell rather than in columns of their own, and the
             two things this screen is actually for (what he is, and what the
             site works out) get the room. */
          body: table(['Player', 'In ' + editSeason, 'Worked out', ''],
            players.map(function (p) {
              var tags = ['all', atClub(p) ? 'squad' : '', p.tenure || '', 's:' + p.status,
                (p.why && p.why.conflict) ? 'flag' : '',
                p.photo ? '' : 'nophoto'].filter(Boolean).join(' ');
              var shown = (' ' + tags + ' ').indexOf(' ' + showOnly + ' ') > -1;
              return '<tr data-num="' + p.num + '" data-tags="' + esc(tags) + '"' +
                (shown ? '' : ' hidden') + '>' +
                '<td><b>' + esc(listName(p)) + '</b>' +
                  '<small class="cp-hint">' + esc(p.pos || 'Position worked out from where they have played') +
                    (p.photo ? '' : ' · no photograph') + '</small></td>' +
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
                  '<div class="cp-when" data-when>' + detailFields(p.status, p.detail || {}) + '</div>' +
                  /* The archive can say when he was last named in a side.
                     Offered only where he has gone and the club has said no
                     date, because it is a different fact and confirming it is
                     the club's to do. */
                  (GONE[p.status] && !(p.detail || {}).from && p.lastPlayed
                    ? '<small class="cp-flag">Last played ' + esc(U.fmtDate(p.lastPlayed)) +
                      '. <button class="btn btn--quiet btn--sm" data-use-last="' +
                      esc(p.lastPlayed) + '">Use that as the day he left</button></small>'
                    : '') +
                  /* THE RECORD AND THE ARCHIVE DISAGREE. A leaving date the
                     club has given always wins, because it is a statement
                     about a person rather than an inference - but when
                     somebody is named in a side AFTER the day he is recorded
                     as leaving, one of the two is wrong and only the club
                     knows which. Said plainly, and nothing is changed. */
                  (GONE[p.status] && (p.detail || {}).from && p.lastPlayed
                    && p.lastPlayed > (p.detail || {}).from
                    ? '<small class="cp-flag">The record says ' + esc(LABEL[p.status] || 'gone') +
                      ' on ' + esc(U.fmtDate(p.detail.from)) + ', and he was named in a side on ' +
                      esc(U.fmtDate(p.lastPlayed)) + '. One of the two is wrong.</small>'
                    : '')
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
                '<td><div class="cp-rowacts">' +
                  '<button class="btn btn--ghost btn--sm" data-edit-player>Edit</button>' +
                  '<a class="btn btn--quiet btn--sm" href="/players/' + esc(slug(p.name)) +
                    '.html" target="_blank" rel="noopener">View</a>' +
                  /* Removing an override would leave the baseline player
                     standing, so a Remove on one would be a button that
                     appears to work and changes nothing. Offered only for
                     somebody this panel actually signed. */
                  (p.base ? '' : '<button class="btn btn--danger btn--sm" data-del-player>Remove</button>') +
                '</div></td>' +
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
              var today = todayIso();
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
          sub: 'Everyone on the touchline, which is everyone the coaches page shows. '
            + 'A player moved into coaching appears here on his own.',
          actions: '<button class="btn btn--primary" data-add-staff>Add someone</button>',
          body: (allCoaches.length
            /* Sorted, because a table of names with no order is a table you
               have to read all of. Coaches carry a single `name` field and no
               `last`, so this orders on the final word rather than inventing a
               split: enough to make the list scannable, and it does not
               rewrite anybody's name to claim more certainty than that. */
            ? table(['Name', 'Role', ''], allCoaches.slice().sort(function (a, b) {
              var surname = function (x) {
                var bits = String(x.name || '').trim().split(/\s+/);
                return bits[bits.length - 1] || '';
              };
              return surname(a).localeCompare(surname(b))
                || String(a.name || '').localeCompare(String(b.name || ''));
            }).map(function (c) {
              return '<tr' + (c.base ? '' : ' data-staff="' + c.i + '"') +
                (c.base ? ' data-base="' + esc(c.rec.id || slug(c.rec.name)) + '"' : '') + '>' +
                '<td><b>' + esc(c.rec.name) + '</b>' +
                  (c.base ? '<small class="cp-hint">From the site’s own records</small>' : '') + '</td>' +
                '<td>' + esc(c.rec.role || 'Coach') + '</td>' +
                '<td><div class="cp-rowacts">' +
                  '<button class="btn btn--ghost btn--sm" data-edit-staff>Edit</button>' +
                  (c.base
                    ? ''
                    : '<button class="btn btn--danger btn--sm" data-del-staff>Remove</button>') +
                '</div></td>' +
              '</tr>';
            }).join(''))
            : empty('Nobody on the staff yet', 'Add the manager and anyone else on the touchline.')),
          where: [['Coaches', '/coaches.html']],
          whereNote: 'editing one of the founding staff writes an override; they cannot be removed '
            + 'from here because the site’s own records would still publish them',
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

        var prow = e.target.closest('tr[data-num]');
        if (prow && e.target.matches('[data-edit-player]')) {
          if (!guard()) return;
          var pnum = prow.getAttribute('data-num');
          playerForm(players.filter(function (x) { return String(x.num) === String(pnum); })[0]);
          return;
        }
        /* ONE PRESS TURNS THE ARCHIVE'S ANSWER INTO THE CLUB'S. The card
           reads "Last played in January 2026" where nobody has said when
           somebody left, which is true and is not a leaving date. Confirming
           it writes a real one and the card then says "Left in January
           2026". Never written on the club's behalf: they are different
           facts and only the club can say they are the same here. */
        if (prow && e.target.matches('[data-use-last]')) {
          if (!guard()) return;
          var lnum = prow.getAttribute('data-num');
          var lp = e.target.getAttribute('data-use-last');
          var lrow = players.filter(function (x) { return String(x.num) === String(lnum); })[0];
          confirmAction({
            title: 'Record ' + lrow.name + ' as leaving on ' + U.fmtDate(lp) + '?',
            body: 'That is the last day he was named in a side.',
            detail: 'It may not be the day he actually left, and once it is saved the site '
              + 'says "Left in ' + U.fmtDate(lp) + '" rather than "Last played in ' + U.fmtDate(lp)
              + '". Change it any time in the fields beside his status.',
            confirmLabel: 'Record it',
          }).then(function (yes) {
            if (!yes) return;
            var det = statusDetail(status, lrow.num, editSeason);
            var keep = {};
            Object.keys(det).forEach(function (k) { keep[k] = det[k]; });
            keep.from = lp;
            saveStatus(withStatus(status, lrow.num, editSeason, lrow.status, keep))
              .then(function () { toast('Recorded', 'success'); refresh('squad'); })
              .catch(function (e2) { toast(e2.message, 'error'); });
          });
          return;
        }

        if (e.target.matches('[data-add-trialist]')) { if (guard()) trialistForm(); return; }
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

        /* A founding coach carries an id and no index, because he is not in
           the database row yet. Saving him writes one with that id, which
           dataset.mjs merges over the base rather than beside it. */
        var brow = e.target.closest('tr[data-base]');
        if (brow && e.target.matches('[data-edit-staff]')) {
          if (!guard()) return;
          var bid = brow.getAttribute('data-base');
          var found = (SEED.coaches || []).filter(function (x) {
            return (x.id || slug(x.name)) === bid;
          })[0];
          if (found) staffForm(null, { id: bid, name: found.name, role: found.role || 'Coach', bio: found.bio || [] });
          return;
        }

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
      /* EDIT, NOT JUST ADD. There was no way to change an existing player at
         all: you could add one and, if the panel had added him, remove him.
         A misspelt name, a wrong position or a bio somebody wanted to redo
         needed a developer. The reason was in the data rather than the
         screen - the site CONCATENATED the code baseline with the panel's
         records, so an override produced two of the same man - and now that
         they merge by number, editing anybody is an override the same way a
         coach's is. */
      function playerForm(p) {
        var editing = p || null;
        var bio0 = editing
          ? ((SEED.squadBios || {})[String(editing.num)] || []).join('\n\n')
          : '';
        var back = modal(editing ? 'Edit ' + editing.name : 'Add a player',
          '<div class="grid grid--2">' +
            '<div class="field"><label class="field__label" for="p-first">First name</label>' +
              '<input class="input" id="p-first" autocomplete="off" value="' +
                esc(editing ? (editing.first || '') : '') + '"></div>' +
            '<div class="field"><label class="field__label" for="p-last">Surname</label>' +
              '<input class="input" id="p-last" autocomplete="off" value="' +
                esc(editing ? (editing.last || '') : '') + '"></div>' +
            '<div class="field"><label class="field__label" for="p-pos">Position</label>' +
              '<select class="select" id="p-pos">' +
                POSITIONS.map(function (x) {
                  return '<option' + (editing && editing.pos === x ? ' selected' : '') +
                    '>' + esc(x) + '</option>';
                }).join('') +
              '</select></div>' +
            (editing ? '' :
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
            /* THE ONE FIELD THAT WAS MISSING FROM THE ONE FORM THAT NEEDED IT.
               Adding a player never asked when he signed, so every player
               arrived with no date and somebody had to find the row again
               afterwards to add it - which nobody did, which is how three new
               signings came to be recorded as being at the club last season.
               The moment you add somebody is the moment you know. */
            '<div class="field"><label class="field__label" for="p-from">The day they signed</label>' +
              '<input class="input" id="p-from" type="date">' +
              '<small class="field__hint">Worth filling in. Without it the site works out ' +
                'their first season from old team sheets, and a team sheet records which ' +
                'slot somebody filled rather than who they are - so a slot used by a ' +
                'previous player makes a first season look like a second.</small></div>') +
          '</div>' +
          '<div class="field" style="margin-top:var(--space-4)">' +
            '<label class="field__label" for="p-bio">A line about them (optional)</label>' +
            '<textarea class="textarea" id="p-bio" rows="4" ' +
              'placeholder="Where they came from, what they bring. Shows on their profile.">' +
              esc(bio0) + '</textarea>' +
            '<small class="field__hint">Blank lines separate paragraphs.</small></div>' +
          '<p class="field__hint" style="margin-top:var(--space-3)">Their position is used until they '
            + 'have played: after that the site works it out from where they actually lined up.</p>');

        $('[data-save]', back).addEventListener('click', function () {
          var first = $('#p-first', back).value.trim();
          var last = $('#p-last', back).value.trim();
          var err = $('[data-err]', back);
          if (!first || !last) { err.textContent = 'A first name and a surname, please.'; err.hidden = false; return; }
          var bio = $('#p-bio', back).value;
          var num = editing ? editing.num : freeNumber(players);

          /* AN OVERRIDE STARTS FROM THE RECORD AS IT STANDS. The panel may
             already hold a row for this player carrying fields this form has
             never heard of; the site merges an override field by field over
             the baseline, so writing a bare object here would be lossless in
             the site and lossy in the panel's own record. */
          var prev = added.filter(function (a) { return String(a.num) === String(num); })[0] || {};
          var rec = {};
          Object.keys(prev).forEach(function (k) { rec[k] = prev[k]; });
          rec.num = num;
          rec.first = first;
          rec.last = last;
          rec.position = $('#p-pos', back).value;
          /* Paragraphs, the way the coaches form already splits them. An
             emptied box removes the bio rather than storing [''], which would
             print a blank paragraph on the profile. */
          var paras = bio.split(/\n{2,}/).map(function (x) { return x.trim(); }).filter(Boolean);
          if (paras.length) rec.bio = paras; else delete rec.bio;

          var nextAdded = added.filter(function (a) { return String(a.num) !== String(num); }).concat([rec]);
          err.hidden = true;

          var work = savePlayers(nextAdded);
          if (!editing) {
            var chosen = $('#p-status', back).value;
            var from = $('#p-from', back).value;
            var nextStatus = withStatus(status, num, editSeason, chosen, from ? { from: from } : null);
            work = work.then(function () { return saveStatus(nextStatus); });
          }
          work.then(function () {
            toast(editing
              ? first + ' ' + last + ' updated'
              : first + ' ' + last + ' added to the squad', 'success');
            back.remove();
            refresh('squad');
          }).catch(function (e2) { err.textContent = e2.message; err.hidden = false; });
        });
      }

      /* ---- Add a trialist ----
         This was `window.prompt('What is their name?')`: a raw browser dialog
         that cannot be styled, cannot be cancelled without losing what was
         typed, and asks for exactly one of the three things a trial has. The
         end date in particular was never asked for, and a trial with no end
         is a fortnight from two seasons ago sitting in every team-sheet
         dropdown for good, which is the one thing the trial window exists to
         prevent. Same modal as adding a player, so the two feel like one
         screen rather than two tools. */
      function trialistForm() {
        var back = modal('Add a trialist',
          '<div class="field"><label class="field__label" for="t-name">Their name</label>' +
            '<input class="input" id="t-name" autocomplete="off"></div>' +
          '<div class="grid grid--2" style="margin-top:var(--space-4)">' +
            '<div class="field"><label class="field__label" for="t-from">Trial starts</label>' +
              '<input class="input" id="t-from" type="date" value="' + esc(todayIso()) + '"></div>' +
            '<div class="field"><label class="field__label" for="t-until">Trial ends</label>' +
              '<input class="input" id="t-until" type="date">' +
              '<small class="field__hint">Leave it open if you do not know yet, but a trial ' +
                'with no end never closes: they stay pickable on every team sheet until ' +
                'somebody comes back and says otherwise.</small></div>' +
          '</div>' +
          '<p class="field__hint" style="margin-top:var(--space-3)">A trialist can be picked, ' +
            'can score and can be named in a report. They get no profile, no squad card and ' +
            'nothing in the club’s records until they sign.</p>');

        $('[data-save]', back).addEventListener('click', function () {
          var name = $('#t-name', back).value.trim();
          var err = $('[data-err]', back);
          if (!name) { err.textContent = 'A name, please.'; err.hidden = false; return; }
          var from = $('#t-from', back).value || todayIso();
          var until = $('#t-until', back).value;
          if (until && until < from) {
            err.textContent = 'The trial cannot end before it starts.';
            err.hidden = false;
            return;
          }
          err.hidden = true;
          /* From 900 up, so a trialist can never be mistaken for a squad
             member by any record that only stores the slot. */
          var used = {};
          trialists.forEach(function (t) { used[t.num] = true; });
          var num = 900;
          while (used[num]) num++;
          var rec = { num: num, name: name, added: todayIso(), from: from };
          if (until) rec.until = until;
          back.remove();
          saveTrialists(trialists.concat([rec]),
            name + ' can now be picked' + (until ? ' until ' + U.fmtDate(until) : '') + '.');
        });
      }

      /* ---- Add or edit staff ---- */
      /* `seed` is a founding coach being overridden for the first time: he is
         not in `staff` yet, so there is no index, and his id has to travel
         with the form or saving would create a second person rather than
         replacing him. */
      function staffForm(i, seed) {
        var c = seed || (i == null ? { name: '', role: 'Coach', bio: [] } : staff[i]);
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
