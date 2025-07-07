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

# Step 3: Deploy via SSM
echo "Deploying to instance..."

# Function to run SSM command
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
    
    # Wait for command
    local MAX_WAIT=120
    local WAITED=0
    
    while [ $WAITED -lt $MAX_WAIT ]; do
        local STATUS=$(aws ssm get-command-invocation \
            --command-id "${CMD_ID}" \
            --instance-id "${INSTANCE_ID}" \
            --query 'Status' \
            --output text 2>/dev/null || echo "Pending")
        
        if [ "$STATUS" == "Success" ]; then
            echo "✓ ${DESCRIPTION} completed"
            return 0
        elif [ "$STATUS" == "Failed" ]; then
            echo "✗ ${DESCRIPTION} failed"
            aws ssm get-command-invocation \
                --command-id "${CMD_ID}" \
                --instance-id "${INSTANCE_ID}" \
                --query '[StandardOutputContent,StandardErrorContent]' \
                --output text
            return 1
        fi
        
        sleep 3
        WAITED=$((WAITED + 3))
    done
    
    echo "✗ ${DESCRIPTION} timed out"
    return 1
}

# Create full deployment script
cat > /tmp/deploy-script.sh << 'DEPLOY_SCRIPT'
#!/bin/bash
set -e

S3_BUCKET="$1"
PACKAGE_NAME="$2"

echo "Starting WMS deployment..."

# Create directories
sudo mkdir -p /home/wms/app
sudo chown -R wms:wms /home/wms/app

# Download package (as ec2-user who has AWS CLI)
echo "Downloading package from S3..."
aws s3 cp "s3://${S3_BUCKET}/${PACKAGE_NAME}" /tmp/

# Extract package
echo "Extracting package..."
sudo -u wms tar -xzf "/tmp/${PACKAGE_NAME}" -C /home/wms/app/

# Create .env.production
echo "Creating environment file..."
sudo -u wms bash -c 'cd /home/wms/app && cat > .env.production << EOF
NODE_ENV=production
DATABASE_URL="postgresql://wms:wms_secure_password_2024@localhost:5432/wms_production"
NEXTAUTH_URL="http://52.45.95.64:3000"
NEXTAUTH_SECRET="$(openssl rand -hex 32)"
JWT_SECRET="$(openssl rand -hex 32)"
EOF'

# Install dependencies
echo "Installing dependencies..."
sudo -u wms bash -c 'cd /home/wms/app && npm ci --production'

# Build application
echo "Building application..."
sudo -u wms bash -c 'cd /home/wms/app && npm run build'

# Run migrations
echo "Running database migrations..."
sudo -u wms bash -c 'cd /home/wms/app && npx prisma migrate deploy' || echo "Migrations may have already been applied"

# Setup PM2
echo "Setting up PM2..."
sudo -u wms bash -c 'pm2 stop all || true'
sudo -u wms bash -c 'pm2 delete all || true'
sudo -u wms bash -c 'cd /home/wms/app && pm2 start npm --name wms-app -- start'
sudo -u wms bash -c 'pm2 save'

# Show status
echo "Application status:"
sudo -u wms pm2 status

# Cleanup
rm -f "/tmp/${PACKAGE_NAME}"

echo "Deployment completed!"
DEPLOY_SCRIPT

# Upload and execute the deployment script
aws s3 cp /tmp/deploy-script.sh "s3://${S3_BUCKET}/deploy-script.sh"

# Execute the deployment script with S3 bucket and package name as parameters
DEPLOY_CMD="aws s3 cp s3://${S3_BUCKET}/deploy-script.sh /tmp/ && chmod +x /tmp/deploy-script.sh && /tmp/deploy-script.sh ${S3_BUCKET} ${PACKAGE_NAME}"

echo "Executing deployment script..."
CMD_ID=$(aws ssm send-command \
    --instance-ids "${INSTANCE_ID}" \
    --document-name "AWS-RunShellScript" \
    --parameters "commands=[\"${DEPLOY_CMD}\"]" \
    --timeout-seconds 600 \
    --query 'Command.CommandId' \
    --output text)

echo "Command ID: ${CMD_ID}"
echo "Waiting for deployment to complete (this may take several minutes)..."

# Wait for deployment
MAX_WAIT=300
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
        
        # Get output
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
        
        # Get error details
        echo "Error output:"
        aws ssm get-command-invocation \
            --command-id "${CMD_ID}" \
            --instance-id "${INSTANCE_ID}" \
            --query 'StandardErrorContent' \
            --output text
        
        # Get standard output too
        echo ""
        echo "Standard output:"
        aws ssm get-command-invocation \
            --command-id "${CMD_ID}" \
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
    echo "❌ Deployment timed out!"
    exit 1
fi

# Cleanup
echo ""
echo "Cleaning up..."
rm -f "${LOCAL_PACKAGE_PATH}" /tmp/deploy-script.sh
aws s3 rm "s3://${S3_BUCKET}/${PACKAGE_NAME}"
aws s3 rm "s3://${S3_BUCKET}/deploy-script.sh"
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
    echo "The application may still be starting. Checking PM2 logs..."
    
    # Get PM2 logs
    run_ssm_command "sudo -u wms pm2 logs wms-app --lines 30 --nostream" "Get PM2 logs"
fi

echo ""
echo "=== Deployment Complete ==="
echo "Application URL: http://${INSTANCE_IP}:3000"
echo ""
echo "To check application status:"
echo "  aws ssm send-command --instance-ids ${INSTANCE_ID} --document-name 'AWS-RunShellScript' --parameters 'commands=[\"sudo -u wms pm2 status\"]'"
echo ""
echo "To view logs:"
echo "  aws ssm start-session --target ${INSTANCE_ID}"
echo "  Then run: sudo -u wms pm2 logs wms-app"