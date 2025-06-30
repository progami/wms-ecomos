# WMS Test Suite Documentation

## Overview

This directory contains all tests for the Warehouse Management System (WMS). The test suite is organized to provide comprehensive coverage including unit tests, integration tests, end-to-end (E2E) tests, and performance tests.

## Test Structure

```
tests/
├── unit/                    # Unit tests for components and utilities
├── integration/             # API and service integration tests  
├── e2e/                     # End-to-end browser tests with Playwright
├── performance/             # Performance and load tests
├── build/                   # Build verification scripts
├── vulnerability-tests/     # Security and edge case tests
└── __tests__/              # Legacy test structure (being migrated)
```

## Running Tests

### All Tests
```bash
npm run test:all              # Run all test suites
npm run test:ci              # Run tests in CI mode with coverage
```

### Unit Tests
```bash
npm test                     # Run all unit tests
npm run test:unit           # Run only unit/ folder tests
npm run test:watch          # Run tests in watch mode
npm run test:coverage       # Run with coverage report
```

### Integration Tests
```bash
npm run test:integration    # Run integration tests
```

### E2E Tests
```bash
npm run test:e2e           # Run all E2E tests
npm run test:e2e:ui        # Run with Playwright UI
npm run test:e2e:debug     # Run in debug mode
npm run test:e2e:runtime   # Run only runtime interaction tests
```

### Performance Tests
```bash
npm run test:performance   # Run performance test suite
```

### Build Verification
```bash
npm run test:build        # Build and verify production build
```

## E2E Test Categories

### Authentication Tests (`auth-runtime.spec.ts`)
- Landing page functionality
- Login/logout flows
- Demo environment setup
- Session persistence
- Protected route redirects
- Mobile responsive authentication

### Dashboard Tests (`dashboard-runtime.spec.ts`)
- Dashboard component loading
- KPI cards and data display
- Chart rendering
- Navigation functionality
- Recent activity display
- Performance monitoring
- Error state handling

### SKU Management Tests (`sku-management-runtime.spec.ts`)
- SKU list viewing and searching
- Create new SKU workflow
- Edit existing SKUs
- Delete with confirmation
- Form validation
- Pagination
- Export functionality
- Mobile responsiveness

### Finance Tests (`finance-runtime.spec.ts`)
- Finance dashboard overview
- Invoice generation and management
- Invoice status updates
- Cost rates management
- Financial reports
- Invoice reconciliation
- Billing period selection
- Export capabilities

### Performance Tests (`page-load.spec.ts`)
- Page load time monitoring
- First contentful paint metrics
- Time to interactive (TTI)
- Memory usage tracking
- API response times
- Bundle size verification
- Cumulative Layout Shift (CLS)

## Test Configuration

### Jest Configuration
- Located in `tests/jest.config.js`
- Configured for TypeScript and Next.js
- Coverage thresholds: 70% lines, 60% branches/functions
- Excludes E2E and performance tests from Jest runs

### Playwright Configuration
- Located in `tests/playwright.config.ts`
- Runs against multiple browsers (Chromium, Firefox, WebKit)
- Includes mobile viewport testing
- Automatic retry on failure (2 retries in CI)
- Screenshots and videos on failure

## Writing New Tests

### Unit Tests
Place in `tests/unit/` with `.test.ts` extension:
```typescript
describe('Component/Function Name', () => {
  it('should do something', () => {
    expect(result).toBe(expected)
  })
})
```

### E2E Tests
Place in `tests/e2e/` with `.spec.ts` extension:
```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test('user workflow description', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toBeVisible()
  })
})
```

## CI/CD Integration

The test suite is designed for CI/CD pipelines:

1. **Pre-deployment**: `npm run test:ci`
   - Runs linting
   - Type checking
   - Unit/integration tests with coverage
   - E2E tests with reporting

2. **Build verification**: `npm run test:build`
   - Builds the application
   - Verifies build output
   - Checks bundle sizes

3. **Performance monitoring**: `npm run test:performance`
   - Monitors page load times
   - Tracks memory usage
   - Validates performance budgets

## Test Data

- E2E tests use demo data setup
- Each test is isolated and doesn't depend on others
- Demo users: `demo-admin` and `staff`
- Test fixtures in `tests/e2e/fixtures/`

## Debugging

### E2E Test Debugging
```bash
npm run test:e2e:debug     # Opens Playwright inspector
npm run test:e2e:ui        # Opens Playwright UI mode
```

### View Test Reports
```bash
npm run test:e2e:report    # Open HTML report after test run
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Clarity**: Use descriptive test names
3. **Performance**: Keep tests fast and focused
4. **Reliability**: Avoid flaky tests with proper waits
5. **Coverage**: Aim for high coverage but focus on critical paths
6. **Documentation**: Comment complex test scenarios

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure port 3002 is free for E2E tests
2. **Database state**: E2E tests expect demo data to be available
3. **Timeouts**: Increase timeouts for slower CI environments
4. **Memory**: Performance tests require sufficient memory

### Running Specific Tests

```bash
# Run a specific test file
npm test -- unit/smoke.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="login"

# Run E2E tests for a specific feature
npm run test:e2e -- auth-runtime.spec.ts
```