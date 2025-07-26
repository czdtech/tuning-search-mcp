/**
 * Tests for Error Handler Service
 */

import {
  ErrorHandler,
  DEFAULT_ERROR_HANDLER_CONFIG,
  handleError,
  createUserMessage,
  shouldReportError
} from '../services/error-handler';
import {
  APIKeyError,
  RateLimitError,
  NetworkError,
  TimeoutError,
  ValidationError,
  ConfigurationError
} from '../types/error-types';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let consoleSpy: {
    error: jest.SpyInstance;
    warn: jest.SpyInstance;
    info: jest.SpyInstance;
    debug: jest.SpyInstance;
  };

  beforeEach(() => {
    errorHandler = new ErrorHandler();
    
    // Mock console methods
    consoleSpy = {
      error: jest.spyOn(console, 'error').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      info: jest.spyOn(console, 'info').mockImplementation(),
      debug: jest.spyOn(console, 'debug').mockImplementation()
    };
  });

  afterEach(() => {
    // Restore console methods
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
  });

  describe('constructor', () => {
    test('should use default config when no config provided', () => {
      const handler = new ErrorHandler();
      expect(handler.getConfig()).toEqual(DEFAULT_ERROR_HANDLER_CONFIG);
    });

    test('should merge provided config with defaults', () => {
      const customConfig = { enableLogging: false, includeStackTrace: true };
      const handler = new ErrorHandler(customConfig);
      const config = handler.getConfig();
      
      expect(config.enableLogging).toBe(false);
      expect(config.includeStackTrace).toBe(true);
      expect(config.sanitizeErrors).toBe(DEFAULT_ERROR_HANDLER_CONFIG.sanitizeErrors);
    });
  });

  describe('handleError', () => {
    test('should handle TuningSearchError correctly', () => {
      const error = new APIKeyError('Invalid API key');
      const result = errorHandler.handleError(error);
      
      expect(result).toEqual({
        code: 'API_KEY_ERROR',
        message: 'API key is missing or invalid. Please check your configuration.',
        retryable: false,
        context: expect.stringContaining('Please verify your API key'),
        timestamp: expect.any(String)
      });
    });

    test('should handle regular Error by converting to NetworkError', () => {
      const error = new Error('Connection failed');
      const result = errorHandler.handleError(error);
      
      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.message).toBe('Connection failed');
      expect(result.retryable).toBe(true);
    });

    test('should handle string errors', () => {
      const error = 'Something went wrong';
      const result = errorHandler.handleError(error);
      
      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.message).toBe('Something went wrong');
      expect(result.retryable).toBe(true);
    });

    test('should handle unknown error types', () => {
      const error = { unknown: 'error' };
      const result = errorHandler.handleError(error);
      
      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.message).toBe('Unknown error occurred');
      expect(result.retryable).toBe(true);
    });

    test('should include context in result', () => {
      const error = new NetworkError('Network failed');
      const context = 'During API call';
      const result = errorHandler.handleError(error, context);
      
      expect(result.context).toContain('Context: During API call');
    });
  });

  describe('logging', () => {
    test('should log error with appropriate level', () => {
      const error = new NetworkError('Network failed');
      errorHandler.handleError(error);
      
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'TuningSearch Error:',
        expect.objectContaining({
          code: 'NETWORK_ERROR',
          message: 'Network failed',
          statusCode: 500,
          retryable: true
        })
      );
    });

    test('should log warning for API key errors', () => {
      const error = new APIKeyError('Invalid key');
      errorHandler.handleError(error);
      
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        'TuningSearch Warning:',
        expect.objectContaining({
          code: 'API_KEY_ERROR'
        })
      );
    });

    test('should not log when logging is disabled', () => {
      const handler = new ErrorHandler({ enableLogging: false });
      const error = new NetworkError('Network failed');
      
      handler.handleError(error);
      
      expect(consoleSpy.error).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
    });

    test('should include stack trace when enabled', () => {
      const handler = new ErrorHandler({ includeStackTrace: true });
      const error = new NetworkError('Network failed');
      
      handler.handleError(error);
      
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'TuningSearch Error:',
        expect.objectContaining({
          stack: expect.any(String)
        })
      );
    });
  });

  describe('message sanitization', () => {
    test('should sanitize API key errors', () => {
      const error = new APIKeyError('Invalid key: abc123def456');
      const result = errorHandler.handleError(error);
      
      expect(result.message).toBe('API key is missing or invalid. Please check your configuration.');
    });

    test('should redact long alphanumeric strings', () => {
      const handler = new ErrorHandler({ sanitizeErrors: true });
      const error = new NetworkError('Error with key: abcdef1234567890abcdef1234567890');
      const result = handler.handleError(error);
      
      expect(result.message).toContain('[REDACTED]');
      expect(result.message).not.toContain('abcdef1234567890abcdef1234567890');
    });

    test('should redact URLs', () => {
      const handler = new ErrorHandler({ sanitizeErrors: true });
      const error = new NetworkError('Failed to connect to https://api.example.com/secret');
      const result = handler.handleError(error);
      
      expect(result.message).toContain('[URL_REDACTED]');
      expect(result.message).not.toContain('https://api.example.com/secret');
    });

    test('should not sanitize when disabled', () => {
      const handler = new ErrorHandler({ sanitizeErrors: false });
      const error = new NetworkError('Error with key: abcdef1234567890abcdef1234567890');
      const result = handler.handleError(error);
      
      expect(result.message).toContain('abcdef1234567890abcdef1234567890');
    });
  });

  describe('error context and suggestions', () => {
    test('should provide context for RateLimitError with reset time', () => {
      const resetTime = new Date('2024-01-01T12:00:00Z');
      const error = new RateLimitError('Rate limit exceeded', resetTime);
      const result = errorHandler.handleError(error);
      
      expect(result.context).toContain('Please wait before making additional requests');
      expect(result.context).toContain('Rate limit resets at: 2024-01-01T12:00:00.000Z');
    });

    test('should provide context for ValidationError with validation errors', () => {
      const validationErrors = ['Field is required', 'Invalid format'];
      const error = new ValidationError('Validation failed', validationErrors);
      const result = errorHandler.handleError(error);
      
      expect(result.context).toContain('Validation errors:');
      expect(result.context).toContain('- Field is required');
      expect(result.context).toContain('- Invalid format');
    });

    test('should provide context for ConfigurationError with config errors', () => {
      const configErrors = ['Missing API key', 'Invalid timeout'];
      const error = new ConfigurationError('Config error', configErrors);
      const result = errorHandler.handleError(error);
      
      expect(result.context).toContain('Configuration errors:');
      expect(result.context).toContain('- Missing API key');
      expect(result.context).toContain('- Invalid timeout');
    });

    test('should provide context for TimeoutError', () => {
      const error = new TimeoutError('Request timed out');
      const result = errorHandler.handleError(error);
      
      expect(result.context).toContain('The request took too long to complete');
      expect(result.context).toContain('Try again or increase the timeout value');
    });
  });

  describe('custom messages', () => {
    test('should use custom message when provided', () => {
      const handler = new ErrorHandler({
        customMessages: {
          'API_KEY_ERROR': 'Custom API key message'
        }
      });
      
      const error = new APIKeyError('Original message');
      const result = handler.handleError(error);
      
      expect(result.message).toBe('Custom API key message');
    });
  });

  describe('updateConfig', () => {
    test('should update configuration', () => {
      const newConfig = { enableLogging: false, includeStackTrace: true };
      errorHandler.updateConfig(newConfig);
      
      const config = errorHandler.getConfig();
      expect(config.enableLogging).toBe(false);
      expect(config.includeStackTrace).toBe(true);
    });
  });

  describe('createUserMessage', () => {
    test('should create user-friendly message', () => {
      const error = new APIKeyError('Invalid key');
      const message = errorHandler.createUserMessage(error);
      
      expect(message).toContain('Error: API key is missing or invalid');
      expect(message).toContain('Please verify your API key');
    });

    test('should include retry information for retryable errors', () => {
      const error = new NetworkError('Network failed');
      const message = errorHandler.createUserMessage(error);
      
      expect(message).toContain('This operation can be retried');
    });
  });

  describe('shouldReport', () => {
    test('should not report validation errors', () => {
      const error = new ValidationError('Validation failed');
      expect(errorHandler.shouldReport(error)).toBe(false);
    });

    test('should not report API key errors', () => {
      const error = new APIKeyError('Invalid key');
      expect(errorHandler.shouldReport(error)).toBe(false);
    });

    test('should not report rate limit errors', () => {
      const error = new RateLimitError('Rate limit exceeded');
      expect(errorHandler.shouldReport(error)).toBe(false);
    });

    test('should report network errors', () => {
      const error = new NetworkError('Network failed');
      expect(errorHandler.shouldReport(error)).toBe(true);
    });

    test('should report regular errors', () => {
      const error = new Error('Unexpected error');
      expect(errorHandler.shouldReport(error)).toBe(true);
    });
  });
});

describe('convenience functions', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('handleError', () => {
    test('should work with default error handler', () => {
      const error = new NetworkError('Network failed');
      const result = handleError(error);
      
      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.message).toBe('Network failed');
    });
  });

  describe('createUserMessage', () => {
    test('should work with default error handler', () => {
      const error = new APIKeyError('Invalid key');
      const message = createUserMessage(error);
      
      expect(message).toContain('Error: API key is missing or invalid');
    });
  });

  describe('shouldReportError', () => {
    test('should work with default error handler', () => {
      const error = new NetworkError('Network failed');
      expect(shouldReportError(error)).toBe(true);
      
      const validationError = new ValidationError('Validation failed');
      expect(shouldReportError(validationError)).toBe(false);
    });
  });
});