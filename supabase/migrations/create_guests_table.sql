-- Create guests table
CREATE TABLE IF NOT EXISTS public.guests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT,
    image_url TEXT,
    bio TEXT,
    social_links JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    active BOOLEAN DEFAULT true
);

-- Add RLS policies
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on guests" ON public.guests
    FOR SELECT USING (true);

CREATE POLICY "Allow admin all access on guests" ON public.guests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
