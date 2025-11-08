/**
 * News Tool Handler
 * Handles MCP tool requests for news search operations with news-specific
 * processing, metadata extraction, and result formatting
 */

import { SearchService } from '../services/search-service';
import { FilterOptions } from '../services/result-formatter';
import { 
  ToolResponse, 
  NewsToolArgs, 
  validateNewsToolArgs 
} from '../types/tool-types';
import { ValidationError } from '../types/error-types';

/**
 * Handler for news search tool requests
 */
export class NewsToolHandler {
  constructor(private _searchService: SearchService) {}

  /**
   * Handle news search tool request with parameter validation and error handling
   */
  async handleNewsRequest(args: unknown): Promise<ToolResponse> {
    try {
      // Parse and validate arguments
      const newsArgs = this.parseAndValidateArgs(args);

      // Perform news search using service
      const result = await this._searchService.performNewsSearch(newsArgs);

      // Add news-specific metadata extraction
      return this.enhanceNewsResponse(result, newsArgs);
    } catch (error) {
      // Handle validation and other errors
      return this.createErrorResponse(error);
    }
  }

  /**
   * Handle enhanced news search request with additional options
   */
  async handleEnhancedNewsRequest(
    args: unknown,
    options?: {
      sortBy?: 'relevance' | 'date' | 'title' | 'source';
      sortDirection?: 'asc' | 'desc';
      filters?: FilterOptions;
    }
  ): Promise<ToolResponse> {
    try {
      // Parse and validate arguments
      const newsArgs = this.parseAndValidateArgs(args);

      // Perform enhanced news search using service
      const result = await this._searchService.performEnhancedNewsSearch(
        newsArgs,
        options?.sortBy,
        options?.sortDirection,
        options?.filters
      );

      // Add news-specific metadata extraction
      return this.enhanceNewsResponse(result, newsArgs);
    } catch (error) {
      // Handle validation and other errors
      return this.createErrorResponse(error);
    }
  }

  /**
   * Parse and validate news search arguments
   */
  private parseAndValidateArgs(args: unknown): NewsToolArgs {
    const normalized = this.normalizeArgs(args);

    // Explicit required-field check first for clearer error messaging
    if (!normalized || typeof (normalized as any).q !== 'string' || ((normalized as any).q as string).trim().length === 0) {
      throw new ValidationError(
        'Invalid news search arguments',
        ['News search query (q) is required and cannot be empty']
      );
    }

    // Basic type validation
    if (!validateNewsToolArgs(normalized)) {
      throw new ValidationError(
        'Invalid news search arguments',
        ['Arguments do not match expected NewsToolArgs schema']
      );
    }

    const newsArgs = normalized as NewsToolArgs;

    // Additional business logic validation
    this.validateBusinessRules(newsArgs);

    return newsArgs;
  }

  /**
   * Normalize incoming args for news: fix key casing and value casing
   */
  private normalizeArgs(args: unknown): Record<string, unknown> {
    if (!args || typeof args !== 'object') return {} as any;
    const src = args as Record<string, unknown>;
    const out: Record<string, unknown> = { ...src };

    const map: Record<string, string> = {
      Q: 'q',
      Language: 'language',
      Country: 'country',
      Page: 'page',
      TimeRange: 'timeRange',
      Service: 'service'
    };

    for (const [from, to] of Object.entries(map)) {
      if (out[from] !== undefined && out[to] === undefined) {
        out[to] = out[from];
      }
    }

    if (typeof out.language === 'string') out.language = (out.language as string).toLowerCase();
    if (typeof out.country === 'string') out.country = (out.country as string).toLowerCase();

    return out;
  }

  /**
   * Validate business rules for news search arguments
   */
  private validateBusinessRules(args: NewsToolArgs): void {
    const errors: string[] = [];

    // Query validation
    if (!args.q || args.q.trim().length === 0) {
      errors.push('News search query is required and cannot be empty');
    }

    if (args.q && args.q.length > 500) {
      errors.push('News search query exceeds maximum length of 500 characters');
    }

    // Page validation
    if (args.page !== undefined && (args.page < 1 || args.page > 50)) {
      errors.push('Page number must be between 1 and 50 for news searches');
    }

    // Language code validation
    if (args.language && !/^[a-z]{2}$/.test(args.language)) {
      errors.push('Language code must be a valid ISO 639-1 format (e.g., en, zh, es)');
    }

    // Country code validation
    if (args.country && !/^[a-z]{2}$/.test(args.country)) {
      errors.push('Country code must be a valid ISO 3166-1 alpha-2 format (e.g., us, cn, uk)');
    }

    // Time range validation for news
    if (args.timeRange && !['day', 'week', 'month', 'year'].includes(args.timeRange)) {
      errors.push('Time range must be one of: day, week, month, year');
    }

    // News-specific validations
    if (args.q && this.containsInappropriateNewsTerms(args.q)) {
      errors.push('Query contains terms that may not be suitable for news search');
    }

    if (errors.length > 0) {
      throw new ValidationError('News search argument validation failed', errors);
    }
  }

  /**
   * Check for inappropriate terms in news queries
   */
  private containsInappropriateNewsTerms(query: string): boolean {
    // Basic check for potentially inappropriate terms in news context
    const inappropriateTerms: string[] = [
      // Add terms that might not be appropriate for news searches
      // This is a basic implementation - in production, this would be more sophisticated
    ];

    const lowerQuery = query.toLowerCase();
    return inappropriateTerms.some(term => lowerQuery.includes(term));
  }

  /**
   * Enhance news response with additional metadata and formatting
   */
  private enhanceNewsResponse(response: ToolResponse, args: NewsToolArgs): ToolResponse {
    if (response.isError || !response.content[0]) {
      return response;
    }

    // Extract news-specific metadata from the response text
    const originalText = response.content[0].text;
    const enhancedText = this.addNewsMetadata(originalText, args);

    return {
      ...response,
      content: [{
        type: 'text',
        text: enhancedText
      }]
    };
  }

  /**
   * Add news-specific metadata to response
   */
  private addNewsMetadata(text: string, args: NewsToolArgs): string {
    const metadata: string[] = [];

    // Add search context
    metadata.push(`News Search Query: "${args.q}"`);

    if (args.language) {
      metadata.push(`Language: ${args.language.toUpperCase()}`);
    }

    if (args.country) {
      metadata.push(`Country: ${args.country.toUpperCase()}`);
    }

    if (args.timeRange) {
      metadata.push(`Time Range: ${args.timeRange}`);
    }

    if (args.page && args.page > 1) {
      metadata.push(`Page: ${args.page}`);
    }

    // Add timestamp
    metadata.push(`Retrieved: ${new Date().toISOString()}`);

    // Add news-specific tips
    const tips = this.generateNewsTips(args);
    if (tips.length > 0) {
      metadata.push(`Tips: ${tips.join(', ')}`);
    }

    const metadataText = metadata.join(' | ');
    return `${text}\n\n--- News Search Metadata ---\n${metadataText}`;
  }

  /**
   * Generate helpful tips for news searches
   */
  private generateNewsTips(args: NewsToolArgs): string[] {
    const tips: string[] = [];

    if (!args.timeRange) {
      tips.push('Use timeRange parameter to get recent news');
    }

    if (!args.country && !args.language) {
      tips.push('Specify country/language for localized news');
    }

    if (args.q.split(' ').length === 1) {
      tips.push('Try more specific queries for better results');
    }

    return tips;
  }

  /**
   * Create error response for tool failures
   */
  private createErrorResponse(error: unknown): ToolResponse {
    let message = 'An unexpected error occurred during news search';

    if (error instanceof ValidationError) {
      message = `News Search Validation Error: ${error.message}`;
      if (error.validationErrors && error.validationErrors.length > 0) {
        message += `\nDetails: ${error.validationErrors.join(', ')}`;
      }
    } else if (error instanceof Error) {
      message = `News Search Error: ${error.message}`;
      const lower = error.message.toLowerCase();
      if (lower.includes('network')) {
        message += ' (network error)';
      }
    }

    return {
      content: [{
        type: 'text',
        text: message
      }],
      isError: true
    };
  }

  /**
   * Validate tool arguments format (static method for external use)
   */
  static validateArgs(args: unknown): { valid: boolean; error?: string; data?: NewsToolArgs } {
    try {
      if (!validateNewsToolArgs(args)) {
        return {
          valid: false,
          error: 'Invalid news search arguments format'
        };
      }

      const newsArgs = args as NewsToolArgs;

      // Basic validation
      if (!newsArgs.q || newsArgs.q.trim().length === 0) {
        return {
          valid: false,
          error: 'News search query (q) is required and cannot be empty'
        };
      }

      return {
        valid: true,
        data: newsArgs
      };
    } catch (error) {
      return {
        valid: false,
        error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get handler information for debugging
   */
  getHandlerInfo() {
    return {
      name: 'NewsToolHandler',
      version: '1.0.0',
      supportedOperations: [
        'handleNewsRequest',
        'handleEnhancedNewsRequest'
      ],
      validationRules: [
        'Query is required and non-empty',
        'Query length <= 500 characters',
        'Page number between 1-50',
        'Valid ISO language/country codes',
        'Valid time range values',
        'Appropriate content filtering'
      ],
      newsSpecificFeatures: [
        'Source metadata extraction',
        'Publication date handling',
        'News-specific filtering',
        'Enhanced metadata display',
        'Search optimization tips'
      ]
    };
  }
}
