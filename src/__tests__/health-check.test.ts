/**
 * Tests for the Health Check Service
 */

import { HealthCheckService, HealthStatus, DEFAULT_HEALTH_CONFIG } from '../services/health-check.js';
import { PerformanceMonitor } from '../services/performance-monitor.js';

// Mock logger
jest.mock('../services/logger.js', () => ({
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
  logDebug: jest.fn()
}));

describe('HealthCheckService', () => {
  let performanceMonitor: PerformanceMonitor;
  let healthCheckService: HealthCheckService;

  beforeEach(() => {
    performanceMonitor = new PerformanceMonitor();
    healthCheckService = new HealthCheckService(performanceMonitor);
  });

  afterEach(() => {
    healthCheckService.stop();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const config = healthCheckService.getConfig();
      expect(config).toEqual(DEFAULT_HEALTH_CONFIG);
    });

    it('should merge custom configuration with defaults', () => {
      const customConfig = { checkInterval: 60000, componentTimeout: 10000 };
      const customService = new HealthCheckService(performanceMonitor, customConfig);
      const config = customService.getConfig();
      
      expect(config.checkInterval).toBe(60000);
      expect(config.componentTimeout).toBe(10000);
      expect(config.enabled).toBe(DEFAULT_HEALTH_CONFIG.enabled);
    });
  });

  describe('component registration', () => {
    it('should register health check components', () => {
      const healthCheck = jest.fn().mockResolvedValue({
        name: 'test-component',
        status: HealthStatus.HEALTHY,
        message: 'Component is healthy',
        lastChecked: Date.now()
      });

      healthCheckService.registerComponent('test-component', healthCheck);
      
      const components = healthCheckService.getRegisteredComponents();
      expect(components).toContain('test-component');
    });

    it('should unregister health check components', () => {
      const healthCheck = jest.fn();
      
      healthCheckService.registerComponent('test-component', healthCheck);
      expect(healthCheckService.getRegisteredComponents()).toContain('test-component');
      
      healthCheckService.unregisterComponent('test-component');
      expect(healthCheckService.getRegisteredComponents()).not.toContain('test-component');
    });
  });

  describe('health checks', () => {
    it('should perform health check for registered components', async () => {
      const healthyComponent = jest.fn().mockResolvedValue({
        name: 'healthy-component',
        status: HealthStatus.HEALTHY,
        message: 'All good',
        lastChecked: Date.now()
      });

      const warningComponent = jest.fn().mockResolvedValue({
        name: 'warning-component',
        status: HealthStatus.WARNING,
        message: 'Some issues',
        lastChecked: Date.now()
      });

      healthCheckService.registerComponent('healthy-component', healthyComponent);
      healthCheckService.registerComponent('warning-component', warningComponent);

      const report = await healthCheckService.performHealthCheck();

      expect(report.status).toBe(HealthStatus.WARNING);
      expect(report.components).toHaveLength(2);
      expect(report.summary.healthyComponents).toBe(1);
      expect(report.summary.warningComponents).toBe(1);
      expect(report.summary.criticalComponents).toBe(0);
    });

    it('should handle component health check failures', async () => {
      const failingComponent = jest.fn().mockRejectedValue(new Error('Component failed'));

      healthCheckService.registerComponent('failing-component', failingComponent);

      const report = await healthCheckService.performHealthCheck();

      expect(report.status).toBe(HealthStatus.CRITICAL);
      expect(report.components).toHaveLength(1);
      expect(report.components[0].status).toBe(HealthStatus.CRITICAL);
      expect(report.components[0].message).toContain('Health check failed');
    });

    it('should handle component timeouts', async () => {
      const slowComponent = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 10000)) // 10 second delay
      );

      const fastService = new HealthCheckService(performanceMonitor, { componentTimeout: 100 });
      fastService.registerComponent('slow-component', slowComponent);

      const report = await fastService.performHealthCheck();

      expect(report.components).toHaveLength(1);
      expect(report.components[0].status).toBe(HealthStatus.CRITICAL);
      expect(report.components[0].message).toContain('timeout');
    });

    it('should get individual component health', async () => {
      const healthCheck = jest.fn().mockResolvedValue({
        name: 'test-component',
        status: HealthStatus.HEALTHY,
        message: 'Component is healthy',
        lastChecked: Date.now()
      });

      healthCheckService.registerComponent('test-component', healthCheck);

      const componentHealth = await healthCheckService.getComponentHealth('test-component');

      expect(componentHealth).toBeTruthy();
      expect(componentHealth!.name).toBe('test-component');
      expect(componentHealth!.status).toBe(HealthStatus.HEALTHY);
    });

    it('should return null for non-existent component', async () => {
      const componentHealth = await healthCheckService.getComponentHealth('non-existent');
      expect(componentHealth).toBeNull();
    });
  });

  describe('overall status calculation', () => {
    it('should return HEALTHY when all components are healthy', async () => {
      const healthyComponent1 = jest.fn().mockResolvedValue({
        name: 'component1',
        status: HealthStatus.HEALTHY,
        message: 'OK',
        lastChecked: Date.now()
      });

      const healthyComponent2 = jest.fn().mockResolvedValue({
        name: 'component2',
        status: HealthStatus.HEALTHY,
        message: 'OK',
        lastChecked: Date.now()
      });

      healthCheckService.registerComponent('component1', healthyComponent1);
      healthCheckService.registerComponent('component2', healthyComponent2);

      const report = await healthCheckService.performHealthCheck();
      expect(report.status).toBe(HealthStatus.HEALTHY);
    });

    it('should return WARNING when any component has warning status', async () => {
      const healthyComponent = jest.fn().mockResolvedValue({
        name: 'healthy',
        status: HealthStatus.HEALTHY,
        message: 'OK',
        lastChecked: Date.now()
      });

      const warningComponent = jest.fn().mockResolvedValue({
        name: 'warning',
        status: HealthStatus.WARNING,
        message: 'Issues detected',
        lastChecked: Date.now()
      });

      healthCheckService.registerComponent('healthy', healthyComponent);
      healthCheckService.registerComponent('warning', warningComponent);

      const report = await healthCheckService.performHealthCheck();
      expect(report.status).toBe(HealthStatus.WARNING);
    });

    it('should return CRITICAL when any component is critical', async () => {
      const healthyComponent = jest.fn().mockResolvedValue({
        name: 'healthy',
        status: HealthStatus.HEALTHY,
        message: 'OK',
        lastChecked: Date.now()
      });

      const criticalComponent = jest.fn().mockResolvedValue({
        name: 'critical',
        status: HealthStatus.CRITICAL,
        message: 'System failure',
        lastChecked: Date.now()
      });

      healthCheckService.registerComponent('healthy', healthyComponent);
      healthCheckService.registerComponent('critical', criticalComponent);

      const report = await healthCheckService.performHealthCheck();
      expect(report.status).toBe(HealthStatus.CRITICAL);
    });

    it('should return UNKNOWN when no components are registered', async () => {
      const report = await healthCheckService.performHealthCheck();
      expect(report.status).toBe(HealthStatus.UNKNOWN);
    });
  });

  describe('periodic health checks', () => {
    it('should start and stop periodic health checks', (done) => {
      const healthCheck = jest.fn().mockResolvedValue({
        name: 'test',
        status: HealthStatus.HEALTHY,
        message: 'OK',
        lastChecked: Date.now()
      });

      const fastService = new HealthCheckService(performanceMonitor, { checkInterval: 50 });
      fastService.registerComponent('test', healthCheck);

      fastService.start();

      setTimeout(() => {
        expect(healthCheck).toHaveBeenCalled();
        fastService.stop();
        done();
      }, 100);
    });

    it('should not start if disabled', () => {
      const disabledService = new HealthCheckService(performanceMonitor, { enabled: false });
      disabledService.start();
      
      // Should not throw or create interval
      expect(() => disabledService.stop()).not.toThrow();
    });
  });

  describe('configuration updates', () => {
    it('should update configuration', () => {
      const newConfig = { checkInterval: 60000, componentTimeout: 10000 };
      
      healthCheckService.updateConfig(newConfig);
      const config = healthCheckService.getConfig();
      
      expect(config.checkInterval).toBe(60000);
      expect(config.componentTimeout).toBe(10000);
    });
  });

  describe('health summary', () => {
    it('should provide health summary', () => {
      const summary = healthCheckService.getHealthSummary();
      
      expect(summary.status).toBe(HealthStatus.UNKNOWN);
      expect(summary.uptime).toBeGreaterThanOrEqual(0);
      expect(summary.lastCheck).toBeNull();
      expect(summary.componentCount).toBe(0);
      expect(summary.alertCount).toBe(0);
    });

    it('should provide accurate summary after health check', async () => {
      const healthCheck = jest.fn().mockResolvedValue({
        name: 'test',
        status: HealthStatus.HEALTHY,
        message: 'OK',
        lastChecked: Date.now()
      });

      healthCheckService.registerComponent('test', healthCheck);
      await healthCheckService.performHealthCheck();

      const summary = healthCheckService.getHealthSummary();
      
      expect(summary.status).toBe(HealthStatus.HEALTHY);
      expect(summary.lastCheck).toBeGreaterThan(0);
      expect(summary.componentCount).toBe(1);
    });
  });

  describe('integration with performance monitor', () => {
    it('should include performance metrics in health report', async () => {
      // Record some performance data
      performanceMonitor.recordOperation('test_operation', 100, true);

      const report = await healthCheckService.performHealthCheck();

      expect(report.metrics.system).toBeTruthy();
      expect(report.metrics.performance).toBeTruthy();
      expect(report.metrics.performance.operations).toHaveLength(1);
    });

    it('should consider performance alerts in overall status', async () => {
      // Create a monitor with low thresholds to trigger alerts
      const alertMonitor = new PerformanceMonitor({ responseTimeThreshold: 50 });
      const alertService = new HealthCheckService(alertMonitor);

      // Record slow operation to trigger alert
      alertMonitor.recordOperation('slow_operation', 100, true);

      const report = await alertService.performHealthCheck();

      expect(report.alerts.length).toBeGreaterThan(0);
      expect(report.status).toBe(HealthStatus.WARNING);
    });
  });
});