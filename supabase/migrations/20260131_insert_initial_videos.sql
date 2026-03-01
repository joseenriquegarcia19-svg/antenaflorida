-- Insert initial videos for Antena Florida
INSERT INTO public.videos (title, url, thumbnail_url, duration, category, description, active)
VALUES 
(
  'Transmisión en Vivo - Antena Florida', 
  'https://www.youtube.com/watch?v=R9U0eD_r9Q8', 
  'https://img.youtube.com/vi/R9U0eD_r9Q8/maxresdefault.jpg', 
  'VIVO', 
  'En Vivo', 
  'Sintoniza nuestra señal en vivo con la mejor música y programación de Antena Florida.', 
  true
),
(
  'Entrevista Exclusiva - La Señal que nos Une', 
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 
  'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg', 
  '15:20', 
  'Entrevistas', 
  'Una charla profunda con invitados especiales sobre los temas que nos unen.', 
  true
);
