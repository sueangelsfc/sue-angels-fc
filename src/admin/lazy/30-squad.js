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
  var CURRENT = SEED.currentSeason || SEASONS[SEASONS.length - 1] || '';
  var LABEL = {};
  var PLAYING = {};
  STATUSES.forEach(function (x) { LABEL[x.key] = x.label; PLAYING[x.key] = x.playing; });
  DERIVED.forEach(function (x) { LABEL[x.key] = x.label; PLAYING[x.key] = true; });

  /* The season being edited. Everything on this screen is about this one
     season: the dropdown sets what somebody was IN IT, and the counts and
     the worked-out labels describe IT. It starts on the current season
     because that is what anybody opening the panel in August is here for. */
  var editSeason = CURRENT;

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
  function tenureIn(map, num, season) {
    var idx = SEASONS.indexOf(season);
    if (idx < 0) return null;
    var here = function (s) { return isPlaying(statusIn(map, num, s)); };
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
            + STATUSES.filter(function (x) { return counts[x.key]; })
              .map(function (x) { return '<b>' + esc(counts[x.key]) + '</b> ' + esc(x.label.toLowerCase()); })
              .join(', ') + '.'
            + ' Anyone not in the squad keeps their profile and their whole record; they move to '
            + '<b>Those who came before</b> rather than disappearing.</p>'
            + '<p class="cp-note"><b>New signing</b>, <b>retained</b> and <b>back at the club</b> are '
            + 'not in the list because the site works them out: it knows which seasons each player has '
            + 'been in the squad, so it can tell a first season from a second from a return, and it '
            + 'keeps doing so every year without anyone editing anything.</p>',
          actions: '<button class="btn btn--primary" data-add-player>Add a player</button>',
          body: table(['Player', 'Position', 'Photograph', 'In ' + editSeason, 'Worked out', ''],
            players.map(function (p) {
              return '<tr data-num="' + p.num + '">' +
                '<td><b>' + esc(p.name) + '</b></td>' +
                '<td>' + esc(p.pos || 'Worked out from where they have played') + '</td>' +
                '<td>' + (p.photo
                  ? '<span class="badge badge--success">Yes</span>'
                  : '<span class="badge badge--warning">None</span>') + '</td>' +
                '<td><select class="select" data-status aria-label="What ' + esc(p.name) +
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
                  '</td>' +
                /* The site's own answer, shown but never editable, so it is
                   obvious it is derived rather than something to maintain. */
                '<td>' + (p.tenure
                  ? '<span class="badge badge--neutral">' + esc(LABEL[p.tenure]) + '</span>'
                  : '<span class="cp-hint">Nothing to say</span>') + '</td>' +
                '<td>' + (p.added
                  ? '<button class="btn btn--quiet btn--sm" data-del-player>Remove</button> '
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
            ? table(['Name', 'Added', ''], trialists.map(function (t, i) {
              return '<tr data-trialist="' + i + '">' +
                '<td><b>' + esc(t.name) + '</b></td>' +
                '<td>' + esc(t.added || '') + '</td>' +
                '<td><button class="btn btn--quiet btn--sm" data-del-trialist>Remove</button></td>' +
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
                  '<button class="btn btn--quiet btn--sm" data-del-staff>Remove</button></td>' +
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
          saveTrialists(trialists.concat([{ num: num, name: name,
            added: new Date().toISOString().slice(0, 10) }]), name + ' can now be picked');
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
