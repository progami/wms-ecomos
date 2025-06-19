import type { Transaction, InventoryTransaction, SKU, Warehouse } from '@prisma/client';

type TransactionWithRelations = Transaction & {
  inventoryTransactions: (InventoryTransaction & {
    sku: SKU;
    warehouse: Warehouse;
  })[];
};

const mockAggregateTransactionCosts = (transactions: TransactionWithRelations[]) => {
  const aggregated = new Map<string, {
    warehouseId: string;
    warehouseName: string;
    skuId: string;
    skuCode: string;
    skuName: string;
    quantity: number;
    totalCost: number;
    unitCost: number;
  }>();

  for (const transaction of transactions) {
    for (const invTx of transaction.inventoryTransactions) {
      const key = `${invTx.warehouseId}-${invTx.skuId}`;
      const existing = aggregated.get(key);
      
      const quantity = Math.abs(invTx.quantity);
      const unitCost = transaction.totalCost / transaction.totalQuantity;
      const cost = quantity * unitCost;
      
      if (existing) {
        existing.quantity += quantity;
        existing.totalCost += cost;
        existing.unitCost = existing.totalCost / existing.quantity;
      } else {
        aggregated.set(key, {
          warehouseId: invTx.warehouseId,
          warehouseName: invTx.warehouse.name,
          skuId: invTx.skuId,
          skuCode: invTx.sku.code,
          skuName: invTx.sku.name,
          quantity,
          totalCost: cost,
          unitCost
        });
      }
    }
  }
  
  return Array.from(aggregated.values());
};

describe('Cost Aggregation', () => {
  const mockWarehouse: Warehouse = {
    id: 'warehouse-1',
    name: 'Main Warehouse',
    address: '123 Main St',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'USA',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockSku: SKU = {
    id: 'sku-1',
    code: 'SKU001',
    name: 'Product 1',
    description: 'Test product',
    unitOfMeasure: 'EACH',
    isActive: true,
    defaultWarehouseId: 'warehouse-1',
    unitCost: 10,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const createMockTransaction = (overrides: Partial<TransactionWithRelations> = {}): TransactionWithRelations => ({
    id: 'tx-1',
    transactionNumber: 'TX001',
    type: 'INBOUND',
    status: 'COMPLETED',
    referenceType: 'PURCHASE_ORDER',
    referenceId: 'PO001',
    totalQuantity: 100,
    totalCost: 1000,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: 'user-1',
    updatedById: 'user-1',
    inventoryTransactions: [{
      id: 'inv-tx-1',
      transactionId: 'tx-1',
      warehouseId: mockWarehouse.id,
      skuId: mockSku.id,
      quantity: 100,
      type: 'INBOUND',
      createdAt: new Date(),
      createdById: 'user-1',
      warehouse: mockWarehouse,
      sku: mockSku
    }],
    ...overrides
  });

  describe('aggregateTransactionCosts', () => {
    it('should aggregate costs for single transaction', () => {
      const transactions = [createMockTransaction()];
      const result = mockAggregateTransactionCosts(transactions);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        warehouseId: 'warehouse-1',
        warehouseName: 'Main Warehouse',
        skuId: 'sku-1',
        skuCode: 'SKU001',
        skuName: 'Product 1',
        quantity: 100,
        totalCost: 1000,
        unitCost: 10
      });
    });

    it('should aggregate multiple transactions for same SKU and warehouse', () => {
      const transactions = [
        createMockTransaction({
          id: 'tx-1',
          totalQuantity: 100,
          totalCost: 1000,
          inventoryTransactions: [{
            id: 'inv-tx-1',
            transactionId: 'tx-1',
            warehouseId: mockWarehouse.id,
            skuId: mockSku.id,
            quantity: 100,
            type: 'INBOUND',
            createdAt: new Date(),
            createdById: 'user-1',
            warehouse: mockWarehouse,
            sku: mockSku
          }]
        }),
        createMockTransaction({
          id: 'tx-2',
          totalQuantity: 50,
          totalCost: 600,
          inventoryTransactions: [{
            id: 'inv-tx-2',
            transactionId: 'tx-2',
            warehouseId: mockWarehouse.id,
            skuId: mockSku.id,
            quantity: 50,
            type: 'INBOUND',
            createdAt: new Date(),
            createdById: 'user-1',
            warehouse: mockWarehouse,
            sku: mockSku
          }]
        })
      ];
      
      const result = mockAggregateTransactionCosts(transactions);
      
      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(150);
      expect(result[0].totalCost).toBe(1600);
      expect(result[0].unitCost).toBeCloseTo(10.67, 2);
    });

    it('should handle multiple warehouses separately', () => {
      const warehouse2: Warehouse = { ...mockWarehouse, id: 'warehouse-2', name: 'Secondary Warehouse' };
      
      const transactions = [
        createMockTransaction({
          inventoryTransactions: [{
            id: 'inv-tx-1',
            transactionId: 'tx-1',
            warehouseId: mockWarehouse.id,
            skuId: mockSku.id,
            quantity: 100,
            type: 'INBOUND',
            createdAt: new Date(),
            createdById: 'user-1',
            warehouse: mockWarehouse,
            sku: mockSku
          }]
        }),
        createMockTransaction({
          id: 'tx-2',
          inventoryTransactions: [{
            id: 'inv-tx-2',
            transactionId: 'tx-2',
            warehouseId: warehouse2.id,
            skuId: mockSku.id,
            quantity: 50,
            type: 'INBOUND',
            createdAt: new Date(),
            createdById: 'user-1',
            warehouse: warehouse2,
            sku: mockSku
          }]
        })
      ];
      
      const result = mockAggregateTransactionCosts(transactions);
      
      expect(result).toHaveLength(2);
      expect(result.find(r => r.warehouseId === 'warehouse-1')?.quantity).toBe(100);
      expect(result.find(r => r.warehouseId === 'warehouse-2')?.quantity).toBe(50);
    });

    it('should handle negative quantities as absolute values', () => {
      const transactions = [
        createMockTransaction({
          type: 'OUTBOUND',
          inventoryTransactions: [{
            id: 'inv-tx-1',
            transactionId: 'tx-1',
            warehouseId: mockWarehouse.id,
            skuId: mockSku.id,
            quantity: -50,
            type: 'OUTBOUND',
            createdAt: new Date(),
            createdById: 'user-1',
            warehouse: mockWarehouse,
            sku: mockSku
          }]
        })
      ];
      
      const result = mockAggregateTransactionCosts(transactions);
      
      expect(result[0].quantity).toBe(50);
      expect(result[0].totalCost).toBe(500);
    });

    it('should calculate weighted average unit cost', () => {
      const transactions = [
        createMockTransaction({
          id: 'tx-1',
          totalQuantity: 100,
          totalCost: 1000, // $10/unit
          inventoryTransactions: [{
            id: 'inv-tx-1',
            transactionId: 'tx-1',
            warehouseId: mockWarehouse.id,
            skuId: mockSku.id,
            quantity: 100,
            type: 'INBOUND',
            createdAt: new Date(),
            createdById: 'user-1',
            warehouse: mockWarehouse,
            sku: mockSku
          }]
        }),
        createMockTransaction({
          id: 'tx-2',
          totalQuantity: 200,
          totalCost: 3000, // $15/unit
          inventoryTransactions: [{
            id: 'inv-tx-2',
            transactionId: 'tx-2',
            warehouseId: mockWarehouse.id,
            skuId: mockSku.id,
            quantity: 200,
            type: 'INBOUND',
            createdAt: new Date(),
            createdById: 'user-1',
            warehouse: mockWarehouse,
            sku: mockSku
          }]
        })
      ];
      
      const result = mockAggregateTransactionCosts(transactions);
      
      expect(result[0].quantity).toBe(300);
      expect(result[0].totalCost).toBe(4000);
      expect(result[0].unitCost).toBeCloseTo(13.33, 2);
    });
  });
});