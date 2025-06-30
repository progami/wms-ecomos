import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Database Connection Errors and Recovery', () => {
  let originalConnect: any;
  let originalTransaction: any;
  let testWarehouseId: string;
  let testSkuId: string;

  beforeEach(async () => {
    // Store original methods
    originalConnect = prisma.$connect;
    originalTransaction = prisma.$transaction;

    // Setup test data
    try {
      const warehouse = await prisma.warehouse.create({
        data: {
          name: 'DB Error Test Warehouse',
          code: 'DBETW',
          address: 'Test Address',
          status: 'active'
        }
      });
      testWarehouseId = warehouse.id;

      const sku = await prisma.sku.create({
        data: {
          name: 'DB Error Test SKU',
          code: 'SKU-DBERROR',
          barcode: 'DBE123',
          status: 'active'
        }
      });
      testSkuId = sku.id;
    } catch (error) {
      console.error('Setup failed:', error);
    }
  });

  afterEach(async () => {
    // Restore original methods
    prisma.$connect = originalConnect;
    prisma.$transaction = originalTransaction;

    // Cleanup
    try {
      if (testSkuId) {
        await prisma.inventoryTransaction.deleteMany({});
        await prisma.inventoryBalance.deleteMany({});
        await prisma.sku.delete({ where: { id: testSkuId } });
      }
      if (testWarehouseId) {
        await prisma.warehouse.delete({ where: { id: testWarehouseId } });
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });

  test('Connection timeout handling', async () => {
    let connectionAttempts = 0;
    
    // Mock connection failures
    prisma.$connect = jest.fn(async () => {
      connectionAttempts++;
      if (connectionAttempts < 3) {
        throw new Error('Connection timeout');
      }
      return originalConnect.call(prisma);
    });

    const connectWithRetry = async (maxRetries = 3, delay = 1000) => {
      let lastError;
      
      for (let i = 0; i < maxRetries; i++) {
        try {
          await prisma.$connect();
          return true;
        } catch (error) {
          lastError = error;
          if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      throw lastError;
    };

    const connected = await connectWithRetry();
    expect(connected).toBe(true);
    expect(connectionAttempts).toBe(3);
  });

  test('Transaction deadlock recovery', async () => {
    let deadlockCount = 0;
    
    // Mock transaction with deadlock
    prisma.$transaction = jest.fn(async (fn) => {
      deadlockCount++;
      if (deadlockCount === 1) {
        const error: any = new Error('Deadlock detected');
        error.code = 'P2034';
        throw error;
      }
      return originalTransaction.call(prisma, fn);
    });

    const executeWithDeadlockRetry = async (operation: any) => {
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          attempts++;
          return await operation();
        } catch (error: any) {
          if (error.code === 'P2034' && attempts < maxAttempts) {
            // Deadlock detected, wait and retry
            await new Promise(resolve => 
              setTimeout(resolve, Math.random() * 100 + 50)
            );
            continue;
          }
          throw error;
        }
      }
    };

    const result = await executeWithDeadlockRetry(async () => {
      return await prisma.$transaction(async (tx) => {
        // Create inventory transaction
        const transaction = await tx.inventoryTransaction.create({
          data: {
            type: 'receive',
            status: 'completed',
            warehouseId: testWarehouseId,
            skuId: testSkuId,
            palletCount: 5,
            unitsPerPallet: 100,
            totalUnits: 500,
            batchLotNumber: 'DEADLOCK-TEST',
            transactionDate: new Date()
          }
        });

        // Update balance
        await tx.inventoryBalance.upsert({
          where: {
            warehouseId_skuId: {
              warehouseId: testWarehouseId,
              skuId: testSkuId
            }
          },
          update: {
            totalUnits: { increment: 500 },
            totalPallets: { increment: 5 }
          },
          create: {
            warehouseId: testWarehouseId,
            skuId: testSkuId,
            totalUnits: 500,
            totalPallets: 5
          }
        });

        return transaction;
      });
    });

    expect(result).toBeDefined();
    expect(deadlockCount).toBe(2); // First attempt failed, second succeeded
  });

  test('Connection pool recovery after database restart', async () => {
    const healthCheck = async () => {
      try {
        await prisma.$queryRaw`SELECT 1`;
        return true;
      } catch (error) {
        return false;
      }
    };

    // Simulate database going down and coming back up
    let dbAvailable = true;
    const originalQueryRaw = prisma.$queryRaw;
    
    prisma.$queryRaw = jest.fn(async (query: any) => {
      if (!dbAvailable) {
        throw new Error('Connection refused');
      }
      return originalQueryRaw.call(prisma, query);
    });

    // Initial health check should pass
    expect(await healthCheck()).toBe(true);

    // Simulate database going down
    dbAvailable = false;
    expect(await healthCheck()).toBe(false);

    // Implement reconnection strategy
    const reconnectWithBackoff = async (maxAttempts = 5) => {
      for (let i = 0; i < maxAttempts; i++) {
        // Simulate database coming back up after 3 attempts
        if (i === 3) {
          dbAvailable = true;
        }

        if (await healthCheck()) {
          // Reset connection pool
          await prisma.$disconnect();
          await prisma.$connect();
          return true;
        }

        // Exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, i) * 100)
        );
      }
      
      return false;
    };

    const reconnected = await reconnectWithBackoff();
    expect(reconnected).toBe(true);
    expect(await healthCheck()).toBe(true);

    // Restore original method
    prisma.$queryRaw = originalQueryRaw;
  });

  test('Handling unique constraint violations gracefully', async () => {
    const batchNumber = 'UNIQUE-BATCH-001';
    
    // Create first transaction
    await prisma.inventoryTransaction.create({
      data: {
        type: 'receive',
        status: 'completed',
        warehouseId: testWarehouseId,
        skuId: testSkuId,
        palletCount: 5,
        unitsPerPallet: 100,
        totalUnits: 500,
        batchLotNumber: batchNumber,
        transactionDate: new Date()
      }
    });

    // Attempt to create duplicate
    const createDuplicate = async () => {
      try {
        await prisma.inventoryTransaction.create({
          data: {
            type: 'receive',
            status: 'completed',
            warehouseId: testWarehouseId,
            skuId: testSkuId,
            palletCount: 3,
            unitsPerPallet: 100,
            totalUnits: 300,
            batchLotNumber: batchNumber,
            transactionDate: new Date()
          }
        });
      } catch (error: any) {
        if (error.code === 'P2002') {
          // Unique constraint violation - generate new batch number
          const newBatchNumber = `${batchNumber}-${Date.now()}`;
          return await prisma.inventoryTransaction.create({
            data: {
              type: 'receive',
              status: 'completed',
              warehouseId: testWarehouseId,
              skuId: testSkuId,
              palletCount: 3,
              unitsPerPallet: 100,
              totalUnits: 300,
              batchLotNumber: newBatchNumber,
              transactionDate: new Date()
            }
          });
        }
        throw error;
      }
    };

    const result = await createDuplicate();
    expect(result).toBeDefined();
    expect(result.batchLotNumber).not.toBe(batchNumber);

    // Verify both transactions exist
    const transactions = await prisma.inventoryTransaction.findMany({
      where: {
        warehouseId: testWarehouseId,
        skuId: testSkuId
      }
    });
    expect(transactions.length).toBe(2);
  });

  test('Query timeout and cancellation', async () => {
    // Create large dataset for slow query simulation
    const largeDataPromises = Array(100).fill(null).map(async (_, i) => {
      return prisma.inventoryTransaction.create({
        data: {
          type: i % 2 === 0 ? 'receive' : 'ship',
          status: 'completed',
          warehouseId: testWarehouseId,
          skuId: testSkuId,
          palletCount: 1,
          unitsPerPallet: 100,
          totalUnits: 100,
          batchLotNumber: `BATCH-TIMEOUT-${i}`,
          trackingNumber: i % 2 === 1 ? `TRACK-${i}` : undefined,
          transactionDate: new Date()
        }
      });
    });

    await Promise.all(largeDataPromises);

    // Implement query with timeout
    const executeWithTimeout = async (query: Promise<any>, timeoutMs: number) => {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), timeoutMs);
      });

      try {
        return await Promise.race([query, timeoutPromise]);
      } catch (error) {
        // Cancel the query if possible
        throw error;
      }
    };

    // Test with very short timeout
    const slowQuery = prisma.inventoryTransaction.findMany({
      where: {
        warehouseId: testWarehouseId,
        transactionDate: {
          gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        }
      },
      include: {
        warehouse: true,
        sku: true
      },
      orderBy: [
        { transactionDate: 'desc' },
        { totalUnits: 'desc' }
      ]
    });

    await expect(
      executeWithTimeout(slowQuery, 1)
    ).rejects.toThrow('Query timeout');

    // Test with reasonable timeout
    const result = await executeWithTimeout(slowQuery, 5000);
    expect(result.length).toBe(100);
  });

  test('Handling database schema migrations during runtime', async () => {
    // Simulate schema version mismatch
    const checkSchemaVersion = async () => {
      try {
        const result = await prisma.$queryRaw`
          SELECT version FROM _prisma_migrations 
          ORDER BY started_at DESC 
          LIMIT 1
        `;
        return result[0]?.version || null;
      } catch (error) {
        return null;
      }
    };

    const currentVersion = await checkSchemaVersion();

    // Implement migration detection and handling
    const handleSchemaChange = async (operation: () => Promise<any>) => {
      try {
        return await operation();
      } catch (error: any) {
        // Check if error is due to schema mismatch
        if (error.code === 'P2021' || error.message.includes('column')) {
          // Log schema issue
          console.error('Schema mismatch detected:', error.message);
          
          // In production, you might:
          // 1. Switch to read-only mode
          // 2. Notify administrators
          // 3. Queue the operation for retry after migration
          
          throw new Error('Database schema update required. Please try again later.');
        }
        throw error;
      }
    };

    // Test operation that would fail with schema mismatch
    const result = await handleSchemaChange(async () => {
      return await prisma.sku.findMany({
        where: { status: 'active' }
      });
    });

    expect(Array.isArray(result)).toBe(true);
  });

  test('Graceful degradation with read replica failures', async () => {
    // Simulate read replica configuration
    class DatabaseRouter {
      private primaryClient: any;
      private replicaClients: any[];
      private healthyReplicas: Set<number>;

      constructor(primary: any, replicas: any[]) {
        this.primaryClient = primary;
        this.replicaClients = replicas;
        this.healthyReplicas = new Set(replicas.map((_, i) => i));
      }

      async executeRead(query: () => Promise<any>) {
        // Try replicas first
        const availableReplicas = Array.from(this.healthyReplicas);
        
        for (const replicaIndex of availableReplicas) {
          try {
            const replica = this.replicaClients[replicaIndex];
            return await query.call(replica);
          } catch (error) {
            // Mark replica as unhealthy
            this.healthyReplicas.delete(replicaIndex);
            
            // Schedule health check
            setTimeout(() => this.checkReplicaHealth(replicaIndex), 30000);
          }
        }

        // Fall back to primary
        console.warn('All read replicas failed, falling back to primary');
        return await query.call(this.primaryClient);
      }

      async executeWrite(query: () => Promise<any>) {
        // Writes always go to primary
        return await query.call(this.primaryClient);
      }

      private async checkReplicaHealth(replicaIndex: number) {
        try {
          const replica = this.replicaClients[replicaIndex];
          await replica.$queryRaw`SELECT 1`;
          this.healthyReplicas.add(replicaIndex);
        } catch (error) {
          // Replica still unhealthy, check again later
          setTimeout(() => this.checkReplicaHealth(replicaIndex), 60000);
        }
      }
    }

    // Mock replica clients
    const mockReplicas = [
      { $queryRaw: jest.fn().mockRejectedValue(new Error('Replica 1 down')) },
      { $queryRaw: jest.fn().mockRejectedValue(new Error('Replica 2 down')) }
    ];

    const router = new DatabaseRouter(prisma, mockReplicas);

    // Read query should fall back to primary
    const result = await router.executeRead(async function() {
      return await this.$queryRaw`SELECT COUNT(*) as count FROM "Sku"`;
    });

    expect(result).toBeDefined();
  });
});