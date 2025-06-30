#!/bin/bash

# Edge Case Test Runner
# This script runs all edge case and error scenario tests

set -e

echo "🧪 Running Edge Case and Error Scenario Tests"
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if test database is available
echo -e "${YELLOW}Checking test database connection...${NC}"
if ! nc -z localhost 5432; then
    echo -e "${RED}Error: PostgreSQL is not running on localhost:5432${NC}"
    echo "Please ensure your test database is running"
    exit 1
fi

# Run database migrations for test database
echo -e "${YELLOW}Running database migrations...${NC}"
DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy

# Run unit-level edge case tests
echo -e "\n${YELLOW}Running unit-level edge case tests...${NC}"
npm test -- --testPathPattern="tests/edge-cases" --testNamePattern="^(?!.*Cross-Browser).*$" --coverage

# Check if tests passed
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Unit-level edge case tests passed${NC}"
else
    echo -e "${RED}✗ Unit-level edge case tests failed${NC}"
    exit 1
fi

# Run E2E edge case tests
echo -e "\n${YELLOW}Running E2E edge case tests...${NC}"
npx playwright test tests/edge-cases/cross-browser-e2e.spec.ts

# Check if E2E tests passed
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ E2E edge case tests passed${NC}"
else
    echo -e "${RED}✗ E2E edge case tests failed${NC}"
    exit 1
fi

# Generate test report
echo -e "\n${YELLOW}Generating test reports...${NC}"

# Create summary report
cat > tests/edge-cases/test-summary.md << EOF
# Edge Case Test Summary

Generated on: $(date)

## Test Coverage

### Unit Tests
- Concurrent User Actions (Race Conditions) ✓
- Data Integrity During Failures ✓
- Network Failures and Recovery ✓
- Database Connection Errors ✓
- Invalid Data Handling ✓
- Memory Leaks and Performance ✓
- Session Expiration Scenarios ✓
- File System Errors ✓

### E2E Tests
- Cross-Browser Compatibility ✓
- Mobile Device Support ✓
- Touch Gestures ✓
- Responsive Breakpoints ✓

## Coverage Report
See \`coverage/index.html\` for detailed coverage report.

## E2E Test Results
See \`playwright-report/index.html\` for detailed E2E test results.
EOF

echo -e "${GREEN}✓ Test reports generated${NC}"

# Show summary
echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}✅ All edge case tests completed successfully!${NC}"
echo -e "${GREEN}============================================${NC}"

echo -e "\nView reports:"
echo "  - Coverage: tests/edge-cases/coverage/index.html"
echo "  - E2E Results: tests/edge-cases/playwright-report/index.html"
echo "  - Summary: tests/edge-cases/test-summary.md"