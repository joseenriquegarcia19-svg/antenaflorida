-- Create news_comments table
CREATE TABLE IF NOT EXISTS public.news_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    news_id UUID NOT NULL REFERENCES public.news(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on news_comments
ALTER TABLE public.news_comments ENABLE ROW LEVEL SECURITY;

-- Policies for news_comments
CREATE POLICY "Comments are viewable by everyone" 
    ON public.news_comments FOR SELECT 
    USING (true);

CREATE POLICY "Authenticated users can insert comments" 
    ON public.news_comments FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" 
    ON public.news_comments FOR DELETE 
    USING (auth.uid() = user_id);

-- Create news_likes table
CREATE TABLE IF NOT EXISTS public.news_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    news_id UUID NOT NULL REFERENCES public.news(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_like BOOLEAN NOT NULL, -- true for like, false for dislike
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(news_id, user_id)
);

-- Enable RLS on news_likes
ALTER TABLE public.news_likes ENABLE ROW LEVEL SECURITY;

-- Policies for news_likes
CREATE POLICY "Likes are viewable by everyone" 
    ON public.news_likes FOR SELECT 
    USING (true);

CREATE POLICY "Authenticated users can insert/update likes" 
    ON public.news_likes FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own likes"
    ON public.news_likes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes" 
    ON public.news_likes FOR DELETE 
    USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS news_comments_news_id_idx ON public.news_comments(news_id);
CREATE INDEX IF NOT EXISTS news_likes_news_id_idx ON public.news_likes(news_id);
