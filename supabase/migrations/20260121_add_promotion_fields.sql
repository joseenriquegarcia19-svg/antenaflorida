-- Add location and media_type columns to promotions table
ALTER TABLE public.promotions 
ADD COLUMN IF NOT EXISTS location text DEFAULT 'home_banner',
ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'image';

-- Add check constraint for media_type to ensure valid values
ALTER TABLE public.promotions 
ADD CONSTRAINT promotions_media_type_check CHECK (media_type IN ('image', 'video'));
