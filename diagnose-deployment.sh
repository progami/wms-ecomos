#!/bin/bash
# Diagnostic script to check WMS deployment status

echo "=== WMS Deployment Diagnostic ==="
echo "Run this script on your EC2 instance to diagnose deployment issues"
echo ""

# Function to run command via SSM
run_ssm_command() {
    local command="$1"
    local description="$2"
    
    echo "=== $description ==="
    aws ssm send-command \
        --instance-ids "i-07b6b80ad1cbbc40f" \
        --document-name "AWS-RunShellScript" \
        --parameters "commands=[\"$command\"]" \
        --output json \
        --query 'Command.CommandId' \
        --output text
}

# Get command results
get_command_output() {
    local command_id="$1"
    sleep 3  # Wait for command to complete
    
    aws ssm get-command-invocation \
        --command-id "$command_id" \
        --instance-id "i-07b6b80ad1cbbc40f" \
        --output json \
        --query '[StandardOutputContent,StandardErrorContent]' \
        --output text
}

echo "1. Checking PM2 status and environment variables..."
CMD_ID=$(run_ssm_command "cd /home/wms/wms-app && pm2 show wms-app" "PM2 Application Details")
get_command_output "$CMD_ID"

echo ""
echo "2. Checking if BASE_PATH is set in PM2..."
CMD_ID=$(run_ssm_command "cd /home/wms/wms-app && pm2 env 0 | grep -E '(BASE_PATH|NEXT_PUBLIC)'" "Environment Variables")
get_command_output "$CMD_ID"

echo ""
echo "3. Checking Next.js build output..."
CMD_ID=$(run_ssm_command "ls -la /home/wms/wms-app/.next/standalone/" "Standalone Build Check")
get_command_output "$CMD_ID"

echo ""
echo "4. Checking current ecosystem.config.js..."
CMD_ID=$(run_ssm_command "cat /home/wms/wms-app/ecosystem.config.js | head -30" "PM2 Config")
get_command_output "$CMD_ID"

echo ""
echo "5. Checking Nginx configuration..."
CMD_ID=$(run_ssm_command "nginx -T 2>&1 | grep -A 20 'location /WMS'" "Nginx WMS Config")
get_command_output "$CMD_ID"

echo ""
echo "6. Testing local application response..."
CMD_ID=$(run_ssm_command "curl -I http://127.0.0.1:3000/ 2>&1" "Local App Test")
get_command_output "$CMD_ID"

echo ""
echo "7. Testing application with /WMS path..."
CMD_ID=$(run_ssm_command "curl -I http://127.0.0.1:3000/WMS 2>&1" "WMS Path Test")
get_command_output "$CMD_ID"

echo ""
echo "8. Checking PM2 logs for errors..."
CMD_ID=$(run_ssm_command "cd /home/wms/wms-app && pm2 logs wms-app --lines 20 --nostream" "PM2 Logs")
get_command_output "$CMD_ID"

echo ""
echo "=== Quick Fix Commands ==="
echo ""
echo "To fix the deployment, run these commands on the EC2 instance:"
echo ""
echo "1. Update ecosystem.config.js with BASE_PATH:"
echo "   cd /home/wms/wms-app"
echo "   cp ecosystem.config.js ecosystem.config.js.backup"
echo ""
echo "2. Create new ecosystem.config.js with proper environment variables"
echo "3. Rebuild the application with BASE_PATH=/WMS"
echo "4. Restart PM2 with updated configuration"