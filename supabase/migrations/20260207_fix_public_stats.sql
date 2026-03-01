-- Fix stats_by_country to be public
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
  -- Remove admin check for this specific function as it's used in public audience map
  -- perform public.analytics_log('stats_by_country', jsonb_build_object('start', p_start, 'end', p_end, 'limit', p_limit));

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

-- Also ensure public can execute it
grant execute on function public.stats_by_country(timestamp with time zone, timestamp with time zone, int) to anon, authenticated;
