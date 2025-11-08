/**
 * Unit tests for PerformanceMonitor
 */

import { PerformanceMonitor, DEFAULT_ALERT_CONFIG } from '../services/performance-monitor';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  describe('constructor', () => {
    it('should initialize with default alert configuration', () => {
      const config = monitor.getAlertConfig();
      expect(config).toEqual(DEFAULT_ALERT_CONFIG);
    });

    it('should merge custom alert configuration with defaults', () => {
      const customConfig = { responseTimeThreshold: 10000, errorRateThreshold: 0.2 };
      const customMonitor = new PerformanceMonitor(customConfig);
      const config = customMonitor.getAlertConfig();

      expect(config.responseTimeThreshold).toBe(10000);
      expect(config.errorRateThreshold).toBe(0.2);
      expect(config.memoryThreshold).toBe(DEFAULT_ALERT_CONFIG.memoryThreshold);
    });
  });

  describe('operation recording', () => {
    it('should record successful operations', () => {
      monitor.recordOperation('test_operation', 100, true);

      const metrics = monitor.getOperationMetrics('test_operation');
      expect(metrics).toBeTruthy();
      expect(metrics!.name).toBe('test_operation');
      expect(metrics!.count).toBe(1);
      expect(metrics!.totalTime).toBe(100);
      expect(metrics!.averageTime).toBe(100);
      expect(metrics!.minTime).toBe(100);
      expect(metrics!.maxTime).toBe(100);
      expect(metrics!.successCount).toBe(1);
      expect(metrics!.failureCount).toBe(0);
      expect(metrics!.successRate).toBe(1);
    });

    it('should record failed operations', () => {
      monitor.recordOperation('test_operation', 200, false);

      const metrics = monitor.getOperationMetrics('test_operation');
      expect(metrics!.successCount).toBe(0);
      expect(metrics!.failureCount).toBe(1);
      expect(metrics!.successRate).toBe(0);
    });

    it('should calculate correct averages for multiple operations', () => {
      monitor.recordOperation('test_operation', 100, true);
      monitor.recordOperation('test_operation', 200, true);
      monitor.recordOperation('test_operation', 300, false);

      const metrics = monitor.getOperationMetrics('test_operation');
      expect(metrics!.count).toBe(3);
      expect(metrics!.totalTime).toBe(600);
      expect(metrics!.averageTime).toBe(200);
      expect(metrics!.minTime).toBe(100);
      expect(metrics!.maxTime).toBe(300);
      expect(metrics!.successCount).toBe(2);
      expect(metrics!.failureCount).toBe(1);
      expect(metrics!.successRate).toBeCloseTo(2/3);
    });

    it('should track multiple different operations', () => {
      monitor.recordOperation('search', 100, true);
      monitor.recordOperation('crawl', 200, true);

      const searchMetrics = monitor.getOperationMetrics('search');
      const crawlMetrics = monitor.getOperationMetrics('crawl');

      expect(searchMetrics!.name).toBe('search');
      expect(crawlMetrics!.name).toBe('crawl');
      expect(searchMetrics!.averageTime).toBe(100);
      expect(crawlMetrics!.averageTime).toBe(200);
    });
  });

  describe('timer functionality', () => {
    it('should provide timer function for measuring operations', (done) => {
      const stopTimer = monitor.startOperation('timed_operation');

      setTimeout(() => {
        stopTimer();

        const metrics = monitor.getOperationMetrics('timed_operation');
        expect(metrics).toBeTruthy();
        expect(metrics!.count).toBe(1);
        expect(metrics!.averageTime).toBeGreaterThan(0);
        expect(metrics!.successCount).toBe(1);

        done();
      }, 10);
    });
  });

  describe('percentile calculations', () => {
    it('should calculate percentiles correctly', () => {
      // Add multiple operations with different response times
      const responseTimes = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500];

      responseTimes.forEach(time => {
        monitor.recordOperation('percentile_test', time, true);
      });

      const metrics = monitor.getOperationMetrics('percentile_test');
      expect(metrics!.p95ResponseTime).toBeGreaterThan(metrics!.averageTime);
      expect(metrics!.p99ResponseTime).toBeGreaterThanOrEqual(metrics!.p95ResponseTime);
    });
  });

  describe('operations per second calculation', () => {
    it('should calculate operations per second', (done) => {
      // Record several operations quickly
      for (let i = 0; i < 5; i++) {
        monitor.recordOperation('ops_test', 100, true);
      }

      setTimeout(() => {
        const metrics = monitor.getOperationMetrics('ops_test');
        expect(metrics!.operationsPerSecond).toBeGreaterThan(0);
        done();
      }, 100);
    });
  });

  describe('alert generation', () => {
    it('should generate response time alerts', () => {
      const alertMonitor = new PerformanceMonitor({ responseTimeThreshold: 50 });

      // Record operation that exceeds threshold
      alertMonitor.recordOperation('slow_operation', 100, true);

      const alerts = alertMonitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);

      const responseTimeAlert = alerts.find(a => a.type === 'response_time');
      expect(responseTimeAlert).toBeTruthy();
      expect(responseTimeAlert!.operation).toBe('slow_operation');
      expect(responseTimeAlert!.value).toBe(100);
      expect(responseTimeAlert!.threshold).toBe(50);
    });

    it('should generate error rate alerts', () => {
      const alertMonitor = new PerformanceMonitor({ errorRateThreshold: 0.2 });

      // Create high error rate (3 failures out of 4 operations = 75% error rate)
      alertMonitor.recordOperation('error_operation', 100, true);
      alertMonitor.recordOperation('error_operation', 100, false);
      alertMonitor.recordOperation('error_operation', 100, false);
      alertMonitor.recordOperation('error_operation', 100, false);

      const alerts = alertMonitor.getAlerts();
      const errorRateAlert = alerts.find(a => a.type === 'error_rate');
      expect(errorRateAlert).toBeTruthy();
      expect(errorRateAlert!.operation).toBe('error_operation');
    });

    it('should not generate duplicate alerts within time window', () => {
      const alertMonitor = new PerformanceMonitor({ responseTimeThreshold: 50 });

      // Record multiple slow operations
      alertMonitor.recordOperation('slow_operation', 100, true);
      alertMonitor.recordOperation('slow_operation', 100, true);
      alertMonitor.recordOperation('slow_operation', 100, true);

      const alerts = alertMonitor.getAlerts();
      const responseTimeAlerts = alerts.filter(a => a.type === 'response_time' && a.operation === 'slow_operation');

      // Should only have one alert despite multiple slow operations
      expect(responseTimeAlerts.length).toBe(1);
    });

    it('should clear old alerts', () => {
      monitor.recordOperation('test_operation', 100, true);

      // Manually add an old alert
      const oldAlert = {
        type: 'response_time' as const,
        severity: 'warning' as const,
        message: 'Old alert',
        value: 100,
        threshold: 50,
        timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
        operation: 'test_operation'
      };

      (monitor as any).alerts.push(oldAlert);

      const clearedCount = monitor.clearOldAlerts(24 * 60 * 60 * 1000); // Clear alerts older than 24 hours
      expect(clearedCount).toBe(1);
    });
  });

  describe('system metrics', () => {
    it('should provide system metrics', () => {
      const systemMetrics = monitor.getSystemMetrics();

      expect(systemMetrics.memory).toBeTruthy();
      expect(systemMetrics.memory.used).toBeGreaterThan(0);
      expect(systemMetrics.memory.total).toBeGreaterThan(0);
      expect(systemMetrics.memory.percentage).toBeGreaterThanOrEqual(0);
      expect(systemMetrics.memory.percentage).toBeLessThanOrEqual(1);

      expect(systemMetrics.cpu).toBeTruthy();
      expect(systemMetrics.cpu.percentage).toBeGreaterThanOrEqual(0);

      expect(systemMetrics.uptime).toBeGreaterThanOrEqual(0);
      expect(systemMetrics.timestamp).toBeGreaterThan(0);
    });
  });

  describe('performance summary', () => {
    it('should provide performance summary', () => {
      monitor.recordOperation('operation1', 100, true);
      monitor.recordOperation('operation1', 200, true);
      monitor.recordOperation('operation2', 150, false);

      const summary = monitor.getSummary();

      expect(summary.totalOperations).toBe(3);
      expect(summary.averageResponseTime).toBeCloseTo(150);
      expect(summary.overallSuccessRate).toBeCloseTo(2/3);
      expect(summary.activeAlerts).toBeGreaterThanOrEqual(0);
      expect(['healthy', 'warning', 'critical']).toContain(summary.systemHealth);
    });
  });

  describe('metrics export', () => {
    it('should export all metrics', () => {
      monitor.recordOperation('test_operation', 100, true);

      const exported = monitor.exportMetrics();

      expect(exported.operations).toHaveLength(1);
      expect(exported.operations[0]!.name).toBe('test_operation');
      expect(exported.system).toBeTruthy();
      expect(exported.alerts).toBeTruthy();
      expect(exported.summary).toBeTruthy();
    });
  });

  describe('configuration updates', () => {
    it('should update alert configuration', () => {
      const newConfig = { responseTimeThreshold: 1000, errorRateThreshold: 0.5 };

      monitor.updateAlertConfig(newConfig);
      const config = monitor.getAlertConfig();

      expect(config.responseTimeThreshold).toBe(1000);
      expect(config.errorRateThreshold).toBe(0.5);
      expect(config.memoryThreshold).toBe(DEFAULT_ALERT_CONFIG.memoryThreshold);
    });
  });

  describe('reset functionality', () => {
    it('should reset all metrics and alerts', () => {
      monitor.recordOperation('test_operation', 100, true);

      expect(monitor.getAllMetrics()).toHaveLength(1);

      monitor.reset();

      expect(monitor.getAllMetrics()).toHaveLength(0);
      expect(monitor.getAlerts()).toHaveLength(0);
    });
  });
});
