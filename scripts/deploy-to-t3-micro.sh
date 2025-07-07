#!/bin/bash
# Deploy WMS to t3.micro instance via SSM

INSTANCE_ID="$1"
if [ -z "$INSTANCE_ID" ]; then
    echo "Usage: $0 <instance-id>"
    exit 1
fi

echo "Deploying WMS to instance: $INSTANCE_ID"

# Get instance IP
INSTANCE_IP=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --query "Reservations[0].Instances[0].PublicIpAddress" \
    --output text)

echo "Instance IP: $INSTANCE_IP"

# Create deployment package
echo "Creating deployment package..."
cd "$(dirname "$0")/.."
tar -czf /tmp/wms-deploy.tar.gz \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='*.log' \
    --exclude='logs/*' \
    --exclude='test-results' \
    --exclude='coverage' \
    --exclude='.env.local' \
    --exclude='.env.production' \
    .

# Upload to S3
BUCKET_NAME="wms-deployment-$(date +%s)"
aws s3 mb "s3://$BUCKET_NAME" --region us-east-1
aws s3 cp /tmp/wms-deploy.tar.gz "s3://$BUCKET_NAME/deploy.tar.gz"

# Generate presigned URL (valid for 1 hour)
DOWNLOAD_URL=$(aws s3 presign "s3://$BUCKET_NAME/deploy.tar.gz" --expires-in 3600)

# Deploy via SSM
echo "Deploying application..."
COMMAND_ID=$(aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters "{\"commands\":[
        \"cd /home/wms\",
        \"sudo -u wms wget -q -O deploy.tar.gz '$DOWNLOAD_URL'\",
        \"sudo -u wms tar -xzf deploy.tar.gz -C /home/wms/app --strip-components=1\",
        \"cd /home/wms/app\",
        \"cat > .env << 'EOF'\",
        \"DATABASE_URL=\\\"postgresql://wms:wms_secure_password_2024@localhost:5432/wms_production\\\"\",
        \"NEXTAUTH_URL=\\\"http://$INSTANCE_IP:3000\\\"\",
        \"NEXTAUTH_SECRET=\\\"production_secret_key_change_in_production_123456\\\"\",
        \"NODE_ENV=\\\"production\\\"\",
        \"PORT=3000\",
        \"EOF\",
        \"chown wms:wms .env\",
        \"sudo -u wms npm ci\",
        \"sudo -u wms npx prisma generate\",
        \"sudo -u wms npx prisma db push --skip-generate\",
        \"sudo -u wms npm run build\",
        \"sudo -u wms pm2 delete wms-app 2>/dev/null || true\",
        \"sudo -u wms PORT=3000 pm2 start npm --name wms-app -- start\",
        \"sudo -u wms pm2 save\",
        \"sleep 5\",
        \"curl -s http://localhost:3000/api/health || echo 'Health check failed'\"
    ]}" \
    --output text \
    --query 'Command.CommandId')

echo "SSM Command ID: $COMMAND_ID"
echo "Waiting for deployment to complete..."

# Wait for completion
aws ssm wait command-executed \
    --command-id "$COMMAND_ID" \
    --instance-id "$INSTANCE_ID" || true

# Check result
STATUS=$(aws ssm get-command-invocation \
    --command-id "$COMMAND_ID" \
    --instance-id "$INSTANCE_ID" \
    --query 'Status' \
    --output text)

if [ "$STATUS" = "Success" ]; then
    echo "✅ Deployment successful!"
    echo "Application URL: http://$INSTANCE_IP:3000"
    echo "Login: admin / SecureWarehouse2024!"
else
    echo "❌ Deployment failed with status: $STATUS"
    aws ssm get-command-invocation \
        --command-id "$COMMAND_ID" \
        --instance-id "$INSTANCE_ID" \
        --query 'StandardErrorContent' \
        --output text
fi

# Cleanup S3 bucket
aws s3 rm "s3://$BUCKET_NAME/deploy.tar.gz"
aws s3 rb "s3://$BUCKET_NAME"

echo "Deployment complete!"