/**
 * Cache Service
 * 
 * This service provides in-memory caching capabilities with TTL support,
 * cache invalidation, and performance monitoring for search results.
 */

import { SearchResponse, NewsResponse, CrawlResponse } from '../types/api-responses';
import { SearchToolArgs, NewsToolArgs, CrawlToolArgs } from '../types/tool-types';

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Default TTL in milliseconds */
  defaultTtl: number;
  /** Maximum cache size (number of entries) */
  maxSize: number;
  /** TTL for search results */
  searchTtl: number;
  /** TTL for news results */
  newsTtl: number;
  /** TTL for crawl results */
  crawlTtl: number;
  /** Enable cache statistics */
  enableStats: boolean;
  /** Cache cleanup interval in milliseconds */
  cleanupInterval: number;
  /** Enable automatic cleanup */
  enableAutoCleanup: boolean;
}

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  defaultTtl: 5 * 60 * 1000, // 5 minutes
  maxSize: 1000,
  searchTtl: 10 * 60 * 1000, // 10 minutes
  newsTtl: 5 * 60 * 1000,    // 5 minutes (news changes frequently)
  crawlTtl: 30 * 60 * 1000,  // 30 minutes (crawled content is more stable)
  enableStats: true,
  cleanupInterval: 60 * 1000, // 1 minute
  enableAutoCleanup: true
};

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  /** Cached data */
  data: T;
  /** Timestamp when entry was created */
  createdAt: number;
  /** TTL for this entry */
  ttl: number;
  /** Number of times this entry was accessed */
  accessCount: number;
  /** Last access timestamp */
  lastAccessed: number;
  /** Size estimate in bytes */
  size: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total number of cache hits */
  hits: number;
  /** Total number of cache misses */
  misses: number;
  /** Cache hit ratio (0-1) */
  hitRatio: number;
  /** Current cache size (number of entries) */
  size: number;
  /** Total memory usage estimate in bytes */
  memoryUsage: number;
  /** Number of expired entries cleaned up */
  expiredCleanups: number;
  /** Number of entries evicted due to size limit */
  evictions: number;
  /** Average access time in milliseconds */
  averageAccessTime: number;
  /** Cache efficiency score (0-100) */
  efficiencyScore: number;
}

/**
 * Cache key generator for different types of requests
 */
export class CacheKeyGenerator {
  /**
   * Generate cache key for search request
   */
  static forSearch(args: SearchToolArgs): string {
    const params = {
      q: args.q,
      language: args.language,
      country: args.country,
      page: args.page,
      safe: args.safe,
      timeRange: args.timeRange,
      service: args.service
    };
    
    return `search:${this.hashParams(params)}`;
  }

  /**
   * Generate cache key for news request
   */
  static forNews(args: NewsToolArgs): string {
    const params = {
      q: args.q,
      language: args.language,
      country: args.country,
      page: args.page,
      timeRange: args.timeRange,
      service: args.service
    };
    
    return `news:${this.hashParams(params)}`;
  }

  /**
   * Generate cache key for crawl request
   */
  static forCrawl(args: CrawlToolArgs): string {
    const params = {
      url: args.url,
      service: args.service
    };
    
    return `crawl:${this.hashParams(params)}`;
  }

  /**
   * Hash parameters to create consistent cache keys
   */
  private static hashParams(params: Record<string, any>): string {
    // Sort keys to ensure consistent hashing
    const sortedKeys = Object.keys(params).sort();
    const normalizedParams = sortedKeys
      .filter(key => params[key] !== undefined && params[key] !== null)
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    // Simple hash function (for production, consider using a proper hash library)
    let hash = 0;
    for (let i = 0; i < normalizedParams.length; i++) {
      const char = normalizedParams.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }
}

/**
 * In-memory cache service with TTL and performance monitoring
 */
export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;
  private stats: CacheStats;
  private cleanupTimer?: ReturnType<typeof setTimeout>;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.stats = {
      hits: 0,
      misses: 0,
      hitRatio: 0,
      size: 0,
      memoryUsage: 0,
      expiredCleanups: 0,
      evictions: 0,
      averageAccessTime: 0,
      efficiencyScore: 0
    };

    // Start automatic cleanup if enabled
    if (this.config.enableAutoCleanup) {
      this.startAutoCleanup();
    }
  }

  /**
   * Get cached search response
   */
  async getSearchResponse(args: SearchToolArgs): Promise<SearchResponse | null> {
    const key = CacheKeyGenerator.forSearch(args);
    return this.get<SearchResponse>(key);
  }

  /**
   * Cache search response
   */
  async setSearchResponse(args: SearchToolArgs, response: SearchResponse): Promise<void> {
    const key = CacheKeyGenerator.forSearch(args);
    this.set(key, response, this.config.searchTtl);
  }

  /**
   * Get cached news response
   */
  async getNewsResponse(args: NewsToolArgs): Promise<NewsResponse | null> {
    const key = CacheKeyGenerator.forNews(args);
    return this.get<NewsResponse>(key);
  }

  /**
   * Cache news response
   */
  async setNewsResponse(args: NewsToolArgs, response: NewsResponse): Promise<void> {
    const key = CacheKeyGenerator.forNews(args);
    this.set(key, response, this.config.newsTtl);
  }

  /**
   * Get cached crawl response
   */
  async getCrawlResponse(args: CrawlToolArgs): Promise<CrawlResponse | null> {
    const key = CacheKeyGenerator.forCrawl(args);
    return this.get<CrawlResponse>(key);
  }

  /**
   * Cache crawl response
   */
  async setCrawlResponse(args: CrawlToolArgs, response: CrawlResponse): Promise<void> {
    const key = CacheKeyGenerator.forCrawl(args);
    this.set(key, response, this.config.crawlTtl);
  }

  /**
   * Generic get method
   */
  private get<T>(key: string): T | null {
    const startTime = Date.now();
    
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        this.recordMiss();
        return null;
      }

      // Check if entry has expired
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        this.recordMiss();
        return null;
      }

      // Update access metadata
      entry.accessCount++;
      entry.lastAccessed = Date.now();

      this.recordHit();
      return entry.data;
    } finally {
      this.updateAccessTime(Date.now() - startTime);
    }
  }

  /**
   * Generic set method
   */
  private set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const entryTtl = ttl || this.config.defaultTtl;
    const size = this.estimateSize(data);

    // Check if we need to evict entries due to size limit
    // If we're at max size and this is a new key, evict first
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictLeastRecentlyUsed();
    }

    const entry: CacheEntry<T> = {
      data,
      createdAt: now,
      ttl: entryTtl,
      accessCount: 0,
      lastAccessed: now,
      size
    };

    this.cache.set(key, entry);
    this.updateStats();
  }

  /**
   * Check if cache entry has expired
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.createdAt > entry.ttl;
  }

  /**
   * Estimate size of cached data in bytes
   */
  private estimateSize(data: any): number {
    try {
      return JSON.stringify(data).length * 2; // Rough estimate (UTF-16)
    } catch {
      return 1000; // Default estimate if serialization fails
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const initialSize = this.cache.size;
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.createdAt > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
    
    const cleanedCount = initialSize - this.cache.size;
    this.stats.expiredCleanups += cleanedCount;
    this.updateStats();
    
    return cleanedCount;
  }

  /**
   * Start automatic cleanup timer
   */
  private startAutoCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Stop automatic cleanup timer
   */
  private stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
    this.resetStats();
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidate(pattern: string): number {
    const regex = new RegExp(pattern);
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    this.updateStats();
    
    return keysToDelete.length;
  }

  /**
   * Invalidate all search cache entries
   */
  invalidateSearchCache(): number {
    return this.invalidate('^search:');
  }

  /**
   * Invalidate all news cache entries
   */
  invalidateNewsCache(): number {
    return this.invalidate('^news:');
  }

  /**
   * Invalidate all crawl cache entries
   */
  invalidateCrawlCache(): number {
    return this.invalidate('^crawl:');
  }

  /**
   * Record cache hit
   */
  private recordHit(): void {
    if (this.config.enableStats) {
      this.stats.hits++;
      this.updateHitRatio();
    }
  }

  /**
   * Record cache miss
   */
  private recordMiss(): void {
    if (this.config.enableStats) {
      this.stats.misses++;
      this.updateHitRatio();
    }
  }

  /**
   * Update hit ratio
   */
  private updateHitRatio(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRatio = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Update access time statistics
   */
  private updateAccessTime(accessTime: number): void {
    if (this.config.enableStats) {
      const totalAccesses = this.stats.hits + this.stats.misses;
      if (totalAccesses === 1) {
        this.stats.averageAccessTime = accessTime;
      } else {
        this.stats.averageAccessTime = 
          (this.stats.averageAccessTime * (totalAccesses - 1) + accessTime) / totalAccesses;
      }
    }
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    if (!this.config.enableStats) return;

    this.stats.size = this.cache.size;
    this.stats.memoryUsage = Array.from(this.cache.values())
      .reduce((total, entry) => total + entry.size, 0);
    
    // Calculate efficiency score (0-100)
    const hitRatioScore = this.stats.hitRatio * 50;
    const sizeEfficiencyScore = Math.max(0, 50 - (this.stats.size / this.config.maxSize) * 50);
    this.stats.efficiencyScore = Math.round(hitRatioScore + sizeEfficiencyScore);
  }

  /**
   * Reset statistics
   */
  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRatio: 0,
      size: 0,
      memoryUsage: 0,
      expiredCleanups: 0,
      evictions: 0,
      averageAccessTime: 0,
      efficiencyScore: 0
    };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Get cache configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Update cache configuration
   */
  updateConfig(config: Partial<CacheConfig>): void {
    const oldConfig = this.config;
    this.config = { ...this.config, ...config };

    // Restart auto cleanup if interval changed
    if (oldConfig.cleanupInterval !== this.config.cleanupInterval ||
        oldConfig.enableAutoCleanup !== this.config.enableAutoCleanup) {
      this.stopAutoCleanup();
      if (this.config.enableAutoCleanup) {
        this.startAutoCleanup();
      }
    }

    // Clear cache if max size decreased significantly
    if (this.config.maxSize < oldConfig.maxSize * 0.5) {
      this.clear();
    }
  }

  /**
   * Get cache health information
   */
  getHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const stats = this.getStats();
    const issues: string[] = [];
    const recommendations: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check hit ratio
    if (stats.hitRatio < 0.3) {
      issues.push(`Low hit ratio: ${(stats.hitRatio * 100).toFixed(1)}%`);
      recommendations.push('Consider increasing cache TTL or reviewing cache key strategy');
      status = 'warning';
    }

    // Check memory usage
    const memoryUsageMB = stats.memoryUsage / (1024 * 1024);
    if (memoryUsageMB > 100) {
      issues.push(`High memory usage: ${memoryUsageMB.toFixed(1)}MB`);
      recommendations.push('Consider reducing cache size or TTL');
      if (memoryUsageMB > 500) {
        status = 'critical';
      } else if (status === 'healthy') {
        status = 'warning';
      }
    }

    // Check cache size
    const sizeRatio = stats.size / this.config.maxSize;
    if (sizeRatio > 0.9) {
      issues.push(`Cache nearly full: ${(sizeRatio * 100).toFixed(1)}%`);
      recommendations.push('Consider increasing max cache size');
      if (status === 'healthy') {
        status = 'warning';
      }
    }

    // Check eviction rate
    const totalOperations = stats.hits + stats.misses;
    if (totalOperations > 0 && stats.evictions / totalOperations > 0.1) {
      issues.push(`High eviction rate: ${((stats.evictions / totalOperations) * 100).toFixed(1)}%`);
      recommendations.push('Consider increasing cache size or reducing TTL');
      if (status === 'healthy') {
        status = 'warning';
      }
    }

    return { status, issues, recommendations };
  }

  /**
   * Cleanup and destroy cache service
   */
  destroy(): void {
    this.stopAutoCleanup();
    this.clear();
  }
}