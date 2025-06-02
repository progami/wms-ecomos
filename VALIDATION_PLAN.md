# Data Validation and Input Control Plan
## Warehouse Management System

### Executive Summary
This plan outlines comprehensive data validation and input controls based on the Excel business rules and current architecture analysis. Implementation will ensure data integrity, prevent costly errors, and maintain accurate billing reconciliation.

## 1. Critical Business Rules to Enforce

### 1.1 Billing Period Constraints
- **Rule**: All billing periods MUST run from 16th to 15th of the following month
- **Implementation**:
  ```typescript
  // Validation function
  function validateBillingPeriod(date: Date): { start: Date, end: Date } {
    const day = date.getDate()
    if (day <= 15) {
      // Period: Previous month 16th to Current month 15th
      return {
        start: new Date(date.getFullYear(), date.getMonth() - 1, 16),
        end: new Date(date.getFullYear(), date.getMonth(), 15)
      }
    } else {
      // Period: Current month 16th to Next month 15th
      return {
        start: new Date(date.getFullYear(), date.getMonth(), 16),
        end: new Date(date.getFullYear(), date.getMonth() + 1, 15)
      }
    }
  }
  ```

### 1.2 Monday Storage Snapshot Rules
- **Rule**: Storage charges based on inventory at Monday 23:59:59
- **Implementation**:
  - Validate storage calculation dates are Mondays
  - Add time component (23:59:59) for end-of-day calculations
  - Prevent manual override of storage calculations

### 1.3 Inventory Balance Constraints
- **Rule**: No negative inventory allowed
- **Implementation**:
  - Pre-check available quantity before allowing shipments
  - Database trigger to prevent negative balances
  - Real-time UI validation showing available quantity

## 1.4 SKU and Product Attribute Constraints
- **Rule**: All product physical attributes must have realistic values
- **Implementation**:
  ```typescript
  // SKU validation rules
  const skuValidation = {
    packSize: { min: 1, max: 1000, required: true },
    unitsPerCarton: { min: 1, max: 10000, required: true },
    cartonWeightKg: { min: 0.01, max: 100, required: true }, // Cannot be 0!
    unitWeightKg: { min: 0.001, max: 50, required: false },
    cartonDimensionsCm: { 
      pattern: /^\d+x\d+x\d+$/, 
      example: "30x40x50",
      required: true 
    },
    unitDimensionsCm: { 
      pattern: /^\d+x\d+x\d+$/, 
      example: "10x15x20",
      required: false 
    }
  }
  ```

## 1.5 Cost Rate Business Constraints
- **Rule**: Enforce cost category-specific rules from Excel
- **Implementation**:
  ```typescript
  // Cost rate constraints by category
  const costRateConstraints = {
    Storage: {
      maxPerWarehouse: 1, // Only 1 storage rate per warehouse at a time
      requiredUnit: 'pallet/week',
      requiredName: 'Storage cost per pallet / week',
      rateRange: { min: 1, max: 100 }
    },
    Container: {
      allowedUnits: ['container', '20ft', '40ft', 'hc'],
      rateRange: { min: 50, max: 5000 }
    },
    Carton: {
      allowedUnits: ['carton', 'case'],
      rateRange: { min: 0.10, max: 50 }
    },
    Pallet: {
      allowedUnits: ['pallet', 'pallet/in', 'pallet/out'],
      rateRange: { min: 5, max: 500 }
    },
    Unit: {
      allowedUnits: ['unit', 'piece', 'item'],
      rateRange: { min: 0.01, max: 20 }
    },
    Shipment: {
      allowedUnits: ['shipment', 'order', 'delivery'],
      rateRange: { min: 5, max: 1000 }
    },
    Accessorial: {
      allowedUnits: ['hour', 'service', 'fee', 'charge'],
      rateRange: { min: 1, max: 500 }
    }
  }
  ```

## 1.6 Warehouse Configuration Constraints
- **Rule**: Cartons per pallet must be realistic and consistent
- **Implementation**:
  ```typescript
  // Warehouse config validation
  const warehouseConfigValidation = {
    cartonsPerPallet: {
      min: 1,
      max: 200,
      warningThreshold: 100, // Flag for review if > 100
      mustMatchPhysics: true // Validate against carton dimensions
    },
    effectiveDateRules: {
      noGaps: true, // No gaps in coverage
      noOverlaps: true, // No overlapping date ranges
      futureLimit: 365, // Max days in future
    }
  }
  ```

## 2. Validation Layers Architecture

### Layer 1: Database Constraints
```sql
-- Add comprehensive check constraints to all tables

-- SKU constraints
ALTER TABLE skus
  ADD CONSTRAINT valid_pack_size CHECK (pack_size > 0 AND pack_size <= 1000),
  ADD CONSTRAINT valid_units_per_carton CHECK (units_per_carton > 0 AND units_per_carton <= 10000),
  ADD CONSTRAINT valid_carton_weight CHECK (carton_weight_kg > 0 AND carton_weight_kg <= 100),
  ADD CONSTRAINT valid_unit_weight CHECK (unit_weight_kg IS NULL OR (unit_weight_kg > 0 AND unit_weight_kg <= 50)),
  ADD CONSTRAINT valid_carton_dimensions CHECK (carton_dimensions_cm ~ '^\d+x\d+x\d+$'),
  ADD CONSTRAINT valid_sku_code CHECK (sku_code ~ '^[A-Z]{2,3}\s\d{3,4}$');

-- Inventory transaction constraints  
ALTER TABLE inventory_transactions 
  ADD CONSTRAINT positive_quantities CHECK (
    cartons_in >= 0 AND cartons_out >= 0 AND
    units_in >= 0 AND units_out >= 0
  ),
  ADD CONSTRAINT single_direction CHECK (
    (cartons_in > 0 AND cartons_out = 0) OR 
    (cartons_in = 0 AND cartons_out > 0) OR
    (cartons_in = 0 AND cartons_out = 0)
  ),
  ADD CONSTRAINT valid_batch_lot CHECK (batch_lot ~ '^[A-Z0-9-]+$'),
  ADD CONSTRAINT valid_reference CHECK (reference_id ~ '^[A-Z0-9-#]+$'),
  ADD CONSTRAINT valid_transaction_date CHECK (
    transaction_date >= '2024-01-01' AND 
    transaction_date <= CURRENT_DATE
  );

-- Cost rate constraints
ALTER TABLE cost_rates
  ADD CONSTRAINT positive_rate CHECK (cost_value > 0),
  ADD CONSTRAINT valid_cost_value_range CHECK (
    (cost_category = 'Storage' AND cost_value BETWEEN 1 AND 100) OR
    (cost_category = 'Container' AND cost_value BETWEEN 50 AND 5000) OR
    (cost_category = 'Carton' AND cost_value BETWEEN 0.10 AND 50) OR
    (cost_category = 'Pallet' AND cost_value BETWEEN 5 AND 500) OR
    (cost_category = 'Unit' AND cost_value BETWEEN 0.01 AND 20) OR
    (cost_category = 'Shipment' AND cost_value BETWEEN 5 AND 1000) OR
    (cost_category = 'Accessorial' AND cost_value BETWEEN 1 AND 500)
  ),
  ADD CONSTRAINT storage_unit_check CHECK (
    cost_category != 'Storage' OR unit_of_measure = 'pallet/week'
  ),
  ADD CONSTRAINT storage_name_check CHECK (
    cost_category != 'Storage' OR cost_name = 'Storage cost per pallet / week'
  );

-- Warehouse configuration constraints
ALTER TABLE warehouse_configs
  ADD CONSTRAINT valid_cartons_per_pallet CHECK (
    cartons_per_pallet > 0 AND cartons_per_pallet <= 200
  ),
  ADD CONSTRAINT valid_units_per_carton CHECK (
    units_per_carton > 0 AND units_per_carton <= 10000
  );

-- Invoice constraints
ALTER TABLE invoices
  ADD CONSTRAINT positive_amount CHECK (total_amount >= 0),
  ADD CONSTRAINT valid_invoice_number CHECK (invoice_number ~ '^INV-\d{4}-\d{2}-[A-Z0-9]+$'),
  ADD CONSTRAINT valid_billing_period CHECK (
    EXTRACT(DAY FROM billing_period_start) = 16 AND
    EXTRACT(DAY FROM billing_period_end) = 15
  ),
  ADD CONSTRAINT billing_period_sequence CHECK (
    billing_period_end > billing_period_start
  );

-- Invoice line item constraints
ALTER TABLE invoice_line_items
  ADD CONSTRAINT positive_line_amount CHECK (amount >= 0),
  ADD CONSTRAINT positive_quantity CHECK (quantity > 0),
  ADD CONSTRAINT positive_rate CHECK (rate > 0),
  ADD CONSTRAINT amount_calculation CHECK (
    ABS(amount - (quantity * rate)) < 0.01
  );

-- Add trigger for inventory balance validation
CREATE OR REPLACE FUNCTION validate_inventory_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if shipment would result in negative inventory
  IF NEW.transaction_type IN ('SHIP', 'ADJUST_OUT') THEN
    -- Complex balance check logic here
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Layer 2: API Validation Schemas (Zod)
```typescript
// src/lib/validation/schemas.ts

import { z } from 'zod'

// SKU validation schema with comprehensive rules
export const skuSchema = z.object({
  skuCode: z.string()
    .regex(/^[A-Z]{2,3}\s\d{3,4}$/, 'Format: CS 007'),
  description: z.string().min(1).max(200),
  packSize: z.number()
    .int()
    .min(1, 'Pack size must be at least 1')
    .max(1000, 'Pack size too large'),
  unitsPerCarton: z.number()
    .int()
    .min(1, 'Must have at least 1 unit per carton')
    .max(10000, 'Too many units per carton'),
  cartonWeightKg: z.number()
    .positive('Carton weight cannot be zero')
    .min(0.01, 'Minimum weight is 0.01 kg')
    .max(100, 'Maximum weight is 100 kg'),
  unitWeightKg: z.number()
    .positive()
    .min(0.001)
    .max(50)
    .optional(),
  cartonDimensionsCm: z.string()
    .regex(/^\d+x\d+x\d+$/, 'Format: 30x40x50'),
  unitDimensionsCm: z.string()
    .regex(/^\d+x\d+x\d+$/, 'Format: 10x15x20')
    .optional(),
  asin: z.string().optional(),
  material: z.string().optional(),
  packagingType: z.string().optional(),
  isActive: z.boolean().default(true)
}).refine(data => {
  // Validate unit weight is less than carton weight
  if (data.unitWeightKg && data.unitsPerCarton) {
    const totalUnitWeight = data.unitWeightKg * data.unitsPerCarton
    return totalUnitWeight <= data.cartonWeightKg * 1.2 // Allow 20% packaging weight
  }
  return true
}, { message: 'Unit weights exceed carton weight' })

// Transaction validation schema
export const transactionSchema = z.object({
  warehouseId: z.string().uuid(),
  skuId: z.string().uuid(),
  batchLot: z.string()
    .min(1, 'Batch/lot is required')
    .regex(/^[A-Z0-9-]+$/, 'Format: BATCH-001'),
  transactionType: z.enum(['RECEIVE', 'SHIP', 'ADJUST_IN', 'ADJUST_OUT']),
  referenceId: z.string()
    .min(1)
    .max(50)
    .regex(/^[A-Z0-9-#]+$/, 'Format: CONT-12345'),
  cartonsIn: z.number().int().min(0).default(0),
  cartonsOut: z.number().int().min(0).default(0),
  unitsIn: z.number().int().min(0).default(0),
  unitsOut: z.number().int().min(0).default(0),
  transactionDate: z.date()
    .max(new Date(), 'Cannot post future transactions')
    .min(new Date('2024-01-01'), 'Date too far in past'),
  notes: z.string().max(500).optional()
}).refine(data => {
  // Ensure only one direction has values
  const hasIn = data.cartonsIn > 0 || data.unitsIn > 0
  const hasOut = data.cartonsOut > 0 || data.unitsOut > 0
  return !(hasIn && hasOut)
}, { message: 'Transaction can only be inbound or outbound, not both' })

// Invoice validation schema
export const invoiceSchema = z.object({
  invoiceNumber: z.string()
    .regex(/^INV-\d{4}-\d{2}-[A-Z]{3}$/, 'Format: INV-YYYY-MM-XXX'),
  warehouseId: z.string().uuid(),
  billingPeriodStart: z.date(),
  billingPeriodEnd: z.date(),
  totalAmount: z.number().positive(),
  lineItems: z.array(z.object({
    costCategory: z.enum(['Container', 'Carton', 'Pallet', 'Storage', 'Unit', 'Shipment', 'Accessorial']),
    costName: z.string(),
    quantity: z.number().positive(),
    rate: z.number().positive(),
    amount: z.number().positive()
  }))
}).refine(data => {
  // Validate billing period is 16th to 15th
  const start = data.billingPeriodStart.getDate()
  const end = data.billingPeriodEnd.getDate()
  return start === 16 && end === 15
}, { message: 'Billing period must be 16th to 15th' })

// Enhanced cost rate validation schema
export const costRateSchema = z.object({
  warehouseId: z.string().uuid(),
  costCategory: z.enum(['Container', 'Carton', 'Pallet', 'Storage', 'Unit', 'Shipment', 'Accessorial']),
  costName: z.string().min(1).max(100),
  costValue: z.number().positive('Rate must be positive'),
  unitOfMeasure: z.string(),
  effectiveDate: z.date(),
  endDate: z.date().optional(),
  notes: z.string().max(500).optional()
}).superRefine((data, ctx) => {
  const constraints = {
    Container: {
      allowedUnits: ['container', '20ft', '40ft', 'hc'],
      rateRange: { min: 50, max: 5000 }
    },
    Carton: {
      allowedUnits: ['carton', 'case'],
      rateRange: { min: 0.10, max: 50 }
    },
    Pallet: {
      allowedUnits: ['pallet', 'pallet/in', 'pallet/out'],
      rateRange: { min: 5, max: 500 }
    },
    Storage: {
      allowedUnits: ['pallet/week'],
      rateRange: { min: 1, max: 100 },
      requiredName: 'Storage cost per pallet / week'
    },
    Unit: {
      allowedUnits: ['unit', 'piece', 'item'],
      rateRange: { min: 0.01, max: 20 }
    },
    Shipment: {
      allowedUnits: ['shipment', 'order', 'delivery'],
      rateRange: { min: 5, max: 1000 }
    },
    Accessorial: {
      allowedUnits: ['hour', 'service', 'fee', 'charge'],
      rateRange: { min: 1, max: 500 }
    }
  }

  const constraint = constraints[data.costCategory]
  
  // Validate unit of measure
  if (!constraint.allowedUnits.includes(data.unitOfMeasure)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid unit for ${data.costCategory}. Allowed: ${constraint.allowedUnits.join(', ')}`
    })
  }
  
  // Validate rate range
  if (data.costValue < constraint.rateRange.min || data.costValue > constraint.rateRange.max) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Rate for ${data.costCategory} must be between ${constraint.rateRange.min} and ${constraint.rateRange.max}`
    })
  }
  
  // Special validation for storage
  if (data.costCategory === 'Storage' && data.costName !== constraint.requiredName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Storage cost name must be "${constraint.requiredName}"`
    })
  }
  
  // Validate date range
  if (data.endDate && data.endDate <= data.effectiveDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'End date must be after effective date'
    })
  }
})

// Warehouse configuration validation
export const warehouseConfigSchema = z.object({
  warehouseId: z.string().uuid(),
  skuId: z.string().uuid(),
  cartonsPerPallet: z.number()
    .int()
    .min(1, 'Must have at least 1 carton per pallet')
    .max(200, 'Too many cartons per pallet - please verify'),
  unitsPerCarton: z.number()
    .int()
    .min(1)
    .max(10000),
  effectiveDate: z.date()
    .max(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'Cannot set rates more than 1 year in future'),
  endDate: z.date().optional()
}).refine(data => {
  if (data.cartonsPerPallet > 100) {
    console.warn(`High cartons per pallet value: ${data.cartonsPerPallet}`)
  }
  return true
})
```

### Layer 3: Business Logic Validation Service
```typescript
// src/lib/validation/business-rules.ts

export class ValidationService {
  // Validate inventory availability
  async validateInventoryAvailability(
    warehouseId: string,
    skuId: string,
    batchLot: string,
    requestedQuantity: number
  ): Promise<ValidationResult> {
    const balance = await prisma.inventoryBalance.findUnique({
      where: { warehouseId_skuId_batchLot: { warehouseId, skuId, batchLot } }
    })
    
    if (!balance || balance.currentCartons < requestedQuantity) {
      return {
        valid: false,
        error: `Insufficient inventory. Available: ${balance?.currentCartons || 0}`
      }
    }
    
    return { valid: true }
  }

  // Validate no duplicate transactions
  async validateDuplicateTransaction(
    referenceId: string,
    transactionType: string
  ): Promise<ValidationResult> {
    const existing = await prisma.inventoryTransaction.findFirst({
      where: { referenceId, transactionType }
    })
    
    if (existing) {
      return {
        valid: false,
        error: `Duplicate ${transactionType} with reference ${referenceId}`
      }
    }
    
    return { valid: true }
  }

  // Validate cost rate overlaps
  async validateCostRateOverlap(
    warehouseId: string,
    costName: string,
    effectiveDate: Date,
    costCategory: string,
    excludeId?: string
  ): Promise<ValidationResult> {
    // Special check for Storage category - only one active rate per warehouse
    if (costCategory === 'Storage') {
      const activeStorageRate = await prisma.costRate.findFirst({
        where: {
          warehouseId,
          costCategory: 'Storage',
          id: excludeId ? { not: excludeId } : undefined,
          effectiveDate: { lte: effectiveDate },
          OR: [
            { endDate: null },
            { endDate: { gte: effectiveDate } }
          ]
        }
      })
      
      if (activeStorageRate) {
        return {
          valid: false,
          error: 'Only one storage rate allowed per warehouse. End the existing rate first.'
        }
      }
    }
    
    // General overlap check for other categories
    const overlapping = await prisma.costRate.findFirst({
      where: {
        warehouseId,
        costName,
        id: excludeId ? { not: excludeId } : undefined,
        effectiveDate: { lte: effectiveDate },
        OR: [
          { endDate: null },
          { endDate: { gte: effectiveDate } }
        ]
      }
    })
    
    if (overlapping) {
      return {
        valid: false,
        error: 'Overlapping cost rate exists for this period'
      }
    }
    
    return { valid: true }
  }

  // Validate physical constraints
  async validatePhysicalConstraints(
    skuId: string,
    cartonsPerPallet: number
  ): Promise<ValidationResult> {
    const sku = await prisma.sku.findUnique({
      where: { id: skuId }
    })
    
    if (!sku) {
      return { valid: false, error: 'SKU not found' }
    }
    
    // Parse dimensions (format: "30x40x50")
    const parseDimensions = (dim: string) => {
      const [l, w, h] = dim.split('x').map(Number)
      return { length: l, width: w, height: h }
    }
    
    if (sku.cartonDimensionsCm) {
      const carton = parseDimensions(sku.cartonDimensionsCm)
      const cartonVolume = carton.length * carton.width * carton.height
      
      // Standard pallet dimensions (120x100x150 cm)
      const palletVolume = 120 * 100 * 150
      
      // Maximum theoretical cartons (with 85% efficiency)
      const maxCartons = Math.floor((palletVolume * 0.85) / cartonVolume)
      
      if (cartonsPerPallet > maxCartons) {
        return {
          valid: false,
          error: `Physical constraint: Maximum ${maxCartons} cartons can fit on a pallet based on dimensions`
        }
      }
    }
    
    // Weight constraint (standard pallet max: 1000kg)
    if (sku.cartonWeightKg) {
      const totalWeight = sku.cartonWeightKg * cartonsPerPallet
      if (totalWeight > 1000) {
        return {
          valid: false,
          error: `Weight constraint: Total weight ${totalWeight}kg exceeds pallet limit of 1000kg`
        }
      }
    }
    
    return { valid: true }
  }
}
```

### Layer 4: UI Input Controls
```typescript
// src/components/forms/validated-input.tsx

interface ValidatedInputProps {
  name: string
  label: string
  type: 'sku' | 'batch' | 'reference' | 'amount'
  required?: boolean
  onChange: (value: string) => void
  error?: string
}

export function ValidatedInput({ type, ...props }: ValidatedInputProps) {
  const patterns = {
    sku: /^[A-Z]{2,3}\s\d{3,4}$/,
    batch: /^[A-Z0-9-]+$/,
    reference: /^[A-Z0-9-#]+$/,
    amount: /^\d+(\.\d{1,2})?$/
  }
  
  const placeholders = {
    sku: 'CS 007',
    batch: 'BATCH-001',
    reference: 'CONT-12345',
    amount: '0.00'
  }
  
  return (
    <input
      {...props}
      pattern={patterns[type]?.source}
      placeholder={placeholders[type]}
      className={cn(
        'form-input',
        props.error && 'border-red-500'
      )}
    />
  )
}
```

## 3. Implementation Priority Matrix

| Validation | Priority | Complexity | Business Impact |
|------------|----------|------------|-----------------|
| Prevent negative inventory | **Critical** | Medium | Prevents overselling |
| Billing period validation | **Critical** | Low | Ensures accurate invoicing |
| Monday storage validation | **Critical** | Medium | Correct storage charges |
| Transaction date limits | **High** | Low | Prevents backdating errors |
| Batch/lot tracking | **High** | Low | Maintains traceability |
| Cost rate overlaps | **High** | Medium | Prevents double charging |
| Reference format validation | **Medium** | Low | Data consistency |
| Quantity range checks | **Medium** | Low | Prevents data entry errors |
| Duplicate prevention | **Medium** | Medium | Data integrity |

## 4. Validation Error Messages

### User-Friendly Error Messages
```typescript
const ERROR_MESSAGES = {
  INSUFFICIENT_INVENTORY: 'Not enough inventory available. Current stock: {available} {unit}',
  INVALID_BILLING_PERIOD: 'Billing periods must run from 16th to 15th of the month',
  FUTURE_DATE: 'Cannot enter transactions for future dates',
  DUPLICATE_REFERENCE: 'A transaction with reference {ref} already exists',
  INVALID_QUANTITY: 'Quantity must be between 1 and 9999',
  MISSING_BATCH: 'Batch/lot number is required for inventory tracking',
  INVALID_SKU_FORMAT: 'SKU format should be like "CS 007"',
  OVERLAPPING_RATE: 'A rate already exists for this period. End the existing rate first.'
}
```

## 5. Implementation Phases

### Phase 1: Critical Validations (Week 1)
1. **Negative inventory prevention**
   - Database trigger to check balance before shipment
   - Real-time availability check in UI
   - API validation before transaction commit
   
2. **Physical attribute validation**
   - Carton weight must be > 0
   - SKU code format enforcement
   - Dimension format validation (LxWxH)
   
3. **Billing period validation**
   - Enforce 16th-15th rule
   - Validate Monday storage snapshots
   - Transaction date constraints

4. **Cost rate constraints**
   - One storage rate per warehouse rule
   - Category-specific unit validation
   - Rate range enforcement

### Phase 2: Data Integrity (Week 2)
1. **Implement all Zod schemas**
   - SKU schema with weight/dimension rules
   - Transaction schema with direction validation
   - Cost rate schema with category rules
   - Invoice schema with billing period checks
   
2. **Add database constraints**
   - All CHECK constraints from plan
   - Unique constraints for business rules
   - Foreign key cascade rules
   
3. **Create validation service**
   - Physical constraint validation
   - Storage rate uniqueness
   - Overlap detection
   
4. **Duplicate prevention**
   - Transaction reference uniqueness
   - Invoice number format and uniqueness
   - Batch/lot tracking consistency

### Phase 3: UI Controls (Week 3)
1. **Enhanced input components**
   - Weight inputs with min value enforcement
   - Dimension inputs with format mask (30x40x50)
   - SKU code input with pattern (CS 007)
   - Batch/lot input with uppercase transform
   
2. **Real-time validation**
   - Cartons per pallet physics check
   - Available inventory display
   - Cost rate conflict warnings
   
3. **Smart defaults and helpers**
   - Auto-generate batch numbers
   - Suggest SKU codes
   - Pre-fill common dimensions
   
4. **Category-specific forms**
   - Storage rate form (locked to pallet/week)
   - Container rate form (size options)
   - Dynamic unit dropdown by category

### Phase 4: Advanced Rules (Week 4)
1. **Complex business validations**
   - Cross-warehouse inventory checks
   - Multi-level approval for adjustments
   - Historical data protection (cutoff dates)
   
2. **Performance optimizations**
   - Validation caching
   - Batch validation for imports
   - Async validation queues
   
3. **Reporting and alerts**
   - Validation failure reports
   - Unusual pattern detection
   - Compliance dashboard
   
4. **Integration validations**
   - Excel import validation
   - API rate limiting
   - Webhook payload validation

## 6. Testing Strategy

### Unit Tests
- Test each validation function independently
- Test edge cases (month boundaries, leap years)
- Test error message generation

### Integration Tests
- Test validation chains (UI → API → DB)
- Test transaction rollback on validation failure
- Test concurrent validation scenarios

### User Acceptance Tests
- Test with real Excel data patterns
- Verify error messages are helpful
- Ensure validations don't block legitimate operations

## 7. Success Metrics

1. **Zero negative inventory incidents**
2. **100% billing period compliance**
3. **< 1% validation false positives**
4. **< 5 second validation response time**
5. **95% user satisfaction with error messages**

## Approval Request

This validation plan will:
- ✅ Prevent costly billing errors
- ✅ Ensure data integrity across the system
- ✅ Provide clear feedback to users
- ✅ Maintain compatibility with Excel workflows
- ✅ Scale with business growth

**Please review and approve this plan to proceed with implementation.**

---
*Estimated Implementation Time: 4 weeks*
*Estimated Effort: 160 hours*