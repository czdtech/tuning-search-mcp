/**
 * Unit tests for SearchService
 */

import { SearchService, DEFAULT_SEARCH_SERVICE_CONFIG } from '../services/search-service';
import { TuningSearchClient } from '../clients/tuningsearch-client';
import { ErrorHandler } from '../services/error-handler';
import { 
  SearchToolArgs, 
  NewsToolArgs, 
  CrawlToolArgs
} from '../types/tool-types';
import { 
  SearchResponse, 
  NewsResponse, 
  CrawlResponse 
} from '../types/api-responses';

// Mock the TuningSearchClient
jest.mock('../clients/tuningsearch-client');
const MockTuningSearchClient = TuningSearchClient as jest.MockedClass<typeof TuningSearchClient>;

describe('SearchService', () => {
  let searchService: SearchService;
  let mockClient: jest.Mocked<TuningSearchClient>;
  let mockErrorHandler: jest.Mocked<ErrorHandler>;

  beforeEach(() => {
    // Create mock client
    mockClient = new MockTuningSearchClient({
      apiKey: 'test-key'
    }) as jest.Mocked<TuningSearchClient>;

    // Create mock error handler
    mockErrorHandler = {
      handleError: jest.fn().mockReturnValue({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        retryable: false,
        timestamp: new Date().toISOString()
      }),
      createUserMessage: jest.fn(),
      shouldReport: jest.fn(),
      updateConfig: jest.fn(),
      getConfig: jest.fn()
    } as any;

    // Create search service with stricter config for validation tests
    searchService = new SearchService(mockClient, {
      maxQueryLength: 500,  // Stricter limit for validation tests
      maxPage: 100           // Stricter limit for validation tests
    }, mockErrorHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const service = new SearchService(mockClient);
      const config = service.getConfig();
      
      expect(config).toEqual(DEFAULT_SEARCH_SERVICE_CONFIG);
    });

    it('should merge custom configuration with defaults', () => {
      const customConfig = { maxQueryLength: 1000 };
      const service = new SearchService(mockClient, customConfig);
      const config = service.getConfig();
      
      expect(config.maxQueryLength).toBe(1000);
      expect(config.defaultPageSize).toBe(DEFAULT_SEARCH_SERVICE_CONFIG.defaultPageSize);
    });

    it('should initialize statistics', () => {
      const stats = searchService.getStats();
      
      expect(stats.totalSearches).toBe(0);
      expect(stats.successfulSearches).toBe(0);
      expect(stats.failedSearches).toBe(0);
    });
  });

  describe('performSearch', () => {
    const validSearchArgs: SearchToolArgs = {
      q: 'test query',
      page: 1,
      safe: 0
    };

    const mockSearchResponse: SearchResponse = {
      success: true,
      message: 'Success',
      code: 'SUCCESS',
      data: {
        query: 'test query',
        results: [
          {
            title: 'Test Result',
            url: 'https://example.com',
            content: 'Test content',
            position: 1
          }
        ]
      }
    };

    it('should perform successful search', async () => {
      mockClient.search.mockResolvedValue(mockSearchResponse);

      const result = await searchService.performSearch(validSearchArgs);

      expect(mockClient.search).toHaveBeenCalledWith({
        q: 'test query',
        page: 1,
        safe: 0
      });
      expect(result.isError).toBeFalsy();
      expect(result.content[0]?.text).toContain('Test Result');
    });

    it('should update statistics on successful search', async () => {
      mockClient.search.mockResolvedValue(mockSearchResponse);

      await searchService.performSearch(validSearchArgs);
      const stats = searchService.getStats();

      expect(stats.totalSearches).toBe(1);
      expect(stats.successfulSearches).toBe(1);
      expect(stats.failedSearches).toBe(0);
      expect(stats.lastSearchTime).toBeInstanceOf(Date);
    });

    it('should validate search arguments', async () => {
      const invalidArgs = { q: '' } as SearchToolArgs;

      const result = await searchService.performSearch(invalidArgs);

      expect(result.isError).toBe(true);
      expect(mockClient.search).not.toHaveBeenCalled();
    });

    it('should validate query length', async () => {
      const longQuery = 'a'.repeat(501); // Exceeds default max length
      const invalidArgs: SearchToolArgs = { q: longQuery };

      const result = await searchService.performSearch(invalidArgs);

      expect(result.isError).toBe(true);
      expect(mockClient.search).not.toHaveBeenCalled();
    });

    it('should validate page number', async () => {
      const invalidArgs: SearchToolArgs = { 
        q: 'test', 
        page: 101 // Exceeds default max page
      };

      const result = await searchService.performSearch(invalidArgs);

      expect(result.isError).toBe(true);
      expect(mockClient.search).not.toHaveBeenCalled();
    });

    it('should validate safe search level', async () => {
      const invalidArgs: SearchToolArgs = { 
        q: 'test', 
        safe: 5 // Invalid safe level
      };

      const result = await searchService.performSearch(invalidArgs);

      expect(result.isError).toBe(true);
      expect(mockClient.search).not.toHaveBeenCalled();
    });

    it('should validate time range', async () => {
      const invalidArgs: SearchToolArgs = { 
        q: 'test', 
        timeRange: 'invalid' // Invalid time range
      };

      const result = await searchService.performSearch(invalidArgs);

      expect(result.isError).toBe(true);
      expect(mockClient.search).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const apiError = new Error('API Error');
      mockClient.search.mockRejectedValue(apiError);
      mockErrorHandler.handleError.mockReturnValue({
        code: 'API_ERROR',
        message: 'API request failed',
        retryable: true,
        timestamp: new Date().toISOString()
      });

      const result = await searchService.performSearch(validSearchArgs);
      const stats = searchService.getStats();

      expect(result.isError).toBe(true);
      expect(stats.failedSearches).toBe(1);
      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        apiError,
        'search query: "test query"'
      );
    });

    it('should preprocess arguments', async () => {
      mockClient.search.mockResolvedValue(mockSearchResponse);
      
      const argsWithWhitespace: SearchToolArgs = {
        q: '  test query  ',
        // page and safe should get defaults
      };

      await searchService.performSearch(argsWithWhitespace);

      expect(mockClient.search).toHaveBeenCalledWith({
        q: 'test query', // trimmed
        page: 1, // default
        safe: 0 // default
      });
    });
  });

  describe('performNewsSearch', () => {
    const validNewsArgs: NewsToolArgs = {
      q: 'news query',
      page: 1
    };

    const mockNewsResponse: NewsResponse = {
      success: true,
      message: 'Success',
      code: 'SUCCESS',
      data: {
        query: 'news query',
        results: [
          {
            title: 'News Title',
            url: 'https://news.example.com',
            content: 'News content',
            position: 1,
            publishedDate: '2024-01-01',
            source: 'News Source'
          }
        ]
      }
    };

    it('should perform successful news search', async () => {
      mockClient.searchNews.mockResolvedValue(mockNewsResponse);

      const result = await searchService.performNewsSearch(validNewsArgs);

      expect(mockClient.searchNews).toHaveBeenCalledWith({
        q: 'news query',
        page: 1
      });
      expect(result.isError).toBeFalsy();
      expect(result.content[0]?.text).toContain('News Title');
    });

    it('should update statistics on successful news search', async () => {
      mockClient.searchNews.mockResolvedValue(mockNewsResponse);

      await searchService.performNewsSearch(validNewsArgs);
      const stats = searchService.getStats();

      expect(stats.totalNewsSearches).toBe(1);
      expect(stats.successfulSearches).toBe(1);
    });

    it('should validate news arguments', async () => {
      const invalidArgs = { q: '' } as NewsToolArgs;

      const result = await searchService.performNewsSearch(invalidArgs);

      expect(result.isError).toBe(true);
      expect(mockClient.searchNews).not.toHaveBeenCalled();
    });
  });

  describe('performCrawl', () => {
    const validCrawlArgs: CrawlToolArgs = {
      url: 'https://example.com'
    };

    const mockCrawlResponse: CrawlResponse = {
      success: true,
      message: 'Success',
      code: 'SUCCESS',
      data: {
        url: 'https://example.com',
        title: 'Example Page',
        content: 'Page content'
      }
    };

    it('should perform successful crawl', async () => {
      mockClient.crawl.mockResolvedValue(mockCrawlResponse);

      const result = await searchService.performCrawl(validCrawlArgs);

      expect(mockClient.crawl).toHaveBeenCalledWith({
        url: 'https://example.com'
      });
      expect(result.isError).toBeFalsy();
      expect(result.content[0]?.text).toContain('Example Page');
    });

    it('should update statistics on successful crawl', async () => {
      mockClient.crawl.mockResolvedValue(mockCrawlResponse);

      await searchService.performCrawl(validCrawlArgs);
      const stats = searchService.getStats();

      expect(stats.totalCrawls).toBe(1);
      expect(stats.successfulSearches).toBe(1);
    });

    it('should validate crawl URL', async () => {
      const invalidArgs: CrawlToolArgs = { url: 'invalid-url' };

      const result = await searchService.performCrawl(invalidArgs);

      expect(result.isError).toBe(true);
      expect(mockClient.crawl).not.toHaveBeenCalled();
    });

    it('should reject local URLs', async () => {
      const localArgs: CrawlToolArgs = { url: 'http://localhost:3000' };

      const result = await searchService.performCrawl(localArgs);

      expect(result.isError).toBe(true);
      expect(mockClient.crawl).not.toHaveBeenCalled();
    });

    it('should reject private network URLs', async () => {
      const privateArgs: CrawlToolArgs = { url: 'http://192.168.1.1' };

      const result = await searchService.performCrawl(privateArgs);

      expect(result.isError).toBe(true);
      expect(mockClient.crawl).not.toHaveBeenCalled();
    });

    it('should require HTTPS or HTTP protocol', async () => {
      const ftpArgs: CrawlToolArgs = { url: 'ftp://example.com' };

      const result = await searchService.performCrawl(ftpArgs);

      expect(result.isError).toBe(true);
      expect(mockClient.crawl).not.toHaveBeenCalled();
    });
  });

  describe('configuration management', () => {
    it('should update configuration', () => {
      const newConfig = { maxQueryLength: 1000 };
      
      searchService.updateConfig(newConfig);
      const config = searchService.getConfig();

      expect(config.maxQueryLength).toBe(1000);
    });

    it('should get current configuration', () => {
      // Create a new service instance with default config for this test
      const defaultService = new SearchService(mockClient, {}, mockErrorHandler);
      const config = defaultService.getConfig();
      
      expect(config).toEqual(DEFAULT_SEARCH_SERVICE_CONFIG);
    });
  });

  describe('statistics management', () => {
    it('should track response times', async () => {
      const mockResponse: SearchResponse = {
        success: true,
        message: 'Success',
        code: 'SUCCESS',
        data: { query: 'test', results: [] }
      };
      
      // Add a small delay to simulate response time
      mockClient.search.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockResponse), 1))
      );

      await searchService.performSearch({ q: 'test' });
      const stats = searchService.getStats();

      expect(stats.averageResponseTime).toBeGreaterThanOrEqual(0);
    });

    it('should reset statistics', () => {
      // Perform some operations first
      searchService.getStats(); // Initialize stats
      
      searchService.resetStats();
      const stats = searchService.getStats();

      expect(stats.totalSearches).toBe(0);
      expect(stats.successfulSearches).toBe(0);
      expect(stats.failedSearches).toBe(0);
      expect(stats.averageResponseTime).toBe(0);
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection test', async () => {
      const mockResponse: SearchResponse = {
        success: true,
        message: 'Success',
        code: 'SUCCESS',
        data: { query: 'test connection', results: [] }
      };
      
      mockClient.search.mockResolvedValue(mockResponse);

      const result = await searchService.testConnection();

      expect(result).toBe(true);
      expect(mockClient.search).toHaveBeenCalledWith({ 
        q: 'test connection',
        page: 1,
        safe: 0
      });
    });

    it('should return false for failed connection test', async () => {
      mockClient.search.mockRejectedValue(new Error('Connection failed'));

      const result = await searchService.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('cache integration', () => {
    it('should provide cache statistics', () => {
      const cacheStats = searchService.getCacheStats();
      
      expect(cacheStats).toBeTruthy();
      expect(typeof cacheStats.hits).toBe('number');
      expect(typeof cacheStats.misses).toBe('number');
      expect(typeof cacheStats.hitRatio).toBe('number');
    });

    it('should clear cache', () => {
      expect(() => searchService.clearCache()).not.toThrow();
    });

    it('should invalidate specific cache types', () => {
      const searchInvalidated = searchService.invalidateSearchCache();
      const newsInvalidated = searchService.invalidateNewsCache();
      const crawlInvalidated = searchService.invalidateCrawlCache();
      
      expect(typeof searchInvalidated).toBe('number');
      expect(typeof newsInvalidated).toBe('number');
      expect(typeof crawlInvalidated).toBe('number');
    });

    it('should provide cache health information', () => {
      const health = searchService.getCacheHealth();
      
      expect(health).toBeTruthy();
      expect(['healthy', 'warning', 'critical']).toContain(health.status);
      expect(Array.isArray(health.issues)).toBe(true);
      expect(Array.isArray(health.recommendations)).toBe(true);
    });
  });

  describe('performance monitoring', () => {
    it('should provide performance metrics', () => {
      const metrics = searchService.getPerformanceMetrics();
      
      expect(Array.isArray(metrics)).toBe(true);
    });

    it('should provide performance summary', () => {
      const summary = searchService.getPerformanceSummary();
      
      expect(summary).toBeTruthy();
      expect(typeof summary.totalOperations).toBe('number');
      expect(typeof summary.averageResponseTime).toBe('number');
      expect(typeof summary.overallSuccessRate).toBe('number');
      expect(['healthy', 'warning', 'critical']).toContain(summary.systemHealth);
    });

    it('should provide system metrics', () => {
      const systemMetrics = searchService.getSystemMetrics();
      
      expect(systemMetrics).toBeTruthy();
      expect(systemMetrics.memory).toBeTruthy();
      expect(systemMetrics.cpu).toBeTruthy();
      expect(typeof systemMetrics.uptime).toBe('number');
    });

    it('should provide performance alerts', () => {
      const alerts = searchService.getPerformanceAlerts();
      
      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  describe('health reporting', () => {
    it('should provide comprehensive health report', () => {
      const healthReport = searchService.getHealthReport();
      
      expect(healthReport).toBeTruthy();
      expect(['healthy', 'warning', 'critical']).toContain(healthReport.overall);
      expect(healthReport.cache).toBeTruthy();
      expect(healthReport.performance).toBeTruthy();
      expect(healthReport.system).toBeTruthy();
      expect(healthReport.statistics).toBeTruthy();
      expect(Array.isArray(healthReport.recommendations)).toBe(true);
    });
  });
});