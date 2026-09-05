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

  /* A slot is stored either bare or as a record carrying one. */
  function num(x) {
    if (x == null) return null;
    return (typeof x === 'object') ? x.num : x;
  }

  window.CPREC = { matchProblems: matchProblems, slotNum: num };
}());
