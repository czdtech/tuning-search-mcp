/**
 * Structured logger implementation for TuningSearch MCP Server
 */

import { Logger, LogLevel, LogEntry, LoggerConfig } from '../types/logger-types.js';

export class StructuredLogger implements Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      format: 'json',
      ...config
    };
  }

  error(message: string, context?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  getLevel(): LogLevel {
    return this.config.level;
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    // Filter based on log level
    if (level > this.config.level) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message
    };
    
    if (context !== undefined) {
      logEntry.context = context;
    }
    
    if (error !== undefined) {
      logEntry.error = error;
    }

    if (this.config.enableConsole) {
      this.writeToConsole(logEntry);
    }
  }

  private writeToConsole(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];

    if (this.config.format === 'json') {
      const jsonEntry = {
        timestamp: entry.timestamp,
        level: levelName,
        message: entry.message,
        ...(entry.context && { context: entry.context }),
        ...(entry.error && {
          error: {
            name: entry.error.name,
            message: entry.error.message,
            stack: entry.error.stack
          }
        })
      };

      console.error(JSON.stringify(jsonEntry));
    } else {
      // Text format
      const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
      const errorStr = entry.error ? ` ERROR: ${entry.error.message}` : '';

      console.error(`[${entry.timestamp}] ${levelName}: ${entry.message}${contextStr}${errorStr}`);

      if (entry.error?.stack) {
        console.error(entry.error.stack);
      }
    }
  }
}

// Global logger instance
let globalLogger: Logger | null = null;

export function createLogger(config?: Partial<LoggerConfig>): Logger {
  return new StructuredLogger(config);
}

export function setGlobalLogger(logger: Logger): void {
  globalLogger = logger;
}

export function getLogger(): Logger {
  if (!globalLogger) {
    globalLogger = createLogger();
  }
  return globalLogger;
}

// Convenience functions for global logger
export function logError(message: string, context?: Record<string, any>, error?: Error): void {
  getLogger().error(message, context, error);
}

export function logWarn(message: string, context?: Record<string, any>): void {
  getLogger().warn(message, context);
}

export function logInfo(message: string, context?: Record<string, any>): void {
  getLogger().info(message, context);
}

export function logDebug(message: string, context?: Record<string, any>): void {
  getLogger().debug(message, context);
}
