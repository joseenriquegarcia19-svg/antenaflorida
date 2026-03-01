ALTER TABLE site_config 
DROP CONSTRAINT IF EXISTS site_config_top_bar_left_content_check;

ALTER TABLE site_config 
DROP CONSTRAINT IF EXISTS site_config_top_bar_right_content_check;

ALTER TABLE site_config 
ADD CONSTRAINT site_config_top_bar_left_content_check 
CHECK (top_bar_left_content = ANY (ARRAY['news', 'podcasts', 'stations', 'time', 'none', 'shows', 'team']));

ALTER TABLE site_config 
ADD CONSTRAINT site_config_top_bar_right_content_check 
CHECK (top_bar_right_content = ANY (ARRAY['news', 'podcasts', 'stations', 'time', 'none', 'shows', 'team']));
