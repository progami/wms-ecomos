#!/bin/bash

# Configuration
INSTANCE_ID="i-065d0aa80cdcd55b1"
REGION="us-east-1"
LOCAL_FILE="/tmp/wms-src.tar.gz.b64"

echo "Starting WMS deployment to EC2 instance $INSTANCE_ID"

# First, let's decode the base64 file locally
echo "Decoding base64 file locally..."
base64 -D -i "$LOCAL_FILE" -o /tmp/wms-src.tar.gz

# Check if decode was successful
if [ ! -f /tmp/wms-src.tar.gz ]; then
    echo "Failed to decode base64 file"
    exit 1
fi

echo "File decoded successfully"

# Now we'll transfer the file in chunks using SSM
echo "Preparing file for transfer..."

# Convert the tar.gz to base64 again (to ensure safe transfer through SSM)
base64 -i /tmp/wms-src.tar.gz -o /tmp/wms-src-transfer.b64

# Split into smaller chunks for SSM transfer
echo "Splitting file into chunks..."
split -b 30000 /tmp/wms-src-transfer.b64 /tmp/transfer-chunk-

# Create deployment script on EC2
echo "Creating deployment script on EC2..."
aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --region "$REGION" \
    --parameters 'commands=[
        "cat > /tmp/deploy-wms.sh << '\''DEPLOY_SCRIPT'\''",
        "#!/bin/bash",
        "set -e",
        "",
        "echo \"Starting WMS deployment...\"",
        "",
        "# Wait for all chunks to arrive",
        "echo \"Waiting for file chunks...\"",
        "cd /tmp",
        "",
        "# Combine chunks",
        "echo \"Combining chunks...\"",
        "cat transfer-chunk-* > wms-src-transfer.b64",
        "",
        "# Decode",
        "echo \"Decoding archive...\"",
        "base64 -d wms-src-transfer.b64 > wms-src.tar.gz",
        "",
        "# Extract",
        "echo \"Extracting application...\"",
        "sudo rm -rf /var/www/wms/*",
        "sudo tar -xzf wms-src.tar.gz -C /var/www/wms",
        "sudo chown -R ubuntu:ubuntu /var/www/wms",
        "",
        "# Setup environment",
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
        "# Install dependencies",
        "echo \"Installing dependencies...\"",
        "npm install --production=false",
        "",
        "# Build",
        "echo \"Building application...\"",
        "npm run build",
        "",
        "# Migrations",
        "echo \"Running migrations...\"",
        "npx knex migrate:latest --env production",
        "",
        "# PM2 setup",
        "echo \"Setting up PM2...\"",
        "pm2 delete all || true",
        "pm2 start npm --name wms -- start",
        "pm2 save",
        "sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu",
        "",
        "# Verify",
        "echo \"Verifying deployment...\"",
        "pm2 status",
        "sleep 5",
        "curl -I http://localhost:3000 || echo \"App starting...\"",
        "",
        "# Cleanup",
        "rm -f /tmp/transfer-chunk-* /tmp/wms-src-transfer.b64 /tmp/wms-src.tar.gz",
        "echo \"Deployment complete!\"",
        "DEPLOY_SCRIPT",
        "chmod +x /tmp/deploy-wms.sh"
    ]' \
    --output text

sleep 5

# Transfer chunks
echo "Transferring file chunks to EC2..."
for chunk in /tmp/transfer-chunk-*; do
    if [ -f "$chunk" ]; then
        chunk_name=$(basename "$chunk")
        echo "Transferring $chunk_name..."
        
        # Read chunk content
        chunk_content=$(cat "$chunk")
        
        # Transfer chunk using printf to handle special characters
        aws ssm send-command \
            --instance-ids "$INSTANCE_ID" \
            --document-name "AWS-RunShellScript" \
            --region "$REGION" \
            --parameters "commands=[\"printf '%s' '$chunk_content' > /tmp/$chunk_name\"]" \
            --output text
        
        sleep 1
    fi
done

echo "All chunks transferred. Waiting for transfers to complete..."
sleep 10

# Execute deployment
echo "Executing deployment script..."
DEPLOY_CMD=$(aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --region "$REGION" \
    --parameters 'commands=["/tmp/deploy-wms.sh"]' \
    --output text \
    --query "Command.CommandId")

echo "Deployment command ID: $DEPLOY_CMD"
echo "Waiting for deployment to complete (this may take several minutes)..."

# Wait for completion
sleep 30

# Check status
STATUS=$(aws ssm get-command-invocation \
    --command-id "$DEPLOY_CMD" \
    --instance-id "$INSTANCE_ID" \
    --region "$REGION" \
    --query "Status" \
    --output text 2>/dev/null || echo "InProgress")

while [ "$STATUS" = "InProgress" ]; do
    echo "Deployment still in progress..."
    sleep 10
    STATUS=$(aws ssm get-command-invocation \
        --command-id "$DEPLOY_CMD" \
        --instance-id "$INSTANCE_ID" \
        --region "$REGION" \
        --query "Status" \
        --output text 2>/dev/null || echo "InProgress")
done

echo "Deployment status: $STATUS"

# Get output
echo ""
echo "=== Deployment Output ==="
aws ssm get-command-invocation \
    --command-id "$DEPLOY_CMD" \
    --instance-id "$INSTANCE_ID" \
    --region "$REGION" \
    --query "StandardOutputContent" \
    --output text

if [ "$STATUS" != "Success" ]; then
    echo ""
    echo "=== Error Output ==="
    aws ssm get-command-invocation \
        --command-id "$DEPLOY_CMD" \
        --instance-id "$INSTANCE_ID" \
        --region "$REGION" \
        --query "StandardErrorContent" \
        --output text
fi

# Cleanup local files
rm -f /tmp/wms-src.tar.gz /tmp/wms-src-transfer.b64 /tmp/transfer-chunk-*

echo ""
echo "Deployment process completed!"
echo "Application should be accessible at: http://3.87.244.116:3000"
echo ""
echo "To check application logs:"
echo "aws ssm send-command --instance-ids $INSTANCE_ID --document-name 'AWS-RunShellScript' --parameters 'commands=[\"pm2 logs wms --lines 50\"]' --region $REGION"