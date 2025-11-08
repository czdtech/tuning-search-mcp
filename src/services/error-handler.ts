/**
 * Error Handler Service for TuningSearch MCP Server
 * 
 * This service provides unified error handling, formatting, and logging
 * for all errors that occur in the application.
 */

import {
  TuningSearchError,
  APIKeyError,
  RateLimitError,
  NetworkError,
  TimeoutError,
  ValidationError,
  ConfigurationError,
  isTuningSearchError
} from '../types/error-types';

/**
 * Configuration for error handling behavior
 */
export interface ErrorHandlerConfig {
  /** Whether to log errors to console */
  enableLogging: boolean;
  /** Whether to include stack traces in logs */
  includeStackTrace: boolean;
  /** Whether to sanitize sensitive information from error messages */
  sanitizeErrors: boolean;
  /** Custom error message mappings */
  customMessages: Record<string, string>;
  /** Log level for different error types */
  logLevels: {
    [key: string]: 'error' | 'warn' | 'info' | 'debug';
  };
}

/**
 * Default error handler configuration
 */
export const DEFAULT_ERROR_HANDLER_CONFIG: ErrorHandlerConfig = {
  enableLogging: true,
  includeStackTrace: false,
  sanitizeErrors: true,
  customMessages: {},
  logLevels: {
    API_KEY_ERROR: 'warn',
    RATE_LIMIT_ERROR: 'warn',
    NETWORK_ERROR: 'error',
    TIMEOUT_ERROR: 'warn',
    SERVER_ERROR: 'error',
    VALIDATION_ERROR: 'warn',
    CONFIGURATION_ERROR: 'error',
    NOT_IMPLEMENTED: 'warn'
  }
};

/**
 * Formatted error response for user consumption
 */
export interface FormattedError {
  /** Error code */
  code: string;
  /** User-friendly error message */
  message: string;
  /** Whether the operation can be retried */
  retryable: boolean;
  /** Additional context or suggestions */
  context?: string;
  /** Timestamp when error occurred */
  timestamp: string;
}

/**
 * Error handling service that provides unified error processing
 */
export class ErrorHandler {
  private config: ErrorHandlerConfig;

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = { ...DEFAULT_ERROR_HANDLER_CONFIG, ...config };
  }

  /**
   * Handle an error by logging it and returning a formatted response
   */
  handleError(error: unknown, context?: string): FormattedError {
    const processedError = this.processError(error);
    
    // Log the error if logging is enabled
    if (this.config.enableLogging) {
      this.logError(processedError, context);
    }
    
    // Return formatted error for user consumption
    return this.formatError(processedError, context);
  }

  /**
   * Process raw error into a TuningSearchError
   */
  private processError(error: unknown): TuningSearchError {
    if (isTuningSearchError(error)) {
      return error;
    }
    
    if (error instanceof Error) {
      // Convert regular Error to NetworkError (most common case)
      return new NetworkError(error.message, error);
    }
    
    // Handle non-Error values
    const message = typeof error === 'string' ? error : 'Unknown error occurred';
    return new NetworkError(message);
  }

  /**
   * Log error with appropriate level and formatting
   */
  private logError(error: TuningSearchError, context?: string): void {
    const logLevel = this.config.logLevels[error.code] || 'error';
    const logData: Record<string, any> = {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      retryable: error.retryable,
      timestamp: error.timestamp.toISOString(),
      context
    };

    // Add stack trace if enabled
    if (this.config.includeStackTrace) {
      logData.stack = error.stack;
    }

    // Log with appropriate level
    switch (logLevel) {
      case 'error':
        console.error('TuningSearch Error:', logData);
        break;
      case 'warn':
        console.warn('TuningSearch Warning:', logData);
        break;
      case 'info':
        console.info('TuningSearch Info:', logData);
        break;
      case 'debug':
        console.debug('TuningSearch Debug:', logData);
        break;
    }
  }

  /**
   * Format error for user consumption
   */
  private formatError(error: TuningSearchError, context?: string): FormattedError {
    const customMessage = this.config.customMessages[error.code];
    let message = customMessage || error.message;
    
    // Sanitize sensitive information if enabled
    if (this.config.sanitizeErrors) {
      message = this.sanitizeMessage(message, error);
    }
    
    // Note: Removed automatic suffix addition to match test expectations
    // Tests expect the original error message without modifications

    const errorContext = this.getErrorContext(error, context);
    
    const result: FormattedError = {
      code: error.code,
      message,
      retryable: error.retryable,
      timestamp: error.timestamp.toISOString()
    };
    
    if (errorContext !== undefined) {
      result.context = errorContext;
    }
    
    return result;
  }

  /**
   * Sanitize error message to remove sensitive information
   */
  private sanitizeMessage(message: string, error: TuningSearchError): string {
    // If this is a custom message, don't apply default sanitization for API key errors
    const isCustomMessage = this.config.customMessages[error.code] !== undefined;
    
    // Remove potential API keys or tokens
    let sanitized = message.replace(/[a-zA-Z0-9]{32,}/g, '[REDACTED]');
    
    // Remove URLs that might contain sensitive info
    sanitized = sanitized.replace(/https?:\/\/[^\s]+/g, '[URL_REDACTED]');
    
    // Add specific sanitization for different error types (only if not custom message)
    if (error instanceof APIKeyError && !isCustomMessage) {
      sanitized = 'API key is missing or invalid. Please check your configuration.';
    }
    
    return sanitized;
  }

  /**
   * Get contextual information and suggestions for the error
   */
  private getErrorContext(error: TuningSearchError, context?: string): string | undefined {
    const suggestions: string[] = [];
    
    if (context) {
      suggestions.push(`Context: ${context}`);
    }
    
    // Add error-specific suggestions
    switch (error.constructor) {
      case APIKeyError:
        suggestions.push('Please verify your API key is correctly configured');
        suggestions.push('Check that the API key has the necessary permissions');
        break;
        
      case RateLimitError:
        suggestions.push('Please wait before making additional requests');
        if (error instanceof RateLimitError && error.resetTime) {
          suggestions.push(`Rate limit resets at: ${error.resetTime.toISOString()}`);
        }
        break;
        
      case NetworkError:
        suggestions.push('Check your internet connection');
        suggestions.push('Verify the API endpoint is accessible');
        break;
        
      case TimeoutError:
        suggestions.push('The request took too long to complete');
        suggestions.push('Try again or increase the timeout value');
        break;
        
      case ValidationError:
        if (error instanceof ValidationError && error.validationErrors.length > 0) {
          suggestions.push('Validation errors:');
          error.validationErrors.forEach(err => suggestions.push(`- ${err}`));
        }
        break;
        
      case ConfigurationError:
        if (error instanceof ConfigurationError && error.configErrors.length > 0) {
          suggestions.push('Configuration errors:');
          error.configErrors.forEach(err => suggestions.push(`- ${err}`));
        }
        break;
    }
    
    return suggestions.length > 0 ? suggestions.join('\n') : undefined;
  }

  /**
   * Update error handler configuration
   */
  updateConfig(config: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ErrorHandlerConfig {
    return { ...this.config };
  }

  /**
   * Create a user-friendly error message from any error
   */
  createUserMessage(error: unknown): string {
    const formatted = this.handleError(error);
    
    let message = `Error: ${formatted.message}`;
    
    if (formatted.context) {
      message += `\n\n${formatted.context}`;
    }
    
    if (formatted.retryable) {
      message += '\n\nThis operation can be retried.';
    }
    
    return message;
  }

  /**
   * Check if an error should be reported to external monitoring
   */
  shouldReport(error: unknown): boolean {
    const processedError = this.processError(error);
    
    // Don't report validation errors or API key errors (user errors)
    if (processedError instanceof ValidationError || 
        processedError instanceof APIKeyError) {
      return false;
    }
    
    // Don't report rate limit errors (expected)
    if (processedError instanceof RateLimitError) {
      return false;
    }
    
    // Report server errors and network errors
    return true;
  }
}

/**
 * Default error handler instance
 */
export const defaultErrorHandler = new ErrorHandler();

/**
 * Convenience function to handle errors with default handler
 */
export function handleError(error: unknown, context?: string): FormattedError {
  return defaultErrorHandler.handleError(error, context);
}

/**
 * Convenience function to create user messages with default handler
 */
export function createUserMessage(error: unknown): string {
  return defaultErrorHandler.createUserMessage(error);
}

/**
 * Convenience function to check if error should be reported
 */
export function shouldReportError(error: unknown): boolean {
  return defaultErrorHandler.shouldReport(error);
}
