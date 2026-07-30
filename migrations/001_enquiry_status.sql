-- 001_enquiry_status.sql
-- Sue's Angels FC · Supabase project hvbquuvxcswylyguplfb
--
-- WHAT THIS DOES
--   Adds optional status tracking and private notes to the `enquiries` table
--   so the control panel can mark a lead as in progress / replied / closed.
--
-- WHY IT IS SAFE
--   Purely additive. It creates two nullable columns with a default and
--   touches no existing values, so every current row is preserved exactly.
--   `IF NOT EXISTS` makes it safe to run twice. A down-migration is at the
--   bottom if you ever want to remove it.
--
-- HOW TO RUN
--   Supabase dashboard -> SQL editor -> paste -> Run.
--   The control panel feature-detects these columns: it works fully before
--   this runs, and gains the status dropdown afterwards.

begin;

alter table public.enquiries
  add column if not exists status text not null default 'new';

alter table public.enquiries
  add column if not exists notes text;

-- Constrain to the four states the control panel offers, so a typo in a
-- direct SQL edit cannot put a row into a state the UI can't display.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'enquiries_status_check'
  ) then
    alter table public.enquiries
      add constraint enquiries_status_check
      check (status in ('new', 'in progress', 'replied', 'closed'));
  end if;
end $$;

-- The inbox is always read newest-first and filtered by status.
create index if not exists enquiries_created_at_idx on public.enquiries (created_at desc);
create index if not exists enquiries_status_idx     on public.enquiries (status);

commit;


-- ---------------------------------------------------------------------------
-- VERIFY (run separately; all three should hold)
-- ---------------------------------------------------------------------------
-- select column_name, data_type, column_default
--   from information_schema.columns
--  where table_schema = 'public' and table_name = 'enquiries'
--  order by ordinal_position;
--
-- select count(*) from public.enquiries;                 -- unchanged by this migration
-- select status, count(*) from public.enquiries group by status;


-- ---------------------------------------------------------------------------
-- DOWN (only if you want to undo; this DOES drop the status/notes values)
-- ---------------------------------------------------------------------------
-- begin;
--   drop index if exists public.enquiries_status_idx;
--   drop index if exists public.enquiries_created_at_idx;
--   alter table public.enquiries drop constraint if exists enquiries_status_check;
--   alter table public.enquiries drop column if exists notes;
--   alter table public.enquiries drop column if exists status;
-- commit;
