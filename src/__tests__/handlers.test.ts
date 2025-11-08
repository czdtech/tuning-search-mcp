/**
 * Handler Tests
 * Tests for MCP tool handlers
 */

import { SearchToolHandler } from '../handlers/search-tool-handler';
import { NewsToolHandler } from '../handlers/news-tool-handler';
import { CrawlToolHandler } from '../handlers/crawl-tool-handler';
import { SearchService } from '../services/search-service';

// Mock the dependencies
jest.mock('../services/search-service');

describe('MCP Tool Handlers', () => {
  let mockSearchService: jest.Mocked<SearchService>;
  let searchHandler: SearchToolHandler;
  let newsHandler: NewsToolHandler;
  let crawlHandler: CrawlToolHandler;

  beforeEach(() => {
    // Create mock search service
    mockSearchService = {
      performSearch: jest.fn(),
      performNewsSearch: jest.fn(),
      performCrawl: jest.fn(),
    } as any;

    // Create handlers
    searchHandler = new SearchToolHandler(mockSearchService);
    newsHandler = new NewsToolHandler(mockSearchService);
    crawlHandler = new CrawlToolHandler(mockSearchService);
  });

  describe('SearchToolHandler', () => {
    it('should validate and handle search requests', async () => {
      const mockResponse = {
        content: [{ type: 'text' as const, text: 'Search results' }],
        isError: false
      };
      mockSearchService.performSearch.mockResolvedValue(mockResponse);

      const args = { q: 'test query' };
      const result = await searchHandler.handleSearchRequest(args);

      expect(mockSearchService.performSearch).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResponse);
    });

    it('should handle validation errors', async () => {
      const args = { q: '' }; // Invalid empty query
      const result = await searchHandler.handleSearchRequest(args);

      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Validation Error');
    });

    it('should validate arguments statically', () => {
      const validArgs = { q: 'test query' };
      const invalidArgs = { q: '' };

      const validResult = SearchToolHandler.validateArgs(validArgs);
      const invalidResult = SearchToolHandler.validateArgs(invalidArgs);

      expect(validResult.valid).toBe(true);
      expect(validResult.data).toEqual(validArgs);

      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toContain('format');
    });

    it('should provide handler information', () => {
      const info = searchHandler.getHandlerInfo();

      expect(info.name).toBe('SearchToolHandler');
      expect(info.supportedOperations).toContain('handleSearchRequest');
      expect(info.validationRules).toContain('Query is required and non-empty');
    });
  });

  describe('NewsToolHandler', () => {
    it('should validate and handle news requests', async () => {
      const mockResponse = {
        content: [{ type: 'text' as const, text: 'News results' }],
        isError: false
      };
      mockSearchService.performNewsSearch.mockResolvedValue(mockResponse);

      const args = { q: 'test news' };
      const result = await newsHandler.handleNewsRequest(args);

      expect(mockSearchService.performNewsSearch).toHaveBeenCalledWith(args);
      expect(result.content[0]!.text).toContain('News results');
      expect(result.content[0]!.text).toContain('News Search Metadata');
    });

    it('should handle validation errors', async () => {
      const args = { q: '' }; // Invalid empty query
      const result = await newsHandler.handleNewsRequest(args);

      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('News Search Validation Error');
    });

    it('should validate arguments statically', () => {
      const validArgs = { q: 'test news' };
      const invalidArgs = { q: '' };

      const validResult = NewsToolHandler.validateArgs(validArgs);
      const invalidResult = NewsToolHandler.validateArgs(invalidArgs);

      expect(validResult.valid).toBe(true);
      expect(validResult.data).toEqual(validArgs);

      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toContain('format');
    });

    it('should provide handler information', () => {
      const info = newsHandler.getHandlerInfo();

      expect(info.name).toBe('NewsToolHandler');
      expect(info.supportedOperations).toContain('handleNewsRequest');
      expect(info.newsSpecificFeatures).toContain('Source metadata extraction');
    });
  });

  describe('CrawlToolHandler', () => {
    it('should validate and handle crawl requests', async () => {
      const mockResponse = {
        content: [{ type: 'text' as const, text: 'Crawl results' }],
        isError: false
      };
      mockSearchService.performCrawl.mockResolvedValue(mockResponse);

      const args = { url: 'https://example.com' };
      const result = await crawlHandler.handleCrawlRequest(args);

      expect(mockSearchService.performCrawl).toHaveBeenCalledWith(args);
      expect(result.content[0]!.text).toContain('Crawl results');
      expect(result.content[0]!.text).toContain('Crawl Metadata');
    });

    it('should handle validation errors', async () => {
      const args = { url: '' }; // Invalid empty URL
      const result = await crawlHandler.handleCrawlRequest(args);

      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Crawl Validation Error');
    });

    it('should handle security validation errors', async () => {
      const args = { url: 'http://localhost:3000' }; // Blocked URL
      const result = await crawlHandler.handleCrawlRequest(args);

      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Crawl Security Error');
    });

    it('should validate arguments statically', () => {
      const validArgs = { url: 'https://example.com' };
      const invalidArgs = { url: '' };

      const validResult = CrawlToolHandler.validateArgs(validArgs);
      const invalidResult = CrawlToolHandler.validateArgs(invalidArgs);

      expect(validResult.valid).toBe(true);
      expect(validResult.data).toEqual(validArgs);

      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toContain('format');
    });

    it('should provide handler information', () => {
      const info = crawlHandler.getHandlerInfo();

      expect(info.name).toBe('CrawlToolHandler');
      expect(info.supportedOperations).toContain('handleCrawlRequest');
      expect(info.securityFeatures).toContain('Protocol validation');
    });

    it('should allow security configuration updates', () => {
      const newConfig = { allowPrivateNetworks: true };
      crawlHandler.updateSecurityConfig(newConfig);

      const config = crawlHandler.getSecurityConfig();
      expect(config.allowPrivateNetworks).toBe(true);
    });
  });
});
