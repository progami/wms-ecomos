#!/bin/bash

# Production Readiness Checklist
# This script validates that all critical production components are in place

echo "📋 Production Readiness Checklist"
echo "================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

CHECKS_PASSED=0
CHECKS_FAILED=0

# Function to check if a file exists
check_file() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $description"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}✗${NC} $description (missing: $file)"
        ((CHECKS_FAILED++))
    fi
}

# Function to check if a pattern exists in a file
check_pattern() {
    local file=$1
    local pattern=$2
    local description=$3
    
    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $description"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}✗${NC} $description"
        ((CHECKS_FAILED++))
    fi
}

echo -e "\n🔒 Security Components:"
check_file "middleware.ts" "Middleware for route protection"
check_file "src/lib/rate-limit.ts" "Rate limiting configuration"
check_file "src/lib/csrf.ts" "CSRF protection"
check_pattern "middleware.ts" "x-frame-options" "Security headers configured"
check_pattern "middleware.ts" "role.*admin" "Admin-only access in production"

echo -e "\n🚨 Error Handling:"
check_file "src/components/error-boundary.tsx" "Error boundary component"
check_file "src/app/error.tsx" "Error page"
check_file "src/app/not-found.tsx" "404 page"
check_file "src/app/500.tsx" "500 error page"

echo -e "\n📊 Monitoring & Health:"
check_file "src/app/api/health/route.ts" "Health check endpoint"
check_pattern "src/app/api/health/route.ts" "database.*check" "Database health check"

echo -e "\n⚡ Performance:"
check_pattern "next.config.js" "swcMinify.*true" "SWC minification enabled"
check_pattern "next.config.js" "compress.*true" "Compression enabled"
check_file "tests/production-readiness/scripts/check-data-integrity.ts" "Data integrity checks"

echo -e "\n📝 Logging:"
check_file "src/lib/logger/index.ts" "Logging system"
check_pattern "src/lib/logger/server.ts" "production.*winston" "Production logging configured"

echo -e "\n🔐 Authentication:"
check_file "src/lib/auth.ts" "Authentication configuration"
check_pattern "src/lib/auth.ts" "secret.*process.env" "Auth secret from environment"

echo -e "\n🗄️ Database:"
check_file "prisma/schema.prisma" "Database schema"
check_pattern "prisma/schema.prisma" "@@index" "Database indexes defined"

echo -e "\n🧪 Testing:"
check_file "tests/jest.config.js" "Jest configuration"
check_file "tests/playwright.config.ts" "Playwright configuration"
check_file "tests/run-production-tests.sh" "Production test runner"

echo -e "\n📦 Build Configuration:"
check_file "package.json" "Package configuration"
check_pattern "package.json" "\"build\".*next build" "Build script defined"
check_pattern "package.json" "\"typecheck\"" "Type checking script"
check_pattern "package.json" "\"lint\"" "Linting script"

echo -e "\n🌍 Environment:"
check_file ".env.example" "Environment example file"

# Summary
echo -e "\n================================="
echo -e "📊 Checklist Summary"
echo -e "================================="
echo -e "${GREEN}Checks Passed: $CHECKS_PASSED${NC}"
echo -e "${RED}Checks Failed: $CHECKS_FAILED${NC}"

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✅ All production components are in place!${NC}"
    exit 0
else
    echo -e "\n${YELLOW}⚠️  Some components are missing. Review the checklist above.${NC}"
    exit 1
fi