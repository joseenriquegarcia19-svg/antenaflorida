-- Allow inserting authentication failure logs without authentication
-- This is needed to track failed login/signup attempts for security monitoring
-- Drop the restrictive insert policy
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON public.user_activity_log;
-- Create a new policy that allows:
-- 1. Authenticated users to insert logs with their own user_id
-- 2. Anonymous users to insert logs with NULL user_id (for failed auth attempts)
CREATE POLICY "Allow activity log inserts" ON public.user_activity_log FOR
INSERT WITH CHECK (
        -- If user is authenticated, they can only insert logs with their own user_id
        (
            auth.uid() IS NOT NULL
            AND auth.uid() = user_id
        )
        OR -- If user is NOT authenticated, they can only insert logs with NULL user_id (failed auth attempts)
        (
            auth.uid() IS NULL
            AND user_id IS NULL
        )
    );