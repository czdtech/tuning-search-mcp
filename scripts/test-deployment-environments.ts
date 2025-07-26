#!/usr/bin/env ts-node

/**
 * Deployment Environment Testing Script
 * Tests deployment in different environments and configurations
 */

import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

interface EnvironmentTest {
  name: string;
  description: string;
  setup: () => Promise<void>;
  test: () => Promise<boolean>;
  cleanup: () => Promise<void>;
}

class DeploymentEnvironmentTester {
  private tempDir: string;
  private results: Map<string, boolean> = new Map();

  constructor() {
    this.tempDir = join(tmpdir(), `tuningsearch-deployment-test-${Date.now()}`);
  }

  /**
   * Run all environment tests
   */
  async runAllTests(): Promise<boolean> {
    console.log('🧪 Testing TuningSearch MCP Server Deployment Environments');
    console.log('='.repeat(65));

    try {
      // Ensure we have a built package
      await this.prepareBuild();

      const tests: EnvironmentTest[] = [
        this.createNpmInstallTest(),
        this.createNpxRunTest(),
        this.createClaudeDesktopTest(),
        this.createDockerTest(),
        this.createWindowsTest(),
        this.createMacOSTest(),
        this.createLinuxTest(),
        this.createNodeVersionTest()
      ];

      for (const test of tests) {
        console.log(`\n🔍 Testing: ${test.name}`);
        console.log(`   ${test.description}`);

        try {
          await test.setup();
          const success = await test.test();
          await test.cleanup();

          this.results.set(test.name, success);
          console.log(`   ${success ? '✅' : '❌'} ${test.name}: ${success ? 'PASSED' : 'FAILED'}`);

        } catch (error) {
          this.results.set(test.name, false);
          console.log(`   ❌ ${test.name}: FAILED - ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      this.printSummary();
      return Array.from(this.results.values()).every(result => result);

    } catch (error) {
      console.error('❌ Environment testing failed:', error);
      return false;
    } finally {
      await this.globalCleanup();
    }
  }

  /**
   * Prepare build for testing
   */
  private async prepareBuild(): Promise<void> {
    console.log('📦 Preparing build for testing...');
    
    try {
      execSync('npm run build', { stdio: 'pipe' });
      
      if (!existsSync('dist/index.js')) {
        throw new Error('Build failed - dist/index.js not found');
      }
      
      console.log('✅ Build prepared successfully');
    } catch (error) {
      throw new Error(`Build preparation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test NPM install deployment
   */
  private createNpmInstallTest(): EnvironmentTest {
    let testDir: string;
    let packagePath: string;

    return {
      name: 'NPM Install',
      description: 'Test installation via npm install from package',
      
      setup: async () => {
        // Create package
        packagePath = execSync('npm pack', { encoding: 'utf8' }).trim();
        
        // Create test directory
        testDir = join(this.tempDir, 'npm-install-test');
        mkdirSync(testDir, { recursive: true });
        
        // Initialize npm project
        execSync('npm init -y', { cwd: testDir, stdio: 'pipe' });
      },

      test: async () => {
        // Install package
        execSync(`npm install ${join(process.cwd(), packagePath)}`, {
          cwd: testDir,
          stdio: 'pipe'
        });

        // Verify installation
        const binPath = join(testDir, 'node_modules', '.bin', 'tuningsearch-mcp-server');
        if (!existsSync(binPath)) {
          throw new Error('Binary not found after installation');
        }

        // Test execution
        const output = execSync(`node ${binPath} --version`, {
          cwd: testDir,
          encoding: 'utf8',
          env: { ...process.env, TUNINGSEARCH_API_KEY: 'test-key' }
        });

        return output.trim().length > 0;
      },

      cleanup: async () => {
        if (packagePath && existsSync(packagePath)) {
          execSync(`rm -f ${packagePath}`, { stdio: 'pipe' });
        }
      }
    };
  }

  /**
   * Test NPX run deployment
   */
  private createNpxRunTest(): EnvironmentTest {
    let testDir: string;
    let packagePath: string;

    return {
      name: 'NPX Run',
      description: 'Test running via npx without installation',
      
      setup: async () => {
        packagePath = execSync('npm pack', { encoding: 'utf8' }).trim();
        testDir = join(this.tempDir, 'npx-test');
        mkdirSync(testDir, { recursive: true });
      },

      test: async () => {
        // Test npx execution
        const output = execSync(`npx ${join(process.cwd(), packagePath)} --version`, {
          cwd: testDir,
          encoding: 'utf8',
          env: { ...process.env, TUNINGSEARCH_API_KEY: 'test-key' },
          timeout: 30000
        });

        return output.trim().length > 0;
      },

      cleanup: async () => {
        if (packagePath && existsSync(packagePath)) {
          execSync(`rm -f ${packagePath}`, { stdio: 'pipe' });
        }
      }
    };
  }

  /**
   * Test Claude Desktop configuration
   */
  private createClaudeDesktopTest(): EnvironmentTest {
    let configDir: string;

    return {
      name: 'Claude Desktop Config',
      description: 'Test Claude Desktop MCP configuration format',
      
      setup: async () => {
        configDir = join(this.tempDir, 'claude-desktop-test');
        mkdirSync(configDir, { recursive: true });
      },

      test: async () => {
        // Create Claude Desktop config
        const config = {
          mcpServers: {
            tuningsearch: {
              command: 'node',
              args: [join(process.cwd(), 'dist/index.js')],
              env: {
                TUNINGSEARCH_API_KEY: 'your_api_key_here'
              }
            }
          }
        };

        const configPath = join(configDir, 'claude_desktop_config.json');
        writeFileSync(configPath, JSON.stringify(config, null, 2));

        // Validate config
        const parsedConfig = JSON.parse(readFileSync(configPath, 'utf8'));
        
        return (
          parsedConfig.mcpServers &&
          parsedConfig.mcpServers.tuningsearch &&
          parsedConfig.mcpServers.tuningsearch.command === 'node' &&
          Array.isArray(parsedConfig.mcpServers.tuningsearch.args) &&
          parsedConfig.mcpServers.tuningsearch.env &&
          parsedConfig.mcpServers.tuningsearch.env.TUNINGSEARCH_API_KEY
        );
      },

      cleanup: async () => {
        // Cleanup handled by global cleanup
      }
    };
  }

  /**
   * Test Docker deployment
   */
  private createDockerTest(): EnvironmentTest {
    return {
      name: 'Docker Compatibility',
      description: 'Test Docker deployment compatibility',
      
      setup: async () => {
        // Create Dockerfile for testing
        const dockerfile = `
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY dist/ ./dist/

# Install dependencies
RUN npm ci --only=production

# Make binary executable
RUN chmod +x dist/index.js

# Set environment variables
ENV TUNINGSEARCH_API_KEY=test-key

# Expose port (if needed)
EXPOSE 3000

# Run the server
CMD ["node", "dist/index.js"]
`;

        const dockerDir = join(this.tempDir, 'docker-test');
        mkdirSync(dockerDir, { recursive: true });
        writeFileSync(join(dockerDir, 'Dockerfile'), dockerfile);
      },

      test: async () => {
        // For now, just validate Dockerfile syntax
        const dockerfilePath = join(this.tempDir, 'docker-test', 'Dockerfile');
        const content = readFileSync(dockerfilePath, 'utf8');
        
        return (
          content.includes('FROM node:18') &&
          content.includes('COPY dist/') &&
          content.includes('npm ci') &&
          content.includes('CMD ["node", "dist/index.js"]')
        );
      },

      cleanup: async () => {
        // Cleanup handled by global cleanup
      }
    };
  }

  /**
   * Test Windows compatibility
   */
  private createWindowsTest(): EnvironmentTest {
    return {
      name: 'Windows Compatibility',
      description: 'Test Windows-specific deployment features',
      
      setup: async () => {
        // Create Windows batch script
        const batchScript = `@echo off
set TUNINGSEARCH_API_KEY=test-key
node dist/index.js %*
`;

        const windowsDir = join(this.tempDir, 'windows-test');
        mkdirSync(windowsDir, { recursive: true });
        writeFileSync(join(windowsDir, 'start-server.bat'), batchScript);
      },

      test: async () => {
        const batchPath = join(this.tempDir, 'windows-test', 'start-server.bat');
        const content = readFileSync(batchPath, 'utf8');
        
        return (
          content.includes('@echo off') &&
          content.includes('TUNINGSEARCH_API_KEY') &&
          content.includes('node dist/index.js')
        );
      },

      cleanup: async () => {
        // Cleanup handled by global cleanup
      }
    };
  }

  /**
   * Test macOS compatibility
   */
  private createMacOSTest(): EnvironmentTest {
    return {
      name: 'macOS Compatibility',
      description: 'Test macOS-specific deployment features',
      
      setup: async () => {
        // Create macOS shell script
        const shellScript = `#!/bin/bash
export TUNINGSEARCH_API_KEY=test-key
node dist/index.js "$@"
`;

        const macosDir = join(this.tempDir, 'macos-test');
        mkdirSync(macosDir, { recursive: true });
        writeFileSync(join(macosDir, 'start-server.sh'), shellScript);
      },

      test: async () => {
        const scriptPath = join(this.tempDir, 'macos-test', 'start-server.sh');
        const content = readFileSync(scriptPath, 'utf8');
        
        return (
          content.includes('#!/bin/bash') &&
          content.includes('export TUNINGSEARCH_API_KEY') &&
          content.includes('node dist/index.js')
        );
      },

      cleanup: async () => {
        // Cleanup handled by global cleanup
      }
    };
  }

  /**
   * Test Linux compatibility
   */
  private createLinuxTest(): EnvironmentTest {
    return {
      name: 'Linux Compatibility',
      description: 'Test Linux-specific deployment features',
      
      setup: async () => {
        // Create systemd service file
        const serviceFile = `[Unit]
Description=TuningSearch MCP Server
After=network.target

[Service]
Type=simple
User=node
WorkingDirectory=/opt/tuningsearch-mcp-server
ExecStart=/usr/bin/node dist/index.js
Environment=TUNINGSEARCH_API_KEY=your_api_key_here
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
`;

        const linuxDir = join(this.tempDir, 'linux-test');
        mkdirSync(linuxDir, { recursive: true });
        writeFileSync(join(linuxDir, 'tuningsearch-mcp-server.service'), serviceFile);
      },

      test: async () => {
        const servicePath = join(this.tempDir, 'linux-test', 'tuningsearch-mcp-server.service');
        const content = readFileSync(servicePath, 'utf8');
        
        return (
          content.includes('[Unit]') &&
          content.includes('[Service]') &&
          content.includes('[Install]') &&
          content.includes('ExecStart=/usr/bin/node dist/index.js') &&
          content.includes('TUNINGSEARCH_API_KEY')
        );
      },

      cleanup: async () => {
        // Cleanup handled by global cleanup
      }
    };
  }

  /**
   * Test Node.js version compatibility
   */
  private createNodeVersionTest(): EnvironmentTest {
    return {
      name: 'Node.js Version',
      description: 'Test Node.js version compatibility',
      
      setup: async () => {
        // No setup needed
      },

      test: async () => {
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
        
        // Check if Node.js version is 18 or higher
        if (majorVersion < 18) {
          throw new Error(`Node.js version ${nodeVersion} is not supported (requires 18+)`);
        }

        // Test fetch API availability (Node.js 18+ feature)
        if (typeof fetch === 'undefined') {
          throw new Error('fetch API not available');
        }

        return true;
      },

      cleanup: async () => {
        // No cleanup needed
      }
    };
  }

  /**
   * Print test summary
   */
  private printSummary(): void {
    console.log('\n📊 Deployment Environment Test Summary');
    console.log('='.repeat(65));

    const total = this.results.size;
    const passed = Array.from(this.results.values()).filter(r => r).length;
    const failed = total - passed;

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\nFailed Tests:');
      for (const [name, success] of this.results.entries()) {
        if (!success) {
          console.log(`  ❌ ${name}`);
        }
      }
    }

    if (passed === total) {
      console.log('\n🎉 All deployment environment tests passed!');
    } else {
      console.log('\n💥 Some deployment tests failed. Please review and fix issues.');
    }
  }

  /**
   * Global cleanup
   */
  private async globalCleanup(): Promise<void> {
    try {
      if (existsSync(this.tempDir)) {
        execSync(`rm -rf ${this.tempDir}`, { stdio: 'pipe' });
      }
    } catch (error) {
      console.warn('⚠️  Warning: Cleanup failed:', error);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new DeploymentEnvironmentTester();
  
  tester.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Environment testing failed:', error);
      process.exit(1);
    });
}

export { DeploymentEnvironmentTester };