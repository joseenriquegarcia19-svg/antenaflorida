ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS style_config jsonb;
ALTER TABLE public.promotions DROP CONSTRAINT IF EXISTS promotions_display_style_check;
ALTER TABLE public.promotions ADD CONSTRAINT promotions_display_style_check CHECK (display_style IN ('cover', 'contain', 'tile', 'normal', 'free', 'gradient', 'minimalist', 'flashy'));
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS description text;
