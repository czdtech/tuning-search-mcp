/**
 * Search Tool Definition for TuningSearch MCP Server
 * 
 * This file defines the tuningsearch_search tool with JSON Schema validation,
 * parameter descriptions, and usage examples.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SearchToolArgs, validateSearchToolArgs } from '../types/tool-types.js';

/**
 * Search tool definition for MCP
 */
export const searchTool: Tool = {
  name: 'tuningsearch_search',
  description: 'Search the web using TuningSearch API. Provides comprehensive web search results with titles, URLs, content snippets, and optional suggestions.',
  inputSchema: {
    type: 'object',
    required: ['q'],
    properties: {
      q: {
        type: 'string',
        description: 'Search query string. Use natural language or specific keywords.',
        minLength: 1,
        maxLength: 500,
        examples: [
          'latest AI developments',
          'TypeScript best practices',
          'climate change 2024'
        ]
      },
      language: {
        type: 'string',
        description: 'Language code for search results (ISO 639-1 format)',
        pattern: '^[a-z]{2}$',
        examples: ['en', 'zh', 'es', 'fr', 'de', 'ja'],
        default: 'en'
      },
      country: {
        type: 'string',
        description: 'Country code for localized results (ISO 3166-1 alpha-2 format)',
        pattern: '^[a-z]{2}$',
        examples: ['us', 'cn', 'uk', 'ca', 'au', 'jp'],
        default: 'us'
      },
      page: {
        type: 'integer',
        description: 'Page number for pagination (1-based indexing)',
        minimum: 1,
        maximum: 10,
        default: 1,
        examples: [1, 2, 3]
      },
      safe: {
        type: 'integer',
        description: 'Safe search level: 0 = off, 1 = moderate, 2 = strict',
        minimum: 0,
        maximum: 2,
        default: 0,
        examples: [0, 1, 2]
      },
      timeRange: {
        type: 'string',
        description: 'Time range filter for search results',
        enum: ['day', 'week', 'month', 'year'],
        examples: ['day', 'week', 'month', 'year']
      },
      service: {
        type: 'string',
        description: 'Specific search service to use (optional)',
        examples: ['google', 'bing', 'duckduckgo']
      }
    },
    additionalProperties: false
  }
};

/**
 * Validate search tool arguments
 */
export function validateSearchArgs(args: unknown): { valid: boolean; error?: string; data?: SearchToolArgs } {
  try {
    if (!validateSearchToolArgs(args)) {
      return {
        valid: false,
        error: 'Invalid search arguments format'
      };
    }

    const searchArgs = args as SearchToolArgs;

    // Additional validation
    if (!searchArgs.q || searchArgs.q.trim().length === 0) {
      return {
        valid: false,
        error: 'Search query (q) is required and cannot be empty'
      };
    }

    if (searchArgs.q.length > 500) {
      return {
        valid: false,
        error: 'Search query is too long (maximum 500 characters)'
      };
    }

    if (searchArgs.page && (searchArgs.page < 1 || searchArgs.page > 10)) {
      return {
        valid: false,
        error: 'Page number must be between 1 and 10'
      };
    }

    if (searchArgs.safe !== undefined && (searchArgs.safe < 0 || searchArgs.safe > 2)) {
      return {
        valid: false,
        error: 'Safe search level must be 0, 1, or 2'
      };
    }

    if (searchArgs.language && !/^[a-z]{2}$/.test(searchArgs.language)) {
      return {
        valid: false,
        error: 'Language code must be a valid ISO 639-1 format (e.g., en, zh, es)'
      };
    }

    if (searchArgs.country && !/^[a-z]{2}$/.test(searchArgs.country)) {
      return {
        valid: false,
        error: 'Country code must be a valid ISO 3166-1 alpha-2 format (e.g., us, cn, uk)'
      };
    }

    if (searchArgs.timeRange && !['day', 'week', 'month', 'year'].includes(searchArgs.timeRange)) {
      return {
        valid: false,
        error: 'Time range must be one of: day, week, month, year'
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
 * Usage examples for the search tool
 */
export const searchToolExamples = {
  basic: {
    description: 'Basic web search',
    input: {
      q: 'TypeScript tutorial'
    },
    expectedOutput: 'Returns web search results for TypeScript tutorials with titles, URLs, and content snippets'
  },
  
  localized: {
    description: 'Localized search with language and country',
    input: {
      q: 'weather forecast',
      language: 'en',
      country: 'us'
    },
    expectedOutput: 'Returns US-specific weather forecast results in English'
  },
  
  timeFiltered: {
    description: 'Search with time range filter',
    input: {
      q: 'AI news',
      timeRange: 'week'
    },
    expectedOutput: 'Returns AI news from the past week'
  },
  
  paginated: {
    description: 'Paginated search results',
    input: {
      q: 'machine learning',
      page: 2
    },
    expectedOutput: 'Returns second page of machine learning search results'
  },
  
  safeSearch: {
    description: 'Safe search enabled',
    input: {
      q: 'educational content',
      safe: 2
    },
    expectedOutput: 'Returns educational content with strict safe search filtering'
  }
};

/**
 * Tool documentation
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const searchToolDocumentation = {
  name: 'tuningsearch_search',
  summary: 'Comprehensive web search using TuningSearch API',
  description: `
The tuningsearch_search tool provides powerful web search capabilities through the TuningSearch API.
It returns structured search results including titles, URLs, content snippets, and optional search suggestions.

Key features:
- Natural language query support
- Localization with language and country codes
- Time-based filtering (day, week, month, year)
- Safe search controls
- Pagination support
- Multiple search service options

The tool is designed to integrate seamlessly with AI assistants through the Model Context Protocol (MCP),
providing reliable and comprehensive web search functionality.
  `,
  parameters: {
    required: ['q'],
    optional: ['language', 'country', 'page', 'safe', 'timeRange', 'service']
  },
  responseFormat: {
    type: 'text',
    structure: 'Numbered list of search results with titles, URLs, and content snippets',
    metadata: 'Includes result count, query information, and optional search suggestions'
  },
  limitations: [
    'Maximum query length: 500 characters',
    'Page range: 1-10',
    'Rate limits apply based on API key tier',
    'Some content may be filtered based on safe search settings'
  ],
  examples: searchToolExamples
};