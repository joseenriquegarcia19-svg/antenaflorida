
-- Create a junction table to tag team members in gallery images
CREATE TABLE IF NOT EXISTS public.gallery_team_tags (
  gallery_id UUID REFERENCES public.gallery(id) ON DELETE CASCADE,
  team_member_id UUID REFERENCES public.team_members(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (gallery_id, team_member_id)
);

-- Enable RLS
ALTER TABLE public.gallery_team_tags ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public read access for gallery tags"
  ON public.gallery_team_tags FOR SELECT
  USING (true);

CREATE POLICY "Admin/Editor full access for gallery tags"
  ON public.gallery_team_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.role = 'editor')
    )
  );
