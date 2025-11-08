/**
 * TuningSearch MCP Server
 * Main server class that implements the MCP protocol for TuningSearch API
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

// Import tool definitions
import { searchTool } from './tools/search-tool.js';
import { newsTool } from './tools/news-tool.js';
import { crawlTool } from './tools/crawl-tool.js';

// Import tool handlers
import { SearchToolHandler } from './handlers/search-tool-handler.js';
import { NewsToolHandler } from './handlers/news-tool-handler.js';
import { CrawlToolHandler } from './handlers/crawl-tool-handler.js';

// Import services
import { SearchService } from './services/search-service.js';
import { ConfigService } from './services/config-service.js';
import { ErrorHandler } from './services/error-handler.js';
import { PerformanceMonitor } from './services/performance-monitor.js';
import { HealthCheckService, HealthStatus, ComponentHealth } from './services/health-check.js';
import { createLogger, setGlobalLogger, logInfo, logError, logWarn, logDebug } from './services/logger.js';
import { LogLevel } from './types/logger-types.js';

// Import client
import { TuningSearchClient } from './clients/tuningsearch-client.js';

// Import types
import { ToolResponse } from './types/tool-types.js';

/**
 * Server configuration interface
 */
export interface ServerConfig {
  name: string;
  version: string;
  description?: string;
  author?: string;
  homepage?: string;
}

/**
 * Default server configuration
 */
const DEFAULT_SERVER_CONFIG: ServerConfig = {
  name: 'tuningsearch-mcp-server',
  version: '1.0.0',
  description: 'MCP server for TuningSearch API integration',
  author: 'TuningSearch MCP Server',
  homepage: 'https://github.com/tuningsearch/tuningsearch-mcp-server'
};

/**
 * TuningSearch MCP Server
 * Main server class that implements the MCP protocol for TuningSearch API
 */
export class TuningSearchServer {
  private server: Server;
  private transport?: StdioServerTransport;
  private config: ServerConfig;
  private configService: ConfigService;
  private errorHandler: ErrorHandler;
  private client: TuningSearchClient;
  private searchService: SearchService;
  private searchToolHandler: SearchToolHandler;
  private newsToolHandler: NewsToolHandler;
  private crawlToolHandler: CrawlToolHandler;
  private performanceMonitor: PerformanceMonitor;
  private healthCheckService: HealthCheckService;
  private startTime: number = Date.now();
  private isRunning: boolean = false;

  constructor(config: Partial<ServerConfig> = {}) {
    this.config = { ...DEFAULT_SERVER_CONFIG, ...config };
    
    // Initialize logger
    const logLevel = process.env.TUNINGSEARCH_LOG_LEVEL?.toUpperCase() as keyof typeof LogLevel || 'INFO';
    const logger = createLogger({
      level: LogLevel[logLevel] || LogLevel.INFO,
      format: process.env.TUNINGSEARCH_LOG_FORMAT as 'json' | 'text' || 'json'
    });
    setGlobalLogger(logger);
    
    // Initialize configuration service
    this.configService = new ConfigService();
    
    // Initialize error handler
    this.errorHandler = new ErrorHandler();
    
    // Initialize performance monitor
    this.performanceMonitor = new PerformanceMonitor();
    
    // Initialize health check service
    this.healthCheckService = new HealthCheckService(this.performanceMonitor);
    
    // Track server start time
    this.startTime = Date.now();

    // Note: Client and services will be initialized in run() after config is loaded
    this.client = null as any; // Will be initialized in run()
    this.searchService = null as any; // Will be initialized in run()
    this.searchToolHandler = null as any; // Will be initialized in run()
    this.newsToolHandler = null as any; // Will be initialized in run()
    this.crawlToolHandler = null as any; // Will be initialized in run()

    // Initialize MCP server
    this.server = new Server(
      {
        name: this.config.name,
        version: this.config.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
  }

  /**
   * Register health check components
   */
  private registerHealthCheckComponents(): void {
    // Server health check
    this.healthCheckService.registerComponent('server', async (): Promise<ComponentHealth> => {
      return {
        name: 'server',
        status: this.isRunning ? HealthStatus.HEALTHY : HealthStatus.CRITICAL,
        message: this.isRunning ? 'Server is running' : 'Server is not running',
        lastChecked: Date.now(),
        details: {
          uptime: Date.now() - (this.startTime || Date.now()),
          version: this.config.version
        }
      };
    });

    // Configuration service health check
    this.healthCheckService.registerComponent('config', async (): Promise<ComponentHealth> => {
      try {
        const config = this.configService.getConfig();
        const hasApiKey = !!config.apiKey;
        
        return {
          name: 'config',
          status: hasApiKey ? HealthStatus.HEALTHY : HealthStatus.CRITICAL,
          message: hasApiKey ? 'Configuration is valid' : 'API key is missing',
          lastChecked: Date.now(),
          details: {
            hasApiKey,
            baseUrl: config.baseUrl,
            timeout: config.timeout
          }
        };
      } catch (error) {
        return {
          name: 'config',
          status: HealthStatus.CRITICAL,
          message: `Configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          lastChecked: Date.now()
        };
      }
    });

    // Search service health check
    this.healthCheckService.registerComponent('search_service', async (): Promise<ComponentHealth> => {
      if (!this.searchService) {
        return {
          name: 'search_service',
          status: HealthStatus.CRITICAL,
          message: 'Search service not initialized',
          lastChecked: Date.now()
        };
      }

      try {
        const isConnected = await this.searchService.testConnection();
        const stats = this.searchService.getStats();
        
        return {
          name: 'search_service',
          status: isConnected ? HealthStatus.HEALTHY : HealthStatus.WARNING,
          message: isConnected ? 'Search service is operational' : 'API connectivity issues',
          lastChecked: Date.now(),
          details: {
            connected: isConnected,
            totalRequests: stats.totalSearches + stats.totalNewsSearches + stats.totalCrawls,
            successRate: stats.totalSearches > 0 ? 
              (stats.successfulSearches / (stats.totalSearches + stats.totalNewsSearches + stats.totalCrawls)) : 1,
            averageResponseTime: stats.averageResponseTime
          }
        };
      } catch (error) {
        return {
          name: 'search_service',
          status: HealthStatus.CRITICAL,
          message: `Search service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          lastChecked: Date.now()
        };
      }
    });
  }

  /**
   * Setup tool handlers and register MCP request handlers
   */
  private setupToolHandlers(): void {
    // Register list tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          searchTool,
          newsTool,
          crawlTool,
        ],
      };
    });

    // Register call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const stopTimer = this.performanceMonitor.startOperation(`tool_${name}`);
        logDebug('Tool call started', { tool: name, args });

        let result: ToolResponse;

        switch (name) {
          case 'tuningsearch_search':
            result = await this.searchToolHandler.handleSearchRequest(args);
            break;

          case 'tuningsearch_news':
            result = await this.newsToolHandler.handleNewsRequest(args);
            break;

          case 'tuningsearch_crawl':
            result = await this.crawlToolHandler.handleCrawlRequest(args);
            break;

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }

        stopTimer();
        logInfo('Tool call completed', { tool: name, success: !result.isError });

        return {
          content: result.content,
          isError: result.isError,
        };

      } catch (error) {
        logError('Tool call failed', { tool: name }, error instanceof Error ? error : new Error(String(error)));
        
        // Handle errors and return appropriate MCP error response
        const formattedError = this.errorHandler.handleError(error, `tool call: ${name}`);
        
        if (error instanceof McpError) {
          throw error;
        }

        throw new McpError(
          ErrorCode.InternalError,
          formattedError.message
        );
      }
    });
  }

  /**
   * Start the MCP server
   */
  async run(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Server is already running');
    }

    try {
      // Initialize configuration service
      await this.configService.initialize();

      // Initialize API client with loaded configuration
      this.client = new TuningSearchClient(this.configService.getConfig());

      // Initialize search service
      this.searchService = new SearchService(this.client);

      // Initialize tool handlers
      this.searchToolHandler = new SearchToolHandler(this.searchService);
      this.newsToolHandler = new NewsToolHandler(this.searchService);
      this.crawlToolHandler = new CrawlToolHandler(this.searchService);

      // Setup tool handlers now that they're initialized
      this.setupToolHandlers();

      // Register health check components
      this.registerHealthCheckComponents();

      // Validate configuration
      await this.validateConfiguration();

      // Initialize transport
      this.transport = new StdioServerTransport();

      // Connect server to transport
      await this.server.connect(this.transport);

      // Start health monitoring
      this.healthCheckService.start();

      this.isRunning = true;

      logInfo('TuningSearch MCP Server started successfully', {
        name: this.config.name,
        version: this.config.version,
        tools: ['tuningsearch_search', 'tuningsearch_news', 'tuningsearch_crawl']
      });

      console.error('TuningSearch MCP Server is running...');
      console.error(`Server: ${this.config.name} v${this.config.version}`);
      console.error(`Tools available: tuningsearch_search, tuningsearch_news, tuningsearch_crawl`);

    } catch (error) {
      const formattedError = this.errorHandler.handleError(error, 'server startup');
      logError('Failed to start TuningSearch MCP Server', { error: formattedError.message }, error instanceof Error ? error : new Error(String(error)));
      console.error('Failed to start TuningSearch MCP Server:', formattedError.message);
      throw error;
    }
  }

  /**
   * Stop the MCP server gracefully
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      logInfo('Shutting down TuningSearch MCP Server');
      console.error('Shutting down TuningSearch MCP Server...');

      // Stop health monitoring
      this.healthCheckService.stop();

      // Close transport connection
      if (this.transport) {
        await this.transport.close();
        (this.transport as any) = undefined;
      }

      this.isRunning = false;
      logInfo('TuningSearch MCP Server stopped successfully');
      console.error('TuningSearch MCP Server stopped successfully');

    } catch (error) {
      const formattedError = this.errorHandler.handleError(error, 'server shutdown');
      logError('Error during server shutdown', { error: formattedError.message }, error instanceof Error ? error : new Error(String(error)));
      console.error('Error during server shutdown:', formattedError.message);
      throw error;
    }
  }

  /**
   * Validate server configuration and dependencies
   */
  private async validateConfiguration(): Promise<void> {
    try {
      // Validate configuration service
      const config = this.configService.getConfig();
      
      if (!config.apiKey) {
        throw new Error(
          'TuningSearch API key is required. Please set TUNINGSEARCH_API_KEY environment variable.'
        );
      }

      // Test API connectivity
      logDebug('Testing TuningSearch API connectivity');
      console.error('Testing TuningSearch API connectivity...');
      const isConnected = await this.searchService.testConnection();
      
      if (!isConnected) {
        logWarn('Could not verify TuningSearch API connectivity');
        console.error('Warning: Could not verify TuningSearch API connectivity');
      } else {
        logInfo('TuningSearch API connectivity verified');
        console.error('TuningSearch API connectivity verified');
      }

    } catch (error) {
      throw new Error(`Configuration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get server information
   */
  getServerInfo() {
    return {
      ...this.config,
      isRunning: this.isRunning,
      tools: [
        {
          name: 'tuningsearch_search',
          description: 'Search the web using TuningSearch API',
          handler: 'SearchToolHandler'
        },
        {
          name: 'tuningsearch_news',
          description: 'Search for news articles using TuningSearch API',
          handler: 'NewsToolHandler'
        },
        {
          name: 'tuningsearch_crawl',
          description: 'Crawl and extract content from web pages',
          handler: 'CrawlToolHandler'
        }
      ],
      configuration: this.configService.getConfig(),
      statistics: this.searchService.getStats(),
      health: this.getHealthStatus()
    };
  }

  /**
   * Get server health status
   */
  getHealthStatus() {
    try {
      const baseStatus = {
        status: this.isRunning ? 'running' : 'stopped',
        initialized: !!this.searchService
      };

      if (!this.searchService) {
        return {
          ...baseStatus,
          apiKey: 'not_initialized',
          totalRequests: 0,
          successRate: 0,
          averageResponseTime: 0,
          lastActivity: null,
          uptime: 0
        };
      }

      const stats = this.searchService.getStats();
      const config = this.configService.getConfig();
      
      return {
        ...baseStatus,
        apiKey: config.apiKey ? 'configured' : 'missing',
        totalRequests: stats.totalSearches + stats.totalNewsSearches + stats.totalCrawls,
        successRate: stats.totalSearches > 0 ? 
          (stats.successfulSearches / (stats.totalSearches + stats.totalNewsSearches + stats.totalCrawls)) : 0,
        averageResponseTime: stats.averageResponseTime,
        lastActivity: stats.lastSearchTime,
        uptime: this.isRunning ? Date.now() - (stats.lastSearchTime?.getTime() || Date.now()) : 0
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update server configuration
   */
  updateConfig(config: Partial<ServerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ServerConfig {
    return { ...this.config };
  }

  /**
   * Check if server is running
   */
  isServerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get search service statistics
   */
  getSearchStats() {
    if (!this.searchService) {
      throw new Error('Server not initialized. Call run() first.');
    }
    return this.searchService.getStats();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    if (!this.searchService) {
      throw new Error('Server not initialized. Call run() first.');
    }
    return this.searchService.getCacheStats();
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    if (!this.searchService) {
      throw new Error('Server not initialized. Call run() first.');
    }
    return {
      server: this.performanceMonitor.exportMetrics(),
      service: this.searchService.getPerformanceMetrics()
    };
  }

  /**
   * Get server performance monitor
   */
  getServerPerformanceMetrics() {
    return this.performanceMonitor.exportMetrics();
  }

  /**
   * Get performance alerts
   */
  getPerformanceAlerts(since?: number) {
    return this.performanceMonitor.getAlerts(since);
  }

  /**
   * Clear old performance alerts
   */
  clearOldPerformanceAlerts(olderThan?: number) {
    return this.performanceMonitor.clearOldAlerts(olderThan);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    if (!this.searchService) {
      throw new Error('Server not initialized. Call run() first.');
    }
    this.searchService.clearCache();
  }

  /**
   * Get comprehensive health report
   */
  getHealthReport() {
    const healthReport = this.healthCheckService.getHealthReport();
    
    if (!this.searchService || !this.searchToolHandler || !this.newsToolHandler || !this.crawlToolHandler) {
      return {
        server: this.getHealthStatus(),
        service: { status: 'not_initialized' },
        handlers: { status: 'not_initialized' },
        health: healthReport
      };
    }

    return {
      server: this.getHealthStatus(),
      service: this.searchService.getHealthReport(),
      handlers: {
        search: this.searchToolHandler.getHandlerInfo(),
        news: this.newsToolHandler.getHandlerInfo(),
        crawl: this.crawlToolHandler.getHandlerInfo()
      },
      health: healthReport
    };
  }

  /**
   * Get detailed health check report
   */
  async getDetailedHealthReport() {
    return await this.healthCheckService.performHealthCheck();
  }

  /**
   * Get health check summary
   */
  getHealthSummary() {
    return this.healthCheckService.getHealthSummary();
  }

  /**
   * Get health status for specific component
   */
  async getComponentHealth(componentName: string) {
    return await this.healthCheckService.getComponentHealth(componentName);
  }
}