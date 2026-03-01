-- Add columns for Station Page configuration
ALTER TABLE site_config 
ADD COLUMN IF NOT EXISTS station_description text,
ADD COLUMN IF NOT EXISTS listening_platforms_live365 text,
ADD COLUMN IF NOT EXISTS listening_platforms_roku text,
ADD COLUMN IF NOT EXISTS listening_platforms_tunein text,
ADD COLUMN IF NOT EXISTS ceo_member_id uuid REFERENCES team_members(id);

-- Update the default station description with the provided text
UPDATE site_config 
SET station_description = 'Antena Florida es una estación de radio digital que transmite una programación variada con contenidos informativos, musicales y de opinión. Ofrece reportes actualizados del tiempo y el tráfico, acompañando a la comunidad con información útil, entretenimiento y análisis de la actualidad. Con una propuesta moderna y cercana, Antena Florida representa la nueva era de la radio, conectando a las audiencias a través de sus plataformas digitales con una señal dinámica, participativa y pensada para nuestra gente.'
WHERE station_description IS NULL;
