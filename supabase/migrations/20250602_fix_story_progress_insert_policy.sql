-- Add missing INSERT policy for story_progress table
CREATE POLICY "Users can insert own story progress"
  ON story_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = story_progress.project_id
      AND projects.user_id = auth.uid()
    )
  );