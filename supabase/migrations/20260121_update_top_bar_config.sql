-- Modify site_config to support multiple items in top bar
ALTER TABLE public.site_config 
ADD COLUMN IF NOT EXISTS top_bar_left_items text[] DEFAULT '{news}',
ADD COLUMN IF NOT EXISTS top_bar_right_items text[] DEFAULT '{time}',
ADD COLUMN IF NOT EXISTS top_bar_left_mode text DEFAULT 'sequence', -- sequence, random
ADD COLUMN IF NOT EXISTS top_bar_right_mode text DEFAULT 'sequence';

-- Migrate existing data (best effort)
UPDATE public.site_config 
SET 
  top_bar_left_items = ARRAY[top_bar_left_content],
  top_bar_right_items = ARRAY[top_bar_right_content]
WHERE top_bar_left_content IS NOT NULL AND top_bar_right_content IS NOT NULL;
