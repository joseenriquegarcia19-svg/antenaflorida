-- 1. Añadir columna 'country' a 'team_members'
ALTER TABLE public.team_members 
ADD COLUMN IF NOT EXISTS country text;

-- 2. Añadir relación de Shows a Team Members
ALTER TABLE public.shows 
ADD COLUMN IF NOT EXISTS team_member_id UUID REFERENCES public.team_members(id);

-- 3. Crear tabla intermedia para Videos y Team Members
CREATE TABLE IF NOT EXISTS public.video_team_tags (
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
  team_member_id UUID REFERENCES public.team_members(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (video_id, team_member_id)
);

-- Habilitar RLS para video_team_tags
ALTER TABLE public.video_team_tags ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para video_team_tags (Público puede leer, Solo autenticados pueden editar)
CREATE POLICY "Public videos tags are viewable by everyone" 
ON public.video_team_tags FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert video tags" 
ON public.video_team_tags FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete video tags" 
ON public.video_team_tags FOR DELETE 
USING (auth.role() = 'authenticated');
