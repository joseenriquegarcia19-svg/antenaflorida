-- Create storage bucket for content if not exists
insert into storage.buckets (id, name, public)
values ('content', 'content', true)
on conflict (id) do nothing;

-- Policy for public read access
create policy "Public Access Content"
  on storage.objects for select
  using ( bucket_id = 'content' );

-- Policy for authenticated insert access
create policy "Authenticated Insert Content"
  on storage.objects for insert
  with check ( bucket_id = 'content' and auth.role() = 'authenticated' );

-- Policy for authenticated update access
create policy "Authenticated Update Content"
  on storage.objects for update
  using ( bucket_id = 'content' and auth.role() = 'authenticated' );

-- Policy for authenticated delete access
create policy "Authenticated Delete Content"
  on storage.objects for delete
  using ( bucket_id = 'content' and auth.role() = 'authenticated' );
