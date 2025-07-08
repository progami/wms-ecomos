#!/bin/bash

# Verify SSL deployment and path-based routing

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

INSTANCE_ID="i-054bbceac0f683712"
DOMAIN="targonglobal.com"

echo -e "${GREEN}Verifying SSL deployment for $DOMAIN...${NC}"

# Function to run SSM command
run_ssm_command() {
    local command="$1"
    local description="$2"
    
    echo -e "${YELLOW}$description...${NC}"
    
    aws ssm send-command \
        --instance-ids "$INSTANCE_ID" \
        --document-name "AWS-RunShellScript" \
        --parameters "commands=[\"$command\"]" \
        --output text \
        --query "Command.CommandId" | \
    xargs -I {} aws ssm get-command-invocation \
        --command-id {} \
        --instance-id "$INSTANCE_ID" \
        --query "StandardOutputContent" \
        --output text
}

# Check SSL certificate
echo -e "${YELLOW}Checking SSL certificate status...${NC}"
run_ssm_command "sudo certbot certificates" "SSL Certificate Status"

# Check nginx configuration
echo -e "${YELLOW}Checking Nginx configuration...${NC}"
run_ssm_command "sudo nginx -t" "Nginx Configuration Test"

# Check if app is running on correct port
echo -e "${YELLOW}Checking application status...${NC}"
run_ssm_command "sudo -u wms pm2 list" "PM2 Process Status"

# Check if port 3001 is listening
echo -e "${YELLOW}Checking port 3001...${NC}"
run_ssm_command "sudo netstat -tlnp | grep 3001" "Port 3001 Status"

# Test internal health endpoint
echo -e "${YELLOW}Testing internal health endpoint...${NC}"
run_ssm_command "curl -s http://localhost:3001/WMS/api/health | jq ." "Health Check"

# Check nginx access logs
echo -e "${YELLOW}Recent Nginx access logs...${NC}"
run_ssm_command "sudo tail -n 10 /var/log/nginx/wms_access.log" "Nginx Access Logs"

echo -e "${GREEN}Verification complete!${NC}"
echo -e "${GREEN}You can now test the application at:${NC}"
echo -e "${GREEN}  https://$DOMAIN/WMS - WMS Application (should show login page)${NC}"
echo -e "${YELLOW}  https://$DOMAIN/ - Root path (should return 404)${NC}"