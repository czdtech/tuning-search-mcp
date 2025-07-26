/**
 * Search Service
 * Business logic for handling search operations with parameter validation,
 * preprocessing, API client integration, and error handling
 */

import { TuningSearchClient } from '../clients/tuningsearch-client';
import { 
  SearchToolArgs, 
  NewsToolArgs, 
  CrawlToolArgs, 
  ToolResponse,
  ToolResponseConverter,
  validateSearchToolArgs,
  validateNewsToolArgs,
  validateCrawlToolArgs
} from '../types/tool-types';
import { 
  SearchResponse, 
  NewsResponse, 
  CrawlResponse 
} from '../types/api-responses';
import { 
  ValidationError,
  ServerError
} from '../types/error-types';
import { ErrorHandler } from './error-handler';
import { ResultFormatter, FilterOptions, SortOption, SortDirection } from './result-formatter';
import { CacheService } from './cache-service';
import { PerformanceMonitor } from './performance-monitor';

/**
 * Search service configuration
 */
export interface SearchServiceConfig {
  /** Maximum query length allowed */
  maxQueryLength: number;
  /** Default page size for results */
  defaultPageSize: number;
  /** Maximum page number allowed */
  maxPage: number;
  /** Allowed time ranges */
  allowedTimeRanges: string[];
  /** Allowed safe search levels */
  allowedSafeLevels: number[];
  /** Enable query preprocessing */
  enablePreprocessing: boolean;
  /** Enable result validation */
  enableResultValidation: boolean;
}

/**
 * Default search service configuration
 */
export const DEFAULT_SEARCH_SERVICE_CONFIG: SearchServiceConfig = {
  maxQueryLength: 500,
  defaultPageSize: 10,
  maxPage: 100,
  allowedTimeRanges: ['day', 'week', 'month', 'year'],
  allowedSafeLevels: [0, 1, 2],
  enablePreprocessing: true,
  enableResultValidation: true
};

/**
 * Search statistics for monitoring
 */
export interface SearchStats {
  totalSearches: number;
  totalNewsSearches: number;
  totalCrawls: number;
  successfulSearches: number;
  failedSearches: number;
  averageResponseTime: number;
  lastSearchTime?: Date;
}

/**
 * Search Service
 * Handles all search-related business logic including parameter validation,
 * preprocessing, API client integration, and error handling
 */
export class SearchService {
  private config: SearchServiceConfig;
  private errorHandler: ErrorHandler;
  private resultFormatter: ResultFormatter;
  private cacheService: CacheService;
  private performanceMonitor: PerformanceMonitor;
  private stats: SearchStats;

  constructor(
    private _client: TuningSearchClient,
    config: Partial<SearchServiceConfig> = {},
    errorHandler?: ErrorHandler,
    resultFormatter?: ResultFormatter,
    cacheService?: CacheService,
    performanceMonitor?: PerformanceMonitor
  ) {
    this.config = { ...DEFAULT_SEARCH_SERVICE_CONFIG, ...config };
    this.errorHandler = errorHandler || new ErrorHandler();
    this.resultFormatter = resultFormatter || new ResultFormatter();
    this.cacheService = cacheService || new CacheService();
    this.performanceMonitor = performanceMonitor || new PerformanceMonitor();
    this.stats = {
      totalSearches: 0,
      totalNewsSearches: 0,
      totalCrawls: 0,
      successfulSearches: 0,
      failedSearches: 0,
      averageResponseTime: 0
    };
  }

  /**
   * Perform web search with validation and error handling
   */
  async performSearch(args: SearchToolArgs): Promise<ToolResponse> {
    return this.performEnhancedSearch(args);
  }

  /**
   * Perform enhanced web search with sorting and filtering options
   */
  async performEnhancedSearch(
    args: SearchToolArgs,
    sortBy?: SortOption,
    sortDirection: SortDirection = 'desc',
    filters?: FilterOptions
  ): Promise<ToolResponse> {
    const context = `search query: "${args.q}"`;
    const startTime = Date.now();
    
    try {
      // Update statistics
      this.stats.totalSearches++;
      this.stats.lastSearchTime = new Date();

      // Validate arguments
      this.validateSearchArgs(args);

      // Preprocess arguments
      const processedArgs = this.preprocessSearchArgs(args);

      // Check cache first
      let response = await this.cacheService.getSearchResponse(processedArgs);
      let fromCache = true;

      if (!response) {
        // Cache miss - call API
        fromCache = false;
        response = await this._client.search(processedArgs);

        // Validate response if enabled
        if (this.config.enableResultValidation && response) {
          this.validateSearchResponse(response);
        }

        // Cache the response
        if (response) {
          await this.cacheService.setSearchResponse(processedArgs, response);
        }
      }

      // Update success statistics
      this.stats.successfulSearches++;
      this.updateResponseTime(startTime);
      
      // Record successful operation
      this.performanceMonitor.recordOperation('search', Date.now() - startTime, true);

      // Use enhanced formatter
      if (!response) {
        throw new ServerError('Search response is null', 500);
      }

      const result = this.resultFormatter.formatSearchResponse(response, sortBy, sortDirection, filters);
      
      // Add cache indicator to result if from cache
      if (fromCache && result.content[0]) {
        result.content[0].text += '\n\n[Cached result]';
      }

      return result;

    } catch (error) {
      // Update failure statistics
      this.stats.failedSearches++;
      this.updateResponseTime(startTime);
      
      // Record failed operation
      this.performanceMonitor.recordOperation('search', Date.now() - startTime, false);

      // Handle error and return error response
      const formattedError = this.errorHandler.handleError(error, context);
      return ToolResponseConverter.createErrorResponse(formattedError.message);
    }
  }

  /**
   * Perform news search with validation and error handling
   */
  async performNewsSearch(args: NewsToolArgs): Promise<ToolResponse> {
    return this.performEnhancedNewsSearch(args);
  }

  /**
   * Perform enhanced news search with sorting and filtering options
   */
  async performEnhancedNewsSearch(
    args: NewsToolArgs,
    sortBy?: SortOption,
    sortDirection: SortDirection = 'desc',
    filters?: FilterOptions
  ): Promise<ToolResponse> {
    const context = `news search query: "${args.q}"`;
    const startTime = Date.now();
    
    try {
      // Update statistics
      this.stats.totalNewsSearches++;
      this.stats.lastSearchTime = new Date();

      // Validate arguments
      this.validateNewsArgs(args);

      // Preprocess arguments
      const processedArgs = this.preprocessNewsArgs(args);

      // Check cache first
      let response = await this.cacheService.getNewsResponse(processedArgs);
      let fromCache = true;

      if (!response) {
        // Cache miss - call API
        fromCache = false;
        response = await this._client.searchNews(processedArgs);

        // Validate response if enabled
        if (this.config.enableResultValidation && response) {
          this.validateNewsResponse(response);
        }

        // Cache the response
        if (response) {
          await this.cacheService.setNewsResponse(processedArgs, response);
        }
      }

      // Update success statistics
      this.stats.successfulSearches++;
      this.updateResponseTime(startTime);
      
      // Record successful operation
      this.performanceMonitor.recordOperation('news_search', Date.now() - startTime, true);

      // Use enhanced formatter
      if (!response) {
        throw new ServerError('News response is null', 500);
      }

      const result = this.resultFormatter.formatNewsResponse(response, sortBy, sortDirection, filters);
      
      // Add cache indicator to result if from cache
      if (fromCache && result.content[0]) {
        result.content[0].text += '\n\n[Cached result]';
      }

      return result;

    } catch (error) {
      // Update failure statistics
      this.stats.failedSearches++;
      this.updateResponseTime(startTime);
      
      // Record failed operation
      this.performanceMonitor.recordOperation('news_search', Date.now() - startTime, false);

      // Handle error and return error response
      const formattedError = this.errorHandler.handleError(error, context);
      return ToolResponseConverter.createErrorResponse(formattedError.message);
    }
  }

  /**
   * Perform web crawl with validation and error handling
   */
  async performCrawl(args: CrawlToolArgs): Promise<ToolResponse> {
    const context = `crawl URL: "${args.url}"`;
    const startTime = Date.now();
    
    try {
      // Update statistics
      this.stats.totalCrawls++;
      this.stats.lastSearchTime = new Date();

      // Validate arguments
      this.validateCrawlArgs(args);

      // Preprocess arguments
      const processedArgs = this.preprocessCrawlArgs(args);

      // Check cache first
      let response = await this.cacheService.getCrawlResponse(processedArgs);
      let fromCache = true;

      if (!response) {
        // Cache miss - call API
        fromCache = false;
        response = await this._client.crawl(processedArgs);

        // Validate response if enabled
        if (this.config.enableResultValidation && response) {
          this.validateCrawlResponse(response);
        }

        // Cache the response
        if (response) {
          await this.cacheService.setCrawlResponse(processedArgs, response);
        }
      }

      // Update success statistics
      this.stats.successfulSearches++;
      this.updateResponseTime(startTime);
      
      // Record successful operation
      this.performanceMonitor.recordOperation('crawl', Date.now() - startTime, true);

      // Use enhanced formatter
      if (!response) {
        throw new ServerError('Crawl response is null', 500);
      }

      const result = this.resultFormatter.formatCrawlResponse(response);
      
      // Add cache indicator to result if from cache
      if (fromCache && result.content[0]) {
        result.content[0].text += '\n\n[Cached result]';
      }

      return result;

    } catch (error) {
      // Update failure statistics
      this.stats.failedSearches++;
      this.updateResponseTime(startTime);
      
      // Record failed operation
      this.performanceMonitor.recordOperation('crawl', Date.now() - startTime, false);

      // Handle error and return error response
      const formattedError = this.errorHandler.handleError(error, context);
      return ToolResponseConverter.createErrorResponse(formattedError.message);
    }
  }

  /**
   * Validate search arguments with business rules
   */
  private validateSearchArgs(args: SearchToolArgs): void {
    // Basic type validation
    if (!validateSearchToolArgs(args)) {
      throw new ValidationError('Invalid search arguments', ['Arguments do not match expected schema']);
    }

    const errors: string[] = [];

    // Query validation
    if (args.q.length > this.config.maxQueryLength) {
      errors.push(`Query length exceeds maximum of ${this.config.maxQueryLength} characters`);
    }

    // Page validation
    if (args.page !== undefined && args.page > this.config.maxPage) {
      errors.push(`Page number exceeds maximum of ${this.config.maxPage}`);
    }

    // Safe search validation
    if (args.safe !== undefined && !this.config.allowedSafeLevels.includes(args.safe)) {
      errors.push(`Safe search level must be one of: ${this.config.allowedSafeLevels.join(', ')}`);
    }

    // Time range validation
    if (args.timeRange !== undefined && !this.config.allowedTimeRanges.includes(args.timeRange)) {
      errors.push(`Time range must be one of: ${this.config.allowedTimeRanges.join(', ')}`);
    }

    if (errors.length > 0) {
      throw new ValidationError('Search argument validation failed', errors);
    }
  }

  /**
   * Validate news search arguments with business rules
   */
  private validateNewsArgs(args: NewsToolArgs): void {
    // Basic type validation
    if (!validateNewsToolArgs(args)) {
      throw new ValidationError('Invalid news search arguments', ['Arguments do not match expected schema']);
    }

    const errors: string[] = [];

    // Query validation
    if (args.q.length > this.config.maxQueryLength) {
      errors.push(`Query length exceeds maximum of ${this.config.maxQueryLength} characters`);
    }

    // Page validation
    if (args.page !== undefined && args.page > this.config.maxPage) {
      errors.push(`Page number exceeds maximum of ${this.config.maxPage}`);
    }

    // Time range validation
    if (args.timeRange !== undefined && !this.config.allowedTimeRanges.includes(args.timeRange)) {
      errors.push(`Time range must be one of: ${this.config.allowedTimeRanges.join(', ')}`);
    }

    if (errors.length > 0) {
      throw new ValidationError('News search argument validation failed', errors);
    }
  }

  /**
   * Validate crawl arguments with business rules
   */
  private validateCrawlArgs(args: CrawlToolArgs): void {
    // Basic type validation
    if (!validateCrawlToolArgs(args)) {
      throw new ValidationError('Invalid crawl arguments', ['Arguments do not match expected schema']);
    }

    const errors: string[] = [];

    // URL validation
    try {
      const url = new URL(args.url);
      
      // Protocol validation
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push('URL must use HTTP or HTTPS protocol');
      }

      // Domain validation (basic security check)
      if (url.hostname === 'localhost' || url.hostname.startsWith('127.') || url.hostname.startsWith('192.168.')) {
        errors.push('Cannot crawl local or private network URLs');
      }

    } catch {
      errors.push('Invalid URL format');
    }

    if (errors.length > 0) {
      throw new ValidationError('Crawl argument validation failed', errors);
    }
  }

  /**
   * Preprocess search arguments
   */
  private preprocessSearchArgs(args: SearchToolArgs): SearchToolArgs {
    if (!this.config.enablePreprocessing) {
      return args;
    }

    return {
      ...args,
      q: args.q.trim(),
      page: args.page || 1,
      safe: args.safe !== undefined ? args.safe : 0
    };
  }

  /**
   * Preprocess news search arguments
   */
  private preprocessNewsArgs(args: NewsToolArgs): NewsToolArgs {
    if (!this.config.enablePreprocessing) {
      return args;
    }

    return {
      ...args,
      q: args.q.trim(),
      page: args.page || 1
    };
  }

  /**
   * Preprocess crawl arguments
   */
  private preprocessCrawlArgs(args: CrawlToolArgs): CrawlToolArgs {
    if (!this.config.enablePreprocessing) {
      return args;
    }

    return {
      ...args,
      url: args.url.trim()
    };
  }

  /**
   * Validate search response
   */
  private validateSearchResponse(response: SearchResponse): void {
    if (!response.success) {
      throw new ServerError(`Search failed: ${response.message}`, 400);
    }

    if (!response.data || !Array.isArray(response.data.results)) {
      throw new ValidationError('Invalid search response format', ['Response data is missing or malformed']);
    }
  }

  /**
   * Validate news response
   */
  private validateNewsResponse(response: NewsResponse): void {
    if (!response.success) {
      throw new ServerError(`News search failed: ${response.message}`, 400);
    }

    if (!response.data || !Array.isArray(response.data.results)) {
      throw new ValidationError('Invalid news response format', ['Response data is missing or malformed']);
    }
  }

  /**
   * Validate crawl response
   */
  private validateCrawlResponse(response: CrawlResponse): void {
    // Check if response has success field and it's false
    if (response.success === false) {
      throw new ServerError(`Crawl failed: ${response.message}`, 400);
    }

    // Check for content in data field or direct content field
    if (!response.data || !response.data.content) {
      throw new ValidationError('Invalid crawl response format', ['Response data is missing or malformed']);
    }
  }

  /**
   * Update average response time statistics
   */
  private updateResponseTime(startTime: number): void {
    const responseTime = Date.now() - startTime;
    const totalRequests = this.stats.totalSearches + this.stats.totalNewsSearches + this.stats.totalCrawls;
    
    if (totalRequests === 1) {
      this.stats.averageResponseTime = responseTime;
    } else {
      // Calculate running average
      this.stats.averageResponseTime = 
        (this.stats.averageResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
    }
  }

  /**
   * Get search statistics
   */
  getStats(): SearchStats {
    return { ...this.stats };
  }

  /**
   * Reset search statistics
   */
  resetStats(): void {
    this.stats = {
      totalSearches: 0,
      totalNewsSearches: 0,
      totalCrawls: 0,
      successfulSearches: 0,
      failedSearches: 0,
      averageResponseTime: 0
    };
  }

  /**
   * Update service configuration
   */
  updateConfig(config: Partial<SearchServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): SearchServiceConfig {
    return { ...this.config };
  }

  /**
   * Test service connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      const testArgs: SearchToolArgs = { q: 'test connection' };
      const result = await this.performSearch(testArgs);
      return !result.isError;
    } catch {
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cacheService.getStats();
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return this.performanceMonitor.getAllMetrics();
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    return this.performanceMonitor.getSummary();
  }

  /**
   * Get system metrics
   */
  getSystemMetrics() {
    return this.performanceMonitor.getSystemMetrics();
  }

  /**
   * Get performance alerts
   */
  getPerformanceAlerts(since?: number) {
    return this.performanceMonitor.getAlerts(since);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cacheService.clear();
  }

  /**
   * Invalidate search cache
   */
  invalidateSearchCache(): number {
    return this.cacheService.invalidateSearchCache();
  }

  /**
   * Invalidate news cache
   */
  invalidateNewsCache(): number {
    return this.cacheService.invalidateNewsCache();
  }

  /**
   * Invalidate crawl cache
   */
  invalidateCrawlCache(): number {
    return this.cacheService.invalidateCrawlCache();
  }

  /**
   * Get cache health
   */
  getCacheHealth() {
    return this.cacheService.getHealth();
  }

  /**
   * Cleanup expired cache entries
   */
  cleanupCache(): number {
    return this.cacheService.cleanup();
  }

  /**
   * Get comprehensive service health report
   */
  getHealthReport() {
    const cacheHealth = this.getCacheHealth();
    const performanceSummary = this.getPerformanceSummary();
    const cacheStats = this.getCacheStats();
    const systemMetrics = this.getSystemMetrics();

    return {
      overall: performanceSummary.systemHealth,
      cache: cacheHealth,
      performance: performanceSummary,
      system: systemMetrics,
      statistics: this.getStats(),
      recommendations: this.generateRecommendations(cacheHealth, performanceSummary, cacheStats)
    };
  }

  /**
   * Generate performance and optimization recommendations
   */
  private generateRecommendations(cacheHealth: any, performanceSummary: any, cacheStats: any): string[] {
    const recommendations: string[] = [];

    // Cache recommendations
    if (cacheStats.hitRatio < 0.5) {
      recommendations.push('Consider increasing cache TTL to improve hit ratio');
    }
    
    if (cacheHealth.status === 'warning' || cacheHealth.status === 'critical') {
      recommendations.push(...cacheHealth.recommendations);
    }

    // Performance recommendations
    if (performanceSummary.averageResponseTime > 2000) {
      recommendations.push('Average response time is high - consider optimizing API calls or increasing cache TTL');
    }

    if (performanceSummary.overallSuccessRate < 0.95) {
      recommendations.push('Success rate is below 95% - investigate error patterns and improve error handling');
    }

    if (performanceSummary.activeAlerts > 0) {
      recommendations.push(`${performanceSummary.activeAlerts} active performance alerts - review and address issues`);
    }

    // Memory recommendations
    const memoryUsageMB = cacheStats.memoryUsage / (1024 * 1024);
    if (memoryUsageMB > 50) {
      recommendations.push(`Cache memory usage is ${memoryUsageMB.toFixed(1)}MB - consider reducing cache size or TTL`);
    }

    return recommendations;
  }
}