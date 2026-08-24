-- 005_diagnose_anon_writes.sql
--
-- TEMPORARY. Run this, tell Claude it is done, and Claude will read the answer
-- over the API and then hand you 006 to remove it. It changes no policy and no
-- data: it creates one read-only function so the diagnosis comes back through
-- the website's own key instead of through a copied screenshot.
--
-- The question it settles: anonymous SELECT works on every table and anonymous
-- INSERT fails on every table with 42501. Either the publishable key is not
-- resolving to `anon`, or the insert policies are not on the tables the way
-- 002 wrote them. Those two have opposite fixes, so guessing costs a day.

create or replace function public.__diag_anon_writes()
returns jsonb
language sql
stable
security invoker
as $$
  select jsonb_build_object(
    'current_user', current_user,
    'session_user', session_user,
    'role_setting', current_setting('role', true),
    'policies', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'table', tablename,
               'policy', policyname,
               'cmd', cmd,
               'roles', roles::text,
               'permissive', permissive,
               'using', qual,
               'check', with_check
             ) order by tablename, cmd, policyname), '[]'::jsonb)
      from pg_policies
      where schemaname = 'public'
        and tablename in ('matches', 'supporters', 'enquiries', 'band_views')
    ),
    'rls', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'table', c.relname,
               'rls_enabled', c.relrowsecurity,
               'rls_forced', c.relforcerowsecurity
             ) order by c.relname), '[]'::jsonb)
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in ('matches', 'supporters', 'enquiries', 'band_views')
    ),
    'grants', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'table', table_name,
               'grantee', grantee,
               'privilege', privilege_type
             ) order by table_name, grantee, privilege_type), '[]'::jsonb)
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name in ('matches', 'supporters', 'enquiries', 'band_views')
        and grantee in ('anon', 'authenticated', 'public')
        and privilege_type in ('INSERT', 'SELECT')
    )
  );
$$;

grant execute on function public.__diag_anon_writes() to anon, authenticated;

notify pgrst, 'reload schema';
