#!/bin/bash
# Fix script for WMS deployment issues

echo "=== WMS Deployment Fix Script ==="
echo "This script will fix the WMS deployment to work at /WMS path"
echo ""

# Set variables
INSTANCE_ID="i-03d738739b052fbe7"
REGION="us-east-1"

# Function to execute SSM command
execute_ssm_command() {
    local command="$1"
    local description="$2"
    
    echo ">>> $description"
    
    # Send command
    COMMAND_ID=$(aws ssm send-command \
        --instance-ids "$INSTANCE_ID" \
        --document-name "AWS-RunShellScript" \
        --parameters "commands=[\"$command\"]" \
        --region "$REGION" \
        --output json \
        --query 'Command.CommandId' \
        --output text)
    
    if [ -z "$COMMAND_ID" ]; then
        echo "Failed to send command"
        return 1
    fi
    
    echo "Command ID: $COMMAND_ID"
    
    # Wait for command to complete
    echo -n "Waiting for command to complete..."
    for i in {1..30}; do
        STATUS=$(aws ssm get-command-invocation \
            --command-id "$COMMAND_ID" \
            --instance-id "$INSTANCE_ID" \
            --region "$REGION" \
            --query 'Status' \
            --output text 2>/dev/null || echo "Pending")
        
        if [ "$STATUS" = "Success" ] || [ "$STATUS" = "Failed" ]; then
            echo " $STATUS"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    # Get output
    if [ "$STATUS" = "Success" ]; then
        aws ssm get-command-invocation \
            --command-id "$COMMAND_ID" \
            --instance-id "$INSTANCE_ID" \
            --region "$REGION" \
            --query 'StandardOutputContent' \
            --output text
    else
        echo "Command failed. Error output:"
        aws ssm get-command-invocation \
            --command-id "$COMMAND_ID" \
            --instance-id "$INSTANCE_ID" \
            --region "$REGION" \
            --query 'StandardErrorContent' \
            --output text
    fi
    echo ""
}

# Step 1: Create updated ecosystem.config.js
echo "=== Step 1: Creating updated PM2 configuration ==="

ECOSYSTEM_CONFIG='module.exports = {
  apps: [{
    name: "wms-app",
    script: "./server.js",
    instances: 1,
    exec_mode: "fork",
    watch: false,
    max_memory_restart: "1G",
    error_file: "./logs/pm2-error.log",
    out_file: "./logs/pm2-out.log",
    log_file: "./logs/pm2-combined.log",
    time: true,
    merge_logs: true,
    log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
      BASE_PATH: "/WMS",
      NEXT_PUBLIC_BASE_PATH: "/WMS",
      NEXTAUTH_URL: "https://targonglobal.com/WMS",
      NEXTAUTH_URL_INTERNAL: "http://127.0.0.1:3000",
      NEXT_PUBLIC_APP_URL: "https://targonglobal.com/WMS"
    }
  }]
};'

execute_ssm_command "cd /home/wms/wms-app && cat > ecosystem.config.js << 'EOF'
$ECOSYSTEM_CONFIG
EOF" "Creating new ecosystem.config.js"

# Step 2: Backup current deployment
echo "=== Step 2: Backing up current deployment ==="
execute_ssm_command "cd /home/wms/wms-app && cp -r .next .next.backup-$(date +%Y%m%d-%H%M%S)" "Backing up .next directory"

# Step 3: Set environment variables and rebuild
echo "=== Step 3: Rebuilding with BASE_PATH=/WMS ==="
execute_ssm_command "cd /home/wms/wms-app && export BASE_PATH=/WMS && export NEXT_PUBLIC_BASE_PATH=/WMS && export NODE_ENV=production && npm run build" "Building Next.js app with BASE_PATH"

# Step 4: Stop current PM2 process
echo "=== Step 4: Stopping current PM2 process ==="
execute_ssm_command "cd /home/wms/wms-app && pm2 stop wms-app" "Stopping PM2 app"

# Step 5: Delete and restart with new config
echo "=== Step 5: Restarting with new configuration ==="
execute_ssm_command "cd /home/wms/wms-app && pm2 delete wms-app && pm2 start ecosystem.config.js" "Starting PM2 with new config"

# Step 6: Save PM2 configuration
echo "=== Step 6: Saving PM2 configuration ==="
execute_ssm_command "pm2 save" "Saving PM2 config"

# Step 7: Verify deployment
echo "=== Step 7: Verifying deployment ==="
execute_ssm_command "sleep 5 && curl -I http://127.0.0.1:3000/ 2>&1" "Testing root path"
execute_ssm_command "curl -I http://127.0.0.1:3000/api/health 2>&1" "Testing API health"

# Step 8: Check PM2 status
echo "=== Step 8: Checking PM2 status ==="
execute_ssm_command "pm2 list && pm2 show wms-app | grep -E '(status|uptime|restarts)'" "PM2 status"

echo ""
echo "=== Deployment fix completed ==="
echo ""
echo "Next steps:"
echo "1. Test the application at https://targonglobal.com/WMS"
echo "2. Check PM2 logs if there are issues: pm2 logs wms-app"
echo "3. Monitor application performance: pm2 monit"