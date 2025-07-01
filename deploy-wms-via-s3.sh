#!/bin/bash

# Configuration
INSTANCE_ID="i-065d0aa80cdcd55b1"
REGION="us-east-1"
S3_BUCKET="wms-deployment-temp-$(date +%s)"
S3_KEY="wms-src.tar.gz"
LOCAL_FILE="/tmp/wms-src.tar.gz.b64"

echo "Starting WMS deployment to EC2 instance $INSTANCE_ID"

# Step 1: Create temporary S3 bucket
echo "Creating temporary S3 bucket: $S3_BUCKET"
aws s3 mb "s3://$S3_BUCKET" --region "$REGION"

# Step 2: Decode base64 file locally and upload to S3
echo "Decoding base64 file..."
base64 -d "$LOCAL_FILE" > /tmp/wms-src.tar.gz

echo "Uploading to S3..."
aws s3 cp /tmp/wms-src.tar.gz "s3://$S3_BUCKET/$S3_KEY" --region "$REGION"

# Step 3: Deploy on EC2 instance
echo "Executing deployment on EC2 instance..."

COMMAND_ID=$(aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --region "$REGION" \
    --parameters "commands=[
        \"#!/bin/bash\",
        \"set -e\",
        \"echo 'Starting WMS deployment...'\",
        \"\",
        \"# Download from S3\",
        \"echo 'Downloading application archive from S3...'\",
        \"aws s3 cp s3://$S3_BUCKET/$S3_KEY /tmp/wms-src.tar.gz --region $REGION\",
        \"\",
        \"# Extract application\",
        \"echo 'Extracting application files...'\",
        \"sudo rm -rf /var/www/wms/*\",
        \"sudo tar -xzf /tmp/wms-src.tar.gz -C /var/www/wms\",
        \"sudo chown -R ubuntu:ubuntu /var/www/wms\",
        \"\",
        \"# Setup environment\",
        \"echo 'Setting up environment variables...'\",
        \"cd /var/www/wms\",
        \"cat > .env << 'EOF'\",
        \"NODE_ENV=production\",
        \"PORT=3000\",
        \"DATABASE_URL=postgresql://wms_user:wms_password@localhost:5432/wms_db\",
        \"JWT_SECRET=your-secret-key-here-change-in-production\",
        \"SESSION_SECRET=your-session-secret-here-change-in-production\",
        \"CORS_ORIGIN=http://3.87.244.116:3000\",
        \"EOF\",
        \"\",
        \"# Install dependencies\",
        \"echo 'Installing dependencies...'\",
        \"npm install --production=false\",
        \"\",
        \"# Build application\",
        \"echo 'Building application...'\",
        \"npm run build\",
        \"\",
        \"# Run migrations\",
        \"echo 'Running database migrations...'\",
        \"npx knex migrate:latest --env production\",
        \"\",
        \"# Setup PM2\",
        \"echo 'Setting up PM2...'\",
        \"pm2 delete all || true\",
        \"pm2 start npm --name wms -- start\",
        \"pm2 save\",
        \"sudo env PATH=\$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu\",
        \"\",
        \"# Verify deployment\",
        \"echo 'Verifying deployment...'\",
        \"pm2 status\",
        \"sleep 5\",
        \"curl -I http://localhost:3000 || echo 'Application may still be starting...'\",
        \"\",
        \"# Cleanup\",
        \"rm -f /tmp/wms-src.tar.gz\",
        \"echo 'Deployment completed successfully!'\",
        \"\"
    ]" \
    --output text \
    --query "Command.CommandId")

echo "Command ID: $COMMAND_ID"
echo "Waiting for deployment to complete..."

# Wait for command to complete (with timeout)
aws ssm wait command-executed \
    --command-id "$COMMAND_ID" \
    --instance-id "$INSTANCE_ID" \
    --region "$REGION" 2>/dev/null || true

# Get command status
STATUS=$(aws ssm get-command-invocation \
    --command-id "$COMMAND_ID" \
    --instance-id "$INSTANCE_ID" \
    --region "$REGION" \
    --query "Status" \
    --output text)

echo "Deployment status: $STATUS"

# Get command output
echo ""
echo "=== Deployment Output ==="
aws ssm get-command-invocation \
    --command-id "$COMMAND_ID" \
    --instance-id "$INSTANCE_ID" \
    --region "$REGION" \
    --query "StandardOutputContent" \
    --output text

if [ "$STATUS" != "Success" ]; then
    echo ""
    echo "=== Error Output ==="
    aws ssm get-command-invocation \
        --command-id "$COMMAND_ID" \
        --instance-id "$INSTANCE_ID" \
        --region "$REGION" \
        --query "StandardErrorContent" \
        --output text
fi

# Cleanup S3
echo ""
echo "Cleaning up S3 bucket..."
aws s3 rm "s3://$S3_BUCKET/$S3_KEY" --region "$REGION"
aws s3 rb "s3://$S3_BUCKET" --region "$REGION"

# Cleanup local files
rm -f /tmp/wms-src.tar.gz

echo ""
echo "Deployment process completed!"
echo "Application should be accessible at: http://3.87.244.116:3000"
echo ""
echo "To check application logs:"
echo "aws ssm send-command --instance-ids $INSTANCE_ID --document-name \"AWS-RunShellScript\" --parameters 'commands=[\"pm2 logs wms --lines 50\"]' --region $REGION"
echo ""
echo "To check application status:"
echo "aws ssm send-command --instance-ids $INSTANCE_ID --document-name \"AWS-RunShellScript\" --parameters 'commands=[\"pm2 status\"]' --region $REGION"