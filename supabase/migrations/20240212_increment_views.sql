-- Function to safely increment news views
-- This ensures atomic updates and avoids race conditions
CREATE OR REPLACE FUNCTION increment_news_views(news_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE news
  SET views = views + 1
  WHERE id = news_id;
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION increment_news_views(UUID) TO anon, authenticated, service_role;
