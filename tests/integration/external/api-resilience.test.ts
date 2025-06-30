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
          throw new Error('Service temporarily unavailable')
        }
        return { success: true, data: 'OK' }
      })

      const resilientAPI = withRetry(mockAPI, {
        maxAttempts: 3,
        initialDelay: 100,
        maxDelay: 1000,
        factor: 2
      })

      const startTime = Date.now()
      const result = await resilientAPI()
      const duration = Date.now() - startTime

      expect(result.success).toBe(true)
      expect(attempts).toBe(3)
      // Should have delays: 100ms + 200ms = 300ms minimum
      expect(duration).toBeGreaterThan(300)
    })

    test('should not retry non-retryable errors', async () => {
      const mockAPI = jest.fn().mockRejectedValue(
        new Error('Invalid API key')
      )

      const resilientAPI = withRetry(mockAPI, {
        maxAttempts: 3,
        shouldRetry: (error) => {
          return !error.message.includes('Invalid API key')
        }
      })

      await expect(resilientAPI()).rejects.toThrow('Invalid API key')
      expect(mockAPI).toHaveBeenCalledTimes(1) // No retries
    })

    test('should handle jittered backoff to prevent thundering herd', async () => {
      const delays: number[] = []
      const mockAPI = jest.fn().mockImplementation(() => {
        throw new Error('Retry needed')
      })

      const resilientAPI = withRetry(mockAPI, {
        maxAttempts: 5,
        initialDelay: 100,
        jitter: true,
        onRetry: (attempt, delay) => {
          delays.push(delay)
        }
      })

      try {
        await resilientAPI()
      } catch (error) {
        // Expected to fail after all retries
      }

      // Verify delays have some variation (jitter)
      const uniqueDelays = new Set(delays)
      expect(uniqueDelays.size).toBeGreaterThan(1)
    })
  })

  describe('Timeout Handling', () => {
    test('should timeout long-running API calls', async () => {
      const mockSlowAPI = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 5000))
        return { data: 'too late' }
      })

      const timeoutAPI = withTimeout(mockSlowAPI, 1000)

      await expect(timeoutAPI()).rejects.toThrow('Operation timed out')
    })

    test('should handle timeout with cleanup', async () => {
      let cleaned = false
      const mockAPI = jest.fn().mockImplementation(async (signal: AbortSignal) => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => resolve({ data: 'success' }), 2000)
          
          signal.addEventListener('abort', () => {
            clearTimeout(timeout)
            cleaned = true
            reject(new Error('Aborted'))
          })
        })
      })

      const timeoutAPI = withTimeout(mockAPI, 500)

      try {
        await timeoutAPI()
      } catch (error) {
        // Expected timeout
      }

      // Give time for cleanup
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(cleaned).toBe(true)
    })

    test('should complete fast API calls without timeout', async () => {
      const mockFastAPI = jest.fn().mockResolvedValue({ data: 'quick response' })

      const timeoutAPI = withTimeout(mockFastAPI, 1000)
      const result = await timeoutAPI()

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

      const circuitBreaker = withCircuitBreaker(mockFailingAPI, {
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

      const circuitBreaker = withCircuitBreaker(mockAPI, {
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
      let failCount = 0
      const mockAPI = jest.fn().mockImplementation(() => {
        failCount++
        if (failCount <= 3 || failCount === 5) {
          throw new Error('Service error')
        }
        return { data: 'success' }
      })

      const circuitBreaker = withCircuitBreaker(mockAPI, {
        failureThreshold: 3,
        resetTimeout: 300,
        halfOpenRequests: 2
      })

      // Open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker()
        } catch (error) {
          // Expected
        }
      }

      // Wait for reset
      await new Promise(resolve => setTimeout(resolve, 400))

      // First half-open request succeeds
      const result1 = await circuitBreaker()
      expect(result1.data).toBe('success')

      // Second half-open request fails, circuit reopens
      await expect(circuitBreaker()).rejects.toThrow('Service error')

      // Circuit should be open again
      await expect(circuitBreaker()).rejects.toThrow('Circuit breaker is OPEN')
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
        if (attempts < 2) {
          await new Promise(resolve => setTimeout(resolve, 2000)) // Timeout
        } else if (attempts < 4) {
          throw new Error('Service error') // Retry
        }
        return { data: 'success' }
      })

      // Apply all patterns
      const resilientAPI = withCircuitBreaker(
        withRetry(
          withTimeout(mockAPI, 1000),
          { maxAttempts: 3 }
        ),
        { failureThreshold: 5 }
      )

      const result = await resilientAPI()
      expect(result.data).toBe('success')
      expect(attempts).toBe(4) // 1 timeout, 2 errors, 1 success
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
        withRetry(serviceA, { maxAttempts: 2 }),
        { failureThreshold: 3 }
      )

      // Service A should fail fast after retries
      await expect(resilientServiceA()).rejects.toThrow('Service A failed')
      
      // Circuit should not be open yet (only 2 attempts due to retry limit)
      expect(serviceA).toHaveBeenCalledTimes(2)
    })
  })

  describe('Real-world API Scenarios', () => {
    test('should handle shipping API rate calculation with resilience', async () => {
      let attempts = 0
      mockExternalAPIs.shippingAPI.getRates.mockImplementation(async () => {
        attempts++
        if (attempts === 1) {
          throw new Error('Temporary network issue')
        }
        return {
          rates: [
            { carrier: 'UPS', service: 'Ground', price: 12.50 },
            { carrier: 'FedEx', service: 'Express', price: 25.00 }
          ]
        }
      })

      const getRatesWithResilience = withRetry(
        withTimeout(mockExternalAPIs.shippingAPI.getRates, 5000),
        { maxAttempts: 3 }
      )

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
        quantity: Math.floor(Math.random() * 100)
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
            await new Promise(resolve => setTimeout(resolve, 1000))
            // Retry
            const result = await syncWithRateLimit(batch)
            results.push(result)
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
      
      const circuitBreakerWithLogging = withCircuitBreaker(mockAPI, {
        failureThreshold: 2,
        resetTimeout: 500,
        onStateChange: (from: string, to: string) => {
          stateChanges.push({ from, to, timestamp: Date.now() })
        }
      })

      // Trigger state changes
      for (let i = 0; i < 2; i++) {
        try {
          await circuitBreakerWithLogging()
        } catch (error) {
          // Expected
        }
      }

      // Should have changed from CLOSED to OPEN
      expect(stateChanges).toContainEqual(
        expect.objectContaining({ from: 'CLOSED', to: 'OPEN' })
      )

      // Wait for reset
      await new Promise(resolve => setTimeout(resolve, 600))

      // Try again (will move to HALF_OPEN)
      try {
        await circuitBreakerWithLogging()
      } catch (error) {
        // Expected
      }

      expect(stateChanges.length).toBeGreaterThan(1)
    })
  })
})