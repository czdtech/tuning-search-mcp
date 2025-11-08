module.exports = {
  // Switch to ts-jest ESM preset per official guidance
  // See: ts-jest ESM support docs
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }],
  },
  extensionsToTreatAsEsm: ['.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  // Increase default timeout to reduce flakiness in integration/perf tests
  testTimeout: 20000,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  // Rely on ESM preset; avoid transforming node_modules ESM
};
