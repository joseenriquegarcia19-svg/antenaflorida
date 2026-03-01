
-- Add featured column to news table
ALTER TABLE public.news
ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false;
