-- ============================================================================
-- 002_admin_role_and_rls.sql
--
-- Replaces client-side administrator identification with a database-backed
-- role, and re-grounds every write policy on it.
--
-- WHY THIS MATTERS
-- The shipped configuration carries `adminEmail` in supabase-config.js and the
-- old admin UI compared the signed-in user's email against it in the browser.
-- That check is cosmetic: anyone can edit their own JavaScript. What actually
-- protected the data was RLS, and an audit of the live project found the
-- content tables allow SELECT to anon and reject anon writes, which is
-- correct. The gap is that any write policy phrased as
-- `auth.role() = 'authenticated'` would let ANY account that can sign up
-- write club data. This migration makes "is an administrator" a fact stored
-- in the database, checked server-side, and auditable.
--
-- REVERSIBLE: every statement is guarded, and 003_rollback_admin_role.sql
-- undoes it. Run inside a transaction and inspect before committing.
--
-- HOW TO RUN
--   Supabase dashboard -> SQL Editor -> paste -> Run.
--   Then insert the real administrator's auth user id (see step 6).
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Administrator registry
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text,
  role       text not null default 'admin' check (role in ('admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  note       text
);

comment on table public.admin_users is
  'Server-side administrator registry. Membership here, not a client-side email comparison, is what authorises writes.';

alter table public.admin_users enable row level security;

-- A signed-in user may read ONLY their own row, which is what lets the control
-- panel ask "am I an administrator?" without exposing the whole roster.
-- ---------------------------------------------------------------------------
-- The permission function comes FIRST: the admin_users policies below call it,
-- so it has to exist before they are created.
-- ---------------------------------------------------------------------------
create or replace function public.is_club_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
      and role in ('admin', 'editor')
  );
$$;

comment on function public.is_club_admin() is
  'True when the caller is a registered club administrator or editor. The single source of write authorisation.';

revoke all on function public.is_club_admin() from public;
grant execute on function public.is_club_admin() to authenticated;

drop policy if exists "admin_users: read own row" on public.admin_users;
create policy "admin_users: read own row"
  on public.admin_users for select
  to authenticated
  using (user_id = auth.uid());

-- Only an existing admin may see or change the full roster.
-- A policy ON admin_users must never SELECT FROM admin_users to decide who may
-- read it: evaluating the policy re-triggers the policy and Postgres aborts
-- with 42P17, "infinite recursion detected in policy for relation
-- admin_users". Both of these did exactly that, so every read of the table
-- returned 500 and the panel, which reads it to learn your role, fell back to
-- read-only for a user the database already considered an administrator.
--
-- is_club_admin() is SECURITY DEFINER, so it sees the table without RLS and
-- the question terminates. That is what the function is for.
drop policy if exists "admin_users: admins read all" on public.admin_users;
create policy "admin_users: admins read all"
  on public.admin_users for select
  to authenticated
  using (public.is_club_admin());

drop policy if exists "admin_users: admins manage" on public.admin_users;
create policy "admin_users: admins manage"
  on public.admin_users for all
  to authenticated
  using (public.is_club_admin())
  with check (public.is_club_admin());

-- ---------------------------------------------------------------------------
-- 2. The authorisation predicate
--    SECURITY DEFINER so the function can read admin_users regardless of the
--    caller's own RLS view, and STABLE so the planner can cache it per
--    statement. search_path is pinned to defeat search-path hijacking.


-- ---------------------------------------------------------------------------
-- NOTE: policy names are IDENTIFIERS, so they interpolate with %I, not %L.
-- %L quotes as a string literal and Postgres rejects it:
--   ERROR 42601: syntax error at or near "'matches: public read'"
-- This file had %L on all sixteen policy-name placeholders, so the migration
-- could never have run. Found by running it.
-- 3. Content tables: public read, administrator-only write
--    These seven are key/value JSONB stores holding all published club data.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['matches', 'fixtures', 'team_badges', 'player_photos', 'articles', 'gallery', 'recognition']
  loop
    execute format('alter table if exists public.%I enable row level security', t);

    execute format('drop policy if exists %I on public.%I', t || ': public read', t);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      t || ': public read', t);

    -- One policy per verb so a future change to one cannot silently widen another.
    execute format('drop policy if exists %I on public.%I', t || ': admin insert', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.is_club_admin())',
      t || ': admin insert', t);

    execute format('drop policy if exists %I on public.%I', t || ': admin update', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.is_club_admin()) with check (public.is_club_admin())',
      t || ': admin update', t);

    execute format('drop policy if exists %I on public.%I', t || ': admin delete', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.is_club_admin())',
      t || ': admin delete', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Private tables: anonymous INSERT only, administrator read
--    A visitor must be able to submit a form; nobody anonymous may ever read
--    back what was submitted. A 200 with an empty array on an anonymous
--    SELECT is this policy working, not an empty table.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['enquiries', 'supporters']
  loop
    execute format('alter table if exists public.%I enable row level security', t);

    execute format('drop policy if exists %I on public.%I', t || ': anon submit', t);
    execute format(
      'create policy %I on public.%I for insert to anon, authenticated with check (true)',
      t || ': anon submit', t);

    execute format('drop policy if exists %I on public.%I', t || ': admin read', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_club_admin())',
      t || ': admin read', t);

    execute format('drop policy if exists %I on public.%I', t || ': admin update', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.is_club_admin()) with check (public.is_club_admin())',
      t || ': admin update', t);

    -- Deletion is how a subject-access erasure request is honoured, so it is
    -- allowed, but only for an administrator.
    execute format('drop policy if exists %I on public.%I', t || ': admin delete', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.is_club_admin())',
      t || ': admin delete', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Audit trail for sensitive operations
-- ---------------------------------------------------------------------------
create table if not exists public.audit_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  actor      uuid,
  actor_email text,
  action     text not null,
  table_name text,
  row_key    text,
  detail     jsonb
);

alter table public.audit_log enable row level security;

drop policy if exists "audit_log: admins read" on public.audit_log;
create policy "audit_log: admins read"
  on public.audit_log for select
  to authenticated
  using (public.is_club_admin());

-- Writes go only through the logging function below, never directly.
drop policy if exists "audit_log: admins append" on public.audit_log;
create policy "audit_log: admins append"
  on public.audit_log for insert
  to authenticated
  with check (public.is_club_admin() and actor = auth.uid());

create index if not exists audit_log_at_idx on public.audit_log (at desc);

create or replace function public.log_admin_action(
  p_action text,
  p_table  text default null,
  p_key    text default null,
  p_detail jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if not public.is_club_admin() then
    raise exception 'not authorised';
  end if;
  insert into public.audit_log (actor, actor_email, action, table_name, row_key, detail)
  values (
    auth.uid(),
    (select email from auth.users where id = auth.uid()),
    p_action, p_table, p_key, p_detail
  );
end $$;

revoke all on function public.log_admin_action(text, text, text, jsonb) from public;
grant execute on function public.log_admin_action(text, text, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Helpful indexes for the control panel's inbox views
-- ---------------------------------------------------------------------------
create index if not exists enquiries_created_idx on public.enquiries (created_at desc);
create index if not exists supporters_created_idx on public.supporters (created_at desc);

commit;

-- ============================================================================
-- REQUIRED FOLLOW-UP - the migration is inert until this runs.
--
-- Nothing can be written by anyone until at least one administrator exists.
-- Find the user id in Supabase -> Authentication -> Users, then:
--
--   insert into public.admin_users (user_id, email, role, note)
--   select id, email, 'admin', 'Club owner'
--   from auth.users
--   where email = 'stewartluwawa20@gmail.com'
--   on conflict (user_id) do update set role = 'admin';
--
-- Verify:
--   select * from public.admin_users;                  -- expect one row
--   select public.is_club_admin();                     -- expect true when signed in as that user
--
-- Then confirm an anonymous client still cannot read leads:
--   curl -s "$SUPABASE_URL/rest/v1/enquiries?select=*" -H "apikey: $ANON_KEY"
--   -- expect []
-- ============================================================================
