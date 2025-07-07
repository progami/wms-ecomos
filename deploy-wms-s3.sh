#!/bin/bash

set -e

# Configuration
INSTANCE_ID="i-08a1c1eeb97e7f7dd"
INSTANCE_IP="52.45.95.64"
S3_BUCKET="wms-deployment-$(date +%s)"
PACKAGE_NAME="wms-deployment-$(date +%Y%m%d-%H%M%S).tar.gz"
LOCAL_PACKAGE_PATH="/tmp/${PACKAGE_NAME}"

echo "=== WMS Deployment to EC2 via S3 ==="
echo "Instance: ${INSTANCE_ID} (${INSTANCE_IP})"
echo "Package: ${PACKAGE_NAME}"

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
echo "Creating S3 bucket: ${S3_BUCKET}..."
aws s3 mb "s3://${S3_BUCKET}" --region us-west-2 || true

echo "Uploading package to S3..."
aws s3 cp "${LOCAL_PACKAGE_PATH}" "s3://${S3_BUCKET}/${PACKAGE_NAME}"

# Step 3: Generate presigned URL (valid for 1 hour)
echo "Generating presigned URL..."
PRESIGNED_URL=$(aws s3 presign "s3://${S3_BUCKET}/${PACKAGE_NAME}" --expires-in 3600)

# Step 4: Deploy via SSM
echo "Deploying to EC2 instance via SSM..."

# Create deployment script
DEPLOY_SCRIPT=$(cat << 'EOF'
#!/bin/bash
set -e

# Variables passed from main script
PRESIGNED_URL="$1"
PACKAGE_NAME="$2"

echo "Starting deployment on EC2 instance..."

# Switch to wms user
sudo -u wms bash << 'EOFUSER'
cd /home/wms

# Download package
echo "Downloading deployment package..."
wget -q -O "/tmp/${PACKAGE_NAME}" "${PRESIGNED_URL}"

# Extract package
echo "Extracting package..."
tar -xzf "/tmp/${PACKAGE_NAME}" -C /home/wms/app/

# Navigate to app directory
cd /home/wms/app

# Create .env.production file
echo "Creating .env.production file..."
cat > .env.production << 'ENVEOF'
NODE_ENV=production
DATABASE_URL="postgresql://wms:wms_secure_password_2024@localhost:5432/wms_production"
NEXTAUTH_URL="http://52.45.95.64:3000"
NEXTAUTH_SECRET="your-nextauth-secret-here-change-in-production"
JWT_SECRET="your-jwt-secret-here-change-in-production"
ENVEOF

# Install dependencies
echo "Installing dependencies..."
npm ci --production

# Build the application
echo "Building application..."
npm run build

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Stop existing PM2 processes
echo "Stopping existing PM2 processes..."
pm2 stop all || true
pm2 delete all || true

# Start application with PM2
echo "Starting application with PM2..."
pm2 start npm --name "wms-app" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup systemd -u wms --hp /home/wms

echo "Deployment completed successfully!"
echo "Application should be accessible at http://52.45.95.64:3000"

# Show PM2 status
pm2 status
EOFUSER
EOF
)

# Execute deployment script via SSM
aws ssm send-command \
  --instance-ids "${INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[\"${DEPLOY_SCRIPT//\"/\\\"} '${PRESIGNED_URL}' '${PACKAGE_NAME}'\"]" \
  --output json > /tmp/ssm-command-output.json

COMMAND_ID=$(jq -r '.Command.CommandId' /tmp/ssm-command-output.json)
echo "SSM Command ID: ${COMMAND_ID}"

# Wait for command to complete
echo "Waiting for deployment to complete..."
while true; do
  STATUS=$(aws ssm get-command-invocation \
    --command-id "${COMMAND_ID}" \
    --instance-id "${INSTANCE_ID}" \
    --query 'Status' \
    --output text 2>/dev/null || echo "Pending")
  
  case $STATUS in
    Success)
      echo "Deployment completed successfully!"
      break
      ;;
    Failed)
      echo "Deployment failed!"
      aws ssm get-command-invocation \
        --command-id "${COMMAND_ID}" \
        --instance-id "${INSTANCE_ID}" \
        --query 'StandardErrorContent' \
        --output text
      exit 1
      ;;
    *)
      echo -n "."
      sleep 5
      ;;
  esac
done

# Get command output
echo "Deployment output:"
aws ssm get-command-invocation \
  --command-id "${COMMAND_ID}" \
  --instance-id "${INSTANCE_ID}" \
  --query 'StandardOutputContent' \
  --output text

# Step 5: Verify deployment
echo "Verifying deployment..."
sleep 10

# Check if application is accessible
if curl -s -o /dev/null -w "%{http_code}" "http://${INSTANCE_IP}:3000" | grep -q "200\|302"; then
  echo "✅ Application is accessible at http://${INSTANCE_IP}:3000"
else
  echo "⚠️  Application may not be fully started yet. Please check http://${INSTANCE_IP}:3000 in a few moments."
fi

# Cleanup
echo "Cleaning up..."
rm -f "${LOCAL_PACKAGE_PATH}"
aws s3 rm "s3://${S3_BUCKET}/${PACKAGE_NAME}"
aws s3 rb "s3://${S3_BUCKET}"

echo "=== Deployment Complete ==="
echo "Application URL: http://${INSTANCE_IP}:3000"
echo "SSH: ssh -i your-key.pem ec2-user@${INSTANCE_IP}"
echo "Logs: pm2 logs wms-app"