#!/bin/bash

# Script to upload deployment package to S3 and get presigned URL

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    echo "Visit: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Variables
DEPLOYMENT_FILE="wms-deployment-minimal.tar.gz"
S3_BUCKET="targonglobal-wms-storage"
S3_KEY="deployments/$(date +%Y%m%d_%H%M%S)_${DEPLOYMENT_FILE}"
EXPIRES_IN=3600  # 1 hour

# Check if deployment file exists
if [ ! -f "$DEPLOYMENT_FILE" ]; then
    echo "❌ Deployment file not found: $DEPLOYMENT_FILE"
    echo "Please run ./create-deployment-minimal.sh first"
    exit 1
fi

echo "📦 Uploading deployment package to S3..."
echo "File: $DEPLOYMENT_FILE"
echo "S3 Path: s3://${S3_BUCKET}/${S3_KEY}"

# Upload to S3
if aws s3 cp "$DEPLOYMENT_FILE" "s3://${S3_BUCKET}/${S3_KEY}"; then
    echo "✅ Upload successful!"
    
    # Generate presigned URL
    echo ""
    echo "🔗 Generating presigned URL (valid for 1 hour)..."
    PRESIGNED_URL=$(aws s3 presign "s3://${S3_BUCKET}/${S3_KEY}" --expires-in $EXPIRES_IN)
    
    echo ""
    echo "✅ Presigned URL generated successfully!"
    echo ""
    echo "========================================"
    echo "DEPLOYMENT INSTRUCTIONS"
    echo "========================================"
    echo ""
    echo "1. SSH into your EC2 instance:"
    echo "   ssh -i your-key.pem ubuntu@54.243.188.216"
    echo ""
    echo "2. Download the deployment package:"
    echo "   wget -O wms-deployment-minimal.tar.gz \"$PRESIGNED_URL\""
    echo ""
    echo "3. Follow the deployment steps in deploy-to-ec2-manual.sh"
    echo ""
    echo "========================================"
    
    # Save the URL to a file for easy access
    echo "$PRESIGNED_URL" > presigned-url.txt
    echo ""
    echo "📝 Presigned URL also saved to: presigned-url.txt"
    
else
    echo "❌ Upload failed. Please check your AWS credentials and permissions."
    exit 1
fi