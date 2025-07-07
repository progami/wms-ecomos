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

# Step 3: Deploy via SSM with simpler commands
echo "Deploying to instance..."

# Function to run SSM command and wait for result
run_ssm_command() {
    local COMMAND="$1"
    local DESCRIPTION="$2"
    
    echo "Running: ${DESCRIPTION}..."
    
    local CMD_ID=$(aws ssm send-command \
        --instance-ids "${INSTANCE_ID}" \
        --document-name "AWS-RunShellScript" \
        --parameters "commands=[\"${COMMAND}\"]" \
        --query 'Command.CommandId' \
        --output text)
    
    # Wait for command to complete
    local MAX_WAIT=60
    local WAITED=0
    
    while [ $WAITED -lt $MAX_WAIT ]; do
        local STATUS=$(aws ssm get-command-invocation \
            --command-id "${CMD_ID}" \
            --instance-id "${INSTANCE_ID}" \
            --query 'Status' \
            --output text 2>/dev/null || echo "Pending")
        
        if [ "$STATUS" == "Success" ]; then
            echo "✓ ${DESCRIPTION} completed"
            aws ssm get-command-invocation \
                --command-id "${CMD_ID}" \
                --instance-id "${INSTANCE_ID}" \
                --query 'StandardOutputContent' \
                --output text
            return 0
        elif [ "$STATUS" == "Failed" ]; then
            echo "✗ ${DESCRIPTION} failed"
            aws ssm get-command-invocation \
                --command-id "${CMD_ID}" \
                --instance-id "${INSTANCE_ID}" \
                --query 'StandardErrorContent' \
                --output text
            return 1
        fi
        
        sleep 2
        WAITED=$((WAITED + 2))
    done
    
    echo "✗ ${DESCRIPTION} timed out"
    return 1
}

# Create app directory
run_ssm_command "sudo mkdir -p /home/wms/app && sudo chown -R wms:wms /home/wms/app" "Create app directory"

# Download package
run_ssm_command "cd /tmp && sudo rm -f ${PACKAGE_NAME} && sudo aws s3 cp s3://${S3_BUCKET}/${PACKAGE_NAME} ." "Download package"

# Extract package
run_ssm_command "cd /home/wms/app && sudo -u wms tar -xzf /tmp/${PACKAGE_NAME}" "Extract package"

# Create .env.production
ENV_CONTENT='NODE_ENV=production
DATABASE_URL="postgresql://wms:wms_secure_password_2024@localhost:5432/wms_production"
NEXTAUTH_URL="http://52.45.95.64:3000"
NEXTAUTH_SECRET="'"$(openssl rand -hex 32)"'"
JWT_SECRET="'"$(openssl rand -hex 32)"'"'

run_ssm_command "cd /home/wms/app && sudo -u wms bash -c 'cat > .env.production << EOF
${ENV_CONTENT}
EOF'" "Create environment file"

# Install dependencies
echo "Installing dependencies (this may take a few minutes)..."
run_ssm_command "cd /home/wms/app && sudo -u wms npm ci --production" "Install dependencies"

# Build application
echo "Building application (this may take a few minutes)..."
run_ssm_command "cd /home/wms/app && sudo -u wms npm run build" "Build application"

# Run migrations
run_ssm_command "cd /home/wms/app && sudo -u wms npx prisma migrate deploy" "Run database migrations" || echo "Migrations may have already been applied"

# Start with PM2
run_ssm_command "sudo -u wms pm2 stop all || true" "Stop existing PM2 processes"
run_ssm_command "sudo -u wms pm2 delete all || true" "Delete existing PM2 processes"
run_ssm_command "cd /home/wms/app && sudo -u wms pm2 start npm --name wms-app -- start" "Start application with PM2"
run_ssm_command "sudo -u wms pm2 save" "Save PM2 configuration"

# Check status
run_ssm_command "sudo -u wms pm2 status" "Check PM2 status"

# Cleanup
echo "Cleaning up..."
rm -f "${LOCAL_PACKAGE_PATH}"
aws s3 rm "s3://${S3_BUCKET}/${PACKAGE_NAME}"
aws s3 rb "s3://${S3_BUCKET}"

# Verify deployment
echo ""
echo "Verifying deployment..."
sleep 15

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://${INSTANCE_IP}:3000" || echo "000")

if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "302" ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo "Application is accessible at: http://${INSTANCE_IP}:3000"
else
    echo ""
    echo "⚠️  Application returned HTTP code: $HTTP_CODE"
    echo "The application may still be starting. Please check in a few moments."
    
    # Try to get PM2 logs
    echo ""
    echo "Recent PM2 logs:"
    run_ssm_command "sudo -u wms pm2 logs wms-app --lines 20 --nostream" "Get PM2 logs"
fi

echo ""
echo "=== Deployment Complete ==="
echo "Application URL: http://${INSTANCE_IP}:3000"
echo ""
echo "To check logs:"
echo "  aws ssm start-session --target ${INSTANCE_ID}"
echo "  Then run: sudo -u wms pm2 logs wms-app"