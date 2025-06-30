#!/bin/bash

# Script to run custom React hook tests

echo "Running custom React hook tests..."
echo "================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Change to tests directory
cd "$(dirname "$0")/../.." || exit 1

# Run hook tests with coverage
echo -e "\n${GREEN}Running hook tests with coverage...${NC}"
npm run jest -- unit/hooks/ --coverage --coverageDirectory=./coverage/hooks

# Check test results
if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ All hook tests passed!${NC}"
    
    # Display coverage summary
    echo -e "\n${GREEN}Coverage Summary:${NC}"
    if [ -f "./coverage/hooks/coverage-summary.json" ]; then
        node -e "
        const coverage = require('./coverage/hooks/coverage-summary.json');
        const total = coverage.total;
        console.log('Statements:', total.statements.pct + '%');
        console.log('Branches:', total.branches.pct + '%');
        console.log('Functions:', total.functions.pct + '%');
        console.log('Lines:', total.lines.pct + '%');
        "
    fi
else
    echo -e "\n${RED}❌ Some hook tests failed!${NC}"
    exit 1
fi

echo -e "\n================================"
echo "Hook test run complete!"