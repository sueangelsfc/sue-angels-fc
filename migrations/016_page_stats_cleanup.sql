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
-- reader from something automated hitting the same address thousands of
-- times. A flood of those does not corrupt anything - every figure on the
-- stats screen is still the honest sum of what was recorded - but it drowns
-- the real reading in a column of noise, so the screen stops answering the
-- one question it exists for.
--
-- THE CAUSE IS FOUND AND FIXED. THIS IS THE RESIDUE.
-- `npm run visual` loads every page family in a real browser, and a real
-- browser built from runtime.json posts to the PRODUCTION database.
-- `src/scripts/30-stats.js` now leaves before it does anything when
-- `navigator.webdriver` is set or the user agent says HeadlessChrome, which
-- landed in 8d830519 on 11 October 2026. What that commit could not do is
-- clean up after itself, because the table cannot be written from a
-- developer machine.
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
-- PART TWO: THE EVIDENCE, AND HOW THE CLAUSE WAS ARRIVED AT
--
-- Read on 14 October 2026 from the database side, which is why the clause
-- below is written down rather than guessed. Re-run this before deleting:
-- the figures will have moved, and a clause that is right in October is
-- only PROBABLY right in November.
--
-- The three marks the machine rows carry, all at once:
--
--   zone = 'UTC'            a headless Chrome has no time zone of its own.
--                           2,137 of the 2,204 real views say Europe/London.
--
--   seconds_total = views   EXACTLY one second on every single view, not an
--                           average of one. Real reading ran 16 to 88
--                           seconds a view.
--
--   a level three-way       2,859 desktop / 2,836 mobile / 2,825 tablet. The
--   device split            browser pass renders at 320, 768 and 1280, so the
--                           three columns can only come out level, and no
--                           audience has ever been within one per cent of a
--                           perfect three-way split. THIS is the proof; the
--                           other two are only consistent with it.
--
-- 32 paths, which is the browser pass's own count of page families.
-- ---------------------------------------------------------------------------

-- 6. The split the clause would make. Run this and look at it before part
--    three. If "machine" is not overwhelmingly one second a view and
--    "real" is not tens of seconds, STOP: something has changed and the
--    clause no longer describes what it was written to describe.
select case when zone = 'UTC' and seconds_total = views
              and day <= date '2026-10-11'
            then 'machine' else 'real' end            as kind,
       count(*)                                        as rows,
       sum(views)                                      as views,
       count(distinct path)                            as paths,
       min(day)                                        as first_day,
       max(day)                                        as last_day,
       round(sum(seconds_total)::numeric
             / nullif(sum(views), 0), 1)               as seconds_per_view
from public.page_stats
group by 1;

-- 7. The device split within each side of that line. The machine side must
--    be close to level across all three. The real side must not be.
select case when zone = 'UTC' and seconds_total = views
              and day <= date '2026-10-11'
            then 'machine' else 'real' end as kind,
       device, sum(views) as views
from public.page_stats
group by 1, 2
order by 1, 3 desc;

-- 8. WHAT THE DATE BOUND IS PROTECTING, and it is the reason it is there.
--    `zone = 'UTC' and seconds_total = views` is ALSO true of a genuine
--    reader whose browser reports UTC and who spent one second on one page.
--    That is a real person and a real bounce, and on a single-view bucket
--    the two are indistinguishable. The guard landed on 11 October, so
--    anything recorded after it is certainly a reader; bounding the delete
--    by that date costs nothing and removes the whole class of mistake.
select count(*) as rows, sum(views) as views
from public.page_stats
where zone = 'UTC' and seconds_total = views
  and day > date '2026-10-11';


-- ---------------------------------------------------------------------------
-- PART THREE: THE DELETE.
--
-- It runs inside a transaction and ends in ROLLBACK, so running it as it
-- stands changes NOTHING and tells you exactly how much the clause would
-- take. Change the last line to COMMIT only when the count is the one part
-- two led you to expect.
--
-- RUN EACH PART ON ITS OWN. Supabase's SQL editor shows the result of the
-- LAST statement in whatever you paste into it, so pasting this whole file
-- would run every query and show you only the final one. That is why the
-- figure you are deciding on is established in PART TWO, query 6, rather
-- than inside the transaction where you would never see it.
--
-- NOT BATCHED, ON PURPOSE. The usual rule for a large DELETE is to do it in
-- batches so the lock is not held and the WAL does not balloon. This table
-- is a few thousand rows and the delete is a couple of thousand of them, so
-- a batch loop here would be ceremony: it would make the statement longer,
-- harder to read and no safer. `lock_timeout` is kept, because the beacon
-- writes to this table from live traffic and failing fast beats queueing
-- every reader's counter behind this.
-- ---------------------------------------------------------------------------

begin;

  set local lock_timeout = '5s';

  create temporary table doomed on commit drop as
  select day, path, zone, source, device, views
    from public.page_stats
   where zone = 'UTC'
     and seconds_total = views
     and day <= date '2026-10-11';

  -- Last look. This is the number you are about to remove for good.
  select count(*) as rows_to_delete, sum(views) as views_to_delete,
         min(day) as first_day, max(day) as last_day
    from doomed;

  delete from public.page_stats p
   using doomed d
   where p.day = d.day and p.path = d.path and p.zone = d.zone
     and p.source = d.source and p.device = d.device;

  -- And this is what the club is actually left with. It should read about
  -- 67 views a day at around twenty-six seconds a page.
  select count(*) as rows_left, sum(views) as views_left,
         round(sum(views)::numeric
               / nullif(max(day) - min(day) + 1, 0), 1) as views_per_day,
         round(sum(seconds_total)::numeric
               / nullif(sum(views), 0), 1)              as seconds_per_view
    from public.page_stats;

rollback;  -- <= change to COMMIT when the figures above are right


-- ---------------------------------------------------------------------------
-- THE RELATED TABLES, AND WHY FOUR OF THEM CANNOT BE CLEANED
--
-- The same flood landed in everything that was recording at the time. Only
-- page_stats can be cleaned, and the reason is the privacy design working
-- rather than an oversight.
--
--   page_stats          CLEANABLE. It carries the zone and the dwell, which
--                       are the two marks that tell a machine from a reader.
--
--   page_stats_hourly   NOT CLEANABLE. Keyed (day, hour, path) with no zone,
--   page_routes         no source, no device and no dwell, deliberately, so
--   page_trails         that a 24-way or per-step split cannot turn buckets
--   page_places         back into individual people. There is nothing in a
--                       row to tell which kind it is, and a date-bounded
--                       delete would take every real reader from 3 September
--                       to 11 October with it.
--
-- So the hour-of-day heat map and the journey flows stay inflated, and the
-- honest thing is to say so on the screen rather than to delete real
-- readers in order to make a chart look right.
--
-- Sizes, for the record:
select 'page_stats_hourly' as t, count(*) as rows from public.page_stats_hourly
union all select 'page_routes',  count(*) from public.page_routes
union all select 'page_events',  count(*) from public.page_events
union all select 'page_places',  count(*) from public.page_places
union all select 'page_trails',  count(*) from public.page_trails;


-- ---------------------------------------------------------------------------
-- WHICH MIGRATIONS ARE ACTUALLY LIVE
--
-- Checked 11 November 2026 WITHOUT a sign-in, by the technique this project
-- already records: an anonymous GET of a table says which migrations are
-- live, because `200 []` is row-level security on a table that EXISTS and
-- `PGRST205` is no table at all. Every table created by 002 to 012 answered
-- `200 []`, and 005's diagnostic table answered PGRST205, which is 006
-- having done its job.
--
--   002  admin_users, audit_log ................ live   (003 not applied)
--   004  band_views .............................. live
--   005  __diag_anon_writes ...................... gone, dropped by 006
--   007  page_stats .............................. live
--   008  page_stats_hourly ....................... see below
--   009  page_routes, page_stats_hourly .......... live
--   010  page_events, page_tags .................. live
--   011  page_places, page_trails ................ live
--   012  all fourteen tables ..................... live
--   013  purge_old_enquiries ..................... live, cron 03:17 UTC
--   014  purge_page_stats_now .................... live, cron 03:27 UTC
--   015  forget_supporter ........................ live, inert for want of
--                                                  MAILERLITE_WEBHOOK_SECRET
--                                                  and SUPPORTERS_FORGET_KEY
--                                                  on Vercel
--
-- 008 IS THE ONE THIS CANNOT ANSWER, and it does not matter. Both 008 and
-- 009 create page_stats_hourly, so the table existing says only that one of
-- them ran. 009 supersedes it and 008 never needs to be run.
--
-- Nothing is pending. Several notes elsewhere still describe 007 and 012 as
-- "inert until the migration is run"; that stopped being true some time ago.
--
-- AND THE POSTURE IS INTACT. All fifteen tables asked, page_stats and
-- enquiries and supporters among them, returned `200 []` and not one row.
-- Anonymous can see that these tables exist and nothing inside them.
-- ---------------------------------------------------------------------------
