-- ===========================================================================
-- 013  ENQUIRIES DELETE THEMSELVES AFTER TWO YEARS
--
-- /privacy.html#forms promises: "An enquiry is deleted automatically two
-- years after the club last heard from that email address, or sooner if you
-- ask." This is what makes that true without anybody remembering to do it.
--
-- WHY "LAST HEARD FROM", NOT EACH ROW'S OWN DATE. Somebody who asked about a
-- trial in 2025 and wrote again in 2027 is one conversation; deleting the
-- first message in 2027 would take the start of it out of the club's inbox
-- while the person is still talking to the club. So a row goes only when
-- nothing from the same address (ignoring case and spaces) has arrived in the
-- last two years. A row with no email goes on its own date.
--
-- WHO CAN RUN IT: nobody through the website. Execute is revoked from anon
-- and authenticated, so it cannot be called over the API at all; pg_cron runs
-- it as the database owner every night at 03:17 UTC. Deleting a single
-- enquiry sooner, when somebody asks, is still the Delete button in the Inbox.
--
-- Safe to run more than once: the function is replaced and the job is
-- unscheduled by name before it is scheduled again.
-- ===========================================================================

create or replace function public.purge_old_enquiries(p_years int default 2)
returns bigint language plpgsql security definer set search_path = public as $$
declare n bigint; cutoff timestamptz;
begin
  cutoff := now() - make_interval(years => greatest(coalesce(p_years, 2), 1));
  delete from public.enquiries e
   where e.created_at < cutoff
     and not exists (
       select 1 from public.enquiries later
        where later.created_at >= cutoff
          and nullif(lower(trim(later.email)), '') = lower(trim(e.email)));
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.purge_old_enquiries(int) from public, anon, authenticated;

-- ---- The nightly job --------------------------------------------------------
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'purge-old-enquiries') then
    perform cron.unschedule('purge-old-enquiries');
  end if;
end $$;

select cron.schedule('purge-old-enquiries', '17 3 * * *', $job$select public.purge_old_enquiries(2)$job$);

-- ---------------------------------------------------------------------------
-- CHECK IT
--   select jobname, schedule, command, active from cron.job
--    where jobname = 'purge-old-enquiries';          -- one row, active
--   select status, return_message, start_time from cron.job_run_details
--    order by start_time desc limit 5;              -- after 03:17 UTC
-- ---------------------------------------------------------------------------
