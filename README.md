# Warehouse Management System

A comprehensive warehouse management system built with Next.js, TypeScript, and PostgreSQL for managing inventory, billing, and operations across multiple warehouses.

## 🚀 Features

### Core Functionality
- **Multi-Warehouse Support**: Manage inventory across multiple warehouses (FMC, VGlobal, 4AS)
- **Inventory Management**: Track inventory movements, balances, and transactions in real-time
- **Amazon FBA Integration**: Compare and sync inventory between warehouses and Amazon FBA (displays in units)
- **Financial Management**: Invoice creation, reconciliation, and cost calculations
- **Reporting System**: Generate comprehensive reports for inventory, billing, and operations
- **Role-Based Access**: Two-tier access control (Admin and Staff roles)

### Key Modules

#### 📦 Inventory Management
- Real-time inventory tracking by SKU, warehouse, and batch
- Receive and ship inventory with carton and pallet tracking
  - SKU selection via dropdown from master data
  - Automatic units calculation (cartons × units per carton)
  - Auto-incremented batch numbers based on SKU history
  - Ship name and container number tracking
  - Document attachments with explicit categories:
    - Packing List
    - Commercial Invoice
    - Delivery Note
    - Cube Master Stacking Style for Storage Pallets
    - Additional documents
- Ship Goods features:
  - Source warehouse selection
  - Amazon carrier options (Amazon Partnered Carrier UPS, Amazon Freight)
  - FBA Tracking ID
  - Automatic total cartons calculation
- Point-in-time inventory views with running balances
- Low stock alerts and inventory balances
- Immutable inventory ledger with audit trail
- Pallet variance tracking for data accuracy
- Sortable transaction history with date filtering
- Pickup date tracking with reconciliation status
- Chronological transaction enforcement (no backdating)

#### 💰 Financial Management
- Create and manage invoices
- Automatic invoice reconciliation
- Cost rate management by warehouse and category
- Storage cost calculations (weekly, billed monthly)
- Financial dashboard with KPIs
- Billing periods: 16th to 15th of following month

#### 📊 Reporting & Analytics
- Inventory movement reports
- Storage utilization reports
- Financial reports with date ranges
- Export functionality (CSV/Excel)
- Real-time dashboards

#### 🔧 Administration
- User management (Admin/Staff roles)
- SKU master data management
- Warehouse configuration
- Cost rate configuration with overlap detection
- System settings and preferences

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **UI Components**: Custom components with Tailwind CSS
- **Data Visualization**: Recharts

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone [repository-url]
cd warehouse_management
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env.local` file in the root directory:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/warehouse_management"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-generate-with-openssl"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Amazon Integration (optional)
AMAZON_SP_APP_ID="your-app-id"
AMAZON_REFRESH_TOKEN="your-refresh-token"
AMAZON_MARKETPLACE_ID="A1F83G8C2ARO7P"  # UK
AMAZON_REGION="eu-west-1"
```

Generate NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

### 4. Set up the database
```bash
# Run Prisma migrations
npx prisma db push

# Seed the database with initial data
npx tsx prisma/seed.ts

# Note: Immutable ledger constraints are applied automatically via database migrations
```

**Note**: The inventory ledger is designed to be immutable for audit compliance. Once applied, transactions cannot be edited or deleted - only adjustment entries can be made.

### 5. Start the development server
```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## 📦 Project Structure

```
warehouse_management/
├── src/
│   ├── app/                 # Next.js app directory
│   │   ├── admin/          # Admin pages
│   │   ├── api/            # API routes
│   │   ├── auth/           # Authentication pages
│   │   ├── dashboard/      # Main dashboard
│   │   ├── finance/        # Finance module
│   │   └── warehouse/      # Warehouse operations
│   ├── components/         # Reusable components
│   ├── lib/               # Utility functions and configurations
│   └── types/             # TypeScript type definitions
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts           # Database seeding script
├── scripts/              # User management scripts
├── tests/               # Test files
└── docs/                # Documentation
```

## 👥 User Roles

### Admin
- Full system access
- User management
- System configuration
- All operational features
- Financial management
- Cost rate configuration

### Staff
- Warehouse operations
- Inventory management
- View financial data
- Generate reports
- Limited settings access

## 🔐 Default Login Credentials

After seeding the database, you can login with:

**Admin Account:**
- Email: admin@admin.com
- Password: admin

**Staff Accounts:**
- Email: hashar@warehouse.com (Finance Manager)
- Password: staff123

- Email: umair@warehouse.com (Operations Manager)
- Password: staff123

## 📊 Key Features Walkthrough

### Dashboard
- Role-specific dashboards (Admin/Staff)
- Real-time KPIs and metrics
- Quick access to common tasks
- Recent activity tracking

### Inventory Operations
- **Receive Inventory**: Record incoming shipments with batch and pallet tracking
- **Ship Inventory**: Process outbound shipments with pallet configuration
- **Inventory Ledger**: View all transactions with sorting, filtering, and pallet details
- **Current Balances**: Real-time inventory by SKU, warehouse, and batch
- **Point-in-Time Views**: Historical inventory snapshots with running balances
- **Storage Ledger**: 
  - Weekly storage cost calculations based on Monday snapshots
  - Monthly aggregation by billing periods (16th-15th)
  - Cost share breakdown per SKU
  - Export to CSV functionality

### Financial Operations
- **Invoice Management**: Create, edit, and track invoices
- **Reconciliation**: Match system calculations with 3PL invoices
- **Cost Rates**: Manage storage, handling, and shipping rates
- **Financial Dashboard**: Revenue tracking and analytics

### Amazon Integration
- Compare warehouse vs Amazon FBA inventory
- All quantities displayed in units (not cartons)
- Identify discrepancies for reconciliation
- Read-only comparison view

### Master Data Management
- **SKUs**: Product master with dimensions and packaging info
- **Warehouses**: Multiple warehouse locations
- **Cost Rates**: Time-based rate management with overlap prevention
- **Warehouse Configurations**: SKU-specific pallet configurations

## 📚 Important Notes

### Immutable Inventory Ledger
The inventory ledger follows accounting best practices:
- **No Edits**: Once created, transactions cannot be modified
- **No Deletes**: All records are permanent for audit trail
- **Corrections**: Use ADJUST_IN/ADJUST_OUT transactions to fix errors
- **Database Triggers**: PostgreSQL triggers enforce immutability
- **Chronological Order**: Transactions must be entered in date order (no backdating)
- **Pickup Date Tracking**: Separate tracking for transaction and pickup dates with reconciliation status

### Data Import
- Initial data can be imported from Excel through the Admin Import page (`/admin/import`)
- Place your Excel file named "Warehouse Management.xlsx" in the data folder
- After import, all data entry should be through the web interface
- The system maintains data integrity and prevents duplicate entries

### Currency
All monetary values are in GBP (£) including:
- Storage rates (per pallet per week)
- Amazon FBA rates (per cubic foot per month)
- Invoice amounts and calculations

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📝 Utility Scripts

```bash
# Create additional users
npx tsx scripts/create-users.ts
npx tsx scripts/create-staff-users.ts

# Update role permissions
node scripts/update-role-checks.js

# Development/Debug scripts (not for production use)
npx tsx scripts/check-dashboard-data.ts
npx tsx scripts/check-system-imports.ts
npx tsx scripts/verify-amazon-exclusion.ts
```

**Note**: Data import from Excel should be done through the Admin Import page at `/admin/import` after logging in as an admin.

## 🚀 Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Type checking
npm run type-check

# Open Prisma Studio
npx prisma studio
```

## 📈 Key Business Logic

### Transaction Types
- **RECEIVE**: Incoming inventory
- **SHIP**: Outgoing inventory
- **ADJUST_IN**: Positive inventory adjustments
- **ADJUST_OUT**: Negative inventory adjustments

### Cost Categories
- **Storage**: Weekly storage per pallet
- **Container**: Container unloading fees
- **Pallet**: Pallet handling charges
- **Carton**: Per carton fees
- **Unit**: Pick and pack charges
- **Shipment**: Freight costs
- **Accessorial**: Additional services

### Billing Periods
- Monthly cycles: 16th to 15th
- Storage calculated weekly (Mondays at 23:59:59)
- Automatic cost calculations
- Invoice reconciliation workflow

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Database Migration
```bash
npx prisma migrate deploy
```

### Environment Variables
Ensure all required environment variables are set in production.

## 🔒 Security Features

- Secure authentication with NextAuth.js
- Role-based access control
- Database transaction integrity
- Input validation and sanitization
- CSRF protection

## 📄 License

This project is proprietary software. All rights reserved.

## 🤝 Contributing

Please contact the development team for contribution guidelines.

## 📞 Support

For support, please contact the development team or create an issue in the repository.