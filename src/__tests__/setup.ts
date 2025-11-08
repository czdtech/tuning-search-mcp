/**
 * Jest test setup
 * Global test configuration and setup
 */

// Mock environment variables for testing
process.env['TUNINGSEARCH_API_KEY'] = 'test-api-key';
process.env['TUNINGSEARCH_BASE_URL'] = 'https://api.test.tuningsearch.com/v1';
process.env['TUNINGSEARCH_TIMEOUT'] = '5000';
process.env['TUNINGSEARCH_RETRY_ATTEMPTS'] = '2';
process.env['TUNINGSEARCH_RETRY_DELAY'] = '500';

// Global test timeout
jest.setTimeout(10000);

// Mock MCP SDK ESM modules in test environment to avoid ESM loader issues
// We only need minimal surface used by server.ts during tests
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => {
  return {
    Server: class MockServer {
      constructor(_info?: any, _opts?: any) {}
      setRequestHandler() {}
      async connect(_transport?: any) { /* no-op for tests */ }
    }
  };
});

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => {
  return {
    StdioServerTransport: class MockTransport {
      async close() { /* no-op */ }
    }
  };
});

jest.mock('@modelcontextprotocol/sdk/types.js', () => {
  class McpError extends Error { constructor(code: string, message: string){ super(message); (this as any).code = code; } }
  const ErrorCode = { InternalError: 'InternalError', MethodNotFound: 'MethodNotFound' } as const;
  const CallToolRequestSchema = {} as any;
  const ListToolsRequestSchema = {} as any;
  return { McpError, ErrorCode, CallToolRequestSchema, ListToolsRequestSchema };
});

// This file is just for setup, no tests here
describe('Setup', () => {
  it('should setup test environment', () => {
    expect(process.env['TUNINGSEARCH_API_KEY']).toBe('test-api-key');
  });
});
