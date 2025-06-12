import { z } from 'zod'

export interface ImportFieldMapping {
  dbField: string
  excelColumns: string[] // Multiple possible Excel column names
  type: 'string' | 'number' | 'date' | 'boolean' | 'decimal'
  required: boolean
  transform?: (value: any) => any
  validate?: (value: any) => boolean
  defaultValue?: any
}

export interface ImportEntityConfig {
  entityName: string
  tableName: string
  displayName: string
  uniqueFields: string[] // Fields that determine uniqueness for upsert
  fieldMappings: ImportFieldMapping[]
  preProcess?: (data: any[]) => Promise<any[]>
  postProcess?: (results: any) => Promise<void>
  validateRow?: (row: any) => { valid: boolean; errors: string[] }
}

// Transform functions
const transformers = {
  parseNumber: (value: any) => {
    const num = parseInt(value)
    return isNaN(num) ? null : num
  },
  parseDecimal: (value: any) => {
    const num = parseFloat(value)
    return isNaN(num) ? null : num
  },
  parseBoolean: (value: any) => {
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'yes'
    }
    return false
  },
  parseDate: (value: any) => {
    if (!value) return null
    // Handle Excel date serial numbers
    if (typeof value === 'number') {
      return new Date((value - 25569) * 86400 * 1000)
    }
    return new Date(value)
  },
  toLowerCase: (value: any) => value?.toString().toLowerCase() || null,
  toUpperCase: (value: any) => value?.toString().toUpperCase() || null,
}

// Import configurations for each entity
export const importConfigs: Record<string, ImportEntityConfig> = {
  skus: {
    entityName: 'sku',
    tableName: 'skus',
    displayName: 'SKUs',
    uniqueFields: ['skuCode'],
    fieldMappings: [
      {
        dbField: 'skuCode',
        excelColumns: ['SKU', 'sku_code', 'SKU Code'],
        type: 'string',
        required: true,
      },
      {
        dbField: 'asin',
        excelColumns: ['ASIN', 'asin'],
        type: 'string',
        required: false,
      },
      {
        dbField: 'description',
        excelColumns: ['Description', 'description', 'Product Description'],
        type: 'string',
        required: true,
        defaultValue: '',
      },
      {
        dbField: 'packSize',
        excelColumns: ['Pack_Size', 'pack_size', 'Pack Size'],
        type: 'number',
        required: true,
        transform: transformers.parseNumber,
        defaultValue: 1,
      },
      {
        dbField: 'material',
        excelColumns: ['Material', 'material'],
        type: 'string',
        required: false,
      },
      {
        dbField: 'unitDimensionsCm',
        excelColumns: ['Unit_Dimensions_cm', 'unit_dimensions_cm', 'Unit Dimensions (cm)'],
        type: 'string',
        required: false,
      },
      {
        dbField: 'unitWeightKg',
        excelColumns: ['Unit_Weight_KG', 'unit_weight_kg', 'Unit Weight (kg)'],
        type: 'decimal',
        required: false,
        transform: transformers.parseDecimal,
      },
      {
        dbField: 'unitsPerCarton',
        excelColumns: ['Units_Per_Carton', 'units_per_carton', 'Units/Carton'],
        type: 'number',
        required: true,
        transform: transformers.parseNumber,
        defaultValue: 1,
      },
      {
        dbField: 'cartonDimensionsCm',
        excelColumns: ['Carton_Dimensions_cm', 'carton_dimensions_cm', 'Carton Dimensions (cm)'],
        type: 'string',
        required: false,
      },
      {
        dbField: 'cartonWeightKg',
        excelColumns: ['Carton_Weight_KG', 'carton_weight_kg', 'Carton Weight (kg)'],
        type: 'decimal',
        required: false,
        transform: transformers.parseDecimal,
      },
      {
        dbField: 'packagingType',
        excelColumns: ['Packaging_Type', 'packaging_type', 'Packaging Type'],
        type: 'string',
        required: false,
      },
      {
        dbField: 'notes',
        excelColumns: ['Notes', 'notes', 'Comments'],
        type: 'string',
        required: false,
      },
    ],
  },
  
  warehouses: {
    entityName: 'warehouse',
    tableName: 'warehouses',
    displayName: 'Warehouses',
    uniqueFields: ['code'],
    fieldMappings: [
      {
        dbField: 'code',
        excelColumns: ['Code', 'code', 'Warehouse Code', 'warehouse_code'],
        type: 'string',
        required: true,
        transform: transformers.toUpperCase,
      },
      {
        dbField: 'name',
        excelColumns: ['Name', 'name', 'Warehouse Name', 'warehouse_name'],
        type: 'string',
        required: true,
      },
      {
        dbField: 'address',
        excelColumns: ['Address', 'address', 'Location'],
        type: 'string',
        required: false,
      },
      {
        dbField: 'latitude',
        excelColumns: ['Latitude', 'latitude', 'Lat'],
        type: 'decimal',
        required: false,
        transform: transformers.parseDecimal,
      },
      {
        dbField: 'longitude',
        excelColumns: ['Longitude', 'longitude', 'Long', 'Lng'],
        type: 'decimal',
        required: false,
        transform: transformers.parseDecimal,
      },
      {
        dbField: 'contactEmail',
        excelColumns: ['Contact_Email', 'contact_email', 'Email'],
        type: 'string',
        required: false,
      },
      {
        dbField: 'contactPhone',
        excelColumns: ['Contact_Phone', 'contact_phone', 'Phone'],
        type: 'string',
        required: false,
      },
    ],
  },

  warehouseSkuConfigs: {
    entityName: 'warehouseSkuConfig',
    tableName: 'warehouse_sku_configs',
    displayName: 'Warehouse SKU Configurations',
    uniqueFields: ['warehouseId', 'skuId', 'effectiveDate'],
    fieldMappings: [
      {
        dbField: 'warehouse',
        excelColumns: ['warehouse', 'Warehouse', 'Warehouse Name'],
        type: 'string',
        required: true,
      },
      {
        dbField: 'sku',
        excelColumns: ['SKU', 'sku', 'sku_code'],
        type: 'string',
        required: true,
      },
      {
        dbField: 'storageCartonsPerPallet',
        excelColumns: ['storage_cartons_per_pallet', 'Storage Cartons/Pallet', 'Storage CPP'],
        type: 'number',
        required: true,
        transform: transformers.parseNumber,
        defaultValue: 1,
      },
      {
        dbField: 'shippingCartonsPerPallet',
        excelColumns: ['shipping_cartons_per_pallet', 'Shipping Cartons/Pallet', 'Shipping CPP'],
        type: 'number',
        required: true,
        transform: transformers.parseNumber,
        defaultValue: 1,
      },
      {
        dbField: 'maxStackingHeightCm',
        excelColumns: ['max_stacking_height_cm', 'Max Stacking Height (cm)', 'Max Height'],
        type: 'number',
        required: false,
        transform: transformers.parseNumber,
      },
      {
        dbField: 'effectiveDate',
        excelColumns: ['effective_date', 'Effective Date', 'Start Date'],
        type: 'date',
        required: true,
        transform: transformers.parseDate,
        defaultValue: new Date(),
      },
      {
        dbField: 'endDate',
        excelColumns: ['end_date', 'End Date'],
        type: 'date',
        required: false,
        transform: transformers.parseDate,
      },
    ],
  },

  costRates: {
    entityName: 'costRate',
    tableName: 'cost_rates',
    displayName: 'Cost Rates',
    uniqueFields: ['warehouseId', 'costName', 'effectiveDate'],
    fieldMappings: [
      {
        dbField: 'warehouse',
        excelColumns: ['warehouse', 'Warehouse', 'Warehouse Name'],
        type: 'string',
        required: true,
      },
      {
        dbField: 'costCategory',
        excelColumns: ['cost_category', 'Cost Category', 'Category'],
        type: 'string',
        required: true,
        transform: (value: string) => {
          const categoryMap: Record<string, string> = {
            'storage': 'STORAGE',
            'container': 'CONTAINER',
            'pallet': 'PALLET',
            'carton': 'CARTON',
            'unit': 'UNIT',
            'shipment': 'SHIPMENT',
            'accessorial': 'ACCESSORIAL'
          }
          return categoryMap[value?.toLowerCase()] || 'ACCESSORIAL'
        },
      },
      {
        dbField: 'costName',
        excelColumns: ['cost_name', 'Cost Name', 'Name'],
        type: 'string',
        required: true,
      },
      {
        dbField: 'costValue',
        excelColumns: ['cost_value', 'Cost Value', 'Value', 'Rate'],
        type: 'decimal',
        required: true,
        transform: transformers.parseDecimal,
      },
      {
        dbField: 'unitOfMeasure',
        excelColumns: ['unit_of_measure', 'Unit of Measure', 'UOM'],
        type: 'string',
        required: true,
        defaultValue: 'unit',
      },
      {
        dbField: 'effectiveDate',
        excelColumns: ['effective_date', 'Effective Date', 'Start Date'],
        type: 'date',
        required: true,
        transform: transformers.parseDate,
        defaultValue: new Date(),
      },
      {
        dbField: 'endDate',
        excelColumns: ['end_date', 'End Date'],
        type: 'date',
        required: false,
        transform: transformers.parseDate,
      },
    ],
  },

  inventoryTransactions: {
    entityName: 'inventoryTransaction',
    tableName: 'inventory_transactions',
    displayName: 'Inventory Transactions',
    uniqueFields: [], // No unique fields for transactions - we'll always create new records
    fieldMappings: [
      // Transaction ID is auto-generated internally, not imported
      {
        dbField: 'transactionDate',
        excelColumns: ['transaction_date', 'Transaction Date', 'Date', 'Timestamp'],
        type: 'date',
        required: true,
        transform: transformers.parseDate,
        defaultValue: new Date(),
      },
      {
        dbField: 'pickupDate',
        excelColumns: ['pickup_date', 'Pickup Date'],
        type: 'date',
        required: false,
        transform: transformers.parseDate,
      },
      {
        dbField: 'isReconciled',
        excelColumns: ['is_reconciled', 'Reconciled', 'Is Reconciled'],
        type: 'boolean',
        required: false,
        transform: transformers.parseBoolean,
        defaultValue: false,
      },
      {
        dbField: 'transactionType',
        excelColumns: ['transaction_type', 'Transaction_Type', 'Type'],
        type: 'string',
        required: true,
        transform: transformers.toUpperCase,
        defaultValue: 'RECEIVE',
      },
      {
        dbField: 'warehouse',
        excelColumns: ['warehouse', 'Warehouse', 'Warehouse Name'],
        type: 'string',
        required: true,
      },
      {
        dbField: 'sku',
        excelColumns: ['sku', 'SKU', 'sku_code'],
        type: 'string',
        required: true,
      },
      {
        dbField: 'batchLot',
        excelColumns: ['batch_lot', 'Batch/Lot', 'Shipment', 'Batch'],
        type: 'string',
        required: true,
        defaultValue: 'DEFAULT',
      },
      {
        dbField: 'referenceId',
        excelColumns: ['reference_id', 'Reference_ID', 'Reference ID', 'Reference_ID (Email tag)'],
        type: 'string',
        required: false,
      },
      {
        dbField: 'cartonsIn',
        excelColumns: ['cartons_in', 'Cartons_In', 'Cartons In'],
        type: 'number',
        required: true,
        transform: transformers.parseNumber,
        defaultValue: 0,
      },
      {
        dbField: 'cartonsOut',
        excelColumns: ['cartons_out', 'Cartons_Out', 'Cartons Out'],
        type: 'number',
        required: true,
        transform: transformers.parseNumber,
        defaultValue: 0,
      },
      {
        dbField: 'storagePalletsIn',
        excelColumns: ['storage_pallets_in', 'Pallets_In', 'Storage Pallets In'],
        type: 'number',
        required: true,
        transform: transformers.parseNumber,
        defaultValue: 0,
      },
      {
        dbField: 'shippingPalletsOut',
        excelColumns: ['shipping_pallets_out', 'Pallets_Out', 'Shipping Pallets Out'],
        type: 'number',
        required: true,
        transform: transformers.parseNumber,
        defaultValue: 0,
      },
      {
        dbField: 'shipName',
        excelColumns: ['ship_name', 'Ship Name', 'Vessel'],
        type: 'string',
        required: false,
      },
      {
        dbField: 'trackingNumber',
        excelColumns: ['tracking_number', 'Tracking Number', 'Tracking'],
        type: 'string',
        required: false,
      },
      {
        dbField: 'modeOfTransportation',
        excelColumns: ['mode_of_transportation', 'Mode of Transportation', 'Transport Mode'],
        type: 'string',
        required: false,
      },
      {
        dbField: 'storageCartonsPerPallet',
        excelColumns: ['storage_cartons_per_pallet', 'Storage CPP', 'Storage Cartons/Pallet'],
        type: 'number',
        required: false,
        transform: transformers.parseNumber,
      },
      {
        dbField: 'shippingCartonsPerPallet',
        excelColumns: ['shipping_cartons_per_pallet', 'Shipping CPP', 'Shipping Cartons/Pallet'],
        type: 'number',
        required: false,
        transform: transformers.parseNumber,
      },
    ],
  },
}

// Helper function to get config by entity name
export function getImportConfig(entityName: string): ImportEntityConfig | null {
  return importConfigs[entityName] || null
}

// Helper function to map Excel row to database fields
export function mapExcelRowToEntity(row: any, config: ImportEntityConfig): any {
  const mappedData: any = {}
  const errors: string[] = []

  for (const mapping of config.fieldMappings) {
    let value = null

    // Try to find value from any of the possible Excel columns
    for (const column of mapping.excelColumns) {
      if (row[column] !== undefined && row[column] !== null && row[column] !== '') {
        value = row[column]
        break
      }
    }

    // Apply transformation if exists
    if (value !== null && mapping.transform) {
      value = mapping.transform(value)
    }

    // Use default value if no value found and default exists
    if (value === null && mapping.defaultValue !== undefined) {
      value = mapping.defaultValue
    }

    // Validate required fields
    if (mapping.required && (value === null || value === '')) {
      errors.push(`Missing required field: ${mapping.dbField}`)
    }

    // Apply custom validation if exists
    if (value !== null && mapping.validate && !mapping.validate(value)) {
      errors.push(`Invalid value for field: ${mapping.dbField}`)
    }

    if (value !== null) {
      mappedData[mapping.dbField] = value
    }
  }

  return { data: mappedData, errors }
}