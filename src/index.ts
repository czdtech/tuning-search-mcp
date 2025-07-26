#!/usr/bin/env node

/**
 * TuningSearch MCP Server Entry Point
 * Main entry point for the TuningSearch MCP Server
 */

import { TuningSearchServer } from './server.js';
import { logError, logInfo } from './services/logger.js';

/**
 * Display help information
 */
function showHelp(): void {
  console.log(`
TuningSearch MCP Server v${process.env.npm_package_version || '1.0.0'}

A Model Context Protocol (MCP) server that integrates TuningSearch API capabilities.

Usage:
  tuningsearch-mcp-server [options]

Options:
  --help, -h     Show this help message
  --version, -v  Show version information
  --config, -c   Specify configuration file path

Environment Variables:
  TUNINGSEARCH_API_KEY        TuningSearch API key (required)
  TUNINGSEARCH_BASE_URL       API base URL (optional)
  TUNINGSEARCH_TIMEOUT        Request timeout in milliseconds (optional)
  TUNINGSEARCH_RETRY_ATTEMPTS Number of retry attempts (optional)
  TUNINGSEARCH_RETRY_DELAY    Retry delay in milliseconds (optional)
  TUNINGSEARCH_LOG_LEVEL      Log level (debug, info, warn, error) (optional)
  TUNINGSEARCH_LOG_FORMAT     Log format (json, text) (optional)

Examples:
  # Start the server with API key
  TUNINGSEARCH_API_KEY="your_key" tuningsearch-mcp-server

  # Start with debug logging
  TUNINGSEARCH_API_KEY="your_key" TUNINGSEARCH_LOG_LEVEL="debug" tuningsearch-mcp-server

For more information, visit: https://github.com/tuningsearch/tuningsearch-mcp-server
`);
}

/**
 * Display version information
 */
function showVersion(): void {
  const version = process.env.npm_package_version || '1.0.0';
  console.log(`TuningSearch MCP Server v${version}`);
}

/**
 * Parse command line arguments
 */
function parseArgs(): { help: boolean; version: boolean; config?: string } {
  const args = process.argv.slice(2);
  const result = { help: false, version: false, config: undefined as string | undefined };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--help':
      case '-h':
        result.help = true;
        break;
      case '--version':
      case '-v':
        result.version = true;
        break;
      case '--config':
      case '-c':
        result.config = args[i + 1];
        i++; // Skip next argument as it's the config value
        break;
      default:
        if (arg && arg.startsWith('-')) {
          console.error(`Unknown option: ${arg}`);
          console.error('Use --help for usage information');
          process.exit(1);
        }
        break;
    }
  }

  return result;
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    // Parse command line arguments
    const args = parseArgs();

    // Handle help and version flags
    if (args.help) {
      showHelp();
      process.exit(0);
    }

    if (args.version) {
      showVersion();
      process.exit(0);
    }

    // Create and start the server
    logInfo('Starting TuningSearch MCP Server...');
    
    const server = new TuningSearchServer({
      name: 'tuningsearch-mcp-server',
      version: process.env.npm_package_version || '1.0.0',
      description: 'MCP server for TuningSearch API integration'
    });

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      logInfo(`Received ${signal}, shutting down gracefully...`);
      try {
        await server.stop();
        logInfo('Server stopped successfully');
        process.exit(0);
      } catch (error) {
        logError('Error during shutdown', {}, error instanceof Error ? error : new Error(String(error)));
        process.exit(1);
      }
    };

    // Register signal handlers
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logError('Uncaught exception', {}, error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logError('Unhandled rejection', { promise }, reason instanceof Error ? reason : new Error(String(reason)));
      process.exit(1);
    });

    // Start the server
    await server.run();

    // Keep the process running
    logInfo('TuningSearch MCP Server is running. Press Ctrl+C to stop.');

  } catch (error) {
    logError('Failed to start server', {}, error instanceof Error ? error : new Error(String(error)));
    console.error('Failed to start TuningSearch MCP Server:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };