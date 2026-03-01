-- Update default site_name in site_config table definition (if possible, but we can just update the data)
ALTER TABLE public.site_config ALTER COLUMN site_name SET DEFAULT 'Radio Web Tito';

-- Update existing rows where site_name is 'Radio Tito'
UPDATE public.site_config 
SET site_name = 'Radio Web Tito' 
WHERE site_name = 'Radio Tito';
