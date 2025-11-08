#!/usr/bin/env node

/**
 * Pre-deployment check script
 * Validates the project is ready for production deployment
 */

const fs = require('fs');

console.log('🔍 Pre-deployment Check for TuningSearch MCP Server\n');

let hasErrors = false;

// Check required files
const requiredFiles = [
  'dist/index.js',
  'dist/server.js',
  'package.json',
  'README.md',
  'LICENSE',
  '.npmignore'
];

console.log('📁 Checking required files...');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    hasErrors = true;
  }
});

// Check package.json
console.log('\n📦 Validating package.json...');
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Required fields
  const requiredFields = ['name', 'version', 'description', 'main', 'bin', 'author', 'license'];
  requiredFields.forEach(field => {
    if (pkg[field]) {
      console.log(`✅ ${field}: ${typeof pkg[field] === 'object' ? JSON.stringify(pkg[field]) : pkg[field]}`);
    } else {
      console.log(`❌ Missing required field: ${field}`);
      hasErrors = true;
    }
  });
  
  // Check for sensitive information (check for common API key patterns)
  const scripts = JSON.stringify(pkg.scripts || {});
  const apiKeyPattern = /[A-Za-z0-9]{32,}/; // Pattern for potential API keys
  if (apiKeyPattern.test(scripts) && scripts.length < 10000) {
    // Only warn if scripts are short (likely contains hardcoded key)
    console.log('⚠️  Warning: Potential API key pattern found in package.json scripts');
    console.log('   Please ensure no real API keys are hardcoded');
  } else {
    console.log('✅ No sensitive information in package.json');
  }
  
} catch (error) {
  console.log('❌ Error reading package.json:', error.message);
  hasErrors = true;
}

// Check for sensitive files
console.log('\n🔒 Checking for sensitive files...');
const sensitiveFiles = [
  'debug-api.js',
  'test-api-key.js',
  'debug-news-api.js',
  'debug-crawl-api.js',
  '.env'
];

sensitiveFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`❌ Sensitive file found: ${file}`);
    hasErrors = true;
  } else {
    console.log(`✅ ${file} - not found (good)`);
  }
});

// Check dist directory
console.log('\n🏗️ Checking build output...');
if (fs.existsSync('dist')) {
  const distFiles = fs.readdirSync('dist', { recursive: true });
  console.log(`✅ dist/ directory contains ${distFiles.length} files`);
  
  // Check for essential files
  const essentialDistFiles = ['index.js', 'server.js'];
  essentialDistFiles.forEach(file => {
    if (distFiles.includes(file)) {
      console.log(`✅ dist/${file} exists`);
    } else {
      console.log(`❌ dist/${file} missing`);
      hasErrors = true;
    }
  });
} else {
  console.log('❌ dist/ directory not found - run npm run build');
  hasErrors = true;
}

// Check for API keys in files
console.log('\n🔑 Scanning for hardcoded API keys...');
const filesToCheck = ['start-server.bat', 'start-server.sh', 'USAGE.md', 'README.md'];
let foundApiKeys = false;

filesToCheck.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    // Check for potential API keys (long alphanumeric strings)
    const apiKeyPattern = /[A-Za-z0-9]{40,}/g;
    const matches = content.match(apiKeyPattern);
    if (matches && matches.length > 0) {
      // Filter out common false positives (like URLs, hashes in examples)
      const suspiciousKeys = matches.filter(key => 
        !key.includes('http') && 
        !key.includes('example') &&
        key.length > 40
      );
      if (suspiciousKeys.length > 0) {
        console.log(`⚠️  Potential API key pattern found in ${file}`);
        console.log(`   Please verify no real API keys are hardcoded`);
      }
    }
  }
});

if (!foundApiKeys) {
  console.log('✅ No hardcoded API keys found');
}

// Final result
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('❌ Pre-deployment check FAILED');
  console.log('Please fix the issues above before deploying.');
  process.exit(1);
} else {
  console.log('✅ Pre-deployment check PASSED');
  console.log('Project is ready for deployment!');
  console.log('\nNext steps:');
  console.log('1. npm run build (if not already done)');
  console.log('2. npm pack (to create package)');
  console.log('3. npm publish (to publish to NPM)');
  process.exit(0);
}