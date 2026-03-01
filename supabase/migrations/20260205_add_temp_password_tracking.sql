-- Add temporary password tracking columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_temporary_password BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS temp_password_login_attempts INTEGER DEFAULT 0;

-- Function to increment login attempts (security definer to bypass RLS if needed, though users can edit their own profiles usually)
CREATE OR REPLACE FUNCTION increment_temp_password_attempts(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET temp_password_login_attempts = temp_password_login_attempts + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset temporary password status
CREATE OR REPLACE FUNCTION reset_temporary_password_status(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET is_temporary_password = FALSE,
      temp_password_login_attempts = 0
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
