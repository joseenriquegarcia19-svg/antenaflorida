-- Add date column to shows table
ALTER TABLE public.shows ADD COLUMN date date;

-- Add index for date filtering
CREATE INDEX idx_shows_date ON public.shows(date);
