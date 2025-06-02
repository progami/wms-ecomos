# Warehouse Management System

A comprehensive warehouse management solution that tracks inventory, calculates storage costs, and manages billing across multiple 3PL warehouses. Built as a web-based replacement for complex Excel spreadsheets, maintaining the same business logic with improved scalability and real-time capabilities.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up database
cp .env.example .env
# Edit .env with your database URL

# Run database setup
npm run db:push
npm run db:seed

# Import existing Excel data (optional)
npm run db:import

# Start the app
npm run dev
```

Visit http://localhost:3000

## 📁 Project Structure

```
warehouse_management/
├── src/                    # Application source code
│   ├── app/               # Next.js app directory (pages & API routes)
│   ├── components/        # React components
│   ├── lib/              # Core business logic
│   ├── hooks/            # Custom React hooks
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Helper functions
├── prisma/                # Database schema and migrations
├── scripts/               # Utility scripts for data management
├── docs/                  # Documentation
│   ├── architecture/     # System architecture docs
│   ├── setup/           # Setup guides
│   └── excel-templates/ # Original Excel system docs
├── tests/                 # Test suite
├── public/               # Static assets
└── data/                 # Excel data and import scripts
```

## 🔑 Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@warehouse.com | admin123 |
| Staff | staff@warehouse.com | admin123 |
| Staff | finance@warehouse.com | admin123 |

## 📈 Current Data Status

✅ **Imported from Excel (May 2024 - May 2025):**
- 174 inventory transactions (33 RECEIVE, 141 SHIP)
- 8 SKUs with full specifications
- 18 warehouse-SKU configurations  
- 31 cost rates (inbound, storage, outbound)
- Current inventory balances calculated

⏳ **Pending Implementation:**
- Storage ledger calculations
- Cost calculations and billing reports
- Invoice reconciliation features

## 📱 Features by Role

### Admin Features (Full System Access)
- User management and permissions
- System settings and configuration
- SKU and warehouse management
- Cost rate configuration
- All reports and analytics
- Import/export data
- Run system calculations

### Staff Features (Operational Access)
- Inventory tracking and management
- Receiving and shipping operations
- Invoice processing and upload
- Cost reconciliation
- View and manage rates
- Generate reports
- Real-time stock monitoring

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **UI Components**: Radix UI, shadcn/ui
- **Charts**: Recharts
- **Excel Processing**: xlsx

## 📊 Key Features

- **Unified Inventory Ledger**: Single page with tabs for transaction history and current balances
- **Transaction-Based System**: All inventory movements tracked as immutable transactions (RECEIVE, SHIP, ADJUST)
- **Point-in-Time Views**: See inventory state at any historical date
- **Real-time Balance Calculation**: Current inventory calculated from complete transaction history
- **Weekly Storage Billing**: Automated Monday stock-takes for 3PL billing (industry standard)
- **Multi-warehouse Management**: Track inventory across FMC, VGLOBAL, 4AS, and other locations
- **Batch/Lot Tracking**: Full traceability with Warehouse + SKU + Batch/Lot identification
- **Invoice Reconciliation**: Compare calculated vs actual costs with variance analysis
- **Simplified Role System**: Two roles - Admin (full access) and Staff (operational access)
- **Excel Import/Export**: Seamless data migration from existing Excel systems
- **Audit Trail**: Complete history of all transactions and modifications

## 🔧 Development

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Open Prisma Studio
npm run db:studio

# Type checking
npm run type-check
```

## 📦 Deployment

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Environment Variables

Create a `.env` file with:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/warehouse_db"

# Authentication
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Optional
NODE_ENV="production"
```

## 📚 Documentation

- [System Overview](./docs/SYSTEM_OVERVIEW.md) - Complete system guide
- [Troubleshooting Guide](./docs/TROUBLESHOOTING.md) - Common issues and solutions
- [Architecture Overview](./docs/architecture/web-app-architecture.md)
- [Database Schema](./docs/architecture/database-schema-optimized.sql)
- [Setup Guide](./docs/setup/quick-start.md)
- [Excel Templates](./docs/excel-templates/) - Original Excel system documentation
- [Test Coverage Report](./docs/test-coverage-report.md)

## 🏢 Business Rules

1. **Billing Periods**: 16th of previous month to 15th of current month
2. **Stock-Take Day**: Monday 23:59:59 (3PL industry standard)
3. **Inventory Tracking**: Every item tracked by Warehouse + SKU + Batch/Lot
4. **No Negative Inventory**: System prevents shipping more than available
5. **Audit Trail**: All transactions preserved, corrections added as new transactions

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Changelog

### v2.1.0 - Bug Fixes and UI Improvements (June 2025)
- 🐛 Fixed finance dashboard API calls (was calling non-existent -simple endpoints)
- 🐛 Fixed admin dashboard data fetching
- 🐛 Fixed SKU management page API endpoint
- ✨ Removed redundant "Inventory Overview" from navigation
- 📚 Added comprehensive system documentation
- 📚 Added troubleshooting guide

### v2.0.0 - Role System Simplification (June 2025)
- ✅ Migrated from 5-role to 2-role system (admin/staff)
- ✅ Updated all role checks throughout the application
- ✅ Removed Receive/Ship from navigation (now buttons on inventory page)
- ✅ Added Settings to staff navigation
- ✅ Fixed all dashboard and page access controls
- ✅ Improved navigation consistency

### v1.0.0 - Initial Release
- Excel data import functionality
- Transaction-based inventory tracking
- Point-in-time inventory views
- Multi-warehouse support
- Invoice reconciliation
- Comprehensive reporting

## 📄 License

This project is licensed under the MIT License.