
-- Create table for deduplication if it doesn't exist
CREATE TABLE IF NOT EXISTS public.news_views_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    news_id uuid REFERENCES public.news(id) ON DELETE CASCADE,
    visitor_hash text NOT NULL,
    viewed_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_news_views_log_dedup ON public.news_views_log(news_id, visitor_hash);
CREATE INDEX IF NOT EXISTS idx_news_views_log_created_at ON public.news_views_log(viewed_at);

-- RLS
ALTER TABLE public.news_views_log ENABLE ROW LEVEL SECURITY;

-- Allow RPC (Security Definer) to work, but restricts direct access
-- We can allow anon/authenticated to insert if we wanted client-side inserts, 
-- but we are using RPC which is SECURITY DEFINER, so RLS on table is bypassed by the function.

-- Function to safely increment
CREATE OR REPLACE FUNCTION increment_news_view_robust(p_news_id uuid, p_visitor_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_recent_view boolean;
BEGIN
    -- Check if viewed in last 24 hours
    SELECT EXISTS (
        SELECT 1 FROM news_views_log
        WHERE news_id = p_news_id
        AND visitor_hash = p_visitor_hash
        AND viewed_at > now() - interval '24 hours'
    ) INTO v_recent_view;

    IF v_recent_view THEN
        RETURN false;
    END IF;

    -- Insert log
    INSERT INTO news_views_log (news_id, visitor_hash)
    VALUES (p_news_id, p_visitor_hash);

    -- Increment counter
    UPDATE news
    SET views = COALESCE(views, 0) + 1
    WHERE id = p_news_id;

    RETURN true;
END;
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION increment_news_view_robust(uuid, text) TO anon, authenticated, service_role;
