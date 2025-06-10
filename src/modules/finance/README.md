# Finance Module

This module manages all financial aspects of the warehouse management system.

## Features

- Invoice creation and management
- Cost tracking and ledger maintenance
- Invoice reconciliation
- Financial reporting
- Storage cost calculations
- Payment tracking

## Directory Structure

### api/
Financial API endpoints
- Invoice CRUD operations
- Cost ledger endpoints
- Reconciliation processes
- Report generation

### components/
Finance UI components
- Invoice forms
- Cost ledger tables
- Reconciliation interface
- Financial dashboards

### services/
Financial business logic
- Invoice calculation service
- Cost aggregation service
- Reconciliation service
- Report generation service

### types/
Financial type definitions
- Invoice types
- Payment types
- Ledger entry types
- Report types

## Key Features

### Invoice Management
- Create invoices from transactions
- Track payment status
- Generate PDF invoices
- Email invoice delivery

### Cost Tracking
- Storage costs calculation
- Handling costs
- Custom rate application
- Monthly cost aggregation

### Reconciliation
- Match invoices with payments
- Identify discrepancies
- Bulk reconciliation tools
- Audit trail

### Financial Reports
- Monthly cost summaries
- Revenue reports
- Outstanding payment reports
- Cost analysis by SKU/warehouse

## Business Rules

- Invoices are immutable once approved
- Storage costs calculated weekly
- Reconciliation requires approval
- All financial changes are audited