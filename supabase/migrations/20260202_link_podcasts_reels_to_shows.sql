-- Add show association to podcasts
ALTER TABLE public.podcasts 
ADD COLUMN IF NOT EXISTS show_id UUID REFERENCES public.shows(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS show_manual_name text;

-- Add show association to reels
ALTER TABLE public.reels 
ADD COLUMN IF NOT EXISTS show_id UUID REFERENCES public.shows(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS show_manual_name text;
