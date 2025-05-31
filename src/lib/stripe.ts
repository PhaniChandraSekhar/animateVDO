import { loadStripe, Stripe } from '@stripe/stripe-js';

// Initialize Stripe
let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    
    if (!publishableKey) {
      console.error('Stripe publishable key not found');
      return null;
    }
    
    stripePromise = loadStripe(publishableKey);
  }
  
  return stripePromise;
};

// Pricing configuration
export const PRICING_PLANS = {
  hobby: {
    id: 'hobby',
    name: 'Hobby',
    price: 0,
    priceId: null, // Free plan
    features: [
      '5 stories per month',
      'Basic characters',
      'Standard voices',
      '720p video export',
      'Community support'
    ],
    limits: {
      stories_per_month: 5,
      max_video_duration: 180, // 3 minutes
      resolution: '1280x720',
      priority_processing: false
    }
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 29,
    priceId: import.meta.env.VITE_STRIPE_PRO_PRICE_ID || 'price_pro_monthly',
    features: [
      'Unlimited stories',
      'Premium characters',
      'All voice options',
      '1080p video export',
      'Priority support',
      'Advanced analytics',
      'No watermark'
    ],
    limits: {
      stories_per_month: -1, // Unlimited
      max_video_duration: 600, // 10 minutes
      resolution: '1920x1080',
      priority_processing: true
    }
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    priceId: import.meta.env.VITE_STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_monthly',
    features: [
      'Everything in Pro',
      'Custom AI models',
      'API access',
      '4K video export',
      'Dedicated support',
      'Custom branding',
      'Team collaboration',
      'SLA guarantee'
    ],
    limits: {
      stories_per_month: -1, // Unlimited
      max_video_duration: 1800, // 30 minutes
      resolution: '3840x2160', // 4K
      priority_processing: true,
      custom_models: true,
      api_access: true
    }
  }
};

export type PlanId = keyof typeof PRICING_PLANS;

// Get user's current plan based on subscription
export function getUserPlan(subscription: any): PlanId {
  if (!subscription || subscription.status !== 'active') {
    return 'hobby';
  }
  
  const priceId = subscription.price_id;
  
  for (const [planId, plan] of Object.entries(PRICING_PLANS)) {
    if (plan.priceId === priceId) {
      return planId as PlanId;
    }
  }
  
  return 'hobby';
}

// Check if user can create more stories
export function canCreateStory(
  userPlan: PlanId,
  currentMonthStoryCount: number
): { allowed: boolean; reason?: string } {
  const plan = PRICING_PLANS[userPlan];
  const limit = plan.limits.stories_per_month;
  
  if (limit === -1) {
    return { allowed: true };
  }
  
  if (currentMonthStoryCount >= limit) {
    return {
      allowed: false,
      reason: `You've reached your monthly limit of ${limit} stories. Upgrade to create more!`
    };
  }
  
  return { allowed: true };
}

// Format price for display
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(amount);
}