-- ===========================================================================
-- 004  WHICH HOME PAGE BANDS PEOPLE ACTUALLY REACH
--
-- The front page is seventy bands the club can order however it likes, and
-- until now the order was a judgement made once with nothing to check it
-- against. This records which bands a visitor actually scrolled to and which
-- ones they clicked out of, so the panel can sort by evidence.
--
-- IT IS NOT ANALYTICS IN THE SENSE THE CONSENT BANNER MEANS
-- No identifier of any kind is stored: no id, no session, no cookie, no user
-- agent, no address, no timestamp finer than the day. One row is one page
-- view and holds two arrays of band names. Nothing here can be tied back to a
-- person, which is why it does not sit behind the consent gate that Google
-- Analytics and the Meta pixel sit behind, and why it must stay that way. If
-- anything identifying is ever added to this table, it belongs behind that
-- gate and this comment is wrong.
--
-- INERT UNTIL RUN, like 002. The site checks for the table and carries on
-- silently without it, so nothing breaks by not running this, and nothing
-- breaks by running it twice.
--
-- To undo: drop table public.band_views;
-- ===========================================================================

create table if not exists public.band_views (
  id         bigint generated always as identity primary key,
  day        date not null default current_date,
  seen       text[] not null default '{}',
  clicked    text[] not null default '{}'
);

create index if not exists band_views_day on public.band_views (day);

alter table public.band_views enable row level security;

-- Anonymous visitors may add a row and may do nothing else: no reading it
-- back, no changing it, no deleting it. Exactly the shape enquiries has.
drop policy if exists "band_views: anon submit" on public.band_views;
create policy "band_views: anon submit"
  on public.band_views for insert to anon, authenticated with check (true);

drop policy if exists "band_views: admin read" on public.band_views;
create policy "band_views: admin read"
  on public.band_views for select to authenticated using (public.is_club_admin());

drop policy if exists "band_views: admin delete" on public.band_views;
create policy "band_views: admin delete"
  on public.band_views for delete to authenticated using (public.is_club_admin());

-- ---------------------------------------------------------------------------
-- CHECK IT
--   Anonymous read must return 401 or an empty array, never rows:
--     curl -s "$SUPABASE_URL/rest/v1/band_views?select=*" -H "apikey: $ANON_KEY"
--   Anonymous insert must succeed:
--     curl -s -X POST "$SUPABASE_URL/rest/v1/band_views" -H "apikey: $ANON_KEY" \
--       -H "Content-Type: application/json" -d '{"seen":["news"],"clicked":[]}'
--   A bare 204 means the statement ran, not that a row landed. Add
--   'Prefer: return=representation' to see what it actually did.
-- ---------------------------------------------------------------------------
