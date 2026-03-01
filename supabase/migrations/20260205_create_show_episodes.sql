-- Create show_episodes table for historical tracking and specific session details
CREATE TABLE IF NOT EXISTS public.show_episodes (
    id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    show_id uuid REFERENCES public.shows(id) ON DELETE CASCADE,
    scheduled_at timestamp with time zone NOT NULL,
    title text, -- Optional specific title for the episode
    description text, -- Specific summary of the session
    guests jsonb DEFAULT '[]'::jsonb, -- Array of {name, role, image_url, social_links}
    topics text[] DEFAULT '{}'::text[], -- Main topics discussed
    images text[] DEFAULT '{}'::text[], -- Gallery of images for this specific session
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.show_episodes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access for show_episodes" ON public.show_episodes
    FOR SELECT USING (true);

CREATE POLICY "Allow admin all access for show_episodes" ON public.show_episodes
    FOR ALL USING (
        auth.jwt() ->> 'email' IN (SELECT email FROM public.profiles WHERE role = 'admin')
    );

-- Add comment
COMMENT ON TABLE public.show_episodes IS 'Stores specific instances/episodes of a show with guests and topics';
