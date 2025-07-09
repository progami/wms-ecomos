const baseConfig = require('./jest.config.base');

module.exports = {
  ...baseConfig,
  testEnvironment: 'node',
  testMatch: [
    '**/vulnerability-tests/**/*.test.[jt]s?(x)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/e2e/',
    '/performance/',
    '/unit/',
    '/integration/'
  ],
  // Longer timeout for security scanning
  testTimeout: 60000
};