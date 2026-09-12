-- ===========================================================================
-- 009  THE ROUTE THROUGH THE WEBSITE, AND THE HOUR, IN A CALL OF THEIR OWN
--
-- WHY THIS EXISTS: 008 WAS NEVER RUN, AND THAT STOPPED ALL COUNTING
-- On 4 September 2026 the beacon started sending `p_hour` to record_page_view.
-- The database still had 007's function, which takes no such argument.
-- PostgREST resolves an RPC by the argument NAMES it is given, found no
-- function taking p_hour, and refused the whole call with PGRST202. From 4 to
-- 12 September not a single page view was recorded, and nothing anywhere said
-- so: the beacon swallows its failures on purpose.
--
-- The beacon now makes two calls. record_page_view goes back to exactly the
-- six arguments 007 accepts, so it counts on any database that has 007. The
-- hour and the route go to record_page_route below, so a database without this
-- file loses those two things and keeps everything else.
--
-- THIS FILE REPLACES 008. It creates 008's hourly table if it is not there, so
-- there is no need to run 008 first, and running both is harmless: 008 would
-- only recreate record_page_view with an optional hour the beacon never sends.
--
-- WHAT A ROUTE IS
-- One count per (day, came_from, path). `came_from` is one of three things:
--   '/squad.html'     the page before this one, on this site
--   'instagram.com'   the sending site's host, never its full address
--   ''                nothing: a typed address, a bookmark, an app, an email
-- So the table can say "six views of the programme came from Instagram" and
-- "three people went from the programme to the squad".
--
-- WHAT IT CANNOT SAY, ON PURPOSE
-- A journey. There is no identifier, so "Instagram to the programme, then the
-- programme to the squad" is two rows that happen to share a page, and nothing
-- can join them back into one reader - by anybody, including somebody with the
-- database open. It carries no zone and no device for the reason 008 gave: a
-- quiet site with a finer key turns buckets back into single people.
--
-- INERT AND IDEMPOTENT. Run it in the Supabase SQL editor. To undo:
--   drop function if exists public.record_page_route(text,text,int);
--   drop table if exists public.page_routes;
-- ===========================================================================

-- ---- The hour (008's table, created here if 008 never ran) -----------------
create table if not exists public.page_stats_hourly (
  day   date     not null default current_date,
  hour  smallint not null,
  path  text     not null,
  views bigint   not null default 0,
  primary key (day, hour, path)
);

create index if not exists page_stats_hourly_day on public.page_stats_hourly (day);

alter table public.page_stats_hourly enable row level security;

drop policy if exists "page_stats_hourly: admin read" on public.page_stats_hourly;
create policy "page_stats_hourly: admin read"
  on public.page_stats_hourly for select to authenticated using (public.is_club_admin());

drop policy if exists "page_stats_hourly: admin delete" on public.page_stats_hourly;
create policy "page_stats_hourly: admin delete"
  on public.page_stats_hourly for delete to authenticated using (public.is_club_admin());

-- ---- The route ------------------------------------------------------------
create table if not exists public.page_routes (
  day       date   not null default current_date,
  came_from text   not null default '',
  path      text   not null,
  views     bigint not null default 0,
  primary key (day, came_from, path)
);

create index if not exists page_routes_day on public.page_routes (day);

alter table public.page_routes enable row level security;

-- No anon policy at all, like page_stats: anon reaches the function and never
-- the table, and only the club reads it.
drop policy if exists "page_routes: admin read" on public.page_routes;
create policy "page_routes: admin read"
  on public.page_routes for select to authenticated using (public.is_club_admin());

drop policy if exists "page_routes: admin delete" on public.page_routes;
create policy "page_routes: admin delete"
  on public.page_routes for delete to authenticated using (public.is_club_admin());

-- ---- The only way in ------------------------------------------------------
drop function if exists public.record_page_route(text,text,int);

create function public.record_page_route(
  p_path text,
  p_from text default '',
  p_hour int  default -1
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_path text;
  v_from text;
begin
  -- A site path and nothing else, the same rule record_page_view applies.
  v_path := left(coalesce(p_path, ''), 120);
  if v_path !~ '^/[A-Za-z0-9/_.-]*$' then
    return;
  end if;

  -- A page of this site, or a bare host. Anything else is recorded as
  -- "nothing" rather than stored, so a full address with a query string
  -- can never get in however the function is called.
  v_from := coalesce(p_from, '');
  if left(v_from, 1) = '/' then
    v_from := left(v_from, 120);
    if v_from !~ '^/[A-Za-z0-9/_.-]*$' then v_from := ''; end if;
  else
    v_from := left(lower(v_from), 60);
    if v_from !~ '^[a-z0-9.-]*$' then v_from := ''; end if;
  end if;

  insert into public.page_routes (day, came_from, path, views)
  values (current_date, v_from, v_path, 1)
  on conflict (day, came_from, path) do update
    set views = page_routes.views + 1;

  -- The reader's own hour, on its own, carrying nothing that narrows it.
  if p_hour between 0 and 23 then
    insert into public.page_stats_hourly (day, hour, path, views)
    values (current_date, p_hour, v_path, 1)
    on conflict (day, hour, path) do update
      set views = page_stats_hourly.views + 1;
  end if;
end;
$$;

revoke all on function public.record_page_route(text,text,int) from public;
grant execute on function public.record_page_route(text,text,int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- CHECK IT
--   select count(*) from public.page_routes;   -- 0 until the next visitor
--   A discarded path must return 204 and write nothing:
--     curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/record_page_route" \
--       -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
--       -d '{"p_path":"not a path","p_from":"","p_hour":20}'
-- ---------------------------------------------------------------------------
