-- Reactions for news comments (and replies): one emoji per user per comment
CREATE TABLE IF NOT EXISTS public.news_comment_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.news_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS news_comment_reactions_comment_id_idx ON public.news_comment_reactions(comment_id);

ALTER TABLE public.news_comment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read comment reactions"
  ON public.news_comment_reactions FOR SELECT USING (true);

CREATE POLICY "Users manage own comment reactions"
  ON public.news_comment_reactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add reactions JSONB to news_comments (synced from news_comment_reactions)
ALTER TABLE public.news_comments
  ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '[]'::jsonb;

-- Sync trigger: keep news_comments.reactions in sync with news_comment_reactions
CREATE OR REPLACE FUNCTION public.sync_comment_reactions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_comment_id UUID;
  reactions_json JSONB;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    target_comment_id := OLD.comment_id;
  ELSE
    target_comment_id := NEW.comment_id;
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'emoji', emoji,
      'count', cnt,
      'users', users
    )
  )
  INTO reactions_json
  FROM (
    SELECT
      emoji,
      count(*)::int AS cnt,
      jsonb_agg(user_id) AS users
    FROM public.news_comment_reactions
    WHERE comment_id = target_comment_id
    GROUP BY emoji
  ) sub;

  UPDATE public.news_comments
  SET reactions = COALESCE(reactions_json, '[]'::jsonb)
  WHERE id = target_comment_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_comment_reactions ON public.news_comment_reactions;
CREATE TRIGGER trigger_sync_comment_reactions
  AFTER INSERT OR UPDATE OR DELETE ON public.news_comment_reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_comment_reactions();

-- Backfill existing comments with empty reactions (already default '[]')
-- No backfill needed; new column defaults to '[]'.
