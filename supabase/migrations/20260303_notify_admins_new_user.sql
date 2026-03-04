-- Notify all administrators when a new user (profile) is created.
-- Runs after INSERT on profiles (signup or admin-created user).

CREATE OR REPLACE FUNCTION public.notify_admins_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
  display_name TEXT;
BEGIN
  -- Build display text for the new user (email + optional name)
  display_name := COALESCE(NULLIF(TRIM(NEW.full_name), ''), NEW.email);
  IF NEW.full_name IS NOT NULL AND TRIM(NEW.full_name) <> '' AND NEW.email IS NOT NULL THEN
    display_name := NEW.full_name || ' (' || NEW.email || ')';
  ELSIF NEW.email IS NOT NULL THEN
    display_name := NEW.email;
  END IF;

  -- Insert one notification per admin (excluding the new user if they are admin)
  FOR admin_record IN
    SELECT id FROM public.profiles
    WHERE role = 'admin' AND id <> NEW.id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link_url)
    VALUES (
      admin_record.id,
      'system',
      'Nuevo usuario registrado',
      'Se ha registrado un nuevo usuario: ' || display_name,
      '/admin/users'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger: after a new profile is inserted (from signup or admin-created user)
DROP TRIGGER IF EXISTS on_profile_created_notify_admins ON public.profiles;
CREATE TRIGGER on_profile_created_notify_admins
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_new_user();
