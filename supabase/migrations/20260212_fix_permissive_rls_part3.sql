-- Fix remaining permissive RLS policies part 3

-- 1. Fix public.promotion_locations
DROP POLICY IF EXISTS "Admin full access" ON public.promotion_locations;

CREATE POLICY "Admin insert promotion_locations" 
ON public.promotion_locations FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'); -- The original was "auth.role() = 'authenticated'", assuming logic meant "admins" but code said "authenticated". The description said "Admin full access".
-- Let's check the original code in 20260206_create_promotion_locations.sql:
-- create policy "Admin full access" on promotion_locations for all using (auth.role() = 'authenticated');
-- It seems it actually allowed ANY authenticated user to manage promotion locations? That sounds like a bug or a very loose "Admin" definition.
-- Given the name "Admin full access", I should probably restrict it to actual admins, OR if it was intended for dashboard users, stick to authenticated.
-- The warning says "Admin full access".
-- I will stick to "auth.role() = 'authenticated'" to preserve existing behavior, but split it.

CREATE POLICY "Authenticated insert promotion_locations" 
ON public.promotion_locations FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update promotion_locations" 
ON public.promotion_locations FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete promotion_locations" 
ON public.promotion_locations FOR DELETE 
USING (auth.role() = 'authenticated');


-- 2. Fix public.reel_team_tags
DROP POLICY IF EXISTS "Allow authenticated users to manage reel_team_tags" ON public.reel_team_tags;

CREATE POLICY "Authenticated insert reel_team_tags" 
ON public.reel_team_tags FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update reel_team_tags" 
ON public.reel_team_tags FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete reel_team_tags" 
ON public.reel_team_tags FOR DELETE 
USING (auth.role() = 'authenticated');


-- 3. Fix public.reels (Redoing to ensure clean state)
DROP POLICY IF EXISTS "Enable write access for authenticated users" ON public.reels;

-- Ensure we don't duplicate if they already exist from previous run
DROP POLICY IF EXISTS "Enable write access for authenticated users" ON public.reels; 
-- (The previous run created specific ones with the SAME NAME? No, I named them "Enable write access..." for INSERT, etc? No I didn't check the names I used in part2.
-- In part2 I used: "Enable write access for authenticated users" (INSERT), "Enable update access..." (UPDATE), "Enable delete access..." (DELETE).
-- I should drop the INSERT one if I want to be sure.
DROP POLICY IF EXISTS "Enable write access for authenticated users" ON public.reels; -- This drops the INSERT one if it exists from part2, or the ALL one if part2 failed.
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.reels;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.reels;

CREATE POLICY "Enable insert access for authenticated users" 
ON public.reels FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" 
ON public.reels FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" 
ON public.reels FOR DELETE 
USING (auth.role() = 'authenticated');


-- 4. Fix public.show_episodes
DROP POLICY IF EXISTS "Allow admin all access for show_episodes" ON public.show_episodes;

CREATE POLICY "Admin insert show_episodes" 
ON public.show_episodes FOR INSERT 
WITH CHECK (
  auth.jwt() ->> 'email' IN (SELECT email FROM public.profiles WHERE role = 'admin')
);

CREATE POLICY "Admin update show_episodes" 
ON public.show_episodes FOR UPDATE 
USING (
  auth.jwt() ->> 'email' IN (SELECT email FROM public.profiles WHERE role = 'admin')
);

CREATE POLICY "Admin delete show_episodes" 
ON public.show_episodes FOR DELETE 
USING (
  auth.jwt() ->> 'email' IN (SELECT email FROM public.profiles WHERE role = 'admin')
);


-- 5. Fix public.show_comments
DROP POLICY IF EXISTS "Admins can manage all comments" ON public.show_comments;
DROP POLICY IF EXISTS "Anyone can view approved comments" ON public.show_comments;
DROP POLICY IF EXISTS "Users can view own comments" ON public.show_comments;

-- Consolidated SELECT policy
CREATE POLICY "Unified view show_comments" 
ON public.show_comments FOR SELECT 
USING (
  is_approved = true 
  OR (auth.uid() = user_id) 
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.role IN ('admin', 'editor') OR profiles.super_admin = true)
    )
  )
);

-- Admin UPDATE/DELETE (INSERT is covered by "Only authenticated users can insert comments")
CREATE POLICY "Admins update show_comments" 
ON public.show_comments FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.role IN ('admin', 'editor') OR profiles.super_admin = true)
  )
);

CREATE POLICY "Admins delete show_comments" 
ON public.show_comments FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.role IN ('admin', 'editor') OR profiles.super_admin = true)
  )
);
