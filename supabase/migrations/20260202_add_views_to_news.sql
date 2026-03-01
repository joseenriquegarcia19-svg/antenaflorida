
-- Add views column to news table
ALTER TABLE public.news 
ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
