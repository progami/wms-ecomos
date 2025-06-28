#!/bin/bash

# Production Readiness Test Suite
# This script runs all tests to ensure the application is production-ready

echo "🚀 Running Production Readiness Test Suite"
echo "========================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test suite
run_test_suite() {
    local suite_name=$1
    local command=$2
    
    echo -e "\n${YELLOW}Running $suite_name...${NC}"
    
    if eval $command; then
        echo -e "${GREEN}✓ $suite_name passed${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ $suite_name failed${NC}"
        ((TESTS_FAILED++))
    fi
}

# 1. Unit Tests
run_test_suite "Unit Tests" "npm run test"

# 2. API Tests
run_test_suite "API Tests" "npm run test -- __tests__/api"

# 3. Security Tests
run_test_suite "Security Tests" "npm run test -- vulnerability-tests"

# 4. Data Integrity Tests
run_test_suite "Data Integrity" "node scripts/check-data-integrity.ts"

# 5. E2E Tests (if Playwright is available)
if command -v npx &> /dev/null && npx playwright --version &> /dev/null; then
    run_test_suite "E2E Tests" "npm run test:e2e"
else
    echo -e "${YELLOW}⚠ Skipping E2E tests (Playwright not installed)${NC}"
fi

# 6. Performance Tests
run_test_suite "Performance Tests" "npm run test -- __tests__/performance"

# 7. Load Tests (basic)
echo -e "\n${YELLOW}Running basic load test...${NC}"
if command -v ab &> /dev/null; then
    # Apache Bench test - 100 requests, 10 concurrent
    ab -n 100 -c 10 -q http://localhost:3000/api/health > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Basic load test passed${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ Basic load test failed${NC}"
        ((TESTS_FAILED++))
    fi
else
    echo -e "${YELLOW}⚠ Skipping load test (Apache Bench not installed)${NC}"
fi

# 8. Build Test
run_test_suite "Production Build" "npm run build"

# 9. Type Check
run_test_suite "TypeScript Check" "npm run typecheck"

# 10. Lint Check
run_test_suite "ESLint Check" "npm run lint"

# Summary
echo -e "\n========================================="
echo -e "📊 Test Summary"
echo -e "========================================="
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✅ All tests passed! Application is production-ready.${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Please fix the issues before deploying to production.${NC}"
    exit 1
fi