UPDATE public.site_config 
SET site_name = 'Antena Florida' 
WHERE site_name = 'Radio Web Tito' OR site_name = 'Radio Tito';

ALTER TABLE public.site_config 
ALTER COLUMN site_name SET DEFAULT 'Antena Florida';
