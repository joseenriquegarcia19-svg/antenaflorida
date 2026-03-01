-- Ensure slugify function exists (re-declaring just in case)
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
      '[^a-z0-9\\-_]+', '-', 'g' 
    ),
    '-+', '-', 'g' 
  )
  FROM "unaccented";
$$ LANGUAGE SQL STRICT IMMUTABLE;

-- 1. SHOWS
ALTER TABLE shows ADD COLUMN IF NOT EXISTS slug TEXT;
UPDATE shows SET slug = slugify(title) WHERE slug IS NULL;
ALTER TABLE shows ALTER COLUMN slug SET NOT NULL;
ALTER TABLE shows ADD CONSTRAINT shows_slug_key UNIQUE (slug);

CREATE OR REPLACE FUNCTION public.set_show_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := slugify(NEW.title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_show_slug
BEFORE INSERT OR UPDATE ON shows
FOR EACH ROW
EXECUTE FUNCTION public.set_show_slug();


-- 2. NEWS
ALTER TABLE news ADD COLUMN IF NOT EXISTS slug TEXT;
UPDATE news SET slug = slugify(title) WHERE slug IS NULL;
ALTER TABLE news ALTER COLUMN slug SET NOT NULL;
ALTER TABLE news ADD CONSTRAINT news_slug_key UNIQUE (slug);

CREATE OR REPLACE FUNCTION public.set_news_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := slugify(NEW.title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_news_slug
BEFORE INSERT OR UPDATE ON news
FOR EACH ROW
EXECUTE FUNCTION public.set_news_slug();


-- 3. PODCASTS
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS slug TEXT;
UPDATE podcasts SET slug = slugify(title) WHERE slug IS NULL;
ALTER TABLE podcasts ALTER COLUMN slug SET NOT NULL;
ALTER TABLE podcasts ADD CONSTRAINT podcasts_slug_key UNIQUE (slug);

CREATE OR REPLACE FUNCTION public.set_podcast_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := slugify(NEW.title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_podcast_slug
BEFORE INSERT OR UPDATE ON podcasts
FOR EACH ROW
EXECUTE FUNCTION public.set_podcast_slug();
