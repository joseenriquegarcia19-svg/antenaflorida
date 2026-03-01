-- Create trigger function for editor comment notifications
CREATE OR REPLACE FUNCTION notify_editor_on_comment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if the team member has a profile and is an editor
  IF EXISTS (
    SELECT 1 
    FROM public.team_members tm
    JOIN public.profiles p ON p.id = tm.profile_id
    WHERE tm.id = NEW.team_member_id 
    AND p.role = 'editor'
  ) THEN
    -- Call the edge function to send notification
    PERFORM
      net.http_post(
        url := CONCAT(
          CASE 
            WHEN current_setting('app.environment', true) = 'production' 
            THEN 'https://your-project.supabase.co'
            ELSE 'http://localhost:54321'
          END,
          '/functions/v1/notify-editor-comment'
        ),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', CONCAT('Bearer ', current_setting('app.supabase_service_role_key', true))
        ),
        body := jsonb_build_object(
          'record', row_to_json(NEW)
        )
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on team_comments table
DROP TRIGGER IF EXISTS trigger_notify_editor_comment ON public.team_comments;
CREATE TRIGGER trigger_notify_editor_comment
  AFTER INSERT ON public.team_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_editor_on_comment();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA net TO anon, authenticated;
GRANT USAGE ON SCHEMA net TO service_role;
GRANT EXECUTE ON FUNCTION net.http_post TO anon, authenticated;
GRANT EXECUTE ON FUNCTION net.http_post TO service_role;