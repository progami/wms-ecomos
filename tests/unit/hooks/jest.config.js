const path = require('path');

module.exports = {
  displayName: 'hooks',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>'],
  testMatch: [
    '**/*.test.[jt]s?(x)'
  ],
  moduleNameMapper: {
    '^@/(.*)$': path.join(__dirname, '../../../src/$1'),
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/../__mocks__/fileMock.js'
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  coverageDirectory: '<rootDir>/coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/coverage/'
  ],
  collectCoverageFrom: [
    'src/hooks/**/*.{ts,tsx}',
    '!src/hooks/**/*.d.ts',
  ],
  moduleDirectories: ['node_modules', '<rootDir>/../../../node_modules'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }
  }
};