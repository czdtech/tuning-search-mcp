/**
 * TuningSearch API Client
 * HTTP client for interacting with TuningSearch API
 */

import { 
  TuningSearchConfig, 
  RetryConfig, 
  DEFAULT_RETRY_CONFIG,
  LogLevel 
} from '../types/config-types';
import { 
  SearchResponse, 
  NewsResponse, 
  CrawlResponse,
  ApiResponseConverter 
} from '../types/api-responses';
import { 
  SearchToolArgs, 
  NewsToolArgs, 
  CrawlToolArgs 
} from '../types/tool-types';
import {
  TuningSearchError,
  APIKeyError,
  NetworkError,
  TimeoutError,
  ValidationError,
  createErrorFromResponse,
  shouldRetryError
} from '../types/error-types';

/**
 * HTTP request options interface
 */
interface RequestOptions {
  method: string;
  headers: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}

/**
 * Retry context for tracking retry attempts
 */
interface RetryContext {
  attempt: number;
  lastError?: Error;
  startTime: number;
}

/**
 * TuningSearch API Client
 * Provides HTTP client functionality with authentication, retry logic, and error handling
 */
export class TuningSearchClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private retryConfig: RetryConfig;
  private logLevel: LogLevel;
  private defaultHeaders: Record<string, string>;

  constructor(config: TuningSearchConfig) {
    // Validate required configuration
    if (!config.apiKey) {
      throw new APIKeyError('API key is required for TuningSearch client');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.tuningsearch.com/v1';
    this.timeout = config.timeout || 30000;
    this.logLevel = config.logLevel || 'info';
    
    // Setup retry configuration
    this.retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      maxAttempts: config.retryAttempts || DEFAULT_RETRY_CONFIG.maxAttempts,
      initialDelay: config.retryDelay || DEFAULT_RETRY_CONFIG.initialDelay
    };

    // Setup default headers
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'User-Agent': 'TuningSearch-MCP-Server/1.0.0'
    };

    this.log('info', 'TuningSearch client initialized', {
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      retryAttempts: this.retryConfig.maxAttempts
    });
  }

  /**
   * Logging utility with level filtering
   */
  private log(level: LogLevel, message: string, data?: any): void {
    const levels = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);

    if (messageLevelIndex <= currentLevelIndex) {
      const timestamp = new Date().toISOString();
      const logData = data ? ` ${JSON.stringify(data)}` : '';
      console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}${logData}`);
    }
  }

  /**
   * Create AbortController for request timeout
   */
  private createTimeoutController(): AbortController {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), this.timeout);
    return controller;
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    // Remove leading slash from endpoint to avoid replacing the base URL path
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const baseUrlWithSlash = this.baseUrl.endsWith('/') ? this.baseUrl : this.baseUrl + '/';
    const url = new URL(cleanEndpoint, baseUrlWithSlash);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    return url.toString();
  }

  /**
   * Execute HTTP request with retry logic
   */
  private async executeRequest<T>(
    url: string, 
    options: RequestOptions,
    context: RetryContext = { attempt: 0, startTime: Date.now() }
  ): Promise<T> {
    context.attempt++;
    
    this.log('debug', `Making request attempt ${context.attempt}`, {
      url,
      method: options.method,
      attempt: context.attempt,
      maxAttempts: this.retryConfig.maxAttempts
    });

    try {
      const response = await fetch(url, options);
      
      this.log('debug', `Received response`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      // Handle non-2xx responses
      if (!response.ok) {
        let errorBody;
        try {
          errorBody = await response.json();
        } catch {
          // If response body is not JSON, use status text
          errorBody = { message: response.statusText };
        }

        const error = createErrorFromResponse(response, errorBody);
        
        // Check if we should retry
        if (context.attempt < this.retryConfig.maxAttempts && 
            shouldRetryError(error, this.retryConfig.retryableErrors)) {
          return this.retryRequest(url, options, context, error);
        }

        throw error;
      }

      // Parse response body
      const responseBody = await response.json();
      
      this.log('debug', 'Response parsed successfully', {
        success: (responseBody as any)?.success,
        code: (responseBody as any)?.code
      });

      return ApiResponseConverter.convertApiResponse(responseBody) as T;

    } catch (error) {
      this.log('error', 'Request failed', {
        error: error instanceof Error ? error.message : String(error),
        attempt: context.attempt,
        url
      });

      // Handle fetch errors (network, timeout, etc.)
      let tuningSearchError: TuningSearchError;

      // Check for timeout/abort errors first (including DOMException)
      if ((error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError' || 
          error.message.includes('aborted') || error.message.includes('operation was aborted'))) ||
          (error instanceof DOMException && error.name === 'AbortError')) {
        tuningSearchError = new TimeoutError(`Request timed out after ${this.timeout}ms`);
      } else if (error instanceof TuningSearchError) {
        tuningSearchError = error;
      } else if (error instanceof Error) {
        tuningSearchError = new NetworkError(`Network error: ${error.message}`, error);
      } else {
        tuningSearchError = new NetworkError(`Unknown error: ${String(error)}`);
      }

      // Check if we should retry
      if (context.attempt < this.retryConfig.maxAttempts && 
          shouldRetryError(tuningSearchError, this.retryConfig.retryableErrors)) {
        return this.retryRequest(url, options, context, tuningSearchError);
      }

      throw tuningSearchError;
    }
  }

  /**
   * Handle retry logic with exponential backoff
   */
  private async retryRequest<T>(
    url: string,
    options: RequestOptions,
    context: RetryContext,
    lastError: Error
  ): Promise<T> {
    context.lastError = lastError;
    
    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.retryConfig.initialDelay * Math.pow(this.retryConfig.backoffFactor, context.attempt - 1),
      this.retryConfig.maxDelay
    );

    this.log('warn', `Request failed, retrying in ${delay}ms`, {
      attempt: context.attempt,
      maxAttempts: this.retryConfig.maxAttempts,
      error: lastError.message,
      delay
    });

    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, delay));

    // Create new timeout controller for retry
    const newOptions = {
      ...options,
      signal: this.createTimeoutController().signal
    };

    return this.executeRequest<T>(url, newOptions, context);
  }

  /**
   * Make HTTP GET request
   */
  private async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = this.buildUrl(endpoint, params);
    const controller = this.createTimeoutController();
    
    const options: RequestOptions = {
      method: 'GET',
      headers: { ...this.defaultHeaders },
      signal: controller.signal
    };

    return this.executeRequest<T>(url, options);
  }



  /**
   * Validate search parameters
   */
  private validateSearchParams(params: SearchToolArgs): void {
    const errors: string[] = [];

    if (!params.q || typeof params.q !== 'string' || params.q.trim() === '') {
      errors.push('Query parameter "q" is required and must be a non-empty string');
    }

    if (params.page !== undefined && (typeof params.page !== 'number' || params.page < 1)) {
      errors.push('Page parameter must be a positive number');
    }

    if (params.safe !== undefined && (typeof params.safe !== 'number' || params.safe < 0 || params.safe > 2)) {
      errors.push('Safe parameter must be a number between 0 and 2');
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid search parameters', errors);
    }
  }

  /**
   * Validate news search parameters
   */
  private validateNewsParams(params: NewsToolArgs): void {
    const errors: string[] = [];

    if (!params.q || typeof params.q !== 'string' || params.q.trim() === '') {
      errors.push('Query parameter "q" is required and must be a non-empty string');
    }

    if (params.page !== undefined && (typeof params.page !== 'number' || params.page < 1)) {
      errors.push('Page parameter must be a positive number');
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid news search parameters', errors);
    }
  }

  /**
   * Validate crawl parameters
   */
  private validateCrawlParams(params: CrawlToolArgs): void {
    const errors: string[] = [];

    if (!params.url || typeof params.url !== 'string' || params.url.trim() === '') {
      errors.push('URL parameter is required and must be a non-empty string');
    }

    // Basic URL validation
    if (params.url) {
      try {
        const url = new URL(params.url);
        if (!['http:', 'https:'].includes(url.protocol)) {
          errors.push('URL must use HTTP or HTTPS protocol');
        }
      } catch {
        errors.push('URL parameter must be a valid URL');
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid crawl parameters', errors);
    }
  }

  // Public API methods (to be implemented in subsequent tasks)

  /**
   * Perform web search using TuningSearch API
   */
  async search(params: SearchToolArgs): Promise<SearchResponse> {
    this.validateSearchParams(params);
    
    this.log('info', 'Performing search', { query: params.q, page: params.page });
    
    const searchParams = {
      q: params.q,
      language: params.language,
      country: params.country,
      page: params.page,
      safe: params.safe,
      timeRange: params.timeRange,
      service: params.service
    };

    return this.get<SearchResponse>('/search', searchParams);
  }

  /**
   * Perform news search using TuningSearch API
   */
  async searchNews(params: NewsToolArgs): Promise<NewsResponse> {
    this.validateNewsParams(params);
    
    this.log('info', 'Performing news search', { query: params.q, page: params.page });
    
    const searchParams = {
      q: params.q,
      language: params.language,
      country: params.country,
      page: params.page,
      timeRange: params.timeRange,
      service: params.service
    };

    return this.get<NewsResponse>('/news', searchParams);
  }

  /**
   * Crawl web page using TuningSearch API
   */
  async crawl(params: CrawlToolArgs): Promise<CrawlResponse> {
    this.validateCrawlParams(params);
    
    this.log('info', 'Crawling URL', { url: params.url });
    
    const crawlParams = {
      url: params.url,
      service: params.service
    };

    return this.get<CrawlResponse>('/crawl', crawlParams);
  }

  // Utility methods for testing and debugging

  /**
   * Get base URL (for testing)
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Get default headers (for testing)
   */
  getHeaders(): Record<string, string> {
    return { ...this.defaultHeaders };
  }

  /**
   * Get retry configuration (for testing)
   */
  getRetryConfig(): RetryConfig {
    return { ...this.retryConfig };
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      this.log('info', 'Testing API connection');
      
      // Make a simple search request to test connectivity
      await this.search({ q: 'test' });
      
      this.log('info', 'API connection test successful');
      return true;
    } catch (error) {
      this.log('error', 'API connection test failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
}