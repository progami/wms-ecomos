# Test Suite

Comprehensive test coverage for the Warehouse Management System.

## Structure

- **unit/** - Unit tests for individual components and functions
- **integration/** - Integration tests for API endpoints and workflows
- **e2e/** - End-to-end tests (currently in development)

## Test Categories

### Component Tests
- UI components (buttons, forms, modals)
- Layout components (navigation, dashboard)
- Page components (all user-facing pages)

### API Tests
- Authentication endpoints
- CRUD operations (SKUs, warehouses, transactions)
- Calculation endpoints
- Report generation

### Integration Tests
- Complete workflows (receiving, shipping, billing)
- Role-based access control
- Data consistency checks

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch

# Run specific test file
npm test path/to/test.tsx
```

## Test Stack
- Jest - Test runner
- React Testing Library - Component testing
- MSW - API mocking
- Testing utilities in `test-utils.tsx`