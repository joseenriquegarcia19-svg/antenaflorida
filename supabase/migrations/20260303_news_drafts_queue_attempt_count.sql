-- Add attempt_count to news_drafts_queue so the dashboard can show progress
ALTER TABLE public.news_drafts_queue
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 0 NOT NULL;

COMMENT ON COLUMN public.news_drafts_queue.attempt_count IS 'Number of processing attempts (updated by agent-news-queue edge function).';
