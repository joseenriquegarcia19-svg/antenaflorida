-- Add Update and Delete policies for live_chat_messages
-- This allows admins and editors to pin and delete messages

-- Policy for UPDATE (Pinning)
CREATE POLICY "Allow admins and editors to update messages" ON public.live_chat_messages
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'admin' OR profiles.role = 'editor')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'admin' OR profiles.role = 'editor')
        )
    );

-- Policy for DELETE
CREATE POLICY "Allow admins and editors to delete messages" ON public.live_chat_messages
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'admin' OR profiles.role = 'editor')
        )
    );
