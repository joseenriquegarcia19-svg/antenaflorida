-- Ensure shares column exists
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS shares INTEGER DEFAULT 0;

-- Recreate function to be sure
CREATE OR REPLACE FUNCTION increment_news_shares(row_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.news
  SET shares = COALESCE(shares, 0) + 1
  WHERE id = row_id;
END;
$$;

-- Grant permissions explicitly
GRANT EXECUTE ON FUNCTION increment_news_shares(UUID) TO anon, authenticated, service_role;
