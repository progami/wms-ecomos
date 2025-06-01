# Warehouse Management System

A simple, production-ready system for buyers managing inventory across multiple 3PL warehouses.

## Quick Start

```bash
# Install dependencies
npm install

# Set up database
cp .env.example .env
# Edit .env with your database URL

# Run database setup
npm run db:push
npm run db:seed

# Start the app
npm run dev
```

Visit http://localhost:3000

## Login Credentials

- **Admin**: admin@warehouse.com / admin123
- **Finance**: finance@warehouse.com / admin123
- **Staff**: staff@warehouse.com / admin123

## What Each Page Does

- **Dashboard** - Overview of operations and quick actions
- **Inventory** - Track stock levels across all warehouses
- **Invoices** - Upload and process invoices from warehouses
- **Reconciliation** - Compare invoiced amounts vs calculated costs
- **Reports** - Generate Excel reports for analysis
- **Settings** - Configure warehouses, SKUs, and rates

## Tech Stack

- Next.js 14 + TypeScript
- PostgreSQL + Prisma
- NextAuth for authentication
- Tailwind CSS for styling

## Deployment

```bash
npm run build
npm start
```

Set production environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Random secret for JWT
- `NEXTAUTH_URL` - Your domain URL