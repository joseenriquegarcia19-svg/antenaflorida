-- Normalize country names in analytics statistics
-- Date: 2026-02-10

-- Helper function for country normalization
create or replace function public.normalize_country(p_country text)
returns text
language plpgsql
immutable
as $$
begin
  if p_country is null or p_country = '' or lower(p_country) in ('unknown', 'desconocido', 'no detectado') then
    return 'Desconocido';
  end if;

  return case lower(p_country)
    when 'united states' then 'Estados Unidos'
    when 'usa' then 'Estados Unidos'
    when 'us' then 'Estados Unidos'
    when 'united states of america' then 'Estados Unidos'
    when 'cuba' then 'Cuba'
    when 'spain' then 'España'
    when 'mexico' then 'México'
    when 'colombia' then 'Colombia'
    when 'argentina' then 'Argentina'
    when 'chile' then 'Chile'
    when 'venezuela' then 'Venezuela'
    when 'ecuador' then 'Ecuador'
    when 'peru' then 'Perú'
    when 'dominican republic' then 'República Dominicana'
    when 'puerto rico' then 'Puerto Rico'
    when 'panama' then 'Panamá'
    when 'costa rica' then 'Costa Rica'
    when 'guatemala' then 'Guatemala'
    when 'honduras' then 'Honduras'
    when 'el salvador' then 'El Salvador'
    when 'nicaragua' then 'Nicaragua'
    when 'uruguay' then 'Uruguay'
    when 'paraguay' then 'Paraguay'
    when 'bolivia' then 'Bolivia'
    when 'brazil' then 'Brasil'
    when 'france' then 'Francia'
    when 'italy' then 'Italia'
    when 'germany' then 'Alemania'
    when 'united kingdom' then 'Reino Unido'
    when 'canada' then 'Canadá'
    else p_country
  end;
end;
$$;

-- Update stats_overview to use normalization for country count
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
          when public.normalize_country(properties->>'country') = 'Desconocido' 
          then null 
          else public.normalize_country(properties->>'country')
        end
      )::bigint as countries
    from public.analytics_events
    where event_type = 'page_view'
      and occurred_at >= p_start
      and occurred_at < p_end
      and (properties->>'device' is null or properties->>'device' != 'bot');
end;
$$;

-- Update stats_by_country to use normalization
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
      public.normalize_country(properties->>'country') as country,
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
