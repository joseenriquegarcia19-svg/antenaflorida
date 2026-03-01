
-- Make image_url nullable to support text-only promotions
ALTER TABLE public.promotions ALTER COLUMN image_url DROP NOT NULL;
