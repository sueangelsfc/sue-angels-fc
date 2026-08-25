/* ==========================================================================
   WHAT A COACH IS CALLED

   One list, for the same reason positions.mjs is one list.

   There were two, hard-coded in two panel screens, and they had already
   drifted on the two most senior jobs at the club: Coaches offered
   "First-team manager" and "First team coach", Squad offered "Manager" and
   "Coach". The club's own three records say FIRST-TEAM MANAGER and FIRST TEAM
   COACH, so the Squad screen was offering neither of the two titles anybody
   actually holds - at precisely the moment a player moves into coaching,
   which is the one time that screen writes a role at all.

   Nothing here is an enum. Both screens render this as a `datalist`, so a
   club that wants a title not on the list can still type one; the list is
   what stops a fourth spelling of the manager's job being created by
   accident. Same reasoning as venues.json: a correction map, not a
   spell-checker.

   Sorted by seniority rather than alphabetically, because a dropdown of job
   titles is read top-down and the manager is the answer most of the time.
   ========================================================================== */
export const COACH_ROLES = [
  'First-team manager',
  'Assistant manager',
  'First team coach',
  'Goalkeeping coach',
  'Fitness coach',
  'Physiotherapist',
  'Team secretary',
  'Kit manager',
  'Club chairman',
];
