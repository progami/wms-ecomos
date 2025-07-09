const baseConfig = require('./jest.config.base');

module.exports = {
  ...baseConfig,
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: [
    ...baseConfig.setupFilesAfterEnv,
    '<rootDir>/jest.setup.jsdom.js'
  ],
  testMatch: [
    '**/unit/**/*.(component|hook|ui|page|client).test.[jt]s?(x)',
    '**/__tests__/**/*.(component|hook|ui|page).test.[jt]s?(x)',
  ],
  testPathIgnorePatterns: [
    ...baseConfig.testPathIgnorePatterns,
    'integration/',
    'api/',
    'server/',
    'backend/',
    'service/',
    'lib/'
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