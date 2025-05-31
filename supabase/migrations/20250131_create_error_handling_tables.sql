-- Create retry queue table for failed operations
CREATE TABLE retry_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  error_code TEXT,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Create error logs table for monitoring
CREATE TABLE error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  error_code TEXT NOT NULL,
  error_message TEXT NOT NULL,
  service TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  technical_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_retry_queue_status ON retry_queue(status);
CREATE INDEX idx_retry_queue_next_retry ON retry_queue(next_retry_at) WHERE status = 'pending';
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at);
CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX idx_error_logs_project_id ON error_logs(project_id);

-- RLS policies for retry_queue
ALTER TABLE retry_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own retry queue items" ON retry_queue
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = retry_queue.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- RLS policies for error_logs
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own error logs" ON error_logs
  FOR SELECT
  USING (user_id = auth.uid());