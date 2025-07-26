/**
 * MCP Protocol Integration Tests
 * Tests complete tool call flow and MCP client interaction
 */

import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Import services directly for testing
import { SearchService } from '../../services/search-service.js';
import { TuningSearchClient } from '../../clients/tuningsearch-client.js';
import { ConfigService } from '../../services/config-service.js';
import { SearchToolHandler } from '../../handlers/search-tool-handler.js';
import { NewsToolHandler } from '../../handlers/news-tool-handler.js';
import { CrawlToolHandler } from '../../handlers/crawl-tool-handler.js';

// Mock MSW server for API responses
const mockApiServer = setupServer(
  // Mock search endpoint - using GET since that's what the client uses
  http.get('https://api.test.tuningsearch.com/v1/search', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || 'test query';
    
    return HttpResponse.json({
      success: true,
      data: {
        query: query,
        results: [
          {
            title: 'Test Result 1',
            url: 'https://example.com/1',
            content: 'Test content 1',
            position: 1
          },
          {
            title: 'Test Result 2', 
            url: 'https://example.com/2',
            content: 'Test content 2',
            position: 2
          }
        ],
        suggestions: ['test suggestion']
      },
      message: 'Search completed successfully',
      code: 'SUCCESS'
    });
  }),

  // Mock news endpoint - using GET since that's what the client uses
  http.get('https://api.test.tuningsearch.com/v1/news', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || 'test news';
    
    return HttpResponse.json({
      success: true,
      data: {
        query: query,
        results: [
          {
            title: 'Test News 1',
            url: 'https://news.example.com/1',
            content: 'Test news content 1',
            position: 1,
            publishedDate: '2024-01-01T00:00:00Z',
            source: 'Test News Source'
          }
        ]
      },
      message: 'News search completed successfully',
      code: 'SUCCESS'
    });
  }),

  // Mock crawl endpoint - using GET since that's what the client uses
  http.get('https://api.test.tuningsearch.com/v1/crawl', ({ request }) => {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url') || 'https://example.com';
    
    return HttpResponse.json({
      success: true,
      data: {
        url: targetUrl,
        title: 'Test Page Title',
        content: 'Test page content',
        metadata: {
          description: 'Test page description',
          keywords: 'test, page'
        }
      },
      message: 'Crawl completed successfully',
      code: 'SUCCESS'
    });
  }),

  // Mock API key validation endpoint
  http.get('https://api.test.tuningsearch.com/v1/health', () => {
    return HttpResponse.json({
      success: true,
      message: 'API is healthy',
      code: 'SUCCESS'
    });
  })
);

describe('MCP Protocol Integration Tests', () => {
  let configService: ConfigService;
  let client: TuningSearchClient;
  let searchService: SearchService;
  let searchToolHandler: SearchToolHandler;
  let newsToolHandler: NewsToolHandler;
  let crawlToolHandler: CrawlToolHandler;

  beforeAll(() => {
    mockApiServer.listen();
  });

  afterAll(() => {
    mockApiServer.close();
  });

  beforeEach(async () => {
    mockApiServer.resetHandlers();
    
    // Initialize services directly
    configService = new ConfigService();
    await configService.initialize();
    
    client = new TuningSearchClient(configService.getConfig());
    searchService = new SearchService(client);
    
    // Initialize tool handlers
    searchToolHandler = new SearchToolHandler(searchService);
    newsToolHandler = new NewsToolHandler(searchService);
    crawlToolHandler = new CrawlToolHandler(searchService);
  });

  afterEach(async () => {
    // Cleanup if needed
  });

  describe('Tool Handler Integration', () => {
    it('should initialize all tool handlers correctly', async () => {
      expect(searchToolHandler).toBeDefined();
      expect(newsToolHandler).toBeDefined();
      expect(crawlToolHandler).toBeDefined();
      
      // Verify handlers have correct info
      const searchInfo = searchToolHandler.getHandlerInfo();
      expect(searchInfo.name).toBe('SearchToolHandler');
      expect(searchInfo.version).toBe('1.0.0');
      
      const newsInfo = newsToolHandler.getHandlerInfo();
      expect(newsInfo.name).toBe('NewsToolHandler');
      expect(newsInfo.version).toBe('1.0.0');
      
      const crawlInfo = crawlToolHandler.getHandlerInfo();
      expect(crawlInfo.name).toBe('CrawlToolHandler');
      expect(crawlInfo.version).toBe('1.0.0');
    });

    it('should provide correct tool operations', async () => {
      const searchInfo = searchToolHandler.getHandlerInfo();
      expect(searchInfo.supportedOperations).toContain('handleSearchRequest');
      expect(searchInfo.supportedOperations).toContain('handleEnhancedSearchRequest');
      
      const newsInfo = newsToolHandler.getHandlerInfo();
      expect(newsInfo.supportedOperations).toContain('handleNewsRequest');
      
      const crawlInfo = crawlToolHandler.getHandlerInfo();
      expect(crawlInfo.supportedOperations).toContain('handleCrawlRequest');
    });
  });

  describe('Search Tool Integration', () => {
    it('should handle search tool call with valid parameters', async () => {
      const searchArgs = {
        q: 'test query',
        language: 'en',
        country: 'us',
        page: 1
      };

      // Simulate MCP tool call
      const result = await simulateToolCall('tuningsearch_search', searchArgs);
      
      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const responseText = result.content[0].text;
      expect(responseText).toContain('Test Result 1');
      expect(responseText).toContain('https://example.com/1');
      expect(responseText).toContain('Test content 1');
    });

    it('should handle search tool call with minimal parameters', async () => {
      const searchArgs = {
        q: 'minimal test'
      };

      const result = await simulateToolCall('tuningsearch_search', searchArgs);
      
      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
    });

    it('should validate required search parameters', async () => {
      const searchArgs = {}; // Missing required 'q' parameter

      const result = await simulateToolCall('tuningsearch_search', searchArgs);
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('query');
    });

    it('should handle search API errors gracefully', async () => {
      // Mock API error response
      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/search', () => {
          return HttpResponse.json({
            success: false,
            message: 'API rate limit exceeded',
            code: 'RATE_LIMIT_ERROR'
          }, { status: 429 });
        })
      );

      const searchArgs = {
        q: 'test query'
      };

      const result = await simulateToolCall('tuningsearch_search', searchArgs);
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('rate limit');
    });
  });

  describe('News Tool Integration', () => {
    it('should handle news search tool call', async () => {
      const newsArgs = {
        q: 'test news',
        language: 'en',
        timeRange: 'week'
      };

      const result = await simulateToolCall('tuningsearch_news', newsArgs);
      
      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      
      const responseText = result.content[0].text;
      expect(responseText).toContain('Test News 1');
      expect(responseText).toContain('Test News Source');
      expect(responseText).toContain('2024-01-01');
    });

    it('should validate news search parameters', async () => {
      const newsArgs = {}; // Missing required 'q' parameter

      const result = await simulateToolCall('tuningsearch_news', newsArgs);
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('query');
    });
  });

  describe('Crawl Tool Integration', () => {
    it('should handle crawl tool call', async () => {
      const crawlArgs = {
        url: 'https://example.com'
      };

      const result = await simulateToolCall('tuningsearch_crawl', crawlArgs);
      
      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      
      const responseText = result.content[0].text;
      expect(responseText).toContain('Test Page Title');
      expect(responseText).toContain('Test page content');
    });

    it('should validate crawl URL parameter', async () => {
      const crawlArgs = {}; // Missing required 'url' parameter

      const result = await simulateToolCall('tuningsearch_crawl', crawlArgs);
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('URL');
    });

    it('should validate URL format', async () => {
      const crawlArgs = {
        url: 'invalid-url'
      };

      const result = await simulateToolCall('tuningsearch_crawl', crawlArgs);
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('valid URL');
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown tool calls', async () => {
      const result = await simulateToolCall('unknown_tool', {});
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown tool');
    });

    it('should handle network errors', async () => {
      // Mock network error
      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/search', () => {
          return HttpResponse.error();
        })
      );

      const searchArgs = {
        q: 'test query'
      };

      const result = await simulateToolCall('tuningsearch_search', searchArgs);
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('network');
    });

    it('should handle API authentication errors', async () => {
      // Mock authentication error
      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/search', () => {
          return HttpResponse.json({
            success: false,
            message: 'Invalid API key',
            code: 'AUTHENTICATION_ERROR'
          }, { status: 401 });
        })
      );

      const searchArgs = {
        q: 'test query'
      };

      const result = await simulateToolCall('tuningsearch_search', searchArgs);
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('API key');
    });
  });

  describe('Response Format Compliance', () => {
    it('should return MCP-compliant responses for successful calls', async () => {
      const searchArgs = {
        q: 'test query'
      };

      const result = await simulateToolCall('tuningsearch_search', searchArgs);
      
      // Check MCP response format
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('isError');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type');
      expect(result.content[0]).toHaveProperty('text');
      expect(result.content[0].type).toBe('text');
      expect(typeof result.content[0].text).toBe('string');
    });

    it('should return MCP-compliant error responses', async () => {
      const result = await simulateToolCall('tuningsearch_search', {});
      
      // Check MCP error response format
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('isError');
      expect(result.isError).toBe(true);
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type');
      expect(result.content[0]).toHaveProperty('text');
      expect(result.content[0].type).toBe('text');
      expect(typeof result.content[0].text).toBe('string');
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle concurrent tool calls', async () => {
      const searchArgs = {
        q: 'concurrent test'
      };

      // Make multiple concurrent calls
      const promises = Array(5).fill(null).map(() => 
        simulateToolCall('tuningsearch_search', searchArgs)
      );

      const results = await Promise.all(promises);
      
      // All calls should succeed
      results.forEach(result => {
        expect(result.isError).toBe(false);
        expect(result.content).toHaveLength(1);
      });
    });

    it('should maintain performance metrics', async () => {
      const searchArgs = {
        q: 'performance test'
      };

      await simulateToolCall('tuningsearch_search', searchArgs);
      
      const metrics = searchService.getPerformanceMetrics();
      expect(metrics).toBeDefined();
      expect(Array.isArray(metrics)).toBe(true);
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('should track tool usage statistics', async () => {
      const searchArgs = {
        q: 'stats test'
      };

      await simulateToolCall('tuningsearch_search', searchArgs);
      
      const stats = searchService.getStats();
      expect(stats.totalSearches).toBeGreaterThan(0);
    });
  });

  // Helper function to simulate MCP tool calls
  async function simulateToolCall(toolName: string, args: any) {
    try {
      // Simulate the tool call through the handlers directly
      switch (toolName) {
        case 'tuningsearch_search':
          return await searchToolHandler.handleSearchRequest(args);
        case 'tuningsearch_news':
          return await newsToolHandler.handleNewsRequest(args);
        case 'tuningsearch_crawl':
          return await crawlToolHandler.handleCrawlRequest(args);
        default:
          return {
            content: [{
              type: 'text' as const,
              text: `Unknown tool: ${toolName}`
            }],
            isError: true
          };
      }
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: error instanceof Error ? error.message : 'Unknown error'
        }],
        isError: true
      };
    }
  }
});