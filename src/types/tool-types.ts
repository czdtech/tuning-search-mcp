/**
 * MCP Tool Types for TuningSearch
 * 
 * This file contains type definitions for MCP tool parameters and responses
 * including SearchToolArgs, NewsToolArgs, CrawlToolArgs and ToolResponse.
 */

import { SearchResponse, NewsResponse, CrawlResponse } from './api-responses';

/**
 * Base interface for all tool arguments
 */
export interface BaseToolArgs {
  service?: string; // Optional service parameter for all tools
}

/**
 * Arguments for the search tool
 */
export interface SearchToolArgs extends BaseToolArgs {
  q: string;                    // Search query (required)
  language?: string;            // Language code (optional)
  country?: string;             // Country code (optional)
  page?: number;                // Page number (optional, default: 1)
  safe?: number;                // Safe search level (optional, default: 0)
  timeRange?: string;           // Time range (optional)
}

/**
 * Arguments for the news search tool
 */
export interface NewsToolArgs extends BaseToolArgs {
  q: string;                    // News search query (required)
  language?: string;            // Language code (optional)
  country?: string;             // Country code (optional)
  page?: number;                // Page number (optional, default: 1)
  timeRange?: string;           // Time range (optional)
}

/**
 * Arguments for the web crawl tool
 */
export interface CrawlToolArgs extends BaseToolArgs {
  url: string;                  // URL to crawl (required)
}

/**
 * Union type for all tool arguments
 */
export type ToolArgs = SearchToolArgs | NewsToolArgs | CrawlToolArgs;

/**
 * MCP Tool Response format
 */
export interface ToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

/**
 * Tool response with metadata
 */
export interface ToolResponseWithMetadata extends ToolResponse {
  metadata?: {
    totalResults?: number;
    searchTime?: number;
    query?: string;
    page?: number;
    url?: string;
  };
}

/**
 * Parameter validation schemas for MCP tools
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const SearchToolSchema = {
  type: 'object',
  required: ['q'],
  properties: {
    q: { type: 'string', description: 'Search query' },
    language: { type: 'string', description: 'Language code (e.g., en, zh, es)' },
    country: { type: 'string', description: 'Country code (e.g., us, cn, uk)' },
    page: { type: 'number', description: 'Page number', default: 1 },
    safe: { type: 'number', description: 'Safe search level (0-2)', default: 0 },
    timeRange: { 
      type: 'string', 
      description: 'Time range for search results',
      enum: ['day', 'week', 'month', 'year']
    },
    service: { type: 'string', description: 'Search service to use' }
  }
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const NewsToolSchema = {
  type: 'object',
  required: ['q'],
  properties: {
    q: { type: 'string', description: 'News search query' },
    language: { type: 'string', description: 'Language code (e.g., en, zh, es)' },
    country: { type: 'string', description: 'Country code (e.g., us, cn, uk)' },
    page: { type: 'number', description: 'Page number', default: 1 },
    timeRange: { 
      type: 'string', 
      description: 'Time range for news results',
      enum: ['day', 'week', 'month', 'year']
    },
    service: { type: 'string', description: 'News service to use' }
  }
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const CrawlToolSchema = {
  type: 'object',
  required: ['url'],
  properties: {
    url: { 
      type: 'string', 
      description: 'URL to crawl',
      format: 'uri'
    },
    service: { type: 'string', description: 'Crawl service to use' }
  }
};

/**
 * Validation functions for tool arguments
 */
export function validateSearchToolArgs(args: unknown): args is SearchToolArgs {
  if (!args || typeof args !== 'object') return false;
  const obj = args as any;
  
  return typeof obj.q === 'string' && obj.q.trim() !== '' &&
         (obj.language === undefined || typeof obj.language === 'string') &&
         (obj.country === undefined || typeof obj.country === 'string') &&
         (obj.page === undefined || typeof obj.page === 'number') &&
         (obj.safe === undefined || typeof obj.safe === 'number') &&
         (obj.timeRange === undefined || typeof obj.timeRange === 'string') &&
         (obj.service === undefined || typeof obj.service === 'string');
}

export function validateNewsToolArgs(args: unknown): args is NewsToolArgs {
  if (!args || typeof args !== 'object') return false;
  const obj = args as any;
  
  return typeof obj.q === 'string' && obj.q.trim() !== '' &&
         (obj.language === undefined || typeof obj.language === 'string') &&
         (obj.country === undefined || typeof obj.country === 'string') &&
         (obj.page === undefined || typeof obj.page === 'number') &&
         (obj.timeRange === undefined || typeof obj.timeRange === 'string') &&
         (obj.service === undefined || typeof obj.service === 'string');
}

export function validateCrawlToolArgs(args: unknown): args is CrawlToolArgs {
  if (!args || typeof args !== 'object') return false;
  const obj = args as any;
  
  return typeof obj.url === 'string' && obj.url.trim() !== '' &&
         (obj.service === undefined || typeof obj.service === 'string');
}

/**
 * Utility functions for converting API responses to tool responses
 */
export class ToolResponseConverter {
  /**
   * Convert search response to MCP tool response
   */
  static fromSearchResponse(response: SearchResponse): ToolResponse {
    const results = response.data.results.map((result, index) => {
      return `${index + 1}. ${result.title}\n   ${result.url}\n   ${result.content}`;
    }).join('\n\n');
    
    const suggestions = response.data.suggestions?.length 
      ? `\n\nSuggested searches: ${response.data.suggestions.join(', ')}` 
      : '';
    
    const metadata = `\n\nFound ${response.data.results.length} results for "${response.data.query}"`;
    
    return {
      content: [{
        type: 'text',
        text: results + suggestions + metadata
      }],
      isError: !response.success
    };
  }
  
  /**
   * Convert news response to MCP tool response
   */
  static fromNewsResponse(response: NewsResponse): ToolResponse {
    const results = response.data.results.map((result, index) => {
      const source = result.source ? `Source: ${result.source}` : '';
      const date = result.publishedDate ? `Date: ${result.publishedDate}` : '';
      const sourceInfo = [source, date].filter(Boolean).join(' | ');
      
      return `${index + 1}. ${result.title}\n   ${result.url}\n   ${sourceInfo ? sourceInfo + '\n   ' : ''}${result.content}`;
    }).join('\n\n');
    
    const metadata = `\n\nFound ${response.data.results.length} news results for "${response.data.query}"`;
    
    return {
      content: [{
        type: 'text',
        text: results + metadata
      }],
      isError: !response.success
    };
  }
  
  /**
   * Convert crawl response to MCP tool response
   */
  static fromCrawlResponse(response: CrawlResponse): ToolResponse {
    const result = response.data;
    
    // Simplified CrawlResult only has content field
    const content = result.content;
    
    return {
      content: [{
        type: 'text',
        text: content
      }],
      isError: !response.success
    };
  }
  
  /**
   * Create error tool response
   */
  static createErrorResponse(message: string): ToolResponse {
    return {
      content: [{
        type: 'text',
        text: `Error: ${message}`
      }],
      isError: true
    };
  }
}