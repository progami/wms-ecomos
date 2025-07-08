#!/bin/bash
# Simple fix to update WMS to work at /WMS path

INSTANCE_ID="i-03d738739b052fbe7"
REGION="us-east-1"

echo "=== Fixing WMS deployment for /WMS path ==="
echo "Instance: $INSTANCE_ID"
echo ""

# Combined command to fix the deployment
aws ssm send-command \
  --instance-ids "$INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --region "$REGION" \
  --parameters 'commands=[
    "cd /home/wms/wms-app",
    "echo \"=== Current PM2 status ===\"",
    "pm2 list",
    "echo \"=== Creating new ecosystem config ===\"",
    "cat > ecosystem.config.js << '\''EOF'\''",
    "module.exports = {",
    "  apps: [{",
    "    name: '\''wms-production'\'',",
    "    script: '\''.next/standalone/server.js'\'',",
    "    cwd: '\''/home/wms/wms-app'\'',",
    "    env: {",
    "      NODE_ENV: '\''production'\'',",
    "      PORT: 3000,",
    "      HOSTNAME: '\''127.0.0.1'\'',",
    "      BASE_PATH: '\''/WMS'\'',",
    "      NEXT_PUBLIC_BASE_PATH: '\''/WMS'\'',",
    "      DATABASE_URL: '\''postgresql://wms:wms_secure_password_2024@localhost:5432/wms'\'',",
    "      NEXTAUTH_URL: '\''https://targonglobal.com/WMS'\'',",
    "      NEXTAUTH_URL_INTERNAL: '\''http://127.0.0.1:3000'\'',",
    "      NEXTAUTH_SECRET: '\''production_secret_key_change_in_production_123456'\'',",
    "      NEXT_PUBLIC_APP_URL: '\''https://targonglobal.com/WMS'\''",
    "    }",
    "  }]",
    "};",
    "EOF",
    "echo \"=== Rebuilding application with BASE_PATH ===\"",
    "export BASE_PATH=/WMS",
    "export NEXT_PUBLIC_BASE_PATH=/WMS",
    "npm run build",
    "echo \"=== Copying static files ===\"",
    "cp -r public/* .next/standalone/public/ || true",
    "cp -r .next/static .next/standalone/.next/ || true",
    "echo \"=== Restarting PM2 ===\"",
    "pm2 stop wms-production || true",
    "pm2 delete wms-production || true",
    "pm2 start ecosystem.config.js",
    "pm2 save",
    "echo \"=== Testing application ===\"",
    "sleep 5",
    "curl -I http://127.0.0.1:3000/",
    "curl -I http://127.0.0.1:3000/api/auth/providers",
    "echo \"=== Deployment complete ===\"",
    "pm2 status"
  ]' \
  --output json > fix-command.json

COMMAND_ID=$(jq -r '.Command.CommandId' fix-command.json)
echo "Command ID: $COMMAND_ID"
echo ""
echo "Waiting for command to complete..."
echo "You can check status with:"
echo "aws ssm get-command-invocation --command-id $COMMAND_ID --instance-id $INSTANCE_ID --region $REGION"
echo ""
echo "To see the output:"
echo "aws ssm get-command-invocation --command-id $COMMAND_ID --instance-id $INSTANCE_ID --region $REGION --query StandardOutputContent --output text"