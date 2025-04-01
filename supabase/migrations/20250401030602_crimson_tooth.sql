/*
  # Fix Project Policies Recursion

  1. Changes
    - Simplify project policies to prevent recursion
    - Optimize policy conditions
    - Ensure proper access control

  2. Security
    - Maintain RLS for projects table
    - Users can only access their own projects
    - Reviewers can access assigned projects
*/

-- First, drop all existing policies to start fresh
DROP POLICY IF EXISTS "enable_read_for_own_projects" ON "public"."projects";
DROP POLICY IF EXISTS "enable_insert_for_own_projects" ON "public"."projects";
DROP POLICY IF EXISTS "enable_update_for_own_projects" ON "public"."projects";
DROP POLICY IF EXISTS "enable_delete_for_own_projects" ON "public"."projects";

-- Create optimized policies that avoid recursion
CREATE POLICY "allow_select_own_and_reviewing" ON "public"."projects"
FOR SELECT TO authenticated
USING (
  CASE 
    WHEN auth.uid() = user_id THEN true
    WHEN EXISTS (
      SELECT 1 
      FROM reviews r 
      WHERE r.project_id = id 
      AND r.reviewer_id = auth.uid()
      LIMIT 1
    ) THEN true
    ELSE false
  END
);

CREATE POLICY "allow_insert_own" ON "public"."projects"
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "allow_update_own" ON "public"."projects"
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "allow_delete_own" ON "public"."projects"
FOR DELETE TO authenticated
USING (auth.uid() = user_id);