-- Ensure news_categories has all categories used in news table
INSERT INTO public.news_categories (name)
SELECT DISTINCT category FROM public.news 
WHERE category IS NOT NULL AND category != ''
ON CONFLICT (name) DO NOTHING;

-- Also ensure news_tags has all tags used in news
INSERT INTO public.news_tags (name)
SELECT DISTINCT unnest(tags) FROM public.news 
WHERE tags IS NOT NULL
ON CONFLICT (name) DO NOTHING;
