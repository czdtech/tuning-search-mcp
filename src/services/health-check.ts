/**
 * Health Check Service
 * 
 * Provides comprehensive health monitoring and status reporting
 * for the TuningSearch MCP server.
 */

import { PerformanceMonitor, SystemMetrics, PerformanceAlert } from './performance-monitor.js';
import { logInfo, logError } from './logger.js';

/**
 * Health status levels
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning', 
  CRITICAL = 'critical',
  UNKNOWN = 'unknown'
}

/**
 * Component health information
 */
export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  message: string;
  details?: Record<string, any>;
  lastChecked: number;
}

/**
 * Overall system health report
 */
export interface HealthReport {
  status: HealthStatus;
  timestamp: number;
  uptime: number;
  components: ComponentHealth[];
  metrics: {
    system: SystemMetrics;
    performance: any;
  };
  alerts: PerformanceAlert[];
  summary: {
    totalComponents: number;
    healthyComponents: number;
    warningComponents: number;
    criticalComponents: number;
    activeAlerts: number;
  };
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  /** Enable health checks */
  enabled: boolean;
  /** Health check interval in milliseconds */
  checkInterval: number;
  /** Component timeout in milliseconds */
  componentTimeout: number;
  /** Alert retention period in milliseconds */
  alertRetention: number;
}

/**
 * Default health check configuration
 */
export const DEFAULT_HEALTH_CONFIG: HealthCheckConfig = {
  enabled: true,
  checkInterval: 30000, // 30 seconds
  componentTimeout: 5000, // 5 seconds
  alertRetention: 24 * 60 * 60 * 1000 // 24 hours
};

/**
 * Health check function type
 */
export type HealthCheckFunction = () => Promise<ComponentHealth>;

/**
 * Health Check Service
 * Monitors system health and provides status reports
 */
export class HealthCheckService {
  private config: HealthCheckConfig;
  private performanceMonitor: PerformanceMonitor;
  private components = new Map<string, HealthCheckFunction>();
  private lastHealthReport: HealthReport | null = null;
  private checkInterval?: ReturnType<typeof setInterval>;
  private startTime: number;

  constructor(
    performanceMonitor: PerformanceMonitor,
    config: Partial<HealthCheckConfig> = {}
  ) {
    this.performanceMonitor = performanceMonitor;
    this.config = { ...DEFAULT_HEALTH_CONFIG, ...config };
    this.startTime = Date.now();
  }

  /**
   * Register a component health check
   */
  registerComponent(name: string, healthCheck: HealthCheckFunction): void {
    this.components.set(name, healthCheck);
    logInfo('Health check component registered', { component: name });
  }

  /**
   * Unregister a component health check
   */
  unregisterComponent(name: string): void {
    this.components.delete(name);
    logInfo('Health check component unregistered', { component: name });
  }

  /**
   * Start periodic health checks
   */
  start(): void {
    if (this.checkInterval) {
      return; // Already started
    }

    if (!this.config.enabled) {
      logInfo('Health checks disabled');
      return;
    }

    logInfo('Starting health check service', { 
      interval: this.config.checkInterval,
      components: this.components.size
    });

    this.checkInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logError('Health check failed', {}, error instanceof Error ? error : new Error(String(error)));
      }
    }, this.config.checkInterval);

    // Perform initial health check
    this.performHealthCheck().catch(error => {
      logError('Initial health check failed', {}, error instanceof Error ? error : new Error(String(error)));
    });
  }

  /**
   * Stop periodic health checks
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      (this.checkInterval as any) = undefined;
      logInfo('Health check service stopped');
    }
  }

  /**
   * Perform a comprehensive health check
   */
  async performHealthCheck(): Promise<HealthReport> {
    const startTime = Date.now();
    const components: ComponentHealth[] = [];

    // Check all registered components
    for (const [name, healthCheck] of this.components) {
      try {
        const componentHealth = await Promise.race([
          healthCheck(),
          this.createTimeoutPromise(name)
        ]);
        components.push(componentHealth);
      } catch (error) {
        components.push({
          name,
          status: HealthStatus.CRITICAL,
          message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          lastChecked: Date.now()
        });
        logError('Component health check failed', { component: name }, error instanceof Error ? error : new Error(String(error)));
      }
    }

    // Get system metrics
    const systemMetrics = this.performanceMonitor.getSystemMetrics();
    const performanceMetrics = this.performanceMonitor.exportMetrics();

    // Get recent alerts
    const alerts = this.performanceMonitor.getAlerts(Date.now() - this.config.alertRetention);

    // Calculate overall status
    const overallStatus = this.calculateOverallStatus(components, alerts);

    // Create health report
    const healthReport: HealthReport = {
      status: overallStatus,
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      components,
      metrics: {
        system: systemMetrics,
        performance: performanceMetrics
      },
      alerts,
      summary: {
        totalComponents: components.length,
        healthyComponents: components.filter(c => c.status === HealthStatus.HEALTHY).length,
        warningComponents: components.filter(c => c.status === HealthStatus.WARNING).length,
        criticalComponents: components.filter(c => c.status === HealthStatus.CRITICAL).length,
        activeAlerts: alerts.length
      }
    };

    this.lastHealthReport = healthReport;

    // Log health status changes
    if (this.shouldLogHealthStatus(overallStatus)) {
      logInfo('Health check completed', {
        status: overallStatus,
        duration: Date.now() - startTime,
        components: healthReport.summary
      });
    }

    return healthReport;
  }

  /**
   * Get the latest health report
   */
  getHealthReport(): HealthReport | null {
    return this.lastHealthReport;
  }

  /**
   * Get health status for a specific component
   */
  async getComponentHealth(componentName: string): Promise<ComponentHealth | null> {
    const healthCheck = this.components.get(componentName);
    if (!healthCheck) {
      return null;
    }

    try {
      return await Promise.race([
        healthCheck(),
        this.createTimeoutPromise(componentName)
      ]);
    } catch (error) {
      return {
        name: componentName,
        status: HealthStatus.CRITICAL,
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: Date.now()
      };
    }
  }

  /**
   * Create a timeout promise for component health checks
   */
  private createTimeoutPromise(componentName: string): Promise<ComponentHealth> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Health check timeout for component: ${componentName}`));
      }, this.config.componentTimeout);
    });
  }

  /**
   * Calculate overall system health status
   */
  private calculateOverallStatus(components: ComponentHealth[], alerts: PerformanceAlert[]): HealthStatus {
    // Check for critical components
    if (components.some(c => c.status === HealthStatus.CRITICAL)) {
      return HealthStatus.CRITICAL;
    }

    // Check for critical alerts
    if (alerts.some(a => a.severity === 'critical')) {
      return HealthStatus.CRITICAL;
    }

    // Check for warning components or alerts
    if (components.some(c => c.status === HealthStatus.WARNING) || 
        alerts.some(a => a.severity === 'warning')) {
      return HealthStatus.WARNING;
    }

    // Check if we have any components
    if (components.length === 0) {
      return HealthStatus.UNKNOWN;
    }

    return HealthStatus.HEALTHY;
  }

  /**
   * Determine if health status should be logged
   */
  private shouldLogHealthStatus(status: HealthStatus): boolean {
    // Always log critical and warning statuses
    if (status === HealthStatus.CRITICAL || status === HealthStatus.WARNING) {
      return true;
    }

    // Log healthy status periodically (every 10 checks)
    const checkCount = Math.floor((Date.now() - this.startTime) / this.config.checkInterval);
    return checkCount % 10 === 0;
  }

  /**
   * Update health check configuration
   */
  updateConfig(config: Partial<HealthCheckConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...config };

    // Restart if interval changed
    if (oldConfig.checkInterval !== this.config.checkInterval && this.checkInterval) {
      this.stop();
      this.start();
    }

    logInfo('Health check configuration updated', { 
      oldConfig, 
      newConfig: this.config 
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): HealthCheckConfig {
    return { ...this.config };
  }

  /**
   * Get registered components
   */
  getRegisteredComponents(): string[] {
    return Array.from(this.components.keys());
  }

  /**
   * Clear old alerts from performance monitor
   */
  clearOldAlerts(): number {
    return this.performanceMonitor.clearOldAlerts(this.config.alertRetention);
  }

  /**
   * Get health summary
   */
  getHealthSummary(): {
    status: HealthStatus;
    uptime: number;
    lastCheck: number | null;
    componentCount: number;
    alertCount: number;
  } {
    const report = this.lastHealthReport;
    
    return {
      status: report?.status || HealthStatus.UNKNOWN,
      uptime: Date.now() - this.startTime,
      lastCheck: report?.timestamp || null,
      componentCount: this.components.size,
      alertCount: report?.alerts.length || 0
    };
  }
}