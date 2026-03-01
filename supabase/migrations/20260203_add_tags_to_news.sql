-- Add tags column to news table
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
