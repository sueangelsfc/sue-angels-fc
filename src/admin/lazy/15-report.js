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
  function placeNotes(bullets, names) {
    var early = [], late = [], byName = {}, middle = [];
    (bullets || []).forEach(function (raw) {
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
      else if (/\b(final|last (ten|fifteen|twenty)|closing|full.?time|late on|at the end)\b/.test(low)) late.push(t);
      else if (who) { (byName[who] = byName[who] || []).push(t); }
      else middle.push(t);
    });
    return { early: early, late: late, byName: byName, middle: middle };
  }

  function compose(c) {
    var paras = [];
    var seed = seedOf(c);
    var scorerNames = (c.goals || []).map(function (g) { return g.name; });
    var notes = placeNotes(c.bullets, scorerNames.concat(c.motm ? [c.motm] : []));
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
        paras.push(c.roles.map(function (r) {
          return r.name + ' played as ' + (/^[aeiou]/i.test(r.role) ? 'an ' : 'a ') + r.role.toLowerCase();
        }).join(', ') + '.');
      }
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
      paras.push((timed.length ? 'Also on the scoresheet: ' : 'On the scoresheet: ')
        + listOf(others) + '. The team sheet does not say what minute those went in.');
    }

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

    if (notes.late.length) paras.push(notes.late.join(' '));

    /* ---- What the clubs have done to each other before ----
       The thing a person writing this would reach for and no tab on the form
       holds. Counted from the club's own match list, so it agrees with the
       results page by construction rather than by somebody remembering. */
    if (c.h2h && c.h2h.played) {
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
    if (c.friendlyOf && c.friendlyOf.of > 1) {
      paras.push('That was the ' + ordinal(c.friendlyOf.nth) + ' of '
        + say(c.friendlyOf.of) + ' friendlies arranged before the season starts.');
    }

    if (c.motm) {
      paras.push(pick([
        c.motm + ' was named Player of the Match.',
        'Player of the Match: ' + c.motm + '.',
        c.motm + ' took the Player of the Match award.',
      ], seed, 3));
    }

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

  function context(all, fixtures, c) {
    var iso = c && c.iso ? c.iso : '';
    return {
      h2h: headToHead(all, c && c.opp, iso, c && c.id),
      friendlyOf: friendlyOrder(all, fixtures, iso, c && c.id, c && c.competition),
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
    'You are writing a match report for Sue’s Angels FC, a London men’s Sunday-league club.',
    '',
    'Rules, all of them absolute:',
    '- British spelling. No em dashes anywhere. No emoji. No exclamation marks.',
    '- Say "League Ten" or "League Eight", never "Division".',
    '- Understate it. A real number instead of an adjective. Never "incredible",',
    '  "unbelievable", "historic", "clinical" or "dominant".',
    '- Invent NOTHING. Every fact you use must be in the notes below. If a goal has',
    '  no minute, it does not get one. Do not name a player who is not named here.',
    '- Do not mention sepsis or the club’s cause. This is a football report.',
    '- No headline, no scoreline banner, no bullet points, no markdown. Plain',
    '  paragraphs separated by a blank line, 4 to 7 of them.',
    '- The coach’s own observations are the only opinion in the piece. Work them',
    '  into the report where they belong rather than listing them at the end.',
    '- Finish on the match, not on a rallying cry.',
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
    return L.join('\n');
  }

  function prompt(c) {
    return HOUSE + '\n\nThe facts, all of them recorded by the club:\n' + factSheet(c)
      + '\n\nWhat the coach saw, in his own words. These are the only opinions in the\n'
      + 'piece and they are what the report is for. Correct obvious typing slips and\n'
      + 'work each one in where it belongs:\n'
      + (c.bullets || []).map(function (b) { return '- ' + b; }).join('\n')
      + '\n\nWrite the report.';
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
