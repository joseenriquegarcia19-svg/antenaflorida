-- Create Categories Table
CREATE TABLE IF NOT EXISTS public.news_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create Tags Table
CREATE TABLE IF NOT EXISTS public.news_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.news_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_tags ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow all access to news_categories" ON public.news_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to news_tags" ON public.news_tags FOR ALL USING (true) WITH CHECK (true);

-- Populate with existing data
INSERT INTO public.news_categories (name)
SELECT DISTINCT category FROM public.news WHERE category IS NOT NULL
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.news_tags (name)
SELECT DISTINCT unnest(tags) FROM public.news WHERE tags IS NOT NULL
ON CONFLICT (name) DO NOTHING;
