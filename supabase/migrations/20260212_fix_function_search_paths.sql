-- Fix Function Search Path Mutable warnings by setting search_path = ''
-- This ensures that functions are executed with a secure search path, preventing potential hijacking.

-- 1. slugify
CREATE OR REPLACE FUNCTION public.slugify("value" TEXT)
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
$$ LANGUAGE SQL STRICT IMMUTABLE SET search_path = '';

-- 2. set_team_member_slug
CREATE OR REPLACE FUNCTION public.set_team_member_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.slugify(NEW.name);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- 3. set_show_slug
CREATE OR REPLACE FUNCTION public.set_show_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.slugify(NEW.title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- 4. set_news_slug
CREATE OR REPLACE FUNCTION public.set_news_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.slugify(NEW.title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- 5. set_podcast_slug
CREATE OR REPLACE FUNCTION public.set_podcast_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.slugify(NEW.title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- 6. increment_temp_password_attempts
CREATE OR REPLACE FUNCTION public.increment_temp_password_attempts(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET temp_password_login_attempts = temp_password_login_attempts + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 7. reset_temporary_password_status
CREATE OR REPLACE FUNCTION public.reset_temporary_password_status(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET is_temporary_password = FALSE,
      temp_password_login_attempts = 0
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 8. normalize_country
CREATE OR REPLACE FUNCTION public.normalize_country(p_country text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  if p_country is null or p_country = '' or lower(p_country) in ('unknown', 'desconocido', 'no detectado') then
    return 'Desconocido';
  end if;

  return case lower(p_country)
    when 'united states' then 'Estados Unidos'
    when 'usa' then 'Estados Unidos'
    when 'us' then 'Estados Unidos'
    when 'united states of america' then 'Estados Unidos'
    when 'cuba' then 'Cuba'
    when 'spain' then 'España'
    when 'mexico' then 'México'
    when 'colombia' then 'Colombia'
    when 'argentina' then 'Argentina'
    when 'chile' then 'Chile'
    when 'venezuela' then 'Venezuela'
    when 'ecuador' then 'Ecuador'
    when 'peru' then 'Perú'
    when 'dominican republic' then 'República Dominicana'
    when 'puerto rico' then 'Puerto Rico'
    when 'panama' then 'Panamá'
    when 'costa rica' then 'Costa Rica'
    when 'guatemala' then 'Guatemala'
    when 'honduras' then 'Honduras'
    when 'el salvador' then 'El Salvador'
    when 'nicaragua' then 'Nicaragua'
    when 'uruguay' then 'Uruguay'
    when 'paraguay' then 'Paraguay'
    when 'bolivia' then 'Bolivia'
    when 'brazil' then 'Brasil'
    when 'france' then 'Francia'
    when 'italy' then 'Italia'
    when 'germany' then 'Alemania'
    when 'united kingdom' then 'Reino Unido'
    when 'canada' then 'Canadá'
    else p_country
  end;
END;
$$;

-- 9. handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    new.id, 
    new.email, 
    CASE 
      WHEN new.email = 'admin@radiotito.com' THEN 'admin'
      ELSE 'user'
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
