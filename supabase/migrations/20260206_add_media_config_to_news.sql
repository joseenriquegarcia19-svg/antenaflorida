ALTER TABLE news ADD COLUMN IF NOT EXISTS media_config JSONB;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS media_config JSONB;
-- Note: promotions already has style_config, but media_config is more specific to the media transformation. 
-- We can migrate or just use media_config for consistency. 
-- For now, I will use media_config for the new feature to avoid breaking existing style_config usage if it means something else.
