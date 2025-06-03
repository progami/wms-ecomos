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

### Removed Features
- ❌ Excel import scripts (data already imported)
- ❌ Test data generators
- ❌ Sample data scripts
- ❌ Temporary/debug scripts

### Current Scripts
Only essential user management scripts remain:
- `create-users.ts` - Create new users
- `create-staff-users.ts` - Create staff users
- `update-role-checks.js` - Update role permissions

## 🚨 Important for New Developers

1. **DO NOT** modify existing inventory transactions
2. **DO NOT** create test data in production
3. **USE** adjustment transactions for corrections
4. **ALWAYS** use GBP (£) for monetary values
5. **FOLLOW** the immutable ledger pattern
6. **SKU Selection** - Both Receive and Ship pages use dropdown based on SKU master

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

The documentation is now accurate and reflects the current state of the system.