/*
  # Fix Project Policies

  1. Changes
    - Remove redundant policies that cause infinite recursion
    - Simplify access control logic
    - Ensure proper policy naming and organization

  2. Security
    - Maintain RLS for projects table
    - Ensure users can only access their own projects
    - Allow reviewers to read assigned projects
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Reviewers can read assigned projects" ON "public"."projects";
DROP POLICY IF EXISTS "Users can CRUD own projects" ON "public"."projects";
DROP POLICY IF EXISTS "Users can create own projects" ON "public"."projects";
DROP POLICY IF EXISTS "Users can update own projects" ON "public"."projects";
DROP POLICY IF EXISTS "Users can view own projects" ON "public"."projects";

-- Create new, simplified policies
CREATE POLICY "enable_read_for_own_projects" ON "public"."projects"
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM reviews 
    WHERE reviews.project_id = projects.id 
    AND reviews.reviewer_id = auth.uid()
  )
);

CREATE POLICY "enable_insert_for_own_projects" ON "public"."projects"
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "enable_update_for_own_projects" ON "public"."projects"
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "enable_delete_for_own_projects" ON "public"."projects"
FOR DELETE TO authenticated
USING (user_id = auth.uid());