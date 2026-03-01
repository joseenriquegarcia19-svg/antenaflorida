-- Add stream_url to shows table
ALTER TABLE public.shows 
ADD COLUMN IF NOT EXISTS stream_url text;
