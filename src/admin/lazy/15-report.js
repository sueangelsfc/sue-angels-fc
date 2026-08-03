/* ==========================================================================
   THE REPORT WRITER  ->  control-report.js

   Its own chunk, fetched the first time somebody presses Build the report and
   never by anybody who does not.

   It came out of `10-match.js`, which was carrying the fixtures panel, the
   results table AND the match dialog in one file at 17KB gzipped. This block
   was a self-contained lump of pure functions with exactly one caller, which
   made it the honest first extraction rather than the convenient one. It has
   no dependency on the dialog, the store or the DOM: hand it a description of
   a match and it returns prose.

   Two things it can do:

     compose(c)  writes the article in the browser from the facts recorded,
                 threading the coach's notes through as the story. Invents
                 nothing, always available, no key, no network.

     write(c)    asks /api/claude to write it properly, and falls back to
                 compose() the moment that is not available. The endpoint is
                 administrator-gated and inert until ANTHROPIC_API_KEY is set
                 in Vercel, so until somebody does that this behaves exactly
                 as it did before, and says which one it used either way.

   The club needs to know which wrote what it is reading, so the caller is
   told and the toast says so. A report that quietly changed character
   depending on an environment variable would be worse than either.
   ========================================================================== */
(function () {
  'use strict';

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

  /* ==========================================================================
     MAKING IT READ LIKE A DIFFERENT MATCH EACH TIME

     Two things made every report the same article with the nouns swapped.

     The skeleton never moved: result, shape, goals, the coach's notes, the
     tail, Player of the Match, in that order, whatever happened. And the
     coach's notes were pushed in as a block of their own, so what somebody
     actually SAW sat in a lump between the goals and the bookings instead of
     being part of the piece.

     Both are fixed below. The wording is chosen from the match itself rather
     than at random, so the same match always writes the same article - a
     report that changed every time you pressed the button would be worse, not
     better - but two different matches choose differently.

     WHAT THIS IS NOT. It arranges facts somebody recorded and sentences
     somebody wrote. It does not know what the game felt like, and it invents
     nothing: every clause traces to a field that was filled in. The coach's
     own sentences are the only opinion in it, which is why they are woven
     through rather than parked in a block.
     ========================================================================== */

  /* A number from the match, so the choices are stable for a given game and
     different across games. Not Math.random(): pressing Build twice must give
     the same article, or nobody can trust what they are reading. */
  function seedOf(c) {
    var t = String(c.date || '') + '|' + String(c.opp || '') + '|' + c.ourGoals + '-' + c.theirGoals;
    var n = 0;
    for (var i = 0; i < t.length; i++) n = (n * 31 + t.charCodeAt(i)) >>> 0;
    return n;
  }
  function pick(list, seed, salt) {
    return list[(seed + (salt || 0)) % list.length];
  }

  /* A note the coach typed, made into a sentence. Bullets arrive as they were
     typed: a leading dash, no capital, no full stop, sometimes a fragment. */
  function asSentence(t) {
    var x = String(t || '').trim().replace(/^[-*\u2022\u00b7]\s*/, '');
    if (!x) return '';
    x = x.charAt(0).toUpperCase() + x.slice(1);
    return /[.!?]$/.test(x) ? x : x + '.';
  }

  /* WHERE A NOTE BELONGS. A note naming a player goes beside that player's
     goal; one about the start of the game goes early; one about the end goes
     late. Anything else sits in the middle, which is where match reports put
     the run of play. */
  /* A NOTE THAT STARTS WITH A MINUTE IS AN INCIDENT, not a summary.

     This is the whole difference between a club report and a professional
     one, and it is not a difference in writing. A Premier League match report
     narrates fifteen or twenty moments - a save, a header wide, a free kick
     off the wall, the woodwork - because a journalist sat there and wrote
     each one down with the time. This record holds two goals, so no writer,
     model or template, can produce that piece from it.

     What it needs is somebody typing them. So a note beginning with a number
     is read as the minute it happened, and threaded into the run of play in
     order alongside the goals:

         12 - Shaw forced a fine save out of the keeper
         28 - Yoro headed wide at the back post
         64 - Mbeumo hit the bar

     No new field, no new screen: the same notes box, and a minute in front of
     anything you know the time of. */
  /* Escapes, not literals: the suite greps this file for an em dash and cannot
     tell one being ACCEPTED as a separator from one being written into copy.
     A coach typing "12 (em dash) Shaw forced a save" should still be understood. */
  var TIMED = /^\s*(\d{1,3})\s*(?:'|m|min|mins|minutes)?\s*[-\u2013\u2014:.)]?\s+(.*)$/;

  function placeNotes(bullets, names) {
    var early = [], late = [], byName = {}, middle = [], timed = [];
    (bullets || []).forEach(function (raw) {
      var stamped = String(raw || '').replace(/^\s*[-*\u2022\u00b7]\s*/, '').match(TIMED);
      if (stamped && Number(stamped[1]) <= 130 && stamped[2].trim().length > 3) {
        timed.push({ minute: Number(stamped[1]), text: asSentence(stamped[2]) });
        return;
      }
      var t = asSentence(raw);
      if (!t) return;
      var low = t.toLowerCase();
      /* Any part of the name will do, because that is how people write about
         each other: "Frazier was unplayable" for Frazier-Isaías Osunkoya,
         "Allen ran the midfield" for Andrew Allen. Matching only the first
         word missed both. Parts under four letters are skipped so "El" or a
         short surname does not swallow half the notes. */
      var who = names.filter(function (n) {
        return String(n).toLowerCase().split(/[\s-]+/).some(function (part) {
          return part.length >= 4 && low.indexOf(part) !== -1;
        });
      })[0];
      if (/\b(kick.?off|first (ten|fifteen|twenty)|from the start|early on|opening)\b/.test(low)) early.push(t);
      /* A sign-off belongs at the end, and "we would like to thank Pure
         Football for hosting and wish them well" was landing in the middle,
         so the report thanked the opposition and then carried on with a save
         count and a head-to-head. */
      else if (/\b(final|last (ten|fifteen|twenty)|closing|full.?time|late on|at the end)\b/.test(low)
        || /\b(thank|thanks to|wish them|wish him|good luck|all the best|best of luck|season ahead)\b/.test(low)) late.push(t);
      else if (who) { (byName[who] = byName[who] || []).push(t); }
      else middle.push(t);
    });
    timed.sort(function (a, b) { return a.minute - b.minute; });
    return { early: early, late: late, byName: byName, middle: middle, timed: timed };
  }

  function compose(c) {
    var paras = [];
    var seed = seedOf(c);
    var scorerNames = (c.goals || []).map(function (g) { return g.name; });

    /* A NOTE THAT IS AN INSTRUCTION IS NOT AN OBSERVATION. "Highlight
       individual and collective performance information gathered from the
       match data" is a brief to whoever is writing, and it was printed in the
       middle of the report as though somebody had said it about the game.
       Passed to the model, where it is a useful instruction; dropped here,
       where there is nobody to instruct. */
    var BRIEF = /^\s*(highlight|include|mention|add|write|make sure|ensure|focus on|talk about|cover)\b/i;
    var bullets = (c.bullets || []).filter(function (b) { return !BRIEF.test(b); });
    var notes = placeNotes(bullets, scorerNames.concat(c.motm ? [c.motm] : []));

    /* DID HE ALREADY SAY IT. The report announced the head-to-head under a
       note reading "Pure Football will also compete in our league", said "the
       first of six" under "1st friendly of 6", and thanked the hosts after he
       had. Repeating its own author is the clearest sign nothing is reading
       what it writes. */
    var wrote = bullets.join(' ').toLowerCase();
    var said = function (re) { return re.test(wrote); };
    var them = c.opp || 'the opposition';
    /* "away in Pre-season friendly" is a database field being read out. A
       competition is either a named one you play IN, or a kind of match you
       play: "in League Eight", but "in a pre-season friendly". */
    var comp = !c.competition ? ''
      : /friendly/i.test(c.competition) ? ' in a ' + c.competition.toLowerCase()
        : ' in ' + c.competition;
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
      var where = (c.home ? ' at home' : ' away') + comp
        + (c.date ? ' on ' + c.date : '') + (c.venue ? ', at ' + c.venue : '');
      /* Three ways into the same fact, chosen by the match rather than at
         random, so the club's reports do not all open with the same clause. */
      var openings = [
        c.us + ' ' + verb + ' ' + them + ' ' + c.ourGoals + '-' + c.theirGoals + where + ', ' + colour + '.',
        colour.charAt(0).toUpperCase() + colour.slice(1) + where + ', ' + c.us + ' ' + verb + ' '
          + them + ' ' + c.ourGoals + '-' + c.theirGoals + '.',
        c.ourGoals + '-' + c.theirGoals + where + '. ' + c.us + ' ' + verb + ' ' + them
          + ', and it was ' + colour + '.',
      ];
      paras.push(pick(openings, seed));
    }

    /* What the coach said about the start of it, next: that is where a report
       sets the scene, and it is his sentence rather than a manufactured one. */
    if (notes.early.length) paras.push(notes.early.join(' '));

    /* ---- The shape ---- */
    if (c.formation || c.xi || c.captain) {
      var shape = c.formation ? c.us + ' lined up in a ' + c.formation + '.'
        : c.xi >= 11 ? ''
          : c.xi ? 'The team sheet names ' + say(c.xi) + ' of the starting eleven.' : '';
      var line = (shape + (c.captain ? ' ' + c.captain + ' wore the armband.' : '')).trim();
      if (line) paras.push(line);
      /* And what anybody was asked to do, where somebody said. Only the roles
         actually set, because a list of eleven default instructions is not
         information. */
      if (c.roles && c.roles.length) {
        /* GROUPED BY THE JOB, not listed by the man. Six clauses each reading
           "X played as a Y" is a table being read aloud, and it was: two
           overlapping full backs and two ball-playing centre backs came out as
           four separate sentences that happened to end the same way. */
        var byRole = {};
        c.roles.forEach(function (r) { (byRole[r.role] = byRole[r.role] || []).push(r.name); });
        var jobs = Object.keys(byRole).map(function (role) {
          var who = byRole[role];
          var one = who.length === 1;
          var word = role.toLowerCase();
          return listOf(who) + (one ? ' played as ' + (/^[aeiou]/i.test(word) ? 'an ' : 'a ') + word
            : ' played as ' + word + 's');
        });
        paras.push(jobs.join(', ').replace(/, ([^,]*)$/, ' and $1') + '.');
      }
    }

    /* ---- The goals, in the order they went in where that is recorded ----
       Each goal is a sentence and the openings rotate, because four goals all
       beginning "X added a" is the sound of a machine writing. Nothing is
       invented: every clause here is a field somebody filled in. */
    var timed = c.goals.filter(function (g) { return g.minute != null && g.minute !== ''; })
      .sort(function (a, b) { return a.minute - b.minute; });
    var untimed = c.goals.filter(function (g) { return g.minute == null || g.minute === ''; });
    /* Reassigned by the run-of-play branch below once it has told them. */

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

    /* ONE CLOCK. A goal on 53 minutes and a save on 48 belong in that order,
       and a report that lists every goal and then every other incident is not
       narrating a match, it is reading two columns of a table. Split at half
       time where there is enough to split, because that is how the game was
       played and how every report of one is laid out. */
    if (notes.timed.length) {
      var events = notes.timed.map(function (t) {
        return { minute: t.minute, text: t.text, goal: false };
      });
      var scored = 0;
      timed.forEach(function (g, i) {
        scored++;
        events.push({ minute: Number(g.minute), goal: true,
          text: lead(g, scored, i === 0) + atMin(g.minute) + howScored(g) + madeBy(g) + '.' });
      });
      events.sort(function (a, b) { return a.minute - b.minute; });
      var halves = [
        { head: '', list: events.filter(function (e) { return e.minute <= 45; }) },
        { head: '', list: events.filter(function (e) { return e.minute > 45; }) },
      ];
      halves.forEach(function (half) {
        for (var q = 0; q < half.list.length; q += 3) {
          paras.push(half.list.slice(q, q + 3).map(function (e) { return e.text; }).join(' '));
        }
      });
      /* Anything with no minute still has to be told, but as one sentence
         rather than a paragraph each: three untimed goals came out as three
         one-line paragraphs saying "X also scored". */
      if (untimed.length) {
        paras.push((events.length ? 'Also on the scoresheet: ' : 'On the scoresheet: ')
          + listOf(untimed.map(function (g) {
            var extra = (howScored(g) + madeBy(g)).trim();
            return g.name + (extra ? ' (' + extra.replace(/^, /, '') + ')' : '');
          })) + '.');
        untimed = [];
      }
    } else if (timed.length) {
      var running = 0;
      var sentences = timed.map(function (g, i) {
        running++;
        return lead(g, running, i === 0) + atMin(g.minute) + howScored(g) + madeBy(g) + '.';
      });
      /* Broken into paragraphs of two, so a five-goal game does not arrive as
         one block a reader has to hack their way through. */
      for (var i = 0; i < sentences.length; i += 2) {
        var block = sentences.slice(i, i + 2);
        /* Anything the coach wrote about one of these scorers joins the
           sentence about his goal, instead of turning up four paragraphs
           later with no idea what it is referring to. */
        timed.slice(i, i + 2).forEach(function (g) {
          if (notes.byName[g.name]) {
            block = block.concat(notes.byName[g.name]);
            delete notes.byName[g.name];
          }
        });
        paras.push(block.join(' '));
      }
    }
    if (untimed.length) {
      var others = untimed.map(function (g) {
        var extra = (howScored(g) + madeBy(g)).trim();
        return g.name + (extra ? ' (' + extra.replace(/^, /, '') + ')' : '');
      });
      /* It used to add "The team sheet does not say what minute those went
         in", which is a remark about the paperwork in the middle of a report
         about a football match. The absence of a minute is already visible in
         the absence of a minute. */
      paras.push((timed.length ? 'Also on the scoresheet: ' : 'On the scoresheet: ')
        + listOf(others) + '.');
    }

    /* WHO THEY ARE, beside what they just did. A reader has been told two
       names and nothing about either; this is the sentence a person would
       write next. Every clause is a stored figure. */
    if (c.players && c.players.length) paras.push(c.players.join(' '));

    /* ---- The rest of what the coach said ----
       Whatever did not attach to a goal or to the start or the end: the run of
       play, which is where a report puts it. Anything still keyed to a name
       goes here too, so nothing typed is ever silently dropped. */
    Object.keys(notes.byName).forEach(function (n) {
      notes.middle = notes.middle.concat(notes.byName[n]);
    });
    if (notes.middle.length) {
      for (var b = 0; b < notes.middle.length; b += 2) {
        paras.push(notes.middle.slice(b, b + 2).join(' '));
      }
    }

    /* ---- Keeping and discipline ---- */
    var tail = [];
    if (c.cleanSheet.length) {
      if (!said(/clean sheet|shut ?out|kept them out|conceded nothing/i)) {
        tail.push(listOf(c.cleanSheet) + ' kept a clean sheet.');
      }
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

    /* ---- What the clubs have done to each other before ----
       The thing a person writing this would reach for and no tab on the form
       holds. Counted from the club's own match list, so it agrees with the
       results page by construction rather than by somebody remembering.

       AND NOT IF THE COACH ALREADY SAID IT. He wrote "Pure Football will also
       be in our league this season" and the report then announced the
       head-to-head as though nobody had mentioned them, said "the first of
       six" under a note reading "1st friendly of 6", and thanked the hosts
       after he had. A report that repeats its own author is the clearest tell
       that nothing is reading it. */
    if (c.h2h && c.h2h.played && !said(/met|record against|played them|beaten them|last time/i)) {
      var h = c.h2h;
      var run = h.played === h.won ? (h.played === 1 ? 'a win' : h.played + ' meetings and ' + h.played + ' wins')
        : h.played + ' played, ' + h.won + ' won'
          + (h.drawn ? ', ' + h.drawn + ' drawn' : '')
          + (h.lost ? ', ' + h.lost + ' lost' : '');
      var last = h.meetings.slice(-2).map(function (mt) {
        return (mt.walkover ? 'awarded' : mt.us + '-' + mt.them)
          + ' ' + (mt.home ? 'at home' : 'away') + ' in ' + String(mt.date).replace(/^\d+\s+/, '');
      });
      paras.push('The clubs have met before: ' + run + ', '
        + h.gf + ' scored and ' + h.ga + ' conceded'
        + (last.length ? '. The last ' + (last.length === 1 ? 'one finished ' : 'two finished ')
          + listOf(last) : '') + '.');
    }

    /* Where this one sits in pre-season, which is the difference between a
       result and a run of them. Only said when there is a run: "the first of
       one" is not a fact worth printing. */
    if (c.motm && !said(/player of the match|man of the match|motm/i)) {
      paras.push(pick([
        c.motm + ' was named Player of the Match.',
        'Player of the Match: ' + c.motm + '.',
        c.motm + ' took the Player of the Match award.',
      ], seed, 3));
    }

    /* LAST, because it is where a report ends: what he said about the end of
       the game, or how he signed off. It used to sit in the middle, so the
       piece thanked the opposition and then carried on with the goalkeeper's
       save count and a head-to-head. */
    if (notes.late.length) paras.push(notes.late.join(' '));

    /* ==========================================================================
       MATCH DETAILS

       Every professional match report ends with this block and this one never
       had it: the line-up with who came on and when, the goals with their
       minutes, the bookings. All of it is already on the form and none of it
       was reaching the page, so a reader who wanted to know who played had
       nowhere to look.

       Written from the team sheet, so it is complete or it is honest about
       not being. Nothing is padded to eleven. */
    var details = [];
    if ((c.lineup || []).length) {
      details.push('Line-up: ' + c.lineup.map(function (p) {
        return p.name + (p.offFor ? ' (' + p.offFor + (p.offAt ? ' ' + p.offAt : '') + ')' : '');
      }).join(', ') + '.');
    }
    if ((c.unused || []).length) details.push('Substitutes not used: ' + c.unused.join(', ') + '.');
    if (c.goals && c.goals.length) {
      details.push('Goals: ' + c.goals.map(function (g) {
        return g.name + (g.minute ? ' ' + g.minute : '')
          + (g.situation === 'penalty' ? ' (pen)' : '');
      }).join(', ') + '.');
    }
    if ((c.yellows || []).length) details.push('Booked: ' + c.yellows.join(', ') + '.');
    if ((c.reds || []).length) details.push('Sent off: ' + c.reds.join(', ') + '.');
    if (details.length) paras.push('MATCH DETAILS\n' + details.join('\n'));

    return paras.join('\n\n');
  }

  /* First to third were missing because the only caller counted goals and
     never asked below four: a fourth goal is "the fourth", a first is "the
     opener". Asked for the first of six friendlies it answered "the 1th". */
  var ORDINALS = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth',
    'seventh', 'eighth', 'ninth', 'tenth'];
  function ordinal(n) { return ORDINALS[n] || n + 'th'; }

  /* ==========================================================================
     WHAT THE CLUB KNOWS THAT THE FORM DOES NOT

     Two facts a person writing this report would reach for and no tab on the
     dialog holds: how the club has done against this opponent before, and
     where this match sits in a run of pre-season friendlies. Both are in the
     match list the panel already ships, so neither is a question for anybody.

     Derived here rather than in the dialog, so the dialog keeps shrinking and
     the knowledge sits next to the prose that uses it.
     ========================================================================== */

  /* Club names are typed by hand and arrive with FC, AFC, 2.0 and stray
     punctuation attached. Compared on a folded form so "Pure Football FC 2.0"
     and "Pure Football" are one club, which is the whole point of a
     head-to-head. */
  function fold(name) {
    return String(name || '').toLowerCase()
      .replace(/[’']/g, '')
      .replace(/\b(fc|afc|cf|2\.0)\b/g, '')
      .replace(/[^a-z0-9]+/g, '');
  }
  var isUs = function (n) { return /suesangels|sueangels/.test(fold(n)); };

  /* "02 Aug 2026" and "09 Nov 25" are both in the record, and the key carries
     the date too. Sorting and comparing need one form. */
  function isoOf(m) {
    var k = String(m.id || '').match(/^[a-z](\d{4})(\d{2})(\d{2})/);
    if (k) return k[1] + '-' + k[2] + '-' + k[3];
    var d = String(m.date || '').match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{2,4})$/);
    if (!d) return '';
    var MON = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    var mo = MON[d[2].toLowerCase()];
    if (!mo) return '';
    var y = d[3].length === 2 ? '20' + d[3] : d[3];
    return y + '-' + mo + '-' + String(d[1]).padStart(2, '0');
  }

  var isFriendly = function (m) { return /friendly|friendlies/i.test(String(m.competition || '')); };

  /* EVERY PREVIOUS MEETING WITH THIS CLUB, up to but not including this one.
     Walkovers are counted as played and carry no goals, exactly as the site
     counts them, because a head-to-head that quietly scored them 3-0 would
     disagree with every other figure the club publishes. */
  function headToHead(all, oppName, thisIso, thisId) {
    var want = fold(oppName);
    if (!want) return null;
    var met = (all || []).filter(function (m) {
      if (m.id === thisId) return false;
      if (fold(m.home) !== want && fold(m.away) !== want) return false;
      if (!isUs(m.home) && !isUs(m.away)) return false;
      var iso = isoOf(m);
      return iso && (!thisIso || iso < thisIso);
    }).sort(function (a, b) { return isoOf(a).localeCompare(isoOf(b)); });

    if (!met.length) return null;
    var out = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, meetings: [] };
    met.forEach(function (m) {
      var home = isUs(m.home);
      var ours = home ? Number(m.hs) : Number(m.as);
      var theirs = home ? Number(m.as) : Number(m.hs);
      var scored = isFinite(ours) && isFinite(theirs) && m.kind !== 'walkover';
      out.played++;
      if (m.kind === 'walkover') {
        var oursWO = (m.wo === 'H-W') === home;
        if (oursWO) out.won++; else out.lost++;
      } else if (scored) {
        out.gf += ours; out.ga += theirs;
        if (ours > theirs) out.won++;
        else if (ours === theirs) out.drawn++;
        else out.lost++;
      }
      out.meetings.push({
        date: m.date || '', home: home, competition: m.competition || '',
        us: scored ? ours : null, them: scored ? theirs : null,
        walkover: m.kind === 'walkover',
      });
    });
    return out;
  }

  /* WHERE THIS ONE SITS IN PRE-SEASON. Counted over played friendlies AND
     arranged ones, because on 2 August the club had played one of six and
     five of them were still fixtures. Counting only what has been played
     would have called it "the first of one". */
  function friendlyOrder(all, fixtures, thisIso, thisId, thisComp) {
    if (!/friendly|friendlies/i.test(String(thisComp || ''))) return null;
    var season = function (iso) {
      if (!iso) return '';
      var y = Number(iso.slice(0, 4));
      var m = Number(iso.slice(5, 7));
      var s = m >= 7 ? y : y - 1;
      return String(s).slice(2) + '/' + String(s + 1).slice(2);
    };
    var mine = season(thisIso);
    if (!mine) return null;
    var pool = (all || []).concat(fixtures || [])
      .filter(isFriendly)
      .map(function (m) { return { id: m.id, iso: isoOf(m) }; })
      .filter(function (m) { return m.iso && season(m.iso) === mine; });
    /* A result and the fixture it came from are the same match under two ids
       (r2026… / f2026…). Counted twice this said "the first of seven". */
    var seen = {};
    pool = pool.filter(function (m) {
      var k = m.iso + '|' + String(m.id).replace(/^[a-z]/, '');
      if (seen[k]) return false;
      seen[k] = 1; return true;
    }).sort(function (a, b) { return a.iso.localeCompare(b.iso); });
    if (pool.length < 2) return null;
    var at = pool.map(function (m) { return m.id; }).indexOf(thisId);
    if (at < 0) at = pool.filter(function (m) { return m.iso < thisIso; }).length;
    return { nth: at + 1, of: pool.length };
  }

  /* ==========================================================================
     WHO THESE PLAYERS ACTUALLY ARE

     Every report described eleven interchangeable men, because a name was all
     the writer had. It could not tell that one of Sunday's scorers had never
     played a competitive game for the club and that the goalkeeper behind him
     kept thirteen clean sheets winning the league. That is the difference
     between a report and a scoreline with adjectives on it.

     Counted from `SEED.history`, which is the competitive record every page
     publishes, so a report cannot claim a total the stats page disagrees
     with. Every clause below traces to a stored figure: nothing here is an
     impression of a player.
     ========================================================================== */
  var NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
    'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
    'seventeen', 'eighteen', 'nineteen', 'twenty'];
  var num = function (n) { return NUM[n] || String(n); };

  function playerNotes(c, history) {
    if (!history) return [];
    /* GROUPED BY WHAT IS TRUE, not listed by the man it is true of. Both of
       Sunday's scorers were new, so the report said "Ade Owolona had not
       started a competitive match for the club before this one" and then said
       exactly the same thing about Leon Burnett. Two names, one fact. */
    var order = [];
    var byClause = {};
    var seen = {};
    var add = function (name, clause) {
      if (!name || seen[name] || !clause) return;
      seen[name] = 1;
      if (!byClause[clause]) { byClause[clause] = []; order.push(clause); }
      byClause[clause].push(name);
    };
    var h = function (n) { return history[String(n)] || history[n] || {}; };

    /* THE SCORERS FIRST, because that is who a reader has just been told
       about and who they want to know something about. */
    (c.goals || []).forEach(function (g) {
      if (!g.num && g.num !== 0) return;
      var r = h(g.num);
      var starts = r.a || 0;
      var goals = r.g || 0;
      if (!starts && !goals) {
        add(g.name, 'NEW');
      } else if (!goals) {
        add(g.name, 'FIRSTGOAL:' + starts);
      } else {
        add(g.name, 'TALLY:' + goals + ':' + starts);
      }
    });

    /* The goalkeeper, where a clean sheet or a save count made him part of
       the story rather than a name on the sheet. */
    if (c.keeperNum != null && ((c.cleanSheet || []).length || c.saves)) {
      var k = h(c.keeperNum);
      if (k.cs) add(c.keeper, 'KEEPER:' + k.cs);
    }

    /* And the captain, where he has actually done it before. Twenty-two times
       is a fact about a side; once is not worth a sentence. */
    if (c.captainNum != null) {
      var cap = h(c.captainNum);
      if (cap.c && cap.c >= 5) add(c.captain, 'CAPTAIN:' + cap.c);
    }

    /* Rendered last, once the names are gathered, so the verb agrees with how
       many of them there turned out to be. */
    return order.map(function (clause) {
      var who = byClause[clause];
      var many = who.length > 1;
      var they = listOf(who);
      var bits = clause.split(':');
      if (bits[0] === 'NEW') {
        return (many ? 'Neither ' + who.join(' nor ') + ' had' : they + ' had')
          + ' started a competitive match for the club before this one.';
      }
      if (bits[0] === 'FIRSTGOAL') {
        var st = Number(bits[1]);
        return 'A first goal for ' + they + ', in ' + num(st) + ' start' + (st === 1 ? '' : 's')
          + ' for the club.';
      }
      if (bits[0] === 'TALLY') {
        var gl = Number(bits[1]), st2 = Number(bits[2]);
        return they + ' now ' + (many ? 'have' : 'has') + ' ' + num(gl) + ' goal'
          + (gl === 1 ? '' : 's') + ' in ' + num(st2) + ' start' + (st2 === 1 ? '' : 's')
          + ' for the club.';
      }
      if (bits[0] === 'KEEPER') {
        var cs = Number(bits[1]);
        return they + ' has kept ' + num(cs) + ' clean sheet' + (cs === 1 ? '' : 's') + ' for the club.';
      }
      var caps = Number(bits[1]);
      return they + ' has captained the side ' + num(caps) + ' times.';
    });
  }

  function context(all, fixtures, c, history) {
    var iso = c && c.iso ? c.iso : '';
    return {
      h2h: headToHead(all, c && c.opp, iso, c && c.id),
      friendlyOf: friendlyOrder(all, fixtures, iso, c && c.id, c && c.competition),
      players: playerNotes(c || {}, history || null),
    };
  }

  /* ==========================================================================
     ASKING FOR IT TO BE WRITTEN PROPERLY

     compose() arranges. It cannot read "dustying off some rest" and know that
     somebody meant rust, and it cannot turn "new faces, a mixture of
     trialists, new signings and a few of the boys from last year" into a
     sentence: it prints the note as typed, capitalised, with a full stop.

     So the notes and the facts go to a model, with the club's own house rules
     attached, and what comes back is offered for editing like anything else.
     Every fact in the prompt is one the panel holds. It is asked not to add
     any, and what it returns lands in a textarea somebody reads before it is
     saved, which is the actual safeguard.

     FALLS BACK RATHER THAN FAILS. No key, no session, no network, a 500: all
     of them end at compose(), which needs none of those things. The button
     has never been able to do nothing and it still cannot.
     ========================================================================== */
  var HOUSE = [
    'You are a football writer filing a match report for Sue’s Angels FC, a London',
    'men’s Sunday-league club. Write to the standard of a professional club-site',
    'report: a journalist who watched the game and is telling somebody who did not.',
    '',
    'STRUCTURE',
    '- Open with the result and what it meant, in two or three sentences.',
    '- Then narrate the game in the order it happened, using the timed moments',
    '  below. Give each one a sentence. Do not group all the goals together and',
    '  then all the other incidents: a save on 48 comes before a goal on 53.',
    '- Where there are moments in both halves, break the narrative with a first',
    '  half and second half heading in CAPITALS on its own line.',
    '- Finish on the game, then reproduce the MATCH DETAILS block verbatim at the',
    '  very end, exactly as given, under a line reading MATCH DETAILS.',
    '',
    'VOICE',
    '- British spelling. No em dashes. No emoji. No exclamation marks.',
    '- "League Ten" or "League Eight", never "Division".',
    '- Understate it. A real number instead of an adjective. Never "incredible",',
    '  "unbelievable", "historic", "clinical", "dominant" or "showcasing".',
    '- Name players. A report about eleven interchangeable men is not a report.',
    '  Use the player records below to say who somebody is when it matters.',
    '- Do not write a summary paragraph that repeats what you have just narrated.',
    '',
    'ABSOLUTE',
    '- Invent NOTHING. Every incident you narrate must be in the notes below. You',
    '  may not add a save, a chance, a booking, a substitution or a moment of',
    '  pressure that is not recorded. If the record is thin, the report is short.',
    '  A short honest report is the correct output; a padded one is a failure.',
    '- Do not name a player who is not named below.',
    '- Do not mention sepsis or the club’s cause. This is a football report.',
    '- Do not repeat a fact the coach has already stated in his own notes.',
  ].join('\n');

  function factSheet(c) {
    var L = [];
    var say = function (k, v) { if (v || v === 0) L.push(k + ': ' + v); };
    say('Our club', c.us);
    say('Opponent', c.opp);
    say('Competition', c.competition);
    say('Date', c.date);
    say('Venue', c.venue);
    say('Home or away', c.home ? 'home' : 'away');
    if (c.kind === 'walkover') say('Result', 'awarded as a walkover, ' + (c.woUs ? 'to us' : 'against us') + ', no goals recorded');
    else if (c.kind === 'penalty') say('Result', c.ourGoals + '-' + c.theirGoals + ' after normal time, decided on penalties, the shootout result is not recorded');
    else if (c.ourGoals != null) say('Result', 'we scored ' + c.ourGoals + ', they scored ' + c.theirGoals);
    say('Formation', c.formation);
    say('Captain', c.captain);
    say('Player of the Match', c.motm);
    (c.goals || []).forEach(function (g, i) {
      var bits = [g.name];
      if (g.minute) bits.push(g.minute + ' minutes');
      if (g.bodyPart) bits.push(g.bodyPart + ' foot/head as recorded: ' + g.bodyPart);
      if (g.zone) bits.push('from ' + g.zone);
      if (g.situation && g.situation !== 'open') bits.push(g.situation);
      if (g.assist && g.assist.name) bits.push('assisted by ' + g.assist.name + ' (' + (g.assist.type || 'pass') + ')');
      L.push('Goal ' + (i + 1) + ': ' + bits.join(', '));
    });
    if (c.saves) say('Goalkeeper saves', (c.keeper || 'the goalkeeper') + ', ' + c.saves);
    if ((c.cleanSheet || []).length) say('Clean sheet', c.cleanSheet.join(', '));
    if ((c.yellows || []).length) say('Booked', c.yellows.join(', '));
    if ((c.reds || []).length) say('Sent off', c.reds.join(', '));
    (c.roles || []).forEach(function (r) { L.push('Role: ' + r.name + ' played as ' + r.role); });

    if (c.h2h) {
      var h = c.h2h;
      L.push('Record against them before today: played ' + h.played + ', won ' + h.won
        + ', drawn ' + h.drawn + ', lost ' + h.lost + ', scored ' + h.gf + ', conceded ' + h.ga + '.');
      h.meetings.forEach(function (m) {
        L.push('  Previous meeting: ' + m.date + ', ' + (m.home ? 'home' : 'away') + ', '
          + m.competition + ', ' + (m.walkover ? 'awarded as a walkover' : m.us + '-' + m.them) + '.');
      });
    }
    if (c.friendlyOf) {
      L.push('This is friendly ' + c.friendlyOf.nth + ' of ' + c.friendlyOf.of + ' arranged for pre-season.');
    }
    /* The club's record on the men who played. This is what lets a report say
       something about a player rather than only about a scoreline, and it is
       the same competitive record every page publishes. */
    (c.players || []).forEach(function (line) { L.push('Player record: ' + line); });
    /* The team sheet, handed over ready to print rather than as a table for
       the model to reformat and get wrong. */
    if ((c.lineup || []).length) {
      L.push('MATCH DETAILS BLOCK, reproduce this verbatim at the end:');
      L.push('Line-up: ' + c.lineup.map(function (p) {
        return p.name + (p.offFor ? ' (' + p.offFor + (p.offAt ? ' ' + p.offAt : '') + ')' : '');
      }).join(', ') + '.');
      if ((c.unused || []).length) L.push('Substitutes not used: ' + c.unused.join(', ') + '.');
      if (c.goals && c.goals.length) {
        L.push('Goals: ' + c.goals.map(function (g) {
          return g.name + (g.minute ? ' ' + g.minute : '') + (g.situation === 'penalty' ? ' (pen)' : '');
        }).join(', ') + '.');
      }
      if ((c.yellows || []).length) L.push('Booked: ' + c.yellows.join(', ') + '.');
    }
    return L.join('\n');
  }

  function prompt(c) {
    return HOUSE + '\n\nThe facts, all of them recorded by the club:\n' + factSheet(c)
      + '\n\nWhat the coach saw, in his own words. These are the only opinions in the\n'
      + 'piece and they are what the report is for. Correct obvious typing slips and\n'
      + 'work each one in where it belongs:\n'
      + (c.bullets || []).map(function (b) { return '- ' + b; }).join('\n')
      + '\n\nA note beginning with a number is the MINUTE that moment happened. Narrate\n'
      + 'those in clock order alongside the goals, one sentence each.\n\nWrite the report.';
  }

  function write(c, opts) {
    var o = opts || {};
    var fallback = function (why) {
      return { text: compose(c), source: 'composed', note: why };
    };
    if (!o.token) return Promise.resolve(fallback('not signed in'));
    var body = prompt(c);
    if (body.length > 8000) return Promise.resolve(fallback('too much to send'));
    return fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + o.token },
      body: JSON.stringify({ prompt: body }),
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (r.ok && j && j.completion && j.completion.trim().length > 200) {
          return { text: house(j.completion.trim()), source: 'written', model: j.model };
        }
        /* The one worth naming, because it is the only one somebody can act
           on and the message from the server says exactly what to do. */
        if (r.status === 500 && /ANTHROPIC_API_KEY/.test((j && j.error) || '')) {
          return fallback('no writing key set on the server');
        }
        return fallback((j && j.error) || ('the server answered ' + r.status));
      });
    }).catch(function () { return fallback('could not reach the server'); });
  }

  /* House typography, the same rules src/lib/prose.mjs applies at the build
     boundary. Applied here as well because prose arriving from anywhere else
     is exactly what that file exists to catch, and a model writes an em dash
     the moment it stops being told not to. */
  function house(t) {
    var s = String(t || '');
    /* The em dash is written as an escape on purpose: the suite greps this
       file for the literal character, and it cannot tell a regex that removes
       one from copy that contains one. */
    s = s.replace(/(\d)\s*[\u2014\u2013]\s*(\d)/g, '$1–$2');
    s = s.replace(/\s*\u2014\s*/g, ' – ');
    s = s.replace(/([A-Za-z])'([A-Za-z])/g, '$1’$2');
    s = s.replace(/\bDivision (Ten|Eight|Nine|Seven)\b/g, 'League $1');
    return s.trim();
  }

  window.CPR = {
    compose: compose,
    write: write,
    context: context,
    /* Exported for the suite, which asserts the head-to-head against the
       club's own published figures rather than trusting this file. */
    _headToHead: headToHead,
    _friendlyOrder: friendlyOrder,
  };
}());
