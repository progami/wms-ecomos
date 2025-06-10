# Scripts Directory

This directory contains utility scripts for database management, data import/export, and system setup.

## Database Management

### backup-database.sh
- **Purpose**: Backs up the PostgreSQL database
- **Usage**: `./backup-database.sh`
- **When to use**: Before major updates or on a regular schedule for data safety

## Development Tools

### dev-with-port.js
- **Purpose**: Starts the Next.js development server with dynamic port allocation
- **Usage**: Automatically used by `npm run dev`
- **Details**: Tries port 3000 first, then increments if occupied

## Data Import/Export

### import-excel-data.ts
- **Purpose**: Imports master data from Excel files (SKUs, rates, warehouse configs)
- **Usage**: `npx tsx scripts/import-excel-data.ts`
- **Input**: Excel file path as argument
- **When to use**: Initial setup or bulk data updates

### import-inventory-ledger.ts
- **Purpose**: Imports inventory transactions from Excel
- **Usage**: `npx tsx scripts/import-inventory-ledger.ts <excel-file-path>`
- **When to use**: Migrating historical inventory data

### populate-storage-ledger.ts
- **Purpose**: Populates storage ledger entries based on inventory transactions
- **Usage**: `npx tsx scripts/populate-storage-ledger.ts`
- **When to use**: After importing inventory data to generate storage costs

### update-storage-ledger-weekly.ts
- **Purpose**: Updates storage ledger entries on a weekly basis
- **Usage**: `npx tsx scripts/update-storage-ledger-weekly.ts`
- **When to use**: Run weekly via cron job or manually

## Setup Scripts

### create-sample-skus.ts
- **Purpose**: Creates sample SKU data for testing
- **Usage**: `npx tsx scripts/create-sample-skus.ts`
- **When to use**: Setting up test environments

### create-staff-users.ts
- **Purpose**: Creates staff user accounts
- **Usage**: `npx tsx scripts/create-staff-users.ts`
- **When to use**: Initial setup or adding new staff members

### create-users.ts
- **Purpose**: Creates system user accounts
- **Usage**: `npx tsx scripts/create-users.ts`
- **When to use**: Initial system setup

### create-amazon-sample-data.ts
- **Purpose**: Creates sample Amazon FBA data for testing
- **Usage**: `npx tsx scripts/create-amazon-sample-data.ts`
- **When to use**: Testing Amazon integration features

### setup-amazon-fba-warehouse.ts
- **Purpose**: Sets up Amazon FBA warehouse configuration
- **Usage**: `npx tsx scripts/setup-amazon-fba-warehouse.ts`
- **When to use**: Configuring Amazon FBA integration

### setup-auto-backup.sh
- **Purpose**: Sets up automated database backups via cron
- **Usage**: `./setup-auto-backup.sh`
- **When to use**: Production server setup

### setup-storage-ledger-cron.sh
- **Purpose**: Sets up cron job for weekly storage ledger updates
- **Usage**: `./setup-storage-ledger-cron.sh`
- **When to use**: Production server setup

## Documentation

### import-inventory-ledger-summary.md
- **Purpose**: Documents the inventory ledger import process
- **Details**: Explains data mapping and import results

## Notes

- Always backup the database before running data modification scripts
- Scripts requiring database access will use the DATABASE_URL from .env
- TypeScript scripts are run using `npx tsx`
- Shell scripts may need execute permissions: `chmod +x script.sh`