/**
 * Retry Service for TuningSearch MCP Server
 * 
 * This service implements exponential backoff retry logic with configurable
 * retry strategies for handling transient failures.
 */

import { shouldRetryError } from '../types/error-types';

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Initial delay in milliseconds */
  initialDelay: number;
  /** Maximum delay in milliseconds */
  maxDelay: number;
  /** Backoff multiplier for exponential backoff */
  backoffFactor: number;
  /** List of error codes that should be retried regardless of error.retryable */
  retryableErrors: string[];
  /** Whether to add jitter to delay calculations */
  jitter: boolean;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000,    // 30 seconds
  backoffFactor: 2,
  retryableErrors: [],
  jitter: true
};

/**
 * Information about a retry attempt
 */
export interface RetryAttempt {
  /** Current attempt number (1-based) */
  attempt: number;
  /** Error that caused the retry */
  error: Error;
  /** Delay before this attempt in milliseconds */
  delay: number;
  /** Total elapsed time since first attempt */
  elapsedTime: number;
}

/**
 * Result of a retry operation
 */
export interface RetryResult<T> {
  /** The successful result, if any */
  result?: T;
  /** The final error, if operation failed */
  error?: Error;
  /** Total number of attempts made */
  totalAttempts: number;
  /** Total elapsed time */
  totalElapsedTime: number;
  /** List of all retry attempts */
  attempts: RetryAttempt[];
}

/**
 * Function type for operations that can be retried
 */
export type RetryableOperation<T> = () => Promise<T>;

/**
 * Callback function called before each retry attempt
 */
export type RetryCallback = (attempt: RetryAttempt) => void;

/**
 * Service for handling retry logic with exponential backoff
 */
export class RetryService {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Execute an operation with retry logic
   */
  async executeWithRetry<T>(
    operation: RetryableOperation<T>,
    config?: Partial<RetryConfig>,
    onRetry?: RetryCallback
  ): Promise<T> {
    const result = await this.executeWithRetryDetails(operation, config, onRetry);
    
    if (result.error) {
      throw result.error;
    }
    
    return result.result!;
  }

  /**
   * Execute an operation with retry logic and return detailed results
   */
  async executeWithRetryDetails<T>(
    operation: RetryableOperation<T>,
    config?: Partial<RetryConfig>,
    onRetry?: RetryCallback
  ): Promise<RetryResult<T>> {
    const effectiveConfig = { ...this.config, ...config };
    const attempts: RetryAttempt[] = [];
    const startTime = Date.now();
    
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= effectiveConfig.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        return {
          result,
          totalAttempts: attempt,
          totalElapsedTime: Date.now() - startTime,
          attempts
        };
      } catch (error) {
        const currentTime = Date.now();
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if we should retry this error
        const shouldRetry = attempt < effectiveConfig.maxAttempts && 
                           this.shouldRetryError(lastError, effectiveConfig);
        
        if (!shouldRetry) {
          return {
            error: lastError,
            totalAttempts: attempt,
            totalElapsedTime: currentTime - startTime,
            attempts
          };
        }
        
        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, effectiveConfig);
        
        const retryAttempt: RetryAttempt = {
          attempt,
          error: lastError,
          delay,
          elapsedTime: currentTime - startTime
        };
        
        attempts.push(retryAttempt);
        
        // Call retry callback if provided
        if (onRetry) {
          try {
            onRetry(retryAttempt);
          } catch (callbackError) {
            console.warn('Retry callback error:', callbackError);
          }
        }
        
        // Wait before next attempt
        await this.delay(delay);
      }
    }
    
    return {
      error: lastError || new Error('Unknown error'),
      totalAttempts: effectiveConfig.maxAttempts,
      totalElapsedTime: Date.now() - startTime,
      attempts
    };
  }

  /**
   * Check if an error should be retried
   */
  private shouldRetryError(error: Error, config: RetryConfig): boolean {
    return shouldRetryError(error, config.retryableErrors);
  }

  /**
   * Calculate delay for next retry attempt using exponential backoff
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    // Calculate exponential backoff delay
    let delay = config.initialDelay * Math.pow(config.backoffFactor, attempt - 1);
    
    // Apply maximum delay limit
    delay = Math.min(delay, config.maxDelay);
    
    // Add jitter if enabled
    if (config.jitter) {
      // Add random jitter of ±25%
      const jitterRange = delay * 0.25;
      const jitter = (Math.random() - 0.5) * 2 * jitterRange;
      delay = Math.max(0, delay + jitter);
    }
    
    return Math.round(delay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update retry configuration
   */
  updateConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current retry configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }
}

/**
 * Default retry service instance
 */
export const defaultRetryService = new RetryService();

/**
 * Convenience function to execute operation with default retry service
 */
export async function withRetry<T>(
  operation: RetryableOperation<T>,
  config?: Partial<RetryConfig>,
  onRetry?: RetryCallback
): Promise<T> {
  return defaultRetryService.executeWithRetry(operation, config, onRetry);
}

/**
 * Convenience function to execute operation with detailed results
 */
export async function withRetryDetails<T>(
  operation: RetryableOperation<T>,
  config?: Partial<RetryConfig>,
  onRetry?: RetryCallback
): Promise<RetryResult<T>> {
  return defaultRetryService.executeWithRetryDetails(operation, config, onRetry);
}

/**
 * Create a retry decorator for class methods
 */
export function retryable(config?: Partial<RetryConfig>) {
  return function <T extends (...args: any[]) => Promise<any>>(
    _target: any,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value!;
    
    descriptor.value = async function (this: any, ...args: any[]) {
      return withRetry(
        () => originalMethod.apply(this, args),
        config,
        (attempt) => {
          console.log(`Retrying method (attempt ${attempt.attempt}):`, {
            error: attempt.error.message,
            delay: attempt.delay,
            elapsedTime: attempt.elapsedTime
          });
        }
      );
    } as T;
    
    return descriptor;
  };
}