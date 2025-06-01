# Warehouse Management System

A comprehensive warehouse management system designed to handle 3PL (Third-Party Logistics) operations, inventory tracking, cost management, and invoice reconciliation.

## 🎯 Quick Page Reference - What Each Page Does

### 📊 **Dashboards**
- **Admin Dashboard** (`/admin/dashboard`) 
  - System overview with key metrics
  - Quick actions: Import data, Export backups, Clear demo data
  - System monitoring and status indicators
  - User activity tracking

- **Finance Dashboard** (`/finance/dashboard`)
  - Revenue and outstanding invoice tracking
  - Cost variance analysis
  - Collection rate monitoring
  - Visual cost breakdown by category
  - Billing calendar with important dates

- **Warehouse Dashboard** (`/warehouse/dashboard`)
  - Current inventory levels
  - Today's receives and shipments
  - Low stock alerts
  - Quick access to operations

### 📦 **Inventory Management**
- **Inventory List** (`/warehouse/inventory`)
  - Real-time stock levels across all SKUs
  - Advanced search and filtering
  - Color-coded stock indicators (🔴 Out of stock, 🟠 Low stock, ✅ Healthy)
  - Export functionality

- **New Transaction** (`/admin/inventory/new`)
  - Create any type of inventory movement
  - Supports: Receive, Ship, Adjust In/Out
  - Multi-line item support
  - Automatic balance updates

- **Receive Inventory** (`/warehouse/receive`)
  - Simplified receiving interface for warehouse staff
  - Quick SKU selection and quantity entry
  - Reference number tracking

- **Ship Inventory** (`/warehouse/ship`)
  - Process outbound shipments
  - Validates available inventory
  - Prevents negative stock

### 💰 **Financial Management**
- **Invoices** (`/finance/invoices`)
  - View all 3PL invoices
  - Status tracking (Draft, Sent, Paid, Overdue)
  - Create and edit invoices
  - PDF export capability

- **Reconciliation** (`/finance/reconciliation`)
  - Compare calculated costs vs invoiced amounts
  - Identify variances
  - Add notes and explanations
  - Approve or dispute charges

- **Cost Rates** (`/finance/rates`)
  - Manage storage rates ($/pallet/week)
  - Configure handling charges
  - Set effective dates
  - View rate history

### 📈 **Reports & Analytics**
- **Reports** (`/admin/reports`)
  - Generate Excel reports:
    - Storage charges by week
    - Monthly inventory summary
    - Cost analysis
    - Transaction history
  - Custom date ranges
  - Warehouse filtering

- **Calculations** (`/admin/calculations`)
  - Run storage cost calculations
  - Update inventory balances
  - Generate billing period ledgers
  - Monday snapshot processing

### ⚙️ **Settings & Configuration**
- **Settings Hub** (`/admin/settings`)
  - Central configuration center
  - System actions and maintenance
  - Quick access to all settings

- **Warehouses** (`/admin/settings/warehouses`)
  - Add/edit warehouse locations
  - Configure SKU pallet configurations
  - Set warehouse-specific parameters

- **SKUs** (`/admin/settings/skus`)
  - Product master data management
  - Dimensions and pack configurations
  - Active/inactive status
  - ASIN mapping

- **Users** (`/admin/users`)
  - User account management
  - Role assignments
  - Warehouse access control
  - Password resets

## 🚀 Features

### Core Functionality
- **Multi-Warehouse Support**: Manage inventory across multiple warehouse locations
- **Real-time Inventory Tracking**: Track inventory movements, balances, and transactions
- **3PL Cost Management**: Calculate storage costs based on configurable rates and billing periods
- **Invoice Processing**: Record and reconcile 3PL invoices with calculated costs
- **User Role Management**: Support for system admin, finance admin, and warehouse manager roles

### Key Features
- **Excel Import/Export**: Bulk import data from Excel files and export reports
- **Automated Cost Calculations**: Weekly storage cost calculations based on pallet occupancy
- **Billing Period Management**: Support for custom billing periods (16th to 15th of month)
- **Comprehensive Reporting**: Generate various reports including storage charges, inventory balances, and reconciliation reports
- **Real-time Dashboard**: Role-specific dashboards with key metrics and quick actions

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js
- **Excel Processing**: XLSX library
- **UI Components**: Custom components with Lucide React icons

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL database
- Environment variables configured (see `.env.example`)

## 🔧 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd warehouse_management
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your database credentials and other configuration:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/warehouse_db"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

4. Run database migrations:
```bash
npx prisma migrate dev
```

5. Seed the database (optional):
```bash
npx prisma db seed
```

6. Start the development server:
```bash
npm run dev
```

## 🏗️ Project Structure

```
warehouse_management/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── admin/             # Admin pages
│   │   ├── finance/           # Finance pages
│   │   ├── warehouse/         # Warehouse manager pages
│   │   ├── api/               # API routes
│   │   └── auth/              # Authentication pages
│   ├── components/            # Reusable React components
│   ├── lib/                   # Utility functions and configurations
│   └── types/                 # TypeScript type definitions
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.ts              # Database seeding script
├── public/                   # Static assets
└── docs/                     # Documentation files
```

## 👥 User Roles

### System Admin
- Full system access
- User management
- System configuration
- Access to all reports and data
- Import/export functionality

### Finance Admin
- Invoice management
- Cost reconciliation
- Financial reports
- Rate management
- Billing period configuration

### Warehouse Manager
- Inventory management
- Transaction recording
- Warehouse-specific reports
- SKU management

## 📊 Database Schema

### Core Tables
- **warehouses**: Warehouse locations and configurations
- **skus**: Product/SKU master data
- **inventory_balances**: Current inventory levels by SKU and warehouse
- **inventory_transactions**: All inventory movements
- **storage_ledger**: Calculated weekly storage costs
- **invoice_input**: 3PL invoices
- **cost_rates**: 3PL pricing structures

## 🔐 Authentication

The system uses NextAuth.js for authentication with:
- Email/password login
- Role-based access control
- Session management
- Secure password hashing

Default users (development):
- Admin: `admin@example.com` / `admin123`
- Finance: `finance@example.com` / `finance123`
- Warehouse: `warehouse@example.com` / `warehouse123`

## 📈 Reports

Available reports:
- **Storage Charges Report**: Weekly storage costs by warehouse
- **Monthly Inventory Report**: Detailed inventory snapshot
- **Invoice Reconciliation**: Compare invoiced vs calculated costs
- **Transaction History**: All inventory movements
- **Cost Analysis**: Detailed cost breakdown
- **Low Stock Report**: Items below minimum levels

## 🚢 Deployment

### Production Build
```bash
npm run build
npm start
```

### Database Setup
1. Create a PostgreSQL database
2. Run migrations: `npx prisma migrate deploy`
3. Configure environment variables

### Recommended Hosting
- **Application**: Vercel, Railway, or any Node.js hosting
- **Database**: Supabase, Neon, or managed PostgreSQL

## 📝 API Documentation

### Key Endpoints
- `POST /api/auth/login` - User authentication
- `GET /api/inventory` - Fetch inventory data
- `POST /api/transactions` - Record inventory movement
- `POST /api/invoices` - Create invoice
- `POST /api/reports` - Generate reports
- `POST /api/import` - Import Excel data

## 🧪 Testing

Run tests:
```bash
npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -m 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
- Create an issue in the repository
- Contact the development team

## 🔄 Version History

- **v0.1.0** - Initial release with core functionality
  - Multi-warehouse inventory management
  - 3PL cost calculations
  - Invoice processing
  - Basic reporting

---

Built with ❤️ using Next.js and PostgreSQL