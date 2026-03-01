-- Rename column in site_config
ALTER TABLE site_config RENAME COLUMN social_twitter TO social_x;

-- Update JSONB keys in shows table
UPDATE shows 
SET social_links = social_links - 'twitter' || jsonb_build_object('x', social_links->'twitter')
WHERE social_links ? 'twitter';

-- Update JSONB keys in team_members table
UPDATE team_members 
SET social_links = social_links - 'twitter' || jsonb_build_object('x', social_links->'twitter')
WHERE social_links ? 'twitter';

-- Update JSONB keys in guests table
UPDATE guests 
SET social_links = social_links - 'twitter' || jsonb_build_object('x', social_links->'twitter')
WHERE social_links ? 'twitter';
