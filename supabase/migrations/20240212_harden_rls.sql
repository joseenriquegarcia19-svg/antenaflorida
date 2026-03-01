-- Harden RLS Policies
-- The warnings indicate that some policies are "always true" for authenticated users.
-- We should restrict these to only admins or the actual authors where appropriate.

-- 1. Fix 'content_sources' policies
-- Only admins should be able to insert/update/delete content sources
ALTER TABLE public.content_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated insert" ON public.content_sources;
CREATE POLICY "Allow admin insert" ON public.content_sources
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Allow authenticated update" ON public.content_sources;
CREATE POLICY "Allow admin update" ON public.content_sources
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Allow authenticated delete" ON public.content_sources;
CREATE POLICY "Allow admin delete" ON public.content_sources
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);


-- 2. Fix 'news' reaction update policy
-- The warning says "Allow authenticated users to update news reactions" is too permissive.
-- We only want to allow updating the 'reactions' column, not the whole row.
-- RLS for UPDATE checks the whole row, but we can add a check that the user exists.
-- However, for reactions, anyone authenticated should be able to update, BUT ideally
-- we would use a separate table for reactions to be cleaner.
-- Since we use a JSONB column or array on the news table, we have to allow UPDATE on the news table.
-- To make it safer, we can ensure the user is NOT changing critical fields like title/content.
-- BUT Supabase RLS doesn't support column-level granularity easily in the policy itself (only in GRANTs).
-- A better approach for now is ensuring the policy name reflects it is intentional, 
-- or restricting it if possible. 
-- Since the warning is about "USING (true)", let's at least ensure the user is active.

DROP POLICY IF EXISTS "Allow authenticated users to update news reactions" ON public.news;
CREATE POLICY "Allow authenticated users to update news reactions" ON public.news
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);
-- Re-creating it as is because changing the logic for reactions (which are on the main table) 
-- is complex without refactoring the DB schema. 
-- The warning is valid but 'fixing' it requires moving reactions to a separate table 
-- or accepting that auth users can technically update news rows if the client isn't secure.
-- FOR NOW: We will leave the news policy as is (or re-create to ensure it exists) 
-- but we strongly recommend moving reactions to a `news_reactions` table in the future.

-- 3. Fix 'live_chat_messages' policies
-- "Allow public insert access" -> Should probably be authenticated only?
-- If it's truly public chat, then (true) is fine, but usually we want at least auth.
-- Assuming we want only logged-in users to chat:

DROP POLICY IF EXISTS "Allow public insert access" ON public.live_chat_messages;
CREATE POLICY "Allow authenticated insert access" ON public.live_chat_messages
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Fix update policy (reactions)
DROP POLICY IF EXISTS "Allow authenticated users to update reactions" ON public.live_chat_messages;
CREATE POLICY "Allow users to update own messages" ON public.live_chat_messages
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
