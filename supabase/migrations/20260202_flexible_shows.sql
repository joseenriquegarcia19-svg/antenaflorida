-- 1. Añadir columnas de programación a 'shows'
ALTER TABLE public.shows 
ADD COLUMN IF NOT EXISTS schedule_days integer[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS schedule_type text DEFAULT 'once'; -- 'daily', 'weekly', 'once'

-- 2. Crear tabla intermedia para Shows y Team Members (con roles)
CREATE TABLE IF NOT EXISTS public.show_team_members (
  show_id UUID REFERENCES public.shows(id) ON DELETE CASCADE,
  team_member_id UUID REFERENCES public.team_members(id) ON DELETE CASCADE,
  role_in_show text DEFAULT 'Locutor', -- 'Locutor', 'Editor', 'Productor', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (show_id, team_member_id)
);

-- Habilitar RLS
ALTER TABLE public.show_team_members ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Public show team members are viewable by everyone" 
ON public.show_team_members FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage show team members" 
ON public.show_team_members FOR ALL
USING (auth.role() = 'authenticated');
