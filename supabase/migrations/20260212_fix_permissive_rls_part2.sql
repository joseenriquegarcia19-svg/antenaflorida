-- Fix remaining permissive RLS policies for show_team_members, team_comments, team_members, and videos/reels

-- 1. Fix public.show_team_members permissive policy
-- Drop the overly permissive policy for SELECT (via ALL)
DROP POLICY IF EXISTS "Authenticated users can manage show team members" ON public.show_team_members;

-- Recreate it for INSERT, UPDATE, DELETE only
CREATE POLICY "Authenticated users can manage show team members" 
ON public.show_team_members 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update show team members" 
ON public.show_team_members 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete show team members" 
ON public.show_team_members 
FOR DELETE 
USING (auth.role() = 'authenticated');
-- Note: Alternatively, we could use FOR ALL but exclude SELECT if possible, but standard SQL doesn't support "ALL EXCEPT".
-- So splitting into INSERT, UPDATE, DELETE is safer to avoid overlapping with the SELECT policy.


-- 2. Fix public.team_comments permissive policy for DELETE
DROP POLICY IF EXISTS "Admins can delete any comment" ON public.team_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.team_comments;

CREATE POLICY "Users and admins can delete comments" 
ON public.team_comments 
FOR DELETE 
USING (
  (auth.uid() = user_id) 
  OR 
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'admin' OR super_admin = true)
  ))
);


-- 3. Fix public.team_members permissive policy for SELECT
-- The existing "Admins manage team_members" is FOR ALL, overlapping with "Public team read access" FOR SELECT.
DROP POLICY IF EXISTS "Admins manage team_members" ON public.team_members;

-- Recreate for INSERT, UPDATE, DELETE only
CREATE POLICY "Admins manage team_members" 
ON public.team_members 
FOR INSERT 
WITH CHECK (public.is_admin());

CREATE POLICY "Admins update team_members" 
ON public.team_members 
FOR UPDATE 
USING (public.is_admin());

CREATE POLICY "Admins delete team_members" 
ON public.team_members 
FOR DELETE 
USING (public.is_admin());


-- 4. Fix public.videos permissive policy
DROP POLICY IF EXISTS "Enable write access for authenticated users" ON public.videos;

-- Recreate for INSERT, UPDATE, DELETE only
CREATE POLICY "Enable write access for authenticated users" 
ON public.videos 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" 
ON public.videos 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" 
ON public.videos 
FOR DELETE 
USING (auth.role() = 'authenticated');


-- 5. Fix public.reels permissive policy (same as videos)
DROP POLICY IF EXISTS "Enable write access for authenticated users" ON public.reels;

-- Recreate for INSERT, UPDATE, DELETE only
CREATE POLICY "Enable write access for authenticated users" 
ON public.reels 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" 
ON public.reels 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" 
ON public.reels 
FOR DELETE 
USING (auth.role() = 'authenticated');
