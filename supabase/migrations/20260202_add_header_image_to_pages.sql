
-- Add header_image_url to page_maintenance table
ALTER TABLE public.page_maintenance 
ADD COLUMN IF NOT EXISTS header_image_url text;

-- Comment on column
COMMENT ON COLUMN public.page_maintenance.header_image_url IS 'URL for the header/featured image of the page';
