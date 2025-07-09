import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { withRetry, withTimeout, withCircuitBreaker, withRateLimit } from '@/lib/api/resilience'

// Mock external API clients
const mockExternalAPIs = {
  shippingAPI: {
    getRates: jest.fn(),
    createLabel: jest.fn(),
    trackShipment: jest.fn()
  },
  paymentAPI: {
    processPayment: jest.fn(),
    refundPayment: jest.fn(),
    getTransactionStatus: jest.fn()
  },
  inventoryAPI: {
    syncInventory: jest.fn(),
    updateStock: jest.fn(),
    getBatchInfo: jest.fn()
  },
  analyticsAPI: {
    sendEvent: jest.fn(),
    batchEvents: jest.fn()
  }
}

describe('API Resilience Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Retry Mechanism', () => {
    test('should retry failed API calls with exponential backoff', async () => {
      let attempts = 0
      const mockAPI = jest.fn().mockImplementation(() => {
        attempts++
        if (attempts < 3) {
          // Create error with status code that will be retried
          const error: any = new Error('Service temporarily unavailable')
          error.status = 503
          throw error
        }
        return { success: true, data: 'OK' }
      })

      const startTime = Date.now()
      const result = await withRetry(() => mockAPI(), {
        maxAttempts: 3,
        initialDelay: 100,
        maxDelay: 1000,
        factor: 2
      })
      const duration = Date.now() - startTime

      expect(result.success).toBe(true)
      expect(attempts).toBe(3)
      // Should have delays: 100ms + 200ms = 300ms minimum
      expect(duration).toBeGreaterThan(250) // Allow some variance
    })

    test('should not retry non-retryable errors', async () => {
      const mockAPI = jest.fn().mockRejectedValue(
        new Error('Invalid API key')
      )

      await expect(
        withRetry(() => mockAPI(), {
          maxAttempts: 3,
          shouldRetry: (error) => {
            return !error.message.includes('Invalid API key')
          }
        })
      ).rejects.toThrow('Invalid API key')
      expect(mockAPI).toHaveBeenCalledTimes(1) // No retries
    })

    test('should handle jittered backoff to prevent thundering herd', async () => {
      const actualDelays: number[] = []
      let retryCount = 0
      const mockAPI = jest.fn().mockImplementation(() => {
        // Create retryable error
        const error: any = new Error('Retry needed')
        error.status = 503
        throw error
      })

      // Override setTimeout to capture actual delays
      const originalSetTimeout = global.setTimeout
      global.setTimeout = ((fn: Function, delay: number) => {
        if (retryCount > 0) { // Skip initial call
          actualDelays.push(delay)
        }
        return originalSetTimeout(fn, delay)
      }) as any

      try {
        await withRetry(() => mockAPI(), {
          maxAttempts: 5,
          initialDelay: 100,
          jitter: true,
          onRetry: (attempt) => {
            retryCount = attempt
          }
        })
      } catch (error) {
        // Expected to fail after all retries
      } finally {
        global.setTimeout = originalSetTimeout
      }

      // Verify delays have some variation (jitter)
      expect(actualDelays.length).toBe(4) // 4 retries after initial attempt
      const uniqueDelays = new Set(actualDelays)
      expect(uniqueDelays.size).toBeGreaterThan(1)
    })
  })

  describe('Timeout Handling', () => {
    test('should timeout long-running API calls', async () => {
      const mockSlowAPI = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 5000))
        return { data: 'too late' }
      })

      await expect(
        withTimeout(() => mockSlowAPI(), 1000)
      ).rejects.toThrow('Operation timed out')
    })

    test('should handle timeout with cleanup', async () => {
      let cleaned = false
      // Create a function that explicitly accepts a signal parameter
      const apiFunction = async (signal?: AbortSignal) => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => resolve({ data: 'success' }), 2000)
          
          if (signal) {
            signal.addEventListener('abort', () => {
              clearTimeout(timeout)
              cleaned = true
              reject(new Error('Aborted'))
            })
          }
        })
      }
      
      const mockAPI = jest.fn(apiFunction)

      try {
        await withTimeout(() => mockAPI(), 500)
      } catch (error) {
        // Expected timeout
      }

      // Give time for cleanup
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(cleaned).toBe(true)
    })

    test('should complete fast API calls without timeout', async () => {
      const mockFastAPI = jest.fn().mockResolvedValue({ data: 'quick response' })

      const result = await withTimeout(mockFastAPI, 1000)

      expect(result.data).toBe('quick response')
    })
  })

  describe('Circuit Breaker Pattern', () => {
    test('should open circuit after threshold failures', async () => {
      let callCount = 0
      const mockFailingAPI = jest.fn().mockImplementation(() => {
        callCount++
        throw new Error('Service error')
      })

      const circuitBreaker = withCircuitBreaker(() => mockFailingAPI(), {
        failureThreshold: 3,
        resetTimeout: 1000,
        monitoringPeriod: 5000
      })

      // Make calls until circuit opens
      const results = []
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker()
          results.push('success')
        } catch (error: any) {
          results.push(error.message)
        }
      }

      // First 3 calls should fail normally, then circuit opens
      expect(results.slice(0, 3)).toEqual([
        'Service error',
        'Service error',
        'Service error'
      ])
      expect(results.slice(3)).toEqual([
        'Circuit breaker is OPEN',
        'Circuit breaker is OPEN'
      ])
      expect(callCount).toBe(3) // No more calls after circuit opens
    })

    test('should close circuit after reset timeout', async () => {
      let shouldFail = true
      const mockAPI = jest.fn().mockImplementation(() => {
        if (shouldFail) {
          throw new Error('Service error')
        }
        return { data: 'success' }
      })

      const circuitBreaker = withCircuitBreaker(() => mockAPI(), {
        failureThreshold: 2,
        resetTimeout: 500,
        halfOpenRequests: 1
      })

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await circuitBreaker()
        } catch (error) {
          // Expected failures
        }
      }

      // Circuit should be open
      await expect(circuitBreaker()).rejects.toThrow('Circuit breaker is OPEN')

      // Fix the service
      shouldFail = false

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 600))

      // Circuit should try half-open
      const result = await circuitBreaker()
      expect(result.data).toBe('success')
    })

    test('should handle half-open state correctly', async () => {
      let callCount = 0
      const mockAPI = jest.fn().mockImplementation(() => {
        callCount++
        // Fail first 3 calls to open circuit, succeed on 4th (half-open test)
        if (callCount <= 3) {
          throw new Error('Service error')
        }
        return { data: 'success' }
      })

      const circuitBreaker = withCircuitBreaker(() => mockAPI(), {
        failureThreshold: 3,
        resetTimeout: 300,
        halfOpenRequests: 1
      })

      // Open circuit with 3 failures
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker()
        } catch (error) {
          // Expected failures
        }
      }

      // Circuit should be open
      await expect(circuitBreaker()).rejects.toThrow('Circuit breaker is OPEN')

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 350))

      // Circuit should now be half-open and allow one request
      const result = await circuitBreaker()
      expect(result.data).toBe('success')
      
      // Circuit should be closed now, next call should succeed
      const result2 = await circuitBreaker()
      expect(result2.data).toBe('success')
    })
  })

  describe('Rate Limiting', () => {
    test('should enforce rate limits on API calls', async () => {
      const mockAPI = jest.fn().mockResolvedValue({ data: 'success' })

      const rateLimitedAPI = withRateLimit(mockAPI, {
        maxRequests: 3,
        windowMs: 1000
      })

      const startTime = Date.now()
      const results = []

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        try {
          const result = await rateLimitedAPI()
          results.push({ success: true, time: Date.now() - startTime })
        } catch (error: any) {
          results.push({ success: false, error: error.message, time: Date.now() - startTime })
        }
      }

      // First 3 should succeed, last 2 should be rate limited
      expect(results.filter(r => r.success)).toHaveLength(3)
      expect(results.filter(r => !r.success)).toHaveLength(2)
      expect(results[3].error).toContain('Rate limit exceeded')
    })

    test('should reset rate limit after window', async () => {
      const mockAPI = jest.fn().mockResolvedValue({ data: 'success' })

      const rateLimitedAPI = withRateLimit(mockAPI, {
        maxRequests: 2,
        windowMs: 500
      })

      // Use up the limit
      await rateLimitedAPI()
      await rateLimitedAPI()

      // Should be rate limited
      await expect(rateLimitedAPI()).rejects.toThrow('Rate limit exceeded')

      // Wait for window to reset
      await new Promise(resolve => setTimeout(resolve, 600))

      // Should work again
      const result = await rateLimitedAPI()
      expect(result.data).toBe('success')
    })

    test('should handle distributed rate limiting', async () => {
      // Simulate multiple instances with shared rate limit
      const mockRedis = {
        incr: jest.fn().mockResolvedValue(1),
        expire: jest.fn().mockResolvedValue(1),
        ttl: jest.fn().mockResolvedValue(60)
      }

      const distributedRateLimit = async (key: string, limit: number) => {
        const count = await mockRedis.incr(key)
        if (count === 1) {
          await mockRedis.expire(key, 60)
        }
        return count <= limit
      }

      const allowed1 = await distributedRateLimit('api:user:123', 10)
      const allowed2 = await distributedRateLimit('api:user:123', 10)

      expect(allowed1).toBe(true)
      expect(allowed2).toBe(true)
      expect(mockRedis.incr).toHaveBeenCalledTimes(2)
    })
  })

  describe('Combined Resilience Patterns', () => {
    test('should combine retry, timeout, and circuit breaker', async () => {
      let attempts = 0
      const mockAPI = jest.fn().mockImplementation(async () => {
        attempts++
        if (attempts === 1) {
          // First attempt: timeout
          await new Promise(resolve => setTimeout(resolve, 2000))
        } else if (attempts === 2) {
          // Second attempt: quick error for retry
          const error: any = new Error('Service error')
          error.status = 503
          throw error
        }
        // Third attempt: success
        return { data: 'success' }
      })

      // Apply patterns with proper error handling
      const resilientAPI = withCircuitBreaker(
        async () => {
          return await withRetry(
            async () => {
              return await withTimeout(mockAPI, 1000)
            },
            { 
              maxAttempts: 3,
              initialDelay: 100,
              shouldRetry: (error) => {
                // Retry on timeout or 5xx errors
                return error.message.includes('timed out') || error.status >= 500
              }
            }
          )
        },
        { failureThreshold: 5 }
      )

      const result = await resilientAPI()
      expect(result.data).toBe('success')
      expect(attempts).toBe(3) // 1 timeout, 1 error, 1 success
    })

    test('should handle cascading failures gracefully', async () => {
      // Simulate service A depending on service B
      const serviceB = jest.fn().mockRejectedValue(new Error('Service B down'))
      
      const serviceA = jest.fn().mockImplementation(async () => {
        try {
          await serviceB()
          return { data: 'success' }
        } catch (error) {
          throw new Error('Service A failed due to Service B')
        }
      })

      const resilientServiceA = withCircuitBreaker(
        async () => {
          // withRetry needs the function wrapped
          return await withRetry(serviceA, { 
            maxAttempts: 2,
            shouldRetry: (error) => {
              // Retry on Service A failures
              return error.message.includes('Service A failed')
            }
          })
        },
        { failureThreshold: 3 }
      )

      // Service A should fail fast after retries
      await expect(resilientServiceA()).rejects.toThrow('Service A failed')
      
      // Should have attempted twice due to retry limit  
      // Note: withRetry will make 2 attempts (maxAttempts: 2)
      expect(serviceA).toHaveBeenCalledTimes(2)
    })
  })

  describe('Real-world API Scenarios', () => {
    test('should handle shipping API rate calculation with resilience', async () => {
      let attempts = 0
      mockExternalAPIs.shippingAPI.getRates.mockImplementation(async () => {
        attempts++
        if (attempts === 1) {
          // Create retryable error
          const error: any = new Error('Temporary network issue')
          error.status = 503
          throw error
        }
        return {
          rates: [
            { carrier: 'UPS', service: 'Ground', price: 12.50 },
            { carrier: 'FedEx', service: 'Express', price: 25.00 }
          ]
        }
      })

      const getRatesWithResilience = async (params: any) => {
        return withRetry(
          () => withTimeout(() => mockExternalAPIs.shippingAPI.getRates(params), 5000),
          { maxAttempts: 3 }
        )
      }

      const result = await getRatesWithResilience({
        origin: 'WH-001',
        destination: 'CUST-ADDR-001',
        weight: 5.5
      })

      expect(result.rates).toHaveLength(2)
      expect(attempts).toBe(2) // Failed once, succeeded on retry
    })

    test('should handle payment processing with circuit breaker', async () => {
      let paymentServiceHealth = 'healthy'
      
      mockExternalAPIs.paymentAPI.processPayment.mockImplementation(async () => {
        if (paymentServiceHealth === 'degraded') {
          throw new Error('Payment service timeout')
        }
        return {
          transactionId: 'TXN-123',
          status: 'approved',
          amount: 100.00
        }
      })

      const processPaymentWithCircuitBreaker = withCircuitBreaker(
        mockExternalAPIs.paymentAPI.processPayment,
        { failureThreshold: 3, resetTimeout: 5000 }
      )

      // Healthy state
      const result1 = await processPaymentWithCircuitBreaker({ amount: 100.00 })
      expect(result1.status).toBe('approved')

      // Service degrades
      paymentServiceHealth = 'degraded'

      // Should fail and eventually open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await processPaymentWithCircuitBreaker({ amount: 50.00 })
        } catch (error) {
          // Expected failures
        }
      }

      // Circuit open - should fail fast
      await expect(
        processPaymentWithCircuitBreaker({ amount: 75.00 })
      ).rejects.toThrow('Circuit breaker is OPEN')
    })

    test('should handle bulk inventory sync with rate limiting', async () => {
      const inventoryUpdates = Array(100).fill(null).map((_, i) => ({
        sku: `TEST-SKU-${i}`,
        cartonsIn: 10 + Math.floor(Math.random() * 100)
      }))

      mockExternalAPIs.inventoryAPI.syncInventory.mockResolvedValue({
        processed: 10,
        success: true
      })

      const syncWithRateLimit = withRateLimit(
        mockExternalAPIs.inventoryAPI.syncInventory,
        { maxRequests: 5, windowMs: 1000 }
      )

      const results = []
      const startTime = Date.now()

      // Process in batches of 10
      for (let i = 0; i < 10; i++) {
        const batch = inventoryUpdates.slice(i * 10, (i + 1) * 10)
        try {
          const result = await syncWithRateLimit(batch)
          results.push(result)
        } catch (error: any) {
          if (error.message.includes('Rate limit')) {
            // Wait for rate limit reset
            await new Promise(resolve => setTimeout(resolve, 1100))
            // Retry after waiting
            const result = await syncWithRateLimit(batch)
            results.push(result)
          } else {
            throw error
          }
        }
      }

      const duration = Date.now() - startTime

      expect(results).toHaveLength(10)
      expect(duration).toBeGreaterThan(1000) // Should have rate limit delays
    })
  })

  describe('Monitoring and Observability', () => {
    test('should track API call metrics', async () => {
      const metrics = {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        totalDuration: 0,
        errors: [] as any[]
      }

      const mockAPIWithMetrics = jest.fn().mockImplementation(async () => {
        const startTime = Date.now()
        metrics.totalCalls++
        
        try {
          // Simulate some processing time
          await new Promise(resolve => setTimeout(resolve, 10))
          if (Math.random() > 0.8) {
            throw new Error('Random failure')
          }
          const result = { data: 'success' }
          metrics.successfulCalls++
          metrics.totalDuration += Date.now() - startTime
          return result
        } catch (error) {
          metrics.failedCalls++
          metrics.errors.push(error)
          metrics.totalDuration += Date.now() - startTime
          throw error
        }
      })

      // Make multiple calls
      for (let i = 0; i < 10; i++) {
        try {
          await mockAPIWithMetrics()
        } catch (error) {
          // Expected some failures
        }
      }

      expect(metrics.totalCalls).toBe(10)
      expect(metrics.successfulCalls + metrics.failedCalls).toBe(10)
      expect(metrics.totalDuration).toBeGreaterThan(0)
      
      const averageResponseTime = metrics.totalDuration / metrics.totalCalls
      expect(averageResponseTime).toBeLessThan(100) // Should be fast
    })

    test('should log circuit breaker state changes', async () => {
      const stateChanges: any[] = []
      
      const mockAPI = jest.fn().mockRejectedValue(new Error('Service down'))
      
      const circuitBreakerWithLogging = withCircuitBreaker(
        mockAPI,
        {
          failureThreshold: 2,
          resetTimeout: 500,
          onStateChange: (from: string, to: string) => {
            stateChanges.push({ from, to, timestamp: Date.now() })
          }
        }
      )

      // Trigger state changes - need to fail twice to open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await circuitBreakerWithLogging()
        } catch (error) {
          // Expected failures
        }
      }

      // Now circuit should be open, try one more call to trigger state check
      try {
        await circuitBreakerWithLogging()
      } catch (error) {
        // Expected - circuit is open
      }

      // Should have changed from CLOSED to OPEN after 2 failures
      expect(stateChanges).toContainEqual(
        expect.objectContaining({ from: 'CLOSED', to: 'OPEN' })
      )

      // Wait for reset
      await new Promise(resolve => setTimeout(resolve, 600))

      // Mock API should now succeed
      mockAPI.mockResolvedValue({ data: 'success' })

      // Try again (will move to HALF_OPEN and then to CLOSED)
      const result = await circuitBreakerWithLogging()
      expect(result.data).toBe('success')

      // Check we have state changes (at least CLOSED -> OPEN)
      expect(stateChanges.length).toBeGreaterThanOrEqual(1)
      expect(stateChanges).toContainEqual(
        expect.objectContaining({ from: 'CLOSED', to: 'OPEN' })
      )
    })
  })
})