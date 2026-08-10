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
    /* What the club calls it in its own copy, and the district it is in.
       "The Reeves Sports Club in London" is correct and reads like nobody
       who plays there wrote it. */
    shortName: 'The Reeves',
    /* Snakey Lane comes from stainesrugby.uk, who share this ground with us
       and publish it as their own address. That makes it a first-party
       source rather than a guess off a map. No postcode: nobody has
       published one we can stand behind, and a wrong postcode sends a
       visiting team to the wrong side of Hanworth. */
    street: 'Snakey Lane',
    district: 'Hanworth',
    locality: 'London',
    country: 'GB',
    mapQuery: 'The Reeves Sports Club, Snakey Lane, Hanworth, London',
  },
  /* The towns the club actually draws from, for schema areaServed and for
     copy. Grassroots search is hyper-local: "Sunday league football Hanworth"
     is a real query in a way that "Sunday league football London" is not.
     These are the five the club already names in its own published wording,
     not a guessed radius round the ground. */
  areaServed: [
    'Kingston upon Thames',
    'Hanworth',
    'Sunbury-on-Thames',
    'Twickenham',
    'Staines-upon-Thames',
  ],
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
  /* `live: false` means the site does not link it. Every one of these was
     requested and checked:

       Instagram  200
       TikTok     200  (was hard-coded into the home page footer only, so the
                        shared footer on the other 99 pages never had it)
       Facebook   400  to a scripted request, but so is a known-good Facebook
                        profile, so that is bot-blocking and proves nothing
                        either way. Left live.
       YouTube    404  and a control request to a real channel returns 200, so
                        the handle genuinely does not exist. It is linked from
                        the footer, and from three call-to-action buttons on
                        the live and videos pages. Publishing it would put a
                        dead link on all 100 pages of a site that currently
                        has none. Flip this to true the moment the real handle
                        is known; nothing else needs to change. */
  socials: [
    { label: 'Instagram', href: 'https://www.instagram.com/suesangelsfc/', icon: 'instagram', live: true },
    { label: 'TikTok', href: 'https://www.tiktok.com/@suesangelsfc', icon: 'tiktok', live: true },
    { label: 'YouTube', href: 'https://www.youtube.com/@suesangelsfc', icon: 'youtube', live: false },
    { label: 'Facebook', href: 'https://www.facebook.com/people/Sues-Angels-FC/61576808678302/', icon: 'facebook', live: true },
  ],
};

/* What the site may actually link. Everything that renders a social link uses
   this; CLUB.socials stays the full record so an unverified channel is
   documented rather than deleted and forgotten. */
export const SOCIALS = CLUB.socials.filter((s) => s.live !== false);

/* The channel URL, or null while the handle is unconfirmed. The live and
   videos pages check this rather than assuming a channel exists. */
export const YOUTUBE_URL = CLUB.socials.find((s) => s.icon === 'youtube' && s.live !== false)?.href || null;

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
/* Positions live in src/lib/positions.mjs now, one list with a full name, a
   group and a place on the pitch for every code the club's records have ever
   used. These two were missing LDM, RDM, LAM and RAM, which the archive
   contains, so a player page printed the raw code beside a proper name.
   Re-exported here because a dozen files import them from club.mjs. */
export { POSITION_GROUPS, POSITION_LABEL } from './positions.mjs';

/* Current partners, recovered from the deployed site. Sponsor logos are the
   partners' own marks and are never recoloured or restyled. */
export const SPONSORS = [
  { name: "Bloomin' Marvellous", tier: 'Main kit sponsor', logo: '/assets/sponsors/bloomin-marvellous.png' },
  { name: 'Sporting Solutions', tier: 'Founding kit partner', logo: '/assets/sponsors/sporting-solutions.webp' },
  { name: 'Hodgson Roofing', tier: 'Warm-up and training top sponsor', logo: '/assets/sponsors/hodgson-roofing.webp' },
  { name: 'Staines Rugby', tier: 'Ground-share partner', logo: '/assets/sponsors/staines-rugby.png' },
  { name: 'HLO', tier: 'Club partner', logo: '/assets/sponsors/hlo.svg' },
];

/* ==========================================================================
   WHO SHOOTS FOR THE CLUB

   Three people turn up with a camera and 606 photographs on this site are
   theirs. The credit was a bare string on each album record, repeated in six
   places, and there was nowhere to put a link even where somebody was happy
   to have one.

   `name` MUST be the string the album records already carry, because that is
   what the credit is matched on. A mismatch does not break anything: the
   credit falls back to plain text, which is exactly what it was before.

   `channels` is optional and absent means no link, which is the safe default
   and the reason nobody has to be listed here at all. Nothing is added to it
   that the person has not agreed to: a photographer is a private individual,
   not a business with a public storefront, and a wrong handle on a club page
   sends supporters to a stranger.
   ========================================================================== */
export const PHOTOGRAPHERS = [
  /* Confirmed by the club on 10 August 2026. It is not inferred from the
     name matching, which is all this end could ever establish. */
  { name: 'Richie Luwawa', channels: [{ label: 'Instagram', href: 'https://www.instagram.com/luwxwa/' }] },
  { name: 'Jimi El Bayati', channels: [] },
  { name: 'Louis Allen', channels: [] },
];

/* The credit for one photographer: their channels, or nothing. Every place
   that prints a photographer's name asks this, so a link added here appears
   in all six at once and cannot appear in five. */
export function photographerChannels(name) {
  const key = String(name || '').trim().toLowerCase();
  if (!key) return [];
  const rec = PHOTOGRAPHERS.find((p) => p.name.toLowerCase() === key);
  return (rec && rec.channels) || [];
}

/* The partners the sponsors page leads on, in billing order.

   `trade` is only filled in where the partner's own mark or copy states it,
   so nothing here is a guess about somebody else's business. `detail` is what
   opens when a visitor asks to know more, and `placements` is what that
   partner's money actually buys, which is also the honest way to show a
   prospect what a slot looks like.

   `links` carries each partner's own website and channels. Every one was
   checked against the business's own site before it went in, because sending
   a supporter to the wrong company is worse than sending them nowhere:
     - bloomin-marvellous.com states the exact strapline on their mark and
       serves Kingston, Richmond, Twickenham and Teddington, our patch.
     - stainesrugby.uk lists its address as The Reeves, Snakey Lane, Hanworth,
       which is our ground. Definitive.
     - hodgsonroofing.com is the right name and NFRC-registered, but describes
       itself as Harrow and Windsor. Likely, and worth a check.
     - Sporting Solutions was supplied by the club. Several UK companies share
       the name and a web search surfaces a sports-betting firm first, so this
       one is not guessable and had to come from the club itself.

   SPONSORS above is the homepage logo strip and still carries HLO, which has
   never appeared on the sponsors page. */
export const PARTNERS = [
  {
    name: "Bloomin' Marvellous",
    role: 'Main kit sponsor',
    since: '26/27',
    trade: 'Garden design, landscaping and maintenance',
    body: 'Front of the matchday shirt for the League Eight season.',
    detail: 'Our main kit sponsor: the name across the front of the shirt the first team '
      + 'plays in every weekend. A local garden design, landscaping and maintenance business, '
      + 'and the most visible partnership at the club.',
    placements: [
      'Front of the matchday shirt',
      'Top billing on the home page and this page',
      'Every matchday and result graphic',
      'Named in match reports',
    ],
    links: [
      { label: 'Website', href: 'https://www.bloomin-marvellous.com/' },
      { label: 'Instagram', href: 'https://www.instagram.com/bloominmarvellousuk/' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/company/bloomin-marvellous-landscapes-ltd-uk' },
    ],
    logo: '/assets/sponsors/bloomin-marvellous.png',
  },
  {
    name: 'Sporting Solutions Ltd',
    role: 'Founding kit partner',
    since: '25/26',
    body: 'On the matchday shirt every weekend of the unbeaten title-winning season.',
    detail: 'Our first ever kit sponsor. Sporting Solutions backed the club from the very '
      + 'first fixture and were on the shirt for all eighteen League Ten wins in 25/26, the '
      + 'season that took us up to League Eight.',
    placements: [
      'On the shirt throughout the inaugural 25/26 season',
      'Named on the championship squad photograph',
      'Listed on the home page and this page',
    ],
    links: [
      { label: 'Instagram', href: 'https://www.instagram.com/sporting_solutions_ltd/' },
    ],
    logo: '/assets/sponsors/sporting-solutions.webp',
  },
  {
    name: 'Hodgson Roofing',
    role: 'Warm-up and training top sponsor',
    trade: 'NFRC-accredited roofing specialists',
    body: 'On the squad pre-match and through every training session.',
    detail: 'NFRC-accredited roofing specialists, and the name the squad wears before kick-off. '
      + 'The warm-up and training tops are worn at every session and every pre-match, which puts '
      + 'the brand in front of players, families and visiting clubs before a ball is kicked.',
    placements: [
      'Warm-up shirts worn before every match',
      'Training kit worn at every session',
      'Listed on the home page and this page',
    ],
    links: [
      { label: 'Website', href: 'https://www.hodgsonroofing.com/' },
      { label: 'Instagram', href: 'https://www.instagram.com/hodgsonroofing/' },
      { label: 'Facebook', href: 'https://www.facebook.com/p/Hodgson-Roofing-61553496913782/' },
    ],
    logo: '/assets/sponsors/hodgson-roofing.webp',
  },
  {
    name: 'Staines Rugby Club',
    role: 'Ground-share partner',
    body: 'Our home at The Reeves, where the Angels train and play.',
    detail: 'Not a commercial sponsor but a partner club, and the reason we have a home. '
      + 'Staines Rugby Club share The Reeves in Hanworth with us, where the Angels train through '
      + 'the week and play every home fixture.',
    placements: [
      'Home ground at The Reeves, Hanworth',
      'Training facilities through the week',
      'Listed on the home page and this page',
    ],
    links: [
      { label: 'Website', href: 'https://www.stainesrugby.uk/' },
      { label: 'Instagram', href: 'https://www.instagram.com/stainesrugby/' },
      { label: 'X', href: 'https://twitter.com/StainesRugby' },
      { label: 'YouTube', href: 'https://www.youtube.com/@StainesRugby1926' },
    ],
    logo: '/assets/sponsors/staines-rugby.png',
  },
];

/* The sponsorship pack, as deployed. */
export const SPONSOR_PACK = '/assets/sue-angels-sponsorship-pack.pdf';

/* Questions the club actually gets asked, for the homepage FAQ. Answered
   plainly, and marked up so they can earn an FAQ rich result. `aHtml` is the
   rendered answer; `a` is the same answer as plain text, because FAQPage
   structured data takes text, not markup. */
export const FAQS = [
  {
    q: "Where are Sue's Angels FC based?",
    a: "We're a men's Sunday league football club in south-west London, playing our home matches at The Reeves in Hanworth.",
  },
  {
    q: 'What league do you play in?',
    a: 'After winning League Ten unbeaten in our debut 25/26 season, we now compete in League Eight of the Southern Sunday Football League.',
  },
  {
    q: "Why were Sue's Angels founded?",
    a: 'The club was founded in 2025 in memory of Susan Anne Martin. We play to keep her name alive and to raise awareness of sepsis.',
  },
  {
    q: 'How can I join?',
    a: 'New players and volunteers are always welcome. Get in touch through the Join the Club section below, or message us on Instagram @suesangelsfc.',
    aHtml: 'New players and volunteers are always welcome. Get in touch through the <a href="/join.html">Join the Club</a> section below, or message us on Instagram <a href="https://www.instagram.com/suesangelsfc" rel="noopener">@suesangelsfc</a>.',
  },
  {
    q: 'Who sponsors the club?',
    a: "We're proudly backed by Sporting Solutions, Bloomin' Marvellous, Hodgson Roofing and Staines Rugby.",
  },
];

/* ---- Next fixture baseline -------------------------------------------
   The `fixtures` table is still empty, so the upcoming match comes from here
   until the league releases the 26/27 card and rows land. A real row always
   wins: the homepage reads d.fixtures first and only falls back to this. */
export const NEXT_FIXTURE = {
  opponent: 'Pure Football',
  /* The badge registry is keyed by the club's full registered name. */
  badgeName: 'Pure Football FC 2.0',
  weAreHome: false,
  competition: 'Pre-season friendly',
  label: 'Pre-season',
  date: '2026-08-02',
  iso: '2026-08-02',
  isoDateTime: '2026-08-02T10:30:00+01:00',
  dateLabel: 'Sun 2 Aug',
  kick: '10:30',
  venue: 'Away, TBC',
};

/* ---- End of season awards, 25/26 --------------------------------------
   The awards themselves are a club decision rather than a derived figure, so
   they are recorded here; the player, their photograph and the link to their
   profile are all resolved from the squad by shirt number. */
export const SEASON_AWARDS = [
  { num: 9, name: 'Charlie Dunkley', title: 'Top Assister' },
  { num: 28, name: 'Luke Munns', title: 'Defensive Record' },
  { num: 27, name: 'Malachi Mullings', title: 'Goal of the Season' },
  { num: 30, name: 'Frazier-Isaías Osunkoya', title: 'Top Goalscorer' },
  { num: 10, name: 'Jim El Bayati', title: 'Clubman of the Year' },
  { num: 25, name: 'Daniel McLane', title: "Players' Player" },
  { num: 20, name: 'Dean Knight', title: "Manager's Player" },
];

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

/* ---- Join page questions --------------------------------------------
   Distinct from FAQS, which answers "who are this club" for a visitor
   landing cold on the homepage. These answer "what happens if I put my name
   in", which is the only thing somebody on this page wants to know.

   There is deliberately NO training schedule here. The published one ("every
   Wednesday and every Sunday", from a start date that has since passed) is
   not something the site can keep true on its own, and a stale session time
   costs somebody a wasted morning at a locked ground. The club answers it by
   reply, where it can say what is actually happening this week. */
export const JOIN_FAQS = [
  {
    q: 'How do I arrange a trial?',
    a: 'Send the form and say what position you play. We will come back to you with the next session that suits, usually inside 48 hours. There is nothing to pay to trial.',
  },
  {
    q: 'Do I need experience for the media team?',
    a: 'No. If you can shoot on a phone, edit, design or write, there is a role for you, and we will help you grow into it.',
  },
  {
    q: 'What do volunteers get?',
    a: 'A proper football family, matchday access, and a genuine role in a club going places.',
  },
  {
    q: 'How do sponsorships work?',
    a: 'There is no fixed rate card. The packages on the sponsors page are shapes rather than price bands, and we build the detail around your business across kit, signage, content and community.',
    aHtml: 'There is no fixed rate card. The packages on the <a href="/sponsors.html">sponsors page</a> are shapes rather than price bands, and we build the detail around your business across kit, signage, content and community.',
  },
  {
    q: 'How quickly will I hear back?',
    a: 'Usually inside 48 hours. Everything on this page goes to the same inbox and a person reads it, so if it takes a little longer over a matchday weekend, it has not been missed.',
  },
];
