-- Create show_comments table
CREATE TABLE IF NOT EXISTS public.show_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    show_id UUID REFERENCES public.shows(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.show_comments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view approved comments" 
ON public.show_comments FOR SELECT 
USING (is_approved = true);

CREATE POLICY "Anyone can insert comments" 
ON public.show_comments FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can manage all comments" 
ON public.show_comments FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.role IN ('admin', 'editor') OR profiles.super_admin = true)
  )
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_show_comments_show_id ON public.show_comments(show_id);
CREATE INDEX IF NOT EXISTS idx_show_comments_approved ON public.show_comments(is_approved);
