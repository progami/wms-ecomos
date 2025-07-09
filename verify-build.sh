#!/bin/bash

echo "============================================"
echo "WMS BUILD AND TEST VERIFICATION"
echo "============================================"
echo

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Track results
BUILD_PASS=0
TYPECHECK_PASS=0
UNIT_PASS=0
INTEGRATION_PASS=0
PERFORMANCE_PASS=0

echo -e "${YELLOW}1. BUILD CHECK${NC}"
if npm run build > /tmp/build.log 2>&1; then
    echo -e "${GREEN}✓ Build: PASSING${NC}"
    BUILD_PASS=1
else
    echo -e "${RED}✗ Build: FAILING${NC}"
    tail -10 /tmp/build.log
fi
echo

echo -e "${YELLOW}2. TYPECHECK${NC}"
if npm run type-check > /tmp/typecheck.log 2>&1; then
    echo -e "${GREEN}✓ TypeScript: PASSING${NC}"
    TYPECHECK_PASS=1
else
    echo -e "${RED}✗ TypeScript: FAILING${NC}"
    tail -10 /tmp/typecheck.log
fi
echo

echo -e "${YELLOW}3. UNIT TESTS${NC}"
if npm run test:unit > /tmp/unit.log 2>&1; then
    UNIT_COUNT=$(grep -E "Tests:.*passed" /tmp/unit.log | tail -1)
    echo -e "${GREEN}✓ Unit Tests: PASSING${NC}"
    echo "  $UNIT_COUNT"
    UNIT_PASS=1
else
    echo -e "${RED}✗ Unit Tests: FAILING${NC}"
    grep -E "Test Suites:|Tests:" /tmp/unit.log | tail -2
fi
echo

echo -e "${YELLOW}4. INTEGRATION TESTS${NC}"
if npm run test:integration > /tmp/integration.log 2>&1; then
    INT_COUNT=$(grep -E "Tests:.*passed" /tmp/integration.log | tail -1)
    echo -e "${GREEN}✓ Integration Tests: PASSING${NC}"
    echo "  $INT_COUNT"
    INTEGRATION_PASS=1
else
    echo -e "${RED}✗ Integration Tests: FAILING${NC}"
    grep -E "Test Suites:|Tests:" /tmp/integration.log | tail -2
fi
echo

echo -e "${YELLOW}5. PERFORMANCE TESTS${NC}"
if npm run test:performance > /tmp/performance.log 2>&1; then
    PERF_COUNT=$(grep -E "passed" /tmp/performance.log | tail -1)
    echo -e "${GREEN}✓ Performance Tests: PASSING${NC}"
    echo "  $PERF_COUNT"
    PERFORMANCE_PASS=1
else
    echo -e "${RED}✗ Performance Tests: FAILING${NC}"
    tail -5 /tmp/performance.log
fi
echo

echo "============================================"
echo -e "${YELLOW}FINAL RESULTS${NC}"
echo "============================================"
TOTAL=$((BUILD_PASS + TYPECHECK_PASS + UNIT_PASS + INTEGRATION_PASS + PERFORMANCE_PASS))

echo -e "Build:             $([ $BUILD_PASS -eq 1 ] && echo "${GREEN}✓${NC}" || echo "${RED}✗${NC}")"
echo -e "TypeScript:        $([ $TYPECHECK_PASS -eq 1 ] && echo "${GREEN}✓${NC}" || echo "${RED}✗${NC}")"
echo -e "Unit Tests:        $([ $UNIT_PASS -eq 1 ] && echo "${GREEN}✓${NC}" || echo "${RED}✗${NC}")"
echo -e "Integration Tests: $([ $INTEGRATION_PASS -eq 1 ] && echo "${GREEN}✓${NC}" || echo "${RED}✗${NC}")"
echo -e "Performance Tests: $([ $PERFORMANCE_PASS -eq 1 ] && echo "${GREEN}✓${NC}" || echo "${RED}✗${NC}")"
echo
echo -e "Overall: ${TOTAL}/5 passing"

if [ $TOTAL -eq 5 ]; then
    echo -e "${GREEN}🎉 ALL CHECKS PASSING!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some checks are failing${NC}"
    exit 1
fi