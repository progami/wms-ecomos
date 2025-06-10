# WMS - Warehouse Management System

Modern warehouse management system for 3PL operations with inventory tracking, billing, and multi-warehouse support.

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Next.js API Routes, Prisma ORM, PostgreSQL
- **Auth**: NextAuth.js
- **Integrations**: Amazon SP API, Excel/CSV processing

## Quick Start

1. **Clone & Install**
```bash
git clone git@github.com:progami/wms_ecom.git
cd wms_ecom
npm install
```

2. **Configure Environment**
```bash
cp .env.local.example .env.local
# Update DATABASE_URL and generate NEXTAUTH_SECRET
```

3. **Setup Database**
```bash
npm run db:migrate
npm run db:seed
```

4. **Run Development Server**
```bash
npm run dev
# Opens at http://localhost:3002
```

## Default Credentials

- **Admin**: `admin` / `SecureWarehouse2024!`
- **Staff**: `hashar` or `umair` / `StaffAccess2024!`

## Key Features

- Multi-warehouse inventory management
- Real-time stock tracking with batch/pallet support
- Automated billing and invoicing
- Amazon FBA integration
- Role-based access control
- Immutable audit trail
- Excel import/export

## Project Structure

```
warehouse_management/
├── src/                    # Source code
│   ├── app/               # Next.js app router pages and API routes
│   ├── components/        # Reusable React components
│   ├── lib/              # Utilities and shared logic
│   ├── modules/          # Feature modules (DDD approach)
│   └── types/            # TypeScript type definitions
├── prisma/                # Database schema and migrations
├── tests/                 # Test files (unit, integration, e2e)
├── scripts/               # Utility scripts for maintenance
├── docs/                  # Project documentation
├── data/                  # Sample data and Excel templates
└── public/                # Static assets
```

## Documentation

Each directory contains its own README.md explaining:
- Purpose and contents
- File descriptions
- Usage guidelines
- Best practices

See the [docs directory](./docs/README.md) for comprehensive documentation.

## Scripts

```bash
npm run dev        # Development server
npm run build      # Production build
npm run test       # Run tests
npm run db:studio  # Prisma Studio
```

## License

Proprietary software. All rights reserved.