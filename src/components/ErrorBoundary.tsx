import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { getUserFriendlyMessage } from '../lib/error-handling';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      errorInfo
    });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  public render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      return <DefaultErrorFallback error={this.state.error} reset={this.handleReset} />;
    }

    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  error: Error;
  reset: () => void;
}

function DefaultErrorFallback({ error, reset }: DefaultErrorFallbackProps) {
  const userMessage = getUserFriendlyMessage(error);
  const isDevelopment = import.meta.env.DEV;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Oops! Something went wrong
          </h1>
          
          <p className="text-gray-600 text-center mb-6">
            {userMessage}
          </p>

          {isDevelopment && (
            <details className="mb-6">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                Technical Details
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40">
                {error.stack || error.message}
              </pre>
            </details>
          )}

          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
            
            <a
              href="/"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Home className="h-4 w-4" />
              Go Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Service-specific error boundary for AI operations
interface AIErrorBoundaryProps {
  children: ReactNode;
  service: string;
  onError?: (error: Error) => void;
}

export function AIErrorBoundary({ children, service, onError }: AIErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <AIErrorFallback 
          error={error} 
          reset={reset} 
          service={service}
          onError={onError}
        />
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

interface AIErrorFallbackProps {
  error: Error;
  reset: () => void;
  service: string;
  onError?: (error: Error) => void;
}

function AIErrorFallback({ error, reset, service, onError }: AIErrorFallbackProps) {
  React.useEffect(() => {
    if (onError) {
      onError(error);
    }
  }, [error, onError]);

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-lg font-medium text-red-900">
            {service} Error
          </h3>
          <p className="mt-1 text-sm text-red-700">
            {getUserFriendlyMessage(error)}
          </p>
          <div className="mt-4">
            <button
              onClick={reset}
              className="text-sm font-medium text-red-600 hover:text-red-500"
            >
              Try again →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}