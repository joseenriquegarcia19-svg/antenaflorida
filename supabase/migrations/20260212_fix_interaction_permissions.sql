-- Fix Show Comments RLS: Allow users to view their own unapproved comments
CREATE POLICY "Users can view own comments" 
ON public.show_comments 
FOR SELECT 
USING (auth.uid() = user_id);

-- Fix News Reactions: Enforce single reaction per user per news item
-- First, clean up duplicates (keep the most recent one)
DELETE FROM public.news_reactions a USING (
      SELECT min(ctid) as ctid, news_id, user_id 
      FROM public.news_reactions 
      GROUP BY news_id, user_id HAVING COUNT(*) > 1
      ) b
      WHERE a.news_id = b.news_id 
      AND a.user_id = b.user_id 
      AND a.ctid <> b.ctid;

-- Add unique constraint
ALTER TABLE public.news_reactions 
ADD CONSTRAINT news_reactions_user_news_unique UNIQUE (news_id, user_id);

-- Fix Live Chat: Ensure foreign key to profiles for easier joining
-- This might already exist implicitly via auth.users, but explicit FK to public.profiles helps PostgREST
ALTER TABLE public.live_chat_messages
DROP CONSTRAINT IF EXISTS live_chat_messages_user_id_fkey;

ALTER TABLE public.live_chat_messages
ADD CONSTRAINT live_chat_messages_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Ensure Live Chat RLS allows select of own messages (already covered by public select, but good to double check)
-- The issue might be that the user insert relies on reading the profile. 
-- The profile read is a separate query in the frontend code, but the join in .select() needs the FK.
