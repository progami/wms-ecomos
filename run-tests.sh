#!/bin/bash

echo "Running tests from project root..."

# First check if we can run a simple existing test
echo "1. Testing existing simple utils test..."
npm test -- tests/__tests__/lib/utils-simple.test.ts 2>&1 | tail -20

echo -e "\n2. Testing our new export configurations test..."
npm test -- tests/__tests__/lib/export-configurations.test.ts 2>&1 | tail -20

echo -e "\n3. Running build to check TypeScript..."
npm run build 2>&1 | tail -20