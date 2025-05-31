// Comprehensive Error Handling for AI Services

export enum ErrorCode {
  // API Errors
  API_KEY_MISSING = 'API_KEY_MISSING',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  API_QUOTA_EXCEEDED = 'API_QUOTA_EXCEEDED',
  API_INVALID_RESPONSE = 'API_INVALID_RESPONSE',
  API_SERVICE_DOWN = 'API_SERVICE_DOWN',
  
  // Service Errors
  RESEARCH_FAILED = 'RESEARCH_FAILED',
  SCRIPT_GENERATION_FAILED = 'SCRIPT_GENERATION_FAILED',
  CHARACTER_DESIGN_FAILED = 'CHARACTER_DESIGN_FAILED',
  VOICE_SYNTHESIS_FAILED = 'VOICE_SYNTHESIS_FAILED',
  VIDEO_COMPILATION_FAILED = 'VIDEO_COMPILATION_FAILED',
  
  // Data Errors
  INVALID_PROJECT_DATA = 'INVALID_PROJECT_DATA',
  MISSING_DEPENDENCIES = 'MISSING_DEPENDENCIES',
  DATA_CORRUPTION = 'DATA_CORRUPTION',
  
  // Storage Errors
  STORAGE_UPLOAD_FAILED = 'STORAGE_UPLOAD_FAILED',
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  
  // User Errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  SUBSCRIPTION_REQUIRED = 'SUBSCRIPTION_REQUIRED',
  USAGE_LIMIT_EXCEEDED = 'USAGE_LIMIT_EXCEEDED',
  
  // System Errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR'
}

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  userMessage: string;
  technicalDetails?: any;
  retryable: boolean;
  suggestedAction?: string;
}

export class AIServiceError extends Error {
  public code: ErrorCode;
  public userMessage: string;
  public retryable: boolean;
  public suggestedAction?: string;
  public technicalDetails?: any;

  constructor(details: ErrorDetails) {
    super(details.message);
    this.name = 'AIServiceError';
    this.code = details.code;
    this.userMessage = details.userMessage;
    this.retryable = details.retryable;
    this.suggestedAction = details.suggestedAction;
    this.technicalDetails = details.technicalDetails;
  }
}

// Error mapping for different API responses
export function mapAPIError(error: any, service: string): AIServiceError {
  // OpenAI errors
  if (error.response?.status === 429) {
    return new AIServiceError({
      code: ErrorCode.API_RATE_LIMIT,
      message: `${service} rate limit exceeded`,
      userMessage: 'Service is currently busy. Please try again in a few moments.',
      retryable: true,
      suggestedAction: 'Wait 60 seconds before retrying',
      technicalDetails: error.response
    });
  }

  if (error.response?.status === 401) {
    return new AIServiceError({
      code: ErrorCode.API_KEY_MISSING,
      message: `Invalid or missing API key for ${service}`,
      userMessage: 'Service configuration error. Please contact support.',
      retryable: false,
      technicalDetails: error.response
    });
  }

  if (error.response?.status === 503) {
    return new AIServiceError({
      code: ErrorCode.API_SERVICE_DOWN,
      message: `${service} service is temporarily unavailable`,
      userMessage: 'The AI service is temporarily down. Please try again later.',
      retryable: true,
      suggestedAction: 'Try again in 5 minutes'
    });
  }

  // Network errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return new AIServiceError({
      code: ErrorCode.NETWORK_ERROR,
      message: 'Network connection error',
      userMessage: 'Unable to connect to the service. Please check your internet connection.',
      retryable: true
    });
  }

  // Default error
  return new AIServiceError({
    code: ErrorCode.UNKNOWN_ERROR,
    message: error.message || 'Unknown error occurred',
    userMessage: 'An unexpected error occurred. Please try again.',
    retryable: true,
    technicalDetails: error
  });
}

// Service-specific error handlers
export const ErrorHandlers = {
  research: (error: any): AIServiceError => {
    if (error.message?.includes('No search results')) {
      return new AIServiceError({
        code: ErrorCode.RESEARCH_FAILED,
        message: 'No research results found',
        userMessage: 'Unable to find information on this topic. Try a different or more specific topic.',
        retryable: false,
        suggestedAction: 'Modify your topic and try again'
      });
    }
    return mapAPIError(error, 'Research');
  },

  script: (error: any): AIServiceError => {
    if (error.message?.includes('content filter')) {
      return new AIServiceError({
        code: ErrorCode.SCRIPT_GENERATION_FAILED,
        message: 'Content filter triggered',
        userMessage: 'The topic may contain sensitive content. Please choose a different topic.',
        retryable: false,
        suggestedAction: 'Choose a family-friendly topic'
      });
    }
    return mapAPIError(error, 'Script Generation');
  },

  characterDesign: (error: any): AIServiceError => {
    if (error.message?.includes('safety system')) {
      return new AIServiceError({
        code: ErrorCode.CHARACTER_DESIGN_FAILED,
        message: 'Image generation blocked by safety system',
        userMessage: 'Unable to generate images for this content. Please modify your script.',
        retryable: false,
        suggestedAction: 'Review and modify character descriptions'
      });
    }
    return mapAPIError(error, 'Character Design');
  },

  voiceSynthesis: (error: any): AIServiceError => {
    if (error.message?.includes('voice_not_found')) {
      return new AIServiceError({
        code: ErrorCode.VOICE_SYNTHESIS_FAILED,
        message: 'Selected voice not available',
        userMessage: 'The selected voice is not available. Using default voice.',
        retryable: true,
        suggestedAction: 'System will retry with default voice'
      });
    }
    return mapAPIError(error, 'Voice Synthesis');
  },

  videoCompilation: (error: any): AIServiceError => {
    if (error.message?.includes('ffmpeg')) {
      return new AIServiceError({
        code: ErrorCode.VIDEO_COMPILATION_FAILED,
        message: 'Video processing error',
        userMessage: 'Unable to compile video. This may be due to corrupted assets.',
        retryable: true,
        suggestedAction: 'Regenerate assets and try again'
      });
    }
    return mapAPIError(error, 'Video Compilation');
  }
};

// Retry strategy with exponential backoff
export interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2
};

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = defaultRetryOptions,
  onRetry?: (attempt: number, delay: number) => void
): Promise<T> {
  let lastError: any;
  let delay = options.initialDelay;

  for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable
      if (error instanceof AIServiceError && !error.retryable) {
        throw error;
      }

      if (attempt < options.maxRetries) {
        if (onRetry) {
          onRetry(attempt, delay);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * options.backoffFactor, options.maxDelay);
      }
    }
  }

  throw lastError;
}

// Error recovery strategies
export const RecoveryStrategies = {
  useAlternativeService: async (primaryFn: () => Promise<any>, fallbackFn: () => Promise<any>) => {
    try {
      return await primaryFn();
    } catch (primaryError) {
      console.warn('Primary service failed, trying fallback:', primaryError);
      try {
        return await fallbackFn();
      } catch (fallbackError) {
        throw new AIServiceError({
          code: ErrorCode.API_SERVICE_DOWN,
          message: 'All services failed',
          userMessage: 'Unable to process your request. Please try again later.',
          retryable: true,
          technicalDetails: { primaryError, fallbackError }
        });
      }
    }
  },

  gracefulDegradation: async (fn: () => Promise<any>, defaultValue: any) => {
    try {
      return await fn();
    } catch (error) {
      console.error('Service failed, using default value:', error);
      return defaultValue;
    }
  },

  queueForRetry: async (projectId: string, stage: string, supabase: any) => {
    // Store failed operation for later retry
    await supabase
      .from('retry_queue')
      .insert({
        project_id: projectId,
        stage,
        retry_count: 0,
        next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
        created_at: new Date().toISOString()
      });
  }
};

// User-friendly error messages
export function getUserFriendlyMessage(error: any): string {
  if (error instanceof AIServiceError) {
    return error.userMessage;
  }

  // Map common errors to user-friendly messages
  const errorMessageMap: Record<string, string> = {
    'Network request failed': 'Connection error. Please check your internet and try again.',
    'timeout': 'The request took too long. Please try again.',
    'quota': 'You\'ve reached your usage limit. Please upgrade your plan.',
    'unauthorized': 'Please sign in to continue.',
    'server error': 'Our servers are experiencing issues. Please try again later.'
  };

  const errorString = error.message?.toLowerCase() || '';
  
  for (const [key, message] of Object.entries(errorMessageMap)) {
    if (errorString.includes(key)) {
      return message;
    }
  }

  return 'Something went wrong. Please try again or contact support if the issue persists.';
}

// Error reporting for monitoring
export async function reportError(error: AIServiceError, context: any, supabase: any) {
  try {
    await supabase
      .from('error_logs')
      .insert({
        error_code: error.code,
        error_message: error.message,
        service: context.service,
        project_id: context.projectId,
        user_id: context.userId,
        technical_details: error.technicalDetails,
        created_at: new Date().toISOString()
      });
  } catch (reportingError) {
    console.error('Failed to report error:', reportingError);
  }
}