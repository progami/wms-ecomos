const baseConfig = require('./jest.config.base');

module.exports = {
  ...baseConfig,
  testEnvironment: 'node',
  testMatch: [
    '**/integration/**/*.test.[jt]s?(x)',
  ],
  testPathIgnorePatterns: [
    ...baseConfig.testPathIgnorePatterns,
    'unit/'
  ],
  // Longer timeout for database operations
  testTimeout: 30000
};