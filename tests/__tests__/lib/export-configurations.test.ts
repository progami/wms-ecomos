import { inventoryTransactionConfig, inventoryBalanceConfig, skuConfig } from '@/lib/export-configurations';

describe('Export Configurations', () => {
  describe('inventoryTransactionConfig', () => {
    it('should have correct model name', () => {
      expect(inventoryTransactionConfig.modelName).toBe('InventoryTransaction');
    });

    it('should exclude internal ID fields', () => {
      expect(inventoryTransactionConfig.excludeFields).toEqual([
        'id',
        'warehouseId',
        'skuId',
        'createdById',
        'transactionId'
      ]);
    });

    it('should include necessary relations', () => {
      expect(inventoryTransactionConfig.includeRelations).toEqual([
        'warehouse',
        'sku',
        'createdBy'
      ]);
    });

    it('should have all required fields configured', () => {
      const fields = inventoryTransactionConfig.fields || [];
      const fieldNames = fields.map(f => f.fieldName);
      
      // Check essential fields are present
      expect(fieldNames).toContain('transactionDate');
      expect(fieldNames).toContain('transactionType');
      expect(fieldNames).toContain('warehouse.name');
      expect(fieldNames).toContain('sku.skuCode');
      expect(fieldNames).toContain('sku.description');
      expect(fieldNames).toContain('batchLot');
      expect(fieldNames).toContain('cartonsIn');
      expect(fieldNames).toContain('cartonsOut');
      expect(fieldNames).toContain('storagePalletsIn');
      expect(fieldNames).toContain('shippingPalletsOut');
      expect(fieldNames).toContain('attachments');
      expect(fieldNames).toContain('createdBy.fullName');
      expect(fieldNames).toContain('createdAt');
    });

    it('should have correct column names for fields', () => {
      const fields = inventoryTransactionConfig.fields || [];
      const fieldMap = new Map(fields.map(f => [f.fieldName, f.columnName]));
      
      expect(fieldMap.get('transactionDate')).toBe('Transaction Date');
      expect(fieldMap.get('transactionType')).toBe('Type');
      expect(fieldMap.get('warehouse.name')).toBe('Warehouse');
      expect(fieldMap.get('sku.skuCode')).toBe('SKU Code');
      expect(fieldMap.get('batchLot')).toBe('Batch/Lot');
      expect(fieldMap.get('cartonsIn')).toBe('Cartons In');
      expect(fieldMap.get('cartonsOut')).toBe('Cartons Out');
    });

    it('should mark relation fields correctly', () => {
      const fields = inventoryTransactionConfig.fields || [];
      const relationFields = fields.filter(f => f.isRelation);
      const relationFieldNames = relationFields.map(f => f.fieldName);
      
      expect(relationFieldNames).toContain('warehouse.name');
      expect(relationFieldNames).toContain('sku.skuCode');
      expect(relationFieldNames).toContain('sku.description');
      expect(relationFieldNames).toContain('createdBy.fullName');
    });

    describe('field formatters', () => {
      it('should format attachments field correctly', () => {
        const fields = inventoryTransactionConfig.fields || [];
        const attachmentsField = fields.find(f => f.fieldName === 'attachments');
        
        expect(attachmentsField).toBeDefined();
        expect(attachmentsField?.format).toBeDefined();
        
        // Test various attachment combinations
        const formatter = attachmentsField!.format!;
        
        expect(formatter(null)).toBe('');
        expect(formatter(undefined)).toBe('');
        expect(formatter({})).toBe('');
        
        expect(formatter({
          packingList: 'file1.pdf'
        })).toBe('Packing List');
        
        expect(formatter({
          packingList: 'file1.pdf',
          commercialInvoice: 'file2.pdf'
        })).toBe('Packing List, Invoice');
        
        expect(formatter({
          packingList: 'file1.pdf',
          commercialInvoice: 'file2.pdf',
          deliveryNote: 'file3.pdf',
          cubemaster: 'file4.pdf'
        })).toBe('Packing List, Invoice, Delivery Note, Cubemaster');
      });

      it('should format relation fields with empty string for null/undefined', () => {
        const fields = inventoryTransactionConfig.fields || [];
        const warehouseField = fields.find(f => f.fieldName === 'warehouse.name');
        
        expect(warehouseField?.format).toBeDefined();
        const formatter = warehouseField!.format!;
        
        expect(formatter(null)).toBe('');
        expect(formatter(undefined)).toBe('');
        expect(formatter('Test Warehouse')).toBe('Test Warehouse');
      });
    });
  });

  describe('inventoryBalanceConfig', () => {
    it('should have correct model name', () => {
      expect(inventoryBalanceConfig.modelName).toBe('InventoryBalance');
    });

    it('should exclude internal ID fields', () => {
      expect(inventoryBalanceConfig.excludeFields).toEqual([
        'id',
        'warehouseId',
        'skuId'
      ]);
    });

    it('should include necessary relations', () => {
      expect(inventoryBalanceConfig.includeRelations).toEqual([
        'warehouse',
        'sku'
      ]);
    });

    it('should have all required fields configured', () => {
      const fields = inventoryBalanceConfig.fields || [];
      const fieldNames = fields.map(f => f.fieldName);
      
      expect(fieldNames).toContain('batchLot');
      expect(fieldNames).toContain('currentCartons');
      expect(fieldNames).toContain('currentPallets');
      expect(fieldNames).toContain('currentUnits');
      expect(fieldNames).toContain('lastTransactionDate');
      expect(fieldNames).toContain('warehouse.name');
      expect(fieldNames).toContain('sku.skuCode');
      expect(fieldNames).toContain('sku.description');
    });

    it('should have correct column names', () => {
      const fields = inventoryBalanceConfig.fields || [];
      const fieldMap = new Map(fields.map(f => [f.fieldName, f.columnName]));
      
      expect(fieldMap.get('batchLot')).toBe('Batch/Lot');
      expect(fieldMap.get('currentCartons')).toBe('Current Cartons');
      expect(fieldMap.get('currentPallets')).toBe('Current Pallets');
      expect(fieldMap.get('lastTransactionDate')).toBe('Last Activity');
      expect(fieldMap.get('storageCartonsPerPallet')).toBe('Storage Cartons/Pallet');
    });
  });

  describe('skuConfig', () => {
    it('should have correct model name', () => {
      expect(skuConfig.modelName).toBe('Sku');
    });

    it('should exclude only id field', () => {
      expect(skuConfig.excludeFields).toEqual(['id']);
    });

    it('should not have any relations', () => {
      expect(skuConfig.includeRelations).toBeUndefined();
    });

    it('should have all required SKU fields', () => {
      const fields = skuConfig.fields || [];
      const fieldNames = fields.map(f => f.fieldName);
      
      // Core fields
      expect(fieldNames).toContain('skuCode');
      expect(fieldNames).toContain('asin');
      expect(fieldNames).toContain('description');
      
      // Dimensions and weight
      expect(fieldNames).toContain('unitDimensionsCm');
      expect(fieldNames).toContain('unitWeightKg');
      expect(fieldNames).toContain('cartonDimensionsCm');
      expect(fieldNames).toContain('cartonWeightKg');
      
      // Packaging info
      expect(fieldNames).toContain('packSize');
      expect(fieldNames).toContain('unitsPerCarton');
      expect(fieldNames).toContain('packagingType');
      
      // FBA fields
      expect(fieldNames).toContain('fbaStock');
      expect(fieldNames).toContain('fbaStockLastUpdated');
      
      // Other fields
      expect(fieldNames).toContain('material');
      expect(fieldNames).toContain('notes');
      expect(fieldNames).toContain('isActive');
    });

    it('should have correct column names', () => {
      const fields = skuConfig.fields || [];
      const fieldMap = new Map(fields.map(f => [f.fieldName, f.columnName]));
      
      expect(fieldMap.get('skuCode')).toBe('SKU Code');
      expect(fieldMap.get('asin')).toBe('ASIN');
      expect(fieldMap.get('unitDimensionsCm')).toBe('Unit Dimensions (cm)');
      expect(fieldMap.get('unitWeightKg')).toBe('Unit Weight (kg)');
      expect(fieldMap.get('fbaStock')).toBe('FBA Stock');
    });
  });

  describe('Field configuration consistency', () => {
    it('should have unique field names within each config', () => {
      const configs = [inventoryTransactionConfig, inventoryBalanceConfig, skuConfig];
      
      configs.forEach(config => {
        const fields = config.fields || [];
        const fieldNames = fields.map(f => f.fieldName);
        const uniqueFieldNames = new Set(fieldNames);
        
        expect(fieldNames.length).toBe(uniqueFieldNames.size);
      });
    });

    it('should have column names for all fields', () => {
      const configs = [inventoryTransactionConfig, inventoryBalanceConfig, skuConfig];
      
      configs.forEach(config => {
        const fields = config.fields || [];
        fields.forEach(field => {
          expect(field.columnName).toBeDefined();
          expect(field.columnName).not.toBe('');
        });
      });
    });

    it('should have field names for all fields', () => {
      const configs = [inventoryTransactionConfig, inventoryBalanceConfig, skuConfig];
      
      configs.forEach(config => {
        const fields = config.fields || [];
        fields.forEach(field => {
          expect(field.fieldName).toBeDefined();
          expect(field.fieldName).not.toBe('');
        });
      });
    });
  });
});