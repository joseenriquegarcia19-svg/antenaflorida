
-- Create site_config table
CREATE TABLE IF NOT EXISTS public.site_config (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    site_name TEXT DEFAULT 'Radio Tito',
    slogan TEXT DEFAULT 'La mejor radio del mundo',
    contact_email TEXT,
    contact_phone TEXT,
    contact_address TEXT,
    social_facebook TEXT,
    social_twitter TEXT,
    social_instagram TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Insert default config if not exists
INSERT INTO public.site_config (site_name, slogan, contact_email)
SELECT 'Radio Tito', 'La mejor radio del mundo', 'contacto@radiotito.com'
WHERE NOT EXISTS (SELECT 1 FROM public.site_config);

-- Enable RLS
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public read access for site_config" ON public.site_config
    FOR SELECT USING (true);

CREATE POLICY "Admin update access for site_config" ON public.site_config
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Ensure profiles are readable by authenticated users (for the user manager)
CREATE POLICY "Authenticated read access for profiles" ON public.profiles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update access for profiles" ON public.profiles
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated insert access for profiles" ON public.profiles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
