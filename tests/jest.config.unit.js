const baseConfig = require('./jest.config.base');

module.exports = {
  ...baseConfig,
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: [
    ...baseConfig.setupFilesAfterEnv,
    '<rootDir>/jest.setup.jsdom.js'
  ],
  testMatch: [
    '**/unit/**/*.test.[jt]s?(x)',
  ],
  testPathIgnorePatterns: [
    ...baseConfig.testPathIgnorePatterns,
    'integration/'
  ],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^.+\\.(css|less|scss|sass)$': '<rootDir>/unit/__mocks__/styleMock.js',
    '^.+\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/unit/__mocks__/fileMock.js'
  },
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  }
};