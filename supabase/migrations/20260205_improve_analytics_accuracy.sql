-- Actualización de funciones de estadísticas para mayor precisión y robustez
-- Fecha: 2026-02-05

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
      -- Excluir bots conocidos para estadísticas más reales
      and (properties->>'device' is null or properties->>'device' != 'bot');
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

  return query
    select
      case 
        when properties->>'country' is null or properties->>'country' = '' or properties->>'country' = 'unknown' 
        then 'Desconocido'
        else properties->>'country'
      end as country_name,
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
        when path is null or path = '' or path = '/' then '/'
        when path like '/news/%' then '/news/[slug]'
        when path like '/podcasts/%' then '/podcasts/[slug]'
        when path like '/shows/%' then '/shows/[slug]'
        when path like '/team/%' then '/team/[slug]'
        else split_part(path, '?', 1) -- Quitar query params para agrupar mejor
      end as clean_path,
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
