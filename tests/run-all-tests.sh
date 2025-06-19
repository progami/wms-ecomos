#!/bin/bash

echo "🧪 Running All Tests (Unit, Integration, E2E)"
echo "=============================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Track overall status
OVERALL_STATUS=0

# Function to check command status
check_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2 passed${NC}"
    else
        echo -e "${RED}❌ $2 failed${NC}"
        OVERALL_STATUS=1
    fi
}

# 1. Run Unit Tests
echo -e "\n${BLUE}1. Running Unit Tests...${NC}"
npx jest --config=jest.config.js
check_status $? "Unit tests"

# 2. Run Unit Tests with Coverage
echo -e "\n${BLUE}2. Running Unit Tests with Coverage...${NC}"
npx jest --config=jest.config.js --coverage
check_status $? "Unit tests with coverage"

# 3. Check if Playwright is installed
echo -e "\n${BLUE}3. Checking E2E Test Setup...${NC}"
if ! npx playwright --version &> /dev/null; then
    echo -e "${YELLOW}Playwright not found. Installing...${NC}"
    cd .. && npm install -D @playwright/test && npx playwright install
    cd tests
fi

# 4. Run E2E Tests (if server is running)
echo -e "\n${BLUE}4. Running E2E Tests...${NC}"
# Check if server is running on port 3002
if curl -s http://localhost:3002 > /dev/null; then
    echo -e "${GREEN}Server is running on port 3002${NC}"
    npx playwright test --config=playwright.config.ts
    check_status $? "E2E tests"
else
    echo -e "${YELLOW}⚠️  Server not running on port 3002. Skipping E2E tests.${NC}"
    echo -e "${YELLOW}   Start the server with: npm run dev -- --port 3002${NC}"
fi

# 5. Generate Reports
echo -e "\n${BLUE}5. Test Summary${NC}"
echo "=================="

# Count test files
UNIT_TEST_COUNT=$(find __tests__ -name "*.test.ts" -o -name "*.test.js" | wc -l | tr -d ' ')
E2E_TEST_COUNT=$(find e2e -name "*.spec.ts" -o -name "*.spec.js" | wc -l | tr -d ' ')

echo -e "Unit test files: ${UNIT_TEST_COUNT}"
echo -e "E2E test files: ${E2E_TEST_COUNT}"

# Show coverage if available
if [ -d "coverage" ]; then
    echo -e "\n${BLUE}Coverage Report:${NC}"
    if [ -f "coverage/lcov-report/index.html" ]; then
        echo "Coverage report available at: coverage/lcov-report/index.html"
    fi
fi

# Show Playwright report if available
if [ -d "playwright-report" ]; then
    echo -e "\n${BLUE}E2E Test Report:${NC}"
    echo "E2E test report available at: playwright-report/index.html"
fi

# Final status
echo -e "\n${BLUE}Final Status:${NC}"
if [ $OVERALL_STATUS -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed successfully!${NC}"
else
    echo -e "${RED}❌ Some tests failed. Check the reports for details.${NC}"
fi

exit $OVERALL_STATUS