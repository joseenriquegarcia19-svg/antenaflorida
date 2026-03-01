-- Fix permissive RLS policies and secure the database

-- 1. Fix public.news permissive policy
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow authenticated users to update news reactions" ON public.news;

-- Ensure Admins and Editors can manage news
DROP POLICY IF EXISTS "Admins can manage news" ON public.news;
DROP POLICY IF EXISTS "Editors can manage news" ON public.news;
DROP POLICY IF EXISTS "Admins and Editors can manage news" ON public.news;

CREATE POLICY "Admins and Editors can manage news" 
ON public.news 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.role = 'admin' OR profiles.role = 'editor')
  )
);

-- Ensure Public Read
DROP POLICY IF EXISTS "Public can read news" ON public.news;
CREATE POLICY "Public can read news" ON public.news FOR SELECT USING (true);


-- 2. Fix public.news_categories permissive policy
DROP POLICY IF EXISTS "Allow all access to news_categories" ON public.news_categories;

CREATE POLICY "Public read news_categories" 
ON public.news_categories FOR SELECT USING (true);

CREATE POLICY "Admins and Editors manage news_categories" 
ON public.news_categories 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.role = 'admin' OR profiles.role = 'editor')
  )
);


-- 3. Fix public.news_tags permissive policy
DROP POLICY IF EXISTS "Allow all access to news_tags" ON public.news_tags;

CREATE POLICY "Public read news_tags" 
ON public.news_tags FOR SELECT USING (true);

CREATE POLICY "Admins and Editors manage news_tags" 
ON public.news_tags 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.role = 'admin' OR profiles.role = 'editor')
  )
);


-- 4. Fix public.team_members permissive policy
DROP POLICY IF EXISTS "Admin team all access" ON public.team_members;

-- "Public team read access" should already exist, but ensure it
DROP POLICY IF EXISTS "Public team read access" ON public.team_members;
CREATE POLICY "Public team read access" ON public.team_members FOR SELECT USING (true);

CREATE POLICY "Admins manage team_members" 
ON public.team_members 
FOR ALL 
USING (
  public.is_admin()
);


-- 5. Sync Trigger for News Reactions (to support legacy views)
-- Create trigger function
CREATE OR REPLACE FUNCTION public.sync_news_reactions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_news_id UUID;
  reactions_json JSONB;
BEGIN
  -- Determine news_id
  IF (TG_OP = 'DELETE') THEN
    target_news_id := OLD.news_id;
  ELSE
    target_news_id := NEW.news_id;
  END IF;

  -- Aggregate reactions
  SELECT jsonb_agg(
    jsonb_build_object(
      'emoji', emoji,
      'count', count,
      'users', users
    )
  )
  INTO reactions_json
  FROM (
    SELECT 
      emoji, 
      count(*) as count, 
      jsonb_agg(user_id) as users
    FROM public.news_reactions
    WHERE news_id = target_news_id
    GROUP BY emoji
  ) sub;

  -- Update news table
  UPDATE public.news
  SET reactions = COALESCE(reactions_json, '[]'::jsonb)
  WHERE id = target_news_id;

  RETURN NULL;
END;
$$;

-- Create Trigger
DROP TRIGGER IF EXISTS trigger_sync_news_reactions ON public.news_reactions;
CREATE TRIGGER trigger_sync_news_reactions
AFTER INSERT OR UPDATE OR DELETE ON public.news_reactions
FOR EACH ROW
EXECUTE FUNCTION public.sync_news_reactions();


-- 6. Ensure news_reactions RLS
ALTER TABLE public.news_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read news_reactions" ON public.news_reactions;
CREATE POLICY "Public read news_reactions" 
ON public.news_reactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage own reactions" ON public.news_reactions;
CREATE POLICY "Users manage own reactions" 
ON public.news_reactions 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
