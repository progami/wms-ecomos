# Backend Documentation

This document provides comprehensive documentation for the WMS backend implementation, including API architecture, database design, business logic, and integration patterns.

## Technology Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Next.js 14 API Routes
- **Database**: PostgreSQL 14+ with Prisma ORM
- **Authentication**: NextAuth.js with JWT sessions
- **Validation**: Zod for schema validation
- **Background Jobs**: Database triggers and cron jobs
- **File Processing**: xlsx, csv-parse libraries
- **External APIs**: Amazon SP API integration

## API Architecture

### RESTful API Design

The API follows RESTful conventions with consistent patterns:

```
GET    /api/resources          # List resources
GET    /api/resources/:id      # Get single resource
POST   /api/resources          # Create resource
PUT    /api/resources/:id      # Update resource
DELETE /api/resources/:id      # Delete resource
```

### API Route Structure

```
src/app/api/
├── auth/                  # Authentication endpoints
├── admin/                 # Admin-only endpoints
├── inventory/             # Inventory management
├── finance/               # Financial operations
├── operations/            # Warehouse operations
├── reports/               # Reporting endpoints
├── settings/              # Configuration APIs
└── integrations/          # External integrations
```

## Database Schema

### Core Tables

#### Users
```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  username      String?   @unique
  passwordHash  String
  fullName      String
  role          UserRole  // ADMIN, STAFF, CUSTOMER
  warehouseId   String?
  isActive      Boolean   @default(true)
  isDemo        Boolean   @default(false)
  lastLoginAt   DateTime?
  lockedUntil   DateTime?
}
```

#### Warehouses
```prisma
model Warehouse {
  id            String   @id @default(uuid())
  code          String   @unique
  name          String
  address       String?
  latitude      Float?
  longitude     Float?
  contactEmail  String?
  contactPhone  String?
  isActive      Boolean  @default(true)
}
```

#### SKUs (Products)
```prisma
model Sku {
  id                 String    @id @default(uuid())
  skuCode            String    @unique
  asin               String?
  description        String
  packSize           Int
  unitsPerCarton     Int
  cartonDimensionsCm String?
  cartonWeightKg     Decimal?
  fbaStock           Int       @default(0)
}
```

#### Inventory Transactions
```prisma
model InventoryTransaction {
  id                  String          @id @default(uuid())
  transactionId       String          @unique
  warehouseId         String
  skuId               String
  batchLot            String
  transactionType     TransactionType
  cartonsIn           Int             @default(0)
  cartonsOut          Int             @default(0)
  storagePalletsIn    Int             @default(0)
  shippingPalletsOut  Int             @default(0)
  transactionDate     DateTime
  pickupDate          DateTime?
  trackingNumber      String?
  attachments         Json?
}
```

### Relationship Diagram
```
User ──────────────┐
                   │
Warehouse ─────────┼──── WarehouseSkuConfig ──── Sku
     │             │             │                 │
     │             │             │                 │
InventoryTransaction      InventoryBalance    CostRate
     │                           │                 │
     │                           │                 │
     └──────── StorageLedger ────┴─── CalculatedCost
                    │
                    │
                Invoice ──── InvoiceReconciliation
```

## API Endpoints

### Authentication (`/api/auth`)

#### Login
```typescript
POST /api/auth/login
Body: { username: string, password: string }
Response: { user: User, token: string }
```

#### Session Management
- JWT tokens with 24-hour expiration
- Refresh token rotation
- Session invalidation on logout

### Inventory Management (`/api/inventory`)

#### List Inventory
```typescript
GET /api/inventory/balances
Query: {
  warehouseId?: string
  skuId?: string
  page?: number
  limit?: number
}
Response: {
  data: InventoryBalance[]
  pagination: { total, page, limit }
}
```

#### Create Transaction
```typescript
POST /api/inventory/transactions
Body: {
  warehouseId: string
  skuId: string
  batchLot: string
  transactionType: TransactionType
  cartonsIn?: number
  cartonsOut?: number
  // ... other fields
}
Response: { transaction: InventoryTransaction }
```

### Financial APIs (`/api/finance`)

#### Cost Calculation
```typescript
POST /api/finance/cost-calculation
Body: {
  warehouseId: string
  startDate: string
  endDate: string
}
Response: {
  costs: CalculatedCost[]
  summary: { total, breakdown }
}
```

#### Invoice Management
```typescript
GET /api/invoices
POST /api/invoices
PUT /api/invoices/:id
POST /api/invoices/:id/accept
POST /api/invoices/:id/dispute
```

## Business Logic Services

### Inventory Service
```typescript
// lib/services/inventory-service.ts
export class InventoryService {
  // Calculate current balances
  static async calculateBalance(
    warehouseId: string,
    skuId: string,
    batchLot: string
  ): Promise<InventoryBalance> {
    const transactions = await prisma.inventoryTransaction.findMany({
      where: { warehouseId, skuId, batchLot },
      orderBy: { transactionDate: 'asc' }
    });
    
    return transactions.reduce((balance, tx) => {
      balance.cartons += tx.cartonsIn - tx.cartonsOut;
      balance.pallets += tx.storagePalletsIn - tx.shippingPalletsOut;
      return balance;
    }, { cartons: 0, pallets: 0 });
  }
  
  // Restock prediction algorithm
  static async predictRestock(
    skuId: string,
    warehouseId: string
  ): Promise<RestockRecommendation> {
    // Analyze historical data
    // Calculate consumption rate
    // Predict stockout date
    // Generate recommendation
  }
}
```

### Cost Calculation Service
```typescript
// lib/services/cost-calculation-service.ts
export class CostCalculationService {
  static async calculateStorageCosts(
    warehouseId: string,
    period: { start: Date, end: Date }
  ): Promise<StorageCost[]> {
    // Get storage rates
    // Calculate daily storage
    // Apply rate tiers
    // Generate ledger entries
  }
  
  static async calculateHandlingCosts(
    transactions: InventoryTransaction[]
  ): Promise<HandlingCost[]> {
    // Get handling rates
    // Calculate per-transaction costs
    // Aggregate by period
  }
}
```

### Invoice Service
```typescript
// lib/services/invoice-service.ts
export class InvoiceService {
  static async generateInvoice(
    customerId: string,
    period: { start: Date, end: Date }
  ): Promise<Invoice> {
    // Calculate all costs
    // Apply discounts
    // Generate line items
    // Create invoice record
  }
  
  static async reconcilePayment(
    invoiceId: string,
    payment: PaymentDetails
  ): Promise<ReconciliationResult> {
    // Validate payment
    // Update invoice status
    // Create reconciliation record
  }
}
```

## Authentication & Authorization

### Authentication Flow
1. User submits credentials
2. Validate against database
3. Generate JWT token
4. Return token with user data
5. Client stores token
6. Include token in subsequent requests

### Authorization Middleware
```typescript
// lib/auth-utils.ts
export async function requireAuth(
  req: NextRequest,
  allowedRoles?: UserRole[]
) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    throw new Error('Unauthorized');
  }
  
  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    throw new Error('Forbidden');
  }
  
  return session;
}
```

### Role-Based Access Control
```typescript
// API Route Example
export async function GET(req: NextRequest) {
  const session = await requireAuth(req, ['ADMIN', 'STAFF']);
  
  // Only ADMIN and STAFF can access
  const data = await fetchProtectedData();
  return NextResponse.json(data);
}
```

## Data Validation

### Input Validation with Zod
```typescript
// Inventory transaction schema
const createTransactionSchema = z.object({
  warehouseId: z.string().uuid(),
  skuId: z.string().uuid(),
  batchLot: z.string().min(1),
  transactionType: z.enum(['RECEIVE', 'SHIP', 'ADJUST_IN', 'ADJUST_OUT']),
  cartonsIn: z.number().int().min(0).default(0),
  cartonsOut: z.number().int().min(0).default(0),
  transactionDate: z.string().datetime(),
});

// Validation in API route
export async function POST(req: NextRequest) {
  const body = await req.json();
  const validated = createTransactionSchema.parse(body);
  // Process validated data
}
```

### Business Rule Validation
```typescript
// Custom validation rules
async function validateTransaction(data: TransactionInput) {
  // Check warehouse exists and is active
  const warehouse = await prisma.warehouse.findUnique({
    where: { id: data.warehouseId }
  });
  if (!warehouse?.isActive) {
    throw new Error('Warehouse is not active');
  }
  
  // Check SKU exists
  const sku = await prisma.sku.findUnique({
    where: { id: data.skuId }
  });
  if (!sku) {
    throw new Error('SKU not found');
  }
  
  // Validate quantities
  if (data.transactionType === 'SHIP') {
    const balance = await getBalance(data.warehouseId, data.skuId);
    if (balance.cartons < data.cartonsOut) {
      throw new Error('Insufficient inventory');
    }
  }
}
```

## Integration Points

### Amazon SP API Integration
```typescript
// lib/amazon/client.ts
export class AmazonClient {
  private client: SellingPartnerAPI;
  
  constructor(credentials: AmazonCredentials) {
    this.client = new SellingPartnerAPI({
      region: 'na',
      refresh_token: credentials.refreshToken,
      // ... other config
    });
  }
  
  async syncInventory() {
    // Fetch FBA inventory
    const inventory = await this.client.callAPI({
      operation: 'getFbaInventory',
      endpoint: 'fbaInventory',
    });
    
    // Update local database
    await this.updateLocalInventory(inventory);
  }
}
```

### File Import/Export
```typescript
// Excel import handler
export async function importExcel(file: File) {
  const workbook = XLSX.read(await file.arrayBuffer());
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  // Validate and transform data
  const validated = data.map(row => 
    importSchema.parse(transformRow(row))
  );
  
  // Bulk insert with transaction
  await prisma.$transaction(async (tx) => {
    await tx.inventoryTransaction.createMany({
      data: validated
    });
  });
}
```

## Background Jobs & Triggers

### Database Triggers
```sql
-- Update inventory balance on transaction
CREATE OR REPLACE FUNCTION update_inventory_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or create balance record
  INSERT INTO inventory_balances (
    warehouse_id, sku_id, batch_lot,
    current_cartons, current_pallets
  )
  VALUES (
    NEW.warehouse_id, NEW.sku_id, NEW.batch_lot,
    NEW.cartons_in - NEW.cartons_out,
    NEW.storage_pallets_in - NEW.shipping_pallets_out
  )
  ON CONFLICT (warehouse_id, sku_id, batch_lot)
  DO UPDATE SET
    current_cartons = inventory_balances.current_cartons + 
      (NEW.cartons_in - NEW.cartons_out),
    current_pallets = inventory_balances.current_pallets + 
      (NEW.storage_pallets_in - NEW.shipping_pallets_out),
    last_transaction_date = NEW.transaction_date;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Scheduled Jobs
```typescript
// Weekly storage calculation
export async function calculateWeeklyStorage() {
  const warehouses = await prisma.warehouse.findMany({
    where: { isActive: true }
  });
  
  for (const warehouse of warehouses) {
    await calculateStorageForWarehouse(warehouse.id);
  }
}

// Cron job setup
// 0 0 * * 0 - Run every Sunday at midnight
```

## Error Handling

### Structured Error Responses
```typescript
export class APIError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
  }
}

// Usage
throw new APIError(
  400,
  'INVALID_INPUT',
  'Invalid transaction data',
  { field: 'cartonsIn', reason: 'Must be positive' }
);
```

### Global Error Handler
```typescript
export function withErrorHandler(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      return await handler(req);
    } catch (error) {
      if (error instanceof APIError) {
        return NextResponse.json(
          { 
            error: error.message,
            code: error.code,
            details: error.details
          },
          { status: error.statusCode }
        );
      }
      
      // Log unexpected errors
      console.error('Unhandled error:', error);
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}
```

## Performance Optimization

### Database Optimization
```typescript
// Efficient queries with proper indexing
const inventory = await prisma.inventoryBalance.findMany({
  where: {
    warehouseId: warehouseId,
    currentCartons: { gt: 0 }
  },
  include: {
    sku: {
      select: {
        skuCode: true,
        description: true
      }
    }
  },
  orderBy: { lastTransactionDate: 'desc' },
  take: limit,
  skip: (page - 1) * limit
});
```

### Query Optimization
- Use database indexes effectively
- Implement pagination for large datasets
- Use select to limit returned fields
- Batch operations when possible

### Caching Strategy
```typescript
// Redis caching for frequently accessed data
const cacheKey = `inventory:${warehouseId}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const data = await fetchInventory(warehouseId);
await redis.setex(cacheKey, 300, JSON.stringify(data)); // 5 min cache

return data;
```

## Security Best Practices

### Input Sanitization
```typescript
// Sanitize user input
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
}
```

### SQL Injection Prevention
- Always use parameterized queries (Prisma handles this)
- Validate input types and ranges
- Escape special characters in raw queries

### Rate Limiting
```typescript
// Rate limiter implementation
const rateLimiter = new Map<string, RateLimitInfo>();

export async function checkRateLimit(
  identifier: string,
  limit: number = 100,
  window: number = 60000 // 1 minute
) {
  const now = Date.now();
  const userLimit = rateLimiter.get(identifier);
  
  if (!userLimit || now - userLimit.resetTime > window) {
    rateLimiter.set(identifier, {
      count: 1,
      resetTime: now
    });
    return true;
  }
  
  if (userLimit.count >= limit) {
    throw new APIError(429, 'RATE_LIMIT', 'Too many requests');
  }
  
  userLimit.count++;
  return true;
}
```

## Testing Strategy

### Unit Tests
```typescript
// Service test example
describe('InventoryService', () => {
  it('calculates balance correctly', async () => {
    const transactions = [
      { cartonsIn: 100, cartonsOut: 0 },
      { cartonsIn: 0, cartonsOut: 30 },
      { cartonsIn: 50, cartonsOut: 0 }
    ];
    
    const balance = calculateBalance(transactions);
    expect(balance.cartons).toBe(120);
  });
});
```

### Integration Tests
```typescript
// API route test
describe('POST /api/inventory/transactions', () => {
  it('creates transaction with valid data', async () => {
    const response = await request(app)
      .post('/api/inventory/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send(validTransactionData);
      
    expect(response.status).toBe(201);
    expect(response.body.transaction).toBeDefined();
  });
});
```

## Deployment Considerations

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/wms

# Authentication
NEXTAUTH_URL=https://app.example.com
NEXTAUTH_SECRET=your-secret-key

# External APIs
AMAZON_CLIENT_ID=your-client-id
AMAZON_CLIENT_SECRET=your-client-secret

# Features
ENABLE_DEMO_MODE=false
```

### Health Checks
```typescript
// /api/health
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    external: await checkExternalAPIs()
  };
  
  const healthy = Object.values(checks).every(c => c.status === 'ok');
  
  return NextResponse.json(
    { status: healthy ? 'healthy' : 'unhealthy', checks },
    { status: healthy ? 200 : 503 }
  );
}
```