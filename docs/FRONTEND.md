# Frontend Documentation

This document provides comprehensive documentation for the WMS frontend implementation, including UI architecture, components, routing, and best practices.

## Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript 4.5+
- **UI Library**: React 18
- **Styling**: Tailwind CSS with custom design system
- **Components**: Radix UI primitives for accessibility
- **State Management**: React Query (TanStack Query) for server state
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for data visualization
- **Tables**: TanStack Table for advanced data grids

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── admin/             # Admin-only pages
│   ├── api/               # API routes
│   ├── config/            # Configuration pages
│   ├── dashboard/         # Main dashboard
│   ├── finance/           # Financial management
│   ├── operations/        # Warehouse operations
│   └── reports/           # Reporting features
├── components/            # Reusable components
│   ├── common/           # Shared components
│   ├── finance/          # Finance-specific components
│   ├── layout/           # Layout components
│   ├── operations/       # Operations components
│   ├── reports/          # Reporting components
│   ├── ui/              # Base UI components
│   └── warehouse/        # Warehouse visualization
├── hooks/                # Custom React hooks
├── lib/                  # Utilities and helpers
└── types/               # TypeScript definitions
```

## Routing Architecture

The application uses Next.js 14 App Router with the following structure:

### Public Routes
- `/` - Landing page
- `/auth/login` - User authentication
- `/auth/error` - Authentication error page

### Protected Routes

#### Dashboard & Analytics
- `/dashboard` - Main dashboard with key metrics
- `/analytics` - Advanced analytics and charts

#### Operations
- `/operations` - Operations overview
- `/operations/receive` - Receive goods workflow
- `/operations/ship` - Shipping workflow
- `/operations/inventory` - Inventory management
- `/operations/transactions` - Transaction history
- `/operations/pallet-variance` - Pallet tracking

#### Finance
- `/finance` - Finance overview
- `/finance/invoices` - Invoice management
- `/finance/cost-ledger` - Cost tracking
- `/finance/storage-ledger` - Storage costs
- `/finance/reconciliation` - Payment reconciliation

#### Configuration
- `/config` - Configuration overview
- `/config/products` - SKU management
- `/config/locations` - Warehouse setup
- `/config/rates` - Cost rate configuration
- `/config/warehouse-configs` - Warehouse-SKU configs

#### Admin
- `/admin/dashboard` - Admin dashboard
- `/admin/users` - User management
- `/admin/settings` - System settings
- `/admin/reports` - Admin reports

## State Management

### Server State (React Query)
```typescript
// Example: Fetching inventory data
const { data, isLoading, error } = useQuery({
  queryKey: ['inventory', filters],
  queryFn: () => fetchInventory(filters),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

### Client State
- Form state: React Hook Form
- UI state: React useState/useReducer
- Global UI state: Context API for theme, modals

### Data Flow
1. **Fetching**: React Query handles all data fetching
2. **Caching**: Automatic caching with configurable TTL
3. **Mutations**: Optimistic updates for better UX
4. **Revalidation**: Automatic revalidation on focus/reconnect

## Component Architecture

### Component Categories

#### 1. Base UI Components (`/components/ui/`)
Foundational components built on Radix UI:
- `Button` - Consistent button styling with variants
- `Card` - Content containers
- `Alert` - User notifications
- `Dialog` - Modal dialogs
- `Table` - Data tables
- `Form` - Form controls

#### 2. Layout Components (`/components/layout/`)
- `DashboardLayout` - Main application layout
- `MainNav` - Navigation menu
- `PageHeader` - Consistent page headers
- `Breadcrumb` - Navigation breadcrumbs

#### 3. Feature Components
Organized by domain:
- `InventoryTabs` - Inventory view tabs
- `WarehouseMap` - Warehouse visualization
- `ReportGenerator` - Custom report builder
- `DemoDataManager` - Demo mode controls

### Component Patterns

#### 1. Compound Components
```tsx
<Card>
  <Card.Header>
    <Card.Title>Inventory Status</Card.Title>
  </Card.Header>
  <Card.Content>
    {/* Content */}
  </Card.Content>
</Card>
```

#### 2. Render Props
```tsx
<DataTable
  data={inventory}
  columns={columns}
  renderCell={(item, column) => (
    <CustomCell item={item} column={column} />
  )}
/>
```

#### 3. Custom Hooks
```tsx
function useInventory(filters) {
  const { data, isLoading } = useQuery({...});
  const updateMutation = useMutation({...});
  
  return {
    inventory: data,
    isLoading,
    updateInventory: updateMutation.mutate,
  };
}
```

## Styling & Theming

### Tailwind Configuration
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {...},
        secondary: {...},
        danger: {...},
      },
      spacing: {
        // Custom spacing
      },
    },
  },
};
```

### Component Styling
Using `class-variance-authority` for variant styling:
```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-primary/90",
        outline: "border border-input hover:bg-accent",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);
```

### Responsive Design
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Touch-friendly interfaces
- Adaptive layouts

## Forms & Validation

### Form Architecture
```tsx
const schema = z.object({
  skuCode: z.string().min(1, "SKU code is required"),
  quantity: z.number().positive("Quantity must be positive"),
});

function InventoryForm() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });
  
  const onSubmit = async (data) => {
    await createInventory(data);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Form fields */}
      </form>
    </Form>
  );
}
```

### Validation Patterns
- Client-side: Zod schemas
- Real-time validation feedback
- Server-side validation echo
- Custom validation rules

## Performance Optimization

### Code Splitting
```tsx
// Lazy load heavy components
const WarehouseMap = dynamic(
  () => import('@/components/warehouse/warehouse-map'),
  { 
    loading: () => <Skeleton />,
    ssr: false 
  }
);
```

### Image Optimization
```tsx
import Image from 'next/image';

<Image
  src="/warehouse.jpg"
  alt="Warehouse"
  width={800}
  height={600}
  loading="lazy"
  placeholder="blur"
/>
```

### Data Optimization
- Pagination for large datasets
- Virtual scrolling for long lists
- Debounced search inputs
- Memoized expensive calculations

## Error Handling

### Error Boundaries
```tsx
<ErrorBoundary
  fallback={<ErrorFallback />}
  onError={(error) => logError(error)}
>
  <Component />
</ErrorBoundary>
```

### API Error Handling
```tsx
try {
  const data = await api.post('/inventory', payload);
  toast.success('Inventory created');
} catch (error) {
  if (error.response?.status === 409) {
    toast.error('Duplicate entry');
  } else {
    toast.error('Something went wrong');
  }
}
```

## Testing Strategy

### Unit Tests
```tsx
// Button.test.tsx
describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

### Integration Tests
```tsx
// InventoryForm.test.tsx
it('submits form with valid data', async () => {
  render(<InventoryForm />);
  
  await userEvent.type(screen.getByLabelText('SKU'), 'TEST-001');
  await userEvent.click(screen.getByText('Submit'));
  
  expect(mockApi.post).toHaveBeenCalledWith('/inventory', {
    sku: 'TEST-001',
  });
});
```

## Accessibility

### ARIA Implementation
- Semantic HTML elements
- ARIA labels for interactive elements
- Keyboard navigation support
- Screen reader announcements

### Focus Management
```tsx
// Trap focus in modals
<FocusTrap active={isOpen}>
  <Dialog>
    {/* Dialog content */}
  </Dialog>
</FocusTrap>
```

## Best Practices

### 1. Component Design
- Single responsibility principle
- Props interface documentation
- Default props for optional values
- Composition over inheritance

### 2. State Management
- Minimize client state
- Derive state when possible
- Colocate state with usage
- Use server state for data

### 3. Performance
- Lazy load routes and components
- Optimize re-renders with memo
- Use production builds for testing
- Monitor bundle size

### 4. Code Quality
- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Pre-commit hooks

## Common Patterns

### Data Fetching Pattern
```tsx
function useInventoryData(warehouseId: string) {
  return useQuery({
    queryKey: ['inventory', warehouseId],
    queryFn: () => api.get(`/inventory/${warehouseId}`),
    enabled: !!warehouseId,
  });
}
```

### Optimistic Updates
```tsx
const mutation = useMutation({
  mutationFn: updateInventory,
  onMutate: async (newData) => {
    await queryClient.cancelQueries(['inventory']);
    const previous = queryClient.getQueryData(['inventory']);
    queryClient.setQueryData(['inventory'], (old) => ({
      ...old,
      ...newData,
    }));
    return { previous };
  },
  onError: (err, newData, context) => {
    queryClient.setQueryData(['inventory'], context.previous);
  },
});
```

### Protected Route Pattern
```tsx
function ProtectedRoute({ children, requiredRole }) {
  const { data: session, status } = useSession();
  
  if (status === 'loading') return <Loading />;
  if (!session) return <Navigate to="/login" />;
  if (requiredRole && session.user.role !== requiredRole) {
    return <Navigate to="/unauthorized" />;
  }
  
  return children;
}
```