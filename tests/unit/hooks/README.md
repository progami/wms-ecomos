# Custom React Hooks Unit Tests

This directory contains comprehensive unit tests for all custom React hooks in the WMS application.

## Test Coverage

### 1. useClientLogger Hook (`useClientLogger.test.ts`)
Tests the client-side logging hook that tracks user interactions, performance metrics, and errors.

**Coverage includes:**
- Page view logging on mount and route changes
- Action logging with user metadata
- Performance metric logging
- Error logging with different error types
- Session and pathname dependency updates
- Memoization and callback optimization
- Edge cases (missing logger, SSR, concurrent calls)

### 2. usePerformanceMonitor Hook (`usePerformanceMonitor.test.ts`)
Tests the performance monitoring hook that tracks page load metrics and custom operations.

**Coverage includes:**
- Page load performance metrics (navigation timing, paint timing)
- Custom operation measurement
- Event listener cleanup
- SSR compatibility
- Missing performance API handling

### 3. useInteractionTracking Hook (`usePerformanceMonitor.test.ts`)
Tests the user interaction tracking hook for clicks, form submissions, and navigation.

**Coverage includes:**
- Click event tracking with metadata
- Form submission tracking
- Navigation tracking between pages
- Concurrent tracking calls
- Missing logger handling

### 4. useApiTracking Hook (`usePerformanceMonitor.test.ts`)
Tests the API call tracking hook that monitors HTTP request performance.

**Coverage includes:**
- Successful API call tracking with duration
- Failed API call tracking with error details
- Different HTTP methods and status codes
- Network errors and timeouts
- Concurrent API calls

### 5. useToast Hook (`../components/ui/use-toast.test.tsx`)
Tests the toast notification hook and provider.

**Coverage includes:**
- Toast creation and dismissal
- Auto-dismiss functionality
- Multiple toast management
- Toast variants and actions
- Provider context
- Mock implementation without provider

## Running Tests

```bash
# Run all hook tests
npm run test:unit hooks/

# Run specific hook test
npm run test:unit hooks/useClientLogger.test.ts

# Run with coverage
npm run test:coverage -- hooks/

# Run in watch mode
npm run test:watch -- hooks/
```

## Test Utilities

All tests use:
- `@testing-library/react` for rendering hooks
- `jest` for mocking and assertions
- Mock implementations for external dependencies

## Best Practices

1. **Isolation**: Each hook is tested in isolation with mocked dependencies
2. **Coverage**: Tests cover initial state, updates, side effects, and edge cases
3. **Cleanup**: Tests verify proper cleanup on unmount
4. **Memoization**: Tests verify callback memoization works correctly
5. **Error Handling**: Tests cover error scenarios and missing dependencies

## Adding New Hook Tests

When adding tests for new hooks:

1. Create a new test file in this directory: `use[HookName].test.ts`
2. Mock all external dependencies
3. Test all exported functions and state
4. Include edge cases and error scenarios
5. Verify cleanup and memoization
6. Update this README with the new test coverage