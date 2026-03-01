
-- Create storage bucket for images if not exists
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'images' );

create policy "Authenticated Insert"
  on storage.objects for insert
  with check ( bucket_id = 'images' and auth.role() = 'authenticated' );

-- Update profiles table for roles and permissions
alter table public.profiles 
add column if not exists permissions jsonb default '{}'::jsonb;

-- Update shows table for 24/7 support and description
alter table public.shows
add column if not exists description text,
add column if not exists is_24_7 boolean default false;

-- Create function to create user (to be used by Edge Function, but useful to have helpers)
-- Actually, we'll handle user creation in Edge Function to bypass client limitations.
