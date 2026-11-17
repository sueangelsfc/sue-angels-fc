/* ==========================================================================
   THE FIXTURES, AS A CALENDAR SOMEBODY CAN SUBSCRIBE TO

   The club publishes what is coming on /fixtures.html, on the front page's
   next-match card and in the programme, and every one of those requires
   somebody to come and look. A supporter who wants to be at The Reeves on
   Sunday has to remember to check, and a player who wants it in his phone has
   to type it in - twice, when the kick-off moves.

   `fixtures.ics` is the same list as an iCalendar feed. It is a SUBSCRIPTION
   rather than a download: the address is stable, the phone re-reads it, and a
   fixture cancelled in the panel disappears from the calendar on the next
   publish. That is the difference that matters, because this club's fixtures
   DO move - a club folded in October and took a fixture with it.

   Six decisions, each of them a thing that goes wrong quietly.

   1. WHAT IS IN IT: what is still to come, and nothing else. A calendar is
      about what is ahead. The played archive is a results page's job, and
      thirty-eight past events in a phone's calendar is thirty-eight pieces of
      furniture nobody asked for.

   2. THE TIME IS AN INSTANT, NOT A WALL CLOCK. A kick-off is stored as UK
      local time and `isoDateTime()` in stats.mjs already converts it to a
      true UTC instant, so the feed emits UTC and carries no VTIMEZONE. Emit
      the wall clock as though it were UTC and every summer fixture is an hour
      wrong on every phone - which is the bug this repository has already had
      once, in the programme's countdown.

   3. DTSTAMP COMES FROM THE RECORD, NEVER FROM THE CLOCK. The obvious reading
      of the spec is "now", and the generated output of this site is
      COMMITTED: a timestamp taken from the clock would rewrite this file on
      every build and put a meaningless diff in front of whoever is reading
      the next one. Derived from the fixture's own date, a rebuild that
      changes nothing produces a byte-identical file.

   4. A FIXTURE WITH NO TIME IS A WHOLE DAY, not 11:00. The panel allows a
      date with the kick-off still to be confirmed, and a calendar entry
      claiming 11:00 over a time nobody has set is the site inventing a fact
      a reader would act on. `VALUE=DATE` says all day and says it honestly.

   5. THE LOCATION IS THE ADDRESS WHERE THE CLUB HAS RECORDED ONE. That is
      what makes a phone offer directions, and it is the whole reason the
      ground pages were worth deriving. Where there is no address the location
      is the ground's name, which is all the site knows.

   6. TWO HOURS IS A CONVENTION, AND IT IS EXPLAINED ON THE PAGE, NOT IN THE
      ENTRY. Sunday-league returns do not record a final whistle, so the
      duration is ninety minutes and a half time rather than a measurement.
      That caveat belongs beside the subscribe button, where somebody is
      deciding; a `DESCRIPTION` is read on a phone's lock screen, and a
      sentence of methodology there is a club explaining itself to somebody
      who only wanted to know where to be.
   ========================================================================== */

import { isoDateTime, toISO } from './stats.mjs';

/* RFC 5545 escaping, in the order that matters: the backslash first, or the
   escapes introduced by the later replacements get escaped themselves. */
const txt = (v) => String(v == null ? '' : v)
  .replace(/\\/g, '\\\\')
  .replace(/;/g, '\;')
  .replace(/,/g, '\\,')
  .replace(/\r?\n/g, '\\n');

/* A line is folded at 75 OCTETS, not 75 characters. Every club name here is
   ASCII today and "Peps All Stars" would be the same either way, but a
   fixture against a club with an accent in its name would push a multi-byte
   character across the split and produce a line no parser can read. */
function fold(line) {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const out = [];
  let i = 0;
  let limit = 75;
  while (i < bytes.length) {
    let end = Math.min(i + limit, bytes.length);
    /* Never split inside a UTF-8 sequence: continuation bytes are 10xxxxxx. */
    while (end > i && end < bytes.length && (bytes[end] & 0xc0) === 0x80) end -= 1;
    out.push((out.length ? ' ' : '') + bytes.slice(i, end).toString('utf8'));
    i = end;
    limit = 74; /* a continuation line spends one octet on its leading space */
  }
  return out.join('\r\n');
}

const stampOf = (iso) => `${String(iso).replace(/-/g, '')}T000000Z`;
const utcOf = (instant) => `${instant.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')}`;

/* The ground's own page is the one place the address lives, so the feed is
   handed the derived grounds rather than re-reading venues.json: two readers
   of one fact are two answers to it. */
export function fixturesIcs(d, grounds = [], opts = {}) {
  const site = String(opts.site || '').replace(/\/$/, '');
  const name = String(opts.name || 'Fixtures');
  const addrOf = new Map((grounds || []).map((g) => [g.name, g.address || '']));

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sue’s Angels FC//fixtures//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${txt(name)}`,
    `NAME:${txt(name)}`,
    /* How often a subscriber should come back. Twelve hours is well inside
       the gap between a fixture being cancelled on a Saturday and kick-off. */
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
    'X-PUBLISHED-TTL:PT12H',
  ];

  for (const f of (d.upcoming || [])) {
    const iso = String(f.iso || toISO(f.date) || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) continue;

    const timed = /^\d{1,2}:\d{2}$/.test(String(f.kick || ''));
    const instant = timed ? isoDateTime(iso, f.kick) : null;
    const where = String(f.venue || '').trim();
    const addr = addrOf.get(where) || '';

    const summary = `${f.home} v ${f.away}`;
    const bits = [
      f.competition || '',
      f.weAreHome ? 'Home' : 'Away',
      /* The ground is already in LOCATION, so it is repeated here only where
         LOCATION is an ADDRESS and the name would otherwise go unsaid. */
      addr ? where : '',
      timed ? '' : 'Kick-off to be confirmed',
      site ? `${site}/fixtures.html` : '',
    ].filter(Boolean);

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${f.id || iso}@suesangelsfc.co.uk`);
    lines.push(`DTSTAMP:${stampOf(iso)}`);
    lines.push('SEQUENCE:0');
    if (timed && instant) {
      lines.push(`DTSTART:${utcOf(instant)}`);
      lines.push('DURATION:PT2H');
    } else {
      lines.push(`DTSTART;VALUE=DATE:${iso.replace(/-/g, '')}`);
      lines.push('DURATION:P1D');
    }
    lines.push(`SUMMARY:${txt(summary)}`);
    if (where) lines.push(`LOCATION:${txt(addr || where)}`);
    lines.push(`DESCRIPTION:${txt(bits.join(' · '))}`);
    if (site) lines.push(`URL:${txt(`${site}/fixtures.html`)}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('TRANSP:OPAQUE');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  /* CRLF, and a trailing one: the spec says every content line ends with it
     and some readers refuse a file whose last line does not. */
  return `${lines.map(fold).join('\r\n')}\r\n`;
}
