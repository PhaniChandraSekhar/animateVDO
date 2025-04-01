/*
  # Fix Project Policies

  1. Changes
    - Remove complex policy conditions that may cause recursion
    - Simplify access control logic
    - Optimize query performance

  2. Security
    - Maintain RLS for projects table
    - Users can only access their own projects
    - Reviewers can access projects they are reviewing
*/

-- Drop existing policies
DROP POLICY IF EXISTS "allow_select_own_and_reviewing" ON "public"."projects";
DROP POLICY IF EXISTS "allow_insert_own" ON "public"."projects";
DROP POLICY IF EXISTS "allow_update_own" ON "public"."projects";
DROP POLICY IF EXISTS "allow_delete_own" ON "public"."projects";

-- Create simplified policies
CREATE POLICY "projects_select_policy" ON "public"."projects"
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 
    FROM reviews 
    WHERE project_id = projects.id 
    AND reviewer_id = auth.uid()
  )
);

CREATE POLICY "projects_insert_policy" ON "public"."projects"
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "projects_update_policy" ON "public"."projects"
FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "projects_delete_policy" ON "public"."projects"
FOR DELETE TO authenticated
USING (user_id = auth.uid());