-- Add sidebar_content column to news table
ALTER TABLE news ADD COLUMN IF NOT EXISTS sidebar_content text;
