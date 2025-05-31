-- Create storage bucket for project assets
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'project-assets',
  'project-assets',
  true,
  false,
  52428800, -- 50MB limit
  ARRAY['audio/mpeg', 'audio/wav', 'audio/mp3', 'image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
);

-- Create RLS policies for project-assets bucket
CREATE POLICY "Users can upload their own project assets" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'project-assets' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own project assets" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'project-assets' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own project assets" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'project-assets' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Public access to project assets" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'project-assets');