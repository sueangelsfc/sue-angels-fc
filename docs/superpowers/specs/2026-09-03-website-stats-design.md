# Website stats — design

**Date:** 3 September 2026
**Status:** built; inert until `migrations/007_page_stats.sql` is run

## The problem

The club publishes 108 pages and has no idea which of them anybody opens.
It wants page views per page and where in the world readers are, in the
control panel rather than in somebody else's dashboard.

## Decisions, and why

**Location comes from the device time zone, not an IP lookup.** The
alternative was a new `/api/hit` function reading Vercel's geo headers, which
is more accurate and costs a third public endpoint to guard, an IP the
function can see, and a serverless invocation per page view. The time zone is
already in the browser, costs no network and no third party, and keeps the
"no identifier of any kind" property that lets this sit outside the consent
gate. It is wrong for VPNs and travellers, and the screen says so.

**A row is a count, not an event.** Aggregating at write time on
(day, page, zone, source, device) means an individual visit cannot be
reconstructed even by somebody with the database open. That is a stronger
guarantee than storing events and promising not to correlate them, and it
matters because this records more per view than `band_views` does. It also
keeps the table small enough for the panel to read whole.

**The zone→country map lives in the panel, not the beacon.** It is ~110
entries read by one screen. In `sa.js` it would ship to every visitor of every
page. Same rule that moved `homeBands` out of `control-seed.js`.

**Anon gets EXECUTE on a function, not INSERT on a table.** The function is
the validation boundary, so clamping happens before anything is written.
Tighter than `band_views`.

## Shape

| Piece | File |
|---|---|
| Table + RPC, inert until run | `migrations/007_page_stats.sql` |
| Beacon, every page, in `sa.js` | `src/scripts/30-stats.js` |
| RPC helper with `keepalive` | `src/scripts/00-core.js` (`window.saRpc`) |
| Panel screen, lazy chunk | `src/admin/lazy/85-stats.js` |
| Sparkline style | `src/styles-control/00-panel.css` |

`page_stats(day, path, zone, source, device, views, seconds_total, depth_total)`,
primary key on the five dimensions.

## What it deliberately does not do

- **No unique visitors.** No identifier means two views cannot be told apart.
  The screen says views throughout rather than implying uniques.
- **No full referrer.** Host only; a full referring URL carries search terms.
- **No user agent.** The device bucket is screen width, which is what the
  layout responds to anyway.
- **No `beforeunload`.** It disables the back/forward cache in some browsers,
  which is a real cost to the reader for a counter.

## Testing

The suite hands the shipped screen crafted rows and reads what came out, rather
than grepping the file for the rule — the panel's own history is the argument
for that. Three mutation probes: a broken zone map, a broken sum, a blank
referrer label. Two of the three checks were weak as first written and the
probes are what proved it.

## Activation

`migrations/007_page_stats.sql` has to be run on the database, and the site
has to be published. Until both, nothing is recorded and the screen says which
file turns it on.
