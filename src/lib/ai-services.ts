// AI Service Configuration and Utilities

import { 
  AIServiceError, 
  ErrorHandlers, 
  retryWithBackoff, 
  RecoveryStrategies,
  reportError 
} from './error-handling';

export interface AIServiceConfig {
  research: {
    enabled: boolean;
    endpoint: string;
  };
  script: {
    enabled: boolean;
    endpoint: string;
  };
  characterDesign: {
    enabled: boolean;
    endpoint: string;
  };
  voiceSynthesis: {
    enabled: boolean;
    endpoint: string;
  };
  videoCompilation: {
    enabled: boolean;
    endpoint: string;
  };
}

// Check if AI services are enabled from environment variables
export const aiServiceConfig: AIServiceConfig = {
  research: {
    enabled: import.meta.env.VITE_ENABLE_AI_RESEARCH === 'true',
    endpoint: '/functions/v1/ai-research'
  },
  script: {
    enabled: import.meta.env.VITE_ENABLE_SCRIPT_GENERATION === 'true',
    endpoint: '/functions/v1/ai-script'
  },
  characterDesign: {
    enabled: import.meta.env.VITE_ENABLE_CHARACTER_DESIGN === 'true',
    endpoint: '/functions/v1/ai-character-design'
  },
  voiceSynthesis: {
    enabled: import.meta.env.VITE_ENABLE_VOICE_SYNTHESIS === 'true',
    endpoint: '/functions/v1/ai-voice-synthesis'
  },
  videoCompilation: {
    enabled: import.meta.env.VITE_ENABLE_VIDEO_COMPILATION === 'true',
    endpoint: '/functions/v1/video-compilation'
  }
};

// Re-export error types for convenience
export { AIServiceError } from './error-handling';

// Enhanced retry logic with error handling
export async function retryAIService<T>(
  fn: () => Promise<T>,
  service: keyof typeof ErrorHandlers
): Promise<T> {
  return retryWithBackoff(
    async () => {
      try {
        return await fn();
      } catch (error) {
        // Apply service-specific error handling
        throw ErrorHandlers[service](error);
      }
    },
    {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2
    },
    (attempt, delay) => {
      console.log(`Retry attempt ${attempt} for ${service}, waiting ${delay}ms`);
    }
  );
}

// Usage tracking for AI services
export interface AIUsageMetrics {
  service: keyof AIServiceConfig;
  tokens_used?: number;
  api_calls: number;
  cost?: number;
  timestamp: string;
}

export async function trackAIUsage(
  metrics: AIUsageMetrics,
  supabase: any
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('usage_metrics')
      .insert({
        ...metrics,
        user_id: user.id
      });
      
    if (error) {
      console.error('Failed to track AI usage:', error);
      // Report error for monitoring
      await reportError(
        new AIServiceError({
          code: 'USAGE_TRACKING_ERROR' as any,
          message: 'Failed to track usage',
          userMessage: 'Usage tracking error',
          retryable: false,
          technicalDetails: error
        }),
        { service: metrics.service, userId: user.id },
        supabase
      );
    }
  } catch (error) {
    console.error('Error tracking AI usage:', error);
  }
}

// Service health check
export async function checkServiceHealth(
  service: keyof AIServiceConfig
): Promise<boolean> {
  // In production, this would check actual service endpoints
  // For now, check if the service is enabled
  return aiServiceConfig[service].enabled;
}

// Fallback strategies for each service
export const serviceFallbacks = {
  research: async () => ({
    summary: 'Research service temporarily unavailable.',
    key_points: ['Unable to fetch research data'],
    sources: [],
    timestamp: new Date().toISOString()
  }),
  
  script: async () => ({
    title: 'Untitled Story',
    scenes: [{
      scene_number: 1,
      description: 'Script generation unavailable',
      narration: 'Script service is temporarily unavailable.',
      visuals: ['Placeholder visual'],
      duration: '30s',
      mood: 'neutral'
    }],
    duration_estimate: '0:30',
    narration_style: 'Default',
    target_audience: 'General',
    tone: 'Neutral',
    timestamp: new Date().toISOString()
  }),
  
  characterDesign: async () => ({
    characters: [],
    scenes: [],
    style_guide: {
      art_style: 'Default',
      color_palette: ['#4F46E5'],
      visual_themes: ['Placeholder'],
      animation_notes: 'Service unavailable'
    },
    timestamp: new Date().toISOString()
  }),
  
  voiceSynthesis: async () => ({
    audio_files: [],
    voice_settings: {
      voice_id: 'default',
      voice_name: 'Default Voice',
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0,
      use_speaker_boost: false
    },
    total_duration: '0:00',
    timestamp: new Date().toISOString()
  }),
  
  videoCompilation: async () => ({
    video_url: '',
    thumbnail_url: '',
    duration: '0:00',
    resolution: '1920x1080',
    format: 'mp4',
    file_size: 0,
    render_settings: {
      resolution: '1920x1080',
      fps: 30,
      codec: 'h264',
      bitrate: '5000k',
      transitions: 'none'
    },
    timestamp: new Date().toISOString()
  })
};