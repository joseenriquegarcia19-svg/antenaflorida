
-- Add allow_comments column to team_members table
ALTER TABLE public.team_members
ADD COLUMN IF NOT EXISTS allow_comments boolean DEFAULT true;
