
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
      coalesce(nullif(e.path, ''), '/') as path,
      count(*)::bigint as views,
      count(distinct e.visitor_hash)::bigint as unique_visitors
    from public.analytics_events e
    where e.event_type = 'page_view'
      and e.occurred_at >= p_start
      and e.occurred_at < p_end
    group by 1
    order by views desc
    limit greatest(p_limit, 1);
end;
$$;
