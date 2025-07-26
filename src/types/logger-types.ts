/**
 * Logger types and interfaces for the TuningSearch MCP Server
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile?: boolean;
  filePath?: string;
  format?: 'json' | 'text';
}

export interface Logger {
  error(message: string, context?: Record<string, any>, error?: Error): void;
  warn(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
  debug(message: string, context?: Record<string, any>): void;
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
}