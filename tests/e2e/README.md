# End-to-End Tests

This directory contains Playwright end-to-end tests that verify complete user workflows.

## Test Files

### auth.spec.ts
- Login functionality
- Password validation
- Form validation
- Session management

### dashboard.spec.ts
- Dashboard statistics display
- Quick action navigation
- Real-time updates
- Role-based content

### admin.spec.ts
- User management
- System settings
- Import functionality
- Audit logs

### finance.spec.ts
- Invoice creation
- Cost tracking
- Reconciliation flows
- Financial reports

### operations.spec.ts
- Receive goods workflow
- Ship goods workflow
- Inventory management
- Transaction details

### configuration.spec.ts
- Warehouse setup
- SKU management
- Rate configuration
- Template management

### integrations.spec.ts
- Amazon sync
- API connections
- Webhook handling

### reports.spec.ts
- Report generation
- Export functionality
- Custom queries

### inventory.spec.ts
- Balance tracking
- FIFO/LIFO logic
- Multi-warehouse views

### transactions.spec.ts
- Transaction creation
- Immutability checks
- Attribute tracking

### invoices.spec.ts
- Invoice generation
- Payment tracking
- PDF export

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- tests/e2e/auth.spec.ts

# Run in headed mode (see browser)
npm run test:e2e -- --headed

# Run specific test
npm run test:e2e -- tests/e2e/auth.spec.ts -g "login"

# Debug mode
npm run test:e2e -- --debug
```

## Test Structure

Each test file follows this pattern:
```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup
  })

  test('specific functionality', async ({ page }) => {
    // Test implementation
  })
})
```

## Best Practices

1. **Use Page Objects**: Encapsulate page interactions
2. **Data Independence**: Don't rely on specific data
3. **Explicit Waits**: Wait for specific conditions
4. **Meaningful Names**: Describe what the test verifies
5. **Atomic Tests**: Each test should be independent

## Authentication

Tests use stored authentication state from `tests/auth.json`. Run `npx tsx scripts/create-auth-state.ts` to regenerate if needed.