#!/bin/bash

# EC2 Instance ID
INSTANCE_ID="i-065d0aa80cdcd55b1"

echo "Starting efficient WMS deployment to EC2 instance $INSTANCE_ID"

# First, let's create the deployment script on the EC2 instance
echo "Creating deployment script on EC2..."

aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=[
        "sudo tee /tmp/deploy-wms.sh > /dev/null <<'\''DEPLOY_SCRIPT'\''
#!/bin/bash
set -e

echo \"Starting WMS deployment...\"

# Create temporary directory
mkdir -p /tmp/wms-deploy
cd /tmp/wms-deploy

# Clean up any previous deployment files
rm -f wms-chunk-* wms-src.tar.gz.b64 wms-src.tar.gz

echo \"Waiting for file chunks to be transferred...\"
sleep 5

# Function to check if all chunks are transferred
check_chunks() {
    expected_chunks=16  # We have 16 chunks (aa to ap)
    actual_chunks=$(ls -1 wms-chunk-* 2>/dev/null | wc -l)
    [ \"$actual_chunks\" -eq \"$expected_chunks\" ]
}

# Wait for all chunks with timeout
timeout=120
elapsed=0
while ! check_chunks && [ $elapsed -lt $timeout ]; do
    echo \"Waiting for chunks... ($elapsed/$timeout seconds)\"
    sleep 5
    elapsed=$((elapsed + 5))
done

if ! check_chunks; then
    echo \"ERROR: Not all chunks were transferred in time\"
    exit 1
fi

echo \"All chunks received. Combining and extracting...\"

# Combine chunks
cat wms-chunk-* > wms-src.tar.gz.b64

# Decode base64
base64 -d wms-src.tar.gz.b64 > wms-src.tar.gz

# Extract to WMS directory
echo \"Extracting application files...\"
sudo rm -rf /var/www/wms/*
sudo tar -xzf wms-src.tar.gz -C /var/www/wms
sudo chown -R ubuntu:ubuntu /var/www/wms

# Setup environment variables
echo \"Setting up environment variables...\"
sudo tee /var/www/wms/.env > /dev/null <<EOF
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://wms_user:wms_password@localhost:5432/wms_db
JWT_SECRET=your-secret-key-here-change-in-production
SESSION_SECRET=your-session-secret-here-change-in-production
CORS_ORIGIN=http://3.87.244.116:3000
EOF

sudo chown ubuntu:ubuntu /var/www/wms/.env

# Install dependencies
echo \"Installing dependencies...\"
cd /var/www/wms
npm install --production=false

# Build the application
echo \"Building application...\"
npm run build

# Run database migrations
echo \"Running database migrations...\"
npx knex migrate:latest --env production

# Stop any existing PM2 processes
pm2 delete all || true

# Start the application with PM2
echo \"Starting application with PM2...\"
pm2 start npm --name wms -- start
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Verify deployment
echo \"Verifying deployment...\"
sleep 5
pm2 status
curl -I http://localhost:3000 || echo \"Application may still be starting up...\"

# Clean up
rm -rf /tmp/wms-deploy

echo \"Deployment complete!\"
DEPLOY_SCRIPT",
        "chmod +x /tmp/deploy-wms.sh"
    ]' \
    --output text

sleep 5

# Now transfer the chunks
echo "Starting chunk transfer process..."

# Create a single command to transfer all chunks
for chunk in /tmp/wms-chunk-*; do
    chunk_name=$(basename "$chunk")
    chunk_content=$(cat "$chunk" | base64)  # Double base64 encode for safe transfer
    echo "Preparing $chunk_name for transfer..."
    
    aws ssm send-command \
        --instance-ids "$INSTANCE_ID" \
        --document-name "AWS-RunShellScript" \
        --parameters "commands=[\"echo '$chunk_content' | base64 -d > /tmp/wms-deploy/$chunk_name\"]" \
        --output text
    
    sleep 1
done

echo "All chunks sent. Waiting for transfers to complete..."
sleep 15

# Execute the deployment script
echo "Executing deployment script on EC2..."
COMMAND_ID=$(aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=["/tmp/deploy-wms.sh"]' \
    --query "Command.CommandId" \
    --output text)

echo "Deployment command initiated with ID: $COMMAND_ID"
echo ""
echo "Monitor deployment progress with:"
echo "aws ssm get-command-invocation --command-id $COMMAND_ID --instance-id $INSTANCE_ID"
echo ""
echo "The application will be accessible at http://3.87.244.116:3000 once deployment is complete."
echo ""
echo "To check logs:"
echo "aws ssm send-command --instance-ids $INSTANCE_ID --document-name \"AWS-RunShellScript\" --parameters 'commands=[\"pm2 logs wms --lines 50\"]'"