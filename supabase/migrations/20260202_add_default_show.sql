-- Insert default 24/7 program if it doesn't exist
INSERT INTO public.shows (title, host, time, image_url, description, is_24_7)
SELECT 'Antena Florida en Vivo', 'Antena Florida', '00:00', '/og-image.png', 'Transmisión ininterrumpida de la mejor música y noticias.', true
WHERE NOT EXISTS (
    SELECT 1 FROM public.shows WHERE title = 'Antena Florida en Vivo'
);
