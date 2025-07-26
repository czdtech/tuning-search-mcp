/**
 * Tests for TuningSearch Error Types
 */

import {
  TuningSearchError,
  APIKeyError,
  RateLimitError,
  NetworkError,
  TimeoutError,
  ServerError,
  ValidationError,
  ConfigurationError,
  NotImplementedError,
  createErrorFromResponse,
  isTuningSearchError,
  shouldRetryError
} from '../types/error-types';

describe('TuningSearchError Base Class', () => {
  class TestError extends TuningSearchError {
    readonly code = 'TEST_ERROR';
    readonly statusCode = 500;
  }

  test('should create error with correct properties', () => {
    const error = new TestError('Test message', true);
    
    expect(error.message).toBe('Test message');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.statusCode).toBe(500);
    expect(error.retryable).toBe(true);
    expect(error.timestamp).toBeInstanceOf(Date);
    expect(error.name).toBe('TestError');
  });

  test('should serialize to JSON correctly', () => {
    const error = new TestError('Test message', false);
    const json = error.toJSON();
    
    expect(json.name).toBe('TestError');
    expect(json.code).toBe('TEST_ERROR');
    expect(json.statusCode).toBe(500);
    expect(json.message).toBe('Test message');
    expect(json.retryable).toBe(false);
    expect(json.timestamp).toBeDefined();
    expect(json.stack).toBeDefined();
  });
});

describe('APIKeyError', () => {
  test('should create with default message', () => {
    const error = new APIKeyError();
    
    expect(error.code).toBe('API_KEY_ERROR');
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('API key is missing or invalid');
    expect(error.retryable).toBe(false);
  });

  test('should create with custom message', () => {
    const error = new APIKeyError('Custom API key error');
    
    expect(error.message).toBe('Custom API key error');
    expect(error.retryable).toBe(false);
  });
});

describe('RateLimitError', () => {
  test('should create with default message', () => {
    const error = new RateLimitError();
    
    expect(error.code).toBe('RATE_LIMIT_ERROR');
    expect(error.statusCode).toBe(429);
    expect(error.message).toBe('Rate limit exceeded');
    expect(error.retryable).toBe(true);
    expect(error.resetTime).toBeUndefined();
  });

  test('should create with reset time', () => {
    const resetTime = new Date();
    const error = new RateLimitError('Rate limit exceeded', resetTime);
    
    expect(error.resetTime).toBe(resetTime);
    expect(error.retryable).toBe(true);
  });

  test('should serialize with reset time', () => {
    const resetTime = new Date();
    const error = new RateLimitError('Rate limit exceeded', resetTime);
    const json = error.toJSON();
    
    expect(json.resetTime).toBe(resetTime.toISOString());
  });
});

describe('NetworkError', () => {
  test('should create with default message', () => {
    const error = new NetworkError();
    
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.statusCode).toBe(500);
    expect(error.message).toBe('Network error occurred');
    expect(error.retryable).toBe(true);
    expect(error.originalError).toBeUndefined();
  });

  test('should create with original error', () => {
    const originalError = new Error('Connection failed');
    const error = new NetworkError('Network error', originalError);
    
    expect(error.originalError).toBe(originalError);
  });

  test('should serialize with original error', () => {
    const originalError = new Error('Connection failed');
    const error = new NetworkError('Network error', originalError);
    const json = error.toJSON();
    
    expect(json.originalError).toEqual({
      message: 'Connection failed',
      name: 'Error',
      stack: originalError.stack
    });
  });
});

describe('TimeoutError', () => {
  test('should create with correct properties', () => {
    const error = new TimeoutError();
    
    expect(error.code).toBe('TIMEOUT_ERROR');
    expect(error.statusCode).toBe(408);
    expect(error.message).toBe('Request timed out');
    expect(error.retryable).toBe(true);
  });
});

describe('ServerError', () => {
  test('should create with default status code', () => {
    const error = new ServerError();
    
    expect(error.code).toBe('SERVER_ERROR');
    expect(error.statusCode).toBe(500);
    expect(error.message).toBe('Server error occurred');
    expect(error.retryable).toBe(true);
  });

  test('should create with custom status code', () => {
    const error = new ServerError('Bad Gateway', 502);
    
    expect(error.statusCode).toBe(502);
    expect(error.message).toBe('Bad Gateway');
    expect(error.retryable).toBe(true);
  });

  test('should not be retryable for 4xx errors', () => {
    const error = new ServerError('Bad Request', 400);
    
    expect(error.statusCode).toBe(400);
    expect(error.retryable).toBe(false);
  });
});

describe('ValidationError', () => {
  test('should create with validation errors', () => {
    const validationErrors = ['Field is required', 'Invalid format'];
    const error = new ValidationError('Validation failed', validationErrors);
    
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.validationErrors).toBe(validationErrors);
    expect(error.retryable).toBe(false);
  });

  test('should serialize with validation errors', () => {
    const validationErrors = ['Field is required'];
    const error = new ValidationError('Validation failed', validationErrors);
    const json = error.toJSON();
    
    expect(json.validationErrors).toBe(validationErrors);
  });
});

describe('ConfigurationError', () => {
  test('should create with config errors', () => {
    const configErrors = ['Missing API key', 'Invalid timeout'];
    const error = new ConfigurationError('Config error', configErrors);
    
    expect(error.code).toBe('CONFIGURATION_ERROR');
    expect(error.statusCode).toBe(500);
    expect(error.configErrors).toBe(configErrors);
    expect(error.retryable).toBe(false);
  });

  test('should serialize with config errors', () => {
    const configErrors = ['Missing API key'];
    const error = new ConfigurationError('Config error', configErrors);
    const json = error.toJSON();
    
    expect(json.configErrors).toBe(configErrors);
  });
});

describe('NotImplementedError', () => {
  test('should create with correct properties', () => {
    const error = new NotImplementedError();
    
    expect(error.code).toBe('NOT_IMPLEMENTED');
    expect(error.statusCode).toBe(501);
    expect(error.message).toBe('Feature not implemented');
    expect(error.retryable).toBe(false);
  });
});

describe('createErrorFromResponse', () => {
  test('should create APIKeyError for 401 status', () => {
    const response = new Response(null, { status: 401, statusText: 'Unauthorized' });
    const error = createErrorFromResponse(response);
    
    expect(error).toBeInstanceOf(APIKeyError);
    expect(error.message).toBe('Unauthorized');
  });

  test('should create APIKeyError for 403 status', () => {
    const response = new Response(null, { status: 403, statusText: 'Forbidden' });
    const error = createErrorFromResponse(response);
    
    expect(error).toBeInstanceOf(APIKeyError);
    expect(error.message).toBe('Forbidden');
  });

  test('should create RateLimitError for 429 status', () => {
    const response = new Response(null, { 
      status: 429, 
      statusText: 'Too Many Requests',
      headers: { 'X-RateLimit-Reset': '1640995200' }
    });
    const error = createErrorFromResponse(response);
    
    expect(error).toBeInstanceOf(RateLimitError);
    expect(error.message).toBe('Too Many Requests');
    expect((error as RateLimitError).resetTime).toEqual(new Date(1640995200 * 1000));
  });

  test('should create TimeoutError for 408 status', () => {
    const response = new Response(null, { status: 408, statusText: 'Request Timeout' });
    const error = createErrorFromResponse(response);
    
    expect(error).toBeInstanceOf(TimeoutError);
    expect(error.message).toBe('Request Timeout');
  });

  test('should create ServerError for other status codes', () => {
    const response = new Response(null, { status: 500, statusText: 'Internal Server Error' });
    const error = createErrorFromResponse(response);
    
    expect(error).toBeInstanceOf(ServerError);
    expect(error.message).toBe('Internal Server Error');
    expect(error.statusCode).toBe(500);
  });

  test('should use body message if available', () => {
    const response = new Response(null, { status: 500, statusText: 'Internal Server Error' });
    const body = { message: 'Custom error message' };
    const error = createErrorFromResponse(response, body);
    
    expect(error.message).toBe('Custom error message');
  });
});

describe('isTuningSearchError', () => {
  test('should return true for TuningSearchError instances', () => {
    const error = new APIKeyError();
    expect(isTuningSearchError(error)).toBe(true);
  });

  test('should return false for regular Error instances', () => {
    const error = new Error('Regular error');
    expect(isTuningSearchError(error)).toBe(false);
  });

  test('should return false for non-error values', () => {
    expect(isTuningSearchError('string')).toBe(false);
    expect(isTuningSearchError(null)).toBe(false);
    expect(isTuningSearchError(undefined)).toBe(false);
  });
});

describe('shouldRetryError', () => {
  test('should return true for retryable TuningSearchError', () => {
    const error = new NetworkError();
    expect(shouldRetryError(error, [])).toBe(true);
  });

  test('should return false for non-retryable TuningSearchError', () => {
    const error = new APIKeyError();
    expect(shouldRetryError(error, [])).toBe(false);
  });

  test('should return true if error code is in retryable list', () => {
    const error = new APIKeyError();
    expect(shouldRetryError(error, ['API_KEY_ERROR'])).toBe(true);
  });

  test('should return false for non-TuningSearchError', () => {
    const error = new Error('Regular error');
    expect(shouldRetryError(error, [])).toBe(false);
  });
});