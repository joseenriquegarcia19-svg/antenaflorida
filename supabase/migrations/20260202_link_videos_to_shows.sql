-- Add show association to videos
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS show_id UUID REFERENCES public.shows(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS show_manual_name text;
