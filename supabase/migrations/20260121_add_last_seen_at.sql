-- Add last_seen_at to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_seen_at timestamp with time zone;

-- Update the column for existing users to now (optional, but good for initial state)
UPDATE public.profiles SET last_seen_at = now() WHERE last_seen_at IS NULL;
