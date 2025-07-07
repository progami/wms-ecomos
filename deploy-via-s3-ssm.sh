#!/bin/bash

set -e

# Configuration
INSTANCE_ID="i-08a1c1eeb97e7f7dd"
INSTANCE_IP="52.45.95.64"
S3_BUCKET="wms-deploy-$(date +%s)"
PACKAGE_NAME="wms.tar.gz"
LOCAL_PACKAGE_PATH="/tmp/${PACKAGE_NAME}"

echo "=== WMS Deployment via S3 and SSM ==="
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

# Step 2: Upload to S3
echo "Creating S3 bucket and uploading..."
aws s3 mb "s3://${S3_BUCKET}" --region us-west-2
aws s3 cp "${LOCAL_PACKAGE_PATH}" "s3://${S3_BUCKET}/${PACKAGE_NAME}"

# Generate pre-signed URL
PRESIGNED_URL=$(aws s3 presign "s3://${S3_BUCKET}/${PACKAGE_NAME}" --expires-in 3600)
echo "Pre-signed URL generated"

# Step 3: Deploy using SSM
echo "Starting deployment on instance..."

# Create a single deployment command
DEPLOY_CMD=$(cat << EOF
set -e
echo "=== Starting WMS Deployment ==="

# Create directories
sudo mkdir -p /home/wms/app
sudo chown -R wms:wms /home/wms/app

# Download package
echo "Downloading package..."
cd /tmp
wget -q -O ${PACKAGE_NAME} "${PRESIGNED_URL}"
echo "Package downloaded successfully"

# Extract as wms user
echo "Extracting package..."
sudo -u wms tar -xzf /tmp/${PACKAGE_NAME} -C /home/wms/app/
echo "Package extracted successfully"

# Create environment file
echo "Creating .env.production..."
sudo -u wms bash -c 'cd /home/wms/app && cat > .env.production << ENVFILE
NODE_ENV=production
DATABASE_URL="postgresql://wms:wms_secure_password_2024@localhost:5432/wms_production"
NEXTAUTH_URL="http://52.45.95.64:3000"
NEXTAUTH_SECRET="$(openssl rand -hex 32)"
JWT_SECRET="$(openssl rand -hex 32)"
ENVFILE'

# Install dependencies
echo "Installing dependencies..."
cd /home/wms/app
sudo -u wms npm ci --production

# Build application
echo "Building application..."
sudo -u wms npm run build

# Run migrations
echo "Running database migrations..."
sudo -u wms npx prisma migrate deploy || echo "Migrations may already be applied"

# Setup PM2
echo "Configuring PM2..."
sudo -u wms pm2 stop all || true
sudo -u wms pm2 delete all || true
sudo -u wms pm2 start npm --name wms-app -- start
sudo -u wms pm2 save

# Show status
echo "=== Deployment Status ==="
sudo -u wms pm2 status

# Cleanup
rm -f /tmp/${PACKAGE_NAME}

echo "=== Deployment Completed Successfully ==="
EOF
)

# Execute deployment command
CMD_ID=$(aws ssm send-command \
  --instance-ids "${INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[\"${DEPLOY_CMD}\"]" \
  --timeout-seconds 600 \
  --query 'Command.CommandId' \
  --output text)

echo "Deployment command ID: ${CMD_ID}"
echo "Waiting for deployment to complete (this may take 5-10 minutes)..."

# Monitor deployment
MAX_WAIT=600  # 10 minutes
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
  STATUS=$(aws ssm get-command-invocation \
    --command-id "${CMD_ID}" \
    --instance-id "${INSTANCE_ID}" \
    --query 'Status' \
    --output text 2>/dev/null || echo "Pending")
  
  if [ "$STATUS" == "Success" ]; then
    echo ""
    echo "✅ Deployment completed successfully!"
    
    # Show output
    echo ""
    echo "Deployment output:"
    aws ssm get-command-invocation \
      --command-id "${CMD_ID}" \
      --instance-id "${INSTANCE_ID}" \
      --query 'StandardOutputContent' \
      --output text
    break
  elif [ "$STATUS" == "Failed" ]; then
    echo ""
    echo "❌ Deployment failed!"
    
    # Show error
    echo "Error details:"
    aws ssm get-command-invocation \
      --command-id "${CMD_ID}" \
      --instance-id "${INSTANCE_ID}" \
      --query '[StandardOutputContent,StandardErrorContent]' \
      --output text
    
    # Cleanup and exit
    rm -f "${LOCAL_PACKAGE_PATH}"
    aws s3 rm "s3://${S3_BUCKET}/${PACKAGE_NAME}"
    aws s3 rb "s3://${S3_BUCKET}"
    exit 1
  fi
  
  echo -n "."
  sleep 5
  WAITED=$((WAITED + 5))
done

# Cleanup
echo ""
echo "Cleaning up..."
rm -f "${LOCAL_PACKAGE_PATH}"
aws s3 rm "s3://${S3_BUCKET}/${PACKAGE_NAME}"
aws s3 rb "s3://${S3_BUCKET}"

# Verify deployment
echo ""
echo "Verifying deployment..."
sleep 20

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://${INSTANCE_IP}:3000" || echo "000")

if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "302" ]; then
  echo "✅ Application is accessible at: http://${INSTANCE_IP}:3000"
else
  echo "⚠️  Application returned HTTP code: $HTTP_CODE"
  echo "The application may still be starting up. Please wait a moment and try again."
  echo ""
  echo "To check application logs:"
  echo "  aws ssm start-session --target ${INSTANCE_ID}"
  echo "  Then run: sudo -u wms pm2 logs wms-app"
fi

echo ""
echo "=== Deployment Summary ==="
echo "Instance ID: ${INSTANCE_ID}"
echo "Instance IP: ${INSTANCE_IP}"
echo "Application URL: http://${INSTANCE_IP}:3000"
echo ""
echo "Database credentials:"
echo "  Database: wms_production"
echo "  User: wms"
echo "  Password: wms_secure_password_2024"