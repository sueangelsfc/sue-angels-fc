-- 006_drop_diagnose_anon_writes.sql
--
-- Removes the temporary function 005 created. Run it now: 005 lets an
-- anonymous caller read every policy, grant and RLS flag on four tables, which
-- is fine for the minutes it takes to answer a question and is not something to
-- leave standing.
--
-- WHAT IT ANSWERED, so nobody has to run it again:
--
--   Anonymous INSERT was returning 42501 "new row violates row-level security
--   policy" on enquiries, supporters and band_views, which read as the club's
--   lead capture being broken. It was not. The probe sent
--   `Prefer: return=representation`, and handing the new row back requires a
--   SELECT policy on that row. Anon has none on these tables ON PURPOSE - they
--   are write-only, which is what stops a stranger reading the club's enquiries.
--   So Postgres refused the RETURNING and reported it against the insert.
--
--   The same insert with `Prefer: return=minimal`, which is what the website
--   actually sends, returns 201. The policies from 002 were correct throughout.
--
--   The lesson is narrower than "204 means nothing changed": for an ANONYMOUS
--   write to a write-only table, return=representation cannot succeed and its
--   failure looks exactly like a broken policy.

drop function if exists public.__diag_anon_writes();

notify pgrst, 'reload schema';
