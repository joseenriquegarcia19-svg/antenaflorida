ALTER TABLE public.shows 
ADD COLUMN IF NOT EXISTS youtube_live_url text,
ADD COLUMN IF NOT EXISTS facebook_live_url text;

COMMENT ON COLUMN public.shows.youtube_live_url IS 'YouTube Live URL for this program';
COMMENT ON COLUMN public.shows.facebook_live_url IS 'Facebook Live URL for this program';
