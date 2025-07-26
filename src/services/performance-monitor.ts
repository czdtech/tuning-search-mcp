/**
 * Performance Monitor Service
 * 
 * This service provides performance monitoring and metrics collection
 * for the TuningSearch MCP server operations.
 */

/**
 * Performance metrics for individual operations
 */
export interface OperationMetrics {
  /** Operation name */
  name: string;
  /** Total number of operations */
  count: number;
  /** Total execution time in milliseconds */
  totalTime: number;
  /** Average execution time in milliseconds */
  averageTime: number;
  /** Minimum execution time in milliseconds */
  minTime: number;
  /** Maximum execution time in milliseconds */
  maxTime: number;
  /** Number of successful operations */
  successCount: number;
  /** Number of failed operations */
  failureCount: number;
  /** Success rate (0-1) */
  successRate: number;
  /** Operations per second (based on recent activity) */
  operationsPerSecond: number;
  /** 95th percentile response time */
  p95ResponseTime: number;
  /** 99th percentile response time */
  p99ResponseTime: number;
}

/**
 * System performance metrics
 */
export interface SystemMetrics {
  /** Memory usage information */
  memory: {
    /** Used memory in bytes */
    used: number;
    /** Total memory in bytes */
    total: number;
    /** Memory usage percentage */
    percentage: number;
  };
  /** CPU usage information */
  cpu: {
    /** CPU usage percentage */
    percentage: number;
  };
  /** Uptime in milliseconds */
  uptime: number;
  /** Timestamp when metrics were collected */
  timestamp: number;
}

/**
 * Performance alert configuration
 */
export interface AlertConfig {
  /** Enable performance alerts */
  enabled: boolean;
  /** Response time threshold in milliseconds */
  responseTimeThreshold: number;
  /** Error rate threshold (0-1) */
  errorRateThreshold: number;
  /** Memory usage threshold (0-1) */
  memoryThreshold: number;
  /** Operations per second threshold */
  opsThreshold: number;
}

/**
 * Default alert configuration
 */
export const DEFAULT_ALERT_CONFIG: AlertConfig = {
  enabled: true,
  responseTimeThreshold: 5000, // 5 seconds
  errorRateThreshold: 0.1,     // 10%
  memoryThreshold: 0.8,        // 80%
  opsThreshold: 100            // 100 ops/sec
};

/**
 * Performance alert
 */
export interface PerformanceAlert {
  /** Alert type */
  type: 'response_time' | 'error_rate' | 'memory_usage' | 'high_load';
  /** Alert severity */
  severity: 'warning' | 'critical';
  /** Alert message */
  message: string;
  /** Metric value that triggered the alert */
  value: number;
  /** Threshold that was exceeded */
  threshold: number;
  /** Timestamp when alert was triggered */
  timestamp: number;
  /** Operation name (if applicable) */
  operation?: string;
}

/**
 * Response time bucket for percentile calculations
 */
interface ResponseTimeBucket {
  time: number;
  timestamp: number;
}

/**
 * Performance Monitor Service
 * Tracks and analyzes performance metrics for all operations
 */
export class PerformanceMonitor {
  private metrics = new Map<string, OperationMetrics>();
  private responseTimes = new Map<string, ResponseTimeBucket[]>();
  private alertConfig: AlertConfig;
  private alerts: PerformanceAlert[] = [];
  private startTime: number;
  private maxResponseTimeHistory = 1000; // Keep last 1000 response times for percentiles

  constructor(alertConfig: Partial<AlertConfig> = {}) {
    this.alertConfig = { ...DEFAULT_ALERT_CONFIG, ...alertConfig };
    this.startTime = Date.now();
  }

  /**
   * Start timing an operation
   */
  startOperation(operationName: string): () => void {
    const startTime = Date.now();
    
    return () => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      this.recordOperation(operationName, duration, true);
    };
  }

  /**
   * Record a completed operation
   */
  recordOperation(operationName: string, duration: number, success: boolean = true): void {
    const now = Date.now();
    
    // Get or create metrics for this operation
    let metrics = this.metrics.get(operationName);
    if (!metrics) {
      metrics = {
        name: operationName,
        count: 0,
        totalTime: 0,
        averageTime: 0,
        minTime: Infinity,
        maxTime: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 0,
        operationsPerSecond: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0
      };
      this.metrics.set(operationName, metrics);
    }

    // Update basic metrics
    metrics.count++;
    metrics.totalTime += duration;
    metrics.averageTime = metrics.totalTime / metrics.count;
    metrics.minTime = Math.min(metrics.minTime, duration);
    metrics.maxTime = Math.max(metrics.maxTime, duration);

    if (success) {
      metrics.successCount++;
    } else {
      metrics.failureCount++;
    }
    
    metrics.successRate = metrics.successCount / metrics.count;

    // Store response time for percentile calculations
    let responseTimes = this.responseTimes.get(operationName);
    if (!responseTimes) {
      responseTimes = [];
      this.responseTimes.set(operationName, responseTimes);
    }
    
    responseTimes.push({ time: duration, timestamp: now });
    
    // Keep only recent response times
    if (responseTimes.length > this.maxResponseTimeHistory) {
      responseTimes.shift();
    }

    // Calculate percentiles
    this.updatePercentiles(operationName);

    // Calculate operations per second (based on last minute)
    this.updateOperationsPerSecond(operationName);

    // Check for alerts
    if (this.alertConfig.enabled) {
      this.checkAlerts(operationName, metrics);
    }
  }

  /**
   * Update percentile calculations
   */
  private updatePercentiles(operationName: string): void {
    const responseTimes = this.responseTimes.get(operationName);
    const metrics = this.metrics.get(operationName);
    
    if (!responseTimes || !metrics || responseTimes.length === 0) return;

    const sortedTimes = responseTimes.map(rt => rt.time).sort((a, b) => a - b);
    
    metrics.p95ResponseTime = this.calculatePercentile(sortedTimes, 0.95);
    metrics.p99ResponseTime = this.calculatePercentile(sortedTimes, 0.99);
  }

  /**
   * Calculate percentile value
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, index)] ?? 0;
  }

  /**
   * Update operations per second calculation
   */
  private updateOperationsPerSecond(operationName: string): void {
    const responseTimes = this.responseTimes.get(operationName);
    const metrics = this.metrics.get(operationName);
    
    if (!responseTimes || !metrics) return;

    const now = Date.now();
    const oneMinuteAgo = now - 60000; // 1 minute ago
    
    const recentOperations = responseTimes.filter(rt => rt.timestamp > oneMinuteAgo);
    metrics.operationsPerSecond = recentOperations.length / 60; // per second
  }

  /**
   * Check for performance alerts
   */
  private checkAlerts(operationName: string, metrics: OperationMetrics): void {
    const now = Date.now();

    // Check response time
    if (metrics.averageTime > this.alertConfig.responseTimeThreshold) {
      this.addAlert({
        type: 'response_time',
        severity: metrics.averageTime > this.alertConfig.responseTimeThreshold * 2 ? 'critical' : 'warning',
        message: `High average response time for ${operationName}`,
        value: metrics.averageTime,
        threshold: this.alertConfig.responseTimeThreshold,
        timestamp: now,
        operation: operationName
      });
    }

    // Check error rate
    if (metrics.successRate < (1 - this.alertConfig.errorRateThreshold)) {
      this.addAlert({
        type: 'error_rate',
        severity: metrics.successRate < 0.5 ? 'critical' : 'warning',
        message: `High error rate for ${operationName}`,
        value: 1 - metrics.successRate,
        threshold: this.alertConfig.errorRateThreshold,
        timestamp: now,
        operation: operationName
      });
    }

    // Check high load
    if (metrics.operationsPerSecond > this.alertConfig.opsThreshold) {
      this.addAlert({
        type: 'high_load',
        severity: metrics.operationsPerSecond > this.alertConfig.opsThreshold * 2 ? 'critical' : 'warning',
        message: `High load for ${operationName}`,
        value: metrics.operationsPerSecond,
        threshold: this.alertConfig.opsThreshold,
        timestamp: now,
        operation: operationName
      });
    }
  }

  /**
   * Add performance alert
   */
  private addAlert(alert: PerformanceAlert): void {
    // Avoid duplicate alerts (same type and operation within 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const existingAlert = this.alerts.find(a => 
      a.type === alert.type && 
      a.operation === alert.operation && 
      a.timestamp > fiveMinutesAgo
    );

    if (!existingAlert) {
      this.alerts.push(alert);
      
      // Keep only recent alerts (last 100)
      if (this.alerts.length > 100) {
        this.alerts = this.alerts.slice(-100);
      }
    }
  }

  /**
   * Get metrics for a specific operation
   */
  getOperationMetrics(operationName: string): OperationMetrics | null {
    return this.metrics.get(operationName) || null;
  }

  /**
   * Get metrics for all operations
   */
  getAllMetrics(): OperationMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): SystemMetrics {
    const memoryUsage = process.memoryUsage();
    
    return {
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: memoryUsage.heapUsed / memoryUsage.heapTotal
      },
      cpu: {
        percentage: this.getCpuUsage()
      },
      uptime: Date.now() - this.startTime,
      timestamp: Date.now()
    };
  }

  /**
   * Get CPU usage (simplified estimation)
   */
  private getCpuUsage(): number {
    // This is a simplified CPU usage calculation
    // In production, you might want to use a more sophisticated approach
    const usage = process.cpuUsage();
    const totalUsage = usage.user + usage.system;
    
    // Convert to percentage (rough estimate)
    return Math.min(100, (totalUsage / 1000000) * 100);
  }

  /**
   * Get recent performance alerts
   */
  getAlerts(since?: number): PerformanceAlert[] {
    if (since) {
      return this.alerts.filter(alert => alert.timestamp > since);
    }
    return [...this.alerts];
  }

  /**
   * Clear old alerts
   */
  clearOldAlerts(olderThan: number = 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - olderThan;
    const initialCount = this.alerts.length;
    
    this.alerts = this.alerts.filter(alert => alert.timestamp > cutoff);
    
    return initialCount - this.alerts.length;
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    totalOperations: number;
    averageResponseTime: number;
    overallSuccessRate: number;
    activeAlerts: number;
    systemHealth: 'healthy' | 'warning' | 'critical';
  } {
    const allMetrics = this.getAllMetrics();
    
    const totalOperations = allMetrics.reduce((sum, m) => sum + m.count, 0);
    const totalTime = allMetrics.reduce((sum, m) => sum + m.totalTime, 0);
    const totalSuccesses = allMetrics.reduce((sum, m) => sum + m.successCount, 0);
    
    const averageResponseTime = totalOperations > 0 ? totalTime / totalOperations : 0;
    const overallSuccessRate = totalOperations > 0 ? totalSuccesses / totalOperations : 1;
    
    const recentAlerts = this.getAlerts(Date.now() - 60 * 60 * 1000); // Last hour
    const criticalAlerts = recentAlerts.filter(a => a.severity === 'critical').length;
    const warningAlerts = recentAlerts.filter(a => a.severity === 'warning').length;
    
    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (criticalAlerts > 0) {
      systemHealth = 'critical';
    } else if (warningAlerts > 0) {
      systemHealth = 'warning';
    }

    return {
      totalOperations,
      averageResponseTime,
      overallSuccessRate,
      activeAlerts: recentAlerts.length,
      systemHealth
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.responseTimes.clear();
    this.alerts = [];
    this.startTime = Date.now();
  }

  /**
   * Update alert configuration
   */
  updateAlertConfig(config: Partial<AlertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...config };
  }

  /**
   * Get current alert configuration
   */
  getAlertConfig(): AlertConfig {
    return { ...this.alertConfig };
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics() {
    return {
      operations: this.getAllMetrics(),
      system: this.getSystemMetrics(),
      alerts: this.getAlerts(),
      summary: this.getSummary()
    };
  }
}