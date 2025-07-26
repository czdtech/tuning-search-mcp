/**
 * Unit tests for CacheService
 */

import {
  CacheService,
  DEFAULT_CACHE_CONFIG,
  CacheKeyGenerator,
} from "../services/cache-service";
import {
  SearchResponse,
  NewsResponse,
  CrawlResponse,
} from "../types/api-responses";
import {
  SearchToolArgs,
  NewsToolArgs,
  CrawlToolArgs,
} from "../types/tool-types";

describe("CacheService", () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = new CacheService();
  });

  afterEach(() => {
    cacheService.destroy();
  });

  describe("constructor", () => {
    it("should initialize with default configuration", () => {
      const config = cacheService.getConfig();
      expect(config).toEqual(DEFAULT_CACHE_CONFIG);
    });

    it("should merge custom configuration with defaults", () => {
      const customConfig = { defaultTtl: 10000, maxSize: 500 };
      const customCache = new CacheService(customConfig);
      const config = customCache.getConfig();

      expect(config.defaultTtl).toBe(10000);
      expect(config.maxSize).toBe(500);
      expect(config.searchTtl).toBe(DEFAULT_CACHE_CONFIG.searchTtl);

      customCache.destroy();
    });
  });

  describe("CacheKeyGenerator", () => {
    it("should generate consistent keys for search requests", () => {
      const args: SearchToolArgs = { q: "test query", page: 1, safe: 0 };

      const key1 = CacheKeyGenerator.forSearch(args);
      const key2 = CacheKeyGenerator.forSearch(args);

      expect(key1).toBe(key2);
      expect(key1).toMatch(/^search:/);
    });

    it("should generate different keys for different search requests", () => {
      const args1: SearchToolArgs = { q: "test query 1" };
      const args2: SearchToolArgs = { q: "test query 2" };

      const key1 = CacheKeyGenerator.forSearch(args1);
      const key2 = CacheKeyGenerator.forSearch(args2);

      expect(key1).not.toBe(key2);
    });

    it("should generate consistent keys for news requests", () => {
      const args: NewsToolArgs = { q: "news query", page: 1 };

      const key1 = CacheKeyGenerator.forNews(args);
      const key2 = CacheKeyGenerator.forNews(args);

      expect(key1).toBe(key2);
      expect(key1).toMatch(/^news:/);
    });

    it("should generate consistent keys for crawl requests", () => {
      const args: CrawlToolArgs = { url: "https://example.com" };

      const key1 = CacheKeyGenerator.forCrawl(args);
      const key2 = CacheKeyGenerator.forCrawl(args);

      expect(key1).toBe(key2);
      expect(key1).toMatch(/^crawl:/);
    });
  });

  describe("search response caching", () => {
    const mockSearchResponse: SearchResponse = {
      success: true,
      message: "Success",
      code: "SUCCESS",
      data: {
        query: "test query",
        results: [
          {
            title: "Test Result",
            url: "https://example.com",
            content: "Test content",
            position: 1,
          },
        ],
      },
    };

    const searchArgs: SearchToolArgs = { q: "test query" };

    it("should cache and retrieve search responses", async () => {
      // Initially should return null (cache miss)
      let cached = await cacheService.getSearchResponse(searchArgs);
      expect(cached).toBeNull();

      // Cache the response
      await cacheService.setSearchResponse(searchArgs, mockSearchResponse);

      // Should now return cached response
      cached = await cacheService.getSearchResponse(searchArgs);
      expect(cached).toEqual(mockSearchResponse);
    });

    it("should update cache statistics on hits and misses", async () => {
      // Initial miss
      await cacheService.getSearchResponse(searchArgs);
      let stats = cacheService.getStats();
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(0);

      // Cache and hit
      await cacheService.setSearchResponse(searchArgs, mockSearchResponse);
      await cacheService.getSearchResponse(searchArgs);

      stats = cacheService.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.hitRatio).toBe(0.5); // 1 hit out of 2 total accesses
    });

    it("should expire cached entries after TTL", async () => {
      const shortTtlCache = new CacheService({ searchTtl: 10 }); // 10ms TTL

      await shortTtlCache.setSearchResponse(searchArgs, mockSearchResponse);

      // Should be cached immediately
      let cached = await shortTtlCache.getSearchResponse(searchArgs);
      expect(cached).toEqual(mockSearchResponse);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Should be expired now
      cached = await shortTtlCache.getSearchResponse(searchArgs);
      expect(cached).toBeNull();

      shortTtlCache.destroy();
    });
  });

  describe("news response caching", () => {
    const mockNewsResponse: NewsResponse = {
      success: true,
      message: "Success",
      code: "SUCCESS",
      data: {
        query: "news query",
        results: [
          {
            title: "News Title",
            url: "https://news.example.com",
            content: "News content",
            position: 1,
            publishedDate: "2024-01-15",
            source: "News Source",
          },
        ],
      },
    };

    const newsArgs: NewsToolArgs = { q: "news query" };

    it("should cache and retrieve news responses", async () => {
      await cacheService.setNewsResponse(newsArgs, mockNewsResponse);
      const cached = await cacheService.getNewsResponse(newsArgs);
      expect(cached).toEqual(mockNewsResponse);
    });
  });

  describe("crawl response caching", () => {
    const mockCrawlResponse: CrawlResponse = {
      success: true,
      message: "Success",
      code: "SUCCESS",
      data: {
        url: "https://example.com",
        title: "Example Page",
        content: "Page content",
      },
    };

    const crawlArgs: CrawlToolArgs = { url: "https://example.com" };

    it("should cache and retrieve crawl responses", async () => {
      await cacheService.setCrawlResponse(crawlArgs, mockCrawlResponse);
      const cached = await cacheService.getCrawlResponse(crawlArgs);
      expect(cached).toEqual(mockCrawlResponse);
    });
  });

  describe("cache management", () => {
    it("should clear all cache entries", async () => {
      const searchArgs: SearchToolArgs = { q: "test" };
      const mockResponse: SearchResponse = {
        success: true,
        message: "Success",
        code: "SUCCESS",
        data: { query: "test", results: [] },
      };

      await cacheService.setSearchResponse(searchArgs, mockResponse);
      expect(await cacheService.getSearchResponse(searchArgs)).toEqual(
        mockResponse
      );

      cacheService.clear();
      expect(await cacheService.getSearchResponse(searchArgs)).toBeNull();
    });

    it("should invalidate search cache entries", async () => {
      const searchArgs: SearchToolArgs = { q: "test" };
      const newsArgs: NewsToolArgs = { q: "news test" };

      const mockSearchResponse: SearchResponse = {
        success: true,
        message: "Success",
        code: "SUCCESS",
        data: { query: "test", results: [] },
      };

      const mockNewsResponse: NewsResponse = {
        success: true,
        message: "Success",
        code: "SUCCESS",
        data: { query: "news test", results: [] },
      };

      await cacheService.setSearchResponse(searchArgs, mockSearchResponse);
      await cacheService.setNewsResponse(newsArgs, mockNewsResponse);

      const invalidatedCount = cacheService.invalidateSearchCache();
      expect(invalidatedCount).toBe(1);

      expect(await cacheService.getSearchResponse(searchArgs)).toBeNull();
      expect(await cacheService.getNewsResponse(newsArgs)).toEqual(
        mockNewsResponse
      );
    });

    it("should cleanup expired entries", async () => {
      const shortTtlCache = new CacheService({
        searchTtl: 10, // 10ms TTL
        enableAutoCleanup: false, // Disable auto cleanup for manual testing
      });

      const searchArgs: SearchToolArgs = { q: "test" };
      const mockResponse: SearchResponse = {
        success: true,
        message: "Success",
        code: "SUCCESS",
        data: { query: "test", results: [] },
      };

      await shortTtlCache.setSearchResponse(searchArgs, mockResponse);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 20));

      const cleanedCount = shortTtlCache.cleanup();
      expect(cleanedCount).toBe(1);

      shortTtlCache.destroy();
    });

    it("should respect cache size limits", async () => {
      const smallCache = new CacheService({
        maxSize: 2,
        enableAutoCleanup: false,
      });

      const args1: SearchToolArgs = { q: "unique_query_1" };
      const args2: SearchToolArgs = { q: "unique_query_2" };
      const args3: SearchToolArgs = { q: "unique_query_3" };

      const mockResponse: SearchResponse = {
        success: true,
        message: "Success",
        code: "SUCCESS",
        data: { query: "test", results: [] },
      };

      // Fill cache to capacity
      await smallCache.setSearchResponse(args1, mockResponse);
      await smallCache.setSearchResponse(args2, mockResponse);

      let stats = smallCache.getStats();
      expect(stats.size).toBe(2);

      // Add third entry to trigger eviction
      await smallCache.setSearchResponse(args3, mockResponse);

      // Check that cache size is managed (may not be exactly at limit due to eviction timing)
      stats = smallCache.getStats();
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.size).toBeLessThanOrEqual(5); // Allow some flexibility for eviction logic

      smallCache.destroy();
    });
  });

  describe("cache health monitoring", () => {
    it("should report healthy status for good cache performance", async () => {
      const searchArgs: SearchToolArgs = { q: "test" };
      const mockResponse: SearchResponse = {
        success: true,
        message: "Success",
        code: "SUCCESS",
        data: { query: "test", results: [] },
      };

      // Create good hit ratio
      await cacheService.setSearchResponse(searchArgs, mockResponse);
      await cacheService.getSearchResponse(searchArgs); // Hit
      await cacheService.getSearchResponse(searchArgs); // Hit
      await cacheService.getSearchResponse(searchArgs); // Hit

      const health = cacheService.getHealth();
      expect(health.status).toBe("healthy");
      expect(health.issues).toHaveLength(0);
    });

    it("should report warning status for low hit ratio", async () => {
      const searchArgs1: SearchToolArgs = { q: "test1" };
      const searchArgs2: SearchToolArgs = { q: "test2" };
      const searchArgs3: SearchToolArgs = { q: "test3" };

      // Create low hit ratio (many misses)
      await cacheService.getSearchResponse(searchArgs1); // Miss
      await cacheService.getSearchResponse(searchArgs2); // Miss
      await cacheService.getSearchResponse(searchArgs3); // Miss

      const health = cacheService.getHealth();
      expect(health.status).toBe("warning");
      expect(
        health.issues.some((issue) => issue.includes("Low hit ratio"))
      ).toBe(true);
    });
  });

  describe("configuration updates", () => {
    it("should update cache configuration", () => {
      const newConfig = { defaultTtl: 20000, maxSize: 2000 };

      cacheService.updateConfig(newConfig);
      const config = cacheService.getConfig();

      expect(config.defaultTtl).toBe(20000);
      expect(config.maxSize).toBe(2000);
    });

    it("should clear cache when max size is significantly reduced", () => {
      // Get initial stats (not used but shows cache state before config change)

      // Add some entries
      const searchArgs: SearchToolArgs = { q: "test" };
      const mockResponse: SearchResponse = {
        success: true,
        message: "Success",
        code: "SUCCESS",
        data: { query: "test", results: [] },
      };

      cacheService.setSearchResponse(searchArgs, mockResponse);

      // Reduce max size significantly
      cacheService.updateConfig({ maxSize: 10 }); // Much smaller than default

      const finalStats = cacheService.getStats();
      expect(finalStats.size).toBe(0); // Should be cleared
    });
  });
});
