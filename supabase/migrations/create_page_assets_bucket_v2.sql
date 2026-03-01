-- Create storage bucket for page assets if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('page-assets', 'page-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Drop policies if they exist to avoid conflicts (using specific names)
DROP POLICY IF EXISTS "Public Access page-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload page-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update page-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete page-assets" ON storage.objects;

-- Policy to allow public read access to page-assets
CREATE POLICY "Public Access page-assets"
ON storage.objects FOR SELECT
USING ( bucket_id = 'page-assets' );

-- Policy to allow authenticated users to upload to page-assets
CREATE POLICY "Authenticated users can upload page-assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'page-assets' );

-- Policy to allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update page-assets"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'page-assets' );

-- Policy to allow authenticated users to delete
CREATE POLICY "Authenticated users can delete page-assets"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'page-assets' );
