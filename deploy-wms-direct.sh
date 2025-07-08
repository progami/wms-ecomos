#!/bin/bash

set -e

# Configuration
INSTANCE_ID="i-08a1c1eeb97e7f7dd"
INSTANCE_IP="52.45.95.64"
PACKAGE_NAME="wms-deploy.tar.gz"
LOCAL_PACKAGE_PATH="/tmp/${PACKAGE_NAME}"

echo "=== WMS Direct Deployment to EC2 ==="
echo "Instance: ${INSTANCE_ID} (${INSTANCE_IP})"

# Step 1: Create deployment package
echo "Creating deployment package..."
tar -czf "${LOCAL_PACKAGE_PATH}" \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.next' \
  --exclude='logs' \
  --exclude='test-results' \
  --exclude='screenshots' \
  --exclude='*.log' \
  --exclude='terraform.tfstate*' \
  --exclude='cookies.txt' \
  --exclude='csrf.txt' \
  --exclude='.env.local' \
  --exclude='.env.production' \
  --exclude='deploy-*.sh' \
  .

echo "Package size: $(du -h ${LOCAL_PACKAGE_PATH} | cut -f1)"

# Step 2: Use SCP to copy the file directly
echo "Copying package to EC2 instance using Session Manager..."

# First, let's ensure the instance has AWS CLI configured for ec2-user
echo "Setting up AWS CLI on instance..."
aws ssm send-command \
  --instance-ids "${INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["which aws || (cd /tmp && curl -s https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip -o awscliv2.zip && unzip -q awscliv2.zip && sudo ./aws/install)"]' \
  --query 'Command.CommandId' \
  --output text > /tmp/aws-install-cmd.txt

INSTALL_CMD_ID=$(cat /tmp/aws-install-cmd.txt)
sleep 10

# Now use aws s3 cp via the Session Manager port forwarding
# But first, let's try a simpler approach - direct deployment without S3

echo "Creating deployment script..."
cat > /tmp/remote-deploy.sh << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

echo "Starting WMS deployment on EC2 instance..."

# Create app directory
sudo mkdir -p /home/wms/app
sudo chown -R wms:wms /home/wms/app

# Wait for package to be uploaded
while [ ! -f "/tmp/wms-deploy.tar.gz" ]; do
  echo "Waiting for package upload..."
  sleep 2
done

# Extract package
echo "Extracting package..."
sudo -u wms tar -xzf /tmp/wms-deploy.tar.gz -C /home/wms/app/

# Create .env.production
echo "Creating environment file..."
sudo -u wms bash -c 'cd /home/wms/app && cat > .env.production << EOF
NODE_ENV=production
DATABASE_URL="postgresql://wms:wms_secure_password_2024@localhost:5432/wms_production"
NEXTAUTH_URL="http://52.45.95.64:3000"
NEXTAUTH_SECRET="wms-nextauth-secret-$(date +%s)"
JWT_SECRET="wms-jwt-secret-$(date +%s)"
EOF'

# Install dependencies
echo "Installing dependencies (this may take a while)..."
sudo -u wms bash -c 'cd /home/wms/app && npm ci --production'

# Build application
echo "Building application..."
sudo -u wms bash -c 'cd /home/wms/app && npm run build'

# Run migrations
echo "Running database migrations..."
sudo -u wms bash -c 'cd /home/wms/app && npx prisma migrate deploy' || echo "Migrations may already be applied"

# Setup PM2
echo "Setting up PM2..."
sudo -u wms bash -c 'pm2 stop all || true'
sudo -u wms bash -c 'pm2 delete all || true'
sudo -u wms bash -c 'cd /home/wms/app && pm2 start npm --name wms-app -- start'
sudo -u wms bash -c 'pm2 save'
sudo -u wms bash -c 'pm2 startup systemd -u wms --hp /home/wms' | grep sudo | bash

# Show status
echo "Application status:"
sudo -u wms pm2 status

# Cleanup
rm -f /tmp/wms-deploy.tar.gz

echo "Deployment completed!"
REMOTE_SCRIPT

# Copy deployment script to instance
echo "Copying deployment script to instance..."
SCRIPT_B64=$(base64 -i /tmp/remote-deploy.sh)
aws ssm send-command \
  --instance-ids "${INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[\"echo '${SCRIPT_B64}' | base64 -d > /tmp/remote-deploy.sh && chmod +x /tmp/remote-deploy.sh\"]" \
  --query 'Command.CommandId' \
  --output text > /tmp/script-copy-cmd.txt

SCRIPT_CMD_ID=$(cat /tmp/script-copy-cmd.txt)
sleep 5

# Start the deployment script in background
echo "Starting deployment script on instance..."
aws ssm send-command \
  --instance-ids "${INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["nohup /tmp/remote-deploy.sh > /tmp/deploy.log 2>&1 &"]' \
  --query 'Command.CommandId' \
  --output text > /tmp/deploy-start-cmd.txt

sleep 5

# Now we need to upload the package. Let's use a different approach.
# We'll upload it in chunks using base64 encoding through SSM
echo "Uploading package to instance (this may take a while)..."

# Split the file into smaller chunks and upload
split -b 5M "${LOCAL_PACKAGE_PATH}" /tmp/package-part-

# Upload each part
for PART in /tmp/package-part-*; do
  if [ -f "$PART" ]; then
    PART_NAME=$(basename "$PART")
    echo "Uploading ${PART_NAME}..."
    PART_B64=$(base64 -i "$PART")
    
    aws ssm send-command \
      --instance-ids "${INSTANCE_ID}" \
      --document-name "AWS-RunShellScript" \
      --parameters "commands=[\"echo '${PART_B64}' | base64 -d > /tmp/${PART_NAME}\"]" \
      --output json > /tmp/upload-${PART_NAME}.json
    
    sleep 2
  fi
done

# Wait for uploads to complete
echo "Waiting for uploads to complete..."
sleep 10

# Combine parts on the instance
echo "Combining package parts..."
aws ssm send-command \
  --instance-ids "${INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["cat /tmp/package-part-* > /tmp/wms-deploy.tar.gz && rm -f /tmp/package-part-*"]' \
  --query 'Command.CommandId' \
  --output text > /tmp/combine-cmd.txt

COMBINE_CMD_ID=$(cat /tmp/combine-cmd.txt)
sleep 5

# Monitor deployment progress
echo "Monitoring deployment progress..."
for i in {1..60}; do
  echo -n "."
  
  # Check deployment log
  LOG_CMD_ID=$(aws ssm send-command \
    --instance-ids "${INSTANCE_ID}" \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=["tail -20 /tmp/deploy.log 2>/dev/null || echo \"Deployment in progress...\""]' \
    --query 'Command.CommandId' \
    --output text)
  
  sleep 5
  
  LOG_OUTPUT=$(aws ssm get-command-invocation \
    --command-id "${LOG_CMD_ID}" \
    --instance-id "${INSTANCE_ID}" \
    --query 'StandardOutputContent' \
    --output text 2>/dev/null || echo "")
  
  if echo "$LOG_OUTPUT" | grep -q "Deployment completed!"; then
    echo ""
    echo "✅ Deployment completed successfully!"
    echo "$LOG_OUTPUT"
    break
  fi
  
  sleep 5
done

# Cleanup local files
echo "Cleaning up local files..."
rm -f "${LOCAL_PACKAGE_PATH}" /tmp/remote-deploy.sh /tmp/package-part-* /tmp/*.txt

# Verify deployment
echo ""
echo "Verifying deployment..."
sleep 15

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://${INSTANCE_IP}:3000" || echo "000")

if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "302" ]; then
  echo "✅ Application is accessible at: http://${INSTANCE_IP}:3000"
else
  echo "⚠️  Application returned HTTP code: $HTTP_CODE"
  echo "Checking PM2 status..."
  
  # Check PM2 status
  PM2_CMD_ID=$(aws ssm send-command \
    --instance-ids "${INSTANCE_ID}" \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=["sudo -u wms pm2 status"]' \
    --query 'Command.CommandId' \
    --output text)
  
  sleep 5
  
  aws ssm get-command-invocation \
    --command-id "${PM2_CMD_ID}" \
    --instance-id "${INSTANCE_ID}" \
    --query 'StandardOutputContent' \
    --output text
fi

echo ""
echo "=== Deployment Complete ==="
echo "Application URL: http://${INSTANCE_IP}:3000"
echo ""
echo "To check logs:"
echo "  aws ssm start-session --target ${INSTANCE_ID}"
echo "  Then run: sudo -u wms pm2 logs wms-app"