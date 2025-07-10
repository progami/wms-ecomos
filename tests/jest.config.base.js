const path = require('path');

module.exports = {
  roots: ['<rootDir>'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: [
    '**/unit/**/*.test.[jt]s?(x)',
    '**/integration/**/*.test.[jt]s?(x)',
    '**/__tests__/**/*.test.[jt]s?(x)'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/e2e/',
    '/performance/',
    '/vulnerability-tests/'
  ],
  moduleNameMapper: {
    '^@/(.*)$': path.join(__dirname, '../src/$1')
  },
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
  transformIgnorePatterns: [
    '/node_modules/(?!(node-fetch|fetch-blob|formdata-polyfill|data-uri-to-buffer)/)'
  ],
  coverageDirectory: '<rootDir>/coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/.next/',
    '/coverage/'
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 70,
      statements: 70
    }
  }
};