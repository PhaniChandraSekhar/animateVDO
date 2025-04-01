/*
  # AnimateVDO Database Schema

  1. New Tables
    - `users` - Extended user profile information
    - `roles` - User roles (admin, reviewer, user)
    - `projects` - Story generation projects
    - `story_stages` - Detailed progress tracking for each stage
    - `reviews` - Content review system
    - `usage_metrics` - Track API usage and costs

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access
*/

-- Create enum types
CREATE TYPE project_status AS ENUM (
  'draft',
  'research',
  'scripting',
  'character_design',
  'audio',
  'video',
  'review',
  'complete'
);

CREATE TYPE user_role AS ENUM (
  'admin',
  'reviewer',
  'user'
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text UNIQUE NOT NULL,
  role user_role DEFAULT 'user'::user_role,
  full_name text,
  avatar_url text,
  usage_quota integer DEFAULT 10,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status project_status DEFAULT 'draft'::project_status,
  settings jsonb DEFAULT '{}'::jsonb,
  estimated_cost decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create story_stages table
CREATE TABLE IF NOT EXISTS story_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  stage text NOT NULL,
  content jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending',
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES users(id),
  stage text NOT NULL,
  status text DEFAULT 'pending',
  feedback text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create usage_metrics table
CREATE TABLE IF NOT EXISTS usage_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  api_name text NOT NULL,
  cost decimal(10,2) DEFAULT 0,
  tokens_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies

-- Users policies
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON users FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Projects policies
CREATE POLICY "Users can CRUD own projects"
  ON projects FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Reviewers can read assigned projects"
  ON projects FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM reviews 
    WHERE project_id = projects.id 
    AND reviewer_id = auth.uid()
  ));

-- Story stages policies
CREATE POLICY "Users can read own story stages"
  ON story_stages FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM projects 
    WHERE id = story_stages.project_id 
    AND user_id = auth.uid()
  ));

-- Reviews policies
CREATE POLICY "Users can read reviews for own projects"
  ON reviews FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM projects 
    WHERE id = reviews.project_id 
    AND user_id = auth.uid()
  ));

CREATE POLICY "Reviewers can CRUD own reviews"
  ON reviews FOR ALL
  TO authenticated
  USING (reviewer_id = auth.uid());

-- Usage metrics policies
CREATE POLICY "Users can read own usage metrics"
  ON usage_metrics FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all usage metrics"
  ON usage_metrics FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));