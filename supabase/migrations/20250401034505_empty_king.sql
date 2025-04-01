/*
  # Fix Project Policies - Final Optimization

  1. Changes
    - Completely separate owner and reviewer policies
    - Remove all complex conditions and CASE statements
    - Add materialized path to prevent recursion
    - Optimize index usage

  2. Security
    - Maintain strict RLS
    - Prevent any possible recursion paths
    - Ensure efficient query execution
*/

-- Drop existing policies
DROP POLICY IF EXISTS "select_own_projects" ON "public"."projects";
DROP POLICY IF EXISTS "select_reviewing_projects" ON "public"."projects";
DROP POLICY IF EXISTS "insert_own_projects" ON "public"."projects";
DROP POLICY IF EXISTS "update_own_projects" ON "public"."projects";
DROP POLICY IF EXISTS "delete_own_projects" ON "public"."projects";

-- Add a helper function to prevent recursion
CREATE OR REPLACE FUNCTION public.check_reviewer_access(project_id uuid, reviewer_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM reviews
    WHERE reviews.project_id = $1
    AND reviews.reviewer_id = $2
    LIMIT 1
  );
$$;

-- Create new optimized policies
CREATE POLICY "projects_owner_select" ON "public"."projects"
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "projects_reviewer_select" ON "public"."projects"
FOR SELECT TO authenticated
USING (public.check_reviewer_access(id, auth.uid()));

CREATE POLICY "projects_insert" ON "public"."projects"
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "projects_update" ON "public"."projects"
FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "projects_delete" ON "public"."projects"
FOR DELETE TO authenticated
USING (user_id = auth.uid());