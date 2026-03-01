-- Create join table for reels and team members
CREATE TABLE IF NOT EXISTS public.reel_team_tags (
    reel_id UUID REFERENCES public.reels(id) ON DELETE CASCADE,
    team_member_id UUID REFERENCES public.team_members(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (reel_id, team_member_id)
);

-- Enable RLS
ALTER TABLE public.reel_team_tags ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access to reel_team_tags" ON public.reel_team_tags
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage reel_team_tags" ON public.reel_team_tags
    FOR ALL USING (auth.role() = 'authenticated');
