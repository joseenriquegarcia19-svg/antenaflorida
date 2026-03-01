-- Fix Auth RLS Initialization Plan warnings by wrapping auth.uid() and auth.role() in (SELECT ...)

-- 1. Fix public.profiles
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile." 
ON public.profiles FOR INSERT 
WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
-- Note: There was a "Users can update own profile" in 20260212_add_profile_update_policy_v2.sql 
-- and potentially "Authenticated update access for profiles" or similar in other files.
-- I will recreate the standard one.
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING ((SELECT auth.uid()) = id);

-- Note: "Authenticated read access for profiles" and others mentioned in warnings might be duplicates or old names.
-- I'll ensure the standard ones use SELECT.
-- If there are specific policies named "Authenticated read access for profiles", I should probably drop them if they are redundant 
-- or fix them if they are needed. 
-- The warning list shows: "Authenticated read access for profiles", "Authenticated update access for profiles", "Authenticated insert access for profiles".
-- I will drop these if they exist and rely on the standard "Users can..." policies, or recreate them with SELECT if they are distinct.
-- Given I just created "Users can..." policies, I will drop the "Authenticated..." ones to avoid confusion/duplicates if they do the same thing.
DROP POLICY IF EXISTS "Authenticated read access for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated update access for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated insert access for profiles" ON public.profiles;


-- 2. Fix public.news
DROP POLICY IF EXISTS "Authenticated users can insert news" ON public.news;
CREATE POLICY "Authenticated users can insert news" 
ON public.news FOR INSERT 
WITH CHECK ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update news" ON public.news;
CREATE POLICY "Authenticated users can update news" 
ON public.news FOR UPDATE 
USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete news" ON public.news;
CREATE POLICY "Authenticated users can delete news" 
ON public.news FOR DELETE 
USING ((SELECT auth.role()) = 'authenticated');


-- 3. Fix public.podcasts
DROP POLICY IF EXISTS "Authenticated users can insert podcasts" ON public.podcasts;
CREATE POLICY "Authenticated users can insert podcasts" 
ON public.podcasts FOR INSERT 
WITH CHECK ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update podcasts" ON public.podcasts;
CREATE POLICY "Authenticated users can update podcasts" 
ON public.podcasts FOR UPDATE 
USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete podcasts" ON public.podcasts;
CREATE POLICY "Authenticated users can delete podcasts" 
ON public.podcasts FOR DELETE 
USING ((SELECT auth.role()) = 'authenticated');


-- 4. Fix public.shows
DROP POLICY IF EXISTS "Authenticated users can insert shows" ON public.shows;
CREATE POLICY "Authenticated users can insert shows" 
ON public.shows FOR INSERT 
WITH CHECK ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update shows" ON public.shows;
CREATE POLICY "Authenticated users can update shows" 
ON public.shows FOR UPDATE 
USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete shows" ON public.shows;
CREATE POLICY "Authenticated users can delete shows" 
ON public.shows FOR DELETE 
USING ((SELECT auth.role()) = 'authenticated');


-- 5. Fix public.sponsors
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.sponsors;
CREATE POLICY "Enable insert for authenticated users only" 
ON public.sponsors FOR INSERT 
WITH CHECK ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.sponsors;
CREATE POLICY "Enable update for authenticated users only" 
ON public.sponsors FOR UPDATE 
USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.sponsors;
CREATE POLICY "Enable delete for authenticated users only" 
ON public.sponsors FOR DELETE 
USING ((SELECT auth.role()) = 'authenticated');


-- 6. Fix public.news_likes
DROP POLICY IF EXISTS "Authenticated users can insert/update likes" ON public.news_likes;
CREATE POLICY "Authenticated users can insert/update likes" 
ON public.news_likes FOR INSERT 
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Authenticated users can update their own likes" ON public.news_likes;
CREATE POLICY "Authenticated users can update their own likes" 
ON public.news_likes FOR UPDATE 
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own likes" ON public.news_likes;
CREATE POLICY "Users can delete their own likes" 
ON public.news_likes FOR DELETE 
USING ((SELECT auth.uid()) = user_id);
