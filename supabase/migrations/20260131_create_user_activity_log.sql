-- Create user_activity_log table
CREATE TABLE IF NOT EXISTS public.user_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    description TEXT,
    ip_address TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- Allow admins to read all logs
CREATE POLICY "Admins can view all activity logs" 
ON public.user_activity_log 
FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'admin' OR profiles.super_admin = true)
    )
);

-- Allow authenticated users to insert logs (so they can log their own actions)
-- In a production app, you might want to do this via a secure RPC or trigger to avoid tampering,
-- but for this requirement, we'll allow insert.
CREATE POLICY "Authenticated users can insert activity logs" 
ON public.user_activity_log 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Create index for faster searching
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON public.user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_action_type ON public.user_activity_log(action_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_occurred_at ON public.user_activity_log(occurred_at);
