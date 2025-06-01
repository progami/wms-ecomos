# Warehouse Management System

A modern web application for multi-warehouse inventory management, automated cost calculations, and 3PL invoice reconciliation.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Set up database
npm run db:push
npm run db:generate
npm run db:seed

# Start development server
npm run dev
```

Visit http://localhost:3000 and login with demo credentials below.

## 📋 Features

- **Multi-warehouse Support**: Manage inventory across multiple warehouse locations
- **Real-time Inventory Tracking**: Track inventory movements with batch/lot support
- **Automated Calculations**: Weekly storage costs and monthly billing periods
- **Invoice Reconciliation**: Compare expected vs actual costs from 3PL partners
- **Role-based Access**: Different interfaces for warehouse staff, finance, and administrators
- **Real-time Updates**: Live updates across all connected users
- **Mobile Support**: Responsive design for warehouse floor usage

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: NextAuth.js
- **Real-time**: Supabase Realtime
- **Background Jobs**: BullMQ with Redis

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (or Supabase account)
- Redis server (for background jobs)

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone git@github.com:progami/warehouse-management.git
   cd warehouse-management
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your database credentials and other settings.

4. **Set up the database**
   ```bash
   # Push the Prisma schema to your database
   npm run db:push

   # Generate Prisma client
   npm run db:generate

   # Seed the database with initial data
   npm run db:seed
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Default Login Credentials

- **System Admin**: admin@warehouse.com / admin123
- **Warehouse Staff**: staff@warehouse.com / staff123
- **Finance Admin**: finance@warehouse.com / finance123

## 📁 Project Structure

```
├── src/                    # Application source code
│   ├── app/               # Next.js app router pages
│   ├── components/        # React components
│   ├── lib/              # Core libraries and utilities
│   ├── hooks/            # Custom React hooks
│   ├── types/            # TypeScript definitions
│   └── utils/            # Helper functions
├── prisma/                # Database schema and migrations
├── public/                # Static assets
├── docs/                  # Documentation
│   ├── architecture/      # System design documents
│   ├── setup/            # Setup guides
│   └── original-system/  # Original Excel system docs
├── data/                  # Sample data and migrations
├── package.json          # Project dependencies
├── tsconfig.json         # TypeScript configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── next.config.js        # Next.js configuration
```

## Key Features by User Role

### Warehouse Staff
- Quick inventory entry (mobile-optimized)
- Barcode scanning support
- Transaction history
- Real-time inventory levels

### Finance Admin
- Invoice entry and reconciliation
- Cost management
- Monthly billing reports
- Discrepancy investigation

### System Admin
- User management
- Master data configuration
- System monitoring
- Audit logs

### Managers
- Real-time dashboards
- Inventory analytics
- Cost trends
- Custom reports

## Database Schema

The system tracks:
- **SKUs**: Product information with dimensions and weights
- **Warehouses**: Multiple warehouse locations
- **Inventory Transactions**: All movements (RECEIVE, SHIP, ADJUST)
- **Storage Calculations**: Weekly Monday stock-takes
- **Cost Rates**: Time-based pricing for all activities
- **Invoices**: 3PL billing with line-item detail
- **Reconciliation**: Expected vs actual cost comparison

## Development

### Running Tests
```bash
npm test
```

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

### Database Management
```bash
# Open Prisma Studio to view/edit data
npm run db:studio

# Create a new migration
npm run db:migrate
```

## Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables for Production
- Set `NODE_ENV=production`
- Use production database URL
- Generate secure `NEXTAUTH_SECRET`
- Configure proper Redis connection

## Data Migration from Excel

The system includes tools to import your existing Excel data:
1. Navigate to Admin > Import Data
2. Upload your Excel file
3. Map columns to system fields
4. Review and confirm import

## 📚 Documentation

- [Architecture Overview](docs/architecture/web-app-architecture.md)
- [Database Schema](docs/architecture/database-schema.sql)
- [Original Excel System Documentation](docs/original-system/)
- [Setup Guide](docs/setup/)

## Support

For issues or questions, please create an issue in the repository.

## License

This project is proprietary software. All rights reserved.