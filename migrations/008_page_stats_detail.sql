-- ===========================================================================
-- 008  WHEN THE WEBSITE IS READ
--
-- 007 answered what gets read, from where, from what and for how long. It
-- deliberately stored no time finer than the day, and the cost of that shows
-- up the moment anybody looks at the screen: "42 views on Sunday" cannot tell
-- a matchday afternoon from a Sunday morning, and when people read the site is
-- the one thing the club could actually act on.
--
-- THE HOUR GOES IN ITS OWN TABLE, AND THAT IS THE WHOLE POINT
-- The obvious change is an `hour` column on `page_stats`. It is the wrong one.
-- That table's privacy property is that a row is a bucket rather than a visit,
-- and the property holds because the key is coarse enough that real readers
-- collide in it. Adding a 24-way split to a key that already carries day,
-- page, zone, source and device would multiply the buckets by 24 and, on a
-- quiet club website, turn most of them back into exactly one view each - the
-- single reader from Europe/Zurich, on the sponsors page, at 23:00. That is
-- the thing 007 was written to make unwritable.
--
-- So the hour is recorded in a SEPARATE table that carries no zone, no source
-- and no device. It can say "eleven views of the squad page at 8pm on
-- Tuesday" and it cannot say who, from where, or on what. The two tables
-- cannot be joined back into a visit because neither holds anything to join
-- on: no identifier exists in either.
--
-- THE HOUR IS THE READER'S OWN, not UTC and not the club's. "People read this
-- at eight in the evening" is a fact about a habit, and converting it to a
-- server clock would make it a fact about nothing. Almost all of this club's
-- traffic is in one time zone, so the two would rarely differ anyway; where
-- they do, the reader's own hour is the truthful one.
--
-- THE OLD FUNCTION IS DROPPED, NOT LEFT ALONGSIDE. Adding a parameter with a
-- default creates a second function rather than replacing the first, and
-- PostgREST resolves an RPC by the argument names it is given: two candidates
-- would make the call ambiguous and start failing with a 300. Dropping first
-- is what keeps this runnable on a database that already has 007.
--
-- INERT AND IDEMPOTENT, like 007. A site still shipping the old beacon simply
-- sends no hour, the hourly row is skipped, and everything 007 records carries
-- on unchanged.
--
-- To undo (back to 007's function, which 007 will recreate):
--   drop table if exists public.page_stats_hourly;
-- ===========================================================================

create table if not exists public.page_stats_hourly (
  day   date     not null default current_date,
  hour  smallint not null,
  path  text     not null,
  views bigint   not null default 0,
  primary key (day, hour, path)
);

create index if not exists page_stats_hourly_day on public.page_stats_hourly (day);

alter table public.page_stats_hourly enable row level security;

-- Same posture as page_stats: no anon policy at all. Writes arrive through the
-- function below, which runs as its owner; reads are the club's alone.
drop policy if exists "page_stats_hourly: admin read" on public.page_stats_hourly;
create policy "page_stats_hourly: admin read"
  on public.page_stats_hourly for select to authenticated using (public.is_club_admin());

drop policy if exists "page_stats_hourly: admin delete" on public.page_stats_hourly;
create policy "page_stats_hourly: admin delete"
  on public.page_stats_hourly for delete to authenticated using (public.is_club_admin());

-- ---------------------------------------------------------------------------
-- THE ONLY WAY IN, still
-- Everything 007 clamped is clamped here unchanged. The hour is the one new
-- argument and it is bounded to 0..23; anything else - including the -1 an
-- older beacon does not send at all - writes the daily row and skips the
-- hourly one, so a half-updated site records less rather than recording junk.
-- ---------------------------------------------------------------------------
drop function if exists public.record_page_view(text,text,text,text,int,int);
drop function if exists public.record_page_view(text,text,text,text,int,int,int);

create function public.record_page_view(
  p_path    text,
  p_zone    text default '',
  p_source  text default '',
  p_device  text default '',
  p_seconds int  default 0,
  p_depth   int  default 0,
  p_hour    int  default -1
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_path    text;
  v_zone    text;
  v_source  text;
  v_device  text;
  v_seconds int;
  v_depth   int;
begin
  -- A site path and nothing else: no scheme, no host, no query, no fragment.
  v_path := left(coalesce(p_path, ''), 120);
  if v_path !~ '^/[A-Za-z0-9/_.-]*$' then
    return;
  end if;

  v_zone    := left(coalesce(p_zone, ''), 40);
  v_source  := left(coalesce(p_source, ''), 60);
  v_device  := case when p_device in ('mobile', 'tablet', 'desktop')
                    then p_device else '' end;
  v_seconds := least(greatest(coalesce(p_seconds, 0), 0), 3600);
  v_depth   := least(greatest(coalesce(p_depth, 0), 0), 100);

  insert into public.page_stats
    (day, path, zone, source, device, views, seconds_total, depth_total)
  values
    (current_date, v_path, v_zone, v_source, v_device, 1, v_seconds, v_depth)
  on conflict (day, path, zone, source, device) do update
    set views         = page_stats.views + 1,
        seconds_total = page_stats.seconds_total + excluded.seconds_total,
        depth_total   = page_stats.depth_total + excluded.depth_total;

  -- The hour, on its own, carrying nothing that could narrow it to a person.
  if p_hour between 0 and 23 then
    insert into public.page_stats_hourly (day, hour, path, views)
    values (current_date, p_hour, v_path, 1)
    on conflict (day, hour, path) do update
      set views = page_stats_hourly.views + 1;
  end if;
end;
$$;

revoke all on function public.record_page_view(text,text,text,text,int,int,int) from public;
grant execute on function public.record_page_view(text,text,text,text,int,int,int)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- CHECK IT
--   select count(*) from public.page_stats_hourly;      -- 0, and that is fine
--   Anonymous call must succeed and add one view to each table:
--     curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/record_page_view" \
--       -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
--       -d '{"p_path":"/index.html","p_zone":"Europe/London","p_hour":20}'
--   An out-of-range hour must still write the daily row and skip the hourly:
--     ... -d '{"p_path":"/index.html","p_hour":99}'
-- ---------------------------------------------------------------------------
