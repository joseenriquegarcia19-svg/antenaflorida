-- Update show_comments table to include user_id
ALTER TABLE public.show_comments 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Drop existing insert policy
DROP POLICY IF EXISTS "Anyone can insert comments" ON public.show_comments;

-- Create new policy for authenticated users only
CREATE POLICY "Only authenticated users can insert comments" 
ON public.show_comments FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Create index for user_id
CREATE INDEX IF NOT EXISTS idx_show_comments_user_id ON public.show_comments(user_id);
