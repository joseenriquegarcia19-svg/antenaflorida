-- Insert new promotion locations
INSERT INTO public.promotion_locations (name, code, description, active)
VALUES 
  ('Detalle Noticia (Arriba)', 'news_detail_top', 'Banner que aparece al inicio del detalle de una noticia', true),
  ('Categoría Noticias (Arriba)', 'category_top', 'Banner que aparece al inicio de las páginas de categorías de noticias', true)
ON CONFLICT (code) DO UPDATE 
SET active = true;
