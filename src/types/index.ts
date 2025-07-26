/**
 * Type definitions for TuningSearch MCP Server
 * This file will contain all TypeScript interfaces and types
 */

// Placeholder for type definitions - will be implemented in task 2
export interface TuningSearchConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface ToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}