ALTER TABLE public.site_config
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS social_youtube text,
ADD COLUMN IF NOT EXISTS social_tiktok text,
ADD COLUMN IF NOT EXISTS social_whatsapp text;

DROP POLICY IF EXISTS "Admin update access for site_config" ON public.site_config;
CREATE POLICY "Admin update access for site_config" ON public.site_config
  FOR UPDATE
  USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.page_maintenance (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  route text UNIQUE NOT NULL,
  maintenance_enabled boolean NOT NULL DEFAULT false,
  maintenance_message text DEFAULT 'Estamos en mantenimiento. Vuelve pronto.',
  updated_at timestamptz DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.page_maintenance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for page_maintenance" ON public.page_maintenance;
CREATE POLICY "Public read access for page_maintenance" ON public.page_maintenance
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin insert access for page_maintenance" ON public.page_maintenance;
CREATE POLICY "Admin insert access for page_maintenance" ON public.page_maintenance
  FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin update access for page_maintenance" ON public.page_maintenance;
CREATE POLICY "Admin update access for page_maintenance" ON public.page_maintenance
  FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admin delete access for page_maintenance" ON public.page_maintenance;
CREATE POLICY "Admin delete access for page_maintenance" ON public.page_maintenance
  FOR DELETE
  USING (public.is_admin());

GRANT SELECT ON public.site_config TO anon;
GRANT ALL PRIVILEGES ON public.site_config TO authenticated;

GRANT SELECT ON public.page_maintenance TO anon;
GRANT ALL PRIVILEGES ON public.page_maintenance TO authenticated;

INSERT INTO public.page_maintenance (route)
SELECT v.route
FROM (
  VALUES
    ('/'),
    ('/schedule'),
    ('/search'),
    ('/podcasts/:id'),
    ('/news/:id'),
    ('/shows/:id'),
    ('/privacy'),
    ('/terms'),
    ('/faq'),
    ('/sitemap'),
    ('/login')
) AS v(route)
WHERE NOT EXISTS (
  SELECT 1 FROM public.page_maintenance pm WHERE pm.route = v.route
);

