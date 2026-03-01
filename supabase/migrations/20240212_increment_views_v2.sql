-- Function to safely increment news views
-- This ensures atomic updates and avoids race conditions
-- Dropping first to allow parameter name changes if needed
DROP FUNCTION IF EXISTS increment_news_views(UUID);

CREATE OR REPLACE FUNCTION increment_news_views(news_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE news
  SET views = COALESCE(views, 0) + 1
  WHERE id = news_id;
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION increment_news_views(UUID) TO anon, authenticated, service_role;
