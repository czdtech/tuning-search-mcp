/**
 * News Search Tool Definition for TuningSearch MCP Server
 * 
 * This file defines the tuningsearch_news tool with JSON Schema validation,
 * parameter descriptions, and usage examples for news-specific searches.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { NewsToolArgs, validateNewsToolArgs } from '../types/tool-types.js';

/**
 * News search tool definition for MCP
 */
export const newsTool: Tool = {
  name: 'tuningsearch_news',
  description: 'Search for news articles using TuningSearch API. Provides recent news results with titles, URLs, content snippets, publication dates, and source information.',
  inputSchema: {
    type: 'object',
    required: ['q'],
    properties: {
      q: {
        type: 'string',
        description: 'News search query string. Use keywords or topics to find relevant news articles.',
        minLength: 1,
        maxLength: 500,
        examples: [
          'artificial intelligence breakthrough',
          'climate change summit 2024',
          'technology earnings report',
          'election results',
          'sports championship'
        ]
      },
      language: {
        type: 'string',
        description: 'Language code for news results (ISO 639-1 format)',
        pattern: '^[a-z]{2}$',
        examples: ['en', 'zh', 'es', 'fr', 'de', 'ja', 'ko', 'pt'],
        default: 'en'
      },
      country: {
        type: 'string',
        description: 'Country code for localized news results (ISO 3166-1 alpha-2 format)',
        pattern: '^[a-z]{2}$',
        examples: ['us', 'cn', 'uk', 'ca', 'au', 'jp', 'de', 'fr'],
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
      timeRange: {
        type: 'string',
        description: 'Time range filter for news articles',
        enum: ['day', 'week', 'month', 'year'],
        examples: ['day', 'week', 'month', 'year'],
        default: 'week'
      },
      service: {
        type: 'string',
        description: 'Specific news service to use (optional)',
        examples: ['google_news', 'bing_news', 'yahoo_news']
      }
    },
    additionalProperties: false
  }
};

/**
 * Validate news tool arguments
 */
export function validateNewsArgs(args: unknown): { valid: boolean; error?: string; data?: NewsToolArgs } {
  try {
    if (!validateNewsToolArgs(args)) {
      return {
        valid: false,
        error: 'Invalid news search arguments format'
      };
    }

    const newsArgs = args as NewsToolArgs;

    // Additional validation
    if (!newsArgs.q || newsArgs.q.trim().length === 0) {
      return {
        valid: false,
        error: 'News search query (q) is required and cannot be empty'
      };
    }

    if (newsArgs.q.length > 500) {
      return {
        valid: false,
        error: 'News search query is too long (maximum 500 characters)'
      };
    }

    if (newsArgs.page && (newsArgs.page < 1 || newsArgs.page > 10)) {
      return {
        valid: false,
        error: 'Page number must be between 1 and 10'
      };
    }

    if (newsArgs.language && !/^[a-z]{2}$/.test(newsArgs.language)) {
      return {
        valid: false,
        error: 'Language code must be a valid ISO 639-1 format (e.g., en, zh, es)'
      };
    }

    if (newsArgs.country && !/^[a-z]{2}$/.test(newsArgs.country)) {
      return {
        valid: false,
        error: 'Country code must be a valid ISO 3166-1 alpha-2 format (e.g., us, cn, uk)'
      };
    }

    if (newsArgs.timeRange && !['day', 'week', 'month', 'year'].includes(newsArgs.timeRange)) {
      return {
        valid: false,
        error: 'Time range must be one of: day, week, month, year'
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
 * Usage examples for the news tool
 */
export const newsToolExamples = {
  basic: {
    description: 'Basic news search',
    input: {
      q: 'artificial intelligence'
    },
    expectedOutput: 'Returns recent news articles about artificial intelligence with titles, URLs, content snippets, and publication dates'
  },
  
  localized: {
    description: 'Localized news search with language and country',
    input: {
      q: 'economic policy',
      language: 'en',
      country: 'us'
    },
    expectedOutput: 'Returns US-specific economic policy news in English'
  },
  
  timeFiltered: {
    description: 'News search with specific time range',
    input: {
      q: 'technology earnings',
      timeRange: 'day'
    },
    expectedOutput: 'Returns technology earnings news from the past day'
  },
  
  paginated: {
    description: 'Paginated news results',
    input: {
      q: 'climate change',
      page: 2,
      timeRange: 'week'
    },
    expectedOutput: 'Returns second page of climate change news from the past week'
  },
  
  specificService: {
    description: 'News search using specific service',
    input: {
      q: 'sports championship',
      service: 'google_news',
      timeRange: 'day'
    },
    expectedOutput: 'Returns sports championship news from Google News for the past day'
  }
};

/**
 * Tool documentation
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const newsToolDocumentation = {
  name: 'tuningsearch_news',
  summary: 'Comprehensive news search using TuningSearch API',
  description: `
The tuningsearch_news tool provides specialized news search capabilities through the TuningSearch API.
It returns structured news results including titles, URLs, content snippets, publication dates, and source information.

Key features:
- News-specific search optimization
- Publication date and source information
- Localization with language and country codes
- Time-based filtering (day, week, month, year)
- Pagination support for browsing results
- Multiple news service options
- Real-time and recent news coverage

The tool is designed to provide timely and relevant news information for AI assistants through the Model Context Protocol (MCP),
ensuring users get the most current news on their topics of interest.
  `,
  parameters: {
    required: ['q'],
    optional: ['language', 'country', 'page', 'timeRange', 'service']
  },
  responseFormat: {
    type: 'text',
    structure: 'Numbered list of news articles with titles, URLs, content snippets, publication dates, and source information',
    metadata: 'Includes result count, query information, and time range'
  },
  limitations: [
    'Maximum query length: 500 characters',
    'Page range: 1-10',
    'Rate limits apply based on API key tier',
    'News availability depends on source coverage',
    'Some older news may not be available depending on time range'
  ],
  examples: newsToolExamples
};