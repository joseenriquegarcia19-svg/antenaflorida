-- Add promotions_interval to site_config
ALTER TABLE public.site_config 
ADD COLUMN IF NOT EXISTS promotions_interval integer DEFAULT 5000;
