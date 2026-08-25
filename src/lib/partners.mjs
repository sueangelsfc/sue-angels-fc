/* ==========================================================================
   THE CLUB'S PARTNERS — ONE LIST

   There were two, and they had already drifted.

   `SPONSORS` in club.mjs is the home page logo strip. `PARTNERS` is the
   sponsors page. They hold the same four businesses in the same order, and
   two of them are named differently on the two pages: "Sporting Solutions"
   against "Sporting Solutions Ltd", "Staines Rugby" against "Staines Rugby
   Club". A partner's name is a contractual detail and the site says it two
   ways. A fifth, HLO, is in the strip and has never been on the sponsors
   page at all, which nothing in either list records as a decision.

   So: one record per partner, carrying where it appears rather than being
   duplicated into the list for each place.

     onStrip  the home page logo strip
     onPage   the sponsors page, with its blurb, placements and links
     short    the name used where the logo is the content and the text is the
              alt attribute; defaults to `name`

   THE BASELINE BELOW REPRODUCES BOTH PAGES BYTE FOR BYTE. The drift is
   preserved rather than quietly corrected, because correcting a partner's
   name on the live site is the club's decision and not this file's. What
   changes is that the drift is now visible in one place, and in the control
   panel, where somebody can settle it.

   AND IT IS EDITABLE. It used to be code only, defended on the grounds that a
   partner's logo is a contractual asset that should not be changeable from a
   phone by accident. True of the LOGO FILE. Not true of the name, the tier,
   the trade, the blurb, the placements or the links, all of which are just
   words - and the club changed its main kit sponsor for 26/27, which under
   the old arrangement meant a developer. A panel that cannot record the
   club's biggest commercial event of the year is not protecting anything.
   ========================================================================== */
import { PARTNERS, SPONSORS } from './club.mjs';

/* The row the panel writes. One row holding the ordered list, the same shape
   as roster:trialists and roster:coaches, because the ORDER is the club's
   billing order and a set of separate rows has none. */
export const PARTNERS_KEY = 'sponsor:partners';

/* Everything a partner record can hold. Anything absent falls back to
   something harmless, so a record written by a future version of the panel
   with fields this does not know about still renders. */
function normalise(p, i) {
  const name = String(p.name || '').trim();
  return {
    name,
    short: String(p.short || name).trim(),
    role: String(p.role || p.tier || '').trim(),
    since: p.since || '',
    trade: p.trade || '',
    body: p.body || '',
    detail: p.detail || '',
    placements: Array.isArray(p.placements) ? p.placements.filter(Boolean) : [],
    links: Array.isArray(p.links) ? p.links.filter((l) => l && l.href) : [],
    logo: p.logo || '',
    /* Absent means shown. A partner recorded with neither flag is a partner,
       and the safe default for a new one is that it appears in both places -
       which is what somebody adding a sponsor expects to happen. */
    onStrip: p.onStrip !== false,
    onPage: p.onPage !== false,
    i,
  };
}

/* The code baseline: the two lists, merged, with the differences kept. */
export const PARTNER_BASELINE = PARTNERS.map((p) => {
  const strip = SPONSORS.filter((s) => s.logo === p.logo)[0];
  return {
    ...p,
    /* The strip's own spelling, so the home page is unchanged. Where the two
       lists agree this is simply the name. */
    short: strip ? strip.name : p.name,
    onStrip: !!strip,
    onPage: true,
  };
}).concat(
  /* HLO: in the strip, never on the page. Recorded as the fact it is rather
     than as a discrepancy between two lists. */
  SPONSORS.filter((s) => !PARTNERS.some((p) => p.logo === s.logo)).map((s) => ({
    name: s.name,
    short: s.name,
    role: s.tier,
    logo: s.logo,
    onStrip: true,
    onPage: false,
  })),
);

/* What the site should publish. The stored record wins outright when it holds
   anything; an absent, empty or unusable record means the baseline, so a club
   that has never opened the screen gets exactly the pages it has today. */
export function partnersFrom(live) {
  const rows = (live && live.player_photos) || [];
  const row = rows.filter((r) => r && r.key === PARTNERS_KEY)[0];
  const stored = row && row.data && Array.isArray(row.data.list) ? row.data.list : null;
  const usable = (stored || []).filter((p) => p && p.name);
  return (usable.length ? usable : PARTNER_BASELINE).map(normalise);
}

export const onStrip = (list) => list.filter((p) => p.onStrip);
export const onPage = (list) => list.filter((p) => p.onPage);
