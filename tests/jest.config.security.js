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
  setupFilesAfterEnv: ['<rootDir>/jest.setup.security.js'],
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest', {
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: true,
          decorators: false,
          dynamicImport: true,
        },
        transform: {
          react: {
            runtime: 'automatic',
          },
        },
      },
    }],
  },
  // Longer timeout for security scanning
  testTimeout: 60000
};