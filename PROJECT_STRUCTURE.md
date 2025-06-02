# 📂 Warehouse Management System - Project Structure

## 🏗️ Directory Overview

```
warehouse_management/
├── 📱 src/                     # Application source code
│   ├── app/                    # Next.js app router pages
│   ├── components/             # Reusable React components
│   ├── lib/                    # Core utilities and configurations
│   ├── hooks/                  # Custom React hooks
│   ├── types/                  # TypeScript type definitions
│   └── utils/                  # Helper functions
│
├── 🗄️ prisma/                  # Database configuration
│   ├── schema.prisma          # Database schema definition
│   ├── seed.ts                # Database seeding script
│   └── migrations/            # Database migration files
│
├── 📚 docs/                    # Documentation
│   ├── architecture/          # System design documents
│   ├── excel-templates/       # Original Excel system templates
│   └── setup/                 # Setup and installation guides
│
├── 🧪 tests/                   # Test suites
│   ├── unit/                  # Unit tests
│   ├── integration/           # Integration tests
│   └── e2e/                   # End-to-end tests
│
├── 🛠️ scripts/                 # Utility scripts
│   ├── import/                # Data import scripts
│   ├── migration/             # Database migration scripts
│   └── seed/                  # Data seeding scripts
│
├── 📦 public/                  # Static assets
├── 🔧 config/                  # Configuration files
└── 📄 Root files              # Package.json, env, etc.
```

## 📁 Key Directories Explained

### `/src/app` - Application Pages
- **admin/** - System administration pages (users, settings)
- **finance/** - Financial management (invoices, reconciliation)
- **warehouse/** - Warehouse operations (inventory, receive/ship)
- **api/** - REST API endpoints

### `/src/components` - UI Components
- **ui/** - Base UI components (buttons, forms, modals)
- **layout/** - Layout components (navigation, headers)
- **common/** - Shared components across features

### `/src/lib` - Core Libraries
- **auth.ts** - Authentication configuration
- **prisma.ts** - Database client
- **utils.ts** - Utility functions
- **calculations/** - Business logic for costs and inventory

### `/prisma` - Database
- **schema.prisma** - Complete database schema
- **seed.ts** - Initial data setup
- **migrations/** - Schema version history

### `/docs` - Documentation
- **architecture/** - System design and data flow
- **excel-templates/** - Reference Excel templates
- **setup/** - Installation and configuration guides

## 🔄 Data Flow

```
User Input → Page Component → API Route → Service Layer → Database
                                ↓
                        Business Logic
                      (calculations)
```

## 🎯 Quick Navigation

- **Want to add a new page?** → `/src/app/`
- **Need to modify database?** → `/prisma/schema.prisma`
- **Adding new component?** → `/src/components/`
- **Business logic changes?** → `/src/lib/calculations/`
- **API endpoint needed?** → `/src/app/api/`

## 🏷️ Naming Conventions

- **Pages**: `page.tsx` (Next.js convention)
- **Components**: PascalCase (e.g., `InventoryList.tsx`)
- **Utilities**: camelCase (e.g., `formatCurrency.ts`)
- **API Routes**: `route.ts` (Next.js convention)
- **Database**: snake_case (PostgreSQL convention)