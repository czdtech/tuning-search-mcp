/**
 * End-to-End Integration Tests
 * Tests complete workflows from MCP client to API responses
 */

import { TuningSearchServer } from '../../server.js';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Mock MSW server for E2E testing
const mockApiServer = setupServer(
  // Default successful responses
  http.get('https://api.test.tuningsearch.com/v1/search', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || 'e2e test';
    
    return HttpResponse.json({
      success: true,
      data: {
        query: query,
        results: [
          {
            title: 'E2E Test Result',
            url: 'https://example.com/e2e',
            content: 'End-to-end test content',
            position: 1
          }
        ]
      },
      message: 'Search completed successfully',
      code: 'SUCCESS'
    });
  }),

  http.get('https://api.test.tuningsearch.com/v1/news', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || 'e2e news';
    
    return HttpResponse.json({
      success: true,
      data: {
        query: query,
        results: [
          {
            title: 'E2E News Result',
            url: 'https://news.example.com/e2e',
            content: 'End-to-end news content',
            position: 1,
            publishedDate: '2024-01-15T12:00:00Z',
            source: 'E2E News'
          }
        ]
      },
      message: 'News search completed successfully',
      code: 'SUCCESS'
    });
  }),

  http.get('https://api.test.tuningsearch.com/v1/crawl', ({ request }) => {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url') || 'https://example.com/e2e';
    
    return HttpResponse.json({
      success: true,
      data: {
        url: targetUrl,
        title: 'E2E Test Page',
        content: 'End-to-end crawl content',
        metadata: {
          description: 'E2E test page description'
        }
      },
      message: 'Crawl completed successfully',
      code: 'SUCCESS'
    });
  }),

  http.get('https://api.test.tuningsearch.com/v1/health', () => {
    return HttpResponse.json({
      success: true,
      message: 'API is healthy',
      code: 'SUCCESS'
    });
  })
);

describe('End-to-End Integration Tests', () => {
  let server: TuningSearchServer;

  beforeAll(() => {
    mockApiServer.listen();
    // Set test environment variables
    process.env.TUNINGSEARCH_API_KEY = 'test-api-key';
    process.env.TUNINGSEARCH_BASE_URL = 'https://api.test.tuningsearch.com/v1';
    process.env.TUNINGSEARCH_LOG_LEVEL = 'ERROR';
  });

  afterAll(() => {
    mockApiServer.close();
  });

  beforeEach(async () => {
    mockApiServer.resetHandlers();
    
    server = new TuningSearchServer({
      name: 'e2e-test-server',
      version: '1.0.0-e2e'
    });

    await server.run();
  });

  afterEach(async () => {
    if (server && server.isServerRunning()) {
      await server.stop();
    }
  });

  describe('Complete Search Workflow', () => {
    it('should complete full search workflow from MCP to API', async () => {
      const searchArgs = {
        q: 'complete workflow test',
        language: 'en',
        country: 'US'
      };

      const result = await executeToolCall(server, 'tuningsearch_search', searchArgs);

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe('text');

      const responseText = result.content[0]?.text || '';
      expect(responseText).toContain('E2E Test Result');
      expect(responseText).toContain('https://example.com/e2e');

      const stats = server.getSearchStats();
      expect(stats.totalSearches).toBeGreaterThan(0);
    });

    it('should handle search workflow with caching', async () => {
      const searchArgs = { q: 'caching test' };

      const result1 = await executeToolCall(server, 'tuningsearch_search', searchArgs);
      expect(result1.isError).toBe(false);

      const result2 = await executeToolCall(server, 'tuningsearch_search', searchArgs);
      expect(result2.isError).toBe(false);

      expect(result1.content[0]?.text).toBe(result2.content[0]?.text);

      const cacheStats = server.getCacheStats();
      expect(cacheStats.hits).toBeGreaterThan(0);
    });
  });

  describe('Complete News Workflow', () => {
    it('should complete full news search workflow', async () => {
      const newsArgs = {
        q: 'breaking news workflow',
        timeRange: 'day',
        language: 'en'
      };

      const result = await executeToolCall(server, 'tuningsearch_news', newsArgs);

      expect(result.isError).toBe(false);
      const responseText = result.content[0]?.text || '';
      expect(responseText).toContain('E2E News Result');
      expect(responseText).toContain('E2E News');

      const stats = server.getSearchStats();
      expect(stats.totalNewsSearches).toBeGreaterThan(0);
    });
  });

  describe('Complete Crawl Workflow', () => {
    it('should complete full crawl workflow', async () => {
      const crawlArgs = {
        url: 'https://example.com/crawl-workflow'
      };

      const result = await executeToolCall(server, 'tuningsearch_crawl', crawlArgs);

      expect(result.isError).toBe(false);
      const responseText = result.content[0]?.text || '';
      expect(responseText).toContain('E2E Test Page');
      expect(responseText).toContain('crawl content');

      const stats = server.getSearchStats();
      expect(stats.totalCrawls).toBeGreaterThan(0);
    });
  });

  describe('Error Handling Workflows', () => {
    it('should handle permanent error workflow', async () => {
      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/search', () => {
          return HttpResponse.json({
            success: false,
            message: 'Invalid API key provided',
            code: 'AUTHENTICATION_ERROR'
          }, { status: 401 });
        })
      );

      const searchArgs = { q: 'permanent error test' };
      const result = await executeToolCall(server, 'tuningsearch_search', searchArgs);

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('API key');
    });
  });

  describe('Multi-Tool Workflows', () => {
    it('should handle sequential tool calls', async () => {
      const searchResult = await executeToolCall(server, 'tuningsearch_search', {
        q: 'sequential test'
      });
      expect(searchResult.isError).toBe(false);

      const newsResult = await executeToolCall(server, 'tuningsearch_news', {
        q: 'sequential news test'
      });
      expect(newsResult.isError).toBe(false);

      const crawlResult = await executeToolCall(server, 'tuningsearch_crawl', {
        url: 'https://example.com/sequential'
      });
      expect(crawlResult.isError).toBe(false);

      const stats = server.getSearchStats();
      expect(stats.totalSearches).toBeGreaterThan(0);
      expect(stats.totalNewsSearches).toBeGreaterThan(0);
      expect(stats.totalCrawls).toBeGreaterThan(0);
    });

    it('should handle concurrent tool calls', async () => {
      const promises = [
        executeToolCall(server, 'tuningsearch_search', { q: 'concurrent search 1' }),
        executeToolCall(server, 'tuningsearch_search', { q: 'concurrent search 2' }),
        executeToolCall(server, 'tuningsearch_news', { q: 'concurrent news' }),
        executeToolCall(server, 'tuningsearch_crawl', { url: 'https://example.com/concurrent' })
      ];

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.isError).toBe(false);
      });

      const stats = server.getSearchStats();
      expect(stats.totalSearches).toBeGreaterThanOrEqual(2);
      expect(stats.totalNewsSearches).toBeGreaterThanOrEqual(1);
      expect(stats.totalCrawls).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Health and Monitoring Workflows', () => {
    it('should maintain health status throughout workflow', async () => {
      const initialHealth = server.getHealthStatus();
      expect(initialHealth.status).toBe('running');

      await executeToolCall(server, 'tuningsearch_search', { q: 'health test' });
      await executeToolCall(server, 'tuningsearch_news', { q: 'health news' });

      const finalHealth = server.getHealthStatus();
      expect(finalHealth.status).toBe('running');
      
      if ('totalRequests' in initialHealth && 'totalRequests' in finalHealth) {
        expect(finalHealth.totalRequests).toBeGreaterThan(initialHealth.totalRequests);
      }
    });

    it('should provide comprehensive health report', async () => {
      await executeToolCall(server, 'tuningsearch_search', { q: 'health report test' });

      const healthReport = server.getHealthReport();
      
      expect(healthReport.server).toBeDefined();
      expect(healthReport.service).toBeDefined();
      expect(healthReport.handlers).toBeDefined();
      expect(healthReport.health).toBeDefined();

      expect(healthReport.handlers.search).toBeDefined();
      expect(healthReport.handlers.news).toBeDefined();
      expect(healthReport.handlers.crawl).toBeDefined();
    });

    it('should track performance alerts during workflow', async () => {
      for (let i = 0; i < 5; i++) {
        await executeToolCall(server, 'tuningsearch_search', { q: `alert test ${i}` });
      }

      const alerts = server.getPerformanceAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  describe('Configuration and Lifecycle Workflows', () => {
    it('should handle server restart workflow', async () => {
      expect(server.isServerRunning()).toBe(true);

      const result1 = await executeToolCall(server, 'tuningsearch_search', { q: 'restart test 1' });
      expect(result1.isError).toBe(false);

      await server.stop();
      expect(server.isServerRunning()).toBe(false);

      await server.run();
      expect(server.isServerRunning()).toBe(true);

      const result2 = await executeToolCall(server, 'tuningsearch_search', { q: 'restart test 2' });
      expect(result2.isError).toBe(false);
    });

    it('should handle configuration updates', async () => {
      const initialConfig = server.getConfig();
      expect(initialConfig.name).toBe('e2e-test-server');

      server.updateConfig({
        name: 'updated-e2e-test-server',
        description: 'Updated description'
      });

      const updatedConfig = server.getConfig();
      expect(updatedConfig.name).toBe('updated-e2e-test-server');
      expect(updatedConfig.description).toBe('Updated description');

      const result = await executeToolCall(server, 'tuningsearch_search', { q: 'config update test' });
      expect(result.isError).toBe(false);
    });
  });

  describe('Performance and Stability Testing', () => {
    it('should handle high-frequency requests', async () => {
      const requests = [];
      const numRequests = 10;

      for (let i = 0; i < numRequests; i++) {
        requests.push(
          executeToolCall(server, 'tuningsearch_search', { q: `high frequency test ${i}` })
        );
      }

      const results = await Promise.all(requests);

      results.forEach((result) => {
        expect(result.isError).toBe(false);
        expect(result.content[0]?.text).toContain('E2E Test Result');
      });

      const stats = server.getSearchStats();
      expect(stats.totalSearches).toBeGreaterThanOrEqual(numRequests);
    });

    it('should maintain performance under load', async () => {
      const startTime = Date.now();
      const requests = [];

      for (let i = 0; i < 5; i++) {
        requests.push(executeToolCall(server, 'tuningsearch_search', { q: `load test search ${i}` }));
        requests.push(executeToolCall(server, 'tuningsearch_news', { q: `load test news ${i}` }));
        requests.push(executeToolCall(server, 'tuningsearch_crawl', { url: `https://example.com/load-${i}` }));
      }

      const results = await Promise.all(requests);
      const endTime = Date.now();

      results.forEach(result => {
        expect(result.isError).toBe(false);
      });

      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(10000);

      const metrics = server.getPerformanceMetrics();
      expect(metrics.server).toBeDefined();
      expect(metrics.service).toBeDefined();
    });

    it('should handle memory efficiently', async () => {
      const initialMemory = process.memoryUsage();

      for (let i = 0; i < 20; i++) {
        await executeToolCall(server, 'tuningsearch_search', { q: `memory test ${i}` });
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle malformed API responses gracefully', async () => {
      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/search', () => {
          return HttpResponse.text('This is not valid JSON');
        })
      );

      const result = await executeToolCall(server, 'tuningsearch_search', { q: 'malformed test' });
      
      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('error');
    });

    it('should maintain service availability during errors', async () => {
      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/search', () => {
          return HttpResponse.error();
        })
      );

      const errorResult = await executeToolCall(server, 'tuningsearch_search', { q: 'error test' });
      expect(errorResult.isError).toBe(true);

      mockApiServer.resetHandlers();

      const successResult = await executeToolCall(server, 'tuningsearch_search', { q: 'success test' });
      expect(successResult.isError).toBe(false);

      const health = server.getHealthStatus();
      expect(health.status).toBe('running');
    });
  });

  // Helper function to execute tool calls through the server
  async function executeToolCall(server: TuningSearchServer, toolName: string, args: any) {
    try {
      const serverAny = server as any;
      
      switch (toolName) {
        case 'tuningsearch_search':
          return await serverAny.searchToolHandler.handleSearchRequest(args);
        case 'tuningsearch_news':
          return await serverAny.newsToolHandler.handleNewsRequest(args);
        case 'tuningsearch_crawl':
          return await serverAny.crawlToolHandler.handleCrawlRequest(args);
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