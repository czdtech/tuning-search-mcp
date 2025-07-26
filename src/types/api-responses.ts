/**
 * TuningSearch API Response Type Definitions
 * 
 * This file contains all type definitions for TuningSearch API responses
 * including SearchResponse, NewsResponse, CrawlResponse and their related models.
 */

// Base interface for all API responses
export interface BaseApiResponse {
  success: boolean;
  message?: string;
  code?: string;
}

// Search result interfaces
export interface SiteLink {
  title: string;
  url: string;
}

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  position: number;
  sitelinks?: SiteLink[];
}

export interface SearchResponse extends BaseApiResponse {
  data: {
    query?: string;
    results: SearchResult[];
    suggestions?: string[];
    totalResults?: number;
    searchTime?: number;
  };
}

// News result interfaces
export interface NewsResult {
  title: string;
  url: string;
  content: string;
  position: number;
  publishedDate?: string;
  source?: string;
  imageUrl?: string;
  category?: string;
}

export interface NewsResponse extends BaseApiResponse {
  data: {
    query: string;
    results: NewsResult[];
    totalResults?: number;
    searchTime?: number;
  };
}

// Crawl result interfaces
export interface CrawlMetadata {
  title?: string;
  description?: string;
  keywords?: string[];
  author?: string;
  publishedDate?: string;
  language?: string;
  charset?: string;
  contentType?: string;
}

export interface CrawlResult {
  content: string;
}

export interface CrawlResponse extends BaseApiResponse {
  data: CrawlResult;
}

// Union type for all API responses
export type ApiResponse = SearchResponse | NewsResponse | CrawlResponse;

// Type guards for response validation
export function isSearchResponse(response: ApiResponse): response is SearchResponse {
  return 'data' in response && 'results' in response.data && Array.isArray(response.data.results);
}

export function isNewsResponse(response: ApiResponse): response is NewsResponse {
  return 'data' in response && 'results' in response.data && Array.isArray(response.data.results);
}

export function isCrawlResponse(response: ApiResponse): response is CrawlResponse {
  return 'data' in response && 'content' in response.data;
}

// Validation functions for individual result types
export function validateSearchResult(obj: any): obj is SearchResult {
  return typeof obj === 'object' &&
         typeof obj.title === 'string' &&
         typeof obj.url === 'string' &&
         typeof obj.content === 'string' &&
         typeof obj.position === 'number' &&
         (obj.sitelinks === undefined || Array.isArray(obj.sitelinks));
}

export function validateNewsResult(obj: any): obj is NewsResult {
  return typeof obj === 'object' &&
         typeof obj.title === 'string' &&
         typeof obj.url === 'string' &&
         typeof obj.content === 'string' &&
         (obj.position === undefined || typeof obj.position === 'number') &&
         (obj.publishedDate === undefined || typeof obj.publishedDate === 'string') &&
         (obj.source === undefined || typeof obj.source === 'string');
}

export function validateCrawlResult(obj: any): obj is CrawlResult {
  return typeof obj === 'object' &&
         typeof obj.content === 'string';
}

// Response validation functions
export function validateSearchResponse(obj: any): obj is SearchResponse {
  return typeof obj === 'object' &&
         typeof obj.success === 'boolean' &&
         (obj.message === undefined || typeof obj.message === 'string') &&
         (obj.code === undefined || typeof obj.code === 'string') &&
         typeof obj.data === 'object' &&
         (obj.data.query === undefined || typeof obj.data.query === 'string') &&
         Array.isArray(obj.data.results) &&
         obj.data.results.every(validateSearchResult);
}

export function validateNewsResponse(obj: any): obj is NewsResponse {
  return typeof obj === 'object' &&
         typeof obj.success === 'boolean' &&
         (obj.message === undefined || typeof obj.message === 'string') &&
         (obj.code === undefined || typeof obj.code === 'string') &&
         typeof obj.data === 'object' &&
         (obj.data.query === undefined || typeof obj.data.query === 'string') &&
         Array.isArray(obj.data.results) &&
         obj.data.results.every(validateNewsResult);
}

export function validateCrawlResponse(obj: any): obj is CrawlResponse {
  return typeof obj === 'object' &&
         typeof obj.success === 'boolean' &&
         (obj.message === undefined || typeof obj.message === 'string') &&
         (obj.code === undefined || typeof obj.code === 'string') &&
         typeof obj.data === 'object' &&
         validateCrawlResult(obj.data);
}

// Type conversion utilities
export class ApiResponseConverter {
  /**
   * Safely converts unknown API response to typed response
   */
  static convertApiResponse(response: unknown): ApiResponse {
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid API response: not an object');
    }

    const obj = response as any;

    if (validateSearchResponse(obj)) {
      return obj as SearchResponse;
    }

    if (validateNewsResponse(obj)) {
      return obj as NewsResponse;
    }

    if (validateCrawlResponse(obj)) {
      return obj as CrawlResponse;
    }

    throw new Error('Invalid API response: does not match any known response type');
  }

  /**
   * Converts raw search results to SearchResult array
   */
  static convertSearchResults(results: unknown[]): SearchResult[] {
    return results.map((result, index) => {
      if (!validateSearchResult(result)) {
        throw new Error(`Invalid search result at index ${index}`);
      }
      return result;
    });
  }

  /**
   * Converts raw news results to NewsResult array
   */
  static convertNewsResults(results: unknown[]): NewsResult[] {
    return results.map((result, index) => {
      if (!validateNewsResult(result)) {
        throw new Error(`Invalid news result at index ${index}`);
      }
      return result;
    });
  }

  /**
   * Safely extracts and converts crawl result
   */
  static convertCrawlResult(result: unknown): CrawlResult {
    if (!validateCrawlResult(result)) {
      throw new Error('Invalid crawl result');
    }
    return result;
  }
}