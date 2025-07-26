/**
 * Tests for the structured logger
 */

import { StructuredLogger, createLogger, setGlobalLogger, getLogger, logError, logWarn, logInfo, logDebug } from '../services/logger.js';
import { LogLevel } from '../types/logger-types.js';

// Mock console methods
const originalConsoleLog = console.log;
let consoleOutput: string[] = [];

beforeEach(() => {
  consoleOutput = [];
  console.log = jest.fn((message: string) => {
    consoleOutput.push(message);
  });
});

afterEach(() => {
  console.log = originalConsoleLog;
});

describe('StructuredLogger', () => {
  describe('log level filtering', () => {
    it('should filter logs based on level', () => {
      const logger = new StructuredLogger({ level: LogLevel.WARN });
      
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');
      
      expect(consoleOutput).toHaveLength(2);
      expect(consoleOutput[0]).toContain('warn message');
      expect(consoleOutput[1]).toContain('error message');
    });

    it('should allow changing log level', () => {
      const logger = new StructuredLogger({ level: LogLevel.ERROR });
      
      logger.info('should not appear');
      expect(consoleOutput).toHaveLength(0);
      
      logger.setLevel(LogLevel.INFO);
      logger.info('should appear');
      expect(consoleOutput).toHaveLength(1);
    });
  });

  describe('JSON format', () => {
    it('should output JSON format by default', () => {
      const logger = new StructuredLogger();
      
      logger.info('test message', { key: 'value' });
      
      expect(consoleOutput).toHaveLength(1);
      const parsed = JSON.parse(consoleOutput[0]);
      expect(parsed.level).toBe('INFO');
      expect(parsed.message).toBe('test message');
      expect(parsed.context).toEqual({ key: 'value' });
      expect(parsed.timestamp).toBeDefined();
    });

    it('should include error details in JSON format', () => {
      const logger = new StructuredLogger();
      const error = new Error('test error');
      
      logger.error('error occurred', { userId: 123 }, error);
      
      expect(consoleOutput).toHaveLength(1);
      const parsed = JSON.parse(consoleOutput[0]);
      expect(parsed.level).toBe('ERROR');
      expect(parsed.message).toBe('error occurred');
      expect(parsed.context).toEqual({ userId: 123 });
      expect(parsed.error.name).toBe('Error');
      expect(parsed.error.message).toBe('test error');
      expect(parsed.error.stack).toBeDefined();
    });
  });

  describe('text format', () => {
    it('should output text format when configured', () => {
      const logger = new StructuredLogger({ format: 'text' });
      
      logger.info('test message', { key: 'value' });
      
      expect(consoleOutput).toHaveLength(1);
      expect(consoleOutput[0]).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO: test message {"key":"value"}/);
    });

    it('should include error stack in text format', () => {
      const logger = new StructuredLogger({ format: 'text' });
      const error = new Error('test error');
      
      logger.error('error occurred', undefined, error);
      
      expect(consoleOutput).toHaveLength(2);
      expect(consoleOutput[0]).toContain('ERROR: error occurred ERROR: test error');
      expect(consoleOutput[1]).toContain('Error: test error');
    });
  });

  describe('context handling', () => {
    it('should handle missing context gracefully', () => {
      const logger = new StructuredLogger();
      
      logger.info('message without context');
      
      expect(consoleOutput).toHaveLength(1);
      const parsed = JSON.parse(consoleOutput[0]);
      expect(parsed.context).toBeUndefined();
    });

    it('should handle complex context objects', () => {
      const logger = new StructuredLogger();
      const context = {
        user: { id: 123, name: 'test' },
        request: { method: 'GET', url: '/api/search' },
        nested: { deep: { value: 'test' } }
      };
      
      logger.info('complex context', context);
      
      expect(consoleOutput).toHaveLength(1);
      const parsed = JSON.parse(consoleOutput[0]);
      expect(parsed.context).toEqual(context);
    });
  });
});

describe('Global logger functions', () => {
  it('should create and use global logger', () => {
    const logger = createLogger({ level: LogLevel.DEBUG });
    setGlobalLogger(logger);
    
    logDebug('debug message');
    logInfo('info message');
    logWarn('warn message');
    logError('error message');
    
    expect(consoleOutput).toHaveLength(4);
  });

  it('should create default logger if none set', () => {
    // Reset global logger
    setGlobalLogger(createLogger());
    
    const logger = getLogger();
    expect(logger).toBeDefined();
    expect(logger.getLevel()).toBe(LogLevel.INFO);
  });

  it('should use convenience functions', () => {
    setGlobalLogger(createLogger({ level: LogLevel.DEBUG }));
    
    logError('error', { code: 500 }, new Error('test'));
    logWarn('warning', { type: 'validation' });
    logInfo('info', { action: 'search' });
    logDebug('debug', { step: 1 });
    
    expect(consoleOutput).toHaveLength(4);
    
    // Verify error log
    const errorLog = JSON.parse(consoleOutput[0]);
    expect(errorLog.level).toBe('ERROR');
    expect(errorLog.context.code).toBe(500);
    expect(errorLog.error.message).toBe('test');
    
    // Verify other logs
    expect(JSON.parse(consoleOutput[1]).level).toBe('WARN');
    expect(JSON.parse(consoleOutput[2]).level).toBe('INFO');
    expect(JSON.parse(consoleOutput[3]).level).toBe('DEBUG');
  });
});