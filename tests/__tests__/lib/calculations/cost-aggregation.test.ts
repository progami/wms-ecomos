import { getBillingPeriod, calculateStorageCosts, calculateTransactionCosts, calculateAllCosts, getCalculatedCostsSummary } from '@/lib/calculations/cost-aggregation';
import { prisma } from '@/lib/prisma';
import { CostCategory } from '@prisma/client';

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    storageLedger: {
      findMany: jest.fn(),
    },
    inventoryTransaction: {
      findMany: jest.fn(),
    },
    costRate: {
      findMany: jest.fn(),
    },
  },
}));

describe('Cost Aggregation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getBillingPeriod', () => {
    it('should return current billing period when date is on or after 16th', () => {
      // Test date: December 20, 2023
      const testDate = new Date('2023-12-20');
      const result = getBillingPeriod(testDate);
      
      expect(result.start).toEqual(new Date('2023-12-16'));
      expect(result.end).toEqual(new Date('2024-01-15T23:59:59.999Z'));
    });

    it('should return previous billing period when date is before 16th', () => {
      // Test date: December 10, 2023
      const testDate = new Date('2023-12-10');
      const result = getBillingPeriod(testDate);
      
      expect(result.start).toEqual(new Date('2023-11-16'));
      expect(result.end).toEqual(new Date('2023-12-15T23:59:59.999Z'));
    });

    it('should handle year boundary correctly', () => {
      // Test date: January 5, 2024
      const testDate = new Date('2024-01-05');
      const result = getBillingPeriod(testDate);
      
      expect(result.start).toEqual(new Date('2023-12-16'));
      expect(result.end).toEqual(new Date('2024-01-15T23:59:59.999Z'));
    });

    it('should handle exact boundary date (16th)', () => {
      // Test date: December 16, 2023
      const testDate = new Date('2023-12-16');
      const result = getBillingPeriod(testDate);
      
      expect(result.start).toEqual(new Date('2023-12-16'));
      expect(result.end).toEqual(new Date('2024-01-15T23:59:59.999Z'));
    });

    it('should handle exact boundary date (15th)', () => {
      // Test date: December 15, 2023
      const testDate = new Date('2023-12-15');
      const result = getBillingPeriod(testDate);
      
      expect(result.start).toEqual(new Date('2023-11-16'));
      expect(result.end).toEqual(new Date('2023-12-15T23:59:59.999Z'));
    });
  });

  describe('calculateStorageCosts', () => {
    const mockBillingPeriod = {
      start: new Date('2023-12-16'),
      end: new Date('2024-01-15T23:59:59.999Z'),
    };

    const mockWarehouse = {
      id: 'warehouse-1',
      name: 'Test Warehouse',
    };

    const mockSku = {
      id: 'sku-1',
      skuCode: 'SKU001',
      description: 'Test Product',
    };

    it('should calculate storage costs correctly for single entry', async () => {
      const mockStorageEntry = {
        id: 'storage-1',
        warehouseId: mockWarehouse.id,
        warehouse: mockWarehouse,
        skuId: mockSku.id,
        sku: mockSku,
        batchLot: 'BATCH001',
        storagePalletsCharged: 10,
        applicableWeeklyRate: 5.50,
        calculatedWeeklyCost: 55.00,
        billingPeriodStart: mockBillingPeriod.start,
        billingPeriodEnd: mockBillingPeriod.end,
      };

      (prisma.storageLedger.findMany as jest.Mock).mockResolvedValue([mockStorageEntry]);

      const result = await calculateStorageCosts(mockWarehouse.id, mockBillingPeriod);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        warehouseId: mockWarehouse.id,
        warehouseName: mockWarehouse.name,
        costCategory: CostCategory.Storage,
        costName: 'Weekly Pallet Storage',
        quantity: 10,
        unitRate: 5.50,
        unit: 'pallet-week',
        amount: 55.00,
        details: [{
          skuId: mockSku.id,
          skuCode: mockSku.skuCode,
          description: mockSku.description,
          batchLot: 'BATCH001',
          count: 10,
        }],
      });
    });

    it('should aggregate multiple entries for same SKU and batch', async () => {
      const mockStorageEntries = [
        {
          id: 'storage-1',
          warehouseId: mockWarehouse.id,
          warehouse: mockWarehouse,
          skuId: mockSku.id,
          sku: mockSku,
          batchLot: 'BATCH001',
          storagePalletsCharged: 10,
          applicableWeeklyRate: 5.50,
          calculatedWeeklyCost: 55.00,
          billingPeriodStart: mockBillingPeriod.start,
          billingPeriodEnd: mockBillingPeriod.end,
        },
        {
          id: 'storage-2',
          warehouseId: mockWarehouse.id,
          warehouse: mockWarehouse,
          skuId: mockSku.id,
          sku: mockSku,
          batchLot: 'BATCH001',
          storagePalletsCharged: 5,
          applicableWeeklyRate: 5.50,
          calculatedWeeklyCost: 27.50,
          billingPeriodStart: mockBillingPeriod.start,
          billingPeriodEnd: mockBillingPeriod.end,
        },
      ];

      (prisma.storageLedger.findMany as jest.Mock).mockResolvedValue(mockStorageEntries);

      const result = await calculateStorageCosts(mockWarehouse.id, mockBillingPeriod);

      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(15);
      expect(result[0].amount).toBe(82.50);
      expect(result[0].details).toHaveLength(2);
    });

    it('should handle empty storage entries', async () => {
      (prisma.storageLedger.findMany as jest.Mock).mockResolvedValue([]);

      const result = await calculateStorageCosts(mockWarehouse.id, mockBillingPeriod);

      expect(result).toHaveLength(0);
    });

    it('should handle different SKUs separately', async () => {
      const mockSku2 = {
        id: 'sku-2',
        skuCode: 'SKU002',
        description: 'Test Product 2',
      };

      const mockStorageEntries = [
        {
          id: 'storage-1',
          warehouseId: mockWarehouse.id,
          warehouse: mockWarehouse,
          skuId: mockSku.id,
          sku: mockSku,
          batchLot: 'BATCH001',
          storagePalletsCharged: 10,
          applicableWeeklyRate: 5.50,
          calculatedWeeklyCost: 55.00,
          billingPeriodStart: mockBillingPeriod.start,
          billingPeriodEnd: mockBillingPeriod.end,
        },
        {
          id: 'storage-2',
          warehouseId: mockWarehouse.id,
          warehouse: mockWarehouse,
          skuId: mockSku2.id,
          sku: mockSku2,
          batchLot: 'BATCH002',
          storagePalletsCharged: 8,
          applicableWeeklyRate: 5.50,
          calculatedWeeklyCost: 44.00,
          billingPeriodStart: mockBillingPeriod.start,
          billingPeriodEnd: mockBillingPeriod.end,
        },
      ];

      (prisma.storageLedger.findMany as jest.Mock).mockResolvedValue(mockStorageEntries);

      const result = await calculateStorageCosts(mockWarehouse.id, mockBillingPeriod);

      expect(result).toHaveLength(1); // Aggregated by cost name
      expect(result[0].quantity).toBe(18);
      expect(result[0].amount).toBe(99.00);
      expect(result[0].details).toHaveLength(2);
    });
  });

  describe('calculateTransactionCosts', () => {
    const mockBillingPeriod = {
      start: new Date('2023-12-16'),
      end: new Date('2024-01-15T23:59:59.999Z'),
    };

    const mockWarehouse = {
      id: 'warehouse-1',
      name: 'Test Warehouse',
    };

    const mockSku = {
      id: 'sku-1',
      skuCode: 'SKU001',
      description: 'Test Product',
    };

    const mockCostRates = [
      {
        id: 'rate-1',
        warehouseId: mockWarehouse.id,
        costCategory: CostCategory.Container,
        costName: 'Container Unloading',
        costValue: 150.00,
        unitOfMeasure: 'container',
        effectiveDate: new Date('2023-01-01'),
        endDate: null,
      },
      {
        id: 'rate-2',
        warehouseId: mockWarehouse.id,
        costCategory: CostCategory.Carton,
        costName: 'Inbound Carton Handling',
        costValue: 0.50,
        unitOfMeasure: 'carton',
        effectiveDate: new Date('2023-01-01'),
        endDate: null,
      },
      {
        id: 'rate-3',
        warehouseId: mockWarehouse.id,
        costCategory: CostCategory.Pallet,
        costName: 'Inbound Pallet Handling',
        costValue: 3.00,
        unitOfMeasure: 'pallet',
        effectiveDate: new Date('2023-01-01'),
        endDate: null,
      },
      {
        id: 'rate-4',
        warehouseId: mockWarehouse.id,
        costCategory: CostCategory.Pallet,
        costName: 'Outbound Pallet Handling',
        costValue: 4.00,
        unitOfMeasure: 'pallet',
        effectiveDate: new Date('2023-01-01'),
        endDate: null,
      },
      {
        id: 'rate-5',
        warehouseId: mockWarehouse.id,
        costCategory: CostCategory.Carton,
        costName: 'Outbound Carton Handling',
        costValue: 0.75,
        unitOfMeasure: 'carton',
        effectiveDate: new Date('2023-01-01'),
        endDate: null,
      },
      {
        id: 'rate-6',
        warehouseId: mockWarehouse.id,
        costCategory: CostCategory.Shipment,
        costName: 'Shipment Processing',
        costValue: 25.00,
        unitOfMeasure: 'shipment',
        effectiveDate: new Date('2023-01-01'),
        endDate: null,
      },
    ];

    beforeEach(() => {
      (prisma.costRate.findMany as jest.Mock).mockResolvedValue(mockCostRates);
    });

    it('should calculate inbound container costs correctly', async () => {
      const mockTransactions = [
        {
          id: 'trans-1',
          warehouseId: mockWarehouse.id,
          warehouse: mockWarehouse,
          skuId: mockSku.id,
          sku: mockSku,
          transactionType: 'RECEIVE',
          transactionDate: new Date('2023-12-20'),
          trackingNumber: 'CONT001',
          batchLot: 'BATCH001',
          cartonsIn: 100,
          storagePalletsIn: 10,
          shippingPalletsOut: 0,
          cartonsOut: 0,
          referenceId: null,
        },
        {
          id: 'trans-2',
          warehouseId: mockWarehouse.id,
          warehouse: mockWarehouse,
          skuId: mockSku.id,
          sku: mockSku,
          transactionType: 'RECEIVE',
          transactionDate: new Date('2023-12-20'),
          trackingNumber: 'CONT001', // Same container
          batchLot: 'BATCH001',
          cartonsIn: 50,
          storagePalletsIn: 5,
          shippingPalletsOut: 0,
          cartonsOut: 0,
          referenceId: null,
        },
      ];

      (prisma.inventoryTransaction.findMany as jest.Mock).mockResolvedValue(mockTransactions);

      const result = await calculateTransactionCosts(mockWarehouse.id, mockBillingPeriod);

      // Should have container, carton, and pallet costs
      const containerCost = result.find(c => c.costCategory === CostCategory.Container);
      expect(containerCost).toBeDefined();
      expect(containerCost?.quantity).toBe(1); // Only one unique container
      expect(containerCost?.amount).toBe(150.00);

      const cartonCost = result.find(c => c.costCategory === CostCategory.Carton && c.costName.includes('Inbound'));
      expect(cartonCost).toBeDefined();
      expect(cartonCost?.quantity).toBe(150); // 100 + 50 cartons
      expect(cartonCost?.amount).toBe(75.00);

      const palletCost = result.find(c => c.costCategory === CostCategory.Pallet && c.costName.includes('Inbound'));
      expect(palletCost).toBeDefined();
      expect(palletCost?.quantity).toBe(15); // 10 + 5 pallets
      expect(palletCost?.amount).toBe(45.00);
    });

    it('should calculate outbound costs correctly', async () => {
      const mockTransactions = [
        {
          id: 'trans-1',
          warehouseId: mockWarehouse.id,
          warehouse: mockWarehouse,
          skuId: mockSku.id,
          sku: mockSku,
          transactionType: 'SHIP',
          transactionDate: new Date('2023-12-25'),
          trackingNumber: null,
          batchLot: 'BATCH001',
          cartonsIn: 0,
          storagePalletsIn: 0,
          shippingPalletsOut: 5,
          cartonsOut: 50,
          referenceId: 'SHIP001',
        },
        {
          id: 'trans-2',
          warehouseId: mockWarehouse.id,
          warehouse: mockWarehouse,
          skuId: mockSku.id,
          sku: mockSku,
          transactionType: 'SHIP',
          transactionDate: new Date('2023-12-26'),
          trackingNumber: null,
          batchLot: 'BATCH001',
          cartonsIn: 0,
          storagePalletsIn: 0,
          shippingPalletsOut: 0,
          cartonsOut: 20, // Cartons without pallets
          referenceId: 'SHIP002',
        },
      ];

      (prisma.inventoryTransaction.findMany as jest.Mock).mockResolvedValue(mockTransactions);

      const result = await calculateTransactionCosts(mockWarehouse.id, mockBillingPeriod);

      // Outbound pallet cost
      const palletCost = result.find(c => c.costCategory === CostCategory.Pallet && c.costName.includes('Outbound'));
      expect(palletCost).toBeDefined();
      expect(palletCost?.quantity).toBe(5);
      expect(palletCost?.amount).toBe(20.00);

      // Outbound carton cost (only for cartons not on pallets)
      const cartonCost = result.find(c => c.costCategory === CostCategory.Carton && c.costName.includes('Outbound'));
      expect(cartonCost).toBeDefined();
      expect(cartonCost?.quantity).toBe(20); // Only cartons from trans-2
      expect(cartonCost?.amount).toBe(15.00);

      // Shipment cost
      const shipmentCost = result.find(c => c.costCategory === CostCategory.Shipment);
      expect(shipmentCost).toBeDefined();
      expect(shipmentCost?.quantity).toBe(2); // Two unique shipments
      expect(shipmentCost?.amount).toBe(50.00);
    });

    it('should handle transactions with no applicable rates', async () => {
      const mockTransactions = [
        {
          id: 'trans-1',
          warehouseId: mockWarehouse.id,
          warehouse: mockWarehouse,
          skuId: mockSku.id,
          sku: mockSku,
          transactionType: 'RECEIVE',
          transactionDate: new Date('2023-12-20'),
          trackingNumber: null,
          batchLot: 'BATCH001',
          cartonsIn: 100,
          storagePalletsIn: 0,
          shippingPalletsOut: 0,
          cartonsOut: 0,
          referenceId: null,
        },
      ];

      // Mock with no rates
      (prisma.costRate.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.inventoryTransaction.findMany as jest.Mock).mockResolvedValue(mockTransactions);

      const result = await calculateTransactionCosts(mockWarehouse.id, mockBillingPeriod);

      expect(result).toHaveLength(0);
    });

    it('should group shipments by date and reference', async () => {
      const mockTransactions = [
        {
          id: 'trans-1',
          warehouseId: mockWarehouse.id,
          warehouse: mockWarehouse,
          skuId: mockSku.id,
          sku: mockSku,
          transactionType: 'SHIP',
          transactionDate: new Date('2023-12-25'),
          trackingNumber: null,
          batchLot: 'BATCH001',
          cartonsIn: 0,
          storagePalletsIn: 0,
          shippingPalletsOut: 2,
          cartonsOut: 20,
          referenceId: 'SHIP001',
        },
        {
          id: 'trans-2',
          warehouseId: mockWarehouse.id,
          warehouse: mockWarehouse,
          skuId: mockSku.id,
          sku: mockSku,
          transactionType: 'SHIP',
          transactionDate: new Date('2023-12-25'),
          trackingNumber: null,
          batchLot: 'BATCH002',
          cartonsIn: 0,
          storagePalletsIn: 0,
          shippingPalletsOut: 3,
          cartonsOut: 30,
          referenceId: 'SHIP001', // Same shipment
        },
        {
          id: 'trans-3',
          warehouseId: mockWarehouse.id,
          warehouse: mockWarehouse,
          skuId: mockSku.id,
          sku: mockSku,
          transactionType: 'SHIP',
          transactionDate: new Date('2023-12-26'),
          trackingNumber: null,
          batchLot: 'BATCH001',
          cartonsIn: 0,
          storagePalletsIn: 0,
          shippingPalletsOut: 1,
          cartonsOut: 10,
          referenceId: 'SHIP002', // Different shipment
        },
      ];

      (prisma.inventoryTransaction.findMany as jest.Mock).mockResolvedValue(mockTransactions);

      const result = await calculateTransactionCosts(mockWarehouse.id, mockBillingPeriod);

      const shipmentCost = result.find(c => c.costCategory === CostCategory.Shipment);
      expect(shipmentCost).toBeDefined();
      expect(shipmentCost?.quantity).toBe(2); // Two unique shipments
      expect(shipmentCost?.amount).toBe(50.00);
    });
  });

  describe('calculateAllCosts', () => {
    const mockBillingPeriod = {
      start: new Date('2023-12-16'),
      end: new Date('2024-01-15T23:59:59.999Z'),
    };

    it('should combine storage and transaction costs', async () => {
      const mockStorageEntry = {
        id: 'storage-1',
        warehouseId: 'warehouse-1',
        warehouse: { id: 'warehouse-1', name: 'Test Warehouse' },
        skuId: 'sku-1',
        sku: { id: 'sku-1', skuCode: 'SKU001', description: 'Test Product' },
        batchLot: 'BATCH001',
        storagePalletsCharged: 10,
        applicableWeeklyRate: 5.50,
        calculatedWeeklyCost: 55.00,
        billingPeriodStart: mockBillingPeriod.start,
        billingPeriodEnd: mockBillingPeriod.end,
      };

      const mockTransaction = {
        id: 'trans-1',
        warehouseId: 'warehouse-1',
        warehouse: { id: 'warehouse-1', name: 'Test Warehouse' },
        skuId: 'sku-1',
        sku: { id: 'sku-1', skuCode: 'SKU001', description: 'Test Product' },
        transactionType: 'RECEIVE',
        transactionDate: new Date('2023-12-20'),
        trackingNumber: 'CONT001',
        batchLot: 'BATCH001',
        cartonsIn: 100,
        storagePalletsIn: 10,
        shippingPalletsOut: 0,
        cartonsOut: 0,
        referenceId: null,
      };

      const mockCostRates = [
        {
          id: 'rate-1',
          warehouseId: 'warehouse-1',
          costCategory: CostCategory.Container,
          costName: 'Container Unloading',
          costValue: 150.00,
          unitOfMeasure: 'container',
          effectiveDate: new Date('2023-01-01'),
          endDate: null,
        },
      ];

      (prisma.storageLedger.findMany as jest.Mock).mockResolvedValue([mockStorageEntry]);
      (prisma.inventoryTransaction.findMany as jest.Mock).mockResolvedValue([mockTransaction]);
      (prisma.costRate.findMany as jest.Mock).mockResolvedValue(mockCostRates);

      const result = await calculateAllCosts('warehouse-1', mockBillingPeriod);

      // Should have both storage and container costs
      expect(result.length).toBeGreaterThanOrEqual(2);
      
      const storageCost = result.find(c => c.costCategory === CostCategory.Storage);
      expect(storageCost).toBeDefined();
      expect(storageCost?.amount).toBe(55.00);

      const containerCost = result.find(c => c.costCategory === CostCategory.Container);
      expect(containerCost).toBeDefined();
      expect(containerCost?.amount).toBe(150.00);
    });
  });

  describe('getCalculatedCostsSummary', () => {
    const mockBillingPeriod = {
      start: new Date('2023-12-16'),
      end: new Date('2024-01-15T23:59:59.999Z'),
    };

    it('should summarize costs by category and name', async () => {
      // Mock data with multiple entries of same type
      const mockStorageEntries = [
        {
          id: 'storage-1',
          warehouseId: 'warehouse-1',
          warehouse: { id: 'warehouse-1', name: 'Test Warehouse' },
          skuId: 'sku-1',
          sku: { id: 'sku-1', skuCode: 'SKU001', description: 'Test Product 1' },
          batchLot: 'BATCH001',
          storagePalletsCharged: 10,
          applicableWeeklyRate: 5.50,
          calculatedWeeklyCost: 55.00,
          billingPeriodStart: mockBillingPeriod.start,
          billingPeriodEnd: mockBillingPeriod.end,
        },
        {
          id: 'storage-2',
          warehouseId: 'warehouse-1',
          warehouse: { id: 'warehouse-1', name: 'Test Warehouse' },
          skuId: 'sku-2',
          sku: { id: 'sku-2', skuCode: 'SKU002', description: 'Test Product 2' },
          batchLot: 'BATCH002',
          storagePalletsCharged: 5,
          applicableWeeklyRate: 5.50,
          calculatedWeeklyCost: 27.50,
          billingPeriodStart: mockBillingPeriod.start,
          billingPeriodEnd: mockBillingPeriod.end,
        },
      ];

      (prisma.storageLedger.findMany as jest.Mock).mockResolvedValue(mockStorageEntries);
      (prisma.inventoryTransaction.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.costRate.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getCalculatedCostsSummary('warehouse-1', mockBillingPeriod);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        costCategory: CostCategory.Storage,
        costName: 'Weekly Pallet Storage',
        totalQuantity: 15,
        totalAmount: 82.50,
        unitRate: 5.50,
        unit: 'pallet-week',
      });
    });

    it('should handle multiple cost categories separately', async () => {
      const mockStorageEntry = {
        id: 'storage-1',
        warehouseId: 'warehouse-1',
        warehouse: { id: 'warehouse-1', name: 'Test Warehouse' },
        skuId: 'sku-1',
        sku: { id: 'sku-1', skuCode: 'SKU001', description: 'Test Product' },
        batchLot: 'BATCH001',
        storagePalletsCharged: 10,
        applicableWeeklyRate: 5.50,
        calculatedWeeklyCost: 55.00,
        billingPeriodStart: mockBillingPeriod.start,
        billingPeriodEnd: mockBillingPeriod.end,
      };

      const mockTransaction = {
        id: 'trans-1',
        warehouseId: 'warehouse-1',
        warehouse: { id: 'warehouse-1', name: 'Test Warehouse' },
        skuId: 'sku-1',
        sku: { id: 'sku-1', skuCode: 'SKU001', description: 'Test Product' },
        transactionType: 'RECEIVE',
        transactionDate: new Date('2023-12-20'),
        trackingNumber: 'CONT001',
        batchLot: 'BATCH001',
        cartonsIn: 100,
        storagePalletsIn: 10,
        shippingPalletsOut: 0,
        cartonsOut: 0,
        referenceId: null,
      };

      const mockCostRates = [
        {
          id: 'rate-1',
          warehouseId: 'warehouse-1',
          costCategory: CostCategory.Container,
          costName: 'Container Unloading',
          costValue: 150.00,
          unitOfMeasure: 'container',
          effectiveDate: new Date('2023-01-01'),
          endDate: null,
        },
        {
          id: 'rate-2',
          warehouseId: 'warehouse-1',
          costCategory: CostCategory.Carton,
          costName: 'Inbound Carton Handling',
          costValue: 0.50,
          unitOfMeasure: 'carton',
          effectiveDate: new Date('2023-01-01'),
          endDate: null,
        },
      ];

      (prisma.storageLedger.findMany as jest.Mock).mockResolvedValue([mockStorageEntry]);
      (prisma.inventoryTransaction.findMany as jest.Mock).mockResolvedValue([mockTransaction]);
      (prisma.costRate.findMany as jest.Mock).mockResolvedValue(mockCostRates);

      const result = await getCalculatedCostsSummary('warehouse-1', mockBillingPeriod);

      // Should have storage, container, and carton costs
      expect(result.length).toBeGreaterThanOrEqual(3);
      
      const summaryByCategory = result.reduce((acc, item) => {
        acc[item.costCategory] = item;
        return acc;
      }, {} as Record<string, typeof result[0]>);

      expect(summaryByCategory[CostCategory.Storage]).toBeDefined();
      expect(summaryByCategory[CostCategory.Container]).toBeDefined();
      expect(summaryByCategory[CostCategory.Carton]).toBeDefined();
    });
  });
});