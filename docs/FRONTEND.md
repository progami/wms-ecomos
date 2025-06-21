# Frontend Development Guide

This guide provides comprehensive documentation for engineers working on the Warehouse Management System (WMS) frontend. It covers our architecture, patterns, conventions, and best practices to ensure consistency across the codebase.

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Architecture Patterns](#architecture-patterns)
4. [Component Guidelines](#component-guidelines)
5. [State Management](#state-management)
6. [Styling Conventions](#styling-conventions)
7. [Data Fetching](#data-fetching)
8. [Form Handling](#form-handling)
9. [Authentication & Authorization](#authentication--authorization)
10. [Testing Strategy](#testing-strategy)
11. [Performance Best Practices](#performance-best-practices)
12. [Development Workflow](#development-workflow)

## Tech Stack

### Core Technologies
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **State Management**: React hooks + Context API
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Date Handling**: date-fns
- **HTTP Client**: Native fetch API
- **Testing**: Jest + Playwright

### Key Dependencies
```json
{
  "next": "14.1.3",
  "react": "^18.2.0",
  "typescript": "^5.3.3",
  "@prisma/client": "^5.11.0",
  "next-auth": "^4.24.7",
  "react-hook-form": "^7.51.0",
  "zod": "^3.22.4",
  "recharts": "^2.12.2",
  "date-fns": "^3.3.1",
  "tailwindcss": "^3.4.1"
}
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth routes (login, register)
│   ├── admin/             # Admin dashboard and management
│   ├── api/               # API routes
│   ├── config/            # Configuration pages (products, locations, etc.)
│   ├── finance/           # Financial management pages
│   ├── operations/        # Warehouse operations (receive, ship, etc.)
│   └── reports/           # Reporting pages
├── components/            # Reusable components
│   ├── layout/           # Layout components (nav, sidebar, etc.)
│   ├── ui/               # Base UI components (shadcn/ui)
│   └── [feature]/        # Feature-specific components
├── lib/                   # Utility functions and configurations
│   ├── calculations/     # Business logic calculations
│   ├── constants/        # App-wide constants
│   └── utils.ts          # General utilities
├── types/                # TypeScript type definitions
└── styles/               # Global styles
```

## Architecture Patterns

### 1. App Router Conventions
We use Next.js 14 App Router with the following conventions:

```typescript
// app/[feature]/page.tsx
export default async function FeaturePage() {
  // Server Component - fetch data directly
  const data = await fetchData()
  
  return <ClientComponent data={data} />
}

// app/[feature]/[id]/page.tsx
export default async function DetailPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const item = await fetchItem(params.id)
  return <DetailView item={item} />
}
```

### 2. Client/Server Component Strategy
- **Server Components** (default): Data fetching, static content
- **Client Components** ('use client'): Interactivity, state, browser APIs

```typescript
// Server Component (default)
// app/inventory/page.tsx
import { InventoryList } from '@/components/inventory/inventory-list'

export default async function InventoryPage() {
  const inventory = await prisma.inventory.findMany()
  return <InventoryList items={inventory} />
}

// Client Component
// components/inventory/inventory-list.tsx
'use client'

export function InventoryList({ items }: { items: Inventory[] }) {
  const [filter, setFilter] = useState('')
  // Interactive logic here
}
```

### 3. API Route Patterns
```typescript
// app/api/[resource]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await prisma.resource.findMany()
    return NextResponse.json(data)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
```

## Component Guidelines

### 1. Component Structure
```typescript
// components/feature/component-name.tsx
import { ComponentProps } from '@/types'

interface ComponentNameProps {
  // Props interface
  data: SomeType
  onAction?: (id: string) => void
  className?: string
}

export function ComponentName({ 
  data, 
  onAction,
  className 
}: ComponentNameProps) {
  // Component logic
  
  return (
    <div className={cn('base-styles', className)}>
      {/* Component JSX */}
    </div>
  )
}
```

### 2. Component Categories

#### Layout Components
Located in `components/layout/`:
- `DashboardLayout`: Main app layout with sidebar
- `MainNav`: Primary navigation
- `PageHeader`: Consistent page headers

#### UI Components
Located in `components/ui/`:
- Base components from shadcn/ui
- Custom styled components
- Form controls

#### Feature Components
Organized by feature:
- `components/inventory/`
- `components/transactions/`
- `components/finance/`

### 3. Component Best Practices
```typescript
// ✅ Good: Single responsibility
export function ProductCard({ product }: { product: Product }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{product.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <ProductDetails product={product} />
        <ProductActions productId={product.id} />
      </CardContent>
    </Card>
  )
}

// ❌ Bad: Too many responsibilities
export function ProductManager({ products, warehouses, user }) {
  // Handles products, warehouses, and user logic
}
```

## State Management

### 1. Local State
Use React hooks for component-level state:
```typescript
function Component() {
  const [isOpen, setIsOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: 'all'
  })
}
```

### 2. Form State
Use React Hook Form for complex forms:
```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  quantity: z.number().min(0, 'Quantity must be positive')
})

function FormComponent() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      quantity: 0
    }
  })
  
  const onSubmit = async (data: z.infer<typeof schema>) => {
    // Handle submission
  }
}
```

### 3. Global State
For cross-component state, use Context API:
```typescript
// contexts/app-context.tsx
const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState()
  
  return (
    <AppContext.Provider value={{ state, setState }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}
```

## Styling Conventions

### 1. Tailwind CSS Usage
```typescript
// Use Tailwind utility classes
<div className="flex items-center justify-between p-4 border rounded-lg">
  <h2 className="text-lg font-semibold">Title</h2>
</div>

// Use cn() utility for conditional classes
import { cn } from '@/lib/utils'

<button 
  className={cn(
    "px-4 py-2 rounded-lg",
    "bg-primary text-primary-foreground",
    "hover:bg-primary/90",
    isActive && "ring-2 ring-primary"
  )}
/>
```

### 2. Component Variants
Use class-variance-authority for component variants:
```typescript
import { cva } from 'class-variance-authority'

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground",
        outline: "border border-input hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)
```

### 3. Dark Mode Support
All components should support dark mode:
```typescript
// Use Tailwind's dark: modifier
<div className="bg-white dark:bg-gray-900">
  <p className="text-gray-900 dark:text-gray-100">Content</p>
</div>

// Color scheme aware
<div className="bg-background text-foreground">
  <div className="border bg-card text-card-foreground">
    Card content
  </div>
</div>
```

## Data Fetching

### 1. Server Components
Fetch data directly in server components:
```typescript
// app/products/page.tsx
async function ProductsPage() {
  const products = await prisma.product.findMany({
    include: {
      category: true,
      warehouse: true
    },
    orderBy: { createdAt: 'desc' }
  })
  
  return <ProductList products={products} />
}
```

### 2. Client-Side Fetching
For client components, use SWR or fetch in useEffect:
```typescript
'use client'

function ClientComponent() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])
  
  if (loading) return <Skeleton />
  return <DataDisplay data={data} />
}
```

### 3. Server Actions
Use Next.js Server Actions for mutations:
```typescript
// app/actions/product-actions.ts
'use server'

export async function createProduct(data: ProductInput) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')
  
  return prisma.product.create({ data })
}

// In client component
import { createProduct } from '@/app/actions/product-actions'

function ProductForm() {
  async function handleSubmit(formData: FormData) {
    const result = await createProduct({
      name: formData.get('name') as string,
      // ...
    })
  }
}
```

## Form Handling

### 1. Form Structure
```typescript
import { useForm } from 'react-hook-form'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

function MyForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: ''
    }
  })
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </form>
    </Form>
  )
}
```

### 2. Validation
Always use Zod schemas for validation:
```typescript
import { z } from 'zod'

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().regex(/^[A-Z0-9-]+$/, 'Invalid SKU format'),
  price: z.number().positive('Price must be positive'),
  warehouseId: z.string().uuid('Invalid warehouse')
})

type ProductFormData = z.infer<typeof productSchema>
```

## Authentication & Authorization

### 1. Session Check
```typescript
// Server Component
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function ProtectedPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }
  
  // Check role
  if (session.user.role !== 'admin') {
    redirect('/unauthorized')
  }
  
  return <AdminContent />
}
```

### 2. Client-Side Auth
```typescript
'use client'

import { useSession } from 'next-auth/react'

function ClientComponent() {
  const { data: session, status } = useSession()
  
  if (status === 'loading') return <Skeleton />
  if (status === 'unauthenticated') return <LoginPrompt />
  
  return <AuthenticatedContent user={session.user} />
}
```

### 3. Role-Based UI
```typescript
function RoleBasedComponent({ user }: { user: User }) {
  return (
    <>
      {/* Everyone sees this */}
      <ViewData />
      
      {/* Only managers and admins */}
      {['manager', 'admin'].includes(user.role) && (
        <EditButton />
      )}
      
      {/* Only admins */}
      {user.role === 'admin' && (
        <DeleteButton />
      )}
    </>
  )
}
```

## Testing Strategy

### 1. Unit Tests (Jest)
```typescript
// __tests__/lib/calculations.test.ts
import { calculateStorageCost } from '@/lib/calculations'

describe('calculateStorageCost', () => {
  it('calculates weekly storage cost correctly', () => {
    const result = calculateStorageCost({
      cartons: 100,
      rate: 0.15,
      days: 7
    })
    expect(result).toBe(15.00)
  })
})
```

### 2. Integration Tests (Playwright)
```typescript
// tests/e2e/inventory.spec.ts
import { test, expect } from '@playwright/test'

test('should create new inventory item', async ({ page }) => {
  await page.goto('/operations/receive')
  
  await page.fill('[name="sku"]', 'TEST-001')
  await page.fill('[name="quantity"]', '100')
  await page.selectOption('[name="warehouse"]', 'warehouse-1')
  
  await page.click('button[type="submit"]')
  
  await expect(page).toHaveURL('/operations/inventory')
  await expect(page.locator('text=TEST-001')).toBeVisible()
})
```

## Performance Best Practices

### 1. Image Optimization
```typescript
import Image from 'next/image'

// Use Next.js Image component
<Image
  src="/product.jpg"
  alt="Product"
  width={400}
  height={300}
  priority={isAboveFold}
  placeholder="blur"
  blurDataURL={blurData}
/>
```

### 2. Code Splitting
```typescript
// Dynamic imports for heavy components
const HeavyChart = dynamic(
  () => import('@/components/charts/heavy-chart'),
  { 
    loading: () => <ChartSkeleton />,
    ssr: false 
  }
)
```

### 3. Data Loading States
Always show loading states:
```typescript
function DataComponent() {
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    )
  }
  
  if (error) {
    return <ErrorState error={error} />
  }
  
  return <DataDisplay data={data} />
}
```

### 4. Memoization
Use React.memo and useMemo for expensive operations:
```typescript
const ExpensiveComponent = React.memo(({ data }: Props) => {
  const processedData = useMemo(
    () => expensiveProcessing(data),
    [data]
  )
  
  return <Display data={processedData} />
})
```

## Development Workflow

### 1. Creating New Features

1. **Create the page route**:
```typescript
// app/feature/page.tsx
export default function FeaturePage() {
  return <FeatureContent />
}
```

2. **Add to navigation**:
```typescript
// Update components/layout/main-nav.tsx
const navigation = [
  // ...existing items
  { name: 'New Feature', href: '/feature', icon: IconName }
]
```

3. **Create components**:
```typescript
// components/feature/feature-list.tsx
// components/feature/feature-form.tsx
// components/feature/feature-card.tsx
```

4. **Add API routes if needed**:
```typescript
// app/api/feature/route.ts
```

### 2. Code Style Guide

- Use TypeScript for all files
- Prefer function components with TypeScript interfaces
- Use descriptive variable names
- Keep components small and focused
- Extract reusable logic into custom hooks
- Comment complex business logic
- Use early returns to reduce nesting

### 3. Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "feat: Add new feature

- Add feature page
- Create API endpoints
- Add tests"

# Push and create PR
git push origin feature/new-feature
```

### 4. Environment Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Set up database
npm run db:push
npm run db:seed

# Run development server
npm run dev
```

## Common Patterns

### 1. Data Tables
```typescript
import { DataTable } from '@/components/ui/data-table'

function InventoryTable({ data }: { data: Inventory[] }) {
  const columns: ColumnDef<Inventory>[] = [
    {
      accessorKey: 'sku',
      header: 'SKU',
    },
    {
      accessorKey: 'quantity',
      header: 'Quantity',
      cell: ({ row }) => (
        <span className="font-mono">
          {row.getValue('quantity')}
        </span>
      )
    }
  ]
  
  return <DataTable columns={columns} data={data} />
}
```

### 2. Modal Dialogs
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

function EditModal({ isOpen, onClose, item }: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {item.name}</DialogTitle>
        </DialogHeader>
        <EditForm item={item} onSuccess={onClose} />
      </DialogContent>
    </Dialog>
  )
}
```

### 3. Toast Notifications
```typescript
import { toast } from 'react-hot-toast'

// Success
toast.success('Item created successfully')

// Error
toast.error('Failed to save changes')

// Loading
const toastId = toast.loading('Saving...')
try {
  await saveData()
  toast.success('Saved!', { id: toastId })
} catch (error) {
  toast.error('Failed to save', { id: toastId })
}
```

### 4. Error Boundaries
```typescript
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <h2 className="text-xl font-semibold mb-4">Something went wrong!</h2>
      <p className="text-muted-foreground mb-4">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
```

## Debugging Tips

1. **Use React Developer Tools** for component inspection
2. **Enable React Query Devtools** for API debugging
3. **Use `console.log` with descriptive labels**
4. **Check Network tab for API calls**
5. **Use breakpoints in Chrome DevTools**
6. **Enable Prisma query logging in development**

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js](https://next-auth.js.org)
- [React Hook Form](https://react-hook-form.com)
- [Zod Documentation](https://zod.dev)

## Contributing

When contributing to this codebase:

1. Follow the existing patterns and conventions
2. Write tests for new features
3. Update documentation as needed
4. Ensure all tests pass before submitting PR
5. Use conventional commits for clear history
6. Request review from team members

Remember: Consistency is key. When in doubt, look at existing code for patterns to follow.