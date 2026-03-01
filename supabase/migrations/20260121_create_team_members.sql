-- Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    role text NOT NULL, -- e.g. 'Locutor Principal', 'Productor', 'Técnico'
    bio text,
    image_url text,
    email text,
    social_links jsonb DEFAULT '{}'::jsonb, -- Store facebook, twitter, instagram urls
    display_order integer DEFAULT 0,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Create policies (public read, admin all)
CREATE POLICY "Public team read access" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "Admin team all access" ON public.team_members FOR ALL USING (true);
