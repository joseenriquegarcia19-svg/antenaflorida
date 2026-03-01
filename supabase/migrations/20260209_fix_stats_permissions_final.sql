-- Ensure stats_by_country is public and accessible
-- This function is used by the public AudienceMap component

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
  -- No admin check here because this is for the public audience map
  
  return query
    select
      coalesce(nullif(properties->>'country', ''), 'Desconocido') as country,
      count(*)::bigint as views,
      count(distinct visitor_hash)::bigint as unique_visitors
    from public.analytics_events
    where event_type = 'page_view'
      and occurred_at >= p_start
      and occurred_at < p_end
      -- We still want to exclude bots to keep the ticker relevant
      and (properties->>'device' is null or properties->>'device' != 'bot')
    group by 1
    order by views desc
    limit greatest(p_limit, 1);
end;
$$;

-- Grant execution to everyone (public/anon and authenticated users)
grant execute on function public.stats_by_country(timestamp with time zone, timestamp with time zone, int) to anon, authenticated, service_role;
