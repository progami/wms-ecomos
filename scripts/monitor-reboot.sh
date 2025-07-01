#!/bin/bash

echo "🔄 Monitoring EC2 instance reboot..."
INSTANCE_ID="i-0fb1f56a90fe95bac"
APP_URL="http://54.243.188.216:3000/WMS/auth/login"

# Wait for instance to stop and start
echo "Waiting for instance to reboot..."
sleep 30

# Check instance status
for i in {1..20}; do
    echo -n "Attempt $i: Checking instance status... "
    STATUS=$(aws ec2 describe-instance-status --instance-ids $INSTANCE_ID --region us-east-1 --query 'InstanceStatuses[0].InstanceStatus.Status' --output text 2>/dev/null || echo "not-ready")
    
    if [ "$STATUS" = "ok" ]; then
        echo "✅ Instance is ready"
        break
    else
        echo "⏳ Status: $STATUS"
        sleep 15
    fi
done

# Wait for SSM agent
echo ""
echo "Waiting for SSM agent..."
for i in {1..10}; do
    echo -n "Attempt $i: Checking SSM agent... "
    SSM_STATUS=$(aws ssm describe-instance-information --instance-information-filter-list key=InstanceIds,valueSet=$INSTANCE_ID --region us-east-1 --query 'InstanceInformationList[0].PingStatus' --output text 2>/dev/null || echo "offline")
    
    if [ "$SSM_STATUS" = "Online" ]; then
        echo "✅ SSM agent is online"
        break
    else
        echo "⏳ Status: $SSM_STATUS"
        sleep 10
    fi
done

# Check application
echo ""
echo "Checking application status..."
if [ "$SSM_STATUS" = "Online" ]; then
    CMD_ID=$(aws ssm send-command \
        --instance-ids $INSTANCE_ID \
        --document-name "AWS-RunShellScript" \
        --parameters 'commands=["pm2 status","curl -s http://localhost:3000/api/health || echo API not responding"]' \
        --region us-east-1 \
        --output text --query 'Command.CommandId')
    
    echo "Command ID: $CMD_ID"
    sleep 5
    
    aws ssm get-command-invocation \
        --command-id $CMD_ID \
        --instance-id $INSTANCE_ID \
        --region us-east-1 \
        --query 'StandardOutputContent' \
        --output text
fi

# Test web access
echo ""
echo "Testing web access..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 $APP_URL || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Application is accessible (HTTP $HTTP_STATUS)"
else
    echo "❌ Application not accessible (HTTP $HTTP_STATUS)"
fi