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

# Step 4: Create deployment script
cat > /tmp/deploy-script.sh << 'DEPLOY_EOF'
#!/bin/bash
set -e

# Variables
PRESIGNED_URL="$1"
PACKAGE_NAME="$2"

echo "Starting deployment on EC2 instance..."

# Create app directory if it doesn't exist
sudo -u wms mkdir -p /home/wms/app

# Download and extract package as wms user
sudo -u wms bash << 'USER_EOF'
cd /home/wms

# Download package
echo "Downloading deployment package..."
wget -q -O "/tmp/${PACKAGE_NAME}" "${PRESIGNED_URL}"

# Extract package to app directory
echo "Extracting package..."
cd /home/wms/app
tar -xzf "/tmp/${PACKAGE_NAME}"

# Create .env.production file
echo "Creating .env.production file..."
cat > .env.production << 'ENV_EOF'
NODE_ENV=production
DATABASE_URL="postgresql://wms:wms_secure_password_2024@localhost:5432/wms_production"
NEXTAUTH_URL="http://52.45.95.64:3000"
NEXTAUTH_SECRET="your-nextauth-secret-here-change-in-production"
JWT_SECRET="your-jwt-secret-here-change-in-production"
ENV_EOF

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

echo "Deployment completed successfully!"
echo "Application should be accessible at http://52.45.95.64:3000"

# Show PM2 status
pm2 status
USER_EOF
DEPLOY_EOF

# Upload deployment script to S3
aws s3 cp /tmp/deploy-script.sh "s3://${S3_BUCKET}/deploy-script.sh"
SCRIPT_URL=$(aws s3 presign "s3://${S3_BUCKET}/deploy-script.sh" --expires-in 3600)

# Step 5: Execute deployment via SSM
echo "Deploying to EC2 instance via SSM..."

# Create a simple command to download and execute the script
COMMAND="wget -q -O /tmp/deploy-script.sh '${SCRIPT_URL}' && chmod +x /tmp/deploy-script.sh && /tmp/deploy-script.sh '${PRESIGNED_URL}' '${PACKAGE_NAME}'"

aws ssm send-command \
  --instance-ids "${INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[\"${COMMAND}\"]" \
  --output json > /tmp/ssm-command-output.json

COMMAND_ID=$(jq -r '.Command.CommandId' /tmp/ssm-command-output.json)
echo "SSM Command ID: ${COMMAND_ID}"

# Wait for command to complete
echo "Waiting for deployment to complete..."
MAX_ATTEMPTS=60
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
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
      echo "Error output:"
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
      ATTEMPT=$((ATTEMPT + 1))
      ;;
  esac
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
  echo "Deployment timed out after 5 minutes"
  exit 1
fi

# Get command output
echo "Deployment output:"
aws ssm get-command-invocation \
  --command-id "${COMMAND_ID}" \
  --instance-id "${INSTANCE_ID}" \
  --query 'StandardOutputContent' \
  --output text

# Step 6: Verify deployment
echo "Verifying deployment..."
sleep 10

# Check if application is accessible
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://${INSTANCE_IP}:3000" || echo "000")
if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "302" ]; then
  echo "✅ Application is accessible at http://${INSTANCE_IP}:3000"
else
  echo "⚠️  Application returned HTTP code: $HTTP_CODE"
  echo "The application may still be starting. Please check http://${INSTANCE_IP}:3000 in a few moments."
fi

# Cleanup
echo "Cleaning up..."
rm -f "${LOCAL_PACKAGE_PATH}" /tmp/deploy-script.sh
aws s3 rm "s3://${S3_BUCKET}/${PACKAGE_NAME}"
aws s3 rm "s3://${S3_BUCKET}/deploy-script.sh"
aws s3 rb "s3://${S3_BUCKET}"

echo "=== Deployment Complete ==="
echo "Application URL: http://${INSTANCE_IP}:3000"
echo "SSH: ssh -i your-key.pem ec2-user@${INSTANCE_IP}"
echo "Logs: pm2 logs wms-app"