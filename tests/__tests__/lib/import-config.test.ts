import { 
  ImportConfig, 
  validateImportData, 
  processImportData,
  ImportValidationError 
} from '@/lib/import-config';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    product: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
    },
    warehouse: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
    inventory: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(prisma)),
  },
}));

describe('ImportConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateImportData', () => {
    it('should validate valid inventory import data', async () => {
      const data = [
        {
          warehouseCode: 'WH001',
          skuCode: 'SKU001',
          batchLot: 'BATCH001',
          cartons: 100,
          pallets: 5,
        },
      ];

      const config: ImportConfig = {
        type: 'inventory',
        mappings: {
          warehouseCode: 'Warehouse',
          skuCode: 'SKU Code',
          batchLot: 'Batch/Lot',
          cartons: 'Cartons',
          pallets: 'Pallets',
        },
        validation: {
          required: ['warehouseCode', 'skuCode', 'cartons'],
          dataTypes: {
            cartons: 'number',
            pallets: 'number',
          },
        },
      };

      (prisma.warehouse.findFirst as jest.Mock).mockResolvedValue({ id: '1' });
      (prisma.product.findFirst as jest.Mock).mockResolvedValue({ id: '1' });

      const result = await validateImportData(data, config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should catch missing required fields', async () => {
      const data = [
        {
          warehouseCode: 'WH001',
          // Missing skuCode
          cartons: 100,
        },
      ];

      const config: ImportConfig = {
        type: 'inventory',
        mappings: {
          warehouseCode: 'Warehouse',
          skuCode: 'SKU Code',
          cartons: 'Cartons',
        },
        validation: {
          required: ['warehouseCode', 'skuCode', 'cartons'],
        },
      };

      const result = await validateImportData(data, config);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        row: 1,
        field: 'skuCode',
        message: expect.stringContaining('required'),
      });
    });

    it('should validate data types', async () => {
      const data = [
        {
          warehouseCode: 'WH001',
          skuCode: 'SKU001',
          cartons: 'not-a-number', // Invalid type
        },
      ];

      const config: ImportConfig = {
        type: 'inventory',
        mappings: {
          warehouseCode: 'Warehouse',
          skuCode: 'SKU Code',
          cartons: 'Cartons',
        },
        validation: {
          required: ['warehouseCode', 'skuCode', 'cartons'],
          dataTypes: {
            cartons: 'number',
          },
        },
      };

      const result = await validateImportData(data, config);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        row: 1,
        field: 'cartons',
        message: expect.stringContaining('must be a number'),
      });
    });

    it('should validate warehouse existence', async () => {
      const data = [
        {
          warehouseCode: 'INVALID',
          skuCode: 'SKU001',
          cartons: 100,
        },
      ];

      const config: ImportConfig = {
        type: 'inventory',
        mappings: {
          warehouseCode: 'Warehouse',
          skuCode: 'SKU Code',
          cartons: 'Cartons',
        },
        validation: {
          required: ['warehouseCode', 'skuCode', 'cartons'],
        },
      };

      (prisma.warehouse.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.product.findFirst as jest.Mock).mockResolvedValue({ id: '1' });

      const result = await validateImportData(data, config);

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('Warehouse code not found');
    });

    it('should validate SKU existence', async () => {
      const data = [
        {
          warehouseCode: 'WH001',
          skuCode: 'INVALID',
          cartons: 100,
        },
      ];

      const config: ImportConfig = {
        type: 'inventory',
        mappings: {
          warehouseCode: 'Warehouse',
          skuCode: 'SKU Code',
          cartons: 'Cartons',
        },
        validation: {
          required: ['warehouseCode', 'skuCode', 'cartons'],
        },
      };

      (prisma.warehouse.findFirst as jest.Mock).mockResolvedValue({ id: '1' });
      (prisma.product.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await validateImportData(data, config);

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('SKU code not found');
    });

    it('should add warnings for suspicious data', async () => {
      const data = [
        {
          warehouseCode: 'WH001',
          skuCode: 'SKU001',
          cartons: 10000, // Very high number
        },
      ];

      const config: ImportConfig = {
        type: 'inventory',
        mappings: {
          warehouseCode: 'Warehouse',
          skuCode: 'SKU Code',
          cartons: 'Cartons',
        },
        validation: {
          required: ['warehouseCode', 'skuCode', 'cartons'],
          warnings: {
            cartons: { max: 1000 },
          },
        },
      };

      (prisma.warehouse.findFirst as jest.Mock).mockResolvedValue({ id: '1' });
      (prisma.product.findFirst as jest.Mock).mockResolvedValue({ id: '1' });

      const result = await validateImportData(data, config);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('unusually high');
    });
  });

  describe('processImportData', () => {
    it('should process inventory import successfully', async () => {
      const data = [
        {
          warehouseCode: 'WH001',
          skuCode: 'SKU001',
          batchLot: 'BATCH001',
          cartons: 100,
          transactionType: 'RECEIVE',
          reference: 'REF001',
        },
      ];

      const config: ImportConfig = {
        type: 'inventory',
        mappings: {
          warehouseCode: 'Warehouse',
          skuCode: 'SKU Code',
          batchLot: 'Batch/Lot',
          cartons: 'Cartons',
          transactionType: 'Type',
          reference: 'Reference',
        },
      };

      const warehouseId = 'warehouse-1';
      const productId = 'product-1';

      (prisma.warehouse.findFirst as jest.Mock).mockResolvedValue({ id: warehouseId });
      (prisma.product.findFirst as jest.Mock).mockResolvedValue({ id: productId });
      (prisma.inventory.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.inventory.create as jest.Mock).mockResolvedValue({ id: 'inv-1' });
      (prisma.transaction.create as jest.Mock).mockResolvedValue({ id: 'trans-1' });

      const result = await processImportData(data, config, { userId: 'user-1' });

      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
      expect(result.failed).toBe(0);

      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'RECEIVE',
          warehouseId,
          productId,
          batchLot: 'BATCH001',
          cartonsIn: 100,
          reference: 'REF001',
          createdBy: 'user-1',
        }),
      });
    });

    it('should handle import with existing inventory', async () => {
      const data = [
        {
          warehouseCode: 'WH001',
          skuCode: 'SKU001',
          batchLot: 'BATCH001',
          cartons: 50,
          transactionType: 'RECEIVE',
        },
      ];

      const config: ImportConfig = {
        type: 'inventory',
        mappings: {
          warehouseCode: 'Warehouse',
          skuCode: 'SKU Code',
          batchLot: 'Batch/Lot',
          cartons: 'Cartons',
          transactionType: 'Type',
        },
      };

      const existingInventory = {
        id: 'inv-1',
        cartons: 100,
        pallets: 5,
      };

      (prisma.warehouse.findFirst as jest.Mock).mockResolvedValue({ id: 'warehouse-1' });
      (prisma.product.findFirst as jest.Mock).mockResolvedValue({ id: 'product-1' });
      (prisma.inventory.findFirst as jest.Mock).mockResolvedValue(existingInventory);
      (prisma.inventory.update as jest.Mock).mockResolvedValue({
        ...existingInventory,
        cartons: 150,
      });

      const result = await processImportData(data, config, { userId: 'user-1' });

      expect(result.success).toBe(true);
      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: {
          cartons: 150, // 100 + 50
        },
      });
    });

    it('should handle shipment transactions', async () => {
      const data = [
        {
          warehouseCode: 'WH001',
          skuCode: 'SKU001',
          batchLot: 'BATCH001',
          cartons: 30,
          transactionType: 'SHIP',
        },
      ];

      const config: ImportConfig = {
        type: 'inventory',
        mappings: {
          warehouseCode: 'Warehouse',
          skuCode: 'SKU Code',
          batchLot: 'Batch/Lot',
          cartons: 'Cartons',
          transactionType: 'Type',
        },
      };

      const existingInventory = {
        id: 'inv-1',
        cartons: 100,
      };

      (prisma.warehouse.findFirst as jest.Mock).mockResolvedValue({ id: 'warehouse-1' });
      (prisma.product.findFirst as jest.Mock).mockResolvedValue({ id: 'product-1' });
      (prisma.inventory.findFirst as jest.Mock).mockResolvedValue(existingInventory);
      (prisma.inventory.update as jest.Mock).mockResolvedValue({
        ...existingInventory,
        cartons: 70,
      });

      await processImportData(data, config, { userId: 'user-1' });

      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'SHIP',
          cartonsOut: 30,
          cartonsIn: 0,
        }),
      });

      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: {
          cartons: 70, // 100 - 30
        },
      });
    });

    it('should handle errors gracefully', async () => {
      const data = [
        {
          warehouseCode: 'WH001',
          skuCode: 'SKU001',
          cartons: 100,
        },
      ];

      const config: ImportConfig = {
        type: 'inventory',
        mappings: {
          warehouseCode: 'Warehouse',
          skuCode: 'SKU Code',
          cartons: 'Cartons',
        },
      };

      (prisma.warehouse.findFirst as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const result = await processImportData(data, config, { userId: 'user-1' });

      expect(result.success).toBe(false);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Database error');
    });

    it('should use transaction for bulk imports', async () => {
      const data = Array(10).fill({
        warehouseCode: 'WH001',
        skuCode: 'SKU001',
        cartons: 10,
        transactionType: 'RECEIVE',
      });

      const config: ImportConfig = {
        type: 'inventory',
        mappings: {
          warehouseCode: 'Warehouse',
          skuCode: 'SKU Code',
          cartons: 'Cartons',
          transactionType: 'Type',
        },
        options: {
          batchSize: 5,
        },
      };

      (prisma.warehouse.findFirst as jest.Mock).mockResolvedValue({ id: 'warehouse-1' });
      (prisma.product.findFirst as jest.Mock).mockResolvedValue({ id: 'product-1' });
      (prisma.inventory.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.inventory.create as jest.Mock).mockResolvedValue({ id: 'inv-1' });
      (prisma.transaction.createMany as jest.Mock).mockResolvedValue({ count: 10 });

      await processImportData(data, config, { userId: 'user-1' });

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('Import Configuration Types', () => {
    it('should handle product import configuration', () => {
      const config: ImportConfig = {
        type: 'products',
        mappings: {
          skuCode: 'SKU Code',
          description: 'Description',
          unitPrice: 'Unit Price',
        },
        validation: {
          required: ['skuCode', 'description'],
          dataTypes: {
            unitPrice: 'number',
          },
          unique: ['skuCode'],
        },
      };

      expect(config.type).toBe('products');
      expect(config.validation?.unique).toContain('skuCode');
    });

    it('should handle transaction import configuration', () => {
      const config: ImportConfig = {
        type: 'transactions',
        mappings: {
          transactionDate: 'Date',
          warehouseCode: 'Warehouse',
          skuCode: 'SKU',
          type: 'Type',
          quantity: 'Quantity',
        },
        validation: {
          required: ['transactionDate', 'warehouseCode', 'skuCode', 'type', 'quantity'],
          dataTypes: {
            transactionDate: 'date',
            quantity: 'number',
          },
          allowedValues: {
            type: ['RECEIVE', 'SHIP', 'ADJUST'],
          },
        },
      };

      expect(config.validation?.allowedValues?.type).toContain('RECEIVE');
      expect(config.validation?.allowedValues?.type).toContain('SHIP');
    });
  });
});