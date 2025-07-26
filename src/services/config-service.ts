/**
 * Configuration Service for TuningSearch MCP Server
 * 
 * This service handles configuration loading, validation, and management
 * including environment variable parsing and configuration reloading.
 */

import {
  TuningSearchConfig,
  DEFAULT_CONFIG,
  validateConfig,
  loadConfigFromEnv,
  LogLevel
} from '../types/config-types.js';

/**
 * Configuration change event handler type
 */
export type ConfigChangeHandler = (config: TuningSearchConfig) => void;

/**
 * Configuration service class that manages application configuration
 */
export class ConfigService {
  private config: TuningSearchConfig;
  private changeHandlers: ConfigChangeHandler[] = [];
  private isInitialized = false;

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Initialize the configuration service
   * Loads configuration from environment variables and validates it
   */
  public async initialize(): Promise<void> {
    try {
      this.config = this.loadConfiguration();
      this.validateConfiguration();
      this.isInitialized = true;
      
      // Log successful initialization
      this.logInfo('Configuration service initialized successfully');
    } catch (error) {
      this.logError('Failed to initialize configuration service', error);
      throw error;
    }
  }

  /**
   * Get the current configuration
   */
  public getConfig(): TuningSearchConfig {
    if (!this.isInitialized) {
      throw new Error('Configuration service not initialized. Call initialize() first.');
    }
    return { ...this.config };
  }

  /**
   * Get a specific configuration value
   */
  public get<K extends keyof TuningSearchConfig>(key: K): TuningSearchConfig[K] {
    if (!this.isInitialized) {
      throw new Error('Configuration service not initialized. Call initialize() first.');
    }
    return this.config[key];
  }

  /**
   * Update configuration with new values
   * Validates the new configuration before applying changes
   */
  public updateConfig(updates: Partial<TuningSearchConfig>): void {
    if (!this.isInitialized) {
      throw new Error('Configuration service not initialized. Call initialize() first.');
    }

    const newConfig = { ...this.config, ...updates };
    
    // Validate the new configuration
    const errors = validateConfig(newConfig);
    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }

    const oldConfig = { ...this.config };
    this.config = newConfig;

    this.logInfo('Configuration updated', { 
      changes: this.getConfigChanges(oldConfig, newConfig) 
    });

    // Notify change handlers
    this.notifyConfigChange();
  }

  /**
   * Reload configuration from environment variables
   */
  public reloadConfig(): void {
    if (!this.isInitialized) {
      throw new Error('Configuration service not initialized. Call initialize() first.');
    }

    try {
      const oldConfig = { ...this.config };
      this.config = this.loadConfiguration();
      this.validateConfiguration();

      this.logInfo('Configuration reloaded from environment variables', {
        changes: this.getConfigChanges(oldConfig, this.config)
      });

      // Notify change handlers
      this.notifyConfigChange();
    } catch (error) {
      this.logError('Failed to reload configuration', error);
      throw error;
    }
  }

  /**
   * Register a handler to be called when configuration changes
   */
  public onConfigChange(handler: ConfigChangeHandler): void {
    this.changeHandlers.push(handler);
  }

  /**
   * Remove a configuration change handler
   */
  public removeConfigChangeHandler(handler: ConfigChangeHandler): void {
    const index = this.changeHandlers.indexOf(handler);
    if (index > -1) {
      this.changeHandlers.splice(index, 1);
    }
  }

  /**
   * Check if the configuration service is initialized
   */
  public isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Reset configuration to defaults (mainly for testing)
   */
  public reset(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.changeHandlers = [];
    this.isInitialized = false;
  }

  /**
   * Load configuration from environment variables with error handling
   */
  private loadConfiguration(): TuningSearchConfig {
    try {
      return loadConfigFromEnv();
    } catch (error) {
      this.logError('Failed to load configuration from environment variables', error);
      throw new Error('Configuration loading failed: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  /**
   * Validate the current configuration
   */
  private validateConfiguration(): void {
    const errors = validateConfig(this.config);
    if (errors.length > 0) {
      const errorMessage = `Configuration validation failed: ${errors.join(', ')}`;
      this.logError(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Notify all registered change handlers
   */
  private notifyConfigChange(): void {
    const configCopy = { ...this.config };
    this.changeHandlers.forEach(handler => {
      try {
        handler(configCopy);
      } catch (error) {
        this.logError('Error in configuration change handler', error);
      }
    });
  }

  /**
   * Get the differences between two configurations
   */
  private getConfigChanges(oldConfig: TuningSearchConfig, newConfig: TuningSearchConfig): Record<string, { old: any; new: any }> {
    const changes: Record<string, { old: any; new: any }> = {};
    
    for (const key in newConfig) {
      const typedKey = key as keyof TuningSearchConfig;
      if (oldConfig[typedKey] !== newConfig[typedKey]) {
        changes[key] = {
          old: oldConfig[typedKey],
          new: newConfig[typedKey]
        };
      }
    }
    
    return changes;
  }

  /**
   * Log info message with current log level consideration
   */
  private logInfo(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      console.log(`[ConfigService] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  }

  /**
   * Log error message
   */
  private logError(message: string, error?: any): void {
    if (this.shouldLog('error')) {
      console.error(`[ConfigService] ${message}`, error);
    }
  }

  /**
   * Check if we should log at the given level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.config.logLevel || 'info');
    const requestedLevelIndex = levels.indexOf(level);
    
    return requestedLevelIndex <= currentLevelIndex;
  }
}

/**
 * Singleton instance of the configuration service
 */
export const configService = new ConfigService();