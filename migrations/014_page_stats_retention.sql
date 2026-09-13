-- ===========================================================================
-- 014  WEBSITE STATS DELETE THEMSELVES AFTER THREE YEARS
--
-- /privacy.html promises the counts are kept "for up to three years ... and
-- then deletes them". 012 made that possible with purge_page_stats(), behind
-- a button in Control panel -> Website stats -> Site health. A button is a
-- promise kept only when somebody remembers to press it.
--
-- WHY A SECOND FUNCTION. purge_page_stats() opens with is_club_admin(), and
-- a pg_cron job has no signed-in user, so scheduling it directly would raise
-- 'not allowed' every night and delete nothing. The delete moves into
-- purge_page_stats_now(), which nobody can call over the API (execute revoked
-- from anon and authenticated), and the button's function keeps its admin
-- check and calls it. One list of tables, so the button and the job cannot
-- disagree about what "every figure" means.
--
-- The job runs at 03:27 UTC, ten minutes after 013's enquiry job.
-- Safe to run more than once.
-- ===========================================================================

create or replace function public.purge_page_stats_now(p_years int default 3)
returns bigint language plpgsql security definer set search_path = public as $$
declare t text; n bigint := 0; c bigint; cutoff date;
begin
  cutoff := (current_date - make_interval(years => greatest(coalesce(p_years, 3), 1)))::date;
  foreach t in array array['page_stats','page_stats_hourly','page_routes','page_trails','page_places',
    'page_tags','page_events','page_heat','page_scroll','page_sections','page_media','page_perf',
    'page_errors','page_context','page_funnel','page_fields','audience_views','audience_places',
    'audience_events','page_returning','privacy_choices']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('delete from public.%I where day < $1', t) using cutoff;
      get diagnostics c = row_count;
      n := n + c;
    end if;
  end loop;
  return n;
end $$;

revoke all on function public.purge_page_stats_now(int) from public, anon, authenticated;

-- The button in Site health: still admins only, now the same delete.
create or replace function public.purge_page_stats(p_years int default 3)
returns bigint language plpgsql security definer set search_path = public as $$
begin
  if not public.is_club_admin() then raise exception 'not allowed'; end if;
  return public.purge_page_stats_now(p_years);
end $$;

revoke all on function public.purge_page_stats(int) from public, anon;
grant execute on function public.purge_page_stats(int) to authenticated;

-- ---- The nightly job --------------------------------------------------------
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'purge-old-page-stats') then
    perform cron.unschedule('purge-old-page-stats');
  end if;
end $$;

select cron.schedule('purge-old-page-stats', '27 3 * * *', $job$select public.purge_page_stats_now(3)$job$);

-- ---------------------------------------------------------------------------
-- CHECK IT
--   select jobid, jobname, schedule, active from cron.job;   -- two rows now
-- ---------------------------------------------------------------------------
