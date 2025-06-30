# API Integration Tests

This directory contains comprehensive integration tests for all WMS API endpoints.

## Test Coverage

### Authentication (`auth.test.ts`)
- Login/logout functionality
- Session management
- Rate limiting
- CSRF protection
- User authentication states

### SKU Management (`skus.test.ts`)
- CRUD operations for SKUs
- Search and filtering
- Pagination
- Data validation
- Access control

### Inventory Management (`inventory.test.ts`)
- Inventory balance queries
- Transaction history
- Shipment notifications
- Incomplete transaction tracking

### Transaction Management (`transactions.test.ts`)
- Create/update transactions
- Inventory impact validation
- Transaction ledger
- Attachments and attributes

### Finance Module (`finance.test.ts`)
- Invoice management
- Cost rate configuration
- Financial calculations
- Cost and storage ledgers
- Financial reporting

### Import/Export (`import-export.test.ts`)
- CSV import for SKUs and transactions
- Export functionality
- Template generation
- Data validation
- Error handling

### Dashboard & Reports (`dashboard-reports.test.ts`)
- Dashboard statistics
- Various report types
- Performance metrics
- Admin dashboard

### User Management (`user-management.test.ts`)
- User CRUD operations
- Role management
- Audit logging
- Access control

### Reconciliation & Misc (`reconciliation-misc.test.ts`)
- Inventory reconciliation
- Warehouse management
- Health checks
- Client-side logging
- Demo mode

## Running Tests

### Prerequisites
1. PostgreSQL database running
2. Environment variables configured
3. Dependencies installed

### Environment Setup
```bash
# Copy test environment configuration
cp .env.test.example .env.test

# Update DATABASE_URL for test database
DATABASE_URL=postgresql://user:password@localhost:5432/wms_test
```

### Run All API Tests
```bash
npm run test:integration
```

### Run Specific Test Suite
```bash
# Run only authentication tests
npm test -- auth.test.ts

# Run only SKU tests
npm test -- skus.test.ts
```

### Run with Coverage
```bash
npm run test:coverage
```

## Test Database Management

Tests use isolated databases that are created and destroyed for each test suite.

### Manual Database Setup
```bash
# Create test database
createdb wms_test

# Run migrations
DATABASE_URL=postgresql://user:password@localhost:5432/wms_test npx prisma db push
```

### Database Cleanup
Test databases are automatically cleaned up after tests complete. If cleanup fails:
```bash
# List test databases
psql -c "SELECT datname FROM pg_database WHERE datname LIKE 'test_%'"

# Drop test databases
psql -c "DROP DATABASE test_xxxxx"
```

## Writing New Tests

### Test Structure
```typescript
describe('API Endpoint Group', () => {
  let prisma: PrismaClient
  let databaseUrl: string
  let session: any

  beforeAll(async () => {
    // Setup test database
    const setup = await setupTestDatabase()
    prisma = setup.prisma
    databaseUrl = setup.databaseUrl
    
    // Create test session
    const user = await createTestUser(prisma)
    session = await createTestSession(user.id)
  })

  afterAll(async () => {
    // Cleanup
    await teardownTestDatabase(prisma, databaseUrl)
  })

  describe('GET /api/endpoint', () => {
    it('should return expected data', async () => {
      // Test implementation
    })
  })
})
```

### Best Practices
1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up created data
3. **Mocking**: Mock external services and auth
4. **Assertions**: Test both success and error cases
5. **Performance**: Keep tests fast and focused

### Common Patterns

#### Testing Authenticated Endpoints
```typescript
jest.mock('next-auth', () => ({
  getServerSession: jest.fn().mockResolvedValue(session)
}))

const response = await request(TEST_SERVER_URL)
  .get('/api/protected')
  .set('Cookie', 'next-auth.session-token=test-token')
```

#### Testing File Uploads
```typescript
const response = await request(TEST_SERVER_URL)
  .post('/api/upload')
  .attach('file', Buffer.from('content'), 'filename.csv')
  .field('type', 'sku')
```

#### Testing Pagination
```typescript
const response = await request(TEST_SERVER_URL)
  .get('/api/items?page=2&limit=10')
```

## Debugging

### Enable Debug Logging
```bash
DEBUG=wms:* npm test
```

### Run Single Test
```typescript
it.only('should test specific scenario', async () => {
  // This test will run in isolation
})
```

### Skip Tests
```typescript
it.skip('should skip this test', async () => {
  // This test will be skipped
})
```

## CI/CD Integration

### GitHub Actions
```yaml
- name: Run API Tests
  env:
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
  run: |
    npm run test:integration
```

### Pre-commit Hook
```bash
# .husky/pre-commit
npm run test:integration -- --onlyChanged
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check PostgreSQL is running
   - Verify DATABASE_URL is correct
   - Check database permissions

2. **Port Already in Use**
   - Kill existing processes on port 3000
   - Use different port: `TEST_SERVER_URL=http://localhost:3001`

3. **Test Timeouts**
   - Increase timeout in jest.config.js
   - Check for async operations not awaited
   - Look for database deadlocks

4. **Flaky Tests**
   - Add retry logic for external services
   - Ensure proper test isolation
   - Check for race conditions

## Performance Considerations

- Tests run in parallel by default
- Use `--runInBand` for sequential execution
- Database operations are the main bottleneck
- Consider using database transactions for faster cleanup

## Contributing

When adding new API endpoints:
1. Create corresponding test file
2. Cover all success and error cases
3. Test authentication and authorization
4. Validate input sanitization
5. Check rate limiting if applicable
6. Update this README with new test coverage