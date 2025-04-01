export type UserRole = 'admin' | 'reviewer' | 'user';

export type ProjectStatus = 
  | 'draft'
  | 'research'
  | 'scripting'
  | 'character_design'
  | 'audio'
  | 'video'
  | 'review'
  | 'complete';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string;
  avatar_url?: string;
  usage_quota: number;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: ProjectStatus;
  settings: Record<string, unknown>;
  estimated_cost: number;
  created_at: string;
  updated_at: string;
}

export interface StoryStage {
  id: string;
  project_id: string;
  stage: string;
  content: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  project_id: string;
  reviewer_id: string;
  stage: string;
  status: 'pending' | 'approved' | 'rejected';
  feedback?: string;
  created_at: string;
  updated_at: string;
}

export interface UsageMetric {
  id: string;
  user_id: string;
  project_id: string;
  api_name: string;
  cost: number;
  tokens_used: number;
  created_at: string;
}