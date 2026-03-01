-- Enable public read access to audience_map_entries
-- This allows the public AudienceMap component to fetch fixed countries

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'audience_map_entries' 
    and policyname = 'Public read access for audience_map_entries'
  ) then
    create policy "Public read access for audience_map_entries"
      on public.audience_map_entries
      for select
      to public
      using (true);
  end if;
end
$$;

-- Ensure RLS is enabled (it was already enabled, but good practice)
alter table public.audience_map_entries enable row level security;
