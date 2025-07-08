#!/bin/bash

echo "WMS Application Verification"
echo "==========================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check endpoint
check_endpoint() {
    local url=$1
    local description=$2
    
    echo -e "\nChecking: $description"
    echo "URL: $url"
    
    # Get HTTP status code
    status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$status_code" -ge 200 ] && [ "$status_code" -lt 400 ]; then
        echo -e "${GREEN}✓ Status: $status_code${NC}"
        
        # Get response headers
        echo "Response headers:"
        curl -sI "$url" | head -10
    else
        echo -e "${RED}✗ Status: $status_code${NC}"
    fi
}

# Function to check process
check_process() {
    echo -e "\n${YELLOW}Process Status:${NC}"
    
    # Check if Node.js process is running on port 3000
    if lsof -i :3000 >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Application is listening on port 3000${NC}"
        echo "Process details:"
        lsof -i :3000 | grep LISTEN
    else
        echo -e "${RED}✗ No process listening on port 3000${NC}"
    fi
    
    # Check systemd service
    if systemctl is-active --quiet wms-app; then
        echo -e "${GREEN}✓ wms-app service is active${NC}"
    else
        echo -e "${RED}✗ wms-app service is not active${NC}"
    fi
    
    # Check PM2
    if su - wms -c "pm2 list" 2>/dev/null | grep -q "wms-app"; then
        echo -e "${YELLOW}! PM2 process found (should be using systemd instead)${NC}"
        su - wms -c "pm2 list"
    fi
}

# Function to check nginx
check_nginx() {
    echo -e "\n${YELLOW}Nginx Configuration:${NC}"
    
    if nginx -t 2>/dev/null; then
        echo -e "${GREEN}✓ Nginx configuration is valid${NC}"
    else
        echo -e "${RED}✗ Nginx configuration has errors${NC}"
    fi
    
    # Check if /WMS location is configured
    if grep -q "location /WMS" /etc/nginx/sites-enabled/default 2>/dev/null || \
       grep -q "location /WMS" /etc/nginx/conf.d/*.conf 2>/dev/null; then
        echo -e "${GREEN}✓ /WMS location is configured in Nginx${NC}"
    else
        echo -e "${RED}✗ /WMS location not found in Nginx config${NC}"
    fi
}

# Function to test API endpoints
test_api() {
    echo -e "\n${YELLOW}Testing API Endpoints:${NC}"
    
    # Test health check if available
    check_endpoint "http://localhost:3000/WMS/api/health" "Health check endpoint"
    
    # Test a sample API endpoint
    check_endpoint "http://localhost:3000/WMS/api/products" "Products API endpoint"
}

# Main verification
echo -e "${YELLOW}Starting verification...${NC}"

# 1. Check processes
check_process

# 2. Check Nginx
check_nginx

# 3. Check endpoints
echo -e "\n${YELLOW}Endpoint Tests:${NC}"
check_endpoint "http://localhost:3000/" "Direct Node.js root"
check_endpoint "http://localhost:3000/WMS" "Direct Node.js with BASE_PATH"
check_endpoint "http://localhost/WMS" "Through Nginx proxy"
check_endpoint "http://localhost/WMS/" "Through Nginx proxy with trailing slash"

# 4. Test API
test_api

# 5. Show recent logs
echo -e "\n${YELLOW}Recent Application Logs:${NC}"
if systemctl is-active --quiet wms-app; then
    journalctl -u wms-app -n 20 --no-pager | tail -10
else
    echo "No logs available (service not running)"
fi

echo -e "\n${YELLOW}Verification complete!${NC}"