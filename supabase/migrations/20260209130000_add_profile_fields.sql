-- Add avatar_url and accessibility_settings to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS accessibility_settings JSONB DEFAULT '{"chat_sound_enabled": true}'::jsonb;
