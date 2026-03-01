create or replace function public.analytics_purge(p_before timestamp with time zone)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count bigint;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  delete from public.analytics_events
  where occurred_at < p_before;

  get diagnostics deleted_count = row_count;
  perform public.analytics_log('analytics_purge', jsonb_build_object('before', p_before, 'deleted', deleted_count));
  return deleted_count;
end;
$$;

