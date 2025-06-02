# Warehouse Management System - Complete Overview

## 🎯 System Purpose

This warehouse management system replaces complex Excel spreadsheets with a modern web application while maintaining the same business logic. It tracks inventory movements, calculates storage costs, and manages billing across multiple 3PL (third-party logistics) warehouses.

## 🏗️ Architecture Overview

### Technology Stack
- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with session-based auth
- **Deployment**: Optimized for Vercel/similar platforms

### Core Design Principles
1. **Transaction-Based Ledger**: All inventory is tracked through immutable transactions
2. **Point-in-Time Calculations**: Can reconstruct inventory state at any historical date
3. **Excel Compatibility**: Maintains exact business logic from original Excel system
4. **Real-time Updates**: Instant balance calculations from transaction history

## 👥 User Roles (Simplified 2-Role System)

### Admin Role
- Full system access and configuration
- User management
- System settings
- Import/export data
- Run calculations
- All operational features

### Staff Role  
- Operational access
- Inventory management
- Invoice processing
- Reports and analytics
- Rate viewing
- Settings access

## 📊 Data Model

### Core Entities

#### Inventory Transactions
- Every movement is a transaction (RECEIVE, SHIP, ADJUST_IN, ADJUST_OUT)
- Immutable audit trail
- Links to warehouse, SKU, and batch/lot

#### Inventory Balances
- Calculated from transaction history
- Current state by Warehouse + SKU + Batch/Lot
- Never manually edited

#### Storage Ledger
- Weekly snapshots taken every Monday at 23:59:59
- Calculates pallets used for billing
- Billing periods: 16th to 15th of month

#### Cost Rates
- Time-based rate tables
- Categories: Container, Carton, Pallet, Storage, Unit, Shipment
- Effective date ranges

## 🔄 Key Workflows

### 1. Receiving Inventory
1. Navigate to Inventory Ledger
2. Click "Receive Goods" button
3. Enter receipt details (date, SKU, batch, quantity)
4. System creates RECEIVE transaction
5. Balances update automatically

### 2. Shipping Inventory
1. Navigate to Inventory Ledger  
2. Click "Ship Goods" button
3. Select items to ship (validates available quantity)
4. System creates SHIP transaction
5. Balances update automatically

### 3. Storage Billing Calculation
1. Admin runs "Storage Ledger" calculation
2. System takes Monday snapshots of inventory
3. Calculates pallets based on SKU configuration
4. Applies weekly storage rates
5. Generates billing period charges (16th-15th)

### 4. Invoice Reconciliation
1. Upload warehouse invoices (PDF/Excel)
2. System extracts line items
3. Compares against calculated costs
4. Identifies variances
5. Allows resolution and notes

## 📁 Navigation Structure

### Admin Navigation
- Dashboard → System overview and stats
- Inventory Ledger → View/manage all inventory
- Run Calculations → Execute billing calculations
- Finance Dashboard → Financial overview
- Invoices → Invoice management
- Reconciliation → Compare calculated vs actual
- Reports → Generate custom reports
- SKU Master → Manage product definitions
- Cost Rates → Configure pricing
- Warehouses → Manage locations
- Users → User administration
- Settings → System configuration

### Staff Navigation
- Dashboard → Operational overview
- Inventory Ledger → View/manage inventory
- Invoices → Process invoices
- Reconciliation → Review variances
- Reports → Generate reports
- Settings → Personal preferences

## 🔍 Special Features

### Point-in-Time Inventory
- View inventory state at any historical date
- Useful for audits and reconciliation
- Calculates running balances through transactions

### Unified Inventory Page
- Two tabs: Current Balances and Transaction Ledger
- Receive/Ship buttons integrated into page
- Advanced filtering and search
- Export capabilities

### Monday Stock-Takes
- Industry standard for 3PL billing
- Automated weekly snapshots
- No manual counting required
- Maintains audit trail

## ⚙️ System Configuration

### Environment Variables
```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

### Key Business Rules
1. No negative inventory allowed
2. Transactions cannot be edited/deleted (only adjustments)
3. Monday 23:59:59 snapshots for billing
4. Billing period: 16th to 15th
5. All dates in Central Time (CT)
6. Currency in GBP (£)

## 🚨 Important Notes

### Data Integrity
- Never modify inventory_balances directly
- All changes through transactions only
- Preserve zero-balance records
- Maintain complete audit trail

### Performance Considerations
- Balance calculations are real-time
- Large transaction sets may need pagination
- Storage ledger calculation is resource-intensive
- Consider background jobs for large calculations

### Migration from Excel
- Import script handles historical data
- Preserves all transaction history
- Maintains exact Excel calculations
- Zero data loss guaranteed

## 📈 Future Enhancements

### Planned Features
- Automated email notifications
- API for external integrations  
- Mobile app for warehouse staff
- Advanced analytics dashboard
- Predictive inventory planning

### Technical Debt
- Add comprehensive error logging
- Implement job queue for calculations
- Add data archival strategy
- Enhance test coverage

## 🆘 Troubleshooting

### Common Issues

1. **Login Problems**
   - Check user is active
   - Verify correct role assigned
   - Clear browser cookies

2. **Missing Data**
   - Run inventory balance calculation
   - Check transaction dates
   - Verify warehouse assignment

3. **Calculation Errors**
   - Check cost rates are configured
   - Verify SKU warehouse configs
   - Look for date range issues

### Support Contacts
- Technical Issues: Create GitHub issue
- Business Logic: Refer to Excel documentation
- Emergency: Contact system administrator