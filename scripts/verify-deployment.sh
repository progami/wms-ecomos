#!/bin/bash

# Deployment Verification Script
echo "🔍 Verifying WMS Deployment..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Instance details
INSTANCE_ID="i-0fb1f56a90fe95bac"
APP_URL="http://54.243.188.216:3000/WMS/auth/login"

# Check SSM agent
echo -n "Checking SSM agent status... "
SSM_STATUS=$(aws ssm describe-instance-information --instance-information-filter-list key=InstanceIds,valueSet=$INSTANCE_ID --region us-east-1 --query 'InstanceInformationList[0].PingStatus' --output text 2>/dev/null)
if [ "$SSM_STATUS" = "Online" ]; then
    echo -e "${GREEN}✓ Online${NC}"
else
    echo -e "${RED}✗ Offline${NC}"
    exit 1
fi

# Check application status via SSM
echo -n "Checking application status... "
CMD_ID=$(aws ssm send-command \
    --instance-ids $INSTANCE_ID \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=["pm2 status wms --json"]' \
    --region us-east-1 \
    --output text --query 'Command.CommandId' 2>/dev/null)

sleep 3

PM2_OUTPUT=$(aws ssm get-command-invocation \
    --command-id $CMD_ID \
    --instance-id $INSTANCE_ID \
    --region us-east-1 \
    --query 'StandardOutputContent' \
    --output text 2>/dev/null | grep -o '"status":"online"' | head -1)

if [[ "$PM2_OUTPUT" == *"online"* ]]; then
    echo -e "${GREEN}✓ Running${NC}"
else
    echo -e "${RED}✗ Not running${NC}"
fi

# Check if application is accessible
echo -n "Checking application accessibility... "
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $APP_URL)
if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Accessible${NC}"
else
    echo -e "${RED}✗ Not accessible (HTTP $HTTP_STATUS)${NC}"
fi

echo ""
echo "📊 Deployment Summary:"
echo "- Instance ID: $INSTANCE_ID"
echo "- Application URL: $APP_URL"
echo "- SSM Agent: $SSM_STATUS"
echo ""
echo "🔧 Useful Commands:"
echo "- View logs: aws ssm send-command --instance-ids $INSTANCE_ID --document-name \"AWS-RunShellScript\" --parameters 'commands=[\"pm2 logs wms --lines 50\"]' --region us-east-1"
echo "- Restart app: aws ssm send-command --instance-ids $INSTANCE_ID --document-name \"AWS-RunShellScript\" --parameters 'commands=[\"pm2 restart wms\"]' --region us-east-1"
echo "- Deploy latest: cd /Users/jarraramjad/Documents/ecom_os/WMS && ./scripts/ssm-deploy-final.sh"