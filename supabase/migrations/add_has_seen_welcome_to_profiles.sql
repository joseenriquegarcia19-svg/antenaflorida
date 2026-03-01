ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_seen_welcome boolean DEFAULT false;
