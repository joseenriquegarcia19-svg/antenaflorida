-- Add is_completed column to show_episodes
ALTER TABLE public.show_episodes ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false;
