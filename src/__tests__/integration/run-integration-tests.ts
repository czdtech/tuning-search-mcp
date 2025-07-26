/**
 * Integration Test Runner
 * Script to run integration tests with proper setup and teardown
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

interface TestSuite {
  name: string;
  file: string;
  description: string;
  timeout?: number;
}

const integrationTestSuites: TestSuite[] = [
  {
    name: 'MCP Protocol Integration',
    file: 'mcp-protocol.test.ts',
    description: 'Tests MCP protocol compliance and tool interactions',
    timeout: 30000
  },
  {
    name: 'API Integration',
    file: 'api-integration.test.ts', 
    description: 'Tests real API calls and various search scenarios',
    timeout: 60000
  },
  {
    name: 'End-to-End Integration',
    file: 'end-to-end.test.ts',
    description: 'Tests complete workflows from MCP to API',
    timeout: 90000
  },
  {
    name: 'MCP Client Compatibility',
    file: 'mcp-client-compatibility.test.ts',
    description: 'Tests compatibility with different MCP clients and environments',
    timeout: 120000
  },
  {
    name: 'Performance and Stability',
    file: 'performance-stability.test.ts',
    description: 'Tests system performance under load and stability over time',
    timeout: 180000
  }
];

/**
 * Run integration tests with proper environment setup
 */
async function runIntegrationTests() {
  console.log('🚀 Starting Integration Tests');
  console.log('================================');

  // Verify test environment
  if (!process.env.TUNINGSEARCH_API_KEY) {
    console.warn('⚠️  TUNINGSEARCH_API_KEY not set - using test key');
    process.env.TUNINGSEARCH_API_KEY = 'test-api-key';
  }

  // Set test-specific environment variables
  process.env.NODE_ENV = 'test';
  process.env.TUNINGSEARCH_BASE_URL = 'https://api.test.tuningsearch.com/v1';
  process.env.TUNINGSEARCH_TIMEOUT = '10000';
  process.env.TUNINGSEARCH_RETRY_ATTEMPTS = '2';
  process.env.TUNINGSEARCH_RETRY_DELAY = '500';
  process.env.TUNINGSEARCH_LOG_LEVEL = 'ERROR'; // Reduce log noise during tests

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  const failedSuites: string[] = [];

  for (const suite of integrationTestSuites) {
    console.log(`\n📋 Running: ${suite.name}`);
    console.log(`   ${suite.description}`);
    console.log(`   File: ${suite.file}`);
    
    const testFilePath = path.join(__dirname, suite.file);
    
    if (!existsSync(testFilePath)) {
      console.error(`❌ Test file not found: ${testFilePath}`);
      failedTests++;
      failedSuites.push(suite.name);
      continue;
    }

    try {
      const startTime = Date.now();
      
      // Run the specific test file
      const command = `npx jest "src/__tests__/integration/${suite.file}" --verbose --detectOpenHandles --forceExit`;
      const timeout = suite.timeout || 30000;
      
      console.log(`   ⏳ Running tests (timeout: ${timeout}ms)...`);
      
      execSync(command, {
        stdio: 'inherit',
        timeout: timeout,
        env: { ...process.env }
      });
      
      const duration = Date.now() - startTime;
      console.log(`   ✅ ${suite.name} passed (${duration}ms)`);
      passedTests++;
      
    } catch (error) {
      console.error(`   ❌ ${suite.name} failed`);
      if (error instanceof Error) {
        console.error(`   Error: ${error.message}`);
      }
      failedTests++;
      failedSuites.push(suite.name);
    }
    
    totalTests++;
  }

  // Print summary
  console.log('\n📊 Integration Test Summary');
  console.log('============================');
  console.log(`Total Test Suites: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  
  if (failedSuites.length > 0) {
    console.log('\n❌ Failed Test Suites:');
    failedSuites.forEach(suite => console.log(`   - ${suite}`));
  }

  if (failedTests === 0) {
    console.log('\n🎉 All integration tests passed!');
    process.exit(0);
  } else {
    console.log('\n💥 Some integration tests failed!');
    process.exit(1);
  }
}

/**
 * Run specific test suite
 */
async function runSpecificSuite(suiteName: string) {
  const suite = integrationTestSuites.find(s => 
    s.name.toLowerCase().includes(suiteName.toLowerCase()) ||
    s.file.toLowerCase().includes(suiteName.toLowerCase())
  );

  if (!suite) {
    console.error(`❌ Test suite not found: ${suiteName}`);
    console.log('\nAvailable test suites:');
    integrationTestSuites.forEach(s => console.log(`   - ${s.name} (${s.file})`));
    process.exit(1);
  }

  console.log(`🚀 Running specific test suite: ${suite.name}`);
  
  const testFilePath = path.join(__dirname, suite.file);
  const command = `npx jest "${testFilePath}" --verbose --detectOpenHandles --forceExit`;
  
  try {
    execSync(command, {
      stdio: 'inherit',
      timeout: suite.timeout || 30000,
      env: { ...process.env }
    });
    console.log(`✅ ${suite.name} completed successfully`);
  } catch (error) {
    console.error(`❌ ${suite.name} failed`);
    process.exit(1);
  }
}

/**
 * Show help information
 */
function showHelp() {
  console.log('Integration Test Runner');
  console.log('======================');
  console.log('');
  console.log('Usage:');
  console.log('  npm run test:integration              # Run all integration tests');
  console.log('  npm run test:integration -- --suite <name>  # Run specific test suite');
  console.log('  npm run test:integration -- --help          # Show this help');
  console.log('');
  console.log('Available test suites:');
  integrationTestSuites.forEach(suite => {
    console.log(`  ${suite.name}`);
    console.log(`    File: ${suite.file}`);
    console.log(`    Description: ${suite.description}`);
    console.log('');
  });
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    showHelp();
  } else if (args.includes('--suite')) {
    const suiteIndex = args.indexOf('--suite');
    const suiteName = args[suiteIndex + 1];
    
    if (!suiteName) {
      console.error('❌ Please specify a test suite name');
      showHelp();
      process.exit(1);
    }
    
    runSpecificSuite(suiteName);
  } else {
    runIntegrationTests();
  }
}

export { runIntegrationTests, runSpecificSuite, integrationTestSuites };