-- Add Stripe fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none' CHECK (subscription_status IN ('none', 'active', 'canceled', 'past_due', 'trialing'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'hobby' CHECK (subscription_plan IN ('hobby', 'pro', 'enterprise'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_story_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS story_count_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create subscriptions table
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL,
  price_id TEXT NOT NULL,
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_invoice_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL, -- Amount in cents
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'pending')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_stripe_customer_id ON payments(stripe_customer_id);
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id);

-- RLS policies for subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions" ON subscriptions
  FOR SELECT
  USING (user_id = auth.uid());

-- RLS policies for payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments" ON payments
  FOR SELECT
  USING (user_id = auth.uid());

-- Function to reset monthly story count
CREATE OR REPLACE FUNCTION reset_monthly_story_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Reset count if it's a new month
  IF NEW.story_count_reset_at < date_trunc('month', NOW()) THEN
    NEW.monthly_story_count := 0;
    NEW.story_count_reset_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to reset monthly count
CREATE TRIGGER check_story_count_reset
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION reset_monthly_story_count();

-- Function to increment story count
CREATE OR REPLACE FUNCTION increment_story_count(user_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET 
    monthly_story_count = monthly_story_count + 1,
    updated_at = NOW()
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql;