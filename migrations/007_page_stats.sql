-- ===========================================================================
-- 007  WHAT THE WEBSITE IS ACTUALLY READ FOR
--
-- The club has 108 pages and no idea which of them anybody opens. This counts
-- page views, where in the world the reader is, what sent them, what they
-- read it on, and how far down they got, and the control panel draws it.
--
-- IT STORES COUNTS, NOT VISITS, AND THAT IS THE WHOLE DESIGN
-- A row is not one person's visit. It is a bucket: one day, one page, one
-- time zone, one source, one device, and a running total of how many views fell
-- into it. Two people who read the same page from the same zone on the
-- same kind of device on the same day are one row with views = 2, and there
-- is no way, from this table, to tell them apart or to say what either of
-- them did next.
--
-- That matters because this records more than band_views does. One row per
-- view carrying day, page, zone, source, device, dwell and depth is a
-- rich enough tuple to pick a single person out of a quiet day - the one
-- reader from Europe/Zurich who was on the sponsors page for four minutes.
-- Aggregating at write time means that row cannot be written, rather than
-- being written and trusted not to be looked at.
--
-- SO IT IS NOT ANALYTICS IN THE SENSE THE CONSENT BANNER MEANS
-- No identifier of any kind: no id, no session, no cookie, no address, no
-- user agent, no time finer than the day. Nothing here can be tied back to a
-- person, which is why it does not sit behind the gate that Google Analytics
-- and the Meta pixel sit behind, and why it must stay that way. If anything
-- identifying is ever added, it belongs behind that gate and this comment is
-- wrong.
--
-- WHERE IN THE WORLD IS THE DEVICE'S TIME ZONE, NOT ITS ADDRESS
-- The browser sends what it already knows - "Europe/London" - and the PANEL
-- maps that to a country. No IP address is read, looked up, or sent anywhere.
--
-- The zone is stored raw and mapped on the way out, rather than mapped in the
-- browser and stored as a country, because the map is a hundred-odd entries
-- read by one screen: mapping on the way in would put it in sa.js, which
-- every visitor to every page downloads. Same rule that moved homeBands out
-- of control-seed.js.
--
-- It is wrong for a VPN and for a travelling phone, and the panel says so on
-- the screen rather than implying a precision it does not have.
--
-- ANON CANNOT TOUCH THE TABLE, ONLY THE FUNCTION
-- Tighter than band_views, where anon may insert whatever it likes. Here the
-- only anonymous privilege is EXECUTE on record_page_view, which clamps every
-- argument before anything is written. The function is the validation
-- boundary, so junk and inflation are bounded at the door.
--
-- INERT UNTIL RUN, like 002 and 004. The site checks for the function and
-- carries on silently without it, so nothing breaks by not running this, and
-- nothing breaks by running it twice.
--
-- To undo:
--   drop function if exists public.record_page_view(text,text,text,text,int,int);
--   drop table if exists public.page_stats;
-- ===========================================================================

create table if not exists public.page_stats (
  day            date   not null default current_date,
  path           text   not null,
  zone           text   not null default '',
  source         text   not null default '',
  device         text   not null default '',
  views          bigint not null default 0,
  seconds_total  bigint not null default 0,
  depth_total    bigint not null default 0,
  primary key (day, path, zone, source, device)
);

create index if not exists page_stats_day on public.page_stats (day);
create index if not exists page_stats_path on public.page_stats (path);

alter table public.page_stats enable row level security;

-- No anon policy at all, deliberately. Writes arrive through the function
-- below, which runs as its owner; reads are the club's alone.
drop policy if exists "page_stats: admin read" on public.page_stats;
create policy "page_stats: admin read"
  on public.page_stats for select to authenticated using (public.is_club_admin());

drop policy if exists "page_stats: admin delete" on public.page_stats;
create policy "page_stats: admin delete"
  on public.page_stats for delete to authenticated using (public.is_club_admin());

-- ---------------------------------------------------------------------------
-- THE ONLY WAY IN
--
-- Every argument is clamped here rather than trusted, because anybody on the
-- internet may call this. A path is shape-checked and length-capped; zone,
-- source and device are cut to short strings; seconds and depth are bounded
-- to what a real reading session can be. Nothing raises: a beacon that
-- errors would produce a console error on a supporter's phone in exchange for
-- a counter, which is not a trade worth making.
-- ---------------------------------------------------------------------------
create or replace function public.record_page_view(
  p_path    text,
  p_zone    text default '',
  p_source  text default '',
  p_device  text default '',
  p_seconds int  default 0,
  p_depth   int  default 0
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
  -- Anything that does not look like one is not recorded at all, because a
  -- table full of junk keys is worse than a table with a gap in it.
  v_path := left(coalesce(p_path, ''), 120);
  if v_path !~ '^/[A-Za-z0-9/_.-]*$' then
    return;
  end if;

  v_zone    := left(coalesce(p_zone, ''), 40);
  v_source  := left(coalesce(p_source, ''), 60);
  -- Three buckets and nothing else. An unknown value becomes the empty
  -- string rather than being stored, so a caller cannot invent dimensions.
  v_device  := case when p_device in ('mobile', 'tablet', 'desktop')
                    then p_device else '' end;

  -- An hour is longer than anybody reads a Sunday-league match report, and a
  -- percentage cannot exceed a hundred. Both are what a spoofed call would
  -- push at, and both would ruin an average rather than a total.
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
end;
$$;

revoke all on function public.record_page_view(text,text,text,text,int,int) from public;
grant execute on function public.record_page_view(text,text,text,text,int,int)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- CHECK IT
--   Anonymous read must return 401 or an empty array, never rows:
--     curl -s "$SUPABASE_URL/rest/v1/page_stats?select=*" -H "apikey: $ANON_KEY"
--   Anonymous call must succeed and add one view:
--     curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/record_page_view" \
--       -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
--       -d '{"p_path":"/index.html","p_zone":"Europe/London","p_device":"mobile"}'
--   A junk path must be accepted and recorded as nothing:
--     ... -d '{"p_path":"https://evil.example/x?a=1"}'   -> no new row
-- ---------------------------------------------------------------------------
