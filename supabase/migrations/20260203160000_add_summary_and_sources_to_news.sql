ALTER TABLE public.news
ADD COLUMN IF NOT EXISTS summary text,
ADD COLUMN IF NOT EXISTS sources text;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.news TO authenticated;
GRANT SELECT ON public.news TO anon;
