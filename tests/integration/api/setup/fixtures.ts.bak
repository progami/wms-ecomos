// Mock fixtures for integration tests
import { MockPrismaClient } from './test-db'

export async function createTestSku(prisma: MockPrismaClient, overrides?: any) {
  const mockSku = {
    id: `sku-${Math.random().toString(36).substr(2, 9)}`,
    skuCode: `SKU-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    description: 'Test Product',
    unitsPerCarton: 24,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
  
  ;(prisma.sku.create as jest.Mock).mockResolvedValueOnce(mockSku)
  
  return mockSku
}

export async function createTestWarehouse(prisma: MockPrismaClient, overrides?: any) {
  const mockWarehouse = {
    id: `warehouse-${Math.random().toString(36).substr(2, 9)}`,
    code: `WH-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    name: 'Test Warehouse',
    type: 'STANDARD' as const,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
  
  ;(prisma.warehouse.create as jest.Mock).mockResolvedValueOnce(mockWarehouse)
  
  return mockWarehouse
}

export async function createTestInventoryBalance(
  prisma: MockPrismaClient,
  skuId: string,
  warehouseId: string,
  overrides?: any
) {
  const mockBalance = {
    id: `balance-${Math.random().toString(36).substr(2, 9)}`,
    skuId,
    warehouseId,
    batchLot: `BATCH-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    currentCartons: 10,
    currentUnits: 240,
    currentPallets: 1,
    lastTransactionDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
  
  ;(prisma.inventoryBalance.create as jest.Mock).mockResolvedValueOnce(mockBalance)
  
  return mockBalance
}

export async function createTestTransaction(
  prisma: MockPrismaClient,
  skuId: string,
  warehouseId: string,
  userId: string,
  overrides?: any
) {
  const mockTransaction = {
    id: `trans-${Math.random().toString(36).substr(2, 9)}`,
    skuId,
    warehouseId,
    transactionType: 'RECEIVE',
    transactionDate: new Date(),
    referenceId: `REF-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    batchLot: `BATCH-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    cartonsIn: 10,
    cartonsOut: 0,
    unitsIn: 240,
    unitsOut: 0,
    isReconciled: false,
    createdById: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
  
  ;(prisma.inventoryTransaction.create as jest.Mock).mockResolvedValueOnce(mockTransaction)
  
  return mockTransaction
}