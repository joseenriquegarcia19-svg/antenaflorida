-- Add shares column to news table
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS shares INTEGER DEFAULT 0;

-- Function to increment shares
CREATE OR REPLACE FUNCTION increment_news_shares(row_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.news
  SET shares = shares + 1
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
