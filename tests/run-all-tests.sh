#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🧪 Running All UI Element Tests"
echo "================================"

# Ensure we're in the right directory
cd "$(dirname "$0")/.."

# Install dependencies if needed
if [ ! -d "node_modules/@playwright/test" ]; then
    echo -e "${YELLOW}Installing Playwright...${NC}"
    npm install --save-dev @playwright/test
    npx playwright install
fi

# Create auth.json if it doesn't exist
if [ ! -f "tests/auth.json" ]; then
    echo -e "${YELLOW}Running authentication setup...${NC}"
    npx playwright test tests/global-setup.ts
fi

# Run tests
echo -e "\n${GREEN}Running E2E Tests...${NC}"

# Run tests by category
echo -e "\n${YELLOW}1. Authentication Tests${NC}"
npx playwright test tests/e2e/auth.spec.ts

echo -e "\n${YELLOW}2. Navigation Tests${NC}"
npx playwright test tests/e2e/navigation.spec.ts

echo -e "\n${YELLOW}3. Dashboard Tests${NC}"
npx playwright test tests/e2e/dashboard.spec.ts

echo -e "\n${YELLOW}4. Operations Tests${NC}"
npx playwright test tests/e2e/operations-receive.spec.ts
npx playwright test tests/e2e/operations-inventory.spec.ts

echo -e "\n${YELLOW}5. Finance Tests${NC}"
npx playwright test tests/e2e/finance-invoices.spec.ts

echo -e "\n${YELLOW}6. Configuration Tests${NC}"
npx playwright test tests/e2e/config-products.spec.ts

echo -e "\n${YELLOW}7. Reports Tests${NC}"
npx playwright test tests/e2e/reports.spec.ts

echo -e "\n${YELLOW}8. Admin Tests${NC}"
npx playwright test tests/e2e/admin-settings.spec.ts

echo -e "\n${YELLOW}9. Integration Tests${NC}"
npx playwright test tests/e2e/integrations.spec.ts

echo -e "\n${YELLOW}10. Common Components Tests${NC}"
npx playwright test tests/e2e/common-components.spec.ts

# Run all tests together with HTML report
echo -e "\n${GREEN}Running All Tests with HTML Report...${NC}"
npx playwright test --reporter=html

echo -e "\n${GREEN}✅ All tests completed!${NC}"
echo -e "View the report: ${YELLOW}npx playwright show-report${NC}"