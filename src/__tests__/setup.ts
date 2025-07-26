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

// This file is just for setup, no tests here
describe('Setup', () => {
  it('should setup test environment', () => {
    expect(process.env['TUNINGSEARCH_API_KEY']).toBe('test-api-key');
  });
});