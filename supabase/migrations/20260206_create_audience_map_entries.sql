-- Create audience_map_entries table
CREATE TABLE IF NOT EXISTS public.audience_map_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_name TEXT NOT NULL,
    country_code TEXT NOT NULL, -- ISO 2-letter code for flags
    listeners_count INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.audience_map_entries ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read access" ON public.audience_map_entries
    FOR SELECT USING (true);

CREATE POLICY "Admin full access" ON public.audience_map_entries
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role IN ('admin', 'editor', 'super_admin')
        )
    );
