ALTER TABLE podcasts
ADD COLUMN IF NOT EXISTS audio_url text,
ADD COLUMN IF NOT EXISTS description text;

