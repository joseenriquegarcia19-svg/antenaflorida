-- Allow authenticated users to update reactions on any message
-- This is necessary because reactions are stored within the message row
CREATE POLICY "Allow authenticated users to update reactions" 
ON public.live_chat_messages
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
