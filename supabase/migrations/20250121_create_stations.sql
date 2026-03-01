
create table if not exists public.stations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  stream_url text not null,
  image_url text,
  description text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.stations enable row level security;

create policy "Public stations are viewable by everyone." on public.stations for select using (true);
create policy "Admins can insert stations." on public.stations for insert with check (
  auth.uid() in (select id from public.profiles where role = 'admin')
);
create policy "Admins can update stations." on public.stations for update using (
  auth.uid() in (select id from public.profiles where role = 'admin')
);
create policy "Admins can delete stations." on public.stations for delete using (
  auth.uid() in (select id from public.profiles where role = 'admin')
);

insert into public.stations (name, stream_url, image_url, description, is_active)
values 
('Radio Paradise', 'http://stream.radioparadise.com/mp3-128', 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Radio_Paradise_logo.svg/1200px-Radio_Paradise_logo.svg.png', 'Música ecléctica sin comerciales.', true),
('KEXP 90.3 FM', 'https://kexp-mp3-128.streamguys1.com/kexp128.mp3', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/KEXP_Logo_2016.svg/1200px-KEXP_Logo_2016.svg.png', 'Donde la música importa.', true);
