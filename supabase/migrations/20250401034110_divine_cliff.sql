/*
  # Fix Recursive Project Policies

  1. Changes
    - Remove all complex policy conditions that could cause recursion
    - Implement direct, non-recursive access checks
    - Optimize query performance with proper indexing
    - Separate reviewer access logic

  2. Security
    - Maintain RLS for projects table
    - Users can only access their own projects
    - Reviewers can access assigned projects
    - Prevent any potential policy loops
*/

-- First ensure we have the correct indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_project_reviewer 
ON reviews(project_id, reviewer_id);

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "projects_select_policy" ON "public"."projects";
DROP POLICY IF EXISTS "projects_insert_policy" ON "public"."projects";
DROP POLICY IF EXISTS "projects_update_policy" ON "public"."projects";
DROP POLICY IF EXISTS "projects_delete_policy" ON "public"."projects";

-- Create new optimized policies
CREATE POLICY "select_own_projects" ON "public"."projects"
FOR SELECT TO authenticated
USING (
  -- Direct ownership check
  user_id = auth.uid()
);

-- Separate policy for reviewer access to prevent recursion
CREATE POLICY "select_reviewing_projects" ON "public"."projects"
FOR SELECT TO authenticated
USING (
  -- Simple EXISTS check with proper index usage
  EXISTS (
    SELECT 1 
    FROM reviews 
    WHERE reviews.project_id = projects.id 
    AND reviews.reviewer_id = auth.uid()
    -- Limit to prevent unnecessary scanning
    LIMIT 1
  )
);

-- Simple insert policy
CREATE POLICY "insert_own_projects" ON "public"."projects"
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Simple update policy
CREATE POLICY "update_own_projects" ON "public"."projects"
FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Simple delete policy
CREATE POLICY "delete_own_projects" ON "public"."projects"
FOR DELETE TO authenticated
USING (user_id = auth.uid());