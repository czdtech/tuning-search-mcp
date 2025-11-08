/**
 * Web Crawl Tool Definition for TuningSearch MCP Server
 * 
 * This file defines the tuningsearch_crawl tool with JSON Schema validation,
 * URL validation and security checks, and usage examples for web page crawling.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { CrawlToolArgs, validateCrawlToolArgs } from '../types/tool-types.js';

/**
 * Web crawl tool definition for MCP
 */
export const crawlTool: Tool = {
  name: 'tuningsearch_crawl',
  description: 'Crawl and extract content from web pages using TuningSearch API. Provides clean text content, metadata, and structured information from web pages.',
  inputSchema: {
    type: 'object',
    required: ['url'],
    properties: {
      url: {
        type: 'string',
        description: 'URL of the web page to crawl and extract content from',
        format: 'uri',
        pattern: '^https?://.+',
        minLength: 10,
        maxLength: 2000,
        examples: [
          'https://example.com/article',
          'https://blog.example.com/post/123',
          'https://news.example.com/breaking-news',
          'https://docs.example.com/guide'
        ]
      },
      service: {
        type: 'string',
        description: 'Specific crawling service to use (optional)',
        examples: ['default', 'readability', 'mercury']
      }
    },
    additionalProperties: false
  }
};

/**
 * URL validation and security checks
 */
export function validateUrl(url: string): { valid: boolean; error?: string } {
  try {
    // Basic URL format validation
    const urlObj = new URL(url);
    
    // Additional validation for suspicious URLs
    if (url.includes('..') || url.includes('/.') || url.endsWith('.')) {
      return {
        valid: false,
        error: 'Invalid URL format'
      };
    }
    
    // Protocol validation - only allow HTTP and HTTPS
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return {
        valid: false,
        error: 'Only HTTP and HTTPS protocols are allowed'
      };
    }
    
    // Hostname validation - prevent localhost and private IPs
    const hostname = urlObj.hostname.toLowerCase();
    
    // Block localhost variations
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]') {
      return {
        valid: false,
        error: 'Localhost URLs are not allowed for security reasons'
      };
    }
    
    // Block private IP ranges (basic check)
    const privateIpPatterns = [
      /^10\./,           // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // 172.16.0.0/12
      /^192\.168\./,     // 192.168.0.0/16
      /^169\.254\./      // 169.254.0.0/16 (link-local)
    ];
    
    for (const pattern of privateIpPatterns) {
      if (pattern.test(hostname)) {
        return {
          valid: false,
          error: 'Private IP addresses are not allowed for security reasons'
        };
      }
    }
    
    // Block suspicious or malicious domains (basic list)
    const blockedDomains = [
      'bit.ly',
      'tinyurl.com',
      'short.link'
    ];
    
    if (blockedDomains.some(domain => hostname.includes(domain))) {
      return {
        valid: false,
        error: 'URL shorteners and suspicious domains are not allowed'
      };
    }
    
    // URL length validation
    if (url.length > 2000) {
      return {
        valid: false,
        error: 'URL is too long (maximum 2000 characters)'
      };
    }
    
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid URL format'
    };
  }
}

/**
 * Validate crawl tool arguments
 */
export function validateCrawlArgs(args: unknown): { valid: boolean; error?: string; data?: CrawlToolArgs } {
  try {
    // First check if args is an object
    if (!args || typeof args !== 'object') {
      return {
        valid: false,
        error: 'Invalid crawl arguments format'
      };
    }

    const crawlArgs = args as any;

    // URL validation
    if (!crawlArgs.url || typeof crawlArgs.url !== 'string' || crawlArgs.url.trim().length === 0) {
      return {
        valid: false,
        error: 'URL is required and cannot be empty'
      };
    }

    // Now validate with the type guard
    if (!validateCrawlToolArgs(args)) {
      return {
        valid: false,
        error: 'Invalid crawl arguments format'
      };
    }

    const validatedArgs = args as CrawlToolArgs;

    // URL security validation
    const urlValidation = validateUrl(validatedArgs.url);
    if (!urlValidation.valid) {
      const result: { valid: boolean; error?: string; data?: CrawlToolArgs } = {
        valid: false
      };
      
      if (urlValidation.error !== undefined) {
        result.error = urlValidation.error;
      }
      
      return result;
    }

    return {
      valid: true,
      data: validatedArgs
    };
  } catch (error) {
    return {
      valid: false,
      error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
/**

 * Usage examples for the crawl tool
 */
export const crawlToolExamples = {
  basic: {
    description: 'Basic web page crawling',
    input: {
      url: 'https://example.com/article'
    },
    expectedOutput: 'Returns extracted content from the web page including title, main text content, and metadata'
  },
  
  newsArticle: {
    description: 'Crawl news article',
    input: {
      url: 'https://news.example.com/breaking-news-story'
    },
    expectedOutput: 'Returns clean article text with title, content, publication date, and author information'
  },
  
  blogPost: {
    description: 'Crawl blog post',
    input: {
      url: 'https://blog.example.com/technical-tutorial'
    },
    expectedOutput: 'Returns blog post content with title, main text, and relevant metadata'
  },
  
  documentation: {
    description: 'Crawl documentation page',
    input: {
      url: 'https://docs.example.com/api-reference'
    },
    expectedOutput: 'Returns structured documentation content with headings, code examples, and descriptions'
  },
  
  withService: {
    description: 'Crawl with specific service',
    input: {
      url: 'https://example.com/complex-page',
      service: 'readability'
    },
    expectedOutput: 'Returns content extracted using the readability service for better text extraction'
  }
};

/**
 * Tool documentation
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const crawlToolDocumentation = {
  name: 'tuningsearch_crawl',
  summary: 'Web page content extraction using TuningSearch API',
  description: `
The tuningsearch_crawl tool provides powerful web page crawling and content extraction capabilities through the TuningSearch API.
It extracts clean, readable content from web pages, removing ads, navigation, and other clutter to provide the main content.

Key features:
- Clean content extraction from web pages
- Automatic removal of ads, navigation, and clutter
- Metadata extraction (title, author, publication date, etc.)
- Support for various content types (articles, blogs, documentation)
- Multiple extraction services for optimal results
- Security validation to prevent malicious URL access
- Structured output with title, content, and metadata

The tool is designed to provide reliable web content extraction for AI assistants through the Model Context Protocol (MCP),
enabling access to web-based information in a clean, structured format.
  `,
  parameters: {
    required: ['url'],
    optional: ['service']
  },
  responseFormat: {
    type: 'text',
    structure: 'Title, main content, and metadata from the crawled web page',
    metadata: 'Includes URL, title, content length, and extraction metadata'
  },
  securityFeatures: [
    'URL protocol validation (HTTP/HTTPS only)',
    'Localhost and private IP blocking',
    'URL shortener and suspicious domain filtering',
    'URL length limits (max 2000 characters)',
    'Input sanitization and validation'
  ],
  limitations: [
    'Maximum URL length: 2000 characters',
    'Only HTTP and HTTPS protocols supported',
    'Private IPs and localhost blocked for security',
    'Rate limits apply based on API key tier',
    'Some dynamic content may not be fully extracted',
    'JavaScript-heavy sites may have limited content extraction'
  ],
  examples: crawlToolExamples
};

/**
 * Security configuration for crawl operations
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const crawlSecurityConfig = {
  allowedProtocols: ['http:', 'https:'],
  blockedHosts: ['localhost', '127.0.0.1', '::1'],
  blockedDomains: ['bit.ly', 'tinyurl.com', 'short.link'],
  maxUrlLength: 2000,
  privateIpRanges: [
    '10.0.0.0/8',
    '172.16.0.0/12',
    '192.168.0.0/16',
    '169.254.0.0/16'
  ]
};

/**
 * Crawl options and limits configuration
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const crawlOptionsConfig = {
  timeout: 30000,           // 30 seconds timeout
  maxContentLength: 1000000, // 1MB max content
  userAgent: 'TuningSearch-MCP-Server/1.0',
  followRedirects: true,
  maxRedirects: 5,
  retryAttempts: 2
};