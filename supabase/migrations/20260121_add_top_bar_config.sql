-- Add top bar configuration columns to site_config
ALTER TABLE public.site_config 
ADD COLUMN IF NOT EXISTS top_bar_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS top_bar_left_content text DEFAULT 'news',
ADD COLUMN IF NOT EXISTS top_bar_right_content text DEFAULT 'time';

-- Add check constraints for content types
ALTER TABLE public.site_config 
ADD CONSTRAINT site_config_top_bar_left_check CHECK (top_bar_left_content IN ('news', 'podcasts', 'stations', 'time', 'none')),
ADD CONSTRAINT site_config_top_bar_right_check CHECK (top_bar_right_content IN ('news', 'podcasts', 'stations', 'time', 'none'));
