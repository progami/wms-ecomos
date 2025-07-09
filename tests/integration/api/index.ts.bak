// API Integration Test Suite
// This file serves as the main entry point for all API integration tests

export * from './auth.test'
export * from './skus.test'
export * from './inventory.test'
export * from './transactions.test'
export * from './finance.test'
export * from './import-export.test'
export * from './dashboard-reports.test'
export * from './user-management.test'
export * from './reconciliation-misc.test'

// Test configuration
export const TEST_CONFIG = {
  // Test server configuration
  TEST_SERVER_URL: process.env.TEST_SERVER_URL || 'http://localhost:3000',
  
  // Test database configuration
  TEST_DATABASE_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
  
  // Test timeouts
  SETUP_TIMEOUT: 30000,
  TEST_TIMEOUT: 10000,
  
  // Rate limiting configuration for tests
  RATE_LIMIT_WINDOW: 1000, // 1 second for tests
  RATE_LIMIT_MAX_REQUESTS: 100,
  
  // File upload limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  
  // Pagination defaults
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100
}

// Common test data
export const TEST_DATA = {
  // Valid test credentials
  VALID_CREDENTIALS: {
    email: 'test@example.com',
    password: 'password123'
  },
  
  // Sample SKU data
  SAMPLE_SKU: {
    skuCode: 'TEST-SKU-001',
    asin: 'B0TEST001',
    description: 'Test Product Description',
    packSize: 10,
    material: 'Test Material',
    unitDimensionsCm: '10x10x10',
    unitWeightKg: 0.5,
    unitsPerCarton: 24,
    cartonDimensionsCm: '40x40x40',
    cartonWeightKg: 12.5,
    packagingType: 'Box',
    notes: 'Test notes',
    isActive: true
  },
  
  // Sample warehouse data
  SAMPLE_WAREHOUSE: {
    warehouseId: 'WH-TEST-001',
    name: 'Test Warehouse',
    type: 'FBA',
    country: 'US',
    isActive: true
  },
  
  // Sample transaction data
  SAMPLE_TRANSACTION: {
    transactionType: 'RECEIVE',
    transactionSubtype: 'STANDARD',
    quantity: 100,
    referenceNumber: 'REF-TEST-001',
    amazonShipmentId: 'FBATEST001',
    transactionDate: new Date().toISOString(),
    status: 'COMPLETED'
  }
}

// Test utilities
export const TEST_UTILS = {
  // Generate random test data
  generateRandomSKU: () => ({
    ...TEST_DATA.SAMPLE_SKU,
    skuCode: `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    asin: `B0${Math.random().toString(36).substr(2, 9).toUpperCase()}`
  }),
  
  generateRandomWarehouse: () => ({
    ...TEST_DATA.SAMPLE_WAREHOUSE,
    warehouseId: `WH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: `Test Warehouse ${Date.now()}`
  }),
  
  generateRandomTransaction: () => ({
    ...TEST_DATA.SAMPLE_TRANSACTION,
    referenceNumber: `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    amazonShipmentId: `FBA${Math.random().toString(36).substr(2, 9).toUpperCase()}`
  }),
  
  // Wait for async operations
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Retry helper for flaky operations
  retry: async <T>(fn: () => Promise<T>, maxAttempts = 3, delay = 1000): Promise<T> => {
    let lastError: Error | undefined
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error
        if (attempt < maxAttempts) {
          await TEST_UTILS.wait(delay * attempt)
        }
      }
    }
    
    throw lastError
  }
}