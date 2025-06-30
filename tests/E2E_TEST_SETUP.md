# E2E Test Setup Guide

## Overview
The E2E tests use Playwright to test the authentication and functionality of the Warehouse Management System.

## Prerequisites
1. PostgreSQL database running locally
2. Redis server running (for session management)
3. Node.js environment set up

## Authentication Setup

### Database Seeding
The tests require a seeded database with test users. The global setup automatically runs:
1. Database migrations (`prisma db push`)
2. Database seeding (`npm run db:seed`)

### Test Users
The following users are created by the seed script:
- **Admin**: `admin@warehouse.com` / `SecureWarehouse2024!`
- **Staff (Hashar)**: `hashar@warehouse.com` / `StaffAccess2024!`
- **Staff (Umair)**: `umair@warehouse.com` / `StaffAccess2024!`

### Demo Mode
Tests can also use the demo mode which creates:
- **Demo Admin**: `demo-admin@warehouse.com` / `SecureWarehouse2024!`
- **Demo Staff**: `staff@warehouse.com` / `DemoStaff2024!`

## Running E2E Tests

### Run all E2E tests:
```bash
npm run test:e2e
```

### Run specific test file:
```bash
cd tests && npx playwright test e2e/auth-test-quick.spec.ts
```

### Debug mode:
```bash
npm run test:e2e:debug
```

### UI mode (interactive):
```bash
npm run test:e2e:ui
```

## Common Issues and Solutions

### 1. Authentication Failures
- **Issue**: Tests fail with "Invalid credentials"
- **Solution**: Ensure database is properly seeded by running `npm run db:seed`

### 2. Database Connection Errors
- **Issue**: Tests fail to connect to database
- **Solution**: Check that PostgreSQL is running and DATABASE_URL in .env is correct

### 3. Port Conflicts
- **Issue**: Tests fail to start dev server
- **Solution**: The tests use port 3002. Ensure no other process is using this port

### 4. Session/Cookie Issues
- **Issue**: Authentication works but subsequent requests fail
- **Solution**: Ensure NEXTAUTH_SECRET is set in .env file

## Test Helpers

The `test-helpers.ts` file provides utility functions:
- `login(page, email, password)` - Login with credentials
- `loginAsDemo(page)` - Login using demo mode
- `waitForToast(page, message)` - Wait for toast notifications
- `fillForm(page, fields)` - Fill form fields

## Writing New E2E Tests

When writing new E2E tests that require authentication:

```typescript
import { test, expect } from '@playwright/test';
import { login, loginAsDemo } from './utils/test-helpers';

test('My authenticated test', async ({ page }) => {
  // Option 1: Login with specific user
  await login(page, 'admin@warehouse.com', 'SecureWarehouse2024!');
  
  // Option 2: Use demo mode
  await loginAsDemo(page);
  
  // Your test logic here
  await expect(page).toHaveURL(/.*\/dashboard/);
});
```

## Environment Variables

Ensure these are set in your `.env` file:
```
DATABASE_URL="postgresql://user@localhost:5432/warehouse_management"
NEXTAUTH_URL="http://localhost:3002"
NEXTAUTH_SECRET="your-secret-key"
REDIS_URL="redis://localhost:6379"
```

## Troubleshooting Commands

### Reset database and reseed:
```bash
npx prisma db push --force-reset
npm run db:seed
```

### Check test logs:
```bash
npm run test:e2e:report
```

### Clean test artifacts:
```bash
rm -rf tests/playwright-report tests/test-results
```