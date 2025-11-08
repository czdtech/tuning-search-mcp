/**
 * Error Types for TuningSearch MCP Server
 * 
 * This file contains custom error classes for handling different types of errors
 * that may occur during API calls and request processing.
 */

/**
 * Base error class for all TuningSearch errors
 */
export abstract class TuningSearchError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  readonly timestamp: Date;
  readonly retryable: boolean;

  constructor(message: string, retryable = false) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.retryable = retryable;
    
    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to a plain object for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      statusCode: this.statusCode,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      retryable: this.retryable,
      stack: this.stack
    };
  }
}

/**
 * Error thrown when API key is missing or invalid
 */
export class APIKeyError extends TuningSearchError {
  readonly code = 'API_KEY_ERROR';
  readonly statusCode = 401;

  constructor(message = 'API key is missing or invalid') {
    super(message, false); // Not retryable - need to fix the API key
  }
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends TuningSearchError {
  readonly code = 'RATE_LIMIT_ERROR';
  readonly statusCode = 429;
  readonly resetTime?: Date;

  constructor(message = 'Rate limit exceeded', resetTime?: Date) {
    super(message, true); // Retryable after some time
    if (resetTime !== undefined) {
      this.resetTime = resetTime;
    }
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      resetTime: this.resetTime?.toISOString()
    };
  }
}

/**
 * Error thrown when network issues occur
 */
export class NetworkError extends TuningSearchError {
  readonly code = 'NETWORK_ERROR';
  readonly statusCode = 500;

  constructor(message = 'Network error occurred', public originalError?: Error) {
    super(message, true); // Retryable - might be temporary network issue
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      originalError: this.originalError ? {
        message: this.originalError.message,
        name: this.originalError.name,
        stack: this.originalError.stack
      } : undefined
    };
  }
}

/**
 * Error thrown when request times out
 */
export class TimeoutError extends TuningSearchError {
  readonly code = 'TIMEOUT_ERROR';
  readonly statusCode = 408;

  constructor(message = 'Request timed out') {
    super(message, true); // Retryable - might succeed on retry
  }
}

/**
 * Error thrown when server returns an error
 */
export class ServerError extends TuningSearchError {
  readonly code = 'SERVER_ERROR';
  readonly statusCode: number;

  constructor(message = 'Server error occurred', statusCode = 500) {
    super(message, statusCode >= 500); // Retryable if 5xx error
    this.statusCode = statusCode;
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends TuningSearchError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;
  readonly validationErrors: string[];

  constructor(message = 'Validation error', validationErrors: string[] = []) {
    super(message, false); // Not retryable - need to fix the input
    this.validationErrors = validationErrors;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      validationErrors: this.validationErrors
    };
  }
}

/**
 * Error thrown when configuration is invalid
 */
export class ConfigurationError extends TuningSearchError {
  readonly code = 'CONFIGURATION_ERROR';
  readonly statusCode = 500;
  readonly configErrors: string[];

  constructor(message = 'Configuration error', configErrors: string[] = []) {
    super(message, false); // Not retryable - need to fix the configuration
    this.configErrors = configErrors;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      configErrors: this.configErrors
    };
  }
}

/**
 * Error thrown when a feature is not implemented
 */
export class NotImplementedError extends TuningSearchError {
  readonly code = 'NOT_IMPLEMENTED';
  readonly statusCode = 501;

  constructor(message = 'Feature not implemented') {
    super(message, false); // Not retryable
  }
}

/**
 * Error thrown when security validation fails
 */
export class SecurityError extends TuningSearchError {
  readonly code = 'SECURITY_ERROR';
  readonly statusCode = 403;
  readonly details: string[];

  constructor(message = 'Security validation failed', details: string[] = []) {
    super(message, false); // Not retryable - security issue needs to be resolved
    this.details = details;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      details: this.details
    };
  }
}

/**
 * Factory function to create appropriate error from HTTP response
 */
export function createErrorFromResponse(
  response: Response, 
  body?: any
): TuningSearchError {
  const status = response.status;
  const message = body?.message || response.statusText || 'Unknown error';
  
  switch (status) {
    case 401:
    case 403:
      return new APIKeyError(message);
    case 429: {
      const resetHeader = response.headers.get('X-RateLimit-Reset');
      const resetTime = resetHeader ? new Date(parseInt(resetHeader, 10) * 1000) : undefined;
      return new RateLimitError(message, resetTime);
    }
    case 408:
      return new TimeoutError(message);
    default:
      return new ServerError(message, status);
  }
}

/**
 * Check if an error is a TuningSearchError
 */
export function isTuningSearchError(error: unknown): error is TuningSearchError {
  return error instanceof TuningSearchError;
}

/**
 * Check if an error should be retried based on retry configuration
 */
export function shouldRetryError(error: unknown, retryableErrors: string[]): boolean {
  if (isTuningSearchError(error)) {
    return error.retryable || retryableErrors.includes(error.code);
  }
  return false;
}