-- Add color configuration for Top Bar
ALTER TABLE public.site_config 
ADD COLUMN IF NOT EXISTS top_bar_bg_color text DEFAULT '#0f172a',
ADD COLUMN IF NOT EXISTS top_bar_text_color text DEFAULT '#ffffff';
