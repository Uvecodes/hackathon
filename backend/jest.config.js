'use strict';

module.exports = {
  // Run all tests inside __tests__/
  testMatch: ['**/__tests__/**/*.test.js'],

  // Clear mocks between every test automatically
  clearMocks: true,

  // Show individual test names in output
  verbose: true,

  // Timeout per test (ms) — keep generous for async Firestore mocks
  testTimeout: 10000,

  // Collect coverage from source files only (not tests or node_modules)
  collectCoverageFrom: [
    'utils/**/*.js',
    'middleware/**/*.js',
    'routes/**/*.js',
    '!**/node_modules/**',
  ],

  // Coverage thresholds — adjust as the project matures
  coverageThreshold: {
    global: {
      statements: 60,
      branches: 50,
      functions: 60,
      lines: 60,
    },
  },

  // Coverage output directory
  coverageDirectory: 'coverage',

  // Reporters — text summary in terminal + lcov for CI
  coverageReporters: ['text', 'lcov', 'html'],

  // Node environment (not jsdom — this is a backend project)
  testEnvironment: 'node',

  // Ignore frontend files and node_modules
  testPathIgnorePatterns: ['/node_modules/', '../frontend/'],

  // Automatically restore mocks after each test
  restoreMocks: true,
};
