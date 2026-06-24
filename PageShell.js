/* YouTube channel config — set SA_YT_CHANNEL_ID (UC...) once the channel exists to enable the Live embed */
window.SA_YT_CHANNEL_ID = window.SA_YT_CHANNEL_ID || "";
window.SA_YT_HANDLE = window.SA_YT_HANDLE || "suesangelsfc";
// PageHero.jsx - shared compact page header used by every sub-page
function PageHero({
  eyebrow,
  title,
  sub,
  children
}) {
  return /*#__PURE__*/React.createElement("section", {
    className: "page-hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-hero__inner"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "t-eyebrow"
  }, eyebrow), /*#__PURE__*/React.createElement("h1", {
    className: "page-hero__title"
  }, title), sub && /*#__PURE__*/React.createElement("p", {
    className: "page-hero__sub"
  }, sub)), children && /*#__PURE__*/React.createElement("div", {
    className: "page-hero__actions"
  }, children))));
}

// PlaceholderTile - used everywhere copy/photo will be added later
function PlaceholderTile({
  label,
  hint,
  tall = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: `placeholder ${tall ? 'placeholder--tall' : ''}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "placeholder__inner"
  }, /*#__PURE__*/React.createElement("span", {
    className: "t-eyebrow",
    style: {
      color: 'var(--volt)'
    }
  }, label || 'TBA'), hint && /*#__PURE__*/React.createElement("span", {
    className: "placeholder__hint"
  }, hint)));
}
window.PageHero = PageHero;
window.PlaceholderTile = PlaceholderTile;

// ─────────────────────────────────────────────────────────────────────────
// CLUB DATA - single source of truth, used by every page on the site.
// Update these arrays as the season progresses; every component re-derives.
// ─────────────────────────────────────────────────────────────────────────

// League Ten standings (FA Fulltime · 25/26 · updated 31 May 26 after Hillside win - season complete).
window.RAW_TABLE = [{
  p: 1,
  c: "Sue's Angels FC",
  pl: 18,
  w: 18,
  d: 0,
  l: 0,
  gf: 90,
  ga: 11,
  gd: '+79',
  pts: 54,
  us: true
}, {
  p: 2,
  c: 'Brockwell Violets FC',
  pl: 18,
  w: 10,
  d: 3,
  l: 5,
  gf: 54,
  ga: 28,
  gd: '+26',
  pts: 33
}, {
  p: 3,
  c: 'Hillside Elite FC Blues',
  pl: 18,
  w: 9,
  d: 4,
  l: 5,
  gf: 33,
  ga: 24,
  gd: '+9',
  pts: 31
}, {
  p: 4,
  c: "BPR Men's",
  pl: 18,
  w: 8,
  d: 4,
  l: 6,
  gf: 44,
  ga: 38,
  gd: '+6',
  pts: 28
}, {
  p: 5,
  c: 'Dynamo London FC',
  pl: 18,
  w: 7,
  d: 5,
  l: 6,
  gf: 36,
  ga: 40,
  gd: '-4',
  pts: 26
}, {
  p: 6,
  c: 'Sporting Club Catania',
  pl: 18,
  w: 7,
  d: 1,
  l: 10,
  gf: 23,
  ga: 35,
  gd: '-12',
  pts: 22
}, {
  p: 7,
  c: 'Pure Football FC 2.0',
  pl: 18,
  w: 6,
  d: 2,
  l: 10,
  gf: 34,
  ga: 64,
  gd: '-30',
  pts: 20
}, {
  p: 8,
  c: "Old Freemen's",
  pl: 18,
  w: 5,
  d: 2,
  l: 11,
  gf: 28,
  ga: 36,
  gd: '-8',
  pts: 17
}, {
  p: 9,
  c: "Shepherd's Tuesday",
  pl: 18,
  w: 5,
  d: 2,
  l: 11,
  gf: 28,
  ga: 36,
  gd: '-8',
  pts: 17
}, {
  p: 10,
  c: 'Balham Bteckerz',
  pl: 18,
  w: 3,
  d: 1,
  l: 14,
  gf: 20,
  ga: 78,
  gd: '-58',
  pts: 10
}];
window.LEAGUE_TOTAL_GAMES = 18;
window.LEAGUE_PROMOTION_SPOTS = 2;

// Division leading scorers (FA Fulltime · Southern Sunday Football League · 25/26,
// season complete). Two views: `all` = all competitions, `league` = League Ten only.
// `us: true` flags a Sue's Angels player. Editable later via the admin importer.
window.LEAGUE_STATS = {
  all: [
    { pos: 1, name: 'Frazier-Isaías Osunkoya', club: "Sue's Angels FC", g: 25, a: 18, ap: 19, us: true },
    { pos: 2, name: 'Charlie Dunkley', club: "Sue's Angels FC", g: 18, a: 18, ap: 19, us: true },
    { pos: 3, name: 'Dwayne Thomas', club: 'Hillside Elite FC Blues', g: 18, a: 20, ap: 21 },
    { pos: 4, name: 'Stephen Potter', club: "Sue's Angels FC", g: 17, a: 13, ap: 16, us: true },
    { pos: 5, name: 'Mohammad Idrees Qandahari', club: 'Dynamo London FC', g: 12, a: 6, ap: 7 },
    { pos: 6, name: 'Rajay Willis', club: "BPR Men's", g: 11, a: 8, ap: 11 },
    { pos: 7, name: 'Rayan Alhajeri', club: 'Pure Football FC 2.0', g: 10, a: 6, ap: 6 },
    { pos: 8, name: 'Charlie Green', club: 'Brockwell Violets FC', g: 10, a: 9, ap: 10 },
    { pos: 9, name: 'Daniel McLane', club: "Sue's Angels FC", g: 9, a: 20, ap: 20, us: true },
    { pos: 10, name: 'Malachi Mullings', club: "Sue's Angels FC", g: 9, a: 7, ap: 14, us: true },
    { pos: 11, name: 'Oluwatimilehin Otudeko', club: 'Brockwell Violets FC', g: 9, a: 7, ap: 8 },
    { pos: 12, name: 'Andrew Allen', club: "Sue's Angels FC", g: 8, a: 8, ap: 23, us: true },
    { pos: 13, name: 'Jason Pingisi', club: "BPR Men's", g: 8, a: 8, ap: 16 },
    { pos: 14, name: 'Jordan El-Balawi', club: 'Brockwell Violets FC', g: 7, a: 4, ap: 6 },
    { pos: 15, name: 'Vishay Unauth', club: 'Sporting Club Catania', g: 7, a: 3, ap: 17 },
    { pos: 16, name: 'Romeo Chris-Collins Ahouzan', club: 'Sporting Club Catania', g: 6, a: 3, ap: 12 },
    { pos: 17, name: 'William Clark', club: "Sue's Angels FC", g: 6, a: 8, ap: 12, us: true },
    { pos: 18, name: 'Philip Coe', club: 'Brockwell Violets FC', g: 6, a: 15, ap: 15 },
    { pos: 19, name: 'Danny Jackson', club: "Sue's Angels FC", g: 6, a: 6, ap: 10, us: true },
    { pos: 20, name: 'Stewart Luwawa', club: "Sue's Angels FC", g: 6, a: 3, ap: 24, us: true },
    { pos: 21, name: 'Callum Mabey', club: "BPR Men's", g: 6, a: 1, ap: 18 },
    { pos: 22, name: 'Rory Mannion', club: 'Hillside Elite FC Blues', g: 6, a: 13, ap: 13 },
    { pos: 23, name: 'Osman Payet Conteh', club: 'Dynamo London FC', g: 6, a: 6, ap: 8 },
    { pos: 24, name: 'Ayub Ali', club: 'Pure Football FC 2.0', g: 5, a: 9, ap: 9 },
    { pos: 25, name: 'Josh Bolton', club: "Shepherd's Tuesday", g: 5, a: 16, ap: 16 }
  ],
  league: [
    { pos: 1, name: 'Frazier-Isaías Osunkoya', club: "Sue's Angels FC", g: 18, a: 11, ap: 11, us: true },
    { pos: 2, name: 'Charlie Dunkley', club: "Sue's Angels FC", g: 14, a: 9, ap: 10, us: true },
    { pos: 3, name: 'Dwayne Thomas', club: 'Hillside Elite FC Blues', g: 14, a: null, ap: 14 },
    { pos: 4, name: 'Stephen Potter', club: "Sue's Angels FC", g: 13, a: 10, ap: 11, us: true },
    { pos: 5, name: 'Rajay Willis', club: "BPR Men's", g: 11, a: 8, ap: 10 },
    { pos: 6, name: 'Rayan Alhajeri', club: 'Pure Football FC 2.0', g: 10, a: 6, ap: 6 },
    { pos: 7, name: 'Charlie Green', club: 'Brockwell Violets FC', g: 8, a: 7, ap: 7 },
    { pos: 8, name: 'Oluwatimilehin Otudeko', club: 'Brockwell Violets FC', g: 8, a: 6, ap: 7 },
    { pos: 9, name: 'Jordan El-Balawi', club: 'Brockwell Violets FC', g: 7, a: 3, ap: 5 },
    { pos: 10, name: 'Jason Pingisi', club: "BPR Men's", g: 7, a: 8, ap: 13 },
    { pos: 11, name: 'Andrew Allen', club: "Sue's Angels FC", g: 6, a: 7, ap: 14, us: true },
    { pos: 12, name: 'William Clark', club: "Sue's Angels FC", g: 6, a: 3, ap: 7, us: true },
    { pos: 13, name: 'Philip Coe', club: 'Brockwell Violets FC', g: 6, a: 14, ap: 14 },
    { pos: 14, name: 'Stewart Luwawa', club: "Sue's Angels FC", g: 6, a: 3, ap: 14, us: true },
    { pos: 15, name: 'Callum Mabey', club: "BPR Men's", g: 6, a: 1, ap: 15 },
    { pos: 16, name: 'Rory Mannion', club: 'Hillside Elite FC Blues', g: 6, a: 8, ap: 8 },
    { pos: 17, name: 'Malachi Mullings', club: "Sue's Angels FC", g: 6, a: 6, ap: 7, us: true },
    { pos: 18, name: 'Osman Payet Conteh', club: 'Dynamo London FC', g: 6, a: 5, ap: 7 },
    { pos: 19, name: 'Mohammad Idrees Qandahari', club: 'Dynamo London FC', g: 6, a: 2, ap: 2 },
    { pos: 20, name: 'Romeo Chris-Collins Ahouzan', club: 'Sporting Club Catania', g: 5, a: 2, ap: 10 },
    { pos: 21, name: 'Christian Chatterton', club: "Old Freemen's", g: 5, a: 10, ap: 10 },
    { pos: 22, name: 'Kagiso Mello', club: 'Brockwell Violets FC', g: 5, a: 8, ap: 10 },
    { pos: 23, name: 'Josiah Miles', club: "BPR Men's", g: 5, a: 1, ap: 11 },
    { pos: 24, name: 'Vishay Unauth', club: 'Sporting Club Catania', g: 5, a: 3, ap: 14 },
    { pos: 25, name: 'Melchizdec Marston', club: 'Hillside Elite FC Blues', g: 5, a: 1, ap: 15 }
  ]
};

// Full League Ten results across the division (FA Fulltime · 25/26, season
// complete), most recent first. `wo` marks a walkover ('home'|'away' = winner).
// Lets visitors see the whole league, not just Sue's Angels. Editable later via
// the admin importer.
window.LEAGUE_RESULTS = [
  { date: '31 May 26', home: "Sue's Angels FC", hs: 2, as: 0, away: 'Hillside Elite FC Blues' },
  { date: '24 May 26', home: "BPR Men's", hs: 2, as: 4, away: "Sue's Angels FC" },
  { date: '24 May 26', home: 'Hillside Elite FC Blues', hs: 2, as: 1, away: "Shepherd's Tuesday" },
  { date: '17 May 26', home: 'Hillside Elite FC Blues', hs: 2, as: 0, away: 'Brockwell Violets FC' },
  { date: '10 May 26', home: 'Brockwell Violets FC', hs: 1, as: 3, away: "Sue's Angels FC" },
  { date: '10 May 26', home: 'Hillside Elite FC Blues', hs: 4, as: 2, away: 'Balham Bteckerz' },
  { date: '3 May 26', home: "Sue's Angels FC", hs: 6, as: 1, away: 'Dynamo London FC' },
  { date: '3 May 26', home: 'Hillside Elite FC Blues', hs: 2, as: 0, away: 'Sporting Club Catania' },
  { date: '26 Apr 26', home: "Sue's Angels FC", hs: 10, as: 1, away: 'Sporting Club Catania' },
  { date: '26 Apr 26', home: 'Hillside Elite FC Blues', hs: 1, as: 2, away: "BPR Men's" },
  { date: '19 Apr 26', home: "Sue's Angels FC", hs: 9, as: 0, away: 'Balham Bteckerz' },
  { date: '19 Apr 26', home: 'Hillside Elite FC Blues', hs: 0, as: 2, away: 'Pure Football FC 2.0' },
  { date: '12 Apr 26', home: 'Brockwell Violets FC', hs: 9, as: 0, away: 'Pure Football FC 2.0' },
  { date: '29 Mar 26', home: 'Dynamo London FC', hs: 2, as: 3, away: 'Pure Football FC 2.0' },
  { date: '29 Mar 26', home: 'Brockwell Violets FC', hs: 3, as: 0, away: "Old Freemen's" },
  { date: '29 Mar 26', home: "Shepherd's Tuesday", hs: 0, as: 0, away: 'Hillside Elite FC Blues' },
  { date: '15 Mar 26', home: 'Balham Bteckerz', hs: 3, as: 2, away: 'Dynamo London FC' },
  { date: '15 Mar 26', home: "Old Freemen's", away: 'Sporting Club Catania', wo: 'away' },
  { date: '15 Mar 26', home: 'Brockwell Violets FC', hs: 2, as: 5, away: "Shepherd's Tuesday" },
  { date: '8 Mar 26', home: 'Brockwell Violets FC', hs: 2, as: 2, away: 'Dynamo London FC' },
  { date: '8 Mar 26', home: "Shepherd's Tuesday", hs: 3, as: 2, away: "Old Freemen's" },
  { date: '8 Mar 26', home: 'Sporting Club Catania', away: "BPR Men's", wo: 'home' },
  { date: '1 Mar 26', home: "Old Freemen's", away: "Sue's Angels FC", wo: 'away' },
  { date: '1 Mar 26', home: "Shepherd's Tuesday", hs: 1, as: 5, away: "Sue's Angels FC" },
  { date: '1 Mar 26', home: 'Sporting Club Catania', hs: 1, as: 2, away: 'Brockwell Violets FC' },
  { date: '22 Feb 26', home: 'Brockwell Violets FC', hs: 6, as: 0, away: 'Balham Bteckerz' },
  { date: '22 Feb 26', home: "Shepherd's Tuesday", hs: 1, as: 2, away: 'Dynamo London FC' },
  { date: '8 Feb 26', home: 'Pure Football FC 2.0', hs: 3, as: 3, away: 'Balham Bteckerz' },
  { date: '1 Feb 26', home: 'Pure Football FC 2.0', hs: 0, as: 4, away: 'Sporting Club Catania' },
  { date: '1 Feb 26', home: "Sue's Angels FC", hs: 4, as: 2, away: "BPR Men's" },
  { date: '25 Jan 26', home: 'Balham Bteckerz', hs: 2, as: 10, away: "BPR Men's" },
  { date: '25 Jan 26', home: 'Pure Football FC 2.0', hs: 0, as: 7, away: 'Brockwell Violets FC' },
  { date: '25 Jan 26', home: 'Sporting Club Catania', away: "Old Freemen's", wo: 'away' },
  { date: '18 Jan 26', home: 'Balham Bteckerz', hs: 0, as: 12, away: "Sue's Angels FC" },
  { date: '18 Jan 26', home: 'Pure Football FC 2.0', hs: 0, as: 4, away: 'Hillside Elite FC Blues' },
  { date: '18 Jan 26', home: 'Brockwell Violets FC', hs: 6, as: 0, away: 'Sporting Club Catania' },
  { date: '11 Jan 26', home: "BPR Men's", hs: 4, as: 2, away: 'Pure Football FC 2.0' },
  { date: '11 Jan 26', home: "Old Freemen's", hs: 3, as: 5, away: 'Dynamo London FC' },
  { date: '4 Jan 26', home: 'Dynamo London FC', hs: 7, as: 4, away: "BPR Men's" },
  { date: '14 Dec 25', home: 'Balham Bteckerz', hs: 1, as: 3, away: 'Sporting Club Catania' },
  { date: '14 Dec 25', home: 'Pure Football FC 2.0', hs: 3, as: 2, away: "Shepherd's Tuesday" },
  { date: '14 Dec 25', home: "BPR Men's", hs: 2, as: 6, away: 'Hillside Elite FC Blues' },
  { date: '7 Dec 25', home: "Old Freemen's", away: "BPR Men's", wo: 'away' },
  { date: '7 Dec 25', home: 'Sporting Club Catania', hs: 1, as: 3, away: "Shepherd's Tuesday" },
  { date: '30 Nov 25', home: "Shepherd's Tuesday", hs: 4, as: 0, away: 'Balham Bteckerz' },
  { date: '23 Nov 25', home: 'Pure Football FC 2.0', hs: 0, as: 3, away: "BPR Men's" },
  { date: '23 Nov 25', home: 'Dynamo London FC', hs: 2, as: 0, away: "Old Freemen's" },
  { date: '23 Nov 25', home: 'Sporting Club Catania', away: "Sue's Angels FC", wo: 'away' },
  { date: '16 Nov 25', home: 'Balham Bteckerz', hs: 0, as: 3, away: "Shepherd's Tuesday" },
  { date: '16 Nov 25', home: "BPR Men's", hs: 1, as: 1, away: 'Brockwell Violets FC' },
  { date: '16 Nov 25', home: "Old Freemen's", hs: 3, as: 3, away: 'Pure Football FC 2.0' },
  { date: '16 Nov 25', home: 'Hillside Elite FC Blues', hs: 0, as: 0, away: 'Dynamo London FC' },
  { date: '9 Nov 25', home: "Old Freemen's", hs: 1, as: 4, away: 'Brockwell Violets FC' },
  { date: '9 Nov 25', home: 'Pure Football FC 2.0', hs: 1, as: 7, away: "Sue's Angels FC" },
  { date: '9 Nov 25', home: 'Dynamo London FC', hs: 1, as: 0, away: 'Sporting Club Catania' },
  { date: '9 Nov 25', home: "Shepherd's Tuesday", hs: 1, as: 1, away: "BPR Men's" },
  { date: '2 Nov 25', home: 'Balham Bteckerz', hs: 2, as: 5, away: "Old Freemen's" },
  { date: '2 Nov 25', home: 'Dynamo London FC', hs: 2, as: 0, away: 'Brockwell Violets FC' },
  { date: '2 Nov 25', home: "Sue's Angels FC", away: "Shepherd's Tuesday", wo: 'home' },
  { date: '26 Oct 25', home: "Old Freemen's", hs: 2, as: 0, away: 'Balham Bteckerz' },
  { date: '26 Oct 25', home: 'Dynamo London FC', hs: 2, as: 2, away: 'Hillside Elite FC Blues' },
  { date: '26 Oct 25', home: 'Sporting Club Catania', hs: 2, as: 1, away: 'Pure Football FC 2.0' },
  { date: '19 Oct 25', home: 'Balham Bteckerz', hs: 2, as: 8, away: 'Pure Football FC 2.0' },
  { date: '19 Oct 25', home: "BPR Men's", hs: 2, as: 2, away: 'Dynamo London FC' },
  { date: '19 Oct 25', home: "Shepherd's Tuesday", hs: 0, as: 4, away: 'Brockwell Violets FC' },
  { date: '19 Oct 25', home: 'Sporting Club Catania', hs: 1, as: 3, away: 'Hillside Elite FC Blues' },
  { date: '19 Oct 25', home: "Sue's Angels FC", hs: 7, as: 2, away: "Old Freemen's" },
  { date: '12 Oct 25', home: 'Dynamo London FC', hs: 1, as: 3, away: 'Balham Bteckerz' },
  { date: '12 Oct 25', home: 'Pure Football FC 2.0', hs: 1, as: 4, away: "Old Freemen's" },
  { date: '12 Oct 25', home: 'Brockwell Violets FC', hs: 4, as: 4, away: "BPR Men's" },
  { date: '12 Oct 25', home: 'Hillside Elite FC Blues', hs: 0, as: 5, away: "Sue's Angels FC" },
  { date: '12 Oct 25', home: "Shepherd's Tuesday", hs: 0, as: 4, away: 'Sporting Club Catania' },
  { date: '5 Oct 25', home: 'Balham Bteckerz', hs: 0, as: 2, away: 'Hillside Elite FC Blues' },
  { date: '5 Oct 25', home: "BPR Men's", hs: 2, as: 1, away: "Old Freemen's" },
  { date: '5 Oct 25', home: "Shepherd's Tuesday", hs: 2, as: 4, away: 'Pure Football FC 2.0' },
  { date: '5 Oct 25', home: "Sue's Angels FC", hs: 6, as: 0, away: 'Brockwell Violets FC' },
  { date: '28 Sep 25', home: 'Dynamo London FC', hs: 0, as: 5, away: "Sue's Angels FC" },
  { date: '21 Sep 25', home: 'Balham Bteckerz', hs: 0, as: 1, away: 'Brockwell Violets FC' },
  { date: '21 Sep 25', home: "BPR Men's", hs: 3, as: 1, away: 'Sporting Club Catania' },
  { date: '21 Sep 25', home: 'Dynamo London FC', hs: 2, as: 1, away: "Shepherd's Tuesday" },
  { date: '21 Sep 25', home: 'Hillside Elite FC Blues', hs: 2, as: 1, away: "Old Freemen's" },
  { date: '21 Sep 25', home: "Sue's Angels FC", hs: 5, as: 0, away: 'Pure Football FC 2.0' },
  { date: '14 Sep 25', home: "Old Freemen's", hs: 2, as: 2, away: 'Hillside Elite FC Blues' },
  { date: '14 Sep 25', home: 'Pure Football FC 2.0', hs: 3, as: 1, away: 'Dynamo London FC' },
  { date: '14 Sep 25', home: "BPR Men's", hs: 2, as: 1, away: "Shepherd's Tuesday" },
  { date: '14 Sep 25', home: 'Sporting Club Catania', hs: 3, as: 1, away: 'Balham Bteckerz' },
  { date: '7 Sep 25', home: "Old Freemen's", hs: 2, as: 0, away: "Shepherd's Tuesday" },
  { date: '7 Sep 25', home: 'Brockwell Violets FC', hs: 2, as: 1, away: 'Hillside Elite FC Blues' },
  { date: '7 Sep 25', home: 'Sporting Club Catania', hs: 2, as: 2, away: 'Dynamo London FC' },
  { date: '7 Sep 25', home: "BPR Men's", hs: 0, as: 1, away: 'Balham Bteckerz' }
];

// ─── Auto-promote played fixtures into results ──────────────────────────
// Parse a fixture id like 'f20260524-bpr' or 'r20260510-brockwell' into a Date.
window.getFixtureDate = function (fx) {
  const m = /(\d{4})(\d{2})(\d{2})/.exec(fx.id || '');
  return m ? new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10)) : null;
};
const MONTHS_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Full kickoff datetime = fixture day + its kick time (e.g. '11:00'). If no kick
// time is recorded, fall back to end-of-day so it only moves after that day.
window.getFixtureKickoff = function (fx) {
  const d = window.getFixtureDate(fx);
  if (!d) return null;
  const km = /(\d{1,2}):(\d{2})/.exec(fx.kick || fx.kickoff || '');
  if (km) d.setHours(parseInt(km[1], 10), parseInt(km[2], 10), 0, 0);else d.setHours(23, 59, 59, 999);
  return d;
};

// A fixture moves into results once its kickoff date AND time have passed.
// The score is derived from the match-entry data the coach fills in.
window.promoteExpiredFixtures = function (now = new Date()) {
  const promoted = [];
  const source = typeof window.getMergedUpcoming === 'function' ? window.getMergedUpcoming() : window.UPCOMING_FIXTURES || [];
  for (const fx of source) {
    const d = window.getFixtureDate(fx);
    if (!d) continue;
    // Kickoff datetime must be in the past (date + time) to count.
    const kickoff = window.getFixtureKickoff(fx);
    if (kickoff && now.getTime() < kickoff.getTime()) continue;
    const entry = window.loadMatchEntry ? window.loadMatchEntry(fx.id) : null;
    const goalsUs = entry ? (entry.goals || []).length : 0;
    const goalsThem = entry ? (entry.opponentGoals || []).length : 0;
    const usHome = fx.home.includes('Angels');
    const dateStr = `${String(d.getDate()).padStart(2, '0')} ${MONTHS_ABBR[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
    promoted.push({
      id: fx.id,
      date: dateStr,
      kick: fx.kick,
      home: fx.home,
      away: fx.away,
      hs: usHome ? goalsUs : goalsThem,
      as: usHome ? goalsThem : goalsUs,
      kind: 'score',
      competition: fx.comp,
      venue: fx.ven,
      autoPromoted: true,
      pending: !entry || (!entry.goals || !entry.goals.length) && (!entry.opponentGoals || !entry.opponentGoals.length)
    });
  }
  return promoted;
};

// All results = manually-recorded SEASON_RESULTS + any auto-promoted fixtures,
// sorted by date desc. Auto-promoted ones go to the top of the list.
window.getDerivedResults = function (now = new Date()) {
  const promoted = window.promoteExpiredFixtures(now);
  const promotedIds = new Set(promoted.map(r => r.id));
  const manual = (window.SEASON_RESULTS || []).filter(r => !promotedIds.has(r.id));
  // Sort everything together by date string (DD MMM YY).
  const parse = s => {
    const m = /^(\d{1,2})\s+(\w{3})\s+(\d{2})$/.exec((s || '').trim());
    if (!m) return new Date(0);
    return new Date(2000 + parseInt(m[3], 10), MONTHS_ABBR.indexOf(m[2]), parseInt(m[1], 10));
  };
  return [...promoted, ...manual].sort((a, b) => parse(b.date) - parse(a.date));
};

// Active upcoming = fixtures whose kickoff datetime is still in the future.
window.getActiveUpcoming = function (now = new Date()) {
  return (window.UPCOMING_FIXTURES || []).filter(fx => {
    const kickoff = window.getFixtureKickoff(fx);
    return !kickoff || now.getTime() < kickoff.getTime();
  });
};

// Season info - drives "is the season live? / between seasons? / next season open?" logic.
window.SEASON_INFO = {
  current: {
    name: '25/26',
    startISO: '2025-09-01',
    endISO: '2026-05-31',
    league: 'League Ten',
    status: 'CHAMPIONS'
  },
  next: {
    name: '26/27',
    startISO: '2026-09-01',
    endISO: '2027-05-31',
    league: 'TBC',
    status: 'PENDING'
  }
};
window.getSeasonState = function (now = new Date()) {
  const cur = window.SEASON_INFO.current;
  const next = window.SEASON_INFO.next;
  const curEnd = new Date(cur.endISO);
  const nextStart = new Date(next.startISO);
  if (now <= curEnd) return {
    phase: 'active',
    season: cur,
    next
  };
  if (now < nextStart) return {
    phase: 'between',
    season: cur,
    next
  };
  return {
    phase: 'next',
    season: next,
    next: null
  };
};
window.daysUntilNextSeason = function (now = new Date()) {
  const nextStart = new Date(window.SEASON_INFO.next.startISO);
  return Math.max(0, Math.ceil((nextStart - now) / 86400000));
};

// Pre-season training schedule. First session pushed back to 1 July 2026
// 19:00–20:30 (extreme heat warning over the original 24 June date), then
// every Sunday 10:00–12:30 at the home ground. getNextSession returns the next
// session whose end time is still in the future (so it rolls over automatically).
window.PRESEASON = {
  firstISO: '2026-07-01T19:00:00',
  venue: 'Home ground'
};
window.getNextSession = function (now = new Date()) {
  const mk = (y, mo, d, h, mi) => new Date(y, mo, d, h, mi, 0, 0);
  const sessions = [{
    start: mk(2026, 6, 1, 19, 0),
    s: '19:00',
    e: '20:30'
  }];
  // First Sunday strictly after 1 July 2026, then weekly for ~30 weeks.
  let d = mk(2026, 6, 1, 10, 0);
  do {
    d.setDate(d.getDate() + 1);
  } while (d.getDay() !== 0);
  for (let i = 0; i < 30; i++) {
    sessions.push({
      start: mk(d.getFullYear(), d.getMonth(), d.getDate(), 10, 0),
      s: '10:00',
      e: '12:30'
    });
    d.setDate(d.getDate() + 7);
  }
  sessions.sort((a, b) => a.start - b.start);
  for (const ss of sessions) {
    const [eh, em] = ss.e.split(':').map(Number);
    const end = new Date(ss.start);
    end.setHours(eh, em, 0, 0);
    if (end.getTime() > now.getTime()) {
      return {
        startISO: ss.start.toISOString(),
        dayName: ss.start.toLocaleDateString('en-GB', {
          weekday: 'short'
        }).toUpperCase(),
        dateStr: ss.start.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short'
        }),
        timeStr: ss.s + '\u2013' + ss.e,
        venue: window.PRESEASON.venue
      };
    }
  }
  return null;
};
window.TABLE_INSIGHTS = function () {
  return window.tableInsights(window.RAW_TABLE, window.LEAGUE_TOTAL_GAMES, window.LEAGUE_PROMOTION_SPOTS);
};

// 25/26 season results (most recent first). Includes League Ten + Dylan Rigobert Trophy cup run.
//
// SEASON ARCHITECTURE - Foundation
// ────────────────────────────────
// Every result / fixture / squad entry implicitly belongs to CURRENT_SEASON.
// When 26/27 starts:
//   1.  Add '26/27' to window.ALL_SEASONS and set CURRENT_SEASON.
//   2.  Add a `season: '26/27'` field to new results / fixtures (existing ones
//       continue to default to '25/26' via window.seasonOf()).
//   3.  Page-level components can filter via window.bySeasonOf(items, season).
//   4.  Aggregate / all-time stats: leave `season` undefined in the filter and
//       derivedPlayerStats will count across every entry - historic top scorer,
//       most apps, longest unbeaten run, etc.
window.CURRENT_SEASON = '25/26';
window.ALL_SEASONS = ['25/26', '26/27']; // Append new seasons here. UI builds pickers from this list.

// Resolve which season a result/fixture/match-entry belongs to.
// Falls back to CURRENT_SEASON so existing untagged data still works.
window.seasonOf = item => item && item.season || window.CURRENT_SEASON;

// Filter helper: returns items in `season`, or all items when season === 'all'.
window.bySeasonOf = (items, season) => !season || season === 'all' ? items : (items || []).filter(i => window.seasonOf(i) === season);
window.SEASON_RESULTS = [
// League Ten - Hillside home (31 May 26, won 2-0 - final game, season complete unbeaten)
{
  id: 'f20260531-hillside',
  date: '31 May 26',
  kick: '11:00',
  home: "Sue's Angels FC",
  away: 'Hillside Elite FC Blues',
  hs: 2,
  as: 0,
  kind: 'score',
  competition: 'League Ten',
  venue: 'The Reeves Sports Club'
},
// League Ten - BPR away (24 May 26, won 4-2)
{
  id: 'f20260524-bpr',
  date: '24 May 26',
  kick: '11:00',
  home: "BPR Men's",
  away: "Sue's Angels FC",
  hs: 2,
  as: 4,
  kind: 'score',
  competition: 'League Ten',
  venue: 'The Reeves Sports Club'
},
// Dylan Rigobert Trophy - Final (lost 0-3)
{
  id: 'r20260517-portolondon-drt',
  date: '17 May 26',
  kick: '11:00',
  home: 'FC Porto of London',
  away: "Sue's Angels FC",
  hs: 3,
  as: 0,
  kind: 'score',
  competition: 'Dylan Rigobert Trophy',
  round: 'Final'
},
// League Ten
{
  id: 'r20260510-brockwell',
  date: '10 May 26',
  kick: '12:00',
  home: 'Brockwell Violets FC',
  away: "Sue's Angels FC",
  hs: 1,
  as: 3,
  kind: 'score',
  competition: 'League Ten',
  venue: 'Prince Georges Playing Fields'
}, {
  id: 'r20260503-dynamo',
  date: '03 May 26',
  kick: '11:00',
  home: "Sue's Angels FC",
  away: 'Dynamo London FC',
  hs: 6,
  as: 1,
  kind: 'score',
  competition: 'League Ten'
}, {
  id: 'r20260426-catania',
  date: '26 Apr 26',
  kick: '11:00',
  home: "Sue's Angels FC",
  away: 'Sporting Club Catania',
  hs: 10,
  as: 1,
  kind: 'score',
  competition: 'League Ten'
}, {
  id: 'r20260419-balham-h',
  date: '19 Apr 26',
  kick: '11:00',
  home: "Sue's Angels FC",
  away: 'Balham Bteckerz',
  hs: 9,
  as: 0,
  kind: 'score',
  competition: 'League Ten'
},
// Chipotle UK Chairman's Cup - Last 16 (lost on penalties after 2-2)
{
  id: 'r20260412-kew-ccup',
  date: '12 Apr 26',
  kick: '10:00',
  home: 'Kew Antigua',
  away: "Sue's Angels FC",
  hs: 2,
  as: 2,
  pens: {
    hs: 4,
    as: 3
  },
  kind: 'penalty',
  competition: "Chipotle UK Chairman's Cup",
  round: 'Last 16'
},
// Chipotle UK Chairman's Cup - Round of 32 (won 2-1)
{
  id: 'r20260329-bluebirds-ccup',
  date: '29 Mar 26',
  kick: '11:00',
  home: "Sue's Angels FC",
  away: 'AFC Bluebirds',
  hs: 2,
  as: 1,
  kind: 'score',
  competition: "Chipotle UK Chairman's Cup",
  round: 'Round of 32'
},
// Dylan Rigobert Trophy - Semi Final (won 3-0)
{
  id: 'r20260322-hillside-drt',
  date: '22 Mar 26',
  kick: '11:00',
  home: "Sue's Angels FC",
  away: 'Hillside Elite FC Blues',
  hs: 3,
  as: 0,
  kind: 'score',
  competition: 'Dylan Rigobert Trophy',
  round: 'Semi Final'
},
// Chipotle UK Chairman's Cup - Round of 64 (won 1-0)
{
  id: 'r20260315-barkingmad-ccup',
  date: '15 Mar 26',
  kick: '10:30',
  home: 'Barking Mad',
  away: "Sue's Angels FC",
  hs: 0,
  as: 1,
  kind: 'score',
  competition: "Chipotle UK Chairman's Cup",
  round: 'Round of 64'
},
// Chipotle UK Chairman's Cup - First Round (won 2-0)
{
  id: 'r20260308-clapham-ccup',
  date: '08 Mar 26',
  kick: '10:30',
  home: 'Clapham Chiefs',
  away: "Sue's Angels FC",
  hs: 0,
  as: 2,
  kind: 'score',
  competition: "Chipotle UK Chairman's Cup",
  round: 'First Round'
},
// League Ten
{
  id: 'r20260301-freemens',
  date: '01 Mar 26',
  kick: '12:30',
  home: "Old Freemen's",
  away: "Sue's Angels FC",
  kind: 'walkover',
  wo: 'A-W',
  competition: 'League Ten'
}, {
  id: 'r20260301-shepherds-a',
  date: '01 Mar 26',
  kick: '10:30',
  home: "Shepherd's Tuesday",
  away: "Sue's Angels FC",
  hs: 1,
  as: 5,
  kind: 'score',
  competition: 'League Ten'
},
// Surrey FA Sunday Lower Junior County Cup - Quarter Final (lost 0-3, knocked out)
{
  id: 'r20260222-sheen-cc',
  date: '22 Feb 26',
  kick: '10:30',
  home: "Sue's Angels FC",
  away: 'Sheen Park Rangers',
  hs: 0,
  as: 3,
  kind: 'score',
  competition: 'Surrey FA Sunday Lower Junior County Cup',
  round: 'Quarter Final'
},
// Dylan Rigobert Trophy - Quarter Final (won 7-0)
{
  id: 'r20260208-barnes-drt',
  date: '08 Feb 26',
  kick: '12:30',
  home: "Sue's Angels FC",
  away: 'Barnes Stormers FC',
  hs: 7,
  as: 0,
  kind: 'score',
  competition: 'Dylan Rigobert Trophy',
  round: 'Quarter Final'
},
// League Ten
{
  id: 'r20260201-bpr',
  date: '01 Feb 26',
  kick: '10:30',
  home: "Sue's Angels FC",
  away: "BPR Men's",
  hs: 4,
  as: 2,
  kind: 'score',
  competition: 'League Ten'
}, {
  id: 'r20260118-balham-a',
  date: '18 Jan 26',
  kick: '12:30',
  home: 'Balham Bteckerz',
  away: "Sue's Angels FC",
  hs: 0,
  as: 12,
  kind: 'score',
  competition: 'League Ten'
},
// Surrey FA Sunday Lower Junior County Cup - Last 16 (won 3-0)
{
  id: 'r20260125-tattenham-cc',
  date: '25 Jan 26',
  kick: '10:30',
  home: 'Tattenham Rovers 1st',
  away: "Sue's Angels FC",
  hs: 0,
  as: 3,
  kind: 'score',
  competition: 'Surrey FA Sunday Lower Junior County Cup',
  round: 'Last 16'
},
// Dylan Rigobert Trophy - Last 16 (won 6-0)
{
  id: 'r20260111-larkhall-drt',
  date: '11 Jan 26',
  kick: '10:30',
  home: "Sue's Angels FC",
  away: 'Larkhall City FC',
  hs: 6,
  as: 0,
  kind: 'score',
  competition: 'Dylan Rigobert Trophy',
  round: 'Last 16'
},
// Dylan Rigobert Trophy - Round of 32 (won 5-1)
{
  id: 'r20251214-brockwell-drt',
  date: '14 Dec 25',
  kick: '10:30',
  home: "Sue's Angels FC",
  away: 'Brockwell Violets FC',
  hs: 5,
  as: 1,
  kind: 'score',
  competition: 'Dylan Rigobert Trophy',
  round: 'Round of 32'
},
// Surrey FA Sunday Lower Junior County Cup - Round of 32 (won 7-0)
{
  id: 'r20251207-woking-cc',
  date: '07 Dec 25',
  kick: '10:30',
  home: 'Woking Veterans Sundays',
  away: "Sue's Angels FC",
  hs: 0,
  as: 7,
  kind: 'score',
  competition: 'Surrey FA Sunday Lower Junior County Cup',
  round: 'Round of 32'
},
// Supreme Trophies Marcus Lipton Cup - 2nd Round (lost 0-2, knocked out)
{
  id: 'r20251130-argentina-mlip',
  date: '30 Nov 25',
  kick: '14:00',
  home: 'Argentina FC 1st Team',
  away: "Sue's Angels FC",
  hs: 2,
  as: 0,
  kind: 'score',
  competition: 'Supreme Trophies Marcus Lipton Cup',
  round: '2nd Round'
},
// League Ten
{
  id: 'r20251123-catania',
  date: '23 Nov 25',
  kick: '10:30',
  home: 'Sporting Club Catania',
  away: "Sue's Angels FC",
  kind: 'walkover',
  wo: 'A-W',
  competition: 'League Ten'
},
// Surrey FA Sunday Lower Junior County Cup - Round of 64 (won 7-1)
{
  id: 'r20251116-sutton-cc',
  date: '16 Nov 25',
  kick: '10:30',
  home: "Sue's Angels FC",
  away: 'Sutton Knights B',
  hs: 7,
  as: 1,
  kind: 'score',
  competition: 'Surrey FA Sunday Lower Junior County Cup',
  round: 'Round of 64'
}, {
  id: 'r20251109-pure',
  date: '09 Nov 25',
  kick: '12:30',
  home: 'Pure Football FC 2.0',
  away: "Sue's Angels FC",
  hs: 1,
  as: 7,
  kind: 'score',
  competition: 'League Ten'
}, {
  id: 'r20251102-shepherds-h',
  date: '02 Nov 25',
  kick: '10:30',
  home: "Sue's Angels FC",
  away: "Shepherd's Tuesday",
  kind: 'walkover',
  wo: 'H-W',
  competition: 'League Ten'
},
// Supreme Trophies Marcus Lipton Cup - 1st Round (won 2-1)
{
  id: 'r20251026-malavida-mlip',
  date: '26 Oct 25',
  kick: '10:30',
  home: 'Mala Vida FC',
  away: "Sue's Angels FC",
  hs: 1,
  as: 2,
  kind: 'score',
  competition: 'Supreme Trophies Marcus Lipton Cup',
  round: '1st Round'
}, {
  id: 'r20251019-freemens',
  date: '19 Oct 25',
  kick: '10:30',
  home: "Sue's Angels FC",
  away: "Old Freemen's",
  hs: 7,
  as: 2,
  kind: 'score',
  competition: 'League Ten'
}, {
  id: 'r20251012-hillside',
  date: '12 Oct 25',
  kick: '10:30',
  home: 'Hillside Elite FC Blues',
  away: "Sue's Angels FC",
  hs: 0,
  as: 5,
  kind: 'score',
  competition: 'League Ten'
}, {
  id: 'r20251005-brockwell-h',
  date: '05 Oct 25',
  kick: '10:30',
  home: "Sue's Angels FC",
  away: 'Brockwell Violets FC',
  hs: 6,
  as: 0,
  kind: 'score',
  competition: 'League Ten'
}, {
  id: 'r20250928-dynamo-a',
  date: '28 Sep 25',
  kick: '10:30',
  home: 'Dynamo London FC',
  away: "Sue's Angels FC",
  hs: 0,
  as: 5,
  kind: 'score',
  competition: 'League Ten'
}, {
  id: 'r20250921-pure-h',
  date: '21 Sep 25',
  kick: '10:30',
  home: "Sue's Angels FC",
  away: 'Pure Football FC 2.0',
  hs: 5,
  as: 0,
  kind: 'score',
  competition: 'League Ten'
}];

// Competition tabs for the Results page. Add a new entry here when the club
// enters a new cup - the Results page builds its filter chips from this list.
window.COMPETITIONS = [{
  key: 'all',
  label: 'All',
  match: () => true
}, {
  key: 'league',
  label: 'League Ten',
  match: c => /league/i.test(c || '')
}, {
  key: 'drt',
  label: 'Dylan Rigobert Trophy',
  match: c => /dylan rigobert/i.test(c || '')
}, {
  key: 'ccup',
  label: 'Chairman\u2019s Cup',
  match: c => /chairman/i.test(c || '')
}, {
  key: 'mlip',
  label: 'Marcus Lipton Cup',
  match: c => /marcus lipton/i.test(c || '')
}, {
  key: 'cc',
  label: 'Surrey FA Cup',
  match: c => /surrey fa/i.test(c || '')
}];

// Upcoming fixtures. 25/26 season complete (unbeaten - Hillside 2-0 was the
// final game). 26/27 schedule publishes over the summer.
window.UPCOMING_FIXTURES = [];

// Coaching staff. Add new entries here as the backroom team grows. Each entry
// can carry a `photo` (relative path), a multi-paragraph `bio` array, a
// `playedFor` list and a `managed` list - used by the Teams page Coaches tab.
window.COACHES = [{
  id: 'stephen-epathite',
  role: 'FIRST-TEAM MANAGER',
  name: 'Stephen Epathite',
  short: 'Founder & manager',
  photo: 'assets/players/stephen-epathite.webp',
  bio: ["Fulham F.C. supporter Stephen Epathite brings decades of experience and leadership to the game, both on and off the pitch.", "As a player, Stephen represented respected non-league sides including Corinthian-Casuals F.C., Chessington & Hook United F.C., and Uxbridge F.C., building a strong understanding of the semi-professional and grassroots football landscape.", "His managerial journey has seen him take charge across both the men's and women's game, managing clubs such as Crystal Palace F.C. Women, Maidstone United W.F.C., Corinthian-Casuals F.C. Reserves, Cove F.C., Frimley Green F.C., Chessington & Hook United F.C., Staines Lammas F.C., and Banstead Athletic F.C.", "Known for his passion, leadership and deep understanding of player development, Stephen has built a reputation for creating competitive teams with strong togetherness and identity throughout every level of the football pyramid."],
  playedFor: ['Corinthian-Casuals F.C.', 'Chessington & Hook United F.C.', 'Uxbridge F.C.'],
  managed: ['Crystal Palace F.C. Women', 'Maidstone United W.F.C.', 'Corinthian-Casuals F.C. Reserves', 'Cove F.C.', 'Frimley Green F.C.', 'Chessington & Hook United F.C.', 'Staines Lammas F.C.', 'Banstead Athletic F.C.'],
  supports: 'Fulham F.C.'
}, {
  id: 'louis-allen',
  role: 'FIRST TEAM COACH',
  name: 'Louis Allen',
  short: 'Organisation & matchday prep',
  bio: ["Louis Allen has been a constant presence in the Sue’s Angels FC backroom throughout the 25/26 season, a campaign that ended with the League Ten title and an unbeaten record. His contribution goes far beyond the ninety minutes.", "Known for his meticulous organisation and pre-game preparation, Louis makes sure everything is in place before kick-off so the squad can focus on the football. From logistics to the smallest details, his work behind the scenes has been a big part of why the team has performed so consistently, week in and week out.", "It is his character, though, that sets him apart. A positive, dependable figure who lifts the group and holds everyone to the same standards, Louis embodies the togetherness and culture that have driven the club forward. A valued member of the staff and a key part of the journey."]
}];

// PLAYER_BIOS - written personal biographies keyed by squad number.
// Surfaces inside the Player Profile modal under the "PLAYER BIO" tab.
// Single-string entries can use \n for paragraph breaks.
window.PLAYER_BIOS = {
  // 2 - Andrew Allen (DEF / MID)
  2: `A highly experienced midfielder with an excellent understanding of the game, Andrew Allen brings leadership, composure, and technical quality to the heart of the team. Throughout his football journey, he has represented Chessington & Hook United F.C., Cove F.C., Staines Lammas F.C., CB Hounslow United F.C. and Old Isleworthians F.C.

A loyal supporter of Manchester United F.C., Andrew is known for his calm presence on the ball, ability to dictate play, and willingness to put the team first. His experience and football intelligence make him an invaluable figure both on and off the pitch.`,
  // 9 - Charlie Dunkley (ATT)
  9: `Charlie Dunkley is a dynamic and clinical striker whose game is built around intelligent movement, relentless work rate, and a natural eye for goal.

Having previously represented Wembley F.C., Atlantis F.C., and West London Saracens, Charlie has developed valuable experience across the grassroots and non-league game, consistently demonstrating his ability to lead the line and make an impact in the final third.

A lifelong supporter of Arsenal F.C., Charlie brings a positive mentality and attacking intent to every match. Whether finishing chances inside the box, pressing defenders from the front, or creating opportunities for teammates, he is a constant threat to opposition defences.

Known for his determination, team-first attitude, and instinctive finishing ability, Charlie continues to be an important attacking presence and a player capable of changing games with a single moment of quality.`,
  // 10 - Jim El Bayati · "Jimi" - club captain
  10: `As club captain, Jimi El Bayati leads by example through his professionalism, consistency, and commitment to the team. A natural leader, he sets high standards both on and off the pitch and plays a crucial role in maintaining the culture and identity of Sue's Angels FC.

Known for his composure under pressure and strong communication, Jimi brings the squad together and helps drive the team forward in pursuit of success. His leadership has been instrumental in creating a united and ambitious group capable of competing at the highest level possible.`,
  // 23 - Stewart Luwawa (MID)
  23: `A hardworking and versatile midfielder, Stewart Luwawa brings energy, determination, and leadership to the centre of the pitch. Having represented Walton & Hersham F.C., Ashford Town (Middlesex) F.C. and Cove F.C., he has gained valuable experience across a variety of competitive environments.

A lifelong supporter of Manchester United F.C., Stewart is known for his commitment, work rate, and desire to drive standards both on and off the pitch. His willingness to battle for every ball and contribute to the team makes him an important part of the Sue's Angels FC setup.`,
  // 28 - Luke Munns (GK)
  28: `Luke Munns is a commanding goalkeeper whose shot-stopping ability, confidence under pressure, and strong communication provide a solid foundation for the team. Having previously played for Ashford Town (Middlesex) F.C. and CB Hounslow United F.C., he has developed into a reliable and dependable presence between the posts.

A dedicated supporter of Chelsea F.C., Luke combines quick reactions with strong decision-making and a calm mentality. Whether making crucial saves or organising the defence, he consistently plays an important role in the team's success.`,
  // 30 - Frazier-Isaías Osunkoya (ATT)
  30: `A powerful and explosive forward, Frazier-Isaías Osunkoya combines pace, strength, and clinical finishing to make him a constant threat in the final third. Having previously represented Metropolitan Police F.C. and Peña Sport F.C., he brings valuable experience and a winning mentality to Sue's Angels FC.

A passionate supporter of Arsenal F.C., Frazier is capable of changing a game in an instant, whether through his intelligent movement, physical presence, or eye for goal. His relentless work ethic and determination make him a key figure in the squad and a player defenders never enjoy facing.`
};

// Built-in club articles that always appear on the News / Media feed. Merged with
// admin-entered articles in getCustomArticles (an admin row with the same id wins,
// so the club can edit or replace one from the CMS). Use for permanent or
// announcement posts the club wants guaranteed live.
window.SA_DEFAULT_ARTICLES = [
  {
    id: 'art-preseason-heat-2026',
    cat: 'News',
    title: 'Pre-Season Pushed Back a Week as Heatwave Hits',
    date: '22 Jun 2026',
    sortISO: '2026-06-22T09:00:00.000Z',
    cover: null,
    isDefault: true,
    lede: `Our first pre-season session of the summer has been moved. Originally planned for Wednesday 24 June, it will now take place a week later, on Wednesday 1 July, 19:00 to 20:30, at the home ground.

The reason is simple, and it is the right one: player welfare comes first. The Met Office has issued an amber extreme heat warning across southern England this week, with temperatures climbing through the mid-30s and forecast to peak at around 38°C on Wednesday, the exact day we were due to be out on the grass. The UK Health Security Agency has issued matching Heat Health Alerts, and with warm, humid nights offering little relief, heat stress is a genuine risk to everyone, not just the most vulnerable.

Asking players to train at full intensity in those conditions is not a risk worth taking. As a club built in memory of someone we loved, looking after each other will always matter more than a date in the diary.

So we wait a week. By Wednesday 1 July the worst of the heat should have passed, and we will get our preparations for the 26/27 campaign under way properly, safely, and together.

While the heat is with us, look after yourselves and each other: drink plenty of water, find the shade in the hottest hours, check in on anyone who might be struggling, and never leave a child or a pet in a parked car.

New date: Wednesday 1 July, 19:00 to 20:30, at the home ground. Sunday sessions (10:00 to 12:30) follow from there. See you on the grass, Angels. Stay safe.`
  }
];

// Single source of truth for the 25/26 first-team squad.
// Stats removed - derived live from saved match entries (see derivedPlayerStats below).
window.SQUAD = [{
  num: 1,
  last: 'Adio',
  first: 'Abiola',
  gk: false
}, {
  num: 2,
  last: 'Allen',
  first: 'Andrew',
  gk: false
}, {
  num: 4,
  last: 'Brabrook',
  first: 'Michael',
  gk: false
}, {
  num: 5,
  last: 'Brown',
  first: 'Kafele',
  gk: false
}, {
  num: 6,
  last: 'Brumpton',
  first: 'Elis',
  gk: false
}, {
  num: 7,
  last: 'Clark',
  first: 'William',
  gk: false
}, {
  num: 8,
  last: 'Cowie',
  first: 'Joshua',
  gk: false
}, {
  num: 9,
  last: 'Dunkley',
  first: 'Charlie',
  gk: false
}, {
  num: 10,
  last: 'El Bayati',
  first: 'Jim',
  gk: false
}, {
  num: 11,
  last: 'Epathite',
  first: 'Richard',
  gk: false
},
// Stephen Epathite (was #12) moved to window.COACHES - he is the first-team manager,
// not a player. Squad numbering continues from the next entry.
{
  num: 13,
  last: 'Fernandes',
  first: 'Christopher',
  gk: false
}, {
  num: 14,
  last: 'Fisher',
  first: 'Jake',
  gk: false
}, {
  num: 15,
  last: 'Fisher',
  first: 'James',
  gk: false
}, {
  num: 16,
  last: 'Horrill',
  first: 'Kieron',
  gk: false
}, {
  num: 17,
  last: 'Inman',
  first: 'Alfie James',
  gk: false
}, {
  num: 18,
  last: 'Jackson',
  first: 'Danny',
  gk: false
}, {
  num: 19,
  last: 'Jones',
  first: 'David',
  gk: false
}, {
  num: 20,
  last: 'Knight',
  first: 'Dean',
  gk: false
}, {
  num: 21,
  last: 'Lloyd',
  first: 'Jon',
  gk: false
}, {
  num: 22,
  last: 'Lloyd',
  first: 'Leo',
  gk: false
}, {
  num: 23,
  last: 'Luwawa',
  first: 'Stewart',
  gk: false
}, {
  num: 24,
  last: 'McKinson',
  first: 'Lee',
  gk: false
}, {
  num: 25,
  last: 'McLane',
  first: 'Daniel',
  gk: false
}, {
  num: 26,
  last: 'Mullings',
  first: 'Kyrell',
  gk: false
}, {
  num: 27,
  last: 'Mullings',
  first: 'Malachi',
  gk: false
}, {
  num: 28,
  last: 'Munns',
  first: 'Luke',
  gk: true
}, {
  num: 29,
  last: 'Nur',
  first: 'Samakab',
  gk: false
}, {
  num: 30,
  last: 'Osunkoya',
  first: 'Frazier-Isaías',
  gk: false
}, {
  num: 31,
  last: 'Potter',
  first: 'Stephen',
  gk: false
}, {
  num: 32,
  last: 'Rand',
  first: 'Daniel',
  gk: false
}, {
  num: 33,
  last: 'Rodway-Brown',
  first: 'Alex',
  gk: false
}, {
  num: 34,
  last: 'Sheehan',
  first: 'Sean',
  gk: false
}, {
  num: 35,
  last: 'Thilaganathan',
  first: 'Jeev',
  gk: false
}, {
  num: 36,
  last: 'Tomassi',
  first: 'Ross',
  gk: false
}];

// Standard position vocabulary. Used by the match-entry form and formation detection.
window.POSITIONS = ['GK', 'CB', 'LCB', 'RCB', 'SW', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'LDM', 'RDM', 'CM', 'LCM', 'RCM', 'CAM', 'LAM', 'RAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF', 'SS'];

// Helper: pull all saved match entries from localStorage (one per fixture id).
// Optional `compMatcher(competition)` to filter by competition.
window.getAllMatchEntries = function (compMatcher) {
  const seasonById = {};
  for (const r of window.SEASON_RESULTS || []) seasonById[r.id] = r;
  const fixtureById = {};
  for (const f of window.UPCOMING_FIXTURES || []) fixtureById[f.id] = f;
  const ids = [...Object.keys(seasonById), ...Object.keys(fixtureById)];
  const out = [];
  for (const id of ids) {
    let raw;
    try {
      raw = localStorage.getItem('sa-match:' + id);
    } catch (e) {
      continue;
    }
    if (!raw) continue;
    try {
      const data = JSON.parse(raw);
      const fixture = seasonById[id] || fixtureById[id];
      if (compMatcher && fixture && !compMatcher(fixture.competition)) continue;
      out.push({
        id,
        data,
        fixture
      });
    } catch (e) {}
  }
  return out;
};

// Normalise a starters/bench row so both legacy (number) and new ({num,positions,subbedOff}) work.
function normEntry(e) {
  if (typeof e === 'number') return {
    num: e,
    positions: [],
    subbedOff: false
  };
  return {
    num: e.num,
    positions: Array.isArray(e.positions) ? e.positions : [],
    subbedOff: !!e.subbedOff
  };
}

// Aggregate per-player stats from every saved match.
// RULES (re-affirmed):
//   - 2 positions in 1 game = 1 appearance. Always.
//   - Starter or sub-on = 1 app. Unused sub = 0 apps.
//   - Only matches that have actually been played (i.e. live in
//     window.SEASON_RESULTS) ever contribute to a player's appearance / stat
//     totals. Pre-filling a starting XI on an UPCOMING fixture is fine - it
//     won't bump anyone's count until the match moves into SEASON_RESULTS.
// Helpers + season key wiring.
// `seasonKey` can be 'all', undefined/null (default → current season), or a
// specific season name like '25/26'. When set to anything other than 'all',
// only SEASON_RESULTS whose `seasonOf(r)` matches contribute to the stats.
// This lets the leaderboard switch between current season / next season /
// club all-time totals without rewriting the pipeline.
window.derivedPlayerStats = function (num, compMatcher, seasonKey) {
  const stats = {
    num,
    apps: 0,
    started: 0,
    subbedOn: 0,
    subbedOff: 0,
    benchUnused: 0,
    goals: 0,
    assists: 0,
    penaltiesScored: 0,
    setPiecesScored: 0,
    yc: 0,
    rc: 0,
    motm: 0,
    captained: 0,
    penaltiesSaved: 0,
    penaltiesMissed: 0,
    gkApps: 0,
    cleanSheets: 0,
    goalsConceded: 0,
    positions: {} // { 'CM': 5, 'CAM': 2 } - counts position-matches, not apps
  };
  // Only count matches that have been PLAYED. "Played" = anything in
  // SEASON_RESULTS *plus* any fixture that auto-promoted into results once its
  // kickoff passed (getDerivedResults merges both). This is why entering match
  // data for a freshly-played fixture now feeds straight into player stats -
  // no need to hardcode it into SEASON_RESULTS first. compMatcher narrows comp.
  const playedSource = typeof window.getDerivedResults === 'function' ? window.getDerivedResults() : window.SEASON_RESULTS || [];
  const playedIds = new Set(playedSource.filter(r => !compMatcher || compMatcher(r.competition)).filter(r => {
    if (!seasonKey || seasonKey === 'all') return true;
    return window.seasonOf ? window.seasonOf(r) === seasonKey : true;
  }).map(r => r.id));
  const matches = (window.getAllMatchEntries() || []).filter(({
    id
  }) => playedIds.has(id));
  const seenMatchIds = new Set();
  for (const {
    id,
    data
  } of matches) {
    if (seenMatchIds.has(id)) continue; // never count the same fixture twice
    seenMatchIds.add(id);

    // Dedupe lineup entries by squad number - one entry per player per match.
    const dedupeByNum = arr => {
      const seen = new Set();
      const out = [];
      for (const raw of arr || []) {
        const e = normEntry(raw);
        if (seen.has(e.num)) continue;
        seen.add(e.num);
        out.push(e);
      }
      return out;
    };
    const starters = dedupeByNum(data.starters);
    const bench = dedupeByNum(data.bench);
    // Player is treated as starter if listed there; the bench duplicate is ignored.
    const start = starters.find(s => s.num === num);
    const sub = !start && bench.find(s => s.num === num);
    if (start) {
      stats.started++;
      stats.apps++;
      if (start.subbedOff) stats.subbedOff++;
      // Multiple positions in one game don't double-count anything - apps stays 1.
      const uniquePositions = Array.from(new Set(start.positions));
      for (const p of uniquePositions) stats.positions[p] = (stats.positions[p] || 0) + 1;
    } else if (sub) {
      if (sub.positions.length > 0) {
        stats.subbedOn++;
        stats.apps++;
        const uniquePositions = Array.from(new Set(sub.positions));
        for (const p of uniquePositions) stats.positions[p] = (stats.positions[p] || 0) + 1;
      } else {
        stats.benchUnused++;
      }
    }

    // Event tallies - independent of apps.
    // Determine if this player was in goal for the fixture (any GK position entry).
    const playerEntry = start || sub;
    const playedGk = !!(playerEntry && Array.isArray(playerEntry.positions) && playerEntry.positions.some(p => /^GK$|^GOAL/i.test(p)));
    if (playedGk) {
      stats.gkApps++;
      const conceded = (data.opponentGoals || []).length;
      stats.goalsConceded += conceded;
      if (conceded === 0) stats.cleanSheets++;
    }
    for (const g of data.goals || []) {
      if (g.num === num) {
        stats.goals++;
        const t = g.type || (g.penalty ? 'pen' : 'open');
        if (t === 'pen') stats.penaltiesScored++;else if (t === 'set') stats.setPiecesScored++;
      }
    }
    for (const a of data.assists || []) if (a.num === num) stats.assists++;
    for (const c of data.yellowCards || []) if (c.num === num) stats.yc++;
    for (const c of data.redCards || []) if (c.num === num) stats.rc++;
    for (const ps of data.penaltiesSaved || []) if (ps.num === num) stats.penaltiesSaved++;
    for (const pm of data.penaltiesMissed || []) if (pm.num === num) stats.penaltiesMissed++;
    if (data.motm === num) stats.motm++;
    if (data.captain === num) stats.captained = (stats.captained || 0) + 1;
  }
  const sortedPos = Object.entries(stats.positions).sort((a, b) => b[1] - a[1]);
  stats.mostPlayedPosition = sortedPos.length ? sortedPos[0][0] : null;
  stats.positionBreakdown = sortedPos;
  // Derived combined metrics
  stats.goalInvolvements = stats.goals + stats.assists;
  const penAttempts = stats.penaltiesScored + stats.penaltiesMissed;
  stats.penaltyAttempts = penAttempts;
  stats.penaltyConversion = penAttempts > 0 ? Math.round(stats.penaltiesScored / penAttempts * 100) : null;
  return stats;
};

// Most-used formation: tally def/mid/att groups across saved matches' starting XIs.
window.formationGroupOf = function (pos) {
  if (pos === 'GK') return 'GK';
  if (['CB', 'LCB', 'RCB', 'SW', 'LB', 'RB', 'LWB', 'RWB'].includes(pos)) return 'DEF';
  if (['CDM', 'LDM', 'RDM', 'CM', 'LCM', 'RCM', 'CAM', 'LAM', 'RAM', 'LM', 'RM'].includes(pos)) return 'MID';
  if (['LW', 'RW', 'ST', 'CF', 'SS'].includes(pos)) return 'ATT';
  return null;
};

// ─── Advanced formation detector ──────────────────────────────────────
// Analyses the 10 outfield starting positions (assumes 1 GK) and matches
// against a library of common formations, returning the most specific
// label. Falls back to a basic def-mid-att count if no pattern matches.
//
// Learning: when the coach manually corrects a formation via the override
// input, we cache the (positions → formation) mapping in localStorage so
// the same position pattern will return the corrected label next time.
window.detectAdvancedFormation = function (positions) {
  // positions is an array of primary positions (1 per starter), length ~11.
  // Count each position type.
  const c = {};
  for (const p of positions) if (p) c[p] = (c[p] || 0) + 1;

  // Check memory first.
  const memKey = '|' + Object.keys(c).sort().map(k => `${k}:${c[k]}`).join('|') + '|';
  try {
    const mem = JSON.parse(localStorage.getItem('sa-formation-memory') || '{}');
    if (mem[memKey]) return {
      formation: mem[memKey],
      confidence: 'learned'
    };
  } catch (e) {}
  const gk = c.GK || 0;
  const cb = (c.CB || 0) + (c.LCB || 0) + (c.RCB || 0) + (c.SW || 0);
  const lb = c.LB || 0,
    rb = c.RB || 0;
  const lwb = c.LWB || 0,
    rwb = c.RWB || 0;
  const cdm = (c.CDM || 0) + (c.LDM || 0) + (c.RDM || 0);
  const cm = (c.CM || 0) + (c.LCM || 0) + (c.RCM || 0);
  const cam = (c.CAM || 0) + (c.LAM || 0) + (c.RAM || 0);
  const lm = c.LM || 0,
    rm = c.RM || 0;
  const lw = c.LW || 0,
    rw = c.RW || 0;
  const st = c.ST || 0;
  const cf = c.CF || 0;
  const ss = c.SS || 0;
  const flatDef = cb + lb + rb;
  const wingBacks = lwb + rwb;
  const wideMid = lm + rm;
  const wideFwd = lw + rw;
  const strikers = st + cf;
  const supportFwd = ss;
  const totalDef = flatDef + wingBacks;
  const totalMid = cdm + cm + cam + wideMid;
  const totalAtt = wideFwd + strikers + supportFwd;
  const total = totalDef + totalMid + totalAtt;
  if (total === 0) return null;

  // Specific patterns. Order matters - most specific first.

  // 4-2-3-1 - 4 def + 2 CDM + 3 attacking mids/wingers + 1 ST
  if (flatDef === 4 && cdm === 2 && cam + wideMid + wideFwd === 3 && strikers === 1) return {
    formation: '4-2-3-1',
    confidence: 'specific'
  };

  // 4-2-2-2 - 4 def + 2 CDM + 2 CAM + 2 ST
  if (flatDef === 4 && cdm === 2 && cam === 2 && strikers === 2) return {
    formation: '4-2-2-2',
    confidence: 'specific'
  };

  // 4-3-2-1 (Christmas tree) - 4 def + 3 central mid + 2 CAM + 1 ST
  if (flatDef === 4 && cdm + cm === 3 && cam === 2 && strikers === 1) return {
    formation: '4-3-2-1',
    confidence: 'specific'
  };

  // 4-1-4-1 - 4 def + 1 CDM + 4 mid (CM + wide) + 1 ST
  if (flatDef === 4 && cdm === 1 && cm + wideMid + cam === 4 && strikers === 1) return {
    formation: '4-1-4-1',
    confidence: 'specific'
  };

  // 4-1-2-1-2 (diamond) - 4 def + 1 CDM + 2 CM + 1 CAM + 2 ST
  if (flatDef === 4 && cdm === 1 && cm === 2 && cam === 1 && strikers === 2) return {
    formation: '4-1-2-1-2 (diamond)',
    confidence: 'specific'
  };

  // 4-4-1-1 - 4 def + 4 mid + 1 SS/CAM + 1 ST
  if (flatDef === 4 && cdm + cm + wideMid === 4 && cam + supportFwd === 1 && strikers === 1) return {
    formation: '4-4-1-1',
    confidence: 'specific'
  };

  // 4-3-3 (wide forwards) - 4 def + 3 mid + 2 wingers + 1 ST
  if (flatDef === 4 && cdm + cm + cam === 3 && wideFwd === 2 && strikers === 1) return {
    formation: '4-3-3',
    confidence: 'specific'
  };

  // 4-3-3 (3 ST) - 4 def + 3 mid + 3 forwards (less common)
  if (flatDef === 4 && cdm + cm + cam === 3 && wideFwd + strikers === 3) return {
    formation: '4-3-3',
    confidence: 'specific'
  };

  // 4-4-2 - 4 def + 4 mid + 2 ST
  if (flatDef === 4 && cdm + cm + cam + wideMid === 4 && strikers === 2) return {
    formation: '4-4-2',
    confidence: 'specific'
  };

  // 4-5-1 - 4 def + 5 mid + 1 ST
  if (flatDef === 4 && totalMid === 5 && strikers === 1) return {
    formation: '4-5-1',
    confidence: 'specific'
  };

  // 3-4-3 - 3 CB + 4 mid (CM/wing-backs) + 3 forwards
  if (cb === 3 && cdm + cm + cam + wingBacks + wideMid === 4 && wideFwd + strikers === 3) return {
    formation: '3-4-3',
    confidence: 'specific'
  };

  // 3-4-2-1 - 3 CB + 4 mid + 2 CAM + 1 ST
  if (cb === 3 && cdm + cm + wingBacks + wideMid === 4 && cam === 2 && strikers === 1) return {
    formation: '3-4-2-1',
    confidence: 'specific'
  };

  // 3-5-2 - 3 CB + 5 mid (incl. wing-backs) + 2 ST
  if (cb === 3 && cdm + cm + cam + wingBacks + wideMid === 5 && strikers === 2) return {
    formation: '3-5-2',
    confidence: 'specific'
  };

  // 5-3-2 - 5 def (incl. WB if any) + 3 mid + 2 ST
  if (cb + lb + rb + wingBacks === 5 && cdm + cm + cam === 3 && strikers === 2) return {
    formation: '5-3-2',
    confidence: 'specific'
  };

  // 5-4-1 - 5 def + 4 mid + 1 ST
  if (cb + lb + rb + wingBacks === 5 && totalMid === 4 && strikers === 1) return {
    formation: '5-4-1',
    confidence: 'specific'
  };

  // 3-6-1 / 5-4-1 esoterics.
  // Fallback: bucket-count def-mid-att, treating wing-backs as part of the
  // back line in a 4-flat or as mids in a 3-flat.
  const backLine = cb >= 3 ? cb + wingBacks : flatDef + wingBacks;
  const midLine = cb >= 3 ? totalMid - wingBacks + wingBacks - wingBacks : totalMid; // simplified
  const fwdLine = totalAtt;
  return {
    formation: `${backLine}-${totalMid - (cb >= 3 ? wingBacks : 0)}-${fwdLine}`,
    confidence: 'bucket'
  };
};

// Remember a coach correction so the same position pattern returns the
// corrected formation next time.
window.rememberFormation = function (positions, formation) {
  const c = {};
  for (const p of positions) if (p) c[p] = (c[p] || 0) + 1;
  const memKey = '|' + Object.keys(c).sort().map(k => `${k}:${c[k]}`).join('|') + '|';
  try {
    const mem = JSON.parse(localStorage.getItem('sa-formation-memory') || '{}');
    mem[memKey] = formation;
    localStorage.setItem('sa-formation-memory', JSON.stringify(mem));
  } catch (e) {}
};
window.detectFormation = function () {
  const tally = {};
  const playedSource = typeof window.getDerivedResults === 'function' ? window.getDerivedResults() : window.SEASON_RESULTS || [];
  const playedIds = new Set(playedSource.map(r => r.id));
  const matches = (window.getAllMatchEntries() || []).filter(({
    id
  }) => playedIds.has(id));
  for (const {
    data
  } of matches) {
    let key = null;
    if (data.formation && /^\d/.test(data.formation)) {
      key = data.formation;
    } else {
      const starters = (data.starters || []).map(normEntry);
      if (starters.length < 7) continue;
      const positions = starters.map(s => s.positions[0]).filter(Boolean);
      const det = window.detectAdvancedFormation(positions);
      if (!det) continue;
      key = det.formation;
    }
    tally[key] = (tally[key] || 0) + 1;
  }
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  return sorted.length ? {
    formation: sorted[0][0],
    count: sorted[0][1],
    total: sorted.reduce((s, [, n]) => s + n, 0),
    breakdown: sorted
  } : null;
};

// Friendly blanket role for the squad-card face. Computed from the player's
// most-played specific position. Falls back to GK flag if no data exists yet.
window.blanketRole = function (player) {
  // player is the derived squad object with .positionBreakdown / .mostPlayedPosition
  if (!player) return 'Squad';
  if (player.mostPlayedPosition) {
    const g = window.formationGroupOf(player.mostPlayedPosition);
    if (g === 'GK') return 'Goalkeeper';
    if (g === 'DEF') return 'Defender';
    if (g === 'MID') return 'Midfielder';
    if (g === 'ATT') return 'Attacker';
  }
  if (player.gk) return 'Goalkeeper';
  return 'Squad';
};

// Derived: full squad enriched with stats. Accepts optional comp + season.
window.derivedSquad = function (compMatcher, seasonKey) {
  return window.SQUAD.map(p => ({
    ...p,
    ...window.derivedPlayerStats(p.num, compMatcher, seasonKey)
  }));
};
window.derivedSquadBy = function (key, compMatcher) {
  return window.derivedSquad(compMatcher).filter(p => p[key] > 0).sort((a, b) => b[key] - a[key] || b.apps - a.apps);
};

// Back-compat (existing components may still read these).
window.SQUAD_BY_APPS = null; // forced lazy via getter below
window.SQUAD_BY_GOALS = null;
window.SQUAD_BY_ASSISTS = null;
Object.defineProperty(window, 'SQUAD_BY_APPS', {
  get: () => window.derivedSquad().sort((a, b) => b.apps - a.apps)
});
Object.defineProperty(window, 'SQUAD_BY_GOALS', {
  get: () => window.derivedSquadBy('goals')
});
Object.defineProperty(window, 'SQUAD_BY_ASSISTS', {
  get: () => window.derivedSquadBy('assists')
});

// TeamBadge - renders each club's real badge. Matches by substring (case-insensitive)
// so minor name variations ("BPR Men's" vs "BPR FC") still resolve to the right file.
const BADGE_REGISTRY = [{
  match: 'angels',
  src: 'assets/badge/sue-angels-shield.webp',
  alt: "Sue's Angels FC",
  aspect: 'shield'
}, {
  match: 'brockwell',
  src: 'assets/badge/brockwell-violets.webp',
  alt: 'Brockwell Violets FC',
  aspect: 'circle'
}, {
  match: 'hillside',
  src: 'assets/badge/hillside-elite.webp',
  alt: 'Hillside Elite FC Blues',
  aspect: 'circle'
}, {
  match: 'bpr',
  src: 'assets/badge/bpr-fc.webp',
  alt: 'BPR FC',
  aspect: 'circle'
}, {
  match: 'dynamo',
  src: 'assets/badge/dynamo-london.webp',
  alt: 'Dynamo London FC',
  aspect: 'circle'
}, {
  match: 'catania',
  src: 'assets/badge/sporting-catania.webp',
  alt: 'Sporting Club Catania',
  aspect: 'circle'
}, {
  match: 'pure',
  src: 'assets/badge/pure-fc.webp',
  alt: 'Pure Football FC 2.0',
  aspect: 'shield'
}, {
  match: 'freemen',
  src: 'assets/badge/old-freemens.webp',
  alt: "Old Freemen's",
  aspect: 'shield'
}, {
  match: 'shepherd',
  src: 'assets/badge/shepherds-tuesday.webp',
  alt: "Shepherd's Tuesday",
  aspect: 'circle'
}, {
  match: 'balham',
  src: 'assets/badge/balham-bteckerz.webp',
  alt: 'Balham Bteckerz',
  aspect: 'circle'
}, {
  match: 'sheen',
  src: 'assets/badge/sheen-park-rangers.webp',
  alt: 'Sheen Park Rangers',
  aspect: 'circle'
}, {
  match: 'kew',
  src: 'assets/badge/kew-antigua.webp',
  alt: 'Kew Antigua',
  aspect: 'shield'
}, {
  match: 'sutton',
  src: 'assets/badge/sutton-knights.webp',
  alt: 'Sutton Knights',
  aspect: 'shield'
}, {
  match: 'bristol',
  src: 'assets/badge/bristol-city.png',
  alt: 'Bristol City (London) Supporters',
  aspect: 'shield'
}, {
  match: 'haydons',
  src: 'assets/badge/haydons-park.png',
  alt: 'Haydons Park',
  aspect: 'circle'
}, {
  match: 'junction',
  src: 'assets/badge/junction-elite.webp',
  alt: 'Junction Elite',
  aspect: 'circle'
}, {
  match: 'olympique',
  src: 'assets/badge/olympique-mayonnaise.webp',
  alt: 'Olympique Mayonnaise',
  aspect: 'shield'
}, {
  match: 'little birds',
  src: 'assets/badge/three-little-birds.webp',
  alt: 'Three Little Birds FC',
  aspect: 'circle'
}, {
  match: 'tsm',
  src: 'assets/badge/tsm-rovers.webp',
  alt: 'TSM Rovers FC',
  aspect: 'circle'
}, {
  match: 'tyne',
  src: 'assets/badge/tyne-thames.webp',
  alt: 'Tyne & Thames FC',
  aspect: 'circle'
},
// Newly-added 26/27 opponents (uploaded May 2026).
{
  match: 'barking',
  src: 'assets/badge/barking-mad.webp',
  alt: 'Barking Mad FC',
  aspect: 'circle'
}, {
  match: 'clapham',
  src: 'assets/badge/clapham-chiefs.webp',
  alt: 'Clapham Chiefs FC',
  aspect: 'circle'
}, {
  match: 'porto',
  src: 'assets/badge/casa-fc-porto.webp',
  alt: 'FC Porto of London',
  aspect: 'circle'
}, {
  match: 'bluebirds',
  src: 'assets/badge/afc-bluebirds.webp',
  alt: 'AFC Bluebirds',
  aspect: 'circle'
}, {
  match: 'tattenham',
  src: 'assets/badge/tattenham-rovers.webp',
  alt: 'Tattenham Rovers FC',
  aspect: 'circle'
}, {
  match: 'woking',
  src: 'assets/badge/woking-vets.webp',
  alt: 'Woking Vets FC',
  aspect: 'circle'
}, {
  match: 'argentina',
  src: 'assets/badge/argentina-fc-london.webp',
  alt: 'Argentina FC London',
  aspect: 'circle'
}, {
  match: 'larkhall',
  src: 'assets/badge/larkhall-city.webp',
  alt: 'Larkhall City FC',
  aspect: 'shield'
}, {
  match: 'stormers',
  src: 'assets/badge/barnes-stormers.webp',
  alt: 'Barnes Stormers FC',
  aspect: 'circle'
}];
function resolveBadge(team) {
  if (!team) return null;
  const t = team.toLowerCase();
  return BADGE_REGISTRY.find(b => t.includes(b.match)) || null;
}
function TeamBadge({
  team,
  size = 24
}) {
  const b = resolveBadge(team);
  if (b) {
    const isUs = b.match === 'angels';
    // Shield-shaped badges keep aspect ratio; circles fit the box exactly.
    const style = b.aspect === 'shield' ? {
      width: 'auto',
      height: size,
      maxWidth: size * 1.1
    } : {
      width: size,
      height: size
    };
    return /*#__PURE__*/React.createElement("img", {
      className: `fixture-card__badge${isUs ? ' is-us' : ''} fixture-card__badge--${b.aspect}`,
      src: b.src,
      alt: "",
      loading: "lazy",
      decoding: "async",
      style: style
    });
  }
  return /*#__PURE__*/React.createElement("span", {
    className: "fixture-card__badge",
    style: {
      width: size,
      height: size
    }
  });
}
window.TeamBadge = TeamBadge;
window.resolveBadge = resolveBadge;
window.KNOWN_CLUBS = BADGE_REGISTRY.map(function (b) { return b.alt; });

// Merge any admin-added players/coaches into the live arrays, and re-merge when
// the cloud cache hydrates or the roster changes.
if (window.applyCustomRoster) window.applyCustomRoster();
if (window.applyLeagueOverrides) window.applyLeagueOverrides();
if (window.dataStore && window.dataStore.playerPhotos && window.dataStore.playerPhotos.subscribe) {
  window.dataStore.playerPhotos.subscribe(() => {
    if (window.applyCustomRoster) window.applyCustomRoster();
    if (window.applyLeagueOverrides) window.applyLeagueOverrides();
    try {
      window.dispatchEvent(new CustomEvent('sa-roster-changed'));
      window.dispatchEvent(new CustomEvent('sa-league-changed'));
    } catch (e) {}
  });
}

/**
 * tableInsights - given league rows and the games-per-team total, compute:
 *  - per-team max possible points
 *  - per-team status (champion / promotion / contender / safe / relegated / eliminated)
 *  - champion (mathematically uncatchable on top)
 *  - promotion cutoff (top N)
 * Each row needs: { p (position), c (club), pl (played), pts }.
 * totalGames = how many games each team plays in the season (e.g. 18 in a 10-team double round robin).
 * promotionSpots = how many top positions get promoted (default 2).
 */
window.tableInsights = function (rows, totalGames, promotionSpots = 2) {
  const enriched = rows.map(r => ({
    ...r,
    remaining: Math.max(0, totalGames - r.pl),
    maxPts: r.pts + Math.max(0, totalGames - r.pl) * 3
  }));

  // Sort by current position (already sorted, but stable).
  const sorted = [...enriched].sort((a, b) => a.p - b.p);

  // Champions: a team's current points > every other team's maxPts.
  const leader = sorted[0];
  const championConfirmed = sorted.slice(1).every(r => leader.pts > r.maxPts);

  // For each team work out best-case and worst-case finishing positions.
  // Best case = team wins all remaining, every rival drops zero. Rivals' final = current pts.
  // Worst case = team drops all remaining, every rival wins all theirs. Rivals' final = maxPts.
  const bestCasePos = {};
  const worstCasePos = {};
  for (const me of sorted) {
    const myMax = me.maxPts;
    const myMin = me.pts;
    let aheadInBest = 0,
      aheadInWorst = 0;
    for (const other of sorted) {
      if (other === me) continue;
      if (other.pts > myMax) aheadInBest++;
      if (other.maxPts > myMin) aheadInWorst++;
    }
    bestCasePos[me.c] = aheadInBest + 1;
    worstCasePos[me.c] = aheadInWorst + 1;
  }

  // Status per row.
  const withStatus = sorted.map(me => {
    const best = bestCasePos[me.c];
    const worst = worstCasePos[me.c];
    let status = 'in-contention';
    let statusLabel = 'IN CONTENTION';
    if (me === leader && championConfirmed) {
      status = 'champion';
      statusLabel = 'CHAMPIONS · PROMOTED';
    } else if (worst <= promotionSpots) {
      // Guaranteed promotion already.
      status = 'promoted';
      statusLabel = 'PROMOTED';
    } else if (best <= promotionSpots) {
      status = 'promotion-contender';
      statusLabel = 'PROMOTION CONTENDER';
    } else {
      status = 'eliminated';
      statusLabel = 'PROMOTION ELIMINATED';
    }
    return {
      ...me,
      status,
      statusLabel,
      bestCasePos: best,
      worstCasePos: worst
    };
  });

  // Smart promotion narrative.
  const promotedTeams = withStatus.filter(r => r.status === 'champion' || r.status === 'promoted');
  const contenders = withStatus.filter(r => r.status === 'promotion-contender');
  const remainingSpots = Math.max(0, promotionSpots - promotedTeams.length);

  // Compose a single human-readable line - bonus: include who's racing.
  let narrative;
  if (remainingSpots === 0) {
    if (promotedTeams.length === 1) {
      narrative = `${promotedTeams[0].c} confirmed as champions. Both promotion spots filled.`;
    } else {
      narrative = `Both promotion spots filled: ${promotedTeams.map(p => p.c).join(' and ')}.`;
    }
  } else if (contenders.length === 0) {
    narrative = `${remainingSpots} promotion spot${remainingSpots === 1 ? '' : 's'} still open · no team currently in contention.`;
  } else if (contenders.length === remainingSpots) {
    narrative = `${contenders.map(c => c.c).join(' and ')} all but confirmed for promotion, pending final fixtures.`;
  } else {
    const championLine = promotedTeams.length === 1 && promotedTeams[0].status === 'champion' ? `Champion confirmed (${promotedTeams[0].c}). ` : promotedTeams.length > 0 ? `${promotedTeams.map(p => p.c).join(', ')} promoted. ` : '';
    narrative = championLine + `${contenders.length} clubs battling for ${remainingSpots} remaining promotion spot${remainingSpots === 1 ? '' : 's'}: ${contenders.map(c => c.c).join(', ')}.`;
  }

  // Per-club one-line outlook (used in the table tooltips / narrative cards).
  for (const team of withStatus) {
    if (team.status === 'champion') {
      team.outlook = `Champions. ${team.pts} pts, mathematically uncatchable.`;
    } else if (team.status === 'promoted') {
      team.outlook = `Guaranteed promotion. Worst-case finish: ${team.worstCasePos}.`;
    } else if (team.status === 'promotion-contender') {
      const gap = sorted[promotionSpots - 1].pts - team.pts; // points behind the last promotion spot
      if (team.remaining === 0) {
        team.outlook = `Season complete on ${team.pts} pts. Promotion depends on rivals.`;
      } else if (gap <= 0) {
        team.outlook = `Currently in a promotion spot. ${team.remaining} game${team.remaining === 1 ? '' : 's'} left.`;
      } else {
        team.outlook = `${gap} ${gap === 1 ? 'point' : 'points'} off the last promotion spot. ${team.remaining} game${team.remaining === 1 ? '' : 's'} left.`;
      }
    } else {
      team.outlook = `Cannot mathematically reach the top ${promotionSpots}. Eliminated.`;
    }
  }
  return {
    rows: withStatus,
    champion: championConfirmed ? leader : null,
    promotionSpots,
    totalGames,
    promotedTeams,
    contendersForPromotion: contenders,
    remainingSpots,
    narrative
  };
};

/* ══ RECOGNITION ENGINE ═════════════════════════════════════════════════════
   Awards, milestones, club records and leadership context. Built-in defaults
   (Jim El Bayati's first-ever captaincy + the 25/26 leadership group) always
   show; admin-entered rows from the `recognition` store are merged on top.
   Statistical milestones and records auto-calculate from the live derived
   stats, with a manual override layer. Leadership is context only: only the
   club captain becomes a record/achievement, never vice or third-choice. */
(function () {
  window.SA_DEFAULT_RECOGNITION = [
    { id: 'rec-first-captain-2526', type: 'club_record', recordKey: 'first_club_captain',
      title: 'First Ever Club Captain', season: '25/26',
      playerId: 10, playerName: 'Jim El Bayati', value: 'Jim El Bayati',
      description: 'Jim El Bayati was appointed the first club captain in Sue’s Angels FC history, leading the side through the inaugural 25/26 season.',
      isDefault: true },
    { id: 'rec-leadership-2526', type: 'leadership', season: '25/26',
      clubCaptainPlayerId: 10, clubCaptainName: 'Jim El Bayati',
      viceCaptainPlayerId: 25, viceCaptainName: 'Daniel McLane',
      thirdChoiceCaptainPlayerId: 2, thirdChoiceCaptainName: 'Andrew Allen',
      note: 'Jim El Bayati served as club captain, supported by vice-captain Daniel McLane and third-choice captain Andrew Allen.',
      isDefault: true },
    { id: 'trophy-league-ten-2526', type: 'trophy', title: 'League Ten Champions', season: '25/26', value: 'Champions', icon: 'trophy',
      description: 'Champions of League Ten at the first attempt, unbeaten across the whole season.', isDefault: true },
    { id: 'trophy-promotion-2526', type: 'trophy', title: 'Promoted to League Eight', season: '25/26', value: 'Promoted', icon: 'medal',
      description: 'Sealed promotion as champions, stepping up to League Eight for the 26/27 season.', isDefault: true },

    /* 25/26 End of Season awards (announced after the unbeaten League Ten title).
       Linked by squad number so names + photos stay consistent with each profile. */
    { id: 'season-2526-top-assister', type: 'season_award', title: 'Top Assister', season: '25/26', playerId: 9,
      description: 'Relentless all season. Energy, intelligence and selfless running made him a constant threat, and his assists and link play drove our attacking success.', isDefault: true },
    { id: 'season-2526-defensive-record', type: 'season_award', title: 'Defensive Record Award', season: '25/26', playerId: 28,
      description: 'The goalkeeper every championship side needs. Calm, commanding and full of match-winning saves as the Angels set a historic defensive record.', isDefault: true },
    { id: 'season-2526-goal-of-the-season', type: 'season_award', title: 'Goal of the Season', season: '25/26', playerId: 27,
      description: 'A stunning strike against Mala Vida, pure quality. A huge part of the season before injury cut it short. We can’t wait to see him back in yellow.', isDefault: true },
    { id: 'season-2526-top-goalscorer', type: 'season_award', title: 'Top Goalscorer', season: '25/26', playerId: 30,
      description: 'Goals, goals and more goals. Movement, composure and a finish in him at any moment. When the team needed one, Fraizer usually delivered.', isDefault: true },
    { id: 'season-2526-clubman', type: 'season_award', title: 'Clubman of the Year', season: '25/26', playerId: 10,
      description: 'A leader, role model and true club servant. As he closes his playing career he leaves the culture and standards that drive the club. A true legend.', isDefault: true },
    { id: 'season-2526-players-player', type: 'season_award', title: 'Players’ Player of the Year', season: '25/26', playerId: 25,
      description: 'Voted for by his teammates. Solid as a rock in defence and a real weapon from set pieces. A warrior who set the standard every single week.', isDefault: true },
    { id: 'season-2526-managers-player', type: 'season_award', title: 'Manager’s Player of the Year', season: '25/26', playerId: 20,
      description: 'Consistency, versatility and constant improvement. Right-back, wing-back, even emergency keeper with two clean sheets. Whatever the team needed, Dean delivered.', isDefault: true }
  ];

  function nameByNum(num) {
    var p = (window.SQUAD || []).filter(function (x) { return x.num === num; })[0];
    return p ? ((p.first ? p.first + ' ' : '') + p.last).trim() : null;
  }
  window.playerNameByNum = nameByNum;

  // Merge built-in defaults with stored rows (stored overrides default by id).
  window.getRecognition = function (type) {
    var byId = {};
    (window.SA_DEFAULT_RECOGNITION || []).forEach(function (r) { byId[r.id] = r; });
    var stored = (typeof window.getRecognitionStored === 'function' ? window.getRecognitionStored() : []) || [];
    stored.forEach(function (r) { if (r && r.id) byId[r.id] = r; });
    var all = Object.keys(byId).map(function (k) { return byId[k]; });
    return type ? all.filter(function (r) { return r.type === type; }) : all;
  };

  window.getSeasonLeadership = function (season) {
    var s = season || window.CURRENT_SEASON;
    return window.getRecognition('leadership').filter(function (r) { return r.season === s; })[0] || null;
  };

  // Threshold milestones derived from a player's all-time stats.
  window.autoMilestones = function (num) {
    if (typeof window.derivedPlayerStats !== 'function') return [];
    var st = window.derivedPlayerStats(num, null, 'all') || {};
    var out = [];
    var add = function (kind, label, value) { out.push({ type: 'milestone', milestoneType: kind, value: value, title: label, playerId: num, auto: true }); };
    [25, 50, 100].forEach(function (t) { if (st.apps >= t) add('apps', t + ' Appearances', t); });
    [25, 50, 100].forEach(function (t) { if (st.goals >= t) add('goals', t + ' Goals', t); });
    [25, 50, 100].forEach(function (t) { if (st.assists >= t) add('assists', t + ' Assists', t); });
    [10, 25, 50].forEach(function (t) { if (st.cleanSheets >= t) add('cleanSheets', t + ' Clean Sheets', t); });
    return out;
  };

  // Our perspective on a result (handles home/away), null if not our match.
  function ourSide(r) {
    var homeUs = /angel/i.test(r.home || ''), awayUs = /angel/i.test(r.away || '');
    if (!homeUs && !awayUs) return null;
    if (r.hs == null || r.as == null) return null;
    var ourG = homeUs ? r.hs : r.as, oppG = homeUs ? r.as : r.hs;
    return { ourG: ourG, oppG: oppG, win: ourG > oppG, margin: ourG - oppG, comp: r.competition || '',
      opp: (homeUs ? r.away : r.home || '').replace(' FC', ''), date: r.date || r.sortISO || '' };
  }

  // First-to-reach landmarks (club firsts), derived chronologically from the
  // saved match data. Returns club_record-shaped rows so each landmark surfaces
  // BOTH on the Records page and on the achieving player's profile (via
  // getPlayerRecognition → getClubRecords). Each threshold is awarded once, to
  // the FIRST player in club history to cross it, stamped with the match it
  // happened in. Nothing shows until a threshold is actually reached.
  window.autoLandmarks = function () {
    if (typeof window.getAllMatchEntries !== 'function') return [];
    var results = (typeof window.getDerivedResults === 'function' ? window.getDerivedResults() : []) || [];
    var MON = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
    var dkey = function (d) { var p = String(d || '').trim().split(' '); if (p.length < 3) return ''; var y = p[2].length === 2 ? '20' + p[2] : p[2]; return y + ('0' + (MON[p[1]] || 0)).slice(-2) + ('0' + p[0]).slice(-2); };
    var chron = results.slice().sort(function (a, b) { return String(dkey(a.date)).localeCompare(String(dkey(b.date))); });
    var entriesById = {};
    (window.getAllMatchEntries() || []).forEach(function (m) { entriesById[m.id] = m.data; });
    var nameByNum = function (n) { return (window.playerNameByNum ? window.playerNameByNum(n) : '') || ('#' + n); };
    var THRESH = { apps: [25, 50, 100], goals: [25, 50, 100], assists: [25, 50], cleanSheets: [10, 25] };
    var LABEL = { apps: 'Appearances', goals: 'Goals', assists: 'Assists', cleanSheets: 'Clean Sheets' };
    var ICON = { apps: 'people', goals: 'ball', assists: 'pass', cleanSheets: 'shield' };
    var totals = {}, done = {}, landmarks = [];
    var get = function (n) { return totals[n] || (totals[n] = { apps: 0, goals: 0, assists: 0, cleanSheets: 0 }); };
    chron.forEach(function (r) {
      var data = entriesById[r.id]; if (!data) return;
      var season = window.seasonOf ? window.seasonOf(r) : '';
      var homeUs = /angel/i.test(r.home || '');
      var opp = (homeUs ? r.away : r.home || '').replace(' FC', '');
      var scope = (r.date || '') + (opp ? ' v ' + opp : '');
      var apps = {}, seen = {};
      (data.starters || []).forEach(function (raw) { var e = normEntry(raw); if (!e || e.num == null || seen[e.num]) return; seen[e.num] = 1; apps[e.num] = 1; });
      (data.bench || []).forEach(function (raw) { var e = normEntry(raw); if (!e || e.num == null || seen[e.num]) return; seen[e.num] = 1; if (e.positions && e.positions.length) apps[e.num] = 1; });
      var gper = {}, aper = {}, csper = {};
      (data.goals || []).forEach(function (g) { if (g && g.num != null) gper[g.num] = (gper[g.num] || 0) + 1; });
      (data.assists || []).forEach(function (a) { if (a && a.num != null) aper[a.num] = (aper[a.num] || 0) + 1; });
      if ((data.opponentGoals || []).length === 0) {
        var gk = {};
        (data.starters || []).concat(data.bench || []).forEach(function (raw) { var e = normEntry(raw); if (e && e.num != null && e.positions && e.positions.some(function (p) { return /^GK$|^GOAL/i.test(p); })) gk[e.num] = 1; });
        Object.keys(gk).forEach(function (n) { csper[n] = 1; });
      }
      var nums = {};
      [apps, gper, aper, csper].forEach(function (o) { Object.keys(o).forEach(function (n) { nums[n] = 1; }); });
      Object.keys(nums).map(Number).sort(function (a, b) { return a - b; }).forEach(function (n) {
        var t = get(n);
        if (apps[n]) t.apps += 1;
        t.goals += gper[n] || 0;
        t.assists += aper[n] || 0;
        if (csper[n]) t.cleanSheets += 1;
        Object.keys(THRESH).forEach(function (metric) {
          THRESH[metric].forEach(function (thr) {
            var key = 'first_to_' + thr + '_' + metric;
            if (done[key] || t[metric] < thr) return;
            done[key] = 1;
            landmarks.push({ id: 'auto-' + key, type: 'club_record', recordKey: key, group: 'player',
              playerId: n, playerName: nameByNum(n), title: 'First to ' + thr + ' ' + LABEL[metric],
              value: String(thr), scope: scope, season: season, icon: ICON[metric], landmark: true, metric: metric, auto: true });
          });
        });
      });
    });
    return landmarks;
  };

  // Statistical club records derived from the live stats + results.
  window.autoClubRecords = function (seasonKey) {
    var sk = seasonKey || 'all';
    var sLabel = sk === 'all' ? '' : sk;
    var ALL = 'All competitions', LGE = 'League Ten';
    var squad = (typeof window.derivedSquad === 'function' ? window.derivedSquad(null, sk) : []) || [];
    var recs = [];
    var pushLeader = function (recordKey, title, key) {
      var sorted = squad.filter(function (p) { return p[key] > 0; }).sort(function (a, b) { return b[key] - a[key] || b.apps - a.apps; });
      var p = sorted[0]; if (!p) return;
      recs.push({ id: 'auto-' + recordKey, type: 'club_record', recordKey: recordKey, title: title, group: 'player', scope: ALL,
        playerId: p.num, playerName: (p.first ? p.first + ' ' : '') + p.last, value: String(p[key]), season: sLabel, auto: true });
    };
    pushLeader('most_apps', 'Most Appearances', 'apps');
    pushLeader('most_goals', 'Most Goals', 'goals');
    pushLeader('most_assists', 'Most Assists', 'assists');
    pushLeader('most_clean_sheets', 'Most Clean Sheets', 'cleanSheets');
    pushLeader('most_motm', 'Most Man of the Match Awards', 'motm');

    var results = (typeof window.getDerivedResults === 'function' ? window.getDerivedResults() : []) || [];
    if (sk !== 'all' && window.seasonOf) results = results.filter(function (r) { return window.seasonOf(r) === sk; });
    var MON = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
    var dkey = function (d) { var p = String(d || '').trim().split(' '); return p.length < 3 ? '' : p[2] + ('0' + (MON[p[1]] || 0)).slice(-2) + ('0' + p[0]).slice(-2); };
    var isLoss = function (r) { if (r.hs == null || r.as == null) return false; var hu = /angel/i.test(r.home || ''); return (hu ? r.hs : r.as) < (hu ? r.as : r.hs); };
    var sides = results.map(ourSide).filter(Boolean);
    var chron = sides.slice().sort(function (a, b) { return String(dkey(a.date)).localeCompare(String(dkey(b.date))); });
    var streakOf = function (arr, test) { var run = 0, best = 0; arr.forEach(function (s) { run = test(s) ? run + 1 : 0; if (run > best) best = run; }); return best; };
    var pushTeam = function (recordKey, title, value, scope) { if (value != null && value !== '') recs.push({ id: 'auto-' + recordKey, type: 'club_record', recordKey: recordKey, group: 'team', title: title, value: value, scope: scope, season: sLabel, auto: true }); };
    // Biggest win (any competition)
    var wins = sides.filter(function (s) { return s.win; }).sort(function (a, b) { return b.margin - a.margin || b.ourG - a.ourG; });
    if (wins[0]) pushTeam('biggest_win', 'Biggest Win', wins[0].ourG + '-' + wins[0].oppG + ' v ' + wins[0].opp, ALL);
    // Longest winning streak (any competition)
    var w = streakOf(chron, function (s) { return s.win; }); if (w > 0) pushTeam('win_streak', 'Longest Winning Streak', w + (w === 1 ? ' win' : ' wins'), ALL);
    // Longest unbeaten run - LEAGUE only. Walkover / awarded wins are recorded
    // without a score, so they count as unbeaten; only a scored DEFEAT breaks it.
    var lgeChron = results.filter(function (r) { return /league/i.test(r.competition || ''); }).slice().sort(function (a, b) { return String(dkey(a.date)).localeCompare(String(dkey(b.date))); });
    var ubRun = 0, ubBest = 0;
    lgeChron.forEach(function (r) { ubRun = isLoss(r) ? 0 : ubRun + 1; if (ubRun > ubBest) ubBest = ubRun; });
    if (ubBest > 1) pushTeam('unbeaten_run', 'Longest Unbeaten Run', ubBest + ' games', LGE);
    // Goals scored (any competition)
    var gf = sides.reduce(function (a, s) { return a + (s.ourG || 0); }, 0);
    if (gf > 0) pushTeam('total_goals', sk === 'all' ? 'Goals Scored (all-time)' : 'Goals Scored', String(gf), ALL);
    // First-to-reach landmarks. Computed all-time chronologically, then shown in
    // 'all' view or under the season they were achieved.
    if (typeof window.autoLandmarks === 'function') {
      window.autoLandmarks().forEach(function (l) { if (sk === 'all' || l.season === sk) recs.push(l); });
    }
    return recs;
  };

  // Auto + manual/default records for a season ('all' = all-time). Manual records
  // override auto by recordKey; other-season manual records are excluded.
  window.getClubRecords = function (seasonKey) {
    var sk = seasonKey || 'all';
    var byKey = {};
    window.autoClubRecords(sk).forEach(function (r) { byKey[r.recordKey || r.id] = r; });
    window.getRecognition('club_record').forEach(function (r) {
      if (sk !== 'all' && r.season && r.season !== sk) return;
      byKey[r.recordKey || r.id] = r;
    });
    return Object.keys(byKey).map(function (k) { return byKey[k]; });
  };

  // Trophies / honours won by the club (newest season first).
  window.getTrophies = function () {
    return window.getRecognition('trophy').slice().sort(function (a, b) { return String(b.season || '').localeCompare(String(a.season || '')); });
  };

  // Everything attached to one player. Leadership is intentionally NOT included
  // here (it carries no single playerId), so vice / third-choice captain never
  // surface as achievements; only the captaincy club_record (playerId set) does.
  window.getPlayerRecognition = function (num) {
    var mine = window.getRecognition().filter(function (r) { return r.playerId === num; });
    return {
      potm: mine.filter(function (r) { return r.type === 'potm'; }),
      seasonAwards: mine.filter(function (r) { return r.type === 'season_award'; }),
      matchAwards: mine.filter(function (r) { return r.type === 'match_award'; }),
      milestones: (window.autoMilestones(num) || []).concat(mine.filter(function (r) { return r.type === 'milestone'; })),
      records: window.getClubRecords().filter(function (r) { return r.playerId === num; }),
      hasAny: false
    };
  };
})();

/* ══ RECOGNITION: monthly stats + MOTM list ════════════════════════════════
   Auto-derive a player's stats for a single month (so Player of the Month only
   needs a name + month), and the full Man of the Match list from match data. */
(function () {
  var MON = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
  var FIRST_HALF = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec']; // calendar year = first half of the season label
  function featured(e, num) {
    var f = function (arr) { return (arr || []).some(function (x) { var n = (x && typeof x === 'object') ? x.num : x; return n === num; }); };
    return f(e.starters) || f(e.bench);
  }
  // Stats for ONE player in ONE month of a season, from played match data.
  window.monthlyPlayerStats = function (num, monthName, season) {
    num = parseInt(num, 10);
    var s = season || window.CURRENT_SEASON;
    var yrs = String(s || '').split('/');
    var _norm = function (m) { return String(m || '').slice(0, 3).toLowerCase(); };
    var _ORDER3 = ['aug', 'sep', 'oct', 'nov', 'dec', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul'];
    var _mi = _ORDER3.indexOf(_norm(monthName));
    var yy = ((_mi >= 0 && _mi <= 4) ? yrs[0] : yrs[1]) || '';
    var isGk = ((window.SQUAD || []).filter(function (x) { return x.num === num; })[0] || {}).gk;
    var st = { apps: 0, goals: 0, assists: 0, motm: 0, cleanSheets: 0 };
    var results = (typeof window.getDerivedResults === 'function' ? window.getDerivedResults() : []) || [];
    results.forEach(function (r) {
      var d = String(r.date || '').trim().split(' ');
      if (d.length < 3 || _norm(d[1]) !== _norm(monthName) || d[2] !== yy) return;
      if (window.seasonOf && window.seasonOf(r) !== s) return;
      var e = window.loadMatchEntry ? window.loadMatchEntry(r.id) : null; if (!e) return;
      var feat = featured(e, num);
      if (feat) st.apps++;
      (e.goals || []).forEach(function (g) { if (g && g.num === num) st.goals++; });
      (e.assists || []).forEach(function (a) { if (a && a.num === num) st.assists++; });
      if (e.motm === num) st.motm++;
      if (isGk && feat) { var homeUs = /angel/i.test(r.home || ''); var conc = homeUs ? r.as : r.hs; if (conc === 0) st.cleanSheets++; }
    });
    return st;
  };
  // Every Man of the Match award, newest first.
  window.getMotmList = function (season) {
    var results = (typeof window.getDerivedResults === 'function' ? window.getDerivedResults() : []) || [];
    var key = function (d) { var p = String(d || '').trim().split(' '); if (p.length < 3) return ''; return p[2] + ('0' + (MON[p[1]] || 0)).slice(-2) + ('0' + p[0]).slice(-2); };
    var out = [];
    results.forEach(function (r) {
      if (season && window.seasonOf && window.seasonOf(r) !== season) return;
      var e = window.loadMatchEntry ? window.loadMatchEntry(r.id) : null;
      if (!e || e.motm == null) return;
      var homeUs = /angel/i.test(r.home || '');
      out.push({ matchId: r.id, date: r.date || '', sort: key(r.date),
        opp: String(homeUs ? r.away : r.home || '').replace(' FC', ''),
        score: homeUs ? (r.hs + '-' + r.as) : (r.as + '-' + r.hs),
        playerId: e.motm, playerName: window.playerNameByNum ? window.playerNameByNum(e.motm) : ('#' + e.motm) });
    });
    return out.sort(function (a, b) { return String(b.sort).localeCompare(String(a.sort)); });
  };
})();
