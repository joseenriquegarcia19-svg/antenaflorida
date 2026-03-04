-- Transmisiones en vivo temporales (YouTube, Facebook, TikTok, X, etc.)
-- Cuando finaliza el en vivo se marca como terminada y deja de mostrarse.
CREATE TABLE IF NOT EXISTS public.temporary_lives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id uuid REFERENCES public.shows(id) ON DELETE SET NULL,
  title text NOT NULL,
  url text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('youtube', 'facebook', 'tiktok', 'x', 'other')),
  starts_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  is_ended boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.temporary_lives IS 'Transmisiones en vivo temporales; al marcar is_ended o pasar ends_at dejan de mostrarse.';
COMMENT ON COLUMN public.temporary_lives.show_id IS 'Si es NULL, se muestra para cualquier programa en vivo. Si tiene valor, solo cuando ese programa está al aire.';

ALTER TABLE public.temporary_lives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active temporary_lives"
  ON public.temporary_lives FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can manage temporary_lives"
  ON public.temporary_lives FOR ALL
  USING (auth.role() = 'authenticated');

CREATE INDEX idx_temporary_lives_show_ends ON public.temporary_lives(show_id, ends_at) WHERE is_ended = false;
CREATE INDEX idx_temporary_lives_active ON public.temporary_lives(ends_at, is_ended) WHERE is_ended = false;
