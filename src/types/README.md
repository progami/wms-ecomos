# Types Directory

This directory contains global TypeScript type definitions and interfaces used throughout the application.

## Files

### index.ts
- **Purpose**: Central export point for all type definitions
- **Contents**: 
  - Database model type extensions
  - API response types
  - Form data types
  - Utility types
  - Business domain types

## Type Categories

### Database Types
- Extended Prisma model types
- Relationship types
- Query result types

### API Types
- Request/Response interfaces
- Error response types
- Pagination types

### Business Domain Types
- Invoice types
- Transaction types
- Inventory types
- Financial calculation types

### UI Types
- Form data structures
- Table column definitions
- Filter/Sort options

## Usage Examples

```typescript
// Import types
import { 
  ExtendedTransaction,
  InvoiceWithRelations,
  ApiResponse,
  PaginatedResult 
} from '@/types'

// Use in components
interface Props {
  transaction: ExtendedTransaction
  onUpdate: (data: TransactionUpdateData) => Promise<ApiResponse>
}

// Use in API routes
export async function GET(): Promise<ApiResponse<PaginatedResult<Invoice>>> {
  // Implementation
}
```

## Best Practices

1. **Naming**: Use descriptive names (e.g., `InvoiceWithRelations` not just `Invoice`)
2. **Organization**: Group related types together
3. **Reusability**: Define types in `types/` only if used across modules
4. **Documentation**: Add JSDoc comments for complex types
5. **Avoid Duplication**: Extend Prisma types rather than redefining

## Type Guidelines

- Prefer interfaces over type aliases for object shapes
- Use type aliases for unions, intersections, and utility types
- Always export types that might be used elsewhere
- Keep module-specific types within the module
- Use generics for reusable type patterns