/*
  # Fix users table policies with simplified approach

  1. Changes
    - Drop existing policies
    - Add simplified policies for user access
    - Avoid complex functions and recursive checks

  2. Security
    - Enable RLS on users table
    - Add policies for:
      - Users can read own profile
      - Users with admin role can read all profiles
      - Users can update own profile
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON "public"."users";
DROP POLICY IF EXISTS "Admins can read all profiles" ON "public"."users";
DROP POLICY IF EXISTS "Users can update own profile" ON "public"."users";

-- Create simplified policies
CREATE POLICY "Users can read own profile"
ON "public"."users"
FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins can read all profiles"
ON "public"."users"
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'admin'::user_role
    LIMIT 1
  )
);

CREATE POLICY "Users can update own profile"
ON "public"."users"
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());