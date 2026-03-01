
-- Update check constraint for media_type to include 'text'
ALTER TABLE public.promotions DROP CONSTRAINT IF EXISTS promotions_media_type_check;
ALTER TABLE public.promotions ADD CONSTRAINT promotions_media_type_check 
  CHECK (media_type IN ('image', 'video', 'text'));

-- Add columns for text styling
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS background_color text DEFAULT '#1e293b'; -- Slate-800 default
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS text_color text DEFAULT '#ffffff'; -- White default
