#!/bin/bash

# Create SSM Document for WMS deployment

REGION="us-east-1"

echo "Creating SSM Document for WMS deployment..."

# Create the SSM document
aws ssm create-document \
    --name "WMS-Deploy" \
    --document-type "Command" \
    --region "$REGION" \
    --content '{
  "schemaVersion": "2.2",
  "description": "Deploy WMS application to EC2 instance",
  "parameters": {
    "action": {
      "type": "String",
      "description": "Action to perform",
      "default": "deploy",
      "allowedValues": ["deploy", "restart", "status", "logs", "stop"]
    }
  },
  "mainSteps": [
    {
      "action": "aws:runShellScript",
      "name": "deployWMS",
      "inputs": {
        "timeoutSeconds": "600",
        "runCommand": [
          "#!/bin/bash",
          "set -e",
          "",
          "ACTION=\"{{ action }}\"",
          "",
          "case $ACTION in",
          "  deploy)",
          "    echo \"Deploying WMS application...\"",
          "    cd /var/www/wms || exit 1",
          "    git pull origin main",
          "    npm ci",
          "    npx prisma generate",
          "    NODE_ENV=production npx prisma migrate deploy || true",
          "    npm run build",
          "    pm2 restart wms || NODE_ENV=production pm2 start npm --name wms -- start",
          "    pm2 save",
          "    ;;",
          "  restart)",
          "    echo \"Restarting WMS application...\"",
          "    pm2 restart wms",
          "    ;;",
          "  status)",
          "    echo \"WMS application status:\"",
          "    pm2 status",
          "    echo \"\"",
          "    echo \"Health check:\"",
          "    curl -s http://localhost:3000/api/health | jq . || echo \"Not responding\"",
          "    ;;",
          "  logs)",
          "    echo \"WMS application logs:\"",
          "    pm2 logs wms --lines 100 --nostream",
          "    ;;",
          "  stop)",
          "    echo \"Stopping WMS application...\"",
          "    pm2 stop wms",
          "    ;;",
          "  *)",
          "    echo \"Unknown action: $ACTION\"",
          "    exit 1",
          "    ;;",
          "esac"
        ]
      }
    }
  ]
}' 2>/dev/null || echo "Document may already exist"

echo "SSM Document created/updated"
echo ""
echo "Usage examples:"
echo "- Deploy: aws ssm send-command --document-name \"WMS-Deploy\" --instance-ids \"i-0fb1f56a90fe95bac\" --parameters 'action=deploy' --region $REGION"
echo "- Status: aws ssm send-command --document-name \"WMS-Deploy\" --instance-ids \"i-0fb1f56a90fe95bac\" --parameters 'action=status' --region $REGION"
echo "- Logs: aws ssm send-command --document-name \"WMS-Deploy\" --instance-ids \"i-0fb1f56a90fe95bac\" --parameters 'action=logs' --region $REGION"