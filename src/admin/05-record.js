/* ==========================================================================
   DOES THE RECORD ADD UP?

   The match form asks for the same match twice - a scoreline on the first tab
   and the goals on the third - and for a long time never compared them. Four
   questions came out of that, each written after a real error in the archive
   and two of them found by the question rather than by anybody reading the
   data.

   They lived inside the editor, reading the form's own fields, which had two
   consequences. The suite could only assert that they EXISTED, by regular
   expression over the shipped file, and the file said so itself: "checks()
   reads the DOM, so it cannot be isolated and run the way offer() and
   carryAssists() can". A rule that can only be grepped for is a rule that can
   quietly stop being applied - the exact failure this panel has shipped three
   times.

   And the dashboard could not ask them at all. The club could only find a
   record that disagrees with itself by opening it, which means the three in
   the archive stayed there: known, written down in a note, and invisible to
   anybody who could fix them.

   So they are one pure function over a record. The editor builds a record
   from its form and calls it; the dashboard calls it over everything stored;
   the suite calls the shipped function with crafted records and gets a real
   answer instead of a regular expression.

   NONE OF THESE IS A REASON TO REFUSE A SAVE. A result typed at the side of a
   pitch is worth having before the detail is known.
   ========================================================================== */
(function () {
  'use strict';

  /* A record in the shape the database stores, and a `nameOf` for turning a
     stored slot into a person. The caller owns the names because the editor
     knows about trialists and the dashboard does not. */
  function matchProblems(d, nameOf) {
    var out = [];
    d = d || {};
    var name = nameOf || function (n) { return String(n); };

    /* A fixture has not been played and a walkover was not: neither has a
       team sheet to disagree with. */
    if (d.kind === 'fixture' || d.kind === 'walkover') return out;

    var starters = d.starters || [];
    var bench = d.bench || [];
    var goals = d.goals || [];

    /* A FRIENDLY NEEDS NO TEAM SHEET, and asking for one is asking for work
       that changes nothing. Appearances, goals, assists and every career
       figure the site publishes are counted from COMPETITIVE matches only, so
       a friendly's eleven is credited to nobody however carefully it is
       entered. Proved before it was written: adding the eleven to the BPR
       friendly of 30 August moved the stats page not at all, left career
       appearances on 351, and did not change the pre-season band by a single
       name.

       Everything else about a friendly still counts, because the rest of it
       IS published: the goals appear on the match page and in the pre-season
       band, so a scoreline that disagrees with them is a real gap here as
       much as anywhere. This drops one question, not the record. */
    var friendly = /friendly/i.test(String(d.competition || ''));

    if (starters.length && starters.length !== 11) {
      out.push('The team sheet names ' + starters.length + ', not eleven.');
    }
    if (!starters.length && !friendly) {
      out.push('No team sheet, so nobody is credited with playing in this match.');
    }

    /* The scoreline is stored as home and away; which of those is the club
       depends on where the match was played. */
    var ours = null;
    if (d.hs != null && d.as != null) ours = d.home && !/Sue.s Angels/.test(d.home) ? Number(d.as) : Number(d.hs);
    if (d.us != null) ours = Number(d.us);
    if (ours != null && !isNaN(ours) && goals.length !== ours) {
      out.push('The scoreline says ' + ours + ' but ' + (goals.length || 'no')
        + (goals.length === 1 ? ' goal is' : ' goals are') + ' listed.');
    }

    /* THEIR GOALS. The form has had a box for who scored against the club, and
       when, since 25/26's archive was entered, and every 26/27 match that
       conceded left it empty, so the match story says nothing about the goal
       that changed a game. Asked of the stored score, like ours above. */
    var theirs = null;
    if (d.hs != null && d.as != null) theirs = d.home && !/Sue.s Angels/.test(d.home) ? Number(d.hs) : Number(d.as);
    if (d.them != null) theirs = Number(d.them);
    var logged = (d.opponentGoals || []).length;
    if (theirs != null && !isNaN(theirs) && theirs > 0 && logged !== theirs) {
      out.push('The opponents scored ' + theirs + ' but ' + (logged
        ? logged + (logged === 1 ? ' of their goals is' : ' of their goals are') + ' written in.'
        : 'none of their goals is written in under Their goals.'));
    }

    reportProblems(d, name, goals).forEach(function (p) { out.push(p); });

    var onSheet = {};
    starters.forEach(function (x) { onSheet[num(x)] = 1; });
    bench.forEach(function (x) { onSheet[num(x)] = 1; });
    if (!starters.length && !bench.length) return out;

    /* EVERYBODY CREDITED WITH ANYTHING, in one pass, so both questions below
       are asked of the same set. */
    var did = {};
    goals.forEach(function (g) {
      if (g && g.num != null) did[g.num] = 1;
      if (g && g.assist && g.assist.num != null) did[g.assist.num] = 1;
    });
    (d.assists || []).forEach(function (a) { if (a && a.num != null) did[a.num] = 1; });
    ['yellowCards', 'redCards', 'cleanSheetContributors'].forEach(function (f) {
      (d[f] || []).forEach(function (x) { if (num(x) != null) did[num(x)] = 1; });
    });
    ['keeper', 'captain', 'motm'].forEach(function (f) {
      if (d[f] != null && d[f] !== '') did[d[f]] = 1;
    });

    var stray = Object.keys(did).filter(function (n) { return !onSheet[n]; });
    if (stray.length) {
      out.push(stray.map(name).join(', ') + (stray.length === 1 ? ' is' : ' are')
        + ' named in this match but not on the team sheet.');
    }

    /* A MAN WHO DID NOT COME ON CANNOT HAVE SCORED. A different fault from
       the one above: he IS on the sheet, and the sheet says he watched. The
       bench's `on` field came after the archive, so every historical
       substitute reads as unused and thirteen credits across eleven matches
       go to one. */
    var idle = bench.filter(function (x) { return did[num(x)] && !x.on; }).map(num);
    if (idle.length) {
      out.push(idle.map(name).join(', ')
        + (idle.length === 1 ? ' is named on the bench as an unused substitute but is'
          : ' are named on the bench as unused substitutes but are')
        + ' credited with something in this match. Tick Came on, on the team sheet.');
    }
    return out;
  }

  /* DOES THE WRITTEN REPORT AGREE WITH THE RECORD? A finished report ends in a
     "Match details" block - Full-time, Player of the Match, Captain,
     Goalkeeper, Saves, Starting formation, then the Goalscorers with a tally
     each - and the website publishes both the prose and the record beside it,
     so a disagreement between them is printed twice on the same page. Only
     those labelled lines are read: the prose above them is never guessed at.
     People are compared by surname, because a report says Dan where the
     squad says Daniel. */
  function reportProblems(d, name, goals) {
    var out = [];
    var text = String(d.polishedReport || d.commentary || '');
    var at = text.search(/^Match details[ \t]*$/m);
    if (at < 0) return out;
    var block = text.slice(at);
    var line = function (label) {
      var m = new RegExp('^' + label + ':[ \\t]*(.+)$', 'mi').exec(block);
      return m ? m[1].trim() : '';
    };
    var surname = function (s) {
      return String(s || '').toLowerCase().replace(/[^a-z\s-]/g, '').trim().split(/\s+/).pop();
    };
    var ft = /^Full-time:.*?(\d+)\s*[\u2013\u2014-]\s*(\d+)/mi.exec(block);
    if (ft && d.hs != null && d.as != null && (Number(ft[1]) !== Number(d.hs) || Number(ft[2]) !== Number(d.as))) {
      out.push('The written report gives the score as ' + ft[1] + '-' + ft[2]
        + ' and the record as ' + d.hs + '-' + d.as + '.');
    }
    [['Player of the Match', 'motm'], ['Captain', 'captain'], ['Goalkeeper', 'keeper']].forEach(function (p) {
      var said = line(p[0]);
      if (!said || d[p[1]] == null || d[p[1]] === '') return;
      var who = name(d[p[1]]);
      if (/^\d+$/.test(String(who))) return;
      if (surname(said) !== surname(who)) {
        out.push('The written report names ' + said + ' as ' + p[0].toLowerCase()
          + ' and the record names ' + who + '.');
      }
    });
    var shape = line('Starting formation');
    if (shape && d.formation && shape !== String(d.formation)) {
      out.push('The written report starts in ' + shape + ' and the record in ' + d.formation + '.');
    }
    var saves = line('Saves');
    if (/^\d+$/.test(saves) && d.saves != null && d.saves !== '' && Number(saves) !== Number(d.saves)) {
      out.push('The written report gives ' + saves + ' saves and the record ' + d.saves + '.');
    }
    var gs = /^Goalscorers[ \t]*\n([\s\S]*?)(?:\n[ \t]*\n|$)/mi.exec(block);
    if (gs) {
      var tally = {};
      goals.forEach(function (g) {
        if (g && g.num != null) { var k = surname(name(g.num)); tally[k] = (tally[k] || 0) + 1; }
      });
      gs[1].split('\n').forEach(function (l) {
        var m = /^(.+?),\s*(\d+)\s*$/.exec(l.trim());
        if (!m) return;
        var n = tally[surname(m[1])] || 0;
        if (n !== Number(m[2])) {
          out.push('The written report gives ' + m[1] + ' ' + m[2] + (m[2] === '1' ? ' goal' : ' goals')
            + ' and the record ' + n + '.');
        }
      });
    }
    return out;
  }

  /* A slot is stored either bare or as a record carrying one. */
  function num(x) {
    if (x == null) return null;
    return (typeof x === 'object') ? x.num : x;
  }

  window.CPREC = { matchProblems: matchProblems, slotNum: num };
}());
