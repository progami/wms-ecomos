const baseConfig = require('./jest.config.base');

module.exports = {
  ...baseConfig,
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.integration.js'],
  testMatch: [
    '**/integration/**/*.test.[jt]s?(x)',
  ],
  testPathIgnorePatterns: [
    ...baseConfig.testPathIgnorePatterns,
    'unit/'
  ],
  // Standard timeout for mocked tests
  testTimeout: 10000,
  // Force exit after test run completes
  forceExit: true,
  // Module name mapper for TypeScript paths
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^@/(.*)$': '<rootDir>/../$1'
  }
};