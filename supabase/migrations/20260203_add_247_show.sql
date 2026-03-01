-- Add default 24/7 show if it doesn't exist
-- This ensures it appears in the dashboard and is editable
INSERT INTO public.shows (
    title, 
    host, 
    time, 
    end_time, 
    image_url, 
    description, 
    is_24_7, 
    schedule_type, 
    stream_url
) 
SELECT 
    'Radio En Vivo', 
    'Música Continua', 
    '00:00', 
    '23:59', 
    '/og-image.png', 
    'La mejor programación musical las 24 horas.', 
    true, 
    'daily',
    'https://streaming.live365.com/a84668'
WHERE NOT EXISTS (
    SELECT 1 FROM public.shows WHERE is_24_7 = true
);
