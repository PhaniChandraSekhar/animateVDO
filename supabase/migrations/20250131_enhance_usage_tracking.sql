-- Enhance usage_metrics table
ALTER TABLE usage_metrics 
ADD COLUMN IF NOT EXISTS service_type TEXT CHECK (service_type IN ('research', 'script', 'characters', 'audio', 'video')),
ADD COLUMN IF NOT EXISTS model_used TEXT,
ADD COLUMN IF NOT EXISTS input_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS output_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS duration_ms INTEGER,
ADD COLUMN IF NOT EXISTS success BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Create usage_summary view for analytics
CREATE OR REPLACE VIEW usage_summary AS
SELECT 
  u.id as user_id,
  u.email,
  u.subscription_plan,
  DATE_TRUNC('month', um.created_at) as month,
  um.service_type,
  COUNT(*) as api_calls,
  SUM(um.tokens_used) as total_tokens,
  SUM(um.cost) as total_cost,
  COUNT(CASE WHEN um.success = true THEN 1 END) as successful_calls,
  COUNT(CASE WHEN um.success = false THEN 1 END) as failed_calls
FROM users u
LEFT JOIN usage_metrics um ON u.id = um.user_id
GROUP BY u.id, u.email, u.subscription_plan, DATE_TRUNC('month', um.created_at), um.service_type;

-- Create cost_tracking table for service pricing
CREATE TABLE IF NOT EXISTS cost_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_type TEXT NOT NULL,
  model_name TEXT NOT NULL,
  input_token_cost DECIMAL(10, 6) NOT NULL, -- Cost per 1K tokens
  output_token_cost DECIMAL(10, 6) NOT NULL, -- Cost per 1K tokens
  request_cost DECIMAL(10, 6) DEFAULT 0, -- Fixed cost per request
  effective_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default pricing (example rates)
INSERT INTO cost_tracking (service_type, model_name, input_token_cost, output_token_cost, request_cost) VALUES
-- OpenAI pricing
('research', 'gpt-3.5-turbo', 0.0005, 0.0015, 0),
('script', 'gpt-4-turbo', 0.01, 0.03, 0),
('characters', 'dall-e-3', 0, 0, 0.04), -- $0.04 per image
-- Anthropic pricing
('research', 'claude-3-haiku', 0.00025, 0.00125, 0),
('script', 'claude-3-sonnet', 0.003, 0.015, 0),
-- ElevenLabs pricing (per character)
('audio', 'elevenlabs-standard', 0, 0, 0.00018), -- $0.18 per 1K characters
-- Web search pricing
('research', 'tavily-search', 0, 0, 0.001), -- $0.001 per search
('research', 'serper-search', 0, 0, 0.005); -- $0.005 per search

-- Create function to calculate usage cost
CREATE OR REPLACE FUNCTION calculate_usage_cost(
  p_service_type TEXT,
  p_model_name TEXT,
  p_input_tokens INTEGER,
  p_output_tokens INTEGER,
  p_request_count INTEGER DEFAULT 1
) RETURNS DECIMAL AS $$
DECLARE
  v_cost DECIMAL;
  v_pricing RECORD;
BEGIN
  -- Get the latest pricing for the service and model
  SELECT * INTO v_pricing
  FROM cost_tracking
  WHERE service_type = p_service_type 
    AND model_name = p_model_name
  ORDER BY effective_date DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Calculate cost
  v_cost := (p_input_tokens::DECIMAL / 1000 * v_pricing.input_token_cost) +
            (p_output_tokens::DECIMAL / 1000 * v_pricing.output_token_cost) +
            (p_request_count * v_pricing.request_cost);
  
  RETURN v_cost;
END;
$$ LANGUAGE plpgsql;

-- Create monthly usage report function
CREATE OR REPLACE FUNCTION get_monthly_usage_report(p_user_id UUID, p_month DATE)
RETURNS TABLE (
  service_type TEXT,
  total_calls INTEGER,
  total_tokens INTEGER,
  total_cost DECIMAL,
  success_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    um.service_type,
    COUNT(*)::INTEGER as total_calls,
    COALESCE(SUM(um.tokens_used), 0)::INTEGER as total_tokens,
    COALESCE(SUM(um.cost), 0)::DECIMAL as total_cost,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (COUNT(CASE WHEN um.success = true THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL * 100)
      ELSE 0 
    END as success_rate
  FROM usage_metrics um
  WHERE um.user_id = p_user_id
    AND DATE_TRUNC('month', um.created_at) = DATE_TRUNC('month', p_month)
  GROUP BY um.service_type
  ORDER BY total_cost DESC;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_usage_metrics_service_type ON usage_metrics(service_type);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_created_at ON usage_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_cost_tracking_lookup ON cost_tracking(service_type, model_name, effective_date DESC);