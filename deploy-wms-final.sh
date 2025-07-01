#!/bin/bash

# Configuration
INSTANCE_ID="i-065d0aa80cdcd55b1"
REGION="us-east-1"
LOCAL_FILE="/tmp/wms-src.tar.gz.b64"

echo "Starting WMS deployment to EC2 instance $INSTANCE_ID"

# First, decode the base64 file locally
echo "Decoding base64 file locally..."
base64 -D -i "$LOCAL_FILE" -o /tmp/wms-src.tar.gz

# Check file size
FILE_SIZE=$(stat -f%z /tmp/wms-src.tar.gz 2>/dev/null || stat -c%s /tmp/wms-src.tar.gz 2>/dev/null)
echo "Archive size: $((FILE_SIZE / 1024 / 1024)) MB"

# Convert back to base64 for safe transfer
echo "Preparing file for transfer..."
base64 -i /tmp/wms-src.tar.gz -o /tmp/wms-transfer.b64

# Create a deployment using echo commands in chunks
echo "Creating deployment script and transferring archive..."

# Step 1: Create deployment directory and script
aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --region "$REGION" \
    --parameters 'commands=[
        "mkdir -p /tmp/wms-deploy",
        "cd /tmp/wms-deploy",
        "cat > deploy.sh << '\''SCRIPT'\''",
        "#!/bin/bash",
        "set -e",
        "echo \"WMS Deployment Script Started\"",
        "",
        "# Stop existing PM2 process",
        "echo \"Stopping existing application...\"",
        "pm2 delete all || true",
        "",
        "# Wait for base64 file",
        "echo \"Waiting for application archive...\"",
        "while [ ! -f /tmp/wms-deploy/wms.b64 ]; do sleep 1; done",
        "",
        "# Decode and extract",
        "echo \"Decoding archive...\"",
        "base64 -d /tmp/wms-deploy/wms.b64 > /tmp/wms-deploy/wms.tar.gz",
        "",
        "echo \"Extracting to /var/www/wms...\"",
        "sudo rm -rf /var/www/wms/*",
        "sudo tar -xzf /tmp/wms-deploy/wms.tar.gz -C /var/www/wms",
        "sudo chown -R ubuntu:ubuntu /var/www/wms",
        "",
        "# Environment setup",
        "echo \"Setting up environment...\"",
        "cd /var/www/wms",
        "cat > .env << EOF",
        "NODE_ENV=production",
        "PORT=3000",
        "DATABASE_URL=postgresql://wms_user:wms_password@localhost:5432/wms_db",
        "JWT_SECRET=your-secret-key-here-change-in-production",
        "SESSION_SECRET=your-session-secret-here-change-in-production",
        "CORS_ORIGIN=http://3.87.244.116:3000",
        "EOF",
        "",
        "# Install and build",
        "echo \"Installing dependencies...\"",
        "npm install --production=false",
        "",
        "echo \"Building application...\"",
        "npm run build",
        "",
        "echo \"Running migrations...\"",
        "npx knex migrate:latest --env production",
        "",
        "# Start with PM2",
        "echo \"Starting application with PM2...\"",
        "pm2 start npm --name wms -- start",
        "pm2 save",
        "sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu",
        "",
        "# Verify",
        "echo \"Deployment complete. Verifying...\"",
        "pm2 status",
        "sleep 5",
        "curl -s -o /dev/null -w \"HTTP Status: %{http_code}\\n\" http://localhost:3000",
        "",
        "# Cleanup",
        "rm -rf /tmp/wms-deploy",
        "echo \"WMS deployment successful!\"",
        "SCRIPT",
        "chmod +x deploy.sh"
    ]' \
    --output text

sleep 5

# Step 2: Transfer the base64 file in chunks using cat with append
echo "Transferring application archive in chunks..."

# Split the base64 file into smaller chunks
split -b 100000 /tmp/wms-transfer.b64 /tmp/chunk-

CHUNK_COUNT=$(ls -1 /tmp/chunk-* | wc -l)
echo "Total chunks to transfer: $CHUNK_COUNT"

# Transfer each chunk
COUNTER=0
for chunk in /tmp/chunk-*; do
    COUNTER=$((COUNTER + 1))
    echo "Transferring chunk $COUNTER of $CHUNK_COUNT..."
    
    # Read chunk and escape for shell
    CHUNK_DATA=$(cat "$chunk" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed "s/'/\\\\'/g")
    
    # Use echo to append to file
    aws ssm send-command \
        --instance-ids "$INSTANCE_ID" \
        --document-name "AWS-RunShellScript" \
        --region "$REGION" \
        --parameters "commands=[\"echo '$CHUNK_DATA' >> /tmp/wms-deploy/wms.b64\"]" \
        --output text
    
    # Small delay between chunks
    sleep 0.5
done

echo "All chunks sent. Waiting for transfer to complete..."
sleep 10

# Step 3: Execute deployment
echo "Executing deployment script..."
DEPLOY_ID=$(aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --region "$REGION" \
    --parameters 'commands=["/tmp/wms-deploy/deploy.sh"]' \
    --output text \
    --query "Command.CommandId")

echo "Deployment command ID: $DEPLOY_ID"
echo "Monitoring deployment progress..."

# Monitor deployment
ATTEMPTS=0
MAX_ATTEMPTS=60  # 10 minutes max
while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    STATUS=$(aws ssm get-command-invocation \
        --command-id "$DEPLOY_ID" \
        --instance-id "$INSTANCE_ID" \
        --region "$REGION" \
        --query "Status" \
        --output text 2>/dev/null || echo "Pending")
    
    if [ "$STATUS" != "InProgress" ] && [ "$STATUS" != "Pending" ]; then
        break
    fi
    
    echo "Status: $STATUS (attempt $((ATTEMPTS + 1))/$MAX_ATTEMPTS)"
    sleep 10
    ATTEMPTS=$((ATTEMPTS + 1))
done

# Get final results
echo ""
echo "Final deployment status: $STATUS"
echo ""
echo "=== Deployment Output ==="
aws ssm get-command-invocation \
    --command-id "$DEPLOY_ID" \
    --instance-id "$INSTANCE_ID" \
    --region "$REGION" \
    --query "StandardOutputContent" \
    --output text

if [ "$STATUS" != "Success" ]; then
    echo ""
    echo "=== Error Output ==="
    aws ssm get-command-invocation \
        --command-id "$DEPLOY_ID" \
        --instance-id "$INSTANCE_ID" \
        --region "$REGION" \
        --query "StandardErrorContent" \
        --output text
fi

# Cleanup
rm -f /tmp/wms-src.tar.gz /tmp/wms-transfer.b64 /tmp/chunk-*

echo ""
echo "Deployment process completed!"
echo ""
echo "Application URL: http://3.87.244.116:3000"
echo ""
echo "Useful commands:"
echo "- Check logs: aws ssm send-command --instance-ids $INSTANCE_ID --document-name 'AWS-RunShellScript' --parameters 'commands=[\"pm2 logs wms --lines 50\"]' --region $REGION"
echo "- Check status: aws ssm send-command --instance-ids $INSTANCE_ID --document-name 'AWS-RunShellScript' --parameters 'commands=[\"pm2 status\"]' --region $REGION"
echo "- Restart app: aws ssm send-command --instance-ids $INSTANCE_ID --document-name 'AWS-RunShellScript' --parameters 'commands=[\"pm2 restart wms\"]' --region $REGION"