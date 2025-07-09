#!/usr/bin/env node

// Set test authentication environment variable
process.env.USE_TEST_AUTH = 'true'
process.env.NODE_ENV = 'test'

// Start the regular server
require('../server.js')