-- Consolidation and fix for analytics functions
-- Date: 2026-02-05

-- 1. Fix is_admin to be more robust
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles p
    where p.id = auth.uid() 
      and (p.role = 'admin' or p.super_admin = true)
  );
$$;

-- 2. Fix stats_overview
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

  return query
    select
      count(*)::bigint as views,
      count(distinct visitor_hash)::bigint as unique_visitors,
      count(distinct 
        case 
          when properties->>'country' is null or properties->>'country' = '' or properties->>'country' = 'unknown' or properties->>'country' = 'Desconocido' 
          then null 
          else properties->>'country' 
        end
      )::bigint as countries
    from public.analytics_events
    where event_type = 'page_view'
      and occurred_at >= p_start
      and occurred_at < p_end
      and (properties->>'device' is null or properties->>'device' != 'bot');
end;
$$;

-- 3. Fix stats_by_country
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

  return query
    select
      case 
        when properties->>'country' is null or properties->>'country' = '' or properties->>'country' = 'unknown' 
        then 'Desconocido'
        else properties->>'country'
      end as country,
      count(*)::bigint as views,
      count(distinct visitor_hash)::bigint as unique_visitors
    from public.analytics_events
    where event_type = 'page_view'
      and occurred_at >= p_start
      and occurred_at < p_end
      and (properties->>'device' is null or properties->>'device' != 'bot')
    group by 1
    order by views desc
    limit greatest(p_limit, 1);
end;
$$;

-- 4. Fix stats_top_pages
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

  return query
    select
      case 
        when analytics_events.path is null or analytics_events.path = '' or analytics_events.path = '/' then '/'
        when analytics_events.path like '/news/%' then '/news/[slug]'
        when analytics_events.path like '/podcasts/%' then '/podcasts/[slug]'
        when analytics_events.path like '/shows/%' then '/shows/[slug]'
        when analytics_events.path like '/team/%' then '/team/[slug]'
        else split_part(analytics_events.path, '?', 1)
      end as path,
      count(*)::bigint as views,
      count(distinct visitor_hash)::bigint as unique_visitors
    from public.analytics_events
    where event_type = 'page_view'
      and occurred_at >= p_start
      and occurred_at < p_end
      and (properties->>'device' is null or properties->>'device' != 'bot')
    group by 1
    order by views desc
    limit greatest(p_limit, 1);
end;
$$;

-- 5. Fix stats_timeseries
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

  return query
    select
      date_trunc(p_bucket, occurred_at) as bucket_start,
      count(*)::bigint as views,
      count(distinct visitor_hash)::bigint as unique_visitors
    from public.analytics_events
    where event_type = 'page_view'
      and occurred_at >= p_start
      and occurred_at < p_end
      and (properties->>'device' is null or properties->>'device' != 'bot')
    group by 1
    order by 1;
end;
$$;

-- 6. Fix stats_demographics
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
          and (properties->>'device' is null or properties->>'device' != 'bot')
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
          and (properties->>'device' is null or properties->>'device' != 'bot')
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
          and (properties->>'device' is null or properties->>'device' != 'bot')
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
          and (properties->>'device' is null or properties->>'device' != 'bot')
        group by 1
      ) l
    )
  ) into result;

  return result;
end;
$$;
