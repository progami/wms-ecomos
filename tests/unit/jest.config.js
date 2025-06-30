const path = require('path');

module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>'],
  testMatch: [
    '**/components/**/*.test.[jt]s?(x)'
  ],
  moduleNameMapper: {
    '^@/(.*)$': path.join(__dirname, '../../src/$1'),
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js'
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react'
      }
    }]
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.tsx'],
  coverageDirectory: '<rootDir>/coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/coverage/'
  ],
  moduleDirectories: ['node_modules', '<rootDir>/../../node_modules'],
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