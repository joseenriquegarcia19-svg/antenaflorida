-- Link profiles to team_members
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS team_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_team_member_id ON public.profiles(team_member_id);
