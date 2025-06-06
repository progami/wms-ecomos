# Agent Instructions - Warehouse Management System

This file contains instructions for ALL agents working on the warehouse management system. Each agent should read their specific section based on their role.

## Quick Reference
- **Operations Agent**: Port 3001, worktree: warehouse_management_ops
- **Finance Agent**: Port 3002, worktree: warehouse_management_fin  
- **Configuration Agent**: Port 3003, worktree: warehouse_management_cfg
- **Analytics Agent**: Port 3004, worktree: warehouse_management_ana

---

## OPERATIONS AGENT (Port 3001)

### Your Responsibilities
- Inventory management and tracking
- Receiving and shipping operations  
- Storage ledger and transaction history
- SKU batch management
- Warehouse operations workflows

### Key Directories
- `/src/app/operations/` - Your main working directory
- `/src/components/operations/` - Operations-specific components
- `/src/lib/calculations/` - Inventory and storage calculations (read-only)

### Current Tasks
1. **Receive Goods Page**
   - Ensure CI # and Packing List # fields are separate
   - Verify TC # GRS field for Transaction Certificate
   - Check attachment categories work correctly

2. **Inventory Ledger**
   - Verify "Creation Date" displays correctly
   - Ensure Pickup Date shows the actual transaction date
   - Confirm default tab is "Inventory Ledger"

3. **Storage Ledger**
   - Check calculations are accurate
   - Verify immutable ledger functionality
   - Test export functionality

### Branch Naming
- Use prefix: `ops/feature-name`

---

## FINANCE AGENT (Port 3002)

### Your Responsibilities
- Invoice processing and reconciliation
- Cost calculations and billing
- Financial reporting and analytics
- Payment tracking
- Financial dashboard metrics

### Key Directories
- `/src/app/finance/` - Your main working directory
- `/src/components/finance/` - Finance-specific components
- `/src/lib/calculations/cost-aggregation.ts` - Cost calculation logic

### Current Tasks
1. **Invoice Reconciliation**
   - Review reconciliation workflow accuracy
   - Ensure dispute/accept functionality works
   - Verify calculated costs match expected values

2. **Financial Dashboard**
   - Check metrics accuracy
   - Verify cost aggregation service integration
   - Ensure proper data visualization

3. **Billing Reports**
   - Test report generation
   - Verify export functionality
   - Check calculated costs ledger accuracy

### Branch Naming
- Use prefix: `fin/feature-name`

---

## CONFIGURATION AGENT (Port 3003)

### Your Responsibilities
- System settings and preferences
- User and role management
- Warehouse configurations
- Rate management
- Product and location setup

### Key Directories
- `/src/app/config/` - Configuration pages
- `/src/app/admin/settings/` - Admin settings pages
- `/src/app/admin/users/` - User management
- `/src/components/config/` - Configuration components

### Current Tasks
1. **User Management**
   - Verify username login functionality
   - Ensure role-based access control works
   - Check user creation/edit workflows

2. **Rate Management**
   - Review rate overlap detection
   - Verify effective date handling
   - Test rate CRUD operations

3. **Warehouse Configuration**
   - Check warehouse setup workflows
   - Verify configuration persistence
   - Test Amazon FBA warehouse settings

### Branch Naming
- Use prefix: `cfg/feature-name`

---

## ANALYTICS AGENT (Port 3004)

### Your Responsibilities
- Data visualization and charts
- Performance metrics
- Business intelligence reports
- Trend analysis
- Dashboard improvements

### Key Directories
- `/src/app/analytics/` - Analytics pages
- `/src/app/dashboard/` - Main dashboard
- `/src/app/admin/dashboard/` - Admin dashboard
- `/src/components/reports/` - Report generation components

### Current Tasks
1. **Dashboard Visualizations**
   - Improve chart readability and interactivity
   - Add trend indicators
   - Ensure real-time data updates

2. **Report Generation**
   - Enhance report templates
   - Add more export formats
   - Improve report scheduling

3. **Performance Metrics**
   - Add KPI tracking
   - Implement performance benchmarks
   - Create alerts for anomalies

### Branch Naming
- Use prefix: `ana/feature-name`

---

## UNIVERSAL RULES FOR ALL AGENTS

### Module Boundaries
Each agent must stay within their assigned modules. Do NOT modify:
- Other agents' directories
- Core authentication (`/src/lib/auth.ts`)
- Database schema without PR Master approval
- Other agents' API endpoints

### Development Guidelines
1. Create feature branches: `git checkout -b [prefix]/feature-name`
2. Test all changes locally before committing
3. Document API changes that affect other modules
4. Run module-specific tests before pushing
5. Update this file's task list when completing items

### Testing Commands
```bash
# Operations Agent
npm test -- --testPathPattern="operations"

# Finance Agent  
npm test -- --testPathPattern="finance|billing|invoice"

# Configuration Agent
npm test -- --testPathPattern="config|settings|admin"

# Analytics Agent
npm test -- --testPathPattern="analytics|dashboard|reports"
```

### Communication Protocol
1. Report blocking issues to PR Master immediately
2. Document API contracts needed from other modules
3. Request PR Master coordination for:
   - Database schema changes
   - Cross-module features
   - Authentication changes
   - Shared component modifications

### Integration Points
When you need data from another module:
- Use existing API endpoints
- Request new endpoints through PR Master
- Never directly access another module's data
- Document the dependency

---

## Task Tracking
Mark completed tasks with ✅ and add completion date:

### Operations Tasks Completed
- [x] Verify CI # and Packing List # fields are separate in Receive Goods Page - ✅ 2025-01-06
- [x] Verify TC # GRS field for Transaction Certificate in Receive Goods Page - ✅ 2025-01-06
- [x] Check attachment categories work correctly in Receive Goods Page - ✅ 2025-01-06
- [x] Verify 'Creation Date' displays correctly in Inventory Ledger - ✅ 2025-01-06
- [x] Ensure Pickup Date shows the actual transaction date in Inventory Ledger - ✅ 2025-01-06
- [x] Confirm default tab is 'Inventory Ledger' - ✅ 2025-01-06
- [x] Check Storage Ledger calculations are accurate - ✅ 2025-01-06
- [x] Verify immutable ledger functionality - ✅ 2025-01-06
- [x] Test export functionality - ✅ 2025-01-06

### Finance Tasks Completed
- [ ] Task 1
- [ ] Task 2

### Configuration Tasks Completed
- [ ] Task 1
- [ ] Task 2

### Analytics Tasks Completed
- [ ] Task 1
- [ ] Task 2