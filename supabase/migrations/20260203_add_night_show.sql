-- Add default night show from 21:00 to 23:59
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
) VALUES (
    'Noche de Radio', 
    'Selección Nocturna', 
    '21:00', 
    '23:59', 
    '/og-image.png', 
    'La mejor compañía para cerrar tu día con música relajante y grandes éxitos.', 
    false, 
    'daily',
    'https://streaming.live365.com/a84668'
);
