-- Insert 3 default promotional banners
INSERT INTO public.promotions (title, image_url, link_url, active, display_order, location, media_type, display_style)
VALUES
(
    'Anuncia tu Marca Aquí',
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=2574&auto=format&fit=crop',
    '/contact',
    true,
    1,
    'home_banner',
    'image',
    'cover'
),
(
    'Lleva la música contigo',
    'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=2670&auto=format&fit=crop',
    '#',
    true,
    2,
    'home_banner',
    'image',
    'cover'
),
(
    'Apoyamos el Talento Local',
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=2670&auto=format&fit=crop',
    '/contact',
    true,
    3,
    'home_banner',
    'image',
    'cover'
);
