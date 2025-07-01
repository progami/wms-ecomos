#!/bin/bash

# Configuration
INSTANCE_ID="i-065d0aa80cdcd55b1"
REGION="us-east-1"
LOCAL_FILE="/tmp/wms-src.tar.gz.b64"

echo "WMS Deployment to EC2 Instance: $INSTANCE_ID"
echo "================================================"

# Step 1: Create S3 bucket with unique name
BUCKET_NAME="wms-deploy-$(date +%s)"
echo "Creating S3 bucket: $BUCKET_NAME"
aws s3 mb "s3://$BUCKET_NAME" --region "$REGION"

# Step 2: Decode and upload file
echo "Decoding base64 file..."
base64 -D -i "$LOCAL_FILE" -o /tmp/wms-src.tar.gz

echo "Uploading to S3..."
aws s3 cp /tmp/wms-src.tar.gz "s3://$BUCKET_NAME/wms-src.tar.gz" --region "$REGION"

# Step 3: Create pre-signed URL (valid for 1 hour)
echo "Creating pre-signed URL..."
PRESIGNED_URL=$(aws s3 presign "s3://$BUCKET_NAME/wms-src.tar.gz" --expires-in 3600 --region "$REGION")

# Step 4: Deploy using the pre-signed URL
echo "Deploying application..."
DEPLOY_CMD=$(aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --region "$REGION" \
    --parameters "commands=[
        \"#!/bin/bash\",
        \"set -e\",
        \"echo 'Starting WMS deployment...'\",
        \"\",
        \"# Stop existing application\",
        \"pm2 delete all || true\",
        \"\",
        \"# Download application\",
        \"echo 'Downloading application archive...'\",
        \"cd /tmp\",
        \"wget -O wms-src.tar.gz '$PRESIGNED_URL'\",
        \"\",
        \"# Extract application\",
        \"echo 'Extracting application...'\",
        \"sudo rm -rf /var/www/wms/*\",
        \"sudo tar -xzf wms-src.tar.gz -C /var/www/wms\",
        \"sudo chown -R ubuntu:ubuntu /var/www/wms\",
        \"\",
        \"# Setup environment\",
        \"echo 'Setting up environment variables...'\",
        \"cd /var/www/wms\",
        \"cat > .env << 'EOF'\",
        \"NODE_ENV=production\",
        \"PORT=3000\",
        \"DATABASE_URL=postgresql://wms_user:wms_password@localhost:5432/wms_db\",
        \"JWT_SECRET=\$(openssl rand -base64 32)\",
        \"SESSION_SECRET=\$(openssl rand -base64 32)\",
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
        \"# Start application\",
        \"echo 'Starting application with PM2...'\",
        \"pm2 start npm --name wms -- start\",
        \"pm2 save\",
        \"sudo env PATH=\\\$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu\",
        \"\",
        \"# Verify deployment\",
        \"echo 'Verifying deployment...'\",
        \"pm2 status\",
        \"sleep 5\",
        \"curl -I http://localhost:3000\",
        \"\",
        \"# Cleanup\",
        \"rm -f /tmp/wms-src.tar.gz\",
        \"echo 'Deployment completed successfully!'\",
        \"\"
    ]" \
    --output text \
    --query "Command.CommandId")

echo "Deployment command ID: $DEPLOY_CMD"
echo "Monitoring deployment..."

# Wait and monitor
sleep 20
MAX_WAIT=300  # 5 minutes
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
    STATUS=$(aws ssm get-command-invocation \
        --command-id "$DEPLOY_CMD" \
        --instance-id "$INSTANCE_ID" \
        --region "$REGION" \
        --query "Status" \
        --output text 2>/dev/null || echo "Pending")
    
    if [ "$STATUS" = "Success" ] || [ "$STATUS" = "Failed" ]; then
        break
    fi
    
    echo "Status: $STATUS (${ELAPSED}s elapsed)"
    sleep 10
    ELAPSED=$((ELAPSED + 10))
done

# Show results
echo ""
echo "Deployment Status: $STATUS"
echo ""
echo "=== Output ==="
aws ssm get-command-invocation \
    --command-id "$DEPLOY_CMD" \
    --instance-id "$INSTANCE_ID" \
    --region "$REGION" \
    --query "StandardOutputContent" \
    --output text

if [ "$STATUS" = "Failed" ]; then
    echo ""
    echo "=== Errors ==="
    aws ssm get-command-invocation \
        --command-id "$DEPLOY_CMD" \
        --instance-id "$INSTANCE_ID" \
        --region "$REGION" \
        --query "StandardErrorContent" \
        --output text
fi

# Cleanup S3
echo ""
echo "Cleaning up S3 bucket..."
aws s3 rm "s3://$BUCKET_NAME/wms-src.tar.gz" --region "$REGION"
aws s3 rb "s3://$BUCKET_NAME" --region "$REGION"
rm -f /tmp/wms-src.tar.gz

echo ""
echo "Deployment complete!"
echo "Application URL: http://3.87.244.116:3000"
echo ""
echo "Quick commands:"
echo "- Logs: aws ssm send-command --instance-ids $INSTANCE_ID --document-name 'AWS-RunShellScript' --parameters 'commands=[\"pm2 logs wms --lines 100\"]' --region $REGION"
echo "- Status: aws ssm send-command --instance-ids $INSTANCE_ID --document-name 'AWS-RunShellScript' --parameters 'commands=[\"pm2 status\"]' --region $REGION"