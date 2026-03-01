-- Add advanced scheduling columns to promotions table
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS max_daily_plays INTEGER DEFAULT 0; -- 0 means indefinite
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS is_random BOOLEAN DEFAULT false;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS end_date DATE;
