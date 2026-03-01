-- Update site config
update public.site_config
set 
  site_name = 'Antena Radio',
  logo_url = '/og-image.png',
  slogan = 'La Mejor Música en Vivo';

-- If no site_config exists, insert it
insert into public.site_config (site_name, logo_url, slogan, top_bar_enabled)
select 'Antena Radio', '/og-image.png', 'La Mejor Música en Vivo', true
where not exists (select 1 from public.site_config);

-- Update or Insert Default Station
do $$
begin
  if exists (select 1 from public.stations where is_active = true) then
    update public.stations
    set 
      name = 'Antena Radio',
      stream_url = 'https://streaming.live365.com/a84668',
      image_url = '/og-image.png',
      description = 'Transmisión en vivo 24/7'
    where is_active = true;
  else
    insert into public.stations (name, stream_url, image_url, description, is_active, type)
    values ('Antena Radio', 'https://streaming.live365.com/a84668', '/og-image.png', 'Transmisión en vivo 24/7', true, 'audio');
  end if;
end $$;
