# Lib Directory

This directory contains utility functions, database clients, configurations, and shared business logic.

## Core Utilities

### prisma.ts
- **Purpose**: Prisma client singleton for database access
- **Usage**: Import `prisma` for all database operations
- **Note**: Prevents multiple instances in development

### db.ts
- **Purpose**: Database utility functions and helpers
- **Features**: Connection management, query helpers

### auth.ts
- **Purpose**: NextAuth configuration and authentication logic
- **Features**: 
  - Credentials provider setup
  - JWT session handling
  - Role-based access control
  - User authentication

### auth-utils.ts
- **Purpose**: Authentication utility functions
- **Features**: Permission checks, user validation helpers

### utils.ts
- **Purpose**: General utility functions
- **Features**: 
  - `cn()` - className utility for conditional classes
  - Date formatting helpers
  - Number formatting utilities

### financial-utils.ts
- **Purpose**: Financial calculation utilities
- **Features**: Currency formatting, cost calculations

## Subdirectories

### amazon/
Amazon integration utilities
- **client.ts**: Amazon SP-API client configuration

### calculations/
Business calculation logic
- **cost-aggregation.ts**: Cost aggregation algorithms
- **inventory-balance.ts**: Inventory balance calculations
- **storage-ledger.ts**: Storage cost calculations

### config/
Configuration files
- **shipment-planning.ts**: Shipment planning configuration

## Usage Examples

```typescript
// Database access
import { prisma } from '@/lib/prisma'

// Authentication
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'

// Utilities
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/financial-utils'

// Calculations
import { calculateInventoryBalance } from '@/lib/calculations/inventory-balance'
import { calculateStorageCosts } from '@/lib/calculations/storage-ledger'
```

## Best Practices

1. **Singleton Pattern**: Use for database clients to prevent connection issues
2. **Pure Functions**: Keep utility functions pure and testable
3. **Type Safety**: Always use TypeScript types for parameters and returns
4. **Error Handling**: Include proper error handling in utility functions
5. **Documentation**: Add JSDoc comments for complex functions