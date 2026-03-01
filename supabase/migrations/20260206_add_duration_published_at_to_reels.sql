-- Add duration and published_at columns to reels table
ALTER TABLE public.reels 
ADD COLUMN IF NOT EXISTS duration text,
ADD COLUMN IF NOT EXISTS published_at timestamptz DEFAULT now();
