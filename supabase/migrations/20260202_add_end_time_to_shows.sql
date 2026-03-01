-- Add end_time to shows table
ALTER TABLE public.shows 
ADD COLUMN IF NOT EXISTS end_time text;
