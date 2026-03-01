drop policy if exists "Public insert analytics page views" on public.analytics_events;
create policy "Public insert analytics page views" on public.analytics_events
  for insert
  with check (
    event_type = 'page_view'
    and visitor_hash is not null
    and char_length(visitor_hash) > 0
  );

