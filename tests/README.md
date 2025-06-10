# Tests Directory

This directory contains all test files including unit tests, integration tests, and end-to-end tests.

## Directory Structure

### __tests__/
Jest unit and integration tests organized by source structure
- **app/**: Tests for app directory pages and API routes
- **components/**: Component unit tests
- **integration/**: Integration test scenarios
- **lib/**: Utility function tests

### e2e/
Playwright end-to-end tests
- **auth.spec.ts**: Authentication flow tests
- **dashboard.spec.ts**: Dashboard functionality tests
- **finance.spec.ts**: Finance module tests
- **operations.spec.ts**: Operations workflow tests
- **admin.spec.ts**: Admin functionality tests
- **reports.spec.ts**: Reporting feature tests
- **integrations.spec.ts**: Third-party integration tests
- **configuration.spec.ts**: Configuration management tests
- **inventory.spec.ts**: Inventory management tests
- **transactions.spec.ts**: Transaction flow tests
- **invoices.spec.ts**: Invoice management tests

## Configuration Files

### test-utils.tsx
- **Purpose**: Testing utilities and custom render functions
- **Includes**: Providers wrapper, mock data generators

### test-polyfills.ts
- **Purpose**: Polyfills for test environment
- **Usage**: Automatically loaded by Jest

### global-setup.ts
- **Purpose**: Playwright global setup for authentication
- **Creates**: auth.json for authenticated test sessions

### playwright.config.ts
- **Purpose**: Playwright test configuration
- **Located**: Project root

### auth.json
- **Purpose**: Stored authentication state for E2E tests
- **Generated**: By global-setup.ts or create-auth-state script

### ui-elements-inventory.md
- **Purpose**: Documentation of all UI elements for testing
- **Usage**: Reference for writing comprehensive E2E tests

## Test Commands

```bash
# Run all tests
npm test

# Run unit tests in watch mode
npm run test:watch

# Run unit tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run specific E2E test file
npm run test:e2e -- tests/e2e/auth.spec.ts

# Run E2E tests in UI mode
npm run test:e2e:ui

# Generate E2E test report
npm run test:e2e:report
```

## Test Categories

### Unit Tests
- Component rendering
- Utility functions
- Business logic
- API route handlers

### Integration Tests
- Database operations
- API endpoint flows
- Multi-component interactions

### E2E Tests
- User workflows
- Authentication flows
- Data entry and validation
- Report generation
- Cross-module features

## Best Practices

1. **Organization**: Mirror source structure in test directories
2. **Naming**: Use `.test.ts(x)` for unit tests, `.spec.ts` for E2E tests
3. **Coverage**: Aim for high coverage of critical paths
4. **Isolation**: Tests should not depend on each other
5. **Mocking**: Mock external dependencies appropriately
6. **Assertions**: Use specific assertions over generic ones
7. **Performance**: Keep tests fast by minimizing I/O operations

## Writing Tests

### Unit Test Example
```typescript
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })
})
```

### E2E Test Example
```typescript
import { test, expect } from '@playwright/test'

test('user can login', async ({ page }) => {
  await page.goto('/auth/login')
  await page.fill('input#emailOrUsername', 'admin')
  await page.fill('input#password', 'password')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/dashboard')
})
```