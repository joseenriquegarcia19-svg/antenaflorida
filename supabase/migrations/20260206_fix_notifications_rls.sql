-- Allow authenticated users to insert notifications
CREATE POLICY "Authenticated users can insert notifications" 
    ON public.notifications FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);
