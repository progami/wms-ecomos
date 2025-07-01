#!/bin/bash

# Check WMS application status via SSM

INSTANCE_ID="i-0fb1f56a90fe95bac"
REGION="us-east-1"

echo "🔍 Checking WMS application status on $INSTANCE_ID"
echo ""

# Function to run command and get output
run_check() {
    local cmd="$1"
    local desc="$2"
    
    echo "📋 $desc"
    
    CMD_ID=$(aws ssm send-command \
        --instance-ids "$INSTANCE_ID" \
        --document-name "AWS-RunShellScript" \
        --parameters "commands=[\"$cmd\"]" \
        --region "$REGION" \
        --output text \
        --query 'Command.CommandId' 2>/dev/null)
    
    if [ -z "$CMD_ID" ]; then
        echo "❌ Failed to send command"
        return
    fi
    
    sleep 3
    
    # Get output without base64 issues
    OUTPUT=$(aws ssm get-command-invocation \
        --command-id "$CMD_ID" \
        --instance-id "$INSTANCE_ID" \
        --region "$REGION" \
        --query 'StandardOutputContent' \
        --output text 2>/dev/null)
    
    if [ -n "$OUTPUT" ] && [ "$OUTPUT" != "None" ]; then
        echo "$OUTPUT" | base64 -d 2>/dev/null || echo "$OUTPUT"
    else
        # Try getting status
        STATUS=$(aws ssm get-command-invocation \
            --command-id "$CMD_ID" \
            --instance-id "$INSTANCE_ID" \
            --region "$REGION" \
            --query 'Status' \
            --output text 2>/dev/null)
        echo "Status: $STATUS"
    fi
    echo ""
}

# Check various aspects
run_check "pm2 list" "PM2 Process List"
run_check "curl -s http://localhost:3000 | head -20" "Application Homepage"
run_check "curl -s http://localhost:3000/api/health" "Health Check API"
run_check "sudo netstat -tlnp | grep -E ':80|:3000'" "Port Listeners"
run_check "sudo systemctl status nginx --no-pager | head -10" "Nginx Status"
run_check "cd /var/www/wms && pwd && ls -la .env*" "Application Directory"
run_check "pm2 logs wms --lines 20 --nostream" "Recent Application Logs"

echo "✅ Status check complete!"
echo ""
echo "🌐 Application URLs:"
echo "   Direct: http://ec2-54-221-58-217.compute-1.amazonaws.com:3000"
echo "   Via Nginx: http://ec2-54-221-58-217.compute-1.amazonaws.com"