/**
 * Result Formatter Service
 * 
 * This service provides advanced result formatting, metadata extraction,
 * and result processing capabilities for search results.
 */

import { 
  SearchResponse, 
  NewsResponse, 
  CrawlResponse,
  SearchResult,
  NewsResult,
  CrawlResult
} from '../types/api-responses';
import { ToolResponse } from '../types/tool-types';

/**
 * Configuration for result formatting
 */
export interface ResultFormatterConfig {
  /** Maximum content length per result */
  maxContentLength: number;
  /** Whether to include metadata in formatted results */
  includeMetadata: boolean;
  /** Whether to include result positions */
  includePositions: boolean;
  /** Whether to include timestamps */
  includeTimestamps: boolean;
  /** Date format for timestamps */
  dateFormat: 'iso' | 'relative' | 'short';
  /** Content truncation strategy */
  truncationStrategy: 'word' | 'sentence' | 'character';
  /** Whether to extract and highlight keywords */
  highlightKeywords: boolean;
  /** Maximum number of results to display */
  maxResults: number;
}

/**
 * Default formatter configuration
 */
export const DEFAULT_FORMATTER_CONFIG: ResultFormatterConfig = {
  maxContentLength: 300,
  includeMetadata: true,
  includePositions: true,
  includeTimestamps: true,
  dateFormat: 'relative',
  truncationStrategy: 'sentence',
  highlightKeywords: false,
  maxResults: 10
};

/**
 * Sorting options for results
 */
export type SortOption = 'relevance' | 'date' | 'title' | 'source';
export type SortDirection = 'asc' | 'desc';

/**
 * Filtering options for results
 */
export interface FilterOptions {
  /** Filter by domain */
  domains?: string[];
  /** Exclude domains */
  excludeDomains?: string[];
  /** Filter by date range (for news) */
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  /** Filter by content length */
  contentLength?: {
    min?: number;
    max?: number;
  };
  /** Filter by keywords */
  keywords?: string[];
  /** Exclude keywords */
  excludeKeywords?: string[];
}

/**
 * Enhanced result with extracted metadata
 */
export interface EnhancedSearchResult extends SearchResult {
  /** Extracted domain */
  domain: string;
  /** Content summary */
  summary: string;
  /** Extracted keywords */
  keywords: string[];
  /** Content quality score */
  qualityScore: number;
  /** Reading time estimate (minutes) */
  readingTime: number;
}

export interface EnhancedNewsResult extends NewsResult {
  /** Extracted domain */
  domain: string;
  /** Content summary */
  summary: string;
  /** Extracted keywords */
  keywords: string[];
  /** Content quality score */
  qualityScore: number;
  /** Reading time estimate (minutes) */
  readingTime: number;
  /** Relative time string */
  relativeTime?: string;
}

export interface EnhancedCrawlResult extends CrawlResult {
  /** Extracted domain */
  domain: string;
  /** Content summary */
  summary: string;
  /** Extracted keywords */
  keywords: string[];
  /** Content quality score */
  qualityScore: number;
  /** Reading time estimate (minutes) */
  readingTime: number;
  /** Page structure analysis */
  structure: {
    headings: number;
    paragraphs: number;
    links: number;
    images: number;
  };
}

/**
 * Result Formatter Service
 * Provides advanced formatting, metadata extraction, and result processing
 */
export class ResultFormatter {
  private config: ResultFormatterConfig;

  constructor(config: Partial<ResultFormatterConfig> = {}) {
    this.config = { ...DEFAULT_FORMATTER_CONFIG, ...config };
  }

  /**
   * Format search response with enhanced processing
   */
  formatSearchResponse(
    response: SearchResponse,
    sortBy?: SortOption,
    sortDirection: SortDirection = 'desc',
    filters?: FilterOptions
  ): ToolResponse {
    try {
      // Enhance results with metadata
      let enhancedResults = response.data.results.map(result => 
        this.enhanceSearchResult(result)
      );

      // Apply filters
      if (filters) {
        enhancedResults = this.filterSearchResults(enhancedResults, filters);
      }

      // Apply sorting
      if (sortBy) {
        enhancedResults = this.sortSearchResults(enhancedResults, sortBy, sortDirection);
      }

      // Limit results
      enhancedResults = enhancedResults.slice(0, this.config.maxResults);

      // Format results
      const formattedResults = enhancedResults.map((result, index) => 
        this.formatSearchResult(result, index)
      ).join('\n\n');

      // Add metadata and suggestions
      const suggestions = response.data.suggestions?.length 
        ? `\n\nSuggested searches: ${response.data.suggestions.join(', ')}` 
        : '';

      const metadata = this.formatSearchMetadata(response, enhancedResults.length);

      return {
        content: [{
          type: 'text',
          text: formattedResults + suggestions + metadata
        }],
        isError: !response.success
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error formatting search results: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  /**
   * Format news response with enhanced processing
   */
  formatNewsResponse(
    response: NewsResponse,
    sortBy?: SortOption,
    sortDirection: SortDirection = 'desc',
    filters?: FilterOptions
  ): ToolResponse {
    try {
      // Enhance results with metadata
      let enhancedResults = response.data.results.map(result => 
        this.enhanceNewsResult(result)
      );

      // Apply filters
      if (filters) {
        enhancedResults = this.filterNewsResults(enhancedResults, filters);
      }

      // Apply sorting
      if (sortBy) {
        enhancedResults = this.sortNewsResults(enhancedResults, sortBy, sortDirection);
      }

      // Limit results
      enhancedResults = enhancedResults.slice(0, this.config.maxResults);

      // Format results
      const formattedResults = enhancedResults.map((result, index) => 
        this.formatNewsResult(result, index)
      ).join('\n\n');

      const metadata = this.formatNewsMetadata(response, enhancedResults.length);

      return {
        content: [{
          type: 'text',
          text: formattedResults + metadata
        }],
        isError: !response.success
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error formatting news results: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  /**
   * Format crawl response with enhanced processing
   */
  formatCrawlResponse(response: CrawlResponse): ToolResponse {
    try {
      const enhancedResult = this.enhanceCrawlResult(response.data);
      const formattedResult = this.formatCrawlResult(enhancedResult);

      return {
        content: [{
          type: 'text',
          text: formattedResult
        }],
        isError: !response.success
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error formatting crawl result: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  /**
   * Enhance search result with extracted metadata
   */
  private enhanceSearchResult(result: SearchResult): EnhancedSearchResult {
    const domain = this.extractDomain(result.url);
    const summary = this.generateSummary(result.content);
    const keywords = this.extractKeywords(result.content);
    const qualityScore = this.calculateQualityScore(result);
    const readingTime = this.estimateReadingTime(result.content);

    return {
      ...result,
      domain,
      summary,
      keywords,
      qualityScore,
      readingTime
    };
  }

  /**
   * Enhance news result with extracted metadata
   */
  private enhanceNewsResult(result: NewsResult): EnhancedNewsResult {
    const domain = this.extractDomain(result.url);
    const summary = this.generateSummary(result.content);
    const keywords = this.extractKeywords(result.content);
    const qualityScore = this.calculateNewsQualityScore(result);
    const readingTime = this.estimateReadingTime(result.content);
    const relativeTime = result.publishedDate ? this.formatRelativeTime(result.publishedDate) : undefined;

    return {
      ...result,
      domain,
      summary,
      keywords,
      qualityScore,
      readingTime,
      relativeTime
    };
  }

  /**
   * Enhance crawl result with extracted metadata
   */
  private enhanceCrawlResult(result: CrawlResult): EnhancedCrawlResult {
    const domain = 'unknown'; // URL not provided in crawl result
    const summary = this.generateSummary(result.content);
    const keywords = this.extractKeywords(result.content);
    const qualityScore = this.calculateCrawlQualityScore(result);
    const readingTime = this.estimateReadingTime(result.content);
    const structure = this.analyzePageStructure(result.content);

    return {
      ...result,
      domain,
      summary,
      keywords,
      qualityScore,
      readingTime,
      structure
    };
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch {
      return 'unknown';
    }
  }

  /**
   * Generate content summary
   */
  private generateSummary(content: string): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return content.substring(0, 100);
    
    // Return first sentence or first 100 characters, whichever is shorter
    const firstSentence = sentences[0]?.trim() ?? '';
    return firstSentence.length > 100 ? firstSentence.substring(0, 100) + '...' : firstSentence;
  }

  /**
   * Extract keywords from content
   */
  private extractKeywords(content: string): string[] {
    // Simple keyword extraction - split by spaces, filter common words
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'
    ]);

    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word));

    // Count word frequency and return top keywords
    const wordCount = new Map<string, number>();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });

    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * Calculate quality score for search result
   */
  private calculateQualityScore(result: SearchResult): number {
    let score = 0;
    
    // Title quality (0-30 points)
    if (result.title.length > 10 && result.title.length < 100) score += 20;
    if (result.title.includes(' ')) score += 10;
    
    // Content quality (0-40 points)
    if (result.content.length > 100) score += 20;
    if (result.content.length > 300) score += 10;
    if (result.content.includes('.')) score += 10;
    
    // URL quality (0-20 points)
    const domain = this.extractDomain(result.url);
    if (domain !== 'unknown') score += 10;
    if (!result.url.includes('?')) score += 5; // Clean URLs
    if (result.url.startsWith('https://')) score += 5;
    
    // Sitelinks bonus (0-10 points)
    if (result.sitelinks && result.sitelinks.length > 0) score += 10;
    
    return Math.min(score, 100);
  }

  /**
   * Calculate quality score for news result
   */
  private calculateNewsQualityScore(result: NewsResult): number {
    let score = this.calculateQualityScore(result);
    
    // News-specific scoring
    if (result.source) score += 10;
    if (result.publishedDate) score += 10;
    if (result.imageUrl) score += 5;
    if (result.category) score += 5;
    
    return Math.min(score, 100);
  }

  /**
   * Calculate quality score for crawl result
   */
  private calculateCrawlQualityScore(result: CrawlResult): number {
    let score = 0;
    
    // Content quality (only field available in CrawlResult)
    if (result.content.length > 500) score += 30;
    if (result.content.length > 1000) score += 20;
    if (result.content.length > 2000) score += 10;
    
    // Technical quality
    // Status code not available in simplified CrawlResult
    
    return Math.min(score, 100);
  }

  /**
   * Estimate reading time in minutes
   */
  private estimateReadingTime(content: string): number {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.max(1, Math.round(wordCount / wordsPerMinute));
  }

  /**
   * Format relative time
   */
  private formatRelativeTime(dateString: string): string {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) return 'Less than an hour ago';
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
      
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  }

  /**
   * Analyze page structure
   */
  private analyzePageStructure(content: string): { headings: number; paragraphs: number; links: number; images: number } {
    // Simple structure analysis based on content patterns
    const headings = (content.match(/^#+\s/gm) || []).length;
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 50).length;
    const links = (content.match(/https?:\/\/[^\s]+/g) || []).length;
    const images = (content.match(/\.(jpg|jpeg|png|gif|webp)/gi) || []).length;

    return { headings, paragraphs, links, images };
  }

  /**
   * Truncate content based on strategy
   */
  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content;

    switch (this.config.truncationStrategy) {
      case 'sentence': {
        const sentences = content.split(/[.!?]+/);
        let result = '';
        for (const sentence of sentences) {
          if ((result + sentence).length > maxLength) break;
          result += sentence + '.';
        }
        return result || content.substring(0, maxLength) + '...';
      }

      case 'word': {
        const words = content.split(' ');
        let wordResult = '';
        for (const word of words) {
          if ((wordResult + ' ' + word).length > maxLength) break;
          wordResult += (wordResult ? ' ' : '') + word;
        }
        return wordResult + '...';
      }

      case 'character':
      default:
        return content.substring(0, maxLength) + '...';
    }
  }

  // Filtering methods
  private filterSearchResults(results: EnhancedSearchResult[], filters: FilterOptions): EnhancedSearchResult[] {
    return results.filter(result => {
      // Domain filtering
      if (filters.domains && !filters.domains.includes(result.domain)) return false;
      if (filters.excludeDomains && filters.excludeDomains.includes(result.domain)) return false;
      
      // Content length filtering
      if (filters.contentLength) {
        if (filters.contentLength.min && result.content.length < filters.contentLength.min) return false;
        if (filters.contentLength.max && result.content.length > filters.contentLength.max) return false;
      }
      
      // Keyword filtering
      if (filters.keywords) {
        const hasKeywords = filters.keywords.some(keyword => 
          result.content.toLowerCase().includes(keyword.toLowerCase()) ||
          result.title.toLowerCase().includes(keyword.toLowerCase())
        );
        if (!hasKeywords) return false;
      }
      
      if (filters.excludeKeywords) {
        const hasExcludedKeywords = filters.excludeKeywords.some(keyword => 
          result.content.toLowerCase().includes(keyword.toLowerCase()) ||
          result.title.toLowerCase().includes(keyword.toLowerCase())
        );
        if (hasExcludedKeywords) return false;
      }
      
      return true;
    });
  }

  private filterNewsResults(results: EnhancedNewsResult[], filters: FilterOptions): EnhancedNewsResult[] {
    return results.filter(result => {
      // Apply base filtering
      const baseFiltered = this.filterSearchResults([result as any], filters);
      if (baseFiltered.length === 0) return false;
      
      // Date range filtering
      if (filters.dateRange && result.publishedDate) {
        const publishedDate = new Date(result.publishedDate);
        if (filters.dateRange.start && publishedDate < filters.dateRange.start) return false;
        if (filters.dateRange.end && publishedDate > filters.dateRange.end) return false;
      }
      
      return true;
    });
  }

  // Sorting methods
  private sortSearchResults(results: EnhancedSearchResult[], sortBy: SortOption, direction: SortDirection): EnhancedSearchResult[] {
    const sorted = [...results].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'relevance':
          comparison = b.qualityScore - a.qualityScore;
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'source':
          comparison = a.domain.localeCompare(b.domain);
          break;
        default:
          comparison = a.position - b.position;
      }
      
      return direction === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }

  private sortNewsResults(results: EnhancedNewsResult[], sortBy: SortOption, direction: SortDirection): EnhancedNewsResult[] {
    const sorted = [...results].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date': {
          const dateA = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
          const dateB = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
          comparison = dateB - dateA;
          break;
        }
        case 'source':
          comparison = (a.source || '').localeCompare(b.source || '');
          break;
        default:
          return this.sortSearchResults(results as any, sortBy, direction) as any;
      }
      
      return direction === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }

  // Formatting methods
  private formatSearchResult(result: EnhancedSearchResult, index: number): string {
    const position = this.config.includePositions ? `${index + 1}. ` : '';
    const title = result.title;
    const url = result.url;
    const content = this.truncateContent(result.content, this.config.maxContentLength);
    
    let formatted = `${position}${title}\n   ${url}\n   ${content}`;
    
    if (this.config.includeMetadata) {
      const metadata: string[] = [];
      metadata.push(`Domain: ${result.domain}`);
      metadata.push(`Quality: ${result.qualityScore}/100`);
      metadata.push(`Reading time: ${result.readingTime} min`);
      
      if (result.keywords.length > 0) {
        metadata.push(`Keywords: ${result.keywords.join(', ')}`);
      }
      
      formatted += `\n   ${metadata.join(' | ')}`;
    }
    
    return formatted;
  }

  private formatNewsResult(result: EnhancedNewsResult, index: number): string {
    const position = this.config.includePositions ? `${index + 1}. ` : '';
    const title = result.title;
    const url = result.url;
    const content = this.truncateContent(result.content, this.config.maxContentLength);
    
    const sourceInfo: string[] = [];
    if (result.source) sourceInfo.push(`Source: ${result.source}`);
    if (result.relativeTime) sourceInfo.push(`${result.relativeTime}`);
    
    let formatted = `${position}${title}\n   ${url}`;
    if (sourceInfo.length > 0) {
      formatted += `\n   ${sourceInfo.join(' | ')}`;
    }
    formatted += `\n   ${content}`;
    
    if (this.config.includeMetadata) {
      const metadata: string[] = [];
      metadata.push(`Domain: ${result.domain}`);
      metadata.push(`Quality: ${result.qualityScore}/100`);
      metadata.push(`Reading time: ${result.readingTime} min`);
      
      formatted += `\n   ${metadata.join(' | ')}`;
    }
    
    return formatted;
  }

  private formatCrawlResult(result: EnhancedCrawlResult): string {
    const title = 'Crawled Content'; // Title not available in simplified CrawlResult
    const content = this.truncateContent(result.content, this.config.maxContentLength * 2); // Allow more content for crawl results
    
    let formatted = `${title}\n\n${content}`;
    
    if (this.config.includeMetadata) {
      const metadata: string[] = [];
      
      // Enhanced metadata from processing
      if (result.domain) metadata.push(`Domain: ${result.domain}`);
      if (result.summary) metadata.push(`Summary: ${result.summary}`);
      if (result.keywords && result.keywords.length > 0) {
        metadata.push(`Keywords: ${result.keywords.join(', ')}`);
      }
      
      if (metadata.length > 0) {
        formatted += `\n\nMetadata:\n${metadata.join('\n')}`;
      }
    }
    
    return formatted;
  }

  private formatSearchMetadata(response: SearchResponse, resultCount: number): string {
    const metadata: string[] = [];
    
    metadata.push(`\nFound ${resultCount} results for "${response.data.query}"`);
    
    if (response.data.totalResults) {
      metadata.push(`Total available: ${response.data.totalResults}`);
    }
    
    if (response.data.searchTime) {
      metadata.push(`Search time: ${response.data.searchTime}ms`);
    }
    
    return metadata.join(' | ');
  }

  private formatNewsMetadata(response: NewsResponse, resultCount: number): string {
    const metadata: string[] = [];
    
    metadata.push(`\nFound ${resultCount} news results for "${response.data.query}"`);
    
    if (response.data.totalResults) {
      metadata.push(`Total available: ${response.data.totalResults}`);
    }
    
    if (response.data.searchTime) {
      metadata.push(`Search time: ${response.data.searchTime}ms`);
    }
    
    return metadata.join(' | ');
  }

  /**
   * Update formatter configuration
   */
  updateConfig(config: Partial<ResultFormatterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ResultFormatterConfig {
    return { ...this.config };
  }
}