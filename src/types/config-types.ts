/**
 * Configuration Types for TuningSearch MCP Server
 * 
 * This file contains type definitions for configuration settings
 * including TuningSearchConfig and RetryConfig.
 */

/**
 * Main configuration interface for TuningSearch
 */
export interface TuningSearchConfig {
  apiKey?: string;              // API key for TuningSearch
  baseUrl?: string;             // Base URL for API requests
  timeout?: number;             // Request timeout in milliseconds
  retryAttempts?: number;       // Number of retry attempts
  retryDelay?: number;          // Initial retry delay in milliseconds
  logLevel?: LogLevel;          // Log level for the application
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: TuningSearchConfig = {
  baseUrl: 'https://api.tuningsearch.com/v1',
  timeout: 30000,               // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000,             // 1 second
  logLevel: 'info'
};

/**
 * Environment variable names for configuration
 */
export const ENV_VARS = {
  API_KEY: 'TUNINGSEARCH_API_KEY',
  BASE_URL: 'TUNINGSEARCH_BASE_URL',
  TIMEOUT: 'TUNINGSEARCH_TIMEOUT',
  RETRY_ATTEMPTS: 'TUNINGSEARCH_RETRY_ATTEMPTS',
  RETRY_DELAY: 'TUNINGSEARCH_RETRY_DELAY',
  LOG_LEVEL: 'TUNINGSEARCH_LOG_LEVEL'
};

/**
 * Log levels for the application
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/**
 * Retry configuration interface
 */
export interface RetryConfig {
  maxAttempts: number;          // Maximum number of retry attempts
  initialDelay: number;         // Initial delay in milliseconds
  maxDelay: number;             // Maximum delay in milliseconds
  backoffFactor: number;        // Exponential backoff factor
  retryableErrors: string[];    // Error codes that should trigger a retry
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,           // 1 second
  maxDelay: 30000,              // 30 seconds
  backoffFactor: 2,             // Exponential backoff with factor of 2
  retryableErrors: [
    'NETWORK_ERROR',
    'RATE_LIMIT_ERROR',
    'TIMEOUT_ERROR',
    'SERVER_ERROR'
  ]
};

/**
 * Configuration validation function
 */
export function validateConfig(config: TuningSearchConfig): string[] {
  const errors: string[] = [];
  
  // API key is required
  if (!config.apiKey) {
    errors.push(`API key is required. Set it using the ${ENV_VARS.API_KEY} environment variable.`);
  }
  
  // Validate numeric values
  if (config.timeout !== undefined && (typeof config.timeout !== 'number' || isNaN(config.timeout) || config.timeout <= 0)) {
    errors.push('Timeout must be a positive number.');
  }
  
  if (config.retryAttempts !== undefined && (typeof config.retryAttempts !== 'number' || isNaN(config.retryAttempts) || config.retryAttempts < 0)) {
    errors.push('Retry attempts must be a non-negative number.');
  }
  
  if (config.retryDelay !== undefined && (typeof config.retryDelay !== 'number' || isNaN(config.retryDelay) || config.retryDelay < 0)) {
    errors.push('Retry delay must be a non-negative number.');
  }
  
  // Validate log level
  if (config.logLevel !== undefined && 
      !['error', 'warn', 'info', 'debug'].includes(config.logLevel)) {
    errors.push('Log level must be one of: error, warn, info, debug.');
  }
  
  return errors;
}

/**
 * Load configuration from environment variables
 */
export function loadConfigFromEnv(): TuningSearchConfig {
  const timeoutEnv = process.env[ENV_VARS.TIMEOUT];
  const retryAttemptsEnv = process.env[ENV_VARS.RETRY_ATTEMPTS];
  const retryDelayEnv = process.env[ENV_VARS.RETRY_DELAY];
  
  const config: Partial<TuningSearchConfig> = {};
  
  const apiKey = process.env[ENV_VARS.API_KEY];
  if (apiKey !== undefined) {
    (config as any).apiKey = apiKey;
  }
  
  const baseUrl = process.env[ENV_VARS.BASE_URL];
  if (baseUrl !== undefined) {
    (config as any).baseUrl = baseUrl;
  } else {
    (config as any).baseUrl = DEFAULT_CONFIG.baseUrl;
  }
  
  if (timeoutEnv !== undefined) {
    (config as any).timeout = parseInt(timeoutEnv, 10);
  } else {
    (config as any).timeout = DEFAULT_CONFIG.timeout;
  }
  
  if (retryAttemptsEnv !== undefined) {
    (config as any).retryAttempts = parseInt(retryAttemptsEnv, 10);
  } else {
    (config as any).retryAttempts = DEFAULT_CONFIG.retryAttempts;
  }
  
  if (retryDelayEnv !== undefined) {
    (config as any).retryDelay = parseInt(retryDelayEnv, 10);
  } else {
    (config as any).retryDelay = DEFAULT_CONFIG.retryDelay;
  }
  
  const logLevelEnv = process.env[ENV_VARS.LOG_LEVEL];
  (config as any).logLevel = (logLevelEnv ? logLevelEnv.toLowerCase() : DEFAULT_CONFIG.logLevel) as LogLevel;
  
  return config as TuningSearchConfig;
}
