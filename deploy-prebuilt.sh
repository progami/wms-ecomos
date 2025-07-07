#!/bin/bash

set -e

# Configuration
INSTANCE_ID="i-08a1c1eeb97e7f7dd"
INSTANCE_IP="52.45.95.64"
S3_BUCKET="wms-deploy-$(date +%s)"
PACKAGE_NAME="wms.tar.gz"
LOCAL_PACKAGE_PATH="/tmp/${PACKAGE_NAME}"

echo "=== WMS Deployment to EC2 ==="
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

# Step 3: Create deployment script and upload to S3
cat > /tmp/deploy.sh << 'DEPLOY_SCRIPT'
#!/bin/bash
set -e

# Get parameters
S3_BUCKET=$1
PACKAGE_NAME=$2
PRESIGNED_URL=$3

echo "Starting deployment..."

# Setup directories
sudo mkdir -p /home/wms/app
sudo chown -R wms:wms /home/wms/app

# Download package
echo "Downloading package..."
cd /tmp
rm -f ${PACKAGE_NAME}
wget -O ${PACKAGE_NAME} "${PRESIGNED_URL}"

# Extract
echo "Extracting..."
sudo -u wms tar -xzf /tmp/${PACKAGE_NAME} -C /home/wms/app/

# Create env file
echo "Creating .env.production..."
cd /home/wms/app
sudo -u wms tee .env.production > /dev/null << EOF
NODE_ENV=production
DATABASE_URL="postgresql://wms:wms_secure_password_2024@localhost:5432/wms_production"
NEXTAUTH_URL="http://52.45.95.64:3000"
NEXTAUTH_SECRET="$(openssl rand -hex 32)"
JWT_SECRET="$(openssl rand -hex 32)"
EOF

# Install and build
echo "Installing dependencies..."
sudo -u wms npm ci --production

echo "Building application..."
sudo -u wms npm run build

echo "Running migrations..."
sudo -u wms npx prisma migrate deploy || true

# Setup PM2
echo "Starting application..."
sudo -u wms pm2 stop all || true
sudo -u wms pm2 delete all || true
sudo -u wms pm2 start npm --name wms-app -- start
sudo -u wms pm2 save

echo "Deployment complete!"
sudo -u wms pm2 status
DEPLOY_SCRIPT

# Upload deployment script
aws s3 cp /tmp/deploy.sh "s3://${S3_BUCKET}/deploy.sh"

# Step 4: Run deployment via SSM
echo "Executing deployment on instance..."

# First download the script
CMD1=$(aws ssm send-command \
  --instance-ids "${INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[\"cd /tmp && aws s3 cp s3://${S3_BUCKET}/deploy.sh . && chmod +x deploy.sh\"]" \
  --query 'Command.CommandId' \
  --output text)

echo "Downloading deployment script (Command: ${CMD1})..."
sleep 10

# Then execute it
CMD2=$(aws ssm send-command \
  --instance-ids "${INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[\"cd /tmp && ./deploy.sh ${S3_BUCKET} ${PACKAGE_NAME} '${PRESIGNED_URL}'\"]" \
  --timeout-seconds 600 \
  --query 'Command.CommandId' \
  --output text)

echo "Running deployment (Command: ${CMD2})..."
echo "This will take 5-10 minutes. Please wait..."

# Monitor deployment
MAX_WAIT=600
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
  STATUS=$(aws ssm get-command-invocation \
    --command-id "${CMD2}" \
    --instance-id "${INSTANCE_ID}" \
    --query 'Status' \
    --output text 2>/dev/null || echo "Pending")
  
  if [ "$STATUS" == "Success" ]; then
    echo ""
    echo "✅ Deployment completed!"
    
    # Show output
    echo ""
    echo "=== Deployment Output ==="
    aws ssm get-command-invocation \
      --command-id "${CMD2}" \
      --instance-id "${INSTANCE_ID}" \
      --query 'StandardOutputContent' \
      --output text
    break
  elif [ "$STATUS" == "Failed" ]; then
    echo ""
    echo "❌ Deployment failed!"
    
    # Show errors
    echo "=== Error Output ==="
    aws ssm get-command-invocation \
      --command-id "${CMD2}" \
      --instance-id "${INSTANCE_ID}" \
      --query 'StandardErrorContent' \
      --output text
    
    echo ""
    echo "=== Standard Output ==="
    aws ssm get-command-invocation \
      --command-id "${CMD2}" \
      --instance-id "${INSTANCE_ID}" \
      --query 'StandardOutputContent' \
      --output text
    
    # Cleanup and exit
    rm -f "${LOCAL_PACKAGE_PATH}" /tmp/deploy.sh
    aws s3 rm "s3://${S3_BUCKET}/${PACKAGE_NAME}"
    aws s3 rm "s3://${S3_BUCKET}/deploy.sh"
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
rm -f "${LOCAL_PACKAGE_PATH}" /tmp/deploy.sh
aws s3 rm "s3://${S3_BUCKET}/${PACKAGE_NAME}"
aws s3 rm "s3://${S3_BUCKET}/deploy.sh"
aws s3 rb "s3://${S3_BUCKET}"

# Verify
echo ""
echo "Verifying deployment..."
sleep 20

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://${INSTANCE_IP}:3000" || echo "000")

if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "302" ]; then
  echo "✅ Application is running and accessible!"
else
  echo "⚠️  HTTP response code: $HTTP_CODE"
  echo "Application may still be starting. Please wait and check again."
fi

echo ""
echo "=== Deployment Complete ==="
echo "Application URL: http://${INSTANCE_IP}:3000"
echo ""
echo "To monitor the application:"
echo "  aws ssm start-session --target ${INSTANCE_ID}"
echo "  Then: sudo -u wms pm2 logs wms-app"
echo ""
echo "To check status:"
echo "  aws ssm send-command --instance-ids ${INSTANCE_ID} --document-name 'AWS-RunShellScript' --parameters 'commands=[\"sudo -u wms pm2 status\"]'"
echo ""
echo "Note: The old instance has NOT been deleted. Please verify the new deployment is working before removing the old instance."