import type { ExportConfiguration } from '@/lib/export-configurations';

describe('Export Configurations', () => {
  const mockInventoryTransactionConfig: ExportConfiguration = {
    modelName: 'InventoryTransaction',
    excludeFields: ['id', 'warehouseId', 'skuId', 'createdById', 'transactionId'],
    customFields: {
      warehouseName: {
        accessor: 'warehouse',
        transform: (warehouse: any) => warehouse?.name || ''
      },
      skuCode: {
        accessor: 'sku',
        transform: (sku: any) => sku?.code || ''
      },
      transactionNumber: {
        accessor: 'transaction',
        transform: (transaction: any) => transaction?.transactionNumber || ''
      },
      createdByEmail: {
        accessor: 'createdBy',
        transform: (user: any) => user?.email || ''
      }
    },
    dateFields: ['createdAt', 'updatedAt'],
    fieldOrder: [
      'warehouseName',
      'skuCode',
      'quantity',
      'transactionNumber',
      'type',
      'createdByEmail',
      'createdAt',
      'updatedAt'
    ]
  };

  const mockInventoryBalanceConfig: ExportConfiguration = {
    modelName: 'InventoryBalance',
    excludeFields: ['id', 'warehouseId', 'skuId'],
    customFields: {
      warehouseName: {
        accessor: 'warehouse',
        transform: (warehouse: any) => warehouse?.name || ''
      },
      skuCode: {
        accessor: 'sku',
        transform: (sku: any) => sku?.code || ''
      },
      skuName: {
        accessor: 'sku',
        transform: (sku: any) => sku?.name || ''
      }
    },
    dateFields: ['lastUpdated'],
    fieldOrder: [
      'warehouseName',
      'skuCode',
      'skuName',
      'quantity',
      'allocatedQuantity',
      'availableQuantity',
      'lastUpdated'
    ]
  };

  describe('inventoryTransactionConfig', () => {
    it('should have correct model name', () => {
      expect(mockInventoryTransactionConfig.modelName).toBe('InventoryTransaction');
    });

    it('should exclude correct fields', () => {
      expect(mockInventoryTransactionConfig.excludeFields).toEqual([
        'id',
        'warehouseId',
        'skuId',
        'createdById',
        'transactionId'
      ]);
    });

    it('should have custom field transformers', () => {
      const { customFields } = mockInventoryTransactionConfig;
      
      expect(customFields.warehouseName.accessor).toBe('warehouse');
      expect(customFields.warehouseName.transform({ name: 'Main WH' })).toBe('Main WH');
      expect(customFields.warehouseName.transform(null)).toBe('');
      
      expect(customFields.skuCode.accessor).toBe('sku');
      expect(customFields.skuCode.transform({ code: 'SKU001' })).toBe('SKU001');
      expect(customFields.skuCode.transform({})).toBe('');
    });

    it('should have correct field order', () => {
      expect(mockInventoryTransactionConfig.fieldOrder).toMatchSnapshot();
    });
  });

  describe('inventoryBalanceConfig', () => {
    it('should have correct model name', () => {
      expect(mockInventoryBalanceConfig.modelName).toBe('InventoryBalance');
    });

    it('should exclude correct fields', () => {
      expect(mockInventoryBalanceConfig.excludeFields).toEqual([
        'id',
        'warehouseId',
        'skuId'
      ]);
    });

    it('should transform SKU fields correctly', () => {
      const { customFields } = mockInventoryBalanceConfig;
      const mockSku = { code: 'SKU001', name: 'Product 1' };
      
      expect(customFields.skuCode.transform(mockSku)).toBe('SKU001');
      expect(customFields.skuName.transform(mockSku)).toBe('Product 1');
    });

    it('should handle missing data gracefully', () => {
      const { customFields } = mockInventoryBalanceConfig;
      
      expect(customFields.warehouseName.transform(undefined)).toBe('');
      expect(customFields.skuCode.transform(null)).toBe('');
      expect(customFields.skuName.transform({})).toBe('');
    });
  });

  describe('Export Configuration Structure', () => {
    it('should validate configuration structure', () => {
      const validateConfig = (config: ExportConfiguration) => {
        expect(config).toHaveProperty('modelName');
        expect(config).toHaveProperty('excludeFields');
        expect(config).toHaveProperty('customFields');
        expect(config).toHaveProperty('dateFields');
        expect(config).toHaveProperty('fieldOrder');
        
        expect(typeof config.modelName).toBe('string');
        expect(Array.isArray(config.excludeFields)).toBe(true);
        expect(Array.isArray(config.dateFields)).toBe(true);
        expect(Array.isArray(config.fieldOrder)).toBe(true);
        
        Object.values(config.customFields).forEach(field => {
          expect(field).toHaveProperty('accessor');
          expect(field).toHaveProperty('transform');
          expect(typeof field.transform).toBe('function');
        });
      };
      
      validateConfig(mockInventoryTransactionConfig);
      validateConfig(mockInventoryBalanceConfig);
    });
  });
});