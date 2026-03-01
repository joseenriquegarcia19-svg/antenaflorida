-- Update site configuration with correct name and slogan
UPDATE public.site_config
SET 
  site_name = 'Antena Florida',
  slogan = 'La señal que nos une',
  updated_at = now()
WHERE id IS NOT NULL;

-- In case the table is empty (though unlikely if it was showing Antena Radio), insert default
INSERT INTO public.site_config (site_name, slogan)
SELECT 'Antena Florida', 'La señal que nos une'
WHERE NOT EXISTS (SELECT 1 FROM public.site_config);
