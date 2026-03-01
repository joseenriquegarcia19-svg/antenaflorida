-- Create admin_settings table for sensitive configurations
CREATE TABLE IF NOT EXISTS public.admin_settings (
    setting_key text PRIMARY KEY,
    setting_value text,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Only admins can view settings
CREATE POLICY "Admins can view admin_settings"
    ON public.admin_settings
    FOR SELECT
    USING (public.is_admin());

-- Only admins can insert/update settings
CREATE POLICY "Admins can insert admin_settings"
    ON public.admin_settings
    FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update admin_settings"
    ON public.admin_settings
    FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "Admins can delete admin_settings"
    ON public.admin_settings
    FOR DELETE
    USING (public.is_admin());

-- Insert default settings (empty values initially)
INSERT INTO public.admin_settings (setting_key, setting_value, description)
VALUES 
    ('openai_api_key', '', 'API Key de OpenAI para generación de contenido'),
    ('openai_model', 'gpt-4o', 'Modelo de IA a utilizar (ej: gpt-4o, gpt-3.5-turbo)'),
    ('news_prompt_system', 'Eres un periodista digital experto. Tu tarea es analizar las fuentes proporcionadas y redactar un artículo de noticias NUEVO y ÚNICO en español. No copies textualmente. Sintetiza la información, dale un tono profesional y atractivo para "Radio Wave". Usa formato HTML simple para el contenido (p, h2, ul, li, strong).', 'Prompt del sistema para la generación de noticias')
ON CONFLICT (setting_key) DO NOTHING;
