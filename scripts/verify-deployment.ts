#!/usr/bin/env ts-node

/**
 * Deployment Verification Script
 * Verifies that the TuningSearch MCP Server can be deployed and runs correctly
 */

import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

interface VerificationResult {
  step: string;
  success: boolean;
  message: string;
  details?: any;
}

class DeploymentVerifier {
  private results: VerificationResult[] = [];
  private tempDir: string;
  private packagePath: string;

  constructor() {
    this.tempDir = join(tmpdir(), `tuningsearch-mcp-verification-${Date.now()}`);
    this.packagePath = '';
  }

  /**
   * Run all deployment verification steps
   */
  async verify(): Promise<boolean> {
    console.log('🚀 Starting TuningSearch MCP Server Deployment Verification');
    console.log('='.repeat(60));

    try {
      await this.verifyBuildProcess();
      await this.verifyPackageCreation();
      await this.verifyNpmPackage();
      await this.verifyLocalInstallation();
      await this.verifyServerStartup();
      await this.verifyMcpCompatibility();
      await this.verifyEnvironmentCompatibility();
      await this.verifyDocumentation();

      this.printResults();
      return this.results.every(result => result.success);

    } catch (error) {
      console.error('❌ Verification failed with error:', error);
      return false;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Verify the build process works correctly
   */
  private async verifyBuildProcess(): Promise<void> {
    console.log('\n📦 Verifying Build Process...');

    try {
      // Clean previous build
      execSync('npm run clean', { stdio: 'pipe' });
      
      // Run build
      execSync('npm run build', { stdio: 'pipe' });

      // Check if dist directory exists
      if (!existsSync('dist')) {
        throw new Error('dist directory not created');
      }

      // Check if main entry point exists
      if (!existsSync('dist/index.js')) {
        throw new Error('Main entry point dist/index.js not found');
      }

      // Check if TypeScript declarations exist
      if (!existsSync('dist/index.d.ts')) {
        throw new Error('TypeScript declarations not found');
      }

      // Verify the built file is executable
      const indexContent = readFileSync('dist/index.js', 'utf8');
      if (!indexContent.includes('#!/usr/bin/env node')) {
        console.warn('⚠️  Warning: dist/index.js may not be executable (missing shebang)');
      }

      this.addResult('Build Process', true, 'Build completed successfully');

    } catch (error) {
      this.addResult('Build Process', false, `Build failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify package creation
   */
  private async verifyPackageCreation(): Promise<void> {
    console.log('\n📦 Verifying Package Creation...');

    try {
      // Create package
      const packOutput = execSync('npm pack', { encoding: 'utf8' });
      const lines = packOutput.split('\n').filter(line => line.trim());
      const packageName = lines[lines.length - 1].trim();
      
      // Look for .tgz file in current directory
      const tgzFiles = execSync('ls *.tgz 2>/dev/null || dir *.tgz 2>nul || echo ""', { encoding: 'utf8' }).trim();
      const actualPackageName = tgzFiles.split('\n')[0].trim() || packageName;
      
      if (!actualPackageName || !existsSync(actualPackageName)) {
        // Try to find any .tgz file
        const allFiles = execSync('ls -la 2>/dev/null || dir 2>nul || echo ""', { encoding: 'utf8' });
        const tgzMatch = allFiles.match(/tuningsearch-mcp-server-[\d.]+\.tgz/);
        if (tgzMatch) {
          this.packagePath = tgzMatch[0];
        } else {
          throw new Error(`Package file not found. Expected: ${packageName}, Actual files: ${allFiles}`);
        }
      } else {
        this.packagePath = actualPackageName;
      }



      // Verify package contents
      const tarOutput = execSync(`tar -tzf ${packageName}`, { encoding: 'utf8' });
      const files = tarOutput.split('\n').filter(f => f.trim());

      const requiredFiles = [
        'package/package.json',
        'package/README.md',
        'package/dist/index.js',
        'package/dist/index.d.ts'
      ];

      for (const requiredFile of requiredFiles) {
        if (!files.some(f => f === requiredFile)) {
          throw new Error(`Required file ${requiredFile} not found in package`);
        }
      }

      this.addResult('Package Creation', true, `Package ${packageName} created successfully with all required files`);

    } catch (error) {
      this.addResult('Package Creation', false, `Package creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify NPM package structure and metadata
   */
  private async verifyNpmPackage(): Promise<void> {
    console.log('\n📋 Verifying NPM Package Structure...');

    try {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

      // Verify required fields
      const requiredFields = ['name', 'version', 'description', 'main', 'bin', 'dependencies'];
      for (const field of requiredFields) {
        if (!packageJson[field]) {
          throw new Error(`Required field '${field}' missing from package.json`);
        }
      }

      // Verify bin configuration
      if (!packageJson.bin['tuningsearch-mcp-server']) {
        throw new Error('Binary entry point not configured correctly');
      }

      // Verify main entry point
      if (packageJson.main !== 'dist/index.js') {
        throw new Error('Main entry point should be dist/index.js');
      }

      // Verify dependencies
      if (!packageJson.dependencies['@modelcontextprotocol/sdk']) {
        throw new Error('MCP SDK dependency missing');
      }

      // Verify engines
      if (!packageJson.engines || !packageJson.engines.node) {
        console.warn('⚠️  Warning: Node.js engine version not specified');
      }

      this.addResult('NPM Package Structure', true, 'Package structure and metadata verified');

    } catch (error) {
      this.addResult('NPM Package Structure', false, `Package verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify local installation works
   */
  private async verifyLocalInstallation(): Promise<void> {
    console.log('\n💾 Verifying Local Installation...');

    try {
      if (!this.packagePath) {
        throw new Error('No package available for installation');
      }

      // Create temporary directory
      execSync(`mkdir -p ${this.tempDir}`, { stdio: 'pipe' });
      
      // Initialize npm project
      execSync('npm init -y', { cwd: this.tempDir, stdio: 'pipe' });

      // Install the package
      execSync(`npm install ${join(process.cwd(), this.packagePath)}`, { 
        cwd: this.tempDir, 
        stdio: 'pipe' 
      });

      // Verify installation
      const nodeModulesPath = join(this.tempDir, 'node_modules', 'tuningsearch-mcp-server');
      if (!existsSync(nodeModulesPath)) {
        throw new Error('Package not installed in node_modules');
      }

      // Verify binary is available
      const binPath = join(this.tempDir, 'node_modules', '.bin', 'tuningsearch-mcp-server');
      if (!existsSync(binPath)) {
        throw new Error('Binary not available in .bin directory');
      }

      this.addResult('Local Installation', true, 'Package installed successfully');

    } catch (error) {
      this.addResult('Local Installation', false, `Installation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify server startup
   */
  private async verifyServerStartup(): Promise<void> {
    console.log('\n🚀 Verifying Server Startup...');

    try {
      // Set test environment
      const testEnv = {
        ...process.env,
        TUNINGSEARCH_API_KEY: 'test-api-key-for-verification',
        TUNINGSEARCH_LOG_LEVEL: 'ERROR'
      };

      // Try to start server with --help flag
      const helpOutput = execSync('node dist/index.js --help', { 
        encoding: 'utf8',
        env: testEnv,
        timeout: 5000
      });

      if (!helpOutput.includes('TuningSearch MCP Server')) {
        throw new Error('Help output does not contain expected content');
      }

      // Try to start server with --version flag
      const versionOutput = execSync('node dist/index.js --version', { 
        encoding: 'utf8',
        env: testEnv,
        timeout: 5000
      });

      if (!versionOutput.trim()) {
        throw new Error('Version output is empty');
      }

      this.addResult('Server Startup', true, 'Server startup verification completed');

    } catch (error) {
      this.addResult('Server Startup', false, `Server startup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify MCP compatibility
   */
  private async verifyMcpCompatibility(): Promise<void> {
    console.log('\n🔌 Verifying MCP Compatibility...');

    try {
      // Create test MCP configuration
      const mcpConfig = {
        mcpServers: {
          tuningsearch: {
            command: 'node',
            args: [join(process.cwd(), 'dist/index.js')],
            env: {
              TUNINGSEARCH_API_KEY: 'test-api-key-for-verification'
            }
          }
        }
      };

      // Ensure temp directory exists
      execSync(`mkdir -p ${this.tempDir}`, { stdio: 'pipe' });
      
      const configPath = join(this.tempDir, 'mcp-config.json');
      writeFileSync(configPath, JSON.stringify(mcpConfig, null, 2));

      // Verify configuration is valid JSON
      const parsedConfig = JSON.parse(readFileSync(configPath, 'utf8'));
      if (!parsedConfig.mcpServers.tuningsearch) {
        throw new Error('MCP configuration is invalid');
      }

      this.addResult('MCP Compatibility', true, 'MCP configuration format verified');

    } catch (error) {
      this.addResult('MCP Compatibility', false, `MCP compatibility check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify environment compatibility
   */
  private async verifyEnvironmentCompatibility(): Promise<void> {
    console.log('\n🌍 Verifying Environment Compatibility...');

    try {
      const results = [];

      // Check Node.js version
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      
      if (majorVersion >= 18) {
        results.push('✅ Node.js version compatible');
      } else {
        results.push('❌ Node.js version too old (requires 18+)');
      }

      // Check npm version
      try {
        const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
        results.push(`✅ npm version: ${npmVersion}`);
      } catch {
        results.push('❌ npm not available');
      }

      // Check platform compatibility
      const platform = process.platform;
      const supportedPlatforms = ['win32', 'darwin', 'linux'];
      
      if (supportedPlatforms.includes(platform)) {
        results.push(`✅ Platform ${platform} supported`);
      } else {
        results.push(`⚠️  Platform ${platform} not explicitly supported`);
      }

      // Check architecture
      const arch = process.arch;
      const supportedArchs = ['x64', 'arm64'];
      
      if (supportedArchs.includes(arch)) {
        results.push(`✅ Architecture ${arch} supported`);
      } else {
        results.push(`⚠️  Architecture ${arch} not explicitly supported`);
      }

      const hasErrors = results.some(r => r.includes('❌'));
      
      this.addResult('Environment Compatibility', !hasErrors, results.join('\n'));

    } catch (error) {
      this.addResult('Environment Compatibility', false, `Environment check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify documentation completeness
   */
  private async verifyDocumentation(): Promise<void> {
    console.log('\n📚 Verifying Documentation...');

    try {
      const requiredDocs = [
        { file: 'README.md', description: 'Main documentation' },
        { file: 'examples/deployment/README.md', description: 'Deployment examples' },
        { file: 'examples/mcp-clients/README.md', description: 'MCP client examples' }
      ];

      const results = [];

      for (const doc of requiredDocs) {
        if (existsSync(doc.file)) {
          const content = readFileSync(doc.file, 'utf8');
          
          if (content.length < 100) {
            results.push(`⚠️  ${doc.description} exists but seems incomplete`);
          } else {
            results.push(`✅ ${doc.description} exists and has content`);
          }
        } else {
          results.push(`❌ ${doc.description} missing`);
        }
      }

      // Check for installation instructions
      const readmeContent = existsSync('README.md') ? readFileSync('README.md', 'utf8') : '';
      
      if (readmeContent.includes('npm install')) {
        results.push('✅ Installation instructions found');
      } else {
        results.push('⚠️  Installation instructions may be missing');
      }

      // Check for configuration examples
      if (readmeContent.includes('TUNINGSEARCH_API_KEY')) {
        results.push('✅ Configuration examples found');
      } else {
        results.push('⚠️  Configuration examples may be missing');
      }

      const hasErrors = results.some(r => r.includes('❌'));
      
      this.addResult('Documentation', !hasErrors, results.join('\n'));

    } catch (error) {
      this.addResult('Documentation', false, `Documentation check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add verification result
   */
  private addResult(step: string, success: boolean, message: string, details?: any): void {
    this.results.push({ step, success, message, details });
    
    const icon = success ? '✅' : '❌';
    console.log(`${icon} ${step}: ${message}`);
    
    if (details) {
      console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
    }
  }

  /**
   * Print final results
   */
  private printResults(): void {
    console.log('\n📊 Verification Results');
    console.log('='.repeat(60));

    const successful = this.results.filter(r => r.success).length;
    const total = this.results.length;

    console.log(`Total Steps: ${total}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${total - successful}`);
    console.log(`Success Rate: ${((successful / total) * 100).toFixed(1)}%`);

    if (successful === total) {
      console.log('\n🎉 All verification steps passed! Deployment is ready.');
    } else {
      console.log('\n💥 Some verification steps failed. Please review and fix issues.');
      
      console.log('\nFailed Steps:');
      this.results
        .filter(r => !r.success)
        .forEach(r => console.log(`  - ${r.step}: ${r.message}`));
    }
  }

  /**
   * Cleanup temporary files
   */
  private async cleanup(): Promise<void> {
    try {
      if (this.packagePath && existsSync(this.packagePath)) {
        execSync(`rm -f ${this.packagePath}`, { stdio: 'pipe' });
      }
      
      if (existsSync(this.tempDir)) {
        execSync(`rm -rf ${this.tempDir}`, { stdio: 'pipe' });
      }
    } catch (error) {
      console.warn('⚠️  Warning: Cleanup failed:', error);
    }
  }
}

// Run verification if called directly
if (require.main === module) {
  const verifier = new DeploymentVerifier();
  
  verifier.verify()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Verification failed:', error);
      process.exit(1);
    });
}

export { DeploymentVerifier };