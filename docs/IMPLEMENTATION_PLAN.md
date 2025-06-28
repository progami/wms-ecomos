# WMS Implementation Plan

## Overview
This document outlines a phased implementation plan to address 8 identified issues and incorporate critical reconciliation workflow improvements. The plan is organized into phases that can be implemented incrementally without breaking existing functionality.

## Issues to Address

1. **Make daily velocity editable in FBA shipment planning**
2. **Move replenishment suggestions into the table**
3. **Fix tracking number labeling for receive shipments**
4. **Add missing docs column to ledger table**
5. **Implement invoice templates instead of just uploads**
6. **Fix the reconciliation flow (Cost Ledger → Invoice → Reconciliation)**
7. **Move batch attributes to operations**
8. **Clean up settings page**

## Phase 1: Quick Fixes & UI Improvements (Low Complexity)

### 1.1 Fix Tracking Number Labeling (Issue #3)
**Files to Modify:**
- `/src/app/operations/receive/page.tsx`

**Changes Required:**
```typescript
// Line 628-634: Update label and tooltip
<label className="block text-sm font-medium text-gray-700 mb-1">
  <div className="flex items-center gap-1">
    Container/Tracking Number
    <Tooltip 
      content="Container number for ocean/ground shipments, tracking number for air/parcel shipments" 
      iconSize="sm"
    />
  </div>
</label>
```

**Database Migration:** None required

### 1.2 Make Daily Velocity Editable (Issue #1)
**Files to Modify:**
- `/src/app/analytics/page.tsx` (or create new FBA planning page if doesn't exist)

**Changes Required:**
- Add editable input field for daily velocity
- Store velocity preferences in localStorage or user preferences
- Update calculations to use custom velocity

**Database Migration:** None required (using localStorage)

### 1.3 Clean Up Settings Page (Issue #8)
**Files to Modify:**
- `/src/app/config/page.tsx`
- Create new operations batch attributes page

**Changes Required:**
- Remove batch attributes from config page
- Update navigation links
- Improve page layout and descriptions

**Database Migration:** None required

## Phase 2: Data Model Enhancements (Medium Complexity)

### 2.1 Add Docs Column to Ledger (Issue #4)
**Files to Modify:**
- `/src/app/finance/cost-ledger/page.tsx`
- `/src/app/api/finance/cost-ledger/route.ts`
- Database schema for attachments tracking

**Changes Required:**
```typescript
// Add to ledger table columns
<th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
  Docs
</th>

// In table body
<td className="px-6 py-4 text-center">
  {item.hasAttachments && (
    <FileText className="h-4 w-4 text-gray-400 mx-auto" />
  )}
</td>
```

**Database Migration:**
```sql
-- Add attachment tracking to transactions
ALTER TABLE inventory_transactions
ADD COLUMN has_attachments BOOLEAN DEFAULT FALSE;

-- Create index for performance
CREATE INDEX idx_transactions_attachments ON inventory_transactions(has_attachments);
```

### 2.2 Move Batch Attributes to Operations (Issue #7)
**Files to Create:**
- `/src/app/operations/batch-attributes/page.tsx`

**Files to Modify:**
- `/src/app/config/batch-attributes/page.tsx` (redirect to new location)
- Navigation components

**Changes Required:**
- Copy batch attributes functionality to operations section
- Update permissions (allow warehouse users access)
- Add warehouse-specific filtering
- Update navigation menus

**Database Migration:** None required

## Phase 3: Invoice Management System (High Complexity)

### 3.1 Implement Invoice Templates (Issue #5)
**Files to Create:**
- `/src/app/config/invoice-templates/[id]/page.tsx`
- `/src/app/config/invoice-templates/[id]/edit/page.tsx`
- `/src/app/config/invoice-templates/new/page.tsx`
- `/src/components/finance/invoice-template-builder.tsx`
- `/src/app/api/invoice-templates/route.ts`

**Files to Modify:**
- `/src/app/config/invoice-templates/page.tsx`
- `/src/app/finance/invoices/new/page.tsx`

**Key Features:**
- Template builder with drag-and-drop sections
- Variable placeholders ({{warehouseName}}, {{billingPeriod}}, etc.)
- Logo upload capability
- Multiple templates per warehouse
- Template versioning

**Database Migration:**
```sql
-- Create invoice templates table
CREATE TABLE invoice_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  warehouse_id UUID REFERENCES warehouses(id),
  is_default BOOLEAN DEFAULT FALSE,
  template_data JSONB NOT NULL,
  header_logo TEXT,
  footer_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id)
);

-- Add template reference to invoices
ALTER TABLE invoices
ADD COLUMN template_id UUID REFERENCES invoice_templates(id);

-- Ensure only one default template per warehouse
CREATE UNIQUE INDEX idx_one_default_template_per_warehouse 
ON invoice_templates(warehouse_id) 
WHERE is_default = TRUE;
```

**Template Structure:**
```json
{
  "sections": [
    {
      "type": "header",
      "content": {
        "logo": "base64...",
        "companyName": "{{warehouseName}}",
        "address": "{{warehouseAddress}}"
      }
    },
    {
      "type": "billing_info",
      "fields": ["invoiceNumber", "date", "billingPeriod", "dueDate"]
    },
    {
      "type": "line_items",
      "columns": ["description", "quantity", "rate", "amount"],
      "groupBy": "category"
    },
    {
      "type": "summary",
      "showTax": true,
      "showDiscount": false
    }
  ]
}
```

## Phase 4: FBA Planning Enhancement (Medium Complexity)

### 4.1 Move Replenishment Suggestions into Table (Issue #2)
**Files to Modify:**
- Create `/src/app/operations/fba-planning/page.tsx` if doesn't exist
- Update shipment planning components

**Changes Required:**
```typescript
// Table structure with inline suggestions
interface FBAItem {
  skuCode: string;
  currentStock: number;
  dailyVelocity: number;
  daysOfSupply: number;
  suggestedReplenishment: number;
  manualOverride?: number;
}

// Add editable cells for suggestions
<td>
  <input
    type="number"
    value={item.manualOverride ?? item.suggestedReplenishment}
    onChange={(e) => updateManualOverride(item.id, e.target.value)}
    className="w-full px-2 py-1 border rounded"
  />
</td>
```

**Database Migration:** None required

## Phase 5: Reconciliation Workflow Overhaul (High Complexity)

### 5.1 Fix Reconciliation Flow (Issue #6)
**Current Flow Issues:**
- No clear progression from Cost Ledger → Invoice → Reconciliation
- Missing automated matching
- No dispute resolution workflow

**Files to Modify:**
- `/src/app/finance/cost-ledger/page.tsx`
- `/src/app/finance/invoices/page.tsx`
- `/src/app/finance/reconciliation/page.tsx`
- Create new API endpoints for automated matching

**New Workflow:**
1. **Cost Ledger** - Shows all calculated costs with "Create Invoice" action
2. **Invoice Creation** - Pre-populated from cost ledger with template selection
3. **Automated Reconciliation** - System matches invoice lines to cost ledger
4. **Dispute Management** - Structured resolution process

**Key Changes:**

#### Cost Ledger Page
```typescript
// Add action column
<button onClick={() => createInvoiceFromPeriod(week)}>
  Create Invoice
</button>
```

#### Invoice Creation Flow
```typescript
// Pre-populate from cost ledger
const createInvoiceFromCosts = async (period: WeekCosts) => {
  const invoice = {
    billingPeriodStart: period.weekStarting,
    billingPeriodEnd: period.weekEnding,
    lineItems: period.details.map(d => ({
      category: d.category,
      description: d.rateDescription,
      quantity: d.quantity,
      rate: d.rate,
      amount: d.cost,
      sourceTransactionId: d.transactionId
    }))
  };
  // Navigate to invoice creation with pre-filled data
};
```

#### Automated Matching
```typescript
// API endpoint for reconciliation
async function reconcileInvoice(invoiceId: string) {
  // 1. Get invoice line items
  // 2. Match against cost ledger by period & warehouse
  // 3. Create reconciliation records
  // 4. Flag discrepancies
  
  const matches = await matchInvoiceToLedger(invoice);
  
  for (const line of invoice.lineItems) {
    const ledgerMatch = matches.find(m => 
      m.category === line.category && 
      Math.abs(m.amount - line.amount) < 0.01
    );
    
    await createReconciliationRecord({
      invoiceLineId: line.id,
      ledgerEntryId: ledgerMatch?.id,
      status: ledgerMatch ? 'matched' : 'unmatched',
      variance: line.amount - (ledgerMatch?.amount || 0)
    });
  }
}
```

**Database Migration:**
```sql
-- Add reconciliation status to invoices
ALTER TABLE invoices
ADD COLUMN reconciliation_status VARCHAR(50) DEFAULT 'pending';

-- Create reconciliation records table
CREATE TABLE reconciliation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id),
  invoice_line_id UUID REFERENCES invoice_line_items(id),
  cost_ledger_id UUID REFERENCES calculated_costs(id),
  expected_amount DECIMAL(10,2),
  invoiced_amount DECIMAL(10,2),
  variance DECIMAL(10,2),
  status VARCHAR(50) NOT NULL,
  resolution_notes TEXT,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX idx_reconciliation_invoice ON reconciliation_records(invoice_id);
CREATE INDEX idx_reconciliation_status ON reconciliation_records(status);
```

## Implementation Timeline

### Week 1-2: Phase 1 (Quick Fixes)
- Day 1-2: Fix tracking number labeling
- Day 3-4: Make daily velocity editable
- Day 5: Clean up settings page
- Day 6-7: Testing and deployment

### Week 3-4: Phase 2 (Data Enhancements)
- Day 1-3: Add docs column to ledger
- Day 4-6: Move batch attributes to operations
- Day 7: Testing and deployment

### Week 5-7: Phase 3 (Invoice Templates)
- Day 1-5: Build template system and database
- Day 6-10: Create template builder UI
- Day 11-14: Integrate with invoice creation
- Day 15: Testing and deployment

### Week 8-9: Phase 4 (FBA Planning)
- Day 1-3: Create/update FBA planning page
- Day 4-6: Move suggestions into table
- Day 7-8: Add velocity customization
- Day 9-10: Testing and deployment

### Week 10-12: Phase 5 (Reconciliation)
- Day 1-5: Build automated matching system
- Day 6-10: Update UI flows
- Day 11-14: Implement dispute management
- Day 15: Testing and deployment

## Risk Mitigation

1. **Backward Compatibility**
   - Keep old invoice upload functionality during transition
   - Maintain existing API endpoints
   - Add feature flags for gradual rollout

2. **Data Migration**
   - Run migrations in staging first
   - Create rollback scripts
   - Backup production database before major changes

3. **User Training**
   - Document new workflows
   - Create video tutorials for complex features
   - Provide in-app guidance

## Success Metrics

1. **Efficiency Gains**
   - Reduce invoice creation time by 50%
   - Automate 80% of reconciliation matches
   - Decrease dispute resolution time by 40%

2. **Accuracy Improvements**
   - Reduce billing errors by 90%
   - Improve cost tracking accuracy to 99%
   - Eliminate manual reconciliation errors

3. **User Satisfaction**
   - Measure through feedback surveys
   - Track feature adoption rates
   - Monitor support ticket volume

## Dependencies

1. **Technical Dependencies**
   - Next.js 14+ for server components
   - Prisma ORM for database operations
   - React Hook Form for complex forms
   - TanStack Query for data fetching

2. **Business Dependencies**
   - Approval for database schema changes
   - User acceptance testing for each phase
   - Training materials preparation

## Notes

- Each phase is designed to be deployed independently
- Focus on maintaining system stability throughout
- Prioritize user experience and minimize disruption
- Consider A/B testing for major UI changes