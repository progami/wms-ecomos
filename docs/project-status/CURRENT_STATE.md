# Warehouse Management System - Current State
*Last Updated: January 6, 2025*

## Recent Changes Merged to Main

### Authentication & User Management
- **Username Login**: Users can now login with either email or username
  - admin@warehouse.com or admin / admin123
  - hashar@warehouse.com or hashar / staff123  
  - umair@warehouse.com or umair / staff123

### Receive Goods Page Updates
- Changed reference field from "PI / CI / PO Number" to separate fields:
  - Commercial Invoice #
  - Packing List #
  - TC # GRS (Transaction Certificate for Goods Receipt Slip)
- Added document upload sections:
  - Commercial Invoice
  - Bill of Lading
  - Packing List
  - Delivery Note
  - Cube Master Stacking Style
  - Transaction Certificate (TC) GRS
  - Custom Declaration Document (CDS)

### Inventory Ledger Updates
- **Default View**: Now defaults to "Inventory Ledger" tab instead of "Current Balances"
- **Date Columns**: 
  - "Transaction Date" renamed to "Creation Date" (when entered in system)
  - "Pickup Date" shows the actual transaction date (receipt/ship date)
  - All 174 existing transactions updated to have pickup date = transaction date

### Technical Setup
- **Git Worktrees**: Each agent has their own directory
  - Operations: `/warehouse_management_ops` on branch `ops/feature`
  - Finance: `/warehouse_management_fin` on branch `fin/feature`
  - Configuration: `/warehouse_management_cfg` on branch `cfg/feature`
  - Analytics: `/warehouse_management_ana` on branch `ana/feature`
- **Environment Files**: Automatically copied to each worktree
- **Dependencies**: Each worktree has its own node_modules

## Database Schema Updates
- User model now includes optional `username` field (unique)
- All inventory transactions have `pickupDate` field populated

## Current Module Boundaries

| Agent | Primary Directories | Key Responsibilities |
|-------|-------------------|---------------------|
| **Operations** | `/src/app/operations/`<br>`/src/app/api/inventory/`<br>`/src/app/api/skus/`<br>`/src/app/api/transactions/` | - Receive/Ship goods<br>- Inventory management<br>- Storage ledger<br>- SKU operations |
| **Finance** | `/src/app/finance/`<br>`/src/app/api/invoices/`<br>`/src/app/api/reconciliation/`<br>`/src/app/api/finance/` | - Invoice management<br>- Payment processing<br>- Reconciliation<br>- Financial reporting |
| **Configuration** | `/src/app/config/`<br>`/src/app/admin/settings/`<br>`/src/app/api/rates/`<br>`/src/app/api/settings/`<br>`/src/app/api/warehouse-configs/` | - Product/SKU setup<br>- Warehouse configuration<br>- Cost rates<br>- User management |
| **Analytics** | `/src/app/reports/`<br>`/src/app/integrations/`<br>`/src/app/api/amazon/`<br>`/src/app/api/reports/`<br>`/src/app/analytics/` | - Report generation<br>- Amazon FBA integration<br>- Analytics dashboards<br>- Data exports |

## Workflow for Agents

1. **Start Work**:
   ```bash
   cd /Users/jarraramjad/Documents/warehouse_management_[agent]
   git pull origin main  # Get latest changes
   ```

2. **Make Changes**:
   - Only modify files in your designated directories
   - Test locally with `npm run dev`
     - Operations: Port 3001 (configured in .env.local)
     - Finance: Port 3002 (configured in .env.local)
     - Configuration: Port 3003 (configured in .env.local)
     - Analytics: Port 3004 (configured in .env.local)

3. **Commit & Push**:
   ```bash
   git add .
   git commit -m "feat(module): description"
   git push origin [your-branch]
   ```

4. **Request Merge**:
   - Notify PR Master when ready
   - Provide summary of changes
   - Note any dependencies on other agents' work

## PR Master Responsibilities

1. **Merge Workflow**:
   ```bash
   # In main directory
   git checkout main
   git pull origin main
   git merge origin/[agent-branch]
   # Resolve conflicts if any
   git push origin main
   ```

2. **Conflict Resolution**:
   - Coordinate between agents
   - Ensure changes don't break other modules
   - Maintain clean commit history

3. **Communication**:
   - Keep agents informed of merge status
   - Coordinate cross-module features
   - Track overall progress

## Important Notes

- **Immutable Ledger**: Inventory transactions cannot be edited/deleted
- **Date Handling**: All dates stored in UTC, displayed in CST
- **Authentication**: Session-based with JWT tokens
- **File Uploads**: Max 5MB per file, stored as base64 in database

## Environment Setup
- Each worktree has its own `.env.local` with unique PORT configuration
- All worktrees share the same database connection
- npm dependencies installed separately in each worktree

## Next Steps
Agents can now work on their assigned features. Key areas for improvement:
- Enhanced reporting capabilities
- Advanced inventory analytics
- Automated reconciliation features
- Mobile responsiveness
- Performance optimization