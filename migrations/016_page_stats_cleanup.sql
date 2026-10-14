-- ===========================================================================
-- 016  THE ROBOT ROWS IN page_stats
--
-- NOT A MIGRATION. Nothing here changes the schema and nothing here is run by
-- a deploy. It is the job that has been outstanding since the stats screen
-- went live and that existed only as a sentence in a chat window, which is
-- the reason it is still outstanding: a job nobody wrote down is a job nobody
-- does. It is written down now.
--
-- WHAT IT IS FOR
-- page_stats counts views, and a counter with no identifier cannot tell a
-- reader from something automated hitting the same address thousands of times.
-- A flood of those does not corrupt anything - every figure on the stats
-- screen is still the honest sum of what was recorded - but it drowns the
-- real reading in a column of noise, so the screen stops answering the one
-- question it exists for.
--
-- IT REPORTS BEFORE IT DELETES, AND THE DELETE IS COMMENTED OUT
-- I cannot see this table. Anon has no read policy on it by design, which is
-- the posture working, so the shape of the flood is something only somebody
-- signed in can look at. Writing a DELETE against a pattern I had guessed at
-- would be the worst thing in this file: there is no undo, and a counter
-- deleted is a week of real reading gone with it.
--
-- So: run part one, read the answers, then fill in part two from what you
-- actually saw. Part two runs inside a transaction that shows you the count
-- before you commit it.
--
-- WHO CAN RUN IT
-- The SQL editor in Supabase, or any admin session. The delete policy on
-- page_stats is is_club_admin(), so the same answer that lets the Publish
-- button work is the one that lets this run.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- PART ONE: WHAT IS IN THERE. Nothing here writes anything.
-- ---------------------------------------------------------------------------

-- 1. The size of it, and the span.
select count(*)          as rows,
       sum(views)        as views,
       min(day)          as first_day,
       max(day)          as last_day
from public.page_stats;

-- 2. The heaviest days. A flood is usually one day, or a short run of them,
--    standing well clear of every other day the club has had.
select day, count(*) as rows, sum(views) as views
from public.page_stats
group by day
order by views desc
limit 20;

-- 3. The heaviest single buckets. A real page on a real day from a real place
--    is tens of views. Thousands in one bucket is one thing hitting one
--    address over and over.
select day, path, zone, source, device, views,
       round(seconds_total::numeric / nullif(views, 0), 1) as seconds_each
from public.page_stats
order by views desc
limit 30;

-- 4. Where they claim to be, what sent them, what they read it on. Something
--    automated usually declares one zone for everything, or none at all.
select coalesce(nullif(zone, ''),   '(none)') as zone,   sum(views) as views
from public.page_stats group by 1 order by 2 desc limit 20;

select coalesce(nullif(source, ''), '(direct or unknown)') as source, sum(views) as views
from public.page_stats group by 1 order by 2 desc limit 20;

select coalesce(nullif(device, ''), '(none)') as device, sum(views) as views
from public.page_stats group by 1 order by 2 desc;

-- 5. Nought seconds on the page, every time. A person who opened a page and
--    left still registers a second or two; something that never rendered it
--    registers none. This is the single most useful tell in the table.
select day, path, zone, source, device, views
from public.page_stats
where seconds_total = 0 and views > 5
order by views desc
limit 30;


-- ---------------------------------------------------------------------------
-- PART TWO: THE DELETE. Read part one first and write the where clause from
-- what it showed you, not from what this file guesses.
--
-- It runs inside a transaction and ends in ROLLBACK, so running it as it
-- stands changes NOTHING and tells you exactly how much the clause would
-- take. Change the last line to COMMIT only when the count is the one you
-- meant.
-- ---------------------------------------------------------------------------

/*
begin;

  -- The clause. Replace it. Some shapes that have been the answer before:
  --   day between date '2026-09-01' and date '2026-09-03'   -- a dated flood
  --   seconds_total = 0 and views > 50                      -- never rendered
  --   zone = '' and source = '' and device = ''             -- declared nothing
  create temporary table doomed on commit drop as
  select * from public.page_stats
   where false;   -- <= WRITE THE CLAUSE HERE

  select count(*) as rows_to_delete, sum(views) as views_to_delete from doomed;

  delete from public.page_stats p
   using doomed d
   where p.day = d.day and p.path = d.path and p.zone = d.zone
     and p.source = d.source and p.device = d.device;

rollback;  -- <= change to COMMIT when the figures above are right
*/


-- ---------------------------------------------------------------------------
-- THE RELATED TABLES
--
-- page_stats is the one the screen leads on, but the same flood will have
-- landed in whatever else was recording at the time. Ask these the same
-- question before deciding the job is done.
-- ---------------------------------------------------------------------------
select 'page_stats_hourly' as t, count(*) as rows from public.page_stats_hourly
union all select 'page_routes',  count(*) from public.page_routes
union all select 'page_events',  count(*) from public.page_events
union all select 'page_places',  count(*) from public.page_places
union all select 'page_trails',  count(*) from public.page_trails;
