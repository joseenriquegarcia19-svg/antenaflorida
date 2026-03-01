-- Add social_links to shows table
ALTER TABLE public.shows 
ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb;
