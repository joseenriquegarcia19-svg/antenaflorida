-- Update user_activity_log to reference profiles instead of auth.users for better joining
ALTER TABLE public.user_activity_log 
DROP CONSTRAINT IF EXISTS user_activity_log_user_id_fkey;

ALTER TABLE public.user_activity_log
ADD CONSTRAINT user_activity_log_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) 
ON DELETE SET NULL;

-- Ensure RLS allows the join
-- (Profiles are already public read, so it should be fine)
