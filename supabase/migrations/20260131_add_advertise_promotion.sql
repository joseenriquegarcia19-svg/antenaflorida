
-- Add description column if it doesn't exist
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS description text;

-- Insert a default "Advertise Here" promotion if it doesn't exist
INSERT INTO public.promotions (
  title, 
  image_url, 
  link_url, 
  active, 
  display_order, 
  location, 
  media_type, 
  display_style,
  description
) 
SELECT 
  'Anúnciate con Nosotros',
  'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=2574&auto=format&fit=crop',
  '', -- Link will be handled dynamically or user can update it
  true,
  9999,
  'home_banner',
  'image',
  'cover',
  'Llega a miles de oyentes cada día'
WHERE NOT EXISTS (
  SELECT 1 FROM public.promotions WHERE title = 'Anúnciate con Nosotros'
);
