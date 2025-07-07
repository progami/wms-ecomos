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

# Step 3: Run deployment commands via SSM
echo "Running deployment commands on EC2 instance..."

# First, check if wms user and app directory exist
echo "Checking environment..."
aws ssm send-command \
  --instance-ids "${INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["id wms && ls -la /home/wms/"]' \
  --output json > /tmp/check-env.json

CHECK_ID=$(jq -r '.Command.CommandId' /tmp/check-env.json)
sleep 5

echo "Environment check output:"
aws ssm get-command-invocation \
  --command-id "${CHECK_ID}" \
  --instance-id "${INSTANCE_ID}" \
  --query 'StandardOutputContent' \
  --output text

# Create app directory
echo "Creating app directory..."
aws ssm send-command \
  --instance-ids "${INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["sudo -u wms mkdir -p /home/wms/app"]' \
  --output json > /tmp/create-dir.json

CREATE_DIR_ID=$(jq -r '.Command.CommandId' /tmp/create-dir.json)
sleep 5

# Download and extract the package
echo "Downloading and extracting package..."
DOWNLOAD_CMD="sudo -u wms bash -c 'cd /home/wms && aws s3 cp s3://${S3_BUCKET}/${PACKAGE_NAME} /tmp/${PACKAGE_NAME} && cd /home/wms/app && tar -xzf /tmp/${PACKAGE_NAME}'"

aws ssm send-command \
  --instance-ids "${INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[\"${DOWNLOAD_CMD}\"]" \
  --output json > /tmp/download.json

DOWNLOAD_ID=$(jq -r '.Command.CommandId' /tmp/download.json)

# Wait for download to complete
echo "Waiting for download to complete..."
MAX_WAIT=30
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
  STATUS=$(aws ssm get-command-invocation \
    --command-id "${DOWNLOAD_ID}" \
    --instance-id "${INSTANCE_ID}" \
    --query 'Status' \
    --output text 2>/dev/null || echo "Pending")
  
  if [ "$STATUS" == "Success" ]; then
    echo "Download completed successfully!"
    break
  elif [ "$STATUS" == "Failed" ]; then
    echo "Download failed!"
    aws ssm get-command-invocation \
      --command-id "${DOWNLOAD_ID}" \
      --instance-id "${INSTANCE_ID}" \
      --query 'StandardErrorContent' \
      --output text
    exit 1
  fi
  
  sleep 2
  WAITED=$((WAITED + 2))
done

# Create .env.production file
echo "Creating .env.production file..."
ENV_CONTENT='NODE_ENV=production
DATABASE_URL="postgresql://wms:wms_secure_password_2024@localhost:5432/wms_production"
NEXTAUTH_URL="http://52.45.95.64:3000"
NEXTAUTH_SECRET="wms-secret-key-change-in-production-$(openssl rand -hex 32)"
JWT_SECRET="wms-jwt-secret-change-in-production-$(openssl rand -hex 32)"'

# Create env file command
CREATE_ENV_CMD="sudo -u wms bash -c 'cd /home/wms/app && cat > .env.production << EOF
${ENV_CONTENT}
EOF'"

aws ssm send-command \
  --instance-ids "${INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[\"${CREATE_ENV_CMD}\"]" \
  --output json > /tmp/create-env.json

ENV_ID=$(jq -r '.Command.CommandId' /tmp/create-env.json)
sleep 5

# Install dependencies and build
echo "Installing dependencies and building application..."
BUILD_CMD="sudo -u wms bash -c 'cd /home/wms/app && npm ci --production && npm run build'"

aws ssm send-command \
  --instance-ids "${INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[\"${BUILD_CMD}\"]" \
  --timeout-seconds 600 \
  --output json > /tmp/build.json

BUILD_ID=$(jq -r '.Command.CommandId' /tmp/build.json)

# Wait for build to complete
echo "Waiting for build to complete (this may take several minutes)..."
MAX_WAIT=300
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
  STATUS=$(aws ssm get-command-invocation \
    --command-id "${BUILD_ID}" \
    --instance-id "${INSTANCE_ID}" \
    --query 'Status' \
    --output text 2>/dev/null || echo "Pending")
  
  if [ "$STATUS" == "Success" ]; then
    echo "Build completed successfully!"
    break
  elif [ "$STATUS" == "Failed" ]; then
    echo "Build failed!"
    aws ssm get-command-invocation \
      --command-id "${BUILD_ID}" \
      --instance-id "${INSTANCE_ID}" \
      --query 'StandardErrorContent' \
      --output text
    exit 1
  fi
  
  echo -n "."
  sleep 5
  WAITED=$((WAITED + 5))
done

# Run database migrations
echo "Running database migrations..."
MIGRATE_CMD="sudo -u wms bash -c 'cd /home/wms/app && npx prisma migrate deploy'"

aws ssm send-command \
  --instance-ids "${INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[\"${MIGRATE_CMD}\"]" \
  --output json > /tmp/migrate.json

MIGRATE_ID=$(jq -r '.Command.CommandId' /tmp/migrate.json)
sleep 10

# Check migration status
MIGRATE_STATUS=$(aws ssm get-command-invocation \
  --command-id "${MIGRATE_ID}" \
  --instance-id "${INSTANCE_ID}" \
  --query 'Status' \
  --output text 2>/dev/null || echo "Failed")

if [ "$MIGRATE_STATUS" != "Success" ]; then
  echo "Migration status: $MIGRATE_STATUS"
  echo "Migration output:"
  aws ssm get-command-invocation \
    --command-id "${MIGRATE_ID}" \
    --instance-id "${INSTANCE_ID}" \
    --query 'StandardOutputContent' \
    --output text
fi

# Start application with PM2
echo "Starting application with PM2..."
START_CMD="sudo -u wms bash -c 'cd /home/wms/app && pm2 stop all || true && pm2 delete all || true && pm2 start npm --name wms-app -- start && pm2 save'"

aws ssm send-command \
  --instance-ids "${INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[\"${START_CMD}\"]" \
  --output json > /tmp/start.json

START_ID=$(jq -r '.Command.CommandId' /tmp/start.json)
sleep 10

echo "PM2 start output:"
aws ssm get-command-invocation \
  --command-id "${START_ID}" \
  --instance-id "${INSTANCE_ID}" \
  --query 'StandardOutputContent' \
  --output text

# Check PM2 status
echo "Checking PM2 status..."
aws ssm send-command \
  --instance-ids "${INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["sudo -u wms pm2 status"]' \
  --output json > /tmp/pm2-status.json

PM2_ID=$(jq -r '.Command.CommandId' /tmp/pm2-status.json)
sleep 5

aws ssm get-command-invocation \
  --command-id "${PM2_ID}" \
  --instance-id "${INSTANCE_ID}" \
  --query 'StandardOutputContent' \
  --output text

# Cleanup
echo "Cleaning up..."
rm -f "${LOCAL_PACKAGE_PATH}"
aws s3 rm "s3://${S3_BUCKET}/${PACKAGE_NAME}"
aws s3 rb "s3://${S3_BUCKET}"

# Verify deployment
echo "Verifying deployment..."
sleep 15

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://${INSTANCE_IP}:3000" || echo "000")
if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "302" ]; then
  echo "✅ Application is accessible at http://${INSTANCE_IP}:3000"
else
  echo "⚠️  Application returned HTTP code: $HTTP_CODE"
  echo "Checking PM2 logs..."
  
  aws ssm send-command \
    --instance-ids "${INSTANCE_ID}" \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=["sudo -u wms pm2 logs wms-app --lines 20"]' \
    --output json > /tmp/pm2-logs.json
  
  LOGS_ID=$(jq -r '.Command.CommandId' /tmp/pm2-logs.json)
  sleep 5
  
  aws ssm get-command-invocation \
    --command-id "${LOGS_ID}" \
    --instance-id "${INSTANCE_ID}" \
    --query 'StandardOutputContent' \
    --output text
fi

echo "=== Deployment Complete ==="
echo "Application URL: http://${INSTANCE_IP}:3000"
echo "To check logs: aws ssm start-session --target ${INSTANCE_ID}"
echo "Then run: sudo -u wms pm2 logs wms-app"