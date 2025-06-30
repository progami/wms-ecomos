# External Integration Tests

This directory contains comprehensive integration tests for all external services used by the WMS application.

## Overview

These tests ensure proper integration with third-party services while maintaining isolation from actual external dependencies through mocking. Each test suite covers success scenarios, failure handling, retry logic, rate limiting, and data transformation.

## Test Suites

### 1. Amazon SP-API Integration (`amazon-sp-api.test.ts`)

Tests for Amazon Selling Partner API integration:
- Inventory synchronization
- Inbound shipment tracking
- Order management
- Product catalog operations
- Fee calculations
- Rate limiting and retry logic

### 2. Email Service Integration (`email-service.test.ts`)

Tests for email service functionality:
- Shipment notification generation
- Email template handling
- Error scenarios
- Future email service integration patterns

### 3. Webhook Handlers (`webhook-handlers.test.ts`)

Tests for webhook functionality:
- Outgoing webhook delivery
- Incoming webhook processing
- Signature verification
- Retry logic with exponential backoff
- Duplicate detection

### 4. API Resilience (`api-resilience.test.ts`)

Tests for resilience patterns:
- Retry mechanisms
- Timeout handling
- Circuit breaker implementation
- Rate limiting
- Combined patterns

### 5. Third-Party Services (`third-party-services.test.ts`)

Tests for various third-party integrations:
- Analytics services
- Cloud storage
- SMS notifications
- Geolocation/mapping
- Tax calculations
- Currency exchange
- Document generation
- Barcode/QR generation

## Running Tests

### Run all external integration tests:
```bash
npm test tests/integration/external
```

### Run specific test suite:
```bash
npm test tests/integration/external/amazon-sp-api.test.ts
```

### Run with coverage:
```bash
npm test -- --coverage tests/integration/external
```

### Run in watch mode:
```bash
npm test -- --watch tests/integration/external
```

## Test Configuration

### Environment Variables

Create a `.env.test` file for test configuration:
```env
# Test mode (mock or real)
INTEGRATION_TEST_MODE=mock

# Amazon SP-API (when using real mode)
AMAZON_SP_APP_CLIENT_ID=your-client-id
AMAZON_SP_APP_CLIENT_SECRET=your-secret
AMAZON_MARKETPLACE_ID=your-marketplace-id

# Email Service
EMAIL_SERVICE_API_KEY=your-api-key
EMAIL_FROM_ADDRESS=noreply@test.com

# Other service configurations...
```

### Mock vs Real Mode

By default, all tests run with mocked external services. To run against real services:

1. Set `INTEGRATION_TEST_MODE=real`
2. Provide actual API credentials
3. Be aware of rate limits and costs

## Writing New Tests

### Test Structure Template

```typescript
describe('Service Name Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Success Scenarios', () => {
    test('should handle successful operation', async () => {
      // Mock setup
      // Test execution
      // Assertions
    })
  })

  describe('Failure Scenarios', () => {
    test('should handle service errors', async () => {
      // Mock error setup
      // Test execution
      // Error assertions
    })
  })

  describe('Retry Logic', () => {
    test('should retry with exponential backoff', async () => {
      // Mock intermittent failures
      // Test retry behavior
      // Verify retry attempts
    })
  })

  describe('Rate Limiting', () => {
    test('should respect rate limits', async () => {
      // Mock rate limit responses
      // Test rate limit handling
      // Verify backoff behavior
    })
  })
})
```

### Best Practices

1. **Isolation**: Each test should be independent and not affect others
2. **Mocking**: Use comprehensive mocks that simulate real service behavior
3. **Error Coverage**: Test all possible error scenarios
4. **Timing**: Test timeouts and delays realistically
5. **Data Validation**: Verify data transformation and validation
6. **Cleanup**: Always clean up resources in `afterEach`

## Common Patterns

### Retry with Exponential Backoff

```typescript
const retryWithBackoff = async (fn: Function, maxAttempts = 3) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxAttempts - 1) throw error
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, i) * 1000)
      )
    }
  }
}
```

### Circuit Breaker

```typescript
class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  async execute(fn: Function) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN'
      } else {
        throw new Error('Circuit breaker is OPEN')
      }
    }
    // Execute and handle state transitions
  }
}
```

### Rate Limiting

```typescript
class RateLimiter {
  private requests: number[] = []

  async checkLimit(): Promise<boolean> {
    const now = Date.now()
    this.requests = this.requests.filter(
      time => now - time < this.windowMs
    )
    
    if (this.requests.length >= this.maxRequests) {
      return false
    }
    
    this.requests.push(now)
    return true
  }
}
```

## Troubleshooting

### Common Issues

1. **Timeout Errors**: Increase test timeout in jest.config.js
2. **Mock Not Working**: Ensure mocks are set up before imports
3. **Flaky Tests**: Add proper delays and wait conditions
4. **Memory Leaks**: Check for unclosed connections or timers

### Debug Mode

Enable debug logging:
```bash
DEBUG=wms:external:* npm test
```

## Maintenance

### Regular Tasks

1. Update mock responses when APIs change
2. Review and update rate limits
3. Check for deprecated endpoints
4. Update error scenarios based on production issues
5. Performance optimization for slow tests

### Adding New Services

1. Create new test file in this directory
2. Follow the established patterns
3. Update the index.ts file
4. Add configuration to README
5. Implement comprehensive test coverage