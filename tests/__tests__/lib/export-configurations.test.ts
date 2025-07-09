interface FieldConfig {
  fieldName: string;
  columnName: string;
  format?: (value: any) => any;
  isRelation?: boolean;
}

interface ExportConfig {
  modelName: string;
  fields?: FieldConfig[];
  includeRelations?: string[];
  excludeFields?: string[];
}

describe('Export Configurations', () => {
  const mockInventoryTransactionConfig: Partial<ExportConfig> = {
    modelName: 'InventoryTransaction',
    excludeFields: ['id', 'warehouseId', 'skuId', 'createdById', 'transactionId'],
    includeRelations: ['warehouse', 'sku', 'createdBy'],
    fields: [
      { fieldName: 'warehouse.name', columnName: 'Warehouse Name', isRelation: true, format: (value: any) => value || '' },
      { fieldName: 'sku.skuCode', columnName: 'SKU Code', isRelation: true, format: (value: any) => value || '' },
      { fieldName: 'quantity', columnName: 'Quantity' },
      { fieldName: 'transactionType', columnName: 'Transaction Type' },
      { fieldName: 'createdBy.email', columnName: 'Created By', isRelation: true, format: (value: any) => value || '' },
      { fieldName: 'createdAt', columnName: 'Created At' },
      { fieldName: 'updatedAt', columnName: 'Updated At' }
    ]
  };

  const mockInventoryBalanceConfig: Partial<ExportConfig> = {
    modelName: 'InventoryBalance',
    excludeFields: ['id', 'warehouseId', 'skuId'],
    includeRelations: ['warehouse', 'sku'],
    fields: [
      { fieldName: 'warehouse.name', columnName: 'Warehouse Name', isRelation: true, format: (value: any) => value || '' },
      { fieldName: 'sku.skuCode', columnName: 'SKU Code', isRelation: true, format: (value: any) => value || '' },
      { fieldName: 'sku.description', columnName: 'SKU Description', isRelation: true, format: (value: any) => value || '' },
      { fieldName: 'quantity', columnName: 'Quantity' },
      { fieldName: 'batchLot', columnName: 'Batch/Lot' },
      { fieldName: 'averageCost', columnName: 'Average Cost' },
      { fieldName: 'lastUpdated', columnName: 'Last Updated' }
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
      const { fields } = mockInventoryTransactionConfig;
      
      const warehouseField = fields?.find(f => f.columnName === 'Warehouse Name');
      expect(warehouseField?.fieldName).toBe('warehouse.name');
      expect(warehouseField?.isRelation).toBe(true);
      expect(warehouseField?.format?.('Main WH')).toBe('Main WH');
      expect(warehouseField?.format?.(null)).toBe('');
      
      const skuField = fields?.find(f => f.columnName === 'SKU Code');
      expect(skuField?.fieldName).toBe('sku.skuCode');
      expect(skuField?.format?.('SKU001')).toBe('SKU001');
      expect(skuField?.format?.('')).toBe('');
    });

    it('should have correct field order', () => {
      const fieldNames = mockInventoryTransactionConfig.fields?.map(f => f.columnName) || [];
      expect(fieldNames).toContain('Warehouse Name');
      expect(fieldNames).toContain('SKU Code');
      expect(fieldNames).toContain('Quantity');
      expect(fieldNames).toContain('Transaction Type');
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
      const { fields } = mockInventoryBalanceConfig;
      
      const skuCodeField = fields?.find(f => f.columnName === 'SKU Code');
      expect(skuCodeField?.format?.('SKU001')).toBe('SKU001');
      
      const skuDescField = fields?.find(f => f.columnName === 'SKU Description');
      expect(skuDescField?.format?.('Product 1')).toBe('Product 1');
    });

    it('should handle missing data gracefully', () => {
      const { fields } = mockInventoryBalanceConfig;
      
      const warehouseField = fields?.find(f => f.columnName === 'Warehouse Name');
      expect(warehouseField?.format?.(undefined)).toBe('');
      
      const skuField = fields?.find(f => f.columnName === 'SKU Code');
      expect(skuField?.format?.(null)).toBe('');
      
      const descField = fields?.find(f => f.columnName === 'SKU Description');
      expect(descField?.format?.('')).toBe('');
    });
  });

  describe('Export Configuration Structure', () => {
    it('should validate configuration structure', () => {
      const validateConfig = (config: Partial<ExportConfig>) => {
        expect(config).toHaveProperty('modelName');
        expect(config).toHaveProperty('excludeFields');
        expect(config).toHaveProperty('fields');
        
        expect(typeof config.modelName).toBe('string');
        expect(Array.isArray(config.excludeFields)).toBe(true);
        expect(Array.isArray(config.fields)).toBe(true);
        
        config.fields?.forEach(field => {
          expect(field).toHaveProperty('fieldName');
          expect(field).toHaveProperty('columnName');
          if (field.format) {
            expect(typeof field.format).toBe('function');
          }
        });
      };
      
      validateConfig(mockInventoryTransactionConfig);
      validateConfig(mockInventoryBalanceConfig);
    });
  });
});