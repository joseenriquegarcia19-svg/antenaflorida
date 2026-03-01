ALTER TABLE public.page_maintenance ADD COLUMN IF NOT EXISTS gallery_images text[] DEFAULT '{}';
ALTER TABLE public.page_maintenance ADD COLUMN IF NOT EXISTS contact_whatsapp text;
ALTER TABLE public.page_maintenance ADD COLUMN IF NOT EXISTS header_mode text DEFAULT 'image';
