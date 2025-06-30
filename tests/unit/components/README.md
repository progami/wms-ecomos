# React Component Unit Tests

This directory contains comprehensive unit tests for all React components in the WMS application.

## Test Coverage

### UI Components (`/ui`)
- **button.test.tsx** - Tests for Button component including variants, sizes, states, and accessibility
- **card.test.tsx** - Tests for Card components (Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter)
- **alert.test.tsx** - Tests for Alert components including different variants and accessibility
- **progress.test.tsx** - Tests for Progress component with various progress values and states
- **use-toast.test.tsx** - Tests for toast hook and provider including auto-dismiss and multiple toasts
- **confirm-dialog.test.tsx** - Tests for ConfirmDialog modal including user interactions and responsive behavior
- **empty-state.test.tsx** - Tests for EmptyState component with different content variations
- **page-header.test.tsx** - Tests for PageHeader and HelpfulTips components
- **import-button.test.tsx** - Tests for ImportButton including file upload, validation, and import process

### Chart Components (`/charts`)
- **recharts-components.test.tsx** - Tests for lazy-loaded Recharts components wrapper

### Operation Components (`/operations`)
- **restock-alert-card.test.tsx** - Tests for RestockAlertCard and RestockAlertRow components

### Error Handling
- **error-boundary.test.tsx** - Tests for ErrorBoundary component and useErrorHandler hook

## Running Tests

### Run all component tests:
```bash
cd tests/unit
npm test components/
```

### Run specific component test:
```bash
cd tests/unit
npm test components/ui/button.test.tsx
```

### Run with coverage:
```bash
cd tests/unit
npm test -- --coverage components/
```

### Run in watch mode:
```bash
cd tests/unit
npm test -- --watch components/
```

## Test Structure

Each test file follows a consistent structure:

1. **Component imports and mocks**
2. **Test suites organized by functionality:**
   - Rendering tests
   - User interaction tests
   - State management tests
   - Accessibility tests
   - Edge cases
   - Responsive behavior

## Key Testing Patterns

### 1. Rendering Tests
- Verify components render with required/optional props
- Test conditional rendering
- Verify default values

### 2. User Interactions
```typescript
it('handles click events', () => {
  const handleClick = jest.fn();
  render(<Button onClick={handleClick}>Click me</Button>);
  
  fireEvent.click(screen.getByRole('button'));
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

### 3. Accessibility
```typescript
it('has proper ARIA attributes', () => {
  render(<Alert>Alert message</Alert>);
  expect(screen.getByRole('alert')).toBeInTheDocument();
});
```

### 4. State Changes
```typescript
it('updates when props change', () => {
  const { rerender } = render(<Progress value={50} />);
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  
  rerender(<Progress value={75} />);
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75');
});
```

### 5. Async Operations
```typescript
it('handles async operations', async () => {
  render(<ImportButton entityName="products" />);
  
  const file = new File(['test'], 'test.xlsx');
  await userEvent.upload(screen.getByLabelText(/Select file/i), file);
  
  await waitFor(() => {
    expect(screen.getByText('test.xlsx')).toBeInTheDocument();
  });
});
```

## Mocking Strategies

### External Dependencies
- `next/navigation` - Mocked router, pathname, and search params
- `next/image` - Simplified to regular img element
- `react-hot-toast` - Mock toast functions
- `fetch` - Global fetch mock for API calls

### Component Dependencies
```typescript
jest.mock('@/lib/import-config', () => ({
  getImportConfig: jest.fn(() => mockConfig)
}));
```

## Coverage Goals

- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

## Best Practices

1. **Use React Testing Library queries**
   - Prefer `getByRole` over `getByTestId`
   - Use accessible queries when possible

2. **Test user behavior, not implementation**
   - Focus on what users see and do
   - Avoid testing internal component state

3. **Keep tests isolated**
   - Each test should be independent
   - Clean up after tests when needed

4. **Test edge cases**
   - Empty states
   - Error states
   - Loading states
   - Boundary values

5. **Maintain test readability**
   - Descriptive test names
   - Clear arrange-act-assert structure
   - Helper functions for complex setups