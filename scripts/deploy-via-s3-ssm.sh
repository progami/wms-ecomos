#!/bin/bash

echo "🚀 Deploying WMS via S3 and SSM..."

# Configuration
INSTANCE_ID="i-0fb1f56a90fe95bac"
REGION="us-east-1"
DEPLOYMENT_FILE="wms-deployment-minimal.tar.gz"
TIMESTAMP=$(date +%s)
BUCKET_NAME="wms-deploy-${TIMESTAMP}"

# Create temporary S3 bucket
echo "Creating temporary S3 bucket..."
aws s3 mb s3://$BUCKET_NAME --region $REGION

# Upload deployment package
echo "Uploading deployment package..."
aws s3 cp $DEPLOYMENT_FILE s3://$BUCKET_NAME/deploy.tar.gz

# Generate presigned URL (valid for 2 hours)
DOWNLOAD_URL=$(aws s3 presign s3://$BUCKET_NAME/deploy.tar.gz --expires-in 7200)
echo "Generated presigned URL"

# Deploy via SSM with minimal commands
echo "Deploying to EC2 via SSM..."

# Step 1: Download and extract
CMD1=$(aws ssm send-command \
    --instance-ids $INSTANCE_ID \
    --document-name "AWS-RunShellScript" \
    --timeout-seconds 300 \
    --parameters "commands=[
        'cd /var/www/wms',
        'wget -O deploy.tar.gz \"$DOWNLOAD_URL\"',
        'tar -xzf deploy.tar.gz',
        'rm deploy.tar.gz'
    ]" \
    --region $REGION \
    --output text --query 'Command.CommandId')

echo "Download command: $CMD1"
sleep 30

# Step 2: Install dependencies
CMD2=$(aws ssm send-command \
    --instance-ids $INSTANCE_ID \
    --document-name "AWS-RunShellScript" \
    --timeout-seconds 600 \
    --parameters 'commands=[
        "cd /var/www/wms",
        "npm ci --production"
    ]' \
    --region $REGION \
    --output text --query 'Command.CommandId')

echo "Install command: $CMD2"
sleep 120

# Step 3: Setup environment and database
CMD3=$(aws ssm send-command \
    --instance-ids $INSTANCE_ID \
    --document-name "AWS-RunShellScript" \
    --timeout-seconds 300 \
    --parameters 'commands=[
        "cd /var/www/wms",
        "cp .env.production .env",
        "sed -i \"s|DATABASE_URL=.*|DATABASE_URL=postgresql://wmsuser:wmspass@localhost:5432/wms|\" .env",
        "sed -i \"s|NEXTAUTH_URL=.*|NEXTAUTH_URL=http://54.243.188.216:3000|\" .env",
        "export DATABASE_URL=postgresql://wmsuser:wmspass@localhost:5432/wms",
        "npx prisma migrate deploy || true"
    ]' \
    --region $REGION \
    --output text --query 'Command.CommandId')

echo "Database command: $CMD3"
sleep 30

# Step 4: Start application
CMD4=$(aws ssm send-command \
    --instance-ids $INSTANCE_ID \
    --document-name "AWS-RunShellScript" \
    --timeout-seconds 300 \
    --parameters 'commands=[
        "cd /var/www/wms",
        "pm2 delete all || true",
        "pm2 start npm --name wms -- start",
        "pm2 save",
        "pm2 status"
    ]' \
    --region $REGION \
    --output text --query 'Command.CommandId')

echo "Start command: $CMD4"
sleep 20

# Check final status
echo ""
echo "Checking deployment status..."
STATUS_CMD=$(aws ssm send-command \
    --instance-ids $INSTANCE_ID \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=["pm2 status","curl -s http://localhost:3000 | grep -o \"<title>[^<]*</title>\" | head -1"]' \
    --region $REGION \
    --output text --query 'Command.CommandId')

sleep 10

echo "Getting status..."
aws ssm get-command-invocation \
    --command-id $STATUS_CMD \
    --instance-id $INSTANCE_ID \
    --region $REGION \
    --query 'StandardOutputContent' \
    --output text

# Cleanup S3
echo ""
echo "Cleaning up S3 bucket..."
aws s3 rm s3://$BUCKET_NAME/deploy.tar.gz
aws s3 rb s3://$BUCKET_NAME

echo ""
echo "✅ Deployment completed!"
echo "🌐 Application should be accessible at: http://54.243.188.216:3000/WMS/auth/login"