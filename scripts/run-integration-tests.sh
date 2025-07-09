#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🚀 Starting integration test environment..."

# Set environment variables
export USE_TEST_AUTH=true
export NODE_ENV=test
export TEST_SERVER_URL=http://localhost:3001

# Kill any existing server on port 3001
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Start the test server in the background
echo "📦 Starting test server on port 3001..."
PORT=3001 node scripts/test-server.js &
SERVER_PID=$!

# Wait for server to be ready
echo "⏳ Waiting for server to be ready..."
sleep 5

# Check if server is running
if ! curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
  echo -e "${RED}❌ Test server failed to start${NC}"
  kill $SERVER_PID 2>/dev/null || true
  exit 1
fi

echo -e "${GREEN}✅ Test server is ready${NC}"

# Run integration tests
echo "🧪 Running integration tests..."
npm run test:integration

# Capture test exit code
TEST_EXIT_CODE=$?

# Kill the test server
echo "🛑 Shutting down test server..."
kill $SERVER_PID 2>/dev/null || true

# Exit with test exit code
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ All integration tests passed!${NC}"
else
  echo -e "${RED}❌ Some integration tests failed${NC}"
fi

exit $TEST_EXIT_CODE