/* ==========================================================================
   CANONICAL CLUB FACTS
   Verified against production Supabase, the deployed site and the recovery
   package. Where a fact appears in more than one source, Supabase wins,
   then the deployed branch, then the recovery snapshot.
   ========================================================================== */

export const CLUB = {
  name: "Sue's Angels FC",
  short: 'Sue’s Angels',
  nickname: 'The Angels',
  founded: 2025,
  type: "Men's Sunday league football club",
  town: 'London',
  region: 'Surrey / South London',
  league: 'Southern Sunday Football League',
  division: 'League Ten',
  nextDivision: 'League Eight',
  venue: {
    name: 'The Reeves Sports Club',
    locality: 'London',
    country: 'GB',
  },
  email: 'suesangelsfc@gmail.com',
  site: 'https://www.suesangelsfc.co.uk',
  memorial: {
    name: 'Susan Anne Martin',
    motto: 'What we do in life echoes in eternity.',
    cause: 'sepsis awareness',
  },
  charity: {
    name: 'UK Sepsis Trust',
    url: 'https://www.sepsistrust.org/',
  },
  nhs: 'https://www.nhs.uk/conditions/sepsis/',
  youtube: { handle: '@suesangelsfc', channelId: '' },
  socials: [
    { label: 'Instagram', href: 'https://www.instagram.com/suesangelsfc/', icon: 'instagram' },
    { label: 'YouTube', href: 'https://www.youtube.com/@suesangelsfc', icon: 'youtube' },
    { label: 'Facebook', href: 'https://www.facebook.com/people/Sues-Angels-FC/61576808678302/', icon: 'facebook' },
  ],
};

/* Sepsis guidance. Sourced from the UK Sepsis Trust and NHS, mirrored from
   the wording already published on the live site. Clearly framed as general
   awareness information, never as medical advice. */
export const SEPSIS = {
  livesLostUK: '48,000',
  source: 'UK Sepsis Trust',
  what:
    "Sepsis is what can happen when the body’s response to an infection starts to harm its own tissues and organs. It can affect anyone, at any age, and it can turn serious very quickly. That is why noticing it early matters so much.",
  adultSigns: [
    { letter: 'S', title: 'Slurred speech or confusion', body: 'Sudden disorientation, drowsiness or trouble speaking clearly.' },
    { letter: 'E', title: 'Extreme shivering or muscle pain', body: 'Shaking, fever, or pain that feels far worse than usual.' },
    { letter: 'P', title: 'Passing no urine in a day', body: 'A clear drop in how often they go to the toilet.' },
    { letter: 'S', title: 'Severe breathlessness', body: 'Struggling for breath, or breathing very fast.' },
    { letter: 'I', title: '“It feels like I’m going to die”', body: 'A deep, sudden sense that something is seriously wrong.' },
    { letter: 'S', title: 'Skin mottled, bluish or pale', body: 'Blotchy, discoloured or unusually pale skin.' },
  ],
  childSigns: [
    'Is breathing very fast',
    'Has a fit or convulsion',
    'Looks mottled, bluish or pale',
    'Has a rash that doesn’t fade when you press it',
    'Is very lethargic or hard to wake',
    'Feels abnormally cold to touch',
  ],
  babyNote:
    'For babies under 5, also look out for not feeding, repeated vomiting, or no wet nappy for 12 hours.',
  disclaimer:
    'This page shares general awareness information, not medical advice. For full, up to date guidance please visit the UK Sepsis Trust and the NHS. If someone is getting worse quickly, call 999 or NHS 111 and ask: could it be sepsis?',
};

/* Position taxonomy, used to group the squad and to read line-up codes. */
export const POSITION_GROUPS = [
  { key: 'gk', label: 'Goalkeepers', codes: ['GK'] },
  { key: 'def', label: 'Defenders', codes: ['LB', 'RB', 'CB', 'LCB', 'RCB', 'LWB', 'RWB'] },
  { key: 'mid', label: 'Midfielders', codes: ['CM', 'LCM', 'RCM', 'DM', 'CDM', 'AM', 'CAM', 'LM', 'RM'] },
  { key: 'fwd', label: 'Forwards', codes: ['ST', 'CF', 'LW', 'RW', 'SS'] },
];

export const POSITION_LABEL = {
  GK: 'Goalkeeper', LB: 'Left back', RB: 'Right back', CB: 'Centre back',
  LCB: 'Centre back', RCB: 'Centre back', LWB: 'Left wing back', RWB: 'Right wing back',
  DM: 'Defensive midfield', CDM: 'Defensive midfield', CM: 'Central midfield',
  LCM: 'Central midfield', RCM: 'Central midfield', AM: 'Attacking midfield',
  CAM: 'Attacking midfield', LM: 'Left midfield', RM: 'Right midfield',
  LW: 'Left wing', RW: 'Right wing', ST: 'Striker', CF: 'Centre forward', SS: 'Second striker',
};

/* Sponsorship packages. Deliberately no prices - the brief forbids inventing
   commercial promises, and no published rate card exists. */
export const SPONSOR_TIERS = [
  {
    name: 'Principal partner',
    body: 'Front-of-shirt presence, your mark on every matchday graphic, and top billing across the site.',
    items: ['Front of shirt', 'Home page and sponsors page', 'Every matchday graphic', 'Named in match reports'],
  },
  {
    name: 'Matchday partner',
    body: 'Back a specific fixture and carry that match from announcement through to the full report.',
    items: ['Named on the fixture graphic', 'Match report attribution', 'Gallery album credit'],
  },
  {
    name: 'Player sponsor',
    body: 'Back one player for the season and appear on their profile all year.',
    items: ['Named on a player profile', 'Season-long placement', 'Social announcement'],
  },
  {
    name: 'Club supporter',
    body: 'Support the club and the cause without a commercial placement.',
    items: ['Listed as a club supporter', 'Our thanks, on and off the pitch'],
  },
];

export const ENQUIRY_TYPES = [
  { key: 'trial', label: 'Player trial' },
  { key: 'volunteer', label: 'Volunteering' },
  { key: 'media', label: 'Media and content' },
  { key: 'sponsorship', label: 'Sponsorship' },
  { key: 'general', label: 'Something else' },
];

/* Recruitment routes for the Join page. */
export const JOIN_PATHS = [
  {
    n: '01',
    title: 'Play for the Angels',
    body: 'We look at players across every position ahead of each season. Tell us your position, your age and where you have played, and we will come back to you about a trial.',
    cta: { label: 'Apply for a trial', href: '/join.html#trial' },
    type: 'trial',
  },
  {
    n: '02',
    title: 'Join the media team',
    body: 'Photography, video, editing and matchday content. If you want portfolio work on a real matchday every week, this is a good place to build it.',
    cta: { label: 'Join the media team', href: '/join.html#media' },
    type: 'media',
  },
  {
    n: '03',
    title: 'Volunteer with us',
    body: 'Coaching, kit, fixtures, socials, fundraising. A Sunday-league club runs on people giving up their time, and there is always more to do.',
    cta: { label: 'Volunteer', href: '/join.html#volunteer' },
    type: 'volunteer',
  },
  {
    n: '04',
    title: 'Sponsor the club',
    body: 'Put your business behind a club with a cause at its heart, and help us carry Sue’s message further.',
    cta: { label: 'Talk sponsorship', href: '/sponsors.html#enquire' },
    type: 'sponsorship',
  },
];
