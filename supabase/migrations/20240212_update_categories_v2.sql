-- Handle the duplicate key issue:
-- If 'Política Internacional' exists AND 'Internacional' already exists, 
-- we can't just rename. We should delete 'Política Internacional' 
-- (since we will use the existing 'Internacional').

-- First, ensure all news pointing to 'Política Internacional' are moved to 'Internacional'
UPDATE news
SET category = REPLACE(category, 'Política Internacional', 'Internacional')
WHERE category LIKE '%Política Internacional%';

-- Now, safely remove 'Política Internacional' from categories if it exists
DELETE FROM news_categories 
WHERE name = 'Política Internacional';

-- Ensure 'Política' exists (insert if not present)
INSERT INTO news_categories (name)
SELECT 'Política'
WHERE NOT EXISTS (
    SELECT 1 FROM news_categories WHERE name = 'Política'
);

-- Ensure 'Internacional' exists (insert if not present, though likely is)
INSERT INTO news_categories (name)
SELECT 'Internacional'
WHERE NOT EXISTS (
    SELECT 1 FROM news_categories WHERE name = 'Internacional'
);
