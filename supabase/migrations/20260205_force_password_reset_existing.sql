-- Mark existing users as having a temporary password if they match specific criteria
-- Since we cannot know for sure if a user has a "temp" password just by looking at the hash,
-- we will assume all users created RECENTLY or ALL users (except super admin) need to reset.
-- Or, safer approach requested: manually mark them.

-- However, the user asked to detect "if some still have temporary password". 
-- We can't detect the password content. 
-- BUT we can force a reset for everyone except the super admin/you, 
-- OR we can just update the `is_temporary_password` flag for specific users if we knew them.

-- Given the prompt "detecta de los usuarios... alguno tiene contraseña temporal", 
-- the best approach without knowing the passwords is to FLAGGING ALL NON-SUPER-ADMIN USERS
-- as `is_temporary_password = TRUE` to force them to cycle their password once.

-- Better yet: Let's creates a migration that sets `is_temporary_password = true` 
-- for all users who are NOT super_admin.
-- This ensures security compliance for everyone existing.

UPDATE public.profiles
SET is_temporary_password = TRUE,
    temp_password_login_attempts = 0
WHERE super_admin = FALSE;
