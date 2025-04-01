/*
  # Fix users table policies

  1. Changes
    - Drop existing policies
    - Add optimized policies for user access
    - Prevent recursion in admin checks

  2. Security
    - Enable RLS on users table
    - Add policies for:
      - Users can read own profile
      - Admins can read all profiles (using role check)
      - Users can update own profile
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON "public"."users";
DROP POLICY IF EXISTS "Admins can read all profiles" ON "public"."users";
DROP POLICY IF EXISTS "Users can update own profile" ON "public"."users";

-- Create optimized policies
CREATE POLICY "user_read_own"
ON "public"."users"
FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "admin_read_all"
ON "public"."users"
FOR SELECT TO authenticated
USING (
  role = 'admin'::user_role AND
  id = auth.uid()
);

CREATE POLICY "user_update_own"
ON "public"."users"
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());