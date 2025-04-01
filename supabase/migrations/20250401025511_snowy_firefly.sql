/*
  # Add insert policy for story_progress table

  1. Changes
    - Add RLS policy to allow authenticated users to insert rows into story_progress table
    - Policy ensures users can only create story progress for projects they own

  2. Security
    - Policy checks that the project_id being referenced belongs to the authenticated user
    - Maintains data isolation between users
*/

CREATE POLICY "Users can create story progress for own projects"
ON public.story_progress
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_id
    AND projects.user_id = auth.uid()
  )
);