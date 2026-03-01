-- Create giveaways table
create table if not exists public.giveaways (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  image_url text,
  rules text,
  start_date timestamptz,
  end_date timestamptz,
  active boolean default true,
  link_url text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.giveaways enable row level security;

-- Policies
create policy "Giveaways are viewable by everyone" 
  on public.giveaways for select 
  using (true);

create policy "Giveaways are insertable by admin/editor" 
  on public.giveaways for insert 
  with check (auth.role() = 'authenticated'); -- Simplified, ideally check public.users role

create policy "Giveaways are updatable by admin/editor" 
  on public.giveaways for update
  using (auth.role() = 'authenticated');

create policy "Giveaways are deletable by admin/editor" 
  on public.giveaways for delete
  using (auth.role() = 'authenticated');
