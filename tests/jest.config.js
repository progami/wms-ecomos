const baseConfig = require('./jest.config.base');

// Main Jest configuration - exports base config by default
// Use specific config files for different environments:
// - jest.config.node.js for backend/API tests
// - jest.config.jsdom.js for frontend/React tests
module.exports = baseConfig;