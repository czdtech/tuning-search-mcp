/**
 * Performance and Stability Integration Tests
 * Tests system performance under various load conditions and stability over time
 */

import { TuningSearchServer } from '../../server.js';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Mock MSW server for performance testing
const mockApiServer = setupServer(
  http.get('https://api.test.tuningsearch.com/v1/search', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || 'performance test';
    
    // Add small delay to simulate real API response time
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(HttpResponse.json({
          success: true,
          data: {
            query: query,
            results: [
              {
                title: 'Performance Test Result',
                url: 'https://example.com/performance',
                content: 'Performance test content',
                position: 1
              }
            ]
          },
          message: 'Search completed successfully',
          code: 'SUCCESS'
        }));
      }, 50); // 50ms delay
    });
  }),

  http.get('https://api.test.tuningsearch.com/v1/news', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || 'performance news';
    
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(HttpResponse.json({
          success: true,
          data: {
            query: query,
            results: [
              {
                title: 'Performance News Result',
                url: 'https://news.example.com/performance',
                content: 'Performance news content',
                position: 1,
                publishedDate: '2024-01-15T12:00:00Z',
                source: 'Performance News'
              }
            ]
          },
          message: 'News search completed successfully',
          code: 'SUCCESS'
        }));
      }, 75); // 75ms delay
    });
  }),

  http.get('https://api.test.tuningsearch.com/v1/crawl', ({ request }) => {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url') || 'https://example.com/performance';
    
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(HttpResponse.json({
          success: true,
          data: {
            url: targetUrl,
            title: 'Performance Test Page',
            content: 'Performance crawl content',
            metadata: {
              description: 'Performance test page description'
            }
          },
          message: 'Crawl completed successfully',
          code: 'SUCCESS'
        }));
      }, 100); // 100ms delay
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

describe('Performance and Stability Integration Tests', () => {
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
      name: 'performance-test-server',
      version: '1.0.0-performance'
    });

    await server.run();
  });

  afterEach(async () => {
    if (server && server.isServerRunning()) {
      await server.stop();
    }
  });

  describe('Load Testing', () => {
    it('should handle high concurrent request load', async () => {
      const concurrentRequests = 50;
      const requests = [];

      const startTime = Date.now();

      // Create concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          executeToolCall(server, 'tuningsearch_search', { q: `load test ${i}` })
        );
      }

      const results = await Promise.all(requests);
      const endTime = Date.now();

      // All requests should succeed
      results.forEach((result) => {
        expect(result.isError).toBe(false);
        expect(result.content[0]?.text).toContain('Performance Test Result');
      });

      // Performance should be reasonable
      const totalTime = endTime - startTime;
      const averageTime = totalTime / concurrentRequests;
      
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(averageTime).toBeLessThan(500); // Average per request should be under 500ms

      // Verify statistics
      const stats = server.getSearchStats();
      expect(stats.totalSearches).toBe(concurrentRequests);
      expect(stats.successfulSearches).toBe(concurrentRequests);
    });

    it('should handle mixed tool type load', async () => {
      const requestsPerTool = 20;
      const requests = [];

      const startTime = Date.now();

      // Create mixed requests
      for (let i = 0; i < requestsPerTool; i++) {
        requests.push(
          executeToolCall(server, 'tuningsearch_search', { q: `mixed search ${i}` }),
          executeToolCall(server, 'tuningsearch_news', { q: `mixed news ${i}` }),
          executeToolCall(server, 'tuningsearch_crawl', { url: `https://example.com/mixed-${i}` })
        );
      }

      const results = await Promise.all(requests);
      const endTime = Date.now();

      // All requests should succeed
      results.forEach(result => {
        expect(result.isError).toBe(false);
      });

      // Performance should be reasonable
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(15000); // Should complete within 15 seconds

      // Verify statistics for all tool types
      const stats = server.getSearchStats();
      expect(stats.totalSearches).toBe(requestsPerTool);
      expect(stats.totalNewsSearches).toBe(requestsPerTool);
      expect(stats.totalCrawls).toBe(requestsPerTool);
    });

    it('should maintain performance under sustained load', async () => {
      const batchSize = 10;
      const numBatches = 5;
      const batchTimes = [];

      for (let batch = 0; batch < numBatches; batch++) {
        const batchStart = Date.now();
        const batchRequests = [];

        for (let i = 0; i < batchSize; i++) {
          batchRequests.push(
            executeToolCall(server, 'tuningsearch_search', { q: `sustained batch ${batch} request ${i}` })
          );
        }

        const batchResults = await Promise.all(batchRequests);
        const batchEnd = Date.now();

        // All requests in batch should succeed
        batchResults.forEach(result => {
          expect(result.isError).toBe(false);
        });

        batchTimes.push(batchEnd - batchStart);

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Performance should not degrade significantly over time
      const firstBatchTime = batchTimes[0];
      const lastBatchTime = batchTimes[batchTimes.length - 1];
      const degradation = (lastBatchTime - firstBatchTime) / firstBatchTime;

      expect(degradation).toBeLessThan(0.5); // Less than 50% degradation
    });
  });

  describe('Memory Management', () => {
    it('should manage memory efficiently under load', async () => {
      const initialMemory = process.memoryUsage();
      const numRequests = 100;

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const requests = [];
      for (let i = 0; i < numRequests; i++) {
        requests.push(
          executeToolCall(server, 'tuningsearch_search', { q: `memory test ${i}` })
        );
      }

      await Promise.all(requests);

      // Force garbage collection again
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);

      // RSS should not grow excessively
      const rssIncrease = finalMemory.rss - initialMemory.rss;
      expect(rssIncrease).toBeLessThan(200 * 1024 * 1024); // Less than 200MB RSS increase
    });

    it('should handle large response payloads efficiently', async () => {
      // Mock large response
      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/search', () => {
          const largeContent = 'x'.repeat(50000); // 50KB content
          const largeResults = Array.from({ length: 20 }, (_, i) => ({
            title: `Large Result ${i + 1}`,
            url: `https://example.com/large/${i + 1}`,
            content: largeContent,
            position: i + 1
          }));

          return HttpResponse.json({
            success: true,
            data: {
              query: 'large response test',
              results: largeResults
            },
            message: 'Search completed successfully',
            code: 'SUCCESS'
          });
        })
      );

      const initialMemory = process.memoryUsage();

      const result = await executeToolCall(server, 'tuningsearch_search', {
        q: 'large response test'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0]?.text).toContain('Large Result');

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be proportional to response size
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB increase
    });

    it('should clean up resources after requests', async () => {
      const initialMemory = process.memoryUsage();

      // Perform multiple requests
      for (let i = 0; i < 20; i++) {
        await executeToolCall(server, 'tuningsearch_search', { q: `cleanup test ${i}` });
      }

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory should not increase significantly after cleanup
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024); // Less than 20MB
    });
  });

  describe('Response Time Performance', () => {
    it('should maintain consistent response times', async () => {
      const numRequests = 30;
      const responseTimes = [];

      for (let i = 0; i < numRequests; i++) {
        const startTime = Date.now();
        
        const result = await executeToolCall(server, 'tuningsearch_search', {
          q: `response time test ${i}`
        });
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        expect(result.isError).toBe(false);
        responseTimes.push(responseTime);
      }

      // Calculate statistics
      const averageTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const maxTime = Math.max(...responseTimes);
      const minTime = Math.min(...responseTimes);

      // Response times should be reasonable and consistent
      expect(averageTime).toBeLessThan(1000); // Average under 1 second
      expect(maxTime).toBeLessThan(2000); // Max under 2 seconds
      expect(maxTime - minTime).toBeLessThan(1500); // Variance under 1.5 seconds
    });

    it('should handle timeout scenarios gracefully', async () => {
      // Mock slow API response
      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/search', () => {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve(HttpResponse.json({
                success: true,
                data: {
                  query: 'slow response test',
                  results: [
                    {
                      title: 'Slow Response Result',
                      url: 'https://example.com/slow',
                      content: 'This response was slow',
                      position: 1
                    }
                  ]
                },
                message: 'Search completed successfully',
                code: 'SUCCESS'
              }));
            }, 2000); // 2 second delay
          });
        })
      );

      const startTime = Date.now();
      
      const result = await executeToolCall(server, 'tuningsearch_search', {
        q: 'slow response test'
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should handle slow responses
      expect(result.isError).toBe(false);
      expect(responseTime).toBeGreaterThan(2000); // Should reflect the delay
      expect(result.content[0]?.text).toContain('Slow Response Result');
    });
  });

  describe('Error Recovery Performance', () => {
    it('should recover quickly from API errors', async () => {
      let errorCount = 0;
      const maxErrors = 5;

      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/search', () => {
          errorCount++;
          
          if (errorCount <= maxErrors) {
            return HttpResponse.json({
              success: false,
              message: 'Temporary server error',
              code: 'SERVER_ERROR'
            }, { status: 500 });
          }
          
          return HttpResponse.json({
            success: true,
            data: {
              query: 'recovery test',
              results: [
                {
                  title: 'Recovery Success',
                  url: 'https://example.com/recovery',
                  content: 'Successfully recovered from errors',
                  position: 1
                }
              ]
            },
            message: 'Search completed successfully',
            code: 'SUCCESS'
          });
        })
      );

      const startTime = Date.now();
      
      const result = await executeToolCall(server, 'tuningsearch_search', {
        q: 'recovery test'
      });
      
      const endTime = Date.now();
      const recoveryTime = endTime - startTime;

      expect(result.isError).toBe(false);
      expect(result.content[0]?.text).toContain('Recovery Success');
      expect(errorCount).toBeGreaterThan(maxErrors);
      
      // Recovery should happen within reasonable time
      expect(recoveryTime).toBeLessThan(10000); // Under 10 seconds
    });

    it('should maintain performance after error recovery', async () => {
      // First, cause some errors
      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/search', () => {
          return HttpResponse.error();
        })
      );

      // Make some failing requests
      for (let i = 0; i < 3; i++) {
        await executeToolCall(server, 'tuningsearch_search', { q: `error test ${i}` });
      }

      // Reset to normal operation
      mockApiServer.resetHandlers();

      // Test performance after recovery
      const numRequests = 10;
      const startTime = Date.now();
      const requests = [];

      for (let i = 0; i < numRequests; i++) {
        requests.push(
          executeToolCall(server, 'tuningsearch_search', { q: `post-recovery test ${i}` })
        );
      }

      const results = await Promise.all(requests);
      const endTime = Date.now();

      // All requests should succeed
      results.forEach(result => {
        expect(result.isError).toBe(false);
      });

      // Performance should be normal
      const totalTime = endTime - startTime;
      const averageTime = totalTime / numRequests;
      expect(averageTime).toBeLessThan(500); // Should be fast after recovery
    });
  });

  describe('Cache Performance', () => {
    it('should improve performance with caching', async () => {
      const query = 'cache performance test';
      
      // First request (cache miss)
      const startTime1 = Date.now();
      const result1 = await executeToolCall(server, 'tuningsearch_search', { q: query });
      const endTime1 = Date.now();
      const firstRequestTime = endTime1 - startTime1;

      expect(result1.isError).toBe(false);

      // Second request (cache hit)
      const startTime2 = Date.now();
      const result2 = await executeToolCall(server, 'tuningsearch_search', { q: query });
      const endTime2 = Date.now();
      const secondRequestTime = endTime2 - startTime2;

      expect(result2.isError).toBe(false);
      expect(result1.content[0]?.text).toBe(result2.content[0]?.text);

      // Cached request should be faster
      expect(secondRequestTime).toBeLessThan(firstRequestTime);

      // Verify cache statistics
      const cacheStats = server.getCacheStats();
      expect(cacheStats.hits).toBeGreaterThan(0);
    });

    it('should handle cache under high load', async () => {
      const queries = [
        'cache load test 1',
        'cache load test 2',
        'cache load test 3'
      ];

      // Prime the cache
      for (const query of queries) {
        await executeToolCall(server, 'tuningsearch_search', { q: query });
      }

      // Test cache performance under load
      const requests = [];
      const startTime = Date.now();

      for (let i = 0; i < 30; i++) {
        const query = queries[i % queries.length];
        requests.push(
          executeToolCall(server, 'tuningsearch_search', { q: query })
        );
      }

      const results = await Promise.all(requests);
      const endTime = Date.now();

      // All requests should succeed
      results.forEach(result => {
        expect(result.isError).toBe(false);
      });

      // Should be fast due to caching
      const totalTime = endTime - startTime;
      const averageTime = totalTime / requests.length;
      expect(averageTime).toBeLessThan(200); // Should be very fast with cache

      // Verify cache was used
      const cacheStats = server.getCacheStats();
      expect(cacheStats.hits).toBeGreaterThan(20); // Most requests should be cache hits
    });
  });

  describe('Long-Running Stability', () => {
    it('should maintain stability over extended operation', async () => {
      const operationDuration = 5000; // 5 seconds
      const requestInterval = 100; // 100ms between requests
      const startTime = Date.now();
      let requestCount = 0;
      let errorCount = 0;

      while (Date.now() - startTime < operationDuration) {
        try {
          const result = await executeToolCall(server, 'tuningsearch_search', {
            q: `stability test ${requestCount}`
          });
          
          if (result.isError) {
            errorCount++;
          }
          
          requestCount++;
        } catch (error) {
          errorCount++;
        }

        await new Promise(resolve => setTimeout(resolve, requestInterval));
      }

      // Should have made multiple requests
      expect(requestCount).toBeGreaterThan(10);
      
      // Error rate should be low
      const errorRate = errorCount / requestCount;
      expect(errorRate).toBeLessThan(0.1); // Less than 10% error rate

      // Server should still be healthy
      const health = server.getHealthStatus();
      expect(health.status).toBe('running');
    });

    it('should handle resource cleanup over time', async () => {
      const initialMemory = process.memoryUsage();
      const numCycles = 10;
      const requestsPerCycle = 10;

      for (let cycle = 0; cycle < numCycles; cycle++) {
        const cycleRequests = [];
        
        for (let i = 0; i < requestsPerCycle; i++) {
          cycleRequests.push(
            executeToolCall(server, 'tuningsearch_search', {
              q: `cleanup cycle ${cycle} request ${i}`
            })
          );
        }

        await Promise.all(cycleRequests);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        // Small delay between cycles
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory should not grow excessively over time
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase

      // Server should still be responsive
      const result = await executeToolCall(server, 'tuningsearch_search', {
        q: 'final stability test'
      });
      expect(result.isError).toBe(false);
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