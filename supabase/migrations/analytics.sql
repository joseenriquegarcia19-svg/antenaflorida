create table if not exists public.analytics_events (
  id uuid default uuid_generate_v4() primary key,
  occurred_at timestamp with time zone not null default timezone('utc'::text, now()),
  event_type text not null,
  path text,
  visitor_hash text,
  properties jsonb not null default '{}'::jsonb
);

create index if not exists analytics_events_occurred_at_idx on public.analytics_events (occurred_at desc);
create index if not exists analytics_events_event_type_idx on public.analytics_events (event_type);
create index if not exists analytics_events_path_idx on public.analytics_events (path);
create index if not exists analytics_events_visitor_hash_idx on public.analytics_events (visitor_hash);
create index if not exists analytics_events_properties_gin_idx on public.analytics_events using gin (properties);

create table if not exists public.analytics_audit_logs (
  id uuid default uuid_generate_v4() primary key,
  occurred_at timestamp with time zone not null default timezone('utc'::text, now()),
  user_id uuid,
  action text not null,
  params jsonb not null default '{}'::jsonb
);

create index if not exists analytics_audit_logs_occurred_at_idx on public.analytics_audit_logs (occurred_at desc);
create index if not exists analytics_audit_logs_user_id_idx on public.analytics_audit_logs (user_id);

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists(
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function public.analytics_log(p_action text, p_params jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.analytics_audit_logs (user_id, action, params)
  values (auth.uid(), p_action, coalesce(p_params, '{}'::jsonb));
end;
$$;

create or replace function public.stats_overview(p_start timestamp with time zone, p_end timestamp with time zone)
returns table (
  views bigint,
  unique_visitors bigint,
  countries bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  perform public.analytics_log('stats_overview', jsonb_build_object('start', p_start, 'end', p_end));

  return query
    select
      count(*)::bigint as views,
      count(distinct visitor_hash)::bigint as unique_visitors,
      count(distinct nullif(properties->>'country', ''))::bigint as countries
    from public.analytics_events
    where event_type = 'page_view'
      and occurred_at >= p_start
      and occurred_at < p_end;
end;
$$;

create or replace function public.stats_timeseries(p_bucket text, p_start timestamp with time zone, p_end timestamp with time zone)
returns table (
  bucket_start timestamp with time zone,
  views bigint,
  unique_visitors bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  if p_bucket not in ('day', 'week', 'month') then
    raise exception 'invalid bucket %', p_bucket;
  end if;

  perform public.analytics_log('stats_timeseries', jsonb_build_object('bucket', p_bucket, 'start', p_start, 'end', p_end));

  return query
    select
      date_trunc(p_bucket, occurred_at) as bucket_start,
      count(*)::bigint as views,
      count(distinct visitor_hash)::bigint as unique_visitors
    from public.analytics_events
    where event_type = 'page_view'
      and occurred_at >= p_start
      and occurred_at < p_end
    group by 1
    order by 1;
end;
$$;

create or replace function public.stats_by_country(p_start timestamp with time zone, p_end timestamp with time zone, p_limit int default 20)
returns table (
  country text,
  views bigint,
  unique_visitors bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  perform public.analytics_log('stats_by_country', jsonb_build_object('start', p_start, 'end', p_end, 'limit', p_limit));

  return query
    select
      coalesce(nullif(properties->>'country', ''), 'unknown') as country,
      count(*)::bigint as views,
      count(distinct visitor_hash)::bigint as unique_visitors
    from public.analytics_events
    where event_type = 'page_view'
      and occurred_at >= p_start
      and occurred_at < p_end
    group by 1
    order by views desc
    limit greatest(p_limit, 1);
end;
$$;

create or replace function public.stats_top_pages(p_start timestamp with time zone, p_end timestamp with time zone, p_limit int default 10)
returns table (
  path text,
  views bigint,
  unique_visitors bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  perform public.analytics_log('stats_top_pages', jsonb_build_object('start', p_start, 'end', p_end, 'limit', p_limit));

  return query
    select
      coalesce(nullif(path, ''), '/') as path,
      count(*)::bigint as views,
      count(distinct visitor_hash)::bigint as unique_visitors
    from public.analytics_events
    where event_type = 'page_view'
      and occurred_at >= p_start
      and occurred_at < p_end
    group by 1
    order by views desc
    limit greatest(p_limit, 1);
end;
$$;

create or replace function public.stats_demographics(p_start timestamp with time zone, p_end timestamp with time zone)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  perform public.analytics_log('stats_demographics', jsonb_build_object('start', p_start, 'end', p_end));

  select jsonb_build_object(
    'device', (
      select coalesce(jsonb_agg(jsonb_build_object('key', k, 'views', v, 'unique_visitors', u) order by v desc), '[]'::jsonb)
      from (
        select
          coalesce(nullif(properties->>'device', ''), 'unknown') as k,
          count(*)::bigint as v,
          count(distinct visitor_hash)::bigint as u
        from public.analytics_events
        where event_type = 'page_view'
          and occurred_at >= p_start
          and occurred_at < p_end
        group by 1
      ) d
    ),
    'browser', (
      select coalesce(jsonb_agg(jsonb_build_object('key', k, 'views', v, 'unique_visitors', u) order by v desc), '[]'::jsonb)
      from (
        select
          coalesce(nullif(properties->>'browser', ''), 'unknown') as k,
          count(*)::bigint as v,
          count(distinct visitor_hash)::bigint as u
        from public.analytics_events
        where event_type = 'page_view'
          and occurred_at >= p_start
          and occurred_at < p_end
        group by 1
      ) b
    ),
    'os', (
      select coalesce(jsonb_agg(jsonb_build_object('key', k, 'views', v, 'unique_visitors', u) order by v desc), '[]'::jsonb)
      from (
        select
          coalesce(nullif(properties->>'os', ''), 'unknown') as k,
          count(*)::bigint as v,
          count(distinct visitor_hash)::bigint as u
        from public.analytics_events
        where event_type = 'page_view'
          and occurred_at >= p_start
          and occurred_at < p_end
        group by 1
      ) o
    ),
    'language', (
      select coalesce(jsonb_agg(jsonb_build_object('key', k, 'views', v, 'unique_visitors', u) order by v desc), '[]'::jsonb)
      from (
        select
          coalesce(nullif(properties->>'lang', ''), 'unknown') as k,
          count(*)::bigint as v,
          count(distinct visitor_hash)::bigint as u
        from public.analytics_events
        where event_type = 'page_view'
          and occurred_at >= p_start
          and occurred_at < p_end
        group by 1
      ) l
    )
  ) into result;

  return result;
end;
$$;

alter table public.analytics_events enable row level security;
alter table public.analytics_audit_logs enable row level security;

drop policy if exists "Admin read analytics_events" on public.analytics_events;
create policy "Admin read analytics_events" on public.analytics_events
  for select
  using (public.is_admin());

drop policy if exists "Admin delete analytics_events" on public.analytics_events;
create policy "Admin delete analytics_events" on public.analytics_events
  for delete
  using (public.is_admin());

drop policy if exists "Admin read analytics_audit_logs" on public.analytics_audit_logs;
create policy "Admin read analytics_audit_logs" on public.analytics_audit_logs
  for select
  using (public.is_admin());

