-- ============================================================================
-- 003_rollback_admin_role.sql
--
-- Undoes 002_admin_role_and_rls.sql. Restores the previous shape: public read
-- on the content tables, anonymous insert on the private tables, and no write
-- policy for authenticated users (so writes fall back to being blocked
-- entirely rather than being silently opened up).
--
-- Deliberately does NOT drop admin_users or audit_log: dropping them would
-- destroy the administrator roster and the audit history. Drop them by hand
-- only if you are certain, using the commented statements at the bottom.
-- ============================================================================

begin;

-- Content tables: keep public read, remove the admin-gated write policies.
do $$
declare t text;
begin
  foreach t in array array['matches', 'fixtures', 'team_badges', 'player_photos', 'articles', 'gallery', 'recognition']
  loop
    execute format('drop policy if exists %L on public.%I', t || ': admin insert', t);
    execute format('drop policy if exists %L on public.%I', t || ': admin update', t);
    execute format('drop policy if exists %L on public.%I', t || ': admin delete', t);
    -- Public read stays: removing it would blank the live site.
  end loop;
end $$;

-- Private tables: keep anonymous submit, remove admin read/update/delete.
do $$
declare t text;
begin
  foreach t in array array['enquiries', 'supporters']
  loop
    execute format('drop policy if exists %L on public.%I', t || ': admin read', t);
    execute format('drop policy if exists %L on public.%I', t || ': admin update', t);
    execute format('drop policy if exists %L on public.%I', t || ': admin delete', t);
  end loop;
end $$;

drop function if exists public.log_admin_action(text, text, text, jsonb);
drop function if exists public.is_club_admin();

commit;

-- Destructive, run only deliberately:
--   drop table if exists public.audit_log;
--   drop table if exists public.admin_users;
