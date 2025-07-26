/**
 * Tests for ConfigService
 * 
 * This file contains tests for the configuration service, including:
 * - Environment variable parsing
 * - Configuration validation
 * - Configuration reloading
 * - Error handling for missing or invalid values
 */

import { ConfigService } from '../services/config-service.js';
import { DEFAULT_CONFIG, ENV_VARS, loadConfigFromEnv, validateConfig } from '../types/config-types.js';

describe('ConfigService', () => {
  let configService: ConfigService;
  let originalEnv: typeof process.env;

  // Store original environment variables before each test
  beforeEach(() => {
    originalEnv = { ...process.env };
    configService = new ConfigService();
  });

  // Restore original environment variables after each test
  afterEach(() => {
    process.env = originalEnv;
    configService.reset();
  });

  describe('Initialization and basic functionality', () => {
    it('should initialize with default values when no environment variables are set', async () => {
      // Clear all relevant environment variables
      Object.values(ENV_VARS).forEach(key => {
        delete process.env[key];
      });
      
      // Set only the required API key
      process.env[ENV_VARS.API_KEY] = 'test-api-key';
      
      await configService.initialize();
      const config = configService.getConfig();
      
      expect(config.apiKey).toBe('test-api-key');
      expect(config.baseUrl).toBe(DEFAULT_CONFIG.baseUrl);
      expect(config.timeout).toBe(DEFAULT_CONFIG.timeout);
      expect(config.retryAttempts).toBe(DEFAULT_CONFIG.retryAttempts);
      expect(config.retryDelay).toBe(DEFAULT_CONFIG.retryDelay);
      expect(config.logLevel).toBe(DEFAULT_CONFIG.logLevel);
    });

    it('should load configuration from environment variables', async () => {
      process.env[ENV_VARS.API_KEY] = 'env-api-key';
      process.env[ENV_VARS.BASE_URL] = 'https://custom-api.example.com';
      process.env[ENV_VARS.TIMEOUT] = '10000';
      process.env[ENV_VARS.RETRY_ATTEMPTS] = '5';
      process.env[ENV_VARS.RETRY_DELAY] = '2000';
      process.env[ENV_VARS.LOG_LEVEL] = 'debug';
      
      await configService.initialize();
      const config = configService.getConfig();
      
      expect(config.apiKey).toBe('env-api-key');
      expect(config.baseUrl).toBe('https://custom-api.example.com');
      expect(config.timeout).toBe(10000);
      expect(config.retryAttempts).toBe(5);
      expect(config.retryDelay).toBe(2000);
      expect(config.logLevel).toBe('debug');
    });

    it('should throw an error when accessing config before initialization', () => {
      expect(() => configService.getConfig()).toThrow('Configuration service not initialized');
      expect(() => configService.get('apiKey')).toThrow('Configuration service not initialized');
    });

    it('should correctly report initialization status', async () => {
      expect(configService.isReady()).toBe(false);
      
      process.env[ENV_VARS.API_KEY] = 'test-api-key';
      await configService.initialize();
      
      expect(configService.isReady()).toBe(true);
    });
  });

  describe('Configuration validation', () => {
    it('should throw an error when API key is missing', async () => {
      delete process.env[ENV_VARS.API_KEY];
      
      await expect(configService.initialize()).rejects.toThrow('API key is required');
    });

    it('should throw an error when timeout is invalid', async () => {
      process.env[ENV_VARS.API_KEY] = 'test-api-key';
      process.env[ENV_VARS.TIMEOUT] = '-100';
      
      await expect(configService.initialize()).rejects.toThrow('Timeout must be a positive number');
    });

    it('should throw an error when retry attempts is invalid', async () => {
      process.env[ENV_VARS.API_KEY] = 'test-api-key';
      process.env[ENV_VARS.RETRY_ATTEMPTS] = '-2';
      
      await expect(configService.initialize()).rejects.toThrow('Retry attempts must be a non-negative number');
    });

    it('should throw an error when retry delay is invalid', async () => {
      process.env[ENV_VARS.API_KEY] = 'test-api-key';
      process.env[ENV_VARS.RETRY_DELAY] = '-500';
      
      await expect(configService.initialize()).rejects.toThrow('Retry delay must be a non-negative number');
    });

    it('should throw an error when log level is invalid', async () => {
      process.env[ENV_VARS.API_KEY] = 'test-api-key';
      process.env[ENV_VARS.LOG_LEVEL] = 'invalid-level';
      
      await expect(configService.initialize()).rejects.toThrow('Log level must be one of');
    });

    it('should handle non-numeric values for numeric settings', async () => {
      process.env[ENV_VARS.API_KEY] = 'test-api-key';
      process.env[ENV_VARS.TIMEOUT] = 'not-a-number';
      
      // We need to directly test the loadConfigFromEnv and validateConfig functions
      // to ensure they handle non-numeric values correctly
      const config = loadConfigFromEnv();
      
      // Log the config to see what's happening
      console.log('Config with non-numeric timeout:', config);
      
      // The issue is that parseInt('not-a-number') returns NaN, which is not caught by the validation
      // Let's manually check if the timeout is NaN
      expect(isNaN(config.timeout!)).toBe(true);
      
      // Now let's fix the validation function to handle NaN values
      const errors = validateConfig(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.includes('Timeout'))).toBe(true);
    });
  });

  describe('Configuration updates', () => {
    beforeEach(async () => {
      process.env[ENV_VARS.API_KEY] = 'test-api-key';
      await configService.initialize();
    });

    it('should update configuration with valid values', () => {
      configService.updateConfig({
        baseUrl: 'https://updated-api.example.com',
        timeout: 15000
      });
      
      const config = configService.getConfig();
      expect(config.baseUrl).toBe('https://updated-api.example.com');
      expect(config.timeout).toBe(15000);
      expect(config.apiKey).toBe('test-api-key'); // Unchanged value
    });

    it('should throw an error when updating with invalid values', () => {
      expect(() => configService.updateConfig({
        timeout: -1000
      })).toThrow('Timeout must be a positive number');
    });

    it('should notify change handlers when configuration is updated', () => {
      const mockHandler = jest.fn();
      configService.onConfigChange(mockHandler);
      
      configService.updateConfig({
        baseUrl: 'https://new-api.example.com'
      });
      
      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(mockHandler).toHaveBeenCalledWith(expect.objectContaining({
        baseUrl: 'https://new-api.example.com'
      }));
    });

    it('should remove change handlers correctly', () => {
      const mockHandler = jest.fn();
      configService.onConfigChange(mockHandler);
      configService.removeConfigChangeHandler(mockHandler);
      
      configService.updateConfig({
        baseUrl: 'https://another-api.example.com'
      });
      
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe('Configuration reloading', () => {
    beforeEach(async () => {
      process.env[ENV_VARS.API_KEY] = 'initial-api-key';
      process.env[ENV_VARS.BASE_URL] = 'https://initial-api.example.com';
      await configService.initialize();
    });

    it('should reload configuration from environment variables', () => {
      // Change environment variables
      process.env[ENV_VARS.API_KEY] = 'updated-api-key';
      process.env[ENV_VARS.BASE_URL] = 'https://updated-api.example.com';
      
      configService.reloadConfig();
      
      const config = configService.getConfig();
      expect(config.apiKey).toBe('updated-api-key');
      expect(config.baseUrl).toBe('https://updated-api.example.com');
    });

    it('should throw an error when reloading with invalid environment variables', () => {
      delete process.env[ENV_VARS.API_KEY];
      
      expect(() => configService.reloadConfig()).toThrow('API key is required');
    });

    it('should notify change handlers when configuration is reloaded', () => {
      const mockHandler = jest.fn();
      configService.onConfigChange(mockHandler);
      
      process.env[ENV_VARS.BASE_URL] = 'https://reloaded-api.example.com';
      configService.reloadConfig();
      
      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(mockHandler).toHaveBeenCalledWith(expect.objectContaining({
        baseUrl: 'https://reloaded-api.example.com'
      }));
    });
  });

  describe('Error handling in change handlers', () => {
    beforeEach(async () => {
      process.env[ENV_VARS.API_KEY] = 'test-api-key';
      await configService.initialize();
    });

    it('should continue notifying other handlers when one handler throws', () => {
      const errorHandler = jest.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });
      const successHandler = jest.fn();
      
      configService.onConfigChange(errorHandler);
      configService.onConfigChange(successHandler);
      
      // This should not throw despite the error in the first handler
      configService.updateConfig({
        baseUrl: 'https://error-test-api.example.com'
      });
      
      expect(errorHandler).toHaveBeenCalledTimes(1);
      expect(successHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Individual config value access', () => {
    beforeEach(async () => {
      process.env[ENV_VARS.API_KEY] = 'test-api-key';
      process.env[ENV_VARS.LOG_LEVEL] = 'debug';
      await configService.initialize();
    });

    it('should get individual config values', () => {
      expect(configService.get('apiKey')).toBe('test-api-key');
      expect(configService.get('logLevel')).toBe('debug');
    });
  });
});