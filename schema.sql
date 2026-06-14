-- ============================================================================
-- Sue's Angels FC — Supabase schema + security
-- ============================================================================
-- WHAT THIS DOES
--   1. Ensures the six content tables exist (safe if they already do).
--   2. Turns on Row-Level Security so the PUBLIC website can READ content, but
--      ONLY a signed-in admin can ADD, EDIT or DELETE it.
--
-- WHY YOU NEED IT
--   The website ships a public "anon" key in its JavaScript (this is normal and
--   safe). But without the rules below, that key can also DELETE and OVERWRITE
--   every row in the database — meaning anyone could wipe the club's content.
--   These policies close that hole while keeping the live site fully working.
--
-- HOW TO RUN (one time, ~30 seconds)
--   Supabase dashboard → SQL Editor → New query → paste ALL of this → Run.
--   It is safe to run more than once (idempotent) and will NOT delete data.
--
-- AFTER RUNNING
--   • The website keeps reading content exactly as before.
--   • Saving/deleting in the admin panel keeps working *because you are signed
--     in* (the admin login attaches your identity to those writes).
--   • Anonymous write/delete attempts are rejected.
-- ============================================================================

-- 1) Tables -------------------------------------------------------------------
--    Shape used by dataStore.js: ( key text primary key, data jsonb, updated_at ).
create table if not exists public.matches       (key text primary key, data jsonb, updated_at timestamptz default now());
create table if not exists public.fixtures      (key text primary key, data jsonb, updated_at timestamptz default now());
create table if not exists public.team_badges   (key text primary key, data jsonb, updated_at timestamptz default now());
create table if not exists public.player_photos (key text primary key, data jsonb, updated_at timestamptz default now());
create table if not exists public.articles      (key text primary key, data jsonb, updated_at timestamptz default now());
create table if not exists public.gallery       (key text primary key, data jsonb, updated_at timestamptz default now());
create table if not exists public.recognition   (key text primary key, data jsonb, updated_at timestamptz default now());

-- 2) Security (Row-Level Security + policies) --------------------------------
--    Applied to every content table in one loop so they can't drift apart.
do $$
declare
  t text;
  tables text[] := array['matches','fixtures','team_badges','player_photos','articles','gallery','recognition'];
begin
  foreach t in array tables loop
    -- turn RLS on (default-deny once policies are evaluated)
    execute format('alter table public.%I enable row level security;', t);

    -- PUBLIC READ — the live website must be able to read content.
    execute format('drop policy if exists "public read" on public.%I;', t);
    execute format('create policy "public read" on public.%I for select using (true);', t);

    -- ADMIN WRITE — insert / update / delete only for a signed-in user.
    -- (Only the club admin has a login, so this is effectively admin-only.)
    -- To tighten further to ONE email, replace `using (true)` / `with check (true)`
    -- with:  ((auth.jwt() ->> 'email') = 'stewartluwawa20@gmail.com')
    execute format('drop policy if exists "admin write" on public.%I;', t);
    execute format($f$create policy "admin write" on public.%I for all to authenticated using (true) with check (true);$f$, t);
  end loop;
end $$;

-- 3) Keep updated_at fresh on every write (optional but tidy) -----------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare
  t text;
  tables text[] := array['matches','fixtures','team_badges','player_photos','articles','gallery','recognition'];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists trg_touch_updated_at on public.%I;', t);
    execute format('create trigger trg_touch_updated_at before update on public.%I for each row execute function public.touch_updated_at();', t);
  end loop;
end $$;

-- Done. Verify in Supabase → Authentication → Policies that each table shows
-- "public read" (SELECT) and "admin write" (ALL, authenticated).

-- ============================================================================
-- 4) SUPPORTERS (newsletter / matchday-update sign-ups)
-- ============================================================================
-- This table is the OPPOSITE of the content tables above: the public may ADD
-- their own email (sign up), but NOBODY anonymous can READ the list — supporter
-- emails stay private. You read/export the list from the Supabase dashboard
-- (Table editor → supporters) or while signed in to the admin.
create table if not exists public.supporters (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  name       text,
  source     text,
  consent    boolean not null default true,
  created_at timestamptz not null default now()
);
-- one row per email (case-insensitive); a repeat sign-up is rejected (handled
-- gracefully by the site as "you're already on the list").
create unique index if not exists supporters_email_uniq on public.supporters (lower(email));

alter table public.supporters enable row level security;

-- PUBLIC SIGN-UP — anyone may INSERT their own email…
drop policy if exists "supporters public insert" on public.supporters;
create policy "supporters public insert" on public.supporters
  for insert to anon, authenticated with check (true);

-- …but only a signed-in admin may READ the list (anon gets nothing).
drop policy if exists "supporters admin read" on public.supporters;
create policy "supporters admin read" on public.supporters
  for select to authenticated using (true);

-- (No anon SELECT/UPDATE/DELETE policy on purpose → emails are write-only to the
--  public. The site inserts with Prefer: return=minimal so it never needs read.)
