-- Add permissions column if not exists (already exists in previous checks but making sure)
-- Add super_admin boolean column to identify the main admin
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS super_admin boolean DEFAULT false;

-- Ensure permissions column exists and is jsonb
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'permissions') THEN
        ALTER TABLE profiles ADD COLUMN permissions jsonb DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Update the first admin to be super_admin (or specific email if known, here assuming current user context or first admin)
-- For safety, we will let the UI handle specific assignment or manual SQL, 
-- but let's set a rule that cannot delete super_admin.

-- Policy to prevent deleting super_admin
CREATE POLICY "Prevent super_admin deletion" ON profiles
AS RESTRICTIVE
FOR DELETE
USING (super_admin = false);
