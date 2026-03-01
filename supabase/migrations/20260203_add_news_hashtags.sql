
ALTER TABLE site_config 
ADD COLUMN IF NOT EXISTS news_hashtags TEXT DEFAULT '#Noticias #Radio #Actualidad';
