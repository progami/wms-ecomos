// Export configurations for different models
// This file can be easily updated when schema changes without touching the export logic

import { ExportConfig } from './dynamic-export'

// Inventory Transaction Export Configuration
export const inventoryTransactionConfig: Partial<ExportConfig> = {
  modelName: 'InventoryTransaction',
  
  // Fields to exclude from export (internal IDs, etc.)
  excludeFields: ['id', 'warehouseId', 'skuId', 'createdById', 'transactionId'],
  
  // Relations to include in the export
  includeRelations: ['warehouse', 'sku', 'createdBy'],
  
  // Custom field configurations - FULL DATABASE EXPORT (minus excluded fields)
  fields: [
    // 1. Transaction Date
    { fieldName: 'transactionDate', columnName: 'Transaction Date' },
    
    // 2. Pickup Date
    { fieldName: 'pickupDate', columnName: 'Pickup Date' },
    
    // 3. Is Reconciled
    { fieldName: 'isReconciled', columnName: 'Is Reconciled' },
    
    // 4. Type
    { fieldName: 'transactionType', columnName: 'Type' },
    
    // 5. Warehouse (relation)
    { 
      fieldName: 'warehouse.name', 
      columnName: 'Warehouse',
      isRelation: true,
      format: (value) => value || ''
    },
    
    // 6. SKU Code (relation)
    { 
      fieldName: 'sku.skuCode', 
      columnName: 'SKU Code',
      isRelation: true,
      format: (value) => value || ''
    },
    
    // 7. SKU Description (relation)
    { 
      fieldName: 'sku.description', 
      columnName: 'SKU Description',
      isRelation: true,
      format: (value) => value || ''
    },
    
    // 8. Batch/Lot
    { fieldName: 'batchLot', columnName: 'Batch/Lot' },
    
    // 9. Reference
    { fieldName: 'referenceId', columnName: 'Reference' },
    
    // 10. Cartons In
    { fieldName: 'cartonsIn', columnName: 'Cartons In' },
    
    // 11. Cartons Out
    { fieldName: 'cartonsOut', columnName: 'Cartons Out' },
    
    // 12. Storage Pallets In
    { fieldName: 'storagePalletsIn', columnName: 'Storage Pallets In' },
    
    // 13. Shipping Pallets Out
    { fieldName: 'shippingPalletsOut', columnName: 'Shipping Pallets Out' },
    
    // 14. Ship Name
    { fieldName: 'shipName', columnName: 'Ship Name' },
    
    // 15. Tracking Number
    { fieldName: 'trackingNumber', columnName: 'Tracking Number' },
    
    // 16. Mode of Transportation
    { fieldName: 'modeOfTransportation', columnName: 'Mode of Transportation' },
    
    // 17. Storage Cartons/Pallet
    { fieldName: 'storageCartonsPerPallet', columnName: 'Storage Cartons/Pallet' },
    
    // 18. Shipping Cartons/Pallet
    { fieldName: 'shippingCartonsPerPallet', columnName: 'Shipping Cartons/Pallet' },
    
    // 19. Attachments (complex field)
    {
      fieldName: 'attachments',
      columnName: 'Attachments',
      format: (value) => {
        if (!value) return ''
        const attachments = value as any
        const types = []
        if (attachments.packingList) types.push('Packing List')
        if (attachments.commercialInvoice) types.push('Invoice')
        if (attachments.deliveryNote) types.push('Delivery Note')
        if (attachments.cubemaster) types.push('Cubemaster')
        return types.join(', ')
      }
    },
    
    // 20. Created By (relation)
    { 
      fieldName: 'createdBy.fullName', 
      columnName: 'Created By',
      isRelation: true,
      format: (value) => value || ''
    },
    
    // 21. Created At
    { fieldName: 'createdAt', columnName: 'Created At' },
  ]
}

// Inventory Balance Export Configuration
export const inventoryBalanceConfig: Partial<ExportConfig> = {
  modelName: 'InventoryBalance',
  excludeFields: ['id', 'warehouseId', 'skuId'],
  includeRelations: ['warehouse', 'sku'],
  fields: [
    { fieldName: 'batchLot', columnName: 'Batch/Lot' },
    { fieldName: 'currentCartons', columnName: 'Current Cartons' },
    { fieldName: 'currentPallets', columnName: 'Current Pallets' },
    { fieldName: 'currentUnits', columnName: 'Current Units' },
    { fieldName: 'lastTransactionDate', columnName: 'Last Activity' },
    { fieldName: 'storageCartonsPerPallet', columnName: 'Storage Cartons/Pallet' },
    { fieldName: 'shippingCartonsPerPallet', columnName: 'Shipping Cartons/Pallet' },
    { 
      fieldName: 'warehouse.name', 
      columnName: 'Warehouse',
      isRelation: true
    },
    { 
      fieldName: 'sku.skuCode', 
      columnName: 'SKU Code',
      isRelation: true
    },
    { 
      fieldName: 'sku.description', 
      columnName: 'SKU Description',
      isRelation: true
    }
  ]
}

// SKU Export Configuration
export const skuConfig: Partial<ExportConfig> = {
  modelName: 'Sku',
  excludeFields: ['id'],
  fields: [
    { fieldName: 'skuCode', columnName: 'SKU Code' },
    { fieldName: 'asin', columnName: 'ASIN' },
    { fieldName: 'description', columnName: 'Description' },
    { fieldName: 'packSize', columnName: 'Pack Size' },
    { fieldName: 'material', columnName: 'Material' },
    { fieldName: 'unitDimensionsCm', columnName: 'Unit Dimensions (cm)' },
    { fieldName: 'unitWeightKg', columnName: 'Unit Weight (kg)' },
    { fieldName: 'unitsPerCarton', columnName: 'Units Per Carton' },
    { fieldName: 'cartonDimensionsCm', columnName: 'Carton Dimensions (cm)' },
    { fieldName: 'cartonWeightKg', columnName: 'Carton Weight (kg)' },
    { fieldName: 'packagingType', columnName: 'Packaging Type' },
    { fieldName: 'fbaStock', columnName: 'FBA Stock' },
    { fieldName: 'fbaStockLastUpdated', columnName: 'FBA Stock Last Updated' },
    { fieldName: 'notes', columnName: 'Notes' },
    { fieldName: 'isActive', columnName: 'Is Active' }
  ]
}

// Add more configurations as needed for other models...