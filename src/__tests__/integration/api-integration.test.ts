/**
 * API Integration Tests
 * Tests real API calls and various search scenarios
 */

import { TuningSearchClient } from '../../clients/tuningsearch-client.js';
import { SearchService } from '../../services/search-service.js';
import { ConfigService } from '../../services/config-service.js';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Mock MSW server for comprehensive API testing
const mockApiServer = setupServer();

describe('API Integration Tests', () => {
  let client: TuningSearchClient;
  let searchService: SearchService;
  let configService: ConfigService;

  beforeAll(() => {
    mockApiServer.listen();
  });

  afterAll(() => {
    mockApiServer.close();
  });

  beforeEach(async () => {
    mockApiServer.resetHandlers();
    
    // Set integration test flag for retry config
    process.env.INTEGRATION_TEST = '1';

    // Initialize services
    configService = new ConfigService();
    await configService.initialize();

    client = new TuningSearchClient(configService.getConfig());
    searchService = new SearchService(client);
  });

  describe('Search API Integration', () => {
    it('should perform successful search with basic parameters', async () => {
      // Mock successful search response - use GET as per MSW docs, query params are auto-handled
      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/search', ({ request }) => {
          const url = new URL(request.url);
          const q = url.searchParams.get('q');
          
          expect(q).toBe('integration test');

          return HttpResponse.json({
            success: true,
            data: {
              query: q,
              results: [
                {
                  title: 'Integration Test Result',
                  url: 'https://example.com/integration',
                  content: 'This is an integration test result',
                  position: 1
                }
              ],
              suggestions: ['integration testing', 'api testing']
            },
            message: 'Search completed successfully',
            code: 'SUCCESS'
          });
        })
      );

      const result = await searchService.performSearch({
        q: 'integration test'
      });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0]!.text).toContain('Integration Test Result');
      expect(result.content[0]!.text).toContain('https://example.com/integration');
    });

    it('should handle search with all parameters', async () => {
      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/search', ({ request }) => {
          const url = new URL(request.url);
          
          expect(url.searchParams.get('q')).toBe('comprehensive test');
          expect(url.searchParams.get('language')).toBe('en');
          expect(url.searchParams.get('country')).toBe('US');
          expect(url.searchParams.get('page')).toBe('2');
          expect(url.searchParams.get('safe')).toBe('1');
          expect(url.searchParams.get('timeRange')).toBe('month');
          expect(url.searchParams.get('service')).toBe('google');

          return HttpResponse.json({
            success: true,
            data: {
              query: url.searchParams.get('q'),
              results: [
                {
                  title: 'Comprehensive Test Result',
                  url: 'https://example.com/comprehensive',
                  content: 'Comprehensive test with all parameters',
                  position: 1
                }
              ]
            },
            message: 'Search completed successfully',
            code: 'SUCCESS'
          });
        })
      );

      const result = await searchService.performSearch({
        q: 'comprehensive test',
        language: 'en',
        country: 'US',
        page: 2,
        safe: 1,
        timeRange: 'month',
        service: 'google'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0]!.text).toContain('Comprehensive Test Result');
    });

    it('should handle empty search results', async () => {
      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/search', () => {
          return HttpResponse.json({
            success: true,
            data: {
              query: 'no results query',
              results: [],
              suggestions: []
            },
            message: 'No results found',
            code: 'NO_RESULTS'
          });
        })
      );

      const result = await searchService.performSearch({
        q: 'no results query'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0]!.text).toContain('No results found');
    });

    it('should handle search with special characters', async () => {
      const specialQuery = 'test "quoted text" AND (special OR characters) -excluded';

      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/search', ({ request }) => {
          const url = new URL(request.url);

          expect(url.searchParams.get('q')).toBe(specialQuery);

          return HttpResponse.json({
            success: true,
            data: {
              query: url.searchParams.get('q'),
              results: [
                {
                  title: 'Special Characters Result',
                  url: 'https://example.com/special',
                  content: 'Result for special characters query',
                  position: 1
                }
              ]
            },
            message: 'Search completed successfully',
            code: 'SUCCESS'
          });
        })
      );

      const result = await searchService.performSearch({
        q: specialQuery
      });

      expect(result.isError).toBe(false);
      expect(result.content[0]!.text).toContain('Special Characters Result');
    });

    it('should handle large result sets', async () => {
      const largeResults = Array.from({ length: 20 }, (_, i) => ({
        title: `Large Result ${i + 1}`,
        url: `https://example.com/large/${i + 1}`,
        content: `Content for large result ${i + 1}`,
        position: i + 1
      }));

      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/search', () => {
          return HttpResponse.json({
            success: true,
            data: {
              query: 'large results',
              results: largeResults
            },
            message: 'Search completed successfully',
            code: 'SUCCESS'
          });
        })
      );

      const result = await searchService.performSearch({
        q: 'large results'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0]!.text).toContain('Large Result 1');
      expect(result.content[0]!.text).toContain('Large Result 20');
    });
  });

  describe('News API Integration', () => {
    it('should perform successful news search', async () => {
      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/news', ({ request }) => {
          const url = new URL(request.url);

          expect(url.searchParams.get('q')).toBe('breaking news');

          return HttpResponse.json({
            success: true,
            data: {
              query: url.searchParams.get('q'),
              results: [
                {
                  title: 'Breaking News Article',
                  url: 'https://news.example.com/breaking',
                  content: 'This is breaking news content',
                  position: 1,
                  publishedDate: '2024-01-15T10:30:00Z',
                  source: 'News Source'
                }
              ]
            },
            message: 'News search completed successfully',
            code: 'SUCCESS'
          });
        })
      );

      const result = await searchService.performNewsSearch({
        q: 'breaking news'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0]!.text).toContain('Breaking News Article');
      expect(result.content[0]!.text).toContain('News Source');
      expect(result.content[0]!.text).toContain('2024-01-15');
    });

    it('should handle news search with time range', async () => {
      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/news', ({ request }) => {
          const url = new URL(request.url);

          expect(url.searchParams.get('q')).toBe('recent news');
          expect(url.searchParams.get('timeRange')).toBe('day');

          return HttpResponse.json({
            success: true,
            data: {
              query: url.searchParams.get('q'),
              results: [
                {
                  title: 'Recent News Article',
                  url: 'https://news.example.com/recent',
                  content: 'Recent news from today',
                  position: 1,
                  publishedDate: new Date().toISOString(),
                  source: 'Today News'
                }
              ]
            },
            message: 'News search completed successfully',
            code: 'SUCCESS'
          });
        })
      );

      const result = await searchService.performNewsSearch({
        q: 'recent news',
        timeRange: 'day'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0]!.text).toContain('Recent News Article');
      expect(result.content[0]!.text).toContain('Today News');
    });

    it('should handle news search with language and country', async () => {
      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/news', ({ request }) => {
          const url = new URL(request.url);

          expect(url.searchParams.get('q')).toBe('local news');
          expect(url.searchParams.get('language')).toBe('en');
          expect(url.searchParams.get('country')).toBe('GB');

          return HttpResponse.json({
            success: true,
            data: {
              query: url.searchParams.get('q'),
              results: [
                {
                  title: 'UK Local News',
                  url: 'https://uk.news.example.com/local',
                  content: 'Local news from the UK',
                  position: 1,
                  publishedDate: '2024-01-15T14:00:00Z',
                  source: 'UK News'
                }
              ]
            },
            message: 'News search completed successfully',
            code: 'SUCCESS'
          });
        })
      );

      const result = await searchService.performNewsSearch({
        q: 'local news',
        language: 'en',
        country: 'GB'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0]!.text).toContain('UK Local News');
      expect(result.content[0]!.text).toContain('UK News');
    });
  });

  describe('Crawl API Integration', () => {
    it('should perform successful page crawl', async () => {
      const testUrl = 'https://example.com/test-page';

      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/crawl', ({ request }) => {
          const url = new URL(request.url);

          expect(url.searchParams.get('url')).toBe(testUrl);

          return HttpResponse.json({
            success: true,
            data: {
              url: url.searchParams.get('url'),
              title: 'Test Page Title',
              content: 'This is the extracted content from the test page.',
              metadata: {
                description: 'Test page description',
                keywords: 'test, page, crawl',
                author: 'Test Author',
                publishedDate: '2024-01-15'
              }
            },
            message: 'Crawl completed successfully',
            code: 'SUCCESS'
          });
        })
      );

      const result = await searchService.performCrawl({
        url: testUrl
      });

      expect(result.isError).toBe(false);
      expect(result.content[0]!.text).toContain('Test Page Title');
      expect(result.content[0]!.text).toContain('extracted content');
      expect(result.content[0]!.text).toContain('Test page description');
    });

    it('should handle crawl of different content types', async () => {
      const testUrl = 'https://example.com/article';

      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/crawl', ({ request }) => {
          const url = new URL(request.url);

          expect(url.searchParams.get('url')).toBe(testUrl);

          return HttpResponse.json({
            success: true,
            data: {
              url: url.searchParams.get('url'),
              title: 'Article Title',
              content: 'Long article content with multiple paragraphs...',
              metadata: {
                contentType: 'article',
                wordCount: 1500,
                readingTime: '6 minutes',
                tags: ['technology', 'innovation']
              }
            },
            message: 'Crawl completed successfully',
            code: 'SUCCESS'
          });
        })
      );

      const result = await searchService.performCrawl({
        url: testUrl
      });

      expect(result.isError).toBe(false);
      expect(result.content[0]!.text).toContain('Article Title');
      expect(result.content[0]!.text).toContain('Long article content');
      expect(result.content[0]!.text).toContain('6 minutes');
    });

    it('should handle crawl failures gracefully', async () => {
      const testUrl = 'https://example.com/not-found';

      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/crawl', () => {
          return HttpResponse.json({
            success: false,
            message: 'Page not found or inaccessible',
            code: 'CRAWL_ERROR'
          }, { status: 404 });
        })
      );

      const result = await searchService.performCrawl({
        url: testUrl
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('not found');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle API rate limiting', async () => {
      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/search', () => {
          return HttpResponse.json({
            success: false,
            message: 'Rate limit exceeded. Please try again later.',
            code: 'RATE_LIMIT_ERROR'
          }, { status: 429 });
        })
      );

      const result = await searchService.performSearch({
        q: 'rate limit test'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('rate limit');
    });

    it('should handle authentication errors', async () => {
      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/search', () => {
          return HttpResponse.json({
            success: false,
            message: 'Invalid API key provided',
            code: 'AUTHENTICATION_ERROR'
          }, { status: 401 });
        })
      );

      const result = await searchService.performSearch({
        q: 'auth test'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('API key');
    });

    it('should handle server errors with retry', async () => {
      let attemptCount = 0;

      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/search', () => {
          attemptCount++;

          if (attemptCount < 3) {
            return HttpResponse.json({
              success: false,
              message: 'Internal server error',
              code: 'SERVER_ERROR'
            }, { status: 500 });
          }

          return HttpResponse.json({
            success: true,
            data: {
              query: 'retry test',
              results: [
                {
                  title: 'Retry Success',
                  url: 'https://example.com/retry',
                  content: 'Request succeeded after retry',
                  position: 1
                }
              ]
            },
            message: 'Search completed successfully',
            code: 'SUCCESS'
          });
        })
      );

      const result = await searchService.performSearch({
        q: 'retry test'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0]!.text).toContain('Retry Success');
      expect(attemptCount).toBe(3); // Should have retried twice
    });

    it('should handle network timeouts', async () => {
      // Use delay longer than client timeout (2000ms in test env) to ensure timeout
      const delay = process.env.JEST_WORKER_ID ? 3000 : 10000;
      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/search', async () => {
          // Simulate timeout by delaying response beyond timeout limit
          await new Promise(resolve => setTimeout(resolve, delay));
          return HttpResponse.json({ success: true });
        })
      );

      const result = await searchService.performSearch({
        q: 'timeout test'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('timeout');
    }, 15000); // Increase test timeout to 15 seconds

    it('should handle malformed API responses', async () => {
      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/search', () => {
          return HttpResponse.text('Invalid JSON response');
        })
      );

      const result = await searchService.performSearch({
        q: 'malformed test'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('response');
    });

    it('should handle missing required fields in API response', async () => {
      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/search', () => {
          return HttpResponse.json({
            success: true,
            // Missing 'data' field
            message: 'Search completed',
            code: 'SUCCESS'
          });
        })
      );

      const result = await searchService.performSearch({
        q: 'missing fields test'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Invalid');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent requests', async () => {
      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/search', ({ request }) => {
          const url = new URL(request.url);

          return HttpResponse.json({
            success: true,
            data: {
              query: url.searchParams.get('q'),
              results: [
                {
                  title: `Concurrent Result for ${url.searchParams.get('q') || 'unknown'}`,
                  url: `https://example.com/${(url.searchParams.get('q') || 'unknown').replace(/\s+/g, '-')}`,
                  content: `Content for ${url.searchParams.get('q') || 'unknown'}`,
                  position: 1
                }
              ]
            },
            message: 'Search completed successfully',
            code: 'SUCCESS'
          });
        })
      );

      const queries = [
        'concurrent test 1',
        'concurrent test 2',
        'concurrent test 3',
        'concurrent test 4',
        'concurrent test 5'
      ];

      const promises = queries.map(q =>
        searchService.performSearch({ q })
      );

      const results = await Promise.all(promises);

      results.forEach((result, index) => {
        expect(result.isError).toBe(false);
        expect(result.content[0]!.text).toContain(`Concurrent Result for ${queries[index]}`);
      });
    });

    it('should maintain performance metrics during load', async () => {
      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/search', () => {
          return HttpResponse.json({
            success: true,
            data: {
              query: 'performance test',
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
          });
        })
      );

      // Perform multiple requests to generate metrics
      for (let i = 0; i < 10; i++) {
        await searchService.performSearch({
          q: `performance test ${i}`
        });
      }

      const stats = searchService.getStats();
      expect(stats.totalSearches).toBeGreaterThanOrEqual(10);
      expect(stats.averageResponseTime).toBeGreaterThan(0);
    });

    it('should handle memory efficiently with large responses', async () => {
      const largeContent = 'x'.repeat(100000); // 100KB of content

      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/search', () => {
          return HttpResponse.json({
            success: true,
            data: {
              query: 'large content test',
              results: [
                {
                  title: 'Large Content Result',
                  url: 'https://example.com/large',
                  content: largeContent,
                  position: 1
                }
              ]
            },
            message: 'Search completed successfully',
            code: 'SUCCESS'
          });
        })
      );

      const result = await searchService.performSearch({
        q: 'large content test'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0]!.text).toContain('Large Content Result');
      expect(result.content[0]!.text.length).toBeGreaterThan(100000);
    });
  });

  describe('API Connectivity and Health Checks', () => {
    it('should test API connectivity', async () => {
      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/health', () => {
          return HttpResponse.json({
            success: true,
            message: 'API is healthy',
            code: 'SUCCESS'
          });
        })
      );

      const isConnected = await searchService.testConnection();
      expect(isConnected).toBe(true);
    });

    it('should handle API connectivity failures', async () => {
      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/health', () => {
          return HttpResponse.error();
        })
      );

      const isConnected = await searchService.testConnection();
      expect(isConnected).toBe(false);
    });

    it('should validate API key during health check', async () => {
      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/health', () => {
          return HttpResponse.json({
            success: false,
            message: 'Invalid API key',
            code: 'AUTHENTICATION_ERROR'
          }, { status: 401 });
        })
      );

      const isConnected = await searchService.testConnection();
      expect(isConnected).toBe(false);
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle extremely long queries', async () => {
      const longQuery = 'a'.repeat(10000);

      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/search', ({ request }) => {
          const url = new URL(request.url);

          expect(url.searchParams.get('q')).toBe(longQuery);

          return HttpResponse.json({
            success: true,
            data: {
              query: url.searchParams.get('q'),
              results: [
                {
                  title: 'Long Query Result',
                  url: 'https://example.com/long',
                  content: 'Result for very long query',
                  position: 1
                }
              ]
            },
            message: 'Search completed successfully',
            code: 'SUCCESS'
          });
        })
      );

      const result = await searchService.performSearch({
        q: longQuery
      });

      expect(result.isError).toBe(false);
      expect(result.content[0]!.text).toContain('Long Query Result');
    });

    it('should handle empty query strings', async () => {
      const result = await searchService.performSearch({
        q: ''
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('query');
    });

    it('should handle invalid URL formats in crawl', async () => {
      const result = await searchService.performCrawl({
        url: 'not-a-valid-url'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('valid URL');
    });

    it('should handle very large page numbers', async () => {
      mockApiServer.use(
        http.get('https://api.test.tuningsearch.com/v1/search', ({ request }) => {
          const url = new URL(request.url);

          expect(parseInt(url.searchParams.get('page') || '0')).toBe(999999);

          return HttpResponse.json({
            success: true,
            data: {
              query: url.searchParams.get('q'),
              results: [],
              suggestions: []
            },
            message: 'No results found for this page',
            code: 'NO_RESULTS'
          });
        })
      );

      const result = await searchService.performSearch({
        q: 'large page test',
        page: 999999
      });

      expect(result.isError).toBe(false);
      expect(result.content[0]!.text).toContain('No results found');
    });
  });
});
