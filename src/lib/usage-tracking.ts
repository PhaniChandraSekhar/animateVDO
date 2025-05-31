import { supabase } from './supabase';

export interface UsageMetrics {
  service_type: 'research' | 'script' | 'characters' | 'audio' | 'video';
  project_id?: string;
  api_calls: number;
  tokens_used?: number;
  input_tokens?: number;
  output_tokens?: number;
  model_used?: string;
  duration_ms?: number;
  cost?: number;
  success: boolean;
  error_message?: string;
}

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

// Token counting utilities
export function estimateTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

export function parseOpenAIUsage(response: any): TokenUsage {
  const usage = response.usage || {};
  return {
    input_tokens: usage.prompt_tokens || 0,
    output_tokens: usage.completion_tokens || 0,
    total_tokens: usage.total_tokens || 0
  };
}

export function parseAnthropicUsage(response: any): TokenUsage {
  const usage = response.usage || {};
  return {
    input_tokens: usage.input_tokens || 0,
    output_tokens: usage.output_tokens || 0,
    total_tokens: (usage.input_tokens || 0) + (usage.output_tokens || 0)
  };
}

// Service-specific usage tracking
export const UsageTrackers = {
  research: async (data: {
    projectId: string;
    searchQueries: number;
    llmModel: string;
    tokenUsage: TokenUsage;
    duration: number;
    success: boolean;
    error?: string;
  }) => {
    const metrics: UsageMetrics = {
      service_type: 'research',
      project_id: data.projectId,
      api_calls: data.searchQueries + 1, // Searches + LLM call
      tokens_used: data.tokenUsage.total_tokens,
      input_tokens: data.tokenUsage.input_tokens,
      output_tokens: data.tokenUsage.output_tokens,
      model_used: data.llmModel,
      duration_ms: data.duration,
      success: data.success,
      error_message: data.error
    };
    
    // Calculate cost
    metrics.cost = await calculateServiceCost(metrics);
    
    return trackUsage(metrics);
  },

  script: async (data: {
    projectId: string;
    model: string;
    tokenUsage: TokenUsage;
    duration: number;
    success: boolean;
    error?: string;
  }) => {
    const metrics: UsageMetrics = {
      service_type: 'script',
      project_id: data.projectId,
      api_calls: 1,
      tokens_used: data.tokenUsage.total_tokens,
      input_tokens: data.tokenUsage.input_tokens,
      output_tokens: data.tokenUsage.output_tokens,
      model_used: data.model,
      duration_ms: data.duration,
      success: data.success,
      error_message: data.error
    };
    
    metrics.cost = await calculateServiceCost(metrics);
    return trackUsage(metrics);
  },

  characterDesign: async (data: {
    projectId: string;
    imageCount: number;
    model: string;
    duration: number;
    success: boolean;
    error?: string;
  }) => {
    const metrics: UsageMetrics = {
      service_type: 'characters',
      project_id: data.projectId,
      api_calls: data.imageCount,
      model_used: data.model,
      duration_ms: data.duration,
      success: data.success,
      error_message: data.error
    };
    
    metrics.cost = await calculateServiceCost(metrics);
    return trackUsage(metrics);
  },

  voiceSynthesis: async (data: {
    projectId: string;
    characterCount: number;
    voiceId: string;
    duration: number;
    success: boolean;
    error?: string;
  }) => {
    const metrics: UsageMetrics = {
      service_type: 'audio',
      project_id: data.projectId,
      api_calls: 1,
      tokens_used: data.characterCount, // Using tokens field for character count
      model_used: `elevenlabs-${data.voiceId}`,
      duration_ms: data.duration,
      success: data.success,
      error_message: data.error
    };
    
    metrics.cost = await calculateServiceCost(metrics);
    return trackUsage(metrics);
  },

  videoCompilation: async (data: {
    projectId: string;
    duration: number;
    success: boolean;
    error?: string;
  }) => {
    const metrics: UsageMetrics = {
      service_type: 'video',
      project_id: data.projectId,
      api_calls: 1,
      duration_ms: data.duration,
      success: data.success,
      error_message: data.error,
      cost: 0 // Video compilation is internal, no API cost
    };
    
    return trackUsage(metrics);
  }
};

// Calculate cost based on service type and usage
async function calculateServiceCost(metrics: UsageMetrics): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('calculate_usage_cost', {
      p_service_type: metrics.service_type,
      p_model_name: metrics.model_used || 'default',
      p_input_tokens: metrics.input_tokens || 0,
      p_output_tokens: metrics.output_tokens || 0,
      p_request_count: metrics.api_calls
    });

    if (error) {
      console.error('Error calculating cost:', error);
      return 0;
    }

    return Number(data) || 0;
  } catch (error) {
    console.error('Failed to calculate cost:', error);
    return 0;
  }
}

// Track usage in database
async function trackUsage(metrics: UsageMetrics): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('usage_metrics')
      .insert({
        user_id: user.id,
        project_id: metrics.project_id,
        service_type: metrics.service_type,
        api_calls: metrics.api_calls,
        tokens_used: metrics.tokens_used,
        input_tokens: metrics.input_tokens,
        output_tokens: metrics.output_tokens,
        model_used: metrics.model_used,
        duration_ms: metrics.duration_ms,
        cost: metrics.cost,
        success: metrics.success,
        error_message: metrics.error_message,
        timestamp: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to track usage:', error);
    }
  } catch (error) {
    console.error('Error tracking usage:', error);
  }
}

// Get user's usage summary
export async function getUserUsageSummary(
  userId: string,
  month?: Date
): Promise<any> {
  try {
    const targetMonth = month || new Date();
    
    const { data, error } = await supabase.rpc('get_monthly_usage_report', {
      p_user_id: userId,
      p_month: targetMonth.toISOString()
    });

    if (error) throw error;
    
    return {
      month: targetMonth,
      services: data || [],
      totalCost: data?.reduce((sum: number, item: any) => sum + (item.total_cost || 0), 0) || 0,
      totalCalls: data?.reduce((sum: number, item: any) => sum + (item.total_calls || 0), 0) || 0
    };
  } catch (error) {
    console.error('Error fetching usage summary:', error);
    return null;
  }
}

// Check if user is approaching limits
export async function checkUsageLimits(userId: string): Promise<{
  nearLimit: boolean;
  percentageUsed: number;
  message?: string;
}> {
  try {
    // Get user's plan
    const { data: userData } = await supabase
      .from('users')
      .select('subscription_plan')
      .eq('id', userId)
      .single();

    if (!userData) {
      return { nearLimit: false, percentageUsed: 0 };
    }

    // For hobby plan, check story count
    if (userData.subscription_plan === 'hobby') {
      const { data: storyCount } = await supabase
        .from('users')
        .select('monthly_story_count')
        .eq('id', userId)
        .single();

      const count = storyCount?.monthly_story_count || 0;
      const limit = 5;
      const percentage = (count / limit) * 100;

      return {
        nearLimit: percentage >= 80,
        percentageUsed: percentage,
        message: percentage >= 100 
          ? 'You have reached your monthly story limit'
          : percentage >= 80
          ? `You have ${limit - count} stories remaining this month`
          : undefined
      };
    }

    // For paid plans, could check token usage or cost thresholds
    return { nearLimit: false, percentageUsed: 0 };
  } catch (error) {
    console.error('Error checking usage limits:', error);
    return { nearLimit: false, percentageUsed: 0 };
  }
}

// Middleware to track API usage in edge functions
export function createUsageMiddleware(serviceType: UsageMetrics['service_type']) {
  return {
    start: () => {
      return {
        startTime: Date.now(),
        serviceType
      };
    },
    
    end: async (context: any, result: any, error?: any) => {
      const duration = Date.now() - context.startTime;
      
      // Extract metrics based on service type
      let metrics: any = {
        duration,
        success: !error,
        error: error?.message
      };
      
      // Service-specific metric extraction
      switch (serviceType) {
        case 'research':
          if (result?.tokenUsage) {
            metrics.tokenUsage = result.tokenUsage;
          }
          break;
        case 'script':
          if (result?.tokenUsage) {
            metrics.tokenUsage = result.tokenUsage;
          }
          break;
        // Add other services as needed
      }
      
      // Track the usage
      await UsageTrackers[serviceType](metrics);
    }
  };
}