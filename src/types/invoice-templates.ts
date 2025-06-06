export interface InvoiceTemplate {
  id: string
  name: string
  warehouseId: string
  warehouse: {
    id: string
    name: string
    code: string
  }
  description?: string
  isActive: boolean
  isDefault: boolean
  createdAt: string
  updatedAt: string
  createdById: string
  createdBy: {
    id: string
    fullName: string
  }
  rules: InvoiceTemplateRule[]
}

export interface InvoiceTemplateRule {
  id: string
  templateId: string
  transactionType: TransactionType
  costCategory: CostCategory
  costName: string
  calculationType: CalculationType
  rateValue?: number
  rateMultiplier?: number
  minCharge?: number
  maxCharge?: number
  unitOfMeasure: string
  includeInInvoice: boolean
  applyToAllSkus: boolean
  specificSkuIds: string[]
  priority: number
  conditions?: RuleCondition[]
  notes?: string
}

export type TransactionType = 'RECEIVE' | 'SHIP' | 'ADJUST_IN' | 'ADJUST_OUT' | 'TRANSFER'

export type CostCategory = 
  | 'Container'
  | 'Carton'
  | 'Pallet'
  | 'Storage'
  | 'Unit'
  | 'Shipment'
  | 'Accessorial'

export type CalculationType =
  | 'FIXED_RATE'      // Fixed rate per unit
  | 'PERCENTAGE'      // Percentage of base cost
  | 'TIERED'          // Tiered pricing based on volume
  | 'CUSTOM_FORMULA'  // Custom calculation formula
  | 'RATE_TABLE'      // Use rate from cost_rates table

export interface RuleCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in'
  value: any
}

// Predefined templates for each warehouse
export const WAREHOUSE_TEMPLATE_DEFAULTS: Record<string, Partial<InvoiceTemplateRule>[]> = {
  FMC: [
    {
      transactionType: 'RECEIVE',
      costCategory: 'Container',
      costName: 'Container Unloading',
      calculationType: 'FIXED_RATE',
      rateValue: 450,
      unitOfMeasure: 'container',
      includeInInvoice: true,
      applyToAllSkus: true,
      priority: 1
    },
    {
      transactionType: 'RECEIVE',
      costCategory: 'Carton',
      costName: 'Carton Handling',
      calculationType: 'FIXED_RATE',
      rateValue: 0.85,
      unitOfMeasure: 'carton',
      includeInInvoice: true,
      applyToAllSkus: true,
      priority: 2
    },
    {
      transactionType: 'SHIP',
      costCategory: 'Pallet',
      costName: 'Pallet Handling',
      calculationType: 'FIXED_RATE',
      rateValue: 15,
      unitOfMeasure: 'pallet',
      includeInInvoice: true,
      applyToAllSkus: true,
      priority: 3
    },
    {
      transactionType: 'SHIP',
      costCategory: 'Carton',
      costName: 'Pick and Pack',
      calculationType: 'FIXED_RATE',
      rateValue: 1.2,
      unitOfMeasure: 'carton',
      includeInInvoice: true,
      applyToAllSkus: true,
      priority: 4
    }
  ],
  VGlobal: [
    {
      transactionType: 'RECEIVE',
      costCategory: 'Container',
      costName: 'Terminal Handling Charges',
      calculationType: 'FIXED_RATE',
      rateValue: 185,
      unitOfMeasure: 'container',
      includeInInvoice: true,
      applyToAllSkus: true,
      priority: 1
    },
    {
      transactionType: 'RECEIVE',
      costCategory: 'Container',
      costName: 'Container Unloading',
      calculationType: 'FIXED_RATE',
      rateValue: 390,
      unitOfMeasure: 'container',
      includeInInvoice: true,
      applyToAllSkus: true,
      priority: 2
    },
    {
      transactionType: 'RECEIVE',
      costCategory: 'Carton',
      costName: 'Carton Handling Cost',
      calculationType: 'FIXED_RATE',
      rateValue: 1.4,
      unitOfMeasure: 'carton',
      includeInInvoice: true,
      applyToAllSkus: true,
      priority: 3
    },
    {
      transactionType: 'RECEIVE',
      costCategory: 'Pallet',
      costName: 'Pallet Unloading Cost',
      calculationType: 'FIXED_RATE',
      rateValue: 11.7,
      unitOfMeasure: 'pallet',
      includeInInvoice: true,
      applyToAllSkus: true,
      priority: 4
    },
    {
      transactionType: 'SHIP',
      costCategory: 'Unit',
      costName: 'Pick and Pack',
      calculationType: 'TIERED',
      unitOfMeasure: 'unit',
      includeInInvoice: true,
      applyToAllSkus: true,
      priority: 5,
      conditions: [
        { field: 'quantity', operator: 'less_than', value: 100 },
        { field: 'rate', operator: 'equals', value: 0.55 }
      ]
    }
  ],
  '4AS': [
    {
      transactionType: 'RECEIVE',
      costCategory: 'Container',
      costName: 'Container Handling',
      calculationType: 'FIXED_RATE',
      rateValue: 380,
      unitOfMeasure: 'container',
      includeInInvoice: true,
      applyToAllSkus: true,
      priority: 1
    },
    {
      transactionType: 'RECEIVE',
      costCategory: 'Carton',
      costName: 'Inbound Processing',
      calculationType: 'FIXED_RATE',
      rateValue: 1.1,
      unitOfMeasure: 'carton',
      includeInInvoice: true,
      applyToAllSkus: true,
      priority: 2
    },
    {
      transactionType: 'SHIP',
      costCategory: 'Shipment',
      costName: 'Freight Charge',
      calculationType: 'CUSTOM_FORMULA',
      unitOfMeasure: 'shipment',
      includeInInvoice: true,
      applyToAllSkus: true,
      priority: 3,
      notes: 'Based on weight and destination'
    }
  ],
  'Amazon FBA': [
    {
      transactionType: 'SHIP',
      costCategory: 'Shipment',
      costName: 'FBA Prep Service',
      calculationType: 'FIXED_RATE',
      rateValue: 0.5,
      unitOfMeasure: 'unit',
      includeInInvoice: true,
      applyToAllSkus: true,
      priority: 1
    },
    {
      transactionType: 'SHIP',
      costCategory: 'Carton',
      costName: 'FBA Label Service',
      calculationType: 'FIXED_RATE',
      rateValue: 0.3,
      unitOfMeasure: 'carton',
      includeInInvoice: true,
      applyToAllSkus: true,
      priority: 2
    },
    {
      transactionType: 'SHIP',
      costCategory: 'Shipment',
      costName: 'Amazon Partnered Carrier',
      calculationType: 'RATE_TABLE',
      unitOfMeasure: 'shipment',
      includeInInvoice: true,
      applyToAllSkus: true,
      priority: 3,
      notes: 'Uses Amazon carrier rates'
    }
  ]
}