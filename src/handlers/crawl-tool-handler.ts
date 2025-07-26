/**
 * Crawl Tool Handler
 * Handles MCP tool requests for web crawling operations with URL security
 * validation, content extraction, and cleaning logic
 */

import { SearchService } from '../services/search-service';
import { 
  ToolResponse, 
  CrawlToolArgs, 
  validateCrawlToolArgs 
} from '../types/tool-types';
import { ValidationError, SecurityError } from '../types/error-types';

/**
 * Security configuration for URL validation
 */
export interface SecurityConfig {
  allowedProtocols: string[];
  blockedDomains: string[];
  blockedIPs: string[];
  allowPrivateNetworks: boolean;
  maxUrlLength: number;
  allowedPorts: number[];
}

/**
 * Default security configuration
 */
const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  allowedProtocols: ['http:', 'https:'],
  blockedDomains: [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    'internal',
    'local'
  ],
  blockedIPs: [
    '127.0.0.1',
    '0.0.0.0',
    '::1'
  ],
  allowPrivateNetworks: false,
  maxUrlLength: 2048,
  allowedPorts: [80, 443, 8080, 8443]
};

/**
 * Handler for web crawl tool requests
 */
export class CrawlToolHandler {
  private securityConfig: SecurityConfig;

  constructor(
    private _searchService: SearchService,
    securityConfig?: Partial<SecurityConfig>
  ) {
    this.securityConfig = { ...DEFAULT_SECURITY_CONFIG, ...securityConfig };
  }

  /**
   * Handle crawl tool request with URL validation and security checks
   */
  async handleCrawlRequest(args: unknown): Promise<ToolResponse> {
    try {
      // Parse and validate arguments
      const crawlArgs = this.parseAndValidateArgs(args);

      // Perform additional security validation
      await this.validateUrlSecurity(crawlArgs.url);

      // Perform crawl using service
      const result = await this._searchService.performCrawl(crawlArgs);

      // Process and clean content
      return this.enhanceCrawlResponse(result, crawlArgs);
    } catch (error) {
      // Handle validation and other errors
      return this.createErrorResponse(error);
    }
  }

  /**
   * Handle enhanced crawl request with content processing options
   */
  async handleEnhancedCrawlRequest(
    args: unknown,
    options?: {
      extractOptions?: {
        includeMetadata?: boolean;
        includeImages?: boolean;
        includeLinks?: boolean;
        maxContentLength?: number;
      };
      cleaningOptions?: {
        removeScripts?: boolean;
        removeStyles?: boolean;
        removeComments?: boolean;
        normalizeWhitespace?: boolean;
      };
    }
  ): Promise<ToolResponse> {
    try {
      // Parse and validate arguments
      const crawlArgs = this.parseAndValidateArgs(args);

      // Perform additional security validation
      await this.validateUrlSecurity(crawlArgs.url);

      // Perform crawl using service
      const result = await this._searchService.performCrawl(crawlArgs);

      // Process and clean content with options
      return this.enhanceCrawlResponse(result, crawlArgs, options);
    } catch (error) {
      // Handle validation and other errors
      return this.createErrorResponse(error);
    }
  }

  /**
   * Parse and validate crawl arguments
   */
  private parseAndValidateArgs(args: unknown): CrawlToolArgs {
    // Basic type validation
    if (!validateCrawlToolArgs(args)) {
      throw new ValidationError(
        'Invalid crawl arguments',
        ['Arguments do not match expected CrawlToolArgs schema']
      );
    }

    const crawlArgs = args as CrawlToolArgs;

    // Additional business logic validation
    this.validateBusinessRules(crawlArgs);

    return crawlArgs;
  }

  /**
   * Validate business rules for crawl arguments
   */
  private validateBusinessRules(args: CrawlToolArgs): void {
    const errors: string[] = [];

    // URL validation
    if (!args.url || args.url.trim().length === 0) {
      errors.push('URL is required and cannot be empty');
    }

    if (args.url && args.url.length > this.securityConfig.maxUrlLength) {
      errors.push(`URL exceeds maximum length of ${this.securityConfig.maxUrlLength} characters`);
    }

    // Basic URL format validation
    try {
      new URL(args.url);
    } catch {
      errors.push('Invalid URL format');
    }

    if (errors.length > 0) {
      throw new ValidationError('Crawl argument validation failed', errors);
    }
  }

  /**
   * Validate URL security with comprehensive checks
   */
  private async validateUrlSecurity(url: string): Promise<void> {
    const errors: string[] = [];

    try {
      const urlObj = new URL(url);

      // Protocol validation
      if (!this.securityConfig.allowedProtocols.includes(urlObj.protocol)) {
        errors.push(`Protocol ${urlObj.protocol} is not allowed. Allowed protocols: ${this.securityConfig.allowedProtocols.join(', ')}`);
      }

      // Domain validation
      const hostname = urlObj.hostname.toLowerCase();
      
      // Check blocked domains
      if (this.securityConfig.blockedDomains.some(domain => 
        hostname === domain || hostname.endsWith(`.${domain}`))) {
        errors.push(`Domain ${hostname} is blocked for security reasons`);
      }

      // Check for private network addresses
      if (!this.securityConfig.allowPrivateNetworks && this.isPrivateNetwork(hostname)) {
        errors.push('Private network addresses are not allowed');
      }

      // Port validation
      const port = urlObj.port ? parseInt(urlObj.port) : (urlObj.protocol === 'https:' ? 443 : 80);
      if (this.securityConfig.allowedPorts.length > 0 && !this.securityConfig.allowedPorts.includes(port)) {
        errors.push(`Port ${port} is not allowed. Allowed ports: ${this.securityConfig.allowedPorts.join(', ')}`);
      }

      // Check for suspicious URL patterns
      if (this.hasSuspiciousPatterns(url)) {
        errors.push('URL contains suspicious patterns');
      }

      // Additional security checks
      await this.performAdvancedSecurityChecks(urlObj);

    } catch (error) {
      if (error instanceof SecurityError) {
        errors.push(error.message);
      } else {
        errors.push('URL security validation failed');
      }
    }

    if (errors.length > 0) {
      throw new SecurityError('URL security validation failed', errors);
    }
  }

  /**
   * Check if hostname is in private network range
   */
  private isPrivateNetwork(hostname: string): boolean {
    // Check for localhost variations
    if (['localhost', '127.0.0.1', '::1'].includes(hostname)) {
      return true;
    }

    // Check for private IP ranges (basic check)
    if (hostname.startsWith('192.168.') || 
        hostname.startsWith('10.') || 
        hostname.startsWith('172.')) {
      return true;
    }

    // Check for internal domains
    if (hostname.includes('.local') || 
        hostname.includes('.internal') || 
        hostname.includes('.corp')) {
      return true;
    }

    return false;
  }

  /**
   * Check for suspicious URL patterns
   */
  private hasSuspiciousPatterns(url: string): boolean {
    const suspiciousPatterns = [
      /javascript:/i,
      /data:/i,
      /file:/i,
      /ftp:/i,
      /%00/,  // Null byte
      /%2e%2e/i,  // Directory traversal
      /\.\./,  // Directory traversal
      /@/,  // Potential credential injection
    ];

    return suspiciousPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Perform advanced security checks
   */
  private async performAdvancedSecurityChecks(urlObj: URL): Promise<void> {
    // Check for URL shorteners (basic list)
    const urlShorteners = [
      'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly',
      'short.link', 'tiny.cc', 'is.gd', 'buff.ly'
    ];

    if (urlShorteners.includes(urlObj.hostname)) {
      throw new SecurityError('URL shorteners are not allowed for security reasons');
    }

    // Check for suspicious TLDs
    const suspiciousTlds = ['.tk', '.ml', '.ga', '.cf'];
    if (suspiciousTlds.some(tld => urlObj.hostname.endsWith(tld))) {
      throw new SecurityError('Suspicious top-level domain detected');
    }

    // Additional checks could include:
    // - DNS resolution validation
    // - Reputation checking
    // - Rate limiting per domain
  }

  /**
   * Enhance crawl response with content processing and metadata
   */
  private enhanceCrawlResponse(
    response: ToolResponse, 
    args: CrawlToolArgs,
    options?: {
      extractOptions?: {
        includeMetadata?: boolean;
        includeImages?: boolean;
        includeLinks?: boolean;
        maxContentLength?: number;
      };
      cleaningOptions?: {
        removeScripts?: boolean;
        removeStyles?: boolean;
        removeComments?: boolean;
        normalizeWhitespace?: boolean;
      };
    }
  ): ToolResponse {
    if (response.isError || !response.content[0]) {
      return response;
    }

    // Extract and clean content
    const originalText = response.content[0].text;
    const processedText = this.processContent(originalText, args, options);

    return {
      ...response,
      content: [{
        type: 'text',
        text: processedText
      }]
    };
  }

  /**
   * Process and clean crawled content
   */
  private processContent(
    text: string, 
    args: CrawlToolArgs,
    options?: {
      extractOptions?: {
        includeMetadata?: boolean;
        includeImages?: boolean;
        includeLinks?: boolean;
        maxContentLength?: number;
      };
      cleaningOptions?: {
        removeScripts?: boolean;
        removeStyles?: boolean;
        removeComments?: boolean;
        normalizeWhitespace?: boolean;
      };
    }
  ): string {
    let processedText = text;

    // Apply content length limit
    const maxLength = options?.extractOptions?.maxContentLength || 10000;
    if (processedText.length > maxLength) {
      processedText = processedText.substring(0, maxLength) + '\n\n[Content truncated due to length limit]';
    }

    // Apply cleaning options
    if (options?.cleaningOptions?.normalizeWhitespace !== false) {
      processedText = this.normalizeWhitespace(processedText);
    }

    // Add crawl metadata
    const metadata = this.generateCrawlMetadata(args, options);
    processedText += `\n\n--- Crawl Metadata ---\n${metadata}`;

    // Add security information
    const securityInfo = this.generateSecurityInfo(args.url);
    processedText += `\n\n--- Security Information ---\n${securityInfo}`;

    return processedText;
  }

  /**
   * Normalize whitespace in content
   */
  private normalizeWhitespace(text: string): string {
    return text
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\t/g, '  ')    // Replace tabs with spaces
      .replace(/\n{3,}/g, '\n\n')  // Limit consecutive newlines
      .replace(/[ ]{2,}/g, ' ')    // Limit consecutive spaces
      .trim();
  }

  /**
   * Generate crawl metadata
   */
  private generateCrawlMetadata(
    args: CrawlToolArgs,
    options?: any
  ): string {
    const metadata: string[] = [];

    metadata.push(`URL: ${args.url}`);
    metadata.push(`Crawled: ${new Date().toISOString()}`);

    if (args.service) {
      metadata.push(`Service: ${args.service}`);
    }

    // Add processing options info
    if (options?.extractOptions) {
      const extractOpts = Object.entries(options.extractOptions)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      if (extractOpts) {
        metadata.push(`Extract Options: ${extractOpts}`);
      }
    }

    if (options?.cleaningOptions) {
      const cleanOpts = Object.entries(options.cleaningOptions)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      if (cleanOpts) {
        metadata.push(`Cleaning Options: ${cleanOpts}`);
      }
    }

    return metadata.join(' | ');
  }

  /**
   * Generate security information
   */
  private generateSecurityInfo(url: string): string {
    const info: string[] = [];

    try {
      const urlObj = new URL(url);
      
      info.push(`Protocol: ${urlObj.protocol}`);
      info.push(`Domain: ${urlObj.hostname}`);
      
      if (urlObj.port) {
        info.push(`Port: ${urlObj.port}`);
      }

      info.push(`Security Validated: ${new Date().toISOString()}`);
      info.push('Status: Passed security checks');

    } catch {
      info.push('Status: URL parsing failed');
    }

    return info.join(' | ');
  }

  /**
   * Create error response for tool failures
   */
  private createErrorResponse(error: unknown): ToolResponse {
    let message = 'An unexpected error occurred during crawl';

    if (error instanceof ValidationError) {
      message = `Crawl Validation Error: ${error.message}`;
      if (error.validationErrors && error.validationErrors.length > 0) {
        message += `\nDetails: ${error.validationErrors.join(', ')}`;
      }
    } else if (error instanceof SecurityError) {
      message = `Crawl Security Error: ${error.message}`;
      if (error.details && error.details.length > 0) {
        message += `\nSecurity Issues: ${error.details.join(', ')}`;
      }
    } else if (error instanceof Error) {
      message = `Crawl Error: ${error.message}`;
    }

    return {
      content: [{
        type: 'text',
        text: message
      }],
      isError: true
    };
  }

  /**
   * Validate tool arguments format (static method for external use)
   */
  static validateArgs(args: unknown): { valid: boolean; error?: string; data?: CrawlToolArgs } {
    try {
      if (!validateCrawlToolArgs(args)) {
        return {
          valid: false,
          error: 'Invalid crawl arguments format'
        };
      }

      const crawlArgs = args as CrawlToolArgs;

      // Basic validation
      if (!crawlArgs.url || crawlArgs.url.trim().length === 0) {
        return {
          valid: false,
          error: 'URL is required and cannot be empty'
        };
      }

      // Basic URL format check
      try {
        new URL(crawlArgs.url);
      } catch {
        return {
          valid: false,
          error: 'Invalid URL format'
        };
      }

      return {
        valid: true,
        data: crawlArgs
      };
    } catch (error) {
      return {
        valid: false,
        error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Update security configuration
   */
  updateSecurityConfig(config: Partial<SecurityConfig>): void {
    this.securityConfig = { ...this.securityConfig, ...config };
  }

  /**
   * Get current security configuration
   */
  getSecurityConfig(): SecurityConfig {
    return { ...this.securityConfig };
  }

  /**
   * Get handler information for debugging
   */
  getHandlerInfo() {
    return {
      name: 'CrawlToolHandler',
      version: '1.0.0',
      supportedOperations: [
        'handleCrawlRequest',
        'handleEnhancedCrawlRequest'
      ],
      validationRules: [
        'URL is required and non-empty',
        'Valid URL format required',
        'Security protocol validation',
        'Domain and IP restrictions',
        'Port restrictions',
        'Suspicious pattern detection'
      ],
      securityFeatures: [
        'Protocol validation',
        'Private network blocking',
        'Suspicious pattern detection',
        'URL shortener blocking',
        'TLD reputation checking',
        'Content length limiting',
        'Whitespace normalization'
      ],
      securityConfig: this.securityConfig
    };
  }
}