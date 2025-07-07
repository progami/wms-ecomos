#!/bin/bash

set -e

# Configuration
INSTANCE_ID="i-08a1c1eeb97e7f7dd"
INSTANCE_IP="52.45.95.64"
PACKAGE_NAME="wms.tar.gz"
LOCAL_PACKAGE_PATH="/tmp/${PACKAGE_NAME}"

echo "=== Direct WMS Deployment to EC2 ==="
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

# Step 2: Copy package via S3 (simpler approach)
S3_TEMP="s3://wms-deploy-temp-$(date +%s)"
echo "Creating temporary S3 bucket..."
aws s3 mb "${S3_TEMP}" --region us-west-2

echo "Uploading to S3..."
aws s3 cp "${LOCAL_PACKAGE_PATH}" "${S3_TEMP}/${PACKAGE_NAME}"

# Step 3: Download on instance and deploy
echo "Deploying to instance..."

# Single command to download and deploy
DEPLOY_COMMAND=$(cat << 'EOF'
#!/bin/bash
set -e

# Variables
S3_PATH="$1"
PACKAGE_NAME="wms.tar.gz"

echo "=== Starting WMS Deployment ==="

# Download from S3
echo "Downloading package..."
aws s3 cp "${S3_PATH}/${PACKAGE_NAME}" /tmp/${PACKAGE_NAME}

# Setup directories
echo "Setting up directories..."
sudo mkdir -p /home/wms/app
sudo chown -R wms:wms /home/wms/app

# Extract
echo "Extracting package..."
cd /home/wms/app
sudo -u wms tar -xzf /tmp/${PACKAGE_NAME}

# Environment file
echo "Creating .env.production..."
sudo -u wms tee .env.production > /dev/null << ENVFILE
NODE_ENV=production
DATABASE_URL="postgresql://wms:wms_secure_password_2024@localhost:5432/wms_production"
NEXTAUTH_URL="http://52.45.95.64:3000"
NEXTAUTH_SECRET="$(openssl rand -hex 32)"
JWT_SECRET="$(openssl rand -hex 32)"
ENVFILE

# Install and build
echo "Installing dependencies (this may take a few minutes)..."
sudo -u wms npm ci --production

echo "Building application..."
sudo -u wms npm run build

echo "Running migrations..."
sudo -u wms npx prisma migrate deploy || echo "Migrations may already be applied"

# PM2 setup
echo "Starting application with PM2..."
sudo -u wms pm2 stop all || true
sudo -u wms pm2 delete all || true
sudo -u wms pm2 start npm --name wms-app -- start
sudo -u wms pm2 save

# Clean up
rm -f /tmp/${PACKAGE_NAME}

echo "=== Deployment Complete ==="
sudo -u wms pm2 status
EOF
)

# Execute deployment
CMD_ID=$(aws ssm send-command \
  --instance-ids "${INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[\"${DEPLOY_COMMAND} ${S3_TEMP}\"]" \
  --timeout-seconds 600 \
  --query 'Command.CommandId' \
  --output text)

echo "Deployment command: ${CMD_ID}"
echo "Waiting for deployment (this will take 5-10 minutes)..."

# Monitor
TIMEOUT=600
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
  STATUS=$(aws ssm get-command-invocation \
    --command-id "${CMD_ID}" \
    --instance-id "${INSTANCE_ID}" \
    --query 'Status' \
    --output text 2>/dev/null || echo "Pending")
  
  if [ "$STATUS" == "Success" ]; then
    echo ""
    echo "✅ Deployment succeeded!"
    
    echo ""
    echo "=== Deployment Output ==="
    aws ssm get-command-invocation \
      --command-id "${CMD_ID}" \
      --instance-id "${INSTANCE_ID}" \
      --query 'StandardOutputContent' \
      --output text
    break
  elif [ "$STATUS" == "Failed" ]; then
    echo ""
    echo "❌ Deployment failed!"
    
    echo "=== Error Details ==="
    aws ssm get-command-invocation \
      --command-id "${CMD_ID}" \
      --instance-id "${INSTANCE_ID}" \
      --query '[StandardOutputContent,StandardErrorContent]' \
      --output text
    
    # Cleanup
    rm -f "${LOCAL_PACKAGE_PATH}"
    aws s3 rm "${S3_TEMP}/${PACKAGE_NAME}"
    aws s3 rb "${S3_TEMP}"
    exit 1
  fi
  
  echo -n "."
  sleep 5
  ELAPSED=$((ELAPSED + 5))
done

# Cleanup
echo ""
echo "Cleaning up..."
rm -f "${LOCAL_PACKAGE_PATH}"
aws s3 rm "${S3_TEMP}/${PACKAGE_NAME}"
aws s3 rb "${S3_TEMP}"

# Verify
echo ""
echo "Verifying deployment..."
sleep 20

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://${INSTANCE_IP}:3000" || echo "000")

if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "302" ]; then
  echo "✅ Application is accessible at http://${INSTANCE_IP}:3000"
else
  echo "⚠️  Got HTTP ${HTTP_CODE}. Application may still be starting."
  
  # Check PM2 logs
  echo ""
  echo "Checking application logs..."
  LOG_CMD=$(aws ssm send-command \
    --instance-ids "${INSTANCE_ID}" \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=["sudo -u wms pm2 logs wms-app --lines 20 --nostream"]' \
    --query 'Command.CommandId' \
    --output text)
  
  sleep 5
  
  aws ssm get-command-invocation \
    --command-id "${LOG_CMD}" \
    --instance-id "${INSTANCE_ID}" \
    --query 'StandardOutputContent' \
    --output text
fi

echo ""
echo "=== Deployment Summary ==="
echo "Instance: ${INSTANCE_ID} (${INSTANCE_IP})"
echo "Application URL: http://${INSTANCE_IP}:3000"
echo ""
echo "Database:"
echo "  Host: localhost"
echo "  Database: wms_production"
echo "  User: wms"
echo "  Password: wms_secure_password_2024"
echo ""
echo "Note: Your old instance has NOT been modified or deleted."