const path = require('path');

module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: [
    '**/__tests__/**/*.test.[jt]s',
    '**/*.test.[jt]s'
  ],
  moduleNameMapper: {
    '^@/(.*)$': path.join(__dirname, '../src/$1')
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        'next/babel'
      ]
    }]
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(node-fetch|fetch-blob|formdata-polyfill|data-uri-to-buffer)/)'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
};