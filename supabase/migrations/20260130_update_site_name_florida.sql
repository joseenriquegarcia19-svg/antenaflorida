-- Update station name to Antena Florida
update public.stations
set 
  name = 'Antena Florida',
  updated_at = now()
where name = 'Antena Radio';

-- Update site config if exists (assuming there's a table for it, or just rely on defaults)
-- If there is a site_config table, we should update it too.
-- Based on codebase search, useSiteConfig uses 'site_config' table.

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'site_config') THEN
        UPDATE public.site_config
        SET 
            site_name = 'Antena Florida',
            logo_url = '/og-image.png'
        WHERE id = (SELECT id FROM public.site_config LIMIT 1);
        
        -- If no config exists, insert one
        INSERT INTO public.site_config (site_name, logo_url)
        SELECT 'Antena Florida', '/og-image.png'
        WHERE NOT EXISTS (SELECT 1 FROM public.site_config);
    END IF;
END $$;
