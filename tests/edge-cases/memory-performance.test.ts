import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Memory monitoring utilities
class MemoryMonitor {
  private initialMemory: NodeJS.MemoryUsage;
  private checkpoints: Map<string, NodeJS.MemoryUsage> = new Map();

  start() {
    this.initialMemory = process.memoryUsage();
  }

  checkpoint(name: string) {
    this.checkpoints.set(name, process.memoryUsage());
  }

  getMemoryGrowth(checkpointName?: string): number {
    const current = process.memoryUsage();
    const baseline = checkpointName 
      ? this.checkpoints.get(checkpointName) || this.initialMemory
      : this.initialMemory;
    
    return (current.heapUsed - baseline.heapUsed) / 1024 / 1024; // MB
  }

  detectLeak(threshold = 50): boolean {
    const growth = this.getMemoryGrowth();
    return growth > threshold;
  }
}

describe('Memory Leaks and Performance Degradation', () => {
  let monitor: MemoryMonitor;
  let testWarehouseId: string;
  let testSkuId: string;

  beforeEach(async () => {
    monitor = new MemoryMonitor();
    monitor.start();

    // Setup test data
    const warehouse = await prisma.warehouse.create({
      data: {
        name: 'Memory Test Warehouse',
        code: 'MTW',
        address: 'Test Address',
        status: 'active'
      }
    });
    testWarehouseId = warehouse.id;

    const sku = await prisma.sku.create({
      data: {
        name: 'Memory Test SKU',
        code: 'SKU-MEMORY',
        barcode: 'MEM123',
        status: 'active'
      }
    });
    testSkuId = sku.id;
  });

  afterEach(async () => {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Cleanup
    await prisma.inventoryTransaction.deleteMany({});
    await prisma.inventoryBalance.deleteMany({});
    await prisma.sku.delete({ where: { id: testSkuId } });
    await prisma.warehouse.delete({ where: { id: testWarehouseId } });
  });

  test('Detect memory leaks in large query operations', async () => {
    // Create large dataset
    const batchSize = 1000;
    const batches = 10;

    for (let batch = 0; batch < batches; batch++) {
      const transactions = Array(batchSize).fill(null).map((_, i) => ({
        type: 'receive' as const,
        status: 'completed' as const,
        warehouseId: testWarehouseId,
        skuId: testSkuId,
        palletCount: 1,
        unitsPerPallet: 100,
        totalUnits: 100,
        batchLotNumber: `BATCH-${batch}-${i}`,
        transactionDate: new Date()
      }));

      await prisma.inventoryTransaction.createMany({ data: transactions });
    }

    monitor.checkpoint('after-insert');

    // Perform multiple large queries without proper cleanup
    const leakyFunction = async () => {
      const results = [];
      
      for (let i = 0; i < 5; i++) {
        const data = await prisma.inventoryTransaction.findMany({
          where: { warehouseId: testWarehouseId },
          include: {
            warehouse: true,
            sku: true
          }
        });
        
        // Intentionally keeping references (memory leak)
        results.push(data);
      }
      
      return results;
    };

    // Non-leaky alternative using cursor-based pagination
    const efficientFunction = async () => {
      let cursor = undefined;
      let hasMore = true;
      let totalProcessed = 0;

      while (hasMore) {
        const batch = await prisma.inventoryTransaction.findMany({
          where: { warehouseId: testWarehouseId },
          take: 100,
          skip: cursor ? 1 : 0,
          cursor: cursor ? { id: cursor } : undefined,
          orderBy: { id: 'asc' }
        });

        if (batch.length === 0) {
          hasMore = false;
        } else {
          totalProcessed += batch.length;
          cursor = batch[batch.length - 1].id;
          
          // Process and release batch immediately
          batch.length = 0;
        }
      }

      return totalProcessed;
    };

    // Test leaky function
    await leakyFunction();
    monitor.checkpoint('after-leaky');
    const leakyGrowth = monitor.getMemoryGrowth('after-insert');

    // Test efficient function
    const processed = await efficientFunction();
    monitor.checkpoint('after-efficient');
    const efficientGrowth = monitor.getMemoryGrowth('after-leaky');

    expect(processed).toBe(batchSize * batches);
    expect(efficientGrowth).toBeLessThan(leakyGrowth);
  });

  test('Event listener cleanup to prevent memory leaks', async () => {
    class EventEmitter {
      private listeners: Map<string, Function[]> = new Map();

      on(event: string, callback: Function) {
        if (!this.listeners.has(event)) {
          this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback);
      }

      off(event: string, callback: Function) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
          const index = callbacks.indexOf(callback);
          if (index > -1) {
            callbacks.splice(index, 1);
          }
        }
      }

      emit(event: string, data: any) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
          callbacks.forEach(cb => cb(data));
        }
      }

      removeAllListeners() {
        this.listeners.clear();
      }

      listenerCount(event: string): number {
        return this.listeners.get(event)?.length || 0;
      }
    }

    const emitter = new EventEmitter();
    const callbacks: Function[] = [];

    // Simulate adding many listeners (potential leak)
    for (let i = 0; i < 1000; i++) {
      const callback = (data: any) => {
        console.log(`Handler ${i}: ${data}`);
      };
      callbacks.push(callback);
      emitter.on('data', callback);
    }

    expect(emitter.listenerCount('data')).toBe(1000);

    // Proper cleanup
    callbacks.forEach(cb => emitter.off('data', cb));
    expect(emitter.listenerCount('data')).toBe(0);

    // Test with automatic cleanup wrapper
    class ManagedEventEmitter extends EventEmitter {
      private subscriptions: Map<any, Set<{ event: string; callback: Function }>> = new Map();

      subscribe(context: any, event: string, callback: Function) {
        this.on(event, callback);
        
        if (!this.subscriptions.has(context)) {
          this.subscriptions.set(context, new Set());
        }
        this.subscriptions.get(context)!.add({ event, callback });
      }

      unsubscribeAll(context: any) {
        const subs = this.subscriptions.get(context);
        if (subs) {
          subs.forEach(({ event, callback }) => {
            this.off(event, callback);
          });
          this.subscriptions.delete(context);
        }
      }
    }

    const managedEmitter = new ManagedEventEmitter();
    const context = { id: 'test-context' };

    // Subscribe with context
    for (let i = 0; i < 100; i++) {
      managedEmitter.subscribe(context, 'update', (data: any) => {
        console.log(`Managed handler ${i}: ${data}`);
      });
    }

    expect(managedEmitter.listenerCount('update')).toBe(100);

    // Clean up all listeners for context
    managedEmitter.unsubscribeAll(context);
    expect(managedEmitter.listenerCount('update')).toBe(0);
  });

  test('Cache memory management and eviction', async () => {
    class LRUCache<K, V> {
      private capacity: number;
      private cache: Map<K, { value: V; lastAccessed: number }> = new Map();
      private accessCount = 0;

      constructor(capacity: number) {
        this.capacity = capacity;
      }

      get(key: K): V | undefined {
        const entry = this.cache.get(key);
        if (entry) {
          entry.lastAccessed = ++this.accessCount;
          return entry.value;
        }
        return undefined;
      }

      set(key: K, value: V): void {
        if (this.cache.size >= this.capacity && !this.cache.has(key)) {
          // Evict least recently used
          let lruKey: K | undefined;
          let lruAccess = Infinity;

          for (const [k, v] of this.cache.entries()) {
            if (v.lastAccessed < lruAccess) {
              lruAccess = v.lastAccessed;
              lruKey = k;
            }
          }

          if (lruKey !== undefined) {
            this.cache.delete(lruKey);
          }
        }

        this.cache.set(key, {
          value,
          lastAccessed: ++this.accessCount
        });
      }

      size(): number {
        return this.cache.size;
      }

      clear(): void {
        this.cache.clear();
      }
    }

    const cache = new LRUCache<string, any>(100);

    // Fill cache with large objects
    for (let i = 0; i < 150; i++) {
      const largeObject = {
        id: i,
        data: new Array(1000).fill(`Data ${i}`),
        metadata: {
          created: new Date(),
          accessed: 0
        }
      };
      cache.set(`key-${i}`, largeObject);
    }

    // Cache should not exceed capacity
    expect(cache.size()).toBeLessThanOrEqual(100);

    // Test that LRU eviction works
    cache.get('key-50'); // Access to make it recently used
    cache.set('key-new', { id: 'new' });

    // key-50 should still be in cache
    expect(cache.get('key-50')).toBeDefined();
    
    // Early keys should have been evicted
    expect(cache.get('key-0')).toBeUndefined();

    // Clear cache to free memory
    cache.clear();
    expect(cache.size()).toBe(0);
  });

  test('Streaming large datasets to prevent memory overflow', async () => {
    // Create large dataset
    const totalRecords = 5000;
    const records = Array(totalRecords).fill(null).map((_, i) => ({
      type: 'receive' as const,
      status: 'completed' as const,
      warehouseId: testWarehouseId,
      skuId: testSkuId,
      palletCount: 1,
      unitsPerPallet: 100,
      totalUnits: 100,
      batchLotNumber: `STREAM-${i}`,
      transactionDate: new Date()
    }));

    await prisma.inventoryTransaction.createMany({ data: records });

    // Implement streaming processor
    class DataStreamer {
      async *streamData(batchSize = 100) {
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
          const batch = await prisma.inventoryTransaction.findMany({
            where: { warehouseId: testWarehouseId },
            skip: offset,
            take: batchSize,
            orderBy: { id: 'asc' }
          });

          if (batch.length === 0) {
            hasMore = false;
          } else {
            yield batch;
            offset += batch.length;
          }
        }
      }

      async processStream(processor: (batch: any[]) => Promise<void>) {
        let processedCount = 0;
        const startMemory = process.memoryUsage().heapUsed;

        for await (const batch of this.streamData()) {
          await processor(batch);
          processedCount += batch.length;

          // Check memory usage periodically
          if (processedCount % 1000 === 0) {
            const currentMemory = process.memoryUsage().heapUsed;
            const memoryGrowth = (currentMemory - startMemory) / 1024 / 1024;
            
            // Memory growth should be minimal with streaming
            expect(memoryGrowth).toBeLessThan(50);
          }
        }

        return processedCount;
      }
    }

    const streamer = new DataStreamer();
    let totalProcessed = 0;

    const processed = await streamer.processStream(async (batch) => {
      // Process batch
      totalProcessed += batch.length;
      
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Clear references to allow garbage collection
      batch.length = 0;
    });

    expect(processed).toBe(totalRecords);
    expect(totalProcessed).toBe(totalRecords);
  });

  test('Connection pool leak detection', async () => {
    class ConnectionPool {
      private connections: Set<any> = new Set();
      private maxConnections: number;
      private activeCount = 0;

      constructor(maxConnections = 10) {
        this.maxConnections = maxConnections;
      }

      async acquire(): Promise<any> {
        if (this.activeCount >= this.maxConnections) {
          throw new Error('Connection pool exhausted');
        }

        const connection = {
          id: Date.now(),
          query: async (sql: string) => {
            // Simulate query
            return [];
          },
          release: () => {
            this.connections.delete(connection);
            this.activeCount--;
          }
        };

        this.connections.add(connection);
        this.activeCount++;
        return connection;
      }

      getActiveConnections(): number {
        return this.activeCount;
      }

      async closeAll(): Promise<void> {
        for (const conn of this.connections) {
          conn.release();
        }
      }
    }

    const pool = new ConnectionPool(5);
    const leakedConnections: any[] = [];

    // Simulate connection leaks
    for (let i = 0; i < 3; i++) {
      const conn = await pool.acquire();
      leakedConnections.push(conn);
      // Forgot to release!
    }

    expect(pool.getActiveConnections()).toBe(3);

    // Proper connection usage with auto-release
    const useConnection = async (pool: ConnectionPool, operation: (conn: any) => Promise<any>) => {
      const conn = await pool.acquire();
      try {
        return await operation(conn);
      } finally {
        conn.release();
      }
    };

    // Use connections properly
    await useConnection(pool, async (conn) => {
      return await conn.query('SELECT 1');
    });

    // Still have leaked connections
    expect(pool.getActiveConnections()).toBe(3);

    // Clean up leaked connections
    leakedConnections.forEach(conn => conn.release());
    expect(pool.getActiveConnections()).toBe(0);
  });

  test('Recursive function stack overflow prevention', async () => {
    // Unsafe recursive function
    const unsafeRecursive = (n: number): number => {
      if (n <= 0) return 0;
      return n + unsafeRecursive(n - 1);
    };

    // This would cause stack overflow for large n
    expect(() => unsafeRecursive(100000)).toThrow();

    // Safe iterative alternative
    const safeIterative = (n: number): number => {
      let sum = 0;
      for (let i = n; i > 0; i--) {
        sum += i;
      }
      return sum;
    };

    expect(safeIterative(100000)).toBe(5000050000);

    // Safe tail-recursive with trampoline
    const trampoline = (fn: Function) => {
      return (...args: any[]) => {
        let result = fn(...args);
        while (typeof result === 'function') {
          result = result();
        }
        return result;
      };
    };

    const safeTailRecursive = trampoline((n: number, acc = 0): any => {
      if (n <= 0) return acc;
      return () => safeTailRecursive(n - 1, acc + n);
    });

    expect(safeTailRecursive(100000)).toBe(5000050000);
  });

  test('Memory-efficient bulk operations', async () => {
    const bulkInsert = async (data: any[], chunkSize = 1000) => {
      const chunks = [];
      for (let i = 0; i < data.length; i += chunkSize) {
        chunks.push(data.slice(i, i + chunkSize));
      }

      let inserted = 0;
      for (const chunk of chunks) {
        await prisma.inventoryTransaction.createMany({
          data: chunk
        });
        inserted += chunk.length;

        // Allow garbage collection between chunks
        await new Promise(resolve => setImmediate(resolve));
      }

      return inserted;
    };

    const testData = Array(10000).fill(null).map((_, i) => ({
      type: 'receive' as const,
      status: 'completed' as const,
      warehouseId: testWarehouseId,
      skuId: testSkuId,
      palletCount: 1,
      unitsPerPallet: 10,
      totalUnits: 10,
      batchLotNumber: `BULK-${i}`,
      transactionDate: new Date()
    }));

    monitor.checkpoint('before-bulk');
    const inserted = await bulkInsert(testData);
    monitor.checkpoint('after-bulk');

    expect(inserted).toBe(10000);
    
    const memoryGrowth = monitor.getMemoryGrowth('before-bulk');
    expect(memoryGrowth).toBeLessThan(100); // Should use less than 100MB
  });
});