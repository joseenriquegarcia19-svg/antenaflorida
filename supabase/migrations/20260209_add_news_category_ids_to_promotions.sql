
-- Add news_category_ids to promotions table
ALTER TABLE promotions 
ADD COLUMN IF NOT EXISTS news_category_ids uuid[];

COMMENT ON COLUMN promotions.news_category_ids IS 'List of news category IDs where this promotion should be displayed. If null or empty, it might be displayed everywhere or nowhere depending on logic.';
