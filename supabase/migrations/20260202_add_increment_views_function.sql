
-- Create function to increment news views
CREATE OR REPLACE FUNCTION increment_news_views(row_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE news
  SET views = COALESCE(views, 0) + 1
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
