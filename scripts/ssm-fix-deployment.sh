#!/bin/bash

# Fix WMS deployment issues

INSTANCE_ID="i-0fb1f56a90fe95bac"
REGION="us-east-1"

echo "🔧 Fixing WMS deployment on $INSTANCE_ID"

# Send fix commands
COMMAND_ID=$(aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --region "$REGION" \
    --timeout-seconds 600 \
    --parameters '{
        "commands": [
            "#!/bin/bash",
            "set -x",
            "",
            "echo \"=== Fixing WMS Deployment ===\"",
            "",
            "# Navigate to app directory",
            "cd /var/www/wms",
            "",
            "# Fix ownership",
            "sudo chown -R ubuntu:ubuntu /var/www/wms",
            "",
            "# Check if node_modules exists",
            "if [ ! -d \"node_modules\" ]; then",
            "    echo \"Installing dependencies...\"",
            "    npm ci",
            "fi",
            "",
            "# Check if .next exists",
            "if [ ! -d \".next\" ]; then",
            "    echo \"Building application...\"",
            "    npm run build",
            "fi",
            "",
            "# Fix environment file permissions",
            "sudo chown ubuntu:ubuntu .env.production",
            "",
            "# Ensure PM2 is installed",
            "which pm2 || sudo npm install -g pm2",
            "",
            "# Kill any existing node processes",
            "sudo pkill -f \"node\" || true",
            "",
            "# Start application",
            "pm2 delete all || true",
            "NODE_ENV=production pm2 start npm --name wms -- start",
            "pm2 save",
            "pm2 startup systemd -u ubuntu --hp /home/ubuntu | grep sudo | bash",
            "",
            "# Wait for app to start",
            "sleep 10",
            "",
            "# Check status",
            "pm2 status",
            "echo \"---\"",
            "curl -s http://localhost:3000/api/health || echo \"App still starting...\"",
            "echo \"---\"",
            "pm2 logs wms --lines 30 --nostream",
            "",
            "echo \"=== Fix Complete ===\""
        ],
        "workingDirectory": ["/var/www/wms"],
        "executionTimeout": ["600"]
    }' \
    --output text \
    --query 'Command.CommandId')

echo "Command ID: $COMMAND_ID"
echo "⏳ Waiting for fix to complete..."

# Wait for completion
attempts=0
while [ $attempts -lt 40 ]; do
    sleep 10
    
    STATUS=$(aws ssm get-command-invocation \
        --command-id "$COMMAND_ID" \
        --instance-id "$INSTANCE_ID" \
        --region "$REGION" \
        --query 'Status' \
        --output text 2>/dev/null || echo "InProgress")
    
    if [ "$STATUS" != "InProgress" ]; then
        break
    fi
    
    attempts=$((attempts + 1))
    echo -n "."
done

echo ""
echo "Status: $STATUS"

# Get output
if [ "$STATUS" = "Success" ]; then
    echo "✅ Fix completed!"
    echo ""
    echo "📋 Output (last 50 lines):"
    aws ssm get-command-invocation \
        --command-id "$COMMAND_ID" \
        --instance-id "$INSTANCE_ID" \
        --region "$REGION" \
        --query 'StandardOutputContent' \
        --output text 2>/dev/null | base64 -d 2>/dev/null | tail -50 || echo "Could not decode output"
else
    echo "❌ Fix failed!"
fi

echo ""
echo "Testing application..."
sleep 5

# Test the application
echo ""
echo "🌐 Testing URLs:"
echo -n "Port 3000: "
curl -s -o /dev/null -w "%{http_code}" http://ec2-54-221-58-217.compute-1.amazonaws.com:3000 || echo "Failed"
echo ""
echo -n "Port 80: "
curl -s -o /dev/null -w "%{http_code}" http://ec2-54-221-58-217.compute-1.amazonaws.com || echo "Failed"
echo ""