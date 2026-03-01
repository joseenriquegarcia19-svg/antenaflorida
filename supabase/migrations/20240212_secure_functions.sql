-- Secure functions by setting search_path to empty string
-- This prevents search_path hijacking vulnerabilities

CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_news_views(news_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.news
  SET views = COALESCE(views, 0) + 1
  WHERE id = news_id;
END;
$$;

-- Note: Other functions mentioned in the report like set_team_member_slug, slugify, etc. 
-- should also be updated if their source code was available. 
-- Since I only have the source for functions I created or can infer, I will start with these.
