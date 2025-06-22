'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home, FileText } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  level?: 'page' | 'component' | 'critical';
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error);
      console.error('Error info:', errorInfo);
    }

    // Send error to monitoring service (e.g., Sentry)
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { extra: errorInfo });
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
          level={this.props.level}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  onRetry: () => void;
  onReload: () => void;
  level?: 'page' | 'component' | 'critical';
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  onRetry,
  onReload,
  level = 'component',
}) => {
  const isDevMode = process.env.NODE_ENV === 'development';

  const getErrorConfig = () => {
    switch (level) {
      case 'critical':
        return {
          title: 'Critical Error',
          description: 'A critical error has occurred that requires a page reload.',
          icon: AlertTriangle,
          primaryAction: { label: 'Reload Page', action: onReload },
          secondaryAction: null,
          containerClass: 'min-h-screen',
        };
      case 'page':
        return {
          title: 'Page Error',
          description: 'Something went wrong loading this page.',
          icon: AlertTriangle,
          primaryAction: { label: 'Reload Page', action: onReload },
          secondaryAction: { label: 'Try Again', action: onRetry },
          containerClass: 'min-h-[400px]',
        };
      default:
        return {
          title: 'Something went wrong',
          description: 'This component encountered an error.',
          icon: AlertTriangle,
          primaryAction: { label: 'Try Again', action: onRetry },
          secondaryAction: { label: 'Reload Page', action: onReload },
          containerClass: 'min-h-[200px]',
        };
    }
  };

  const config = getErrorConfig();
  const IconComponent = config.icon;

  return (
    <div className={`flex flex-col items-center justify-center p-8 bg-backgroundSecondary rounded-lg border border-primaryStroke/50 ${config.containerClass}`}>
      {/* Error Icon */}
      <div className="flex items-center justify-center w-16 h-16 mb-4 bg-red-500/10 rounded-full">
        <IconComponent className="w-8 h-8 text-red-500" />
      </div>

      {/* Error Title */}
      <h2 className="text-xl font-semibold text-textPrimary mb-2 text-center">
        {config.title}
      </h2>

      {/* Error Description */}
      <p className="text-textSecondary text-center mb-6 max-w-md">
        {config.description}
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <button
          onClick={config.primaryAction.action}
          className="flex items-center gap-2 px-4 py-2 bg-primaryBlue hover:bg-primaryBlueHover text-white rounded-md transition-colors"
        >
          <RefreshCcw className="w-4 h-4" />
          {config.primaryAction.label}
        </button>
        
        {config.secondaryAction && (
          <button
            onClick={config.secondaryAction.action}
            className="flex items-center gap-2 px-4 py-2 border border-primaryStroke hover:bg-primaryStroke/50 text-textPrimary rounded-md transition-colors"
          >
            <Home className="w-4 h-4" />
            {config.secondaryAction.label}
          </button>
        )}
      </div>

      {/* Error Details (Development Only) */}
      {isDevMode && error && (
        <details className="w-full max-w-2xl">
          <summary className="cursor-pointer flex items-center gap-2 text-sm text-textSecondary hover:text-textPrimary mb-2">
            <FileText className="w-4 h-4" />
            Error Details (Development)
          </summary>
          
          <div className="bg-backgroundPrimary border border-primaryStroke/50 rounded-md p-4 text-xs">
            <div className="mb-4">
              <h4 className="font-semibold text-textPrimary mb-2">Error Message:</h4>
              <pre className="text-red-400 whitespace-pre-wrap break-words">
                {error.message}
              </pre>
            </div>
            
            <div className="mb-4">
              <h4 className="font-semibold text-textPrimary mb-2">Stack Trace:</h4>
              <pre className="text-textSecondary whitespace-pre-wrap break-words text-xs overflow-x-auto">
                {error.stack}
              </pre>
            </div>
            
            {errorInfo && (
              <div>
                <h4 className="font-semibold text-textPrimary mb-2">Component Stack:</h4>
                <pre className="text-textSecondary whitespace-pre-wrap break-words text-xs overflow-x-auto">
                  {errorInfo.componentStack}
                </pre>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
};

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for error boundary (for function components)
export function useErrorHandler() {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
    // Trigger error boundary by throwing error
    throw error;
  };
}

// Simple error display component for non-critical errors
export const ErrorAlert: React.FC<{
  error: string | Error;
  onDismiss?: () => void;
  className?: string;
}> = ({ error, onDismiss, className = '' }) => {
  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <div className={`flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-md ${className}`}>
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <div>
          <p className="text-red-500 font-medium">Error</p>
          <p className="text-red-400 text-sm">{errorMessage}</p>
        </div>
      </div>
      
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-300 transition-colors"
          aria-label="Dismiss error"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}; 