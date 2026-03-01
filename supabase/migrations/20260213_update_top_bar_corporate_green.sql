-- Update Top Bar configuration to use Corporate Green (via CSS default)
-- We clear the specific background color if it matches the old default or is black, 
-- allowing the CSS gradient to take precedence.

UPDATE public.site_config 
SET top_bar_bg_color = NULL 
WHERE top_bar_bg_color = '#0f172a' OR top_bar_bg_color = '#000000';

-- Also clear text color if it's the standard white, to let CSS handle it
UPDATE public.site_config 
SET top_bar_text_color = NULL 
WHERE top_bar_text_color = '#ffffff';

-- Update the default for new rows (optional, but good practice)
ALTER TABLE public.site_config 
ALTER COLUMN top_bar_bg_color DROP DEFAULT,
ALTER COLUMN top_bar_text_color DROP DEFAULT;
