#!/bin/bash

set -e

# Configuration
INSTANCE_ID="i-08a1c1eeb97e7f7dd"
INSTANCE_IP="52.45.95.64"
S3_BUCKET="wms-deployment-bucket-$(date +%s)"
PACKAGE_NAME="wms-deployment.tar.gz"
LOCAL_PACKAGE_PATH="/tmp/${PACKAGE_NAME}"

echo "=== WMS Deployment to EC2 via S3 ==="
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

echo "Package created: ${LOCAL_PACKAGE_PATH} ($(du -h ${LOCAL_PACKAGE_PATH} | cut -f1))"

# Step 2: Create S3 bucket and upload package
echo "Creating S3 bucket..."
aws s3 mb "s3://${S3_BUCKET}" --region us-west-2

echo "Uploading package to S3..."
aws s3 cp "${LOCAL_PACKAGE_PATH}" "s3://${S3_BUCKET}/${PACKAGE_NAME}"

# Generate presigned URL for downloading
PRESIGNED_URL=$(aws s3 presign "s3://${S3_BUCKET}/${PACKAGE_NAME}" --expires-in 3600)

# Step 3: Create deployment script
cat > /tmp/deploy-on-instance.sh << 'SCRIPT_EOF'
#!/bin/bash
set -e

PRESIGNED_URL="$1"
PACKAGE_NAME="$2"

echo "Starting deployment..."

# Download package as ec2-user
cd /tmp
wget -q -O "${PACKAGE_NAME}" "${PRESIGNED_URL}"
echo "Package downloaded successfully"

# Create app directory and set permissions
sudo mkdir -p /home/wms/app
sudo chown -R wms:wms /home/wms/app

# Extract package
sudo -u wms tar -xzf "/tmp/${PACKAGE_NAME}" -C /home/wms/app/
echo "Package extracted successfully"

# Create .env.production file
sudo -u wms bash << 'ENV_EOF'
cd /home/wms/app
cat > .env.production << 'ENVFILE'
NODE_ENV=production
DATABASE_URL="postgresql://wms:wms_secure_password_2024@localhost:5432/wms_production"
NEXTAUTH_URL="http://52.45.95.64:3000"
NEXTAUTH_SECRET="wms-secret-key-change-in-production"
JWT_SECRET="wms-jwt-secret-change-in-production"
ENVFILE
ENV_EOF

echo ".env.production file created"

# Install dependencies and build as wms user
sudo -u wms bash << 'BUILD_EOF'
cd /home/wms/app
echo "Installing dependencies..."
npm ci --production

echo "Building application..."
npm run build

echo "Running database migrations..."
npx prisma migrate deploy || echo "Migration may have already been applied"

echo "Stopping existing PM2 processes..."
pm2 stop all || true
pm2 delete all || true

echo "Starting application with PM2..."
pm2 start npm --name "wms-app" -- start
pm2 save

echo "Application started successfully"
pm2 status
BUILD_EOF

# Cleanup
rm -f "/tmp/${PACKAGE_NAME}"
echo "Deployment completed!"
SCRIPT_EOF

# Upload deployment script to instance
echo "Uploading deployment script..."
aws s3 cp /tmp/deploy-on-instance.sh "s3://${S3_BUCKET}/deploy-on-instance.sh"
SCRIPT_PRESIGNED_URL=$(aws s3 presign "s3://${S3_BUCKET}/deploy-on-instance.sh" --expires-in 3600)

# Step 4: Execute deployment via SSM
echo "Executing deployment on instance..."

# Download and execute the deployment script
DEPLOY_CMD="cd /tmp && wget -q -O deploy-on-instance.sh '${SCRIPT_PRESIGNED_URL}' && chmod +x deploy-on-instance.sh && ./deploy-on-instance.sh '${PRESIGNED_URL}' '${PACKAGE_NAME}'"

aws ssm send-command \
  --instance-ids "${INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[\"${DEPLOY_CMD}\"]" \
  --timeout-seconds 600 \
  --output json > /tmp/deploy-command.json

COMMAND_ID=$(jq -r '.Command.CommandId' /tmp/deploy-command.json)
echo "SSM Command ID: ${COMMAND_ID}"

# Wait for deployment to complete
echo "Waiting for deployment to complete (this may take several minutes)..."
MAX_WAIT=300
WAITED=0

while [ $WAITED -lt $MAX_WAIT ]; do
  STATUS=$(aws ssm get-command-invocation \
    --command-id "${COMMAND_ID}" \
    --instance-id "${INSTANCE_ID}" \
    --query 'Status' \
    --output text 2>/dev/null || echo "Pending")
  
  if [ "$STATUS" == "Success" ]; then
    echo ""
    echo "Deployment completed successfully!"
    break
  elif [ "$STATUS" == "Failed" ]; then
    echo ""
    echo "Deployment failed!"
    echo "Error output:"
    aws ssm get-command-invocation \
      --command-id "${COMMAND_ID}" \
      --instance-id "${INSTANCE_ID}" \
      --query 'StandardErrorContent' \
      --output text
    
    echo "Standard output:"
    aws ssm get-command-invocation \
      --command-id "${COMMAND_ID}" \
      --instance-id "${INSTANCE_ID}" \
      --query 'StandardOutputContent' \
      --output text
    exit 1
  fi
  
  echo -n "."
  sleep 5
  WAITED=$((WAITED + 5))
done

if [ $WAITED -ge $MAX_WAIT ]; then
  echo ""
  echo "Deployment timed out after 5 minutes"
  exit 1
fi

# Get deployment output
echo "Deployment output:"
aws ssm get-command-invocation \
  --command-id "${COMMAND_ID}" \
  --instance-id "${INSTANCE_ID}" \
  --query 'StandardOutputContent' \
  --output text

# Cleanup S3
echo "Cleaning up..."
rm -f "${LOCAL_PACKAGE_PATH}" /tmp/deploy-on-instance.sh
aws s3 rm "s3://${S3_BUCKET}/${PACKAGE_NAME}"
aws s3 rm "s3://${S3_BUCKET}/deploy-on-instance.sh"
aws s3 rb "s3://${S3_BUCKET}"

# Step 5: Verify deployment
echo "Verifying deployment..."
sleep 20

# Check if application is accessible
echo "Checking application status..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://${INSTANCE_IP}:3000" || echo "000")

if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "302" ]; then
  echo "✅ Application is accessible at http://${INSTANCE_IP}:3000"
else
  echo "⚠️  Application returned HTTP code: $HTTP_CODE"
  echo "The application may still be starting. Checking PM2 logs..."
  
  # Check PM2 logs
  aws ssm send-command \
    --instance-ids "${INSTANCE_ID}" \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=["sudo -u wms pm2 logs wms-app --lines 30 --nostream"]' \
    --output json > /tmp/pm2-logs.json
  
  LOGS_ID=$(jq -r '.Command.CommandId' /tmp/pm2-logs.json)
  sleep 5
  
  echo "PM2 logs:"
  aws ssm get-command-invocation \
    --command-id "${LOGS_ID}" \
    --instance-id "${INSTANCE_ID}" \
    --query 'StandardOutputContent' \
    --output text
fi

echo ""
echo "=== Deployment Complete ==="
echo "Application URL: http://${INSTANCE_IP}:3000"
echo ""
echo "To connect via SSH:"
echo "  ssh -i your-key.pem ec2-user@${INSTANCE_IP}"
echo ""
echo "To check logs via SSM:"
echo "  aws ssm start-session --target ${INSTANCE_ID}"
echo "  Then run: sudo -u wms pm2 logs wms-app"
echo ""
echo "To check application status:"
echo "  aws ssm send-command --instance-ids ${INSTANCE_ID} --document-name \"AWS-RunShellScript\" --parameters 'commands=[\"sudo -u wms pm2 status\"]'"