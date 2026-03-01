-- Create a dedicated table for news reactions
-- This allows us to use proper RLS (users can only insert/delete their OWN rows)
-- instead of allowing UPDATE on the entire 'news' table.

CREATE TABLE IF NOT EXISTS public.news_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  news_id UUID REFERENCES public.news(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure a user can only react once with the same emoji per news item
  UNIQUE(news_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE public.news_reactions ENABLE ROW LEVEL SECURITY;

-- Policy: Public read access
CREATE POLICY "Allow public read access" ON public.news_reactions
FOR SELECT USING (true);

-- Policy: Authenticated insert (users can add their own reactions)
CREATE POLICY "Allow authenticated insert" ON public.news_reactions
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Authenticated delete (users can remove THEIR OWN reactions)
CREATE POLICY "Allow users to delete own reactions" ON public.news_reactions
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Now we can SAFELY remove the dangerous policy on the 'news' table
-- WARNING: This requires frontend changes to stop writing to news.reactions jsonb column
-- and start writing to this new table.
-- DROP POLICY IF EXISTS "Allow authenticated users to update news reactions" ON public.news;
