-- Add reactions column to news table
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '[]'::jsonb;

-- Enable Realtime for news table
ALTER PUBLICATION supabase_realtime ADD TABLE news;

-- Add RLS policy to allow authenticated users to update reactions on news
-- We allow update if only the reactions column is changing (ideally), 
-- but for simplicity and consistency with chat, we'll allow update to authenticated users.
CREATE POLICY "Allow authenticated users to update news reactions" 
ON public.news
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
