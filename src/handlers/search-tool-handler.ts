/**
 * Search Tool Handler
 * Handles MCP tool requests for search operations with parameter parsing,
 * validation, service integration, and response formatting
 */

import { SearchService } from '../services/search-service';
import { FilterOptions } from '../services/result-formatter';
import { 
  ToolResponse, 
  SearchToolArgs, 
  validateSearchToolArgs 
} from '../types/tool-types';
import { ValidationError } from '../types/error-types';

/**
 * Handler for search tool requests
 */
export class SearchToolHandler {
  constructor(private _searchService: SearchService) {}

  /**
   * Handle search tool request with parameter validation and error handling
   */
  async handleSearchRequest(args: unknown): Promise<ToolResponse> {
    try {
      // Parse and validate arguments
      const searchArgs = this.parseAndValidateArgs(args);

      // Perform search using service
      const result = await this._searchService.performSearch(searchArgs);

      return result;
    } catch (error) {
      // Handle validation and other errors
      return this.createErrorResponse(error);
    }
  }

  /**
   * Handle enhanced search request with additional options
   */
  async handleEnhancedSearchRequest(
    args: unknown,
    options?: {
      sortBy?: 'relevance' | 'date' | 'title';
      sortDirection?: 'asc' | 'desc';
      filters?: FilterOptions;
    }
  ): Promise<ToolResponse> {
    try {
      // Parse and validate arguments
      const searchArgs = this.parseAndValidateArgs(args);

      // Perform enhanced search using service
      const result = await this._searchService.performEnhancedSearch(
        searchArgs,
        options?.sortBy,
        options?.sortDirection,
        options?.filters
      );

      return result;
    } catch (error) {
      // Handle validation and other errors
      return this.createErrorResponse(error);
    }
  }

  /**
   * Parse and validate search arguments
   */
  private parseAndValidateArgs(args: unknown): SearchToolArgs {
    // Normalize common mixed-case or variant keys from external clients
    const normalized = this.normalizeArgs(args);

    // Explicit required-field check first for clearer error messaging
    if (!normalized || typeof (normalized as any).q !== 'string' || ((normalized as any).q as string).trim().length === 0) {
      throw new ValidationError(
        'Invalid search arguments',
        ['Search query (q) is required and cannot be empty']
      );
    }

    // Basic type validation
    if (!validateSearchToolArgs(normalized)) {
      throw new ValidationError(
        'Invalid search arguments',
        ['Arguments do not match expected SearchToolArgs schema']
      );
    }

    const searchArgs = normalized as SearchToolArgs;

    // Additional business logic validation
    this.validateBusinessRules(searchArgs);

    return searchArgs;
  }

  /**
   * Normalize incoming args: fix key casing and value casing where appropriate
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
      Safe: 'safe',
      TimeRange: 'timeRange',
      Service: 'service'
    };

    for (const [from, to] of Object.entries(map)) {
      if (out[from] !== undefined && out[to] === undefined) {
        out[to] = out[from];
      }
    }

    // Normalize value casing for language/country
    if (typeof out.language === 'string') out.language = (out.language as string).toLowerCase();
    if (typeof out.country === 'string') out.country = (out.country as string).toLowerCase();

    return out;
  }

  /**
   * Validate business rules for search arguments
   */
  private validateBusinessRules(args: SearchToolArgs): void {
    const errors: string[] = [];

    // Query validation
    if (!args.q || args.q.trim().length === 0) {
      errors.push('Search query is required and cannot be empty');
    }

    if (args.q && args.q.length > 500) {
      errors.push('Search query exceeds maximum length of 500 characters');
    }

    // Page validation
    if (args.page !== undefined && (args.page < 1 || args.page > 100)) {
      errors.push('Page number must be between 1 and 100');
    }

    // Safe search validation
    if (args.safe !== undefined && ![0, 1, 2].includes(args.safe)) {
      errors.push('Safe search level must be 0, 1, or 2');
    }

    // Language code validation
    if (args.language && !/^[a-z]{2}$/.test(args.language)) {
      errors.push('Language code must be a valid ISO 639-1 format (e.g., en, zh, es)');
    }

    // Country code validation
    if (args.country && !/^[a-z]{2}$/.test(args.country)) {
      errors.push('Country code must be a valid ISO 3166-1 alpha-2 format (e.g., us, cn, uk)');
    }

    // Time range validation
    if (args.timeRange && !['day', 'week', 'month', 'year'].includes(args.timeRange)) {
      errors.push('Time range must be one of: day, week, month, year');
    }

    if (errors.length > 0) {
      throw new ValidationError('Search argument validation failed', errors);
    }
  }

  /**
   * Create error response for tool failures
   */
  private createErrorResponse(error: unknown): ToolResponse {
    let message = 'An unexpected error occurred during search';

    if (error instanceof ValidationError) {
      message = `Validation Error: ${error.message}`;
      if (error.validationErrors && error.validationErrors.length > 0) {
        message += `\nDetails: ${error.validationErrors.join(', ')}`;
      }
    } else if (error instanceof Error) {
      message = `Search Error: ${error.message}`;
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
  static validateArgs(args: unknown): { valid: boolean; error?: string; data?: SearchToolArgs } {
    try {
      if (!validateSearchToolArgs(args)) {
        return {
          valid: false,
          error: 'Invalid search arguments format'
        };
      }

      const searchArgs = args as SearchToolArgs;

      // Basic validation
      if (!searchArgs.q || searchArgs.q.trim().length === 0) {
        return {
          valid: false,
          error: 'Search query (q) is required and cannot be empty'
        };
      }

      return {
        valid: true,
        data: searchArgs
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
      name: 'SearchToolHandler',
      version: '1.0.0',
      supportedOperations: [
        'handleSearchRequest',
        'handleEnhancedSearchRequest'
      ],
      validationRules: [
        'Query is required and non-empty',
        'Query length <= 500 characters',
        'Page number between 1-100',
        'Safe search level 0-2',
        'Valid ISO language/country codes',
        'Valid time range values'
      ]
    };
  }
}
