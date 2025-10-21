-- Increase storage bucket size limit for larger video files
-- Standard videos can be 100-200MB depending on length and quality
UPDATE storage.buckets
SET file_size_limit = 524288000 -- 500MB limit for video files
WHERE id = 'project-assets';
