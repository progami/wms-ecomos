# Documentation Status

## ✅ Updated Documentation

### README.md
- ✅ Added immutable ledger setup instructions
- ✅ Added important notes about immutability
- ✅ Added currency (GBP) clarification
- ✅ Clarified that scripts folder contains user management scripts
- ✅ Documented the two-role system (Admin/Staff)

### docs/setup/quick-start.md
- ✅ Updated login credentials to match actual seed data
- ✅ Added immutable ledger setup as optional step
- ✅ Added note about audit compliance

### docs/architecture/web-app-architecture.md
- ✅ Already correctly describes two-role system
- ✅ Correctly mentions "Inventory Ledger" (not transaction ledger)
- ✅ Architecture aligns with current implementation

## 📋 Key Documentation Points

### System Features
1. **Immutable Ledger**
   - PostgreSQL triggers prevent edits/deletes
   - Corrections via ADJUST_IN/ADJUST_OUT only
   - Maintains permanent audit trail

2. **Currency**
   - All values in GBP (£)
   - Storage: £/pallet/week
   - Amazon: £/cubic foot/month

3. **User Roles**
   - Admin: Full system access
   - Staff: Operational access (warehouse/finance tasks)

4. **Data Management**
   - Real Excel data imported (174 transactions)
   - No test/sample data in production
   - All import scripts removed
   - Batch numbers auto-increment per SKU
   - Document attachments stored as JSONB

### Removed Features
- ❌ Excel import functionality (import-excel-data.ts is missing, import buttons removed)
- ❌ Test data generators (various test/sample scripts exist but not documented)
- ❌ Sample data scripts (add-sample-rates.ts, add-sample-finance-data.ts don't exist)
- ❌ Utility scripts (ensure-amazon-warehouse.ts, verify-finance-dashboard.ts don't exist)

### Current Scripts
Only essential user management scripts remain:
- `create-users.ts` - Create new users
- `create-staff-users.ts` - Create staff users
- `update-role-checks.js` - Update role permissions

## 🚨 Important for New Developers

1. **DO NOT** modify existing inventory transactions
2. **DO NOT** create test data in production
3. **DO NOT** create backdated transactions (enforced by database triggers)
4. **USE** adjustment transactions for corrections
5. **ALWAYS** use GBP (£) for monetary values
6. **FOLLOW** the immutable ledger pattern
7. **SKU Selection** - Both Receive and Ship pages use dropdown based on SKU master
8. **Batch Numbers** - Automatically incremented based on last batch for each SKU
9. **Attachments** - Receive Goods supports explicit document categories:
   - Packing List
   - Commercial Invoice
   - Delivery Note
   - Cube Master Stacking Style for Storage Pallets (highlighted)
   - Additional documents
10. **Ship Goods** - Uses source warehouse selection, Amazon carriers, FBA Tracking ID
11. **Ledger Features** - Pickup date tracking, reconciliation status, chronological enforcement
12. **Amazon FBA UK** - Excluded from operational pages, only visible in Amazon integration and cost rates

## ✅ Recent Updates

1. **Import Functionality Removed**: All import buttons and references have been removed from the UI since the required scripts don't exist.

## 📁 Documentation Structure

```
docs/
├── architecture/
│   ├── web-app-architecture.md    ✅ Current
│   ├── database-schema.sql        ✅ Matches Prisma
│   └── prisma-schema.prisma       ✅ Authoritative
├── setup/
│   └── quick-start.md             ✅ Updated
└── excel-templates/               ℹ️  Historical reference
    └── *.md                       (Original Excel system docs)
```

The documentation has been updated to reflect the actual state of the system.