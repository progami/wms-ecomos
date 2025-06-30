#!/bin/bash

# Run React component unit tests
echo "Running React component unit tests..."

# Change to the tests/unit directory
cd "$(dirname "$0")"

# Run Jest with the unit test configuration
npx jest --config jest.config.js components/

# Check if tests passed
if [ $? -eq 0 ]; then
    echo "✅ All component tests passed!"
else
    echo "❌ Some component tests failed."
    exit 1
fi