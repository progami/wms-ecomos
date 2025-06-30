# Edge Case and Error Scenario Tests

This directory contains comprehensive tests for edge cases and error scenarios in the WMS application.

## Test Categories

### 1. Concurrent User Actions (`concurrent-actions.test.ts`)
- Race conditions in inventory updates
- Concurrent invoice processing
- Parallel warehouse status updates
- Session management conflicts
- Financial calculation consistency

### 2. Data Integrity Failures (`data-integrity-failures.test.ts`)
- Transaction rollback scenarios
- Cascading delete protection
- Orphaned data prevention
- Constraint violation handling
- Referential integrity with soft deletes
- Unique constraint conflicts

### 3. Network Failures (`network-failures.test.ts`)
- API request timeouts
- Retry mechanisms
- Circuit breaker implementation
- Webhook delivery failures
- Database connection pool exhaustion
- Offline mode synchronization

### 4. Database Errors (`database-errors.test.ts`)
- Connection timeout handling
- Deadlock recovery
- Connection pool recovery
- Query timeout and cancellation
- Schema migration handling
- Read replica failures

### 5. Invalid Data Handling (`invalid-data-handling.test.ts`)
- Negative quantity validation
- Invalid UUID formats
- SQL injection prevention
- XSS protection
- Date range validation
- Numeric overflow handling
- Email validation
- File upload security
- JSON sanitization

### 6. Memory and Performance (`memory-performance.test.ts`)
- Memory leak detection
- Event listener cleanup
- Cache management
- Streaming large datasets
- Connection pool leaks
- Stack overflow prevention
- Bulk operation optimization

### 7. Session Expiration (`session-expiration.test.ts`)
- Active session timeout
- Concurrent session management
- Critical operation interruption
- Remember me functionality
- Cross-device session invalidation
- Sliding expiration
- Session cleanup
- Token rotation
- Grace period handling

### 8. File System Errors (`file-system-errors.test.ts`)
- Disk space exhaustion
- Permission errors
- Corrupted file handling
- Concurrent file access
- File locking
- Path traversal prevention
- File watcher cleanup
- Chunked upload resumption

### 9. Cross-Browser Compatibility (`cross-browser-e2e.spec.ts`)
- Multi-browser testing
- Touch gesture support
- Responsive breakpoints
- File upload compatibility
- Storage quota handling
- WebSocket support
- Print functionality
- Console error monitoring

## Running Tests

### Run All Edge Case Tests
```bash
./run-edge-case-tests.sh
```

### Run Specific Test Categories
```bash
# Unit tests only
npm test -- tests/edge-cases/concurrent-actions.test.ts

# E2E tests only
npx playwright test tests/edge-cases/cross-browser-e2e.spec.ts

# With coverage
npm test -- tests/edge-cases --coverage
```

### Run with Different Configurations
```bash
# Run with specific database
TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/test npm test

# Run E2E tests in headed mode
npx playwright test --headed

# Run specific browser tests
npx playwright test --project=chromium
```

## Test Environment Setup

1. **Database**: Tests use a separate test database
2. **Mocking**: Network requests are mocked using axios-mock-adapter
3. **Timeouts**: Extended timeouts for edge case scenarios
4. **Parallel Execution**: Limited to prevent resource conflicts

## Key Testing Patterns

### 1. Race Condition Testing
```typescript
const promises = Array(10).fill(null).map(async () => {
  // Concurrent operation
});
const results = await Promise.allSettled(promises);
```

### 2. Memory Leak Detection
```typescript
const initialMemory = process.memoryUsage().heapUsed;
// Perform operations
const finalMemory = process.memoryUsage().heapUsed;
expect(finalMemory - initialMemory).toBeLessThan(threshold);
```

### 3. Error Recovery Testing
```typescript
try {
  await riskyOperation();
} catch (error) {
  await recoverFromError(error);
  // Verify recovery succeeded
}
```

### 4. Cross-Browser Testing
```typescript
for (const config of browserConfigs) {
  test(`${config.name} - functionality`, async ({ browser }) => {
    const context = await browser.newContext(config);
    // Test browser-specific behavior
  });
}
```

## Continuous Integration

These tests are designed to run in CI/CD pipelines:

1. **Pre-deployment**: Run all edge case tests
2. **Nightly**: Run full cross-browser suite
3. **PR Checks**: Run critical edge cases only

## Monitoring and Alerts

Test results should be monitored for:
- Flaky tests (intermittent failures)
- Performance degradation
- Memory usage trends
- Browser-specific issues

## Contributing

When adding new edge case tests:

1. Identify the edge case category
2. Add test to appropriate file
3. Update this README
4. Ensure cleanup in afterEach
5. Add to CI pipeline if critical

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Jest Documentation](https://jestjs.io)
- [Testing Best Practices](https://testingjavascript.com)