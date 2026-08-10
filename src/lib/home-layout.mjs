/* ==========================================================================
   WHAT THE HOME PAGE SHOWS, AND IN WHAT ORDER

   The home page was eight bands in one fixed order typed into one line of
   home.mjs. That order was a developer's opinion from July, and the club had
   no way to change it: in August the table band led with an empty League Eight
   season while the news of promotion sat four screens down.

   So the order is a record now, `home:layout`, written in Control panel ->
   Home page. This module is the single definition of what a band IS, and it
   is read by three things that must never disagree:

     - src/templates/home.mjs   draws the page in this order
     - src/build.mjs            seeds the list into the control panel
     - src/admin/lazy/95-home.js  offers exactly these and no others

   The panel cannot offer a band the site cannot draw, because it is handed
   this list rather than holding its own copy.

   ABSENT MEANS THE STANDARD ORDER. No record, an empty record, a record full
   of names this file has never heard of: all three produce the page exactly as
   it shipped, band for band. Nothing already saved needs migrating and
   deleting the record puts the original back.
   ========================================================================== */
import { hasReport } from './prose.mjs';
import { preseasonFor, seasonAhead } from './preseason.mjs';
import {
  clubRecords, milestones, currentRun, goalKinds, opponentRecords,
  byCompetition, homeAwaySplit, teamSummary, winMargins, commonScorelines,
  byMonth, penaltyRecord, disciplineRecord, formationUse, venueRecords,
  squadShape, scoringRuns, clubFirsts,
} from './stats.mjs';
import {
  SPONSORS, SPONSOR_TIERS, CLUB, SOCIALS, JOIN_PATHS, JOIN_FAQS,
} from './club.mjs';

/* The default order, which is also the order these were written in. `name` is
   what the band calls itself ON THE PAGE, so the panel and the website use one
   vocabulary: somebody who has just read "Ask the Angels" on the home page can
   find it in the list without translating. */
export const HOME_BANDS = [
  /* PRE-SEASON LEADS, and it is first HERE rather than in a saved record
     because the club has never saved one: with no record the page takes this
     order, so this list is the club's front page until somebody rearranges it
     in the panel, at which point their record wins outright.

     It is safe to lead with because it takes itself off. `homeBandFilled`
     reports it empty the moment a competitive match is played, so the day
     League Eight starts the front page goes back to leading with the news
     without anybody remembering to change it. A hard-coded lead that could
     not do that would be a promise to go stale. */
  {
    key: 'preseason',
    area: 'now',
    name: 'Pre-season',
    what: 'The friendly programme, the record across it, who has scored and who has '
      + 'made a first appearance. Takes itself off the page once the league starts.',
  },
  /* Beside pre-season, because they are one thought: the friendlies being
     played and the division they are preparation for. It retires on the same
     kind of evidence, when the division has started. */
  {
    key: 'ahead',
    area: 'now',
    name: 'The season ahead',
    what: 'The clubs in the new division and what the archive already holds on each of them.',
  },
  {
    key: 'nextup',
    area: 'now',
    name: 'The next match',
    what: 'The next fixture previewed, with whatever the archive holds on that opponent.',
  },
  {
    key: 'fixtures',
    area: 'now',
    off: true,
    name: 'What is coming up',
    what: 'The next few fixtures after that one, with dates, venues and kick-off times.',
  },
  {
    key: 'lastout',
    area: 'now',
    off: true,
    name: 'The last time out',
    what: 'The most recent result in full: the score, who scored and what it did to the run.',
  },
  {
    key: 'report',
    area: 'now',
    name: 'A match report',
    what: 'A match report: the headline, the score and the opening, with a link to the whole thing.',
    pick: 'match',
    auto: 'The most recent report',
  },
  {
    key: 'preview',
    area: 'now',
    off: true,
    name: 'The preview',
    what: 'What the club has written about the match to come, from the preview field '
      + 'on the fixture. Empty until somebody writes one.',
  },
  {
    key: 'awaiting',
    area: 'now',
    off: true,
    name: 'Waiting on a score',
    what: 'A match whose date has been and gone with no result typed in yet. Empty '
      + 'whenever the records are up to date, which is most of the time.',
  },
  {
    key: 'news',
    area: 'now',
    name: 'Club news',
    what: 'The six most recent articles, newest first.',
  },
  {
    key: 'leadnews',
    area: 'now',
    off: true,
    name: 'The latest story',
    what: 'The newest article on its own, with its picture and its opening. For when '
      + 'one piece should lead the page rather than sit in a row of six.',
  },
  {
    key: 'onthisday',
    area: 'now',
    off: true,
    name: 'On this day',
    what: 'What the club was doing on this date in an earlier season. Empty on most '
      + 'days of the year, which is what makes it worth reading on the days it is not.',
  },
  {
    key: 'who',
    area: 'club',
    name: 'More than a result',
    what: 'Who the club is and why it plays, with the link to the cause.',
  },
  {
    key: 'awards',
    area: 'people',
    name: 'Award winners',
    what: 'Season awards, Player of the Month and the club records.',
  },
  {
    key: 'potm',
    area: 'people',
    off: true,
    name: 'Player of the Month',
    what: 'The most recent Player of the Month on their own, with the reason it was given.',
  },
  {
    key: 'campaign',
    area: 'pitch',
    name: 'The campaign',
    what: 'The season so far: played, won, goals, clean sheets, the form strip.',
  },
  {
    key: 'results',
    area: 'pitch',
    name: 'Recent results',
    what: 'The last seven matches played, with scores and opponents.',
  },
  {
    key: 'streak',
    area: 'pitch',
    off: true,
    name: 'The run',
    what: 'The runs the club is on now, each one beside the longest it has managed.',
  },
  {
    key: 'table',
    area: 'pitch',
    name: 'The table',
    what: 'The league table as it stands, with the club marked.',
  },
  {
    key: 'competitions',
    area: 'pitch',
    off: true,
    name: 'League and cup',
    what: 'The record split by competition, so a cup run reads separately from a league season.',
  },
  {
    key: 'homeaway',
    area: 'pitch',
    off: true,
    name: 'Home and away',
    what: 'The same season read twice: at the home ground, and on the road.',
  },
  {
    key: 'aroundleague',
    area: 'pitch',
    off: true,
    name: 'Around the league',
    what: 'The rest of the division’s results, the ones the club was not in.',
  },
  {
    key: 'formations',
    area: 'pitch',
    off: true,
    name: 'How the club lines up',
    what: 'The shapes the club sets up in and how often, counted from the team sheets.',
  },
  {
    key: 'walkovers',
    area: 'pitch',
    off: true,
    name: 'The awarded matches',
    what: 'The ties awarded rather than played, and why they carry no score. This is '
      + 'the awkward part of the record said out loud rather than left to be noticed.',
  },
  {
    key: 'margins',
    area: 'pitch',
    off: true,
    name: 'How the wins came',
    what: 'The wins split by margin, because a won column says nothing about how.',
  },

  /* ---- The figures --------------------------------------------------------
     Six bands that publish nothing the club types in. Each one is a
     leaderboard the stats engine already derives for the stats page, so a
     figure here and a figure there cannot disagree, and each empties itself
     when the column it reads is all zeroes. */
  {
    key: 'scorers',
    area: 'numbers',
    off: true,
    name: 'Who scores the goals',
    what: 'The leading scorers, counted from the match records.',
  },
  {
    key: 'contributions',
    area: 'numbers',
    off: true,
    name: 'Goals and assists',
    what: 'The two columns added together, which is a different order from either.',
  },
  {
    key: 'leaguescorers',
    area: 'numbers',
    off: true,
    name: 'The division’s scorers',
    what: 'The league’s own scoring chart, with the club’s players marked. Typed in '
      + 'from the league, not derived, so it lags until somebody updates it.',
  },
  {
    key: 'bigwins',
    area: 'numbers',
    off: true,
    name: 'The biggest wins',
    what: 'The heaviest results, by margin, newest first where two are level.',
  },
  {
    key: 'penalties',
    area: 'numbers',
    off: true,
    name: 'From the spot',
    what: 'Scored, missed and conceded, and who takes them.',
  },
  {
    key: 'discipline',
    area: 'numbers',
    off: true,
    name: 'Bookings',
    what: 'Yellows and reds as the records carry them, with the number of matches '
      + 'those records cover said plainly beside them.',
  },
  {
    key: 'scorelines',
    area: 'numbers',
    off: true,
    name: 'The scorelines',
    what: 'Which results come up most often, written the club’s way round.',
  },
  {
    key: 'months',
    area: 'numbers',
    off: true,
    name: 'Month by month',
    what: 'The record for each month of the season, oldest first.',
  },
  {
    key: 'creators',
    area: 'numbers',
    off: true,
    name: 'Who makes them',
    what: 'The leading providers of assists.',
  },
  {
    key: 'appearances',
    area: 'numbers',
    off: true,
    name: 'Who turns up',
    what: 'Most appearances for the club. Starts only, because Sunday-league returns '
      + 'do not record substitutes or minutes.',
  },
  {
    key: 'motm',
    area: 'numbers',
    off: true,
    name: 'Man of the match',
    what: 'Who has been given it most often, from the match records themselves.',
  },
  {
    key: 'goalkinds',
    area: 'numbers',
    off: true,
    name: 'How the goals come',
    what: 'Open play, set pieces and penalties, with a line saying how many of the '
      + 'goals carry enough detail to be counted.',
  },
  {
    key: 'cleansheets',
    area: 'numbers',
    off: true,
    name: 'Clean sheets',
    what: 'How often the club has kept one, and the longest it has gone without conceding.',
  },
  {
    key: 'faq',
    area: 'join',
    name: 'Ask the Angels',
    what: 'The questions new players, parents and sponsors actually ask.',
  },
  {
    key: 'cta',
    area: 'join',
    name: 'Pull on the shirt',
    what: 'Trials, volunteering, media and sponsorship. The way in.',
  },
  {
    key: 'back',
    area: 'join',
    off: true,
    name: 'Back the club',
    what: 'What sponsorship actually buys, tier by tier, with the way to ask about it.',
  },
  {
    key: 'give',
    area: 'join',
    off: true,
    name: 'Chip in',
    what: 'The club’s donation link, which is set in Control panel → Donations.',
  },

  /* ---- The ones that take a PICK ------------------------------------------
     EVERY band is on by default now. The club asked for the whole set, and a
     default of "everything" is also the honest one: a band that has nothing to
     say reports itself empty and the page drops it, so nothing here can put a
     heading over a hole.

     A saved record still wins outright. That is what stops this list quietly
     rearranging a front page somebody has already arranged - and it is also
     why the panel has "Put the standard order back", which deletes the record
     and returns the page to exactly this.

     Each of these takes a PICK. The default is derived (the newest report, the
     newest album, the season's leading scorer) so the band keeps itself
     current with nobody maintaining it; choosing one is an editorial override
     and the panel says how old it has gone. That is the honest split: the
     site decides what is most recent, the club decides when to overrule it. */
  {
    key: 'photos',
    area: 'club',
    name: 'Photographs',
    what: 'A row of pictures from one album, with a link to the album.',
    pick: 'album',
    auto: 'The newest album',
  },
  {
    key: 'spotlight',
    area: 'people',
    name: 'A player',
    what: 'One player: photograph, position and what he has done for the club.',
    pick: 'player',
    auto: 'The club’s leading scorer',
  },
  {
    key: 'sponsors',
    area: 'club',
    name: 'Who backs the club',
    what: 'The club’s partners, their marks on a white tile so the colours stay true.',
  },
  {
    key: 'staff',
    area: 'people',
    name: 'The people running it',
    what: 'The manager and the coaching staff, with what each of them does.',
  },
  {
    key: 'records',
    area: 'numbers',
    name: 'Club records',
    what: 'Biggest win, longest unbeaten run, most goals, most appearances. All derived.',
  },
  {
    key: 'milestones',
    area: 'numbers',
    name: 'Milestones in sight',
    what: 'Who is within a few of a round number. Works itself out and empties when nobody is close.',
  },
  {
    key: 'squad',
    area: 'people',
    name: 'The squad',
    what: 'Every player, with a photograph where the club has one.',
  },
  {
    key: 'captains',
    area: 'people',
    off: true,
    name: 'Who wears the armband',
    what: 'Who has captained the club and how often, counted from the team sheets.',
  },
  {
    key: 'newfaces',
    area: 'people',
    off: true,
    name: 'New at the club',
    what: 'Anybody in their first season here. Worked out from who has played rather '
      + 'than from anything anybody has to keep up to date.',
  },
  {
    key: 'leadership',
    area: 'people',
    off: true,
    name: 'The captaincy',
    what: 'Club captain, vice and third choice, set in Control panel → Recognition. '
      + 'Who HOLDS the armband, which is not the same question as who has worn it.',
  },
  {
    key: 'positions',
    area: 'people',
    off: true,
    name: 'How the squad breaks down',
    what: 'Goalkeepers, defenders, midfielders and forwards, counted from where '
      + 'people have actually played.',
  },
  {
    key: 'scoringruns',
    area: 'people',
    off: true,
    name: 'Scoring runs',
    what: 'The longest run of consecutive appearances with a goal in it, read off each '
      + 'player’s own matches so a game he missed does not break the run.',
  },
  {
    key: 'recordholders',
    area: 'people',
    off: true,
    name: 'Firsts and honours',
    what: 'The club records somebody has set by hand in Control panel → Recognition, '
      + 'as opposed to the ones the archive works out on its own.',
  },
  {
    key: 'honours',
    area: 'club',
    off: true,
    name: 'What the club has won',
    what: 'The trophies, set in Control panel → Recognition.',
  },
  {
    key: 'follow',
    area: 'club',
    off: true,
    name: 'Follow the club',
    what: 'Instagram, TikTok and Facebook, from the club record so a dead handle is '
      + 'removed in one place.',
  },
  {
    key: 'ground',
    area: 'club',
    name: 'Where the club plays',
    what: 'The home ground, how to reach it and when. For opponents, trialists and anybody '
      + 'turning up for the first time.',
  },

  /* ---- Getting involved ---------------------------------------------------
     Two of these carry a real form. They post to the same two places the
     footer does, the table AND the endpoint, because a form that only emails
     records nothing when the key is unset - which is exactly the bug that
     once left `enquiries` empty. */
  {
    key: 'joinpaths',
    area: 'join',
    off: true,
    name: 'Four ways in',
    what: 'Play, volunteer, sponsor or help with the media, each with what it involves.',
  },
  {
    key: 'joinfaqs',
    area: 'join',
    off: true,
    name: 'Questions about joining',
    what: 'The questions a trialist asks, which are not the ones on Ask the Angels.',
  },
  {
    key: 'contact',
    area: 'join',
    off: true,
    name: 'Get in touch',
    what: 'A short enquiry form on the front page. Writes to the inbox AND emails, so a '
      + 'lead is recorded even when the mail key is unset. Read it in Control panel → Inbox.',
  },
  {
    key: 'newsletter',
    area: 'join',
    off: true,
    name: 'The monthly email',
    what: 'The supporter sign-up, the same one as the footer. Read the list in '
      + 'Control panel → Inbox.',
  },

  /* ---- The archive --------------------------------------------------------
     Everything the club has done, looked at as a whole rather than as this
     week. These are the bands that get longer every season rather than
     changing, which is a different kind of band from the ones above and the
     reason this is its own area. */
  {
    key: 'headtohead',
    area: 'archive',
    off: true,
    name: 'Every club played',
    what: 'One row for each opponent the club has met, with the record against them.',
  },
  {
    key: 'seasons',
    area: 'archive',
    off: true,
    name: 'Every season',
    what: 'One row per season since 2025, with the record and the division.',
  },
  {
    key: 'everymatch',
    area: 'archive',
    off: true,
    name: 'Every match',
    what: 'The whole archive in one list, newest first. Long by design.',
  },
  {
    key: 'firsts',
    area: 'archive',
    off: true,
    name: 'The club’s firsts',
    what: 'First match, first win, first goal, first clean sheet, first cup tie. Not '
      + 'stored anywhere: each one is the earliest record that answers to it.',
  },
  {
    key: 'reports',
    area: 'archive',
    off: true,
    name: 'The match reports',
    what: 'Every match the club has written up, newest first.',
  },
  {
    key: 'albums',
    area: 'archive',
    off: true,
    name: 'The albums',
    what: 'Every photograph album, with its cover and how many pictures are in it.',
  },
  {
    key: 'clubswall',
    area: 'archive',
    off: true,
    name: 'The clubs played',
    what: 'Every opponent’s crest in one wall. Mala Vida FC has no badge on file and '
      + 'takes the lettered mark.',
  },
  {
    key: 'whatsinhere',
    area: 'archive',
    off: true,
    name: 'What is in here',
    what: 'How much the site actually holds: matches, reports, photographs, players, '
      + 'articles. Counted at build, so it cannot drift.',
  },
  {
    key: 'venues',
    area: 'archive',
    off: true,
    name: 'Where the club has played',
    what: 'Every ground, with the record there.',
  },
];

/* ---- Areas ---------------------------------------------------------------
   Twenty bands is too many to scan as one undifferentiated list, so each one
   belongs to an area and the panel can filter by it.

   An area is a PANEL device and nothing else. The page order is still one flat
   list, because the page is one column and reading it top to bottom is the
   whole point; grouping the running order by area would mean the panel showed
   an arrangement the website does not have. So the filter narrows what you can
   see and never what you can move: with a filter on, the arrows come off and
   the screen says why, rather than letting somebody move a band past
   neighbours that are hidden from them. */
export const HOME_AREAS = [
  { key: 'now', name: 'Happening now',
    what: 'Timely. Each of these takes itself off the page when it stops being true.' },
  { key: 'pitch', name: 'On the pitch',
    what: 'Results, the table and the record, match by match.' },
  /* Split out of "On the pitch" when it reached twelve bands, which is past
     what an area is for. The line between them is what the reader is looking
     at: a match, or a column. */
  { key: 'numbers', name: 'The figures',
    what: 'Leaderboards and totals, every one of them counted from the match records '
      + 'rather than typed in, so nobody has to keep them true.' },
  { key: 'people', name: 'The people',
    what: 'Players and staff.' },
  { key: 'club', name: 'The club',
    what: 'Who the club is, what it has won, who backs it and where it plays.' },
  { key: 'join', name: 'Getting involved',
    what: 'The way in, and the questions people ask before they take it. Two of these '
      + 'carry a form, and what they collect lands in Control panel → Inbox.' },
  /* A different KIND of band from the rest, not just a different subject:
     these get longer every season rather than changing, and they are the ones
     to reach for when somebody wants the whole picture rather than this week. */
  { key: 'archive', name: 'The archive',
    what: 'Everything the club has done, looked at as a whole rather than as this week. '
      + 'These grow with the seasons instead of turning over.' },
];
export const HOME_AREA_KEYS = HOME_AREAS.map((a) => a.key);

const KEYS = HOME_BANDS.map((b) => b.key);
const KNOWN = new Set(KEYS);

/* WHICH BANDS CAN BE EMPTY, and the only two that can.

   A band with nothing in it is not published whatever the club has chosen, and
   it must not take a number in the reference strip either. Both callers ask
   this same question rather than each deciding for itself, so the panel can
   never show a switch beside a band the page is going to drop anyway.

   Everything else draws from club facts that always exist: the club always has
   a story, a record, a set of questions and a way in. */
export function homeBandFilled(key, d) {
  if (key === 'news') return ((d && d.articles) || []).length > 0;
  if (key === 'table') return ((d && d.table) || []).length > 0;
  if (key === 'report') return reportsIn(d).length > 0;
  if (key === 'photos') return albumsIn(d).length > 0;
  if (key === 'spotlight') return playersIn(d).length > 0;
  /* PRE-SEASON EMPTIES ITSELF. The band is only true while the club is in
     pre-season, so it is treated as empty once a competitive match has been
     played and the page drops it without anybody switching it off. A band
     still calling September's league football "pre-season" in October is the
     failure this prevents. */
  if (key === 'preseason') {
    const ps = preseasonFor(d);
    return !ps.isOver && (ps.played.length > 0 || ps.toCome.length > 0);
  }
  /* And the season ahead stops being ahead once it is under way. */
  if (key === 'ahead') {
    const a = seasonAhead(d);
    return a.clubs.length > 0 && !a.started;
  }
  if (key === 'sponsors') return (SPONSORS || []).length > 0;
  if (key === 'staff') return ((d && d.coaches) || []).length > 0;
  if (key === 'records') return clubRecords((d && d.competitive) || [], (d && d.players) || []).length > 0;
  /* Milestones empty themselves. Nobody is always within three of a round
     number, and a heading over an empty list is worse than no heading. */
  if (key === 'milestones') return milestones((d && d.players) || []).length > 0;
  if (key === 'ground') return !!(CLUB.venue && CLUB.venue.name);
  /* Empties itself the moment there is no next match to preview, which is what
     happens at the end of a season. */
  if (key === 'nextup') return !!(d && d.nextFixture && d.nextFixture.opponent);
  if (key === 'squad') return ((d && d.squad) || (d && d.players) || []).length > 0;
  /* The campaign is a chart of cumulative goals, so it needs matches carrying
     a goal record. It had no entry here at all and always claimed content,
     which was true of every dataset it had ever been handed and stopped being
     true when the layout could hand it any of them. */
  if (key === 'campaign') return ((d && d.played) || []).some((m) => m.countsGoals);

  /* ---- The twenty added in August ---------------------------------------
     Same contract as everything above: answer for a dataset holding almost
     nothing without throwing, because the deploy runs the generator and a
     record that threw here would fail the club's own publish. */
  const comp = (d && d.competitive) || [];
  const players = (d && d.players) || [];
  const some = (col) => players.some((p) => (Number(p[col]) || 0) > 0);

  /* One fixture is the next match, which the hero and `nextup` already carry.
     This band is what comes AFTER that, so one fixture is an empty band. */
  if (key === 'fixtures') return ((d && d.upcoming) || []).length > 1;
  if (key === 'lastout') return ((d && d.played) || []).length > 0;
  if (key === 'onthisday') return onThisDay(d).length > 0;
  if (key === 'streak') return currentRun(comp).length > 0;
  /* A split with one side to it is not a split. */
  if (key === 'competitions') return byCompetition(comp.filter((m) => m.played)).length > 1;
  if (key === 'homeaway') {
    const s = homeAwaySplit(comp.filter((m) => m.played));
    return s.home.played > 0 && s.away.played > 0;
  }
  if (key === 'headtohead') return opponentRecords(comp).length > 0;
  if (key === 'scorers') return some('goals');
  if (key === 'creators') return some('assists');
  if (key === 'appearances') return some('apps');
  if (key === 'motm') return some('motm');
  if (key === 'goalkinds') return goalKinds(comp).rows.length > 0;
  if (key === 'cleansheets') return teamSummary(comp.filter((m) => m.played)).cleanSheets > 0;
  if (key === 'potm') return potmLatest(d) != null;
  if (key === 'captains') return some('captained');
  if (key === 'newfaces') return newFaces(d).length > 0;
  /* COUNTED THE WAY THE BAND DRAWS IT. This asked `d.seasons.length > 1`,
     which counts seasons the club has a RECORD for, and the band draws one row
     per season with competitive matches PLAYED. In August those are two
     different numbers: 26/27 exists and holds six pre-season friendlies, so
     the switch promised a comparison and the page drew a single row. A band
     that empties itself on a different question from the one it renders is
     the panel promising something the page then declines. */
  if (key === 'seasons') return seasonsPlayed(d).length > 1;
  if (key === 'honours') return honoursIn(d).length > 0;
  if (key === 'back') return (SPONSOR_TIERS || []).length > 0;
  /* The club owns this link in Control panel -> Donations. With no link there
     is nowhere for the button to go, so the band is not published. */
  if (key === 'give') return !!(d && d.donate && (d.donate.clubUrl || d.donate.stripeLink));

  /* ---- The thirty added after them --------------------------------------
     Same contract again, and several of these are empty on the club's own
     records TODAY. That is the answer working, not a gap: `awaiting` is empty
     whenever the results are up to date, `preview` until somebody writes one,
     and both fill by themselves the moment the thing they read exists. */
  const played = (d && d.played) || [];
  const compPlayed = comp.filter((m) => m.played);

  if (key === 'preview') return !!previewFor(d);
  if (key === 'awaiting') return ((d && d.awaiting) || []).length > 0;
  if (key === 'leadnews') return ((d && d.articles) || []).length > 0;
  /* The club's own results are already the results band. This is the REST of
     the division, so a division where the club played every listed match has
     nothing to add. */
  if (key === 'aroundleague') return otherResults(d).length > 0;
  if (key === 'formations') return formationUse(comp).rows.length > 0;
  if (key === 'walkovers') return compPlayed.some((m) => m.isWalkover);
  if (key === 'margins') return winMargins(comp).rows.length > 0;
  if (key === 'everymatch') return played.length > 0;
  if (key === 'contributions') return players.some((p) => (p.goals || 0) + (p.assists || 0) > 0);
  if (key === 'leaguescorers') return ((d && d.leagueScorers) || []).length > 0;
  if (key === 'bigwins') return compPlayed.some((m) => m.outcome === 'W' && m.countsGoals);
  if (key === 'penalties') {
    const p = penaltyRecord(comp);
    return p.scored + p.missed + p.conceded > 0;
  }
  if (key === 'discipline') {
    const c = disciplineRecord(comp);
    return c.recorded > 0 && (c.yellow + c.red + c.conceded) > 0;
  }
  if (key === 'scorelines') return commonScorelines(comp).length > 0;
  /* One month is not a month-by-month. */
  if (key === 'months') return byMonth(comp).length > 1;
  if (key === 'leadership') return !!leadershipIn(d);
  if (key === 'positions') return squadShape((d && d.squad) || players).length > 0;
  if (key === 'scoringruns') return scoringRuns(players, comp).length > 0;
  if (key === 'recordholders') return recordHoldersIn(d).length > 0;
  if (key === 'follow') return (SOCIALS || []).length > 0;
  if (key === 'joinpaths') return (JOIN_PATHS || []).length > 0;
  if (key === 'joinfaqs') return (JOIN_FAQS || []).length > 0;
  /* Both forms always have somewhere to post: the table write is what records
     a lead, and it does not depend on a key being set. */
  if (key === 'contact' || key === 'newsletter') return true;
  if (key === 'firsts') return clubFirsts(comp).length > 0;
  if (key === 'reports') return reportsIn(d).length > 0;
  if (key === 'albums') return albumsIn(d).length > 0;
  if (key === 'clubswall') return opponentRecords(comp).length > 0;
  if (key === 'whatsinhere') return played.length > 0;
  if (key === 'venues') return venueRecords(comp).length > 0;
  return KNOWN.has(key);
}

/* ---- What the last few bands read ----------------------------------------
   Exported for the same reason the others are: the band and its emptiness
   test have to be answering one question, not two that agree today. */

/* The written preview for the match to come. `polishedPreview` first, because
   that is the one the panel's writer produces and the raw field is the
   coach's notes it was made from. */
export function previewFor(d) {
  const nx = d && d.nextFixture;
  const det = (nx && nx.detail) || {};
  const text = det.polishedPreview || det.preview || '';
  return String(text).trim() ? { fixture: nx, text: String(text).trim() } : null;
}

/* The division's other results: the ninety the site already holds under
   "Around the league", minus the club's own. Matched on either side naming
   the club, because the same rows carry it as home or away. */
export function otherResults(d) {
  const us = /sue.?s angels/i;
  return ((d && d.leagueResults) || [])
    .filter((r) => !us.test(String(r.home || '')) && !us.test(String(r.away || '')));
}

export function leadershipIn(d) {
  return ((d && d.recognition) || [])
    .filter((r) => r && r.type === 'leadership')
    .slice().sort((a, b) => String(b.season || '').localeCompare(String(a.season || '')))[0] || null;
}

/* The club records somebody has SET, which is a different list from the ones
   `clubRecords()` derives. Both are true and they are not the same thing: the
   archive can work out the biggest win, and it cannot work out who the first
   club captain was. */
export function recordHoldersIn(d) {
  return ((d && d.recognition) || []).filter((r) => r && r.type === 'club_record')
    .slice().sort((a, b) => String(b.season || '').localeCompare(String(a.season || '')));
}

/* ---- Four small derivations the bands and the panel both need -------------
   Here rather than in the template because `homeBandFilled` has to answer the
   same question the band will, and a second copy of the rule is a second
   chance for the switch to promise something the page then drops. */

/* Matches played on this date in an EARLIER year. Same day and month, and the
   year has to be behind us: an anniversary of something that happened today
   is just today. `d.todayISO` is the day the site was generated, derived once
   in dataset.mjs beside the fixture list so the two cannot disagree. */
export function onThisDay(d) {
  const today = (d && d.todayISO) || '';
  if (today.length < 10) return [];
  const md = today.slice(5);
  const year = today.slice(0, 4);
  return ((d && d.played) || [])
    .filter((m) => m.iso && m.iso.slice(5) === md && m.iso.slice(0, 4) < year)
    .sort((a, b) => String(b.iso).localeCompare(String(a.iso)));
}

/* A SEASON'S MONTHS IN THE ORDER A SEASON HAS THEM, which is not the order
   the calendar has them. A Player of the Month record carries a month NAME and
   a season, and no date at all, so "the latest one" has to be worked out from
   the name. Sorting on the row key instead picks whichever was typed in last:
   the club entered September, February and March, then went back and filled in
   January, and the front page would have led with January in May. */
const SEASON_MONTHS = ['August', 'September', 'October', 'November', 'December',
  'January', 'February', 'March', 'April', 'May', 'June', 'July'];
const monthRank = (m) => {
  const i = SEASON_MONTHS.indexOf(String(m || '').trim());
  /* A month nothing recognises sorts oldest rather than newest, so a typo can
     never take the front page off a real one. */
  return i < 0 ? -1 : i;
};

export function potmLatest(d) {
  const rows = ((d && d.recognition) || []).filter((r) => r && r.type === 'potm');
  if (!rows.length) return null;
  return rows.slice().sort((a, b) => String(b.season || '').localeCompare(String(a.season || ''))
    || monthRank(b.month) - monthRank(a.month)
    || String(b.key || b.id || '').localeCompare(String(a.key || a.id || '')))[0];
}

/* The seasons the club has actually played competitive football in, which is
   what "Every season" lists. A season the club has a record for but has not
   played a competitive match in yet is not a row. */
export function seasonsPlayed(d) {
  return ((d && d.seasons) || []).filter((s) =>
    ((d && d.competitive) || []).some((m) => m.played && m.season === s.name));
}

export function honoursIn(d) {
  return ((d && d.recognition) || []).filter((r) => r && r.type === 'trophy')
    .slice().sort((a, b) => String(b.season || '').localeCompare(String(a.season || '')));
}

/* IN THEIR FIRST SEASON AT THE CLUB, and derived rather than set, exactly as
   the squad pages derive it: the panel does not offer "new signing" as a
   choice, because that would be a second source for a fact the archive
   already answers. See src/lib/squad-status.mjs. */
export function newFaces(d) {
  const season = (d && d.latestSeason) || '';
  if (!season || !d || typeof d.statusLabelIn !== 'function') return [];
  return ((d && d.squad) || (d && d.players) || []).filter((p) => {
    const s = d.statusLabelIn(p.num, season);
    return s && s.key === 'new';
  });
}

/* ---- What each pick can choose from ---------------------------------------
   One definition, used by the page to resolve a pick and by the build to seed
   the panel's dropdown. The panel therefore cannot offer a match with no
   report, or an album that was deleted, because it is handed the same list the
   page reads. Ordered newest first: the first entry IS the derived default. */

/* `hasReport` rather than a second length test. What counts as a report is
   already decided once in prose.mjs ("long enough to be a report rather than a
   caption": three matches carry a scoreline in a sentence and do not qualify),
   and a band that disagreed with it would put a heading promising the full
   report over a note. */
export function reportsIn(d) {
  return ((d && d.played) || [])
    .filter(hasReport)
    .slice()
    .sort((a, b) => String(b.iso || '').localeCompare(String(a.iso || '')));
}

export function albumsIn(d) {
  return ((d && d.galleries) || []).slice()
    .sort((a, b) => String(b.matchIso || b.date || '').localeCompare(String(a.matchIso || a.date || '')));
}

/* Leading scorer first, so an untouched spotlight names whoever is having the
   season. Goals, then assists, then appearances, so it is never a coin toss
   that changes on rebuild. */
export function playersIn(d) {
  return ((d && d.players) || []).slice().sort((a, b) =>
    (b.goals || 0) - (a.goals || 0)
    || (b.assists || 0) - (a.assists || 0)
    || (b.starts || 0) - (a.starts || 0)
    || String(a.name || '').localeCompare(String(b.name || '')));
}

const CHOICES = { report: reportsIn, photos: albumsIn, spotlight: playersIn };
const IDENT = {
  report: (m) => String(m.id || m.slug || ''),
  photos: (g) => String(g.key || g.slug || ''),
  spotlight: (p) => String(p.num),
};

/* THE ITEM A BAND PUBLISHES: the club's pick when it still resolves, and the
   derived default otherwise.

   "Otherwise" is doing real work. A pick is a pointer into content the club
   edits elsewhere, so it can be aimed at a match whose report was cleared, an
   album that was deleted or a player who left. Falling back to the newest
   keeps the band publishing something true rather than leaving a heading over
   a hole, and the panel says when a pick has stopped resolving. */
export function featuredFor(key, rec, d) {
  const list = (CHOICES[key] || (() => []))(d);
  if (!list.length) return null;
  const want = rec && rec.pick && rec.pick[key];
  if (want == null || want === '') return list[0];
  const ident = IDENT[key];
  return list.find((x) => ident(x) === String(want)) || list[0];
}

/* Whether the club's pick is the one being published, for the panel to say so
   plainly rather than showing a chosen name beside a different picture. */
export function pickResolves(key, rec, d) {
  const want = rec && rec.pick && rec.pick[key];
  if (want == null || want === '') return true;
  const list = (CHOICES[key] || (() => []))(d);
  const ident = IDENT[key];
  return list.some((x) => ident(x) === String(want));
}

/* Turn the stored record into an order and a hidden set.

   Three properties, each of them the fix for a way this could rot:

   1. A name this file has never heard of is DROPPED. A band removed from the
      site leaves its name behind in a record nobody edits again, and reading
      it back would put an undefined into the page.

   2. A band the record does not name is INSERTED WHERE IT BELONGS, not
      appended. Adding a ninth band next season would otherwise land it at the
      bottom of the page for every club that has ever touched this screen, and
      look like a bug in the new band rather than in this function. It goes
      after the nearest band above it that the stored order does hold, so a
      new band arrives among its own neighbours.

   3. Hiding is a SEPARATE list from the order. Turning a band off and on again
      puts it back where it was rather than at the end, which is what makes
      this safe to experiment with. */
export function resolveHomeLayout(rec) {
  const raw = (rec && Array.isArray(rec.order)) ? rec.order : [];
  const seen = new Set();
  const order = [];
  for (const k of raw) {
    if (!KNOWN.has(k) || seen.has(k)) continue;
    seen.add(k);
    order.push(k);
  }

  HOME_BANDS.forEach((b, i) => {
    if (seen.has(b.key)) return;
    let at = 0;
    for (let j = i - 1; j >= 0; j -= 1) {
      const p = order.indexOf(HOME_BANDS[j].key);
      if (p >= 0) { at = p + 1; break; }
    }
    order.splice(at, 0, b.key);
    seen.add(b.key);
  });

  /* OFF UNTIL ASKED FOR, and asked for means NAMED IN THE ORDER.

     A band added to the site after a club has already arranged its home page
     must not switch itself on for them. Reading `hidden` alone would do
     exactly that: an existing record says `hidden: []`, which is authoritative
     and does not mention a band that did not exist when it was written, so
     every new band would arrive already published on every site that had ever
     touched this screen.

     The order is the tell. The panel always writes every band it knows into
     `order`, so a band missing from a stored order is one the record predates,
     and a default-off band that nobody has opted into stays off. */
  const named = new Set(raw.filter((k) => KNOWN.has(k)));
  const hidden = new Set(
    ((rec && Array.isArray(rec.hidden)) ? rec.hidden : []).filter((k) => KNOWN.has(k)),
  );
  for (const b of HOME_BANDS) {
    if (b.off && !named.has(b.key)) hidden.add(b.key);
  }

  const defaultHidden = HOME_BANDS.filter((b) => b.off).map((b) => b.key).join(',');
  return {
    order,
    hidden,
    /* True when this is the page as it ships, which is what lets the panel say
       "the standard order" rather than describing a change nobody made. */
    isDefault: order.join(',') === KEYS.join(',')
      && [...hidden].sort().join(',') === defaultHidden.split(',').sort().join(','),
  };
}

/* The bands actually published, in order, for a given dataset: chosen, not
   hidden, and not empty. This is the list the page draws AND the list the
   reference strip numbers 01, 02, 03 from, so a hidden band cannot leave a
   gap in the numbering. */
export function publishedBands(rec, d) {
  const { order, hidden } = resolveHomeLayout(rec);
  return order.filter((k) => !hidden.has(k) && homeBandFilled(k, d));
}

export const HOME_BAND_KEYS = KEYS;
