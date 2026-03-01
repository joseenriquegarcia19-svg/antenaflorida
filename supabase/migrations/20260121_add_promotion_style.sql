-- Add display_style column to promotions table
ALTER TABLE public.promotions 
ADD COLUMN IF NOT EXISTS display_style text DEFAULT 'cover';

-- Add check constraint for display_style
ALTER TABLE public.promotions 
ADD CONSTRAINT promotions_display_style_check CHECK (display_style IN ('cover', 'contain', 'tile'));
