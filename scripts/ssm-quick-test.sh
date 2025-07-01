#!/bin/bash

# Quick test to verify WMS deployment

INSTANCE_ID="i-0fb1f56a90fe95bac"
REGION="us-east-1"

echo "🔍 Quick WMS deployment test"
echo ""

# Single command to check everything
COMMAND_ID=$(aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --region "$REGION" \
    --parameters '{
        "commands": [
            "echo \"=== System Info ===\"",
            "date",
            "hostname",
            "echo \"\"",
            "echo \"=== Node Version ===\"",
            "node --version || echo \"Node not installed\"",
            "echo \"\"",
            "echo \"=== PM2 Processes ===\"",
            "pm2 list || echo \"PM2 not running\"",
            "echo \"\"",
            "echo \"=== Port Listeners ===\"",
            "sudo netstat -tlnp | grep -E \":80|:3000\" || echo \"No listeners\"",
            "echo \"\"",
            "echo \"=== Application Directory ===\"",
            "ls -la /var/www/wms/ | head -10 || echo \"Directory not found\"",
            "echo \"\"",
            "echo \"=== Test Local Connection ===\"",
            "curl -s -o /dev/null -w \"Port 3000: HTTP %{http_code}\\n\" http://localhost:3000 || echo \"Port 3000: Failed\"",
            "curl -s -o /dev/null -w \"Port 80: HTTP %{http_code}\\n\" http://localhost || echo \"Port 80: Failed\"",
            "echo \"\"",
            "echo \"=== Last PM2 Logs ===\"",
            "pm2 logs wms --lines 10 --nostream 2>&1 | tail -20 || echo \"No logs\""
        ]
    }' \
    --output text \
    --query 'Command.CommandId')

echo "Command ID: $COMMAND_ID"
echo "Waiting for results..."

# Wait a bit
sleep 10

# Get results
STATUS=$(aws ssm get-command-invocation \
    --command-id "$COMMAND_ID" \
    --instance-id "$INSTANCE_ID" \
    --region "$REGION" \
    --query 'Status' \
    --output text)

echo "Status: $STATUS"
echo ""

if [ "$STATUS" = "Success" ]; then
    echo "📋 Test Results:"
    aws ssm get-command-invocation \
        --command-id "$COMMAND_ID" \
        --instance-id "$INSTANCE_ID" \
        --region "$REGION" \
        --query 'StandardOutputContent' \
        --output text | base64 -d 2>/dev/null || echo "Could not decode output"
else
    echo "❌ Test failed"
    aws ssm get-command-invocation \
        --command-id "$COMMAND_ID" \
        --instance-id "$INSTANCE_ID" \
        --region "$REGION" \
        --query 'StandardErrorContent' \
        --output text | base64 -d 2>/dev/null || echo "No error output"
fi

echo ""
echo "🌐 External connectivity test:"
echo -n "Direct (port 3000): "
curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://ec2-54-221-58-217.compute-1.amazonaws.com:3000 || echo "Failed"
echo ""
echo -n "Via nginx (port 80): "
curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://ec2-54-221-58-217.compute-1.amazonaws.com || echo "Failed"
echo ""