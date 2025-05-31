interface UsageMetrics {
  user_id: string;
  project_id?: string;
  service_type: string;
  api_calls: number;
  tokens_used?: number;
  input_tokens?: number;
  output_tokens?: number;
  model_used?: string;
  duration_ms: number;
  cost?: number;
  success: boolean;
  error_message?: string;
}

export class UsageTracker {
  private supabase: any;
  private startTime: number;
  private serviceType: string;

  constructor(supabase: any, serviceType: string) {
    this.supabase = supabase;
    this.serviceType = serviceType;
    this.startTime = Date.now();
  }

  async track(metrics: Partial<UsageMetrics>): Promise<void> {
    try {
      const duration = Date.now() - this.startTime;
      
      const usageRecord = {
        service_type: this.serviceType,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
        ...metrics
      };

      const { error } = await this.supabase
        .from('usage_metrics')
        .insert(usageRecord);

      if (error) {
        console.error('Failed to track usage:', error);
      }
    } catch (error) {
      console.error('Error tracking usage:', error);
    }
  }

  static countTokens(text: string): number {
    // Simple token estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  static parseOpenAIUsage(response: any) {
    const usage = response.usage || {};
    return {
      input_tokens: usage.prompt_tokens || 0,
      output_tokens: usage.completion_tokens || 0,
      total_tokens: usage.total_tokens || 0
    };
  }

  static parseAnthropicUsage(response: any) {
    const usage = response.usage || {};
    return {
      input_tokens: usage.input_tokens || 0,
      output_tokens: usage.output_tokens || 0,
      total_tokens: (usage.input_tokens || 0) + (usage.output_tokens || 0)
    };
  }
}