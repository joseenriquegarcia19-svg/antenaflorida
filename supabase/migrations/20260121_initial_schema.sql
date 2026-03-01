-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (for admin role)
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on profiles
alter table profiles enable row level security;
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- News table
create table news (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  content text,
  image_url text,
  category text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Podcasts table
create table podcasts (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  category text,
  duration text,
  episode_number text,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Shows (Estaciones) table
create table shows (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  host text,
  time text,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table news enable row level security;
alter table podcasts enable row level security;
alter table shows enable row level security;

-- Policies for public read
create policy "News are viewable by everyone" on news for select using (true);
create policy "Podcasts are viewable by everyone" on podcasts for select using (true);
create policy "Shows are viewable by everyone" on shows for select using (true);

-- Policies for admin write (simplified: authenticated users can write for now, ideally check profile role)
create policy "Authenticated users can insert news" on news for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update news" on news for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete news" on news for delete using (auth.role() = 'authenticated');

create policy "Authenticated users can insert podcasts" on podcasts for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update podcasts" on podcasts for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete podcasts" on podcasts for delete using (auth.role() = 'authenticated');

create policy "Authenticated users can insert shows" on shows for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update shows" on shows for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete shows" on shows for delete using (auth.role() = 'authenticated');

-- Initial Data (Spanish)
insert into shows (title, host, time, image_url) values
('Sesión de Jazz Suave', 'Sara J.', '02:00', 'https://lh3.googleusercontent.com/aida-public/AB6AXuArz75V1NQ5vI9rLQfOJL2dCEiYyzuA9SMXUNFEQa-_kmRryGx5RmD3pnHVFLicwmK9jpv6kvAQdbnDRQJTmc2XLC3mm-99PcUmZe4UW4voEptrqE71WvU7T0EqVg_0LTpV2sMKT8SAnZsYSz0rGgA4mD821KTbjy3uBpe-JUKeb6xD7Ry-qL7tdZY7v3qzMuPHr1ju0gWzoEvvazbiqwu3NyI3Ar1VGnorgtWA99cVkMU1MAnRutZL6e4nHNyt-WMX_KGLuK0WTkCf'),
('Pulso Matutino', 'David M.', '06:00', 'https://lh3.googleusercontent.com/aida-public/AB6AXuAKWSVmaBFpW1lFLgFkM2GcbwEUqO3AbJrqlP1-y0nA2Ezy8AVWSAI2mmW-BfRMfjAj2zfh_oRJ2smP1RcOsH3EoD9-5KlUqIiJx4pikOOLpvHdJxoJiCiF-sG7nt_pS_aan5emLEIjAg-tmr8Ik_JZ27_i0hhX4qMmW-uSqhYEbhdtlOGWYKxyQZpBYBLOnYeTYuxuJqDworFSd3FSwQyOFaAJFh8JB-23QGtWNNA74OJpdLOmq0v8pUyCHz0EJAWn8mKrhUvc3lN4'),
('Hora Techno', 'DJ Sombra', '09:00', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDqt1Gk_JKMp11uYLFQfr4IO-iNA4uTfMWVwD6bwY2Luj3I3K302KsA0q8KajCRd843VJmtaYGDEJaiAhE-36UZmoGA7yQSmqk9AQHVtdKOxabjt-6ZEAYd8WJeQSNigy-ulC-xjzy8T2OtC8omDADeRyTFXD5qE5g4BKT70c1uBh5EQpBf5d7r_tEwkpeJp7GgIBmOZ3akIcHf7cjcs96fKupa1Mu_Nv1ioxpKcwe2ugje7oLgbvZNpzttaKYaWxfuzaC9SgtxRF2p'),
('Sesiones Acústicas', 'Mia W.', '11:00', 'https://lh3.googleusercontent.com/aida-public/AB6AXuCuGeyOWUAVJbMmc553cG_KmXA9WdRK0fYdVNxW7uj6TQiuHLvg3DcGG0Y2ZtdQU1BbjqOxnBR7d9F3_B4CxS-5iKpX5nmZIGWyenwg4nkHGnrQ3zqWbgXF6pzDW62vGVs0y0bCvKnxkXrjfRUJxiAwfDWFePGgNC7EeFW9NCyLxtSrBidAH5XyHoh5XanMw4pyRlF-aQ8cmqAYDfW4wjDR5qwQdZoZJl5kEmDtynwOvs0A99KtHJX1cLV6BwB7oLOsWeI5yobpb9Pn');

insert into podcasts (title, category, duration, episode_number, image_url) values
('Renacimiento Digital', 'Cultura', '45 min', 'Ep. 124', 'https://lh3.googleusercontent.com/aida-public/AB6AXuAT0mDjIBzYyMbqVL9IF7EmsAveyHGzDkabCkkffPAarbcPd-EfNOVLSeueRVWzEQghBbtCVroCpR7OiWgDTPOHfyDjrV4FuqASdkYl7lgzd5ywLFt-4zyD0uH2jZxWpy_ThIBWk5Iu83rX6Ogf7lEZHOM46XKoHdzlasu1iBc9lvS7UHzrgi1vINWCMYV9Vju_XC75ui3XR1qFxPyHpNayMEYdel3SUoi5tkwbZ9EVDJmxNrB4T3LjoA_en7AdRNcCU97PEBB5v7Z_'),
('El Futuro del Vinilo', 'Música y Tech', '32 min', 'Ep. 89', 'https://lh3.googleusercontent.com/aida-public/AB6AXuBxvpvpSo0J3XUp6SRARDa8payqJzVP4h2uth-2-H5kNPsoO174yOU4bIdjINz_C8wHCWG9blg21Kyzt2UP859iOIaqqy2M2cKQuSEGmpUu9JRquSG5IjTjmmz2UwSGgBOamw47GBdbwWrVxWkewNvLgqUKm2ekUPj621c5hiIFyybnkS56cceD7KbAZGoUP3FdOAveMJLFcLbxuRtuJSMUsw8UNF_JxyCwKDnbbD06yb3q1-z-dfdYTrRTdGcUlETYUIQermkLAbvQ');

insert into news (title, content, category, image_url) values
('Lineup del Festival Noches de Neón anunciado para 2026', 'Detalles sobre el festival...', 'Festival', 'https://lh3.googleusercontent.com/aida-public/AB6AXuCScjYntj0bopO_pC1FoDvXGB1ufeDuSFB1by0bRZISOOBDwDE2uf6BokQYaB7OnpWsF_IEUnxMf6t5yeRzXOqcb9kJcyd4li9wHJK18iQ7m9hhY_nnWJiv0Fb4rbGqpwZWJLhOnyQdWDpM0OOlg5Ho0mPttaH-mJpC83yxXCCmibChldAn4tfzmsxwhPRUtD7myW9T6k4HHirsBtZ-w3jLEP0NPu27QYK2VB0jwe-kkjnqSaqZKxw08gKsmfY2kSu2vxqN-3wZiSr0'),
('Top 10 artistas independientes para ver este verano', 'Lista de artistas...', 'Industria', null),
('Mejoras en el estudio: Cómo mejoramos tu experiencia de audio', 'Nuevos equipos...', 'Estación', null);
