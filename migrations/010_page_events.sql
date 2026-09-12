-- ===========================================================================
-- 010  TAGGED LINKS, AND WHAT PEOPLE CLICK
--
-- TAGGED LINKS
-- A link posted in an Instagram story, a WhatsApp group or a bio almost always
-- arrives as "Direct or unknown": apps open links without saying where from.
-- The club can put a short tag on the end of a link it shares -
--   https://www.suesangelsfc.co.uk/programme.html?from=insta-story
-- - and this records one count per (day, tag, page). The beacon also reads
-- utm_campaign / utm_source, and takes the tag out of the address bar so a
-- reader who copies the link on does not carry it with them.
--
-- WHAT PEOPLE CLICK
-- One count per (day, page, kind, target). The kinds are fixed:
--   download   a PDF or a download link          target: the file's path
--   donate     the Stripe donation link          target: the host
--   social     Instagram, Facebook, TikTok ...   target: the host
--   outbound   any other website                 target: the host
--   contact    an email or phone link            target: 'mailto' or 'tel'
--   video      a video started playing           target: the file's path
--   form       a form sent                       target: the form's name
-- Never a full address, never what was typed into a form.
--
-- THE SAME POSTURE AS 007 TO 009: no identifier, no zone, no device, no time
-- finer than the day. A click cannot be joined to a view or to another click,
-- by anybody, including somebody with the database open.
--
-- A SEPARATE CALL EACH, AND THAT IS THE LESSON OF 008. Until this is run both
-- functions are missing and both calls fail silently; nothing the site already
-- records is touched either way.
--
-- Run it in the Supabase SQL editor. To undo:
--   drop function if exists public.record_page_tag(text,text);
--   drop function if exists public.record_page_event(text,text,text);
--   drop table if exists public.page_tags;
--   drop table if exists public.page_events;
-- ===========================================================================

create table if not exists public.page_tags (
  day   date   not null default current_date,
  tag   text   not null,
  path  text   not null,
  views bigint not null default 0,
  primary key (day, tag, path)
);
create index if not exists page_tags_day on public.page_tags (day);
alter table public.page_tags enable row level security;

drop policy if exists "page_tags: admin read" on public.page_tags;
create policy "page_tags: admin read"
  on public.page_tags for select to authenticated using (public.is_club_admin());
drop policy if exists "page_tags: admin delete" on public.page_tags;
create policy "page_tags: admin delete"
  on public.page_tags for delete to authenticated using (public.is_club_admin());

create table if not exists public.page_events (
  day    date   not null default current_date,
  path   text   not null,
  kind   text   not null,
  target text   not null default '',
  count  bigint not null default 0,
  primary key (day, path, kind, target)
);
create index if not exists page_events_day on public.page_events (day);
alter table public.page_events enable row level security;

drop policy if exists "page_events: admin read" on public.page_events;
create policy "page_events: admin read"
  on public.page_events for select to authenticated using (public.is_club_admin());
drop policy if exists "page_events: admin delete" on public.page_events;
create policy "page_events: admin delete"
  on public.page_events for delete to authenticated using (public.is_club_admin());

-- ---- The ways in ------------------------------------------------------------
drop function if exists public.record_page_tag(text,text);
create function public.record_page_tag(
  p_path text,
  p_tag  text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_path text;
  v_tag  text;
begin
  v_path := left(coalesce(p_path, ''), 120);
  if v_path !~ '^/[A-Za-z0-9/_.-]*$' then return; end if;
  v_tag := lower(coalesce(p_tag, ''));
  if v_tag !~ '^[a-z0-9-]{1,40}$' then return; end if;

  insert into public.page_tags (day, tag, path, views)
  values (current_date, v_tag, v_path, 1)
  on conflict (day, tag, path) do update set views = page_tags.views + 1;
end;
$$;

drop function if exists public.record_page_event(text,text,text);
create function public.record_page_event(
  p_path   text,
  p_kind   text,
  p_target text default ''
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_path   text;
  v_target text;
begin
  v_path := left(coalesce(p_path, ''), 120);
  if v_path !~ '^/[A-Za-z0-9/_.-]*$' then return; end if;
  if p_kind not in ('download', 'donate', 'social', 'outbound', 'contact', 'video', 'form') then
    return;
  end if;

  -- A path of this site, or a bare name or host. Anything else becomes ''.
  v_target := coalesce(p_target, '');
  if left(v_target, 1) = '/' then
    v_target := left(v_target, 120);
    if v_target !~ '^/[A-Za-z0-9/_.-]*$' then v_target := ''; end if;
  else
    v_target := left(lower(v_target), 60);
    if v_target !~ '^[a-z0-9._-]*$' then v_target := ''; end if;
  end if;

  insert into public.page_events (day, path, kind, target, count)
  values (current_date, v_path, p_kind, v_target, 1)
  on conflict (day, path, kind, target) do update set count = page_events.count + 1;
end;
$$;

revoke all on function public.record_page_tag(text,text) from public;
grant execute on function public.record_page_tag(text,text) to anon, authenticated;
revoke all on function public.record_page_event(text,text,text) from public;
grant execute on function public.record_page_event(text,text,text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- CHECK IT
--   select * from public.page_tags order by day desc limit 20;
--   select * from public.page_events order by day desc limit 20;
--   A discarded path must return 204 and write nothing:
--     ... /rest/v1/rpc/record_page_event -d '{"p_path":"x","p_kind":"download","p_target":""}'
-- ---------------------------------------------------------------------------
