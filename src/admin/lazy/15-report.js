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
    /* EVERY MAN WHO PLAYED, not only the ones who scored.

       A note naming a player was matched against the scorers and the Player
       of the Match and nobody else, so this:

         "Jeev impressed in the first half, Stewart was given the armband and
          looked rusty, Harry brought that engine in the middle"

       - which is the best material in a coach's notes and the part a reader
       actually wants - matched nothing and fell into the undifferentiated
       middle. The eleven who played are all on the team sheet. */
    var everyone = scorerNames
      .concat(c.motm ? [c.motm] : [])
      .concat((c.lineup || []).map(function (p) { return p.name; }))
      .concat(c.keeper ? [c.keeper] : [])
      .concat(c.captain ? [c.captain] : []);
    var notes = placeNotes(bullets, everyone);

    /* DID HE ALREADY SAY IT. The report announced the head-to-head under a
       note reading "Pure Football will also compete in our league", said "the
       first of six" under "1st friendly of 6", and thanked the hosts after he
       had. Repeating its own author is the clearest sign nothing is reading
       what it writes. */
    var wrote = bullets.join(' ').toLowerCase();
    var said = function (re) { return re.test(wrote); };

    /* HE HAS EITHER TAKEN NOTES OR WRITTEN THE REPORT, and those need
       different treatment.

       Handed paragraphs, this used to shuffle them in between its own
       template sentences, so the piece announced the score, then his
       paragraph announced the score, then a closing line announced it a third
       time. Two documents interleaved, which is what it read like.

       A written paragraph is prose: several sentences, properly punctuated,
       nothing like a note. When most of what arrives looks like that, the
       coach has written the report and this has one job left - be the sub
       editor. Add the details block, add the facts he did not cover, and stop
       writing sentences over the top of his. */
    var isProse = function (t) {
      return t.length > 120 && (t.match(/[.!?]\s/g) || []).length >= 1;
    };
    var proseCount = bullets.filter(isProse).length;
    var drafted = bullets.length > 0 && proseCount >= Math.max(2, Math.ceil(bullets.length / 2));

    /* WHOSE PARAGRAPH IS WHOSE. In drafted mode his writing leads and the
       derived material follows it, because he has written the report and this
       is adding to it. Marked at the point each one is pushed rather than
       guessed at afterwards by matching text. */
    var mine = {};
    var his = function (t) { mine[paras.length] = 1; paras.push(t); };
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
      /* Not if he opened it himself. His first paragraph said "Sue's Angels
         secured a 2-0 victory against Pure Football" directly under this one
         saying the same thing in different words. */
      if (!(drafted && said(/\b\d\s*[-–]\s*\d\b|victory|beat |won |defeat|lost to/i))) {
        paras.push(pick(openings, seed));
      }
    }

    /* What the coach said about the start of it, next: that is where a report
       sets the scene, and it is his sentence rather than a manufactured one. */
    if (notes.early.length) his(notes.early.join(' '));

    /* ---- The shape ----
       Skipped entirely when he has written the report: the shape and the
       captain are both in MATCH DETAILS, and suppressing the opening left
       "Stewart Luwawa wore the armband" as the first line of the piece. */
    if (!drafted && (c.formation || c.xi || c.captain)) {
      /* Once, and not at all if he mentioned the shape himself. It printed
         "lined up in a 5-4-1" two lines above his own "we lined up in a
         3-4-2-1": one eleven, two shapes, in one report. */
      var shape = (c.formation && !said(/\b\d-\d(-\d)*(-\d)*\b|formation|shape|lined up/i))
        ? c.us + ' lined up in a ' + c.formation + '.'
        : c.xi >= 11 ? ''
          : c.xi ? 'The team sheet names ' + say(c.xi) + ' of the starting eleven.' : '';
      var line = (shape + (c.captain ? ' ' + c.captain + ' wore the armband.' : '')).trim();
      if (line) paras.push(line);
      /* And what anybody was asked to do, where somebody said. Only the roles
         actually set, because a list of eleven default instructions is not
         information. */
      /* THE ROLES USED TO BE A PARAGRAPH and no report carries one. Six
         clauses each ending "played as a ..." is a team sheet read aloud, and
         a team sheet has a place: the details block at the end, which is
         exactly where every professional report puts it. Moved there, beside
         each player's name, so the narrative can get on with the match. */
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

    /* WHO WAS THERE AND WHO WAS NOT, which is what a first pre-season game is
       about. Placed after the shape and before the football, exactly where a
       report puts its team news. */
    if (c.squad && c.squad.length) paras.push(c.squad.join(' '));

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
      /* Three to a paragraph, EXCEPT where that would leave one on its own.
         Four moments in a half came out three-then-one, so "Thilaganathan
         booked for a late one in midfield" sat as a one-line paragraph. Split
         evenly instead: four go two and two. */
      halves.forEach(function (half) {
        var list = half.list;
        var per = (list.length % 3 === 1 && list.length > 3) ? 2 : 3;
        for (var q = 0; q < list.length; q += per) {
          paras.push(list.slice(q, q + per).map(function (e) { return e.text; }).join(' '));
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

    /* ---- How they played ----
       What is left keyed to a name belongs to a player who did not score, and
       that is a passage in its own right rather than filler in the run of
       play: it is the part of a report where somebody says who was good.
       Kept in the order the team sheet is in, so it reads back to front like
       a team does. */
    var order = (c.lineup || []).map(function (p) { return p.name; });
    var rated = Object.keys(notes.byName).sort(function (a, b) {
      var ai = order.indexOf(a), bi = order.indexOf(b);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });
    var ratings = [];
    rated.forEach(function (nm) { ratings = ratings.concat(notes.byName[nm]); });
    if (ratings.length) {
      for (var rr = 0; rr < ratings.length; rr += 3) {
        his(ratings.slice(rr, rr + 3).join(' '));
      }
    }
    if (notes.middle.length) {
      for (var b = 0; b < notes.middle.length; b += 2) {
        his(notes.middle.slice(b, b + 2).join(' '));
      }
    }

    /* ---- Keeping and discipline ---- */
    /* WHAT IS A SENTENCE AND WHAT IS A DETAIL.

       This block used to hold the clean sheet, the save count, the bookings
       and the sendings-off, and every one of them arrived with no minute
       against it. So a report finished on the coach's sign-off and then said
       "Luke Munns made six saves" underneath, as a one-line paragraph.

       A sending-off changes a match and belongs in the story even without a
       time. A save count is a figure, and figures go in MATCH DETAILS with
       the rest of the team sheet. */
    var tail = [];
    if (!c.cleanSheet.length && c.theirGoals != null && c.theirGoals > 0 && c.kind === 'score') {
      tail.push(them + (c.theirGoals === 1 ? ' got one back.' : ' managed ' + say(c.theirGoals) + '.'));
    }
    if (c.pensSaved.length) tail.push(listOf(c.pensSaved) + ' saved a penalty.');
    if (c.reds.length) tail.push(listOf(c.reds) + (c.reds.length === 1 ? ' was sent off.' : ' were sent off.'));
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
    /* What comes next, unless he has already said it. */
    if (c.next && !said(/next up|next game|next match|on sunday|this week/i)) {
      var nx = c.next;
      paras.push('Next up ' + (nx.home ? 'is a home game with ' : 'is a trip to ') + nx.opponent
        + (nx.date ? ' on ' + nx.date : '')
        + (nx.inWeek > 2 ? ', the first of ' + say(nx.inWeek) + ' inside a week.' : '.'));
    }

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
    if (notes.late.length) his(notes.late.join(' '));

    /* HIS FIRST, everything derived after it, and his sign-off kept last.
       He wrote the report; this is a sub editor adding what he did not cover,
       and a sub editor does not put his own paragraphs above the piece. */
    if (drafted) {
      var byCoach = paras.filter(function (t, i) { return mine[i]; });
      var byUs = paras.filter(function (t, i) { return !mine[i]; });
      var signOff = notes.late.length ? byCoach.pop() : null;
      paras = byCoach.concat(byUs);
      if (signOff) paras.push(signOff);
    }

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
      /* The line-up in the order it was picked, each man's position beside
         his name and the substitution in brackets, which is the form every
         professional report uses and the only place a team sheet belongs. */
      details.push('Line-up: ' + c.lineup.map(function (p) {
        return p.name + (p.pos ? ' (' + p.pos + ')' : '')
          + (p.offFor ? ' (' + p.offFor + (p.offAt ? ' ' + p.offAt : '') + ')' : '');
      }).join(', ') + '.');
      if (c.formation) details.push('Shape: ' + c.formation + '.');
      if (c.captain) details.push('Captain: ' + c.captain + '.');
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
    /* Saves and the clean sheet used to sit in the prose with no minute
       against them, so a save count landed as a one-line paragraph after the
       coach had signed off. A figure with no moment attached is a detail. */
    if ((c.cleanSheet || []).length) details.push('Clean sheet: ' + c.cleanSheet.join(', ') + '.');
    if (c.saves) details.push('Saves: ' + (c.keeper || 'goalkeeper') + ' ' + c.saves + '.');
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
  /* Sentence case, because these open sentences: "nine of the twelve named"
     read as a fragment somebody forgot to finish. */
  var Num = function (n) { var w = num(n); return w.charAt(0).toUpperCase() + w.slice(1); };

  function playerNotes(c, history, covered) {
    if (!history) return [];
    var already = covered || {};
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
      /* The team news has already said he was making a first appearance;
         saying it again two paragraphs later is the report repeating itself,
         which is the clearest sign nothing is reading it. */
      if (!starts && !goals) {
        if (!already[g.num]) add(g.name, 'NEW');
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

  /* WHAT IS NEXT, which is how a match report ends and which nobody should be
     typing. "The game against Galacticos on Sunday will be the first of three
     within the week" is three facts the fixture list already holds: who, when,
     and how many are packed into the days after. */
  function nextUp(all, fixtures, thisIso, thisId) {
    if (!thisIso) return null;
    var seen = {};
    var later = (all || []).concat(fixtures || [])
      .map(function (m) {
        return { id: m.id, iso: isoOf(m), home: m.home, away: m.away, date: m.date || '' };
      })
      .filter(function (m) {
        if (!m.iso || m.iso <= thisIso || m.id === thisId) return false;
        var k = m.iso + '|' + String(m.id).replace(/^[a-z]/, '');
        if (seen[k]) return false;
        seen[k] = 1; return true;
      })
      .sort(function (a, b) { return a.iso.localeCompare(b.iso); });
    if (!later.length) return null;
    var next = later[0];
    /* How many more inside a week of it, because three games in seven days is
       the story and one game is not. */
    var week = new Date(next.iso + 'T00:00:00Z').getTime() + 7 * 86400000;
    var inWeek = later.filter(function (m) {
      return new Date(m.iso + 'T00:00:00Z').getTime() < week;
    }).length;
    return {
      opponent: isUs(next.home) ? next.away : next.home,
      home: isUs(next.home), date: next.date, iso: next.iso, inWeek: inWeek,
    };
  }

  /* ==========================================================================
     WHO THIS ELEVEN IS, which the club has to look up and should not.

     "Who in the starting XI also played last year", "new signings making
     their debut even though the game is not competitive", "a lot of the boys
     from last season are yet to return" - the club was typing all three, and
     all three are counted from the team sheet and the squad record it already
     has. A first game of pre-season is ABOUT who is there and who is not,
     which is why this is worth deriving properly rather than leaving to
     somebody's memory on a Sunday evening.

     Every figure is the competitive record the site publishes. A friendly
     does not make somebody experienced, so a debut in one is still a debut.
     ========================================================================== */
  function squadContext(c, history, squad) {
    if (!history || !(c.sheetNums || []).length) return { lines: [], debutants: {} };
    var out = [];
    var debutants = {};
    var h = function (n) { return history[String(n)] || history[n] || {}; };
    var nameOf = {};
    (squad || []).forEach(function (p) { nameOf[p.num] = p.name; });

    /* Numbers from 900 up are trialists: they have no profile, no squad card
       and no place in any club record, which is what a trial is. */
    var real = c.sheetNums.filter(function (n) { return Number(n) < 900; });
    var trialists = c.sheetNums.filter(function (n) { return Number(n) >= 900; });

    var capped = real.filter(function (n) { return (h(n).a || 0) > 0; });
    var uncapped = real.filter(function (n) { return !(h(n).a || 0); });

    if (capped.length && real.length > 3) {
      var starts = capped.reduce(function (t, n) { return t + (h(n).a || 0); }, 0);
      out.push(Num(capped.length) + ' of the ' + num(real.length) + ' named had started a '
        + 'competitive match for the club before, ' + starts + ' between them.');
    }

    /* A DEBUT IS A DEBUT. The club asked for this in as many words: a first
       appearance counts as one whether or not the game counted. */
    if (uncapped.length && uncapped.length <= 5) {
      var who = uncapped.map(function (n) { return nameOf[n] || ('No. ' + n); }).filter(Boolean);
      if (who.length) {
        uncapped.forEach(function (n2) { debutants[n2] = 1; });
        out.push(who.length === 1
          ? who[0] + ' was making a first appearance for the club.'
          : listOf(who) + ' were all making a first appearance for the club.');
      }
    } else if (uncapped.length) {
      out.push(Num(uncapped.length) + ' of the side had not played for the club before.');
    }

    if (trialists.length) {
      out.push(trialists.length === 1 ? 'A trialist was given a run.'
        : Num(trialists.length) + ' trialists were given a run.');
    }

    /* WHO IS NOT THERE, which in August is half the story. Anybody with a
       real body of work for the club who is not on this sheet. Said as "has
       not featured", because a man missing from a July friendly has not been
       dropped, he is on holiday. */
    var onSheet = {};
    c.sheetNums.forEach(function (n) { onSheet[n] = 1; });
    var away = (squad || []).filter(function (p) {
      return !onSheet[p.num] && (h(p.num).a || 0) >= 10;
    }).sort(function (a, b) { return (h(b.num).a || 0) - (h(a.num).a || 0); });
    if (away.length >= 3) {
      var top = away.slice(0, 3).map(function (p) { return p.name; });
      out.push(Num(away.length) + ' of last season\u2019s regulars were not involved, among them '
        + listOf(top) + '.');
    }
    return { lines: out, debutants: debutants };
  }

  function context(all, fixtures, c, history) {
    var iso = c && c.iso ? c.iso : '';
    var sq = squadContext(c || {}, history || null, (window.SA_SEED || {}).squad || []);
    return {
      h2h: headToHead(all, c && c.opp, iso, c && c.id),
      friendlyOf: friendlyOrder(all, fixtures, iso, c && c.id, c && c.competition),
      players: playerNotes(c || {}, history || null, sq.debutants),
      next: nextUp(all, fixtures, iso, c && c.id),
      squad: sq.lines,
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
  var WORDS = (window.SA_SEED && window.SA_SEED.reportWords) || { min: 700, max: 900 };

  var HOUSE = [
    'You are a football writer filing a match report for Sue’s Angels FC, a London',
    'men’s Sunday-league club. Write to the standard of a professional club-site',
    'report: a journalist who watched the game and is telling somebody who did not.',
    '',
    'LENGTH',
    '- Aim for ' + WORDS.min + ' to ' + WORDS.max + ' words, excluding the MATCH DETAILS block.',
    '- Reach it by writing each recorded moment properly. A moment worth a line in',
    '  the notes is worth twenty to twenty-five words on the page: what led to it,',
    '  who was involved, where on the pitch, and what happened next.',
    '- Do NOT reach it by padding, by repeating yourself, by restating the score in',
    '  a new paragraph, or by inventing an incident. If the record will not carry',
    '  ' + WORDS.min + ' words, write what it carries and stop. Short and true beats long',
    '  and made up, every time.',
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
    /* Team news, counted rather than remembered. This is the material a
       pre-season report is made of and the club should not be typing it. */
    (c.squad || []).forEach(function (line) { L.push('Team news: ' + line); });
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
      + 'those in clock order alongside the goals. Give each one its own proper\n'
      + 'sentence of twenty to twenty-five words rather than a four-word summary:\n'
      + 'that is where the length comes from.\n\nWrite the report.';
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
