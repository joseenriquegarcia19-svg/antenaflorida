
-- Add author_id to news table
ALTER TABLE public.news 
ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES public.profiles(id);

-- Update existing news to have an author (optional, maybe set to a default admin if exists)
-- For now, we'll just leave them as NULL or manually update them if needed.
