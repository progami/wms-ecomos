# Warehouse Management System - Web App Architecture

## Overview
After careful analysis of your requirements, I'm proposing a modern, scalable architecture that prioritizes:
- **Multi-user collaboration** with real-time updates
- **Intuitive interfaces** tailored to each user role
- **Robust data integrity** with comprehensive validation
- **Performance** for complex calculations and reporting

## Technology Stack

### Frontend: Next.js 14 (App Router) + TypeScript
**Why Next.js?**
- Server-side rendering for fast initial loads
- Built-in API routes reduce complexity
- Excellent SEO and performance out of the box
- TypeScript ensures type safety across the entire application

**UI Framework: Tailwind CSS + shadcn/ui**
- Professional, consistent design system
- Fully accessible components
- Mobile-responsive by default
- Easy to customize for your brand

### Backend: Next.js API Routes + Prisma ORM
**Why this combination?**
- Single codebase for frontend and backend
- Type-safe database queries with Prisma
- Automatic TypeScript types from database schema
- Built-in request validation with Zod

### Database: PostgreSQL (via Supabase)
**Why PostgreSQL?**
- ACID compliance crucial for financial data
- Complex queries for reporting
- Row-level security for multi-tenant data
- Supabase adds real-time subscriptions and authentication

### Additional Services
- **Redis**: Caching and job queues for background calculations
- **BullMQ**: Process weekly storage calculations and monthly reconciliations
- **NextAuth.js**: Secure authentication with simplified two-role access (Admin/Staff)

## User Roles & Interfaces

### Simplified Two-Role System

#### 1. Admin Role
**Full System Access:**
- All warehouse operations (receive, ship, inventory management)
- Financial management (invoices, reconciliation, cost calculations)
- System configuration (users, SKUs, warehouses, cost rates)
- All reports and analytics
- User management and security settings

#### 2. Staff Role
**Operational Access:**
- Inventory ledger (view transactions and balances)
- Receive and ship goods
- View and upload invoices
- Access reconciliation tools
- View operational reports

### Key Interface: Unified Inventory Ledger
**Single Page with Two Tabs:**
1. **Inventory Ledger Tab**
   - Shows all inventory movements (RECEIVE, SHIP, ADJUST)
   - Filterable by date, warehouse, SKU, transaction type
   - Exportable to Excel
   
2. **Current Balances Tab**
   - Real-time inventory levels by Warehouse + SKU + Batch
   - Low stock alerts
   - Point-in-time historical views
- Simple, large-button interface

**Features:**
- Pre-filled forms based on common transactions
- Voice input for hands-free operation
- Real-time validation (prevent negative inventory)
- Transaction history view

### 2. Finance/Admin (Desktop Dashboard)
**Monthly Tasks:**
- Invoice entry and reconciliation
- Cost management
- Discrepancy investigation
- Report generation

**Features:**
- Bulk data import/export
- Automated reconciliation suggestions
- Drill-down capabilities for discrepancies
- Customizable alerts for anomalies

### 3. System Administrator (Configuration Panel)
**Setup Tasks:**
- Master data management
- User access control
- System configuration
- Audit log review

**Features:**
- Version control for rate changes
- Bulk update capabilities
- System health monitoring
- Data integrity checks

### 4. Managers (Analytics Dashboard)
**Monitoring Tasks:**
- Real-time inventory levels
- Cost trends
- Performance metrics
- Exception reports

**Features:**
- Customizable dashboards
- Automated report scheduling
- Data visualization
- Export to Excel/PDF

## Key Architectural Decisions

### 1. Real-Time Updates
Using Supabase Realtime subscriptions:
- Inventory changes broadcast immediately
- Multiple users see updates without refresh
- Conflict resolution for simultaneous edits

### 2. Background Processing
Weekly storage calculations run automatically:
```typescript
// Runs every Monday at 00:01
bullQueue.add('calculate-weekly-storage', {
  weekEndingDate: getNextMonday(),
}, {
  repeat: { pattern: '1 0 * * 1' }
});
```

### 3. Data Validation Layers
Three levels of validation:
1. **Frontend**: Immediate user feedback
2. **API**: Server-side validation with Zod
3. **Database**: Constraints and triggers

### 4. Audit Trail
Every transaction logged with:
- User ID
- Timestamp
- Before/after values
- IP address
- Change reason

## Database Schema (Key Tables)

```sql
-- Core entities
users (id, email, role, warehouse_id)
warehouses (id, name, config)
skus (id, code, description, dimensions)
warehouse_sku_config (warehouse_id, sku_id, storage_pallets, shipping_pallets)

-- Transactions
inventory_transactions (id, type, warehouse_id, sku_id, batch, quantity, user_id, timestamp)
inventory_balances (warehouse_id, sku_id, batch, current_quantity)

-- Financial
cost_rates (id, warehouse_id, cost_type, rate, effective_date, end_date)
storage_snapshots (id, week_ending, warehouse_id, sku_id, quantity, pallets, cost)
invoices (id, number, warehouse_id, period_start, period_end)
invoice_line_items (id, invoice_id, cost_type, quantity, amount)
```

## Security & Robustness

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- API rate limiting
- Session management

### Data Integrity
- Database transactions for multi-table updates
- Optimistic locking for concurrent edits
- Automated backups every 6 hours
- Point-in-time recovery capability

### Error Handling
- Graceful degradation for offline mode
- Comprehensive error logging
- User-friendly error messages
- Automatic retry for failed calculations

## Development Phases

### Phase 1: Core Foundation (Weeks 1-2)
- Database schema and Prisma setup
- Authentication system
- Basic CRUD for master data
- User management

### Phase 2: Inventory Management (Weeks 3-4)
- Transaction entry forms
- Real-time balance updates
- Validation rules
- Mobile interface for warehouse

### Phase 3: Financial Features (Weeks 5-6)
- Automated storage calculations
- Cost ledger generation
- Invoice entry interface
- Reconciliation dashboard

### Phase 4: Polish & Deploy (Week 7-8)
- Performance optimization
- Comprehensive testing
- User training materials
- Production deployment

## Scalability Considerations

- **Horizontal scaling**: Stateless API design
- **Database sharding**: By warehouse if needed
- **Caching strategy**: Redis for frequently accessed data
- **CDN**: Static assets and images
- **Background jobs**: Separate worker processes

## Migration Strategy

1. **Data Import**: Build Excel import tool
2. **Parallel Run**: Run both systems for 1 month
3. **Validation**: Daily reconciliation between systems
4. **Cutover**: Gradual user migration by role

This architecture balances modern best practices with practical considerations for your multi-warehouse operation. It's designed to be intuitive for users while maintaining the robustness required for financial accuracy.