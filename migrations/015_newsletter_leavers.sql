-- ===========================================================================
-- 015  LEAVING THE NEWSLETTER TAKES YOU OFF THE CLUB'S OWN LIST TOO
--
-- The newsletter's unsubscribe link belongs to MailerLite, so MailerLite is
-- the only thing that knows somebody has left. It calls /api/newsletter-left
-- (a signed webhook), and that calls forget_supporter() below to remove the
-- address from public.supporters. /privacy.html#forms promises exactly this.
--
-- WHY A KEY. The endpoint is a Vercel function holding only the anonymous
-- key, which may not touch `supporters`, and it should stay that way. So this
-- function deletes one address, and only for a caller who presents the key.
-- The database keeps a SHA-256 hash of the key in a schema the API cannot
-- see (`private`), never the key itself; the key lives in Vercel as
-- SUPPORTERS_FORGET_KEY. Anybody else calling it over the API is refused.
--
-- RUN IT ONCE and copy the key the last line prints into Vercel. It is shown
-- this one time. Running the file again keeps the existing key (and says
-- so); to replace it, run  select public.issue_newsletter_leavers_key(true);
-- and update Vercel.
-- ===========================================================================

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.webhook_keys (
  name       text primary key,
  key_hash   text not null,
  created_at timestamptz not null default now()
);
revoke all on private.webhook_keys from public, anon, authenticated;

-- ---- The delete ------------------------------------------------------------
create or replace function public.forget_supporter(p_email text, p_key text)
returns integer language plpgsql security definer set search_path = public, extensions as $$
declare n integer; want text;
begin
  select key_hash into want from private.webhook_keys where name = 'newsletter-leavers';
  if want is null or p_key is null or length(p_key) < 32
     or encode(extensions.digest(p_key, 'sha256'), 'hex') <> want then
    raise exception 'not allowed';
  end if;
  delete from public.supporters where lower(trim(email)) = lower(trim(coalesce(p_email, '')));
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.forget_supporter(text, text) from public;
grant execute on function public.forget_supporter(text, text) to anon, authenticated;

-- ---- The key ---------------------------------------------------------------
create or replace function public.issue_newsletter_leavers_key(p_replace boolean default false)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare k text;
begin
  if not p_replace and exists (select 1 from private.webhook_keys where name = 'newsletter-leavers') then
    return 'A key already exists and is never shown twice. To make a new one: select public.issue_newsletter_leavers_key(true);';
  end if;
  k := encode(extensions.gen_random_bytes(32), 'hex');
  insert into private.webhook_keys (name, key_hash)
  values ('newsletter-leavers', encode(extensions.digest(k, 'sha256'), 'hex'))
  on conflict (name) do update set key_hash = excluded.key_hash, created_at = now();
  return k;
end $$;

revoke all on function public.issue_newsletter_leavers_key(boolean) from public, anon, authenticated;

-- Copy this into Vercel as SUPPORTERS_FORGET_KEY.
select public.issue_newsletter_leavers_key() as supporters_forget_key;
