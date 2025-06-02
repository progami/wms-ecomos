# Warehouse Management System

A comprehensive warehouse management system with 3PL billing reconciliation, designed to replace complex Excel workflows with a modern web application.

## Features

- **Inventory Management**: Track inventory movements with immutable transaction ledger
- **3PL Billing**: Automated storage calculations and invoice reconciliation
- **Amazon Integration**: View Amazon FBA inventory alongside warehouse stock
- **Multi-Warehouse**: Support for multiple warehouse locations
- **Role-Based Access**: Admin and staff user roles
- **Real-Time Reporting**: Financial dashboards and inventory reports

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 12+
- Git

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd warehouse_management
```

2. Install dependencies:
```bash
npm install
```

3. Set up the database:

**Option 1: Using PostgreSQL.app (Mac)**
```bash
# Create database
createdb warehouse_management

# Update .env.local
DATABASE_URL="postgresql://yourusername@localhost:5432/warehouse_management"
```

**Option 2: Using standard PostgreSQL**
```bash
# Create database
sudo -u postgres createdb warehouse_management

# Update .env.local
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/warehouse_management"
```

4. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your database credentials and generate NEXTAUTH_SECRET
openssl rand -base64 32  # Use this output for NEXTAUTH_SECRET
```

5. Run database migrations:
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

6. Start the development server:
```bash
npm run dev
```

7. Open http://localhost:3000 and login with:
- Email: `admin@warehouse.com`
- Password: `admin123`

## Project Structure

```
warehouse_management/
├── src/
│   ├── app/              # Next.js 14 app directory
│   ├── components/       # React components
│   ├── lib/             # Utilities and libraries
│   └── types/           # TypeScript types
├── prisma/              # Database schema and migrations
├── docs/                # Documentation
│   ├── architecture/    # System architecture
│   ├── excel-templates/ # Excel system documentation
│   └── setup/          # Setup guides
├── scripts/            # Utility scripts
└── data/              # Excel data files
```

## Key Concepts

### Transaction-Based Ledger
All inventory movements are recorded as immutable transactions:
- RECEIVE: Goods coming in
- SHIP: Goods going out
- ADJUST_IN/OUT: Inventory adjustments

### Billing Periods
- Run from 16th to 15th of the following month
- Storage calculated every Monday at 23:59:59
- Automated reconciliation with 3PL invoices

### User Roles
- **Admin**: Full system access, configuration, and reporting
- **Staff**: Operational access for inventory and basic reports

## Core Functionality

### Inventory Management
- Real-time inventory tracking
- Batch/lot tracking
- Historical inventory views
- Multi-warehouse support

### Financial Management
- Automated storage calculations
- Cost rate management by category
- Invoice reconciliation
- Financial dashboards

### Amazon Integration
- Compare warehouse and Amazon FBA inventory side-by-side
- View inventory differences by SKU
- Read-only inventory comparison dashboard

## Navigation Structure

### Admin Navigation
- **Dashboard**: Overview and metrics
- **Operations**: Inventory Ledger, Run Calculations
- **Finance**: Finance Dashboard, Invoices, Reconciliation
- **Reports**: Comprehensive reporting
- **Master Data**: SKU Master, Warehouse Configs, Cost Rates
- **System**: Users, Amazon Integration, Settings

### Staff Navigation
- **Dashboard**: Warehouse-specific view
- **Operations**: Inventory Ledger
- **Finance**: Invoices, Reconciliation
- **Reports & Settings**: Basic reports and preferences

## Scripts

```bash
# Import data from Excel
npx tsx scripts/import-warehouse-excel.ts

# Add sample data
npx tsx scripts/add-sample-rates.ts
npx tsx scripts/add-sample-finance-data.ts

# Create additional users
npx tsx scripts/create-staff-users.ts

# Ensure Amazon warehouse exists
npx tsx scripts/ensure-amazon-warehouse.ts
```

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/warehouse_management"

# Authentication
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# Amazon Integration (optional)
AMAZON_SP_APP_ID="your-app-id"
AMAZON_REFRESH_TOKEN="your-refresh-token"
AMAZON_MARKETPLACE_ID="A1F83G8C2ARO7P"  # UK
AMAZON_REGION="eu-west-1"
```

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Run type checking
npm run type-check

# Lint code
npm run lint
```

## Deployment

1. Set production environment variables
2. Build the application: `npm run build`
3. Run database migrations: `npx prisma migrate deploy`
4. Start the server: `npm start`

## License

MIT