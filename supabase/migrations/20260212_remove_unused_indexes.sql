-- Remove unused indexes to improve write performance
-- These indexes have been identified as unused by Supabase Database Advisor

-- 1. Remove unused index on public.notifications
DROP INDEX IF EXISTS public.notifications_is_read_idx;

-- 2. Remove unused index on public.profiles
DROP INDEX IF EXISTS public.idx_profiles_team_member_id;

-- 3. Remove unused indexes on public.analytics_events
DROP INDEX IF EXISTS public.analytics_events_path_idx;
DROP INDEX IF EXISTS public.analytics_events_properties_gin_idx;

-- 4. Remove unused indexes on public.analytics_audit_logs
DROP INDEX IF EXISTS public.analytics_audit_logs_occurred_at_idx;
DROP INDEX IF EXISTS public.analytics_audit_logs_user_id_idx;

-- 5. Remove unused indexes on public.show_comments
DROP INDEX IF EXISTS public.idx_show_comments_approved;
DROP INDEX IF EXISTS public.idx_show_comments_user_id;

-- 6. Remove unused index on public.news_comments
DROP INDEX IF EXISTS public.news_comments_parent_id_idx;
