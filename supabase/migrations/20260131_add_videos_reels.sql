-- Create videos table (YouTube)
CREATE TABLE IF NOT EXISTS public.videos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  url text NOT NULL, -- YouTube URL
  thumbnail_url text,
  duration text, -- e.g. "45:20"
  category text,
  views text DEFAULT '0',
  description text,
  published_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  active boolean DEFAULT true
);

-- Create reels table (Shorts/Reels)
CREATE TABLE IF NOT EXISTS public.reels (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  video_url text, -- URL to video file or external link
  thumbnail_url text,
  platform text DEFAULT 'instagram', -- instagram, tiktok, youtube_shorts
  views text DEFAULT '0',
  created_at timestamptz DEFAULT now(),
  active boolean DEFAULT true
);

-- Add RLS policies (allow read for everyone, write for authenticated/admin)
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.videos FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.reels FOR SELECT USING (true);

CREATE POLICY "Enable write access for authenticated users" ON public.videos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable write access for authenticated users" ON public.reels FOR ALL USING (auth.role() = 'authenticated');
