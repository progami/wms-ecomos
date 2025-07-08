#!/bin/bash
# Quick fix for WMS deployment

INSTANCE_ID="i-03d738739b052fbe7"
REGION="us-east-1"

echo "=== Quick Fix for WMS Deployment ==="

# First check what's actually running
echo "1. Checking current status..."
aws ssm send-command \
  --instance-ids "$INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --region "$REGION" \
  --parameters 'commands=[
    "ps aux | grep -E \"(node|pm2)\" | grep -v grep",
    "netstat -tlnp | grep 3000 || echo \"Port 3000 not in use\"",
    "ls -la /home/wms/wms-app/.next/ | grep standalone"
  ]' \
  --output json > status.json

COMMAND_ID=$(jq -r '.Command.CommandId' status.json)
sleep 10
echo "Current status:"
aws ssm get-command-invocation --command-id "$COMMAND_ID" --instance-id "$INSTANCE_ID" --region "$REGION" --query StandardOutputContent --output text

# Kill any existing processes
echo -e "\n2. Stopping existing processes..."
aws ssm send-command \
  --instance-ids "$INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --region "$REGION" \
  --parameters 'commands=[
    "pkill -f \"node.*server.js\" || true",
    "pm2 kill || true",
    "sleep 2"
  ]' \
  --output json > stop.json

sleep 10

# Start using systemd service
echo -e "\n3. Creating systemd service..."
aws ssm send-command \
  --instance-ids "$INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --region "$REGION" \
  --parameters 'commands=[
    "cat > /etc/systemd/system/wms-app.service << '\''EOF'\''",
    "[Unit]",
    "Description=WMS Next.js Application",
    "After=network.target postgresql.service",
    "",
    "[Service]",
    "Type=simple",
    "User=wms",
    "WorkingDirectory=/home/wms/wms-app",
    "Environment=\"NODE_ENV=production\"",
    "Environment=\"PORT=3000\"",
    "Environment=\"HOSTNAME=127.0.0.1\"",
    "Environment=\"BASE_PATH=/WMS\"",
    "Environment=\"NEXT_PUBLIC_BASE_PATH=/WMS\"",
    "Environment=\"DATABASE_URL=postgresql://wms:wms_secure_password_2024@localhost:5432/wms\"",
    "Environment=\"NEXTAUTH_URL=https://targonglobal.com/WMS\"",
    "Environment=\"NEXTAUTH_URL_INTERNAL=http://127.0.0.1:3000\"",
    "Environment=\"NEXTAUTH_SECRET=production_secret_key_change_in_production_123456\"",
    "Environment=\"NEXT_PUBLIC_APP_URL=https://targonglobal.com/WMS\"",
    "ExecStart=/usr/bin/node /home/wms/wms-app/.next/standalone/server.js",
    "Restart=always",
    "RestartSec=10",
    "",
    "[Install]",
    "WantedBy=multi-user.target",
    "EOF",
    "systemctl daemon-reload",
    "systemctl enable wms-app",
    "systemctl start wms-app",
    "sleep 5",
    "systemctl status wms-app --no-pager"
  ]' \
  --output json > systemd.json

COMMAND_ID=$(jq -r '.Command.CommandId' systemd.json)
sleep 20
echo "Systemd service status:"
aws ssm get-command-invocation --command-id "$COMMAND_ID" --instance-id "$INSTANCE_ID" --region "$REGION" --query StandardOutputContent --output text | tail -20

# Test the application
echo -e "\n4. Testing application..."
aws ssm send-command \
  --instance-ids "$INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --region "$REGION" \
  --parameters 'commands=[
    "curl -I http://127.0.0.1:3000/",
    "curl -I http://127.0.0.1:3000/WMS",
    "curl -I http://127.0.0.1:3000/WMS/dashboard",
    "curl -I -H \"Host: targonglobal.com\" http://127.0.0.1/WMS"
  ]' \
  --output json > test.json

COMMAND_ID=$(jq -r '.Command.CommandId' test.json)
sleep 10
echo "Test results:"
aws ssm get-command-invocation --command-id "$COMMAND_ID" --instance-id "$INSTANCE_ID" --region "$REGION" --query StandardOutputContent --output text

echo -e "\n=== Fix Complete ==="
echo "The WMS application should now be accessible at https://targonglobal.com/WMS"
echo ""
echo "To check logs: sudo journalctl -u wms-app -f"
echo "To restart: sudo systemctl restart wms-app"