-- Add duration_ms column to promotions table
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS duration_ms integer;

-- Set default to NULL (meaning it will use the global default)
COMMENT ON COLUMN promotions.duration_ms IS 'Duration in milliseconds for this specific promotion. If NULL, use global promotions_interval.';
