-- Create news_drafts_queue table
CREATE TABLE IF NOT EXISTS public.news_drafts_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    prompt_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'error')),
    result_data JSONB,
    error_msg TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.news_drafts_queue ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own drafts"
    ON public.news_drafts_queue FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own drafts"
    ON public.news_drafts_queue FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drafts"
    ON public.news_drafts_queue FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drafts"
    ON public.news_drafts_queue FOR DELETE
    USING (auth.uid() = user_id);

-- Add index
CREATE INDEX IF NOT EXISTS news_drafts_queue_user_id_idx ON public.news_drafts_queue(user_id);
CREATE INDEX IF NOT EXISTS news_drafts_queue_status_idx ON public.news_drafts_queue(status);
