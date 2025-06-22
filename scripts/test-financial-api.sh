#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3002"
SESSION_FILE="/tmp/wms_session"
LOG_FILE="/Users/jarraramjad/Documents/ecom_os/WMS/logs/dev.log"
REPORT_FILE="financial-api-test-report.md"

# Function to tail logs and capture new entries
tail_logs() {
    tail -n 0 -f "$LOG_FILE" > /tmp/log_capture &
    TAIL_PID=$!
    sleep 0.5
}

# Function to stop tailing and get captured logs
get_captured_logs() {
    sleep 1
    kill $TAIL_PID 2>/dev/null
    cat /tmp/log_capture
    rm -f /tmp/log_capture
}

# Function to analyze logs
analyze_logs() {
    local logs="$1"
    local errors=$(echo "$logs" | grep -E '\[ERROR\]|\[31m\[1m⨯' | wc -l)
    local warnings=$(echo "$logs" | grep -E '\[WARN\]|\[33m\[1m⚠' | wc -l)
    local db_queries=$(echo "$logs" | grep -E '\[database\]|prisma:query' | wc -l)
    local slow_queries=$(echo "$logs" | grep -E '"duration":[0-9]{3,}' | wc -l)
    
    echo "Errors: $errors, Warnings: $warnings, DB Queries: $db_queries, Slow Queries: $slow_queries"
}

echo -e "${BLUE}=== Financial Workflows API Test ===${NC}\n"

# 1. Login
echo -e "${YELLOW}1. Logging in...${NC}"
tail_logs

# Get CSRF token
CSRF_TOKEN=$(curl -s "${BASE_URL}/api/auth/csrf" | jq -r '.csrfToken')

# Login
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/callback/credentials" \
  -H "Content-Type: application/json" \
  -c "$SESSION_FILE" \
  -d "{\"username\":\"admin\",\"password\":\"admin123\",\"csrfToken\":\"$CSRF_TOKEN\"}")

LOGIN_LOGS=$(get_captured_logs)
echo -e "Login logs analysis: $(analyze_logs "$LOGIN_LOGS")"

# Check if login was successful
SESSION_CHECK=$(curl -s "${BASE_URL}/api/auth/session" -b "$SESSION_FILE")
if [[ $(echo "$SESSION_CHECK" | jq -r '.user') != "null" ]]; then
    echo -e "${GREEN}✓ Login successful${NC}"
else
    echo -e "${RED}✗ Login failed${NC}"
    exit 1
fi

# Initialize report
cat > "$REPORT_FILE" << EOF
# Financial Workflows API Test Report
Generated: $(date)

## Test Results

| Endpoint | Status | Response Time | DB Queries | Errors | Warnings |
|----------|--------|---------------|------------|---------|----------|
EOF

# Function to test endpoint
test_endpoint() {
    local name="$1"
    local endpoint="$2"
    local method="${3:-GET}"
    local data="$4"
    
    echo -e "\n${YELLOW}Testing: $name${NC}"
    echo "Endpoint: $endpoint"
    
    tail_logs
    
    START_TIME=$(date +%s%3N)
    
    if [[ "$method" == "GET" ]]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}${endpoint}" -b "$SESSION_FILE")
    else
        RESPONSE=$(curl -s -w "\n%{http_code}" -X "$method" "${BASE_URL}${endpoint}" \
            -H "Content-Type: application/json" \
            -b "$SESSION_FILE" \
            -d "$data")
    fi
    
    END_TIME=$(date +%s%3N)
    RESPONSE_TIME=$((END_TIME - START_TIME))
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    LOGS=$(get_captured_logs)
    ANALYSIS=$(analyze_logs "$LOGS")
    
    if [[ "$HTTP_CODE" == "200" ]]; then
        echo -e "${GREEN}✓ Status: $HTTP_CODE${NC}"
        STATUS="✅"
    else
        echo -e "${RED}✗ Status: $HTTP_CODE${NC}"
        STATUS="❌"
    fi
    
    echo "Response time: ${RESPONSE_TIME}ms"
    echo "Log analysis: $ANALYSIS"
    
    # Check for specific issues
    if echo "$LOGS" | grep -q "NaN\|undefined"; then
        echo -e "${RED}⚠️  Found calculation issues (NaN/undefined)${NC}"
    fi
    
    if echo "$BODY" | jq . 2>/dev/null | grep -q "error"; then
        echo -e "${RED}⚠️  Response contains error${NC}"
    fi
    
    # Add to report
    echo "| $name | $STATUS $HTTP_CODE | ${RESPONSE_TIME}ms | $ANALYSIS |" >> "$REPORT_FILE"
}

# Test endpoints
echo -e "\n${BLUE}=== Testing Financial Endpoints ===${NC}"

# Dashboard stats
test_endpoint "Dashboard Stats" "/api/dashboard/stats"

# Finance dashboard
test_endpoint "Finance Dashboard" "/api/finance/dashboard"

# Invoices
test_endpoint "Invoice List" "/api/finance/invoices"
test_endpoint "Invoice Templates" "/api/finance/invoices/templates"

# Cost rates
test_endpoint "Cost Rates" "/api/finance/cost-rates"

# Storage ledger
test_endpoint "Storage Ledger" "/api/finance/storage-ledger"

# Cost ledger  
test_endpoint "Cost Ledger" "/api/finance/cost-ledger"

# Reconciliation
test_endpoint "Reconciliation Data" "/api/finance/reconciliation"

# Reports
test_endpoint "Financial Reports" "/api/finance/reports"

# Test invoice creation (POST)
echo -e "\n${BLUE}=== Testing Invoice Creation ===${NC}"
INVOICE_DATA='{
  "customerId": "test-customer",
  "items": [{
    "description": "Storage fees",
    "quantity": 1,
    "unitPrice": 100.00
  }],
  "dueDate": "2025-07-22"
}'
test_endpoint "Create Invoice" "/api/finance/invoices" "POST" "$INVOICE_DATA"

# Add summary to report
cat >> "$REPORT_FILE" << EOF

## Summary

### Configuration Status
- Check if cost rates are properly configured
- Verify invoice templates are available
- Ensure warehouse configurations exist

### Common Issues Found
- Look for any NaN or undefined values in calculations
- Check for missing foreign key relationships
- Verify proper date range handling

### Performance Notes
- Queries over 100ms should be optimized
- Consider adding database indexes for frequently queried fields

### Log File
Full logs available at: $LOG_FILE
EOF

echo -e "\n${BLUE}=== Test Complete ===${NC}"
echo -e "Report saved to: ${GREEN}$REPORT_FILE${NC}"

# Cleanup
rm -f "$SESSION_FILE"