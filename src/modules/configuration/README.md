# Configuration Module

This module manages system configuration including warehouses, products, rates, and templates.

## Features

- Warehouse management
- Product/SKU configuration
- Cost rate management
- Batch attribute templates
- Invoice template configuration
- Location/warehouse mapping

## Directory Structure

### api/
Configuration API endpoints
- CRUD operations for all entities
- Validation endpoints
- Bulk operations

### components/
Configuration UI components
- Configuration forms
- Listing tables
- Bulk editors
- Template builders

### services/
Configuration business logic
- Validation services
- Template processing
- Rate calculation logic

### types/
Configuration type definitions
- Warehouse types
- Product types
- Rate types
- Template types

## Key Entities

### Warehouses
- Basic information (name, code, address)
- Contact details
- Operational settings
- Cost configurations

### Products/SKUs
- SKU codes and descriptions
- Product categories
- Handling requirements
- Batch attribute requirements

### Cost Rates
- Rate types (storage, handling, etc.)
- Time-based validity
- Warehouse-specific rates
- Currency and units

### Templates
- Invoice templates
- Report templates
- Import templates
- Email templates

## Business Rules

- SKU codes must be unique
- Warehouse codes cannot change
- Rates cannot overlap in time periods
- Templates must include required fields
- Configurations are versioned

## Best Practices

- Always validate before saving
- Check for dependencies before deletion
- Maintain audit trail for changes
- Use bulk operations for efficiency
- Test templates before activation