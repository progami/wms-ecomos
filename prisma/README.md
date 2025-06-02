# Database Schema and Migrations

This directory contains the Prisma schema and database migrations for the Warehouse Management System.

## Files

- **schema.prisma** - Main database schema definition
- **seed.ts** - Database seeding script with sample data
- **migrations/** - Database migration history

## Key Models

- **User** - System users with role-based access
- **Warehouse** - 3PL warehouse locations
- **SKU** - Product SKUs with dimensions
- **Transaction** - Inventory movements (receiving/shipping)
- **Invoice** - Warehouse invoices
- **StorageRate** - Storage pricing by warehouse

## Commands

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes to database
npm run db:push

# Run migrations
npm run db:migrate

# Seed database with sample data
npm run db:seed

# Open Prisma Studio
npm run db:studio
```