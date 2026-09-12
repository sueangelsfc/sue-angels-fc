-- ===========================================================================
-- 011  WHERE READERS ARE, TO THE TOWN, AND THE WHOLE JOURNEY
--
-- TOWNS
-- 007 worked out a country from the device's time zone, which cannot tell
-- Kingston from Glasgow and is wrong for anybody abroad. Vercel's edge works
-- out an approximate location for every request from the connection and
-- passes it to our own function as headers (country, region, town, a
-- position). /api/view reads those headers and calls record_page_place below.
--
-- WHAT IS NEVER STORED: the address the request came from, the page, the
-- time, or anything that could be joined to a view. One count per (day,
-- country, region, town), with the town's position rounded to a tenth of a
-- degree for the map. That carries no page for 008's reason: a finer key on a
-- quiet site turns buckets back into single people, and "one view of the
-- sponsors page from Leatherhead at 23:00" is exactly that.
--
-- THE JOURNEY
-- 009 counts one step at a time. This counts the whole sequence of pages
-- somebody read in one browser tab, as a pattern:
--   'instagram.com>/programme.html>/squad.html>/players/jon-lloyd.html'
-- The sequence is kept in the reader's own tab (sessionStorage), never sent
-- with an identifier, and every view sends the journey SO FAR. So a row is
-- "this many views were reached by exactly this route", and the panel works
-- out how many journeys ENDED on a route by taking away the ones that went a
-- step further. A journey of more than eight pages is counted up to its
-- eighth.
--
-- The first step is where the journey came from: a sending host, '' for
-- direct or unknown, or 'new-tab' for a page of this site opened in a tab of
-- its own.
--
-- INERT AND IDEMPOTENT. Run it in the Supabase SQL editor. To undo:
--   drop function if exists public.record_page_place(text,text,text,numeric,numeric);
--   drop function if exists public.record_page_trail(text);
--   drop table if exists public.page_places;
--   drop table if exists public.page_trails;
-- ===========================================================================

create table if not exists public.page_places (
  day     date         not null default current_date,
  country text         not null,
  region  text         not null default '',
  city    text         not null default '',
  lat     numeric(4,1),
  lon     numeric(5,1),
  views   bigint       not null default 0,
  primary key (day, country, region, city)
);
create index if not exists page_places_day on public.page_places (day);
alter table public.page_places enable row level security;

drop policy if exists "page_places: admin read" on public.page_places;
create policy "page_places: admin read"
  on public.page_places for select to authenticated using (public.is_club_admin());
drop policy if exists "page_places: admin delete" on public.page_places;
create policy "page_places: admin delete"
  on public.page_places for delete to authenticated using (public.is_club_admin());

create table if not exists public.page_trails (
  day   date   not null default current_date,
  trail text   not null,
  views bigint not null default 0,
  primary key (day, trail)
);
create index if not exists page_trails_day on public.page_trails (day);
alter table public.page_trails enable row level security;

drop policy if exists "page_trails: admin read" on public.page_trails;
create policy "page_trails: admin read"
  on public.page_trails for select to authenticated using (public.is_club_admin());
drop policy if exists "page_trails: admin delete" on public.page_trails;
create policy "page_trails: admin delete"
  on public.page_trails for delete to authenticated using (public.is_club_admin());

-- ---- The ways in ------------------------------------------------------------
drop function if exists public.record_page_place(text,text,text,numeric,numeric);
create function public.record_page_place(
  p_country text,
  p_region  text    default '',
  p_city    text    default '',
  p_lat     numeric default null,
  p_lon     numeric default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_country text := upper(coalesce(p_country, ''));
  v_region  text := left(coalesce(p_region, ''), 12);
  v_city    text := left(coalesce(p_city, ''), 60);
  v_lat     numeric;
  v_lon     numeric;
begin
  if v_country !~ '^[A-Z]{2}$' then return; end if;
  if v_region !~ '^[A-Za-z0-9-]*$' then v_region := ''; end if;
  -- Letters in any alphabet, spaces, and the punctuation town names carry.
  if v_city !~ '^[[:alpha:][:space:].''’()-]*$' then v_city := ''; end if;
  if p_lat between -90 and 90 and p_lon between -180 and 180 then
    v_lat := round(p_lat, 1);
    v_lon := round(p_lon, 1);
  end if;

  insert into public.page_places (day, country, region, city, lat, lon, views)
  values (current_date, v_country, v_region, v_city, v_lat, v_lon, 1)
  on conflict (day, country, region, city) do update
    set views = page_places.views + 1,
        lat = coalesce(page_places.lat, excluded.lat),
        lon = coalesce(page_places.lon, excluded.lon);
end;
$$;

drop function if exists public.record_page_trail(text);
create function public.record_page_trail(
  p_trail text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- A start (a host, '' or 'new-tab') then one to eight site paths. Anything
  -- else is not a journey and is not stored.
  if p_trail is null or length(p_trail) > 1000
     or p_trail !~ '^[a-z0-9.-]{0,60}(>/[A-Za-z0-9/_.-]{0,120}){1,8}$' then
    return;
  end if;

  insert into public.page_trails (day, trail, views)
  values (current_date, p_trail, 1)
  on conflict (day, trail) do update set views = page_trails.views + 1;
end;
$$;

revoke all on function public.record_page_place(text,text,text,numeric,numeric) from public;
grant execute on function public.record_page_place(text,text,text,numeric,numeric) to anon, authenticated;
revoke all on function public.record_page_trail(text) from public;
grant execute on function public.record_page_trail(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- CHECK IT
--   select * from public.page_places order by day desc, views desc limit 20;
--   select * from public.page_trails order by day desc, views desc limit 20;
-- ---------------------------------------------------------------------------
