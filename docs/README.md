# WMS Documentation

Welcome to the Warehouse Management System (WMS) documentation. This comprehensive guide covers all aspects of the system architecture, implementation, and usage.

## Project Overview

The WMS is a modern, full-stack warehouse management solution designed for 3PL (Third-Party Logistics) operations. It provides comprehensive inventory tracking, automated billing, multi-warehouse support, and seamless integration with external systems like Amazon FBA.

### Key Capabilities

- **Multi-Warehouse Management**: Support for multiple warehouses with independent configurations
- **Real-Time Inventory Tracking**: Track inventory at carton, pallet, and unit levels
- **Automated Financial Management**: Cost calculations, invoicing, and reconciliation
- **Amazon FBA Integration**: Sync inventory and manage FBA operations
- **Role-Based Access Control**: Secure access with admin, staff, and customer roles
- **Audit Trail**: Immutable transaction history with comprehensive logging
- **Analytics & Reporting**: Real-time dashboards and customizable reports

## Architecture Overview

The system follows a modern, scalable architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  Next.js 14 │ React 18 │ TypeScript │ Tailwind CSS         │
├─────────────────────────────────────────────────────────────┤
│                      API Layer                               │
│         Next.js API Routes │ REST │ Server Actions          │
├─────────────────────────────────────────────────────────────┤
│                   Business Logic                             │
│      Services │ Calculations │ Validations │ Triggers       │
├─────────────────────────────────────────────────────────────┤
│                    Data Layer                                │
│          Prisma ORM │ PostgreSQL │ Transactions             │
├─────────────────────────────────────────────────────────────┤
│                  External Services                           │
│     Amazon SP API │ Email │ File Storage │ Analytics        │
└─────────────────────────────────────────────────────────────┘
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Git
- Optional: Docker for containerized deployment

### Quick Setup

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd WMS
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Setup database**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - URL: http://localhost:3002
   - Default admin: `admin` / `SecureWarehouse2024!`

## Documentation Structure

- **[Frontend Documentation](./FRONTEND.md)**: UI components, routing, state management
- **[Backend Documentation](./BACKEND.md)**: API routes, business logic, database design
- **[Logging Documentation](./LOGGING.md)**: Logging strategy, monitoring, debugging
- **[Field Mapping Reference](./FIELD_MAPPING_REFERENCE.md)**: Import/export field mappings
- **[Architecture](./architecture/)**: Detailed architecture documentation
- **[Setup Guides](./setup/)**: Environment-specific setup instructions
- **[Excel Templates](./excel-templates/)**: Import/export template documentation

## Key Features Deep Dive

### 1. Inventory Management
- Real-time stock tracking across multiple warehouses
- Batch/lot tracking for traceability
- Automatic balance calculations
- Restock alerts and predictions

### 2. Financial Management
- Automated cost calculations based on configurable rates
- Invoice generation and management
- Payment tracking and reconciliation
- Storage cost calculations

### 3. Operations Workflow
- Receive goods with pallet configuration
- Ship products with tracking
- Inventory adjustments and transfers
- Pallet variance tracking

### 4. Integration Capabilities
- Amazon FBA inventory sync
- Excel/CSV import/export
- Email notifications
- API access for external systems

### 5. Security & Compliance
- Role-based access control
- Immutable audit trail
- Session management
- Rate limiting and CSRF protection

## Development Workflow

### Code Organization
```
src/
├── app/           # Next.js app router pages and API routes
├── components/    # Reusable React components
├── lib/          # Business logic and utilities
├── hooks/        # Custom React hooks
└── types/        # TypeScript type definitions
```

### Testing Strategy
- Unit tests: Jest for business logic
- Integration tests: API endpoint testing
- E2E tests: Playwright for user workflows
- Performance tests: Load and stress testing

### Deployment
- Staging: Docker containers on AWS ECS
- Production: Scaled ECS with RDS PostgreSQL
- CI/CD: GitHub Actions for automated deployment

## Best Practices

1. **Code Quality**
   - TypeScript for type safety
   - ESLint and Prettier for consistency
   - Comprehensive error handling

2. **Performance**
   - Database query optimization
   - Client-side caching
   - Lazy loading and code splitting

3. **Security**
   - Input validation and sanitization
   - Secure session management
   - Regular security audits

4. **Maintainability**
   - Clear documentation
   - Consistent naming conventions
   - Modular architecture

## Support & Resources

- **Issue Tracking**: GitHub Issues
- **Documentation Updates**: Pull requests welcome
- **Security Issues**: Report privately to security team

## Quick Links

- [API Documentation](./BACKEND.md#api-routes)
- [Database Schema](./BACKEND.md#database-schema)
- [Component Library](./FRONTEND.md#components)
- [Troubleshooting Guide](./LOGGING.md#debugging-guide)