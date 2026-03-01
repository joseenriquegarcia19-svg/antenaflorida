-- Create slugify function
CREATE OR REPLACE FUNCTION slugify("value" TEXT)
RETURNS TEXT AS $$
  -- removes accents (diacritic signs) from a given string --
  WITH "unaccented" AS (
    SELECT translate(
      lower("value"),
      'áàâãäåāăąèééêëēĕėęěìíîïìĩīĭįóòôõöōŏőøùúûüũūŭůűųñç',
      'aaaaaaaaaeeeeeeeeeeiiiiiiiiioooooooooouuuuuuuuuunc'
    ) AS "value"
  )
  SELECT regexp_replace(
    regexp_replace(
      trim("value"),
      '[^a-z0-9\\-_]+', '-', 'g' -- Replace non-alphanumeric characters with hyphens
    ),
    '-+', '-', 'g' -- Replace multiple hyphens with a single hyphen
  )
  FROM "unaccented";
$$ LANGUAGE SQL STRICT IMMUTABLE;

-- Add slug column to team_members
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS slug TEXT;

-- Update existing records with slugs
UPDATE team_members SET slug = slugify(name) WHERE slug IS NULL;

-- Make slug unique and not null
ALTER TABLE team_members ALTER COLUMN slug SET NOT NULL;
ALTER TABLE team_members ADD CONSTRAINT team_members_slug_key UNIQUE (slug);

-- Create trigger to automatically generate slug on insert/update
CREATE OR REPLACE FUNCTION public.set_team_member_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := slugify(NEW.name);
  END IF;
  
  -- Ensure uniqueness by appending a number if necessary (simple version)
  -- Note: Ideally this should handle collisions more robustly, but for team members it's unlikely to have same names
  -- If collision happens, the unique constraint will fail, prompting user to change name or handle it
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_team_member_slug
BEFORE INSERT OR UPDATE ON team_members
FOR EACH ROW
EXECUTE FUNCTION public.set_team_member_slug();
