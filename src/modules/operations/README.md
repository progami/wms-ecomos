# Operations Module

This module handles warehouse operations including inventory management, goods receiving, and shipping.

## Features

- Receive goods with detailed tracking
- Ship goods with carrier integration
- Inventory ledger maintenance
- Transaction management
- Pallet variance tracking
- Shipment planning
- Batch attribute import

## Directory Structure

### api/
Operations API endpoints
- Transaction creation
- Inventory queries
- Shipment processing
- Pallet variance reporting

### components/
Operations UI components
- Receive goods form
- Ship goods form
- Inventory tables
- Transaction details
- Shipment planner

### services/
Operations business logic
- Inventory calculation service
- Transaction service
- Shipment service
- Variance tracking service

### types/
Operations type definitions
- Transaction types
- Inventory types
- Shipment types
- Variance types

## Key Workflows

### Receiving Goods
1. Select warehouse and SKU
2. Enter shipment details
3. Add batch attributes
4. Specify transportation mode
5. Create receive transaction

### Shipping Goods
1. Select items from inventory
2. Enter destination details
3. Choose carrier and service
4. Add tracking information
5. Create ship transaction

### Inventory Management
- Real-time balance tracking
- FIFO/LIFO/FEFO support
- Multi-warehouse visibility
- Transaction history
- Batch tracking

### Pallet Variance
- Track expected vs actual pallets
- Calculate storage impact
- Generate variance reports
- Adjustment workflows

## Business Rules

- All transactions are immutable
- Inventory cannot go negative
- Batch attributes required for pharma SKUs
- Pickup dates must be reasonable
- Transportation mode affects costing