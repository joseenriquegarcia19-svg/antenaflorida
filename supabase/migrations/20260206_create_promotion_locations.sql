create table if not exists promotion_locations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  code text not null unique,
  description text,
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert default locations
insert into promotion_locations (name, code, description) values
('Banner Principal (Hero)', 'home_banner', 'Banner grande en la parte superior del inicio'),
('Inicio (Después de Noticias)', 'home_middle', 'Banner entre secciones de noticias'),
('Inicio (Debajo de YouTube)', 'home_bottom', 'Banner en la parte inferior del inicio'),
('Barra Lateral', 'sidebar_ad', 'Banner vertical en la barra lateral'),
('Pie de Página', 'footer_ad', 'Banner ancho en el pie de página')
on conflict (code) do nothing;

-- Add policy for public read access
alter table promotion_locations enable row level security;

create policy "Public read access"
  on promotion_locations for select
  using (true);

create policy "Admin full access"
  on promotion_locations for all
  using (auth.role() = 'authenticated');
