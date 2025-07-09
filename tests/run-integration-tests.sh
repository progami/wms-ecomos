#!/bin/bash

set -e

echo "=== Running WMS Integration Tests ==="

# Start test server
echo "Starting test server..."
./tests/start-test-server.sh

if [ $? -ne 0 ]; then
    echo "Failed to start test server"
    exit 1
fi

# Run integration tests
echo ""
echo "Running integration tests..."
cd tests
npm test -- --config=jest.config.integration.js --forceExit

TEST_RESULT=$?

# Stop test server
echo ""
echo "Stopping test server..."
cd ..
./tests/stop-test-server.sh

# Exit with test result
exit $TEST_RESULT