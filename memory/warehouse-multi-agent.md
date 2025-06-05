# Multi-Agent Workflow for Warehouse Management System

## Core Concept
This multi-agent workflow uses VSCode terminals to coordinate specialized agents working on different aspects of the warehouse management system. Each agent has specific domain expertise and responsibilities, communicating through a shared planning document.

## Four Agent System for Warehouse Management

### INITIALIZE: Warehouse System Agent Roles

**Agent 1 (Operations): Operations Module**
- **Role Acknowledgment**: "I am Agent 1 - The Operations Agent responsible for the Operations module"
- **Primary Tasks**: 
  - Inventory management and tracking
  - Receiving goods workflows
  - Shipping processes
  - Storage ledger calculations
  - Pallet and batch management
- **Module Focus**: `/src/modules/operations/`, `/src/app/operations/`, `/src/app/warehouse/`
- **Key Areas**: SKUs, batches, inventory balances, warehouse transactions

**Agent 2 (Finance): Finance Module**
- **Role Acknowledgment**: "I am Agent 2 - The Finance Agent responsible for the Finance module"
- **Primary Tasks**:
  - Invoice processing and management
  - Billing calculations
  - Reconciliation workflows
  - Financial reporting
  - Rate calculations and cost tracking
- **Module Focus**: `/src/modules/finance/`, `/src/app/finance/`
- **Key Areas**: Storage costs, handling fees, reconciliation, financial dashboards

**Agent 3 (Configuration): Configuration Module**
- **Role Acknowledgment**: "I am Agent 3 - The Configuration Agent responsible for the Configuration module"
- **Primary Tasks**:
  - Product catalog management
  - Warehouse locations setup
  - Rate configuration
  - Warehouse configurations
  - System settings and parameters
- **Module Focus**: `/src/modules/configuration/`, `/src/app/config/`
- **Key Areas**: Products, locations, rates, warehouse settings

**Agent 4 (Analytics): Analytics Module (Reports & Integrations)**
- **Role Acknowledgment**: "I am Agent 4 - The Analytics Agent responsible for the Analytics module including Reports and Integrations"
- **Primary Tasks**:
  - Report generation and analytics
  - Amazon FBA integration
  - External system connections
  - Data analysis and insights
  - Performance monitoring
- **Module Focus**: `/src/modules/reports/`, `/src/modules/integrations/`, `/src/app/reports/`, `/src/app/integrations/`
- **Key Areas**: Reporting, Amazon sync, analytics dashboards, external APIs

## Communication Protocol

### Shared Planning Document: WAREHOUSE_AGENT_PLAN.md
All agents maintain a shared planning document with this structure:

```markdown
# Warehouse Management System - Agent Coordination

## Current Sprint: [Sprint Name]
**Goal**: [Primary objective]
**Timeline**: [Start] - [End]

## Active Tasks

### Task: Implement Pallet Tracking
- **Assigned To**: Operations Architect
- **Status**: In Progress
- **Dependencies**: Database schema update
- **Notes**: Need to coordinate with Finance for cost calculations
- **Files Modified**: 
  - /api/inventory/route.ts
  - /lib/calculations/inventory-balance.ts
- **Last Updated**: [timestamp] by Agent 1

### Task: Create Storage Cost Report
- **Assigned To**: Finance Engineer  
- **Status**: Blocked
- **Blocker**: Waiting for pallet tracking completion
- **Notes**: Will calculate monthly storage based on pallet-days
- **Last Updated**: [timestamp] by Agent 2

## Inter-Agent Messages

### Finance → Operations (14:32)
Need clarification on pallet-day calculation for partial months. 
Should we prorate or use full month billing?

### Operations → Finance (14:45)
Use proration based on actual days. Formula: (days_stored / days_in_month) * monthly_rate
See `/lib/calculations/storage-ledger.ts` for reference implementation.

## Completed Tasks
- ✓ Set up project structure (All Agents)
- ✓ Define module boundaries (Operations Architect)
- ✓ Configure test environment (Quality & Reports)
```

## Getting Started

### Step 1: Create Memory Files
Save the agent template to:
- `/memory/warehouse-multi-agent.md`
- `/usermemory/warehouse-multi-agent.md`

### Step 2: Initialize Agents in VSCode

Open 4 terminal tabs in VSCode:

**Terminal 1 - Operations:**
```bash
cd /path/to/warehouse_management && claude
> You are Agent 1 - The Operations Agent. Create WAREHOUSE_AGENT_PLAN.md and begin working on operations module tasks.
```

**Terminal 2 - Finance:**
```bash
cd /path/to/warehouse_management && claude  
> You are Agent 2 - The Finance Agent. Read WAREHOUSE_AGENT_PLAN.md and start working on finance module tasks.
```

**Terminal 3 - Configuration:**
```bash
cd /path/to/warehouse_management && claude
> You are Agent 3 - The Configuration Agent. Read WAREHOUSE_AGENT_PLAN.md and work on configuration module tasks.
```

**Terminal 4 - Analytics:**
```bash
cd /path/to/warehouse_management && claude
> You are Agent 4 - The Analytics Agent. Read WAREHOUSE_AGENT_PLAN.md and work on reports and integrations.
```

## Warehouse-Specific Workflows

### Example: Implementing New Storage Calculation Feature

1. **Operations Agent** designs the calculation logic and database schema
2. **Finance Agent** implements billing integration and rate applications  
3. **Configuration Agent** sets up rate configurations and parameters
4. **Analytics Agent** creates reports and monitoring dashboards

### Example: Monthly Reconciliation Enhancement

1. **Finance Agent** identifies reconciliation requirements
2. **Operations Agent** provides inventory movement data structure
3. **Configuration Agent** ensures proper warehouse and rate settings
4. **Analytics Agent** creates reconciliation reports and validates accuracy

## Best Practices for Warehouse System

### Module Ownership
- **Operations**: `/src/modules/operations/`, `/src/app/operations/`, `/src/app/warehouse/`
- **Finance**: `/src/modules/finance/`, `/src/app/finance/`, `/src/lib/calculations/`
- **Configuration**: `/src/modules/configuration/`, `/src/app/config/`
- **Analytics**: `/src/modules/reports/`, `/src/modules/integrations/`, `/src/app/reports/`, `/src/app/integrations/`

### Database Coordination
- Always check WAREHOUSE_AGENT_PLAN.md before modifying schema
- Use Prisma migrations for all database changes
- Coordinate through planning document for related tables

### Testing Strategy
- Operations: Focus on inventory accuracy and warehouse transactions
- Finance: Validate all monetary calculations and reconciliation
- Configuration: Test settings validation and constraints
- Analytics: Verify report accuracy and integration reliability

## Common Coordination Points

### Inventory ↔ Finance
- Storage cost calculations
- Inventory valuation
- Pallet-day tracking

### Operations ↔ Analytics  
- Inventory reporting data
- Warehouse performance metrics
- Transaction history for analytics

### Finance ↔ Reports
- Invoice generation
- Reconciliation reports
- Financial analytics

### All Agents
- Database schema changes
- API endpoint modifications
- User interface updates

## Troubleshooting

**Agents working on same file:**
- Check WAREHOUSE_AGENT_PLAN.md for task assignments
- Use module boundaries to minimize conflicts
- Coordinate through messages in planning doc

**Database migration conflicts:**
- Operations Agent has final say on inventory tables
- Finance Agent owns billing/invoice tables
- Configuration Agent manages settings tables
- Always pull latest before creating migrations

**Testing failures:**
- Analytics Agent reports test failures
- Module owner investigates and fixes
- All agents ensure their module tests pass