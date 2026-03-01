
ALTER TABLE public.site_config
ADD COLUMN IF NOT EXISTS news_carousel_interval INTEGER DEFAULT 5000,
ADD COLUMN IF NOT EXISTS news_pinned_news_id UUID REFERENCES public.news(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS news_pinned_categories TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS news_carousel_effect TEXT DEFAULT 'slide';
