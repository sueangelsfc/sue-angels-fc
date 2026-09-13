-- ===========================================================================
-- 012  EVERYTHING ELSE THE LAW ALLOWS, AND THE TWO THINGS THAT NEED CONSENT
--
-- Classified against the ICO's final guidance on storage and access
-- technologies (29 April 2026), whose table of activities "likely to meet the
-- statistical purposes exception, when using aggregate statistical
-- information" names almost every one of these directly:
--
--   STATISTICS (no consent; the visitor is told and can object; the beacon
--   sends nothing unless window.saPrivacy.allows('stats') is true):
--     page_heat      where on a page people click, as a share of the page's
--                    width and height, plus clicks that did nothing and
--                    repeated clicks ("total hits on sections of a page")
--     page_scroll    how far down each page views reach, in tenths
--                    ("average scroll depth")
--     page_sections  how long each part of a page was on screen
--     page_media     videos started and how far they were watched; photos
--                    opened
--     page_perf      how fast pages load, in bands ("page loading speeds")
--     page_errors    what broke, with nothing from the page in the message
--                    (also strictly necessary: detecting technical faults)
--     page_context   browser, system, language, screen and so on, EACH ONE
--                    COUNTED ON ITS OWN so no row combines them into
--                    something that singles a device out
--     page_funnel    how many views reach each step of joining, sponsoring,
--                    donating and the newsletter
--     page_fields    which form field people stop at (the field's NAME,
--                    never what was typed)
--
--   CONSENT (off by default; needs a SAVED yes; allows('sponsor') and
--   allows('returning')):
--     audience_*     the figures the club may show sponsors. Sharing for a
--                    commercial purpose is outside the statistics exception.
--     page_returning new against returning visits. Remembering on a device
--                    that somebody has been before is tracking a person over
--                    time, which the guidance says needs consent.
--
--   A RECORD THAT THE MECHANISM WORKS: privacy_choices counts the choices
--   saved each day, with nothing that identifies who made them. The choice
--   itself, with its date and version, is kept on the visitor's device.
--
--   RETENTION: purge_page_stats() deletes every count older than the period
--   the privacy page promises (three years). Only an administrator may run it.
--
-- NOT HERE, AND NEVER GOING TO BE: recordings of individual visits, visitor
-- identifiers, fingerprints, anything typed into a form.
--
-- Each thing has its OWN function, so a database missing one of these loses
-- that one and nothing else - the lesson of 008. Inert and idempotent. Run it
-- in the Supabase SQL editor.
-- ===========================================================================

-- ---- A helper every function uses: is this a path on this site? ------------
create or replace function public.stats_path_ok(p text) returns boolean
language sql immutable as $$
  select p is not null and length(p) <= 120 and p ~ '^/[A-Za-z0-9/_.-]*$'
$$;

-- ---- Tables -----------------------------------------------------------------
create table if not exists public.page_heat (
  day date not null default current_date,
  path text not null,
  device text not null default '',
  kind text not null,            -- click | dead | rage | copy
  section text not null default '',
  x smallint not null,           -- 0..19, twentieths of the page width
  y smallint not null,           -- 0..199, half-percent steps of the page height
  count bigint not null default 0,
  primary key (day, path, device, kind, section, x, y)
);

create table if not exists public.page_scroll (
  day date not null default current_date,
  path text not null,
  band smallint not null,        -- 0..10: reached at least band x 10 percent
  views bigint not null default 0,
  primary key (day, path, band)
);

create table if not exists public.page_sections (
  day date not null default current_date,
  path text not null,
  section text not null,
  views bigint not null default 0,
  seconds_total bigint not null default 0,
  primary key (day, path, section)
);

create table if not exists public.page_media (
  day date not null default current_date,
  path text not null,
  kind text not null,            -- video | photo
  media text not null,
  mark smallint not null,        -- 0 started, 25, 50, 75, 100 watched; 0 for a photo
  count bigint not null default 0,
  primary key (day, path, kind, media, mark)
);

create table if not exists public.page_perf (
  day date not null default current_date,
  path text not null,
  device text not null default '',
  metric text not null,          -- ttfb | fcp | lcp | inp | cls | load
  bucket smallint not null,      -- 0..12, bands the beacon defines
  count bigint not null default 0,
  primary key (day, path, device, metric, bucket)
);

create table if not exists public.page_errors (
  day date not null default current_date,
  path text not null,
  kind text not null,            -- error | promise | resource
  file text not null default '',
  message text not null default '',
  count bigint not null default 0,
  primary key (day, path, kind, file, message)
);

create table if not exists public.page_context (
  day date not null default current_date,
  dimension text not null,
  value text not null,
  views bigint not null default 0,
  primary key (day, dimension, value)
);

create table if not exists public.page_funnel (
  day date not null default current_date,
  funnel text not null,
  step smallint not null,
  views bigint not null default 0,
  primary key (day, funnel, step)
);

create table if not exists public.page_fields (
  day date not null default current_date,
  form text not null,
  field text not null,
  event text not null,           -- focus | leave | error | sent
  count bigint not null default 0,
  primary key (day, form, field, event)
);

create table if not exists public.audience_views (
  day date not null default current_date,
  path text not null,
  source_kind text not null default '',   -- search | social | other | direct | tag
  device text not null default '',
  views bigint not null default 0,
  seconds_total bigint not null default 0,
  primary key (day, path, source_kind, device)
);

create table if not exists public.audience_places (
  day date not null default current_date,
  country text not null,
  region text not null default '',
  city text not null default '',
  lat numeric(4,1),
  lon numeric(5,1),
  views bigint not null default 0,
  primary key (day, country, region, city)
);

create table if not exists public.audience_events (
  day date not null default current_date,
  kind text not null,
  target text not null default '',
  count bigint not null default 0,
  primary key (day, kind, target)
);

create table if not exists public.page_returning (
  day date not null default current_date,
  kind text not null,            -- new | returning
  visits text not null default '',   -- 1 | 2-3 | 4-10 | 11+
  gap text not null default '',      -- same day | within a week | within a month | longer
  views bigint not null default 0,
  primary key (day, kind, visits, gap)
);

create table if not exists public.privacy_choices (
  day date not null default current_date,
  stats boolean not null,
  sponsor boolean not null,
  return_visits boolean not null,   -- "returning" is a reserved word
  count bigint not null default 0,
  primary key (day, stats, sponsor, return_visits)
);

-- ---- The same posture on every table: no anon policy, admin read and delete
do $$
declare t text;
begin
  foreach t in array array['page_heat','page_scroll','page_sections','page_media','page_perf',
    'page_errors','page_context','page_funnel','page_fields','audience_views','audience_places',
    'audience_events','page_returning','privacy_choices']
  loop
    execute format('create index if not exists %I on public.%I (day)', t || '_day', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || ': admin read', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_club_admin())', t || ': admin read', t);
    execute format('drop policy if exists %I on public.%I', t || ': admin delete', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_club_admin())', t || ': admin delete', t);
  end loop;
end $$;

-- ---- The ways in, one each ---------------------------------------------------
-- One call per view, carrying up to sixty points gathered while the page was
-- open, rather than a request for every click.
create or replace function public.record_page_heat(p_path text, p_device text, p_points jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare k text; sct text; px text; py text; v_device text;
begin
  if not public.stats_path_ok(p_path) or jsonb_typeof(p_points) is distinct from 'array' then return; end if;
  v_device := case when p_device in ('mobile','tablet','desktop') then p_device else '' end;
  for k, sct, px, py in
    select e->>'k', coalesce(e->>'s', ''), e->>'x', e->>'y' from jsonb_array_elements(p_points) as e limit 60
  loop
    if k is null or px is null or py is null or k not in ('click','dead','rage','copy')
       or sct !~ '^[A-Za-z0-9_-]{0,40}$' or px !~ '^[0-9]{1,2}$' or py !~ '^[0-9]{1,3}$' then continue; end if;
    -- A separate test, so a value that is not a number is never cast.
    if px::int > 19 or py::int > 199 then continue; end if;
    insert into public.page_heat (day, path, device, kind, section, x, y, count)
    values (current_date, p_path, v_device, k, sct, px::int, py::int, 1)
    on conflict (day, path, device, kind, section, x, y) do update set count = page_heat.count + 1;
  end loop;
end $$;

create or replace function public.record_page_scroll(p_path text, p_band int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.stats_path_ok(p_path) or p_band is null or p_band not between 0 and 10 then return; end if;
  insert into public.page_scroll (day, path, band, views) values (current_date, p_path, p_band, 1)
  on conflict (day, path, band) do update set views = page_scroll.views + 1;
end $$;

create or replace function public.record_page_sections(p_path text, p_sections jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare s text; t text;
begin
  if not public.stats_path_ok(p_path) or jsonb_typeof(p_sections) is distinct from 'array' then return; end if;
  for s, t in select e->>'s', e->>'t' from jsonb_array_elements(p_sections) as e limit 30 loop
    if s is null or s !~ '^[A-Za-z0-9_-]{1,40}$' or t is null or t !~ '^[0-9]{1,4}$' then continue; end if;
    insert into public.page_sections (day, path, section, views, seconds_total)
    values (current_date, p_path, s, 1, least(t::int, 3600))
    on conflict (day, path, section) do update
      set views = page_sections.views + 1,
          seconds_total = page_sections.seconds_total + excluded.seconds_total;
  end loop;
end $$;

create or replace function public.record_page_media(p_path text, p_kind text, p_media text, p_mark int default 0)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.stats_path_ok(p_path) or coalesce(p_kind, '') not in ('video','photo') then return; end if;
  if not public.stats_path_ok(p_media) or p_mark is null or p_mark not in (0,25,50,75,100) then return; end if;
  insert into public.page_media (day, path, kind, media, mark, count)
  values (current_date, p_path, p_kind, p_media, p_mark, 1)
  on conflict (day, path, kind, media, mark) do update set count = page_media.count + 1;
end $$;

create or replace function public.record_page_perf(p_path text, p_device text, p_metrics jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare m text; b text;
begin
  if not public.stats_path_ok(p_path) or jsonb_typeof(p_metrics) is distinct from 'object' then return; end if;
  for m, b in select key, value #>> '{}' from jsonb_each(p_metrics) limit 8 loop
    if m not in ('ttfb','fcp','lcp','inp','cls','load') or b is null or b !~ '^[0-9]{1,2}$' then continue; end if;
    if b::int > 12 then continue; end if;
    insert into public.page_perf (day, path, device, metric, bucket, count)
    values (current_date, p_path,
      case when p_device in ('mobile','tablet','desktop') then p_device else '' end, m, b::int, 1)
    on conflict (day, path, device, metric, bucket) do update set count = page_perf.count + 1;
  end loop;
end $$;

create or replace function public.record_page_error(p_path text, p_kind text, p_file text default '', p_message text default '')
returns void language plpgsql security definer set search_path = public as $$
declare v_file text := coalesce(p_file, ''); v_msg text := left(coalesce(p_message, ''), 100);
begin
  if not public.stats_path_ok(p_path) or coalesce(p_kind, '') not in ('error','promise','resource') then return; end if;
  if v_file <> '' and not public.stats_path_ok(v_file) then v_file := ''; end if;
  -- No digits, no addresses, no quotes: whatever a page put in an error
  -- message about somebody cannot survive this.
  v_msg := regexp_replace(v_msg, '[^A-Za-z .:_()-]', '', 'g');
  insert into public.page_errors (day, path, kind, file, message, count)
  values (current_date, p_path, p_kind, v_file, v_msg, 1)
  on conflict (day, path, kind, file, message) do update set count = page_errors.count + 1;
end $$;

create or replace function public.record_page_context(p_dims jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare k text; v text;
begin
  if jsonb_typeof(p_dims) is distinct from 'object' then return; end if;
  for k, v in select key, value #>> '{}' from jsonb_each(p_dims) limit 16 loop
    if k not in ('browser','os','language','scheme','motion','inapp','connection','standalone',
      'viewport','touch','density') then continue; end if;
    if v is null or v !~ '^[A-Za-z0-9 ._+-]{1,30}$' then continue; end if;
    insert into public.page_context (day, dimension, value, views) values (current_date, k, v, 1)
    on conflict (day, dimension, value) do update set views = page_context.views + 1;
  end loop;
end $$;

create or replace function public.record_page_funnel(p_funnel text, p_step int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_funnel, '') not in ('join','sponsor','donate','newsletter','contact','programme')
     or p_step is null or p_step not between 1 and 6 then return; end if;
  insert into public.page_funnel (day, funnel, step, views) values (current_date, p_funnel, p_step, 1)
  on conflict (day, funnel, step) do update set views = page_funnel.views + 1;
end $$;

create or replace function public.record_page_field(p_form text, p_field text, p_event text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_form,'') !~ '^[A-Za-z0-9_-]{1,40}$' or coalesce(p_field,'') !~ '^[A-Za-z0-9_-]{1,40}$'
     or coalesce(p_event, '') not in ('focus','leave','error','sent') then return; end if;
  insert into public.page_fields (day, form, field, event, count) values (current_date, p_form, p_field, p_event, 1)
  on conflict (day, form, field, event) do update set count = page_fields.count + 1;
end $$;

-- ---- Consent only: the beacon calls these only after a saved yes ------------
create or replace function public.record_audience_view(p_path text, p_source_kind text, p_device text, p_seconds int default 0)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.stats_path_ok(p_path) then return; end if;
  insert into public.audience_views (day, path, source_kind, device, views, seconds_total)
  values (current_date, p_path,
    case when p_source_kind in ('search','social','other','direct','tag') then p_source_kind else '' end,
    case when p_device in ('mobile','tablet','desktop') then p_device else '' end,
    1, least(greatest(coalesce(p_seconds, 0), 0), 3600))
  on conflict (day, path, source_kind, device) do update
    set views = audience_views.views + 1,
        seconds_total = audience_views.seconds_total + excluded.seconds_total;
end $$;

create or replace function public.record_audience_place(
  p_country text, p_region text default '', p_city text default '', p_lat numeric default null, p_lon numeric default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_country text := upper(coalesce(p_country, ''));
  v_region text := left(coalesce(p_region, ''), 12);
  v_city text := left(coalesce(p_city, ''), 60);
  v_lat numeric; v_lon numeric;
begin
  if v_country !~ '^[A-Z]{2}$' then return; end if;
  if v_region !~ '^[A-Za-z0-9-]*$' then v_region := ''; end if;
  if v_city !~ '^[[:alpha:][:space:].''’()-]*$' then v_city := ''; end if;
  if p_lat between -90 and 90 and p_lon between -180 and 180 then v_lat := round(p_lat, 1); v_lon := round(p_lon, 1); end if;
  insert into public.audience_places (day, country, region, city, lat, lon, views)
  values (current_date, v_country, v_region, v_city, v_lat, v_lon, 1)
  on conflict (day, country, region, city) do update
    set views = audience_places.views + 1,
        lat = coalesce(audience_places.lat, excluded.lat),
        lon = coalesce(audience_places.lon, excluded.lon);
end $$;

create or replace function public.record_audience_event(p_kind text, p_target text default '')
returns void language plpgsql security definer set search_path = public as $$
declare v_target text := coalesce(p_target, '');
begin
  if coalesce(p_kind, '') not in ('download','donate','social','outbound','contact','video','form') then return; end if;
  if left(v_target, 1) = '/' then
    if not public.stats_path_ok(v_target) then v_target := ''; end if;
  else
    v_target := left(lower(v_target), 60);
    if v_target !~ '^[a-z0-9._-]*$' then v_target := ''; end if;
  end if;
  insert into public.audience_events (day, kind, target, count) values (current_date, p_kind, v_target, 1)
  on conflict (day, kind, target) do update set count = audience_events.count + 1;
end $$;

create or replace function public.record_returning(p_kind text, p_visits text, p_gap text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_kind, '') not in ('new','returning') then return; end if;
  if coalesce(p_visits, '') not in ('1','2-3','4-10','11+')
     or coalesce(p_gap, 'x') not in ('', 'same day', 'within a week', 'within a month', 'longer') then return; end if;
  insert into public.page_returning (day, kind, visits, gap, views) values (current_date, p_kind, p_visits, p_gap, 1)
  on conflict (day, kind, visits, gap) do update set views = page_returning.views + 1;
end $$;

create or replace function public.record_privacy_choice(p_stats boolean, p_sponsor boolean, p_returning boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_stats is null or p_sponsor is null or p_returning is null then return; end if;
  insert into public.privacy_choices (day, stats, sponsor, return_visits, count)
  values (current_date, p_stats, p_sponsor, p_returning, 1)
  on conflict (day, stats, sponsor, return_visits) do update set count = privacy_choices.count + 1;
end $$;

-- ---- Retention: what the privacy page promises -------------------------------
create or replace function public.purge_page_stats(p_years int default 3)
returns bigint language plpgsql security definer set search_path = public as $$
declare t text; n bigint := 0; c bigint; cutoff date;
begin
  if not public.is_club_admin() then raise exception 'not allowed'; end if;
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

-- ---- Grants ------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'record_page_heat(text,text,jsonb)', 'record_page_scroll(text,int)',
    'record_page_sections(text,jsonb)', 'record_page_media(text,text,text,int)',
    'record_page_perf(text,text,jsonb)', 'record_page_error(text,text,text,text)',
    'record_page_context(jsonb)', 'record_page_funnel(text,int)', 'record_page_field(text,text,text)',
    'record_audience_view(text,text,text,int)', 'record_audience_place(text,text,text,numeric,numeric)',
    'record_audience_event(text,text)', 'record_returning(text,text,text)',
    'record_privacy_choice(boolean,boolean,boolean)']
  loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
  revoke all on function public.purge_page_stats(int) from public;
  grant execute on function public.purge_page_stats(int) to authenticated;
end $$;

-- ---------------------------------------------------------------------------
-- CHECK IT
--   select count(*) from public.page_heat;          -- 0 until the next visitor
--   select public.purge_page_stats(3);               -- as an admin: rows deleted
-- ---------------------------------------------------------------------------
