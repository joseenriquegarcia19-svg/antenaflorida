-- Create live_chat_messages table
CREATE TABLE IF NOT EXISTS public.live_chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    show_id TEXT NOT NULL, -- ID of the current program or 'live'
    user_id UUID REFERENCES auth.users(id), -- Null for guests
    user_name TEXT NOT NULL,
    message TEXT NOT NULL,
    reactions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read messages
CREATE POLICY "Allow public read access" ON public.live_chat_messages
    FOR SELECT USING (true);

-- Allow anyone to insert (including guests)
CREATE POLICY "Allow public insert access" ON public.live_chat_messages
    FOR INSERT WITH CHECK (true);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_chat_show_time ON public.live_chat_messages(show_id, created_at);
