#!/bin/bash

# EC2 Instance ID
INSTANCE_ID="i-065d0aa80cdcd55b1"

echo "Starting WMS deployment to EC2 instance $INSTANCE_ID"

# Step 1: Create temporary directory on EC2
echo "Creating temporary directory on EC2..."
aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=["sudo mkdir -p /tmp/wms-deploy && sudo chmod 777 /tmp/wms-deploy"]' \
    --output text

sleep 5

# Step 2: Transfer all chunks
echo "Transferring file chunks to EC2..."
for chunk in /tmp/wms-chunk-*; do
    chunk_name=$(basename "$chunk")
    chunk_content=$(cat "$chunk")
    echo "Transferring $chunk_name..."
    
    aws ssm send-command \
        --instance-ids "$INSTANCE_ID" \
        --document-name "AWS-RunShellScript" \
        --parameters "commands=[\"echo '$chunk_content' > /tmp/wms-deploy/$chunk_name\"]" \
        --output text
    
    sleep 2
done

echo "Waiting for all chunks to transfer..."
sleep 10

# Step 3: Combine chunks, decode, and extract
echo "Combining chunks and extracting application..."
aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=[
        "cd /tmp/wms-deploy",
        "cat wms-chunk-* > wms-src.tar.gz.b64",
        "base64 -d wms-src.tar.gz.b64 > wms-src.tar.gz",
        "sudo rm -rf /var/www/wms/*",
        "sudo tar -xzf wms-src.tar.gz -C /var/www/wms",
        "sudo chown -R ubuntu:ubuntu /var/www/wms"
    ]' \
    --output text

sleep 10

# Step 4: Setup environment variables
echo "Setting up environment variables..."
aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=[
        "sudo tee /var/www/wms/.env > /dev/null <<EOF
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://wms_user:wms_password@localhost:5432/wms_db
JWT_SECRET=your-secret-key-here-change-in-production
SESSION_SECRET=your-session-secret-here-change-in-production
CORS_ORIGIN=http://3.87.244.116:3000
EOF",
        "sudo chown ubuntu:ubuntu /var/www/wms/.env"
    ]' \
    --output text

sleep 5

# Step 5: Install dependencies and build
echo "Installing dependencies and building application..."
aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=[
        "cd /var/www/wms",
        "npm install --production=false",
        "npm run build"
    ]' \
    --output text

sleep 30

# Step 6: Run database migrations
echo "Running database migrations..."
aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=[
        "cd /var/www/wms",
        "npx knex migrate:latest --env production"
    ]' \
    --output text

sleep 10

# Step 7: Setup PM2 and start application
echo "Setting up PM2 and starting application..."
aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=[
        "cd /var/www/wms",
        "pm2 delete all || true",
        "pm2 start npm --name wms -- start",
        "pm2 save",
        "pm2 startup systemd -u ubuntu --hp /home/ubuntu",
        "sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu"
    ]' \
    --output text

sleep 10

# Step 8: Verify deployment
echo "Verifying deployment..."
aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=[
        "pm2 status",
        "curl -I http://localhost:3000",
        "sudo systemctl status nginx"
    ]' \
    --output text

echo "Deployment initiated! Check AWS SSM console for command execution status."
echo "The application should be accessible at http://3.87.244.116:3000 once deployment is complete."
echo ""
echo "To check deployment status, run:"
echo "aws ssm list-command-invocations --instance-id $INSTANCE_ID --max-items 10"