/* ==========================================================================
   A CLUB THE ANGELS HAVE MET  (/clubs/<slug>.html)

   Every goal, every assist and every result the site publishes names an
   opponent, and until this module there was no page anywhere on the site
   ABOUT one. `opponentRecords()` has derived a complete head-to-head since
   August and it reached a reader only as one row inside a home-page band
   that is switched off, so the club's own record against the side it plays
   on Sunday was, in practice, unpublished.

   It is also the page an opposition player actually searches for. A reader
   who types "Sue's Angels Brockwell Violets" wants one document: how many
   times, what happened, who scored, where, and when the next one is.

   WHO GETS A PAGE IS EVIDENCE, NEVER A NAME. Two things qualify a club, and
   a club with neither is not offered a page at all:

     - a PLAYED match against them, which is a record; or
     - a row in the division the club is in NOW, which is a standing, a
       fixture list and a position.

   Anything else would be a URL carrying a crest and a sentence saying there
   is nothing to say, which is the switch-that-lies fault with its own
   address. `knownClubs` holds 29 names and is deliberately not the input
   here: being mentioned somewhere is not content.

   GROUPED ON `clubIdentity()`, exactly as `opponentRecords()` groups, so one
   club spelled two ways is ONE page rather than two each claiming a complete
   record. The archive spells them "BPR Men's" and the transcribed fixture
   list "BPR FC"; without this they would be `/clubs/bpr-mens.html` and
   `/clubs/bpr-fc.html`, each with half the meetings. The identity keeps a
   2.0 apart from a 1st Team, so Pure Football does not become one page
   claiming three wins over a side never met.

   THE NAME, AND SO THE SLUG, IS THE MOST RECENT SPELLING - the same rule the
   head-to-head row takes, because a page named from the reduced identity
   would be addressed `/clubs/bpr.html` and headed "bpr".
   ========================================================================== */
import { clubIdentity, relatedClub } from './club-name.mjs';
import { teamSummary, slugify, isUs } from './stats.mjs';

/* A man's goals and assists against one club, from the meetings themselves.
   An own goal belongs to nobody (`g.og || g.num == null`), as the engine
   reads it everywhere, and the assists come off the flat `assists` array
   because that is the list every published assist figure is counted from. */
function scorersIn(meetings, nameFor, slugFor) {
  const map = new Map();
  const bump = (num, key) => {
    const n = Number(num);
    if (!Number.isFinite(n)) return;
    if (!map.has(n)) map.set(n, { num: n, goals: 0, assists: 0 });
    map.get(n)[key] += 1;
  };
  for (const m of meetings) {
    const det = m.detail || {};
    for (const g of det.goals || []) if (!(g.og || g.num == null)) bump(g.num, 'goals');
    for (const a of det.assists || []) bump(a && a.num != null ? a.num : a, 'assists');
  }
  return [...map.values()]
    .map((r) => ({ ...r, name: nameFor(r.num) || '', slug: slugFor(r.num) || '' }))
    .filter((r) => r.name)
    .sort((a, b) => (b.goals - a.goals) || (b.assists - a.assists)
      || String(a.name).localeCompare(String(b.name)));
}

/* Every club with a page, with everything its page needs already resolved.
   One pass over the matches, so a page and the index that lists it cannot
   disagree about how many times two clubs have met. */
export function clubPages(d) {
  const byId = new Map();
  const take = (name) => {
    const id = clubIdentity(name) || String(name || '').toLowerCase();
    if (!id || isUs(name)) return null;
    if (!byId.has(id)) {
      byId.set(id, { identity: id, name, meetings: [], fixtures: [], row: null });
    }
    return byId.get(id);
  };

  /* A PLAYED match is the record. Newest first is applied once, at the end. */
  for (const m of (d.played || [])) {
    if (!m.opponent) continue;
    const rec = take(m.opponent);
    if (rec) rec.meetings.push(m);
  }
  /* A fixture is not a record and does not on its own qualify a club: it is
     attached where a page already exists, and a club met for the first time
     next Sunday reaches this through its division row instead. */
  for (const f of (d.upcoming || [])) {
    if (!f.opponent) continue;
    const id = clubIdentity(f.opponent);
    if (byId.has(id)) byId.get(id).fixtures.push(f);
  }
  /* The division the club is in NOW. A row is a standing, which is content,
     so this both qualifies a club and decorates one already qualified. */
  const division = (d.nextDivisionTable && d.nextDivisionTable.started)
    ? d.nextDivisionTable : null;
  for (const r of ((division && division.rows) || [])) {
    if (!r.club || r.us) continue;
    const rec = take(r.club);
    if (!rec) continue;
    rec.row = r;
    /* The division's own name for them wins while they are in it: that is
       the spelling beside them in the table a reader has just come from. */
    rec.name = r.club;
  }

  const all = [...byId.values()];
  return all.map((rec) => {
    const meetings = rec.meetings.slice()
      .sort((a, b) => String(b.iso || '').localeCompare(String(a.iso || '')));
    const latest = meetings[0];
    /* The most recent spelling, unless the division has named them, because
       the division's table is the fresher statement of the two. */
    const name = rec.row ? rec.name : (latest ? latest.opponent : rec.name);
    return {
      identity: rec.identity,
      name,
      slug: slugify(name),
      meetings,
      summary: teamSummary(meetings),
      row: rec.row,
      next: rec.fixtures.slice()
        .sort((a, b) => String(a.iso || '').localeCompare(String(b.iso || '')))[0] || null,
      /* THE SAME CLUB, A DIFFERENT SIDE OF IT, and said out loud rather than
         merged. Printing a record against Pure Football FC 2.0 on the page
         for their 1st Team is the exact false claim clubIdentity exists to
         prevent; linking to it is the true version of the same sentence. */
      related: all.filter((o) => o.identity !== rec.identity
        && relatedClub(o.name, name) && (o.meetings.length || o.row))
        .map((o) => ({ name: o.meetings[0] ? o.meetings[0].opponent : o.name, slug: slugify(o.meetings[0] ? o.meetings[0].opponent : o.name) })),
      scorers: scorersIn(meetings, d.nameFor, (num) => {
        const p = (d.squad || []).find((x) => Number(x.num) === Number(num));
        return p ? p.slug : '';
      }),
      venues: [...new Set(meetings.map((m) => m.venue).filter(Boolean))],
    };
  }).filter((c) => c.meetings.length || c.row)
    .sort((a, b) => b.meetings.length - a.meetings.length
      || String(a.name).localeCompare(String(b.name)));
}
