/**
 * Tests for Retry Service
 */

import {
  RetryService,
  DEFAULT_RETRY_CONFIG,
  withRetry,
  withRetryDetails,
  retryable
} from '../services/retry-service';
import {
  NetworkError,
  APIKeyError,
  TimeoutError
} from '../types/error-types';

describe('RetryService', () => {
  let retryService: RetryService;

  beforeEach(() => {
    retryService = new RetryService({
      initialDelay: 10, // Use very short delays for testing
      maxDelay: 100,
      backoffFactor: 2
    });
  });

  describe('constructor', () => {
    test('should use default config when no config provided', () => {
      const service = new RetryService();
      expect(service.getConfig()).toEqual(DEFAULT_RETRY_CONFIG);
    });

    test('should merge provided config with defaults', () => {
      const customConfig = { maxAttempts: 5, initialDelay: 2000 };
      const service = new RetryService(customConfig);
      const config = service.getConfig();

      expect(config.maxAttempts).toBe(5);
      expect(config.initialDelay).toBe(2000);
      expect(config.backoffFactor).toBe(DEFAULT_RETRY_CONFIG.backoffFactor);
    });
  });

  describe('executeWithRetry', () => {
    test('should return result on first success', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await retryService.executeWithRetry(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('should retry on retryable error and eventually succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new NetworkError('Network failed'))
        .mockRejectedValueOnce(new TimeoutError('Timeout'))
        .mockResolvedValue('success');

      const result = await retryService.executeWithRetry(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    test('should not retry on non-retryable error', async () => {
      const operation = jest.fn().mockRejectedValue(new APIKeyError('Invalid API key'));

      await expect(retryService.executeWithRetry(operation)).rejects.toThrow('Invalid API key');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('should respect maxAttempts limit', async () => {
      const operation = jest.fn().mockRejectedValue(new NetworkError('Network failed'));
      const config = { maxAttempts: 2 };

      await expect(retryService.executeWithRetry(operation, config)).rejects.toThrow('Network failed');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    test('should retry error in retryableErrors list even if not retryable', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new APIKeyError('Invalid API key'))
        .mockResolvedValue('success');

      const config = { retryableErrors: ['API_KEY_ERROR'] };

      const result = await retryService.executeWithRetry(operation, config);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    test('should call onRetry callback', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new NetworkError('Network failed'))
        .mockResolvedValue('success');

      const onRetry = jest.fn();

      await retryService.executeWithRetry(operation, undefined, onRetry);

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(expect.objectContaining({
        attempt: 1,
        error: expect.any(NetworkError),
        delay: expect.any(Number),
        elapsedTime: expect.any(Number)
      }));
    });
  });

  describe('executeWithRetryDetails', () => {
    test('should return detailed results on success', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await retryService.executeWithRetryDetails(operation);

      expect(result).toEqual({
        result: 'success',
        totalAttempts: 1,
        totalElapsedTime: expect.any(Number),
        attempts: []
      });
    });

    test('should return detailed results on failure', async () => {
      const error = new NetworkError('Network failed');
      const operation = jest.fn().mockRejectedValue(error);
      const config = { maxAttempts: 2 };

      const result = await retryService.executeWithRetryDetails(operation, config);

      expect(result).toEqual({
        error,
        totalAttempts: 2,
        totalElapsedTime: expect.any(Number),
        attempts: expect.arrayContaining([
          expect.objectContaining({
            attempt: 1,
            error,
            delay: expect.any(Number),
            elapsedTime: expect.any(Number)
          })
        ])
      });
    });
  });

  describe('delay calculation', () => {
    test('should calculate exponential backoff delays', async () => {
      const operation = jest.fn().mockRejectedValue(new NetworkError('Network failed'));
      const config = {
        maxAttempts: 4,
        initialDelay: 10,
        backoffFactor: 2,
        jitter: false // Disable jitter for predictable testing
      };

      const result = await retryService.executeWithRetryDetails(operation, config);

      expect(result.attempts).toHaveLength(3);
      expect(result.attempts[0]!.delay).toBe(10); // 10 * 2^0
      expect(result.attempts[1]!.delay).toBe(20); // 10 * 2^1
      expect(result.attempts[2]!.delay).toBe(40); // 10 * 2^2
    });

    test('should respect maxDelay limit', async () => {
      const operation = jest.fn().mockRejectedValue(new NetworkError('Network failed'));
      const config = {
        maxAttempts: 4,
        initialDelay: 10,
        backoffFactor: 10,
        maxDelay: 30,
        jitter: false
      };

      const result = await retryService.executeWithRetryDetails(operation, config);

      expect(result.attempts).toHaveLength(3);
      expect(result.attempts[0]!.delay).toBe(10);
      expect(result.attempts[1]!.delay).toBe(30); // Limited by maxDelay
      expect(result.attempts[2]!.delay).toBe(30); // Limited by maxDelay
    });

    test('should add jitter when enabled', async () => {
      const operation = jest.fn().mockRejectedValue(new NetworkError('Network failed'));

      // Run multiple times to test jitter variability
      const results = [];
      for (let i = 0; i < 5; i++) {
        const config = {
          maxAttempts: 2,
          initialDelay: 100,
          backoffFactor: 2,
          jitter: true
        };

        const result = await retryService.executeWithRetryDetails(operation, config);
        results.push(result.attempts[0]!.delay);
      }

      // With jitter enabled, we should see some variation in delays
      const uniqueDelays = new Set(results);
      expect(uniqueDelays.size).toBeGreaterThan(1); // Should have different delays due to jitter
    });
  });

  describe('updateConfig', () => {
    test('should update configuration', () => {
      const newConfig = { maxAttempts: 5, initialDelay: 2000 };
      retryService.updateConfig(newConfig);

      const config = retryService.getConfig();
      expect(config.maxAttempts).toBe(5);
      expect(config.initialDelay).toBe(2000);
    });
  });
});

describe('convenience functions', () => {
  describe('withRetry', () => {
    test('should work with default retry service', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await withRetry(operation);

      expect(result).toBe('success');
    });
  });

  describe('withRetryDetails', () => {
    test('should work with default retry service', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await withRetryDetails(operation);

      expect(result.result).toBe('success');
    });
  });
});

describe('retryable decorator', () => {
  test('should retry decorated method', async () => {
    class TestClass {
      private callCount = 0;

      @retryable({ maxAttempts: 3, initialDelay: 10 })
      async testMethod(): Promise<string> {
        this.callCount++;
        if (this.callCount < 3) {
          throw new NetworkError('Network failed');
        }
        return 'success';
      }

      getCallCount(): number {
        return this.callCount;
      }
    }

    const instance = new TestClass();

    const result = await instance.testMethod();

    expect(result).toBe('success');
    expect(instance.getCallCount()).toBe(3);
  });

  test('should not retry non-retryable errors in decorated method', async () => {
    class TestClass {
      private callCount = 0;

      @retryable({ maxAttempts: 3 })
      async testMethod(): Promise<string> {
        this.callCount++;
        throw new APIKeyError('Invalid API key');
      }

      getCallCount(): number {
        return this.callCount;
      }
    }

    const instance = new TestClass();

    await expect(instance.testMethod()).rejects.toThrow('Invalid API key');
    expect(instance.getCallCount()).toBe(1);
  });
});

describe('error handling edge cases', () => {
  let retryService: RetryService;

  beforeEach(() => {
    retryService = new RetryService({ initialDelay: 10 });
  });

  test('should handle non-Error thrown values', async () => {
    const operation = jest.fn().mockRejectedValue('string error');

    await expect(retryService.executeWithRetry(operation)).rejects.toThrow('string error');
  });

  test('should handle callback errors gracefully', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new NetworkError('Network failed'))
      .mockResolvedValue('success');

    const onRetry = jest.fn().mockImplementation(() => {
      throw new Error('Callback error');
    });

    // Mock console.warn to avoid noise in test output
    const originalWarn = console.warn;
    console.warn = jest.fn();

    const result = await retryService.executeWithRetry(operation, undefined, onRetry);

    expect(result).toBe('success');
    expect(console.warn).toHaveBeenCalledWith('Retry callback error:', expect.any(Error));

    console.warn = originalWarn;
  });
});
