-- Allow users to update their own profile (avatar, name, has_seen_welcome, etc.)
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);
