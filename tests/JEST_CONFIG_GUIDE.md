# Jest Configuration Guide

## Overview
The WMS project now uses separate Jest configurations for different test environments to ensure proper test execution and isolation.

## Configuration Files

### 1. jest.config.base.js
- Base configuration shared across all test environments
- Contains common settings like coverage thresholds, transform options, and module mappings
- Coverage thresholds: 60% branches/functions, 70% lines/statements

### 2. jest.config.node.js
- For backend/API tests requiring Node.js environment
- Automatically picks up tests with patterns:
  - `*.api.test.js`
  - `*.server.test.js`
  - `*.backend.test.js`
  - `*.service.test.js`
  - `*.middleware.test.js`
  - `*.controller.test.js`
  - `*.model.test.js`
  - `*.repository.test.js`
  - `*.db.test.js`
  - `*.database.test.js`
  - All integration tests (`integration/**/*.test.js`)

### 3. jest.config.jsdom.js
- For frontend/React tests requiring JSDOM environment
- Automatically picks up tests with patterns:
  - `*.component.test.js`
  - `*.hook.test.js`
  - `*.ui.test.js`
  - `*.frontend.test.js`
  - `*.page.test.js`
  - `*.view.test.js`
  - Tests in `components/`, `hooks/`, `ui/` directories
- Includes CSS and asset mocking
- Provides browser-like globals (localStorage, sessionStorage, fetch)

### 4. jest.config.js
- Main configuration file that exports the base config
- Maintained for backward compatibility

## Running Tests

### Using npm scripts (recommended):
```bash
# Run all tests
npm test

# Run unit tests (uses JSDOM config)
npm run test:unit

# Run integration tests (uses Node config)
npm run test:integration

# Run only Node environment tests
npm run test:node

# Run only JSDOM environment tests
npm run test:jsdom

# Run security tests (uses Node config)
npm run test:security
```

### Using Jest directly:
```bash
# From the tests directory
jest --config=jest.config.node.js
jest --config=jest.config.jsdom.js
```

## Setup Files

- `jest.setup.js` - Common setup for all tests (console mocking)
- `jest.setup.jsdom.js` - JSDOM-specific setup (browser APIs, localStorage, etc.)

## Mock Files

- `unit/__mocks__/fileMock.js` - Mocks static assets (images, fonts, etc.)
- `unit/__mocks__/styleMock.js` - Mocks CSS modules

## Test Organization

- Place backend/API tests in:
  - `integration/` directory
  - Files with backend-specific suffixes (.api.test.js, .service.test.js, etc.)
  
- Place frontend/React tests in:
  - `unit/components/`
  - `unit/hooks/`
  - `unit/ui/`
  - Files with frontend-specific suffixes (.component.test.js, .hook.test.js, etc.)

## Migration Notes

If you have existing tests that don't follow the naming patterns:
1. Rename them to include appropriate suffixes, OR
2. Move them to appropriate directories, OR
3. Update the testMatch patterns in the respective config files