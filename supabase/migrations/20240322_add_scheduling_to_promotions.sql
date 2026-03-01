-- Add scheduling columns to promotions table
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS end_time TEXT;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS schedule_days INTEGER[] DEFAULT '{}';
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS schedule_type TEXT DEFAULT 'once'; -- 'daily', 'weekly', 'once'
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS date DATE;
