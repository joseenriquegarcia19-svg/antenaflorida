-- Add parent_id to news_comments for nested replies
ALTER TABLE public.news_comments 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.news_comments(id) ON DELETE CASCADE;

-- Add image_source and image_source_url to news for legal attribution
ALTER TABLE public.news 
ADD COLUMN IF NOT EXISTS image_source TEXT,
ADD COLUMN IF NOT EXISTS image_source_url TEXT;

-- Index for parent_id performance
CREATE INDEX IF NOT EXISTS news_comments_parent_id_idx ON public.news_comments(parent_id);
