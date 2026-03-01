ALTER TABLE site_config 
ADD COLUMN IF NOT EXISTS frequency_value text DEFAULT '104.2',
ADD COLUMN IF NOT EXISTS frequency_type text DEFAULT 'FM';
