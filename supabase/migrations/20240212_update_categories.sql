-- Rename 'Política Internacional' to 'Internacional' if it exists
UPDATE news_categories 
SET name = 'Internacional' 
WHERE name = 'Política Internacional';

-- Ensure 'Política' category exists
INSERT INTO news_categories (name)
SELECT 'Política'
WHERE NOT EXISTS (
    SELECT 1 FROM news_categories WHERE name = 'Política'
);

-- Update existing news items that might have 'Política Internacional' as category
-- This assumes the 'news' table has a 'category' column which is text or array
-- If category is stored as a string "Política Internacional", change it to "Internacional"
-- If it's a comma separated string, handle accordingly (simplest approach first)

UPDATE news
SET category = REPLACE(category, 'Política Internacional', 'Internacional')
WHERE category LIKE '%Política Internacional%';
