const baseConfig = require('./jest.config.base');

module.exports = {
  ...baseConfig,
  testEnvironment: 'node',
  testMatch: [
    '**/integration/**/*.(test|spec).[jt]s?(x)',
    '**/(api|server|backend|service|lib|util)/**/*.(test|spec).[jt]s?(x)',
    '**/unit/**/*(api|server|backend|service|resilience|prisma)*.test.[jt]s?(x)'
  ],
  testPathIgnorePatterns: [
    ...baseConfig.testPathIgnorePatterns,
    '**/unit/**/*.(component|hook|ui|page|client).test.[jt]s?(x)'
  ]
};