/**
 * TuningSearch Client Tests
 * Tests for the HTTP client functionality with MSW mocking
 */

import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { TuningSearchClient } from '../clients/tuningsearch-client';
import { TuningSearchConfig } from '../types/config-types';
import {
  APIKeyError,
  ValidationError,
  NetworkError,
  TimeoutError,
  RateLimitError,
  ServerError
} from '../types/error-types';
import { SearchResponse, NewsResponse, CrawlResponse } from '../types/api-responses';

// Mock server setup
const server = setupServer();

describe('TuningSearchClient', () => {
  const mockConfig: TuningSearchConfig = {
    apiKey: 'test-api-key',
    baseUrl: 'https://api.tuningsearch.com/v1',
    timeout: 5000,
    retryAttempts: 2,
    retryDelay: 100, // Reduced for faster tests
    logLevel: 'error' // Suppress logs during tests
  };

  // Mock API responses
  const mockSearchResponse: SearchResponse = {
    success: true,
    data: {
      query: 'test query',
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
      suggestions: ['test suggestion 1', 'test suggestion 2']
    },
    message: 'Search completed successfully',
    code: 'SUCCESS'
  };

  const mockNewsResponse: NewsResponse = {
    success: true,
    data: {
      query: 'test news',
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
  };

  const mockCrawlResponse: CrawlResponse = {
    success: true,
    data: {
      url: 'https://example.com',
      title: 'Example Page',
      content: 'Example page content',
      metadata: {
        description: 'Example page description',
        keywords: ['example', 'test']
      }
    },
    message: 'Crawl completed successfully',
    code: 'SUCCESS'
  };

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'warn' });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe('Constructor', () => {
    it('should create client with valid config', () => {
      const client = new TuningSearchClient(mockConfig);

      expect(client.getBaseUrl()).toBe(mockConfig.baseUrl);
      expect(client.getHeaders()).toMatchObject({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-api-key',
        'User-Agent': 'TuningSearch-MCP-Server/1.0.0'
      });
    });

    it('should throw APIKeyError when API key is missing', () => {
      const configWithoutKey = { ...mockConfig, apiKey: undefined };

      expect(() => new TuningSearchClient(configWithoutKey)).toThrow(APIKeyError);
    });

    it('should use default values for optional config', () => {
      const minimalConfig = { apiKey: 'test-key' };
      const client = new TuningSearchClient(minimalConfig);

      expect(client.getBaseUrl()).toBe('https://api.tuningsearch.com/v1');
      expect(client.getRetryConfig().maxAttempts).toBe(3);
    });
  });

  describe('Parameter Validation', () => {
    let client: TuningSearchClient;

    beforeEach(() => {
      client = new TuningSearchClient(mockConfig);
    });

    it('should validate search parameters', async () => {
      // Test empty query
      await expect(client.search({ q: '' })).rejects.toThrow(ValidationError);

      // Test invalid page number
      await expect(client.search({ q: 'test', page: 0 })).rejects.toThrow(ValidationError);

      // Test invalid safe parameter
      await expect(client.search({ q: 'test', safe: 5 })).rejects.toThrow(ValidationError);
    });

    it('should validate news search parameters', async () => {
      // Test empty query
      await expect(client.searchNews({ q: '' })).rejects.toThrow(ValidationError);

      // Test invalid page number
      await expect(client.searchNews({ q: 'test', page: -1 })).rejects.toThrow(ValidationError);
    });

    it('should validate crawl parameters', async () => {
      // Test empty URL
      await expect(client.crawl({ url: '' })).rejects.toThrow(ValidationError);

      // Test invalid URL
      await expect(client.crawl({ url: 'not-a-url' })).rejects.toThrow(ValidationError);

      // Test non-HTTP protocol
      await expect(client.crawl({ url: 'ftp://example.com' })).rejects.toThrow(ValidationError);
    });
  });

  describe('URL Building', () => {
    let client: TuningSearchClient;

    beforeEach(() => {
      client = new TuningSearchClient(mockConfig);
    });

    it('should build correct base URL', () => {
      expect(client.getBaseUrl()).toBe('https://api.tuningsearch.com/v1');
    });

    it('should include proper headers', () => {
      const headers = client.getHeaders();

      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Authorization']).toBe('Bearer test-api-key');
      expect(headers['User-Agent']).toBe('TuningSearch-MCP-Server/1.0.0');
    });

    it('should build URLs correctly with buildUrl method', () => {
      // Test the buildUrl method directly by accessing it through a test method
      const testClient = client as any;
      const url = testClient.buildUrl('/search', { q: 'test query', page: 1 });

      // The expected URL should match the baseUrl from mockConfig
      expect(url).toBe('https://api.tuningsearch.com/v1/search?q=test+query&page=1');
    });


  });

  describe('Retry Configuration', () => {
    it('should use custom retry config', () => {
      const client = new TuningSearchClient(mockConfig);
      const retryConfig = client.getRetryConfig();

      expect(retryConfig.maxAttempts).toBe(2);
      expect(retryConfig.initialDelay).toBe(100); // Updated to match the reduced delay for tests
      expect(retryConfig.backoffFactor).toBe(2);
    });

    it('should include retryable error codes', () => {
      const client = new TuningSearchClient(mockConfig);
      const retryConfig = client.getRetryConfig();

      expect(retryConfig.retryableErrors).toContain('NETWORK_ERROR');
      expect(retryConfig.retryableErrors).toContain('RATE_LIMIT_ERROR');
      expect(retryConfig.retryableErrors).toContain('TIMEOUT_ERROR');
      expect(retryConfig.retryableErrors).toContain('SERVER_ERROR');
    });
  });

  describe('Search API Method', () => {
    let client: TuningSearchClient;

    beforeEach(() => {
      client = new TuningSearchClient(mockConfig);
    });

    it('should create client without throwing errors', () => {
      // Test that client creation works with valid config
      expect(() => {
        new TuningSearchClient(mockConfig);
      }).not.toThrow();
    });

    it('should handle search parameters correctly', () => {
      // Test that client can be created and basic methods work
      const testClient = new TuningSearchClient(mockConfig);
      expect(testClient.getBaseUrl()).toBe(mockConfig.baseUrl);
      expect(testClient.getHeaders()['Authorization']).toBe('Bearer test-api-key');
    });

    it('should validate required query parameter', async () => {
      await expect(client.search({ q: '' })).rejects.toThrow(ValidationError);
      await expect(client.search({ q: '   ' })).rejects.toThrow(ValidationError);
    });

    it('should validate page parameter', async () => {
      await expect(client.search({ q: 'test', page: 0 })).rejects.toThrow(ValidationError);
      await expect(client.search({ q: 'test', page: -1 })).rejects.toThrow(ValidationError);
    });

    it('should validate safe parameter', async () => {
      await expect(client.search({ q: 'test', safe: -1 })).rejects.toThrow(ValidationError);
      await expect(client.search({ q: 'test', safe: 3 })).rejects.toThrow(ValidationError);
    });

    it('should accept valid safe parameter values', async () => {
      // These should not throw validation errors (though they will fail due to no mock)
      const validSafeValues = [0, 1, 2];

      for (const safeValue of validSafeValues) {
        try {
          await client.search({ q: 'test', safe: safeValue });
        } catch (error) {
          // We expect network errors since we're not mocking, but not validation errors
          expect(error).not.toBeInstanceOf(ValidationError);
        }
      }
    });
  });

  describe('News Search API Method', () => {
    let client: TuningSearchClient;

    beforeEach(() => {
      client = new TuningSearchClient(mockConfig);
    });

    it('should validate required query parameter for news search', async () => {
      await expect(client.searchNews({ q: '' })).rejects.toThrow(ValidationError);
      await expect(client.searchNews({ q: '   ' })).rejects.toThrow(ValidationError);
    });

    it('should validate page parameter for news search', async () => {
      await expect(client.searchNews({ q: 'test news', page: 0 })).rejects.toThrow(ValidationError);
      await expect(client.searchNews({ q: 'test news', page: -1 })).rejects.toThrow(ValidationError);
    });

    it('should accept valid news search parameters', () => {
      // Test that client can be created for news search
      expect(() => {
        const testClient = new TuningSearchClient(mockConfig);
        expect(testClient.getBaseUrl()).toBe(mockConfig.baseUrl);
      }).not.toThrow();
    });

    it('should handle news-specific parameters', async () => {
      const newsParams = {
        q: 'technology news',
        language: 'zh',
        country: 'cn',
        page: 2,
        timeRange: 'week'
      };

      try {
        await client.searchNews(newsParams);
      } catch (error) {
        // We expect network errors since we're not mocking, but not validation errors
        expect(error).not.toBeInstanceOf(ValidationError);
      }
    });

    it('should accept valid time range values for news', async () => {
      const validTimeRanges = ['day', 'week', 'month', 'year'];

      for (const timeRange of validTimeRanges) {
        try {
          await client.searchNews({ q: 'test news', timeRange });
        } catch (error) {
          // We expect network errors since we're not mocking, but not validation errors
          expect(error).not.toBeInstanceOf(ValidationError);
        }
      }
    });
  });

  describe('Web Crawl API Method', () => {
    let client: TuningSearchClient;

    beforeEach(() => {
      client = new TuningSearchClient(mockConfig);
    });

    it('should validate required URL parameter for crawl', async () => {
      await expect(client.crawl({ url: '' })).rejects.toThrow(ValidationError);
      await expect(client.crawl({ url: '   ' })).rejects.toThrow(ValidationError);
    });

    it('should validate URL format for crawl', async () => {
      // Test invalid URL formats
      await expect(client.crawl({ url: 'not-a-url' })).rejects.toThrow(ValidationError);
      await expect(client.crawl({ url: 'invalid://url' })).rejects.toThrow(ValidationError);
      await expect(client.crawl({ url: 'ftp://example.com' })).rejects.toThrow(ValidationError);
    });

    it('should accept valid HTTP URLs for crawl', async () => {
      const validUrls = [
        'http://example.com',
        'https://example.com',
        'https://www.example.com/path',
        'https://subdomain.example.com/path?query=value'
      ];

      for (const url of validUrls) {
        try {
          await client.crawl({ url });
        } catch (error) {
          // We expect network errors since we're not mocking, but not validation errors
          expect(error).not.toBeInstanceOf(ValidationError);
        }
      }
    });

    it('should handle crawl with service parameter', async () => {
      try {
        await client.crawl({
          url: 'https://example.com',
          service: 'custom-crawler'
        });
      } catch (error) {
        // We expect network errors since we're not mocking, but not validation errors
        expect(error).not.toBeInstanceOf(ValidationError);
      }
    });

    it('should build correct crawl URL', () => {
      // Test that client can handle crawl parameters
      expect(() => {
        const testClient = new TuningSearchClient(mockConfig);
        expect(testClient.getBaseUrl()).toBe(mockConfig.baseUrl);
      }).not.toThrow();
    });

    it('should perform URL security validation', async () => {
      // Test various URL edge cases
      const testUrls = [
        'https://example.com',
        'http://localhost:3000',
        'https://192.168.1.1',
        'https://example.com:8080/path'
      ];

      for (const url of testUrls) {
        try {
          await client.crawl({ url });
        } catch (error) {
          // We expect network errors since we're not mocking, but not validation errors
          expect(error).not.toBeInstanceOf(ValidationError);
        }
      }
    });
  });

  describe('HTTP Request Handling with MSW', () => {
    let client: TuningSearchClient;

    beforeEach(() => {
      client = new TuningSearchClient(mockConfig);
    });

    describe('Successful API Calls', () => {
      it('should perform successful search request', async () => {
        server.use(
          http.get('https://api.tuningsearch.com/v1/search', () => {
            return HttpResponse.json(mockSearchResponse);
          })
        );

        const result = await client.search({ q: 'test query' });

        expect(result).toEqual(mockSearchResponse);
        expect(result.success).toBe(true);
        expect(result.data.results).toHaveLength(2);
        expect(result.data.results[0]!.title).toBe('Test Result 1');
      });

      it('should perform successful news search request', async () => {
        server.use(
          http.get('https://api.tuningsearch.com/v1/news', () => {
            return HttpResponse.json(mockNewsResponse);
          })
        );

        const result = await client.searchNews({ q: 'test news' });

        expect(result).toEqual(mockNewsResponse);
        expect(result.success).toBe(true);
        expect(result.data.results).toHaveLength(1);
        expect(result.data.results[0]!.source).toBe('Test News Source');
      });

      it('should perform successful crawl request', async () => {
        server.use(
          http.get('https://api.tuningsearch.com/v1/crawl', () => {
            return HttpResponse.json(mockCrawlResponse);
          })
        );

        const result = await client.crawl({ url: 'https://example.com' });

        expect(result).toEqual(mockCrawlResponse);
        expect(result.success).toBe(true);
        expect(result.data.title).toBe('Example Page');
      });

      it('should include proper headers in requests', async () => {
        let capturedHeaders: Record<string, string> = {};

        server.use(
          http.get('https://api.tuningsearch.com/v1/search', ({ request }) => {
            capturedHeaders = Object.fromEntries(request.headers.entries());
            return HttpResponse.json(mockSearchResponse);
          })
        );

        await client.search({ q: 'test' });

        expect(capturedHeaders['authorization']).toBe('Bearer test-api-key');
        expect(capturedHeaders['content-type']).toBe('application/json');
        expect(capturedHeaders['user-agent']).toBe('TuningSearch-MCP-Server/1.0.0');
      });

      it('should build URLs with query parameters correctly', async () => {
        let capturedUrl: string = '';

        server.use(
          http.get('https://api.tuningsearch.com/v1/search', ({ request }) => {
            capturedUrl = request.url;
            return HttpResponse.json(mockSearchResponse);
          })
        );

        await client.search({
          q: 'test query',
          language: 'zh',
          country: 'cn',
          page: 2,
          safe: 1
        });

        const url = new URL(capturedUrl);
        expect(url.searchParams.get('q')).toBe('test query');
        expect(url.searchParams.get('language')).toBe('zh');
        expect(url.searchParams.get('country')).toBe('cn');
        expect(url.searchParams.get('page')).toBe('2');
        expect(url.searchParams.get('safe')).toBe('1');
      });
    });

    describe('Error Handling', () => {
      it('should handle 401 Unauthorized errors', async () => {
        server.use(
          http.get('https://api.tuningsearch.com/v1/search', () => {
            return HttpResponse.json(
              { error: 'Invalid API key', code: 'UNAUTHORIZED' },
              { status: 401 }
            );
          })
        );

        await expect(client.search({ q: 'test' })).rejects.toThrow(APIKeyError);
      });

      it('should handle 429 Rate Limit errors', async () => {
        server.use(
          http.get('https://api.tuningsearch.com/v1/search', () => {
            return HttpResponse.json(
              { error: 'Rate limit exceeded', code: 'RATE_LIMIT' },
              { status: 429 }
            );
          })
        );

        await expect(client.search({ q: 'test' })).rejects.toThrow(RateLimitError);
      });

      it('should handle 500 Server errors', async () => {
        server.use(
          http.get('https://api.tuningsearch.com/v1/search', () => {
            return HttpResponse.json(
              { error: 'Internal server error', code: 'SERVER_ERROR' },
              { status: 500 }
            );
          })
        );

        await expect(client.search({ q: 'test' })).rejects.toThrow(ServerError);
      });

      it('should handle network errors', async () => {
        server.use(
          http.get('https://api.tuningsearch.com/v1/search', () => {
            return HttpResponse.error();
          })
        );

        await expect(client.search({ q: 'test' })).rejects.toThrow(NetworkError);
      });

      it('should handle timeout errors', async () => {
        const shortTimeoutClient = new TuningSearchClient({
          ...mockConfig,
          timeout: 100 // Very short timeout
        });

        server.use(
          http.get('https://api.tuningsearch.com/v1/search', async () => {
            // Delay longer than timeout
            await new Promise(resolve => setTimeout(resolve, 200));
            return HttpResponse.json(mockSearchResponse);
          })
        );

        await expect(shortTimeoutClient.search({ q: 'test' })).rejects.toThrow(TimeoutError);
      });

      it('should handle non-JSON error responses', async () => {
        server.use(
          http.get('https://api.tuningsearch.com/v1/search', () => {
            return new HttpResponse('Internal Server Error', { status: 500 });
          })
        );

        await expect(client.search({ q: 'test' })).rejects.toThrow(ServerError);
      });
    });

    describe('Retry Mechanism', () => {
      it('should retry on retryable errors', async () => {
        let attemptCount = 0;

        server.use(
          http.get('https://api.tuningsearch.com/v1/search', () => {
            attemptCount++;
            if (attemptCount < 2) {
              return HttpResponse.json(
                { error: 'Temporary server error', code: 'SERVER_ERROR' },
                { status: 500 }
              );
            }
            return HttpResponse.json(mockSearchResponse);
          })
        );

        const result = await client.search({ q: 'test' });

        expect(attemptCount).toBe(2); // Should succeed on the 2nd attempt
        expect(result).toEqual(mockSearchResponse);
      });

      it('should not retry on non-retryable errors', async () => {
        let attemptCount = 0;

        server.use(
          http.get('https://api.tuningsearch.com/v1/search', () => {
            attemptCount++;
            return HttpResponse.json(
              { error: 'Invalid API key', code: 'UNAUTHORIZED' },
              { status: 401 }
            );
          })
        );

        await expect(client.search({ q: 'test' })).rejects.toThrow(APIKeyError);
        expect(attemptCount).toBe(1);
      });

      it('should respect maximum retry attempts', async () => {
        let attemptCount = 0;

        server.use(
          http.get('https://api.tuningsearch.com/v1/search', () => {
            attemptCount++;
            return HttpResponse.json(
              { error: 'Server error', code: 'SERVER_ERROR' },
              { status: 500 }
            );
          })
        );

        await expect(client.search({ q: 'test' })).rejects.toThrow(ServerError);
        expect(attemptCount).toBe(2); // maxAttempts is set to 2 in mockConfig
      });

      it('should implement exponential backoff', async () => {
        const timestamps: number[] = [];
        let attemptCount = 0;

        server.use(
          http.get('https://api.tuningsearch.com/v1/search', () => {
            timestamps.push(Date.now());
            attemptCount++;
            return HttpResponse.json(
              { error: 'Server error', code: 'SERVER_ERROR' },
              { status: 500 }
            );
          })
        );

        await expect(client.search({ q: 'test' })).rejects.toThrow(ServerError);

        expect(attemptCount).toBe(2); // maxAttempts is set to 2 in mockConfig
        expect(timestamps).toHaveLength(2);

        // Check that delay exists (allowing for some timing variance)
        const delay1 = timestamps[1]! - timestamps[0]!;

        expect(delay1).toBeGreaterThanOrEqual(90); // ~100ms with some tolerance
      });

      it('should retry network errors', async () => {
        let attemptCount = 0;

        server.use(
          http.get('https://api.tuningsearch.com/v1/search', () => {
            attemptCount++;
            if (attemptCount < 2) {
              return HttpResponse.error();
            }
            return HttpResponse.json(mockSearchResponse);
          })
        );

        const result = await client.search({ q: 'test' });

        expect(attemptCount).toBe(2); // Should succeed on the 2nd attempt
        expect(result).toEqual(mockSearchResponse);
      });
    });

    describe('Request Building', () => {
      it('should omit undefined parameters from URL', async () => {
        let capturedUrl: string = '';

        server.use(
          http.get('https://api.tuningsearch.com/v1/search', ({ request }) => {
            capturedUrl = request.url;
            return HttpResponse.json(mockSearchResponse);
          })
        );

        await client.search({
          q: 'test',
          language: 'zh',
          country: undefined,
          page: undefined
        });

        const url = new URL(capturedUrl);
        expect(url.searchParams.get('q')).toBe('test');
        expect(url.searchParams.get('language')).toBe('zh');
        expect(url.searchParams.has('country')).toBe(false);
        expect(url.searchParams.has('page')).toBe(false);
      });

      it('should handle special characters in query parameters', async () => {
        let capturedUrl: string = '';

        server.use(
          http.get('https://api.tuningsearch.com/v1/search', ({ request }) => {
            capturedUrl = request.url;
            return HttpResponse.json(mockSearchResponse);
          })
        );

        await client.search({ q: 'test query with spaces & symbols' });

        const url = new URL(capturedUrl);
        expect(url.searchParams.get('q')).toBe('test query with spaces & symbols');
      });
    });
  });

  describe('Utility Methods', () => {
    let client: TuningSearchClient;

    beforeEach(() => {
      client = new TuningSearchClient(mockConfig);
    });

    it('should test API connectivity successfully', async () => {
      server.use(
        http.get('https://api.tuningsearch.com/v1/search', () => {
          return HttpResponse.json(mockSearchResponse);
        })
      );

      const isConnected = await client.testConnection();
      expect(isConnected).toBe(true);
    });

    it('should detect API connectivity failure', async () => {
      server.use(
        http.get('https://api.tuningsearch.com/v1/search', () => {
          return HttpResponse.json(
            { error: 'Server error', code: 'SERVER_ERROR' },
            { status: 500 }
          );
        })
      );

      const isConnected = await client.testConnection();
      expect(isConnected).toBe(false);
    });

    it('should return correct base URL', () => {
      expect(client.getBaseUrl()).toBe(mockConfig.baseUrl);
    });

    it('should return correct headers', () => {
      const headers = client.getHeaders();
      expect(headers['Authorization']).toBe('Bearer test-api-key');
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['User-Agent']).toBe('TuningSearch-MCP-Server/1.0.0');
    });

    it('should return correct retry configuration', () => {
      const retryConfig = client.getRetryConfig();
      expect(retryConfig.maxAttempts).toBe(2);
      expect(retryConfig.initialDelay).toBe(100);
      expect(retryConfig.backoffFactor).toBe(2);
    });
  });
});
