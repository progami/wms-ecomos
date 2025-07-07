#!/bin/bash
# Quick deployment script for WMS

INSTANCE_ID="$1"
if [ -z "$INSTANCE_ID" ]; then
    echo "Usage: $0 <instance-id>"
    exit 1
fi

echo "Quick deployment to instance: $INSTANCE_ID"

# Get instance IP
INSTANCE_IP=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --query "Reservations[0].Instances[0].PublicIpAddress" \
    --output text)

echo "Instance IP: $INSTANCE_IP"

# Run deployment commands
echo "Running deployment..."
COMMAND_ID=$(aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters "{\"commands\":[
        \"# Kill any existing processes\",
        \"sudo pkill -f node || true\",
        \"sudo pkill -f npm || true\",
        \"# Setup application\",
        \"cd /home/wms\",
        \"sudo -u wms rm -rf app\",
        \"sudo -u wms mkdir -p app\",
        \"sudo -u wms tar -xzf deploy.tar.gz -C app\",
        \"cd app\",
        \"# Create .env file\",
        \"cat > .env << 'EOF'\",
        \"DATABASE_URL=\\\"postgresql://wms:wms_secure_password_2024@localhost:5432/wms_production\\\"\",
        \"NEXTAUTH_URL=\\\"http://$INSTANCE_IP:3000\\\"\",
        \"NEXTAUTH_SECRET=\\\"production_secret_key_change_in_production_123456\\\"\",
        \"NODE_ENV=\\\"production\\\"\",
        \"PORT=3000\",
        \"EOF\",
        \"sudo chown wms:wms .env\",
        \"# Install only production dependencies\",
        \"sudo -u wms npm install --production --no-audit --no-fund\",
        \"# Generate Prisma client\",
        \"sudo -u wms npx prisma generate\",
        \"# Push database schema\",
        \"sudo -u wms npx prisma db push --skip-generate\",
        \"# Build the application\",
        \"sudo -u wms npm run build\",
        \"# Start with PM2\",
        \"sudo -u wms pm2 delete all 2>/dev/null || true\",
        \"sudo -u wms PORT=3000 pm2 start npm --name wms-app -- start\",
        \"sudo -u wms pm2 save\",
        \"# Test\",
        \"sleep 10\",
        \"curl -s http://localhost:3000 | head -20 || echo 'App not ready yet'\"
    ]}" \
    --timeout-seconds 600 \
    --output text \
    --query 'Command.CommandId')

echo "Command ID: $COMMAND_ID"
echo "Monitoring deployment..."

# Monitor progress
for i in {1..20}; do
    sleep 30
    STATUS=$(aws ssm get-command-invocation \
        --command-id "$COMMAND_ID" \
        --instance-id "$INSTANCE_ID" \
        --query 'Status' \
        --output text 2>/dev/null || echo "Pending")
    
    echo "Status: $STATUS"
    
    if [ "$STATUS" = "Success" ]; then
        echo "Deployment successful!"
        echo "Testing application..."
        curl -I "http://$INSTANCE_IP:3000" || echo "App may still be starting..."
        echo ""
        echo "Application URL: http://$INSTANCE_IP:3000"
        echo "Default login: admin / SecureWarehouse2024!"
        exit 0
    elif [ "$STATUS" = "Failed" ] || [ "$STATUS" = "Cancelled" ]; then
        echo "Deployment failed!"
        aws ssm get-command-invocation \
            --command-id "$COMMAND_ID" \
            --instance-id "$INSTANCE_ID" \
            --query 'StandardErrorContent' \
            --output text
        exit 1
    fi
done

echo "Deployment timed out. Check manually."
echo "Application URL: http://$INSTANCE_IP:3000"