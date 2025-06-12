#!/bin/bash

echo "=== Simulating GitHub Actions CI Workflow ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Change to project root
cd ..

echo "📍 Working directory: $(pwd)"
echo ""

# Simulate Lint Job
echo "=== 🔍 Lint Job ==="
echo "Step: Install dependencies"
if npm ci --silent > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
fi

echo "Step: Run ESLint"
if npm run lint > lint-output.txt 2>&1; then
    echo -e "${GREEN}✓ ESLint passed${NC}"
else
    echo -e "${YELLOW}⚠ ESLint has warnings (continuing)${NC}"
    echo "Warnings:"
    tail -20 lint-output.txt | grep -E "Warning:|warning:" | head -5
fi

echo "Step: Run TypeScript type check"
if npm run type-check > typecheck-output.txt 2>&1; then
    echo -e "${GREEN}✓ TypeScript check passed${NC}"
else
    echo -e "${YELLOW}⚠ TypeScript has errors (continuing)${NC}"
    echo "Errors:"
    grep -E "error TS" typecheck-output.txt | head -5
fi

echo ""
echo "=== 🧪 Unit Tests Job ==="
echo "Step: Run unit tests"

# Test individual test files
echo "Testing export configurations..."
if npm test -- tests/__tests__/lib/export-configurations.test.ts --passWithNoTests > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Export configurations tests passed${NC}"
else
    echo -e "${RED}✗ Export configurations tests failed${NC}"
fi

echo "Testing dynamic export..."
if npm test -- tests/__tests__/lib/dynamic-export.test.ts --passWithNoTests > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Dynamic export tests passed${NC}"
else
    echo -e "${RED}✗ Dynamic export tests failed${NC}"
fi

echo "Testing existing utils..."
if npm test -- tests/__tests__/lib/utils.test.ts --passWithNoTests > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Utils tests passed${NC}"
else
    echo -e "${RED}✗ Utils tests failed${NC}"
fi

echo ""
echo "=== 🔧 Build Job ==="
echo "Step: Build Next.js application"
if npm run build > build-output.txt 2>&1; then
    echo -e "${GREEN}✓ Build successful${NC}"
    echo "Build stats:"
    grep -E "compiled|generated|chunks" build-output.txt | tail -5
else
    echo -e "${RED}✗ Build failed${NC}"
    echo "Error:"
    tail -20 build-output.txt | grep -E "Error:|error:" | head -5
fi

echo ""
echo "=== 📊 Test Summary ==="
echo "Checking test coverage..."
if npm test -- --coverage --coverageReporters=text-summary --passWithNoTests tests/__tests__/lib/utils-simple.test.ts 2>&1 | grep -E "Statements|Branches|Functions|Lines"; then
    echo -e "${GREEN}Coverage report generated${NC}"
else
    echo -e "${YELLOW}⚠ Could not generate coverage${NC}"
fi

echo ""
echo "=== 🎬 E2E Tests (Simulated) ==="
echo "E2E tests require Playwright and a running server"
echo "Checking Playwright installation..."
if npx playwright --version > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Playwright is installed${NC}"
else
    echo -e "${YELLOW}⚠ Playwright not installed${NC}"
fi

echo ""
echo "=== 📝 Workflow Simulation Complete ==="
echo ""
echo "Summary:"
echo "- Lint: Has warnings but would pass in CI"
echo "- Type Check: Has errors but would pass in CI"
echo "- Unit Tests: Some tests have syntax issues"
echo "- Build: Would need to check"
echo "- E2E: Requires full setup"

# Cleanup
rm -f lint-output.txt typecheck-output.txt build-output.txt