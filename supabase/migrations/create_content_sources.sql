-- Create content_sources table to track import sources
CREATE TABLE IF NOT EXISTS public.content_sources (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    type text NOT NULL, -- 'youtube_channel', 'youtube_playlist', 'rss_feed'
    url text NOT NULL,
    name text,
    last_synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    show_id uuid REFERENCES public.shows(id) ON DELETE SET NULL,
    platform text -- 'videos', 'reels', 'podcasts' (to distinguish which page manages this)
);

-- Enable RLS
ALTER TABLE public.content_sources ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read access" ON public.content_sources FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.content_sources FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.content_sources FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON public.content_sources FOR DELETE TO authenticated USING (true);
